import { Database } from 'arangojs';
import axios from 'axios';
import { HandshakeValidator } from './validation/HandshakeValidator';
import { PrefixingService } from './services/PrefixingService';
import { RelationExtractor, GraphPayload } from './services/RelationExtractor';
import { GraphWriter } from './services/GraphWriter';
import { IDataAdapter } from './contracts/IDataAdapter';

// Global flag to disable prefixing logic entirely for testing purposes.
export const SKIP_PREFIXING_TEST_MODE = false;

export class SyncOrchestrator {
  private validator = new HandshakeValidator();
  private prefixer = new PrefixingService();
  private extractor = new RelationExtractor();
  private writer: GraphWriter;
  private db: Database;
  
  private state: { status: 'running' | 'idle' | 'failed' | 'completed', processed: number, total: number, current_prefix: string, job_id?: string } = {
    status: 'idle',
    processed: 0,
    total: 0,
    current_prefix: ''
  };
  private abortSignal = false;

  constructor(db: Database) {
    this.db = db;
    this.writer = new GraphWriter(db);
  }

  public getStatus() {
    return this.state;
  }

  public async getLastJobStatus(): Promise<any> {
    try {
      const cursor = await this.db.query(`
        FOR log IN SyncLogs
        SORT log.start_time DESC
        LIMIT 1
        RETURN log
      `);
      if (cursor.hasNext) {
        const log = await cursor.next();
        return {
          status: log.status,
          processed: log.count_success,
          total: log.count_success + log.count_failure, // Approximation if original total isn't stored
          current_prefix: log.prefix,
          job_id: log._key
        };
      }
    } catch (error) {
      console.error("[SyncOrchestrator] Error fetching last job status:", error);
    }
    return this.state;
  }

  public async checkDatasetExists(prefix: string): Promise<boolean> {
    const cursor = await this.db.query(
      `FOR log IN SyncLogs FILTER log.prefix == @prefix LIMIT 1 RETURN log`,
      { prefix }
    );
    return cursor.hasNext;
  }

  public stop() {
    if (this.state.status === 'running') {
      this.abortSignal = true;
    }
  }

  private async fetchWithRetry(url: string, params: any, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url, { params });
      } catch (error: any) {
        if (i === retries - 1) throw error;
        const waitTime = Math.pow(2, i) * 1000;
        console.warn(`\x1b[33m[SyncOrchestrator] Fetch failed, retrying in ${waitTime}ms...\x1b[0m`);
        await new Promise(res => setTimeout(res, waitTime));
      }
    }
  }

  public async sync(url: string, prefix: string, limit: number = 1000, batchSize: number = 100, overwrite: boolean = false, ui_config: Record<string, any> = {}): Promise<string> {
    if (this.state.status === 'running') {
      throw new Error(`[SyncOrchestrator] A sync is already running.`);
    }

    if (overwrite) {
      console.log(`\x1b[33m[SyncOrchestrator] Overwrite is TRUE. Purging existing records for prefix '${prefix}'...\x1b[0m`);
      const targetCollections = ['Dataset', 'Author', 'Keywords', 'HasAuthor', 'HasKeyword'];
      for (const col of targetCollections) {
        await this.db.query(`FOR doc IN @@col FILTER doc.source_prefix == @prefix REMOVE doc IN @@col`, { '@col': col, prefix });
      }
      await this.db.query(`FOR log IN SyncLogs FILTER log.prefix == @prefix REMOVE log IN SyncLogs`, { prefix });
    }

    const syncLogsCol = this.db.collection('SyncLogs');
    const logDoc = await syncLogsCol.save({
      source_url: url,
      prefix,
      status: 'running',
      count_success: 0,
      count_failure: 0,
      start_time: new Date().toISOString(),
      ui_config
    });

    const jobId = logDoc._key;
    this.state = { status: 'running', processed: 0, total: limit, current_prefix: prefix, job_id: jobId };
    this.abortSignal = false;

    // Kick off the background process logic without awaiting it so we can return the Job ID immediately
    this._runSyncBackground(jobId, url, prefix, limit, batchSize, syncLogsCol).catch((err) => {
      console.error(`[SyncOrchestrator] Background job critically failed:`, err);
    });

    return jobId;
  }

  private async _runSyncBackground(jobId: string, url: string, prefix: string, limit: number, batchSize: number, syncLogsCol: any): Promise<void> {
    if (SKIP_PREFIXING_TEST_MODE) {
      console.warn(`\x1b[33m[SyncOrchestrator] *** TEST MODE ACTIVE: Prefixing logic will be skipped entirely. ***\x1b[0m`);
    }

    console.log(`\x1b[36m[SyncOrchestrator] Initiating handshake with ${url}... (Job ID: ${jobId})\x1b[0m`);
    const validationResult = await this.validator.validate(url);
    
    if (!validationResult.valid) {
      this.state.status = 'failed';
      await syncLogsCol.update(jobId, { status: 'failed', error_message: `Handshake failed: ${validationResult.message}`, end_time: new Date().toISOString() });
      console.error(`\x1b[31m[SyncOrchestrator] Handshake failed: ${validationResult.message}\x1b[0m`);
      throw new Error(`[SyncOrchestrator] Handshake failed: ${validationResult.reason}`);
    }

    console.log(`\x1b[32m[SyncOrchestrator] Handshake successful. Beginning sync up to ${limit} records.\x1b[0m`);

    let paginationToken: string | null = null;
    let hasMoreData = true;
    const startTime = Date.now();

    try {
      while (this.state.processed < limit && !this.abortSignal && hasMoreData) {
        const params: any = { limit: batchSize };
        if (paginationToken) {
          params.token = paginationToken;
        }

        const response = await this.fetchWithRetry(url, params);

        let records: IDataAdapter[] = [];
        let nextToken: string | null = null;

        // Support both structured object { records, nextToken } and flat array responses
        if (response.data && !Array.isArray(response.data) && response.data.records) {
          records = response.data.records;
          nextToken = response.data.nextToken || null;
        } else {
          // Fallback to array if proxy returns plain JSON list, while checking headers for token
          records = Array.isArray(response.data) ? response.data : [response.data];
          nextToken = response.headers['x-next-token'] || null;
        }

        if (!records || records.length === 0) {
          hasMoreData = false;
          break;
        }

        const batchPayloads: GraphPayload[] = [];
        let failedRecordId = "unknown";

        for (const record of records) {
          if (this.state.processed >= limit || this.abortSignal) {
            if (this.abortSignal) console.log(`\x1b[33m[SyncOrchestrator] Abort signal received. Stopping.\x1b[0m`);
            break;
          }

          failedRecordId = record.dataset?.id || failedRecordId;
          
          // Respect the global test flag to conditionally apply or skip prefixing
          const targetRecord = SKIP_PREFIXING_TEST_MODE 
            ? record 
            : this.prefixer.applyPrefix(prefix, record);
            
          const graphPayload = this.extractor.extract(targetRecord);

          batchPayloads.push(graphPayload);

          this.state.processed++;
        }

        if (batchPayloads.length > 0) {
          await this.writer.writeBatch(batchPayloads, prefix);
          await syncLogsCol.update(jobId, { count_success: this.state.processed });
          const rps = (this.state.processed / ((Date.now() - startTime) / 1000)).toFixed(2);
          console.log(`\x1b[35m[SyncOrchestrator] Processed ${this.state.processed}/${limit} records (Throughput: ${rps} ops/sec)...\x1b[0m`);
        }

        if (nextToken && !this.abortSignal && this.state.processed < limit) {
          paginationToken = nextToken;
          await new Promise(r => setTimeout(r, 1000)); // Rate limiting sleep
        } else {
          hasMoreData = false;
        }
      }

      this.state.status = 'idle';
      await syncLogsCol.update(jobId, { status: 'completed', end_time: new Date().toISOString() });
      console.log(`\x1b[32m[SyncOrchestrator] \u2714 Sync complete. Total synced: ${this.state.processed} records.\x1b[0m`);
    } catch (err: any) {
      this.state.status = 'failed';
      await syncLogsCol.update(jobId, { status: 'failed', error_message: err.message, end_time: new Date().toISOString() });
      console.error(`\x1b[31m[SyncOrchestrator] \u2718 Sync failed at record ${this.state.processed}: ${err.message}\x1b[0m`);
      throw err;
    }
  }
}

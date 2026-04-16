import { Database } from 'arangojs';
import axios from 'axios';
import { HandshakeValidator } from './validation/HandshakeValidator';
import { PrefixingService } from './services/PrefixingService';
import { RelationExtractor, GraphPayload } from './services/RelationExtractor';
import { GraphWriter } from './services/GraphWriter';
import { IDataAdapter } from './contracts/IDataAdapter';

export class SyncOrchestrator {
  private validator = new HandshakeValidator();
  private prefixer = new PrefixingService();
  private extractor = new RelationExtractor();
  private writer: GraphWriter;
  
  private state: { status: 'running' | 'idle' | 'failed', processed: number, total: number, current_prefix: string } = {
    status: 'idle',
    processed: 0,
    total: 0,
    current_prefix: ''
  };
  private abortSignal = false;

  constructor(db: Database) {
    this.writer = new GraphWriter(db);
  }

  public getStatus() {
    return this.state;
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

  public async sync(url: string, prefix: string, limit: number = 1000, batchSize: number = 100): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error(`[SyncOrchestrator] A sync is already running.`);
    }

    this.state = { status: 'running', processed: 0, total: limit, current_prefix: prefix };
    this.abortSignal = false;

    console.log(`\x1b[36m[SyncOrchestrator] Initiating handshake with ${url}...\x1b[0m`);
    const isValid = await this.validator.validate(url);
    
    if (!isValid) {
      this.state.status = 'failed';
      console.error(`\x1b[31m[SyncOrchestrator] Handshake failed. Source does not comply with IDataAdapter contract.\x1b[0m`);
      throw new Error(`[SyncOrchestrator] Handshake failed.`);
    }

    console.log(`\x1b[32m[SyncOrchestrator] Handshake successful. Beginning sync up to ${limit} records.\x1b[0m`);

    let paginationToken: string | null = null;
    let hasMoreData = true;

    try {
      const startTime = Date.now();

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

        try {
          for (const record of records) {
            if (this.state.processed >= limit || this.abortSignal) {
              if (this.abortSignal) console.log(`\x1b[33m[SyncOrchestrator] Abort signal received. Stopping.\x1b[0m`);
              break;
            }

            failedRecordId = record.dataset?.id || failedRecordId;
            const prefixedRecord = this.prefixer.applyPrefix(prefix, record);
            const graphPayload = this.extractor.extract(prefixedRecord);
            batchPayloads.push(graphPayload);

            this.state.processed++;
          }

          if (batchPayloads.length > 0) {
            await this.writer.writeBatch(batchPayloads);
            const rps = (this.state.processed / ((Date.now() - startTime) / 1000)).toFixed(2);
            console.log(`\x1b[35m[SyncOrchestrator] Processed ${this.state.processed}/${limit} records (Throughput: ${rps} ops/sec)...\x1b[0m`);
          }
        } catch (err: any) {
          console.error(`\x1b[31m[SyncOrchestrator] \u2718 Transformation/Write failure around dataset [${prefix}:${failedRecordId}]: ${err.message}\x1b[0m`);
          throw err;
        }

        if (nextToken && !this.abortSignal && this.state.processed < limit) {
          paginationToken = nextToken;
          await new Promise(r => setTimeout(r, 1000)); // Rate limiting sleep
        } else {
          hasMoreData = false;
        }
      }

      this.state.status = 'idle';
      console.log(`\x1b[32m[SyncOrchestrator] \u2714 Sync complete. Total synced: ${this.state.processed} records.\x1b[0m`);
    } catch (err: any) {
      this.state.status = 'failed';
      console.error(`\x1b[31m[SyncOrchestrator] \u2718 Sync failed at record ${this.state.processed}: ${err.message}\x1b[0m`);
      throw err;
    }
  }
}

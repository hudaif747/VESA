import { Database } from 'arangojs';
import axios from 'axios';
import { HandshakeValidator } from './validation/HandshakeValidator';
import { PrefixingService } from './services/PrefixingService';
import { RelationExtractor } from './services/RelationExtractor';
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

  public async sync(url: string, prefix: string, limit: number = 1000, batchSize: number = 100): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error(`[SyncOrchestrator] A sync is already running.`);
    }

    this.state = { status: 'running', processed: 0, total: limit, current_prefix: prefix };
    this.abortSignal = false;

    console.log(`[SyncOrchestrator] Initiating handshake with ${url}...`);
    const isValid = await this.validator.validate(url);
    
    if (!isValid) {
      this.state.status = 'failed';
      throw new Error(`[SyncOrchestrator] Handshake failed. Source does not comply with IDataAdapter contract.`);
    }

    console.log(`[SyncOrchestrator] Handshake successful. Beginning sync up to ${limit} records.`);

    try {
      // Basic pagination simulation matching previous implementation
      const response = await axios.get(url, { params: { limit: batchSize } });
      const records: IDataAdapter[] = Array.isArray(response.data) ? response.data : [response.data];

      for (const record of records) {
        if (this.state.processed >= limit || this.abortSignal) break;

        const prefixedRecord = this.prefixer.applyPrefix(prefix, record);
        const graphPayload = this.extractor.extract(prefixedRecord);
        await this.writer.write(graphPayload);

        this.state.processed++;
        if (this.state.processed % 100 === 0) {
          console.log(`[SyncOrchestrator] Processed ${this.state.processed}/${limit} records...`);
        }
      }

      this.state.status = 'idle';
      console.log(`[SyncOrchestrator] Sync complete or stopped. Processed ${this.state.processed} records.`);
    } catch (err: any) {
      this.state.status = 'failed';
      console.error(`[SyncOrchestrator] Sync failed at record ${this.state.processed}:`, err.message);
      throw err;
    }
  }
}

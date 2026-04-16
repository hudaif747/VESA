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

  constructor(db: Database) {
    this.writer = new GraphWriter(db);
  }

  public async sync(url: string, prefix: string, limit: number = 1000): Promise<void> {
    console.log(`[SyncOrchestrator] Initiating handshake with ${url}...`);
    const isValid = await this.validator.validate(url);
    
    if (!isValid) {
      throw new Error(`[SyncOrchestrator] Handshake failed. Source does not comply with IDataAdapter contract.`);
    }

    console.log(`[SyncOrchestrator] Handshake successful. Beginning sync up to ${limit} records.`);
    
    let processed = 0;

    try {
      // Note: Assumes a pagination or simple array GET for the generalized harvester endpoint
      // In a real implementation this would iterate using resumption tokens like harvester.ts
      const response = await axios.get(url, { params: { limit } });
      const records: IDataAdapter[] = Array.isArray(response.data) ? response.data : [response.data];

      for (const record of records) {
        if (processed >= limit) break;

        const prefixedRecord = this.prefixer.applyPrefix(prefix, record);
        const graphPayload = this.extractor.extract(prefixedRecord);
        await this.writer.write(graphPayload);

        processed++;
        if (processed % 100 === 0) {
          console.log(`[SyncOrchestrator] Processed ${processed}/${limit} records...`);
        }
      }

      console.log(`[SyncOrchestrator] Sync complete. Processed ${processed} records.`);
    } catch (err: any) {
      console.error(`[SyncOrchestrator] Sync failed at record ${processed}:`, err.message);
      throw err;
    }
  }
}

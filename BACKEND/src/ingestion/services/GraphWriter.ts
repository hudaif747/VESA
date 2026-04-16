import { Database } from 'arangojs';
import { GraphPayload } from './RelationExtractor';

export class GraphWriter {
  constructor(private db: Database) {}

  public async write(payload: GraphPayload): Promise<void> {
    try {
      const cols = {
        ds: this.db.collection('Dataset'),
        auth: this.db.collection('Author'),
        kw: this.db.collection('Keywords'),
        hasAuth: this.db.collection('HasAuthor'),
        hasKw: this.db.collection('HasKeyword'),
      };

      // Node updates (Update Document)
      await cols.ds.save(payload.dataset, { overwriteMode: "update" });
      
      for (const auth of payload.authors) {
        await cols.auth.save(auth, { overwriteMode: "update" });
      }
      
      for (const kw of payload.keywords) {
        await cols.kw.save(kw, { overwriteMode: "update" });
      }

      // Edge updates (Ignore if edge already exists)
      for (const edge of payload.edgesHasAuthor) {
        await cols.hasAuth.save(edge, { overwriteMode: "ignore" });
      }

      for (const edge of payload.edgesHasKeyword) {
        await cols.hasKw.save(edge, { overwriteMode: "ignore" });
      }
    } catch (error: any) {
      console.error(`\x1b[31m[GraphWriter]  \u2718 Failed to write entity ${payload.dataset?._key}: ${error.message}\x1b[0m`);
      throw error;
    }
  }
}

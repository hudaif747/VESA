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

  public async writeBatch(payloads: GraphPayload[]): Promise<void> {
    if (payloads.length === 0) return;

    try {
      const cols = {
        ds: this.db.collection('Dataset'),
        auth: this.db.collection('Author'),
        kw: this.db.collection('Keywords'),
        hasAuth: this.db.collection('HasAuthor'),
        hasKw: this.db.collection('HasKeyword'),
      };

      // In-memory deduplication to avoid ArangoDB same-array unique constraint errors
      const uniqueBy = (arr: any[], key: string) => [...new Map(arr.map(item => [item[key], item])).values()];
      const uniqueEdges = (arr: any[]) => [...new Map(arr.map(item => [`${item._from}-${item._to}`, item])).values()];

      const datasets = payloads.map(p => p.dataset);
      const authors = uniqueBy(payloads.flatMap(p => p.authors), '_key');
      const keywords = uniqueBy(payloads.flatMap(p => p.keywords), '_key');
      const hasAuthEdges = uniqueEdges(payloads.flatMap(p => p.edgesHasAuthor));
      const hasKwEdges = uniqueEdges(payloads.flatMap(p => p.edgesHasKeyword));

      if (datasets.length) await cols.ds.save(datasets, { overwriteMode: "update" });
      if (authors.length) await cols.auth.save(authors, { overwriteMode: "update" });
      if (keywords.length) await cols.kw.save(keywords, { overwriteMode: "update" });
      if (hasAuthEdges.length) await cols.hasAuth.save(hasAuthEdges, { overwriteMode: "ignore" });
      if (hasKwEdges.length) await cols.hasKw.save(hasKwEdges, { overwriteMode: "ignore" });
      
    } catch (error: any) {
      console.error(`\x1b[31m[GraphWriter] \u2718 Batch write failed: ${error.message}\x1b[0m`);
      throw error;
    }
  }
}

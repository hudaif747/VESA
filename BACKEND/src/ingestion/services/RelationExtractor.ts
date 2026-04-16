import { IDataAdapter } from '../contracts/IDataAdapter';

export interface GraphPayload {
  dataset: any;
  authors: any[];
  keywords: any[];
  edgesHasAuthor: any[];
  edgesHasKeyword: any[];
}

export class RelationExtractor {
  private slugify(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9]/g, "_").substring(0, 254);
  }

  public extract(packet: IDataAdapter): GraphPayload {
    const dsKey = this.slugify(packet.dataset.id);
    
    const datasetNode = {
      _key: dsKey,
      ...packet.dataset
    };

    const authors = packet.authors.map(a => ({
      _key: this.slugify(a.id),
      ...a
    }));

    const keywords = packet.keywords.map(k => ({
      _key: this.slugify(k.id),
      ...k
    }));

    const edgesHasAuthor = authors.map(a => ({
      _from: `Dataset/${dsKey}`,
      _to: `Author/${a._key}`
    }));

    const edgesHasKeyword = keywords.map(k => ({
      _from: `Dataset/${dsKey}`,
      _to: `Keywords/${k._key}`
    }));

    return {
      dataset: datasetNode,
      authors,
      keywords,
      edgesHasAuthor,
      edgesHasKeyword
    };
  }
}

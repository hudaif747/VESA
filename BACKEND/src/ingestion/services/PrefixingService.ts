import { IDataAdapter } from '../contracts/IDataAdapter';

export class PrefixingService {
  /**
   * Namespaces identifiers in the packet to prevent collisions.
   */
  public applyPrefix(prefix: string, packet: IDataAdapter): IDataAdapter {
    try {
      const safePrefix = prefix.endsWith(':') ? prefix : `${prefix}:`;
      
      const apply = (id: string) => id.startsWith(safePrefix) ? id : `${safePrefix}${id}`;

      return {
        dataset: {
          ...packet.dataset,
          _key: apply(packet.dataset._key || ""),
          pangaea_id: apply(packet.dataset.pangaea_id || ""),
        },
        authors: packet.authors.map(a => ({ ...a, _key: apply(a._key || "") })),
        keywords: packet.keywords.map(k => ({ ...k, _key: apply(k._key || "") }))
      };
    } catch (error: any) {
      console.error(`\x1b[31m[PrefixingService] \u2718 Error applying prefix '${prefix}': ${error.message}\x1b[0m`);
      throw error;
    }
  }
}

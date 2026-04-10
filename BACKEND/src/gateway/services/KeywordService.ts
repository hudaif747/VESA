/**
 * KeywordService - Aggregates keyword operations across all registered adapters.
 *
 * This service provides a unified interface for keyword retrieval,
 * aggregating and merging keywords from multiple data sources.
 */

import { IKeyword, AdapterDatasetID } from '../adapters/contracts';
import { AdapterRegistry } from './AdapterRegistry';

/**
 * KeywordService aggregates keyword operations from all registered adapters.
 *
 * @example
 * ```typescript
 * const service = new KeywordService(registry);
 * const allKeywords = await service.getAllKeywords();
 * const filtered = await service.getKeywordsForDatasets(['pangaea:123']);
 * ```
 */
export class KeywordService {
  constructor(private registry: AdapterRegistry) {}

  /**
   * Get keywords for specific datasets.
   *
   * Routes requests to the appropriate adapters based on dataset ID prefixes.
   *
   * @param datasetIds - Array of dataset IDs
   * @returns Array of keywords with counts and associated dataset IDs
   */
  async getKeywordsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IKeyword[]> {
    if (datasetIds.length === 0) {
      return [];
    }

    const adapters = this.registry.getAll();

    const results = await Promise.allSettled(
      adapters.map((adapter) => adapter.getKeywordsForDatasets(datasetIds))
    );

    const allKeywords: IKeyword[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allKeywords.push(...result.value);
      } else {
        console.error('KeywordService.getKeywordsForDatasets: Fetch failed:', result.reason);
      }
    }

    // Merge keywords with the same text
    return this.mergeKeywords(allKeywords);
  }

  /**
   * Get all keywords from all adapters.
   *
   * @returns Aggregated and merged array of all keywords
   */
  async getAllKeywords(): Promise<IKeyword[]> {
    const adapters = this.registry.getAll();

    if (adapters.length === 0) {
      console.warn('KeywordService.getAllKeywords: No adapters registered');
      return [];
    }

    // Fetch from all adapters in parallel
    const results = await Promise.allSettled(
      adapters.map((adapter) => adapter.getAllKeywords())
    );

    // Aggregate keywords from all sources
    const allKeywords: IKeyword[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allKeywords.push(...result.value);
      } else {
        console.error('KeywordService.getAllKeywords: Adapter failed:', result.reason);
      }
    }

    // Merge keywords with the same text
    return this.mergeKeywords(allKeywords);
  }

  /**
   * Merge keywords with the same text, combining their counts and dataset IDs.
   *
   * When keywords from multiple sources have the same text, this method:
   * - Sums their counts
   * - Combines their dataset ID arrays (deduplicating)
   *
   * @param keywords - Array of keywords (potentially with duplicates)
   * @returns Array of merged keywords
   * @private
   */
  private mergeKeywords(keywords: IKeyword[]): IKeyword[] {
    const merged = new Map<string, IKeyword>();

    for (const keyword of keywords) {
      const normalizedText = keyword.keyword.toLowerCase().trim();
      const existing = merged.get(normalizedText);

      if (existing) {
        // Merge counts and dataset IDs
        existing.count += keyword.count;

        // Add new dataset IDs (avoiding duplicates)
        const existingIds = new Set(existing.dataset_ids);
        for (const id of keyword.dataset_ids) {
          if (!existingIds.has(id)) {
            existing.dataset_ids.push(id);
          }
        }
      } else {
        // Create new entry (preserve original casing from first occurrence)
        merged.set(normalizedText, {
          keyword: keyword.keyword,
          count: keyword.count,
          dataset_ids: [...keyword.dataset_ids],
        });
      }
    }

    // Sort by count descending
    return Array.from(merged.values()).sort((a, b) => b.count - a.count);
  }
}

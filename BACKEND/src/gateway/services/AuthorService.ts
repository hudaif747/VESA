/**
 * AuthorService - Aggregates author operations across all registered adapters.
 *
 * This service provides a unified interface for author retrieval,
 * aggregating and merging author data from multiple data sources.
 */

import { IAuthor, AdapterDatasetID } from '../adapters/contracts';
import { AdapterRegistry } from './AdapterRegistry';

/**
 * AuthorService aggregates author operations from all registered adapters.
 *
 * Note: Not all data sources support author information. The service
 * gracefully handles adapters that don't provide author data.
 *
 * @example
 * ```typescript
 * const service = new AuthorService(registry);
 * const allAuthors = await service.getAllAuthors();
 * const filtered = await service.getAuthorsForDatasets(['pangaea:123']);
 * ```
 */
export class AuthorService {
  constructor(private registry: AdapterRegistry) {}

  /**
   * Get authors for specific datasets.
   *
   * Routes requests to the appropriate adapters based on dataset ID prefixes.
   *
   * @param datasetIds - Array of dataset IDs
   * @returns Array of authors with their associated dataset IDs
   */
  async getAuthorsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IAuthor[]> {
    if (datasetIds.length === 0) {
      return [];
    }

    const adapters = this.registry.getAll();

    // Only call adapters that support authors
    const adaptersWithAuthors = adapters.filter(
      (adapter) => adapter.getFeatures().supportsAuthors
    );

    const results = await Promise.allSettled(
      adaptersWithAuthors.map((adapter) => adapter.getAuthorsForDatasets(datasetIds))
    );

    const allAuthors: IAuthor[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAuthors.push(...result.value);
      } else {
        console.error('AuthorService.getAuthorsForDatasets: Fetch failed:', result.reason);
      }
    }

    return this.mergeAuthors(allAuthors);
  }

  /**
   * Get all authors from all adapters.
   *
   * @returns Aggregated and merged array of all authors
   */
  async getAllAuthors(): Promise<IAuthor[]> {
    const adapters = this.registry.getAll();

    if (adapters.length === 0) {
      console.warn('AuthorService.getAllAuthors: No adapters registered');
      return [];
    }

    // Only fetch from adapters that support authors
    const adaptersWithAuthors = adapters.filter(
      (adapter) => adapter.getFeatures().supportsAuthors
    );

    if (adaptersWithAuthors.length === 0) {
      console.warn('AuthorService.getAllAuthors: No adapters support author data');
      return [];
    }

    // Fetch from all supporting adapters in parallel
    const results = await Promise.allSettled(
      adaptersWithAuthors.map((adapter) => adapter.getAllAuthors())
    );

    // Aggregate authors from all sources
    const allAuthors: IAuthor[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAuthors.push(...result.value);
      } else {
        console.error('AuthorService.getAllAuthors: Adapter failed:', result.reason);
      }
    }

    // Merge authors with the same name
    return this.mergeAuthors(allAuthors);
  }

  /**
   * Merge authors with the same name, combining their dataset IDs.
   *
   * When authors from multiple sources have the same name, this method
   * combines their dataset ID arrays (deduplicating).
   *
   * @param authors - Array of authors (potentially with duplicates)
   * @returns Array of merged authors
   * @private
   */
  private mergeAuthors(authors: IAuthor[]): IAuthor[] {
    const merged = new Map<string, IAuthor>();

    for (const author of authors) {
      const normalizedName = author.name.toLowerCase().trim();
      const existing = merged.get(normalizedName);

      if (existing) {
        // Add new dataset IDs (avoiding duplicates)
        const existingIds = new Set(existing.dataset_ids);
        for (const id of author.dataset_ids) {
          if (!existingIds.has(id)) {
            existing.dataset_ids.push(id);
          }
        }
      } else {
        // Create new entry (preserve original casing from first occurrence)
        merged.set(normalizedName, {
          name: author.name,
          dataset_ids: [...author.dataset_ids],
        });
      }
    }

    // Sort by number of datasets descending (most prolific authors first)
    return Array.from(merged.values()).sort(
      (a, b) => b.dataset_ids.length - a.dataset_ids.length
    );
  }
}

/**
 * AuthorService - Aggregates author operations across all registered adapters.
 *
 * This service provides a unified interface for author retrieval,
 * aggregating and merging author data from multiple data sources.
 */

import { IAuthor, AdapterDatasetID } from '../adapters/contracts';
import { AdapterRegistry } from './AdapterRegistry';
import { getSourceFromId } from '../adapters/arango/idMapper';

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

    // Group IDs by their source (adapter)
    const idsBySource = this.groupIdsBySource(datasetIds);

    // Fetch from each adapter in parallel
    const fetchPromises: Promise<IAuthor[]>[] = [];

    for (const [source, sourceIds] of idsBySource.entries()) {
      const adapter = this.registry.get(source);
      if (adapter) {
        // Check if adapter supports authors
        const features = adapter.getFeatures();
        if (features.supportsAuthors) {
          fetchPromises.push(adapter.getAuthorsForDatasets(sourceIds));
        }
      } else {
        // Try 'arango' adapter as fallback (handles both 'pangaea' and 'stac')
        const arangoAdapter = this.registry.get('arango');
        if (arangoAdapter) {
          fetchPromises.push(arangoAdapter.getAuthorsForDatasets(sourceIds));
        } else {
          console.warn(`AuthorService.getAuthorsForDatasets: No adapter found for source '${source}'`);
        }
      }
    }

    const results = await Promise.allSettled(fetchPromises);

    // Aggregate and merge authors from all sources
    const allAuthors: IAuthor[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAuthors.push(...result.value);
      } else {
        console.error('AuthorService.getAuthorsForDatasets: Fetch failed:', result.reason);
      }
    }

    // Merge authors with the same name
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

  /**
   * Group dataset IDs by their source prefix.
   *
   * @param ids - Array of dataset IDs
   * @returns Map of source -> IDs for that source
   * @private
   */
  private groupIdsBySource(ids: AdapterDatasetID[]): Map<string, AdapterDatasetID[]> {
    const grouped = new Map<string, AdapterDatasetID[]>();

    for (const id of ids) {
      const source = getSourceFromId(id);
      const existing = grouped.get(source) ?? [];
      existing.push(id);
      grouped.set(source, existing);
    }

    return grouped;
  }
}

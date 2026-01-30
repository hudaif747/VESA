/**
 * DatasetService - Aggregates dataset operations across all registered adapters.
 *
 * This service provides a unified interface for dataset retrieval,
 * routing requests to the appropriate adapters and aggregating results.
 */

import {
  IDataset,
  SearchParams,
  AdapterDatasetID,
} from '../adapters/contracts';
import { AdapterRegistry } from './AdapterRegistry';
import { getSourceFromId } from '../adapters/arango/idMapper';

/**
 * DatasetService aggregates dataset operations from all registered adapters.
 *
 * @example
 * ```typescript
 * const service = new DatasetService(registry);
 * const datasets = await service.getAll();
 * const specific = await service.getByIds(['pangaea:123', 'stac:456']);
 * ```
 */
export class DatasetService {
  constructor(private registry: AdapterRegistry) {}

  /**
   * Search for datasets across all adapters.
   *
   * @param params - Search parameters (query, bbox, dateRange, etc.)
   * @returns Aggregated array of datasets from all adapters
   */
  async search(params: SearchParams): Promise<IDataset[]> {
    const adapters = this.registry.getAll();

    if (adapters.length === 0) {
      console.warn('DatasetService.search: No adapters registered');
      return [];
    }

    // Fetch from all adapters in parallel
    const results = await Promise.allSettled(
      adapters.map((adapter) => adapter.search(params))
    );

    // Aggregate successful results
    const datasets: IDataset[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        datasets.push(...result.value);
      } else {
        console.error('DatasetService.search: Adapter failed:', result.reason);
      }
    }

    return datasets;
  }

  /**
   * Get datasets by their IDs, routing to the appropriate adapters.
   *
   * IDs are grouped by their source prefix and sent to the corresponding
   * adapter. This ensures efficient batching per adapter.
   *
   * @param ids - Array of dataset IDs (e.g., ['pangaea:123', 'stac:456'])
   * @returns Array of found datasets
   */
  async getByIds(ids: AdapterDatasetID[]): Promise<IDataset[]> {
    if (ids.length === 0) {
      return [];
    }

    // Group IDs by their source (adapter)
    const idsBySource = this.groupIdsBySource(ids);

    // Fetch from each adapter in parallel
    const fetchPromises: Promise<IDataset[]>[] = [];

    for (const [source, sourceIds] of idsBySource.entries()) {
      const adapter = this.registry.get(source);
      if (adapter) {
        fetchPromises.push(adapter.getDatasetsByIds(sourceIds));
      } else {
        // For IDs with unknown source, try the 'arango' adapter as fallback
        // (it handles both 'pangaea' and 'stac' internally)
        const arangoAdapter = this.registry.get('arango');
        if (arangoAdapter) {
          fetchPromises.push(arangoAdapter.getDatasetsByIds(sourceIds));
        } else {
          console.warn(`DatasetService.getByIds: No adapter found for source '${source}'`);
        }
      }
    }

    const results = await Promise.allSettled(fetchPromises);

    // Aggregate successful results
    const datasets: IDataset[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        datasets.push(...result.value);
      } else {
        console.error('DatasetService.getByIds: Fetch failed:', result.reason);
      }
    }

    return datasets;
  }

  /**
   * Get a single dataset by ID.
   *
   * @param id - Dataset ID (can be with or without source prefix)
   * @returns The dataset if found, null otherwise
   */
  async getById(id: string): Promise<IDataset | null> {
    // If ID has a source prefix, route to specific adapter
    if (id.includes(':')) {
      const source = getSourceFromId(id as AdapterDatasetID);
      const adapter = this.registry.get(source) ?? this.registry.get('arango');

      if (adapter) {
        const results = await adapter.getDatasetsByIds([id as AdapterDatasetID]);
        return results.length > 0 ? results[0] : null;
      }
    }

    // Otherwise, try all adapters until we find it
    const adapters = this.registry.getAll();
    for (const adapter of adapters) {
      const result = await adapter.getDatasetById(id);
      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Get all datasets from all adapters.
   *
   * @returns Aggregated array of all datasets
   */
  async getAll(): Promise<IDataset[]> {
    const adapters = this.registry.getAll();

    if (adapters.length === 0) {
      console.warn('DatasetService.getAll: No adapters registered');
      return [];
    }

    // Fetch from all adapters in parallel
    const results = await Promise.allSettled(
      adapters.map((adapter) => adapter.search({}))
    );

    // Aggregate successful results
    const datasets: IDataset[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        datasets.push(...result.value);
      } else {
        console.error('DatasetService.getAll: Adapter failed:', result.reason);
      }
    }

    return datasets;
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

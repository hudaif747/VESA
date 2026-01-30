/**
 * AdapterRegistry - Central registry for managing data adapters.
 *
 * The registry holds all adapter instances and provides methods to
 * register, retrieve, and manage adapters. It serves as the single
 * source of truth for which data sources are available in the system.
 */

import { IDataAdapter } from '../adapters/contracts';

/**
 * AdapterRegistry manages the lifecycle and access to data adapters.
 *
 * @example
 * ```typescript
 * const registry = new AdapterRegistry();
 * registry.register(new ArangoAdapter());
 * registry.register(new GbifAdapter());
 *
 * const allAdapters = registry.getAll();
 * const pangaeaAdapter = registry.get('arango');
 * ```
 */
export class AdapterRegistry {
  private adapters: Map<string, IDataAdapter> = new Map();

  /**
   * Register an adapter with the registry.
   *
   * @param adapter - The adapter instance to register
   * @throws Error if an adapter with the same source is already registered
   */
  register(adapter: IDataAdapter): void {
    if (this.adapters.has(adapter.source)) {
      throw new Error(
        `Adapter with source '${adapter.source}' is already registered. ` +
        `Use unregister() first if you want to replace it.`
      );
    }

    this.adapters.set(adapter.source, adapter);
    console.log(`AdapterRegistry: Registered adapter '${adapter.source}'`);
  }

  /**
   * Get an adapter by its source identifier.
   *
   * @param source - The source identifier (e.g., 'arango', 'gbif')
   * @returns The adapter if found, undefined otherwise
   */
  get(source: string): IDataAdapter | undefined {
    return this.adapters.get(source);
  }

  /**
   * Get all registered adapters.
   *
   * @returns Array of all registered adapters
   */
  getAll(): IDataAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all healthy/enabled adapters.
   *
   * Performs health checks on all adapters and returns only those
   * that pass. Useful for graceful degradation when some sources are down.
   *
   * @returns Promise resolving to array of healthy adapters
   */
  async getEnabled(): Promise<IDataAdapter[]> {
    const adapters = this.getAll();
    const healthChecks = await Promise.allSettled(
      adapters.map(async (adapter) => {
        const isHealthy = await adapter.healthCheck();
        return { adapter, isHealthy };
      })
    );

    return healthChecks
      .filter(
        (result): result is PromiseFulfilledResult<{ adapter: IDataAdapter; isHealthy: boolean }> =>
          result.status === 'fulfilled' && result.value.isHealthy
      )
      .map((result) => result.value.adapter);
  }

  /**
   * Check if an adapter is registered.
   *
   * @param source - The source identifier to check
   * @returns true if an adapter with that source is registered
   */
  has(source: string): boolean {
    return this.adapters.has(source);
  }

  /**
   * Unregister an adapter by its source identifier.
   *
   * @param source - The source identifier of the adapter to remove
   * @returns true if the adapter was found and removed, false otherwise
   */
  unregister(source: string): boolean {
    const removed = this.adapters.delete(source);
    if (removed) {
      console.log(`AdapterRegistry: Unregistered adapter '${source}'`);
    }
    return removed;
  }

  /**
   * Get the number of registered adapters.
   *
   * @returns The count of registered adapters
   */
  get size(): number {
    return this.adapters.size;
  }

  /**
   * Get all registered source identifiers.
   *
   * @returns Array of source identifiers
   */
  getSources(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clear all registered adapters.
   * Useful for testing or reconfiguration.
   */
  clear(): void {
    this.adapters.clear();
    console.log('AdapterRegistry: Cleared all adapters');
  }
}

/**
 * Singleton instance for app-wide use.
 *
 * @example
 * ```typescript
 * import { registry } from './services/AdapterRegistry';
 * registry.register(new ArangoAdapter());
 * ```
 */
export const registry = new AdapterRegistry();

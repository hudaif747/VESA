/**
 * Gateway - Main Entry Point for the Adapter-Registry Model
 *
 * This module provides the bootstrap function to initialize the gateway
 * and exports all necessary types and services for the application.
 *
 * @example
 * ```typescript
 * import { bootstrapGateway, getServices } from './gateway';
 *
 * // Initialize the gateway (registers adapters)
 * bootstrapGateway();
 *
 * // Use services
 * const { datasetService, keywordService, authorService } = getServices();
 * const datasets = await datasetService.getAll();
 * ```
 */

// Services and Registry
export {
  AdapterRegistry,
  registry,
  DatasetService,
  KeywordService,
  AuthorService,
  initializeServices,
  getServices,
  resetServices,
  type ServiceContainer,
} from './services';

// Adapter Contracts
export type {
  IDataAdapter,
  IDataset,
  IKeyword,
  IAuthor,
  ILocation,
  ITemporalCoverage,
  AdapterDatasetID,
  SearchParams,
  BoundingBox,
  DateRange,
  AdapterFeatures,
} from './adapters/contracts';

// Arango Adapter (for direct use if needed)
export { ArangoAdapter } from './adapters/arango';

// Response Transformers (legacy format for API responses)
export {
  toLegacyDataset,
  toLegacyDatasets,
  toLegacyKeyword,
  toLegacyKeywords,
  toLegacyAuthor,
  toLegacyAuthors,
  type LegacyDataset,
  type LegacyKeyword,
  type LegacyAuthor,
} from './transformers';

// Import for bootstrap
import { registry } from './services';
import { ArangoAdapter } from './adapters/arango';

/**
 * Bootstrap the gateway by registering all adapters.
 *
 * This function should be called once during application startup,
 * before any services are used.
 *
 * @example
 * ```typescript
 * // In your main application file (e.g., index.ts)
 * import { bootstrapGateway } from './gateway';
 *
 * // Initialize gateway before starting the server
 * bootstrapGateway();
 *
 * // Then start your Express server
 * app.listen(port, () => {
 *   console.log(`Server started on port ${port}`);
 * });
 * ```
 */
export function bootstrapGateway(): void {
  console.log('Gateway: Initializing...');

  // Register the ArangoDB adapter (handles both PANGAEA and STAC data)
  if (!registry.has('arango')) {
    registry.register(new ArangoAdapter());
  }

  // Future: Register additional adapters here
  // if (!registry.has('gbif')) {
  //   registry.register(new GbifAdapter());
  // }
  // if (!registry.has('openalex')) {
  //   registry.register(new OpenAlexAdapter());
  // }

  console.log(
    'Gateway: Initialized with adapters:',
    registry.getSources().join(', ')
  );
}

/**
 * Check if the gateway has been bootstrapped.
 *
 * @returns true if at least one adapter is registered
 */
export function isGatewayInitialized(): boolean {
  return registry.size > 0;
}

/**
 * Perform health checks on all registered adapters.
 *
 * @returns Object mapping adapter sources to their health status
 */
export async function checkGatewayHealth(): Promise<Record<string, boolean>> {
  const adapters = registry.getAll();
  const results: Record<string, boolean> = {};

  const healthChecks = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const isHealthy = await adapter.healthCheck();
      return { source: adapter.source, isHealthy };
    })
  );

  for (const result of healthChecks) {
    if (result.status === 'fulfilled') {
      results[result.value.source] = result.value.isHealthy;
    } else {
      // If health check itself failed, mark as unhealthy
      console.error('Gateway health check failed:', result.reason);
    }
  }

  return results;
}

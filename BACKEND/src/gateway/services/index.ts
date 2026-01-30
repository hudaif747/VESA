/**
 * Gateway Services - Barrel Export and Factory
 *
 * This module exports all core services and provides a factory function
 * for initializing them with a shared adapter registry.
 *
 * @example
 * ```typescript
 * import { registry, initializeServices } from './gateway/services';
 * import { ArangoAdapter } from './gateway/adapters/arango';
 *
 * // Register adapters
 * registry.register(new ArangoAdapter());
 *
 * // Initialize services
 * const { datasetService, keywordService, authorService } = initializeServices();
 *
 * // Use services
 * const datasets = await datasetService.getAll();
 * ```
 */

// Registry
export { AdapterRegistry, registry } from './AdapterRegistry';

// Services
export { DatasetService } from './DatasetService';
export { KeywordService } from './KeywordService';
export { AuthorService } from './AuthorService';

// Import for factory function
import { AdapterRegistry, registry as defaultRegistry } from './AdapterRegistry';
import { DatasetService } from './DatasetService';
import { KeywordService } from './KeywordService';
import { AuthorService } from './AuthorService';

/**
 * Service instances container.
 */
export interface ServiceContainer {
  datasetService: DatasetService;
  keywordService: KeywordService;
  authorService: AuthorService;
}

/**
 * Initialize all core services with a shared registry.
 *
 * @param reg - Optional custom registry. Uses the singleton if not provided.
 * @returns Container with all service instances
 *
 * @example
 * ```typescript
 * // Using default singleton registry
 * const services = initializeServices();
 *
 * // Using custom registry (useful for testing)
 * const testRegistry = new AdapterRegistry();
 * const testServices = initializeServices(testRegistry);
 * ```
 */
export function initializeServices(reg?: AdapterRegistry): ServiceContainer {
  const registry = reg ?? defaultRegistry;

  return {
    datasetService: new DatasetService(registry),
    keywordService: new KeywordService(registry),
    authorService: new AuthorService(registry),
  };
}

/**
 * Cached service instances using the default registry.
 * Lazily initialized on first access.
 */
let cachedServices: ServiceContainer | null = null;

/**
 * Get the default service instances.
 *
 * Uses lazy initialization to create services on first access.
 * Always uses the singleton registry.
 *
 * @returns Container with all service instances
 */
export function getServices(): ServiceContainer {
  if (!cachedServices) {
    cachedServices = initializeServices();
  }
  return cachedServices;
}

/**
 * Reset the cached services.
 *
 * Useful for testing or when the registry has changed significantly.
 */
export function resetServices(): void {
  cachedServices = null;
}

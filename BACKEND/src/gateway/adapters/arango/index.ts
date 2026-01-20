/**
 * ArangoDB Adapter - Barrel Export
 *
 * This module exports the ArangoAdapter and its supporting utilities.
 *
 * @example
 * ```typescript
 * import { ArangoAdapter } from '../gateway/adapters/arango';
 *
 * const adapter = new ArangoAdapter();
 * const datasets = await adapter.search({});
 * ```
 */

// Main adapter class
export { ArangoAdapter } from './ArangoAdapter';

// ID format conversion utilities
export {
  toLegacyId,
  toAdapterId,
  toLegacyIds,
  toAdapterIds,
  isLegacyId,
  isAdapterId,
  getSourceFromId,
  getRawIdFromAdapterId,
  type LegacyDatasetID,
} from './idMapper';

// Type mapping utilities
export {
  mapToDataset,
  mapToDatasets,
  mapToKeyword,
  mapToKeywords,
  mapToAuthor,
  mapToAuthors,
} from './typeMapper';

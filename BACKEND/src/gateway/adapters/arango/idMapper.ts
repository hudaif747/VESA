/**
 * ID Mapper - Bidirectional conversion between ID formats.
 *
 * The Adapter-Registry Model uses source-agnostic IDs (e.g., "pangaea:123"),
 * while ArangoDB uses collection-prefixed IDs (e.g., "Dataset/123").
 * This module handles the conversion between these formats.
 */

import { AdapterDatasetID } from '../contracts';

/**
 * Legacy ArangoDB ID format used in the existing database.
 */
export type LegacyDatasetID = `Dataset/${string}` | `STACCollection/${string}`;

/**
 * Mapping between adapter source prefixes and ArangoDB collection names.
 */
const SOURCE_TO_COLLECTION: Record<string, string> = {
  pangaea: 'Dataset',
  stac: 'STACCollection',
};

const COLLECTION_TO_SOURCE: Record<string, string> = {
  Dataset: 'pangaea',
  STACCollection: 'stac',
};

/**
 * Convert a new-format adapter ID to legacy ArangoDB format.
 *
 * @param id - Adapter ID in format "source:id" (e.g., "pangaea:123")
 * @returns Legacy ID in format "Collection/id" (e.g., "Dataset/123")
 * @throws Error if the source prefix is unknown
 *
 * @example
 * toLegacyId('pangaea:123') // => 'Dataset/123'
 * toLegacyId('stac:456')    // => 'STACCollection/456'
 */
export function toLegacyId(id: AdapterDatasetID): LegacyDatasetID {
  const [source, ...idParts] = id.split(':');
  const datasetId = idParts.join(':'); // Handle IDs that might contain colons

  const collection = SOURCE_TO_COLLECTION[source];
  if (!collection) {
    throw new Error(`Unknown source prefix: ${source}. Expected one of: ${Object.keys(SOURCE_TO_COLLECTION).join(', ')}`);
  }

  return `${collection}/${datasetId}` as LegacyDatasetID;
}

/**
 * Convert a legacy ArangoDB ID to new-format adapter ID.
 *
 * @param legacyId - Legacy ID in format "Collection/id" (e.g., "Dataset/123")
 * @returns Adapter ID in format "source:id" (e.g., "pangaea:123")
 * @throws Error if the collection name is unknown
 *
 * @example
 * toAdapterId('Dataset/123')        // => 'pangaea:123'
 * toAdapterId('STACCollection/456') // => 'stac:456'
 */
export function toAdapterId(legacyId: string): AdapterDatasetID {
  const [collection, ...idParts] = legacyId.split('/');
  const datasetId = idParts.join('/'); // Handle IDs that might contain slashes

  const source = COLLECTION_TO_SOURCE[collection];
  if (!source) {
    throw new Error(`Unknown collection: ${collection}. Expected one of: ${Object.keys(COLLECTION_TO_SOURCE).join(', ')}`);
  }

  return `${source}:${datasetId}` as AdapterDatasetID;
}

/**
 * Convert an array of adapter IDs to legacy format.
 *
 * @param ids - Array of adapter IDs
 * @returns Array of legacy IDs
 */
export function toLegacyIds(ids: AdapterDatasetID[]): LegacyDatasetID[] {
  return ids.map(toLegacyId);
}

/**
 * Convert an array of legacy IDs to adapter format.
 *
 * @param legacyIds - Array of legacy IDs
 * @returns Array of adapter IDs
 */
export function toAdapterIds(legacyIds: string[]): AdapterDatasetID[] {
  return legacyIds.map(toAdapterId);
}

/**
 * Check if an ID is in legacy format (contains '/').
 *
 * @param id - ID to check
 * @returns true if the ID is in legacy format
 */
export function isLegacyId(id: string): boolean {
  return id.includes('/') && !id.includes(':');
}

/**
 * Check if an ID is in adapter format (contains ':').
 *
 * @param id - ID to check
 * @returns true if the ID is in adapter format
 */
export function isAdapterId(id: string): boolean {
  return id.includes(':');
}

/**
 * Extract the source from an adapter ID.
 *
 * @param id - Adapter ID in format "source:id"
 * @returns The source prefix (e.g., "pangaea", "stac")
 */
export function getSourceFromId(id: AdapterDatasetID): string {
  return id.split(':')[0];
}

/**
 * Extract the raw ID (without source prefix) from an adapter ID.
 *
 * @param id - Adapter ID in format "source:id"
 * @returns The raw ID without the source prefix
 */
export function getRawIdFromAdapterId(id: AdapterDatasetID): string {
  const [, ...idParts] = id.split(':');
  return idParts.join(':');
}

/**
 * Type Mapper - Convert ArangoDB query results to contract types.
 *
 * This module transforms raw query results from ArangoDB into the
 * standardized contract types defined in the Adapter-Registry Model.
 */

import { IDataset, IKeyword, IAuthor, AdapterDatasetID } from '../contracts';
import { toAdapterId, toAdapterIds } from './idMapper';

/**
 * Raw dataset result shape from mainQuery.ts
 */
interface RawDatasetResult {
  id: string;
  location_data: {
    west_bound_longitude: number | string | null;
    east_bound_longitude: number | string | null;
    north_bound_latitude: number | string | null;
    south_bound_latitude: number | string | null;
    mean_latitude: number | string | null;
    mean_longitude: number | string | null;
  };
  doi: string | null;
  dataset_publication_date?: string | null;
  temporal_coverage: {
    start_date: string | null;
    end_date: string | null;
  };
  authors?: string[];
  providers?: string[];
  dataset_title: string | null;
  organization: string;
}

/**
 * Raw keyword result shape from keywordQuery.ts (before TF-IDF processing)
 */
interface RawKeywordResult {
  keyword: string;
  count: number;
  dataset_id: string[];
}

/**
 * Raw author result shape from authorQuery.ts
 */
interface RawAuthorResult {
  author: string;
  datasets: string[];
}

/**
 * Safely parse a numeric value that might be a string.
 */
function parseNumeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Map a raw ArangoDB dataset result to the IDataset contract type.
 *
 * @param raw - Raw result from mainQuery
 * @returns Normalized IDataset object with adapter-format ID
 */
export function mapToDataset(raw: RawDatasetResult): IDataset {
  return {
    id: toAdapterId(raw.id),
    location_data: {
      west_bound_longitude: parseNumeric(raw.location_data?.west_bound_longitude),
      east_bound_longitude: parseNumeric(raw.location_data?.east_bound_longitude),
      north_bound_latitude: parseNumeric(raw.location_data?.north_bound_latitude),
      south_bound_latitude: parseNumeric(raw.location_data?.south_bound_latitude),
      mean_latitude: parseNumeric(raw.location_data?.mean_latitude),
      mean_longitude: parseNumeric(raw.location_data?.mean_longitude),
    },
    doi: raw.doi ?? null,
    dataset_publication_date: raw.dataset_publication_date ?? null,
    temporal_coverage: {
      start_date: raw.temporal_coverage?.start_date ?? null,
      end_date: raw.temporal_coverage?.end_date ?? null,
    },
    authors: raw.authors ?? undefined,
    providers: raw.providers ?? undefined,
    dataset_title: raw.dataset_title ?? null,
    organization: raw.organization,
  };
}

/**
 * Map an array of raw dataset results to IDataset array.
 *
 * @param rawResults - Array of raw results from mainQuery
 * @returns Array of normalized IDataset objects
 */
export function mapToDatasets(rawResults: RawDatasetResult[]): IDataset[] {
  return rawResults
    .filter((raw) => raw !== null && raw !== undefined)
    .map(mapToDataset);
}

/**
 * Map a raw keyword result to the IKeyword contract type.
 *
 * @param raw - Raw result from keywordQuery (after TF-IDF processing)
 * @returns Normalized IKeyword object with adapter-format dataset IDs
 */
export function mapToKeyword(raw: RawKeywordResult): IKeyword {
  return {
    keyword: raw.keyword,
    count: raw.count,
    dataset_ids: toAdapterIds(raw.dataset_id),
  };
}

/**
 * Map an array of raw keyword results to IKeyword array.
 *
 * @param rawResults - Array of raw results from keywordQuery
 * @returns Array of normalized IKeyword objects
 */
export function mapToKeywords(rawResults: RawKeywordResult[]): IKeyword[] {
  return rawResults
    .filter((raw) => raw !== null && raw !== undefined)
    .map(mapToKeyword);
}

/**
 * Map a raw author result to the IAuthor contract type.
 *
 * @param raw - Raw result from authorQuery
 * @returns Normalized IAuthor object with adapter-format dataset IDs
 */
export function mapToAuthor(raw: RawAuthorResult): IAuthor {
  return {
    name: raw.author,
    dataset_ids: toAdapterIds(raw.datasets),
  };
}

/**
 * Map an array of raw author results to IAuthor array.
 *
 * @param rawResults - Array of raw results from authorQuery
 * @returns Array of normalized IAuthor objects
 */
export function mapToAuthors(rawResults: RawAuthorResult[]): IAuthor[] {
  return rawResults
    .filter((raw) => raw !== null && raw !== undefined)
    .map(mapToAuthor);
}

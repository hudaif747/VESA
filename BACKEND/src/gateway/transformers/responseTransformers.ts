/**
 * Response Transformers - Convert adapter types to legacy API format.
 *
 * The gateway services use the new Adapter-Registry Model with source-agnostic
 * IDs (e.g., "pangaea:123"). The frontend expects the legacy ArangoDB format
 * (e.g., "Dataset/123"). These transformers bridge the gap.
 */

import { IDataset, IKeyword, IAuthor, AdapterDatasetID } from '../adapters/contracts';
import { toLegacyId, toLegacyIds, LegacyDatasetID } from '../adapters/arango';

/**
 * Legacy dataset format expected by the frontend.
 */
export interface LegacyDataset {
  id: LegacyDatasetID;
  location_data: {
    west_bound_longitude: number | null;
    east_bound_longitude: number | null;
    north_bound_latitude: number | null;
    south_bound_latitude: number | null;
    mean_latitude: number | null;
    mean_longitude: number | null;
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
 * Legacy keyword format expected by the frontend.
 * Note: Uses "dataset_id" (singular) not "dataset_ids" (plural).
 */
export interface LegacyKeyword {
  keyword: string;
  count: number;
  dataset_id: LegacyDatasetID[];
}

/**
 * Legacy author format expected by the frontend.
 * Note: Uses "author" and "datasets" not "name" and "dataset_ids".
 */
export interface LegacyAuthor {
  author: string;
  datasets: LegacyDatasetID[];
}

/**
 * Convert an adapter IDataset to the legacy format expected by the frontend.
 *
 * @param dataset - Dataset in adapter format
 * @returns Dataset in legacy format
 */
export function toLegacyDataset(dataset: IDataset): LegacyDataset {
  return {
    id: toLegacyId(dataset.id),
    location_data: {
      west_bound_longitude: dataset.location_data.west_bound_longitude,
      east_bound_longitude: dataset.location_data.east_bound_longitude,
      north_bound_latitude: dataset.location_data.north_bound_latitude,
      south_bound_latitude: dataset.location_data.south_bound_latitude,
      mean_latitude: dataset.location_data.mean_latitude,
      mean_longitude: dataset.location_data.mean_longitude,
    },
    doi: dataset.doi,
    dataset_publication_date: dataset.dataset_publication_date,
    temporal_coverage: {
      start_date: dataset.temporal_coverage.start_date,
      end_date: dataset.temporal_coverage.end_date,
    },
    authors: dataset.authors,
    providers: dataset.providers,
    dataset_title: dataset.dataset_title,
    organization: dataset.organization,
  };
}

/**
 * Convert an array of adapter IDatasets to legacy format.
 *
 * @param datasets - Array of datasets in adapter format
 * @returns Array of datasets in legacy format
 */
export function toLegacyDatasets(datasets: IDataset[]): LegacyDataset[] {
  return datasets.map(toLegacyDataset);
}

/**
 * Convert an adapter IKeyword to the legacy format expected by the frontend.
 *
 * @param keyword - Keyword in adapter format
 * @returns Keyword in legacy format
 */
export function toLegacyKeyword(keyword: IKeyword): LegacyKeyword {
  return {
    keyword: keyword.keyword,
    count: keyword.count,
    dataset_id: toLegacyIds(keyword.dataset_ids),
  };
}

/**
 * Convert an array of adapter IKeywords to legacy format.
 *
 * @param keywords - Array of keywords in adapter format
 * @returns Array of keywords in legacy format
 */
export function toLegacyKeywords(keywords: IKeyword[]): LegacyKeyword[] {
  return keywords.map(toLegacyKeyword);
}

/**
 * Convert an adapter IAuthor to the legacy format expected by the frontend.
 *
 * @param author - Author in adapter format
 * @returns Author in legacy format
 */
export function toLegacyAuthor(author: IAuthor): LegacyAuthor {
  return {
    author: author.name,
    datasets: toLegacyIds(author.dataset_ids),
  };
}

/**
 * Convert an array of adapter IAuthors to legacy format.
 *
 * @param authors - Array of authors in adapter format
 * @returns Array of authors in legacy format
 */
export function toLegacyAuthors(authors: IAuthor[]): LegacyAuthor[] {
  return authors.map(toLegacyAuthor);
}

/**
 * ArangoAdapter - Implements IDataAdapter for the existing ArangoDB database.
 *
 * This adapter wraps the existing AQL queries and provides a standardized
 * interface for accessing PANGAEA and STAC data. It serves as the bridge
 * between the legacy database structure and the new Adapter-Registry Model.
 */

import { Database } from 'arangojs';
import { ArrayCursor } from 'arangojs/cursor';
import {
  IDataAdapter,
  IDataset,
  IKeyword,
  IAuthor,
  SearchParams,
  AdapterFeatures,
  AdapterDatasetID,
} from '../contracts';
import { db } from '../../../database';
import { mainQuery } from '../../../queries/mainQuery';
import { keywordQuery } from '../../../queries/keywordQuery';
import { authorQuery } from '../../../queries/authorQuery';
import { initialPageLoadQuery } from '../../../queries/initialLoadQuery';
import processResult from '../../../services/Wordcloud/lenghtFiltering';
import { toLegacyIds, toAdapterIds } from './idMapper';
import { mapToDatasets, mapToKeywords, mapToAuthors } from './typeMapper';

/**
 * ArangoAdapter implements the IDataAdapter interface for the existing
 * ArangoDB database containing PANGAEA and STAC datasets.
 */
export class ArangoAdapter implements IDataAdapter {
  /**
   * Source identifier for this adapter.
   * Note: This adapter handles multiple sources (pangaea, stac) from a single database.
   */
  readonly source = 'arango';

  private database: Database;

  /**
   * Create a new ArangoAdapter instance.
   *
   * @param database - Optional Database instance for dependency injection (useful for testing)
   */
  constructor(database?: Database) {
    this.database = database ?? db;
  }

  /**
   * Search for datasets matching the given parameters.
   *
   * Currently returns all datasets as the existing queries don't support
   * advanced filtering. Future enhancement: Add bbox/temporal filtering to AQL.
   *
   * @param params - Search criteria (currently unused)
   * @returns Array of all datasets
   */
  async search(params: SearchParams): Promise<IDataset[]> {
    try {
      // Get all dataset IDs first
      const allIds = await this.getAllDatasetIds();

      if (allIds.length === 0) {
        return [];
      }

      // Get full dataset details
      return this.getDatasetsByIds(allIds);
    } catch (error) {
      console.error('ArangoAdapter.search failed:', error);
      return [];
    }
  }

  /**
   * Get a single dataset by its source-specific ID.
   *
   * @param id - The ID portion after the source prefix (e.g., "123" from "pangaea:123")
   * @returns The dataset if found, null otherwise
   */
  async getDatasetById(id: string): Promise<IDataset | null> {
    try {
      // Try both pangaea and stac prefixes
      const possibleIds: AdapterDatasetID[] = [
        `pangaea:${id}` as AdapterDatasetID,
        `stac:${id}` as AdapterDatasetID,
      ];

      for (const adapterId of possibleIds) {
        const results = await this.getDatasetsByIds([adapterId]);
        if (results.length > 0) {
          return results[0];
        }
      }

      return null;
    } catch (error) {
      console.error('ArangoAdapter.getDatasetById failed:', error);
      return null;
    }
  }

  /**
   * Get multiple datasets by their full adapter IDs.
   *
   * @param ids - Array of full dataset IDs (e.g., ["pangaea:123", "stac:456"])
   * @returns Array of found datasets
   */
  async getDatasetsByIds(ids: AdapterDatasetID[]): Promise<IDataset[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      // Convert to legacy format for the AQL query
      const legacyIds = toLegacyIds(ids);

      const cursor: ArrayCursor<any> = await this.database.query(mainQuery, {
        keys: legacyIds,
      });

      const rawResults = await cursor.all();

      // Filter out null results and map to contract type
      return mapToDatasets(rawResults.filter((r) => r !== null));
    } catch (error) {
      console.error('ArangoAdapter.getDatasetsByIds failed:', error);
      return [];
    }
  }

  /**
   * Get keywords associated with specific datasets.
   *
   * Applies TF-IDF processing and length filtering to the results.
   *
   * @param datasetIds - Array of dataset IDs to get keywords for
   * @returns Array of keywords with counts and associated dataset IDs
   */
  async getKeywordsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IKeyword[]> {
    if (datasetIds.length === 0) {
      return [];
    }

    try {
      // Convert to legacy format for the AQL query
      const legacyIds = toLegacyIds(datasetIds);

      const cursor: ArrayCursor<any> = await this.database.query(keywordQuery, {
        keys: legacyIds,
      });

      const rawResults = await cursor.all();

      // Apply TF-IDF processing (reuses existing logic)
      const processedKeywords = processResult(rawResults);

      // Map to contract type with converted IDs
      return mapToKeywords(processedKeywords);
    } catch (error) {
      console.error('ArangoAdapter.getKeywordsForDatasets failed:', error);
      return [];
    }
  }

  /**
   * Get all keywords from the database.
   *
   * Used for initial page load to populate the word cloud.
   *
   * @returns Array of all keywords with counts
   */
  async getAllKeywords(): Promise<IKeyword[]> {
    try {
      // First, get all dataset IDs
      const allIds = await this.getAllDatasetIds();

      if (allIds.length === 0) {
        return [];
      }

      // Then get keywords for all datasets
      return this.getKeywordsForDatasets(allIds);
    } catch (error) {
      console.error('ArangoAdapter.getAllKeywords failed:', error);
      return [];
    }
  }

  /**
   * Get authors associated with specific datasets.
   *
   * Note: Author data is only available for PANGAEA (Dataset) entries,
   * not for STAC collections.
   *
   * @param datasetIds - Array of dataset IDs to get authors for
   * @returns Array of authors with their associated dataset IDs
   */
  async getAuthorsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IAuthor[]> {
    if (datasetIds.length === 0) {
      return [];
    }

    try {
      // Convert to legacy format for the AQL query
      const legacyIds = toLegacyIds(datasetIds);

      const cursor: ArrayCursor<any> = await this.database.query(authorQuery, {
        keys: legacyIds,
      });

      const rawResults = await cursor.all();

      return mapToAuthors(rawResults);
    } catch (error) {
      console.error('ArangoAdapter.getAuthorsForDatasets failed:', error);
      return [];
    }
  }

  /**
   * Get all authors from the database.
   *
   * Used for initial page load to populate the author network.
   *
   * @returns Array of all authors with their dataset associations
   */
  async getAllAuthors(): Promise<IAuthor[]> {
    try {
      // First, get all dataset IDs
      const allIds = await this.getAllDatasetIds();

      if (allIds.length === 0) {
        return [];
      }

      // Then get authors for all datasets
      return this.getAuthorsForDatasets(allIds);
    } catch (error) {
      console.error('ArangoAdapter.getAllAuthors failed:', error);
      return [];
    }
  }

  /**
   * Get the capabilities of this adapter.
   *
   * @returns Feature flags indicating adapter capabilities
   */
  getFeatures(): AdapterFeatures {
    return {
      supportsKeywords: true,
      supportsAuthors: true, // Only for PANGAEA datasets
      supportsBboxSearch: false, // Not implemented in current AQL queries
      supportsTemporalSearch: false, // Not implemented in current AQL queries
      supportsFullTextSearch: false,
      maxResultsPerQuery: 10000,
    };
  }

  /**
   * Check if the ArangoDB database is reachable and healthy.
   *
   * @returns true if the database is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const cursor = await this.database.query('RETURN 1');
      await cursor.all();
      return true;
    } catch (error) {
      console.error('ArangoAdapter.healthCheck failed:', error);
      return false;
    }
  }

  /**
   * Get all dataset IDs from the database (both PANGAEA and STAC).
   *
   * @returns Array of all dataset IDs in adapter format
   * @private
   */
  private async getAllDatasetIds(): Promise<AdapterDatasetID[]> {
    try {
      const cursor: ArrayCursor<string> = await this.database.query(initialPageLoadQuery);
      const legacyIds = await cursor.all();

      return toAdapterIds(legacyIds);
    } catch (error) {
      console.error('ArangoAdapter.getAllDatasetIds failed:', error);
      return [];
    }
  }
}

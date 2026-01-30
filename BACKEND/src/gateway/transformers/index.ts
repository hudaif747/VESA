/**
 * Response Transformers - Barrel Export
 *
 * This module exports all response transformers for converting
 * adapter types to legacy API format.
 *
 * @example
 * ```typescript
 * import { toLegacyDataset, toLegacyKeyword, toLegacyAuthor } from '../gateway/transformers';
 *
 * const legacyDatasets = datasets.map(toLegacyDataset);
 * const legacyKeywords = keywords.map(toLegacyKeyword);
 * const legacyAuthors = authors.map(toLegacyAuthor);
 * ```
 */

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
} from './responseTransformers';

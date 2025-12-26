/**
 * Import Library
 *
 * Utilities for parsing and processing import files.
 */

export {
  parseCSV,
  parseNumber,
  parseDate,
  detectSeparator,
  detectHeaders,
  type CSVParseOptions,
  type CSVParseResult,
} from "./csv";

export {
  parseOFX,
  isOFXFormat,
  type OFXTransaction,
  type OFXAccountInfo,
  type OFXParseResult,
} from "./ofx";

export {
  processCSVImport,
  processOFXImport,
  processImport,
  type ProcessedTransaction,
  type ProcessImportResult,
  type ExistingTransaction,
} from "./processor";

export {
  levenshtein,
  levenshteinWithThreshold,
  similarity,
  isSimilar,
  normalizeForComparison,
  normalizedSimilarity,
} from "./levenshtein";

export {
  checkDuplicate,
  detectDuplicates,
  detectInternalDuplicates,
  DEFAULT_DUPLICATE_CONFIG,
  type DuplicateCheckTransaction,
  type DuplicateMatch,
  type DuplicateDetectionConfig,
} from "./duplicates";

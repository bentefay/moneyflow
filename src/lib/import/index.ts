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
  type ParsedOFXTransaction,
  type ParsedOFXAccount,
  type ParsedOFXBalance,
  type ParsedOFXStatement,
  type ParsedOFXData,
  type OFXParseResult,
  type OFXParseError,
  type OFXTransactionType,
  type OFXAccountType,
} from "./ofx";

export {
  processCSVImport,
  processOFXImport,
  processImport,
  type ProcessedTransaction,
  type ProcessImportResult,
  type ProcessOFXImportResult,
  type ProcessImportResultType,
  type ExistingTransaction,
} from "./processor";

export {
  levenshtein,
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

/**
 * Import Library
 *
 * Utilities for parsing and processing import files.
 */

export {
	type CSVParseOptions,
	type CSVParseResult,
	detectHeaders,
	detectSeparator,
	parseCSV,
	parseDate,
	parseNumber,
} from "./csv";
export {
	checkDuplicate,
	DEFAULT_DUPLICATE_CONFIG,
	type DuplicateCheckTransaction,
	type DuplicateDetectionConfig,
	type DuplicateMatch,
	detectDuplicates,
	detectInternalDuplicates,
} from "./duplicates";
export {
	calculateCutoffDate,
	type FilterableTransaction,
	filterOldTransactions,
	getFilterModeDescription,
	isBeforeCutoff,
} from "./filter";
export {
	isSimilar,
	levenshtein,
	normalizedSimilarity,
	normalizeForComparison,
	similarity,
} from "./levenshtein";
export {
	isOFXFormat,
	type OFXAccountType,
	type OFXParseError,
	type OFXParseResult,
	type OFXTransactionType,
	type ParsedOFXAccount,
	type ParsedOFXBalance,
	type ParsedOFXData,
	type ParsedOFXStatement,
	type ParsedOFXTransaction,
	parseOFX,
} from "./ofx";
export {
	type ExistingTransaction,
	type ProcessedTransaction,
	type ProcessImportResult,
	type ProcessImportResultType,
	type ProcessOFXImportResult,
	processCSVImport,
	processImport,
	processOFXImport,
} from "./processor";
export {
	type DateMatchMode,
	DEFAULT_DUPLICATE_DETECTION_SETTINGS,
	DEFAULT_FILTER_SETTINGS,
	DEFAULT_FORMATTING_SETTINGS,
	DEFAULT_IMPORT_CONFIG,
	type DescriptionMatchMode,
	type DuplicateCheckResult,
	type DuplicateDetectionSettings,
	type FilterConfig,
	type FilterResult,
	type FilterStats,
	type FormattingSettings,
	type ImportConfig,
	type ImportFileType,
	type ImportSession,
	type ImportSummaryStats,
	type OldTransactionMode,
	type PreviewTransaction,
	type PreviewTransactionStatus,
	type ValidationError,
} from "./types";

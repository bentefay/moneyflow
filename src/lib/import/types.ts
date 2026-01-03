/**
 * Import Types
 *
 * Type definitions for the enhanced import flow.
 * These types are used for ephemeral client-side state during import sessions.
 */

import type { MoneyMinorUnits } from "@/lib/domain/currency";

// Re-export ISODateString for consumers that need it alongside these types
export type { ISODateString } from "@/types";

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Mode for handling old transactions (older than cutoff date).
 * - "ignore-all": Skip all transactions older than cutoff
 * - "ignore-duplicates": Skip old duplicates, import old non-duplicates
 * - "do-not-ignore": Import all transactions regardless of age
 */
export type OldTransactionMode = "ignore-all" | "ignore-duplicates" | "do-not-ignore";

/**
 * Configuration for old transaction filtering.
 */
export interface FilterConfig {
	/** How to handle old transactions */
	mode: OldTransactionMode;
	/** Number of days before newest existing transaction to consider "old" */
	cutoffDays: number;
}

/**
 * Statistics from filtering operation.
 */
export interface FilterStats {
	/** Total transactions before filtering */
	totalCount: number;
	/** Transactions that passed the filter */
	includedCount: number;
	/** Transactions that were filtered out */
	excludedCount: number;
	/** Old transactions that were duplicates (excluded in ignore-duplicates mode) */
	oldDuplicatesCount: number;
	/** Old transactions that were NOT duplicates (included in ignore-duplicates mode) */
	oldNonDuplicatesCount: number;
}

/**
 * Result of filtering transactions.
 */
export interface FilterResult<T> {
	/** Transactions to include in import */
	included: T[];
	/** Transactions excluded by filter */
	excluded: T[];
	/** Statistics about the filtering */
	stats: FilterStats;
}

// ============================================================================
// Duplicate Detection Types (Extended)
// ============================================================================

/**
 * Mode for date matching in duplicate detection.
 * - "exact": Dates must match exactly
 * - "within": Dates can differ by up to maxDateDiffDays
 */
export type DateMatchMode = "exact" | "within";

/**
 * Mode for description matching in duplicate detection.
 * - "exact": Descriptions must match exactly (case-insensitive)
 * - "similar": Use Levenshtein similarity with threshold
 */
export type DescriptionMatchMode = "exact" | "similar";

/**
 * Extended duplicate detection configuration with user-controllable modes.
 */
export interface DuplicateDetectionSettings {
	/** How to match dates */
	dateMatchMode: DateMatchMode;
	/** Max days difference when mode="within" */
	maxDateDiffDays: number;
	/** How to match descriptions */
	descriptionMatchMode: DescriptionMatchMode;
	/** Min similarity (0-1) when mode="similar" */
	minDescriptionSimilarity: number;
}

/**
 * Result of checking a single transaction for duplicates.
 */
export interface DuplicateCheckResult {
	/** Row index in the import file */
	rowIndex: number;
	/** Whether this transaction is a duplicate */
	isDuplicate: boolean;
	/** ID of the existing transaction it matches, if any */
	matchedTransactionId: string | null;
	/** Confidence score (0-1) */
	confidence: number;
	/** Breakdown of match scores */
	matchDetails: {
		dateScore: number;
		descriptionScore: number;
		amountMatches: boolean;
	};
}

// ============================================================================
// Formatting Types
// ============================================================================

/**
 * Settings for parsing and formatting import data.
 */
export interface FormattingSettings {
	/** Whether the file has a header row */
	hasHeaders: boolean;
	/** Character used for thousands (e.g., "," in "1,000") */
	thousandSeparator: string;
	/** Character used for decimals (e.g., "." in "10.50") */
	decimalSeparator: string;
	/** Date format pattern (e.g., "yyyy-MM-dd", "MM/dd/yyyy") */
	dateFormat: string;
	/** Whether to collapse multiple spaces to single space */
	collapseWhitespace: boolean;
}

/**
 * Default formatting settings.
 */
export const DEFAULT_FORMATTING_SETTINGS: FormattingSettings = {
	hasHeaders: true,
	thousandSeparator: ",",
	decimalSeparator: ".",
	dateFormat: "yyyy-MM-dd",
	collapseWhitespace: false,
};

// ============================================================================
// Import Configuration
// ============================================================================

/**
 * Complete import configuration (stored per-template).
 */
export interface ImportConfig {
	/** Parsing and formatting settings */
	formatting: FormattingSettings;
	/** Duplicate detection settings */
	duplicateDetection: DuplicateDetectionSettings;
	/** Old transaction filter settings */
	oldTransactionFilter: FilterConfig;
	/** Column mappings: csvColumn -> entityField */
	columnMappings: Record<string, string>;
}

/**
 * Default duplicate detection settings.
 */
export const DEFAULT_DUPLICATE_DETECTION_SETTINGS: DuplicateDetectionSettings = {
	dateMatchMode: "within",
	maxDateDiffDays: 3,
	descriptionMatchMode: "similar",
	minDescriptionSimilarity: 0.6,
};

/**
 * Default filter settings.
 */
export const DEFAULT_FILTER_SETTINGS: FilterConfig = {
	mode: "ignore-duplicates",
	cutoffDays: 10,
};

/**
 * Default import configuration.
 */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
	formatting: DEFAULT_FORMATTING_SETTINGS,
	duplicateDetection: DEFAULT_DUPLICATE_DETECTION_SETTINGS,
	oldTransactionFilter: DEFAULT_FILTER_SETTINGS,
	columnMappings: {},
};

// ============================================================================
// Preview Transaction
// ============================================================================

/**
 * Status of a transaction in the preview.
 */
export type PreviewTransactionStatus = "valid" | "invalid" | "duplicate" | "filtered";

/**
 * A transaction as displayed in the import preview.
 */
export interface PreviewTransaction {
	/** Original row index in the raw data */
	rowIndex: number;
	/** Parsed date (ISO 8601) */
	date: string;
	/** Cleaned description text */
	description: string;
	/** Amount in minor units */
	amount: MoneyMinorUnits;
	/** Current status */
	status: PreviewTransactionStatus;
	/** ID of existing transaction this duplicates, if any */
	duplicateOf: string | null;
	/** Confidence of duplicate match (0-1) */
	duplicateConfidence: number;
	/** List of validation errors */
	validationErrors: string[];
}

// ============================================================================
// Validation
// ============================================================================

/**
 * A validation error for a specific row or field.
 */
export interface ValidationError {
	/** Row index (0-based), or -1 for global errors */
	rowIndex: number;
	/** Field name, or null for row-level errors */
	field: string | null;
	/** Human-readable error message */
	message: string;
}

// ============================================================================
// Import Session (Ephemeral State)
// ============================================================================

/**
 * File type being imported.
 */
export type ImportFileType = "csv" | "ofx";

/**
 * Ephemeral state for an import session.
 * Not persisted to CRDT - exists only in React state during import.
 */
export interface ImportSession {
	// File metadata
	/** Unique ID for this import session */
	fileId: string;
	/** Original filename */
	fileName: string;
	/** Detected file type */
	fileType: ImportFileType;
	/** Raw file content */
	rawContent: string;

	// Parsed data
	/** Raw rows from CSV (includes header if present) */
	rawRows: string[][];
	/** Column headers (first row or generated) */
	headers: string[];

	// Configuration
	/** Selected template ID, or null for defaults */
	templateId: string | null;
	/** Current configuration (editable) */
	config: ImportConfig;

	// Account selection
	/** Selected account ID for import */
	selectedAccountId: string | null;
	/** Account number detected from OFX file */
	detectedAccountNumber: string | null;

	// Computed state (derived from config + raw data)
	/** Preview transactions with computed statuses */
	previewTransactions: PreviewTransaction[];
	/** Duplicate check results */
	duplicateResults: DuplicateCheckResult[];
	/** Transactions excluded by old transaction filter */
	filteredOut: PreviewTransaction[];

	// Validation
	/** Validation errors */
	validationErrors: ValidationError[];
	/** Whether import can proceed */
	canImport: boolean;
}

/**
 * Summary statistics for the import preview.
 */
export interface ImportSummaryStats {
	/** Total rows in the file */
	totalRows: number;
	/** Rows that will be imported */
	validCount: number;
	/** Rows with validation errors */
	errorCount: number;
	/** Rows flagged as duplicates */
	duplicateCount: number;
	/** Rows filtered out by old transaction filter */
	filteredCount: number;
}

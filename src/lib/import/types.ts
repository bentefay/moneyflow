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
 * Type of cutoff calculation for old transaction filtering.
 * - "days": Calculate cutoff as X days before newest existing transaction
 * - "date": Use explicit cutoff date
 */
export type CutoffType = "days" | "date";

/**
 * Configuration for old transaction filtering.
 */
export interface FilterConfig {
    /** How to handle old transactions */
    readonly mode: OldTransactionMode;
    /** Type of cutoff calculation */
    readonly cutoffType: CutoffType;
    /** Number of days before newest existing transaction to consider "old" (when cutoffType="days") */
    readonly cutoffDays: number;
    /** Explicit cutoff date (when cutoffType="date") */
    readonly cutoffDate: string | null;
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
    readonly dateMatchMode: DateMatchMode;
    /** Max days difference when mode="within" */
    readonly maxDateDiffDays: number;
    /** How to match descriptions */
    readonly descriptionMatchMode: DescriptionMatchMode;
    /** Min similarity (0-1) when mode="similar" */
    readonly minDescriptionSimilarity: number;
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
    readonly hasHeaders: boolean;
    /** Character used for thousands (e.g., "," in "1,000") */
    readonly thousandSeparator: string;
    /** Character used for decimals (e.g., "." in "10.50") */
    readonly decimalSeparator: string;
    /** Date format pattern (e.g., "yyyy-MM-dd", "MM/dd/yyyy") */
    readonly dateFormat: string;
    /** Whether to collapse multiple spaces to single space */
    readonly collapseWhitespace: boolean;
}

/**
 * Default formatting settings.
 */
export const DEFAULT_FORMATTING_SETTINGS: FormattingSettings = {
    hasHeaders: true,
    thousandSeparator: ",",
    decimalSeparator: ".",
    dateFormat: "yyyy-MM-dd",
    collapseWhitespace: true
};

// ============================================================================
// Import Configuration
// ============================================================================

/**
 * Complete import configuration (stored per-template).
 */
export interface ImportConfig {
    /** Parsing and formatting settings */
    readonly formatting: FormattingSettings;
    /** Duplicate detection settings */
    readonly duplicateDetection: DuplicateDetectionSettings;
    /** Old transaction filter settings */
    readonly oldTransactionFilter: FilterConfig;
    /** Column mappings: csvColumn -> entityField */
    readonly columnMappings: Readonly<Record<string, string>>;
}

/**
 * Default duplicate detection settings.
 */
export const DEFAULT_DUPLICATE_DETECTION_SETTINGS: DuplicateDetectionSettings = {
    dateMatchMode: "exact",
    maxDateDiffDays: 0,
    descriptionMatchMode: "exact",
    minDescriptionSimilarity: 1
};

/**
 * Default filter settings.
 */
export const DEFAULT_FILTER_SETTINGS: FilterConfig = {
    mode: "ignore-duplicates",
    cutoffType: "days",
    cutoffDays: 10,
    cutoffDate: null
};

/**
 * Default import configuration.
 */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
    formatting: DEFAULT_FORMATTING_SETTINGS,
    duplicateDetection: DEFAULT_DUPLICATE_DETECTION_SETTINGS,
    oldTransactionFilter: DEFAULT_FILTER_SETTINGS,
    columnMappings: {}
};

// ============================================================================
// Preview Transaction
// ============================================================================

/**
 * Outcome of a row in the preview.
 *
 * These five cases are exhaustive and mutually exclusive, so every row carries
 * exactly one of them. That is what makes the summary counts a true partition
 * of the total: they are counts of a single field, not independently
 * accumulated tallies that could double-count a row or miss one.
 *
 * - "valid": parses, not a duplicate, will be imported
 * - "invalid": does not parse, will not be imported
 * - "duplicate": parses, matches an existing transaction, imported and marked
 * - "old-new": older than the cutoff and not a duplicate, excluded
 * - "old-duplicate": older than the cutoff and a duplicate, excluded
 *
 * The two "old" cases are distinct because a single "old" bucket cannot say
 * why a row was excluded, which is the ambiguity the user reported.
 */
export type PreviewTransactionStatus =
    | "valid"
    | "invalid"
    | "duplicate"
    | "old-new"
    | "old-duplicate";

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
 * Account action to take during OFX import.
 */
export type OFXAccountAction =
    | { type: "matched" } // Account matched by ID, no action needed
    | { type: "apply-id"; accountId: string; accountNumber: string } // Apply detected ID to existing account
    | { type: "create-new"; accountName: string; accountNumber: string } // Create new account with detected ID
    | { type: "default-selected" } // No ID in file, defaulted to first account
    | null; // No action (CSV or user overrode selection)

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
    /** Action to take for account on import (OFX only) */
    accountAction: OFXAccountAction;

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
 *
 * The four outcome counts plus `errorCount` partition `totalRows`: each row is
 * counted under exactly one, so they always sum to the total. Anything that
 * adds a count here must come with a matching `PreviewTransactionStatus`, or
 * the partition stops holding.
 */
export interface ImportSummaryStats {
    /** Total rows in the file */
    totalRows: number;
    /** Rows that parse, are not duplicates, and will be imported */
    validCount: number;
    /** Rows with validation errors, not imported */
    errorCount: number;
    /** Rows that duplicate an existing transaction, imported and marked */
    duplicateCount: number;
    /** Rows older than the cutoff that are NOT duplicates, excluded */
    oldNewCount: number;
    /** Rows older than the cutoff that are ALSO duplicates, excluded */
    oldDuplicateCount: number;
}

/**
 * Count preview rows into the summary categories.
 *
 * Written as one pass over a single `status` field, with an exhaustive switch,
 * so the counts cannot drift out of partition: adding a status without a
 * matching count is a compile error, and no row can be counted twice because
 * each contributes to exactly one branch.
 */
export function summarizePreview(
    previewTransactions: readonly PreviewTransaction[]
): ImportSummaryStats {
    return previewTransactions.reduce<ImportSummaryStats>(
        (counts, preview) => {
            switch (preview.status) {
                case "valid":
                    return { ...counts, validCount: counts.validCount + 1 };
                case "invalid":
                    return { ...counts, errorCount: counts.errorCount + 1 };
                case "duplicate":
                    return { ...counts, duplicateCount: counts.duplicateCount + 1 };
                case "old-new":
                    return { ...counts, oldNewCount: counts.oldNewCount + 1 };
                case "old-duplicate":
                    return { ...counts, oldDuplicateCount: counts.oldDuplicateCount + 1 };
            }
        },
        {
            totalRows: previewTransactions.length,
            validCount: 0,
            errorCount: 0,
            duplicateCount: 0,
            oldNewCount: 0,
            oldDuplicateCount: 0
        }
    );
}

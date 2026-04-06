/**
 * Old Transaction Filtering
 *
 * Filters imported transactions based on age relative to existing data.
 * This helps users avoid re-importing old transactions when downloading
 * overlapping statement periods.
 *
 * Three modes:
 * - "ignore-all": Skip all transactions older than cutoff
 * - "ignore-duplicates": Skip old duplicates, keep old non-duplicates
 * - "do-not-ignore": Import all transactions regardless of age
 *
 * Two cutoff types:
 * - "days": Calculate cutoff as X days before newest existing transaction
 * - "date": Use explicit cutoff date
 */

import { Temporal } from "temporal-polyfill";

import type { FilterConfig, FilterResult, FilterStats, OldTransactionMode } from "./types";

/**
 * Transaction with date and optional duplicate flag for filtering.
 */
export interface FilterableTransaction {
    /** ISO 8601 date string (YYYY-MM-DD) */
    date: string;
    /** Whether this transaction is a duplicate of an existing one */
    isDuplicate?: boolean;
}

/**
 * Calculate the cutoff date based on the newest existing transaction and cutoff days.
 *
 * The cutoff is calculated as (newestDate - cutoffDays + 1) day, making the filter
 * inclusive of the newest date when cutoffDays=0. This means:
 * - cutoffDays=0: Exclude transactions on or before the newest existing date
 * - cutoffDays=1: Exclude transactions more than 1 day before newest (keep same day + 1 before)
 *
 * @param newestExistingDate - ISO date of newest transaction, or null if no transactions
 * @param cutoffDays - Number of days before newest to set as cutoff
 * @returns Cutoff date as ISO string, or null if no existing transactions
 */
export function calculateCutoffDate(
    newestExistingDate: string | null,
    cutoffDays: number
): string | null {
    if (newestExistingDate === null) {
        return null;
    }

    const newest = Temporal.PlainDate.from(newestExistingDate);
    // Add 1 to cutoffDays so that cutoffDays=0 means "exclude newest date and before"
    // (transactions strictly after newest are kept)
    const cutoff = newest.subtract({ days: cutoffDays }).add({ days: 1 });
    return cutoff.toString();
}

/**
 * Check if a date is before (older than) a cutoff date.
 *
 * @param date - Date to check (ISO string)
 * @param cutoffDate - Cutoff date (ISO string)
 * @returns True if date is before cutoff, false if either date is invalid
 */
export function isBeforeCutoff(date: string, cutoffDate: string): boolean {
    // Validate inputs - both must be valid ISO date strings
    if (!date || !cutoffDate) {
        return false;
    }
    try {
        return Temporal.PlainDate.compare(date, cutoffDate) < 0;
    } catch {
        // Invalid date format - treat as not before cutoff (include the transaction)
        return false;
    }
}

/**
 * Filter transactions based on age and duplicate status.
 *
 * @param transactions - Array of transactions with date and optional isDuplicate
 * @param newestExistingDate - ISO date of newest existing transaction, or null if vault empty
 * @param config - Filter configuration
 * @returns Filtered result with included/excluded arrays and statistics
 *
 * @example
 * const result = filterOldTransactions(parsed, "2026-01-15", {
 *   mode: "ignore-duplicates",
 *   cutoffType: "days",
 *   cutoffDays: 10,
 *   cutoffDate: null
 * });
 * // Transactions before 2026-01-05 that are duplicates will be excluded
 */
export function filterOldTransactions<T extends FilterableTransaction>(
    transactions: T[],
    newestExistingDate: string | null,
    config: FilterConfig
): FilterResult<T> {
    const { mode, cutoffType, cutoffDays, cutoffDate: explicitCutoffDate } = config;

    // Initialize stats
    const stats: FilterStats = {
        totalCount: transactions.length,
        includedCount: 0,
        excludedCount: 0,
        oldDuplicatesCount: 0,
        oldNonDuplicatesCount: 0
    };

    // If mode is "do-not-ignore", include everything
    if (mode === "do-not-ignore") {
        stats.includedCount = transactions.length;
        return {
            included: [...transactions],
            excluded: [],
            stats
        };
    }

    // Calculate cutoff date based on cutoff type
    let cutoffDate: string | null = null;
    if (cutoffType === "date" && explicitCutoffDate && explicitCutoffDate.trim()) {
        // Validate that the explicit cutoff date is a valid ISO date
        try {
            Temporal.PlainDate.from(explicitCutoffDate);
            cutoffDate = explicitCutoffDate;
        } catch {
            // Invalid date format - fall back to days-based calculation
            cutoffDate = calculateCutoffDate(newestExistingDate, cutoffDays);
        }
    } else {
        cutoffDate = calculateCutoffDate(newestExistingDate, cutoffDays);
    }

    // If no existing transactions, include everything (no cutoff reference point)
    if (cutoffDate === null) {
        stats.includedCount = transactions.length;
        return {
            included: [...transactions],
            excluded: [],
            stats
        };
    }

    const included: T[] = [];
    const excluded: T[] = [];

    for (const tx of transactions) {
        const isOld = isBeforeCutoff(tx.date, cutoffDate);

        if (!isOld) {
            // New transactions (on or after cutoff) are always included
            included.push(tx);
            stats.includedCount++;
        } else {
            // Old transactions - behavior depends on mode
            const isDupe = tx.isDuplicate ?? false;

            if (isDupe) {
                stats.oldDuplicatesCount++;
            } else {
                stats.oldNonDuplicatesCount++;
            }

            if (mode === "ignore-all") {
                // Exclude all old transactions
                excluded.push(tx);
                stats.excludedCount++;
            } else {
                // mode === "ignore-duplicates"
                if (isDupe) {
                    // Exclude old duplicates
                    excluded.push(tx);
                    stats.excludedCount++;
                } else {
                    // Include old non-duplicates
                    included.push(tx);
                    stats.includedCount++;
                }
            }
        }
    }

    return { included, excluded, stats };
}

/**
 * Get a human-readable description of the filter mode.
 */
export function getFilterModeDescription(mode: OldTransactionMode): string {
    switch (mode) {
        case "ignore-all":
            return "Skip all old transactions";
        case "ignore-duplicates":
            return "Skip old duplicates, keep old non-duplicates";
        case "do-not-ignore":
            return "Import all old transactions";
    }
}

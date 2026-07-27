/**
 * Duplicate Detection
 *
 * Detects potential duplicate transactions based on
 * date, amount, and description similarity.
 *
 * Amounts are MoneyMinorUnits (integer cents) - comparison is exact integer match.
 *
 * Supports configurable matching modes:
 * - Date: "exact" (same day only) or "within" (within maxDateDiffDays)
 * - Description: "exact" (case-insensitive match) or "similar" (Levenshtein similarity)
 */

import { Temporal } from "temporal-polyfill";

import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";
import { fromISODateString, type ISODateString } from "@/types";

import { normalizedSimilarity } from "./levenshtein";
import {
    type DateMatchMode,
    DEFAULT_DUPLICATE_DETECTION_SETTINGS,
    type DescriptionMatchMode
} from "./types";

/**
 * Transaction for duplicate detection.
 * Dates use branded ISODateString for type safety.
 */
export interface DuplicateCheckTransaction {
    id: string;
    /** Branded ISO date string (YYYY-MM-DD) */
    date: ISODateString;
    /** Amount in minor units (cents) */
    amount: MoneyMinorUnits;
    description: string;
}

/**
 * Duplicate match result.
 */
export interface DuplicateMatch {
    /** ID of the new/imported transaction */
    newTransactionId: string;
    /** ID of the existing transaction it matches */
    existingTransactionId: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Match details */
    matchDetails: {
        dateMatch: boolean;
        amountMatch: boolean;
        descriptionSimilarity: number;
    };
}

/**
 * Duplicate detection configuration with configurable matching modes.
 */
export interface DuplicateDetectionConfig {
    /** How to match dates: "exact" (same day) or "within" (tolerance) */
    dateMatchMode: DateMatchMode;
    /** Maximum date difference in days to consider a match (only used when dateMatchMode="within") */
    maxDateDiffDays: number;
    /** How to match descriptions: "exact" (case-insensitive) or "similar" (Levenshtein) */
    descriptionMatchMode: DescriptionMatchMode;
    /** Minimum description similarity (0-1) to consider a match (only used when descriptionMatchMode="similar") */
    minDescriptionSimilarity: number;
    /** Maximum amount difference in minor units (cents) to consider a match */
    maxAmountDiff: MoneyMinorUnits;
    /** Minimum overall confidence to flag as duplicate */
    minConfidence: number;
}

/**
 * Default duplicate detection configuration.
 * Extends DEFAULT_DUPLICATE_DETECTION_SETTINGS with algorithm-specific settings.
 */
export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
    ...DEFAULT_DUPLICATE_DETECTION_SETTINGS,
    maxAmountDiff: asMinorUnits(1), // Allow 1 cent difference for rounding
    minConfidence: 0.7 // Overall 70% confidence
};

/**
 * Calculate the number of days between two ISODateStrings.
 */
function daysBetween(date1: ISODateString, date2: ISODateString): number {
    const d1 = fromISODateString(date1);
    const d2 = fromISODateString(date2);
    return Math.abs(d1.until(d2, { largestUnit: "day" }).days);
}

/**
 * Calculate duplicate confidence score.
 *
 * @param dateMatch - Whether dates are within tolerance
 * @param amountMatch - Whether amounts are within tolerance
 * @param descriptionSimilarity - Description similarity score
 * @returns Overall confidence (0-1)
 */
function calculateConfidence(
    dateMatch: boolean,
    amountMatch: boolean,
    descriptionSimilarity: number
): number {
    // Weights for different factors
    const weights = {
        date: 0.25,
        amount: 0.35,
        description: 0.4
    };

    let score = 0;

    // Date must match to even consider
    if (!dateMatch) return 0;
    score += weights.date;

    // Amount is important
    if (amountMatch) {
        score += weights.amount;
    } else {
        // If amount doesn't match, significantly reduce confidence
        return score * 0.5;
    }

    // Description similarity
    score += weights.description * descriptionSimilarity;

    return score;
}

/**
 * Check if two transactions are potential duplicates.
 *
 * Supports configurable matching modes:
 * - Date: "exact" requires same day, "within" allows maxDateDiffDays tolerance
 * - Description: "exact" requires case-insensitive match, "similar" uses Levenshtein
 *
 * @param newTx - New/imported transaction
 * @param existingTx - Existing transaction
 * @param config - Detection configuration
 * @returns Match result or null if not a duplicate
 */
export function checkDuplicate(
    newTx: DuplicateCheckTransaction,
    existingTx: DuplicateCheckTransaction,
    config: DuplicateDetectionConfig = DEFAULT_DUPLICATE_CONFIG
): DuplicateMatch | null {
    // Check date based on mode
    const dateDiff = daysBetween(newTx.date, existingTx.date);
    let dateMatch: boolean;
    if (config.dateMatchMode === "exact") {
        dateMatch = dateDiff === 0;
    } else {
        // "within" mode
        dateMatch = dateDiff <= config.maxDateDiffDays;
    }

    // Check amount
    const amountDiff = Math.abs(newTx.amount - existingTx.amount);
    const amountMatch = amountDiff <= config.maxAmountDiff;

    // Check description based on mode
    let descriptionSimilarity: number;
    if (config.descriptionMatchMode === "exact") {
        // Case-insensitive exact match
        const normalizedNew = newTx.description.toLowerCase().trim();
        const normalizedExisting = existingTx.description.toLowerCase().trim();
        descriptionSimilarity = normalizedNew === normalizedExisting ? 1.0 : 0.0;
    } else {
        // "similar" mode - use Levenshtein similarity
        descriptionSimilarity = normalizedSimilarity(newTx.description, existingTx.description);
    }

    // For "similar" mode, check if meets similarity threshold
    // For "exact" mode, descriptionSimilarity is either 0 or 1
    const descriptionMatches =
        config.descriptionMatchMode === "exact"
            ? descriptionSimilarity === 1.0
            : descriptionSimilarity >= config.minDescriptionSimilarity;

    // The configured threshold is a hard gate in BOTH modes. Date+amount alone
    // already scores 0.60, so without this gate any similarity above ~0.25
    // clears the 0.7 confidence floor and unrelated transactions get flagged.
    if (!descriptionMatches) {
        return null;
    }

    // Calculate confidence
    const confidence = calculateConfidence(dateMatch, amountMatch, descriptionSimilarity);

    // Check if meets threshold
    if (confidence < config.minConfidence) {
        return null;
    }

    return {
        newTransactionId: newTx.id,
        existingTransactionId: existingTx.id,
        confidence,
        matchDetails: {
            dateMatch,
            amountMatch,
            descriptionSimilarity
        }
    };
}

/**
 * Detect duplicates in a list of new transactions using sorted merge-scan.
 *
 * Uses O(n log n + m log m) sorting + O(n + m) linear scan for efficient
 * duplicate detection even with large transaction sets.
 *
 * @param newTransactions - New/imported transactions
 * @param existingTransactions - Existing transactions to check against
 * @param config - Detection configuration
 * @returns List of duplicate matches
 */
export function detectDuplicates(
    newTransactions: DuplicateCheckTransaction[],
    existingTransactions: DuplicateCheckTransaction[],
    config: DuplicateDetectionConfig = DEFAULT_DUPLICATE_CONFIG
): DuplicateMatch[] {
    if (newTransactions.length === 0 || existingTransactions.length === 0) {
        return [];
    }

    const matches: DuplicateMatch[] = [];

    // Sort both lists by date for merge-scan
    const sortedNew = [...newTransactions].sort((a, b) => a.date.localeCompare(b.date));
    const sortedExisting = [...existingTransactions].sort((a, b) => a.date.localeCompare(b.date));

    // Use sliding window approach: for each new transaction, only check
    // existing transactions within the date tolerance window
    let windowStart = 0;

    for (const newTx of sortedNew) {
        const newDate = Temporal.PlainDate.from(newTx.date);

        // Advance window start past transactions that are too old
        while (windowStart < sortedExisting.length) {
            const existingDate = Temporal.PlainDate.from(sortedExisting[windowStart].date);
            const daysDiff = existingDate.until(newDate, { largestUnit: "day" }).days;
            if (daysDiff <= config.maxDateDiffDays) {
                break;
            }
            windowStart++;
        }

        // Check transactions within the window
        let bestMatch: DuplicateMatch | null = null;

        for (let i = windowStart; i < sortedExisting.length; i++) {
            const existingTx = sortedExisting[i];
            const existingDate = Temporal.PlainDate.from(existingTx.date);
            const daysDiff = newDate.until(existingDate, { largestUnit: "day" }).days;

            // Stop if we've gone past the date tolerance
            if (daysDiff > config.maxDateDiffDays) {
                break;
            }

            const match = checkDuplicate(newTx, existingTx, config);
            if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
                bestMatch = match;
            }
        }

        if (bestMatch) {
            matches.push(bestMatch);
        }
    }

    return matches;
}

/**
 * Detect duplicates within a single list of transactions.
 *
 * Useful for finding duplicates that might exist in the import file itself.
 *
 * @param transactions - Transactions to check
 * @param config - Detection configuration
 * @returns List of duplicate pairs (each pair only appears once)
 */
export function detectInternalDuplicates(
    transactions: DuplicateCheckTransaction[],
    config: DuplicateDetectionConfig = DEFAULT_DUPLICATE_CONFIG
): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];
    const matched = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
        if (matched.has(transactions[i].id)) continue;

        for (let j = i + 1; j < transactions.length; j++) {
            if (matched.has(transactions[j].id)) continue;

            const match = checkDuplicate(transactions[i], transactions[j], config);
            if (match) {
                matches.push(match);
                matched.add(transactions[j].id);
            }
        }
    }

    return matches;
}

/**
 * Duplicate Detection
 *
 * Detects potential duplicate transactions based on
 * date, amount, and description similarity.
 */

import { normalizedSimilarity, isSimilar } from "./levenshtein";

/**
 * Transaction for duplicate detection.
 */
export interface DuplicateCheckTransaction {
  id: string;
  date: string;
  amount: number;
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
 * Duplicate detection configuration.
 */
export interface DuplicateDetectionConfig {
  /** Maximum date difference in days to consider a match */
  maxDateDiffDays: number;
  /** Maximum amount difference (absolute) to consider a match */
  maxAmountDiff: number;
  /** Minimum description similarity (0-1) to consider a match */
  minDescriptionSimilarity: number;
  /** Minimum overall confidence to flag as duplicate */
  minConfidence: number;
}

/**
 * Default duplicate detection configuration.
 */
export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  maxDateDiffDays: 3, // Allow 3 days difference for posting delays
  maxAmountDiff: 0.01, // Allow 1 cent difference for rounding
  minDescriptionSimilarity: 0.6, // 60% similar descriptions
  minConfidence: 0.7, // Overall 70% confidence
};

/**
 * Calculate the number of days between two dates.
 *
 * @param date1 - First date (ISO string)
 * @param date2 - Second date (ISO string)
 * @returns Absolute number of days between dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    description: 0.4,
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
  // Check date
  const dateDiff = daysBetween(newTx.date, existingTx.date);
  const dateMatch = dateDiff <= config.maxDateDiffDays;

  // Check amount
  const amountDiff = Math.abs(newTx.amount - existingTx.amount);
  const amountMatch = amountDiff <= config.maxAmountDiff;

  // Check description similarity
  const descriptionSimilarity = normalizedSimilarity(newTx.description, existingTx.description);

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
      descriptionSimilarity,
    },
  };
}

/**
 * Detect duplicates in a list of new transactions.
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
  const matches: DuplicateMatch[] = [];

  // Pre-group existing transactions by approximate date for faster lookup
  const existingByMonth = new Map<string, DuplicateCheckTransaction[]>();
  for (const tx of existingTransactions) {
    const monthKey = tx.date.substring(0, 7); // "YYYY-MM"
    const list = existingByMonth.get(monthKey) ?? [];
    list.push(tx);
    existingByMonth.set(monthKey, list);
  }

  // Also add to adjacent months for transactions near month boundaries
  for (const tx of existingTransactions) {
    const date = new Date(tx.date);

    // Previous month
    const prevMonth = new Date(date);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevKey = prevMonth.toISOString().substring(0, 7);
    const prevList = existingByMonth.get(prevKey) ?? [];
    if (!prevList.includes(tx)) {
      prevList.push(tx);
      existingByMonth.set(prevKey, prevList);
    }

    // Next month
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextKey = nextMonth.toISOString().substring(0, 7);
    const nextList = existingByMonth.get(nextKey) ?? [];
    if (!nextList.includes(tx)) {
      nextList.push(tx);
      existingByMonth.set(nextKey, nextList);
    }
  }

  // Check each new transaction
  for (const newTx of newTransactions) {
    const monthKey = newTx.date.substring(0, 7);
    const candidates = existingByMonth.get(monthKey) ?? [];

    // Find best match
    let bestMatch: DuplicateMatch | null = null;

    for (const existingTx of candidates) {
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

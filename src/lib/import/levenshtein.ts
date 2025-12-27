/**
 * String Similarity
 *
 * String comparison utilities for fuzzy matching.
 * Uses the string-comparison library for battle-tested algorithms.
 *
 * Note: The library normalizes strings (case-insensitive, whitespace trimmed)
 * which is ideal for merchant name matching.
 */

import stringComparison from "string-comparison";

const { levenshtein: levenshteinLib, diceCoefficient } = stringComparison;

/** Threshold for switching from Levenshtein to Dice similarity */
const SHORT_STRING_THRESHOLD = 10;

/**
 * Calculate the Levenshtein distance between two strings.
 *
 * Note: The underlying library normalizes strings (case-insensitive,
 * whitespace trimmed). Use for semantic comparison, not exact matching.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits required (after normalization)
 */
export function levenshtein(a: string, b: string): number {
  return levenshteinLib.distance(a, b);
}

/**
 * Calculate similarity ratio between two strings.
 *
 * Uses Levenshtein for short strings (< 10 chars) and Dice coefficient
 * for longer strings. Levenshtein is better for short strings where
 * single-character edits matter; Dice is O(m+n) and handles word-level
 * similarity well for longer merchant names.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity ratio (1 = identical, 0 = completely different)
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);

  // Use Levenshtein-based similarity for short strings
  if (maxLen < SHORT_STRING_THRESHOLD) {
    return levenshteinLib.similarity(a, b);
  }

  // Use Dice coefficient for longer strings
  return diceCoefficient.similarity(a, b);
}

/**
 * Check if two strings are similar within a threshold.
 *
 * @param a - First string
 * @param b - Second string
 * @param minSimilarity - Minimum similarity ratio (0-1)
 * @returns True if strings are at least minSimilarity similar
 */
export function isSimilar(a: string, b: string, minSimilarity: number): boolean {
  return similarity(a, b) >= minSimilarity;
}

/**
 * Normalize a string for comparison.
 *
 * Converts to lowercase, removes extra whitespace, and strips punctuation.
 *
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Replace punctuation (including underscore) with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Compare two strings with normalization.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity ratio after normalization
 */
export function normalizedSimilarity(a: string, b: string): number {
  return similarity(normalizeForComparison(a), normalizeForComparison(b));
}

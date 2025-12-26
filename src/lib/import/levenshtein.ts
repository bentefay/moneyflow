/**
 * Levenshtein Distance
 *
 * Calculates edit distance between strings for fuzzy matching.
 */

/**
 * Calculate the Levenshtein distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string
 * into the other.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits required
 *
 * @example
 * ```ts
 * levenshtein("kitten", "sitting"); // 3
 * levenshtein("hello", "hello"); // 0
 * levenshtein("", "abc"); // 3
 * ```
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create a 2D array to store distances
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate the Levenshtein distance with early termination.
 *
 * This version stops calculating if the distance exceeds the threshold,
 * making it more efficient for checking similarity thresholds.
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum distance to calculate before returning
 * @returns Distance, or maxDistance + 1 if threshold exceeded
 */
export function levenshteinWithThreshold(
  a: string,
  b: string,
  maxDistance: number
): number {
  if (a.length === 0) return Math.min(b.length, maxDistance + 1);
  if (b.length === 0) return Math.min(a.length, maxDistance + 1);

  // Quick rejection: if length difference exceeds threshold, no need to compute
  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1;
  }

  // Use two rows instead of full matrix
  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currentRow = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currentRow[0] = i;
    let minInRow = i;

    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        currentRow[j] = prevRow[j - 1];
      } else {
        currentRow[j] = Math.min(
          prevRow[j - 1] + 1,
          currentRow[j - 1] + 1,
          prevRow[j] + 1
        );
      }
      minInRow = Math.min(minInRow, currentRow[j]);
    }

    // Early termination: if minimum in current row exceeds threshold
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prevRow, currentRow] = [currentRow, prevRow];
  }

  return prevRow[b.length];
}

/**
 * Calculate similarity ratio between two strings (0-1).
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity ratio (1 = identical, 0 = completely different)
 *
 * @example
 * ```ts
 * similarity("hello", "hello"); // 1.0
 * similarity("hello", "helo"); // 0.8
 * similarity("abc", "xyz"); // 0.0
 * ```
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Check if two strings are similar within a threshold.
 *
 * More efficient than calculating full similarity when you only need
 * to know if strings are "similar enough".
 *
 * @param a - First string
 * @param b - Second string
 * @param minSimilarity - Minimum similarity ratio (0-1)
 * @returns True if strings are at least minSimilarity similar
 *
 * @example
 * ```ts
 * isSimilar("hello", "helo", 0.8); // true (80% similar)
 * isSimilar("hello", "world", 0.8); // false
 * ```
 */
export function isSimilar(a: string, b: string, minSimilarity: number): boolean {
  if (a === b) return true;

  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return true;

  // Calculate max allowed distance based on similarity threshold
  const maxDistance = Math.floor(maxLength * (1 - minSimilarity));

  const distance = levenshteinWithThreshold(a, b, maxDistance);
  return distance <= maxDistance;
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
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
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

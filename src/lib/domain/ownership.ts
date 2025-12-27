/**
 * Ownership Validation and Utilities
 *
 * Functions for validating and working with account ownership percentages.
 * Account ownerships must sum to exactly 100% to ensure proper expense allocation.
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum allowed deviation from 100% due to floating-point arithmetic */
export const OWNERSHIP_TOLERANCE = 0.001;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Calculate the sum of ownership percentages
 */
export function sumOwnerships(ownerships: Record<string, number>): number {
  return Object.values(ownerships).reduce((sum, pct) => sum + pct, 0);
}

/**
 * Validate ownership percentages.
 *
 * Rules:
 * - Must sum to exactly 100% (within floating-point tolerance)
 * - Each percentage must be non-negative
 * - Each percentage must not exceed 100%
 *
 * @param ownerships - Map of personId to ownership percentage
 * @returns Validation result with valid flag and optional error message
 */
export function validateOwnerships(ownerships: Record<string, number>): {
  valid: boolean;
  error?: string;
  sum: number;
} {
  const entries = Object.entries(ownerships);

  // Empty ownerships are invalid for accounts (need at least one owner)
  if (entries.length === 0) {
    return { valid: false, error: "Account must have at least one owner", sum: 0 };
  }

  // Check each percentage
  for (const [personId, pct] of entries) {
    if (pct < 0) {
      return {
        valid: false,
        error: `Ownership percentage for ${personId} cannot be negative`,
        sum: sumOwnerships(ownerships),
      };
    }
    if (pct > 100) {
      return {
        valid: false,
        error: `Ownership percentage for ${personId} cannot exceed 100%`,
        sum: sumOwnerships(ownerships),
      };
    }
  }

  const sum = sumOwnerships(ownerships);

  // Must sum to exactly 100% (within tolerance)
  if (Math.abs(sum - 100) > OWNERSHIP_TOLERANCE) {
    return {
      valid: false,
      error: `Ownerships must sum to 100%, currently ${sum.toFixed(2)}%`,
      sum,
    };
  }

  return { valid: true, sum };
}

/**
 * Check if ownerships are valid without getting detailed error info
 */
export function isValidOwnership(ownerships: Record<string, number>): boolean {
  return validateOwnerships(ownerships).valid;
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize ownership percentages to sum to exactly 100%
 *
 * @param ownerships - Map of personId to ownership percentage
 * @returns Normalized ownerships that sum to 100%
 */
export function normalizeOwnerships(ownerships: Record<string, number>): Record<string, number> {
  const sum = sumOwnerships(ownerships);

  if (sum === 0) {
    return ownerships;
  }

  const result: Record<string, number> = {};
  for (const [personId, pct] of Object.entries(ownerships)) {
    result[personId] = (pct / sum) * 100;
  }
  return result;
}

/**
 * Create equal ownership split for a list of person IDs
 *
 * @param personIds - Array of person IDs
 * @returns Ownerships with equal percentages summing to 100%
 */
export function createEqualOwnerships(personIds: string[]): Record<string, number> {
  if (personIds.length === 0) {
    return {};
  }

  const sharePerPerson = 100 / personIds.length;
  const result: Record<string, number> = {};

  for (const personId of personIds) {
    result[personId] = sharePerPerson;
  }

  return result;
}

/**
 * Add a new owner with a given percentage, redistributing from existing owners
 *
 * @param ownerships - Current ownership map
 * @param personId - New person to add
 * @param percentage - Percentage to assign to new owner
 * @returns Updated ownerships (may not sum to 100% if percentage > remaining)
 */
export function addOwner(
  ownerships: Record<string, number>,
  personId: string,
  percentage: number
): Record<string, number> {
  const entries = Object.entries(ownerships);
  const currentSum = sumOwnerships(ownerships);

  if (entries.length === 0) {
    // First owner gets full ownership or specified percentage
    return { [personId]: Math.min(percentage, 100) };
  }

  // Scale down existing ownerships proportionally to make room
  const scaleFactor = (100 - percentage) / currentSum;
  const result: Record<string, number> = {};

  for (const [pid, pct] of entries) {
    result[pid] = pct * scaleFactor;
  }

  result[personId] = percentage;

  return result;
}

/**
 * Remove an owner, redistributing their percentage to remaining owners
 *
 * @param ownerships - Current ownership map
 * @param personId - Person to remove
 * @returns Updated ownerships with remaining owners scaled to 100%
 */
export function removeOwner(
  ownerships: Record<string, number>,
  personId: string
): Record<string, number> {
  const { [personId]: _removed, ...remaining } = ownerships;

  // If no owners left, return empty
  if (Object.keys(remaining).length === 0) {
    return {};
  }

  // Normalize remaining ownerships to 100%
  return normalizeOwnerships(remaining);
}

/**
 * Update a specific owner's percentage, adjusting others proportionally
 *
 * @param ownerships - Current ownership map
 * @param personId - Person whose ownership to update
 * @param newPercentage - New percentage for this person
 * @returns Updated ownerships that sum to 100%
 */
export function updateOwnerPercentage(
  ownerships: Record<string, number>,
  personId: string,
  newPercentage: number
): Record<string, number> {
  const entries = Object.entries(ownerships);

  if (entries.length <= 1) {
    // Single owner always gets 100%
    return { [personId]: 100 };
  }

  // Clamp to valid range
  const clampedPct = Math.max(0, Math.min(100, newPercentage));

  // Get sum of other owners
  const othersSum = entries
    .filter(([pid]) => pid !== personId)
    .reduce((sum, [, pct]) => sum + pct, 0);

  const result: Record<string, number> = {};

  // Scale other owners to fill the remainder
  const remainder = 100 - clampedPct;
  const scaleFactor = othersSum > 0 ? remainder / othersSum : 0;

  for (const [pid, pct] of entries) {
    if (pid === personId) {
      result[pid] = clampedPct;
    } else {
      result[pid] = pct * scaleFactor;
    }
  }

  return result;
}

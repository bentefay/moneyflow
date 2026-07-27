/**
 * Ownership Validation and Utilities
 *
 * Functions for validating and working with account ownership percentages.
 * Account ownerships must sum to exactly 100% to ensure proper expense allocation.
 */

import Decimal from "decimal.js";
import { z } from "zod";

const OwnershipDecimal = Decimal.clone({
    precision: 80,
    rounding: Decimal.ROUND_HALF_EVEN
});

// ============================================================================
// Constants
// ============================================================================

/** Maximum allowed deviation from 100% due to floating-point arithmetic */
export const OWNERSHIP_TOLERANCE = 0.001;

export const OwnershipPercentageSchema = z
    .number()
    .refine(Number.isFinite)
    .refine((value) => !Object.is(value, -0))
    .min(0)
    .max(100)
    .brand<"OwnershipPercentage">();

export type OwnershipPercentage = z.infer<typeof OwnershipPercentageSchema>;
export type ValidatedOwnershipSet = Readonly<Record<string, OwnershipPercentage>>;

type OwnershipEntryErrorReason = "negative-zero" | "not-finite" | "not-number" | "out-of-range";

export type OwnershipValidationError =
    | {
          readonly domain: "ownership";
          readonly personId: string;
          readonly reason: OwnershipEntryErrorReason;
          readonly type: "invalid-ownership";
      }
    | {
          readonly domain: "ownership";
          readonly reason: "empty";
          readonly type: "invalid-ownership";
      }
    | {
          readonly domain: "ownership";
          readonly reason: "invalid-total";
          readonly total: string;
          readonly type: "invalid-ownership";
      };

export type OwnershipSetValidationResult =
    | {
          readonly ok: true;
          readonly value: ValidatedOwnershipSet;
      }
    | {
          readonly errors: readonly OwnershipValidationError[];
          readonly ok: false;
      };

function freezeResultGraph<T extends object>(value: T): T {
    for (const nested of Object.values(value)) {
        if (nested != null && typeof nested === "object") {
            freezeResultGraph(nested);
        }
    }
    return Object.freeze(value);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Calculate the sum of ownership percentages
 */
export function sumOwnerships(ownerships: Record<string, number>): number {
    return Object.values(ownerships).reduce((sum, pct) => sum + pct, 0);
}

function ownershipEntryErrorReason(value: unknown): OwnershipEntryErrorReason | null {
    if (typeof value !== "number") return "not-number";
    if (!Number.isFinite(value)) return "not-finite";
    if (Object.is(value, -0)) return "negative-zero";
    if (value < 0 || value > 100) return "out-of-range";
    return null;
}

export function validateOwnershipSet(
    ownerships: Readonly<Record<string, unknown>>
): OwnershipSetValidationResult {
    const entries = Object.entries(ownerships);
    if (entries.length === 0) {
        return freezeResultGraph({
            ok: false,
            errors: [{ domain: "ownership", reason: "empty", type: "invalid-ownership" }]
        });
    }

    const errors = entries.flatMap(([personId, value]): readonly OwnershipValidationError[] => {
        const reason = ownershipEntryErrorReason(value);
        return reason == null
            ? []
            : [{ domain: "ownership", personId, reason, type: "invalid-ownership" }];
    });
    if (errors.length > 0) return freezeResultGraph({ ok: false, errors });

    const validated: Record<string, OwnershipPercentage> = {};
    for (const [personId, value] of entries) {
        const parsed = OwnershipPercentageSchema.safeParse(value);
        if (parsed.success) validated[personId] = parsed.data;
    }

    const total = Object.values(validated).reduce(
        (sum, percentage) => sum.plus(percentage),
        new OwnershipDecimal(0)
    );
    if (total.minus(100).abs().greaterThan(OWNERSHIP_TOLERANCE)) {
        return freezeResultGraph({
            ok: false,
            errors: [
                {
                    domain: "ownership",
                    reason: "invalid-total",
                    total: total.toString(),
                    type: "invalid-ownership"
                }
            ]
        });
    }

    return freezeResultGraph({ ok: true, value: validated });
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
    const sum = sumOwnerships(ownerships);
    const result = validateOwnershipSet(ownerships);
    if (result.ok) return { valid: true, sum };

    const [error] = result.errors;
    if (error == null) return { valid: false, error: "Invalid account ownership", sum };
    if (error.reason === "empty") {
        return { valid: false, error: "Account must have at least one owner", sum };
    }
    if (error.reason === "invalid-total") {
        return {
            valid: false,
            error: `Ownerships must sum to 100%, currently ${Number(error.total).toFixed(2)}%`,
            sum
        };
    }
    if (error.reason === "out-of-range") {
        const percentage = ownerships[error.personId];
        return {
            valid: false,
            error:
                typeof percentage === "number" && percentage < 0
                    ? `Ownership percentage for ${error.personId} cannot be negative`
                    : `Ownership percentage for ${error.personId} cannot exceed 100%`,
            sum
        };
    }
    return {
        valid: false,
        error: `Ownership percentage for ${error.personId} must be a finite number`,
        sum
    };
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

    const remainder = 100 - percentage;
    const result: Record<string, number> = {};

    if (currentSum === 0) {
        // Nothing to scale proportionally - share the remainder equally so no owner becomes NaN
        const equalShare = remainder / entries.length;
        for (const [pid] of entries) {
            result[pid] = equalShare;
        }
    } else {
        // Scale down existing ownerships proportionally to make room
        const scaleFactor = remainder / currentSum;
        for (const [pid, pct] of entries) {
            result[pid] = pct * scaleFactor;
        }
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructure to remove
    const { [personId]: _, ...remaining } = ownerships;

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

    if (entries.length === 0) {
        // No existing owners - the named person becomes the sole owner
        return { [personId]: 100 };
    }

    if (entries.length === 1 && entries[0][0] === personId) {
        // The sole existing owner always holds 100%
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
        if (pid === personId) continue;
        result[pid] = pct * scaleFactor;
    }

    // Set last so a person who is not yet an owner is added rather than dropped
    result[personId] = clampedPct;

    return result;
}

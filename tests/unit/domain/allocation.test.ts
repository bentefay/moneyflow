/**
 * Allocation Math Tests
 *
 * Property-based tests for allocation percentage calculations,
 * including auto-allocation to account owners and validation rules.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

// ============================================================================
// Allocation Helpers (Pure functions for testing)
// ============================================================================

/**
 * Calculate the sum of allocation percentages
 */
export function sumAllocations(allocations: Record<string, number>): number {
	return Object.values(allocations).reduce((sum, pct) => sum + pct, 0);
}

/**
 * Check if allocations are valid (sum to 100 or less)
 */
export function isValidAllocation(allocations: Record<string, number>): boolean {
	const sum = sumAllocations(allocations);
	return sum >= 0 && sum <= 100;
}

/**
 * Calculate the remainder that needs to be allocated to owners
 */
export function calculateRemainder(allocations: Record<string, number>): number {
	return Math.max(0, 100 - sumAllocations(allocations));
}

/**
 * Distribute remainder to account owners based on ownership percentages.
 *
 * Per FR-015: When transaction allocations don't sum to 100%, the remainder
 * is allocated to account owners according to their ownership percentages.
 */
export function distributeRemainderToOwners(
	currentAllocations: Record<string, number>,
	ownershipPercentages: Record<string, number>
): Record<string, number> {
	const remainder = calculateRemainder(currentAllocations);

	if (remainder === 0) {
		return { ...currentAllocations };
	}

	const result = { ...currentAllocations };
	const ownershipSum = sumAllocations(ownershipPercentages);

	// Distribute remainder proportionally to ownership
	for (const [personId, ownershipPct] of Object.entries(ownershipPercentages)) {
		if (ownershipSum > 0) {
			const share = (remainder * ownershipPct) / ownershipSum;
			result[personId] = (result[personId] ?? 0) + share;
		}
	}

	return result;
}

/**
 * Normalize allocations to sum to exactly 100%
 */
export function normalizeAllocations(allocations: Record<string, number>): Record<string, number> {
	const sum = sumAllocations(allocations);
	if (sum === 0) return allocations;

	const result: Record<string, number> = {};
	for (const [personId, pct] of Object.entries(allocations)) {
		result[personId] = (pct / sum) * 100;
	}
	return result;
}

/**
 * Calculate each person's share of a transaction amount
 */
export function calculateShares(
	amount: number,
	allocations: Record<string, number>
): Record<string, number> {
	const result: Record<string, number> = {};
	for (const [personId, pct] of Object.entries(allocations)) {
		result[personId] = (amount * pct) / 100;
	}
	return result;
}

/**
 * Validate ownership percentages (must sum to exactly 100%)
 */
export function validateOwnership(ownerships: Record<string, number>): {
	valid: boolean;
	error?: string;
} {
	const sum = sumAllocations(ownerships);

	if (Math.abs(sum - 100) > 0.001) {
		return {
			valid: false,
			error: `Ownership percentages must sum to 100% (got ${sum.toFixed(2)}%)`,
		};
	}

	for (const [personId, pct] of Object.entries(ownerships)) {
		if (pct < 0 || pct > 100) {
			return {
				valid: false,
				error: `Ownership for ${personId} must be between 0% and 100%`,
			};
		}
	}

	return { valid: true };
}

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Generate a valid percentage (0-100)
 */
const percentageArb = fc.double({ min: 0, max: 100, noNaN: true });

/**
 * Generate allocation percentages for multiple people
 */
const allocationsArb = fc.dictionary(
	fc.constantFrom("personA", "personB", "personC", "personD"),
	percentageArb,
	{ minKeys: 0, maxKeys: 4 }
);

/**
 * Generate valid ownership percentages (sum to 100%)
 */
const validOwnershipArb = fc
	.tuple(fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 100, noNaN: true }))
	.map(([a, b]): Record<string, number> => {
		const total = a + b;
		if (total === 0) return { personA: 100, personB: 0 };
		return {
			personA: (a / total) * 100,
			personB: (b / total) * 100,
		};
	});

/**
 * Generate a transaction amount
 */
const amountArb = fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true });

// ============================================================================
// sumAllocations tests
// ============================================================================

describe("sumAllocations", () => {
	it("returns 0 for empty allocations", () => {
		expect(sumAllocations({})).toBe(0);
	});

	it("sums single allocation", () => {
		expect(sumAllocations({ personA: 50 })).toBe(50);
	});

	it("sums multiple allocations", () => {
		expect(sumAllocations({ personA: 30, personB: 40, personC: 30 })).toBe(100);
	});

	// Property: sum equals reduce result
	it("equals Object.values().reduce (property-based)", () => {
		fc.assert(
			fc.property(allocationsArb, (allocations) => {
				const sum = sumAllocations(allocations);
				const expected = Object.values(allocations).reduce((acc, v) => acc + v, 0);
				expect(sum).toBeCloseTo(expected, 10);
			})
		);
	});
});

// ============================================================================
// isValidAllocation tests
// ============================================================================

describe("isValidAllocation", () => {
	it("accepts empty allocations", () => {
		expect(isValidAllocation({})).toBe(true);
	});

	it("accepts allocations summing to 100", () => {
		expect(isValidAllocation({ personA: 50, personB: 50 })).toBe(true);
	});

	it("accepts allocations summing to less than 100", () => {
		expect(isValidAllocation({ personA: 30 })).toBe(true);
	});

	it("rejects allocations summing to more than 100", () => {
		expect(isValidAllocation({ personA: 60, personB: 60 })).toBe(false);
	});

	// Note: Per spec, negative allocations are allowed (flips credit/debit direction)
	it("handles negative allocations", () => {
		// Negative + positive can sum to valid range
		expect(isValidAllocation({ personA: -20, personB: 80 })).toBe(true);
	});
});

// ============================================================================
// calculateRemainder tests
// ============================================================================

describe("calculateRemainder", () => {
	it("returns 100 for empty allocations", () => {
		expect(calculateRemainder({})).toBe(100);
	});

	it("returns 0 when allocations sum to 100", () => {
		expect(calculateRemainder({ personA: 60, personB: 40 })).toBe(0);
	});

	it("returns difference when allocations sum to less", () => {
		expect(calculateRemainder({ personA: 30 })).toBe(70);
	});

	it("returns 0 when allocations exceed 100", () => {
		expect(calculateRemainder({ personA: 80, personB: 80 })).toBe(0);
	});

	// Property: remainder is non-negative
	it("remainder is always >= 0 (property-based)", () => {
		fc.assert(
			fc.property(allocationsArb, (allocations) => {
				expect(calculateRemainder(allocations)).toBeGreaterThanOrEqual(0);
			})
		);
	});
});

// ============================================================================
// distributeRemainderToOwners tests
// ============================================================================

describe("distributeRemainderToOwners", () => {
	it("returns unchanged when sum is already 100", () => {
		const allocations = { personA: 50, personB: 50 };
		const ownerships = { personA: 100 };

		const result = distributeRemainderToOwners(allocations, ownerships);

		expect(result).toEqual(allocations);
	});

	it("distributes remainder to single owner", () => {
		const allocations = { personC: 30 };
		const ownerships = { personA: 100 };

		const result = distributeRemainderToOwners(allocations, ownerships);

		expect(result.personA).toBe(70);
		expect(result.personC).toBe(30);
		expect(sumAllocations(result)).toBe(100);
	});

	it("distributes remainder proportionally to multiple owners", () => {
		const allocations = { personC: 30 };
		const ownerships = { personA: 60, personB: 40 };

		const result = distributeRemainderToOwners(allocations, ownerships);

		// 70% remainder split 60/40 = 42%/28%
		expect(result.personA).toBeCloseTo(42, 10);
		expect(result.personB).toBeCloseTo(28, 10);
		expect(result.personC).toBe(30);
		expect(sumAllocations(result)).toBeCloseTo(100, 10);
	});

	// Property: result sums to 100 when ownership is valid
	it("result sums to 100 (property-based)", () => {
		fc.assert(
			fc.property(allocationsArb, validOwnershipArb, (allocations, ownerships) => {
				// Only test valid input ranges
				if (sumAllocations(allocations) > 100) return;

				const result = distributeRemainderToOwners(allocations, ownerships);
				expect(sumAllocations(result)).toBeCloseTo(100, 8);
			})
		);
	});

	// Property: original allocations are preserved
	it("preserves original allocations (property-based)", () => {
		fc.assert(
			fc.property(allocationsArb, validOwnershipArb, (allocations, ownerships) => {
				if (sumAllocations(allocations) > 100) return;

				const result = distributeRemainderToOwners(allocations, ownerships);

				for (const [personId, pct] of Object.entries(allocations)) {
					// Original allocation should be <= result (may have ownership added)
					expect(result[personId]).toBeGreaterThanOrEqual(pct - 0.0001);
				}
			})
		);
	});
});

// ============================================================================
// normalizeAllocations tests
// ============================================================================

describe("normalizeAllocations", () => {
	it("returns unchanged for empty allocations", () => {
		expect(normalizeAllocations({})).toEqual({});
	});

	it("returns unchanged when sum is already 100", () => {
		const allocations = { personA: 50, personB: 50 };
		const result = normalizeAllocations(allocations);

		expect(result.personA).toBeCloseTo(50, 10);
		expect(result.personB).toBeCloseTo(50, 10);
	});

	it("scales up when sum is less than 100", () => {
		const allocations = { personA: 25, personB: 25 };
		const result = normalizeAllocations(allocations);

		expect(result.personA).toBeCloseTo(50, 10);
		expect(result.personB).toBeCloseTo(50, 10);
	});

	it("scales down when sum exceeds 100", () => {
		const allocations = { personA: 100, personB: 100 };
		const result = normalizeAllocations(allocations);

		expect(result.personA).toBeCloseTo(50, 10);
		expect(result.personB).toBeCloseTo(50, 10);
	});

	// Property: normalized allocations sum to 100
	it("result sums to 100 when non-empty (property-based)", () => {
		fc.assert(
			fc.property(
				fc.dictionary(
					fc.constantFrom("a", "b", "c"),
					fc.double({ min: 0.1, max: 100, noNaN: true }),
					{
						minKeys: 1,
						maxKeys: 3,
					}
				),
				(allocations) => {
					const result = normalizeAllocations(allocations);
					expect(sumAllocations(result)).toBeCloseTo(100, 8);
				}
			)
		);
	});

	// Property: proportions are preserved
	it("preserves proportions (property-based)", () => {
		fc.assert(
			fc.property(
				fc.dictionary(fc.constantFrom("a", "b"), fc.double({ min: 1, max: 100, noNaN: true }), {
					minKeys: 2,
					maxKeys: 2,
				}),
				(allocations) => {
					const entries = Object.entries(allocations);
					if (entries.length < 2) return;

					const [k1, v1] = entries[0];
					const [k2, v2] = entries[1];
					const originalRatio = v1 / v2;

					const result = normalizeAllocations(allocations);
					const newRatio = result[k1] / result[k2];

					expect(newRatio).toBeCloseTo(originalRatio, 8);
				}
			)
		);
	});
});

// ============================================================================
// calculateShares tests
// ============================================================================

describe("calculateShares", () => {
	it("returns empty for empty allocations", () => {
		expect(calculateShares(100, {})).toEqual({});
	});

	it("calculates share for single allocation", () => {
		const result = calculateShares(-100, { personA: 50 });
		expect(result.personA).toBe(-50);
	});

	it("calculates shares for multiple allocations", () => {
		const result = calculateShares(-100, { personA: 30, personB: 70 });
		expect(result.personA).toBe(-30);
		expect(result.personB).toBe(-70);
	});

	// Property: sum of shares equals amount when allocations sum to 100
	it("shares sum to amount when allocations sum to 100 (property-based)", () => {
		fc.assert(
			fc.property(amountArb, validOwnershipArb, (amount, allocations) => {
				// Use valid ownership as allocations (they sum to 100)
				const shares = calculateShares(amount, allocations);
				const sharesSum = Object.values(shares).reduce((sum, v) => sum + v, 0);

				expect(sharesSum).toBeCloseTo(amount, 8);
			})
		);
	});

	// Property: each share is proportional to allocation
	it("each share is proportional (property-based)", () => {
		fc.assert(
			fc.property(
				amountArb,
				fc.dictionary(fc.constantFrom("a", "b", "c"), percentageArb, { minKeys: 1, maxKeys: 3 }),
				(amount, allocations) => {
					const shares = calculateShares(amount, allocations);

					for (const [personId, pct] of Object.entries(allocations)) {
						expect(shares[personId]).toBeCloseTo((amount * pct) / 100, 10);
					}
				}
			)
		);
	});
});

// ============================================================================
// validateOwnership tests
// ============================================================================

describe("validateOwnership", () => {
	it("accepts valid 100% single owner", () => {
		const result = validateOwnership({ personA: 100 });
		expect(result.valid).toBe(true);
	});

	it("accepts valid 50/50 split", () => {
		const result = validateOwnership({ personA: 50, personB: 50 });
		expect(result.valid).toBe(true);
	});

	it("rejects when sum exceeds 100", () => {
		const result = validateOwnership({ personA: 60, personB: 60 });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("must sum to 100%");
	});

	it("rejects when sum is less than 100", () => {
		const result = validateOwnership({ personA: 30 });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("must sum to 100%");
	});

	it("rejects negative ownership", () => {
		const result = validateOwnership({ personA: -20, personB: 120 });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("between 0% and 100%");
	});

	it("rejects ownership over 100%", () => {
		const result = validateOwnership({ personA: 150, personB: -50 });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("between 0% and 100%");
	});

	// Property: valid ownership always sums to 100
	it("valid ownership sums to 100 (property-based)", () => {
		fc.assert(
			fc.property(validOwnershipArb, (ownerships) => {
				const result = validateOwnership(ownerships);
				if (result.valid) {
					expect(sumAllocations(ownerships)).toBeCloseTo(100, 8);
				}
			})
		);
	});
});

/**
 * Ownership Validation Tests
 *
 * Unit tests for ownership percentage validation (must sum to 100%).
 * Uses table-driven tests and property-based testing with fast-check.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    addOwner,
    createEqualOwnerships,
    isValidOwnership,
    normalizeOwnerships,
    OWNERSHIP_TOLERANCE,
    OwnershipPercentageSchema,
    removeOwner,
    sumOwnerships,
    updateOwnerPercentage,
    validateOwnershipSet,
    validateOwnerships
} from "@/lib/domain/ownership";

const OWNERSHIP_IMMUTABILITY_SEED = 16_001_605;
const OWNERSHIP_IMMUTABILITY_RUNS = 500;

function expectFrozenOwnershipResultGraph(value: unknown): void {
    if (value == null || typeof value !== "object") return;

    expect(Object.isFrozen(value)).toBe(true);
    for (const key of Reflect.ownKeys(value)) {
        expectFrozenOwnershipResultGraph(Reflect.get(value, key));
    }
}

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Generate a person ID
 */
const personIdArb = fc.uuid();

/**
 * Generate a valid percentage (0-100)
 */
const percentageArb = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true });

/**
 * Generate an ownership map with n owners that sums to exactly 100%
 */
const validOwnershipsArb = (minOwners = 1, maxOwners = 5) =>
    fc.array(personIdArb, { minLength: minOwners, maxLength: maxOwners }).chain((personIds) =>
        fc
            .array(fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }), {
                minLength: personIds.length,
                maxLength: personIds.length
            })
            .map((rawPcts) => {
                // Normalize to sum to 100
                const sum = rawPcts.reduce((a, b) => a + b, 0);
                const normalized = rawPcts.map((p) => (p / sum) * 100);
                const result: Record<string, number> = {};
                personIds.forEach((id, i) => {
                    result[id] = normalized[i];
                });
                return result;
            })
    );

/**
 * Generate an ownership map that may not sum to 100%
 */
const anyOwnershipsArb = fc
    .array(fc.tuple(personIdArb, percentageArb), { minLength: 1, maxLength: 5 })
    .map((entries) => Object.fromEntries(entries));

// ============================================================================
// sumOwnerships tests
// ============================================================================

describe("sumOwnerships", () => {
    it("returns 0 for empty ownerships", () => {
        expect(sumOwnerships({})).toBe(0);
    });

    it("returns the single value for one owner", () => {
        expect(sumOwnerships({ alice: 100 })).toBe(100);
    });

    it("sums multiple ownerships correctly", () => {
        expect(sumOwnerships({ alice: 50, bob: 30, charlie: 20 })).toBe(100);
    });

    it("property: sum equals sum of values", () => {
        fc.assert(
            fc.property(anyOwnershipsArb, (ownerships) => {
                const expected = Object.values(ownerships).reduce((a, b) => a + b, 0);
                expect(sumOwnerships(ownerships)).toBeCloseTo(expected, 10);
            })
        );
    });
});

// ============================================================================
// validateOwnerships tests
// ============================================================================

describe("validateOwnerships", () => {
    describe("table-driven tests", () => {
        const testCases: Array<{
            name: string;
            input: Record<string, number>;
            expectedValid: boolean;
            expectedError?: string;
        }> = [
            {
                name: "empty ownerships are invalid",
                input: {},
                expectedValid: false,
                expectedError: "Account must have at least one owner"
            },
            {
                name: "single owner at 100% is valid",
                input: { alice: 100 },
                expectedValid: true
            },
            {
                name: "two owners at 50% each is valid",
                input: { alice: 50, bob: 50 },
                expectedValid: true
            },
            {
                name: "three owners summing to 100% is valid",
                input: { alice: 33.33, bob: 33.33, charlie: 33.34 },
                expectedValid: true
            },
            {
                name: "ownerships summing to 99% are invalid",
                input: { alice: 50, bob: 49 },
                expectedValid: false,
                expectedError: "Ownerships must sum to 100%"
            },
            {
                name: "ownerships summing to 101% are invalid",
                input: { alice: 51, bob: 50 },
                expectedValid: false,
                expectedError: "Ownerships must sum to 100%"
            },
            {
                name: "negative percentage is invalid",
                input: { alice: -10, bob: 110 },
                expectedValid: false,
                expectedError: "cannot be negative"
            },
            {
                name: "percentage over 100 is invalid",
                input: { alice: 150 },
                expectedValid: false,
                expectedError: "cannot exceed 100%"
            }
        ];

        for (const { name, input, expectedValid, expectedError } of testCases) {
            it(name, () => {
                const result = validateOwnerships(input);
                expect(result.valid).toBe(expectedValid);
                if (expectedError) {
                    expect(result.error).toContain(expectedError);
                }
            });
        }
    });

    it("property: valid ownerships pass validation", () => {
        fc.assert(
            fc.property(validOwnershipsArb(), (ownerships) => {
                const result = validateOwnerships(ownerships);
                expect(result.valid).toBe(true);
                expect(Math.abs(result.sum - 100)).toBeLessThanOrEqual(OWNERSHIP_TOLERANCE);
            })
        );
    });

    it.each([
        ["negative zero", { alice: -0, bob: 100 }, "negative-zero"],
        ["NaN", { alice: Number.NaN }, "not-finite"],
        ["positive infinity", { alice: Number.POSITIVE_INFINITY }, "not-finite"],
        ["negative infinity", { alice: Number.NEGATIVE_INFINITY }, "not-finite"]
    ])("rejects %s instead of allowing a plausible ownership result", (_name, input, reason) => {
        const result = validateOwnershipSet(input);

        expect(result).toEqual({
            ok: false,
            errors: [expect.objectContaining({ domain: "ownership", reason })]
        });
        expect(validateOwnerships(input).valid).toBe(false);
        expect(isValidOwnership(input)).toBe(false);
    });

    it.each([
        ["lower boundary", 0],
        ["decimal", 12.5],
        ["upper boundary", 100]
    ])("accepts ownership %s", (_name, value) => {
        expect(OwnershipPercentageSchema.safeParse(value).success).toBe(true);
    });

    it("returns typed empty, entry and collective-total errors", () => {
        expect(validateOwnershipSet({})).toEqual({
            ok: false,
            errors: [
                {
                    domain: "ownership",
                    reason: "empty",
                    type: "invalid-ownership"
                }
            ]
        });
        expect(validateOwnershipSet({ alice: -1, bob: 101 })).toEqual({
            ok: false,
            errors: [
                expect.objectContaining({ personId: "alice", reason: "out-of-range" }),
                expect.objectContaining({ personId: "bob", reason: "out-of-range" })
            ]
        });
        expect(validateOwnershipSet({ alice: 49, bob: 50 })).toEqual({
            ok: false,
            errors: [
                {
                    domain: "ownership",
                    reason: "invalid-total",
                    total: "99",
                    type: "invalid-ownership"
                }
            ]
        });
    });

    it("accepts collective totals at the established tolerance and freezes a copy", () => {
        const ownerships = { alice: 33.333, bob: 33.333, charlie: 33.333 };
        const before = structuredClone(ownerships);
        const result = validateOwnershipSet(ownerships);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("Expected ownerships within tolerance");
        expect(result.value).toEqual(ownerships);
        expect(Object.isFrozen(result.value)).toBe(true);
        expect(ownerships).toEqual(before);
    });

    it("fixed-seed property rejects every non-finite and negative-zero entry", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0),
                fc.uuid(),
                (invalidValue, personId) => {
                    const result = validateOwnershipSet({
                        alice: 100,
                        [personId]: invalidValue
                    });
                    expect(result.ok).toBe(false);
                }
            ),
            { seed: 16_001_603, numRuns: 250 }
        );
    });

    it("freezes the ownership success envelope and copied value", () => {
        const result = validateOwnershipSet({ alice: 60, bob: 40 });

        expect(result).toEqual({ ok: true, value: { alice: 60, bob: 40 } });
        expectFrozenOwnershipResultGraph(result);
        expect(Reflect.set(result, "ok", false)).toBe(false);
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("Expected valid immutable ownerships");
        expect(Reflect.set(result.value, "alice", 100)).toBe(false);
        expect(result.value).toEqual({ alice: 60, bob: 40 });
    });

    it.each([
        {
            name: "empty ownership",
            input: {},
            reasons: ["empty"]
        },
        {
            name: "individual ownership entries",
            input: { alice: -1, bob: 101 },
            reasons: ["out-of-range", "out-of-range"]
        },
        {
            name: "invalid ownership total",
            input: { alice: 49, bob: 50 },
            reasons: ["invalid-total"]
        }
    ])("freezes every $name failure envelope, array and error", ({ input, reasons }) => {
        const result = validateOwnershipSet(input);

        expect(result.ok).toBe(false);
        expectFrozenOwnershipResultGraph(result);
        expect(Reflect.set(result, "ok", true)).toBe(false);
        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("Expected invalid immutable ownerships");

        const originalLength = result.errors.length;
        expect(Reflect.set(result.errors, originalLength, { reason: "invented" })).toBe(false);
        expect(result.errors).toHaveLength(originalLength);
        expect(result.errors.map(({ reason }) => reason)).toEqual(reasons);
        for (const error of result.errors) {
            const originalReason = error.reason;
            expect(Reflect.set(error, "reason", "not-finite")).toBe(false);
            expect(error.reason).toBe(originalReason);
        }
    });

    it("keeps generated ownership result graphs unchanged after mutation attempts", () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 10_000 }), (split) => {
                const ownerships = {
                    alice: split / 100,
                    bob: (10_000 - split) / 100
                };
                const result = validateOwnershipSet(ownerships);

                expect(result.ok).toBe(true);
                expectFrozenOwnershipResultGraph(result);
                expect(Reflect.set(result, "ok", false)).toBe(false);
                expect(result.ok).toBe(true);
                if (!result.ok) throw new Error("Expected valid generated ownerships");
                const originalAlice = result.value.alice;
                expect(Reflect.set(result.value, "alice", 0)).toBe(false);
                expect(result.value.alice).toBe(originalAlice);
                expect(result.value).toEqual(ownerships);
            }),
            {
                seed: OWNERSHIP_IMMUTABILITY_SEED,
                numRuns: OWNERSHIP_IMMUTABILITY_RUNS
            }
        );
    });
});

// ============================================================================
// isValidOwnership tests
// ============================================================================

describe("isValidOwnership", () => {
    it("returns true for valid ownerships", () => {
        expect(isValidOwnership({ alice: 100 })).toBe(true);
        expect(isValidOwnership({ alice: 60, bob: 40 })).toBe(true);
    });

    it("returns false for invalid ownerships", () => {
        expect(isValidOwnership({})).toBe(false);
        expect(isValidOwnership({ alice: 50 })).toBe(false);
        expect(isValidOwnership({ alice: -10, bob: 110 })).toBe(false);
    });
});

// ============================================================================
// normalizeOwnerships tests
// ============================================================================

describe("normalizeOwnerships", () => {
    it("returns empty object for empty input", () => {
        expect(normalizeOwnerships({})).toEqual({});
    });

    it("returns same values when already summing to 100", () => {
        const input = { alice: 60, bob: 40 };
        const result = normalizeOwnerships(input);
        expect(result.alice).toBeCloseTo(60);
        expect(result.bob).toBeCloseTo(40);
    });

    it("normalizes to 100% when sum is different", () => {
        const result = normalizeOwnerships({ alice: 25, bob: 25 });
        expect(result.alice).toBeCloseTo(50);
        expect(result.bob).toBeCloseTo(50);
        expect(sumOwnerships(result)).toBeCloseTo(100);
    });

    it("property: normalized ownerships always sum to 100%", () => {
        fc.assert(
            fc.property(
                fc
                    .array(
                        fc.tuple(
                            personIdArb,
                            fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
                        ),
                        {
                            minLength: 1,
                            maxLength: 5
                        }
                    )
                    .map((entries) => Object.fromEntries(entries)),
                (ownerships) => {
                    const normalized = normalizeOwnerships(ownerships);
                    expect(sumOwnerships(normalized)).toBeCloseTo(100, 10);
                }
            )
        );
    });

    it("property: preserves relative proportions", () => {
        fc.assert(
            fc.property(validOwnershipsArb(2, 5), (ownerships) => {
                const normalized = normalizeOwnerships(ownerships);
                const ids = Object.keys(ownerships);
                if (ids.length >= 2) {
                    const [id1, id2] = ids;
                    const ratio = ownerships[id1] / ownerships[id2];
                    const normalizedRatio = normalized[id1] / normalized[id2];
                    expect(normalizedRatio).toBeCloseTo(ratio, 10);
                }
            })
        );
    });
});

// ============================================================================
// createEqualOwnerships tests
// ============================================================================

describe("createEqualOwnerships", () => {
    it("returns empty object for empty input", () => {
        expect(createEqualOwnerships([])).toEqual({});
    });

    it("gives 100% to single owner", () => {
        expect(createEqualOwnerships(["alice"])).toEqual({ alice: 100 });
    });

    it("splits 50/50 for two owners", () => {
        const result = createEqualOwnerships(["alice", "bob"]);
        expect(result.alice).toBe(50);
        expect(result.bob).toBe(50);
    });

    it("splits evenly for three owners", () => {
        const result = createEqualOwnerships(["alice", "bob", "charlie"]);
        expect(result.alice).toBeCloseTo(33.333333);
        expect(result.bob).toBeCloseTo(33.333333);
        expect(result.charlie).toBeCloseTo(33.333333);
        expect(sumOwnerships(result)).toBeCloseTo(100);
    });

    it("property: equal ownerships always sum to 100%", () => {
        fc.assert(
            fc.property(fc.array(personIdArb, { minLength: 1, maxLength: 10 }), (personIds) => {
                const result = createEqualOwnerships(personIds);
                expect(sumOwnerships(result)).toBeCloseTo(100, 10);
            })
        );
    });

    it("property: all owners have equal share", () => {
        fc.assert(
            fc.property(fc.array(personIdArb, { minLength: 2, maxLength: 10 }), (personIds) => {
                const result = createEqualOwnerships(personIds);
                const values = Object.values(result);
                const first = values[0];
                for (const v of values) {
                    expect(v).toBeCloseTo(first, 10);
                }
            })
        );
    });
});

// ============================================================================
// addOwner tests
// ============================================================================

describe("addOwner", () => {
    it("adds first owner with specified percentage", () => {
        const result = addOwner({}, "alice", 100);
        expect(result).toEqual({ alice: 100 });
    });

    it("adds owner and scales down existing owners", () => {
        const result = addOwner({ alice: 100 }, "bob", 50);
        expect(result.alice).toBeCloseTo(50);
        expect(result.bob).toBeCloseTo(50);
        expect(sumOwnerships(result)).toBeCloseTo(100);
    });

    it("property: adding owner maintains 100% total", () => {
        fc.assert(
            fc.property(
                validOwnershipsArb(),
                personIdArb,
                fc.float({ min: Math.fround(1), max: Math.fround(99), noNaN: true }),
                (ownerships, newPersonId, percentage) => {
                    // Skip if newPersonId already exists
                    if (newPersonId in ownerships) return;

                    const result = addOwner(ownerships, newPersonId, percentage);
                    expect(sumOwnerships(result)).toBeCloseTo(100, 8);
                }
            )
        );
    });
});

// ============================================================================
// removeOwner tests
// ============================================================================

describe("removeOwner", () => {
    it("returns empty when removing only owner", () => {
        expect(removeOwner({ alice: 100 }, "alice")).toEqual({});
    });

    it("redistributes to remaining owner", () => {
        const result = removeOwner({ alice: 50, bob: 50 }, "alice");
        expect(result).toEqual({ bob: 100 });
    });

    it("redistributes proportionally to remaining owners", () => {
        const result = removeOwner({ alice: 50, bob: 30, charlie: 20 }, "alice");
        expect(result.bob).toBeCloseTo(60); // 30/(30+20) * 100
        expect(result.charlie).toBeCloseTo(40); // 20/(30+20) * 100
        expect(sumOwnerships(result)).toBeCloseTo(100);
    });

    it("property: removing owner maintains 100% total (if owners remain)", () => {
        fc.assert(
            fc.property(validOwnershipsArb(2, 5), (ownerships) => {
                const personId = Object.keys(ownerships)[0];
                const result = removeOwner(ownerships, personId);
                if (Object.keys(result).length > 0) {
                    expect(sumOwnerships(result)).toBeCloseTo(100, 8);
                }
            })
        );
    });
});

// ============================================================================
// updateOwnerPercentage tests
// ============================================================================

describe("updateOwnerPercentage", () => {
    it("single owner always gets 100%", () => {
        expect(updateOwnerPercentage({ alice: 100 }, "alice", 50)).toEqual({ alice: 100 });
    });

    it("updates percentage and scales others", () => {
        const result = updateOwnerPercentage({ alice: 50, bob: 50 }, "alice", 80);
        expect(result.alice).toBeCloseTo(80);
        expect(result.bob).toBeCloseTo(20);
        expect(sumOwnerships(result)).toBeCloseTo(100);
    });

    it("clamps to valid range", () => {
        const result = updateOwnerPercentage({ alice: 50, bob: 50 }, "alice", 150);
        expect(result.alice).toBeCloseTo(100);
        expect(result.bob).toBeCloseTo(0);
    });

    it("property: updating maintains 100% total", () => {
        fc.assert(
            fc.property(
                validOwnershipsArb(2, 5),
                fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
                (ownerships, newPercentage) => {
                    const personId = Object.keys(ownerships)[0];
                    const result = updateOwnerPercentage(ownerships, personId, newPercentage);
                    expect(sumOwnerships(result)).toBeCloseTo(100, 8);
                }
            )
        );
    });
});

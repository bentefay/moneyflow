import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    AllocationPercentageSchema,
    apportionMinorUnits,
    deriveEffectiveAllocations,
    validateAllocationSet,
    validateExactPercentageWeights
} from "@/lib/domain/allocation";

const DERIVATION_SEED = 16_001_601;
const APPORTIONMENT_SEED = 16_001_602;
const PROPERTY_RUNS = 1_000;

function decimalRecord(values: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
    return Object.fromEntries(Object.entries(values));
}

function sumMinorUnits(values: Readonly<Record<string, number>>): number {
    return Object.values(values).reduce((total, value) => total + value, 0);
}

function expectExactWeights(weights: Readonly<Record<string, string>>) {
    const result = validateExactPercentageWeights(weights);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected exact weights totaling 100");
    return result.value;
}

function hundredthsToDecimal(value: number): string {
    const sign = value < 0 ? "-" : "";
    const absolute = Math.abs(value);
    const whole = Math.floor(absolute / 100);
    const fraction = absolute % 100;
    return fraction === 0
        ? `${sign}${whole}`
        : `${sign}${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
}

function expectDerived(
    explicit: Readonly<Record<string, unknown>>,
    ownership: Readonly<Record<string, unknown>>
) {
    const result = deriveEffectiveAllocations(explicit, ownership);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected valid allocation derivation");
    return result.value;
}

const signedApportionmentCases: Array<{
    readonly amount: number;
    readonly name: string;
    readonly shares: Readonly<Record<string, number>>;
    readonly weights: Readonly<Record<string, string>>;
}> = [
    {
        name: "positive one-cent stable tie",
        amount: 1,
        weights: { alice: "50", bob: "50" },
        shares: { alice: 1, bob: 0 }
    },
    {
        name: "negative one-cent mathematical floor and stable tie",
        amount: -1,
        weights: { alice: "50", bob: "50" },
        shares: { alice: 0, bob: -1 }
    },
    {
        name: "positive uneven fractions",
        amount: 5,
        weights: { alice: "33.33", bob: "33.33", charlie: "33.34" },
        shares: { alice: 2, bob: 1, charlie: 2 }
    },
    {
        name: "negative uneven fractions",
        amount: -5,
        weights: { alice: "33.33", bob: "33.33", charlie: "33.34" },
        shares: { alice: -1, bob: -2, charlie: -2 }
    },
    {
        name: "negative effective weight",
        amount: -100,
        weights: { alice: "120", bob: "-20" },
        shares: { alice: -120, bob: 20 }
    },
    {
        name: "zero and zero-decimal-currency amount",
        amount: 0,
        weights: { alice: "60", bob: "40" },
        shares: { alice: 0, bob: 0 }
    }
];

describe("allocation validation", () => {
    it.each([
        ["lower boundary", -100],
        ["negative decimal", -12.5],
        ["canonical zero", 0],
        ["positive decimal", 12.5],
        ["upper boundary", 100]
    ])("accepts %s", (_name, value) => {
        expect(AllocationPercentageSchema.safeParse(value).success).toBe(true);
    });

    it.each([
        ["below lower boundary", -100.000_001, "out-of-range"],
        ["above upper boundary", 100.000_001, "out-of-range"],
        ["negative zero", -0, "negative-zero"],
        ["NaN", Number.NaN, "not-finite"],
        ["positive infinity", Number.POSITIVE_INFINITY, "not-finite"],
        ["negative infinity", Number.NEGATIVE_INFINITY, "not-finite"],
        ["non-number", "50", "not-number"]
    ])("rejects %s with typed data", (_name, value, reason) => {
        const result = validateAllocationSet({ person: value });

        expect(result).toEqual({
            ok: false,
            errors: [
                expect.objectContaining({
                    personId: "person",
                    reason
                })
            ]
        });
    });

    it("validates every entry and preserves below, equal and above-100 explicit sets", () => {
        const cases = [
            { alice: -20, bob: 30.25 },
            { alice: 40, bob: 60 },
            { alice: 100, bob: 75.5 }
        ] as const;

        for (const explicit of cases) {
            const before = structuredClone(explicit);
            const result = validateAllocationSet(explicit);

            expect(result.ok).toBe(true);
            if (!result.ok) throw new Error("Expected a valid explicit set");
            expect(result.value).toEqual(explicit);
            expect(explicit).toEqual(before);
            expect(Object.isFrozen(result.value)).toBe(true);
        }

        const invalid = validateAllocationSet({
            alice: -101,
            bob: Number.POSITIVE_INFINITY,
            charlie: -0
        });
        expect(invalid.ok).toBe(false);
        if (invalid.ok) throw new Error("Expected invalid allocation entries");
        expect(invalid.errors.map(({ personId, reason }) => [personId, reason])).toEqual([
            ["alice", "out-of-range"],
            ["bob", "not-finite"],
            ["charlie", "negative-zero"]
        ]);
    });
});

describe("owner remainder and effective allocation", () => {
    it.each([
        {
            name: "empty explicit map",
            explicit: {},
            ownership: { alice: 100 },
            remainder: "100",
            effective: { alice: "100" }
        },
        {
            name: "positive remainder with multiple owners",
            explicit: { charlie: 30 },
            ownership: { alice: 60, bob: 40 },
            remainder: "70",
            effective: { alice: "42", bob: "28", charlie: "30" }
        },
        {
            name: "zero remainder",
            explicit: { alice: 40, bob: 60 },
            ownership: { alice: 100 },
            remainder: "0",
            effective: { alice: "40", bob: "60" }
        },
        {
            name: "negative remainder",
            explicit: { alice: 80, bob: 80 },
            ownership: { alice: 100 },
            remainder: "-60",
            effective: { alice: "20", bob: "80" }
        },
        {
            name: "negative explicit allocation",
            explicit: { bob: -20 },
            ownership: { alice: 100 },
            remainder: "120",
            effective: { alice: "120", bob: "-20" }
        },
        {
            name: "overlapping explicit and owner IDs",
            explicit: { alice: 10, bob: 30 },
            ownership: { alice: 60, bob: 40 },
            remainder: "60",
            effective: { alice: "46", bob: "54" }
        }
    ])("derives $name without normalizing explicit values", (testCase) => {
        const explicitBefore = structuredClone(testCase.explicit);
        const ownershipBefore = structuredClone(testCase.ownership);
        const derived = expectDerived(testCase.explicit, testCase.ownership);

        expect(derived.ownerRemainder).toBe(testCase.remainder);
        expect(decimalRecord(derived.effectiveAllocations)).toEqual(testCase.effective);
        expect(derived.effectiveTotal).toBe("100");
        expect(explicitBefore).toEqual(testCase.explicit);
        expect(ownershipBefore).toEqual(testCase.ownership);
    });

    it("normalizes only derived ownership weights within tolerance and closes exactly at 100", () => {
        const derived = expectDerived(
            { charlie: 12.345 },
            { alice: 33.333, bob: 33.333, dora: 33.333 }
        );

        expect(derived.ownershipTotal).toBe("99.999");
        expect(derived.ownershipWeightTotal).toBe("100");
        expect(derived.effectiveTotal).toBe("100");
        expect(derived.explicitAllocations).toEqual({ charlie: 12.345 });
    });

    it("is independent of explicit and ownership insertion order", () => {
        const forward = expectDerived(
            { charlie: 35.5, alice: -12.25, bob: 90 },
            { alice: 10, dora: 30, bob: 60 }
        );
        const reverse = expectDerived(
            { bob: 90, alice: -12.25, charlie: 35.5 },
            { bob: 60, dora: 30, alice: 10 }
        );

        expect(decimalRecord(reverse.effectiveAllocations)).toEqual(
            decimalRecord(forward.effectiveAllocations)
        );
        expect(decimalRecord(reverse.ownershipWeights)).toEqual(
            decimalRecord(forward.ownershipWeights)
        );
        expect(reverse.ownerRemainder).toBe(forward.ownerRemainder);
    });

    it("returns allocation and ownership errors without deriving plausible weights", () => {
        const allocationError = deriveEffectiveAllocations({ alice: 101 }, { alice: 100 });
        const ownershipError = deriveEffectiveAllocations({ alice: 50 }, { alice: 50 });

        expect(allocationError).toEqual({
            ok: false,
            errors: [expect.objectContaining({ domain: "allocation", personId: "alice" })]
        });
        expect(ownershipError).toEqual({
            ok: false,
            errors: [expect.objectContaining({ domain: "ownership", reason: "invalid-total" })]
        });
    });

    it("preserves explicit sets and exact totals across fixed-seed generated inputs", () => {
        fc.assert(
            fc.property(
                fc.record({
                    alice: fc.integer({ min: -10_000, max: 10_000 }),
                    bob: fc.integer({ min: -10_000, max: 10_000 }),
                    charlie: fc.integer({ min: -10_000, max: 10_000 }),
                    ownershipSplit: fc.integer({ min: 0, max: 10_000 })
                }),
                ({ alice, bob, charlie, ownershipSplit }) => {
                    const explicit = {
                        alice: alice / 100,
                        bob: bob / 100,
                        charlie: charlie / 100
                    };
                    const ownership = {
                        alice: ownershipSplit / 100,
                        owner: (10_000 - ownershipSplit) / 100
                    };
                    const reversedExplicit = Object.fromEntries(Object.entries(explicit).reverse());
                    const reversedOwnership = Object.fromEntries(
                        Object.entries(ownership).reverse()
                    );
                    const derived = expectDerived(explicit, ownership);
                    const reversed = expectDerived(reversedExplicit, reversedOwnership);
                    const expectedRemainder = hundredthsToDecimal(10_000 - alice - bob - charlie);

                    expect(derived.explicitAllocations).toEqual(explicit);
                    expect(derived.ownerRemainder).toBe(expectedRemainder);
                    expect(derived.effectiveTotal).toBe("100");
                    expect(decimalRecord(reversed.effectiveAllocations)).toEqual(
                        decimalRecord(derived.effectiveAllocations)
                    );
                }
            ),
            { seed: DERIVATION_SEED, numRuns: PROPERTY_RUNS }
        );
    });
});

describe("signed minor-unit apportionment", () => {
    it.each(signedApportionmentCases)("$name", ({ amount, weights, shares }) => {
        const result = apportionMinorUnits(amount, expectExactWeights(weights));

        expect(result).toEqual({ ok: true, value: shares });
        if (!result.ok) throw new Error("Expected valid apportionment");
        expect(sumMinorUnits(result.value)).toBe(amount);
    });

    it("uses ascending person ID rather than insertion order for equal remainders", () => {
        const forward = apportionMinorUnits(
            2,
            expectExactWeights({
                charlie: "33.333333333333333333",
                alice: "33.333333333333333333",
                bob: "33.333333333333333334"
            })
        );
        const reverse = apportionMinorUnits(
            2,
            expectExactWeights({
                bob: "33.333333333333333334",
                alice: "33.333333333333333333",
                charlie: "33.333333333333333333"
            })
        );

        expect(forward).toEqual({ ok: true, value: { alice: 1, bob: 1, charlie: 0 } });
        expect(reverse).toEqual(forward);
    });

    it.each([
        ["non-integer", 1.5],
        ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
        ["NaN", Number.NaN],
        ["infinity", Number.POSITIVE_INFINITY]
    ])("rejects %s minor-unit amount with typed data", (_name, amount) => {
        expect(apportionMinorUnits(amount, expectExactWeights({ alice: "100" }))).toEqual({
            ok: false,
            error: { type: "invalid-amount" }
        });
    });

    it("rejects weights that do not total exactly 100", () => {
        expect(
            validateExactPercentageWeights({
                alice: "40",
                bob: "50"
            })
        ).toEqual({
            ok: false,
            error: { type: "invalid-weight-total", total: "90" }
        });
    });

    it("conserves positive, negative and zero amounts for ownership and effective weights", () => {
        fc.assert(
            fc.property(
                fc.record({
                    amount: fc.integer({ min: -1_000_000, max: 1_000_000 }),
                    alice: fc.integer({ min: -10_000, max: 10_000 }),
                    bob: fc.integer({ min: -10_000, max: 10_000 }),
                    split: fc.integer({ min: 0, max: 10_000 })
                }),
                ({ amount, alice, bob, split }) => {
                    const derived = expectDerived(
                        { alice: alice / 100, bob: bob / 100 },
                        { alice: split / 100, owner: (10_000 - split) / 100 }
                    );
                    const effective = apportionMinorUnits(amount, derived.effectiveAllocations);
                    const ownership = apportionMinorUnits(amount, derived.ownershipWeights);

                    expect(effective.ok).toBe(true);
                    expect(ownership.ok).toBe(true);
                    if (!effective.ok || !ownership.ok) {
                        throw new Error("Expected valid generated apportionment");
                    }
                    expect(sumMinorUnits(effective.value)).toBe(amount);
                    expect(sumMinorUnits(ownership.value)).toBe(amount);
                }
            ),
            { seed: APPORTIONMENT_SEED, numRuns: PROPERTY_RUNS }
        );
    });

    it.runIf(process.env.P16A_BENCHMARK === "1")(
        "benchmarks production derivation and apportionment primitives",
        () => {
            const personIds = Array.from(
                { length: 200 },
                (_, index) => `person-${String(index).padStart(4, "0")}`
            );
            const explicit = Object.fromEntries(
                personIds.map((personId, index) => [personId, (index % 201) / 2 - 50])
            );
            const ownership = Object.fromEntries(personIds.map((personId) => [personId, 0.5]));
            const execute = () => {
                const derived = deriveEffectiveAllocations(explicit, ownership);
                if (!derived.ok) throw new Error("Benchmark derivation failed");
                const apportioned = apportionMinorUnits(
                    -987_654_321,
                    derived.value.effectiveAllocations
                );
                if (!apportioned.ok) throw new Error("Benchmark apportionment failed");
                return sumMinorUnits(apportioned.value);
            };

            for (let index = 0; index < 100; index += 1) execute();
            const samples = Array.from({ length: 5 }, () => {
                const startedAt = performance.now();
                let checksum = 0;
                for (let index = 0; index < 250; index += 1) checksum += execute();
                return {
                    elapsedMs: performance.now() - startedAt,
                    checksum
                };
            });

            expect(samples.every(({ checksum }) => checksum === -246_913_580_250)).toBe(true);
            console.info(
                "P16A benchmark node=%s people=200 warmup=100 samples=5 iterations=250 elapsedMs=%s",
                process.version,
                samples.map(({ elapsedMs }) => elapsedMs.toFixed(2)).join(",")
            );
        }
    );
});

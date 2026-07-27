/**
 * Regression tests for the peer-independent transaction comparator.
 *
 * `compareTransactionOrder` previously subtracted the two `importRowIndex ?? Infinity` values.
 * When neither side had an import row index (every pair of manually-created transactions) that
 * subtraction produced `Infinity - Infinity === NaN`, which is `!== 0`, so the comparator returned
 * NaN and never reached the stable `id` tie-breaker. Sort order then depended on input order and
 * two synced peers could materialize the same rows differently.
 */

import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { compareTransactionOrder } from "@/lib/crdt/queries";

interface OrderKey {
    readonly creationInstant: Temporal.Instant;
    readonly date: Temporal.PlainDate;
    readonly id: string;
    readonly importRowIndex?: number;
}

const DATE = Temporal.PlainDate.from("2026-03-14");
const INSTANT = Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000);

function manual(id: string): OrderKey {
    return { creationInstant: INSTANT, date: DATE, id };
}

const orderKeyArbitrary: fc.Arbitrary<OrderKey> = fc
    .record({
        creationInstantMillis: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        dayOffset: fc.integer({ min: 0, max: 400 }),
        id: fc.uuid(),
        importRowIndex: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined })
    })
    .map(({ creationInstantMillis, dayOffset, id, importRowIndex }) => ({
        creationInstant: Temporal.Instant.fromEpochMilliseconds(creationInstantMillis),
        date: DATE.add({ days: dayOffset }),
        id,
        importRowIndex
    }));

describe("compareTransactionOrder", () => {
    it("falls through to the id tie-breaker for two manual transactions", () => {
        const result = compareTransactionOrder(manual("aaa"), manual("bbb"));

        expect(Number.isNaN(result)).toBe(false);
        expect(result).toBeLessThan(0);
        expect(compareTransactionOrder(manual("bbb"), manual("aaa"))).toBeGreaterThan(0);
        expect(compareTransactionOrder(manual("aaa"), manual("aaa"))).toBe(0);
    });

    it("orders an imported transaction before a manual one on the same date and instant", () => {
        const imported: OrderKey = { ...manual("zzz"), importRowIndex: 7 };

        expect(compareTransactionOrder(imported, manual("aaa"))).toBeLessThan(0);
        expect(compareTransactionOrder(manual("aaa"), imported)).toBeGreaterThan(0);
    });

    it("sorts manual transactions identically regardless of input order", () => {
        const keys = [manual("c"), manual("a"), manual("d"), manual("b")];
        const idsOf = (input: OrderKey[]) =>
            [...input].sort(compareTransactionOrder).map((key) => key.id);

        expect(idsOf(keys)).toEqual(["a", "b", "c", "d"]);
        expect(idsOf([...keys].reverse())).toEqual(["a", "b", "c", "d"]);
    });

    it("property: never returns NaN", () => {
        fc.assert(
            fc.property(orderKeyArbitrary, orderKeyArbitrary, (left, right) => {
                expect(Number.isNaN(compareTransactionOrder(left, right))).toBe(false);
            })
        );
    });

    it("property: is antisymmetric", () => {
        fc.assert(
            fc.property(orderKeyArbitrary, orderKeyArbitrary, (left, right) => {
                expect(Math.sign(compareTransactionOrder(left, right))).toBe(
                    -Math.sign(compareTransactionOrder(right, left))
                );
            })
        );
    });

    it("property: is transitive", () => {
        fc.assert(
            fc.property(
                orderKeyArbitrary,
                orderKeyArbitrary,
                orderKeyArbitrary,
                (first, second, third) => {
                    const sorted = [first, second, third].sort(compareTransactionOrder);
                    expect(compareTransactionOrder(sorted[0], sorted[1])).toBeLessThanOrEqual(0);
                    expect(compareTransactionOrder(sorted[1], sorted[2])).toBeLessThanOrEqual(0);
                    expect(compareTransactionOrder(sorted[0], sorted[2])).toBeLessThanOrEqual(0);
                }
            )
        );
    });

    it("property: sorting is independent of input order", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(orderKeyArbitrary, {
                    minLength: 2,
                    maxLength: 12,
                    selector: (key) => key.id
                }),
                fc.array(fc.integer(), { maxLength: 12 }),
                (keys, shuffleSeeds) => {
                    const shuffled = [...keys].sort(
                        (left, right) =>
                            (shuffleSeeds[keys.indexOf(left)] ?? 0) -
                            (shuffleSeeds[keys.indexOf(right)] ?? 0)
                    );

                    expect([...shuffled].sort(compareTransactionOrder).map((k) => k.id)).toEqual(
                        [...keys].sort(compareTransactionOrder).map((k) => k.id)
                    );
                }
            )
        );
    });
});

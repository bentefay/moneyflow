/**
 * Differential Property Tests for the Transaction Cursor
 *
 * The cursor replaces `filterTransactions(getAllTransactions(store), options)` for the grid, so the
 * bar is observational equivalence rather than plausibility: for random vault states and random
 * filter combinations, the cursor's enumeration, count, slices and membership test must agree with
 * the array pipeline element for element.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { filterTransactions, getAllTransactions } from "@/lib/crdt/queries";
import type { Transaction, TransactionStore } from "@/lib/crdt/schema";
import {
    buildTransactionIndex,
    createTransactionCursor,
    type TransactionFilter
} from "@/lib/crdt/transaction-cursor";

import {
    expectSameTransactions,
    filterArbitrary,
    storeArbitrary,
    toQueryOptions
} from "./transaction-cursor-fixtures";

function expectedRows(store: TransactionStore, filter: TransactionFilter): Transaction[] {
    return filterTransactions(getAllTransactions(store), toQueryOptions(filter));
}

function cursorFor(store: TransactionStore, filter: TransactionFilter) {
    return createTransactionCursor(buildTransactionIndex(store), filter);
}

describe("transaction cursor differential equivalence", () => {
    it("enumerates exactly what the array pipeline produces", () => {
        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                expectSameTransactions([...cursorFor(store, filter)], expectedRows(store, filter));
            }),
            { numRuns: 400 }
        );
    });

    it("reports the same total count", () => {
        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                expect(cursorFor(store, filter).count).toBe(expectedRows(store, filter).length);
            }),
            { numRuns: 400 }
        );
    });

    it("slices the same window as Array.prototype.slice", () => {
        fc.assert(
            fc.property(
                storeArbitrary,
                filterArbitrary,
                fc.integer({ min: 0, max: 30 }),
                fc.integer({ min: 0, max: 30 }),
                (store, filter, offset, limit) => {
                    const expected = expectedRows(store, filter);
                    expectSameTransactions(
                        cursorFor(store, filter).slice(offset, limit),
                        expected.slice(offset, offset + limit)
                    );
                }
            ),
            { numRuns: 500 }
        );
    });

    it("agrees with the array pipeline on membership for every id in the store", () => {
        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                const expected = expectedRows(store, filter);
                const matchingIds = new Set(expected.map((transaction) => transaction.id));
                const cursor = cursorFor(store, filter);

                // Every id physically present, not only the matching ones: a membership test that
                // only ever sees matching ids cannot report a false positive.
                for (const id of allLogicalIds(store)) {
                    expect(cursor.includes(id)).toBe(matchingIds.has(id));
                }
                expect(cursor.includes("id-that-does-not-exist")).toBe(false);
            }),
            { numRuns: 300 }
        );
    });

    it("keeps every window consistent with the full enumeration", () => {
        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                const cursor = cursorFor(store, filter);
                const enumerated = [...cursor];

                // Walking the list one row at a time must reconstruct it, which is what the
                // virtualizer does as the user scrolls.
                const oneAtATime = enumerated.map((_, index) => cursor.slice(index, 1)[0]);
                expectSameTransactions(oneAtATime, enumerated);

                // Past the end is short, never wrapped or padded.
                expect(cursor.slice(cursor.count, 10)).toHaveLength(0);
                expect(cursor.slice(Math.max(0, cursor.count - 3), 10)).toHaveLength(
                    Math.min(3, cursor.count)
                );
            }),
            { numRuns: 300 }
        );
    });
});

/**
 * The differential properties above compare two lists. Two empty lists agree however wrong the
 * cursor is, and a generator that never emits a duplicate physical copy never tests the canonical
 * tie-break. This pins the signal the properties depend on, so a later tweak to the arbitraries
 * cannot quietly turn them into a no-op.
 */
describe("differential fixture signal", () => {
    it("generates non-empty result sets and the hazards the equivalence rests on", () => {
        const observed = {
            samples: 0,
            nonEmptyResults: 0,
            largestResult: 0,
            duplicatePhysicalCopies: 0,
            duplicateCopiesOnOneDate: 0,
            oneDateAcrossAccounts: 0,
            softDeletedRows: 0,
            nestedDuplicates: 0
        };

        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                observed.samples += 1;

                const rows = expectedRows(store, filter);
                if (rows.length > 0) observed.nonEmptyResults += 1;
                observed.largestResult = Math.max(observed.largestResult, rows.length);

                const physical = physicalPlacements(store);
                if (hasRepeat(physical.map(({ id }) => id))) {
                    observed.duplicatePhysicalCopies += 1;
                }
                if (hasRepeat(physical.map(({ id, dateKey }) => `${id}@${dateKey}`))) {
                    observed.duplicateCopiesOnOneDate += 1;
                }
                if (hasMultipleAccountsOnOneDate(physical)) observed.oneDateAcrossAccounts += 1;

                const canonical = getAllTransactions(store);
                if (canonical.some((transaction) => transaction.deletedAt)) {
                    observed.softDeletedRows += 1;
                }
                if (canonical.some((transaction) => transaction.suspectedDuplicates.length > 0)) {
                    observed.nestedDuplicates += 1;
                }
            }),
            { numRuns: 400 }
        );

        // Floors, not targets: generous enough to survive a fast-check version bump, tight enough
        // that losing a hazard entirely goes red.
        expect(observed.samples).toBe(400);
        expect(observed.nonEmptyResults).toBeGreaterThan(200);
        expect(observed.largestResult).toBeGreaterThan(10);
        expect(observed.duplicatePhysicalCopies).toBeGreaterThan(50);
        expect(observed.duplicateCopiesOnOneDate).toBeGreaterThan(20);
        expect(observed.oneDateAcrossAccounts).toBeGreaterThan(50);
        expect(observed.softDeletedRows).toBeGreaterThan(50);
        expect(observed.nestedDuplicates).toBeGreaterThan(50);
    });
});

interface PhysicalPlacement {
    readonly id: string;
    readonly accountId: string;
    readonly dateKey: string;
}

function physicalPlacements(store: TransactionStore): readonly PhysicalPlacement[] {
    const placements: PhysicalPlacement[] = [];
    for (const [accountId, tree] of Object.entries(store)) {
        if (!tree || typeof tree === "string") continue;
        for (const yearBucket of tree.years) {
            for (const monthBucket of yearBucket.months) {
                for (const dayBucket of monthBucket.days) {
                    for (const transaction of dayBucket.transactions) {
                        placements.push({
                            id: transaction.id,
                            accountId,
                            dateKey: `${yearBucket.year}-${monthBucket.month}-${dayBucket.day}`
                        });
                    }
                }
            }
        }
    }
    return placements;
}

function hasRepeat(keys: readonly string[]): boolean {
    return new Set(keys).size < keys.length;
}

function hasMultipleAccountsOnOneDate(placements: readonly PhysicalPlacement[]): boolean {
    const accountsByDate = new Map<string, Set<string>>();
    for (const { dateKey, accountId } of placements) {
        const accounts = accountsByDate.get(dateKey) ?? new Set<string>();
        accounts.add(accountId);
        accountsByDate.set(dateKey, accounts);
    }
    return [...accountsByDate.values()].some((accounts) => accounts.size > 1);
}

function allLogicalIds(store: TransactionStore): readonly string[] {
    const ids: string[] = [];
    for (const tree of Object.values(store)) {
        if (!tree || typeof tree === "string") continue;
        for (const yearBucket of tree.years) {
            for (const monthBucket of yearBucket.months) {
                for (const dayBucket of monthBucket.days) {
                    for (const transaction of dayBucket.transactions) {
                        ids.push(transaction.id);
                    }
                }
            }
        }
    }
    return ids;
}

/**
 * The ported selection algebra, checked against the one it replaces.
 *
 * `table-selection.ts` is the bespoke model this feature exists to remove, and while both are in
 * the tree the cheapest way to know the port did not change behaviour is to run them side by side.
 * Reading two implementations and agreeing they look the same is exactly the check that misses a
 * transposed branch; a differential property test over arbitrary gesture sequences does not.
 *
 * Two differences are deliberate and are handled explicitly rather than papered over:
 *
 * - Reconciliation. The old function is handed the previous and next id lists and diffs them; the
 *   new one is handed a membership predicate and the ids that have just entered. The oracle below
 *   derives the latter from the former, so the two are asked the same question in the two forms.
 * - Cost. The old one is O(matching); the new one is O(exceptions + newly matching). The property
 *   at the end pins that down, because a port that quietly restored the diff would agree on every
 *   value here and still be unusable against a cursor.
 *
 * The second property is the invariant the representation buys its speed with: `selectedRowCount`
 * subtracts a set size from a count rather than counting anything, which is only correct while
 * every exception is itself a matching row. It is checked against a full enumeration.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
    NO_TRANSACTION_ROWS_SELECTED,
    reconcileRowSelection,
    selectedTransactionRowCount,
    selectedTransactionRowIdsWithin,
    setTransactionRowsSelected,
    toggleTransactionRowSelected,
    type TransactionRowSelection,
    transactionSelectionHeaderState
} from "@/components/features/transactions/table-model/row-selection-baseline-feature";
import {
    ALL_MATCHING_ROWS_SELECTED,
    NO_ROWS_SELECTED,
    reconcileToMatchingRows,
    selectedRowIdsWithin,
    selectionHeaderState,
    setRowsSelected,
    type TransactionSelection
} from "@/components/features/transactions/table-selection";

import { id } from "./test-table";

const UNIVERSE_SIZE = 20;
const universe = Array.from({ length: UNIVERSE_SIZE }, (_unused, index) => `tx-${String(index)}`);

/** One gesture, in whichever form each model takes it. */
type Gesture =
    | { readonly kind: "toggle"; readonly index: number }
    | { readonly kind: "set"; readonly indexes: readonly number[]; readonly selected: boolean }
    | { readonly kind: "select-all" }
    | { readonly kind: "clear" }
    | { readonly kind: "match"; readonly indexes: readonly number[] };

const gesture: fc.Arbitrary<Gesture> = fc.oneof(
    fc.record({
        kind: fc.constant<"toggle">("toggle"),
        index: fc.integer({ max: UNIVERSE_SIZE - 1, min: 0 })
    }),
    fc.record({
        kind: fc.constant<"set">("set"),
        indexes: fc.uniqueArray(fc.integer({ max: UNIVERSE_SIZE - 1, min: 0 }), { maxLength: 6 }),
        selected: fc.boolean()
    }),
    fc.record({ kind: fc.constant<"select-all">("select-all") }),
    fc.record({ kind: fc.constant<"clear">("clear") }),
    fc.record({
        kind: fc.constant<"match">("match"),
        indexes: fc.uniqueArray(fc.integer({ max: UNIVERSE_SIZE - 1, min: 0 }), { minLength: 1 })
    })
);

/** Both models advanced by the same gesture sequence, reporting the ids each says are selected. */
function runBothModels(gestures: readonly Gesture[], startSelected: boolean) {
    let matching: readonly string[] = universe;
    let old: TransactionSelection = startSelected ? ALL_MATCHING_ROWS_SELECTED : NO_ROWS_SELECTED;
    let ported: TransactionRowSelection = startSelected
        ? ALL_MATCHING_TRANSACTION_ROWS_SELECTED
        : NO_TRANSACTION_ROWS_SELECTED;

    /**
     * Both models require that a write only ever names a row in the current matching set — it is
     * what makes the count a subtraction rather than a scan, and the product upholds it because a
     * gesture can only reach a row the table is presenting. A generator that ignored it would
     * report a violated invariant that no user can reach, in both models equally.
     */
    const withinMatching = (indexes: readonly number[]): readonly string[] => {
        const matchingSet = new Set(matching);
        return indexes.map((index) => universe[index]).filter((rowId) => matchingSet.has(rowId));
    };

    const divergences: string[] = [];
    const record = (step: number) => {
        const oldIds = selectedRowIdsWithin(old, matching);
        const portedIds = selectedTransactionRowIdsWithin(ported, matching.map(id));
        if (oldIds.join(",") !== portedIds.join(",")) {
            divergences.push(`step ${String(step)}: ${oldIds.join(",")} vs ${portedIds.join(",")}`);
        }
        if (
            selectionHeaderState(old, matching.length) !==
            transactionSelectionHeaderState(ported, matching.length)
        ) {
            divergences.push(`step ${String(step)}: header state`);
        }
        if (oldIds.length !== selectedTransactionRowCount(ported, matching.length)) {
            divergences.push(`step ${String(step)}: count`);
        }
    };

    record(-1);
    gestures.forEach((next, step) => {
        switch (next.kind) {
            case "toggle": {
                const [rowId] = withinMatching([next.index]);
                if (rowId == null) break;
                old = setRowsSelected(old, [rowId], !selectedRowIdsWithin(old, [rowId]).length);
                ported = toggleTransactionRowSelected(ported, id(rowId));
                break;
            }
            case "set": {
                const rowIds = withinMatching(next.indexes);
                old = setRowsSelected(old, rowIds, next.selected);
                ported = setTransactionRowsSelected(ported, rowIds.map(id), next.selected);
                break;
            }
            case "select-all": {
                old = ALL_MATCHING_ROWS_SELECTED;
                ported = ALL_MATCHING_TRANSACTION_ROWS_SELECTED;
                break;
            }
            case "clear": {
                old = NO_ROWS_SELECTED;
                ported = NO_TRANSACTION_ROWS_SELECTED;
                break;
            }
            case "match": {
                const nextMatching = [...next.indexes]
                    .sort((a, b) => a - b)
                    .map((i) => universe[i]);
                const previousMatching = new Set(matching);
                const nextMatchingSet = new Set(nextMatching);
                old = reconcileToMatchingRows(old, matching, nextMatching);
                ported = reconcileRowSelection(ported, {
                    includes: (rowId) => nextMatchingSet.has(rowId),
                    // The one shape difference: what the old function derives by diffing two
                    // lists, the new one is told, because a cursor can tell it and cannot produce
                    // the lists.
                    newlyMatchingRowIds: nextMatching
                        .filter((rowId) => !previousMatching.has(rowId))
                        .map(id)
                });
                matching = nextMatching;
                break;
            }
        }
        record(step);
    });

    return { divergences, matching, ported };
}

describe("the ported algebra against the model it replaces", () => {
    it("selects exactly the same rows after any sequence of gestures", () => {
        fc.assert(
            fc.property(
                fc.array(gesture, { maxLength: 30 }),
                fc.boolean(),
                (gestures, startSelected) => {
                    expect(runBothModels(gestures, startSelected).divergences).toEqual([]);
                }
            ),
            { numRuns: 500 }
        );
    });
});

describe("the invariant the representation buys its speed with", () => {
    it("counts exactly what a full enumeration would", () => {
        fc.assert(
            fc.property(
                fc.array(gesture, { maxLength: 30 }),
                fc.boolean(),
                (gestures, startSelected) => {
                    const { matching, ported } = runBothModels(gestures, startSelected);
                    const enumerated = selectedTransactionRowIdsWithin(ported, matching.map(id));

                    expect(selectedTransactionRowCount(ported, matching.length)).toBe(
                        enumerated.length
                    );
                }
            ),
            { numRuns: 500 }
        );
    });

    it("keeps every exception inside the matching set", () => {
        fc.assert(
            fc.property(
                fc.array(gesture, { maxLength: 30 }),
                fc.boolean(),
                (gestures, startSelected) => {
                    const { matching, ported } = runBothModels(gestures, startSelected);
                    const matchingSet = new Set(matching);

                    // The count is a subtraction against this set's size, so an exception outside
                    // it is a silently wrong number rather than a visible error.
                    for (const exception of ported.exceptions) {
                        expect(matchingSet.has(exception)).toBe(true);
                    }
                }
            ),
            { numRuns: 500 }
        );
    });
});

describe("reconciliation never walks the matching set", () => {
    it("asks about the exceptions and the newly-matching rows, and nothing else", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fc.integer({ max: UNIVERSE_SIZE - 1, min: 0 }), { maxLength: 8 }),
                fc.boolean(),
                (exceptionIndexes, allMatching) => {
                    const exceptions = new Set(
                        exceptionIndexes.map((index) => id(universe[index]))
                    );
                    const selection: TransactionRowSelection = {
                        baseline: allMatching ? "all-matching" : "no-rows",
                        exceptions
                    };
                    const newlyMatching = [id("tx-101"), id("tx-102")];
                    const asked: string[] = [];

                    reconcileRowSelection(selection, {
                        includes: (rowId) => {
                            asked.push(rowId);
                            return true;
                        },
                        newlyMatchingRowIds: newlyMatching
                    });

                    // Under `no-rows` the newly-matching rows are irrelevant — nothing outside the
                    // exceptions was ever selected — so only the exceptions are visited.
                    expect(asked).toHaveLength(
                        allMatching ? exceptions.size + newlyMatching.length : exceptions.size
                    );
                }
            ),
            { numRuns: 200 }
        );
    });
});

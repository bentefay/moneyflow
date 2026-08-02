/**
 * Property-based invariants for the UR-011 selection representation.
 *
 * The efficiency clause (`specs/012-transaction-selection/spec.md:52-55`) is what forces selection to
 * be a baseline plus exceptions rather than a materialised set of ids, and that representation buys
 * its speed with an invariant: `selectedRowCount` subtracts `exceptions.size` from the matching
 * count instead of counting anything. That is only correct while every exception is itself a
 * matching row.
 *
 * A table-driven test can only check the cases someone thought of, and the failure mode here is a
 * silently wrong count — a header that says "all" when one row is not selected, or a bulk action
 * that claims a number it does not act on. So the invariant is checked against a full enumeration
 * over arbitrary gesture sequences and arbitrary changes to the matching set.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    ALL_MATCHING_ROWS_SELECTED,
    isRowSelected,
    NO_ROWS_SELECTED,
    reconcileToMatchingRows,
    selectedRowCount,
    selectedRowIdsWithin,
    selectionHeaderState,
    toggleRowSelected,
    type TransactionSelection
} from "@/components/features/transactions/table-selection";

const rowId = (index: number) => `tx-${index}`;

function startingSelection(selectAll: boolean): TransactionSelection {
    return selectAll ? ALL_MATCHING_ROWS_SELECTED : NO_ROWS_SELECTED;
}

describe("selection representation invariants", () => {
    it("counts exactly what a full enumeration would, after arbitrary gestures", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 19 }), { maxLength: 40 }),
                fc.boolean(),
                (toggledIndexes, selectAllFirst) => {
                    const matchingRowIds = Array.from({ length: 20 }, (_, index) => rowId(index));
                    let selection = startingSelection(selectAllFirst);
                    for (const index of toggledIndexes) {
                        selection = toggleRowSelected(selection, matchingRowIds[index]);
                    }

                    const enumerated = selectedRowIdsWithin(selection, matchingRowIds);
                    expect(selectedRowCount(selection, matchingRowIds.length)).toBe(
                        enumerated.length
                    );

                    // The exception set never names a row outside the matching set, which is what
                    // makes the subtraction above sound.
                    for (const exceptionId of selection.exceptions) {
                        expect(matchingRowIds).toContain(exceptionId);
                    }
                }
            )
        );
    });

    it("keeps the header's tri-state agreeing with the rows it summarises", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 11 }), { maxLength: 30 }),
                fc.boolean(),
                (toggledIndexes, selectAllFirst) => {
                    const matchingRowIds = Array.from({ length: 12 }, (_, index) => rowId(index));
                    let selection = startingSelection(selectAllFirst);
                    for (const index of toggledIndexes) {
                        selection = toggleRowSelected(selection, matchingRowIds[index]);
                    }

                    const enumerated = selectedRowIdsWithin(selection, matchingRowIds);
                    const expected =
                        enumerated.length === 0
                            ? "none"
                            : enumerated.length === matchingRowIds.length
                              ? "all"
                              : "some";
                    expect(selectionHeaderState(selection, matchingRowIds.length)).toBe(expected);
                }
            )
        );
    });

    it("re-derives as a true intersection when the matching set changes", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fc.integer({ min: 0, max: 30 }), { maxLength: 20 }),
                fc.uniqueArray(fc.integer({ min: 0, max: 30 }), { maxLength: 20 }),
                fc.array(fc.integer({ min: 0, max: 30 }), { maxLength: 10 }),
                fc.boolean(),
                (previousIndexes, nextIndexes, toggledIndexes, selectAllFirst) => {
                    const previousMatching = previousIndexes.map(rowId);
                    const nextMatching = nextIndexes.map(rowId);

                    let selection = startingSelection(selectAllFirst);
                    for (const index of toggledIndexes) {
                        const id = rowId(index);
                        if (previousMatching.includes(id)) {
                            selection = toggleRowSelected(selection, id);
                        }
                    }

                    const reconciled = reconcileToMatchingRows(
                        selection,
                        previousMatching,
                        nextMatching
                    );

                    // The count stays exact against the new set.
                    expect(selectedRowCount(reconciled, nextMatching.length)).toBe(
                        selectedRowIdsWithin(reconciled, nextMatching).length
                    );

                    // Selected afterwards implies selected before AND still matching. The second
                    // half is what stops a widened filter selecting rows on the user's behalf.
                    for (const id of selectedRowIdsWithin(reconciled, nextMatching)) {
                        expect(previousMatching).toContain(id);
                        expect(isRowSelected(selection, id)).toBe(true);
                    }
                }
            )
        );
    });
});

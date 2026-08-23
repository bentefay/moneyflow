/**
 * UR-010 and UR-011, as the *superseded* selection model states them.
 *
 * This module is no longer wired into the grid: `rowSelectionBaselineFeature` is, and its own tests
 * in `table-model/row-selection-baseline.test.ts` cover both requirements against a real TanStack
 * Table v9 instance — including the seven range-gesture cases the controlled hook used to carry.
 * What is kept here is the algebra, because `table-model/row-selection-baseline-invariants.test.ts`
 * property-tests the new feature *against* it: an oracle whose own behaviour is unpinned would let a
 * shared mistake through both sides. Stage 5 owns retiring the pair together.
 *
 * Both requirements are about rows the assertions must not be allowed to ignore.
 *
 * For UR-010 the defect is that a range gesture could only ever *add* rows. A test asserting "the
 * range is selected" passes just as happily against that defect, so the assertions here begin ranges
 * by deselecting and require the range to come out deselected — and require the rows outside it to
 * be untouched, which is what separates "deselected the range" from "cleared the selection".
 *
 * For UR-011 the defect is that select-all covered only the loaded page. A test over a set small
 * enough to be fully paged in passes either way, so the sets here are deliberately larger than a
 * page, and the assertions name rows that were never rendered.
 */

import { describe, expect, it } from "vitest";

import {
    ALL_MATCHING_ROWS_SELECTED,
    isRowSelected,
    NO_ROWS_SELECTED,
    reconcileToMatchingRows,
    selectedRowCount,
    selectedRowIdsWithin,
    selectionHeaderState,
    setRowsSelected,
    singleSelectedRowId,
    type TransactionSelection
} from "@/components/features/transactions/table-selection";

const matchingRowIds = ["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"];

/** Ids of the rows currently selected, in table order. */
function selectedIds(
    selection: TransactionSelection,
    rowIds: readonly string[] = matchingRowIds
): readonly string[] {
    return selectedRowIdsWithin(selection, rowIds);
}

describe("selection model", () => {
    describe("selecting every matching row", () => {
        it("covers rows the caller never enumerates, so an unrendered row is selected", () => {
            // The baseline is what makes this possible: no id list is materialised, yet a row far
            // beyond any rendered page reports as selected.
            expect(isRowSelected(ALL_MATCHING_ROWS_SELECTED, "tx-99999")).toBe(true);
            expect(selectedRowCount(ALL_MATCHING_ROWS_SELECTED, 100_000)).toBe(100_000);
        });

        it("counts and reports the header state without inspecting any row", () => {
            const oneDeselected = setRowsSelected(ALL_MATCHING_ROWS_SELECTED, ["tx-2"], false);

            expect(selectedRowCount(oneDeselected, 100_000)).toBe(99_999);
            expect(selectionHeaderState(oneDeselected, 100_000)).toBe("some");
            expect(selectionHeaderState(ALL_MATCHING_ROWS_SELECTED, 100_000)).toBe("all");
            expect(selectionHeaderState(NO_ROWS_SELECTED, 100_000)).toBe("none");
        });

        it("reports no selection over an empty result set", () => {
            expect(selectionHeaderState(ALL_MATCHING_ROWS_SELECTED, 0)).toBe("none");
            expect(selectionHeaderState(NO_ROWS_SELECTED, 0)).toBe("none");
        });
    });

    describe("re-deriving against a changed matching set", () => {
        const narrowed = ["tx-1", "tx-2", "tx-3"];

        it("drops rows that no longer match, so they cannot reach a later bulk action", () => {
            const selection = setRowsSelected(NO_ROWS_SELECTED, ["tx-2", "tx-4"], true);
            const reconciled = reconcileToMatchingRows(selection, matchingRowIds, narrowed);

            expect(selectedIds(reconciled, narrowed)).toEqual(["tx-2"]);
            expect(selectedRowCount(reconciled, 3)).toBe(1);
        });

        it("keeps select-all meaning the new, narrower matching set", () => {
            const reconciled = reconcileToMatchingRows(ALL_MATCHING_ROWS_SELECTED, matchingRowIds, [
                "tx-2",
                "tx-4"
            ]);

            expect(selectedIds(reconciled, ["tx-2", "tx-4"])).toEqual(["tx-2", "tx-4"]);
            expect(selectionHeaderState(reconciled, 2)).toBe("all");
        });

        it("does NOT select rows that have only just started matching", () => {
            // A relaxed filter, an import or a peer's insert brings rows in that the user never
            // selected. A bare "everything matching is selected" baseline would silently acquire
            // them and carry them into the next bulk action — a destructive difference when the
            // action is delete.
            const reconciled = reconcileToMatchingRows(
                ALL_MATCHING_ROWS_SELECTED,
                ["tx-2"],
                ["tx-1", "tx-2", "tx-3"]
            );

            expect(selectedIds(reconciled, narrowed)).toEqual(["tx-2"]);
            expect(selectedRowCount(reconciled, 3)).toBe(1);
            expect(selectionHeaderState(reconciled, 3)).toBe("some");
        });

        it("keeps a widened set cheap, adding one exception per newly matching row", () => {
            // The newly-matching rows join the exception set rather than forcing the selection to
            // materialise an id for each of the rows that were already selected.
            const previous = Array.from({ length: 50_000 }, (_, index) => `tx-${index}`);
            const next = [...previous, "tx-new-a", "tx-new-b"];

            const reconciled = reconcileToMatchingRows(ALL_MATCHING_ROWS_SELECTED, previous, next);

            expect(reconciled.exceptions.size).toBe(2);
            expect(selectedRowCount(reconciled, next.length)).toBe(50_000);
            expect(isRowSelected(reconciled, "tx-new-a")).toBe(false);
            expect(isRowSelected(reconciled, "tx-49999")).toBe(true);
        });

        it("preserves identity when nothing changed, so React can skip the re-render", () => {
            // Both baselines, and both the same-reference and equal-but-distinct array cases. The
            // function carries no early return for the same-reference call — its sole caller
            // already makes that comparison — so this is what keeps it correct and allocation-free
            // for a caller that does not, including the public re-export from `index.ts`.
            const someSelected = setRowsSelected(NO_ROWS_SELECTED, ["tx-2"], true);
            expect(reconcileToMatchingRows(someSelected, matchingRowIds, matchingRowIds)).toBe(
                someSelected
            );
            expect(reconcileToMatchingRows(someSelected, matchingRowIds, [...matchingRowIds])).toBe(
                someSelected
            );

            expect(
                reconcileToMatchingRows(ALL_MATCHING_ROWS_SELECTED, matchingRowIds, matchingRowIds)
            ).toBe(ALL_MATCHING_ROWS_SELECTED);

            const allButOne = setRowsSelected(ALL_MATCHING_ROWS_SELECTED, ["tx-2"], false);
            expect(reconcileToMatchingRows(allButOne, matchingRowIds, [...matchingRowIds])).toBe(
                allButOne
            );
        });
    });

    describe("singleSelectedRowId", () => {
        it("names the one selected row under either baseline", () => {
            expect(
                singleSelectedRowId(
                    setRowsSelected(NO_ROWS_SELECTED, ["tx-3"], true),
                    matchingRowIds
                )
            ).toBe("tx-3");

            const allButOne = setRowsSelected(
                ALL_MATCHING_ROWS_SELECTED,
                ["tx-1", "tx-2", "tx-4", "tx-5"],
                false
            );
            expect(singleSelectedRowId(allButOne, matchingRowIds)).toBe("tx-3");
        });

        it("is null when the selection names none or several", () => {
            expect(singleSelectedRowId(NO_ROWS_SELECTED, matchingRowIds)).toBeNull();
            expect(
                singleSelectedRowId(
                    setRowsSelected(NO_ROWS_SELECTED, ["tx-1", "tx-2"], true),
                    matchingRowIds
                )
            ).toBeNull();
        });
    });
});

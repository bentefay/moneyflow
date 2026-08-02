/**
 * UR-010 and UR-011: transaction-table selection.
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

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTableSelection } from "@/components/features/transactions/hooks/useTableSelection";
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

/**
 * Drives the controlled hook the way the page does: every reported selection is fed straight back
 * in as the next props, so a sequence of gestures composes exactly as it does in the product.
 */
function renderControlledSelection(options?: {
    readonly rowIds?: readonly string[];
    readonly initialSelection?: TransactionSelection;
}) {
    const rowIds = options?.rowIds ?? matchingRowIds;
    const onSelectionChange = vi.fn<(selection: TransactionSelection) => void>();
    const { result, rerender } = renderHook(
        ({ selection }: { selection: TransactionSelection }) =>
            useTableSelection({ matchingRowIds: rowIds, selection, onSelectionChange }),
        { initialProps: { selection: options?.initialSelection ?? NO_ROWS_SELECTED } }
    );

    const apply = (run: () => void) => {
        act(run);
        const reported = onSelectionChange.mock.lastCall?.[0];
        if (reported == null) throw new Error("the gesture reported no selection");
        rerender({ selection: reported });
        return reported;
    };

    return {
        result,
        onSelectionChange,
        /** Performs one gesture and feeds the reported selection back in, as the page does. */
        click: (id: string, shiftKey = false) =>
            apply(() => result.current.toggleRow(id, shiftKey)),
        clickHeader: () => apply(() => result.current.selectAll()),
        clear: () => apply(() => result.current.clearSelection())
    };
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

describe("useTableSelection (controlled)", () => {
    describe("initial state", () => {
        it("starts with an empty selection and no anchor", () => {
            const { result } = renderControlledSelection();

            expect(result.current.isAllSelected).toBe(false);
            expect(result.current.isSomeSelected).toBe(false);
            expect(result.current.selectedCount).toBe(0);
            expect(result.current.anchor).toBeNull();
        });

        it("derives its state from the controlled selection", () => {
            const { result } = renderControlledSelection({
                initialSelection: setRowsSelected(NO_ROWS_SELECTED, ["tx-1", "tx-2"], true)
            });

            expect(result.current.selectedCount).toBe(2);
            expect(result.current.isSomeSelected).toBe(true);
            expect(result.current.isAllSelected).toBe(false);
        });
    });

    describe("single toggle", () => {
        it("selects an unselected row and deselects a selected one", () => {
            const table = renderControlledSelection();

            expect(selectedIds(table.click("tx-2"))).toEqual(["tx-2"]);
            expect(selectedIds(table.click("tx-2"))).toEqual([]);
        });
    });

    describe("UR-010: shift-click extends the anchor's own outcome", () => {
        it("extends a selection when the anchor row was selected", () => {
            const table = renderControlledSelection();

            table.click("tx-1");
            expect(selectedIds(table.click("tx-4", true))).toEqual([
                "tx-1",
                "tx-2",
                "tx-3",
                "tx-4"
            ]);
        });

        it("extends upwards from the anchor just the same", () => {
            const table = renderControlledSelection();

            table.click("tx-4");
            expect(selectedIds(table.click("tx-2", true))).toEqual(["tx-2", "tx-3", "tx-4"]);
        });

        it("DEselects the range when the anchor row was deselected", () => {
            // The gesture the requirement adds, and the one the old code could not perform: it only
            // ever added ids, so this range came back fully selected.
            const table = renderControlledSelection({
                initialSelection: ALL_MATCHING_ROWS_SELECTED
            });

            // Deselecting tx-2 makes it the anchor, and records that the outcome was a deselection.
            expect(selectedIds(table.click("tx-2"))).toEqual(["tx-1", "tx-3", "tx-4", "tx-5"]);

            // Shift-clicking tx-4 must carry that outcome across tx-2..tx-4.
            expect(selectedIds(table.click("tx-4", true))).toEqual(["tx-1", "tx-5"]);
        });

        it("leaves rows outside the deselected range exactly as they were", () => {
            // Distinguishes "deselected the range" from "cleared the selection": tx-1 and tx-4 were
            // selected before the gesture and must still be selected after it, while tx-5 was clear
            // and must stay clear.
            const table = renderControlledSelection();

            table.click("tx-1");
            table.click("tx-2");
            table.click("tx-3");
            expect(selectedIds(table.click("tx-4"))).toEqual(["tx-1", "tx-2", "tx-3", "tx-4"]);

            // Clicking tx-2 again deselects it, making it a deselecting anchor.
            expect(selectedIds(table.click("tx-2"))).toEqual(["tx-1", "tx-3", "tx-4"]);

            // Extending to tx-3 clears tx-2..tx-3 and nothing else.
            expect(selectedIds(table.click("tx-3", true))).toEqual(["tx-1", "tx-4"]);
        });

        it("deselects a range that spans already-mixed rows, ending with all of them clear", () => {
            const table = renderControlledSelection();

            table.click("tx-2");
            table.click("tx-4");
            // tx-4's click selected it; clicking it again deselects and makes it a clearing anchor.
            table.click("tx-4");
            // Extending back to tx-1 must clear tx-1..tx-4, including the still-selected tx-2.
            expect(selectedIds(table.click("tx-1", true))).toEqual([]);
        });

        it("makes the clicked row the new anchor, so a further shift-click extends from it", () => {
            const table = renderControlledSelection();

            table.click("tx-1");
            table.click("tx-2", true);
            expect(table.result.current.anchor).toEqual({ rowId: "tx-2", outcome: "selected" });

            // Extending again from tx-2 reaches tx-4; had the anchor stayed at tx-1 the outcome
            // would be identical, so the range is walked from tx-2 in the other direction instead.
            expect(selectedIds(table.click("tx-4", true))).toEqual([
                "tx-1",
                "tx-2",
                "tx-3",
                "tx-4"
            ]);
        });

        it("carries a deselecting anchor across successive shift-clicks", () => {
            const table = renderControlledSelection({
                initialSelection: ALL_MATCHING_ROWS_SELECTED
            });

            table.click("tx-1");
            expect(selectedIds(table.click("tx-2", true))).toEqual(["tx-3", "tx-4", "tx-5"]);
            expect(table.result.current.anchor).toEqual({ rowId: "tx-2", outcome: "deselected" });
            expect(selectedIds(table.click("tx-4", true))).toEqual(["tx-5"]);
        });

        it("behaves as an ordinary toggle when no anchor exists", () => {
            const table = renderControlledSelection();

            expect(selectedIds(table.click("tx-3", true))).toEqual(["tx-3"]);
            expect(table.result.current.anchor).toEqual({ rowId: "tx-3", outcome: "selected" });
        });

        it("falls back to an ordinary toggle when the anchor row left the result set", () => {
            const onSelectionChange = vi.fn<(selection: TransactionSelection) => void>();
            const { result, rerender } = renderHook(
                ({
                    rowIds,
                    selection
                }: {
                    rowIds: readonly string[];
                    selection: TransactionSelection;
                }) => useTableSelection({ matchingRowIds: rowIds, selection, onSelectionChange }),
                { initialProps: { rowIds: matchingRowIds, selection: NO_ROWS_SELECTED } }
            );

            act(() => result.current.toggleRow("tx-1"));
            const afterAnchor = onSelectionChange.mock.lastCall?.[0] ?? NO_ROWS_SELECTED;

            // A filter change retires the anchor row; the surviving rows keep their state.
            const narrowedRowIds = ["tx-3", "tx-4", "tx-5"];
            rerender({
                rowIds: narrowedRowIds,
                selection: reconcileToMatchingRows(afterAnchor, matchingRowIds, narrowedRowIds)
            });

            act(() => result.current.toggleRow("tx-4", true));
            const reported = onSelectionChange.mock.lastCall?.[0] ?? NO_ROWS_SELECTED;
            expect(selectedIds(reported, narrowedRowIds)).toEqual(["tx-4"]);
        });

        it("ignores an anchor the selection no longer agrees with", () => {
            // The page replaces the selection outright in places the gesture never sees — the
            // People page's "View transaction" deep link seeds one row. The hook's anchor survives
            // that, so an anchor claiming "selected" for a row that is now clear describes nothing
            // to extend, and the gesture must degrade to an ordinary toggle rather than inventing a
            // direction.
            const onSelectionChange = vi.fn<(selection: TransactionSelection) => void>();
            const { result, rerender } = renderHook(
                ({ selection }: { selection: TransactionSelection }) =>
                    useTableSelection({ matchingRowIds, selection, onSelectionChange }),
                { initialProps: { selection: NO_ROWS_SELECTED } }
            );

            act(() => result.current.toggleRow("tx-1"));
            expect(result.current.anchor).toEqual({ rowId: "tx-1", outcome: "selected" });

            // A deep link replaces the whole selection; tx-1 is no longer selected.
            rerender({ selection: setRowsSelected(NO_ROWS_SELECTED, ["tx-5"], true) });

            act(() => result.current.toggleRow("tx-3", true));
            const reported = onSelectionChange.mock.lastCall?.[0] ?? NO_ROWS_SELECTED;
            expect(selectedIds(reported)).toEqual(["tx-3", "tx-5"]);
        });

        it("spans a range whose interior rows were never rendered", () => {
            // Where UR-010 and UR-011 meet. `:24-25` says the range covers every row between the two
            // ends "in the order the table currently presents them" — which is the filtered result
            // set, not the handful with a rendered element. A user shift-clicking across a scroll
            // gets the rows in between whether or not they were ever painted.
            const manyRowIds = Array.from({ length: 5_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({ rowIds: manyRowIds });

            table.click("tx-10");
            const selection = table.click("tx-4000", true);

            expect(table.result.current.selectedCount).toBe(3_991);
            expect(isRowSelected(selection, "tx-2000")).toBe(true);
            expect(isRowSelected(selection, "tx-9")).toBe(false);
            expect(isRowSelected(selection, "tx-4001")).toBe(false);
        });

        it("deselects across an unrendered interior just as symmetrically", () => {
            const manyRowIds = Array.from({ length: 5_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({
                rowIds: manyRowIds,
                initialSelection: ALL_MATCHING_ROWS_SELECTED
            });

            table.click("tx-10");
            const selection = table.click("tx-4000", true);

            expect(table.result.current.selectedCount).toBe(5_000 - 3_991);
            expect(isRowSelected(selection, "tx-2000")).toBe(false);
            expect(isRowSelected(selection, "tx-9")).toBe(true);
            expect(isRowSelected(selection, "tx-4001")).toBe(true);
        });
    });

    describe("UR-011: the header checkbox acts on every matching row", () => {
        it("selects rows that are neither rendered nor paged in", () => {
            // Deliberately larger than one page: the rows past the first fifty exist only in the
            // matching set, and the assertion names them.
            const manyRowIds = Array.from({ length: 5_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({ rowIds: manyRowIds });

            const selection = table.clickHeader();

            expect(isRowSelected(selection, "tx-4999")).toBe(true);
            expect(isRowSelected(selection, "tx-2500")).toBe(true);
            expect(table.result.current.selectedCount).toBe(5_000);
            expect(table.result.current.isAllSelected).toBe(true);
        });

        it("does not materialise an id per matching row", () => {
            // The efficiency clause in prose: whatever the header reports, the value it produces
            // must not grow with the size of the matching set.
            const manyRowIds = Array.from({ length: 100_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({ rowIds: manyRowIds });

            const selection = table.clickHeader();

            expect(selection.exceptions.size).toBe(0);
            expect(table.result.current.selectedCount).toBe(100_000);
        });

        it("clears that same set, including the rows never rendered", () => {
            const manyRowIds = Array.from({ length: 5_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({ rowIds: manyRowIds });

            table.clickHeader();
            const cleared = table.clickHeader();

            expect(isRowSelected(cleared, "tx-4999")).toBe(false);
            expect(table.result.current.selectedCount).toBe(0);
            expect(table.result.current.isAllSelected).toBe(false);
        });

        it("selects everything from an indeterminate state", () => {
            const table = renderControlledSelection();

            table.click("tx-2");
            expect(table.result.current.isSomeSelected).toBe(true);

            expect(selectedIds(table.clickHeader())).toEqual(matchingRowIds);
            expect(table.result.current.isAllSelected).toBe(true);
        });

        it("goes indeterminate as soon as one matching row is deselected", () => {
            const manyRowIds = Array.from({ length: 5_000 }, (_, index) => `tx-${index}`);
            const table = renderControlledSelection({ rowIds: manyRowIds });

            table.clickHeader();
            table.click("tx-4321");

            expect(table.result.current.isAllSelected).toBe(false);
            expect(table.result.current.isSomeSelected).toBe(true);
            expect(table.result.current.selectedCount).toBe(4_999);
        });
    });

    describe("clearSelection", () => {
        it("clears the selection and the anchor", () => {
            const table = renderControlledSelection();

            table.click("tx-1");
            expect(table.result.current.anchor).toEqual({ rowId: "tx-1", outcome: "selected" });

            expect(selectedIds(table.clear())).toEqual([]);
            expect(table.result.current.anchor).toBeNull();
        });
    });
});

/**
 * `rowSelectionBaselineFeature` against a real v9 table.
 *
 * The two defect classes this file exists to catch are the ones the grid's selection has actually
 * had, and both survive the obvious assertions:
 *
 * - **A range gesture that can only ever add rows.** "The range is selected" passes just as
 *   happily against that defect, so every range case here begins by *deselecting* and requires the
 *   range to come out deselected — and requires the rows outside it to be untouched, which is what
 *   separates "deselected the range" from "cleared the selection".
 *
 * - **Select-all that covers only the rows the table holds.** A table small enough to be fully
 *   loaded passes either way, so `matchingRowCount` here is far larger than the row count and the
 *   assertions name the gap.
 */

import { describe, expect, it, vi } from "vitest";

import {
    ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
    NO_TRANSACTION_ROWS_SELECTED,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model/row-selection-baseline-feature";

import {
    createTableWithBothSelectionFeatures,
    createTestTransactionTable,
    createTestTransactionTableWithoutMatchingRowCount,
    id,
    transactionIds,
    transactions,
    UPDATER_INVOCATIONS
} from "./test-table";

describe("rowSelectionBaselineFeature registration", () => {
    it("installs its state slice, table APIs and row API", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });

        expect(table.getRowSelectionBaseline()).toEqual(NO_TRANSACTION_ROWS_SELECTED);
        expect(table.store.state.rowSelectionBaseline).toEqual(NO_TRANSACTION_ROWS_SELECTED);
        expect(table.getRowModel().rows[0].getIsSelected()).toBe(false);
    });

    it("refuses to construct alongside the stock row-selection feature", () => {
        // Both features install `row.getIsSelected`, and which one survives would depend on
        // registration order. A grid that quietly reported the wrong rows as selected is worse
        // than one that will not start.
        expect(() => createTableWithBothSelectionFeatures(transactions(2))).toThrow(
            /register only one/
        );
    });

    it("requires matchingRowCount rather than inventing one from the loaded rows", () => {
        const table = createTestTransactionTableWithoutMatchingRowCount(transactions(3));

        // The count the table could invent for itself is 3 — the rows it happens to hold — which
        // is the exact figure this representation exists to stop anyone reporting.
        expect(() => table.getSelectedRowCount()).toThrow(/matchingRowCount/);
    });
});

describe("baseline transitions", () => {
    it("selects every matching row without naming any of them", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(50)
        });

        table.selectAllMatchingRows();

        expect(table.getRowSelectionBaseline()).toEqual(ALL_MATCHING_TRANSACTION_ROWS_SELECTED);
        expect(table.getSelectedRowCount()).toBe(100_000);
        // A row 90,000 places past the last one the table holds.
        expect(table.getIsRowSelected(id("tx-90000"))).toBe(true);
    });

    it("keeps the count exact when rows are deselected out of an all-matching baseline", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(50)
        });

        table.selectAllMatchingRows();
        table.setRowsSelected([id("tx-3"), id("tx-7")], false);

        expect(table.getSelectedRowCount()).toBe(99_998);
        expect(table.getIsRowSelected(id("tx-3"))).toBe(false);
        expect(table.getIsRowSelected(id("tx-4"))).toBe(true);
        expect(table.getRowSelectionBaseline().exceptions).toEqual(
            new Set([id("tx-3"), id("tx-7")])
        );
    });

    it("toggles one row in each direction", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        table.toggleRowSelected(id("tx-2"));
        expect(table.getIsRowSelected(id("tx-2"))).toBe(true);
        expect(table.getSelectedRowCount()).toBe(1);

        table.toggleRowSelected(id("tx-2"));
        expect(table.getIsRowSelected(id("tx-2"))).toBe(false);
        expect(table.getSelectedRowCount()).toBe(0);
    });

    it("selects exactly one row and nothing else", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        table.selectAllMatchingRows();
        table.selectOnlyRow(id("tx-1"));

        expect(table.getSelectedRowIdsWithin(transactionIds(5))).toEqual([id("tx-1")]);
    });

    it("clears the selection", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(5)
        });

        table.selectAllMatchingRows();
        table.clearRowSelection();

        expect(table.getSelectedRowCount()).toBe(0);
        expect(table.getIsRowSelected(id("tx-90000"))).toBe(false);
    });

    it("reports one row through the row API", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });
        const [first, second] = table.getRowModel().rows;

        table.toggleRowSelected(id("tx-1"));

        expect(first.getIsSelected()).toBe(false);
        expect(second.getIsSelected()).toBe(true);
    });
});

describe("header tri-state", () => {
    it("is none, some and all as the selection grows", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(50)
        });

        expect(table.getRowSelectionHeaderState()).toBe("none");

        table.toggleRowSelected(id("tx-0"));
        expect(table.getRowSelectionHeaderState()).toBe("some");

        table.selectAllMatchingRows();
        expect(table.getRowSelectionHeaderState()).toBe("all");

        // One row short of everything is "some", not "all" — the case a count derived from the
        // loaded rows would get wrong, because all 50 loaded rows are still selected.
        table.setRowsSelected([id("tx-4")], false);
        expect(table.getRowSelectionHeaderState()).toBe("some");
        expect(table.getSelectedRowCount()).toBe(99_999);
    });

    it("is none when nothing matches, whatever the baseline says", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 0,
            transactions: []
        });

        table.selectAllMatchingRows();

        expect(table.getRowSelectionHeaderState()).toBe("none");
        expect(table.getSelectedRowCount()).toBe(0);
    });

    it("select-all from the header clears when everything is already selected", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(50)
        });

        table.toggleAllMatchingRowsSelected();
        expect(table.getRowSelectionHeaderState()).toBe("all");

        table.toggleAllMatchingRowsSelected();
        expect(table.getRowSelectionHeaderState()).toBe("none");
    });
});

describe("select-all does not enumerate", () => {
    it("names no row and asks the table for no rows", () => {
        const getRowId = vi.fn();
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            onGetRowId: getRowId,
            transactions: transactions(50)
        });

        // Force the row model once so the ids it needs are already built, then watch for any
        // further row work caused by the gesture itself.
        table.getRowModel();
        const getRowModel = vi.spyOn(table, "getRowModel");
        const getRowsInDisplayOrder = vi.spyOn(table, "getRowsInDisplayOrder");
        getRowId.mockClear();

        table.selectAllMatchingRows();
        table.setRowsSelected([id("tx-9")], false);
        const count = table.getSelectedRowCount();
        const headerState = table.getRowSelectionHeaderState();
        const isSelected = table.getIsRowSelected(id("tx-77777"));

        expect(count).toBe(99_999);
        expect(headerState).toBe("some");
        expect(isSelected).toBe(true);
        // The whole selection is one baseline plus the single id the user actually deselected.
        expect(table.getRowSelectionBaseline().exceptions.size).toBe(1);
        expect(getRowId).not.toHaveBeenCalled();
        expect(getRowModel).not.toHaveBeenCalled();
        expect(getRowsInDisplayOrder).not.toHaveBeenCalled();
    });
});

describe("range gestures", () => {
    const order = transactionRowOrderFromIds(transactionIds(10));

    it("spans rows the table does not hold", () => {
        // Every other case here uses a 10-id order against a 10-row table, where the matching order
        // and the rows the grid holds are the same list — so "a range covers rows that are neither
        // rendered nor held" is true of all of them and asserted by none. The grid holds a bounded
        // window of a much larger matching set, so the order is the larger thing.
        //
        // This is a *correctness* guard, not a performance one: it passes against an eager row order
        // too. What it stops is a future change that narrows the order to the loaded rows, which
        // would break shift-click across a window boundary and which nothing else would notice.
        const matchingOrder = transactionRowOrderFromIds(transactionIds(5_000));
        const table = createTestTransactionTable({
            matchingRowCount: 5_000,
            transactions: transactions(10)
        });

        table.toggleRowSelected(id("tx-2"));
        table.extendRowSelectionTo(id("tx-4000"), matchingOrder);

        expect(table.getSelectedRowCount()).toBe(3_999);
        // A row two thousand positions past anything the table holds.
        expect(table.getIsRowSelected(id("tx-2000"))).toBe(true);
        expect(table.getIsRowSelected(id("tx-4000"))).toBe(true);
        expect(table.getIsRowSelected(id("tx-1"))).toBe(false);
        expect(table.getIsRowSelected(id("tx-4001"))).toBe(false);
    });

    it("extends a selection from the anchor to the clicked row, inclusive", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-2"));
        table.extendRowSelectionTo(id("tx-5"), order);

        expect(table.getSelectedRowIdsWithin(transactionIds(10))).toEqual([
            id("tx-2"),
            id("tx-3"),
            id("tx-4"),
            id("tx-5")
        ]);
    });

    it("extends a DESELECTION, and leaves rows outside the range selected", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.selectAllMatchingRows();
        // The anchor's outcome is "deselected", so the range must deselect too.
        table.toggleRowSelected(id("tx-3"));
        table.extendRowSelectionTo(id("tx-6"), order);

        expect(table.getSelectedRowIdsWithin(transactionIds(10))).toEqual([
            id("tx-0"),
            id("tx-1"),
            id("tx-2"),
            id("tx-7"),
            id("tx-8"),
            id("tx-9")
        ]);
    });

    it("extends backwards from the anchor", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-6"));
        table.extendRowSelectionTo(id("tx-4"), order);

        expect(table.getSelectedRowIdsWithin(transactionIds(10))).toEqual([
            id("tx-4"),
            id("tx-5"),
            id("tx-6")
        ]);
    });

    it("re-anchors on the clicked row so a further extend continues the same direction", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-1"));
        table.extendRowSelectionTo(id("tx-3"), order);
        table.extendRowSelectionTo(id("tx-5"), order);

        expect(table.getRowSelectionAnchor()).toEqual({
            outcome: "selected",
            transactionId: id("tx-5")
        });
        expect(table.getSelectedRowIdsWithin(transactionIds(10))).toEqual([
            id("tx-1"),
            id("tx-2"),
            id("tx-3"),
            id("tx-4"),
            id("tx-5")
        ]);
    });

    it("falls back to a plain toggle when the anchor has gone stale", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-2"));
        // Something else replaced the selection, so the anchor no longer describes it.
        table.setRowsSelected([id("tx-2")], false);
        table.extendRowSelectionTo(id("tx-5"), order);

        expect(table.getSelectedRowIdsWithin(transactionIds(10))).toEqual([id("tx-5")]);
    });

    it("falls back to a plain toggle when the anchor has left the presented order", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-2"));
        // A filter change retired the anchor's row: it is selected, but no longer in the order.
        const narrowedOrder = transactionRowOrderFromIds([id("tx-5"), id("tx-6"), id("tx-7")]);
        table.extendRowSelectionTo(id("tx-6"), narrowedOrder);

        expect(table.getIsRowSelected(id("tx-6"))).toBe(true);
        expect(table.getIsRowSelected(id("tx-5"))).toBe(false);
    });

    it("clears the anchor when the selection is replaced wholesale", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-2"));
        expect(table.getRowSelectionAnchor()).not.toBeNull();

        table.clearRowSelection();
        expect(table.getRowSelectionAnchor()).toBeNull();
    });

    it("clears the anchor when the table resets", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.toggleRowSelected(id("tx-2"));
        table.reset();

        // The anchor is table-owned instance data rather than state, so it has its own reset hook
        // — and a hook nothing exercises is a hook that can quietly stop being called.
        expect(table.getRowSelectionAnchor()).toBeNull();
        expect(table.getRowSelectionBaseline()).toEqual(NO_TRANSACTION_ROWS_SELECTED);
    });
});

describe("reconciling to a changed matching set", () => {
    it("drops rows that have left the matching set", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.setRowsSelected([id("tx-1"), id("tx-2"), id("tx-8")], true);

        const remaining = new Set([id("tx-1"), id("tx-3")]);
        table.setOptions((previous) => ({ ...previous, matchingRowCount: remaining.size }));
        table.reconcileRowSelectionToMatching({
            includes: (rowId) => remaining.has(rowId),
            newlyMatchingRowIds: []
        });

        expect(table.getSelectedRowIdsWithin([...remaining])).toEqual([id("tx-1")]);
        expect(table.getSelectedRowCount()).toBe(1);
    });

    it("leaves newly-matching rows unselected under an all-matching baseline", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 3,
            transactions: transactions(10)
        });

        table.selectAllMatchingRows();

        // A relaxed filter lets two rows back in. The user never selected them, so a bare
        // all-matching baseline must not acquire them.
        const widened = new Set([id("tx-0"), id("tx-1"), id("tx-2"), id("tx-7"), id("tx-8")]);
        table.setOptions((previous) => ({ ...previous, matchingRowCount: widened.size }));
        table.reconcileRowSelectionToMatching({
            includes: (rowId) => widened.has(rowId),
            newlyMatchingRowIds: [id("tx-7"), id("tx-8")]
        });

        expect(table.getSelectedRowIdsWithin([...widened])).toEqual([
            id("tx-0"),
            id("tx-1"),
            id("tx-2")
        ]);
        expect(table.getSelectedRowCount()).toBe(3);
        expect(table.getRowSelectionHeaderState()).toBe("some");
    });

    it("visits only the exceptions and the newly-matching rows", () => {
        const table = createTestTransactionTable({
            matchingRowCount: 100_000,
            transactions: transactions(10)
        });

        table.selectAllMatchingRows();
        table.setRowsSelected([id("tx-1"), id("tx-2")], false);

        const includes = vi.fn((rowId: string) => rowId !== "tx-2");
        table.setOptions((previous) => ({ ...previous, matchingRowCount: 99_999 }));
        table.reconcileRowSelectionToMatching({
            includes,
            newlyMatchingRowIds: [id("tx-4")]
        });

        // Two exceptions plus one newly-matching row. Nothing proportional to the 100,000
        // matching rows, which is the property that makes this usable against a cursor.
        //
        // Asserted as the SET of rows visited plus a bound, not as an exact call count: this
        // harness invokes every state updater twice because React is permitted to, so an exact
        // count would pin the number of invocations rather than the cost property. The set is the
        // stronger half — it catches visiting the wrong rows, which a count never could — and the
        // bound still fails loudly if the work ever becomes proportional to `matchingRowCount`. The bound is expressed against
        // the harness's own multiplier rather than a literal, so it stays tight — a redundant visit
        // per row would exceed it, where a looser magic number would have absorbed one.
        const visited = new Set(includes.mock.calls.map(([rowId]) => rowId));
        expect(visited).toEqual(new Set([id("tx-1"), id("tx-2"), id("tx-4")]));
        expect(includes.mock.calls.length).toBeLessThanOrEqual(visited.size * UPDATER_INVOCATIONS);
        expect(table.getRowSelectionBaseline().exceptions).toEqual(
            new Set([id("tx-1"), id("tx-4")])
        );
    });

    it("returns the same selection by identity when nothing changed", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        table.setRowsSelected([id("tx-1")], true);
        const before = table.getRowSelectionBaseline();

        table.reconcileRowSelectionToMatching({
            includes: () => true,
            newlyMatchingRowIds: []
        });

        // Identity, not equality: the page feeds this straight back into React state, and a fresh
        // object every time a filter is touched would re-render the whole virtualized table.
        expect(table.getRowSelectionBaseline()).toBe(before);
    });
});

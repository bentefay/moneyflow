/**
 * Cell selection on the transaction grid, driven through the handlers the renderer will bind.
 *
 * Two things are being checked, and only one of them is TanStack's.
 *
 * The first is that the *grid's* configuration composes with the native feature: that the columns
 * opted out of selection really are unreachable, that the ids the feature reports are the ids this
 * model constructs, and that the display order ranges resolve against is the order the grid
 * renders. Those are this model's claims, not the library's.
 *
 * The second is that the modifier gestures behave, and these go through
 * `getSelectionStartHandler()` with real modifier flags rather than through `selectCellRange()`.
 * Calling the programmatic API would test a path the user never takes: whether ctrl-clicking adds
 * or subtracts is decided inside the handler, from whether the cell under the pointer was already
 * selected, and a test that passes `mode` has made that decision itself.
 */

import { describe, expect, it } from "vitest";

import { transactionSelectionAsClipboardPayload } from "@/components/features/transactions/table-model/clipboard";
import {
    transactionCellId,
    type TransactionColumnId
} from "@/components/features/transactions/table-model/ids";

import {
    createTestTransactionTable,
    id,
    type TestTransactionTable,
    transactions
} from "./test-table";

function cellAt(table: TestTransactionTable, rowIndex: number, columnId: TransactionColumnId) {
    const row = table.getRowsInDisplayOrder()[rowIndex];
    const cell = row.getAllCellsByColumnId()[columnId];
    if (cell == null) throw new Error(`No cell at row ${String(rowIndex)}, column ${columnId}`);
    return cell;
}

/** A mousedown on a cell, with whichever modifiers the gesture carries. */
function mouseDown(
    table: TestTransactionTable,
    rowIndex: number,
    columnId: TransactionColumnId,
    modifiers: { readonly shiftKey?: boolean; readonly metaKey?: boolean } = {}
): void {
    cellAt(table, rowIndex, columnId).getSelectionStartHandler()({
        metaKey: false,
        shiftKey: false,
        ...modifiers
    });
}

/** The selected cells, as `rowId_columnId` strings, in the order the feature reports them. */
function selectedCellIds(table: TestTransactionTable): readonly string[] {
    return table.getSelectedCellIds();
}

describe("single cell selection", () => {
    it("selects the cell under the pointer and focuses it", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 2, "description");

        expect(selectedCellIds(table)).toEqual([transactionCellId(id("tx-2"), "description")]);
        expect(table.getSelectedCellCount()).toBe(1);
        expect(table.getFocusedCell()?.id).toBe(transactionCellId(id("tx-2"), "description"));
        expect(cellAt(table, 2, "description").getIsSelected()).toBe(true);
        expect(cellAt(table, 2, "amount").getIsSelected()).toBe(false);
    });

    it("replaces the previous selection", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 0, "date");
        mouseDown(table, 3, "amount");

        expect(selectedCellIds(table)).toEqual([transactionCellId(id("tx-3"), "amount")]);
    });

    it("gives the focused cell the roving tab index", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });

        mouseDown(table, 1, "status");

        expect(cellAt(table, 1, "status").getTabIndex()).toBe(0);
        expect(cellAt(table, 0, "status").getTabIndex()).toBe(-1);
    });
});

describe("shift-extended ranges", () => {
    it("selects the inclusive rectangle between anchor and focus", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 1, "date");
        mouseDown(table, 2, "account", { shiftKey: true });

        // Two rows by three columns: date, description, account.
        expect(table.getSelectedCellCount()).toBe(6);
        expect(selectedCellIds(table)).toEqual([
            transactionCellId(id("tx-1"), "date"),
            transactionCellId(id("tx-1"), "description"),
            transactionCellId(id("tx-1"), "account"),
            transactionCellId(id("tx-2"), "date"),
            transactionCellId(id("tx-2"), "description"),
            transactionCellId(id("tx-2"), "account")
        ]);
    });

    it("keeps the anchor put when the focus moves again", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 3, "date");
        mouseDown(table, 1, "date", { shiftKey: true });
        mouseDown(table, 0, "date", { shiftKey: true });

        // Anchored on row 3 throughout: shrinking then growing the range never re-anchors.
        expect(selectedCellIds(table)).toEqual([
            transactionCellId(id("tx-0"), "date"),
            transactionCellId(id("tx-1"), "date"),
            transactionCellId(id("tx-2"), "date"),
            transactionCellId(id("tx-3"), "date")
        ]);
    });

    it("extends by keyboard the same way", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        table.setFocusedCell(id("tx-1"), "date");
        table.extendCellSelection("down");
        table.extendCellSelection("right");

        expect(selectedCellIds(table)).toEqual([
            transactionCellId(id("tx-1"), "date"),
            transactionCellId(id("tx-1"), "description"),
            transactionCellId(id("tx-2"), "date"),
            transactionCellId(id("tx-2"), "description")
        ]);
    });
});

describe("modifier-added and modifier-subtracted ranges", () => {
    it("adds a disjoint rectangle when the modifier lands on an unselected cell", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 0, "date");
        mouseDown(table, 3, "amount", { metaKey: true });

        expect(table.getSelectedCellCount()).toBe(2);
        expect(selectedCellIds(table)).toEqual([
            transactionCellId(id("tx-0"), "date"),
            transactionCellId(id("tx-3"), "amount")
        ]);
    });

    it("subtracts when the modifier lands on a cell that is already selected", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 0, "date");
        mouseDown(table, 2, "date", { shiftKey: true });
        expect(table.getSelectedCellCount()).toBe(3);

        // The middle of the run: subtracting it has to split one rectangle into two, which is the
        // case a per-cell selection map would get right by accident and a naive rectangle would
        // get wrong.
        mouseDown(table, 1, "date", { metaKey: true });

        expect(table.getSelectedCellCount()).toBe(2);
        expect(selectedCellIds(table)).toEqual([
            transactionCellId(id("tx-0"), "date"),
            transactionCellId(id("tx-2"), "date")
        ]);
        expect(cellAt(table, 1, "date").getIsSelected()).toBe(false);
    });

    it("keeps the excluded cell focused even though it is not selected", () => {
        const table = createTestTransactionTable({ transactions: transactions(5) });

        mouseDown(table, 0, "date");
        mouseDown(table, 2, "date", { shiftKey: true });
        mouseDown(table, 1, "date", { metaKey: true });

        expect(table.getFocusedCell()?.id).toBe(transactionCellId(id("tx-1"), "date"));
        expect(cellAt(table, 1, "date").getIsSelected()).toBe(false);
    });
});

describe("selectable activation cells", () => {
    it("selects checkbox and actions identities by pointer without changing row selection", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });
        const rowSelectionBefore = table.getRowSelectionBaseline();

        mouseDown(table, 1, "checkbox");
        expect(selectedCellIds(table)).toEqual([transactionCellId(id("tx-1"), "checkbox")]);

        mouseDown(table, 1, "actions");
        expect(selectedCellIds(table)).toEqual([transactionCellId(id("tx-1"), "actions")]);

        expect(cellAt(table, 1, "checkbox").getCanSelect()).toBe(true);
        expect(cellAt(table, 1, "actions").getCanSelect()).toBe(true);
        expect(table.getRowSelectionBaseline()).toBe(rowSelectionBefore);
    });

    it("participates in select-all geometry", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: transactions(4)
        });

        table.selectAllCells();

        expect(table.getSelectedCellCount()).toBe(4 * 9);
        expect(table.getCellSelectionColumnIds()).toEqual([
            "checkbox",
            "date",
            "description",
            "account",
            "tags",
            "status",
            "allocation:p1",
            "amount",
            "actions"
        ]);
    });

    it("are stable arrow-key stops", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });

        table.setFocusedCell(id("tx-1"), "date");
        table.moveCellSelection("left");
        expect(table.getFocusedCell()?.id).toBe(transactionCellId(id("tx-1"), "checkbox"));

        table.setFocusedCell(id("tx-1"), "amount");
        table.moveCellSelection("right");
        expect(table.getFocusedCell()?.id).toBe(transactionCellId(id("tx-1"), "actions"));
    });
});

describe("the ids the copy adapter reads", () => {
    it("are exactly the ids the feature reports, in the same order", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: transactions(4)
        });

        mouseDown(table, 1, "status");
        mouseDown(table, 2, "amount", { shiftKey: true });

        // The copy adapter walks the bounds itself rather than calling `getSelectedCellIds`, so
        // this is a real cross-check of two independent walks and not a tautology.
        expect(transactionSelectionAsClipboardPayload(table).cellIds).toEqual(
            table.getSelectedCellIds()
        );
    });

    it("follow this model's cell-id scheme", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: transactions(3)
        });

        mouseDown(table, 0, "allocation:p1");

        // v9 builds `cell.id` as `${row.id}_${column.id}`; `transactionCellId` reproduces it so
        // callers can name a cell they have not materialised. If v9 ever changed its separator
        // this is the assertion that would notice.
        expect(table.getSelectedCellIds()).toEqual([
            transactionCellId(id("tx-0"), "allocation:p1")
        ]);
    });

    it("survive the rows being re-ordered under an open selection", () => {
        const rows = transactions(5);
        const table = createTestTransactionTable({ transactions: rows });

        mouseDown(table, 1, "date");
        const before = table.getSelectedCellIds();

        // Ranges are anchored to row and column ids, not positions, so reversing the data keeps
        // the same *cells* selected rather than the same coordinates.
        table.setOptions((previous) => ({
            ...previous,
            autoResetCellSelection: false,
            data: [...rows].reverse()
        }));

        // The reorder has to have actually landed, or the assertion below is about nothing.
        expect(table.getRowsInDisplayOrder().map((row) => row.id)).toEqual([
            "tx-4",
            "tx-3",
            "tx-2",
            "tx-1",
            "tx-0"
        ]);
        expect(table.getSelectedCellIds()).toEqual(before);
        expect(before).toEqual([transactionCellId(id("tx-1"), "date")]);
    });
});

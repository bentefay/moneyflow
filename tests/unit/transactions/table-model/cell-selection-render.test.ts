/**
 * The per-row projection that keeps a drag from repainting the whole grid.
 *
 * The load-bearing assertion is the last one: a selection change far from a row must leave that
 * row's key alone. Everything else here is the complement — the cases that MUST change it — and
 * without them a projection that returned a constant would look perfect.
 */

import { describe, expect, it } from "vitest";

import {
    transactionCellSelectionRowKey,
    transactionSelectedCellMarkersFromRowKey
} from "@/components/features/transactions/table-model/cell-selection-render";

import { createTestTransactionTable, type TestTransactionTable, transactions } from "./test-table";

function selectRows(
    table: TestTransactionTable,
    fromRowId: string,
    toRowId: string,
    columnId = "description"
): void {
    table.selectCellRange({
        anchorColumnId: columnId,
        anchorRowId: fromRowId,
        focusColumnId: columnId,
        focusRowId: toRowId
    });
}

describe("the per-row selection key", () => {
    it("is empty when nothing is selected", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        expect(transactionCellSelectionRowKey(table, 5)).toBe("");
    });

    it("changes when the row's own cells become selected", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });
        const before = transactionCellSelectionRowKey(table, 5);

        selectRows(table, "tx-5", "tx-5");

        expect(transactionCellSelectionRowKey(table, 5)).not.toBe(before);
    });

    it("changes when the row's selected span widens", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        selectRows(table, "tx-5", "tx-5", "date");
        const narrow = transactionCellSelectionRowKey(table, 5);

        table.selectCellRange({
            anchorColumnId: "date",
            anchorRowId: "tx-5",
            focusColumnId: "amount",
            focusRowId: "tx-5"
        });

        expect(transactionCellSelectionRowKey(table, 5)).not.toBe(narrow);
    });

    it("changes when a NEIGHBOUR is selected, because that decides this row's edges", () => {
        const table = createTestTransactionTable({ transactions: transactions(10) });

        selectRows(table, "tx-5", "tx-5");
        const alone = transactionCellSelectionRowKey(table, 5);

        // Row 5 keeps exactly the same cells selected, but it no longer draws a bottom edge. A key
        // that ignored neighbours would leave the outline broken mid-drag.
        selectRows(table, "tx-5", "tx-6");

        expect(transactionCellSelectionRowKey(table, 5)).not.toBe(alone);
    });

    it("does NOT change when a distant row's selection changes", () => {
        const table = createTestTransactionTable({ transactions: transactions(20) });

        selectRows(table, "tx-2", "tx-2");
        const key = transactionCellSelectionRowKey(table, 2);
        expect(key).not.toBe("");

        // A modifier-added region three rows away and beyond. `include` mode matters: a bare
        // `selectCellRange` *replaces*, which would deselect row 2 and legitimately change its key
        // — so the additive form is the only one that isolates "did an unrelated row repaint it".
        table.selectCellRange(
            {
                anchorColumnId: "description",
                anchorRowId: "tx-8",
                focusColumnId: "description",
                focusRowId: "tx-12"
            },
            { mode: "include" }
        );

        // Rows 2 and 8 share no edge, so row 2 must not repaint.
        expect(table.getSelectedCellCount()).toBe(6);
        expect(transactionCellSelectionRowKey(table, 2)).toBe(key);
    });

    it("collapses two selections that would paint the row identically", () => {
        const table = createTestTransactionTable({ transactions: transactions(20) });

        selectRows(table, "tx-4", "tx-5");
        const first = transactionCellSelectionRowKey(table, 15);

        selectRows(table, "tx-9", "tx-10");
        const second = transactionCellSelectionRowKey(table, 15);

        // Row 15 is untouched by either, so both project to the same key and it never re-renders.
        expect(second).toBe(first);
        expect(first).toBe("");
    });
});

describe("selected markers from the row key", () => {
    const columnIds = ["checkbox", "date", "description", "account", "tags", "status"];

    it("projects only the current row's selected spans", () => {
        expect(
            transactionSelectedCellMarkersFromRowKey("-1:0-5|0:0-0|0:2-3|1:0-5", columnIds)
        ).toEqual(new Set(["checkbox", "description", "account"]));
    });

    it("returns no markers when only neighbouring rows affect the outline", () => {
        expect(transactionSelectedCellMarkersFromRowKey("-1:1-4|1:1-4", columnIds)).toEqual(
            new Set()
        );
    });
});

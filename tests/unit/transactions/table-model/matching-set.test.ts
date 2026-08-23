/**
 * What a change in the matching result set does to the two selections.
 *
 * The first case below is the hazard the official guide flags [HIGH], reproduced rather than
 * described: a cell range is two corner ids, so rows arriving *between* those corners join the
 * selection without the user touching anything. It runs against the real feature with no reset, so
 * it fails the day that stops being true — which is the only way the second case, the reset that
 * prevents it, can be shown to earn its place.
 *
 * The third case is the other direction, and it is the one an over-eager fix breaks: paging more of
 * the *same* result set into view must leave the selection alone, or a multi-cell selection cannot
 * survive a scroll.
 */

import { describe, expect, it } from "vitest";

import { transactionSelectionAsClipboardPayload } from "@/components/features/transactions/table-model/clipboard";
import { transactionCellId } from "@/components/features/transactions/table-model/ids";
import { applyTransactionMatchingSetChange } from "@/components/features/transactions/table-model/matching-set";

import { createTestTransactionTable, id, transaction } from "./test-table";

const sparse = [transaction({ id: "tx-0" }), transaction({ id: "tx-3" })];
const dense = [
    transaction({ id: "tx-0" }),
    transaction({ id: "tx-1" }),
    transaction({ id: "tx-2" }),
    transaction({ id: "tx-3" })
];

/** Selects the `description` cells of the first and last rows as one range. */
function selectFirstToLastDescription(table: ReturnType<typeof createTestTransactionTable>): void {
    table.selectCellRange({
        anchorColumnId: "description",
        anchorRowId: "tx-0",
        focusColumnId: "description",
        focusRowId: "tx-3"
    });
}

/**
 * Does what a render does, then lets the table's scheduled work drain.
 *
 * Two measured facts make both halves necessary. `autoResetCellSelection` is scheduled by the core
 * row model's after-update hook, so it is not even queued until something *reads* the row model —
 * which in the product is the render. And it goes through `table._reactivity.schedule(...)`, so it
 * does not land synchronously once queued.
 *
 * Skipping either half is how these tests first passed identically with the reset on and off,
 * which is to say without testing it at all.
 */
async function renderAndFlush(table: ReturnType<typeof createTestTransactionTable>): Promise<void> {
    table.getRowModel();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("the range-widening hazard", () => {
    it("is real: a relaxed filter grows a range onto rows the user never selected", async () => {
        const table = createTestTransactionTable({
            matchingRowCount: sparse.length,
            transactions: sparse
        });

        selectFirstToLastDescription(table);
        expect(table.getSelectedCellCount()).toBe(2);

        // A filter is relaxed and two rows reappear between the corners. No selection API was
        // called, and `autoResetCellSelection` is off, so the range is left to recompute itself.
        table.setOptions((previous) => ({
            ...previous,
            data: dense,
            matchingRowCount: dense.length
        }));
        await renderAndFlush(table);

        expect(table.getSelectedCellCount()).toBe(4);
        expect(table.getSelectedCellIds()).toContain(transactionCellId(id("tx-1"), "description"));
        // And the copy adapter would happily serialise the two rows the user never selected.
        expect(transactionSelectionAsClipboardPayload(table).text.split("\n")).toHaveLength(4);
    });

    it("is prevented by applying the matching-set change", () => {
        const table = createTestTransactionTable({
            matchingRowCount: sparse.length,
            transactions: sparse
        });

        selectFirstToLastDescription(table);
        table.setRowsSelected([id("tx-0"), id("tx-3")], true);

        const nextMatching = new Set(dense.map((row) => row.id));
        table.setOptions((previous) => ({
            ...previous,
            data: dense,
            matchingRowCount: dense.length
        }));
        applyTransactionMatchingSetChange(table, {
            includes: (rowId) => nextMatching.has(rowId),
            newlyMatchingRowIds: [id("tx-1"), id("tx-2")]
        });

        expect(table.getSelectedCellCount()).toBe(0);
        expect(transactionSelectionAsClipboardPayload(table)).toEqual({ cellIds: [], text: "" });
        // Row selection is reconciled rather than dropped: the two rows the user did select are
        // still selected, and the two that just arrived are not.
        expect(table.getSelectedRowIdsWithin([...nextMatching].map(id))).toEqual([
            id("tx-0"),
            id("tx-3")
        ]);
    });
});

describe("paging within one result set", () => {
    it("keeps the cell selection when more of the same rows arrive", async () => {
        // The cursor pages rows in as the user scrolls, changing `data` by reference every time.
        // Measured: with the stock `autoResetCellSelection`, this selection is emptied once the
        // scheduled reset drains — so scrolling would wipe a selection the user is still building.
        // That is what TRANSACTION_CELL_SELECTION_OPTIONS turns off.
        const firstPage = dense.slice(0, 2);
        const table = createTestTransactionTable({
            matchingRowCount: dense.length,
            transactions: firstPage
        });

        table.selectCellRange({
            anchorColumnId: "description",
            anchorRowId: "tx-0",
            focusColumnId: "description",
            focusRowId: "tx-1"
        });
        expect(table.getSelectedCellCount()).toBe(2);

        table.setOptions((previous) => ({ ...previous, data: dense }));
        await renderAndFlush(table);

        expect(table.getSelectedCellCount()).toBe(2);
        expect(table.getSelectedCellIds()).toEqual([
            transactionCellId(id("tx-0"), "description"),
            transactionCellId(id("tx-1"), "description")
        ]);
    });

    it("keeps the row selection when more of the same rows arrive", () => {
        const table = createTestTransactionTable({
            matchingRowCount: dense.length,
            transactions: dense.slice(0, 2)
        });

        table.selectAllMatchingRows();
        table.setOptions((previous) => ({ ...previous, data: dense }));

        expect(table.getSelectedRowCount()).toBe(4);
        expect(table.getRowSelectionHeaderState()).toBe("all");
    });
});

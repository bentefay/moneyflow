/**
 * The cell-id scheme.
 *
 * v9 packs a cell's id as `${rowId}_${columnId}`, and its own cell-selection state deliberately
 * avoids that packed form because a user-supplied `getRowId` may return ids containing any
 * separator. MoneyFlow's transaction ids are UUIDs and `import-<ms>-<n>` strings today, so none of
 * them do — but "today" is not a guarantee, and these cases pin what happens when one does.
 */

import { describe, expect, it } from "vitest";

import * as transactionTableModel from "@/components/features/transactions/table-model";
import {
    allocationColumnId,
    asTransactionId,
    isAllocationColumnId,
    personIdOfAllocationColumn,
    resolveTransactionCellId,
    type TransactionColumnId,
    transactionCellId,
    transactionColumnIds
} from "@/components/features/transactions/table-model";
import {
    asTransactionProjectionGeneration,
    nextTransactionProjectionGeneration
} from "@/components/features/transactions/table-model/ids";

import { createTestTransactionTable, transaction } from "./test-table";

const columnIds = transactionColumnIds([{ label: "Ada", personId: "p1" }]);

describe("transaction projection generations", () => {
    it("keeps raw constructors and generic projection factories off the public barrel", () => {
        expect("asTransactionProjectionGeneration" in transactionTableModel).toBe(false);
        expect("nextTransactionProjectionGeneration" in transactionTableModel).toBe(false);
        expect("createTransactionProjectionSnapshot" in transactionTableModel).toBe(false);
        expect("transactionProjectionFromCursor" in transactionTableModel).toBe(true);
    });

    it("advance monotonically without accepting positional numbers implicitly", () => {
        const generation = asTransactionProjectionGeneration(12);

        expect(nextTransactionProjectionGeneration(generation)).toBe(13);
        expect(() => asTransactionProjectionGeneration(-1)).toThrow(
            "transaction projection generation must be a non-negative safe integer"
        );
    });
});

describe("allocation column ids", () => {
    it("round-trip a person id", () => {
        const columnId = allocationColumnId("person-42");

        expect(isAllocationColumnId(columnId)).toBe(true);
        expect(personIdOfAllocationColumn(columnId)).toBe("person-42");
    });

    it("are distinguishable from the fixed columns", () => {
        expect(isAllocationColumnId("amount")).toBe(false);
    });
});

describe("resolving a cell id", () => {
    it("recovers the row and column of an ordinary id", () => {
        const cellId = transactionCellId(asTransactionId("2f0c-aa"), "amount");

        expect(resolveTransactionCellId(cellId, columnIds)).toEqual({
            ok: true,
            value: { columnId: "amount", transactionId: "2f0c-aa" }
        });
    });

    it("recovers a row id that itself contains the separator", () => {
        // The case a naive `split("_")` gets wrong, and a `lastIndexOf("_")` gets right only by
        // accident. Resolution is by suffix match against the columns the grid presents.
        const cellId = transactionCellId(asTransactionId("legacy_import_7"), "description");

        expect(resolveTransactionCellId(cellId, columnIds)).toEqual({
            ok: true,
            value: { columnId: "description", transactionId: "legacy_import_7" }
        });
    });

    it("recovers a row id ending in a column's own name", () => {
        const cellId = transactionCellId(asTransactionId("row_date"), "date");

        expect(resolveTransactionCellId(cellId, columnIds)).toEqual({
            ok: true,
            value: { columnId: "date", transactionId: "row_date" }
        });
    });

    it("recovers an allocation cell", () => {
        const cellId = transactionCellId(asTransactionId("tx-1"), "allocation:p1");

        expect(resolveTransactionCellId(cellId, columnIds)).toEqual({
            ok: true,
            value: { columnId: "allocation:p1", transactionId: "tx-1" }
        });
    });

    it("reports an id whose column the grid does not present", () => {
        const cellId = transactionCellId(asTransactionId("tx-1"), "allocation:someone-else");

        expect(resolveTransactionCellId(cellId, columnIds)).toEqual({
            error: { kind: "unknown-column" },
            ok: false
        });
    });

    it("reports ambiguity rather than picking a candidate", () => {
        // No column the grid defines can trigger this — none contains an underscore — so this is a
        // guard against a future column id like `net_amount`, which would make every `*_amount`
        // cell id resolvable two ways.
        const ambiguous: readonly TransactionColumnId[] = [
            ...columnIds,
            "allocation:x_amount" as TransactionColumnId
        ];
        const cellId = transactionCellId(asTransactionId("tx-1"), "allocation:x_amount");

        const result = resolveTransactionCellId(cellId, ambiguous);
        expect(result.ok).toBe(false);
        expect(result.ok ? null : result.error.kind).toBe("ambiguous");
    });
});

describe("the scheme against the table", () => {
    it("is the id v9 actually gives each cell", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: [transaction({ id: "tx-0" }), transaction({ id: "under_score" })]
        });

        for (const row of table.getRowsInDisplayOrder()) {
            for (const cell of Object.values(row.getAllCellsByColumnId())) {
                expect(cell.id).toBe(
                    transactionCellId(
                        asTransactionId(row.id),
                        // The column ids of this table are exactly the ones the model names.
                        cell.column.id as TransactionColumnId
                    )
                );
            }
        }
    });

    it("resolves every cell of a table back to its own row and column", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: [transaction({ id: "under_score_date" })]
        });
        const presentedColumnIds = transactionColumnIds([{ label: "Ada", personId: "p1" }]);

        for (const cell of Object.values(
            table.getRowsInDisplayOrder()[0].getAllCellsByColumnId()
        )) {
            const resolved = resolveTransactionCellId(
                transactionCellId(
                    asTransactionId(cell.row.id),
                    cell.column.id as TransactionColumnId
                ),
                presentedColumnIds
            );

            expect(resolved.ok, `cell ${cell.id}`).toBe(true);
            expect(resolved.ok ? resolved.value.transactionId : null).toBe("under_score_date");
            expect(resolved.ok ? resolved.value.columnId : null).toBe(cell.column.id);
        }
    });
});

/**
 * Copying a cell selection.
 *
 * The grid has no copy affordance today, so there is no prior output to match and nothing here is
 * a regression test. What these assertions defend is that the copied text says the same thing the
 * cells say, and that it survives the trip through a spreadsheet — the two ways a clipboard
 * serialiser goes quietly wrong.
 */

import { describe, expect, it } from "vitest";

import { transactionSelectionAsClipboardPayload } from "@/components/features/transactions/table-model/clipboard";
import { transactionCellId } from "@/components/features/transactions/table-model/ids";

import {
    createTestTransactionTable,
    id,
    type TestTransactionTable,
    transaction,
    transactions
} from "./test-table";

/** Selects the rectangle between two cells the way a shift-click would. */
function selectRectangle(
    table: TestTransactionTable,
    anchor: { readonly rowId: string; readonly columnId: string },
    focus: { readonly rowId: string; readonly columnId: string }
): void {
    table.selectCellRange({
        anchorColumnId: anchor.columnId,
        anchorRowId: anchor.rowId,
        focusColumnId: focus.columnId,
        focusRowId: focus.rowId
    });
}

describe("copying nothing", () => {
    it("produces no text and names no cells", () => {
        const table = createTestTransactionTable({ transactions: transactions(3) });

        expect(transactionSelectionAsClipboardPayload(table)).toEqual({ cellIds: [], text: "" });
    });
});

describe("what a copied cell says", () => {
    it("copies a date as its stored ISO value, not the abbreviation the cell paints", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ date: "2026-01-15", id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "date", rowId: "tx-0" },
            {
                columnId: "date",
                rowId: "tx-0"
            }
        );

        // The cell renders `15/1` or `1/15` depending on the reader's locale. Neither survives a
        // paste into a spreadsheet set to the other one; the ISO form survives both.
        expect(transactionSelectionAsClipboardPayload(table).text).toBe("2026-01-15");
    });

    it("copies an amount at its own currency's precision", () => {
        const table = createTestTransactionTable({
            transactions: [
                transaction({ amount: -123456, currency: "USD", id: "tx-0" }),
                transaction({ amount: 98765, currency: "JPY", id: "tx-1" })
            ]
        });

        selectRectangle(
            table,
            { columnId: "amount", rowId: "tx-0" },
            {
                columnId: "amount",
                rowId: "tx-1"
            }
        );

        // Two decimals for dollars, none for yen — the same digits the cell shows, without the
        // symbol a spreadsheet would have to parse back off.
        expect(transactionSelectionAsClipboardPayload(table).text).toBe("-1234.56\n98765");
    });

    it("copies tags as their names and an allocation as a bare number", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: [
                transaction({
                    allocations: { p1: 40 },
                    id: "tx-0",
                    tags: [
                        { id: "t1", name: "Groceries" },
                        { id: "t2", name: "Shared" }
                    ]
                })
            ]
        });

        selectRectangle(
            table,
            { columnId: "tags", rowId: "tx-0" },
            {
                columnId: "allocation:p1",
                rowId: "tx-0"
            }
        );

        expect(transactionSelectionAsClipboardPayload(table).text).toBe(
            "Groceries, Shared\tCleared\t40"
        );
    });

    it("copies an absent value as an empty field rather than a placeholder", () => {
        const table = createTestTransactionTable({
            allocationColumns: [{ label: "Ada", personId: "p1" }],
            transactions: [transaction({ account: undefined, allocations: {}, id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "account", rowId: "tx-0" },
            {
                columnId: "account",
                rowId: "tx-0"
            }
        );
        expect(transactionSelectionAsClipboardPayload(table).text).toBe("");

        selectRectangle(
            table,
            { columnId: "allocation:p1", rowId: "tx-0" },
            {
                columnId: "allocation:p1",
                rowId: "tx-0"
            }
        );
        // An unstored allocation renders as an em dash in the cell. An em dash in a spreadsheet is
        // a string, so it would poison a column of numbers.
        expect(transactionSelectionAsClipboardPayload(table).text).toBe("");
    });
});

describe("surviving the paste", () => {
    it("quotes a value containing a tab, so it stays one field", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ description: "Rent\tJune", id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "description", rowId: "tx-0" },
            {
                columnId: "account",
                rowId: "tx-0"
            }
        );

        // Unquoted, this would paste as three columns instead of two.
        expect(transactionSelectionAsClipboardPayload(table).text).toBe('"Rent\tJune"\tEveryday');
    });

    it("quotes a value containing a newline, so it stays one row", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ description: "Line one\nLine two", id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "description", rowId: "tx-0" },
            {
                columnId: "description",
                rowId: "tx-0"
            }
        );

        expect(transactionSelectionAsClipboardPayload(table).text).toBe('"Line one\nLine two"');
    });

    it("doubles a quote inside a quoted value", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ description: 'The "Good" Cafe\tx', id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "description", rowId: "tx-0" },
            {
                columnId: "description",
                rowId: "tx-0"
            }
        );

        expect(transactionSelectionAsClipboardPayload(table).text).toBe('"The ""Good"" Cafe\tx"');
    });

    it("leaves an ordinary value unquoted", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ description: "Coffee", id: "tx-0" })]
        });

        selectRectangle(
            table,
            { columnId: "description", rowId: "tx-0" },
            {
                columnId: "description",
                rowId: "tx-0"
            }
        );

        expect(transactionSelectionAsClipboardPayload(table).text).toBe("Coffee");
    });
});

describe("shape of a multi-cell copy", () => {
    it("is row-major, tab-separated, one line per row", () => {
        const table = createTestTransactionTable({
            transactions: [
                transaction({ date: "2026-01-01", description: "One", id: "tx-0" }),
                transaction({ date: "2026-01-02", description: "Two", id: "tx-1" })
            ]
        });

        selectRectangle(
            table,
            { columnId: "date", rowId: "tx-0" },
            {
                columnId: "description",
                rowId: "tx-1"
            }
        );

        expect(transactionSelectionAsClipboardPayload(table).text).toBe(
            "2026-01-01\tOne\n2026-01-02\tTwo"
        );
    });

    it("separates disjoint regions with a blank line", () => {
        const table = createTestTransactionTable({
            transactions: [
                transaction({ description: "One", id: "tx-0" }),
                transaction({ description: "Two", id: "tx-1" }),
                transaction({ description: "Three", id: "tx-2" })
            ]
        });

        selectRectangle(
            table,
            { columnId: "description", rowId: "tx-0" },
            {
                columnId: "description",
                rowId: "tx-2"
            }
        );
        // Subtracting the middle row splits one rectangle into two positive regions. Pasted as a
        // single block they would read as adjacent rows, which they are not.
        table.selectCellRange(
            {
                anchorColumnId: "description",
                anchorRowId: "tx-1",
                focusColumnId: "description",
                focusRowId: "tx-1"
            },
            { mode: "exclude" }
        );

        expect(table.getCellSelectionBounds()).toHaveLength(2);
        expect(transactionSelectionAsClipboardPayload(table).text).toBe("One\n\nThree");
    });

    it("keeps non-copyable activation coordinates as empty rectangle fields", () => {
        const table = createTestTransactionTable({
            transactions: [
                transaction({ description: "One", id: "tx-0" }),
                transaction({ description: "Two", id: "tx-1" })
            ]
        });

        selectRectangle(
            table,
            { columnId: "checkbox", rowId: "tx-0" },
            {
                columnId: "actions",
                rowId: "tx-1"
            }
        );
        const payload = transactionSelectionAsClipboardPayload(table);

        for (const transactionId of ["tx-0", "tx-1"]) {
            expect(payload.cellIds).not.toContain(transactionCellId(id(transactionId), "checkbox"));
            expect(payload.cellIds).not.toContain(transactionCellId(id(transactionId), "actions"));
        }
        expect(payload.text).toBe(
            "\t2026-03-04\tOne\tEveryday\t\tCleared\t-12.50\t\n" +
                "\t2026-03-04\tTwo\tEveryday\t\tCleared\t-12.50\t"
        );
        expect(payload.text.split("\n").map((line) => line.split("\t").length)).toEqual([8, 8]);
    });
});

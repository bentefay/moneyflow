/**
 * The v9 column definitions, checked against the grid they replace.
 *
 * The assertions that matter here are the ones tied to the *existing* implementation rather than
 * to this one. Both models are in the tree at once, and a port that quietly renumbered the columns
 * or dropped a track would still look internally consistent — so the sizing contract is pinned
 * against `buildTransactionGridTemplate`, the function the grid renders from today, and the column
 * ids against the `data-cell` markers the row markup, the presence protocol and the E2E suite all
 * address cells by.
 */

import { describe, expect, it } from "vitest";

import { buildTransactionGridTemplate } from "@/components/features/transactions/allocation-columns";
import {
    buildTransactionTableColumns,
    type TransactionAllocationColumn,
    transactionColumnIds,
    transactionGridTemplateColumns
} from "@/components/features/transactions/table-model/columns";
import {
    ACTIONS_COLUMN_CELL_MARKERS,
    NOTES_CELL_MARKER
} from "@/components/features/transactions/table-model/ids";

import { createTestTransactionTable, transaction, transactions } from "./test-table";

const people: readonly TransactionAllocationColumn[] = [
    { label: "Ada", personId: "p1" },
    { label: "Grace", personId: "p2" },
    { label: "Unknown person p9", personId: "p9" }
];

describe("column identity and order", () => {
    it("renders the columns the header renders, in the header's order", () => {
        const table = createTestTransactionTable({
            allocationColumns: people.slice(0, 2),
            transactions: transactions(1)
        });

        expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual([
            "checkbox",
            "date",
            "description",
            "account",
            "tags",
            "status",
            "allocation:p1",
            "allocation:p2",
            "amount",
            "actions"
        ]);
    });

    it("agrees with the standalone column-id list", () => {
        const table = createTestTransactionTable({
            allocationColumns: people,
            transactions: transactions(1)
        });

        expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(
            transactionColumnIds(people)
        );
    });

    it("carries presentation meta on every column", () => {
        const table = createTestTransactionTable({
            allocationColumns: people,
            transactions: transactions(1)
        });

        for (const column of table.getVisibleLeafColumns()) {
            expect(column.columnDef.meta, `column ${column.id}`).toBeDefined();
        }
    });

    it("names the `data-cell` markers the row markup actually carries", () => {
        const table = createTestTransactionTable({
            allocationColumns: people.slice(0, 1),
            transactions: transactions(1)
        });

        // Transcribed from `TransactionRow.tsx`, not derived from the column ids — the two do not
        // correspond. Asserting `meta.cellMarker === column.id` passed while the actions column
        // claimed a marker of "actions" that appears nowhere in the DOM, because that assertion
        // only ever compared the model to itself.
        expect(
            table.getVisibleLeafColumns().map((column) => column.columnDef.meta?.cellMarker)
        ).toEqual([
            "checkbox",
            "date",
            "description",
            "account",
            "tags",
            "status",
            "allocation:p1",
            "amount",
            // The actions column is an unmarked container around `expand` and `delete`.
            null
        ]);
    });

    it("leaves the actions column's own controls and the notes row out of the column model", () => {
        // These three markers exist in the DOM but belong to no column: `expand` and `delete` are
        // controls inside the actions container, and `notes` is on the expanded second row. A
        // future column claiming one of them would collide with markup that already uses it.
        const markers = new Set(
            buildTransactionTableColumns(people)
                .map((column) => column.meta?.cellMarker)
                .filter((marker) => marker != null)
        );

        for (const orphan of [...ACTIONS_COLUMN_CELL_MARKERS, NOTES_CELL_MARKER]) {
            expect(markers.has(orphan), `marker ${orphan}`).toBe(false);
        }
    });
});

describe("the grid-template-columns contract", () => {
    it.each([0, 1, 2, 5])(
        "matches the existing template with %i allocation columns",
        (allocationCount) => {
            const allocationColumns = Array.from({ length: allocationCount }, (_u, index) => ({
                label: `Person ${String(index)}`,
                personId: `p${String(index)}`
            }));
            const table = createTestTransactionTable({
                allocationColumns,
                transactions: transactions(1)
            });

            expect(transactionGridTemplateColumns(table)).toBe(
                buildTransactionGridTemplate(allocationCount)
            );
        }
    );

    it("emits one track per rendered column", () => {
        const table = createTestTransactionTable({
            allocationColumns: people,
            transactions: transactions(1)
        });

        expect(transactionGridTemplateColumns(table).split(" ")).toHaveLength(
            table.getVisibleLeafColumns().length
        );
    });
});

describe("accessors", () => {
    it("prefers a resolved description alias over the imported description", () => {
        const table = createTestTransactionTable({
            transactions: [
                transaction({ description: "SQ *COFFEE 1123", id: "tx-a" }),
                transaction({
                    description: "SQ *COFFEE 1123",
                    descriptionAliasName: "Coffee",
                    id: "tx-b"
                })
            ]
        });
        const [raw, aliased] = table.getRowsInDisplayOrder();

        expect(raw.getValue("description")).toBe("SQ *COFFEE 1123");
        expect(aliased.getValue("description")).toBe("Coffee");
    });

    it("reads a person's explicitly stored allocation, and nothing when none is stored", () => {
        const table = createTestTransactionTable({
            allocationColumns: people.slice(0, 2),
            transactions: [
                transaction({ allocations: { p1: 40 }, id: "tx-a" }),
                transaction({ allocations: {}, id: "tx-b" })
            ]
        });
        const [stored, unstored] = table.getRowsInDisplayOrder();

        expect(stored.getValue("allocation:p1")).toBe(40);
        // p2 has no explicit allocation on this row even though the column exists.
        expect(stored.getValue("allocation:p2")).toBeUndefined();
        expect(unstored.getValue("allocation:p1")).toBeUndefined();
    });

    it("reads nothing for a person whose stored allocation is malformed", () => {
        const table = createTestTransactionTable({
            allocationColumns: people.slice(0, 1),
            transactions: [
                transaction({ allocations: { p1: "forty" }, id: "tx-a" }),
                transaction({ allocations: { p1: -0 }, id: "tx-b" }),
                transaction({ allocations: { p1: Number.NaN }, id: "tx-c" })
            ]
        });

        for (const row of table.getRowsInDisplayOrder()) {
            expect(row.getValue("allocation:p1"), `row ${row.id}`).toBeUndefined();
        }
    });

    it("still reads the stored percentage when the account carries no ownership data", () => {
        // The effective-allocation derivation fails outright on empty ownership, which is an
        // ordinary state rather than a broken one. The cell shows the stored percentage anyway, so
        // the column has to as well — gating the accessor on that derivation blanked every such
        // row, and this is the case that caught it.
        const table = createTestTransactionTable({
            allocationColumns: people.slice(0, 1),
            transactions: [
                transaction({ accountOwnerships: {}, allocations: { p1: 40 }, id: "tx-a" })
            ]
        });

        expect(table.getRowsInDisplayOrder()[0].getValue("allocation:p1")).toBe(40);
    });
});

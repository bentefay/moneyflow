import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    isClearableTransactionColumn,
    planTransactionCellClear,
    planTransactionRangeClear,
    type TransactionClearableRow
} from "@/components/features/transactions/table-model/cell-clear";
import {
    allocationColumnId,
    asTransactionId,
    FIXED_TRANSACTION_COLUMN_IDS,
    type TransactionColumnId
} from "@/components/features/transactions/table-model/ids";

const ID = asTransactionId("tx-1");

const FILLED: TransactionClearableRow = {
    allocations: { alice: 40, bob: 0 },
    amount: -1250,
    description: "",
    descriptionAliasId: "alias-coffee",
    id: "tx-1",
    tagIds: ["tag-food"]
};

const BLANK: TransactionClearableRow = {
    allocations: {},
    amount: undefined,
    description: "",
    descriptionAliasId: undefined,
    id: "tx-1",
    tagIds: []
};

describe("transaction cell clear", () => {
    it.each<{ column: TransactionColumnId; clearable: boolean }>([
        { clearable: false, column: "checkbox" },
        { clearable: false, column: "date" },
        { clearable: true, column: "description" },
        { clearable: false, column: "account" },
        { clearable: true, column: "tags" },
        { clearable: false, column: "status" },
        { clearable: true, column: allocationColumnId("alice") },
        { clearable: true, column: "amount" },
        { clearable: false, column: "actions" }
    ])("treats $column as clearable: $clearable", ({ column, clearable }) => {
        expect(isClearableTransactionColumn(column)).toBe(clearable);
    });

    it.each<{
        name: string;
        row: TransactionClearableRow;
        column: TransactionColumnId;
        expected: ReturnType<typeof planTransactionCellClear>;
    }>([
        {
            column: "amount",
            expected: { columnId: "amount", kind: "amount", transactionId: ID },
            name: "an amount clears to an absent amount",
            row: FILLED
        },
        {
            column: "amount",
            expected: { columnId: "amount", kind: "amount", transactionId: ID },
            name: "an explicit zero amount is still a value to clear",
            row: { ...FILLED, amount: 0 }
        },
        {
            column: allocationColumnId("alice"),
            expected: {
                columnId: allocationColumnId("alice"),
                kind: "allocation",
                personId: "alice",
                transactionId: ID
            },
            name: "an allocation clears to an absent key",
            row: FILLED
        },
        {
            column: allocationColumnId("bob"),
            expected: {
                columnId: allocationColumnId("bob"),
                kind: "allocation",
                personId: "bob",
                transactionId: ID
            },
            name: "an explicit 0% allocation is an answered value and clears",
            row: FILLED
        },
        {
            column: allocationColumnId("carol"),
            expected: null,
            name: "a blank allocation has nothing to clear",
            row: FILLED
        },
        {
            column: "tags",
            expected: { columnId: "tags", kind: "tags", transactionId: ID },
            name: "tags clear to the empty set",
            row: FILLED
        },
        {
            column: "description",
            expected: {
                aliasId: "alias-coffee",
                blankDescription: false,
                columnId: "description",
                kind: "description",
                transactionId: ID
            },
            name: "a manual aliased description unlinks its alias",
            row: FILLED
        },
        {
            column: "description",
            expected: {
                aliasId: "alias-coffee",
                blankDescription: true,
                columnId: "description",
                kind: "description",
                transactionId: ID
            },
            name: "a manual description with its own text blanks that text as well",
            row: { ...FILLED, description: "typed directly" }
        },
        {
            column: "description",
            expected: {
                aliasId: "alias-coffee",
                blankDescription: false,
                columnId: "description",
                kind: "description",
                transactionId: ID
            },
            name: "an imported description keeps the bank's raw text",
            row: { ...FILLED, description: "COFFEE CO 1234", importId: "import-1" }
        },
        {
            column: "description",
            expected: null,
            name: "an imported row without an alias already shows its raw text",
            row: { ...BLANK, description: "COFFEE CO 1234", importId: "import-1" }
        },
        { column: "date", expected: null, name: "a date is required", row: FILLED },
        { column: "account", expected: null, name: "an account is required", row: FILLED },
        { column: "status", expected: null, name: "a status is required", row: FILLED },
        { column: "checkbox", expected: null, name: "a checkbox holds no value", row: FILLED },
        { column: "actions", expected: null, name: "actions hold no value", row: FILLED }
    ])("$name", ({ row, column, expected }) => {
        expect(planTransactionCellClear(row, ID, column)).toEqual(expected);
    });

    it("plans a rectangle row-major and skips required and blank cells", () => {
        const rows: readonly TransactionClearableRow[] = [
            { ...FILLED, id: "tx-1" },
            { ...BLANK, id: "tx-2", tagIds: ["tag-food"] }
        ];
        const columns: readonly TransactionColumnId[] = ["description", "account", "tags"];

        expect(
            planTransactionRangeClear(rows, columns).map(
                (clear) => `${clear.transactionId}:${clear.columnId}`
            )
        ).toEqual(["tx-1:description", "tx-1:tags", "tx-2:tags"]);
    });

    const columnArbitrary = fc.constantFrom<TransactionColumnId>(
        ...FIXED_TRANSACTION_COLUMN_IDS,
        allocationColumnId("alice"),
        allocationColumnId("bob")
    );
    const rowArbitrary: fc.Arbitrary<TransactionClearableRow> = fc.record({
        allocations: fc.dictionary(fc.constantFrom("alice", "bob"), fc.integer()),
        amount: fc.option(fc.integer(), { nil: undefined }),
        description: fc.string(),
        descriptionAliasId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        id: fc.uuid(),
        importId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        tagIds: fc.array(fc.string())
    });

    it("never plans more than one clear per clearable cell, and only for those cells", () => {
        fc.assert(
            fc.property(fc.array(rowArbitrary), fc.array(columnArbitrary), (rows, columns) => {
                const planned = planTransactionRangeClear(rows, columns);
                const clearableCount = columns.filter(isClearableTransactionColumn).length;
                expect(planned.length).toBeLessThanOrEqual(rows.length * clearableCount);
                for (const clear of planned) {
                    expect(isClearableTransactionColumn(clear.columnId)).toBe(true);
                }
            })
        );
    });

    it("plans nothing for a row that is already blank", () => {
        fc.assert(
            fc.property(fc.array(columnArbitrary), (columns) => {
                expect(planTransactionRangeClear([BLANK], columns)).toEqual([]);
            })
        );
    });
});

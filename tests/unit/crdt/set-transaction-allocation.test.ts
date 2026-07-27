/**
 * Regression tests for the single-key allocation write path.
 *
 * `setTransactionAllocation` validated its input through `prepareAllocationReplacement` but then
 * wrote `input.value as number` — the RAW, unvalidated caller value — into the draft, leaving the
 * validated result in `prepared.value` unused. The cast masked the mismatch. The write now takes
 * the validated value.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { setTransactionAllocation } from "@/lib/crdt/allocations";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2024-01-15");

const LOCATION: TransactionLocation = {
    accountId: "acc-1",
    date: DATE,
    transactionId: "tx-1"
};

function populatedStore(): TransactionStore {
    // TransactionStore declares both a required `$cid: string` and a tree-only index signature,
    // so an empty literal cannot satisfy it structurally. Matches transaction-mutations.test.ts.
    const store = {} as TransactionStore;
    const transaction: Omit<TransactionInput, "suspectedDuplicates"> = {
        id: "tx-1",
        date: DATE,
        description: "Test transaction",
        notes: "",
        amount: asMinorUnits(1000),
        originalAmount: undefined,
        accountId: "acc-1",
        tagIds: [],
        statusId: "status-for-review",
        importId: "",
        allocations: {},
        creationInstant: Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000),
        importRowIndex: 0,
        descriptionAliasId: undefined,
        deletedAt: undefined
    };
    insertTransaction(store, { transaction });
    return store;
}

function storedAllocations(store: TransactionStore): Record<string, unknown> {
    const tree = store["acc-1"];
    if (!tree || typeof tree === "string") throw new Error("missing account tree");
    const transaction = tree.years[0].months[0].days[0].transactions[0];
    return Object.fromEntries(
        Object.entries(transaction.allocations).filter(([key]) => key !== "$cid")
    );
}

describe("setTransactionAllocation", () => {
    it("writes a valid percentage", () => {
        const store = populatedStore();

        const result = setTransactionAllocation(store, {
            location: LOCATION,
            personId: "alice",
            value: 42.5
        });

        expect(result).toMatchObject({ ok: true });
        expect(storedAllocations(store)).toEqual({ alice: 42.5 });
    });

    it.each([
        ["above range", 100.000_001],
        ["below range", -100.000_001],
        ["NaN", Number.NaN],
        ["Infinity", Number.POSITIVE_INFINITY],
        ["negative zero", -0],
        ["a string", "50"],
        ["null", null]
    ])("regression: does not write %s into the draft", (_label, value) => {
        const store = populatedStore();

        const result = setTransactionAllocation(store, {
            location: LOCATION,
            personId: "alice",
            value
        });

        expect(result.ok).toBe(false);
        expect(storedAllocations(store)).toEqual({});
    });

    it("regression: an invalid value does not overwrite an existing valid allocation", () => {
        const store = populatedStore();
        setTransactionAllocation(store, { location: LOCATION, personId: "alice", value: 30 });

        const result = setTransactionAllocation(store, {
            location: LOCATION,
            personId: "alice",
            value: 250
        });

        expect(result.ok).toBe(false);
        expect(storedAllocations(store)).toEqual({ alice: 30 });
    });

    it("removes the key when the value is zero", () => {
        const store = populatedStore();
        setTransactionAllocation(store, { location: LOCATION, personId: "alice", value: 30 });

        const result = setTransactionAllocation(store, {
            location: LOCATION,
            personId: "alice",
            value: 0
        });

        expect(result).toMatchObject({ ok: true, value: { changed: true } });
        expect(storedAllocations(store)).toEqual({});
    });
});

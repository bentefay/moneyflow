import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createVaultMirror } from "@/lib/crdt/mirror";
import * as transactionMutations from "@/lib/crdt/mutations";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation,
    updateTransaction
} from "@/lib/crdt/mutations";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-25");
const LOCATION: TransactionLocation = {
    accountId: "account-1",
    date: DATE,
    transactionId: "transaction-1"
};

function transaction(
    allocations: Record<string, number> = {}
): Omit<TransactionInput, "suspectedDuplicates"> {
    return {
        id: LOCATION.transactionId,
        date: DATE,
        description: "Allocation boundary",
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-1234),
        originalAmount: undefined,
        accountId: LOCATION.accountId,
        tagIds: [],
        statusId: "status-1",
        importId: undefined,
        allocations,
        creationInstant: Temporal.Instant.from("2026-07-25T00:00:00Z"),
        importRowIndex: undefined,
        deletedAt: undefined
    };
}

function populatedStore(allocations: Record<string, number>): TransactionStore {
    const store = {} as TransactionStore;
    insertTransaction(store, { transaction: transaction(allocations) });
    return store;
}

describe("allocation mutation boundary RED", () => {
    it("exposes typed one-key and complete-set operations", () => {
        expect(Reflect.get(transactionMutations, "setTransactionAllocation")).toBeTypeOf(
            "function"
        );
        expect(Reflect.get(transactionMutations, "replaceTransactionAllocations")).toBeTypeOf(
            "function"
        );
    });

    it("does not let the generic transaction updater replace allocations", () => {
        const store = populatedStore({ alice: 40, bob: 60 });

        updateTransaction(store, {
            location: LOCATION,
            updates: {
                allocations: { mallory: 101 }
            }
        } as unknown as Parameters<typeof updateTransaction>[1]);

        expect(findTransactionInStore(store, LOCATION)?.allocations).toEqual({
            alice: 40,
            bob: 60
        });
    });

    it("rejects invalid allocations before inserting any transaction structure", () => {
        const store = {} as TransactionStore;

        const result = insertTransaction(store, {
            transaction: transaction({ alice: 25, bob: Number.NaN })
        });

        expect(result).toMatchObject({ ok: false });
        expect(store).toEqual({});
    });

    it("provides stable per-person presence field identities", () => {
        const presenceField = Reflect.get(transactionMutations, "allocationPresenceField");

        expect(presenceField).toBeTypeOf("function");
        expect((presenceField as (personId: string) => string)("person:alice")).toBe(
            "allocation:person:alice"
        );
    });

    it("retains an invalid legacy value across ordinary mirror hydration", () => {
        const source = createVaultMirror();
        source.mirror.setState((state) => {
            insertTransaction(state.transactions, {
                transaction: transaction({ alice: 150, bob: 25 })
            });
        });
        const snapshot = source.doc.export({ mode: "snapshot" });
        source.mirror.dispose();

        const hydrated = createVaultMirror({
            doc: (() => {
                const { doc } = createVaultMirror();
                doc.import(snapshot);
                return doc;
            })()
        });

        expect(
            findTransactionInStore(hydrated.mirror.getState().transactions, LOCATION)?.allocations
        ).toMatchObject({ alice: 150, bob: 25 });
        hydrated.mirror.dispose();
    });
});

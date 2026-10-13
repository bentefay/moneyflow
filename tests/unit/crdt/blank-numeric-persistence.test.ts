/**
 * Blank and explicit zero survive a Loro snapshot round trip as different values.
 *
 * Schema defaults are a trap here: an optional number field with a default could decode an absent
 * key as 0, erasing the difference this feature exists to keep. These tests reload from a snapshot
 * so the decoded state, not the draft, is what is asserted.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { setTransactionAllocation } from "@/lib/crdt/allocations";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation,
    updateTransaction
} from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

const DATE = Temporal.PlainDate.from("2026-10-13");
const LOCATION: TransactionLocation = { accountId: "account", date: DATE, transactionId: "tx" };

function seededMirror(importId: string | undefined) {
    const created = createVaultMirror();
    created.mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: {
                id: "tx",
                date: DATE,
                description: "Coffee",
                descriptionAliasId: undefined,
                notes: "",
                amount: asMinorUnits(-450),
                originalAmount: undefined,
                accountId: "account",
                tagIds: [],
                statusId: "status",
                importId,
                allocations: { alice: asPercentage(25), bob: asPercentage(75) },
                creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                importRowIndex: 0,
                deletedAt: undefined
            }
        });
    });
    return created;
}

function reloaded(doc: ReturnType<typeof createVaultMirror>["doc"]) {
    const { mirror } = createVaultMirrorFromSnapshot(doc.export({ mode: "snapshot" }));
    const transaction = findTransactionInStore(mirror.getState().transactions, LOCATION);
    if (transaction == null) throw new Error("transaction missing after reload");
    return transaction;
}

function storedAllocations(allocations: Readonly<Record<string, unknown>>) {
    return Object.fromEntries(Object.entries(allocations).filter(([key]) => key !== "$cid"));
}

describe("blank numeric values after reload", () => {
    it("keeps a cleared amount blank rather than decoding it as zero", () => {
        const { doc, mirror } = seededMirror(undefined);
        mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: LOCATION,
                updates: { amount: undefined }
            });
        });

        const transaction = reloaded(doc);
        expect(transaction.amount).toBeUndefined();
    });

    it("keeps an explicit zero amount as zero", () => {
        const { doc, mirror } = seededMirror(undefined);
        mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: LOCATION,
                updates: { amount: asMinorUnits(0) }
            });
        });

        expect(reloaded(doc).amount).toBe(0);
    });

    it("records imported provenance when an imported amount is cleared", () => {
        const { doc, mirror } = seededMirror("import-1");
        mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: LOCATION,
                updates: { amount: undefined }
            });
        });

        const transaction = reloaded(doc);
        expect(transaction.amount).toBeUndefined();
        expect(transaction.originalAmount).toBe(-450);
    });

    it("keeps a blank allocation apart from an explicit zero allocation", () => {
        const { doc, mirror } = seededMirror(undefined);
        mirror.setState((state: VaultState) => {
            setTransactionAllocation(state.transactions, {
                location: LOCATION,
                personId: "alice",
                value: null
            });
            setTransactionAllocation(state.transactions, {
                location: LOCATION,
                personId: "bob",
                value: 0
            });
        });

        expect(storedAllocations(reloaded(doc).allocations)).toEqual({ bob: 0 });
    });
});

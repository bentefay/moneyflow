/**
 * Transaction Operations Integration Tests
 *
 * Tests for transaction operations that span multiple mutations
 * and verify bucket management behavior.
 */

import { LoroDoc } from "loro-crdt";
import { Mirror } from "loro-mirror";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { deleteTransaction, insertTransaction, moveTransaction } from "@/lib/crdt/mutations";
import { getAccountTransactions, getAllTransactions, hasDayBucket } from "@/lib/crdt/queries";
import type { TransactionInput, TransactionStore, VaultInput } from "@/lib/crdt/schema";
import { vaultSchema } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

// Helper to create a minimal transaction input
function createTransaction(
    overrides: Partial<TransactionInput> = {}
): Omit<TransactionInput, "suspectedDuplicates"> {
    return {
        id: `tx-${Math.random().toString(36).slice(2)}`,
        date: Temporal.PlainDate.from("2024-01-15"),
        description: "Test transaction",
        notes: "",
        amount: asMinorUnits(1000),
        accountId: "acc-1",
        tagIds: [],
        statusId: "status-1",
        importId: "",
        allocations: {},
        creationInstant: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        importRowIndex: 0,
        deletedAt: undefined,
        ...overrides,
    };
}

// Helper to create empty store
function createEmptyStore(): TransactionStore {
    return {} as TransactionStore;
}

describe("Date Change Operations", () => {
    it("moves transaction to new date bucket and prunes empty old bucket", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Create a transaction on Jan 15
        const tx = createTransaction({
            id: "tx-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
        });
        insertTransaction(store, { transaction: tx });

        // Verify initial state
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-15"))).toBe(true);
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-02-20"))).toBe(false);

        // Move to Feb 20
        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1",
            },
            newDate: Temporal.PlainDate.from("2024-02-20"),
        });

        // Verify transaction is in new location
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-02-20"))).toBe(true);
        const transactions = getAccountTransactions(store, "acc-1");
        expect(transactions.length).toBe(1);
        expect(transactions[0].date).toEqual(Temporal.PlainDate.from("2024-02-20"));

        // Verify old bucket was pruned (it was the only transaction)
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-15"))).toBe(false);
    });

    it("preserves other transactions when moving one transaction", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Create two transactions on same day
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "First",
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
            }),
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "Second",
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 1000),
            }),
        });

        // Move first to different date
        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1",
            },
            newDate: Temporal.PlainDate.from("2024-02-20"),
        });

        // Verify original bucket still exists with remaining transaction
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-15"))).toBe(true);
        const janTxs = getAccountTransactions(store, "acc-1").filter(
            (t) => Temporal.PlainDate.compare(t.date, Temporal.PlainDate.from("2024-01-15")) === 0
        );
        expect(janTxs.length).toBe(1);
        expect(janTxs[0].id).toBe("tx-2");

        // Verify moved transaction is in new location
        const febTxs = getAccountTransactions(store, "acc-1").filter(
            (t) => Temporal.PlainDate.compare(t.date, Temporal.PlainDate.from("2024-02-20")) === 0
        );
        expect(febTxs.length).toBe(1);
        expect(febTxs[0].id).toBe("tx-1");
    });

    it("maintains sort order after date change", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Create transactions on different dates
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-jan",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
            }),
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-mar",
                date: Temporal.PlainDate.from("2024-03-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 1000),
            }),
        });

        // Move Jan transaction to Feb (between existing dates)
        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-jan",
            },
            newDate: Temporal.PlainDate.from("2024-02-15"),
        });

        // Verify sort order (date desc: Mar, Feb, Jan gone)
        const transactions = getAccountTransactions(store, "acc-1");
        expect(transactions.length).toBe(2);
        expect(transactions[0].date).toEqual(Temporal.PlainDate.from("2024-03-15"));
        expect(transactions[1].date).toEqual(Temporal.PlainDate.from("2024-02-15"));
    });
});

describe("Import Deletion Operations", () => {
    it("deletes all transactions from an import across multiple dates", () => {
        const store = createEmptyStore();
        const now = Date.now();
        const importId = "import-batch-1";

        // Create transactions from an import across different dates
        for (let day = 1; day <= 5; day++) {
            insertTransaction(store, {
                transaction: createTransaction({
                    id: `tx-import-${day}`,
                    date: Temporal.PlainDate.from(`2024-01-${String(day).padStart(2, "0")}`),
                    importId,
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                    importRowIndex: day - 1,
                }),
            });
        }

        // Add a non-import transaction
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-manual",
                date: Temporal.PlainDate.from("2024-01-03"),
                importId: "",
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now + 1000),
            }),
        });

        // Verify setup
        let allTxs = getAllTransactions(store);
        expect(allTxs.length).toBe(6);

        // Delete each import transaction
        for (let day = 1; day <= 5; day++) {
            deleteTransaction(store, {
                location: {
                    accountId: "acc-1",
                    date: Temporal.PlainDate.from(`2024-01-${String(day).padStart(2, "0")}`),
                    transactionId: `tx-import-${day}`,
                },
            });
        }

        // Verify only manual transaction remains
        allTxs = getAllTransactions(store);
        expect(allTxs.length).toBe(1);
        expect(allTxs[0].id).toBe("tx-manual");

        // Verify empty buckets were pruned (days 1, 2, 4, 5 should be gone)
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-01"))).toBe(false);
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-02"))).toBe(false);
        // Day 3 still has the manual transaction
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-03"))).toBe(true);
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-04"))).toBe(false);
        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-05"))).toBe(false);
    });
});

describe("Account Change Operations", () => {
    it("moves transaction to different account", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Create transaction in acc-1
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                accountId: "acc-1",
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
            }),
        });

        // Verify initial state
        expect(getAccountTransactions(store, "acc-1").length).toBe(1);
        expect(getAccountTransactions(store, "acc-2").length).toBe(0);

        // Move to acc-2
        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1",
            },
            newDate: Temporal.PlainDate.from("2024-01-15"),
            newAccountId: "acc-2",
        });

        // Verify moved
        expect(getAccountTransactions(store, "acc-1").length).toBe(0);
        expect(getAccountTransactions(store, "acc-2").length).toBe(1);
        expect(getAccountTransactions(store, "acc-2")[0].id).toBe("tx-1");
    });

    it("prunes empty account tree after moving all transactions", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Create single transaction in acc-1
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                accountId: "acc-1",
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
            }),
        });

        // Move to acc-2
        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1",
            },
            newDate: Temporal.PlainDate.from("2024-01-15"),
            newAccountId: "acc-2",
        });

        // acc-1 should be pruned (empty)
        expect(store["acc-1"]).toBeUndefined();
        // acc-2 should exist
        expect(store["acc-2"]).toBeDefined();
    });
});

describe("Mirror Integration - Import Batch Flow", () => {
    it("correctly stores and retrieves transaction dates through CRDT", () => {
        const doc = new LoroDoc();
        const mirror = new Mirror({
            doc,
            schema: vaultSchema,
            initialState: getDefaultVaultState(),
            validateUpdates: true,
        });

        const creationInstant = Temporal.Now.instant();
        const importId = "import-test-1";

        // Simulate what createImportBatch does in the import page
        mirror.setState((state: VaultInput) => {
            // Create import record
            state.imports[importId] = {
                id: importId,
                filename: "test.csv",
                transactionCount: 3,
                createdAt: creationInstant,
                deletedAt: undefined,
            };

            // Create transactions using hierarchical structure (same as import page)
            const transactions = [
                {
                    id: "tx-1",
                    date: Temporal.PlainDate.from("2024-01-15"),
                    description: "Transaction 1",
                    amount: asMinorUnits(1000),
                    accountId: "account-default",
                    statusId: "status-for-review",
                    importRowIndex: 0,
                },
                {
                    id: "tx-2",
                    date: Temporal.PlainDate.from("2024-01-16"),
                    description: "Transaction 2",
                    amount: asMinorUnits(2000),
                    accountId: "account-default",
                    statusId: "status-for-review",
                    importRowIndex: 1,
                },
                {
                    id: "tx-3",
                    date: Temporal.PlainDate.from("2024-02-01"),
                    description: "Transaction 3",
                    amount: asMinorUnits(3000),
                    accountId: "account-default",
                    statusId: "status-for-review",
                    importRowIndex: 2,
                },
            ];

            const store = state.transactions as unknown as TransactionStore;
            for (const tx of transactions) {
                insertTransaction(store, {
                    transaction: {
                        id: tx.id,
                        date: tx.date,
                        description: tx.description,
                        notes: "",
                        amount: tx.amount,
                        accountId: tx.accountId,
                        tagIds: [],
                        statusId: tx.statusId,
                        importId,
                        allocations: {},
                        creationInstant,
                        importRowIndex: tx.importRowIndex,
                        deletedAt: undefined,
                    },
                });
            }
        });

        // Read back state and verify dates are Temporal.PlainDate objects
        const state = mirror.getState();
        const allTxs: Array<{ id: string; date: unknown }> = [];

        for (const accountId of Object.keys(state.transactions)) {
            const tree = state.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            allTxs.push({ id: tx.id, date: tx.date });
                        }
                    }
                }
            }
        }

        expect(allTxs).toHaveLength(3);

        // Verify each transaction's date is a valid Temporal.PlainDate
        for (const tx of allTxs) {
            expect(tx.date).toBeInstanceOf(Temporal.PlainDate);
            // This is what fails in the E2E - Temporal.PlainDate.compare
            expect(() => {
                Temporal.PlainDate.compare(
                    tx.date as Temporal.PlainDate,
                    Temporal.PlainDate.from("2024-01-01")
                );
            }).not.toThrow();
        }

        // Verify specific dates
        const dateMap = Object.fromEntries(allTxs.map((tx) => [tx.id, tx.date]));
        expect(dateMap["tx-1"]).toEqual(Temporal.PlainDate.from("2024-01-15"));
        expect(dateMap["tx-2"]).toEqual(Temporal.PlainDate.from("2024-01-16"));
        expect(dateMap["tx-3"]).toEqual(Temporal.PlainDate.from("2024-02-01"));
    });

    it("correctly roundtrips transaction dates through snapshot export/import", () => {
        // Phase 1: Create Mirror, add transactions
        const doc1 = new LoroDoc();
        const mirror1 = new Mirror({
            doc: doc1,
            schema: vaultSchema,
            initialState: getDefaultVaultState(),
            validateUpdates: true,
        });

        const creationInstant = Temporal.Now.instant();
        const importId = "import-roundtrip-1";

        mirror1.setState((state: VaultInput) => {
            state.imports[importId] = {
                id: importId,
                filename: "test.csv",
                transactionCount: 2,
                createdAt: creationInstant,
                deletedAt: undefined,
            };

            const store = state.transactions as unknown as TransactionStore;
            insertTransaction(store, {
                transaction: {
                    id: "tx-rt-1",
                    date: Temporal.PlainDate.from("2024-03-15"),
                    description: "Roundtrip test 1",
                    notes: "",
                    amount: asMinorUnits(500),
                    accountId: "account-default",
                    tagIds: [],
                    statusId: "status-for-review",
                    importId,
                    allocations: {},
                    creationInstant,
                    importRowIndex: 0,
                    deletedAt: undefined,
                },
            });

            insertTransaction(store, {
                transaction: {
                    id: "tx-rt-2",
                    date: Temporal.PlainDate.from("2024-04-20"),
                    description: "Roundtrip test 2",
                    notes: "",
                    amount: asMinorUnits(1500),
                    accountId: "account-default",
                    tagIds: [],
                    statusId: "status-for-review",
                    importId,
                    allocations: {},
                    creationInstant,
                    importRowIndex: 1,
                    deletedAt: undefined,
                },
            });
        });

        // Phase 2: Export snapshot
        const snapshot = doc1.export({ mode: "snapshot" });

        // Phase 3: Create new Mirror from snapshot (like createVaultMirrorFromSnapshot)
        const doc2 = new LoroDoc();
        doc2.import(snapshot);

        const mirror2 = new Mirror({
            doc: doc2,
            schema: vaultSchema,
            validateUpdates: true,
        });

        // Phase 4: Read state from restored Mirror
        const state = mirror2.getState();
        const allTxs: Array<{ id: string; date: unknown; creationInstant: unknown }> = [];

        for (const accountId of Object.keys(state.transactions)) {
            const tree = state.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            allTxs.push({
                                id: tx.id,
                                date: tx.date,
                                creationInstant: tx.creationInstant,
                            });
                        }
                    }
                }
            }
        }

        expect(allTxs).toHaveLength(2);

        // Verify dates are valid Temporal.PlainDate instances after roundtrip
        for (const tx of allTxs) {
            expect(tx.date).toBeInstanceOf(Temporal.PlainDate);
            expect(tx.creationInstant).toBeInstanceOf(Temporal.Instant);
            // This is the exact call that fails in E2E
            expect(() => {
                Temporal.PlainDate.compare(
                    tx.date as Temporal.PlainDate,
                    Temporal.PlainDate.from("2024-01-01")
                );
            }).not.toThrow();
        }

        const dateMap = Object.fromEntries(allTxs.map((tx) => [tx.id, tx.date]));
        expect(dateMap["tx-rt-1"]).toEqual(Temporal.PlainDate.from("2024-03-15"));
        expect(dateMap["tx-rt-2"]).toEqual(Temporal.PlainDate.from("2024-04-20"));
    });

    it("correctly roundtrips when creating Mirror with doc AND initialState", () => {
        // This matches VaultProvider pattern: doc loaded from IndexedDB + initialState for defaults
        const doc1 = new LoroDoc();
        const mirror1 = new Mirror({
            doc: doc1,
            schema: vaultSchema,
            initialState: getDefaultVaultState(),
            validateUpdates: true,
        });

        const creationInstant = Temporal.Now.instant();

        mirror1.setState((state: VaultInput) => {
            const store = state.transactions as unknown as TransactionStore;
            insertTransaction(store, {
                transaction: {
                    id: "tx-vp-1",
                    date: Temporal.PlainDate.from("2024-05-10"),
                    description: "VaultProvider test",
                    notes: "",
                    amount: asMinorUnits(999),
                    accountId: "account-default",
                    tagIds: [],
                    statusId: "status-for-review",
                    importId: "",
                    allocations: {},
                    creationInstant,
                    importRowIndex: 0,
                    deletedAt: undefined,
                },
            });
        });

        // Export snapshot
        const snapshot = doc1.export({ mode: "snapshot" });

        // Create new doc and import snapshot (simulating IndexedDB restore)
        const doc2 = new LoroDoc();
        doc2.import(snapshot);

        // Create Mirror WITH initialState (like VaultProvider does)
        const mirror2 = new Mirror({
            doc: doc2,
            schema: vaultSchema,
            initialState: getDefaultVaultState(),
            validateUpdates: true,
        });

        // Read state
        const state = mirror2.getState();
        const allTxs: Array<{ id: string; date: unknown }> = [];

        for (const accountId of Object.keys(state.transactions)) {
            const tree = state.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            allTxs.push({ id: tx.id, date: tx.date });
                        }
                    }
                }
            }
        }

        expect(allTxs).toHaveLength(1);
        expect(allTxs[0].date).toBeInstanceOf(Temporal.PlainDate);
        expect(allTxs[0].date).toEqual(Temporal.PlainDate.from("2024-05-10"));
    });
});

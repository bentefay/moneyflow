/**
 * Tests for Transaction Mutation Functions
 *
 * Verifies the hierarchical transaction mutation operations.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    deleteTransaction,
    deleteTransactionsByImport,
    findParentTransaction,
    findTransactionInStore,
    getDayBuckets,
    getOrCreateAccountTree,
    getOrCreateDayBucket,
    getOrCreateMonthBucket,
    getOrCreateYearBucket,
    insertTransaction,
    moveTransaction,
    pruneBuckets,
    swapDuplicate,
    unnestDuplicate,
    updateTransaction
} from "@/lib/crdt/mutations";
import type { AccountTransactionTree, TransactionInput, TransactionStore } from "@/lib/crdt/schema";
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
        originalAmount: undefined,
        accountId: "acc-1",
        tagIds: [],
        statusId: "status-for-review",
        importId: "",
        allocations: {},
        creationInstant: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        importRowIndex: 0,
        descriptionAliasId: undefined,
        deletedAt: undefined,
        ...overrides
    };
}

// Helper to create empty store
function createEmptyStore(): TransactionStore {
    return {} as TransactionStore;
}

describe("getOrCreateAccountTree", () => {
    it("creates new tree if account does not exist", () => {
        const store = createEmptyStore();

        const tree = getOrCreateAccountTree(store, "acc-1");

        expect(tree.accountId).toBe("acc-1");
        expect(tree.years).toEqual([]);
        expect(store["acc-1"]).toBe(tree);
    });

    it("returns existing tree if account exists", () => {
        const store = createEmptyStore();
        const firstTree = getOrCreateAccountTree(store, "acc-1");

        const secondTree = getOrCreateAccountTree(store, "acc-1");

        expect(secondTree).toBe(firstTree);
    });
});

describe("getOrCreateYearBucket", () => {
    it("creates year bucket at correct sorted position (descending)", () => {
        const store = createEmptyStore();
        const tree = getOrCreateAccountTree(store, "acc-1");

        // Insert years out of order
        getOrCreateYearBucket(tree, 2022);
        getOrCreateYearBucket(tree, 2024);
        getOrCreateYearBucket(tree, 2023);

        // Should be sorted descending
        expect(tree.years.map((y) => y.year)).toEqual([2024, 2023, 2022]);
    });

    it("returns existing bucket if year already exists", () => {
        const store = createEmptyStore();
        const tree = getOrCreateAccountTree(store, "acc-1");

        const first = getOrCreateYearBucket(tree, 2024);
        const second = getOrCreateYearBucket(tree, 2024);

        expect(second).toBe(first);
        expect(tree.years.length).toBe(1);
    });
});

describe("getOrCreateMonthBucket", () => {
    it("creates month bucket at correct sorted position (descending)", () => {
        const store = createEmptyStore();
        const tree = getOrCreateAccountTree(store, "acc-1");
        const yearBucket = getOrCreateYearBucket(tree, 2024);

        // Insert months out of order
        getOrCreateMonthBucket(yearBucket, 3);
        getOrCreateMonthBucket(yearBucket, 12);
        getOrCreateMonthBucket(yearBucket, 6);

        // Should be sorted descending
        expect(yearBucket.months.map((m) => m.month)).toEqual([12, 6, 3]);
    });
});

describe("getOrCreateDayBucket", () => {
    it("creates day bucket at correct sorted position (descending)", () => {
        const store = createEmptyStore();
        const tree = getOrCreateAccountTree(store, "acc-1");
        const yearBucket = getOrCreateYearBucket(tree, 2024);
        const monthBucket = getOrCreateMonthBucket(yearBucket, 1);

        // Insert days out of order
        getOrCreateDayBucket(monthBucket, 10);
        getOrCreateDayBucket(monthBucket, 25);
        getOrCreateDayBucket(monthBucket, 15);

        // Should be sorted descending
        expect(monthBucket.days.map((d) => d.day)).toEqual([25, 15, 10]);
    });
});

describe("insertTransaction", () => {
    it("accepts distinct ordinary manual rows with valid empty defaults", () => {
        const store = createEmptyStore();
        const date = Temporal.PlainDate.from("2026-07-24");
        const creationInstant = Temporal.Instant.from("2026-07-24T00:00:00Z");

        for (const id of ["empty-row-1", "empty-row-2", "empty-row-3"]) {
            insertTransaction(store, {
                transaction: createTransaction({
                    id,
                    date,
                    description: "",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(0),
                    accountId: "account-default",
                    tagIds: [],
                    statusId: "status-for-review",
                    importId: undefined,
                    allocations: {},
                    creationInstant,
                    importRowIndex: undefined,
                    deletedAt: undefined
                })
            });
        }

        const tree = store["account-default"];
        if (!tree || typeof tree === "string") throw new Error("Expected default account tree");
        const transactions = tree.years[0].months[0].days[0].transactions;

        expect(transactions.map(({ id }) => id)).toEqual([
            "empty-row-1",
            "empty-row-2",
            "empty-row-3"
        ]);
        expect(new Set(transactions.map(({ id }) => id)).size).toBe(3);
        for (const transaction of transactions) {
            expect(transaction).toMatchObject({
                date,
                description: "",
                notes: "",
                amount: 0,
                accountId: "account-default",
                tagIds: [],
                statusId: "status-for-review",
                allocations: {},
                creationInstant,
                suspectedDuplicates: []
            });
            expect(transaction.descriptionAliasId).toBeUndefined();
            expect(transaction.importId).toBeUndefined();
            expect(transaction.importRowIndex).toBeUndefined();
            expect(transaction.deletedAt).toBeUndefined();
        }
    });

    it("creates all intermediate buckets lazily", () => {
        const store = createEmptyStore();
        const tx = createTransaction({
            date: Temporal.PlainDate.from("2024-03-15"),
            accountId: "acc-1"
        });

        insertTransaction(store, { transaction: tx });

        const tree = store["acc-1"] as AccountTransactionTree;
        expect(tree).toBeDefined();
        expect(tree.years.length).toBe(1);
        expect(tree.years[0].year).toBe(2024);
        expect(tree.years[0].months.length).toBe(1);
        expect(tree.years[0].months[0].month).toBe(3);
        expect(tree.years[0].months[0].days.length).toBe(1);
        expect(tree.years[0].months[0].days[0].day).toBe(15);
    });

    it("inserts transaction at correct sorted position by creationInstant desc", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Insert in order: oldest first
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-old",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 1000)
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-new",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now)
            })
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const transactions = tree.years[0].months[0].days[0].transactions;

        // Newest should be first (creationInstant desc)
        expect(transactions[0].id).toBe("tx-new");
        expect(transactions[1].id).toBe("tx-old");
    });

    it("sorts by importRowIndex asc when creationInstant is equal", () => {
        const store = createEmptyStore();
        const now = Date.now();

        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-row-5",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 5
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-row-2",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 2
            })
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const transactions = tree.years[0].months[0].days[0].transactions;

        // Lower importRowIndex should be first (asc)
        expect(transactions[0].id).toBe("tx-row-2");
        expect(transactions[1].id).toBe("tx-row-5");
    });

    it("inserts as nested duplicate when suspectedDuplicateOf is provided", () => {
        const store = createEmptyStore();

        // Insert parent
        const parentTx = createTransaction({
            id: "tx-parent",
            date: Temporal.PlainDate.from("2024-01-15")
        });
        insertTransaction(store, { transaction: parentTx });

        // Insert duplicate
        const dupTx = createTransaction({
            id: "tx-dup",
            date: Temporal.PlainDate.from("2024-01-15")
        });
        insertTransaction(store, {
            transaction: dupTx,
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const transactions = tree.years[0].months[0].days[0].transactions;

        // Only parent should be at top level
        expect(transactions.length).toBe(1);
        expect(transactions[0].id).toBe("tx-parent");

        // Duplicate should be nested
        expect(transactions[0].suspectedDuplicates?.length).toBe(1);
        expect(transactions[0].suspectedDuplicates?.[0].id).toBe("tx-dup");
    });
});

describe("updateTransaction", () => {
    it("keeps imported description immutable in the generic updater", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "Original"
            })
        });

        updateTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1"
            },
            updates: { description: "Updated" }
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const tx = tree.years[0].months[0].days[0].transactions[0];
        expect(tx.description).toBe("Original");
    });

    it("keeps nested duplicate description immutable in the generic updater", () => {
        const store = createEmptyStore();

        // Insert parent with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "Original Dup"
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        updateTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-dup"
            },
            updates: { description: "Updated Dup" }
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const dup = tree.years[0].months[0].days[0].transactions[0].suspectedDuplicates?.[0];
        expect(dup?.description).toBe("Original Dup");
    });
});

describe("moveTransaction", () => {
    it("moves transaction to different date", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                originalAmount: asMinorUnits(-500)
            })
        });

        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1"
            },
            newDate: Temporal.PlainDate.from("2024-02-20")
        });

        // Should not be in old location
        const oldBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));
        expect(oldBuckets.length).toBe(0);

        // Should be in new location
        const newBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-02-20"));
        expect(newBuckets.length).toBe(1);
        expect(newBuckets[0].transactions[0].id).toBe("tx-1");
        expect(newBuckets[0].transactions[0].date).toEqual(Temporal.PlainDate.from("2024-02-20"));
        expect(newBuckets[0].transactions[0].originalAmount).toBe(-500);
    });

    it("prunes empty buckets after move", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });

        moveTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1"
            },
            newDate: Temporal.PlainDate.from("2024-02-20")
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        // Old year/month/day buckets should be pruned
        expect(tree.years.length).toBe(1);
        expect(tree.years[0].year).toBe(2024);
        expect(tree.years[0].months.length).toBe(1);
        expect(tree.years[0].months[0].month).toBe(2);
    });
});

describe("deleteTransaction", () => {
    it("deletes transaction and cascades to suspectedDuplicates by default", () => {
        const store = createEmptyStore();

        // Insert parent with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        deleteTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        // Both should be gone
        const buckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));
        expect(buckets.length).toBe(0);
    });

    it("deletes only nested duplicate when targeting duplicate", () => {
        const store = createEmptyStore();

        // Insert parent with two duplicates
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup1",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup2",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        deleteTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-dup1"
            }
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        const parent = tree.years[0].months[0].days[0].transactions[0];

        // Parent should still exist
        expect(parent.id).toBe("tx-parent");
        // Only dup2 should remain
        expect(parent.suspectedDuplicates?.length).toBe(1);
        expect(parent.suspectedDuplicates?.[0].id).toBe("tx-dup2");
    });

    it("prunes empty buckets after deletion", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });

        deleteTransaction(store, {
            location: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-1"
            }
        });

        // Account tree should be removed entirely
        expect(store["acc-1"]).toBeUndefined();
    });
});

describe("unnestDuplicate", () => {
    it("removes from parent suspectedDuplicates and inserts as standalone", () => {
        const store = createEmptyStore();

        // Insert parent with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-14"), // Different date
                originalAmount: asMinorUnits(-700)
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        unnestDuplicate(store, {
            parentLocation: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            },
            duplicateId: "tx-dup"
        });

        // Parent should have no duplicates
        const parentBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));
        expect(parentBuckets[0].transactions[0].suspectedDuplicates?.length).toBe(0);

        // Duplicate should be standalone at its own date
        const dupBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-14"));
        expect(dupBuckets.length).toBe(1);
        expect(dupBuckets[0].transactions[0].id).toBe("tx-dup");
        expect(dupBuckets[0].transactions[0].originalAmount).toBe(-700);
    });

    it("removes divergent nested copies from every physical parent before materializing one", () => {
        const store = createEmptyStore();
        const parentDate = Temporal.PlainDate.from("2024-01-15");
        const duplicateDate = Temporal.PlainDate.from("2024-01-14");
        insertTransaction(store, {
            transaction: createTransaction({ id: "parent", date: parentDate })
        });
        insertTransaction(store, {
            transaction: createTransaction({ id: "duplicate", date: duplicateDate, notes: "z" }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: parentDate,
                transactionId: "parent"
            }
        });
        const tree = store["acc-1"];
        if (!tree || typeof tree === "string") throw new Error("Missing transaction tree");
        const year = tree.years[0];
        const month = year.months[0];
        const day = month.days[0];
        const parentCopy = {
            ...day.transactions[0],
            suspectedDuplicates: [{ ...day.transactions[0].suspectedDuplicates[0], notes: "a" }]
        };
        tree.years.push({
            ...year,
            months: [{ ...month, days: [{ ...day, transactions: [parentCopy] }] }]
        });

        unnestDuplicate(store, {
            parentLocation: { accountId: "acc-1", date: parentDate, transactionId: "parent" },
            duplicateId: "duplicate"
        });

        expect(
            getDayBuckets(store, "acc-1", parentDate).flatMap((bucket) =>
                bucket.transactions.flatMap((transaction) => transaction.suspectedDuplicates)
            )
        ).toEqual([]);
        expect(getDayBuckets(store, "acc-1", duplicateDate)[0].transactions[0].notes).toBe("a");
    });
});

describe("swapDuplicate", () => {
    it("promotes duplicate to parent and demotes old parent", () => {
        const store = createEmptyStore();
        const now = Date.now();

        // Insert parent with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                originalAmount: asMinorUnits(100)
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-14"), // Different date
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now + 1000),
                originalAmount: asMinorUnits(200)
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        swapDuplicate(store, {
            parentLocation: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            },
            duplicateId: "tx-dup"
        });

        // Old parent location should be empty
        const oldBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));
        expect(oldBuckets.length).toBe(0);

        // New parent should be at duplicate's original date
        const newBuckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-14"));
        expect(newBuckets.length).toBe(1);

        const newParent = newBuckets[0].transactions[0];
        expect(newParent.id).toBe("tx-dup");
        expect(newParent.originalAmount).toBe(200);

        // Old parent should now be a duplicate of new parent
        expect(newParent.suspectedDuplicates?.length).toBe(1);
        expect(newParent.suspectedDuplicates?.[0].id).toBe("tx-parent");
        expect(newParent.suspectedDuplicates?.[0].originalAmount).toBe(100);
    });

    it("removes every physical parent copy and deterministically promotes divergent duplicates", () => {
        const store = createEmptyStore();
        const parentDate = Temporal.PlainDate.from("2024-01-15");
        const duplicateDate = Temporal.PlainDate.from("2024-01-14");
        insertTransaction(store, {
            transaction: createTransaction({ id: "parent", date: parentDate })
        });
        insertTransaction(store, {
            transaction: createTransaction({ id: "duplicate", date: duplicateDate, notes: "z" }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: parentDate,
                transactionId: "parent"
            }
        });
        const tree = store["acc-1"];
        if (!tree || typeof tree === "string") throw new Error("Missing transaction tree");
        const year = tree.years[0];
        const month = year.months[0];
        const day = month.days[0];
        const parentCopy = {
            ...day.transactions[0],
            suspectedDuplicates: [{ ...day.transactions[0].suspectedDuplicates[0], notes: "a" }]
        };
        tree.years.push({
            ...year,
            months: [{ ...month, days: [{ ...day, transactions: [parentCopy] }] }]
        });

        swapDuplicate(store, {
            parentLocation: { accountId: "acc-1", date: parentDate, transactionId: "parent" },
            duplicateId: "duplicate"
        });

        expect(getDayBuckets(store, "acc-1", parentDate)).toEqual([]);
        const promoted = getDayBuckets(store, "acc-1", duplicateDate)[0].transactions;
        expect(promoted).toHaveLength(1);
        expect(promoted[0].notes).toBe("a");
        expect(promoted[0].suspectedDuplicates.map(({ id }) => id)).toEqual(["parent"]);
    });
});

describe("deleteTransactionsByImport", () => {
    it("deletes all transactions with matching importId", () => {
        const store = createEmptyStore();

        // Insert transactions from two imports
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                importId: "import-A"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-01-16"),
                importId: "import-A"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-3",
                date: Temporal.PlainDate.from("2024-01-17"),
                importId: "import-B"
            })
        });

        deleteTransactionsByImport(store, "import-A");

        // import-A transactions should be gone
        expect(getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15")).length).toBe(0);
        expect(getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-16")).length).toBe(0);

        // import-B transaction should remain
        const remainingBuckets = getDayBuckets(
            store,
            "acc-1",
            Temporal.PlainDate.from("2024-01-17")
        );
        expect(remainingBuckets.length).toBe(1);
        expect(remainingBuckets[0].transactions[0].id).toBe("tx-3");
    });

    it("removes nested duplicates with matching importId", () => {
        const store = createEmptyStore();

        // Insert parent (no import) with duplicate (has import)
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15"),
                importId: undefined
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-15"),
                importId: "import-A"
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        deleteTransactionsByImport(store, "import-A");

        // Parent should still exist
        const buckets = getDayBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));
        expect(buckets.length).toBe(1);
        expect(buckets[0].transactions[0].id).toBe("tx-parent");

        // Duplicate should be removed
        expect(buckets[0].transactions[0].suspectedDuplicates?.length).toBe(0);
    });

    it("preserves a nested transaction from another import when its parent import is deleted", () => {
        const store = createEmptyStore();
        const parentDate = Temporal.PlainDate.from("2024-01-15");
        const duplicateDate = Temporal.PlainDate.from("2024-01-16");

        insertTransaction(store, {
            transaction: createTransaction({
                id: "import-a-parent",
                date: parentDate,
                importId: "import-A"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "import-b-duplicate",
                date: duplicateDate,
                importId: "import-B"
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: parentDate,
                transactionId: "import-a-parent"
            }
        });

        deleteTransactionsByImport(store, "import-A");

        expect(
            findTransactionInStore(store, {
                accountId: "acc-1",
                date: duplicateDate,
                transactionId: "import-b-duplicate"
            })
        ).toMatchObject({
            id: "import-b-duplicate",
            importId: "import-B"
        });
        expect(
            findTransactionInStore(store, {
                accountId: "acc-1",
                date: parentDate,
                transactionId: "import-a-parent"
            })
        ).toBeUndefined();
    });
});

describe("imported amount provenance", () => {
    it("captures the prior amount once for imported parent and nested transactions", () => {
        const store = createEmptyStore();
        const date = Temporal.PlainDate.from("2024-01-15");
        insertTransaction(store, {
            transaction: createTransaction({
                id: "imported-parent",
                date,
                amount: asMinorUnits(-1250),
                importId: "import-A"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "imported-duplicate",
                date,
                amount: asMinorUnits(0),
                importId: "import-A"
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date,
                transactionId: "imported-parent"
            }
        });

        const parentLocation = {
            accountId: "acc-1",
            date,
            transactionId: "imported-parent"
        };
        const duplicateLocation = {
            accountId: "acc-1",
            date,
            transactionId: "imported-duplicate"
        };
        updateTransaction(store, {
            location: parentLocation,
            updates: { amount: asMinorUnits(2500) }
        });
        updateTransaction(store, {
            location: parentLocation,
            updates: { amount: asMinorUnits(-3750) }
        });
        updateTransaction(store, {
            location: duplicateLocation,
            updates: { amount: asMinorUnits(800) }
        });

        expect(findTransactionInStore(store, parentLocation)).toMatchObject({
            amount: -3750,
            originalAmount: -1250
        });
        expect(findTransactionInStore(store, duplicateLocation)).toMatchObject({
            amount: 800,
            originalAmount: 0
        });
    });

    it("does not create provenance for a no-op edit or a manual transaction", () => {
        const store = createEmptyStore();
        const date = Temporal.PlainDate.from("2024-01-15");
        insertTransaction(store, {
            transaction: createTransaction({
                id: "unedited-import",
                date,
                amount: asMinorUnits(1000),
                importId: "import-A"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "manual",
                date,
                amount: asMinorUnits(1000),
                importId: undefined,
                importRowIndex: undefined
            })
        });

        const uneditedImportLocation = {
            accountId: "acc-1",
            date,
            transactionId: "unedited-import"
        };
        const manualLocation = {
            accountId: "acc-1",
            date,
            transactionId: "manual"
        };
        updateTransaction(store, {
            location: uneditedImportLocation,
            updates: { amount: asMinorUnits(1000) }
        });
        updateTransaction(store, {
            location: manualLocation,
            updates: { amount: asMinorUnits(2000) }
        });

        expect(
            findTransactionInStore(store, uneditedImportLocation)?.originalAmount
        ).toBeUndefined();
        expect(findTransactionInStore(store, manualLocation)).toMatchObject({
            amount: 2000,
            importId: undefined
        });
        expect(findTransactionInStore(store, manualLocation)?.originalAmount).toBeUndefined();
    });
});

describe("pruneBuckets", () => {
    it("removes empty day bucket but keeps non-empty siblings", () => {
        const store = createEmptyStore();
        // Insert two transactions on different days in the same month
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-01-20")
            })
        });

        // Manually remove the transaction from day 15
        const tree = store["acc-1"] as AccountTransactionTree;
        const day15Bucket = tree.years[0].months[0].days.find((d) => d.day === 15);
        if (day15Bucket) {
            day15Bucket.transactions = [];
        }

        pruneBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));

        // Day 15 bucket should be removed, but day 20 should remain
        expect(tree.years[0].months[0].days.length).toBe(1);
        expect(tree.years[0].months[0].days[0].day).toBe(20);
    });

    it("removes empty month bucket but keeps non-empty siblings", () => {
        const store = createEmptyStore();
        // Insert transactions in different months
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-02-15")
            })
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        // Find and empty the January bucket
        const janBucket = tree.years[0].months.find((m) => m.month === 1);
        if (janBucket && janBucket.days[0]) {
            janBucket.days[0].transactions = [];
        }

        pruneBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));

        // January should be removed, February should remain
        expect(tree.years[0].months.length).toBe(1);
        expect(tree.years[0].months[0].month).toBe(2);
    });

    it("removes empty year bucket when last month is removed", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        tree.years[0].months[0].days[0].transactions = [];

        pruneBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));

        // Year bucket should be removed (cascading prune)
        expect(tree.years.length).toBe(0);
    });

    it("removes empty account tree when last year is removed", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });

        const tree = store["acc-1"] as AccountTransactionTree;
        tree.years[0].months[0].days[0].transactions = [];

        pruneBuckets(store, "acc-1", Temporal.PlainDate.from("2024-01-15"));

        // Account tree should be removed
        expect(store["acc-1"]).toBeUndefined();
    });
});

describe("findTransactionInStore", () => {
    it("finds parent transaction by location", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });

        const found = findTransactionInStore(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-1"
        });

        expect(found?.id).toBe("tx-1");
    });

    it("finds nested duplicate by location", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        const found = findTransactionInStore(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-dup"
        });

        expect(found?.id).toBe("tx-dup");
    });

    it("returns undefined for non-existent transaction", () => {
        const store = createEmptyStore();

        const found = findTransactionInStore(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-nonexistent"
        });

        expect(found).toBeUndefined();
    });
});

describe("findParentTransaction", () => {
    it("finds only parent transactions, not nested duplicates", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-parent",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-parent"
            }
        });

        // Should find parent
        const foundParent = findParentTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-parent"
        });
        expect(foundParent?.id).toBe("tx-parent");

        // Should NOT find duplicate (it's nested, not a parent)
        const foundDup = findParentTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-dup"
        });
        expect(foundDup).toBeUndefined();
    });
});

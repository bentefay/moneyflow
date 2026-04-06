/**
 * Tests for Transaction Query Functions
 *
 * Verifies the hierarchical transaction query operations.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { type InsertTransactionInput, insertTransaction } from "@/lib/crdt/mutations";
import {
    filterTransactions,
    findTransaction,
    findTransactionById,
    getAccountTransactions,
    getAllTransactions,
    getTransactionsInDateRange,
    getTransactionsWithDuplicates,
    hasDayBucket
} from "@/lib/crdt/queries";
import type { Transaction, TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

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

// Helper to populate store with transactions
function populateStore(
    transactions: Array<Omit<TransactionInput, "suspectedDuplicates">>
): TransactionStore {
    const store = createEmptyStore();
    for (const tx of transactions) {
        insertTransaction(store, { transaction: tx });
    }
    return store;
}

describe("getAccountTransactions", () => {
    it("returns empty array for non-existent account", () => {
        const store = createEmptyStore();

        const result = getAccountTransactions(store, "non-existent");

        expect(result).toEqual([]);
    });

    it("returns transactions sorted by date desc", () => {
        const store = populateStore([
            createTransaction({ id: "tx-jan", date: Temporal.PlainDate.from("2024-01-15") }),
            createTransaction({ id: "tx-mar", date: Temporal.PlainDate.from("2024-03-20") }),
            createTransaction({ id: "tx-feb", date: Temporal.PlainDate.from("2024-02-10") })
        ]);

        const result = getAccountTransactions(store, "acc-1");

        expect(result.map((t) => t.id)).toEqual(["tx-mar", "tx-feb", "tx-jan"]);
    });

    it("returns transactions sorted by creationInstant desc within same date", () => {
        const now = Date.now();
        const store = populateStore([
            createTransaction({
                id: "tx-old",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 1000)
            }),
            createTransaction({
                id: "tx-new",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now)
            })
        ]);

        const result = getAccountTransactions(store, "acc-1");

        // Newer creationInstant should come first
        expect(result[0].id).toBe("tx-new");
        expect(result[1].id).toBe("tx-old");
    });

    it("returns transactions sorted by importRowIndex asc within same creationInstant", () => {
        const now = Date.now();
        const store = populateStore([
            createTransaction({
                id: "tx-row-5",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 5
            }),
            createTransaction({
                id: "tx-row-2",
                date: Temporal.PlainDate.from("2024-01-15"),
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 2
            })
        ]);

        const result = getAccountTransactions(store, "acc-1");

        // Lower importRowIndex should come first
        expect(result[0].id).toBe("tx-row-2");
        expect(result[1].id).toBe("tx-row-5");
    });

    it("only returns transactions for specified account", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({ id: "tx-acc1", accountId: "acc-1" })
        });
        insertTransaction(store, {
            transaction: createTransaction({ id: "tx-acc2", accountId: "acc-2" })
        });

        const result = getAccountTransactions(store, "acc-1");

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-acc1");
    });
});

describe("getAllTransactions", () => {
    it("returns transactions from all accounts sorted", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-acc1",
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-acc2",
                accountId: "acc-2",
                date: Temporal.PlainDate.from("2024-02-20")
            })
        });

        const result = getAllTransactions(store);

        expect(result.length).toBe(2);
        // Should be sorted by date desc
        expect(result[0].id).toBe("tx-acc2"); // Feb
        expect(result[1].id).toBe("tx-acc1"); // Jan
    });

    it("returns empty array for empty store", () => {
        const store = createEmptyStore();

        const result = getAllTransactions(store);

        expect(result).toEqual([]);
    });
});

describe("findTransaction", () => {
    it("finds transaction by location", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") })
        ]);

        const result = findTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-1"
        });

        expect(result?.id).toBe("tx-1");
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

        const result = findTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-dup"
        });

        expect(result?.id).toBe("tx-dup");
    });

    it("returns undefined for non-existent transaction", () => {
        const store = createEmptyStore();

        const result = findTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-15"),
            transactionId: "tx-nonexistent"
        });

        expect(result).toBeUndefined();
    });

    it("returns undefined for wrong date", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") })
        ]);

        const result = findTransaction(store, {
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-01-16"), // Wrong date
            transactionId: "tx-1"
        });

        expect(result).toBeUndefined();
    });
});

describe("findTransactionById", () => {
    it("finds transaction by ID alone", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") }),
            createTransaction({ id: "tx-2", date: Temporal.PlainDate.from("2024-02-20") })
        ]);

        const result = findTransactionById(store, "tx-2");

        expect(result?.transaction.id).toBe("tx-2");
        expect(result?.location).toEqual({
            accountId: "acc-1",
            date: Temporal.PlainDate.from("2024-02-20"),
            transactionId: "tx-2"
        });
    });

    it("finds nested duplicate by ID", () => {
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

        const result = findTransactionById(store, "tx-dup");

        expect(result?.transaction.id).toBe("tx-dup");
    });

    it("returns undefined for non-existent ID", () => {
        const store = createEmptyStore();

        const result = findTransactionById(store, "tx-nonexistent");

        expect(result).toBeUndefined();
    });
});

describe("getTransactionsInDateRange", () => {
    it("returns transactions within date range sorted ascending", () => {
        const store = populateStore([
            createTransaction({ id: "tx-jan-10", date: Temporal.PlainDate.from("2024-01-10") }),
            createTransaction({ id: "tx-jan-20", date: Temporal.PlainDate.from("2024-01-20") }),
            createTransaction({ id: "tx-feb-05", date: Temporal.PlainDate.from("2024-02-05") }),
            createTransaction({ id: "tx-mar-01", date: Temporal.PlainDate.from("2024-03-01") })
        ]);

        const result = getTransactionsInDateRange(store, "acc-1", {
            start: Temporal.PlainDate.from("2024-01-15"),
            end: Temporal.PlainDate.from("2024-02-15")
        });

        // Should include jan-20 and feb-05, sorted ascending
        expect(result.map((t) => t.id)).toEqual(["tx-jan-20", "tx-feb-05"]);
    });

    it("returns empty array for no matches", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") })
        ]);

        const result = getTransactionsInDateRange(store, "acc-1", {
            start: Temporal.PlainDate.from("2024-06-01"),
            end: Temporal.PlainDate.from("2024-06-30")
        });

        expect(result).toEqual([]);
    });

    it("includes boundary dates", () => {
        const store = populateStore([
            createTransaction({ id: "tx-start", date: Temporal.PlainDate.from("2024-01-15") }),
            createTransaction({ id: "tx-end", date: Temporal.PlainDate.from("2024-01-20") })
        ]);

        const result = getTransactionsInDateRange(store, "acc-1", {
            start: Temporal.PlainDate.from("2024-01-15"),
            end: Temporal.PlainDate.from("2024-01-20")
        });

        expect(result.length).toBe(2);
    });
});

describe("getTransactionsWithDuplicates", () => {
    it("returns only transactions with non-empty suspectedDuplicates", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-with-dup",
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
                transactionId: "tx-with-dup"
            }
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-no-dup",
                date: Temporal.PlainDate.from("2024-01-16")
            })
        });

        const result = getTransactionsWithDuplicates(store);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-with-dup");
    });

    it("filters by account when accountId provided", () => {
        const store = createEmptyStore();

        // Account 1 with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-acc1",
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup1",
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-acc1"
            }
        });

        // Account 2 with duplicate
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-acc2",
                accountId: "acc-2",
                date: Temporal.PlainDate.from("2024-01-15")
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "tx-dup2",
                accountId: "acc-2",
                date: Temporal.PlainDate.from("2024-01-15")
            }),
            suspectedDuplicateOf: {
                accountId: "acc-2",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "tx-acc2"
            }
        });

        const result = getTransactionsWithDuplicates(store, "acc-1");

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-acc1");
    });
});

describe("hasDayBucket", () => {
    it("returns true if day bucket exists", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") })
        ]);

        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-15"))).toBe(true);
    });

    it("returns false if day bucket does not exist", () => {
        const store = createEmptyStore();

        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-15"))).toBe(false);
    });

    it("returns false for different date", () => {
        const store = populateStore([
            createTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-01-15") })
        ]);

        expect(hasDayBucket(store, "acc-1", Temporal.PlainDate.from("2024-01-16"))).toBe(false);
    });
});

describe("filterTransactions", () => {
    // Helper to create mock transactions array for filterTransactions tests
    // Uses insertTransaction to get properly typed data, then extracts the transactions
    function createMockTransactions(): Transaction[] {
        const store = createEmptyStore();
        const now = Date.now();

        insertTransaction(store, {
            transaction: {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "Coffee shop",
                notes: "morning coffee",
                amount: asMinorUnits(-500),
                accountId: "acc-1",
                tagIds: ["tag-food"],
                statusId: "status-paid",
                importId: "import-1",
                allocations: { "person-1": asPercentage(100) },
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 0,
                descriptionAliasId: undefined,
                deletedAt: undefined
            }
        });

        insertTransaction(store, {
            transaction: {
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-02-20"),
                description: "Salary",
                notes: "",
                amount: asMinorUnits(5000),
                accountId: "acc-1",
                tagIds: ["tag-income"],
                statusId: "status-for-review",
                importId: "",
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 1000),
                importRowIndex: 0,
                descriptionAliasId: undefined,
                deletedAt: undefined
            }
        });

        insertTransaction(store, {
            transaction: {
                id: "tx-deleted",
                date: Temporal.PlainDate.from("2024-01-10"),
                description: "Deleted",
                notes: "",
                amount: asMinorUnits(-100),
                accountId: "acc-1",
                tagIds: [],
                statusId: "status-paid",
                importId: "",
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now - 2000),
                importRowIndex: 0,
                descriptionAliasId: undefined,
                deletedAt: Temporal.Instant.fromEpochMilliseconds(now)
            }
        });

        return getAllTransactions(store);
    }

    it("excludes deleted transactions by default", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions);

        expect(result.find((t) => t.id === "tx-deleted")).toBeUndefined();
        expect(result.length).toBe(2);
    });

    it("includes deleted transactions when excludeDeleted is false", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, { excludeDeleted: false });

        expect(result.find((t) => t.id === "tx-deleted")).toBeDefined();
        expect(result.length).toBe(3);
    });

    it("filters by date range", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            dateRange: {
                start: Temporal.PlainDate.from("2024-01-01"),
                end: Temporal.PlainDate.from("2024-01-31")
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-1");
    });

    it("filters by tag IDs", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            tagIds: ["tag-food"]
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-1");
    });

    it("filters by status IDs", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            statusIds: ["status-for-review"]
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-2");
    });

    it("filters by person IDs (allocation)", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            personIds: ["person-1"]
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-1");
    });

    it("filters by search text in description", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            search: "coffee"
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-1");
    });

    it("filters by search text in notes", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            search: "morning"
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-1");
    });

    it("search is case-insensitive", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            search: "COFFEE"
        });

        expect(result.length).toBe(1);
    });

    it("sorts by date desc by default", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions);

        expect(result[0].id).toBe("tx-2"); // Feb
        expect(result[1].id).toBe("tx-1"); // Jan
    });

    it("sorts by date asc when specified", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            sortBy: "date",
            sortDirection: "asc"
        });

        expect(result[0].id).toBe("tx-1"); // Jan
        expect(result[1].id).toBe("tx-2"); // Feb
    });

    it("sorts by amount", () => {
        const transactions = createMockTransactions();

        const result = filterTransactions(transactions, {
            sortBy: "amount",
            sortDirection: "asc"
        });

        expect(result[0].amount).toBe(asMinorUnits(-500));
        expect(result[1].amount).toBe(asMinorUnits(5000));
    });

    it("filters by showDuplicatesOnly", () => {
        // Create store with transactions - one with a nested duplicate, one without
        const store = createEmptyStore();
        const now = Date.now();

        // Transaction with a nested duplicate
        insertTransaction(store, {
            transaction: {
                id: "tx-with-dup",
                date: Temporal.PlainDate.from("2024-01-15"),
                description: "Has duplicate",
                notes: "",
                amount: asMinorUnits(1000),
                accountId: "acc-1",
                tagIds: [],
                statusId: "status-1",
                importId: "",
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 0,
                descriptionAliasId: undefined,
                deletedAt: undefined,
                suspectedDuplicates: [
                    {
                        id: "dup-1",
                        date: Temporal.PlainDate.from("2024-01-15"),
                        description: "Duplicate",
                        notes: "",
                        amount: asMinorUnits(1000),
                        accountId: "acc-1",
                        tagIds: [],
                        statusId: "status-1",
                        importId: "",
                        allocations: {},
                        creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                        importRowIndex: 0,
                        deletedAt: undefined
                    }
                ]
            }
        });

        // Transaction without duplicates
        insertTransaction(store, {
            transaction: {
                id: "tx-no-dup",
                date: Temporal.PlainDate.from("2024-01-16"),
                description: "No duplicate",
                notes: "",
                amount: asMinorUnits(500),
                accountId: "acc-1",
                tagIds: [],
                statusId: "status-1",
                importId: "",
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(now),
                importRowIndex: 0,
                descriptionAliasId: undefined,
                deletedAt: undefined
            }
        });

        // Get all transactions and filter
        const transactions = getAllTransactions(store);
        const result = filterTransactions(transactions, {
            showDuplicatesOnly: true
        });

        expect(result.length).toBe(1);
        expect(result[0].id).toBe("tx-with-dup");
    });
});

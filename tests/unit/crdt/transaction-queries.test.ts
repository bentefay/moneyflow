/**
 * Tests for Transaction Query Functions
 *
 * Verifies the hierarchical transaction query operations.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createVaultMirror } from "@/lib/crdt/mirror";
import { insertTransaction } from "@/lib/crdt/mutations";
import {
    filterTransactions,
    findTransaction,
    findTransactionById,
    getAccountTransactions,
    getActivePublicTransactionIdentities,
    getAllTransactions,
    getTransactionsInDateRange,
    getTransactionsWithDuplicates,
    hasDayBucket,
    queryTransactions
} from "@/lib/crdt/queries";
import type {
    Transaction,
    TransactionInput,
    TransactionStore,
    VaultState
} from "@/lib/crdt/schema";
import { TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import {
    createDescriptionAliasLookup,
    type DescriptionAliasCollection
} from "@/lib/domain/description-aliases";
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

describe("getActivePublicTransactionIdentities", () => {
    it("enumerates parent and nested logical IDs once across physical copies", () => {
        const store = createEmptyStore();

        for (const accountId of ["acc-2", "acc-1"]) {
            insertTransaction(store, {
                transaction: createTransaction({
                    id: "parent",
                    accountId,
                    importId: "parent-import"
                })
            });
            insertTransaction(store, {
                transaction: createTransaction({
                    id: "nested",
                    accountId,
                    importId: "nested-import"
                }),
                suspectedDuplicateOf: {
                    accountId,
                    date: Temporal.PlainDate.from("2024-01-15"),
                    transactionId: "parent"
                }
            });
        }

        expect(
            getActivePublicTransactionIdentities(store)
                .map(({ id, importId }) => ({ id, importId }))
                .sort((left, right) => left.id.localeCompare(right.id))
        ).toEqual([
            { id: "nested", importId: "nested-import" },
            { id: "parent", importId: "parent-import" }
        ]);
    });

    it("excludes deleted logical IDs while retaining an identity with an active physical copy", () => {
        const store = createEmptyStore();
        const deletedAt = Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000);

        insertTransaction(store, {
            transaction: createTransaction({
                id: "active-copy",
                accountId: "acc-1",
                importId: "active-import"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "active-copy",
                accountId: "acc-2",
                importId: "active-import",
                deletedAt
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "deleted-parent",
                importId: "deleted-parent-import",
                deletedAt
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "parent-for-deleted-nested",
                importId: "parent-import"
            })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "deleted-nested",
                importId: "deleted-nested-import",
                deletedAt
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date: Temporal.PlainDate.from("2024-01-15"),
                transactionId: "parent-for-deleted-nested"
            }
        });

        expect(
            getActivePublicTransactionIdentities(store)
                .map(({ id }) => id)
                .sort()
        ).toEqual(["active-copy", "parent-for-deleted-nested"]);
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
                date: Temporal.PlainDate.from("2024-01-15"),
                originalAmount: asMinorUnits(-1250)
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
        expect(result?.originalAmount).toBe(-1250);
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

    it("never reads a nested child through an incomplete maintenance parent", () => {
        const date = Temporal.PlainDate.from("2024-01-15");
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: createTransaction({ id: "source-parent", date })
        });
        insertTransaction(store, {
            transaction: createTransaction({
                id: "nested-public",
                date,
                notes: "complete source",
                tagIds: ["complete-tag"],
                allocations: { person: asPercentage(1) }
            }),
            suspectedDuplicateOf: {
                accountId: "acc-1",
                date,
                transactionId: "source-parent"
            }
        });
        const tree = store["acc-1"];
        if (!tree || typeof tree === "string") throw new Error("Missing transaction tree");
        const day = tree.years[0]?.months[0]?.days[0];
        const source = day?.transactions[0];
        const sourceNested = source?.suspectedDuplicates[0];
        if (!day || !source || !sourceNested) throw new Error("Missing source duplicate");
        source.suspectedDuplicates[0] = { ...sourceNested, $cid: "z-source-nested" };
        day.transactions.push({
            ...source,
            $cid: "shadow-parent",
            id: `${TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX}epoch\u0000source\u0000source-parent`,
            suspectedDuplicates: [
                {
                    ...sourceNested,
                    $cid: "a-incomplete-nested",
                    notes: "incomplete shadow"
                }
            ]
        });

        const location = { accountId: "acc-1", date, transactionId: "nested-public" };
        expect(findTransaction(store, location)?.notes).toBe("complete source");
        expect(findTransactionById(store, "nested-public")?.transaction.notes).toBe(
            "complete source"
        );
    });
});

describe("getTransactionsInDateRange", () => {
    it("uses the same canonical physical copy for location, ID, and import date-range reads", () => {
        const date = Temporal.PlainDate.from("2024-01-15");
        const store = populateStore([createTransaction({ id: "tx-conflict", date, notes: "z" })]);
        const tree = store["acc-1"];
        if (!tree || typeof tree === "string") throw new Error("Missing transaction tree");
        const year = tree.years[0];
        const month = year.months[0];
        const day = month.days[0];
        const competing = { ...day.transactions[0], notes: "a" };
        tree.years.push({
            ...year,
            months: [{ ...month, days: [{ ...day, transactions: [competing] }] }]
        });

        const location = { accountId: "acc-1", date, transactionId: "tx-conflict" };
        expect(findTransaction(store, location)?.notes).toBe("a");
        expect(findTransactionById(store, "tx-conflict")?.transaction.notes).toBe("a");
        expect(getTransactionsInDateRange(store, "acc-1", { start: date, end: date })).toEqual([
            competing
        ]);
    });

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

    it("globally canonicalizes same-ID parents when no account is scoped", () => {
        const store = createEmptyStore();
        for (const accountId of ["acc-2", "acc-1"]) {
            insertTransaction(store, {
                transaction: createTransaction({ id: "shared", accountId })
            });
            insertTransaction(store, {
                transaction: createTransaction({ id: `nested-${accountId}`, accountId }),
                suspectedDuplicateOf: {
                    accountId,
                    date: Temporal.PlainDate.from("2024-01-15"),
                    transactionId: "shared"
                }
            });
        }

        expect(getTransactionsWithDuplicates(store).map(({ id }) => id)).toEqual(["shared"]);
        expect(getTransactionsWithDuplicates(store, "acc-2").map(({ id }) => id)).toEqual([
            "shared"
        ]);
    });
});

describe("queryTransactions", () => {
    it("globally canonicalizes selected accounts before pagination", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: createTransaction({ id: "shared", accountId: "acc-2", notes: "z" })
            });
            insertTransaction(state.transactions, {
                transaction: createTransaction({ id: "shared", accountId: "acc-1", notes: "a" })
            });
        });

        const result = queryTransactions(
            vault.mirror.getState(),
            { accountIds: ["acc-2", "acc-1"] },
            { page: 0, pageSize: 1 }
        );

        expect(result.totalCount).toBe(1);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(
            getAllTransactions(vault.mirror.getState().transactions).find(
                ({ id }) => id === "shared"
            )
        );
        vault.mirror.dispose();
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
                originalAmount: undefined,
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
                originalAmount: undefined,
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
                originalAmount: undefined,
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

    // UR-002: search must find rows by the description the table actually displays. Resolution runs
    // through the production lookup so the one-hop symlink relationship is exercised, not stubbed.
    describe("search over alias-resolved descriptions", () => {
        const aliases: DescriptionAliasCollection = {
            "alias-testing": {
                kind: "real",
                id: "alias-testing",
                name: "Testing",
                symlinkIds: { "alias-trial": true },
                transactionIds: {}
            },
            "alias-trial": {
                kind: "symlink",
                id: "alias-trial",
                targetAliasId: "alias-testing",
                transactionIds: {}
            },
            "alias-groceries": {
                kind: "real",
                id: "alias-groceries",
                name: "Groceries",
                symlinkIds: {},
                transactionIds: {}
            }
        };

        const resolveDescriptionAliasName = (aliasId: string): string | undefined =>
            createDescriptionAliasLookup(aliases).resolve(aliasId)?.name;

        /**
         * `tx-manual` reproduces the reported defect: a manually added row is stored with an empty
         * description and only carries the alias. `tx-symlinked` points at a symlink, and
         * `tx-imported` keeps raw imported text that differs from its alias.
         */
        function createAliasedTransactions(): Transaction[] {
            const store = createEmptyStore();
            const now = Date.now();
            const rows: ReadonlyArray<{
                readonly id: string;
                readonly description: string;
                readonly notes: string;
                readonly descriptionAliasId: string | undefined;
            }> = [
                {
                    id: "tx-manual",
                    description: "",
                    notes: "",
                    descriptionAliasId: "alias-testing"
                },
                {
                    id: "tx-symlinked",
                    description: "",
                    notes: "",
                    descriptionAliasId: "alias-trial"
                },
                {
                    id: "tx-imported",
                    description: "SAFEWAY STORE 1234",
                    notes: "weekly shop",
                    descriptionAliasId: "alias-groceries"
                },
                {
                    id: "tx-unaliased",
                    description: "Bookshop",
                    notes: "",
                    descriptionAliasId: undefined
                }
            ];

            for (const [index, row] of rows.entries()) {
                insertTransaction(store, {
                    transaction: {
                        id: row.id,
                        date: Temporal.PlainDate.from("2024-03-15"),
                        description: row.description,
                        notes: row.notes,
                        amount: asMinorUnits(-1500),
                        originalAmount: undefined,
                        accountId: "acc-1",
                        tagIds: [],
                        statusId: "status-paid",
                        importId: "",
                        allocations: {},
                        creationInstant: Temporal.Instant.fromEpochMilliseconds(now - index),
                        importRowIndex: index,
                        descriptionAliasId: row.descriptionAliasId,
                        deletedAt: undefined
                    }
                });
            }

            return getAllTransactions(store);
        }

        const matchCases: ReadonlyArray<{
            readonly name: string;
            readonly search: string;
            readonly expectedIds: readonly string[];
        }> = [
            {
                name: "finds an aliased row with no stored description by its alias text",
                search: "test",
                expectedIds: ["tx-manual", "tx-symlinked"]
            },
            {
                name: "follows a one-hop symlink to the real alias name",
                search: "Testing",
                expectedIds: ["tx-manual", "tx-symlinked"]
            },
            {
                name: "still finds a row by its raw stored description",
                search: "safeway",
                expectedIds: ["tx-imported"]
            },
            {
                name: "still finds a row by its notes",
                search: "weekly",
                expectedIds: ["tx-imported"]
            },
            {
                name: "finds a row carrying both raw text and a different alias by the alias",
                search: "groceries",
                expectedIds: ["tx-imported"]
            },
            {
                name: "lowercase search matches mixed-case alias text",
                search: "groc",
                expectedIds: ["tx-imported"]
            },
            {
                name: "uppercase search matches mixed-case alias text",
                search: "GROCERIES",
                expectedIds: ["tx-imported"]
            },
            {
                name: "matches an alias substring from the middle of the name",
                search: "esti",
                expectedIds: ["tx-manual", "tx-symlinked"]
            },
            {
                name: "leaves an unaliased row findable by its description",
                search: "bookshop",
                expectedIds: ["tx-unaliased"]
            },
            {
                name: "returns nothing when neither alias, description nor notes match",
                search: "no-such-text",
                expectedIds: []
            }
        ];

        for (const { name, search, expectedIds } of matchCases) {
            it(name, () => {
                const result = filterTransactions(createAliasedTransactions(), {
                    search,
                    resolveDescriptionAliasName
                });

                expect(result.map((tx) => tx.id).sort()).toEqual([...expectedIds].sort());
            });
        }

        it("matches only the raw description and notes when no resolver is supplied", () => {
            const result = filterTransactions(createAliasedTransactions(), { search: "test" });

            expect(result).toEqual([]);
        });

        it("ignores an alias id the resolver cannot resolve", () => {
            const result = filterTransactions(createAliasedTransactions(), {
                search: "safeway",
                resolveDescriptionAliasName: () => undefined
            });

            expect(result.map((tx) => tx.id)).toEqual(["tx-imported"]);
        });
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
                originalAmount: undefined,
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
                        descriptionAliasId: undefined,
                        notes: "",
                        amount: asMinorUnits(1000),
                        originalAmount: undefined,
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
                originalAmount: undefined,
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

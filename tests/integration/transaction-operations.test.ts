/**
 * Transaction Operations Integration Tests
 *
 * Tests for transaction operations that span multiple mutations
 * and verify bucket management behavior.
 */

import { describe, expect, it } from "vitest";
import {
	deleteTransaction,
	insertTransaction,
	moveTransaction,
	type TransactionLocation,
} from "@/lib/crdt/mutations";
import { getAccountTransactions, getAllTransactions, hasDayBucket } from "@/lib/crdt/queries";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";

// Helper to create a minimal transaction input
function createTransaction(
	overrides: Partial<TransactionInput> = {}
): Omit<TransactionInput, "suspectedDuplicates"> {
	return {
		id: `tx-${Math.random().toString(36).slice(2)}`,
		date: "2024-01-15",
		description: "Test transaction",
		notes: "",
		amount: 1000,
		accountId: "acc-1",
		tagIds: [],
		statusId: "status-1",
		importId: "",
		allocations: {},
		creationInstant: Date.now(),
		importRowIndex: 0,
		deletedAt: 0,
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
			date: "2024-01-15",
			creationInstant: now,
		});
		insertTransaction(store, { transaction: tx });

		// Verify initial state
		expect(hasDayBucket(store, "acc-1", "2024-01-15")).toBe(true);
		expect(hasDayBucket(store, "acc-1", "2024-02-20")).toBe(false);

		// Move to Feb 20
		moveTransaction(store, {
			location: {
				accountId: "acc-1",
				date: "2024-01-15",
				transactionId: "tx-1",
			},
			newDate: "2024-02-20",
		});

		// Verify transaction is in new location
		expect(hasDayBucket(store, "acc-1", "2024-02-20")).toBe(true);
		const transactions = getAccountTransactions(store, "acc-1");
		expect(transactions.length).toBe(1);
		expect(transactions[0].date).toBe("2024-02-20");

		// Verify old bucket was pruned (it was the only transaction)
		expect(hasDayBucket(store, "acc-1", "2024-01-15")).toBe(false);
	});

	it("preserves other transactions when moving one transaction", () => {
		const store = createEmptyStore();
		const now = Date.now();

		// Create two transactions on same day
		insertTransaction(store, {
			transaction: createTransaction({
				id: "tx-1",
				date: "2024-01-15",
				description: "First",
				creationInstant: now,
			}),
		});
		insertTransaction(store, {
			transaction: createTransaction({
				id: "tx-2",
				date: "2024-01-15",
				description: "Second",
				creationInstant: now - 1000,
			}),
		});

		// Move first to different date
		moveTransaction(store, {
			location: {
				accountId: "acc-1",
				date: "2024-01-15",
				transactionId: "tx-1",
			},
			newDate: "2024-02-20",
		});

		// Verify original bucket still exists with remaining transaction
		expect(hasDayBucket(store, "acc-1", "2024-01-15")).toBe(true);
		const janTxs = getAccountTransactions(store, "acc-1").filter((t) => t.date === "2024-01-15");
		expect(janTxs.length).toBe(1);
		expect(janTxs[0].id).toBe("tx-2");

		// Verify moved transaction is in new location
		const febTxs = getAccountTransactions(store, "acc-1").filter((t) => t.date === "2024-02-20");
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
				date: "2024-01-15",
				creationInstant: now,
			}),
		});
		insertTransaction(store, {
			transaction: createTransaction({
				id: "tx-mar",
				date: "2024-03-15",
				creationInstant: now - 1000,
			}),
		});

		// Move Jan transaction to Feb (between existing dates)
		moveTransaction(store, {
			location: {
				accountId: "acc-1",
				date: "2024-01-15",
				transactionId: "tx-jan",
			},
			newDate: "2024-02-15",
		});

		// Verify sort order (date desc: Mar, Feb, Jan gone)
		const transactions = getAccountTransactions(store, "acc-1");
		expect(transactions.length).toBe(2);
		expect(transactions[0].date).toBe("2024-03-15");
		expect(transactions[1].date).toBe("2024-02-15");
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
					date: `2024-01-${String(day).padStart(2, "0")}`,
					importId,
					creationInstant: now,
					importRowIndex: day - 1,
				}),
			});
		}

		// Add a non-import transaction
		insertTransaction(store, {
			transaction: createTransaction({
				id: "tx-manual",
				date: "2024-01-03",
				importId: "",
				creationInstant: now + 1000,
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
					date: `2024-01-${String(day).padStart(2, "0")}`,
					transactionId: `tx-import-${day}`,
				},
			});
		}

		// Verify only manual transaction remains
		allTxs = getAllTransactions(store);
		expect(allTxs.length).toBe(1);
		expect(allTxs[0].id).toBe("tx-manual");

		// Verify empty buckets were pruned (days 1, 2, 4, 5 should be gone)
		expect(hasDayBucket(store, "acc-1", "2024-01-01")).toBe(false);
		expect(hasDayBucket(store, "acc-1", "2024-01-02")).toBe(false);
		// Day 3 still has the manual transaction
		expect(hasDayBucket(store, "acc-1", "2024-01-03")).toBe(true);
		expect(hasDayBucket(store, "acc-1", "2024-01-04")).toBe(false);
		expect(hasDayBucket(store, "acc-1", "2024-01-05")).toBe(false);
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
				date: "2024-01-15",
				accountId: "acc-1",
				creationInstant: now,
			}),
		});

		// Verify initial state
		expect(getAccountTransactions(store, "acc-1").length).toBe(1);
		expect(getAccountTransactions(store, "acc-2").length).toBe(0);

		// Move to acc-2
		moveTransaction(store, {
			location: {
				accountId: "acc-1",
				date: "2024-01-15",
				transactionId: "tx-1",
			},
			newDate: "2024-01-15",
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
				date: "2024-01-15",
				accountId: "acc-1",
				creationInstant: now,
			}),
		});

		// Move to acc-2
		moveTransaction(store, {
			location: {
				accountId: "acc-1",
				date: "2024-01-15",
				transactionId: "tx-1",
			},
			newDate: "2024-01-15",
			newAccountId: "acc-2",
		});

		// acc-1 should be pruned (empty)
		expect(store["acc-1"]).toBeUndefined();
		// acc-2 should exist
		expect(store["acc-2"]).toBeDefined();
	});
});

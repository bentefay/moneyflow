/**
 * Property-Based Tests for Transaction Ordering Invariants
 *
 * Uses fast-check to verify ordering invariants hold under all conditions.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type InsertTransactionInput, insertTransaction } from "@/lib/crdt/mutations";
import { getAccountTransactions, getAllTransactions } from "@/lib/crdt/queries";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";

// Arbitrary for generating valid dates
const dateArbitrary = fc
	.record({
		year: fc.integer({ min: 2020, max: 2030 }),
		month: fc.integer({ min: 1, max: 12 }),
		day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid dates
	})
	.map(
		({ year, month, day }) =>
			`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
	);

// Arbitrary for generating transaction inputs
const transactionArbitrary = fc
	.record({
		id: fc.uuid(),
		date: dateArbitrary,
		description: fc.string({ maxLength: 100 }),
		notes: fc.string({ maxLength: 100 }),
		amount: fc.integer({ min: -1000000, max: 1000000 }),
		accountId: fc.constantFrom("acc-1", "acc-2", "acc-3"),
		tagIds: fc.array(fc.uuid(), { maxLength: 3 }),
		statusId: fc.constantFrom("status-for-review", "status-paid"),
		importId: fc.oneof(fc.uuid(), fc.constant("")), // Empty string for manual transactions
		creationInstant: fc.integer({ min: 1000000000000, max: 2000000000000 }),
		importRowIndex: fc.integer({ min: 0, max: 1000 }),
	})
	.map((tx) => ({
		...tx,
		allocations: {},
		deletedAt: 0,
	}));

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

describe("Transaction Ordering Invariants", () => {
	it("all transactions are sorted by date descending", () => {
		fc.assert(
			fc.property(
				fc.array(transactionArbitrary, { minLength: 1, maxLength: 20 }),
				(transactions) => {
					const store = populateStore(transactions);
					const result = getAllTransactions(store);

					// Verify date descending order
					for (let i = 1; i < result.length; i++) {
						const prev = result[i - 1];
						const curr = result[i];
						expect(prev.date >= curr.date).toBe(true);
					}
				}
			),
			{ numRuns: 50 }
		);
	});

	it("within same date, sorted by creationInstant descending", () => {
		fc.assert(
			fc.property(
				fc.array(transactionArbitrary, { minLength: 2, maxLength: 20 }),
				(transactions) => {
					// Force all transactions to same date
					const sameDate = "2024-01-15";
					const sameDateTxs = transactions.map((tx) => ({
						...tx,
						date: sameDate,
					}));

					const store = populateStore(sameDateTxs);
					const result = getAllTransactions(store);

					// All should be on same date, sorted by creationInstant desc
					for (let i = 1; i < result.length; i++) {
						const prev = result[i - 1];
						const curr = result[i];

						if (prev.date === curr.date) {
							expect(prev.creationInstant >= curr.creationInstant).toBe(true);
						}
					}
				}
			),
			{ numRuns: 50 }
		);
	});

	it("within same date and creationInstant, sorted by importRowIndex ascending", () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 0, max: 100 }), {
					minLength: 2,
					maxLength: 10,
				}),
				(rowIndices) => {
					const now = Date.now();
					const sameDate = "2024-01-15";

					// Create transactions with same date and creationInstant, different importRowIndex
					const transactions = rowIndices.map((idx, i) => ({
						id: `tx-${i}`,
						date: sameDate,
						description: "",
						notes: "",
						amount: 100,
						accountId: "acc-1",
						tagIds: [] as string[],
						statusId: "status-1",
						importId: "import-1",
						allocations: {},
						creationInstant: now,
						importRowIndex: idx,
						deletedAt: 0,
					}));

					const store = populateStore(transactions);
					const result = getAccountTransactions(store, "acc-1");

					// Verify importRowIndex ascending order
					for (let i = 1; i < result.length; i++) {
						const prev = result[i - 1];
						const curr = result[i];

						if (prev.date === curr.date && prev.creationInstant === curr.creationInstant) {
							const prevIdx = prev.importRowIndex ?? Infinity;
							const currIdx = curr.importRowIndex ?? Infinity;
							expect(prevIdx <= currIdx).toBe(true);
						}
					}
				}
			),
			{ numRuns: 50 }
		);
	});

	it("manual transactions sort after imports with same creationInstant", () => {
		const now = Date.now();
		const sameDate = "2024-01-15";

		// Manual transactions use Number.MAX_SAFE_INTEGER to sort after imports
		const transactions = [
			{
				id: "tx-manual",
				date: sameDate,
				description: "Manual",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "",
				allocations: {},
				creationInstant: now,
				importRowIndex: Number.MAX_SAFE_INTEGER, // Manual - sorts last
				deletedAt: 0,
			},
			{
				id: "tx-import",
				date: sameDate,
				description: "Import",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "import-1",
				allocations: {},
				creationInstant: now,
				importRowIndex: 5,
				deletedAt: 0,
			},
		];

		const store = populateStore(transactions);
		const result = getAccountTransactions(store, "acc-1");

		// Import should come before manual (lower importRowIndex)
		expect(result[0].id).toBe("tx-import");
		expect(result[1].id).toBe("tx-manual");
	});

	it("inserting transactions maintains sorted invariant", () => {
		fc.assert(
			fc.property(
				fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
				(transactions) => {
					const store = createEmptyStore();

					// Insert one by one and verify order after each insert
					for (let i = 0; i < transactions.length; i++) {
						insertTransaction(store, { transaction: transactions[i] });

						const result = getAllTransactions(store);

						// Verify order invariants
						for (let j = 1; j < result.length; j++) {
							const prev = result[j - 1];
							const curr = result[j];

							// Primary: date descending
							if (prev.date !== curr.date) {
								expect(prev.date > curr.date).toBe(true);
							} else if (prev.creationInstant !== curr.creationInstant) {
								// Secondary: creationInstant descending
								expect(prev.creationInstant > curr.creationInstant).toBe(true);
							} else {
								// Tertiary: importRowIndex ascending
								const prevIdx = prev.importRowIndex ?? Infinity;
								const currIdx = curr.importRowIndex ?? Infinity;
								expect(prevIdx <= currIdx).toBe(true);
							}
						}
					}
				}
			),
			{ numRuns: 20 }
		);
	});

	it("account transactions maintain separate ordering", () => {
		fc.assert(
			fc.property(
				fc.array(transactionArbitrary, { minLength: 5, maxLength: 20 }),
				(transactions) => {
					const store = populateStore(transactions);

					// Check each account's transactions are properly ordered
					for (const accountId of ["acc-1", "acc-2", "acc-3"]) {
						const result = getAccountTransactions(store, accountId);

						for (let i = 1; i < result.length; i++) {
							const prev = result[i - 1];
							const curr = result[i];

							// Should all be from same account
							expect(prev.accountId).toBe(accountId);
							expect(curr.accountId).toBe(accountId);

							// Should be properly ordered
							expect(prev.date >= curr.date).toBe(true);
						}
					}
				}
			),
			{ numRuns: 30 }
		);
	});

	it("year buckets are sorted descending", () => {
		fc.assert(
			fc.property(
				fc.array(transactionArbitrary, { minLength: 3, maxLength: 15 }),
				(transactions) => {
					const store = populateStore(transactions);

					for (const accountId of Object.keys(store)) {
						const tree = store[accountId];
						if (!tree || typeof tree === "string") continue;

						// Verify years are descending
						for (let i = 1; i < tree.years.length; i++) {
							expect(tree.years[i - 1].year > tree.years[i].year).toBe(true);
						}

						// Verify months within each year are descending
						for (const yearBucket of tree.years) {
							for (let i = 1; i < yearBucket.months.length; i++) {
								expect(yearBucket.months[i - 1].month > yearBucket.months[i].month).toBe(true);
							}

							// Verify days within each month are descending
							for (const monthBucket of yearBucket.months) {
								for (let i = 1; i < monthBucket.days.length; i++) {
									expect(monthBucket.days[i - 1].day > monthBucket.days[i].day).toBe(true);
								}
							}
						}
					}
				}
			),
			{ numRuns: 30 }
		);
	});
});

describe("Edge Cases", () => {
	it("handles transactions on year boundary correctly", () => {
		const transactions = [
			{
				id: "tx-dec-31",
				date: "2023-12-31",
				description: "Last day of year",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "",
				allocations: {},
				creationInstant: Date.now(),
				importRowIndex: 0,
				deletedAt: 0,
			},
			{
				id: "tx-jan-01",
				date: "2024-01-01",
				description: "First day of year",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "",
				allocations: {},
				creationInstant: Date.now(),
				importRowIndex: 0,
				deletedAt: 0,
			},
		];

		const store = populateStore(transactions);
		const result = getAccountTransactions(store, "acc-1");

		// 2024 should come before 2023 (date desc)
		expect(result[0].id).toBe("tx-jan-01");
		expect(result[1].id).toBe("tx-dec-31");
	});

	it("handles transactions on month boundary correctly", () => {
		const transactions = [
			{
				id: "tx-jan-31",
				date: "2024-01-31",
				description: "Last day of January",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "",
				allocations: {},
				creationInstant: Date.now(),
				importRowIndex: 0,
				deletedAt: 0,
			},
			{
				id: "tx-feb-01",
				date: "2024-02-01",
				description: "First day of February",
				notes: "",
				amount: 100,
				accountId: "acc-1",
				tagIds: [] as string[],
				statusId: "status-1",
				importId: "",
				allocations: {},
				creationInstant: Date.now(),
				importRowIndex: 0,
				deletedAt: 0,
			},
		];

		const store = populateStore(transactions);
		const result = getAccountTransactions(store, "acc-1");

		// February should come before January (date desc)
		expect(result[0].id).toBe("tx-feb-01");
		expect(result[1].id).toBe("tx-jan-31");
	});

	it("handles large number of transactions efficiently", () => {
		// Generate 1000 transactions
		const transactions = Array.from({ length: 1000 }, (_, i) => ({
			id: `tx-${i}`,
			date: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
			description: `Transaction ${i}`,
			notes: "",
			amount: i * 100,
			accountId: "acc-1",
			tagIds: [] as string[],
			statusId: "status-1",
			importId: "",
			allocations: {},
			creationInstant: Date.now() - i * 1000,
			importRowIndex: 0,
			deletedAt: 0,
		}));

		const start = performance.now();
		const store = populateStore(transactions);
		const insertTime = performance.now() - start;

		const queryStart = performance.now();
		const result = getAccountTransactions(store, "acc-1");
		const queryTime = performance.now() - queryStart;

		// Should complete in reasonable time
		expect(insertTime).toBeLessThan(5000); // 5 seconds max for 1000 inserts
		expect(queryTime).toBeLessThan(100); // 100ms max for query

		// Should have all transactions
		expect(result.length).toBe(1000);

		// Verify ordering
		for (let i = 1; i < result.length; i++) {
			expect(result[i - 1].date >= result[i].date).toBe(true);
		}
	});
});

/**
 * Balance Calculation Tests
 *
 * Property-based tests for running balance, account balance,
 * and settlement balance calculations.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "@/lib/crdt/schema";
import {
	calculateAccountBalance,
	calculateAllAccountBalances,
	calculateRunningBalances,
	calculateSettlementBalances,
	calculateTableRunningBalances,
} from "@/lib/domain/balance";

// ============================================================================
// Test Helpers
// ============================================================================

/** Helper to create test accounts with proper typing */
function testAccount(data: {
	id: string;
	name: string;
	ownerships: Record<string, number>;
}): Account {
	return data as unknown as Account;
}

/** Helper to create test transactions for settlement */
function testSettlementTxs(
	txs: Array<{ amount: number; accountId: string; allocations: Record<string, number> }>
): Pick<Transaction, "amount" | "accountId" | "allocations">[] {
	return txs as unknown as Pick<Transaction, "amount" | "accountId" | "allocations">[];
}

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Generate a valid ISO date string
 */
const isoDateArb = fc
	.date({
		min: new Date("2020-01-01"),
		max: new Date("2030-12-31"),
		noInvalidDate: true,
	})
	.map((d) => d.toISOString().split("T")[0]);

/**
 * Generate a transaction amount (can be positive or negative)
 * Uses integer cents divided by 100 to avoid floating-point edge cases
 */
const amountArb = fc
	.integer({ min: -10000000, max: 10000000 }) // cents: -100k to 100k
	.map((cents) => cents / 100);

/**
 * Generate a simple transaction for testing
 */
const simpleTransactionArb = fc.record({
	id: fc.uuid(),
	date: isoDateArb,
	amount: amountArb,
	accountId: fc.constantFrom("account-1", "account-2", "account-3"),
});

/**
 * Generate a list of transactions
 */
const transactionsArb = (minLength = 0, maxLength = 50) =>
	fc.array(simpleTransactionArb, { minLength, maxLength });

// ============================================================================
// calculateRunningBalances tests
// ============================================================================

describe("calculateRunningBalances", () => {
	it("returns empty map for empty transactions", () => {
		const result = calculateRunningBalances([]);
		expect(result.size).toBe(0);
	});

	it("handles single transaction correctly", () => {
		const transactions = [{ id: "tx-1", date: "2024-01-01", amount: 100, accountId: "acc-1" }];

		const result = calculateRunningBalances(transactions);

		expect(result.get("tx-1")).toBe(100);
	});

	it("handles starting balance correctly", () => {
		const transactions = [{ id: "tx-1", date: "2024-01-01", amount: 50, accountId: "acc-1" }];

		const result = calculateRunningBalances(transactions, { "acc-1": 1000 });

		expect(result.get("tx-1")).toBe(1050);
	});

	it("calculates cumulative balance in date order", () => {
		const transactions = [
			{ id: "tx-1", date: "2024-01-01", amount: 100, accountId: "acc-1" },
			{ id: "tx-2", date: "2024-01-02", amount: -30, accountId: "acc-1" },
			{ id: "tx-3", date: "2024-01-03", amount: 50, accountId: "acc-1" },
		];

		const result = calculateRunningBalances(transactions);

		// tx-1: 0 + 100 = 100
		// tx-2: 100 - 30 = 70
		// tx-3: 70 + 50 = 120
		expect(result.get("tx-1")).toBe(100);
		expect(result.get("tx-2")).toBe(70);
		expect(result.get("tx-3")).toBe(120);
	});

	it("handles multiple accounts independently", () => {
		const transactions = [
			{ id: "tx-1", date: "2024-01-01", amount: 100, accountId: "acc-1" },
			{ id: "tx-2", date: "2024-01-01", amount: 200, accountId: "acc-2" },
			{ id: "tx-3", date: "2024-01-02", amount: 50, accountId: "acc-1" },
		];

		const result = calculateRunningBalances(transactions);

		expect(result.get("tx-1")).toBe(100);
		expect(result.get("tx-2")).toBe(200);
		expect(result.get("tx-3")).toBe(150);
	});

	// Property: running balance equals sum of transactions up to that point
	it("running balance equals cumulative sum (property-based)", () => {
		fc.assert(
			fc.property(transactionsArb(1, 20), (transactions) => {
				const result = calculateRunningBalances(transactions);

				// Group by account and verify each account's balances
				const byAccount = new Map<string, typeof transactions>();
				for (const tx of transactions) {
					const list = byAccount.get(tx.accountId) ?? [];
					list.push(tx);
					byAccount.set(tx.accountId, list);
				}

				for (const [, accountTxs] of byAccount) {
					// Sort by date like the function does
					const sorted = [...accountTxs].sort((a, b) => a.date.localeCompare(b.date));
					let expectedBalance = 0;

					for (const tx of sorted) {
						expectedBalance += tx.amount;
						const actual = result.get(tx.id);
						expect(actual).toBeCloseTo(expectedBalance, 10);
					}
				}
			})
		);
	});

	// Property: all transaction IDs have a corresponding balance
	it("all transactions have running balances (property-based)", () => {
		fc.assert(
			fc.property(transactionsArb(1, 30), (transactions) => {
				const result = calculateRunningBalances(transactions);

				for (const tx of transactions) {
					expect(result.has(tx.id)).toBe(true);
				}
			})
		);
	});
});

// ============================================================================
// calculateTableRunningBalances tests
// ============================================================================

describe("calculateTableRunningBalances", () => {
	it("uses account starting balances", () => {
		const transactions = [{ id: "tx-1", date: "2024-01-01", amount: 100, accountId: "acc-1" }];
		const accounts: Record<string, Account> = {
			"acc-1": {
				id: "acc-1",
				name: "Checking",
				balance: 500,
			} as Account,
		};

		const result = calculateTableRunningBalances(transactions, accounts);

		expect(result.get("tx-1")).toBe(600);
	});

	it("handles missing account balance as 0", () => {
		const transactions = [{ id: "tx-1", date: "2024-01-01", amount: 50, accountId: "acc-1" }];
		const accounts: Record<string, Account> = {
			"acc-1": {
				id: "acc-1",
				name: "Checking",
				// no balance property
			} as Account,
		};

		const result = calculateTableRunningBalances(transactions, accounts);

		expect(result.get("tx-1")).toBe(50);
	});
});

// ============================================================================
// calculateAccountBalance tests
// ============================================================================

describe("calculateAccountBalance", () => {
	it("returns starting balance for empty transactions", () => {
		expect(calculateAccountBalance([], 1000)).toBe(1000);
	});

	it("defaults to 0 starting balance", () => {
		expect(calculateAccountBalance([])).toBe(0);
	});

	it("sums all transaction amounts", () => {
		const transactions = [{ amount: 100 }, { amount: -30 }, { amount: 50 }];
		expect(calculateAccountBalance(transactions)).toBe(120);
	});

	it("adds to starting balance", () => {
		const transactions = [{ amount: 100 }, { amount: -30 }];
		expect(calculateAccountBalance(transactions, 500)).toBe(570);
	});

	// Property: result equals starting balance + sum of amounts
	it("balance = start + sum(amounts) (property-based)", () => {
		fc.assert(
			fc.property(
				fc.array(fc.record({ amount: amountArb }), { maxLength: 50 }),
				amountArb,
				(transactions, startingBalance) => {
					const result = calculateAccountBalance(transactions, startingBalance);
					const expected = startingBalance + transactions.reduce((sum, tx) => sum + tx.amount, 0);
					expect(result).toBeCloseTo(expected, 5); // 5 decimal places for floating-point tolerance
				}
			)
		);
	});
});

// ============================================================================
// calculateAllAccountBalances tests
// ============================================================================

describe("calculateAllAccountBalances", () => {
	it("returns starting balances for empty transactions", () => {
		const accounts: Record<string, Account> = {
			"acc-1": { id: "acc-1", name: "A", balance: 100 } as Account,
			"acc-2": { id: "acc-2", name: "B", balance: 200 } as Account,
		};

		const result = calculateAllAccountBalances([], accounts);

		expect(result.get("acc-1")).toBe(100);
		expect(result.get("acc-2")).toBe(200);
	});

	it("calculates balances per account", () => {
		const transactions = [
			{ amount: 50, accountId: "acc-1" },
			{ amount: 100, accountId: "acc-2" },
			{ amount: -20, accountId: "acc-1" },
		];
		const accounts: Record<string, Account> = {
			"acc-1": { id: "acc-1", name: "A", balance: 0 } as Account,
			"acc-2": { id: "acc-2", name: "B", balance: 0 } as Account,
		};

		const result = calculateAllAccountBalances(transactions, accounts);

		expect(result.get("acc-1")).toBe(30);
		expect(result.get("acc-2")).toBe(100);
	});

	// Property: each account balance = start + sum of its transactions
	it("per-account sum is correct (property-based)", () => {
		fc.assert(
			fc.property(transactionsArb(0, 30), (transactions) => {
				const accounts: Record<string, Account> = {
					"account-1": { id: "account-1", name: "A", balance: 100 } as Account,
					"account-2": { id: "account-2", name: "B", balance: 200 } as Account,
					"account-3": { id: "account-3", name: "C", balance: 0 } as Account,
				};

				const result = calculateAllAccountBalances(transactions, accounts);

				// Calculate expected per account
				const expected = new Map<string, number>([
					["account-1", 100],
					["account-2", 200],
					["account-3", 0],
				]);
				for (const tx of transactions) {
					expected.set(tx.accountId, (expected.get(tx.accountId) ?? 0) + tx.amount);
				}

				for (const [accountId, expectedBalance] of expected) {
					expect(result.get(accountId)).toBeCloseTo(expectedBalance, 10);
				}
			})
		);
	});
});

// ============================================================================
// calculateSettlementBalances tests
// ============================================================================

describe("calculateSettlementBalances", () => {
	it("returns empty map for empty transactions", () => {
		const result = calculateSettlementBalances([], {});
		expect(result.size).toBe(0);
	});

	it("calculates net impact for simple allocation", () => {
		// Person A owns account 100%, Person B has 50% allocation on expense
		const transactions = testSettlementTxs([
			{
				amount: -100,
				accountId: "acc-1",
				allocations: { personA: 50, personB: 50 },
			},
		]);
		const accounts = {
			"acc-1": testAccount({ id: "acc-1", name: "Checking", ownerships: { personA: 100 } }),
		};

		const result = calculateSettlementBalances(transactions, accounts);

		// Person A: allocated 50% (-50) but paid 100% (100), net = -50 + 100 = -50 (they paid for B)
		// Actually: theirShare = -100 * 50/100 = -50
		//          theirOwnership = -100 * 100/100 = -100
		//          netImpact = -50 - (-100) = 50 (they benefited from B's share)
		// Person B: allocated 50% (-50), owns 0%, net = -50 - 0 = -50 (they owe)
		expect(result.get("personA")).toBeCloseTo(50, 10);
		expect(result.get("personB")).toBeCloseTo(-50, 10);
	});

	it("handles equal ownership and allocation (no settlement needed)", () => {
		const transactions = testSettlementTxs([
			{
				amount: -100,
				accountId: "acc-1",
				allocations: { personA: 50, personB: 50 },
			},
		]);
		const accounts = {
			"acc-1": testAccount({
				id: "acc-1",
				name: "Joint",
				ownerships: { personA: 50, personB: 50 },
			}),
		};

		const result = calculateSettlementBalances(transactions, accounts);

		// Both have equal share and ownership, net impact = 0
		expect(result.get("personA")).toBeCloseTo(0, 10);
		expect(result.get("personB")).toBeCloseTo(0, 10);
	});

	it("accumulates across multiple transactions", () => {
		const transactions = testSettlementTxs([
			{ amount: -100, accountId: "acc-1", allocations: { personA: 100 } },
			{ amount: -50, accountId: "acc-1", allocations: { personB: 100 } },
		]);
		const accounts = {
			"acc-1": testAccount({ id: "acc-1", name: "A", ownerships: { personA: 100 } }),
		};

		const result = calculateSettlementBalances(transactions, accounts);

		// Transaction 1: A allocated 100%, A owns 100% -> net 0
		// Transaction 2: B allocated 100% (-50), A owns 100% (-50 ownership) -> B owes 50
		expect(result.get("personA") ?? 0).toBeCloseTo(0, 10);
		expect(result.get("personB")).toBeCloseTo(-50, 10);
	});

	// Property: sum of all settlement balances is zero (closed system)
	it("settlement balances sum to zero (property-based)", () => {
		// Generate allocations that sum to 100% (closed system requirement)
		const validAllocationsArb = fc.integer({ min: 0, max: 100 }).map((personA) => ({
			personA,
			personB: 100 - personA, // Ensure they sum to 100%
		}));

		const transactionWithAllocationsArb = fc.record({
			amount: amountArb,
			accountId: fc.constantFrom("acc-1", "acc-2"),
			allocations: validAllocationsArb,
		});

		fc.assert(
			fc.property(fc.array(transactionWithAllocationsArb, { maxLength: 20 }), (transactions) => {
				const accounts = {
					"acc-1": testAccount({
						id: "acc-1",
						name: "A",
						ownerships: { personA: 70, personB: 30 },
					}),
					"acc-2": testAccount({
						id: "acc-2",
						name: "B",
						ownerships: { personA: 50, personB: 50 },
					}),
				};

				const result = calculateSettlementBalances(testSettlementTxs(transactions), accounts);

				// Sum of all balances should be approximately zero
				let sum = 0;
				for (const balance of result.values()) {
					sum += balance;
				}

				expect(sum).toBeCloseTo(0, 5); // 5 decimal places (1e-5 tolerance)
			})
		);
	});
});

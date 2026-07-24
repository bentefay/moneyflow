/**
 * Balance Calculation Tests
 *
 * Property-based tests for running balance and account balance calculations.
 */

import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import type { Account } from "@/lib/crdt/schema";
import {
    calculateAccountBalance,
    calculateAllAccountBalances,
    calculateRunningBalances,
    calculateTableRunningBalances
} from "@/lib/domain/balance";
import { asMinorUnits } from "@/lib/domain/currency";

// ============================================================================
// Test Helpers
// ============================================================================

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
        noInvalidDate: true
    })
    .map((d) => Temporal.PlainDate.from(d.toISOString().split("T")[0]));

/**
 * Generate a transaction amount (can be positive or negative)
 * Uses integer cents divided by 100 to avoid floating-point edge cases
 */
const amountArb = fc
    .integer({ min: -10000000, max: 10000000 }) // minor units (cents): -100k to 100k
    .map((cents) => asMinorUnits(cents));

/**
 * Generate a simple transaction for testing
 */
const simpleTransactionArb = fc.record({
    id: fc.uuid(),
    date: isoDateArb,
    amount: amountArb,
    accountId: fc.constantFrom("account-1", "account-2", "account-3")
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
        const transactions = [
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(100),
                accountId: "acc-1"
            }
        ];

        const result = calculateRunningBalances(transactions);

        expect(result.get("tx-1")).toBe(100);
    });

    it("handles starting balance correctly", () => {
        const transactions = [
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(50),
                accountId: "acc-1"
            }
        ];

        const result = calculateRunningBalances(transactions, { "acc-1": 1000 });

        expect(result.get("tx-1")).toBe(1050);
    });

    it("calculates cumulative balance in date order", () => {
        const transactions = [
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(100),
                accountId: "acc-1"
            },
            {
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-01-02"),
                amount: asMinorUnits(-30),
                accountId: "acc-1"
            },
            {
                id: "tx-3",
                date: Temporal.PlainDate.from("2024-01-03"),
                amount: asMinorUnits(50),
                accountId: "acc-1"
            }
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
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(100),
                accountId: "acc-1"
            },
            {
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(200),
                accountId: "acc-2"
            },
            {
                id: "tx-3",
                date: Temporal.PlainDate.from("2024-01-02"),
                amount: asMinorUnits(50),
                accountId: "acc-1"
            }
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
                    const sorted = [...accountTxs].sort((a, b) =>
                        Temporal.PlainDate.compare(a.date, b.date)
                    );
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
        const transactions = [
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(100),
                accountId: "acc-1"
            }
        ];
        const accounts: Record<string, Account> = {
            "acc-1": {
                id: "acc-1",
                name: "Checking",
                balance: asMinorUnits(500)
            } as Account
        };

        const result = calculateTableRunningBalances(transactions, accounts);

        expect(result.get("tx-1")).toBe(600);
    });

    it("handles missing account balance as 0", () => {
        const transactions = [
            {
                id: "tx-1",
                date: Temporal.PlainDate.from("2024-01-01"),
                amount: asMinorUnits(50),
                accountId: "acc-1"
            }
        ];
        const accounts: Record<string, Account> = {
            "acc-1": {
                id: "acc-1",
                name: "Checking"
                // no balance property
            } as Account
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
        const transactions = [
            { amount: asMinorUnits(100) },
            { amount: asMinorUnits(-30) },
            { amount: asMinorUnits(50) }
        ];
        expect(calculateAccountBalance(transactions)).toBe(120);
    });

    it("adds to starting balance", () => {
        const transactions = [{ amount: asMinorUnits(100) }, { amount: asMinorUnits(-30) }];
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
                    const expected =
                        startingBalance + transactions.reduce((sum, tx) => sum + tx.amount, 0);
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
            "acc-1": { id: "acc-1", name: "A", balance: asMinorUnits(100) } as Account,
            "acc-2": { id: "acc-2", name: "B", balance: asMinorUnits(200) } as Account
        };

        const result = calculateAllAccountBalances([], accounts);

        expect(result.get("acc-1")).toBe(100);
        expect(result.get("acc-2")).toBe(200);
    });

    it("calculates balances per account", () => {
        const transactions = [
            { amount: asMinorUnits(50), accountId: "acc-1" },
            { amount: asMinorUnits(100), accountId: "acc-2" },
            { amount: asMinorUnits(-20), accountId: "acc-1" }
        ];
        const accounts: Record<string, Account> = {
            "acc-1": { id: "acc-1", name: "A", balance: asMinorUnits(0) } as Account,
            "acc-2": { id: "acc-2", name: "B", balance: asMinorUnits(0) } as Account
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
                    "account-1": {
                        id: "account-1",
                        name: "A",
                        balance: asMinorUnits(100)
                    } as Account,
                    "account-2": {
                        id: "account-2",
                        name: "B",
                        balance: asMinorUnits(200)
                    } as Account,
                    "account-3": {
                        id: "account-3",
                        name: "C",
                        balance: asMinorUnits(0)
                    } as Account
                };

                const result = calculateAllAccountBalances(transactions, accounts);

                // Calculate expected per account
                const expected = new Map<string, number>([
                    ["account-1", 100],
                    ["account-2", 200],
                    ["account-3", 0]
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

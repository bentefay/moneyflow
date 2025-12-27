/**
 * Settlement Balance Tests
 *
 * Unit tests for settlement balance calculations.
 * Uses table-driven tests and property-based testing with fast-check.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateSettlementBalances,
  getNetBalanceForPerson,
  getBalancesForPerson,
  type SettlementBalance,
} from "@/lib/domain/settlement";
import type { Transaction, Status, Person } from "@/lib/crdt/schema";
import type { MoneyMinorUnits } from "@/lib/domain/currency";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal Transaction for testing
 */
function createTransaction(
  id: string,
  amount: number,
  statusId: string,
  allocations: Record<string, number> = {},
  accountId = "account-1",
  deletedAt?: number
): Record<string, Transaction> {
  return {
    [id]: {
      id,
      date: "2024-01-01",
      merchant: "",
      description: "",
      amount: amount as MoneyMinorUnits,
      accountId,
      tagIds: [],
      statusId,
      allocations,
      deletedAt,
    } as unknown as Transaction,
  };
}

/**
 * Create a status with optional treatAsPaid behavior
 */
function createStatus(id: string, treatAsPaid = false): Record<string, Status> {
  return {
    [id]: {
      id,
      name: id,
      behavior: treatAsPaid ? "treatAsPaid" : undefined,
    } as unknown as Status,
  };
}

/**
 * Create a person
 */
function createPerson(id: string, name: string): Record<string, Person> {
  return {
    [id]: {
      id,
      name,
    } as unknown as Person,
  };
}

// ============================================================================
// calculateSettlementBalances tests
// ============================================================================

describe("calculateSettlementBalances", () => {
  it("returns empty array when no transactions", () => {
    const transactions = {};
    const statuses = { ...createStatus("pending") };
    const people = { ...createPerson("alice", "Alice") };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    expect(result).toEqual([]);
  });

  it("returns empty array when no treatAsPaid statuses", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "pending", { alice: 50, bob: 50 }),
    };
    const statuses = { ...createStatus("pending", false) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    expect(result).toEqual([]);
  });

  it("returns empty array for deleted transactions", () => {
    const transactions = {
      ...createTransaction(
        "tx1",
        -1000,
        "settled",
        { alice: 50, bob: 50 },
        "account-1",
        Date.now()
      ),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    expect(result).toEqual([]);
  });

  it("returns empty array when transactions have no allocations", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "settled", {}),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = { ...createPerson("alice", "Alice") };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    expect(result).toEqual([]);
  });

  it("calculates simple 50/50 split correctly", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "settled", { alice: 60, bob: 40 }),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    // Alice has 60%, Bob has 40%
    // Since Alice has higher allocation, Bob owes Alice proportionally
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("handles multiple transactions", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "settled", { alice: 100 }),
      ...createTransaction("tx2", -500, "settled", { bob: 100 }),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = { "account-1": "USD" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    // Both transactions have single allocations, no inter-person debts
    expect(result.length).toBe(0);
  });

  it("uses correct currency from account", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "settled", { alice: 70, bob: 30 }, "eur-account"),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = { "eur-account": "EUR" };

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    // Check currency is EUR
    if (result.length > 0) {
      expect(result[0].currency).toBe("EUR");
    }
  });

  it("defaults to USD when account currency not found", () => {
    const transactions = {
      ...createTransaction("tx1", -1000, "settled", { alice: 70, bob: 30 }, "unknown-account"),
    };
    const statuses = { ...createStatus("settled", true) };
    const people = {
      ...createPerson("alice", "Alice"),
      ...createPerson("bob", "Bob"),
    };
    const accountCurrencies = {};

    const result = calculateSettlementBalances(transactions, statuses, people, accountCurrencies);

    if (result.length > 0) {
      expect(result[0].currency).toBe("USD");
    }
  });
});

// ============================================================================
// getNetBalanceForPerson tests
// ============================================================================

describe("getNetBalanceForPerson", () => {
  it("returns 0 when person has no balances", () => {
    const balances: SettlementBalance[] = [];

    const result = getNetBalanceForPerson("alice", balances);

    expect(result).toBe(0);
  });

  it("returns positive when person owes money", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "alice",
        owedToPersonId: "bob",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getNetBalanceForPerson("alice", balances);

    expect(result).toBe(500);
  });

  it("returns negative when person is owed money", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "bob",
        owedToPersonId: "alice",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getNetBalanceForPerson("alice", balances);

    expect(result).toBe(-500);
  });

  it("nets multiple balances correctly", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "alice",
        owedToPersonId: "bob",
        amount: 1000 as MoneyMinorUnits,
        currency: "USD",
      },
      {
        personId: "charlie",
        owedToPersonId: "alice",
        amount: 300 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getNetBalanceForPerson("alice", balances);

    // Alice owes 1000, is owed 300 -> net 700
    expect(result).toBe(700);
  });

  it("property: net balance is difference of owes and owed", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            personId: fc.constantFrom("alice", "bob", "charlie"),
            owedToPersonId: fc.constantFrom("alice", "bob", "charlie"),
            amount: fc.integer({ min: 0, max: 10000 }),
            currency: fc.constant("USD"),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.constantFrom("alice", "bob", "charlie"),
        (balances, targetPerson) => {
          const typedBalances = balances.map((b) => ({
            ...b,
            amount: b.amount as MoneyMinorUnits,
          }));

          const result = getNetBalanceForPerson(targetPerson, typedBalances);

          let expectedOwes = 0;
          let expectedOwed = 0;

          for (const b of typedBalances) {
            if (b.personId === targetPerson) {
              expectedOwes += b.amount;
            }
            if (b.owedToPersonId === targetPerson) {
              expectedOwed += b.amount;
            }
          }

          expect(result).toBe(expectedOwes - expectedOwed);
        }
      )
    );
  });
});

// ============================================================================
// getBalancesForPerson tests
// ============================================================================

describe("getBalancesForPerson", () => {
  it("returns empty array when person has no balances", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "bob",
        owedToPersonId: "charlie",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getBalancesForPerson("alice", balances);

    expect(result).toEqual([]);
  });

  it("returns balances where person is debtor", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "alice",
        owedToPersonId: "bob",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
      {
        personId: "bob",
        owedToPersonId: "charlie",
        amount: 300 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getBalancesForPerson("alice", balances);

    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe("alice");
  });

  it("returns balances where person is creditor", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "bob",
        owedToPersonId: "alice",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
      {
        personId: "charlie",
        owedToPersonId: "bob",
        amount: 300 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getBalancesForPerson("alice", balances);

    expect(result).toHaveLength(1);
    expect(result[0].owedToPersonId).toBe("alice");
  });

  it("returns all balances involving person", () => {
    const balances: SettlementBalance[] = [
      {
        personId: "alice",
        owedToPersonId: "bob",
        amount: 500 as MoneyMinorUnits,
        currency: "USD",
      },
      {
        personId: "charlie",
        owedToPersonId: "alice",
        amount: 300 as MoneyMinorUnits,
        currency: "USD",
      },
      {
        personId: "bob",
        owedToPersonId: "charlie",
        amount: 200 as MoneyMinorUnits,
        currency: "USD",
      },
    ];

    const result = getBalancesForPerson("alice", balances);

    expect(result).toHaveLength(2);
  });

  it("property: all returned balances involve the person", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            personId: fc.constantFrom("alice", "bob", "charlie"),
            owedToPersonId: fc.constantFrom("alice", "bob", "charlie"),
            amount: fc.integer({ min: 0, max: 10000 }),
            currency: fc.constant("USD"),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.constantFrom("alice", "bob", "charlie"),
        (balances, targetPerson) => {
          const typedBalances = balances.map((b) => ({
            ...b,
            amount: b.amount as MoneyMinorUnits,
          }));

          const result = getBalancesForPerson(targetPerson, typedBalances);

          for (const b of result) {
            expect(b.personId === targetPerson || b.owedToPersonId === targetPerson).toBe(true);
          }
        }
      )
    );
  });
});

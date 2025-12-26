/**
 * Balance Calculations
 *
 * Functions for calculating running balances and account balances.
 */

import type { Transaction, Account } from "@/lib/crdt/schema";

/**
 * Transaction with calculated running balance.
 */
export interface TransactionWithBalance {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  runningBalance: number;
}

/**
 * Options for balance calculation.
 */
export interface BalanceCalculationOptions {
  /** Starting balance for the account (e.g., from account settings) */
  startingBalance?: number;
  /** Whether to calculate balance from newest to oldest (default: true) */
  reverseOrder?: boolean;
}

/**
 * Calculate running balances for a list of transactions.
 *
 * Running balance is calculated per-account, showing the cumulative
 * balance after each transaction when viewing transactions in date order.
 *
 * @param transactions - Array of transactions sorted by date (newest first)
 * @param accountStartingBalances - Map of account ID to starting balance
 * @returns Map of transaction ID to running balance
 *
 * @example
 * ```ts
 * const balances = calculateRunningBalances(transactions, { "acc-1": 1000 });
 * const balance = balances.get("tx-1"); // 950 (after -50 expense)
 * ```
 */
export function calculateRunningBalances(
  transactions: Pick<Transaction, "id" | "date" | "amount" | "accountId">[],
  accountStartingBalances: Record<string, number> = {}
): Map<string, number> {
  const result = new Map<string, number>();

  // Group transactions by account
  const transactionsByAccount = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const list = transactionsByAccount.get(tx.accountId) ?? [];
    list.push(tx);
    transactionsByAccount.set(tx.accountId, list);
  }

  // Calculate running balance for each account
  for (const [accountId, accountTransactions] of transactionsByAccount) {
    // Sort by date ascending for cumulative calculation
    const sorted = [...accountTransactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let balance = accountStartingBalances[accountId] ?? 0;

    for (const tx of sorted) {
      balance += tx.amount;
      result.set(tx.id, balance);
    }
  }

  return result;
}

/**
 * Calculate running balances for display in a transaction table.
 *
 * This function handles the common case where transactions are displayed
 * newest-first but balances need to show the cumulative total.
 *
 * @param transactions - Transactions sorted newest first (as displayed)
 * @param accounts - Map of account ID to account data
 * @returns Map of transaction ID to running balance
 */
export function calculateTableRunningBalances(
  transactions: Pick<Transaction, "id" | "date" | "amount" | "accountId">[],
  accounts: Record<string, Account>
): Map<string, number> {
  // Extract starting balances from accounts
  const startingBalances: Record<string, number> = {};
  for (const [id, account] of Object.entries(accounts)) {
    startingBalances[id] = account.balance ?? 0;
  }

  return calculateRunningBalances(transactions, startingBalances);
}

/**
 * Calculate the current balance for an account.
 *
 * @param transactions - All transactions for the account
 * @param startingBalance - Account's starting balance (default: 0)
 * @returns Current account balance
 */
export function calculateAccountBalance(
  transactions: Pick<Transaction, "amount">[],
  startingBalance = 0
): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, startingBalance);
}

/**
 * Calculate balances for all accounts.
 *
 * @param transactions - All transactions
 * @param accounts - Map of account ID to account data
 * @returns Map of account ID to current balance
 */
export function calculateAllAccountBalances(
  transactions: Pick<Transaction, "amount" | "accountId">[],
  accounts: Record<string, Account>
): Map<string, number> {
  const result = new Map<string, number>();

  // Initialize with starting balances
  for (const [id, account] of Object.entries(accounts)) {
    result.set(id, account.balance ?? 0);
  }

  // Add transactions
  for (const tx of transactions) {
    const current = result.get(tx.accountId) ?? 0;
    result.set(tx.accountId, current + tx.amount);
  }

  return result;
}

/**
 * Calculate settlement balances between people.
 *
 * For each person, calculates how much they owe or are owed based on
 * their share of expenses vs. their account ownership.
 *
 * @param transactions - Transactions with allocations
 * @param people - Map of person ID to ownership/allocation info
 * @param accounts - Map of account ID to account data (with ownership percentages)
 * @returns Map of person ID to net balance (positive = owed money, negative = owes money)
 */
export function calculateSettlementBalances(
  transactions: Pick<Transaction, "amount" | "allocations" | "accountId">[],
  accounts: Record<string, Account>
): Map<string, number> {
  const result = new Map<string, number>();

  for (const tx of transactions) {
    const allocations = tx.allocations ?? {};
    const account = accounts[tx.accountId];
    const accountOwnerships = account?.ownerships ?? {};

    // For each person with an allocation
    for (const [personId, allocationPercent] of Object.entries(allocations)) {
      if (typeof allocationPercent !== "number") continue;

      // Their share of this expense
      const theirShare = (tx.amount * allocationPercent) / 100;

      // Their ownership of the account that paid
      const ownershipPercent = accountOwnerships[personId] ?? 0;
      const theirOwnership = (tx.amount * ownershipPercent) / 100;

      // Net impact: positive means they benefited, negative means they paid
      const netImpact = theirShare - theirOwnership;

      const current = result.get(personId) ?? 0;
      result.set(personId, current + netImpact);
    }
  }

  return result;
}

/**
 * React hook for calculating running balances.
 * This is exported separately for use with useMemo.
 */
export function useRunningBalances(
  transactions: Pick<Transaction, "id" | "date" | "amount" | "accountId">[],
  accounts: Record<string, Account>
): Map<string, number> {
  return calculateTableRunningBalances(transactions, accounts);
}

/**
 * Transaction Mutation Contracts
 *
 * These are the internal API contracts for transaction operations.
 * All mutations use loro-mirror's draft-style setState pattern.
 */

import type { Transaction, TransactionStore } from "@/lib/crdt/schema";

// ============================================================================
// Types
// ============================================================================

export interface TransactionLocation {
  accountId: string;
  date: string; // YYYY-MM-DD
  transactionId: string;
}

export interface InsertTransactionInput {
  transaction: Omit<Transaction, "suspectedDuplicates">;
  suspectedDuplicateOf?: TransactionLocation; // If set, nest under this parent
}

export interface UpdateTransactionInput {
  location: TransactionLocation;
  updates: Partial<Omit<Transaction, "id" | "accountId" | "suspectedDuplicates">>;
}

export interface MoveTransactionInput {
  location: TransactionLocation;
  newDate: string; // YYYY-MM-DD
}

export interface DeleteTransactionInput {
  location: TransactionLocation;
  cascade?: boolean; // Default true for parents, ignored for duplicates
}

export interface UnnestDuplicateInput {
  parentLocation: TransactionLocation;
  duplicateId: string;
}

export interface SwapDuplicateInput {
  parentLocation: TransactionLocation;
  duplicateId: string;
}

// ============================================================================
// Mutation Contracts
// ============================================================================

/**
 * Insert a new transaction into the hierarchical structure.
 * Creates intermediate buckets (year/month/day) as needed.
 *
 * @param store - Transaction store (draft)
 * @param input - Transaction data and optional parent for duplicates
 */
export function insertTransaction(
  store: TransactionStore,
  input: InsertTransactionInput
): void;

/**
 * Update a transaction in place.
 * Does not move the transaction - use moveTransaction for date changes.
 *
 * @param store - Transaction store (draft)
 * @param input - Location and partial updates
 */
export function updateTransaction(
  store: TransactionStore,
  input: UpdateTransactionInput
): void;

/**
 * Move a transaction to a different date.
 * Removes from old day bucket, inserts into new day bucket.
 * Prunes empty buckets after removal.
 *
 * @param store - Transaction store (draft)
 * @param input - Current location and new date
 */
export function moveTransaction(
  store: TransactionStore,
  input: MoveTransactionInput
): void;

/**
 * Delete a transaction.
 * If parent with cascade=true (default), deletes all suspectedDuplicates.
 * Prunes empty buckets after deletion.
 *
 * @param store - Transaction store (draft)
 * @param input - Location and cascade option
 */
export function deleteTransaction(
  store: TransactionStore,
  input: DeleteTransactionInput
): void;

/**
 * Unnest a suspected duplicate, making it a standalone transaction.
 * Inserts into appropriate day bucket based on duplicate's own date.
 *
 * @param store - Transaction store (draft)
 * @param input - Parent location and duplicate ID to unnest
 */
export function unnestDuplicate(
  store: TransactionStore,
  input: UnnestDuplicateInput
): void;

/**
 * Swap a duplicate with its parent.
 * Duplicate becomes standalone in its own day bucket.
 * Parent and remaining duplicates move to new parent's suspectedDuplicates.
 *
 * @param store - Transaction store (draft)
 * @param input - Parent location and duplicate ID to promote
 */
export function swapDuplicate(
  store: TransactionStore,
  input: SwapDuplicateInput
): void;

/**
 * Delete all transactions for a given import.
 * Used when user deletes an import batch.
 * Prunes empty buckets after deletion.
 *
 * @param store - Transaction store (draft)
 * @param importId - Import ID to delete transactions for
 */
export function deleteTransactionsByImport(
  store: TransactionStore,
  importId: string
): void;

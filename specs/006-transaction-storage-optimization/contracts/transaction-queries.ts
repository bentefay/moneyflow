/**
 * Transaction Query Contracts
 *
 * These are the internal API contracts for transaction queries.
 * All queries are pure functions that read from the transaction store.
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

export interface TransactionFilter {
	accountIds?: string[];
	dateRange?: { start: string; end: string }; // YYYY-MM-DD
	tagIds?: string[];
	statusIds?: string[];
	personIds?: string[];
	search?: string;
	showDuplicatesOnly?: boolean;
	excludeDeleted?: boolean;
}

export interface PaginationOptions {
	offset?: number;
	limit?: number;
}

export interface TransactionWithDuplicates extends Transaction {
	hasDuplicates: boolean;
	duplicateCount: number;
}

// ============================================================================
// Query Contracts
// ============================================================================

/**
 * Get all transactions for an account, sorted by date desc, creationInstant desc, importRowIndex asc.
 * Handles potential duplicate day buckets from CRDT conflicts.
 *
 * @param store - Transaction store
 * @param accountId - Account to query
 * @returns Sorted array of transactions
 */
export function getAccountTransactions(store: TransactionStore, accountId: string): Transaction[];

/**
 * Get all transactions across all accounts, sorted.
 *
 * @param store - Transaction store
 * @returns Sorted array of transactions
 */
export function getAllTransactions(store: TransactionStore): Transaction[];

/**
 * Find a specific transaction by location.
 * Also searches within suspectedDuplicates.
 *
 * @param store - Transaction store
 * @param location - Account, date, and transaction ID
 * @returns Transaction if found, undefined otherwise
 */
export function findTransaction(
	store: TransactionStore,
	location: TransactionLocation
): Transaction | undefined;

/**
 * Find a transaction by ID alone (slower - scans all).
 * Use findTransaction with location when possible.
 *
 * @param store - Transaction store
 * @param transactionId - Transaction ID to find
 * @returns Transaction and its location if found
 */
export function findTransactionById(
	store: TransactionStore,
	transactionId: string
): { transaction: Transaction; location: TransactionLocation } | undefined;

/**
 * Filter transactions with various criteria.
 *
 * @param transactions - Array of transactions to filter
 * @param filter - Filter criteria
 * @returns Filtered array of transactions
 */
export function filterTransactions(
	transactions: Transaction[],
	filter: TransactionFilter
): Transaction[];

/**
 * Paginate a transaction array.
 *
 * @param transactions - Array of transactions
 * @param options - Offset and limit
 * @returns Paginated slice
 */
export function paginateTransactions(
	transactions: Transaction[],
	options: PaginationOptions
): Transaction[];

/**
 * Get transactions that have suspected duplicates (for "Show Duplicates" filter).
 * Returns parent transactions only, with duplicate count.
 *
 * @param store - Transaction store
 * @param accountId - Optional account filter
 * @returns Transactions with hasDuplicates and duplicateCount
 */
export function getTransactionsWithDuplicates(
	store: TransactionStore,
	accountId?: string
): TransactionWithDuplicates[];

/**
 * Get existing transactions within date range for duplicate detection.
 * Returns transactions sorted by date ascending for merge-scan algorithm.
 *
 * @param store - Transaction store
 * @param accountId - Account to search
 * @param dateRange - Start and end dates (inclusive)
 * @returns Transactions sorted by date ascending
 */
export function getTransactionsInDateRange(
	store: TransactionStore,
	accountId: string,
	dateRange: { start: string; end: string }
): Transaction[];

/**
 * Check if a day bucket exists for the given date.
 * Used to determine if we need to create a new bucket or find existing.
 *
 * @param store - Transaction store
 * @param accountId - Account to check
 * @param date - Date to check (YYYY-MM-DD)
 * @returns True if bucket exists
 */
export function hasDayBucket(store: TransactionStore, accountId: string, date: string): boolean;

/**
 * Get or create the path to a day bucket.
 * Creates intermediate year/month buckets as needed.
 * Handles potential duplicate buckets from CRDT conflicts.
 *
 * @param store - Transaction store (may be mutated if creating)
 * @param accountId - Account
 * @param date - Date (YYYY-MM-DD)
 * @returns Day bucket (may be newly created)
 */
export function getOrCreateDayBucket(
	store: TransactionStore,
	accountId: string,
	date: string
): DayBucket;

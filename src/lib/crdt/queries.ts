/**
 * CRDT Query Utilities
 *
 * Provides pagination and filtering utilities for hierarchical transaction storage.
 * These utilities work on top of loro-mirror state to provide
 * efficient data access patterns for UI components.
 */

import { Temporal } from "temporal-polyfill";

import {
    getActiveDescriptionAliases as selectActiveDescriptionAliases,
    type DescriptionAlias,
    type DescriptionAliasNameResolver
} from "@/lib/domain/description-aliases";

import { isPublicTransaction } from "./schema";
import type {
    DayBucket,
    MonthBucket,
    NestedDuplicate,
    Transaction,
    TransactionStore,
    VaultState
} from "./schema";

// ============================================
// PAGINATION TYPES
// ============================================

export interface PaginationOptions {
    /** Number of items to return per page */
    pageSize: number;
    /** Current page number (0-indexed) */
    page: number;
}

export interface PaginatedResult<T> {
    /** Items for the current page */
    items: T[];
    /** Total number of items matching the query */
    totalCount: number;
    /** Total number of pages */
    totalPages: number;
    /** Current page number (0-indexed) */
    currentPage: number;
    /** Whether there are more pages */
    hasNextPage: boolean;
    /** Whether there are previous pages */
    hasPreviousPage: boolean;
}

// ============================================
// TRANSACTION QUERY OPTIONS
// ============================================

export interface TransactionQueryOptions {
    /** Date range filter */
    dateRange?: {
        start?: Temporal.PlainDate;
        end?: Temporal.PlainDate;
    };
    /** Filter by tag IDs (any match) */
    tagIds?: string[];
    /** Filter by person IDs (any allocation match) */
    personIds?: string[];
    /** Filter by account IDs */
    accountIds?: string[];
    /** Filter by status IDs */
    statusIds?: string[];
    /** Free text search in description/notes, and in the alias-resolved description when resolvable */
    search?: string;
    /**
     * Resolves a transaction's `descriptionAliasId` to the name the table displays for it.
     * Supplied by callers that hold the alias collection; when absent, search still matches the raw
     * stored description and notes, so no existing caller changes behaviour.
     */
    resolveDescriptionAliasName?: DescriptionAliasNameResolver;
    /** Only show transactions with suspected duplicates */
    showDuplicatesOnly?: boolean;
    /** Exclude soft-deleted transactions */
    excludeDeleted?: boolean;
    /** Sort by field */
    sortBy?: "date" | "amount" | "description";
    /** Sort direction */
    sortDirection?: "asc" | "desc";
}

// ============================================
// TRANSACTION LOCATION TYPE
// ============================================

export interface TransactionLocation {
    accountId: string;
    date: Temporal.PlainDate;
    transactionId: string;
}

export interface TransactionWithLocation extends Transaction {
    location: TransactionLocation;
}

/**
 * Peer-independent transaction order used at every flat read boundary.
 * The stable ID tie-breaker is required because concurrent list inserts with
 * otherwise identical sort keys may be materialized in different local order.
 */
interface TransactionOrderKey {
    readonly creationInstant: Temporal.Instant;
    readonly date: Temporal.PlainDate;
    readonly id: string;
    readonly importRowIndex?: number;
}

export function compareTransactionOrder(
    left: TransactionOrderKey,
    right: TransactionOrderKey
): number {
    const dateCompare = Temporal.PlainDate.compare(right.date, left.date);
    if (dateCompare !== 0) return dateCompare;

    const instantCompare = Temporal.Instant.compare(right.creationInstant, left.creationInstant);
    if (instantCompare !== 0) return instantCompare;

    // Explicit three-way comparison: subtraction yields NaN when both sides are Infinity,
    // which would swallow the id tie-breaker and make the order input-dependent across peers.
    const leftIndex = left.importRowIndex ?? Infinity;
    const rightIndex = right.importRowIndex ?? Infinity;
    if (leftIndex < rightIndex) return -1;
    if (leftIndex > rightIndex) return 1;

    return left.id.localeCompare(right.id);
}

function preferCanonicalTransaction(left: Transaction, right: Transaction): Transaction {
    return canonicalTransactionKey(left).localeCompare(canonicalTransactionKey(right)) <= 0
        ? left
        : right;
}

function canonicalTransactionKey(transaction: Transaction): string {
    return (
        transaction.$cid ??
        JSON.stringify({
            accountId: transaction.accountId,
            allocations: Object.entries(transaction.allocations).sort(([left], [right]) =>
                left.localeCompare(right)
            ),
            amount: transaction.amount,
            originalAmount: transaction.originalAmount,
            creationInstant: transaction.creationInstant.toString(),
            date: transaction.date.toString(),
            deletedAt: transaction.deletedAt?.toString(),
            description: transaction.description,
            descriptionAliasId: transaction.descriptionAliasId,
            importId: transaction.importId,
            importRowIndex: transaction.importRowIndex,
            notes: transaction.notes,
            statusId: transaction.statusId,
            tagIds: [...transaction.tagIds]
        })
    );
}

function materializeNestedTransaction(duplicate: NestedDuplicate): Transaction {
    return { ...duplicate, suspectedDuplicates: [] };
}

/** Collapse temporary physical relocation copies to one logical transaction. */
export function getCanonicalTransactions(transactions: Iterable<Transaction>): Transaction[] {
    const byId = new Map<string, Transaction>();

    for (const transaction of transactions) {
        if (!isPublicTransaction(transaction)) continue;
        const existing = byId.get(transaction.id);
        byId.set(
            transaction.id,
            existing ? preferCanonicalTransaction(existing, transaction) : transaction
        );
    }

    return Array.from(byId.values()).sort(compareTransactionOrder);
}

// ============================================
// DATE HELPERS
// ============================================

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get active (non-deleted) items from a collection
 * Filters out soft-deleted items and non-object values (loro-mirror may include $cid strings)
 */
export function getActiveItems<T extends { deletedAt?: Temporal.Instant }>(
    collection: Record<string, T | string>
): T[] {
    return Object.values(collection)
        .filter((item): item is T => typeof item === "object" && item !== null)
        .filter((item) => !item.deletedAt);
}

// ============================================
// HIERARCHICAL TRANSACTION QUERIES
// ============================================

/**
 * Get all transactions for an account, sorted by date desc, creationInstant desc, importRowIndex asc.
 * Handles potential duplicate day buckets from CRDT conflicts by unioning them.
 */
export function getAccountTransactions(store: TransactionStore, accountId: string): Transaction[] {
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return [];

    const result: Transaction[] = [];

    // Iterate through years (already sorted desc)
    for (const yearBucket of tree.years) {
        // Group months by month number to handle CRDT duplicates
        const monthGroups = new Map<number, MonthBucket[]>();
        for (const monthBucket of yearBucket.months) {
            const existing = monthGroups.get(monthBucket.month) ?? [];
            existing.push(monthBucket);
            monthGroups.set(monthBucket.month, existing);
        }

        // Process months in descending order
        const sortedMonths = [...monthGroups].sort(([left], [right]) => right - left);
        for (const [, monthBuckets] of sortedMonths) {
            // Group days by day number to handle CRDT duplicates
            const dayGroups = new Map<number, DayBucket[]>();
            for (const monthBucket of monthBuckets) {
                for (const dayBucket of monthBucket.days) {
                    const existing = dayGroups.get(dayBucket.day) ?? [];
                    existing.push(dayBucket);
                    dayGroups.set(dayBucket.day, existing);
                }
            }

            // Process days in descending order
            const sortedDays = [...dayGroups].sort(([left], [right]) => right - left);
            for (const [, dayBuckets] of sortedDays) {
                // Union transactions from all same-day buckets
                for (const dayBucket of dayBuckets) {
                    result.push(...dayBucket.transactions);
                }
            }
        }
    }

    return getCanonicalTransactions(result);
}

/**
 * Get all transactions across all accounts, sorted.
 * Merges transactions from all accounts while maintaining sort order.
 */
export function getAllTransactions(store: TransactionStore): Transaction[] {
    const allTransactions: Transaction[] = [];

    for (const accountId of Object.keys(store)) {
        const tree = store[accountId];
        if (!tree || typeof tree === "string") continue;
        allTransactions.push(...getAccountTransactions(store, accountId));
    }

    return getCanonicalTransactions(allTransactions);
}

/**
 * Enumerate every active public logical transaction identity, including nested duplicates.
 *
 * Active physical representations are filtered before canonicalization so a deleted relocation
 * copy cannot hide an active copy of the same logical ID.
 */
export function getActivePublicTransactionIdentities(store: TransactionStore): Transaction[] {
    const activeRepresentations: Transaction[] = [];

    for (const tree of Object.values(store)) {
        if (!tree || typeof tree === "string") continue;

        for (const yearBucket of tree.years) {
            for (const monthBucket of yearBucket.months) {
                for (const dayBucket of monthBucket.days) {
                    for (const transaction of dayBucket.transactions) {
                        if (!isPublicTransaction(transaction)) continue;
                        if (!transaction.deletedAt) activeRepresentations.push(transaction);

                        for (const duplicate of transaction.suspectedDuplicates) {
                            const nestedTransaction = materializeNestedTransaction(duplicate);
                            if (!nestedTransaction.deletedAt) {
                                activeRepresentations.push(nestedTransaction);
                            }
                        }
                    }
                }
            }
        }
    }

    return getCanonicalTransactions(activeRepresentations);
}

/**
 * Find a specific transaction by location.
 * Also searches within suspectedDuplicates.
 */
export function findTransaction(
    store: TransactionStore,
    location: TransactionLocation
): Transaction | undefined {
    const { accountId, date, transactionId } = location;
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return undefined;

    const { year, month, day } = date;

    const matches: Transaction[] = [];
    for (const yearBucket of tree.years) {
        if (yearBucket.year !== year) continue;

        for (const monthBucket of yearBucket.months) {
            if (monthBucket.month !== month) continue;

            for (const dayBucket of monthBucket.days) {
                if (dayBucket.day !== day) continue;

                matches.push(
                    ...dayBucket.transactions.filter(
                        (transaction) =>
                            isPublicTransaction(transaction) && transaction.id === transactionId
                    )
                );
                for (const t of dayBucket.transactions) {
                    if (!isPublicTransaction(t)) continue;
                    matches.push(
                        ...t.suspectedDuplicates
                            .filter((duplicate) => duplicate.id === transactionId)
                            .map(materializeNestedTransaction)
                    );
                }
            }
        }
    }

    return getCanonicalTransactions(matches)[0];
}

/**
 * Find a transaction by ID alone (slower - scans all).
 * Use findTransaction with location when possible.
 */
export function findTransactionById(
    store: TransactionStore,
    transactionId: string
): { transaction: Transaction; location: TransactionLocation } | undefined {
    const matches: Array<{ transaction: Transaction; location: TransactionLocation }> = [];
    for (const accountId of Object.keys(store).sort()) {
        const tree = store[accountId];
        if (!tree || typeof tree === "string") continue;

        for (const yearBucket of tree.years) {
            for (const monthBucket of yearBucket.months) {
                for (const dayBucket of monthBucket.days) {
                    for (const tx of dayBucket.transactions) {
                        if (!isPublicTransaction(tx)) continue;
                        if (tx.id === transactionId) {
                            matches.push({
                                transaction: tx,
                                location: {
                                    accountId,
                                    date: tx.date,
                                    transactionId
                                }
                            });
                        }
                        for (const duplicate of tx.suspectedDuplicates) {
                            if (duplicate.id !== transactionId) continue;
                            matches.push({
                                transaction: materializeNestedTransaction(duplicate),
                                location: {
                                    accountId,
                                    date: tx.date,
                                    transactionId
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    return matches.sort((left, right) => {
        const transactionCompare = canonicalTransactionKey(left.transaction).localeCompare(
            canonicalTransactionKey(right.transaction)
        );
        if (transactionCompare !== 0) return transactionCompare;
        const accountCompare = left.location.accountId.localeCompare(right.location.accountId);
        if (accountCompare !== 0) return accountCompare;
        return Temporal.PlainDate.compare(left.location.date, right.location.date);
    })[0];
}

/**
 * Get transactions within a date range for duplicate detection.
 * Returns transactions sorted by date ascending for merge-scan algorithm.
 */
export function getTransactionsInDateRange(
    store: TransactionStore,
    accountId: string,
    dateRange: { start: Temporal.PlainDate; end: Temporal.PlainDate }
): Transaction[] {
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return [];

    const startParsed = dateRange.start;
    const endParsed = dateRange.end;

    const result: Transaction[] = [];

    for (const yearBucket of tree.years) {
        if (yearBucket.year < startParsed.year || yearBucket.year > endParsed.year) continue;

        for (const monthBucket of yearBucket.months) {
            // Skip months outside range
            if (yearBucket.year === startParsed.year && monthBucket.month < startParsed.month)
                continue;
            if (yearBucket.year === endParsed.year && monthBucket.month > endParsed.month) continue;

            for (const dayBucket of monthBucket.days) {
                // Skip days outside range
                if (
                    yearBucket.year === startParsed.year &&
                    monthBucket.month === startParsed.month &&
                    dayBucket.day < startParsed.day
                )
                    continue;
                if (
                    yearBucket.year === endParsed.year &&
                    monthBucket.month === endParsed.month &&
                    dayBucket.day > endParsed.day
                )
                    continue;

                result.push(...dayBucket.transactions);
            }
        }
    }

    return getCanonicalTransactions(result).sort((left, right) => {
        const dateCompare = Temporal.PlainDate.compare(left.date, right.date);
        return dateCompare !== 0 ? dateCompare : compareTransactionOrder(left, right);
    });
}

/**
 * Get transactions that have suspected duplicates (for "Show Duplicates" filter).
 * Returns parent transactions only that have non-empty suspectedDuplicates.
 */
export function getTransactionsWithDuplicates(
    store: TransactionStore,
    accountId?: string
): Transaction[] {
    const accountIds = accountId
        ? [accountId]
        : Object.keys(store).filter((id) => store[id] && typeof store[id] !== "string");

    const result: Transaction[] = [];

    for (const accId of accountIds) {
        const transactions = getAccountTransactions(store, accId);
        for (const tx of transactions) {
            if (tx.suspectedDuplicates && tx.suspectedDuplicates.length > 0) {
                result.push(tx);
            }
        }
    }

    return accountId ? result : getCanonicalTransactions(result);
}

/**
 * Check if a day bucket exists for the given date.
 */
export function hasDayBucket(
    store: TransactionStore,
    accountId: string,
    date: Temporal.PlainDate
): boolean {
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return false;

    const { year, month, day } = date;

    for (const yearBucket of tree.years) {
        if (yearBucket.year !== year) continue;
        for (const monthBucket of yearBucket.months) {
            if (monthBucket.month !== month) continue;
            for (const dayBucket of monthBucket.days) {
                if (dayBucket.day === day) return true;
            }
        }
    }

    return false;
}

// ============================================
// TRANSACTION FILTERING (works on flat arrays)
// ============================================

/**
 * Filter transactions based on query options.
 * Works on a flat array of transactions (after extraction from hierarchical structure).
 */
export function filterTransactions(
    transactions: Transaction[],
    options: TransactionQueryOptions = {}
): Transaction[] {
    let results = [...transactions];

    // Exclude deleted by default
    if (options.excludeDeleted !== false) {
        results = results.filter((tx) => !tx.deletedAt);
    }

    // Date range filter
    if (options.dateRange?.start) {
        const start = options.dateRange.start;
        results = results.filter((tx) => Temporal.PlainDate.compare(tx.date, start) >= 0);
    }
    if (options.dateRange?.end) {
        const end = options.dateRange.end;
        results = results.filter((tx) => Temporal.PlainDate.compare(tx.date, end) <= 0);
    }

    // Tag filter (any match)
    const tagIds = options.tagIds;
    if (tagIds && tagIds.length > 0) {
        results = results.filter((tx) => tx.tagIds?.some((tagId) => tagIds.includes(tagId)));
    }

    // Person filter (any allocation match)
    const personIds = options.personIds;
    if (personIds && personIds.length > 0) {
        results = results.filter((tx) => {
            const allocations = tx.allocations ?? {};
            return Object.keys(allocations).some((personId) => personIds.includes(personId));
        });
    }

    // Account filter
    const accountIds = options.accountIds;
    if (accountIds && accountIds.length > 0) {
        results = results.filter((tx) => accountIds.includes(tx.accountId));
    }

    // Status filter
    const statusIds = options.statusIds;
    if (statusIds && statusIds.length > 0) {
        results = results.filter((tx) => statusIds.includes(tx.statusId));
    }

    // Text search. Matches what the user can see — the alias-resolved description — as well as the
    // raw stored description, so imported text that predates an alias stays findable.
    if (options.search) {
        const searchLower = options.search.toLowerCase();
        const resolveAliasName = options.resolveDescriptionAliasName;
        const matchesSearch = (value: string | undefined): boolean =>
            value != null && value.toLowerCase().includes(searchLower);
        results = results.filter((tx) => {
            const aliasName =
                resolveAliasName && tx.descriptionAliasId
                    ? resolveAliasName(tx.descriptionAliasId)
                    : undefined;
            return (
                matchesSearch(tx.description) || matchesSearch(tx.notes) || matchesSearch(aliasName)
            );
        });
    }

    // Duplicates filter - show transactions with suspected duplicates
    if (options.showDuplicatesOnly) {
        results = results.filter(
            (tx) => tx.suspectedDuplicates && tx.suspectedDuplicates.length > 0
        );
    }

    // Sort
    const sortBy = options.sortBy ?? "date";
    const sortDir = options.sortDirection ?? "desc";
    const multiplier = sortDir === "desc" ? -1 : 1;

    results.sort((a, b) => {
        switch (sortBy) {
            case "date":
                return multiplier * Temporal.PlainDate.compare(a.date, b.date);
            case "amount":
                return multiplier * (a.amount - b.amount);
            case "description":
                return multiplier * (a.description ?? "").localeCompare(b.description ?? "");
            default:
                return 0;
        }
    });

    return results;
}

/**
 * Paginate transactions with offset-based pagination
 */
export function paginateTransactions(
    transactions: Transaction[],
    options: PaginationOptions
): PaginatedResult<Transaction> {
    const { pageSize, page } = options;
    const totalCount = transactions.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = page * pageSize;
    const items = transactions.slice(start, start + pageSize);

    return {
        items,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages - 1,
        hasPreviousPage: page > 0
    };
}

/**
 * Query transactions with filtering and pagination.
 * Uses the hierarchical structure for efficient account filtering.
 */
export function queryTransactions(
    state: VaultState,
    queryOptions: TransactionQueryOptions = {},
    paginationOptions?: PaginationOptions
): PaginatedResult<Transaction> {
    // Get transactions - use account filter for O(1) account selection
    let transactions: Transaction[];
    if (queryOptions.accountIds && queryOptions.accountIds.length === 1) {
        // Single account - direct subtree access
        transactions = getAccountTransactions(state.transactions, queryOptions.accountIds[0]);
    } else if (queryOptions.accountIds && queryOptions.accountIds.length > 1) {
        // Multiple accounts - merge subtrees
        transactions = queryOptions.accountIds.flatMap((accountId) =>
            getAccountTransactions(state.transactions, accountId)
        );
        transactions = getCanonicalTransactions(transactions);
    } else {
        // All accounts
        transactions = getAllTransactions(state.transactions);
    }

    // Apply remaining filters
    const filtered = filterTransactions(transactions, {
        ...queryOptions,
        accountIds: undefined // Already handled
    });

    if (paginationOptions) {
        return paginateTransactions(filtered, paginationOptions);
    }

    // Return all as a single page
    return {
        items: filtered,
        totalCount: filtered.length,
        totalPages: 1,
        currentPage: 0,
        hasNextPage: false,
        hasPreviousPage: false
    };
}

// ============================================
// ENTITY QUERIES
// ============================================

/**
 * Get all active description aliases
 */
export function getActiveDescriptionAliases(state: VaultState): DescriptionAlias[] {
    return selectActiveDescriptionAliases(state.descriptionAliases);
}

/**
 * Get transactions for a specific account with pagination
 */
export function getAccountTransactionsQuery(
    state: VaultState,
    accountId: string,
    pagination?: PaginationOptions
): PaginatedResult<Transaction> {
    return queryTransactions(state, { accountIds: [accountId] }, pagination);
}

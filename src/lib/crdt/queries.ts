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
    type DescriptionAlias
} from "@/lib/domain/description-aliases";

import type {
    Account,
    AccountTransactionTree,
    DayBucket,
    MonthBucket,
    Person,
    Status,
    Tag,
    Transaction,
    TransactionStore,
    VaultState,
    YearBucket
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

export interface CursorPaginationOptions {
    /** Number of items to return */
    limit: number;
    /** Cursor for pagination (last item's sort key) */
    cursor?: string;
    /** Direction to paginate */
    direction?: "forward" | "backward";
}

export interface CursorPaginatedResult<T> {
    /** Items for the current page */
    items: T[];
    /** Cursor for the next page (null if no more pages) */
    nextCursor: string | null;
    /** Cursor for the previous page (null if at start) */
    previousCursor: string | null;
    /** Whether there are more items */
    hasMore: boolean;
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
    /** Free text search in description/notes */
    search?: string;
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

/**
 * Get items by IDs from a collection
 * Filters out non-object values
 */
export function getItemsByIds<T>(collection: Record<string, T | string>, ids: string[]): T[] {
    return ids
        .map((id) => collection[id])
        .filter((item): item is T => typeof item === "object" && item !== null);
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
        const sortedMonths = Array.from(monthGroups.keys()).sort((a, b) => b - a);
        for (const month of sortedMonths) {
            const monthBuckets = monthGroups.get(month)!;

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
            const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => b - a);
            for (const day of sortedDays) {
                const dayBuckets = dayGroups.get(day)!;
                // Union transactions from all same-day buckets
                for (const dayBucket of dayBuckets) {
                    result.push(...dayBucket.transactions);
                }
            }
        }
    }

    return result;
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

    // Sort by date desc, then creationInstant desc, then importRowIndex asc
    allTransactions.sort((a, b) => {
        // Date descending
        const dateCompare = Temporal.PlainDate.compare(b.date, a.date);
        if (dateCompare !== 0) return dateCompare;

        // creationInstant descending
        const instantCompare = Temporal.Instant.compare(b.creationInstant, a.creationInstant);
        if (instantCompare !== 0) return instantCompare;

        // importRowIndex ascending (nulls sort last)
        const aIdx = a.importRowIndex ?? Infinity;
        const bIdx = b.importRowIndex ?? Infinity;
        return aIdx - bIdx;
    });

    return allTransactions;
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

    // Find matching buckets (handling CRDT duplicates)
    for (const yearBucket of tree.years) {
        if (yearBucket.year !== year) continue;

        for (const monthBucket of yearBucket.months) {
            if (monthBucket.month !== month) continue;

            for (const dayBucket of monthBucket.days) {
                if (dayBucket.day !== day) continue;

                // Check parent transactions
                const tx = dayBucket.transactions.find((t) => t.id === transactionId);
                if (tx) return tx;

                // Check nested duplicates
                for (const t of dayBucket.transactions) {
                    const dup = t.suspectedDuplicates?.find((d) => d.id === transactionId);
                    if (dup) return dup as unknown as Transaction;
                }
            }
        }
    }

    return undefined;
}

/**
 * Find a transaction by ID alone (slower - scans all).
 * Use findTransaction with location when possible.
 */
export function findTransactionById(
    store: TransactionStore,
    transactionId: string
): { transaction: Transaction; location: TransactionLocation } | undefined {
    for (const accountId of Object.keys(store)) {
        const tree = store[accountId];
        if (!tree || typeof tree === "string") continue;

        for (const yearBucket of tree.years) {
            for (const monthBucket of yearBucket.months) {
                for (const dayBucket of monthBucket.days) {
                    for (const tx of dayBucket.transactions) {
                        if (tx.id === transactionId) {
                            return {
                                transaction: tx,
                                location: {
                                    accountId,
                                    date: tx.date,
                                    transactionId
                                }
                            };
                        }
                        // Check nested duplicates
                        const dup = tx.suspectedDuplicates?.find((d) => d.id === transactionId);
                        if (dup) {
                            return {
                                transaction: dup as unknown as Transaction,
                                location: {
                                    accountId,
                                    date: tx.date, // Use parent's date for location
                                    transactionId
                                }
                            };
                        }
                    }
                }
            }
        }
    }

    return undefined;
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

    // Sort ascending by date for merge-scan
    result.sort((a, b) => Temporal.PlainDate.compare(a.date, b.date));

    return result;
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

    return result;
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
    if (options.tagIds && options.tagIds.length > 0) {
        results = results.filter((tx) =>
            tx.tagIds?.some((tagId) => options.tagIds!.includes(tagId))
        );
    }

    // Person filter (any allocation match)
    if (options.personIds && options.personIds.length > 0) {
        results = results.filter((tx) => {
            const allocations = tx.allocations ?? {};
            return Object.keys(allocations).some((personId) =>
                options.personIds!.includes(personId)
            );
        });
    }

    // Account filter
    if (options.accountIds && options.accountIds.length > 0) {
        results = results.filter((tx) => options.accountIds!.includes(tx.accountId));
    }

    // Status filter
    if (options.statusIds && options.statusIds.length > 0) {
        results = results.filter((tx) => options.statusIds!.includes(tx.statusId));
    }

    // Text search
    if (options.search) {
        const searchLower = options.search.toLowerCase();
        results = results.filter(
            (tx) =>
                tx.description?.toLowerCase().includes(searchLower) ||
                tx.notes?.toLowerCase().includes(searchLower)
        );
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
 * Paginate transactions with cursor-based pagination (date as cursor)
 * More efficient for large datasets and real-time updates
 */
export function cursorPaginateTransactions(
    transactions: Transaction[],
    options: CursorPaginationOptions
): CursorPaginatedResult<Transaction> {
    const { limit, cursor, direction = "forward" } = options;

    let filtered = transactions;

    // Apply cursor
    if (cursor) {
        const cursorIndex = transactions.findIndex((tx) => tx.id === cursor);
        if (cursorIndex !== -1) {
            if (direction === "forward") {
                filtered = transactions.slice(cursorIndex + 1);
            } else {
                filtered = transactions.slice(0, cursorIndex);
            }
        }
    }

    // Get page of items
    const items = direction === "forward" ? filtered.slice(0, limit) : filtered.slice(-limit);

    // Determine cursors
    const nextCursor =
        direction === "forward" && items.length === limit
            ? (items[items.length - 1]?.id ?? null)
            : null;

    const previousCursor =
        direction === "backward" || (cursor && transactions.findIndex((tx) => tx.id === cursor) > 0)
            ? (items[0]?.id ?? null)
            : null;

    return {
        items,
        nextCursor,
        previousCursor,
        hasMore:
            direction === "forward"
                ? filtered.length > limit
                : cursor
                  ? transactions.findIndex((tx) => tx.id === cursor) > limit
                  : false
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
        // Re-sort merged results
        transactions.sort((a, b) => {
            const dateCompare = Temporal.PlainDate.compare(b.date, a.date);
            if (dateCompare !== 0) return dateCompare;
            const instantCompare = Temporal.Instant.compare(b.creationInstant, a.creationInstant);
            if (instantCompare !== 0) return instantCompare;
            const aIdx = a.importRowIndex ?? Infinity;
            const bIdx = b.importRowIndex ?? Infinity;
            return aIdx - bIdx;
        });
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
 * Get all active accounts
 */
export function getActiveAccounts(state: VaultState): Account[] {
    return getActiveItems(state.accounts);
}

/**
 * Get all active tags
 */
export function getActiveTags(state: VaultState): Tag[] {
    return getActiveItems(state.tags);
}

/**
 * Get all active description aliases
 */
export function getActiveDescriptionAliases(state: VaultState): DescriptionAlias[] {
    return selectActiveDescriptionAliases(state.descriptionAliases);
}

/**
 * Get all active people
 */
export function getActivePeople(state: VaultState): Person[] {
    return getActiveItems(state.people);
}

/**
 * Get all statuses (including system statuses)
 * Filters out non-object values (loro-mirror may include $cid strings)
 */
export function getStatuses(state: VaultState): Status[] {
    return Object.values(state.statuses).filter(
        (item): item is Status => typeof item === "object" && item !== null
    );
}

/**
 * Get tag hierarchy as a tree structure
 */
export interface TagTreeNode {
    tag: Tag;
    children: TagTreeNode[];
}

export function getTagTree(state: VaultState): TagTreeNode[] {
    const activeTags = getActiveTags(state);
    const tagMap = new Map(activeTags.map((tag) => [tag.id, tag]));
    const roots: TagTreeNode[] = [];
    const nodeMap = new Map<string, TagTreeNode>();

    // Create nodes
    for (const tag of activeTags) {
        nodeMap.set(tag.id, { tag, children: [] });
    }

    // Build tree
    for (const tag of activeTags) {
        const node = nodeMap.get(tag.id)!;
        if (tag.parentTagId && tagMap.has(tag.parentTagId)) {
            const parent = nodeMap.get(tag.parentTagId)!;
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    // Sort by name
    const sortNodes = (nodes: TagTreeNode[]) => {
        nodes.sort((a, b) => a.tag.name.localeCompare(b.tag.name));
        for (const node of nodes) {
            sortNodes(node.children);
        }
    };
    sortNodes(roots);

    return roots;
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

/**
 * Get transactions for a specific tag (including child tags)
 */
export function getTagTransactions(
    state: VaultState,
    tagId: string,
    includeChildren = true,
    pagination?: PaginationOptions
): PaginatedResult<Transaction> {
    const tagIds = [tagId];

    if (includeChildren) {
        const findChildren = (parentId: string) => {
            for (const tag of Object.values(state.tags)) {
                // Filter out non-object values (loro-mirror may include $cid strings)
                if (typeof tag !== "object" || tag === null) continue;
                if (tag.parentTagId === parentId && !tag.deletedAt) {
                    tagIds.push(tag.id);
                    findChildren(tag.id);
                }
            }
        };
        findChildren(tagId);
    }

    return queryTransactions(state, { tagIds }, pagination);
}

/**
 * Get transactions for a specific person (by allocation)
 */
export function getPersonTransactions(
    state: VaultState,
    personId: string,
    pagination?: PaginationOptions
): PaginatedResult<Transaction> {
    return queryTransactions(state, { personIds: [personId] }, pagination);
}

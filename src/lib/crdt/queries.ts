/**
 * CRDT Query Utilities
 *
 * Provides pagination and filtering utilities for Loro state.
 * These utilities work on top of loro-mirror state to provide
 * efficient data access patterns for UI components.
 */

import type { Account, Person, Status, Tag, Transaction, VaultState } from "./schema";

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
		start?: string;
		end?: string;
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
	/** Only show potential duplicates */
	showDuplicatesOnly?: boolean;
	/** Exclude soft-deleted transactions */
	excludeDeleted?: boolean;
	/** Sort by field */
	sortBy?: "date" | "amount" | "description";
	/** Sort direction */
	sortDirection?: "asc" | "desc";
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get active (non-deleted) items from a collection
 * Filters out soft-deleted items and non-object values (loro-mirror may include $cid strings)
 */
export function getActiveItems<T extends { deletedAt?: number }>(
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
// TRANSACTION QUERIES
// ============================================

/**
 * Filter transactions based on query options
 */
export function filterTransactions(
	transactions: Record<string, Transaction>,
	options: TransactionQueryOptions = {}
): Transaction[] {
	let results = Object.values(transactions);

	// Exclude deleted by default
	if (options.excludeDeleted !== false) {
		results = results.filter((tx) => !tx.deletedAt);
	}

	// Date range filter
	if (options.dateRange?.start) {
		results = results.filter((tx) => tx.date >= options.dateRange!.start!);
	}
	if (options.dateRange?.end) {
		results = results.filter((tx) => tx.date <= options.dateRange!.end!);
	}

	// Tag filter (any match)
	if (options.tagIds && options.tagIds.length > 0) {
		results = results.filter((tx) => tx.tagIds?.some((tagId) => options.tagIds!.includes(tagId)));
	}

	// Person filter (any allocation match)
	if (options.personIds && options.personIds.length > 0) {
		results = results.filter((tx) => {
			const allocations = tx.allocations ?? {};
			return Object.keys(allocations).some((personId) => options.personIds!.includes(personId));
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

	// Duplicates filter
	if (options.showDuplicatesOnly) {
		results = results.filter((tx) => tx.duplicateOf);
	}

	// Sort
	const sortBy = options.sortBy ?? "date";
	const sortDir = options.sortDirection ?? "desc";
	const multiplier = sortDir === "desc" ? -1 : 1;

	results.sort((a, b) => {
		switch (sortBy) {
			case "date":
				return multiplier * a.date.localeCompare(b.date);
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
		hasPreviousPage: page > 0,
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
					: false,
	};
}

/**
 * Query transactions with filtering and pagination
 */
export function queryTransactions(
	state: VaultState,
	queryOptions: TransactionQueryOptions = {},
	paginationOptions?: PaginationOptions
): PaginatedResult<Transaction> {
	const filtered = filterTransactions(state.transactions, queryOptions);

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
		hasPreviousPage: false,
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
 * Get transactions for a specific account
 */
export function getAccountTransactions(
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

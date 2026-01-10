/**
 * Transaction Mutation Helpers
 *
 * Provides mutation functions for the hierarchical transaction structure.
 * All mutations use loro-mirror's draft-style pattern (mutate in place).
 *
 * Structure: Account -> Year -> Month -> Day -> Transactions
 */

import type {
	AccountTransactionTree,
	AccountTransactionTreeInput,
	DayBucket,
	DayBucketInput,
	MonthBucket,
	MonthBucketInput,
	NestedDuplicate,
	NestedDuplicateInput,
	Transaction,
	TransactionInput,
	TransactionStore,
	YearBucket,
	YearBucketInput,
} from "./schema";

// ============================================
// TYPES
// ============================================

export interface TransactionLocation {
	accountId: string;
	date: string; // YYYY-MM-DD
	transactionId: string;
}

export interface InsertTransactionInput {
	transaction: Omit<TransactionInput, "suspectedDuplicates"> & {
		suspectedDuplicates?: NestedDuplicateInput[];
	};
	/** If set, nest under this parent as a suspected duplicate */
	suspectedDuplicateOf?: TransactionLocation;
}

export interface UpdateTransactionInput {
	location: TransactionLocation;
	updates: Partial<Omit<Transaction, "id" | "accountId" | "suspectedDuplicates">>;
}

export interface MoveTransactionInput {
	location: TransactionLocation;
	newDate: string; // YYYY-MM-DD
	/** If set, move to a different account (changes the tree) */
	newAccountId?: string;
}

export interface DeleteTransactionInput {
	location: TransactionLocation;
	/** Delete suspectedDuplicates too (default: true for parents) */
	cascade?: boolean;
}

export interface UnnestDuplicateInput {
	parentLocation: TransactionLocation;
	duplicateId: string;
}

export interface SwapDuplicateInput {
	parentLocation: TransactionLocation;
	duplicateId: string;
}

// ============================================
// DATE PARSING HELPERS
// ============================================

interface ParsedDate {
	year: number;
	month: number;
	day: number;
}

function parseDate(dateStr: string): ParsedDate {
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	return {
		year: parseInt(yearStr, 10),
		month: parseInt(monthStr, 10),
		day: parseInt(dayStr, 10),
	};
}

// ============================================
// BUCKET HELPERS
// ============================================

/**
 * Get or create an account transaction tree.
 * Creates the tree if it doesn't exist.
 */
export function getOrCreateAccountTree(
	store: TransactionStore,
	accountId: string
): AccountTransactionTree {
	if (!store[accountId]) {
		// Use input type for creation, loro-mirror adds $cid internally
		const tree: AccountTransactionTreeInput = {
			accountId,
			years: [],
		};
		store[accountId] = tree as unknown as AccountTransactionTree;
	}
	return store[accountId] as AccountTransactionTree;
}

/**
 * Get or create a year bucket within an account tree.
 * Creates the bucket at the correct sorted position if it doesn't exist.
 * Handles potential CRDT duplicate buckets by returning the first match.
 */
export function getOrCreateYearBucket(tree: AccountTransactionTree, year: number): YearBucket {
	// Find existing bucket(s) for this year
	const existingIndex = tree.years.findIndex((y) => y.year === year);
	if (existingIndex !== -1) {
		return tree.years[existingIndex];
	}

	// Create new bucket at correct sorted position (descending by year)
	const newBucket: YearBucketInput = { year, months: [] };
	const insertIndex = tree.years.findIndex((y) => y.year < year);
	if (insertIndex === -1) {
		tree.years.push(newBucket as unknown as YearBucket);
	} else {
		tree.years.splice(insertIndex, 0, newBucket as unknown as YearBucket);
	}
	return newBucket as unknown as YearBucket;
}

/**
 * Get or create a month bucket within a year bucket.
 * Creates the bucket at the correct sorted position if it doesn't exist.
 */
export function getOrCreateMonthBucket(yearBucket: YearBucket, month: number): MonthBucket {
	const existingIndex = yearBucket.months.findIndex((m) => m.month === month);
	if (existingIndex !== -1) {
		return yearBucket.months[existingIndex];
	}

	// Create new bucket at correct sorted position (descending by month)
	const newBucket: MonthBucketInput = { month, days: [] };
	const insertIndex = yearBucket.months.findIndex((m) => m.month < month);
	if (insertIndex === -1) {
		yearBucket.months.push(newBucket as unknown as MonthBucket);
	} else {
		yearBucket.months.splice(insertIndex, 0, newBucket as unknown as MonthBucket);
	}
	return newBucket as unknown as MonthBucket;
}

/**
 * Get or create a day bucket within a month bucket.
 * Creates the bucket at the correct sorted position if it doesn't exist.
 */
export function getOrCreateDayBucket(monthBucket: MonthBucket, day: number): DayBucket {
	const existingIndex = monthBucket.days.findIndex((d) => d.day === day);
	if (existingIndex !== -1) {
		return monthBucket.days[existingIndex];
	}

	// Create new bucket at correct sorted position (descending by day)
	const newBucket: DayBucketInput = { day, transactions: [] };
	const insertIndex = monthBucket.days.findIndex((d) => d.day < day);
	if (insertIndex === -1) {
		monthBucket.days.push(newBucket as unknown as DayBucket);
	} else {
		monthBucket.days.splice(insertIndex, 0, newBucket as unknown as DayBucket);
	}
	return newBucket as unknown as DayBucket;
}

/**
 * Get the day bucket for a specific date (returns all buckets for CRDT conflict handling).
 * Returns empty array if no bucket exists.
 */
export function getDayBuckets(
	store: TransactionStore,
	accountId: string,
	date: string
): DayBucket[] {
	const tree = store[accountId];
	if (!tree || typeof tree === "string") return [];

	const { year, month, day } = parseDate(date);

	const yearBuckets = tree.years.filter((y) => y.year === year);
	const dayBuckets: DayBucket[] = [];

	for (const yearBucket of yearBuckets) {
		const monthBuckets = yearBucket.months.filter((m) => m.month === month);
		for (const monthBucket of monthBuckets) {
			dayBuckets.push(...monthBucket.days.filter((d) => d.day === day));
		}
	}

	return dayBuckets;
}

/**
 * Find the insert position for a transaction within a day bucket.
 * Maintains sort order: creationInstant desc, importRowIndex asc.
 */
function findTransactionInsertIndex(
	transactions: Transaction[],
	newTx: { creationInstant: number; importRowIndex?: number }
): number {
	for (let i = 0; i < transactions.length; i++) {
		const existing = transactions[i];
		// Sort by creationInstant descending
		if (newTx.creationInstant > existing.creationInstant) {
			return i;
		}
		if (newTx.creationInstant === existing.creationInstant) {
			// Then by importRowIndex ascending (nulls sort last)
			const newIdx = newTx.importRowIndex ?? Infinity;
			const existingIdx = existing.importRowIndex ?? Infinity;
			if (newIdx < existingIdx) {
				return i;
			}
		}
	}
	return transactions.length;
}

/**
 * Prune empty buckets up the tree after deletion.
 */
export function pruneBuckets(store: TransactionStore, accountId: string, date: string): void {
	const tree = store[accountId];
	if (!tree || typeof tree === "string") return;

	const { year, month, day } = parseDate(date);

	for (let yi = tree.years.length - 1; yi >= 0; yi--) {
		const yearBucket = tree.years[yi];
		if (yearBucket.year !== year) continue;

		for (let mi = yearBucket.months.length - 1; mi >= 0; mi--) {
			const monthBucket = yearBucket.months[mi];
			if (monthBucket.month !== month) continue;

			// Remove empty day buckets
			for (let di = monthBucket.days.length - 1; di >= 0; di--) {
				const dayBucket = monthBucket.days[di];
				if (dayBucket.day === day && dayBucket.transactions.length === 0) {
					monthBucket.days.splice(di, 1);
				}
			}

			// Remove empty month bucket
			if (monthBucket.days.length === 0) {
				yearBucket.months.splice(mi, 1);
			}
		}

		// Remove empty year bucket
		if (yearBucket.months.length === 0) {
			tree.years.splice(yi, 1);
		}
	}

	// Remove empty account tree
	if (tree.years.length === 0) {
		delete store[accountId];
	}
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

/**
 * Insert a new transaction into the hierarchical structure.
 * Creates intermediate buckets (year/month/day) as needed.
 * Inserts at correct sorted position within day bucket.
 */
export function insertTransaction(store: TransactionStore, input: InsertTransactionInput): void {
	const { transaction, suspectedDuplicateOf } = input;

	// If nesting as duplicate, find parent and add to its suspectedDuplicates
	if (suspectedDuplicateOf) {
		// Only look for parent transactions (not nested duplicates)
		const parentTx = findParentTransaction(store, suspectedDuplicateOf);
		if (parentTx) {
			const duplicate: NestedDuplicateInput = {
				id: transaction.id,
				date: transaction.date,
				description: transaction.description,
				notes: transaction.notes,
				amount: transaction.amount,
				accountId: transaction.accountId,
				tagIds: transaction.tagIds,
				statusId: transaction.statusId,
				importId: transaction.importId,
				allocations: transaction.allocations,
				creationInstant: transaction.creationInstant,
				importRowIndex: transaction.importRowIndex,
				deletedAt: transaction.deletedAt,
			};
			if (!parentTx.suspectedDuplicates) {
				(parentTx as { suspectedDuplicates: NestedDuplicate[] }).suspectedDuplicates = [];
			}
			parentTx.suspectedDuplicates.push(duplicate as unknown as NestedDuplicate);
			return;
		}
		// If parent not found, insert as standalone
	}

	// Get or create the bucket path
	const { year, month, day } = parseDate(transaction.date);
	const tree = getOrCreateAccountTree(store, transaction.accountId);
	const yearBucket = getOrCreateYearBucket(tree, year);
	const monthBucket = getOrCreateMonthBucket(yearBucket, month);
	const dayBucket = getOrCreateDayBucket(monthBucket, day);

	// Create full transaction with empty suspectedDuplicates if not provided
	const fullTransaction: TransactionInput = {
		...transaction,
		suspectedDuplicates: transaction.suspectedDuplicates ?? [],
	};

	// Insert at correct sorted position
	const insertIndex = findTransactionInsertIndex(dayBucket.transactions, transaction);
	dayBucket.transactions.splice(insertIndex, 0, fullTransaction as unknown as Transaction);
}

/**
 * Find a transaction in the store by location.
 * Also searches within suspectedDuplicates.
 */
export function findTransactionInStore(
	store: TransactionStore,
	location: TransactionLocation
): Transaction | NestedDuplicate | undefined {
	const dayBuckets = getDayBuckets(store, location.accountId, location.date);

	for (const dayBucket of dayBuckets) {
		for (const tx of dayBucket.transactions) {
			if (tx.id === location.transactionId) {
				return tx;
			}
			// Search in suspectedDuplicates
			const duplicate = tx.suspectedDuplicates?.find((d) => d.id === location.transactionId);
			if (duplicate) {
				return duplicate;
			}
		}
	}

	return undefined;
}

/**
 * Find a parent transaction (not a nested duplicate) by location.
 */
export function findParentTransaction(
	store: TransactionStore,
	location: TransactionLocation
): Transaction | undefined {
	const dayBuckets = getDayBuckets(store, location.accountId, location.date);

	for (const dayBucket of dayBuckets) {
		const tx = dayBucket.transactions.find((t) => t.id === location.transactionId);
		if (tx) return tx;
	}

	return undefined;
}

/**
 * Update a transaction in place.
 * Does not move the transaction - use moveTransaction for date changes.
 */
export function updateTransaction(store: TransactionStore, input: UpdateTransactionInput): void {
	const { location, updates } = input;
	const dayBuckets = getDayBuckets(store, location.accountId, location.date);

	for (const dayBucket of dayBuckets) {
		// Check parent transactions
		const txIndex = dayBucket.transactions.findIndex((t) => t.id === location.transactionId);
		if (txIndex !== -1) {
			Object.assign(dayBucket.transactions[txIndex], updates);
			return;
		}

		// Check nested duplicates
		for (const tx of dayBucket.transactions) {
			const dupIndex = tx.suspectedDuplicates?.findIndex((d) => d.id === location.transactionId);
			if (dupIndex !== undefined && dupIndex !== -1) {
				Object.assign(tx.suspectedDuplicates![dupIndex], updates);
				return;
			}
		}
	}
}

/**
 * Move a transaction to a different date.
 * Removes from old day bucket, inserts into new day bucket.
 * Prunes empty buckets after removal.
 */
export function moveTransaction(store: TransactionStore, input: MoveTransactionInput): void {
	const { location, newDate, newAccountId } = input;

	// Find and remove from current location
	const dayBuckets = getDayBuckets(store, location.accountId, location.date);
	let movedTx: Transaction | undefined;

	for (const dayBucket of dayBuckets) {
		const txIndex = dayBucket.transactions.findIndex((t) => t.id === location.transactionId);
		if (txIndex !== -1) {
			movedTx = dayBucket.transactions.splice(txIndex, 1)[0];
			break;
		}
	}

	if (!movedTx) return;

	// Prune empty buckets from old location
	pruneBuckets(store, location.accountId, location.date);

	// Update the date and accountId, then insert at new location
	movedTx.date = newDate;
	if (newAccountId) {
		movedTx.accountId = newAccountId;
	}
	insertTransaction(store, { transaction: movedTx });
}

/**
 * Delete a transaction.
 * If parent with cascade=true (default), deletes all suspectedDuplicates.
 * Prunes empty buckets after deletion.
 */
export function deleteTransaction(store: TransactionStore, input: DeleteTransactionInput): void {
	const { location, cascade = true } = input;
	const dayBuckets = getDayBuckets(store, location.accountId, location.date);

	for (const dayBucket of dayBuckets) {
		// Check if it's a parent transaction
		const txIndex = dayBucket.transactions.findIndex((t) => t.id === location.transactionId);
		if (txIndex !== -1) {
			if (cascade) {
				// Delete parent and all duplicates
				dayBucket.transactions.splice(txIndex, 1);
			} else {
				// Soft delete - set deletedAt
				dayBucket.transactions[txIndex].deletedAt = Date.now();
			}
			pruneBuckets(store, location.accountId, location.date);
			return;
		}

		// Check if it's a nested duplicate
		for (const tx of dayBucket.transactions) {
			const dupIndex = tx.suspectedDuplicates?.findIndex((d) => d.id === location.transactionId);
			if (dupIndex !== undefined && dupIndex !== -1) {
				tx.suspectedDuplicates!.splice(dupIndex, 1);
				return;
			}
		}
	}
}

/**
 * Unnest a suspected duplicate, making it a standalone transaction.
 * Removes from parent's suspectedDuplicates and inserts into appropriate day bucket.
 */
export function unnestDuplicate(store: TransactionStore, input: UnnestDuplicateInput): void {
	const { parentLocation, duplicateId } = input;
	const parentTx = findParentTransaction(store, parentLocation);

	if (!parentTx || !parentTx.suspectedDuplicates) return;

	const dupIndex = parentTx.suspectedDuplicates.findIndex((d) => d.id === duplicateId);
	if (dupIndex === -1) return;

	// Remove from parent
	const duplicate = parentTx.suspectedDuplicates.splice(dupIndex, 1)[0];

	// Insert as standalone transaction at its own date
	insertTransaction(store, {
		transaction: {
			...duplicate,
			suspectedDuplicates: [],
		} as Transaction,
	});
}

/**
 * Swap a duplicate with its parent.
 * Duplicate becomes standalone at its own date.
 * Parent and remaining duplicates move to new parent's suspectedDuplicates.
 */
export function swapDuplicate(store: TransactionStore, input: SwapDuplicateInput): void {
	const { parentLocation, duplicateId } = input;

	// Find parent transaction
	const dayBuckets = getDayBuckets(store, parentLocation.accountId, parentLocation.date);
	let parentTx: Transaction | undefined;
	let parentDayBucket: DayBucket | undefined;
	let parentIndex = -1;

	for (const dayBucket of dayBuckets) {
		const idx = dayBucket.transactions.findIndex((t) => t.id === parentLocation.transactionId);
		if (idx !== -1) {
			parentTx = dayBucket.transactions[idx];
			parentDayBucket = dayBucket;
			parentIndex = idx;
			break;
		}
	}

	if (!parentTx || !parentDayBucket || !parentTx.suspectedDuplicates) return;

	// Find the duplicate to promote
	const dupIndex = parentTx.suspectedDuplicates.findIndex((d) => d.id === duplicateId);
	if (dupIndex === -1) return;

	// Extract the duplicate
	const newParent = parentTx.suspectedDuplicates.splice(dupIndex, 1)[0];

	// Remove old parent from its day bucket
	parentDayBucket.transactions.splice(parentIndex, 1);

	// Create nested duplicate from old parent (without its suspectedDuplicates)
	const oldParentAsDuplicate: NestedDuplicateInput = {
		id: parentTx.id,
		date: parentTx.date,
		description: parentTx.description,
		notes: parentTx.notes,
		amount: parentTx.amount,
		accountId: parentTx.accountId,
		tagIds: [...parentTx.tagIds],
		statusId: parentTx.statusId,
		importId: parentTx.importId,
		allocations: { ...parentTx.allocations },
		creationInstant: parentTx.creationInstant,
		importRowIndex: parentTx.importRowIndex,
		deletedAt: parentTx.deletedAt,
	};

	// Move remaining duplicates and old parent to new parent's list
	const allDuplicates: NestedDuplicateInput[] = [
		oldParentAsDuplicate,
		...parentTx.suspectedDuplicates.map((d) => ({
			id: d.id,
			date: d.date,
			description: d.description,
			notes: d.notes,
			amount: d.amount,
			accountId: d.accountId,
			tagIds: [...d.tagIds],
			statusId: d.statusId,
			importId: d.importId,
			allocations: { ...d.allocations },
			creationInstant: d.creationInstant,
			importRowIndex: d.importRowIndex,
			deletedAt: d.deletedAt,
		})),
	];

	// Insert new parent as standalone at its own date with all duplicates
	insertTransaction(store, {
		transaction: {
			id: newParent.id,
			date: newParent.date,
			description: newParent.description,
			notes: newParent.notes,
			amount: newParent.amount,
			accountId: newParent.accountId,
			tagIds: [...newParent.tagIds],
			statusId: newParent.statusId,
			importId: newParent.importId,
			allocations: { ...newParent.allocations },
			creationInstant: newParent.creationInstant,
			importRowIndex: newParent.importRowIndex,
			deletedAt: newParent.deletedAt,
			suspectedDuplicates: allDuplicates as unknown as NestedDuplicate[],
		},
	});

	// Prune empty buckets from old parent location
	pruneBuckets(store, parentLocation.accountId, parentLocation.date);
}

/**
 * Delete all transactions for a given import.
 * Used when user deletes an import batch.
 * Prunes empty buckets after deletion.
 */
export function deleteTransactionsByImport(store: TransactionStore, importId: string): void {
	const datesToPrune: { accountId: string; date: string }[] = [];

	// Iterate through all accounts
	for (const accountId of Object.keys(store)) {
		const tree = store[accountId];
		if (!tree || typeof tree === "string") continue;

		// Iterate through all buckets
		for (const yearBucket of tree.years) {
			for (const monthBucket of yearBucket.months) {
				for (const dayBucket of monthBucket.days) {
					// Remove transactions with matching importId
					for (let i = dayBucket.transactions.length - 1; i >= 0; i--) {
						const tx = dayBucket.transactions[i];
						if (tx.importId === importId) {
							dayBucket.transactions.splice(i, 1);
							const date = `${yearBucket.year}-${String(monthBucket.month).padStart(2, "0")}-${String(dayBucket.day).padStart(2, "0")}`;
							datesToPrune.push({ accountId, date });
						} else {
							// Also remove from suspectedDuplicates
							if (tx.suspectedDuplicates) {
								for (let j = tx.suspectedDuplicates.length - 1; j >= 0; j--) {
									if (tx.suspectedDuplicates[j].importId === importId) {
										tx.suspectedDuplicates.splice(j, 1);
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// Prune empty buckets
	for (const { accountId, date } of datesToPrune) {
		pruneBuckets(store, accountId, date);
	}
}

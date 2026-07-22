/**
 * Transaction Mutation Helpers
 *
 * Provides mutation functions for the hierarchical transaction structure.
 * All mutations use loro-mirror's draft-style pattern (mutate in place).
 *
 * Structure: Account -> Year -> Month -> Day -> Transactions
 */

import { Temporal } from "temporal-polyfill";

import { compareTransactionOrder } from "./queries";
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
    YearBucketInput
} from "./schema";

// ============================================
// LORO-MIRROR HELPERS
// ============================================

/**
 * Recursively transforms Input types to Output types by making $cid required at every level.
 *
 * loro-mirror's InferInputType has `$cid?: string` (optional) while InferType has
 * `$cid: string` (required). This mapped type performs the deep transformation.
 * Excludes domain types (Temporal.PlainDate, Temporal.Instant) from $cid injection.
 */
type WithCid<T> = T extends Temporal.PlainDate | Temporal.Instant
    ? T
    : T extends number | string | boolean
      ? T
      : T extends Array<infer U>
        ? Array<WithCid<U>>
        : T extends object
          ? { [K in keyof T]: WithCid<T[K]> } & { $cid: string }
          : T;

/**
 * Type helper for loro-mirror container creation.
 *
 * When inserting objects into LoroList/LoroMap, loro-mirror adds $cid at runtime.
 * This function provides type-safe bridging from Input types to Container types.
 *
 * @see https://loro.dev/blog/loro-mirror for $cid documentation
 */
function withCid<T extends object>(input: T): WithCid<T> {
    return input as WithCid<T>;
}

// ============================================
// TYPES
// ============================================

export interface TransactionLocation {
    accountId: string;
    date: Temporal.PlainDate;
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
    newDate: Temporal.PlainDate;
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
// DATE HELPERS
// ============================================

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
        const tree: AccountTransactionTreeInput = {
            accountId,
            years: []
        };
        store[accountId] = withCid(tree);
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
        tree.years.push(withCid(newBucket));
    } else {
        tree.years.splice(insertIndex, 0, withCid(newBucket));
    }
    return withCid(newBucket);
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
        yearBucket.months.push(withCid(newBucket));
    } else {
        yearBucket.months.splice(insertIndex, 0, withCid(newBucket));
    }
    return withCid(newBucket);
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
        monthBucket.days.push(withCid(newBucket));
    } else {
        monthBucket.days.splice(insertIndex, 0, withCid(newBucket));
    }
    return withCid(newBucket);
}

/**
 * Get the day bucket for a specific date (returns all buckets for CRDT conflict handling).
 * Returns empty array if no bucket exists.
 */
export function getDayBuckets(
    store: TransactionStore,
    accountId: string,
    date: Temporal.PlainDate
): DayBucket[] {
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return [];

    const { year, month, day } = date;

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
    newTx: {
        id: string;
        date: Temporal.PlainDate;
        creationInstant: Temporal.Instant;
        importRowIndex?: number;
    }
): number {
    for (let i = 0; i < transactions.length; i++) {
        const existing = transactions[i];
        if (compareTransactionOrder(newTx, existing) < 0) return i;
    }
    return transactions.length;
}

/**
 * Prune empty buckets up the tree after deletion.
 */
export function pruneBuckets(
    store: TransactionStore,
    accountId: string,
    date: Temporal.PlainDate
): void {
    const tree = store[accountId];
    if (!tree || typeof tree === "string") return;

    const { year, month, day } = date;

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
                descriptionAliasId: transaction.descriptionAliasId,
                notes: transaction.notes,
                amount: transaction.amount,
                accountId: transaction.accountId,
                tagIds: transaction.tagIds,
                statusId: transaction.statusId,
                importId: transaction.importId,
                allocations: transaction.allocations,
                creationInstant: transaction.creationInstant,
                importRowIndex: transaction.importRowIndex,
                deletedAt: transaction.deletedAt
            };
            if (!parentTx.suspectedDuplicates) {
                (parentTx as { suspectedDuplicates: NestedDuplicate[] }).suspectedDuplicates = [];
            }
            parentTx.suspectedDuplicates.push(withCid(duplicate));
            return;
        }
        // If parent not found, insert as standalone
    }

    // Get or create the bucket path
    const { year, month, day } = transaction.date;
    const tree = getOrCreateAccountTree(store, transaction.accountId);
    const yearBucket = getOrCreateYearBucket(tree, year);
    const monthBucket = getOrCreateMonthBucket(yearBucket, month);
    const dayBucket = getOrCreateDayBucket(monthBucket, day);

    // Create full transaction with empty suspectedDuplicates if not provided
    const fullTransaction: TransactionInput = {
        ...transaction,
        suspectedDuplicates: transaction.suspectedDuplicates ?? []
    };

    // Insert at correct sorted position
    const insertIndex = findTransactionInsertIndex(dayBucket.transactions, transaction);
    dayBucket.transactions.splice(insertIndex, 0, withCid(fullTransaction));
}

/**
 * Find a transaction in the store by location.
 * Also searches within suspectedDuplicates.
 */
export function findTransactionInStore(
    store: TransactionStore,
    location: TransactionLocation
): Transaction | NestedDuplicate | undefined {
    return findTransactionsInStore(store, location).sort(comparePhysicalIdentity)[0];
}

/** Find every temporary physical copy for one logical transaction identity. */
export function findTransactionsInStore(
    store: TransactionStore,
    location: TransactionLocation
): Array<Transaction | NestedDuplicate> {
    const dayBuckets = getDayBuckets(store, location.accountId, location.date);
    const matches: Array<Transaction | NestedDuplicate> = [];

    for (const dayBucket of dayBuckets) {
        for (const tx of dayBucket.transactions) {
            if (tx.id === location.transactionId) {
                matches.push(tx);
            }
            // Search in suspectedDuplicates
            for (const duplicate of tx.suspectedDuplicates ?? []) {
                if (duplicate.id === location.transactionId) matches.push(duplicate);
            }
        }
    }

    return matches;
}

/**
 * Find a parent transaction (not a nested duplicate) by location.
 */
export function findParentTransaction(
    store: TransactionStore,
    location: TransactionLocation
): Transaction | undefined {
    const dayBuckets = getDayBuckets(store, location.accountId, location.date);
    const matches: Transaction[] = [];

    for (const dayBucket of dayBuckets) {
        matches.push(...dayBucket.transactions.filter((tx) => tx.id === location.transactionId));
    }

    return matches.sort(comparePhysicalIdentity)[0];
}

/** Find every physical parent copy for one logical transaction identity. */
export function findParentTransactions(
    store: TransactionStore,
    location: TransactionLocation
): Transaction[] {
    return getDayBuckets(store, location.accountId, location.date)
        .flatMap((dayBucket) =>
            dayBucket.transactions.filter(
                (transaction) => transaction.id === location.transactionId
            )
        )
        .sort(comparePhysicalIdentity);
}

/**
 * Update a transaction in place.
 * Does not move the transaction - use moveTransaction for date changes.
 */
export function updateTransaction(store: TransactionStore, input: UpdateTransactionInput): void {
    const { location, updates } = input;
    const dayBuckets = getDayBuckets(store, location.accountId, location.date);

    for (const dayBucket of dayBuckets) {
        for (const tx of dayBucket.transactions) {
            if (tx.id === location.transactionId) applyMutableTransactionUpdates(tx, updates);
            for (const duplicate of tx.suspectedDuplicates ?? []) {
                if (duplicate.id === location.transactionId) {
                    applyMutableTransactionUpdates(duplicate, updates);
                }
            }
        }
    }
}

/** Raw imported descriptions and alias pointers have dedicated mutation boundaries. */
function applyMutableTransactionUpdates(
    transaction: Transaction | NestedDuplicate,
    updates: UpdateTransactionInput["updates"]
): void {
    for (const [key, value] of Object.entries(updates)) {
        if (key !== "description" && key !== "descriptionAliasId") {
            Reflect.set(transaction, key, value);
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

    const dayBuckets = getDayBuckets(store, location.accountId, location.date);
    const matches = dayBuckets.flatMap((dayBucket) =>
        dayBucket.transactions.filter((transaction) => transaction.id === location.transactionId)
    );
    const canonical = matches.sort(comparePhysicalIdentity)[0];

    if (!canonical) return;

    const movedTransaction = copyTransaction(canonical);
    for (const dayBucket of dayBuckets) {
        for (let index = dayBucket.transactions.length - 1; index >= 0; index--) {
            if (dayBucket.transactions[index].id === location.transactionId) {
                dayBucket.transactions.splice(index, 1);
            }
        }
    }

    pruneBuckets(store, location.accountId, location.date);

    movedTransaction.date = newDate;
    movedTransaction.accountId = newAccountId ?? movedTransaction.accountId;
    insertTransaction(store, { transaction: movedTransaction });
}

function comparePhysicalIdentity(
    left: Transaction | NestedDuplicate,
    right: Transaction | NestedDuplicate
): number {
    return physicalIdentityKey(left).localeCompare(physicalIdentityKey(right));
}

function physicalIdentityKey(transaction: Transaction | NestedDuplicate): string {
    return (
        transaction.$cid ??
        JSON.stringify({
            accountId: transaction.accountId,
            amount: transaction.amount,
            creationInstant: transaction.creationInstant.toString(),
            date: transaction.date.toString(),
            deletedAt: transaction.deletedAt?.toString(),
            description: transaction.description,
            descriptionAliasId: transaction.descriptionAliasId,
            importId: transaction.importId,
            importRowIndex: transaction.importRowIndex,
            notes: transaction.notes,
            statusId: transaction.statusId
        })
    );
}

function copyAllocations(
    allocations: Transaction["allocations"] | NestedDuplicate["allocations"]
): TransactionInput["allocations"] {
    const copy: TransactionInput["allocations"] = {};
    for (const [personId, percentage] of Object.entries(allocations)) {
        if (personId !== "$cid" && typeof percentage === "number") copy[personId] = percentage;
    }
    return copy;
}

function copyTransaction(transaction: Transaction): TransactionInput {
    return {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        descriptionAliasId: transaction.descriptionAliasId,
        notes: transaction.notes,
        amount: transaction.amount,
        accountId: transaction.accountId,
        tagIds: [...transaction.tagIds],
        statusId: transaction.statusId,
        importId: transaction.importId,
        allocations: copyAllocations(transaction.allocations),
        creationInstant: transaction.creationInstant,
        importRowIndex: transaction.importRowIndex,
        deletedAt: transaction.deletedAt,
        suspectedDuplicates: (transaction.suspectedDuplicates ?? []).map((duplicate) => ({
            id: duplicate.id,
            date: duplicate.date,
            description: duplicate.description,
            descriptionAliasId: duplicate.descriptionAliasId,
            notes: duplicate.notes,
            amount: duplicate.amount,
            accountId: duplicate.accountId,
            tagIds: [...duplicate.tagIds],
            statusId: duplicate.statusId,
            importId: duplicate.importId,
            allocations: copyAllocations(duplicate.allocations),
            creationInstant: duplicate.creationInstant,
            importRowIndex: duplicate.importRowIndex,
            deletedAt: duplicate.deletedAt
        }))
    };
}

/**
 * Delete a transaction.
 * If parent with cascade=true (default), deletes all suspectedDuplicates.
 * Prunes empty buckets after deletion.
 */
export function deleteTransaction(store: TransactionStore, input: DeleteTransactionInput): void {
    const { location, cascade = true } = input;
    const dayBuckets = getDayBuckets(store, location.accountId, location.date);
    const deletedAt = Temporal.Now.instant();

    for (const dayBucket of dayBuckets) {
        for (let txIndex = dayBucket.transactions.length - 1; txIndex >= 0; txIndex--) {
            const transaction = dayBucket.transactions[txIndex];
            if (transaction.id === location.transactionId) {
                if (cascade) dayBucket.transactions.splice(txIndex, 1);
                else transaction.deletedAt = deletedAt;
                continue;
            }

            const duplicates = transaction.suspectedDuplicates ?? [];
            for (
                let duplicateIndex = duplicates.length - 1;
                duplicateIndex >= 0;
                duplicateIndex--
            ) {
                const duplicate = duplicates[duplicateIndex];
                if (duplicate.id !== location.transactionId) continue;
                if (cascade) duplicates.splice(duplicateIndex, 1);
                else duplicate.deletedAt = deletedAt;
            }
        }
    }

    if (cascade) pruneBuckets(store, location.accountId, location.date);
}

/**
 * Unnest a suspected duplicate, making it a standalone transaction.
 * Removes from parent's suspectedDuplicates and inserts into appropriate day bucket.
 */
export function unnestDuplicate(store: TransactionStore, input: UnnestDuplicateInput): void {
    const { parentLocation, duplicateId } = input;
    const parents = findParentTransactions(store, parentLocation);
    const duplicates = parents
        .flatMap((parent) =>
            parent.suspectedDuplicates.filter((duplicate) => duplicate.id === duplicateId)
        )
        .sort(comparePhysicalIdentity);
    const duplicate = duplicates[0];
    if (!duplicate) return;

    for (const parent of parents) {
        for (let index = parent.suspectedDuplicates.length - 1; index >= 0; index -= 1) {
            if (parent.suspectedDuplicates[index].id === duplicateId) {
                parent.suspectedDuplicates.splice(index, 1);
            }
        }
    }
    for (const dayBucket of getDayBuckets(store, duplicate.accountId, duplicate.date)) {
        for (let index = dayBucket.transactions.length - 1; index >= 0; index -= 1) {
            if (dayBucket.transactions[index].id === duplicateId) {
                dayBucket.transactions.splice(index, 1);
            }
        }
    }

    // Insert as standalone transaction at its own date
    insertTransaction(store, {
        transaction: {
            ...duplicate,
            descriptionAliasId: duplicate.descriptionAliasId,
            suspectedDuplicates: []
        }
    });
}

/**
 * Swap a duplicate with its parent.
 * Duplicate becomes standalone at its own date.
 * Parent and remaining duplicates move to new parent's suspectedDuplicates.
 */
export function swapDuplicate(store: TransactionStore, input: SwapDuplicateInput): void {
    const { parentLocation, duplicateId } = input;
    const parents = findParentTransactions(store, parentLocation);
    const parentTx = parents[0];
    const newParent = parents
        .flatMap((parent) =>
            parent.suspectedDuplicates.filter((duplicate) => duplicate.id === duplicateId)
        )
        .sort(comparePhysicalIdentity)[0];
    if (!parentTx || !newParent) return;

    const remainingById = new Map<string, NestedDuplicate>();
    for (const parent of parents) {
        for (const duplicate of parent.suspectedDuplicates) {
            if (duplicate.id === duplicateId || duplicate.id === parentTx.id) continue;
            const existing = remainingById.get(duplicate.id);
            if (!existing || comparePhysicalIdentity(duplicate, existing) < 0) {
                remainingById.set(duplicate.id, duplicate);
            }
        }
    }

    for (const dayBucket of getDayBuckets(store, parentLocation.accountId, parentLocation.date)) {
        for (let index = dayBucket.transactions.length - 1; index >= 0; index -= 1) {
            if (dayBucket.transactions[index].id === parentLocation.transactionId) {
                dayBucket.transactions.splice(index, 1);
            }
        }
    }
    for (const dayBucket of getDayBuckets(store, newParent.accountId, newParent.date)) {
        for (let index = dayBucket.transactions.length - 1; index >= 0; index -= 1) {
            if (dayBucket.transactions[index].id === duplicateId) {
                dayBucket.transactions.splice(index, 1);
            }
        }
    }

    // Create nested duplicate from old parent (without its suspectedDuplicates)
    const oldParentAsDuplicate: NestedDuplicateInput = {
        id: parentTx.id,
        date: parentTx.date,
        description: parentTx.description,
        descriptionAliasId: parentTx.descriptionAliasId,
        notes: parentTx.notes,
        amount: parentTx.amount,
        accountId: parentTx.accountId,
        tagIds: [...parentTx.tagIds],
        statusId: parentTx.statusId,
        importId: parentTx.importId,
        allocations: { ...parentTx.allocations },
        creationInstant: parentTx.creationInstant,
        importRowIndex: parentTx.importRowIndex,
        deletedAt: parentTx.deletedAt
    };

    // Move remaining duplicates and old parent to new parent's list
    const allDuplicates: NestedDuplicateInput[] = [
        oldParentAsDuplicate,
        ...Array.from(remainingById.values())
            .sort(comparePhysicalIdentity)
            .map((d) => ({
                id: d.id,
                date: d.date,
                description: d.description,
                descriptionAliasId: d.descriptionAliasId,
                notes: d.notes,
                amount: d.amount,
                accountId: d.accountId,
                tagIds: [...d.tagIds],
                statusId: d.statusId,
                importId: d.importId,
                allocations: { ...d.allocations },
                creationInstant: d.creationInstant,
                importRowIndex: d.importRowIndex,
                deletedAt: d.deletedAt
            }))
    ];

    // Insert new parent as standalone at its own date with all duplicates
    insertTransaction(store, {
        transaction: {
            id: newParent.id,
            date: newParent.date,
            description: newParent.description,
            descriptionAliasId: newParent.descriptionAliasId,
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
            suspectedDuplicates: allDuplicates.map((d) => withCid(d))
        }
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
    const datesToPrune: { accountId: string; date: Temporal.PlainDate }[] = [];

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
                            const date = new Temporal.PlainDate(
                                yearBucket.year,
                                monthBucket.month,
                                dayBucket.day
                            );
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

/**
 * Transaction Cursor
 *
 * A random-access view over the hierarchical Loro transaction store that never materializes the
 * matching transaction list. It replaces `filterTransactions(getAllTransactions(store), options))`
 * for the grid, which allocated and re-sorted an array of every transaction on every filter change.
 *
 * Two layers, with deliberately different lifetimes:
 *
 *  - `buildTransactionIndex(store)` is document-scoped. It walks the hierarchy once to resolve the
 *    canonical physical copy per logical id and to group day buckets by calendar date across
 *    accounts. Its memory is proportional to distinct days plus distinct ids, never to a sorted
 *    copy of the transactions, and it is rebuilt only when the document changes.
 *  - `createTransactionCursor(index, filter)` is filter-scoped. It builds a sparse census — the
 *    number of matching transactions per calendar day, plus a running start offset — so a slice
 *    deep into the list is a binary search over days followed by ordering one day's rows, not a
 *    walk from the start.
 *
 * Ordering is `compareTransactionOrder` (date desc, creationInstant desc, importRowIndex asc, id
 * asc), which is what the grid presents and what `filterTransactions` produces for its only
 * configured sort of date/desc.
 *
 * Precondition: a transaction stored in the day bucket for (year, month, day) has that calendar
 * date, and a transaction stored under account tree A has `accountId === A`. Both hold by
 * construction — `insertTransaction` and `moveTransaction` place rows by their own date and account
 * — and `getTransactionsInDateRange` already prunes on the same assumption. Date and account
 * pruning depend on it; the per-transaction predicate re-checks both fields for any bucket the
 * cursor does visit.
 */

import { Temporal } from "temporal-polyfill";

import type { DescriptionAliasNameResolver } from "@/lib/domain/description-aliases";

import { compareTransactionOrder } from "./queries";
import { isPublicTransaction } from "./schema";
import type { DayBucket, MonthBucket, Transaction, TransactionStore } from "./schema";
import { preferCanonicalTransaction } from "./transaction-canonical-key";

// ============================================
// PUBLIC TYPES
// ============================================

/**
 * The filter dimensions the grid can apply, matching `TransactionQueryOptions` minus the sort
 * fields. The cursor presents one order — the grid's — so a sort direction would be unreachable
 * configuration.
 */
export interface TransactionFilter {
    readonly dateRange?: {
        readonly start?: Temporal.PlainDate;
        readonly end?: Temporal.PlainDate;
    };
    /** Any tag matches. */
    readonly tagIds?: readonly string[];
    /** Any allocation matches. */
    readonly personIds?: readonly string[];
    readonly accountIds?: readonly string[];
    readonly statusIds?: readonly string[];
    /** Matches description, notes, or the alias-resolved description the table renders. */
    readonly search?: string;
    readonly resolveDescriptionAliasName?: DescriptionAliasNameResolver;
    readonly showDuplicatesOnly?: boolean;
    /** Defaults to excluding soft-deleted rows; pass `false` to include them. */
    readonly excludeDeleted?: boolean;
}

/**
 * Opt-in observability seam. Called once per physical transaction a traversal reads, so a test can
 * assert that a deep slice does not walk the whole store.
 */
export interface CursorInstrumentation {
    readonly onTransactionVisited: () => void;
}

/** A day bucket together with the account whose tree it hangs under. */
export interface DayBucketEntry {
    readonly accountId: string;
    readonly bucket: DayBucket;
}

/** Every day bucket for one calendar date, across all accounts. */
export interface DateGroup {
    /** `year * 10000 + month * 100 + day`: order-equivalent to `Temporal.PlainDate.compare`. */
    readonly dateKey: number;
    readonly entries: readonly DayBucketEntry[];
}

export interface TransactionIndex {
    /** Calendar dates holding at least one day bucket, newest first. */
    readonly dateGroups: readonly DateGroup[];
    /** Winning physical copy per logical transaction id, excluding maintenance shadows. */
    readonly canonicalById: ReadonlyMap<string, Transaction>;
    /** Physical transactions in the hierarchy, including losing copies and shadows. */
    readonly physicalTransactionCount: number;
}

export interface TransactionCursor {
    /** Transactions matching the filter. */
    readonly count: number;
    /**
     * The window `[offset, offset + limit)` of the matching transactions, in grid order.
     * Offsets and limits are clamped to the matching range; a window past the end is short.
     */
    slice(offset: number, limit: number): readonly Transaction[];
    /** Whether one logical id is in the matching set. O(1) — no traversal. */
    includes(transactionId: string): boolean;
    /**
     * Position of one logical id in the matching order, or `-1` when it is not in the matching set.
     *
     * A binary search over the census to the row's own calendar date, then one date's ordering —
     * O(log dates + rows that day), never a walk from the start. This is what lets a shift-click
     * range span rows the cursor has not paged in, and what locates a deep-linked row so the page
     * can be extended far enough to hold it.
     */
    indexOf(transactionId: string): number;
    /** Lazy traversal of every matching transaction in grid order. */
    values(): IterableIterator<Transaction>;
    [Symbol.iterator](): IterableIterator<Transaction>;
}

// ============================================
// DATE KEYS
// ============================================

const NO_TRANSACTIONS: readonly Transaction[] = Object.freeze([]);

/**
 * Bucket coordinates packed into one integer. Month and day occupy fewer than four decimal digits,
 * so ordering by this key agrees with `Temporal.PlainDate.compare` including for negative years,
 * and pruning never has to construct a Temporal value.
 */
function toDateKey(year: number, month: number, day: number): number {
    return year * 10000 + month * 100 + day;
}

function toDateKeyOfDate(date: Temporal.PlainDate): number {
    return toDateKey(date.year, date.month, date.day);
}

// ============================================
// DOCUMENT-SCOPED INDEX
// ============================================

/**
 * Group buckets by their numeric coordinate and return the groups newest-first.
 *
 * CRDT merges can leave two buckets for the same coordinate; unioning them here reproduces what
 * `getAccountTransactions` does, which matters because the union order decides which physical copy
 * wins a canonical tie.
 */
function groupByCoordinateDescending<T>(
    buckets: readonly T[],
    coordinateOf: (bucket: T) => number
): Array<[number, T[]]> {
    const groups = new Map<number, T[]>();
    for (const bucket of buckets) {
        const coordinate = coordinateOf(bucket);
        const existing = groups.get(coordinate) ?? [];
        existing.push(bucket);
        groups.set(coordinate, existing);
    }
    return [...groups].sort(([left], [right]) => right - left);
}

function collectDays(monthBuckets: readonly MonthBucket[]): DayBucket[] {
    return monthBuckets.flatMap((monthBucket) => [...monthBucket.days]);
}

/**
 * Walk the hierarchy once. The traversal order matches `getAllTransactions` exactly — accounts in
 * key order, years in list order, then months and days grouped by coordinate and taken descending —
 * because ties in the canonical key are resolved in favour of the copy seen first.
 */
export function buildTransactionIndex(
    store: TransactionStore,
    instrumentation?: CursorInstrumentation
): TransactionIndex {
    const canonicalById = new Map<string, Transaction>();
    const entriesByDateKey = new Map<number, DayBucketEntry[]>();

    for (const accountId of Object.keys(store)) {
        const tree = store[accountId];
        if (!tree || typeof tree === "string") continue;

        for (const yearBucket of tree.years) {
            for (const [month, monthBuckets] of groupByCoordinateDescending(
                yearBucket.months,
                (monthBucket) => monthBucket.month
            )) {
                for (const [day, dayBuckets] of groupByCoordinateDescending(
                    collectDays(monthBuckets),
                    (dayBucket) => dayBucket.day
                )) {
                    const dateKey = toDateKey(yearBucket.year, month, day);
                    const entries = entriesByDateKey.get(dateKey) ?? [];

                    for (const bucket of dayBuckets) {
                        entries.push({ accountId, bucket });

                        for (const transaction of bucket.transactions) {
                            instrumentation?.onTransactionVisited();
                            if (!isPublicTransaction(transaction)) continue;
                            const existing = canonicalById.get(transaction.id);
                            canonicalById.set(
                                transaction.id,
                                existing
                                    ? preferCanonicalTransaction(existing, transaction)
                                    : transaction
                            );
                        }
                    }

                    entriesByDateKey.set(dateKey, entries);
                }
            }
        }
    }

    const dateGroups = [...entriesByDateKey]
        .sort(([left], [right]) => right - left)
        .map(([dateKey, entries]) => ({ dateKey, entries }));

    const physicalTransactionCount = dateGroups.reduce(
        (total, group) =>
            group.entries.reduce(
                (groupTotal, entry) => groupTotal + entry.bucket.transactions.length,
                total
            ),
        0
    );

    return { dateGroups, canonicalById, physicalTransactionCount };
}

// ============================================
// FILTER PREDICATE
// ============================================

type TransactionPredicate = (transaction: Transaction) => boolean;

/**
 * The per-transaction half of the filter, mirroring `filterTransactions` dimension for dimension.
 * Dimensions the caller left off contribute no check, so the common case is a short chain.
 */
export function createTransactionFilterPredicate(filter: TransactionFilter): TransactionPredicate {
    const start = filter.dateRange?.start;
    const end = filter.dateRange?.end;
    const tagIds = toLookupSet(filter.tagIds);
    const personIds = toLookupSet(filter.personIds);
    const accountIds = toLookupSet(filter.accountIds);
    const statusIds = toLookupSet(filter.statusIds);
    const searchLower = filter.search ? filter.search.toLowerCase() : undefined;
    const resolveAliasName = filter.resolveDescriptionAliasName;

    const checks: readonly TransactionPredicate[] = [
        // Excluding soft-deleted rows is the default; only an explicit `false` keeps them.
        ...(filter.excludeDeleted === false
            ? []
            : [(transaction: Transaction) => transaction.deletedAt == null]),
        ...(start
            ? [
                  (transaction: Transaction) =>
                      Temporal.PlainDate.compare(transaction.date, start) >= 0
              ]
            : []),
        ...(end
            ? [(transaction: Transaction) => Temporal.PlainDate.compare(transaction.date, end) <= 0]
            : []),
        ...(tagIds
            ? [
                  (transaction: Transaction) =>
                      (transaction.tagIds ?? []).some((tagId) => tagIds.has(tagId))
              ]
            : []),
        ...(personIds
            ? [
                  (transaction: Transaction) =>
                      Object.keys(transaction.allocations ?? {}).some((personId) =>
                          personIds.has(personId)
                      )
              ]
            : []),
        ...(accountIds
            ? [(transaction: Transaction) => accountIds.has(transaction.accountId)]
            : []),
        ...(statusIds ? [(transaction: Transaction) => statusIds.has(transaction.statusId)] : []),
        ...(searchLower == null ? [] : [createSearchCheck(searchLower, resolveAliasName)]),
        ...(filter.showDuplicatesOnly
            ? [
                  (transaction: Transaction) =>
                      transaction.suspectedDuplicates != null &&
                      transaction.suspectedDuplicates.length > 0
              ]
            : [])
    ];

    return (transaction) => checks.every((check) => check(transaction));
}

function toLookupSet(values: readonly string[] | undefined): ReadonlySet<string> | undefined {
    return values && values.length > 0 ? new Set(values) : undefined;
}

/**
 * Search matches what the user can see — the alias-resolved description — as well as the raw stored
 * description and notes, so imported text that predates an alias stays findable.
 */
function createSearchCheck(
    searchLower: string,
    resolveAliasName: DescriptionAliasNameResolver | undefined
): TransactionPredicate {
    const matchesSearch = (value: string | undefined): boolean =>
        value != null && value.toLowerCase().includes(searchLower);

    return (transaction) => {
        const aliasName =
            resolveAliasName && transaction.descriptionAliasId
                ? resolveAliasName(transaction.descriptionAliasId)
                : undefined;
        return (
            matchesSearch(transaction.description) ||
            matchesSearch(transaction.notes) ||
            matchesSearch(aliasName)
        );
    };
}

// ============================================
// SPARSE CENSUS
// ============================================

/**
 * Matching counts per calendar date, holding only the dates that contribute at least one row.
 * `startOffsets[i]` is the number of matches before `dateGroups[groupIndexes[i]]`, so locating an
 * arbitrary index is a binary search over dates rather than a walk over transactions.
 */
interface Census {
    readonly groupIndexes: readonly number[];
    readonly startOffsets: readonly number[];
    readonly total: number;
}

/** Half-open range of `dateGroups` surviving the date filter; the rest is never read. */
interface DateWindow {
    readonly firstIndex: number;
    readonly endIndex: number;
}

/**
 * Narrow the date-desc group list to the filtered range by binary search, so an out-of-range year
 * costs a comparison rather than a walk over its transactions.
 */
function findDateWindow(dateGroups: readonly DateGroup[], filter: TransactionFilter): DateWindow {
    const startKey = filter.dateRange?.start ? toDateKeyOfDate(filter.dateRange.start) : undefined;
    const endKey = filter.dateRange?.end ? toDateKeyOfDate(filter.dateRange.end) : undefined;

    // Groups run newest-first, so the upper date bound clips the front and the lower bound the back.
    const firstIndex =
        endKey == null ? 0 : lowerBound(dateGroups, (group) => group.dateKey <= endKey);
    const endIndex =
        startKey == null
            ? dateGroups.length
            : lowerBound(dateGroups, (group) => group.dateKey < startKey);

    return { firstIndex, endIndex: Math.max(firstIndex, endIndex) };
}

/**
 * Index of the first group satisfying `isAtOrPast`, given that the predicate is false for a prefix
 * and true for the remaining suffix.
 */
function lowerBound(
    dateGroups: readonly DateGroup[],
    isAtOrPast: (group: DateGroup) => boolean
): number {
    const search = (low: number, high: number): number => {
        if (low >= high) return low;
        const middle = (low + high) >>> 1;
        return isAtOrPast(dateGroups[middle]) ? search(low, middle) : search(middle + 1, high);
    };
    return search(0, dateGroups.length);
}

function buildCensus(
    index: TransactionIndex,
    window: DateWindow,
    accountIds: ReadonlySet<string> | undefined,
    matches: TransactionPredicate
): Census {
    const groupIndexes: number[] = [];
    const startOffsets: number[] = [];
    let total = 0;

    for (let groupIndex = window.firstIndex; groupIndex < window.endIndex; groupIndex++) {
        const count = countGroupMatches(index.dateGroups[groupIndex], accountIds, matches);
        if (count === 0) continue;
        groupIndexes.push(groupIndex);
        startOffsets.push(total);
        total += count;
    }

    return { groupIndexes, startOffsets, total };
}

function countGroupMatches(
    group: DateGroup,
    accountIds: ReadonlySet<string> | undefined,
    matches: TransactionPredicate
): number {
    let count = 0;
    for (const entry of group.entries) {
        if (accountIds && !accountIds.has(entry.accountId)) continue;
        for (const transaction of entry.bucket.transactions) {
            if (matches(transaction)) count += 1;
        }
    }
    return count;
}

/** The matching rows of one calendar date, in grid order. */
function orderGroupMatches(
    group: DateGroup,
    accountIds: ReadonlySet<string> | undefined,
    matches: TransactionPredicate
): readonly Transaction[] {
    const transactions: Transaction[] = [];
    for (const entry of group.entries) {
        if (accountIds && !accountIds.has(entry.accountId)) continue;
        for (const transaction of entry.bucket.transactions) {
            if (matches(transaction)) transactions.push(transaction);
        }
    }
    return transactions.sort(compareTransactionOrder);
}

/**
 * Index of the first census entry whose calendar date is at or before `dateKey`, or the entry count
 * when every contributing date is newer.
 *
 * Census entries follow `dateGroups`, which run newest-first, so the predicate is false for a prefix
 * and true for the remaining suffix — the same shape {@link lowerBound} relies on.
 */
function findCensusEntryByDate(index: TransactionIndex, census: Census, dateKey: number): number {
    const search = (low: number, high: number): number => {
        if (low >= high) return low;
        const middle = (low + high) >>> 1;
        return index.dateGroups[census.groupIndexes[middle]].dateKey <= dateKey
            ? search(low, middle)
            : search(middle + 1, high);
    };
    return search(0, census.groupIndexes.length);
}

/** Index of the census entry containing `offset`, i.e. the last entry starting at or before it. */
function findCensusEntry(census: Census, offset: number): number {
    const search = (low: number, high: number): number => {
        if (low >= high) return low;
        const middle = (low + high) >>> 1;
        return census.startOffsets[middle] > offset
            ? search(low, middle)
            : search(middle + 1, high);
    };
    return search(0, census.startOffsets.length) - 1;
}

// ============================================
// CURSOR
// ============================================

export function createTransactionCursor(
    index: TransactionIndex,
    filter: TransactionFilter = {},
    instrumentation?: CursorInstrumentation
): TransactionCursor {
    const passesFilter = createTransactionFilterPredicate(filter);
    const accountIds = toLookupSet(filter.accountIds);

    // A physical copy contributes a row only if it won the canonical tie for its logical id; the
    // losing copy of a concurrently moved transaction may live in an entirely different date group.
    const matches: TransactionPredicate = (transaction) => {
        instrumentation?.onTransactionVisited();
        return index.canonicalById.get(transaction.id) === transaction && passesFilter(transaction);
    };

    const census = buildCensus(
        index,
        findDateWindow(index.dateGroups, filter),
        accountIds,
        matches
    );

    const orderEntry = (entryIndex: number): readonly Transaction[] =>
        orderGroupMatches(index.dateGroups[census.groupIndexes[entryIndex]], accountIds, matches);

    const slice = (offset: number, limit: number): readonly Transaction[] => {
        const start = Math.max(0, Math.trunc(offset));
        const end = Math.min(census.total, start + Math.max(0, Math.trunc(limit)));
        if (start >= end) return NO_TRANSACTIONS;

        const window: Transaction[] = [];
        let entryIndex = findCensusEntry(census, start);
        let taken = start;

        while (taken < end && entryIndex < census.groupIndexes.length) {
            const ordered = orderEntry(entryIndex);
            const localStart = taken - census.startOffsets[entryIndex];
            const take = Math.min(ordered.length - localStart, end - taken);
            // A non-positive take would mean the census and the ordering disagreed about a date.
            // Bailing beats spinning the UI thread on an unreachable state.
            if (take <= 0) break;
            for (let offsetInGroup = 0; offsetInGroup < take; offsetInGroup++) {
                window.push(ordered[localStart + offsetInGroup]);
            }
            taken += take;
            entryIndex += 1;
        }

        return window;
    };

    const includes = (transactionId: string): boolean => {
        const transaction = index.canonicalById.get(transactionId);
        return transaction != null && passesFilter(transaction);
    };

    const indexOf = (transactionId: string): number => {
        const transaction = index.canonicalById.get(transactionId);
        // Membership first, and not only as a fast exit: a range gesture routinely asks about an
        // anchor a filter change has since retired, and without this the answer would still be
        // correct — the ordering below cannot find a non-matching row — but would cost ordering that
        // row's whole calendar date to reach the same `-1`.
        if (transaction == null || !passesFilter(transaction)) return -1;

        // The row matches, so its own calendar date contributes at least one row and therefore holds
        // a census entry — the search lands on that entry rather than merely near it.
        const entryIndex = findCensusEntryByDate(index, census, toDateKeyOfDate(transaction.date));
        if (entryIndex >= census.groupIndexes.length) return -1;

        const localIndex = orderEntry(entryIndex).findIndex(
            (candidate) => candidate.id === transactionId
        );
        return localIndex < 0 ? -1 : census.startOffsets[entryIndex] + localIndex;
    };

    function* values(): IterableIterator<Transaction> {
        for (let entryIndex = 0; entryIndex < census.groupIndexes.length; entryIndex++) {
            yield* orderEntry(entryIndex);
        }
    }

    return {
        count: census.total,
        slice,
        includes,
        indexOf,
        values,
        [Symbol.iterator]: values
    };
}

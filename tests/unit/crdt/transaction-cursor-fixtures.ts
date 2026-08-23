/**
 * Shared fixtures for the transaction cursor tests.
 *
 * Stores are built with the real `insertTransaction` writer so bucket placement matches production;
 * the cursor's date and account pruning depends on that placement invariant.
 */

import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { expect } from "vitest";

import { insertTransaction } from "@/lib/crdt/mutations";
import type { TransactionQueryOptions } from "@/lib/crdt/queries";
import type {
    NestedDuplicateInput,
    Transaction,
    TransactionInput,
    TransactionStore
} from "@/lib/crdt/schema";
import type { TransactionFilter } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

export const ACCOUNT_IDS = ["acc-1", "acc-2", "acc-3"];
export const TAG_IDS = ["tag-a", "tag-b", "tag-c"];
export const PERSON_IDS = ["person-1", "person-2"];
export const STATUS_IDS = ["status-for-review", "status-paid"];
export const ALIAS_IDS = ["alias-1", "alias-2"];

const ALIAS_NAMES: Readonly<Record<string, string>> = {
    "alias-1": "Cafe Nero",
    "alias-2": "Landlord"
};

/** The resolver the grid injects, standing in for the live alias lookup. */
export function resolveAliasName(aliasId: string): string | undefined {
    return ALIAS_NAMES[aliasId];
}

/**
 * loro-mirror infers `TransactionStore` as an account index signature intersected with a required
 * `$cid`, so no object literal satisfies it and an empty store can only be produced by assertion.
 * Both assertions in this file are contained here, matching `transaction-queries.test.ts`.
 */
export function createEmptyStore(): TransactionStore {
    return {} as TransactionStore;
}

/**
 * Live loro-mirror state carries a `$cid` string entry alongside the account trees. The inferred
 * type does not model it, which is why every reader guards on `typeof tree === "string"` — so a
 * fixture that never contains one cannot exercise that guard.
 */
export function withContainerIdEntry(store: TransactionStore): TransactionStore {
    return { ...store, $cid: "cid:root-Transactions:Map" } as unknown as TransactionStore;
}

/** Insert every transaction, failing loudly if the writer rejects one — a silent drop would
 * quietly weaken the fixture rather than the test. */
export function populateStore(transactions: readonly TransactionInput[]): TransactionStore {
    const store = createEmptyStore();
    for (const transaction of transactions) {
        const result = insertTransaction(store, { transaction });
        expect(result.ok).toBe(true);
    }
    return store;
}

// ============================================
// ARBITRARIES
// ============================================

/** A narrow date pool so buckets, months and years collide across generated transactions. */
export const dateArbitrary = fc
    .record({
        year: fc.integer({ min: 2023, max: 2024 }),
        month: fc.integer({ min: 1, max: 3 }),
        day: fc.integer({ min: 1, max: 5 })
    })
    .map(({ year, month, day }) => Temporal.PlainDate.from({ year, month, day }));

const allocationsArbitrary = fc
    .uniqueArray(fc.constantFrom(...PERSON_IDS), { maxLength: PERSON_IDS.length })
    .map((personIds) =>
        Object.fromEntries(personIds.map((personId) => [personId, asPercentage(50)]))
    );

const nestedDuplicateArbitrary: fc.Arbitrary<NestedDuplicateInput> = fc
    .record({
        id: fc.integer({ min: 100, max: 105 }).map((index) => `dup-${index}`),
        date: dateArbitrary,
        amount: fc.integer({ min: -5000, max: 5000 }),
        accountId: fc.constantFrom(...ACCOUNT_IDS),
        statusId: fc.constantFrom(...STATUS_IDS),
        creationInstant: fc.integer({ min: 0, max: 3 })
    })
    .map((duplicate) => ({
        ...duplicate,
        amount: asMinorUnits(duplicate.amount),
        originalAmount: undefined,
        description: "duplicate",
        descriptionAliasId: undefined,
        notes: "",
        tagIds: [],
        importId: "",
        allocations: {},
        creationInstant: Temporal.Instant.fromEpochMilliseconds(
            1_700_000_000_000 + duplicate.creationInstant * 1000
        ),
        importRowIndex: undefined,
        deletedAt: undefined
    }));

/**
 * Logical ids are drawn from a pool smaller than the transaction count, so the same id lands in two
 * physical locations — the merge artifact `getCanonicalTransactions` exists to collapse.
 */
export const transactionArbitrary: fc.Arbitrary<TransactionInput> = fc
    .record({
        id: fc.integer({ min: 0, max: 29 }).map((index) => `tx-${index}`),
        date: dateArbitrary,
        description: fc.constantFrom("Coffee", "COFFEE BEANS", "Rent", "", "Groceries"),
        descriptionAliasId: fc.option(fc.constantFrom(...ALIAS_IDS), { nil: undefined }),
        notes: fc.constantFrom("", "monthly", "Reimbursed", "coffee run"),
        amount: fc.integer({ min: -100_000, max: 100_000 }),
        accountId: fc.constantFrom(...ACCOUNT_IDS),
        tagIds: fc.uniqueArray(fc.constantFrom(...TAG_IDS), { maxLength: TAG_IDS.length }),
        statusId: fc.constantFrom(...STATUS_IDS),
        allocations: allocationsArbitrary,
        // A tiny instant pool forces creationInstant ties, which pushes ordering onto the
        // importRowIndex and id tie-breakers.
        creationInstant: fc.integer({ min: 0, max: 3 }),
        importRowIndex: fc.option(fc.integer({ min: 0, max: 3 }), { nil: undefined }),
        deleted: fc.integer({ min: 0, max: 4 }),
        suspectedDuplicates: fc.array(nestedDuplicateArbitrary, { maxLength: 1 })
    })
    .map(({ deleted, ...transaction }) => ({
        ...transaction,
        amount: asMinorUnits(transaction.amount),
        originalAmount: undefined,
        importId: "",
        creationInstant: Temporal.Instant.fromEpochMilliseconds(
            1_700_000_000_000 + transaction.creationInstant * 1000
        ),
        // Roughly one row in five is soft-deleted so `excludeDeleted` has something to bite on.
        deletedAt:
            deleted === 0 ? Temporal.Instant.fromEpochMilliseconds(1_800_000_000_000) : undefined
    }));

/**
 * Two size regimes. `fc.array` biases hard towards short arrays, and a store of three rows cannot
 * exercise a slice that straddles a day boundary deep into the list, so most runs draw a store
 * large enough to have an interior.
 */
export const storeArbitrary: fc.Arbitrary<TransactionStore> = fc
    .oneof(
        { weight: 3, arbitrary: fc.array(transactionArbitrary, { maxLength: 6 }) },
        {
            weight: 7,
            arbitrary: fc.array(transactionArbitrary, { minLength: 20, maxLength: 60 })
        }
    )
    .map(populateStore);

const FILTER_DIMENSIONS = [
    "dateRange",
    "tagIds",
    "personIds",
    "accountIds",
    "statusIds",
    "search",
    "showDuplicatesOnly",
    "excludeDeleted"
] as const;

type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/**
 * Ranges are ordered nine times in ten. An inverted range matches nothing, and a generator that
 * produced them freely would spend most of its runs comparing two empty lists.
 */
const dateRangeArbitrary = fc
    .tuple(
        fc.option(dateArbitrary, { nil: undefined }),
        fc.option(dateArbitrary, { nil: undefined }),
        fc.integer({ min: 0, max: 9 })
    )
    .map(([left, right, invert]) =>
        left && right && invert > 0 && Temporal.PlainDate.compare(left, right) > 0
            ? { start: right, end: left }
            : { start: left, end: right }
    );

/**
 * Only a few dimensions are active per run, with an occasional everything-at-once run.
 *
 * Conjoining all eight against a 40-row store collapses almost every result to empty, and two empty
 * lists agree no matter how wrong the cursor is — see the fixture-signal test in
 * `transaction-cursor-differential.test.ts`, which pins the non-empty rate this relies on.
 * Empty-array and empty-string values are still generated, since both implementations must read
 * those as "no filter".
 */
export const filterArbitrary: fc.Arbitrary<TransactionFilter> = fc
    .record({
        active: fc.oneof(
            {
                weight: 9,
                arbitrary: fc.uniqueArray(fc.constantFrom(...FILTER_DIMENSIONS), { maxLength: 3 })
            },
            { weight: 1, arbitrary: fc.constant<FilterDimension[]>([...FILTER_DIMENSIONS]) }
        ),
        dateRange: dateRangeArbitrary,
        tagIds: fc.subarray(TAG_IDS),
        personIds: fc.subarray(PERSON_IDS),
        accountIds: fc.subarray(ACCOUNT_IDS),
        statusIds: fc.subarray(STATUS_IDS),
        search: fc.constantFrom(
            "",
            "coffee",
            "COFFEE",
            "rent",
            "zzz",
            "cafe",
            "monthly",
            "landlord"
        ),
        showDuplicatesOnly: fc.boolean(),
        excludeDeleted: fc.boolean(),
        withAliasResolver: fc.boolean()
    })
    .map(({ active, withAliasResolver, ...values }) => {
        const isActive = (dimension: FilterDimension): boolean => active.includes(dimension);
        return {
            dateRange: isActive("dateRange") ? values.dateRange : undefined,
            tagIds: isActive("tagIds") ? values.tagIds : undefined,
            personIds: isActive("personIds") ? values.personIds : undefined,
            accountIds: isActive("accountIds") ? values.accountIds : undefined,
            statusIds: isActive("statusIds") ? values.statusIds : undefined,
            search: isActive("search") ? values.search : undefined,
            showDuplicatesOnly: isActive("showDuplicatesOnly")
                ? values.showDuplicatesOnly
                : undefined,
            excludeDeleted: isActive("excludeDeleted") ? values.excludeDeleted : undefined,
            resolveDescriptionAliasName: withAliasResolver ? resolveAliasName : undefined
        };
    });

/**
 * The same filter expressed for `filterTransactions`, pinned to the grid's only sort. The grid
 * always asks for date/desc, which `filterTransactions` applies as a stable no-op re-sort over the
 * already `compareTransactionOrder`-sorted input.
 */
export function toQueryOptions(filter: TransactionFilter): TransactionQueryOptions {
    return {
        dateRange: filter.dateRange,
        tagIds: filter.tagIds ? [...filter.tagIds] : undefined,
        personIds: filter.personIds ? [...filter.personIds] : undefined,
        accountIds: filter.accountIds ? [...filter.accountIds] : undefined,
        statusIds: filter.statusIds ? [...filter.statusIds] : undefined,
        search: filter.search,
        resolveDescriptionAliasName: filter.resolveDescriptionAliasName,
        showDuplicatesOnly: filter.showDuplicatesOnly,
        excludeDeleted: filter.excludeDeleted,
        sortBy: "date",
        sortDirection: "desc"
    };
}

/** Compare by object identity: both sides hand back the very transaction objects stored in the
 * hierarchy, so identity catches a wrong canonical winner that a deep compare would let through. */
export function expectSameTransactions(
    actual: readonly Transaction[],
    expected: readonly Transaction[]
): void {
    expect(actual.map(describeTransaction)).toEqual(expected.map(describeTransaction));
    for (let index = 0; index < expected.length; index++) {
        expect(actual[index]).toBe(expected[index]);
    }
}

function describeTransaction(transaction: Transaction): string {
    return `${transaction.id}@${transaction.date.toString()}/${transaction.accountId}`;
}

/**
 * Traversal-Cost Tests for the Transaction Cursor
 *
 * The point of the cursor is that a scroll to row 9,000 does not touch 10,000 transactions. These
 * tests count the physical transactions each operation actually reads, via the cursor's
 * instrumentation seam, and assert bounds on that count rather than on wall-clock time.
 *
 * Every measurement is paired with an assertion on the rows returned. A slice that visited nothing
 * because it returned nothing would otherwise score perfectly.
 */

import { Temporal } from "temporal-polyfill";
import { beforeAll, describe, expect, it } from "vitest";

import { insertTransaction } from "@/lib/crdt/mutations";
import { filterTransactions, getAllTransactions } from "@/lib/crdt/queries";
import type { Transaction, TransactionStore } from "@/lib/crdt/schema";
import {
    buildTransactionIndex,
    createTransactionCursor,
    type CursorInstrumentation,
    type TransactionFilter,
    type TransactionIndex
} from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { createEmptyStore } from "./transaction-cursor-fixtures";

const DAY_COUNT = 1_000;
const ROWS_PER_DAY = 10;
const TRANSACTION_COUNT = DAY_COUNT * ROWS_PER_DAY;
const FIRST_DATE = Temporal.PlainDate.from("2022-01-01");
const ACCOUNT_IDS = ["acc-1", "acc-2", "acc-3"];

/** A visit counter that can be zeroed between the phases being measured separately. */
function createVisitCounter(): CursorInstrumentation & {
    readonly read: () => number;
    readonly reset: () => void;
} {
    let visits = 0;
    return {
        onTransactionVisited: () => {
            visits += 1;
        },
        read: () => visits,
        reset: () => {
            visits = 0;
        }
    };
}

function buildLargeStore(): TransactionStore {
    const store = createEmptyStore();
    for (let dayIndex = 0; dayIndex < DAY_COUNT; dayIndex++) {
        const date = FIRST_DATE.add({ days: dayIndex });
        for (let rowIndex = 0; rowIndex < ROWS_PER_DAY; rowIndex++) {
            const sequence = dayIndex * ROWS_PER_DAY + rowIndex;
            insertTransaction(store, {
                transaction: {
                    id: `tx-${String(sequence).padStart(5, "0")}`,
                    date,
                    description: rowIndex === 0 ? "Rent" : `Purchase ${sequence}`,
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(-100 * (sequence + 1)),
                    originalAmount: undefined,
                    accountId: ACCOUNT_IDS[sequence % ACCOUNT_IDS.length],
                    tagIds: [],
                    statusId: "status-for-review",
                    importId: "",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(
                        1_700_000_000_000 + sequence * 1000
                    ),
                    importRowIndex: rowIndex,
                    suspectedDuplicates: [],
                    deletedAt: undefined
                }
            });
        }
    }
    return store;
}

describe("transaction cursor traversal cost", () => {
    let store: TransactionStore;
    let index: TransactionIndex;
    let expectedRows: readonly Transaction[];

    beforeAll(() => {
        store = buildLargeStore();
        index = buildTransactionIndex(store);
        expectedRows = filterTransactions(getAllTransactions(store), {
            excludeDeleted: true,
            sortBy: "date",
            sortDirection: "desc"
        });
    });

    it("indexes the store in one pass proportional to distinct days, not to a sorted copy", () => {
        const counter = createVisitCounter();
        const measured = buildTransactionIndex(store, counter);

        expect(counter.read()).toBe(TRANSACTION_COUNT);
        expect(measured.physicalTransactionCount).toBe(TRANSACTION_COUNT);
        expect(measured.canonicalById.size).toBe(TRANSACTION_COUNT);
        // The index itself is one entry per calendar day per account, not per transaction.
        expect(measured.dateGroups).toHaveLength(DAY_COUNT);
    });

    it("reaches row 9,000 without walking the 9,000 rows before it", () => {
        const counter = createVisitCounter();
        const cursor = createTransactionCursor(index, { excludeDeleted: true }, counter);

        // Building the census reads every row once, because `excludeDeleted` is a per-row test.
        const censusVisits = counter.read();
        expect(cursor.count).toBe(TRANSACTION_COUNT);
        expect(censusVisits).toBe(TRANSACTION_COUNT);

        counter.reset();
        const window = cursor.slice(9_000, 50);
        const sliceVisits = counter.read();

        // The slice is correct: without this the visit count below would just measure doing nothing.
        expect(window.map((row) => row.id)).toEqual(
            expectedRows.slice(9_000, 9_050).map((row) => row.id)
        );

        // 50 rows span five day buckets of ten, so a correct slice reads about 50 transactions.
        // The bound is deliberately far below the 10,000 an array walk would touch.
        expect(sliceVisits).toBeLessThanOrEqual(200);
        expect(sliceVisits).toBeGreaterThan(0);
    });

    it("costs the same to slice at the end of the list as at the start", () => {
        const counter = createVisitCounter();
        const cursor = createTransactionCursor(index, { excludeDeleted: true }, counter);

        const measureSlice = (offset: number): number => {
            counter.reset();
            const window = cursor.slice(offset, 50);
            expect(window).toHaveLength(50);
            return counter.read();
        };

        const atStart = measureSlice(0);
        const atEnd = measureSlice(TRANSACTION_COUNT - 50);

        // Random access, not a walk: the last window must not cost more than the first.
        expect(atEnd).toBeLessThanOrEqual(atStart * 2);
        expect(atEnd).toBeLessThanOrEqual(200);
    });

    it("prunes whole day buckets outside the date range instead of testing their rows", () => {
        const rangeDays = 100;
        const end = FIRST_DATE.add({ days: DAY_COUNT - 1 });
        const filter: TransactionFilter = {
            dateRange: { start: end.subtract({ days: rangeDays - 1 }), end },
            excludeDeleted: true
        };

        const counter = createVisitCounter();
        const cursor = createTransactionCursor(index, filter, counter);
        const censusVisits = counter.read();

        expect(cursor.count).toBe(rangeDays * ROWS_PER_DAY);
        // Only the surviving buckets are read; the other 900 days cost a binary search.
        expect(censusVisits).toBe(rangeDays * ROWS_PER_DAY);
        expect(censusVisits).toBeLessThan(TRANSACTION_COUNT / 5);
    });

    it("locates row 9,000 without walking the 9,000 rows before it", () => {
        const counter = createVisitCounter();
        const cursor = createTransactionCursor(index, { excludeDeleted: true }, counter);

        counter.reset();
        const position = cursor.indexOf("tx-09000");
        const positionVisits = counter.read();

        // The position is correct: a lookup that returned -1 would visit nothing and score perfectly.
        expect(position).toBe(expectedRows.findIndex((row) => row.id === "tx-09000"));
        expect(position).toBeGreaterThan(0);

        // One day bucket of ten rows, ordered once. The bound is far below the 10,000 a scan of the
        // matching order would touch, which is what makes a shift-click range over un-paged rows
        // affordable.
        expect(positionVisits).toBeLessThanOrEqual(100);
        expect(positionVisits).toBeGreaterThan(0);
    });

    it("places a retired row without ordering its calendar date", () => {
        const counter = createVisitCounter();
        // Every "Rent" row is the first of its day, so 999 of the 1,000 days contribute nothing and
        // the surviving rows are one per day — the shape a search filter leaves behind.
        const cursor = createTransactionCursor(
            index,
            { excludeDeleted: true, search: "Rent" },
            counter
        );

        counter.reset();
        // `tx-09001` is a real, canonical row whose whole day bucket is in the census — it is only
        // the search that retires it, which is exactly the state a stale range anchor is in.
        expect(cursor.indexOf("tx-09001")).toBe(-1);
        expect(counter.read()).toBe(0);

        // And the matching neighbour on that same date is still placed correctly, so the zero above
        // is a rejection rather than a lookup that does nothing at all.
        expect(cursor.indexOf("tx-09000")).toBe(
            expectedRows
                .filter((row) => row.description === "Rent")
                .findIndex((row) => row.id === "tx-09000")
        );
    });

    it("answers membership without traversing anything", () => {
        const counter = createVisitCounter();
        const cursor = createTransactionCursor(index, { excludeDeleted: true }, counter);

        counter.reset();
        expect(cursor.includes("tx-09000")).toBe(true);
        expect(cursor.includes("tx-not-a-real-id")).toBe(false);
        expect(counter.read()).toBe(0);
    });
});

/**
 * Explicit Cases for the Transaction Cursor
 *
 * The differential property test covers equivalence in bulk. These pin the specific shapes a
 * random generator reaches rarely or not at all: bucket boundaries, canonical ties on a single
 * date, and the degenerate stores.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { insertTransaction } from "@/lib/crdt/mutations";
import { filterTransactions, getAllTransactions } from "@/lib/crdt/queries";
import type { Transaction, TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX } from "@/lib/crdt/schema";
import {
    buildTransactionIndex,
    createTransactionCursor,
    type TransactionFilter
} from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import {
    createEmptyStore,
    expectSameTransactions,
    populateStore,
    resolveAliasName,
    toQueryOptions,
    withContainerIdEntry
} from "./transaction-cursor-fixtures";

/**
 * A maintenance shadow id: the reserved prefix followed by epoch, source cid and public id joined
 * by NUL. Built from the exported prefix and an escaped separator, because a literal NUL in this
 * source would be invisible on screen and would make the file read as binary to grep.
 */
const SHADOW_ID = `${TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX}epoch\u0000cid\u0000tx-real`;

function makeTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
    return {
        id: "tx-1",
        date: Temporal.PlainDate.from("2024-03-15"),
        description: "Coffee",
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-1000),
        originalAmount: undefined,
        accountId: "acc-1",
        tagIds: [],
        statusId: "status-for-review",
        importId: "",
        allocations: {},
        creationInstant: Temporal.Instant.from("2024-03-15T10:00:00Z"),
        importRowIndex: 0,
        suspectedDuplicates: [],
        deletedAt: undefined,
        ...overrides
    };
}

function rowsFrom(store: TransactionStore, filter: TransactionFilter = {}): readonly Transaction[] {
    return [...createTransactionCursor(buildTransactionIndex(store), filter)];
}

/** Both implementations, compared. Every explicit case is also a differential case. */
function expectMatchesArrayPipeline(store: TransactionStore, filter: TransactionFilter = {}): void {
    const cursor = createTransactionCursor(buildTransactionIndex(store), filter);
    const expected = filterTransactions(getAllTransactions(store), toQueryOptions(filter));
    expectSameTransactions([...cursor], expected);
    expect(cursor.count).toBe(expected.length);
}

describe("transaction cursor degenerate stores", () => {
    it("reports nothing for an empty vault", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(createEmptyStore()));

        expect(cursor.count).toBe(0);
        expect([...cursor]).toEqual([]);
        expect(cursor.slice(0, 10)).toEqual([]);
        expect(cursor.slice(5, 10)).toEqual([]);
        expect(cursor.includes("tx-1")).toBe(false);
    });

    it("handles a single transaction", () => {
        const store = populateStore([makeTransaction()]);
        const cursor = createTransactionCursor(buildTransactionIndex(store));

        expect(cursor.count).toBe(1);
        expect(cursor.slice(0, 1).map((row) => row.id)).toEqual(["tx-1"]);
        expect(cursor.slice(0, 50).map((row) => row.id)).toEqual(["tx-1"]);
        expect(cursor.slice(1, 1)).toEqual([]);
        expect(cursor.includes("tx-1")).toBe(true);
        expectMatchesArrayPipeline(store);
    });

    it("skips the loro-mirror container id entry rather than treating it as an account", () => {
        const store = withContainerIdEntry(populateStore([makeTransaction()]));

        expectMatchesArrayPipeline(store);
        expect(rowsFrom(store)).toHaveLength(1);
    });
});

describe("transaction cursor filter extremes", () => {
    const store = populateStore([
        makeTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-03-15") }),
        makeTransaction({ id: "tx-2", date: Temporal.PlainDate.from("2024-02-10") }),
        makeTransaction({ id: "tx-3", date: Temporal.PlainDate.from("2023-12-01") })
    ]);

    it("matches every row when no filter narrows anything", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store), {
            tagIds: [],
            personIds: [],
            accountIds: [],
            statusIds: [],
            search: ""
        });

        expect(cursor.count).toBe(3);
        expectMatchesArrayPipeline(store, { tagIds: [], search: "" });
    });

    it("matches nothing when a dimension excludes every row", () => {
        const filter: TransactionFilter = { statusIds: ["status-that-nobody-has"] };
        const cursor = createTransactionCursor(buildTransactionIndex(store), filter);

        expect(cursor.count).toBe(0);
        expect(cursor.slice(0, 10)).toEqual([]);
        expect(cursor.includes("tx-1")).toBe(false);
        expectMatchesArrayPipeline(store, filter);
    });

    it("matches nothing for an inverted date range", () => {
        const filter: TransactionFilter = {
            dateRange: {
                start: Temporal.PlainDate.from("2024-06-01"),
                end: Temporal.PlainDate.from("2024-01-01")
            }
        };

        expect(createTransactionCursor(buildTransactionIndex(store), filter).count).toBe(0);
        expectMatchesArrayPipeline(store, filter);
    });

    it("prunes to a date range that starts and ends mid-list", () => {
        const filter: TransactionFilter = {
            dateRange: {
                start: Temporal.PlainDate.from("2024-01-01"),
                end: Temporal.PlainDate.from("2024-02-28")
            }
        };

        expect(rowsFrom(store, filter).map((row) => row.id)).toEqual(["tx-2"]);
        expectMatchesArrayPipeline(store, filter);
    });

    it("keeps soft-deleted rows only when excludeDeleted is explicitly false", () => {
        const withDeleted = populateStore([
            makeTransaction({ id: "tx-live" }),
            makeTransaction({
                id: "tx-gone",
                deletedAt: Temporal.Instant.from("2024-04-01T00:00:00Z")
            })
        ]);

        expect(rowsFrom(withDeleted).map((row) => row.id)).toEqual(["tx-live"]);
        expect(
            rowsFrom(withDeleted, { excludeDeleted: false })
                .map((row) => row.id)
                .sort()
        ).toEqual(["tx-gone", "tx-live"]);
        expect(
            createTransactionCursor(buildTransactionIndex(withDeleted)).includes("tx-gone")
        ).toBe(false);
        expectMatchesArrayPipeline(withDeleted);
        expectMatchesArrayPipeline(withDeleted, { excludeDeleted: false });
    });

    it("searches the alias-resolved description as well as the stored text", () => {
        const aliased = populateStore([
            makeTransaction({
                id: "tx-alias",
                description: "SQ *1234",
                descriptionAliasId: "alias-1"
            }),
            makeTransaction({ id: "tx-plain", description: "Groceries" })
        ]);

        // "Cafe Nero" is only reachable through the resolver, never from stored text.
        expect(rowsFrom(aliased, { search: "cafe" }).map((row) => row.id)).toEqual([]);
        expect(
            rowsFrom(aliased, {
                search: "cafe",
                resolveDescriptionAliasName: resolveAliasName
            }).map((row) => row.id)
        ).toEqual(["tx-alias"]);
        expectMatchesArrayPipeline(aliased, {
            search: "cafe",
            resolveDescriptionAliasName: resolveAliasName
        });
    });
});

describe("transaction cursor ordering within a day bucket", () => {
    const sameDay = Temporal.PlainDate.from("2024-03-15");

    it("orders by creationInstant desc, then importRowIndex asc, then id", () => {
        const store = populateStore([
            makeTransaction({
                id: "tx-older",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T08:00:00Z"),
                importRowIndex: 0
            }),
            makeTransaction({
                id: "tx-newer-row-1",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T09:00:00Z"),
                importRowIndex: 1
            }),
            makeTransaction({
                id: "tx-newer-row-0",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T09:00:00Z"),
                importRowIndex: 0
            }),
            makeTransaction({
                id: "tx-newer-manual",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T09:00:00Z"),
                importRowIndex: undefined
            })
        ]);

        expect(rowsFrom(store).map((row) => row.id)).toEqual([
            "tx-newer-row-0",
            "tx-newer-row-1",
            "tx-newer-manual",
            "tx-older"
        ]);
        expectMatchesArrayPipeline(store);
    });

    it("interleaves accounts sharing a date rather than grouping by account", () => {
        const store = populateStore([
            makeTransaction({
                id: "tx-a-early",
                accountId: "acc-1",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T08:00:00Z")
            }),
            makeTransaction({
                id: "tx-b-late",
                accountId: "acc-2",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T10:00:00Z")
            }),
            makeTransaction({
                id: "tx-a-latest",
                accountId: "acc-1",
                date: sameDay,
                creationInstant: Temporal.Instant.from("2024-03-15T11:00:00Z")
            })
        ]);

        expect(rowsFrom(store).map((row) => row.id)).toEqual([
            "tx-a-latest",
            "tx-b-late",
            "tx-a-early"
        ]);
        expectMatchesArrayPipeline(store);
    });

    it("keeps dates in descending order across day, month and year boundaries", () => {
        const store = populateStore(
            ["2024-03-15", "2024-03-14", "2024-02-28", "2023-12-31", "2023-01-01"].map(
                (date, index) =>
                    makeTransaction({ id: `tx-${index}`, date: Temporal.PlainDate.from(date) })
            )
        );

        expect(rowsFrom(store).map((row) => row.date.toString())).toEqual([
            "2024-03-15",
            "2024-03-14",
            "2024-02-28",
            "2023-12-31",
            "2023-01-01"
        ]);
        expectMatchesArrayPipeline(store);
    });
});

describe("transaction cursor canonical copies", () => {
    it("collapses two physical copies of one id on different dates, keeping the same winner", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: makeTransaction({
                id: "tx-moved",
                date: Temporal.PlainDate.from("2024-03-15"),
                notes: "before the move"
            })
        });
        insertTransaction(store, {
            transaction: makeTransaction({
                id: "tx-moved",
                date: Temporal.PlainDate.from("2024-04-20"),
                notes: "after the move"
            })
        });

        const rows = rowsFrom(store);
        expect(rows).toHaveLength(1);
        expectMatchesArrayPipeline(store);

        // The losing copy must not resurface once the winner's own date is filtered out.
        const winnerDate = rows[0].date;
        const otherDate = Temporal.PlainDate.from(
            winnerDate.toString() === "2024-03-15" ? "2024-04-20" : "2024-03-15"
        );
        const otherDateOnly: TransactionFilter = {
            dateRange: { start: otherDate, end: otherDate }
        };
        expect(rowsFrom(store, otherDateOnly)).toHaveLength(0);
        expectMatchesArrayPipeline(store, otherDateOnly);
    });

    it("collapses two copies of one id on the same date, where the tie-break is traversal order", () => {
        const store = createEmptyStore();
        for (const notes of ["copy-a", "copy-b"]) {
            insertTransaction(store, { transaction: makeTransaction({ id: "tx-twin", notes }) });
        }

        expect(rowsFrom(store)).toHaveLength(1);
        expectMatchesArrayPipeline(store);
    });

    it("resolves membership to the canonical copy, not to any copy", () => {
        const store = createEmptyStore();
        insertTransaction(store, {
            transaction: makeTransaction({
                id: "tx-moved",
                date: Temporal.PlainDate.from("2024-03-15"),
                statusId: "status-paid"
            })
        });
        insertTransaction(store, {
            transaction: makeTransaction({
                id: "tx-moved",
                date: Temporal.PlainDate.from("2024-04-20"),
                statusId: "status-for-review"
            })
        });

        const winner = rowsFrom(store)[0];
        const cursor = createTransactionCursor(buildTransactionIndex(store), {
            statusIds: [winner.statusId]
        });
        const loserCursor = createTransactionCursor(buildTransactionIndex(store), {
            statusIds: [winner.statusId === "status-paid" ? "status-for-review" : "status-paid"]
        });

        expect(cursor.includes("tx-moved")).toBe(true);
        expect(loserCursor.includes("tx-moved")).toBe(false);
        expect(loserCursor.count).toBe(0);
    });

    it("ignores maintenance shadow transactions", () => {
        const store = populateStore([
            makeTransaction({ id: "tx-real" }),
            makeTransaction({ id: SHADOW_ID, notes: "shadow" })
        ]);

        expect(rowsFrom(store).map((row) => row.id)).toEqual(["tx-real"]);
        expect(createTransactionCursor(buildTransactionIndex(store)).includes(SHADOW_ID)).toBe(
            false
        );
        expectMatchesArrayPipeline(store);
    });
});

describe("transaction cursor slicing across bucket boundaries", () => {
    // Two rows per day across three days, spanning a month and a year boundary, so every window of
    // two straddles a bucket.
    const dates = ["2024-01-02", "2024-01-01", "2023-12-31"];
    const store = populateStore(
        dates.flatMap((date, dayIndex) =>
            [0, 1].map((rowIndex) =>
                makeTransaction({
                    id: `tx-${dayIndex}-${rowIndex}`,
                    date: Temporal.PlainDate.from(date),
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(
                        1_700_000_000_000 - rowIndex * 1000
                    ),
                    importRowIndex: rowIndex
                })
            )
        )
    );

    const expected = filterTransactions(getAllTransactions(store), toQueryOptions({}));

    it("returns the same window as Array.prototype.slice at every offset and length", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store));
        expect(cursor.count).toBe(6);

        for (let offset = 0; offset <= 8; offset++) {
            for (let limit = 0; limit <= 8; limit++) {
                expectSameTransactions(
                    cursor.slice(offset, limit),
                    expected.slice(offset, offset + limit)
                );
            }
        }
    });

    it("returns a short window rather than padding past the end", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store));

        expect(cursor.slice(4, 10)).toHaveLength(2);
        expect(cursor.slice(6, 10)).toHaveLength(0);
        expect(cursor.slice(100, 10)).toHaveLength(0);
    });

    it("treats a non-positive limit as an empty window", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store));

        expect(cursor.slice(0, 0)).toEqual([]);
        expect(cursor.slice(2, -5)).toEqual([]);
    });
});

describe("transaction cursor index", () => {
    it("groups day buckets by calendar date, newest first, and counts physical copies", () => {
        const store = populateStore([
            makeTransaction({ id: "tx-1", date: Temporal.PlainDate.from("2024-03-15") }),
            makeTransaction({
                id: "tx-2",
                date: Temporal.PlainDate.from("2024-03-15"),
                accountId: "acc-2"
            }),
            makeTransaction({ id: "tx-3", date: Temporal.PlainDate.from("2023-11-02") })
        ]);
        const index = buildTransactionIndex(store);

        expect(index.dateGroups.map((group) => group.dateKey)).toEqual([20240315, 20231102]);
        expect(index.dateGroups[0].entries.map((entry) => entry.accountId).sort()).toEqual([
            "acc-1",
            "acc-2"
        ]);
        expect(index.physicalTransactionCount).toBe(3);
        expect(index.canonicalById.size).toBe(3);
    });
});

describe("transaction cursor positions", () => {
    // Three rows on each of three days spanning a month and a year boundary, plus a soft-deleted row
    // and a row belonging to a second account, so a position is only correct if it accounts for the
    // grouping, the within-day ordering and both filter dimensions at once.
    const store = populateStore([
        ...["2024-01-02", "2024-01-01", "2023-12-31"].flatMap((date, dayIndex) =>
            [0, 1, 2].map((rowIndex) =>
                makeTransaction({
                    id: `tx-${dayIndex}-${rowIndex}`,
                    date: Temporal.PlainDate.from(date),
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(
                        1_700_000_000_000 - rowIndex * 1000
                    ),
                    importRowIndex: rowIndex,
                    accountId: rowIndex === 2 ? "acc-2" : "acc-1"
                })
            )
        ),
        makeTransaction({
            id: "tx-deleted",
            date: Temporal.PlainDate.from("2024-01-01"),
            deletedAt: Temporal.Instant.from("2024-02-01T00:00:00Z")
        })
    ]);

    /** Every position the cursor reports, against the array pipeline's own `findIndex`. */
    function expectPositionsMatchArrayPipeline(filter: TransactionFilter): void {
        const cursor = createTransactionCursor(buildTransactionIndex(store), filter);
        const expected = filterTransactions(getAllTransactions(store), toQueryOptions(filter));

        // The comparison is only meaningful if the filter left rows to place.
        expect(expected.length).toBeGreaterThan(0);
        for (const [expectedIndex, transaction] of expected.entries()) {
            expect(cursor.indexOf(transaction.id)).toBe(expectedIndex);
        }
        expect(cursor.count).toBe(expected.length);
    }

    it("places every matching row exactly where the array pipeline does", () => {
        expectPositionsMatchArrayPipeline({});
    });

    it("places rows against a narrowed account filter, not against the unfiltered order", () => {
        expectPositionsMatchArrayPipeline({ accountIds: ["acc-2"] });
    });

    it("places rows against a narrowed date range", () => {
        expectPositionsMatchArrayPipeline({
            dateRange: { start: Temporal.PlainDate.from("2024-01-01") }
        });
    });

    it("reports -1 for a row the filter excludes rather than its unfiltered position", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store), {
            accountIds: ["acc-2"]
        });

        expect(cursor.indexOf("tx-0-2")).toBe(0);
        // Same date, same day bucket, excluded only by the account filter.
        expect(cursor.indexOf("tx-0-0")).toBe(-1);
    });

    it("reports -1 for a soft-deleted row, an unknown id and a maintenance shadow", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store));

        expect(cursor.indexOf("tx-deleted")).toBe(-1);
        expect(cursor.indexOf("tx-not-a-real-id")).toBe(-1);
        expect(cursor.indexOf(SHADOW_ID)).toBe(-1);
    });

    it("reports -1 for every row once the date range excludes its whole bucket", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store), {
            dateRange: { start: Temporal.PlainDate.from("2025-01-01") }
        });

        expect(cursor.count).toBe(0);
        expect(cursor.indexOf("tx-0-0")).toBe(-1);
    });

    it("agrees with slice, so a range built from two positions covers exactly those rows", () => {
        const cursor = createTransactionCursor(buildTransactionIndex(store));
        const from = cursor.indexOf("tx-0-2");
        const to = cursor.indexOf("tx-2-0");

        expect(from).toBeGreaterThanOrEqual(0);
        expect(to).toBeGreaterThan(from);
        const range = cursor.slice(from, to - from + 1);
        expect(range.at(0)?.id).toBe("tx-0-2");
        expect(range.at(-1)?.id).toBe("tx-2-0");
        expect(range).toHaveLength(to - from + 1);
    });
});

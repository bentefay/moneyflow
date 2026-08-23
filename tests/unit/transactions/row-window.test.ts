/**
 * The arithmetic behind the window of rows the grid holds.
 *
 * Two properties matter and pull against each other, so both are asserted directly rather than being
 * left to a rendering test to imply:
 *
 *  - the window must **contain** the visible range plus its overscan, or a scroll shows nothing;
 *  - it must **change rarely**, or the row model is rebuilt on the scroll path, which is worse than
 *    the pagination this replaces.
 *
 * The cases are chosen to sit on either side of the block boundaries and the margin, because a table
 * of positions comfortably inside one window would pass whatever the arithmetic said.
 */

import { describe, expect, it } from "vitest";

import {
    advanceTransactionRowWindowStart,
    TRANSACTION_ROW_BLOCK,
    TRANSACTION_ROW_WINDOW_ROWS,
    withPinnedTransactionRow
} from "@/components/features/transactions/row-window";

/** A viewport, in whole rows, comfortably larger than the grid's real one plus its overscan. */
const VIEWPORT_ROWS = 25;

function visibleAt(startIndex: number) {
    return { startIndex, endIndex: startIndex + VIEWPORT_ROWS - 1 };
}

const MATCHING_ROWS = 10_000;

describe("advanceTransactionRowWindowStart", () => {
    it("is built from a block bigger than any viewport, and a window of several blocks", () => {
        // The premise every case below rests on. A block narrower than the viewport would make
        // "contains the visible range" and "changes rarely" unsatisfiable together.
        expect(TRANSACTION_ROW_BLOCK).toBeGreaterThan(VIEWPORT_ROWS);
        expect(TRANSACTION_ROW_WINDOW_ROWS).toBeGreaterThanOrEqual(3 * TRANSACTION_ROW_BLOCK);
    });

    it("holds still while the viewport stays inside the loaded block", () => {
        const start = TRANSACTION_ROW_BLOCK; // a window of [200, 800)
        for (const visibleStart of [
            start + TRANSACTION_ROW_BLOCK / 2,
            start + TRANSACTION_ROW_BLOCK,
            start + 2 * TRANSACTION_ROW_BLOCK
        ]) {
            expect(
                advanceTransactionRowWindowStart(start, visibleAt(visibleStart), MATCHING_ROWS)
            ).toBe(start);
        }
    });

    it("holds still at the very top of the list, where there is nothing behind the viewport", () => {
        // Position 0 cannot be centred in a window, so the leading margin must not demand it.
        expect(advanceTransactionRowWindowStart(0, visibleAt(0), MATCHING_ROWS)).toBe(0);
        expect(advanceTransactionRowWindowStart(0, visibleAt(10), MATCHING_ROWS)).toBe(0);
    });

    it("moves once the viewport approaches the trailing edge, and then contains it", () => {
        const start = 0;
        const nearTrailingEdge = TRANSACTION_ROW_WINDOW_ROWS - TRANSACTION_ROW_BLOCK / 2;
        const moved = advanceTransactionRowWindowStart(
            start,
            visibleAt(nearTrailingEdge),
            MATCHING_ROWS
        );

        expect(moved).not.toBe(start);
        expect(moved).toBeLessThanOrEqual(nearTrailingEdge);
        expect(moved + TRANSACTION_ROW_WINDOW_ROWS).toBeGreaterThan(
            nearTrailingEdge + VIEWPORT_ROWS
        );
    });

    it("moves once the viewport approaches the leading edge, and then contains it", () => {
        const start = 4 * TRANSACTION_ROW_BLOCK;
        const nearLeadingEdge = start + TRANSACTION_ROW_BLOCK / 2 - 1;
        const moved = advanceTransactionRowWindowStart(
            start,
            visibleAt(nearLeadingEdge),
            MATCHING_ROWS
        );

        expect(moved).toBeLessThan(start);
        expect(moved).toBeLessThanOrEqual(nearLeadingEdge);
        expect(moved + TRANSACTION_ROW_WINDOW_ROWS).toBeGreaterThan(
            nearLeadingEdge + VIEWPORT_ROWS
        );
    });

    it("moves a handful of times across a thousand rows of scrolling, not once per row", () => {
        // The other half of the contract, and the half a containment test cannot see. A window that
        // simply tracked the viewport would contain the visible range perfectly and rebuild the row
        // model on every scroll notification — worse than the pagination this replaces. So the
        // measurement is the number of *changes* over a realistic scroll, one row at a time.
        const rowsScrolled = 1_000;
        let start = 0;
        let moves = 0;
        for (let visibleStart = 0; visibleStart <= rowsScrolled; visibleStart += 1) {
            const next = advanceTransactionRowWindowStart(
                start,
                visibleAt(visibleStart),
                MATCHING_ROWS
            );
            if (next !== start) moves += 1;
            start = next;
        }

        expect(moves).toBeGreaterThan(0);
        expect(moves).toBeLessThanOrEqual(Math.ceil(rowsScrolled / TRANSACTION_ROW_BLOCK));
        // And the window still holds the viewport at the end of the scroll.
        expect(start).toBeLessThanOrEqual(rowsScrolled);
        expect(start + TRANSACTION_ROW_WINDOW_ROWS).toBeGreaterThan(rowsScrolled + VIEWPORT_ROWS);
    });

    it("contains a jump straight to the deepest row, and never starts past the last window", () => {
        const deepest = MATCHING_ROWS - 1;
        const moved = advanceTransactionRowWindowStart(0, visibleAt(deepest), MATCHING_ROWS);

        expect(moved).toBeLessThanOrEqual(deepest);
        expect(moved).toBeLessThanOrEqual(MATCHING_ROWS - TRANSACTION_ROW_WINDOW_ROWS);
        expect(moved + TRANSACTION_ROW_WINDOW_ROWS).toBeGreaterThan(deepest);
    });

    it("stays at zero for a matching set smaller than one window", () => {
        expect(advanceTransactionRowWindowStart(0, visibleAt(0), 10)).toBe(0);
        expect(advanceTransactionRowWindowStart(0, visibleAt(9), 10)).toBe(0);
        // And recovers if a shrinking result set left the start beyond the end.
        expect(advanceTransactionRowWindowStart(5_000, visibleAt(0), 10)).toBe(0);
    });
});

describe("withPinnedTransactionRow", () => {
    const window = { indexes: [10, 11, 12], rows: ["a", "b", "c"] };

    it("returns the window untouched, without reading the row, when it already holds it", () => {
        const reads: number[] = [];
        const readRow = (index: number) => {
            reads.push(index);
            return "read";
        };

        expect(withPinnedTransactionRow(window, 11, readRow)).toBe(window);
        expect(withPinnedTransactionRow(window, -1, readRow)).toBe(window);
        // Reading a row outside the block costs the cursor a lookup, so the common case must not.
        expect(reads).toEqual([]);
    });

    it("merges a row from before the block at the front", () => {
        expect(withPinnedTransactionRow(window, 3, () => "pinned")).toEqual({
            indexes: [3, 10, 11, 12],
            rows: ["pinned", "a", "b", "c"]
        });
    });

    it("merges a row from after the block at the back", () => {
        expect(withPinnedTransactionRow(window, 99, () => "pinned")).toEqual({
            indexes: [10, 11, 12, 99],
            rows: ["a", "b", "c", "pinned"]
        });
    });

    it("leaves the window alone when the pinned row cannot be read", () => {
        // The row has left the matching set — a filter change, or a peer's delete. Merging
        // `undefined` would put a hole in the table's data.
        expect(withPinnedTransactionRow(window, 3, () => undefined)).toBe(window);
    });

    it("merges into an empty window", () => {
        const empty = { indexes: [] as number[], rows: [] as string[] };
        expect(withPinnedTransactionRow(empty, 7, () => "pinned")).toEqual({
            indexes: [7],
            rows: ["pinned"]
        });
    });
});

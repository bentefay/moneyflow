/**
 * The matching order a range gesture walks, and the two different guarantees it needs.
 *
 * Read the distinction before changing either group, because only one of them bites:
 *
 * - **"spans rows the grid does not hold"** is a *correctness* property. It passes against an eager
 *   implementation too — eager is slow, not wrong — so it does **not** guard laziness. What it does
 *   guard is a future change that restricts ranges to the loaded window, which would be silently
 *   wrong and which no other test can see: every other `extendRowSelectionTo` case uses a 10-id
 *   order against a 10-row table, where the matching order and the loaded rows are the same thing.
 * - **"does not copy the matching set"** is the *laziness* property, and it is the one that goes red
 *   against `cursor.slice(...).map(...)`.
 *
 * Keeping them apart matters: a reader who assumes both bite will later merge or drop one.
 */

import { describe, expect, it } from "vitest";

import {
    CURSOR_ROW_ORDER_BLOCK,
    transactionRowOrderFromCursor
} from "@/components/features/transactions/cursor-row-order";
import {
    ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
    asTransactionId,
    isTransactionRowSelected,
    setTransactionRowsSelected
} from "@/components/features/transactions/table-model";
import type { Transaction } from "@/lib/crdt/schema";
import type { TransactionCursor } from "@/lib/crdt/transaction-cursor";

const MATCHING_ROWS = 10_000;

function rowId(index: number): string {
    return `tx-${index.toString().padStart(5, "0")}`;
}

/**
 * A cursor over `MATCHING_ROWS` synthetic rows that records every `slice` it is asked for, so a test
 * can measure how much of the set a consumer actually caused to be built.
 */
function recordingCursor(): {
    readonly cursor: TransactionCursor;
    readonly slices: { offset: number; limit: number }[];
    rowsBuilt: () => number;
} {
    const slices: { offset: number; limit: number }[] = [];
    const cursor: TransactionCursor = {
        count: MATCHING_ROWS,
        slice: (offset, limit) => {
            slices.push({ offset, limit });
            const end = Math.min(MATCHING_ROWS, offset + limit);
            const rows: Transaction[] = [];
            for (let index = Math.max(0, offset); index < end; index += 1) {
                // Only the id is read by the row order, so a partial row is honest here — a full
                // `Transaction` would add nothing the assertions can see.
                rows.push({ id: rowId(index) } as unknown as Transaction);
            }
            return rows;
        },
        includes: () => true,
        indexOf: (transactionId) => Number(transactionId.slice("tx-".length)),
        values: function* () {},
        [Symbol.iterator]: function* () {}
    };
    return {
        cursor,
        slices,
        rowsBuilt: () =>
            slices.reduce(
                (total, { offset, limit }) =>
                    total + Math.max(0, Math.min(MATCHING_ROWS, offset + limit) - offset),
                0
            )
    };
}

describe("transactionRowOrderFromCursor: positions", () => {
    it("answers indexOf from the cursor without building anything", () => {
        const { cursor, rowsBuilt } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        expect(order.indexOf(asTransactionId(rowId(9_999)))).toBe(9_999);
        expect(rowsBuilt()).toBe(0);
    });
});

describe("transactionRowOrderFromCursor: laziness", () => {
    it("does not copy the matching set when the consumer wants only the first id", () => {
        // The single-target keystroke path: it walks the order and returns at the first row that is
        // not an exception. Against the eager `cursor.slice(...).map(...)` this built all 10,000
        // before the loop's first iteration.
        const { cursor, rowsBuilt } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        for (const transactionId of order.slice(0, MATCHING_ROWS - 1)) {
            expect(transactionId).toBe(asTransactionId(rowId(0)));
            break;
        }

        expect(rowsBuilt()).toBeLessThanOrEqual(CURSOR_ROW_ORDER_BLOCK);
        expect(rowsBuilt()).toBeLessThan(MATCHING_ROWS);
    });

    it("holds no more than one block at a time even across the whole span", () => {
        const { cursor, slices } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        const seen = [...order.slice(0, MATCHING_ROWS - 1)];

        // Every id, so a full-span gesture is still correct...
        expect(seen).toHaveLength(MATCHING_ROWS);
        expect(seen[0]).toBe(asTransactionId(rowId(0)));
        expect(seen.at(-1)).toBe(asTransactionId(rowId(MATCHING_ROWS - 1)));
        // ...but never asked for in one piece.
        expect(Math.max(...slices.map(({ limit }) => limit))).toBeLessThanOrEqual(
            CURSOR_ROW_ORDER_BLOCK
        );
    });

    it("yields the same ids on a second pass, because a state updater may run twice", () => {
        // The regression this file did not catch first time round. A bare generator is exhausted
        // after one pass, and `extendRowSelectionTo` hands its span to a React `setState` updater,
        // which React may invoke more than once — the second invocation then saw nothing and
        // shift-click selected no rows at all. Every other test here iterates once, and a
        // store-backed test table calls the updater once, so only the browser noticed.
        const { cursor } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        const span = order.slice(10, 14);

        expect([...span]).toHaveLength(5);
        expect([...span]).toHaveLength(5);
        expect([...span]).toEqual([...span]);
    });

    it("applies a DESELECT range identically when the state updater runs twice", () => {
        // The outcome direction, which the re-iterability case above does not cover and which is the
        // direction the E2E failure actually landed in: T021d shift-clicks a range that *begins by
        // deselecting*, and row 2 came out still selected.
        //
        // This composes the row order with the selection algebra the way `extendRowSelectionTo` does,
        // and calls the updater twice — which is what React is entitled to do and what the browser
        // did. Against a one-shot iterator the second call sees nothing and returns a selection with
        // no exceptions, i.e. every row still selected, which is precisely the reported symptom.
        const { cursor } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);
        const span = order.slice(2, 5);

        const first = setTransactionRowsSelected(
            ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
            span,
            false
        );
        const second = setTransactionRowsSelected(
            ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
            span,
            false
        );

        // Four rows deselected out of an all-matching baseline, both times.
        expect([...first.exceptions].sort()).toEqual([
            asTransactionId(rowId(2)),
            asTransactionId(rowId(3)),
            asTransactionId(rowId(4)),
            asTransactionId(rowId(5))
        ]);
        expect([...second.exceptions].sort()).toEqual([...first.exceptions].sort());
        expect(isTransactionRowSelected(second, asTransactionId(rowId(2)))).toBe(false);
    });

    it("stops asking once the cursor runs short, rather than walking to the requested end", () => {
        // A stale end index — the matching set shrank under a filter change — must not turn into a
        // walk over empty blocks to `toIndexInclusive`.
        const { cursor, slices } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        const seen = [...order.slice(MATCHING_ROWS - 10, MATCHING_ROWS + 5_000)];

        expect(seen).toHaveLength(10);
        expect(slices).toHaveLength(1);
    });
});

describe("transactionRowOrderFromCursor: spans rows the grid does not hold", () => {
    it("yields ids from deep in the matching order, far outside any window", () => {
        // NOTE: this passes against an eager implementation too. It is here to stop a future change
        // restricting the order to the rows the grid holds, which is the one way this could become
        // silently wrong — see the file docstring.
        const { cursor } = recordingCursor();
        const order = transactionRowOrderFromCursor(cursor);

        const deepSpan = [...order.slice(9_000, 9_004)];

        expect(deepSpan).toEqual([
            asTransactionId(rowId(9_000)),
            asTransactionId(rowId(9_001)),
            asTransactionId(rowId(9_002)),
            asTransactionId(rowId(9_003)),
            asTransactionId(rowId(9_004))
        ]);
    });
});

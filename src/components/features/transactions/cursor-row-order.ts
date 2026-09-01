/**
 * The matching order, as the two questions a range gesture asks, answered from a cursor.
 *
 * `TransactionRowOrder` exists so a range can span rows nobody holds a list of. The obvious
 * implementation defeats that: `cursor.slice(from, count).map(…)` is **eager** — `slice` builds an
 * array and pushes into it (`transaction-cursor.ts`) — so a full-span shift-click over ten thousand
 * matching rows allocated ten thousand `Transaction` references and ten thousand strings before the
 * consumer's first iteration, and a single keystroke that only needed the *first* answer paid the
 * same price.
 *
 * `slice` is declared as `Iterable<TransactionId>`, so a generator satisfies it and the consumer
 * decides how much to pull. This yields in blocks because `cursor.slice` is the only random-access
 * primitive available: one id at a time would mean a binary search per id, while a block bounds the
 * transient allocation without giving that up.
 *
 * What this does **not** change, so nobody reads a promise into it: selecting a full span still ends
 * with an exception per selected row, because the ten thousand rows really are individually selected
 * against a `no-rows` baseline. That cost belongs to the selection representation and no amount of
 * laziness removes it. What laziness removes is the *transient* copy of the matching set, and the
 * cost of asking for a span when only its head is wanted.
 */

import type { TransactionCursor } from "@/lib/crdt/transaction-cursor";

import { asTransactionId, type TransactionId, type TransactionRowOrder } from "./table-model";

/**
 * Ids pulled from the cursor per block.
 *
 * Large enough that a full-span walk is not dominated by repeated binary searches, small enough that
 * a consumer wanting only the first id does not materialise a meaningful fraction of the set.
 */
export const CURSOR_ROW_ORDER_BLOCK = 200;

/**
 * A {@link TransactionRowOrder} over a cursor, lazily.
 *
 * `slice` returns a **re-iterable** iterable — an object whose `[Symbol.iterator]` starts a fresh
 * generator — and not the generator itself. That distinction is load-bearing and cost an E2E
 * regression to learn: a bare generator is exhausted after one pass, and the range gesture hands its
 * span to a React `setState` updater, which React may invoke **more than once**. On the second
 * invocation a one-shot iterator yields nothing, so the updater computes an empty selection and
 * shift-click silently selects no rows. Every unit test still passed, because they iterate once and a
 * store-backed test table calls the updater once; only the browser did it twice.
 *
 * `newlyMatchingTransactionIds` in `page.tsx` already used this shape for the same reason. Anything
 * handed to a state updater must be re-iterable or already materialised.
 */
export function transactionRowOrderFromCursor(cursor: TransactionCursor): TransactionRowOrder {
    return {
        indexOf: (transactionId) => cursor.indexOf(transactionId),
        indexesOf: (transactionIds) => {
            if (transactionIds.size === 0) return [];
            const indexes: number[] = [];
            let index = 0;
            for (const transaction of cursor.values()) {
                if (transactionIds.has(asTransactionId(transaction.id))) indexes.push(index);
                index += 1;
                if (indexes.length === transactionIds.size) break;
            }
            return indexes;
        },
        slice: (fromIndex, toIndexInclusive) => ({
            [Symbol.iterator]: () => yieldRowIdsInBlocks(cursor, fromIndex, toIndexInclusive)
        })
    };
}

function* yieldRowIdsInBlocks(
    cursor: TransactionCursor,
    fromIndex: number,
    toIndexInclusive: number
): Generator<TransactionId> {
    for (let start = fromIndex; start <= toIndexInclusive; start += CURSOR_ROW_ORDER_BLOCK) {
        const limit = Math.min(CURSOR_ROW_ORDER_BLOCK, toIndexInclusive - start + 1);
        const block = cursor.slice(start, limit);
        // A short block means the cursor has no more rows, so there is nothing further to ask for.
        if (block.length === 0) return;
        for (const transaction of block) yield asTransactionId(transaction.id);
        if (block.length < limit) return;
    }
}

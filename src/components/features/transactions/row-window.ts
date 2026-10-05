/**
 * The bounded set of rows the transaction grid holds at any moment.
 *
 * The virtualizer's `count` is the *whole* matching set, so the scrollbar represents every matching
 * row and any position in it is immediately addressable. The table's row model must not be: feeding
 * it every matching row is what the cursor exists to prevent, and rebuilding it on every scroll
 * pixel would be worse still.
 *
 * So the grid holds a coarse **block** of the matching order around what is visible. The block moves
 * in whole blocks rather than continuously, and only once the visible range comes within a margin of
 * an edge — the margin is what stops a row of scroll jitter across a block boundary from re-slicing
 * the cursor twice per frame. Between moves the row model is both small and reference-stable, which
 * is what keeps TanStack's row model off the scroll path.
 *
 * A row can also be held for a reason unrelated to the viewport: the row holding the caret must stay
 * mounted however far the user scrolls away from it, so it travels with the window as a pin. That is
 * why a window is an ordered list of positions rather than a start offset — the positions it holds
 * are contiguous except for that one row.
 */

/** The inclusive span of matching-order positions the viewport is showing. */
export interface TransactionVisibleRange {
    readonly startIndex: number;
    readonly endIndex: number;
}

/**
 * Rows the grid holds, addressed by their absolute position in the matching order.
 *
 * `indexes` is strictly ascending and parallel to `rows`: `indexes[n]` is where `rows[n]` sits in the
 * whole matching set, which is the number the virtualizer speaks in.
 */
export interface TransactionRowWindow<TRow> {
    readonly indexes: readonly number[];
    readonly rows: readonly TRow[];
}

/** Rows per block. The window moves in these, so it moves rarely. */
export const TRANSACTION_ROW_BLOCK = 200;

/**
 * Rows the grid holds: the block the viewport is in, plus one block either side.
 *
 * Comfortably larger than any viewport plus its overscan, so ordinary scrolling never reaches an
 * edge, and small enough that the row model, the row-data projection and the per-row rule contexts
 * all stay bounded whatever the size of the matching set.
 */
export const TRANSACTION_ROW_WINDOW_ROWS = TRANSACTION_ROW_BLOCK * 3;

/**
 * How close to an edge the visible range may come before the window moves.
 *
 * Half a block, so the position that triggers a move and the position the window is re-anchored to
 * are at least half a block apart. Without that gap a viewport parked exactly on a block boundary
 * would re-slice the cursor on every jitter of one row.
 */
const WINDOW_MARGIN_ROWS = TRANSACTION_ROW_BLOCK / 2;

function snapToBlock(index: number): number {
    return Math.max(0, Math.floor(index / TRANSACTION_ROW_BLOCK) * TRANSACTION_ROW_BLOCK);
}

/**
 * Where the loaded window should start, given where it starts now and what the viewport is showing.
 *
 * Returns `currentStart` unchanged — the identical number, so a caller storing it in state re-renders
 * nothing — whenever the visible range still sits comfortably inside the loaded block. That is the
 * common case: this is called on every scroll notification and answers "no change" for all but the
 * few that cross a block.
 */
export function advanceTransactionRowWindowStart(
    currentStart: number,
    visible: TransactionVisibleRange,
    matchingRowCount: number
): number {
    const lastPossibleStart = Math.max(0, matchingRowCount - TRANSACTION_ROW_WINDOW_ROWS);
    const isAtListStart = currentStart <= 0;
    const isAtListEnd = currentStart >= lastPossibleStart;
    const covered =
        currentStart >= 0 &&
        currentStart <= lastPossibleStart &&
        (isAtListStart || visible.startIndex >= currentStart + WINDOW_MARGIN_ROWS) &&
        (isAtListEnd ||
            visible.endIndex < currentStart + TRANSACTION_ROW_WINDOW_ROWS - WINDOW_MARGIN_ROWS);
    if (covered) return currentStart;

    // Re-anchored a whole block before the viewport, so the window extends behind as well as ahead
    // and scrolling back up is as cheap as scrolling on.
    return Math.min(lastPossibleStart, snapToBlock(visible.startIndex - TRANSACTION_ROW_BLOCK));
}

/**
 * The window with each available pinned row merged at its own matching-order position.
 *
 * Active-origin and pending-target pins are applied in one operation. Applying one single-row helper
 * after another would make the second call inspect a no-longer-contiguous window and could silently
 * drop or misorder the second pin. Deduplication also bounds the result at the base window plus two
 * rows when both controller pins name the same transaction.
 *
 * `readRow` stays lazy because pins are ordinarily already inside the loaded block. Only indexes not
 * present in the window trigger cursor reads.
 */
export function withPinnedTransactionRows<TRow>(
    window: TransactionRowWindow<TRow>,
    pinnedIndexes: readonly number[],
    readRow: (index: number) => TRow | undefined
): TransactionRowWindow<TRow> {
    const missingIndexes = [...new Set(pinnedIndexes)]
        .filter((index) => index >= 0 && !window.indexes.includes(index))
        .sort((left, right) => left - right);
    if (missingIndexes.length === 0) return window;

    const indexes = [...window.indexes];
    const rows = [...window.rows];
    let inserted = false;
    for (const pinnedIndex of missingIndexes) {
        const pinnedRow = readRow(pinnedIndex);
        if (pinnedRow === undefined) continue;
        const nextIndex = indexes.findIndex((index) => index > pinnedIndex);
        const insertionIndex = nextIndex < 0 ? indexes.length : nextIndex;
        indexes.splice(insertionIndex, 0, pinnedIndex);
        rows.splice(insertionIndex, 0, pinnedRow);
        inserted = true;
    }
    return inserted ? { indexes, rows } : window;
}

/** Compatibility helper for callers that own only one pin. */
export function withPinnedTransactionRow<TRow>(
    window: TransactionRowWindow<TRow>,
    pinnedIndex: number,
    readRow: (index: number) => TRow | undefined
): TransactionRowWindow<TRow> {
    return withPinnedTransactionRows(window, [pinnedIndex], readRow);
}

/**
 * What happens to the grid's selections when the matching result set changes.
 *
 * The two selections answer this differently, and both answers are decisions rather than defaults.
 *
 * **Row selection is reconciled.** A row that has left the matching set stops being selected; a row
 * that has only just entered it stays unselected. That is an intersection, and it is expressible
 * against a cursor because it only visits the exceptions and the arrivals.
 *
 * **Cell selection is dropped.** A cell range is stored as two corner ids, and v9 recomputes what
 * lies between them on every change to the row and column order — so a range survives a filter
 * change by *widening onto cells the user never selected* (flagged [HIGH] in the official guide).
 * In a grid whose only consumer of a cell range is a clipboard copy, silently growing the rectangle
 * means copying data the user did not ask for. Dropping is the honest answer, and it is also the
 * one consistent with row selection refusing to acquire newly-matching rows.
 *
 * Neither answer can be left to `autoResetCellSelection`, which is why
 * {@link TRANSACTION_CELL_SELECTION_OPTIONS} turns it off. That option keys on the `data` option
 * changing *reference*, and under a cursor that is wrong in both directions: it fires on every
 * page-in as the user scrolls, which would make a multi-cell selection impossible to hold; and it
 * can miss a filter change that happens to leave the reference stable.
 */

import type { TransactionTable } from "./features";
import type { MatchingTransactionRows } from "./row-selection-baseline-feature";

/**
 * Table options this grid must be constructed with.
 *
 * Not a suggestion: with the default `autoResetCellSelection`, scrolling drops the user's cell
 * selection. See the module docstring.
 */
export const TRANSACTION_CELL_SELECTION_OPTIONS = {
    /** Selection lifetime is decided by {@link applyTransactionMatchingSetChange}, not by `data`. */
    autoResetCellSelection: false
} as const;

/**
 * Applies a change in the matching result set to both selections.
 *
 * One entry point rather than two calls at the call site, because the two selections have to move
 * together: a cell range left standing over a reconciled row selection is a rectangle describing
 * rows that are no longer the ones the header counts.
 *
 * Call this **only when the matching set has actually changed** — not when the cursor pages more of
 * the same set into view. Row-selection reconciliation carries the same precondition and the same
 * reason: it is cheap, but it is not free, and a redundant call also throws away a cell selection
 * the user is still building.
 */
export function applyTransactionMatchingSetChange(
    table: TransactionTable,
    matching: MatchingTransactionRows
): void {
    table.reconcileRowSelectionToMatching(matching);
    // `true` resets to empty rather than to `initialState.cellSelection`, which would restore a
    // seeded selection over rows that may no longer match.
    table.resetCellSelection(true);
}

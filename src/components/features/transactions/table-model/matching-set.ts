/**
 * What happens to the grid's selections when the matching result set changes.
 *
 * The two selections answer this differently, and both answers are decisions rather than defaults.
 *
 * **Row selection is reconciled.** A row that has left the matching set stops being selected; a row
 * that has only just entered it stays unselected. That is an intersection, and it is expressible
 * against a cursor because it only visits the exceptions and the arrivals.
 *
 * **Cell selection is reconciled by the workspace.** A range is stable-ID geometry over the full
 * cursor projection, so the table-local matching-set adapter must not reset it. The workspace advances
 * its structural generation and atomically publishes the reconciled external atom before the new
 * projection becomes interactive.
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
    /** Selection lifetime is decided by workspace reconciliation, not by `data`. */
    autoResetCellSelection: false,
    /** Pointer ranges write directly to the one workspace-owned external selection atom. */
    enableCellSelectionDrag: true
} as const;

/**
 * Applies a change in the matching result set to row-checkbox selection.
 *
 * Cell selection is owned by the workspace's external atom and structural reconciliation. Keeping
 * this adapter row-only prevents the table from becoming a second cell-selection authority.
 *
 * Call this **only when the matching set has actually changed** — not when the cursor pages more of
 * the same set into view. Row-selection reconciliation carries the same precondition and the same
 * reason: it is cheap, but it is not free, and newly matching rows must be classified only once.
 */
export function applyTransactionMatchingSetChange(
    table: TransactionTable,
    matching: MatchingTransactionRows
): void {
    table.reconcileRowSelectionToMatching(matching);
}

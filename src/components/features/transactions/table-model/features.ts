/**
 * The transaction grid's TanStack Table v9 feature registry.
 *
 * v9 installs a feature's state slice, options and instance APIs only when the feature is
 * registered, so this object is the grid's capability surface: everything the table can do, and
 * nothing it cannot. Registering a feature the grid never uses is not free — it adds a state
 * slice that `useTable`'s default subscription re-renders on, and it defeats v9's tree-shaking.
 *
 * ## What is registered, and why
 *
 * - **`cellSelectionFeature`** — spreadsheet-style single and multi-cell selection. Native rather
 *   than hand-rolled: it stores ranges as ordered include/exclude corner pairs, so a drag across
 *   ten thousand cells is a two-field write and "select all except these" is expressible at all.
 *   It also owns the render-order column index map, which is why no column-ordering feature is
 *   needed to make ranges resolve correctly.
 *
 * - **`rowSelectionBaselineFeature`** — this grid's row selection. It replaces the stock
 *   `rowSelectionFeature`, which cannot be used here: `RowSelectionState` is a positive per-row
 *   map and `toggleAllRowsSelected` enumerates the row model, so "all 100,000 matching rows" is
 *   not expressible without materialising 100,000 ids that the cursor never produces.
 *
 * - **`columnVisibilityFeature`** — for `getVisibleLeafColumns()`, which is the grid's render
 *   order. This matters beyond having a public accessor: cell selection builds its own display
 *   order from that same function, so the `grid-template-columns` string and the geometry a
 *   dragged range resolves against are derived from one list and cannot disagree about which
 *   columns exist or where they sit. The grid ships no visibility UI, so the slice stays empty;
 *   the feature is here for the ordering guarantee, and it leaves the integration pass a supported
 *   way to hide a column later.
 *
 * - **`columnMeta`** — a type-only slot, carrying the per-column presentation contract the grid
 *   already has: its `grid-template-columns` track, its alignment, whether it is editable, and how
 *   its value serialises to the clipboard.
 *
 * ## What is deliberately absent
 *
 * - `rowSelectionFeature` — replaced, as above. Registering both is a construction-time error.
 * - `columnFilteringFeature`, `rowSortingFeature`, `rowPaginationFeature` and their row models —
 *   filtering, ordering and paging happen upstream in the Loro cursor, which is the whole point of
 *   the cursor: the grid must never hold the full matching list. Registering them would add three
 *   state slices and three row-model stages that would each be handed an already-final list.
 * - `columnOrderingFeature`, `columnPinningFeature`, `columnSizingFeature`,
 *   `columnResizingFeature` — the grid has no UI for any of these. Definition order is render
 *   order, and widths are a fixed `grid-template-columns` string rather than per-column sizing
 *   state. Pinning in particular would break the equality above: cell selection reorders its
 *   display order for pinned columns and `getVisibleLeafColumns()` does not.
 * - `rowExpandingFeature` — the notes row is not a sub-row; it is a second element rendered by the
 *   same row component, and its open/closed set is local component state today. See the handoff
 *   notes: whether it should become table state is an integration decision, not a model one.
 * - `coreReactivityFeature` — supplied by the adapter. `useTable` injects React's bindings before
 *   spreading this object, so naming it here would override them.
 */

import {
    cellSelectionFeature,
    columnVisibilityFeature,
    createColumnHelper,
    metaHelper,
    type Table,
    tableFeatures
} from "@tanstack/table-core";

import type { TransactionRowData } from "../TransactionRow";
import type { TransactionCellMarker } from "./ids";
import { rowSelectionBaselineFeature } from "./row-selection-baseline-feature";

/**
 * The row data the grid's model is defined over.
 *
 * A type-only alias of the shape the existing row component already renders, so there is one row
 * contract rather than two. Type-only, so nothing in this module pulls a React component into a
 * model import.
 */
export type TransactionTableRow = TransactionRowData;

/** How a column's cells sit in their track. Matches the existing `COLUMN_CONFIG.align`. */
export type TransactionColumnAlign = "left" | "center" | "right";

/**
 * The per-column presentation contract.
 *
 * Declared through the `columnMeta` type-only slot rather than by declaration-merging v9's global
 * `ColumnMeta`, so it stays scoped to this table instead of leaking onto every v9 table in the
 * app.
 */
export interface TransactionColumnMeta {
    /**
     * This column's `grid-template-columns` track.
     *
     * The grid is a CSS grid whose header and every row share one template string, so a column's
     * width lives with the column rather than in a separate parallel array that could fall out of
     * step with it. See `transactionGridTemplateColumns`.
     */
    readonly gridTemplate: string;
    readonly align: TransactionColumnAlign;
    /** Whether this column's cells can be edited in place. Drives keyboard-navigable columns. */
    readonly editable: boolean;
    /**
     * The stable `data-cell` marker the row markup already carries for this column, or `null` for
     * a column that carries none.
     *
     * Presence reports which field a peer is editing by reading this marker, and the E2E suite
     * addresses cells by it, so it is part of the grid's contract and not a rendering detail.
     *
     * `null` is not a gap to be filled in later. The actions column is an unmarked container
     * around two separately-marked controls (`ACTIONS_COLUMN_CELL_MARKERS`), so it has no single
     * marker to name; inventing one would put a string in the model that appears nowhere in the
     * DOM. Likewise `notes` belongs to the expanded second row rather than to any column.
     */
    readonly cellMarker: TransactionCellMarker | null;
    /**
     * How a cell of this column serialises for the clipboard.
     *
     * Takes the row as well as the value because an amount's precision is a property of its
     * account's currency, not of the integer minor-unit value.
     */
    readonly copyValue: (value: unknown, row: TransactionTableRow) => string;
}

/** This grid's table instance, with exactly the APIs its registered features install. */
export type TransactionTable = Table<TransactionTableFeatures, TransactionTableRow>;

/**
 * The grid's registered features.
 *
 * A module constant, not a factory: v9 requires the feature object and the `tableFeatures` result
 * to be reference-stable, and a per-render object would rebuild the table's feature registry.
 */
export const transactionTableFeatures = tableFeatures({
    cellSelectionFeature,
    columnMeta: metaHelper<TransactionColumnMeta>(),
    columnVisibilityFeature,
    rowSelectionBaselineFeature
});

/** The concrete feature registry this table's APIs and state are gated on. */
export type TransactionTableFeatures = typeof transactionTableFeatures;

/** Column-definition helper carrying this grid's features and row type. */
export const transactionColumnHelper = createColumnHelper<
    TransactionTableFeatures,
    TransactionTableRow
>();

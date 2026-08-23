/**
 * Row selection for the transaction grid, as a real TanStack Table v9 feature.
 *
 * v9's stock `rowSelectionFeature` keys selection positively, one entry per selected row
 * (`Record<string, true>`), and `toggleAllRowsSelected` walks the row model to build it. The
 * transaction grid cannot use that. Rows arrive through a cursor, so at any moment most rows
 * matching the active filters have no `Row` object at all — selecting a hundred thousand of them
 * would mean materialising a hundred thousand ids the user never saw.
 *
 * So selection is inverted: a baseline covering every matching row, plus the individual rows that
 * diverge from it. "All matching rows" is then a constant-size value, the header's tri-state is a
 * subtraction, and one row's state is a single set lookup — none of which grows with the size of
 * the result set or with how much of it happens to be rendered.
 *
 * The point of shipping this as a *feature* rather than as state beside the table is that there is
 * then only one selection model. The baseline lives in `table.state.rowSelectionBaseline`, is
 * written through the table's own atoms, and is read through table and row APIs, exactly as a
 * stock feature's would be.
 *
 * Costs, because the representation exists to bound them:
 * - `getIsRowSelected`, `getSelectedRowCount`, `getRowSelectionHeaderState`, `selectAllMatchingRows`,
 *   `clearRowSelection`, `toggleRowSelected`: O(1) in the size of the matching set.
 * - `reconcileRowSelectionToMatching`: O(exceptions + newly matching), never O(matching).
 * - `getSelectedRowIdsWithin`: O(rows handed in). The one enumerating operation, and deliberately
 *   named so a caller cannot reach it by accident — a bulk action costs its own size regardless.
 */

import {
    assignPrototypeAPIs,
    assignTableAPIs,
    functionalUpdate,
    makeStateUpdater,
    type OnChangeFn,
    type RowData,
    type TableFeature,
    type TableFeatures,
    type Updater
} from "@tanstack/table-core";

import { asTransactionId, type TransactionId } from "./ids";

// ============================================================================
// The selection value
// ============================================================================

/** What every row matching the active filters is, unless it appears in `exceptions`. */
export type TransactionSelectionBaseline = "all-matching" | "no-rows";

export interface TransactionRowSelection {
    readonly baseline: TransactionSelectionBaseline;
    /**
     * Rows whose selection state is the opposite of {@link TransactionRowSelection.baseline}.
     *
     * Always a subset of the rows matching the active filters: writes only ever name a matching
     * row, and {@link reconcileRowSelection} re-derives the set when the matching rows change.
     * That invariant is what makes {@link selectedTransactionRowCount} exact without a scan.
     */
    readonly exceptions: ReadonlySet<TransactionId>;
}

/** Nothing selected. */
export const NO_TRANSACTION_ROWS_SELECTED: TransactionRowSelection = {
    baseline: "no-rows",
    exceptions: new Set()
};

/** Every row matching the active filters, including rows not rendered and rows not yet paged in. */
export const ALL_MATCHING_TRANSACTION_ROWS_SELECTED: TransactionRowSelection = {
    baseline: "all-matching",
    exceptions: new Set()
};

/** The header checkbox's tri-state over the whole filtered result set. */
export type TransactionSelectionHeaderState = "all" | "some" | "none";

/** What a selection gesture did to the row it acted on. */
export type TransactionSelectionOutcome = "selected" | "deselected";

/**
 * The row a range gesture extends from, and — crucially — what was done to it.
 *
 * Recording only which row was last acted on cannot tell a later shift-click whether the range
 * should select or deselect, which is why the outcome travels with the id.
 */
export interface TransactionSelectionAnchor {
    readonly transactionId: TransactionId;
    readonly outcome: TransactionSelectionOutcome;
}

/**
 * The order the table presents matching rows in, as two lookups rather than an array.
 *
 * A range gesture needs positions within the *matching* order, which under a cursor is not a list
 * anyone holds. Asking for the two operations a range actually needs lets a cursor answer them
 * from an index while an in-memory list answers them from itself; see
 * {@link transactionRowOrderFromIds} for the latter.
 */
export interface TransactionRowOrder {
    /** Position of a row in the presented order, or `-1` when it is not in it. */
    readonly indexOf: (transactionId: TransactionId) => number;
    /** Every row in an inclusive span of that order, in order. */
    readonly slice: (fromIndex: number, toIndexInclusive: number) => Iterable<TransactionId>;
}

/** A {@link TransactionRowOrder} over an in-memory list of ids. */
export function transactionRowOrderFromIds(
    orderedRowIds: readonly TransactionId[]
): TransactionRowOrder {
    const indexById = new Map(orderedRowIds.map((rowId, index) => [rowId, index]));
    return {
        indexOf: (transactionId) => indexById.get(transactionId) ?? -1,
        slice: (fromIndex, toIndexInclusive) => orderedRowIds.slice(fromIndex, toIndexInclusive + 1)
    };
}

/**
 * The matching result set, as the two questions reconciliation needs answered.
 *
 * `newlyMatchingRowIds` is required rather than optional because omitting it is silently wrong
 * under an `all-matching` baseline: a row that has only just started matching would inherit the
 * baseline and become selected, which the user never asked for. A caller with nothing new to
 * report passes an empty iterable and says so.
 */
export interface MatchingTransactionRows {
    /** Whether a row is still in the matching set. Must be O(1). */
    readonly includes: (transactionId: TransactionId) => boolean;
    /** Rows that entered the matching set since the previous reconciliation. */
    readonly newlyMatchingRowIds: Iterable<TransactionId>;
}

// ============================================================================
// The algebra — pure, and the whole of the feature's behaviour
// ============================================================================

/** Whether one row is selected. */
export function isTransactionRowSelected(
    selection: TransactionRowSelection,
    transactionId: TransactionId
): boolean {
    return selection.baseline === "all-matching"
        ? !selection.exceptions.has(transactionId)
        : selection.exceptions.has(transactionId);
}

/** How many matching rows are selected. Constant time, whatever the size of the result set. */
export function selectedTransactionRowCount(
    selection: TransactionRowSelection,
    matchingRowCount: number
): number {
    return selection.baseline === "all-matching"
        ? matchingRowCount - selection.exceptions.size
        : selection.exceptions.size;
}

/**
 * What the header checkbox reports: selected when every matching row is selected, indeterminate
 * when only some are, clear when none are. Derived from two sizes, never from a scan.
 */
export function transactionSelectionHeaderState(
    selection: TransactionRowSelection,
    matchingRowCount: number
): TransactionSelectionHeaderState {
    if (matchingRowCount <= 0) return "none";
    const selectedCount = selectedTransactionRowCount(selection, matchingRowCount);
    if (selectedCount <= 0) return "none";
    return selectedCount >= matchingRowCount ? "all" : "some";
}

/** Applies one outcome to a set of rows, leaving every other row's state untouched. */
export function setTransactionRowsSelected(
    selection: TransactionRowSelection,
    transactionIds: Iterable<TransactionId>,
    selected: boolean
): TransactionRowSelection {
    const divergesFromBaseline = selection.baseline === "all-matching" ? !selected : selected;
    const exceptions = new Set(selection.exceptions);
    for (const transactionId of transactionIds) {
        if (divergesFromBaseline) {
            exceptions.add(transactionId);
        } else {
            exceptions.delete(transactionId);
        }
    }
    return { baseline: selection.baseline, exceptions };
}

/** Flips one row's selection state. */
export function toggleTransactionRowSelected(
    selection: TransactionRowSelection,
    transactionId: TransactionId
): TransactionRowSelection {
    return setTransactionRowsSelected(
        selection,
        [transactionId],
        !isTransactionRowSelected(selection, transactionId)
    );
}

/** Selects exactly one row and nothing else. */
export function selectOnlyTransactionRow(transactionId: TransactionId): TransactionRowSelection {
    return { baseline: "no-rows", exceptions: new Set([transactionId]) };
}

/**
 * Whether an anchor still describes the selection.
 *
 * An anchor whose row no longer holds the outcome the anchor recorded — because the selection was
 * cleared or replaced from elsewhere — is stale, and the gesture falls back to an ordinary single
 * toggle rather than extending a fiction.
 */
export function anchorMatchesTransactionSelection(
    anchor: TransactionSelectionAnchor,
    selection: TransactionRowSelection
): boolean {
    return (
        isTransactionRowSelected(selection, anchor.transactionId) ===
        (anchor.outcome === "selected")
    );
}

/**
 * Re-derives the selection when the matching result set changes, so the set the header acts on
 * and reports is the new matching one.
 *
 * The rule is intersection: a row is selected afterwards exactly when it was selected before *and*
 * it still matches. Both halves matter. Rows that no longer match drop out rather than being
 * carried invisibly into a later bulk action; and rows that have only just started matching — a
 * widened filter, an import, a peer's insert — stay unselected, because the user never selected
 * them. Without the second half a bare `all-matching` baseline would silently acquire every row a
 * relaxed filter let back in.
 *
 * Under an `all-matching` baseline that intersection is still expressible as a baseline plus
 * exceptions: the newly-matching rows simply join the exception set. So narrowing a filter costs
 * nothing extra, and a peer's insert adds exactly one exception rather than materialising an id
 * per matching row.
 *
 * Only the exceptions and the newly-matching rows are visited. Nothing here walks the matching
 * set, which is what makes this usable against a cursor that never produces one.
 */
export function reconcileRowSelection(
    selection: TransactionRowSelection,
    matching: MatchingTransactionRows
): TransactionRowSelection {
    const exceptions = new Set<TransactionId>();
    for (const transactionId of selection.exceptions) {
        if (matching.includes(transactionId)) exceptions.add(transactionId);
    }

    if (selection.baseline === "all-matching") {
        // A row that did not match before was not selected before, so it must not be selected now.
        for (const transactionId of matching.newlyMatchingRowIds) {
            if (matching.includes(transactionId)) exceptions.add(transactionId);
        }
    }

    if (exceptions.size === selection.exceptions.size) {
        // Same membership, and the loops above only ever kept or added ids already accounted for,
        // so the selection is unchanged — return it by identity and let React skip the re-render.
        let unchanged = true;
        for (const transactionId of exceptions) {
            if (!selection.exceptions.has(transactionId)) {
                unchanged = false;
                break;
            }
        }
        if (unchanged) return selection;
    }
    return { baseline: selection.baseline, exceptions };
}

/**
 * Enumerates the selected rows in the order handed in.
 *
 * This is the one operation whose cost is the size of the result set, and it is deliberately
 * confined to the moment a bulk action runs — acting on N rows costs N regardless. Rendering,
 * toggling and reporting never call it.
 */
export function selectedTransactionRowIdsWithin(
    selection: TransactionRowSelection,
    orderedRowIds: readonly TransactionId[]
): readonly TransactionId[] {
    return orderedRowIds.filter((transactionId) =>
        isTransactionRowSelected(selection, transactionId)
    );
}

/** Exactly one row selected, if the selection names one; used for single-target keyboard actions. */
export function singleSelectedTransactionRowId(
    selection: TransactionRowSelection,
    orderedRowIds: readonly TransactionId[]
): TransactionId | null {
    if (selectedTransactionRowCount(selection, orderedRowIds.length) !== 1) return null;
    if (selection.baseline === "no-rows") {
        for (const transactionId of selection.exceptions) return transactionId;
        return null;
    }
    return orderedRowIds.find((rowId) => !selection.exceptions.has(rowId)) ?? null;
}

// ============================================================================
// Feature registration types
// ============================================================================

export interface TableState_RowSelectionBaseline {
    rowSelectionBaseline: TransactionRowSelection;
}

export interface TableOptions_RowSelectionBaseline {
    /**
     * How many rows match the active filters, including rows never rendered and rows the cursor has
     * not paged in.
     *
     * Required, and deliberately not defaulted. Every count and the header's tri-state are derived
     * from it, and the only value the table could invent for itself is the number of rows it
     * happens to hold — which is the exact bug this representation exists to prevent. A caller that
     * genuinely has no wider set passes the rendered count and has said so.
     */
    matchingRowCount: number;
    /** Called with an updater when the selection changes. */
    onRowSelectionBaselineChange?: OnChangeFn<TransactionRowSelection>;
}

export interface Table_RowSelectionBaseline {
    /** The whole selection value. */
    getRowSelectionBaseline: () => TransactionRowSelection;
    /** Replaces the selection. */
    setRowSelectionBaseline: (updater: Updater<TransactionRowSelection>) => void;
    /** Whether one row is selected, whether or not it is rendered or paged in. */
    getIsRowSelected: (transactionId: TransactionId) => boolean;
    /** How many matching rows are selected, from `options.matchingRowCount`. Never a scan. */
    getSelectedRowCount: () => number;
    /** The header checkbox's tri-state over the whole filtered result set. */
    getRowSelectionHeaderState: () => TransactionSelectionHeaderState;
    /** Applies one outcome to a set of rows, leaving every other row untouched. */
    setRowsSelected: (transactionIds: Iterable<TransactionId>, selected: boolean) => void;
    /** Flips one row, and makes it the anchor a later range gesture extends from. */
    toggleRowSelected: (transactionId: TransactionId) => void;
    /**
     * Extends the anchor's own outcome across the span between it and this row, then re-anchors
     * here. Falls back to an ordinary toggle when there is no anchor, when the anchor has gone
     * stale, or when either row has left the presented order.
     */
    extendRowSelectionTo: (transactionId: TransactionId, order: TransactionRowOrder) => void;
    /** Selects exactly one row and nothing else. */
    selectOnlyRow: (transactionId: TransactionId) => void;
    /** Selects every matching row, rendered or not, in constant time. */
    selectAllMatchingRows: () => void;
    /** Clears the selection entirely. */
    clearRowSelection: () => void;
    /** What the header checkbox does: select every matching row, or clear when all already are. */
    toggleAllMatchingRowsSelected: () => void;
    /** Re-derives the selection against a changed matching set. */
    reconcileRowSelectionToMatching: (matching: MatchingTransactionRows) => void;
    /** The row a range gesture currently extends from, and what was done to it. */
    getRowSelectionAnchor: () => TransactionSelectionAnchor | null;
    /** The selected rows among the ones handed in. The one operation whose cost is their number. */
    getSelectedRowIdsWithin: (orderedRowIds: readonly TransactionId[]) => readonly TransactionId[];
    /** The single selected row, if the selection names exactly one within the order handed in. */
    getSingleSelectedRowId: (orderedRowIds: readonly TransactionId[]) => TransactionId | null;
}

export interface Row_RowSelectionBaseline {
    /** Whether this row is selected. */
    getIsSelected: () => boolean;
}

/**
 * Registers the feature with v9's type system.
 *
 * Three of these maps are generic, and TypeScript requires every declaration of an interface to
 * repeat its type parameters *by name* — renaming them to `_TFeatures`/`_TData` raises TS2428 and
 * silently detaches the merge, taking the whole table's typing with it. This feature's
 * contributions happen not to need either parameter, so the names are declared and unused on
 * purpose; the suppressions below are that fact, not an oversight.
 */
declare module "@tanstack/table-core" {
    interface Plugins {
        rowSelectionBaselineFeature: TableFeature;
    }
    interface TableState_FeatureMap {
        rowSelectionBaselineFeature: TableState_RowSelectionBaseline;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see above: TS2428
    interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
        rowSelectionBaselineFeature: TableOptions_RowSelectionBaseline;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see above: TS2428
    interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
        rowSelectionBaselineFeature: Table_RowSelectionBaseline;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see above: TS2428
    interface Row_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
        rowSelectionBaselineFeature: Row_RowSelectionBaseline;
    }
}

// ============================================================================
// Reading the table without coercing it
// ============================================================================

/**
 * Table-owned data this feature keeps outside state.
 *
 * The anchor is here rather than in the state slice for the same reason v9 keeps its own drag and
 * range anchors out of state: nothing renders from it, and a persisted anchor would rehydrate into
 * a range gesture whose starting point the user has no memory of. Held in a `WeakMap` keyed by the
 * table rather than written onto the table object, so reading it back needs no coercion.
 */
interface RowSelectionBaselineInstanceData {
    readonly readSelection: () => TransactionRowSelection;
    anchor: TransactionSelectionAnchor | null;
}

const instanceDataByTable = new WeakMap<object, RowSelectionBaselineInstanceData>();

interface SelectionAtomHolder {
    readonly atoms: { readonly rowSelectionBaseline: { readonly get: () => unknown } };
}

/**
 * Whether the table carries this feature's state atom.
 *
 * A genuine runtime check rather than a cast: feature APIs are installed only when the feature is
 * registered, but the atom's *type* is a declaration-merge that the compiler cannot verify against
 * a generically-typed table. Checking once, loudly, at construction is what lets every later read
 * be a plain typed call.
 */
function hasSelectionAtom(table: object): table is SelectionAtomHolder {
    if (!("atoms" in table)) return false;
    const { atoms } = table;
    if (typeof atoms !== "object" || atoms == null) return false;
    if (!("rowSelectionBaseline" in atoms)) return false;
    const atom = atoms.rowSelectionBaseline;
    return (
        typeof atom === "object" && atom != null && "get" in atom && typeof atom.get === "function"
    );
}

function isTransactionRowSelectionValue(value: unknown): value is TransactionRowSelection {
    if (typeof value !== "object" || value == null) return false;
    if (!("baseline" in value) || !("exceptions" in value)) return false;
    const { baseline, exceptions } = value;
    return (baseline === "all-matching" || baseline === "no-rows") && exceptions instanceof Set;
}

function selectionReader(table: object): () => TransactionRowSelection {
    if (!hasSelectionAtom(table)) {
        throw new Error(
            "rowSelectionBaselineFeature: no `rowSelectionBaseline` state atom on the table."
        );
    }
    const atom = table.atoms.rowSelectionBaseline;
    return () => {
        const value = atom.get();
        if (!isTransactionRowSelectionValue(value)) {
            throw new Error(
                "rowSelectionBaselineFeature: `rowSelectionBaseline` state is not a selection."
            );
        }
        return value;
    };
}

function instanceData(table: object): RowSelectionBaselineInstanceData {
    const data = instanceDataByTable.get(table);
    if (data == null) {
        throw new Error(
            "rowSelectionBaselineFeature: table instance data is missing. The feature must be " +
                "registered through `tableFeatures({ rowSelectionBaselineFeature })`."
        );
    }
    return data;
}

/**
 * How many rows match the active filters.
 *
 * Read live rather than captured, because the option is re-supplied on every render as the filters
 * and the cursor move.
 */
function readMatchingRowCount(table: object): number {
    if (!("options" in table)) {
        throw new Error("rowSelectionBaselineFeature: table has no options.");
    }
    const { options } = table;
    if (typeof options !== "object" || options == null) {
        throw new Error("rowSelectionBaselineFeature: table options are not an object.");
    }
    if (!("matchingRowCount" in options) || typeof options.matchingRowCount !== "number") {
        throw new Error(
            "rowSelectionBaselineFeature: `matchingRowCount` is required. It is how many rows " +
                "match the active filters, including rows that are never rendered."
        );
    }
    return options.matchingRowCount;
}

function readSelectionChangeHandler(table: object): OnChangeFn<TransactionRowSelection> | null {
    if (!("options" in table)) return null;
    const { options } = table;
    if (typeof options !== "object" || options == null) return null;
    if (!("onRowSelectionBaselineChange" in options)) return null;
    const handler = options.onRowSelectionBaselineChange;
    return typeof handler === "function"
        ? (updater) => {
              handler(updater);
          }
        : null;
}

function isRowSelectionFeatureRegistered(table: object): boolean {
    if (!("_features" in table)) return false;
    const features = table._features;
    return typeof features === "object" && features != null && "rowSelectionFeature" in features;
}

// ============================================================================
// The feature
// ============================================================================

/** Writes a whole new selection and forgets the anchor, for the gestures that replace it wholesale. */
function replaceSelection(
    table: object,
    setSelection: (updater: Updater<TransactionRowSelection>) => void,
    selection: TransactionRowSelection
): void {
    setSelection(selection);
    instanceData(table).anchor = null;
}

/** Applies one outcome to one row and anchors there, which is what a plain click does. */
function toggleAndAnchor(
    table: object,
    setSelection: (updater: Updater<TransactionRowSelection>) => void,
    read: () => TransactionRowSelection,
    transactionId: TransactionId
): void {
    const nowSelected = !isTransactionRowSelected(read(), transactionId);
    setSelection((selection) =>
        setTransactionRowsSelected(selection, [transactionId], nowSelected)
    );
    instanceData(table).anchor = {
        transactionId,
        outcome: nowSelected ? "selected" : "deselected"
    };
}

/**
 * Baseline-plus-exceptions row selection, registered as a v9 feature so the grid has exactly one
 * selection model rather than a table and a selection that have to be kept in step.
 */
export const rowSelectionBaselineFeature: TableFeature = {
    getInitialState: (initialState) => ({
        rowSelectionBaseline: NO_TRANSACTION_ROWS_SELECTED,
        ...initialState
    }),

    getDefaultTableOptions: (table) => ({
        onRowSelectionBaselineChange: makeStateUpdater("rowSelectionBaseline", table)
    }),

    initTableInstanceData: (table) => {
        if (isRowSelectionFeatureRegistered(table)) {
            // Both features install `row.getIsSelected`, and the survivor would depend on
            // registration order. A grid that silently reported the wrong rows as selected is
            // worse than one that refuses to construct.
            throw new Error(
                "rowSelectionBaselineFeature replaces rowSelectionFeature; register only one. " +
                    "The stock feature keys selection positively and cannot express " +
                    "'every matching row' without materialising every id."
            );
        }
        instanceDataByTable.set(table, { anchor: null, readSelection: selectionReader(table) });
    },

    resetTableInstanceData: (table) => {
        instanceData(table).anchor = null;
    },

    constructTableAPIs: (table) => {
        const read = () => instanceData(table).readSelection();
        const setSelection = (updater: Updater<TransactionRowSelection>): void => {
            const handler = readSelectionChangeHandler(table);
            if (handler == null) return;
            handler((previous) => functionalUpdate(updater, previous));
        };

        assignTableAPIs("rowSelectionBaselineFeature", table, {
            table_getRowSelectionBaseline: { fn: () => read() },
            table_setRowSelectionBaseline: {
                fn: (updater: Updater<TransactionRowSelection>) => {
                    replaceSelection(table, setSelection, functionalUpdate(updater, read()));
                }
            },
            table_getIsRowSelected: {
                fn: (transactionId: TransactionId) =>
                    isTransactionRowSelected(read(), transactionId)
            },
            table_getSelectedRowCount: {
                fn: () => selectedTransactionRowCount(read(), readMatchingRowCount(table))
            },
            table_getRowSelectionHeaderState: {
                fn: () => transactionSelectionHeaderState(read(), readMatchingRowCount(table))
            },
            table_setRowsSelected: {
                fn: (transactionIds: Iterable<TransactionId>, selected: boolean) => {
                    setSelection((selection) =>
                        setTransactionRowsSelected(selection, transactionIds, selected)
                    );
                }
            },
            table_toggleRowSelected: {
                fn: (transactionId: TransactionId) => {
                    toggleAndAnchor(table, setSelection, read, transactionId);
                }
            },
            table_extendRowSelectionTo: {
                fn: (transactionId: TransactionId, order: TransactionRowOrder) => {
                    // The rows this gesture spans and the outcome to apply to them, or `null` when
                    // there is no range to extend. A stale anchor — one whose row no longer holds
                    // the outcome it recorded, because the selection was cleared or replaced from
                    // elsewhere — counts as no anchor, so the gesture degrades to an ordinary
                    // toggle rather than extending a fiction.
                    const selection = read();
                    const { anchor } = instanceData(table);
                    const span = (() => {
                        if (anchor == null) return null;
                        if (!anchorMatchesTransactionSelection(anchor, selection)) return null;
                        const anchorIndex = order.indexOf(anchor.transactionId);
                        const clickedIndex = order.indexOf(transactionId);
                        if (anchorIndex < 0 || clickedIndex < 0) return null;
                        return {
                            outcome: anchor.outcome,
                            transactionIds: order.slice(
                                Math.min(anchorIndex, clickedIndex),
                                Math.max(anchorIndex, clickedIndex)
                            )
                        };
                    })();

                    if (span == null) {
                        toggleAndAnchor(table, setSelection, read, transactionId);
                        return;
                    }

                    setSelection((current) =>
                        setTransactionRowsSelected(
                            current,
                            span.transactionIds,
                            span.outcome === "selected"
                        )
                    );
                    // The clicked row becomes the new anchor, carrying the outcome the range
                    // applied, so a further shift-click extends the same direction from it.
                    instanceData(table).anchor = { transactionId, outcome: span.outcome };
                }
            },
            table_selectOnlyRow: {
                fn: (transactionId: TransactionId) => {
                    replaceSelection(table, setSelection, selectOnlyTransactionRow(transactionId));
                }
            },
            table_selectAllMatchingRows: {
                fn: () => {
                    replaceSelection(table, setSelection, ALL_MATCHING_TRANSACTION_ROWS_SELECTED);
                }
            },
            table_clearRowSelection: {
                fn: () => {
                    replaceSelection(table, setSelection, NO_TRANSACTION_ROWS_SELECTED);
                }
            },
            table_toggleAllMatchingRowsSelected: {
                fn: () => {
                    const headerState = transactionSelectionHeaderState(
                        read(),
                        readMatchingRowCount(table)
                    );
                    replaceSelection(
                        table,
                        setSelection,
                        headerState === "all"
                            ? NO_TRANSACTION_ROWS_SELECTED
                            : ALL_MATCHING_TRANSACTION_ROWS_SELECTED
                    );
                }
            },
            table_reconcileRowSelectionToMatching: {
                fn: (matching: MatchingTransactionRows) => {
                    setSelection((selection) => reconcileRowSelection(selection, matching));
                }
            },
            table_getRowSelectionAnchor: { fn: () => instanceData(table).anchor },
            table_getSelectedRowIdsWithin: {
                fn: (orderedRowIds: readonly TransactionId[]) =>
                    selectedTransactionRowIdsWithin(read(), orderedRowIds)
            },
            table_getSingleSelectedRowId: {
                fn: (orderedRowIds: readonly TransactionId[]) =>
                    singleSelectedTransactionRowId(read(), orderedRowIds)
            }
        });
    },

    assignRowPrototype: (prototype, table) => {
        assignPrototypeAPIs("rowSelectionBaselineFeature", prototype, table, {
            row_getIsSelected: {
                fn: (row: { readonly id: string; readonly table: object }) =>
                    isTransactionRowSelected(
                        instanceData(row.table).readSelection(),
                        // A row's id is whatever `getRowId` returned, which for this grid is the
                        // transaction id itself; see `transactionTableRowId` in `table-options.ts`.
                        asTransactionId(row.id)
                    )
            }
        });
    }
};

/**
 * The transaction grid's TanStack Table v9 model.
 *
 * This is the canonical model for the grid: its features, its columns, its row identity, its row
 * selection and its cell selection all live in one table instance rather than in state kept beside
 * one. Rendering is not here — components consume this, not the other way round.
 */

export {
    buildTransactionTableColumns,
    type TransactionAllocationColumn,
    transactionColumnIds,
    transactionGridTemplateColumns,
    transactionTableRowId
} from "./columns";
export {
    applyTransactionCellKeyIntent,
    type FocusedControlBoundary,
    NON_TEXT_CONTROL,
    readFocusedControlBoundary,
    transactionCellKeyIntent,
    type TransactionCellKeyIntent
} from "./cell-key-intent";
export { transactionCellSelectionRowKey } from "./cell-selection-render";
export {
    controlHasTextSelection,
    documentHasTextSelection,
    readTransactionCopyIntent,
    type TransactionCopyDecision,
    transactionCopyDecision,
    type TransactionCopyIntent,
    transactionCopyOnKeyDown
} from "./copy-intent";
export {
    type TransactionClipboardPayload,
    transactionSelectionAsClipboardPayload
} from "./clipboard";
export {
    applyTransactionMatchingSetChange,
    TRANSACTION_CELL_SELECTION_OPTIONS
} from "./matching-set";
export {
    type TransactionColumnAlign,
    type TransactionColumnMeta,
    transactionColumnHelper,
    type TransactionTable,
    transactionTableFeatures,
    type TransactionTableFeatures,
    type TransactionTableRow
} from "./features";
export {
    ACTIONS_COLUMN_CELL_MARKERS,
    allocationColumnId,
    type AllocationTransactionColumnId,
    asTransactionCellId,
    asTransactionId,
    FIXED_TRANSACTION_COLUMN_IDS,
    type FixedTransactionCellMarker,
    type FixedTransactionColumnId,
    isAllocationColumnId,
    NOTES_CELL_MARKER,
    personIdOfAllocationColumn,
    type ResolvedTransactionCell,
    type ResolveTransactionCellIdError,
    type ResolveTransactionCellIdResult,
    resolveTransactionCellId,
    TRANSACTION_CELL_MARKERS,
    type TransactionCellId,
    transactionCellId,
    type TransactionCellMarker,
    type TransactionColumnId,
    type TransactionId
} from "./ids";
export {
    ALL_MATCHING_TRANSACTION_ROWS_SELECTED,
    anchorMatchesTransactionSelection,
    isTransactionRowSelected,
    type MatchingTransactionRows,
    NO_TRANSACTION_ROWS_SELECTED,
    reconcileRowSelection,
    type Row_RowSelectionBaseline,
    rowSelectionBaselineFeature,
    selectedTransactionRowCount,
    selectedTransactionRowIdsWithin,
    selectOnlyTransactionRow,
    setTransactionRowsSelected,
    singleSelectedTransactionRowId,
    type Table_RowSelectionBaseline,
    type TableOptions_RowSelectionBaseline,
    type TableState_RowSelectionBaseline,
    toggleTransactionRowSelected,
    type TransactionRowOrder,
    transactionRowOrderFromIds,
    type TransactionRowSelection,
    type TransactionSelectionAnchor,
    type TransactionSelectionBaseline,
    type TransactionSelectionHeaderState,
    transactionSelectionHeaderState,
    type TransactionSelectionOutcome
} from "./row-selection-baseline-feature";

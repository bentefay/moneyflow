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
    transactionCellSelectionRowKey,
    transactionSelectedCellMarkersFromRowKey
} from "./cell-selection-render";
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
    activeTransactionGridAddress,
    asTransactionCompositionSequence,
    abortTransactionPendingActivation,
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    cancelTransactionPendingActivation,
    clearTransactionContinuousEdit,
    fulfillTransactionPendingActivation,
    type NonEmptyTransactionGridSelection,
    INACTIVE_TRANSACTION_COMPOSITION,
    latestTransactionSelectionOperation,
    moveTransactionContinuousEdit,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    reduceTransactionComposition,
    transactionGridPins,
    transactionGridPresence,
    transactionGridRetainsDeferredPresence,
    transactionGridSelectionVisibility,
    transitionTransactionContinuousEdit,
    type TransactionCompositionEvent,
    type TransactionCompositionResult,
    type TransactionCompositionSequence,
    type TransactionCompositionState,
    type TransactionContinuousEditIntent,
    type TransactionContinuousEditMovementResult,
    type TransactionContinuousEditStop,
    type TransactionContinuousEditTransition,
    type TransactionEditEntry,
    type TransactionEditorPopupKind,
    type TransactionFieldEditorBinding,
    type TransactionGridAddress,
    type TransactionGridCommand,
    type TransactionGridCommandError,
    type TransactionGridCommandId,
    type TransactionGridCommandResult,
    type TransactionGridDeferredPresence,
    type TransactionGridEditingState,
    type TransactionGridEditorReturnState,
    type TransactionGridEditorState,
    type TransactionGridEngagedSnapshot,
    type TransactionGridEngagedState,
    type TransactionGridInspectorFocusOwnership,
    type TransactionGridInspectorReturnState,
    type TransactionGridInspectingState,
    type TransactionGridInteractionState,
    type TransactionGridInteractingState,
    type TransactionGridPendingActivationState,
    type TransactionGridPin,
    type TransactionGridPresence,
    type TransactionGridSelection,
    type TransactionGridSelectionOperation,
    type TransactionGridStaleOperationError,
    type TransactionInspectorActionBinding,
    type TransactionInspectorAutomationBinding,
    type TransactionInspectorControlBinding,
    type TransactionInspectorFieldBinding,
    type TransactionOwnedControlBinding,
    type TransactionPendingActivationFulfillment,
    type TransactionPendingActivationOrigin,
    type TransactionPendingActivationTransitionResult,
    type TransactionPendingOperationIdentity,
    type TransactionSelectionOperationKind,
    type TransactionSelectionVisibility
} from "./grid-interaction-state";
export {
    activationTransactionGridKeyCell,
    editableTransactionGridKeyCell,
    NONEDITABLE_TRANSACTION_GRID_KEY_CELL,
    type TransactionCellActivation,
    type TransactionGridCompositionStartIntent,
    transactionGridCompositionStartIntent,
    type TransactionGridFollowUpIntent,
    type TransactionGridKeyCellContext,
    type TransactionGridKeyContext,
    type TransactionGridKeyEvent,
    type TransactionGridKeyIntent,
    type TransactionGridKeyMode,
    type TransactionNavigationTarget,
    transactionGridKeyContext,
    transactionGridKeyIntent
} from "./grid-key-intent";
export {
    resolveTransactionNavigationTarget,
    type TransactionNavigationCommand,
    type TransactionNavigationResolution,
    type TransactionProjectionError,
    transactionProjectionFromCursor,
    type TransactionProjectionResult,
    type TransactionProjectionSnapshot
} from "./grid-navigation";
export {
    reconcileTransactionGridProjection,
    resolveTransactionGridFailure,
    transactionInspectorBindingEquals,
    type TransactionGridFailureResolution,
    type TransactionGridFocusIntent,
    type TransactionGridFocusOwnership,
    type TransactionGridOperationError,
    type TransactionGridOperationSnapshot,
    type TransactionGridPinReconciliation,
    type TransactionGridReconciliationOptions,
    type TransactionGridReconciliationOutcome,
    type TransactionGridReconciliationResult,
    type TransactionInspectorBindingRegistration
} from "./grid-reconciliation";
export {
    type TransactionColumnActivationKind,
    type TransactionColumnAlign,
    type TransactionColumnEditKind,
    type TransactionColumnInteractionMeta,
    type TransactionColumnMeta,
    type TransactionColumnPopupOwner,
    transactionColumnHelper,
    type TransactionTable,
    type TransactionTableCell,
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
    type TransactionId,
    type TransactionProjectionGeneration
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

import { assertNever } from "@/lib/utils/exhaustive";

import {
    activeTransactionGridAddress,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    type NonEmptyTransactionGridSelection,
    type TransactionContinuousEditIntent,
    type TransactionGridAddress,
    type TransactionGridCommandError,
    type TransactionGridEngagedSnapshot,
    type TransactionGridEngagedState,
    type TransactionGridFocusOwnership,
    type TransactionGridInteractionState,
    type TransactionGridInspectorFocusOwnership,
    type TransactionGridPendingActivationState,
    type TransactionInspectorControlBinding
} from "./grid-interaction-state";
import { historicalTransactionPosition } from "./grid-navigation";
import type {
    TransactionProjectionError,
    TransactionProjectionResult,
    TransactionProjectionSnapshot
} from "./grid-navigation";
import type { TransactionColumnId, TransactionId, TransactionProjectionGeneration } from "./ids";

export type { TransactionGridFocusOwnership } from "./grid-interaction-state";

export interface TransactionInspectorBindingRegistration {
    readonly transactionOwner: TransactionId;
    readonly binding: TransactionInspectorControlBinding;
}

export type TransactionGridFocusIntent =
    | { readonly kind: "none" }
    | { readonly kind: "gridcell"; readonly address: TransactionGridAddress }
    | { readonly kind: "inspector-heading" }
    | {
          readonly kind: "retain-inspector-control";
          readonly binding: TransactionInspectorControlBinding;
      }
    | { readonly kind: "after-grid" };

export type TransactionGridPinReconciliation =
    | { readonly kind: "clear" }
    | { readonly kind: "active-only"; readonly transactionId: TransactionId }
    | { readonly kind: "pending-only"; readonly transactionId: TransactionId }
    | {
          readonly kind: "active-and-pending";
          readonly activeTransactionId: TransactionId;
          readonly pendingTransactionId: TransactionId;
      };

export interface TransactionGridReconciliationResult {
    readonly generation: TransactionProjectionGeneration;
    readonly state: TransactionGridInteractionState<unknown>;
    readonly focus: TransactionGridFocusIntent;
    /** Focus deferred until a retained pending command aborts after this reconciliation. */
    readonly pendingAbortFocus?: Extract<
        TransactionGridFocusIntent,
        { readonly kind: "gridcell" | "after-grid" }
    >;
    readonly pins: TransactionGridPinReconciliation;
    readonly cancelledDraft: boolean;
    readonly cancelledPopup: boolean;
}

export type TransactionGridReconciliationOutcome =
    | { readonly ok: true; readonly value: TransactionGridReconciliationResult }
    | { readonly ok: false; readonly error: TransactionProjectionError };

export function transactionInspectorBindingEquals(
    first: TransactionInspectorControlBinding,
    second: TransactionInspectorControlBinding
): boolean {
    switch (first.kind) {
        case "field":
            return second.kind === "field" && first.columnId === second.columnId;
        case "action":
            return second.kind === "action" && first.action === second.action;
        case "automation":
            return second.kind === "automation" && first.field === second.field;
        default:
            return assertNever(first, "transaction inspector binding");
    }
}

function bindingSurvives(
    transactionOwner: TransactionId,
    binding: TransactionInspectorControlBinding,
    available: readonly TransactionInspectorBindingRegistration[]
): boolean {
    return available.some(
        (candidate) =>
            candidate.transactionOwner === transactionOwner &&
            transactionInspectorBindingEquals(candidate.binding, binding)
    );
}

function oneCellSelection(address: TransactionGridAddress): NonEmptyTransactionGridSelection {
    return [
        {
            anchorColumnId: address.columnId,
            anchorRowId: address.transactionId,
            focusColumnId: address.columnId,
            focusRowId: address.transactionId,
            operation: "include"
        }
    ];
}

/** Chooses by distance in the prior canonical order, resolving an equal-distance tie to the left. */
function nearestSurvivingPriorColumn(
    previousColumns: readonly TransactionColumnId[],
    nextColumns: readonly TransactionColumnId[],
    previousColumn: TransactionColumnId
): TransactionColumnId | undefined {
    if (nextColumns.includes(previousColumn)) return previousColumn;
    const previousIndex = previousColumns.indexOf(previousColumn);
    if (previousIndex < 0) return undefined;

    const candidates = previousColumns
        .map((columnId, index) => ({ columnId, index }))
        .filter((candidate) => nextColumns.includes(candidate.columnId))
        .sort((first, second) => {
            const firstDistance = Math.abs(first.index - previousIndex);
            const secondDistance = Math.abs(second.index - previousIndex);
            return firstDistance === secondDistance
                ? first.index - second.index
                : firstDistance - secondDistance;
        });
    return candidates[0]?.columnId;
}

function inspectorFocusResult(
    focusOwner: Extract<TransactionGridFocusOwnership, { readonly kind: "inspector" }>,
    address: TransactionGridAddress,
    availableBindings: readonly TransactionInspectorBindingRegistration[],
    ownerSurvives: boolean
): {
    readonly stateKind: "inspecting" | "navigating";
    readonly focus: TransactionGridFocusIntent;
} {
    if (
        ownerSurvives &&
        focusOwner.panelOpen &&
        focusOwner.focused.kind === "control" &&
        bindingSurvives(address.transactionId, focusOwner.focused.binding, availableBindings)
    ) {
        return {
            focus: {
                binding: focusOwner.focused.binding,
                kind: "retain-inspector-control"
            },
            stateKind: "inspecting"
        };
    }
    if (focusOwner.panelOpen && focusOwner.headingRegistered) {
        return { focus: { kind: "inspector-heading" }, stateKind: "inspecting" };
    }
    return { focus: { address, kind: "gridcell" }, stateKind: "navigating" };
}

function stateOwnsDraft(state: TransactionGridEngagedState<unknown>): boolean {
    return (
        state.kind === "editing" || (state.kind === "interacting" && state.owner === "grid-editor")
    );
}

function emptyResult(
    generation: TransactionProjectionGeneration,
    previousState: TransactionGridEngagedState<unknown>,
    focusOwner: TransactionGridFocusOwnership
): TransactionGridReconciliationResult {
    const inspectorOwnsFocus = focusOwner.kind === "inspector";
    const focus: TransactionGridFocusIntent =
        inspectorOwnsFocus && focusOwner.panelOpen && focusOwner.headingRegistered
            ? { kind: "inspector-heading" }
            : focusOwner.kind === "grid" || inspectorOwnsFocus
              ? { kind: "after-grid" }
              : { kind: "none" };
    return {
        cancelledDraft: stateOwnsDraft(previousState),
        cancelledPopup: previousState.kind === "interacting",
        focus,
        generation,
        pins: { kind: "clear" },
        state: { kind: "idle", selection: [] }
    };
}

function continuousIntentOfState(
    state: TransactionGridEngagedState<unknown>
): TransactionContinuousEditIntent {
    if (state.kind === "navigating") return state.continuous;
    if (state.kind === "editing") return state.editor.continuous;
    if (state.kind === "interacting" && state.owner === "grid-editor") {
        return state.returnState.editor.continuous;
    }
    return NO_TRANSACTION_CONTINUOUS_EDIT;
}

function selectionSurvivesProjection<TRow>(
    selection: NonEmptyTransactionGridSelection,
    projection: TransactionProjectionSnapshot<TRow>
): boolean {
    for (const operation of selection) {
        if (
            !projection.selectableColumnIds.includes(operation.anchorColumnId) ||
            !projection.selectableColumnIds.includes(operation.focusColumnId)
        ) {
            return false;
        }
        const anchorIndex = projection.indexOf(projection.generation, operation.anchorRowId);
        const focusIndex = projection.indexOf(projection.generation, operation.focusRowId);
        if (!anchorIndex.ok || anchorIndex.value < 0 || !focusIndex.ok || focusIndex.value < 0) {
            return false;
        }
    }
    return true;
}

function finishNonEmpty(options: {
    readonly address: TransactionGridAddress;
    readonly availableInspectorBindings: readonly TransactionInspectorBindingRegistration[];
    readonly focusOwner: TransactionGridFocusOwnership;
    readonly generation: TransactionProjectionGeneration;
    readonly rowSurvives: boolean;
    readonly columnSurvives: boolean;
    readonly previousState: TransactionGridEngagedState<unknown>;
    readonly preserveSelection: boolean;
}): TransactionGridReconciliationResult {
    const selection = options.preserveSelection
        ? options.previousState.selection
        : oneCellSelection(options.address);
    const gridCellSurvives = options.rowSurvives && options.columnSurvives;
    const invalidatedDraft = stateOwnsDraft(options.previousState) && !gridCellSurvives;
    const pins: TransactionGridPinReconciliation = {
        kind: "active-only",
        transactionId: options.address.transactionId
    };
    const common = {
        cancelledDraft: invalidatedDraft,
        generation: options.generation,
        pins
    };

    if (options.focusOwner.kind === "external") {
        return {
            ...common,
            cancelledPopup: false,
            focus: { kind: "none" },
            state: { kind: "parked", selection }
        };
    }
    if (options.focusOwner.kind === "grid") {
        const cancelledPopup = options.previousState.kind === "interacting" && !gridCellSurvives;
        if (gridCellSurvives && options.previousState.kind === "editing") {
            return {
                ...common,
                cancelledPopup,
                focus: { kind: "none" },
                state: { ...options.previousState, selection }
            };
        }
        if (
            gridCellSurvives &&
            options.previousState.kind === "interacting" &&
            options.previousState.owner === "grid-editor"
        ) {
            return {
                ...common,
                cancelledPopup,
                focus: { kind: "none" },
                state: { ...options.previousState, selection }
            };
        }
        return {
            ...common,
            cancelledPopup,
            focus: { address: options.address, kind: "gridcell" },
            state: {
                continuous: continuousIntentOfState(options.previousState),
                kind: "navigating",
                selection
            }
        };
    }

    const inspector = inspectorFocusResult(
        options.focusOwner,
        options.address,
        options.availableInspectorBindings,
        options.rowSurvives
    );
    const inspectorPopupSurvives =
        options.previousState.kind === "interacting" &&
        options.previousState.owner === "inspector" &&
        inspector.focus.kind === "retain-inspector-control" &&
        transactionInspectorBindingEquals(options.previousState.binding, inspector.focus.binding);
    if (inspectorPopupSurvives) {
        return {
            ...common,
            cancelledPopup: false,
            focus: inspector.focus,
            state: { ...options.previousState, selection }
        };
    }
    return {
        ...common,
        cancelledPopup: options.previousState.kind === "interacting",
        focus: inspector.focus,
        state:
            inspector.stateKind === "inspecting"
                ? { kind: "inspecting", selection }
                : {
                      continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                      kind: "navigating",
                      selection
                  }
    };
}

function reconcileEngagedProjection<TRow>(options: {
    readonly previousState: TransactionGridEngagedState<unknown>;
    readonly previousProjection: TransactionProjectionSnapshot<TRow>;
    readonly nextProjection: TransactionProjectionSnapshot<TRow>;
    readonly focusOwner: TransactionGridFocusOwnership;
    readonly availableInspectorBindings: readonly TransactionInspectorBindingRegistration[];
}): TransactionGridReconciliationOutcome {
    const {
        availableInspectorBindings,
        focusOwner,
        nextProjection,
        previousProjection,
        previousState
    } = options;
    if (nextProjection.rowCount === 0 || nextProjection.selectableColumnIds.length === 0) {
        return {
            ok: true,
            value: emptyResult(nextProjection.generation, previousState, focusOwner)
        };
    }

    const previousAddress = activeTransactionGridAddress(previousState.selection);
    const priorPosition = historicalTransactionPosition(
        previousProjection,
        previousAddress.transactionId
    );
    if (!priorPosition.ok) return priorPosition;
    if (priorPosition.value < 0) {
        return { error: { address: previousAddress, kind: "unknown-address" }, ok: false };
    }

    const survivingPosition = nextProjection.indexOf(
        nextProjection.generation,
        previousAddress.transactionId
    );
    if (!survivingPosition.ok) return survivingPosition;
    const rowSurvives = survivingPosition.value >= 0;
    const nextTransactionId: TransactionProjectionResult<TransactionId> = rowSurvives
        ? { ok: true, value: previousAddress.transactionId }
        : nextProjection.idAt(
              nextProjection.generation,
              Math.min(nextProjection.rowCount - 1, priorPosition.value)
          );
    if (!nextTransactionId.ok) return nextTransactionId;

    const nextColumnId = nearestSurvivingPriorColumn(
        previousProjection.selectableColumnIds,
        nextProjection.selectableColumnIds,
        previousAddress.columnId
    );
    if (nextColumnId == null) {
        return { error: { address: previousAddress, kind: "unknown-address" }, ok: false };
    }

    const columnSurvives = nextColumnId === previousAddress.columnId;
    return {
        ok: true,
        value: finishNonEmpty({
            address: { columnId: nextColumnId, transactionId: nextTransactionId.value },
            availableInspectorBindings,
            focusOwner,
            columnSurvives,
            generation: nextProjection.generation,
            preserveSelection:
                focusOwner.kind === "external" &&
                selectionSurvivesProjection(previousState.selection, nextProjection),
            previousState,
            rowSurvives
        })
    };
}

function engagedSnapshotAfterReconciliation(
    result: TransactionGridReconciliationResult,
    previous: TransactionGridFocusOwnership
): TransactionGridEngagedSnapshot<unknown> | undefined {
    if (result.state.kind === "idle" || result.state.kind === "pending-activation")
        return undefined;
    if (result.state.kind === "parked") {
        return { focusOwner: { kind: "external" }, state: result.state };
    }
    if (
        result.state.kind === "navigating" ||
        result.state.kind === "editing" ||
        (result.state.kind === "interacting" && result.state.owner === "grid-editor")
    ) {
        return { focusOwner: { kind: "grid" }, state: result.state };
    }

    const panelOpen = previous.kind === "inspector" && previous.panelOpen;
    const headingRegistered = previous.kind === "inspector" && previous.headingRegistered;
    const focusOwner: TransactionGridInspectorFocusOwnership = {
        focused:
            result.focus.kind === "retain-inspector-control"
                ? { binding: result.focus.binding, kind: "control" }
                : { kind: "heading" },
        headingRegistered,
        kind: "inspector",
        panelOpen
    };
    return { focusOwner, state: result.state };
}

function pendingResult(
    state: TransactionGridPendingActivationState<unknown>,
    cancelledDraft: boolean,
    cancelledPopup: boolean,
    pendingAbortFocus?: Extract<
        TransactionGridFocusIntent,
        { readonly kind: "gridcell" | "after-grid" }
    >
): TransactionGridReconciliationResult {
    const pins: TransactionGridPinReconciliation =
        state.origin.kind === "neutral"
            ? { kind: "pending-only", transactionId: state.target.transactionId }
            : {
                  activeTransactionId: activeTransactionGridAddress(
                      state.origin.snapshot.state.selection
                  ).transactionId,
                  kind: "active-and-pending",
                  pendingTransactionId: state.target.transactionId
              };
    return {
        cancelledDraft,
        cancelledPopup,
        focus: { kind: "none" },
        generation: state.projectionGeneration,
        ...(pendingAbortFocus == null ? {} : { pendingAbortFocus }),
        pins,
        state
    };
}

function neutralIdleResult(
    generation: TransactionProjectionGeneration
): TransactionGridReconciliationResult {
    return {
        cancelledDraft: false,
        cancelledPopup: false,
        focus: { kind: "none" },
        generation,
        pins: { kind: "clear" },
        state: { kind: "idle", selection: [] }
    };
}

function pendingTargetColumnSurvives<TRow>(
    pending: TransactionGridPendingActivationState<unknown>,
    projection: TransactionProjectionSnapshot<TRow>
): boolean {
    return projection.selectableColumnIds.includes(pending.target.columnId);
}

function pendingTargetRowSurvives<TRow>(
    pending: TransactionGridPendingActivationState<unknown>,
    projection: TransactionProjectionSnapshot<TRow>
): TransactionProjectionResult<boolean> {
    const position = projection.indexOf(projection.generation, pending.target.transactionId);
    return position.ok ? { ok: true, value: position.value >= 0 } : position;
}

function reconcilePendingActivation<TRow>(options: {
    readonly pending: TransactionGridPendingActivationState<unknown>;
    readonly previousProjection: TransactionProjectionSnapshot<TRow>;
    readonly nextProjection: TransactionProjectionSnapshot<TRow>;
    readonly availableInspectorBindings: readonly TransactionInspectorBindingRegistration[];
}): TransactionGridReconciliationOutcome {
    const { availableInspectorBindings, nextProjection, pending, previousProjection } = options;
    if (pending.projectionGeneration !== previousProjection.generation) {
        return {
            error: {
                actual: previousProjection.generation,
                expected: pending.projectionGeneration,
                kind: "stale-projection"
            },
            ok: false
        };
    }

    const targetColumnSurvives = pendingTargetColumnSurvives(pending, nextProjection);
    if (pending.origin.kind === "neutral") {
        if (!targetColumnSurvives) {
            return { ok: true, value: neutralIdleResult(nextProjection.generation) };
        }
        const targetRowSurvives = pendingTargetRowSurvives(pending, nextProjection);
        if (!targetRowSurvives.ok) return targetRowSurvives;
        if (!targetRowSurvives.value && pending.phase === "focus") {
            return { ok: true, value: neutralIdleResult(nextProjection.generation) };
        }
        return {
            ok: true,
            value: pendingResult(
                { ...pending, projectionGeneration: nextProjection.generation },
                false,
                false
            )
        };
    }

    const origin = reconcileEngagedProjection({
        availableInspectorBindings,
        focusOwner: pending.origin.snapshot.focusOwner,
        nextProjection,
        previousProjection,
        previousState: pending.origin.snapshot.state
    });
    if (!origin.ok) return origin;
    if (!targetColumnSurvives) return origin;
    const targetRowSurvives = pendingTargetRowSurvives(pending, nextProjection);
    if (!targetRowSurvives.ok) return targetRowSurvives;
    if (!targetRowSurvives.value && pending.phase === "focus") return origin;
    if (origin.value.state.kind === "idle") {
        const rebased: TransactionGridPendingActivationState<unknown> = {
            ...pending,
            origin: { kind: "neutral" },
            projectionGeneration: nextProjection.generation
        };
        return {
            ok: true,
            value: pendingResult(
                rebased,
                origin.value.cancelledDraft,
                origin.value.cancelledPopup,
                origin.value.focus.kind === "after-grid" ? origin.value.focus : undefined
            )
        };
    }
    if (origin.value.state.kind === "pending-activation") {
        return {
            error: { address: pending.target, kind: "unknown-address" },
            ok: false
        };
    }

    const snapshot = engagedSnapshotAfterReconciliation(
        origin.value,
        pending.origin.snapshot.focusOwner
    );
    if (snapshot == null) {
        return {
            error: { address: pending.target, kind: "unknown-address" },
            ok: false
        };
    }
    const rebased: TransactionGridPendingActivationState<unknown> = {
        ...pending,
        origin: { kind: "engaged", snapshot },
        projectionGeneration: nextProjection.generation
    };
    return {
        ok: true,
        value: pendingResult(rebased, origin.value.cancelledDraft, origin.value.cancelledPopup)
    };
}

interface TransactionGridReconciliationCommon<TRow> {
    readonly previousProjection: TransactionProjectionSnapshot<TRow>;
    readonly nextProjection: TransactionProjectionSnapshot<TRow>;
    readonly availableInspectorBindings?: readonly TransactionInspectorBindingRegistration[];
}

export type TransactionGridReconciliationOptions<TRow> = TransactionGridReconciliationCommon<TRow> &
    (
        | {
              readonly previousState: Extract<
                  TransactionGridInteractionState<unknown>,
                  { readonly kind: "idle" | "pending-activation" }
              >;
              readonly focusOwner?: never;
          }
        | {
              readonly previousState: Extract<
                  TransactionGridEngagedState<unknown>,
                  { readonly kind: "parked" }
              >;
              readonly focusOwner: { readonly kind: "external" };
          }
        | {
              readonly previousState:
                  | Extract<
                        TransactionGridEngagedState<unknown>,
                        { readonly kind: "navigating" | "editing" }
                    >
                  | Extract<
                        TransactionGridEngagedState<unknown>,
                        { readonly kind: "interacting"; readonly owner: "grid-editor" }
                    >;
              readonly focusOwner: { readonly kind: "grid" };
          }
        | {
              readonly previousState:
                  | Extract<TransactionGridEngagedState<unknown>, { readonly kind: "inspecting" }>
                  | Extract<
                        TransactionGridEngagedState<unknown>,
                        { readonly kind: "interacting"; readonly owner: "inspector" }
                    >;
              readonly focusOwner: Extract<
                  TransactionGridFocusOwnership,
                  { readonly kind: "inspector" }
              >;
          }
    );

/** Reconciles one strictly newer structural projection before it becomes interactive. */
export function reconcileTransactionGridProjection<TRow>(
    options: TransactionGridReconciliationOptions<TRow>
): TransactionGridReconciliationOutcome {
    const {
        availableInspectorBindings = [],
        nextProjection,
        previousProjection,
        previousState
    } = options;
    if (nextProjection.generation <= previousProjection.generation) {
        return {
            error: {
                direction:
                    nextProjection.generation === previousProjection.generation ? "equal" : "older",
                kind: "non-advancing-generation",
                next: nextProjection.generation,
                previous: previousProjection.generation
            },
            ok: false
        };
    }
    const nextLive = nextProjection.verifyCurrent();
    if (!nextLive.ok) return nextLive;
    if (previousState.kind === "idle") {
        return { ok: true, value: neutralIdleResult(nextProjection.generation) };
    }
    if (previousState.kind === "pending-activation") {
        return reconcilePendingActivation({
            availableInspectorBindings,
            nextProjection,
            pending: previousState,
            previousProjection
        });
    }
    if (options.focusOwner == null) {
        return {
            error: {
                address: activeTransactionGridAddress(previousState.selection),
                kind: "unknown-address"
            },
            ok: false
        };
    }
    return reconcileEngagedProjection({
        availableInspectorBindings,
        focusOwner: options.focusOwner,
        nextProjection,
        previousProjection,
        previousState
    });
}

export interface TransactionGridOperationSnapshot<TResources> {
    readonly generation: TransactionProjectionGeneration;
    readonly state: TransactionGridInteractionState<unknown>;
    readonly resources: TResources;
}

export type TransactionGridOperationError =
    | TransactionProjectionError
    | Extract<
          TransactionGridCommandError,
          | { readonly kind: "registration-timeout" }
          | { readonly kind: "focus-failed" }
          | { readonly kind: "load-failed" }
          | { readonly kind: "stale-operation" }
      >;

export type TransactionGridFailureResolution<TResources> =
    | {
          readonly kind: "restore-snapshot";
          readonly snapshot: TransactionGridOperationSnapshot<TResources>;
          readonly error: TransactionGridOperationError;
      }
    | {
          readonly kind: "use-newer-reconciliation";
          readonly reconciliation: TransactionGridReconciliationResult;
          readonly error: TransactionGridOperationError;
      }
    | {
          readonly kind: "invalid-reconciliation";
          readonly error: TransactionGridOperationError;
          readonly reason:
              | {
                    readonly kind: "current-generation-precedes-snapshot";
                    readonly current: TransactionProjectionGeneration;
                    readonly snapshot: TransactionProjectionGeneration;
                }
              | {
                    readonly kind: "reconciliation-generation-mismatch";
                    readonly current: TransactionProjectionGeneration;
                    readonly reconciliation: TransactionProjectionGeneration;
                };
      };

/** A G snapshot is restored only at G; a newer result is admitted only when it is exactly current. */
export function resolveTransactionGridFailure<TResources>(options: {
    readonly snapshot: TransactionGridOperationSnapshot<TResources>;
    readonly currentGeneration: TransactionProjectionGeneration;
    readonly error: TransactionGridOperationError;
    readonly newerReconciliation: TransactionGridReconciliationResult;
}): TransactionGridFailureResolution<TResources> {
    if (options.currentGeneration < options.snapshot.generation) {
        return {
            error: options.error,
            kind: "invalid-reconciliation",
            reason: {
                current: options.currentGeneration,
                kind: "current-generation-precedes-snapshot",
                snapshot: options.snapshot.generation
            }
        };
    }
    if (options.currentGeneration === options.snapshot.generation) {
        return { error: options.error, kind: "restore-snapshot", snapshot: options.snapshot };
    }
    if (options.newerReconciliation.generation !== options.currentGeneration) {
        return {
            error: options.error,
            kind: "invalid-reconciliation",
            reason: {
                current: options.currentGeneration,
                kind: "reconciliation-generation-mismatch",
                reconciliation: options.newerReconciliation.generation
            }
        };
    }
    return {
        error: options.error,
        kind: "use-newer-reconciliation",
        reconciliation: options.newerReconciliation
    };
}

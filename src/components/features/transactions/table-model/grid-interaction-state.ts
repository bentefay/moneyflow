import type { RuleField } from "@/lib/domain/automation/rules";

import type { TransactionColumnId, TransactionId, TransactionProjectionGeneration } from "./ids";

export interface TransactionGridAddress {
    readonly transactionId: TransactionId;
    readonly columnId: TransactionColumnId;
}

export type TransactionSelectionOperationKind = "include" | "exclude";

/** The typed shape stored in TanStack's canonical cell-selection atom. */
export interface TransactionGridSelectionOperation {
    readonly anchorRowId: TransactionId;
    readonly anchorColumnId: TransactionColumnId;
    readonly focusRowId: TransactionId;
    readonly focusColumnId: TransactionColumnId;
    readonly operation?: TransactionSelectionOperationKind;
}

export type TransactionGridSelection = readonly TransactionGridSelectionOperation[];
export type NonEmptyTransactionGridSelection = readonly [
    TransactionGridSelectionOperation,
    ...TransactionGridSelectionOperation[]
];

export type TransactionEditEntry = "quick" | "full";
export type TransactionSelectionVisibility = "suppressed" | "visible" | "muted";

export type TransactionContinuousEditIntent =
    | { readonly kind: "none" }
    | { readonly kind: "continue"; readonly entry: TransactionEditEntry };

export const NO_TRANSACTION_CONTINUOUS_EDIT: TransactionContinuousEditIntent = { kind: "none" };

export type TransactionContinuousEditTransition =
    | { readonly kind: "none"; readonly continuous: { readonly kind: "none" } }
    | {
          readonly kind: "retain";
          readonly continuous: Extract<
              TransactionContinuousEditIntent,
              { readonly kind: "continue" }
          >;
      }
    | {
          readonly kind: "resume";
          readonly entry: TransactionEditEntry;
          readonly continuous: Extract<
              TransactionContinuousEditIntent,
              { readonly kind: "continue" }
          >;
      };

/** Keeps edit intent across activation cells and resumes it only on a later editable cell. */
export function transitionTransactionContinuousEdit(
    continuous: TransactionContinuousEditIntent,
    targetEditable: boolean
): TransactionContinuousEditTransition {
    if (continuous.kind === "none") return { continuous, kind: "none" };
    return targetEditable
        ? { continuous, entry: continuous.entry, kind: "resume" }
        : { continuous, kind: "retain" };
}

export interface TransactionFieldEditorBinding {
    readonly kind: "field";
}

export interface TransactionInspectorFieldBinding {
    readonly kind: "field";
    readonly columnId: TransactionColumnId;
}

export interface TransactionInspectorActionBinding {
    readonly kind: "action";
    readonly action: "duplicate" | "delete" | "notes" | "close";
}

export interface TransactionInspectorAutomationBinding {
    readonly kind: "automation";
    readonly field: RuleField;
}

export type TransactionInspectorControlBinding =
    | TransactionInspectorFieldBinding
    | TransactionInspectorActionBinding
    | TransactionInspectorAutomationBinding;

/** Compatibility name for consumers that can own either inspector binding family. */
export type TransactionOwnedControlBinding = TransactionInspectorControlBinding;

export type TransactionEditorPopupKind = "calendar" | "combobox" | "listbox" | "modal" | "widget";

/** One IME sequence, allocated by the effect adapter and never reused. */
declare const TransactionCompositionSequenceBrand: unique symbol;
export type TransactionCompositionSequence = number & {
    readonly [TransactionCompositionSequenceBrand]: true;
};

export function asTransactionCompositionSequence(value: number): TransactionCompositionSequence {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error("composition sequence must be a non-negative safe integer");
    }
    return value as TransactionCompositionSequence;
}

export type TransactionCompositionEmptyCompletion = "editing" | "navigating";

export type TransactionCompositionState =
    | { readonly kind: "inactive" }
    | {
          readonly kind: "active";
          readonly sequence: TransactionCompositionSequence;
          readonly preview: string;
          readonly emptyCompletion: TransactionCompositionEmptyCompletion;
      }
    | {
          readonly kind: "awaiting-final-insertion";
          readonly sequence: TransactionCompositionSequence;
          readonly completedText: string;
      }
    | {
          readonly kind: "consumed";
          readonly sequence: TransactionCompositionSequence;
          readonly resume: TransactionCompositionEmptyCompletion;
      };

export const INACTIVE_TRANSACTION_COMPOSITION: TransactionCompositionState = { kind: "inactive" };

export type TransactionCompositionEvent =
    | {
          readonly kind: "start";
          readonly sequence: TransactionCompositionSequence;
          readonly emptyCompletion: TransactionCompositionEmptyCompletion;
      }
    | { readonly kind: "update"; readonly data: string }
    | { readonly kind: "end"; readonly data: string }
    | {
          readonly kind: "authoritative-insertion";
          readonly sequence: TransactionCompositionSequence;
          readonly data: string;
      }
    | { readonly kind: "fallback"; readonly sequence: TransactionCompositionSequence }
    | { readonly kind: "resume"; readonly sequence: TransactionCompositionSequence };

export interface TransactionCompositionResult {
    readonly composition: TransactionCompositionState;
    /** Non-null only for the one event that owns the completed grapheme insertion. */
    readonly insertedText: string | null;
}

/**
 * Reduces one sequence-bound IME lifecycle while leaving draft mutation to the editor adapter.
 *
 * The final insertion and fallback both enter a consumed barrier. The adapter releases that barrier
 * only after the key event that ended composition, so Enter or Escape cannot become a grid command.
 */
export function reduceTransactionComposition(
    composition: TransactionCompositionState,
    event: TransactionCompositionEvent
): TransactionCompositionResult {
    if (event.kind === "start") {
        return {
            composition: {
                emptyCompletion: event.emptyCompletion,
                kind: "active",
                preview: "",
                sequence: event.sequence
            },
            insertedText: null
        };
    }
    if (event.kind === "update") {
        return composition.kind === "active"
            ? {
                  composition: { ...composition, preview: event.data },
                  insertedText: null
              }
            : { composition, insertedText: null };
    }
    if (event.kind === "end") {
        if (composition.kind !== "active") return { composition, insertedText: null };
        return event.data.length === 0
            ? {
                  composition: {
                      kind: "consumed",
                      resume: composition.emptyCompletion,
                      sequence: composition.sequence
                  },
                  insertedText: null
              }
            : {
                  composition: {
                      completedText: event.data,
                      kind: "awaiting-final-insertion",
                      sequence: composition.sequence
                  },
                  insertedText: null
              };
    }
    if (event.kind === "authoritative-insertion") {
        if (
            composition.kind !== "awaiting-final-insertion" ||
            composition.sequence !== event.sequence
        ) {
            return { composition, insertedText: null };
        }
        return {
            composition: { kind: "consumed", resume: "editing", sequence: composition.sequence },
            insertedText: event.data
        };
    }
    if (event.kind === "fallback") {
        if (
            composition.kind !== "awaiting-final-insertion" ||
            composition.sequence !== event.sequence
        ) {
            return { composition, insertedText: null };
        }
        return {
            composition: { kind: "consumed", resume: "editing", sequence: composition.sequence },
            insertedText: composition.completedText
        };
    }
    return composition.kind === "consumed" && composition.sequence === event.sequence
        ? { composition: INACTIVE_TRANSACTION_COMPOSITION, insertedText: null }
        : { composition, insertedText: null };
}

export interface TransactionGridEditorState<TDraft> {
    readonly entry: TransactionEditEntry;
    readonly draft: TDraft;
    readonly composition: TransactionCompositionState;
    readonly continuous: TransactionContinuousEditIntent;
    readonly binding: TransactionFieldEditorBinding;
}

export interface TransactionGridIdleState {
    readonly kind: "idle";
    readonly selection: readonly [];
}

export interface TransactionGridParkedState {
    readonly kind: "parked";
    readonly selection: NonEmptyTransactionGridSelection;
}

export interface TransactionGridNavigatingState {
    readonly kind: "navigating";
    readonly selection: NonEmptyTransactionGridSelection;
    readonly continuous: TransactionContinuousEditIntent;
}

export interface TransactionContinuousEditMovementResult {
    readonly state: TransactionGridNavigatingState;
    readonly resumeEntry: TransactionEditEntry | null;
}

/** Commits movement intent into canonical navigation before an editor adapter may resume it. */
export function moveTransactionContinuousEdit(
    source: TransactionGridNavigatingState | TransactionGridEditingState<unknown>,
    selection: NonEmptyTransactionGridSelection,
    targetEditable: boolean
): TransactionContinuousEditMovementResult {
    const continuous = source.kind === "editing" ? source.editor.continuous : source.continuous;
    const transition = transitionTransactionContinuousEdit(continuous, targetEditable);
    return {
        resumeEntry: transition.kind === "resume" ? transition.entry : null,
        state: { continuous: transition.continuous, kind: "navigating", selection }
    };
}

export type TransactionContinuousEditStop =
    | "pointer-selection"
    | "inspector-entry"
    | "escape"
    | "grid-boundary-tab"
    | "external-blur";

/** Only the contract-approved ownership transitions can clear canonical continuous intent. */
export function clearTransactionContinuousEdit(
    state: TransactionGridNavigatingState,
    _reason: TransactionContinuousEditStop
): TransactionGridNavigatingState {
    return { ...state, continuous: NO_TRANSACTION_CONTINUOUS_EDIT };
}

export interface TransactionGridEditingState<TDraft> {
    readonly kind: "editing";
    readonly selection: NonEmptyTransactionGridSelection;
    readonly editor: TransactionGridEditorState<TDraft>;
}

export interface TransactionGridInspectingState {
    readonly kind: "inspecting";
    readonly selection: NonEmptyTransactionGridSelection;
}

export interface TransactionGridEditorReturnState<TDraft> {
    readonly kind: "editing";
    readonly editor: TransactionGridEditorState<TDraft>;
}

export interface TransactionGridInspectorReturnState {
    readonly kind: "inspecting";
}

export type TransactionGridInteractingState<TDraft> =
    | {
          readonly kind: "interacting";
          readonly selection: NonEmptyTransactionGridSelection;
          readonly popup: TransactionEditorPopupKind;
          readonly owner: "grid-editor";
          readonly returnState: TransactionGridEditorReturnState<TDraft>;
      }
    | {
          readonly kind: "interacting";
          readonly selection: NonEmptyTransactionGridSelection;
          readonly popup: TransactionEditorPopupKind;
          readonly owner: "inspector";
          readonly binding: TransactionInspectorControlBinding;
          readonly returnState: TransactionGridInspectorReturnState;
      };

export type TransactionGridEngagedState<TDraft = never> =
    | TransactionGridParkedState
    | TransactionGridNavigatingState
    | TransactionGridEditingState<TDraft>
    | TransactionGridInspectingState
    | TransactionGridInteractingState<TDraft>;

export type TransactionGridInspectorFocusOwnership = {
    readonly kind: "inspector";
    readonly panelOpen: boolean;
    readonly headingRegistered: boolean;
    readonly focused:
        | { readonly kind: "heading" }
        | {
              readonly kind: "control";
              readonly binding: TransactionInspectorControlBinding;
          };
};

export type TransactionGridFocusOwnership =
    | { readonly kind: "grid" }
    | { readonly kind: "external" }
    | TransactionGridInspectorFocusOwnership;

export type TransactionGridEngagedSnapshot<TDraft = never> =
    | {
          readonly state: TransactionGridParkedState;
          readonly focusOwner: { readonly kind: "external" };
      }
    | {
          readonly state:
              | TransactionGridNavigatingState
              | TransactionGridEditingState<TDraft>
              | Extract<TransactionGridInteractingState<TDraft>, { readonly owner: "grid-editor" }>;
          readonly focusOwner: { readonly kind: "grid" };
      }
    | {
          readonly state:
              | TransactionGridInspectingState
              | Extract<TransactionGridInteractingState<TDraft>, { readonly owner: "inspector" }>;
          readonly focusOwner: TransactionGridInspectorFocusOwnership;
      };

declare const TransactionGridCommandIdBrand: unique symbol;
export type TransactionGridCommandId = string & {
    readonly [TransactionGridCommandIdBrand]: true;
};

export function asTransactionGridCommandId(value: string): TransactionGridCommandId {
    if (value.length === 0) throw new Error("transaction grid command id must not be empty");
    return value as TransactionGridCommandId;
}

export type TransactionPendingActivationOrigin<TDraft = never> =
    | { readonly kind: "neutral" }
    | {
          readonly kind: "engaged";
          readonly snapshot: TransactionGridEngagedSnapshot<TDraft>;
      };

export interface TransactionGridPendingActivationState<TDraft = never> {
    readonly kind: "pending-activation";
    readonly target: TransactionGridAddress;
    readonly acceptedCommandId: TransactionGridCommandId;
    readonly projectionGeneration: TransactionProjectionGeneration;
    readonly phase: "reveal" | "focus";
    readonly origin: TransactionPendingActivationOrigin<TDraft>;
}

export type TransactionGridInteractionState<TDraft = never> =
    | TransactionGridIdleState
    | TransactionGridPendingActivationState<TDraft>
    | TransactionGridEngagedState<TDraft>;

export function latestTransactionSelectionOperation(
    selection: NonEmptyTransactionGridSelection
): TransactionGridSelectionOperation {
    return selection[selection.length - 1];
}

/** The active cell is always the latest operation's anchor, never its moving extent. */
export function activeTransactionGridAddress(
    selection: NonEmptyTransactionGridSelection
): TransactionGridAddress {
    const latest = latestTransactionSelectionOperation(selection);
    return {
        columnId: latest.anchorColumnId,
        transactionId: latest.anchorRowId
    };
}

export function transactionGridSelectionVisibility(
    state: TransactionGridInteractionState<unknown>
): TransactionSelectionVisibility {
    if (state.kind === "idle" || state.kind === "pending-activation" || state.kind === "parked") {
        return "suppressed";
    }
    if (state.kind === "inspecting") return "muted";
    if (state.kind === "interacting" && state.owner === "inspector") return "muted";
    return "visible";
}

export type TransactionGridPresence =
    | { readonly kind: "none" }
    | { readonly kind: "viewing"; readonly transactionId: TransactionId }
    | {
          readonly kind: "editing";
          readonly transactionId: TransactionId;
          readonly columnId: TransactionColumnId;
      };

/** Programmatic Add owns this silence until the user gestures inside its exact Description editor. */
export interface TransactionGridDeferredPresence {
    readonly kind: "add-description-editor-gesture";
    readonly address: TransactionGridAddress & { readonly columnId: "description" };
}

function addressesMatch(first: TransactionGridAddress, second: TransactionGridAddress): boolean {
    return first.transactionId === second.transactionId && first.columnId === second.columnId;
}

/** Whether a deferred Add gate still belongs to the pending or fulfilled editor that created it. */
export function transactionGridRetainsDeferredPresence(
    state: TransactionGridInteractionState<unknown>,
    deferredPresence: TransactionGridDeferredPresence
): boolean {
    if (state.kind === "pending-activation") {
        return addressesMatch(state.target, deferredPresence.address);
    }
    return (
        state.kind === "editing" &&
        addressesMatch(activeTransactionGridAddress(state.selection), deferredPresence.address)
    );
}

/** Presence exposes stable ownership only; drafts, values, extents and destinations never appear. */
export function transactionGridPresence(
    state: TransactionGridInteractionState<unknown>,
    deferredPresence: TransactionGridDeferredPresence | null = null
): TransactionGridPresence {
    if (
        state.kind === "idle" ||
        state.kind === "pending-activation" ||
        (deferredPresence != null &&
            transactionGridRetainsDeferredPresence(state, deferredPresence))
    ) {
        return { kind: "none" };
    }
    const active = activeTransactionGridAddress(state.selection);
    if (state.kind === "editing") {
        return {
            columnId: active.columnId,
            kind: "editing",
            transactionId: active.transactionId
        };
    }
    return { kind: "viewing", transactionId: active.transactionId };
}

export type TransactionGridPin =
    | { readonly kind: "active-origin"; readonly transactionId: TransactionId }
    | { readonly kind: "pending-target"; readonly transactionId: TransactionId };

/** Pending pins are derived from the only identities that can own them, so they cannot diverge. */
export function transactionGridPins(
    state: TransactionGridInteractionState<unknown>
): readonly TransactionGridPin[] {
    if (state.kind === "idle") return [];
    if (state.kind === "pending-activation") {
        const pending: TransactionGridPin = {
            kind: "pending-target",
            transactionId: state.target.transactionId
        };
        if (state.origin.kind === "neutral") return [pending];
        return [
            {
                kind: "active-origin",
                transactionId: activeTransactionGridAddress(state.origin.snapshot.state.selection)
                    .transactionId
            },
            pending
        ];
    }
    return [
        {
            kind: "active-origin",
            transactionId: activeTransactionGridAddress(state.selection).transactionId
        }
    ];
}

export function beginTransactionPendingActivation<TDraft>(options: {
    readonly current:
        | TransactionGridIdleState
        | {
              readonly kind: "engaged-origin";
              readonly snapshot: TransactionGridEngagedSnapshot<TDraft>;
          }
        | TransactionGridPendingActivationState<TDraft>;
    readonly target: TransactionGridAddress;
    readonly acceptedCommandId: TransactionGridCommandId;
    readonly projectionGeneration: TransactionProjectionGeneration;
    readonly phase: "reveal" | "focus";
}): TransactionGridPendingActivationState<TDraft> {
    const origin: TransactionPendingActivationOrigin<TDraft> =
        options.current.kind === "pending-activation"
            ? options.current.origin
            : options.current.kind === "idle"
              ? { kind: "neutral" }
              : { kind: "engaged", snapshot: options.current.snapshot };
    return {
        acceptedCommandId: options.acceptedCommandId,
        kind: "pending-activation",
        origin,
        phase: options.phase,
        projectionGeneration: options.projectionGeneration,
        target: options.target
    };
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

export type TransactionPendingActivationFulfillment<TDraft> =
    | { readonly kind: "navigating"; readonly continuous?: TransactionContinuousEditIntent }
    | { readonly kind: "inspecting" }
    | { readonly kind: "editing"; readonly editor: TransactionGridEditorState<TDraft> };

export interface TransactionPendingOperationIdentity {
    readonly acceptedCommandId: TransactionGridCommandId;
    readonly projectionGeneration: TransactionProjectionGeneration;
}

export interface TransactionGridStaleOperationError {
    readonly kind: "stale-operation";
    readonly expectedCommandId: TransactionGridCommandId;
    readonly expectedGeneration: TransactionProjectionGeneration;
    readonly actualCommandId: TransactionGridCommandId | null;
    readonly actualGeneration: TransactionProjectionGeneration | null;
}

export type TransactionPendingActivationTransitionResult<TValue> =
    | { readonly ok: true; readonly value: TValue }
    | { readonly ok: false; readonly error: TransactionGridStaleOperationError };

function currentPendingActivation<TDraft>(
    current: TransactionGridInteractionState<TDraft>,
    expected: TransactionPendingOperationIdentity
): TransactionPendingActivationTransitionResult<TransactionGridPendingActivationState<TDraft>> {
    if (
        current.kind === "pending-activation" &&
        current.acceptedCommandId === expected.acceptedCommandId &&
        current.projectionGeneration === expected.projectionGeneration
    ) {
        return { ok: true, value: current };
    }
    return {
        error: {
            actualCommandId:
                current.kind === "pending-activation" ? current.acceptedCommandId : null,
            actualGeneration:
                current.kind === "pending-activation" ? current.projectionGeneration : null,
            expectedCommandId: expected.acceptedCommandId,
            expectedGeneration: expected.projectionGeneration,
            kind: "stale-operation"
        },
        ok: false
    };
}

/** Fulfillment can consume only the current, identity-matching pending command. */
export function fulfillTransactionPendingActivation<TDraft>(
    current: TransactionGridInteractionState<TDraft>,
    expected: TransactionPendingOperationIdentity,
    fulfillment: TransactionPendingActivationFulfillment<TDraft>
): TransactionPendingActivationTransitionResult<TransactionGridEngagedState<TDraft>> {
    const pending = currentPendingActivation(current, expected);
    if (!pending.ok) return pending;
    const selection = oneCellSelection(pending.value.target);
    if (fulfillment.kind === "navigating") {
        return {
            ok: true,
            value: {
                continuous: fulfillment.continuous ?? NO_TRANSACTION_CONTINUOUS_EDIT,
                kind: "navigating",
                selection
            }
        };
    }
    if (fulfillment.kind === "inspecting") {
        return { ok: true, value: { kind: "inspecting", selection } };
    }
    return { ok: true, value: { editor: fulfillment.editor, kind: "editing", selection } };
}

/** Cancellation restores only the latest identity-matching origin. */
export function cancelTransactionPendingActivation<TDraft>(
    current: TransactionGridInteractionState<TDraft>,
    expected: TransactionPendingOperationIdentity
): TransactionPendingActivationTransitionResult<
    TransactionGridIdleState | TransactionGridEngagedSnapshot<TDraft>
> {
    const pending = currentPendingActivation(current, expected);
    if (!pending.ok) return pending;
    return {
        ok: true,
        value:
            pending.value.origin.kind === "neutral"
                ? { kind: "idle", selection: [] }
                : pending.value.origin.snapshot
    };
}

/** Load, registration and focus aborts share cancellation's current-command authority. */
export function abortTransactionPendingActivation<TDraft>(
    current: TransactionGridInteractionState<TDraft>,
    expected: TransactionPendingOperationIdentity
): TransactionPendingActivationTransitionResult<
    TransactionGridIdleState | TransactionGridEngagedSnapshot<TDraft>
> {
    return cancelTransactionPendingActivation(current, expected);
}

export type TransactionGridCommandError =
    | {
          readonly kind: "stale-projection";
          readonly expected: TransactionProjectionGeneration;
          readonly actual: TransactionProjectionGeneration;
      }
    | { readonly kind: "row-unavailable"; readonly index: number }
    | { readonly kind: "range-limit"; readonly requestedRows: number; readonly maximumRows: number }
    | { readonly kind: "invalid-endpoint" }
    | { readonly kind: "registration-timeout"; readonly address: TransactionGridAddress }
    | { readonly kind: "focus-failed"; readonly address: TransactionGridAddress }
    | { readonly kind: "load-failed"; readonly address: TransactionGridAddress }
    | TransactionGridStaleOperationError
    | { readonly kind: "validation-failed"; readonly message: string }
    | { readonly kind: "unresolved-account" }
    | { readonly kind: "ambiguous-account" }
    | { readonly kind: "unresolved-status" }
    | { readonly kind: "ambiguous-status" }
    | { readonly kind: "unresolved-tag" }
    | { readonly kind: "ambiguous-tag" }
    | { readonly kind: "copy-excluded-operation" }
    | { readonly kind: "clipboard-failed" };

export type TransactionGridCommandResult<TValue> =
    | { readonly ok: true; readonly value: TValue }
    | { readonly ok: false; readonly error: TransactionGridCommandError };

export type TransactionGridCommand =
    | { readonly kind: "validate-and-commit" }
    | { readonly kind: "cancel-edit" }
    | {
          readonly kind: "materialise-and-focus";
          readonly address: TransactionGridAddress;
          readonly expectedGeneration: TransactionProjectionGeneration;
      }
    | {
          readonly kind: "copy-active-operation";
          readonly expectedGeneration: TransactionProjectionGeneration;
      }
    | {
          readonly kind: "create-tag-and-assign-quick-entry";
          readonly transactionId: TransactionId;
          readonly name: string;
          readonly expectedGeneration: TransactionProjectionGeneration;
      };

"use client";

import { batch, createAtom, type Atom } from "@tanstack/react-store";
import type { CellSelectionState } from "@tanstack/table-core";
import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";

import type { TransactionCursor } from "@/lib/crdt/transaction-cursor";
import type { RuleField } from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import type {
    TransactionGridAutomationEditorContext,
    TransactionGridEditorCommitResult
} from "../cells/editor-lifecycle";
import type {
    RuleProposalDraftOverride,
    RuleProposalErrorOverride
} from "../field-rule-proposal-state";
import {
    abortTransactionPendingActivation,
    activeTransactionGridAddress,
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    fulfillTransactionPendingActivation,
    INACTIVE_TRANSACTION_COMPOSITION,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    reduceTransactionComposition,
    transactionGridPins,
    transactionGridRetainsDeferredPresence,
    transactionGridSelectionVisibility,
    transactionInspectorBindingEquals,
    type TransactionCompositionEvent,
    type TransactionCompositionResult,
    type TransactionCompositionSequence,
    type TransactionCompositionState,
    type TransactionContinuousEditIntent,
    type NonEmptyTransactionGridSelection,
    type TransactionEditEntry,
    type TransactionGridAddress,
    type TransactionGridDeferredPresence,
    type TransactionGridEditorState,
    type TransactionGridEngagedSnapshot,
    type TransactionGridFocusIntent,
    type TransactionGridFollowUpIntent,
    type TransactionGridInspectorFocusOwnership,
    type TransactionGridInteractionState,
    type TransactionGridKeyIntent,
    type TransactionGridOperationError,
    type TransactionEditorPopupKind,
    type TransactionGridPendingActivationState,
    type TransactionGridPin,
    type TransactionInspectorBindingRegistration,
    type TransactionInspectorControlBinding,
    type TransactionPendingOperationIdentity,
    type TransactionSelectionVisibility
} from "../table-model";
import {
    resolveTransactionNavigationTarget,
    transactionProjectionFromCursor,
    type TransactionNavigationCommand,
    type TransactionProjectionError
} from "../table-model/grid-navigation";
import {
    reconcileTransactionGridProjection,
    type TransactionGridReconciliationOutcome
} from "../table-model/grid-reconciliation";
import {
    asTransactionId,
    asTransactionProjectionGeneration,
    nextTransactionProjectionGeneration,
    transactionColumnAutomationField,
    type TransactionColumnId,
    type TransactionId,
    type TransactionProjectionGeneration
} from "../table-model/ids";

const REGISTRATION_TIMEOUT_MS = 1_000;
const MATERIALIZATION_TIMEOUT_MS = 1_000;
const EMPTY_CELL_SELECTION: CellSelectionState = [];
const EMPTY_PINS: readonly TransactionGridControllerPin[] = [];

function revealGridcellBelowStickyHeader(element: HTMLElement): void {
    const grid = element.closest<HTMLElement>('[role="grid"]');
    const scrollViewport = grid?.parentElement;
    const stickyHeader = grid?.querySelector<HTMLElement>('[role="row"][aria-rowindex="1"]');
    if (scrollViewport == null || stickyHeader == null) return;
    const overlap = Math.ceil(
        stickyHeader.getBoundingClientRect().bottom - element.getBoundingClientRect().top
    );
    if (overlap <= 0) return;
    scrollViewport.scrollTop = Math.max(0, scrollViewport.scrollTop - overlap);
}

function addDeferredPresence(
    target: TransactionGridAddress,
    kind: TransactionGridDeferredPresence["kind"] | null
): TransactionGridDeferredPresence | null {
    if (kind == null || target.columnId !== "description") return null;
    return {
        address: {
            columnId: target.columnId,
            transactionId: target.transactionId
        },
        kind
    };
}

interface TransactionGridActivationResources {
    readonly generation: TransactionProjectionGeneration;
    readonly focusedElement: HTMLElement | null;
    readonly focusedTransactionId: TransactionId | null;
    readonly heldWindowStart: number | null;
    readonly restoreHeldWindowStart: ((start: number) => void) | null;
    readonly scrollElement: HTMLElement | null;
    readonly scrollLeft: number;
    readonly scrollTop: number;
}

interface TransactionGridReconciliationFocusRequest {
    readonly generation: TransactionProjectionGeneration;
    readonly clearFailureOnFocus: boolean;
    readonly retainedFocusOwner: HTMLElement | null;
    readonly revealBeforeFocus: boolean;
    readonly revealBlock?: "center" | "nearest";
    readonly intent: Exclude<TransactionGridFocusIntent, { readonly kind: "none" }>;
}

type TransactionGridAbortFocusRequest = Omit<
    TransactionGridReconciliationFocusRequest,
    "intent"
> & {
    readonly intent: Extract<
        TransactionGridFocusIntent,
        { readonly kind: "gridcell" | "after-grid" }
    >;
};

type TransactionGridRegistrationWakeAuthority =
    | {
          readonly kind: "pending";
          readonly acceptedCommandId: TransactionPendingOperationIdentity["acceptedCommandId"];
          readonly projectionGeneration: TransactionProjectionGeneration;
          readonly token: symbol;
      }
    | {
          readonly kind: "reconciliation";
          readonly token: symbol;
      };

interface TransactionGridNavigatingEngagement {
    readonly kind: "navigating";
    readonly continuous: Extract<
        TransactionGridInteractionState<unknown>,
        { readonly kind: "navigating" }
    >["continuous"];
}

interface TransactionGridEditingEngagement {
    readonly kind: "editing";
    readonly editor: TransactionGridEditorState<unknown>;
}

type TransactionGridInspectorFocusedOwner =
    | { readonly kind: "heading" }
    | { readonly kind: "control"; readonly binding: TransactionInspectorControlBinding };

type TransactionGridRegisteredInspectorOwner =
    | { readonly kind: "heading" }
    | {
          readonly kind: "control";
          readonly binding: TransactionInspectorControlBinding;
          readonly transactionOwner: TransactionId;
      };

interface TransactionGridInspectingEngagement {
    readonly kind: "inspecting";
    readonly focused: TransactionGridInspectorFocusedOwner;
}

type TransactionGridInteractingEngagement =
    | {
          readonly kind: "interacting";
          readonly owner: "grid-editor";
          readonly popup: TransactionEditorPopupKind;
          readonly editor: TransactionGridEditorState<unknown>;
      }
    | {
          readonly kind: "interacting";
          readonly owner: "inspector";
          readonly popup: TransactionEditorPopupKind;
          readonly binding: TransactionInspectorControlBinding;
      };

interface TransactionGridParkedEngagement {
    readonly kind: "parked";
}

type TransactionGridRuntimeEngagement =
    | TransactionGridNavigatingEngagement
    | TransactionGridEditingEngagement
    | TransactionGridInspectingEngagement
    | TransactionGridInteractingEngagement
    | TransactionGridParkedEngagement;

export type TransactionGridControllerPin =
    | TransactionGridPin
    | { readonly kind: "focus-retention"; readonly transactionId: TransactionId };

export type TransactionCellSelectionAtom = Atom<CellSelectionState>;

/** Creates a writable atom for non-React fixtures; the workspace uses `useCreateAtom` directly. */
export function createTransactionCellSelectionAtom(): TransactionCellSelectionAtom {
    return createAtom<CellSelectionState>(EMPTY_CELL_SELECTION);
}

interface TransactionGridPendingRequestBase {
    readonly state: TransactionGridPendingActivationState<unknown>;
    readonly acceptedAt: number;
    readonly materializationDeadlineAt: number;
    readonly focusStartedAt: number | null;
    readonly resources: TransactionGridActivationResources;
    readonly abortFallbackFocus: TransactionGridAbortFocusRequest | null;
}

export type TransactionGridPendingRequest =
    | (TransactionGridPendingRequestBase & {
          readonly kind: "edit";
          readonly entry: TransactionEditEntry;
          readonly initialText?: string;
          readonly composition: TransactionCompositionState;
          readonly continuous: TransactionContinuousEditIntent;
          readonly deferredPresenceKind: TransactionGridDeferredPresence["kind"] | null;
      })
    | (TransactionGridPendingRequestBase & {
          readonly kind: "navigation";
          readonly continuous: TransactionContinuousEditIntent;
      });

type TransactionGridRuntimeInteractionState = Extract<
    TransactionGridInteractionState<unknown>,
    {
        readonly kind:
            | "idle"
            | "pending-activation"
            | "parked"
            | "navigating"
            | "editing"
            | "inspecting"
            | "interacting";
    }
>;

export interface TransactionGridEditorProjection {
    readonly address: TransactionGridAddress;
    readonly entry: TransactionEditEntry;
    readonly initialText?: string;
}

export interface TransactionAutomationOwner {
    readonly transactionId: TransactionId;
    readonly field: RuleField;
}

export function transactionAutomationOwnerEquals(
    first: TransactionAutomationOwner,
    second: TransactionAutomationOwner
): boolean {
    return first.transactionId === second.transactionId && first.field === second.field;
}

function transactionAutomationOwnerKey(owner: TransactionAutomationOwner): string {
    return `${owner.transactionId}::automation::${owner.field}`;
}

export interface TransactionAutomationProposalState {
    readonly owner: TransactionAutomationOwner;
    readonly draftOverride: RuleProposalDraftOverride | null;
    readonly errorOverride: RuleProposalErrorOverride | null;
    /** Set only by the mounted semantic proposal workflow after it derives renderable controls. */
    readonly renderable: boolean;
}

export interface TransactionAutomationEditorState {
    readonly owner: TransactionAutomationOwner;
    readonly context: TransactionGridAutomationEditorContext;
}

export interface TransactionGridAutomationSnapshot {
    readonly editor: TransactionAutomationEditorState | null;
    readonly proposal: TransactionAutomationProposalState | null;
}

export interface TransactionGridControllerSnapshot {
    readonly generation: TransactionProjectionGeneration;
    readonly registrationVersion: number;
    readonly pending: TransactionGridPendingRequest | null;
    readonly reconciliationFocus: TransactionGridReconciliationFocusRequest | null;
    readonly pins: readonly TransactionGridControllerPin[];
    readonly activeAddress: TransactionGridAddress | null;
    readonly activeTransactionId: TransactionId | null;
    readonly automation: TransactionGridAutomationSnapshot;
    readonly availableInspectorBindings: readonly TransactionInspectorBindingRegistration[];
    readonly inspectorHeadingRegistered: boolean;
    readonly inspectorPanelOpen: boolean;
    readonly parkedActiveAddress: TransactionGridAddress | null;
    readonly editor: TransactionGridEditorProjection | null;
    readonly focusRetentionTransactionId: TransactionId | null;
    readonly failure: TransactionGridOperationError | null;
    readonly interactionKind: TransactionGridRuntimeInteractionState["kind"];
    readonly selectionVisibility: TransactionSelectionVisibility;
    readonly deferredPresence: TransactionGridDeferredPresence | null;
}

interface TransactionGridActivationBaseOptions {
    readonly entry: TransactionEditEntry;
    readonly initialText?: string;
    readonly compositionSequence?: TransactionCompositionSequence;
}

export type TransactionGridActivationOptions = TransactionGridActivationBaseOptions &
    (
        | {
              readonly target: TransactionGridAddress;
              readonly presence?: "publish";
          }
        | {
              readonly target: TransactionGridAddress & { readonly columnId: "description" };
              readonly presence: "defer-add-until-editor-gesture";
          }
    );

export type TransactionGridCellCommandEffect =
    | { readonly kind: "native" }
    | { readonly kind: "handled" }
    | {
          readonly kind: "edit";
          readonly entry: TransactionEditEntry;
          readonly initialText?: string;
      }
    | {
          readonly kind: "activate";
          readonly activation: "checkbox" | "inspector";
      };

export type TransactionGridCellCommandError =
    | TransactionProjectionError
    | { readonly kind: "projection-unavailable" };

export type TransactionGridCellCommandResult =
    | { readonly ok: true; readonly value: TransactionGridCellCommandEffect }
    | { readonly ok: false; readonly error: TransactionGridCellCommandError };

export type TransactionGridFocusElement = HTMLElement;

export interface TransactionGridWorkspaceController {
    readonly cellSelectionAtom: TransactionCellSelectionAtom;
    readonly beginActivation: (
        options: TransactionGridActivationOptions
    ) => TransactionPendingOperationIdentity;
    readonly markRevealApplied: (expected: TransactionPendingOperationIdentity) => boolean;
    readonly registerCell: (
        address: TransactionGridAddress,
        element: TransactionGridFocusElement
    ) => () => void;
    readonly isRegisteredCellElement: (element: HTMLElement) => boolean;
    readonly registerEditorPortal: (
        address: TransactionGridAddress,
        element: HTMLElement
    ) => () => void;
    readonly isRegisteredEditorPortalTarget: (
        address: TransactionGridAddress,
        target: EventTarget | null
    ) => boolean;
    readonly registerInspectorRoot: (element: HTMLElement) => () => void;
    readonly registerInspectorHeading: (element: HTMLElement) => () => void;
    readonly registerInspectorControl: (
        registration: TransactionInspectorBindingRegistration,
        element: HTMLElement
    ) => () => void;
    readonly registerInspectorPortal: (
        registration: TransactionInspectorBindingRegistration,
        element: HTMLElement
    ) => () => void;
    readonly isRegisteredInspectorTarget: (
        registration: TransactionInspectorBindingRegistration,
        target: EventTarget | null
    ) => boolean;
    readonly isRegisteredInspectorOwnedTarget: (target: EventTarget | null) => boolean;
    readonly setInspectorPanelOpen: (open: boolean) => void;
    readonly revealInspector: () => boolean;
    readonly enterInspector: (target: EventTarget | null) => boolean;
    readonly handleInspectorFocusOut: (
        relatedTarget: EventTarget | null,
        ownerDocument: Document
    ) => void;
    readonly activateInspectorFromActionCell: (
        address: TransactionGridAddress & { readonly columnId: "actions" }
    ) => "focused" | "unregistered" | "stale";
    readonly closeInspector: () => boolean;
    readonly setInspectorInteraction: (
        registration: TransactionInspectorBindingRegistration,
        popup: TransactionEditorPopupKind,
        open: boolean
    ) => boolean;
    readonly registerEditor: {
        (address: TransactionGridAddress, element: TransactionGridFocusElement): () => void;
        (address: TransactionGridAddress, element: null): void;
    };
    readonly publishAutomationEditorEntry: (
        address: TransactionGridAddress,
        context: TransactionGridAutomationEditorContext
    ) => void;
    readonly publishAutomationEditorCancellation: (address: TransactionGridAddress) => void;
    readonly publishAutomationEditorCommit: (
        address: TransactionGridAddress,
        result: TransactionGridEditorCommitResult
    ) => void;
    readonly setAutomationProposalDraft: (
        owner: TransactionAutomationOwner,
        override: RuleProposalDraftOverride | null
    ) => boolean;
    readonly setAutomationProposalErrors: (
        owner: TransactionAutomationOwner,
        override: RuleProposalErrorOverride | null
    ) => boolean;
    readonly setAutomationProposalRenderable: (
        owner: TransactionAutomationOwner,
        renderable: boolean
    ) => boolean;
    readonly dismissAutomationProposal: (owner: TransactionAutomationOwner) => boolean;
    readonly registerAutomationFinalizer: (
        owner: TransactionAutomationOwner,
        finalizer: () => void
    ) => () => void;
    readonly dispatchCellIntent: (
        address: TransactionGridAddress,
        intent: TransactionGridKeyIntent,
        viewportRows: number
    ) => TransactionGridCellCommandResult;
    readonly registerRow: (transactionId: TransactionId, element: HTMLElement | null) => void;
    readonly registerAfterGridElement: (element: HTMLElement | null) => void;
    readonly registerScrollElement: (element: HTMLElement | null) => void;
    readonly setHeldWindowState: (start: number, restore: (start: number) => void) => void;
    readonly setFocusedCell: (transactionId: string, columnId: string | null) => void;
    readonly isCellFocusOwnedByController: (address: TransactionGridAddress) => boolean;
    readonly setFocusedActivation: (transactionId: string) => void;
    readonly finishEditing: (address: TransactionGridAddress) => boolean;
    readonly acknowledgeEditorGesture: (address: TransactionGridAddress) => void;
    readonly dispatchCompositionEvent: (
        address: TransactionGridAddress,
        event: TransactionCompositionEvent
    ) => TransactionCompositionResult | null;
    readonly setEditorInteraction: (
        address: TransactionGridAddress,
        popup: TransactionEditorPopupKind,
        open: boolean
    ) => boolean;
    readonly clearCellSelection: () => void;
    readonly clearUserFocus: () => void;
    readonly retireDelayedFocus: () => void;
    readonly parkExternalFocus: () => void;
    readonly getInteractionState: () => TransactionGridInteractionState<unknown>;
    readonly getPendingRequest: () => TransactionGridPendingRequest | null;
    readonly getSnapshot: () => TransactionGridControllerSnapshot;
    readonly subscribe: (listener: () => void) => () => void;
    readonly updateProjection: (
        cursor: TransactionCursor,
        selectableColumnIds: readonly TransactionColumnId[],
        isTransactionCanonicallyLive?: (transactionId: TransactionId) => boolean
    ) => TransactionGridReconciliationOutcome | null;
    readonly focusPendingActivation: (
        expected: TransactionPendingOperationIdentity
    ) => "focused" | "unregistered" | "stale";
    readonly focusReconciliation: (
        expectedGeneration: TransactionProjectionGeneration
    ) => "focused" | "unregistered" | "stale";
    readonly abortPendingActivation: (
        expected: TransactionPendingOperationIdentity,
        error: TransactionGridOperationError
    ) => boolean;
}

function sameColumnOrder(
    first: readonly TransactionColumnId[],
    second: readonly TransactionColumnId[]
): boolean {
    return (
        first.length === second.length &&
        first.every((columnId, index) => columnId === second[index])
    );
}

function sameCursorOrder(first: TransactionCursor, second: TransactionCursor): boolean {
    if (first === second) return true;
    if (first.count !== second.count) return false;

    const firstRows = first.values();
    const secondRows = second.values();
    while (true) {
        const firstRow = firstRows.next();
        const secondRow = secondRows.next();
        if (firstRow.done || secondRow.done) return firstRow.done === secondRow.done;
        if (firstRow.value.id !== secondRow.value.id) return false;
    }
}

function transactionGridRebaseTestCursor(cursor: TransactionCursor): TransactionCursor | null {
    const rows = [...cursor.values()];
    const first = rows[0];
    const second = rows[1];
    const third = rows[2];
    if (first == null || second == null || third == null) return null;
    const reordered = [first, third, second, ...rows.slice(3)];
    const indexes = new Map(reordered.map((transaction, index) => [transaction.id, index]));
    return {
        count: reordered.length,
        includes: (transactionId) => indexes.has(transactionId),
        indexOf: (transactionId) => indexes.get(transactionId) ?? -1,
        slice: (offset, limit) =>
            reordered.slice(
                Math.max(0, Math.trunc(offset)),
                Math.max(0, Math.trunc(offset)) + Math.max(0, Math.trunc(limit))
            ),
        *values() {
            yield* reordered;
        },
        [Symbol.iterator]() {
            return this.values();
        }
    };
}

function findColumnId(
    value: string,
    selectableColumnIds: readonly TransactionColumnId[]
): TransactionColumnId | undefined {
    return selectableColumnIds.find((columnId) => columnId === value);
}

function canonicalSelection(
    selection: CellSelectionState,
    selectableColumnIds: readonly TransactionColumnId[]
): NonEmptyTransactionGridSelection | null {
    const operations = selection.flatMap((operation) => {
        const anchorColumnId = findColumnId(operation.anchorColumnId, selectableColumnIds);
        const focusColumnId = findColumnId(operation.focusColumnId, selectableColumnIds);
        if (anchorColumnId == null || focusColumnId == null) return [];
        return [
            {
                anchorColumnId,
                anchorRowId: asTransactionId(operation.anchorRowId),
                focusColumnId,
                focusRowId: asTransactionId(operation.focusRowId),
                operation: operation.operation
            }
        ];
    });
    const [first, ...rest] = operations;
    return first == null ? null : [first, ...rest];
}

function externalSelection(selection: NonEmptyTransactionGridSelection): CellSelectionState {
    return selection.map((operation) => ({
        anchorColumnId: operation.anchorColumnId,
        anchorRowId: operation.anchorRowId,
        focusColumnId: operation.focusColumnId,
        focusRowId: operation.focusRowId,
        operation: operation.operation
    }));
}

function oneCellSelection(address: TransactionGridAddress): CellSelectionState {
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

function operationIdentity(
    pending: TransactionGridPendingActivationState<unknown>
): TransactionPendingOperationIdentity {
    return {
        acceptedCommandId: pending.acceptedCommandId,
        projectionGeneration: pending.projectionGeneration
    };
}

function sameOperation(
    pending: TransactionGridPendingActivationState<unknown> | null,
    expected: TransactionPendingOperationIdentity
): pending is TransactionGridPendingActivationState<unknown> {
    return (
        pending != null &&
        pending.acceptedCommandId === expected.acceptedCommandId &&
        pending.projectionGeneration === expected.projectionGeneration
    );
}

function cellRegistrationKey(address: TransactionGridAddress): string {
    return `${address.transactionId}\u0000${address.columnId}`;
}

function inspectorBindingKey(binding: TransactionInspectorControlBinding): string {
    switch (binding.kind) {
        case "field":
            return `field:${binding.columnId}`;
        case "action":
            return `action:${binding.action}`;
        case "automation":
            return `automation:${binding.field}`;
        default:
            return assertNever(binding, "transaction inspector binding key");
    }
}

function inspectorRegistrationKey(registration: TransactionInspectorBindingRegistration): string {
    return JSON.stringify([
        registration.transactionOwner,
        inspectorBindingKey(registration.binding)
    ]);
}

function inspectorRegistrationsEqual(
    first: TransactionInspectorBindingRegistration,
    second: TransactionInspectorBindingRegistration
): boolean {
    return (
        first.transactionOwner === second.transactionOwner &&
        transactionInspectorBindingEquals(first.binding, second.binding)
    );
}

function transactionColumnSupportsEditing(columnId: TransactionColumnId): boolean {
    return columnId !== "checkbox" && columnId !== "actions";
}

function editorInitialText(draft: unknown): string | undefined {
    if (typeof draft !== "object" || draft == null || !("initialText" in draft)) return undefined;
    return typeof draft.initialText === "string" ? draft.initialText : undefined;
}

function interactionStateOf(
    pending: TransactionGridPendingActivationState<unknown> | null,
    selection: CellSelectionState,
    selectableColumnIds: readonly TransactionColumnId[],
    engagement: TransactionGridRuntimeEngagement | null
): TransactionGridRuntimeInteractionState {
    if (pending != null) return pending;
    const canonical = canonicalSelection(selection, selectableColumnIds);
    if (canonical == null) return { kind: "idle", selection: [] };
    if (engagement?.kind === "editing") {
        return { editor: engagement.editor, kind: "editing", selection: canonical };
    }
    if (engagement?.kind === "inspecting") {
        return { kind: "inspecting", selection: canonical };
    }
    if (engagement?.kind === "interacting") {
        return engagement.owner === "grid-editor"
            ? {
                  kind: "interacting",
                  owner: "grid-editor",
                  popup: engagement.popup,
                  returnState: { editor: engagement.editor, kind: "editing" },
                  selection: canonical
              }
            : {
                  binding: engagement.binding,
                  kind: "interacting",
                  owner: "inspector",
                  popup: engagement.popup,
                  returnState: { kind: "inspecting" },
                  selection: canonical
              };
    }
    if (engagement?.kind === "parked") return { kind: "parked", selection: canonical };
    return {
        continuous:
            engagement?.kind === "navigating"
                ? engagement.continuous
                : NO_TRANSACTION_CONTINUOUS_EDIT,
        kind: "navigating",
        selection: canonical
    };
}

function engagementOf(
    state: TransactionGridInteractionState<unknown>
): TransactionGridRuntimeEngagement | null {
    if (state.kind === "editing") return { editor: state.editor, kind: "editing" };
    if (state.kind === "interacting" && state.owner === "grid-editor") {
        return {
            editor: state.returnState.editor,
            kind: "interacting",
            owner: "grid-editor",
            popup: state.popup
        };
    }
    if (state.kind === "interacting" && state.owner === "inspector") {
        return {
            binding: state.binding,
            kind: "interacting",
            owner: "inspector",
            popup: state.popup
        };
    }
    if (state.kind === "inspecting") {
        return { focused: { kind: "heading" }, kind: "inspecting" };
    }
    if (state.kind === "navigating") {
        return { continuous: state.continuous, kind: "navigating" };
    }
    if (state.kind === "idle" || state.kind === "pending-activation") return null;
    if (state.kind === "parked") return { kind: "parked" };
    return { continuous: NO_TRANSACTION_CONTINUOUS_EDIT, kind: "navigating" };
}

function controllerPins(
    state: TransactionGridRuntimeInteractionState,
    focusedTransactionId: TransactionId | null
): readonly TransactionGridControllerPin[] {
    const statePins = state.kind === "idle" ? EMPTY_PINS : transactionGridPins(state);
    if (focusedTransactionId == null) return statePins;
    if (
        statePins.some(
            (pin) => pin.kind === "active-origin" && pin.transactionId === focusedTransactionId
        )
    ) {
        return statePins;
    }
    const focusPin: TransactionGridControllerPin = {
        kind: "focus-retention",
        transactionId: focusedTransactionId
    };
    return state.kind === "pending-activation"
        ? [focusPin, ...statePins.filter((pin) => pin.kind === "pending-target")]
        : [focusPin, ...statePins];
}

function engagedSnapshot(
    state: TransactionGridInteractionState<unknown>,
    inspectorFocusOwner: TransactionGridInspectorFocusOwnership | null
): TransactionGridEngagedSnapshot<unknown> | null {
    if (state.kind === "idle" || state.kind === "pending-activation") return null;
    if (state.kind === "parked") return { focusOwner: { kind: "external" }, state };
    if (
        state.kind === "navigating" ||
        state.kind === "editing" ||
        (state.kind === "interacting" && state.owner === "grid-editor")
    ) {
        return { focusOwner: { kind: "grid" }, state };
    }
    return inspectorFocusOwner == null ? null : { focusOwner: inspectorFocusOwner, state };
}

function pendingAbortFallbackFocus(
    state: TransactionGridPendingActivationState<unknown>,
    explicit: Extract<
        TransactionGridFocusIntent,
        { readonly kind: "gridcell" | "after-grid" }
    > | null,
    previous: TransactionGridAbortFocusRequest | null,
    retainedFocusOwner: HTMLElement | null
): TransactionGridAbortFocusRequest | null {
    const intent = (() => {
        if (explicit != null) return explicit;
        if (state.origin.kind === "engaged" && state.origin.snapshot.focusOwner.kind === "grid") {
            return {
                address: activeTransactionGridAddress(state.origin.snapshot.state.selection),
                kind: "gridcell"
            } as const;
        }
        return previous?.intent ?? null;
    })();
    if (intent == null) return null;
    return {
        clearFailureOnFocus: false,
        generation: state.projectionGeneration,
        intent,
        retainedFocusOwner: previous?.retainedFocusOwner ?? retainedFocusOwner,
        revealBeforeFocus: intent.kind === "gridcell"
    };
}

export interface TransactionGridWorkspaceControllerOptions {
    /** Immutable reveal deadline duration captured when each command is accepted. */
    readonly materializationTimeoutMs?: number;
}

/** Builds one stable workspace controller around the workspace-owned external selection atom. */
export function createTransactionGridWorkspaceController(
    cellSelectionAtom: TransactionCellSelectionAtom,
    options: TransactionGridWorkspaceControllerOptions = {}
): TransactionGridWorkspaceController {
    const materializationTimeoutMs = options.materializationTimeoutMs ?? MATERIALIZATION_TIMEOUT_MS;
    const pendingAtom = createAtom<TransactionGridPendingRequest | null>(null);
    const generationAtom = createAtom<TransactionProjectionGeneration>(
        asTransactionProjectionGeneration(0)
    );
    const registrationVersionAtom = createAtom(0);
    const inspectorRegistrationVersionAtom = createAtom(0);
    const inspectorPanelOpenAtom = createAtom(false);
    const automationEditorAtom = createAtom<TransactionAutomationEditorState | null>(null);
    const automationProposalAtom = createAtom<TransactionAutomationProposalState | null>(null);
    const automationFinalizers = new Map<string, () => void>();
    const failureAtom = createAtom<TransactionGridOperationError | null>(null);
    const engagementAtom = createAtom<TransactionGridRuntimeEngagement | null>(null);
    const deferredPresenceAtom = createAtom<TransactionGridDeferredPresence | null>(null);
    const focusedTransactionAtom = createAtom<TransactionId | null>(null);
    const reconciliationFocusAtom = createAtom<TransactionGridReconciliationFocusRequest | null>(
        null
    );
    const registrations = new Map<string, TransactionGridFocusElement>();
    const cellRegistrationTokens = new Map<string, symbol>();
    const editorRegistrations = new Map<string, TransactionGridFocusElement>();
    const editorRegistrationTokens = new Map<string, symbol>();
    const editorPortalRegistrations = new Map<string, Set<HTMLElement>>();
    const editorPortalRegistrationByElement = new Map<
        HTMLElement,
        { readonly key: string; readonly token: symbol }
    >();
    const inspectorControlRegistrations = new Map<
        string,
        {
            readonly registration: TransactionInspectorBindingRegistration;
            readonly element: HTMLElement;
        }
    >();
    const inspectorControlRegistrationTokens = new Map<string, symbol>();
    const inspectorControlRegistrationByElement = new Map<
        HTMLElement,
        { readonly key: string; readonly token: symbol }
    >();
    const inspectorPortalRegistrations = new Map<
        HTMLElement,
        { readonly registration: TransactionInspectorBindingRegistration; readonly token: symbol }
    >();
    const rowRegistrations = new Map<TransactionId, HTMLElement>();
    let inspectorRoot: HTMLElement | null = null;
    let inspectorRootToken: symbol | null = null;
    let inspectorHeading: HTMLElement | null = null;
    let inspectorHeadingToken: symbol | null = null;
    let afterGridElement: HTMLElement | null = null;
    let scrollElement: HTMLElement | null = null;
    let heldWindowStart: number | null = null;
    let restoreHeldWindowStart: ((start: number) => void) | null = null;
    let selectableColumnIds: readonly TransactionColumnId[] = [];
    let currentCursor: TransactionCursor | null = null;
    let currentProjection: ReturnType<typeof transactionProjectionFromCursor> | null = null;
    // Only opaque tokens are held strongly after consume; pending DOM resources and reconciliation
    // focus owners never become notification-deduplication roots.
    const reconciliationRegistrationAuthorityTokens = new WeakMap<
        TransactionGridReconciliationFocusRequest,
        symbol
    >();
    let registrationWakeAuthority: TransactionGridRegistrationWakeAuthority | null = null;
    let notifiedRegistrationAuthorityToken: symbol | null = null;
    let nextCommandNumber = 1;

    const isRegisteredEditorPortalTarget = (
        address: TransactionGridAddress,
        target: EventTarget | null
    ): boolean => {
        if (!(target instanceof Element)) return false;
        const portal = target.closest<HTMLElement>("[data-owned-by-row][data-owned-by-field]");
        if (
            portal?.dataset.ownedByRow !== address.transactionId ||
            portal.dataset.ownedByField !== address.columnId
        ) {
            return false;
        }
        return editorPortalRegistrations.get(cellRegistrationKey(address))?.has(portal) === true;
    };

    const availableInspectorBindings = (): readonly TransactionInspectorBindingRegistration[] =>
        [...inspectorControlRegistrations.values()]
            .filter(({ element }) => element.isConnected)
            .map(({ registration }) => registration);

    const registeredInspectorOwner = (
        target: EventTarget | null
    ): TransactionGridRegisteredInspectorOwner | null => {
        if (!(target instanceof Element)) return null;
        if (
            inspectorHeading?.isConnected === true &&
            (target === inspectorHeading || inspectorHeading.contains(target))
        ) {
            return { kind: "heading" };
        }
        for (const { element, registration } of inspectorControlRegistrations.values()) {
            if (element.isConnected && (target === element || element.contains(target))) {
                return {
                    binding: registration.binding,
                    kind: "control",
                    transactionOwner: registration.transactionOwner
                };
            }
        }
        for (const [portal, { registration }] of inspectorPortalRegistrations) {
            if (portal.isConnected && (target === portal || portal.contains(target))) {
                return {
                    binding: registration.binding,
                    kind: "control",
                    transactionOwner: registration.transactionOwner
                };
            }
        }
        return null;
    };

    const inspectorRootOwnsTarget = (target: EventTarget | null): boolean =>
        target instanceof Node &&
        inspectorRoot?.isConnected === true &&
        (target === inspectorRoot || inspectorRoot.contains(target));

    const registeredGridAddress = (target: EventTarget | null): TransactionGridAddress | null => {
        if (!(target instanceof Node)) return null;
        for (const [key, element] of registrations) {
            if (!element.isConnected || (target !== element && !element.contains(target))) continue;
            const separator = key.indexOf("\u0000");
            if (separator < 0) return null;
            const columnId = findColumnId(key.slice(separator + 1), selectableColumnIds);
            if (columnId == null) return null;
            return {
                columnId,
                transactionId: asTransactionId(key.slice(0, separator))
            };
        }
        return null;
    };

    const isRegisteredInspectorTarget = (
        registration: TransactionInspectorBindingRegistration,
        target: EventTarget | null
    ): boolean => {
        const owner = registeredInspectorOwner(target);
        return (
            owner?.kind === "control" &&
            owner.transactionOwner === registration.transactionOwner &&
            transactionInspectorBindingEquals(owner.binding, registration.binding)
        );
    };

    const isRegisteredInspectorOwnedTarget = (target: EventTarget | null): boolean =>
        registeredInspectorOwner(target) != null;

    const automationOwnerForAddress = (
        address: TransactionGridAddress
    ): TransactionAutomationOwner | null => {
        const field = transactionColumnAutomationField(address.columnId);
        return field == null ? null : { field, transactionId: address.transactionId };
    };
    const sameStringValues = (first: readonly string[], second: readonly string[]): boolean =>
        first.length === second.length && first.every((value, index) => value === second[index]);
    const sameNumericRecord = (
        first: Readonly<Record<string, number>>,
        second: Readonly<Record<string, number>>
    ): boolean => {
        const firstEntries = Object.entries(first);
        return (
            firstEntries.length === Object.keys(second).length &&
            firstEntries.every(([key, value]) => Object.is(second[key], value))
        );
    };
    const sameAutomationEditorContext = (
        first: TransactionGridAutomationEditorContext,
        second: TransactionGridAutomationEditorContext
    ): boolean => {
        if (first.field !== second.field) return false;
        switch (first.field) {
            case "descriptionAlias":
                return (
                    second.field === first.field &&
                    first.originalText === second.originalText &&
                    first.draftText === second.draftText
                );
            case "tags":
                return (
                    second.field === first.field &&
                    sameStringValues(first.originalTagIds, second.originalTagIds) &&
                    sameStringValues(first.draftTagIds, second.draftTagIds)
                );
            case "allocation":
                return (
                    second.field === first.field &&
                    sameNumericRecord(first.originalAllocations, second.originalAllocations) &&
                    first.draft.personId === second.draft.personId &&
                    first.draft.text === second.draft.text
                );
        }
    };
    const finalizeAutomationOwnerExit = (nextOwner: TransactionId | null): void => {
        const proposal = automationProposalAtom.get();
        if (proposal == null || proposal.owner.transactionId === nextOwner) return;
        const key = transactionAutomationOwnerKey(proposal.owner);
        const finalizer = automationFinalizers.get(key);
        if (finalizer == null) return;
        automationFinalizers.delete(key);
        finalizer();
    };
    const automationOwnerExitIsFinalized = (
        currentOwner: TransactionId,
        nextOwner: TransactionId
    ): boolean => {
        const current = automationProposalAtom.get();
        if (current == null || current.owner.transactionId !== currentOwner) return true;
        finalizeAutomationOwnerExit(nextOwner);
        const remaining = automationProposalAtom.get();
        return remaining == null || remaining.owner.transactionId !== currentOwner;
    };

    const publishAutomationEditorEntry = (
        address: TransactionGridAddress,
        context: TransactionGridAutomationEditorContext
    ): void => {
        const owner = automationOwnerForAddress(address);
        if (owner == null || owner.field !== context.field) return;
        const current = automationEditorAtom.get();
        if (
            current != null &&
            transactionAutomationOwnerEquals(current.owner, owner) &&
            sameAutomationEditorContext(current.context, context)
        ) {
            return;
        }
        automationEditorAtom.set({ context, owner });
    };
    const publishAutomationEditorCancellation = (address: TransactionGridAddress): void => {
        const owner = automationOwnerForAddress(address);
        const current = automationEditorAtom.get();
        if (
            owner != null &&
            current != null &&
            transactionAutomationOwnerEquals(current.owner, owner)
        ) {
            automationEditorAtom.set(null);
        }
    };
    const publishAutomationEditorCommit = (
        address: TransactionGridAddress,
        result: TransactionGridEditorCommitResult
    ): void => {
        const owner = automationOwnerForAddress(address);
        if (owner == null) return;
        if (result.status === "rejected") return;
        automationEditorAtom.set(null);
        if (result.status === "unchanged") return;
        automationProposalAtom.set({
            draftOverride: null,
            errorOverride: null,
            owner,
            renderable: false
        });
    };
    const setAutomationProposalDraft = (
        owner: TransactionAutomationOwner,
        override: RuleProposalDraftOverride | null
    ): boolean => {
        const current = automationProposalAtom.get();
        if (current == null || !transactionAutomationOwnerEquals(current.owner, owner))
            return false;
        automationProposalAtom.set({ ...current, draftOverride: override });
        return true;
    };
    const setAutomationProposalErrors = (
        owner: TransactionAutomationOwner,
        override: RuleProposalErrorOverride | null
    ): boolean => {
        const current = automationProposalAtom.get();
        if (current == null || !transactionAutomationOwnerEquals(current.owner, owner))
            return false;
        automationProposalAtom.set({ ...current, errorOverride: override });
        return true;
    };
    const setAutomationProposalRenderable = (
        owner: TransactionAutomationOwner,
        renderable: boolean
    ): boolean => {
        const current = automationProposalAtom.get();
        if (current == null || !transactionAutomationOwnerEquals(current.owner, owner)) {
            return false;
        }
        if (current.renderable === renderable) return true;
        automationProposalAtom.set({ ...current, renderable });
        return true;
    };
    const dismissAutomationProposal = (owner: TransactionAutomationOwner): boolean => {
        const current = automationProposalAtom.get();
        if (current == null || !transactionAutomationOwnerEquals(current.owner, owner))
            return false;
        automationProposalAtom.set(null);
        return true;
    };
    const registerAutomationFinalizer = (
        owner: TransactionAutomationOwner,
        finalizer: () => void
    ): (() => void) => {
        const key = transactionAutomationOwnerKey(owner);
        automationFinalizers.set(key, finalizer);
        return () => {
            if (automationFinalizers.get(key) === finalizer) automationFinalizers.delete(key);
        };
    };

    const getInteractionState = (): TransactionGridRuntimeInteractionState =>
        interactionStateOf(
            pendingAtom.get()?.state ?? null,
            cellSelectionAtom.get(),
            selectableColumnIds,
            engagementAtom.get()
        );

    const activeAddressOf = (
        state: TransactionGridRuntimeInteractionState
    ): TransactionGridAddress | null => {
        if (state.kind === "idle") return null;
        if (state.kind === "pending-activation") {
            return state.origin.kind === "engaged"
                ? activeTransactionGridAddress(state.origin.snapshot.state.selection)
                : null;
        }
        return activeTransactionGridAddress(state.selection);
    };

    const inspectorFocusOwnership = (
        state: TransactionGridRuntimeInteractionState
    ): TransactionGridInspectorFocusOwnership | null => {
        if (
            state.kind !== "inspecting" &&
            !(state.kind === "interacting" && state.owner === "inspector")
        ) {
            return null;
        }
        const activeAddress = activeAddressOf(state);
        if (activeAddress == null) return null;
        const activeElement =
            inspectorHeading?.ownerDocument.activeElement ??
            inspectorControlRegistrations.values().next().value?.element.ownerDocument
                .activeElement;
        const registeredOwner = registeredInspectorOwner(activeElement ?? null);
        const engagement = engagementAtom.get();
        const retainedOwner: TransactionGridInspectorFocusedOwner =
            state.kind === "interacting"
                ? { binding: state.binding, kind: "control" }
                : engagement?.kind === "inspecting"
                  ? engagement.focused
                  : registeredOwner?.kind === "control" || registeredOwner?.kind === "heading"
                    ? registeredOwner
                    : { kind: "heading" };
        return {
            focused:
                retainedOwner.kind === "control"
                    ? { binding: retainedOwner.binding, kind: "control" }
                    : { kind: "heading" },
            headingRegistered: inspectorHeading?.isConnected === true,
            kind: "inspector",
            panelOpen: inspectorPanelOpenAtom.get()
        };
    };

    const snapshotAtom = createAtom<TransactionGridControllerSnapshot>(
        () => {
            const registrationVersion = registrationVersionAtom.get();
            inspectorRegistrationVersionAtom.get();
            const pending = pendingAtom.get();
            const state = interactionStateOf(
                pending?.state ?? null,
                cellSelectionAtom.get(),
                selectableColumnIds,
                engagementAtom.get()
            );
            const pins = controllerPins(state, focusedTransactionAtom.get());
            const activeAddress = activeAddressOf(state);
            const activePin = pins.find((pin) => pin.kind === "active-origin");
            const focusRetentionPin = pins.find((pin) => pin.kind === "focus-retention");
            const parkedActiveAddress =
                state.kind === "parked" ? activeTransactionGridAddress(state.selection) : null;
            const editor =
                pending?.kind === "edit"
                    ? {
                          address: pending.state.target,
                          entry: pending.entry,
                          initialText: pending.initialText
                      }
                    : state.kind === "editing" ||
                        (state.kind === "interacting" && state.owner === "grid-editor")
                      ? {
                            address: activeTransactionGridAddress(state.selection),
                            entry:
                                state.kind === "editing"
                                    ? state.editor.entry
                                    : state.returnState.editor.entry,
                            initialText: editorInitialText(
                                state.kind === "editing"
                                    ? state.editor.draft
                                    : state.returnState.editor.draft
                            )
                        }
                      : null;
            return {
                activeAddress,
                activeTransactionId: activePin?.transactionId ?? null,
                automation: {
                    editor: automationEditorAtom.get(),
                    proposal: automationProposalAtom.get()
                },
                availableInspectorBindings: availableInspectorBindings(),
                deferredPresence: deferredPresenceAtom.get(),
                inspectorHeadingRegistered: inspectorHeading?.isConnected === true,
                inspectorPanelOpen: inspectorPanelOpenAtom.get(),
                parkedActiveAddress,
                editor,
                failure: failureAtom.get(),
                focusRetentionTransactionId: focusRetentionPin?.transactionId ?? null,
                generation: generationAtom.get(),
                interactionKind: state.kind,
                selectionVisibility: transactionGridSelectionVisibility(state),
                pending,
                pins,
                reconciliationFocus: reconciliationFocusAtom.get(),
                registrationVersion
            };
        },
        {
            compare: (first, second) =>
                first.generation === second.generation &&
                first.registrationVersion === second.registrationVersion &&
                first.pending === second.pending &&
                first.reconciliationFocus === second.reconciliationFocus &&
                first.activeAddress?.transactionId === second.activeAddress?.transactionId &&
                first.activeAddress?.columnId === second.activeAddress?.columnId &&
                first.activeTransactionId === second.activeTransactionId &&
                first.automation.editor === second.automation.editor &&
                first.automation.proposal === second.automation.proposal &&
                first.inspectorHeadingRegistered === second.inspectorHeadingRegistered &&
                first.inspectorPanelOpen === second.inspectorPanelOpen &&
                first.availableInspectorBindings.length ===
                    second.availableInspectorBindings.length &&
                first.availableInspectorBindings.every((registration, index) => {
                    const candidate = second.availableInspectorBindings[index];
                    return (
                        candidate != null && inspectorRegistrationsEqual(registration, candidate)
                    );
                }) &&
                first.deferredPresence?.kind === second.deferredPresence?.kind &&
                first.deferredPresence?.address.transactionId ===
                    second.deferredPresence?.address.transactionId &&
                first.deferredPresence?.address.columnId ===
                    second.deferredPresence?.address.columnId &&
                first.parkedActiveAddress?.transactionId ===
                    second.parkedActiveAddress?.transactionId &&
                first.parkedActiveAddress?.columnId === second.parkedActiveAddress?.columnId &&
                first.editor?.address.transactionId === second.editor?.address.transactionId &&
                first.editor?.address.columnId === second.editor?.address.columnId &&
                first.editor?.entry === second.editor?.entry &&
                first.editor?.initialText === second.editor?.initialText &&
                first.focusRetentionTransactionId === second.focusRetentionTransactionId &&
                first.failure === second.failure &&
                first.interactionKind === second.interactionKind &&
                first.selectionVisibility === second.selectionVisibility &&
                first.pins.length === second.pins.length &&
                first.pins.every(
                    (pin, index) =>
                        pin.kind === second.pins[index]?.kind &&
                        pin.transactionId === second.pins[index]?.transactionId
                )
        }
    );

    const captureActivationResources = (): TransactionGridActivationResources => {
        const ownerDocument =
            scrollElement?.ownerDocument ??
            inspectorHeading?.ownerDocument ??
            afterGridElement?.ownerDocument ??
            registrations.values().next().value?.ownerDocument;
        const activeElement = ownerDocument?.activeElement;
        return {
            focusedElement: activeElement instanceof HTMLElement ? activeElement : null,
            focusedTransactionId: focusedTransactionAtom.get(),
            generation: generationAtom.get(),
            heldWindowStart,
            restoreHeldWindowStart,
            scrollElement,
            scrollLeft: scrollElement?.scrollLeft ?? 0,
            scrollTop: scrollElement?.scrollTop ?? 0
        };
    };

    const publishInteractionState = (
        state: TransactionGridInteractionState<unknown>,
        pendingAbortFocus: Extract<
            TransactionGridFocusIntent,
            { readonly kind: "gridcell" | "after-grid" }
        > | null = null
    ): void => {
        retireRegistrationWakeAuthority();
        const deferredPresence = deferredPresenceAtom.get();
        if (
            deferredPresence != null &&
            !transactionGridRetainsDeferredPresence(state, deferredPresence)
        ) {
            deferredPresenceAtom.set(null);
        }
        if (state.kind === "pending-activation") {
            const previous = pendingAtom.get();
            const acceptedAt = Date.now();
            const retainedRequest =
                previous?.state.acceptedCommandId === state.acceptedCommandId ? previous : null;
            const retainedFocusOwner =
                retainedRequest?.state.origin.kind === "engaged" &&
                retainedRequest.state.origin.snapshot.focusOwner.kind === "grid"
                    ? retainedRequest.resources.focusedElement
                    : null;
            const abortFallbackFocus = pendingAbortFallbackFocus(
                state,
                pendingAbortFocus,
                retainedRequest?.abortFallbackFocus ?? null,
                retainedFocusOwner
            );
            pendingAtom.set(
                previous == null
                    ? {
                          abortFallbackFocus,
                          acceptedAt,
                          composition: INACTIVE_TRANSACTION_COMPOSITION,
                          continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                          deferredPresenceKind: null,
                          entry: "full",
                          focusStartedAt: state.phase === "focus" ? acceptedAt : null,
                          kind: "edit",
                          materializationDeadlineAt: acceptedAt + materializationTimeoutMs,
                          resources: captureActivationResources(),
                          state
                      }
                    : {
                          ...previous,
                          abortFallbackFocus,
                          state
                      }
            );
            engagementAtom.set(null);
            cellSelectionAtom.set(EMPTY_CELL_SELECTION);
            return;
        }
        pendingAtom.set(null);
        if (state.kind === "idle") {
            engagementAtom.set(null);
            cellSelectionAtom.set(EMPTY_CELL_SELECTION);
            return;
        }
        engagementAtom.set(engagementOf(state));
        focusedTransactionAtom.set(null);
        cellSelectionAtom.set(externalSelection(state.selection));
    };

    const restoreActivationResources = (resources: TransactionGridActivationResources): void => {
        if (resources.generation !== generationAtom.get()) return;
        if (resources.heldWindowStart != null) {
            resources.restoreHeldWindowStart?.(resources.heldWindowStart);
        }
        if (resources.scrollElement?.isConnected) {
            resources.scrollElement.scrollLeft = resources.scrollLeft;
            resources.scrollElement.scrollTop = resources.scrollTop;
        }
        if (resources.focusedElement?.isConnected) {
            resources.focusedElement.focus({ preventScroll: true });
        }
        const focusedTransactionId = resources.focusedTransactionId;
        const focusedRowIsCurrent =
            focusedTransactionId != null &&
            currentCursor != null &&
            currentCursor.indexOf(focusedTransactionId) >= 0;
        focusedTransactionAtom.set(focusedRowIsCurrent ? focusedTransactionId : null);
    };

    const focusableElementAt = (
        address: TransactionGridAddress,
        owner: "gridcell" | "editor"
    ): TransactionGridFocusElement | null => {
        const key = cellRegistrationKey(address);
        const exact = owner === "gridcell" ? registrations.get(key) : editorRegistrations.get(key);
        if (exact != null) return exact;
        const legacyExact = registrations.get(key);
        if (
            owner === "editor" &&
            legacyExact?.matches("input, button, select, textarea, [contenteditable='true']")
        ) {
            return legacyExact;
        }
        if (owner === "editor") return null;
        const row = rowRegistrations.get(address.transactionId);
        if (row == null) return null;
        return (
            [...row.querySelectorAll<HTMLElement>('[role="gridcell"][data-cell]')].find(
                (candidate) => candidate.dataset.cell === address.columnId
            ) ?? null
        );
    };

    const inspectorControlElementAt = (
        transactionOwner: TransactionId,
        binding: TransactionInspectorControlBinding
    ): HTMLElement | null => {
        const element = inspectorControlRegistrations.get(
            inspectorRegistrationKey({ binding, transactionOwner })
        )?.element;
        return element?.isConnected === true ? element : null;
    };

    const retainedInspectorFocusElement = (
        transactionOwner: TransactionId,
        binding: TransactionInspectorControlBinding
    ): HTMLElement | null => {
        const control = inspectorControlElementAt(transactionOwner, binding);
        const activeElement = control?.ownerDocument.activeElement;
        const registration = { binding, transactionOwner };
        return activeElement instanceof HTMLElement &&
            isRegisteredInspectorTarget(registration, activeElement)
            ? activeElement
            : control;
    };

    const reconciliationFocusRequest = (
        focus: TransactionGridFocusIntent,
        generation: TransactionProjectionGeneration,
        retainedFocusOwner: HTMLElement | null
    ): TransactionGridReconciliationFocusRequest | null =>
        focus.kind === "none"
            ? null
            : {
                  clearFailureOnFocus: true,
                  generation,
                  intent: focus,
                  retainedFocusOwner,
                  revealBeforeFocus: focus.kind === "gridcell"
              };

    const abortPendingActivation = (
        expected: TransactionPendingOperationIdentity,
        error: TransactionGridOperationError
    ): boolean => {
        const request = pendingAtom.get();
        const current = getInteractionState();
        const aborted = abortTransactionPendingActivation(current, expected);
        if (request == null || !aborted.ok) return false;
        const restoresCapturedResources = request.resources.generation === generationAtom.get();
        batch(() => {
            // Exact same-generation rollback owns the captured DOM resources. Once projection authority
            // advances, raw window and scroll coordinates are stale; only the reconciled model and its
            // canonical grid-owned focus may be published.
            if (restoresCapturedResources) restoreActivationResources(request.resources);
            failureAtom.set(error);
            deferredPresenceAtom.set(null);
            if ("focusOwner" in aborted.value) publishInteractionState(aborted.value.state);
            else publishInteractionState(aborted.value);
            reconciliationFocusAtom.set(
                restoresCapturedResources ? null : request.abortFallbackFocus
            );
        });
        return true;
    };

    const clearUserFocus = (): void => {
        finalizeAutomationOwnerExit(null);
        retireRegistrationWakeAuthority();
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            engagementAtom.set(null);
            focusedTransactionAtom.set(null);
            cellSelectionAtom.set(EMPTY_CELL_SELECTION);
        });
    };

    const retireDelayedFocus = (): void => {
        if (pendingAtom.get() != null) {
            parkExternalFocus();
            return;
        }
        retireRegistrationWakeAuthority();
        reconciliationFocusAtom.set(null);
    };

    const parkExternalFocus = (): void => {
        finalizeAutomationOwnerExit(null);
        retireRegistrationWakeAuthority();
        const current = getInteractionState();
        const retainedSelection =
            current.kind === "pending-activation"
                ? current.origin.kind === "engaged"
                    ? externalSelection(current.origin.snapshot.state.selection)
                    : EMPTY_CELL_SELECTION
                : cellSelectionAtom.get();
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            focusedTransactionAtom.set(null);
            engagementAtom.set(retainedSelection.length === 0 ? null : { kind: "parked" });
            cellSelectionAtom.set(retainedSelection);
        });
    };

    const elementHasGridFocusOwnership = (
        element: HTMLElement,
        intendedAddress: TransactionGridAddress | null,
        retainedFocusOwner: HTMLElement | null
    ): boolean => {
        const active = element.ownerDocument.activeElement;
        if (!(active instanceof HTMLElement) || !active.isConnected) return true;
        if (active === element || element.contains(active)) return true;
        // BODY is only an intermediate owner after the former gridcell unmounts. The grid blur handler
        // synchronously retires this request before its microtask when BODY represents a real exit.
        if (active === element.ownerDocument.body) return true;
        if (
            retainedFocusOwner != null &&
            (active === retainedFocusOwner || retainedFocusOwner.contains(active))
        ) {
            return true;
        }
        if (registeredInspectorOwner(active) != null) return true;
        if (intendedAddress == null) return false;
        const key = cellRegistrationKey(intendedAddress);
        const registeredCell = registrations.get(key);
        const registeredEditor = editorRegistrations.get(key);
        if (
            registeredCell === active ||
            registeredCell?.contains(active) ||
            registeredEditor === active ||
            registeredEditor?.contains(active)
        ) {
            return true;
        }
        return isRegisteredEditorPortalTarget(intendedAddress, active);
    };

    const editorHasFocusOwnership = (
        editor: HTMLElement,
        intendedAddress: TransactionGridAddress
    ): boolean => {
        const active = editor.ownerDocument.activeElement;
        if (
            !(active instanceof HTMLElement) ||
            !active.isConnected ||
            active === editor.ownerDocument.body
        ) {
            return false;
        }
        if (active === editor || editor.contains(active)) return true;
        return isRegisteredEditorPortalTarget(intendedAddress, active);
    };

    const publishNavigatingSelection = (
        selection: CellSelectionState,
        continuous: TransactionContinuousEditIntent = NO_TRANSACTION_CONTINUOUS_EDIT
    ): void => {
        const latestSelection = selection.at(-1);
        finalizeAutomationOwnerExit(
            latestSelection == null ? null : asTransactionId(latestSelection.focusRowId)
        );
        retireRegistrationWakeAuthority();
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            engagementAtom.set({
                continuous,
                kind: "navigating"
            });
            focusedTransactionAtom.set(null);
            cellSelectionAtom.set(selection);
        });
    };

    const publishParkedSelection = (focusedTransactionId: TransactionId | null = null): void => {
        finalizeAutomationOwnerExit(focusedTransactionId);
        retireRegistrationWakeAuthority();
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            engagementAtom.set({ kind: "parked" });
            focusedTransactionAtom.set(focusedTransactionId);
        });
    };

    const beginPendingRequest = (
        target: TransactionGridAddress,
        request:
            | {
                  readonly kind: "edit";
                  readonly entry: TransactionEditEntry;
                  readonly initialText?: string;
                  readonly composition: TransactionCompositionState;
                  readonly continuous: TransactionContinuousEditIntent;
                  readonly deferredPresenceKind: TransactionGridDeferredPresence["kind"] | null;
              }
            | {
                  readonly kind: "navigation";
                  readonly continuous: TransactionContinuousEditIntent;
              }
    ): TransactionPendingOperationIdentity => {
        finalizeAutomationOwnerExit(target.transactionId);
        retireRegistrationWakeAuthority();
        const current = getInteractionState();
        const acceptedCommandId = asTransactionGridCommandId(
            `transaction-grid-command-${String(nextCommandNumber)}`
        );
        nextCommandNumber += 1;
        const projectionGeneration = generationAtom.get();
        const origin = engagedSnapshot(current, inspectorFocusOwnership(current));
        const resources = captureActivationResources();
        const acceptedAt = Date.now();
        const pending = beginTransactionPendingActivation({
            acceptedCommandId,
            current:
                current.kind === "pending-activation"
                    ? current
                    : origin == null
                      ? { kind: "idle", selection: [] }
                      : { kind: "engaged-origin", snapshot: origin },
            phase: "reveal",
            projectionGeneration,
            target
        });
        batch(() => {
            failureAtom.set(null);
            reconciliationFocusAtom.set(null);
            deferredPresenceAtom.set(
                addDeferredPresence(
                    target,
                    request.kind === "edit" ? request.deferredPresenceKind : null
                )
            );
            engagementAtom.set(null);
            cellSelectionAtom.set(EMPTY_CELL_SELECTION);
            pendingAtom.set({
                ...request,
                abortFallbackFocus: null,
                acceptedAt,
                focusStartedAt: null,
                materializationDeadlineAt: acceptedAt + materializationTimeoutMs,
                resources,
                state: pending
            });
        });
        return { acceptedCommandId, projectionGeneration };
    };

    const selectAndFocusGridcell = (
        address: TransactionGridAddress,
        continuous: TransactionContinuousEditIntent = NO_TRANSACTION_CONTINUOUS_EDIT
    ): TransactionGridCellCommandResult => {
        if (continuous.kind === "continue" && transactionColumnSupportsEditing(address.columnId)) {
            beginPendingRequest(address, {
                composition: INACTIVE_TRANSACTION_COMPOSITION,
                continuous,
                deferredPresenceKind: null,
                entry: continuous.entry,
                kind: "edit"
            });
            return { ok: true, value: { kind: "handled" } };
        }
        const element = focusableElementAt(address, "gridcell");
        if (element == null) {
            beginPendingRequest(address, { continuous, kind: "navigation" });
            return { ok: true, value: { kind: "handled" } };
        }
        publishNavigatingSelection(oneCellSelection(address), continuous);
        element.focus({ preventScroll: true });
        return { ok: true, value: { kind: "handled" } };
    };

    const extendSelectionTo = (
        address: TransactionGridAddress,
        continuous: TransactionContinuousEditIntent = NO_TRANSACTION_CONTINUOUS_EDIT
    ): TransactionGridCellCommandResult => {
        const selection = cellSelectionAtom.get();
        const latest = selection[selection.length - 1];
        if (latest == null) return selectAndFocusGridcell(address, continuous);
        publishNavigatingSelection(
            [
                ...selection.slice(0, -1),
                {
                    ...latest,
                    focusColumnId: address.columnId,
                    focusRowId: address.transactionId
                }
            ],
            continuous
        );
        return { ok: true, value: { kind: "handled" } };
    };

    const navigationOrigin = (
        address: TransactionGridAddress,
        extend: boolean
    ): TransactionGridAddress => {
        if (!extend) return address;
        const latest = cellSelectionAtom.get().at(-1);
        if (latest == null) return address;
        const columnId = findColumnId(latest.focusColumnId, selectableColumnIds);
        return columnId == null
            ? address
            : {
                  columnId,
                  transactionId: asTransactionId(latest.focusRowId)
              };
    };

    const resolveNavigation = (
        address: TransactionGridAddress,
        command: TransactionNavigationCommand,
        extend: boolean,
        continuous: TransactionContinuousEditIntent = NO_TRANSACTION_CONTINUOUS_EDIT,
        automationOwnerExit: "allow" | "require-finalized" = "allow"
    ): TransactionGridCellCommandResult => {
        const projection = currentProjection;
        if (projection == null) return { error: { kind: "projection-unavailable" }, ok: false };
        const origin = navigationOrigin(address, extend);
        const resolved = resolveTransactionNavigationTarget(
            projection,
            generationAtom.get(),
            origin,
            command
        );
        if (!resolved.ok) return resolved;
        if (resolved.value.kind === "grid-boundary") {
            publishParkedSelection();
            return { ok: true, value: { kind: "native" } };
        }
        const target = resolved.value.address;
        const reachedClampedBoundary =
            target.transactionId === origin.transactionId && target.columnId === origin.columnId;
        if (
            automationOwnerExit === "require-finalized" &&
            target.transactionId !== origin.transactionId &&
            !automationOwnerExitIsFinalized(origin.transactionId, target.transactionId)
        ) {
            return { ok: true, value: { kind: "handled" } };
        }
        const nextContinuous = reachedClampedBoundary ? NO_TRANSACTION_CONTINUOUS_EDIT : continuous;
        return extend
            ? extendSelectionTo(target, nextContinuous)
            : selectAndFocusGridcell(target, nextContinuous);
    };

    const targetedNavigationCommand = (
        target: Extract<
            TransactionGridKeyIntent,
            { readonly kind: "move-to" | "extend-to" }
        >["target"],
        viewportRows: number
    ): TransactionNavigationCommand => {
        if (target.kind === "row-start" || target.kind === "row-end") return target;
        if (target.kind === "grid-start" || target.kind === "grid-end") return target;
        return target.kind === "page-up"
            ? { kind: "page-up", viewportRows }
            : { kind: "page-down", viewportRows };
    };

    const dispatchFollowUp = (
        address: TransactionGridAddress,
        intent: TransactionGridFollowUpIntent,
        viewportRows: number
    ): TransactionGridCellCommandResult => {
        if (intent.kind === "enter-edit") {
            return {
                ok: true,
                value: {
                    entry: intent.entry,
                    initialText: intent.initialText,
                    kind: "edit"
                }
            };
        }
        if (intent.kind === "activate") {
            return {
                ok: true,
                value: { activation: intent.activation, kind: "activate" }
            };
        }
        const current = getInteractionState();
        const continuous =
            current.kind === "navigating" ? current.continuous : NO_TRANSACTION_CONTINUOUS_EDIT;
        if (intent.kind === "move" || intent.kind === "extend") {
            return resolveNavigation(
                address,
                { direction: intent.direction, kind: "move" },
                intent.kind === "extend",
                continuous
            );
        }
        if (intent.kind === "move-to" || intent.kind === "extend-to") {
            return resolveNavigation(
                address,
                targetedNavigationCommand(intent.target, viewportRows),
                intent.kind === "extend-to",
                continuous
            );
        }
        return resolveNavigation(
            address,
            { direction: intent.direction, kind: "tab" },
            false,
            continuous
        );
    };

    const dispatchCellIntent = (
        address: TransactionGridAddress,
        intent: TransactionGridKeyIntent,
        viewportRows: number
    ): TransactionGridCellCommandResult => {
        if (intent.kind === "establish") {
            const established =
                intent.target == null
                    ? selectAndFocusGridcell(address)
                    : resolveNavigation(
                          address,
                          targetedNavigationCommand(intent.target, viewportRows),
                          false
                      );
            if (
                !established.ok ||
                established.value.kind === "native" ||
                intent.then == null ||
                pendingAtom.get() != null
            ) {
                return established;
            }
            return dispatchFollowUp(address, intent.then, viewportRows);
        }
        if (intent.kind === "expose-selection") {
            const selection = cellSelectionAtom.get();
            const exposed =
                selection.length === 0
                    ? selectAndFocusGridcell(address)
                    : (() => {
                          publishNavigatingSelection(selection);
                          return { ok: true, value: { kind: "handled" } } as const;
                      })();
            if (!exposed.ok || intent.then == null || pendingAtom.get() != null) return exposed;
            return dispatchFollowUp(address, intent.then, viewportRows);
        }
        if (intent.kind === "close-interaction") {
            const state = getInteractionState();
            if (state.kind !== "interacting") {
                return { ok: true, value: { kind: "native" } };
            }
            const closed =
                state.owner === "grid-editor"
                    ? setEditorInteraction(address, state.popup, false)
                    : setInspectorInteraction(
                          {
                              binding: state.binding,
                              transactionOwner: activeTransactionGridAddress(state.selection)
                                  .transactionId
                          },
                          state.popup,
                          false
                      );
            return closed
                ? { ok: true, value: { kind: "handled" } }
                : { ok: true, value: { kind: "native" } };
        }
        if (intent.kind === "close-inspector") {
            return controller.closeInspector()
                ? { ok: true, value: { kind: "handled" } }
                : { ok: true, value: { kind: "native" } };
        }
        if (intent.kind === "cancel-edit") {
            return finishEditing(address)
                ? { ok: true, value: { kind: "handled" } }
                : { ok: true, value: { kind: "native" } };
        }
        if (intent.kind === "cancel-popup-edit") {
            return cancelPopupEditing(address)
                ? { ok: true, value: { kind: "handled" } }
                : { ok: true, value: { kind: "native" } };
        }
        if (intent.kind === "commit-and-move" || intent.kind === "commit-and-extend") {
            const editor = finishGridEditorForNavigation(address);
            if (editor == null) return { ok: true, value: { kind: "native" } };
            const entry = intent.kind === "commit-and-move" ? intent.preserveEntry : editor.entry;
            return resolveNavigation(
                address,
                { direction: intent.direction, kind: "move" },
                intent.kind === "commit-and-extend",
                { entry, kind: "continue" },
                "require-finalized"
            );
        }
        if (intent.kind === "commit-and-move-to" || intent.kind === "commit-and-extend-to") {
            const editor = finishGridEditorForNavigation(address);
            if (editor == null) return { ok: true, value: { kind: "native" } };
            const entry =
                intent.kind === "commit-and-move-to" ? intent.preserveEntry : editor.entry;
            return resolveNavigation(
                address,
                targetedNavigationCommand(intent.target, viewportRows),
                intent.kind === "commit-and-extend-to",
                { entry, kind: "continue" },
                "require-finalized"
            );
        }
        if (intent.kind === "traverse-tab") {
            const state = getInteractionState();
            if (state.kind === "editing") {
                if (!finishEditing(address)) return { ok: true, value: { kind: "native" } };
                return resolveNavigation(
                    address,
                    { direction: intent.direction, kind: "tab" },
                    false,
                    { entry: state.editor.entry, kind: "continue" },
                    "require-finalized"
                );
            }
        }
        if (
            intent.kind === "enter-edit" ||
            intent.kind === "activate" ||
            intent.kind === "move" ||
            intent.kind === "extend" ||
            intent.kind === "move-to" ||
            intent.kind === "extend-to" ||
            intent.kind === "traverse-tab"
        ) {
            return dispatchFollowUp(address, intent, viewportRows);
        }
        if (intent.kind === "park") {
            const selection = cellSelectionAtom.get();
            if (selection.length === 0) return { ok: true, value: { kind: "native" } };
            publishParkedSelection();
            afterGridElement?.focus({ preventScroll: true });
            return { ok: true, value: { kind: "handled" } };
        }
        return { ok: true, value: { kind: "native" } };
    };

    const isCellFocusOwnedByController = (address: TransactionGridAddress): boolean => {
        const pending = pendingAtom.get();
        if (
            pending?.state.phase === "focus" &&
            pending.state.target.transactionId === address.transactionId &&
            pending.state.target.columnId === address.columnId
        ) {
            return true;
        }
        const state = getInteractionState();
        if (state.kind === "navigating" && state.continuous.kind === "continue") {
            const active = activeTransactionGridAddress(state.selection);
            if (
                active.transactionId === address.transactionId &&
                active.columnId === address.columnId
            ) {
                return true;
            }
        }
        const reconciliation = reconciliationFocusAtom.get();
        return (
            reconciliation?.generation === generationAtom.get() &&
            reconciliation.intent.kind === "gridcell" &&
            reconciliation.intent.address.transactionId === address.transactionId &&
            reconciliation.intent.address.columnId === address.columnId
        );
    };

    const setFocusedCell = (transactionId: string, columnId: string | null): void => {
        const transactionOwner = asTransactionId(transactionId);
        finalizeAutomationOwnerExit(transactionOwner);
        retireRegistrationWakeAuthority();
        const canonicalColumnId =
            columnId == null ? undefined : findColumnId(columnId, selectableColumnIds);
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            if (canonicalColumnId == null) {
                engagementAtom.set(null);
                focusedTransactionAtom.set(asTransactionId(transactionId));
                cellSelectionAtom.set(EMPTY_CELL_SELECTION);
                return;
            }
            engagementAtom.set({
                continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                kind: "navigating"
            });
            focusedTransactionAtom.set(null);
            cellSelectionAtom.set(
                oneCellSelection({
                    columnId: canonicalColumnId,
                    transactionId: asTransactionId(transactionId)
                })
            );
        });
    };

    const setFocusedActivation = (transactionId: string): void => {
        if (cellSelectionAtom.get().length === 0) {
            setFocusedCell(transactionId, null);
            return;
        }
        publishParkedSelection(asTransactionId(transactionId));
    };

    const focusGridcellAfterEditorExit = (address: TransactionGridAddress): void => {
        queueMicrotask(() => {
            const current = getInteractionState();
            if (current.kind !== "navigating") return;
            const active = activeTransactionGridAddress(current.selection);
            if (!registrationMatchesAddress(address, active)) return;
            const gridcell = registrations.get(cellRegistrationKey(address));
            if (!gridcell?.isConnected) return;
            gridcell.focus({ preventScroll: true });
        });
    };

    const finishGridEditorForNavigation = (
        address: TransactionGridAddress
    ): TransactionGridEditorState<unknown> | null => {
        const state = getInteractionState();
        const ownedEditor = (() => {
            if (state.kind === "editing") {
                return { editor: state.editor, selection: state.selection };
            }
            if (state.kind === "interacting" && state.owner === "grid-editor") {
                return { editor: state.returnState.editor, selection: state.selection };
            }
            return null;
        })();
        if (ownedEditor == null) return null;
        const active = activeTransactionGridAddress(ownedEditor.selection);
        if (!registrationMatchesAddress(address, active)) return null;
        publishNavigatingSelection(externalSelection(ownedEditor.selection));
        return ownedEditor.editor;
    };

    const cancelPopupEditing = (address: TransactionGridAddress): boolean => {
        const state = getInteractionState();
        if (state.kind !== "interacting" || state.owner !== "grid-editor") return false;
        const active = activeTransactionGridAddress(state.selection);
        if (!registrationMatchesAddress(address, active)) return false;
        publishNavigatingSelection(externalSelection(state.selection));
        focusGridcellAfterEditorExit(address);
        return true;
    };

    const finishEditing = (address: TransactionGridAddress): boolean => {
        const state = getInteractionState();
        if (state.kind !== "editing") return false;
        const active = activeTransactionGridAddress(state.selection);
        if (
            active.transactionId !== address.transactionId ||
            active.columnId !== address.columnId
        ) {
            return false;
        }
        const editor = editorRegistrations.get(cellRegistrationKey(address));
        const ownerDocument = editor?.ownerDocument;
        const activeElement = ownerDocument?.activeElement;
        const editorOwnedFocus = editor != null && editorHasFocusOwnership(editor, address);
        const browserReleasedFocus = ownerDocument != null && activeElement === ownerDocument.body;
        publishNavigatingSelection(externalSelection(state.selection));
        if (editorOwnedFocus || browserReleasedFocus) {
            queueMicrotask(() => {
                const gridcell = registrations.get(cellRegistrationKey(address));
                if (
                    gridcell?.isConnected &&
                    gridcell.ownerDocument.activeElement === gridcell.ownerDocument.body
                ) {
                    gridcell.focus({ preventScroll: true });
                }
            });
        }
        return true;
    };

    const registrationMatchesAddress = (
        registered: TransactionGridAddress,
        requested: TransactionGridAddress
    ): boolean =>
        registered.transactionId === requested.transactionId &&
        registered.columnId === requested.columnId;

    const currentRegistrationWakeAuthority =
        (): TransactionGridRegistrationWakeAuthority | null => {
            const pending = pendingAtom.get();
            if (pending?.state.phase === "focus") {
                const current = registrationWakeAuthority;
                if (
                    current?.kind === "pending" &&
                    current.acceptedCommandId === pending.state.acceptedCommandId &&
                    current.projectionGeneration === pending.state.projectionGeneration
                ) {
                    return current;
                }
                const replacement: TransactionGridRegistrationWakeAuthority = {
                    acceptedCommandId: pending.state.acceptedCommandId,
                    kind: "pending",
                    projectionGeneration: pending.state.projectionGeneration,
                    token: Symbol()
                };
                registrationWakeAuthority = replacement;
                notifiedRegistrationAuthorityToken = null;
                return replacement;
            }
            const reconciliation = reconciliationFocusAtom.get();
            if (reconciliation?.generation === generationAtom.get()) {
                const knownToken = reconciliationRegistrationAuthorityTokens.get(reconciliation);
                const token = knownToken ?? Symbol();
                if (knownToken == null) {
                    reconciliationRegistrationAuthorityTokens.set(reconciliation, token);
                }
                if (registrationWakeAuthority?.token !== token) {
                    registrationWakeAuthority = { kind: "reconciliation", token };
                    notifiedRegistrationAuthorityToken = null;
                }
                return registrationWakeAuthority;
            }
            registrationWakeAuthority = null;
            notifiedRegistrationAuthorityToken = null;
            return null;
        };

    const releaseRegistrationWake = (expectedToken: symbol): void => {
        const authority = currentRegistrationWakeAuthority();
        if (authority?.token !== expectedToken) return;
        if (notifiedRegistrationAuthorityToken === expectedToken) {
            notifiedRegistrationAuthorityToken = null;
        }
    };

    const retireRegistrationWakeAuthority = (expectedToken?: symbol): void => {
        if (expectedToken != null && registrationWakeAuthority?.token !== expectedToken) return;
        registrationWakeAuthority = null;
        notifiedRegistrationAuthorityToken = null;
    };

    const notifyRegistrationWake = (): void => {
        const authority = currentRegistrationWakeAuthority();
        if (authority == null || authority.token === notifiedRegistrationAuthorityToken) return;
        notifiedRegistrationAuthorityToken = authority.token;
        registrationVersionAtom.set((version) => version + 1);
    };

    const cellRegistrationWakesFocus = (
        address: TransactionGridAddress,
        element: HTMLElement
    ): boolean => {
        const pending = pendingAtom.get();
        if (
            pending?.state.phase === "focus" &&
            registrationMatchesAddress(address, pending.state.target) &&
            (pending.kind === "navigation" ||
                element.matches("input, button, select, textarea, [contenteditable='true']"))
        ) {
            return true;
        }
        const reconciliation = reconciliationFocusAtom.get();
        return (
            reconciliation?.generation === generationAtom.get() &&
            reconciliation.intent.kind === "gridcell" &&
            registrationMatchesAddress(address, reconciliation.intent.address)
        );
    };

    const editorRegistrationWakesFocus = (address: TransactionGridAddress): boolean => {
        const pending = pendingAtom.get();
        return (
            pending?.kind === "edit" &&
            pending.state.phase === "focus" &&
            registrationMatchesAddress(address, pending.state.target)
        );
    };

    const inspectorHeadingRegistrationWakesFocus = (): boolean => {
        const reconciliation = reconciliationFocusAtom.get();
        return (
            reconciliation?.generation === generationAtom.get() &&
            reconciliation.intent.kind === "inspector-heading"
        );
    };

    const inspectorControlRegistrationWakesFocus = (
        registration: TransactionInspectorBindingRegistration
    ): boolean => {
        const reconciliation = reconciliationFocusAtom.get();
        const activeAddress = activeAddressOf(getInteractionState());
        return (
            activeAddress != null &&
            reconciliation?.generation === generationAtom.get() &&
            reconciliation.intent.kind === "retain-inspector-control" &&
            activeAddress.transactionId === registration.transactionOwner &&
            transactionInspectorBindingEquals(reconciliation.intent.binding, registration.binding)
        );
    };

    function registerEditor(
        address: TransactionGridAddress,
        element: TransactionGridFocusElement
    ): () => void;
    function registerEditor(address: TransactionGridAddress, element: null): void;
    function registerEditor(
        address: TransactionGridAddress,
        element: TransactionGridFocusElement | null
    ): (() => void) | void {
        const key = cellRegistrationKey(address);
        if (element == null) {
            editorRegistrationTokens.delete(key);
            editorRegistrations.delete(key);
            return;
        }
        const previous = editorRegistrations.get(key) ?? null;
        const token = Symbol();
        editorRegistrations.set(key, element);
        editorRegistrationTokens.set(key, token);
        if (previous !== element && editorRegistrationWakesFocus(address)) {
            notifyRegistrationWake();
        }
        return () => {
            if (editorRegistrationTokens.get(key) !== token) return;
            editorRegistrationTokens.delete(key);
            editorRegistrations.delete(key);
        };
    }

    const rowRegistrationWakesFocus = (transactionId: TransactionId): boolean => {
        const pending = pendingAtom.get();
        if (
            pending?.kind === "navigation" &&
            pending.state.phase === "focus" &&
            pending.state.target.transactionId === transactionId &&
            focusableElementAt(pending.state.target, "gridcell") != null
        ) {
            return true;
        }
        const reconciliation = reconciliationFocusAtom.get();
        return (
            reconciliation?.generation === generationAtom.get() &&
            reconciliation.intent.kind === "gridcell" &&
            reconciliation.intent.address.transactionId === transactionId &&
            focusableElementAt(reconciliation.intent.address, "gridcell") != null
        );
    };

    const setEditorInteraction = (
        address: TransactionGridAddress,
        popup: TransactionEditorPopupKind,
        open: boolean
    ): boolean => {
        const state = getInteractionState();
        const active =
            state.kind === "idle" || state.kind === "pending-activation"
                ? null
                : activeTransactionGridAddress(state.selection);
        if (active == null || !registrationMatchesAddress(address, active)) return false;
        if (open) {
            if (state.kind === "editing") {
                engagementAtom.set({
                    editor: state.editor,
                    kind: "interacting",
                    owner: "grid-editor",
                    popup
                });
                return true;
            }
            if (state.kind === "interacting" && state.owner === "grid-editor") {
                if (state.popup === popup) return true;
                engagementAtom.set({
                    editor: state.returnState.editor,
                    kind: "interacting",
                    owner: "grid-editor",
                    popup
                });
                return true;
            }
            return false;
        }
        if (
            state.kind !== "interacting" ||
            state.owner !== "grid-editor" ||
            state.popup !== popup
        ) {
            return false;
        }
        engagementAtom.set({ editor: state.returnState.editor, kind: "editing" });
        const key = cellRegistrationKey(address);
        const editor = editorRegistrations.get(key);
        queueMicrotask(() => {
            const current = getInteractionState();
            if (current.kind !== "editing") return;
            const currentAddress = activeTransactionGridAddress(current.selection);
            if (!registrationMatchesAddress(address, currentAddress)) return;
            if (
                editor?.isConnected &&
                editorRegistrations.get(key) === editor &&
                editor.ownerDocument.activeElement === editor.ownerDocument.body
            ) {
                editor.focus({ preventScroll: true });
            }
        });
        return true;
    };

    const enterInspector = (target: EventTarget | null): boolean => {
        if (!inspectorPanelOpenAtom.get()) return false;
        const state = getInteractionState();
        if (
            state.kind === "idle" ||
            state.kind === "pending-activation" ||
            state.kind === "editing" ||
            (state.kind === "interacting" && state.owner === "grid-editor")
        ) {
            return false;
        }
        const active = activeTransactionGridAddress(state.selection);
        const owner = registeredInspectorOwner(target);
        if (owner == null) return false;
        if (owner.kind === "control" && owner.transactionOwner !== active.transactionId) {
            return false;
        }
        retireRegistrationWakeAuthority();
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            deferredPresenceAtom.set(null);
            focusedTransactionAtom.set(null);
            engagementAtom.set({
                focused:
                    owner.kind === "control"
                        ? { binding: owner.binding, kind: "control" }
                        : { kind: "heading" },
                kind: "inspecting"
            });
        });
        return true;
    };

    const handleInspectorFocusOut = (
        relatedTarget: EventTarget | null,
        ownerDocument: Document
    ): void => {
        if (!inspectorPanelOpenAtom.get()) return;
        if (
            registeredInspectorOwner(relatedTarget) != null ||
            inspectorRootOwnsTarget(relatedTarget)
        ) {
            return;
        }
        const immediateGridAddress = registeredGridAddress(relatedTarget);
        if (immediateGridAddress != null) {
            setFocusedCell(immediateGridAddress.transactionId, immediateGridAddress.columnId);
            return;
        }
        queueMicrotask(() => {
            queueMicrotask(() => {
                if (!inspectorPanelOpenAtom.get()) return;
                const activeElement = ownerDocument.activeElement;
                if (
                    registeredInspectorOwner(activeElement) != null ||
                    inspectorRootOwnsTarget(activeElement)
                ) {
                    enterInspector(activeElement);
                    return;
                }
                const settledGridAddress = registeredGridAddress(activeElement);
                if (settledGridAddress != null) {
                    setFocusedCell(settledGridAddress.transactionId, settledGridAddress.columnId);
                    return;
                }
                parkExternalFocus();
            });
        });
    };

    const setInspectorInteraction = (
        registration: TransactionInspectorBindingRegistration,
        popup: TransactionEditorPopupKind,
        open: boolean
    ): boolean => {
        const state = getInteractionState();
        if (state.kind === "idle" || state.kind === "pending-activation") return false;
        const active = activeTransactionGridAddress(state.selection);
        if (
            active.transactionId !== registration.transactionOwner ||
            inspectorControlElementAt(registration.transactionOwner, registration.binding) == null
        ) {
            return false;
        }
        if (open) {
            if (state.kind === "inspecting") {
                engagementAtom.set({
                    binding: registration.binding,
                    kind: "interacting",
                    owner: "inspector",
                    popup
                });
                return true;
            }
            if (state.kind === "interacting" && state.owner === "inspector") {
                if (
                    state.popup === popup &&
                    transactionInspectorBindingEquals(state.binding, registration.binding)
                ) {
                    return true;
                }
                engagementAtom.set({
                    binding: registration.binding,
                    kind: "interacting",
                    owner: "inspector",
                    popup
                });
                return true;
            }
            return false;
        }
        if (
            state.kind !== "interacting" ||
            state.owner !== "inspector" ||
            state.popup !== popup ||
            !transactionInspectorBindingEquals(state.binding, registration.binding)
        ) {
            return false;
        }
        engagementAtom.set({
            focused: { binding: registration.binding, kind: "control" },
            kind: "inspecting"
        });
        const control = inspectorControlElementAt(
            registration.transactionOwner,
            registration.binding
        );
        queueMicrotask(() => {
            const current = getInteractionState();
            if (current.kind !== "inspecting") return;
            const currentAddress = activeTransactionGridAddress(current.selection);
            if (currentAddress.transactionId !== registration.transactionOwner) return;
            if (
                control?.isConnected &&
                inspectorControlElementAt(registration.transactionOwner, registration.binding) ===
                    control &&
                control.ownerDocument.activeElement === control.ownerDocument.body
            ) {
                control.focus({ preventScroll: true });
            }
        });
        return true;
    };

    const dispatchCompositionEvent = (
        address: TransactionGridAddress,
        event: TransactionCompositionEvent
    ): TransactionCompositionResult | null => {
        const pending = pendingAtom.get();
        if (pending?.kind === "edit" && registrationMatchesAddress(address, pending.state.target)) {
            const result = reduceTransactionComposition(pending.composition, event);
            pendingAtom.set({ ...pending, composition: result.composition });
            return result;
        }
        const state = getInteractionState();
        if (state.kind !== "editing") return null;
        const active = activeTransactionGridAddress(state.selection);
        if (!registrationMatchesAddress(address, active)) return null;
        const previousComposition = state.editor.composition;
        const result = reduceTransactionComposition(previousComposition, event);
        if (
            event.kind === "resume" &&
            previousComposition.kind === "consumed" &&
            previousComposition.resume === "navigating"
        ) {
            finishEditing(address);
            return result;
        }
        engagementAtom.set({
            editor: { ...state.editor, composition: result.composition },
            kind: "editing"
        });
        return result;
    };

    const acknowledgeEditorGesture = (address: TransactionGridAddress): void => {
        const deferred = deferredPresenceAtom.get();
        const state = getInteractionState();
        if (deferred == null || state.kind !== "editing") return;
        const active = activeTransactionGridAddress(state.selection);
        if (
            deferred.address.transactionId !== address.transactionId ||
            deferred.address.columnId !== address.columnId ||
            active.transactionId !== address.transactionId ||
            active.columnId !== address.columnId
        ) {
            return;
        }
        deferredPresenceAtom.set(null);
    };

    const isRegisteredCellElement = (element: HTMLElement): boolean => {
        for (const registered of registrations.values()) {
            if (registered === element) return true;
        }
        return false;
    };

    const controller: TransactionGridWorkspaceController = {
        cellSelectionAtom,
        acknowledgeEditorGesture,
        beginActivation: ({
            compositionSequence,
            entry,
            initialText,
            presence = "publish",
            target
        }) =>
            beginPendingRequest(target, {
                composition:
                    compositionSequence == null
                        ? INACTIVE_TRANSACTION_COMPOSITION
                        : {
                              emptyCompletion: "navigating",
                              kind: "active",
                              preview: "",
                              sequence: compositionSequence
                          },
                continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                deferredPresenceKind:
                    presence === "defer-add-until-editor-gesture"
                        ? "add-description-editor-gesture"
                        : null,
                entry,
                initialText,
                kind: "edit"
            }),
        markRevealApplied: (expected) => {
            const request = pendingAtom.get();
            if (request == null || !sameOperation(request.state, expected)) return false;
            if (Date.now() >= request.materializationDeadlineAt) {
                abortPendingActivation(expected, {
                    address: request.state.target,
                    kind: "load-failed"
                });
                return false;
            }
            pendingAtom.set({
                ...request,
                focusStartedAt: request.focusStartedAt ?? Date.now(),
                state: beginTransactionPendingActivation({
                    acceptedCommandId: request.state.acceptedCommandId,
                    current: request.state,
                    phase: "focus",
                    projectionGeneration: request.state.projectionGeneration,
                    target: request.state.target
                })
            });
            return true;
        },
        registerCell: (address, element) => {
            const key = cellRegistrationKey(address);
            const previous = registrations.get(key) ?? null;
            const token = Symbol();
            registrations.set(key, element);
            cellRegistrationTokens.set(key, token);
            if (previous !== element && cellRegistrationWakesFocus(address, element)) {
                notifyRegistrationWake();
            }
            return () => {
                if (cellRegistrationTokens.get(key) !== token) return;
                cellRegistrationTokens.delete(key);
                registrations.delete(key);
            };
        },
        isRegisteredEditorPortalTarget,
        registerEditorPortal: (address, element) => {
            const key = cellRegistrationKey(address);
            const priorRegistration = editorPortalRegistrationByElement.get(element);
            if (priorRegistration != null) {
                const priorPortals = editorPortalRegistrations.get(priorRegistration.key);
                priorPortals?.delete(element);
                if (priorPortals?.size === 0) {
                    editorPortalRegistrations.delete(priorRegistration.key);
                }
            }
            const token = Symbol();
            const portals = editorPortalRegistrations.get(key) ?? new Set<HTMLElement>();
            portals.add(element);
            editorPortalRegistrations.set(key, portals);
            editorPortalRegistrationByElement.set(element, { key, token });
            return () => {
                const current = editorPortalRegistrationByElement.get(element);
                if (current?.token !== token || current.key !== key) return;
                editorPortalRegistrationByElement.delete(element);
                const currentPortals = editorPortalRegistrations.get(key);
                currentPortals?.delete(element);
                if (currentPortals?.size === 0) editorPortalRegistrations.delete(key);
            };
        },
        registerInspectorRoot: (element) => {
            const token = Symbol();
            inspectorRoot = element;
            inspectorRootToken = token;
            return () => {
                if (inspectorRootToken !== token) return;
                inspectorRoot = null;
                inspectorRootToken = null;
            };
        },
        registerInspectorHeading: (element) => {
            const previous = inspectorHeading;
            const token = Symbol();
            inspectorHeading = element;
            inspectorHeadingToken = token;
            if (previous !== element) {
                inspectorRegistrationVersionAtom.set((version) => version + 1);
                if (inspectorHeadingRegistrationWakesFocus()) notifyRegistrationWake();
            }
            return () => {
                if (inspectorHeadingToken !== token) return;
                inspectorHeading = null;
                inspectorHeadingToken = null;
                inspectorRegistrationVersionAtom.set((version) => version + 1);
            };
        },
        registerInspectorControl: (registration, element) => {
            const key = inspectorRegistrationKey(registration);
            const priorElementRegistration = inspectorControlRegistrationByElement.get(element);
            if (
                priorElementRegistration != null &&
                priorElementRegistration.key !== key &&
                inspectorControlRegistrationTokens.get(priorElementRegistration.key) ===
                    priorElementRegistration.token
            ) {
                inspectorControlRegistrationTokens.delete(priorElementRegistration.key);
                inspectorControlRegistrations.delete(priorElementRegistration.key);
            }
            const previous = inspectorControlRegistrations.get(key)?.element ?? null;
            const token = Symbol();
            inspectorControlRegistrations.set(key, { element, registration });
            inspectorControlRegistrationTokens.set(key, token);
            inspectorControlRegistrationByElement.set(element, { key, token });
            if (previous !== element || priorElementRegistration?.key !== key) {
                inspectorRegistrationVersionAtom.set((version) => version + 1);
                if (inspectorControlRegistrationWakesFocus(registration)) {
                    notifyRegistrationWake();
                }
            }
            return () => {
                if (inspectorControlRegistrationTokens.get(key) !== token) return;
                inspectorControlRegistrationTokens.delete(key);
                inspectorControlRegistrations.delete(key);
                const currentElementRegistration =
                    inspectorControlRegistrationByElement.get(element);
                if (
                    currentElementRegistration?.key === key &&
                    currentElementRegistration.token === token
                ) {
                    inspectorControlRegistrationByElement.delete(element);
                }
                inspectorRegistrationVersionAtom.set((version) => version + 1);
            };
        },
        registerInspectorPortal: (registration, element) => {
            const token = Symbol();
            inspectorPortalRegistrations.set(element, { registration, token });
            return () => {
                const current = inspectorPortalRegistrations.get(element);
                if (current?.token !== token) return;
                inspectorPortalRegistrations.delete(element);
            };
        },
        isRegisteredInspectorTarget,
        isRegisteredInspectorOwnedTarget,
        registerEditor,
        publishAutomationEditorEntry,
        publishAutomationEditorCancellation,
        publishAutomationEditorCommit,
        setAutomationProposalDraft,
        setAutomationProposalErrors,
        setAutomationProposalRenderable,
        dismissAutomationProposal,
        registerAutomationFinalizer,
        dispatchCellIntent,
        dispatchCompositionEvent,
        registerRow: (transactionId, element) => {
            const previous = rowRegistrations.get(transactionId) ?? null;
            if (previous === element) return;
            if (element == null) rowRegistrations.delete(transactionId);
            else rowRegistrations.set(transactionId, element);
            if (element != null && rowRegistrationWakesFocus(transactionId)) {
                notifyRegistrationWake();
            }
        },
        registerAfterGridElement: (element) => {
            if (afterGridElement === element) return;
            afterGridElement = element;
            const reconciliation = reconciliationFocusAtom.get();
            if (
                element != null &&
                reconciliation?.generation === generationAtom.get() &&
                reconciliation.intent.kind === "after-grid"
            ) {
                notifyRegistrationWake();
            }
        },
        registerScrollElement: (element) => {
            scrollElement = element;
        },
        setHeldWindowState: (start, restore) => {
            heldWindowStart = start;
            restoreHeldWindowStart = restore;
        },
        setEditorInteraction,
        setInspectorInteraction,
        setInspectorPanelOpen: (open) => {
            if (inspectorPanelOpenAtom.get() === open) return;
            if (!open && controller.closeInspector()) return;
            inspectorPanelOpenAtom.set(open);
        },
        revealInspector: () => {
            if (!inspectorPanelOpenAtom.get()) return false;
            const revealTarget =
                inspectorHeading?.isConnected === true
                    ? inspectorHeading
                    : inspectorRoot?.isConnected === true
                      ? inspectorRoot
                      : null;
            if (revealTarget == null || typeof revealTarget.scrollIntoView !== "function") {
                return false;
            }
            revealTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            return true;
        },
        enterInspector,
        handleInspectorFocusOut,
        activateInspectorFromActionCell: (address) => {
            const state = getInteractionState();
            if (state.kind !== "navigating") return "stale";
            const active = activeTransactionGridAddress(state.selection);
            if (!registrationMatchesAddress(address, active)) return "stale";
            const actionCell = focusableElementAt(address, "gridcell");
            const activeElement = actionCell?.ownerDocument.activeElement;
            if (
                actionCell == null ||
                !(
                    activeElement === actionCell ||
                    (activeElement instanceof Node && actionCell.contains(activeElement))
                )
            ) {
                return "stale";
            }
            retireRegistrationWakeAuthority();
            batch(() => {
                inspectorPanelOpenAtom.set(true);
                pendingAtom.set(null);
                failureAtom.set(null);
                deferredPresenceAtom.set(null);
                focusedTransactionAtom.set(null);
                engagementAtom.set({ focused: { kind: "heading" }, kind: "inspecting" });
                reconciliationFocusAtom.set({
                    clearFailureOnFocus: true,
                    generation: generationAtom.get(),
                    intent: { kind: "inspector-heading" },
                    retainedFocusOwner:
                        focusableElementAt(address, "gridcell") ??
                        captureActivationResources().focusedElement,
                    revealBeforeFocus: true,
                    revealBlock: "nearest"
                });
            });
            return controller.focusReconciliation(generationAtom.get());
        },
        closeInspector: () => {
            const state = getInteractionState();
            const retainedFocusOwner = captureActivationResources().focusedElement;
            const closesEmptyInspector =
                state.kind === "idle" &&
                inspectorPanelOpenAtom.get() &&
                inspectorRootOwnsTarget(retainedFocusOwner);
            if (closesEmptyInspector) {
                retireRegistrationWakeAuthority();
                batch(() => {
                    inspectorPanelOpenAtom.set(false);
                    pendingAtom.set(null);
                    failureAtom.set(null);
                    deferredPresenceAtom.set(null);
                    focusedTransactionAtom.set(null);
                    engagementAtom.set(null);
                    reconciliationFocusAtom.set({
                        clearFailureOnFocus: true,
                        generation: generationAtom.get(),
                        intent: { kind: "after-grid" },
                        retainedFocusOwner,
                        revealBeforeFocus: false
                    });
                });
                controller.focusReconciliation(generationAtom.get());
                return true;
            }
            if (
                state.kind !== "inspecting" &&
                !(state.kind === "interacting" && state.owner === "inspector")
            ) {
                return false;
            }
            const active = activeTransactionGridAddress(state.selection);
            retireRegistrationWakeAuthority();
            batch(() => {
                inspectorPanelOpenAtom.set(false);
                pendingAtom.set(null);
                failureAtom.set(null);
                deferredPresenceAtom.set(null);
                focusedTransactionAtom.set(null);
                engagementAtom.set({
                    continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                    kind: "navigating"
                });
                reconciliationFocusAtom.set({
                    clearFailureOnFocus: true,
                    generation: generationAtom.get(),
                    intent: { address: active, kind: "gridcell" },
                    retainedFocusOwner,
                    revealBeforeFocus: true,
                    revealBlock: "center"
                });
            });
            controller.focusReconciliation(generationAtom.get());
            return true;
        },
        setFocusedActivation,
        setFocusedCell,
        finishEditing,
        isCellFocusOwnedByController,
        isRegisteredCellElement,
        clearCellSelection: clearUserFocus,
        clearUserFocus,
        retireDelayedFocus,
        parkExternalFocus,
        getInteractionState,
        getPendingRequest: () => pendingAtom.get(),
        getSnapshot: () => snapshotAtom.get(),
        subscribe: (listener) => {
            const subscription = snapshotAtom.subscribe(listener);
            return () => subscription.unsubscribe();
        },
        updateProjection: (cursor, nextColumnIds, isTransactionCanonicallyLive) => {
            const previousCursor = currentCursor;
            const previousProjection = currentProjection;
            const previousState = getInteractionState();
            const previousInspectorFocusOwner = inspectorFocusOwnership(previousState);
            const previousFocusedElement = captureActivationResources().focusedElement;
            const nextSelectableColumnIds = [...nextColumnIds];
            const structureChanged =
                previousCursor != null &&
                (!sameCursorOrder(previousCursor, cursor) ||
                    !sameColumnOrder(selectableColumnIds, nextSelectableColumnIds));
            const previousAutomationOwner = automationProposalAtom.get()?.owner ?? null;
            const automationOwnerRetired =
                previousAutomationOwner != null &&
                isTransactionCanonicallyLive?.(previousAutomationOwner.transactionId) === false;

            selectableColumnIds = nextSelectableColumnIds;
            currentCursor = cursor;
            if (previousProjection == null || previousCursor == null) {
                currentProjection = transactionProjectionFromCursor({
                    currentGeneration: () => generationAtom.get(),
                    cursor,
                    generation: generationAtom.get(),
                    selectableColumnIds: nextSelectableColumnIds
                });
                if (automationOwnerRetired && previousAutomationOwner != null) {
                    dismissAutomationProposal(previousAutomationOwner);
                }
                return null;
            }
            if (!structureChanged) {
                currentProjection = transactionProjectionFromCursor({
                    currentGeneration: () => generationAtom.get(),
                    cursor,
                    generation: generationAtom.get(),
                    selectableColumnIds: nextSelectableColumnIds
                });
                if (automationOwnerRetired && previousAutomationOwner != null) {
                    dismissAutomationProposal(previousAutomationOwner);
                }
                return null;
            }

            const nextGeneration = nextTransactionProjectionGeneration(generationAtom.get());
            const previousPendingRequest = pendingAtom.get();
            const nextProjection = transactionProjectionFromCursor({
                currentGeneration: () => generationAtom.get(),
                cursor,
                generation: nextGeneration,
                selectableColumnIds: nextSelectableColumnIds
            });
            let outcome: TransactionGridReconciliationOutcome | null = null;
            batch(() => {
                generationAtom.set(nextGeneration);
                currentProjection = nextProjection;
                const focusedTransactionId = focusedTransactionAtom.get();
                if (focusedTransactionId != null && cursor.indexOf(focusedTransactionId) < 0) {
                    focusedTransactionAtom.set(null);
                }
                outcome = (() => {
                    if (
                        previousState.kind === "idle" ||
                        previousState.kind === "pending-activation"
                    ) {
                        return reconcileTransactionGridProjection({
                            availableInspectorBindings: availableInspectorBindings(),
                            nextProjection,
                            previousProjection,
                            previousState
                        });
                    }
                    if (previousState.kind === "parked") {
                        return reconcileTransactionGridProjection({
                            availableInspectorBindings: availableInspectorBindings(),
                            focusOwner: { kind: "external" },
                            nextProjection,
                            previousProjection,
                            previousState
                        });
                    }
                    if (
                        previousState.kind === "inspecting" ||
                        (previousState.kind === "interacting" &&
                            previousState.owner === "inspector")
                    ) {
                        if (previousInspectorFocusOwner == null) {
                            throw new Error(
                                "inspector engagement must retain inspector focus ownership"
                            );
                        }
                        return reconcileTransactionGridProjection({
                            availableInspectorBindings: availableInspectorBindings(),
                            focusOwner: previousInspectorFocusOwner,
                            nextProjection,
                            previousProjection,
                            previousState
                        });
                    }
                    return reconcileTransactionGridProjection({
                        availableInspectorBindings: availableInspectorBindings(),
                        focusOwner: { kind: "grid" },
                        nextProjection,
                        previousProjection,
                        previousState
                    });
                })();
                const nextAutomationTransactionOwner = outcome.ok
                    ? (activeAddressOf(outcome.value.state)?.transactionId ?? null)
                    : null;
                finalizeAutomationOwnerExit(nextAutomationTransactionOwner);
                if (automationOwnerRetired && previousAutomationOwner != null) {
                    dismissAutomationProposal(previousAutomationOwner);
                }
                if (outcome.ok) {
                    publishInteractionState(
                        outcome.value.state,
                        outcome.value.pendingAbortFocus ?? null
                    );
                    const directFocus = reconciliationFocusRequest(
                        outcome.value.focus,
                        nextGeneration,
                        previousFocusedElement
                    );
                    const terminalAbortFallback =
                        previousState.kind === "pending-activation" &&
                        outcome.value.state.kind !== "pending-activation" &&
                        directFocus == null &&
                        previousPendingRequest?.abortFallbackFocus?.intent.kind === "after-grid"
                            ? {
                                  ...previousPendingRequest.abortFallbackFocus,
                                  generation: nextGeneration
                              }
                            : null;
                    reconciliationFocusAtom.set(directFocus ?? terminalAbortFallback);
                } else {
                    retireRegistrationWakeAuthority();
                    failureAtom.set(outcome.error);
                    pendingAtom.set(null);
                    deferredPresenceAtom.set(null);
                    engagementAtom.set(null);
                    reconciliationFocusAtom.set(null);
                    cellSelectionAtom.set(EMPTY_CELL_SELECTION);
                }
            });
            return outcome;
        },
        focusPendingActivation: (expected) => {
            const request = pendingAtom.get();
            if (request == null || !sameOperation(request.state, expected)) return "stale";
            if (request.state.phase !== "focus") return "unregistered";
            const registrationAuthority = currentRegistrationWakeAuthority();
            const focusOwner = request.kind === "navigation" ? "gridcell" : "editor";
            const element = focusableElementAt(request.state.target, focusOwner);
            if (element == null) {
                if (registrationAuthority != null) {
                    releaseRegistrationWake(registrationAuthority.token);
                }
                return "unregistered";
            }
            const editorAlreadyOwnsFocus =
                request.kind === "edit" && editorHasFocusOwnership(element, request.state.target);
            if (!editorAlreadyOwnsFocus) element.focus({ preventScroll: true });
            if (request.kind === "edit" && element.matches("[data-legacy-edit-activation]")) {
                if (element.getAttribute("aria-expanded") !== "true") element.click();
                if (
                    request.initialText != null &&
                    !(element instanceof HTMLInputElement) &&
                    !(element instanceof HTMLTextAreaElement)
                ) {
                    element.dispatchEvent(
                        new KeyboardEvent("keydown", {
                            bubbles: true,
                            key: request.initialText
                        })
                    );
                }
            }
            const focusedRequest = pendingAtom.get();
            const focusVerified =
                element.isConnected &&
                (request.kind === "edit"
                    ? editorHasFocusOwnership(element, request.state.target)
                    : element.ownerDocument.activeElement === element) &&
                focusedRequest != null &&
                focusedRequest.state.phase === "focus" &&
                sameOperation(focusedRequest.state, expected);
            if (!focusVerified) {
                abortPendingActivation(expected, {
                    address: request.state.target,
                    kind: "focus-failed"
                });
                return "stale";
            }
            const fulfilled =
                focusedRequest.kind === "navigation"
                    ? fulfillTransactionPendingActivation(focusedRequest.state, expected, {
                          continuous: focusedRequest.continuous,
                          kind: "navigating"
                      })
                    : fulfillTransactionPendingActivation(focusedRequest.state, expected, {
                          editor: {
                              binding: { kind: "field" },
                              composition: focusedRequest.composition,
                              continuous: focusedRequest.continuous,
                              draft: { initialText: focusedRequest.initialText },
                              entry: focusedRequest.entry
                          },
                          kind: "editing"
                      });
            if (!fulfilled.ok) {
                if (registrationAuthority != null) {
                    retireRegistrationWakeAuthority(registrationAuthority.token);
                }
                return "stale";
            }
            if (registrationAuthority != null) {
                retireRegistrationWakeAuthority(registrationAuthority.token);
            }
            batch(() => {
                failureAtom.set(null);
                reconciliationFocusAtom.set(null);
                publishInteractionState(fulfilled.value);
            });
            return "focused";
        },
        focusReconciliation: (expectedGeneration) => {
            const request = reconciliationFocusAtom.get();
            if (
                request == null ||
                request.generation !== expectedGeneration ||
                generationAtom.get() !== expectedGeneration
            ) {
                return "stale";
            }
            const registrationAuthority = currentRegistrationWakeAuthority();
            const element = (() => {
                if (request.intent.kind === "gridcell") {
                    return focusableElementAt(request.intent.address, "gridcell");
                }
                if (request.intent.kind === "inspector-heading") return inspectorHeading;
                if (request.intent.kind === "retain-inspector-control") {
                    const activeAddress = activeAddressOf(getInteractionState());
                    return activeAddress == null
                        ? null
                        : retainedInspectorFocusElement(
                              activeAddress.transactionId,
                              request.intent.binding
                          );
                }
                return afterGridElement;
            })();
            if (element == null) {
                if (registrationAuthority != null) {
                    releaseRegistrationWake(registrationAuthority.token);
                }
                return "unregistered";
            }
            if (
                !elementHasGridFocusOwnership(
                    element,
                    request.intent.kind === "gridcell" ? request.intent.address : null,
                    request.retainedFocusOwner
                )
            ) {
                parkExternalFocus();
                return "stale";
            }
            if (request.revealBeforeFocus && typeof element.scrollIntoView === "function") {
                element.scrollIntoView({
                    block: request.revealBlock ?? "center",
                    inline: "nearest"
                });
                if (request.intent.kind === "gridcell") {
                    revealGridcellBelowStickyHeader(element);
                }
            }
            element.focus({ preventScroll: true });
            const focusedRequest = reconciliationFocusAtom.get();
            const currentIntentElement = (() => {
                if (request.intent.kind === "gridcell") {
                    return focusableElementAt(request.intent.address, "gridcell");
                }
                if (request.intent.kind === "inspector-heading") return inspectorHeading;
                if (request.intent.kind === "retain-inspector-control") {
                    const activeAddress = activeAddressOf(getInteractionState());
                    return activeAddress == null
                        ? null
                        : retainedInspectorFocusElement(
                              activeAddress.transactionId,
                              request.intent.binding
                          );
                }
                return afterGridElement;
            })();
            if (
                !element.isConnected ||
                currentIntentElement !== element ||
                element.ownerDocument.activeElement !== element ||
                focusedRequest !== request ||
                generationAtom.get() !== expectedGeneration
            ) {
                if (
                    !elementHasGridFocusOwnership(
                        element,
                        request.intent.kind === "gridcell" ? request.intent.address : null,
                        request.retainedFocusOwner
                    )
                ) {
                    parkExternalFocus();
                } else if (registrationAuthority != null) {
                    releaseRegistrationWake(registrationAuthority.token);
                }
                return "unregistered";
            }
            if (registrationAuthority != null) {
                retireRegistrationWakeAuthority(registrationAuthority.token);
            }
            batch(() => {
                if (request.clearFailureOnFocus) failureAtom.set(null);
                const state = getInteractionState();
                if (state.kind === "inspecting") {
                    if (request.intent.kind === "retain-inspector-control") {
                        engagementAtom.set({
                            focused: {
                                binding: request.intent.binding,
                                kind: "control"
                            },
                            kind: "inspecting"
                        });
                    } else if (request.intent.kind === "inspector-heading") {
                        engagementAtom.set({ focused: { kind: "heading" }, kind: "inspecting" });
                    }
                }
                reconciliationFocusAtom.set(null);
            });
            return "focused";
        },
        abortPendingActivation
    };
    return controller;
}

/** Subscribes a consumer to the controller's narrow derived runtime snapshot. */
export function useTransactionGridControllerSnapshot(
    controller: TransactionGridWorkspaceController
): TransactionGridControllerSnapshot {
    return useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot
    );
}

interface TransactionGridRebaseTestSeam {
    readonly forceProjectionRebase: () => boolean;
    readonly restoreProjection: () => void;
}

declare global {
    interface Window {
        __moneyflowTransactionGridRebase?: TransactionGridRebaseTestSeam;
    }
}

export interface UseTransactionGridControllerOptions {
    readonly controller: TransactionGridWorkspaceController;
    readonly cursor: TransactionCursor;
    readonly isTransactionCanonicallyLive?: (transactionId: TransactionId) => boolean;
    readonly selectableColumnIds: readonly TransactionColumnId[];
    readonly registrationTimeoutMs?: number;
}

/**
 * Coordinates structural projection publication and ordered pending focus effects for one workspace.
 */
export function useTransactionGridController({
    controller,
    cursor,
    isTransactionCanonicallyLive,
    selectableColumnIds,
    registrationTimeoutMs = REGISTRATION_TIMEOUT_MS
}: UseTransactionGridControllerOptions): TransactionGridControllerSnapshot {
    const snapshot = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot
    );
    const columnIdentity = useMemo(() => selectableColumnIds.join("\u0000"), [selectableColumnIds]);

    useLayoutEffect(() => {
        controller.updateProjection(cursor, selectableColumnIds, isTransactionCanonicallyLive);
    }, [columnIdentity, controller, cursor, isTransactionCanonicallyLive, selectableColumnIds]);

    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const rebasedCursor = transactionGridRebaseTestCursor(cursor);
        const seam: TransactionGridRebaseTestSeam = {
            forceProjectionRebase: () => {
                if (rebasedCursor == null) return false;
                controller.updateProjection(
                    rebasedCursor,
                    selectableColumnIds,
                    isTransactionCanonicallyLive
                );
                return true;
            },
            restoreProjection: () => {
                controller.updateProjection(
                    cursor,
                    selectableColumnIds,
                    isTransactionCanonicallyLive
                );
            }
        };
        window.__moneyflowTransactionGridRebase = seam;
        return () => {
            if (window.__moneyflowTransactionGridRebase === seam) {
                delete window.__moneyflowTransactionGridRebase;
            }
        };
    }, [columnIdentity, controller, cursor, isTransactionCanonicallyLive, selectableColumnIds]);

    const pendingIdentity = useMemo(
        () => (snapshot.pending == null ? null : operationIdentity(snapshot.pending.state)),
        [snapshot.pending]
    );

    useLayoutEffect(() => {
        if (pendingIdentity == null || snapshot.pending?.state.phase !== "focus") return;
        controller.focusPendingActivation(pendingIdentity);
    }, [controller, pendingIdentity, snapshot.pending, snapshot.registrationVersion]);

    useLayoutEffect(() => {
        const request = snapshot.reconciliationFocus;
        if (request == null) return;
        controller.focusReconciliation(request.generation);
    }, [controller, snapshot.reconciliationFocus, snapshot.registrationVersion]);

    useEffect(() => {
        if (pendingIdentity == null || snapshot.pending?.state.phase !== "reveal") return;
        const target = snapshot.pending.state.target;
        const remaining = Math.max(0, snapshot.pending.materializationDeadlineAt - Date.now());
        const timeout = window.setTimeout(() => {
            controller.abortPendingActivation(pendingIdentity, {
                address: target,
                kind: "load-failed"
            });
        }, remaining);
        return () => window.clearTimeout(timeout);
    }, [controller, pendingIdentity, snapshot.pending]);

    useEffect(() => {
        if (pendingIdentity == null || snapshot.pending?.state.phase !== "focus") return;
        const target = snapshot.pending.state.target;
        const focusStartedAt = snapshot.pending.focusStartedAt;
        if (focusStartedAt == null) return;
        const remaining = Math.max(0, focusStartedAt + registrationTimeoutMs - Date.now());
        const timeout = window.setTimeout(() => {
            controller.abortPendingActivation(pendingIdentity, {
                address: target,
                kind: "registration-timeout"
            });
        }, remaining);
        return () => window.clearTimeout(timeout);
    }, [controller, pendingIdentity, registrationTimeoutMs, snapshot.pending]);

    return snapshot;
}

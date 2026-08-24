"use client";

import { batch, createAtom, type Atom } from "@tanstack/react-store";
import type { CellSelectionState } from "@tanstack/table-core";
import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";

import type { TransactionCursor } from "@/lib/crdt/transaction-cursor";

import {
    abortTransactionPendingActivation,
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    fulfillTransactionPendingActivation,
    INACTIVE_TRANSACTION_COMPOSITION,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    transactionGridPins,
    type NonEmptyTransactionGridSelection,
    type TransactionEditEntry,
    type TransactionGridAddress,
    type TransactionGridEditorState,
    type TransactionGridEngagedSnapshot,
    type TransactionGridFocusIntent,
    type TransactionGridInteractionState,
    type TransactionGridOperationError,
    type TransactionGridPendingActivationState,
    type TransactionGridPin,
    type TransactionPendingOperationIdentity
} from "../table-model";
import { transactionProjectionFromCursor } from "../table-model/grid-navigation";
import {
    reconcileTransactionGridProjection,
    type TransactionGridReconciliationOutcome
} from "../table-model/grid-reconciliation";
import {
    asTransactionId,
    asTransactionProjectionGeneration,
    nextTransactionProjectionGeneration,
    type TransactionColumnId,
    type TransactionId,
    type TransactionProjectionGeneration
} from "../table-model/ids";

const REGISTRATION_TIMEOUT_MS = 1_000;
const MATERIALIZATION_TIMEOUT_MS = 1_000;
const EMPTY_CELL_SELECTION: CellSelectionState = [];
const EMPTY_PINS: readonly TransactionGridControllerPin[] = [];

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
    readonly intent: Extract<
        TransactionGridFocusIntent,
        { readonly kind: "gridcell" | "after-grid" }
    >;
}

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

type TransactionGridRuntimeEngagement =
    | TransactionGridNavigatingEngagement
    | TransactionGridEditingEngagement;

export type TransactionGridControllerPin =
    | TransactionGridPin
    | { readonly kind: "focus-retention"; readonly transactionId: TransactionId };

export type TransactionCellSelectionAtom = Atom<CellSelectionState>;

/** Creates a writable atom for non-React fixtures; the workspace uses `useCreateAtom` directly. */
export function createTransactionCellSelectionAtom(): TransactionCellSelectionAtom {
    return createAtom<CellSelectionState>(EMPTY_CELL_SELECTION);
}

export interface TransactionGridPendingRequest {
    readonly state: TransactionGridPendingActivationState<unknown>;
    readonly entry: TransactionEditEntry;
    readonly acceptedAt: number;
    readonly resources: TransactionGridActivationResources;
}

type TransactionGridRuntimeInteractionState = Extract<
    TransactionGridInteractionState<unknown>,
    { readonly kind: "idle" | "pending-activation" | "navigating" | "editing" }
>;

export interface TransactionGridControllerSnapshot {
    readonly generation: TransactionProjectionGeneration;
    readonly registrationVersion: number;
    readonly pending: TransactionGridPendingRequest | null;
    readonly reconciliationFocus: TransactionGridReconciliationFocusRequest | null;
    readonly pins: readonly TransactionGridControllerPin[];
    readonly activeTransactionId: string | null;
    readonly focusRetentionTransactionId: TransactionId | null;
    readonly failure: TransactionGridOperationError | null;
    readonly interactionKind: TransactionGridRuntimeInteractionState["kind"];
}

export interface TransactionGridActivationOptions {
    readonly target: TransactionGridAddress;
    readonly entry: TransactionEditEntry;
}

export type TransactionGridFocusElement = HTMLElement;

export interface TransactionGridWorkspaceController {
    readonly cellSelectionAtom: TransactionCellSelectionAtom;
    readonly beginActivation: (
        options: TransactionGridActivationOptions
    ) => TransactionPendingOperationIdentity;
    readonly markRevealApplied: (expected: TransactionPendingOperationIdentity) => boolean;
    readonly registerCell: (
        address: TransactionGridAddress,
        element: TransactionGridFocusElement | null
    ) => void;
    readonly registerRow: (transactionId: TransactionId, element: HTMLElement | null) => void;
    readonly registerAfterGridElement: (element: HTMLElement | null) => void;
    readonly registerScrollElement: (element: HTMLElement | null) => void;
    readonly setHeldWindowState: (start: number, restore: (start: number) => void) => void;
    readonly setFocusedCell: (transactionId: string, columnId: string | null) => void;
    readonly clearCellSelection: () => void;
    readonly clearUserFocus: () => void;
    readonly getInteractionState: () => TransactionGridInteractionState<unknown>;
    readonly getPendingRequest: () => TransactionGridPendingRequest | null;
    readonly getSnapshot: () => TransactionGridControllerSnapshot;
    readonly subscribe: (listener: () => void) => () => void;
    readonly updateProjection: (
        cursor: TransactionCursor,
        selectableColumnIds: readonly TransactionColumnId[]
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
    return {
        continuous: engagement?.continuous ?? NO_TRANSACTION_CONTINUOUS_EDIT,
        kind: "navigating",
        selection: canonical
    };
}

function engagementOf(
    state: TransactionGridInteractionState<unknown>
): TransactionGridRuntimeEngagement | null {
    if (state.kind === "editing") return { editor: state.editor, kind: "editing" };
    if (state.kind === "navigating") {
        return { continuous: state.continuous, kind: "navigating" };
    }
    if (state.kind === "idle" || state.kind === "pending-activation") return null;
    return { continuous: NO_TRANSACTION_CONTINUOUS_EDIT, kind: "navigating" };
}

function controllerPins(
    state: TransactionGridRuntimeInteractionState,
    focusedTransactionId: TransactionId | null
): readonly TransactionGridControllerPin[] {
    const statePins = state.kind === "idle" ? EMPTY_PINS : transactionGridPins(state);
    if (focusedTransactionId == null || statePins.some((pin) => pin.kind === "active-origin")) {
        return statePins;
    }
    const focusPin: TransactionGridControllerPin = {
        kind: "focus-retention",
        transactionId: focusedTransactionId
    };
    return state.kind === "pending-activation"
        ? [focusPin, ...statePins.filter((pin) => pin.kind === "pending-target")]
        : [focusPin];
}

function engagedSnapshot(
    state: TransactionGridInteractionState<unknown>
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
    return null;
}

/** Builds one stable workspace controller around the workspace-owned external selection atom. */
export function createTransactionGridWorkspaceController(
    cellSelectionAtom: TransactionCellSelectionAtom
): TransactionGridWorkspaceController {
    const pendingAtom = createAtom<TransactionGridPendingRequest | null>(null);
    const generationAtom = createAtom<TransactionProjectionGeneration>(
        asTransactionProjectionGeneration(0)
    );
    const registrationVersionAtom = createAtom(0);
    const failureAtom = createAtom<TransactionGridOperationError | null>(null);
    const engagementAtom = createAtom<TransactionGridRuntimeEngagement | null>(null);
    const focusedTransactionAtom = createAtom<TransactionId | null>(null);
    const reconciliationFocusAtom = createAtom<TransactionGridReconciliationFocusRequest | null>(
        null
    );
    const registrations = new Map<string, TransactionGridFocusElement>();
    const rowRegistrations = new Map<TransactionId, HTMLElement>();
    let afterGridElement: HTMLElement | null = null;
    let scrollElement: HTMLElement | null = null;
    let heldWindowStart: number | null = null;
    let restoreHeldWindowStart: ((start: number) => void) | null = null;
    let selectableColumnIds: readonly TransactionColumnId[] = [];
    let currentCursor: TransactionCursor | null = null;
    let currentProjection: ReturnType<typeof transactionProjectionFromCursor> | null = null;
    let nextCommandNumber = 1;

    const getInteractionState = (): TransactionGridRuntimeInteractionState =>
        interactionStateOf(
            pendingAtom.get()?.state ?? null,
            cellSelectionAtom.get(),
            selectableColumnIds,
            engagementAtom.get()
        );

    const snapshotAtom = createAtom<TransactionGridControllerSnapshot>(
        () => {
            const registrationVersion = registrationVersionAtom.get();
            const pending = pendingAtom.get();
            const state = interactionStateOf(
                pending?.state ?? null,
                cellSelectionAtom.get(),
                selectableColumnIds,
                engagementAtom.get()
            );
            const pins = controllerPins(state, focusedTransactionAtom.get());
            const activePin = pins.find((pin) => pin.kind === "active-origin");
            const focusRetentionPin = pins.find((pin) => pin.kind === "focus-retention");
            return {
                activeTransactionId: activePin?.transactionId ?? null,
                failure: failureAtom.get(),
                focusRetentionTransactionId: focusRetentionPin?.transactionId ?? null,
                generation: generationAtom.get(),
                interactionKind: state.kind,
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
                first.activeTransactionId === second.activeTransactionId &&
                first.focusRetentionTransactionId === second.focusRetentionTransactionId &&
                first.failure === second.failure &&
                first.interactionKind === second.interactionKind &&
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

    const publishInteractionState = (state: TransactionGridInteractionState<unknown>): void => {
        if (state.kind === "pending-activation") {
            const previous = pendingAtom.get();
            pendingAtom.set({
                acceptedAt: previous?.acceptedAt ?? Date.now(),
                entry: previous?.entry ?? "full",
                resources: previous?.resources ?? captureActivationResources(),
                state
            });
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
        address: TransactionGridAddress
    ): TransactionGridFocusElement | null => {
        const exact = registrations.get(cellRegistrationKey(address));
        if (exact != null) return exact;
        const row = rowRegistrations.get(address.transactionId);
        if (row == null) return null;
        const cell = [...row.querySelectorAll<HTMLElement>("[data-cell]")].find(
            (candidate) => candidate.dataset.cell === address.columnId
        );
        if (cell == null) return null;
        if (cell.matches("input, button, select, textarea, [contenteditable='true'], [tabindex]")) {
            return cell;
        }
        return cell.querySelector<HTMLElement>(
            "input:not(:disabled), button:not(:disabled), select:not(:disabled), " +
                "textarea:not(:disabled), [contenteditable='true'], [tabindex]:not([tabindex='-1'])"
        );
    };

    const reconciliationFocusRequest = (
        focus: TransactionGridFocusIntent,
        generation: TransactionProjectionGeneration
    ): TransactionGridReconciliationFocusRequest | null =>
        focus.kind === "gridcell" || focus.kind === "after-grid"
            ? { generation, intent: focus }
            : null;

    const abortPendingActivation = (
        expected: TransactionPendingOperationIdentity,
        error: TransactionGridOperationError
    ): boolean => {
        const request = pendingAtom.get();
        const current = getInteractionState();
        const aborted = abortTransactionPendingActivation(current, expected);
        if (request == null || !aborted.ok) return false;
        batch(() => {
            failureAtom.set(error);
            reconciliationFocusAtom.set(null);
            if ("focusOwner" in aborted.value) publishInteractionState(aborted.value.state);
            else publishInteractionState(aborted.value);
            restoreActivationResources(request.resources);
        });
        return true;
    };

    const clearUserFocus = (): void => {
        batch(() => {
            pendingAtom.set(null);
            reconciliationFocusAtom.set(null);
            failureAtom.set(null);
            engagementAtom.set(null);
            focusedTransactionAtom.set(null);
            cellSelectionAtom.set(EMPTY_CELL_SELECTION);
        });
    };

    const controller: TransactionGridWorkspaceController = {
        cellSelectionAtom,
        beginActivation: ({ entry, target }) => {
            const current = getInteractionState();
            const acceptedCommandId = asTransactionGridCommandId(
                `transaction-grid-command-${String(nextCommandNumber)}`
            );
            nextCommandNumber += 1;
            const projectionGeneration = generationAtom.get();
            const origin = engagedSnapshot(current);
            const resources = captureActivationResources();
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
                engagementAtom.set(null);
                cellSelectionAtom.set(EMPTY_CELL_SELECTION);
                pendingAtom.set({ acceptedAt: Date.now(), entry, resources, state: pending });
            });
            return { acceptedCommandId, projectionGeneration };
        },
        markRevealApplied: (expected) => {
            const request = pendingAtom.get();
            if (request == null || !sameOperation(request.state, expected)) return false;
            pendingAtom.set({
                ...request,
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
            if (element == null) registrations.delete(key);
            else registrations.set(key, element);
            registrationVersionAtom.set((version) => version + 1);
        },
        registerRow: (transactionId, element) => {
            if (element == null) rowRegistrations.delete(transactionId);
            else rowRegistrations.set(transactionId, element);
            registrationVersionAtom.set((version) => version + 1);
        },
        registerAfterGridElement: (element) => {
            afterGridElement = element;
            registrationVersionAtom.set((version) => version + 1);
        },
        registerScrollElement: (element) => {
            scrollElement = element;
        },
        setHeldWindowState: (start, restore) => {
            heldWindowStart = start;
            restoreHeldWindowStart = restore;
        },
        setFocusedCell: (transactionId, columnId) => {
            const canonicalColumnId =
                columnId == null ? undefined : findColumnId(columnId, selectableColumnIds);
            batch(() => {
                pendingAtom.set(null);
                reconciliationFocusAtom.set(null);
                failureAtom.set(null);
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
        },
        clearCellSelection: clearUserFocus,
        clearUserFocus,
        getInteractionState,
        getPendingRequest: () => pendingAtom.get(),
        getSnapshot: () => snapshotAtom.get(),
        subscribe: (listener) => {
            const subscription = snapshotAtom.subscribe(listener);
            return () => subscription.unsubscribe();
        },
        updateProjection: (cursor, nextColumnIds) => {
            const previousCursor = currentCursor;
            const previousProjection = currentProjection;
            const previousState = getInteractionState();
            const nextSelectableColumnIds = [...nextColumnIds];
            const structureChanged =
                previousCursor != null &&
                (!sameCursorOrder(previousCursor, cursor) ||
                    !sameColumnOrder(selectableColumnIds, nextSelectableColumnIds));

            selectableColumnIds = nextSelectableColumnIds;
            currentCursor = cursor;
            if (previousProjection == null || previousCursor == null) {
                currentProjection = transactionProjectionFromCursor({
                    currentGeneration: () => generationAtom.get(),
                    cursor,
                    generation: generationAtom.get(),
                    selectableColumnIds: nextSelectableColumnIds
                });
                return null;
            }
            if (!structureChanged) {
                currentProjection = transactionProjectionFromCursor({
                    currentGeneration: () => generationAtom.get(),
                    cursor,
                    generation: generationAtom.get(),
                    selectableColumnIds: nextSelectableColumnIds
                });
                return null;
            }

            const nextGeneration = nextTransactionProjectionGeneration(generationAtom.get());
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
                outcome =
                    previousState.kind === "idle" || previousState.kind === "pending-activation"
                        ? reconcileTransactionGridProjection({
                              nextProjection,
                              previousProjection,
                              previousState
                          })
                        : reconcileTransactionGridProjection({
                              focusOwner: { kind: "grid" },
                              nextProjection,
                              previousProjection,
                              previousState
                          });
                if (outcome.ok) {
                    publishInteractionState(outcome.value.state);
                    reconciliationFocusAtom.set(
                        reconciliationFocusRequest(outcome.value.focus, nextGeneration)
                    );
                } else {
                    failureAtom.set(outcome.error);
                    pendingAtom.set(null);
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
            const element = focusableElementAt(request.state.target);
            if (element == null) return "unregistered";
            element.focus({ preventScroll: true });
            if (element.ownerDocument.activeElement !== element) {
                abortPendingActivation(expected, {
                    address: request.state.target,
                    kind: "focus-failed"
                });
                return "stale";
            }
            const editor: TransactionGridEditorState<unknown> = {
                binding: { kind: "field" },
                composition: INACTIVE_TRANSACTION_COMPOSITION,
                continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                draft: undefined,
                entry: request.entry
            };
            const fulfilled = fulfillTransactionPendingActivation(request.state, expected, {
                editor,
                kind: "editing"
            });
            if (!fulfilled.ok) return "stale";
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
            const element =
                request.intent.kind === "gridcell"
                    ? focusableElementAt(request.intent.address)
                    : afterGridElement;
            if (element == null) return "unregistered";
            element.focus({ preventScroll: true });
            if (element.ownerDocument.activeElement !== element) return "unregistered";
            batch(() => {
                failureAtom.set(null);
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

export interface UseTransactionGridControllerOptions {
    readonly controller: TransactionGridWorkspaceController;
    readonly cursor: TransactionCursor;
    readonly selectableColumnIds: readonly TransactionColumnId[];
    readonly materializationTimeoutMs?: number;
    readonly registrationTimeoutMs?: number;
}

/**
 * Coordinates structural projection publication and ordered pending focus effects for one workspace.
 */
export function useTransactionGridController({
    controller,
    cursor,
    selectableColumnIds,
    materializationTimeoutMs = MATERIALIZATION_TIMEOUT_MS,
    registrationTimeoutMs = REGISTRATION_TIMEOUT_MS
}: UseTransactionGridControllerOptions): TransactionGridControllerSnapshot {
    const snapshot = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot
    );
    const columnIdentity = useMemo(() => selectableColumnIds.join("\u0000"), [selectableColumnIds]);

    useLayoutEffect(() => {
        controller.updateProjection(cursor, selectableColumnIds);
    }, [columnIdentity, controller, cursor, selectableColumnIds]);

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
        const remaining = Math.max(
            0,
            snapshot.pending.acceptedAt + materializationTimeoutMs - Date.now()
        );
        const timeout = window.setTimeout(() => {
            controller.abortPendingActivation(pendingIdentity, {
                address: target,
                kind: "load-failed"
            });
        }, remaining);
        return () => window.clearTimeout(timeout);
    }, [controller, materializationTimeoutMs, pendingIdentity, snapshot.pending]);

    useEffect(() => {
        if (pendingIdentity == null || snapshot.pending?.state.phase !== "focus") return;
        const target = snapshot.pending.state.target;
        const timeout = window.setTimeout(() => {
            controller.abortPendingActivation(pendingIdentity, {
                address: target,
                kind: "registration-timeout"
            });
        }, registrationTimeoutMs);
        return () => window.clearTimeout(timeout);
    }, [controller, pendingIdentity, registrationTimeoutMs, snapshot.pending]);

    return snapshot;
}

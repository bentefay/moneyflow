"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { cn } from "@/lib/utils";

import type {
    TransactionGridCellCommandEffect,
    TransactionGridWorkspaceController
} from "../hooks/useTransactionGridController";
import {
    activeTransactionGridAddress,
    asTransactionCompositionSequence,
    transactionGridCompositionStartIntent,
    transactionGridKeyContext,
    transactionGridKeyIntent,
    type TransactionColumnInteractionMeta,
    type TransactionEditEntry,
    type TransactionGridAddress,
    type TransactionGridKeyIntent,
    type TransactionSelectionVisibility,
    type TransactionTableCell
} from "../table-model";
import {
    TRANSACTION_GRIDCELL_CHROME,
    TRANSACTION_GRIDCELL_FOCUS_CHROME,
    TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME,
    TRANSACTION_GRIDCELL_VISIBLE_SELECTION_CHROME
} from "./cell-chrome";
import {
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle
} from "./editor-lifecycle";

const INTERACTIVE_DESCENDANT =
    "a[href], button, input, select, textarea, [contenteditable='true'], [role='button'], " +
    "[role='checkbox'], [role='combobox'], [role='listbox'], [role='menuitem'], " +
    "[data-gridcell-interactive]";

export interface TransactionGridCellProps {
    /** Branded stable row and column identity owned by the controller projection. */
    readonly address: TransactionGridAddress;
    /** The real TanStack cell whose external atom owns selection and roving focus state. */
    readonly cell: TransactionTableCell;
    /** The workspace's sole interaction and focus coordinator. */
    readonly controller: TransactionGridWorkspaceController;
    /** Immutable capabilities declared by this visible column. */
    readonly interaction: TransactionColumnInteractionMeta;
    /** Absolute 1-based visible-column position in the logical grid. */
    readonly ariaColumnIndex: number;
    /** Whether the row subscription projects this cell inside the final positive selection. */
    readonly selected: boolean;
    /** Typed controller policy for visible, inspector-muted, or parked selection treatment. */
    readonly selectionVisibility: TransactionSelectionVisibility;
    /** Current runtime owner, used only to project the idle entry and retained tab stops. */
    readonly interactionKind:
        | "idle"
        | "pending-activation"
        | "parked"
        | "navigating"
        | "inspecting"
        | "editing"
        | "interacting";
    /** The one mounted cell that enters the roving set before first grid engagement. */
    readonly isInitialTabStop: boolean;
    /** Whether this cell is the retained active anchor while the selection is parked. */
    readonly isParkedTabStop: boolean;
    /** Layout-neutral full-cell presence outline for a peer editing this field. */
    readonly presenceColor?: string;
    /** Current visible-row distance supplied by the virtualizer for PageUp/PageDown. */
    readonly viewportRowDistance: number;
    /** Resting display branch. Only this branch is mounted when the cell is not editing. */
    readonly display: React.ReactNode;
    /** Stable content that must survive swaps between the display and editor branches. */
    readonly adornment?: React.ReactNode;
    /** Accessible provenance or context for the outer gridcell. */
    readonly ariaDescription?: string;
    /** Typed editor branch supplied by later editor-family slices. */
    readonly editor?: React.ReactNode;
    /** Whether to render the editor branch. */
    readonly showEditor?: boolean;
    /** Full/quick entry intent applied at the real editor's focus and value boundary. */
    readonly editorEntry?: TransactionEditEntry;
    /** Completed printable quick-entry text applied once after the real editor receives focus. */
    readonly editorInitialText?: string;
    /** Temporary marker for a legacy always-live descendant retained until its editor slice. */
    readonly legacyInteractive?: boolean;
    /** Full/quick edit request seam. */
    readonly onEditRequest?: (entry: TransactionEditEntry, initialText?: string) => void;
    /** Direct activation request seam for checkbox/actions cells. */
    readonly onActivate?: (activation: "checkbox" | "inspector") => void;
    /** Additional layout classes; the surface itself adds no box-model geometry. */
    readonly className?: string;
}

function interactiveDescendantTarget(
    currentTarget: HTMLElement,
    target: EventTarget,
    legacyInteractive: boolean
): HTMLElement | null {
    if (!(target instanceof Element) || target === currentTarget) return null;
    const semanticTarget = target.closest<HTMLElement>(INTERACTIVE_DESCENDANT);
    // React portal events follow the component tree even though the popup is outside this cell's DOM.
    if (!currentTarget.contains(target)) {
        return semanticTarget ?? (target instanceof HTMLElement ? target : target.parentElement);
    }
    if (!legacyInteractive) return semanticTarget;
    return semanticTarget ?? (target instanceof HTMLElement ? target : target.parentElement);
}

function isInteractiveDescendant(
    currentTarget: HTMLElement,
    target: EventTarget,
    legacyInteractive: boolean
): boolean {
    return interactiveDescendantTarget(currentTarget, target, legacyInteractive) != null;
}

function isEditorOwnedTarget(
    cell: HTMLElement,
    controller: TransactionGridWorkspaceController,
    target: EventTarget | null,
    address: TransactionGridAddress
): boolean {
    return (
        (target instanceof Node && cell.contains(target)) ||
        controller.isRegisteredEditorPortalTarget(address, target)
    );
}

function pointerFocusTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    return (
        target.closest<HTMLElement>(INTERACTIVE_DESCENDANT) ??
        target.closest<HTMLElement>('[role="gridcell"]') ??
        (target instanceof HTMLElement ? target : target.parentElement)
    );
}

function transactionGridCellTarget(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element
        ? target.closest<HTMLElement>('[role="gridcell"][data-cell-transaction-id][data-column-id]')
        : null;
}

interface BlockedPointerGesture {
    readonly pointerId: number;
    readonly released: boolean;
    readonly releaseTimer: number | null;
}

type EditorExitValidation = "accepted" | "not-owned" | "rejected" | "retained";

function focusLegacyEditor(cell: HTMLElement): boolean {
    const activation = cell.querySelector<HTMLElement>("[data-legacy-edit-activation]");
    const editor =
        activation ??
        cell.querySelector<HTMLElement>(
            "input:not(:disabled), textarea:not(:disabled), button:not(:disabled), " +
                "select:not(:disabled), [contenteditable='true']"
        );
    if (editor == null) return false;
    editor.focus({ preventScroll: true });
    if (activation != null) activation.click();
    if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement)
        editor.select();
    return editor.ownerDocument.activeElement === editor;
}

function editorTarget(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>(
        "[data-grid-editor-target], [data-legacy-edit-activation], input:not(:disabled), " +
            "textarea:not(:disabled), button:not(:disabled), select:not(:disabled), " +
            "[contenteditable='true']"
    );
}

function isEditorLifecycleIntent(intent: TransactionGridKeyIntent): intent is Extract<
    TransactionGridKeyIntent,
    {
        readonly kind:
            | "cancel-edit"
            | "cancel-popup-edit"
            | "commit-and-move"
            | "commit-and-extend"
            | "commit-and-move-to"
            | "commit-and-extend-to"
            | "traverse-tab";
    }
> {
    return (
        intent.kind === "cancel-edit" ||
        intent.kind === "cancel-popup-edit" ||
        intent.kind === "commit-and-move" ||
        intent.kind === "commit-and-extend" ||
        intent.kind === "commit-and-move-to" ||
        intent.kind === "commit-and-extend-to" ||
        intent.kind === "traverse-tab"
    );
}

function isNestedTransactionGridWidget(target: EventTarget | null): boolean {
    return (
        target instanceof Element && target.closest("[data-transaction-grid-nested-widget]") != null
    );
}

function isAltArrowEvent(event: {
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly key: string;
    readonly metaKey: boolean;
}): boolean {
    return (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === "ArrowDown" ||
            event.key === "ArrowLeft" ||
            event.key === "ArrowRight" ||
            event.key === "ArrowUp")
    );
}

function editorText(element: HTMLElement): string | null {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.value
        : null;
}

function insertEditorText(element: HTMLElement, text: string): void {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    const nextValue = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
    replaceEditorText(element, nextValue);
    const caret = start + text.length;
    element.setSelectionRange(caret, caret);
}

function replaceEditorText(element: HTMLElement, text: string): void {
    if (element instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(element, text);
    } else if (element instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(element, text);
    } else {
        return;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
}

function placeEditorSelection(element: HTMLElement, entry: TransactionEditEntry): void {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
    if (entry === "full") {
        element.select();
        return;
    }
    const caret = element.value.length;
    element.setSelectionRange(caret, caret);
}

function editorInitializationKey(
    entry: TransactionEditEntry,
    initialText: string | undefined
): string {
    return initialText == null ? `${entry}:preserve` : `${entry}:replace:${initialText}`;
}

/**
 * Shared focusable surface for every visible transaction-grid column.
 *
 * It owns grid semantics, registration, selection paint and background gestures. Interactive legacy
 * descendants opt out, so their existing editor/activation behavior remains usable until the slice
 * that supplies a true display/editor pair and typed lifecycle.
 */
export function TransactionGridCell({
    address,
    adornment,
    ariaColumnIndex,
    ariaDescription,
    cell,
    className,
    controller,
    display,
    editor,
    editorEntry,
    editorInitialText,
    interaction,
    interactionKind,
    isInitialTabStop,
    isParkedTabStop,
    legacyInteractive = false,
    onActivate,
    onEditRequest,
    presenceColor,
    selected,
    selectionVisibility,
    showEditor = false,
    viewportRowDistance
}: TransactionGridCellProps) {
    const suppressNextFocus = useRef(false);
    const cellElement = useRef<HTMLDivElement | null>(null);
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const blockedPointerGestures = useRef(new Map<number, BlockedPointerGesture>());
    const ownedPortalPointerGestures = useRef(new Map<number, BlockedPointerGesture>());
    const appliedEditorInitialization = useRef<string | null>(null);
    const editorLifecycle = useRef<TransactionGridEditorLifecycle | null>(null);
    const suppressEditorBlur = useRef(false);
    const nextCompositionSequence = useRef(0);
    const activeCompositionSequence = useRef<ReturnType<
        typeof asTransactionCompositionSequence
    > | null>(null);
    const compositionTarget = useRef<HTMLElement | null>(null);
    const compositionValueBefore = useRef<string | null>(null);
    const [legacyDescendantFocused, setLegacyDescendantFocused] = useState(false);
    const columnId = address.columnId;
    const transactionId = address.transactionId;
    const editorAddress = useMemo(() => ({ columnId, transactionId }), [columnId, transactionId]);
    const isControllerGridCellTarget = useCallback(
        (target: EventTarget | null): boolean => {
            const targetCell = transactionGridCellTarget(target);
            return targetCell != null && controller.isRegisteredCellElement(targetCell);
        },
        [controller]
    );
    const registerCell = useCallback(
        (element: HTMLDivElement | null) => {
            cellElement.current = element;
            if (element == null) return;
            const unregister = controller.registerCell(editorAddress, element);
            return () => {
                if (cellElement.current === element) cellElement.current = null;
                unregister();
            };
        },
        [controller, editorAddress]
    );
    const registerEditorPortal = useCallback(
        (element: HTMLElement | null) => {
            if (element == null) return;
            return controller.registerEditorPortal(editorAddress, element);
        },
        [controller, editorAddress]
    );
    const isEditorPortalTargetOwned = useCallback(
        (target: EventTarget | null) =>
            controller.isRegisteredEditorPortalTarget(editorAddress, target),
        [controller, editorAddress]
    );
    const registerEditorLifecycle = useCallback(
        (lifecycle: TransactionGridEditorLifecycle) => {
            editorLifecycle.current = lifecycle;
            if (lifecycle.automation != null) {
                controller.publishAutomationEditorEntry(editorAddress, lifecycle.automation);
            }
            return () => {
                if (editorLifecycle.current === lifecycle) editorLifecycle.current = null;
            };
        },
        [controller, editorAddress]
    );
    const registerEditorContainer = useCallback(
        (container: HTMLDivElement | null) => {
            if (container == null) {
                editorContainer.current = null;
                controller.registerEditor({ columnId, transactionId }, null);
                return;
            }
            editorContainer.current = container;
            const target = editorTarget(container);
            if (target == null) {
                controller.registerEditor({ columnId, transactionId }, null);
                return;
            }
            const unregister = controller.registerEditor({ columnId, transactionId }, target);
            if (activeCompositionSequence.current != null && compositionTarget.current == null) {
                compositionTarget.current = target;
                compositionValueBefore.current = editorText(target);
            }
            if (editorEntry != null) {
                const initializationKey = editorInitializationKey(editorEntry, editorInitialText);
                if (appliedEditorInitialization.current !== initializationKey) {
                    appliedEditorInitialization.current = initializationKey;
                    queueMicrotask(() => {
                        if (!target.isConnected) return;
                        if (editorInitialText != null) replaceEditorText(target, editorInitialText);
                        // Editor focus handlers may queue their own legacy selection. Run once more after them
                        // so the controller's full/quick intent is the final selection authority.
                        queueMicrotask(() => {
                            if (target.isConnected) placeEditorSelection(target, editorEntry);
                        });
                    });
                }
            }
            return () => {
                if (editorContainer.current === container) editorContainer.current = null;
                unregister();
            };
        },
        [columnId, controller, editorEntry, editorInitialText, transactionId]
    );

    useEffect(() => {
        if (!showEditor) appliedEditorInitialization.current = null;
    }, [showEditor]);

    const requestEffect = useCallback(
        (element: HTMLElement, effect: TransactionGridCellCommandEffect): boolean => {
            if (effect.kind === "native") return false;
            if (effect.kind === "handled") return true;
            if (effect.kind === "activate") {
                if (onActivate != null) {
                    onActivate(effect.activation);
                    return true;
                }
                return legacyInteractive && focusLegacyEditor(element);
            }
            if (onEditRequest != null) {
                onEditRequest(effect.entry, effect.initialText);
                return true;
            }
            if (!legacyInteractive) {
                controller.beginActivation({
                    entry: effect.entry,
                    initialText: effect.initialText,
                    target: address
                });
                return true;
            }
            return effect.entry === "full" && focusLegacyEditor(element);
        },
        [address, controller, legacyInteractive, onActivate, onEditRequest]
    );

    const clearBlockedPointerGesture = useCallback((pointerId?: number) => {
        const gestures = blockedPointerGestures.current;
        const view = cellElement.current?.ownerDocument.defaultView;
        const clearGesture = (gesture: BlockedPointerGesture): void => {
            if (gesture.releaseTimer != null && view != null) {
                view.clearTimeout(gesture.releaseTimer);
            }
            gestures.delete(gesture.pointerId);
        };
        if (pointerId != null) {
            const gesture = gestures.get(pointerId);
            if (gesture != null) clearGesture(gesture);
            return;
        }
        for (const gesture of gestures.values()) clearGesture(gesture);
    }, []);

    const clearOwnedPortalPointerGesture = useCallback((pointerId?: number) => {
        const gestures = ownedPortalPointerGestures.current;
        const view = cellElement.current?.ownerDocument.defaultView;
        const clearGesture = (gesture: BlockedPointerGesture): void => {
            if (gesture.releaseTimer != null && view != null) {
                view.clearTimeout(gesture.releaseTimer);
            }
            gestures.delete(gesture.pointerId);
        };
        if (pointerId != null) {
            const gesture = gestures.get(pointerId);
            if (gesture != null) clearGesture(gesture);
            return;
        }
        for (const gesture of gestures.values()) clearGesture(gesture);
    }, []);

    const publishAutomationEditorCommit = useCallback(
        (result: TransactionGridEditorCommitResult): void => {
            // The destination cannot publish until the inspector has registered this exact proposal.
            flushSync(() => controller.publishAutomationEditorCommit(editorAddress, result));
        },
        [controller, editorAddress]
    );

    const validateEditorExit = useCallback((): EditorExitValidation => {
        const state = controller.getInteractionState();
        if (
            state.kind !== "editing" &&
            !(state.kind === "interacting" && state.owner === "grid-editor")
        ) {
            return "not-owned";
        }
        const activeEditorAddress = activeTransactionGridAddress(state.selection);
        if (
            activeEditorAddress.transactionId !== editorAddress.transactionId ||
            activeEditorAddress.columnId !== editorAddress.columnId
        ) {
            return "not-owned";
        }
        const lifecycle = editorLifecycle.current;
        if (lifecycle == null) return "not-owned";
        const committed = lifecycle.commit();
        publishAutomationEditorCommit(committed);
        if (!committed.ok) return "rejected";
        const stateAfterCommit = controller.getInteractionState();
        if (stateAfterCommit.kind === "interacting") {
            const editorAfterCommit = activeTransactionGridAddress(stateAfterCommit.selection);
            const popupChanged =
                state.kind === "editing" ||
                (state.kind === "interacting" && state.popup !== stateAfterCommit.popup);
            if (
                popupChanged &&
                editorAfterCommit.transactionId === editorAddress.transactionId &&
                editorAfterCommit.columnId === editorAddress.columnId
            ) {
                return "retained";
            }
        }
        if (state.kind === "interacting") {
            controller.setEditorInteraction(editorAddress, state.popup, false);
        }
        controller.finishEditing(editorAddress);
        return "accepted";
    }, [controller, editorAddress, publishAutomationEditorCommit]);

    const focusRetainedEditor = useCallback(() => {
        queueMicrotask(() => {
            const cell = cellElement.current;
            const container = editorContainer.current;
            if (cell == null || container == null) return;
            const active = cell.ownerDocument.activeElement;
            if (active != null && isEditorOwnedTarget(cell, controller, active, editorAddress))
                return;
            editorTarget(container)?.focus({ preventScroll: true });
        });
    }, [controller, editorAddress]);

    const publishNativeBlurCommit = useCallback(
        (result: TransactionGridEditorCommitResult, relatedTarget: EventTarget | null): boolean => {
            if (suppressEditorBlur.current) return true;
            const state = controller.getInteractionState();
            if (state.kind !== "editing") {
                return state.kind === "interacting" && state.owner === "grid-editor";
            }
            const activeEditor = activeTransactionGridAddress(state.selection);
            if (
                activeEditor.transactionId !== editorAddress.transactionId ||
                activeEditor.columnId !== editorAddress.columnId
            ) {
                return false;
            }
            const cell = cellElement.current;
            if (
                cell != null &&
                isEditorOwnedTarget(cell, controller, relatedTarget, editorAddress)
            ) {
                return true;
            }
            publishAutomationEditorCommit(result);
            if (!result.ok) {
                focusRetainedEditor();
                return true;
            }
            controller.finishEditing(editorAddress);
            return true;
        },
        [controller, editorAddress, focusRetainedEditor, publishAutomationEditorCommit]
    );

    const validateExternalEditorExit = useCallback(
        (cell: HTMLElement, target: EventTarget | null): EditorExitValidation => {
            const activeBefore = cell.ownerDocument.activeElement;
            const lifecycleBeforeFocus = editorLifecycle.current;
            if (lifecycleBeforeFocus?.externalExitValidation === "blur") {
                lifecycleBeforeFocus.beginExternalExitValidation();
            }
            pointerFocusTarget(target)?.focus({ preventScroll: true });
            if (cell.ownerDocument.activeElement === activeBefore) return validateEditorExit();
            const stateAfter = controller.getInteractionState();
            const editorAfter =
                stateAfter.kind === "editing" ||
                (stateAfter.kind === "interacting" && stateAfter.owner === "grid-editor")
                    ? activeTransactionGridAddress(stateAfter.selection)
                    : null;
            const sameEditorAddress =
                editorAfter?.transactionId === editorAddress.transactionId &&
                editorAfter.columnId === editorAddress.columnId;
            if (!sameEditorAddress) return "accepted";
            if (stateAfter.kind === "interacting") return "retained";
            if (lifecycleBeforeFocus?.externalExitValidation !== "blur") {
                return validateEditorExit();
            }
            const blurValidation = lifecycleBeforeFocus.readExternalExitValidation();
            if (blurValidation == null) return "rejected";
            publishAutomationEditorCommit(blurValidation);
            if (!blurValidation.ok) return "rejected";
            controller.finishEditing(editorAddress);
            return "accepted";
        },
        [controller, editorAddress, publishAutomationEditorCommit, validateEditorExit]
    );

    const validateInternalEditorExit = useCallback(
        (target: EventTarget | null): EditorExitValidation => {
            suppressEditorBlur.current = true;
            const validation = validateEditorExit();
            if (validation !== "accepted") {
                suppressEditorBlur.current = false;
                return validation;
            }
            pointerFocusTarget(target)?.focus({ preventScroll: true });
            queueMicrotask(() => {
                suppressEditorBlur.current = false;
            });
            return validation;
        },
        [validateEditorExit]
    );

    const handleDocumentPointerDown = useCallback(
        (event: PointerEvent) => {
            clearBlockedPointerGesture(event.pointerId);
            clearOwnedPortalPointerGesture(event.pointerId);
            if (event.button !== 0) return;
            const cell = cellElement.current;
            if (cell == null) return;
            if (isEditorOwnedTarget(cell, controller, event.target, editorAddress)) {
                if (controller.isRegisteredEditorPortalTarget(editorAddress, event.target)) {
                    ownedPortalPointerGestures.current.set(event.pointerId, {
                        pointerId: event.pointerId,
                        released: false,
                        releaseTimer: null
                    });
                }
                return;
            }
            const stateBefore = controller.getInteractionState();
            if (
                stateBefore.kind !== "editing" &&
                !(stateBefore.kind === "interacting" && stateBefore.owner === "grid-editor")
            ) {
                return;
            }
            const editorBefore = activeTransactionGridAddress(stateBefore.selection);
            if (
                editorBefore.transactionId !== editorAddress.transactionId ||
                editorBefore.columnId !== editorAddress.columnId
            ) {
                return;
            }
            const targetInsideGrid = isControllerGridCellTarget(event.target);
            const validation =
                targetInsideGrid || controller.isRegisteredInspectorOwnedTarget(event.target)
                    ? validateInternalEditorExit(event.target)
                    : validateExternalEditorExit(cell, event.target);
            if (validation === "retained") {
                blockedPointerGestures.current.set(event.pointerId, {
                    pointerId: event.pointerId,
                    released: false,
                    releaseTimer: null
                });
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            if (validation !== "rejected") return;
            blockedPointerGestures.current.set(event.pointerId, {
                pointerId: event.pointerId,
                released: false,
                releaseTimer: null
            });
            event.preventDefault();
            event.stopImmediatePropagation();
            const container = editorContainer.current;
            if (container != null) {
                editorTarget(container)?.focus({ preventScroll: true });
            }
            focusRetainedEditor();
        },
        [
            clearBlockedPointerGesture,
            clearOwnedPortalPointerGesture,
            controller,
            editorAddress,
            focusRetainedEditor,
            isControllerGridCellTarget,
            validateExternalEditorExit,
            validateInternalEditorExit
        ]
    );

    const handleDocumentClick = useCallback(
        (event: MouseEvent) => {
            const ownedPortalGesture =
                [...ownedPortalPointerGestures.current.values()].find(
                    (gesture) => gesture.released
                ) ?? ownedPortalPointerGestures.current.values().next().value;
            if (ownedPortalGesture != null) {
                queueMicrotask(() => clearOwnedPortalPointerGesture(ownedPortalGesture.pointerId));
                return;
            }
            const blockedGesture =
                [...blockedPointerGestures.current.values()].find((gesture) => gesture.released) ??
                blockedPointerGestures.current.values().next().value;
            if (blockedGesture != null) {
                clearBlockedPointerGesture(blockedGesture.pointerId);
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            const cell = cellElement.current;
            if (cell == null || isEditorOwnedTarget(cell, controller, event.target, editorAddress))
                return;
            const validation =
                isControllerGridCellTarget(event.target) ||
                controller.isRegisteredInspectorOwnedTarget(event.target)
                    ? validateInternalEditorExit(event.target)
                    : validateExternalEditorExit(cell, event.target);
            if (validation !== "rejected" && validation !== "retained") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (validation === "rejected") focusRetainedEditor();
        },
        [
            clearBlockedPointerGesture,
            clearOwnedPortalPointerGesture,
            controller,
            editorAddress,
            focusRetainedEditor,
            isControllerGridCellTarget,
            validateExternalEditorExit,
            validateInternalEditorExit
        ]
    );

    const handleDocumentPointerCancel = useCallback(
        (event: PointerEvent) => {
            clearBlockedPointerGesture(event.pointerId);
            clearOwnedPortalPointerGesture(event.pointerId);
        },
        [clearBlockedPointerGesture, clearOwnedPortalPointerGesture]
    );

    const handleDocumentLostPointerCapture = useCallback(
        (event: PointerEvent) => {
            const blockedGesture = blockedPointerGestures.current.get(event.pointerId);
            if (blockedGesture != null && !blockedGesture.released) {
                clearBlockedPointerGesture(event.pointerId);
            }
            const ownedPortalGesture = ownedPortalPointerGestures.current.get(event.pointerId);
            if (ownedPortalGesture != null && !ownedPortalGesture.released) {
                clearOwnedPortalPointerGesture(event.pointerId);
            }
        },
        [clearBlockedPointerGesture, clearOwnedPortalPointerGesture]
    );

    const handleDocumentPointerUp = useCallback(
        (event: PointerEvent) => {
            const view = cellElement.current?.ownerDocument.defaultView;
            const pointerId = event.pointerId;
            if (blockedPointerGestures.current.has(pointerId)) {
                if (view == null) {
                    clearBlockedPointerGesture(pointerId);
                } else {
                    const releaseTimer = view.setTimeout(
                        () => clearBlockedPointerGesture(pointerId),
                        0
                    );
                    blockedPointerGestures.current.set(pointerId, {
                        pointerId,
                        released: true,
                        releaseTimer
                    });
                }
            }
            if (ownedPortalPointerGestures.current.has(pointerId)) {
                if (view == null) {
                    clearOwnedPortalPointerGesture(pointerId);
                } else {
                    const releaseTimer = view.setTimeout(
                        () => clearOwnedPortalPointerGesture(pointerId),
                        0
                    );
                    ownedPortalPointerGestures.current.set(pointerId, {
                        pointerId,
                        released: true,
                        releaseTimer
                    });
                }
            }
        },
        [clearBlockedPointerGesture, clearOwnedPortalPointerGesture]
    );

    useEffect(() => {
        if (!showEditor) {
            clearBlockedPointerGesture();
            clearOwnedPortalPointerGesture();
            return;
        }
        const document = cellElement.current?.ownerDocument;
        if (document == null) return;
        document.addEventListener("pointerdown", handleDocumentPointerDown, true);
        document.addEventListener("pointercancel", handleDocumentPointerCancel, true);
        document.addEventListener("lostpointercapture", handleDocumentLostPointerCapture, true);
        document.addEventListener("pointerup", handleDocumentPointerUp, true);
        document.addEventListener("click", handleDocumentClick, true);
        return () => {
            document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
            document.removeEventListener("pointercancel", handleDocumentPointerCancel, true);
            document.removeEventListener(
                "lostpointercapture",
                handleDocumentLostPointerCapture,
                true
            );
            document.removeEventListener("pointerup", handleDocumentPointerUp, true);
            document.removeEventListener("click", handleDocumentClick, true);
            clearBlockedPointerGesture();
            clearOwnedPortalPointerGesture();
        };
    }, [
        clearBlockedPointerGesture,
        clearOwnedPortalPointerGesture,
        handleDocumentClick,
        handleDocumentLostPointerCapture,
        handleDocumentPointerCancel,
        handleDocumentPointerDown,
        handleDocumentPointerUp,
        showEditor
    ]);

    const handleFocus = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            if (controller.isCellFocusOwnedByController(address)) {
                if (legacyInteractive && event.target !== event.currentTarget) {
                    setLegacyDescendantFocused(true);
                }
                return;
            }
            if (event.target !== event.currentTarget) {
                if (legacyInteractive) setLegacyDescendantFocused(true);
                return;
            }
            if (suppressNextFocus.current) {
                suppressNextFocus.current = false;
                return;
            }
            if (controller.getInteractionState().kind === "parked") {
                setLegacyDescendantFocused(false);
                controller.dispatchCellIntent(
                    address,
                    { kind: "expose-selection" },
                    viewportRowDistance
                );
                return;
            }
            controller.setFocusedCell(address.transactionId, address.columnId);
        },
        [address, controller, legacyInteractive, viewportRowDistance]
    );

    const handleBlur = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            if (!legacyInteractive) return;
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget))
                setLegacyDescendantFocused(false);
        },
        [legacyInteractive]
    );

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            const element = event.currentTarget;
            const interactiveTarget = interactiveDescendantTarget(
                element,
                event.target,
                legacyInteractive
            );
            if (interactiveTarget != null) return;
            const selectionStart = cell.getSelectionStartHandler(element.ownerDocument);
            suppressNextFocus.current = true;
            setLegacyDescendantFocused(false);
            selectionStart(event);
            controller.dispatchCellIntent(
                address,
                { kind: "expose-selection" },
                viewportRowDistance
            );
            element.focus({ preventScroll: true });
            suppressNextFocus.current = false;
        },
        [address, cell, controller, legacyInteractive, viewportRowDistance]
    );

    const handleDoubleClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (
                interaction.editKind === "none" ||
                isInteractiveDescendant(event.currentTarget, event.target, legacyInteractive)
            ) {
                return;
            }
            const result = controller.dispatchCellIntent(
                address,
                {
                    entry: "full",
                    kind: "enter-edit"
                },
                viewportRowDistance
            );
            if (result.ok && requestEffect(event.currentTarget, result.value)) {
                event.preventDefault();
                event.stopPropagation();
            }
        },
        [
            address,
            controller,
            interaction.editKind,
            legacyInteractive,
            requestEffect,
            viewportRowDistance
        ]
    );

    const acknowledgeEditorGesture = useCallback(() => {
        controller.acknowledgeEditorGesture(address);
    }, [address, controller]);

    const clearComposition = useCallback(() => {
        activeCompositionSequence.current = null;
        compositionTarget.current = null;
        compositionValueBefore.current = null;
    }, []);

    const captureCompositionTarget = useCallback((target: EventTarget) => {
        if (!(target instanceof HTMLElement)) return;
        const text = editorText(target);
        if (text == null) return;
        compositionTarget.current = target;
        if (compositionValueBefore.current == null) compositionValueBefore.current = text;
    }, []);

    const resumeComposition = useCallback(
        (sequence: ReturnType<typeof asTransactionCompositionSequence>) => {
            queueMicrotask(() => {
                controller.dispatchCompositionEvent(address, { kind: "resume", sequence });
                if (activeCompositionSequence.current === sequence) clearComposition();
            });
        },
        [address, clearComposition, controller]
    );

    const handleCompositionStart = useCallback(
        (event: React.CompositionEvent<HTMLDivElement>) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const sequence = asTransactionCompositionSequence(nextCompositionSequence.current);
            nextCompositionSequence.current += 1;
            activeCompositionSequence.current = sequence;
            const targetText = editorText(target);
            compositionTarget.current = targetText == null ? null : target;
            compositionValueBefore.current = targetText;

            const state = controller.getInteractionState();
            if (state.kind === "editing") {
                controller.dispatchCompositionEvent(address, {
                    emptyCompletion: "editing",
                    kind: "start",
                    sequence
                });
                return;
            }
            const context = transactionGridKeyContext(state, interaction);
            if (context == null) {
                clearComposition();
                return;
            }
            const intent = transactionGridCompositionStartIntent(context, true);
            if (intent.kind === "ignore-composition") {
                clearComposition();
                return;
            }
            if (intent.prepare !== "none") {
                const prepared = controller.dispatchCellIntent(
                    address,
                    intent.prepare === "establish"
                        ? { kind: "establish" }
                        : { kind: "expose-selection" },
                    viewportRowDistance
                );
                if (!prepared.ok || prepared.value.kind === "native") {
                    clearComposition();
                    return;
                }
            }
            controller.beginActivation({
                compositionSequence: sequence,
                entry: "quick",
                target: address
            });
        },
        [address, clearComposition, controller, interaction, viewportRowDistance]
    );

    const handleCompositionUpdate = useCallback(
        (event: React.CompositionEvent<HTMLDivElement>) => {
            captureCompositionTarget(event.target);
            controller.dispatchCompositionEvent(address, {
                data: event.data,
                kind: "update"
            });
        },
        [address, captureCompositionTarget, controller]
    );

    const handleCompositionEnd = useCallback(
        (event: React.CompositionEvent<HTMLDivElement>) => {
            captureCompositionTarget(event.target);
            const sequence = activeCompositionSequence.current;
            if (sequence == null) return;
            const ended = controller.dispatchCompositionEvent(address, {
                data: event.data,
                kind: "end"
            });
            if (ended == null) return;
            queueMicrotask(() => {
                const target = compositionTarget.current;
                const result = controller.dispatchCompositionEvent(address, {
                    kind: "fallback",
                    sequence
                });
                if (
                    result?.insertedText != null &&
                    target?.isConnected &&
                    editorText(target) === compositionValueBefore.current
                ) {
                    insertEditorText(target, result.insertedText);
                }
                resumeComposition(sequence);
            });
        },
        [address, captureCompositionTarget, controller, resumeComposition]
    );

    const handleBeforeInputCapture = useCallback(
        (event: React.FormEvent<HTMLDivElement>) => {
            acknowledgeEditorGesture();
            const target = event.target;
            const nativeEvent = event.nativeEvent;
            const sequence = activeCompositionSequence.current;
            if (!(target instanceof HTMLElement) || !("data" in nativeEvent) || sequence == null) {
                return;
            }
            const data = nativeEvent.data;
            if (typeof data !== "string") return;
            captureCompositionTarget(target);
            if ("isComposing" in nativeEvent && nativeEvent.isComposing === true) {
                controller.dispatchCompositionEvent(address, { data, kind: "update" });
                return;
            }
            const result = controller.dispatchCompositionEvent(address, {
                data,
                kind: "authoritative-insertion",
                sequence
            });
            if (result?.insertedText == null) return;
            event.preventDefault();
            insertEditorText(target, result.insertedText);
            resumeComposition(sequence);
        },
        [acknowledgeEditorGesture, address, captureCompositionTarget, controller, resumeComposition]
    );

    const releaseEditorBlurSuppression = useCallback(() => {
        queueMicrotask(() => {
            suppressEditorBlur.current = false;
        });
    }, []);

    const handleEditorBlurCapture = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            if (suppressEditorBlur.current) {
                event.stopPropagation();
                return;
            }
            const state = controller.getInteractionState();
            if (state.kind !== "interacting" || state.owner !== "grid-editor") return;
            const cell = cellElement.current;
            if (cell == null || isEditorOwnedTarget(cell, controller, event.relatedTarget, address))
                return;
            if (ownedPortalPointerGestures.current.size > 0) {
                event.stopPropagation();
                return;
            }
            const validation = validateEditorExit();
            if (validation !== "rejected") return;
            controller.setEditorInteraction(address, state.popup, false);
            event.stopPropagation();
            focusRetainedEditor();
        },
        [address, controller, focusRetainedEditor, validateEditorExit]
    );

    const dispatchEditorLifecycleIntent = useCallback(
        (intent: TransactionGridKeyIntent): boolean => {
            if (!isEditorLifecycleIntent(intent)) return false;
            const lifecycle = editorLifecycle.current;
            if (lifecycle == null) return false;
            suppressEditorBlur.current = true;
            if (intent.kind === "cancel-edit" || intent.kind === "cancel-popup-edit") {
                lifecycle.cancel();
                controller.publishAutomationEditorCancellation(address);
                controller.dispatchCellIntent(address, intent, viewportRowDistance);
                releaseEditorBlurSuppression();
                return true;
            }
            const committed = lifecycle.commit();
            publishAutomationEditorCommit(committed);
            if (!committed.ok) {
                suppressEditorBlur.current = false;
                return true;
            }
            controller.dispatchCellIntent(address, intent, viewportRowDistance);
            releaseEditorBlurSuppression();
            return true;
        },
        [
            address,
            controller,
            publishAutomationEditorCommit,
            releaseEditorBlurSuppression,
            viewportRowDistance
        ]
    );

    const cancelOwnedEditorPopup = useCallback((): boolean => {
        const state = controller.getInteractionState();
        if (state.kind !== "interacting" || state.owner !== "grid-editor") return false;
        const active = activeTransactionGridAddress(state.selection);
        if (
            active.transactionId !== address.transactionId ||
            active.columnId !== address.columnId
        ) {
            return false;
        }
        return dispatchEditorLifecycleIntent({ kind: "cancel-popup-edit" });
    }, [address, controller, dispatchEditorLifecycleIntent]);

    const handleEditorKeyDownCapture = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            acknowledgeEditorGesture();
            const context = transactionGridKeyContext(
                controller.getInteractionState(),
                interaction
            );
            if (context == null) return;
            if (
                isNestedTransactionGridWidget(target) &&
                (event.key === "Escape" || isAltArrowEvent(event))
            ) {
                return;
            }
            const intent = transactionGridKeyIntent(context, {
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                isComposing: event.nativeEvent.isComposing,
                key: event.key,
                keyCode: event.keyCode,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
            if (intent.kind === "open-interaction") {
                event.preventDefault();
                event.currentTarget
                    .querySelector<HTMLElement>(`[data-grid-open-interaction="${intent.popup}"]`)
                    ?.click();
                return;
            }
            if (!dispatchEditorLifecycleIntent(intent)) return;
            event.preventDefault();
            event.stopPropagation();
        },
        [acknowledgeEditorGesture, controller, dispatchEditorLifecycleIntent, interaction]
    );

    const handleEditorPortalKeyDownCapture = useCallback(
        (event: KeyboardEvent) => {
            const cell = cellElement.current;
            const target = event.target;
            if (
                cell == null ||
                !(target instanceof HTMLElement) ||
                cell.contains(target) ||
                !controller.isRegisteredEditorPortalTarget(address, target)
            ) {
                return;
            }
            acknowledgeEditorGesture();
            if (
                isNestedTransactionGridWidget(target) &&
                (event.key === "Escape" || isAltArrowEvent(event))
            ) {
                return;
            }
            const context = transactionGridKeyContext(
                controller.getInteractionState(),
                interaction
            );
            if (context == null) return;
            const intent = transactionGridKeyIntent(context, {
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                isComposing: event.isComposing,
                key: event.key,
                keyCode: event.keyCode,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
            if (!dispatchEditorLifecycleIntent(intent)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        },
        [acknowledgeEditorGesture, address, controller, dispatchEditorLifecycleIntent, interaction]
    );

    useEffect(() => {
        if (!showEditor) return;
        const document = cellElement.current?.ownerDocument;
        if (document == null) return;
        document.addEventListener("keydown", handleEditorPortalKeyDownCapture, true);
        return () => {
            document.removeEventListener("keydown", handleEditorPortalKeyDownCapture, true);
        };
    }, [handleEditorPortalKeyDownCapture, showEditor]);

    const handleInteractiveDescendantKeyDownCapture = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (showEditor || !isAltArrowEvent(event)) return;
            if (!isInteractiveDescendant(event.currentTarget, event.target, legacyInteractive)) {
                return;
            }
            const context = transactionGridKeyContext(
                controller.getInteractionState(),
                interaction
            );
            if (context == null) return;
            const intent = transactionGridKeyIntent(context, {
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                isComposing: event.nativeEvent.isComposing,
                key: event.key,
                keyCode: event.keyCode,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
            const result = controller.dispatchCellIntent(address, intent, viewportRowDistance);
            if (!result.ok || !requestEffect(event.currentTarget, result.value)) return;
            event.preventDefault();
            event.stopPropagation();
        },
        [
            address,
            controller,
            interaction,
            legacyInteractive,
            requestEffect,
            showEditor,
            viewportRowDistance
        ]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (isInteractiveDescendant(event.currentTarget, event.target, legacyInteractive))
                return;
            const context = transactionGridKeyContext(
                controller.getInteractionState(),
                interaction
            );
            if (context == null) return;
            const intent = transactionGridKeyIntent(context, {
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                isComposing: event.nativeEvent.isComposing,
                key: event.key,
                keyCode: event.keyCode,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
            const result = controller.dispatchCellIntent(address, intent, viewportRowDistance);
            if (!result.ok || !requestEffect(event.currentTarget, result.value)) return;
            event.preventDefault();
            event.stopPropagation();
        },
        [address, controller, interaction, legacyInteractive, requestEffect, viewportRowDistance]
    );

    const selectionExposed = selectionVisibility !== "suppressed";
    const tabIndex =
        (!legacyDescendantFocused || interactionKind === "parked") &&
        (((interactionKind === "navigating" ||
            interactionKind === "editing" ||
            interactionKind === "interacting") &&
            cell.getIsFocused()) ||
            (interactionKind === "parked" && isParkedTabStop) ||
            (interactionKind === "idle" && isInitialTabStop))
            ? 0
            : -1;
    const editorVisible = showEditor && editor != null;

    return (
        <div
            ref={registerCell}
            role="gridcell"
            aria-colindex={ariaColumnIndex}
            aria-description={ariaDescription}
            aria-selected={selectionExposed ? selected : undefined}
            tabIndex={tabIndex}
            data-cell={address.columnId}
            data-column-id={address.columnId}
            data-cell-transaction-id={address.transactionId}
            data-cell-content={
                editorVisible ? "editor" : legacyInteractive ? "legacy-interactive" : "display"
            }
            data-presence={presenceColor == null ? undefined : "true"}
            className={cn(
                TRANSACTION_GRIDCELL_CHROME,
                selectionVisibility === "visible" && TRANSACTION_GRIDCELL_VISIBLE_SELECTION_CHROME,
                selectionVisibility === "muted" && TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME,
                interactionKind !== "parked" && TRANSACTION_GRIDCELL_FOCUS_CHROME,
                presenceColor != null && "z-[1] outline outline-2 -outline-offset-2",
                className
            )}
            style={presenceColor == null ? undefined : { outlineColor: presenceColor }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onKeyDownCapture={handleInteractiveDescendantKeyDownCapture}
            onKeyDown={handleKeyDown}
        >
            {editorVisible ? (
                <div
                    ref={registerEditorContainer}
                    className="contents"
                    onBeforeInputCapture={handleBeforeInputCapture}
                    onBlurCapture={handleEditorBlurCapture}
                    onKeyDownCapture={handleEditorKeyDownCapture}
                    onPointerDownCapture={acknowledgeEditorGesture}
                >
                    <TransactionGridEditorLifecycleProvider
                        cancelPopupEditing={cancelOwnedEditorPopup}
                        publishNativeBlurCommit={publishNativeBlurCommit}
                        register={registerEditorLifecycle}
                        registerPortal={registerEditorPortal}
                        isPortalTargetOwned={isEditorPortalTargetOwned}
                    >
                        {editor}
                    </TransactionGridEditorLifecycleProvider>
                </div>
            ) : (
                display
            )}
            {adornment}
        </div>
    );
}

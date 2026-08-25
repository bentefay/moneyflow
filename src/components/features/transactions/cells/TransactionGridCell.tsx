"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type {
    TransactionGridCellCommandEffect,
    TransactionGridWorkspaceController
} from "../hooks/useTransactionGridController";
import {
    transactionGridKeyContext,
    transactionGridKeyIntent,
    type TransactionColumnInteractionMeta,
    type TransactionEditEntry,
    type TransactionGridAddress,
    type TransactionTableCell
} from "../table-model";
import { TRANSACTION_GRIDCELL_CHROME } from "./cell-chrome";

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
    /** Current runtime owner, used only to project selection semantics and the idle entry stop. */
    readonly interactionKind: "idle" | "pending-activation" | "parked" | "navigating" | "editing";
    /** The one mounted cell that enters the roving set before first grid engagement. */
    readonly isInitialTabStop: boolean;
    /** Whether this cell is the retained active anchor while the selection is parked. */
    readonly isParkedTabStop: boolean;
    /** Current visible-row distance supplied by the virtualizer for PageUp/PageDown. */
    readonly viewportRowDistance: number;
    /** Resting display branch. Only this branch is mounted when the cell is not editing. */
    readonly display: React.ReactNode;
    /** Typed editor branch supplied by later editor-family slices. */
    readonly editor?: React.ReactNode;
    /** Whether to render the editor branch. */
    readonly showEditor?: boolean;
    /** Temporary marker for a legacy always-live descendant retained until its editor slice. */
    readonly legacyInteractive?: boolean;
    /** Full/quick edit request seam. */
    readonly onEditRequest?: (entry: TransactionEditEntry, initialText?: string) => void;
    /** Direct activation request seam for checkbox/actions cells. */
    readonly onActivate?: (activation: "checkbox" | "inspector") => void;
    /** Additional layout classes; the surface itself adds no box-model geometry. */
    readonly className?: string;
}

function isInteractiveDescendant(
    currentTarget: HTMLElement,
    target: EventTarget,
    legacyInteractive: boolean
): boolean {
    if (!(target instanceof Element) || target === currentTarget) return false;
    // React portal events follow the component tree even though the popup is outside this cell's DOM.
    if (!currentTarget.contains(target)) return true;
    if (legacyInteractive) return true;
    return target.closest(INTERACTIVE_DESCENDANT) != null;
}

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

/**
 * Shared focusable surface for every visible transaction-grid column.
 *
 * It owns grid semantics, registration, selection paint and background gestures. Interactive legacy
 * descendants opt out, so their existing editor/activation behavior remains usable until the slice
 * that supplies a true display/editor pair and typed lifecycle.
 */
export function TransactionGridCell({
    address,
    ariaColumnIndex,
    cell,
    className,
    controller,
    display,
    editor,
    interaction,
    interactionKind,
    isInitialTabStop,
    isParkedTabStop,
    legacyInteractive = false,
    onActivate,
    onEditRequest,
    selected,
    showEditor = false,
    viewportRowDistance
}: TransactionGridCellProps) {
    const suppressNextFocus = useRef(false);
    const [legacyDescendantFocused, setLegacyDescendantFocused] = useState(false);
    const columnId = address.columnId;
    const transactionId = address.transactionId;
    const registerCell = useCallback(
        (element: HTMLDivElement | null) =>
            controller.registerCell({ columnId, transactionId }, element),
        [columnId, controller, transactionId]
    );

    const requestEffect = useCallback(
        (element: HTMLElement, effect: TransactionGridCellCommandEffect): boolean => {
            if (effect.kind === "native") return false;
            if (effect.kind === "handled") return true;
            if (effect.kind === "activate") {
                if (onActivate == null) return false;
                onActivate(effect.activation);
                return true;
            }
            if (onEditRequest != null) {
                onEditRequest(effect.entry, effect.initialText);
                return true;
            }
            return legacyInteractive && effect.entry === "full" && focusLegacyEditor(element);
        },
        [legacyInteractive, onActivate, onEditRequest]
    );

    const handleFocus = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            const pending = controller.getPendingRequest();
            const matchingPendingTarget =
                pending?.state.phase === "focus" &&
                pending.state.target.transactionId === address.transactionId &&
                pending.state.target.columnId === address.columnId;
            if (matchingPendingTarget) {
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
            if (
                event.button !== 0 ||
                isInteractiveDescendant(event.currentTarget, event.target, legacyInteractive)
            ) {
                return;
            }
            suppressNextFocus.current = true;
            setLegacyDescendantFocused(false);
            cell.getSelectionStartHandler(event.currentTarget.ownerDocument)(event);
            controller.dispatchCellIntent(
                address,
                { kind: "expose-selection" },
                viewportRowDistance
            );
            event.currentTarget.focus({ preventScroll: true });
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

    const selectionVisible = interactionKind === "navigating" || interactionKind === "editing";
    const tabIndex =
        (!legacyDescendantFocused || interactionKind === "parked") &&
        (((interactionKind === "navigating" || interactionKind === "editing") &&
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
            aria-selected={selectionVisible ? selected : undefined}
            tabIndex={tabIndex}
            data-cell={address.columnId}
            data-column-id={address.columnId}
            data-cell-transaction-id={address.transactionId}
            data-cell-content={
                editorVisible ? "editor" : legacyInteractive ? "legacy-interactive" : "display"
            }
            className={cn(TRANSACTION_GRIDCELL_CHROME, className)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
        >
            {editorVisible ? editor : display}
        </div>
    );
}

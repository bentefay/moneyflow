import type { CellSelectionDirection } from "@tanstack/table-core";

import type { TransactionColumnActivationKind, TransactionColumnInteractionMeta } from "./features";
import type {
    TransactionCompositionState,
    TransactionEditEntry,
    TransactionGridInteractionState
} from "./grid-interaction-state";

export type TransactionGridKeyMode =
    | "idle"
    | "parked"
    | "navigating"
    | "editing-quick"
    | "editing-full"
    | "inspecting"
    | "interacting-grid-editor"
    | "interacting-inspector";

export type TransactionCellActivation = TransactionColumnActivationKind;

export type TransactionGridKeyCellContext =
    | {
          readonly editable: true;
          readonly activation: "none";
          readonly tabBehavior?: "grid" | "open-calendar";
      }
    | {
          readonly editable: false;
          readonly activation: "none";
      }
    | {
          readonly editable: false;
          readonly activation: Exclude<TransactionColumnActivationKind, "none">;
      };

export function editableTransactionGridKeyCell(
    tabBehavior?: "grid" | "open-calendar"
): TransactionGridKeyCellContext {
    return tabBehavior == null
        ? { activation: "none", editable: true }
        : { activation: "none", editable: true, tabBehavior };
}

export function activationTransactionGridKeyCell(
    activation: Exclude<TransactionColumnActivationKind, "none">
): TransactionGridKeyCellContext {
    return { activation, editable: false };
}

export const NONEDITABLE_TRANSACTION_GRID_KEY_CELL: TransactionGridKeyCellContext = {
    activation: "none",
    editable: false
};

export type TransactionGridKeyContext =
    | {
          readonly mode: Exclude<TransactionGridKeyMode, "interacting-grid-editor">;
          readonly composition?: TransactionCompositionState;
          readonly cell: TransactionGridKeyCellContext;
      }
    | {
          readonly mode: "interacting-grid-editor";
          readonly editorEntry: TransactionEditEntry;
          readonly composition?: TransactionCompositionState;
          readonly cell: TransactionGridKeyCellContext;
      };

function keyCellContext(
    interaction: TransactionColumnInteractionMeta
): TransactionGridKeyCellContext {
    if (interaction.activationKind !== "none") {
        return activationTransactionGridKeyCell(interaction.activationKind);
    }
    if (interaction.editKind === "none") return NONEDITABLE_TRANSACTION_GRID_KEY_CELL;
    return editableTransactionGridKeyCell(
        interaction.editKind === "date" ? "open-calendar" : undefined
    );
}

/**
 * Adapts canonical controller state plus immutable column capabilities to the pure key reducer.
 * Pending activation has no DOM-key owner: its generation-checked reveal/focus command must finish
 * or abort before another grid command can be accepted.
 */
export function transactionGridKeyContext(
    state: TransactionGridInteractionState<unknown>,
    interaction: TransactionColumnInteractionMeta
): TransactionGridKeyContext | null {
    const cell = keyCellContext(interaction);
    if (state.kind === "pending-activation") return null;
    if (state.kind === "idle" || state.kind === "parked" || state.kind === "navigating") {
        return { cell, mode: state.kind };
    }
    if (state.kind === "editing") {
        return {
            cell,
            composition: state.editor.composition,
            mode: state.editor.entry === "quick" ? "editing-quick" : "editing-full"
        };
    }
    if (state.kind === "inspecting") return { cell, mode: "inspecting" };
    if (state.owner === "grid-editor") {
        return {
            cell,
            editorEntry: state.returnState.editor.entry,
            mode: "interacting-grid-editor"
        };
    }
    return { cell, mode: "interacting-inspector" };
}

export interface TransactionGridKeyEvent {
    readonly key: string;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
    readonly isComposing: boolean;
    readonly keyCode: number;
}

export type TransactionGridFollowUpIntent =
    | {
          readonly kind: "enter-edit";
          readonly entry: TransactionEditEntry;
          readonly initialText?: string;
      }
    | { readonly kind: "activate"; readonly activation: Exclude<TransactionCellActivation, "none"> }
    | { readonly kind: "move"; readonly direction: CellSelectionDirection }
    | { readonly kind: "extend"; readonly direction: CellSelectionDirection }
    | { readonly kind: "move-to"; readonly target: TransactionNavigationTarget }
    | { readonly kind: "extend-to"; readonly target: TransactionNavigationTarget }
    | { readonly kind: "traverse-tab"; readonly direction: "forward" | "reverse" };

export type TransactionGridKeyIntent =
    | { readonly kind: "native" }
    | { readonly kind: "composition-owned" }
    | {
          readonly kind: "establish";
          readonly target?: TransactionNavigationTarget;
          readonly then?: TransactionGridFollowUpIntent;
      }
    | { readonly kind: "expose-selection"; readonly then?: TransactionGridFollowUpIntent }
    | {
          readonly kind: "enter-edit";
          readonly entry: TransactionEditEntry;
          readonly initialText?: string;
      }
    | { readonly kind: "activate"; readonly activation: Exclude<TransactionCellActivation, "none"> }
    | { readonly kind: "park" }
    | { readonly kind: "cancel-edit" }
    | { readonly kind: "cancel-popup-edit" }
    | { readonly kind: "close-interaction" }
    | { readonly kind: "close-inspector" }
    | { readonly kind: "open-interaction"; readonly popup: "calendar" }
    | { readonly kind: "move"; readonly direction: CellSelectionDirection }
    | { readonly kind: "extend"; readonly direction: CellSelectionDirection }
    | {
          readonly kind: "commit-and-move";
          readonly direction: CellSelectionDirection;
          readonly preserveEntry: TransactionEditEntry;
      }
    | { readonly kind: "commit-and-extend"; readonly direction: CellSelectionDirection }
    | { readonly kind: "move-to"; readonly target: TransactionNavigationTarget }
    | { readonly kind: "extend-to"; readonly target: TransactionNavigationTarget }
    | {
          readonly kind: "commit-and-move-to";
          readonly target: TransactionNavigationTarget;
          readonly preserveEntry: TransactionEditEntry;
      }
    | { readonly kind: "commit-and-extend-to"; readonly target: TransactionNavigationTarget }
    | { readonly kind: "traverse-tab"; readonly direction: "forward" | "reverse" }
    | { readonly kind: "copy" }
    | { readonly kind: "select-all" };

export type TransactionGridCompositionStartIntent =
    | { readonly kind: "ignore-composition" }
    | {
          readonly kind: "begin-quick-composition";
          readonly prepare: "establish" | "expose-selection" | "none";
      };

/** Establishes the mode transition for `compositionstart` before preview events arrive. */
export function transactionGridCompositionStartIntent(
    context: TransactionGridKeyContext,
    hasValidAddress: boolean
): TransactionGridCompositionStartIntent {
    if (
        !hasValidAddress ||
        !context.cell.editable ||
        context.cell.activation !== "none" ||
        context.mode === "inspecting"
    ) {
        return { kind: "ignore-composition" };
    }
    if (context.mode === "interacting-grid-editor" || context.mode === "interacting-inspector") {
        return { kind: "ignore-composition" };
    }
    if (context.mode === "editing-full") return { kind: "ignore-composition" };
    if (context.mode === "editing-quick") {
        return { kind: "begin-quick-composition", prepare: "none" };
    }
    if (context.mode === "idle") {
        return { kind: "begin-quick-composition", prepare: "establish" };
    }
    return {
        kind: "begin-quick-composition",
        prepare: context.mode === "parked" ? "expose-selection" : "none"
    };
}

export type TransactionNavigationTarget =
    | { readonly kind: "row-start" }
    | { readonly kind: "row-end" }
    | { readonly kind: "grid-start" }
    | { readonly kind: "grid-end" }
    | { readonly kind: "page-up" }
    | { readonly kind: "page-down" };

const ARROW_DIRECTIONS: Readonly<Record<string, CellSelectionDirection>> = {
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up"
};

function isPrimaryModified(event: TransactionGridKeyEvent): boolean {
    return event.ctrlKey || event.metaKey;
}

function isPrintable(event: TransactionGridKeyEvent): boolean {
    return (
        event.key.length === 1 &&
        event.key !== " " &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
    );
}

function editEntry(context: TransactionGridKeyContext): TransactionEditEntry | undefined {
    if (context.mode === "editing-quick") return "quick";
    if (context.mode === "editing-full") return "full";
    if (context.mode === "interacting-grid-editor") return context.editorEntry;
    return undefined;
}

function movementIntent(
    context: TransactionGridKeyContext,
    direction: CellSelectionDirection,
    extend: boolean
): TransactionGridKeyIntent {
    const entry = editEntry(context);
    if (entry != null) {
        if (context.mode === "editing-full" && !context.cell.editable) {
            return extend
                ? { direction, kind: "commit-and-extend" }
                : { direction, kind: "commit-and-move", preserveEntry: entry };
        }
        return extend
            ? { direction, kind: "commit-and-extend" }
            : { direction, kind: "commit-and-move", preserveEntry: entry };
    }
    return extend ? { direction, kind: "extend" } : { direction, kind: "move" };
}

function targetedMovementIntent(
    context: TransactionGridKeyContext,
    target: TransactionNavigationTarget,
    extend: boolean
): TransactionGridKeyIntent {
    const entry = editEntry(context);
    if (entry != null) {
        return extend
            ? { kind: "commit-and-extend-to", target }
            : { kind: "commit-and-move-to", preserveEntry: entry, target };
    }
    return extend ? { kind: "extend-to", target } : { kind: "move-to", target };
}

function asFollowUpIntent(
    intent: TransactionGridKeyIntent
): TransactionGridFollowUpIntent | undefined {
    switch (intent.kind) {
        case "enter-edit":
        case "activate":
        case "move":
        case "extend":
        case "move-to":
        case "extend-to":
        case "traverse-tab":
            return intent;
        default:
            return undefined;
    }
}

function enterIntent(context: TransactionGridKeyContext): TransactionGridKeyIntent {
    if (context.mode === "idle") return { kind: "establish" };
    if (context.mode === "parked") return { kind: "expose-selection" };
    const entry = editEntry(context);
    if (entry != null) {
        return { direction: "down", kind: "commit-and-move", preserveEntry: entry };
    }
    if (context.mode !== "navigating") return { kind: "native" };
    if (context.cell.activation !== "none") {
        return { activation: context.cell.activation, kind: "activate" };
    }
    return context.cell.editable
        ? { entry: "full", kind: "enter-edit" }
        : { direction: "down", kind: "move" };
}

function escapeIntent(mode: TransactionGridKeyMode): TransactionGridKeyIntent {
    if (mode === "interacting-grid-editor") return { kind: "cancel-popup-edit" };
    if (mode === "interacting-inspector") return { kind: "close-interaction" };
    if (mode === "editing-quick" || mode === "editing-full") {
        return { kind: "cancel-edit" };
    }
    if (mode === "inspecting") return { kind: "close-inspector" };
    return mode === "navigating" ? { kind: "park" } : { kind: "native" };
}

function plainNavigationIntent(
    context: TransactionGridKeyContext,
    event: TransactionGridKeyEvent
): TransactionGridKeyIntent | undefined {
    const direction = ARROW_DIRECTIONS[event.key];
    if (direction != null) {
        if (isPrimaryModified(event)) return { kind: "native" };
        if (context.mode === "editing-full" && !event.altKey) {
            const horizontal = direction === "left" || direction === "right";
            if (horizontal) return { kind: "native" };
        }
        return movementIntent(context, direction, event.shiftKey);
    }

    if (event.altKey) return { kind: "native" };

    const primary = isPrimaryModified(event);
    const target = (() => {
        if (event.key === "Home") return primary ? { kind: "grid-start" } : { kind: "row-start" };
        if (event.key === "End") return primary ? { kind: "grid-end" } : { kind: "row-end" };
        if (event.key === "PageUp") return { kind: "page-up" };
        if (event.key === "PageDown") return { kind: "page-down" };
        return undefined;
    })() satisfies TransactionNavigationTarget | undefined;
    if (target == null) return undefined;

    if (context.mode === "editing-full" && (event.key === "Home" || event.key === "End")) {
        return { kind: "native" };
    }
    return targetedMovementIntent(context, target, event.shiftKey);
}

/**
 * Reduces one keyboard event to a controller intent without reading or mutating the DOM.
 *
 * Native ownership is explicit rather than a default side effect: editors and owned widgets retain
 * their text, selection, copy and popup models unless the contract assigns the key to the grid.
 */
export function transactionGridKeyIntent(
    context: TransactionGridKeyContext,
    event: TransactionGridKeyEvent
): TransactionGridKeyIntent {
    if (context.composition?.kind !== undefined && context.composition.kind !== "inactive") {
        return { kind: "composition-owned" };
    }
    if (event.isComposing || event.keyCode === 229) return { kind: "composition-owned" };
    if (event.key === "F2") return { kind: "native" };
    if (event.key === "Escape") return escapeIntent(context.mode);

    if (context.mode === "interacting-grid-editor") {
        const direction = ARROW_DIRECTIONS[event.key];
        if (event.altKey && direction != null && !isPrimaryModified(event)) {
            return movementIntent(context, direction, event.shiftKey);
        }
        return { kind: "native" };
    }
    if (context.mode === "interacting-inspector" || context.mode === "inspecting") {
        return { kind: "native" };
    }

    const primary = isPrimaryModified(event);
    if (primary && event.key.toLowerCase() === "c") {
        return context.mode === "navigating" ? { kind: "copy" } : { kind: "native" };
    }
    if (primary && event.key.toLowerCase() === "a") {
        return context.mode === "navigating" ? { kind: "select-all" } : { kind: "native" };
    }
    if (event.key === "Enter") return enterIntent(context);
    if (event.key === "Tab") {
        if (
            context.mode === "navigating" &&
            context.cell.activation === "inspector" &&
            !event.shiftKey
        ) {
            return { kind: "native" };
        }
        if (
            context.mode === "editing-full" &&
            context.cell.editable &&
            !event.shiftKey &&
            context.cell.tabBehavior === "open-calendar"
        ) {
            return { kind: "open-interaction", popup: "calendar" };
        }
        const direction = event.shiftKey ? "reverse" : "forward";
        const tab: TransactionGridFollowUpIntent = { direction, kind: "traverse-tab" };
        if (context.mode === "idle") {
            return {
                kind: "establish",
                target: direction === "forward" ? { kind: "grid-start" } : { kind: "grid-end" }
            };
        }
        if (context.mode === "parked") return { kind: "expose-selection", then: tab };
        return tab;
    }
    if (event.key === " ") {
        const activation: TransactionGridFollowUpIntent | undefined =
            context.cell.activation === "none"
                ? undefined
                : { activation: context.cell.activation, kind: "activate" };
        const quickEntry: TransactionGridFollowUpIntent | undefined = context.cell.editable
            ? { entry: "quick", initialText: " ", kind: "enter-edit" }
            : undefined;
        const followUp = activation ?? quickEntry;
        if (context.mode === "idle") return { kind: "establish", then: followUp };
        if (context.mode === "parked") {
            return followUp == null
                ? { kind: "expose-selection" }
                : { kind: "expose-selection", then: followUp };
        }
        if (context.mode === "navigating" && followUp != null) return followUp;
    }

    const movement = plainNavigationIntent(context, event);
    if (movement != null) {
        const followUp = asFollowUpIntent(movement);
        if (context.mode === "idle") {
            if (followUp?.kind === "move-to") return { kind: "establish", target: followUp.target };
            return event.shiftKey && followUp != null
                ? { kind: "establish", then: followUp }
                : { kind: "establish" };
        }
        if (context.mode === "parked") {
            return followUp == null
                ? { kind: "expose-selection" }
                : { kind: "expose-selection", then: followUp };
        }
        return movement;
    }

    if (isPrintable(event) && context.cell.editable && context.cell.activation === "none") {
        const quickEntry: TransactionGridFollowUpIntent = {
            entry: "quick",
            initialText: event.key,
            kind: "enter-edit"
        };
        if (context.mode === "idle") return { kind: "establish", then: quickEntry };
        if (context.mode === "parked") return { kind: "expose-selection", then: quickEntry };
        if (context.mode === "navigating") return quickEntry;
    }

    return { kind: "native" };
}

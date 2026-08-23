/**
 * Driving cell selection from the keyboard.
 *
 * v9's cell-selection feature ships no key handling at all — it exposes `moveCellSelection`,
 * `extendCellSelection`, `setFocusedCell`, `selectAllCells` and `resetCellSelection` and leaves the
 * bindings to the application. In a read-only grid that is a short job. Here it is not, because this
 * grid has no edit mode: every cell is a live input, so **every key this feature wants already means
 * something to the control under the caret**. Arrow keys move the caret, Shift+arrow extends a text
 * selection, Ctrl+A selects the field's text.
 *
 * The rule below resolves that by reusing the boundary convention the grid already established for
 * plain arrows in `useGridCellNavigation`: a caret key belongs to the control until the caret can no
 * longer absorb it — at the start of the text for Left, the end for Right, the first or last line for
 * Up and Down — and only then does it belong to the grid. Extending that same rule to Shift+arrow is
 * what makes range selection reachable without taking text selection away.
 *
 * Two keys are deliberately left entirely to the control:
 *
 * - **Ctrl/Cmd+A** inside a text control selects that field's text, as it does today. There is no
 *   caret boundary that would ever free it up, so binding it to `selectAllCells` would delete a
 *   native behaviour outright. Select-all-cells needs an affordance that is not a keystroke already
 *   spoken for. `selectAllCells` is therefore **not wired in this port** rather than removed: the
 *   API is installed on the table and simply has no gesture bound to it. Nothing regressed — cell
 *   selection did not exist before this port at all.
 * - **Escape** inside a text control is left alone, matching the existing document handler which
 *   returns early for inputs — popovers and comboboxes close on it.
 *
 * Pure, and takes the caret state as data. {@link readFocusedControlBoundary} is the only part that
 * touches the DOM.
 */

import type { CellSelectionDirection } from "@tanstack/table-core";

/** What a key should do to the cell selection, if anything. */
export type TransactionCellKeyIntent =
    /** Not ours — the focused control keeps the keystroke and its native behaviour. */
    | { readonly kind: "ignore" }
    /** Collapse the selection onto the neighbouring cell. */
    | { readonly kind: "move"; readonly direction: CellSelectionDirection }
    /** Extend the active range one cell, anchor unmoved. */
    | { readonly kind: "extend"; readonly direction: CellSelectionDirection }
    /** Drop the cell selection. */
    | { readonly kind: "clear" };

/**
 * How much of a caret key the focused control can still absorb.
 *
 * A non-text control absorbs none, so every arrow belongs to the grid immediately — which is what
 * makes the checkbox, status and action columns navigable in one keypress.
 */
export interface FocusedControlBoundary {
    readonly isTextControl: boolean;
    readonly caretAtStart: boolean;
    readonly caretAtEnd: boolean;
    readonly caretOnFirstLine: boolean;
    readonly caretOnLastLine: boolean;
}

/** A non-text control: every caret key is the grid's. */
export const NON_TEXT_CONTROL: FocusedControlBoundary = {
    caretAtEnd: true,
    caretAtStart: true,
    caretOnFirstLine: true,
    caretOnLastLine: true,
    isTextControl: false
};

/**
 * A text control whose caret position cannot be read, so no key is ever the grid's.
 *
 * Used for `contentEditable`. Nothing in the grid is contentEditable today, but the existing
 * document-level Escape handler already excludes it alongside inputs and textareas, and treating it
 * as a plain element here would make Escape reachable in a place it currently is not. Preserving that
 * reachability is deliberate: widening it would be a behaviour change smuggled in by a port.
 */
export const UNREADABLE_TEXT_CONTROL: FocusedControlBoundary = {
    caretAtEnd: false,
    caretAtStart: false,
    caretOnFirstLine: false,
    caretOnLastLine: false,
    isTextControl: true
};

interface ArrowKey {
    readonly direction: CellSelectionDirection;
    /** Whether the caret has run out of room in this direction. */
    readonly atBoundary: (boundary: FocusedControlBoundary) => boolean;
}

const ARROW_KEYS: Readonly<Record<string, ArrowKey>> = {
    ArrowDown: { atBoundary: (boundary) => boundary.caretOnLastLine, direction: "down" },
    ArrowLeft: { atBoundary: (boundary) => boundary.caretAtStart, direction: "left" },
    ArrowRight: { atBoundary: (boundary) => boundary.caretAtEnd, direction: "right" },
    ArrowUp: { atBoundary: (boundary) => boundary.caretOnFirstLine, direction: "up" }
};

/**
 * What this keystroke means for the cell selection.
 *
 * Returns `ignore` far more often than not, and that is the point: the default has to be that the
 * control keeps its behaviour, because in this grid the control is always there.
 */
export function transactionCellKeyIntent(
    event: {
        readonly key: string;
        readonly shiftKey: boolean;
        readonly ctrlKey: boolean;
        readonly metaKey: boolean;
    },
    boundary: FocusedControlBoundary
): TransactionCellKeyIntent {
    if (event.key === "Escape") {
        return boundary.isTextControl ? { kind: "ignore" } : { kind: "clear" };
    }

    const arrow = ARROW_KEYS[event.key];
    // A modified arrow other than Shift is a word/document jump belonging to the control.
    if (arrow == null || event.ctrlKey || event.metaKey) return { kind: "ignore" };
    if (boundary.isTextControl && !arrow.atBoundary(boundary)) return { kind: "ignore" };

    return event.shiftKey
        ? { direction: arrow.direction, kind: "extend" }
        : { direction: arrow.direction, kind: "move" };
}

/**
 * Whether an element is rich-text editable.
 *
 * Checks the live property *and* the attribute. `isContentEditable` is the correct answer in a
 * browser — it is true for descendants of an editable host as well — but jsdom does not implement it
 * at all, returning `undefined` even after `element.contentEditable = "true"`. The attribute check is
 * therefore what makes this reachable in a test; keep both, or this becomes a rule nothing verifies.
 */
function isEditableHost(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable) return true;
    const attribute = element.getAttribute("contenteditable");
    return attribute === "" || attribute === "true";
}

/**
 * Reads the caret state off the focused element.
 *
 * Line position is computed from the text either side of the caret rather than from geometry,
 * matching what `useGridCellNavigation` already does: a single-line input is trivially on both its
 * first and last line, so Up and Down leave it on the first keypress.
 */
export function readFocusedControlBoundary(element: Element | null): FocusedControlBoundary {
    if (!(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLInputElement)) {
        return isEditableHost(element) ? UNREADABLE_TEXT_CONTROL : NON_TEXT_CONTROL;
    }
    const { selectionEnd, selectionStart, value } = element;
    if (selectionStart == null || selectionEnd == null) return NON_TEXT_CONTROL;

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    return {
        caretAtEnd: selectionEnd >= value.length,
        caretAtStart: selectionStart <= 0,
        caretOnFirstLine: !before.includes("\n"),
        caretOnLastLine: !after.includes("\n"),
        isTextControl: true
    };
}

/**
 * The table surface this driver needs.
 *
 * Both clear methods are required rather than optional so `clear` cannot be half-applied. Escape is
 * one gesture meaning "clear the selection", and a grid that dropped the rows while leaving a cell
 * range highlighted would be worse than one that did neither.
 */
export interface TransactionCellKeyTarget {
    readonly moveCellSelection: (direction: CellSelectionDirection) => void;
    readonly extendCellSelection: (direction: CellSelectionDirection) => void;
    readonly resetCellSelection: (defaultState?: boolean) => void;
    readonly clearRowSelection: () => void;
}

/**
 * Applies an intent to the table. Returns whether the event should be prevented.
 *
 * `onClearFocus` covers the third thing Escape clears — the grid's own focused-row state, which is
 * component state rather than table state, so the caller has to supply it.
 */
export function applyTransactionCellKeyIntent(
    table: TransactionCellKeyTarget,
    intent: TransactionCellKeyIntent,
    onClearFocus?: () => void
): boolean {
    switch (intent.kind) {
        case "move":
            table.moveCellSelection(intent.direction);
            return true;
        case "extend":
            table.extendCellSelection(intent.direction);
            return true;
        case "clear":
            table.resetCellSelection(true);
            table.clearRowSelection();
            onClearFocus?.();
            return true;
        case "ignore":
            return false;
    }
}

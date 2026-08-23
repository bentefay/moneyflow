/**
 * Deciding whether a copy gesture belongs to the grid or to the browser.
 *
 * This grid has no edit mode: every cell is a live control (see `cells/cell-chrome.ts`), so at any
 * moment the caret is sitting in an input somewhere. That makes Ctrl+C ambiguous in a way it is not
 * in a read-only grid — the user may mean "copy the range of cells I selected" or "copy the words I
 * just highlighted inside this description".
 *
 * A grid-level handler that swallowed Ctrl+C unconditionally would silently delete the second
 * behaviour, and nothing about the grid would look broken: copying would still *work*, it would just
 * copy the wrong thing. So the grid only claims the gesture when it is unambiguous — the user has
 * built a range spanning **more than one** cell, and there is no text selection anywhere that the
 * browser would otherwise copy.
 *
 * Everything here is pure and takes the two facts as inputs. The DOM reading is confined to
 * {@link readTransactionCopyIntent}, so the rule can be tested without staging a document and the
 * reader can be tested without reasoning about the rule.
 */

import {
    type TransactionClipboardPayload,
    transactionSelectionAsClipboardPayload
} from "./clipboard";
import type { TransactionTable } from "./features";

/** The two facts that decide who owns a copy gesture. */
export interface TransactionCopyIntent {
    /**
     * Whether the cell selection spans **more than one** cell.
     *
     * More than one, not at least one, and the difference is the whole reason this field is not
     * simply "is a cell selected". The grid anchors its single-cell selection on *focus*, so a caret
     * merely parked in a description cell already selects that cell. Treating that as the grid's
     * copy would change Ctrl+C in a focused-but-unhighlighted input from copying nothing to copying
     * the cell — a behaviour nobody asked for, arriving as a side effect of focus tracking. A range
     * the user built with Shift+arrow is an unambiguous request for the grid's copy; a caret is not.
     */
    readonly hasMultiCellSelection: boolean;
    /**
     * Whether anything the browser would copy is selected as text — inside the focused control or
     * across the document.
     */
    readonly hasTextSelection: boolean;
}

export type TransactionCopyDecision =
    /** The grid copies its cell range and the event must be prevented. */
    | { readonly kind: "grid" }
    /**
     * The browser copies. The handler must not call `preventDefault`, and must not write to the
     * clipboard — including when there is nothing to copy, because suppressing a no-op copy still
     * costs the user the native behaviour on the next attempt inside a control.
     */
    | { readonly kind: "native" };

/**
 * Who owns this copy gesture.
 *
 * Text selection wins whenever it exists. That asymmetry is deliberate: a text selection is always
 * something the user made just now with an explicit gesture, whereas a cell range can be minutes
 * old and still lying around from an earlier click.
 */
export function transactionCopyDecision(intent: TransactionCopyIntent): TransactionCopyDecision {
    if (intent.hasTextSelection) return { kind: "native" };
    return intent.hasMultiCellSelection ? { kind: "grid" } : { kind: "native" };
}

/**
 * Whether a focused control holds a text selection of its own.
 *
 * Only text-bearing controls have one. `selectionStart`/`selectionEnd` throw on inputs whose type
 * does not support them (`number`, `checkbox`), which is why the type is narrowed by capability
 * rather than by tag name.
 */
export function controlHasTextSelection(element: Element | null): boolean {
    if (!(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLInputElement)) {
        return false;
    }
    const { selectionEnd, selectionStart } = element;
    return selectionStart != null && selectionEnd != null && selectionStart !== selectionEnd;
}

/** Whether the document holds a text selection spanning anything at all. */
export function documentHasTextSelection(selection: Selection | null): boolean {
    return selection != null && !selection.isCollapsed && selection.toString().length > 0;
}

/** Reads the two facts off a live document. */
export function readTransactionCopyIntent(
    table: TransactionTable,
    where: { readonly activeElement: Element | null; readonly selection: Selection | null }
): TransactionCopyIntent {
    return {
        // Strictly greater than one: see the field's own note. `getSelectedCellCount` is rectangle
        // arithmetic, so asking for the size costs nothing over asking whether it is empty.
        hasMultiCellSelection: table.getSelectedCellCount() > 1,
        hasTextSelection:
            controlHasTextSelection(where.activeElement) ||
            documentHasTextSelection(where.selection)
    };
}

/**
 * What a Ctrl/Cmd+C on the grid should do, and the payload if it is the grid's to serve.
 *
 * Returns the payload rather than writing to the clipboard so the caller owns the one side effect
 * and this stays testable without a clipboard permission.
 */
export function transactionCopyOnKeyDown(
    table: TransactionTable,
    event: { readonly key: string; readonly ctrlKey: boolean; readonly metaKey: boolean },
    where: { readonly activeElement: Element | null; readonly selection: Selection | null }
): TransactionClipboardPayload | null {
    if (event.key.toLowerCase() !== "c" || !(event.ctrlKey || event.metaKey)) return null;
    const decision = transactionCopyDecision(readTransactionCopyIntent(table, where));
    if (decision.kind === "native") return null;
    return transactionSelectionAsClipboardPayload(table);
}

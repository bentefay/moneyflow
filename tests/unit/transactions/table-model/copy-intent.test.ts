/**
 * Who owns Ctrl+C.
 *
 * The named regression risk is the one this file is built around: every cell in this grid is a live
 * control, so a user can always have text highlighted inside an input, and a grid-level copy handler
 * that claimed Ctrl+G unconditionally would silently take that away. "Copying still works" is what
 * makes it dangerous — it would copy the wrong thing, with nothing looking broken.
 *
 * So the assertions are written the way round that can catch it: each one that expects the grid to
 * copy has a sibling with a text selection present that expects the browser to, and the DOM cases
 * use real elements with real `setSelectionRange` calls rather than a described state.
 */

import { describe, expect, it } from "vitest";

import {
    controlHasTextSelection,
    documentHasTextSelection,
    transactionCopyDecision,
    transactionCopyOnKeyDown
} from "@/components/features/transactions/table-model/copy-intent";

import { createTestTransactionTable, type TestTransactionTable, transaction } from "./test-table";

const NO_SELECTION = { activeElement: null, selection: null };
const COPY = { ctrlKey: true, key: "c", metaKey: false };

/**
 * A range the user built deliberately: two cells, which is what the grid's copy is gated on.
 *
 * Two rows of one column rather than one row of two, so the serialised text carries the row separator
 * and a single-cell result could not be mistaken for it.
 */
function tableWithMultiCellSelection(): TestTransactionTable {
    const table = createTestTransactionTable({
        transactions: [
            transaction({ description: "Coffee", id: "tx-0" }),
            transaction({ description: "Tea", id: "tx-1" })
        ]
    });
    table.selectCellRange({
        anchorColumnId: "description",
        anchorRowId: "tx-0",
        focusColumnId: "description",
        focusRowId: "tx-1"
    });
    return table;
}

/**
 * Exactly what a caret parked in a cell produces, because the grid anchors single-cell selection on
 * focus. Ctrl+C here must stay the browser's.
 */
function tableWithOnlyTheFocusedCell(): TestTransactionTable {
    const table = createTestTransactionTable({
        transactions: [transaction({ description: "Coffee", id: "tx-0" })]
    });
    table.setFocusedCell("tx-0", "description");
    return table;
}

/** A live text input holding a selection, the way an amount or description cell does. */
function inputWithSelection(value: string, start: number, end: number): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    document.body.append(input);
    input.setSelectionRange(start, end);
    return input;
}

describe("the decision rule", () => {
    it("gives the gesture to the grid only when a multi-cell range is selected and no text is", () => {
        expect(
            transactionCopyDecision({ hasMultiCellSelection: true, hasTextSelection: false })
        ).toEqual({ kind: "grid" });
    });

    it("gives it to the browser whenever text is selected, even with a range selected too", () => {
        // The asymmetry that protects native copy: a text selection is always a gesture the user
        // just made, while a cell range can be stale from an earlier click.
        expect(
            transactionCopyDecision({ hasMultiCellSelection: true, hasTextSelection: true })
        ).toEqual({ kind: "native" });
    });

    it("gives it to the browser when nothing is selected at all", () => {
        expect(
            transactionCopyDecision({ hasMultiCellSelection: false, hasTextSelection: false })
        ).toEqual({ kind: "native" });
    });
});

describe("reading a text selection off a control", () => {
    it("sees a selection inside a text input", () => {
        expect(controlHasTextSelection(inputWithSelection("Coffee Shop", 0, 6))).toBe(true);
    });

    it("does not see a bare caret as a selection", () => {
        expect(controlHasTextSelection(inputWithSelection("Coffee Shop", 3, 3))).toBe(false);
    });

    it("sees a selection inside a textarea, as the notes cell has", () => {
        const textarea = document.createElement("textarea");
        textarea.value = "Line one\nLine two";
        document.body.append(textarea);
        textarea.setSelectionRange(0, 8);

        expect(controlHasTextSelection(textarea)).toBe(true);
    });

    it("does not throw on a control with no text selection API", () => {
        // `selectionStart` throws on these input types rather than returning null, which is why the
        // reader narrows by capability and not by tag name.
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        expect(() => controlHasTextSelection(checkbox)).not.toThrow();
        expect(controlHasTextSelection(checkbox)).toBe(false);
    });

    it("treats no focused element as no selection", () => {
        expect(controlHasTextSelection(null)).toBe(false);
    });

    it("sees a document-wide selection, as a drag across row text makes", () => {
        const paragraph = document.createElement("p");
        paragraph.textContent = "Groceries";
        document.body.append(paragraph);
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        expect(documentHasTextSelection(selection)).toBe(true);

        selection?.removeAllRanges();
        expect(documentHasTextSelection(selection)).toBe(false);
    });
});

describe("the grid's keydown handler", () => {
    it("copies the cell range when the caret is merely parked in a control", () => {
        const table = tableWithMultiCellSelection();
        const input = inputWithSelection("Coffee", 3, 3);

        const payload = transactionCopyOnKeyDown(table, COPY, {
            activeElement: input,
            selection: null
        });

        expect(payload?.text).toBe("Coffee\nTea");
    });

    it("DOES NOT copy when only the focused cell is selected, so a parked caret keeps native copy", () => {
        // The grid anchors its single-cell selection on focus, so this is the state of *every* cell
        // the user clicks into. Claiming Ctrl+C here would turn "copy nothing" into "copy this cell"
        // as a side effect of moving the caret, which is a behaviour change and not a port.
        const table = tableWithOnlyTheFocusedCell();
        expect(table.getSelectedCellCount()).toBe(1);

        expect(transactionCopyOnKeyDown(table, COPY, NO_SELECTION)).toBeNull();
    });

    it("DOES NOT copy when text is selected inside the focused control", () => {
        // The regression. A user highlighting part of a description and pressing Ctrl+C must get the
        // browser's copy of those characters, not the grid's copy of a stale cell range.
        const table = tableWithMultiCellSelection();
        const input = inputWithSelection("Coffee Shop", 0, 6);

        expect(
            transactionCopyOnKeyDown(table, COPY, { activeElement: input, selection: null })
        ).toBeNull();
    });

    it("DOES NOT copy when text is selected across the document", () => {
        const table = tableWithMultiCellSelection();
        const paragraph = document.createElement("p");
        paragraph.textContent = "Groceries";
        document.body.append(paragraph);
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        expect(
            transactionCopyOnKeyDown(table, COPY, { activeElement: null, selection })
        ).toBeNull();
        selection?.removeAllRanges();
    });

    it("does nothing when no cell is selected at all", () => {
        const table = createTestTransactionTable({
            transactions: [transaction({ id: "tx-0" })]
        });

        expect(transactionCopyOnKeyDown(table, COPY, NO_SELECTION)).toBeNull();
    });

    it("ignores keys that are not a copy", () => {
        const table = tableWithMultiCellSelection();

        expect(
            transactionCopyOnKeyDown(
                table,
                { ctrlKey: false, key: "c", metaKey: false },
                NO_SELECTION
            )
        ).toBeNull();
        expect(
            transactionCopyOnKeyDown(
                table,
                { ctrlKey: true, key: "v", metaKey: false },
                NO_SELECTION
            )
        ).toBeNull();
    });

    it("accepts Cmd+C and an upper-case key", () => {
        const table = tableWithMultiCellSelection();

        expect(
            transactionCopyOnKeyDown(
                table,
                { ctrlKey: false, key: "C", metaKey: true },
                NO_SELECTION
            )?.text
        ).toBe("Coffee\nTea");
    });
});

/**
 * Keyboard bindings for cell selection, against a grid whose every cell is a live input.
 *
 * Each direction is asserted twice on purpose — once with the caret mid-text, where the control must
 * keep the key, and once at the boundary, where the grid takes it. A suite that only checked the
 * boundary case would pass just as happily against a handler that hijacked every arrow key and broke
 * typing in every cell of the grid.
 */

import { describe, expect, it, vi } from "vitest";

import {
    applyTransactionCellKeyIntent,
    NON_TEXT_CONTROL,
    readFocusedControlBoundary,
    transactionCellKeyIntent,
    UNREADABLE_TEXT_CONTROL
} from "@/components/features/transactions/table-model/cell-key-intent";

const PLAIN = { ctrlKey: false, metaKey: false, shiftKey: false };
const SHIFT = { ctrlKey: false, metaKey: false, shiftKey: true };

/** A single-line input with the caret at a given offset. */
function textInput(value: string, caret: number): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    document.body.append(input);
    input.setSelectionRange(caret, caret);
    return input;
}

function textArea(value: string, caret: number): HTMLTextAreaElement {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.append(textarea);
    textarea.setSelectionRange(caret, caret);
    return textarea;
}

describe("arrow keys inside a text control", () => {
    it("belong to the control while the caret can still absorb them", () => {
        const midText = readFocusedControlBoundary(textInput("Coffee Shop", 4));

        // Horizontal only: a single-line input has no line for the caret to move to, so Up and Down
        // are never absorbable there. Vertical containment is a multi-line concern and is covered
        // against a notes textarea below.
        for (const key of ["ArrowLeft", "ArrowRight"]) {
            expect(transactionCellKeyIntent({ ...PLAIN, key }, midText), key).toEqual({
                kind: "ignore"
            });
        }
    });

    it("belong to the grid once the caret is at the matching boundary", () => {
        const atStart = readFocusedControlBoundary(textInput("Coffee Shop", 0));
        const atEnd = readFocusedControlBoundary(textInput("Coffee Shop", 11));

        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowLeft" }, atStart)).toEqual({
            direction: "left",
            kind: "move"
        });
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowRight" }, atEnd)).toEqual({
            direction: "right",
            kind: "move"
        });
    });

    it("treat a single-line input as being on both its first and last line", () => {
        // So Up and Down leave a one-line cell on the first keypress, rather than needing the caret
        // moved somewhere it cannot go.
        const midText = readFocusedControlBoundary(textInput("Coffee Shop", 4));

        expect(midText.caretOnFirstLine).toBe(true);
        expect(midText.caretOnLastLine).toBe(true);
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowUp" }, midText)).toEqual({
            direction: "up",
            kind: "move"
        });
    });

    it("stay with a multi-line notes textarea until the caret reaches its first or last line", () => {
        const middleLine = readFocusedControlBoundary(textArea("one\ntwo\nthree", 5));
        const firstLine = readFocusedControlBoundary(textArea("one\ntwo\nthree", 1));
        const lastLine = readFocusedControlBoundary(textArea("one\ntwo\nthree", 12));

        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowUp" }, middleLine)).toEqual({
            kind: "ignore"
        });
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowDown" }, middleLine)).toEqual({
            kind: "ignore"
        });
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowUp" }, firstLine)).toEqual({
            direction: "up",
            kind: "move"
        });
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowDown" }, lastLine)).toEqual({
            direction: "down",
            kind: "move"
        });
    });
});

describe("arrow keys outside a text control", () => {
    it("belong to the grid immediately", () => {
        // The checkbox, status and action columns hold no caret, so navigation costs one keypress.
        expect(transactionCellKeyIntent({ ...PLAIN, key: "ArrowRight" }, NON_TEXT_CONTROL)).toEqual(
            {
                direction: "right",
                kind: "move"
            }
        );
    });

    it("are reported as non-text for a checkbox, without throwing", () => {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        expect(readFocusedControlBoundary(checkbox)).toEqual(NON_TEXT_CONTROL);
    });

    it("are reported as non-text when nothing is focused", () => {
        expect(readFocusedControlBoundary(null)).toEqual(NON_TEXT_CONTROL);
    });

    it("treat a contentEditable element as an unreadable text control, preserving reachability", () => {
        // The existing document-level Escape handler already excludes contentEditable alongside
        // inputs. Nothing in the grid is contentEditable today, but treating it as a plain element
        // would make Escape reachable somewhere it currently is not — a behaviour change smuggled in
        // by a port rather than chosen.
        // Set via the attribute, not the property: jsdom leaves `isContentEditable` undefined and
        // does not even reflect the property onto the attribute, so the property alone would make
        // this assertion unreachable.
        const editable = document.createElement("div");
        editable.setAttribute("contenteditable", "true");
        document.body.append(editable);

        expect(readFocusedControlBoundary(editable)).toEqual(UNREADABLE_TEXT_CONTROL);
        expect(
            transactionCellKeyIntent({ ...PLAIN, key: "Escape" }, UNREADABLE_TEXT_CONTROL)
        ).toEqual({ kind: "ignore" });
        expect(
            transactionCellKeyIntent({ ...PLAIN, key: "ArrowRight" }, UNREADABLE_TEXT_CONTROL)
        ).toEqual({ kind: "ignore" });
    });
});

describe("shift-arrow", () => {
    it("extends the text selection while the caret can still absorb it", () => {
        const midText = readFocusedControlBoundary(textInput("Coffee Shop", 4));

        expect(transactionCellKeyIntent({ ...SHIFT, key: "ArrowRight" }, midText)).toEqual({
            kind: "ignore"
        });
    });

    it("extends the cell range once the caret is at the boundary", () => {
        const atEnd = readFocusedControlBoundary(textInput("Coffee Shop", 11));

        expect(transactionCellKeyIntent({ ...SHIFT, key: "ArrowRight" }, atEnd)).toEqual({
            direction: "right",
            kind: "extend"
        });
    });

    it("extends the cell range immediately outside a text control", () => {
        expect(transactionCellKeyIntent({ ...SHIFT, key: "ArrowDown" }, NON_TEXT_CONTROL)).toEqual({
            direction: "down",
            kind: "extend"
        });
    });
});

describe("keys the control keeps outright", () => {
    it("leaves Ctrl/Cmd+A to select the field's text", () => {
        const atStart = readFocusedControlBoundary(textInput("Coffee Shop", 0));

        for (const modifier of [
            { ctrlKey: true, metaKey: false },
            { ctrlKey: false, metaKey: true }
        ]) {
            expect(
                transactionCellKeyIntent({ ...modifier, key: "a", shiftKey: false }, atStart)
            ).toEqual({ kind: "ignore" });
        }
    });

    it("leaves a Ctrl/Cmd-modified arrow as a word or document jump", () => {
        const atStart = readFocusedControlBoundary(textInput("Coffee Shop", 0));

        expect(
            transactionCellKeyIntent(
                { ctrlKey: true, key: "ArrowLeft", metaKey: false, shiftKey: false },
                atStart
            )
        ).toEqual({ kind: "ignore" });
    });

    it("leaves Escape inside a text control to close whatever popover is open", () => {
        const midText = readFocusedControlBoundary(textInput("Coffee Shop", 4));

        expect(transactionCellKeyIntent({ ...PLAIN, key: "Escape" }, midText)).toEqual({
            kind: "ignore"
        });
    });

    it("clears the cell selection on Escape outside a text control", () => {
        expect(transactionCellKeyIntent({ ...PLAIN, key: "Escape" }, NON_TEXT_CONTROL)).toEqual({
            kind: "clear"
        });
    });

    it("ignores an unrelated key", () => {
        expect(transactionCellKeyIntent({ ...PLAIN, key: "k" }, NON_TEXT_CONTROL)).toEqual({
            kind: "ignore"
        });
    });
});

describe("applying an intent", () => {
    const table = () => ({
        clearRowSelection: vi.fn(),
        extendCellSelection: vi.fn(),
        moveCellSelection: vi.fn(),
        resetCellSelection: vi.fn()
    });

    it("moves and extends, reporting that the event was handled", () => {
        const move = table();
        expect(applyTransactionCellKeyIntent(move, { direction: "up", kind: "move" })).toBe(true);
        expect(move.moveCellSelection).toHaveBeenCalledWith("up");

        const extend = table();
        expect(applyTransactionCellKeyIntent(extend, { direction: "left", kind: "extend" })).toBe(
            true
        );
        expect(extend.extendCellSelection).toHaveBeenCalledWith("left");
    });

    it("clears cells, rows and focus as one gesture", () => {
        // Escape means "clear the selection". Dropping the rows but leaving a cell range highlighted
        // would be worse than doing neither, so all three move together.
        const clear = table();
        const onClearFocus = vi.fn();

        expect(applyTransactionCellKeyIntent(clear, { kind: "clear" }, onClearFocus)).toBe(true);
        expect(clear.resetCellSelection).toHaveBeenCalledWith(true);
        expect(clear.clearRowSelection).toHaveBeenCalledTimes(1);
        expect(onClearFocus).toHaveBeenCalledTimes(1);
    });

    it("does nothing and reports unhandled for `ignore`, so the control keeps the key", () => {
        const ignored = table();
        const onClearFocus = vi.fn();

        expect(applyTransactionCellKeyIntent(ignored, { kind: "ignore" }, onClearFocus)).toBe(
            false
        );
        expect(ignored.moveCellSelection).not.toHaveBeenCalled();
        expect(ignored.extendCellSelection).not.toHaveBeenCalled();
        expect(ignored.resetCellSelection).not.toHaveBeenCalled();
        expect(ignored.clearRowSelection).not.toHaveBeenCalled();
        expect(onClearFocus).not.toHaveBeenCalled();
    });
});

/**
 * The gestures that make cell selection reachable, at the grid level.
 *
 * The model layer's own tests drive `setFocusedCell` and `extendCellSelection` directly. What they
 * cannot see is the *wiring*: whether focus actually anchors a cell, whether Shift+arrow reaches
 * `extendCellSelection` through the caret-boundary rule, and whether the grid publishes the resulting
 * state where anything can observe it. A model that is perfect and unreachable would pass every one of
 * those tests, so these go through the real DOM instead.
 *
 * `aria-selected` on a `gridcell` is the observable, and it is the product surface too — the ARIA grid
 * pattern's way of saying a cell is selected. Deliberately not a paint: UR-005 requires these cells to
 * rest without chrome, so the selection is announced rather than drawn.
 *
 * Two gestures are deliberately absent and are asserted absent below, because "we chose not to" and
 * "we forgot" look identical otherwise: mouse drag, and Ctrl+C over a single focused cell.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
    NO_TRANSACTION_ROWS_SELECTED,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

import { contiguousRowWindow, installVirtualGridLayout } from "./virtual-grid-harness";

vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

/**
 * The tags cell's dropdown is a `cmdk` command list, which observes its own size on mount. jsdom has
 * no `ResizeObserver`, so without this the dropdown throws while mounting and the portal case below
 * cannot open at all. Same stand-in as `tests/unit/components/description-alias-interactions.test.tsx`.
 */
class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverMock));
afterAll(() => vi.unstubAllGlobals());

const ROW_COUNT = 4;

function createTransactions(): TransactionRowData[] {
    return Array.from({ length: ROW_COUNT }, (unused, index) => ({
        id: `transaction-${String(index)}`,
        date: "2026-01-01",
        description: `Row ${String(index)}`,
        amount: -100 * (index + 1),
        currency: "USD"
    }));
}

function renderGrid() {
    return render(
        <TransactionTable
            rowWindow={contiguousRowWindow(createTransactions())}
            matchingRowCount={ROW_COUNT}
            rowOrder={transactionRowOrderFromIds([])}
            rowSelection={NO_TRANSACTION_ROWS_SELECTED}
            onRowSelectionChange={() => undefined}
            matchingRowsChange={null}
            onMatchingSetReconciled={() => undefined}
            onTransactionDelete={() => undefined}
        />
    );
}

/** Every cell currently reporting itself as selected, as `rowIndex:marker`. */
function selectedCells(): readonly string[] {
    const rows = screen.getAllByTestId("transaction-row");
    return rows.flatMap((row, rowIndex) =>
        [...row.querySelectorAll('[aria-selected="true"][data-cell]')].map(
            (cell) => `${String(rowIndex)}:${cell.getAttribute("data-cell") ?? ""}`
        )
    );
}

/** The description input of one row, which is a live text control as every data cell is. */
function descriptionInput(rowIndex: number): HTMLInputElement {
    const input = screen
        .getAllByTestId("transaction-row")
        [rowIndex].querySelector<HTMLInputElement>('[data-testid="description-editable"]');
    if (input == null) throw new Error("the description input is not mounted");
    return input;
}

/**
 * Focuses a description cell for real, and puts the caret where the caller asks.
 *
 * `fireEvent.focus` dispatches the event without moving `document.activeElement`, which is what the
 * grid reads to decide whether the caret still has room for a Shift+arrow. Under that stand-in every
 * cell looks like a non-text control and every arrow looks like the grid's — so the boundary rule
 * would never be exercised, and these tests would pass without testing it.
 */
function focusDescription(rowIndex: number, caret: "start" | "end"): HTMLInputElement {
    const input = descriptionInput(rowIndex);
    act(() => input.focus());
    expect(document.activeElement).toBe(input);
    const offset = caret === "start" ? 0 : input.value.length;
    act(() => input.setSelectionRange(offset, offset));
    return input;
}

describe("cell selection gestures", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
    });
    afterEach(() => restoreLayout());

    it("anchors the single-cell selection on the focused cell", () => {
        renderGrid();
        expect(selectedCells()).toEqual([]);

        focusDescription(1, "end");

        // One cell, and the one the caret is in. No new gesture was needed to get here, which is the
        // point: focus already moves by arrow, Tab and click.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it("moves the anchor with the caret rather than accumulating cells", () => {
        renderGrid();

        focusDescription(1, "end");
        focusDescription(2, "end");

        expect(selectedCells()).toEqual(["2:description"]);
    });

    it("drops the selection when focus leaves the rangeable cells", () => {
        renderGrid();
        focusDescription(1, "end");
        expect(selectedCells()).toEqual(["1:description"]);

        // The checkbox is a cell of the row but takes no part in ranges — selection is a row property
        // there. Leaving a stale anchor behind would let the next Shift+arrow extend a range from a
        // cell the caret is not in.
        const checkbox = screen
            .getAllByTestId("transaction-row")[1]
            .querySelector<HTMLElement>('[data-cell="checkbox"] button');
        if (checkbox == null) throw new Error("the row checkbox is not mounted");
        act(() => checkbox.focus());

        expect(selectedCells()).toEqual([]);
    });

    it("extends the range with Shift+ArrowDown once the caret is at the end of its text", () => {
        renderGrid();
        // A single-line input is trivially on both its first and last line, so Down is the grid's.
        const input = focusDescription(1, "end");

        fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });

        expect(selectedCells()).toEqual(["1:description", "2:description"]);
    });

    it("extends sideways too, one cell per keystroke, from a fixed anchor", () => {
        renderGrid();
        const input = focusDescription(1, "end");

        fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
        expect(selectedCells()).toEqual(["1:description", "1:account"]);

        fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
        expect(selectedCells()).toEqual(["1:description", "1:account", "1:tags"]);
    });

    it("leaves Shift+arrow to the control while the caret still has text to select", () => {
        renderGrid();
        // Caret at the start, so Shift+Right belongs to the input: there is text to highlight.
        const input = focusDescription(1, "start");

        fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });

        // Still just the anchor. This is the assertion that separates "the grid claims the key at the
        // boundary" from "the grid claims the key", and the second would silently delete text
        // selection inside every cell in the table.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it("clears the range on Escape outside a text control", () => {
        renderGrid();
        const input = focusDescription(1, "end");
        fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
        expect(selectedCells()).toHaveLength(2);

        // Escape *inside* a text control stays native, so popovers and comboboxes keep closing.
        fireEvent.keyDown(input, { key: "Escape" });
        expect(selectedCells()).toHaveLength(2);

        // From the row chrome, which is not a text control, it is the grid's.
        const chrome = screen.getAllByTestId("transaction-row")[1];
        act(() => chrome.focus());
        fireEvent.keyDown(chrome, { key: "Escape" });
        expect(selectedCells()).toEqual([]);
    });

    it("keeps the anchor when focus moves into a cell's own portaled editor", async () => {
        renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];

        // The gesture a browser performs on a click in the tags cell: its display area takes focus,
        // which anchors the cell, and then the chooser opens.
        const tagsCell = row.querySelector<HTMLElement>('[data-cell="tags"] [tabindex="0"]');
        const tagsTrigger = row.querySelector<HTMLElement>(
            '[data-cell="tags"] [data-testid="tags-editable"]'
        );
        if (tagsCell == null || tagsTrigger == null)
            throw new Error("the tags cell is not mounted");
        act(() => tagsCell.focus());
        expect(selectedCells()).toEqual(["1:tags"]);

        await act(async () => {
            fireEvent.click(tagsTrigger);
            await Promise.resolve();
        });

        // The chooser renders into `document.body`, so its focus events bubble through the React
        // *tree* while the focused element sits outside the row's DOM. Both halves are asserted
        // because either one alone would let the case pass without the hazard being present.
        const dropdown = document.querySelector("[data-owned-by-row]");
        expect(dropdown).not.toBeNull();
        expect(row.contains(dropdown)).toBe(false);
        expect(document.activeElement).not.toBeNull();
        expect(row.contains(document.activeElement)).toBe(false);
        expect(dropdown?.contains(document.activeElement)).toBe(true);

        // And the anchor is still the cell whose editor is open. An earlier version read the portal's
        // focus as focus leaving the row and cleared the selection here — which in the browser wrote
        // table state during the mousedown inside the popover. The synchronous re-render replaced the
        // element the mouse was pressing, so no click ever completed: the date cell's calendar never
        // saved and never closed, silently and with no error.
        expect(selectedCells()).toEqual(["1:tags"]);
    });

    it("selects only the cell a pointer lands on, and adds nothing when the pointer moves", () => {
        renderGrid();
        const first = descriptionInput(1);

        // What a click does: it focuses the cell's control, and focus is the anchor.
        act(() => first.focus());
        expect(selectedCells()).toEqual(["1:description"]);

        fireEvent.mouseDown(first);
        fireEvent.mouseEnter(descriptionInput(2));
        fireEvent.mouseUp(descriptionInput(2));

        // No drag binding, deliberately: mousedown is how a caret is placed and a text selection
        // begun in these cells, so a drag-to-select range would fight the gesture it shares. Ranges
        // are keyboard-only, and this pins that the omission stays an omission.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it("does not advertise a selection state on cells that cannot be selected", () => {
        renderGrid();
        focusDescription(1, "end");

        const row = screen.getAllByTestId("transaction-row")[1];
        for (const marker of ["checkbox", "expand", "delete"]) {
            const cell = row.querySelector(`[data-cell="${marker}"]`);
            expect(cell).not.toBeNull();
            expect(cell?.hasAttribute("aria-selected")).toBe(false);
        }
    });
});

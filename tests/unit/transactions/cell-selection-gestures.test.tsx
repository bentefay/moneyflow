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

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
    allocationColumnId,
    asTransactionId,
    NO_TRANSACTION_ROWS_SELECTED,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

import {
    contiguousRowWindow,
    createTestTransactionGridController,
    installVirtualGridLayout,
    updateTestTransactionGridController
} from "./virtual-grid-harness";

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

const previousScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn()
    });
});
afterAll(() => {
    vi.unstubAllGlobals();
    if (previousScrollIntoView == null) Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    else Object.defineProperty(Element.prototype, "scrollIntoView", previousScrollIntoView);
});

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

function renderGrid(
    onTransactionDelete: (transactionId: string) => void = () => undefined,
    onRowSelectionChange = () => undefined,
    transactions = createTransactions()
) {
    const controller = createTestTransactionGridController(transactions);
    const view = render(
        <TransactionTable
            controller={controller}
            rowWindow={contiguousRowWindow(transactions)}
            matchingRowCount={ROW_COUNT}
            rowOrder={transactionRowOrderFromIds(
                transactions.map((transaction) => asTransactionId(transaction.id))
            )}
            rowSelection={NO_TRANSACTION_ROWS_SELECTED}
            onRowSelectionChange={onRowSelectionChange}
            matchingRowsChange={null}
            onMatchingSetReconciled={() => undefined}
            onTransactionDelete={onTransactionDelete}
            availableTags={[{ id: "tag-1", name: "Food" }]}
        />
    );
    return { controller, view };
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

    it("renders one roving gridcell entry stop and no competing row tab stop", () => {
        renderGrid();
        const rows = screen.getAllByTestId("transaction-row");
        expect(rows.every((row) => !row.hasAttribute("tabindex"))).toBe(true);

        const gridcellStops = screen
            .getByTestId("transaction-table")
            .querySelectorAll('[role="gridcell"][tabindex="0"]');
        expect(gridcellStops).toHaveLength(1);
        expect(gridcellStops[0]).toHaveAttribute("data-cell", "checkbox");
    });

    it("publishes absolute logical ARIA indexes including retained notes rows", () => {
        renderGrid();
        const grid = screen.getByTestId("transaction-table");
        const rows = screen.getAllByTestId("transaction-row");
        const header = screen.getByTestId("header-checkbox").closest('[role="row"]');
        if (header == null) throw new Error("the grid header row is not mounted");

        expect(grid).toHaveAttribute("aria-rowcount", "5");
        expect(grid).toHaveAttribute("aria-colcount", "8");
        expect(header).toHaveAttribute("aria-rowindex", "1");
        expect(
            [...header.querySelectorAll('[role="columnheader"]')].map((cell) =>
                cell.getAttribute("aria-colindex")
            )
        ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
        expect(rows[0]).toHaveAttribute("aria-rowindex", "2");
        expect(rows[1]).toHaveAttribute("aria-rowindex", "3");
        expect(
            [...rows[0].querySelectorAll(':scope > [role="gridcell"]')].map((cell) =>
                cell.getAttribute("aria-colindex")
            )
        ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);

        const expandButton = rows[0].querySelector('[data-testid="expand-notes-button"]');
        if (expandButton == null) throw new Error("the notes expansion control is not mounted");
        fireEvent.click(expandButton);
        const notes = screen.getByTestId("notes-row");
        expect(grid).toHaveAttribute("aria-rowcount", "6");
        expect(rows[0]).toHaveAttribute("aria-rowindex", "2");
        expect(notes).toHaveAttribute("aria-rowindex", "3");
        expect(notes.querySelector('[data-cell="notes"]')).toHaveAttribute("aria-colindex", "2");
        expect(notes.querySelector('[data-cell="notes"]')).toHaveAttribute("aria-colspan", "7");
        expect(rows[1]).toHaveAttribute("aria-rowindex", "4");
    });

    it("publishes a full contiguous aria-colindex sequence across dynamic allocations", () => {
        const transactions = createTransactions();
        const controller = createTestTransactionGridController(transactions);
        render(
            <TransactionTable
                controller={controller}
                rowWindow={contiguousRowWindow(transactions)}
                matchingRowCount={ROW_COUNT}
                rowOrder={transactionRowOrderFromIds(
                    transactions.map((transaction) => asTransactionId(transaction.id))
                )}
                rowSelection={NO_TRANSACTION_ROWS_SELECTED}
                onRowSelectionChange={() => undefined}
                matchingRowsChange={null}
                onMatchingSetReconciled={() => undefined}
                allocationColumns={[
                    {
                        field: allocationColumnId("person-1"),
                        label: "First person",
                        personId: "person-1"
                    },
                    {
                        field: allocationColumnId("person-2"),
                        label: "Second person",
                        personId: "person-2"
                    }
                ]}
            />
        );
        const grid = screen.getByTestId("transaction-table");
        const row = screen.getAllByTestId("transaction-row")[0];
        const expected = Array.from({ length: 10 }, (unused, index) => String(index + 1));

        expect(
            [...grid.querySelectorAll(':scope > [role="row"] > [role="columnheader"]')].map(
                (cell) => cell.getAttribute("aria-colindex")
            )
        ).toEqual(expected);
        expect(
            [...row.querySelectorAll('[role="gridcell"]')].map((cell) =>
                cell.getAttribute("aria-colindex")
            )
        ).toEqual(expected);
    });

    it("selects and focuses a cell background while interactive descendants opt out", () => {
        renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
        const descriptionCell = row.querySelector<HTMLElement>('[data-cell="description"]');
        const description = descriptionInput(1);
        if (dateCell == null || descriptionCell == null) {
            throw new Error("the shared gridcell surfaces are not mounted");
        }

        fireEvent.pointerDown(dateCell, { button: 0 });
        expect(document.activeElement).toBe(dateCell);
        expect(selectedCells()).toEqual(["1:date"]);

        fireEvent.pointerDown(description, { button: 0 });
        expect(selectedCells()).toEqual(["1:date"]);
        expect(descriptionCell).toHaveAttribute("data-cell-content", "legacy-interactive");
    });

    it("preserves Shift background extension through wrapper focus propagation", () => {
        const onRowSelectionChange = vi.fn();
        const { controller } = renderGrid(() => undefined, onRowSelectionChange);
        const row = screen.getAllByTestId("transaction-row")[1];
        const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
        const descriptionCell = row.querySelector<HTMLElement>('[data-cell="description"]');
        if (dateCell == null || descriptionCell == null) {
            throw new Error("the shared gridcell surfaces are not mounted");
        }

        fireEvent.pointerDown(dateCell, { button: 0 });
        fireEvent.pointerDown(descriptionCell, { button: 0, shiftKey: true });

        expect(document.activeElement).toBe(descriptionCell);
        expect(selectedCells()).toEqual(["1:date", "1:description"]);
        expect(controller.cellSelectionAtom.get()).toMatchObject([
            {
                anchorColumnId: "date",
                anchorRowId: "transaction-1",
                focusColumnId: "description",
                focusRowId: "transaction-1"
            }
        ]);
        expect(onRowSelectionChange).not.toHaveBeenCalled();
    });

    it.each([
        { ctrlKey: true, label: "Ctrl" },
        { label: "Cmd", metaKey: true }
    ] as const)(
        "preserves $label additive background selection through wrapper focus",
        (modifiers) => {
            const onRowSelectionChange = vi.fn();
            const { controller } = renderGrid(() => undefined, onRowSelectionChange);
            const row = screen.getAllByTestId("transaction-row")[1];
            const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
            const accountCell = row.querySelector<HTMLElement>('[data-cell="account"]');
            if (dateCell == null || accountCell == null) {
                throw new Error("the shared gridcell surfaces are not mounted");
            }

            fireEvent.pointerDown(dateCell, { button: 0 });
            fireEvent.pointerDown(accountCell, { ...modifiers, button: 0 });

            expect(document.activeElement).toBe(accountCell);
            expect(selectedCells()).toEqual(["1:date", "1:account"]);
            expect(controller.cellSelectionAtom.get()).toHaveLength(2);
            expect(onRowSelectionChange).not.toHaveBeenCalled();
        }
    );

    it("returns a descendant-focused cell to one wrapper roving stop on background pointerdown", () => {
        const { controller } = renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const accountCell = row.querySelector<HTMLElement>(
            '[role="gridcell"][data-cell="account"]'
        );
        const accountControl = accountCell?.querySelector<HTMLElement>("button");
        if (accountCell == null || accountControl == null) {
            throw new Error("the account gridcell is not mounted");
        }
        act(() => accountControl.focus());
        expect(accountCell).toHaveAttribute("tabindex", "-1");

        fireEvent.pointerDown(accountCell, { button: 0 });

        expect(document.activeElement).toBe(accountCell);
        expect(controller.cellSelectionAtom.get()).toMatchObject([
            {
                anchorColumnId: "account",
                anchorRowId: "transaction-1",
                focusColumnId: "account",
                focusRowId: "transaction-1"
            }
        ]);
        expect(
            screen
                .getByTestId("transaction-table")
                .querySelectorAll('[role="gridcell"][tabindex="0"]')
        ).toHaveLength(1);
        expect(accountCell).toHaveAttribute("tabindex", "0");
    });

    it("restores one wrapper roving stop when focus returns from an actions descendant", () => {
        const { controller } = renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const actionsCell = row.querySelector<HTMLElement>(
            '[role="gridcell"][data-cell="actions"]'
        );
        const expand = row.querySelector<HTMLElement>('[data-testid="expand-notes-button"]');
        if (actionsCell == null || expand == null) {
            throw new Error("the actions surface is not mounted");
        }

        fireEvent.pointerDown(actionsCell, { button: 0 });
        fireEvent.keyDown(actionsCell, { key: "Home", shiftKey: true });
        const retained = controller.cellSelectionAtom.get();
        expect(selectedCells()).toHaveLength(row.querySelectorAll('[role="gridcell"]').length);

        act(() => expand.focus());
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(actionsCell).toHaveAttribute("tabindex", "0");
        expect(selectedCells()).toEqual([]);

        act(() => actionsCell.focus());

        expect(document.activeElement).toBe(actionsCell);
        expect(controller.cellSelectionAtom.get()).toEqual(retained);
        expect(selectedCells()).toHaveLength(row.querySelectorAll('[role="gridcell"]').length);
        expect(actionsCell).toHaveAttribute("tabindex", "0");
        expect(
            screen
                .getByTestId("transaction-table")
                .querySelectorAll('[role="gridcell"][tabindex="0"]')
        ).toHaveLength(1);
    });

    it("keeps checkbox glyph row selection separate from checkbox background cell selection", () => {
        const onRowSelectionChange = vi.fn();
        renderGrid(() => undefined, onRowSelectionChange);
        const row = screen.getAllByTestId("transaction-row")[1];
        const checkboxCell = row.querySelector<HTMLElement>(
            '[role="gridcell"][data-cell="checkbox"]'
        );
        const checkbox = row.querySelector<HTMLElement>(
            '[role="gridcell"][data-cell="checkbox"] button'
        );
        if (checkboxCell == null || checkbox == null) {
            throw new Error("the checkbox surface is not mounted");
        }

        fireEvent.click(checkbox);
        expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
        expect(selectedCells()).toEqual([]);

        fireEvent.pointerDown(checkboxCell, { button: 0 });
        expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(checkboxCell);
        expect(selectedCells()).toEqual(["1:checkbox"]);
    });

    it("moves gridcell focus through the controller's pure navigation bridge", () => {
        renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
        const descriptionCell = row.querySelector<HTMLElement>('[data-cell="description"]');
        if (dateCell == null || descriptionCell == null) {
            throw new Error("the shared gridcell surfaces are not mounted");
        }
        act(() => dateCell.focus());

        fireEvent.keyDown(dateCell, { key: "ArrowRight" });

        expect(document.activeElement).toBe(descriptionCell);
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it.each([
        { ctrlKey: true, label: "Ctrl" },
        { label: "Cmd", metaKey: true }
    ] as const)(
        "leaves $label+Arrow native on shared wrappers and legacy text controls",
        (modifiers) => {
            const { controller } = renderGrid();
            const row = screen.getAllByTestId("transaction-row")[1];
            const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
            if (dateCell == null) throw new Error("the date gridcell is not mounted");
            act(() => dateCell.focus());
            const wrapperSelection = controller.cellSelectionAtom.get();

            for (const key of ["ArrowRight", "ArrowDown"] as const) {
                const nativeDefaultAllowed = fireEvent.keyDown(dateCell, { ...modifiers, key });
                expect(nativeDefaultAllowed).toBe(true);
                expect(document.activeElement).toBe(dateCell);
                expect(controller.cellSelectionAtom.get()).toEqual(wrapperSelection);
            }

            const input = focusDescription(1, "end");
            const textSelection = controller.cellSelectionAtom.get();
            const nativeDefaultAllowed = fireEvent.keyDown(input, {
                ...modifiers,
                key: "ArrowRight"
            });
            expect(nativeDefaultAllowed).toBe(true);
            expect(document.activeElement).toBe(input);
            expect(controller.cellSelectionAtom.get()).toEqual(textSelection);
        }
    );

    it("parks retained canonical selection without exposing aria selection", () => {
        const { controller } = renderGrid();
        const dateCell = screen
            .getAllByTestId("transaction-row")[1]
            .querySelector<HTMLElement>('[data-cell="date"]');
        if (dateCell == null) throw new Error("the date gridcell is not mounted");
        act(() => dateCell.focus());
        expect(selectedCells()).toEqual(["1:date"]);

        fireEvent.keyDown(dateCell, { key: "Escape" });

        expect(selectedCells()).toEqual([]);
        expect(dateCell.hasAttribute("aria-selected")).toBe(false);
        expect(dateCell).toHaveAttribute("tabindex", "0");

        act(() => dateCell.focus());
        expect(selectedCells()).toEqual(["1:date"]);
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
    });

    it("parks a retained range on verified external blur and never steals filter focus on rebase", async () => {
        const { controller } = renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
        if (dateCell == null) throw new Error("the date gridcell is not mounted");
        act(() => dateCell.focus());
        fireEvent.keyDown(dateCell, { key: "ArrowRight", shiftKey: true });
        const retained = controller.cellSelectionAtom.get();
        const filter = document.createElement("input");
        filter.setAttribute("aria-label", "Filter transactions");
        document.body.append(filter);

        act(() => filter.focus());
        await act(async () => Promise.resolve());

        expect(document.activeElement).toBe(filter);
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toEqual(retained);
        expect(selectedCells()).toEqual([]);

        act(() =>
            updateTestTransactionGridController(controller, [
                createTransactions()[1],
                createTransactions()[2]
            ])
        );
        await act(async () => Promise.resolve());

        expect(document.activeElement).toBe(filter);
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toEqual(retained);
        filter.remove();
    });

    it("suppresses pending-target bubbling until redirected focus aborts and restores origin", async () => {
        const transactions = createTransactions();
        const controller = createTestTransactionGridController(transactions);
        const onTransactionFocus = vi.fn();
        const onTransactionFieldFocus = vi.fn();
        render(
            <TransactionTable
                controller={controller}
                rowWindow={contiguousRowWindow(transactions)}
                matchingRowCount={ROW_COUNT}
                rowOrder={transactionRowOrderFromIds(
                    transactions.map((transaction) => asTransactionId(transaction.id))
                )}
                rowSelection={NO_TRANSACTION_ROWS_SELECTED}
                onRowSelectionChange={() => undefined}
                matchingRowsChange={null}
                onMatchingSetReconciled={() => undefined}
                onTransactionFocus={onTransactionFocus}
                onTransactionFieldFocus={onTransactionFieldFocus}
            />
        );
        const rows = screen.getAllByTestId("transaction-row");
        const origin = rows[1].querySelector<HTMLElement>('[role="gridcell"][data-cell="date"]');
        const target = rows[2].querySelector<HTMLInputElement>(
            '[data-testid="description-editable"]'
        );
        if (origin == null || target == null) {
            throw new Error("the focus origin and pending target are not mounted");
        }
        act(() => origin.focus());
        const originSelection = controller.cellSelectionAtom.get();
        const external = document.createElement("input");
        document.body.append(external);
        onTransactionFocus.mockClear();
        onTransactionFieldFocus.mockClear();
        const accepted = controller.beginActivation({
            entry: "full",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-2")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        target.addEventListener("focus", () => external.focus(), { once: true });

        expect(controller.focusPendingActivation(accepted)).toBe("stale");
        await act(async () => Promise.resolve());

        expect(controller.getSnapshot().failure).toMatchObject({ kind: "focus-failed" });
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.cellSelectionAtom.get()).toEqual(originSelection);
        expect(document.activeElement).toBe(origin);
        expect(onTransactionFocus).not.toHaveBeenCalledWith("transaction-2");
        expect(onTransactionFieldFocus).not.toHaveBeenCalledWith("transaction-2", "description");
        external.remove();
    });

    it.each([
        { columnId: "checkbox", endpointKey: "Home", shiftKey: true },
        { columnId: "actions", endpointKey: "End", shiftKey: false }
    ] as const)(
        "parks before native $columnId boundary Tab exits the grid",
        ({ columnId, endpointKey, shiftKey }) => {
            const { controller } = renderGrid();
            const initialCell = screen
                .getAllByTestId("transaction-row")[0]
                .querySelector<HTMLElement>('[role="gridcell"][data-cell="description"]');
            if (initialCell == null) throw new Error("the initial gridcell is not mounted");
            act(() => initialCell.focus());
            fireEvent.keyDown(initialCell, { ctrlKey: true, key: endpointKey });
            const cell = document.activeElement;
            if (!(cell instanceof HTMLElement))
                throw new Error("the boundary gridcell is not focused");
            expect(cell).toHaveAttribute("data-cell", columnId);
            expect(controller.cellSelectionAtom.get()).toHaveLength(1);

            const nativeDefaultAllowed = fireEvent.keyDown(cell, { key: "Tab", shiftKey });

            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            expect(controller.cellSelectionAtom.get()).toHaveLength(1);
            expect(cell).not.toHaveAttribute("aria-selected");
            expect(cell).toHaveAttribute("tabindex", "0");
            expect(nativeDefaultAllowed).toBe(true);
        }
    );

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

    it("targets the row whose non-rangeable checkbox holds focus for delete shortcuts", () => {
        const onTransactionDelete = vi.fn();
        renderGrid(onTransactionDelete);
        const row = screen.getAllByTestId("transaction-row")[2];
        const checkbox = row.querySelector<HTMLElement>('[data-cell="checkbox"] button');
        if (checkbox == null) throw new Error("the row checkbox is not mounted");

        act(() => checkbox.focus());
        expect(document.activeElement).toBe(checkbox);
        expect(row).toHaveAttribute("aria-selected", "false");
        expect(selectedCells()).toEqual([]);

        fireEvent.keyDown(checkbox, { key: "d" });

        expect(onTransactionDelete).toHaveBeenCalledTimes(1);
        expect(onTransactionDelete).toHaveBeenCalledWith("transaction-2");
    });

    it.each([
        { key: "d", selector: '[data-cell="checkbox"] button', surface: "checkbox" },
        { key: "Delete", selector: '[data-cell="checkbox"] button', surface: "checkbox" },
        { key: "Backspace", selector: '[data-cell="checkbox"] button', surface: "checkbox" },
        { key: "d", selector: '[data-testid="expand-notes-button"]', surface: "actions" },
        { key: "Delete", selector: '[data-testid="expand-notes-button"]', surface: "actions" },
        { key: "Backspace", selector: '[data-testid="expand-notes-button"]', surface: "actions" }
    ])(
        "targets the focused row B $surface descendant for $key with a retained row A range",
        ({ key, selector }) => {
            const onTransactionDelete = vi.fn();
            const { controller } = renderGrid(onTransactionDelete);
            const rows = screen.getAllByTestId("transaction-row");
            const rowA = rows[1];
            const rowB = rows[2];
            const anchor = rowA.querySelector<HTMLElement>('[role="gridcell"][data-cell="date"]');
            const activation = rowB.querySelector<HTMLElement>(selector);
            if (anchor == null || activation == null) {
                throw new Error("the retained range or activation surface is not mounted");
            }
            fireEvent.pointerDown(anchor, { button: 0 });
            fireEvent.keyDown(anchor, { key: "ArrowRight", shiftKey: true });
            const retained = controller.cellSelectionAtom.get();

            act(() => activation.focus());

            expect(document.activeElement).toBe(activation);
            expect(controller.cellSelectionAtom.get()).toEqual(retained);
            expect(controller.getSnapshot()).toMatchObject({
                focusRetentionTransactionId: "transaction-2",
                pins: [
                    { kind: "focus-retention", transactionId: "transaction-2" },
                    { kind: "active-origin", transactionId: "transaction-1" }
                ]
            });

            fireEvent.keyDown(activation, { key });

            expect(onTransactionDelete).toHaveBeenCalledTimes(1);
            expect(onTransactionDelete).toHaveBeenCalledWith("transaction-2");
            expect(onTransactionDelete).not.toHaveBeenCalledWith("transaction-1");
        }
    );

    it.each(["d", "Delete", "Backspace"])(
        "does not route direct gridcell %s to row deletion",
        (key) => {
            const onTransactionDelete = vi.fn();
            renderGrid(onTransactionDelete);
            const cell = screen
                .getAllByTestId("transaction-row")[2]
                .querySelector<HTMLElement>('[role="gridcell"][data-cell="date"]');
            if (cell == null) throw new Error("the date gridcell is not mounted");
            act(() => cell.focus());

            fireEvent.keyDown(cell, { key });

            expect(onTransactionDelete).not.toHaveBeenCalled();
        }
    );

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

    it.each([
        { gesture: "Enter", populated: false },
        { gesture: "double-click", populated: false },
        { gesture: "Enter", populated: true },
        { gesture: "double-click", populated: true }
    ] as const)(
        "activates Search tags for $gesture with populated=$populated",
        async ({ gesture, populated }) => {
            const transactions = createTransactions().map((transaction, index) =>
                index === 1 && populated
                    ? { ...transaction, tags: [{ id: "tag-1", name: "Food" }] }
                    : transaction
            );
            renderGrid(
                () => undefined,
                () => undefined,
                transactions
            );
            const row = screen.getAllByTestId("transaction-row")[1];
            const tagsCell = row.querySelector<HTMLElement>('[role="gridcell"][data-cell="tags"]');
            if (tagsCell == null) throw new Error("the tags gridcell is not mounted");
            act(() => tagsCell.focus());

            if (gesture === "Enter") fireEvent.keyDown(tagsCell, { key: "Enter" });
            else fireEvent.doubleClick(tagsCell);

            const search = await screen.findByPlaceholderText("Search tags...");
            await waitFor(() => expect(document.activeElement).toBe(search));
            if (populated) {
                expect(screen.getByRole("button", { name: "Remove Food" })).not.toHaveFocus();
            }
        }
    );

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

        fireEvent.pointerDown(first);
        fireEvent.mouseEnter(descriptionInput(2));
        fireEvent.mouseUp(descriptionInput(2));

        // No drag binding, deliberately: mousedown is how a caret is placed and a text selection
        // begun in these cells, so a drag-to-select range would fight the gesture it shares. Ranges
        // are keyboard-only, and this pins that the omission stays an omission.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it.each([false, true])(
        "keeps actions as one legacy navigation stop when duplicate badge present is %s",
        (hasDuplicate) => {
            const transactions = createTransactions().map((transaction, index) =>
                index === 1 && hasDuplicate
                    ? { ...transaction, possibleDuplicateOf: "transaction-0" }
                    : transaction
            );
            renderGrid(
                () => undefined,
                () => undefined,
                transactions
            );
            const row = screen.getAllByTestId("transaction-row")[1];
            const amount = row.querySelector<HTMLInputElement>('[data-cell="amount"] input');
            const expand = row.querySelector<HTMLElement>('[data-testid="expand-notes-button"]');
            if (amount == null || expand == null) {
                throw new Error("the amount and actions controls are not mounted");
            }

            act(() => expand.focus());
            fireEvent.keyDown(expand, { key: "ArrowLeft" });
            expect(document.activeElement).toBe(amount);

            act(() => amount.setSelectionRange(amount.value.length, amount.value.length));
            fireEvent.keyDown(amount, { key: "ArrowRight" });
            expect(document.activeElement).toBe(expand);
            expect(row.querySelectorAll('[data-cell="actions"] [data-cell]')).toHaveLength(0);
            if (hasDuplicate) {
                expect(row.querySelectorAll('[title="Potential duplicate"]')).toHaveLength(1);
                expect(document.activeElement).not.toHaveAttribute("title", "Potential duplicate");
            }
        }
    );

    it("advertises selectable activation cells without promoting nested controls", () => {
        renderGrid();
        focusDescription(1, "end");

        const row = screen.getAllByTestId("transaction-row")[1];
        for (const marker of ["checkbox", "actions"]) {
            const cell = row.querySelector(`[data-cell="${marker}"]`);
            expect(cell).toHaveAttribute("role", "gridcell");
            expect(cell).toHaveAttribute("aria-selected", "false");
        }
        expect(row.querySelectorAll(':scope > [data-cell="actions"]')).toHaveLength(1);
        expect(row.querySelectorAll('[data-cell="actions"] [data-cell]')).toHaveLength(0);
        for (const marker of ["expand", "delete"]) {
            const control = row.querySelector(`[data-legacy-action="${marker}"]`);
            expect(control).not.toBeNull();
            expect(control?.hasAttribute("aria-selected")).toBe(false);
            expect(control).toHaveAttribute("role", "presentation");
        }
    });
});

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

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountOption } from "@/components/features/accounts";
import * as allocationColumns from "@/components/features/transactions/allocation-columns";
import type { AllocationColumn } from "@/components/features/transactions/allocation-columns";
import * as amountDraft from "@/components/features/transactions/cells/amount-draft";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    type TransactionGridEditorCommitResult
} from "@/components/features/transactions/cells/editor-lifecycle";
import type { StatusOption } from "@/components/features/transactions/cells/InlineEditableStatus";
import { SearchFilter } from "@/components/features/transactions/filters/SearchFilter";
import {
    allocationColumnId,
    asTransactionId,
    NO_TRANSACTION_ROWS_SELECTED,
    type TransactionColumnId,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";
import { TransactionTableToolbar } from "@/components/features/transactions/TransactionTableToolbar";
import { allocationPresenceField } from "@/lib/crdt/allocations";
import * as dateFormat from "@/lib/utils/date-format";

import {
    contiguousRowWindow,
    createTestTransactionGridController,
    installVirtualGridLayout,
    updateTestTransactionGridController
} from "./virtual-grid-harness";

const addAccountMutation = vi.hoisted(() => vi.fn());
vi.mock("@/lib/crdt/context", () => ({
    useActivePeople: () => ({}),
    useVaultAction: () => addAccountMutation
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

const previousHasPointerCapture = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "hasPointerCapture"
);
const previousScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(Element.prototype, "hasPointerCapture", {
        configurable: true,
        value: () => false
    });
    Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn()
    });
});
afterAll(() => {
    vi.unstubAllGlobals();
    if (previousHasPointerCapture == null) {
        Reflect.deleteProperty(Element.prototype, "hasPointerCapture");
    } else {
        Object.defineProperty(Element.prototype, "hasPointerCapture", previousHasPointerCapture);
    }
    if (previousScrollIntoView == null) Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    else Object.defineProperty(Element.prototype, "scrollIntoView", previousScrollIntoView);
});

const ROW_COUNT = 4;

function transactionToolbar(onAddClick: () => void): ReactNode {
    return (
        <TransactionTableToolbar
            inspectorOpen={true}
            onAddClick={onAddClick}
            onInspectorOpenChange={() => undefined}
        />
    );
}

function createTransactions(): TransactionRowData[] {
    return Array.from({ length: ROW_COUNT }, (unused, index) => ({
        id: `transaction-${String(index)}`,
        date: "2026-01-01",
        description: `Row ${String(index)}`,
        amount: -100 * (index + 1),
        currency: "USD"
    }));
}

interface GridConfiguration {
    readonly allocationColumns?: readonly AllocationColumn[];
    readonly availableAccounts?: AccountOption[];
    readonly availableStatuses?: StatusOption[];
    readonly externalControls?: ReactNode;
    readonly onResolveDuplicate?: (transactionId: string) => void;
    readonly onTransactionAllocationUpdate?: (
        transactionId: string,
        personId: string,
        value: number
    ) => TransactionGridEditorCommitResult;
    readonly onTransactionClick?: (transactionId: string) => void;
    readonly onTransactionTagsCommit?: (
        transactionId: string,
        tagIds: string[],
        createdTags: readonly { readonly id: string; readonly name: string }[]
    ) => TransactionGridEditorCommitResult;
    readonly onTransactionUpdate?: (
        transactionId: string,
        updates: Partial<TransactionRowData>
    ) => void;
}

function renderGrid(
    onTransactionDelete: (transactionId: string) => void = () => undefined,
    onRowSelectionChange = () => undefined,
    transactions = createTransactions(),
    onTransactionBlur = () => undefined,
    {
        allocationColumns = [],
        availableAccounts = [],
        availableStatuses = [],
        externalControls,
        onResolveDuplicate,
        onTransactionAllocationUpdate,
        onTransactionClick,
        onTransactionTagsCommit,
        onTransactionUpdate
    }: GridConfiguration = {}
) {
    const controller = createTestTransactionGridController(transactions, allocationColumns);
    const view = render(
        <>
            {externalControls}
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
                onTransactionBlur={onTransactionBlur}
                onTransactionUpdate={onTransactionUpdate}
                onTransactionAllocationUpdate={onTransactionAllocationUpdate}
                onTransactionTagsCommit={onTransactionTagsCommit}
                onTransactionClick={onTransactionClick}
                onResolveDuplicate={onResolveDuplicate}
                allocationColumns={allocationColumns}
                availableAccounts={availableAccounts}
                availableStatuses={availableStatuses}
                availableTags={[{ id: "tag-1", name: "Food" }]}
            />
        </>
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

function transactionCell(rowIndex: number, columnId: TransactionColumnId): HTMLElement {
    const cell = screen
        .getAllByTestId("transaction-row")
        [rowIndex].querySelector<HTMLElement>(`[role="gridcell"][data-cell="${columnId}"]`);
    if (cell == null) throw new Error(`the ${columnId} gridcell is not mounted`);
    return cell;
}

function completePendingEditorActivation(
    controller: ReturnType<typeof createTestTransactionGridController>,
    columnId: TransactionColumnId,
    expectedKind: "editing" | "interacting" = "editing"
): void {
    const pending = controller.getPendingRequest();
    if (pending == null) throw new Error(`the ${columnId} editor activation was not accepted`);
    act(() => {
        if (!controller.markRevealApplied(pending.state)) {
            throw new Error(`the ${columnId} editor reveal was not applied`);
        }
        if (controller.focusPendingActivation(pending.state) !== "focused") {
            throw new Error(`the ${columnId} editor did not receive focus`);
        }
    });
    expect(controller.getInteractionState()).toMatchObject({ kind: expectedKind });
}

/** Enters the production display-first lifecycle and waits for the real editor to own focus. */
function activateCellEditor(
    controller: ReturnType<typeof createTestTransactionGridController>,
    rowIndex: number,
    columnId: TransactionColumnId,
    expectedKind: "editing" | "interacting" = "editing"
): HTMLElement {
    const cell = transactionCell(rowIndex, columnId);
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: "Enter" });
    completePendingEditorActivation(controller, columnId, expectedKind);
    return cell;
}

const PERSON_ALLOCATION_COLUMN = {
    field: allocationColumnId("person-1"),
    label: "Ada",
    personId: "person-1",
    presenceField: allocationPresenceField("person-1")
} satisfies AllocationColumn;

type ValidationEditorKind = "allocation" | "amount" | "date";
type ClickOnlyInvalidEditorKind = "allocation" | "amount";
type ValidationActivationKind = "actions" | "checkbox" | "popup";

const CLICK_ONLY_INVALID_EDITOR_KINDS: readonly ClickOnlyInvalidEditorKind[] = [
    "amount",
    "allocation"
];
const ACCEPTED_EXTERNAL_EDITOR_KINDS: readonly ValidationEditorKind[] = [
    "amount",
    "date",
    "allocation"
];

function validationColumn(kind: ValidationEditorKind): TransactionColumnId {
    if (kind === "allocation") return PERSON_ALLOCATION_COLUMN.field;
    return kind;
}

function validationTransactions(): TransactionRowData[] {
    return createTransactions().map((transaction, index) => {
        if (index === 1) return { ...transaction, allocations: { "person-1": 0 } };
        if (index === 2) return { ...transaction, possibleDuplicateOf: "transaction-0" };
        return transaction;
    });
}

function activateValidationEditor(
    controller: ReturnType<typeof createTestTransactionGridController>,
    kind: ValidationEditorKind
): HTMLInputElement {
    const cell = activateCellEditor(controller, 1, validationColumn(kind));
    const editor =
        kind === "allocation"
            ? screen.queryByRole<HTMLInputElement>("textbox", {
                  name: "Ada allocation percentage"
              })
            : cell.querySelector<HTMLInputElement>(`[data-testid="${kind}-editable"]`);
    if (editor == null) throw new Error(`the ${kind} validation editor did not mount`);
    expect(editor).toHaveFocus();
    return editor;
}

function validationActivation(kind: ValidationActivationKind): {
    readonly element: HTMLElement;
    readonly effect: () => unknown;
} {
    const row = screen.getAllByTestId("transaction-row")[2];
    if (kind === "checkbox") {
        const checkbox = row.querySelector<HTMLElement>('[data-cell="checkbox"] button');
        if (checkbox == null) throw new Error("the destination checkbox did not mount");
        return {
            effect: () => checkbox.getAttribute("data-state"),
            element: checkbox
        };
    }
    if (kind === "actions") {
        const action = row.querySelector<HTMLElement>('[data-testid="delete-button"]');
        if (action == null) throw new Error("the destination action did not mount");
        return {
            effect: () => action.getAttribute("title"),
            element: action
        };
    }
    const popup = row.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
    if (popup == null) throw new Error("the destination popup trigger did not mount");
    return {
        effect: () => screen.queryByRole("dialog"),
        element: popup
    };
}

function invalidValidationDraft(kind: ValidationEditorKind): string {
    if (kind === "allocation") return "101";
    if (kind === "amount") return "not-an-amount";
    return "not a date";
}

function validValidationDraft(kind: ValidationEditorKind): string {
    if (kind === "allocation") return "25";
    if (kind === "amount") return "25.00";
    return "25 December 2026";
}

/**
 * Enters a description editor for real, then puts the caret where the caller asks.
 *
 * `fireEvent.focus` dispatches the event without moving `document.activeElement`, which is what the
 * grid reads to decide whether the caret still has room for a Shift+arrow. Under that stand-in every
 * cell looks like a non-text control and every arrow looks like the grid's — so the boundary rule
 * would never be exercised, and these tests would pass without testing it.
 */
function focusDescription(
    controller: ReturnType<typeof createTestTransactionGridController>,
    rowIndex: number,
    caret: "start" | "end"
): HTMLInputElement {
    const cell = activateCellEditor(controller, rowIndex, "description");
    const input = cell.querySelector<HTMLInputElement>('[data-testid="description-editable"]');
    if (input == null) throw new Error("the description editor did not mount");
    expect(document.activeElement).toBe(input);
    const offset = caret === "start" ? 0 : input.value.length;
    act(() => input.setSelectionRange(offset, offset));
    return input;
}

describe("cell selection gestures", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
        addAccountMutation.mockClear();
        restoreLayout = installVirtualGridLayout();
    });
    afterEach(() => {
        restoreLayout();
        vi.restoreAllMocks();
    });

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

    it("publishes fixed absolute logical ARIA row and column indexes", () => {
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
        expect(rows.map((row) => row.getAttribute("aria-rowindex"))).toEqual(["2", "3", "4", "5"]);
        expect(
            [...rows[0].querySelectorAll(':scope > [role="gridcell"]')].map((cell) =>
                cell.getAttribute("aria-colindex")
            )
        ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
        expect(screen.queryByTestId("notes-row")).not.toBeInTheDocument();
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
                        personId: "person-1",
                        presenceField: allocationPresenceField("person-1")
                    },
                    {
                        field: allocationColumnId("person-2"),
                        label: "Second person",
                        personId: "person-2",
                        presenceField: allocationPresenceField("person-2")
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

    it("selects and focuses a cell background while editor descendants opt out", () => {
        const { controller } = renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];
        const dateCell = row.querySelector<HTMLElement>('[data-cell="date"]');
        if (dateCell == null) throw new Error("the date gridcell is not mounted");

        fireEvent.pointerDown(dateCell, { button: 0 });
        expect(document.activeElement).toBe(dateCell);
        expect(selectedCells()).toEqual(["1:date"]);

        const description = focusDescription(controller, 1, "end");
        const selection = controller.cellSelectionAtom.get();
        fireEvent.pointerDown(description, { button: 0 });

        expect(controller.cellSelectionAtom.get()).toEqual(selection);
        expect(selectedCells()).toEqual(["1:description"]);
        expect(transactionCell(1, "description")).toHaveAttribute("data-cell-content", "editor");
    });

    it.each([
        { activation: "checkbox", kind: "amount" },
        { activation: "actions", kind: "date" },
        { activation: "popup", kind: "allocation" }
    ] as const)(
        "blocks a real cross-row $activation activation while $kind validation fails",
        async ({ activation, kind }) => {
            const onResolveDuplicate = vi.fn();
            const onRowSelectionChange = vi.fn();
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionBlur = vi.fn();
            const onTransactionClick = vi.fn();
            const onTransactionDelete = vi.fn();
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                onTransactionDelete,
                onRowSelectionChange,
                validationTransactions(),
                onTransactionBlur,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    onResolveDuplicate,
                    onTransactionAllocationUpdate,
                    onTransactionClick,
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, kind);
            fireEvent.change(editor, { target: { value: invalidValidationDraft(kind) } });
            const sourceAddress = {
                columnId: validationColumn(kind),
                transactionId: asTransactionId("transaction-1")
            };
            const selectionBefore = controller.cellSelectionAtom.get();
            const target = validationActivation(activation);
            const effectBefore = target.effect();

            const pointerDefaultAllowed = fireEvent.pointerDown(target.element, { button: 0 });
            const clickDefaultAllowed = fireEvent.click(target.element);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(pointerDefaultAllowed).toBe(false);
            expect(clickDefaultAllowed).toBe(false);
            expect(target.effect()).toBe(effectBefore);
            expect(editor).toHaveValue(invalidValidationDraft(kind));
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(target.element).not.toHaveFocus();
            expect(controller.cellSelectionAtom.get()).toEqual(selectionBefore);
            expect(onRowSelectionChange).not.toHaveBeenCalled();
            expect(onTransactionClick).not.toHaveBeenCalled();
            expect(onTransactionDelete).not.toHaveBeenCalled();
            expect(onResolveDuplicate).not.toHaveBeenCalled();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            expect(onTransactionBlur).not.toHaveBeenCalled();
            expect(controller.getSnapshot()).toMatchObject({
                editor: { address: sourceAddress },
                interactionKind: "editing"
            });
            const state = controller.getInteractionState();
            if (state.kind !== "editing") {
                throw new Error(`expected editing state, received ${state.kind}`);
            }
        }
    );

    it.each([
        { activation: "checkbox", kind: "amount" },
        { activation: "actions", kind: "date" },
        { activation: "popup", kind: "allocation" }
    ] as const)(
        "permits one real cross-row $activation activation after valid $kind validation",
        async ({ activation, kind }) => {
            const onRowSelectionChange = vi.fn();
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                onRowSelectionChange,
                validationTransactions(),
                () => undefined,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    onResolveDuplicate: () => undefined,
                    onTransactionAllocationUpdate,
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, kind);
            fireEvent.change(editor, { target: { value: validValidationDraft(kind) } });
            const target = validationActivation(activation);

            const pointerDefaultAllowed = fireEvent.pointerDown(target.element, { button: 0 });
            act(() => target.element.focus());
            await act(async () => Promise.resolve());
            fireEvent.click(target.element);
            await act(async () => Promise.resolve());

            expect(pointerDefaultAllowed).toBe(true);
            expect(target.element).toHaveFocus();
            expect(controller.getSnapshot().editor).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            expect(controller.getSnapshot().focusRetentionTransactionId).toBe("transaction-2");
            if (kind === "allocation") {
                expect(onTransactionAllocationUpdate).toHaveBeenCalledTimes(1);
                expect(onTransactionAllocationUpdate).toHaveBeenCalledWith(
                    "transaction-1",
                    "person-1",
                    25
                );
                expect(onTransactionUpdate).not.toHaveBeenCalled();
            } else {
                expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
                expect(onTransactionUpdate).toHaveBeenCalledWith(
                    "transaction-1",
                    kind === "amount" ? { amount: 2_500 } : { date: "2026-12-25" }
                );
                expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            }
            if (activation === "checkbox") {
                expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
            } else if (activation === "actions") {
                expect(target.element).toHaveAttribute("title", "Click again to confirm delete");
                expect(onRowSelectionChange).not.toHaveBeenCalled();
            } else {
                expect(screen.getAllByRole("dialog")).toHaveLength(1);
                expect(onRowSelectionChange).not.toHaveBeenCalled();
            }
        }
    );

    it.each([
        { external: "add", kind: "amount" },
        { external: "filter", kind: "date" },
        { external: "add", kind: "allocation" }
    ] as const)(
        "blocks real external $external activation while $kind validation fails",
        async ({ external, kind }) => {
            const onAddClick = vi.fn();
            const onSearchChange = vi.fn();
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionBlur = vi.fn();
            const onTransactionUpdate = vi.fn();
            const validationSpy =
                kind === "amount"
                    ? vi.spyOn(amountDraft, "validateCurrencyDraft")
                    : kind === "date"
                      ? vi.spyOn(dateFormat, "parseLocaleDate")
                      : vi.spyOn(allocationColumns, "parseAllocationDraft");
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onTransactionBlur,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    externalControls: (
                        <>
                            <SearchFilter value="" onChange={onSearchChange} debounceMs={0} />
                            {transactionToolbar(onAddClick)}
                        </>
                    ),
                    onTransactionAllocationUpdate,
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, kind);
            fireEvent.change(editor, { target: { value: invalidValidationDraft(kind) } });
            validationSpy.mockClear();
            const target = screen.getByTestId(
                external === "add" ? "add-transaction-button" : "search-filter"
            );

            const pointerDefaultAllowed = fireEvent.pointerDown(target, {
                button: 0,
                pointerId: 21
            });
            fireEvent.pointerUp(target, { button: 0, pointerId: 21 });
            const clickDefaultAllowed = fireEvent.click(target);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(pointerDefaultAllowed).toBe(false);
            expect(clickDefaultAllowed).toBe(false);
            expect(editor).toHaveValue(invalidValidationDraft(kind));
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(target).not.toHaveFocus();
            expect(onAddClick).not.toHaveBeenCalled();
            expect(onSearchChange).not.toHaveBeenCalled();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            expect(onTransactionBlur).not.toHaveBeenCalled();
            expect(validationSpy).toHaveBeenCalledTimes(1);
            expect(controller.getSnapshot()).toMatchObject({
                editor: {
                    address: {
                        columnId: validationColumn(kind),
                        transactionId: "transaction-1"
                    }
                },
                interactionKind: "editing"
            });
            validationSpy.mockRestore();
        }
    );

    it.each(ACCEPTED_EXTERNAL_EDITOR_KINDS)(
        "validates and commits valid $kind once before one real external Add activation",
        async (kind) => {
            const onAddClick = vi.fn();
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionBlur = vi.fn();
            const onTransactionUpdate = vi.fn();
            const validationSpy =
                kind === "amount"
                    ? vi.spyOn(amountDraft, "validateCurrencyDraft")
                    : kind === "date"
                      ? vi.spyOn(dateFormat, "parseLocaleDate")
                      : vi.spyOn(allocationColumns, "parseAllocationDraft");
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onTransactionBlur,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    externalControls: transactionToolbar(onAddClick),
                    onTransactionAllocationUpdate,
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, kind);
            fireEvent.change(editor, { target: { value: validValidationDraft(kind) } });
            validationSpy.mockClear();
            const target = screen.getByTestId("add-transaction-button");

            const pointerDefaultAllowed = await act(async () => {
                const allowed = fireEvent.pointerDown(target, {
                    button: 0,
                    pointerId: 22
                });
                fireEvent.pointerUp(target, { button: 0, pointerId: 22 });
                fireEvent.click(target);
                await Promise.resolve();
                await Promise.resolve();
                return allowed;
            });

            expect(pointerDefaultAllowed).toBe(true);
            expect(validationSpy).toHaveBeenCalledTimes(1);
            if (kind === "allocation") {
                expect(onTransactionAllocationUpdate).toHaveBeenCalledTimes(1);
                expect(onTransactionAllocationUpdate).toHaveBeenCalledWith(
                    "transaction-1",
                    "person-1",
                    25
                );
                expect(onTransactionUpdate).not.toHaveBeenCalled();
            } else {
                expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
                expect(onTransactionUpdate).toHaveBeenCalledWith(
                    "transaction-1",
                    kind === "amount" ? { amount: 2_500 } : { date: "2026-12-25" }
                );
                expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            }
            expect(onAddClick).toHaveBeenCalledTimes(1);
            expect(onTransactionBlur).toHaveBeenCalledTimes(1);
            expect(target).toHaveFocus();
            expect(controller.getSnapshot().editor).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            validationSpy.mockRestore();
        }
    );

    it.each(CLICK_ONLY_INVALID_EDITOR_KINDS)(
        "blocks genuine click-only Add activation while $kind validation fails once",
        async (kind) => {
            const onAddClick = vi.fn();
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionBlur = vi.fn();
            const onTransactionUpdate = vi.fn();
            const validationSpy =
                kind === "amount"
                    ? vi.spyOn(amountDraft, "validateCurrencyDraft")
                    : vi.spyOn(allocationColumns, "parseAllocationDraft");
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onTransactionBlur,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    externalControls: transactionToolbar(onAddClick),
                    onTransactionAllocationUpdate,
                    onTransactionUpdate
                }
            );
            const parkSpy = vi.spyOn(controller, "parkExternalFocus");
            const editor = activateValidationEditor(controller, kind);
            fireEvent.change(editor, { target: { value: invalidValidationDraft(kind) } });
            validationSpy.mockClear();
            const addButton = screen.getByTestId("add-transaction-button");

            const clickDefaultAllowed = await act(async () => {
                const allowed = fireEvent.click(addButton);
                await Promise.resolve();
                await Promise.resolve();
                return allowed;
            });

            expect(clickDefaultAllowed).toBe(false);
            expect(validationSpy).toHaveBeenCalledTimes(1);
            expect(onAddClick).not.toHaveBeenCalled();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            expect(onTransactionBlur).not.toHaveBeenCalled();
            expect(parkSpy).not.toHaveBeenCalled();
            expect(editor).toHaveValue(invalidValidationDraft(kind));
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(addButton).not.toHaveFocus();
            expect(controller.getSnapshot()).toMatchObject({
                editor: {
                    address: {
                        columnId: validationColumn(kind),
                        transactionId: "transaction-1"
                    }
                },
                interactionKind: "editing"
            });
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            validationSpy.mockRestore();
            parkSpy.mockRestore();
        }
    );

    it("retains invalid allocation Alt movement and writes once after correction", async () => {
        const onTransactionAllocationUpdate = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                allocationColumns: [PERSON_ALLOCATION_COLUMN],
                onTransactionAllocationUpdate
            }
        );
        const editor = activateValidationEditor(controller, "allocation");
        fireEvent.change(editor, { target: { value: "101" } });

        expect(fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" })).toBe(false);

        expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });

        fireEvent.change(editor, { target: { value: "25" } });
        expect(fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" })).toBe(false);
        await act(async () => Promise.resolve());

        expect(onTransactionAllocationUpdate).toHaveBeenCalledOnce();
        expect(onTransactionAllocationUpdate).toHaveBeenCalledWith("transaction-1", "person-1", 25);
        expect(controller.getPendingRequest()).toMatchObject({
            kind: "edit",
            state: {
                target: {
                    columnId: "amount",
                    transactionId: "transaction-1"
                }
            }
        });
        expect(controller.getInteractionState()).toMatchObject({ kind: "pending-activation" });
    });

    it("commits Amount once before one click-only Add activation", async () => {
        const onAddClick = vi.fn();
        const onTransactionBlur = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            onTransactionBlur,
            {
                externalControls: transactionToolbar(onAddClick),
                onTransactionUpdate
            }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });
        const addButton = screen.getByTestId("add-transaction-button");

        expect(fireEvent.click(addButton)).toBe(true);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
        expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", { amount: 2_500 });
        expect(onAddClick).toHaveBeenCalledTimes(1);
        expect(onTransactionBlur).toHaveBeenCalledTimes(1);
        expect(addButton).toHaveFocus();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
    });

    it("prevents unpaired internal checkbox activation while Date validation fails", async () => {
        const onRowSelectionChange = vi.fn();
        const onTransactionBlur = vi.fn();
        const onTransactionUpdate = vi.fn();
        const parseDateSpy = vi.spyOn(dateFormat, "parseLocaleDate");
        const { controller } = renderGrid(
            () => undefined,
            onRowSelectionChange,
            validationTransactions(),
            onTransactionBlur,
            { onTransactionUpdate }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const editor = activateValidationEditor(controller, "date");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("date") } });
        parseDateSpy.mockClear();
        const target = validationActivation("checkbox");
        const effectBefore = target.effect();

        expect(fireEvent.click(target.element)).toBe(false);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(target.effect()).toBe(effectBefore);
        expect(onRowSelectionChange).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(onTransactionBlur).not.toHaveBeenCalled();
        expect(finishSpy).not.toHaveBeenCalled();
        expect(parseDateSpy).toHaveBeenCalledTimes(1);
        expect(editor).toHaveValue(invalidValidationDraft("date"));
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        expect(target.element).not.toHaveFocus();
        expect(controller.getSnapshot()).toMatchObject({
            editor: { address: { columnId: "date", transactionId: "transaction-1" } },
            interactionKind: "editing"
        });
        parseDateSpy.mockRestore();
    });

    it("commits allocation once before one same-controller unpaired checkbox activation", async () => {
        const onRowSelectionChange = vi.fn();
        const onTransactionAllocationUpdate = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const onTransactionBlur = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            onRowSelectionChange,
            validationTransactions(),
            onTransactionBlur,
            {
                allocationColumns: [PERSON_ALLOCATION_COLUMN],
                onTransactionAllocationUpdate
            }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const editor = activateValidationEditor(controller, "allocation");
        fireEvent.change(editor, { target: { value: validValidationDraft("allocation") } });
        const target = validationActivation("checkbox");

        fireEvent.click(target.element);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionAllocationUpdate).toHaveBeenCalledTimes(1);
        expect(onTransactionAllocationUpdate).toHaveBeenCalledWith("transaction-1", "person-1", 25);
        expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
        expect(onTransactionBlur).not.toHaveBeenCalled();
        expect(finishSpy).toHaveBeenCalledTimes(1);
        expect(target.element).toHaveFocus();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
    });

    it("treats another controller's registered checkbox as an external click boundary", async () => {
        const onSourceBlur = vi.fn();
        const onSourceUpdate = vi.fn();
        const source = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            onSourceBlur,
            { onTransactionUpdate: onSourceUpdate }
        );
        const finishSpy = vi.spyOn(source.controller, "finishEditing");
        const editor = activateValidationEditor(source.controller, "date");
        fireEvent.change(editor, { target: { value: validValidationDraft("date") } });

        const onForeignSelectionChange = vi.fn();
        const foreign = renderGrid(
            () => undefined,
            onForeignSelectionChange,
            validationTransactions()
        );
        const foreignRow = within(foreign.view.container).getAllByTestId("transaction-row")[2];
        const foreignCheckbox = foreignRow.querySelector<HTMLElement>(
            '[data-cell="checkbox"] button'
        );
        if (foreignCheckbox == null) throw new Error("the foreign checkbox did not mount");

        fireEvent.click(foreignCheckbox);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onSourceUpdate).toHaveBeenCalledTimes(1);
        expect(onSourceUpdate).toHaveBeenCalledWith("transaction-1", { date: "2026-12-25" });
        expect(finishSpy).toHaveBeenCalledTimes(1);
        expect(onForeignSelectionChange).toHaveBeenCalledTimes(1);
        expect(onSourceBlur).toHaveBeenCalledTimes(1);
        expect(foreignCheckbox).toHaveFocus();
        expect(source.controller.getSnapshot().editor).toBeNull();
        expect(source.controller.getInteractionState()).toMatchObject({ kind: "parked" });
    });

    it("treats spoofed canonical markers as an external click boundary", async () => {
        const onSourceBlur = vi.fn();
        const onSourceUpdate = vi.fn();
        const onSpoofClick = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            onSourceBlur,
            {
                externalControls: (
                    <div role="gridcell" data-cell-transaction-id="spoof-row" data-column-id="date">
                        <button
                            type="button"
                            onClick={onSpoofClick}
                            data-testid="spoof-gridcell-action"
                        >
                            Spoof action
                        </button>
                    </div>
                ),
                onTransactionUpdate: onSourceUpdate
            }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const editor = activateValidationEditor(controller, "date");
        fireEvent.change(editor, { target: { value: validValidationDraft("date") } });
        const spoofAction = screen.getByTestId("spoof-gridcell-action");

        fireEvent.click(spoofAction);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onSourceUpdate).toHaveBeenCalledTimes(1);
        expect(onSourceUpdate).toHaveBeenCalledWith("transaction-1", { date: "2026-12-25" });
        expect(finishSpy).toHaveBeenCalledTimes(1);
        expect(onSpoofClick).toHaveBeenCalledTimes(1);
        expect(onSourceBlur).toHaveBeenCalledTimes(1);
        expect(spoofAction).toHaveFocus();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
    });

    it("suppresses an invalid pointer gesture when the browser retargets its click to the row", async () => {
        const onRowSelectionChange = vi.fn();
        const onTransactionClick = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            onRowSelectionChange,
            validationTransactions(),
            () => undefined,
            { onTransactionClick, onTransactionUpdate }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
        const destinationRow = screen.getAllByTestId("transaction-row")[2];
        const checkbox = destinationRow.querySelector<HTMLElement>('[data-cell="checkbox"] button');
        if (checkbox == null) throw new Error("the destination checkbox did not mount");

        const pointerDefaultAllowed = fireEvent.pointerDown(checkbox, {
            button: 0,
            pointerId: 31
        });
        fireEvent.pointerUp(destinationRow, { button: 0, pointerId: 31 });
        const clickDefaultAllowed = fireEvent.click(destinationRow);
        await act(async () => Promise.resolve());

        expect(pointerDefaultAllowed).toBe(false);
        expect(clickDefaultAllowed).toBe(false);
        expect(editor).toHaveValue(invalidValidationDraft("amount"));
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        expect(onRowSelectionChange).not.toHaveBeenCalled();
        expect(onTransactionClick).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(controller.getSnapshot()).toMatchObject({
            editor: {
                address: { columnId: "amount", transactionId: "transaction-1" }
            },
            interactionKind: "editing"
        });
    });

    it.each([{ release: "cancel" }, { release: "no-click" }] as const)(
        "clears invalid gesture ownership after $release before the next valid activation",
        async ({ release }) => {
            const onAddClick = vi.fn();
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                () => undefined,
                {
                    externalControls: transactionToolbar(onAddClick),
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, "amount");
            fireEvent.change(editor, {
                target: { value: invalidValidationDraft("amount") }
            });
            const addButton = screen.getByTestId("add-transaction-button");

            expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 41 })).toBe(false);
            if (release === "cancel") {
                fireEvent.pointerCancel(addButton, { pointerId: 41 });
            } else {
                fireEvent.pointerUp(addButton, { button: 0, pointerId: 41 });
                await act(
                    async () =>
                        new Promise<void>((resolve) => {
                            window.setTimeout(resolve, 0);
                        })
                );
            }

            fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });
            expect(fireEvent.click(addButton)).toBe(true);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
            expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", { amount: 2_500 });
            expect(onAddClick).toHaveBeenCalledTimes(1);
            expect(addButton).toHaveFocus();
            expect(controller.getSnapshot().editor).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        }
    );

    it.each(["touch", "pen"] as const)(
        "retains a rejected $pointerType gesture through implicit capture loss until its click",
        (pointerType) => {
            const onAddClick = vi.fn();
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                () => undefined,
                {
                    externalControls: transactionToolbar(onAddClick),
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, "amount");
            fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
            const addButton = screen.getByTestId("add-transaction-button");

            expect(
                fireEvent.pointerDown(addButton, {
                    button: 0,
                    pointerId: 46,
                    pointerType
                })
            ).toBe(false);
            fireEvent.pointerUp(addButton, { button: 0, pointerId: 46, pointerType });
            fireEvent.lostPointerCapture(addButton, { pointerId: 46, pointerType });
            fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });

            expect(fireEvent.click(addButton)).toBe(false);
            expect(onAddClick).not.toHaveBeenCalled();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(editor).toHaveFocus();
            expect(controller.getSnapshot()).toMatchObject({
                editor: { address: { columnId: "amount", transactionId: "transaction-1" } },
                interactionKind: "editing"
            });
        }
    );

    it("keeps a rejected gesture blocked when its source disconnects and click retargets", () => {
        const onRetargetedClick = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            { externalControls: transactionToolbar(() => undefined) }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
        const source = screen.getByTestId("add-transaction-button");
        const retargeted = document.createElement("button");
        retargeted.type = "button";
        retargeted.addEventListener("click", onRetargetedClick);
        document.body.append(retargeted);

        expect(
            fireEvent.pointerDown(source, {
                button: 0,
                pointerId: 49,
                pointerType: "pen"
            })
        ).toBe(false);
        source.remove();
        fireEvent.pointerUp(document.body, { button: 0, pointerId: 49, pointerType: "pen" });
        fireEvent.lostPointerCapture(document.body, { pointerId: 49, pointerType: "pen" });

        expect(fireEvent.click(retargeted)).toBe(false);
        expect(onRetargetedClick).not.toHaveBeenCalled();
        expect(editor).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        retargeted.remove();
    });

    it("keeps pointer one blocked when pointer two starts inside the retained editor", () => {
        const onAddClick = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                externalControls: transactionToolbar(onAddClick),
                onTransactionUpdate
            }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
        const addButton = screen.getByTestId("add-transaction-button");

        expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 47 })).toBe(false);
        fireEvent.pointerDown(editor, { button: 0, pointerId: 48 });
        fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });
        fireEvent.pointerUp(addButton, { button: 0, pointerId: 47 });

        expect(fireEvent.click(addButton)).toBe(false);
        expect(onAddClick).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(editor).toHaveFocus();
        expect(controller.getSnapshot()).toMatchObject({
            editor: { address: { columnId: "amount", transactionId: "transaction-1" } },
            interactionKind: "editing"
        });
    });

    it("clears invalid gesture ownership when its source editor exits", async () => {
        const onAddClick = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                externalControls: transactionToolbar(onAddClick),
                onTransactionUpdate
            }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
        const addButton = screen.getByTestId("add-transaction-button");
        expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 43 })).toBe(false);

        fireEvent.keyDown(editor, { key: "Escape" });
        await act(async () => Promise.resolve());
        expect(controller.getSnapshot().editor).toBeNull();
        expect(fireEvent.click(addButton)).toBe(true);

        expect(onAddClick).toHaveBeenCalledTimes(1);
        expect(onTransactionUpdate).not.toHaveBeenCalled();
    });

    it("clears abandoned invalid ownership before a new valid pointer gesture", async () => {
        const onAddClick = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                externalControls: transactionToolbar(onAddClick),
                onTransactionUpdate
            }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("amount") } });
        const addButton = screen.getByTestId("add-transaction-button");
        expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 44 })).toBe(false);

        fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });
        expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 45 })).toBe(true);
        fireEvent.pointerUp(addButton, { button: 0, pointerId: 45 });
        expect(fireEvent.click(addButton)).toBe(true);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
        expect(onAddClick).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
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

    it("returns an editor-focused cell to one wrapper roving stop on background pointerdown", () => {
        const { controller } = renderGrid();
        const accountCell = activateCellEditor(controller, 1, "account", "interacting");
        const accountSearch = screen.getByPlaceholderText("Search accounts...");
        expect(document.activeElement).toBe(accountSearch);

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
        const deleteButton = row.querySelector<HTMLElement>('[data-testid="delete-button"]');
        if (actionsCell == null || deleteButton == null) {
            throw new Error("the actions surface is not mounted");
        }

        fireEvent.pointerDown(actionsCell, { button: 0 });
        fireEvent.keyDown(actionsCell, { key: "Home", shiftKey: true });
        const retained = controller.cellSelectionAtom.get();
        expect(selectedCells()).toHaveLength(row.querySelectorAll('[role="gridcell"]').length);

        act(() => deleteButton.focus());
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

            const input = focusDescription(controller, 1, "end");
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

    it.each([
        {
            arrow: "ArrowLeft",
            label: "left from an interior cell",
            prepare: [],
            source: { columnId: "description", rowIndex: 1 },
            target: { columnId: "date", rowIndex: 1 }
        },
        {
            arrow: "ArrowRight",
            label: "right from an interior cell",
            prepare: [],
            source: { columnId: "description", rowIndex: 1 },
            target: { columnId: "account", rowIndex: 1 }
        },
        {
            arrow: "ArrowUp",
            label: "up from an interior cell",
            prepare: [],
            source: { columnId: "description", rowIndex: 1 },
            target: { columnId: "description", rowIndex: 0 }
        },
        {
            arrow: "ArrowDown",
            label: "down from an interior cell",
            prepare: [],
            source: { columnId: "description", rowIndex: 1 },
            target: { columnId: "description", rowIndex: 2 }
        },
        {
            arrow: "ArrowUp",
            label: "up from the top boundary",
            prepare: ["ArrowUp"],
            source: { columnId: "description", rowIndex: 0 },
            target: { columnId: "description", rowIndex: 0 }
        },
        {
            arrow: "ArrowDown",
            label: "down from the bottom boundary",
            prepare: ["ArrowDown", "ArrowDown"],
            source: { columnId: "description", rowIndex: 3 },
            target: { columnId: "description", rowIndex: 3 }
        },
        {
            arrow: "ArrowLeft",
            label: "left from the first canonical cell",
            prepare: ["Home"],
            source: { columnId: "checkbox", rowIndex: 1 },
            target: { columnId: "checkbox", rowIndex: 1 }
        },
        {
            arrow: "ArrowRight",
            label: "right from the last canonical cell",
            prepare: ["End"],
            source: { columnId: "actions", rowIndex: 1 },
            target: { columnId: "actions", rowIndex: 1 }
        }
    ] as const)(
        "exposes parked selection and moves $label",
        async ({ arrow, prepare, source, target }) => {
            const { controller } = renderGrid();
            const editedCell = activateCellEditor(controller, 1, "description");
            const editor = editedCell.querySelector<HTMLElement>(
                '[data-testid="description-editable"]'
            );
            if (editor == null) throw new Error("the description editor did not mount");

            fireEvent.keyDown(editor, { key: "Escape" });
            await act(async () => Promise.resolve());

            expect(editedCell).toHaveFocus();
            expect(selectedCells()).toEqual(["1:description"]);
            for (const key of prepare) {
                const focused = document.activeElement;
                if (!(focused instanceof HTMLElement)) throw new Error("a gridcell is not focused");
                fireEvent.keyDown(focused, { key });
            }
            const sourceCell = transactionCell(source.rowIndex, source.columnId);
            expect(sourceCell).toHaveFocus();
            expect(selectedCells()).toEqual([`${String(source.rowIndex)}:${source.columnId}`]);

            fireEvent.keyDown(sourceCell, { key: "Escape" });

            const afterGrid = screen.getByRole("button", { name: "After transactions" });
            expect(afterGrid).toHaveFocus();
            expect(selectedCells()).toEqual([]);
            expect(sourceCell).not.toHaveAttribute("aria-selected");
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });

            expect(fireEvent.keyDown(afterGrid, { key: arrow })).toBe(false);

            const targetCell = transactionCell(target.rowIndex, target.columnId);
            expect(targetCell).toHaveFocus();
            expect(selectedCells()).toEqual([`${String(target.rowIndex)}:${target.columnId}`]);
            expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        }
    );

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

    it.each([
        { external: "filter", kind: "amount" },
        { external: "toolbar", kind: "date" },
        { external: "filter", kind: "allocation" }
    ] as const)(
        "settles invalid $kind validation before parking for external $external focus",
        async ({ external, kind }) => {
            const onTransactionAllocationUpdate = vi.fn(
                () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
            );
            const onTransactionBlur = vi.fn();
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onTransactionBlur,
                {
                    allocationColumns: [PERSON_ALLOCATION_COLUMN],
                    onTransactionAllocationUpdate,
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, kind);
            const sourceAddress = {
                columnId: validationColumn(kind),
                transactionId: asTransactionId("transaction-1")
            };
            fireEvent.change(editor, { target: { value: invalidValidationDraft(kind) } });
            const externalControl = document.createElement(
                external === "filter" ? "input" : "button"
            );
            externalControl.setAttribute(
                "aria-label",
                external === "filter" ? "Filter transactions" : "Transaction toolbar"
            );
            document.body.append(externalControl);

            await act(async () => {
                externalControl.focus();
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(editor).toHaveValue(invalidValidationDraft(kind));
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(editor).toBeInTheDocument();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(onTransactionAllocationUpdate).not.toHaveBeenCalled();
            expect(onTransactionBlur).not.toHaveBeenCalled();
            expect(controller.getSnapshot()).toMatchObject({
                editor: { address: sourceAddress },
                interactionKind: "editing"
            });
            const state = controller.getInteractionState();
            if (state.kind !== "editing") {
                throw new Error(`expected editing state, received ${state.kind}`);
            }
            expect(state.editor.entry).toBe("full");
            expect(controller.cellSelectionAtom.get()).toMatchObject([
                {
                    anchorColumnId: sourceAddress.columnId,
                    anchorRowId: sourceAddress.transactionId,
                    focusColumnId: sourceAddress.columnId,
                    focusRowId: sourceAddress.transactionId
                }
            ]);
            externalControl.remove();
        }
    );

    it("retains an invalid Date editor when focus leaves its exact calendar portal", async () => {
        const onAddClick = vi.fn();
        const onTransactionBlur = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            onTransactionBlur,
            {
                externalControls: transactionToolbar(onAddClick),
                onTransactionUpdate
            }
        );
        const editor = activateValidationEditor(controller, "date");
        fireEvent.change(editor, { target: { value: invalidValidationDraft("date") } });
        const calendarTrigger = transactionCell(1, "date").querySelector<HTMLElement>(
            '[data-grid-open-interaction="calendar"]'
        );
        if (calendarTrigger == null) throw new Error("the Date calendar trigger did not mount");

        fireEvent.pointerDown(calendarTrigger, { button: 0, pointerId: 51 });
        fireEvent.click(calendarTrigger);
        await waitFor(() =>
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "calendar"
            })
        );
        const calendarPortal = document.querySelector<HTMLElement>(
            '[data-owned-by-row="transaction-1"][data-owned-by-field="date"]'
        );
        const calendarControl = calendarPortal?.querySelector<HTMLElement>("button:not(:disabled)");
        if (calendarControl == null) throw new Error("the Date calendar portal did not mount");
        act(() => calendarControl.focus());
        expect(calendarControl).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({ kind: "interacting" });

        const addButton = screen.getByTestId("add-transaction-button");
        await act(async () => {
            addButton.focus();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(editor).toHaveValue(invalidValidationDraft("date"));
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        expect(editor).toBeInTheDocument();
        expect(addButton).not.toHaveFocus();
        expect(onAddClick).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(onTransactionBlur).not.toHaveBeenCalled();
        expect(controller.getSnapshot()).toMatchObject({
            editor: {
                address: { columnId: "date", transactionId: "transaction-1" }
            },
            interactionKind: "editing"
        });
    });

    it.each([{ valid: false }, { valid: true }] as const)(
        "treats a same-address portal registered by another controller as external for valid=$valid",
        async ({ valid }) => {
            const onSourceBlur = vi.fn();
            const onSourceUpdate = vi.fn();
            const source = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onSourceBlur,
                { onTransactionUpdate: onSourceUpdate }
            );
            const editor = activateValidationEditor(source.controller, "date");
            fireEvent.change(editor, {
                target: {
                    value: valid ? validValidationDraft("date") : invalidValidationDraft("date")
                }
            });

            const foreign = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions()
            );
            const foreignPortal = document.createElement("div");
            foreignPortal.dataset.ownedByRow = "transaction-1";
            foreignPortal.dataset.ownedByField = "date";
            const foreignAction = document.createElement("button");
            foreignAction.type = "button";
            const onForeignAction = vi.fn();
            foreignAction.addEventListener("click", onForeignAction);
            foreignPortal.append(foreignAction);
            document.body.append(foreignPortal);
            const unregisterForeignPortal = foreign.controller.registerEditorPortal(
                {
                    columnId: "date",
                    transactionId: asTransactionId("transaction-1")
                },
                foreignPortal
            );

            expect(fireEvent.pointerDown(foreignAction, { button: 0, pointerId: 55 })).toBe(valid);
            fireEvent.pointerUp(foreignAction, { button: 0, pointerId: 55 });
            expect(fireEvent.click(foreignAction)).toBe(valid);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            if (valid) {
                expect(onSourceUpdate).toHaveBeenCalledTimes(1);
                expect(onSourceUpdate).toHaveBeenCalledWith("transaction-1", {
                    date: "2026-12-25"
                });
                expect(onForeignAction).toHaveBeenCalledTimes(1);
                expect(onSourceBlur).toHaveBeenCalledTimes(1);
                expect(foreignAction).toHaveFocus();
                expect(source.controller.getSnapshot().editor).toBeNull();
                expect(source.controller.getInteractionState()).toMatchObject({ kind: "parked" });
            } else {
                expect(onSourceUpdate).not.toHaveBeenCalled();
                expect(onForeignAction).not.toHaveBeenCalled();
                expect(onSourceBlur).not.toHaveBeenCalled();
                expect(editor).toHaveValue(invalidValidationDraft("date"));
                expect(editor).toHaveAttribute("aria-invalid", "true");
                expect(editor).toHaveFocus();
                expect(source.controller.getSnapshot()).toMatchObject({
                    editor: {
                        address: { columnId: "date", transactionId: "transaction-1" }
                    },
                    interactionKind: "editing"
                });
            }

            unregisterForeignPortal();
            foreignPortal.remove();
        }
    );

    it.each(["account", "status", "tags"] as const)(
        "cancels one open %s popup and its editor with one Escape",
        async (kind) => {
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                () => undefined,
                {
                    availableAccounts: [{ id: "account-1", name: "Checking" }],
                    availableStatuses: [{ id: "for-review", name: "For Review" }],
                    onTransactionUpdate
                }
            );
            const sourceCell = activateCellEditor(controller, 1, kind, "interacting");
            const popupControl =
                kind === "account"
                    ? screen.getByPlaceholderText("Search accounts...")
                    : kind === "status"
                      ? screen.getByRole("listbox")
                      : screen.getByPlaceholderText("Search tags...");

            fireEvent.keyDown(popupControl, { key: "Escape" });
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(controller.getSnapshot().editor).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
            expect(sourceCell).toHaveAttribute("data-cell-content", "display");
            expect(sourceCell).toHaveFocus();
            expect(selectedCells()).toEqual([`1:${kind}`]);

            fireEvent.keyDown(sourceCell, { key: "ArrowRight" });

            const destinationColumn =
                kind === "account" ? "tags" : kind === "tags" ? "status" : "amount";
            const destination = transactionCell(1, destinationColumn);
            expect(destination).toHaveFocus();
            expect(destination).toHaveAttribute("data-cell-content", "display");
            expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        }
    );

    it.each([
        {
            direction: "ArrowLeft",
            kind: "account",
            targetColumn: "description",
            targetRow: "transaction-1"
        },
        {
            direction: "ArrowRight",
            kind: "tags",
            targetColumn: "status",
            targetRow: "transaction-1"
        },
        {
            direction: "ArrowUp",
            kind: "status",
            targetColumn: "status",
            targetRow: "transaction-0"
        }
    ] as const)(
        "moves from a real open $kind popup with Alt+$direction",
        async ({ direction, kind, targetColumn, targetRow }) => {
            const onTransactionTagsCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                () => undefined,
                {
                    availableAccounts: [{ id: "account-1", name: "Checking" }],
                    availableStatuses: [{ id: "for-review", name: "For Review" }],
                    onTransactionTagsCommit,
                    onTransactionUpdate
                }
            );
            activateCellEditor(controller, 1, kind, "interacting");
            const popupControl = await (async (): Promise<HTMLElement> => {
                if (kind === "account") {
                    fireEvent.click(await screen.findByRole("option", { name: "Checking" }));
                    await waitFor(() =>
                        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" })
                    );
                    fireEvent.click(screen.getByRole("combobox", { name: "Select account" }));
                    return screen.findByPlaceholderText("Search accounts...");
                }
                if (kind === "tags") {
                    fireEvent.click(await screen.findByRole("option", { name: "Food" }));
                    return screen.findByPlaceholderText("Search tags...");
                }
                return screen.findByRole("listbox");
            })();

            expect(
                fireEvent.keyDown(popupControl, {
                    altKey: true,
                    key: direction
                })
            ).toBe(false);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(controller.getPendingRequest()).toMatchObject({
                kind: "edit",
                state: {
                    target: {
                        columnId: targetColumn,
                        transactionId: targetRow
                    }
                }
            });
            if (kind === "account") {
                expect(onTransactionUpdate).toHaveBeenCalledOnce();
                expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", {
                    accountId: "account-1"
                });
                expect(onTransactionTagsCommit).not.toHaveBeenCalled();
            } else if (kind === "tags") {
                expect(onTransactionTagsCommit).toHaveBeenCalledOnce();
                expect(onTransactionTagsCommit).toHaveBeenCalledWith(
                    "transaction-1",
                    ["tag-1"],
                    []
                );
                expect(onTransactionUpdate).not.toHaveBeenCalled();
            } else {
                expect(onTransactionUpdate).not.toHaveBeenCalled();
                expect(onTransactionTagsCommit).not.toHaveBeenCalled();
            }
        }
    );

    it("retains a rejected Tags draft and open popup after Alt movement", async () => {
        const onTransactionTagsCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_FAILURE);
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            { onTransactionTagsCommit }
        );
        const sourceCell = activateCellEditor(controller, 1, "tags", "interacting");
        fireEvent.click(await screen.findByRole("option", { name: "Food" }));
        const search = await screen.findByPlaceholderText("Search tags...");
        expect(screen.getByRole("button", { name: "Remove Food" })).toBeVisible();

        expect(fireEvent.keyDown(search, { altKey: true, key: "ArrowRight" })).toBe(false);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionTagsCommit).toHaveBeenCalledOnce();
        expect(onTransactionTagsCommit).toHaveBeenCalledWith("transaction-1", ["tag-1"], []);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor"
        });
        expect(sourceCell).toHaveAttribute("data-cell-content", "editor");
        expect(screen.getByPlaceholderText("Search tags...")).toHaveFocus();
        expect(screen.getByRole("button", { name: "Remove Food" })).toBeVisible();
    });

    it("cancels an open Date calendar and its editor with one Escape", async () => {
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            { onTransactionUpdate }
        );
        const sourceCell = activateCellEditor(controller, 1, "date");
        const editor = sourceCell.querySelector<HTMLInputElement>('[data-testid="date-editable"]');
        if (editor == null) throw new Error("the Date editor did not mount");
        fireEvent.change(editor, { target: { value: "not a date" } });

        fireEvent.keyDown(editor, { key: "Tab" });
        await waitFor(() =>
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "calendar"
            })
        );
        const calendar = document.querySelector<HTMLElement>('[data-owned-by-field="date"]');
        if (calendar == null) throw new Error("the Date calendar did not mount");

        expect(fireEvent.keyDown(calendar, { altKey: true, key: "ArrowDown" })).toBe(false);
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(editor).toHaveValue("not a date");
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(calendar).toBeInTheDocument();
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "calendar"
        });

        fireEvent.keyDown(calendar, { key: "Escape" });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(sourceCell).toHaveAttribute("data-cell-content", "display");
        expect(sourceCell).toHaveFocus();
        expect(selectedCells()).toEqual(["1:date"]);
    });

    it.each(["mouse", "touch", "pen"] as const)(
        "resolves a closed Account option draft through $pointerType and Alt movement exactly once",
        async (pointerType) => {
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                () => undefined,
                {
                    availableAccounts: [
                        { id: "account-1", name: "Checking" },
                        { id: "account-2", name: "Savings" }
                    ],
                    onTransactionUpdate
                }
            );
            const finishSpy = vi.spyOn(controller, "finishEditing");
            const accountCell = activateCellEditor(controller, 1, "account", "interacting");
            const accountButton = screen.getByRole("combobox", { name: "Select account" });
            const searchInput = screen.getByPlaceholderText("Search accounts...");
            const savings = await screen.findByRole("option", { name: "Savings" });

            fireEvent.pointerDown(savings, { button: 0, pointerId: 70, pointerType });
            fireEvent.blur(searchInput, { relatedTarget: null });
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(finishSpy).not.toHaveBeenCalled();
            fireEvent.pointerUp(savings, { button: 0, pointerId: 70, pointerType });
            expect(fireEvent.click(savings)).toBe(true);

            await waitFor(() =>
                expect(controller.getInteractionState()).toMatchObject({ kind: "editing" })
            );
            expect(accountCell).toHaveAttribute("data-cell-content", "editor");
            expect(accountButton).toHaveTextContent("Savings");
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(finishSpy).not.toHaveBeenCalled();

            fireEvent.keyDown(accountButton, { altKey: true, key: "ArrowDown" });
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(onTransactionUpdate).toHaveBeenCalledOnce();
            expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", {
                accountId: "account-2"
            });
            expect(finishSpy).not.toHaveBeenCalled();
            expect(controller.getPendingRequest()).toMatchObject({
                kind: "edit",
                state: {
                    target: {
                        columnId: "account",
                        transactionId: "transaction-2"
                    }
                }
            });
        }
    );

    it.each(["mouse", "touch", "pen"] as const)(
        "expires an owned Account $pointerType gesture that ends without a semantic click",
        async (pointerType) => {
            const onAddClick = vi.fn();
            try {
                const onTransactionBlur = vi.fn();
                const { controller } = renderGrid(
                    () => undefined,
                    () => undefined,
                    validationTransactions(),
                    onTransactionBlur,
                    {
                        availableAccounts: [
                            { id: "account-1", name: "Checking" },
                            { id: "account-2", name: "Savings" }
                        ],
                        externalControls: transactionToolbar(onAddClick)
                    }
                );
                activateCellEditor(controller, 1, "account", "interacting");
                const searchInput = screen.getByPlaceholderText("Search accounts...");
                const savings = await screen.findByRole("option", { name: "Savings" });
                vi.useFakeTimers();

                fireEvent.pointerDown(savings, {
                    button: 0,
                    pointerId: 79,
                    pointerType
                });
                fireEvent.blur(searchInput, { relatedTarget: null });
                fireEvent.pointerUp(savings, {
                    button: 0,
                    pointerId: 79,
                    pointerType
                });
                await act(async () => vi.runOnlyPendingTimers());

                const addButton = screen.getByTestId("add-transaction-button");
                expect(fireEvent.click(addButton)).toBe(true);
                await act(async () => {
                    await Promise.resolve();
                    await Promise.resolve();
                });

                expect(onAddClick).toHaveBeenCalledOnce();
                expect(onTransactionBlur).toHaveBeenCalledOnce();
                expect(addButton).toHaveFocus();
                expect(controller.getSnapshot().editor).toBeNull();
                expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            } finally {
                vi.useRealTimers();
            }
        }
    );

    it("keeps Account modal ownership through nested Type and Currency portals", async () => {
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                availableAccounts: [{ id: "account-1", name: "Checking" }],
                onTransactionUpdate
            }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const registerEditorPortal = controller.registerEditorPortal;
        const dialogRootRegistrationFocus: Array<{
            readonly activeElement: Element | null;
            readonly slot: string | null;
        }> = [];
        vi.spyOn(controller, "registerEditorPortal").mockImplementation((address, element) => {
            const slot = element.getAttribute("data-slot");
            if (slot === "dialog-content" || slot === "dialog-overlay") {
                dialogRootRegistrationFocus.push({
                    activeElement: element.ownerDocument.activeElement,
                    slot
                });
            }
            return registerEditorPortal(address, element);
        });
        const accountCell = activateCellEditor(controller, 1, "account", "interacting");
        const setEditorInteraction = controller.setEditorInteraction;
        const popupTransitions: string[] = [];
        vi.spyOn(controller, "setEditorInteraction").mockImplementation((address, popup, open) => {
            const accepted = setEditorInteraction(address, popup, open);
            const state = controller.getInteractionState();
            popupTransitions.push(
                `${popup}:${open ? "open" : "close"}:${state.kind}:${state.kind === "interacting" ? state.popup : "none"}`
            );
            return accepted;
        });
        const createOption = await screen.findByText("Create new account");
        const searchInput = screen.getByPlaceholderText("Search accounts...");
        fireEvent.pointerDown(createOption, { button: 0, pointerId: 71 });
        fireEvent.blur(searchInput, { relatedTarget: null });
        expect(accountCell).toHaveAttribute("data-cell-content", "editor");
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            popup: "combobox"
        });
        expect(finishSpy).not.toHaveBeenCalled();
        fireEvent.pointerUp(createOption, { button: 0, pointerId: 71 });
        expect(fireEvent.click(createOption)).toBe(true);

        await waitFor(() => {
            expect(screen.getByRole("dialog", { name: "Create Account" })).toBeVisible();
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "modal"
            });
        });
        expect(accountCell).toHaveAttribute("data-cell-content", "editor");
        const nameInput = screen.getByLabelText("Name");
        expect(dialogRootRegistrationFocus.map(({ slot }) => slot).sort()).toEqual([
            "dialog-content",
            "dialog-overlay"
        ]);
        expect(
            dialogRootRegistrationFocus.every(({ activeElement }) => activeElement !== nameInput)
        ).toBe(true);
        expect(nameInput).toHaveFocus();
        expect(finishSpy).not.toHaveBeenCalled();
        expect(popupTransitions[0]).toBe("modal:open:interacting:modal");
        expect(popupTransitions).not.toContain("combobox:close:editing:none");

        const typeTrigger = screen.getByRole("combobox", { name: "Type" });
        fireEvent.click(typeTrigger);
        expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
            "Checking",
            "Savings",
            "Credit Card",
            "Cash",
            "Loan"
        ]);
        fireEvent.click(await screen.findByRole("option", { name: "Savings" }));
        await waitFor(() => expect(typeTrigger).toHaveTextContent("Savings"));
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        expect(accountCell).toHaveAttribute("data-cell-content", "editor");
        expect(finishSpy).not.toHaveBeenCalled();

        const currencyTrigger = screen.getByRole("combobox", { name: "Currency" });
        fireEvent.click(currencyTrigger);
        fireEvent.click(await screen.findByRole("option", { name: "EUR - Euro" }));
        await waitFor(() => expect(currencyTrigger).toHaveTextContent("EUR"));
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        expect(accountCell).toHaveAttribute("data-cell-content", "editor");
        expect(finishSpy).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Savings account" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(addAccountMutation).toHaveBeenCalledTimes(1);
        expect(addAccountMutation.mock.calls[0]?.[0]).toMatchObject({
            accountType: "savings",
            currency: "EUR",
            name: "Savings account"
        });
        expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
        expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", {
            accountId: expect.any(String)
        });
        expect(finishSpy).toHaveBeenCalledTimes(1);
        expect(accountCell).toHaveFocus();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
    });

    it("keeps nested Account Select keys widget-owned before one modal Escape cancels the editor", async () => {
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            {
                availableAccounts: [{ id: "account-1", name: "Checking" }],
                onTransactionUpdate
            }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const accountCell = activateCellEditor(controller, 1, "account", "interacting");
        fireEvent.click(await screen.findByText("Create new account"));
        const dialog = await screen.findByRole("dialog", { name: "Create Account" });

        for (const triggerName of ["Type", "Currency"] as const) {
            const trigger = screen.getByRole("combobox", { name: triggerName });
            fireEvent.click(trigger);
            const listbox = await screen.findByRole("listbox");
            const selectionBefore = controller.cellSelectionAtom.get();

            fireEvent.keyDown(listbox, { key: "ArrowDown" });
            fireEvent.keyDown(listbox, { altKey: true, key: "ArrowDown" });

            expect(controller.cellSelectionAtom.get()).toEqual(selectionBefore);
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "modal"
            });
            expect(dialog).toBeVisible();
            expect(accountCell).toHaveAttribute("data-cell-content", "editor");
            expect(finishSpy).not.toHaveBeenCalled();

            fireEvent.keyDown(listbox, { key: "Escape" });
            await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
            expect(dialog).toBeVisible();
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "modal"
            });
        }

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Discarded by Escape" }
        });
        fireEvent.click(screen.getByRole("combobox", { name: "Type" }));
        fireEvent.click(await screen.findByRole("option", { name: "Savings" }));
        fireEvent.click(screen.getByRole("combobox", { name: "Currency" }));
        fireEvent.click(await screen.findByRole("option", { name: "EUR - Euro" }));

        fireEvent.keyDown(dialog, { key: "Escape" });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(dialog).not.toBeInTheDocument();
        expect(addAccountMutation).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(finishSpy).not.toHaveBeenCalled();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(accountCell).toHaveAttribute("data-cell-content", "display");
        expect(accountCell).toHaveFocus();
        expect(selectedCells()).toEqual(["1:account"]);

        fireEvent.keyDown(accountCell, { key: "Enter" });
        completePendingEditorActivation(controller, "account", "interacting");
        fireEvent.click(await screen.findByText("Create new account"));
        const reopened = await screen.findByRole("dialog", { name: "Create Account" });
        expect(screen.getByLabelText("Name")).toHaveValue("");
        expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent("Checking");
        expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("USD");

        fireEvent.keyDown(reopened, { altKey: true, key: "ArrowRight" });
        await waitFor(() => expect(reopened).not.toBeInTheDocument());
        expect(addAccountMutation).not.toHaveBeenCalled();
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(controller.getPendingRequest()).toMatchObject({
            kind: "edit",
            state: {
                target: {
                    columnId: "tags",
                    transactionId: "transaction-1"
                }
            }
        });
    });

    it("treats the Account dialog overlay as one owned cancellation layer", async () => {
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            () => undefined,
            { availableAccounts: [{ id: "account-1", name: "Checking" }] }
        );
        const finishSpy = vi.spyOn(controller, "finishEditing");
        const accountCell = activateCellEditor(controller, 1, "account", "interacting");
        fireEvent.click(await screen.findByText("Create new account"));
        const dialog = await screen.findByRole("dialog", { name: "Create Account" });
        const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
        if (overlay == null) throw new Error("the Create Account overlay did not mount");

        fireEvent.pointerDown(overlay, { button: 0, pointerId: 72 });
        fireEvent.pointerUp(overlay, { button: 0, pointerId: 72 });
        fireEvent.click(overlay);

        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(accountCell).toHaveAttribute("data-cell-content", "editor");
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(finishSpy).not.toHaveBeenCalled();
    });

    it.each([{ valid: false }, { valid: true }] as const)(
        "clears Date trigger-toggle ownership before the first valid=$valid external exit",
        async ({ valid }) => {
            const onAddClick = vi.fn();
            const onTransactionBlur = vi.fn();
            const onTransactionUpdate = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                validationTransactions(),
                onTransactionBlur,
                {
                    externalControls: transactionToolbar(onAddClick),
                    onTransactionUpdate
                }
            );
            const editor = activateValidationEditor(controller, "date");
            fireEvent.change(editor, {
                target: {
                    value: valid ? validValidationDraft("date") : invalidValidationDraft("date")
                }
            });
            const calendarTrigger = transactionCell(1, "date").querySelector<HTMLElement>(
                '[data-grid-open-interaction="calendar"]'
            );
            if (calendarTrigger == null) throw new Error("the Date calendar trigger did not mount");

            fireEvent.pointerDown(calendarTrigger, { button: 0, pointerId: 62 });
            fireEvent.click(calendarTrigger);
            await waitFor(() =>
                expect(controller.getInteractionState()).toMatchObject({
                    kind: "interacting",
                    popup: "calendar"
                })
            );
            const calendarPortal = document.querySelector<HTMLElement>(
                '[data-owned-by-row="transaction-1"][data-owned-by-field="date"]'
            );
            const calendarControl =
                calendarPortal?.querySelector<HTMLElement>("button:not(:disabled)");
            if (calendarControl == null) throw new Error("the Date calendar portal did not mount");
            act(() => calendarControl.focus());

            fireEvent.pointerDown(calendarTrigger, { button: 0, pointerId: 63 });
            fireEvent.click(calendarTrigger);
            await waitFor(() => {
                expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
                expect(editor).toHaveFocus();
            });

            const addButton = screen.getByTestId("add-transaction-button");
            expect(fireEvent.pointerDown(addButton, { button: 0, pointerId: 64 })).toBe(valid);
            fireEvent.pointerUp(addButton, { button: 0, pointerId: 64 });
            expect(fireEvent.click(addButton)).toBe(valid);
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });

            if (valid) {
                expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
                expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", {
                    date: "2026-12-25"
                });
                expect(onAddClick).toHaveBeenCalledTimes(1);
                expect(onTransactionBlur).toHaveBeenCalledTimes(1);
                expect(addButton).toHaveFocus();
                expect(controller.getSnapshot().editor).toBeNull();
                expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
                return;
            }
            expect(editor).toHaveValue(invalidValidationDraft("date"));
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(onTransactionUpdate).not.toHaveBeenCalled();
            expect(onAddClick).not.toHaveBeenCalled();
            expect(onTransactionBlur).not.toHaveBeenCalled();
            expect(controller.getSnapshot()).toMatchObject({
                editor: { address: { columnId: "date", transactionId: "transaction-1" } },
                interactionKind: "editing"
            });
        }
    );

    it("commits a valid external draft once before parking toolbar focus", async () => {
        const onTransactionBlur = vi.fn();
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            validationTransactions(),
            onTransactionBlur,
            { onTransactionUpdate }
        );
        const editor = activateValidationEditor(controller, "amount");
        fireEvent.change(editor, { target: { value: validValidationDraft("amount") } });
        const toolbar = document.createElement("button");
        toolbar.type = "button";
        toolbar.setAttribute("aria-label", "Transaction toolbar");
        document.body.append(toolbar);

        await act(async () => {
            toolbar.focus();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onTransactionUpdate).toHaveBeenCalledTimes(1);
        expect(onTransactionUpdate).toHaveBeenCalledWith("transaction-1", { amount: 2_500 });
        expect(onTransactionBlur).toHaveBeenCalledTimes(1);
        expect(toolbar).toHaveFocus();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        toolbar.remove();
    });

    it("suppresses pending-target bubbling when redirected focus parks the origin", async () => {
        const transactions = createTransactions();
        const controller = createTestTransactionGridController(transactions);
        const onTransactionFocus = vi.fn();
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
            />
        );
        const origin = transactionCell(1, "date");
        act(() => origin.focus());
        const originSelection = controller.cellSelectionAtom.get();
        const external = document.createElement("input");
        document.body.append(external);
        onTransactionFocus.mockClear();
        act(() => {
            controller.beginActivation({
                entry: "full",
                target: {
                    columnId: "description",
                    transactionId: asTransactionId("transaction-2")
                }
            });
        });
        const pending = controller.getPendingRequest();
        const target = transactionCell(2, "description").querySelector<HTMLInputElement>(
            '[data-testid="description-editable"]'
        );
        if (pending == null || target == null) {
            throw new Error("the pending description editor is not mounted");
        }
        target.addEventListener("focus", () => external.focus(), { once: true });

        act(() => {
            expect(controller.markRevealApplied(pending.state)).toBe(true);
            expect(controller.focusPendingActivation(pending.state)).toBe("stale");
        });
        await act(async () => Promise.resolve());

        expect(controller.getSnapshot().failure).toBeNull();
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toEqual(originSelection);
        expect(document.activeElement).toBe(external);
        expect(onTransactionFocus).not.toHaveBeenCalledWith("transaction-2");
        external.remove();
    });

    it("parks before native reverse Tab exits the first checkbox gridcell", () => {
        const { controller } = renderGrid();
        const initialCell = transactionCell(0, "description");
        act(() => initialCell.focus());
        fireEvent.keyDown(initialCell, { ctrlKey: true, key: "Home" });
        const cell = document.activeElement;
        if (!(cell instanceof HTMLElement)) throw new Error("the first gridcell is not focused");
        expect(cell).toHaveAttribute("data-cell", "checkbox");
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.cellSelectionAtom.get()).toHaveLength(1);

        const nativeDefaultAllowed = fireEvent.keyDown(cell, { key: "Tab", shiftKey: true });

        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toHaveLength(1);
        expect(cell).not.toHaveAttribute("aria-selected");
        expect(cell).toHaveAttribute("tabindex", "0");
        expect(nativeDefaultAllowed).toBe(true);
    });

    it("is already parked before native forward Tab exits the final Actions descendant", () => {
        const { controller } = renderGrid();
        const initialCell = transactionCell(0, "description");
        act(() => initialCell.focus());
        fireEvent.keyDown(initialCell, { ctrlKey: true, key: "End" });
        const actionsCell = document.activeElement;
        if (!(actionsCell instanceof HTMLElement)) {
            throw new Error("the final Actions gridcell is not focused");
        }
        expect(actionsCell).toHaveAttribute("data-cell", "actions");
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        const deleteButton = actionsCell.querySelector<HTMLElement>(
            '[data-testid="delete-button"]'
        );
        if (deleteButton == null) throw new Error("the final Actions descendant is not mounted");

        act(() => deleteButton.focus());

        expect(document.activeElement).toBe(deleteButton);
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toHaveLength(1);
        expect(actionsCell).not.toHaveAttribute("aria-selected");
        expect(actionsCell).toHaveAttribute("tabindex", "0");

        const nativeDefaultAllowed = fireEvent.keyDown(deleteButton, { key: "Tab" });

        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toHaveLength(1);
        expect(nativeDefaultAllowed).toBe(true);
    });

    it("anchors the single-cell selection on the focused cell", () => {
        const { controller } = renderGrid();
        expect(selectedCells()).toEqual([]);

        focusDescription(controller, 1, "end");

        // One cell, and the one the caret is in. No new gesture was needed to get here, which is the
        // point: focus already moves by arrow, Tab and click.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it("moves the anchor with the caret rather than accumulating cells", () => {
        const { controller } = renderGrid();

        focusDescription(controller, 1, "end");
        focusDescription(controller, 2, "end");

        expect(selectedCells()).toEqual(["2:description"]);
    });

    it("drops the selection when focus leaves the rangeable cells", () => {
        const { controller } = renderGrid();
        focusDescription(controller, 1, "end");
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
        { key: "d", selector: '[data-testid="delete-button"]', surface: "actions" },
        { key: "Delete", selector: '[data-testid="delete-button"]', surface: "actions" },
        { key: "Backspace", selector: '[data-testid="delete-button"]', surface: "actions" }
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
        async (key) => {
            const onTransactionDelete = vi.fn();
            renderGrid(onTransactionDelete);
            const cell = screen
                .getAllByTestId("transaction-row")[2]
                .querySelector<HTMLElement>('[role="gridcell"][data-cell="date"]');
            if (cell == null) throw new Error("the date gridcell is not mounted");
            act(() => cell.focus());

            await act(async () => {
                fireEvent.keyDown(cell, { key });
                await Promise.resolve();
            });

            expect(onTransactionDelete).not.toHaveBeenCalled();
        }
    );

    it("extends the range with Shift+ArrowDown once the caret is at the end of its text", () => {
        const { controller } = renderGrid();
        // A single-line input is trivially on both its first and last line, so Down is the grid's.
        const input = focusDescription(controller, 1, "end");

        fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });

        expect(selectedCells()).toEqual(["1:description", "2:description"]);
    });

    it("extends sideways with Alt+Shift one cell per keystroke from a fixed anchor", () => {
        const { controller } = renderGrid();
        const input = focusDescription(controller, 1, "end");

        fireEvent.keyDown(input, { altKey: true, key: "ArrowRight", shiftKey: true });
        expect(selectedCells()).toEqual(["1:description", "1:account"]);

        const sourceCell = transactionCell(1, "description");
        fireEvent.keyDown(sourceCell, { altKey: true, key: "ArrowRight", shiftKey: true });
        expect(selectedCells()).toEqual(["1:description", "1:account", "1:tags"]);
    });

    it("leaves Shift+arrow to the control while the caret still has text to select", () => {
        const { controller } = renderGrid();
        // Caret at the start, so Shift+Right belongs to the input: there is text to highlight.
        const input = focusDescription(controller, 1, "start");

        fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });

        // Still just the anchor. This is the assertion that separates "the grid claims the key at the
        // boundary" from "the grid claims the key", and the second would silently delete text
        // selection inside every cell in the table.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it("parks a navigating range with Escape on its focused gridcell", async () => {
        const { controller } = renderGrid();
        const source = transactionCell(1, "description");
        act(() => source.focus());
        fireEvent.keyDown(source, { key: "ArrowDown", shiftKey: true });
        expect(selectedCells()).toEqual(["1:description", "2:description"]);
        expect(source).toHaveFocus();

        await act(async () => {
            fireEvent.keyDown(source, { key: "Escape" });
            await Promise.resolve();
        });

        expect(selectedCells()).toEqual([]);
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(screen.getByRole("button", { name: "After transactions" })).toHaveFocus();
    });

    it("finishes a controller-owned same-current status from one semantic click", async () => {
        const transactions = createTransactions().map((transaction, index) =>
            index === 1
                ? { ...transaction, status: "For Review", statusId: "for-review" }
                : transaction
        );
        const onTransactionUpdate = vi.fn();
        const { controller } = renderGrid(
            () => undefined,
            () => undefined,
            transactions,
            () => undefined,
            {
                availableStatuses: [
                    { id: "for-review", name: "For Review" },
                    { id: "paid", name: "Paid" }
                ],
                onTransactionUpdate
            }
        );
        const setEditorInteraction = controller.setEditorInteraction;
        const finishEditing = controller.finishEditing;
        const lifecycle: string[] = [];
        const interactionSpy = vi
            .spyOn(controller, "setEditorInteraction")
            .mockImplementation((address, popup, open) => {
                if (!open) lifecycle.push("popup-closed");
                return setEditorInteraction(address, popup, open);
            });
        const finishSpy = vi.spyOn(controller, "finishEditing").mockImplementation((address) => {
            lifecycle.push("editing-finished");
            return finishEditing(address);
        });
        activateCellEditor(controller, 1, "status", "interacting");
        interactionSpy.mockClear();
        finishSpy.mockClear();
        lifecycle.length = 0;

        await act(async () => {
            fireEvent.click(screen.getByRole("option", { name: "For Review" }));
            await Promise.resolve();
        });

        expect(lifecycle.slice(0, 2)).toEqual(["popup-closed", "editing-finished"]);
        expect(finishSpy).toHaveBeenCalledTimes(1);
        expect(onTransactionUpdate).not.toHaveBeenCalled();
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
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
            const { controller } = renderGrid(
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
            completePendingEditorActivation(controller, "tags", "interacting");

            const search = await screen.findByPlaceholderText("Search tags...");
            await waitFor(() => expect(document.activeElement).toBe(search));
            if (populated) {
                expect(screen.getByRole("button", { name: "Remove Food" })).not.toHaveFocus();
            }
        }
    );

    it("keeps the anchor when focus moves into a cell's own portaled editor", async () => {
        const { controller } = renderGrid();
        const row = screen.getAllByTestId("transaction-row")[1];

        // The production lifecycle replaces the display branch, focuses the tags trigger, and opens
        // its chooser. The portal is not reachable while the cell is still in display mode.
        const tagsCell = activateCellEditor(controller, 1, "tags", "interacting");
        expect(tagsCell).toHaveAttribute("data-cell-content", "editor");
        expect(selectedCells()).toEqual(["1:tags"]);
        await waitFor(() => expect(document.querySelector("[data-owned-by-row]")).not.toBeNull());

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

    it.each([
        { ownerField: "tags", ownerRow: "transaction-1" },
        { ownerField: "tags", ownerRow: "transaction-2" },
        { ownerField: "status", ownerRow: "transaction-1" }
    ])(
        "parks an active tags editor for unrelated portal owner $ownerRow/$ownerField",
        async ({ ownerField, ownerRow }) => {
            const onTransactionBlur = vi.fn();
            const { controller } = renderGrid(
                () => undefined,
                () => undefined,
                createTransactions(),
                onTransactionBlur
            );
            activateCellEditor(controller, 1, "tags", "interacting");
            await waitFor(() =>
                expect(document.querySelector("[data-owned-by-row]")).not.toBeNull()
            );
            const unrelatedPortal = document.createElement("div");
            unrelatedPortal.dataset.ownedByRow = ownerRow;
            unrelatedPortal.dataset.ownedByField = ownerField;
            const externalControl = document.createElement("button");
            externalControl.type = "button";
            unrelatedPortal.append(externalControl);
            document.body.append(unrelatedPortal);

            await act(async () => {
                externalControl.focus();
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(externalControl).toHaveFocus();
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            expect(controller.getSnapshot().editor).toBeNull();
            expect(onTransactionBlur).toHaveBeenCalledTimes(1);
            unrelatedPortal.remove();
        }
    );

    it("selects only the cell a pointer lands on, and adds nothing when the pointer moves", () => {
        const { controller } = renderGrid();
        const first = focusDescription(controller, 1, "end");
        const second = transactionCell(2, "description");
        expect(selectedCells()).toEqual(["1:description"]);

        fireEvent.pointerDown(first);
        fireEvent.mouseEnter(second);
        fireEvent.mouseUp(second);

        // No drag binding, deliberately: mousedown is how a caret is placed and a text selection
        // begun in these cells, so a drag-to-select range would fight the gesture it shares. Ranges
        // are keyboard-only, and this pins that the omission stays an omission.
        expect(selectedCells()).toEqual(["1:description"]);
    });

    it.each([false, true])(
        "keeps canonical Actions navigation independent of its descendants when duplicate badge present is %s",
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
            const amount = row.querySelector<HTMLElement>('[role="gridcell"][data-cell="amount"]');
            const actions = row.querySelector<HTMLElement>(
                '[role="gridcell"][data-cell="actions"]'
            );
            const deleteButton = row.querySelector<HTMLElement>('[data-testid="delete-button"]');
            if (amount == null || actions == null || deleteButton == null) {
                throw new Error("the Amount and Actions surfaces are not mounted");
            }

            act(() => amount.focus());
            fireEvent.keyDown(amount, { key: "ArrowRight" });
            expect(document.activeElement).toBe(actions);

            fireEvent.keyDown(actions, { key: "ArrowLeft" });
            expect(document.activeElement).toBe(amount);

            act(() => deleteButton.focus());
            fireEvent.keyDown(deleteButton, { key: "ArrowLeft" });
            expect(document.activeElement).toBe(deleteButton);
            expect(row.querySelectorAll('[data-cell="actions"] [data-cell]')).toHaveLength(0);
            if (hasDuplicate) {
                expect(row.querySelectorAll('[title="Potential duplicate"]')).toHaveLength(1);
                expect(document.activeElement).not.toHaveAttribute("title", "Potential duplicate");
            }
        }
    );

    it.each([
        { columnId: "checkbox", direction: "ArrowLeft", targetColumn: "checkbox", targetRow: 1 },
        { columnId: "checkbox", direction: "ArrowRight", targetColumn: "date", targetRow: 1 },
        { columnId: "checkbox", direction: "ArrowUp", targetColumn: "checkbox", targetRow: 0 },
        { columnId: "checkbox", direction: "ArrowDown", targetColumn: "checkbox", targetRow: 2 },
        { columnId: "actions", direction: "ArrowLeft", targetColumn: "amount", targetRow: 1 },
        { columnId: "actions", direction: "ArrowRight", targetColumn: "actions", targetRow: 1 },
        { columnId: "actions", direction: "ArrowUp", targetColumn: "actions", targetRow: 0 },
        { columnId: "actions", direction: "ArrowDown", targetColumn: "actions", targetRow: 2 }
    ] as const)(
        "routes Alt+$direction from a $columnId activation descendant without activating it",
        async ({ columnId, direction, targetColumn, targetRow }) => {
            const onRowSelectionChange = vi.fn();
            const onTransactionDelete = vi.fn();
            renderGrid(onTransactionDelete, onRowSelectionChange);
            const sourceCell = transactionCell(1, columnId);
            const activation = sourceCell.querySelector<HTMLElement>(
                columnId === "checkbox" ? "button" : '[data-testid="delete-button"]'
            );
            if (activation == null) throw new Error(`${columnId} activation did not mount`);
            fireEvent.pointerDown(sourceCell, { button: 0 });
            act(() => activation.focus());
            await act(async () => Promise.resolve());

            expect(fireEvent.keyDown(activation, { altKey: true, key: direction })).toBe(false);

            const destination = transactionCell(targetRow, targetColumn);
            expect(destination).toHaveFocus();
            expect(selectedCells()).toEqual([`${String(targetRow)}:${targetColumn}`]);
            expect(onRowSelectionChange).not.toHaveBeenCalled();
            expect(onTransactionDelete).not.toHaveBeenCalled();
        }
    );

    it.each([
        {
            columnId: "checkbox",
            direction: "ArrowRight",
            expected: ["1:checkbox", "1:date"]
        },
        {
            columnId: "actions",
            direction: "ArrowLeft",
            expected: ["1:amount", "1:actions"]
        }
    ] as const)(
        "extends from a $columnId activation descendant with Alt+Shift+$direction",
        async ({ columnId, direction, expected }) => {
            const onRowSelectionChange = vi.fn();
            const onTransactionDelete = vi.fn();
            renderGrid(onTransactionDelete, onRowSelectionChange);
            const sourceCell = transactionCell(1, columnId);
            const activation = sourceCell.querySelector<HTMLElement>(
                columnId === "checkbox" ? "button" : '[data-testid="delete-button"]'
            );
            if (activation == null) throw new Error(`${columnId} activation did not mount`);
            fireEvent.pointerDown(sourceCell, { button: 0 });
            act(() => activation.focus());
            await act(async () => Promise.resolve());

            expect(
                fireEvent.keyDown(activation, {
                    altKey: true,
                    key: direction,
                    shiftKey: true
                })
            ).toBe(false);

            expect(selectedCells()).toEqual(expected);
            expect(onRowSelectionChange).not.toHaveBeenCalled();
            expect(onTransactionDelete).not.toHaveBeenCalled();
        }
    );

    it("advertises selectable activation cells without promoting nested controls", () => {
        const { controller } = renderGrid();
        focusDescription(controller, 1, "end");

        const row = screen.getAllByTestId("transaction-row")[1];
        for (const marker of ["checkbox", "actions"]) {
            const cell = row.querySelector(`[data-cell="${marker}"]`);
            expect(cell).toHaveAttribute("role", "gridcell");
            expect(cell).toHaveAttribute("aria-selected", "false");
        }
        expect(row.querySelectorAll(':scope > [data-cell="actions"]')).toHaveLength(1);
        expect(row.querySelectorAll('[data-cell="actions"] [data-cell]')).toHaveLength(0);
        const deleteControl = row.querySelector('[data-legacy-action="delete"]');
        expect(deleteControl).not.toBeNull();
        expect(deleteControl?.hasAttribute("aria-selected")).toBe(false);
        expect(deleteControl).toHaveAttribute("role", "presentation");
    });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";

import { AccountCombobox } from "@/components/features/accounts/AccountCombobox";
import { buildAllocationColumnModel } from "@/components/features/transactions/allocation-columns";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPortalRef
} from "@/components/features/transactions/cells/editor-lifecycle";
import {
    InlineEditableAmount,
    InlineEditableAmountDisplay,
    parseCurrency
} from "@/components/features/transactions/cells/InlineEditableAmount";
import { InlineEditableDate } from "@/components/features/transactions/cells/InlineEditableDate";
import {
    InlineEditableDescriptionAlias,
    type InlineEditableDescriptionAliasProps
} from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import { PersonAllocationCell } from "@/components/features/transactions/cells/PersonAllocationCell";
import { TransactionGridCell } from "@/components/features/transactions/cells/TransactionGridCell";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import {
    activeTransactionGridAddress,
    asTransactionId
} from "@/components/features/transactions/table-model";
import type { TransactionGridAddress } from "@/components/features/transactions/table-model";
import { TransactionInspector } from "@/components/features/transactions/TransactionInspector";
import { asMinorUnits } from "@/lib/domain/currency";

import { createTestTransactionTable, transaction } from "./table-model/test-table";
import { updateTestTransactionGridController } from "./virtual-grid-harness";

vi.mock("@/components/features/accounts/CreateAccountDialog", () => ({
    CreateAccountDialog: () => null
}));

const DEFERRED_PRESENCE_EDITOR_GESTURES: readonly {
    readonly label: string;
    readonly dispatch: (element: HTMLElement) => void;
}[] = [
    {
        dispatch: (element) => {
            fireEvent.pointerDown(element);
        },
        label: "pointerdown"
    },
    {
        dispatch: (element) => {
            fireEvent.keyDown(element, { key: "Shift" });
        },
        label: "keydown"
    }
];

function requiredGridcell(element: HTMLElement): HTMLElement {
    const gridcell = element.closest<HTMLElement>("[role='gridcell']");
    if (gridcell == null) throw new Error("expected element inside a gridcell");
    return gridcell;
}

function gridcellFixture(
    columnId:
        | "checkbox"
        | "date"
        | "description"
        | "account"
        | "status"
        | "tags"
        | "amount"
        | "actions" = "description"
) {
    const rows = [transaction({ id: "transaction-1" }), transaction({ id: "transaction-2" })];
    const atom = createTransactionCellSelectionAtom();
    const controller = createTransactionGridWorkspaceController(atom);
    updateTestTransactionGridController(controller, rows);
    const table = createTestTransactionTable({ cellSelectionAtom: atom, transactions: rows });
    const cell = table.getRowsInDisplayOrder()[0].getAllCellsByColumnId()[columnId];
    const interaction = cell?.column.columnDef.meta?.interaction;
    if (cell == null || interaction == null) {
        throw new Error(`${columnId} cell fixture is missing`);
    }
    return { cell, controller, interaction, rows, table };
}

function allocationGridcellFixture() {
    const person = { id: "person-a", name: "Ada" };
    const rows = [
        transaction({ allocations: { [person.id]: 25 }, id: "transaction-1" }),
        transaction({ id: "transaction-2" })
    ];
    const allocationColumns = buildAllocationColumnModel({
        activePeople: [person],
        allPeople: [person],
        transactions: rows
    }).columns;
    const atom = createTransactionCellSelectionAtom();
    const controller = createTransactionGridWorkspaceController(atom);
    updateTestTransactionGridController(controller, rows, allocationColumns);
    const table = createTestTransactionTable({
        allocationColumns,
        cellSelectionAtom: atom,
        transactions: rows
    });
    const columnId = "allocation:person-a";
    const cell = table.getRowsInDisplayOrder()[0].getAllCellsByColumnId()[columnId];
    const interaction = cell?.column.columnDef.meta?.interaction;
    if (cell == null || interaction == null) {
        throw new Error(`${columnId} cell fixture is missing`);
    }
    return { cell, controller, interaction };
}

const COMPOSITION_ADDRESS = {
    columnId: "description",
    transactionId: asTransactionId("transaction-1")
} satisfies TransactionGridAddress;

function LifecycleTestEditor({
    label,
    onBlur,
    onCancel,
    onCommit,
    onInput,
    valid = true
}: {
    readonly label: string;
    readonly onBlur?: () => void;
    readonly onCancel?: () => void;
    readonly onCommit: () => void;
    readonly onInput?: () => void;
    readonly valid?: boolean;
}) {
    const lifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            cancel: () => onCancel?.(),
            commit: () => {
                onCommit();
                return valid
                    ? TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
                    : TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            },
            externalExitValidation: "controller"
        }),
        [onCancel, onCommit, valid]
    );
    useTransactionGridEditorLifecycle(lifecycle);
    return <input aria-label={label} onBlur={onBlur} onInput={onInput} />;
}

function PortaledLifecycleTestEditor({
    address,
    onCancel,
    onCommit,
    onPortalBlur,
    valid = true
}: {
    readonly address: TransactionGridAddress;
    readonly onCancel: () => void;
    readonly onCommit: () => void;
    readonly onPortalBlur?: () => void;
    readonly valid?: boolean;
}) {
    const registerPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const lifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            cancel: onCancel,
            commit: () => {
                onCommit();
                return valid
                    ? TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
                    : TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            },
            externalExitValidation: "controller"
        }),
        [onCancel, onCommit, valid]
    );
    useTransactionGridEditorLifecycle(lifecycle);
    return (
        <>
            <button type="button" data-grid-editor-target>
                Popup editor trigger
            </button>
            {createPortal(
                <div
                    ref={registerPortal}
                    data-owned-by-row={address.transactionId}
                    data-owned-by-field={address.columnId}
                >
                    <input aria-label="Portaled popup editor" onBlur={onPortalBlur} />
                </div>,
                document.body
            )}
        </>
    );
}

function CancelledCompositionGridCell({
    fixture,
    onCancel,
    onCommit
}: {
    readonly fixture: ReturnType<typeof gridcellFixture>;
    readonly onCancel: () => void;
    readonly onCommit: () => void;
}) {
    const snapshot = useSyncExternalStore(
        fixture.controller.subscribe,
        fixture.controller.getSnapshot,
        fixture.controller.getSnapshot
    );
    const editorOwned =
        snapshot.editor?.address.transactionId === COMPOSITION_ADDRESS.transactionId &&
        snapshot.editor.address.columnId === COMPOSITION_ADDRESS.columnId;

    return (
        <TransactionGridCell
            address={COMPOSITION_ADDRESS}
            cell={fixture.cell}
            ariaColumnIndex={3}
            controller={fixture.controller}
            interaction={fixture.interaction}
            selected={snapshot.activeTransactionId === COMPOSITION_ADDRESS.transactionId}
            interactionKind={snapshot.interactionKind}
            selectionVisibility={snapshot.selectionVisibility}
            isInitialTabStop={false}
            isParkedTabStop={false}
            viewportRowDistance={5}
            display={<span data-testid="cancelled-composition-display">Display</span>}
            editor={
                <LifecycleTestEditor
                    label="Cancelled composition editor"
                    onCancel={onCancel}
                    onCommit={onCommit}
                />
            }
            showEditor={editorOwned}
        />
    );
}

describe("parseCurrency", () => {
    it.each([
        ["0", 0],
        ["1250.75", 1250.75],
        ["-42.5", -42.5],
        [".25", 0.25],
        ["$1,234.56", 1234.56],
        ["£ -9.50", -9.5]
    ])("parses %s as finite major units", (input, expected) => {
        expect(parseCurrency(input)).toEqual({ ok: true, value: expected });
    });

    it.each(["", "   ", ".", "-", "1.2.3", "1-2", "--1", "money", "1usd", "1,23"])(
        "rejects malformed draft %j",
        (input) => {
            expect(parseCurrency(input)).toEqual({ ok: false });
        }
    );
});

describe("InlineEditableAmountDisplay", () => {
    it("retains imported provenance and sign styling at rest", () => {
        render(
            <>
                <InlineEditableAmountDisplay
                    value={asMinorUnits(-1_250)}
                    originalValue={asMinorUnits(-2_500)}
                    currency="USD"
                    data-testid="resting-expense"
                />
                <InlineEditableAmountDisplay
                    value={asMinorUnits(750)}
                    currency="USD"
                    data-testid="resting-income"
                />
            </>
        );

        const expense = screen.getByTestId("resting-expense");
        expect(expense).toHaveTextContent("-12.50");
        expect(expense).toHaveAttribute("aria-description", "Original imported amount: -USD 25.00");
        expect(expense).toHaveAttribute("data-state", "closed");
        expect(expense.className).toContain("text-red-600");
        expect(expense.className).toContain("dark:text-red-400");

        const income = screen.getByTestId("resting-income");
        expect(income).toHaveTextContent("7.50");
        expect(income).not.toHaveAttribute("aria-description");
        expect(income.className).toContain("text-green-700");
        expect(income.className).toContain("dark:text-green-400");
    });
});

describe("TransactionGridCell", () => {
    it("mounts exactly one display/editor branch", () => {
        const { cell, controller, interaction } = gridcellFixture();
        const view = render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                selectionVisibility="suppressed"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span data-testid="display-branch">Display</span>}
                adornment={<span data-testid="persistent-adornment">Robots</span>}
                ariaDescription="Imported provenance"
                editor={<input data-testid="editor-branch" />}
            />
        );

        expect(screen.getByTestId("display-branch")).toBeInTheDocument();
        expect(screen.queryByTestId("editor-branch")).not.toBeInTheDocument();
        const adornment = screen.getByTestId("persistent-adornment");
        expect(requiredGridcell(adornment)).toHaveAttribute(
            "aria-description",
            "Imported provenance"
        );

        view.rerender(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span data-testid="display-branch">Display</span>}
                adornment={<span data-testid="persistent-adornment">Robots</span>}
                ariaDescription="Imported provenance"
                editor={<input data-testid="editor-branch" />}
                showEditor={true}
            />
        );

        expect(screen.queryByTestId("display-branch")).not.toBeInTheDocument();
        expect(screen.getByTestId("editor-branch")).toBeInTheDocument();
        expect(screen.getByTestId("persistent-adornment")).toBe(adornment);
    });

    it.each(DEFERRED_PRESENCE_EDITOR_GESTURES)(
        "releases deferred Add Presence on captured $label in the exact editor",
        ({ dispatch }) => {
            const { cell, controller, interaction } = gridcellFixture();
            const target: TransactionGridAddress & { readonly columnId: "description" } = {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            };
            render(
                <TransactionGridCell
                    address={target}
                    cell={cell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={interaction}
                    selected={true}
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Display</span>}
                    editor={<input aria-label="Deferred Presence editor" />}
                    showEditor
                />
            );
            const accepted = controller.beginActivation({
                entry: "full",
                presence: "defer-add-until-editor-gesture",
                target
            });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
            const editor = screen.getByRole("textbox", { name: "Deferred Presence editor" });
            expect(controller.getSnapshot().deferredPresence).not.toBeNull();

            dispatch(editor);

            expect(controller.getSnapshot().deferredPresence).toBeNull();
        }
    );

    it("begins controller-owned quick edit without dropping the printable text", () => {
        const { cell, controller, interaction } = gridcellFixture();
        controller.setFocusedCell("transaction-1", "description");
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="navigating"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        gridcell.focus();

        fireEvent.keyDown(gridcell, { key: "x" });

        expect(controller.getPendingRequest()).toMatchObject({
            entry: "quick",
            initialText: "x",
            kind: "edit",
            state: {
                target: {
                    columnId: "description",
                    transactionId: "transaction-1"
                }
            }
        });
        expect(controller.getSnapshot().editor).toEqual({
            address: {
                columnId: "description",
                transactionId: "transaction-1"
            },
            entry: "quick",
            initialText: "x"
        });
    });

    it("applies completed quick-entry text after the real editor receives focus", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={<input aria-label="Quick editor" defaultValue="previous" />}
                editorEntry="quick"
                editorInitialText="q"
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "quick",
            initialText: "q",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        await Promise.resolve();

        const editor = screen.getByRole<HTMLInputElement>("textbox", { name: "Quick editor" });
        await expect
            .poll(() => ({
                selectionEnd: editor.selectionEnd,
                selectionStart: editor.selectionStart,
                value: editor.value
            }))
            .toEqual({ selectionEnd: 1, selectionStart: 1, value: "q" });
    });

    it("selects the complete existing value for full edit entry", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={<input aria-label="Full editor" defaultValue="previous" />}
                editorEntry="full"
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "full",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        const editor = screen.getByRole<HTMLInputElement>("textbox", { name: "Full editor" });
        await expect
            .poll(() => ({
                selectionEnd: editor.selectionEnd,
                selectionStart: editor.selectionStart
            }))
            .toEqual({ selectionEnd: editor.value.length, selectionStart: 0 });
    });

    it.each([
        { destinationRuns: false, valid: false },
        { destinationRuns: true, valid: true }
    ] as const)(
        "invokes click-only lifecycle validation once before destinationRuns=$destinationRuns",
        async ({ destinationRuns, valid }) => {
            const { cell, controller, interaction } = gridcellFixture();
            const onCommit = vi.fn();
            const onDestinationClick = vi.fn();
            render(
                <>
                    <TransactionGridCell
                        address={{
                            columnId: "description",
                            transactionId: asTransactionId("transaction-1")
                        }}
                        cell={cell}
                        ariaColumnIndex={3}
                        controller={controller}
                        interaction={interaction}
                        selected={true}
                        interactionKind="editing"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Display</span>}
                        editor={
                            <LifecycleTestEditor
                                label="Description editor"
                                onCommit={onCommit}
                                valid={valid}
                            />
                        }
                        showEditor
                    />
                    <button type="button" onClick={onDestinationClick}>
                        External Add
                    </button>
                </>
            );
            const accepted = controller.beginActivation({
                entry: "quick",
                target: {
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }
            });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");

            expect(fireEvent.click(screen.getByRole("button", { name: "External Add" }))).toBe(
                destinationRuns
            );
            await act(async () => Promise.resolve());

            expect(onCommit).toHaveBeenCalledOnce();
            expect(onDestinationClick).toHaveBeenCalledTimes(destinationRuns ? 1 : 0);
        }
    );

    it("commits a deferred Account draft before inspector focus claims ownership", async () => {
        const originalResizeObserver = globalThis.ResizeObserver;
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = () => undefined;
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            }
        );
        const { cell, controller, interaction } = gridcellFixture("account");
        const sourceAddress = {
            columnId: "account",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onChange = vi.fn();
        try {
            render(
                <>
                    <TransactionGridCell
                        address={sourceAddress}
                        cell={cell}
                        ariaColumnIndex={4}
                        controller={controller}
                        interaction={interaction}
                        selected
                        interactionKind="editing"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Account display</span>}
                        editor={
                            <AccountCombobox
                                commitMode="deferred"
                                value="checking"
                                accounts={[
                                    { id: "checking", name: "Checking" },
                                    { id: "savings", name: "Savings" }
                                ]}
                                onChange={onChange}
                                onEditingChange={(editing) => {
                                    if (!editing) controller.finishEditing(sourceAddress);
                                }}
                                onPopupOpenChange={(popup, open) => {
                                    controller.setEditorInteraction(sourceAddress, popup, open);
                                }}
                                ownerTransactionId={sourceAddress.transactionId}
                            />
                        }
                        showEditor
                    />
                    <TransactionInspector
                        controller={controller}
                        open
                        transaction={{
                            description: "Transaction 1",
                            id: "transaction-1",
                            notes: ""
                        }}
                        onNotesChange={() => undefined}
                        onRequestClose={() => undefined}
                    />
                </>
            );
            controller.setInspectorPanelOpen(true);
            const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            await act(async () => {
                expect(controller.focusPendingActivation(accepted)).toBe("focused");
                await Promise.resolve();
            });
            fireEvent.click(await screen.findByRole("option", { name: "Savings" }));
            await act(async () => Promise.resolve());
            expect(onChange).not.toHaveBeenCalled();
            const notes = screen.getByTestId("notes-editable");

            fireEvent.pointerDown(notes, { button: 0, pointerId: 41 });

            expect(onChange).toHaveBeenCalledOnce();
            expect(onChange).toHaveBeenCalledWith("savings");
            expect(document.activeElement).toBe(notes);
            expect(controller.getSnapshot()).toMatchObject({
                activeAddress: sourceAddress,
                inspectorPanelOpen: true,
                interactionKind: "inspecting",
                selectionVisibility: "muted"
            });
        } finally {
            if (originalScrollIntoView == null) {
                Reflect.deleteProperty(Element.prototype, "scrollIntoView");
            } else {
                Element.prototype.scrollIntoView = originalScrollIntoView;
            }
            if (originalResizeObserver == null) vi.unstubAllGlobals();
            else vi.stubGlobal("ResizeObserver", originalResizeObserver);
        }
    });

    it("finishes Description Enter when the commit synchronously publishes its created alias", () => {
        const fixture = gridcellFixture();
        const sourceRow = fixture.rows[0];
        if (sourceRow == null) throw new Error("description source row is missing");
        updateTestTransactionGridController(fixture.controller, [sourceRow]);
        const sourceAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const createdAlias = { id: "created-alias", name: "Created alias" };
        const onCommitText = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );

        function DescriptionCommitCell() {
            const snapshot = useSyncExternalStore(
                fixture.controller.subscribe,
                fixture.controller.getSnapshot,
                fixture.controller.getSnapshot
            );
            const [canonicalValue, setCanonicalValue] = useState("Original description");
            const [availableAliases, setAvailableAliases] = useState<
                { readonly id: string; readonly name: string }[]
            >([]);
            const editorOwned =
                snapshot.editor?.address.transactionId === sourceAddress.transactionId &&
                snapshot.editor.address.columnId === sourceAddress.columnId;
            const handleEditingChange = useCallback((editing: boolean) => {
                if (!editing) fixture.controller.finishEditing(sourceAddress);
            }, []);
            const handlePopupOpenChange = useCallback((popup: "listbox", open: boolean) => {
                fixture.controller.setEditorInteraction(sourceAddress, popup, open);
            }, []);

            return (
                <TransactionGridCell
                    address={sourceAddress}
                    cell={fixture.cell}
                    ariaColumnIndex={3}
                    controller={fixture.controller}
                    interaction={fixture.interaction}
                    selected={snapshot.activeTransactionId === sourceAddress.transactionId}
                    interactionKind={snapshot.interactionKind}
                    selectionVisibility={snapshot.selectionVisibility}
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="description-display">{canonicalValue}</span>}
                    editor={
                        <InlineEditableDescriptionAlias
                            availableAliases={availableAliases}
                            onCommitText={(text, origin) => {
                                setCanonicalValue(text);
                                setAvailableAliases([{ ...createdAlias, name: text }]);
                                return onCommitText(text, origin);
                            }}
                            onSelectAlias={() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS}
                            onEditingChange={handleEditingChange}
                            onPopupOpenChange={handlePopupOpenChange}
                            value={canonicalValue}
                        />
                    }
                    editorEntry={editorOwned ? snapshot.editor?.entry : undefined}
                    editorInitialText={editorOwned ? snapshot.editor?.initialText : undefined}
                    showEditor={editorOwned}
                />
            );
        }

        const accepted = fixture.controller.beginActivation({
            entry: "full",
            target: sourceAddress
        });
        expect(fixture.controller.markRevealApplied(accepted)).toBe(true);
        render(<DescriptionCommitCell />);
        act(() => {
            expect(fixture.controller.focusPendingActivation(accepted)).toBe("focused");
        });
        const editor = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.change(editor, { target: { value: createdAlias.name } });

        fireEvent.keyDown(editor, { key: "Enter" });

        expect(onCommitText).toHaveBeenCalledOnce();
        expect(requiredGridcell(screen.getByTestId("description-display"))).toHaveAttribute(
            "data-cell-content",
            "display"
        );
        expect(
            screen.queryByRole("textbox", { name: "Transaction description" })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("listbox", { name: "Description aliases" })
        ).not.toBeInTheDocument();
        expect(fixture.controller.getSnapshot().editor).toBeNull();
        expect(fixture.controller.getInteractionState()).toMatchObject({ kind: "navigating" });
    });

    it("cancels an open Description listbox and its editor with one Escape", async () => {
        const fixture = gridcellFixture();
        const sourceRow = fixture.rows[0];
        if (sourceRow == null) throw new Error("description source row is missing");
        updateTestTransactionGridController(fixture.controller, [sourceRow]);
        const sourceAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onCommitText = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
        );

        function DescriptionCancellationCell() {
            const snapshot = useSyncExternalStore(
                fixture.controller.subscribe,
                fixture.controller.getSnapshot,
                fixture.controller.getSnapshot
            );
            const editorOwned =
                snapshot.editor?.address.transactionId === sourceAddress.transactionId &&
                snapshot.editor.address.columnId === sourceAddress.columnId;
            const handleEditingChange = useCallback((editing: boolean) => {
                if (!editing) fixture.controller.finishEditing(sourceAddress);
            }, []);
            const handlePopupOpenChange = useCallback((popup: "listbox", open: boolean) => {
                fixture.controller.setEditorInteraction(sourceAddress, popup, open);
            }, []);
            return (
                <TransactionGridCell
                    address={sourceAddress}
                    cell={fixture.cell}
                    ariaColumnIndex={3}
                    controller={fixture.controller}
                    interaction={fixture.interaction}
                    selected={snapshot.activeTransactionId === sourceAddress.transactionId}
                    interactionKind={snapshot.interactionKind}
                    selectionVisibility={snapshot.selectionVisibility}
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="cancelled-description-display">Original</span>}
                    editor={
                        <InlineEditableDescriptionAlias
                            availableAliases={[{ id: "cafe", name: "Café" }]}
                            onCommitText={onCommitText}
                            onSelectAlias={() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS}
                            onEditingChange={handleEditingChange}
                            onPopupOpenChange={handlePopupOpenChange}
                            value="Original"
                        />
                    }
                    editorEntry={editorOwned ? snapshot.editor?.entry : undefined}
                    showEditor={editorOwned}
                />
            );
        }

        const accepted = fixture.controller.beginActivation({
            entry: "full",
            target: sourceAddress
        });
        expect(fixture.controller.markRevealApplied(accepted)).toBe(true);
        render(<DescriptionCancellationCell />);
        act(() => {
            expect(fixture.controller.focusPendingActivation(accepted)).toBe("focused");
        });
        const editor = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.change(editor, { target: { value: "Caf" } });
        expect(screen.getByRole("listbox", { name: "Description aliases" })).toBeInTheDocument();

        expect(fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" })).toBe(false);
        expect(onCommitText).toHaveBeenCalledOnce();
        expect(editor).toHaveValue("Caf");
        expect(editor).toHaveFocus();
        expect(screen.getByRole("listbox", { name: "Description aliases" })).toBeInTheDocument();
        expect(fixture.controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "listbox"
        });
        onCommitText.mockClear();

        fireEvent.keyDown(editor, { key: "Escape" });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onCommitText).not.toHaveBeenCalled();
        expect(screen.queryByRole("textbox", { name: "Transaction description" })).toBeNull();
        expect(screen.queryByRole("listbox", { name: "Description aliases" })).toBeNull();
        expect(fixture.controller.getSnapshot().editor).toBeNull();
        expect(fixture.controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(requiredGridcell(screen.getByTestId("cancelled-description-display"))).toHaveFocus();
    });

    it("publishes Description listbox ownership before the mounted popup can receive input", () => {
        const { cell, controller, interaction } = gridcellFixture();
        const sourceAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const ownershipObservedAtLayout: string[] = [];

        function DescriptionPopupOwnershipProbe() {
            const [inputRevision, setInputRevision] = useState(0);
            useLayoutEffect(() => {
                if (document.querySelector('[role="listbox"]') != null) {
                    ownershipObservedAtLayout.push(controller.getInteractionState().kind);
                }
            }, [inputRevision]);
            return (
                <div onInput={() => setInputRevision((current) => current + 1)}>
                    <TransactionGridCell
                        address={sourceAddress}
                        cell={cell}
                        ariaColumnIndex={3}
                        controller={controller}
                        interaction={interaction}
                        selected
                        interactionKind="editing"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Description display</span>}
                        editor={
                            <InlineEditableDescriptionAlias
                                availableAliases={[{ id: "cafe", name: "Café" }]}
                                onCommitText={() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS}
                                onSelectAlias={() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS}
                                onPopupOpenChange={(popup, open) => {
                                    controller.setEditorInteraction(sourceAddress, popup, open);
                                }}
                                value="Ca"
                            />
                        }
                        showEditor
                    />
                </div>
            );
        }

        render(<DescriptionPopupOwnershipProbe />);
        const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole("textbox", { name: "Transaction description" });

        fireEvent.input(editor, { target: { value: "C" } });

        expect(screen.getByRole("listbox", { name: "Description aliases" })).toBeInTheDocument();
        expect(ownershipObservedAtLayout).toEqual(["interacting"]);
    });

    it.each(["status", "tags"] as const)(
        "retains an invalid %s editor without entering the inspector",
        (columnId) => {
            const { cell, controller, interaction } = gridcellFixture(columnId);
            const sourceAddress = {
                columnId,
                transactionId: asTransactionId("transaction-1")
            } satisfies TransactionGridAddress;
            const onCommit = vi.fn();
            render(
                <>
                    <TransactionGridCell
                        address={sourceAddress}
                        cell={cell}
                        ariaColumnIndex={columnId === "status" ? 6 : 5}
                        controller={controller}
                        interaction={interaction}
                        selected
                        interactionKind="editing"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>{columnId} display</span>}
                        editor={
                            <LifecycleTestEditor
                                label={`${columnId} editor`}
                                onCommit={onCommit}
                                valid={false}
                            />
                        }
                        showEditor
                    />
                    <TransactionInspector
                        controller={controller}
                        open
                        transaction={{
                            description: "Transaction 1",
                            id: "transaction-1",
                            notes: ""
                        }}
                        onNotesChange={() => undefined}
                        onRequestClose={() => undefined}
                    />
                </>
            );
            controller.setInspectorPanelOpen(true);
            const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
            const editor = screen.getByRole("textbox", { name: `${columnId} editor` });
            const notes = screen.getByTestId("notes-editable");

            expect(fireEvent.pointerDown(notes, { button: 0, pointerId: 42 })).toBe(false);

            expect(onCommit).toHaveBeenCalledOnce();
            expect(document.activeElement).toBe(editor);
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            expect(controller.getSnapshot().selectionVisibility).toBe("visible");
        }
    );

    it("commits once without blurring before moving canonical focus", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        const onBlur = vi.fn();
        const onCommit = vi.fn();
        const dispatch = vi.spyOn(controller, "dispatchCellIntent");
        const accountCell = document.createElement("div");
        accountCell.tabIndex = -1;
        document.body.append(accountCell);
        controller.registerCell(
            {
                columnId: "account",
                transactionId: asTransactionId("transaction-1")
            },
            accountCell
        );
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={
                    <LifecycleTestEditor
                        label="Description editor"
                        onBlur={onBlur}
                        onCommit={onCommit}
                    />
                }
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "quick",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        fireEvent.keyDown(screen.getByRole("textbox", { name: "Description editor" }), {
            key: "ArrowRight"
        });
        await Promise.resolve();

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onBlur).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(controller.getInteractionState()).toMatchObject({
            kind: "pending-activation",
            target: {
                columnId: "account",
                transactionId: "transaction-1"
            }
        });
        expect(controller.getPendingRequest()).toMatchObject({
            continuous: { entry: "quick", kind: "continue" },
            entry: "quick",
            kind: "edit"
        });
        accountCell.remove();
    });

    it.each([
        {
            key: "ArrowLeft",
            shiftKey: false,
            sourceRow: 0,
            targetColumn: "date",
            targetRow: 0
        },
        {
            key: "ArrowRight",
            shiftKey: true,
            sourceRow: 0,
            targetColumn: "account",
            targetRow: 0
        },
        {
            key: "ArrowUp",
            shiftKey: false,
            sourceRow: 1,
            targetColumn: "description",
            targetRow: 0
        },
        {
            key: "ArrowDown",
            shiftKey: true,
            sourceRow: 0,
            targetColumn: "description",
            targetRow: 1
        }
    ] as const)(
        "owns open-popup Alt+$key with shift=$shiftKey exactly once",
        async ({ key, shiftKey, sourceRow, targetColumn, targetRow }) => {
            const fixture = gridcellFixture();
            const rows = fixture.table.getRowsInDisplayOrder();
            const sourceCell = rows[sourceRow]?.getAllCellsByColumnId().description;
            const destinationCell = rows[targetRow]?.getAllCellsByColumnId()[targetColumn];
            const sourceInteraction = sourceCell?.column.columnDef.meta?.interaction;
            const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
            if (
                sourceCell == null ||
                destinationCell == null ||
                sourceInteraction == null ||
                destinationInteraction == null
            ) {
                throw new Error("the popup movement cells are missing");
            }
            const sourceAddress = {
                columnId: "description",
                transactionId: asTransactionId(`transaction-${String(sourceRow + 1)}`)
            } satisfies TransactionGridAddress;
            const destinationAddress = {
                columnId: targetColumn,
                transactionId: asTransactionId(`transaction-${String(targetRow + 1)}`)
            } satisfies TransactionGridAddress;
            const onCancel = vi.fn();
            const onCommit = vi.fn();
            const onPortalBlur = vi.fn();
            render(
                <>
                    <TransactionGridCell
                        address={sourceAddress}
                        cell={sourceCell}
                        ariaColumnIndex={3}
                        controller={fixture.controller}
                        interaction={sourceInteraction}
                        selected
                        interactionKind="interacting"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Popup source display</span>}
                        editor={
                            <PortaledLifecycleTestEditor
                                address={sourceAddress}
                                onCancel={onCancel}
                                onCommit={onCommit}
                                onPortalBlur={onPortalBlur}
                            />
                        }
                        showEditor
                    />
                    <TransactionGridCell
                        address={destinationAddress}
                        cell={destinationCell}
                        ariaColumnIndex={targetColumn === "date" ? 2 : 4}
                        controller={fixture.controller}
                        interaction={destinationInteraction}
                        selected={false}
                        interactionKind="navigating"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Popup destination display</span>}
                    />
                </>
            );
            const accepted = fixture.controller.beginActivation({
                entry: "full",
                target: sourceAddress
            });
            expect(fixture.controller.markRevealApplied(accepted)).toBe(true);
            expect(fixture.controller.focusPendingActivation(accepted)).toBe("focused");
            expect(fixture.controller.setEditorInteraction(sourceAddress, "listbox", true)).toBe(
                true
            );
            const portalEditor = screen.getByRole("textbox", { name: "Portaled popup editor" });
            expect(
                fixture.controller.isRegisteredEditorPortalTarget(sourceAddress, portalEditor)
            ).toBe(true);
            act(() => portalEditor.focus());
            const dispatch = vi.spyOn(fixture.controller, "dispatchCellIntent");
            const direction =
                key === "ArrowLeft"
                    ? "left"
                    : key === "ArrowRight"
                      ? "right"
                      : key === "ArrowUp"
                        ? "up"
                        : "down";

            expect(
                fireEvent.keyDown(portalEditor, {
                    altKey: true,
                    key,
                    shiftKey
                })
            ).toBe(false);
            await act(async () => Promise.resolve());

            expect(onCommit).toHaveBeenCalledOnce();
            expect(onCancel).not.toHaveBeenCalled();
            expect(onPortalBlur).not.toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalledOnce();
            expect(dispatch).toHaveBeenCalledWith(
                sourceAddress,
                shiftKey
                    ? { direction, kind: "commit-and-extend" }
                    : { direction, kind: "commit-and-move", preserveEntry: "full" },
                5
            );
        }
    );

    it("retains an invalid open popup draft when Alt movement is rejected", () => {
        const fixture = gridcellFixture();
        const destinationCell = fixture.table
            .getRowsInDisplayOrder()[0]
            ?.getAllCellsByColumnId().account;
        const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
        if (destinationCell == null || destinationInteraction == null) {
            throw new Error("the invalid popup destination is missing");
        }
        const sourceAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const destinationAddress = {
            columnId: "account",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onCancel = vi.fn();
        const onCommit = vi.fn();
        render(
            <>
                <TransactionGridCell
                    address={sourceAddress}
                    cell={fixture.cell}
                    ariaColumnIndex={3}
                    controller={fixture.controller}
                    interaction={fixture.interaction}
                    selected
                    interactionKind="interacting"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Invalid popup source</span>}
                    editor={
                        <PortaledLifecycleTestEditor
                            address={sourceAddress}
                            onCancel={onCancel}
                            onCommit={onCommit}
                            valid={false}
                        />
                    }
                    showEditor
                />
                <TransactionGridCell
                    address={destinationAddress}
                    cell={destinationCell}
                    ariaColumnIndex={4}
                    controller={fixture.controller}
                    interaction={destinationInteraction}
                    selected={false}
                    interactionKind="navigating"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Invalid popup destination</span>}
                />
            </>
        );
        const accepted = fixture.controller.beginActivation({
            entry: "full",
            target: sourceAddress
        });
        expect(fixture.controller.markRevealApplied(accepted)).toBe(true);
        expect(fixture.controller.focusPendingActivation(accepted)).toBe("focused");
        expect(fixture.controller.setEditorInteraction(sourceAddress, "listbox", true)).toBe(true);
        const portalEditor = screen.getByRole("textbox", { name: "Portaled popup editor" });
        act(() => portalEditor.focus());

        expect(
            fireEvent.keyDown(portalEditor, {
                altKey: true,
                key: "ArrowRight"
            })
        ).toBe(false);

        expect(onCommit).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
        expect(portalEditor).toHaveFocus();
        const state = fixture.controller.getInteractionState();
        expect(state).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "listbox"
        });
        if (state.kind !== "interacting") {
            throw new Error(`expected interacting state, received ${state.kind}`);
        }
        expect(activeTransactionGridAddress(state.selection)).toEqual(sourceAddress);
    });

    it("suppresses a production blur save while atomically moving exactly once", async () => {
        const { cell, controller, interaction } = gridcellFixture("amount");
        const onSave = vi.fn();
        const dispatch = vi.spyOn(controller, "dispatchCellIntent");
        const actionsCell = document.createElement("button");
        actionsCell.tabIndex = -1;
        document.body.append(actionsCell);
        controller.registerCell(
            {
                columnId: "actions",
                transactionId: asTransactionId("transaction-1")
            },
            actionsCell
        );
        render(
            <TransactionGridCell
                address={{
                    columnId: "amount",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={8}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={
                    <InlineEditableAmount
                        value={asMinorUnits(-1_000)}
                        currency="USD"
                        onSave={onSave}
                        data-testid="Amount editor"
                    />
                }
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "quick",
            target: {
                columnId: "amount",
                transactionId: asTransactionId("transaction-1")
            }
        });
        act(() => {
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
        });
        const editor = screen.getByTestId("Amount editor");
        fireEvent.change(editor, { target: { value: "25.00" } });

        await act(async () => {
            fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" });
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith(asMinorUnits(2_500));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(actionsCell).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({
            continuous: { entry: "quick", kind: "continue" },
            kind: "navigating"
        });
        actionsCell.remove();
    });

    it.each([
        {
            destinationColumn: "checkbox",
            entry: "full",
            key: "Tab",
            shiftKey: true,
            sourceColumn: "date"
        },
        {
            destinationColumn: "actions",
            entry: "quick",
            key: "ArrowRight",
            shiftKey: false,
            sourceColumn: "amount"
        }
    ] as const)(
        "preserves $entry continuous edit when mounted $destinationColumn receives controller focus",
        async ({ destinationColumn, entry, key, shiftKey, sourceColumn }) => {
            const { cell, controller, interaction, table } = gridcellFixture(sourceColumn);
            const destinationCell = table.getRowsInDisplayOrder()[0]?.getAllCellsByColumnId()[
                destinationColumn
            ];
            const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
            if (destinationCell == null || destinationInteraction == null) {
                throw new Error(`${destinationColumn} destination fixture is missing`);
            }
            const sourceAddress = {
                columnId: sourceColumn,
                transactionId: asTransactionId("transaction-1")
            } satisfies TransactionGridAddress;
            const destinationAddress = {
                columnId: destinationColumn,
                transactionId: asTransactionId("transaction-1")
            } satisfies TransactionGridAddress;
            const onCommit = vi.fn();
            render(
                <>
                    <TransactionGridCell
                        address={sourceAddress}
                        cell={cell}
                        ariaColumnIndex={sourceColumn === "date" ? 2 : 8}
                        controller={controller}
                        interaction={interaction}
                        selected
                        interactionKind="editing"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={<span>Source display</span>}
                        editor={
                            <LifecycleTestEditor
                                label="Continuous source editor"
                                onCommit={onCommit}
                            />
                        }
                        showEditor
                    />
                    <TransactionGridCell
                        address={destinationAddress}
                        cell={destinationCell}
                        ariaColumnIndex={destinationColumn === "checkbox" ? 1 : 9}
                        controller={controller}
                        interaction={destinationInteraction}
                        selected={false}
                        interactionKind="navigating"
                        selectionVisibility="visible"
                        isInitialTabStop={false}
                        isParkedTabStop={false}
                        viewportRowDistance={5}
                        display={
                            <span data-testid={`continuous-${destinationColumn}-destination`}>
                                Destination
                            </span>
                        }
                        legacyInteractive
                    />
                </>
            );
            const accepted = controller.beginActivation({ entry, target: sourceAddress });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");

            fireEvent.keyDown(screen.getByRole("textbox", { name: "Continuous source editor" }), {
                key,
                shiftKey
            });
            await Promise.resolve();

            const destination = requiredGridcell(
                screen.getByTestId(`continuous-${destinationColumn}-destination`)
            );
            expect(onCommit).toHaveBeenCalledTimes(1);
            expect(destination).toHaveFocus();
            const state = controller.getInteractionState();
            if (state.kind !== "navigating") {
                throw new Error(`expected navigating state, received ${state.kind}`);
            }
            expect(state.continuous).toEqual({ entry, kind: "continue" });
            expect(activeTransactionGridAddress(state.selection)).toEqual(destinationAddress);
        }
    );

    it.each(["", "not-an-amount"])(
        "rejects malformed amount draft %j without surrendering editor ownership",
        async (draft) => {
            const { cell, controller, interaction } = gridcellFixture("amount");
            const onSave = vi.fn();
            const destination = document.createElement("button");
            destination.type = "button";
            document.body.append(destination);
            controller.registerCell(
                {
                    columnId: "actions",
                    transactionId: asTransactionId("transaction-1")
                },
                destination
            );
            render(
                <TransactionGridCell
                    address={{
                        columnId: "amount",
                        transactionId: asTransactionId("transaction-1")
                    }}
                    cell={cell}
                    ariaColumnIndex={8}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Display</span>}
                    editor={
                        <InlineEditableAmount
                            value={asMinorUnits(-1_000)}
                            currency="USD"
                            onSave={onSave}
                            data-testid="Invalid amount editor"
                        />
                    }
                    showEditor
                />
            );
            const accepted = controller.beginActivation({
                entry: "quick",
                target: {
                    columnId: "amount",
                    transactionId: asTransactionId("transaction-1")
                }
            });
            act(() => {
                expect(controller.markRevealApplied(accepted)).toBe(true);
                expect(controller.focusPendingActivation(accepted)).toBe("focused");
            });
            const editor = screen.getByTestId("Invalid amount editor");
            fireEvent.change(editor, { target: { value: draft } });

            await act(async () => {
                fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" });
                await Promise.resolve();
            });

            expect(onSave).not.toHaveBeenCalled();
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });

            await act(async () => {
                destination.focus();
                await Promise.resolve();
            });

            expect(onSave).not.toHaveBeenCalled();
            expect(editor).toHaveAttribute("aria-invalid", "true");
            expect(editor).toHaveFocus();
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            destination.remove();
        }
    );

    it("keeps an invalid editor mounted when synchronous validation rejects movement", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        const onCommit = vi.fn();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={
                    <LifecycleTestEditor label="Invalid editor" onCommit={onCommit} valid={false} />
                }
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "full",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole("textbox", { name: "Invalid editor" });

        fireEvent.keyDown(editor, { key: "Enter" });
        await Promise.resolve();

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(editor).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
    });

    it("keeps an invalid date editor authoritative when a pointer presses another cell", async () => {
        const { cell, controller, interaction, table } = gridcellFixture("date");
        const row = table.getRowsInDisplayOrder()[0];
        const destinationCell = row?.getAllCellsByColumnId().description;
        const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
        if (destinationCell == null || destinationInteraction == null) {
            throw new Error("description destination fixture is missing");
        }
        const sourceAddress = {
            columnId: "date",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const destinationAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onSave = vi.fn();
        render(
            <>
                <TransactionGridCell
                    address={sourceAddress}
                    cell={cell}
                    ariaColumnIndex={2}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Date display</span>}
                    editor={
                        <InlineEditableDate
                            value="2026-08-25"
                            onSave={onSave}
                            onEditingChange={(editing) => {
                                if (!editing) controller.finishEditing(sourceAddress);
                            }}
                            ownerRowId={sourceAddress.transactionId}
                            data-testid="Invalid date editor"
                        />
                    }
                    showEditor
                />
                <TransactionGridCell
                    address={destinationAddress}
                    cell={destinationCell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={destinationInteraction}
                    selected={false}
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="Date pointer destination">Description</span>}
                />
            </>
        );
        const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        await act(async () => {
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
            await Promise.resolve();
        });
        const editor = screen.getByTestId("Invalid date editor");
        const onBlur = vi.fn();
        editor.addEventListener("blur", onBlur);
        fireEvent.change(editor, { target: { value: "not a date" } });

        const pointerDefaultAllowed = await act(async () => {
            const allowed = fireEvent.pointerDown(
                requiredGridcell(screen.getByTestId("Date pointer destination")),
                { button: 0 }
            );
            await Promise.resolve();
            return allowed;
        });

        expect(pointerDefaultAllowed).toBe(false);
        expect(onSave).not.toHaveBeenCalled();
        expect(onBlur).not.toHaveBeenCalled();
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        const interactionState = controller.getInteractionState();
        if (interactionState.kind !== "editing") {
            throw new Error(`expected editing state, received ${interactionState.kind}`);
        }
        expect(activeTransactionGridAddress(interactionState.selection)).toEqual(sourceAddress);
    });

    it("commits a valid date once before a pointer destination claims ownership", async () => {
        const { cell, controller, interaction, table } = gridcellFixture("date");
        const row = table.getRowsInDisplayOrder()[0];
        const destinationCell = row?.getAllCellsByColumnId().description;
        const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
        if (destinationCell == null || destinationInteraction == null) {
            throw new Error("description destination fixture is missing");
        }
        const sourceAddress = {
            columnId: "date",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const destinationAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onSave = vi.fn();
        render(
            <>
                <TransactionGridCell
                    address={sourceAddress}
                    cell={cell}
                    ariaColumnIndex={2}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Date display</span>}
                    editor={
                        <InlineEditableDate
                            value="2026-08-25"
                            onSave={onSave}
                            onEditingChange={(editing) => {
                                if (!editing) controller.finishEditing(sourceAddress);
                            }}
                            ownerRowId={sourceAddress.transactionId}
                            data-testid="Valid date editor"
                        />
                    }
                    showEditor
                />
                <TransactionGridCell
                    address={destinationAddress}
                    cell={destinationCell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={destinationInteraction}
                    selected={false}
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="Valid date pointer destination">Description</span>}
                />
            </>
        );
        const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        await act(async () => {
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
            await Promise.resolve();
        });
        fireEvent.change(screen.getByTestId("Valid date editor"), {
            target: { value: "25 December 2026" }
        });
        const destination = requiredGridcell(screen.getByTestId("Valid date pointer destination"));

        await act(async () => {
            fireEvent.pointerDown(destination, { button: 0 });
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith("2026-12-25");
        expect(destination).toHaveFocus();
        const interactionState = controller.getInteractionState();
        if (interactionState.kind !== "navigating") {
            throw new Error(`expected navigating state, received ${interactionState.kind}`);
        }
        expect(activeTransactionGridAddress(interactionState.selection)).toEqual(
            destinationAddress
        );
    });

    it.each([
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
            draft: "Changed description",
            expectedCommitCalls: 1,
            expectedEditing: false,
            expectedProposal: true,
            outcome: "changed"
        },
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
            draft: "Original description",
            expectedCommitCalls: 0,
            expectedEditing: false,
            expectedProposal: false,
            outcome: "unchanged"
        },
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
            draft: "Rejected description",
            expectedCommitCalls: 1,
            expectedEditing: true,
            expectedProposal: false,
            outcome: "rejected"
        }
    ])(
        "publishes a $outcome Description result before an assistive focus transfer finishes editing",
        async ({ commitResult, draft, expectedCommitCalls, expectedEditing, expectedProposal }) => {
            const { cell, controller, interaction } = gridcellFixture();
            const address = {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            } satisfies TransactionGridAddress;
            const publish = vi.spyOn(controller, "publishAutomationEditorCommit");
            const onCommitText = vi.fn(() => commitResult);
            const external = document.createElement("button");
            document.body.append(external);
            render(
                <TransactionGridCell
                    address={address}
                    cell={cell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Display</span>}
                    editor={
                        <InlineEditableDescriptionAlias
                            availableAliases={[]}
                            onCommitText={onCommitText}
                            onSelectAlias={() => TRANSACTION_GRID_EDITOR_COMMIT_FAILURE}
                            value="Original description"
                        />
                    }
                    showEditor
                />
            );
            const accepted = controller.beginActivation({ entry: "full", target: address });
            act(() => {
                expect(controller.markRevealApplied(accepted)).toBe(true);
                expect(controller.focusPendingActivation(accepted)).toBe("focused");
            });
            const editor = screen.getByRole("textbox", { name: "Transaction description" });
            if (draft !== "Original description") {
                fireEvent.change(editor, { target: { value: draft } });
            }

            await act(async () => {
                external.focus();
                await Promise.resolve();
            });

            expect(publish).toHaveBeenCalledOnce();
            expect(publish).toHaveBeenCalledWith(address, commitResult);
            expect(onCommitText).toHaveBeenCalledTimes(expectedCommitCalls);
            expect(controller.getSnapshot().automation.proposal != null).toBe(expectedProposal);
            expect(controller.getInteractionState().kind === "editing").toBe(expectedEditing);
            if (expectedEditing) expect(editor).toHaveFocus();
            else expect(external).toHaveFocus();
            external.remove();
        }
    );

    it.each([
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
            draft: "40",
            expectedCommitCalls: 1,
            expectedEditing: false,
            expectedProposal: true,
            outcome: "changed"
        },
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
            draft: "25",
            expectedCommitCalls: 0,
            expectedEditing: false,
            expectedProposal: false,
            outcome: "unchanged"
        },
        {
            commitResult: TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
            draft: "40",
            expectedCommitCalls: 1,
            expectedEditing: true,
            expectedProposal: false,
            outcome: "rejected"
        }
    ])(
        "publishes a $outcome Allocation result before an assistive focus transfer finishes editing",
        async ({ commitResult, draft, expectedCommitCalls, expectedEditing, expectedProposal }) => {
            const { cell, controller, interaction } = allocationGridcellFixture();
            const address = {
                columnId: "allocation:person-a",
                transactionId: asTransactionId("transaction-1")
            } satisfies TransactionGridAddress;
            const publish = vi.spyOn(controller, "publishAutomationEditorCommit");
            const onCommit = vi.fn(() => commitResult);
            const external = document.createElement("button");
            document.body.append(external);
            render(
                <TransactionGridCell
                    address={address}
                    cell={cell}
                    ariaColumnIndex={8}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Display</span>}
                    editor={
                        <PersonAllocationCell
                            allocations={{ "person-a": 25 }}
                            explicitValue={25}
                            onCommit={onCommit}
                            personId="person-a"
                            personLabel="Ada"
                            startEditing
                        />
                    }
                    showEditor
                />
            );
            const accepted = controller.beginActivation({ entry: "full", target: address });
            act(() => {
                expect(controller.markRevealApplied(accepted)).toBe(true);
                expect(controller.focusPendingActivation(accepted)).toBe("focused");
            });
            const editor = screen.getByRole("textbox", { name: "Ada allocation percentage" });
            if (draft !== "25") fireEvent.change(editor, { target: { value: draft } });

            await act(async () => {
                external.focus();
                await Promise.resolve();
            });

            expect(publish).toHaveBeenCalledOnce();
            expect(publish).toHaveBeenCalledWith(address, commitResult);
            expect(onCommit).toHaveBeenCalledTimes(expectedCommitCalls);
            expect(controller.getSnapshot().automation.proposal != null).toBe(expectedProposal);
            expect(controller.getInteractionState().kind === "editing").toBe(expectedEditing);
            if (expectedEditing) expect(editor).toHaveFocus();
            else expect(external).toHaveFocus();
            external.remove();
        }
    );

    it("validates the production allocation editor before pointer ownership moves", async () => {
        const { cell, controller, interaction, table } = gridcellFixture();
        const destinationCell = table
            .getRowsInDisplayOrder()[1]
            ?.getAllCellsByColumnId().description;
        const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
        if (destinationCell == null || destinationInteraction == null) {
            throw new Error("second-row description destination fixture is missing");
        }
        const sourceAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const destinationAddress = {
            columnId: "description",
            transactionId: asTransactionId("transaction-2")
        } satisfies TransactionGridAddress;
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        render(
            <>
                <TransactionGridCell
                    address={sourceAddress}
                    cell={cell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Display</span>}
                    editor={
                        <PersonAllocationCell
                            personId="person-a"
                            personLabel="Ada"
                            explicitValue={0}
                            onCommit={onCommit}
                            onEditingChange={(editing) => {
                                if (!editing) controller.finishEditing(sourceAddress);
                            }}
                            startEditing
                        />
                    }
                    showEditor
                />
                <TransactionGridCell
                    address={destinationAddress}
                    cell={destinationCell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={destinationInteraction}
                    selected={false}
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="Allocation pointer destination">Display</span>}
                />
            </>
        );
        const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole("textbox", { name: "Ada allocation percentage" });
        const destination = requiredGridcell(screen.getByTestId("Allocation pointer destination"));

        fireEvent.change(editor, { target: { value: "101" } });
        const invalidPointerDefaultAllowed = await act(async () => {
            const allowed = fireEvent.pointerDown(destination, { button: 0 });
            await Promise.resolve();
            return allowed;
        });

        expect(invalidPointerDefaultAllowed).toBe(false);
        expect(onCommit).not.toHaveBeenCalled();
        expect(editor).toHaveAttribute("aria-invalid", "true");
        expect(editor).toHaveFocus();
        const invalidInteractionState = controller.getInteractionState();
        if (invalidInteractionState.kind !== "editing") {
            throw new Error(`expected editing state, received ${invalidInteractionState.kind}`);
        }
        expect(activeTransactionGridAddress(invalidInteractionState.selection)).toEqual(
            sourceAddress
        );

        fireEvent.change(editor, { target: { value: "25" } });
        const validPointerDefaultAllowed = await act(async () => {
            const allowed = fireEvent.pointerDown(destination, { button: 0 });
            await Promise.resolve();
            return allowed;
        });

        expect(validPointerDefaultAllowed).toBe(true);
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith("person-a", 25);
        expect(destination).toHaveFocus();
        const validInteractionState = controller.getInteractionState();
        if (validInteractionState.kind !== "navigating") {
            throw new Error(`expected navigating state, received ${validInteractionState.kind}`);
        }
        expect(activeTransactionGridAddress(validInteractionState.selection)).toEqual(
            destinationAddress
        );
    });

    it("starts selected-cell CJK composition, blocks movement, and inserts once", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        const onCommit = vi.fn();
        const onInput = vi.fn();
        controller.setFocusedCell("transaction-1", "description");
        const address = {
            columnId: "description",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const view = render(
            <TransactionGridCell
                address={address}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="navigating"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        gridcell.focus();

        fireEvent.compositionStart(gridcell, { data: "" });
        const pending = controller.getPendingRequest();
        if (pending == null) throw new Error("composition activation was not pending");
        const identity = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };
        expect(pending).toMatchObject({
            composition: {
                emptyCompletion: "navigating",
                kind: "active",
                preview: "",
                sequence: 0
            },
            entry: "quick",
            kind: "edit",
            state: { target: address }
        });

        view.rerender(
            <TransactionGridCell
                address={address}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="pending-activation"
                selectionVisibility="suppressed"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={
                    <LifecycleTestEditor
                        label="Selected composition editor"
                        onCommit={onCommit}
                        onInput={onInput}
                    />
                }
                showEditor
            />
        );
        expect(controller.markRevealApplied(identity)).toBe(true);
        expect(controller.focusPendingActivation(identity)).toBe("focused");
        const editor = screen.getByRole<HTMLInputElement>("textbox", {
            name: "Selected composition editor"
        });
        const dispatch = vi.spyOn(controller, "dispatchCellIntent");

        fireEvent.compositionUpdate(editor, { data: "文章" });
        fireEvent.keyDown(editor, {
            altKey: true,
            isComposing: true,
            key: "ArrowRight",
            keyCode: 229,
            shiftKey: true
        });
        expect(editor).toHaveValue("");
        expect(onCommit).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
        expect(controller.getInteractionState()).toMatchObject({
            editor: {
                composition: {
                    emptyCompletion: "navigating",
                    kind: "active",
                    preview: "文章",
                    sequence: 0
                }
            },
            kind: "editing"
        });

        fireEvent.compositionEnd(editor, { data: "文章" });
        fireEvent(
            editor,
            new InputEvent("beforeinput", {
                bubbles: true,
                cancelable: true,
                data: "文章",
                inputType: "insertCompositionText"
            })
        );
        await Promise.resolve();
        await Promise.resolve();

        expect(editor).toHaveValue("文章");
        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onCommit).not.toHaveBeenCalled();
        expect(controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "inactive" } },
            kind: "editing",
            selection: [
                {
                    anchorColumnId: "description",
                    anchorRowId: "transaction-1"
                }
            ]
        });
    });

    it("resumes canonical quick-edit movement on the first distinct key after IME completion", async () => {
        const { cell, controller, interaction, table } = gridcellFixture("amount");
        const destinationCell = table.getRowsInDisplayOrder()[0]?.getAllCellsByColumnId().actions;
        const destinationInteraction = destinationCell?.column.columnDef.meta?.interaction;
        if (destinationCell == null || destinationInteraction == null) {
            throw new Error("actions destination fixture is missing");
        }
        const sourceAddress = {
            columnId: "amount",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const destinationAddress = {
            columnId: "actions",
            transactionId: asTransactionId("transaction-1")
        } satisfies TransactionGridAddress;
        const onBlur = vi.fn();
        const onCommit = vi.fn();
        const onInput = vi.fn();
        const dispatch = vi.spyOn(controller, "dispatchCellIntent");
        render(
            <>
                <TransactionGridCell
                    address={sourceAddress}
                    cell={cell}
                    ariaColumnIndex={8}
                    controller={controller}
                    interaction={interaction}
                    selected
                    interactionKind="editing"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Source display</span>}
                    editor={
                        <LifecycleTestEditor
                            label="IME resume source editor"
                            onBlur={onBlur}
                            onCommit={onCommit}
                            onInput={onInput}
                        />
                    }
                    showEditor
                />
                <TransactionGridCell
                    address={destinationAddress}
                    cell={destinationCell}
                    ariaColumnIndex={9}
                    controller={controller}
                    interaction={destinationInteraction}
                    selected={false}
                    interactionKind="navigating"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span data-testid="IME movement destination">Destination</span>}
                    legacyInteractive
                />
            </>
        );
        const accepted = controller.beginActivation({ entry: "quick", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole<HTMLInputElement>("textbox", {
            name: "IME resume source editor"
        });

        fireEvent.compositionStart(editor, { data: "" });
        fireEvent.compositionUpdate(editor, { data: "語" });
        fireEvent.compositionEnd(editor, { data: "語" });
        fireEvent(
            editor,
            new InputEvent("beforeinput", {
                bubbles: true,
                cancelable: true,
                data: "語",
                inputType: "insertCompositionText"
            })
        );
        fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" });

        expect(editor).toHaveValue("語");
        expect(onInput).toHaveBeenCalledOnce();
        expect(onCommit).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
        expect(controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "consumed" }, entry: "quick" },
            kind: "editing"
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "inactive" }, entry: "quick" },
            kind: "editing"
        });

        fireEvent.keyDown(editor, { altKey: true, key: "ArrowRight" });
        await Promise.resolve();

        const destination = requiredGridcell(screen.getByTestId("IME movement destination"));
        expect(onCommit).toHaveBeenCalledOnce();
        expect(onBlur).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledOnce();
        expect(destination).toHaveFocus();
        expect(controller.getPendingRequest()).toBeNull();
        const state = controller.getInteractionState();
        if (state.kind !== "navigating") {
            throw new Error(`expected navigating state, received ${state.kind}`);
        }
        expect(state.continuous).toEqual({ entry: "quick", kind: "continue" });
        expect(activeTransactionGridAddress(state.selection)).toEqual(destinationAddress);
    });

    it("restores navigation after a grid-origin composition is cancelled", async () => {
        const fixture = gridcellFixture();
        const onCancel = vi.fn();
        const onCommit = vi.fn();
        fixture.controller.setFocusedCell("transaction-1", "description");
        render(
            <CancelledCompositionGridCell
                fixture={fixture}
                onCancel={onCancel}
                onCommit={onCommit}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        gridcell.focus();

        fireEvent.compositionStart(gridcell, { data: "" });
        const pending = fixture.controller.getPendingRequest();
        if (pending == null) throw new Error("composition activation was not pending");
        const identity = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };
        act(() => {
            expect(fixture.controller.markRevealApplied(identity)).toBe(true);
            expect(fixture.controller.focusPendingActivation(identity)).toBe("focused");
        });
        const editor = screen.getByRole("textbox", { name: "Cancelled composition editor" });

        fireEvent.compositionEnd(editor, { data: "" });
        fireEvent.keyDown(editor, { key: "Enter" });
        expect(onCommit).not.toHaveBeenCalled();
        expect(fixture.controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "consumed", resume: "navigating", sequence: 0 } },
            kind: "editing"
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onCancel).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
        expect(fixture.controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(screen.queryByRole("textbox", { name: "Cancelled composition editor" })).toBeNull();
        expect(screen.getByTestId("cancelled-composition-display")).toBeInTheDocument();
        expect(gridcell).toHaveFocus();
    });

    it("retains an existing quick editor after its composition is cancelled", async () => {
        const fixture = gridcellFixture();
        const onCancel = vi.fn();
        const onCommit = vi.fn();
        const accepted = fixture.controller.beginActivation({
            entry: "quick",
            target: COMPOSITION_ADDRESS
        });
        render(
            <CancelledCompositionGridCell
                fixture={fixture}
                onCancel={onCancel}
                onCommit={onCommit}
            />
        );
        act(() => {
            expect(fixture.controller.markRevealApplied(accepted)).toBe(true);
            expect(fixture.controller.focusPendingActivation(accepted)).toBe("focused");
        });
        const editor = screen.getByRole("textbox", { name: "Cancelled composition editor" });

        fireEvent.compositionStart(editor, { data: "" });
        fireEvent.compositionEnd(editor, { data: "" });
        fireEvent.keyDown(editor, { key: "Enter" });
        expect(onCommit).not.toHaveBeenCalled();
        expect(fixture.controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "consumed", resume: "editing", sequence: 0 } },
            kind: "editing"
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onCancel).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
        expect(fixture.controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "inactive" } },
            kind: "editing"
        });
        expect(screen.getByRole("textbox", { name: "Cancelled composition editor" })).toBe(editor);
    });

    it("applies one completed IME sequence through the reducer fallback", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={<input aria-label="Composition editor" />}
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "quick",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole<HTMLInputElement>("textbox", {
            name: "Composition editor"
        });

        fireEvent.compositionStart(editor, { data: "" });
        fireEvent.compositionUpdate(editor, { data: "文" });
        fireEvent.keyDown(editor, { isComposing: true, key: "Enter", keyCode: 229 });
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        fireEvent.compositionEnd(editor, { data: "文" });
        await Promise.resolve();
        await Promise.resolve();

        expect(editor).toHaveValue("文");
        expect(controller.getInteractionState()).toMatchObject({
            editor: { composition: { kind: "inactive" } },
            kind: "editing"
        });
    });

    it("deduplicates authoritative IME insertion against its queued fallback", async () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={<input aria-label="Authoritative composition editor" />}
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "quick",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        const editor = screen.getByRole<HTMLInputElement>("textbox", {
            name: "Authoritative composition editor"
        });

        fireEvent.compositionStart(editor, { data: "" });
        fireEvent.compositionEnd(editor, { data: "語" });
        fireEvent(
            editor,
            new InputEvent("beforeinput", {
                bubbles: true,
                cancelable: true,
                data: "語",
                inputType: "insertCompositionText"
            })
        );
        await Promise.resolve();
        await Promise.resolve();

        expect(editor).toHaveValue("語");
    });

    it("opens the date interaction from full-edit Tab", () => {
        const { cell, controller, interaction } = gridcellFixture("date");
        const openCalendar = vi.fn();
        render(
            <TransactionGridCell
                address={{
                    columnId: "date",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={2}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                editor={
                    <div>
                        <input aria-label="Date editor" />
                        <button data-grid-open-interaction="calendar" onClick={openCalendar}>
                            Open
                        </button>
                    </div>
                }
                showEditor
            />
        );
        const accepted = controller.beginActivation({
            entry: "full",
            target: {
                columnId: "date",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        fireEvent.keyDown(screen.getByRole("textbox", { name: "Date editor" }), { key: "Tab" });

        expect(openCalendar).toHaveBeenCalledTimes(1);
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
    });

    it("adapts double click to the typed full-edit seam", () => {
        const { cell, controller, interaction } = gridcellFixture();
        const onEditRequest = vi.fn();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                selectionVisibility="suppressed"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                onEditRequest={onEditRequest}
            />
        );

        fireEvent.doubleClick(screen.getByRole("gridcell"));

        expect(onEditRequest).toHaveBeenCalledTimes(1);
        expect(onEditRequest).toHaveBeenCalledWith("full", undefined);
    });

    it.each(["Enter", "double click"] as const)(
        "activates an explicit legacy full-edit trigger from gridcell %s",
        (gesture) => {
            const { cell, controller, interaction } = gridcellFixture();
            const onActivation = vi.fn();
            render(
                <TransactionGridCell
                    address={{
                        columnId: "description",
                        transactionId: asTransactionId("transaction-1")
                    }}
                    cell={cell}
                    ariaColumnIndex={3}
                    controller={controller}
                    interaction={interaction}
                    selected={false}
                    interactionKind="idle"
                    selectionVisibility="suppressed"
                    isInitialTabStop={true}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    legacyInteractive
                    display={
                        <button data-legacy-edit-activation onClick={onActivation}>
                            Full edit
                        </button>
                    }
                />
            );
            const gridcell = screen.getByRole("gridcell");

            if (gesture === "Enter") {
                gridcell.focus();
                fireEvent.keyDown(gridcell, { key: "Enter" });
            } else {
                fireEvent.doubleClick(gridcell);
            }

            expect(onActivation).toHaveBeenCalledTimes(1);
            expect(document.activeElement).toBe(screen.getByRole("button", { name: "Full edit" }));
        }
    );

    it.each(["checkbox", "actions"] as const)(
        "does not adapt a %s background double click into edit",
        (columnId) => {
            const { cell, controller, interaction } = gridcellFixture(columnId);
            const dispatchCellIntent = vi.spyOn(controller, "dispatchCellIntent");
            controller.setFocusedCell("transaction-2", "description");
            const selectionBeforeDoubleClick = controller.cellSelectionAtom.get();
            const onEditRequest = vi.fn();
            render(
                <TransactionGridCell
                    address={{
                        columnId,
                        transactionId: asTransactionId("transaction-1")
                    }}
                    ariaColumnIndex={columnId === "checkbox" ? 1 : 8}
                    cell={cell}
                    controller={controller}
                    interaction={interaction}
                    selected={false}
                    interactionKind="navigating"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Activation display</span>}
                    onEditRequest={onEditRequest}
                />
            );

            fireEvent.doubleClick(screen.getByRole("gridcell"));

            expect(dispatchCellIntent).not.toHaveBeenCalled();
            expect(onEditRequest).not.toHaveBeenCalled();
            expect(controller.cellSelectionAtom.get()).toEqual(selectionBeforeDoubleClick);
        }
    );

    it("moves canonical arrows onto and back from the Actions wrapper", () => {
        const { controller, table } = gridcellFixture("amount");
        const row = table.getRowsInDisplayOrder()[0];
        const amountCell = row?.getAllCellsByColumnId().amount;
        const actionsCell = row?.getAllCellsByColumnId().actions;
        const amountInteraction = amountCell?.column.columnDef.meta?.interaction;
        const actionsInteraction = actionsCell?.column.columnDef.meta?.interaction;
        if (
            amountCell == null ||
            actionsCell == null ||
            amountInteraction == null ||
            actionsInteraction == null
        ) {
            throw new Error("amount and Actions fixtures are missing");
        }
        const view = render(
            <>
                <TransactionGridCell
                    address={{
                        columnId: "amount",
                        transactionId: asTransactionId("transaction-1")
                    }}
                    ariaColumnIndex={7}
                    cell={amountCell}
                    controller={controller}
                    interaction={amountInteraction}
                    selected
                    interactionKind="navigating"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Amount</span>}
                />
                <TransactionGridCell
                    address={{
                        columnId: "actions",
                        transactionId: asTransactionId("transaction-1")
                    }}
                    ariaColumnIndex={8}
                    cell={actionsCell}
                    controller={controller}
                    interaction={actionsInteraction}
                    selected={false}
                    interactionKind="navigating"
                    selectionVisibility="visible"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<button type="button">Expand</button>}
                    legacyInteractive
                />
            </>
        );
        const amount = view.container.querySelector('[role="gridcell"][data-cell="amount"]');
        const actions = view.container.querySelector('[role="gridcell"][data-cell="actions"]');
        if (!(amount instanceof HTMLElement) || !(actions instanceof HTMLElement)) {
            throw new Error("canonical wrappers are missing");
        }
        controller.setFocusedCell("transaction-1", "amount");
        amount.focus();

        fireEvent.keyDown(amount, { key: "ArrowRight" });
        expect(document.activeElement).toBe(actions);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "actions",
            anchorRowId: "transaction-1"
        });

        fireEvent.keyDown(actions, { key: "ArrowLeft" });
        expect(document.activeElement).toBe(amount);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "amount",
            anchorRowId: "transaction-1"
        });
    });

    it("lets explicit Actions activation focus its first descendant", () => {
        const { cell, controller, interaction } = gridcellFixture("actions");
        controller.setFocusedCell("transaction-1", "actions");
        render(
            <TransactionGridCell
                address={{
                    columnId: "actions",
                    transactionId: asTransactionId("transaction-1")
                }}
                ariaColumnIndex={8}
                cell={cell}
                controller={controller}
                interaction={interaction}
                selected
                interactionKind="navigating"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<button type="button">Expand notes</button>}
                legacyInteractive
            />
        );
        const actions = screen.getByRole("gridcell");
        actions.focus();

        fireEvent.keyDown(actions, { key: "Enter" });

        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Expand notes" }));
    });

    it("restores an idle gridcell focus origin without turning it into selection", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                selectionVisibility="suppressed"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        const external = document.createElement("button");
        document.body.append(external);
        gridcell.focus();
        controller.clearUserFocus();

        controller.dispatchCellIntent(
            {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            },
            { kind: "move-to", target: { kind: "grid-end" } },
            5
        );
        const pending = controller.getPendingRequest();
        if (pending == null) throw new Error("navigation request was not retained");
        const accepted = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };
        external.focus();
        controller.markRevealApplied(accepted);
        controller.registerCell(pending.state.target, document.createElement("div"));

        expect(controller.focusPendingActivation(accepted)).toBe("stale");
        expect(document.activeElement).toBe(gridcell);
        expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        external.remove();
    });

    it("preserves reconciliation-owned failure and editing mode through a real gridcell focus", () => {
        const { cell, controller, interaction, rows } = gridcellFixture();
        const originAddress = {
            columnId: "description" as const,
            transactionId: asTransactionId("transaction-1")
        };
        const editor = document.createElement("input");
        document.body.append(editor);
        controller.setFocusedCell("transaction-1", "description");
        const editingRequest = controller.beginActivation({ entry: "full", target: originAddress });
        expect(controller.markRevealApplied(editingRequest)).toBe(true);
        controller.registerEditor(originAddress, editor);
        expect(controller.focusPendingActivation(editingRequest)).toBe("focused");
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        render(
            <TransactionGridCell
                address={originAddress}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="editing"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        const pending = controller.beginActivation({
            entry: "full",
            target: {
                columnId: "description",
                transactionId: asTransactionId("transaction-2")
            }
        });
        updateTestTransactionGridController(controller, [
            ...rows,
            transaction({ id: "transaction-3" })
        ]);
        const rebased = controller.getPendingRequest();
        if (rebased == null) throw new Error("pending request was not rebased");
        expect(
            controller.abortPendingActivation(
                {
                    acceptedCommandId: rebased.state.acceptedCommandId,
                    projectionGeneration: rebased.state.projectionGeneration
                },
                { address: rebased.state.target, kind: "load-failed" }
            )
        ).toBe(true);
        expect(pending.acceptedCommandId).toBe(rebased.state.acceptedCommandId);

        expect(controller.focusReconciliation(controller.getSnapshot().generation)).toBe("focused");

        expect(document.activeElement).toBe(gridcell);
        expect(controller.getSnapshot().failure).toEqual({
            address: {
                columnId: "description",
                transactionId: "transaction-2"
            },
            kind: "load-failed"
        });
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        editor.remove();
    });

    it("keeps the parked anchor tabbable and exposes its retained range on focus", () => {
        const { cell, controller, interaction } = gridcellFixture();
        controller.setFocusedCell("transaction-1", "description");
        controller.dispatchCellIntent(
            {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            },
            { direction: "right", kind: "extend" },
            5
        );
        const retainedSelection = controller.cellSelectionAtom.get();
        controller.setFocusedActivation("transaction-1");
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="parked"
                selectionVisibility="suppressed"
                isInitialTabStop={false}
                isParkedTabStop={true}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");

        expect(gridcell).toHaveAttribute("tabindex", "0");
        expect(gridcell).not.toHaveAttribute("aria-selected");
        gridcell.focus();

        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.cellSelectionAtom.get()).toEqual(retainedSelection);
    });

    it("lets interactive descendants keep focus and pointer ownership", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                selectionVisibility="suppressed"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<div tabIndex={0}>Legacy editor</div>}
                legacyInteractive={true}
            />
        );

        const gridcell = screen.getByRole("gridcell");
        const editor = screen.getByText("Legacy editor");
        expect(gridcell).toHaveAttribute("tabindex", "0");

        fireEvent.focus(editor);
        expect(gridcell).toHaveAttribute("tabindex", "-1");
        fireEvent.pointerDown(editor, { button: 0 });
        fireEvent.keyDown(editor, { key: "ArrowRight" });

        expect(controller.cellSelectionAtom.get()).toEqual([]);
    });

    it("owns square selection, focus, validation and presence chrome on the outer cell", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="navigating"
                selectionVisibility="visible"
                isInitialTabStop={false}
                isParkedTabStop={false}
                presenceColor="rgb(12, 34, 56)"
                viewportRowDistance={5}
                display={<input aria-invalid="true" />}
            />
        );

        const gridcell = screen.getByRole("gridcell");
        expect(gridcell).toHaveAttribute("aria-selected", "true");
        expect(gridcell).toHaveAttribute("data-presence", "true");
        expect(gridcell).toHaveStyle({ outlineColor: "rgb(12, 34, 56)" });
        expect(gridcell.className).toContain("rounded-none");
        expect(gridcell.className).toContain("border-r");
        expect(gridcell.className).toContain("focus-within:ring-2");
        expect(gridcell.className).toContain("has-[[aria-invalid=true]]:ring-2");
    });

    it("keeps the parked tab stop without focus or selected paint classes", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="parked"
                selectionVisibility="suppressed"
                isInitialTabStop={false}
                isParkedTabStop={true}
                viewportRowDistance={5}
                display={<button type="button">Parked descendant</button>}
                legacyInteractive={true}
            />
        );

        const gridcell = screen.getByRole("gridcell");
        expect(gridcell).toHaveAttribute("tabindex", "0");
        expect(gridcell).not.toHaveAttribute("aria-selected");
        expect(gridcell.className).not.toContain("focus-within:ring-2");
        expect(gridcell.className).not.toContain("focus-visible:ring-2");
    });

    it("lets portaled descendants keep pointer ownership", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                selectionVisibility="suppressed"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={createPortal(<button type="button">Popup option</button>, document.body)}
            />
        );

        fireEvent.pointerDown(screen.getByRole("button", { name: "Popup option" }), { button: 0 });

        expect(controller.cellSelectionAtom.get()).toEqual([]);
    });
});

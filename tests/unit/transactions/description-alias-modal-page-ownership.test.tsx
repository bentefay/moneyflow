/**
 * The shared-alias confirmation dialog is owned by the page, beside the table rather than beneath
 * the active cell's editor provider. This test mounts that exact topology: marker attributes alone
 * cannot preserve the editor when Radix moves focus into the dialog, so the page must register the
 * live dialog root with its own workspace controller and exact description address.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionTable as TransactionTableComponent } from "@/components/features/transactions";
import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import type { TransactionGridAddress } from "@/components/features/transactions/table-model";
import type { TransactionInput } from "@/lib/crdt/schema";

import {
    createCrdtContextMock,
    createTransaction,
    descriptionAliasActionCalls,
    descriptionAliasCommitBoundaryMode,
    importMock,
    presenceMock,
    renderTransactionsPage,
    replaceRenderedVaultWith,
    routerMock,
    seedVaultDescriptionAliases,
    seedVaultWith,
    storedTransactionDescriptionAliasId
} from "./transactions-page-harness";
import { installVirtualGridLayout } from "./virtual-grid-harness";

const controllerCapture = vi.hoisted<{
    current: TransactionGridWorkspaceController | null;
}>(() => ({ current: null }));

vi.mock("next/navigation", () => routerMock);
vi.mock("@/lib/crdt/context", () => createCrdtContextMock());
vi.mock("@/hooks/use-identity", () => ({ usePubkeyHash: () => null }));
vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presenceMock
}));
vi.mock("@/components/features/import", () => importMock);
vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));
vi.mock("@/components/features/transactions", async () => {
    const actual = await vi.importActual<typeof import("@/components/features/transactions")>(
        "@/components/features/transactions"
    );
    return {
        ...actual,
        TransactionTable: (props: ComponentProps<typeof TransactionTableComponent>) => {
            controllerCapture.current = props.controller;
            return <actual.TransactionTable {...props} />;
        }
    };
});

const SHARED_ALIAS_ID = "alias-shared";
const TARGET_ALIAS_ID = "alias-target";
const REPLACEMENT_ALIAS_ID = "alias-replacement";
const FIRST_TRANSACTION_ID = "tx-shared-one";
const SECOND_TRANSACTION_ID = "tx-shared-two";

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

const originalScrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Element.prototype.scrollIntoView = () => undefined;
});
afterAll(() => {
    vi.unstubAllGlobals();
    if (originalScrollIntoView == null) {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    } else {
        Element.prototype.scrollIntoView = originalScrollIntoView;
    }
});

function sharedAliasTransaction(id: string, index: number): TransactionInput {
    return {
        ...createTransaction(index, 2),
        id,
        description: `Imported description ${String(index + 1)}`,
        descriptionAliasId: SHARED_ALIAS_ID
    };
}

function descriptionCell(transactionId: string): HTMLElement {
    const row = document.querySelector(`[data-transaction-id="${transactionId}"]`);
    const cell = row?.querySelector('[role="gridcell"][data-cell="description"]');
    if (!(cell instanceof HTMLElement)) {
        throw new Error(`Expected description cell for ${transactionId}`);
    }
    return cell;
}

async function openFirstDescriptionEditor(): Promise<{
    readonly cell: HTMLElement;
    readonly controller: TransactionGridWorkspaceController;
    readonly input: HTMLInputElement;
}> {
    await renderTransactionsPage();
    const cell = descriptionCell(FIRST_TRANSACTION_ID);
    fireEvent.doubleClick(cell);
    const input = await screen.findByTestId("description-editable");
    if (!(input instanceof HTMLInputElement)) {
        throw new Error("Expected the description editor input");
    }
    await waitFor(() => expect(cell).toHaveAttribute("data-cell-content", "editor"));
    const controller = controllerCapture.current;
    if (controller == null) throw new Error("Expected the page grid controller");
    return { cell, controller, input };
}

describe("page-level shared description alias modal ownership", () => {
    let restoreLayout: () => void;

    it("requires controller authority before publishing an alias modal request", async () => {
        const { authorizedAliasModalRequest } = await import("@/app/(app)/transactions/page");
        const request = { kind: "remove", transactionId: FIRST_TRANSACTION_ID } as const;

        expect(authorizedAliasModalRequest(false, request)).toBeNull();
        expect(authorizedAliasModalRequest(true, request)).toBe(request);
    });

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
        controllerCapture.current = null;
        seedVaultWith([
            sharedAliasTransaction(FIRST_TRANSACTION_ID, 0),
            sharedAliasTransaction(SECOND_TRANSACTION_ID, 1)
        ]);
        seedVaultDescriptionAliases({
            [SHARED_ALIAS_ID]: {
                kind: "real",
                id: SHARED_ALIAS_ID,
                name: "Shared café",
                symlinkIds: {},
                transactionIds: {
                    [FIRST_TRANSACTION_ID]: true,
                    [SECOND_TRANSACTION_ID]: true
                }
            },
            [TARGET_ALIAS_ID]: {
                kind: "real",
                id: TARGET_ALIAS_ID,
                name: "Target",
                symlinkIds: {},
                transactionIds: {}
            },
            [REPLACEMENT_ALIAS_ID]: {
                kind: "real",
                id: REPLACEMENT_ALIAS_ID,
                name: "Replacement",
                symlinkIds: {},
                transactionIds: {}
            }
        });
    });

    afterEach(() => restoreLayout());

    it("surfaces an imported Description proposal before continuous movement leaves its owner", async () => {
        const importedDescription = "COFFEE SHOP 123";
        seedVaultWith([
            {
                ...createTransaction(0, 2),
                description: importedDescription,
                descriptionAliasId: undefined,
                id: FIRST_TRANSACTION_ID
            },
            {
                ...createTransaction(1, 2),
                description: importedDescription,
                descriptionAliasId: undefined,
                id: SECOND_TRANSACTION_ID
            }
        ]);
        seedVaultDescriptionAliases({});
        descriptionAliasCommitBoundaryMode.current = "persist";
        await renderTransactionsPage();
        const cell = descriptionCell(FIRST_TRANSACTION_ID);
        fireEvent.doubleClick(cell);
        const input = await screen.findByTestId("description-editable");
        if (!(input instanceof HTMLInputElement)) {
            throw new Error("Expected the description editor input");
        }
        const controller = controllerCapture.current;
        if (controller == null) throw new Error("Expected the page grid controller");
        const registerFinalizer = vi.spyOn(controller, "registerAutomationFinalizer");
        fireEvent.change(input, { target: { value: "Coffee" } });

        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(storedTransactionDescriptionAliasId(FIRST_TRANSACTION_ID)).toBeDefined()
        );
        expect(cell).toHaveAttribute("data-cell-content", "display");
        expect(controller.getSnapshot().automation.proposal).toMatchObject({
            owner: {
                field: "descriptionAlias",
                transactionId: asTransactionId(FIRST_TRANSACTION_ID)
            },
            renderable: true
        });
        expect(controller.getSnapshot().activeTransactionId).toBe(FIRST_TRANSACTION_ID);
        expect(screen.getByTestId("description-rule-proposal")).toBeVisible();
        const registrationsBeforeModeChange = registerFinalizer.mock.calls.length;

        fireEvent.click(screen.getByTestId("proposal-apply-mode"));
        fireEvent.click(screen.getByRole("option", { name: "Updating all" }));
        expect(screen.getByTestId("proposal-apply-mode")).toHaveTextContent("Updating all");
        await waitFor(() =>
            expect(registerFinalizer.mock.calls.length).toBeGreaterThan(
                registrationsBeforeModeChange
            )
        );
        fireEvent.pointerDown(cell, { button: 0, pointerId: 83 });
        fireEvent.pointerUp(cell, { button: 0, pointerId: 83 });
        fireEvent.click(cell);
        cell.focus();
        fireEvent.keyDown(cell, { key: "Enter" });
        const reopenedInput = await screen.findByTestId("description-editable");
        fireEvent.keyDown(reopenedInput, { key: "Enter" });

        expect(controller.getSnapshot().automation.proposal).toBeNull();
        await waitFor(() =>
            expect(controller.getSnapshot().activeTransactionId).toBe(SECOND_TRANSACTION_ID)
        );
        expect(controller.getSnapshot().automation.proposal).toBeNull();
        expect(descriptionCell(SECOND_TRANSACTION_ID)).toHaveAttribute(
            "data-cell-content",
            "editor"
        );
    });

    it("keeps the exact description editor and caret across cancel", async () => {
        await renderTransactionsPage();
        const cell = descriptionCell(FIRST_TRANSACTION_ID);
        fireEvent.doubleClick(cell);

        const input = await screen.findByTestId("description-editable");
        if (!(input instanceof HTMLInputElement)) {
            throw new Error("Expected the description editor input");
        }
        await waitFor(() => expect(cell).toHaveAttribute("data-cell-content", "editor"));
        fireEvent.change(input, { target: { value: "A novel shared name" } });
        input.setSelectionRange(2, 8);
        fireEvent.keyDown(input, { key: "Enter" });

        const dialog = await screen.findByRole("dialog", { name: "Change Description" });
        const firstAction = screen.getByRole("button", { name: "Change just this one" });
        const controller = controllerCapture.current;
        if (controller == null) throw new Error("Expected the page grid controller");

        expect(dialog).toBeVisible();
        expect(firstAction).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
        if (overlay == null) throw new Error("Expected the description modal overlay");
        const owner: TransactionGridAddress = {
            columnId: "description",
            transactionId: asTransactionId(FIRST_TRANSACTION_ID)
        };
        expect(controller.isRegisteredEditorPortalTarget(owner, dialog)).toBe(true);
        expect(controller.isRegisteredEditorPortalTarget(owner, overlay)).toBe(true);
        expect(
            controller.isRegisteredEditorPortalTarget(
                {
                    columnId: "description",
                    transactionId: asTransactionId(SECOND_TRANSACTION_ID)
                },
                overlay
            )
        ).toBe(false);
        expect(cell).toHaveAttribute("data-cell-content", "editor");
        expect(input.isConnected).toBe(true);
        expect(controller.getSnapshot().automation.proposal).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(cell).toHaveAttribute("data-cell-content", "editor");
        expect(input.isConnected).toBe(true);
        expect(input).toHaveFocus();
        expect(input).toHaveValue("A novel shared name");
        expect(input.selectionStart).toBe(2);
        expect(input.selectionEnd).toBe(8);
        expect(controller.getSnapshot().automation.proposal).toBeNull();
    });

    it.each(["Escape", "overlay"] as const)(
        "dismisses through $dismissal with canonical top-level popup ownership",
        async (dismissal) => {
            const { cell, controller, input } = await openFirstDescriptionEditor();
            fireEvent.change(input, { target: { value: "A dismissed shared name" } });
            input.setSelectionRange(4, 11);
            fireEvent.keyDown(input, { key: "Enter" });
            const dialog = await screen.findByRole("dialog", { name: "Change Description" });

            if (dismissal === "Escape") {
                fireEvent.keyDown(dialog, { key: "Escape" });
            } else {
                const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
                if (overlay == null) throw new Error("Expected the description modal overlay");
                fireEvent.pointerDown(overlay, { button: 0, pointerId: 82 });
                fireEvent.pointerUp(overlay, { button: 0, pointerId: 82 });
                expect(fireEvent.click(overlay)).toBe(true);
            }

            await waitFor(() => expect(dialog).not.toBeInTheDocument());
            if (dismissal === "Escape") {
                expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
                expect(cell).toHaveAttribute("data-cell-content", "display");
                expect(input.isConnected).toBe(false);
                expect(cell).toHaveFocus();
                fireEvent.doubleClick(cell);
                expect(await screen.findByTestId("description-editable")).toHaveValue(
                    "Shared café"
                );
            } else {
                expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
                expect(cell).toHaveAttribute("data-cell-content", "editor");
                expect(input.isConnected).toBe(true);
                expect(input).toHaveFocus();
                expect(input).toHaveValue("A dismissed shared name");
                expect(input.selectionStart).toBe(4);
                expect(input.selectionEnd).toBe(11);
            }
            expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
            expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);
        }
    );

    it("retains the source editor when an external blur opens the modal", async () => {
        const { cell, controller, input } = await openFirstDescriptionEditor();
        fireEvent.change(input, { target: { value: "A blur-created shared name" } });
        input.setSelectionRange(3, 9);
        const addTransaction = screen.getByRole("button", { name: "Add transaction" });

        expect(fireEvent.pointerDown(addTransaction, { button: 0, pointerId: 81 })).toBe(false);
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        fireEvent.pointerUp(addTransaction, { button: 0, pointerId: 81 });
        expect(controller.getInteractionState()).toMatchObject({ kind: "interacting" });
        expect(fireEvent.click(addTransaction)).toBe(false);
        expect(screen.getByText("2 transactions")).toBeVisible();

        const dialog = await screen.findByRole("dialog", { name: "Change Description" });
        expect(screen.getByRole("button", { name: "Change just this one" })).toHaveFocus();
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        expect(cell).toHaveAttribute("data-cell-content", "editor");
        expect(input.isConnected).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(screen.getByText("2 transactions")).toBeVisible();
        expect(input).toHaveFocus();
        expect(input).toHaveValue("A blur-created shared name");
        expect(input.selectionStart).toBe(3);
        expect(input.selectionEnd).toBe(9);
    });

    it.each(["add", "checkbox"] as const)(
        "suppresses click-only $destination activation when an open alias listbox hands off to the modal",
        async (destination) => {
            const { cell, controller, input } = await openFirstDescriptionEditor();
            fireEvent.change(input, { target: { value: "Tar" } });
            input.setSelectionRange(1, 2);
            await screen.findByRole("listbox", { name: "Description aliases" });
            const destinationElement = (() => {
                if (destination === "add") {
                    return screen.getByRole("button", { name: "Add transaction" });
                }
                const row = screen.getAllByTestId("transaction-row")[1];
                const checkbox = row.querySelector<HTMLElement>('[data-cell="checkbox"] button');
                if (checkbox == null) throw new Error("Expected the destination row checkbox");
                return checkbox;
            })();
            const checkboxStateBefore = destinationElement.getAttribute("data-state");

            expect(fireEvent.click(destinationElement)).toBe(false);

            const dialog = await screen.findByRole("dialog", { name: "Change Description" });
            expect(screen.getByRole("button", { name: "Change just this one" })).toHaveFocus();
            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup: "modal"
            });
            expect(cell).toHaveAttribute("data-cell-content", "editor");
            expect(input.isConnected).toBe(true);
            expect(screen.getByText("2 transactions")).toBeVisible();
            expect(destinationElement.getAttribute("data-state")).toBe(checkboxStateBefore);
            expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
            expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);

            fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
            await waitFor(() => expect(dialog).not.toBeInTheDocument());
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            expect(input.isConnected).toBe(true);
            expect(input).toHaveFocus();
            expect(input).toHaveValue("Tar");
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(2);
        }
    );

    it("retains the source editor when autocomplete selection opens the modal", async () => {
        const { cell, controller, input } = await openFirstDescriptionEditor();
        fireEvent.change(input, { target: { value: "Tar" } });
        input.setSelectionRange(1, 2);
        fireEvent.click(await screen.findByRole("option", { name: "Target" }));

        const dialog = await screen.findByRole("dialog", { name: "Change Description" });
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "modal"
        });
        expect(cell).toHaveAttribute("data-cell-content", "editor");
        expect(input.isConnected).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(input).toHaveFocus();
        expect(input).toHaveValue("Target");
        expect(input.selectionStart).toBe(1);
        expect(input.selectionEnd).toBe(2);
    });

    it("does not publish a modal request without exact controller authority", async () => {
        const { controller, input } = await openFirstDescriptionEditor();
        const setEditorInteraction = controller.setEditorInteraction;
        const interactionSpy = vi
            .spyOn(controller, "setEditorInteraction")
            .mockImplementation((address, popup, open) =>
                popup === "modal" && open ? false : setEditorInteraction(address, popup, open)
            );

        fireEvent.change(input, { target: { value: "A rejected shared name" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "Change Description" })
            ).not.toBeInTheDocument()
        );
        expect(interactionSpy).toHaveBeenCalledWith(
            {
                columnId: "description",
                transactionId: asTransactionId(FIRST_TRANSACTION_ID)
            },
            "modal",
            true
        );
        expect(controller.getInteractionState()).not.toMatchObject({
            kind: "interacting",
            popup: "modal"
        });
        expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
        expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);
    });

    it.each([
        {
            actionName: "Change just this one",
            expectedCall: descriptionAliasActionCalls.changeOne,
            otherCall: descriptionAliasActionCalls.changeAll
        },
        {
            actionName: "Change all",
            expectedCall: descriptionAliasActionCalls.changeAll,
            otherCall: descriptionAliasActionCalls.changeOne
        }
    ])(
        "consumes $actionName once and restores the exact source editor",
        async ({ actionName, expectedCall, otherCall }) => {
            const { cell, controller, input } = await openFirstDescriptionEditor();
            fireEvent.change(input, { target: { value: "Tar" } });
            input.setSelectionRange(1, 2);
            fireEvent.click(await screen.findByRole("option", { name: "Target" }));
            const action = await screen.findByRole("button", { name: actionName });
            expect(controller.getSnapshot().automation.proposal).toBeNull();

            act(() => {
                action.click();
                action.click();
            });

            await waitFor(() =>
                expect(
                    screen.queryByRole("dialog", { name: "Change Description" })
                ).not.toBeInTheDocument()
            );
            expect(expectedCall).toHaveLength(1);
            expect(otherCall).toHaveLength(0);
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            expect(cell).toHaveAttribute("data-cell-content", "editor");
            expect(input.isConnected).toBe(true);
            expect(input).toHaveFocus();
            expect(input).toHaveValue("Target");
            expect(input.selectionStart).toBe(1);
            expect(input.selectionEnd).toBe(2);
            expect(controller.getSnapshot().automation.proposal).toEqual({
                draftOverride: null,
                errorOverride: null,
                owner: {
                    field: "descriptionAlias",
                    transactionId: asTransactionId(FIRST_TRANSACTION_ID)
                },
                renderable: true
            });
        }
    );

    it.each([
        {
            actionName: "Remove from just this one",
            expectedCall: descriptionAliasActionCalls.removeOne
        },
        {
            actionName: "Remove from all",
            expectedCall: descriptionAliasActionCalls.removeAll
        }
    ])(
        "keeps the exact description editor when $actionName",
        async ({ actionName, expectedCall }) => {
            const { cell, controller, input } = await openFirstDescriptionEditor();
            fireEvent.change(input, { target: { value: "" } });
            input.setSelectionRange(0, 0);
            fireEvent.keyDown(input, { key: "Enter" });

            const action = await screen.findByRole("button", { name: actionName });
            act(() => {
                action.click();
                action.click();
            });

            await waitFor(() =>
                expect(
                    screen.queryByRole("dialog", { name: "Remove Description" })
                ).not.toBeInTheDocument()
            );
            expect(expectedCall).toHaveLength(1);
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            expect(cell).toHaveAttribute("data-cell-content", "editor");
            expect(input.isConnected).toBe(true);
            expect(input).toHaveFocus();
            expect(input).toHaveValue("");
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(0);
        }
    );

    it("clears the last alias while closed without leaving a hidden proposal or badge", async () => {
        descriptionAliasCommitBoundaryMode.current = "persist";
        await renderTransactionsPage();
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        const cell = descriptionCell(FIRST_TRANSACTION_ID);
        fireEvent.doubleClick(cell);
        const input = await screen.findByTestId("description-editable");
        if (!(input instanceof HTMLInputElement)) {
            throw new Error("Expected the description editor input");
        }
        fireEvent.change(input, { target: { value: "" } });
        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.click(await screen.findByRole("button", { name: "Remove from just this one" }));

        await waitFor(() =>
            expect(storedTransactionDescriptionAliasId(FIRST_TRANSACTION_ID)).toBeUndefined()
        );
        const controller = controllerCapture.current;
        if (controller == null) throw new Error("Expected the page grid controller");
        await waitFor(() => expect(controller.getSnapshot().automation.proposal).toBeNull());
        expect(screen.queryByTestId("description-rule-proposal")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("transaction-inspector-automation-badge")
        ).not.toBeInTheDocument();
        expect(descriptionAliasActionCalls.removeOne).toHaveLength(1);
    });

    it.each([
        { dialogName: "Change Description", kind: "change" },
        { dialogName: "Remove Description", kind: "remove" }
    ] as const)(
        "closes a stale $kind request when sync replaces its expected alias identity",
        async ({ dialogName, kind }) => {
            const { controller, input } = await openFirstDescriptionEditor();
            if (kind === "change") {
                fireEvent.change(input, { target: { value: "Tar" } });
                fireEvent.click(await screen.findByRole("option", { name: "Target" }));
            } else {
                fireEvent.change(input, { target: { value: "" } });
                fireEvent.keyDown(input, { key: "Enter" });
            }
            await screen.findByRole("dialog", { name: dialogName });

            act(() =>
                replaceRenderedVaultWith([
                    {
                        ...sharedAliasTransaction(FIRST_TRANSACTION_ID, 0),
                        descriptionAliasId: REPLACEMENT_ALIAS_ID
                    },
                    sharedAliasTransaction(SECOND_TRANSACTION_ID, 1)
                ])
            );

            await waitFor(() =>
                expect(screen.queryByRole("dialog", { name: dialogName })).not.toBeInTheDocument()
            );
            expect(controller.getInteractionState()).not.toMatchObject({
                kind: "interacting",
                popup: "modal"
            });
            expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);
            expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
            expect(descriptionAliasActionCalls.removeOne).toHaveLength(0);
            expect(descriptionAliasActionCalls.removeAll).toHaveLength(0);
        }
    );

    it("cancels a stale modal without restoring focus over reconciliation", async () => {
        const { controller, input } = await openFirstDescriptionEditor();
        fireEvent.change(input, { target: { value: "A stale shared name" } });
        fireEvent.keyDown(input, { key: "Enter" });
        await screen.findByRole("dialog", { name: "Change Description" });

        act(() => replaceRenderedVaultWith([sharedAliasTransaction(SECOND_TRANSACTION_ID, 1)]));

        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "Change Description" })
            ).not.toBeInTheDocument()
        );
        expect(controller.getSnapshot().activeTransactionId).toBe(SECOND_TRANSACTION_ID);
        expect(controller.getInteractionState()).not.toMatchObject({
            kind: "interacting",
            popup: "modal"
        });
        expect(input.isConnected).toBe(false);
        expect(document.activeElement).not.toBe(input);
        expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
        expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);
    });

    it("retains a non-Escape alias close before one Escape cancels the editor", async () => {
        const { cell, controller, input } = await openFirstDescriptionEditor();
        expect(input).toHaveFocus();
        expect(cell).toHaveAttribute(
            "aria-description",
            "Original imported description: Imported description 1"
        );

        fireEvent.change(input, { target: { value: "Tar" } });
        input.setSelectionRange(1, 2);
        await screen.findByRole("listbox", { name: "Description aliases" });
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "grid-editor",
            popup: "listbox"
        });

        fireEvent.change(input, { target: { value: "Unmatched draft" } });
        input.setSelectionRange(3, 8);

        await waitFor(() =>
            expect(
                screen.queryByRole("listbox", { name: "Description aliases" })
            ).not.toBeInTheDocument()
        );
        await waitFor(() =>
            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" })
        );
        expect(screen.getByTestId("description-editable")).toBe(input);
        expect(cell).toHaveAttribute("data-cell-content", "editor");
        expect(cell).toHaveAttribute(
            "aria-description",
            "Original imported description: Imported description 1"
        );
        expect(input.isConnected).toBe(true);
        expect(input).toHaveFocus();
        expect(input).toHaveValue("Unmatched draft");
        expect(input.selectionStart).toBe(3);
        expect(input.selectionEnd).toBe(8);
        expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
        expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);

        fireEvent.change(input, { target: { value: "Tar" } });
        input.setSelectionRange(1, 2);
        await screen.findByRole("listbox", { name: "Description aliases" });
        fireEvent.keyDown(input, { key: "Escape" });

        await waitFor(() =>
            expect(
                screen.queryByRole("listbox", { name: "Description aliases" })
            ).not.toBeInTheDocument()
        );
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(cell).toHaveAttribute("data-cell-content", "display");
        expect(cell).toHaveAttribute(
            "aria-description",
            "Original imported description: Imported description 1"
        );
        expect(input.isConnected).toBe(false);
        expect(cell).toHaveFocus();
        expect(descriptionAliasActionCalls.changeAll).toHaveLength(0);
        expect(descriptionAliasActionCalls.changeOne).toHaveLength(0);

        fireEvent.doubleClick(cell);
        const reopenedInput = await screen.findByTestId("description-editable");
        expect(reopenedInput).not.toBe(input);
        expect(reopenedInput).toHaveValue("Shared café");
    });
});

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { flushSync } from "react-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";

import {
    createCrdtContextMock,
    createTransaction,
    importMock,
    presenceMock,
    renderTransactionsPage,
    routerMock,
    seedVaultWith,
    statusUpdates
} from "./transactions-page-harness";
import { installVirtualGridLayout } from "./virtual-grid-harness";

const gridControllerProbe = vi.hoisted<{
    current: TransactionGridWorkspaceController | null;
}>(() => ({ current: null }));

vi.mock("next/navigation", () => routerMock);
vi.mock("@/components/features/transactions", async () => {
    const actual = await vi.importActual<typeof import("@/components/features/transactions")>(
        "@/components/features/transactions"
    );
    return {
        ...actual,
        useTransactionGridWorkspace: () => {
            const controller = actual.useTransactionGridWorkspace();
            gridControllerProbe.current = controller;
            return controller;
        }
    };
});
vi.mock("@/lib/crdt/context", () => createCrdtContextMock());
vi.mock("@/hooks/use-identity", () => ({ usePubkeyHash: () => null }));
vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presenceMock
}));
vi.mock("@/components/features/import", () => importMock);

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

const TRANSACTION_ID = "tx-account-popup";
const SECOND_TRANSACTION_ID = "tx-account-popup-two";

function requiredController(): TransactionGridWorkspaceController {
    const controller = gridControllerProbe.current;
    if (controller == null) throw new Error("Expected the page grid controller");
    return controller;
}

function captureEnabled(options?: boolean | AddEventListenerOptions): boolean {
    return typeof options === "boolean" ? options : options?.capture === true;
}

function invokeEventListener(listener: EventListenerOrEventListenerObject, event: Event): void {
    if (typeof listener === "function") listener.call(document, event);
    else listener.handleEvent(event);
}

function installSynchronousDocumentCaptureUpdates(): () => void {
    const originalAddEventListener = document.addEventListener.bind(document);
    const originalRemoveEventListener = document.removeEventListener.bind(document);
    const wrappedListeners = new Map<EventListenerOrEventListenerObject, EventListener>();
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    addEventListenerSpy.mockImplementation((type, listener, options) => {
        if (type !== "keydown" || !captureEnabled(options)) {
            originalAddEventListener(type, listener, options);
            return;
        }
        const wrapped: EventListener = (event) => {
            flushSync(() => invokeEventListener(listener, event));
        };
        wrappedListeners.set(listener, wrapped);
        originalAddEventListener(type, wrapped, options);
    });
    removeEventListenerSpy.mockImplementation((type, listener, options) => {
        const wrapped = type === "keydown" ? wrappedListeners.get(listener) : undefined;
        originalRemoveEventListener(type, wrapped ?? listener, options);
        if (wrapped != null) wrappedListeners.delete(listener);
    });

    return () => {
        for (const wrapped of wrappedListeners.values()) {
            originalRemoveEventListener("keydown", wrapped, true);
        }
        wrappedListeners.clear();
        removeEventListenerSpy.mockRestore();
        addEventListenerSpy.mockRestore();
    };
}

function openCellEditorThroughBrowserDoubleClick(cell: HTMLElement): void {
    fireEvent.pointerDown(cell, { button: 0, detail: 1, pointerId: 1 });
    fireEvent.mouseDown(cell, { button: 0, detail: 1 });
    fireEvent.pointerUp(cell, { button: 0, detail: 1, pointerId: 1 });
    fireEvent.mouseUp(cell, { button: 0, detail: 1 });
    fireEvent.click(cell, { button: 0, detail: 1 });
    fireEvent.pointerDown(cell, { button: 0, detail: 2, pointerId: 1 });
    fireEvent.mouseDown(cell, { button: 0, detail: 2 });
    fireEvent.pointerUp(cell, { button: 0, detail: 2, pointerId: 1 });
    fireEvent.mouseUp(cell, { button: 0, detail: 2 });
    fireEvent.click(cell, { button: 0, detail: 2 });
    fireEvent.doubleClick(cell, { button: 0, detail: 2 });
}

function gridCell(
    columnId: "account" | "description" | "status" | "tags",
    transactionId = TRANSACTION_ID
): HTMLElement {
    const cell = document.querySelector(
        `[data-transaction-id="${transactionId}"] [role="gridcell"][data-cell="${columnId}"]`
    );
    if (!(cell instanceof HTMLElement)) throw new Error(`Expected ${columnId} gridcell`);
    return cell;
}

describe("transaction page popup ownership", () => {
    let restoreCaptureUpdates: (() => void) | null = null;
    let restoreLayout: () => void;

    beforeEach(() => {
        gridControllerProbe.current = null;
        restoreLayout = installVirtualGridLayout();
        seedVaultWith([
            { ...createTransaction(0, 2), description: "Row One", id: TRANSACTION_ID },
            { ...createTransaction(1, 2), description: "Row Two", id: SECOND_TRANSACTION_ID }
        ]);
    });

    afterEach(() => {
        restoreCaptureUpdates?.();
        restoreCaptureUpdates = null;
        restoreLayout();
    });

    it.each([
        {
            direction: "ArrowLeft",
            sourceTransactionId: TRANSACTION_ID,
            targetColumn: "description",
            targetTransactionId: TRANSACTION_ID
        },
        {
            direction: "ArrowRight",
            sourceTransactionId: TRANSACTION_ID,
            targetColumn: "tags",
            targetTransactionId: TRANSACTION_ID
        },
        {
            direction: "ArrowUp",
            sourceTransactionId: SECOND_TRANSACTION_ID,
            targetColumn: "account",
            targetTransactionId: TRANSACTION_ID
        },
        {
            direction: "ArrowDown",
            sourceTransactionId: TRANSACTION_ID,
            targetColumn: "account",
            targetTransactionId: SECOND_TRANSACTION_ID
        }
    ] as const)(
        "retires the Account editor on popup Escape before $direction",
        async ({ direction, sourceTransactionId, targetColumn, targetTransactionId }) => {
            await renderTransactionsPage();
            const controller = requiredController();
            const accountCell = gridCell("account", sourceTransactionId);
            restoreCaptureUpdates = installSynchronousDocumentCaptureUpdates();
            openCellEditorThroughBrowserDoubleClick(accountCell);

            const search = await screen.findByPlaceholderText("Search accounts...");
            await waitFor(() => expect(search).toHaveFocus());
            const accountTrigger = screen.getByRole("combobox", { name: "Select account" });
            const accountTriggerFocus = vi.spyOn(accountTrigger, "focus");
            const portalOwner = search.closest<HTMLElement>(
                "[data-owned-by-row][data-owned-by-field]"
            );
            if (portalOwner == null) throw new Error("Expected the Account portal owner");
            const interaction = controller.getInteractionState();
            const diagnostics = {
                activeElementIsSearch: document.activeElement === search,
                cellContent: accountCell.dataset.cellContent,
                interactionKind: interaction.kind,
                interactionOwner: interaction.kind === "interacting" ? interaction.owner : null,
                interactionPopup: interaction.kind === "interacting" ? interaction.popup : null,
                ownerField: portalOwner.dataset.ownedByField,
                ownerRow: portalOwner.dataset.ownedByRow,
                registeredPortalTarget: controller.isRegisteredEditorPortalTarget(
                    {
                        columnId: "account",
                        transactionId: asTransactionId(sourceTransactionId)
                    },
                    search
                )
            };
            console.info("Account popup Escape precondition", diagnostics);
            expect(diagnostics).toEqual({
                activeElementIsSearch: true,
                cellContent: "editor",
                interactionKind: "interacting",
                interactionOwner: "grid-editor",
                interactionPopup: "combobox",
                ownerField: "account",
                ownerRow: sourceTransactionId,
                registeredPortalTarget: true
            });
            const portalRecognitionAtEscape: boolean[] = [];
            const recognizeRegisteredPortalTarget = controller.isRegisteredEditorPortalTarget;
            vi.spyOn(controller, "isRegisteredEditorPortalTarget").mockImplementation(
                (address, target) => {
                    const recognized = recognizeRegisteredPortalTarget(address, target);
                    if (target === search) portalRecognitionAtEscape.push(recognized);
                    return recognized;
                }
            );

            fireEvent.keyDown(search, { key: "Escape" });
            await waitFor(() =>
                expect(screen.queryByPlaceholderText("Search accounts...")).not.toBeInTheDocument()
            );
            await act(async () => {
                await Promise.resolve();
                await Promise.resolve();
            });
            const interactionAfterEscape = controller.getInteractionState();
            console.info("Account popup Escape result", {
                activeElementIsAccountTrigger: document.activeElement === accountTrigger,
                cellContent: accountCell.dataset.cellContent,
                editorMounted: controller.getSnapshot().editor != null,
                interactionKind: interactionAfterEscape.kind,
                portalRecognitionAtEscape
            });

            expect(portalRecognitionAtEscape).toEqual([]);
            expect(accountTriggerFocus).not.toHaveBeenCalled();
            expect(controller.getSnapshot().editor).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
            expect(
                screen.queryByRole("combobox", { name: "Select account" })
            ).not.toBeInTheDocument();
            expect(accountCell).toHaveAttribute("data-cell-content", "display");
            expect(accountCell).toHaveAttribute("aria-selected", "true");
            expect(accountCell).toHaveFocus();

            fireEvent.keyDown(accountCell, { key: direction });

            const targetCell = gridCell(targetColumn, targetTransactionId);
            expect(targetCell).toHaveFocus();
            expect(targetCell).toHaveAttribute("aria-selected", "true");
            expect(targetCell).toHaveAttribute("data-cell-content", "display");
            expect(accountCell).toHaveAttribute("aria-selected", "false");
            expect(screen.queryByPlaceholderText("Search tags...")).not.toBeInTheDocument();
        },
        15_000
    );

    it("retires the Status editor through the local Radix Escape boundary", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const statusCell = gridCell("status");
        restoreCaptureUpdates = installSynchronousDocumentCaptureUpdates();
        openCellEditorThroughBrowserDoubleClick(statusCell);

        const selectedOption = await screen.findByRole("option", { name: "For review" });
        await waitFor(() => expect(selectedOption).toHaveFocus());
        const statusTrigger = screen.getByTestId("status-editable");
        const statusTriggerFocus = vi.spyOn(statusTrigger, "focus");
        const portalOwner = selectedOption.closest<HTMLElement>(
            "[data-owned-by-row][data-owned-by-field]"
        );
        if (portalOwner == null) throw new Error("Expected the Status portal owner");
        const interaction = controller.getInteractionState();
        expect({
            activeElementIsSelectedOption: document.activeElement === selectedOption,
            cellContent: statusCell.dataset.cellContent,
            interactionKind: interaction.kind,
            interactionOwner: interaction.kind === "interacting" ? interaction.owner : null,
            interactionPopup: interaction.kind === "interacting" ? interaction.popup : null,
            ownerField: portalOwner.dataset.ownedByField,
            ownerRow: portalOwner.dataset.ownedByRow,
            registeredPortalTarget: controller.isRegisteredEditorPortalTarget(
                {
                    columnId: "status",
                    transactionId: asTransactionId(TRANSACTION_ID)
                },
                selectedOption
            )
        }).toEqual({
            activeElementIsSelectedOption: true,
            cellContent: "editor",
            interactionKind: "interacting",
            interactionOwner: "grid-editor",
            interactionPopup: "listbox",
            ownerField: "status",
            ownerRow: TRANSACTION_ID,
            registeredPortalTarget: true
        });
        const portalRecognitionAtEscape: boolean[] = [];
        const recognizeRegisteredPortalTarget = controller.isRegisteredEditorPortalTarget;
        vi.spyOn(controller, "isRegisteredEditorPortalTarget").mockImplementation(
            (address, target) => {
                const recognized = recognizeRegisteredPortalTarget(address, target);
                if (target === selectedOption) portalRecognitionAtEscape.push(recognized);
                return recognized;
            }
        );

        fireEvent.keyDown(selectedOption, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(portalRecognitionAtEscape).toEqual([]);
        expect(statusTriggerFocus).toHaveBeenCalledTimes(1);
        expect(statusUpdates).toEqual([]);
        expect(controller.getSnapshot().editor).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(screen.queryByTestId("status-editable")).not.toBeInTheDocument();
        expect(statusCell).toHaveAttribute("data-cell-content", "display");
        expect(statusCell).toHaveAttribute("aria-selected", "true");
        expect(statusCell).toHaveFocus();
        expect(statusCell).toHaveTextContent("For review");

        fireEvent.keyDown(statusCell, { key: "ArrowLeft" });

        const tagsCell = gridCell("tags");
        expect(tagsCell).toHaveFocus();
        expect(tagsCell).toHaveAttribute("aria-selected", "true");
        expect(tagsCell).toHaveAttribute("data-cell-content", "display");
        expect(statusCell).toHaveAttribute("aria-selected", "false");
        expect(screen.queryByPlaceholderText("Search tags...")).not.toBeInTheDocument();
    }, 15_000);
});

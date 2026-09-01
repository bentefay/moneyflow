import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME } from "@/components/features/transactions/cells/cell-chrome";
import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";

import {
    createCrdtContextMock,
    importMock,
    notesUpdates,
    presenceMock,
    renderTransactionsPage,
    routerMock,
    seedVault,
    transactionInspectorPreference,
    vault
} from "./transactions-page-harness";
import {
    gridScrollContainer,
    HARNESS_ROW_HEIGHT,
    installVirtualGridLayout,
    scrollGridTo
} from "./virtual-grid-harness";

const identityMock = vi.hoisted((): { pubkeyHash: string | null } => ({ pubkeyHash: "viewer" }));
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
vi.mock("@/hooks/use-identity", () => ({ usePubkeyHash: () => identityMock.pubkeyHash }));
vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presenceMock
}));
vi.mock("@/components/features/import", () => importMock);
vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

function requiredController(): TransactionGridWorkspaceController {
    const controller = gridControllerProbe.current;
    if (controller == null) throw new Error("Expected the page grid controller");
    return controller;
}

function firstDescriptionGridcell(): HTMLElement {
    const description = document.querySelector<HTMLElement>(
        '[data-transaction-id="tx-0000"] [role="gridcell"][data-cell="description"]'
    );
    if (description == null) throw new Error("Expected first description gridcell");
    return description;
}

function narrowShellGeometry(shell: HTMLElement): {
    readonly gap: number;
    readonly inspectorMinimum: number;
    readonly tableMinimum: number;
} {
    const gap = shell.classList.contains("gap-4") ? 16 : shell.classList.contains("gap-8") ? 32 : 0;
    const hasRequiredTracks = shell.classList.contains(
        "grid-rows-[minmax(8rem,1fr)_minmax(6rem,min(18rem,40%))]"
    );
    return {
        gap,
        inspectorMinimum: hasRequiredTracks ? 96 : 0,
        tableMinimum: hasRequiredTracks ? 128 : 0
    };
}

async function drainDelayedGridBlur(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
}

async function reconcileOwnedInspectorToEmpty(
    controller: TransactionGridWorkspaceController
): Promise<HTMLElement> {
    const description = firstDescriptionGridcell();
    act(() => description.focus());
    const notes = screen.getByTestId("notes-editable");
    fireEvent.change(notes, { target: { value: "owned search memo" } });
    const search = screen.getByPlaceholderText("Search description, notes...");
    act(() => search.focus());
    await drainDelayedGridBlur();
    fireEvent.change(search, { target: { value: "owned search memo" } });
    await waitFor(() => expect(screen.getByText("1 transaction (filtered)")).toBeInTheDocument());
    act(() => notes.focus());
    await drainDelayedGridBlur();
    expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });

    fireEvent.change(notes, { target: { value: "memo no longer matching" } });
    const heading = screen.getByTestId("transaction-inspector-title");
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(controller.getSnapshot()).toMatchObject({
        activeAddress: null,
        inspectorPanelOpen: true,
        interactionKind: "idle"
    });
    return heading;
}

describe("transactions page inspector shell", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
        gridControllerProbe.current = null;
        identityMock.pubkeyHash = "viewer";
        seedVault(2);
    });

    afterEach(() => {
        cleanup();
        restoreLayout();
    });

    // This whole-page journey completes in 1.61–1.65s across six quiet runs, but reached 5.17s
    // under the full 182-file campaign's concurrent transform/render load. Keep a local ceiling on
    // the converging page remount barriers rather than treating scheduler contention as a hang.
    it("defaults open, renders one nonmodal landmark, and persists toolbar toggles", async () => {
        await renderTransactionsPage();

        const inspector = screen.getByTestId("transaction-inspector");
        const toggle = screen.getByTestId("transaction-inspector-toggle");
        expect(screen.getAllByRole("complementary")).toEqual([inspector]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(toggle).toHaveAttribute("aria-controls", "transaction-inspector");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByText(/focus a transaction cell/i)).toBeInTheDocument();

        act(() => toggle.focus());
        fireEvent.click(toggle);
        expect(document.activeElement).toBe(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(inspector).toHaveAttribute("hidden");
        expect(transactionInspectorPreference.persisted).toEqual([false]);

        cleanup();
        await renderTransactionsPage();
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
        expect(screen.getByTestId("transaction-inspector-toggle")).toHaveAttribute(
            "aria-expanded",
            "false"
        );
    }, 15_000);

    it("keeps a nonzero shell reachable below wrapped filters in a short outer viewport", async () => {
        await renderTransactionsPage();
        const pageScrollRegion = screen.getByTestId("transactions-page-scroll-region");
        const shell = screen.getByTestId("transaction-grid-shell");
        const filters = pageScrollRegion.firstElementChild;
        if (!(filters instanceof HTMLElement)) throw new Error("Expected the transaction filters");

        expect(pageScrollRegion.className).toContain("overflow-y-auto");
        expect(shell.className).toContain("min-h-[15rem]");
        const viewportHeight = 176;
        const filtersHeight = 224;
        const shellHeight = shell.classList.contains("min-h-[15rem]") ? 240 : 0;
        const gap = 16;
        let scrollTop = 0;
        Object.defineProperties(pageScrollRegion, {
            clientHeight: { configurable: true, value: viewportHeight },
            scrollHeight: {
                configurable: true,
                get: () => filtersHeight + gap + shellHeight
            },
            scrollTop: {
                configurable: true,
                get: () => scrollTop,
                set: (next: number) => {
                    scrollTop = next;
                }
            }
        });
        shell.getBoundingClientRect = () =>
            DOMRect.fromRect({
                height: shellHeight,
                width: 800,
                x: 0,
                y: filtersHeight + gap - scrollTop
            });

        expect(shellHeight).toBe(240);
        expect(shell.getBoundingClientRect().top).toBeGreaterThan(viewportHeight);
        pageScrollRegion.scrollTop = pageScrollRegion.scrollHeight - pageScrollRegion.clientHeight;
        expect(shell.getBoundingClientRect().height).toBe(240);
        expect(shell.getBoundingClientRect().bottom).toBe(viewportHeight);
    });

    it("keeps a long-list short narrow shell usable while revealing the inspector", async () => {
        seedVault(100);
        transactionInspectorPreference.open = false;
        await renderTransactionsPage();
        const pageScrollRegion = screen.getByTestId("transactions-page-scroll-region");
        const shell = screen.getByTestId("transaction-grid-shell");
        const inspector = screen.getByTestId("transaction-inspector");
        const inspectorHeading = screen.getByTestId("transaction-inspector-title");
        const toggle = screen.getByTestId("transaction-inspector-toggle");
        const toolbar = screen.getByTestId("transaction-table-toolbar");
        const dropTarget = shell.firstElementChild;
        const table = screen.getByTestId("transaction-table");
        if (!(dropTarget instanceof HTMLElement)) {
            throw new Error("Expected the transaction table panel");
        }
        const tableViewport = table.parentElement;
        if (!(tableViewport instanceof HTMLElement)) {
            throw new Error("Expected the virtual table scroll viewport");
        }

        expect(pageScrollRegion.className).toContain("overflow-x-hidden");
        expect(shell.className).toContain("overflow-hidden");
        expect(shell.className).toContain("grid-rows-[minmax(0,1fr)]");
        expect(toolbar.className).toContain("min-w-0");
        expect(toolbar.className).toContain("flex-wrap");
        expect(toolbar.className).not.toContain("min-w-fit");
        expect(toolbar).toContainElement(screen.getByTestId("add-transaction-button"));
        expect(toolbar).toContainElement(toggle);
        expect(toolbar).toHaveTextContent("100 transactions");
        expect(shell.className).toContain("min-h-[28rem]");
        expect(dropTarget.className).toContain("min-h-[28rem]");
        expect(tableViewport.className).toContain("overflow-auto");
        expect(tableViewport.clientHeight).toBeGreaterThan(0);
        expect(tableViewport.scrollHeight).toBeGreaterThan(tableViewport.clientHeight);
        expect(inspector).toHaveAttribute("hidden");

        const shellHeight = 176;
        const shellWidth = 320;
        const toolbarHeight = toolbar.classList.contains("flex-wrap") ? 72 : 48;
        const shellRect = DOMRect.fromRect({
            height: shellHeight,
            width: shellWidth,
            x: 0,
            y: 0
        });
        const shellContentHeight = (): number => {
            const geometry = narrowShellGeometry(shell);
            return geometry.tableMinimum + geometry.gap + geometry.inspectorMinimum;
        };
        shell.getBoundingClientRect = () => shellRect;
        Object.defineProperties(shell, {
            clientHeight: { configurable: true, value: shellHeight },
            scrollHeight: { configurable: true, get: shellContentHeight }
        });
        dropTarget.getBoundingClientRect = () => {
            const geometry = narrowShellGeometry(shell);
            return DOMRect.fromRect({
                height: geometry.tableMinimum,
                width: shellWidth,
                x: 0,
                y: shellRect.top - shell.scrollTop
            });
        };
        tableViewport.getBoundingClientRect = () => {
            const geometry = narrowShellGeometry(shell);
            return DOMRect.fromRect({
                height: geometry.tableMinimum - toolbarHeight,
                width: shellWidth,
                x: 0,
                y: shellRect.top + toolbarHeight - shell.scrollTop
            });
        };
        Object.defineProperty(tableViewport, "clientHeight", {
            configurable: true,
            get: () => narrowShellGeometry(shell).tableMinimum - toolbarHeight
        });
        inspector.getBoundingClientRect = () => {
            const geometry = narrowShellGeometry(shell);
            return DOMRect.fromRect({
                height: geometry.inspectorMinimum,
                width: shellWidth,
                x: 0,
                y: shellRect.top + geometry.tableMinimum + geometry.gap - shell.scrollTop
            });
        };
        inspectorHeading.getBoundingClientRect = () => {
            const inspectorRect = inspector.getBoundingClientRect();
            return DOMRect.fromRect({
                height: 24,
                width: 240,
                x: 16,
                y: inspectorRect.top + 16
            });
        };
        toggle.getBoundingClientRect = () =>
            DOMRect.fromRect({
                height: 32,
                width: 112,
                x: 140,
                y: shellRect.top + 8 - shell.scrollTop
            });
        const revealInspectorRoot = vi.fn();
        const revealInspectorHeading = vi.fn(() => {
            if (!shell.classList.contains("overflow-y-auto")) return;
            const headingRect = inspectorHeading.getBoundingClientRect();
            if (headingRect.bottom > shellRect.bottom) {
                shell.scrollTop += headingRect.bottom - shellRect.bottom;
            } else if (headingRect.top < shellRect.top) {
                shell.scrollTop -= shellRect.top - headingRect.top;
            }
        });
        inspector.scrollIntoView = revealInspectorRoot;
        inspectorHeading.scrollIntoView = revealInspectorHeading;

        act(() => toggle.focus());
        fireEvent.click(toggle);
        await waitFor(() => expect(revealInspectorHeading).toHaveBeenCalledTimes(1));

        expect(revealInspectorHeading).toHaveBeenCalledWith({
            block: "nearest",
            inline: "nearest"
        });
        expect(revealInspectorRoot).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(toggle);
        expect(inspector).not.toHaveAttribute("hidden");
        expect(transactionInspectorPreference.persisted).toEqual([true]);
        const revealedHeadingRect = inspectorHeading.getBoundingClientRect();
        expect(revealedHeadingRect.top).toBeGreaterThanOrEqual(shellRect.top);
        expect(revealedHeadingRect.bottom).toBeLessThanOrEqual(shellRect.bottom);
        const retainedToggleRect = toggle.getBoundingClientRect();
        expect(retainedToggleRect.bottom).toBeGreaterThan(shellRect.top);
        expect(retainedToggleRect.top).toBeLessThan(shellRect.bottom);
        expect(shell.className).toContain("overflow-y-auto");
        expect(shell.className).toContain("min-h-[15rem]");
        expect(shell.className).toContain("xl:overflow-hidden");
        expect(shell.className).toContain(
            "grid-rows-[minmax(8rem,1fr)_minmax(6rem,min(18rem,40%))]"
        );
        const geometry = narrowShellGeometry(shell);
        expect(geometry.tableMinimum).toBe(128);
        expect(geometry.inspectorMinimum).toBe(96);
        expect(toolbarHeight).toBe(72);
        expect(shellContentHeight()).toBe(240);
        expect(shellHeight).toBeLessThan(shellContentHeight());
        expect(shell.scrollHeight).toBe(shellContentHeight());
        expect(shell.scrollTop).toBeGreaterThan(0);
        expect(shell.scrollTop).toBeLessThan(shellContentHeight() - shellHeight);
        expect(dropTarget.className).toContain("min-h-0");
        expect(dropTarget.className).not.toContain("min-h-[28rem]");
        expect(inspector.className).toContain("h-full");
        expect(inspector.className).toContain("min-h-0");

        shell.scrollTop = 0;
        const recoveredTableRect = tableViewport.getBoundingClientRect();
        expect(recoveredTableRect.top).toBeGreaterThanOrEqual(shellRect.top);
        expect(recoveredTableRect.bottom).toBeLessThanOrEqual(shellRect.bottom);
        expect(recoveredTableRect.height).toBe(geometry.tableMinimum - toolbarHeight);
        expect(tableViewport.scrollHeight).toBeGreaterThan(tableViewport.clientHeight);
        expect(fireEvent.wheel(tableViewport, { deltaY: 120 })).toBe(true);
        expect(
            fireEvent.touchMove(tableViewport, {
                touches: [{ clientX: 10, clientY: 120 }]
            })
        ).toBe(true);
        expect(shell.scrollTop).toBe(0);
    });

    it("keeps delayed Notes ownership inspecting and closes to the current gridcell", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();
        const close = screen.getByRole("button", { name: "Close transaction inspector" });

        act(() => description.focus());
        const notes = screen.getByTestId("notes-editable");
        expect(controller.getSnapshot().selectionVisibility).toBe("visible");
        act(() => notes.focus());
        await drainDelayedGridBlur();

        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        expect(controller.getSnapshot().selectionVisibility).toBe("muted");
        expect(description).toHaveAttribute("aria-selected", "true");
        expect(description.className).toContain(TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME);
        expect(close).toHaveAttribute("data-inspector-action", "close");
        expect(close).toHaveAttribute("data-transaction-owner", "tx-0000");
        fireEvent.click(close);

        expect(document.activeElement).toBe(description);
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: {
                columnId: "description",
                transactionId: asTransactionId("tx-0000")
            },
            interactionKind: "navigating",
            selectionVisibility: "visible"
        });
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
        expect(transactionInspectorPreference.persisted).toEqual([false]);
    });

    it.each(["Close", "Escape"] as const)(
        "reveals a pinned offscreen gridcell before %s returns inspector focus",
        async (closeKind) => {
            seedVault(100);
            await renderTransactionsPage();
            const controller = requiredController();
            const description = firstDescriptionGridcell();
            act(() => description.focus());
            const notes = screen.getByTestId("notes-editable");
            act(() => notes.focus());
            await drainDelayedGridBlur();
            expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
            const focus = vi.spyOn(description, "focus");

            scrollGridTo(40 * HARNESS_ROW_HEIGHT);
            const scrollContainer = gridScrollContainer();
            const stickyHeader = document.querySelector<HTMLElement>(".sticky");
            if (stickyHeader == null) throw new Error("Expected the sticky grid header");
            expect(scrollContainer.scrollTop).toBeGreaterThan(0);
            expect(scrollContainer.className).toContain("scroll-pt-[37px]");
            expect(description.isConnected).toBe(true);
            const scrollContainerRect = DOMRect.fromRect({
                height: 80,
                width: 1_000,
                x: 0,
                y: 0
            });
            const stickyHeaderRect = DOMRect.fromRect({
                height: 37,
                width: 1_000,
                x: 0,
                y: 0
            });
            let descriptionTop = -HARNESS_ROW_HEIGHT;
            let scrollTop = scrollContainer.scrollTop;
            const startingScrollTop = scrollTop;
            Object.defineProperty(scrollContainer, "scrollTop", {
                configurable: true,
                get: () => scrollTop,
                set: (next: number) => {
                    descriptionTop += scrollTop - next;
                    scrollTop = next;
                }
            });
            scrollContainer.getBoundingClientRect = () => scrollContainerRect;
            stickyHeader.getBoundingClientRect = () => stickyHeaderRect;
            description.getBoundingClientRect = () =>
                DOMRect.fromRect({
                    height: HARNESS_ROW_HEIGHT,
                    width: 200,
                    x: 100,
                    y: descriptionTop
                });
            expect(description.getBoundingClientRect().bottom).toBeLessThanOrEqual(
                stickyHeaderRect.bottom
            );
            const focusOrder: string[] = [];
            const reveal = vi.fn((options?: boolean | ScrollIntoViewOptions) => {
                focusOrder.push("reveal");
                descriptionTop =
                    typeof options === "object" && options.block === "center"
                        ? scrollContainerRect.top +
                          (scrollContainerRect.height - HARNESS_ROW_HEIGHT) / 2
                        : stickyHeaderRect.top;
            });
            description.scrollIntoView = reveal;
            description.addEventListener("focus", () => focusOrder.push("focus"));

            if (closeKind === "Close") {
                fireEvent.click(
                    screen.getByRole("button", { name: "Close transaction inspector" })
                );
            } else {
                fireEvent.keyDown(notes, { key: "Escape" });
            }

            expect(focusOrder).toEqual(["reveal", "focus"]);
            expect(reveal).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
            expect(focus).toHaveBeenCalledWith({ preventScroll: true });
            expect(scrollContainer.scrollTop).toBeLessThan(startingScrollTop);
            const revealedDescriptionRect = description.getBoundingClientRect();
            expect(revealedDescriptionRect.top).toBeGreaterThanOrEqual(stickyHeaderRect.bottom);
            expect(revealedDescriptionRect.top).toBeLessThan(scrollContainerRect.bottom);
            expect(document.activeElement).toBe(description);
            focus.mockRestore();
        }
    );

    it("keeps delayed Close ownership inspecting after a parked transition", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();
        const toggle = screen.getByTestId("transaction-inspector-toggle");
        const close = screen.getByRole("button", { name: "Close transaction inspector" });

        act(() => description.focus());
        act(() => toggle.focus());
        expect(controller.getSnapshot().selectionVisibility).toBe("suppressed");
        act(() => close.focus());
        await drainDelayedGridBlur();

        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        expect(controller.getSnapshot().selectionVisibility).toBe("muted");
        expect(description).toHaveAttribute("aria-selected", "true");
        fireEvent.click(close);

        expect(document.activeElement).toBe(description);
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: {
                columnId: "description",
                transactionId: asTransactionId("tx-0000")
            },
            interactionKind: "navigating"
        });
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
        expect(transactionInspectorPreference.persisted).toEqual([false]);
    });

    it("returns remote inspector closure to the current-generation gridcell", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();

        act(() => description.focus());
        const notes = screen.getByTestId("notes-editable");
        act(() => notes.focus());
        await drainDelayedGridBlur();
        const generation = controller.getSnapshot().generation;
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });

        act(() => {
            transactionInspectorPreference.open = false;
            for (const listener of vault.listeners) listener();
        });

        await waitFor(() => expect(document.activeElement).toBe(description));
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: {
                columnId: "description",
                transactionId: asTransactionId("tx-0000")
            },
            generation,
            inspectorPanelOpen: false,
            interactionKind: "navigating"
        });
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
    });

    it.each(["close", "escape", "remote", "direct"] as const)(
        "returns empty-first inspector focus to after-grid on %s closure",
        async (closeKind) => {
            await renderTransactionsPage();
            const controller = requiredController();
            const heading = await reconcileOwnedInspectorToEmpty(controller);

            if (closeKind === "close") {
                fireEvent.click(
                    screen.getByRole("button", { name: "Close transaction inspector" })
                );
            } else if (closeKind === "escape") {
                fireEvent.keyDown(heading, { key: "Escape" });
            } else if (closeKind === "remote") {
                act(() => {
                    transactionInspectorPreference.open = false;
                    for (const listener of vault.listeners) listener();
                });
            } else {
                act(() => controller.setInspectorPanelOpen(false));
            }

            const afterGrid = screen.getByRole("button", { name: "After transactions" });
            await waitFor(() => expect(document.activeElement).toBe(afterGrid));
            expect(controller.getSnapshot()).toMatchObject({
                activeAddress: null,
                inspectorPanelOpen: false,
                interactionKind: "idle"
            });
            expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
        }
    );

    it("keeps Notes-to-search focus external through structural filtering", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();
        act(() => description.focus());
        const notes = screen.getByTestId("notes-editable");
        act(() => notes.focus());
        await drainDelayedGridBlur();
        const search = screen.getByPlaceholderText("Search description, notes...");

        act(() => search.focus());
        await drainDelayedGridBlur();
        fireEvent.change(search, { target: { value: "Groceries" } });
        await waitFor(() =>
            expect(screen.getByText("1 transaction (filtered)")).toBeInTheDocument()
        );

        expect(document.activeElement).toBe(search);
        expect(controller.getSnapshot()).toMatchObject({
            inspectorPanelOpen: true,
            interactionKind: "parked",
            selectionVisibility: "suppressed"
        });
    });

    it("keeps the external toolbar toggle focused when it closes an inspecting row", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();
        const toggle = screen.getByTestId("transaction-inspector-toggle");

        act(() => description.focus());
        const notes = screen.getByTestId("notes-editable");
        act(() => notes.focus());
        await drainDelayedGridBlur();
        act(() => toggle.focus());
        fireEvent.click(toggle);

        expect(document.activeElement).toBe(toggle);
        expect(controller.getSnapshot()).toMatchObject({
            inspectorPanelOpen: false,
            interactionKind: "parked",
            selectionVisibility: "suppressed"
        });
        expect(description).not.toHaveAttribute("aria-selected");
        expect(transactionInspectorPreference.persisted).toEqual([false]);
    });

    it("renders visible, muted inspector, muted inspector-popup, and hidden selection modes", async () => {
        await renderTransactionsPage();
        const controller = requiredController();
        const description = firstDescriptionGridcell();
        const toggle = screen.getByTestId("transaction-inspector-toggle");
        const notesRegistration = {
            binding: { action: "notes", kind: "action" } as const,
            transactionOwner: asTransactionId("tx-0000")
        };

        act(() => description.focus());
        const notes = screen.getByTestId("notes-editable");
        expect(controller.getSnapshot().selectionVisibility).toBe("visible");
        expect(description).toHaveAttribute("aria-selected", "true");
        expect(description.className).not.toContain(TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME);

        act(() => notes.focus());
        await drainDelayedGridBlur();
        expect(controller.getSnapshot()).toMatchObject({
            interactionKind: "inspecting",
            selectionVisibility: "muted"
        });
        expect(description).toHaveAttribute("aria-selected", "true");
        expect(description.className).toContain(TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME);

        act(() => {
            controller.setInspectorInteraction(notesRegistration, "widget", true);
        });
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            owner: "inspector"
        });
        expect(controller.getSnapshot().selectionVisibility).toBe("muted");
        expect(description).toHaveAttribute("aria-selected", "true");
        expect(description.className).toContain(TRANSACTION_GRIDCELL_MUTED_SELECTION_CHROME);

        act(() => {
            controller.setInspectorInteraction(notesRegistration, "widget", false);
        });
        act(() => toggle.focus());
        fireEvent.click(toggle);
        await drainDelayedGridBlur();
        expect(controller.getSnapshot().selectionVisibility).toBe("suppressed");
        expect(description).not.toHaveAttribute("aria-selected");
    });

    it("closes locally without persisting when viewer identity is unavailable", async () => {
        identityMock.pubkeyHash = null;
        await renderTransactionsPage();
        const description = document.querySelector<HTMLElement>(
            '[data-transaction-id="tx-0000"] [role="gridcell"][data-cell="description"]'
        );
        if (description == null) throw new Error("Expected first description gridcell");
        const close = screen.getByRole("button", { name: "Close transaction inspector" });

        act(() => description.focus());
        act(() => close.focus());
        fireEvent.click(close);

        expect(document.activeElement).toBe(description);
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute("hidden");
        expect(screen.getByTestId("transaction-inspector-toggle")).toHaveAttribute(
            "aria-expanded",
            "false"
        );
        expect(transactionInspectorPreference.persisted).toEqual([]);
    });

    it("follows canonical cell focus while checkbox row selection is ignored", async () => {
        await renderTransactionsPage();
        const first = document.querySelector<HTMLElement>('[data-transaction-id="tx-0000"]');
        const second = document.querySelector<HTMLElement>('[data-transaction-id="tx-0001"]');
        if (first == null || second == null) throw new Error("Expected both transaction rows");
        const description = first.querySelector<HTMLElement>('[data-cell="description"]');
        const secondCheckbox = second.querySelector<HTMLButtonElement>(
            '[data-testid="row-checkbox"] button'
        );
        if (description == null || secondCheckbox == null) {
            throw new Error("Expected description and checkbox controls");
        }

        act(() => description.focus());
        expect(screen.getAllByText("Groceries 0")).toHaveLength(2);
        const notes = screen.getByTestId("notes-editable");
        expect(notes).toHaveAttribute("data-transaction-owner", "tx-0000");

        fireEvent.click(secondCheckbox);
        expect(screen.getByTestId("notes-editable")).toBe(notes);
        expect(notes).toHaveAttribute("data-transaction-owner", "tx-0000");
        expect(screen.getAllByText("Groceries 0")).toHaveLength(2);
    });

    it.each(["Enter", " "])(
        "opens from the active actions cell with %s and moves focus to the inspector heading",
        async (key) => {
            transactionInspectorPreference.open = false;
            await renderTransactionsPage();
            const actions = document.querySelector<HTMLElement>(
                '[data-transaction-id="tx-0000"] [role="gridcell"][data-cell="actions"]'
            );
            if (actions == null) throw new Error("Expected actions gridcell");
            const heading = screen.getByTestId("transaction-inspector-title");
            const focusOrder: string[] = [];
            const reveal = vi.fn(() => focusOrder.push("reveal"));
            heading.scrollIntoView = reveal;
            heading.addEventListener("focus", () => focusOrder.push("focus"));

            act(() => actions.focus());
            fireEvent.keyDown(actions, { key });

            await waitFor(() => expect(document.activeElement).toBe(heading));
            expect(focusOrder).toEqual(["reveal", "focus"]);
            expect(reveal).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
            expect(screen.getByTestId("transaction-inspector-toggle")).toHaveAttribute(
                "aria-expanded",
                "true"
            );
            expect(transactionInspectorPreference.persisted).toEqual([true]);
        }
    );

    it("writes notes on every input and keeps notes search behavior live", async () => {
        await renderTransactionsPage();
        const description = document.querySelector<HTMLElement>(
            '[data-transaction-id="tx-0000"] [data-cell="description"]'
        );
        if (description == null) throw new Error("Expected first description cell");
        act(() => description.focus());

        fireEvent.change(screen.getByTestId("notes-editable"), {
            target: { value: "unique inspector memo" }
        });
        expect(notesUpdates).toEqual([{ id: "tx-0000", notes: "unique inspector memo" }]);

        fireEvent.change(screen.getByPlaceholderText("Search description, notes..."), {
            target: { value: "unique inspector memo" }
        });
        await waitFor(() =>
            expect(screen.getByText("1 transaction (filtered)")).toBeInTheDocument()
        );
        expect(document.querySelector('[data-transaction-id="tx-0000"]')).toBeInTheDocument();
    });
});

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { asPercentage } from "@/types";

import {
    createCrdtContextMock,
    createTransaction,
    fieldRuleApplicationCalls,
    fieldRuleCreateCalls,
    fieldRuleCreateFailure,
    importMock,
    presenceMock,
    renderTransactionsPage,
    renderedRowIds,
    replaceRenderedVaultWith,
    routerMock,
    seedRememberedAutomationChoice,
    seedVaultWith,
    storedTransactionAllocations,
    storedTransactionTagIds,
    transactionAllocationCalls,
    transactionAllocationCommitBoundaryMode,
    transactionTagCommitBoundaryMode,
    vaultActionCalls,
    vaultTags,
    seedVaultPeople
} from "./transactions-page-harness";
import { HARNESS_ROW_HEIGHT, installVirtualGridLayout, scrollGridTo } from "./virtual-grid-harness";

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
vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

class InspectorMediaQuery extends EventTarget {
    readonly media = "(min-width: 80rem)";
    matches: boolean;

    constructor(matches: boolean) {
        super();
        this.matches = matches;
    }

    setMatches(matches: boolean): void {
        this.matches = matches;
        this.dispatchEvent(new Event("change"));
    }
}

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");

beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn()
    });
});
afterAll(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    if (originalMatchMedia == null) {
        Reflect.deleteProperty(window, "matchMedia");
    } else {
        Object.defineProperty(window, "matchMedia", originalMatchMedia);
    }
});

const TRANSACTION_ID = "tx-create-tag";

function requiredController(): TransactionGridWorkspaceController {
    const controller = gridControllerProbe.current;
    if (controller == null) throw new Error("Expected the page grid controller");
    return controller;
}

function gridCell(marker: string, transactionId = TRANSACTION_ID): HTMLElement {
    const cell = document.querySelector(
        `[data-transaction-id="${transactionId}"] [role="gridcell"][data-cell="${marker}"]`
    );
    if (!(cell instanceof HTMLElement)) throw new Error(`Expected ${marker} gridcell`);
    return cell;
}

describe("transaction page tag commit", () => {
    let mediaQuery: InspectorMediaQuery;
    let restoreLayout: () => void;

    beforeEach(() => {
        mediaQuery = new InspectorMediaQuery(false);
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn(() => mediaQuery)
        });
        restoreLayout = installVirtualGridLayout();
        gridControllerProbe.current = null;
        seedVaultWith([{ ...createTransaction(0, 1), id: TRANSACTION_ID }]);
    });
    afterEach(() => restoreLayout());

    // This whole-page journey completes in 1.80–1.95s across six quiet runs, but reached 5.12s
    // under the full 182-file campaign's concurrent transform/render load. Keep a local ceiling on
    // the converging UI barriers rather than letting scheduler contention masquerade as a hang.
    it("creates a tag and assigns it in one final vault action", async () => {
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        const search = await screen.findByPlaceholderText("Search tags...");

        fireEvent.change(search, { target: { value: "Created locally" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Remove Created locally" })).toBeVisible()
        );

        expect(vaultActionCalls).toHaveLength(0);
        expect(Object.keys(vaultTags)).toHaveLength(0);
        expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual([]);

        const description = gridCell("description");
        fireEvent.pointerDown(description, { button: 0, pointerId: 71 });
        fireEvent.pointerUp(description, { button: 0, pointerId: 71 });
        fireEvent.click(description);

        await waitFor(() => expect(vaultActionCalls).toHaveLength(1));
        const committedTagIds = storedTransactionTagIds(TRANSACTION_ID);
        expect(committedTagIds).toHaveLength(1);
        const createdTagId = committedTagIds[0];
        expect(createdTagId).toBeDefined();
        expect(vaultTags[createdTagId ?? ""]).toMatchObject({
            id: createdTagId,
            name: "Created locally"
        });

        const proposal = await screen.findByTestId("tags-rule-proposal");
        const inspector = screen.getByTestId("transaction-inspector");
        expect(proposal).toBeVisible();
        const applyMode = screen.getByTestId("proposal-apply-mode");
        fireEvent.click(applyMode);
        fireEvent.click(screen.getByRole("option", { name: "Update all" }));
        expect(applyMode).toHaveTextContent("Update all");

        act(() => mediaQuery.setMatches(true));
        expect(screen.getByTestId("tags-rule-proposal")).toBe(proposal);
        expect(screen.getByTestId("proposal-apply-mode")).toHaveTextContent("Update all");

        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        expect(inspector).not.toBeVisible();
        expect(screen.getByTestId("tags-rule-proposal")).toBe(proposal);
        expect(screen.getByTestId("transaction-inspector-automation-badge")).toBeVisible();
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        expect(inspector).toBeVisible();
        expect(
            screen.queryByTestId("transaction-inspector-automation-badge")
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("tags-rule-proposal")).toBe(proposal);
        expect(screen.getByTestId("proposal-apply-mode")).toHaveTextContent("Update all");
    }, 15_000);

    it("retains exact staged creation authority when the active cell is double-clicked again", async () => {
        await renderTransactionsPage();
        const tags = gridCell("tags");
        fireEvent.doubleClick(tags);
        const search = await screen.findByPlaceholderText("Search tags...");

        fireEvent.change(search, { target: { value: "NewInlineTag" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Remove NewInlineTag" })).toBeVisible()
        );

        const firstClickTarget = tags.querySelector<HTMLElement>("[data-tag-strip]");
        if (firstClickTarget == null) throw new Error("Expected the active tag strip");
        fireEvent.pointerDown(firstClickTarget, { button: 0, pointerId: 1 });
        fireEvent.mouseDown(firstClickTarget, { button: 0, detail: 1 });
        fireEvent.pointerUp(firstClickTarget, { button: 0, pointerId: 1 });
        fireEvent.mouseUp(firstClickTarget, { button: 0, detail: 1 });
        fireEvent.click(firstClickTarget, { button: 0, detail: 1 });

        const remountedCell = gridCell("tags");
        const secondClickTarget =
            remountedCell.querySelector<HTMLElement>("[data-tag-strip]") ?? remountedCell;
        fireEvent.pointerDown(secondClickTarget, { button: 0, pointerId: 1 });
        fireEvent.mouseDown(secondClickTarget, { button: 0, detail: 2 });
        fireEvent.pointerUp(secondClickTarget, { button: 0, pointerId: 1 });
        fireEvent.mouseUp(secondClickTarget, { button: 0, detail: 2 });
        fireEvent.click(secondClickTarget, { button: 0, detail: 2 });
        fireEvent.doubleClick(secondClickTarget, { button: 0, detail: 2 });
        const reopenedSearch = await screen.findByPlaceholderText("Search tags...");
        fireEvent.change(reopenedSearch, {
            target: { value: " NewInlineTag " }
        });

        expect(screen.queryByTestId("create-tag-button")).not.toBeInTheDocument();
        expect(screen.getByRole("option", { name: "NewInlineTag" })).toBeVisible();
        expect(vaultActionCalls).toHaveLength(0);
        expect(Object.keys(vaultTags)).toHaveLength(0);
        expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual([]);
    });

    it("retains a closed-panel proposal while a filter excludes its canonically live owner", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        vaultTags[workTag.id] = workTag;
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByText("Work"));
        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 87 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 87 });
        fireEvent.click(destination);
        await screen.findByTestId("tags-rule-proposal");
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        expect(screen.getByTestId("transaction-inspector-automation-badge")).toBeVisible();

        const search = screen.getByPlaceholderText("Search description, notes...");
        fireEvent.change(search, { target: { value: "no matching transaction" } });

        await waitFor(() =>
            expect(screen.queryByTestId("transaction-row")).not.toBeInTheDocument()
        );
        expect(requiredController().getSnapshot().automation.proposal?.owner).toEqual({
            field: "tags",
            transactionId: TRANSACTION_ID
        });
        expect(screen.getByTestId("transaction-inspector-automation-badge")).toBeVisible();

        fireEvent.change(search, { target: { value: "" } });
        await waitFor(() => expect(screen.getByTestId("transaction-row")).toBeVisible());
        const restoredDescription = gridCell("description");
        fireEvent.pointerDown(restoredDescription, { button: 0, pointerId: 88 });
        fireEvent.pointerUp(restoredDescription, { button: 0, pointerId: 88 });
        fireEvent.click(restoredDescription);
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));

        expect(await screen.findByTestId("tags-rule-proposal")).toBeVisible();
        expect(requiredController().getSnapshot().automation.proposal?.owner).toEqual({
            field: "tags",
            transactionId: TRANSACTION_ID
        });
    });

    it("retires a filtered closed-panel proposal when later deletion leaves cursor order unchanged", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        vaultTags[workTag.id] = workTag;
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByText("Work"));
        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 87 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 87 });
        fireEvent.click(destination);
        await screen.findByTestId("tags-rule-proposal");
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        expect(screen.getByTestId("transaction-inspector-automation-badge")).toBeVisible();

        fireEvent.change(screen.getByPlaceholderText("Search description, notes..."), {
            target: { value: "no matching transaction" }
        });
        await waitFor(() =>
            expect(screen.queryByTestId("transaction-row")).not.toBeInTheDocument()
        );
        const filteredGeneration = requiredController().getSnapshot().generation;
        expect(requiredController().getSnapshot().automation.proposal?.owner).toEqual({
            field: "tags",
            transactionId: TRANSACTION_ID
        });

        act(() =>
            replaceRenderedVaultWith([
                {
                    ...createTransaction(0, 1),
                    deletedAt: Temporal.Instant.from("2026-08-31T13:00:00Z"),
                    id: TRANSACTION_ID
                }
            ])
        );

        await waitFor(() =>
            expect(requiredController().getSnapshot().automation.proposal).toBeNull()
        );
        expect(requiredController().getSnapshot().generation).toBe(filteredGeneration);
        expect(screen.queryByTestId("transaction-row")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("transaction-inspector-automation-badge")
        ).not.toBeInTheDocument();
    });

    it("clears the last tag without leaving a hidden proposal or closed-panel badge", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        vaultTags[workTag.id] = workTag;
        seedVaultWith([{ ...createTransaction(0, 1), id: TRANSACTION_ID, tagIds: [workTag.id] }]);
        vaultTags[workTag.id] = workTag;
        await renderTransactionsPage();
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByRole("button", { name: "Remove Work" }));

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 80 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 80 });
        fireEvent.click(destination);

        await waitFor(() => expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual([]));
        await waitFor(() =>
            expect(requiredController().getSnapshot().automation.proposal).toBeNull()
        );
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("transaction-inspector-automation-badge")
        ).not.toBeInTheDocument();
    });

    it("retains a changed tag editor when the vault boundary rejects", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        vaultTags[workTag.id] = workTag;
        transactionTagCommitBoundaryMode.current = "missing";
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByText("Work"));

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 81 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 81 });
        fireEvent.click(destination);

        expect(vaultActionCalls).toHaveLength(1);
        expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual([]);
        expect(gridCell("tags")).toHaveAttribute("data-cell-content", "editor");
        expect(requiredController().getSnapshot().automation.editor?.owner).toEqual({
            field: "tags",
            transactionId: TRANSACTION_ID
        });
        expect(requiredController().getSnapshot().automation.proposal).toBeNull();
    });

    it("treats reordered duplicate tag state as unchanged without writing or proposing", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        const foodTag = {
            id: "food",
            name: "Food",
            color: "#16a34a",
            parentTagId: "",
            isTransfer: false
        };
        seedVaultWith([
            {
                ...createTransaction(0, 1),
                id: TRANSACTION_ID,
                tagIds: [workTag.id, foodTag.id, workTag.id]
            }
        ]);
        vaultTags[workTag.id] = workTag;
        vaultTags[foodTag.id] = foodTag;
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByRole("option", { name: "Work" }));
        fireEvent.click(screen.getByRole("option", { name: "Work" }));

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 86 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 86 });
        fireEvent.click(destination);

        expect(vaultActionCalls).toHaveLength(0);
        expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual(["work", "food", "work"]);
        expect(requiredController().getSnapshot().automation.proposal).toBeNull();
        expect(gridCell("tags")).toHaveAttribute("data-cell-content", "display");
    });

    it("publishes no tag proposal when the vault boundary confirms an unchanged set", async () => {
        const workTag = {
            id: "work",
            name: "Work",
            color: "#2563eb",
            parentTagId: "",
            isTransfer: false
        };
        vaultTags[workTag.id] = workTag;
        transactionTagCommitBoundaryMode.current = "unchanged";
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags"));
        fireEvent.click(screen.getByText("Work"));

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 82 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 82 });
        fireEvent.click(destination);

        await waitFor(() => expect(storedTransactionTagIds(TRANSACTION_ID)).toEqual(["work"]));
        expect(vaultActionCalls).toHaveLength(1);
        expect(requiredController().getSnapshot().automation.proposal).toBeNull();
        expect(gridCell("tags")).toHaveAttribute("data-cell-content", "display");
    });

    it("clears the last allocation without leaving a hidden proposal or closed-panel badge", async () => {
        const personId = "person-a";
        seedVaultWith([
            {
                ...createTransaction(0, 1),
                allocations: { [personId]: asPercentage(25) },
                id: TRANSACTION_ID
            }
        ]);
        seedVaultPeople({
            active: { [personId]: { id: personId, name: "Alex" } },
            all: { [personId]: { id: personId, name: "Alex" } }
        });
        await renderTransactionsPage();
        fireEvent.click(screen.getByTestId("transaction-inspector-toggle"));
        fireEvent.doubleClick(gridCell(`allocation:${personId}`));
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "0" }
        });

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 83 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 83 });
        fireEvent.click(destination);

        await waitFor(() => expect(storedTransactionAllocations(TRANSACTION_ID)).toEqual({}));
        expect(transactionAllocationCalls).toHaveLength(1);
        await waitFor(() =>
            expect(requiredController().getSnapshot().automation.proposal).toBeNull()
        );
        expect(screen.queryByTestId("allocation-rule-proposal")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("transaction-inspector-automation-badge")
        ).not.toBeInTheDocument();
    });

    it("retains a changed allocation editor when the mutation boundary rejects", async () => {
        const personId = "person-a";
        seedVaultWith([
            {
                ...createTransaction(0, 1),
                allocations: { [personId]: asPercentage(25) },
                id: TRANSACTION_ID
            }
        ]);
        seedVaultPeople({
            active: { [personId]: { id: personId, name: "Alex" } },
            all: { [personId]: { id: personId, name: "Alex" } }
        });
        transactionAllocationCommitBoundaryMode.current = "missing";
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell(`allocation:${personId}`));
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "40" }
        });

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 84 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 84 });
        fireEvent.click(destination);

        expect(transactionAllocationCalls).toHaveLength(1);
        expect(storedTransactionAllocations(TRANSACTION_ID)).toEqual({ [personId]: 25 });
        expect(gridCell(`allocation:${personId}`)).toHaveAttribute("data-cell-content", "editor");
        expect(requiredController().getSnapshot().automation.proposal).toBeNull();
    });

    it("publishes no allocation proposal when the mutation boundary reports unchanged", async () => {
        const personId = "person-a";
        seedVaultWith([
            {
                ...createTransaction(0, 1),
                allocations: { [personId]: asPercentage(25) },
                id: TRANSACTION_ID
            }
        ]);
        seedVaultPeople({
            active: { [personId]: { id: personId, name: "Alex" } },
            all: { [personId]: { id: personId, name: "Alex" } }
        });
        transactionAllocationCommitBoundaryMode.current = "unchanged";
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell(`allocation:${personId}`));
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "40" }
        });

        const destination = gridCell("description");
        fireEvent.pointerDown(destination, { button: 0, pointerId: 85 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 85 });
        fireEvent.click(destination);

        await waitFor(() =>
            expect(storedTransactionAllocations(TRANSACTION_ID)).toEqual({ [personId]: 40 })
        );
        expect(transactionAllocationCalls).toHaveLength(1);
        expect(requiredController().getSnapshot().automation.proposal).toBeNull();
        expect(gridCell(`allocation:${personId}`)).toHaveAttribute("data-cell-content", "display");
    });

    it("restores a proposal draft after its source row leaves the virtual window", async () => {
        const sourceId = "tx-off-window-source";
        const destinationId = "tx-off-window-destination";
        const transactions = Array.from({ length: 100 }, (unused, index) => {
            const transaction = createTransaction(index, 100);
            if (index === 0) return { ...transaction, id: sourceId };
            if (index === 70) return { ...transaction, id: destinationId };
            return transaction;
        });
        seedVaultWith(transactions);
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags", sourceId));
        const search = await screen.findByPlaceholderText("Search tags...");
        fireEvent.change(search, { target: { value: "Persisted off window" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Remove Persisted off window" })
            ).toBeVisible()
        );
        const sourceDescription = gridCell("description", sourceId);
        fireEvent.pointerDown(sourceDescription, { button: 0, pointerId: 73 });
        fireEvent.pointerUp(sourceDescription, { button: 0, pointerId: 73 });
        fireEvent.click(sourceDescription);
        const proposal = await screen.findByTestId("tags-rule-proposal");
        fireEvent.click(screen.getByTestId("proposal-apply-mode"));
        fireEvent.click(screen.getByRole("option", { name: "Update all" }));
        expect(screen.getByTestId("proposal-apply-mode")).toHaveTextContent("Update all");

        scrollGridTo(HARNESS_ROW_HEIGHT * 70);
        await waitFor(() => expect(renderedRowIds()).toContain(destinationId));
        const destinationDescription = gridCell("description", destinationId);
        fireEvent.pointerDown(destinationDescription, { button: 0, pointerId: 74 });
        fireEvent.pointerUp(destinationDescription, { button: 0, pointerId: 74 });
        fireEvent.click(destinationDescription);
        await waitFor(() => expect(renderedRowIds()).not.toContain(sourceId));
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();

        scrollGridTo(0);
        await waitFor(() => expect(renderedRowIds()).toContain(sourceId));
        const restoredSourceDescription = gridCell("description", sourceId);
        fireEvent.pointerDown(restoredSourceDescription, { button: 0, pointerId: 75 });
        fireEvent.pointerUp(restoredSourceDescription, { button: 0, pointerId: 75 });
        fireEvent.click(restoredSourceDescription);

        expect(await screen.findByTestId("tags-rule-proposal")).not.toBe(proposal);
        expect(screen.getByTestId("proposal-apply-mode")).toHaveTextContent("Update all");
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute(
            "data-transaction-owner",
            sourceId
        );
    });

    it("does not finalize an automatic proposal while movement stays on the same row", async () => {
        const sourceId = "tx-same-row-source";
        seedVaultWith([{ ...createTransaction(0, 1), id: sourceId }]);
        seedRememberedAutomationChoice({
            applyMode: "updatingAll",
            field: "tags",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: false
        });
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags", sourceId));
        const search = await screen.findByPlaceholderText("Search tags...");
        fireEvent.change(search, { target: { value: "Same row pending" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Remove Same row pending" })).toBeVisible()
        );

        const description = gridCell("description", sourceId);
        fireEvent.pointerDown(description, { button: 0, pointerId: 76 });
        fireEvent.pointerUp(description, { button: 0, pointerId: 76 });
        fireEvent.click(description);
        expect(await screen.findByTestId("tags-rule-proposal")).toBeVisible();

        const amount = gridCell("amount", sourceId);
        fireEvent.pointerDown(amount, { button: 0, pointerId: 77 });
        fireEvent.pointerUp(amount, { button: 0, pointerId: 77 });
        fireEvent.click(amount);

        expect(fieldRuleCreateCalls).toHaveLength(0);
        expect(fieldRuleApplicationCalls).toHaveLength(0);
        expect(screen.getByTestId("tags-rule-proposal")).toBeVisible();
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute(
            "data-transaction-owner",
            sourceId
        );
    });

    it("retains a just-published automatic proposal when rule creation rejects", async () => {
        const sourceId = "tx-rejected-source";
        const destinationId = "tx-rejected-destination";
        const description = "REJECTED AUTOMATION MERCHANT";
        seedVaultWith([
            { ...createTransaction(0, 2), description, id: sourceId },
            { ...createTransaction(1, 2), description, id: destinationId }
        ]);
        seedRememberedAutomationChoice({
            applyMode: "updatingAll",
            field: "tags",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: false
        });
        fieldRuleCreateFailure.current = true;
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags", sourceId));
        const search = await screen.findByPlaceholderText("Search tags...");
        fireEvent.change(search, { target: { value: "Rejected automatic" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Remove Rejected automatic" })).toBeVisible()
        );

        const destination = gridCell("description", destinationId);
        fireEvent.pointerDown(destination, { button: 0, pointerId: 78 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 78 });
        fireEvent.click(destination);

        await waitFor(() => expect(fieldRuleCreateCalls.length).toBeGreaterThan(0));
        const rejectionAttempts = fieldRuleCreateCalls.length;
        expect(fieldRuleApplicationCalls).toHaveLength(0);
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute(
            "data-transaction-owner",
            destinationId
        );
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();

        const source = gridCell("description", sourceId);
        fireEvent.pointerDown(source, { button: 0, pointerId: 79 });
        fireEvent.pointerUp(source, { button: 0, pointerId: 79 });
        fireEvent.click(source);

        expect(await screen.findByTestId("tags-rule-proposal")).toBeVisible();
        expect(screen.getByTestId("proposal-description-error")).toBeVisible();
        expect(fieldRuleCreateCalls).toHaveLength(rejectionAttempts);
        expect(fieldRuleApplicationCalls).toHaveLength(0);
    });

    it("applies a same-event automatic proposal before publishing the destination owner", async () => {
        const sourceId = "tx-automatic-source";
        const destinationId = "tx-automatic-destination";
        const description = "AUTOMATIC TAG MERCHANT";
        seedVaultWith([
            { ...createTransaction(0, 2), description, id: sourceId },
            { ...createTransaction(1, 2), description, id: destinationId }
        ]);
        seedRememberedAutomationChoice({
            applyMode: "updatingAll",
            field: "tags",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: false
        });
        await renderTransactionsPage();
        fireEvent.doubleClick(gridCell("tags", sourceId));
        const search = await screen.findByPlaceholderText("Search tags...");
        fireEvent.change(search, { target: { value: "Created automatically" } });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Remove Created automatically" })
            ).toBeVisible()
        );

        expect(fieldRuleCreateCalls).toHaveLength(0);
        expect(fieldRuleApplicationCalls).toHaveLength(0);
        expect(storedTransactionTagIds(sourceId)).toEqual([]);
        expect(storedTransactionTagIds(destinationId)).toEqual([]);

        const destination = gridCell("description", destinationId);
        fireEvent.pointerDown(destination, { button: 0, pointerId: 72 });
        fireEvent.pointerUp(destination, { button: 0, pointerId: 72 });
        fireEvent.click(destination);

        await waitFor(() => expect(fieldRuleCreateCalls).toHaveLength(1));
        expect(fieldRuleApplicationCalls).toEqual([
            { inspectorOwnerAtApply: sourceId, kind: "all" }
        ]);
        const committedTagIds = storedTransactionTagIds(sourceId);
        expect(committedTagIds).toHaveLength(1);
        expect(storedTransactionTagIds(destinationId)).toEqual(committedTagIds);
        expect(fieldRuleCreateCalls[0]).toMatchObject({
            action: { field: "tags", mode: "add", tagIds: committedTagIds },
            descriptionText: description
        });
        expect(screen.getByTestId("transaction-inspector")).toHaveAttribute(
            "data-transaction-owner",
            destinationId
        );
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
    });
});

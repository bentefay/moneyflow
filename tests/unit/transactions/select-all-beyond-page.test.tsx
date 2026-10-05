/**
 * UR-011: "Selecting the header checkbox selects every transaction matching the active filters,
 * including rows that are not rendered and rows beyond the currently loaded page", and "Bulk actions
 * taken after selecting all apply to every selected transaction, including rows never rendered."
 *
 * `selection.test.ts` proves the model's own contract. The clause guarded here spans the whole page:
 * the table is virtualized *and* holds only a bounded window of the matching set, and it was the page
 * — not the model — that narrowed the set before handing it over, and narrowed the selection again
 * before handing it to the bulk handlers. A model-level test cannot see either narrowing.
 *
 * So the real page is mounted over a fake vault holding far more rows than the grid can hold, the
 * *real* header checkbox is clicked, and a *real* bulk status change is applied. The assertions name
 * rows that were never rendered and rows outside the window: an implementation that covers only what
 * the grid holds fails them, while asserting "the visible rows were updated" would pass either way.
 *
 * The row count is chosen against `TRANSACTION_ROW_WINDOW_ROWS`, not against a page size. That is the
 * premise of the whole file, and it is asserted rather than assumed: a fixture that fits inside the
 * window would make every test here pass for the wrong reason.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionTable as TransactionTableComponent } from "@/components/features/transactions";
import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { TRANSACTION_ROW_WINDOW_ROWS } from "@/components/features/transactions/row-window";

import {
    applyBulkPaidStatus,
    clickHeaderCheckbox,
    createCrdtContextMock,
    importMock,
    PAID_STATUS_ID,
    presenceMock,
    renderedRowIds,
    renderTransactionsPage,
    routerMock,
    seedVault,
    statusUpdates
} from "./transactions-page-harness";
import { installVirtualGridLayout } from "./virtual-grid-harness";

/**
 * Comfortably more than the grid can hold, and more than any virtual window, so that "matching" and
 * "loaded" cannot coincide. Halving it with the search filter must also leave more than the window.
 */
const TOTAL_TRANSACTIONS = 1_600;

interface GridTrace {
    controller: TransactionGridWorkspaceController | null;
    windowStarts: number[];
}

const gridTrace = vi.hoisted((): GridTrace => ({
    controller: null,
    windowStarts: []
}));

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
        TransactionTable: (props: React.ComponentProps<typeof TransactionTableComponent>) => {
            gridTrace.controller = props.controller;
            gridTrace.windowStarts.push(props.rowWindow.indexes[0] ?? 0);
            return <actual.TransactionTable {...props} />;
        }
    };
});

describe("UR-011: the header checkbox covers rows beyond the window the grid holds", () => {
    // Mounting the whole page with over a thousand rows is slower under a saturated full-suite run
    // than the 5s default allows. This is a ceiling, not a wait: every assertion settles on its own
    // condition.
    vi.setConfig({ testTimeout: 60_000 });

    let restoreLayout: () => void;

    beforeEach(() => {
        // The real virtualizer, given real element sizes. The rows outside its window have no
        // element at all — which is the premise every assertion below rests on.
        restoreLayout = installVirtualGridLayout();
        gridTrace.controller = null;
        gridTrace.windowStarts.length = 0;
        seedVault(TOTAL_TRANSACTIONS);
    });

    afterEach(() => restoreLayout());

    it("holds a fixture the grid cannot fit, before and after filtering", () => {
        // Not decoration. Every assertion below distinguishes "matching" from "loaded", and both
        // halves of the fixture have to be bigger than the window for that distinction to exist.
        expect(TOTAL_TRANSACTIONS).toBeGreaterThan(TRANSACTION_ROW_WINDOW_ROWS);
        expect(TOTAL_TRANSACTIONS / 2).toBeGreaterThan(TRANSACTION_ROW_WINDOW_ROWS);
    });

    it("restores the page-held window without stealing external focus after target focus fails", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );
        const controller = gridTrace.controller;
        if (controller == null) throw new Error("the page did not publish its grid controller");
        const origin = screen
            .getAllByTestId("transaction-row")[0]
            .querySelector<HTMLElement>('[role="gridcell"][data-cell="date"]');
        if (origin == null) throw new Error("the page did not mount an origin gridcell");
        act(() => origin.focus());
        const originSelection = controller.cellSelectionAtom.get();
        const external = document.createElement("input");
        document.body.append(external);
        const nativeFocus = HTMLElement.prototype.focus;
        const failedTarget = { observed: false };
        const focusSpy = vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
            this: HTMLElement,
            options?: FocusOptions
        ) {
            if (
                this.getAttribute("data-cell") === "actions" &&
                this.getAttribute("data-cell-transaction-id") === "tx-1599"
            ) {
                failedTarget.observed = true;
                nativeFocus.call(external, options);
                return;
            }
            nativeFocus.call(this, options);
        });

        try {
            fireEvent.keyDown(origin, { ctrlKey: true, key: "End" });

            await waitFor(() => expect(failedTarget.observed).toBe(true));
            await waitFor(() => expect(gridTrace.windowStarts.at(-1)).toBe(0));
            expect(controller.getPendingRequest()).toBeNull();
            expect(controller.getSnapshot()).toMatchObject({
                failure: null,
                interactionKind: "parked"
            });
            expect(controller.cellSelectionAtom.get()).toEqual(originSelection);
            expect(document.activeElement).toBe(external);
        } finally {
            focusSpy.mockRestore();
            external.remove();
        }
    });

    it("selects every matching transaction, not merely the rows with a rendered element", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        const rendered = renderedRowIds();
        // The premise the whole test rests on: most matching rows have no element right now.
        expect(rendered.length).toBeLessThan(TOTAL_TRANSACTIONS);

        clickHeaderCheckbox();

        // The count is over the matching set, so it names the unrendered rows too.
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(TOTAL_TRANSACTIONS)}`)).toBeInTheDocument()
        );
    });

    it("applies a bulk action to rows that were never rendered and lie outside the window", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        const rendered = new Set(renderedRowIds());

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(TOTAL_TRANSACTIONS)}`)).toBeInTheDocument()
        );

        applyBulkPaidStatus();

        await waitFor(() => expect(statusUpdates.length).toBe(TOTAL_TRANSACTIONS));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));

        // The last row in the vault is neither rendered nor inside the window the grid holds; the
        // old behaviour reached neither it nor anything else past the loaded page.
        const lastRowId = `tx-${(TOTAL_TRANSACTIONS - 1).toString().padStart(4, "0")}`;
        expect(rendered.has(lastRowId)).toBe(false);
        expect(updatedIds.has(lastRowId)).toBe(true);

        // A row just past the window's trailing edge, likewise never rendered.
        const justPastWindowId = `tx-${(TRANSACTION_ROW_WINDOW_ROWS + 10)
            .toString()
            .padStart(4, "0")}`;
        expect(rendered.has(justPastWindowId)).toBe(false);
        expect(updatedIds.has(justPastWindowId)).toBe(true);

        expect(updatedIds.size).toBe(TOTAL_TRANSACTIONS);
        expect(statusUpdates.every((update) => update.statusId === PAID_STATUS_ID)).toBe(true);
    });

    it("re-derives the set when the filters change, so a bulk action spares non-matching rows", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        // Half the vault carries "Groceries"; the search filter is the page's own real filter.
        fireEvent.change(screen.getByTestId("search-filter"), {
            target: { value: "Groceries" }
        });

        // The search filter debounces, so the count settles on its own rather than on a wait.
        const matchingCount = TOTAL_TRANSACTIONS / 2;
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${String(matchingCount)} transactions (filtered)`
            )
        );

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(matchingCount)}`)).toBeInTheDocument()
        );

        applyBulkPaidStatus();

        await waitFor(() => expect(statusUpdates.length).toBe(matchingCount));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));

        // Every even-indexed row matches and must be updated, including unrendered ones outside the
        // window; every odd-indexed row does not match and must be untouched.
        expect(updatedIds.has("tx-1598")).toBe(true);
        expect(updatedIds.has("tx-0800")).toBe(true);
        expect(updatedIds.has("tx-1599")).toBe(false);
        expect(updatedIds.has("tx-0801")).toBe(false);
        expect(updatedIds.size).toBe(matchingCount);
    });

    it("does not sweep in rows that a relaxed filter brings back, which the user never selected", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        const search = screen.getByTestId("search-filter");
        fireEvent.change(search, { target: { value: "Groceries" } });

        const matchingCount = TOTAL_TRANSACTIONS / 2;
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${String(matchingCount)} transactions (filtered)`
            )
        );

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(matchingCount)}`)).toBeInTheDocument()
        );

        // Relaxing the filter doubles the matching set. "Every matching row is selected" must not
        // silently come to mean the wider set — the Fuel rows were never selected, and a bulk
        // delete that acquired them would destroy data the user never pointed at.
        fireEvent.change(search, { target: { value: "" } });
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${String(TOTAL_TRANSACTIONS)} transactions`
            )
        );

        expect(screen.getByText(`Edit ${String(matchingCount)}`)).toBeInTheDocument();
        const header = screen.getByTestId("header-checkbox").querySelector("button");
        expect(header?.getAttribute("aria-checked")).toBe("mixed");

        applyBulkPaidStatus();
        await waitFor(() => expect(statusUpdates.length).toBe(matchingCount));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));
        expect(updatedIds.has("tx-0801")).toBe(false);
        expect(updatedIds.has("tx-0800")).toBe(true);
    });

    it("clears the whole matching set, leaving no unrendered row selected", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(TOTAL_TRANSACTIONS)}`)).toBeInTheDocument()
        );

        clickHeaderCheckbox();

        await waitFor(() =>
            expect(screen.queryByTestId("bulk-edit-toolbar")).not.toBeInTheDocument()
        );
        // Nothing survives the clear, so a bulk action has nothing left to reach.
        expect(statusUpdates).toEqual([]);
    });

    it("reports indeterminate when one unrendered row is excluded from a select-all", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(TOTAL_TRANSACTIONS)}`)).toBeInTheDocument()
        );

        // Deselecting one rendered row must leave the header mixed over the whole matching set,
        // and the remaining count must be derived from that set rather than from what is on screen.
        const firstRowCheckbox = screen
            .getAllByTestId("transaction-row")[0]
            .querySelector('[data-testid="row-checkbox"] button');
        if (firstRowCheckbox == null) throw new Error("Expected a row checkbox to render");
        fireEvent.click(firstRowCheckbox);

        await waitFor(() =>
            expect(screen.getByText(`Edit ${String(TOTAL_TRANSACTIONS - 1)}`)).toBeInTheDocument()
        );
        const header = screen.getByTestId("header-checkbox").querySelector("button");
        expect(header?.getAttribute("aria-checked")).toBe("mixed");
    });
});

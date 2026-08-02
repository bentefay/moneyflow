/**
 * UR-011: "Selecting the header checkbox selects every transaction matching the active filters,
 * including rows that are not rendered and rows beyond the currently loaded page", and "Bulk actions
 * taken after selecting all apply to every selected transaction, including rows never rendered."
 *
 * `selection.test.ts` proves the hook's own contract. The clause guarded here spans the whole page:
 * the table is virtualized *and* paginated, and it was the page — not the hook — that narrowed the
 * set to `filteredTransactions.slice(0, PAGE_SIZE)` before handing it over, and narrowed the
 * selection again before handing it to the bulk handlers. A hook-level test cannot see either
 * narrowing.
 *
 * So the real page is mounted over a fake vault holding far more rows than one page, the *real*
 * header checkbox is clicked, and a *real* bulk status change is applied. The assertions name rows
 * that were never rendered and rows past the loaded page: an implementation that covers only what is
 * on screen fails them, while asserting "the visible rows were updated" would pass either way.
 */

import type { Range } from "@tanstack/react-virtual";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asMinorUnits } from "@/lib/domain/currency";

const ACCOUNT_ID = "account-cheque";
const STATUS_ID = "status-for-review";
const PAID_STATUS_ID = "status-paid";

/** Comfortably more than the page's PAGE_SIZE of 50, and more than any virtual window. */
const TOTAL_TRANSACTIONS = 400;

/** How many rows the fake virtualizer mounts, mirroring a real viewport's small window. */
const MOUNTED_ROW_COUNT = 8;

/** Every `updateTransaction` the page issued, so a bulk action's true reach can be measured. */
const statusUpdates = vi.hoisted(() => [] as Array<{ id: string; statusId: string }>);

const vault = vi.hoisted(() => ({
    transactions: [] as unknown[],
    listeners: new Set<() => void>()
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: () => {}, push: () => {} }),
    usePathname: () => "/transactions",
    useSearchParams: () => new URLSearchParams()
}));

// jsdom gives the scroll container no height, so the real virtualizer mounts nothing at all. This
// fake mounts a small fixed window instead — which is the point: the rows outside it have no
// rendered element, exactly as they would not on a real screen, and the assertions below are about
// those rows.
vi.mock("@tanstack/react-virtual", () => ({
    defaultRangeExtractor: (range: Range) => {
        const start = Math.max(range.startIndex - range.overscan, 0);
        const end = Math.min(range.endIndex + range.overscan, range.count - 1);
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    },
    useVirtualizer: (options: {
        readonly count: number;
        readonly estimateSize: () => number;
        readonly overscan: number;
        readonly rangeExtractor: (range: Range) => number[];
    }) => ({
        getVirtualItems: () =>
            options
                .rangeExtractor({
                    startIndex: 0,
                    endIndex: Math.min(MOUNTED_ROW_COUNT - 1, options.count - 1),
                    overscan: 0,
                    count: options.count
                })
                .map((index) => ({
                    index,
                    key: index,
                    start: index * options.estimateSize(),
                    end: (index + 1) * options.estimateSize(),
                    size: options.estimateSize(),
                    lane: 0
                })),
        getTotalSize: () => options.count * options.estimateSize(),
        measureElement: () => {}
    })
}));

vi.mock("@/lib/crdt/context", async () => {
    const { useCallback, useSyncExternalStore } = await import("react");

    const subscribe = (listener: () => void) => {
        vault.listeners.add(listener);
        return () => {
            vault.listeners.delete(listener);
        };
    };
    const readTransactions = () => vault.transactions;

    return {
        useActiveTransactions: () =>
            useSyncExternalStore(subscribe, readTransactions, readTransactions),
        useActiveAccounts: () => accounts,
        useActiveTags: () => empty,
        useDescriptionAliases: () => empty,
        useStatuses: () => statuses,
        useActivePeople: () => empty,
        usePeople: () => empty,
        useActiveFieldRules: () => noRules,
        useTransactionActions: () => ({
            insertTransaction: noop,
            updateTransaction: useCallback(
                ({
                    location,
                    updates
                }: {
                    readonly location: { readonly transactionId: string };
                    readonly updates: { readonly statusId?: string };
                }) => {
                    if (updates.statusId == null) return;
                    statusUpdates.push({
                        id: location.transactionId,
                        statusId: updates.statusId
                    });
                },
                []
            ),
            setTransactionAllocation: noop,
            moveTransaction: noop,
            deleteTransaction: noop,
            unnestDuplicate: noop
        }),
        useDescriptionAliasActions: () => aliasActions,
        useVaultAction: () => noop,
        useApplyFieldRulesToTransaction: () => noop,
        useUserAutomationChoice: () => empty,
        usePersistAutomationPreference: () => noop,
        // The inline rule-proposal workflow reads these through `@/lib/crdt`, which re-exports this
        // module. They are unrelated to selection but must exist, or the page throws on render.
        useActiveDescriptionAliases: () => noRules,
        useVaultPreferences: () => empty,
        useFieldRuleActions: () => fieldRuleActions,
        useApplyFieldRules: () => applyFieldRules
    };
});

vi.mock("@/hooks/use-identity", () => ({
    usePubkeyHash: () => null
}));

vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presence
}));

vi.mock("@/components/features/import", () => ({
    ImportDropTarget: ({
        children,
        containerRef,
        className
    }: {
        readonly children: React.ReactNode;
        readonly containerRef?: React.Ref<HTMLDivElement>;
        readonly className?: string;
    }) => (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    ),
    useImportFileTransfer: () => ({ stageImportFile: noop })
}));

vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

const noop = () => {};
const empty = {};
const noRules: readonly never[] = [];
const accounts = {
    [ACCOUNT_ID]: {
        id: ACCOUNT_ID,
        name: "Cheque",
        currency: "USD",
        accountType: "checking",
        balance: 0,
        ownerships: {}
    }
};
const statuses = {
    [STATUS_ID]: { id: STATUS_ID, name: "For review", isDefault: true },
    [PAID_STATUS_ID]: { id: PAID_STATUS_ID, name: "Paid", isDefault: false }
};
const fieldRuleActions = { create: noop, update: noop };
const applyFieldRules = { applyAll: noop, applyNewerThan: noop };
const aliasActions = {
    assignDescriptionAlias: noop,
    assignDescriptionAliasByExactName: noop,
    changeAllDescriptionAliases: noop,
    changeOneDescriptionAlias: noop,
    removeAllDescriptionAliases: noop,
    removeOneDescriptionAlias: noop,
    renameDescriptionAlias: noop
};
const presence = {
    snapshot: { byTransactionId: {}, byIdentity: {} },
    onlineIdentities: [],
    presentIdentities: [],
    isConnected: false,
    setPresenceState: noop,
    clearPresenceFocus: noop,
    disconnect: async () => {}
};

/**
 * Rows dated so that index 0 is newest, matching the store's own newest-first order. Half carry
 * "Groceries" in the description so a search filter can split the set.
 */
function createTransaction(index: number) {
    const day = Temporal.PlainDate.from("2026-01-01").add({ days: TOTAL_TRANSACTIONS - index });
    return {
        id: `tx-${index.toString().padStart(4, "0")}`,
        date: day,
        description: index % 2 === 0 ? `Groceries ${index}` : `Fuel ${index}`,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-(index + 1) * 100),
        originalAmount: undefined,
        accountId: ACCOUNT_ID,
        tagIds: [],
        statusId: STATUS_ID,
        importId: "import-1",
        allocations: {},
        creationInstant: Temporal.Instant.from("2026-01-01T09:00:00Z"),
        importRowIndex: index,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

async function renderTransactionsPage(): Promise<void> {
    const { default: TransactionsPage } = await import("@/app/(app)/transactions/page");
    const { ToastProvider } = await import("@/components/ui/toast");
    render(
        <ToastProvider>
            <TransactionsPage />
        </ToastProvider>
    );
}

/** The transaction IDs that actually have a rendered row right now. */
function renderedRowIds(): string[] {
    return screen
        .getAllByTestId("transaction-row")
        .map((row) => row.getAttribute("data-transaction-id") ?? "");
}

function clickHeaderCheckbox(): void {
    const header = screen.getByTestId("header-checkbox").querySelector("button");
    if (header == null) throw new Error("Expected the header checkbox to render");
    fireEvent.click(header);
}

/** Applies the "Paid" status through the real bulk toolbar. */
function applyBulkPaidStatus(): void {
    fireEvent.click(screen.getByTestId("bulk-edit-status-button"));
    fireEvent.click(screen.getByRole("button", { name: "Paid" }));
}

describe("UR-011: the header checkbox covers rows beyond the rendered page", () => {
    // Mounting the whole page with several hundred rows is slower under a saturated full-suite run
    // than the 5s default allows. This is a ceiling, not a wait: every assertion settles on its own
    // condition.
    vi.setConfig({ testTimeout: 30_000 });

    beforeEach(() => {
        vault.transactions = Array.from({ length: TOTAL_TRANSACTIONS }, (_, index) =>
            createTransaction(index)
        );
        vault.listeners.clear();
        statusUpdates.length = 0;
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
            expect(screen.getByText(`Edit ${TOTAL_TRANSACTIONS}`)).toBeInTheDocument()
        );
    });

    it("applies a bulk action to rows that were never rendered and lie beyond the loaded page", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        const rendered = new Set(renderedRowIds());

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${TOTAL_TRANSACTIONS}`)).toBeInTheDocument()
        );

        applyBulkPaidStatus();

        await waitFor(() => expect(statusUpdates.length).toBe(TOTAL_TRANSACTIONS));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));

        // The last row in the vault is neither rendered nor within the first page of 50; the old
        // behaviour reached neither it nor anything else past the page boundary.
        const lastRowId = `tx-${(TOTAL_TRANSACTIONS - 1).toString().padStart(4, "0")}`;
        expect(rendered.has(lastRowId)).toBe(false);
        expect(updatedIds.has(lastRowId)).toBe(true);

        // A row just past the 50-row page boundary, likewise never rendered.
        const justPastFirstPageId = "tx-0060";
        expect(rendered.has(justPastFirstPageId)).toBe(false);
        expect(updatedIds.has(justPastFirstPageId)).toBe(true);

        expect(updatedIds.size).toBe(TOTAL_TRANSACTIONS);
        expect(statusUpdates.every((update) => update.statusId === PAID_STATUS_ID)).toBe(true);
    });

    it("re-derives the set when the filters change, so a bulk action spares non-matching rows", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        // Half the vault carries "Groceries"; the search filter is the page's own real filter.
        fireEvent.change(screen.getByPlaceholderText(/search/i), {
            target: { value: "Groceries" }
        });

        // The search filter debounces, so the count settles on its own rather than on a wait.
        const matchingCount = TOTAL_TRANSACTIONS / 2;
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${matchingCount} transactions (filtered)`
            )
        );

        clickHeaderCheckbox();
        await waitFor(() => expect(screen.getByText(`Edit ${matchingCount}`)).toBeInTheDocument());

        applyBulkPaidStatus();

        await waitFor(() => expect(statusUpdates.length).toBe(matchingCount));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));

        // Every even-indexed row matches and must be updated, including unrendered ones; every
        // odd-indexed row does not match and must be untouched.
        expect(updatedIds.has("tx-0398")).toBe(true);
        expect(updatedIds.has("tx-0200")).toBe(true);
        expect(updatedIds.has("tx-0399")).toBe(false);
        expect(updatedIds.has("tx-0201")).toBe(false);
        expect(updatedIds.size).toBe(matchingCount);
    });

    it("does not sweep in rows that a relaxed filter brings back, which the user never selected", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        const search = screen.getByPlaceholderText(/search/i);
        fireEvent.change(search, { target: { value: "Groceries" } });

        const matchingCount = TOTAL_TRANSACTIONS / 2;
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${matchingCount} transactions (filtered)`
            )
        );

        clickHeaderCheckbox();
        await waitFor(() => expect(screen.getByText(`Edit ${matchingCount}`)).toBeInTheDocument());

        // Relaxing the filter doubles the matching set. "Every matching row is selected" must not
        // silently come to mean the wider set — the Fuel rows were never selected, and a bulk
        // delete that acquired them would destroy data the user never pointed at.
        fireEvent.change(search, { target: { value: "" } });
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${TOTAL_TRANSACTIONS} transactions`
            )
        );

        expect(screen.getByText(`Edit ${matchingCount}`)).toBeInTheDocument();
        const header = screen.getByTestId("header-checkbox").querySelector("button");
        expect(header?.getAttribute("aria-checked")).toBe("mixed");

        applyBulkPaidStatus();
        await waitFor(() => expect(statusUpdates.length).toBe(matchingCount));
        const updatedIds = new Set(statusUpdates.map((update) => update.id));
        expect(updatedIds.has("tx-0201")).toBe(false);
        expect(updatedIds.has("tx-0200")).toBe(true);
    });

    it("clears the whole matching set, leaving no unrendered row selected", async () => {
        await renderTransactionsPage();
        await waitFor(() =>
            expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0)
        );

        clickHeaderCheckbox();
        await waitFor(() =>
            expect(screen.getByText(`Edit ${TOTAL_TRANSACTIONS}`)).toBeInTheDocument()
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
            expect(screen.getByText(`Edit ${TOTAL_TRANSACTIONS}`)).toBeInTheDocument()
        );

        // Deselecting one rendered row must leave the header mixed over the whole matching set,
        // and the remaining count must be derived from that set rather than from what is on screen.
        const firstRowCheckbox = screen
            .getAllByTestId("transaction-row")[0]
            .querySelector('[data-testid="row-checkbox"] button');
        if (firstRowCheckbox == null) throw new Error("Expected a row checkbox to render");
        fireEvent.click(firstRowCheckbox);

        await waitFor(() =>
            expect(screen.getByText(`Edit ${TOTAL_TRANSACTIONS - 1}`)).toBeInTheDocument()
        );
        const header = screen.getByTestId("header-checkbox").querySelector("button");
        expect(header?.getAttribute("aria-checked")).toBe("mixed");
    });
});

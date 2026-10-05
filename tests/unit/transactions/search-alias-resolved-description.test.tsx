/**
 * UR-002: "Search matches against the alias-resolved description text when a transaction has a
 * description alias."
 *
 * `transaction-queries.test.ts` covers the predicate itself, where the resolver is a parameter the
 * test supplies. The invariant guarded here lives one level up, in the *page*: `filterTransactions`
 * only sees alias text if the page actually threads its `aliasLookup` into the query options, and
 * only re-filters when that lookup changes. A resolver that is never passed leaves the predicate
 * perfectly correct and the feature still broken, which is exactly the shape of the reported defect.
 *
 * So the real page is rendered over a fake vault holding a real alias graph, and the search box is
 * driven the way a user drives it. Assertions are on which rows survive filtering — behaviour, not
 * the wiring's shape.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

import { buildFakeTransactionStore, installVirtualGridLayout } from "./virtual-grid-harness";

const ACCOUNT_ID = "account-cheque";
const STATUS_ID = "status-for-review";

/** Mutable vault contents, read through a store so the page sees a stable identity per revision. */
const vault = vi.hoisted(() => ({
    store: {} as Record<string, unknown>,
    /** Bumped whenever the store is replaced, so the mocked index hook re-derives exactly once. */
    revision: 0,
    listeners: new Set<() => void>()
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: () => {}, push: () => {} }),
    usePathname: () => "/transactions",
    useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/lib/crdt/context", async () => {
    const { useMemo, useSyncExternalStore } = await import("react");
    const { buildTransactionIndex } = await import("@/lib/crdt/transaction-cursor");

    const subscribe = (listener: () => void) => {
        vault.listeners.add(listener);
        return () => {
            vault.listeners.delete(listener);
        };
    };
    const readRevision = () => vault.revision;

    return {
        // The grid's source is the document-scoped index, not a flat array. Memoised on the
        // store's revision exactly as the real hook memoises on the store's identity: a fresh
        // index every render would give the page a fresh cursor every render, and the selection
        // reconciliation keyed on cursor identity would then never settle.
        useTransactionIndex: () => {
            // Subscribed so replacing the store re-renders, then memoised on the store's own
            // identity — exactly how the real hook memoises on `state.transactions`.
            useSyncExternalStore(subscribe, readRevision, readRevision);
            const store = vault.store as TransactionStore;
            return useMemo(() => buildTransactionIndex(store), [store]);
        },
        useActiveAccounts: () => accounts,
        useActiveTags: () => empty,
        // The real alias graph, so the page's own lookup does the one-hop symlink resolution.
        useDescriptionAliases: () => aliases,
        useStatuses: () => statuses,
        useActivePeople: () => empty,
        usePeople: () => empty,
        useActiveFieldRules: () => noRules,
        useTransactionActions: () => transactionActions,
        useDescriptionAliasActions: () => aliasActions,
        useVaultAction: () => noop,
        useApplyFieldRulesToTransaction: () => noop,
        useUserAutomationChoice: () => empty,
        usePersistAutomationPreference: () => noop,
        useUserTransactionInspectorOpen: () => true,
        usePersistTransactionInspectorOpen: () => noop
    };
});

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
    [STATUS_ID]: { id: STATUS_ID, name: "For review", isDefault: true }
};

/**
 * `alias-trial` is a one-hop symlink onto `alias-testing`, so a row wearing the symlink displays and
 * must therefore match "Testing" — the resolution the table already performs to render the cell.
 */
const aliases = {
    "alias-testing": {
        kind: "real",
        id: "alias-testing",
        name: "Testing",
        symlinkIds: { "alias-trial": true },
        transactionIds: { "tx-manual": true }
    },
    "alias-trial": {
        kind: "symlink",
        id: "alias-trial",
        targetAliasId: "alias-testing",
        transactionIds: { "tx-symlinked": true }
    },
    "alias-groceries": {
        kind: "real",
        id: "alias-groceries",
        name: "Groceries",
        symlinkIds: {},
        transactionIds: { "tx-imported": true }
    }
};
const transactionActions = {
    insertTransaction: noop,
    updateTransaction: noop,
    setTransactionAllocation: noop,
    moveTransaction: noop,
    deleteTransaction: noop,
    unnestDuplicate: noop
};
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

function createTransaction(
    id: string,
    day: string,
    fields: {
        readonly description: string;
        readonly notes?: string;
        readonly descriptionAliasId?: string;
    }
) {
    return {
        id,
        date: Temporal.PlainDate.from(day),
        description: fields.description,
        descriptionAliasId: fields.descriptionAliasId,
        notes: fields.notes ?? "",
        amount: asMinorUnits(-425),
        originalAmount: undefined,
        accountId: ACCOUNT_ID,
        tagIds: [],
        statusId: STATUS_ID,
        importId: undefined,
        allocations: {},
        creationInstant: Temporal.Instant.from(`${day}T09:00:00Z`),
        importRowIndex: undefined,
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

/** Drives the real search box. Enter bypasses the input's debounce, as it does for a user. */
function searchFor(term: string): void {
    const input = screen.getByTestId("search-filter");
    fireEvent.change(input, { target: { value: term } });
    fireEvent.keyDown(input, { key: "Enter" });
}

/** IDs of the rows currently surviving the page's filter, in row order. */
function visibleRowIds(): string[] {
    return screen
        .queryAllByTestId("transaction-row")
        .map((row) => row.getAttribute("data-transaction-id") ?? "unknown");
}

describe("transaction search matches the alias-resolved description", () => {
    // Mounting the whole page costs ~2.3s alone but far more under a saturated full-suite run,
    // which overruns the 5s default. A budget ceiling, not a wait: every assertion below still
    // settles on its own condition rather than on elapsed time.
    vi.setConfig({ testTimeout: 30_000 });

    let restoreLayout: () => void;

    beforeEach(() => {
        // The real virtualizer, given real element sizes, so what survives filtering is decided by
        // the page and the cursor rather than by a fixed window a fake chose.
        restoreLayout = installVirtualGridLayout();
        vault.store = buildFakeTransactionStore([
            // The reported case: a manually added row stores an empty description and carries only
            // the alias, so raw-field search could never find it.
            createTransaction("tx-manual", "2026-07-29", {
                description: "",
                descriptionAliasId: "alias-testing"
            }),
            createTransaction("tx-symlinked", "2026-07-28", {
                description: "",
                descriptionAliasId: "alias-trial"
            }),
            createTransaction("tx-imported", "2026-07-27", {
                description: "SAFEWAY STORE 1234",
                notes: "weekly shop",
                descriptionAliasId: "alias-groceries"
            }),
            createTransaction("tx-unaliased", "2026-07-26", { description: "Bookshop" })
        ]);
        vault.revision += 1;
        vault.listeners.clear();
    });

    afterEach(() => restoreLayout());

    it("finds an aliased row by the alias text the table displays for it", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(visibleRowIds()).toHaveLength(4));

        searchFor("test");

        // Both the row on the real alias and the row on its one-hop symlink, neither of which has
        // any stored description to match on.
        await waitFor(() => expect(visibleRowIds().sort()).toEqual(["tx-manual", "tx-symlinked"]));
    });

    it("keeps raw description and notes findable underneath an alias", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(visibleRowIds()).toHaveLength(4));

        searchFor("safeway");
        await waitFor(() => expect(visibleRowIds()).toEqual(["tx-imported"]));

        searchFor("weekly");
        await waitFor(() => expect(visibleRowIds()).toEqual(["tx-imported"]));

        // The same row is reachable by its alias too, so neither field shadows the other.
        searchFor("groceries");
        await waitFor(() => expect(visibleRowIds()).toEqual(["tx-imported"]));

        searchFor("bookshop");
        await waitFor(() => expect(visibleRowIds()).toEqual(["tx-unaliased"]));
    });

    it("matches alias text case-insensitively in both directions", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(visibleRowIds()).toHaveLength(4));

        searchFor("TESTING");
        await waitFor(() => expect(visibleRowIds().sort()).toEqual(["tx-manual", "tx-symlinked"]));

        searchFor("groc");
        await waitFor(() => expect(visibleRowIds()).toEqual(["tx-imported"]));

        searchFor("no-such-description");
        await waitFor(() => expect(visibleRowIds()).toEqual([]));
    });
});

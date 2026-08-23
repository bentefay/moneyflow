/**
 * Mounting the *real* transactions page over a fake vault.
 *
 * Several things about this grid are only true of the whole page: the cursor, the window of rows the
 * grid holds, the selection baseline and the bulk handlers all live there, and a component-level test
 * sees none of them. So the tests that care about those mount the page itself, and this is the
 * scaffolding they share — the vault, the mock factories and the gestures.
 *
 * The vault is a real hierarchical store built by the real `insertTransaction`, read through the real
 * `buildTransactionIndex`. Only the *source* is fake; the cursor, the canonical-copy resolution and
 * the day-bucket grouping are all production code.
 *
 * `vi.mock` calls are hoisted per file and cannot live here, so each test file keeps its own
 * one-liners and delegates to the factories below.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";

import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

import { buildFakeTransactionStore } from "./virtual-grid-harness";

export const ACCOUNT_ID = "account-cheque";
export const STATUS_ID = "status-for-review";
export const PAID_STATUS_ID = "status-paid";

/** The fake document, replaced per test and observed through a revision counter. */
export const vault = {
    store: {} as Record<string, unknown>,
    /** Bumped whenever the store is replaced, so the mocked index hook re-derives exactly once. */
    revision: 0,
    listeners: new Set<() => void>()
};

/** Every `updateTransaction` the page issued, so a bulk action's true reach can be measured. */
export const statusUpdates: Array<{ id: string; statusId: string }> = [];

/**
 * The people the vault holds. Two records rather than one because the page reads them through two
 * hooks with different meanings: `active` is what earns a column of its own, `all` is what a
 * historical reference is resolved to a name through. Held as one mutable object each so the hooks
 * return a stable identity and the page's memos are not invalidated on every render.
 */
export const vaultPeople: { active: Record<string, unknown>; all: Record<string, unknown> } = {
    active: {},
    all: {}
};

/** Replaces the vault's people. Call before rendering; `seedVaultWith` clears them. */
export function seedVaultPeople(people: {
    readonly active: Record<string, unknown>;
    readonly all: Record<string, unknown>;
}): void {
    vaultPeople.active = people.active;
    vaultPeople.all = people.all;
}

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

export const presenceMock = {
    snapshot: { byTransactionId: {}, byIdentity: {} },
    onlineIdentities: [],
    presentIdentities: [],
    isConnected: false,
    setPresenceState: noop,
    clearPresenceFocus: noop,
    disconnect: async () => {}
};

export const routerMock = {
    useRouter: () => ({ replace: noop, push: noop }),
    usePathname: () => "/transactions",
    useSearchParams: () => new URLSearchParams()
};

/** The `@/lib/crdt/context` stand-in. Built lazily so a `vi.mock` factory can await it. */
export async function createCrdtContextMock() {
    const { useCallback, useMemo, useSyncExternalStore } = await import("react");
    const { buildTransactionIndex } = await import("@/lib/crdt/transaction-cursor");

    const subscribe = (listener: () => void) => {
        vault.listeners.add(listener);
        return () => {
            vault.listeners.delete(listener);
        };
    };
    const readRevision = () => vault.revision;

    return {
        // The grid's source is the document-scoped index, not a flat array. Memoised on the store's
        // revision exactly as the real hook memoises on the store's identity: a fresh index every
        // render would give the page a fresh cursor every render, and the selection reconciliation
        // keyed on cursor identity would then never settle.
        useTransactionIndex: () => {
            useSyncExternalStore(subscribe, readRevision, readRevision);
            const store = vault.store as TransactionStore;
            return useMemo(() => buildTransactionIndex(store), [store]);
        },
        useActiveAccounts: () => accounts,
        useActiveTags: () => empty,
        useDescriptionAliases: () => empty,
        useStatuses: () => statuses,
        useActivePeople: () => vaultPeople.active,
        usePeople: () => vaultPeople.all,
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
}

/** The `@/components/features/import` stand-in: a drop target that is only a container. */
export const importMock = {
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
};

/**
 * One row, dated so that index 0 is newest and the store's own order is index order. Half carry
 * "Groceries" in the description so a search filter can split the set.
 */
export function createTransaction(index: number, totalCount: number) {
    const day = Temporal.PlainDate.from("2026-01-01").add({ days: totalCount - index });
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

/** Replaces the vault with the given rows and resets everything observed about the last test. */
export function seedVaultWith(transactions: readonly TransactionInput[]): void {
    vault.store = buildFakeTransactionStore(transactions);
    vault.revision += 1;
    vault.listeners.clear();
    statusUpdates.length = 0;
    vaultPeople.active = {};
    vaultPeople.all = {};
}

/** Replaces the vault with `count` rows, one per calendar day, newest first. */
export function seedVault(count: number): void {
    seedVaultWith(
        Array.from({ length: count }, (unused, index) => createTransaction(index, count))
    );
}

export async function renderTransactionsPage(): Promise<void> {
    const { default: TransactionsPage } = await import("@/app/(app)/transactions/page");
    const { ToastProvider } = await import("@/components/ui/toast");
    render(
        <ToastProvider>
            <TransactionsPage />
        </ToastProvider>
    );
}

/** The transaction IDs that actually have a rendered row right now. */
export function renderedRowIds(): string[] {
    return screen
        .getAllByTestId("transaction-row")
        .map((row) => row.getAttribute("data-transaction-id") ?? "");
}

export function clickHeaderCheckbox(): void {
    const header = screen.getByTestId("header-checkbox").querySelector("button");
    if (header == null) throw new Error("Expected the header checkbox to render");
    fireEvent.click(header);
}

/** Applies the "Paid" status through the real bulk toolbar. */
export function applyBulkPaidStatus(): void {
    fireEvent.click(screen.getByTestId("bulk-edit-status-button"));
    fireEvent.click(screen.getByRole("button", { name: "Paid" }));
}

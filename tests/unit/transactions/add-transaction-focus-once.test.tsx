/**
 * UR-001: "The focus intent is consumed exactly once and then cleared, so it cannot re-assert on a
 * later render."
 *
 * `add-transaction-focus.test.tsx` drives `TransactionTable` directly, so the focus request there is
 * a prop the test itself controls and retires. The invariant guarded here lives one level up, in how
 * the *page* retires the intent. Two effects retire the two steps — the page's scroll effect and the
 * row's focus effect — and they land in the same flush. If either writes the intent from a value
 * captured in its closure rather than functionally, it overwrites the other's already-landed
 * retirement, the row re-renders with the request still set, and focus is applied a second time.
 *
 * So the page is rendered over a fake vault and applications are *counted*. Asserting only that the
 * caret ends up in the new row's description is too weak: the duplicated-application bug satisfies
 * that assertion too. Counting is what distinguishes them.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionTable as TransactionTableComponent } from "@/components/features/transactions";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

import {
    buildFakeTransactionStore,
    insertIntoFakeStore,
    installVirtualGridLayout
} from "./virtual-grid-harness";

const ACCOUNT_ID = "account-cheque";
const STATUS_ID = "status-for-review";

/**
 * Every `focus()` that lands on a description input, redundant ones included. A `focusin` listener
 * would miss exactly the duplicate this file exists to catch, because refocusing an already-focused
 * element fires no event — so the call itself is what gets counted.
 */
const descriptionFocusCalls = vi.hoisted(() => [] as string[]);

/** What the page publishes to the table each render, so retirement can be traced across renders. */
const focusRequestRenders = vi.hoisted(() => [] as Array<string | null>);
const pendingActivationRenders = vi.hoisted(() => [] as string[]);

/** Mutable vault contents, reassigned by the fake `insertTransaction` and read through a store. */
const vault = vi.hoisted(() => ({
    store: {} as Record<string, unknown>,
    /** Bumped whenever the store changes, so the mocked index hook re-derives exactly once. */
    revision: 0,
    listeners: new Set<() => void>()
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: () => {}, push: () => {} }),
    usePathname: () => "/transactions",
    useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/lib/crdt/context", async () => {
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
        // The real hook returns transactions already sorted newest-first by the hierarchical store,
        // so the fake sorts on insert to match. Sort order is load-bearing: it decides the created
        // row's index, and therefore whether the page's scroll effect runs against it at all.
        // The grid's source is the document-scoped index, not a flat array. Memoised on the store's
        // revision exactly as the real hook memoises on the store's identity: a fresh index every
        // render would give the page a fresh cursor every render, and the selection reconciliation
        // keyed on cursor identity would then never settle.
        useTransactionIndex: () => {
            // Subscribed so replacing the store re-renders, then memoised on the store's own
            // identity — exactly how the real hook memoises on `state.transactions`.
            useSyncExternalStore(subscribe, readRevision, readRevision);
            const store = vault.store as TransactionStore;
            return useMemo(() => buildTransactionIndex(store), [store]);
        },
        useActiveAccounts: () => accounts,
        useAccounts: () => accounts,
        useActiveTags: () => empty,
        useDescriptionAliases: () => empty,
        useActiveDescriptionAliases: () => empty,
        useStatuses: () => statuses,
        useActivePeople: () => empty,
        usePeople: () => empty,
        useActiveFieldRules: () => noRules,
        useTransactionActions: () => ({
            // The real hierarchical insert, into the same store shape the page's cursor reads, so
            // the created row lands where the product would put it rather than where a test-local
            // sort chose. The nanosecond `creationInstant` bump two adds in one test depend on is
            // then resolved by the production comparator inside the cursor.
            insertTransaction: useCallback(
                ({ transaction }: { readonly transaction: TransactionInput }) => {
                    vault.store = insertIntoFakeStore(vault.store as TransactionStore, transaction);
                    vault.revision += 1;
                    for (const listener of vault.listeners) listener();
                },
                []
            ),
            updateTransaction: noop,
            setTransactionAllocation: noop,
            moveTransaction: noop,
            deleteTransaction: noop,
            unnestDuplicate: noop
        }),
        useDescriptionAliasActions: () => aliasActions,
        useVaultAction: () => noop,
        useApplyFieldRulesToTransaction: () => noop,
        useApplyFieldRules: () => ({ applyAll: noop, applyNewerThan: noop }),
        useFieldRuleActions: () => ({ create: noop, update: noop }),
        useVaultPreferences: () => empty,
        useUserAutomationChoice: () => empty,
        usePersistAutomationPreference: () => noop,
        useUserTransactionInspectorOpen: () => false,
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

// Record the workspace's pending Description target on each table render, then delegate to the real
// table untouched so registration, focus verification and fulfillment remain production behavior.
vi.mock("@/components/features/transactions", async () => {
    const actual = await vi.importActual<typeof import("@/components/features/transactions")>(
        "@/components/features/transactions"
    );
    return {
        ...actual,
        TransactionTable: (props: React.ComponentProps<typeof TransactionTableComponent>) => {
            const pending = props.controller.getPendingRequest();
            focusRequestRenders.push(
                pending?.state.target.columnId === "description"
                    ? pending.state.target.transactionId
                    : null
            );
            if (pending?.kind === "edit") {
                pendingActivationRenders.push(
                    `${pending.entry}:${pending.state.target.columnId}:${pending.state.target.transactionId}`
                );
            }
            return <actual.TransactionTable {...props} />;
        }
    };
});

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
    isConnected: true,
    setPresenceState: vi.fn(),
    clearPresenceFocus: vi.fn(),
    disconnect: async () => {}
};

function createTransaction(id: string, day: string) {
    return {
        id,
        date: Temporal.PlainDate.from(day),
        description: `Existing ${id}`,
        descriptionAliasId: undefined,
        notes: "",
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

// Captured once, before any spy is installed, so re-instrumenting per test cannot wrap a wrapper.
const nativeFocus = HTMLElement.prototype.focus;

/** Instruments `focus()` on description inputs only, leaving every other element's focus untouched. */
function countDescriptionFocusCalls(): void {
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
        this: HTMLElement,
        options?: FocusOptions
    ) {
        if (this.getAttribute("data-testid") === "description-editable") {
            const row = this.closest("[data-transaction-id]");
            descriptionFocusCalls.push(row?.getAttribute("data-transaction-id") ?? "unknown");
        }
        nativeFocus.call(this, options);
    });
}

function newestRowId(): string {
    const id = screen.getAllByTestId("transaction-row")[0]?.getAttribute("data-transaction-id");
    if (id == null) throw new Error("Expected at least one rendered row");
    return id;
}

/** The id of the row created by the most recent Add, once it has actually rendered. */
async function waitForCreatedRow(alreadySeen: readonly string[]): Promise<string> {
    return waitFor(() => {
        const id = newestRowId();
        if (alreadySeen.includes(id)) throw new Error("The created row has not rendered yet");
        return id;
    });
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

describe("add transaction consumes the focus intent exactly once", () => {
    // Mounting the whole page twice per test costs ~2.3s alone but ~5.8s under a saturated
    // full-suite run, which overruns the 5s default. This is a budget ceiling, not a wait: every
    // assertion below still settles on its own condition rather than on elapsed time.
    vi.setConfig({ testTimeout: 30_000 });

    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
        vault.store = buildFakeTransactionStore([
            createTransaction("existing-newer", "2026-07-29"),
            createTransaction("existing-older", "2026-07-28")
        ]);
        vault.revision += 1;
        vault.listeners.clear();
        descriptionFocusCalls.length = 0;
        focusRequestRenders.length = 0;
        pendingActivationRenders.length = 0;
        presence.setPresenceState.mockClear();
        presence.clearPresenceFocus.mockClear();
        countDescriptionFocusCalls();
    });

    afterEach(() => restoreLayout());

    it("applies the created row's focus request once and never re-asserts it", async () => {
        await renderTransactionsPage();
        expect(descriptionFocusCalls).toEqual([]);

        fireEvent.click(screen.getByTestId("add-transaction-button"));
        const createdRowId = await waitForCreatedRow(["existing-newer", "existing-older"]);
        expect(pendingActivationRenders).toContain(`full:description:${createdRowId}`);

        // Exactly one application, on the created row. Two would mean a retirement was overwritten
        // by a stale-closure write and the request survived a render it should not have.
        await waitFor(() => expect(descriptionFocusCalls).toEqual([createdRowId]));

        // The caret really is in the created row, so the single application is the *right* one.
        const createdRow = screen
            .getAllByTestId("transaction-row")
            .find((row) => row.getAttribute("data-transaction-id") === createdRowId);
        if (createdRow == null) throw new Error("Expected the created row to be mounted");
        const description = createdRow.querySelector('[data-testid="description-editable"]');
        expect(document.activeElement).toBe(description);
        await waitFor(() => expect(presence.clearPresenceFocus).toHaveBeenCalled());
        expect(presence.setPresenceState).not.toHaveBeenCalledWith({
            editing: true,
            field: "description",
            transactionId: createdRowId
        });

        // The intent reaches null and stays there. A resurrected focus step shows up as the request
        // re-appearing on a render after the one that already cleared it.
        await waitFor(() => expect(focusRequestRenders.at(-1)).toBeNull());
        const firstClearIndex = focusRequestRenders.indexOf(
            null,
            focusRequestRenders.indexOf(createdRowId)
        );
        expect(firstClearIndex).toBeGreaterThan(0);
        expect(focusRequestRenders.slice(firstClearIndex)).not.toContain(createdRowId);

        // Later renders driven by ordinary interaction must not pull the caret back. Typing is the
        // hostile case: it re-renders on every keystroke.
        if (!(description instanceof HTMLInputElement)) {
            throw new Error("Expected the description cell to render an input");
        }
        fireEvent.keyDown(description, { key: "C" });
        fireEvent.change(description, { target: { value: "Coffee" } });
        expect(descriptionFocusCalls).toEqual([createdRowId]);
        await waitFor(() =>
            expect(presence.setPresenceState).toHaveBeenLastCalledWith({
                editing: true,
                field: "description",
                transactionId: createdRowId
            })
        );
    });

    it("publishes wrapper navigation as viewing and the mounted editor as editing", async () => {
        await renderTransactionsPage();
        const row = screen
            .getAllByTestId("transaction-row")
            .find(
                (candidate) => candidate.getAttribute("data-transaction-id") === "existing-newer"
            );
        if (row == null) throw new Error("Expected the newest transaction row to be mounted");
        const checkboxCell = row.querySelector('[role="gridcell"][data-cell="checkbox"]');
        const descriptionCell = row.querySelector('[role="gridcell"][data-cell="description"]');
        if (!(checkboxCell instanceof HTMLElement)) {
            throw new Error("Expected the checkbox gridcell to be mounted");
        }
        if (!(descriptionCell instanceof HTMLElement)) {
            throw new Error("Expected the description gridcell to be mounted");
        }

        fireEvent.focus(checkboxCell);
        await waitFor(() =>
            expect(presence.setPresenceState).toHaveBeenLastCalledWith({
                editing: false,
                transactionId: "existing-newer"
            })
        );

        fireEvent.doubleClick(descriptionCell);
        await waitFor(() =>
            expect(presence.setPresenceState).toHaveBeenLastCalledWith({
                editing: true,
                field: "description",
                transactionId: "existing-newer"
            })
        );
    });

    it("applies one focus request per created row across successive adds", async () => {
        await renderTransactionsPage();
        const seeded = ["existing-newer", "existing-older"];

        fireEvent.click(screen.getByTestId("add-transaction-button"));
        const firstCreatedId = await waitForCreatedRow(seeded);
        await waitFor(() => expect(descriptionFocusCalls).toEqual([firstCreatedId]));

        fireEvent.click(screen.getByTestId("add-transaction-button"));
        const secondCreatedId = await waitForCreatedRow([...seeded, firstCreatedId]);

        // One application each, in creation order — not two for either.
        await waitFor(() =>
            expect(descriptionFocusCalls).toEqual([firstCreatedId, secondCreatedId])
        );
        await waitFor(() => expect(focusRequestRenders.at(-1)).toBeNull());
    });
});

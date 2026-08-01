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

import type { Range } from "@tanstack/react-virtual";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionTable as TransactionTableComponent } from "@/components/features/transactions";
import { compareTransactionOrder } from "@/lib/crdt/queries";
import { asMinorUnits } from "@/lib/domain/currency";

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

/** Mutable vault contents, reassigned by the fake `insertTransaction` and read through a store. */
const vault = vi.hoisted(() => ({
    transactions: [] as unknown[],
    listeners: new Set<() => void>()
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: () => {}, push: () => {} }),
    usePathname: () => "/transactions",
    useSearchParams: () => new URLSearchParams()
}));

// jsdom gives the scroll container no height, so the real virtualizer mounts no rows at all. This
// mirrors it closely enough to matter: only rows the range extractor keeps are mounted, so the
// production pinning of the focus target is still what decides whether the request can land.
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
                    endIndex: Math.min(4, options.count - 1),
                    overscan: options.overscan,
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
        // The real hook returns transactions already sorted newest-first by the hierarchical store,
        // so the fake sorts on insert to match. Sort order is load-bearing: it decides the created
        // row's index, and therefore whether the page's scroll effect runs against it at all.
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
            insertTransaction: useCallback(({ transaction }: { readonly transaction: unknown }) => {
                vault.transactions = [...vault.transactions, transaction].sort(newestFirst);
                for (const listener of vault.listeners) listener();
            }, []),
            updateTransaction: noop,
            setTransactionAllocation: noop,
            moveTransaction: noop,
            deleteTransaction: noop,
            unnestDuplicate: noop
        }),
        useDescriptionAliasActions: () => aliasActions,
        useVaultAction: () => noop,
        useApplyFieldRulesToTransaction: () => noop,
        useUserAutomationChoice: () => empty,
        usePersistAutomationPreference: () => noop
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

// Record what the page publishes each render, then delegate to the real table untouched: the focus
// effect under test stays the production one.
vi.mock("@/components/features/transactions", async () => {
    const actual = await vi.importActual<typeof import("@/components/features/transactions")>(
        "@/components/features/transactions"
    );
    return {
        ...actual,
        TransactionTable: (props: React.ComponentProps<typeof TransactionTableComponent>) => {
            focusRequestRenders.push(props.focusDescriptionTransactionId ?? null);
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
    isConnected: false,
    setPresenceState: noop,
    clearPresenceFocus: noop,
    disconnect: async () => {}
};

interface TransactionOrderKey {
    readonly id: string;
    readonly date: Temporal.PlainDate;
    readonly creationInstant: Temporal.Instant;
    readonly importRowIndex?: number;
}

function orderKey(value: unknown): TransactionOrderKey {
    const { id, date, creationInstant, importRowIndex } = Object(value);
    if (typeof id !== "string") throw new Error("Expected a transaction id");
    if (!(date instanceof Temporal.PlainDate)) throw new Error("Expected a transaction date");
    if (!(creationInstant instanceof Temporal.Instant)) {
        throw new Error("Expected a transaction creationInstant");
    }
    return {
        id,
        date,
        creationInstant,
        importRowIndex: typeof importRowIndex === "number" ? importRowIndex : undefined
    };
}

/**
 * Newest first, via the production comparator. Same-day rows are the interesting case — two adds in
 * one test land on today — and the tie-break on `creationInstant` is what the page's own nanosecond
 * bump exists to satisfy, so borrowing the real comparator keeps the fake honest about row order.
 */
function newestFirst(left: unknown, right: unknown): number {
    return compareTransactionOrder(orderKey(left), orderKey(right));
}

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

    beforeEach(() => {
        vault.transactions = [
            createTransaction("existing-newer", "2026-07-29"),
            createTransaction("existing-older", "2026-07-28")
        ];
        vault.listeners.clear();
        descriptionFocusCalls.length = 0;
        focusRequestRenders.length = 0;
        countDescriptionFocusCalls();
    });

    it("applies the created row's focus request once and never re-asserts it", async () => {
        await renderTransactionsPage();
        expect(descriptionFocusCalls).toEqual([]);

        fireEvent.click(screen.getByTestId("add-transaction-button"));
        const createdRowId = await waitForCreatedRow(["existing-newer", "existing-older"]);

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
        fireEvent.change(description, { target: { value: "Coffee" } });
        expect(descriptionFocusCalls).toEqual([createdRowId]);
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

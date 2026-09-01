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

import type { TransactionGridEditorCommitResult } from "@/components/features/transactions/cells/editor-lifecycle";
import type {
    AllocationBoundaryResult,
    SetTransactionAllocationInput
} from "@/lib/crdt/allocations";
import type {
    AssignDescriptionAliasByExactNameInput,
    RemoveOneDescriptionAliasInput
} from "@/lib/crdt/description-aliases";
import type { CreateFieldRuleInput } from "@/lib/crdt/field-rule-mutations";
import type { UpdateTransactionInput } from "@/lib/crdt/mutations";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { buildTransactionIndex } from "@/lib/crdt/transaction-cursor";
import {
    DEFAULT_REMEMBERED_CHOICE,
    type RememberedRuleChoice
} from "@/lib/domain/automation/preferences";
import { asMinorUnits } from "@/lib/domain/currency";

import { buildFakeTransactionStore } from "./virtual-grid-harness";

export const ACCOUNT_ID = "account-cheque";
export const STATUS_ID = "status-for-review";
export const PAID_STATUS_ID = "status-paid";

interface TransactionTagCommitInput {
    readonly location: {
        readonly accountId: string;
        readonly date: Temporal.PlainDate;
        readonly transactionId: string;
    };
    readonly tagIds: readonly string[];
    readonly createdTags: readonly {
        readonly id: string;
        readonly name: string;
        readonly color?: string;
    }[];
}

/** The fake document, replaced per test and observed through a revision counter. */
export const vault = {
    store: {} as Record<string, unknown>,
    /** Bumped whenever the store is replaced, so the mocked index hook re-derives exactly once. */
    revision: 0,
    listeners: new Set<() => void>()
};
export const vaultTags: Record<string, unknown> = {};
export const vaultActionCalls: unknown[] = [];
export const fieldRuleCreateCalls: CreateFieldRuleInput[] = [];
export const fieldRuleCreateFailure = { current: false };
export const transactionTagCommitBoundaryMode: {
    current: "normal" | "missing" | "unchanged";
} = { current: "normal" };
export const transactionAllocationCommitBoundaryMode: {
    current: "normal" | "missing" | "unchanged";
} = { current: "normal" };
export const transactionAllocationCalls: SetTransactionAllocationInput[] = [];
export const fieldRuleApplicationCalls: Array<{
    readonly kind: "all" | "newer";
    readonly inspectorOwnerAtApply: string | null;
}> = [];
export const rememberedAutomationChoice: { current: RememberedRuleChoice } = {
    current: DEFAULT_REMEMBERED_CHOICE
};

export function seedRememberedAutomationChoice(choice: RememberedRuleChoice): void {
    rememberedAutomationChoice.current = choice;
}

export function storedTransactionTagIds(transactionId: string): readonly string[] {
    const index = buildTransactionIndex(vault.store as TransactionStore);
    return index.canonicalById.get(transactionId)?.tagIds ?? [];
}

export function storedTransactionAllocations(
    transactionId: string
): Readonly<Record<string, unknown>> {
    const index = buildTransactionIndex(vault.store as TransactionStore);
    return index.canonicalById.get(transactionId)?.allocations ?? {};
}

export function storedTransactionDescriptionAliasId(transactionId: string): string | undefined {
    const index = buildTransactionIndex(vault.store as TransactionStore);
    return index.canonicalById.get(transactionId)?.descriptionAliasId;
}

/** Description aliases exposed to the real page by the fake vault context. */
export const vaultDescriptionAliases = { current: {} as Record<string, unknown> };

/** Every `updateTransaction` the page issued, so a bulk action's true reach can be measured. */
export const statusUpdates: Array<{ id: string; statusId: string }> = [];
export const notesUpdates: Array<{ id: string; notes: string }> = [];

/** Encrypted per-viewer inspector preference exposed by the fake vault. */
export const transactionInspectorPreference: { open: boolean; persisted: boolean[] } = {
    open: true,
    persisted: []
};

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

/** Replaces the aliases returned by the fake vault context. Call before rendering. */
export function seedVaultDescriptionAliases(aliases: Record<string, unknown>): void {
    vaultDescriptionAliases.current = aliases;
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
const fieldRuleActions = {
    create: (input: CreateFieldRuleInput) => {
        fieldRuleCreateCalls.push(input);
        return fieldRuleCreateFailure.current
            ? ({
                  error: { existingRuleId: "existing-rule", type: "duplicate-key" },
                  ok: false
              } as const)
            : ({ ok: true, value: undefined } as const);
    },
    update: noop
};
const changeAllDescriptionAliasCalls: unknown[] = [];
const changeOneDescriptionAliasCalls: unknown[] = [];
const removeAllDescriptionAliasCalls: unknown[] = [];
const removeOneDescriptionAliasCalls: unknown[] = [];
export const descriptionAliasActionCalls = {
    changeAll: changeAllDescriptionAliasCalls,
    changeOne: changeOneDescriptionAliasCalls,
    removeAll: removeAllDescriptionAliasCalls,
    removeOne: removeOneDescriptionAliasCalls
};
export const descriptionAliasCommitBoundaryMode: { current: "record" | "persist" } = {
    current: "record"
};
const successfulAliasMutation = () => ({ ok: true, value: undefined });
const recordSuccessfulAliasMutation = (calls: unknown[], input: unknown) => {
    calls.push(input);
    return successfulAliasMutation();
};
const aliasActions = {
    assignDescriptionAlias: successfulAliasMutation,
    assignDescriptionAliasByExactName: successfulAliasMutation,
    changeAllDescriptionAliases: (input: unknown) =>
        recordSuccessfulAliasMutation(changeAllDescriptionAliasCalls, input),
    changeOneDescriptionAlias: (input: unknown) =>
        recordSuccessfulAliasMutation(changeOneDescriptionAliasCalls, input),
    removeAllDescriptionAliases: (input: unknown) =>
        recordSuccessfulAliasMutation(removeAllDescriptionAliasCalls, input),
    removeOneDescriptionAlias: (input: unknown) =>
        recordSuccessfulAliasMutation(removeOneDescriptionAliasCalls, input),
    renameDescriptionAlias: successfulAliasMutation
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
    const { setTransactionAllocation: setStoredTransactionAllocation } =
        await import("@/lib/crdt/allocations");
    const { findTransactionsInStore, updateTransaction: updateStoredTransaction } =
        await import("@/lib/crdt/mutations");

    const publishStore = (store: TransactionStore): void => {
        vault.store = { ...store };
        vault.revision += 1;
        for (const listener of vault.listeners) listener();
    };
    const useVaultActionMock =
        (
            updater: (
                state: {
                    readonly transactions: TransactionStore;
                    readonly tags: Record<string, unknown>;
                },
                input: TransactionTagCommitInput
            ) => TransactionGridEditorCommitResult
        ) =>
        (input: TransactionTagCommitInput): TransactionGridEditorCommitResult => {
            vaultActionCalls.push(input);
            const mode = transactionTagCommitBoundaryMode.current;
            const store =
                mode === "missing"
                    ? buildFakeTransactionStore([])
                    : (vault.store as TransactionStore);
            if (mode === "unchanged") {
                updateStoredTransaction(store, {
                    location: input.location,
                    updates: { tagIds: [...input.tagIds] }
                });
            }
            const result = updater({ tags: vaultTags, transactions: store }, input);
            if (mode !== "missing" && result.ok) publishStore(store);
            return result;
        };

    const applyCreatedTagRule = (
        kind: "all" | "newer",
        referenceDate?: Temporal.PlainDate
    ): void => {
        const rule = fieldRuleCreateCalls.at(-1);
        if (rule == null || rule.action.field !== "tags") return;
        fieldRuleApplicationCalls.push({
            inspectorOwnerAtApply:
                document
                    .querySelector<HTMLElement>("[data-testid='transaction-inspector']")
                    ?.getAttribute("data-transaction-owner") ?? null,
            kind
        });
        const store = vault.store as TransactionStore;
        const index = buildTransactionIndex(store);
        for (const transaction of index.canonicalById.values()) {
            if (
                transaction.deletedAt != null ||
                transaction.description !== rule.descriptionText ||
                (rule.accountId != null && transaction.accountId !== rule.accountId) ||
                (rule.amount != null && transaction.amount !== rule.amount) ||
                (referenceDate != null &&
                    Temporal.PlainDate.compare(transaction.date, referenceDate) <= 0)
            ) {
                continue;
            }
            const tagIds =
                rule.action.mode === "set"
                    ? [...rule.action.tagIds]
                    : [...new Set([...transaction.tagIds, ...rule.action.tagIds])];
            updateStoredTransaction(store, {
                location: {
                    accountId: transaction.accountId,
                    date: transaction.date,
                    transactionId: transaction.id
                },
                updates: { tagIds }
            });
        }
        vault.store = { ...store };
        vault.revision += 1;
        for (const listener of vault.listeners) listener();
    };
    const applyFieldRules = {
        applyAll: () => applyCreatedTagRule("all"),
        applyNewerThan: (referenceDate: Temporal.PlainDate) =>
            applyCreatedTagRule("newer", referenceDate)
    };

    const subscribe = (listener: () => void) => {
        vault.listeners.add(listener);
        return () => {
            vault.listeners.delete(listener);
        };
    };
    const readRevision = () => vault.revision;
    const descriptionAliasActions = {
        ...aliasActions,
        assignDescriptionAliasByExactName: (input: AssignDescriptionAliasByExactNameInput) => {
            if (descriptionAliasCommitBoundaryMode.current === "persist") {
                const store = vault.store as TransactionStore;
                const transactions = findTransactionsInStore(store, input.location);
                const transactionIds: Record<string, true> = {};
                for (const transaction of transactions) {
                    transaction.descriptionAliasId = input.newAliasId;
                    transactionIds[transaction.id] = true;
                }
                vaultDescriptionAliases.current = {
                    ...vaultDescriptionAliases.current,
                    [input.newAliasId]: {
                        id: input.newAliasId,
                        kind: "real",
                        name: input.name,
                        symlinkIds: {},
                        transactionIds
                    }
                };
                publishStore(store);
            }
            return successfulAliasMutation();
        },
        removeOneDescriptionAlias: (input: RemoveOneDescriptionAliasInput) => {
            removeOneDescriptionAliasCalls.push(input);
            if (descriptionAliasCommitBoundaryMode.current === "persist") {
                const store = vault.store as TransactionStore;
                const transactions = findTransactionsInStore(store, input.location);
                for (const transaction of transactions) transaction.descriptionAliasId = undefined;
                publishStore(store);
            }
            return successfulAliasMutation();
        }
    };

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
        useAccounts: () => accounts,
        useActiveTags: () => vaultTags,
        useDescriptionAliases: () => vaultDescriptionAliases.current,
        useStatuses: () => statuses,
        useActivePeople: () => vaultPeople.active,
        usePeople: () => vaultPeople.all,
        useActiveFieldRules: () => noRules,
        useTransactionActions: () => ({
            insertTransaction: noop,
            updateTransaction: useCallback((input: UpdateTransactionInput) => {
                if (input.updates.statusId != null) {
                    statusUpdates.push({
                        id: input.location.transactionId,
                        statusId: input.updates.statusId
                    });
                }
                if (input.updates.notes != null) {
                    notesUpdates.push({
                        id: input.location.transactionId,
                        notes: input.updates.notes
                    });
                }
                const store = vault.store as TransactionStore;
                updateStoredTransaction(store, input);
                vault.store = { ...store };
                vault.revision += 1;
                for (const listener of vault.listeners) listener();
            }, []),
            setTransactionAllocation: useCallback(
                (input: SetTransactionAllocationInput): AllocationBoundaryResult => {
                    transactionAllocationCalls.push(input);
                    const mode = transactionAllocationCommitBoundaryMode.current;
                    const store =
                        mode === "missing"
                            ? buildFakeTransactionStore([])
                            : (vault.store as TransactionStore);
                    if (mode === "unchanged") setStoredTransactionAllocation(store, input);
                    const result = setStoredTransactionAllocation(store, input);
                    if (mode !== "missing" && result.ok) publishStore(store);
                    return result;
                },
                []
            ),
            moveTransaction: noop,
            deleteTransaction: noop,
            unnestDuplicate: noop
        }),
        useDescriptionAliasActions: () => descriptionAliasActions,
        useVaultAction: useVaultActionMock,
        useApplyFieldRulesToTransaction: () => noop,
        useUserAutomationChoice: () => rememberedAutomationChoice.current,
        usePersistAutomationPreference: () => noop,
        useUserTransactionInspectorOpen: () =>
            useSyncExternalStore(
                subscribe,
                () => transactionInspectorPreference.open,
                () => transactionInspectorPreference.open
            ),
        usePersistTransactionInspectorOpen: () =>
            useCallback(
                ({ transactionInspectorOpen }: { readonly transactionInspectorOpen: boolean }) => {
                    transactionInspectorPreference.open = transactionInspectorOpen;
                    transactionInspectorPreference.persisted.push(transactionInspectorOpen);
                    for (const listener of vault.listeners) listener();
                },
                []
            ),
        // The inline rule-proposal workflow reads these through `@/lib/crdt`, which re-exports this
        // module. They are unrelated to selection but must exist, or the page throws on render.
        useActiveDescriptionAliases: () => {
            const aliases = vaultDescriptionAliases.current;
            return useMemo(() => Object.values(aliases), [aliases]);
        },
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
    notesUpdates.length = 0;
    vaultActionCalls.length = 0;
    fieldRuleCreateCalls.length = 0;
    fieldRuleCreateFailure.current = false;
    fieldRuleApplicationCalls.length = 0;
    transactionTagCommitBoundaryMode.current = "normal";
    transactionAllocationCommitBoundaryMode.current = "normal";
    transactionAllocationCalls.length = 0;
    rememberedAutomationChoice.current = DEFAULT_REMEMBERED_CHOICE;
    for (const tagId of Object.keys(vaultTags)) delete vaultTags[tagId];
    transactionInspectorPreference.open = true;
    transactionInspectorPreference.persisted.length = 0;
    descriptionAliasActionCalls.changeAll.length = 0;
    descriptionAliasActionCalls.changeOne.length = 0;
    descriptionAliasActionCalls.removeAll.length = 0;
    descriptionAliasActionCalls.removeOne.length = 0;
    descriptionAliasCommitBoundaryMode.current = "record";
    vaultDescriptionAliases.current = {};
    vaultPeople.active = {};
    vaultPeople.all = {};
}

/** Replaces a mounted page's vault and notifies its real external-store subscribers. */
export function replaceRenderedVaultWith(transactions: readonly TransactionInput[]): void {
    vault.store = buildFakeTransactionStore(transactions);
    vault.revision += 1;
    for (const listener of vault.listeners) listener();
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

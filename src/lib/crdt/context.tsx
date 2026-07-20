"use client";

/**
 * Loro Mirror React Context
 *
 * Provides React context and hooks for accessing vault state using loro-mirror-react.
 * Use this for reactive, type-safe access to vault data throughout the app.
 */

import { createLoroContext } from "loro-mirror-react";
import { useCallback, useEffect, useRef } from "react";
import type { DependencyList } from "react";
import { Temporal } from "temporal-polyfill";

import {
    getActiveDescriptionAliases,
    toDescriptionAliasCollection,
    type DescriptionAliasCollection
} from "@/lib/domain/description-aliases";

import type { VaultMirror } from "./mirror";
import type { Transaction, VaultState } from "./schema";
import { vaultSchema } from "./schema";
import type { VaultEditSession, VaultUserActionKind } from "./undo";
import { useVaultUndoCoordinator } from "./undo";

/**
 * Create typed context and hooks for vault state management.
 *
 * Public generic hooks see application state with raw alias wire data omitted. Alias consumers use
 * the legal selector and named action hooks below.
 */
const loroContext = createLoroContext(vaultSchema);

export const VaultProvider = loroContext.LoroProvider;
const useInternalVaultContext = loroContext.useLoroContext;
const useInternalVaultSelector = loroContext.useLoroSelector;

export type ApplicationVaultState = Omit<VaultState, "descriptionAliases">;

/** Select from the ordinary application state; raw alias wire records are deliberately absent. */
export function useVaultSelector<Selected>(
    selector: (state: ApplicationVaultState) => Selected
): Selected {
    return useInternalVaultSelector((state) => selector(state));
}

/** Run one user action while keeping the Mirror recipe void and returning its captured result. */
function runInternalVaultAction<Arguments extends unknown[], Result>(
    store: Pick<VaultMirror, "setState">,
    undoCoordinator: ReturnType<typeof useVaultUndoCoordinator>,
    kind: VaultUserActionKind,
    updater: (state: VaultState, ...args: Arguments) => Result,
    ...args: Arguments
): Result {
    const results: Result[] = [];
    undoCoordinator.runUserAction(kind, (origin) => {
        store.setState(
            (state: VaultState) => {
                results.push(updater(state, ...args));
            },
            { origin }
        );
    });
    for (const result of results) return result;
    throw new Error("Vault action recipe did not execute");
}

/** Creates a memoized user mutation with explicit origin and undo grouping metadata. */
function useInternalVaultAction<Arguments extends unknown[], Result>(
    updater: (state: VaultState, ...args: Arguments) => Result,
    dependencies: DependencyList = [],
    kind: VaultUserActionKind = "mutation"
): (...args: Arguments) => Result {
    const store = useInternalVaultContext();
    const undoCoordinator = useVaultUndoCoordinator();

    return useCallback(
        (...args: Arguments) =>
            runInternalVaultAction(store, undoCoordinator, kind, updater, ...args),
        // loro-mirror-react exposes the same dynamic dependency-list contract for action hooks.
        // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
        [store, undoCoordinator, updater, kind, ...dependencies]
    );
}

/** Create a generic application mutation without exposing raw alias wire state. */
export function useVaultAction<Arguments extends unknown[], Result>(
    updater: (state: ApplicationVaultState, ...args: Arguments) => Result,
    dependencies: DependencyList = [],
    kind: VaultUserActionKind = "mutation"
): (...args: Arguments) => Result {
    return useInternalVaultAction((state, ...args) => updater(state, ...args), dependencies, kind);
}

export interface VaultEditAction<Arguments extends unknown[]> {
    /** Start a new focus-to-close logical edit boundary. */
    begin: () => void;
    /** Close the boundary without reverting already-persisted CRDT changes. */
    cancel: () => void;
    /** Complete the edit boundary. */
    commit: () => void;
    /** Persist one input event immediately inside the active boundary. */
    update: (...args: Arguments) => void;
}

/** Creates an immediate CRDT mutation whose separate input events form one undoable edit. */
export function useVaultEditAction<Arguments extends unknown[]>(
    updater: (state: ApplicationVaultState, ...args: Arguments) => void,
    dependencies: DependencyList = []
): VaultEditAction<Arguments> {
    const store = useInternalVaultContext();
    const undoCoordinator = useVaultUndoCoordinator();
    const sessionRef = useRef<VaultEditSession | null>(null);

    const closeSession = useCallback((disposition: "cancel" | "commit") => {
        const session = sessionRef.current;
        sessionRef.current = null;
        session?.[disposition]();
    }, []);

    const begin = useCallback(() => {
        closeSession("commit");
        sessionRef.current = undoCoordinator.beginEditSession();
    }, [closeSession, undoCoordinator]);
    const commit = useCallback(() => closeSession("commit"), [closeSession]);
    const cancel = useCallback(() => closeSession("cancel"), [closeSession]);
    const update = useCallback(
        (...args: Arguments) => {
            const applyUpdate = (origin: `user:${VaultUserActionKind}`) => {
                store.setState((state: VaultState) => updater(state, ...args), { origin });
            };
            const session = sessionRef.current;
            if (session) {
                session.update(applyUpdate);
                return;
            }
            undoCoordinator.runUserAction("edit", applyUpdate);
        },
        // loro-mirror-react exposes the same dynamic dependency-list contract for action hooks.
        // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
        [store, undoCoordinator, updater, ...dependencies]
    );

    useEffect(
        () => () => {
            const session = sessionRef.current;
            sessionRef.current = null;
            session?.commit();
        },
        [undoCoordinator]
    );

    return { begin, cancel, commit, update };
}

/**
 * Hook to get all people in the vault
 *
 * @example
 * ```tsx
 * const people = usePeople();
 * // Returns Record<string, Person>
 * ```
 */
export function usePeople() {
    return useVaultSelector((state) => state.people);
}

/**
 * Hook to get all accounts in the vault
 */
export function useAccounts() {
    return useVaultSelector((state) => state.accounts);
}

/**
 * Hook to get all tags in the vault
 */
export function useTags() {
    return useVaultSelector((state) => state.tags);
}

/**
 * Hook to get all description aliases in the vault
 */
export function useDescriptionAliases() {
    return useInternalVaultSelector(
        (state): DescriptionAliasCollection =>
            toDescriptionAliasCollection(state.descriptionAliases)
    );
}

/**
 * Hook to get all statuses in the vault
 */
export function useStatuses() {
    return useVaultSelector((state) => state.statuses);
}

/**
 * Hook to get all transactions in the vault
 */
export function useTransactions() {
    return useVaultSelector((state) => state.transactions);
}

/**
 * Hook to get all imports in the vault
 */
export function useImports() {
    return useVaultSelector((state) => state.imports);
}

/**
 * Hook to get all import templates in the vault
 */
export function useImportTemplates() {
    return useVaultSelector((state) => state.importTemplates);
}

/**
 * Hook to get all automations in the vault
 */
export function useAutomations() {
    return useVaultSelector((state) => state.automations);
}

/**
 * Hook to get vault preferences
 */
export function useVaultPreferences() {
    return useVaultSelector((state) => state.preferences);
}

/**
 * Hook to get a specific person by ID
 */
export function usePerson(personId: string) {
    return useVaultSelector((state) => state.people[personId]);
}

/**
 * Hook to get a specific account by ID
 */
export function useAccount(accountId: string) {
    return useVaultSelector((state) => state.accounts[accountId]);
}

/**
 * Hook to get a specific tag by ID
 */
export function useTag(tagId: string) {
    return useVaultSelector((state) => state.tags[tagId]);
}

/**
 * Hook to get a specific transaction by ID.
 * Searches through the hierarchical structure.
 * Note: This is O(n) - prefer using findTransaction with location when possible.
 */
export function useTransaction(transactionId: string) {
    return useVaultSelector((state) => {
        for (const accountId of Object.keys(state.transactions)) {
            const tree = state.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            if (tx.id === transactionId) return tx;
                            // Also check nested duplicates
                            const dup = tx.suspectedDuplicates?.find((d) => d.id === transactionId);
                            if (dup) return dup as unknown as Transaction;
                        }
                    }
                }
            }
        }
        return undefined;
    });
}

/**
 * Hook to get active (non-deleted) people
 */
export function useActivePeople() {
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.people).filter(([, p]) => typeof p === "object" && !p.deletedAt)
        )
    );
}

/**
 * Hook to get active (non-deleted) accounts
 */
export function useActiveAccounts() {
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.accounts).filter(([, a]) => typeof a === "object" && !a.deletedAt)
        )
    );
}

/**
 * Hook to get active (non-deleted) tags
 */
export function useActiveTags() {
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.tags).filter(([, t]) => typeof t === "object" && !t.deletedAt)
        )
    );
}

/**
 * Hook to get active (non-deleted) description aliases
 */
export function useActiveDescriptionAliases() {
    return useInternalVaultSelector((state) =>
        getActiveDescriptionAliases(state.descriptionAliases)
    );
}

/**
 * Hook to get active (non-deleted) transactions from hierarchical structure.
 * Returns a flat array of transactions sorted by date desc.
 */
export function useActiveTransactions() {
    return useVaultSelector((state) => {
        const result: Transaction[] = [];
        for (const accountId of Object.keys(state.transactions)) {
            const tree = state.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            if (!tx.deletedAt) {
                                result.push(tx);
                            }
                        }
                    }
                }
            }
        }
        // Sort by date desc, creationInstant desc, importRowIndex asc
        result.sort((a, b) => {
            const dateCompare = Temporal.PlainDate.compare(b.date, a.date);
            if (dateCompare !== 0) return dateCompare;
            const instantCompare = Temporal.Instant.compare(b.creationInstant, a.creationInstant);
            if (instantCompare !== 0) return instantCompare;
            const aIdx = a.importRowIndex ?? Infinity;
            const bIdx = b.importRowIndex ?? Infinity;
            return aIdx - bIdx;
        });
        return result;
    });
}

/**
 * Hook to get active (non-deleted) imports
 */
export function useActiveImports() {
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.imports).filter(([, i]) => typeof i === "object" && !i.deletedAt)
        )
    );
}

/**
 * Hook to get active (non-deleted) statuses
 */
export function useActiveStatuses() {
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.statuses).filter(([, s]) => typeof s === "object" && !s.deletedAt)
        )
    );
}

// ============================================
// TRANSACTION MUTATION HOOKS
// ============================================

import {
    assignDescriptionAlias as assignAlias,
    assignDescriptionAliasByExactName as assignAliasByExactName,
    changeAllDescriptionAliases as changeAllAliases,
    changeOneDescriptionAlias as changeOneAlias,
    createAndAssignDescriptionAlias as createAndAssignAlias,
    createDescriptionAlias as createAlias,
    deleteDescriptionAliasedTransaction,
    deleteDescriptionAliasedTransactionsByImport,
    removeAllDescriptionAliases as removeAllAliases,
    removeOneDescriptionAlias as removeOneAlias,
    renameDescriptionAlias as renameAlias,
    updateDescriptionAliasedTransaction,
    type AssignDescriptionAliasByExactNameInput,
    type AssignDescriptionAliasInput,
    type ChangeAllDescriptionAliasesInput,
    type ChangeOneDescriptionAliasInput,
    type CreateAndAssignDescriptionAliasInput,
    type RemoveOneDescriptionAliasInput
} from "./description-aliases";
import {
    type DeleteTransactionInput,
    type InsertTransactionInput,
    insertTransaction as insertTx,
    type MoveTransactionInput,
    moveTransaction as moveTx,
    type SwapDuplicateInput,
    swapDuplicate as swapDup,
    type UnnestDuplicateInput,
    type UpdateTransactionInput,
    unnestDuplicate as unnestDup
} from "./mutations";

/**
 * Hook providing transaction mutation actions.
 * Uses useVaultAction for memoized callbacks that work with the hierarchical structure.
 */
export function useTransactionActions() {
    const insertTransaction = useInternalVaultAction(
        (state, input: InsertTransactionInput) => {
            insertTx(state.transactions, input);
        },
        [],
        "add"
    );

    const updateTransaction = useInternalVaultAction(
        (state, input: UpdateTransactionInput) => updateDescriptionAliasedTransaction(state, input),
        [],
        "edit"
    );

    const moveTransaction = useInternalVaultAction(
        (state, input: MoveTransactionInput) => {
            moveTx(state.transactions, input);
        },
        [],
        "edit"
    );

    const deleteTransaction = useInternalVaultAction(
        (state, input: DeleteTransactionInput) => deleteDescriptionAliasedTransaction(state, input),
        [],
        "delete"
    );

    const unnestDuplicate = useInternalVaultAction(
        (state, input: UnnestDuplicateInput) => {
            unnestDup(state.transactions, input);
        },
        [],
        "edit"
    );

    const swapDuplicate = useInternalVaultAction(
        (state, input: SwapDuplicateInput) => {
            swapDup(state.transactions, input);
        },
        [],
        "edit"
    );

    const deleteTransactionsByImport = useInternalVaultAction(
        (state, importId: string) => deleteDescriptionAliasedTransactionsByImport(state, importId),
        [],
        "delete"
    );

    return {
        insertTransaction,
        updateTransaction,
        moveTransaction,
        deleteTransaction,
        unnestDuplicate,
        swapDuplicate,
        deleteTransactionsByImport
    };
}

/**
 * Hook providing description alias mutation actions.
 */
export function useDescriptionAliasActions() {
    const createDescriptionAlias = useInternalVaultAction(
        (state, input: { readonly aliasId: string; readonly name: string }) =>
            createAlias(state, input),
        [],
        "alias"
    );

    const assignDescriptionAlias = useInternalVaultAction(
        (state, input: AssignDescriptionAliasInput) => assignAlias(state, input),
        [],
        "alias"
    );
    const createAndAssignDescriptionAlias = useInternalVaultAction(
        (state, input: CreateAndAssignDescriptionAliasInput) => createAndAssignAlias(state, input),
        [],
        "alias"
    );
    const assignDescriptionAliasByExactName = useInternalVaultAction(
        (state, input: AssignDescriptionAliasByExactNameInput) =>
            assignAliasByExactName(state, input),
        [],
        "alias"
    );
    const renameDescriptionAlias = useInternalVaultAction(
        (state, input: { readonly aliasId: string; readonly name: string }) =>
            renameAlias(state, input),
        [],
        "alias"
    );
    const changeOneDescriptionAlias = useInternalVaultAction(
        (state, input: ChangeOneDescriptionAliasInput) => changeOneAlias(state, input),
        [],
        "alias"
    );
    const changeAllDescriptionAliases = useInternalVaultAction(
        (state, input: ChangeAllDescriptionAliasesInput) => changeAllAliases(state, input),
        [],
        "alias"
    );
    const removeOneDescriptionAlias = useInternalVaultAction(
        (state, input: RemoveOneDescriptionAliasInput) => removeOneAlias(state, input),
        [],
        "alias"
    );
    const removeAllDescriptionAliases = useInternalVaultAction(
        (state, aliasId: string) => removeAllAliases(state, aliasId),
        [],
        "alias"
    );

    return {
        createDescriptionAlias,
        assignDescriptionAlias,
        createAndAssignDescriptionAlias,
        assignDescriptionAliasByExactName,
        renameDescriptionAlias,
        changeOneDescriptionAlias,
        changeAllDescriptionAliases,
        removeOneDescriptionAlias,
        removeAllDescriptionAliases
    };
}

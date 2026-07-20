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

import type { Transaction, VaultState } from "./schema";
import { vaultSchema } from "./schema";
import type { VaultEditSession, VaultUserActionKind } from "./undo";
import { useVaultUndoCoordinator } from "./undo";

/**
 * Create typed context and hooks for vault state management.
 *
 * Exports:
 * - VaultProvider: Wrap your app to provide vault state
 * - useVaultContext: Access the underlying Mirror instance
 * - useVaultState: Get [state, setState] tuple for full state access
 * - useVaultSelector: Subscribe to specific state slices (efficient)
 * - useVaultAction: Create memoized mutation callbacks
 */
const loroContext = createLoroContext(vaultSchema);

export const VaultContext = loroContext.LoroContext;
export const VaultProvider = loroContext.LoroProvider;
export const useVaultContext = loroContext.useLoroContext;
export const useVaultState = loroContext.useLoroState;
export const useVaultSelector = loroContext.useLoroSelector;

/** Creates a memoized user mutation with explicit origin and undo grouping metadata. */
export function useVaultAction<Arguments extends unknown[]>(
    updater: (state: VaultState, ...args: Arguments) => void,
    dependencies: DependencyList = [],
    kind: VaultUserActionKind = "mutation"
): (...args: Arguments) => void {
    const store = useVaultContext();
    const undoCoordinator = useVaultUndoCoordinator();

    return useCallback(
        (...args: Arguments) => {
            undoCoordinator.runUserAction(kind, (origin) => {
                store.setState((state: VaultState) => updater(state, ...args), { origin });
            });
        },
        // loro-mirror-react exposes the same dynamic dependency-list contract for action hooks.
        // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
        [store, undoCoordinator, updater, kind, ...dependencies]
    );
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
    updater: (state: VaultState, ...args: Arguments) => void,
    dependencies: DependencyList = []
): VaultEditAction<Arguments> {
    const store = useVaultContext();
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
    return useVaultSelector((state) => state.descriptionAliases);
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
    return useVaultSelector((state) =>
        Object.fromEntries(
            Object.entries(state.descriptionAliases).filter(
                ([, a]) => typeof a === "object" && !a.deletedAt
            )
        )
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
    type AssignDescriptionAliasByExactNameInput,
    type AssignDescriptionAliasInput,
    type ChangeAllDescriptionAliasesInput,
    type ChangeOneDescriptionAliasInput,
    type CreateAndAssignDescriptionAliasInput,
    type RemoveOneDescriptionAliasInput
} from "./description-aliases";
import {
    type DeleteTransactionInput,
    findTransactionInStore,
    type InsertTransactionInput,
    insertTransaction as insertTx,
    type MoveTransactionInput,
    moveTransaction as moveTx,
    type SwapDuplicateInput,
    swapDuplicate as swapDup,
    type UnnestDuplicateInput,
    type UpdateTransactionInput,
    unnestDuplicate as unnestDup,
    updateTransaction as updateTx
} from "./mutations";

/**
 * Hook providing transaction mutation actions.
 * Uses useVaultAction for memoized callbacks that work with the hierarchical structure.
 */
export function useTransactionActions() {
    const insertTransaction = useVaultAction(
        (state, input: InsertTransactionInput) => {
            insertTx(state.transactions, input);
        },
        [],
        "add"
    );

    const updateTransaction = useVaultAction(
        (state, input: UpdateTransactionInput) => {
            if ("descriptionAliasId" in input.updates) {
                const transaction = findTransactionInStore(state.transactions, input.location);
                const currentAliasId = transaction?.descriptionAliasId;
                const requestedAliasId = input.updates.descriptionAliasId;
                if (requestedAliasId) {
                    assignAlias(state, { location: input.location, aliasId: requestedAliasId });
                } else if (currentAliasId) {
                    removeOneAlias(state, {
                        location: input.location,
                        expectedAliasId: currentAliasId
                    });
                }
            }
            updateTx(state.transactions, input);
        },
        [],
        "edit"
    );

    const moveTransaction = useVaultAction(
        (state, input: MoveTransactionInput) => {
            moveTx(state.transactions, input);
        },
        [],
        "edit"
    );

    const deleteTransaction = useVaultAction(
        (state, input: DeleteTransactionInput) => {
            deleteDescriptionAliasedTransaction(state, input);
        },
        [],
        "delete"
    );

    const unnestDuplicate = useVaultAction(
        (state, input: UnnestDuplicateInput) => {
            unnestDup(state.transactions, input);
        },
        [],
        "edit"
    );

    const swapDuplicate = useVaultAction(
        (state, input: SwapDuplicateInput) => {
            swapDup(state.transactions, input);
        },
        [],
        "edit"
    );

    const deleteTransactionsByImport = useVaultAction(
        (state, importId: string) => {
            deleteDescriptionAliasedTransactionsByImport(state, importId);
        },
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

// ============================================
// DESCRIPTION ALIAS MUTATION HOOKS
// ============================================

import type { DescriptionAliasInput } from "./schema";

/**
 * Hook providing description alias mutation actions.
 */
export function useDescriptionAliasActions() {
    const addAlias = useVaultAction(
        (state, alias: DescriptionAliasInput) => {
            return createAlias(state, { aliasId: alias.id, name: alias.name });
        },
        [],
        "alias"
    );

    const updateAlias = useVaultAction(
        (state, input: { id: string; updates: Partial<DescriptionAliasInput> }) => {
            if (input.updates.name != null) {
                renameAlias(state, { aliasId: input.id, name: input.updates.name });
            } else if (input.updates.targetAliasId && input.updates.symlinkIds != null) {
                // Compatibility bridge for the existing transaction page's final change-all call.
                // Earlier backlink-plan calls are ignored; this one applies the complete graph
                // transformation atomically. P11B will move that page to the named action directly.
                changeAllAliases(state, {
                    sourceAliasId: input.id,
                    target: { kind: "existing", aliasId: input.updates.targetAliasId }
                });
            }
        },
        [],
        "alias"
    );

    const deleteAlias = useVaultAction(
        (state, id: string) => {
            return removeAllAliases(state, id);
        },
        [],
        "alias"
    );

    const assignDescriptionAlias = useVaultAction(
        (state, input: AssignDescriptionAliasInput) => assignAlias(state, input),
        [],
        "alias"
    );
    const createAndAssignDescriptionAlias = useVaultAction(
        (state, input: CreateAndAssignDescriptionAliasInput) => createAndAssignAlias(state, input),
        [],
        "alias"
    );
    const assignDescriptionAliasByExactName = useVaultAction(
        (state, input: AssignDescriptionAliasByExactNameInput) =>
            assignAliasByExactName(state, input),
        [],
        "alias"
    );
    const renameDescriptionAlias = useVaultAction(
        (state, input: { readonly aliasId: string; readonly name: string }) =>
            renameAlias(state, input),
        [],
        "alias"
    );
    const changeOneDescriptionAlias = useVaultAction(
        (state, input: ChangeOneDescriptionAliasInput) => changeOneAlias(state, input),
        [],
        "alias"
    );
    const changeAllDescriptionAliases = useVaultAction(
        (state, input: ChangeAllDescriptionAliasesInput) => changeAllAliases(state, input),
        [],
        "alias"
    );
    const removeOneDescriptionAlias = useVaultAction(
        (state, input: RemoveOneDescriptionAliasInput) => removeOneAlias(state, input),
        [],
        "alias"
    );
    const removeAllDescriptionAliases = useVaultAction(
        (state, aliasId: string) => removeAllAliases(state, aliasId),
        [],
        "alias"
    );

    return {
        addAlias,
        updateAlias,
        deleteAlias,
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

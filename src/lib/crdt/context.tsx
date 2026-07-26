"use client";

/**
 * Loro Mirror React Context
 *
 * Provides React context and hooks for accessing vault state using loro-mirror-react.
 * Use this for reactive, type-safe access to vault data throughout the app.
 */

import { createLoroContext } from "loro-mirror-react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef
} from "react";
import { useSyncExternalStore } from "react";
import type { ComponentProps, DependencyList } from "react";
import { Temporal } from "temporal-polyfill";

import { type RememberedRuleChoice } from "@/lib/domain/automation/preferences";
import { type FieldRule } from "@/lib/domain/automation/rules";
import {
    getActiveDescriptionAliases,
    toDescriptionAliasCollection,
    type DescriptionAliasCollection
} from "@/lib/domain/description-aliases";

import {
    type CreateFieldRuleInput,
    createFieldRule,
    type DeleteFieldRuleInput,
    deleteFieldRule,
    type FieldRuleMutationResult,
    persistUserAutomationPreference,
    type PersistUserAutomationPreferenceInput,
    readUserAutomationChoice,
    type UpdateFieldRuleInput,
    updateFieldRule
} from "./field-rule-mutations";
import {
    applyFieldRulesToAllTransactions,
    applyFieldRulesToNewerTransactions,
    type BulkFieldRuleEntry,
    readActiveFieldRules
} from "./field-rules";
import { commitImportBatch, type CommitImportBatchInput } from "./import-commit";
import { startVaultMaintenanceScheduler } from "./maintenance";
import type { VaultMirror } from "./mirror";
import { getActivePublicTransactionIdentities, getAllTransactions } from "./queries";
import {
    getTransactionMaintenanceShadowIdentity,
    isPublicTransaction,
    vaultSchema
} from "./schema";
import type {
    AccountTransactionTree,
    DayBucket,
    MonthBucket,
    NestedDuplicate,
    Transaction,
    VaultState,
    YearBucket
} from "./schema";
import type { VaultEditSession, VaultUserActionKind } from "./undo";
import { useVaultUndoCoordinator } from "./undo";

/**
 * Create typed context and hooks for vault state management.
 *
 * Public generic hooks see application state with raw alias wire data omitted. Alias consumers use
 * the legal selector and named action hooks below.
 */
const loroContext = createLoroContext(vaultSchema);

const useInternalVaultContext = loroContext.useLoroContext;
const useInternalVaultSelector = loroContext.useLoroSelector;
const LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY = "__moneyflow_gc_metadata__";

interface DescriptionAliasRevisionStore {
    readonly getAliases: (
        state: VaultState,
        expectedRevision: number
    ) => DescriptionAliasCollection;
    readonly getSnapshot: () => number;
    readonly start: () => () => void;
    readonly subscribe: (listener: () => void) => () => void;
}

const DescriptionAliasRevisionContext = createContext<DescriptionAliasRevisionStore | null>(null);

type DescriptionAliasDocument = ComponentProps<typeof loroContext.LoroProvider>["doc"];
type DocumentFrontiers = ReturnType<DescriptionAliasDocument["frontiers"]>;

function hasDescriptionAliasChanges(
    doc: DescriptionAliasDocument,
    from: DocumentFrontiers,
    to: DocumentFrontiers
): boolean {
    return doc
        .diff(from, to, false)
        .some(([containerId]) => doc.getPathToContainer(containerId)?.[0] === "descriptionAliases");
}

function createDescriptionAliasRevisionStore(
    doc: DescriptionAliasDocument
): DescriptionAliasRevisionStore {
    let revision = 0;
    let observedFrontiers = doc.frontiers();
    let unsubscribe: (() => void) | undefined;
    let cached:
        | { readonly aliases: DescriptionAliasCollection; readonly revision: number }
        | undefined;
    const listeners = new Set<() => void>();
    const notify = () => {
        revision += 1;
        for (const listener of listeners) listener();
    };
    return {
        getAliases: (state, expectedRevision) => {
            if (expectedRevision !== revision) {
                throw new Error("Description alias revision changed during render");
            }
            if (cached?.revision === revision) return cached.aliases;
            const aliases = toDescriptionAliasCollection(state.descriptionAliases);
            cached = { aliases, revision };
            observedFrontiers = doc.frontiers();
            return aliases;
        },
        getSnapshot: () => revision,
        start: () => {
            if (unsubscribe) throw new Error("Description alias observer is already active");
            const previouslyObservedFrontiers = observedFrontiers;
            const stop = doc.subscribe((event) => {
                observedFrontiers = event.to;
                if (event.events.some((item) => item.path[0] === "descriptionAliases")) notify();
            });
            unsubscribe = stop;

            const currentFrontiers = doc.frontiers();
            observedFrontiers = currentFrontiers;
            if (hasDescriptionAliasChanges(doc, previouslyObservedFrontiers, currentFrontiers)) {
                notify();
            }

            return () => {
                if (unsubscribe !== stop) return;
                unsubscribe = undefined;
                stop();
            };
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }
    };
}

function VaultMaintenanceOwner({ doc }: { readonly doc: DescriptionAliasDocument }) {
    const store = useInternalVaultContext();
    useLayoutEffect(
        () =>
            startVaultMaintenanceScheduler({
                doc,
                store,
                host: {
                    cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
                    isVisible: () => document.visibilityState !== "hidden",
                    now: () => performance.now(),
                    requestFrame: (callback) => window.requestAnimationFrame(callback),
                    subscribeVisibility: (listener) => {
                        document.addEventListener("visibilitychange", listener);
                        return () => document.removeEventListener("visibilitychange", listener);
                    }
                }
            }),
        [doc, store]
    );
    return null;
}

/** Provide Mirror plus provider/document-lifetime alias and maintenance observers. */
export function VaultProvider(props: ComponentProps<typeof loroContext.LoroProvider>) {
    const aliasRevisionStore = useMemo(
        () => createDescriptionAliasRevisionStore(props.doc),
        [props.doc]
    );
    useLayoutEffect(() => aliasRevisionStore.start(), [aliasRevisionStore]);
    return (
        <DescriptionAliasRevisionContext.Provider value={aliasRevisionStore}>
            <loroContext.LoroProvider {...props}>
                <VaultMaintenanceOwner doc={props.doc} />
                {props.children}
            </loroContext.LoroProvider>
        </DescriptionAliasRevisionContext.Provider>
    );
}

export type ApplicationVaultState = Omit<VaultState, "descriptionAliases">;

const publicTransactionStores = new WeakMap<
    VaultState["transactions"],
    VaultState["transactions"]
>();
const publicAccountTrees = new WeakMap<AccountTransactionTree, AccountTransactionTree>();
const publicYearLists = new WeakMap<YearBucket[], YearBucket[]>();
const publicYears = new WeakMap<YearBucket, YearBucket>();
const publicMonthLists = new WeakMap<MonthBucket[], MonthBucket[]>();
const publicMonths = new WeakMap<MonthBucket, MonthBucket>();
const publicDayLists = new WeakMap<DayBucket[], DayBucket[]>();
const publicDays = new WeakMap<DayBucket, DayBucket>();
const publicTransactionLists = new WeakMap<Transaction[], Transaction[]>();
const publicTransactions = new WeakMap<Transaction, Transaction>();
const publicNestedDuplicateLists = new WeakMap<NestedDuplicate[], NestedDuplicate[]>();
const applicationVaultStates = new WeakMap<VaultState, ApplicationVaultState>();

function arrayIndex(property: string | symbol): number | undefined {
    if (typeof property !== "string" || property === "") return undefined;
    const index = Number(property);
    if (!Number.isSafeInteger(index) || index < 0 || String(index) !== property) return undefined;
    return index;
}

function projectArray<Item>(
    items: Item[],
    cache: WeakMap<Item[], Item[]>,
    project: (item: Item) => Item
): Item[] {
    const cached = cache.get(items);
    if (cached) return cached;
    const projected = new Proxy(items, {
        get: (target, property, receiver) => {
            const index = arrayIndex(property);
            return index == null ? Reflect.get(target, property, receiver) : project(target[index]);
        },
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            const index = arrayIndex(property);
            if (index == null || !descriptor || !("value" in descriptor)) return descriptor;
            return { ...descriptor, value: project(target[index]) };
        }
    });
    cache.set(items, projected);
    return projected;
}

function normalizedSpliceStart(start: number, length: number): number {
    const integer = Math.trunc(start);
    return integer < 0 ? Math.max(length + integer, 0) : Math.min(integer, length);
}

function normalizedDeleteCount(
    deleteCount: number | undefined,
    start: number,
    length: number
): number {
    if (deleteCount == null) return length - start;
    return Math.min(Math.max(Math.trunc(deleteCount), 0), length - start);
}

/**
 * Map one explicitly accessed list to public indices. Draft writes are translated back to the
 * source list so generic actions keep Mirror mutation semantics without revealing private entries.
 */
function projectFilteredArray<Item>(
    items: Item[],
    cache: WeakMap<Item[], Item[]>,
    isPublic: (item: Item) => boolean,
    project: (item: Item) => Item
): Item[] {
    const cached = cache.get(items);
    if (cached) return cached;
    let visibleIndices: number[] | undefined;
    const indices = () => {
        if (visibleIndices) return visibleIndices;
        visibleIndices = [];
        for (let index = 0; index < items.length; index += 1) {
            if (isPublic(items[index])) visibleIndices.push(index);
        }
        return visibleIndices;
    };
    const invalidate = () => {
        visibleIndices = undefined;
    };
    const splice = (start: number, deleteCount?: number, ...inserted: Item[]) => {
        const currentIndices = indices();
        const visibleStart = normalizedSpliceStart(start, currentIndices.length);
        const count = normalizedDeleteCount(deleteCount, visibleStart, currentIndices.length);
        const removedIndices = currentIndices.slice(visibleStart, visibleStart + count);
        const removed = removedIndices.map((index) => project(items[index]));
        const initialInsertionIndex = currentIndices[visibleStart] ?? items.length;
        let insertionIndex = initialInsertionIndex;
        for (const index of removedIndices.toReversed()) {
            items.splice(index, 1);
            if (index < initialInsertionIndex) insertionIndex -= 1;
        }
        items.splice(insertionIndex, 0, ...inserted);
        invalidate();
        return removed;
    };
    const push = (...inserted: Item[]) => {
        items.push(...inserted);
        invalidate();
        return indices().length;
    };
    const projected = new Proxy(items, {
        deleteProperty: (target, property) => {
            const index = arrayIndex(property);
            if (index == null) return Reflect.deleteProperty(target, property);
            const sourceIndex = indices()[index];
            if (sourceIndex == null) return true;
            target.splice(sourceIndex, 1);
            invalidate();
            return true;
        },
        get: (target, property, receiver) => {
            if (property === "length") return indices().length;
            if (property === "push") return push;
            if (property === "splice") return splice;
            const index = arrayIndex(property);
            if (index == null) return Reflect.get(target, property, receiver);
            const sourceIndex = indices()[index];
            return sourceIndex == null ? undefined : project(target[sourceIndex]);
        },
        getOwnPropertyDescriptor: (target, property) => {
            if (property === "length") {
                const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
                return descriptor ? { ...descriptor, value: indices().length } : descriptor;
            }
            const index = arrayIndex(property);
            if (index == null) return Reflect.getOwnPropertyDescriptor(target, property);
            const sourceIndex = indices()[index];
            if (sourceIndex == null) return undefined;
            const descriptor = Reflect.getOwnPropertyDescriptor(target, String(sourceIndex));
            return descriptor && "value" in descriptor
                ? { ...descriptor, value: project(target[sourceIndex]) }
                : descriptor;
        },
        has: (target, property) => {
            const index = arrayIndex(property);
            return index == null ? Reflect.has(target, property) : index < indices().length;
        },
        ownKeys: (target) => [
            ...indices().map(String),
            ...Reflect.ownKeys(target).filter((property) => arrayIndex(property) == null)
        ],
        set: (target, property, value, receiver) => {
            if (property === "length" && typeof value === "number") {
                const removedIndices = indices().slice(Math.max(Math.trunc(value), 0));
                for (const index of removedIndices.toReversed()) target.splice(index, 1);
                invalidate();
                return true;
            }
            const index = arrayIndex(property);
            if (index == null) return Reflect.set(target, property, value, receiver);
            const sourceIndex = indices()[index];
            if (sourceIndex != null) {
                const updated = Reflect.set(target, String(sourceIndex), value);
                invalidate();
                return updated;
            }
            if (index !== indices().length) return false;
            target.push(value);
            invalidate();
            return true;
        }
    });
    cache.set(items, projected);
    return projected;
}

function projectPublicTransaction(transaction: Transaction): Transaction {
    const cached = publicTransactions.get(transaction);
    if (cached) return cached;
    const projected = new Proxy(transaction, {
        get: (target, property, receiver) =>
            property === "suspectedDuplicates"
                ? projectFilteredArray(
                      target.suspectedDuplicates,
                      publicNestedDuplicateLists,
                      (duplicate) => getTransactionMaintenanceShadowIdentity(duplicate) == null,
                      (duplicate) => duplicate
                  )
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "suspectedDuplicates" || !descriptor || !("value" in descriptor)) {
                return descriptor;
            }
            return {
                ...descriptor,
                value: projectFilteredArray(
                    target.suspectedDuplicates,
                    publicNestedDuplicateLists,
                    (duplicate) => getTransactionMaintenanceShadowIdentity(duplicate) == null,
                    (duplicate) => duplicate
                )
            };
        }
    });
    publicTransactions.set(transaction, projected);
    return projected;
}

function projectPublicDay(day: DayBucket): DayBucket {
    const cached = publicDays.get(day);
    if (cached) return cached;
    const projected = new Proxy(day, {
        get: (target, property, receiver) =>
            property === "transactions"
                ? projectFilteredArray(
                      target.transactions,
                      publicTransactionLists,
                      isPublicTransaction,
                      projectPublicTransaction
                  )
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "transactions" || !descriptor || !("value" in descriptor)) {
                return descriptor;
            }
            return {
                ...descriptor,
                value: projectFilteredArray(
                    target.transactions,
                    publicTransactionLists,
                    isPublicTransaction,
                    projectPublicTransaction
                )
            };
        }
    });
    publicDays.set(day, projected);
    return projected;
}

function projectPublicMonth(month: MonthBucket): MonthBucket {
    const cached = publicMonths.get(month);
    if (cached) return cached;
    const projected = new Proxy(month, {
        get: (target, property, receiver) =>
            property === "days"
                ? projectArray(target.days, publicDayLists, projectPublicDay)
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "days" || !descriptor || !("value" in descriptor)) return descriptor;
            return {
                ...descriptor,
                value: projectArray(target.days, publicDayLists, projectPublicDay)
            };
        }
    });
    publicMonths.set(month, projected);
    return projected;
}

function projectPublicYear(year: YearBucket): YearBucket {
    const cached = publicYears.get(year);
    if (cached) return cached;
    const projected = new Proxy(year, {
        get: (target, property, receiver) =>
            property === "months"
                ? projectArray(target.months, publicMonthLists, projectPublicMonth)
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "months" || !descriptor || !("value" in descriptor)) {
                return descriptor;
            }
            return {
                ...descriptor,
                value: projectArray(target.months, publicMonthLists, projectPublicMonth)
            };
        }
    });
    publicYears.set(year, projected);
    return projected;
}

function projectPublicAccountTree(tree: AccountTransactionTree): AccountTransactionTree {
    const cached = publicAccountTrees.get(tree);
    if (cached) return cached;
    const projected = new Proxy(tree, {
        get: (target, property, receiver) =>
            property === "years"
                ? projectArray(target.years, publicYearLists, projectPublicYear)
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "years" || !descriptor || !("value" in descriptor)) return descriptor;
            return {
                ...descriptor,
                value: projectArray(target.years, publicYearLists, projectPublicYear)
            };
        }
    });
    publicAccountTrees.set(tree, projected);
    return projected;
}

function projectPublicTransactionStore(
    transactions: VaultState["transactions"]
): VaultState["transactions"] {
    const cached = publicTransactionStores.get(transactions);
    if (cached) return cached;
    // Account and reserved-key reads stop here; deeper lists are projected only when traversed.
    const projected = new Proxy(transactions, {
        get: (target, property, receiver) => {
            if (property === LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY) return undefined;
            const tree = Reflect.get(target, property, receiver);
            return typeof tree === "object" && tree != null ? projectPublicAccountTree(tree) : tree;
        },
        getOwnPropertyDescriptor: (target, property) => {
            if (property === LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY) return undefined;
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (!descriptor || !("value" in descriptor)) return descriptor;
            const tree = descriptor.value;
            return {
                ...descriptor,
                value:
                    typeof tree === "object" && tree != null ? projectPublicAccountTree(tree) : tree
            };
        },
        has: (target, property) =>
            property !== LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY && Reflect.has(target, property),
        ownKeys: (target) =>
            Reflect.ownKeys(target).filter(
                (property) => property !== LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY
            )
    });
    publicTransactionStores.set(transactions, projected);
    return projected;
}

function projectApplicationVaultState(state: VaultState): ApplicationVaultState {
    const cached = applicationVaultStates.get(state);
    if (cached) return cached;
    const projected = new Proxy(state, {
        get: (target, property, receiver) =>
            property === "transactions"
                ? projectPublicTransactionStore(target.transactions)
                : Reflect.get(target, property, receiver),
        getOwnPropertyDescriptor: (target, property) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
            if (property !== "transactions" || !descriptor || !("value" in descriptor)) {
                return descriptor;
            }
            return {
                ...descriptor,
                value: projectPublicTransactionStore(target.transactions)
            };
        }
    });
    applicationVaultStates.set(state, projected);
    return projected;
}

/** Select from the ordinary application state; raw alias wire records are deliberately absent. */
export function useVaultSelector<Selected>(
    selector: (state: ApplicationVaultState) => Selected
): Selected {
    return useInternalVaultSelector((state) => selector(projectApplicationVaultState(state)));
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
    return useInternalVaultAction(
        (state, ...args) => updater(projectApplicationVaultState(state), ...args),
        dependencies,
        kind
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
                store.setState(
                    (state: VaultState) => updater(projectApplicationVaultState(state), ...args),
                    { origin }
                );
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

/** Hook to get a legal alias snapshot once per alias-container revision. */
export function useDescriptionAliases() {
    const mirror = useInternalVaultContext();
    const revisionStore = useContext(DescriptionAliasRevisionContext);
    if (!revisionStore)
        throw new Error("useDescriptionAliases must be used within a VaultProvider");
    const revision = useSyncExternalStore(
        revisionStore.subscribe,
        revisionStore.getSnapshot,
        revisionStore.getSnapshot
    );
    return revisionStore.getAliases(mirror.getState(), revision);
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
    const transactions = useVaultSelector((state) => state.transactions);
    return useMemo(() => {
        if (!(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY in transactions)) return transactions;
        const visibleTransactions = { ...transactions };
        delete visibleTransactions[LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY];
        return visibleTransactions;
    }, [transactions]);
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
                            if (!isPublicTransaction(tx)) continue;
                            if (tx.id === transactionId) return tx;
                            // Also check nested duplicates of public parents.
                            const duplicate = tx.suspectedDuplicates?.find(
                                (candidate) => candidate.id === transactionId
                            );
                            if (duplicate) return duplicate as unknown as Transaction;
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
    return useVaultSelector((state) =>
        getAllTransactions(state.transactions).filter((transaction) => !transaction.deletedAt)
    );
}

/**
 * Hook for active canonical parent and nested logical transaction identities.
 *
 * This broader identity projection is intentionally separate from the parent-only transaction-grid
 * contract exposed by useActiveTransactions.
 */
export function useActivePublicTransactionIdentities() {
    return useVaultSelector((state) => getActivePublicTransactionIdentities(state.transactions));
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
    insertManualDescriptionAliasedTransaction as insertManualAliasedTransaction,
    removeAllDescriptionAliases as removeAllAliases,
    removeOneDescriptionAlias as removeOneAlias,
    renameDescriptionAlias as renameAlias,
    updateDescriptionAliasedTransaction,
    type AssignDescriptionAliasByExactNameInput,
    type AssignDescriptionAliasInput,
    type ChangeAllDescriptionAliasesInput,
    type ChangeOneDescriptionAliasInput,
    type CreateAndAssignDescriptionAliasInput,
    type InsertManualDescriptionAliasedTransactionInput,
    type RemoveOneDescriptionAliasInput
} from "./description-aliases";
import {
    type DeleteTransactionInput,
    type InsertTransactionInput,
    insertTransaction as insertTx,
    type MoveTransactionInput,
    moveTransaction as moveTx,
    type ReplaceTransactionAllocationsInput,
    replaceTransactionAllocations as replaceAllocations,
    type SetTransactionAllocationInput,
    setTransactionAllocation as setAllocation,
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

    const setTransactionAllocation = useInternalVaultAction(
        (state, input: SetTransactionAllocationInput) => setAllocation(state.transactions, input),
        [],
        "edit"
    );

    const replaceTransactionAllocations = useInternalVaultAction(
        (state, input: ReplaceTransactionAllocationsInput) =>
            replaceAllocations(state.transactions, input),
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
        replaceTransactionAllocations,
        setTransactionAllocation,
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
    const insertManualDescriptionAliasedTransaction = useInternalVaultAction(
        (state, input: InsertManualDescriptionAliasedTransactionInput) =>
            insertManualAliasedTransaction(state, input),
        [],
        "add"
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
        insertManualDescriptionAliasedTransaction,
        renameDescriptionAlias,
        changeOneDescriptionAlias,
        changeAllDescriptionAliases,
        removeOneDescriptionAlias,
        removeAllDescriptionAliases
    };
}

/**
 * Import-commit action (P14 batch insert + HS-007/P17A field-rule application).
 *
 * Runs on the full VaultState — not the application projection — so one grouped, undoable mutation
 * can both create the import batch and apply the winning field rule to each imported transaction,
 * including description-alias rules that write through the P11 alias boundary. That boundary needs
 * the `descriptionAliases` collection which {@link ApplicationVaultState} deliberately omits, so a
 * generic `useVaultAction` cannot reach it. This is a named internal action, added additively: the
 * ApplicationVaultState projection stays intact for every other caller.
 */
export function useCommitImportBatch(): (
    input: CommitImportBatchInput
) => readonly BulkFieldRuleEntry[] {
    return useInternalVaultAction(
        (state, input: CommitImportBatchInput) => commitImportBatch(state, input),
        [],
        "import"
    );
}

// ============================================================================
// HS-007 / P17B: field-rule management (shared editor) hooks
// ============================================================================

/**
 * The active (non-deleted, valid) field rules for the shared automations editor. Runs on the full
 * VaultState (the `fieldRules` collection is present on both, but reusing the P17A reader keeps a
 * single decode/precedence source of truth).
 */
export function useActiveFieldRules(): readonly FieldRule[] {
    return useInternalVaultSelector((state) => readActiveFieldRules(state));
}

/** Create/update/delete callbacks for field rules, each one grouped undo step. */
export interface FieldRuleActions {
    readonly create: (input: CreateFieldRuleInput) => FieldRuleMutationResult;
    readonly update: (input: UpdateFieldRuleInput) => FieldRuleMutationResult;
    readonly remove: (input: DeleteFieldRuleInput) => FieldRuleMutationResult;
}

/**
 * Field-rule CRUD actions. Each mutation is a single undoable group and returns the typed result so
 * the editor can surface duplicate-key / validation failures without a partial write.
 */
export function useFieldRuleActions(): FieldRuleActions {
    const create = useInternalVaultAction(
        (state, input: CreateFieldRuleInput) => createFieldRule(state, input),
        []
    );
    const update = useInternalVaultAction(
        (state, input: UpdateFieldRuleInput) => updateFieldRule(state, input),
        []
    );
    const remove = useInternalVaultAction(
        (state, input: DeleteFieldRuleInput) => deleteFieldRule(state, input),
        []
    );
    return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}

/**
 * Apply-all / apply-new actions. These route EXCLUSIVELY through the P17A engine
 * (`applyFieldRules*`), so allocation writes stay P16C-only and description-alias writes stay on the
 * P11 boundary. Runs on the full VaultState so alias application can reach `descriptionAliases`.
 */
export interface ApplyFieldRuleActions {
    readonly applyAll: () => readonly BulkFieldRuleEntry[];
    readonly applyNewerThan: (referenceDate: Temporal.PlainDate) => readonly BulkFieldRuleEntry[];
}

export function useApplyFieldRules(): ApplyFieldRuleActions {
    const applyAll = useInternalVaultAction(
        (state) => applyFieldRulesToAllTransactions(state),
        [],
        "mutation"
    );
    const applyNewerThan = useInternalVaultAction(
        (state, referenceDate: Temporal.PlainDate) =>
            applyFieldRulesToNewerTransactions(state, { referenceDate }),
        [],
        "mutation"
    );
    return useMemo(() => ({ applyAll, applyNewerThan }), [applyAll, applyNewerThan]);
}

/** Read a user's remembered editor choice (defaults applied). */
export function useUserAutomationChoice(pubkeyHash: string | null): RememberedRuleChoice {
    return useInternalVaultSelector((state) => readUserAutomationChoice(state, pubkeyHash ?? ""));
}

/** Persist a user's last-used editor choice for `pubkeyHash`. */
export function usePersistAutomationPreference(): (
    input: PersistUserAutomationPreferenceInput
) => void {
    return useInternalVaultAction(
        (state, input: PersistUserAutomationPreferenceInput) =>
            persistUserAutomationPreference(state, input),
        []
    );
}

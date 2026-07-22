"use client";

import { UndoManager } from "loro-crdt";
import type { LoroDoc, LoroEventBatch } from "loro-crdt";
import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export type VaultUserActionKind =
    | "add"
    | "alias"
    | "bulk"
    | "delete"
    | "edit"
    | "import"
    | "mutation";

export type VaultSystemOriginKind =
    | "gc"
    | "hydration"
    | "maintenance"
    | "migration"
    | "remote"
    | "sync";

export type VaultUserOrigin = `user:${VaultUserActionKind}`;
export type VaultSystemOrigin = `system:${VaultSystemOriginKind}`;

export const VAULT_USER_ORIGIN_PREFIX = "user:";
export const VAULT_SYSTEM_ORIGIN_PREFIX = "system:";

const EXCLUDED_ORIGIN_PREFIXES: VaultSystemOrigin[] = [
    "system:gc",
    "system:hydration",
    "system:maintenance",
    "system:migration",
    "system:remote",
    "system:sync"
];

export interface VaultUndoSnapshot {
    canRedo: boolean;
    canUndo: boolean;
}

export interface VaultEditSession {
    /** Ends the history boundary while retaining every immediate CRDT commit. */
    cancel: () => void;
    /** Completes the edit and closes its single history boundary. */
    commit: () => void;
    /** Applies one input-event mutation inside this edit's history boundary. */
    update: <Result>(operation: (origin: VaultUserOrigin) => Result) => Result;
}

type VaultUndoListener = () => void;
type VaultAliasHistoryListener = () => void;
type ActiveUndoGroup =
    | { readonly kind: "action"; readonly id: number }
    | { readonly kind: "edit"; readonly id: number };

const EMPTY_UNDO_SNAPSHOT: VaultUndoSnapshot = {
    canRedo: false,
    canUndo: false
};

export interface VaultAliasHistoryFrontier {
    readonly has: (aliasId: string) => boolean;
    readonly subscribe: (listener: VaultAliasHistoryListener) => () => void;
}

const aliasHistoryByDocument = new WeakMap<LoroDoc, VaultAliasHistoryFrontier>();

/** Returns the live, provider-owned Undo reachability frontier for maintenance. */
export function getVaultAliasHistoryFrontier(doc: LoroDoc): VaultAliasHistoryFrontier | undefined {
    return aliasHistoryByDocument.get(doc);
}

function getChangedAliasIds(event: LoroEventBatch): Set<string> {
    const aliasIds = new Set<string>();
    for (const item of event.events) {
        if (item.path[0] !== "descriptionAliases") continue;
        const pathAliasId = item.path[1];
        if (typeof pathAliasId === "string") {
            aliasIds.add(pathAliasId);
            continue;
        }
        if (item.diff.type === "map") {
            for (const aliasId of Object.keys(item.diff.updated)) aliasIds.add(aliasId);
        }
    }
    return aliasIds;
}

export function getVaultUserOrigin(kind: VaultUserActionKind): VaultUserOrigin {
    return `user:${kind}`;
}

export function getVaultSystemOrigin(kind: VaultSystemOriginKind): VaultSystemOrigin {
    return `system:${kind}`;
}

/**
 * Owns the standard Loro UndoManager for one document.
 *
 * Synchronous user actions share a group until the next microtask. Explicit edit sessions keep a
 * group open across separate input events until their focus/commit lifecycle ends. Neither path
 * relies on an arbitrary time window.
 */
export class VaultUndoCoordinator {
    private readonly doc: LoroDoc;
    private readonly manager: UndoManager;
    private readonly listeners = new Set<VaultUndoListener>();
    private readonly unsubscribeDocument: () => void;
    private readonly aliasHistoryListeners = new Set<VaultAliasHistoryListener>();
    private readonly aliasHistoryFrontier: VaultAliasHistoryFrontier;
    private undoAliasHistory: Set<string>[] = [];
    private redoAliasHistory: Set<string>[] = [];
    private pendingPoppedAliases: Set<string> | undefined;
    private reachableAliasIds = new Set<string>();
    private maxUndoSteps = 100;
    private activeGroup: ActiveUndoGroup | null = null;
    private disposed = false;
    private nextGroupId = 0;
    private snapshot: VaultUndoSnapshot = EMPTY_UNDO_SNAPSHOT;

    constructor(doc: LoroDoc) {
        this.doc = doc;
        this.aliasHistoryFrontier = {
            has: (aliasId) => this.reachableAliasIds.has(aliasId),
            subscribe: (listener) => {
                this.aliasHistoryListeners.add(listener);
                return () => this.aliasHistoryListeners.delete(listener);
            }
        };
        this.manager = new UndoManager(doc, {
            excludeOriginPrefixes: EXCLUDED_ORIGIN_PREFIXES,
            maxUndoSteps: 100,
            mergeInterval: 0,
            onPop: (isUndo) => this.popAliasHistory(isUndo),
            onPush: (isUndo, _counterRange, event) => {
                this.pushAliasHistory(isUndo, event);
                return { cursors: [], value: null };
            }
        });
        aliasHistoryByDocument.set(doc, this.aliasHistoryFrontier);
        this.unsubscribeDocument = doc.subscribe(() => this.publishSnapshot());
        this.publishSnapshot();
    }

    readonly subscribe = (listener: VaultUndoListener): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    readonly getSnapshot = (): VaultUndoSnapshot => this.snapshot;

    readonly getServerSnapshot = (): VaultUndoSnapshot => EMPTY_UNDO_SNAPSHOT;

    runUserAction<Result>(
        kind: VaultUserActionKind,
        operation: (origin: VaultUserOrigin) => Result
    ): Result {
        if (this.disposed) {
            throw new Error("Cannot run an action with a disposed vault undo coordinator");
        }

        this.openActionGroup();
        return operation(getVaultUserOrigin(kind));
    }

    beginEditSession(): VaultEditSession {
        if (this.disposed) {
            throw new Error("Cannot begin an edit with a disposed vault undo coordinator");
        }

        this.closeActiveGroup();
        const id = ++this.nextGroupId;
        this.manager.groupStart();
        this.activeGroup = { kind: "edit", id };

        return {
            cancel: () => this.closeEditSession(id),
            commit: () => this.closeEditSession(id),
            update: <Result,>(operation: (origin: VaultUserOrigin) => Result) =>
                this.runEditSession(id, operation)
        };
    }

    undo(): boolean {
        if (this.disposed) return false;
        this.closeActiveGroup();
        const changed = this.manager.undo();
        this.publishSnapshot();
        return changed;
    }

    redo(): boolean {
        if (this.disposed) return false;
        this.closeActiveGroup();
        const changed = this.manager.redo();
        this.publishSnapshot();
        return changed;
    }

    clear(): void {
        if (this.disposed) return;
        this.closeActiveGroup();
        this.manager.clear();
        this.undoAliasHistory = [];
        this.redoAliasHistory = [];
        this.pendingPoppedAliases = undefined;
        this.publishAliasHistory();
        this.publishSnapshot();
    }

    clearUndo(): void {
        if (this.disposed) return;
        this.closeActiveGroup();
        this.manager.clearUndo();
        this.undoAliasHistory = [];
        this.publishAliasHistory();
        this.publishSnapshot();
    }

    clearRedo(): void {
        if (this.disposed) return;
        this.closeActiveGroup();
        this.manager.clearRedo();
        this.redoAliasHistory = [];
        this.publishAliasHistory();
        this.publishSnapshot();
    }

    setMaxUndoSteps(steps: number): void {
        if (this.disposed) return;
        const normalizedSteps = Math.max(0, Math.floor(steps));
        this.closeActiveGroup();
        this.maxUndoSteps = normalizedSteps;
        this.manager.setMaxUndoSteps(normalizedSteps);
        this.undoAliasHistory.splice(
            0,
            Math.max(0, this.undoAliasHistory.length - normalizedSteps)
        );
        this.publishAliasHistory();
        this.publishSnapshot();
    }

    dispose(): void {
        if (this.disposed) return;
        this.closeActiveGroup();
        this.disposed = true;
        this.unsubscribeDocument();
        this.manager.clear();
        this.manager.free();
        this.undoAliasHistory = [];
        this.redoAliasHistory = [];
        this.pendingPoppedAliases = undefined;
        this.publishAliasHistory();
        if (aliasHistoryByDocument.get(this.doc) === this.aliasHistoryFrontier) {
            aliasHistoryByDocument.delete(this.doc);
        }
        this.snapshot = EMPTY_UNDO_SNAPSHOT;
        this.emit();
        this.listeners.clear();
        this.aliasHistoryListeners.clear();
    }

    private openActionGroup(): void {
        if (this.activeGroup?.kind === "action") return;

        this.closeActiveGroup();

        const id = ++this.nextGroupId;
        this.manager.groupStart();
        this.activeGroup = { kind: "action", id };
        queueMicrotask(() => {
            if (this.activeGroup?.kind === "action" && this.activeGroup.id === id) {
                this.closeActiveGroup();
            }
        });
    }

    private runEditSession<Result>(
        id: number,
        operation: (origin: VaultUserOrigin) => Result
    ): Result {
        if (this.disposed) {
            throw new Error("Cannot update an edit with a disposed vault undo coordinator");
        }
        if (this.activeGroup?.kind !== "edit" || this.activeGroup.id !== id) {
            throw new Error("Cannot update a closed vault edit session");
        }

        return operation(getVaultUserOrigin("edit"));
    }

    private closeEditSession(id: number): void {
        if (this.activeGroup?.kind !== "edit" || this.activeGroup.id !== id) return;
        this.closeActiveGroup();
    }

    private closeActiveGroup(): void {
        if (!this.activeGroup || this.disposed) return;

        this.activeGroup = null;
        this.manager.groupEnd();
        this.publishSnapshot();
    }

    private publishSnapshot(): void {
        if (this.disposed) return;

        const nextSnapshot: VaultUndoSnapshot = {
            canRedo: this.manager.canRedo(),
            canUndo: this.manager.canUndo()
        };
        if (
            nextSnapshot.canRedo === this.snapshot.canRedo &&
            nextSnapshot.canUndo === this.snapshot.canUndo
        ) {
            return;
        }

        this.snapshot = nextSnapshot;
        this.emit();
    }

    private popAliasHistory(isUndo: boolean): void {
        const stack = isUndo ? this.undoAliasHistory : this.redoAliasHistory;
        this.pendingPoppedAliases = stack.pop() ?? new Set<string>();
        this.publishAliasHistory();
    }

    private pushAliasHistory(isUndo: boolean, event: LoroEventBatch | undefined): void {
        const aliasIds = event ? getChangedAliasIds(event) : this.pendingPoppedAliases;
        this.pendingPoppedAliases = undefined;
        const stack = isUndo ? this.undoAliasHistory : this.redoAliasHistory;
        stack.push(aliasIds ?? new Set<string>());

        if (event && isUndo) this.redoAliasHistory = [];
        if (isUndo && this.undoAliasHistory.length > this.maxUndoSteps) {
            this.undoAliasHistory.splice(0, this.undoAliasHistory.length - this.maxUndoSteps);
        }
        this.publishAliasHistory();
    }

    private publishAliasHistory(): void {
        const nextReachable = new Set(
            [...this.undoAliasHistory, ...this.redoAliasHistory].flatMap((aliasIds) => [
                ...aliasIds
            ])
        );
        if (
            nextReachable.size === this.reachableAliasIds.size &&
            [...nextReachable].every((aliasId) => this.reachableAliasIds.has(aliasId))
        ) {
            return;
        }
        this.reachableAliasIds = nextReachable;
        for (const listener of this.aliasHistoryListeners) listener();
    }

    private emit(): void {
        for (const listener of this.listeners) listener();
    }
}

const VaultUndoContext = createContext<VaultUndoCoordinator | null>(null);

export interface VaultUndoProviderProps {
    children: React.ReactNode;
    coordinator: VaultUndoCoordinator;
}

/** Exposes the active vault coordinator created by the vault lifecycle owner. */
export function VaultUndoProvider({ children, coordinator }: VaultUndoProviderProps) {
    return <VaultUndoContext.Provider value={coordinator}>{children}</VaultUndoContext.Provider>;
}

export function useVaultUndoCoordinator(): VaultUndoCoordinator {
    const coordinator = useContext(VaultUndoContext);
    if (!coordinator) {
        throw new Error("useVaultUndoCoordinator must be used within a VaultUndoProvider");
    }
    return coordinator;
}

export function useVaultUndo(): VaultUndoSnapshot & {
    redo: () => boolean;
    undo: () => boolean;
} {
    const coordinator = useVaultUndoCoordinator();
    const snapshot = useSyncExternalStore(
        coordinator.subscribe,
        coordinator.getSnapshot,
        coordinator.getServerSnapshot
    );
    const undo = useCallback(() => coordinator.undo(), [coordinator]);
    const redo = useCallback(() => coordinator.redo(), [coordinator]);

    return { ...snapshot, redo, undo };
}

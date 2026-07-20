"use client";

import { UndoManager } from "loro-crdt";
import type { LoroDoc } from "loro-crdt";
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

type VaultUndoListener = () => void;

const EMPTY_UNDO_SNAPSHOT: VaultUndoSnapshot = {
    canRedo: false,
    canUndo: false
};

export function getVaultUserOrigin(kind: VaultUserActionKind): VaultUserOrigin {
    return `user:${kind}`;
}

export function getVaultSystemOrigin(kind: VaultSystemOriginKind): VaultSystemOrigin {
    return `system:${kind}`;
}

/**
 * Owns the standard Loro UndoManager for one document.
 *
 * User mutations issued during one synchronous UI action share an explicit group. The group closes
 * at the next microtask, before another click or key event can begin, so bulk handlers made from
 * several existing vault actions remain atomic without time-based merging.
 */
export class VaultUndoCoordinator {
    private readonly manager: UndoManager;
    private readonly listeners = new Set<VaultUndoListener>();
    private readonly unsubscribeDocument: () => void;
    private actionGroupOpen = false;
    private disposed = false;
    private snapshot: VaultUndoSnapshot = EMPTY_UNDO_SNAPSHOT;

    constructor(doc: LoroDoc) {
        this.manager = new UndoManager(doc, {
            excludeOriginPrefixes: EXCLUDED_ORIGIN_PREFIXES,
            maxUndoSteps: 100,
            mergeInterval: 0
        });
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

    undo(): boolean {
        if (this.disposed) return false;
        this.closeActionGroup();
        const changed = this.manager.undo();
        this.publishSnapshot();
        return changed;
    }

    redo(): boolean {
        if (this.disposed) return false;
        this.closeActionGroup();
        const changed = this.manager.redo();
        this.publishSnapshot();
        return changed;
    }

    clear(): void {
        if (this.disposed) return;
        this.closeActionGroup();
        this.manager.clear();
        this.publishSnapshot();
    }

    dispose(): void {
        if (this.disposed) return;
        this.closeActionGroup();
        this.disposed = true;
        this.unsubscribeDocument();
        this.manager.clear();
        this.manager.free();
        this.snapshot = EMPTY_UNDO_SNAPSHOT;
        this.emit();
        this.listeners.clear();
    }

    private openActionGroup(): void {
        if (this.actionGroupOpen) return;

        this.manager.groupStart();
        this.actionGroupOpen = true;
        queueMicrotask(() => this.closeActionGroup());
    }

    private closeActionGroup(): void {
        if (!this.actionGroupOpen || this.disposed) return;

        this.actionGroupOpen = false;
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

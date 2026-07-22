import { render } from "@testing-library/react";
import { createElement } from "react";
import { Temporal } from "temporal-polyfill";
import { afterEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

import { VaultProvider } from "@/lib/crdt/context";
import {
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import {
    startVaultMaintenanceScheduler,
    type VaultMaintenanceFrameHost
} from "@/lib/crdt/maintenance";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { insertTransaction } from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { decryptUpdate } from "@/lib/crdt/snapshot";
import { VaultUndoCoordinator } from "@/lib/crdt/undo";
import { asMinorUnits } from "@/lib/domain/currency";
import { SyncManager, type SyncManagerOptions } from "@/lib/sync/manager";
import { closeDB, getUnpushedOps } from "@/lib/sync/persistence";

const realtime = vi.hoisted(() => ({
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(async () => undefined)
}));

vi.mock("@/lib/supabase/realtime", () => ({
    createVaultRealtimeSync: () => realtime
}));

const DATE = Temporal.PlainDate.from("2026-07-22");
let vaultCounter = 0;

function createFrameHost() {
    let nextId = 0;
    let visible = true;
    const callbacks = new Map<number, FrameRequestCallback>();
    const listeners = new Set<() => void>();
    const cancelled: number[] = [];
    const host: VaultMaintenanceFrameHost = {
        cancelFrame: (frameId) => {
            cancelled.push(frameId);
            callbacks.delete(frameId);
        },
        isVisible: () => visible,
        now: () => 0,
        requestFrame: (callback) => {
            nextId += 1;
            callbacks.set(nextId, callback);
            return nextId;
        },
        subscribeVisibility: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
    return {
        cancelled,
        host,
        pending: () => callbacks.size,
        runOne: () => {
            const entry = callbacks.entries().next().value as
                | [number, FrameRequestCallback]
                | undefined;
            if (!entry) return false;
            callbacks.delete(entry[0]);
            entry[1](0);
            return true;
        },
        runAll: () => {
            for (let frame = 0; callbacks.size > 0 && frame < 10_000; frame += 1) {
                const entry = callbacks.entries().next().value as
                    | [number, FrameRequestCallback]
                    | undefined;
                if (!entry) break;
                callbacks.delete(entry[0]);
                entry[1](0);
            }
            if (callbacks.size) throw new Error("Maintenance frames did not settle");
        },
        setVisible: (next: boolean) => {
            visible = next;
            listeners.forEach((listener) => listener());
        }
    };
}

function createAliasGarbage() {
    const vault = createVaultMirror();
    vault.mirror.setState((state: VaultState) => {
        createDescriptionAlias(state, { aliasId: "source", name: "Source plaintext" });
        createDescriptionAlias(state, { aliasId: "target", name: "Target" });
        insertTransaction(state.transactions, {
            transaction: {
                id: "transaction",
                date: DATE,
                description: "Raw",
                descriptionAliasId: "source",
                notes: "before",
                amount: asMinorUnits(100),
                accountId: "account",
                tagIds: [],
                statusId: "status",
                importId: undefined,
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                importRowIndex: 0,
                deletedAt: undefined
            }
        });
        state.descriptionAliases.source.transactionIds.transaction = true;
        changeAllDescriptionAliases(state, {
            sourceAliasId: "source",
            target: { kind: "existing", aliasId: "target" }
        });
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions[0];
        transaction.descriptionAliasId = "source";
        state.descriptionAliases.source.transactionIds.transaction = true;
        delete state.descriptionAliases.target.transactionIds.transaction;
    });
    return vault;
}

function createTrpc(
    pushOps: NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]
): NonNullable<SyncManagerOptions["trpc"]> {
    return {
        sync: {
            getSnapshot: { query: vi.fn(async () => null) },
            getUpdates: { query: vi.fn(async () => ({ type: "ops" as const, ops: [] })) },
            pushOps,
            pushSnapshot: { mutate: vi.fn(async () => ({ success: true })) }
        }
    };
}

afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await closeDB();
});

describe("vault background maintenance integration", () => {
    it("collects a cleared change-all history frontier in the same provider", async () => {
        const vault = createVaultMirror();
        const coordinator = new VaultUndoCoordinator(vault.doc);
        vault.mirror.setState(
            (state: VaultState) => {
                createDescriptionAlias(state, { aliasId: "live-source", name: "Live source" });
                createDescriptionAlias(state, { aliasId: "live-target", name: "Live target" });
            },
            { origin: "system:hydration" }
        );
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });
        frames.runAll();

        coordinator.runUserAction("alias", (origin) =>
            vault.mirror.setState(
                (state: VaultState) => {
                    changeAllDescriptionAliases(state, {
                        sourceAliasId: "live-source",
                        target: { kind: "existing", aliasId: "live-target" }
                    });
                },
                { origin }
            )
        );
        await Promise.resolve();
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeDefined();
        expect(coordinator.undo()).toBe(true);
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"].kind).toBe("real");
        expect(coordinator.redo()).toBe(true);
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeDefined();

        coordinator.clear();
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeUndefined();

        dispose();
        coordinator.dispose();
        vault.mirror.dispose();
    });

    it("releases redo-invalidated, trimmed, and disposed alias history without a remount", async () => {
        const invalidated = createAliasGarbage();
        const invalidatedUndo = new VaultUndoCoordinator(invalidated.doc);
        invalidatedUndo.runUserAction("alias", (origin) =>
            invalidated.mirror.setState(
                (state: VaultState) => {
                    state.descriptionAliases.source.name = "History-only name";
                },
                { origin }
            )
        );
        await Promise.resolve();
        expect(invalidatedUndo.undo()).toBe(true);
        const invalidatedFrames = createFrameHost();
        const disposeInvalidated = startVaultMaintenanceScheduler({
            doc: invalidated.doc,
            host: invalidatedFrames.host,
            store: invalidated.mirror
        });
        invalidatedFrames.runAll();
        expect(invalidated.mirror.getState().descriptionAliases.source).toBeDefined();
        invalidatedUndo.runUserAction("edit", (origin) =>
            invalidated.mirror.setState(
                (state: VaultState) => {
                    state.preferences.name = "Invalidates redo";
                },
                { origin }
            )
        );
        await Promise.resolve();
        invalidatedFrames.runAll();
        expect(invalidated.mirror.getState().descriptionAliases.source).toBeUndefined();
        disposeInvalidated();
        invalidatedUndo.dispose();
        invalidated.mirror.dispose();

        for (const release of ["trim", "dispose"] as const) {
            const vault = createAliasGarbage();
            const coordinator = new VaultUndoCoordinator(vault.doc);
            coordinator.runUserAction("alias", (origin) =>
                vault.mirror.setState(
                    (state: VaultState) => {
                        state.descriptionAliases.source.name = `Release by ${release}`;
                    },
                    { origin }
                )
            );
            await Promise.resolve();
            const frames = createFrameHost();
            const disposeScheduler = startVaultMaintenanceScheduler({
                doc: vault.doc,
                host: frames.host,
                store: vault.mirror
            });
            frames.runAll();
            expect(vault.mirror.getState().descriptionAliases.source).toBeDefined();
            if (release === "trim") coordinator.setMaxUndoSteps(0);
            else coordinator.dispose();
            frames.runAll();
            expect(vault.mirror.getState().descriptionAliases.source).toBeUndefined();
            disposeScheduler();
            coordinator.dispose();
            vault.mirror.dispose();
        }
    });

    it("finishes every phase despite continuous relevant user edits", () => {
        const vault = createAliasGarbage();
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });

        for (let index = 0; index < 200; index += 1) {
            expect(frames.runOne()).toBe(true);
            vault.mirror.setState(
                (state: VaultState) => {
                    state.transactions.account.years[0].months[0].days[0].transactions[0].notes = `continuous-${index}`;
                },
                { origin: "user:edit" }
            );
            if (!vault.mirror.getState().descriptionAliases.source) break;
        }

        expect(vault.mirror.getState().descriptionAliases.source).toBeUndefined();
        dispose();
        vault.mirror.dispose();
    });

    it("pauses while hidden, resumes once, ignores its own origin, and disposes exactly", () => {
        const vault = createAliasGarbage();
        const frames = createFrameHost();
        const origins: Array<string | undefined> = [];
        const unsubscribe = vault.doc.subscribe((event) => origins.push(event.origin));
        const dispose = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });

        expect(frames.pending()).toBe(1);
        frames.setVisible(false);
        expect(frames.pending()).toBe(0);
        expect(frames.cancelled).toHaveLength(1);
        frames.setVisible(true);
        expect(frames.pending()).toBe(1);
        frames.runAll();

        const state = vault.mirror.getState();
        expect(state.descriptionAliases.source).toBeUndefined();
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBe("target");
        expect(new Set(origins)).toEqual(new Set(["system:gc"]));
        expect(frames.pending()).toBe(0);

        vault.mirror.setState((draft: VaultState) => {
            createDescriptionAlias(draft, { aliasId: "session-source", name: "Session source" });
            createDescriptionAlias(draft, { aliasId: "session-target", name: "Session target" });
            changeAllDescriptionAliases(draft, {
                sourceAliasId: "session-source",
                target: { kind: "existing", aliasId: "session-target" }
            });
        });
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["session-source"]).toBeDefined();

        dispose();
        const remountedFrames = createFrameHost();
        const disposeRemounted = startVaultMaintenanceScheduler({
            doc: vault.doc,
            host: remountedFrames.host,
            store: vault.mirror
        });
        remountedFrames.runAll();
        expect(vault.mirror.getState().descriptionAliases["session-source"]).toBeUndefined();
        disposeRemounted();
        vault.mirror.setState((draft: VaultState) => {
            draft.transactions.account.years[0].months[0].days[0].transactions[0].notes = "later";
        });
        expect(frames.pending()).toBe(0);
        unsubscribe();
        vault.mirror.dispose();
    });

    it("binds one frame loop to the current provider document and cleans up replacement/unmount", () => {
        const first = createVaultMirror();
        const second = createVaultMirror();
        first.mirror.dispose();
        second.mirror.dispose();
        let visibility = "visible";
        let nextId = 0;
        const callbacks = new Map<number, FrameRequestCallback>();
        const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
            nextId += 1;
            callbacks.set(nextId, callback);
            return nextId;
        });
        const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
            callbacks.delete(id);
        });
        vi.spyOn(document, "visibilityState", "get").mockImplementation(
            () => visibility as DocumentVisibilityState
        );

        const view = render(createElement(VaultProvider, { doc: first.doc }, null));
        expect(request).toHaveBeenCalledOnce();
        visibility = "hidden";
        document.dispatchEvent(new Event("visibilitychange"));
        expect(cancel).toHaveBeenCalledOnce();
        visibility = "visible";
        document.dispatchEvent(new Event("visibilitychange"));
        expect(request).toHaveBeenCalledTimes(2);

        view.rerender(createElement(VaultProvider, { doc: second.doc }, null));
        expect(cancel).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenCalledTimes(3);
        view.unmount();
        expect(cancel).toHaveBeenCalledTimes(3);
        expect(callbacks.size).toBe(0);
    });

    it("persists and encrypts GC, exchanges without echo, and leaves user undo intact", async () => {
        const source = createAliasGarbage();
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        source.mirror.dispose();
        const local = createVaultMirrorFromSnapshot(malformedSnapshot);
        const coordinator = new VaultUndoCoordinator(local.doc);
        const key = new Uint8Array(32);
        vaultCounter += 1;
        const vaultId = `maintenance-${vaultCounter}-${Date.now()}`;
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async (input) => ({
                insertedIds: input.ops.map((operation) => operation.id)
            }));
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "maintenance-user",
            vaultKey: key,
            doc: local.doc,
            trpc: createTrpc({ mutate: pushOps })
        });
        await manager.initialize();
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            doc: local.doc,
            host: frames.host,
            store: local.mirror
        });
        frames.runAll();
        await manager.awaitLocalPersistence();
        await manager.forceSync();

        expect(coordinator.getSnapshot().canUndo).toBe(false);
        expect(pushOps).toHaveBeenCalledOnce();
        expect(await getUnpushedOps(vaultId)).toEqual([]);
        const pushed = pushOps.mock.calls[0][0].ops;
        expect(pushed.length).toBeGreaterThan(0);
        expect(
            pushed.every((operation) => !operation.encryptedData.includes("Source plaintext"))
        ).toBe(true);

        const peerDoc = createVaultMirrorFromSnapshot(malformedSnapshot);
        const echoed: Uint8Array[] = [];
        const unsubscribeEcho = peerDoc.doc.subscribeLocalUpdates((update) => echoed.push(update));
        for (const operation of pushed) {
            peerDoc.doc.import(await decryptUpdate(operation, key));
        }
        const peerFrames = createFrameHost();
        const disposePeer = startVaultMaintenanceScheduler({
            doc: peerDoc.doc,
            host: peerFrames.host,
            store: peerDoc.mirror
        });
        peerFrames.runAll();
        expect(echoed).toEqual([]);
        expect(peerDoc.mirror.getState().descriptionAliases.source).toBeUndefined();

        coordinator.runUserAction("edit", (origin) =>
            local.mirror.setState(
                (state: VaultState) => {
                    state.transactions.account.years[0].months[0].days[0].transactions[0].notes =
                        "after";
                },
                { origin }
            )
        );
        await Promise.resolve();
        expect(coordinator.undo()).toBe(true);
        expect(
            local.mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0]
                .notes
        ).toBe("before");
        expect(local.mirror.getState().descriptionAliases.source).toBeUndefined();

        disposePeer();
        unsubscribeEcho();
        peerDoc.mirror.dispose();
        dispose();
        coordinator.dispose();
        await manager.disconnect();
        local.mirror.dispose();
    });
});

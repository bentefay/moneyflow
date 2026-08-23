import { LoroDoc, LoroMap } from "loro-crdt";
import { afterEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

import { hydrateAndRepairVaultDocument } from "@/components/providers/vault-provider";
import {
    changeAllDescriptionAliases,
    createDescriptionAlias,
    removeAllDescriptionAliases
} from "@/lib/crdt/description-aliases";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import type { VaultState } from "@/lib/crdt/schema";
import { createEncryptedUpdate, decryptUpdate } from "@/lib/crdt/snapshot";
import { VaultUndoCoordinator } from "@/lib/crdt/undo";
import { SyncManager, type SyncManagerOptions } from "@/lib/sync/manager";
import { closeDB, getAllOps, getUnpushedOps } from "@/lib/sync/persistence";

const realtime = vi.hoisted(() => {
    interface RemotePayload {
        id: string;
        encryptedData: string;
        versionVector: string;
        authorPubkeyHash: string;
        createdAt: string;
    }
    interface RealtimeCallbacks {
        onUpdate: (update: RemotePayload) => void | Promise<void>;
        onReconnect: () => void | Promise<void>;
    }
    let updateHandler = async (update: RemotePayload): Promise<void> => {
        void update;
    };
    return {
        subscribe: vi.fn(async (callbacks: RealtimeCallbacks) => {
            updateHandler = async (update) => callbacks.onUpdate(update);
        }),
        unsubscribe: vi.fn(async () => undefined),
        emit: async (update: RemotePayload) => updateHandler(update)
    };
});

vi.mock("@/lib/supabase/realtime", () => ({
    createVaultRealtimeSync: () => realtime
}));

let vaultCounter = 0;

function uniqueVaultId(label: string): string {
    vaultCounter += 1;
    return `provider-alias-${label}-${vaultCounter}-${Date.now()}`;
}

function createTrpc(
    pushOps: NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]
): NonNullable<SyncManagerOptions["trpc"]> {
    return {
        sync: {
            getSnapshot: { query: vi.fn(async () => null) },
            getUpdates: {
                query: vi.fn(async (): Promise<{ type: "ops"; ops: [] }> => ({
                    type: "ops",
                    ops: []
                }))
            },
            pushOps,
            pushSnapshot: { mutate: vi.fn(async () => ({ success: true })) }
        }
    };
}

afterEach(async () => {
    vi.clearAllMocks();
    await closeDB();
});

describe("production vault hydration alias repair", () => {
    it("awaits the real encrypted local queue before initial push and convergent reopen", async () => {
        const source = createVaultMirror();
        source.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "root", name: "Root" });
            createDescriptionAlias(state, { aliasId: "chain", name: "Chain" });
            createDescriptionAlias(state, { aliasId: "middle", name: "Middle" });
            state.descriptionAliases.chain.kind = "symlink";
            state.descriptionAliases.chain.targetAliasId = "middle";
            state.descriptionAliases.middle.kind = "symlink";
            state.descriptionAliases.middle.targetAliasId = "root";
        });
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        const doc = new LoroDoc();
        doc.import(malformedSnapshot);
        const vaultId = uniqueVaultId("hydrate");
        const persistedCounts: number[] = [];
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async () => {
                persistedCounts.push((await getUnpushedOps(vaultId)).length);
                return { insertedIds: [] };
            });
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "provider-user",
            vaultKey: new Uint8Array(32),
            doc,
            trpc: createTrpc({ mutate: pushOps })
        });

        expect(await hydrateAndRepairVaultDocument(doc, manager)).toBe(true);
        expect(persistedCounts).toEqual([1]);
        expect(pushOps).toHaveBeenCalledOnce();
        const pushed = pushOps.mock.calls[0][0].ops;
        expect(pushed).toHaveLength(1);
        expect(pushed[0].encryptedData).not.toContain("Root");
        expect(await getUnpushedOps(vaultId)).toEqual([]);

        const coordinator = new VaultUndoCoordinator(doc);
        expect(coordinator.getSnapshot().canUndo).toBe(false);
        coordinator.dispose();

        const peer = new LoroDoc();
        peer.import(malformedSnapshot);
        for (const operation of pushed) {
            peer.import(
                await decryptUpdate({ encryptedData: operation.encryptedData }, new Uint8Array(32))
            );
        }
        const peerVersion = peer.version().encode();
        const reopenPush = vi.fn(async () => ({ insertedIds: [] }));
        const reopenManager = new SyncManager({
            vaultId: uniqueVaultId("reopen"),
            pubkeyHash: "provider-user",
            vaultKey: new Uint8Array(32),
            doc: peer,
            trpc: createTrpc({ mutate: reopenPush })
        });
        expect(await hydrateAndRepairVaultDocument(peer, reopenManager)).toBe(false);
        expect(peer.version().encode()).toEqual(peerVersion);
        expect(reopenPush).not.toHaveBeenCalled();
        expect(createVaultMirror({ doc: peer }).mirror.getState().descriptionAliases).toEqual(
            createVaultMirror({ doc }).mirror.getState().descriptionAliases
        );

        await reopenManager.disconnect();
        await manager.disconnect();
    });

    it("publishes one legal remote merge, retries repair exchange, and reopens cleanly", async () => {
        const key = new Uint8Array(32);
        const base = createVaultMirror();
        base.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "root", name: "Root" });
        });
        const baseSnapshot = base.doc.export({ mode: "snapshot" });

        const local = createVaultMirrorFromSnapshot(baseSnapshot);
        local.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "late", name: "Late" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "late",
                target: { kind: "existing", aliasId: "root" }
            });
        });
        const localBeforeMerge = local.doc.export({ mode: "snapshot" });

        const remote = createVaultMirrorFromSnapshot(baseSnapshot);
        const remoteBase = remote.doc.version();
        remote.mirror.setState((state: VaultState) => {
            expect(removeAllDescriptionAliases(state, "root").ok).toBe(true);
        });
        const remoteDelete = await createEncryptedUpdate(remote.doc, key, 0, remoteBase);

        const events: string[] = [];
        const pushedAttempts: Array<Array<{ id: string; encryptedData: string }>> = [];
        let pushAttempt = 0;
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async (input) => {
                pushAttempt += 1;
                events.push(`push-${pushAttempt}`);
                pushedAttempts.push(input.ops);
                if (pushAttempt === 1) throw new Error("controlled repair push failure");
                return { insertedIds: input.ops.map((operation) => operation.id) };
            });
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const manager = new SyncManager({
            vaultId: uniqueVaultId("remote"),
            pubkeyHash: "provider-user",
            vaultKey: key,
            doc: local.doc,
            trpc: createTrpc({ mutate: pushOps }),
            onRemoteUpdate: () => {
                events.push("lifecycle");
                expect(local.mirror.getState().descriptionAliases.late.deletedAt).toBeDefined();
                expect(local.mirror.getState().descriptionAliases.root.deletedAt).toBeDefined();
            }
        });
        await manager.initialize();
        const remoteUndo = new VaultUndoCoordinator(local.doc);

        const observedStates: Array<{
            rootDeleted: boolean;
            lateDeleted: boolean;
            lateKind: string | undefined;
        }> = [];
        const unsubscribe = local.mirror.subscribe((state) => {
            events.push("mirror");
            observedStates.push({
                rootDeleted: state.descriptionAliases.root.deletedAt != null,
                lateDeleted: state.descriptionAliases.late.deletedAt != null,
                lateKind: state.descriptionAliases.late.kind
            });
        });

        await realtime.emit({
            id: "remote-delete",
            encryptedData: remoteDelete.encryptedData,
            versionVector: "remote-version",
            authorPubkeyHash: "remote-user",
            createdAt: "2026-07-20T00:00:00Z"
        });

        expect(observedStates).toEqual([
            { rootDeleted: true, lateDeleted: true, lateKind: "real" }
        ]);
        expect(events).toEqual(["mirror", "push-1"]);
        expect(pushOps).toHaveBeenCalledOnce();
        expect(await getUnpushedOps(pushOps.mock.calls[0][0].vaultId)).toHaveLength(1);

        window.dispatchEvent(new Event("online"));

        await vi.waitFor(() => expect(pushOps).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(events).toEqual(["mirror", "push-1", "push-2", "lifecycle"]));
        const vaultId = pushOps.mock.calls[0][0].vaultId;
        await vi.waitFor(async () => expect(await getUnpushedOps(vaultId)).toEqual([]));
        expect(observedStates).toHaveLength(1);
        expect(pushedAttempts[0]).toHaveLength(1);
        expect(pushedAttempts[1]).toHaveLength(1);
        expect(pushedAttempts[1][0].id).toBe(pushedAttempts[0][0].id);
        expect(await getAllOps(vaultId)).toHaveLength(1);
        expect(remoteUndo.getSnapshot().canUndo).toBe(false);

        const exchangedPeer = new LoroDoc();
        exchangedPeer.import(localBeforeMerge);
        exchangedPeer.import(await decryptUpdate(remoteDelete, key));
        for (const operation of pushedAttempts[1]) {
            exchangedPeer.import(await decryptUpdate(operation, key));
        }
        const exchangedVersion = exchangedPeer.version().encode();
        const reopenPush = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockResolvedValue({ insertedIds: [] });
        const reopenManager = new SyncManager({
            vaultId: uniqueVaultId("remote-reopen"),
            pubkeyHash: "provider-user",
            vaultKey: key,
            doc: exchangedPeer,
            trpc: createTrpc({ mutate: reopenPush })
        });
        expect(await hydrateAndRepairVaultDocument(exchangedPeer, reopenManager)).toBe(false);
        expect(exchangedPeer.version().encode()).toEqual(exchangedVersion);
        expect(reopenPush).not.toHaveBeenCalled();
        const reopenedState = createVaultMirror({ doc: exchangedPeer }).mirror.getState();
        expect(reopenedState.descriptionAliases.root.deletedAt).toBeDefined();
        expect(reopenedState.descriptionAliases.late.deletedAt).toBeDefined();
        expect(reopenedState.descriptionAliases).toEqual(
            local.mirror.getState().descriptionAliases
        );

        unsubscribe();
        remoteUndo.dispose();
        await reopenManager.disconnect();
        await manager.disconnect();
    });

    it("repairs and flushes before first read, exchanges the repair, and reopens idempotently", async () => {
        const source = createVaultMirror();
        source.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "root", name: "Root" });
            createDescriptionAlias(state, { aliasId: "chain", name: "Chain" });
            createDescriptionAlias(state, { aliasId: "broken", name: "Broken" });
            state.descriptionAliases.chain.kind = "symlink";
            state.descriptionAliases.chain.targetAliasId = "broken";
            state.descriptionAliases.broken.kind = "symlink";
            state.descriptionAliases.broken.targetAliasId = "root";
            state.descriptionAliases.root.symlinkIds.stale = true;
        });
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        const hydrated = new LoroDoc();
        let hydratedBase = hydrated.version();
        let repairUpdate: Uint8Array<ArrayBufferLike> = new Uint8Array();
        const order: string[] = [];
        const manager = {
            initialize: vi.fn(async () => {
                order.push("initialize");
                hydrated.import(malformedSnapshot);
                hydratedBase = hydrated.version();
            }),
            awaitLocalPersistence: vi.fn(async () => {
                order.push("awaitLocalPersistence");
            }),
            forceSync: vi.fn(async () => {
                order.push("forceSync");
                repairUpdate = hydrated.export({ mode: "update", from: hydratedBase });
            })
        };

        expect(await hydrateAndRepairVaultDocument(hydrated, manager)).toBe(true);
        expect(order).toEqual(["initialize", "awaitLocalPersistence", "forceSync"]);
        const repairedVersion = hydrated.version().encode();
        const firstConsumer = createVaultMirror({ doc: hydrated });
        expect(firstConsumer.mirror.getState().descriptionAliases.chain).toMatchObject({
            kind: "symlink",
            targetAliasId: "root"
        });
        expect(firstConsumer.mirror.getState().descriptionAliases.broken).toMatchObject({
            kind: "symlink",
            targetAliasId: "root"
        });
        expect(hydrated.version().encode()).toEqual(repairedVersion);

        const coordinator = new VaultUndoCoordinator(hydrated);
        expect(coordinator.getSnapshot().canUndo).toBe(false);
        coordinator.dispose();

        const peer = new LoroDoc();
        peer.import(malformedSnapshot);
        peer.import(repairUpdate);
        const reopenManager = {
            initialize: vi.fn(async () => undefined),
            awaitLocalPersistence: vi.fn(async () => undefined),
            forceSync: vi.fn(async () => undefined)
        };
        expect(await hydrateAndRepairVaultDocument(peer, reopenManager)).toBe(false);
        expect(reopenManager.forceSync).not.toHaveBeenCalled();
        expect(createVaultMirror({ doc: peer }).mirror.getState().descriptionAliases).toEqual(
            firstConsumer.mirror.getState().descriptionAliases
        );
    });

    it("creates and durably flushes missing root maps before exposure", async () => {
        const source = createVaultMirror();
        source.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "partial", name: "Partial" });
        });
        const doc = new LoroDoc();
        doc.import(source.doc.export({ mode: "snapshot" }));
        const alias = doc.getMap("descriptionAliases").get("partial");
        if (!(alias instanceof LoroMap)) throw new Error("Expected alias map");
        alias.delete("symlinkIds");
        alias.delete("transactionIds");
        doc.commit({ origin: "system:hydration" });
        const manager = {
            initialize: vi.fn(async () => undefined),
            awaitLocalPersistence: vi.fn(async () => undefined),
            forceSync: vi.fn(async () => undefined)
        };
        expect(await hydrateAndRepairVaultDocument(doc, manager)).toBe(true);
        expect(manager.forceSync).toHaveBeenCalledOnce();
        const reopened = createVaultMirrorFromSnapshot(doc.export({ mode: "snapshot" }));
        expect(reopened.mirror.getState().descriptionAliases.partial).toMatchObject({
            kind: "real",
            name: "Partial",
            symlinkIds: {},
            transactionIds: {}
        });
    });
});

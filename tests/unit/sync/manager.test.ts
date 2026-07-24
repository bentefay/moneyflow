import { LoroDoc } from "loro-crdt";
import { Mirror } from "loro-mirror";
import "fake-indexeddb/auto";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { insertTransaction } from "@/lib/crdt/mutations";
import { getAllTransactions } from "@/lib/crdt/queries";
import { vaultSchema } from "@/lib/crdt/schema";
import type { TransactionStore, VaultInput } from "@/lib/crdt/schema";
import { decryptUpdate } from "@/lib/crdt/snapshot";
import { asMinorUnits } from "@/lib/domain/currency";
import { SyncManager } from "@/lib/sync/manager";
import type { SyncManagerOptions, SyncState } from "@/lib/sync/manager";
import {
    appendOp,
    closeDB,
    getAllOps,
    getUnpushedOps,
    hasUnpushedOps
} from "@/lib/sync/persistence";

const realtime = vi.hoisted(() => ({
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(async () => undefined)
}));

vi.mock("@/lib/supabase/realtime", () => ({
    createVaultRealtimeSync: () => realtime
}));

let testCounter = 0;

function uniqueVaultId(): string {
    testCounter += 1;
    return `sync-manager-reconnect-${testCounter}-${Date.now()}`;
}

function createTrpc(
    pushOps: NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]
): NonNullable<SyncManagerOptions["trpc"]> {
    return {
        sync: {
            getSnapshot: { query: vi.fn(async () => null) },
            getUpdates: {
                query: vi.fn(async () => ({ type: "ops" as const, ops: [] }))
            },
            pushOps,
            pushSnapshot: { mutate: vi.fn(async () => ({ success: true })) }
        }
    };
}

function createDeferred<Result>(): {
    promise: Promise<Result>;
    resolve: (result: Result) => void;
} {
    let resolvePromise: ((result: Result) => void) | undefined;
    const promise = new Promise<Result>((resolve) => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve: (result) => resolvePromise?.(result)
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(async () => {
    vi.restoreAllMocks();
    await closeDB();
});

describe("SyncManager browser reconnect", () => {
    it("encrypts, caches, and pushes one 1,000-row imported update without argument overflow", async () => {
        const vaultId = uniqueVaultId();
        const key = new Uint8Array(32);
        const doc = new LoroDoc();
        const pushOps = vi.fn(async (input: { ops: Array<{ id: string }> }) => ({
            insertedIds: input.ops.map(({ id }) => id)
        }));
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "large-import-user",
            vaultKey: key,
            doc,
            trpc: createTrpc({ mutate: pushOps })
        });
        await manager.initialize();
        const mirror = new Mirror({
            doc,
            schema: vaultSchema,
            initialState: getDefaultVaultState(),
            validateUpdates: true
        });
        const creationInstant = Temporal.Instant.from("2026-07-24T00:00:00Z");

        mirror.setState((state: VaultInput) => {
            state.imports["large-import"] = {
                id: "large-import",
                filename: "large.csv",
                transactionCount: 1000,
                createdAt: creationInstant,
                deletedAt: undefined
            };
            const store = state.transactions as unknown as TransactionStore;
            for (let index = 0; index < 1000; index += 1) {
                insertTransaction(store, {
                    transaction: {
                        id: `large-${index}`,
                        date: Temporal.PlainDate.from("2026-07-24"),
                        description: `Large imported transaction ${index} with deterministic payload`,
                        descriptionAliasId: undefined,
                        notes: "",
                        amount: asMinorUnits(index),
                        originalAmount: undefined,
                        accountId: "account-default",
                        tagIds: [],
                        statusId: "status-for-review",
                        importId: "large-import",
                        allocations: {},
                        creationInstant,
                        importRowIndex: index,
                        deletedAt: undefined
                    }
                });
            }
        });

        const persistenceResult = await manager.awaitLocalPersistence().then(
            () => ({ ok: true as const }),
            (error: unknown) => ({ ok: false as const, error })
        );
        if (persistenceResult.ok) {
            await manager.forceSync();
            const operations = await getAllOps(vaultId);
            expect(operations).toHaveLength(1);
            expect(operations[0].encrypted_data).not.toContain("Large imported transaction");
            expect(pushOps).toHaveBeenCalledOnce();

            const recovered = new LoroDoc();
            recovered.import(
                await decryptUpdate({ encryptedData: operations[0].encrypted_data }, key)
            );
            const recoveredMirror = new Mirror({
                doc: recovered,
                schema: vaultSchema,
                initialState: getDefaultVaultState(),
                validateUpdates: true
            });
            const recoveredTransactions = getAllTransactions(
                recoveredMirror.getState().transactions
            );
            expect(recoveredTransactions).toHaveLength(1000);
            expect(recoveredTransactions.map(({ id }) => id)).toContain("large-0");
            expect(recoveredTransactions.map(({ id }) => id)).toContain("large-999");
            expect(recoveredTransactions.every(({ importId }) => importId === "large-import")).toBe(
                true
            );
            recoveredMirror.dispose();
        }
        mirror.dispose();
        await manager.disconnect();
        expect(persistenceResult).toEqual({ ok: true });
    });

    it("forces only after every observed local update is encrypted and durably queued", async () => {
        const vaultId = uniqueVaultId();
        const doc = new LoroDoc();
        const queuedCounts: number[] = [];
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async () => {
                queuedCounts.push((await getUnpushedOps(vaultId)).length);
                return { insertedIds: [] };
            });
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "test-user",
            vaultKey: new Uint8Array(32),
            doc,
            trpc: createTrpc({ mutate: pushOps })
        });
        await manager.initialize();

        doc.getMap("values").set("first", "one");
        doc.commit({ origin: "system:migration" });
        doc.getMap("values").set("second", "two");
        doc.commit({ origin: "system:migration" });

        await manager.forceSync();

        expect(pushOps).toHaveBeenCalledOnce();
        expect(pushOps.mock.calls[0][0].ops).toHaveLength(2);
        expect(queuedCounts).toEqual([2]);
        expect(await getUnpushedOps(vaultId)).toEqual([]);
        await manager.disconnect();
    });

    it("keeps failed raw update A observable until online retry persists A and B exactly once", async () => {
        const vaultId = uniqueVaultId();
        const key = new Uint8Array(32);
        const doc = new LoroDoc();
        const errors: Error[] = [];
        const pushedBatches: Array<Array<{ id: string; encryptedData: string }>> = [];
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async (input) => {
                pushedBatches.push(input.ops);
                return { insertedIds: input.ops.map((operation) => operation.id) };
            });
        const encryption = await import("@/lib/crypto/encryption");
        const encryptForStorage = vi
            .spyOn(encryption, "encryptForStorage")
            .mockRejectedValueOnce(new Error("controlled update A encryption failure"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "test-user",
            vaultKey: key,
            doc,
            trpc: createTrpc({ mutate: pushOps }),
            onError: (error) => errors.push(error)
        });
        await manager.initialize();

        doc.getMap("values").set("update-a", "first plaintext value");
        doc.commit({ origin: "user:edit" });
        doc.getMap("values").set("update-b", "second plaintext value");
        doc.commit({ origin: "user:edit" });

        await expect(manager.awaitLocalPersistence()).rejects.toThrow(
            "controlled update A encryption failure"
        );
        await expect(manager.awaitLocalPersistence()).rejects.toThrow(
            "controlled update A encryption failure"
        );
        expect(manager.state).toBe("error");
        expect(errors).toHaveLength(1);
        expect(encryptForStorage).toHaveBeenCalledTimes(2);
        expect(await getAllOps(vaultId)).toHaveLength(1);
        expect(pushOps).not.toHaveBeenCalled();

        window.dispatchEvent(new Event("online"));

        await vi.waitFor(() => expect(pushOps).toHaveBeenCalledOnce());
        await vi.waitFor(async () => expect(await getUnpushedOps(vaultId)).toEqual([]));
        await expect(manager.awaitLocalPersistence()).resolves.toBeUndefined();
        expect(encryptForStorage).toHaveBeenCalledTimes(3);

        const durableOps = await getAllOps(vaultId);
        expect(durableOps).toHaveLength(2);
        expect(new Set(durableOps.map((operation) => operation.id)).size).toBe(2);
        expect(pushedBatches).toHaveLength(1);
        expect(new Set(pushedBatches[0].map((operation) => operation.id))).toEqual(
            new Set(durableOps.map((operation) => operation.id))
        );
        for (const operation of durableOps) {
            expect(operation.encrypted_data).not.toContain("plaintext value");
        }

        const recovered = new LoroDoc();
        for (const operation of durableOps) {
            recovered.import(await decryptUpdate({ encryptedData: operation.encrypted_data }, key));
        }
        expect(recovered.getMap("values").toJSON()).toEqual({
            "update-a": "first plaintext value",
            "update-b": "second plaintext value"
        });

        await manager.disconnect();
    });

    it("retries a genuinely failed throttled push when the browser comes online", async () => {
        const vaultId = uniqueVaultId();
        const doc = new LoroDoc();
        const states: SyncState[] = [];
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockRejectedValueOnce(new Error("browser offline"))
            .mockResolvedValue({ insertedIds: [] });
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "test-user",
            vaultKey: new Uint8Array(32),
            doc,
            trpc: createTrpc({ mutate: pushOps }),
            onSyncStateChange: (state) => states.push(state)
        });
        await manager.initialize();

        doc.getMap("values").set("name", "offline edit");
        doc.commit({ origin: "user:edit" });

        await manager.forceSync();
        expect(pushOps).toHaveBeenCalledTimes(1);
        expect(manager.state).toBe("error");
        expect(await hasUnpushedOps(vaultId)).toBe(true);

        window.dispatchEvent(new Event("online"));

        await vi.waitFor(() => expect(pushOps).toHaveBeenCalledTimes(2));
        await vi.waitFor(async () => expect(await hasUnpushedOps(vaultId)).toBe(false));
        expect(manager.state).toBe("idle");
        expect(states).toContain("error");
        expect(states.slice(-2)).toEqual(["syncing", "idle"]);

        await manager.disconnect();
    });

    it("coalesces reconnects during a push and removes its online listener on disconnect", async () => {
        const vaultId = uniqueVaultId();
        const retry = createDeferred<{ insertedIds: string[] }>();
        let activeRequests = 0;
        let maximumActiveRequests = 0;
        let attempt = 0;
        const pushOps = vi.fn(async () => {
            activeRequests += 1;
            maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
            attempt += 1;
            try {
                if (attempt === 1) throw new Error("browser offline");
                return await retry.promise;
            } finally {
                activeRequests -= 1;
            }
        });
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const addEventListener = vi.spyOn(window, "addEventListener");
        const removeEventListener = vi.spyOn(window, "removeEventListener");
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "test-user",
            vaultKey: new Uint8Array(32),
            doc: new LoroDoc(),
            trpc: createTrpc({ mutate: pushOps })
        });
        await manager.initialize();
        await appendOp({
            id: `${vaultId}-op`,
            vault_id: vaultId,
            encrypted_data: "encrypted",
            version_vector: "version",
            pushed: false
        });

        await manager.pushChanges();
        expect(pushOps).toHaveBeenCalledTimes(1);
        expect(manager.state).toBe("error");

        window.dispatchEvent(new Event("online"));
        await vi.waitFor(() => expect(pushOps).toHaveBeenCalledTimes(2));
        window.dispatchEvent(new Event("online"));
        window.dispatchEvent(new Event("online"));
        expect(maximumActiveRequests).toBe(1);

        retry.resolve({ insertedIds: [`${vaultId}-op`] });
        await vi.waitFor(async () => expect(await getUnpushedOps(vaultId)).toEqual([]));
        await vi.waitFor(() => expect(manager.state).toBe("idle"));
        expect(pushOps).toHaveBeenCalledTimes(2);
        expect(maximumActiveRequests).toBe(1);

        const onlineRegistration = addEventListener.mock.calls.find(
            ([eventName]) => eventName === "online"
        );
        expect(onlineRegistration).toBeDefined();
        await manager.disconnect();
        if (onlineRegistration) {
            expect(removeEventListener).toHaveBeenCalledWith("online", onlineRegistration[1]);
        }

        window.dispatchEvent(new Event("online"));
        expect(pushOps).toHaveBeenCalledTimes(2);
        expect(realtime.unsubscribe).toHaveBeenCalledTimes(1);
    });
});

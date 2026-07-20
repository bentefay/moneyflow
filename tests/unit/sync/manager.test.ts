import { LoroDoc } from "loro-crdt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

import { SyncManager } from "@/lib/sync/manager";
import type { SyncManagerOptions, SyncState } from "@/lib/sync/manager";
import { appendOp, closeDB, getUnpushedOps, hasUnpushedOps } from "@/lib/sync/persistence";

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

        await vi.waitFor(() => expect(pushOps).toHaveBeenCalledTimes(1), { timeout: 5_000 });
        await vi.waitFor(() => expect(manager.state).toBe("error"));
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

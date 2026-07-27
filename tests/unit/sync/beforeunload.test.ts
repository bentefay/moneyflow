/**
 * Regression tests for the unsaved-changes warning on page unload.
 *
 * `beforeunload` is strictly synchronous per the HTML spec. The handler previously awaited an
 * IndexedDB probe, so `preventDefault()`/`returnValue` ran in a microtask *after* the event had
 * already been dispatched and the browser dialog never appeared. The handler must therefore decide
 * from state the manager already holds.
 */

import "fake-indexeddb/auto";
import { LoroDoc } from "loro-crdt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SyncManager, type SyncManagerOptions } from "@/lib/sync/manager";
import { closeDB } from "@/lib/sync/persistence";

vi.mock("@/lib/supabase/realtime", () => ({
    createVaultRealtimeSync: () => ({
        subscribe: vi.fn(async () => undefined),
        unsubscribe: vi.fn(async () => undefined)
    })
}));

let counter = 0;

function uniqueVaultId(): string {
    counter += 1;
    return `beforeunload-${counter}-${Date.now()}`;
}

function createTrpc(): NonNullable<SyncManagerOptions["trpc"]> {
    return {
        sync: {
            getSnapshot: { query: vi.fn(async () => null) },
            getUpdates: { query: vi.fn(async () => ({ type: "ops" as const, ops: [] })) },
            // Never resolves: keeps ops queued so the manager still has pending work.
            pushOps: { mutate: vi.fn(() => new Promise<never>(() => undefined)) },
            pushSnapshot: { mutate: vi.fn(async () => ({ success: true })) }
        }
    };
}

/** Captures the handler the manager registers for `beforeunload`. */
function captureBeforeUnload(): { current: ((e: BeforeUnloadEvent) => unknown) | undefined } {
    const captured: { current: ((e: BeforeUnloadEvent) => unknown) | undefined } = {
        current: undefined
    };
    const addEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
        if (type === "beforeunload" && typeof listener === "function") {
            captured.current = listener as (e: BeforeUnloadEvent) => unknown;
        }
        return addEventListener(type, listener, options);
    });
    return captured;
}

function fakeUnloadEvent() {
    return {
        returnValue: "",
        defaultPrevented: false,
        preventDefault(this: { defaultPrevented: boolean }) {
            this.defaultPrevented = true;
        }
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(async () => {
    vi.restoreAllMocks();
    await closeDB();
});

describe("SyncManager beforeunload handler", () => {
    it("is a synchronous function, not an async one", async () => {
        const captured = captureBeforeUnload();
        const manager = new SyncManager({
            vaultId: uniqueVaultId(),
            pubkeyHash: "unload-user",
            vaultKey: new Uint8Array(32),
            doc: new LoroDoc(),
            trpc: createTrpc()
        });
        await manager.initialize();

        expect(captured.current).toBeTypeOf("function");
        // An `async function` has constructor name "AsyncFunction"; awaiting anything inside a
        // beforeunload handler defers preventDefault() past the point where it can take effect.
        expect(captured.current?.constructor.name).toBe("Function");

        await manager.disconnect();
    });

    it("sets returnValue synchronously when local updates are pending", async () => {
        const captured = captureBeforeUnload();
        const doc = new LoroDoc();
        const manager = new SyncManager({
            vaultId: uniqueVaultId(),
            pubkeyHash: "unload-user",
            vaultKey: new Uint8Array(32),
            doc,
            trpc: createTrpc()
        });
        await manager.initialize();

        // Produce an unpushed local change. pushOps never resolves, so it stays unpushed.
        doc.getMap("accounts").set("a1", "pending");
        doc.commit();
        await vi.waitFor(() => expect(manager.pendingWork).toBe(true));

        const event = fakeUnloadEvent();
        // Called with no await anywhere: the assertions below run in the same synchronous turn.
        captured.current?.(event as unknown as BeforeUnloadEvent);

        expect(event.defaultPrevented).toBe(true);
        expect(event.returnValue).toBe("You have unsaved changes.");

        await manager.disconnect();
    });

    it("does not warn when there is no pending work", async () => {
        const captured = captureBeforeUnload();
        const manager = new SyncManager({
            vaultId: uniqueVaultId(),
            pubkeyHash: "unload-user",
            vaultKey: new Uint8Array(32),
            doc: new LoroDoc(),
            trpc: createTrpc()
        });
        await manager.initialize();

        expect(manager.pendingWork).toBe(false);

        const event = fakeUnloadEvent();
        captured.current?.(event as unknown as BeforeUnloadEvent);

        expect(event.defaultPrevented).toBe(false);
        expect(event.returnValue).toBe("");

        await manager.disconnect();
    });
});

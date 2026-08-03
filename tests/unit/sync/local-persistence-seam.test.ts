/**
 * The durability seam the E2E harness navigates behind.
 *
 * The harness treats an absent seam as "no vault could have queued a write" and proceeds straight
 * to the teardown, so a seam that stopped being installed — or one that resolved without consulting
 * the live manager — would silently restore the lost-write class the harness exists to avoid rather
 * than failing a test. These cover both directions: the seam must delegate, and it must report the
 * no-vault case distinctly instead of pretending it waited.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    installLocalPersistenceSeam,
    LOCAL_PERSISTENCE_SEAM_KEY
} from "@/lib/sync/local-persistence-seam";

afterEach(() => {
    delete window[LOCAL_PERSISTENCE_SEAM_KEY];
});

describe("installLocalPersistenceSeam", () => {
    it("publishes the barrier on window and removes it on teardown", () => {
        const uninstall = installLocalPersistenceSeam(() => null);

        expect(window[LOCAL_PERSISTENCE_SEAM_KEY]).toBeDefined();

        uninstall();
        expect(window[LOCAL_PERSISTENCE_SEAM_KEY]).toBeUndefined();
    });

    it("awaits the live manager's local persistence", async () => {
        let resolvePersistence: (() => void) | undefined;
        const awaitLocalPersistence = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvePersistence = resolve;
                })
        );
        installLocalPersistenceSeam(() => ({ awaitLocalPersistence }));

        const seam = window[LOCAL_PERSISTENCE_SEAM_KEY];
        expect(seam).toBeDefined();
        const barrier = seam?.awaitLocalPersistence();

        // Still outstanding: the seam resolves on the manager's schedule, not its own.
        let settled = false;
        void barrier?.then(() => {
            settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);

        resolvePersistence?.();
        await expect(barrier).resolves.toBe("persisted");
        expect(awaitLocalPersistence).toHaveBeenCalledTimes(1);
    });

    it("reads the manager on every call rather than capturing it", async () => {
        const first = { awaitLocalPersistence: vi.fn(async () => undefined) };
        const second = { awaitLocalPersistence: vi.fn(async () => undefined) };
        let active: typeof first | null = first;
        installLocalPersistenceSeam(() => active);

        await window[LOCAL_PERSISTENCE_SEAM_KEY]?.awaitLocalPersistence();
        active = second;
        await window[LOCAL_PERSISTENCE_SEAM_KEY]?.awaitLocalPersistence();

        expect(first.awaitLocalPersistence).toHaveBeenCalledTimes(1);
        expect(second.awaitLocalPersistence).toHaveBeenCalledTimes(1);
    });

    it("reports the no-vault case distinctly instead of claiming it waited", async () => {
        installLocalPersistenceSeam(() => null);

        await expect(window[LOCAL_PERSISTENCE_SEAM_KEY]?.awaitLocalPersistence()).resolves.toBe(
            "no-active-vault"
        );
    });

    it("propagates a rejecting barrier so the harness can retry or fail loudly", async () => {
        const failure = new Error("Local updates remain unacknowledged by encrypted persistence");
        installLocalPersistenceSeam(() => ({
            awaitLocalPersistence: vi.fn(() => Promise.reject(failure))
        }));

        await expect(window[LOCAL_PERSISTENCE_SEAM_KEY]?.awaitLocalPersistence()).rejects.toThrow(
            failure
        );
    });

    it("leaves a newer installation's seam alone when an older one tears down", () => {
        const uninstallFirst = installLocalPersistenceSeam(() => null);
        const uninstallSecond = installLocalPersistenceSeam(() => null);
        const secondSeam = window[LOCAL_PERSISTENCE_SEAM_KEY];

        uninstallFirst();
        expect(window[LOCAL_PERSISTENCE_SEAM_KEY]).toBe(secondSeam);

        uninstallSecond();
        expect(window[LOCAL_PERSISTENCE_SEAM_KEY]).toBeUndefined();
    });
});

/**
 * The durability seam the E2E harness navigates behind.
 *
 * A seam that resolved without consulting the live manager would silently restore the lost-write
 * class the harness exists to avoid rather than failing a test. These cover both directions: the
 * seam must delegate, and it must report the no-vault case distinctly instead of pretending it
 * waited. That the provider actually installs it is a separate invariant, covered in
 * `tests/unit/components/vault-provider-persistence-seam.test.tsx`; that its absence is loud is
 * enforced by `tests/e2e/helpers/persistence.ts`.
 *
 * The production gate is covered here too. Nothing else can see it: the E2E harness runs against
 * `pnpm run dev`, so the gate is inactive there in both directions, and typecheck, lint and format
 * are all indifferent to the line. Deleting it would otherwise return the seam to the production
 * bundle with nothing red.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { installLocalPersistenceSeam } from "@/lib/sync/local-persistence-seam";

afterEach(() => {
    delete window.__moneyflowLocalPersistence;
    vi.unstubAllEnvs();
});

describe("installLocalPersistenceSeam", () => {
    it("publishes the barrier on window and removes it on teardown", () => {
        const uninstall = installLocalPersistenceSeam(() => null);

        expect(window.__moneyflowLocalPersistence).toBeDefined();

        uninstall();
        expect(window.__moneyflowLocalPersistence).toBeUndefined();
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

        const seam = window.__moneyflowLocalPersistence;
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

        await window.__moneyflowLocalPersistence?.awaitLocalPersistence();
        active = second;
        await window.__moneyflowLocalPersistence?.awaitLocalPersistence();

        expect(first.awaitLocalPersistence).toHaveBeenCalledTimes(1);
        expect(second.awaitLocalPersistence).toHaveBeenCalledTimes(1);
    });

    it("reports the no-vault case distinctly instead of claiming it waited", async () => {
        installLocalPersistenceSeam(() => null);

        await expect(window.__moneyflowLocalPersistence?.awaitLocalPersistence()).resolves.toBe(
            "no-active-vault"
        );
    });

    it("propagates a rejecting barrier so the harness can retry or fail loudly", async () => {
        const failure = new Error("Local updates remain unacknowledged by encrypted persistence");
        installLocalPersistenceSeam(() => ({
            awaitLocalPersistence: vi.fn(() => Promise.reject(failure))
        }));

        await expect(window.__moneyflowLocalPersistence?.awaitLocalPersistence()).rejects.toThrow(
            failure
        );
    });

    it("installs nothing in a production build", () => {
        vi.stubEnv("NODE_ENV", "production");

        const uninstall = installLocalPersistenceSeam(() => null);

        expect(window.__moneyflowLocalPersistence).toBeUndefined();
        // Still a callable teardown, so a caller's cleanup path is identical in both builds.
        expect(() => {
            uninstall();
        }).not.toThrow();
    });

    it("installs outside a production build", () => {
        vi.stubEnv("NODE_ENV", "development");

        installLocalPersistenceSeam(() => null);

        expect(window.__moneyflowLocalPersistence).toBeDefined();
    });

    it("leaves a newer installation's seam alone when an older one tears down", () => {
        const uninstallFirst = installLocalPersistenceSeam(() => null);
        const uninstallSecond = installLocalPersistenceSeam(() => null);
        const secondSeam = window.__moneyflowLocalPersistence;

        uninstallFirst();
        expect(window.__moneyflowLocalPersistence).toBe(secondSeam);

        uninstallSecond();
        expect(window.__moneyflowLocalPersistence).toBeUndefined();
    });
});

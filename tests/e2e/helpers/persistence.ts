/**
 * Durability E2E Helpers
 *
 * `page.goto` and `page.reload` both tear the document down. A change this suite has already
 * confirmed in the DOM may still be queued for encryption at that instant, and a teardown inside
 * that window discards it: the op row is never written, so the value is absent after the reload and
 * is never pushed to the server either. MEASURED in
 * `specs/007-human-scratch-completion/evidence/P21/diagnostic-Q-P20B-26.md` — 195 runs, 50 losses,
 * zero counterexamples, and inserting a durability wait between the write and the teardown removed
 * the loss entirely (0 in 140 runs).
 *
 * Every teardown that goes through these helpers — `reloadPage` here and every `nav.ts` helper —
 * therefore waits for the running vault to acknowledge its local writes first, as do the individual
 * `page.goto` teardowns that fire with a vault mounted. A raw `page.goto` or `page.reload` written
 * directly in a spec does not: it bypasses this barrier, and after a write it is the shape that
 * loses one. This is a harness barrier, not a product change: it waits for work the app already had
 * in flight.
 */

import type { Page } from "@playwright/test";

const BARRIER_BUDGET_MS = 15_000;
const BARRIER_RETRY_DELAY_MS = 50;

/**
 * First path segment of every route served by `src/app/(app)/`, whose layout mounts `VaultProvider`
 * and therefore the seam. On these routes an absent seam is a defect, not a state; anywhere else —
 * the landing page, `/auth/*`, `/new-user` — no provider mounts and absence is the normal case.
 */
const VAULT_ROUTE_SEGMENTS = [
    "accounts",
    "automations",
    "dashboard",
    "imports",
    "people",
    "settings",
    "statuses",
    "tags",
    "transactions",
    "tx-descriptions"
] as const;

/**
 * Waits until every local document change the running vault has observed is encrypted and appended
 * to IndexedDB.
 *
 * Resolves immediately outside the `(app)` routes — on an auth or landing page nothing can have
 * queued a write. On an `(app)` route the seam is required: `VaultProvider` installs it ahead of the
 * effect that creates the `SyncManager`, so a missing seam means the install is gone and the barrier
 * would otherwise degrade to a silent no-op, which is exactly the failure this helper exists to
 * prevent. Absence is retried first, because a document that has just loaded has not hydrated yet.
 *
 * `awaitLocalPersistence` rejects when the queue it snapshotted has drained while newer updates are
 * still outstanding, which a write landing mid-call produces routinely. Retrying converges on a
 * quiet queue; a genuinely stuck one still fails, loudly, once the budget expires.
 */
export async function awaitVaultPersistence(page: Page): Promise<void> {
    const deadline = Date.now() + BARRIER_BUDGET_MS;
    let lastFailure = "no failure recorded";

    for (;;) {
        // Resolves to the reason to keep waiting, or null once there is nothing left to wait for.
        const failure = await page.evaluate(
            async (vaultRouteSegments: readonly string[]): Promise<string | null> => {
                const seam = window.__moneyflowLocalPersistence;
                if (seam == null) {
                    const path = window.location.pathname;
                    if (!vaultRouteSegments.includes(path.split("/")[1])) return null;
                    return (
                        `no durability seam on ${path}, which VaultProvider must install ` +
                        `(src/components/providers/vault-provider.tsx, src/lib/sync/local-persistence-seam.ts)`
                    );
                }
                try {
                    await seam.awaitLocalPersistence();
                    return null;
                } catch (error) {
                    return error instanceof Error ? error.message : String(error);
                }
            },
            VAULT_ROUTE_SEGMENTS
        );

        if (failure == null) return;

        lastFailure = failure;
        if (Date.now() >= deadline) break;
        await page.waitForTimeout(BARRIER_RETRY_DELAY_MS);
    }

    throw new Error(
        `Vault never acknowledged its local writes within ${BARRIER_BUDGET_MS}ms: ${lastFailure}`
    );
}

/** `page.reload()` behind the durability barrier the helpers in this harness use. */
export async function reloadPage(page: Page): Promise<void> {
    await awaitVaultPersistence(page);
    await page.reload();
}

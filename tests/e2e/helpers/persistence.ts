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
 * Every deliberate teardown in this harness therefore waits for the running vault to acknowledge
 * its local writes first. This is a harness barrier, not a product change: it waits for work the
 * app already had in flight.
 */

import type { Page } from "@playwright/test";

const BARRIER_BUDGET_MS = 15_000;
const BARRIER_RETRY_DELAY_MS = 50;

/**
 * Waits until every local document change the running vault has observed is encrypted and appended
 * to IndexedDB.
 *
 * Resolves immediately when no vault is mounted — on an auth or landing page, or before the first
 * vault opens. The seam is installed by `VaultProvider` ahead of the effect that creates the
 * `SyncManager`, so a manager can never exist without it: an absent seam means nothing was able to
 * queue a write, not that the barrier was missed.
 *
 * `awaitLocalPersistence` rejects when the queue it snapshotted has drained while newer updates are
 * still outstanding, which a write landing mid-call produces routinely. Retrying converges on a
 * quiet queue; a genuinely stuck one still fails, loudly, once the budget expires.
 */
export async function awaitVaultPersistence(page: Page): Promise<void> {
    const deadline = Date.now() + BARRIER_BUDGET_MS;
    let lastFailure = "no failure recorded";

    for (;;) {
        const outcome = await page.evaluate(async () => {
            const seam = window.__moneyflowLocalPersistence;
            if (seam == null) return { kind: "no-seam" } as const;
            try {
                return { kind: await seam.awaitLocalPersistence() } as const;
            } catch (error) {
                return {
                    kind: "rejected",
                    message: error instanceof Error ? error.message : String(error)
                } as const;
            }
        });

        if (outcome.kind !== "rejected") return;
        lastFailure = outcome.message;
        if (Date.now() >= deadline) break;
        await page.waitForTimeout(BARRIER_RETRY_DELAY_MS);
    }

    throw new Error(
        `Vault never acknowledged its local writes within ${BARRIER_BUDGET_MS}ms: ${lastFailure}`
    );
}

/** `page.reload()` behind the durability barrier every other teardown in this harness uses. */
export async function reloadPage(page: Page): Promise<void> {
    await awaitVaultPersistence(page);
    await page.reload();
}

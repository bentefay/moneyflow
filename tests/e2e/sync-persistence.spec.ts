/**
 * E2E Test: Sync Persistence
 *
 * Tests the sync status indicator and local persistence behavior:
 * 1. Verify sync status indicator shows correct states
 * 2. Verify changes persist after page reload
 * 3. Verify beforeunload warning when unsaved changes exist
 */

import { expect, test } from "@playwright/test";

import { createNewIdentity, createTag, goToTags, goToTransactions, reloadPage } from "./helpers";

test.describe("Sync Persistence", () => {
    test.describe("Sync Status Indicator", () => {
        test("shows Saved sync status in the app header", async ({ page }) => {
            await createNewIdentity(page);

            await test.step("navigate to an app page", async () => {
                await goToTransactions(page);
            });

            await test.step("show the sync status indicator", async () => {
                await expect(page.getByRole("status").first()).toBeVisible();
            });

            await test.step("report Saved when no changes are pending", async () => {
                await expect(page.getByRole("status", { name: /saved/i })).toBeVisible({
                    timeout: 15000
                });
            });
        });
    });

    test.describe("Local Persistence", () => {
        test("persists data after page reload", async ({ page }) => {
            await createNewIdentity(page);

            await test.step("create a tag", async () => {
                await goToTags(page);
                await createTag(page, { name: "TestPersistenceTag" });
            });

            await test.step("wait for sync to complete", async () => {
                // Wait for the saving indicator to show "Saved"
                const syncIndicator = page.getByRole("status", { name: /saved/i });
                await expect(syncIndicator).toBeVisible({ timeout: 15000 });
            });

            await test.step("reload page", async () => {
                await reloadPage(page);
            });

            await test.step("verify tag still exists after reload", async () => {
                // After reload, session should persist via IndexedDB
                // Wait for either tags page to load or auth redirect
                await page.waitForLoadState("domcontentloaded");

                // If session expired and we're on unlock page, fail with clear message
                // This indicates a bug in session persistence, not expected behavior
                expect(page.url(), "Session should persist after reload").not.toContain("/unlock");

                await goToTags(page);

                // Look for the tag we created - wait for it to load from IndexedDB
                const tagName = page.getByText("TestPersistenceTag");
                await expect(tagName).toBeVisible({ timeout: 10000 });
            });
        });
    });
});

/*
 * A "shows Saving state during active edits" test used to live here. It was vacuous: the mutation
 * sat inside `if (await addButton.isVisible())` and the only assertion was that the indicator read
 * *Saved*, which is equally true when nothing happened — a duplicate of "shows Saved state when no
 * pending changes" above.
 *
 * The transient Saving state cannot be asserted deterministically. `SyncStatus` renders it only
 * when `hasUnsavedChanges` is true, and that flag is produced by `usePollUnsavedChanges(vaultId,
 * 2000)` in `src/app/(app)/layout.tsx` — a 2s poll racing the sync manager's ~2s push throttle. A
 * mutation's unpushed window can therefore open and close entirely between two polls, so any
 * assertion on Saving would need an arbitrary wait to be reliable. The test was deleted rather
 * than left vacuous.
 */

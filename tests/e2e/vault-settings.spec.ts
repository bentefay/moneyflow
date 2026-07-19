/**
 * E2E Test: Vault Settings
 *
 * Journey-style tests validating:
 * - New users land on settings page after vault creation
 * - Currency selection persists across page refreshes
 * - Existing users (unlock) land on transactions page
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, enterSeedPhrase, goToSettings, goToTransactions } from "./helpers";
import { observeRealtimeLifecycle } from "./helpers/realtime";

// ============================================================================
// Settings-Specific Helpers
// ============================================================================

/**
 * Select a currency from the currency selector dropdown.
 */
async function selectCurrency(page: Page, currencyCode: string): Promise<void> {
    // Click the currency selector button
    const currencyButton = page.getByRole("combobox", { name: /default currency/i });
    await currencyButton.click();

    // Search for the currency
    const searchInput = page.getByPlaceholder(/search currencies/i);
    await searchInput.waitFor({ state: "visible", timeout: 3000 });
    await searchInput.fill(currencyCode);

    // Click the option
    const option = page.getByRole("option", { name: new RegExp(currencyCode, "i") }).first();
    await option.click();

    // Wait for dropdown to close
    await expect(searchInput).not.toBeVisible({ timeout: 2000 });
}

/**
 * Get the currently selected currency code from the currency selector.
 * Button displays code + name (e.g., "USDUS Dollar" as text content).
 */
async function getSelectedCurrency(page: Page): Promise<string> {
    const currencyButton = page.getByRole("combobox", { name: /default currency/i });
    // The code is in the first span with class font-mono - get only the 3-letter code
    const codeSpan = currencyButton.locator(".font-mono");
    return (await codeSpan.textContent()) ?? "";
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Vault Settings", () => {
    test.describe("New User Flow", () => {
        test("should land on settings page after creating new identity", async ({ page }) => {
            await test.step("Create new identity", async () => {
                await createNewIdentity(page);
            });

            await test.step("Verify landed on settings page", async () => {
                // Should be on settings page
                await expect(page).toHaveURL(/\/settings$/);
                await expect(
                    page.getByRole("heading", { name: "Vault Settings", level: 1 })
                ).toBeVisible();
            });

            await test.step("Verify currency selector is visible", async () => {
                const currencySelector = page.getByRole("combobox", { name: /default currency/i });
                await expect(currencySelector).toBeVisible();
            });
        });

        test("should have USD as default currency for new vault", async ({ page }) => {
            await createNewIdentity(page);

            const selectedCurrency = await getSelectedCurrency(page);
            expect(selectedCurrency).toBe("USD");
        });
    });

    test.describe("Currency Selection Persistence", () => {
        test("should persist currency selection after page refresh", async ({ page }) => {
            await test.step("Create identity and navigate to settings", async () => {
                await createNewIdentity(page);
                // Already on settings page after identity creation
            });

            await test.step("Change currency to EUR", async () => {
                await selectCurrency(page, "EUR");
                // Verify selection changed
                const selected = await getSelectedCurrency(page);
                expect(selected).toBe("EUR");
            });

            await test.step("Refresh page and verify persistence", async () => {
                await page.reload();
                await page
                    .getByRole("heading", { name: "Vault Settings", level: 1 })
                    .waitFor({ timeout: 10000 });

                const selectedAfterRefresh = await getSelectedCurrency(page);
                expect(selectedAfterRefresh).toBe("EUR");
            });
        });

        test("should persist currency after navigating away and back", async ({ page }) => {
            await createNewIdentity(page);

            // Change to GBP
            await selectCurrency(page, "GBP");
            expect(await getSelectedCurrency(page)).toBe("GBP");

            // Navigate to transactions
            await goToTransactions(page);
            await expect(page).toHaveURL(/\/transactions$/);

            // Navigate back to settings
            await goToSettings(page);

            // Verify GBP is still selected
            expect(await getSelectedCurrency(page)).toBe("GBP");
        });
    });

    test.describe("Existing User Flow", () => {
        test("same-vault lock then unlock renders on the first attempt", async ({
            page
        }, testInfo) => {
            const browserErrors: string[] = [];
            const trpcRequests: Array<{ method: string; url: string; body: string | null }> = [];
            const realtimeLifecycle = observeRealtimeLifecycle(page);
            page.once("close", realtimeLifecycle.stop);
            page.on("console", (message) => {
                if (message.type() === "error") browserErrors.push(message.text());
            });
            page.on("pageerror", (error) => browserErrors.push(error.message));
            page.on("request", (request) => {
                if (request.url().includes("/api/trpc/")) {
                    trpcRequests.push({
                        method: request.method(),
                        url: request.url(),
                        body: request.postData()
                    });
                }
            });

            const seedWords = await test.step("Create the identity and active vault", async () =>
                createNewIdentity(page));

            await test.step("Lock through the authenticated application control", async () => {
                await page.getByRole("button", { name: "Lock", exact: true }).click();
                await expect(page).toHaveURL(/\/unlock$/);
            });

            await test.step("Unlock the same vault without reloading the browser client", async () => {
                await enterSeedPhrase(page, seedWords, true);
                const unlockButton = page.getByRole("button", { name: /unlock/i });
                await expect(unlockButton).toBeEnabled();
                await unlockButton.click();
                await expect(page).toHaveURL(/\/transactions$/, { timeout: 15000 });
            });

            await test.step("Render the initialized vault on the first post-unlock page", async () => {
                await expect(
                    page.getByRole("textbox", { name: /search description/i })
                ).toBeVisible({ timeout: 15000 });
                await expect(page.getByRole("button", { name: "Add transaction" })).toBeVisible();
                await expect(page.getByRole("status")).toHaveAccessibleName("Saved");
                await expect(page.getByText("Failed to load vault", { exact: false })).toHaveCount(
                    0
                );
                expect(browserErrors).toEqual([]);
            });

            await test.step("attribute same-vault lock and unlock lifecycle", async () => {
                const counts = realtimeLifecycle.snapshot();
                testInfo.annotations.push({
                    type: "realtime-lock-lifecycle",
                    description: JSON.stringify(counts)
                });
                expect(counts.authorize.sync).toBeLessThanOrEqual(2);
                expect(counts.authorize.presence).toBeLessThanOrEqual(2);
                expect(counts.revoke.sync).toBeGreaterThanOrEqual(1);
                expect(counts.revoke.presence).toBeGreaterThanOrEqual(1);
            });

            await test.step("Keep unlock identity and vault metadata out of request URLs", async () => {
                expect(trpcRequests.length).toBeGreaterThan(0);
                for (const request of trpcRequests) {
                    const url = new URL(request.url);
                    expect(request.method).toBe("POST");
                    expect(url.searchParams.has("input")).toBe(false);
                    expect(url.href).not.toContain("pubkeyHash");
                    expect(url.href).not.toContain("vaultId");
                    expect(url.href).not.toContain("versionVector");
                    expect(url.href).not.toContain("hasUnpushed");
                }

                const unlockRequest = trpcRequests.find((request) =>
                    new URL(request.url).pathname.includes("user.getOrCreate")
                );
                expect(unlockRequest?.body).toBeTruthy();
                expect(unlockRequest?.body).not.toContain("pubkeyHash");
            });

            realtimeLifecycle.stop();
        });
    });

    test.describe("Vault Name", () => {
        test("should update vault name in header when renamed in settings", async ({ page }) => {
            await createNewIdentity(page);

            // Verify initial vault name in header vault selector (wait for CRDT to load)
            const vaultSelector = page.locator("button").filter({ hasText: "My Vault" }).first();
            await expect(vaultSelector).toBeVisible({ timeout: 10000 });

            // Find and update the vault name input
            const vaultNameInput = page.getByLabel(/vault name/i);
            await expect(vaultNameInput).toBeVisible();
            await expect(vaultNameInput).toHaveValue("My Vault");

            // Clear and type new name
            await vaultNameInput.clear();
            await vaultNameInput.fill("Personal Finance");

            // Verify the header vault selector updates with the new name
            await expect(
                page.locator("button").filter({ hasText: "Personal Finance" }).first()
            ).toBeVisible({ timeout: 3000 });

            // Verify persistence after refresh
            await page.reload();
            await page
                .getByRole("heading", { name: "Vault Settings", level: 1 })
                .waitFor({ timeout: 10000 });

            // Both the input and header should show the new name
            await expect(page.getByLabel(/vault name/i)).toHaveValue("Personal Finance");
            await expect(
                page.locator("button").filter({ hasText: "Personal Finance" }).first()
            ).toBeVisible();
        });
    });

    test.describe("Navigation", () => {
        test("should access settings via sidebar navigation", async ({ page }) => {
            await createNewIdentity(page);

            // Navigate away first
            await goToTransactions(page);

            // Click settings link in sidebar
            const settingsLink = page.getByRole("link", { name: /vault settings/i });
            await settingsLink.click();

            await expect(page).toHaveURL(/\/settings$/);
            await expect(
                page.getByRole("heading", { name: "Vault Settings", level: 1 })
            ).toBeVisible();
        });

        test("dashboard should redirect to transactions", async ({ page }) => {
            await createNewIdentity(page);

            // Try to navigate to dashboard
            await page.goto("/dashboard");

            // Should be redirected to transactions
            await page.waitForURL("**/transactions", { timeout: 10000 });
        });
    });
});

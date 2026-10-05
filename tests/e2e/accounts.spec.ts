/**
 * E2E Test: Accounts Management
 *
 * Journey-style tests that validate complete user flows for account
 * management, including currency inheritance and inline editing.
 *
 * The vault's default currency is inferred from the browser's time zone, so the time zone is pinned
 * to a US one to keep the inherited USD assertions deterministic on any host. Currency inference
 * itself is covered in `onboarding-vault.spec.ts`.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToAccounts } from "./helpers";

test.use({ timezoneId: "America/New_York" });

// ============================================================================
// Account-Specific Helpers
// ============================================================================

/**
 * Get the account row element by account name.
 */
function getAccountRow(page: Page, accountName: string) {
    return page.getByRole("row").filter({ hasText: accountName });
}

/**
 * Get the currency cell contents for an account.
 */
async function getAccountCurrencyDisplay(page: Page, accountName: string) {
    const row = getAccountRow(page, accountName);
    // The currency is in a w-32 div with text-center class
    const currencyCell = row.locator("div.w-32.text-center");
    const text = await currencyCell.textContent();
    return text?.trim() || "";
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Accounts Page - Currency Display", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToAccounts(page);
    });

    test("default account shows inherited currency with indicator", async ({ page }) => {
        await test.step("verify default account exists", async () => {
            // Default account should be present after vault creation
            // Use exact match to avoid matching "(default)" indicator
            await expect(page.getByText("Default", { exact: true })).toBeVisible();
        });

        await test.step("verify currency shows with (default) indicator", async () => {
            // The default account inherits currency from vault default (USD)
            const currencyDisplay = await getAccountCurrencyDisplay(page, "Default");

            // Should show the currency code
            expect(currencyDisplay).toContain("USD");

            // Should show the "(default)" indicator since it's inherited
            expect(currencyDisplay).toContain("(default)");
        });
    });
});

test.describe("Accounts Page - Create Account", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToAccounts(page);
    });

    test("new account inherits currency from vault default", async ({ page }) => {
        await test.step("click add account button", async () => {
            await page.getByRole("button", { name: /add account/i }).click();
        });

        await test.step("enter account name and submit", async () => {
            const nameInput = page.getByPlaceholder(/account name/i);
            await nameInput.fill("Test Account");
            await page.getByRole("button", { name: /^add$/i }).click();
        });

        await test.step("verify new account shows inherited currency", async () => {
            // New account should show with (default) indicator since no explicit currency
            const currencyDisplay = await getAccountCurrencyDisplay(page, "Test Account");
            expect(currencyDisplay).toContain("USD");
            expect(currencyDisplay).toContain("(default)");
        });
    });
});

test.describe("Accounts Page - Inline Editing", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToAccounts(page);
    });

    test("cancels and commits inline account edits", async ({ page }) => {
        test.setTimeout(60_000);

        await test.step("cancel a name edit with Escape", async () => {
            await page.getByText("Default", { exact: true }).click();
            const nameInput = page.getByPlaceholder(/account name/i);
            await nameInput.fill("Should Not Save");
            await nameInput.press("Escape");

            await expect(page.getByText("Default", { exact: true })).toBeVisible();
            await expect(page.getByText("Should Not Save")).not.toBeVisible();
        });

        await test.step("commit a name edit with Enter", async () => {
            await page.getByText("Default", { exact: true }).click();
            const nameInput = page.getByPlaceholder(/account name/i);
            await nameInput.fill("Renamed Account");
            await nameInput.press("Enter");

            await expect(page.getByText("Renamed Account", { exact: true })).toBeVisible();
        });

        await test.step("commit an account type selection", async () => {
            await page.getByText("Checking", { exact: true }).click();
            await page.locator("select").selectOption("savings");

            await expect(page.getByText("Savings", { exact: true })).toBeVisible();
        });
    });
});

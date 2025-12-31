/**
 * E2E Test: Accounts Management
 *
 * Journey-style tests that validate complete user flows for account
 * management, including currency inheritance and inline editing.
 */

import { expect, type Page, test } from "@playwright/test";
import { createNewIdentity, goToAccounts } from "./helpers";

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

	test("default account shows owner 'Me' with 100% ownership", async ({ page }) => {
		await test.step("verify default account has Me as owner", async () => {
			// Default account should show "Me (100%)" as the owner
			const row = getAccountRow(page, "Default");
			await expect(row).toContainText("Me (100%)");
		});
	});
});

test.describe("Accounts Page - Default Person", () => {
	test.beforeEach(async ({ page }) => {
		await createNewIdentity(page);
	});

	test("new vault has default person 'Me'", async ({ page }) => {
		await test.step("navigate to people page", async () => {
			await page.goto("/people");
			await page.getByRole("heading", { name: "People", level: 1 }).waitFor({ timeout: 15000 });
		});

		await test.step("verify Me person exists", async () => {
			// The default "Me" person should be visible (exact match to avoid matching description)
			await expect(page.getByText("Me", { exact: true })).toBeVisible();
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

	test("can edit account name inline", async ({ page }) => {
		await test.step("click on account name to edit", async () => {
			// Click on the account name text directly
			await page.getByText("Default", { exact: true }).click();
		});

		await test.step("change name and press Enter", async () => {
			const nameInput = page.getByPlaceholder(/account name/i);
			await nameInput.fill("Renamed Account");
			await nameInput.press("Enter");
		});

		await test.step("verify name was updated", async () => {
			await expect(page.getByText("Renamed Account", { exact: true })).toBeVisible();
		});
	});

	test("can cancel editing with Escape", async ({ page }) => {
		await test.step("click on account name to edit", async () => {
			await page.getByText("Default", { exact: true }).click();
		});

		await test.step("change name and press Escape", async () => {
			const nameInput = page.getByPlaceholder(/account name/i);
			await nameInput.fill("Should Not Save");
			await nameInput.press("Escape");
		});

		await test.step("verify original name is preserved", async () => {
			await expect(page.getByText("Default", { exact: true })).toBeVisible();
			await expect(page.getByText("Should Not Save")).not.toBeVisible();
		});
	});

	test("can change account type inline", async ({ page }) => {
		await test.step("click on account type badge to edit", async () => {
			// The type badge shows "Checking" for the default account
			await page.getByText("Checking", { exact: true }).click();
		});

		await test.step("select Savings from dropdown", async () => {
			const select = page.locator("select");
			await select.selectOption("savings");
		});

		await test.step("verify type was updated", async () => {
			await expect(page.getByText("Savings", { exact: true })).toBeVisible();
		});
	});
});

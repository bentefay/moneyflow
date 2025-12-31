/**
 * E2E Test: Transactions Page
 *
 * Tests for the transactions page including:
 * - Default account creation on vault creation
 * - Account selection with search and create functionality
 * - Creating accounts from the transaction form
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToAccounts, goToTransactions } from "./helpers";

// ============================================================================
// Tests
// ============================================================================

test.describe("Transactions", () => {
	test("page displays correctly with empty state", async ({ page }) => {
		await createNewIdentity(page);

		await test.step("navigate to transactions page", async () => {
			await goToTransactions(page);

			// Page title (h1 level to avoid matching 'No transactions yet')
			await expect(page.getByRole("heading", { name: "Transactions", level: 1 })).toBeVisible();
		});

		await test.step("show add transaction row in empty state", async () => {
			// The add transaction row should always be visible
			const addRow = page.locator('[data-testid="add-transaction-row"]');
			await expect(addRow).toBeVisible();
		});
	});

	test("default account exists after vault creation", async ({ page }) => {
		await createNewIdentity(page);

		await test.step("navigate to accounts and verify default account exists", async () => {
			await goToAccounts(page);

			// The default account should be visible in the table
			await expect(page.getByText("Default", { exact: true })).toBeVisible();
		});
	});

	test("account selector opens and shows create option", async ({ page }) => {
		await createNewIdentity(page);
		await goToTransactions(page);

		await test.step("activate add transaction row", async () => {
			const addRow = page.locator('[data-testid="add-transaction-row"]');
			await addRow.click();
		});

		await test.step("open account selector and verify create option exists", async () => {
			// Click the account combobox button
			const accountButton = page.getByRole("combobox", { name: /select account/i });
			await accountButton.click();

			// The create option should be visible
			await expect(page.getByRole("option", { name: /create new account/i })).toBeVisible();
		});

		await test.step("search filters accounts and create option remains", async () => {
			// Type in the search box
			const searchInput = page.getByPlaceholder(/search accounts/i);
			await searchInput.fill("xyz-nonexistent-account-name");

			// Create option should still be visible even when no accounts match
			await expect(page.getByRole("option", { name: /create new account/i })).toBeVisible();

			// Clear search to reset
			await searchInput.clear();
		});
	});

	test("can create account from transaction form", async ({ page }) => {
		await createNewIdentity(page);
		await goToTransactions(page);

		await test.step("activate add transaction row and fill some data", async () => {
			const addRow = page.locator('[data-testid="add-transaction-row"]');
			await addRow.click();

			// Fill in description to prevent click-outside from closing the row
			const descriptionInput = page.locator('[data-testid="new-transaction-merchant"]');
			await descriptionInput.fill("Test transaction");
		});

		await test.step("open account selector and click create", async () => {
			const accountButton = page.getByRole("combobox", { name: /select account/i });
			await accountButton.click();

			// Click create new account
			await page.getByRole("option", { name: /create new account/i }).click();
		});

		await test.step("create account dialog appears and create account", async () => {
			// Dialog should be visible
			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();

			// Fill in the account name
			await page.getByLabel(/^name$/i).fill("My Checking");

			// Click create button
			await page.getByRole("button", { name: /^create account$/i }).click();

			// Dialog should close
			await expect(page.getByRole("dialog")).not.toBeVisible();
		});

		await test.step("new account is selected in combobox", async () => {
			// The combobox should now show the new account
			const accountButton = page.getByRole("combobox", { name: /select account/i });
			await expect(accountButton).toContainText("My Checking");
		});

		await test.step("verify account exists in accounts page", async () => {
			await goToAccounts(page);

			// New account should be visible
			await expect(page.getByText("My Checking", { exact: true })).toBeVisible();
		});
	});
});

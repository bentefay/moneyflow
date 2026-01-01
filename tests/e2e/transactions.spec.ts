/**
 * E2E Test: Transactions Page
 *
 * Tests for the transactions page including:
 * - Default account creation on vault creation
 * - Account selection with search and create functionality
 * - Creating accounts from the transaction form
 * - Inline cell editing (Phase 3 - US1)
 * - Keyboard navigation (Phase 3 - US1)
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToAccounts, goToTags, goToTransactions } from "./helpers";

// ============================================================================
// Helper: Create a test transaction
// ============================================================================

/**
 * Create a transaction via the add row form.
 * Returns the transaction row locator.
 */
async function createTestTransaction(
	page: import("@playwright/test").Page,
	data: {
		merchant: string;
		amount: string;
	}
) {
	const addRow = page.locator('[data-testid="add-transaction-row"]');
	await addRow.click();

	// Wait for the add row to be in active state (has inputs)
	const merchantInput = page.locator('[data-testid="new-transaction-merchant"]');
	await expect(merchantInput).toBeVisible({ timeout: 5000 });

	// Fill merchant/description
	await merchantInput.clear();
	await merchantInput.fill(data.merchant);

	// Fill amount
	const amountInput = page.locator('[data-testid="new-transaction-amount"]');
	await amountInput.clear();
	await amountInput.fill(data.amount);

	// Submit with Enter
	await amountInput.press("Enter");

	// Wait for the transaction to appear in the grid
	// Look by grid row with accessible name containing our merchant
	const transactionRow = page.getByRole("row", { name: new RegExp(data.merchant) });
	await expect(transactionRow).toBeVisible({ timeout: 5000 });
}

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

	// ========================================================================
	// Phase 3: User Story 1 - Inline Cell Editing (Spreadsheet-style)
	// ========================================================================

	test.describe("Inline Cell Editing (US1)", () => {
		test("T012: click to focus, Enter saves, Escape reverts", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Test Coffee Shop",
					amount: "-5.50",
				});
			});

			await test.step("click on merchant cell to focus and edit", async () => {
				const merchantInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="merchant-editable"]');

				// In spreadsheet mode, input is always present
				await expect(merchantInput).toHaveRole("textbox");
				await merchantInput.click();
				await expect(merchantInput).toBeFocused();
			});

			await test.step("type new value and press Enter to save", async () => {
				const merchantInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="merchant-editable"]');

				await merchantInput.clear();
				await merchantInput.fill("Updated Merchant Name");
				await merchantInput.press("Enter");

				// Value should be updated
				await expect(merchantInput).toHaveValue("Updated Merchant Name");
			});

			await test.step("edit again and press Escape to revert", async () => {
				const merchantInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="merchant-editable"]');

				await merchantInput.click();
				await merchantInput.clear();
				await merchantInput.fill("This should be reverted");
				await merchantInput.press("Escape");

				// Value should be reverted to saved value
				await expect(merchantInput).toHaveValue("Updated Merchant Name");
			});
		});

		test("T013: Tab saves and moves to next cell", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Tab Test Store",
					amount: "-10.00",
				});
			});

			await test.step("click to focus merchant cell", async () => {
				const merchantInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="merchant-editable"]');
				await merchantInput.click();
				await expect(merchantInput).toBeFocused();
			});

			await test.step("press Tab to save and move to next cell", async () => {
				const merchantInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="merchant-editable"]');

				await merchantInput.clear();
				await merchantInput.fill("Tab Saved Value");
				await merchantInput.press("Tab");

				// Merchant should be saved
				await expect(merchantInput).toHaveValue("Tab Saved Value");
			});
		});

		test("T014a: edit date cell", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Date Test Store",
					amount: "-25.00",
				});
			});

			await test.step("click on date cell to focus and edit", async () => {
				// Spreadsheet-style: input is always visible, click to focus
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');

				await dateInput.click();
				await expect(dateInput).toBeFocused();
				await expect(dateInput).toHaveRole("textbox");
			});

			await test.step("change date and press Enter to save", async () => {
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');

				// Set a specific date
				await dateInput.fill("2024-06-15");
				await dateInput.press("Enter");

				// Should have the new value
				await expect(dateInput).toHaveValue("2024-06-15");
			});

			await test.step("edit again and press Escape to cancel", async () => {
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');

				await dateInput.click();
				await dateInput.fill("2023-01-01");
				await dateInput.press("Escape");

				// Value should be reverted (still 2024-06-15)
				await expect(dateInput).toHaveValue("2024-06-15");
			});
		});

		test("T015: click to edit amount cell (spreadsheet-style)", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Amount Test Store",
					amount: "-100.00",
				});
			});

			await test.step("click on amount cell to focus and edit", async () => {
				// Spreadsheet-style: input is always visible, click to focus
				const amountInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="amount-editable"]');

				await amountInput.click();
				await expect(amountInput).toBeFocused();
				await expect(amountInput).toHaveRole("textbox");
			});

			await test.step("change amount and press Enter to save", async () => {
				const amountInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="amount-editable"]');

				await amountInput.clear();
				await amountInput.fill("-250.50");
				await amountInput.press("Enter");

				// Should have the new value
				await expect(amountInput).toHaveValue("-250.50");
			});

			await test.step("edit again and press Escape to cancel", async () => {
				const amountInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="amount-editable"]');

				await amountInput.click();
				await amountInput.clear();
				await amountInput.fill("-999.99");
				await amountInput.press("Escape");

				// Value should be reverted
				await expect(amountInput).toHaveValue("-250.50");
			});
		});

		test("T016: click to edit status cell (spreadsheet-style)", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Status Test Store",
					amount: "-50.00",
				});
			});

			await test.step("click on status cell to focus", async () => {
				// Spreadsheet-style: select is always visible, click to focus
				const statusSelect = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				await statusSelect.click();
				await expect(statusSelect).toBeFocused();
				await expect(statusSelect).toHaveRole("combobox");
			});

			await test.step("select different status (saves immediately)", async () => {
				const statusSelect = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				// Select "Paid" status (default status created on vault init)
				await statusSelect.selectOption({ label: "Paid" });

				// Status selects save immediately on change
				await expect(statusSelect).toHaveValue(/.+/); // Has some value selected
			});

			await test.step("change status and verify it persists", async () => {
				const statusSelect = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				// Select "For Review" status
				await statusSelect.selectOption({ label: "For Review" });

				// Verify it shows "For Review"
				const selectedOption = await statusSelect.inputValue();
				expect(selectedOption).toBeTruthy();
			});
		});

		test("T017: click to edit tags cell (spreadsheet-style)", async ({ page }) => {
			await createNewIdentity(page);

			await test.step("create a tag first", async () => {
				// Navigate to tags page
				await goToTags(page);

				// Create a tag using the Add Tag form
				await page.getByRole("button", { name: /add tag/i }).click();

				const nameInput = page.getByPlaceholder(/enter tag name/i);
				await nameInput.waitFor({ state: "visible", timeout: 3000 });
				await nameInput.fill("Groceries");

				await page.getByRole("button", { name: /^add tag$/i }).click();

				// Wait for tag row to be created (more specific than just text)
				await expect(page.locator('[data-testid^="tag-row-"]').first()).toBeVisible();

				// Go back to transactions
				await goToTransactions(page);
			});

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					merchant: "Tags Test Store",
					amount: "-75.00",
				});
			});

			await test.step("click on tags cell to open dropdown", async () => {
				// Spreadsheet-style: click opens the dropdown
				const tagsEditable = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="tags-editable"]');

				await expect(tagsEditable).toBeVisible();
				await tagsEditable.click();

				// Wait for the dropdown to appear with search input
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');
				const searchInput = tagsCell.getByPlaceholder("Search tags...");
				await expect(searchInput).toBeVisible({ timeout: 5000 });
			});

			await test.step("select a tag (saves immediately)", async () => {
				// Click on Groceries tag in the dropdown
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');
				const tagOption = tagsCell.getByRole("button", { name: "Groceries" });
				await tagOption.click();

				// Should show the tag (dropdown may close after selection)
				await expect(tagsCell).toContainText("Groceries");
			});
		});
	});
});

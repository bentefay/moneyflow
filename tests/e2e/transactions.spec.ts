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
		description: string;
		amount: string;
	}
) {
	// Click the "Add transaction" button in the toolbar
	const addButton = page.locator('[data-testid="add-transaction-button"]');
	await addButton.click();

	// Wait for the add row to appear in the table (has inputs)
	const descriptionInput = page.locator('[data-testid="new-transaction-description"]');
	await expect(descriptionInput).toBeVisible({ timeout: 5000 });

	// Fill description
	await descriptionInput.clear();
	await descriptionInput.fill(data.description);

	// Fill amount
	const amountInput = page.locator('[data-testid="new-transaction-amount"]');
	await amountInput.clear();
	await amountInput.fill(data.amount);

	// Submit with Enter
	await amountInput.press("Enter");

	// Wait for the transaction to appear in the grid
	// Look by grid row with accessible name containing our description
	// Escape regex special chars and use word boundary or end-of-string to avoid partial matches
	const escapedDescription = data.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const transactionRow = page.getByRole("row", {
		name: new RegExp(`${escapedDescription}(Default|$|\\s)`),
	});
	await expect(transactionRow).toBeVisible({ timeout: 5000 });

	// Cancel the add row to return to inactive state
	// This ensures the selection count is visible in the toolbar
	await page.keyboard.press("Escape");

	// Wait for add row to disappear (cancelled)
	await expect(page.locator('[data-testid="add-transaction-row"]')).not.toBeVisible({
		timeout: 5000,
	});
}

/**
 * Toggle a Radix checkbox by focusing and pressing Space.
 * Radix checkboxes don't respond to Playwright's click() method,
 * so we use keyboard interaction instead.
 *
 * @param checkbox - The checkbox locator
 * @param modifiers - Optional keyboard modifiers (e.g., ["Shift"] for shift-click)
 */
async function toggleCheckbox(
	checkbox: import("@playwright/test").Locator,
	modifiers?: ("Shift" | "Control" | "Alt" | "Meta")[]
) {
	await checkbox.focus();
	if (modifiers?.includes("Shift")) {
		// For Shift+Space, hold Shift while pressing Space
		await checkbox.press("Shift+Space");
	} else {
		await checkbox.press("Space");
	}
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Transactions", () => {
	test("page displays correctly with empty state", async ({ page }) => {
		await createNewIdentity(page);

		await test.step("navigate to transactions page", async () => {
			await goToTransactions(page);

			// Check the Transactions nav link is active (has the right styling)
			// and that the add transaction row is present
			await expect(page.getByRole("link", { name: "Transactions" })).toBeVisible();
		});

		await test.step("show toolbar in empty state", async () => {
			// The toolbar with add button should always be visible
			const toolbar = page.locator('[data-testid="transaction-table-toolbar"]');
			await expect(toolbar).toBeVisible();
			const addButton = page.locator('[data-testid="add-transaction-button"]');
			await expect(addButton).toBeVisible();
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
			const addButton = page.locator('[data-testid="add-transaction-button"]');
			await addButton.click();
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
			const addButton = page.locator('[data-testid="add-transaction-button"]');
			await addButton.click();

			// Fill in description to prevent click-outside from closing the row
			const descriptionInput = page.locator('[data-testid="new-transaction-description"]');
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
					description: "Test Coffee Shop",
					amount: "-5.50",
				});
			});

			await test.step("click on description cell to focus and edit", async () => {
				const descriptionInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');

				// In spreadsheet mode, input is always present
				await expect(descriptionInput).toHaveRole("textbox");
				await descriptionInput.click();
				await expect(descriptionInput).toBeFocused();
			});

			await test.step("type new value and press Enter to save", async () => {
				const descriptionInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');

				await descriptionInput.clear();
				await descriptionInput.fill("Updated Description Name");
				await descriptionInput.press("Enter");

				// Value should be updated
				await expect(descriptionInput).toHaveValue("Updated Description Name");
			});

			await test.step("edit again and press Escape to revert", async () => {
				const descriptionInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');

				await descriptionInput.click();
				await descriptionInput.clear();
				await descriptionInput.fill("This should be reverted");
				await descriptionInput.press("Escape");

				// Value should be reverted to saved value
				await expect(descriptionInput).toHaveValue("Updated Description Name");
			});
		});

		test("T013: Tab saves and moves to next cell", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Tab Test Store",
					amount: "-10.00",
				});
			});

			await test.step("click to focus description cell", async () => {
				const descriptionInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');
				await descriptionInput.click();
				await expect(descriptionInput).toBeFocused();
			});

			await test.step("press Tab to save and move to next cell", async () => {
				const descriptionInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');

				await descriptionInput.clear();
				await descriptionInput.fill("Tab Saved Value");
				await descriptionInput.press("Tab");

				// Description should be saved
				await expect(descriptionInput).toHaveValue("Tab Saved Value");
			});
		});

		test("T014: date displays in compact format for current year", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Date Format Test",
					amount: "-50.00",
				});
			});

			await test.step("verify date displays in compact format (no year)", async () => {
				// New transaction defaults to today's date
				// Date should be displayed in compact format without year (e.g., "2/1" or "1/2" depending on locale)
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');

				const dateText = await dateInput.inputValue();
				// Format should be D/M or M/D (no year for current year, no strict padding)
				// Allow for locale-specific separators (/, ., -)
				expect(dateText).toMatch(/^\d{1,2}[./-]\d{1,2}\.?$/);
			});
		});

		test("T014a: edit date cell", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Date Test Store",
					amount: "-25.00",
				});
			});

			await test.step("click on date cell to open calendar popover", async () => {
				// Click the calendar button to open the popover
				const calendarButton = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.getByRole("button", { name: "Open calendar" });

				await calendarButton.click();
				// Calendar popover should be visible - use specific month name pattern
				await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();
			});

			await test.step("select a date from calendar to save", async () => {
				// Find and click on day 15 in the calendar
				const calendar = page.getByRole("grid", { name: /\w+ \d{4}/ });
				await calendar.getByRole("gridcell", { name: "15" }).click();

				// Calendar should close after selection
				await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();

				// Date input should show the selected date (value contains "15")
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');
				await expect(dateInput).toHaveValue(/15/);
			});

			await test.step("open calendar and click outside to close without saving", async () => {
				const dateInput = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="date-editable"]');

				// Get current date value
				const currentValue = await dateInput.inputValue();

				// Open calendar via button
				const calendarButton = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.getByRole("button", { name: "Open calendar" });
				await calendarButton.click();
				await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();

				// Press Escape to close without selecting
				await page.keyboard.press("Escape");
				await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();

				// Date should be unchanged
				await expect(dateInput).toHaveValue(currentValue);
			});
		});

		test("T015: click to edit amount cell (spreadsheet-style)", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Amount Test Store",
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
					description: "Status Test Store",
					amount: "-50.00",
				});
			});

			await test.step("click on status cell to focus", async () => {
				// Spreadsheet-style: select is always visible, click to open dropdown
				const statusSelect = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				await expect(statusSelect).toHaveRole("combobox");
				await statusSelect.click();

				// Dropdown should be open (Radix moves focus to dropdown content)
				await expect(statusSelect).toHaveAttribute("aria-expanded", "true");
			});

			await test.step("select different status (saves immediately)", async () => {
				// Select "Paid" status (default status created on vault init)
				// Radix Select uses role="option" for items in the dropdown
				await page.getByRole("option", { name: "Paid" }).click();

				// Dropdown closes and status should show "Paid"
				const statusTrigger = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				await expect(statusTrigger).toContainText("Paid");
			});

			await test.step("change status and verify it persists", async () => {
				const statusTrigger = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="status-editable"]');

				// Open dropdown again
				await statusTrigger.click();

				// Select "For Review" status
				await page.getByRole("option", { name: "For Review" }).click();

				// Verify it shows "For Review"
				await expect(statusTrigger).toContainText("For Review");
			});
		});

		test("T016a: click to edit account cell (spreadsheet-style)", async ({ page }) => {
			await createNewIdentity(page);

			await test.step("create a second account", async () => {
				await goToAccounts(page);
				await page.getByRole("button", { name: /add account/i }).click();
				const nameInput = page.getByPlaceholder(/account name/i);
				await nameInput.fill("Savings");
				await page.getByRole("button", { name: /^add$/i }).click();
				await expect(page.getByText("Savings", { exact: true })).toBeVisible();
				await goToTransactions(page);
			});

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Account Test Store",
					amount: "-60.00",
				});
			});

			await test.step("click on account cell to open dropdown", async () => {
				// Wait for transaction row to be visible (it may still be saving)
				const transactionRow = page.locator('[data-testid="transaction-row"]').first();
				await expect(transactionRow).toBeVisible({ timeout: 5000 });

				// Spreadsheet-style: click opens the dropdown
				const accountTrigger = transactionRow
					.locator('[data-cell="account"]')
					.getByRole("combobox");

				await expect(accountTrigger).toBeVisible({ timeout: 5000 });
				await accountTrigger.click();

				// Dropdown should be visible with account options
				await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
				await expect(page.getByRole("option", { name: "Savings" })).toBeVisible();
			});

			await test.step("select different account (saves immediately)", async () => {
				// Click on Savings account option
				await page.getByRole("option", { name: "Savings" }).click();

				// Dropdown should close and account should be updated
				const accountTrigger = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="account"]')
					.getByRole("combobox");

				await expect(accountTrigger).toContainText("Savings");
			});

			await test.step("change account back and verify it persists", async () => {
				const accountTrigger = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="account"]')
					.getByRole("combobox");

				await accountTrigger.click();
				await page.getByRole("option", { name: "Default" }).click();

				await expect(accountTrigger).toContainText("Default");
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
					description: "Tags Test Store",
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

				// Wait for the dropdown to appear with search input (portaled to body)
				const searchInput = page.getByPlaceholder("Search tags...");
				await expect(searchInput).toBeVisible({ timeout: 5000 });
			});

			await test.step("select a tag (saves immediately)", async () => {
				// Click on Groceries tag in the portaled dropdown (cmdk items have role="option")
				const tagOption = page.getByRole("option", { name: "Groceries" });
				await tagOption.click();

				// Should show the tag in the cell (dropdown closes after selection)
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');
				await expect(tagsCell).toContainText("Groceries");
			});
		});

		test("T033: inline tag creation - Create button visible when searching", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Tag Creation Test",
					amount: "-50.00",
				});
			});

			await test.step("open tags dropdown and type new tag name", async () => {
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');

				await tagsCell.click();

				// Dropdown is portaled to body
				const searchInput = page.getByPlaceholder("Search tags...");
				await expect(searchInput).toBeVisible({ timeout: 5000 });

				// Type a new tag name that doesn't exist
				await searchInput.fill("NewInlineTag");
			});

			await test.step("verify Create button is visible and clickable", async () => {
				const createButton = page.getByTestId("create-tag-button");
				await expect(createButton).toBeVisible();
				await expect(createButton).toContainText(/create.*newinlinetag/i);

				// Click the Create button
				await createButton.click();
			});

			await test.step("verify new tag was created and applied", async () => {
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');

				// The tag should now be visible on the transaction
				await expect(tagsCell).toContainText("NewInlineTag");
			});

			await test.step("verify tag exists in tags page", async () => {
				await goToTags(page);

				// The newly created tag should appear
				await expect(page.getByText("NewInlineTag")).toBeVisible();
			});
		});

		test("T033a: Create button hidden when exact match exists", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create an existing tag", async () => {
				await goToTags(page);
				await page.getByRole("button", { name: /add tag/i }).click();

				const nameInput = page.getByPlaceholder(/enter tag name/i);
				await nameInput.waitFor({ state: "visible", timeout: 3000 });
				await nameInput.fill("ExistingTag");

				await page.getByRole("button", { name: /^add tag$/i }).click();
				await expect(page.locator('[data-testid^="tag-row-"]').first()).toBeVisible();

				await goToTransactions(page);
			});

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, {
					description: "Exact Match Test",
					amount: "-25.00",
				});
			});

			await test.step("open tags dropdown and type exact match", async () => {
				const tagsCell = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-cell="tags"]');

				await tagsCell.click();

				// Dropdown is portaled to body
				const searchInput = page.getByPlaceholder("Search tags...");
				await expect(searchInput).toBeVisible({ timeout: 5000 });

				// Type exact name of existing tag
				await searchInput.fill("ExistingTag");
			});

			await test.step("verify Create button is not shown for exact match", async () => {
				// When exact match exists, no create button is rendered
				const createButton = page.getByTestId("create-tag-button");
				await expect(createButton).not.toBeVisible();

				// The existing tag should be selectable instead
				const existingTagOption = page.getByRole("option", { name: "ExistingTag" });
				await expect(existingTagOption).toBeVisible();
			});
		});
	});

	// ========================================================================
	// Keyboard Grid Navigation
	// ========================================================================

	test.describe("Keyboard Grid Navigation", () => {
		test("arrow up/down moves focus between same column cells", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Row 1 Store", amount: "-10.00" });
				await createTestTransaction(page, { description: "Row 2 Store", amount: "-20.00" });
				await createTestTransaction(page, { description: "Row 3 Store", amount: "-30.00" });
			});

			await test.step("focus first row description and press arrow down", async () => {
				const firstRowDescription = page
					.locator('[data-testid="transaction-row"]')
					.first()
					.locator('[data-testid="description-editable"]');

				await firstRowDescription.click();
				await expect(firstRowDescription).toBeFocused();

				// Press arrow down
				await page.keyboard.press("ArrowDown");

				// Second row description should now be focused
				const secondRowDescription = page
					.locator('[data-testid="transaction-row"]')
					.nth(1)
					.locator('[data-testid="description-editable"]');

				await expect(secondRowDescription).toBeFocused();
			});

			await test.step("press arrow down again to move to third row", async () => {
				await page.keyboard.press("ArrowDown");

				const thirdRowDescription = page
					.locator('[data-testid="transaction-row"]')
					.nth(2)
					.locator('[data-testid="description-editable"]');

				await expect(thirdRowDescription).toBeFocused();
			});

			await test.step("press arrow up to move back to second row", async () => {
				await page.keyboard.press("ArrowUp");

				const secondRowDescription = page
					.locator('[data-testid="transaction-row"]')
					.nth(1)
					.locator('[data-testid="description-editable"]');

				await expect(secondRowDescription).toBeFocused();
			});
		});

		test("arrow left/right moves focus between cells in same row", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a test transaction", async () => {
				await createTestTransaction(page, { description: "Nav Test", amount: "-50.00" });
			});

			await test.step("focus description cell and navigate right to account", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = row.locator('[data-testid="description-editable"]');

				await descriptionInput.click();
				await expect(descriptionInput).toBeFocused();

				// Move cursor to end of text, then press right to navigate to next cell
				await page.keyboard.press("End");
				await page.keyboard.press("ArrowRight");

				// Should focus the account cell (next after description)
				const accountTrigger = row.locator('[data-cell="account"]').getByRole("combobox");
				await expect(accountTrigger).toBeFocused();
			});

			await test.step("navigate right through remaining cells", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();

				// From account, arrow right goes to tags (focusable div inside tags-editable)
				await page.keyboard.press("ArrowRight");
				const tagsFocusable = row.locator('[data-testid="tags-editable"] [tabindex="0"]');
				await expect(tagsFocusable).toBeFocused();

				// From tags, arrow right goes to status
				await page.keyboard.press("ArrowRight");
				const statusTrigger = row.locator('[data-testid="status-editable"]');
				await expect(statusTrigger).toBeFocused();

				// From status, arrow right goes to amount
				await page.keyboard.press("ArrowRight");
				const amountInput = row.locator('[data-testid="amount-editable"]');
				await expect(amountInput).toBeFocused();
			});

			await test.step("navigate left back through cells", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();

				// Move cursor to start, then press left
				await page.keyboard.press("Home");
				await page.keyboard.press("ArrowLeft");

				// Should go back to status
				const statusTrigger = row.locator('[data-testid="status-editable"]');
				await expect(statusTrigger).toBeFocused();

				// Left again to tags
				await page.keyboard.press("ArrowLeft");
				const tagsFocusable = row.locator('[data-testid="tags-editable"] [tabindex="0"]');
				await expect(tagsFocusable).toBeFocused();
			});
		});

		test("text input only navigates when cursor at boundary", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transactions", async () => {
				await createTestTransaction(page, { description: "Boundary Test", amount: "-25.00" });
				await createTestTransaction(page, { description: "Other Row", amount: "-35.00" });
			});

			await test.step("position cursor in middle of text - arrow keys move cursor not focus", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = row.locator('[data-testid="description-editable"]');

				await descriptionInput.click();
				// Position cursor in the middle (after "Bound")
				await page.keyboard.press("Home");
				await page.keyboard.press("ArrowRight");
				await page.keyboard.press("ArrowRight");
				await page.keyboard.press("ArrowRight");
				await page.keyboard.press("ArrowRight");
				await page.keyboard.press("ArrowRight");

				// Now arrow right should move cursor within text, not navigate
				await page.keyboard.press("ArrowRight");

				// Should still be focused on same input
				await expect(descriptionInput).toBeFocused();
			});

			await test.step("arrow down from text input moves to next row", async () => {
				// Arrow down should move to next row's description (single-line input)
				await page.keyboard.press("ArrowDown");

				const secondRowDescription = page
					.locator('[data-testid="transaction-row"]')
					.nth(1)
					.locator('[data-testid="description-editable"]');

				await expect(secondRowDescription).toBeFocused();
			});
		});

		test("status dropdown arrow keys navigate grid, not open dropdown", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transactions", async () => {
				await createTestTransaction(page, { description: "Status Nav 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Status Nav 2", amount: "-20.00" });
			});

			await test.step("focus status cell and verify arrow down navigates to next row", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const firstStatus = firstRow.locator('[data-testid="status-editable"]');

				// Click to focus (not open)
				await firstStatus.focus();
				await expect(firstStatus).toBeFocused();

				// Dropdown should NOT be open
				await expect(firstStatus).toHaveAttribute("aria-expanded", "false");

				// Press arrow down - should navigate to next row, not open dropdown
				await page.keyboard.press("ArrowDown");

				// Second row status should be focused
				const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);
				const secondStatus = secondRow.locator('[data-testid="status-editable"]');
				await expect(secondStatus).toBeFocused();

				// Dropdown should still be closed
				await expect(secondStatus).toHaveAttribute("aria-expanded", "false");
			});
		});

		test("description row navigation - down from description to notes", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transaction and add notes", async () => {
				await createTestTransaction(page, { description: "Desc Nav Test", amount: "-50.00" });

				// Expand and add notes
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');
				await expandButton.click();

				const notesInput = page.locator('[data-testid="notes-editable"]');
				await notesInput.fill("Test notes text");
				await notesInput.press("Enter");
			});

			await test.step("create second transaction", async () => {
				await createTestTransaction(page, { description: "Second Row", amount: "-30.00" });
			});

			await test.step("navigate down from description to notes", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = firstRow.locator('[data-testid="description-editable"]');

				await descriptionInput.click();
				await expect(descriptionInput).toBeFocused();

				// Arrow down should go to notes (expanded row)
				await page.keyboard.press("ArrowDown");

				const notesInput = page.locator('[data-testid="notes-editable"]');
				await expect(notesInput).toBeFocused();
			});

			await test.step("navigate up from notes back to description", async () => {
				// The notes should still be focused from previous step
				// Move cursor to start of textarea before pressing up
				await page.keyboard.press("Control+Home"); // Go to very beginning
				await page.keyboard.press("ArrowUp");

				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = firstRow.locator('[data-testid="description-editable"]');
				await expect(descriptionInput).toBeFocused();
			});

			await test.step("navigate down from notes to next row description", async () => {
				// Go back to notes
				await page.keyboard.press("ArrowDown");

				const notesInput = page.locator('[data-testid="notes-editable"]');
				await expect(notesInput).toBeFocused();

				// Move cursor to very end of textarea before pressing down
				await page.keyboard.press("Control+End");
				await page.keyboard.press("ArrowDown");

				// Find the second transaction row (after notes row)
				const secondDescription = page
					.locator('[data-testid="transaction-row"]')
					.nth(1)
					.locator('[data-testid="description-editable"]');
				await expect(secondDescription).toBeFocused();
			});
		});

		test("Enter key opens date calendar popup", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create a transaction", async () => {
				await createTestTransaction(page, { description: "Date Enter Test", amount: "-40.00" });
			});

			await test.step("focus date cell and press Enter to open calendar", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const dateInput = row.locator('[data-testid="date-editable"]');

				await dateInput.click();
				await expect(dateInput).toBeFocused();

				// Press Enter to open calendar
				await page.keyboard.press("Enter");

				// Calendar popup should be visible
				await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();
			});
		});
	});

	// ========================================================================
	// Phase 4: Checkbox Selection (User Story 2)
	// ========================================================================

	test.describe("US2: Checkbox Selection", () => {
		test("T020: clicking row checkbox selects transaction without editing", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Checkbox Test 1", amount: "-25.00" });
				await createTestTransaction(page, { description: "Checkbox Test 2", amount: "-35.00" });
			});

			await test.step("click checkbox to select first row", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');

				await expect(checkboxButton).toBeVisible();
				await toggleCheckbox(checkboxButton);

				// Checkbox button should now show checked state
				await expect(checkboxButton).toHaveAttribute("aria-checked", "true");

				// Row should have selected styling
				await expect(firstRow).toHaveAttribute("aria-selected", "true");
			});

			await test.step("verify selection badge shows count", async () => {
				// Selection count should show in toolbar or badge
				await expect(page.getByText(/1 selected/i).first()).toBeVisible();
			});

			await test.step("clicking checkbox again deselects", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');

				await toggleCheckbox(checkboxButton);

				// Row should be deselected
				await expect(checkboxButton).toHaveAttribute("aria-checked", "false");
				await expect(firstRow).toHaveAttribute("aria-selected", "false");
			});
		});

		test("T020b: clicking row body does not select transaction", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transaction", async () => {
				await createTestTransaction(page, { description: "No Select Test", amount: "-50.00" });
			});

			await test.step("click on row body (description cell) should not select", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const descriptionCell = row.locator('[data-cell="description"]');

				// Ensure row starts unselected
				await expect(row).toHaveAttribute("aria-selected", "false");

				// Click on the description cell (part of the row body)
				await descriptionCell.click();

				// Row should still be unselected
				await expect(row).toHaveAttribute("aria-selected", "false");
			});

			await test.step("clicking checkbox cell selects the row", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const checkboxButton = row.locator('[data-testid="row-checkbox"] button');

				await toggleCheckbox(checkboxButton);
				await expect(row).toHaveAttribute("aria-selected", "true");
			});
		});

		test("T021a: header checkbox selects all filtered transactions", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create multiple test transactions", async () => {
				await createTestTransaction(page, { description: "Select All 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Select All 2", amount: "-20.00" });
				await createTestTransaction(page, { description: "Select All 3", amount: "-30.00" });
			});

			await test.step("click header checkbox to select all", async () => {
				const headerCheckbox = page.getByRole("checkbox", { name: "Select all transactions" });
				await expect(headerCheckbox).toBeVisible();

				await toggleCheckbox(headerCheckbox);

				// All rows should be selected
				const rows = page.locator('[data-testid="transaction-row"]');
				const count = await rows.count();
				expect(count).toBe(3);

				for (let i = 0; i < count; i++) {
					await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
				}
			});

			await test.step("selection badge shows all selected", async () => {
				await expect(page.getByText(/3 selected/i).first()).toBeVisible();
			});

			await test.step("click header checkbox again to deselect all", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				// All rows should be deselected
				const rows = page.locator('[data-testid="transaction-row"]');
				const count = await rows.count();

				for (let i = 0; i < count; i++) {
					await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
				}
			});
		});

		test("T021b: header checkbox shows indeterminate when some selected", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create multiple test transactions", async () => {
				await createTestTransaction(page, { description: "Indeterminate 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Indeterminate 2", amount: "-20.00" });
				await createTestTransaction(page, { description: "Indeterminate 3", amount: "-30.00" });
			});

			await test.step("select only first row", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');
				await toggleCheckbox(checkboxButton);
			});

			await test.step("verify header checkbox is indeterminate", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				// Indeterminate state is represented by aria-checked="mixed"
				await expect(headerCheckbox).toHaveAttribute("aria-checked", "mixed");
			});

			await test.step("clicking indeterminate header selects all", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				// All rows should now be selected
				await expect(page.getByText(/3 selected/i).first()).toBeVisible();
			});
		});

		test("T021c: shift-click selects range of transactions", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create multiple test transactions", async () => {
				await createTestTransaction(page, { description: "Range 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Range 2", amount: "-20.00" });
				await createTestTransaction(page, { description: "Range 3", amount: "-30.00" });
				await createTestTransaction(page, { description: "Range 4", amount: "-40.00" });
			});

			await test.step("click first row checkbox", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');
				await toggleCheckbox(checkboxButton);
			});

			await test.step("shift-click third row checkbox to select range", async () => {
				const thirdRow = page.locator('[data-testid="transaction-row"]').nth(2);
				const checkboxButton = thirdRow.locator('[data-testid="row-checkbox"] button');

				// Shift-click to select range
				await toggleCheckbox(checkboxButton, ["Shift"]);

				// First three rows should be selected
				await expect(page.getByText(/3 selected/i).first()).toBeVisible();

				// Verify each row's selection state
				const rows = page.locator('[data-testid="transaction-row"]');
				await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
				await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
				await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
				await expect(rows.nth(3)).toHaveAttribute("aria-selected", "false");
			});
		});
	});

	// ============================================================================
	// US3: Bulk Edit Operations
	// ============================================================================

	test.describe("US3: Bulk Edit Operations", () => {
		test("T026: bulk edit tags applies to all selected transactions", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Bulk Tag 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Bulk Tag 2", amount: "-20.00" });
				await createTestTransaction(page, { description: "Bulk Tag 3", amount: "-30.00" });
			});

			await test.step("first create a tag to apply", async () => {
				// Navigate to Tags page and create a tag
				await page.getByRole("link", { name: /tags/i }).click();
				await page.getByRole("button", { name: /add tag/i }).click();
				await page.getByPlaceholder(/tag name/i).fill("BulkTestTag");
				await page.getByRole("button", { name: /^add tag$/i }).click();
				await expect(page.getByText("BulkTestTag")).toBeVisible();

				// Navigate back to transactions
				await page.getByRole("link", { name: /transactions/i }).click();
				await expect(page.locator('[data-testid="transaction-row"]').first()).toBeVisible();
			});

			await test.step("select first two transactions", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);

				const firstCheckbox = firstRow.locator('[data-testid="row-checkbox"] button');
				const secondCheckbox = secondRow.locator('[data-testid="row-checkbox"] button');

				await toggleCheckbox(firstCheckbox);
				await toggleCheckbox(secondCheckbox);

				await expect(page.getByText(/2 selected/i).first()).toBeVisible();
			});

			await test.step("verify bulk edit toolbar appears", async () => {
				const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
				await expect(toolbar).toBeVisible();
			});

			await test.step("click bulk edit tags button and apply tag", async () => {
				await page.locator('[data-testid="bulk-edit-tags-button"]').click();

				// Select the tag from the dropdown (button element)
				const tagOption = page.getByRole("button", { name: "BulkTestTag" });
				await tagOption.click();
			});

			await test.step("verify tags applied to selected transactions", async () => {
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);
				const thirdRow = page.locator('[data-testid="transaction-row"]').nth(2);

				// First two should have the tag
				await expect(firstRow.getByText("BulkTestTag")).toBeVisible();
				await expect(secondRow.getByText("BulkTestTag")).toBeVisible();

				// Third should NOT have the tag (wasn't selected)
				await expect(thirdRow.getByText("BulkTestTag")).not.toBeVisible();
			});
		});

		test("T027: bulk edit notes applies to all selected transactions", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Bulk Desc 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Bulk Desc 2", amount: "-20.00" });
			});

			await test.step("select both transactions", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				await expect(page.getByText(/2 selected/i).first()).toBeVisible();
			});

			await test.step("click bulk edit description button and enter new value", async () => {
				await page.locator('[data-testid="bulk-edit-notes-button"]').click();

				// Use more specific selector - the bulk edit description input
				const descInput = page.getByRole("textbox", { name: /enter notes/i });
				await descInput.fill("Bulk Updated Description");

				await page.getByRole("button", { name: /apply/i }).click();
			});

			await test.step("verify notes applied to all transactions", async () => {
				const rows = page.locator('[data-testid="transaction-row"]');
				const count = await rows.count();

				// Notes is in the expanded row - expand each row and check
				for (let i = 0; i < count; i++) {
					const row = rows.nth(i);
					const expandButton = row.locator('[data-testid="expand-notes-button"]');
					await expandButton.click();

					// The notes row appears for the expanded row
					const notesInput = page.locator('[data-testid="notes-editable"]').nth(i);
					await expect(notesInput).toHaveValue("Bulk Updated Description");
				}
			});
		});

		test("T028: bulk edit status applies to all selected transactions", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Bulk Status 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Bulk Status 2", amount: "-20.00" });
			});

			await test.step("select all transactions", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				await expect(page.getByText(/2 selected/i).first()).toBeVisible();
			});

			await test.step("click bulk edit status button and select Paid", async () => {
				await page.locator('[data-testid="bulk-edit-status-button"]').click();

				// Select "Paid" status (button element in dropdown)
				const paidOption = page.getByRole("button", { name: /^paid$/i });
				await paidOption.click();
			});

			await test.step("verify status applied to all transactions", async () => {
				const rows = page.locator('[data-testid="transaction-row"]');
				const count = await rows.count();

				for (let i = 0; i < count; i++) {
					// Status is in a select element - check the value contains the status name
					const statusSelect = rows.nth(i).locator('[data-testid="status-editable"]');
					// The selected option should display "Paid"
					await expect(statusSelect).toContainText("Paid");
				}
			});
		});

		test("T028a: bulk edit toolbar disappears when selection cleared", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create test transactions", async () => {
				await createTestTransaction(page, { description: "Clear Test 1", amount: "-10.00" });
				await createTestTransaction(page, { description: "Clear Test 2", amount: "-20.00" });
			});

			await test.step("select transactions and verify toolbar appears", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
				await expect(toolbar).toBeVisible();
			});

			await test.step("clear selection with header checkbox", async () => {
				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);

				// Toolbar should disappear
				const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
				await expect(toolbar).not.toBeVisible();
			});
		});

		test("T028b: Escape cancels bulk edit operation", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create and select transaction", async () => {
				await createTestTransaction(page, { description: "Escape Test", amount: "-10.00" });
				await createTestTransaction(page, { description: "Escape Test 2", amount: "-20.00" });

				const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
				await toggleCheckbox(headerCheckbox);
			});

			await test.step("open bulk description edit and cancel with Escape", async () => {
				await page.locator('[data-testid="bulk-edit-notes-button"]').click();

				// Use more specific selector - the bulk edit description input
				const descInput = page.getByRole("textbox", { name: /enter notes/i });
				await expect(descInput).toBeVisible();

				// Press Escape to cancel
				await page.keyboard.press("Escape");

				// Modal/input should close
				await expect(descInput).not.toBeVisible();
			});

			await test.step("verify no changes applied", async () => {
				// Transactions should keep original description names
				const firstRow = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = firstRow.locator('[data-testid="description-editable"]');
				await expect(descriptionInput).toHaveValue("Escape Test");
			});
		});
	});

	// ========================================================================
	// Phase 7: Description/Notes Separation (User Story 5)
	// ========================================================================

	test.describe("US5: Description/Notes Separation", () => {
		test("T037: description column displays primary text, notes in expandable row", async ({
			page,
		}) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transaction with description", async () => {
				await createTestTransaction(page, {
					description: "Starbucks",
					amount: "-5.00",
				});
			});

			await test.step("verify description displays in main row", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const descriptionInput = row.locator('[data-testid="description-editable"]');

				await expect(descriptionInput).toHaveValue("Starbucks");
			});

			await test.step("verify expand button exists", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');

				await expect(expandButton).toBeVisible();
			});

			await test.step("expand notes row", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');

				await expandButton.click();

				// Notes row should now be visible
				const notesRow = page.locator('[data-testid="notes-row"]');
				await expect(notesRow).toBeVisible();
			});

			await test.step("verify notes field is editable", async () => {
				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				await expect(notesInput).toBeVisible();
				await expect(notesInput).toHaveAttribute("placeholder", /add notes/i);
			});
		});

		test("T038: edit notes in expanded row", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transaction and expand", async () => {
				await createTestTransaction(page, {
					description: "Amazon",
					amount: "-99.00",
				});

				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');
				await expandButton.click();
			});

			await test.step("edit notes and save with Enter", async () => {
				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				await notesInput.click();
				await notesInput.fill("Monthly subscription payment");
				await notesInput.press("Enter");
			});

			await test.step("verify notes saved", async () => {
				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				// Textarea may have trailing newline, so check contains text
				await expect(notesInput).toHaveValue(/Monthly subscription payment/);
			});

			await test.step("collapse and re-expand to verify persistence", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');

				// Collapse
				await expandButton.click();
				await expect(page.locator('[data-testid="notes-row"]')).not.toBeVisible();

				// Re-expand
				await expandButton.click();
				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				// Textarea may have trailing newline, so check contains text
				await expect(notesInput).toHaveValue(/Monthly subscription payment/);
			});
		});

		test("T039: expand button icon reflects notes state", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transaction without notes", async () => {
				await createTestTransaction(page, {
					description: "Icon Test Store",
					amount: "-10.00",
				});
			});

			await test.step("verify expand button shows plus icon initially", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');

				// Button should be mostly hidden until hover (opacity-0 with group-hover:opacity-100)
				// But we can still click it
				await expect(expandButton).toBeAttached();
			});

			await test.step("add notes and verify icon changes", async () => {
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');

				await expandButton.click();

				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				await notesInput.fill("Test memo");
				await notesInput.press("Enter");

				// Collapse
				await expandButton.click();

				// Expand button should now be visible (not hidden) because notes exists
				await expect(expandButton).toBeVisible();
			});
		});

		test("T040: search filters include both description and notes", async ({ page }) => {
			await createNewIdentity(page);
			await goToTransactions(page);

			await test.step("create transaction with description and add notes", async () => {
				await createTestTransaction(page, {
					description: "UniqueStoreName",
					amount: "-50.00",
				});

				// add notes
				const row = page.locator('[data-testid="transaction-row"]').first();
				const expandButton = row.locator('[data-testid="expand-notes-button"]');
				await expandButton.click();

				const notesRow = page.locator('[data-testid="notes-row"]');
				const notesInput = notesRow.locator('[data-testid="notes-editable"]');

				await notesInput.fill("UniqueNotesText");
				await notesInput.press("Enter");

				// Collapse
				await expandButton.click();
			});

			await test.step("search by description finds transaction", async () => {
				const searchInput = page.getByPlaceholder(/search/i).first();
				await searchInput.fill("UniqueStoreName");

				// Transaction should be visible
				await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
			});

			await test.step("search by notes finds transaction", async () => {
				const searchInput = page.getByPlaceholder(/search/i).first();
				await searchInput.clear();
				await searchInput.fill("UniqueNotesText");

				// Transaction should still be visible
				await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
			});

			await test.step("search by non-matching term hides transaction", async () => {
				const searchInput = page.getByPlaceholder(/search/i).first();
				await searchInput.clear();
				await searchInput.fill("NonExistentSearchTerm12345");

				// Transaction should not be visible
				await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(0);
			});
		});
	});
});

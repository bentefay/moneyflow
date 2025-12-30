/**
 * E2E Test: Transaction CRUD Flow
 *
 * Tests the complete transaction management flows:
 * - View transactions list
 * - Create new transactions
 * - Edit transactions inline
 * - Delete transactions
 * - Filter and search transactions
 * - Bulk edit operations
 */

import { test, expect, type Page } from "@playwright/test";
import { createNewIdentity, goToTransactions } from "./helpers";

// ============================================================================
// Transaction-Specific Helpers
// ============================================================================

/**
 * Create a test transaction using the add row.
 */
async function createTransaction(
  page: Page,
  data: {
    date?: string;
    merchant?: string;
    description?: string;
    amount?: string;
  }
): Promise<void> {
  // Click on the add transaction row to activate it
  const addRow = page.locator('[data-testid="add-transaction-row"]');
  await addRow.click();

  // Wait for the row to activate and show input fields
  const dateInput = page.locator('[data-testid="new-transaction-date"]');
  await dateInput.waitFor({ state: "visible", timeout: 3000 });

  // Fill in the fields
  if (data.date) {
    await dateInput.fill(data.date);
  }

  if (data.merchant) {
    const merchantInput = page.locator('[data-testid="new-transaction-merchant"]');
    await merchantInput.fill(data.merchant);
  }

  if (data.description) {
    const descInput = page.locator('[data-testid="new-transaction-description"]');
    await descInput.fill(data.description);
  }

  if (data.amount) {
    const amountInput = page.locator('[data-testid="new-transaction-amount"]');
    await amountInput.fill(data.amount);
  }

  // Submit the new transaction
  await page.keyboard.press("Enter");
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Transaction List", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
  });

  test("should display transactions page with heading", async ({ page }) => {
    await goToTransactions(page);

    // Page title (h1 level to avoid matching 'No transactions yet')
    await expect(page.getByRole("heading", { name: "Transactions", level: 1 })).toBeVisible();
  });

  test.skip("should display table headers when transactions exist", async ({ page }) => {
    // TODO: Requires account creation flow to be implemented first
    await goToTransactions(page);

    // First create a transaction so the table is shown
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Header Test",
      amount: "-10.00",
    });
    await expect(page.getByText("Header Test")).toBeVisible({ timeout: 5000 });

    // Check for expected column headers in the sticky header row
    // Note: The table uses divs with text, not semantic <th> elements
    const headerRow = page.locator('[data-testid="transaction-table"] > div').first();
    await expect(headerRow).toContainText("Date");
    await expect(headerRow).toContainText("Amount");
  });

  test("should show empty state when no transactions", async ({ page }) => {
    await goToTransactions(page);

    // The add transaction row should always be visible (either as part of empty state or in table)
    const addRow = page.locator('[data-testid="add-transaction-row"]');
    await expect(addRow).toBeVisible();
  });
});

test.describe("Create Transaction", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);
  });

  test("should show add transaction row", async ({ page }) => {
    const addRow = page.locator('[data-testid="add-transaction-row"]');
    await expect(addRow).toBeVisible();
  });

  // TODO: These tests require accounts feature to be implemented first
  test.skip("should create a new transaction", async ({ page }) => {
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Test Merchant",
      description: "Test purchase",
      amount: "-50.00",
    });

    // Wait for transaction to appear in list
    await expect(page.getByText("Test Merchant")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("-50.00").or(page.getByText("$50.00")).first()).toBeVisible();
  });

  test.skip("should validate required fields", async ({ page }) => {
    // TODO: Requires accounts feature
    // Try to submit empty transaction
    const addRow = page.locator('[data-testid="add-transaction-row"]');
    if (await addRow.isVisible()) {
      await addRow.click();
    }
    await page.keyboard.press("Enter");

    // Should show validation error or not submit
    const errorMessage = page.getByText(/required|please fill|cannot be empty/i);
    const rowCount = await page.locator('[data-testid="transaction-row"]').count();

    // Either show error or prevent submission
    await expect(
      errorMessage.or(page.locator(`[data-testid="transaction-row"]:nth-child(${rowCount})`))
    ).toBeVisible();
  });

  test.skip("should format amount correctly", async ({ page }) => {
    // TODO: Requires accounts feature
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Amount Test",
      amount: "100.50",
    });

    // Amount should be formatted (positive = income)
    await expect(page.getByText("Amount Test")).toBeVisible({ timeout: 5000 });
  });
});

// TODO: All Edit/Delete/Filter/Bulk tests require accounts feature for creating transactions
test.describe.skip("Edit Transaction", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    // Create a transaction to edit
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Edit Test Merchant",
      amount: "-25.00",
    });
    await expect(page.getByText("Edit Test Merchant")).toBeVisible({ timeout: 5000 });
  });

  test("should enable inline editing on cell click", async ({ page }) => {
    // Click on the merchant cell
    const merchantCell = page.getByText("Edit Test Merchant");
    await merchantCell.click();

    // Should show input field
    const input = page
      .locator('[data-testid="inline-edit-input"]')
      .or(merchantCell.locator("input"));
    await expect(input).toBeVisible({ timeout: 3000 });
  });

  test("should save edit on Enter", async ({ page }) => {
    // Click on merchant cell
    const merchantCell = page.getByText("Edit Test Merchant");
    await merchantCell.click();

    // Edit the value
    await page.keyboard.type("Updated Merchant");
    await page.keyboard.press("Enter");

    // Verify update
    await expect(page.getByText("Updated Merchant")).toBeVisible({ timeout: 5000 });
  });

  test("should cancel edit on Escape", async ({ page }) => {
    // Click on merchant cell
    const merchantCell = page.getByText("Edit Test Merchant");
    await merchantCell.click();

    // Start typing but cancel
    await page.keyboard.type("Cancelled Edit");
    await page.keyboard.press("Escape");

    // Original value should remain
    await expect(page.getByText("Edit Test Merchant")).toBeVisible();
    await expect(page.getByText("Cancelled Edit")).not.toBeVisible();
  });

  test("should edit amount with proper formatting", async ({ page }) => {
    // Find and click amount cell
    const amountCell = page.getByText("-25.00").or(page.getByText("$25.00"));
    await amountCell.click();

    // Clear and enter new amount
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("-100.00");
    await page.keyboard.press("Enter");

    // Verify update
    await expect(page.getByText("-100.00").or(page.getByText("$100.00"))).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe.skip("Delete Transaction", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    // Create a transaction to delete
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Delete Test",
      amount: "-30.00",
    });
    await expect(page.getByText("Delete Test")).toBeVisible({ timeout: 5000 });
  });

  test("should show delete button on row hover", async ({ page }) => {
    // Hover over the transaction row
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Delete Test" });
    await row.hover();

    // Delete button should appear
    const deleteButton = row
      .locator('[data-testid="delete-button"]')
      .or(row.getByRole("button", { name: /delete/i }));
    await expect(deleteButton).toBeVisible();
  });

  test("should confirm before deleting", async ({ page }) => {
    // Hover and click delete
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Delete Test" });
    await row.hover();

    const deleteButton = row
      .locator('[data-testid="delete-button"]')
      .or(row.getByRole("button", { name: /delete/i }));
    await deleteButton.click();

    // Should show confirmation dialog
    const confirmDialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
    await expect(confirmDialog.or(page.getByText(/are you sure|confirm/i))).toBeVisible({
      timeout: 3000,
    });
  });

  test("should delete transaction after confirmation", async ({ page }) => {
    // Hover and click delete
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Delete Test" });
    await row.hover();

    const deleteButton = row
      .locator('[data-testid="delete-button"]')
      .or(row.getByRole("button", { name: /delete/i }));
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i });
    await confirmButton.click();

    // Transaction should be removed
    await expect(page.getByText("Delete Test")).not.toBeVisible({ timeout: 5000 });
  });

  test("should delete with keyboard shortcut", async ({ page }) => {
    // Select the row
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Delete Test" });
    await row.click();

    // Press delete key
    await page.keyboard.press("Delete");

    // Should show confirmation or delete directly
    const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Transaction should be removed
    await expect(page.getByText("Delete Test")).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe.skip("Filter Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    // Create multiple transactions
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Coffee Shop",
      amount: "-5.00",
    });
    await createTransaction(page, {
      date: "2024-02-20",
      merchant: "Grocery Store",
      amount: "-75.00",
    });
    await createTransaction(page, {
      date: "2024-03-10",
      merchant: "Salary Deposit",
      amount: "2000.00",
    });

    await page.waitForTimeout(1000); // Wait for all transactions to appear
  });

  test("should filter by search text", async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator('[data-testid="search-filter"]')
      .or(page.getByPlaceholder(/search/i));
    await searchInput.fill("Coffee");

    // Only matching transaction should be visible
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Grocery Store")).not.toBeVisible();
    await expect(page.getByText("Salary Deposit")).not.toBeVisible();
  });

  test("should clear search filter", async ({ page }) => {
    // Search for something
    const searchInput = page
      .locator('[data-testid="search-filter"]')
      .or(page.getByPlaceholder(/search/i));
    await searchInput.fill("Coffee");
    await expect(page.getByText("Grocery Store")).not.toBeVisible();

    // Clear the search
    await searchInput.clear();

    // All transactions should be visible again
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Grocery Store")).toBeVisible();
  });

  test("should filter by date range", async ({ page }) => {
    // Find date filter
    const dateFilter = page.locator('[data-testid="date-range-filter"]');
    await dateFilter.click();

    // Select January only
    const startDate = page.locator('[data-testid="date-start"]');
    const endDate = page.locator('[data-testid="date-end"]');

    if (await startDate.isVisible()) {
      await startDate.fill("2024-01-01");
      await endDate.fill("2024-01-31");

      // Only January transaction should be visible
      await expect(page.getByText("Coffee Shop")).toBeVisible();
      await expect(page.getByText("Grocery Store")).not.toBeVisible();
    }
  });

  test("should show active filter indicator", async ({ page }) => {
    // Apply a filter
    const searchInput = page
      .locator('[data-testid="search-filter"]')
      .or(page.getByPlaceholder(/search/i));
    await searchInput.fill("Coffee");

    // Should show filter indicator
    const filterIndicator = page
      .locator('[data-testid="active-filters"]')
      .or(page.getByText(/1 filter|filtered/i));
    await expect(filterIndicator).toBeVisible({ timeout: 3000 });
  });

  test("should show duplicates only filter", async ({ page }) => {
    // Find duplicates filter
    const duplicatesFilter = page
      .locator('[data-testid="duplicates-filter"]')
      .or(page.getByLabel(/show duplicates|duplicates only/i));

    if (await duplicatesFilter.isVisible()) {
      await duplicatesFilter.click();

      // Should filter to show only duplicates (likely empty for new transactions)
      const table = page.locator('[data-testid="transaction-table"]');
      await expect(table).toBeVisible();
    }
  });
});

test.describe.skip("Bulk Edit", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    // Create multiple transactions
    await createTransaction(page, {
      date: "2024-01-15",
      merchant: "Bulk Test 1",
      amount: "-10.00",
    });
    await createTransaction(page, {
      date: "2024-01-16",
      merchant: "Bulk Test 2",
      amount: "-20.00",
    });
    await createTransaction(page, {
      date: "2024-01-17",
      merchant: "Bulk Test 3",
      amount: "-30.00",
    });

    await page.waitForTimeout(1000);
  });

  test("should select multiple transactions with checkboxes", async ({ page }) => {
    // Click checkboxes on first two transactions
    const checkbox1 = page
      .locator('[data-testid="transaction-row"]')
      .filter({ hasText: "Bulk Test 1" })
      .locator('input[type="checkbox"]');
    const checkbox2 = page
      .locator('[data-testid="transaction-row"]')
      .filter({ hasText: "Bulk Test 2" })
      .locator('input[type="checkbox"]');

    await checkbox1.check();
    await checkbox2.check();

    // Bulk edit toolbar should appear
    const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
    await expect(toolbar).toBeVisible();

    // Should show selection count
    await expect(page.getByText(/2 selected/i)).toBeVisible();
  });

  test("should select all with header checkbox", async ({ page }) => {
    // Find and click header checkbox
    const headerCheckbox = page
      .locator('thead input[type="checkbox"]')
      .or(page.locator('[data-testid="select-all-checkbox"]'));
    await headerCheckbox.check();

    // All transactions should be selected
    const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
    await expect(toolbar).toBeVisible();

    // Should show count >= 3
    await expect(page.getByText(/3 selected|selected/i)).toBeVisible();
  });

  test("should bulk delete selected transactions", async ({ page }) => {
    // Select all
    const headerCheckbox = page
      .locator('thead input[type="checkbox"]')
      .or(page.locator('[data-testid="select-all-checkbox"]'));
    await headerCheckbox.check();

    // Click bulk delete
    const deleteButton = page
      .locator('[data-testid="bulk-delete"]')
      .or(page.getByRole("button", { name: /delete selected/i }));
    await deleteButton.click();

    // Confirm
    const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // All transactions should be removed
    await expect(page.getByText("Bulk Test 1")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bulk Test 2")).not.toBeVisible();
    await expect(page.getByText("Bulk Test 3")).not.toBeVisible();
  });

  test("should clear selection", async ({ page }) => {
    // Select all
    const headerCheckbox = page
      .locator('thead input[type="checkbox"]')
      .or(page.locator('[data-testid="select-all-checkbox"]'));
    await headerCheckbox.check();

    // Clear selection
    const clearButton = page
      .locator('[data-testid="clear-selection"]')
      .or(page.getByRole("button", { name: /clear|deselect/i }));
    await clearButton.click();

    // Toolbar should disappear
    const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
    await expect(toolbar).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe.skip("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    // Create transactions for navigation
    await createTransaction(page, { date: "2024-01-15", merchant: "Nav Test 1", amount: "-10.00" });
    await createTransaction(page, { date: "2024-01-16", merchant: "Nav Test 2", amount: "-20.00" });
    await page.waitForTimeout(500);
  });

  test("should navigate rows with arrow keys", async ({ page }) => {
    // Click on first row to focus table
    const firstRow = page.locator('[data-testid="transaction-row"]').first();
    await firstRow.click();

    // Press down arrow
    await page.keyboard.press("ArrowDown");

    // Second row should be focused/selected
    const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);
    await expect(secondRow).toHaveClass(/focused|selected/i);
  });

  test("should delete with d key", async ({ page }) => {
    // Select a row
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Nav Test 1" });
    await row.click();

    // Press 'd' for delete
    await page.keyboard.press("d");

    // Should show confirmation or delete
    const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await expect(page.getByText("Nav Test 1")).not.toBeVisible({ timeout: 5000 });
  });

  test("should keep duplicate with k key", async ({ page }) => {
    // Create a duplicate-flagged transaction
    const row = page.locator('[data-testid="transaction-row"]').filter({ hasText: "Nav Test 1" });
    await row.click();

    // Press 'k' for keep
    await page.keyboard.press("k");

    // Transaction should remain visible
    await expect(page.getByText("Nav Test 1")).toBeVisible();
  });
});

/**
 * E2E Test: Transactions Page
 *
 * Basic tests for the transactions page. Full transaction CRUD testing
 * is pending the account creation feature.
 */

import { expect, test } from "@playwright/test";
import { createNewIdentity, goToTransactions } from "./helpers";

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
});

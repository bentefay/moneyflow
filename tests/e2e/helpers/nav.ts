/**
 * Navigation E2E Helpers
 *
 * Helpers for navigating to app pages and waiting for them to load.
 */

import type { Page } from "@playwright/test";

export async function goToDashboard(page: Page): Promise<void> {
	await page.goto("/dashboard");
	await page.waitForLoadState("networkidle");
}

export async function goToTransactions(page: Page): Promise<void> {
	await page.goto("/transactions");
	// Wait for the transaction table toolbar which is always present (even in empty state)
	await page.locator('[data-testid="transaction-table-toolbar"]').waitFor({ timeout: 15000 });
}

export async function goToSettings(page: Page): Promise<void> {
	await page.goto("/settings");
	await page.getByRole("heading", { name: "Vault Settings", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToTags(page: Page): Promise<void> {
	await page.goto("/tags");
	await page.getByRole("heading", { name: "Tags", level: 1 }).waitFor({ timeout: 15000 });
	// Tags table only renders once a vault is selected.
	await page.getByRole("button", { name: /add tag/i }).waitFor({ timeout: 15000 });
}

export async function goToAccounts(page: Page): Promise<void> {
	await page.goto("/accounts");
	await page.getByRole("heading", { name: "Accounts", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToPeople(page: Page): Promise<void> {
	await page.goto("/people");
	await page.getByRole("heading", { name: "People", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToImports(page: Page): Promise<void> {
	await page.goto("/imports");
	await page.getByRole("heading", { name: "Imports", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToImportNew(page: Page): Promise<void> {
	await page.goto("/imports/new");
	await page.getByRole("heading", { name: /Import Transactions/i }).waitFor({ timeout: 15000 });
}

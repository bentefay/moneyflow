/**
 * Navigation E2E Helpers
 *
 * Helpers for navigating to app pages and waiting for them to load.
 *
 * Every helper here navigates with `page.goto`, a full document teardown. That is deliberate — it
 * re-derives the destination from persisted state rather than from the document already in memory,
 * which is stronger than the client-side transition a user gets from the sidebar. It is also the
 * shape that loses a write that has been confirmed in the DOM but is still queued for encryption,
 * so each one waits for durability first. See `./persistence`.
 */

import type { Page } from "@playwright/test";

import { awaitVaultPersistence } from "./persistence";

/** A full page load, with the vault's queued local writes made durable before the teardown. */
async function gotoAfterPersistence(page: Page, path: string): Promise<void> {
    await awaitVaultPersistence(page);
    await page.goto(path);
}

export async function goToTransactions(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/transactions");
    // Wait for the transaction table toolbar which is always present (even in empty state)
    await page.locator('[data-testid="transaction-table-toolbar"]').waitFor({ timeout: 15000 });
}

export async function goToSettings(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/settings");
    await page
        .getByRole("heading", { name: "Vault Settings", level: 1 })
        .waitFor({ timeout: 15000 });
}

export async function goToTags(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/tags");
    await page.getByRole("heading", { name: "Tags", level: 1 }).waitFor({ timeout: 15000 });
    // Tags table only renders once a vault is selected.
    await page.getByRole("button", { name: /add tag/i }).waitFor({ timeout: 15000 });
}

export async function goToStatuses(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/statuses");
    await page.getByRole("heading", { name: "Statuses", level: 1 }).waitFor({ timeout: 15000 });
    // The statuses table only renders once a vault is selected.
    await page.getByTestId("add-status-btn").waitFor({ timeout: 15000 });
}

export async function goToAccounts(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/accounts");
    await page.getByRole("heading", { name: "Accounts", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToPeople(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/people");
    await page.getByRole("heading", { name: "People", level: 1 }).waitFor({ timeout: 15000 });
    // The people table and its settlement card only render once a vault is selected. The card is
    // the right thing to wait for because it is the one element present in *every* settlement
    // state — obligations, settled, no-qualifying and incomplete all render it — so this converges
    // for every caller rather than only the ones expecting obligations.
    await page.getByTestId("settlement-summary").waitFor({ timeout: 15000 });
}

export async function goToAutomations(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/automations");
    await page.getByRole("heading", { name: "Automations", level: 1 }).waitFor({ timeout: 15000 });
    // The field-rule manager only renders once a vault is selected.
    await page.locator('[data-testid="new-rule-btn"]').waitFor({ timeout: 15000 });
}

export async function goToImports(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/imports");
    await page.getByRole("heading", { name: "Imports", level: 1 }).waitFor({ timeout: 15000 });
}

export async function goToTxDescriptions(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/tx-descriptions");
    await page
        .getByRole("heading", { name: "Tx Descriptions", level: 1 })
        .waitFor({ timeout: 15000 });
}

export async function goToImportNew(page: Page): Promise<void> {
    await gotoAfterPersistence(page, "/imports/new");
    await page.getByRole("heading", { name: /Import Transactions/i }).waitFor({ timeout: 15000 });
}

/**
 * E2E Test: Description Aliases Management
 *
 * Journey-style tests that validate complete user flows for description aliases.
 * Covers the management page CRUD and sidebar navigation.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToTxDescriptions } from "./helpers";

// ============================================================================
// Alias-Specific Helpers
// ============================================================================

/**
 * Create a new alias via the Add Alias form.
 */
async function createAlias(page: Page, name: string): Promise<void> {
    const addButton = page.getByRole("button", { name: /add alias/i });
    await addButton.click();

    const nameInput = page.getByPlaceholder(/enter alias name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);

    const submitButton = page.getByRole("button", { name: /^add alias$/i });
    await submitButton.click();
}

/**
 * Start editing an alias (clicks edit button).
 */
async function startEditAlias(page: Page, aliasName: string): Promise<void> {
    const aliasRow = page.locator(`[data-alias-name="${aliasName}"]`);
    await aliasRow.hover();
    const editButton = aliasRow.getByRole("button", { name: /edit/i });
    await editButton.click();
}

/**
 * Edit an existing alias name and save.
 */
async function editAlias(page: Page, aliasName: string, newName: string): Promise<void> {
    await startEditAlias(page, aliasName);

    const nameInput = page.getByPlaceholder(/alias name/i);
    await nameInput.clear();
    await nameInput.fill(newName);

    const saveButton = page.getByRole("button", { name: /save/i });
    await saveButton.click();
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Description Aliases", () => {
    test("management page CRUD journey: create, rename, delete aliases", async ({ page }) => {
        await createNewIdentity(page);
        await goToTxDescriptions(page);

        await test.step("page loads correctly with empty state", async () => {
            await expect(
                page.getByRole("heading", { name: "Tx Descriptions", level: 1 })
            ).toBeVisible();
            await expect(page.getByRole("button", { name: /add alias/i })).toBeVisible();
            await expect(page.getByText(/no description aliases created yet/i)).toBeVisible();
        });

        await test.step("cancel add form without creating alias", async () => {
            await page.getByRole("button", { name: /add alias/i }).click();
            await expect(page.getByPlaceholder(/enter alias name/i)).toBeVisible();
            await page.getByRole("button", { name: /cancel/i }).click();
            await expect(page.getByPlaceholder(/enter alias name/i)).not.toBeVisible();
        });

        await test.step("create alias", async () => {
            await createAlias(page, "Supermarket");
            await expect(page.getByText("Supermarket", { exact: true })).toBeVisible();
            await expect(page.getByText(/no description aliases created yet/i)).not.toBeVisible();
        });

        await test.step("create another alias", async () => {
            await createAlias(page, "Gas Station");
            await expect(page.getByText("Gas Station", { exact: true })).toBeVisible();
        });

        await test.step("normalize names and reject NFC-equivalent duplicates", async () => {
            await createAlias(page, "  Cafe\u0301  ");
            await expect(page.getByText("Café", { exact: true })).toBeVisible();

            await page.getByRole("button", { name: /add alias/i }).click();
            await page.getByPlaceholder(/enter alias name/i).fill("Café");
            await page.getByRole("button", { name: /^add alias$/i }).click();
            await expect(page.getByText(/an alias named .* already exists/i)).toBeVisible();
            await expect(page.locator('[data-alias-name="Café"]')).toHaveCount(1);
            await page.getByRole("button", { name: /cancel/i }).click();
        });

        await test.step("rename alias", async () => {
            await editAlias(page, "Supermarket", "Grocery Store");
            await expect(page.getByText("Grocery Store", { exact: true })).toBeVisible();
            await expect(page.getByText("Supermarket", { exact: true })).not.toBeVisible();
        });

        await test.step("cancel edit preserves original value", async () => {
            await startEditAlias(page, "Grocery Store");
            const nameInput = page.getByPlaceholder(/alias name/i);
            await nameInput.clear();
            await nameInput.fill("Should Not Save");
            await page.getByRole("button", { name: /cancel/i }).click();
            await expect(page.getByText("Grocery Store", { exact: true })).toBeVisible();
            await expect(page.getByText("Should Not Save", { exact: true })).not.toBeVisible();
        });

        await test.step("delete requires double-click confirmation", async () => {
            await createAlias(page, "Temporary Alias");
            await expect(page.getByText("Temporary Alias", { exact: true })).toBeVisible();

            const tempRow = page.locator(`[data-alias-name="Temporary Alias"]`);
            await tempRow.hover();
            const deleteBtn = tempRow.getByRole("button", { name: /delete/i });

            // First click should NOT delete
            await deleteBtn.click();
            await expect(page.getByText("Temporary Alias", { exact: true })).toBeVisible();

            // Second click confirms
            await deleteBtn.click();
            await expect(page.getByText("Temporary Alias", { exact: true })).not.toBeVisible();
        });
    });

    test("navigation: sidebar link works", async ({ page }) => {
        await createNewIdentity(page);
        // Navigate to a different page first
        await page.goto("/transactions");
        await page.waitForLoadState("networkidle");

        // Click Tx Descriptions in sidebar
        await page.getByRole("link", { name: /tx descriptions/i }).click();

        await expect(page).toHaveURL(/\/tx-descriptions/);
        await expect(
            page.getByRole("heading", { name: "Tx Descriptions", level: 1 })
        ).toBeVisible();
    });
});

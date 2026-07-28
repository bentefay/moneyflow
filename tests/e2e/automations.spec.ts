/**
 * E2E Test: Automations (HS-007 field rules)
 *
 * Journey-style tests for the reworked Automations page, which drives the shared
 * {@link FieldRuleEditor} over the P17A field-rule engine. Covers create / edit / delete,
 * apply-all and apply-new impact reporting, the precedence + apply-mode explanation, inline
 * validation, and keyboard / focus / accessibility of the shared editor.
 *
 * Assertions target behaviour and accessible roles rather than incidental copy.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToAutomations, goToTags } from "./helpers";

// ============================================================================
// Helpers
// ============================================================================

/** Create a tag via the Tags page so the tags-field rule has a value to pick. */
async function createTag(page: Page, name: string): Promise<void> {
    await goToTags(page);
    await page.getByRole("button", { name: /add tag/i }).click();
    const nameInput = page.getByPlaceholder(/enter tag name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);
    await page.getByRole("button", { name: /^add tag$/i }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/** Open the create-rule editor from the manager. */
async function openCreateEditor(page: Page): Promise<void> {
    await page.locator('[data-testid="new-rule-btn"]').click();
    await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Automations", () => {
    test("CRUD journey: create, edit, and delete a tags field rule", async ({ page }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await goToAutomations(page);

        await test.step("page loads with empty state", async () => {
            await expect(
                page.getByRole("heading", { name: "Automations", level: 1 })
            ).toBeVisible();
            await expect(page.getByText(/no automation rules yet/i)).toBeVisible();
        });

        await test.step("create a tags rule for an exact description", async () => {
            await openCreateEditor(page);

            // Shared editor exposes an accessible form.
            await expect(page.getByRole("form", { name: /field rule editor/i })).toBeVisible();

            // Field defaults to Tags (remembered default); type the exact description.
            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");

            // Pick the Coffee tag from the accessible tag group.
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();

            // Precedence + impact explanation is shown before saving.
            await expect(page.locator('[data-testid="rule-precedence-note"]')).toBeVisible();

            await page.locator('[data-testid="rule-save"]').click();
        });

        await test.step("rule appears in the active-rules list", async () => {
            await expect(page.locator('[data-testid="rule-list"]')).toBeVisible();
            await expect(page.getByText(/COFFEE SHOP 123/)).toBeVisible();
            await expect(page.getByText(/1 active rule\b/i)).toBeVisible();
        });

        await test.step("edit the rule to add an amount constraint", async () => {
            await page.getByText(/COFFEE SHOP 123/).click();
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });

            await page.locator('[data-testid="rule-amount-toggle"]').click();
            await page.locator('[data-testid="rule-amount"]').fill("4.50");
            await page.locator('[data-testid="rule-save"]').click();

            // Summary now reflects the amount constraint.
            await expect(page.getByText(/COFFEE SHOP 123.*amount/)).toBeVisible();
        });

        await test.step("delete the rule returns to empty state", async () => {
            await page.getByText(/COFFEE SHOP 123/).click();
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
            await page.locator('[data-testid="rule-delete"]').click();

            await expect(page.getByText(/no automation rules yet/i)).toBeVisible();
        });
    });

    test("apply-all and apply-new report impact and route through the engine", async ({ page }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await goToAutomations(page);

        await openCreateEditor(page);
        await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
        await page
            .getByRole("group", { name: /tags to apply/i })
            .getByRole("button", { name: "Coffee" })
            .click();
        await page.locator('[data-testid="rule-save"]').click();
        await expect(page.getByText(/COFFEE SHOP 123/)).toBeVisible();

        await test.step("apply-all shows an impact summary", async () => {
            await page.getByText(/COFFEE SHOP 123/).click();
            await page.locator('[data-testid="rule-apply-all"]').click();
            const summary = page.locator('[data-testid="apply-summary"]');
            await expect(summary).toBeVisible();
            await expect(summary).toHaveText(/applied to all/i);
            // Reported as a status region for assistive tech.
            await expect(summary).toHaveAttribute("role", "status");
        });

        await test.step("apply-new shows a new-imports summary", async () => {
            await page.locator('[data-testid="rule-apply-new"]').click();
            const summary = page.locator('[data-testid="apply-summary"]');
            await expect(summary).toBeVisible();
            await expect(summary).toHaveText(/applied to new imports/i);
        });
    });

    test("inline validation and keyboard / focus accessibility", async ({ page }) => {
        await createNewIdentity(page);
        await goToAutomations(page);

        await test.step("saving a blank rule surfaces an accessible error", async () => {
            await openCreateEditor(page);
            await page.locator('[data-testid="rule-save"]').click();

            const error = page.locator('[data-testid="rule-description-error"]');
            await expect(error).toBeVisible();
            await expect(error).toHaveAttribute("role", "alert");

            // The description input is marked invalid and linked to its error message.
            const description = page.getByLabel(/exact description text/i);
            await expect(description).toHaveAttribute("aria-invalid", "true");
        });

        await test.step("the exact-description field is reachable and editable by keyboard", async () => {
            const description = page.getByLabel(/exact description text/i);
            await description.focus();
            await expect(description).toBeFocused();
            await page.keyboard.type("KEYBOARD ENTRY");
            await expect(description).toHaveValue("KEYBOARD ENTRY");
        });

        await test.step("apply-mode explanation is available for assistive tech", async () => {
            await expect(page.getByRole("button", { name: /explain apply modes/i })).toBeVisible();
        });
    });
});

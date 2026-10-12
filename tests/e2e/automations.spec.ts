/**
 * E2E Test: Automations page
 *
 * Journey-style tests for the Automations page, which lists grouped rules beside the shared rule
 * editor. Covers create / edit / delete, a rule with two outputs applied to existing rows, Split
 * leaving every row unchanged, Update new applying nothing to existing rows, inline validation, and
 * keyboard / accessibility of the editor.
 *
 * Assertions target behaviour and accessible roles rather than incidental copy.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";

import {
    allocationGridCell,
    createNewIdentity,
    goToAutomations,
    goToPeople,
    goToTags,
    goToTransactions,
    importTransactionRows,
    rowsWithDisplayedDescription,
    stableTransactionRow,
    transactionGridCell
} from "./helpers";
import { addPerson, DEFAULT_PERSON_NAME } from "./helpers/settlement";

// ============================================================================
// Helpers
// ============================================================================

/** Create a tag via the Tags page so a tags output has a value to pick. */
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
async function openCreateEditor(page: Page): Promise<Locator> {
    await page.getByTestId("new-rule-btn").click();
    const editor = page.getByRole("group", { name: "New rule" });
    await expect(editor).toBeVisible();
    return editor;
}

/** Add an output to the open editor through its Add output select. */
async function addOutput(page: Page, label: "Description" | "Tags" | "Allocation"): Promise<void> {
    await page.getByRole("combobox", { name: "Add output" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
}

/** The rule list's entries whose conditions name `description`. */
function ruleListItems(page: Page, description: string): Locator {
    return page.getByTestId("rule-list").getByRole("button").filter({ hasText: description });
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Automations", () => {
    test("CRUD journey: create, edit, and delete a tags rule", async ({ page }) => {
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
            const editor = await openCreateEditor(page);
            await expect(editor.getByRole("button", { name: /delete rule/i })).toHaveCount(0);

            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
            await addOutput(page, "Tags");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();

            await editor.getByRole("button", { name: "Create and apply" }).click();
        });

        await test.step("rule appears in the list, named by its conditions and selected", async () => {
            const item = ruleListItems(page, "COFFEE SHOP 123");
            await expect(item).toHaveCount(1);
            await expect(item).toContainText("any account");
            await expect(item).toContainText("Tags");
            await expect(item).toHaveAttribute("aria-current", "true");
            await expect(page.getByText(/1 active rule\b/i)).toBeVisible();
            await expect(
                page.getByRole("group", { name: /^Rule · COFFEE SHOP 123/ })
            ).toBeVisible();
        });

        await test.step("edit the rule to add an amount restriction", async () => {
            await ruleListItems(page, "COFFEE SHOP 123").click();
            await page.getByTestId("rule-amount").fill("4.50");
            await page.getByTestId("rule-save").click();

            await expect(ruleListItems(page, "COFFEE SHOP 123")).toContainText("4.50");
            await expect(ruleListItems(page, "COFFEE SHOP 123")).not.toContainText("any amount");
        });

        await test.step("delete the rule returns to empty state", async () => {
            await ruleListItems(page, "COFFEE SHOP 123").click();
            await page.getByRole("button", { name: /delete rule/i }).click();

            await expect(page.getByText(/no automation rules yet/i)).toBeVisible();
            await expect(page.getByTestId("field-rule-editor")).toHaveCount(0);
        });
    });

    test("a two-output rule applies to existing rows, Split keeps them, and Update new leaves them", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToPeople(page);
        await addPerson(page, "Alex");
        await createTag(page, "Coffee");
        await importTransactionRows(
            page,
            [
                { date: "2026-07-01", description: "COFFEE SHOP 123" },
                { date: "2026-07-02", description: "TEA HOUSE 9" }
            ],
            "automations.csv"
        );
        await goToAutomations(page);

        await test.step("create one rule with tags and allocation outputs and update all", async () => {
            const editor = await openCreateEditor(page);
            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
            await addOutput(page, "Tags");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await addOutput(page, "Allocation");
            const grid = page.getByTestId("rule-allocation-grid");
            await grid.getByLabel(DEFAULT_PERSON_NAME).fill("60");
            await grid.getByLabel("Alex").fill("40");
            await editor
                .getByRole("radiogroup", { name: "Which transactions to update" })
                .getByRole("radio", { name: "Update all" })
                .click();
            await editor.getByRole("button", { name: "Create and apply" }).click();

            const summary = page.getByTestId("apply-summary");
            await expect(summary).toHaveAttribute("role", "status");
            await expect(summary).toHaveText(/applied to all/i);
            await expect(ruleListItems(page, "COFFEE SHOP 123")).toHaveCount(1);
        });

        await test.step("both outputs are applied to the matching row only", async () => {
            await goToTransactions(page);
            const row = await stableTransactionRow(
                rowsWithDisplayedDescription(page, "COFFEE SHOP 123").first()
            );
            await expect(transactionGridCell(row, "tags")).toContainText("Coffee");
            await expect(await allocationGridCell(row, "Alex")).toContainText("40%");

            const other = await stableTransactionRow(
                rowsWithDisplayedDescription(page, "TEA HOUSE 9").first()
            );
            await expect(transactionGridCell(other, "tags")).not.toContainText("Coffee");
        });

        await test.step("Split moves tags into a new selected rule and changes no row", async () => {
            await goToAutomations(page);
            await ruleListItems(page, "COFFEE SHOP 123").click();
            await page.getByRole("button", { name: "Split Tags into its own rule" }).click();

            // Split previews first and writes nothing until confirmed.
            const preview = page.getByRole("group", { name: "Split preview" });
            await expect(preview).toBeVisible();
            await expect(preview.getByTestId("rule-split-preview-new")).toContainText("Tags");
            await expect(preview.getByTestId("rule-split-preview-source")).toContainText(
                "Allocation"
            );
            await expect(ruleListItems(page, "COFFEE SHOP 123")).toHaveCount(1);
            await preview.getByRole("button", { name: "Confirm split" }).click();

            await expect(ruleListItems(page, "COFFEE SHOP 123")).toHaveCount(2);
            await expect(page.getByText(/2 active rules/i)).toBeVisible();
            const selected = page.getByTestId("rule-list").locator('[aria-current="true"]');
            await expect(selected).toContainText("Tags");
            await expect(selected).not.toContainText("Allocation");
            // A single-output rule offers no Split.
            await expect(page.getByRole("button", { name: /^split/i })).toHaveCount(0);

            await goToTransactions(page);
            const row = await stableTransactionRow(
                rowsWithDisplayedDescription(page, "COFFEE SHOP 123").first()
            );
            await expect(transactionGridCell(row, "tags")).toContainText("Coffee");
            await expect(await allocationGridCell(row, "Alex")).toContainText("40%");
        });

        await test.step("Update new saves a rule but leaves existing rows alone", async () => {
            await goToAutomations(page);
            const editor = await openCreateEditor(page);
            await page.getByLabel(/exact description text/i).fill("TEA HOUSE 9");
            await addOutput(page, "Tags");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await editor
                .getByRole("radiogroup", { name: "Which transactions to update" })
                .getByRole("radio", { name: "Update new" })
                .click();
            await editor.getByRole("button", { name: "Create and apply" }).click();

            await expect(page.getByTestId("apply-summary")).toHaveText(/new imports/i);
            await expect(ruleListItems(page, "TEA HOUSE 9")).toHaveCount(1);

            await goToTransactions(page);
            const row = await stableTransactionRow(
                rowsWithDisplayedDescription(page, "TEA HOUSE 9").first()
            );
            await expect(transactionGridCell(row, "tags")).not.toContainText("Coffee");
        });
    });

    test("inline validation and keyboard / focus accessibility", async ({ page }) => {
        await createNewIdentity(page);
        await goToAutomations(page);

        await test.step("applying a blank rule surfaces accessible errors", async () => {
            const editor = await openCreateEditor(page);
            await editor.getByRole("button", { name: "Create and apply" }).click();

            const error = page.getByTestId("rule-description-error");
            await expect(error).toBeVisible();
            await expect(error).toHaveAttribute("role", "alert");
            await expect(page.getByTestId("rule-outputs-error")).toHaveAttribute("role", "alert");

            // The description input is marked invalid and linked to its error message.
            const description = page.getByLabel(/exact description text/i);
            await expect(description).toHaveAttribute("aria-invalid", "true");
            await expect(page.getByText(/no automation rules yet/i)).toBeVisible();
        });

        await test.step("the exact-description field is reachable and editable by keyboard", async () => {
            const description = page.getByLabel(/exact description text/i);
            await description.focus();
            await expect(description).toBeFocused();
            await page.keyboard.type("KEYBOARD ENTRY");
            await expect(description).toHaveValue("KEYBOARD ENTRY");
        });

        await test.step("scope is a labelled radiogroup explained inline, with no blur option here", async () => {
            const scope = page.getByRole("radiogroup", { name: "Which transactions to update" });
            await expect(scope.getByRole("radio")).toHaveCount(2);
            await expect(
                scope.getByRole("radio", { name: "Update new" })
            ).toHaveAccessibleDescription(/imported from now on/i);
            await expect(page.getByRole("button", { name: /explain apply modes/i })).toHaveCount(0);
            await expect(page.getByRole("checkbox", { name: "Apply on blur" })).toHaveCount(0);
        });

        await test.step("Cancel closes the editor and writes nothing", async () => {
            await page.getByTestId("rule-cancel").click();
            await expect(page.getByTestId("field-rule-editor")).toHaveCount(0);
            await expect(page.getByText(/no automation rules yet/i)).toBeVisible();
        });
    });
});

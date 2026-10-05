/**
 * E2E Test: Transaction description-rule inspector (HS-007 / P17C)
 *
 * Journey-style tests for description-rule matching and drift in the stable transaction inspector.
 * The inspector reuses the shared FieldRuleEditor without adding automation descendants to virtual
 * transaction rows. Description-alias rules apply only to imported transactions, so every scenario
 * imports a CSV row whose exact description matches a rule.
 */

import { expect, type Page, test } from "@playwright/test";

import {
    createNewIdentity,
    goToAutomations,
    goToImportNew,
    goToTxDescriptions,
    openTransactionInspector,
    stableTransactionRow,
    transactionGridCell
} from "./helpers";

/** Create a description alias via the Tx Descriptions page so a rule can target it. */
async function createAlias(page: Page, name: string): Promise<void> {
    await goToTxDescriptions(page);
    await page.getByRole("button", { name: /add alias/i }).click();
    const nameInput = page.getByPlaceholder(/enter alias name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);
    await page.getByRole("button", { name: /^add alias$/i }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/** Create a descriptionAlias field rule mapping an exact description to an existing alias. */
async function createDescriptionAliasRule(
    page: Page,
    input: { readonly description: string; readonly aliasName: string }
): Promise<void> {
    await goToAutomations(page);
    await page.locator('[data-testid="new-rule-btn"]').click();
    await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
    await page.locator('[data-testid="rule-field"]').click();
    await page.getByRole("option", { name: "Description alias" }).click();
    await page.getByLabel(/exact description text/i).fill(input.description);
    await page.locator('[data-testid="rule-alias"]').click();
    await page.getByRole("option", { name: input.aliasName, exact: true }).click();
    await page.locator('[data-testid="rule-save"]').click();
    await expect(page.getByText(new RegExp(input.description))).toBeVisible();
}

/** Import one transaction per row via an inline CSV buffer, landing on /transactions. */
async function importRows(
    page: Page,
    rows: ReadonlyArray<{ readonly date: string; readonly description: string }>
): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "transaction-rules.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                "Date,Description,Amount",
                ...rows.map(({ date, description }, index) =>
                    [date, description, `-${index + 1}.00`].join(",")
                )
            ].join("\n")
        )
    });
    await page.getByRole("tab", { name: /Columns/i }).click();
    await page.getByRole("button", { name: /Auto-detect/i }).click();
    await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
    await page.getByRole("tab", { name: /Account/i }).click();
    await page.locator("#account-select").click();
    await page.getByRole("option", { name: /Default/i }).click();
    const importButton = page.getByRole("button", {
        name: new RegExp(`Import ${rows.length} Transactions`, "i")
    });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page).toHaveURL(/\/transactions/);
}

test.describe("Transaction description-rule inspector", () => {
    test("imported match shows the existing rule in the inspector and reuses the shared editor", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createAlias(page, "Coffee");
        await createDescriptionAliasRule(page, {
            description: "COFFEE SHOP 123",
            aliasName: "Coffee"
        });
        await importRows(page, [{ date: "2026-07-01", description: "COFFEE SHOP 123" }]);

        const row = await stableTransactionRow(page.getByTestId("transaction-row").first());
        const descriptionCell = transactionGridCell(row, "description");
        const descriptionDisplay = row.getByTestId("description-display");
        const descriptionEditor = row.getByTestId("description-editable");
        const inspector = await openTransactionInspector(page);
        await descriptionCell.click();
        const rule = inspector.getByTestId("descriptionAlias-rule-inspector");

        await test.step("the imported rule is visible only in the active transaction inspector", async () => {
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(descriptionDisplay).toHaveText("Coffee");
            await expect(descriptionEditor).toHaveCount(0, { timeout: 3_000 });
            await expect(rule).toBeVisible();
            await expect(rule.getByTestId("transaction-rule-popup")).toBeVisible();
            await expect(rule.getByTestId("field-rule-editor")).toBeVisible();
            await expect(rule.getByTestId("rule-description")).toBeDisabled();
            await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(rule.getByTestId("rule-apply-this")).toHaveCount(0, { timeout: 3_000 });
            await expect(row.getByTestId("transaction-rule-popup")).toHaveCount(0, {
                timeout: 3_000
            });
        });

        await test.step("closing and reopening retains the stable existing-rule card", async () => {
            await page.getByTestId("transaction-inspector-toggle").click();
            await expect(inspector).toBeHidden();
            await page.getByTestId("transaction-inspector-toggle").click();
            await expect(inspector).toBeVisible();
            await expect(rule).toBeVisible();
        });

        await test.step("editing the description leaves inspector-owned rule controls mounted", async () => {
            await descriptionCell.focus();
            await descriptionCell.press("Enter");
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "editor");
            await expect(descriptionEditor).toHaveValue("Coffee");
            await expect(descriptionEditor).toBeFocused();
            await expect(rule).toBeVisible();

            await page.keyboard.press("Escape");
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(descriptionEditor).toHaveCount(0, { timeout: 3_000 });
            await expect(descriptionDisplay).toHaveText("Coffee");
            await expect(descriptionCell).toBeFocused();
            await expect(rule).toBeVisible();
        });
    });

    test("editing the alias drives inspector drift and apply-this resolves it", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createAlias(page, "Coffee");
        await createAlias(page, "Tea");
        await createDescriptionAliasRule(page, {
            description: "COFFEE SHOP 123",
            aliasName: "Coffee"
        });
        await importRows(page, [{ date: "2026-07-01", description: "COFFEE SHOP 123" }]);

        const row = await stableTransactionRow(page.getByTestId("transaction-row").first());
        const descriptionCell = transactionGridCell(row, "description");
        const descriptionDisplay = row.getByTestId("description-display");
        const descriptionEditor = row.getByTestId("description-editable");
        const inspector = await openTransactionInspector(page);
        await descriptionCell.click();
        const rule = inspector.getByTestId("descriptionAlias-rule-inspector");

        await expect(descriptionDisplay).toHaveText("Coffee");
        await expect(rule).toBeVisible();
        await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, { timeout: 3_000 });

        await test.step("repointing the alias exposes drift in the stable inspector", async () => {
            await descriptionCell.focus();
            await descriptionCell.press("Enter");
            await expect(descriptionEditor).toHaveValue("Coffee");
            await descriptionEditor.fill("Tea");
            await descriptionEditor.press("Enter");

            await expect(descriptionDisplay).toHaveText("Tea");
            await expect(rule.getByTestId("transaction-rule-drift")).toBeVisible();
            await expect(rule.getByTestId("rule-apply-this")).toBeVisible();
        });

        await test.step("apply-this restores the rule value and clears drift", async () => {
            await rule.getByTestId("rule-apply-this").click();
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(descriptionEditor).toHaveCount(0, { timeout: 3_000 });
            await expect(descriptionDisplay).toHaveText("Coffee");
            await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(rule).toBeVisible();
        });
    });
});

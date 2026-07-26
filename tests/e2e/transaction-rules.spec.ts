/**
 * E2E Test: Inline description-rule robot (HS-007 / P17C)
 *
 * Journey-style tests for the per-row description-rule robot on the transactions table. The robot
 * REUSES the shared {@link FieldRuleEditor} inside a contextual popover and is driven by the P17A
 * matcher: it is NORMAL when a transaction's current description alias matches its highest-precedence
 * matching rule, RED (drift) when the matching rule implies a different alias, and HIDDEN while the
 * description cell is actively being edited.
 *
 * Description-alias rules only apply to IMPORTED transactions, so every scenario imports a CSV row
 * whose exact description matches a rule. Assertions target accessible roles and stable testids
 * rather than incidental copy.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToAutomations, goToImportNew, goToTxDescriptions } from "./helpers";

// ============================================================================
// Helpers
// ============================================================================

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
    await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 5000 });

    // Ensure the rule targets the descriptionAlias field.
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

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Transaction description-rule robot", () => {
    test("imported match shows a normal robot, hides while editing, and opens the reused editor", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createAlias(page, "Coffee");
        await createDescriptionAliasRule(page, {
            description: "COFFEE SHOP 123",
            aliasName: "Coffee"
        });
        await importRows(page, [{ date: "2026-07-01", description: "COFFEE SHOP 123" }]);

        const description = page.getByTestId("description-editable");
        const robot = page.getByTestId("description-rule-robot");

        await test.step("the rule auto-applied on import and the robot reports a match", async () => {
            // Import-commit runs the P17A engine, so the row already carries the rule's alias.
            await expect(description).toHaveValue("Coffee");
            await expect(robot).toBeVisible();
            await expect(robot).toHaveAttribute("data-drift", "false");
        });

        await test.step("clicking the robot opens the popup that reuses the shared editor", async () => {
            await robot.click();
            await expect(page.getByTestId("transaction-rule-popover")).toBeVisible();
            await expect(page.getByTestId("transaction-rule-popup")).toBeVisible();
            // The shared FieldRuleEditor is mounted, with its description field locked (view/edit,
            // never re-targeting the description from a transaction context).
            await expect(page.getByTestId("field-rule-editor")).toBeVisible();
            await expect(page.getByTestId("rule-description")).toBeDisabled();
            // A matching (non-drift) row offers no drift banner nor apply-this action.
            await expect(page.getByTestId("transaction-rule-drift")).toHaveCount(0);
            await expect(page.getByTestId("rule-apply-this")).toHaveCount(0);
            await page.keyboard.press("Escape");
            await expect(page.getByTestId("transaction-rule-popover")).toHaveCount(0);
        });

        await test.step("the robot is hidden while the description cell is actively edited", async () => {
            await description.click();
            await expect(description).toBeFocused();
            await expect(robot).toHaveCount(0);
            await page.keyboard.press("Escape");
            await expect(robot).toBeVisible();
            await expect(robot).toHaveAttribute("data-drift", "false");
        });
    });

    test("editing the alias to differ drives drift and apply-this resolves it", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createAlias(page, "Coffee");
        // A second, distinct alias the row can be REPOINTED to. Repointing to another existing alias
        // (a `change-one`) is what diverges from the rule's target; renaming the same alias would not.
        await createAlias(page, "Tea");
        await createDescriptionAliasRule(page, {
            description: "COFFEE SHOP 123",
            aliasName: "Coffee"
        });
        await importRows(page, [{ date: "2026-07-01", description: "COFFEE SHOP 123" }]);

        const description = page.getByTestId("description-editable");
        const robot = page.getByTestId("description-rule-robot");

        await expect(robot).toHaveAttribute("data-drift", "false");

        await test.step("repointing the alias creates drift and auto-opens the popup", async () => {
            await description.click();
            await description.fill("Tea");
            await description.press("Enter");

            // Enter commits + blurs, so the (now hidden-during-edit) robot re-appears in drift and
            // the page auto-opens the popup so the user can reconcile the rule.
            await expect(robot).toBeVisible();
            await expect(robot).toHaveAttribute("data-drift", "true");
            await expect(page.getByTestId("transaction-rule-popover")).toBeVisible();
            await expect(page.getByTestId("transaction-rule-drift")).toBeVisible();
            await expect(page.getByTestId("rule-apply-this")).toBeVisible();
        });

        await test.step("apply-this re-applies the rule to only this transaction and clears drift", async () => {
            await page.getByTestId("rule-apply-this").click();
            await expect(page.getByTestId("transaction-rule-popover")).toHaveCount(0);
            await expect(description).toHaveValue("Coffee");
            await expect(robot).toHaveAttribute("data-drift", "false");
        });
    });
});

/**
 * E2E Test: Transaction rule inspector (HS-007 / P17C, grouped rules)
 *
 * Journey-style tests for rule matching, grouping and drift in the stable transaction inspector.
 * The inspector shows one shared rule editor per rule winning a field on the active row, and adds
 * no automation descendants to virtual transaction rows. Description-alias rules apply only to
 * imported transactions, so every scenario imports CSV rows whose exact description matches a rule.
 */

import { expect, type Page, test } from "@playwright/test";

import {
    addTagToRow,
    chooseRuleApply,
    createNewIdentity,
    createTag,
    expectTransactionCellDisplay,
    goToAutomations,
    goToImportNew,
    goToTags,
    goToTxDescriptions,
    inspectorRuleCard,
    inspectorRuleCards,
    openTransactionInspector,
    stableTransactionRow,
    transactionGridCell
} from "./helpers";

const DESCRIPTION = "COFFEE SHOP 123";

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
    await page.getByTestId("new-rule-btn").click();
    await expect(page.getByRole("group", { name: "New rule" })).toBeVisible();
    await page.getByLabel(/exact description text/i).fill(input.description);
    await page.getByRole("combobox", { name: "Add output" }).click();
    await page.getByRole("option", { name: "Description", exact: true }).click();
    await page.getByTestId("rule-alias").click();
    await page.getByRole("option", { name: input.aliasName, exact: true }).click();
    await page.getByTestId("rule-save").click();
    await expect(
        page.getByTestId("rule-list").getByRole("button").filter({ hasText: input.description })
    ).toHaveCount(1);
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

test.describe("Transaction rule inspector", () => {
    test("imported match shows the existing rule, and a tag edit joins, splits from and rejoins it", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await goToTags(page);
        await createTag(page, { name: "Coffee" });
        await createTag(page, { name: "Dining" });
        await createAlias(page, "Coffee");
        await createDescriptionAliasRule(page, { description: DESCRIPTION, aliasName: "Coffee" });
        await importRows(page, [
            { date: "2026-07-01", description: DESCRIPTION },
            { date: "2026-07-02", description: DESCRIPTION }
        ]);

        const row = await stableTransactionRow(page.getByTestId("transaction-row").first());
        const otherRow = await stableTransactionRow(page.getByTestId("transaction-row").nth(1));
        const descriptionCell = transactionGridCell(row, "description");
        const descriptionDisplay = row.getByTestId("description-display");
        const descriptionEditor = row.getByTestId("description-editable");
        const inspector = await openTransactionInspector(page);
        await descriptionCell.click();
        const rule = inspectorRuleCard(inspector, "descriptionAlias");
        const proposal = inspector.getByTestId("tags-rule-proposal");

        await test.step("the imported rule is visible only in the active transaction inspector", async () => {
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(descriptionDisplay).toHaveText("Coffee");
            await expect(descriptionEditor).toHaveCount(0, { timeout: 3_000 });
            await expect(rule).toBeVisible();
            await expect(rule.getByTestId("field-rule-editor")).toBeVisible();
            // The stored key is shown, never edited, from a transaction.
            await expect(rule.getByTestId("rule-description")).toHaveText(DESCRIPTION);
            await expect(rule.getByRole("textbox", { name: /exact description/i })).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(rule.getByTestId("rule-apply-this-descriptionAlias")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(row.getByTestId("field-rule-editor")).toHaveCount(0, { timeout: 3_000 });
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

        await test.step("a tag edit extends the description rule instead of creating a second", async () => {
            await addTagToRow(page, row, "Coffee");

            await expect(proposal).toHaveAttribute("data-kind", "extend");
            await expect(
                proposal.getByRole("group", {
                    name: new RegExp(`^Adding tags to rule · ${DESCRIPTION}`)
                })
            ).toBeVisible();
            // The rule it joins is folded into the proposal, with its alias output shown beside.
            await expect(rule).toHaveCount(0, { timeout: 3_000 });
            await expect(proposal.getByTestId("rule-output-descriptionAlias")).toBeVisible();
            await expect(proposal.getByTestId("rule-output-tags")).toContainText("pending");
            // Extending adds an output the rule lacks, so there is no stored value to overwrite.
            await expect(proposal.getByTestId("rule-output-stored-tags")).toHaveCount(0);

            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("both outputs of the one rule now apply to another matching row", async () => {
            await expect(inspectorRuleCards(inspector)).toHaveCount(1);
            await expect(rule).toHaveAttribute("data-automation-field", "descriptionAlias tags");
            await expectTransactionCellDisplay(otherRow, "tags", "Coffee");
            await expect(otherRow.getByTestId("description-display")).toHaveText("Coffee");
        });

        await test.step("Split is withheld while the rule card's draft has an unsaved edit", async () => {
            // Query by test id: while the Select's listbox is open Radix hides the rest of the page
            // from the accessibility tree, which a role query would read as Split being gone.
            const splitButtons = rule.locator('[data-testid^="rule-split-"]');
            const tagMode = rule.getByTestId("rule-tag-mode");
            const listbox = page.getByRole("listbox");
            await expect(splitButtons).toHaveCount(2);

            await rule.getByRole("button", { name: "Edit Tags" }).click();
            await tagMode.click();
            await page.getByRole("option", { name: "Set tags (clear existing)" }).click();
            await expect(listbox).toHaveCount(0, { timeout: 3_000 });
            await expect(tagMode).toContainText("Set tags");
            await expect(splitButtons).toHaveCount(0, { timeout: 3_000 });

            await tagMode.click();
            await page.getByRole("option", { name: "Add tags" }).click();
            await expect(listbox).toHaveCount(0, { timeout: 3_000 });
            await expect(tagMode).toContainText("Add tags");
            await expect(splitButtons).toHaveCount(2);
            await rule.getByRole("button", { name: "Done editing Tags" }).click();
        });

        await test.step("splitting tags out previews two rules and writes only on confirm", async () => {
            await rule.getByRole("button", { name: "Split Tags into its own rule" }).click();
            const preview = rule.getByRole("group", { name: "Split preview" });
            await expect(preview).toBeVisible();
            await expect(inspectorRuleCards(inspector)).toHaveCount(1);

            await preview.getByRole("button", { name: "Confirm split" }).click();
            await expect(inspectorRuleCards(inspector)).toHaveCount(2);
            await expect(inspectorRuleCard(inspector, "tags")).toHaveAttribute(
                "data-automation-field",
                "tags"
            );
            // A split changes no transaction.
            await expectTransactionCellDisplay(row, "tags", "Coffee");
            await expect(descriptionDisplay).toHaveText("Coffee");
        });

        await test.step("a further tag edit defaults to the split-out owner and offers moving it", async () => {
            await addTagToRow(page, row, "Dining");

            await expect(proposal).toHaveAttribute("data-kind", "conflict");
            const keep = proposal.getByTestId("rule-resolution-keep");
            const move = proposal.getByTestId("rule-resolution-move");
            await expect(keep).toBeChecked();
            await expect(move).not.toBeChecked();
            // Both rules the choice is between are folded into the proposal.
            await expect(inspectorRuleCards(inspector)).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("moving rejoins the tags to the description rule and deletes the owner", async () => {
            await proposal.getByTestId("rule-resolution-move").click();
            await expect(proposal.getByTestId("rule-resolution-move")).toBeChecked();
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });

            await expect(inspectorRuleCards(inspector)).toHaveCount(1);
            await expect(rule).toHaveAttribute("data-automation-field", "descriptionAlias tags");
            await expect(transactionGridCell(otherRow, "tags")).toContainText("Dining");
            await goToAutomations(page);
            await expect(page.getByTestId("rule-list").getByRole("listitem")).toHaveCount(1);
        });
    });

    test("editing the alias drives inspector drift and apply-this resolves it", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createAlias(page, "Coffee");
        await createAlias(page, "Tea");
        await createDescriptionAliasRule(page, { description: DESCRIPTION, aliasName: "Coffee" });
        await importRows(page, [{ date: "2026-07-01", description: DESCRIPTION }]);

        const row = await stableTransactionRow(page.getByTestId("transaction-row").first());
        const descriptionCell = transactionGridCell(row, "description");
        const descriptionDisplay = row.getByTestId("description-display");
        const descriptionEditor = row.getByTestId("description-editable");
        const inspector = await openTransactionInspector(page);
        await descriptionCell.click();
        const rule = inspectorRuleCard(inspector, "descriptionAlias");
        const proposal = inspector.getByTestId("description-rule-proposal");
        const applyThis = rule.getByTestId("rule-apply-this-descriptionAlias");
        const toggle = page.getByTestId("transaction-inspector-toggle");
        const driftDot = page.getByTestId("transaction-inspector-drift-badge");

        await expect(descriptionDisplay).toHaveText("Coffee");
        await expect(rule).toBeVisible();
        await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, { timeout: 3_000 });

        await test.step("repointing the alias offers to update the rule it differs from", async () => {
            await descriptionCell.focus();
            await descriptionCell.press("Enter");
            await expect(descriptionEditor).toHaveValue("Coffee");
            await descriptionEditor.fill("Tea");
            await descriptionEditor.press("Enter");

            await expect(descriptionDisplay).toHaveText("Tea");
            await expect(proposal).toHaveAttribute("data-kind", "update");
            // Updating an output the rule already has edits that rule, so it is titled as the rule.
            await expect(
                proposal.getByRole("group", { name: new RegExp(`^Rule · ${DESCRIPTION}`) })
            ).toBeVisible();
            await expect(rule).toHaveCount(0, { timeout: 3_000 });
            // The rule's card is folded away, so the proposal shows the value Apply overwrites.
            await expect(proposal.getByTestId("rule-output-stored-descriptionAlias")).toHaveText(
                /^Stored: .*Coffee/
            );
        });

        await test.step("cancelling keeps the rule, which now shows amber drift", async () => {
            await proposal.getByTestId("rule-cancel").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            await expect(rule.getByTestId("transaction-rule-drift")).toBeVisible();
            await expect(rule.getByTestId("rule-output-descriptionAlias")).toHaveClass(
                /border-amber-500/
            );
            await expect(applyThis).toBeVisible();
        });

        await test.step("the closed inspector's toggle carries an amber drift dot", async () => {
            await toggle.click();
            await expect(inspector).toBeHidden();
            await expect(driftDot).toBeVisible();
            await expect(toggle).toHaveAccessibleName(
                "Inspector, a rule differs from this transaction"
            );
            await toggle.click();
            await expect(inspector).toBeVisible();
            await expect(driftDot).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("apply-this restores the rule value and clears drift", async () => {
            await applyThis.click();
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(descriptionEditor).toHaveCount(0, { timeout: 3_000 });
            await expect(descriptionDisplay).toHaveText("Coffee");
            await expect(rule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(rule).toBeVisible();

            await toggle.click();
            await expect(inspector).toBeHidden();
            await expect(driftDot).toHaveCount(0, { timeout: 3_000 });
            await expect(toggle).toHaveAccessibleName("Inspector");
        });
    });
});

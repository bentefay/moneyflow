/**
 * E2E Test: Tag + allocation field-rule parity and apply-mode persistence (HS-007 / P17D)
 *
 * These journeys exercise tag and allocation parity in the shared rule editor and the stable
 * transaction inspector. Existing-rule controls are keyed to the active transaction and rule field;
 * virtual transaction rows own no rule UI. Tag and allocation rules still apply to manual rows,
 * while description-alias rules remain imported-only. The four apply modes remain remembered.
 */

import { expect, type Page, test } from "@playwright/test";

import {
    createNewIdentity,
    goToAutomations,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions,
    openTransactionInspector,
    rowsWithDisplayedDescription,
    stableTransactionRow,
    transactionGridCell
} from "./helpers";
import { addPerson, addTransaction, DEFAULT_PERSON_NAME } from "./helpers/settlement";

// ============================================================================
// Helpers
// ============================================================================

/** Create a tag via the Tags page so a tag-field rule has a value to pick. */
async function createTag(page: Page, name: string): Promise<void> {
    await goToTags(page);
    await page.getByRole("button", { name: /add tag/i }).click();
    const nameInput = page.getByPlaceholder(/enter tag name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);
    await page.getByRole("button", { name: /^add tag$/i }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/** Open the create-rule editor from the automations manager. */
async function openCreateEditor(page: Page): Promise<void> {
    await goToAutomations(page);
    await page.locator('[data-testid="new-rule-btn"]').click();
    await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
}

/** Pick an option from a shadcn Select identified by its trigger testid. */
async function chooseFromSelect(
    page: Page,
    triggerTestId: string,
    optionName: string
): Promise<void> {
    await page.locator(`[data-testid="${triggerTestId}"]`).click();
    await page.getByRole("option", { name: optionName, exact: true }).click();
}

/** Import one transaction per row via an inline CSV buffer, landing on /transactions. */
async function importRows(
    page: Page,
    rows: ReadonlyArray<{ readonly date: string; readonly description: string }>
): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "field-rule-parity.csv",
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

test.describe("Tag field-rule parity", () => {
    test("add/set mode select is offered on create and mirrored in the inspector", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create a SET-mode tag rule for an exact description", async () => {
            await openCreateEditor(page);
            await expect(page.getByTestId("rule-tag-mode")).toBeVisible();
            await chooseFromSelect(page, "rule-tag-mode", "Set tags (clear existing)");
            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/COFFEE SHOP 123/)).toBeVisible();
        });

        await importRows(page, [{ date: "2026-07-01", description: "COFFEE SHOP 123" }]);
        const row = await stableTransactionRow(page.getByTestId("transaction-row").first());
        const inspector = await openTransactionInspector(page);
        await transactionGridCell(row, "description").click();
        const rule = inspector.getByTestId("tags-rule-inspector");

        await test.step("the inspector reuses the shared editor for the active matching row", async () => {
            await expect(rule).toBeVisible();
            await expect(rule.getByTestId("transaction-rule-popup")).toBeVisible();
            await expect(rule.getByTestId("field-rule-editor")).toBeVisible();
            await expect(rule.getByTestId("rule-tag-mode")).toContainText(/set tags/i);
            await expect(
                rule
                    .getByRole("group", { name: /tags to apply/i })
                    .getByRole("button", { name: "Coffee" })
            ).toHaveAttribute("aria-pressed", "true");
            await expect(row.getByTestId("transaction-rule-popup")).toHaveCount(0, {
                timeout: 3_000
            });
        });
    });
});

test.describe("Allocation field-rule parity", () => {
    test("allocation rules are edited through a column-per-person grid capturing the whole set", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToPeople(page);
        await addPerson(page, "Alex");

        await openCreateEditor(page);

        await test.step("selecting the allocation field reveals a percentage column per person", async () => {
            await chooseFromSelect(page, "rule-field", "Person percentages");
            const grid = page.getByTestId("rule-allocation-grid");
            await expect(grid).toBeVisible();
            // One labelled input per active person (the seeded "Me" plus "Alex").
            await expect(grid.getByLabel(DEFAULT_PERSON_NAME)).toBeVisible();
            await expect(grid.getByLabel("Alex")).toBeVisible();
        });

        await test.step("the whole explicit set is entered and saved as one rule", async () => {
            const grid = page.getByTestId("rule-allocation-grid");
            await grid.getByLabel(DEFAULT_PERSON_NAME).fill("60");
            await grid.getByLabel("Alex").fill("40");
            await page.getByLabel(/exact description text/i).fill("SPLIT DINNER");
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/SPLIT DINNER/)).toBeVisible();
        });

        await test.step("reopening the rule shows the persisted per-person columns", async () => {
            await page.getByText(/SPLIT DINNER/).click();
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
            const grid = page.getByTestId("rule-allocation-grid");
            await expect(grid.getByLabel(DEFAULT_PERSON_NAME)).toHaveValue("60");
            await expect(grid.getByLabel("Alex")).toHaveValue("40");
        });
    });
});

test.describe("Manual-row applicability", () => {
    // Frozen `:294-295`: tag/allocation rules apply to manually-created rows, which per frozen `:269`
    // carry NO raw description text — only a description alias. The engine now projects that alias's
    // resolved NAME as the match text (Q-P17D-01) so tag/allocation rules surface for manual rows,
    // while description-alias rules stay excluded via the manual-row field gate. The engine-level
    // proof of all four behaviours lives in tests/integration/field-rule-mutations.test.ts; this
    // journey exercises the same behaviours through the real UI end to end.
    test("tag and allocation rules apply to a manual aliased row while description rules never do", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToPeople(page);
        await addPerson(page, "Alex");
        await createTag(page, "Coffee");

        await test.step("create an add-mode tag rule keyed on the alias name", async () => {
            await openCreateEditor(page);
            await chooseFromSelect(page, "rule-tag-mode", "Add tags");
            await page.getByLabel(/exact description text/i).fill("MANUAL COFFEE");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/MANUAL COFFEE/)).toBeVisible();
        });

        await test.step("create an allocation rule keyed on the same alias name", async () => {
            await openCreateEditor(page);
            await chooseFromSelect(page, "rule-field", "Person percentages");
            const grid = page.getByTestId("rule-allocation-grid");
            await grid.getByLabel(DEFAULT_PERSON_NAME).fill("60");
            await grid.getByLabel("Alex").fill("40");
            await page.getByLabel(/exact description text/i).fill("MANUAL COFFEE");
            await page.locator('[data-testid="rule-save"]').click();
        });

        await goToTransactions(page);
        // A manual grid row stores "MANUAL COFFEE" as a description ALIAS; the raw description is empty.
        await addTransaction(page, { description: "MANUAL COFFEE", amount: "-4.50" });

        const row = await stableTransactionRow(
            rowsWithDisplayedDescription(page, "MANUAL COFFEE").first()
        );
        const inspector = await openTransactionInspector(page);
        await transactionGridCell(row, "description").click();
        const tagsRule = inspector.getByTestId("tags-rule-inspector");
        const allocationRule = inspector.getByTestId("allocation-rule-inspector");

        await test.step("the manual row exposes drifting tag and allocation rules but no description rule", async () => {
            await expect(tagsRule.getByTestId("transaction-rule-drift")).toBeVisible();
            await expect(allocationRule.getByTestId("transaction-rule-drift")).toBeVisible();
            await expect(inspector.getByTestId("descriptionAlias-rule-inspector")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(row.getByTestId("transaction-rule-popup")).toHaveCount(0, {
                timeout: 3_000
            });
        });

        await test.step("apply-to-this reconciles every matching rule for the manual row", async () => {
            await tagsRule.getByTestId("rule-apply-this").click();
            await expect(tagsRule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(allocationRule.getByTestId("transaction-rule-drift")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(tagsRule).toBeVisible();
            await expect(allocationRule).toBeVisible();
        });
    });

    test("a manual row whose alias name matches no rule shows no existing-rule controls", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create a tag rule for one specific description", async () => {
            await openCreateEditor(page);
            await page.getByLabel(/exact description text/i).fill("MANUAL COFFEE");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/MANUAL COFFEE/)).toBeVisible();
        });

        await goToTransactions(page);
        await addTransaction(page, { description: "SOMETHING ELSE", amount: "-9.99" });

        const row = await stableTransactionRow(
            rowsWithDisplayedDescription(page, "SOMETHING ELSE").first()
        );
        const inspector = await openTransactionInspector(page);
        await transactionGridCell(row, "description").click();

        await expect(inspector.getByTestId("tags-rule-inspector")).toHaveCount(0, {
            timeout: 3_000
        });
        await expect(inspector.getByTestId("allocation-rule-inspector")).toHaveCount(0, {
            timeout: 3_000
        });
        await expect(inspector.getByTestId("descriptionAlias-rule-inspector")).toHaveCount(0, {
            timeout: 3_000
        });
        await expect(inspector.getByTestId("transaction-rule-popup")).toHaveCount(0, {
            timeout: 3_000
        });
    });
});

test.describe("Apply-mode persistence", () => {
    test("the four-mode apply select is remembered and restored on reopen", async ({ page }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create a rule after choosing a non-default apply mode", async () => {
            await openCreateEditor(page);
            await chooseFromSelect(page, "rule-apply-mode", "Updating all");
            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/COFFEE SHOP 123/)).toBeVisible();
        });

        await test.step("a freshly opened editor restores the remembered apply mode", async () => {
            await page.locator('[data-testid="new-rule-btn"]').click();
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 15_000 });
            await expect(page.getByTestId("rule-apply-mode")).toContainText(/updating all/i);
        });
    });
});

test.describe("Inspector existing rules at scale", () => {
    test("only an active matching transaction shows existing-rule controls and rows own none", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create a tag rule matching a single exact description", async () => {
            await openCreateEditor(page);
            await page.getByLabel(/exact description text/i).fill("COFFEE SHOP 123");
            await page
                .getByRole("group", { name: /tags to apply/i })
                .getByRole("button", { name: "Coffee" })
                .click();
            await page.locator('[data-testid="rule-save"]').click();
            await expect(page.getByText(/COFFEE SHOP 123/)).toBeVisible();
        });

        // Two matching rows amongst ten unique non-matching ones.
        const rows = [
            { date: "2026-07-01", description: "COFFEE SHOP 123" },
            { date: "2026-07-02", description: "COFFEE SHOP 123" },
            ...Array.from({ length: 10 }, (_unused, index) => ({
                date: "2026-07-03",
                description: `UNRELATED MERCHANT ${index}`
            }))
        ];
        await importRows(page, rows);

        await test.step("the inspector follows matching rows and clears for an unrelated row", async () => {
            const inspector = await openTransactionInspector(page);
            const matchingRows = rowsWithDisplayedDescription(page, "COFFEE SHOP 123");
            await expect(matchingRows).toHaveCount(2);

            await transactionGridCell(
                await stableTransactionRow(matchingRows.nth(0)),
                "description"
            ).click();
            await expect(inspector.getByTestId("tags-rule-inspector")).toBeVisible();
            await transactionGridCell(
                await stableTransactionRow(matchingRows.nth(1)),
                "description"
            ).click();
            await expect(inspector.getByTestId("tags-rule-inspector")).toBeVisible();

            const unrelatedRow = await stableTransactionRow(
                rowsWithDisplayedDescription(page, "UNRELATED MERCHANT 0").first()
            );
            await transactionGridCell(unrelatedRow, "description").click();
            await expect(inspector.getByTestId("tags-rule-inspector")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(
                page.getByTestId("transaction-row").getByTestId("transaction-rule-popup")
            ).toHaveCount(0, { timeout: 3_000 });
        });
    });
});

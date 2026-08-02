/**
 * E2E Test: inline rule-CREATION controls (HS-007 / UR-009)
 *
 * These journeys reproduce the principal's reported defect directly: changing a field on an imported
 * transaction that matches NO rule must surface controls offering to create one, so the change can be
 * applied to the other matching transactions.
 *
 * This is a different surface from `transaction-rules.spec.ts` and `field-rule-parity.spec.ts`, which
 * cover the robot — the affordance for a rule that ALREADY exists. Both are required by the frozen
 * text and both are exercised: the robot suites stay untouched.
 *
 * Assertions target accessible roles and stable testids, and the outcome each journey asserts is the
 * user-visible one — the OTHER matching row actually changing — rather than the mere presence of a
 * control.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";

import {
    createNewIdentity,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions
} from "./helpers";
import { addPerson, addTransaction, DEFAULT_PERSON_NAME } from "./helpers/settlement";

const MATCHING_DESCRIPTION = "COFFEE SHOP 123";

/** Create a tag via the Tags page so a tag change has something to apply. */
async function createTag(page: Page, name: string): Promise<void> {
    await goToTags(page);
    await page.getByRole("button", { name: /add tag/i }).click();
    const nameInput = page.getByPlaceholder(/enter tag name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);
    await page.getByRole("button", { name: /^add tag$/i }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/** Import one transaction per row via an inline CSV buffer, landing on /transactions. */
async function importRows(
    page: Page,
    rows: ReadonlyArray<{ readonly date: string; readonly description: string }>
): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "rule-creation-controls.csv",
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

/**
 * Add a tag to a row through the inline cell.
 *
 * The dropdown is portaled and its search input is the signal that it is actually open, so this
 * waits for that input rather than clicking blind into a cell that may still be re-rendering.
 */
async function addTagToRow(page: Page, row: Locator, tagName: string): Promise<void> {
    await expect(row.getByTestId("tags-editable")).toBeVisible();
    await row.getByTestId("tags-editable").click();
    const searchInput = page.getByPlaceholder("Search tags...");
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await page.getByRole("option", { name: tagName, exact: true }).click();
    // Selection saves immediately; closing the dropdown is what ends the edit.
    await page.keyboard.press("Escape");
    await expect(searchInput).toHaveCount(0);
}

/** The rows carrying an exact description, in table order. */
function rowsWithDescription(page: Page) {
    return page.getByTestId("transaction-row").filter({ hasText: MATCHING_DESCRIPTION });
}

test.describe("Rule-creation controls on a transaction matching no rule", () => {
    test("changing a tag offers to create a rule that applies to the other matching rows", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        // Two rows share an exact description; a third differs and must never be touched.
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION },
            { date: "2026-07-03", description: "UNRELATED MERCHANT" }
        ]);

        const proposal = page.getByTestId("tags-rule-proposal");

        await test.step("no rule exists yet, so no robot and no controls are shown at rest", async () => {
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(0);
            await expect(proposal).toHaveCount(0);
        });

        await test.step("adding a tag surfaces the creation controls", async () => {
            await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");

            await expect(proposal).toBeVisible();
            // This is a CREATE, not an edit of an existing rule.
            await expect(proposal).toHaveAttribute("data-kind", "create");
            // The frozen control set: the four-mode select, the tick, and both restrictions.
            await expect(page.getByTestId("proposal-apply-mode")).toBeVisible();
            await expect(page.getByTestId("proposal-confirm")).toBeVisible();
            await expect(page.getByTestId("proposal-amount-toggle")).toBeVisible();
            await expect(page.getByTestId("proposal-account-toggle")).toBeVisible();
            // Tags carry one further select after "only this account" (frozen `:290-292`).
            await expect(page.getByTestId("proposal-tag-mode")).toBeVisible();
        });

        await test.step("confirming with update all applies the tag to the other matching row", async () => {
            await page.getByTestId("proposal-apply-mode").click();
            await page.getByRole("option", { name: "Update all", exact: true }).click();
            await page.getByTestId("proposal-confirm").click();

            await expect(proposal).toHaveCount(0);
            // The SECOND matching row now carries the tag, applied by the rule the controls created.
            const secondRow = rowsWithDescription(page).nth(1);
            await expect(secondRow.getByTestId("tags-editable")).toContainText("Coffee");
            // The non-matching row is untouched: the rule keys on the exact description text.
            const unrelated = page
                .getByTestId("transaction-row")
                .filter({ hasText: "UNRELATED MERCHANT" });
            await expect(unrelated.getByTestId("tags-editable")).not.toContainText("Coffee");
        });

        await test.step("the rule now exists, so the robot takes over on both matching rows", async () => {
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(2);
        });
    });

    test("changing a description alias offers to create a rule that applies to the other rows", async ({
        page
    }) => {
        await createNewIdentity(page);
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const proposal = page.getByTestId("description-rule-proposal");

        await test.step("renaming the description surfaces the creation controls", async () => {
            const firstRow = rowsWithDescription(page).first();
            const description = firstRow.getByTestId("description-editable");
            await description.click();
            await description.fill("Coffee");
            await description.press("Enter");

            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "create");
            // Description rules carry no add/set select: that is a tags-only control.
            await expect(page.getByTestId("proposal-tag-mode")).toHaveCount(0);
        });

        await test.step("confirming with update all repoints the other matching row", async () => {
            await page.getByTestId("proposal-apply-mode").click();
            await page.getByRole("option", { name: "Update all", exact: true }).click();
            await page.getByTestId("proposal-confirm").click();

            await expect(proposal).toHaveCount(0);
            const secondRow = page.getByTestId("transaction-row").nth(1);
            await expect(secondRow.getByTestId("description-editable")).toHaveValue("Coffee");
        });
    });

    test("changing a person percentage offers to create a rule spanning the whole set", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToPeople(page);
        await addPerson(page, "Alex");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const proposal = page.getByTestId("allocation-rule-proposal");
        const firstRow = rowsWithDescription(page).first();

        await test.step("editing one person's column surfaces the creation controls", async () => {
            await firstRow
                .getByRole("button", { name: `Edit ${DEFAULT_PERSON_NAME} allocation` })
                .click();
            await firstRow
                .getByRole("textbox", { name: `${DEFAULT_PERSON_NAME} allocation percentage` })
                .fill("60");
            await page.keyboard.press("Enter");

            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "create");
            await expect(page.getByTestId("proposal-tag-mode")).toHaveCount(0);
        });

        await test.step("confirming with update all applies the whole percentage set to the other row", async () => {
            await page.getByTestId("proposal-apply-mode").click();
            await page.getByRole("option", { name: "Update all", exact: true }).click();
            await page.getByTestId("proposal-confirm").click();

            await expect(proposal).toHaveCount(0);
            const secondRow = rowsWithDescription(page).nth(1);
            await expect(
                secondRow.getByRole("button", { name: `Edit ${DEFAULT_PERSON_NAME} allocation` })
            ).toContainText("60%");
        });
    });

    test("a manual row offers a tag rule but never a description-alias rule", async ({ page }) => {
        // Frozen `:268-270` + `:294-295`: description rules do not apply to manually created rows,
        // which carry no imported description text; tag and percentage rules do.
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await goToTransactions(page);
        await addTransaction(page, { description: "MANUAL COFFEE", amount: "-4.50" });

        const row = page.getByTestId("transaction-row").filter({ hasText: "MANUAL COFFEE" });
        await addTagToRow(page, row, "Coffee");

        await expect(page.getByTestId("tags-rule-proposal")).toBeVisible();
        await expect(page.getByTestId("description-rule-proposal")).toHaveCount(0);
    });
});

test.describe("Updating an existing rule from the same controls", () => {
    // Frozen `:287-289`: when the changed field already has a matching rule, the same four choices
    // are offered but applying UPDATES that rule rather than creating a second one.
    test("changing a tag on a row that already matches offers an update, not a duplicate", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await createTag(page, "Dining");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        await test.step("create the rule from the first tag change", async () => {
            await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");
            await page.getByTestId("proposal-apply-mode").click();
            await page.getByRole("option", { name: "Update all", exact: true }).click();
            await page.getByTestId("proposal-confirm").click();
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(2);
        });

        await test.step("a further tag change offers an UPDATE of that same rule", async () => {
            await addTagToRow(page, rowsWithDescription(page).first(), "Dining");

            const proposal = page.getByTestId("tags-rule-proposal");
            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "update");
        });
    });
});

/**
 * E2E Test: inspector rule-creation controls (HS-007 / UR-009)
 *
 * Changing a rule-backed transaction field with no matching rule publishes controller-owned creation
 * controls in the stable transaction inspector. These journeys assert editor-finalization boundaries,
 * proposal persistence, automatic owner-exit application, and the resulting changes to other matching
 * transactions.
 */

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
    activateTransactionEditor,
    addTagToRow,
    allocationGridCell,
    chooseRuleApply,
    createNewIdentity,
    expectTransactionCellDisplay,
    goToAutomations,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions,
    inspectorRuleCard,
    openTransactionInspector,
    rowsWithDisplayedDescription,
    stableTransactionRow,
    transactionGridCell
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

/** The rows whose resting description display carries an exact value, in table order. */
function rowsWithDescription(page: Page, description: string = MATCHING_DESCRIPTION): Locator {
    return rowsWithDisplayedDescription(page, description);
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

        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");

        await test.step("no rule exists yet, so no existing-rule or proposal controls are shown", async () => {
            await expect(inspectorRuleCard(inspector, "tags")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("adding a tag surfaces the creation controls", async () => {
            await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");

            await expect(proposal).toBeVisible();
            // This is a CREATE, not an edit of an existing rule.
            await expect(proposal).toHaveAttribute("data-kind", "create");
            // The control set: the scope radios, Apply on blur, Apply, and both restrictions.
            await expect(
                proposal.getByRole("radiogroup", { name: /which transactions/i })
            ).toBeVisible();
            await expect(proposal.getByTestId("rule-apply-on-blur")).toBeVisible();
            await expect(proposal.getByTestId("rule-save")).toBeVisible();
            await expect(proposal.getByTestId("rule-amount-toggle")).toBeVisible();
            await expect(proposal.getByTestId("rule-account-toggle")).toBeVisible();
            await expect(proposal.getByTestId("rule-tag-mode")).toBeVisible();
        });

        await test.step("confirming with update all applies the tag to the other matching row", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();

            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            // The SECOND matching row now carries the tag, applied by the rule the controls created.
            const secondRow = rowsWithDescription(page).nth(1);
            await expectTransactionCellDisplay(secondRow, "tags", "Coffee");
            // The non-matching row is untouched: the rule keys on the exact description text.
            const unrelated = rowsWithDescription(page, "UNRELATED MERCHANT");
            await expect(transactionGridCell(unrelated, "tags")).not.toContainText("Coffee");
        });

        await test.step("the active transaction now exposes the existing rule in the inspector", async () => {
            await expect(inspectorRuleCard(inspector, "tags")).toBeVisible();
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

        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("description-rule-proposal");

        await test.step("renaming the description surfaces the creation controls", async () => {
            // Positional for the same reason as the Enter-commit journey below: this step renames
            // the description, so a locator filtering on the old one would stop matching this row.
            // Nothing here re-uses it after the rename, so it survives — but by accident of ordering
            // rather than by construction, which is not a property worth relying on.
            const firstRow = page.getByTestId("transaction-row").first();
            const description = await activateTransactionEditor(firstRow, "description");
            await description.fill("Coffee");
            await description.press("Enter");
            await expectTransactionCellDisplay(firstRow, "description", "Coffee");

            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "create");
            // Description rules carry no add/set select: that is a tags-only control.
            await expect(proposal.getByTestId("rule-tag-mode")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(inspector).toHaveRole("complementary");
            await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("confirming with update all repoints the other matching row", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();

            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            const secondRow = page.getByTestId("transaction-row").nth(1);
            await expectTransactionCellDisplay(secondRow, "description", "Coffee");
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

        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("allocation-rule-proposal");
        const firstRow = rowsWithDescription(page).first();

        await test.step("editing one person's column surfaces the creation controls", async () => {
            const allocationCell = await allocationGridCell(firstRow, DEFAULT_PERSON_NAME);
            await expect(allocationCell).toHaveAttribute("data-cell-content", "display");
            await allocationCell.dblclick();
            await expect(allocationCell).toHaveAttribute("data-cell-content", "editor");
            const allocation = firstRow.getByRole("textbox", {
                name: `${DEFAULT_PERSON_NAME} allocation percentage`
            });
            await allocation.fill("60");
            await transactionGridCell(firstRow, "date").click();
            await expect(allocationCell).toHaveAttribute("data-cell-content", "display");
            await expect(allocation).toHaveCount(0, { timeout: 3_000 });
            await expect(allocationCell).toContainText("60%");

            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "create");
            await expect(proposal.getByTestId("rule-tag-mode")).toHaveCount(0, {
                timeout: 3_000
            });
        });

        await test.step("confirming with update all applies the whole percentage set to the other row", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();

            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            const secondRow = rowsWithDescription(page).nth(1);
            const allocationCell = await allocationGridCell(secondRow, DEFAULT_PERSON_NAME);
            await expect(allocationCell).toHaveAttribute("data-cell-content", "display");
            await expect(allocationCell).toContainText("60%");
        });
    });

    test("a manual row offers a tag rule but never a description-alias rule", async ({ page }) => {
        // Frozen `:268-270` + `:294-295`: description rules do not apply to manually created rows,
        // which carry no imported description text; tag and percentage rules do.
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await goToTransactions(page);
        await addTransaction(page, { description: "MANUAL COFFEE", amount: "-4.50" });

        const row = rowsWithDescription(page, "MANUAL COFFEE");
        const inspector = await openTransactionInspector(page);
        await addTagToRow(page, row, "Coffee");

        await expect(inspector.getByTestId("tags-rule-proposal")).toBeVisible();
        await expect(inspector.getByTestId("description-rule-proposal")).toHaveCount(0, {
            timeout: 3_000
        });
    });
});

test.describe("The proposal must not disturb the edit that summoned it", () => {
    // Regression pin for P30 rev 01 F-1. The proposal used to be mounted by switching the element
    // type at the cell's position, which remounted the cell and closed the tag picker on the very
    // gesture that opened the proposal — so adding a second tag meant reopening the dropdown.
    test("the tag dropdown stays open after selecting a tag while a proposal appears", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await createTag(page, "Dining");
        await importRows(page, [{ date: "2026-07-01", description: MATCHING_DESCRIPTION }]);

        const row = rowsWithDescription(page).first();
        const inspector = await openTransactionInspector(page);
        const tagsEditor = await activateTransactionEditor(row, "tags");

        const searchInput = page.getByPlaceholder("Search tags...");
        await expect(searchInput).toBeVisible({ timeout: 15_000 });
        await page.getByRole("option", { name: "Coffee", exact: true }).click();

        // F-1's actual property: the cell is not remounted, so the picker survives its own
        // selection. The proposal deliberately stays away until the picker closes (see the
        // occlusion suite below), so this asserts the PICKER, not the proposal.
        await expect(searchInput).toBeVisible();

        // The multi-select still works without reopening: a second tag can be picked directly.
        // Before F-1 this was impossible — the first selection remounted the cell and closed the
        // picker, forcing the user to reopen it for every additional tag.
        await page.getByRole("option", { name: "Dining", exact: true }).click();
        await expect(tagsEditor).toContainText("Dining");
        await expect(tagsEditor).toContainText("Coffee");

        // And once the edit is finished the proposal does arrive, carrying both tags.
        await transactionGridCell(row, "date").click();
        await expect(searchInput).toHaveCount(0, { timeout: 3_000 });
        await expectTransactionCellDisplay(row, "tags", "Coffee");
        await expect(transactionGridCell(row, "tags")).toContainText("Dining");
        await expect(inspector.getByTestId("tags-rule-proposal")).toBeVisible();
    });
});

test.describe("Proposal publication and inspector persistence", () => {
    test("the proposal waits for the tag picker to close and survives inspector close/reopen", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [{ date: "2026-07-01", description: MATCHING_DESCRIPTION }]);

        const row = rowsWithDescription(page).first();
        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");
        const searchInput = page.getByPlaceholder("Search tags...");

        await activateTransactionEditor(row, "tags");
        await expect(searchInput).toBeVisible({ timeout: 15_000 });
        await page.getByRole("option", { name: "Coffee", exact: true }).click();

        await test.step("while the picker is still open the proposal stays out of its way", async () => {
            await expect(searchInput).toBeVisible();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("closing the picker surfaces the proposal", async () => {
            // Click elsewhere in the row rather than pressing Escape: the picker's Escape handler is
            // bound to its search input, and focus has already left that input by this point, so
            // Escape does not reach it. That is a pre-existing defect in the cell, outside UR-009.
            await transactionGridCell(row, "date").click();
            await expect(searchInput).toHaveCount(0, { timeout: 3_000 });
            await expectTransactionCellDisplay(row, "tags", "Coffee");
            await expect(proposal).toBeVisible();
        });

        await test.step("the mounted proposal survives inspector close and reopen", async () => {
            await page.getByTestId("transaction-inspector-toggle").click();
            await expect(inspector).toBeHidden();
            await expect(proposal).toHaveCount(1);
            await expect(page.getByTestId("transaction-inspector-automation-badge")).toBeVisible();
            await page.getByTestId("transaction-inspector-toggle").click();
            await expect(inspector).toBeVisible();
            await expect(proposal).toBeVisible();
        });

        await test.step("the restored proposal controls remain operable", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await expect(proposal.getByTestId("rule-save")).toBeEnabled();
        });
    });
});

test.describe("Apply on blur waits for true automation-owner exit", () => {
    test("unchecked writes nothing on row exit; checked writes only when focus leaves the row", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const firstRow = rowsWithDescription(page).first();
        const secondRow = rowsWithDescription(page).nth(1);
        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");
        const outside = page.getByRole("textbox", { name: /search description/i });

        await addTagToRow(page, firstRow, "Coffee");
        await expect(proposal).toBeVisible();

        await test.step("with Apply on blur unchecked, leaving the row writes nothing", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await outside.click();

            await expect(transactionGridCell(secondRow, "tags")).not.toContainText("Coffee");
            // The proposal is still pending, waiting for an explicit Apply.
            await expect(proposal).toBeVisible();
        });

        await test.step("checking Apply on blur does not itself apply anything", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: true });

            // The inspector and its controls are part of the same logical automation owner.
            await expect(proposal).toBeVisible();
            await expect(transactionGridCell(secondRow, "tags")).not.toContainText("Coffee");
        });

        await test.step("moving focus outside the row and inspector applies it", async () => {
            // Focus something outside both owned surfaces — a genuine automation-owner exit.
            await outside.click();

            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            await expectTransactionCellDisplay(secondRow, "tags", "Coffee");
        });
    });
});

test.describe("The restrictions actually restrict", () => {
    // Frozen `:258-260` gives each checkbox a specific behaviour — restrict to that exact amount,
    // restrict to that account. Before this test both were asserted to EXIST and never operated, so
    // a rule that ignored them entirely would have passed the whole suite (review F-10).
    //
    // The import gives each row a different amount (-1.00, -2.00), so ticking "only if $x" on the
    // first row must scope the rule to that amount alone and leave the second row untouched — even
    // though its description matches exactly.
    test("ticking only-if-amount scopes the rule to that amount and spares the other row", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const firstRow = rowsWithDescription(page).first();
        const secondRow = rowsWithDescription(page).nth(1);
        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");

        await addTagToRow(page, firstRow, "Coffee");
        await expect(proposal).toBeVisible();

        await test.step("restrict the rule to this row's amount, then apply to all", async () => {
            await proposal.getByTestId("rule-amount-toggle").click();
            await expect(proposal.getByTestId("rule-amount-toggle")).toBeChecked();
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
        });

        await test.step("the amount-scoped rule reaches only the matching amount", async () => {
            // The edited row keeps its tag.
            await expectTransactionCellDisplay(firstRow, "tags", "Coffee");
            // The other row has the same description but a different amount, so the restriction
            // must exclude it. Without the restriction being honoured it would have been tagged.
            await expect(transactionGridCell(secondRow, "tags")).not.toContainText("Coffee");
            await transactionGridCell(secondRow, "description").click();
            await expect(inspectorRuleCard(inspector, "tags")).toHaveCount(0, {
                timeout: 3_000
            });
        });
    });
});

test.describe("Destination movement and external chrome finalize automatic modes", () => {
    // Enter moves to a destination editor; non-focusable page chrome exits to the document body.
    // Both must synchronously finalize the current automation owner before another owner is published.
    test("a description alias committed with Enter applies an Apply on blur rule", async ({
        page
    }) => {
        await createNewIdentity(page);
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        // Keep positional row identity because this journey changes the description used by the
        // display-based row filter. Reusing a locator keyed to the old text would re-resolve to the
        // untouched matching row after the first commit.
        const firstRow = page.getByTestId("transaction-row").first();
        const secondRow = page.getByTestId("transaction-row").nth(1);
        const inspector = await openTransactionInspector(page);
        const description = await activateTransactionEditor(firstRow, "description");

        await description.fill("Coffee");
        await description.press("Enter");
        await expectTransactionCellDisplay(firstRow, "description", "Coffee");

        const proposal = inspector.getByTestId("description-rule-proposal");
        await expect(proposal).toBeVisible();

        await test.step("Apply on blur applies on the Enter blur itself", async () => {
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: true });
            // Re-commit with Enter. Focusing the same row and using its explicit keyboard activation
            // keeps the row live until the editor's own Enter blur fires.
            const descriptionCell = transactionGridCell(firstRow, "description");
            await descriptionCell.click();
            await descriptionCell.press("Enter");
            await expect(descriptionCell).toHaveAttribute("data-cell-content", "editor");
            const reopenedDescription = firstRow.getByTestId("description-editable");
            await expect(reopenedDescription).toBeFocused();
            await reopenedDescription.press("Enter");

            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            await expectTransactionCellDisplay(firstRow, "description", "Coffee");
            const continuedEditor = secondRow.getByTestId("description-editable");
            await expect(continuedEditor).toBeFocused();
            await continuedEditor.press("Escape");
            await expectTransactionCellDisplay(secondRow, "description", "Coffee");
        });
    });

    // Clicking empty page chrome is the ordinary way a user dismisses attention from a row, and it
    // is not focusable, so focus lands on <body>.
    test("a tag change applies when the user clicks non-focusable page chrome", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const secondRow = rowsWithDescription(page).nth(1);
        const inspector = await openTransactionInspector(page);
        await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");

        const proposal = inspector.getByTestId("tags-rule-proposal");
        await expect(proposal).toBeVisible();
        await chooseRuleApply(proposal, { scope: "all", applyOnBlur: true });

        await test.step("nothing is written while the automation owner still holds focus", async () => {
            await expect(transactionGridCell(secondRow, "tags")).not.toContainText("Coffee");
        });

        await test.step("clicking a column header, which takes no focus, applies it", async () => {
            // A non-focusable target: focus goes to <body>, firing focusout and no focusin. The
            // "Date" column header is a plain div with role=columnheader and no tabindex.
            await page.getByRole("columnheader", { name: "Date", exact: true }).click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });
            await expectTransactionCellDisplay(secondRow, "tags", "Coffee");
        });
    });
});

test.describe("The blur path at a mobile viewport", () => {
    // MF-005 addition, for the audit's MA-BLUR-01 row.
    //
    // Every other journey in this file runs at the project's default desktop Chromium viewport, and
    // the component tests run in jsdom, which has no layout at all. Neither is viewport evidence, so
    // before this case the audit could only record mobile behaviour as UNVERIFIED.
    //
    // The gesture is the same one the desktop journey above drives; only the viewport differs. At
    // 390px the grid scrolls horizontally and the inspector occupies a much narrower
    // page, so this is a real question rather than a restatement: the controls have to be reachable
    // and the blur still has to reach the automatic mode.
    test("Apply on blur still applies on a genuine row exit at 390x844", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        const secondRow = rowsWithDescription(page).nth(1);
        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");

        await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");

        await test.step("the proposal controls are reachable at this width", async () => {
            await expect(proposal).toBeVisible();
            await expect(proposal.getByTestId("rule-scope-all")).toBeVisible();
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: true });
            // Nothing is written while the automation owner still holds focus.
            await expect(transactionGridCell(secondRow, "tags")).not.toContainText("Coffee");
        });

        await test.step("moving focus out of the row applies it", async () => {
            // The search box sits above the grid, so it is on-screen at this width without any
            // horizontal scrolling — a genuine row blur to a focusable target outside the table.
            await page.getByRole("textbox", { name: /search description/i }).click();

            await expect(proposal).toHaveCount(0);
            await expect(transactionGridCell(secondRow, "tags")).toContainText("Coffee");
        });
    });
});

test.describe("Updating an existing rule from the same controls", () => {
    // Frozen `:287-289`: when the changed field already has a matching rule, the same choices are
    // offered but applying UPDATES that rule rather than creating a second one.
    test("changing a tag on a row that already matches offers an update, not a duplicate", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await createTag(page, "Dining");
        // Two rows share the newest date; Update new from either must include the other.
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-03", description: MATCHING_DESCRIPTION },
            { date: "2026-07-03", description: MATCHING_DESCRIPTION }
        ]);
        const inspector = await openTransactionInspector(page);
        const proposal = inspector.getByTestId("tags-rule-proposal");
        const editedRow = await stableTransactionRow(rowsWithDescription(page).first());

        await test.step("create the rule from the first tag change", async () => {
            await addTagToRow(page, editedRow, "Coffee");
            await chooseRuleApply(proposal, { scope: "all", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();
            await expect(inspectorRuleCard(inspector, "tags")).toBeVisible();
            for (const row of await rowsWithDescription(page).all()) {
                await expectTransactionCellDisplay(row, "tags", "Coffee");
            }
        });

        await test.step("a further tag change offers an UPDATE of that same rule", async () => {
            await addTagToRow(page, editedRow, "Dining");

            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "update");
            // The rule is folded into the proposal while it is pending, never shown twice.
            await expect(inspectorRuleCard(inspector, "tags")).toHaveCount(0, { timeout: 3_000 });
        });

        // `data-kind` only proves the component DECIDED to update. Clause `:287-289` is entirely
        // about which write happens, so the outcome has to be asserted too: the same-date row must
        // gain the new tag, the older row must not, and no SECOND rule may appear.
        await test.step("Update new performs the update and includes the same-date row", async () => {
            await chooseRuleApply(proposal, { scope: "new", applyOnBlur: false });
            await proposal.getByTestId("rule-save").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });

            const rows = rowsWithDescription(page);
            await expect(rows).toHaveCount(3);
            const editedId = await editedRow.getAttribute("data-transaction-id");
            const editedDate = (await transactionGridCell(editedRow, "date").innerText()).trim();
            const outcomes: string[] = [];
            for (const row of await rows.all()) {
                if ((await row.getAttribute("data-transaction-id")) === editedId) continue;
                const date = (await transactionGridCell(row, "date").innerText()).trim();
                const tags = transactionGridCell(row, "tags");
                if (date === editedDate) {
                    // Same date as the edited row: the cutoff is inclusive, so it is updated.
                    await expect(tags).toContainText("Dining");
                    outcomes.push("same date updated");
                } else {
                    await expect(tags).not.toContainText("Dining");
                    outcomes.push("older row untouched");
                }
            }
            expect(outcomes.sort()).toEqual(["older row untouched", "same date updated"]);

            await expect(inspectorRuleCard(inspector, "tags")).toBeVisible();
            await goToAutomations(page);
            await expect(page.getByTestId("rule-list").getByRole("listitem")).toHaveCount(1);
        });
    });
});

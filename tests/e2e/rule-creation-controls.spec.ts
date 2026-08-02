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
    goToAutomations,
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
 *
 * Finishes with the tag committed and the picker CLOSED, which is the state a caller needs before
 * it can interact with the proposal — the proposal deliberately waits for the cell's edit surface to
 * close, so a caller left mid-edit would find no controls to click.
 *
 * The picker is dismissed by clicking another cell rather than by pressing Escape. Escape does not
 * work here: the picker's Escape handler is bound to its search input, and selecting an option moves
 * focus off that input, so the key never reaches the handler. That is a pre-existing defect in
 * `InlineEditableTags`, outside UR-009's scope, recorded rather than worked around silently.
 */
async function addTagToRow(page: Page, row: Locator, tagName: string): Promise<void> {
    await expect(row.getByTestId("tags-editable")).toBeVisible();
    await row.getByTestId("tags-editable").click();
    const searchInput = page.getByPlaceholder("Search tags...");
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await page.getByRole("option", { name: tagName, exact: true }).click();
    // The selection saves immediately, so the tag appearing on the row is the real signal.
    await expect(row.getByTestId("tags-editable")).toContainText(tagName);
    // End the edit so the proposal can appear clear of the picker.
    await row.getByTestId("date-editable").click();
    await expect(searchInput).toHaveCount(0);
}

/**
 * Choose one of the four apply modes, and leave the select CLOSED.
 *
 * The listbox is portaled and opens directly over the row's own cells, so an option can still be
 * covering the very control the next step wants to click. That was MEASURED, not anticipated: the
 * Enter-commit journey failed a full campaign run with `<div role="option" …> intercepts pointer
 * events`, then `element was detached from the DOM`, timing out on `description.click()` — before
 * the gesture under test ever ran. The sibling journey clicking a column header sits far from the
 * listbox and never hit it, which is exactly why this belongs in one helper rather than at the one
 * call site that happened to fail.
 *
 * The wait reads the TRIGGER's own `aria-expanded` rather than counting listboxes globally. Radix
 * sets it from this select's open state, so it cannot be satisfied by some other popup closing —
 * and the description input in the same row carries `aria-haspopup="listbox"` for its alias
 * dropdown, so a global listbox count is genuinely ambiguous here, not merely less precise.
 */
async function chooseApplyMode(page: Page, mode: string): Promise<void> {
    const trigger = page.getByTestId("proposal-apply-mode");
    await trigger.click();
    await page.getByRole("option", { name: mode, exact: true }).click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
}

/**
 * The rows carrying an exact description, in table order.
 *
 * The description is the VALUE of an input, not row text, so a `hasText` filter would match nothing.
 * Filtering on the input's value via `has` is what actually selects these rows.
 *
 * HAZARD: only for journeys that do NOT change the description. Locators re-resolve on every use,
 * and React writes an edited value to the input's `value` attribute, so a locator built from the old
 * description stops matching the row it was created for and silently re-points at another matching
 * row. Journeys that rename a description index positionally instead.
 */
function rowsWithDescription(page: Page, description: string = MATCHING_DESCRIPTION) {
    return page
        .getByTestId("transaction-row")
        .filter({ has: page.locator(`input[value="${description}"]`) });
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
            await chooseApplyMode(page, "Update all");
            await page.getByTestId("proposal-confirm").click();

            await expect(proposal).toHaveCount(0);
            // The SECOND matching row now carries the tag, applied by the rule the controls created.
            const secondRow = rowsWithDescription(page).nth(1);
            await expect(secondRow.getByTestId("tags-editable")).toContainText("Coffee");
            // The non-matching row is untouched: the rule keys on the exact description text.
            const unrelated = rowsWithDescription(page, "UNRELATED MERCHANT");
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
            // The controls are an inline affordance, NOT a modal. Radix popover content defaults to
            // role="dialog", which made the alias journey's "no dialog is open" assertion fail; the
            // frozen text asks for an unfocused popup that never interrupts the edit.
            await expect(page.getByRole("dialog")).toHaveCount(0);
        });

        await test.step("confirming with update all repoints the other matching row", async () => {
            await chooseApplyMode(page, "Update all");
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
            await chooseApplyMode(page, "Update all");
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

        const row = rowsWithDescription(page, "MANUAL COFFEE");
        await addTagToRow(page, row, "Coffee");

        await expect(page.getByTestId("tags-rule-proposal")).toBeVisible();
        await expect(page.getByTestId("description-rule-proposal")).toHaveCount(0);
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
        await expect(row.getByTestId("tags-editable")).toBeVisible();
        await row.getByTestId("tags-editable").click();

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
        await expect(row.getByTestId("tags-editable")).toContainText("Dining");
        await expect(row.getByTestId("tags-editable")).toContainText("Coffee");

        // And once the edit is finished the proposal does arrive, carrying both tags.
        await row.getByTestId("date-editable").click();
        await expect(searchInput).toHaveCount(0);
        await expect(page.getByTestId("tags-rule-proposal")).toBeVisible();
    });
});

test.describe("The proposal never covers the cell's own edit surface", () => {
    // The tag picker is portaled, `fixed`, `z-[9999]`, and opens directly below the cell — the same
    // space this popover anchors into. Showing both at once put two layers over the row and left the
    // four-mode select and the tick physically unclickable, which fails frozen `:255-257` (those
    // controls must be operable) and `:252-253` (nothing occluded).
    //
    // The proposal therefore waits for the cell's edit surface to close. This test pins that: while
    // the picker is open the proposal stays away, and it appears once the picker is dismissed.
    test("the proposal waits for the tag picker to close, then its controls are clickable", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");
        await importRows(page, [{ date: "2026-07-01", description: MATCHING_DESCRIPTION }]);

        const row = rowsWithDescription(page).first();
        const proposal = page.getByTestId("tags-rule-proposal");
        const searchInput = page.getByPlaceholder("Search tags...");

        await expect(row.getByTestId("tags-editable")).toBeVisible();
        await row.getByTestId("tags-editable").click();
        await expect(searchInput).toBeVisible({ timeout: 15_000 });
        await page.getByRole("option", { name: "Coffee", exact: true }).click();

        await test.step("while the picker is still open the proposal stays out of its way", async () => {
            await expect(searchInput).toBeVisible();
            await expect(proposal).toHaveCount(0);
        });

        await test.step("closing the picker surfaces the proposal", async () => {
            // Click elsewhere in the row rather than pressing Escape: the picker's Escape handler is
            // bound to its search input, and focus has already left that input by this point, so
            // Escape does not reach it. That is a pre-existing defect in the cell, outside UR-009.
            await row.getByTestId("date-editable").click();
            await expect(searchInput).toHaveCount(0);
            await expect(proposal).toBeVisible();
        });

        await test.step("and every frozen control is genuinely clickable", async () => {
            // The regression this replaces did not hide the controls — it left them rendered but
            // covered, so a visibility assertion passed while the user could not reach them. Clicking
            // is the assertion that discriminates.
            await page.getByTestId("proposal-apply-mode").click();
            await expect(
                page.getByRole("option", { name: "Update all", exact: true })
            ).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByTestId("proposal-confirm")).toBeEnabled();
        });
    });
});

test.describe("The Updating modes wait for the row to lose focus", () => {
    // Regression pin for P30 rev 01 F-2. An "Updating…" mode used to fire the moment the tag
    // dropdown closed — writing a rule and rewriting every matching transaction before the user had
    // seen the controls, chosen a scope, or had any chance to dismiss.
    test("choosing Updating all writes nothing until focus leaves the row, then writes on blur", async ({
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
        const proposal = page.getByTestId("tags-rule-proposal");

        await addTagToRow(page, firstRow, "Coffee");
        await expect(proposal).toBeVisible();

        await test.step("selecting an Updating mode does not itself apply anything", async () => {
            await chooseApplyMode(page, "Updating all");

            // Still open, still waiting: the row has not lost focus.
            await expect(proposal).toBeVisible();
            // And crucially the OTHER matching transaction is untouched.
            await expect(secondRow.getByTestId("tags-editable")).not.toContainText("Coffee");
        });

        await test.step("moving focus out of the row applies it", async () => {
            // Focus something outside the table entirely — a genuine row blur.
            await page.getByRole("textbox", { name: /search description/i }).click();

            await expect(proposal).toHaveCount(0);
            await expect(secondRow.getByTestId("tags-editable")).toContainText("Coffee");
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

        await addTagToRow(page, firstRow, "Coffee");
        await expect(page.getByTestId("tags-rule-proposal")).toBeVisible();

        await test.step("restrict the rule to this row's amount, then apply to all", async () => {
            await page.getByTestId("proposal-amount-toggle").click();
            await expect(page.getByTestId("proposal-amount-toggle")).toBeChecked();
            await chooseApplyMode(page, "Update all");
            await page.getByTestId("proposal-confirm").click();
            await expect(page.getByTestId("tags-rule-proposal")).toHaveCount(0);
        });

        await test.step("the amount-scoped rule reaches only the matching amount", async () => {
            // The edited row keeps its tag.
            await expect(firstRow.getByTestId("tags-editable")).toContainText("Coffee");
            // The other row has the same description but a different amount, so the restriction
            // must exclude it. Without the restriction being honoured it would have been tagged.
            await expect(secondRow.getByTestId("tags-editable")).not.toContainText("Coffee");
            // Exactly one row matches, so exactly one robot.
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(1);
        });
    });
});

test.describe("Every way a row loses focus reaches the automatic modes", () => {
    // Review F-13 required these two explicitly, and F-7 is why: revision 04 passed its one
    // automatic-mode journey while three of the four blur gestures never fired at all. The journey
    // blurred by clicking a focusable textbox — the single gesture that produces a `focusin`.
    //
    // These drive the other two shapes. Both blur to `<body>`, which fires `focusout` and NO
    // `focusin`, so a transition-listening implementation is deaf to them.

    // The frozen text's own worked example at `:249-251`. The alias input calls blur() on Enter, so
    // the commit and the row blur are the same event.
    test("a description alias committed with Enter applies an Updating rule", async ({ page }) => {
        await createNewIdentity(page);
        await importRows(page, [
            { date: "2026-07-01", description: MATCHING_DESCRIPTION },
            { date: "2026-07-02", description: MATCHING_DESCRIPTION }
        ]);

        // Positional rows, NOT `rowsWithDescription`, because this journey CHANGES the description
        // those locators filter on. A Playwright locator re-resolves on every use, and React writes
        // the new text to the input's `value` ATTRIBUTE as well as its property — verified in jsdom:
        // after the edit, `input[value="COFFEE SHOP 123"]` no longer matches row one and
        // `input[value="Coffee"]` does. So a locator built from the old description silently
        // re-pointed at the OTHER matching row, which the rule was concurrently rewriting, and the
        // click landed on an element that detached underneath it. That reads exactly like a product
        // defect and is not one. The sibling alias journey escaped it only by indexing positionally.
        const firstRow = page.getByTestId("transaction-row").first();
        const secondRow = page.getByTestId("transaction-row").nth(1);
        const description = firstRow.getByTestId("description-editable");

        await description.click();
        await description.fill("Coffee");
        await description.press("Enter");

        const proposal = page.getByTestId("description-rule-proposal");
        await expect(proposal).toBeVisible();

        await test.step("choosing Updating all applies on the Enter blur itself", async () => {
            await chooseApplyMode(page, "Updating all");
            // Re-commit with Enter. That blur IS the frozen gesture; nothing else is clicked.
            await description.click();
            await description.press("Enter");

            await expect(proposal).toHaveCount(0);
            await expect(secondRow.getByTestId("description-editable")).toHaveValue("Coffee");
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
        await addTagToRow(page, rowsWithDescription(page).first(), "Coffee");

        const proposal = page.getByTestId("tags-rule-proposal");
        await expect(proposal).toBeVisible();
        await chooseApplyMode(page, "Updating all");

        await test.step("nothing is written while the row still holds focus", async () => {
            await expect(secondRow.getByTestId("tags-editable")).not.toContainText("Coffee");
        });

        await test.step("clicking a column header, which takes no focus, applies it", async () => {
            // A non-focusable target: focus goes to <body>, firing focusout and no focusin. The
            // "Date" column header is a plain div with role=columnheader and no tabindex.
            await page.getByRole("columnheader", { name: "Date", exact: true }).click();
            await expect(proposal).toHaveCount(0);
            await expect(secondRow.getByTestId("tags-editable")).toContainText("Coffee");
        });
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
            await chooseApplyMode(page, "Update all");
            await page.getByTestId("proposal-confirm").click();
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(2);
        });

        await test.step("a further tag change offers an UPDATE of that same rule", async () => {
            await addTagToRow(page, rowsWithDescription(page).first(), "Dining");

            const proposal = page.getByTestId("tags-rule-proposal");
            await expect(proposal).toBeVisible();
            await expect(proposal).toHaveAttribute("data-kind", "update");
        });

        // `data-kind` only proves the component DECIDED to update. Clause `:287-289` is entirely
        // about which write happens, so the outcome has to be asserted too: the other matching row
        // must gain the new tag, and no SECOND rule may appear for the same description text.
        await test.step("confirming performs the update rather than creating a duplicate", async () => {
            await chooseApplyMode(page, "Update all");
            await page.getByTestId("proposal-confirm").click();
            await expect(page.getByTestId("tags-rule-proposal")).toHaveCount(0);

            // The updated rule reached the other matching transaction.
            const secondRow = rowsWithDescription(page).nth(1);
            await expect(secondRow.getByTestId("tags-editable")).toContainText("Dining");

            // Still exactly one robot per matching row. A duplicate rule for the same description
            // text would not change this count, so also check the automations page directly.
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(2);
            await goToAutomations(page);
            await expect(page.getByTestId("rule-list").getByRole("listitem")).toHaveCount(1);
        });
    });
});

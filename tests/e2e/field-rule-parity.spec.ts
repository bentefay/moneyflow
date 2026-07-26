/**
 * E2E Test: Tag + allocation field-rule parity and apply-mode persistence (HS-007 / P17D)
 *
 * These journeys exercise the P17D additions on top of the P17C description-rule robot:
 *
 * - TAG rules expose an add/set mode SELECT in the shared editor and in the inline transaction
 *   popup, with the same view/create/edit/apply affordances as description rules (frozen `:288-293`).
 * - ALLOCATION rules are edited through a column-per-person grid capturing the WHOLE explicit
 *   percentage set (frozen `:288-291`).
 * - Unlike description-alias rules, tag/allocation rules DO apply to MANUAL rows: the inline robot
 *   surfaces on a hand-entered transaction and "apply to this" resolves the drift (frozen `:294-295`).
 * - The four-mode apply SELECT choice is REMEMBERED per user and restored on reopen (frozen `:270`).
 * - At scale the inline popup stays non-intrusive: only matching rows carry a robot and nothing
 *   auto-opens.
 *
 * Assertions target accessible roles, stable testids and observable state (`data-drift`), never
 * incidental copy.
 */

import { expect, type Page, test } from "@playwright/test";

import {
    createNewIdentity,
    goToAutomations,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions
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
    await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 5000 });
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
    test("add/set mode select is offered on create and mirrored in the inline popup", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create a SET-mode tag rule for an exact description", async () => {
            await openCreateEditor(page);
            // Default field is Tags, so the tag-mode select and tag group are present.
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

        await test.step("the imported row carries a tags robot the popup reuses the editor for", async () => {
            const robot = page.getByTestId("tags-rule-robot");
            await expect(robot).toBeVisible();
            // The engine applied the set-mode tag on import, so the row already matches its rule.
            await expect(robot).toHaveAttribute("data-drift", "false");

            await robot.click();
            await expect(page.getByTestId("transaction-rule-popup")).toBeVisible();
            await expect(page.getByTestId("field-rule-editor")).toBeVisible();
            // The inline popup surfaces the SAME add/set select, reflecting the rule's stored mode.
            await expect(page.getByTestId("rule-tag-mode")).toContainText(/set tags/i);
            // And the Coffee tag is shown as selected (parity with the description-alias view).
            await expect(
                page.getByRole("group", { name: /tags to apply/i }).getByRole("button", {
                    name: "Coffee"
                })
            ).toHaveAttribute("aria-pressed", "true");
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
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 5000 });
            const grid = page.getByTestId("rule-allocation-grid");
            await expect(grid.getByLabel(DEFAULT_PERSON_NAME)).toHaveValue("60");
            await expect(grid.getByLabel("Alex")).toHaveValue("40");
        });
    });
});

test.describe("Manual-row applicability", () => {
    // BLOCKED (Q-P17D-MANUAL-MATCH): frozen `:294-295` requires tag/allocation rules to apply to
    // manually-created transactions, which per frozen `:269` carry NO raw description text (only a
    // description alias). The frozen matcher subject (`subjectForTransaction`,
    // src/lib/crdt/field-rules.ts:83-94) derives `descriptionText` from the raw `transaction.description`
    // field only, which is empty for UI-created manual rows, so no tag/allocation rule can match them.
    // Resolving the alias id -> alias name into the subject requires editing that FROZEN engine file
    // (and threading the alias registry through it) — surfaced to root rather than silently edited.
    // The inline robot WIRING is already in place (the page mounts tags/allocation robots for manual
    // rows, gated on the engine match), so this journey passes with zero UI change once the engine
    // projects the alias name. Kept as an executable, self-documenting spec of the intended behaviour.
    test.fixme("a tag rule surfaces a robot on a manual transaction and apply-to-this resolves drift", async ({
        page
    }) => {
        await createNewIdentity(page);
        await createTag(page, "Coffee");

        await test.step("create an add-mode tag rule", async () => {
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

        await goToTransactions(page);
        await addTransaction(page, { description: "MANUAL COFFEE", amount: "-4.50" });

        const robot = page.getByTestId("tags-rule-robot");

        await test.step("the manual row shows a drifting tag robot (rule matches, tags absent)", async () => {
            await expect(robot).toBeVisible();
            await expect(robot).toHaveAttribute("data-drift", "true");
        });

        await test.step("apply-to-this applies the rule to only this manual row and clears drift", async () => {
            await robot.click();
            await expect(page.getByTestId("transaction-rule-drift")).toBeVisible();
            await page.getByTestId("rule-apply-this").click();
            await expect(page.getByTestId("transaction-rule-popover")).toHaveCount(0);
            await expect(robot).toHaveAttribute("data-drift", "false");
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
            await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 5000 });
            await expect(page.getByTestId("rule-apply-mode")).toContainText(/updating all/i);
        });
    });
});

test.describe("Inline popup at scale", () => {
    test("only matching rows carry a robot and nothing auto-opens", async ({ page }) => {
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

        await test.step("robots appear only for the two matching rows and none auto-open", async () => {
            await expect(page.getByTestId("tags-rule-robot")).toHaveCount(2);
            // The popup is non-intrusive: no rule popover is open until the user clicks a robot.
            await expect(page.getByTestId("transaction-rule-popover")).toHaveCount(0);
        });
    });
});

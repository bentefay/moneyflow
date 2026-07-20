/**
 * E2E Test: Description Aliases Management
 *
 * Journey-style tests that validate complete user flows for description aliases.
 * Covers the management page CRUD and sidebar navigation.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToImportNew, goToTxDescriptions } from "./helpers";

// ============================================================================
// Alias-Specific Helpers
// ============================================================================

/**
 * Create a new alias via the Add Alias form.
 */
async function createAlias(page: Page, name: string): Promise<void> {
    const addButton = page.getByRole("button", { name: /add alias/i });
    await addButton.click();

    const nameInput = page.getByPlaceholder(/enter alias name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(name);

    const submitButton = page.getByRole("button", { name: /^add alias$/i });
    await submitButton.click();
}

/**
 * Start editing an alias (clicks edit button).
 */
async function startEditAlias(page: Page, aliasName: string): Promise<void> {
    const aliasRow = page.locator(`[data-alias-name="${aliasName}"]`);
    await aliasRow.hover();
    const editButton = aliasRow.getByRole("button", { name: /edit/i });
    await editButton.click();
}

/**
 * Edit an existing alias name and save.
 */
async function editAlias(page: Page, aliasName: string, newName: string): Promise<void> {
    await startEditAlias(page, aliasName);

    const nameInput = page.getByPlaceholder(/alias name/i);
    await nameInput.clear();
    await nameInput.fill(newName);

    const saveButton = page.getByRole("button", { name: /save/i });
    await saveButton.click();
}

async function importDescriptionFixtures(
    page: Page,
    rows: ReadonlyArray<{ readonly date: string; readonly description: string }>
): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "description-alias-interactions.csv",
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

function descriptionInputFor(page: Page, accessibleRowName: RegExp) {
    return page
        .getByRole("row", { name: accessibleRowName })
        .getByRole("textbox", { name: "Transaction description" });
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Description Aliases", () => {
    test("management page CRUD journey: create, rename, delete aliases", async ({ page }) => {
        await createNewIdentity(page);
        await goToTxDescriptions(page);

        await test.step("page loads correctly with empty state", async () => {
            await expect(
                page.getByRole("heading", { name: "Tx Descriptions", level: 1 })
            ).toBeVisible();
            await expect(page.getByRole("button", { name: /add alias/i })).toBeVisible();
            await expect(page.getByText(/no description aliases created yet/i)).toBeVisible();
        });

        await test.step("cancel add form without creating alias", async () => {
            await page.getByRole("button", { name: /add alias/i }).click();
            await expect(page.getByPlaceholder(/enter alias name/i)).toBeVisible();
            await page.getByRole("button", { name: /cancel/i }).click();
            await expect(page.getByPlaceholder(/enter alias name/i)).not.toBeVisible();
        });

        await test.step("create alias", async () => {
            await createAlias(page, "Supermarket");
            await expect(page.getByText("Supermarket", { exact: true })).toBeVisible();
            await expect(page.getByText(/no description aliases created yet/i)).not.toBeVisible();
        });

        await test.step("create another alias", async () => {
            await createAlias(page, "Gas Station");
            await expect(page.getByText("Gas Station", { exact: true })).toBeVisible();
        });

        await test.step("normalize names and reject NFC-equivalent duplicates", async () => {
            await createAlias(page, "  Cafe\u0301  ");
            await expect(page.getByText("Café", { exact: true })).toBeVisible();

            await page.getByRole("button", { name: /add alias/i }).click();
            await page.getByPlaceholder(/enter alias name/i).fill("Café");
            await page.getByRole("button", { name: /^add alias$/i }).click();
            await expect(page.getByText(/an alias named .* already exists/i)).toBeVisible();
            await expect(page.locator('[data-alias-name="Café"]')).toHaveCount(1);
            await page.getByRole("button", { name: /cancel/i }).click();
        });

        await test.step("rename alias", async () => {
            await editAlias(page, "Supermarket", "Grocery Store");
            await expect(page.getByText("Grocery Store", { exact: true })).toBeVisible();
            await expect(page.getByText("Supermarket", { exact: true })).not.toBeVisible();
        });

        await test.step("cancel edit preserves original value", async () => {
            await startEditAlias(page, "Grocery Store");
            const nameInput = page.getByPlaceholder(/alias name/i);
            await nameInput.clear();
            await nameInput.fill("Should Not Save");
            await page.getByRole("button", { name: /cancel/i }).click();
            await expect(page.getByText("Grocery Store", { exact: true })).toBeVisible();
            await expect(page.getByText("Should Not Save", { exact: true })).not.toBeVisible();
        });

        await test.step("delete requires double-click confirmation", async () => {
            await createAlias(page, "Temporary Alias");
            await expect(page.getByText("Temporary Alias", { exact: true })).toBeVisible();

            const tempRow = page.locator(`[data-alias-name="Temporary Alias"]`);
            await tempRow.hover();
            const deleteBtn = tempRow.getByRole("button", { name: /delete/i });

            // First click should NOT delete
            await deleteBtn.click();
            await expect(page.getByText("Temporary Alias", { exact: true })).toBeVisible();

            // Second click confirms
            await deleteBtn.click();
            await expect(page.getByText("Temporary Alias", { exact: true })).not.toBeVisible();
        });
    });

    test("navigation: sidebar link works", async ({ page }) => {
        await createNewIdentity(page);
        // Navigate to a different page first
        await page.goto("/transactions");
        await page.waitForLoadState("networkidle");

        // Click Tx Descriptions in sidebar
        await page.getByRole("link", { name: /tx descriptions/i }).click();

        await expect(page).toHaveURL(/\/tx-descriptions/);
        await expect(
            page.getByRole("heading", { name: "Tx Descriptions", level: 1 })
        ).toBeVisible();
    });

    test("transaction cell pointer, keyboard, seamless commit and provenance journey", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToTxDescriptions(page);
        await createAlias(page, "Canteen");
        await createAlias(page, "Coffee Shop");
        await importDescriptionFixtures(page, [
            { date: "2026-07-03", description: "Cafe partial" },
            { date: "2026-07-02", description: "Coffee Shop" },
            { date: "2026-07-01", description: "Imported novel" }
        ]);

        const importedDescriptions = page.getByTestId("description-editable");
        const partial = importedDescriptions.nth(0);
        const exact = importedDescriptions.nth(1);
        const novel = importedDescriptions.nth(2);

        await test.step("one pointer click focuses at the clicked start position", async () => {
            const box = await partial.boundingBox();
            if (!box) throw new Error("Description input has no pointer box");
            await page.mouse.click(box.x + 2, box.y + box.height / 2);
            await expect(partial).toBeFocused();
            await expect
                .poll(() => partial.evaluate((input: HTMLInputElement) => input.selectionStart))
                .toBe(0);
        });

        await test.step("autocomplete starts unselected and closed arrows resume the grid", async () => {
            await partial.fill("C");
            const options = page.getByRole("option");
            await expect(options).toHaveCount(2);
            await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
            await expect(options.nth(1)).toHaveAttribute("aria-selected", "false");
            await partial.press("ArrowDown");
            await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
            await partial.press("Escape");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(0);
            await partial.press("ArrowDown");
            await expect(exact).toBeFocused();
        });

        await test.step("keyboard accept, exact typed match and novel blur commit seamlessly", async () => {
            await partial.focus();
            await partial.fill("Coffee");
            await expect(page.getByRole("option", { name: "Coffee Shop" })).toHaveAttribute(
                "aria-selected",
                "false"
            );
            await partial.press("ArrowDown");
            await partial.press("Enter");
            await expect(partial).toHaveValue("Coffee Shop");

            await exact.fill("Coffee Shop ");
            await exact.press("Enter");
            await expect(exact).toHaveValue("Coffee Shop");

            await novel.fill("Fresh novel");
            await page.getByText("Description", { exact: true }).click();
            await expect(novel).toHaveValue("Fresh novel");
            await expect(page.getByRole("dialog")).toHaveCount(0);

            await novel.fill("Fresh renamed");
            await novel.press("Enter");
            await expect(novel).toHaveValue("Fresh renamed");
            await expect(page.getByRole("dialog")).toHaveCount(0);
        });

        await test.step("imported provenance is accessible only when it differs", async () => {
            await partial.hover();
            await expect(
                page.locator('[role="tooltip"]').filter({ hasText: "Cafe partial" })
            ).toBeVisible();
            await expect(partial).toHaveAttribute("data-slot", "tooltip-trigger");
            await expect(exact).toHaveAttribute("data-slot", "input");
            await expect(exact).not.toHaveAttribute("data-state");
        });

        await test.step("manual creation stores alias-only UX and is one undo step", async () => {
            const pushedBodies: string[] = [];
            page.on("request", (request) => {
                if (request.url().includes("sync.pushOps"))
                    pushedBodies.push(request.postData() ?? "");
            });
            await page.getByTestId("add-transaction-button").click();
            await page.getByTestId("new-transaction-description").fill("Manual alias only");
            await page.getByTestId("new-transaction-amount").fill("12.34");
            await page.getByTestId("new-transaction-amount").press("Enter");
            const manual = descriptionInputFor(page, /Manual alias only/);
            await expect(manual).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByTestId("add-transaction-row")).not.toBeVisible();
            await manual.hover();
            await expect(
                page.getByRole("tooltip").filter({ hasText: "Manual alias only" })
            ).toHaveCount(0);
            await page.getByRole("button", { name: "Undo" }).click();
            await expect(descriptionInputFor(page, /Manual alias only/)).toHaveCount(0);
            await page.getByRole("button", { name: "Redo" }).click();
            await expect(descriptionInputFor(page, /Manual alias only/)).toBeVisible();
            await expect.poll(() => pushedBodies.length).toBeGreaterThan(0);
            expect(pushedBodies.every((body) => !body.includes("Manual alias only"))).toBe(true);
        });
    });

    test("shared change and remove modal choices preserve focus and atomic undo", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToTxDescriptions(page);
        await createAlias(page, "Shared");
        await createAlias(page, "Target");
        await importDescriptionFixtures(page, [
            { date: "2026-07-02", description: "Original A" },
            { date: "2026-07-01", description: "Original B" }
        ]);

        const descriptions = page.getByTestId("description-editable");
        const first = descriptions.nth(0);
        const second = descriptions.nth(1);
        for (const input of [first, second]) {
            await input.fill("Shared ");
            await input.press("Enter");
            await expect(input).toHaveValue("Shared");
        }

        await test.step("pointer target opens one trapped modal and Enter confirms the default", async () => {
            await first.fill("Tar");
            const target = page.getByRole("option", { name: "Target" });
            await target.click();
            const justThis = page.getByRole("button", { name: "Change just this one" });
            await expect(justThis).toBeFocused();
            await expect(page.getByRole("dialog")).toHaveCount(1);
            await page.keyboard.press("Shift+Tab");
            await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
            await page.keyboard.press("Tab");
            await expect(justThis).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(first).toHaveValue("Target");
            await expect(second).toHaveValue("Shared");
            await expect(first).toBeFocused();
            await page.getByRole("button", { name: "Undo" }).click();
            await expect(first).toHaveValue("Shared");
            await expect(second).toHaveValue("Shared");
        });

        await test.step("novel blur offers Change all as one undoable action", async () => {
            await first.fill("Unified");
            await page.getByText("Description", { exact: true }).click();
            await expect(page.getByRole("button", { name: "Change just this one" })).toBeFocused();
            await page.getByRole("button", { name: "Change all" }).click();
            await expect(first).toHaveValue("Unified");
            await expect(second).toHaveValue("Unified");
            await page.getByRole("button", { name: "Undo" }).click();
            await expect(first).toHaveValue("Shared");
            await expect(second).toHaveValue("Shared");
        });

        await test.step("remove cancellation writes nothing and restores exact caret", async () => {
            await first.fill("");
            await first.press("Enter");
            await expect(
                page.getByRole("button", { name: "Remove from just this one" })
            ).toBeFocused();
            await page.getByRole("button", { name: "Cancel" }).click();
            await expect(first).toBeFocused();
            await expect(first).toHaveValue("Shared");
            await expect
                .poll(() => first.evaluate((input: HTMLInputElement) => input.selectionStart))
                .toBe(0);
            await expect(second).toHaveValue("Shared");
        });

        await test.step("Remove from just this one is one complete undo step", async () => {
            await first.fill("");
            await first.press("Enter");
            await page.getByRole("button", { name: "Remove from just this one" }).click();
            await expect(first).toHaveValue("Original A");
            await expect(second).toHaveValue("Shared");
            await page.getByRole("button", { name: "Undo" }).click();
            await expect(first).toHaveValue("Shared");
            await expect(second).toHaveValue("Shared");
        });

        await test.step("Remove from all is one complete undo step", async () => {
            await first.fill("");
            await first.press("Enter");
            await page.getByRole("button", { name: "Remove from all" }).click();
            await expect(first).toHaveValue("Original A");
            await expect(second).toHaveValue("Original B");
            await page.getByRole("button", { name: "Undo" }).click();
            await expect(first).toHaveValue("Shared");
            await expect(second).toHaveValue("Shared");
        });
    });
});

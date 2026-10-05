/**
 * E2E Test: Description Aliases Management
 *
 * Journey-style tests that validate complete user flows for description aliases.
 * Covers the management page CRUD and sidebar navigation.
 */

import type { ElementHandle, Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
    activateTransactionEditor,
    awaitVaultPersistence,
    createNewIdentity,
    expectTransactionCellDisplay,
    goToImportNew,
    goToTransactions,
    goToTxDescriptions,
    openTransactionInspector,
    reloadPage,
    rowsWithDisplayedDescription,
    stableTransactionRow
} from "./helpers";
import { addEmptyTransaction } from "./helpers/settlement";

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

interface RetainedDescriptionEditor {
    readonly element: ElementHandle<HTMLElement | SVGElement>;
    readonly selectionEnd: number;
    readonly selectionStart: number;
}

async function pinDescriptionEditor(
    editor: Locator,
    selectionStart: number,
    selectionEnd: number
): Promise<RetainedDescriptionEditor> {
    await editor.evaluate(
        (element, selection) => {
            if (!(element instanceof HTMLInputElement))
                throw new Error("Expected description input");
            element.setSelectionRange(selection.start, selection.end);
        },
        { start: selectionStart, end: selectionEnd }
    );
    const element = await editor.elementHandle();
    if (element == null) throw new Error("Expected description input handle");
    return { element, selectionEnd, selectionStart };
}

async function expectRetainedDescriptionEditor(
    row: Locator,
    retained: RetainedDescriptionEditor,
    value: string
): Promise<void> {
    await expect
        .poll(() =>
            retained.element.evaluate((element) => {
                if (!(element instanceof HTMLInputElement)) {
                    throw new Error("Expected retained description input");
                }
                return {
                    connected: element.isConnected,
                    focused: element.ownerDocument.activeElement === element,
                    selectionEnd: element.selectionEnd,
                    selectionStart: element.selectionStart,
                    value: element.value
                };
            })
        )
        .toEqual({
            connected: true,
            focused: true,
            selectionEnd: retained.selectionEnd,
            selectionStart: retained.selectionStart,
            value
        });
    const current = await row.getByTestId("description-editable").elementHandle();
    if (current == null) throw new Error("Expected retained description input");
    expect(
        await retained.element.evaluate((element, candidate) => element === candidate, current)
    ).toBe(true);
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
        await goToTransactions(page);

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

        const importedRows = page.getByTestId("transaction-row");
        const partialRow = await stableTransactionRow(importedRows.nth(0));
        const exactRow = await stableTransactionRow(importedRows.nth(1));
        const novelRow = await stableTransactionRow(importedRows.nth(2));

        await test.step("one pointer click focuses at the clicked start position", async () => {
            const partial = await activateTransactionEditor(partialRow, "description");
            const box = await partial.boundingBox();
            if (box == null) throw new Error("Description input has no pointer box");
            await page.mouse.click(box.x + 2, box.y + box.height / 2);
            await expect(partial).toBeFocused();
            await expect
                .poll(() => partial.evaluate((input: HTMLInputElement) => input.selectionStart))
                .toBe(0);
        });

        await test.step("autocomplete closes before proposal ownership and continuous movement resume", async () => {
            const partial = partialRow.getByTestId("description-editable");
            await partial.fill("C");
            const options = page.getByRole("option");
            await expect(options).toHaveCount(2);
            await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
            await expect(options.nth(1)).toHaveAttribute("aria-selected", "false");
            await partial.press("ArrowDown");
            await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
            const retained = await pinDescriptionEditor(partial, 0, 1);
            await partial.fill("Cafe");
            await partial.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 3));
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(0);
            await expectRetainedDescriptionEditor(
                partialRow,
                { ...retained, selectionEnd: 3, selectionStart: 1 },
                "Cafe"
            );

            await partial.press("ArrowDown");
            await expectTransactionCellDisplay(partialRow, "description", "Cafe");
            const inspector = await openTransactionInspector(page);
            const proposal = inspector.getByTestId("description-rule-proposal");
            await expect(proposal).toBeVisible();
            await proposal.getByTestId("proposal-dismiss").click();
            await expect(proposal).toHaveCount(0, { timeout: 3_000 });

            const unchanged = await activateTransactionEditor(partialRow, "description");
            await unchanged.press("ArrowDown");
            const continuedEditor = exactRow.getByTestId("description-editable");
            await expect(continuedEditor).toBeFocused();
            await expectTransactionCellDisplay(partialRow, "description", "Cafe");
            await continuedEditor.press("Escape");
            await expectTransactionCellDisplay(exactRow, "description");
        });

        await test.step("keyboard accept, exact typed match and novel blur commit seamlessly", async () => {
            const partial = await activateTransactionEditor(partialRow, "description");
            await partial.fill("Coffee");
            await expect(page.getByRole("option", { name: "Coffee Shop" })).toHaveAttribute(
                "aria-selected",
                "false"
            );
            await partial.press("ArrowDown");
            await partial.press("Enter");
            await expectTransactionCellDisplay(partialRow, "description", "Coffee Shop");

            const exact = await activateTransactionEditor(exactRow, "description");
            await exact.fill("Coffee Shop ");
            await exact.press("Enter");
            await expectTransactionCellDisplay(exactRow, "description", "Coffee Shop");

            const novel = await activateTransactionEditor(novelRow, "description");
            await novel.fill("Fresh novel");
            await page.getByRole("columnheader", { name: "Description", exact: true }).click();
            await expectTransactionCellDisplay(novelRow, "description", "Fresh novel");
            await expect(page.getByRole("dialog")).toHaveCount(0);

            const reopenedNovel = await activateTransactionEditor(novelRow, "description");
            await reopenedNovel.fill("Fresh renamed");
            await reopenedNovel.press("Enter");
            await expectTransactionCellDisplay(novelRow, "description", "Fresh renamed");
            await expect(page.getByRole("dialog")).toHaveCount(0);
        });

        await test.step("imported provenance is accessible only when it differs", async () => {
            const partial = await activateTransactionEditor(partialRow, "description");
            await expect(
                partialRow.getByRole("textbox", { name: "Transaction description" })
            ).toBeFocused();
            await expect(partial).toHaveValue("Coffee Shop");
            await partial.hover();
            await expect(
                page.locator('[role="tooltip"]').filter({ hasText: "Cafe partial" })
            ).toBeVisible();
            await partial.press("Escape");
            await expectTransactionCellDisplay(partialRow, "description", "Coffee Shop");

            const exact = await activateTransactionEditor(exactRow, "description");
            await expect(exact).toBeVisible();
            await expect(
                exactRow.getByRole("textbox", { name: "Transaction description" })
            ).toBeFocused();
            await expect(exact).toHaveValue("Coffee Shop");
            await expect(exact).toHaveAttribute("aria-expanded", "false");
            await exact.hover();
            await expect(
                page.locator('[role="tooltip"]').filter({ hasText: "Coffee Shop" })
            ).toHaveCount(0, { timeout: 3_000 });
            await exact.press("Escape");
            await expectTransactionCellDisplay(exactRow, "description", "Coffee Shop");
        });

        const manualRow =
            await test.step("manual Add and alias edit retain distinct undo boundaries", async () => {
                const pushedBodies: string[] = [];
                page.on("request", (request) => {
                    if (request.url().includes("sync.pushOps"))
                        pushedBodies.push(request.postData() ?? "");
                });
                const addedRowId = await addEmptyTransaction(page);
                const addedRow = page.locator(`[data-transaction-id="${addedRowId}"]`);
                const addedDescription = addedRow.getByTestId("description-editable");
                await expect(addedDescription).toBeFocused();
                await addedDescription.fill("Manual alias only");
                await addedDescription.press("Enter");
                await expectTransactionCellDisplay(addedRow, "description", "Manual alias only");

                const manualEditor = await activateTransactionEditor(addedRow, "description");
                await manualEditor.hover();
                await expect(
                    page.getByRole("tooltip").filter({ hasText: "Manual alias only" })
                ).toHaveCount(0);
                await manualEditor.press("Escape");
                await expectTransactionCellDisplay(addedRow, "description", "Manual alias only");

                await page.getByRole("button", { name: "Undo" }).click();
                await expect(rowsWithDisplayedDescription(page, "Manual alias only")).toHaveCount(
                    0
                );
                const restoredEmptyRow = page.locator(`[data-transaction-id="${addedRowId}"]`);
                await expect(restoredEmptyRow).toBeVisible();
                await expectTransactionCellDisplay(restoredEmptyRow, "description");
                await page.getByRole("button", { name: "Undo" }).click();
                await expect(restoredEmptyRow).toHaveCount(0);

                await page.getByRole("button", { name: "Redo" }).click();
                await expect(restoredEmptyRow).toBeVisible();
                await page.getByRole("button", { name: "Redo" }).click();
                await expectTransactionCellDisplay(
                    restoredEmptyRow,
                    "description",
                    "Manual alias only"
                );
                await expect.poll(() => pushedBodies.length).toBeGreaterThan(0);
                expect(pushedBodies.every((body) => !body.includes("Manual alias only"))).toBe(
                    true
                );
                return restoredEmptyRow;
            });

        await test.step("imported and manual alias state survives a hard refresh", async () => {
            await reloadPage(page);
            await expectTransactionCellDisplay(partialRow, "description", "Coffee Shop");
            await expectTransactionCellDisplay(exactRow, "description", "Coffee Shop");
            await expectTransactionCellDisplay(novelRow, "description", "Fresh renamed");
            await expectTransactionCellDisplay(manualRow, "description", "Manual alias only");
        });

        // UR-002. The rows above are a discriminating fixture set: the manual row has an alias and
        // no stored description at all, while "Imported novel" carries raw text under a *different*
        // alias, so a search matching only one field cannot satisfy every case below.
        await test.step("search matches the alias-resolved description on display", async () => {
            const search = page.getByTestId("search-filter");
            const searchFor = async (term: string): Promise<void> => {
                await search.fill(term);
                await search.press("Enter");
            };

            // The reported defect: this row's only findable text is the alias the user can see.
            await searchFor("manual");
            await expectTransactionCellDisplay(manualRow, "description", "Manual alias only");
            await expect(novelRow).toHaveCount(0);

            // Case-insensitive both ways, and still substring.
            await searchFor("MANU");
            await expectTransactionCellDisplay(manualRow, "description", "Manual alias only");

            // Found by its alias, whose text appears nowhere in the stored description.
            await searchFor("fresh");
            await expectTransactionCellDisplay(novelRow, "description", "Fresh renamed");
            await expect(manualRow).toHaveCount(0);

            // The same row by its raw imported text, which the alias must not shadow.
            await searchFor("novel");
            await expectTransactionCellDisplay(novelRow, "description", "Fresh renamed");

            await searchFor("no-such-description-ur-002");
            await expect(manualRow).toHaveCount(0);
            await expect(novelRow).toHaveCount(0);

            await page.getByRole("button", { name: "Clear search" }).click();
            await expectTransactionCellDisplay(manualRow, "description", "Manual alias only");
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

        const importedRows = page.getByTestId("transaction-row");
        const firstRow = await stableTransactionRow(importedRows.nth(0));
        const secondRow = await stableTransactionRow(importedRows.nth(1));
        for (const row of [firstRow, secondRow]) {
            const input = await activateTransactionEditor(row, "description");
            await input.fill("Shared ");
            await input.press("Enter");
            await expectTransactionCellDisplay(row, "description", "Shared");
        }

        await test.step("an open alias listbox hands off to the modal without selecting a row", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("Tar");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toBeVisible();
            const retained = await pinDescriptionEditor(first, 1, 2);
            const checkbox = secondRow.locator('[data-cell="checkbox"] button');
            const checkboxStateBefore = await checkbox.getAttribute("data-state");

            await checkbox.click();

            await expect(page.getByRole("button", { name: "Change just this one" })).toBeFocused();
            await expect.poll(() => checkbox.getAttribute("data-state")).toBe(checkboxStateBefore);
            await expect(page.getByTestId("bulk-edit-toolbar")).toHaveCount(0, { timeout: 3_000 });
            await page.getByRole("button", { name: "Cancel" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "Tar");
            await first.press("Escape");
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });

        await test.step("pointer target opens one trapped modal and Enter confirms the default", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("Tar");
            const retained = await pinDescriptionEditor(first, 1, 2);
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
            await expectRetainedDescriptionEditor(firstRow, retained, "Target");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });

        await test.step("novel blur offers Change all as one undoable action", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("Unified");
            const retained = await pinDescriptionEditor(first, 1, 4);
            await page.getByRole("columnheader", { name: "Description", exact: true }).click();
            await expect(page.getByRole("button", { name: "Change just this one" })).toBeFocused();
            await page.getByRole("button", { name: "Change all" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "Unified");
            await expectTransactionCellDisplay(secondRow, "description", "Unified");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });

        await test.step("remove cancellation writes nothing and restores canonical cell focus", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("");
            const retained = await pinDescriptionEditor(first, 0, 0);
            await first.press("Enter");
            await expect(
                page.getByRole("button", { name: "Remove from just this one" })
            ).toBeFocused();
            await page.getByRole("button", { name: "Cancel" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });

        await test.step("Remove from just this one is one complete undo step", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("");
            const retained = await pinDescriptionEditor(first, 0, 0);
            await first.press("Enter");
            await page.getByRole("button", { name: "Remove from just this one" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "Original A");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });

        await test.step("Remove from all is one complete undo step", async () => {
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("");
            const retained = await pinDescriptionEditor(first, 0, 0);
            await first.press("Enter");
            await page.getByRole("button", { name: "Remove from all" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "Original A");
            await expectTransactionCellDisplay(secondRow, "description", "Original B");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
            await page.getByRole("button", { name: "Redo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Original A");
            await expectTransactionCellDisplay(secondRow, "description", "Original B");
            await page.getByRole("button", { name: "Undo" }).click();
            await reloadPage(page);
            await expectTransactionCellDisplay(firstRow, "description", "Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Shared");
        });
    });

    test("duplicate tabs converge management, cell, destructive and offline work", async ({
        page,
        context
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await goToTxDescriptions(page);
        await createAlias(page, "Shared");
        await createAlias(page, "Target");
        await importDescriptionFixtures(page, [
            { date: "2026-07-02", description: "Concurrent original A" },
            { date: "2026-07-01", description: "Concurrent original B" }
        ]);

        const importedRows = page.getByTestId("transaction-row");
        const firstRow = await stableTransactionRow(importedRows.nth(0));
        const secondRow = await stableTransactionRow(importedRows.nth(1));
        for (const row of [firstRow, secondRow]) {
            const input = await activateTransactionEditor(row, "description");
            await input.fill("Shared ");
            await input.press("Enter");
            await expectTransactionCellDisplay(row, "description", "Shared");
        }
        await expect(page.getByRole("status", { name: "Saved" })).toBeVisible({
            timeout: 15_000
        });

        const duplicatePagePromise = context.waitForEvent("page");
        await page.evaluate(() => window.open(window.location.href, "_blank"));
        const duplicate = await duplicatePagePromise;
        await expect(duplicate.getByTestId("transaction-table-toolbar")).toBeVisible({
            timeout: 15_000
        });
        const duplicateRows = duplicate.getByTestId("transaction-row");
        const duplicateFirstRow = await stableTransactionRow(duplicateRows.nth(0));
        const duplicateSecondRow = await stableTransactionRow(duplicateRows.nth(1));
        await expectTransactionCellDisplay(duplicateFirstRow, "description", "Shared");
        await expectTransactionCellDisplay(duplicateSecondRow, "description", "Shared");

        await test.step("remote management rename and local exact change converge", async () => {
            await goToTxDescriptions(duplicate);
            await startEditAlias(duplicate, "Shared");
            await duplicate.getByPlaceholder(/alias name/i).fill("Concurrent Shared");

            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("Tar");
            const retained = await pinDescriptionEditor(first, 1, 2);
            const targetOption = page.getByRole("option", { name: "Target" });
            await Promise.all([
                duplicate.getByRole("button", { name: /save/i }).click(),
                targetOption.click()
            ]);
            await page.getByRole("button", { name: "Change just this one" }).click();
            await expectRetainedDescriptionEditor(firstRow, retained, "Target");
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent Shared");

            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Concurrent Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent Shared");
            await expect(duplicate.locator('[data-alias-name="Concurrent Shared"]')).toHaveCount(1);
            await page.getByRole("button", { name: "Redo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Target");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Concurrent Shared");
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent Shared");
        });

        await test.step("remote deletion wins over concurrent shared change-all without data loss", async () => {
            const second = await activateTransactionEditor(secondRow, "description");
            await second.fill("Tar");
            await page.getByRole("option", { name: "Target" }).click();
            const managedRow = duplicate.locator('[data-alias-name="Concurrent Shared"]');
            await managedRow.hover();
            const deleteButton = managedRow.getByRole("button", { name: /delete/i });
            await deleteButton.click();
            await Promise.all([
                deleteButton.click(),
                page.getByRole("button", { name: "Change all" }).click()
            ]);

            await expect(duplicate.getByRole("status", { name: "Saved" })).toBeVisible({
                timeout: 15_000
            });
            await expect(page.getByRole("status", { name: "Saved" })).toBeVisible({
                timeout: 15_000
            });
            await reloadPage(page);
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent original B");
            await expectTransactionCellDisplay(firstRow, "description", "Concurrent original A");
            await expect(duplicate.locator('[data-alias-name="Concurrent Shared"]')).toHaveCount(0);
        });

        await test.step("offline local rename reconnects and keeps remote deletion outside undo", async () => {
            await context.setOffline(true);
            const first = await activateTransactionEditor(firstRow, "description");
            await first.fill("Offline novel");
            await first.press("Enter");
            await expectTransactionCellDisplay(firstRow, "description", "Offline novel");
            await context.setOffline(false);
            await expect(page.getByRole("status", { name: "Saved" })).toBeVisible({
                timeout: 15_000
            });

            // The duplicate tab holds the same vault and has been merging the remote renames; its
            // own local writes must be durable before this raw teardown.
            await awaitVaultPersistence(duplicate);
            await duplicate.goto("/transactions");
            await expectTransactionCellDisplay(duplicateFirstRow, "description", "Offline novel");
            await page.getByRole("button", { name: "Undo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Concurrent original A");
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent original B");
            await page.getByRole("button", { name: "Redo" }).click();
            await expectTransactionCellDisplay(firstRow, "description", "Offline novel");

            await reloadPage(page);
            await reloadPage(duplicate);
            await expectTransactionCellDisplay(firstRow, "description", "Offline novel");
            await expectTransactionCellDisplay(secondRow, "description", "Concurrent original B");
            await expectTransactionCellDisplay(duplicateFirstRow, "description", "Offline novel");
            await expectTransactionCellDisplay(
                duplicateSecondRow,
                "description",
                "Concurrent original B"
            );
        });

        await duplicate.close();
    });
});

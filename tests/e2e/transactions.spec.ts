/**
 * E2E Test: Transactions Page
 *
 * Tests for the transactions page including:
 * - Default account creation on vault creation
 * - Account selection with search and create functionality
 * - Creating accounts from the transaction form
 * - Inline cell editing (Phase 3 - US1)
 * - Keyboard navigation (Phase 3 - US1)
 */

import { expect, test } from "@playwright/test";

import {
    createNewIdentity,
    expectPresentRows,
    goToAccounts,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions,
    goToTxDescriptions,
    readRowPresenceEditing,
    shareActiveVaultWithMember
} from "./helpers";
import { addEmptyTransaction, newlyAddedRow, readSelectedRowIds } from "./helpers/settlement";

// ============================================================================
// Helper: Create a test transaction
// ============================================================================

/**
 * Create a persisted transaction via its ordinary row.
 * Returns the transaction row locator.
 */
async function createTestTransaction(
    page: import("@playwright/test").Page,
    data: {
        description: string;
        amount: string;
    }
) {
    // Add puts the caret in the new row's description without touching selection, so the row is
    // addressed by the stable ID that focus identifies rather than by a selection side effect.
    const addedRow = page.locator(`[data-transaction-id="${await addEmptyTransaction(page)}"]`);
    await expect(addedRow).toBeVisible();

    const descriptionInput = addedRow.getByTestId("description-editable");
    await descriptionInput.fill(data.description);
    await descriptionInput.press("Enter");
    // Committing re-sorts the grid and remounts the row, detaching the handles inside it. Settling
    // on the committed value first means the amount field below is resolved against the post-commit
    // DOM instead of racing the remount and dying on "element was detached from the DOM".
    await expect(descriptionInput).toHaveValue(data.description);

    const amountInput = addedRow.getByTestId("amount-editable");
    await amountInput.fill(data.amount);
    await amountInput.press("Enter");

    const escapedDescription = data.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const transactionRow = page.getByRole("row", {
        name: new RegExp(`${escapedDescription}(Default|$|\\s)`)
    });
    await expect(transactionRow).toBeVisible();
    // Add no longer selects the row it creates, so callers start from an empty selection with no
    // cleanup click needed. Asserting it leaves the invariant guarded for every caller.
    await expect(transactionRow).toHaveAttribute("aria-selected", "false");
}

/**
 * Toggle a Radix checkbox with a real pointer click. This exercises the component's
 * click handler and supports modifiers for range-selection tests.
 *
 * @param checkbox - The checkbox locator
 * @param modifiers - Optional pointer modifiers (e.g., ["Shift"] for shift-click)
 */
async function toggleCheckbox(
    checkbox: import("@playwright/test").Locator,
    modifiers?: ("Shift" | "Control" | "Alt" | "Meta")[]
) {
    await checkbox.click({ modifiers });
}

/**
 * Create a large, deterministic CSV entirely in memory for virtualization coverage.
 */
function createLargeTransactionCSV(rowCount: number): string {
    const rows = Array.from(
        { length: rowCount },
        (_, index) =>
            `2026-01-01,Virtual Transaction ${index.toString().padStart(4, "0")},-${index + 1}.00`
    );
    return ["Date,Description,Amount", ...rows].join("\n");
}

/**
 * Create legal transactions that sort ahead of a transaction added today.
 */
function createFutureTransactionCSV(rowCount: number): string {
    const rows = Array.from(
        { length: rowCount },
        (_, index) =>
            `2099-01-01,Future Transaction ${index.toString().padStart(4, "0")},-${index + 1}.00`
    );
    return ["Date,Description,Amount", ...rows].join("\n");
}

/** The `data-testid` of each data cell UR-005 requires to be chrome-free at rest. */
const RESTING_CHROME_CELL_TEST_IDS = [
    "date-editable",
    "description-editable",
    "status-editable",
    "amount-editable"
] as const;

interface CellPaint {
    readonly backgroundColor: string;
    readonly borderColor: string;
    readonly boxShadow: string;
}

/**
 * Read the painted background, border and shadow of an element.
 *
 * Computed style is read rather than a class list because the defect UR-005 reports is precisely
 * that a class the cell asks for does not reach the pixels: the shared primitives carry
 * `dark:bg-input/30` and `dark:border-input`, which survive `twMerge` against an unprefixed
 * `bg-transparent`. Only the resolved paint can tell the two apart.
 */
async function readCellPaint(cell: import("@playwright/test").Locator): Promise<CellPaint> {
    return cell.evaluate((node) => {
        const styles = getComputedStyle(node);
        return {
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor,
            boxShadow: styles.boxShadow
        };
    });
}

/**
 * True when a CSS colour paints nothing at all — fully transparent, whatever notation it uses.
 *
 * Canvas resolves every colour syntax the theme can emit, including the `oklab(... / 0.045)` a
 * 15%-white token composites to, so the check does not depend on how the browser chose to serialise
 * the value.
 */
async function paintsNothing(
    page: import("@playwright/test").Page,
    color: string
): Promise<boolean> {
    return page.evaluate((value) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("2d context unavailable");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [, , , alpha = 0] = context.getImageData(0, 0, 1, 1).data;
        return alpha === 0;
    }, color);
}

/** Contrast ratio of an element's text against its own composited background. */
async function measuredTextContrast(cell: import("@playwright/test").Locator): Promise<number> {
    return cell.evaluate((node) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("2d context unavailable");
        const channels = (color: string): readonly number[] => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
            return [red, green, blue, alpha];
        };
        // A transparent cell shows whatever ancestor actually paints, so the true backdrop is the
        // nearest opaque ancestor rather than the cell's own `background-color`.
        const opaqueBackdrop = (): readonly number[] => {
            for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
                const painted = channels(getComputedStyle(ancestor).backgroundColor);
                if ((painted[3] ?? 0) === 255) return painted;
            }
            return [255, 255, 255, 255];
        };
        const background = opaqueBackdrop();
        const foreground = channels(getComputedStyle(node).color);
        const foregroundAlpha = (foreground[3] ?? 0) / 255;
        const composited = [0, 1, 2].map(
            (index) =>
                (foreground[index] ?? 0) * foregroundAlpha +
                (background[index] ?? 0) * (1 - foregroundAlpha)
        );
        const luminance = (values: readonly number[]) => {
            const [red = 0, green = 0, blue = 0] = values.map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.04045
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return red * 0.2126 + green * 0.7152 + blue * 0.0722;
        };
        const foregroundLuminance = luminance(composited);
        const backgroundLuminance = luminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);
        return (lighter + 0.05) / (darker + 0.05);
    });
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Transactions", () => {
    test("person allocation columns scroll, edit, persist and share undo history", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await goToPeople(page);

        for (let index = 0; index < 12; index += 1) {
            await page.getByRole("button", { name: "Add Person" }).click();
            await page
                .getByPlaceholder("Enter person's name")
                .fill(`Grid Person ${index.toString().padStart(2, "0")}`);
            await page.getByRole("button", { name: "Add", exact: true }).click();
        }

        await goToTransactions(page);
        const row = page.locator(`[data-transaction-id="${await addEmptyTransaction(page)}"]`);
        const editorButton = row.getByRole("button", {
            name: /edit Grid Person 00 allocation/i
        });
        const scrollContainer = page.getByTestId("transaction-table").locator("..");

        await expect(page.getByText("Grid Person 00 %", { exact: true })).toBeVisible();
        await expect(editorButton).toContainText("—");
        await expect(editorButton).toHaveAttribute(
            "data-presence-field",
            expect.stringMatching(/^allocation:/)
        );
        expect(await scrollContainer.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
            await scrollContainer.evaluate((element) => element.clientWidth)
        );

        const startedAt = Date.now();
        await editorButton.click();
        const input = row.getByRole("textbox", {
            name: "Grid Person 00 allocation percentage"
        });
        await input.fill("-35.125");
        await input.press("Enter");
        await expect(editorButton).toContainText("-35.125%");
        expect(Date.now() - startedAt).toBeLessThan(2_000);

        await page.getByRole("button", { name: "Undo" }).click();
        await expect(editorButton).toContainText("—");
        await page.getByRole("button", { name: "Redo" }).click();
        await expect(editorButton).toContainText("-35.125%");

        await page.reload();
        const persistedRow = page.getByTestId("transaction-row").first();
        await expect(
            persistedRow.getByRole("button", {
                name: /edit Grid Person 00 allocation/i
            })
        ).toContainText("-35.125%");
    });

    test("page displays correctly with empty state", async ({ page }) => {
        await createNewIdentity(page);

        await test.step("navigate to transactions page", async () => {
            await goToTransactions(page);

            // Check the Transactions nav link is active (has the right styling)
            // and that the add transaction row is present
            await expect(page.getByRole("link", { name: "Transactions" })).toBeVisible();
        });

        await test.step("show toolbar in empty state", async () => {
            // The toolbar with add button should always be visible
            const toolbar = page.locator('[data-testid="transaction-table-toolbar"]');
            await expect(toolbar).toBeVisible();
            const addButton = page.locator('[data-testid="add-transaction-button"]');
            await expect(addButton).toBeVisible();
        });
    });

    test("each Add click immediately creates a distinct ordinary empty row", async ({ page }) => {
        await createNewIdentity(page);
        await goToTransactions(page);

        const addButton = page.getByTestId("add-transaction-button");
        const firstAddedRowId = await addEmptyTransaction(page);
        const firstAddedRow = page.locator(`[data-transaction-id="${firstAddedRowId}"]`);

        await expect(addButton).toBeEnabled();
        await expect(page.getByTestId("transaction-row")).toHaveCount(1);
        await expect(page.getByTestId("new-transaction-description")).toHaveCount(0);
        await expect(page.getByTestId("add-transaction-submit")).toHaveCount(0);
        await expect(page.getByTestId("add-transaction-cancel")).toHaveCount(0);

        // Add identifies the new row by putting the caret in it, and leaves it unselected: an empty
        // edit target is not a bulk-operation target.
        await expect(firstAddedRow.getByTestId("description-editable")).toBeFocused();
        await expect(
            firstAddedRow.getByRole("checkbox", { name: "Select transaction" })
        ).not.toBeChecked();
        await expect(firstAddedRow.getByTestId("description-editable")).toHaveValue("");
        await expect(firstAddedRow.getByTestId("description-editable")).toHaveAttribute(
            "placeholder",
            "No description"
        );
        await expect(firstAddedRow.getByTestId("date-editable")).not.toHaveValue("");
        await expect(firstAddedRow.getByRole("combobox", { name: "Select account" })).toContainText(
            "Default"
        );
        await expect(firstAddedRow.getByTestId("status-editable")).toContainText("For Review");
        await expect(firstAddedRow.getByTestId("amount-editable")).toHaveValue("0.00");

        await addEmptyTransaction(page);
        await addEmptyTransaction(page);
        await expect(page.getByTestId("transaction-row")).toHaveCount(3);
        await expect(page.getByRole("row", { selected: true })).toHaveCount(0);

        const descriptions = page.getByTestId("description-editable");
        await descriptions.nth(0).focus();
        await descriptions.nth(0).press("ArrowDown");
        await expect(descriptions.nth(1)).toBeFocused();
        await descriptions.nth(1).press("Shift+Tab");
        await expect(page.getByTestId("date-editable").nth(1)).toBeFocused();
        await page.getByTestId("date-editable").nth(1).press("Tab");
        await expect(descriptions.nth(1)).toBeFocused();

        await descriptions.nth(1).fill("Ordinary empty row");
        await descriptions.nth(1).press("Enter");
        await expect(descriptions.nth(1)).toHaveValue("Ordinary empty row");

        await descriptions.nth(2).fill("Discarded draft");
        await descriptions.nth(2).press("Escape");
        await expect(descriptions.nth(2)).toHaveValue("");

        await page.reload();
        await expect(page.getByTestId("transaction-row")).toHaveCount(3);
        await expect(page.getByTestId("description-editable").nth(1)).toHaveValue(
            "Ordinary empty row"
        );
    });

    test("Add focuses the new row's description and preserves a multi-row selection", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await goToTransactions(page);

        const existingIds: string[] = [];
        for (let index = 0; index < 3; index += 1)
            existingIds.push(await addEmptyTransaction(page));

        // Rows sort newest-first, so the selection is compared as a set rather than in row order.
        const chosenIds = [existingIds[0], existingIds[2]].sort();
        const readSelection = async () => (await readSelectedRowIds(page)).sort();

        await test.step("build a multi-row selection the user intends to bulk edit", async () => {
            for (const id of chosenIds) {
                await page
                    .locator(`[data-transaction-id="${id}"] [data-testid="row-checkbox"] button`)
                    .click();
            }
            expect(await readSelection()).toEqual(chosenIds);
            await expect(page.getByTestId("bulk-edit-toolbar")).toContainText("Edit 2");
        });

        await test.step("Add leaves that selection untouched and takes the caret", async () => {
            const addedId = await addEmptyTransaction(page);
            expect(existingIds).not.toContain(addedId);

            // This is the load-bearing E2E assertion for UR-001's focus clause. `toBeFocused` is a
            // converging assertion on the state the caret is *expected* to hold, which is what an
            // expectation should be; it is deliberately not the thing `addEmptyTransaction`
            // synchronises on, because focus is transient and can un-settle.
            const addedRow = page.locator(`[data-transaction-id="${addedId}"]`);
            await expect(addedRow.getByTestId("description-editable")).toBeFocused();
            await expect(addedRow).toHaveAttribute("aria-selected", "false");

            // The pre-existing selection survives verbatim, so the bulk edit the user was building
            // is still aimed at exactly the rows they picked.
            expect(await readSelection()).toEqual(chosenIds);
            await expect(page.getByTestId("bulk-edit-toolbar")).toContainText("Edit 2");
        });

        await test.step("the focus intent does not re-assert on a later render", async () => {
            const firstDescription = page
                .locator(`[data-transaction-id="${existingIds[0]}"]`)
                .getByTestId("description-editable");
            await firstDescription.click();
            await firstDescription.fill("Typed somewhere else");
            // Committing re-renders the whole grid. A focus intent that had not been consumed
            // would yank the caret back into the created row mid-edit.
            await firstDescription.press("Enter");

            await expect(firstDescription).toHaveValue("Typed somewhere else");
            await expect(newlyAddedRow(page)).toHaveCount(0);
            expect(await readSelection()).toEqual(chosenIds);
        });
    });

    test("creating a row tells peers nothing until the user actually edits it", async ({
        browser
    }) => {
        test.setTimeout(180_000);

        // Presence answers "is a person working on this row". Add moves the caret on the user's
        // behalf, before they have touched anything, so it must stay silent — otherwise a peer is
        // told someone is editing a transaction they have not looked at. The first real gesture
        // must still report normally, which is what makes this a guard rather than a mute switch.
        const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
        const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
        const owner = await ownerContext.newPage();
        const member = await memberContext.newPage();

        try {
            await createNewIdentity(owner);
            await createNewIdentity(member);
            await shareActiveVaultWithMember(owner, member);

            await goToTransactions(owner);
            await goToTransactions(member);

            const createdId = await addEmptyTransaction(owner);
            await expect(member.getByTestId("transaction-row")).toHaveCount(1, { timeout: 30_000 });
            await expect(owner.getByTestId("description-editable")).toBeFocused();

            // The caret is in the row on the owner's screen, yet the peer is told nothing.
            await expectPresentRows(member, []);
            expect(await readRowPresenceEditing(member, createdId)).toBe(false);

            // A real gesture into the very same input reports as editing, so the suppression is
            // scoped to the programmatic focus rather than disabling presence for the row. The
            // caret is already sitting in that input, and clicking a focused element fires no
            // focus event, so this leaves the grid first to make the return a genuine transition.
            await owner.getByTestId("add-transaction-button").focus();
            await owner.getByTestId("description-editable").click();
            await expectPresentRows(member, [createdId]);
            await expect
                .poll(() => readRowPresenceEditing(member, createdId), { timeout: 20_000 })
                .toBe(true);
        } finally {
            await ownerContext.close();
            await memberContext.close();
        }
    });

    test("Add reveals an ordinary row through every excluding filter class", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);

        await goToAccounts(page);
        await page.getByRole("button", { name: /add account/i }).click();
        await page.getByPlaceholder(/account name/i).fill("Savings");
        await page.getByRole("button", { name: /^add$/i }).click();

        await goToTags(page);
        await page.getByRole("button", { name: /add tag/i }).click();
        await page.getByPlaceholder(/enter tag name/i).fill("Excluded Tag");
        await page.getByRole("button", { name: /^add tag$/i }).click();

        await goToTransactions(page);

        const addThroughExcludingFilter = async (
            label: string,
            expectedCount: number,
            activate: () => Promise<void>
        ) => {
            return test.step(`${label} filter is cleared when Add reveals its row`, async () => {
                await activate();
                await expect(page.getByTestId("transaction-row")).toHaveCount(0);
                await expect(page.getByRole("button", { name: /^Clear all/ })).toBeVisible();

                const transactionId = await addEmptyTransaction(page);
                const addedRow = page.locator(`[data-transaction-id="${transactionId}"]`);

                await expect(page.getByTestId("transaction-row")).toHaveCount(expectedCount);
                await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);

                const toolbar = page.getByTestId("transaction-table-toolbar");
                await expect(toolbar).toContainText(
                    `${expectedCount} transaction${expectedCount === 1 ? "" : "s"}`
                );
                // Revealing a row is discoverability, not a bulk-operation target: nothing selects.
                await expect(toolbar).not.toContainText("selected");
                await expect(toolbar).not.toContainText("(filtered)");
                await expect(page.getByTestId("search-filter")).toHaveValue("");
                await expect(page.getByRole("row", { selected: true })).toHaveCount(0);

                await expect(addedRow.getByTestId("description-editable")).toBeFocused();
                await expect(addedRow.getByTestId("description-editable")).toHaveValue("");
                const addedAccount = addedRow.getByRole("combobox", { name: "Select account" });
                await expect(addedAccount).not.toHaveText("");
                await expect(addedRow.getByTestId("status-editable")).toContainText("For Review");

                const accountName = (await addedAccount.textContent())?.trim();
                if (!accountName) throw new Error("Expected persisted transaction account");
                return { transactionId, accountName };
            });
        };

        const firstTransaction = await addThroughExcludingFilter("search", 1, async () => {
            const search = page.getByTestId("search-filter");
            await search.fill("definitely-no-match-p13-r02");
            await search.press("Enter");
        });
        await addThroughExcludingFilter("date", 2, async () => {
            await page.getByRole("button", { name: "All time" }).click();
            await page.getByRole("button", { name: "Last year" }).click();
        });
        await addThroughExcludingFilter("tag", 3, async () => {
            await page.getByRole("button", { name: "Tags" }).click();
            await page.getByRole("button", { name: "Excluded Tag", exact: true }).click();
        });
        await addThroughExcludingFilter("person", 4, async () => {
            await page.getByRole("button", { name: "People" }).click();
            await page.getByRole("button", { name: "Me", exact: true }).click();
        });
        await addThroughExcludingFilter("account", 5, async () => {
            await page.getByRole("button", { name: "Accounts" }).click();
            const excludingAccount =
                firstTransaction.accountName === "Savings" ? "Default" : "Savings";
            await page.getByRole("button", { name: excludingAccount, exact: true }).click();
        });
        await addThroughExcludingFilter("status", 6, async () => {
            await page.getByRole("button", { name: "Status" }).click();
            await page.getByRole("button", { name: "Paid", exact: true }).click();
        });
        const historyTransaction = await addThroughExcludingFilter("duplicates", 7, async () => {
            await page.getByTestId("duplicates-filter").click();
        });

        const historyRow = page.locator(
            `[data-transaction-id="${historyTransaction.transactionId}"]`
        );
        await page.getByRole("button", { name: "Undo" }).click();
        await expect(historyRow).toHaveCount(0);
        await expect(page.getByTestId("transaction-row")).toHaveCount(6);
        await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);

        await page.getByRole("button", { name: "Redo" }).click();
        await expect(historyRow).toBeVisible();
        await expect(page.getByTestId("transaction-row")).toHaveCount(7);
        await expect(historyRow).toHaveAttribute("aria-selected", "false");
        await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);

        await page.reload();
        await expect(historyRow).toBeVisible();
        await expect(page.getByTestId("transaction-row")).toHaveCount(7);
        await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
        await expect(page.getByTestId("search-filter")).toHaveValue("");
        await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);
        await expect(page.getByTestId("transaction-table-toolbar")).not.toContainText("(filtered)");
    });

    test("Add reveals its canonical row beyond the initial transaction page", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);

        await test.step("import more than one page of higher-sorted legal transactions", async () => {
            await goToImportNew(page);
            await page.locator('input[type="file"]').setInputFiles({
                name: "future-transactions.csv",
                mimeType: "text/csv",
                buffer: Buffer.from(createFutureTransactionCSV(51))
            });

            await expect(page.getByText("CSV • 52 rows", { exact: true })).toBeVisible({
                timeout: 10_000
            });
            await page.getByRole("tab", { name: /Columns/i }).click();
            await page.getByRole("button", { name: /Auto-detect/i }).click();
            await expect(page.getByText(/All required fields mapped/i)).toBeVisible();

            await page.getByRole("tab", { name: /Account/i }).click();
            await page.locator("#account-select").click();
            await page.getByRole("option", { name: /Default/i }).click();

            const importButton = page.getByRole("button", {
                name: /Import 51 Transactions/i
            });
            await expect(importButton).toBeEnabled();
            await importButton.click();
            await expect(page).toHaveURL(/\/transactions/);
            await expect(page.getByText("51 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("clear an excluding filter and focus the canonical row", async () => {
            const search = page.getByTestId("search-filter");
            await search.fill("definitely-no-match-p13-r03");
            await search.press("Enter");
            await expect(page.getByTestId("transaction-row")).toHaveCount(0);
            await expect(page.getByRole("button", { name: /^Clear all/ })).toBeVisible();

            // The new row sorts to index 51, well past the first virtual window, so this is the
            // load-bearing virtualization case: the row must mount and take the caret anyway.
            const transactionId = await addEmptyTransaction(page);
            const exactRow = page.locator(`[data-transaction-id="${transactionId}"]`);

            await expect(search).toHaveValue("");
            await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);

            const toolbar = page.getByTestId("transaction-table-toolbar");
            await expect(toolbar).toContainText("52 transactions");
            await expect(toolbar).not.toContainText("selected");
            await expect(toolbar).not.toContainText("(filtered)");
            await expect(page.getByTestId("bulk-edit-toolbar")).toHaveCount(0);

            await expect(exactRow).toBeVisible();
            await expect(exactRow.getByTestId("description-editable")).toBeFocused();
            await expect(exactRow.getByTestId("description-editable")).toHaveValue("");
            await expect(exactRow.getByTestId("date-editable")).not.toHaveValue("");
            await expect(exactRow.getByRole("combobox", { name: "Select account" })).toContainText(
                "Default"
            );
            await expect(exactRow.getByTestId("status-editable")).toContainText("For Review");
            await expect(exactRow.getByTestId("amount-editable")).toHaveValue("0.00");
            await expect(exactRow.locator("../..")).toHaveAttribute("data-index", "51");

            await page.getByRole("button", { name: "Undo" }).click();
            await expect(exactRow).toHaveCount(0);
            await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
            await expect(toolbar).toContainText("51 transactions");
            await expect(toolbar).not.toContainText("selected");
            await expect(page.getByTestId("bulk-edit-toolbar")).toHaveCount(0);

            await page.getByRole("button", { name: "Redo" }).click();
            await expect(exactRow).toBeVisible();
            await expect(exactRow).toHaveAttribute("aria-selected", "false");
            await expect(exactRow.locator("../..")).toHaveAttribute("data-index", "51");
            await expect(toolbar).toContainText("52 transactions");
            await expect(toolbar).not.toContainText("selected");
            await expect(page.getByTestId("bulk-edit-toolbar")).toHaveCount(0);

            await page.reload();
            await expect(toolbar).toContainText("52 transactions");
            await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
            const scrollContainer = page.getByTestId("transaction-table").locator("..");
            await expect
                .poll(async () => {
                    await scrollContainer.evaluate((element) => {
                        element.scrollTop = element.scrollHeight;
                        element.dispatchEvent(new Event("scroll"));
                    });
                    return exactRow.count();
                })
                .toBe(1);
            await expect(exactRow).toBeVisible();
            await expect(exactRow.getByTestId("description-editable")).toHaveValue("");
            await expect(exactRow.locator("../..")).toHaveAttribute("data-index", "51");
        });
    });

    test("empty rows survive offline reload and converge once across authenticated tabs", async ({
        context,
        page
    }) => {
        await createNewIdentity(page);
        await goToTransactions(page);

        const addButton = page.getByTestId("add-transaction-button");
        await addButton.click();
        await expect(page.getByTestId("transaction-row")).toHaveCount(1);
        await expect(page.getByRole("status", { name: "Saved" })).toBeVisible();

        const duplicatePagePromise = context.waitForEvent("page");
        await page.evaluate(() => {
            window.open(window.location.href, "_blank");
        });
        const duplicate = await duplicatePagePromise;

        try {
            await expect(duplicate.getByTestId("transaction-row")).toHaveCount(1);

            const failedPush = page.waitForEvent("requestfailed", {
                predicate: (request) => request.url().includes("/api/trpc/sync.pushOps")
            });
            await context.setOffline(true);
            await addButton.click();
            await addButton.click();
            await expect(page.getByTestId("transaction-row")).toHaveCount(3);
            await failedPush;

            await context.setOffline(false);
            await expect(page.getByRole("status", { name: "Saved" })).toBeVisible();
            await expect(duplicate.getByTestId("transaction-row")).toHaveCount(3);

            await page.reload();
            await expect(page.getByTestId("transaction-row")).toHaveCount(3);
            await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
        } finally {
            await context.setOffline(false);
            await duplicate.close();
        }
    });

    test("default account exists after vault creation", async ({ page }) => {
        await createNewIdentity(page);

        await test.step("navigate to accounts and verify default account exists", async () => {
            await goToAccounts(page);

            // The default account should be visible in the table
            await expect(page.getByText("Default", { exact: true })).toBeVisible();
        });
    });

    test("virtualized large list preserves position, focus, editing, filtering and navigation", async ({
        page,
        context
    }) => {
        test.setTimeout(120_000);
        const runtimeProblems: string[] = [];
        const taskWarningPattern =
            /flushSync|ResizeObserver|hydration|Maximum call stack|Failed to save local update/i;
        page.on("console", (message) => {
            if (
                (message.type() === "warning" || message.type() === "error") &&
                taskWarningPattern.test(message.text())
            ) {
                runtimeProblems.push(`${message.type()}: ${message.text()}`);
            }
        });
        page.on("pageerror", (error) => runtimeProblems.push(`pageerror: ${error.message}`));

        await createNewIdentity(page);

        await test.step("create 100 aliases through the real management flow", async () => {
            await goToTxDescriptions(page);
            for (let index = 0; index < 100; index += 1) {
                await page.getByRole("button", { name: /add alias/i }).click();
                await page
                    .getByPlaceholder(/enter alias name/i)
                    .fill(`Scale Alias ${index.toString().padStart(4, "0")}`);
                await page.getByRole("button", { name: /^add alias$/i }).click();
            }
            await expect(page.locator("[data-alias-name]")).toHaveCount(100);
        });

        await test.step("import 500 deterministic transactions through the real flow", async () => {
            await goToImportNew(page);
            await page.locator('input[type="file"]').setInputFiles({
                name: "virtualized-transactions.csv",
                mimeType: "text/csv",
                buffer: Buffer.from(createLargeTransactionCSV(500))
            });

            await expect(page.getByText("CSV • 501 rows", { exact: true })).toBeVisible({
                timeout: 10_000
            });
            await page.getByRole("tab", { name: /Columns/i }).click();
            await page.getByRole("button", { name: /Auto-detect/i }).click();
            await expect(page.getByText(/All required fields mapped/i)).toBeVisible();

            await page.getByRole("tab", { name: /Account/i }).click();
            await page.locator("#account-select").click();
            await page.getByRole("option", { name: /Default/i }).click();

            const importButton = page.getByRole("button", { name: /Import 500 Transactions/i });
            await expect(importButton).toBeEnabled();
            await importButton.click();
            await expect(page).toHaveURL(/\/transactions/);
            await expect(page.getByText("500 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("rapidly reach the overscan edge with bounded DOM and measured latency", async () => {
            const scrollContainer = page.getByTestId("transaction-table").locator("..");
            const edgeWrapper = page.locator('[data-index="499"]');
            const startedAt = Date.now();

            await expect
                .poll(
                    async () => {
                        await scrollContainer.evaluate((element) => {
                            element.scrollTop = element.scrollHeight;
                            element.dispatchEvent(new Event("scroll"));
                        });
                        return edgeWrapper.count();
                    },
                    { timeout: 10_000, intervals: [100] }
                )
                .toBe(1);

            const expansionDurationMs = Date.now() - startedAt;
            expect(expansionDurationMs).toBeLessThan(10_000);
            await expect(edgeWrapper).toBeVisible();
            expect(await page.getByTestId("transaction-row").count()).toBeLessThan(40);

            await scrollContainer.evaluate((element) => {
                element.scrollTop = 0;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect(page.locator('[data-index="0"]')).toBeVisible();

            await scrollContainer.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect(edgeWrapper).toBeVisible();
        });

        await test.step("lazily filter the large alias set and pin one focused recycled row", async () => {
            const scrollContainer = page.getByTestId("transaction-table").locator("..");
            const firstWrapper = page.locator('[data-index="0"]');
            const firstDescription = firstWrapper.getByTestId("description-editable");
            await scrollContainer.evaluate((element) => {
                element.scrollTop = 0;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect(firstWrapper).toBeVisible();

            expect(await page.getByTestId("transaction-row").count()).toBeLessThan(40);
            expect(await page.getByRole("listbox", { name: "Description aliases" }).count()).toBe(
                0
            );
            expect(await page.getByRole("option").count()).toBe(0);

            await firstDescription.focus();
            expect(await page.getByRole("listbox", { name: "Description aliases" }).count()).toBe(
                0
            );
            const filterStartedAt = Date.now();
            await firstDescription.fill("Scale Alias 0099");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(1);
            await expect(page.getByRole("option", { name: "Scale Alias 0099" })).toHaveAttribute(
                "aria-selected",
                "false"
            );
            expect(Date.now() - filterStartedAt).toBeLessThan(2_000);
            await firstDescription.press("Escape");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(0);
            await firstDescription.press("Escape");

            await firstDescription.focus();
            await firstDescription.evaluate((input: HTMLInputElement) =>
                input.setSelectionRange(4, 4)
            );
            await scrollContainer.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect(page.locator('[data-index="499"]')).toBeVisible();
            await expect(firstWrapper).toHaveCount(1);
            await expect(firstDescription).toBeFocused();
            await expect
                .poll(() =>
                    firstDescription.evaluate((input: HTMLInputElement) => input.selectionStart)
                )
                .toBe(4);
            expect(await page.getByTestId("transaction-row").count()).toBeLessThan(40);

            await expect(firstDescription).toBeFocused();
        });

        await test.step("resize and edit the focused overscan-edge row without losing focus", async () => {
            const edgeDescription = page
                .locator('[data-index="499"]')
                .getByTestId("description-editable");

            await edgeDescription.click();
            await expect(edgeDescription).toBeFocused();
            await page.setViewportSize({ width: 1_000, height: 700 });
            await expect(edgeDescription).toBeFocused();

            await edgeDescription.fill("Virtualized Edge Edited");
            await edgeDescription.press("Enter");
            await expect(edgeDescription).toHaveValue("Virtualized Edge Edited");
        });

        await test.step("filter the large list and restore its edited row", async () => {
            const search = page.getByTestId("search-filter");
            await search.fill("Virtual Transaction 0499");
            await search.press("Enter");

            await expect(page.getByText("1 transaction (filtered)", { exact: true })).toBeVisible();
            await expect(page.getByRole("row", { name: /Virtualized Edge Edited/i })).toBeVisible();

            await page.getByRole("button", { name: "Clear search" }).click();
            await expect(page.getByText("500 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("preserve the large list across navigation, refresh and a duplicate tab", async () => {
            await goToAccounts(page);
            await goToTransactions(page);
            await expect(page.getByText("500 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });

            await page.reload();
            await expect(page.getByText("500 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });

            const duplicatePagePromise = context.waitForEvent("page");
            await page.evaluate(() => {
                window.open(window.location.href, "_blank");
            });
            const duplicatePage = await duplicatePagePromise;
            const duplicateWarnings: string[] = [];
            duplicatePage.on("console", (message) => {
                if (
                    (message.type() === "warning" || message.type() === "error") &&
                    taskWarningPattern.test(message.text())
                ) {
                    duplicateWarnings.push(`${message.type()}: ${message.text()}`);
                }
            });
            duplicatePage.on("pageerror", (error) =>
                duplicateWarnings.push(`pageerror: ${error.message}`)
            );

            await expect(duplicatePage.getByText("500 transactions", { exact: true })).toBeVisible({
                timeout: 15_000
            });
            expect(duplicateWarnings).toEqual([]);
            await duplicatePage.close();
        });

        expect(runtimeProblems).toEqual([]);
    });

    test("account selector opens and shows create option", async ({ page }) => {
        await createNewIdentity(page);
        await goToTransactions(page);

        await test.step("activate add transaction row", async () => {
            const addButton = page.locator('[data-testid="add-transaction-button"]');
            await addButton.click();
        });

        await test.step("open account selector and verify create option exists", async () => {
            // Click the account combobox button
            const accountButton = page.getByRole("combobox", { name: /select account/i });
            await accountButton.click();

            // The create option should be visible
            await expect(page.getByRole("option", { name: /create new account/i })).toBeVisible();
        });

        await test.step("search filters accounts and create option remains", async () => {
            // Type in the search box
            const searchInput = page.getByPlaceholder(/search accounts/i);
            await searchInput.fill("xyz-nonexistent-account-name");

            // Create option should still be visible even when no accounts match
            await expect(page.getByRole("option", { name: /create new account/i })).toBeVisible();

            // Clear search to reset
            await searchInput.clear();
        });
    });

    test("can create account from transaction form", async ({ page }) => {
        await createNewIdentity(page);
        await goToTransactions(page);

        await test.step("activate add transaction row and fill some data", async () => {
            const addedRowId = await addEmptyTransaction(page);
            const descriptionInput = page
                .locator(`[data-transaction-id="${addedRowId}"]`)
                .getByTestId("description-editable");
            await descriptionInput.fill("Test transaction");
            await descriptionInput.press("Enter");
        });

        await test.step("open account selector and click create", async () => {
            const accountButton = page.getByRole("combobox", { name: /select account/i });
            await accountButton.click();

            // Click create new account
            await page.getByRole("option", { name: /create new account/i }).click();
        });

        await test.step("create account dialog appears and create account", async () => {
            // Dialog should be visible
            await expect(page.getByRole("dialog")).toBeVisible();
            await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();

            // Fill in the account name
            await page.getByLabel(/^name$/i).fill("My Checking");

            // Click create button
            await page.getByRole("button", { name: /^create account$/i }).click();

            // Dialog should close
            await expect(page.getByRole("dialog")).not.toBeVisible();
        });

        await test.step("new account is selected in combobox", async () => {
            // The combobox should now show the new account
            const accountButton = page.getByRole("combobox", { name: /select account/i });
            await expect(accountButton).toContainText("My Checking");
        });

        await test.step("verify account exists in accounts page", async () => {
            await goToAccounts(page);

            // New account should be visible
            await expect(page.getByText("My Checking", { exact: true })).toBeVisible();
        });
    });

    // ========================================================================
    // Phase 3: User Story 1 - Inline Cell Editing (Spreadsheet-style)
    // ========================================================================

    test.describe("Inline Cell Editing (US1)", () => {
        test("T012: click to focus, Enter saves, Escape reverts", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Test Coffee Shop",
                    amount: "-5.50"
                });
            });

            await test.step("click on description cell to focus and edit", async () => {
                const descriptionInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="description-editable"]');

                // In spreadsheet mode, input is always present
                await expect(descriptionInput).toHaveRole("textbox");
                await descriptionInput.click();
                await expect(descriptionInput).toBeFocused();
            });

            await test.step("type new value and press Enter to save", async () => {
                const descriptionInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="description-editable"]');

                await descriptionInput.clear();
                await descriptionInput.fill("Updated Description Name");
                await descriptionInput.press("Enter");

                // Value should be updated
                await expect(descriptionInput).toHaveValue("Updated Description Name");
            });

            await test.step("edit again and press Escape to revert", async () => {
                const descriptionInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="description-editable"]');

                await descriptionInput.click();
                await descriptionInput.clear();
                await descriptionInput.fill("This should be reverted");
                await descriptionInput.press("Escape");

                // Value should be reverted to saved value
                await expect(descriptionInput).toHaveValue("Updated Description Name");
            });
        });

        test("T013: Tab saves and moves to next cell", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Tab Test Store",
                    amount: "-10.00"
                });
            });

            await test.step("click to focus description cell", async () => {
                const descriptionInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="description-editable"]');
                await descriptionInput.click();
                await expect(descriptionInput).toBeFocused();
            });

            await test.step("press Tab to save and move to next cell", async () => {
                const descriptionInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="description-editable"]');

                await descriptionInput.clear();
                await descriptionInput.fill("Tab Saved Value");
                await descriptionInput.press("Tab");

                // Description should be saved
                await expect(descriptionInput).toHaveValue("Tab Saved Value");
            });
        });

        test("T014: date displays in compact format for current year", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Date Format Test",
                    amount: "-50.00"
                });
            });

            await test.step("verify date displays in compact format (no year)", async () => {
                // New transaction defaults to today's date
                // Date should be displayed in compact format without year (e.g., "2/1" or "1/2" depending on locale)
                const dateInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="date-editable"]');

                const dateText = await dateInput.inputValue();
                // Format should be D/M or M/D (no year for current year, no strict padding)
                // Allow for locale-specific separators (/, ., -)
                expect(dateText).toMatch(/^\d{1,2}[./-]\d{1,2}\.?$/);
            });
        });

        test("T014a: edit date cell", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Date Test Store",
                    amount: "-25.00"
                });
            });

            await test.step("click on date cell to open calendar popover", async () => {
                // Click the calendar button to open the popover
                const calendarButton = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .getByRole("button", { name: "Open calendar" });

                await calendarButton.click();
                // Calendar popover should be visible - use specific month name pattern
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();
            });

            await test.step("select a date from calendar to save", async () => {
                // Find and click on day 15 in the calendar
                const calendar = page.getByRole("grid", { name: /\w+ \d{4}/ });
                await calendar.getByRole("gridcell", { name: "15" }).click();

                // Calendar should close after selection
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();

                // Date input should show the selected date (value contains "15")
                const dateInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="date-editable"]');
                await expect(dateInput).toHaveValue(/15/);
            });

            await test.step("open calendar and click outside to close without saving", async () => {
                const dateInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="date-editable"]');

                // Get current date value
                const currentValue = await dateInput.inputValue();

                // Open calendar via button
                const calendarButton = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .getByRole("button", { name: "Open calendar" });
                await calendarButton.click();
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();

                // Press Escape to close without selecting
                await page.keyboard.press("Escape");
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();

                // Date should be unchanged
                await expect(dateInput).toHaveValue(currentValue);
            });
        });

        test("T015: click to edit amount cell (spreadsheet-style)", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Amount Test Store",
                    amount: "-100.00"
                });
            });

            await test.step("click on amount cell to focus and edit", async () => {
                // Spreadsheet-style: input is always visible, click to focus
                const amountInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="amount-editable"]');

                await amountInput.click();
                await expect(amountInput).toBeFocused();
                await expect(amountInput).toHaveRole("textbox");
            });

            await test.step("change amount and press Enter to save", async () => {
                const amountInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="amount-editable"]');

                await amountInput.clear();
                await amountInput.fill("-250.50");
                await amountInput.press("Enter");

                // Should have the new value
                await expect(amountInput).toHaveValue("-250.50");
            });

            await test.step("edit again and press Escape to cancel", async () => {
                const amountInput = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="amount-editable"]');

                await amountInput.click();
                await amountInput.clear();
                await amountInput.fill("-999.99");
                await amountInput.press("Escape");

                // Value should be reverted
                await expect(amountInput).toHaveValue("-250.50");
            });
        });

        test("T016: click to edit status cell (spreadsheet-style)", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Status Test Store",
                    amount: "-50.00"
                });
            });

            await test.step("click on status cell to focus", async () => {
                // Spreadsheet-style: select is always visible, click to open dropdown
                const statusSelect = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="status-editable"]');

                await expect(statusSelect).toHaveRole("combobox");
                await statusSelect.click();

                // Dropdown should be open (Radix moves focus to dropdown content)
                await expect(statusSelect).toHaveAttribute("aria-expanded", "true");
            });

            await test.step("select different status (saves immediately)", async () => {
                // Select "Paid" status (default status created on vault init)
                // Radix Select uses role="option" for items in the dropdown
                await page.getByRole("option", { name: "Paid" }).click();

                // Dropdown closes and status should show "Paid"
                const statusTrigger = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="status-editable"]');

                await expect(statusTrigger).toContainText("Paid");
            });

            await test.step("change status and verify it persists", async () => {
                const statusTrigger = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="status-editable"]');

                // Open dropdown again
                await statusTrigger.click();

                // Select "For Review" status
                await page.getByRole("option", { name: "For Review" }).click();

                // Verify it shows "For Review"
                await expect(statusTrigger).toContainText("For Review");
            });
        });

        test("T016a: click to edit account cell (spreadsheet-style)", async ({ page }) => {
            await createNewIdentity(page);

            await test.step("create a second account", async () => {
                await goToAccounts(page);
                await page.getByRole("button", { name: /add account/i }).click();
                const nameInput = page.getByPlaceholder(/account name/i);
                await nameInput.fill("Savings");
                await page.getByRole("button", { name: /^add$/i }).click();
                await expect(page.getByText("Savings", { exact: true })).toBeVisible();
                await goToTransactions(page);
            });

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Account Test Store",
                    amount: "-60.00"
                });
            });

            await test.step("click on account cell to open dropdown", async () => {
                // Wait for transaction row to be visible (it may still be saving)
                const transactionRow = page.locator('[data-testid="transaction-row"]').first();
                await expect(transactionRow).toBeVisible({ timeout: 15_000 });

                // Spreadsheet-style: click opens the dropdown
                const accountTrigger = transactionRow
                    .locator('[data-cell="account"]')
                    .getByRole("combobox");

                await expect(accountTrigger).toBeVisible({ timeout: 15_000 });
                await accountTrigger.click();

                // Dropdown should be visible with account options
                await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
                await expect(page.getByRole("option", { name: "Savings" })).toBeVisible();
            });

            await test.step("select different account (saves immediately)", async () => {
                // Click on Savings account option
                await page.getByRole("option", { name: "Savings" }).click();

                // Dropdown should close and account should be updated
                const accountTrigger = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="account"]')
                    .getByRole("combobox");

                await expect(accountTrigger).toContainText("Savings");
            });

            await test.step("change account back and verify it persists", async () => {
                const accountTrigger = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="account"]')
                    .getByRole("combobox");

                await accountTrigger.click();
                await page.getByRole("option", { name: "Default" }).click();

                await expect(accountTrigger).toContainText("Default");
            });
        });

        test("T017: click to edit tags cell (spreadsheet-style)", async ({ page }) => {
            await createNewIdentity(page);

            await test.step("create a tag first", async () => {
                // Navigate to tags page
                await goToTags(page);

                // Create a tag using the Add Tag form
                await page.getByRole("button", { name: /add tag/i }).click();

                const nameInput = page.getByPlaceholder(/enter tag name/i);
                await nameInput.waitFor({ state: "visible", timeout: 3000 });
                await nameInput.fill("Groceries");

                await page.getByRole("button", { name: /^add tag$/i }).click();

                // Wait for tag row to be created (more specific than just text)
                await expect(page.locator('[data-testid^="tag-row-"]').first()).toBeVisible();

                // Go back to transactions
                await goToTransactions(page);
            });

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Tags Test Store",
                    amount: "-75.00"
                });
            });

            await test.step("click on tags cell to open dropdown", async () => {
                // Spreadsheet-style: click opens the dropdown
                const tagsEditable = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-testid="tags-editable"]');

                await expect(tagsEditable).toBeVisible();
                await tagsEditable.click();

                // Wait for the dropdown to appear with search input (portaled to body)
                const searchInput = page.getByPlaceholder("Search tags...");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });
            });

            await test.step("select a tag (saves immediately)", async () => {
                // Click on Groceries tag in the portaled dropdown (cmdk items have role="option")
                const tagOption = page.getByRole("option", { name: "Groceries" });
                await tagOption.click();

                // Should show the tag in the cell (dropdown closes after selection)
                const tagsCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="tags"]');
                await expect(tagsCell).toContainText("Groceries");
            });
        });

        test("T033: inline tag creation - Create button visible when searching", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Tag Creation Test",
                    amount: "-50.00"
                });
            });

            await test.step("open tags dropdown and type new tag name", async () => {
                const tagsCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="tags"]');

                await tagsCell.click();

                // Dropdown is portaled to body
                const searchInput = page.getByPlaceholder("Search tags...");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });

                // Type a new tag name that doesn't exist
                await searchInput.fill("NewInlineTag");
            });

            await test.step("verify Create button is visible and clickable", async () => {
                const createButton = page.getByTestId("create-tag-button");
                await expect(createButton).toBeVisible();
                await expect(createButton).toContainText(/create.*newinlinetag/i);

                // Click the Create button
                await createButton.click();
            });

            await test.step("verify new tag was created and applied", async () => {
                const tagsCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="tags"]');

                // The tag should now be visible on the transaction
                await expect(tagsCell).toContainText("NewInlineTag");
            });

            await test.step("verify tag exists in tags page", async () => {
                await goToTags(page);

                // The newly created tag should appear
                await expect(page.getByText("NewInlineTag")).toBeVisible();
            });
        });

        test("T033a: Create button hidden when exact match exists", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create an existing tag", async () => {
                await goToTags(page);
                await page.getByRole("button", { name: /add tag/i }).click();

                const nameInput = page.getByPlaceholder(/enter tag name/i);
                await nameInput.waitFor({ state: "visible", timeout: 3000 });
                await nameInput.fill("ExistingTag");

                await page.getByRole("button", { name: /^add tag$/i }).click();
                await expect(page.locator('[data-testid^="tag-row-"]').first()).toBeVisible();

                await goToTransactions(page);
            });

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Exact Match Test",
                    amount: "-25.00"
                });
            });

            await test.step("open tags dropdown and type exact match", async () => {
                const tagsCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="tags"]');

                await tagsCell.click();

                // Dropdown is portaled to body
                const searchInput = page.getByPlaceholder("Search tags...");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });

                // Type exact name of existing tag
                await searchInput.fill("ExistingTag");
            });

            await test.step("verify Create button is not shown for exact match", async () => {
                // When exact match exists, no create button is rendered
                const createButton = page.getByTestId("create-tag-button");
                await expect(createButton).not.toBeVisible();

                // The existing tag should be selectable instead
                const existingTagOption = page.getByRole("option", { name: "ExistingTag" });
                await expect(existingTagOption).toBeVisible();
            });
        });
    });

    // ========================================================================
    // Keyboard Grid Navigation
    // ========================================================================

    test.describe("Keyboard Grid Navigation", () => {
        test("arrow up/down moves focus between same column cells", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, { description: "Row 1 Store", amount: "-10.00" });
                await createTestTransaction(page, { description: "Row 2 Store", amount: "-20.00" });
                await createTestTransaction(page, { description: "Row 3 Store", amount: "-30.00" });

                // The row appears before the derived toolbar count and sort order always settle.
                // Wait for the complete table state before testing positional navigation.
                await expect(page.getByText("3 transactions", { exact: true })).toBeVisible();
            });

            await test.step("focus first row description and press arrow down", async () => {
                // Use the stable value rather than a live `.first()` locator: a late CRDT render
                // can reorder newly inserted rows between click and focus assertion.
                const firstRowDescription = page
                    .getByRole("row", { name: /Row 3 Store/ })
                    .getByTestId("description-editable");

                await firstRowDescription.click();
                await expect(firstRowDescription).toBeFocused();

                // Press arrow down
                await page.keyboard.press("ArrowDown");

                // Second row description should now be focused
                const secondRowDescription = page
                    .getByRole("row", { name: /Row 2 Store/ })
                    .getByTestId("description-editable");

                await expect(secondRowDescription).toBeFocused();
            });

            await test.step("press arrow down again to move to third row", async () => {
                await page.keyboard.press("ArrowDown");

                const thirdRowDescription = page
                    .getByRole("row", { name: /Row 1 Store/ })
                    .getByTestId("description-editable");

                await expect(thirdRowDescription).toBeFocused();
            });

            await test.step("press arrow up to move back to second row", async () => {
                await page.keyboard.press("ArrowUp");

                const secondRowDescription = page
                    .getByRole("row", { name: /Row 2 Store/ })
                    .getByTestId("description-editable");

                await expect(secondRowDescription).toBeFocused();
            });
        });

        test("arrow left/right moves focus between cells in same row", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, { description: "Nav Test", amount: "-50.00" });
            });

            await test.step("focus description cell and navigate right to account", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const descriptionInput = row.locator('[data-testid="description-editable"]');

                await descriptionInput.click();
                await expect(descriptionInput).toBeFocused();

                // Move cursor to end of text, then press right to navigate to next cell
                await page.keyboard.press("End");
                await page.keyboard.press("ArrowRight");

                // Should focus the account cell (next after description)
                const accountTrigger = row.locator('[data-cell="account"]').getByRole("combobox");
                await expect(accountTrigger).toBeFocused();
            });

            await test.step("navigate right through remaining cells", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();

                // From account, arrow right goes to tags (focusable div inside tags-editable)
                await page.keyboard.press("ArrowRight");
                const tagsFocusable = row.locator('[data-testid="tags-editable"] [tabindex="0"]');
                await expect(tagsFocusable).toBeFocused();

                // From tags, arrow right goes to status
                await page.keyboard.press("ArrowRight");
                const statusTrigger = row.locator('[data-testid="status-editable"]');
                await expect(statusTrigger).toBeFocused();

                // Allocation columns are real grid cells between status and amount.
                await page.keyboard.press("ArrowRight");
                const allocationCell = row.getByRole("button", {
                    name: /edit Me allocation/i
                });
                await expect(allocationCell).toBeFocused();

                await page.keyboard.press("ArrowRight");
                const amountInput = row.locator('[data-testid="amount-editable"]');
                await expect(amountInput).toBeFocused();
            });

            await test.step("navigate left back through cells", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();

                // Move cursor to start, then press left
                await page.keyboard.press("Home");
                await page.keyboard.press("ArrowLeft");

                // Amount moves left through the allocation column before status.
                const allocationCell = row.getByRole("button", {
                    name: /edit Me allocation/i
                });
                await expect(allocationCell).toBeFocused();

                await page.keyboard.press("ArrowLeft");
                const statusTrigger = row.locator('[data-testid="status-editable"]');
                await expect(statusTrigger).toBeFocused();

                // Left again to tags
                await page.keyboard.press("ArrowLeft");
                const tagsFocusable = row.locator('[data-testid="tags-editable"] [tabindex="0"]');
                await expect(tagsFocusable).toBeFocused();
            });
        });

        test("text input only navigates when cursor at boundary", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transactions", async () => {
                await createTestTransaction(page, {
                    description: "Boundary Test",
                    amount: "-25.00"
                });
                await createTestTransaction(page, { description: "Other Row", amount: "-35.00" });

                await expect(page.getByText("2 transactions", { exact: true })).toBeVisible();
            });

            await test.step("position cursor in middle of text - arrow keys move cursor not focus", async () => {
                const descriptionInput = page
                    .getByRole("row", { name: /Other Row/ })
                    .getByTestId("description-editable");

                await descriptionInput.click();
                // Position cursor in the middle (after "Other")
                await page.keyboard.press("Home");
                await page.keyboard.press("ArrowRight");
                await page.keyboard.press("ArrowRight");
                await page.keyboard.press("ArrowRight");
                await page.keyboard.press("ArrowRight");
                await page.keyboard.press("ArrowRight");

                // Now arrow right should move cursor within text, not navigate
                await page.keyboard.press("ArrowRight");

                // Should still be focused on same input
                await expect(descriptionInput).toBeFocused();
            });

            await test.step("arrow down from text input moves to next row", async () => {
                // Arrow down should move to next row's description (single-line input)
                await page.keyboard.press("ArrowDown");

                const secondRowDescription = page
                    .getByRole("row", { name: /Boundary Test/ })
                    .getByTestId("description-editable");

                await expect(secondRowDescription).toBeFocused();
            });
        });

        test("status dropdown arrow keys navigate grid, not open dropdown", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transactions", async () => {
                await createTestTransaction(page, {
                    description: "Status Nav 1",
                    amount: "-10.00"
                });
                await createTestTransaction(page, {
                    description: "Status Nav 2",
                    amount: "-20.00"
                });

                await expect(page.getByText("2 transactions", { exact: true })).toBeVisible();
            });

            await test.step("focus status cell and verify arrow down navigates to next row", async () => {
                const firstStatus = page
                    .getByRole("row", { name: /Status Nav 2/ })
                    .getByTestId("status-editable");

                // Click to focus (not open)
                await firstStatus.focus();
                await expect(firstStatus).toBeFocused();

                // Dropdown should NOT be open
                await expect(firstStatus).toHaveAttribute("aria-expanded", "false");

                // Press arrow down - should navigate to next row, not open dropdown
                await page.keyboard.press("ArrowDown");

                // Second row status should be focused
                const secondStatus = page
                    .getByRole("row", { name: /Status Nav 1/ })
                    .getByTestId("status-editable");
                await expect(secondStatus).toBeFocused();

                // Dropdown should still be closed
                await expect(secondStatus).toHaveAttribute("aria-expanded", "false");
            });
        });

        test("description row navigation - down from description to notes", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transaction and add notes", async () => {
                await createTestTransaction(page, {
                    description: "Desc Nav Test",
                    amount: "-50.00"
                });

                // Find the row by its description (not position, since order may vary)
                const row = page.locator('[data-testid="transaction-row"]').filter({
                    has: page.locator('[data-testid="description-editable"][value="Desc Nav Test"]')
                });

                // Expand and add notes
                const expandButton = row.locator('[data-testid="expand-notes-button"]');
                await expandButton.click();

                const notesInput = page.locator('[data-testid="notes-editable"]');
                await notesInput.fill("Test notes text");
                await notesInput.press("Enter");
            });

            await test.step("create second transaction", async () => {
                await createTestTransaction(page, { description: "Second Row", amount: "-30.00" });
            });

            await test.step("navigate down from description to notes", async () => {
                // Find the row with expanded notes by its description
                const targetRow = page.locator('[data-testid="transaction-row"]').filter({
                    has: page.locator('[data-testid="description-editable"][value="Desc Nav Test"]')
                });
                const descriptionInput = targetRow.locator('[data-testid="description-editable"]');

                await descriptionInput.click();
                await expect(descriptionInput).toBeFocused();

                // Arrow down should go to notes (expanded row)
                await page.keyboard.press("ArrowDown");

                const notesInput = page.locator('[data-testid="notes-editable"]');
                await expect(notesInput).toBeFocused();
            });

            await test.step("navigate up from notes back to description", async () => {
                // The notes should still be focused from previous step
                // Move cursor to start of textarea before pressing up
                await page.keyboard.press("Control+Home"); // Go to very beginning
                await page.keyboard.press("ArrowUp");

                // Should go back to the "Desc Nav Test" row's description
                const targetRow = page.locator('[data-testid="transaction-row"]').filter({
                    has: page.locator('[data-testid="description-editable"][value="Desc Nav Test"]')
                });
                const descriptionInput = targetRow.locator('[data-testid="description-editable"]');
                await expect(descriptionInput).toBeFocused();
            });
        });

        test("Enter key opens date calendar popup", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a transaction", async () => {
                await createTestTransaction(page, {
                    description: "Date Enter Test",
                    amount: "-40.00"
                });
            });

            await test.step("focus date cell and press Enter to open calendar", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const dateInput = row.locator('[data-testid="date-editable"]');

                await dateInput.click();
                await expect(dateInput).toBeFocused();

                // Press Enter to open calendar
                await page.keyboard.press("Enter");

                // Calendar popup should be visible
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();
            });
        });
    });

    // ========================================================================
    // Phase 4: Checkbox Selection (User Story 2)
    // ========================================================================

    test.describe("US2: Checkbox Selection", () => {
        test("T020: clicking row checkbox selects transaction without editing", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, {
                    description: "Checkbox Test 1",
                    amount: "-25.00"
                });
                await createTestTransaction(page, {
                    description: "Checkbox Test 2",
                    amount: "-35.00"
                });

                await expect(page.getByText("2 transactions", { exact: true })).toBeVisible();
            });

            await test.step("click checkbox to select first row", async () => {
                const firstRow = page.getByRole("row", { name: /Checkbox Test 2/ });
                const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');

                await expect(checkboxButton).toBeVisible();
                await toggleCheckbox(checkboxButton);

                // Checkbox button should now show checked state
                await expect(checkboxButton).toHaveAttribute("aria-checked", "true");

                // Row should have selected styling
                await expect(firstRow).toHaveAttribute("aria-selected", "true");
            });

            await test.step("verify selection badge shows count", async () => {
                // Selection count should show in toolbar or badge
                await expect(page.getByText(/1 selected/i).first()).toBeVisible();
            });

            await test.step("clicking checkbox again deselects", async () => {
                const firstRow = page.getByRole("row", { name: /Checkbox Test 2/ });
                const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');

                await toggleCheckbox(checkboxButton);

                // Row should be deselected
                await expect(checkboxButton).toHaveAttribute("aria-checked", "false");
                await expect(firstRow).toHaveAttribute("aria-selected", "false");
            });
        });

        test("T020b: clicking row body does not select transaction", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transaction", async () => {
                await createTestTransaction(page, {
                    description: "No Select Test",
                    amount: "-50.00"
                });
            });

            await test.step("click on row body (description cell) should not select", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const descriptionCell = row.locator('[data-cell="description"]');

                // Ensure row starts unselected
                await expect(row).toHaveAttribute("aria-selected", "false");

                // Click on the description cell (part of the row body)
                await descriptionCell.click();

                // Row should still be unselected
                await expect(row).toHaveAttribute("aria-selected", "false");
            });

            await test.step("clicking checkbox cell selects the row", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const checkboxButton = row.locator('[data-testid="row-checkbox"] button');

                await toggleCheckbox(checkboxButton);
                await expect(row).toHaveAttribute("aria-selected", "true");
            });
        });

        test("T021a: header checkbox selects all filtered transactions", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create multiple test transactions", async () => {
                await createTestTransaction(page, {
                    description: "Select All 1",
                    amount: "-10.00"
                });
                await createTestTransaction(page, {
                    description: "Select All 2",
                    amount: "-20.00"
                });
                await createTestTransaction(page, {
                    description: "Select All 3",
                    amount: "-30.00"
                });

                // A new row can render before the filtered transaction list used by select-all
                // has committed. The toolbar count reflects the state the handler will select.
                await expect(page.getByText("3 transactions", { exact: true })).toBeVisible();
            });

            await test.step("click header checkbox to select all", async () => {
                const headerCheckbox = page.getByRole("checkbox", {
                    name: "Select all transactions"
                });
                await expect(headerCheckbox).toBeVisible();

                await toggleCheckbox(headerCheckbox);

                // All rows should be selected
                const rows = page.locator('[data-testid="transaction-row"]');
                const count = await rows.count();
                expect(count).toBe(3);

                for (let i = 0; i < count; i++) {
                    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
                }
            });

            await test.step("selection badge shows all selected", async () => {
                await expect(page.getByText(/3 selected/i).first()).toBeVisible();
            });

            await test.step("click header checkbox again to deselect all", async () => {
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await toggleCheckbox(headerCheckbox);

                // All rows should be deselected
                const rows = page.locator('[data-testid="transaction-row"]');
                const count = await rows.count();

                for (let i = 0; i < count; i++) {
                    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
                }
            });
        });

        test("T021b: header checkbox shows indeterminate when some selected", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create multiple test transactions", async () => {
                await createTestTransaction(page, {
                    description: "Indeterminate 1",
                    amount: "-10.00"
                });
                await createTestTransaction(page, {
                    description: "Indeterminate 2",
                    amount: "-20.00"
                });
                await createTestTransaction(page, {
                    description: "Indeterminate 3",
                    amount: "-30.00"
                });
            });

            await test.step("select only first row", async () => {
                const firstRow = page.locator('[data-testid="transaction-row"]').first();
                const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');
                await toggleCheckbox(checkboxButton);
            });

            await test.step("verify header checkbox is indeterminate", async () => {
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                // Indeterminate state is represented by aria-checked="mixed"
                await expect(headerCheckbox).toHaveAttribute("aria-checked", "mixed");
            });

            await test.step("clicking indeterminate header selects all", async () => {
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await toggleCheckbox(headerCheckbox);

                // All rows should now be selected
                await expect(page.getByText(/3 selected/i).first()).toBeVisible();
            });
        });

        test("T021c: shift-click selects range of transactions", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create multiple test transactions", async () => {
                await createTestTransaction(page, { description: "Range 1", amount: "-10.00" });
                await createTestTransaction(page, { description: "Range 2", amount: "-20.00" });
                await createTestTransaction(page, { description: "Range 3", amount: "-30.00" });
                await createTestTransaction(page, { description: "Range 4", amount: "-40.00" });
            });

            await test.step("click first row checkbox", async () => {
                const firstRow = page.locator('[data-testid="transaction-row"]').first();
                const checkboxButton = firstRow.locator('[data-testid="row-checkbox"] button');
                await toggleCheckbox(checkboxButton);
            });

            await test.step("shift-click third row checkbox to select range", async () => {
                const thirdRow = page.locator('[data-testid="transaction-row"]').nth(2);
                const checkboxButton = thirdRow.locator('[data-testid="row-checkbox"] button');

                // Shift-click to select range
                await toggleCheckbox(checkboxButton, ["Shift"]);

                // First three rows should be selected
                await expect(page.getByText(/3 selected/i).first()).toBeVisible();

                // Verify each row's selection state
                const rows = page.locator('[data-testid="transaction-row"]');
                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(3)).toHaveAttribute("aria-selected", "false");
            });
        });

        test("T021d: UR-010 shift-click deselects a range begun by deselecting", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create four transactions and select every one", async () => {
                await createTestTransaction(page, { description: "Symmetry 1", amount: "-10.00" });
                await createTestTransaction(page, { description: "Symmetry 2", amount: "-20.00" });
                await createTestTransaction(page, { description: "Symmetry 3", amount: "-30.00" });
                await createTestTransaction(page, { description: "Symmetry 4", amount: "-40.00" });
                await expect(page.getByText("4 transactions", { exact: true })).toBeVisible();

                await toggleCheckbox(
                    page.getByRole("checkbox", { name: "Select all transactions" })
                );
                await expect(page.getByText(/4 selected/i).first()).toBeVisible();
            });

            const rows = page.locator('[data-testid="transaction-row"]');

            await test.step("deselect the second row, making it a deselecting anchor", async () => {
                await toggleCheckbox(rows.nth(1).locator('[data-testid="row-checkbox"] button'));
                await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
                await expect(page.getByText(/3 selected/i).first()).toBeVisible();
            });

            await test.step("shift-click the third row and require the range to be DEselected", async () => {
                // The assertion that distinguishes the fix from the defect: before UR-010 the range
                // branch could only add rows, so this gesture left rows 2 and 3 selected.
                await toggleCheckbox(rows.nth(2).locator('[data-testid="row-checkbox"] button'), [
                    "Shift"
                ]);

                await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
                await expect(rows.nth(2)).toHaveAttribute("aria-selected", "false");

                // Rows outside the range keep the state they had, which is what separates
                // "deselected the range" from "cleared the selection".
                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(3)).toHaveAttribute("aria-selected", "true");
                await expect(page.getByText(/2 selected/i).first()).toBeVisible();
            });

            await test.step("the clicked row is the new anchor, so the next shift-click continues deselecting", async () => {
                await toggleCheckbox(rows.nth(3).locator('[data-testid="row-checkbox"] button'), [
                    "Shift"
                ]);

                await expect(rows.nth(3)).toHaveAttribute("aria-selected", "false");
                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
                await expect(page.getByText(/1 selected/i).first()).toBeVisible();
            });
        });

        test("T021e: UR-010 keyboard range selection follows the same rule as the pointer", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create four transactions", async () => {
                await createTestTransaction(page, { description: "Keys 1", amount: "-10.00" });
                await createTestTransaction(page, { description: "Keys 2", amount: "-20.00" });
                await createTestTransaction(page, { description: "Keys 3", amount: "-30.00" });
                await createTestTransaction(page, { description: "Keys 4", amount: "-40.00" });
                await expect(page.getByText("4 transactions", { exact: true })).toBeVisible();
            });

            const rows = page.locator('[data-testid="transaction-row"]');

            await test.step("select a range from the keyboard alone", async () => {
                await rows.nth(0).locator('[data-testid="row-checkbox"] button').focus();
                await page.keyboard.press("Space");
                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");

                await rows.nth(2).locator('[data-testid="row-checkbox"] button').focus();
                await page.keyboard.press("Shift+Space");

                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
                await expect(rows.nth(3)).toHaveAttribute("aria-selected", "false");
            });

            await test.step("deselect a range from the keyboard, symmetrically", async () => {
                // Same gesture, opposite direction: the keyboard path must not be a select-only
                // shortcut while the pointer gesture deselects.
                await rows.nth(0).locator('[data-testid="row-checkbox"] button').focus();
                await page.keyboard.press("Space");
                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "false");

                await rows.nth(1).locator('[data-testid="row-checkbox"] button').focus();
                await page.keyboard.press("Shift+Space");

                await expect(rows.nth(0)).toHaveAttribute("aria-selected", "false");
                await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
                await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
            });
        });

        test("T021f: UR-011 header checkbox selects rows beyond the loaded page", async ({
            page
        }) => {
            await createNewIdentity(page);

            await test.step("import 500 transactions, far beyond one 50-row page", async () => {
                await goToImportNew(page);
                await page.locator('input[type="file"]').setInputFiles({
                    name: "select-all-transactions.csv",
                    mimeType: "text/csv",
                    buffer: Buffer.from(createLargeTransactionCSV(500))
                });

                await expect(page.getByText("CSV • 501 rows", { exact: true })).toBeVisible({
                    timeout: 10_000
                });
                await page.getByRole("tab", { name: /Columns/i }).click();
                await page.getByRole("button", { name: /Auto-detect/i }).click();
                await expect(page.getByText(/All required fields mapped/i)).toBeVisible();

                await page.getByRole("tab", { name: /Account/i }).click();
                await page.locator("#account-select").click();
                await page.getByRole("option", { name: /Default/i }).click();

                const importButton = page.getByRole("button", {
                    name: /Import 500 Transactions/i
                });
                await expect(importButton).toBeEnabled();
                await importButton.click();
                await expect(page).toHaveURL(/\/transactions/);
                await expect(page.getByText("500 transactions", { exact: true })).toBeVisible({
                    timeout: 15_000
                });
            });

            await test.step("the table renders only a fraction of the matching rows", async () => {
                // The premise: virtualization means most matching rows have no element at all, so
                // an implementation covering "what is rendered" would cover a few dozen rows.
                expect(await page.getByTestId("transaction-row").count()).toBeLessThan(60);
            });

            await test.step("selecting all reports every matching transaction, not the page", async () => {
                await toggleCheckbox(
                    page.getByRole("checkbox", { name: "Select all transactions" })
                );

                // 500, not 50: the count is over the filtered result set.
                await expect(page.getByText(/500 selected/i).first()).toBeVisible();
                await expect(page.getByTestId("bulk-edit-toolbar")).toContainText("Edit 500");
            });

            await test.step("a bulk action reaches a row that was never rendered", async () => {
                // Row 0499 sorts last and is neither rendered nor within the first loaded page.
                await page.getByTestId("bulk-edit-status-button").click();
                await page.getByRole("button", { name: /^paid$/i }).click();

                // Filtering to that one far row is how its value is read without scrolling: the
                // row had no element when the bulk action ran.
                await page
                    .getByPlaceholder(/search transactions/i)
                    .fill("Virtual Transaction 0499");
                await expect(page.getByTestId("transaction-table-toolbar")).toContainText(
                    "1 transaction (filtered)"
                );
                await expect(page.getByTestId("transaction-row")).toHaveCount(1);

                const farRow = page.getByTestId("transaction-row").first();
                await expect(farRow.locator('[data-testid="status-editable"]')).toContainText(
                    "Paid"
                );
            });
        });

        test("T021g: UR-011 changing the filters re-derives what the header acts on", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create rows that a filter can split", async () => {
                await createTestTransaction(page, { description: "Alpha One", amount: "-10.00" });
                await createTestTransaction(page, { description: "Alpha Two", amount: "-20.00" });
                await createTestTransaction(page, { description: "Beta One", amount: "-30.00" });
                await expect(page.getByText("3 transactions", { exact: true })).toBeVisible();
            });

            const toolbar = page.getByTestId("transaction-table-toolbar");

            await test.step("select all within a filter and confirm it covers only matches", async () => {
                await page.getByPlaceholder(/search transactions/i).fill("Alpha");
                await expect(toolbar).toContainText("2 transactions (filtered)");

                await toggleCheckbox(
                    page.getByRole("checkbox", { name: "Select all transactions" })
                );
                await expect(toolbar).toContainText("2 selected");
            });

            await test.step("clearing the filter re-derives the header against the wider set", async () => {
                await page.getByPlaceholder(/search transactions/i).fill("");
                await expect(toolbar).toContainText("3 transactions");

                // Two of three selected, so the header is mixed rather than fully checked. The
                // relaxed filter must not have swept the third row in — the user never selected it,
                // and a bulk delete that acquired it would destroy data they never pointed at.
                await expect(toolbar).toContainText("2 selected");
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await expect(headerCheckbox).toHaveAttribute("aria-checked", "mixed");

                const betaRow = page.getByRole("row", { name: /Beta One/ });
                await expect(betaRow).toHaveAttribute("aria-selected", "false");
            });
        });
    });

    // ============================================================================
    // US3: Bulk Edit Operations
    // ============================================================================

    test.describe("US3: Bulk Edit Operations", () => {
        test("T026: bulk edit tags applies to all selected transactions", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, { description: "Bulk Tag 1", amount: "-10.00" });
                await createTestTransaction(page, { description: "Bulk Tag 2", amount: "-20.00" });
                await createTestTransaction(page, { description: "Bulk Tag 3", amount: "-30.00" });
            });

            await test.step("first create a tag to apply", async () => {
                // Navigate to Tags page and create a tag
                await page.getByRole("link", { name: /tags/i }).click();
                await page.getByRole("button", { name: /add tag/i }).click();
                await page.getByPlaceholder(/tag name/i).fill("BulkTestTag");
                await page.getByRole("button", { name: /^add tag$/i }).click();
                await expect(page.getByText("BulkTestTag")).toBeVisible();

                // Navigate back to transactions
                await page.getByRole("link", { name: /transactions/i }).click();
                await expect(page.locator('[data-testid="transaction-row"]').first()).toBeVisible();
            });

            await test.step("select first two transactions", async () => {
                const firstRow = page.locator('[data-testid="transaction-row"]').first();
                const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);

                const firstCheckbox = firstRow.locator('[data-testid="row-checkbox"] button');
                const secondCheckbox = secondRow.locator('[data-testid="row-checkbox"] button');

                await toggleCheckbox(firstCheckbox);
                await toggleCheckbox(secondCheckbox);

                await expect(page.getByText(/2 selected/i).first()).toBeVisible();
            });

            await test.step("verify bulk edit toolbar appears", async () => {
                const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
                await expect(toolbar).toBeVisible();
            });

            await test.step("click bulk edit tags button and apply tag", async () => {
                await page.locator('[data-testid="bulk-edit-tags-button"]').click();

                // Select the tag from the dropdown (button element)
                const tagOption = page.getByRole("button", { name: "BulkTestTag" });
                await tagOption.click();
            });

            await test.step("verify tags applied to selected transactions", async () => {
                const firstRow = page.locator('[data-testid="transaction-row"]').first();
                const secondRow = page.locator('[data-testid="transaction-row"]').nth(1);
                const thirdRow = page.locator('[data-testid="transaction-row"]').nth(2);

                // First two should have the tag
                await expect(firstRow.getByText("BulkTestTag")).toBeVisible();
                await expect(secondRow.getByText("BulkTestTag")).toBeVisible();

                // Third should NOT have the tag (wasn't selected)
                await expect(thirdRow.getByText("BulkTestTag")).not.toBeVisible();
            });
        });

        test("T027: bulk edit notes applies to all selected transactions", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, { description: "Bulk Desc 1", amount: "-10.00" });
                await createTestTransaction(page, { description: "Bulk Desc 2", amount: "-20.00" });
            });

            await test.step("select both transactions", async () => {
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await toggleCheckbox(headerCheckbox);

                await expect(page.getByText(/2 selected/i).first()).toBeVisible();
            });

            await test.step("click bulk edit description button and enter new value", async () => {
                await page.locator('[data-testid="bulk-edit-notes-button"]').click();

                // Use more specific selector - the bulk edit description input
                const descInput = page.getByRole("textbox", { name: /enter notes/i });
                await descInput.fill("Bulk Updated Description");

                await page.getByRole("button", { name: /apply/i }).click();
            });

            await test.step("verify notes applied to all transactions", async () => {
                const rows = page.locator('[data-testid="transaction-row"]');
                const count = await rows.count();

                // Notes is in the expanded row - expand each row and check
                for (let i = 0; i < count; i++) {
                    const row = rows.nth(i);
                    const expandButton = row.locator('[data-testid="expand-notes-button"]');
                    await expandButton.click();

                    // The notes row appears for the expanded row
                    const notesInput = page.locator('[data-testid="notes-editable"]').nth(i);
                    await expect(notesInput).toHaveValue("Bulk Updated Description");
                }
            });
        });

        test("T028: bulk edit status applies to all selected transactions", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, {
                    description: "Bulk Status 1",
                    amount: "-10.00"
                });
                await createTestTransaction(page, {
                    description: "Bulk Status 2",
                    amount: "-20.00"
                });
            });

            await test.step("select all transactions", async () => {
                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await toggleCheckbox(headerCheckbox);

                await expect(page.getByText(/2 selected/i).first()).toBeVisible();
            });

            await test.step("click bulk edit status button and select Paid", async () => {
                await page.locator('[data-testid="bulk-edit-status-button"]').click();

                // Select "Paid" status (button element in dropdown)
                const paidOption = page.getByRole("button", { name: /^paid$/i });
                await paidOption.click();
            });

            await test.step("verify status applied to all transactions", async () => {
                const rows = page.locator('[data-testid="transaction-row"]');
                const count = await rows.count();

                for (let i = 0; i < count; i++) {
                    // Status is in a select element - check the value contains the status name
                    const statusSelect = rows.nth(i).locator('[data-testid="status-editable"]');
                    // The selected option should display "Paid"
                    await expect(statusSelect).toContainText("Paid");
                }
            });
        });

        test("T028a: bulk edit toolbar disappears when selection cleared", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create test transactions", async () => {
                await createTestTransaction(page, {
                    description: "Clear Test 1",
                    amount: "-10.00"
                });
                await createTestTransaction(page, {
                    description: "Clear Test 2",
                    amount: "-20.00"
                });

                await expect(page.getByText("2 transactions", { exact: true })).toBeVisible();
            });

            await test.step("select transactions and verify toolbar appears", async () => {
                const headerCheckbox = page.getByRole("checkbox", {
                    name: "Select all transactions"
                });
                await toggleCheckbox(headerCheckbox);

                const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
                await expect(toolbar).toBeVisible();
            });

            await test.step("clear selection with header checkbox", async () => {
                const headerCheckbox = page.getByRole("checkbox", {
                    name: "Deselect all transactions"
                });
                await toggleCheckbox(headerCheckbox);

                // Toolbar should disappear
                const toolbar = page.locator('[data-testid="bulk-edit-toolbar"]');
                await expect(toolbar).not.toBeVisible();
            });
        });

        test("T028b: Escape cancels bulk edit operation", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create and select transaction", async () => {
                await createTestTransaction(page, { description: "Escape Test", amount: "-10.00" });
                await createTestTransaction(page, {
                    description: "Escape Test 2",
                    amount: "-20.00"
                });

                const headerCheckbox = page.locator('[data-testid="header-checkbox"] button');
                await toggleCheckbox(headerCheckbox);
            });

            await test.step("open bulk description edit and cancel with Escape", async () => {
                await page.locator('[data-testid="bulk-edit-notes-button"]').click();

                // Use more specific selector - the bulk edit description input
                const descInput = page.getByRole("textbox", { name: /enter notes/i });
                await expect(descInput).toBeVisible();

                // Press Escape to cancel
                await page.keyboard.press("Escape");

                // Modal/input should close
                await expect(descInput).not.toBeVisible();
            });

            await test.step("verify no changes applied", async () => {
                // Transactions should keep original description names - verify both exist
                const escapeTestRow = page.locator('[data-testid="transaction-row"]').filter({
                    has: page.locator('[data-testid="description-editable"][value="Escape Test"]')
                });
                await expect(escapeTestRow).toBeVisible();

                const escapeTest2Row = page.locator('[data-testid="transaction-row"]').filter({
                    has: page.locator('[data-testid="description-editable"][value="Escape Test 2"]')
                });
                await expect(escapeTest2Row).toBeVisible();
            });
        });
    });

    // ========================================================================
    // Phase 7: Description/Notes Separation (User Story 5)
    // ========================================================================

    test.describe("US5: Description/Notes Separation", () => {
        test("T037: description column displays primary text, notes in expandable row", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transaction with description", async () => {
                await createTestTransaction(page, {
                    description: "Starbucks",
                    amount: "-5.00"
                });
            });

            await test.step("verify description displays in main row", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const descriptionInput = row.locator('[data-testid="description-editable"]');

                await expect(descriptionInput).toHaveValue("Starbucks");
            });

            await test.step("verify expand button exists", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');

                await expect(expandButton).toBeVisible();
            });

            await test.step("expand notes row", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');

                await expandButton.click();

                // Notes row should now be visible
                const notesRow = page.locator('[data-testid="notes-row"]');
                await expect(notesRow).toBeVisible();
            });

            await test.step("verify notes field is editable", async () => {
                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                await expect(notesInput).toBeVisible();
                await expect(notesInput).toHaveAttribute("placeholder", /add notes/i);
            });
        });

        test("T038: edit notes in expanded row", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transaction and expand", async () => {
                await createTestTransaction(page, {
                    description: "Amazon",
                    amount: "-99.00"
                });

                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');
                await expandButton.click();
            });

            await test.step("edit notes and save with Enter", async () => {
                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                await notesInput.click();
                await notesInput.fill("Monthly subscription payment");
                await notesInput.press("Enter");
            });

            await test.step("verify notes saved", async () => {
                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                // Textarea may have trailing newline, so check contains text
                await expect(notesInput).toHaveValue(/Monthly subscription payment/);
            });

            await test.step("collapse and re-expand to verify persistence", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');

                // Collapse
                await expandButton.click();
                await expect(page.locator('[data-testid="notes-row"]')).not.toBeVisible();

                // Re-expand
                await expandButton.click();
                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                // Textarea may have trailing newline, so check contains text
                await expect(notesInput).toHaveValue(/Monthly subscription payment/);
            });
        });

        test("T039: expand button icon reflects notes state", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transaction without notes", async () => {
                await createTestTransaction(page, {
                    description: "Icon Test Store",
                    amount: "-10.00"
                });
            });

            await test.step("verify expand button shows plus icon initially", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');

                // Button should be mostly hidden until hover (opacity-0 with group-hover:opacity-100)
                // But we can still click it
                await expect(expandButton).toBeAttached();
            });

            await test.step("add notes and verify icon changes", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');

                await expandButton.click();

                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                await notesInput.fill("Test memo");
                await notesInput.press("Enter");

                // Collapse
                await expandButton.click();

                // Expand button should now be visible (not hidden) because notes exists
                await expect(expandButton).toBeVisible();
            });
        });

        test("T040: search filters include both description and notes", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create transaction with description and add notes", async () => {
                await createTestTransaction(page, {
                    description: "UniqueStoreName",
                    amount: "-50.00"
                });

                // add notes
                const row = page.locator('[data-testid="transaction-row"]').first();
                const expandButton = row.locator('[data-testid="expand-notes-button"]');
                await expandButton.click();

                const notesRow = page.locator('[data-testid="notes-row"]');
                const notesInput = notesRow.locator('[data-testid="notes-editable"]');

                await notesInput.fill("UniqueNotesText");
                await notesInput.press("Enter");

                // Collapse
                await expandButton.click();
            });

            await test.step("search by description finds transaction", async () => {
                const searchInput = page.getByPlaceholder(/search/i).first();
                await searchInput.fill("UniqueStoreName");

                // Transaction should be visible
                await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
            });

            await test.step("search by notes finds transaction", async () => {
                const searchInput = page.getByPlaceholder(/search/i).first();
                await searchInput.clear();
                await searchInput.fill("UniqueNotesText");

                // Transaction should still be visible
                await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(1);
            });

            await test.step("search by non-matching term hides transaction", async () => {
                const searchInput = page.getByPlaceholder(/search/i).first();
                await searchInput.clear();
                await searchInput.fill("NonExistentSearchTerm12345");

                // Transaction should not be visible
                await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(0);
            });
        });

        test("UR-005: data cells rest without chrome in both themes yet keep every state", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);
            await createTestTransaction(page, {
                description: "Minimal Chrome Store",
                amount: "-12.34"
            });

            const row = page.locator('[data-testid="transaction-row"]').first();
            const accountCell = row.getByRole("combobox", { name: "Select account" });

            for (const theme of ["light", "dark"] as const) {
                await test.step(`${theme} theme rests with no fill on any data cell`, async () => {
                    await page.emulateMedia({ colorScheme: theme });
                    // The row keeps its own resting paint only while nothing is hovered or focused,
                    // so park the pointer and the caret clear of the grid before measuring.
                    await page.mouse.move(0, 0);
                    await page.locator("body").click({ position: { x: 2, y: 2 } });

                    // A cell that was just hovered or focused fades its fill out over
                    // `transition-colors`, so every resting reading polls to the settled paint
                    // rather than sampling a mid-transition frame.
                    const expectRestsClean = async (
                        cell: import("@playwright/test").Locator,
                        label: string
                    ) => {
                        await expect
                            .poll(
                                async () => {
                                    const paint = await readCellPaint(cell);
                                    return (
                                        (await paintsNothing(page, paint.backgroundColor)) &&
                                        (await paintsNothing(page, paint.borderColor))
                                    );
                                },
                                { message: `${label} resting fill in ${theme}` }
                            )
                            .toBe(true);
                    };

                    for (const testId of RESTING_CHROME_CELL_TEST_IDS) {
                        const cell = row.locator(`[data-testid="${testId}"]`);
                        await expectRestsClean(cell, testId);
                        expect(
                            (await readCellPaint(cell)).boxShadow,
                            `${testId} resting shadow in ${theme}`
                        ).not.toMatch(/rgba?\((?!0, 0, 0, 0\))/);
                        // Removing chrome must not cost legibility. The shared `Input` base carries
                        // `transition-[color,...]`, so straight after a theme switch the text is
                        // still animating from the outgoing theme's colour and reads as dark-on-dark
                        // for a few frames; poll to the settled value.
                        await expect
                            .poll(() => measuredTextContrast(cell), {
                                message: `${testId} text contrast in ${theme}`
                            })
                            .toBeGreaterThanOrEqual(4.5);
                    }

                    await expectRestsClean(accountCell, "account");

                    const percentageCell = row.getByRole("button", { name: "Edit Me allocation" });
                    await expect
                        .poll(
                            async () =>
                                paintsNothing(
                                    page,
                                    (await readCellPaint(percentageCell)).backgroundColor
                                ),
                            { message: `percentage resting background in ${theme}` }
                        )
                        .toBe(true);
                });

                await test.step(`${theme} theme keeps hover feedback`, async () => {
                    const description = row.locator('[data-testid="description-editable"]');
                    await description.hover();
                    await expect
                        .poll(
                            async () =>
                                paintsNothing(
                                    page,
                                    (await readCellPaint(description)).backgroundColor
                                ),
                            { message: `description hover fill in ${theme}` }
                        )
                        .toBe(false);
                    await page.mouse.move(0, 0);
                });

                await test.step(`${theme} theme keeps focus obvious on every cell`, async () => {
                    for (const testId of RESTING_CHROME_CELL_TEST_IDS) {
                        const cell = row.locator(`[data-testid="${testId}"]`);
                        const resting = await readCellPaint(cell);
                        await cell.focus();
                        await expect(cell).toBeFocused();
                        // Same `transition-colors` race as the selected row: poll until the focus
                        // treatment has actually landed rather than sampling the first frame.
                        await expect
                            .poll(
                                async () =>
                                    paintsNothing(
                                        page,
                                        (await readCellPaint(cell)).backgroundColor
                                    ),
                                { message: `${testId} focused fill in ${theme}` }
                            )
                            .toBe(false);
                        const focused = await readCellPaint(cell);
                        expect(
                            focused.backgroundColor !== resting.backgroundColor ||
                                focused.borderColor !== resting.borderColor ||
                                focused.boxShadow !== resting.boxShadow,
                            `${testId} focus indication in ${theme}`
                        ).toBe(true);
                        await expect
                            .poll(() => measuredTextContrast(cell), {
                                message: `${testId} focused text contrast in ${theme}`
                            })
                            .toBeGreaterThanOrEqual(4.5);
                        await cell.blur();
                    }
                });

                await test.step(`${theme} theme keeps the selected row filled`, async () => {
                    await row.getByRole("checkbox", { name: /^Select transaction/ }).click();
                    await expect(row).toHaveAttribute("aria-selected", "true");
                    // The row animates its fill through `transition-colors`, so the first frame
                    // after the attribute flips is still fully transparent. Poll the paint rather
                    // than sampling it once, or the assertion races the transition.
                    await expect
                        .poll(
                            async () =>
                                paintsNothing(page, (await readCellPaint(row)).backgroundColor),
                            { message: `selected row fill in ${theme}` }
                        )
                        .toBe(false);
                    await row.getByRole("checkbox", { name: /^Select transaction/ }).click();
                    await expect(row).toHaveAttribute("aria-selected", "false");
                });

                await test.step(`${theme} theme leaves the accessible cell contract intact`, async () => {
                    await expect(
                        row.getByRole("textbox", { name: "Pick a date", exact: true })
                    ).toBeVisible();
                    await expect(
                        row.getByRole("textbox", { name: "Transaction description", exact: true })
                    ).toBeVisible();
                    await expect(accountCell).toBeVisible();
                    await expect(
                        row.locator('[data-testid="amount-editable"]')
                    ).toHaveAccessibleName(/^Transaction amount in /);
                    await expect(row).toHaveAttribute("role", "row");
                });
            }

            await page.emulateMedia({ colorScheme: "light" });
        });
    });
});

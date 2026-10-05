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
    createTag,
    expectPresentRows,
    expectTransactionCellDisplay,
    goToAccounts,
    goToImportNew,
    goToPeople,
    goToTags,
    goToTransactions,
    goToTxDescriptions,
    openTransactionInspector,
    readRowPresenceEditing,
    reloadPage,
    shareActiveVaultWithMember,
    stableTransactionRow,
    transactionGridCell
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
    // Committing replaces the editor with the controller-owned display branch and may re-sort the
    // grid. Settle on that stable branch before resolving the amount cell against the new DOM.
    await expect(addedRow.getByTestId("description-display")).toHaveText(data.description);

    const amountCell = addedRow.locator('[role="gridcell"][data-cell="amount"]');
    await amountCell.dblclick();
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

/** The canonical display-first columns UR-005 requires to be chrome-free at rest. */
const RESTING_CHROME_COLUMNS = ["date", "description", "account", "tags", "status", "amount"];

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

/** True when every serialized shadow length is zero, including ring variables with no extent. */
function hasNoShadowExtent(boxShadow: string): boolean {
    if (boxShadow === "none") return true;
    const lengths = boxShadow.match(/-?\d+(?:\.\d+)?px/g);
    return lengths != null && lengths.every((length) => Number.parseFloat(length) === 0);
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
        const allocationDisplay = row.locator('[data-testid^="allocation-cell-"]').first();
        const allocationCell = allocationDisplay.locator('xpath=ancestor::*[@role="gridcell"][1]');
        const scrollContainer = page.getByTestId("transaction-table").locator("..");

        await expect(page.getByText("Grid Person 00 %", { exact: true })).toBeVisible();
        await expect(allocationDisplay).toContainText("—");
        await expect(allocationCell).toHaveAttribute("data-cell", /^allocation:/);
        expect(await scrollContainer.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
            await scrollContainer.evaluate((element) => element.clientWidth)
        );

        const startedAt = Date.now();
        await allocationCell.dblclick();
        const input = row.getByRole("textbox", {
            name: "Grid Person 00 allocation percentage"
        });
        await input.fill("-35.125");
        await input.press("Enter");
        await expect(allocationCell).toContainText("-35.125%");
        expect(Date.now() - startedAt).toBeLessThan(2_000);

        await page.getByRole("button", { name: "Undo" }).click();
        await expect(allocationCell).toContainText("—");
        await page.getByRole("button", { name: "Redo" }).click();
        await expect(allocationCell).toContainText("-35.125%");

        await reloadPage(page);
        const persistedRow = page.getByTestId("transaction-row").first();
        await expect(
            persistedRow.locator('[data-testid^="allocation-cell-"]').first()
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
        const createdTransactionIds = new Set<string>();
        const firstAddedRowId = await addEmptyTransaction(page, createdTransactionIds);
        expect(createdTransactionIds.has(firstAddedRowId)).toBe(false);
        createdTransactionIds.add(firstAddedRowId);
        const firstAddedRow = page.locator(`[data-transaction-id="${firstAddedRowId}"]`);

        await expect(addButton).toBeEnabled();
        await expect(page.getByTestId("transaction-row")).toHaveCount(1);
        await expect(page.getByTestId("new-transaction-description")).toHaveCount(0);
        await expect(page.getByTestId("add-transaction-submit")).toHaveCount(0);
        await expect(page.getByTestId("add-transaction-cancel")).toHaveCount(0);

        // Add identifies the new row by putting the caret in its one mounted editor. Every other
        // value is already projected through the controller-owned display branch.
        const firstDescriptionEditor = firstAddedRow.getByTestId("description-editable");
        await expect(firstDescriptionEditor).toBeFocused();
        await expect(
            firstAddedRow.getByRole("checkbox", { name: "Select transaction" })
        ).not.toBeChecked();
        await expect(firstDescriptionEditor).toHaveValue("");
        await expect(firstDescriptionEditor).toHaveAttribute("placeholder", "No description");
        await expect(firstAddedRow.getByTestId("date-display")).not.toHaveText("");
        await expect(firstAddedRow.locator('[data-cell="account"]')).toContainText("Default");
        await expect(firstAddedRow.locator('[data-cell="status"]')).toContainText("For Review");
        await expect(firstAddedRow.locator('[data-cell="amount"]')).toContainText("0.00");
        await expect(firstAddedRow.getByTestId("date-editable")).toHaveCount(0);
        await expect(firstAddedRow.getByTestId("status-editable")).toHaveCount(0);
        await expect(firstAddedRow.getByTestId("amount-editable")).toHaveCount(0);

        for (let index = 0; index < 2; index += 1) {
            const addedRowId = await addEmptyTransaction(page, createdTransactionIds);
            expect(createdTransactionIds.has(addedRowId)).toBe(false);
            createdTransactionIds.add(addedRowId);
        }
        const rows = page.getByTestId("transaction-row");
        await expect(rows).toHaveCount(3);
        await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
        await expect(page.getByTestId("description-editable")).toHaveCount(1);

        const firstDescriptionCell = rows.nth(0).locator('[data-cell="description"]');
        const secondDescriptionCell = rows.nth(1).locator('[data-cell="description"]');
        const thirdDescriptionCell = rows.nth(2).locator('[data-cell="description"]');
        await firstDescriptionCell.focus();
        await firstDescriptionCell.press("ArrowDown");
        await expect(secondDescriptionCell).toBeFocused();
        await secondDescriptionCell.press("Shift+Tab");
        await expect(rows.nth(1).locator('[data-cell="date"]')).toBeFocused();
        await rows.nth(1).locator('[data-cell="date"]').press("Tab");
        await expect(secondDescriptionCell).toBeFocused();

        const committedRowId = await rows.nth(1).getAttribute("data-transaction-id");
        if (committedRowId == null) throw new Error("ordinary row has no stable identity");
        await secondDescriptionCell.dblclick();
        const committedEditor = rows.nth(1).getByTestId("description-editable");
        await committedEditor.fill("Ordinary empty row");
        await committedEditor.press("Enter");
        const committedRow = page.locator(`[data-transaction-id="${committedRowId}"]`);
        await expect(committedRow.getByTestId("description-display")).toHaveText(
            "Ordinary empty row"
        );
        await expect(committedRow.getByTestId("description-editable")).toHaveCount(0);

        await thirdDescriptionCell.dblclick();
        const cancelledEditor = rows.nth(2).getByTestId("description-editable");
        await cancelledEditor.fill("Discarded draft");
        await cancelledEditor.press("Escape");
        await expect(rows.nth(2).getByTestId("description-display")).toHaveText("");
        await expect(rows.nth(2).getByTestId("description-editable")).toHaveCount(0);

        await reloadPage(page);
        await expect(page.getByTestId("transaction-row")).toHaveCount(3);
        await expect(committedRow.getByTestId("description-display")).toHaveText(
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
            const firstRow = page.locator(`[data-transaction-id="${existingIds[0]}"]`);
            const firstDescriptionCell = firstRow.locator('[data-cell="description"]');
            await firstDescriptionCell.dblclick();
            const firstDescriptionEditor = firstRow.getByTestId("description-editable");
            await firstDescriptionEditor.fill("Typed somewhere else");
            // Committing re-renders the whole grid. A focus intent that had not been consumed
            // would yank the caret back into the created row mid-edit.
            await firstDescriptionEditor.press("Enter");

            await expect(firstRow.getByTestId("description-display")).toHaveText(
                "Typed somewhere else"
            );
            await expect(firstRow.getByTestId("description-editable")).toHaveCount(0);
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

            // First prove this session can publish observable editing Presence. Without this positive
            // predecessor, the later empty set could pass because Presence never connected at all.
            const predecessorId = await addEmptyTransaction(owner);
            await expect(member.getByTestId("transaction-row")).toHaveCount(1, { timeout: 30_000 });
            const predecessorRow = owner.locator(`[data-transaction-id="${predecessorId}"]`);
            const predecessorEditor = predecessorRow.getByTestId("description-editable");
            await expect(predecessorEditor).toBeFocused();
            await predecessorEditor.click();
            await expectPresentRows(member, [predecessorId]);
            await expect
                .poll(() => readRowPresenceEditing(member, predecessorId), { timeout: 20_000 })
                .toBe(true);

            const createdId = await addEmptyTransaction(owner, new Set([predecessorId]));
            await expect(member.getByTestId("transaction-row")).toHaveCount(2, { timeout: 30_000 });
            const ownerRow = owner.locator(`[data-transaction-id="${createdId}"]`);
            const ownerEditor = ownerRow.getByTestId("description-editable");
            await expect(ownerEditor).toBeFocused();

            // Add moved from an observably present row to this programmatically focused editor, so
            // the peer must see a real transition to no present rows rather than an initially empty set.
            await expectPresentRows(member, []);
            expect(await readRowPresenceEditing(member, predecessorId)).toBe(false);
            expect(await readRowPresenceEditing(member, createdId)).toBe(false);

            // Pointer capture inside the already-focused exact editor releases only this Add gate.
            await ownerEditor.click();
            await expect(ownerEditor).toBeFocused();
            await expectPresentRows(member, [createdId]);
            await expect
                .poll(() => readRowPresenceEditing(member, createdId), { timeout: 20_000 })
                .toBe(true);
            const memberRow = member.locator(`[data-transaction-id="${createdId}"]`);
            expect(await memberRow.evaluate((node) => node.getBoundingClientRect().height)).toBe(
                57
            );
            const presenceCell = memberRow.locator(
                '[role="gridcell"][data-cell="description"][data-presence="true"]'
            );
            await expect(presenceCell).toHaveCount(1);
            expect(await presenceCell.evaluate((node) => getComputedStyle(node).outlineWidth)).toBe(
                "2px"
            );
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

        const createdTransactionIds = new Set<string>();
        const addThroughExcludingFilter = async (
            label: string,
            expectedCount: number,
            activate: () => Promise<void>
        ) => {
            return test.step(`${label} filter is cleared when Add reveals its row`, async () => {
                await activate();
                await expect(page.getByTestId("transaction-row")).toHaveCount(0);
                await expect(page.getByRole("button", { name: /^Clear all/ })).toBeVisible();

                const transactionId = await addEmptyTransaction(page, createdTransactionIds);
                expect(createdTransactionIds.has(transactionId)).toBe(false);
                createdTransactionIds.add(transactionId);
                const addedRow = page.locator(`[data-transaction-id="${transactionId}"]`);

                await expect(page.getByRole("button", { name: /^Clear all/ })).toHaveCount(0);
                await expect(page.getByTestId("transaction-row")).toHaveCount(expectedCount);

                const toolbar = page.getByTestId("transaction-table-toolbar");
                await expect(toolbar).toContainText(
                    `${expectedCount} transaction${expectedCount === 1 ? "" : "s"}`
                );
                // Revealing a row is discoverability, not a bulk-operation target: nothing selects.
                await expect(toolbar).not.toContainText("selected");
                await expect(toolbar).not.toContainText("(filtered)");
                await expect(page.getByTestId("search-filter")).toHaveValue("");
                await expect(page.getByRole("row", { selected: true })).toHaveCount(0);

                const focusedDescriptionRow = newlyAddedRow(page);
                await expect(focusedDescriptionRow).toHaveCount(1);
                await expect(focusedDescriptionRow).toHaveAttribute(
                    "data-transaction-id",
                    transactionId
                );
                await expect(addedRow.getByTestId("description-editable")).toBeFocused();
                await expect(addedRow.getByTestId("description-editable")).toHaveValue("");
                const addedAccount = addedRow.locator('[data-cell="account"]');
                await expect(addedAccount).not.toHaveText("");
                await expect(addedRow.locator('[data-cell="status"]')).toContainText("For Review");
                await expect(
                    addedRow.getByRole("combobox", { name: "Select account" })
                ).toHaveCount(0);
                await expect(addedRow.getByTestId("status-editable")).toHaveCount(0);

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

        await reloadPage(page);
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
            await expect(exactRow.getByTestId("date-display")).not.toHaveText("");
            await expect(exactRow.locator('[data-cell="account"]')).toContainText("Default");
            await expect(exactRow.locator('[data-cell="status"]')).toContainText("For Review");
            await expect(exactRow.locator('[data-cell="amount"]')).toContainText("0.00");
            await expect(exactRow.getByTestId("date-editable")).toHaveCount(0);
            await expect(exactRow.getByRole("combobox", { name: "Select account" })).toHaveCount(0);
            await expect(exactRow.getByTestId("status-editable")).toHaveCount(0);
            await expect(exactRow.getByTestId("amount-editable")).toHaveCount(0);
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

            await reloadPage(page);
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
            await expect(exactRow.getByTestId("description-display")).toHaveText("");
            await expect(exactRow.getByTestId("description-editable")).toHaveCount(0);
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

            await reloadPage(page);
            await expect(page.getByTestId("transaction-row")).toHaveCount(3);
            await expect(page.getByRole("row", { selected: true })).toHaveCount(0);
        } finally {
            await context.setOffline(false);
            await duplicate.close();
        }
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
            const firstDescriptionCell = firstWrapper.locator('[data-cell="description"]');
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

            await firstDescriptionCell.dblclick();
            const firstDescriptionEditor = firstWrapper.getByTestId("description-editable");
            await expect(firstDescriptionEditor).toBeFocused();
            expect(await page.getByRole("listbox", { name: "Description aliases" }).count()).toBe(
                0
            );
            const filterStartedAt = Date.now();
            await firstDescriptionEditor.fill("Scale Alias 0099");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(1);
            await expect(page.getByRole("option", { name: "Scale Alias 0099" })).toHaveAttribute(
                "aria-selected",
                "false"
            );
            expect(Date.now() - filterStartedAt).toBeLessThan(2_000);
            await firstDescriptionEditor.press("Escape");
            await expect(page.getByRole("listbox", { name: "Description aliases" })).toHaveCount(0);
            await expect(firstDescriptionCell).toBeFocused();
            await expect(firstDescriptionCell).toHaveAttribute("data-cell-content", "display");
            await expect(firstWrapper.getByTestId("description-editable")).toHaveCount(0);

            await firstDescriptionCell.dblclick();
            const pinnedDescriptionEditor = firstWrapper.getByTestId("description-editable");
            await pinnedDescriptionEditor.evaluate((input: HTMLInputElement) =>
                input.setSelectionRange(4, 4)
            );
            await scrollContainer.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect(page.locator('[data-index="499"]')).toBeVisible();
            await expect(firstWrapper).toHaveCount(1);
            await expect(pinnedDescriptionEditor).toBeFocused();
            await expect
                .poll(() =>
                    pinnedDescriptionEditor.evaluate(
                        (input: HTMLInputElement) => input.selectionStart
                    )
                )
                .toBe(4);
            expect(await page.getByTestId("transaction-row").count()).toBeLessThan(40);

            await expect(pinnedDescriptionEditor).toBeFocused();
        });

        await test.step("resize and edit the focused overscan-edge row without losing focus", async () => {
            const edgeWrapper = page.locator('[data-index="499"]');
            const edgeDescriptionCell = edgeWrapper.locator('[data-cell="description"]');
            await edgeDescriptionCell.dblclick();
            const edgeDescriptionEditor = edgeWrapper.getByTestId("description-editable");

            await expect(edgeDescriptionEditor).toBeFocused();
            await page.setViewportSize({ width: 1_000, height: 700 });
            await expect(edgeDescriptionEditor).toBeFocused();

            await edgeDescriptionEditor.fill("Virtualized Edge Edited");
            await edgeDescriptionEditor.press("Enter");
            await expect(edgeWrapper.getByTestId("description-display")).toHaveText(
                "Virtualized Edge Edited"
            );
            await expect(edgeWrapper.getByTestId("description-editable")).toHaveCount(0);
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

            await reloadPage(page);
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

    test("filters and creates an account from the transaction selector", async ({ page }) => {
        test.setTimeout(60_000);
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

        await test.step("filter accounts while retaining the create option", async () => {
            const row = page.getByTestId("transaction-row").first();
            await row.locator('[data-cell="account"]').dblclick();
            const accountButton = row.getByRole("combobox", { name: /select account/i });
            await expect(accountButton).toHaveAttribute("aria-expanded", "true");

            const createOption = page.getByRole("option", { name: /create new account/i });
            await expect(createOption).toBeVisible();

            const searchInput = page.getByPlaceholder(/search accounts/i);
            await searchInput.fill("xyz-nonexistent-account-name");
            await expect(createOption).toBeVisible();
            await searchInput.clear();
            await createOption.click();
        });

        await test.step("nested Select Escape retains the modal while modal Escape cancels the editor", async () => {
            const row = page.getByTestId("transaction-row").first();
            const accountCell = row.locator('[data-cell="account"]');
            const accountEditor = row.getByRole("combobox", { name: /select account/i });
            const dialog = page.getByRole("dialog", { name: "Create Account" });
            const name = page.getByLabel(/^name$/i);
            await expect(dialog).toBeVisible();
            await expect(name).toBeFocused();
            await expect(accountCell).toHaveAttribute("data-cell-content", "editor");

            for (const label of ["Type", "Currency"]) {
                await page.getByRole("combobox", { name: label }).click();
                await expect(page.getByRole("listbox")).toBeVisible();
                await page.keyboard.press("Escape");
                await expect(page.getByRole("listbox")).toHaveCount(0);
                await expect(dialog).toBeVisible();
                await expect(accountCell).toHaveAttribute("data-cell-content", "editor");
            }

            await name.fill("Discarded by Escape");
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await expect(accountCell).toHaveAttribute("data-cell-content", "display");
            await expect(accountCell).toBeFocused();
            await expect(accountEditor).toHaveCount(0);

            await accountCell.dblclick();
            await page.getByRole("option", { name: /create new account/i }).click();
            await expect(dialog).toBeVisible();
            await expect(name).toBeFocused();
            await expect(name).toHaveValue("");
            await name.fill("Discarded by overlay");
            await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 5, y: 5 } });
            await expect(dialog).toHaveCount(0);
            await expect(accountCell).toHaveAttribute("data-cell-content", "editor");
            await expect(accountEditor).toBeFocused();
        });

        await test.step("repeated handoff creates and explicitly commits the account", async () => {
            const row = page.getByTestId("transaction-row").first();
            await row.getByRole("combobox", { name: /select account/i }).click();
            await page.getByRole("option", { name: /create new account/i }).click();
            const dialog = page.getByRole("dialog", { name: "Create Account" });
            const name = page.getByLabel(/^name$/i);
            await expect(dialog).toBeVisible();
            await expect(name).toBeFocused();
            await expect(name).toHaveValue("");
            await name.fill("My Checking");
            await page.getByRole("button", { name: /^create account$/i }).click();
            await expect(dialog).toHaveCount(0);
        });

        await test.step("new account is selected in the account display", async () => {
            const row = page.getByTestId("transaction-row").first();
            const accountCell = row.locator('[data-cell="account"]');
            await expect(accountCell).toHaveAttribute("data-cell-content", "display");
            await expect(accountCell).toContainText("My Checking");
            await expect(row.getByRole("combobox", { name: /select account/i })).toHaveCount(0);
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

            const row = page.locator('[data-testid="transaction-row"]').first();
            const descriptionCell = row.locator('[role="gridcell"][data-cell="description"]');
            const restingTextInset =
                await test.step("resting text uses the compact cell inset", async () => {
                    const geometry = await descriptionCell.evaluate((cell) => {
                        const display = cell.querySelector('[data-testid="description-display"]');
                        if (!(cell instanceof HTMLElement) || !(display instanceof HTMLElement)) {
                            return null;
                        }
                        const cellRect = cell.getBoundingClientRect();
                        const displayRect = display.getBoundingClientRect();
                        const styles = getComputedStyle(cell);
                        return {
                            paddingLeft: Number.parseFloat(styles.paddingLeft),
                            paddingRight: Number.parseFloat(styles.paddingRight),
                            textInset: displayRect.left - cellRect.left
                        };
                    });
                    if (geometry == null)
                        throw new Error("description resting geometry is unavailable");
                    expect(geometry.paddingLeft).toBe(8);
                    expect(geometry.paddingRight).toBe(8);
                    expect(Math.abs(geometry.textInset - geometry.paddingLeft)).toBeLessThanOrEqual(
                        0.5
                    );
                    return geometry.textInset;
                });

            await test.step("full edit selects the value without moving its text edge", async () => {
                await descriptionCell.dblclick();
                const descriptionInput = row.getByTestId("description-editable");
                await expect(descriptionInput).toBeFocused();
                await expect
                    .poll(() =>
                        descriptionInput.evaluate((input: HTMLInputElement) => ({
                            end: input.selectionEnd,
                            start: input.selectionStart,
                            valueLength: input.value.length
                        }))
                    )
                    .toEqual({ end: 16, start: 0, valueLength: 16 });

                const editingGeometry = await descriptionInput.evaluate((input) => {
                    const cell = input.closest('[role="gridcell"]');
                    if (!(cell instanceof HTMLElement)) return null;
                    const cellRect = cell.getBoundingClientRect();
                    const inputRect = input.getBoundingClientRect();
                    const styles = getComputedStyle(input);
                    const paddingLeft = Number.parseFloat(styles.paddingLeft);
                    return {
                        paddingLeft,
                        paddingRight: Number.parseFloat(styles.paddingRight),
                        textInset: inputRect.left + paddingLeft - input.scrollLeft - cellRect.left
                    };
                });
                if (editingGeometry == null)
                    throw new Error("description editor geometry is unavailable");
                expect(editingGeometry.paddingLeft).toBe(0);
                expect(editingGeometry.paddingRight).toBe(0);
                expect(Math.abs(editingGeometry.textInset - restingTextInset)).toBeLessThanOrEqual(
                    0.5
                );
            });

            await test.step("type new value and press Enter to save", async () => {
                const descriptionInput = row.getByTestId("description-editable");
                await descriptionInput.clear();
                await descriptionInput.fill("Updated Description Name");
                await descriptionInput.press("Enter");

                await expect(row.getByTestId("description-display")).toHaveText(
                    "Updated Description Name"
                );
            });

            await test.step("edit again and press Escape to revert", async () => {
                await descriptionCell.dblclick();
                const descriptionInput = row.getByTestId("description-editable");
                await descriptionInput.fill("This should be reverted");
                await descriptionInput.press("Escape");

                await expect(descriptionCell).toContainText("Updated Description Name");
            });

            await test.step("printable quick edit leaves its caret at the text end", async () => {
                const updatedTextLeft = await row
                    .getByTestId("description-display")
                    .evaluate((display) => display.getBoundingClientRect().left);
                await descriptionCell.focus();
                await descriptionCell.press("q");
                const descriptionInput = row.getByTestId("description-editable");
                await expect(descriptionInput).toBeFocused();
                await expect(descriptionInput).toHaveValue("q");
                await expect
                    .poll(() =>
                        descriptionInput.evaluate((input: HTMLInputElement) => ({
                            end: input.selectionEnd,
                            start: input.selectionStart
                        }))
                    )
                    .toEqual({ end: 1, start: 1 });
                const quickTextLeft = await descriptionInput.evaluate((input) => {
                    const rect = input.getBoundingClientRect();
                    const paddingLeft = Number.parseFloat(getComputedStyle(input).paddingLeft);
                    return rect.left + paddingLeft - input.scrollLeft;
                });
                expect(Math.abs(quickTextLeft - updatedTextLeft)).toBeLessThanOrEqual(0.5);
                await descriptionInput.press("Escape");
                await expect(descriptionCell).toContainText("Updated Description Name");
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

            await test.step("full edit commits before Tab moves to Account", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const descriptionCell = row.locator('[role="gridcell"][data-cell="description"]');
                await descriptionCell.dblclick();
                const descriptionInput = row.getByTestId("description-editable");
                await descriptionInput.fill("Tab Saved Value");
                await descriptionInput.press("Tab");

                await expect(descriptionCell).toContainText("Tab Saved Value");
                const accountCell = row.locator('[role="gridcell"][data-cell="account"]');
                await expect(accountCell).toHaveAttribute("data-cell-content", "editor");
                await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
                await page.keyboard.press("Escape");
                await expect(page.getByRole("option", { name: "Default" })).toHaveCount(0);
                await expect(accountCell).toHaveAttribute("data-cell-content", "display");
                await expect(accountCell).toBeFocused();
                await expect(
                    row.getByRole("combobox", { name: "Select account", exact: true })
                ).toHaveCount(0);
            });
        });

        test("T014: date display projects the localized transaction date", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, {
                    description: "Date Format Test",
                    amount: "-50.00"
                });
            });

            await test.step("verify the resting display owns the localized date", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const dateCell = row.locator('[data-cell="date"]');
                await expect(dateCell).toHaveAttribute("data-cell-content", "display");
                const dateText = await row.getByTestId("date-display").textContent();
                expect(dateText).toMatch(/^\d{1,2}[./-]\d{1,2}\.?$/);
                await expect(row.getByTestId("date-editable")).toHaveCount(0);
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

            await test.step("open the date editor and calendar popover", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                await row.locator('[role="gridcell"][data-cell="date"]').dblclick();
                await row.getByRole("button", { name: "Open calendar" }).click();
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();
            });

            await test.step("select a date from calendar to save", async () => {
                // Find and click on day 15 in the calendar
                const calendar = page.getByRole("grid", { name: /\w+ \d{4}/ });
                await calendar.getByRole("gridcell", { name: "15" }).click();

                // Calendar should close after selection
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();

                await expect(
                    page
                        .locator('[data-testid="transaction-row"]')
                        .first()
                        .getByTestId("date-display")
                ).toContainText("15");
            });

            await test.step("open the calendar and cancel the complete Date edit with Escape", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const dateCell = row.locator('[role="gridcell"][data-cell="date"]');
                const currentDateText = await row.getByTestId("date-display").innerText();
                await dateCell.dblclick();
                const calendarButton = row.getByRole("button", { name: "Open calendar" });
                await calendarButton.click();
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).toBeVisible();

                await page.keyboard.press("Escape");
                await expect(page.getByRole("grid", { name: /\w+ \d{4}/ })).not.toBeVisible();
                await expect(dateCell).toHaveAttribute("data-cell-content", "display");
                await expect(dateCell).toBeFocused();
                await expect(row.getByTestId("date-editable")).toHaveCount(0);
                await expect(row.getByTestId("date-display")).toHaveText(currentDateText);
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

            await test.step("double click the amount cell to focus its editor", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                await row.locator('[role="gridcell"][data-cell="amount"]').dblclick();
                const amountInput = row.getByTestId("amount-editable");
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

                await expect(
                    page
                        .locator('[data-testid="transaction-row"]')
                        .first()
                        .locator('[role="gridcell"][data-cell="amount"]')
                ).toContainText("-250.50");
            });

            await test.step("edit again and press Escape to cancel", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const amountCell = row.locator('[role="gridcell"][data-cell="amount"]');
                await amountCell.dblclick();
                const amountInput = row.getByTestId("amount-editable");
                await amountInput.fill("-999.99");
                await amountInput.press("Escape");

                await expect(amountCell).toContainText("-250.50");
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

            await test.step("double click the status cell to open its editor", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                await row.locator('[role="gridcell"][data-cell="status"]').dblclick();
                await expect(row.getByTestId("status-editable")).toHaveAttribute(
                    "aria-expanded",
                    "true"
                );
            });

            await test.step("select different status (saves immediately)", async () => {
                // Select "Paid" status (default status created on vault init)
                // Radix Select uses role="option" for items in the dropdown
                await page.getByRole("option", { name: "Paid" }).click();

                const statusCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[role="gridcell"][data-cell="status"]');
                await expect(statusCell).toContainText("Paid");
            });

            await test.step("change status and verify it persists", async () => {
                const statusCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[role="gridcell"][data-cell="status"]');
                await statusCell.dblclick();
                await page.getByRole("option", { name: "For Review" }).click();
                await expect(statusCell).toContainText("For Review");
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

                await transactionRow.locator('[data-cell="account"]').dblclick();
                const accountTrigger = transactionRow.getByRole("combobox", {
                    name: "Select account"
                });
                await expect(accountTrigger).toBeVisible();
                await expect(accountTrigger).toHaveAttribute("aria-expanded", "true");

                // Dropdown should be visible with account options
                await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
                await expect(page.getByRole("option", { name: "Savings" })).toBeVisible();
            });

            await test.step("resolve the Account draft and commit it explicitly", async () => {
                const transactionRow = page.locator('[data-testid="transaction-row"]').first();
                const accountCell = transactionRow.locator('[data-cell="account"]');
                const accountTrigger = transactionRow.getByRole("combobox", {
                    name: "Select account"
                });
                await page.getByRole("option", { name: "Savings" }).click();

                await expect(accountCell).toHaveAttribute("data-cell-content", "editor");
                await expect(accountTrigger).toContainText("Savings");
                await expect(accountTrigger).toBeFocused();
                await accountTrigger.press("Enter");

                await expect(accountCell).toHaveAttribute("data-cell-content", "display");
                await expect(accountCell).toContainText("Savings");
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

            await test.step("double click the tags cell to open its editor", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                await row.locator('[role="gridcell"][data-cell="tags"]').dblclick();

                // Wait for the dropdown to appear with search input (portaled to body)
                const searchInput = page.getByPlaceholder("Search tags...");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });
            });

            await test.step("select a tag and commit it when leaving the editor", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const tagsCell = row.locator('[data-cell="tags"]');
                await page.getByRole("option", { name: "Groceries" }).click();
                await expect(row.getByTestId("tags-editable")).toContainText("Groceries");

                await row
                    .locator('[role="gridcell"][data-cell="description"]')
                    .click({ position: { x: 2, y: 2 } });

                await expect(tagsCell).toHaveAttribute("data-cell-content", "display");
                await expect(tagsCell).toContainText("Groceries");
            });
        });

        test("T033: inline tags offer creation only for a new exact name", async ({ page }) => {
            test.setTimeout(60_000);
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

                await tagsCell.dblclick();

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

            await test.step("commit the staged tag and assignment together", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const tagsCell = row.locator('[data-cell="tags"]');
                await expect(row.getByTestId("tags-editable")).toContainText("NewInlineTag");

                await row
                    .locator('[role="gridcell"][data-cell="description"]')
                    .click({ position: { x: 2, y: 2 } });

                await expect(tagsCell).toHaveAttribute("data-cell-content", "display");
                await expect(tagsCell).toContainText("NewInlineTag");
            });

            await test.step("hide creation when the exact tag already exists", async () => {
                const tagsCell = page
                    .locator('[data-testid="transaction-row"]')
                    .first()
                    .locator('[data-cell="tags"]');
                await tagsCell.dblclick();

                const searchInput = page.getByPlaceholder("Search tags...");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });
                await searchInput.fill("NewInlineTag");

                await expect(page.getByTestId("create-tag-button")).not.toBeVisible();
                await expect(page.getByRole("option", { name: "NewInlineTag" })).toBeVisible();
                await searchInput.press("Escape");
                await expect(tagsCell).toHaveAttribute("data-cell-content", "display");
                await expect(tagsCell).toBeFocused();
            });

            await test.step("verify tag exists in tags page", async () => {
                await goToTags(page);
                await expect(page.getByText("NewInlineTag", { exact: true })).toBeVisible();
            });
        });
    });

    // ========================================================================
    // Keyboard Grid Navigation
    // ========================================================================

    test.describe("Keyboard Grid Navigation", () => {
        test("arrow navigation resumes from the retained parked cell", async ({ page }) => {
            test.setTimeout(60_000);
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

            const descriptionCell = (description: RegExp) =>
                page.getByRole("row", { name: description }).locator('[data-cell="description"]');
            const afterGrid = page.getByRole("button", { name: "After transactions" });
            const parkDescription = async (description: RegExp) => {
                const cell = descriptionCell(description);
                await cell.dblclick();
                const editor = cell.getByTestId("description-editable");
                await expect(editor).toBeFocused();
                await editor.press("Escape");
                await expect(cell).toBeFocused();
                await expect(cell).toHaveAttribute("aria-selected", "true");
                await cell.press("Escape");
                await expect(afterGrid).toBeFocused();
                await expect(
                    page
                        .getByTestId("transaction-table")
                        .locator('[role="gridcell"][aria-selected="true"]')
                ).toHaveCount(0);
            };

            await test.step("focus first row description and press arrow down", async () => {
                const firstRowDescription = descriptionCell(/Row 3 Store/);
                await firstRowDescription.focus();
                await expect(firstRowDescription).toBeFocused();

                await firstRowDescription.press("ArrowDown");
                await expect(descriptionCell(/Row 2 Store/)).toBeFocused();
            });

            await test.step("press arrow down again to move to third row", async () => {
                await page.keyboard.press("ArrowDown");
                await expect(descriptionCell(/Row 1 Store/)).toBeFocused();
            });

            await test.step("press arrow up to move back to second row", async () => {
                await page.keyboard.press("ArrowUp");
                await expect(descriptionCell(/Row 2 Store/)).toBeFocused();
            });

            await test.step("double Escape parks and vertical Arrows move from the retained row", async () => {
                await parkDescription(/Row 2 Store/);
                await afterGrid.press("ArrowDown");
                await expect(descriptionCell(/Row 1 Store/)).toBeFocused();
                await expect(descriptionCell(/Row 1 Store/)).toHaveAttribute(
                    "aria-selected",
                    "true"
                );

                await parkDescription(/Row 2 Store/);
                await afterGrid.press("ArrowUp");
                await expect(descriptionCell(/Row 3 Store/)).toBeFocused();
                await expect(descriptionCell(/Row 3 Store/)).toHaveAttribute(
                    "aria-selected",
                    "true"
                );
            });

            await test.step("double Escape parks and horizontal Arrows move from the retained column", async () => {
                const middleRow = page.getByRole("row", { name: /Row 2 Store/ });
                await parkDescription(/Row 2 Store/);
                await afterGrid.press("ArrowLeft");
                await expect(middleRow.locator('[data-cell="date"]')).toBeFocused();

                await parkDescription(/Row 2 Store/);
                await afterGrid.press("ArrowRight");
                await expect(middleRow.locator('[data-cell="account"]')).toBeFocused();
            });

            await test.step("parked vertical Arrows preserve selection at grid boundaries", async () => {
                await parkDescription(/Row 3 Store/);
                await afterGrid.press("ArrowUp");
                await expect(descriptionCell(/Row 3 Store/)).toBeFocused();
                await expect(descriptionCell(/Row 3 Store/)).toHaveAttribute(
                    "aria-selected",
                    "true"
                );

                await parkDescription(/Row 1 Store/);
                await afterGrid.press("ArrowDown");
                await expect(descriptionCell(/Row 1 Store/)).toBeFocused();
                await expect(descriptionCell(/Row 1 Store/)).toHaveAttribute(
                    "aria-selected",
                    "true"
                );
            });
        });

        test("arrow left/right moves focus between cells in same row", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a test transaction", async () => {
                await createTestTransaction(page, { description: "Nav Test", amount: "-50.00" });
            });

            const row = page.locator('[data-testid="transaction-row"]').first();
            const cell = (column: string) =>
                row.locator(`[role="gridcell"][data-cell="${column}"]`);
            const allocationCell = row
                .locator('[role="gridcell"][data-cell^="allocation:"]')
                .first();

            await test.step("focus description cell and navigate right to account", async () => {
                const descriptionCell = cell("description");
                await descriptionCell.focus();
                await expect(descriptionCell).toBeFocused();
                await descriptionCell.press("ArrowRight");
                await expect(cell("account")).toBeFocused();
            });

            await test.step("navigate right through remaining cells", async () => {
                await page.keyboard.press("ArrowRight");
                await expect(cell("tags")).toBeFocused();

                await page.keyboard.press("ArrowRight");
                await expect(cell("status")).toBeFocused();

                await page.keyboard.press("ArrowRight");
                await expect(allocationCell).toBeFocused();

                await page.keyboard.press("ArrowRight");
                await expect(cell("amount")).toBeFocused();
            });

            await test.step("navigate left back through cells", async () => {
                await page.keyboard.press("ArrowLeft");
                await expect(allocationCell).toBeFocused();

                await page.keyboard.press("ArrowLeft");
                await expect(cell("status")).toBeFocused();

                await page.keyboard.press("ArrowLeft");
                await expect(cell("tags")).toBeFocused();
            });
        });

        test("text input keeps interior arrows and exits to its canonical cell", async ({
            page
        }) => {
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
                const row = page.getByRole("row", { name: /Other Row/ });
                await row.locator('[data-cell="description"]').dblclick();
                const descriptionInput = row.getByTestId("description-editable");
                await expect(descriptionInput).toBeFocused();
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

            await test.step("arrow down commits and continues full editing in the next row", async () => {
                await page.keyboard.press("ArrowDown");

                const sourceRow = page.getByRole("row", { name: /Other Row/ });
                await expect(sourceRow.getByTestId("description-editable")).toHaveCount(0);
                await expect(sourceRow.getByTestId("description-display")).toHaveText("Other Row");

                const destinationRow = page.getByRole("row", { name: /Boundary Test/ });
                const destinationEditor = destinationRow.getByTestId("description-editable");
                await expect(destinationEditor).toBeFocused();
                await destinationEditor.press("Escape");
                await expectTransactionCellDisplay(destinationRow, "description", "Boundary Test");
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
                const firstRow = page.getByRole("row", { name: /Status Nav 2/ });
                const firstStatus = firstRow.locator('[data-cell="status"]');

                await firstStatus.focus();
                await expect(firstStatus).toBeFocused();
                await expect(firstRow.getByTestId("status-editable")).toHaveCount(0);
                await expect(page.getByRole("option", { name: "Paid" })).toHaveCount(0);

                // Press arrow down - should navigate to next row, not open dropdown.
                await firstStatus.press("ArrowDown");

                const secondRow = page.getByRole("row", { name: /Status Nav 1/ });
                const secondStatus = secondRow.locator('[data-cell="status"]');
                await expect(secondStatus).toBeFocused();
                await expect(secondRow.getByTestId("status-editable")).toHaveCount(0);
                await expect(page.getByRole("option", { name: "Paid" })).toHaveCount(0);
            });
        });

        test("inspector notes stay outside canonical grid navigation", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            const targetRowId = await test.step("create transaction and add notes", async () => {
                await createTestTransaction(page, {
                    description: "Desc Nav Test",
                    amount: "-50.00"
                });

                const row = await stableTransactionRow(
                    page.getByRole("row", { name: /Desc Nav Test/ })
                );
                const transactionId = await row.getAttribute("data-transaction-id");
                if (transactionId == null) throw new Error("transaction has no stable identity");

                const inspector = await openTransactionInspector(page);
                await transactionGridCell(row, "description").click();
                const notesInput = inspector.getByTestId("notes-editable");
                await expect(notesInput).toHaveAttribute("data-transaction-owner", transactionId);
                await notesInput.fill("Test notes text");
                await expect(notesInput).toHaveValue("Test notes text");
                return transactionId;
            });

            await test.step("create second transaction", async () => {
                await createTestTransaction(page, { description: "Second Row", amount: "-30.00" });
            });

            const targetRow = page.locator(`[data-transaction-id="${targetRowId}"]`);
            const descriptionCell = transactionGridCell(targetRow, "description");
            const inspector = await openTransactionInspector(page);
            const notesInput = inspector.getByTestId("notes-editable");

            await test.step("vertical grid movement does not enter the inspector", async () => {
                await descriptionCell.focus();
                await expect(descriptionCell).toBeFocused();

                await descriptionCell.press("ArrowDown");
                await expect(descriptionCell).toBeFocused();
                await expect(notesInput).not.toBeFocused();
                await expect(targetRow.getByTestId("description-editable")).toHaveCount(0);
            });

            await test.step("notes retain their own text-navigation focus", async () => {
                await notesInput.focus();
                await page.keyboard.press("Control+Home");
                await page.keyboard.press("ArrowUp");
                await expect(notesInput).toBeFocused();
                await expect(descriptionCell).not.toBeFocused();
            });
        });

        test("Enter edits date and Tab opens its calendar popup", async ({ page }) => {
            await createNewIdentity(page);
            await goToTransactions(page);

            await test.step("create a transaction", async () => {
                await createTestTransaction(page, {
                    description: "Date Enter Test",
                    amount: "-40.00"
                });
            });

            await test.step("enter full edit and advance into the date calendar", async () => {
                const row = page.locator('[data-testid="transaction-row"]').first();
                const dateCell = row.locator('[role="gridcell"][data-cell="date"]');
                await dateCell.focus();
                await dateCell.press("Enter");
                const dateInput = row.getByTestId("date-editable");
                await expect(dateInput).toBeFocused();

                await dateInput.press("Tab");

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
                await page.getByTestId("search-filter").fill("Virtual Transaction 0499");
                await expect(page.getByTestId("transaction-table-toolbar")).toContainText(
                    "1 transaction (filtered)"
                );
                await expect(page.getByTestId("transaction-row")).toHaveCount(1);

                const farRow = page.getByTestId("transaction-row").first();
                const statusCell = farRow.locator('[data-cell="status"]');
                await expect(statusCell).toHaveAttribute("data-cell-content", "display");
                await expect(statusCell).toContainText("Paid");
                await expect(farRow.getByTestId("status-editable")).toHaveCount(0);
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
                await page.getByTestId("search-filter").fill("Alpha");
                await expect(toolbar).toContainText("2 transactions (filtered)");

                await toggleCheckbox(
                    page.getByRole("checkbox", { name: "Select all transactions" })
                );
                await expect(toolbar).toContainText("2 selected");
            });

            await test.step("clearing the filter re-derives the header against the wider set", async () => {
                await page.getByTestId("search-filter").fill("");
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
                const rows = page.getByTestId("transaction-row");
                const count = await rows.count();
                const inspector = await openTransactionInspector(page);
                const notesInput = inspector.getByTestId("notes-editable");

                for (let index = 0; index < count; index += 1) {
                    const row = await stableTransactionRow(rows.nth(index));
                    const transactionId = await row.getAttribute("data-transaction-id");
                    if (transactionId == null)
                        throw new Error("transaction has no stable identity");
                    await transactionGridCell(row, "description").click();
                    await expect(notesInput).toHaveAttribute(
                        "data-transaction-owner",
                        transactionId
                    );
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
                    const row = rows.nth(i);
                    const statusCell = row.locator('[data-cell="status"]');
                    await expect(statusCell).toHaveAttribute("data-cell-content", "display");
                    await expect(statusCell).toContainText("Paid");
                    await expect(row.getByTestId("status-editable")).toHaveCount(0);
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
                await expect(page.getByRole("row", { name: /Escape Test(?! 2)/ })).toBeVisible();
                await expect(page.getByRole("row", { name: /Escape Test 2/ })).toBeVisible();
                await expect(page.getByTestId("description-editable")).toHaveCount(0);
            });
        });
    });

    // ========================================================================
    // Phase 7: Description/Notes Separation (User Story 5)
    // ========================================================================

    test.describe("US5: Description/Notes Separation", () => {
        test("T037: notes journey covers empty, edit, inspector and search states", async ({
            page
        }) => {
            test.setTimeout(60_000);
            await createNewIdentity(page);
            await goToTransactions(page);

            const row =
                await test.step("create a transaction with an empty notes state", async () => {
                    await createTestTransaction(page, {
                        description: "UniqueStoreName",
                        amount: "-50.00"
                    });

                    const stableRow = await stableTransactionRow(
                        page.getByTestId("transaction-row").first()
                    );
                    const descriptionCell = transactionGridCell(stableRow, "description");
                    await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");
                    await expect(stableRow.getByTestId("description-display")).toHaveText(
                        "UniqueStoreName"
                    );
                    await expect(stableRow.getByTestId("description-editable")).toHaveCount(0);
                    await expect(stableRow.getByTestId("expand-notes-button")).toHaveCount(0, {
                        timeout: 3_000
                    });
                    return stableRow;
                });

            const transactionId = await row.getAttribute("data-transaction-id");
            if (transactionId == null) throw new Error("transaction has no stable identity");

            await test.step("open the inspector and edit the empty notes field", async () => {
                const inspector = await openTransactionInspector(page);
                await transactionGridCell(row, "description").click();
                const notesInput = inspector.getByTestId("notes-editable");
                await expect(notesInput).toHaveAttribute("data-transaction-owner", transactionId);
                await expect(notesInput).toHaveAttribute("placeholder", /add notes/i);
                await expect(notesInput).toHaveValue("");

                await notesInput.fill("UniqueNotesText");
                await expect(notesInput).toHaveValue("UniqueNotesText");
            });

            await test.step("retain notes after closing and reopening the inspector", async () => {
                const toggle = page.getByTestId("transaction-inspector-toggle");
                await toggle.click();
                await expect(page.getByTestId("transaction-inspector")).toBeHidden();

                const inspector = await openTransactionInspector(page);
                const notesInput = inspector.getByTestId("notes-editable");
                await expect(notesInput).toHaveAttribute("data-transaction-owner", transactionId);
                await expect(notesInput).toHaveValue("UniqueNotesText");
            });

            await test.step("find the transaction by description and notes", async () => {
                const searchInput = page.getByPlaceholder(/search/i).first();
                await searchInput.fill("UniqueStoreName");
                await expect(page.getByTestId("transaction-row")).toHaveCount(1);

                await searchInput.fill("UniqueNotesText");
                await expect(page.getByTestId("transaction-row")).toHaveCount(1);

                await searchInput.fill("NonExistentSearchTerm12345");
                await expect(page.getByTestId("transaction-row")).toHaveCount(0);
            });
        });

        test("Task 70: spreadsheet cells own contiguous chrome in both themes", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);
            await createTestTransaction(page, {
                description: "Minimal Chrome Store",
                amount: "-12.34"
            });
            await createTestTransaction(page, {
                description: "Neighboring Chrome Store",
                amount: "-23.45"
            });

            const rows = page.locator('[data-testid="transaction-row"]');
            await expect(rows).toHaveCount(2);
            const row = rows.first();
            const nextRow = rows.nth(1);
            const accountCell = row.locator('[role="gridcell"][data-cell="account"]');

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
                                    return paintsNothing(page, paint.backgroundColor);
                                },
                                { message: `${label} resting fill in ${theme}` }
                            )
                            .toBe(true);
                    };

                    for (const column of RESTING_CHROME_COLUMNS) {
                        const cell = row.locator(`[role="gridcell"][data-cell="${column}"]`);
                        await expect(cell).toHaveAttribute("data-cell-content", "display");
                        await expectRestsClean(cell, column);
                        expect(
                            hasNoShadowExtent((await readCellPaint(cell)).boxShadow),
                            `${column} resting shadow in ${theme}`
                        ).toBe(true);
                        await expect
                            .poll(() => measuredTextContrast(cell), {
                                message: `${column} text contrast in ${theme}`
                            })
                            .toBeGreaterThanOrEqual(4.5);
                    }

                    const percentageCell = row
                        .locator('[role="gridcell"][data-cell^="allocation:"]')
                        .first();
                    await expect(percentageCell).toHaveAttribute("data-cell-content", "display");
                    await expectRestsClean(percentageCell, "percentage");
                });

                await test.step(`${theme} theme keeps square contiguous spreadsheet rules`, async () => {
                    const sampledCells = [
                        row.locator('[role="gridcell"][data-cell="checkbox"]'),
                        row.locator('[role="gridcell"][data-cell="date"]'),
                        row.locator('[role="gridcell"][data-cell^="allocation:"]').first(),
                        row.locator('[role="gridcell"][data-cell="actions"]')
                    ];
                    for (const cell of sampledCells) {
                        const style = await cell.evaluate((node) => {
                            const computed = getComputedStyle(node);
                            return {
                                borderBottomStyle: computed.borderBottomStyle,
                                borderBottomWidth: computed.borderBottomWidth,
                                borderRadius: computed.borderRadius,
                                borderRightStyle: computed.borderRightStyle,
                                borderRightWidth: computed.borderRightWidth
                            };
                        });
                        expect(style).toEqual({
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderRadius: "0px",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px"
                        });
                    }

                    const bodyCells = row.locator('[role="gridcell"]');
                    const horizontalGaps = await bodyCells.evaluateAll((cells) =>
                        cells.slice(0, -1).map((cell, index) => {
                            const next = cells[index + 1];
                            if (next == null) return Number.NaN;
                            return (
                                next.getBoundingClientRect().left -
                                cell.getBoundingClientRect().right
                            );
                        })
                    );
                    expect(horizontalGaps.every((gap) => gap === 0)).toBe(true);

                    const grid = page.getByTestId("transaction-table");
                    const headerCells = grid.locator(
                        '[role="row"][aria-rowindex="1"] > [role="columnheader"]'
                    );
                    const readTrackRects = (cells: import("@playwright/test").Locator) =>
                        cells.evaluateAll((nodes) =>
                            nodes.map((node) => {
                                const rect = node.getBoundingClientRect();
                                return { left: rect.left, width: rect.width };
                            })
                        );
                    const assertTrackAlignment = async () => {
                        const [headerRects, bodyRects] = await Promise.all([
                            readTrackRects(headerCells),
                            readTrackRects(bodyCells)
                        ]);
                        expect(headerRects).toHaveLength(bodyRects.length);
                        expect(
                            headerRects.every((headerRect, index) => {
                                const bodyRect = bodyRects[index];
                                return (
                                    bodyRect != null &&
                                    Math.abs(headerRect.left - bodyRect.left) < 0.01 &&
                                    Math.abs(headerRect.width - bodyRect.width) < 0.01
                                );
                            })
                        ).toBe(true);
                    };
                    await assertTrackAlignment();
                    const horizontalScroll = await grid.evaluate((node) => {
                        const scroll = node.parentElement;
                        if (!(scroll instanceof HTMLElement)) return null;
                        scroll.scrollLeft = scroll.scrollWidth;
                        return {
                            clientWidth: scroll.clientWidth,
                            scrollLeft: scroll.scrollLeft,
                            scrollWidth: scroll.scrollWidth
                        };
                    });
                    if (horizontalScroll == null) throw new Error("grid scroll owner is missing");
                    expect(horizontalScroll.scrollWidth).toBeGreaterThan(
                        horizontalScroll.clientWidth
                    );
                    expect(horizontalScroll.scrollLeft).toBeGreaterThan(0);
                    await assertTrackAlignment();
                    await grid.evaluate((node) => {
                        const scroll = node.parentElement;
                        if (scroll instanceof HTMLElement) scroll.scrollLeft = 0;
                    });

                    const rowBox = await row.boundingBox();
                    const nextRowBox = await nextRow.boundingBox();
                    if (rowBox == null || nextRowBox == null)
                        throw new Error("rows are not laid out");
                    expect(rowBox.height).toBe(57);
                    expect(nextRowBox.height).toBe(57);
                    expect(Math.abs(nextRowBox.y - (rowBox.y + rowBox.height))).toBeLessThan(0.01);
                });

                await test.step(`${theme} theme paints hover across the whole cell`, async () => {
                    const descriptionCell = row.locator(
                        '[role="gridcell"][data-cell="description"]'
                    );
                    await descriptionCell.hover();
                    await expect
                        .poll(
                            async () =>
                                paintsNothing(
                                    page,
                                    (await readCellPaint(descriptionCell)).backgroundColor
                                ),
                            { message: `description cell hover fill in ${theme}` }
                        )
                        .toBe(false);
                    await page.mouse.move(0, 0);
                });

                await test.step(`${theme} theme keeps editor hover paint on the outer cell`, async () => {
                    const controls = [
                        {
                            column: "date",
                            label: "date calendar",
                            locator: row.getByRole("button", { name: "Open calendar" })
                        },
                        {
                            column: "account",
                            label: "account",
                            locator: row.getByRole("combobox", { name: "Select account" })
                        },
                        {
                            column: "status",
                            label: "status",
                            locator: row.getByTestId("status-editable")
                        }
                    ];
                    for (const { column, label, locator } of controls) {
                        const cell = row.locator(`[role="gridcell"][data-cell="${column}"]`);
                        await cell.dblclick();
                        await expect(cell).toHaveAttribute("data-cell-content", "editor");
                        await locator.hover({ force: true });
                        await expect
                            .poll(
                                async () =>
                                    paintsNothing(
                                        page,
                                        (await readCellPaint(cell)).backgroundColor
                                    ),
                                { message: `${label} outer hover fill in ${theme}` }
                            )
                            .toBe(false);
                        await expect
                            .poll(
                                async () =>
                                    paintsNothing(
                                        page,
                                        (await readCellPaint(locator)).backgroundColor
                                    ),
                                { message: `${label} inner hover neutrality in ${theme}` }
                            )
                            .toBe(true);
                        expect(
                            await locator.evaluate((node) => getComputedStyle(node).borderRadius),
                            `${label} inner radius in ${theme}`
                        ).toBe("0px");
                        await page.keyboard.press("Escape");
                        await expect(cell).toHaveAttribute("data-cell-content", "display");
                        await expect(cell).toBeFocused();
                        await expect(locator).toHaveCount(0);
                        await page.mouse.move(0, 0);
                    }
                });

                await test.step(`${theme} theme paints focus only on the whole cell`, async () => {
                    for (const column of RESTING_CHROME_COLUMNS) {
                        const cell = row.locator(`[role="gridcell"][data-cell="${column}"]`);
                        const resting = await readCellPaint(cell);
                        await cell.focus();
                        await expect(cell).toBeFocused();
                        await expect(cell).toHaveAttribute("data-cell-content", "display");
                        await expect
                            .poll(
                                async () =>
                                    (await readCellPaint(cell)).boxShadow !== resting.boxShadow,
                                { message: `${column} outer focus ring in ${theme}` }
                            )
                            .toBe(true);
                        await expect
                            .poll(() => measuredTextContrast(cell), {
                                message: `${column} focused text contrast in ${theme}`
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
                    await expect(row).toHaveAttribute("role", "row");
                    await expect(row.getByTestId("date-display")).toBeVisible();
                    await expect(row.getByTestId("description-display")).toBeVisible();
                    await expect(accountCell).toBeVisible();
                    await expect(row.getByRole("textbox")).toHaveCount(0);
                    await expect(row.getByRole("combobox")).toHaveCount(0);

                    const amountCell = row.locator('[data-cell="amount"]');
                    await amountCell.dblclick();
                    await expect(row.getByTestId("amount-editable")).toHaveAccessibleName(
                        /^Transaction amount in /
                    );
                    await page.keyboard.press("Escape");
                    await expect(amountCell).toHaveAttribute("data-cell-content", "display");
                });
            }

            await page.emulateMedia({ colorScheme: "light" });
        });

        /**
         * The spreadsheet cell owns its background while staged editor descendants keep their exact
         * native interaction. Coordinate clicks prove the two surfaces do not overlap or duplicate.
         */
        test("Task 70: cell backgrounds select and descendants activate once", async ({ page }) => {
            // The table is wider than the default 1280px viewport: measured, the amount column
            // spans x=1233..1345, so its centre lies OFF-SCREEN and `mouse.click` there would land
            // on nothing while the test read as passing. Widen first so every column is reachable.
            await page.setViewportSize({ width: 1600, height: 900 });

            await createNewIdentity(page);
            await goToTransactions(page);
            // TWO rows, because one cannot express the defect this fixture previously hid. The
            // header's select-all overlay reached 9px past its own row into the first data row's
            // checkbox cell, so clicking that cell selected EVERY transaction. With a single row,
            // select-all and a per-row toggle set the identical `aria-checked` and no assertion can
            // tell them apart. The second row is what makes them distinguishable.
            await createTestTransaction(page, {
                description: "Edge Click Diner",
                amount: "-31.50"
            });
            await createTestTransaction(page, {
                description: "Edge Click Bystander",
                amount: "-12.00"
            });

            const rows = page.locator('[data-testid="transaction-row"]');
            await expect(rows).toHaveCount(2);
            const grid = page.getByTestId("transaction-table");
            const transactionScroller = grid.locator("..");
            await transactionScroller.evaluate((element) => {
                element.scrollTop = 0;
                element.dispatchEvent(new Event("scroll"));
            });
            await expect
                .poll(async () => {
                    const [header, firstRow] = await Promise.all([
                        grid.locator(':scope > [role="row"]').boundingBox(),
                        rows.first().boundingBox()
                    ]);
                    return (
                        header != null &&
                        firstRow != null &&
                        firstRow.y >= header.y + header.height - 0.5
                    );
                })
                .toBe(true);
            // Rows are addressed by their STABLE ID, captured once, and not by text or accessible
            // name. Two earlier attempts failed for reasons worth recording, because both produce a
            // timeout that looks like a product defect:
            //
            //   `hasText`      matched 0 of 2 rows — a description lives in an `<input>`'s `value`,
            //                  which is not text content.
            //   `getByRole`    matched until a control opened, then stopped: an open Radix select
            //                  rewrites the surrounding accessible tree, so the row's own name
            //                  changes and the locator re-resolves to nothing mid-test.
            //
            // `data-transaction-id` is fixed for the row's lifetime, which is why the repository's
            // own `rowById` helper uses it.
            // The subject must be the FIRST RENDERED row, not a named one. The header's overlay
            // could only ever reach the row directly beneath it, so a test that clicks any other
            // row cannot express that defect — measured: with the constant reverted, clicking the
            // second row passed cleanly. The grid sorts by date, so which description lands first
            // is not something this test may assume; it reads the order the app produced.
            await expect(rows.first()).toHaveAttribute("data-transaction-id", /.+/);
            const rowId = await rows.first().getAttribute("data-transaction-id");
            const bystanderId = await rows.nth(1).getAttribute("data-transaction-id");
            if (rowId == null || bystanderId == null) throw new Error("rows have no stable id");
            expect(rowId).not.toBe(bystanderId);
            const row = page.locator(`[data-transaction-id="${rowId}"]`);
            // The row the pointer never touches. Every assertion below that could be satisfied by a
            // table-wide action checks this row is unmoved.
            const bystander = page.locator(`[data-transaction-id="${bystanderId}"]`);
            await expect(row).toHaveCount(1);
            await expect(bystander).toHaveCount(1);

            /** Click a background point owned by the outer spreadsheet cell. */
            const clickCellEdge = async (
                cellName: string,
                edge: "top" | "bottom" | "left" | "right",
                clickCount = 1
            ) => {
                const cell = row.locator(`[role="gridcell"][data-cell="${cellName}"]`);
                await cell.scrollIntoViewIfNeeded();
                const cellBox = await cell.boundingBox();
                if (cellBox == null) throw new Error(`${cellName} cell is not laid out`);
                const point = {
                    x:
                        edge === "left"
                            ? cellBox.x + 2
                            : edge === "right"
                              ? cellBox.x + cellBox.width - 3
                              : cellBox.x + cellBox.width / 2,
                    y:
                        edge === "top"
                            ? cellBox.y + 2
                            : edge === "bottom"
                              ? cellBox.y + cellBox.height - 3
                              : cellBox.y + cellBox.height / 2
                };
                const scrollerBox = await transactionScroller.boundingBox();
                if (scrollerBox == null) throw new Error("transaction scroller is not laid out");
                if (
                    point.x < scrollerBox.x ||
                    point.x >= scrollerBox.x + scrollerBox.width ||
                    point.y < scrollerBox.y ||
                    point.y >= scrollerBox.y + scrollerBox.height
                ) {
                    throw new Error(
                        `${edge} ${cellName} point is outside the transaction scroller`
                    );
                }
                const target = await page.evaluate(({ x, y }) => {
                    const element = document.elementFromPoint(x, y);
                    return {
                        cell: element?.closest("[data-cell]")?.getAttribute("data-cell") ?? null,
                        isGridcell: element?.getAttribute("role") === "gridcell",
                        tagName: element?.tagName ?? null
                    };
                }, point);
                if (target.cell !== cellName) {
                    throw new Error(
                        `${edge} ${cellName} edge resolves to ${String(target.cell)} ${String(target.tagName)}`
                    );
                }
                await page.mouse.click(point.x, point.y, { clickCount });
                return target;
            };

            const settleClearOfTheGrid = async () => {
                await page.keyboard.press("Escape");
                await page.locator("body").click({ position: { x: 2, y: 2 } });
                await page.mouse.move(0, 0);
            };

            const allocationCell = row
                .locator('[role="gridcell"][data-cell^="allocation:"]')
                .first();
            const allocationCellName = await allocationCell.getAttribute("data-cell");
            if (allocationCellName == null) throw new Error("no allocation column is rendered");
            const spreadsheetCells = [
                "checkbox",
                "date",
                "description",
                "account",
                "tags",
                "status",
                allocationCellName,
                "amount",
                "actions"
            ] as const;

            for (const edge of ["top", "bottom", "left", "right"] as const) {
                await test.step(`${edge} background edge selects each outer cell`, async () => {
                    const edgeCells =
                        edge === "left" || edge === "right"
                            ? spreadsheetCells.filter((cellName) => cellName !== "checkbox")
                            : spreadsheetCells;
                    for (const cellName of edgeCells) {
                        await settleClearOfTheGrid();
                        const target = await clickCellEdge(cellName, edge);
                        expect(target).toMatchObject({ isGridcell: true, tagName: "DIV" });
                        const cell = row.locator(`[role="gridcell"][data-cell="${cellName}"]`);
                        await expect(cell).toBeFocused();
                        expect(
                            await row
                                .locator('[role="gridcell"][aria-selected="true"]')
                                .evaluateAll((cells) =>
                                    cells.map((selected) => selected.getAttribute("data-cell"))
                                )
                        ).toEqual([cellName]);
                    }
                });
            }

            const clickControlCenter = async (control: import("@playwright/test").Locator) => {
                await control.scrollIntoViewIfNeeded();
                await transactionScroller.evaluate((element) => {
                    element.scrollTop = 0;
                    element.dispatchEvent(new Event("scroll"));
                });
                await expect
                    .poll(async () => {
                        const [header, firstRow, scrollTop] = await Promise.all([
                            grid.locator(':scope > [role="row"]').boundingBox(),
                            row.boundingBox(),
                            transactionScroller.evaluate((element) => element.scrollTop)
                        ]);
                        return (
                            scrollTop === 0 &&
                            header != null &&
                            firstRow != null &&
                            firstRow.y >= header.y + header.height - 0.5
                        );
                    })
                    .toBe(true);

                const box = await control.boundingBox();
                if (box == null) throw new Error("control is not laid out");
                const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
                const [scrollerClientRect, viewport] = await Promise.all([
                    transactionScroller.evaluate((element) => {
                        const rect = element.getBoundingClientRect();
                        return {
                            height: element.clientHeight,
                            width: element.clientWidth,
                            x: rect.left + element.clientLeft,
                            y: rect.top + element.clientTop
                        };
                    }),
                    page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth }))
                ]);
                if (
                    point.x < 0 ||
                    point.x >= viewport.width ||
                    point.y < 0 ||
                    point.y >= viewport.height
                ) {
                    throw new Error("control center is outside the page viewport");
                }
                if (
                    point.x < scrollerClientRect.x ||
                    point.x >= scrollerClientRect.x + scrollerClientRect.width ||
                    point.y < scrollerClientRect.y ||
                    point.y >= scrollerClientRect.y + scrollerClientRect.height
                ) {
                    throw new Error("control center is outside the transaction scroller");
                }
                const target = await page.evaluate(({ x, y }) => {
                    const element = document.elementFromPoint(x, y);
                    return {
                        cell: element?.closest("[data-cell]")?.getAttribute("data-cell") ?? null,
                        tagName: element?.tagName ?? null
                    };
                }, point);
                await page.mouse.click(point.x, point.y);
                return target;
            };

            await test.step("center controls remain single reachable descendants", async () => {
                const descriptionCell = row.locator('[data-cell="description"]');
                await descriptionCell.dblclick();
                const descriptionEditor = row.getByTestId("description-editable");
                const descriptionTarget = await clickControlCenter(descriptionEditor);
                expect(descriptionTarget).toMatchObject({ cell: "description", tagName: "INPUT" });
                await expect(descriptionEditor).toBeFocused();
                await expect(row.getByTestId("description-editable")).toHaveCount(1);
                await descriptionEditor.press("Escape");
                await expect(descriptionCell).toHaveAttribute("data-cell-content", "display");

                const checkbox = row.getByRole("checkbox", { name: /^Select transaction/ });
                const otherCheckbox = bystander.getByRole("checkbox", {
                    name: /^Select transaction/
                });
                const checkboxTarget = await clickControlCenter(checkbox);
                expect(checkboxTarget).toEqual({ cell: "checkbox", tagName: "BUTTON" });
                await expect(checkbox).toHaveAttribute("aria-checked", "true");
                await expect(otherCheckbox).toHaveAttribute("aria-checked", "false");
                await clickControlCenter(checkbox);
                await expect(checkbox).toHaveAttribute("aria-checked", "false");

                await allocationCell.dblclick();
                const allocationEditor = allocationCell.getByRole("textbox");
                const allocationTarget = await clickControlCenter(allocationEditor);
                expect(allocationTarget.cell).toBe(allocationCellName);
                await expect(allocationEditor).toBeFocused();
                await allocationEditor.press("Escape");
                await expect(allocationCell).toHaveAttribute("data-cell-content", "display");

                const deleteAction = row.getByTestId("delete-button");
                const actionTarget = await clickControlCenter(deleteAction);
                expect(actionTarget.cell).toBe("actions");
                await expect(deleteAction).toHaveAttribute(
                    "title",
                    "Click again to confirm delete"
                );
                await expect(row).toHaveCount(1);

                await expect(row.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
            });

            await test.step("checked and unchecked checkbox cells retain canonical focus paint", async () => {
                const checkbox = row.getByRole("checkbox", { name: /^Select transaction/ });
                const checkboxCell = row.locator('[role="gridcell"][data-cell="checkbox"]');
                const dateCell = row.locator('[role="gridcell"][data-cell="date"]');

                for (const theme of ["light", "dark"] as const) {
                    await page.emulateMedia({ colorScheme: theme });
                    for (const checked of [false, true]) {
                        await dateCell.focus();
                        await page.keyboard.press("Shift+Tab");
                        await expect(checkboxCell).toBeFocused();
                        await expect(checkbox).toHaveAttribute(
                            "aria-checked",
                            checked ? "true" : "false"
                        );
                        expect(
                            hasNoShadowExtent((await readCellPaint(checkboxCell)).boxShadow),
                            `${theme} checked=${checked} canonical focus ring`
                        ).toBe(false);
                        await page.keyboard.press("Space");
                    }
                }
                await page.emulateMedia({ colorScheme: "light" });
            });

            const activateLegacyFullEdit = async (
                cellName: string,
                gesture: "Enter" | "double click"
            ) => {
                await settleClearOfTheGrid();
                const target = await clickCellEdge(cellName, "top", gesture === "Enter" ? 1 : 2);
                expect(target).toMatchObject({
                    cell: cellName,
                    isGridcell: true,
                    tagName: "DIV"
                });
                if (gesture === "Enter") {
                    await expect(
                        row.locator(`[role="gridcell"][data-cell="${cellName}"]`)
                    ).toBeFocused();
                    await page.keyboard.press("Enter");
                }
            };

            const fullEditGestures: readonly ("Enter" | "double click")[] = [
                "Enter",
                "double click"
            ];
            for (const gesture of fullEditGestures) {
                await test.step(`${gesture} fully activates account, status and allocation`, async () => {
                    await activateLegacyFullEdit("account", gesture);
                    await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
                    await page.keyboard.press("Escape");
                    await expect(page.getByRole("option", { name: "Default" })).toHaveCount(0, {
                        timeout: 3_000
                    });
                    const accountCell = row.locator('[data-cell="account"]');
                    await expect(accountCell).toHaveAttribute("data-cell-content", "display");
                    await expect(accountCell).toBeFocused();
                    await expect(
                        row.getByRole("combobox", { name: "Select account", exact: true })
                    ).toHaveCount(0);

                    await activateLegacyFullEdit("status", gesture);
                    await expect(page.getByRole("option", { name: "Paid" })).toBeVisible();
                    await page.keyboard.press("Escape");
                    await expect(page.getByRole("option", { name: "Paid" })).toHaveCount(0, {
                        timeout: 3_000
                    });
                    const statusCell = row.locator('[data-cell="status"]');
                    await expect(statusCell).toHaveAttribute("data-cell-content", "display");
                    await expect(statusCell).toBeFocused();
                    await expect(row.getByTestId("status-editable")).toHaveCount(0);

                    await activateLegacyFullEdit(allocationCellName, gesture);
                    await expect(allocationCell.getByRole("textbox")).toBeFocused();
                    await page.keyboard.press("Escape");
                    await expect(allocationCell).toHaveAttribute("data-cell-content", "display");
                    await expect(allocationCell.getByRole("textbox")).toHaveCount(0);
                });
            }

            await test.step("main row stays exactly 57px through constrained states", async () => {
                const expectMainRowHeight = async (state: string) => {
                    expect(
                        await row.evaluate((node) => node.getBoundingClientRect().height),
                        state
                    ).toBe(57);
                };

                await expectMainRowHeight("resting");
                await clickCellEdge("description", "top");
                await expectMainRowHeight("selected and focused");

                await row.locator('[data-cell="account"]').dblclick();
                await expect(
                    row.getByRole("combobox", { name: "Select account", exact: true })
                ).toBeVisible();
                await expect(page.getByRole("option", { name: "Default" })).toBeVisible();
                await expectMainRowHeight("popup owned");
                await page.keyboard.press("Escape");

                await allocationCell.dblclick();
                const invalidAllocation = allocationCell.getByRole("textbox");
                await invalidAllocation.fill("101");
                await expect(invalidAllocation).toHaveValue("101");
                await expectMainRowHeight("allocation draft");
                await invalidAllocation.press("Escape");

                await row.locator('[data-cell="tags"]').dblclick();
                const tags = row.getByTestId("tags-editable");
                const searchTags = page.getByPlaceholder("Search tags...");
                await expect(searchTags).toBeFocused();
                for (const tagName of [
                    "Long household groceries",
                    "Annual insurance renewals",
                    "Shared travel reimbursements",
                    "Professional subscriptions"
                ]) {
                    await searchTags.fill(tagName);
                    await page.getByTestId("create-tag-button").click();
                    await expect(tags).toContainText(tagName);
                    await expectMainRowHeight(`long tags: ${tagName}`);
                }
                await expectMainRowHeight("long tags with popup owned");
                await searchTags.press("Escape");

                const transactionId = await row.getAttribute("data-transaction-id");
                if (transactionId == null) throw new Error("transaction has no stable identity");
                const actionsCell = transactionGridCell(row, "actions");
                await actionsCell.click({ position: { x: 1, y: 1 } });
                await actionsCell.press("Enter");
                const inspector = await openTransactionInspector(page);
                await expect(inspector.getByTestId("notes-editable")).toHaveAttribute(
                    "data-transaction-owner",
                    transactionId
                );
                await expectMainRowHeight("actions and persistent inspector");
                await inspector
                    .getByRole("button", { name: "Close transaction inspector" })
                    .click();
                await expectMainRowHeight("actions after inspector close");
            });

            await settleClearOfTheGrid();
        });

        /** The fixed outer row owns geometry while staged controls remain vertically centered. */
        test("Task 70: inner controls stay centered inside the fixed main row", async ({
            page
        }) => {
            await createNewIdentity(page);
            await goToTransactions(page);
            await createTestTransaction(page, {
                description: "Resting Geometry Cafe",
                amount: "-8.00"
            });

            const row = page.locator('[data-testid="transaction-row"]').first();
            await page.mouse.move(0, 0);
            await page.locator("body").click({ position: { x: 2, y: 2 } });

            const restingDisplays = [
                '[data-cell="checkbox"] [role="checkbox"]',
                '[data-testid="date-display"]',
                '[data-testid="description-display"]',
                '[data-cell="account"] > span',
                '[data-cell="tags"] span',
                '[data-cell="status"] > span',
                '[data-cell^="allocation:"] [data-testid^="allocation-cell-"]',
                '[data-cell="amount"] > span'
            ];

            for (const selector of restingDisplays) {
                const centerOffset = await row.evaluate((rowNode, target) => {
                    const element = rowNode.querySelector(target);
                    if (element == null) return null;
                    const box = element.getBoundingClientRect();
                    const rowBox = rowNode.getBoundingClientRect();
                    return box.top + box.height / 2 - (rowBox.top + rowBox.height / 2);
                }, selector);
                expect(centerOffset, `${selector} is present`).not.toBeNull();
                expect(Math.abs(centerOffset ?? Number.POSITIVE_INFINITY), selector).toBeLessThan(
                    1
                );
            }

            await expect(row.getByTestId("date-editable")).toHaveCount(0);
            await expect(row.getByTestId("description-editable")).toHaveCount(0);
            await expect(row.getByTestId("status-editable")).toHaveCount(0);
            await expect(row.getByTestId("amount-editable")).toHaveCount(0);
        });

        /**
         * UR-012: "Existing per-cell behaviour is retained."
         *
         * Regression test for a defect an earlier full-cell hit-area implementation introduced. Its
         * tags activation overlay sat above the tag pill's remove button, so the "×" became
         * unclickable, the tag survived, and the chooser opened instead. The spreadsheet geometry
         * removes that overlay, but must retain the recovered descendant behavior.
         *
         * The fixture is the whole point. The committed edge-click test uses a transaction with no
         * tags, so the pill never exists in it and three green campaign runs were entirely consistent
         * with this defect being present. **A tag must be on the row before this can assert anything**
         * — which is exactly the state no test in the suite had constructed.
         */
        test("UR-012: a tag pill's remove button still removes its tag", async ({ page }) => {
            const tagName = "Groceries for the whole extended household budget";
            await createNewIdentity(page);
            await goToTags(page);
            await createTag(page, { name: tagName });
            await goToTransactions(page);
            await createTestTransaction(page, {
                description: "Pill Removal Grocer",
                amount: "-19.99"
            });

            const row = page.locator('[data-testid="transaction-row"]').first();
            const tagsCell = row.locator('[data-cell="tags"]');
            const tagsEditor = row.getByTestId("tags-editable");
            const searchInput = page.getByPlaceholder("Search tags...");

            await test.step("put a tag on the row while its editor is active", async () => {
                await tagsCell.dblclick();
                await expect(tagsCell).toHaveAttribute("data-cell-content", "editor");
                await expect(searchInput).toBeVisible({ timeout: 15_000 });
                await page.getByRole("option", { name: tagName, exact: true }).click();
                await expect(tagsEditor).toContainText(tagName);
            });

            await test.step("keyboard focus reveals the clipped remove button in both themes", async () => {
                const tagStrip = tagsEditor.locator("[data-tag-strip]");
                const removeButton = row.getByRole("button", { name: `Remove ${tagName}` });
                const initialGeometry = await tagStrip.evaluate((strip, buttonLabel) => {
                    const button = [...strip.querySelectorAll("button")].find(
                        (candidate) => candidate.getAttribute("aria-label") === buttonLabel
                    );
                    if (button == null) return null;
                    const stripBox = strip.getBoundingClientRect();
                    const buttonBox = button.getBoundingClientRect();
                    return {
                        buttonRight: buttonBox.right,
                        stripRight: stripBox.right
                    };
                }, `Remove ${tagName}`);
                if (initialGeometry == null) throw new Error("remove button geometry is missing");
                expect(initialGeometry.buttonRight).toBeGreaterThan(initialGeometry.stripRight);

                for (const theme of ["light", "dark"] as const) {
                    await page.emulateMedia({ colorScheme: theme });
                    // Tab is controller-owned while editing and exits to the next canonical cell.
                    // Direct focus still exercises the browser's overflow reveal for this descendant.
                    await removeButton.focus();
                    await expect(removeButton).toBeFocused();
                    const focusedGeometry = await removeButton.evaluate((button) => {
                        const strip = button.closest("[data-tag-strip]");
                        if (!(strip instanceof HTMLElement)) return null;
                        const buttonBox = button.getBoundingClientRect();
                        const stripBox = strip.getBoundingClientRect();
                        return {
                            inside:
                                buttonBox.left >= stripBox.left && buttonBox.right <= stripBox.right
                        };
                    });
                    expect(focusedGeometry, `${theme} focused remove geometry`).toEqual({
                        inside: true
                    });
                }
                await page.emulateMedia({ colorScheme: "light" });
            });

            await test.step("the remove button is the topmost element at its own centre", async () => {
                // The defect was a stacking-order fault, so assert the stack directly. Without this,
                // a future change could make the click work by accident while leaving the button
                // buried for anyone using a different input method.
                const topmostIsTheButton = await row.evaluate((rowNode, name) => {
                    const button = [...rowNode.querySelectorAll("button")].find(
                        (candidate) => candidate.getAttribute("aria-label") === `Remove ${name}`
                    );
                    if (button == null) return null;
                    const box = button.getBoundingClientRect();
                    const atCentre = document.elementFromPoint(
                        box.x + box.width / 2,
                        box.y + box.height / 2
                    );
                    return atCentre != null && button.contains(atCentre);
                }, tagName);
                expect(topmostIsTheButton, "remove button is not covered").toBe(true);
            });

            await test.step("clicking it removes the tag from the active editor", async () => {
                // A real mouse click at the button's centre, rather than `locator.click()`, because
                // the defect is precisely about which element receives a click at that coordinate.
                const box = await row
                    .getByRole("button", { name: `Remove ${tagName}` })
                    .boundingBox();
                if (box == null) throw new Error("remove button is not laid out");
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

                await expect(tagsEditor).not.toContainText(tagName);
                await expect(row.getByRole("button", { name: `Remove ${tagName}` })).toHaveCount(0);
                await expect(searchInput).toBeVisible();
                await searchInput.press("Escape");
                await expect(tagsCell).toHaveAttribute("data-cell-content", "display");
                await expect(tagsCell).toBeFocused();
                await expect(tagsEditor).toHaveCount(0);
                await expect(tagsCell).toContainText("Add tags...");
            });
        });
    });
});

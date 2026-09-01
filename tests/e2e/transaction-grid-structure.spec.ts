/**
 * E2E Test: Transaction grid structure
 *
 * Two properties of the grid that only a real browser can decide, and that unit tests over the
 * markup would get wrong:
 *
 * 1. **Accessibility containment.** `grid → rowgroup → row → gridcell`. The oracle has to be
 *    Chrome's own accessibility tree rather than the DOM, because the wrappers the virtualizer needs
 *    (the one carrying `data-index`, the measurement ref and the `translateY` transform) carry
 *    `role="presentation"` and are flattened out of that tree. Reading the markup would report
 *    violations the browser does not have — and would miss the one it does.
 *
 * 2. **The grid reads its state from the table, live.** Row selection is a slice of the TanStack
 *    Table instance, and rows the cursor pages in *after* a select-all must reflect it. A grid that
 *    cached its table reads would pass every fixture small enough to render in one page.
 */

import { expect, test, type Page } from "@playwright/test";

import {
    createNewIdentity,
    goToImportNew,
    goToTransactions,
    openTransactionInspector
} from "./helpers";
import { addEmptyTransaction } from "./helpers/settlement";

/** Rows to import for the paging test: beyond both one cursor page and the bounded held window. */
const IMPORTED_ROW_COUNT = 1_000;

/** The last logical row, absent from both the first loaded page and initial held window. */
const ROW_BEYOND_FIRST_PAGE = IMPORTED_ROW_COUNT - 1;

const CELL_ROLES = new Set(["gridcell", "columnheader", "rowheader"]);

interface AriaNode {
    readonly indent: number;
    readonly role: string;
}

/**
 * Roles appearing as a direct child of a `row` that are not cells.
 *
 * Playwright's ARIA snapshot is two-space-indented, one node per line as `- <role> "<name>"`, so a
 * node's children are the following node lines indented exactly two spaces deeper, up to the first
 * line at or above the node's own indent. Lines that are not nodes — `- /placeholder: …`, blanks —
 * are skipped rather than ending the scan.
 */
function strayRowChildRoles(ariaSnapshot: string): readonly string[] {
    const nodes: readonly (AriaNode | null)[] = ariaSnapshot.split("\n").map((line) => {
        const match = /^(\s*)- ['"]?([a-zA-Z]+)/.exec(line);
        return match == null ? null : { indent: match[1].length, role: match[2] };
    });

    const strays: string[] = [];
    for (const [position, node] of nodes.entries()) {
        if (node == null || node.role !== "row") continue;
        for (const child of nodes.slice(position + 1)) {
            if (child == null) continue;
            if (child.indent <= node.indent) break;
            if (child.indent !== node.indent + 2) continue;
            if (!CELL_ROLES.has(child.role)) strays.push(child.role);
        }
    }
    return strays;
}

/** Every `row` the snapshot contains, so a green result cannot come from having found none. */
function rowCount(ariaSnapshot: string): number {
    return ariaSnapshot.split("\n").filter((line) => /^\s*- ['"]?row\b/.test(line)).length;
}

function hasNoShadowExtent(boxShadow: string): boolean {
    if (boxShadow === "none") return true;
    const lengths = boxShadow.match(/-?\d+(?:\.\d+)?px/g);
    return lengths != null && lengths.every((length) => Number.parseFloat(length) === 0);
}

/** Whole-cell paint in both themes while a retained range is parked behind a descendant. */
async function parkedCellPaint(cell: import("@playwright/test").Locator): Promise<
    readonly {
        readonly backgroundAlpha: number;
        readonly boxShadow: string;
        readonly outlineStyle: string;
    }[]
> {
    return cell.evaluate((element) => {
        const root = element.ownerDocument.documentElement;
        const originallyDark = root.classList.contains("dark");
        const paintFor = (dark: boolean) => {
            root.classList.toggle("dark", dark);
            const styles = getComputedStyle(element);
            const canvas = element.ownerDocument.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const context = canvas.getContext("2d");
            if (context == null) throw new Error("2d context unavailable");
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = styles.backgroundColor;
            context.fillRect(0, 0, 1, 1);
            const backgroundAlpha = context.getImageData(0, 0, 1, 1).data[3] ?? 0;
            return {
                backgroundAlpha,
                boxShadow: styles.boxShadow,
                outlineStyle: styles.outlineStyle
            };
        };
        const paints = [paintFor(false), paintFor(true)];
        root.classList.toggle("dark", originallyDark);
        return paints;
    });
}

async function expectNoParkedCellPaint(cell: import("@playwright/test").Locator): Promise<void> {
    await expect
        .poll(async () => {
            const paints = await parkedCellPaint(cell);
            return (
                paints.length === 2 &&
                paints.every(
                    (paint) =>
                        paint.backgroundAlpha === 0 &&
                        hasNoShadowExtent(paint.boxShadow) &&
                        paint.outlineStyle === "none"
                )
            );
        })
        .toBe(true);
}

async function expectVisibleActionFocusIndicator(
    action: import("@playwright/test").Locator
): Promise<void> {
    const indicators = await action.evaluate((element) => {
        const root = element.ownerDocument.documentElement;
        const originallyDark = root.classList.contains("dark");
        const indicatorFor = (dark: boolean) => {
            root.classList.toggle("dark", dark);
            const styles = getComputedStyle(element);
            return {
                color: styles.outlineColor,
                style: styles.outlineStyle,
                width: Number.parseFloat(styles.outlineWidth)
            };
        };
        const result = [indicatorFor(false), indicatorFor(true)];
        root.classList.toggle("dark", originallyDark);
        return result;
    });
    expect(indicators).toHaveLength(2);
    for (const indicator of indicators) {
        expect(indicator.width).toBeGreaterThan(0);
        expect(indicator.style).not.toBe("none");
        expect(indicator.color).not.toBe("transparent");
        expect(indicator.color).not.toMatch(/rgba\([^)]*,\s*0\)$/);
    }
}

/** A committed transaction, addressed by the stable id the caret identifies it with. */
async function createRow(page: Page, description: string): Promise<string> {
    const transactionId = await addEmptyTransaction(page);
    const row = page.locator(`[data-transaction-id="${transactionId}"]`);
    await expect(row).toBeVisible();
    const input = row.getByTestId("description-editable");
    await input.fill(description);
    await input.press("Enter");
    await expect(row.getByTestId("description-display")).toHaveText(description);
    return transactionId;
}

/** A deterministic CSV of `count` rows, matching the shape the import flow auto-detects. */
function createTransactionCSV(count: number): string {
    const rows = Array.from({ length: count }, (unused, index) => {
        const sequence = String(index).padStart(4, "0");
        return `2024-06-${String((index % 28) + 1).padStart(2, "0")},Grid Row ${sequence},-${String(10 + index)}.00`;
    });
    return ["Date,Description,Amount", ...rows].join("\n");
}

async function mountedRowIndexes(page: Page): Promise<readonly number[]> {
    return page
        .getByTestId("transaction-table")
        .locator("[data-index]")
        .evaluateAll((elements) =>
            elements.flatMap((element) => {
                const value = element.getAttribute("data-index");
                if (value == null) return [];
                const index = Number(value);
                return Number.isInteger(index) ? [index] : [];
            })
        );
}

async function visibleRowDistance(page: Page): Promise<number> {
    return page
        .getByTestId("transaction-table")
        .locator("..")
        .evaluate((scrollContainer) => {
            const viewport = scrollContainer.getBoundingClientRect();
            const headerBottom =
                scrollContainer
                    .querySelector<HTMLElement>('[role="row"][aria-rowindex="1"]')
                    ?.getBoundingClientRect().bottom ?? viewport.top;
            const visibleIndexes = [
                ...scrollContainer.querySelectorAll<HTMLElement>("[data-index]")
            ].flatMap((element) => {
                const row = element.getBoundingClientRect();
                const value = element.getAttribute("data-index");
                if (row.bottom <= headerBottom || row.top >= viewport.bottom || value == null) {
                    return [];
                }
                const index = Number(value);
                return Number.isInteger(index) ? [index] : [];
            });
            if (visibleIndexes.length === 0) {
                throw new Error("transaction viewport contains no visible row indexes");
            }
            const first = Math.min(...visibleIndexes);
            const last = Math.max(...visibleIndexes);
            return Math.max(1, last - first);
        });
}

async function importDuplicateOfExistingRow(page: Page): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "actions-geometry-duplicate.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("Date,Description,Amount\n2026-08-25,Actions Geometry Duplicate,-42.00")
    });
    await expect(page.getByText("CSV • 2 rows", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("tab", { name: /Columns/i }).click();
    await page.getByRole("button", { name: /Auto-detect/i }).click();
    await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
    await page.getByRole("tab", { name: /Account/i }).click();
    await page.locator("#account-select").click();
    await page.getByRole("option", { name: /Default/i }).click();
    const importButton = page.getByRole("button", { name: /Import 1 Transaction/i });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page).toHaveURL(/\/transactions/);
}

async function importRows(page: Page, count: number): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "grid-structure.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(createTransactionCSV(count))
    });

    await expect(page.getByText(`CSV • ${String(count + 1)} rows`, { exact: true })).toBeVisible({
        timeout: 10_000
    });
    await page.getByRole("tab", { name: /Columns/i }).click();
    await page.getByRole("button", { name: /Auto-detect/i }).click();
    await expect(page.getByText(/All required fields mapped/i)).toBeVisible();

    await page.getByRole("tab", { name: /Account/i }).click();
    await page.locator("#account-select").click();
    await page.getByRole("option", { name: /Default/i }).click();

    const importButton = page.getByRole("button", {
        name: new RegExp(`Import ${String(count)} Transactions`, "i")
    });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page).toHaveURL(/\/transactions/);
    await expect(page.getByText(`${String(count)} transactions`, { exact: true })).toBeVisible({
        timeout: 15_000
    });
}

test.describe("Transaction grid structure", () => {
    test.use({ locale: "en-US", timezoneId: "America/New_York" });

    test("every element the grid exposes sits inside a cell", async ({ page }) => {
        await createNewIdentity(page);
        await goToTransactions(page);

        const transactionId = await createRow(page, "Containment Row");
        const row = page.locator(
            `[data-testid="transaction-row"][data-transaction-id="${transactionId}"]`
        );

        await expect(row).not.toHaveAttribute("tabindex", /.+/);
        expect(await row.evaluate((element) => element.getBoundingClientRect().height)).toBe(57);
        const grid = page.getByTestId("transaction-table");
        const headerCells = grid.locator(':scope > [role="row"] > [role="columnheader"]');
        const logicalColumnCount = await headerCells.count();
        expect(logicalColumnCount).toBeGreaterThan(0);
        expect(
            await headerCells.evaluateAll((cells) =>
                cells.map((cell) => Number(cell.getAttribute("aria-colindex")))
            )
        ).toEqual(Array.from({ length: logicalColumnCount }, (unused, index) => index + 1));
        await expect(grid).toHaveAttribute("aria-rowcount", "2");
        await expect(grid).toHaveAttribute("aria-colcount", String(logicalColumnCount));
        await expect(grid.locator(':scope > [role="row"]')).toHaveAttribute("aria-rowindex", "1");
        await expect(row).toHaveAttribute("aria-rowindex", "2");
        await expect(row.locator(':scope > [role="gridcell"]')).toHaveCount(8);
        await expect(row.locator('[role="gridcell"]')).toHaveCount(logicalColumnCount);
        await expect(row.locator('[role="gridcell"]').first()).toHaveAttribute(
            "aria-colindex",
            "1"
        );
        await expect(row.locator('[role="gridcell"]').last()).toHaveAttribute(
            "aria-colindex",
            String(logicalColumnCount)
        );
        await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
        await expect(row.locator('[data-cell="actions"][role="gridcell"]')).toHaveCount(1);
        await expect(row.getByTestId("date-editable")).toHaveCount(0);
        await expect(row.getByTestId("description-editable")).toHaveCount(0);
        await expect(row.getByTestId("amount-editable")).toHaveCount(0);
        await expect(row.getByTestId("date-display")).toHaveCount(1);
        await expect(row.getByTestId("description-display")).toHaveCount(1);
        await expect(row.locator('input[type="hidden"]')).toHaveCount(0);
        expect(
            await row
                .locator("input, button, select, textarea")
                .evaluateAll((controls) =>
                    controls.every(
                        (control) =>
                            control
                                .closest('[role="gridcell"]')
                                ?.getAttribute("data-cell-content") === "legacy-interactive"
                    )
                )
        ).toBe(true);

        await test.step("checkbox glyph focus preserves the cell range while row selection stays orthogonal", async () => {
            const checkboxCell = row.locator('[role="gridcell"][data-cell="checkbox"]');
            const dateCell = row.locator('[role="gridcell"][data-cell="date"]');
            const descriptionCell = row.locator('[role="gridcell"][data-cell="description"]');
            const checkbox = row.getByRole("checkbox", { name: /^Select transaction/ });

            await dateCell.click({ position: { x: 1, y: 1 } });
            await dateCell.press("Shift+ArrowRight");
            await expect(dateCell).toHaveAttribute("aria-selected", "true");
            await expect(descriptionCell).toHaveAttribute("aria-selected", "true");

            await checkbox.click();
            await expect(checkbox).toBeChecked();
            await expect(row).toHaveAttribute("aria-selected", "true");
            await expect(row.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0);
            await expect(checkboxCell).not.toHaveAttribute("aria-selected");
            await expect(dateCell).toHaveAttribute("tabindex", "0");
            await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
            await page.mouse.move(0, 0);
            await expectNoParkedCellPaint(checkboxCell);

            await dateCell.focus();
            await expect(dateCell).toBeFocused();
            expect(
                await row
                    .locator('[role="gridcell"][aria-selected="true"]')
                    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-cell")))
            ).toEqual(["date", "description"]);

            await checkboxCell.click({ position: { x: 1, y: 1 } });
            await expect(checkbox).toBeChecked();
            await expect(row).toHaveAttribute("aria-selected", "true");
            await expect(checkboxCell).toBeFocused();
            await expect(checkboxCell).toHaveAttribute("aria-selected", "true");
        });

        await test.step("arrows land canonical Actions while Enter opens the inspector", async () => {
            const amountCell = row.locator('[role="gridcell"][data-cell="amount"]');
            const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');

            await amountCell.focus();
            await amountCell.press("ArrowRight");
            await expect(actionsCell).toBeFocused();
            await expect(actionsCell).toHaveAttribute("aria-selected", "true");

            await actionsCell.press("ArrowLeft");
            await expect(amountCell).toBeFocused();
            await expect(amountCell).toHaveAttribute("aria-selected", "true");

            await actionsCell.focus();
            await actionsCell.press("Enter");
            const inspector = await openTransactionInspector(page);
            const heading = inspector.getByTestId("transaction-inspector-title");
            await expect(heading).toBeFocused();
            await heading.press("ArrowLeft");
            await expect(heading).toBeFocused();
        });

        await test.step("forward and reverse boundary re-entry expose the retained range", async () => {
            const checkboxCell = row.locator('[role="gridcell"][data-cell="checkbox"]');
            const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');
            const selectedCells = row.locator('[role="gridcell"][aria-selected="true"]');

            await checkboxCell.click({ position: { x: 1, y: 1 } });
            await checkboxCell.press("Shift+End");
            await expect(selectedCells).toHaveCount(logicalColumnCount);
            await checkboxCell.press("Shift+Tab");
            await expect(checkboxCell).not.toBeFocused();
            await expect(selectedCells).toHaveCount(0);
            await expect(checkboxCell).toHaveAttribute("tabindex", "0");

            await page.keyboard.press("Tab");
            await expect(checkboxCell).toBeFocused();
            await expect(selectedCells).toHaveCount(logicalColumnCount);

            await actionsCell.click({ position: { x: 1, y: 1 } });
            await actionsCell.press("Shift+Home");
            await expect(selectedCells).toHaveCount(logicalColumnCount);
            const retainedColumns = await selectedCells.evaluateAll((cells) =>
                cells.map((cell) => cell.getAttribute("data-cell"))
            );
            const deleteAction = row.getByTestId("delete-button");
            await actionsCell.press("Tab");
            await expect(deleteAction).toBeFocused();
            await expect(selectedCells).toHaveCount(0);
            await expect(actionsCell).not.toHaveAttribute("aria-selected");
            await expect(actionsCell).toHaveAttribute("tabindex", "0");
            await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
            await page.mouse.move(0, 0);
            await expectNoParkedCellPaint(actionsCell);
            await expectVisibleActionFocusIndicator(deleteAction);

            await page.keyboard.press("Shift+Tab");
            await expect(actionsCell).toBeFocused();
            await expect(actionsCell).toHaveAttribute("tabindex", "0");
            await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
            expect(
                await selectedCells.evaluateAll((cells) =>
                    cells.map((cell) => cell.getAttribute("data-cell"))
                )
            ).toEqual(retainedColumns);

            await page.keyboard.press("Tab");
            await expect(deleteAction).toBeFocused();
            await deleteAction.press("Enter");
            await expect(deleteAction).toHaveAttribute("title", "Click again to confirm delete");
            await expect(row).toHaveCount(1);
            await expect(selectedCells).toHaveCount(0);
            await expect(actionsCell).not.toHaveAttribute("aria-selected");
            await expectNoParkedCellPaint(actionsCell);
            await expectVisibleActionFocusIndicator(deleteAction);

            await page.keyboard.press("Shift+Tab");
            await expect(actionsCell).toBeFocused();
            expect(
                await selectedCells.evaluateAll((cells) =>
                    cells.map((cell) => cell.getAttribute("data-cell"))
                )
            ).toEqual(retainedColumns);
            await expect(selectedCells).toHaveCount(9);
            expect(logicalColumnCount).toBe(9);
        });

        await test.step("selected chrome computes to a real inset shadow in both themes", async () => {
            const dateCell = row.locator('[role="gridcell"][data-cell="date"]');
            await dateCell.click({ position: { x: 1, y: 1 } });
            const shadows = await dateCell.evaluate((element) => {
                const root = element.ownerDocument.documentElement;
                const originallyDark = root.classList.contains("dark");
                const shadowFor = (dark: boolean): string => {
                    root.classList.toggle("dark", dark);
                    return getComputedStyle(element).boxShadow;
                };
                const result = [shadowFor(false), shadowFor(true)];
                root.classList.toggle("dark", originallyDark);
                return result;
            });
            expect(shadows).toHaveLength(2);
            for (const shadow of shadows) {
                expect(shadow).not.toBe("none");
                expect(shadow).toContain("inset");
            }
        });

        await test.step("actions background spans the fixed row track", async () => {
            const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');
            await actionsCell.scrollIntoViewIfNeeded();
            const geometry = await actionsCell.evaluate((element) => {
                const cell = element.getBoundingClientRect();
                const rowElement = element.closest<HTMLElement>('[role="row"]');
                if (rowElement == null) throw new Error("actions cell has no row");
                const rowBounds = rowElement.getBoundingClientRect();
                const x = cell.left + 1;
                const points = [
                    rowBounds.top + 1,
                    rowBounds.top + rowBounds.height / 2,
                    rowBounds.bottom - 2
                ];
                return {
                    cellBottom: cell.bottom,
                    cellTop: cell.top,
                    hits: points.map(
                        (y) =>
                            element.ownerDocument
                                .elementFromPoint(x, y)
                                ?.closest('[role="gridcell"]') === element
                    ),
                    rowBottom: rowBounds.bottom,
                    rowHeight: rowBounds.height,
                    rowTop: rowBounds.top
                };
            });
            expect(geometry.rowHeight).toBe(57);
            expect(Math.abs(geometry.cellTop - geometry.rowTop)).toBeLessThanOrEqual(1);
            expect(Math.abs(geometry.cellBottom - geometry.rowBottom)).toBeLessThanOrEqual(1);
            expect(geometry.hits).toEqual([true, true, true]);
            await actionsCell.click({ position: { x: 1, y: 1 } });
            await expect(actionsCell).toBeFocused();
            await expect(actionsCell).toHaveAttribute("aria-selected", "true");
            await expect(row.getByTestId("expand-notes-button")).toHaveCount(0, {
                timeout: 3_000
            });
            await expect(row.getByTestId("delete-button")).toBeVisible();
        });

        await test.step("activation backgrounds do not enter edit while description does", async () => {
            const checkboxCell = row.locator('[role="gridcell"][data-cell="checkbox"]');
            const descriptionCell = row.locator('[role="gridcell"][data-cell="description"]');
            await checkboxCell.click({ position: { x: 1, y: 1 } });
            await expect(checkboxCell).toBeFocused();
            await expect(checkboxCell).toHaveAttribute("aria-selected", "true");

            for (const columnId of ["checkbox", "actions"]) {
                const activationCell = row.locator(`[role="gridcell"][data-cell="${columnId}"]`);
                await activationCell.evaluate((element) => {
                    element.dispatchEvent(
                        new MouseEvent("dblclick", { bubbles: true, cancelable: true })
                    );
                });
                await expect(checkboxCell).toBeFocused();
                await expect(checkboxCell).toHaveAttribute("aria-selected", "true");
            }

            await descriptionCell.evaluate((element) => {
                element.dispatchEvent(
                    new MouseEvent("dblclick", { bubbles: true, cancelable: true })
                );
            });
            await expect(row.getByTestId("description-editable")).toBeFocused();
        });

        await row.getByTestId("description-editable").press("Escape");
        const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');
        await actionsCell.focus();
        await actionsCell.press("Enter");
        const inspector = await openTransactionInspector(page);
        await expect(inspector).toHaveAttribute("data-transaction-owner", transactionId);
        await expect(inspector.getByTestId("notes-editable")).toHaveAttribute(
            "data-transaction-owner",
            transactionId
        );
        await expect(grid.getByTestId("notes-editable")).toHaveCount(0, { timeout: 3_000 });
        await expect(grid).toHaveAttribute("aria-rowcount", "2");
        await expect(row).toHaveAttribute("aria-rowindex", "2");

        // Chromium's accessibility tree settles after the DOM and ARIA attributes. Wait on the tree
        // itself so a transient snapshot cannot turn correct containment into a false failure.
        await expect.poll(async () => rowCount(await grid.ariaSnapshot())).toBe(2);
        const snapshot = await grid.ariaSnapshot();

        // The header and data row: without this a snapshot that captured no rows at all would report
        // no strays and pass. Inspector Notes deliberately lives outside the grid.
        expect(rowCount(snapshot)).toBe(2);
        expect(strayRowChildRoles(snapshot)).toEqual([]);

        await test.step("external filter focus parks and retains the range through reconciliation", async () => {
            await createRow(page, "Other Structural Row");
            const dateCell = row.locator('[role="gridcell"][data-cell="date"]');
            const descriptionCell = row.locator('[role="gridcell"][data-cell="description"]');
            await dateCell.click({ position: { x: 1, y: 1 } });
            await dateCell.press("Shift+ArrowRight");
            await expect(dateCell).toHaveAttribute("aria-selected", "true");
            await expect(descriptionCell).toHaveAttribute("aria-selected", "true");

            const filter = page.getByPlaceholder("Search description, notes...");
            await filter.fill("Containment Row");
            await expect(filter).toBeFocused();
            await expect(page.getByTestId("transaction-row")).toHaveCount(1);
            await expect(row.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0);
            await expect(dateCell).toHaveAttribute("tabindex", "0");
            await expect(filter).toBeFocused();

            await filter.clear();
            await expect(filter).toBeFocused();
            await expect(page.getByTestId("transaction-row")).toHaveCount(2);
            await dateCell.focus();
            await expect(dateCell).toHaveAttribute("aria-selected", "true");
            await expect(descriptionCell).toHaveAttribute("aria-selected", "true");
        });
    });

    test("the actions track contains duplicate and delete controls without clipping", async ({
        page
    }) => {
        await page.setViewportSize({ width: 1000, height: 900 });
        await createNewIdentity(page);
        await goToTransactions(page);
        const transactionId = await createRow(page, "Actions Geometry Duplicate");
        const originalRow = page.locator(`[data-transaction-id="${transactionId}"]`);
        const dateCell = originalRow.locator('[role="gridcell"][data-cell="date"]');
        const descriptionCell = originalRow.locator('[role="gridcell"][data-cell="description"]');
        const amountCell = originalRow.locator('[role="gridcell"][data-cell="amount"]');

        await test.step("the 120px Date track keeps a four-digit year unobscured", async () => {
            await dateCell.dblclick();
            const dateEditor = originalRow.getByTestId("date-editable");
            await dateEditor.fill("1/27/1988");
            await descriptionCell.focus();
            await expect(dateEditor).toHaveCount(0);

            const dateDisplay = originalRow.getByTestId("date-display");
            const displayGeometry = await dateDisplay.evaluate((display) => {
                const cell = display.closest('[role="gridcell"]');
                if (!(cell instanceof HTMLElement)) return null;
                const cellRect = cell.getBoundingClientRect();
                const displayRect = display.getBoundingClientRect();
                const cellStyle = getComputedStyle(cell);
                const displayStyle = getComputedStyle(display);
                const paddingLeft = Number.parseFloat(cellStyle.paddingLeft);
                const paddingRight = Number.parseFloat(cellStyle.paddingRight);
                const canvas = display.ownerDocument.createElement("canvas");
                const context = canvas.getContext("2d");
                if (context == null) return null;
                context.font = displayStyle.font;
                const value = display.textContent?.trim() ?? "";
                const textWidth = context.measureText(value).width;
                return {
                    availableContentWidth: cell.clientWidth - paddingLeft - paddingRight,
                    cell: { left: cellRect.left, right: cellRect.right, width: cellRect.width },
                    display: {
                        left: displayRect.left,
                        textRight: displayRect.left + textWidth,
                        textWidth,
                        value
                    },
                    paddingLeft,
                    paddingRight,
                    rowHeight: cell.closest('[role="row"]')?.getBoundingClientRect().height ?? null
                };
            });
            if (displayGeometry == null) throw new Error("date display geometry is unavailable");
            expect(displayGeometry.display.value).toMatch(/1988/);
            expect(displayGeometry.cell.width).toBe(120);
            expect(displayGeometry.paddingLeft).toBe(8);
            expect(displayGeometry.paddingRight).toBe(8);
            expect(displayGeometry.display.textWidth).toBeLessThanOrEqual(
                displayGeometry.availableContentWidth
            );
            expect(displayGeometry.display.left).toBeGreaterThanOrEqual(displayGeometry.cell.left);
            expect(displayGeometry.display.textRight).toBeLessThanOrEqual(
                displayGeometry.cell.right - displayGeometry.paddingRight
            );
            expect(displayGeometry.rowHeight).toBe(57);

            await dateCell.dblclick();
            await expect(dateEditor).toBeFocused();
            await expect(dateEditor).toHaveValue("1/27/1988");
            await expect
                .poll(() =>
                    dateEditor.evaluate((input: HTMLInputElement) => ({
                        end: input.selectionEnd,
                        start: input.selectionStart,
                        valueLength: input.value.length
                    }))
                )
                .toEqual({ end: 9, start: 0, valueLength: 9 });
            const editorGeometry = await dateCell.evaluate((cell) => {
                const input = cell.querySelector('[data-testid="date-editable"]');
                const trigger = cell.querySelector('[data-grid-open-interaction="calendar"]');
                if (!(input instanceof HTMLInputElement) || !(trigger instanceof HTMLElement)) {
                    return null;
                }
                const cellRect = cell.getBoundingClientRect();
                const inputRect = input.getBoundingClientRect();
                const triggerRect = trigger.getBoundingClientRect();
                const inputStyle = getComputedStyle(input);
                const paddingLeft = Number.parseFloat(inputStyle.paddingLeft);
                const paddingRight = Number.parseFloat(inputStyle.paddingRight);
                const canvas = input.ownerDocument.createElement("canvas");
                const context = canvas.getContext("2d");
                if (context == null) return null;
                context.font = inputStyle.font;
                const textWidth = context.measureText(input.value).width;
                const textLeft = inputRect.left + paddingLeft - input.scrollLeft;
                return {
                    availableContentWidth: input.clientWidth - paddingLeft - paddingRight,
                    cell: { left: cellRect.left, right: cellRect.right, width: cellRect.width },
                    input: {
                        paddingLeft,
                        paddingRight,
                        scrollLeft: input.scrollLeft,
                        textLeft,
                        textRight: textLeft + textWidth,
                        textWidth,
                        value: input.value
                    },
                    rowHeight: cell.closest('[role="row"]')?.getBoundingClientRect().height ?? null,
                    trigger: {
                        left: triggerRect.left,
                        right: triggerRect.right,
                        width: triggerRect.width
                    }
                };
            });
            if (editorGeometry == null) throw new Error("date editor geometry is unavailable");
            expect(editorGeometry.input.value).toBe("1/27/1988");
            expect(editorGeometry.input.paddingLeft).toBe(0);
            expect(editorGeometry.input.paddingRight).toBe(24);
            expect(editorGeometry.input.scrollLeft).toBe(0);
            expect(editorGeometry.input.textWidth).toBeLessThanOrEqual(
                editorGeometry.availableContentWidth
            );
            expect(
                Math.abs(editorGeometry.input.textLeft - displayGeometry.display.left)
            ).toBeLessThanOrEqual(0.5);
            expect(editorGeometry.input.textRight).toBeLessThanOrEqual(editorGeometry.trigger.left);
            expect(editorGeometry.trigger.right).toBeLessThanOrEqual(editorGeometry.cell.right);
            expect(editorGeometry.trigger.width).toBe(24);
            expect(editorGeometry.rowHeight).toBe(57);
            await dateEditor.press("Escape");
            await expect(dateEditor).toHaveCount(0);
        });

        await amountCell.dblclick();
        const amount = originalRow.getByTestId("amount-editable");
        await amount.fill("-42.00");
        await amount.press("Enter");
        await expect(amount).toHaveCount(0);
        await expect(amountCell).toContainText("-42.00");

        await importDuplicateOfExistingRow(page);
        // A second identical import makes the prior imported transaction the explicit comparison
        // baseline, independent of how the manual row is classified by import history.
        await importDuplicateOfExistingRow(page);
        const row = page.getByTestId("transaction-row").filter({
            has: page.getByTitle("Potential duplicate")
        });
        await expect(row).toHaveCount(1, { timeout: 15_000 });
        const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');
        const duplicate = row.getByTitle("Potential duplicate");
        const deleteAction = row.getByTestId("delete-button");
        await expect(duplicate).toHaveCount(1);
        await expect(row.getByTestId("expand-notes-button")).toHaveCount(0, { timeout: 3_000 });
        await expect(deleteAction).toHaveCount(1);

        const readActionsGeometry = () =>
            actionsCell.evaluate(
                (cell, selectors) => {
                    const cellRect = cell.getBoundingClientRect();
                    const rowElement = cell.closest<HTMLElement>('[role="row"]');
                    if (rowElement == null) throw new Error("actions cell has no row");
                    const controls = selectors.map((selector) => {
                        const control = cell.querySelector<HTMLElement>(selector);
                        if (control == null) throw new Error(`missing action control ${selector}`);
                        const rect = control.getBoundingClientRect();
                        return {
                            bottom: rect.bottom,
                            left: rect.left,
                            right: rect.right,
                            top: rect.top
                        };
                    });
                    return {
                        cell: {
                            bottom: cellRect.bottom,
                            left: cellRect.left,
                            right: cellRect.right,
                            top: cellRect.top,
                            width: cellRect.width
                        },
                        controls,
                        rowHeight: rowElement.getBoundingClientRect().height
                    };
                },
                ['button[title="Potential duplicate"]', '[data-testid="delete-button"]']
            );
        const expectActionsContained = (
            measured: Awaited<ReturnType<typeof readActionsGeometry>>
        ) => {
            expect(measured.cell.width).toBe(120);
            expect(measured.rowHeight).toBe(57);
            for (const control of measured.controls) {
                expect(control.left).toBeGreaterThanOrEqual(measured.cell.left);
                expect(control.right).toBeLessThanOrEqual(measured.cell.right);
                expect(control.top).toBeGreaterThanOrEqual(measured.cell.top);
                expect(control.bottom).toBeLessThanOrEqual(measured.cell.bottom);
            }
            const horizontalControls = [...measured.controls].sort(
                (first, second) => first.left - second.left
            );
            for (const [index, control] of horizontalControls.entries()) {
                const next = horizontalControls[index + 1];
                if (next != null) expect(control.right).toBeLessThanOrEqual(next.left);
            }
        };
        expectActionsContained(await readActionsGeometry());

        const grid = page.getByTestId("transaction-table");
        const actionsHeader = grid
            .locator('[role="row"][aria-rowindex="1"] > [role="columnheader"]')
            .last();
        const expectActionsTrackAligned = async () => {
            const [headerRect, bodyRect] = await Promise.all([
                actionsHeader.boundingBox(),
                actionsCell.boundingBox()
            ]);
            if (headerRect == null || bodyRect == null)
                throw new Error("actions track is not laid out");
            expect(Math.abs(headerRect.x - bodyRect.x)).toBeLessThan(0.01);
            expect(Math.abs(headerRect.width - bodyRect.width)).toBeLessThan(0.01);
        };
        await expectActionsTrackAligned();
        const scrollState = await grid.evaluate((element) => {
            const scroll = element.parentElement;
            if (!(scroll instanceof HTMLElement)) return null;
            scroll.scrollLeft = scroll.scrollWidth;
            return {
                clientWidth: scroll.clientWidth,
                scrollLeft: scroll.scrollLeft,
                scrollWidth: scroll.scrollWidth
            };
        });
        if (scrollState == null) throw new Error("grid scroll owner is missing");
        expect(scrollState.scrollWidth).toBeGreaterThan(scrollState.clientWidth);
        expect(scrollState.scrollLeft).toBeGreaterThan(0);
        await expectActionsTrackAligned();

        await duplicate.focus();
        await duplicate.press("Enter");
        await expect(duplicate).toBeFocused();
        await expect(duplicate).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByRole("dialog")).toHaveCount(1);
        await duplicate.press("Enter");
        await expect(duplicate).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 3_000 });

        const duplicateTransactionId = await row.getAttribute("data-transaction-id");
        if (duplicateTransactionId == null) throw new Error("duplicate row has no stable identity");
        await actionsCell.focus();
        await actionsCell.press("Enter");
        const inspector = await openTransactionInspector(page);
        await expect(inspector.getByTestId("transaction-inspector-title")).toBeFocused();
        const notes = inspector.getByTestId("notes-editable");
        await expect(notes).toHaveAttribute("data-transaction-owner", duplicateTransactionId);
        await expect(grid.getByTestId("notes-editable")).toHaveCount(0, { timeout: 3_000 });
        await expect(page.getByTestId("notes-row")).toHaveCount(0, { timeout: 3_000 });
        const dataRowCount = await page.getByTestId("transaction-row").count();
        await expect(grid).toHaveAttribute("aria-rowcount", String(dataRowCount + 1));
        await expect(row).toHaveCSS("height", "57px");
        await expect
            .poll(() => grid.evaluate((element) => element.parentElement?.scrollWidth ?? null))
            .toBe(scrollState.scrollWidth);

        await deleteAction.click();
        await expect(deleteAction).toHaveAttribute("title", "Click again to confirm delete");
        const deleteLabel = deleteAction.getByText("Delete", { exact: true });
        await expect(deleteLabel).toBeVisible();
        expectActionsContained(await readActionsGeometry());
        const labelGeometry = await deleteLabel.evaluate((label) => {
            const button = label.closest("button");
            const cell = label.closest('[role="gridcell"]');
            if (!(button instanceof HTMLElement) || !(cell instanceof HTMLElement)) return null;
            const labelRect = label.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();
            const cellRect = cell.getBoundingClientRect();
            return {
                button: {
                    height: buttonRect.height,
                    left: buttonRect.left,
                    right: buttonRect.right,
                    width: buttonRect.width
                },
                cell: { left: cellRect.left, right: cellRect.right },
                label: { left: labelRect.left, right: labelRect.right },
                text: label.textContent
            };
        });
        console.info("__task113_armed_delete__", JSON.stringify(labelGeometry));
        if (labelGeometry == null) throw new Error("armed delete label geometry is missing");
        expect(labelGeometry.text).toBe("Delete");
        expect(labelGeometry.button.width).toBe(48);
        expect(labelGeometry.button.height).toBe(32);
        expect(labelGeometry.label.left).toBeGreaterThanOrEqual(labelGeometry.button.left);
        expect(labelGeometry.label.right).toBeLessThanOrEqual(labelGeometry.button.right);
        expect(labelGeometry.button.left).toBeGreaterThanOrEqual(labelGeometry.cell.left);
        expect(labelGeometry.button.right).toBeLessThanOrEqual(labelGeometry.cell.right);
        await expect(row).toHaveCount(1);
        await expect(row).toHaveCSS("height", "57px");

        await deleteAction.click();
        await expect(row).toHaveCount(0);
    });

    test("a row paged in after a select-all reports itself as selected", async ({ page }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await importRows(page, IMPORTED_ROW_COUNT);

        // Only a fraction of the matching rows have an element at all, which is the premise: the row
        // asserted on below has no element, and no row model entry, at the moment of the select-all.
        expect(await page.getByTestId("transaction-row").count()).toBeLessThan(60);

        await test.step("an offscreen abort fallback reveals before it focuses", async () => {
            const origin = page.locator('[data-index="0"] [role="gridcell"][data-cell="checkbox"]');
            await origin.focus();
            await expect(origin).toBeFocused();

            await origin.evaluate((element, targetIndex) => {
                if (!(element instanceof HTMLElement)) throw new Error("origin is not focusable");
                const root = document.documentElement;
                const gridElement = element.closest('[role="grid"]');
                const scroll = gridElement?.parentElement;
                if (!(scroll instanceof HTMLElement))
                    throw new Error("grid scroll owner is missing");
                root.dataset.task95FocusOrder = "";
                const appendOrder = (event: string) => {
                    root.dataset.task95FocusOrder = `${root.dataset.task95FocusOrder ?? ""}${event},`;
                };
                const originalScrollIntoView = element.scrollIntoView.bind(element);
                element.scrollIntoView = (options) => {
                    const originRect = element.getBoundingClientRect();
                    const scrollRect = scroll.getBoundingClientRect();
                    root.dataset.task95RevealOriginTop = String(originRect.top);
                    root.dataset.task95RevealOriginBottom = String(originRect.bottom);
                    root.dataset.task95RevealScrollTop = String(scrollRect.top);
                    root.dataset.task95RevealScrollBottom = String(scrollRect.bottom);
                    appendOrder("reveal");
                    originalScrollIntoView(options);
                };
                const originalOriginFocus = element.focus.bind(element);
                element.focus = (options) => {
                    const originRect = element.getBoundingClientRect();
                    const scrollRect = scroll.getBoundingClientRect();
                    root.dataset.task95FocusOriginTop = String(originRect.top);
                    root.dataset.task95FocusOriginBottom = String(originRect.bottom);
                    root.dataset.task95FocusScrollTop = String(scrollRect.top);
                    root.dataset.task95FocusScrollBottom = String(scrollRect.bottom);
                    appendOrder("focus");
                    originalOriginFocus(options);
                };

                const originalFocus = HTMLElement.prototype.focus;
                let targetAttempts = 0;
                HTMLElement.prototype.focus = function (options) {
                    const wrapper = this.closest("[data-index]");
                    if (
                        wrapper?.getAttribute("data-index") === targetIndex &&
                        this.getAttribute("data-cell") === "actions"
                    ) {
                        targetAttempts += 1;
                        if (targetAttempts === 1) {
                            const seam = window.__moneyflowTransactionGridRebase;
                            if (seam == null || !seam.forceProjectionRebase()) {
                                throw new Error("transaction grid rebase seam is unavailable");
                            }
                            appendOrder("target-rebased");
                            return;
                        }
                        HTMLElement.prototype.focus = originalFocus;
                        appendOrder("target-blocked");
                        return;
                    }
                    originalFocus.call(this, options);
                };
            }, String(ROW_BEYOND_FIRST_PAGE));

            await origin.press("Control+End");
            await expect
                .poll(
                    () =>
                        page.evaluate(() =>
                            (document.documentElement.dataset.task95FocusOrder ?? "")
                                .split(",")
                                .filter((entry) => entry.length > 0)
                        ),
                    { timeout: 20_000 }
                )
                .toEqual(["target-rebased", "target-blocked", "reveal", "focus"]);
            await expect(origin).toBeFocused();
            const evidence = await page.evaluate(() => {
                const root = document.documentElement;
                return {
                    focus: {
                        bottom: Number(root.dataset.task95FocusOriginBottom),
                        scrollBottom: Number(root.dataset.task95FocusScrollBottom),
                        scrollTop: Number(root.dataset.task95FocusScrollTop),
                        top: Number(root.dataset.task95FocusOriginTop)
                    },
                    order: (root.dataset.task95FocusOrder ?? "")
                        .split(",")
                        .filter((entry) => entry.length > 0),
                    reveal: {
                        bottom: Number(root.dataset.task95RevealOriginBottom),
                        scrollBottom: Number(root.dataset.task95RevealScrollBottom),
                        scrollTop: Number(root.dataset.task95RevealScrollTop),
                        top: Number(root.dataset.task95RevealOriginTop)
                    }
                };
            });
            expect(evidence.order).toEqual(["target-rebased", "target-blocked", "reveal", "focus"]);
            expect(
                evidence.reveal.bottom <= evidence.reveal.scrollTop ||
                    evidence.reveal.top >= evidence.reveal.scrollBottom
            ).toBe(true);
            expect(evidence.focus.top).toBeGreaterThanOrEqual(evidence.focus.scrollTop);
            expect(evidence.focus.bottom).toBeLessThanOrEqual(evidence.focus.scrollBottom);
            await page.evaluate(() => {
                const seam = window.__moneyflowTransactionGridRebase;
                if (seam == null) throw new Error("transaction grid rebase seam is unavailable");
                seam.restoreProjection();
            });
        });

        await page.getByRole("checkbox", { name: "Select all transactions" }).click();
        await expect(page.getByTestId("bulk-edit-toolbar")).toContainText(
            `Edit ${String(IMPORTED_ROW_COUNT)}`
        );

        // Scroll to the end, which pages further rows in and mounts them for the first time.
        const scrollContainer = page.getByTestId("transaction-table").locator("..");
        const pagedInWrapper = page.locator(`[data-index="${String(ROW_BEYOND_FIRST_PAGE)}"]`);
        await expect
            .poll(
                async () => {
                    await scrollContainer.evaluate((element) => {
                        element.scrollTop = element.scrollHeight;
                        element.dispatchEvent(new Event("scroll"));
                    });
                    return pagedInWrapper.count();
                },
                { timeout: 30_000, intervals: [100] }
            )
            .toBe(1);

        // The row was created by the table's row model after the selection was written, and reads
        // that selection through the table. A cached table read leaves this "false".
        await expect(pagedInWrapper.getByTestId("transaction-row")).toHaveAttribute(
            "aria-selected",
            "true"
        );
        await expect(pagedInWrapper.getByRole("checkbox")).toBeChecked();

        const grid = page.getByTestId("transaction-table");
        const logicalColumnCount = await grid
            .locator(':scope > [role="row"] > [role="columnheader"]')
            .count();
        expect(logicalColumnCount).toBeGreaterThan(0);
        await expect(grid).toHaveAttribute("aria-rowcount", String(IMPORTED_ROW_COUNT + 1));
        await expect(grid).toHaveAttribute("aria-colcount", String(logicalColumnCount));
        await expect(pagedInWrapper.getByTestId("transaction-row")).toHaveAttribute(
            "aria-rowindex",
            String(IMPORTED_ROW_COUNT + 1)
        );
        const idleEntryStops = grid.locator('[role="gridcell"][tabindex="0"]');
        await test.step("deep idle scroll retains exactly one mounted entry stop", async () => {
            await expect(idleEntryStops).toHaveCount(1);
            const entryIndex = await idleEntryStops.evaluate((element) => {
                const wrapper = element.closest("[data-index]");
                return wrapper?.getAttribute("data-index") ?? null;
            });
            expect(entryIndex).not.toBeNull();
            expect((await mountedRowIndexes(page)).map(String)).toContain(entryIndex);
        });

        await test.step("canonical navigation materializes exact virtual targets", async () => {
            const idleEntryStop = idleEntryStops.first();
            await idleEntryStop.press("Control+Home");
            const firstCheckbox = grid.locator(
                '[data-index="0"] [role="gridcell"][data-cell="checkbox"]'
            );
            await expect(firstCheckbox).toBeFocused();

            const arrowBoundary = Math.max(...(await mountedRowIndexes(page)));
            expect(arrowBoundary).toBeLessThan(ROW_BEYOND_FIRST_PAGE);
            const arrowSource = grid.locator(
                `[data-index="${String(arrowBoundary)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await arrowSource.evaluate((element) => {
                if (element instanceof HTMLElement) element.focus({ preventScroll: true });
            });
            await arrowSource.press("ArrowDown");
            const arrowTarget = grid.locator(
                `[data-index="${String(arrowBoundary + 1)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await expect(arrowTarget).toBeFocused();

            const actionsIndex = Math.max(...(await mountedRowIndexes(page)));
            const actionsCell = grid.locator(
                `[data-index="${String(actionsIndex)}"] ` + '[role="gridcell"][data-cell="actions"]'
            );
            await actionsCell.evaluate((element) => {
                if (element instanceof HTMLElement) element.focus({ preventScroll: true });
            });
            await actionsCell.press("Tab");
            await expect(actionsCell.getByTestId("delete-button")).toBeFocused();

            const reverseTabBoundary = Math.min(...(await mountedRowIndexes(page)));
            expect(reverseTabBoundary).toBeGreaterThan(0);
            const reverseTabSource = grid.locator(
                `[data-index="${String(reverseTabBoundary)}"] ` +
                    '[role="gridcell"][data-cell="checkbox"]'
            );
            const reverseTabTarget = grid.locator(
                `[data-index="${String(reverseTabBoundary - 1)}"] ` +
                    '[role="gridcell"][data-cell="actions"]'
            );
            await expect(reverseTabTarget).toHaveCount(0);
            await reverseTabSource.evaluate((element) => {
                if (element instanceof HTMLElement) element.focus({ preventScroll: true });
            });
            await reverseTabSource.press("Shift+Tab");
            await expect(reverseTabTarget).toBeFocused();

            const pageBoundary = Math.max(...(await mountedRowIndexes(page)));
            const pageDownDistance = await visibleRowDistance(page);
            expect(pageDownDistance).toBeGreaterThan(1);
            expect(pageBoundary + pageDownDistance).toBeLessThan(ROW_BEYOND_FIRST_PAGE);
            const pageSource = grid.locator(
                `[data-index="${String(pageBoundary)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await pageSource.evaluate((element) => {
                if (element instanceof HTMLElement) element.focus({ preventScroll: true });
            });
            await pageSource.press("PageDown");
            const pageDownIndex = pageBoundary + pageDownDistance;
            const pageDownTarget = grid.locator(
                `[data-index="${String(pageDownIndex)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await expect(pageDownTarget).toBeFocused();

            const pageUpDistance = await visibleRowDistance(page);
            await pageDownTarget.press("PageUp");
            const pageUpIndex = pageDownIndex - pageUpDistance;
            const pageUpTarget = grid.locator(
                `[data-index="${String(pageUpIndex)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await expect(pageUpTarget).toBeFocused();

            const shiftPageDownDistance = await visibleRowDistance(page);
            await pageUpTarget.press("Shift+PageDown");
            const shiftPageDownTarget = grid.locator(
                `[data-index="${String(pageUpIndex + shiftPageDownDistance)}"] ` +
                    '[role="gridcell"][data-cell="description"]'
            );
            await expect(pageUpTarget).toBeFocused();
            await expect(pageUpTarget).toHaveAttribute("aria-selected", "true");
            await expect(shiftPageDownTarget).toHaveAttribute("aria-selected", "true");

            await pageUpTarget.press("Control+End");
            const gridEnd = grid.locator(
                `[data-index="${String(ROW_BEYOND_FIRST_PAGE)}"] ` +
                    '[role="gridcell"][data-cell="actions"]'
            );
            await expect(gridEnd).toBeFocused();
            await expect(gridEnd).toHaveAttribute("aria-selected", "true");
            await expect(gridEnd).toHaveAttribute("aria-colindex", String(logicalColumnCount));
        });
    });
});

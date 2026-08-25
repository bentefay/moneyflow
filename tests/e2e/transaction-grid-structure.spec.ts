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

import { createNewIdentity, goToImportNew, goToTransactions } from "./helpers";
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
        const match = /^(\s*)- ([a-zA-Z]+)/.exec(line);
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
    return ariaSnapshot.split("\n").filter((line) => /^\s*- row\b/.test(line)).length;
}

/** A committed transaction, addressed by the stable id the caret identifies it with. */
async function createRow(page: Page, description: string): Promise<string> {
    const transactionId = await addEmptyTransaction(page);
    const row = page.locator(`[data-transaction-id="${transactionId}"]`);
    await expect(row).toBeVisible();
    const input = row.getByTestId("description-editable");
    await input.fill(description);
    await input.press("Enter");
    await expect(input).toHaveValue(description);
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
        await expect(row.getByTestId("date-editable")).toHaveCount(1);
        await expect(row.getByTestId("description-editable")).toHaveCount(1);
        await expect(row.getByTestId("amount-editable")).toHaveCount(1);
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
            await expect(dateCell).toHaveAttribute("tabindex", "0");

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

        await test.step("forward and reverse boundary re-entry expose the retained range", async () => {
            const checkboxCell = row.locator('[role="gridcell"][data-cell="checkbox"]');
            const actionsCell = row.locator('[role="gridcell"][data-cell="actions"]');
            const selectedCells = row.locator('[role="gridcell"][aria-selected="true"]');

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
            await actionsCell.press("Tab");
            await expect(row.getByTestId("expand-notes-button")).toBeFocused();
            await expect(selectedCells).toHaveCount(0);
            await expect(actionsCell).toHaveAttribute("tabindex", "0");

            await page.keyboard.press("Shift+Tab");
            await expect(actionsCell).toBeFocused();
            await expect(actionsCell).toHaveAttribute("tabindex", "0");
            await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
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
            await expect(row.getByTestId("expand-notes-button")).toBeVisible();
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

        // Expanded, because one virtual index then renders *two* ARIA rows and the second one has
        // its own containment to get right.
        await row.getByTestId("expand-notes-button").click();
        const notesRow = page.getByTestId("notes-row");
        await expect(notesRow).toBeVisible();
        await expect(grid).toHaveAttribute("aria-rowcount", "3");
        await expect(row).toHaveAttribute("aria-rowindex", "2");
        await expect(notesRow).toHaveAttribute("aria-rowindex", "3");
        await expect(notesRow.locator('[data-cell="notes"]')).toHaveAttribute(
            "aria-colspan",
            String(logicalColumnCount - 1)
        );

        const snapshot = await grid.ariaSnapshot();

        // The header row, the data row and the notes row: without this a snapshot that captured no
        // rows at all would report no strays and pass.
        expect(rowCount(snapshot)).toBe(3);
        expect(strayRowChildRoles(snapshot)).toEqual([]);

        await test.step("external filter focus parks and retains the range through reconciliation", async () => {
            await row.getByTestId("expand-notes-button").click();
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

    test("a row paged in after a select-all reports itself as selected", async ({ page }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await importRows(page, IMPORTED_ROW_COUNT);

        // Only a fraction of the matching rows have an element at all, which is the premise: the row
        // asserted on below has no element, and no row model entry, at the moment of the select-all.
        expect(await page.getByTestId("transaction-row").count()).toBeLessThan(60);

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

            const tabBoundary = Math.max(...(await mountedRowIndexes(page)));
            expect(tabBoundary).toBeLessThan(ROW_BEYOND_FIRST_PAGE);
            const tabSource = grid.locator(
                `[data-index="${String(tabBoundary)}"] ` + '[role="gridcell"][data-cell="actions"]'
            );
            await tabSource.evaluate((element) => {
                if (element instanceof HTMLElement) element.focus({ preventScroll: true });
            });
            await tabSource.press("Tab");
            const tabTarget = grid.locator(
                `[data-index="${String(tabBoundary + 1)}"] ` +
                    '[role="gridcell"][data-cell="checkbox"]'
            );
            await expect(tabTarget).toBeFocused();

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

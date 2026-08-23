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

/** Rows to import for the paging test: far beyond one 50-row page. */
const IMPORTED_ROW_COUNT = 500;

/** A row index past the first loaded page, so reaching it requires the cursor to page in. */
const ROW_BEYOND_FIRST_PAGE = 499;

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
        const row = page.locator(`[data-transaction-id="${transactionId}"]`);

        // Expanded, because one virtual index then renders *two* ARIA rows and the second one has
        // its own containment to get right.
        await row.getByTestId("expand-notes-button").click();
        await expect(page.getByTestId("notes-row")).toBeVisible();

        const snapshot = await page.getByTestId("transaction-table").ariaSnapshot();

        // The header row, the data row and the notes row: without this a snapshot that captured no
        // rows at all would report no strays and pass.
        expect(rowCount(snapshot)).toBe(3);
        expect(strayRowChildRoles(snapshot)).toEqual([]);
    });

    test("a row paged in after a select-all reports itself as selected", async ({ page }) => {
        test.setTimeout(120_000);
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
    });
});

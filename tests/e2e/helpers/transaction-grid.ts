import { expect, type Locator, type Page } from "@playwright/test";

export type EditableTransactionColumn = "amount" | "date" | "description" | "status" | "tags";

const EDITOR_TEST_ID = {
    amount: "amount-editable",
    date: "date-editable",
    description: "description-editable",
    status: "status-editable",
    tags: "tags-editable"
} satisfies Readonly<Record<EditableTransactionColumn, string>>;

/** Resolve a row locator once so edits cannot retarget it through a value-based filter. */
export async function stableTransactionRow(row: Locator): Promise<Locator> {
    const transactionId = await row.getAttribute("data-transaction-id");
    if (transactionId == null) throw new Error("Transaction row has no stable ID");
    return row.page().locator(`[data-transaction-id="${transactionId}"]`);
}

/** Reveal the stable transaction inspector without disturbing an already-open panel. */
export async function openTransactionInspector(page: Page): Promise<Locator> {
    const inspector = page.getByTestId("transaction-inspector");
    const toggle = page.getByTestId("transaction-inspector-toggle");
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    await expect(inspector).toBeVisible();
    return inspector;
}

/** The controller-owned outer gridcell for a named transaction column. */
export function transactionGridCell(row: Locator, column: string): Locator {
    return row.locator(`[role="gridcell"][data-cell="${column}"]`);
}

/**
 * Explicitly activates a display-first editable cell and returns its mounted editor.
 *
 * The helper is idempotent for callers that intentionally keep the same editor open across several
 * assertions. A resting cell is always activated through the outer gridcell before its editor is
 * addressed.
 */
export async function activateTransactionEditor(
    row: Locator,
    column: EditableTransactionColumn
): Promise<Locator> {
    const stableRow = await stableTransactionRow(row);
    const cell = transactionGridCell(stableRow, column);
    if ((await cell.getAttribute("data-cell-content")) !== "editor") {
        await expect(cell).toHaveAttribute("data-cell-content", "display");
        await cell.dblclick();
    }

    const editor = stableRow.getByTestId(EDITOR_TEST_ID[column]);
    await expect(cell).toHaveAttribute("data-cell-content", "editor");
    await expect(editor).toBeVisible();
    return editor;
}

/** Assert the committed resting branch and the absence of its editor. */
export async function expectTransactionCellDisplay(
    row: Locator,
    column: EditableTransactionColumn,
    expectedText?: string | RegExp
): Promise<void> {
    const cell = transactionGridCell(row, column);
    await expect(cell).toHaveAttribute("data-cell-content", "display");
    if (expectedText != null) await expect(cell).toContainText(expectedText);
    await expect(row.getByTestId(EDITOR_TEST_ID[column])).toHaveCount(0);
}

/** Assert the exact locale-shaped resting date, not a substring that can hide an extra year. */
export async function expectTransactionDateDisplay(
    row: Locator,
    expectedText: string
): Promise<void> {
    await expectTransactionCellDisplay(row, "date");
    await expect(row.getByTestId("date-display")).toHaveText(expectedText);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rows whose resting description display equals the requested text. */
export function rowsWithDisplayedDescription(page: Page, description: string): Locator {
    return page.getByTestId("transaction-row").filter({
        has: page.getByTestId("description-display").filter({
            hasText: new RegExp(`^${escapeRegExp(description)}$`)
        })
    });
}

/** Resolve a person's allocation gridcell through the labelled logical column index. */
export async function allocationGridCell(row: Locator, personName: string): Promise<Locator> {
    const header = row.page().getByRole("columnheader", {
        name: `${personName} %`,
        exact: true
    });
    const columnIndex = await header.getAttribute("aria-colindex");
    if (columnIndex == null) {
        throw new Error(`Allocation column for ${personName} has no logical column index`);
    }
    return row.locator(`[role="gridcell"][aria-colindex="${columnIndex}"]`);
}

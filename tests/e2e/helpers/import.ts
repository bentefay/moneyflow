import { expect, type Page } from "@playwright/test";

import { goToImportNew } from "./nav";

export interface ImportRowSpec {
    readonly date: string;
    readonly description: string;
}

/**
 * Import one transaction per row into the default account through an inline CSV, landing on
 * /transactions. Row `n` (from 0) has amount `-(n + 1).00`, so rows with the same description still
 * differ by amount.
 */
export async function importTransactionRows(
    page: Page,
    rows: readonly ImportRowSpec[],
    fileName = "rows.csv"
): Promise<void> {
    await goToImportNew(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: fileName,
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

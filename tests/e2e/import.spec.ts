/**
 * E2E Test: Import Wizard Journey
 *
 * Journey-style test covering the complete CSV import flow.
 * Uses test.step() to break complex flows into logical sections.
 *
 * Note: Full import completion and duplicate detection tests are pending
 * the account creation feature. This test covers the wizard steps that
 * are currently functional.
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createNewIdentity, goToImportNew } from "./helpers";

// ============================================================================
// Import-Specific Helpers
// ============================================================================

/**
 * Create a temporary CSV file for testing.
 */
function createTestCSV(content: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Create a sample CSV with standard bank format.
 */
function createSampleBankCSV(): string {
  const content = `Date,Description,Amount,Balance
2024-01-15,"Coffee Shop",-5.50,1000.00
2024-01-16,"Grocery Store",-75.25,924.75
2024-01-17,"Direct Deposit",2500.00,3424.75
2024-01-18,"Gas Station",-45.00,3379.75
2024-01-19,"Restaurant",-32.50,3347.25`;
  return createTestCSV(content);
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Import", () => {
  test("CSV import journey: upload, map columns, and proceed to preview", async ({ page }) => {
    await createNewIdentity(page);

    let csvPath: string;

    await test.step("navigate to import page with file dropzone", async () => {
      await goToImportNew(page);

      await expect(page.getByRole("heading", { name: /Import Transactions/i })).toBeVisible();
      await expect(page.locator('[data-testid="file-dropzone"]')).toBeVisible();
    });

    await test.step("upload CSV file and detect columns", async () => {
      csvPath = createSampleBankCSV();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Should proceed to column mapping step
      await expect(page.getByRole("heading", { name: "Map Columns" })).toBeVisible({
        timeout: 5000,
      });

      // Should show detected columns in the table
      await expect(page.getByText("Date", { exact: true })).toBeVisible();
    });

    await test.step("show column mapping interface with selectors", async () => {
      // Should have mapping dropdowns or selectors
      const mappingSelectors = page
        .locator('[data-testid="column-mapping"]')
        .or(page.locator('select, [role="combobox"]'));
      expect(await mappingSelectors.count()).toBeGreaterThan(0);
    });

    await test.step("allow manual column mapping adjustment", async () => {
      // Find a mapping selector and interact with it
      const dateMapping = page.locator('[data-testid="mapping-date"]').or(page.getByLabel(/date/i));

      if (await dateMapping.isVisible()) {
        await dateMapping.click();
        // Select from dropdown
        await page.getByRole("option", { name: /Date/i }).click();
      }
    });

    await test.step("proceed to preview step", async () => {
      const nextButton = page.getByRole("button", { name: "Next", exact: true });
      await nextButton.click();

      // Should show preview
      await expect(page.getByText(/preview|review/i)).toBeVisible({ timeout: 5000 });
    });

    await test.step("cleanup", async () => {
      fs.unlinkSync(csvPath);
    });
  });

  test("import page shows supported formats", async ({ page }) => {
    await createNewIdentity(page);
    await goToImportNew(page);

    // Should mention supported formats
    await expect(page.getByText(/csv|ofx|qfx/i).first()).toBeVisible();
  });
});

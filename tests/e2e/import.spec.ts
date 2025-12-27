/**
 * E2E Test: Import Wizard Flow
 *
 * Tests the complete import flow:
 * - Upload CSV/OFX files
 * - Configure column mappings
 * - Set formatting options
 * - Preview transactions
 * - Complete import
 * - Duplicate detection
 */

import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a temporary CSV file for testing.
 */
async function createTestCSV(content: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Create a sample CSV with standard bank format.
 */
async function createSampleBankCSV(): Promise<string> {
  const content = `Date,Description,Amount,Balance
2024-01-15,"Coffee Shop",-5.50,1000.00
2024-01-16,"Grocery Store",-75.25,924.75
2024-01-17,"Direct Deposit",2500.00,3424.75
2024-01-18,"Gas Station",-45.00,3379.75
2024-01-19,"Restaurant",-32.50,3347.25`;
  return createTestCSV(content);
}

/**
 * Create a CSV with non-standard format.
 */
async function createCustomFormatCSV(): Promise<string> {
  const content = `Transaction Date;Merchant Name;Debit;Credit;Running Total
15/01/2024;Coffee Shop;5,50;;1000,00
16/01/2024;Grocery Store;75,25;;924,75
17/01/2024;Direct Deposit;;2500,00;3424,75`;
  return createTestCSV(content);
}

/**
 * Authenticate and navigate to import page.
 */
async function setupAuthenticatedSession(page: Page): Promise<void> {
  await page.goto("/new-user");

  // Generate seed phrase
  const generateButton = page
    .locator('[data-testid="generate-button"]')
    .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
  await generateButton.click();

  // Wait for seed phrase and reveal if hidden
  await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });
  const revealButton = page.getByRole("button", { name: /reveal/i }).first();
  if (await revealButton.isVisible()) {
    await revealButton.click();
  }

  // Confirm and continue
  const checkbox = page.locator('[data-testid="confirm-checkbox"]').or(page.getByRole("checkbox"));
  await checkbox.check();

  const continueButton = page
    .locator('[data-testid="continue-button"]')
    .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
  await continueButton.click();

  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

/**
 * Navigate to import page (assumes authenticated).
 */
async function goToImports(page: Page): Promise<void> {
  await page.goto("/imports/new");
  // Wait for the page title to appear (ensures page has compiled and loaded)
  await page.getByRole("heading", { name: /Import Transactions/i }).waitFor({ timeout: 15000 });
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Import Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test("should display import page with file dropzone", async ({ page }) => {
    await goToImports(page);

    // Page title
    await expect(page.getByRole("heading", { name: /Import Transactions/i })).toBeVisible();

    // File dropzone should be visible (use specific test id)
    const dropzone = page.locator('[data-testid="file-dropzone"]');
    await expect(dropzone).toBeVisible();
  });

  test("should show supported file formats", async ({ page }) => {
    await goToImports(page);

    // Should mention supported formats (use first match to avoid strict mode)
    await expect(page.getByText(/csv|ofx|qfx/i).first()).toBeVisible();
  });
});

test.describe("CSV Import", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await goToImports(page);
  });

  test("should accept CSV file upload", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Should proceed to column mapping step
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Cleanup
    fs.unlinkSync(csvPath);
  });

  test("should detect CSV columns automatically", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for mapping step to appear (indicates columns were detected)
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Should show detected columns in the table
    await expect(page.getByText('Date', { exact: true })).toBeVisible();

    // Cleanup
    fs.unlinkSync(csvPath);
  });

  test("should show column mapping interface", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for mapping step
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Should have mapping dropdowns or selectors
    const mappingSelectors = page
      .locator('[data-testid="column-mapping"]')
      .or(page.locator('select, [role="combobox"]'));
    expect(await mappingSelectors.count()).toBeGreaterThan(0);

    fs.unlinkSync(csvPath);
  });

  test("should allow manual column mapping", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Find a mapping selector and change it
    const dateMapping = page.locator('[data-testid="mapping-date"]').or(page.getByLabel(/date/i));

    if (await dateMapping.isVisible()) {
      await dateMapping.click();
      // Select from dropdown
      await page.getByRole("option", { name: /Date/i }).click();
    }

    fs.unlinkSync(csvPath);
  });

  test("should proceed to preview step", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for mapping step
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Click next/continue
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await nextButton.click();

    // Should show preview
    await expect(page.getByText(/preview|review/i)).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(csvPath);
  });

  // TODO: This test requires completing the full wizard which needs account selection
  test.skip("should show transaction preview with parsed data", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Navigate to preview
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Should show parsed transactions
    await expect(page.getByText("Coffee Shop")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Grocery Store")).toBeVisible();
    await expect(page.getByText("Direct Deposit")).toBeVisible();

    fs.unlinkSync(csvPath);
  });

  // TODO: This test requires account selection to complete import
  test.skip("should complete import and redirect to transactions", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Go through wizard steps
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();

    await expect(page.getByText(/preview|review/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /import|complete|finish/i }).click();

    // Should redirect to transactions
    await page.waitForURL("**/transactions", { timeout: 10000 });

    // Imported transactions should be visible
    await expect(page.getByText("Coffee Shop")).toBeVisible();

    fs.unlinkSync(csvPath);
  });
});

// TODO: Formatting options tests need full wizard flow with account setup
test.describe.skip("Formatting Options", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await goToImports(page);
  });

  test("should show formatting step for custom CSV", async ({ page }) => {
    const csvPath = await createCustomFormatCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for wizard
    await page.waitForTimeout(1000);

    // Should have formatting options available
    const formattingSection = page.getByText(/format|separator|date format/i);
    await expect(formattingSection).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(csvPath);
  });

  test("should allow changing decimal separator", async ({ page }) => {
    const csvPath = await createCustomFormatCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await page.waitForTimeout(1000);

    // Find decimal separator option
    const decimalOption = page
      .locator('[data-testid="decimal-separator"]')
      .or(page.getByLabel(/decimal/i));

    if (await decimalOption.isVisible()) {
      await decimalOption.click();
      await page.getByRole("option", { name: /comma/i }).click();
    }

    fs.unlinkSync(csvPath);
  });

  test("should allow changing date format", async ({ page }) => {
    const csvPath = await createCustomFormatCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await page.waitForTimeout(1000);

    // Find date format option
    const dateFormatOption = page
      .locator('[data-testid="date-format"]')
      .or(page.getByLabel(/date format/i));

    if (await dateFormatOption.isVisible()) {
      await dateFormatOption.click();
      await page.getByRole("option", { name: /dd\/mm\/yyyy/i }).click();
    }

    fs.unlinkSync(csvPath);
  });
});

// TODO: Import Templates tests need full wizard flow with account setup
test.describe.skip("Import Templates", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await goToImports(page);
  });

  test("should show template selector", async ({ page }) => {
    const templateSelector = page
      .locator('[data-testid="template-selector"]')
      .or(page.getByText(/template|saved|preset/i));
    await expect(templateSelector).toBeVisible();
  });

  test("should save template after successful import", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Navigate through wizard
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Look for save template option
    const saveTemplateOption = page
      .getByLabel(/save template|remember/i)
      .or(page.locator('[data-testid="save-template"]'));

    if (await saveTemplateOption.isVisible()) {
      await saveTemplateOption.check();

      // Enter template name
      const nameInput = page
        .locator('[data-testid="template-name"]')
        .or(page.getByPlaceholder(/template name/i));
      if (await nameInput.isVisible()) {
        await nameInput.fill("My Bank Import");
      }
    }

    fs.unlinkSync(csvPath);
  });

  test("should apply saved template to new import", async ({ page }) => {
    // First, create a template
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Complete import with template save
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();
    await expect(page.getByText(/preview|review/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /import|complete/i }).click();
    await page.waitForURL("**/transactions", { timeout: 10000 });

    // Go back to import
    await goToImports(page);

    // Check for saved template
    const templateSelector = page
      .locator('[data-testid="template-selector"]')
      .or(page.getByRole("combobox", { name: /template/i }));

    if (await templateSelector.isVisible()) {
      await templateSelector.click();
      // Template should be available
      await expect(page.getByRole("option")).toBeVisible({ timeout: 3000 });
    }

    fs.unlinkSync(csvPath);
  });
});

// TODO: Duplicate Detection tests need to import transactions first (requires account setup)
test.describe.skip("Duplicate Detection", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);

    // First import some transactions
    await goToImports(page);
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /import|complete/i }).click();
    await page.waitForURL("**/transactions", { timeout: 10000 });

    fs.unlinkSync(csvPath);
  });

  test("should detect duplicates when reimporting same file", async ({ page }) => {
    // Import same data again
    await goToImports(page);
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Navigate to preview
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Should show duplicate warnings
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5000 });
    const duplicateWarning = page.getByText(/duplicate|already exists|potential match/i);
    await expect(duplicateWarning).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(csvPath);
  });

  test("should mark duplicates in preview", async ({ page }) => {
    await goToImports(page);
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5000 });

    // Duplicates should be visually marked
    const duplicateBadge = page
      .locator('[data-testid="duplicate-badge"]')
      .or(page.locator(".duplicate-indicator"));
    expect(await duplicateBadge.count()).toBeGreaterThan(0);

    fs.unlinkSync(csvPath);
  });

  test("should allow importing duplicates with warning", async ({ page }) => {
    await goToImports(page);
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /next|continue/i }).click();
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5000 });

    // Should still be able to import
    const importButton = page.getByRole("button", { name: /import|complete/i });
    await expect(importButton).toBeEnabled();
    await importButton.click();

    // Should complete import
    await page.waitForURL("**/transactions", { timeout: 10000 });

    fs.unlinkSync(csvPath);
  });
});

// TODO: OFX Import tests need implementation verification
test.describe.skip("OFX Import", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await goToImports(page);
  });

  test("should accept OFX file type", async ({ page }) => {
    // Create a minimal OFX file
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE></STATUS>
<DTSERVER>20240115120000</DTSERVER>
<LANGUAGE>ENG</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1</TRNUID>
<STATUS><CODE>0</CODE></STATUS>
<STMTRS>
<CURDEF>USD</CURDEF>
<BANKACCTFROM>
<BANKID>123456789</BANKID>
<ACCTID>987654321</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101</DTSTART>
<DTEND>20240131</DTEND>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240115</DTPOSTED>
<TRNAMT>-50.00</TRNAMT>
<FITID>12345</FITID>
<NAME>OFX Test Merchant</NAME>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const tmpDir = os.tmpdir();
    const ofxPath = path.join(tmpDir, `test-import-${Date.now()}.ofx`);
    fs.writeFileSync(ofxPath, ofxContent);

    // Upload OFX file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(ofxPath);

    // Should proceed without column mapping (OFX is structured)
    await expect(page.getByText(/preview|OFX Test Merchant/i)).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(ofxPath);
  });
});

// TODO: Error Handling tests need careful validation of error messages
test.describe.skip("Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await goToImports(page);
  });

  test("should reject unsupported file types", async ({ page }) => {
    // Create a non-CSV/OFX file
    const tmpDir = os.tmpdir();
    const txtPath = path.join(tmpDir, `test-import-${Date.now()}.txt`);
    fs.writeFileSync(txtPath, "This is not a valid import file");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(txtPath);

    // Should show error
    await expect(page.getByText(/unsupported|invalid|error/i)).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(txtPath);
  });

  test("should handle empty CSV gracefully", async ({ page }) => {
    const tmpDir = os.tmpdir();
    const csvPath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, "");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Should show error or empty state
    await expect(page.getByText(/empty|no data|no transactions/i)).toBeVisible({ timeout: 5000 });

    fs.unlinkSync(csvPath);
  });

  test("should handle malformed CSV", async ({ page }) => {
    const tmpDir = os.tmpdir();
    const csvPath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, 'col1,col2,col3\n"unclosed quote,value,value\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Should show error or attempt to parse
    await page.waitForTimeout(2000);

    // Either shows error or parses with warning
    const response = page.getByText(/error|warning|issue|parsed/i);
    await expect(response).toBeVisible();

    fs.unlinkSync(csvPath);
  });

  test("should allow canceling import", async ({ page }) => {
    const csvPath = await createSampleBankCSV();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for wizard to load
    await expect(page.getByRole('heading', { name: 'Map Columns' })).toBeVisible({ timeout: 5000 });

    // Cancel button should be available
    const cancelButton = page.getByRole("button", { name: /cancel|back|close/i });
    await cancelButton.click();

    // Should reset or go back
    const dropzone = page
      .locator('[data-testid="file-dropzone"]')
      .or(page.getByText(/drag and drop|upload/i));
    await expect(dropzone).toBeVisible();

    fs.unlinkSync(csvPath);
  });
});

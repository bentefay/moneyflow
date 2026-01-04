/**
 * E2E Test: Import Panel Journey
 *
 * Journey-style test covering the complete CSV/OFX import flow
 * with the new tabbed configuration panel (ImportPanel).
 * Uses test.step() to break complex flows into logical sections.
 *
 * Features tested:
 * - File upload (CSV and OFX)
 * - Side-by-side preview (raw data + parsed preview)
 * - Tabbed configuration (Template, Columns, Format, Duplicates, Account)
 * - Account selection validation
 * - Duplicate detection settings
 */

import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createNewIdentity, goToImportNew } from "./helpers";

// ============================================================================
// Import-Specific Helpers
// ============================================================================

/**
 * Create a temporary file for testing.
 */
function createTestFile(content: string, extension: string): string {
	const tmpDir = os.tmpdir();
	const filePath = path.join(tmpDir, `test-import-${Date.now()}.${extension}`);
	fs.writeFileSync(filePath, content);
	return filePath;
}

/**
 * Create a sample CSV with standard bank format.
 */
function createSampleBankCSV(): string {
	const content = `Date,Description,Amount,Balance
2024-01-15,Coffee Shop,-5.50,1000.00
2024-01-16,Grocery Store,-75.25,924.75
2024-01-17,Direct Deposit,2500.00,3424.75
2024-01-18,Gas Station,-45.00,3379.75
2024-01-19,Restaurant,-32.50,3347.25`;
	return createTestFile(content, "csv");
}

/**
 * Create a sample OFX file.
 */
function createSampleOFX(): string {
	const content = `OFXHEADER:100
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
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20240120120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240115
<DTEND>20240120
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-5.50
<FITID>2024011501
<NAME>Coffee Shop
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240117
<TRNAMT>2500.00
<FITID>2024011701
<NAME>Direct Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>3347.25
<DTASOF>20240120
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
	return createTestFile(content, "ofx");
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Import Panel", () => {
	test("CSV import journey: upload, configure tabs, and see preview", async ({ page }) => {
		await createNewIdentity(page);

		let csvPath: string;

		await test.step("navigate to import page with file dropzone", async () => {
			await goToImportNew(page);

			await expect(page.getByRole("heading", { name: /Import Transactions/i })).toBeVisible();
			await expect(page.locator('[data-testid="file-dropzone"]')).toBeVisible();
		});

		await test.step("upload CSV file and see split preview", async () => {
			csvPath = createSampleBankCSV();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath);

			// Should show file name and stats (6 rows including header)
			await expect(page.getByText(/\.csv/i)).toBeVisible({ timeout: 5000 });
			await expect(page.getByText(/6 rows/i)).toBeVisible();
		});

		await test.step("verify tabbed configuration panel", async () => {
			// Should show config tabs
			await expect(page.getByRole("tab", { name: /Template/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Columns/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Format/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Duplicates/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Account/i })).toBeVisible();
		});

		await test.step("access column mapping tab", async () => {
			await page.getByRole("tab", { name: /Columns/i }).click();

			// Should show column mapping controls
			await expect(page.getByText(/date|amount|description/i).first()).toBeVisible();
		});

		await test.step("access account tab and see selection required", async () => {
			await page.getByRole("tab", { name: /Account/i }).click();

			// Should show account selector
			await expect(page.getByText(/target account/i)).toBeVisible();
		});

		await test.step("verify summary statistics", async () => {
			// Should show summary stats
			await expect(page.getByText(/total rows/i)).toBeVisible();
			// "Valid" label in summary card
			await expect(page.getByText("Valid", { exact: true })).toBeVisible();
		});

		await test.step("cleanup", async () => {
			fs.unlinkSync(csvPath);
		});
	});

	test("OFX import journey: upload and see auto-parsed data", async ({ page }) => {
		await createNewIdentity(page);

		let ofxPath: string;

		await test.step("navigate to import page", async () => {
			await goToImportNew(page);
			await expect(page.locator('[data-testid="file-dropzone"]')).toBeVisible();
		});

		await test.step("upload OFX file", async () => {
			ofxPath = createSampleOFX();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(ofxPath);

			// Should show file type as "OFX" in the header stats
			await expect(page.getByText(/OFX • \d+ rows/i)).toBeVisible({ timeout: 5000 });
		});

		await test.step("verify OFX-specific tab visibility", async () => {
			// OFX should NOT show Columns or Format tabs (they're CSV-only)
			await expect(page.getByRole("tab", { name: /Template/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Duplicates/i })).toBeVisible();
			await expect(page.getByRole("tab", { name: /Account/i })).toBeVisible();
		});

		await test.step("verify transactions are parsed", async () => {
			// Should show import button with transaction count
			await expect(page.getByRole("button", { name: /Import \d+ Transactions/i })).toBeVisible();
		});

		await test.step("cleanup", async () => {
			fs.unlinkSync(ofxPath);
		});
	});

	test("import page shows supported formats", async ({ page }) => {
		await createNewIdentity(page);
		await goToImportNew(page);

		// Should mention supported formats
		await expect(page.getByText(/csv|ofx/i).first()).toBeVisible();
	});

	test("duplicate detection settings are configurable", async ({ page }) => {
		await createNewIdentity(page);

		let csvPath: string;

		await test.step("upload CSV file", async () => {
			await goToImportNew(page);
			csvPath = createSampleBankCSV();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath);

			// 6 rows including header
			await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 });
		});

		await test.step("access duplicates tab", async () => {
			await page.getByRole("tab", { name: /Duplicates/i }).click();

			// Should show duplicate detection section
			await expect(page.getByText(/duplicate detection/i)).toBeVisible();
		});

		await test.step("configure date matching", async () => {
			// Should show date matching options
			await expect(page.getByText(/date matching/i)).toBeVisible();
			await expect(page.getByLabel(/exact date match/i)).toBeVisible();
		});

		await test.step("configure description matching", async () => {
			// Should show description matching options
			await expect(page.getByText(/description matching/i)).toBeVisible();
		});

		await test.step("configure old transaction filter", async () => {
			// Should show old transaction filter options
			await expect(page.getByText(/old transaction filter/i)).toBeVisible();
			// "Cutoff:" label specifically
			await expect(page.getByText("Cutoff:", { exact: true })).toBeVisible();
		});

		await test.step("cleanup", async () => {
			fs.unlinkSync(csvPath);
		});
	});

	test("CSV import creates transactions and auto-saves template on first import", async ({
		page,
	}) => {
		await createNewIdentity(page);

		let csvPath: string;

		await test.step("upload CSV file", async () => {
			await goToImportNew(page);
			csvPath = createSampleBankCSV();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 });
		});

		await test.step("configure column mappings", async () => {
			await page.getByRole("tab", { name: /Columns/i }).click();
			// Wait for tab panel to be visible
			const autoDetectBtn = page.getByRole("button", { name: /Auto-detect/i });
			await expect(autoDetectBtn).toBeVisible();
			// Click "Auto-detect" button to map columns
			await autoDetectBtn.click();
			// Wait for mappings to apply - check for the green "All required fields mapped" message
			await expect(page.getByText(/All required fields mapped/i)).toBeVisible({ timeout: 5000 });
		});

		await test.step("select target account", async () => {
			await page.getByRole("tab", { name: /Account/i }).click();

			// Select the default account created during identity setup
			const accountSelect = page.locator("#account-select");
			await accountSelect.click();
			// Select the "Default" account by name
			await page.getByRole("option", { name: /Default/i }).click();
		});

		await test.step("verify import button is enabled and click", async () => {
			// Should show import button with transaction count (5 data rows)
			const importButton = page.getByRole("button", { name: /Import \d+ Transactions/i });
			await expect(importButton).toBeEnabled({ timeout: 5000 });
			await importButton.click();
		});

		await test.step("verify redirected to transactions page with new transactions", async () => {
			// Should redirect to transactions page
			await expect(page).toHaveURL(/\/transactions/);

			// Should show all 5 imported transactions - check for rows containing description text
			await expect(page.getByRole("row", { name: /Coffee Shop/i })).toBeVisible({ timeout: 5000 });
			await expect(page.getByRole("row", { name: /Direct Deposit/i })).toBeVisible();
			await expect(page.getByText("5 transactions")).toBeVisible();
		});

		await test.step("verify template was auto-saved on first import", async () => {
			// Navigate back to import page
			await goToImportNew(page);
			csvPath = createSampleBankCSV();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath);

			await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 });

			// Go to Template tab - should now have auto-saved template
			await page.getByRole("tab", { name: /Template/i }).click();

			// The auto-saved template should be visible in the template selector dropdown
			const templateCombobox = page.getByRole("combobox", { name: /Import Template/i });
			await expect(templateCombobox).toContainText(/test-import-\d+/i);
		});

		await test.step("cleanup", async () => {
			fs.unlinkSync(csvPath);
		});
	});

	test("selecting template and importing auto-updates template config", async ({ page }) => {
		await createNewIdentity(page);

		let csvPath: string;
		let csvPath2: string;

		await test.step("first import to create template", async () => {
			await goToImportNew(page);
			csvPath = createSampleBankCSV();

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath);
			await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 });

			// Configure column mappings
			await page.getByRole("tab", { name: /Columns/i }).click();
			await page.getByRole("button", { name: /Auto-detect/i }).click();

			// Select account
			await page.getByRole("tab", { name: /Account/i }).click();
			await expect(page.getByText(/Target Account/i)).toBeVisible();
			const accountSelect = page.locator("#account-select");
			await accountSelect.click();
			await expect(page.getByRole("option", { name: /Default/i })).toBeVisible();
			await page.getByRole("option", { name: /Default/i }).click();

			// Import
			const importBtn = page.getByRole("button", { name: /Import \d+ Transactions/i });
			await expect(importBtn).toBeEnabled({ timeout: 5000 });
			await importBtn.click();
			await expect(page).toHaveURL(/\/transactions/);
		});

		await test.step("second import with template selected and modified config", async () => {
			await goToImportNew(page);
			// Create a CSV with different transaction data to avoid duplicate detection
			csvPath2 = createTestFile(
				`Date,Description,Amount,Balance
2024-02-01,Office Supplies,-125.00,5000.00
2024-02-02,Client Payment,3500.00,8500.00
2024-02-03,Utility Bill,-89.99,8410.01`,
				"csv"
			);

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(csvPath2);
			await expect(page.getByText(/4 rows/i)).toBeVisible({ timeout: 5000 });

			// Select the auto-saved template from the Template tab
			await page.getByRole("tab", { name: /Template/i }).click();
			// Use the template selector (select dropdown)
			const templateTrigger = page.locator("#template-select");
			await templateTrigger.click();
			// Select the first non-"No template" option (the auto-saved template)
			await page.getByRole("option", { name: /test-import-\d+/i }).click();

			// Change a config setting (e.g., date matching mode)
			await page.getByRole("tab", { name: /Duplicates/i }).click();
			const exactDateCheckbox = page.getByLabel(/exact date match/i);
			const wasChecked = await exactDateCheckbox.isChecked();
			await exactDateCheckbox.click();

			// Select account
			await page.getByRole("tab", { name: /Account/i }).click();
			const accountSelect2 = page.locator("#account-select");
			await accountSelect2.click();
			await page.getByRole("option", { name: /Default/i }).click();

			// Import (should auto-update template)
			const importBtn = page.getByRole("button", { name: /Import \d+ Transactions/i });
			await expect(importBtn).toBeEnabled({ timeout: 5000 });
			await importBtn.click();
			await expect(page).toHaveURL(/\/transactions/);

			// Verify the config change was saved by checking on third import
			await goToImportNew(page);
			const csvPath3 = createTestFile(
				`Date,Description,Amount,Balance
2024-03-01,Test Transaction,-50.00,1000.00`,
				"csv"
			);
			const fileInput2 = page.locator('input[type="file"]');
			await fileInput2.setInputFiles(csvPath3);
			await expect(page.getByText(/2 rows/i)).toBeVisible({ timeout: 5000 });

			// Select template and check if config persisted
			await page.getByRole("tab", { name: /Template/i }).click();
			const templateTrigger2 = page.locator("#template-select");
			await templateTrigger2.click();
			await page.getByRole("option", { name: /test-import-\d+/i }).click();

			await page.getByRole("tab", { name: /Duplicates/i }).click();
			const exactDateCheckbox2 = page.getByLabel(/exact date match/i);
			// Should now have the toggled value
			await expect(exactDateCheckbox2).toHaveAttribute(
				"aria-checked",
				wasChecked ? "false" : "true"
			);

			// Cleanup temp files
			fs.unlinkSync(csvPath3);
		});

		await test.step("cleanup", async () => {
			fs.unlinkSync(csvPath);
			fs.unlinkSync(csvPath2);
		});
	});
});

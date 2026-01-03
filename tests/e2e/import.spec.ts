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
2024-01-15,"Coffee Shop",-5.50,1000.00
2024-01-16,"Grocery Store",-75.25,924.75
2024-01-17,"Direct Deposit",2500.00,3424.75
2024-01-18,"Gas Station",-45.00,3379.75
2024-01-19,"Restaurant",-32.50,3347.25`;
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
});

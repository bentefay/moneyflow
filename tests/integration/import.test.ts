/**
 * Import Processor Integration Tests
 *
 * Tests for the complete import processing flow.
 */

import { describe, expect, it } from "vitest";
import type { ColumnMapping } from "@/components/features/import/ColumnMappingStep";
import type { ImportFormatting } from "@/components/features/import/FormattingStep";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";
import { parseNumber } from "@/lib/import/csv";
import {
	type ExistingTransaction,
	processCSVImport,
	processImport,
	processOFXImport,
} from "@/lib/import/processor";
import type { ISODateString } from "@/types";

/** Helper to create MoneyMinorUnits from an integer */
function cents(value: number): MoneyMinorUnits {
	return asMinorUnits(value);
}

/** Create a branded ISODateString for tests (bypasses runtime validation) */
function isoDate(date: string): ISODateString {
	return date as ISODateString;
}

// ============================================================================
// Test Data
// ============================================================================

const DEFAULT_FORMATTING: ImportFormatting = {
	thousandSeparator: ",",
	decimalSeparator: ".",
	dateFormat: "yyyy-MM-dd",
	negateAmounts: false,
	amountInCents: false,
};

const STANDARD_MAPPINGS: ColumnMapping[] = [
	{ sourceColumn: "Date", targetField: "date", samples: [] },
	{ sourceColumn: "Description", targetField: "description", samples: [] },
	{ sourceColumn: "Amount", targetField: "amount", samples: [] },
];

const SIMPLE_CSV = `Date,Description,Amount
2024-01-15,COFFEE SHOP,-5.50
2024-01-14,GROCERY STORE,-45.00
2024-01-13,PAYCHECK,2500.00`;

const COMPLEX_CSV = `Date,Merchant,Memo,Amount,Category
2024-01-15,AMAZON,Order #12345,-25.99,Shopping
2024-01-14,STARBUCKS,Coffee,-5.50,Food & Drink
2024-01-13,SHELL,Gas Fill,-45.00,Transportation`;

const SIMPLE_OFX = `OFXHEADER:100
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
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240131120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>1234567890
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101120000
<DTEND>20240131120000
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115120000
<TRNAMT>-5.50
<FITID>202401150001
<NAME>COFFEE SHOP
<MEMO>PURCHASE
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240114120000
<TRNAMT>-45.00
<FITID>202401140001
<NAME>GROCERY STORE
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

// ============================================================================
// processCSVImport tests
// ============================================================================

describe("processCSVImport", () => {
	describe("basic CSV processing", () => {
		it("processes simple CSV correctly", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions).toHaveLength(3);
			expect(result.errors).toHaveLength(0);
			expect(result.stats.totalRows).toBe(3);
			expect(result.stats.validRows).toBe(3);
		});

		it("extracts date correctly", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions[0].date).toBe("2024-01-15");
			expect(result.transactions[1].date).toBe("2024-01-14");
			expect(result.transactions[2].date).toBe("2024-01-13");
		});

		it("extracts amount correctly", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			// Amounts are returned in cents (MoneyMinorUnits)
			expect(result.transactions[0].amount).toBe(-550); // -$5.50
			expect(result.transactions[1].amount).toBe(-4500); // -$45.00
			expect(result.transactions[2].amount).toBe(250000); // $2500.00
		});

		it("extracts description as merchant when no merchant column", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions[0].merchant).toBe("COFFEE SHOP");
			expect(result.transactions[1].merchant).toBe("GROCERY STORE");
		});
	});

	describe("complex CSV with multiple columns", () => {
		const complexMappings: ColumnMapping[] = [
			{ sourceColumn: "Date", targetField: "date", samples: [] },
			{ sourceColumn: "Merchant", targetField: "merchant", samples: [] },
			{ sourceColumn: "Memo", targetField: "memo", samples: [] },
			{ sourceColumn: "Amount", targetField: "amount", samples: [] },
			{ sourceColumn: "Category", targetField: "category", samples: [] },
		];

		it("processes all columns correctly", () => {
			const result = processCSVImport(COMPLEX_CSV, complexMappings, DEFAULT_FORMATTING);

			expect(result.transactions).toHaveLength(3);

			const firstTx = result.transactions[0];
			expect(firstTx.date).toBe("2024-01-15");
			expect(firstTx.merchant).toBe("AMAZON");
			expect(firstTx.description).toBe("Order #12345");
			expect(firstTx.amount).toBe(-2599); // -$25.99 in cents
			expect(firstTx.categoryHint).toBe("Shopping");
		});
	});

	describe("formatting options", () => {
		it("handles European format (comma decimal)", () => {
			// European CSV uses semicolon separator to avoid confusion with comma decimal
			// Example format (not yet used, but parsing is tested via parseNumber):
			// Date;Amount
			// 2024-01-15;-5,50
			// 2024-01-14;-45,00

			// For now, we test parseNumber directly since CSV separator is not yet configurable
			// in processCSVImport. This test verifies the number parsing handles European format.
			// Note: Real-world European CSV import would need separator configuration.
			const result = parseNumber("-5,50", ".", ",");
			expect(result).toBe(-5.5);

			const result2 = parseNumber("-45,00", ".", ",");
			expect(result2).toBe(-45);
		});

		it("handles different date formats", () => {
			const usDateCSV = `Date,Description,Amount
01/15/2024,COFFEE,-5.50`;

			const usFormatting: ImportFormatting = {
				...DEFAULT_FORMATTING,
				dateFormat: "MM/dd/yyyy",
			};

			const result = processCSVImport(usDateCSV, STANDARD_MAPPINGS, usFormatting);

			expect(result.transactions[0].date).toBe("2024-01-15");
		});

		it("negates amounts when option is set", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, {
				...DEFAULT_FORMATTING,
				negateAmounts: true,
			});

			expect(result.transactions[0].amount).toBe(550); // Was -550, now positive
			expect(result.transactions[2].amount).toBe(-250000); // Was 250000, now negative
		});

		it("handles amounts in cents", () => {
			const centsCSV = `Date,Description,Amount
2024-01-15,COFFEE,-550`;

			const result = processCSVImport(centsCSV, STANDARD_MAPPINGS, {
				...DEFAULT_FORMATTING,
				amountInCents: true,
			});

			// When amountInCents is true, we don't multiply by 100
			expect(result.transactions[0].amount).toBe(-550); // Already cents
		});
	});

	describe("error handling", () => {
		it("reports rows with invalid dates", () => {
			const badDateCSV = `Date,Description,Amount
invalid-date,COFFEE,-5.50
2024-01-15,VALID,-10.00`;

			const result = processCSVImport(badDateCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].rowIndex).toBe(0);
			expect(result.errors[0].errors.some((e) => e.includes("date"))).toBe(true);
		});

		it("reports rows with invalid amounts", () => {
			const badAmountCSV = `Date,Description,Amount
2024-01-15,COFFEE,not-a-number
2024-01-14,VALID,-10.00`;

			const result = processCSVImport(badAmountCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].errors.some((e) => e.includes("amount"))).toBe(true);
		});

		it("reports rows missing required fields", () => {
			const missingFieldCSV = `Date,Description,Amount
,COFFEE,-5.50
2024-01-15,VALID,`;

			const result = processCSVImport(missingFieldCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.transactions).toHaveLength(0);
			expect(result.errors).toHaveLength(2);
		});

		it("includes original row data in errors", () => {
			const badCSV = `Date,Description,Amount
bad-date,COFFEE,-5.50`;

			const result = processCSVImport(badCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.errors[0].row).toEqual(["bad-date", "COFFEE", "-5.50"]);
		});
	});

	describe("duplicate detection", () => {
		it("detects duplicates against existing transactions", () => {
			const existingTransactions: ExistingTransaction[] = [
				{
					id: "existing-1",
					date: isoDate("2024-01-15"),
					amount: cents(-550), // -$5.50 in cents
					description: "COFFEE SHOP",
				},
			];

			const result = processCSVImport(
				SIMPLE_CSV,
				STANDARD_MAPPINGS,
				DEFAULT_FORMATTING,
				existingTransactions
			);

			const duplicate = result.transactions.find((t) => t.isDuplicate);
			expect(duplicate).toBeDefined();
			expect(duplicate?.duplicateOfId).toBe("existing-1");
			expect(result.stats.duplicateCount).toBe(1);
		});

		it("marks non-duplicates as not duplicate", () => {
			const result = processCSVImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING, []);

			expect(result.transactions.every((t) => !t.isDuplicate)).toBe(true);
			expect(result.stats.duplicateCount).toBe(0);
		});
	});

	describe("statistics", () => {
		it("calculates stats correctly", () => {
			const mixedCSV = `Date,Description,Amount
2024-01-15,VALID,-5.50
bad-date,INVALID,-10.00
2024-01-14,VALID,-20.00`;

			const result = processCSVImport(mixedCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

			expect(result.stats.totalRows).toBe(3);
			expect(result.stats.validRows).toBe(2);
			expect(result.stats.errorRows).toBe(1);
		});
	});
});

// ============================================================================
// processOFXImport tests
// ============================================================================

describe("processOFXImport", () => {
	/** Helper to assert success and return data */
	function expectSuccess(result: ReturnType<typeof processOFXImport>) {
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected success");
		return result.data;
	}

	it("processes OFX file correctly", () => {
		const result = processOFXImport(SIMPLE_OFX);
		const data = expectSuccess(result);

		expect(data.transactions).toHaveLength(2);
		expect(data.errors).toHaveLength(0);
	});

	it("extracts transaction data correctly", () => {
		const result = processOFXImport(SIMPLE_OFX);
		const data = expectSuccess(result);

		const firstTx = data.transactions[0];
		expect(firstTx.date).toBe("2024-01-15");
		expect(firstTx.amount).toBe(-550); // -$5.50 in cents
		expect(firstTx.merchant).toBe("COFFEE SHOP");
		expect(firstTx.description).toBe("PURCHASE");
	});

	it("preserves FITID as transaction ID", () => {
		const result = processOFXImport(SIMPLE_OFX);
		const data = expectSuccess(result);

		expect(data.transactions[0].id).toBe("202401150001");
		expect(data.transactions[1].id).toBe("202401140001");
	});

	it("detects duplicates against existing transactions", () => {
		const existingTransactions: ExistingTransaction[] = [
			{
				id: "existing-1",
				date: isoDate("2024-01-15"),
				amount: cents(-550), // -$5.50 in cents
				description: "PURCHASE", // OFX uses MEMO as description for duplicate matching
			},
		];

		const result = processOFXImport(SIMPLE_OFX, { existingTransactions });
		const data = expectSuccess(result);

		expect(data.stats.duplicateCount).toBe(1);
	});

	it("returns stats correctly", () => {
		const result = processOFXImport(SIMPLE_OFX);
		const data = expectSuccess(result);

		expect(data.stats.totalRows).toBe(2);
		expect(data.stats.validRows).toBe(2);
		expect(data.stats.errorRows).toBe(0);
	});

	describe("currency validation", () => {
		it("succeeds when expectedCurrency matches OFX currency", () => {
			const result = processOFXImport(SIMPLE_OFX, { expectedCurrency: "USD" });
			expect(result.ok).toBe(true);
		});

		it("succeeds with case-insensitive currency match", () => {
			const result = processOFXImport(SIMPLE_OFX, { expectedCurrency: "usd" });
			expect(result.ok).toBe(true);
		});

		it("fails when expectedCurrency mismatches OFX currency", () => {
			const result = processOFXImport(SIMPLE_OFX, { expectedCurrency: "EUR" });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain("Currency mismatch");
				expect(result.error).toContain("USD");
				expect(result.error).toContain("EUR");
			}
		});

		it("returns detected currency in result", () => {
			const result = processOFXImport(SIMPLE_OFX);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.currency).toBe("USD");
			}
		});
	});
});

// ============================================================================
// processImport tests (auto-detect format)
// ============================================================================

describe("processImport", () => {
	/** Helper to assert success and return data */
	function expectSuccess(result: ReturnType<typeof processImport>) {
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected success");
		return result.data;
	}

	it("auto-detects OFX format", () => {
		const result = processImport(SIMPLE_OFX, STANDARD_MAPPINGS, DEFAULT_FORMATTING);
		const data = expectSuccess(result);

		// OFX transactions have FITID as ID
		expect(data.transactions[0].id).toContain("20240115");
	});

	it("auto-detects CSV format", () => {
		const result = processImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);
		const data = expectSuccess(result);

		// CSV transactions have generated IDs
		expect(data.transactions[0].id).toContain("import-");
	});

	it("passes through duplicate detection for both formats", () => {
		// For CSV, the description field matches directly
		const csvExisting: ExistingTransaction[] = [
			{
				id: "existing-1",
				date: isoDate("2024-01-15"),
				amount: cents(-550), // -$5.50 in cents
				description: "COFFEE SHOP",
			},
		];

		// For OFX, the description maps to MEMO field
		const ofxExisting: ExistingTransaction[] = [
			{
				id: "existing-1",
				date: isoDate("2024-01-15"),
				amount: cents(-550), // -$5.50 in cents
				description: "PURCHASE", // OFX MEMO field
			},
		];

		const csvResult = processImport(SIMPLE_CSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING, csvExisting);
		const ofxResult = processImport(SIMPLE_OFX, STANDARD_MAPPINGS, DEFAULT_FORMATTING, ofxExisting);

		const csvData = expectSuccess(csvResult);
		const ofxData = expectSuccess(ofxResult);

		expect(csvData.stats.duplicateCount).toBeGreaterThan(0);
		expect(ofxData.stats.duplicateCount).toBeGreaterThan(0);
	});
});

// ============================================================================
// Real-world bank export scenarios
// ============================================================================

describe("real-world bank exports", () => {
	it("handles Chase CSV format", () => {
		const chaseCSV = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2024,01/16/2024,COFFEE SHOP,Food & Drink,Sale,-5.50,
01/14/2024,01/15/2024,GAS STATION,Gas,Sale,-45.00,`;

		const chaseMappings: ColumnMapping[] = [
			{ sourceColumn: "Transaction Date", targetField: "date", samples: [] },
			{ sourceColumn: "Description", targetField: "merchant", samples: [] },
			{ sourceColumn: "Category", targetField: "category", samples: [] },
			{ sourceColumn: "Amount", targetField: "amount", samples: [] },
			{ sourceColumn: "Memo", targetField: "memo", samples: [] },
		];

		const chaseFormatting: ImportFormatting = {
			...DEFAULT_FORMATTING,
			dateFormat: "MM/dd/yyyy",
		};

		const result = processCSVImport(chaseCSV, chaseMappings, chaseFormatting);

		expect(result.transactions).toHaveLength(2);
		expect(result.transactions[0].date).toBe("2024-01-15");
		expect(result.transactions[0].merchant).toBe("COFFEE SHOP");
		expect(result.transactions[0].amount).toBe(-550); // -$5.50 in cents
		expect(result.transactions[0].categoryHint).toBe("Food & Drink");
	});

	it("handles Bank of America CSV format", () => {
		const boaCSV = `Date,Description,Amount,Running Bal.
01/15/2024,"AMAZON.COM*AMZN.COM/BI, WA",-25.99,1234.56
01/14/2024,DIRECT DEPOSIT,2500.00,1260.55`;

		const boaMappings: ColumnMapping[] = [
			{ sourceColumn: "Date", targetField: "date", samples: [] },
			{ sourceColumn: "Description", targetField: "description", samples: [] },
			{ sourceColumn: "Amount", targetField: "amount", samples: [] },
		];

		const boaFormatting: ImportFormatting = {
			...DEFAULT_FORMATTING,
			dateFormat: "MM/dd/yyyy",
		};

		const result = processCSVImport(boaCSV, boaMappings, boaFormatting);

		expect(result.transactions).toHaveLength(2);
		expect(result.transactions[0].merchant).toBe("AMAZON.COM*AMZN.COM/BI, WA");
		expect(result.transactions[0].amount).toBe(-2599); // -$25.99 in cents
	});

	it("handles large import batch", () => {
		// Generate 1000 rows
		const rows = Array.from({ length: 1000 }, (_, i) => {
			const date = new Date(2024, 0, 1 + (i % 31));
			const dateStr = date.toISOString().split("T")[0];
			return `${dateStr},Transaction ${i},-${(i * 1.5).toFixed(2)}`;
		});

		const largeCSV = `Date,Description,Amount\n${rows.join("\n")}`;

		const result = processCSVImport(largeCSV, STANDARD_MAPPINGS, DEFAULT_FORMATTING);

		expect(result.transactions).toHaveLength(1000);
		expect(result.stats.validRows).toBe(1000);
	});
});

/**
 * OFX Parser Unit Tests
 *
 * Tests for parsing OFX (Open Financial Exchange) and QFX files.
 * Uses the @f-o-t/ofx library which requires properly formatted OFX.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import { isOFXFormat, type OFXParseResult, type ParsedOFXData, parseOFX } from "@/lib/import/ofx";

// ============================================================================
// Test Helpers
// ============================================================================

/** Assert result is successful and return the data */
function expectSuccess(result: OFXParseResult): ParsedOFXData {
	if (!result.ok) {
		throw new Error(
			`Expected success but got error: ${result.error.message}\n${result.error.details.join("\n")}`
		);
	}
	return result.data;
}

/** Assert result is an error */
function expectError(result: OFXParseResult): void {
	expect(result.ok).toBe(false);
}

// ============================================================================
// Sample OFX Data
// ============================================================================

// Note: @f-o-t/ofx requires properly formatted OFX with all required fields
const MINIMAL_OFX = `OFXHEADER:100
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
<TRNTYPE>CREDIT
<DTPOSTED>20240114120000
<TRNAMT>2500.00
<FITID>202401140001
<NAME>DIRECT DEPOSIT
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1234.56
<DTASOF>20240131120000
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const XML_STYLE_OFX = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20240131120000</DTSERVER>
<LANGUAGE>ENG</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<TRNUID>1001</TRNUID>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<CCSTMTRS>
<CURDEF>USD</CURDEF>
<CCACCTFROM>
<ACCTID>4111111111111111</ACCTID>
</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101120000</DTSTART>
<DTEND>20240131120000</DTEND>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240120120000</DTPOSTED>
<TRNAMT>-45.00</TRNAMT>
<FITID>CC20240120001</FITID>
<NAME>GAS STATION</NAME>
</STMTTRN>
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

const EMPTY_OFX = `
OFXHEADER:100
<OFX>
</OFX>
`;

// Helper to create a minimal valid OFX with a single transaction
function makeOFX(trnFields: string): string {
	return `OFXHEADER:100
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
${trnFields}
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

// ============================================================================
// parseOFX tests
// ============================================================================

describe("parseOFX", () => {
	describe("result type", () => {
		it("returns ok: true on success", () => {
			const result = parseOFX(MINIMAL_OFX);
			expect(result.ok).toBe(true);
		});

		it("returns ok: false on parse error", () => {
			const result = parseOFX(EMPTY_OFX);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toBeDefined();
				expect(result.error.details.length).toBeGreaterThan(0);
			}
		});

		it("returns ok: false for malformed OFX", () => {
			const result = parseOFX("<OFX><BANKTRANLIST></BANKTRANLIST></OFX>");
			expect(result.ok).toBe(false);
		});
	});

	describe("basic parsing", () => {
		it("parses minimal OFX file with one statement", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));

			expect(data.statements).toHaveLength(1);
			const stmt = data.statements[0];

			expect(stmt.account.accountId).toBe("1234567890");
			expect(stmt.account.accountType).toBe("CHECKING");
			expect(stmt.account.bankId).toBe("123456789");
			expect(stmt.currency).toBe("USD");
			expect(stmt.transactions).toHaveLength(2);
		});

		it("parses transactions correctly", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));
			const transactions = data.statements[0].transactions;

			// First transaction - debit
			const debit = transactions.find((t) => t.amount < 0);
			expect(debit).toBeDefined();
			expect(debit?.fitId).toBe("202401150001");
			expect(debit?.type).toBe("DEBIT");
			expect(debit?.datePosted).toEqual(Temporal.PlainDate.from("2024-01-15"));
			expect(debit?.amount).toBe(-5.5);
			expect(debit?.name).toBe("COFFEE SHOP");
			expect(debit?.memo).toBe("PURCHASE");

			// Second transaction - credit
			const credit = transactions.find((t) => t.amount > 0);
			expect(credit).toBeDefined();
			expect(credit?.fitId).toBe("202401140001");
			expect(credit?.type).toBe("CREDIT");
			expect(credit?.amount).toBe(2500);
			expect(credit?.name).toBe("DIRECT DEPOSIT");
		});

		it("extracts date range", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));
			const stmt = data.statements[0];

			expect(stmt.dateRange).not.toBeNull();
			expect(stmt.dateRange?.start).toBe("2024-01-01");
			expect(stmt.dateRange?.end).toBe("2024-01-31");
		});

		it("extracts balance information", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));
			const stmt = data.statements[0];

			expect(stmt.balance.ledgerBalance).toBeDefined();
			expect(stmt.balance.ledgerBalance?.amount).toBe(1234.56);
			expect(stmt.balance.ledgerBalance?.asOfDate).toBe("2024-01-31");
		});

		it("extracts server date", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));
			expect(data.serverDate).toBe("2024-01-31");
		});
	});

	describe("XML-style OFX", () => {
		it("parses XML-formatted OFX", () => {
			const data = expectSuccess(parseOFX(XML_STYLE_OFX));

			expect(data.statements).toHaveLength(1);
			const stmt = data.statements[0];

			expect(stmt.account.accountId).toBe("4111111111111111");
			expect(stmt.account.accountType).toBe("CREDITCARD");
			expect(stmt.transactions).toHaveLength(1);
		});

		it("handles date with time component", () => {
			const data = expectSuccess(parseOFX(XML_STYLE_OFX));
			const tx = data.statements[0].transactions[0];

			expect(tx.datePosted).toEqual(Temporal.PlainDate.from("2024-01-20"));
		});
	});

	describe("credit card accounts", () => {
		it("detects credit card account type", () => {
			const data = expectSuccess(parseOFX(XML_STYLE_OFX));
			expect(data.statements[0].account.accountType).toBe("CREDITCARD");
		});

		it("credit card accounts have no bankId", () => {
			const data = expectSuccess(parseOFX(XML_STYLE_OFX));
			expect(data.statements[0].account.bankId).toBeUndefined();
		});
	});

	describe("error cases", () => {
		it("returns error for empty OFX", () => {
			const result = parseOFX(EMPTY_OFX);
			expectError(result);
		});

		it("returns error for completely invalid content", () => {
			const result = parseOFX("not an ofx file at all");
			expectError(result);
		});

		it("returns error with details for malformed OFX", () => {
			const result = parseOFX("<OFX><BANKTRANLIST></BANKTRANLIST></OFX>");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.details.length).toBeGreaterThan(0);
			}
		});
	});

	describe("date parsing", () => {
		it("parses dates with time component", () => {
			const ofx = makeOFX(`<TRNTYPE>DEBIT
<DTPOSTED>20240115120000
<TRNAMT>-1
<FITID>1`);
			const data = expectSuccess(parseOFX(ofx));
			expect(data.statements[0].transactions[0].datePosted).toEqual(
				Temporal.PlainDate.from("2024-01-15")
			);
		});

		it("parses dates with timezone", () => {
			const ofx = makeOFX(`<TRNTYPE>DEBIT
<DTPOSTED>20240115120000[-5:EST]
<TRNAMT>-1
<FITID>1`);
			const data = expectSuccess(parseOFX(ofx));
			// Library converts to UTC - 12:00 EST = 17:00 UTC on Jan 15
			// The exact date depends on library's timezone handling
			const datePosted = data.statements[0].transactions[0].datePosted;
			expect(datePosted.year).toBe(2024);
			expect(datePosted.month).toBe(1);
			expect(datePosted.day).toBeGreaterThanOrEqual(15);
			expect(datePosted.day).toBeLessThanOrEqual(16);
		});
	});

	describe("amount parsing", () => {
		const amountTestCases = [
			{ amount: "-100.50", expected: -100.5 },
			{ amount: "2500.00", expected: 2500 },
			{ amount: "-0.01", expected: -0.01 },
			{ amount: "0", expected: 0 },
		];

		for (const tc of amountTestCases) {
			it(`parses amount "${tc.amount}"`, () => {
				const ofx = makeOFX(`<TRNTYPE>DEBIT
<DTPOSTED>20240101120000
<TRNAMT>${tc.amount}
<FITID>1`);
				const data = expectSuccess(parseOFX(ofx));
				expect(data.statements[0].transactions[0].amount).toBe(tc.expected);
			});
		}
	});

	describe("transaction types", () => {
		const typeTestCases = ["DEBIT", "CREDIT", "CHECK", "ATM", "POS", "FEE", "XFER", "OTHER"];

		for (const type of typeTestCases) {
			it(`preserves transaction type ${type}`, () => {
				const ofx = makeOFX(`<TRNTYPE>${type}
<DTPOSTED>20240101120000
<TRNAMT>-10
<FITID>1`);
				const data = expectSuccess(parseOFX(ofx));
				expect(data.statements[0].transactions[0].type).toBe(type);
			});
		}
	});

	describe("check numbers", () => {
		it("extracts check number when present", () => {
			const ofx = makeOFX(`<TRNTYPE>CHECK
<DTPOSTED>20240101120000
<TRNAMT>-100
<FITID>1
<CHECKNUM>1234`);
			const data = expectSuccess(parseOFX(ofx));
			expect(data.statements[0].transactions[0].checkNumber).toBe("1234");
		});

		it("returns undefined when no check number", () => {
			const data = expectSuccess(parseOFX(MINIMAL_OFX));
			expect(data.statements[0].transactions[0].checkNumber).toBeUndefined();
		});
	});
});

// ============================================================================
// isOFXFormat tests
// ============================================================================

describe("isOFXFormat", () => {
	const positiveTestCases = [
		{ name: "OFXHEADER", content: "OFXHEADER:100\n<OFX>" },
		{ name: "<OFX> tag", content: "<OFX><DATA></DATA></OFX>" },
		{ name: "<OFX with attributes", content: '<OFX VERSION="2.0">' },
		{ name: "<?OFX processing instruction", content: '<?OFX OFXHEADER="200"?>' },
	];

	const negativeTestCases = [
		{ name: "CSV", content: "date,amount\n2024-01-01,100" },
		{ name: "JSON", content: '{"transactions":[]}' },
		{ name: "plain text", content: "This is just some text" },
		{ name: "empty", content: "" },
	];

	for (const tc of positiveTestCases) {
		it(`detects OFX: ${tc.name}`, () => {
			expect(isOFXFormat(tc.content)).toBe(true);
		});
	}

	for (const tc of negativeTestCases) {
		it(`rejects non-OFX: ${tc.name}`, () => {
			expect(isOFXFormat(tc.content)).toBe(false);
		});
	}
});

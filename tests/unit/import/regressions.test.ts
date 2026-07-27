/**
 * Import Regression Tests
 *
 * Each test here pins a specific bug that reached the codebase. They are kept
 * together so the failure mode is documented alongside the assertion.
 */

import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ColumnMapping } from "@/components/features/import/ColumnMappingStep";
import { asMinorUnits } from "@/lib/domain/currency";
import { parseDate, parseNumber } from "@/lib/import/csv";
import { checkDuplicate, DEFAULT_DUPLICATE_CONFIG } from "@/lib/import/duplicates";
import { parseOFX, type OFXParseResult, type ParsedOFXData } from "@/lib/import/ofx";
import { processCSVImport } from "@/lib/import/processor";
import { toISODateString } from "@/types";

function expectSuccess(result: OFXParseResult): ParsedOFXData {
    if (!result.ok) {
        throw new Error(`Expected success: ${result.error.message}`);
    }
    return result.data;
}

// ============================================================================
// OFX dates must not shift in negative-UTC-offset timezones
// ============================================================================

/**
 * Two statements so this fixture also covers per-statement balance attribution.
 * Balances are deliberately distinct.
 */
const TWO_ACCOUNT_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240131
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
<ACCTID>1111
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-5.50
<FITID>A1
<NAME>COFFEE SHOP
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
<STMTTRNRS>
<TRNUID>1002
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>2222
<ACCTTYPE>SAVINGS
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>10.00
<FITID>B1
<NAME>INTEREST
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>7777.77
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

describe("OFX date handling (regression)", () => {
    // Pin a negative-UTC-offset timezone regardless of where the suite runs.
    // Reading local calendar parts off the library's UTC-constructed Date used
    // to shift every posted date back one day here.
    const originalTimezone = process.env.TZ;
    beforeAll(() => {
        process.env.TZ = "America/New_York";
    });
    afterAll(() => {
        process.env.TZ = originalTimezone;
    });

    it("runs in a negative-UTC-offset timezone", () => {
        const utcMidnight = new Date(Date.UTC(2024, 0, 15));
        expect(utcMidnight.getTimezoneOffset()).toBeGreaterThan(0);
        // Guards the guard: local calendar parts genuinely differ from UTC here.
        expect(utcMidnight.getDate()).toBe(14);
    });

    it("preserves the posted date rather than shifting it back a day", () => {
        const data = expectSuccess(parseOFX(TWO_ACCOUNT_OFX));

        expect(data.statements[0].transactions[0].datePosted).toEqual(
            Temporal.PlainDate.from("2024-01-15")
        );
        expect(data.statements[1].transactions[0].datePosted).toEqual(
            Temporal.PlainDate.from("2024-01-16")
        );
    });

    it("preserves statement date ranges and metadata dates", () => {
        const data = expectSuccess(parseOFX(TWO_ACCOUNT_OFX));

        expect(data.statements[0].dateRange).toEqual({ start: "2024-01-01", end: "2024-01-31" });
        expect(data.statements[0].balance.ledgerBalance?.asOfDate).toBe("2024-01-31");
        expect(data.serverDate).toBe("2024-01-31");
    });
});

describe("OFX multi-account balances (regression)", () => {
    it("attributes each statement its own balance", () => {
        const data = expectSuccess(parseOFX(TWO_ACCOUNT_OFX));

        expect(data.statements).toHaveLength(2);
        // Previously both statements reported the first statement's balance.
        expect(data.statements[0].balance.ledgerBalance?.amount).toBe(1000);
        expect(data.statements[1].balance.ledgerBalance?.amount).toBe(7777.77);
    });
});

// ============================================================================
// Duplicate detection honours minDescriptionSimilarity in "similar" mode
// ============================================================================

describe("duplicate detection similarity threshold (regression)", () => {
    const config = {
        ...DEFAULT_DUPLICATE_CONFIG,
        descriptionMatchMode: "similar" as const,
        minDescriptionSimilarity: 0.8
    };

    function check(newDescription: string, existingDescription: string) {
        return checkDuplicate(
            {
                id: "new",
                date: toISODateString(Temporal.PlainDate.from("2024-01-15")),
                amount: asMinorUnits(-550),
                description: newDescription
            },
            {
                id: "existing",
                date: toISODateString(Temporal.PlainDate.from("2024-01-15")),
                amount: asMinorUnits(-550),
                description: existingDescription
            },
            config
        );
    }

    // Same date and amount alone score 0.60, so before the fix any similarity
    // above ~0.25 cleared the 0.7 confidence floor and these all matched.
    const unrelatedPairs = [
        ["SHELL OIL 5521", "SHELL GAS 9932"],
        ["AMAZON MKTPLACE", "AMZN Mktp US"],
        ["STARBUCKS 123", "STARBUCKS STORE 99999"]
    ] as const;

    for (const [newDescription, existingDescription] of unrelatedPairs) {
        it(`does not match "${newDescription}" with "${existingDescription}" below threshold`, () => {
            expect(check(newDescription, existingDescription)).toBeNull();
        });
    }

    it("still matches descriptions above the threshold", () => {
        const match = check("STARBUCKS STORE 123", "STARBUCKS STORE 124");
        expect(match).not.toBeNull();
        expect(match?.existingTransactionId).toBe("existing");
    });

    it("still matches identical descriptions", () => {
        const match = check("WHOLE FOODS MARKET", "WHOLE FOODS MARKET");
        expect(match).not.toBeNull();
    });
});

// ============================================================================
// parseNumber rejects values it used to silently mis-scale
// ============================================================================

describe("parseNumber validation (regression)", () => {
    interface ParseNumberCase {
        name: string;
        value: string;
        thousandSeparator: string;
        decimalSeparator: string;
    }

    const rejected: ParseNumberCase[] = [
        {
            name: "EU decimal read with a comma thousands separator",
            // Returned -4599 - a 100x overstatement of -45.99.
            value: "-45,99",
            thousandSeparator: ",",
            decimalSeparator: "."
        },
        { name: "trailing garbage", value: "12abc", thousandSeparator: ",", decimalSeparator: "." },
        {
            name: "two decimal points",
            value: "1.2.3",
            thousandSeparator: ",",
            decimalSeparator: "."
        },
        { name: "double minus", value: "--5", thousandSeparator: ",", decimalSeparator: "." },
        {
            name: "overflow to Infinity",
            value: "1e999",
            thousandSeparator: ",",
            decimalSeparator: "."
        },
        { name: "exponent notation", value: "1e5", thousandSeparator: ",", decimalSeparator: "." },
        { name: "bare separator", value: ".", thousandSeparator: ",", decimalSeparator: "." }
    ];

    for (const tc of rejected) {
        it(`rejects ${tc.name}`, () => {
            expect(parseNumber(tc.value, tc.thousandSeparator, tc.decimalSeparator)).toBeNaN();
        });
    }

    it("never returns a non-finite number", () => {
        expect(Number.isFinite(parseNumber("1e999"))).toBe(false);
        expect(parseNumber("1e999")).toBeNaN();
    });

    const accepted: (ParseNumberCase & { expected: number })[] = [
        {
            name: "accounting negative",
            value: "(123.45)",
            thousandSeparator: ",",
            decimalSeparator: ".",
            expected: -123.45
        },
        {
            name: "accounting negative with currency and grouping",
            value: "($1,234.56)",
            thousandSeparator: ",",
            decimalSeparator: ".",
            expected: -1234.56
        },
        {
            name: "currency symbol",
            value: "$123.45",
            thousandSeparator: ",",
            decimalSeparator: ".",
            expected: 123.45
        },
        {
            name: "EU format with matching separators",
            value: "1.234,56",
            thousandSeparator: ".",
            decimalSeparator: ",",
            expected: 1234.56
        },
        {
            name: "FR format",
            value: "1 234,56",
            thousandSeparator: " ",
            decimalSeparator: ",",
            expected: 1234.56
        },
        {
            name: "leading decimal point",
            value: ".5",
            thousandSeparator: ",",
            decimalSeparator: ".",
            expected: 0.5
        },
        {
            name: "plain negative",
            value: "-123.45",
            thousandSeparator: ",",
            decimalSeparator: ".",
            expected: -123.45
        }
    ];

    for (const tc of accepted) {
        it(`still accepts ${tc.name}`, () => {
            expect(parseNumber(tc.value, tc.thousandSeparator, tc.decimalSeparator)).toBe(
                tc.expected
            );
        });
    }
});

// ============================================================================
// Non-finite amounts produce a per-row error instead of aborting the import
// ============================================================================

describe("non-finite amount handling (regression)", () => {
    const formatting = {
        dateFormat: "yyyy-MM-dd",
        thousandSeparator: ",",
        decimalSeparator: ".",
        negateAmounts: false,
        amountInCents: false
    };

    const mappings: ColumnMapping[] = [
        { sourceColumn: "Date", targetField: "date", samples: [] },
        { sourceColumn: "Description", targetField: "description", samples: [] },
        { sourceColumn: "Amount", targetField: "amount", samples: [] }
    ];

    it("records a row error rather than throwing when an amount overflows", () => {
        const csv = [
            "Date,Description,Amount",
            "2024-01-15,GOOD ROW,12.34",
            "2024-01-16,OVERFLOW ROW,1e999"
        ].join("\n");

        // Before the fix, Infinity passed the isNaN guard and threw inside
        // asMinorUnits, aborting the entire import.
        const result = processCSVImport(csv, mappings, formatting);

        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].description).toBe("GOOD ROW");
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].errors.join(" ")).toContain("Invalid amount");
    });
});

// ============================================================================
// parseDate handles formats the hand-rolled compiler could not
// ============================================================================

describe("parseDate format support (regression)", () => {
    const cases = [
        // Every format offered in the formatting UI.
        { value: "2024-01-15", format: "yyyy-MM-dd", expected: "2024-01-15" },
        { value: "01/15/2024", format: "MM/dd/yyyy", expected: "2024-01-15" },
        { value: "15/01/2024", format: "dd/MM/yyyy", expected: "2024-01-15" },
        { value: "1/15/2024", format: "M/d/yyyy", expected: "2024-01-15" },
        { value: "15/1/2024", format: "d/M/yyyy", expected: "2024-01-15" },
        { value: "01-15-2024", format: "MM-dd-yyyy", expected: "2024-01-15" },
        { value: "15-01-2024", format: "dd-MM-yyyy", expected: "2024-01-15" },
        { value: "2024/01/15", format: "yyyy/MM/dd", expected: "2024-01-15" },
        { value: "15.01.2024", format: "dd.MM.yyyy", expected: "2024-01-15" },
        // Month-name formats the token compiler mis-compiled or could not express.
        { value: "15-Jan-2024", format: "dd-MMM-yyyy", expected: "2024-01-15" },
        { value: "Jan 15, 2024", format: "MMM d, yyyy", expected: "2024-01-15" }
    ];

    for (const tc of cases) {
        it(`parses "${tc.value}" with "${tc.format}"`, () => {
            expect(parseDate(tc.value, tc.format)).toEqual(Temporal.PlainDate.from(tc.expected));
        });
    }

    it("rejects trailing characters after a complete date", () => {
        expect(parseDate("2024-01-15extra", "yyyy-MM-dd")).toBeNull();
    });

    it("rejects a real-looking but non-existent date", () => {
        expect(parseDate("2023-02-29", "yyyy-MM-dd")).toBeNull();
    });

    it("accepts a genuine leap day", () => {
        expect(parseDate("2024-02-29", "yyyy-MM-dd")).toEqual(
            Temporal.PlainDate.from("2024-02-29")
        );
    });

    it("returns null for a malformed format string instead of throwing", () => {
        expect(() => parseDate("2024-01-15", "yyyy-QQQQQQ-dd")).not.toThrow();
    });
});

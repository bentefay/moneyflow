/**
 * UR-008 — CSV import parity with OFX, and honest import counts
 *
 * A CSV export and an OFX export of the same account activity must import to
 * the same result, and the summary must describe its own counts truthfully.
 *
 * The fixtures here are SYNTHETIC. They reproduce the STRUCTURE of the file the
 * defect was reported against - no header row, `dd/MM/yyyy` dates, every field
 * after the date quoted, amounts carrying an explicit leading plus, and a
 * quoted description containing a comma - without reproducing any of its data.
 *
 * The four defects this pins, each observed against the code before the fix:
 *
 * 1. `parseNumber` had no branch for a leading "+", so `+69.00` failed
 *    magnitude validation and every credit row was reported as an error.
 * 2. Column detection matched HEADER NAMES. A headerless file gets synthesised
 *    names ("Column 1", ...), which match nothing, so detection returned {}.
 * 3. With no mapped date column, format detection received no samples at all,
 *    so it silently left the ISO default in place. Separately, it read a single
 *    sample, which cannot resolve dd/MM versus MM/dd when that sample's leading
 *    field is 12 or less.
 * 4. Rows excluded for being old were counted in one bucket, which could not
 *    say whether a row was excluded for its age or for being a duplicate.
 */

import { describe, expect, it } from "vitest";

import { asMinorUnits } from "@/lib/domain/currency";
import { parseCSV, parseNumber } from "@/lib/import/csv";
import { detectColumnMappingsFromValues, inferDateFormat } from "@/lib/import/detection";
import { processOFXImport } from "@/lib/import/processor";
import {
    DEFAULT_FORMATTING_SETTINGS,
    type PreviewTransaction,
    type PreviewTransactionStatus,
    summarizePreview
} from "@/lib/import/types";

// ============================================================================
// Synthetic fixtures
// ============================================================================

/**
 * The synthetic activity, as plain data. Both the CSV and the OFX fixture are
 * generated from THIS, so a parity assertion compares two encodings of one
 * source rather than two hand-written files that could drift apart.
 *
 * Twelve rows, chosen deliberately rather than for round numbers. Whole-column
 * date inference cannot be exercised by a handful of rows: the first ELEVEN
 * dates all have a leading field of 12 or less, so every one of them reads
 * equally well as `MM/dd/yyyy`, and any sample of the opening rows - which is
 * what the old detector took - is uniformly ambiguous. Only the twelfth value,
 * `30/06/2026`, has a leading field above 12 and settles the column. That is
 * the minimum shape that distinguishes whole-column inference from sampling,
 * and it is far cheaper than the 622 rows of the reported file.
 */
const SYNTHETIC_ACTIVITY = [
    { date: "01/07/2026", amount: "-45.00", description: "COFFEE SHOP   MAIN ST" },
    { date: "02/07/2026", amount: "+69.00", description: "PAYMENT RECEIVED, THANK YOU" },
    { date: "03/07/2026", amount: "-12.34", description: "GROCERY MART" },
    { date: "04/07/2026", amount: "-8.20", description: "BUS FARE" },
    { date: "05/07/2026", amount: "+1250.00", description: "SALARY   JULY" },
    { date: "06/07/2026", amount: "-99.99", description: "PHONE BILL" },
    { date: "07/07/2026", amount: "-23.45", description: "PHARMACY, LATE NIGHT" },
    { date: "08/07/2026", amount: "-6.13", description: "PARKING" },
    { date: "09/07/2026", amount: "+15.75", description: "REFUND" },
    { date: "10/07/2026", amount: "-64.10", description: "HARDWARE STORE" },
    { date: "11/07/2026", amount: "-19.41", description: "TAXI   AIRPORT" },
    { date: "30/06/2026", amount: "-33.07", description: "BAKERY" }
] as const;

/** ISO date the `dd/MM/yyyy` value must resolve to, for the parity assertion. */
const ISO_BY_DAY_FIRST_DATE: Readonly<Record<string, string>> = {
    "01/07/2026": "2026-07-01",
    "02/07/2026": "2026-07-02",
    "03/07/2026": "2026-07-03",
    "04/07/2026": "2026-07-04",
    "05/07/2026": "2026-07-05",
    "06/07/2026": "2026-07-06",
    "07/07/2026": "2026-07-07",
    "08/07/2026": "2026-07-08",
    "09/07/2026": "2026-07-09",
    "10/07/2026": "2026-07-10",
    "11/07/2026": "2026-07-11",
    "30/06/2026": "2026-06-30"
};

/**
 * Render the activity as the reported file renders it: no header row, the date
 * bare, and every remaining field quoted - including a trailing empty column,
 * which the reported file also carried.
 */
function buildHeaderlessCSV(): string {
    return SYNTHETIC_ACTIVITY.map(
        (row) => `${row.date},"${row.amount}","${row.description}",""`
    ).join("\n");
}

/** Render the same activity as OFX, whose amounts carry no plus sign. */
function buildOFX(): string {
    const transactions = SYNTHETIC_ACTIVITY.map((row, index) => {
        const iso = ISO_BY_DAY_FIRST_DATE[row.date].split("-").join("");
        const signedAmount = row.amount.startsWith("+") ? row.amount.slice(1) : row.amount;
        return [
            "<STMTTRN>",
            "<TRNTYPE>DEBIT",
            `<DTPOSTED>${iso}`,
            `<TRNAMT>${signedAmount}`,
            `<FITID>synthetic-${index}`,
            `<NAME>${row.description}`,
            "</STMTTRN>"
        ].join("\n");
    }).join("\n");

    return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260731
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>000111222
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260601
<DTEND>20260731
${transactions}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

/** Parse the headerless CSV the way the import wizard does. */
function parseSyntheticCSV(): string[][] {
    return parseCSV(buildHeaderlessCSV(), { hasHeaders: false }).rows;
}

// ============================================================================
// Amounts
// ============================================================================

describe("parseNumber with an explicit leading plus", () => {
    it("reads a leading plus as a positive amount", () => {
        // Observed before the fix: NaN, which the import pipeline reports as
        // "Invalid amount" and counts the row as an error.
        expect(parseNumber("+69.00")).toBe(69);
        expect(parseNumber("+1,234.56")).toBe(1234.56);
        expect(parseNumber("+0.01")).toBe(0.01);
    });

    it("makes an explicit plus equivalent to no sign at all", () => {
        for (const magnitude of ["69.00", "1,234.56", "0.01", "1000"]) {
            expect(parseNumber(`+${magnitude}`)).toBe(parseNumber(magnitude));
        }
    });

    it("retains the existing sign, symbol and separator handling", () => {
        expect(parseNumber("-45.00")).toBe(-45);
        expect(parseNumber("(69.00)")).toBe(-69);
        expect(parseNumber("$1,234.56")).toBe(1234.56);
        expect(parseNumber("1.234,56", ".", ",")).toBe(1234.56);
        // Still rejects what is genuinely unparseable, rather than accepting
        // everything now that a sign is stripped.
        expect(parseNumber("+")).toBeNaN();
        expect(parseNumber("+abc")).toBeNaN();
        expect(parseNumber("++1.00")).toBeNaN();
        expect(parseNumber("45,99")).toBeNaN();
    });
});

// ============================================================================
// Quoting
// ============================================================================

describe("quoted fields containing the delimiter", () => {
    it("keeps a quoted description with a comma as one field", () => {
        const rows = parseSyntheticCSV();

        expect(rows).toHaveLength(SYNTHETIC_ACTIVITY.length);
        for (const row of rows) {
            expect(row).toHaveLength(4);
        }

        const withComma = rows.filter((row) => row[2].includes(","));
        expect(withComma.length).toBeGreaterThan(0);
        expect(rows[1][2]).toBe("PAYMENT RECEIVED, THANK YOU");
        // The row's columns did not shift: the amount is still in column 1.
        expect(rows[1][1]).toBe("+69.00");
    });
});

// ============================================================================
// Whitespace
// ============================================================================

describe("collapsing repeated whitespace", () => {
    it("is enabled by default for new imports", () => {
        // Observed before the fix: false. Every supported file type reads this
        // one default, so enabling it here covers CSV and OFX alike.
        expect(DEFAULT_FORMATTING_SETTINGS.collapseWhitespace).toBe(true);
    });
});

// ============================================================================
// Column detection
// ============================================================================

describe("value-driven column detection", () => {
    it("identifies every column of a file with no header row", () => {
        // Observed before the fix: {} - header-name matching had nothing to
        // match, so the user had to map all three columns by hand.
        expect(detectColumnMappingsFromValues(parseSyntheticCSV())).toEqual({
            "0": "date",
            "1": "amount",
            "2": "description"
        });
    });

    it("identifies columns from values regardless of column order", () => {
        const reordered = SYNTHETIC_ACTIVITY.map((row) => [row.description, row.date, row.amount]);

        expect(detectColumnMappingsFromValues(reordered)).toEqual({
            "1": "date",
            "2": "amount",
            "0": "description"
        });
    });

    it("does not mistake an empty trailing column for the description", () => {
        const mappings = detectColumnMappingsFromValues(parseSyntheticCSV());
        expect(mappings["3"]).toBeUndefined();
    });

    it("still detects a file that does have headers", () => {
        const headed = parseCSV(
            [
                "Date,Description,Amount,Balance",
                "2024-01-15,Coffee Shop,-5.50,1000.00",
                "2024-01-16,Grocery Store,-75.25,924.75",
                "2024-01-17,Direct Deposit,2500.00,3424.75"
            ].join("\n"),
            { hasHeaders: true }
        );

        expect(detectColumnMappingsFromValues(headed.rows)).toEqual({
            "0": "date",
            "1": "description",
            "2": "amount"
        });
    });

    it("returns nothing rather than guessing when no column is recognisable", () => {
        expect(detectColumnMappingsFromValues([])).toEqual({});
        expect(
            detectColumnMappingsFromValues([
                ["alpha", "bravo"],
                ["charlie", "delta"]
            ])
        ).toEqual({ "0": "description" });
    });
});

// ============================================================================
// Date format detection
// ============================================================================

describe("whole-column date format inference", () => {
    it("infers day-first from the whole column when every early value is ambiguous", () => {
        const dateColumn = SYNTHETIC_ACTIVITY.map((row) => row.date);

        // Every value but the last reads equally well as MM/dd/yyyy, so a
        // detector that samples the opening rows resolves this column wrongly.
        const ambiguousPrefix = dateColumn.slice(0, -1);
        for (const value of ambiguousPrefix) {
            expect(Number.parseInt(value.split("/")[0], 10)).toBeLessThanOrEqual(12);
        }

        expect(inferDateFormat(dateColumn)).toBe("dd/MM/yyyy");
    });

    it("is not swayed by where the disambiguating value sits in the column", () => {
        const dateColumn = SYNTHETIC_ACTIVITY.map((row) => row.date);
        const reversed = [...dateColumn].reverse();

        expect(inferDateFormat(reversed)).toBe("dd/MM/yyyy");
    });

    it("infers month-first when the second field is what exceeds 12", () => {
        expect(inferDateFormat(["01/02/2026", "03/04/2026", "06/30/2026"])).toBe("MM/dd/yyyy");
    });

    it("resolves a wholly ambiguous column by a documented fixed tie-break", () => {
        // Every value reads both ways. The tie-break is month-first and does
        // not depend on the viewer, so the same file reads the same way for
        // everyone who opens it.
        const wholes = ["01/02/2026", "03/04/2026", "05/06/2026"];
        expect(inferDateFormat(wholes)).toBe("MM/dd/yyyy");
    });

    it("needs no header and recognises the other supported layouts", () => {
        expect(inferDateFormat(["2026-06-30", "2026-07-01"])).toBe("yyyy-MM-dd");
        expect(inferDateFormat(["30.06.2026", "01.07.2026"])).toBe("dd.MM.yyyy");
        expect(inferDateFormat(["30-06-2026", "01-07-2026"])).toBe("dd-MM-yyyy");
        expect(inferDateFormat([])).toBeNull();
        expect(inferDateFormat(["not a date", "also not"])).toBeNull();
    });
});

// ============================================================================
// CSV and OFX parity
// ============================================================================

describe("CSV and OFX of the same activity", () => {
    it("import to identical transactions with zero errors", () => {
        const rows = parseSyntheticCSV();
        const mappings = detectColumnMappingsFromValues(rows);
        const dateIndex = Number(
            Object.entries(mappings).find(([, field]) => field === "date")?.[0]
        );
        const amountIndex = Number(
            Object.entries(mappings).find(([, field]) => field === "amount")?.[0]
        );
        const descriptionIndex = Number(
            Object.entries(mappings).find(([, field]) => field === "description")?.[0]
        );
        const dateFormat = inferDateFormat(rows.map((row) => row[dateIndex]));
        expect(dateFormat).toBe("dd/MM/yyyy");

        const fromCSV = rows.map((row) => {
            const amount = parseNumber(row[amountIndex], ",", ".");
            expect(Number.isFinite(amount)).toBe(true);
            return {
                date: ISO_BY_DAY_FIRST_DATE[row[dateIndex]],
                amount: asMinorUnits(Math.round(amount * 100)),
                description: row[descriptionIndex].replace(/\s+/g, " ").trim()
            };
        });

        const ofxResult = processOFXImport(buildOFX());
        if (!ofxResult.ok) throw new Error(`OFX parse failed: ${ofxResult.error}`);

        expect(ofxResult.data.errors).toHaveLength(0);
        expect(ofxResult.data.stats.errorRows).toBe(0);

        const fromOFX = ofxResult.data.transactions.map((tx) => ({
            date: tx.date.toString(),
            amount: tx.amount,
            description: tx.description.replace(/\s+/g, " ").trim()
        }));

        expect(fromCSV).toEqual(fromOFX);
    });
});

// ============================================================================
// Summary counts
// ============================================================================

/** Build a preview row carrying only what the summary counts. */
function previewWithStatus(rowIndex: number, status: PreviewTransactionStatus): PreviewTransaction {
    return {
        rowIndex,
        date: "2026-07-01",
        description: `row ${rowIndex}`,
        amount: asMinorUnits(-100),
        status,
        duplicateOf: null,
        duplicateConfidence: 0,
        validationErrors: []
    };
}

describe("import summary counts", () => {
    it("names old-and-new separately from old-and-duplicate", () => {
        const previews = [
            previewWithStatus(0, "valid"),
            previewWithStatus(1, "invalid"),
            previewWithStatus(2, "duplicate"),
            previewWithStatus(3, "old-new"),
            previewWithStatus(4, "old-duplicate"),
            previewWithStatus(5, "old-duplicate")
        ];

        expect(summarizePreview(previews)).toEqual({
            totalRows: 6,
            validCount: 1,
            errorCount: 1,
            duplicateCount: 1,
            oldNewCount: 1,
            oldDuplicateCount: 2
        });
    });

    it("partitions the total across every combination of outcomes", () => {
        const statuses: readonly PreviewTransactionStatus[] = [
            "valid",
            "invalid",
            "duplicate",
            "old-new",
            "old-duplicate"
        ];

        // Every mix of the five outcomes, at several sizes, must partition:
        // each row counted once, none omitted, none counted twice.
        for (let size = 0; size < 40; size++) {
            const previews = Array.from({ length: size }, (_, index) =>
                previewWithStatus(index, statuses[(index * 7 + size) % statuses.length])
            );
            const stats = summarizePreview(previews);
            const outcomes =
                stats.validCount +
                stats.errorCount +
                stats.duplicateCount +
                stats.oldNewCount +
                stats.oldDuplicateCount;

            expect(stats.totalRows).toBe(size);
            expect(outcomes).toBe(stats.totalRows);
        }
    });

    it("reproduces the reported baseline, which partitions correctly", () => {
        // 622 total, 0 valid, 15 errors, 607 duplicates, 0 old. Zero valid is
        // CORRECT there: the same activity had already been imported from OFX,
        // so every parseable row genuinely is a duplicate.
        const previews = [
            ...Array.from({ length: 15 }, (_, index) => previewWithStatus(index, "invalid")),
            ...Array.from({ length: 607 }, (_, index) => previewWithStatus(15 + index, "duplicate"))
        ];

        const stats = summarizePreview(previews);

        expect(stats).toEqual({
            totalRows: 622,
            validCount: 0,
            errorCount: 15,
            duplicateCount: 607,
            oldNewCount: 0,
            oldDuplicateCount: 0
        });
        expect(
            stats.validCount +
                stats.errorCount +
                stats.duplicateCount +
                stats.oldNewCount +
                stats.oldDuplicateCount
        ).toBe(stats.totalRows);
    });

    it("splits the confusing run into its two distinct reasons", () => {
        // The originally reported run said "561 old, 46 duplicates, 15 errors",
        // where a single "old" conflated rows excluded for age with rows
        // excluded as duplicates. Under the split, no count is ambiguous.
        const previews = [
            ...Array.from({ length: 15 }, (_, index) => previewWithStatus(index, "invalid")),
            ...Array.from({ length: 46 }, (_, index) => previewWithStatus(15 + index, "duplicate")),
            ...Array.from({ length: 500 }, (_, index) => previewWithStatus(61 + index, "old-new")),
            ...Array.from({ length: 61 }, (_, index) =>
                previewWithStatus(561 + index, "old-duplicate")
            )
        ];

        const stats = summarizePreview(previews);

        expect(stats.oldNewCount).toBe(500);
        expect(stats.oldDuplicateCount).toBe(61);
        expect(stats.oldNewCount + stats.oldDuplicateCount).toBe(561);
        expect(stats.totalRows).toBe(622);
    });
});

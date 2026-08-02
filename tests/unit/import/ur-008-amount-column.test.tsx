/**
 * UR-008 — the amount column must hold the AMOUNT, not a number beside it
 *
 * A check number and a running balance both parse as amounts, so a detector
 * that ranks numeric columns by match rate and breaks ties by position binds
 * the wrong column and imports it AS MONEY, with every row marked valid and
 * zero errors. Silently wrong money presented as success.
 *
 * These assertions read the IMPORTED AMOUNTS out of the real
 * `useImportState.loadFile`, not the column mappings. That distinction is the
 * point of this file. A mapping-shaped assertion is structurally blind here:
 *
 *   Date,Description,Amount,Balance  ->  {"0":date,"1":description,"2":amount}
 *   Date,Description,Balance,Amount  ->  {"0":date,"1":description,"2":amount}
 *
 * Identical mappings, but index 2 is the Amount in the first file and the
 * Balance in the second. Only the resulting VALUES distinguish -550, -7525,
 * 250000 from 100000, 92475, 342475.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useImportState } from "@/hooks/use-import-state";
import { parseCSV } from "@/lib/import/csv";
import { detectColumnMappingsFromValues } from "@/lib/import/detection";

/** The same three transactions, however the columns are arranged. */
const EXPECTED_MINOR_UNITS = [-550, -7525, 250000];

function csvFile(content: string): File {
    return new File([content], "amount-column.csv", { type: "text/csv" });
}

/** Load a CSV through the real hook and read back the previewed amounts. */
async function importedAmounts(content: string): Promise<number[]> {
    const { result } = renderHook(() =>
        useImportState({
            existingTransactions: [],
            accounts: [],
            templates: [],
            defaultCurrency: "USD"
        })
    );

    await result.current.loadFile(csvFile(content));
    await waitFor(() => expect(result.current.session).not.toBeNull());

    return result.current.previewTransactions.map((preview) => preview.amount);
}

/** Load a CSV through the real hook and return the whole hook state. */
async function loadState(content: string) {
    const { result } = renderHook(() =>
        useImportState({
            existingTransactions: [],
            accounts: [],
            templates: [],
            defaultCurrency: "USD"
        })
    );

    await result.current.loadFile(csvFile(content));
    await waitFor(() => expect(result.current.session).not.toBeNull());

    return result.current;
}

/** Rows shared by every arrangement below, so only column ORDER varies. */
const ROWS = [
    {
        date: "2024-01-15",
        description: "Coffee Shop",
        amount: "-5.50",
        balance: "1000.00",
        check: "1001"
    },
    {
        date: "2024-01-16",
        description: "Grocery Store",
        amount: "-75.25",
        balance: "924.75",
        check: "1002"
    },
    {
        date: "2024-01-17",
        description: "Direct Deposit",
        amount: "2500.00",
        balance: "3424.75",
        check: "1003"
    }
] as const;

describe("the amount column holds the amount", () => {
    it("imports the Amount, not a check number sitting to its left", async () => {
        // Observed before the fix: 100100, 100200, 100300 - the CHECK NUMBERS,
        // every row valid, zero errors.
        const csv = [
            "Date,Check No,Description,Amount",
            ...ROWS.map((row) => `${row.date},${row.check},${row.description},${row.amount}`)
        ].join("\n");

        expect(await importedAmounts(csv)).toEqual(EXPECTED_MINOR_UNITS);
    });

    it("imports the Amount, not a running balance sitting to its left", async () => {
        // Observed before the fix: 100000, 92475, 342475 - the BALANCES.
        const csv = [
            "Date,Description,Balance,Amount",
            ...ROWS.map((row) => `${row.date},${row.description},${row.balance},${row.amount}`)
        ].join("\n");

        expect(await importedAmounts(csv)).toEqual(EXPECTED_MINOR_UNITS);
    });

    it("imports the same amounts whichever side of the balance the amount sits", async () => {
        // The arrangement the original fixture used, where the correct column
        // is already leftmost among the numeric ones and a positional rule
        // happens to agree. Kept so both orders are pinned, not just the one
        // that fails.
        const csv = [
            "Date,Description,Amount,Balance",
            ...ROWS.map((row) => `${row.date},${row.description},${row.amount},${row.balance}`)
        ].join("\n");

        expect(await importedAmounts(csv)).toEqual(EXPECTED_MINOR_UNITS);
    });

    it("imports the Amount when every value is positive and only the header separates them", async () => {
        // The hardest arrangement: with no negatives the balance and the amount
        // are identical in shape, so no rule over the VALUES can separate them.
        const csv = [
            "Date,Description,Balance,Amount",
            ...ROWS.map(
                (row) =>
                    `${row.date},${row.description},${row.balance},${row.amount.replace("-", "")}`
            )
        ].join("\n");

        expect(await importedAmounts(csv)).toEqual([550, 7525, 250000]);
    });

    it("imports the Amount from a HEADERLESS file with a check-number column", async () => {
        // No header evidence at all: the amount is identified because it
        // carries signs and minor units, which a check number does not.
        const csv = ROWS.map(
            (row) =>
                `${row.date.split("-").reverse().join("/")},"${row.check}","${row.description}","${row.amount}"`
        ).join("\n");

        expect(await importedAmounts(csv)).toEqual(EXPECTED_MINOR_UNITS);
    });

    it("reports no errors while doing so", async () => {
        const csv = [
            "Date,Check No,Description,Amount",
            ...ROWS.map((row) => `${row.date},${row.check},${row.description},${row.amount}`)
        ].join("\n");

        const { result } = renderHook(() =>
            useImportState({
                existingTransactions: [],
                accounts: [],
                templates: [],
                defaultCurrency: "USD"
            })
        );

        await result.current.loadFile(csvFile(csv));
        await waitFor(() => expect(result.current.session).not.toBeNull());

        // A wrong-column import ALSO reports zero errors, which is what makes it
        // dangerous - so this pins the count without being relied on alone.
        expect(result.current.summaryStats.errorCount).toBe(0);
        expect(result.current.summaryStats.totalRows).toBe(ROWS.length);
    });
});

/**
 * A file with NO amount column at all.
 *
 * Every fixture above contains a genuine `Amount`, so the ranking always had at
 * least one candidate its header did not disown. That left one branch of
 * `bestAmountColumn` unexercised — the one taken when EVERY qualifying numeric
 * column is disowned — and a defect lived there: the code fell back to the
 * disowned columns and imported a running balance or a check number as money,
 * with every row reported valid.
 *
 * All six assertions above would still pass with that defect present, because
 * none of their fixtures can reach the branch. The fixture set has to vary
 * along the axis the code branches on, and a newly added branch is itself a new
 * axis.
 *
 * There is no correct amount in these files. The only honest outcomes are to
 * leave the amount unmapped and report the rows as errors — which is what the
 * package's original BASE `4c77a2d` did — or to import wrong money silently.
 * `spec.md:80-81` requires that every row reported as an error is genuinely
 * unparseable; a row with no amount at all qualifies.
 */
describe("a file with no amount column imports no amounts", () => {
    const NO_AMOUNT_ROWS = [
        { date: "2024-01-15", description: "Coffee Shop", numeric: "1000.00", check: "1001" },
        { date: "2024-01-16", description: "Grocery Store", numeric: "924.75", check: "1002" }
    ] as const;

    it("does not import a running balance as the amount", async () => {
        // Observed before the fix: 100000, 92475 imported, errorCount 0.
        const csv = [
            "Date,Description,Balance",
            ...NO_AMOUNT_ROWS.map((row) => `${row.date},${row.description},${row.numeric}`)
        ].join("\n");

        const state = await loadState(csv);

        expect(state.summaryStats.validCount).toBe(0);
        expect(state.summaryStats.errorCount).toBe(NO_AMOUNT_ROWS.length);
    });

    it("does not import a check number as the amount", async () => {
        // Observed before the fix: 100100, 100200 imported, errorCount 0.
        const csv = [
            "Date,Description,Check No",
            ...NO_AMOUNT_ROWS.map((row) => `${row.date},${row.description},${row.check}`)
        ].join("\n");

        const state = await loadState(csv);

        expect(state.summaryStats.validCount).toBe(0);
        expect(state.summaryStats.errorCount).toBe(NO_AMOUNT_ROWS.length);
    });

    it("does not import a reference number as the amount", async () => {
        const csv = [
            "Date,Description,Ref",
            ...NO_AMOUNT_ROWS.map((row) => `${row.date},${row.description},${row.check}`)
        ].join("\n");

        const state = await loadState(csv);

        expect(state.summaryStats.validCount).toBe(0);
        expect(state.summaryStats.errorCount).toBe(NO_AMOUNT_ROWS.length);
    });

    it("leaves the amount unmapped rather than binding a disowned column", async () => {
        const csv = [
            "Date,Description,Balance",
            ...NO_AMOUNT_ROWS.map((row) => `${row.date},${row.description},${row.numeric}`)
        ].join("\n");

        const state = await loadState(csv);
        const mappings = state.session?.config.columnMappings ?? {};

        expect(Object.values(mappings)).not.toContain("amount");
        // The column keeps the role its header actually names.
        expect(mappings["2"]).toBe("balance");
    });
});

/**
 * Synthesised placeholder headers must never act as header evidence.
 *
 * `parseCSV` names the columns of a headerless file "Column 1", "Column 2", …
 * The load path therefore passes `fileHasHeaders ? headers : []`, so those
 * placeholders never reach `detectColumnMappingsFromValues`.
 *
 * THIS TEST CANNOT CURRENTLY FAIL, AND THAT IS DELIBERATE — do not delete it as
 * dead weight. The guard is inert only by coincidence of the patterns that
 * exist today: "Column 1" matches none of `AMOUNT_HEADER_PATTERN`,
 * `NON_AMOUNT_HEADER_PATTERN` or `SECONDARY_ROLE_PATTERNS`. That is a property
 * of the current regexes, not of the design. Verified concretely: an
 * unanchored `/col/i`, or a `\bcolumn\b` alias added for files headed "Col"
 * or "Column", both match "Column 1" — at which point placeholder names would
 * start feeding real header evidence into amount selection and a headerless
 * file could resolve differently from the values alone.
 *
 * This is a regression fence. It pins the intent now and fails loudly the day
 * someone widens a pattern.
 */
describe("synthesised placeholder headers are not evidence", () => {
    it("resolves a headerless file identically with placeholders and with none", () => {
        const parsed = parseCSV(
            [
                '01/07/2026,"1001","COFFEE SHOP","-45.00"',
                '02/07/2026,"1002","PAYMENT RECEIVED","+69.00"',
                '30/06/2026,"1003","BAKERY","-33.07"'
            ].join("\n"),
            { hasHeaders: false }
        );

        // What `parseCSV` synthesises for a headerless file.
        expect(parsed.headers).toEqual(["Column 1", "Column 2", "Column 3", "Column 4"]);

        const withPlaceholders = detectColumnMappingsFromValues(parsed.rows, parsed.headers);
        const withNoHeaders = detectColumnMappingsFromValues(parsed.rows);

        expect(withPlaceholders).toEqual(withNoHeaders);
        // And the values-only answer is the correct one.
        expect(withNoHeaders["3"]).toBe("amount");
    });
});

/**
 * `CLASSIFICATION_THRESHOLD` decides how much of a column must match a
 * predicate before the column can hold that role. Every fixture elsewhere in
 * this suite has columns that match at ~100% or ~0%, so the threshold never
 * falls between two candidates and no other test distinguishes 0.4 from 1.0.
 *
 * These two pin the cliff either side of the 0.8 it is set to, on a 20-row
 * column of deliberately mixed parseability. They are what makes the constant a
 * decision rather than an unexamined number.
 *
 * Note the direction of failure: below the threshold the role is left UNMAPPED
 * and the rows report as errors. It never degrades to binding a wrong column,
 * which is why an imperfect threshold is tolerable here.
 */
describe("the classification threshold", () => {
    /** 20 rows, `bad` of which carry an unparseable amount. */
    function amountColumnWithBadRows(bad: number): string {
        return [
            "Date,Description,Amount",
            ...Array.from({ length: 20 }, (_, index) =>
                index < bad
                    ? `2024-01-${String(index + 1).padStart(2, "0")},Row ${index},n/a`
                    : `2024-01-${String(index + 1).padStart(2, "0")},Row ${index},-${index + 1}.50`
            )
        ].join("\n");
    }

    it("still binds the amount at 4 bad rows of 20, which is 0.80 matching", () => {
        const parsed = parseCSV(amountColumnWithBadRows(4), { hasHeaders: true });

        expect(detectColumnMappingsFromValues(parsed.rows, parsed.headers)["2"]).toBe("amount");
    });

    it("leaves the amount unmapped at 5 bad rows of 20, which is 0.75 matching", () => {
        const parsed = parseCSV(amountColumnWithBadRows(5), { hasHeaders: true });
        const mappings = detectColumnMappingsFromValues(parsed.rows, parsed.headers);

        // Unmapped rather than bound to something else - it fails safe.
        expect(Object.values(mappings)).not.toContain("amount");
    });
});

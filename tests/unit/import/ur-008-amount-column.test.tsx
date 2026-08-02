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

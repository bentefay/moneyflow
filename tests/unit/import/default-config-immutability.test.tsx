/**
 * Import default-config immutability
 *
 * `useImportState` seeded a new session's config with a shallow spread of
 * DEFAULT_IMPORT_CONFIG, so `config.formatting` WAS the module-level
 * DEFAULT_FORMATTING_SETTINGS object. Auto-detection then wrote the detected
 * date and number formats straight into it, permanently changing the defaults
 * for every later import in the session. The same constants back CRDT schema
 * defaults, so the corruption reached persisted data.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useImportState } from "@/hooks/use-import-state";
import {
    DEFAULT_FORMATTING_SETTINGS,
    DEFAULT_IMPORT_CONFIG,
    DEFAULT_DUPLICATE_DETECTION_SETTINGS,
    DEFAULT_FILTER_SETTINGS
} from "@/lib/import/types";

/** A CSV whose dates and amounts both auto-detect away from the US defaults. */
const EUROPEAN_CSV = [
    "Date;Description;Amount",
    "15/01/2024;Kaffee;1.234,56",
    "16/01/2024;Tankstelle;2.345,67"
].join("\n");

function csvFile(content: string): File {
    return new File([content], "european.csv", { type: "text/csv" });
}

describe("DEFAULT_IMPORT_CONFIG immutability", () => {
    it("leaves the module constants untouched after an auto-detecting load", async () => {
        // Snapshot by value before anything runs.
        const formattingBefore = { ...DEFAULT_FORMATTING_SETTINGS };
        const duplicatesBefore = { ...DEFAULT_DUPLICATE_DETECTION_SETTINGS };
        const filterBefore = { ...DEFAULT_FILTER_SETTINGS };

        const { result } = renderHook(() =>
            useImportState({
                existingTransactions: [],
                accounts: [],
                templates: [],
                defaultCurrency: "EUR"
            })
        );

        await result.current.loadFile(csvFile(EUROPEAN_CSV));
        await waitFor(() => expect(result.current.session).not.toBeNull());

        // The session picked up the detected formats...
        expect(result.current.session?.config.formatting.dateFormat).toBe("dd/MM/yyyy");

        // ...and the module constants did not change.
        expect(DEFAULT_FORMATTING_SETTINGS).toEqual(formattingBefore);
        expect(DEFAULT_DUPLICATE_DETECTION_SETTINGS).toEqual(duplicatesBefore);
        expect(DEFAULT_FILTER_SETTINGS).toEqual(filterBefore);
        expect(DEFAULT_FORMATTING_SETTINGS.dateFormat).toBe("yyyy-MM-dd");
        expect(DEFAULT_FORMATTING_SETTINGS.thousandSeparator).toBe(",");
        expect(DEFAULT_FORMATTING_SETTINGS.decimalSeparator).toBe(".");
    });

    it("gives the session config its own nested objects", async () => {
        const { result } = renderHook(() =>
            useImportState({
                existingTransactions: [],
                accounts: [],
                templates: [],
                defaultCurrency: "USD"
            })
        );

        await result.current.loadFile(csvFile("Date,Description,Amount\n2024-01-15,Coffee,-5.50"));
        await waitFor(() => expect(result.current.session).not.toBeNull());

        const config = result.current.session?.config;
        expect(config?.formatting).not.toBe(DEFAULT_IMPORT_CONFIG.formatting);
        expect(config?.duplicateDetection).not.toBe(DEFAULT_IMPORT_CONFIG.duplicateDetection);
        expect(config?.oldTransactionFilter).not.toBe(DEFAULT_IMPORT_CONFIG.oldTransactionFilter);
    });

    it("auto-detects the number format from a signed sample amount", async () => {
        // The sampled amounts here are all negative, which is what a real bank export looks
        // like. Detection used to test the patterns against the signed string, match nothing,
        // and leave the US separators in place - so a EU file parsed "1.234,56" with "." as
        // the thousands separator. See tests/unit/components/formatting-detection.test.ts.
        const { result } = renderHook(() =>
            useImportState({
                existingTransactions: [],
                accounts: [],
                templates: [],
                defaultCurrency: "EUR"
            })
        );

        await result.current.loadFile(
            csvFile(
                [
                    "Date;Description;Amount",
                    "15/01/2024;Kaffee;-1.234,56",
                    "16/01/2024;Tankstelle;-2.345,67"
                ].join("\n")
            )
        );
        await waitFor(() => expect(result.current.session).not.toBeNull());

        expect(result.current.session?.config.formatting.thousandSeparator).toBe(".");
        expect(result.current.session?.config.formatting.decimalSeparator).toBe(",");

        // And the amounts land at their true magnitude rather than 100x over.
        expect(result.current.previewTransactions.map((tx) => tx.amount)).toEqual([
            -123456, -234567
        ]);
    });
});

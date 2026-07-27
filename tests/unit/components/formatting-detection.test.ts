import { describe, expect, it } from "vitest";

import {
    detectDateFormat,
    detectNumberFormat
} from "@/components/features/import/tabs/FormattingTab";
import { parseNumber } from "@/lib/import/csv";

/**
 * Regression cover for auto-detection of the number format.
 *
 * `detectNumberFormat` classifies a sample amount into a separator pair, and the import pipeline
 * hands that pair to `parseNumber`. Two defects made it return null on inputs a real export
 * produces, which silently leaves the US defaults in place:
 *
 * 1. Sign. Every pattern describes an unsigned magnitude, but bank exports lead with a minus and
 *    accounting exports wrap in parentheses. "-45,99" matched nothing, so a EU file whose first
 *    sampled amount happened to be a debit - the common case - was parsed as US.
 * 2. Whitespace. The FR branch keys on a space thousands separator, but whitespace was stripped
 *    from the sample before the patterns ran, so "1 234,56" arrived as "1234,56". The branch was
 *    unreachable for its entire life.
 *
 * Misdetection is not cosmetic: it feeds `parseNumber` the wrong separators, which is exactly the
 * 100x mis-scaling `isWellFormedMagnitude` was added to reject. The round-trip assertions below
 * pin detection and parsing together, since agreeing on the pair is the property that matters.
 */
describe("detectNumberFormat", () => {
    it("detects the format regardless of how the sign is spelled", () => {
        const expected = { thousand: ".", decimal: "," };

        expect(detectNumberFormat(["1.234,56"])).toEqual(expected);
        expect(detectNumberFormat(["-1.234,56"])).toEqual(expected);
        expect(detectNumberFormat(["+1.234,56"])).toEqual(expected);
        expect(detectNumberFormat(["(1.234,56)"])).toEqual(expected);
        expect(detectNumberFormat(["€-1.234,56"])).toEqual(expected);
    });

    it("detects a plain EU amount that carries a leading minus", () => {
        // The motivating case: a two-decimal debit with no thousands group.
        expect(detectNumberFormat(["-45,99"])).toEqual({ thousand: ".", decimal: "," });
    });

    it("detects the FR space-grouped format", () => {
        expect(detectNumberFormat(["1 234,56"])).toEqual({ thousand: " ", decimal: "," });
        expect(detectNumberFormat(["-1 234,56"])).toEqual({ thousand: " ", decimal: "," });
    });

    it("treats a non-breaking space as the FR separator", () => {
        // FR/CH exporters emit U+00A0 and U+202F rather than a plain space.
        expect(detectNumberFormat(["1\u00a0234,56"])).toEqual({ thousand: " ", decimal: "," });
        expect(detectNumberFormat(["1\u202f234,56"])).toEqual({ thousand: " ", decimal: "," });
    });

    it("still detects the US and separator-free formats", () => {
        expect(detectNumberFormat(["1,234.56"])).toEqual({ thousand: ",", decimal: "." });
        expect(detectNumberFormat(["-1,234.56"])).toEqual({ thousand: ",", decimal: "." });
        expect(detectNumberFormat(["1234.56"])).toEqual({ thousand: "", decimal: "." });
    });

    it("returns null when nothing recognisable is present", () => {
        expect(detectNumberFormat([])).toBeNull();
        expect(detectNumberFormat(["not a number"])).toBeNull();
        expect(detectNumberFormat(["12,34,567.89"])).toBeNull();
    });

    it("agrees with parseNumber on the separators it reports", () => {
        const cases: ReadonlyArray<readonly [string, number]> = [
            ["-45,99", -45.99],
            ["1.234,56", 1234.56],
            ["-1.234,56", -1234.56],
            ["1 234,56", 1234.56],
            ["1,234.56", 1234.56],
            ["-1,234.56", -1234.56],
            ["1234.56", 1234.56],
            ["(1.234,56)", -1234.56]
        ];

        for (const [sample, expected] of cases) {
            const detected = detectNumberFormat([sample]);
            expect(detected, `no format detected for ${sample}`).not.toBeNull();
            if (detected === null) continue;

            expect(
                parseNumber(sample, detected.thousand, detected.decimal),
                `round-trip failed for ${sample}`
            ).toBeCloseTo(expected, 10);
        }
    });
});

describe("detectDateFormat", () => {
    it("distinguishes day-first from month-first by the leading component", () => {
        expect(detectDateFormat(["2024-01-15"])).toBe("yyyy-MM-dd");
        expect(detectDateFormat(["01/15/2024"])).toBe("MM/dd/yyyy");
        expect(detectDateFormat(["15/01/2024"])).toBe("dd/MM/yyyy");
        expect(detectDateFormat(["15.01.2024"])).toBe("dd.MM.yyyy");
    });

    it("returns null for an unrecognised sample", () => {
        expect(detectDateFormat([])).toBeNull();
        expect(detectDateFormat(["15 January 2024"])).toBeNull();
    });
});

/**
 * Date Format Tests
 *
 * Tests for date formatting utilities, especially formatTransactionDate.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { formatTransactionDate } from "@/lib/utils/date-format";

describe("formatTransactionDate", () => {
    // Reference date for tests: 2026-01-02 (as per user context)
    const refDate = Temporal.PlainDate.from("2026-01-02");
    // Use en-GB locale for consistent D/M ordering in tests
    const locale = "en-GB";

    describe("same year as reference", () => {
        it("formats date as D/M when year matches reference (no padding)", () => {
            expect(formatTransactionDate("2026-01-15", refDate, locale)).toBe("15/1");
            expect(formatTransactionDate("2026-12-25", refDate, locale)).toBe("25/12");
            expect(formatTransactionDate("2026-06-01", refDate, locale)).toBe("1/6");
        });

        it("does not pad single digit days and months", () => {
            expect(formatTransactionDate("2026-01-01", refDate, locale)).toBe("1/1");
            expect(formatTransactionDate("2026-03-05", refDate, locale)).toBe("5/3");
            expect(formatTransactionDate("2026-09-09", refDate, locale)).toBe("9/9");
        });
    });

    describe("different year > 2000", () => {
        it("formats date as D/M/YY for years after 2000 (no padding)", () => {
            expect(formatTransactionDate("2025-06-15", refDate, locale)).toBe("15/6/25");
            expect(formatTransactionDate("2024-12-31", refDate, locale)).toBe("31/12/24");
            expect(formatTransactionDate("2001-01-01", refDate, locale)).toBe("1/1/01");
            expect(formatTransactionDate("2010-03-20", refDate, locale)).toBe("20/3/10");
        });

        it("handles year 2099 correctly", () => {
            expect(formatTransactionDate("2099-07-04", refDate, locale)).toBe("4/7/99");
        });

        it("handles future years correctly", () => {
            expect(formatTransactionDate("2030-11-11", refDate, locale)).toBe("11/11/30");
        });
    });

    // UR-007 reverses the contract these cases previously encoded. The frozen
    // text (spec.md:50) requires two digits in EVERY different-year
    // presentation and grants no exception below the year 2000, so the old
    // DD/MM/YYYY branch for those years is gone. The dates themselves are
    // retained so the boundary stays covered.
    describe("year <= 2000", () => {
        it("formats date as D/M/YY for year 2000", () => {
            expect(formatTransactionDate("2000-06-15", refDate, locale)).toBe("15/6/00");
            expect(formatTransactionDate("2000-01-01", refDate, locale)).toBe("1/1/00");
            expect(formatTransactionDate("2000-12-31", refDate, locale)).toBe("31/12/00");
        });

        it("formats date as D/M/YY for years before 2000", () => {
            expect(formatTransactionDate("1999-12-31", refDate, locale)).toBe("31/12/99");
            expect(formatTransactionDate("1990-05-15", refDate, locale)).toBe("15/5/90");
            expect(formatTransactionDate("1985-08-20", refDate, locale)).toBe("20/8/85");
            expect(formatTransactionDate("1900-01-01", refDate, locale)).toBe("1/1/00");
        });

        it("handles very old dates", () => {
            expect(formatTransactionDate("1776-07-04", refDate, locale)).toBe("4/7/76");
        });
    });

    describe("edge cases", () => {
        it("handles leap year dates", () => {
            expect(formatTransactionDate("2024-02-29", refDate, locale)).toBe("29/2/24");
            expect(formatTransactionDate("2000-02-29", refDate, locale)).toBe("29/2/00");
        });

        it("handles end of month dates", () => {
            expect(formatTransactionDate("2026-01-31", refDate, locale)).toBe("31/1");
            expect(formatTransactionDate("2026-04-30", refDate, locale)).toBe("30/4");
            expect(formatTransactionDate("2026-02-28", refDate, locale)).toBe("28/2");
        });

        it("uses current date when no reference is provided", () => {
            // Since we can't mock Temporal.Now easily, just verify it doesn't throw
            const result = formatTransactionDate("2026-06-15", undefined, locale);
            expect(result).toMatch(/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/);
        });
    });

    describe("boundary conditions", () => {
        it("treats year 2001 as > 2000 (short format)", () => {
            expect(formatTransactionDate("2001-01-01", refDate, locale)).toBe("1/1/01");
        });

        it("treats year 2000 like any other different year", () => {
            expect(formatTransactionDate("2000-12-31", refDate, locale)).toBe("31/12/00");
        });

        it("reference year edge cases", () => {
            // When reference is 2001
            const ref2001 = Temporal.PlainDate.from("2001-06-15");
            expect(formatTransactionDate("2001-03-20", ref2001, locale)).toBe("20/3");
            expect(formatTransactionDate("2000-03-20", ref2001, locale)).toBe("20/3/00");
            expect(formatTransactionDate("2002-03-20", ref2001, locale)).toBe("20/3/02");
        });
    });

    describe("internationalization", () => {
        it("uses M/D order for en-US locale", () => {
            // In en-US, month comes before day
            expect(formatTransactionDate("2026-01-15", refDate, "en-US")).toBe("1/15");
            expect(formatTransactionDate("2025-06-15", refDate, "en-US")).toBe("6/15/25");
            expect(formatTransactionDate("1999-12-31", refDate, "en-US")).toBe("12/31/99");
        });

        it("uses D/M order for en-GB locale", () => {
            // In en-GB, day comes before month
            expect(formatTransactionDate("2026-01-15", refDate, "en-GB")).toBe("15/1");
            expect(formatTransactionDate("2025-06-15", refDate, "en-GB")).toBe("15/6/25");
            expect(formatTransactionDate("1999-12-31", refDate, "en-GB")).toBe("31/12/99");
        });

        it("uses Y/M/D order for ja-JP locale", () => {
            // Asserted exactly rather than by an alternation regex. The loose
            // form this replaces accepted either field order, so it passed
            // while the year-first case was silently corrupted: a leading-zero
            // year was read as a day and stripped, rendering 2001-01-05 as
            // "1/1/5". The exact expectations below fail if that returns.
            expect(formatTransactionDate("2025-06-15", refDate, "ja-JP")).toBe("25/6/15");
            expect(formatTransactionDate("2001-01-05", refDate, "ja-JP")).toBe("01/1/5");
            expect(formatTransactionDate("2026-01-15", refDate, "ja-JP")).toBe("1/15");
        });

        it("uses D.M. format for de-DE locale", () => {
            // German uses dots as separators
            expect(formatTransactionDate("2026-01-15", refDate, "de-DE")).toBe("15.1.");
            expect(formatTransactionDate("2025-06-15", refDate, "de-DE")).toBe("15.6.25");
            expect(formatTransactionDate("1999-12-31", refDate, "de-DE")).toBe("31.12.99");
        });
    });
});

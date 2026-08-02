/**
 * Locale Date Presentation and Entry Tests (UR-007)
 *
 * The reported defect was "all dates display in US format". The display helper
 * was already locale-aware; the real failures were narrower and are pinned here:
 *
 * - the editing presentation rendered a four-digit year (frozen text requires two);
 * - date ENTRY parsed with chrono's default `en` parser, which is US-ordered, so an
 *   en-GB/en-AU viewer typing back the `03/08` they were shown saved 8 March;
 * - year-less entry carried chrono's forward-date bias, so `15/1` shown for a
 *   current-year date parsed back as the NEXT year;
 * - a year that sorts first and carries a leading zero (ja-JP `01/1/5`) was
 *   corrupted by a positional leading-zero strip.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    formatDateForEditing,
    formatTransactionDate,
    parseLocaleDate
} from "@/lib/utils/date-format";

/** Reference date shared by the table cases: 2 August 2026. */
const refDate = Temporal.PlainDate.from("2026-08-02");

describe("formatDateForEditing", () => {
    // The frozen text requires the year while editing, rendered as TWO digits.
    const testCases = [
        { iso: "2026-08-03", locale: "en-AU", expected: "03/08/26" },
        { iso: "2026-08-03", locale: "en-GB", expected: "03/08/26" },
        { iso: "2026-08-03", locale: "en-US", expected: "08/03/26" },
        { iso: "2026-08-03", locale: "de-DE", expected: "03.08.26" },
        { iso: "2026-08-03", locale: "ja-JP", expected: "26/08/03" },
        // A current-year date still shows the year while editing.
        { iso: "2026-01-15", locale: "en-AU", expected: "15/01/26" },
        // Different-year dates, including below the 2000 boundary.
        { iso: "2025-06-15", locale: "en-AU", expected: "15/06/25" },
        { iso: "1999-12-31", locale: "en-AU", expected: "31/12/99" },
        { iso: "1999-12-31", locale: "en-US", expected: "12/31/99" }
    ] as const;

    it.each(testCases)("renders $iso as $expected for $locale", ({ iso, locale, expected }) => {
        expect(formatDateForEditing(iso, locale)).toBe(expected);
    });

    it("never renders a four-digit year", () => {
        // The defect: `year: "numeric"` produced "03/08/2026" while editing.
        for (const iso of ["2026-08-03", "2025-06-15", "1999-12-31", "1776-07-04"]) {
            expect(formatDateForEditing(iso, "en-AU")).not.toMatch(/\d{4}/);
        }
    });
});

describe("formatTransactionDate two-digit year", () => {
    // The frozen text puts no floor on this: every different-year presentation
    // is two digits, including dates at or below the year 2000 that previously
    // rendered DD/MM/YYYY.
    const testCases = [
        { iso: "2000-06-15", locale: "en-GB", expected: "15/6/00" },
        { iso: "1999-12-31", locale: "en-GB", expected: "31/12/99" },
        { iso: "1985-08-20", locale: "en-GB", expected: "20/8/85" },
        { iso: "1999-12-31", locale: "en-US", expected: "12/31/99" },
        { iso: "1999-12-31", locale: "de-DE", expected: "31.12.99" }
    ] as const;

    it.each(testCases)("renders $iso as $expected for $locale", ({ iso, locale, expected }) => {
        expect(formatTransactionDate(iso, refDate, locale)).toBe(expected);
    });

    it("preserves a leading-zero year in a year-first locale", () => {
        // The defect: the leading-zero strip assumed the year was the THIRD
        // numeric part, so ja-JP's leading "01" was stripped to "1/1/5".
        expect(formatTransactionDate("2001-01-05", refDate, "ja-JP")).toBe("01/1/5");
    });
});

describe("locales that do not number in Latin digits", () => {
    // Regression: the first revision of the formatter stripped padding with
    // String(Number(part.value)). Number("۵") is NaN, so every one of these
    // locales rendered the literal string "NaN" as the date. The rewrite that
    // correctly fixed the ja-JP positional strip introduced this, and no test
    // named a non-Latin locale, so the whole class went unseen.
    const testCases = [
        { locale: "fa-IR", iso: "2026-08-03", expected: "۸/۳" },
        { locale: "bn-BD", iso: "2026-08-03", expected: "৩/৮" },
        { locale: "my-MM", iso: "2026-08-03", expected: "၃/၈" }
    ] as const;

    it.each(testCases)("renders $iso in $locale's own numerals", ({ locale, iso, expected }) => {
        expect(formatTransactionDate(iso, refDate, locale)).toBe(expected);
    });

    it("never renders the string NaN in any presentation", () => {
        for (const locale of ["fa-IR", "bn-BD", "ar-EG", "my-MM", "ne-NP", "ps-AF"]) {
            for (const iso of ["2026-08-03", "2025-06-15", "1999-12-31"]) {
                expect(formatTransactionDate(iso, refDate, locale)).not.toContain("NaN");
                expect(formatDateForEditing(iso, locale)).not.toContain("NaN");
            }
        }
    });
});

describe("locales whose default calendar is not Gregorian", () => {
    // Regression: nothing pinned the calendar, so th-TH rendered the Buddhist
    // year (2026 as 69) while the parser read it back as Gregorian, shifting
    // the stored value by 43 years. Unlike the NaN defect this one reached
    // storage, so it violated spec.md:51-52 rather than only the display.
    const nonGregorianLocales = ["th-TH", "fa-IR"] as const;

    it.each(nonGregorianLocales)("renders and parses %s as a Gregorian date", (locale) => {
        const iso = "2026-08-03";

        expect(formatDateForEditing(iso, locale)).not.toContain("69");
        expect(parseLocaleDate(formatDateForEditing(iso, locale), locale, refDate)).toBe(iso);
        expect(parseLocaleDate(formatTransactionDate(iso, refDate, locale), locale, refDate)).toBe(
            iso
        );
    });

    it("does not shift a th-TH year by the Buddhist era offset", () => {
        expect(formatDateForEditing("2026-08-03", "th-TH")).toBe("03/08/26");
        expect(parseLocaleDate("03/08/26", "th-TH", refDate)).toBe("2026-08-03");
    });
});

describe("locales whose editing skeleton differs from their numeric one", () => {
    // Regression (review 02, F-4). `Intl` may order or punctuate the 2-digit
    // skeleton differently from the numeric one. The parser derived its formats
    // from the numeric skeleton alone, so it could not accept the very string
    // the editing field had just displayed.
    //
    // The nine-locale table below cannot catch this: every one of those locales
    // happens to agree between the two skeletons. Naming MORE locales was not
    // the fix — naming the CLASS was. These are chosen because they diverge.
    const orderFlipping = [
        // Rendered day-first while the numeric skeleton is month-first, so the
        // displayed date was silently STORED transposed rather than rejected.
        { locale: "mt-MT", iso: "2026-08-03", editing: "03/08/26" },
        { locale: "ug-CN", iso: "2026-08-03", editing: "26-08-03" }
    ] as const;

    it.each(orderFlipping)(
        "stores the date $locale displayed, not its transposition",
        ({ locale, iso, editing }) => {
            expect(formatDateForEditing(iso, locale)).toBe(editing);
            expect(parseLocaleDate(editing, locale, refDate)).toBe(iso);
        }
    );

    const separatorChanging = ["it-CH", "lv-LV", "te-IN"] as const;

    it.each(separatorChanging)("accepts the form %s displays while editing", (locale) => {
        const iso = "2026-08-03";
        // These were rejected outright rather than mis-stored: the editing form
        // uses a separator the numeric skeleton never produces.
        expect(parseLocaleDate(formatDateForEditing(iso, locale), locale, refDate)).toBe(iso);
    });

    it("keeps a divergent locale's compact form parsing correctly too", () => {
        // Fixing the editing skeleton must not cost the compact one.
        for (const locale of ["mt-MT", "ug-CN", "it-CH", "lv-LV"]) {
            const iso = "2025-06-15";
            expect(
                parseLocaleDate(formatTransactionDate(iso, refDate, locale), locale, refDate)
            ).toBe(iso);
        }
    });
});

describe("parseLocaleDate", () => {
    describe("accepts what the same locale displays", () => {
        // The core round-trip clause: whatever was shown must be typeable back.
        // Deliberately spans three axes the first revision of this suite missed
        // and which a Latin/Gregorian-only table cannot exercise: non-Latin
        // numbering systems (fa-IR, bn-BD, ar-EG), a non-Gregorian default
        // calendar (th-TH Buddhist, fa-IR Persian), and a year-first order
        // (ja-JP). Rewriting a formatter can regress an entire input class that
        // no test names.
        const locales = [
            "en-AU",
            "en-GB",
            "en-US",
            "de-DE",
            "ja-JP",
            "th-TH",
            "fa-IR",
            "bn-BD",
            "ar-EG"
        ] as const;
        const isoDates = [
            "2026-08-03", // day and month both <= 12, where transposition hides
            "2026-01-15",
            "2026-12-25",
            "2025-06-15",
            "1999-12-31"
        ] as const;

        for (const locale of locales) {
            for (const iso of isoDates) {
                it(`round-trips the compact form of ${iso} for ${locale}`, () => {
                    const shown = formatTransactionDate(iso, refDate, locale);
                    expect(parseLocaleDate(shown, locale, refDate)).toBe(iso);
                });

                it(`round-trips the editing form of ${iso} for ${locale}`, () => {
                    const shown = formatDateForEditing(iso, locale);
                    expect(parseLocaleDate(shown, locale, refDate)).toBe(iso);
                });
            }
        }
    });

    it("reads a day-first locale's input day-first", () => {
        // The reported case, verbatim from the frozen text: for an
        // Australian-English viewer 03/08 is the third of August.
        expect(parseLocaleDate("03/08", "en-AU", refDate)).toBe("2026-08-03");
        expect(parseLocaleDate("3/8", "en-GB", refDate)).toBe("2026-08-03");
    });

    it("reads a month-first locale's input month-first", () => {
        // The same keystrokes mean a different date under en-US, and that is correct.
        expect(parseLocaleDate("03/08", "en-US", refDate)).toBe("2026-03-08");
    });

    it("resolves a year-less entry to the reference year, not the next one", () => {
        // chrono's forward-date bias parsed "15/1" as the FOLLOWING January.
        expect(parseLocaleDate("15/1", "en-GB", refDate)).toBe("2026-01-15");
        expect(parseLocaleDate("1/1", "en-GB", refDate)).toBe("2026-01-01");
    });

    it("accepts a four-digit year as well as two", () => {
        expect(parseLocaleDate("31/12/1999", "en-GB", refDate)).toBe("1999-12-31");
        expect(parseLocaleDate("31/12/99", "en-GB", refDate)).toBe("1999-12-31");
    });

    it("still accepts natural language and ISO input", () => {
        expect(parseLocaleDate("2025-06-15", "en-AU", refDate)).toBe("2025-06-15");
        expect(parseLocaleDate("15 June 2025", "en-AU", refDate)).toBe("2025-06-15");
    });

    const invalidCases = ["", "   ", "not a date", "32/1/26", "15/13/25"] as const;

    it.each(invalidCases)("returns null for invalid input '%s'", (input) => {
        expect(parseLocaleDate(input, "en-AU", refDate)).toBeNull();
    });

    describe("the natural-language fallback is unreachable for numeric input", () => {
        // The fallback parser has a fixed field order of its own. If a numeric
        // string could reach it after the locale parser declined, a date that
        // is INVALID in the viewer's own order would be silently rescued in a
        // different order — reintroducing exactly the ambiguity this change
        // removes.
        //
        // These cases are the ones that distinguish the gate from its absence.
        // Numeric input the locale parser ACCEPTS never reaches the fallback
        // either way, so asserting those would prove nothing.

        it("does not rescue a numeric date that is invalid in the viewer's own order", () => {
            // Under en-US the order is month-first, so a leading 15 or 31 is
            // not a month and the input is not a date this viewer could have
            // been shown. The day-first fallback would happily read all three.
            expect(parseLocaleDate("15/6/25", "en-US", refDate)).toBeNull();
            expect(parseLocaleDate("31/12/99", "en-US", refDate)).toBeNull();
            expect(parseLocaleDate("13/1/26", "en-US", refDate)).toBeNull();
        });

        it("rejects an impossible numeric date rather than letting it be rescued", () => {
            expect(parseLocaleDate("32/1/26", "en-AU", refDate)).toBeNull();
            expect(parseLocaleDate("29/2/25", "en-AU", refDate)).toBeNull(); // 2025 is not a leap year
        });

        it("keeps the fallback for input that is genuinely not numeric", () => {
            // The gate keys on shape, not on the locale parser having failed,
            // so month names and relative phrases still resolve.
            expect(parseLocaleDate("25 December 2023", "en-AU", refDate)).toBe("2023-12-25");
            expect(parseLocaleDate("tomorrow", "en-AU", refDate)).toBe("2026-08-03");
        });
    });
});

describe("no displayed value shifts because of a time zone", () => {
    // Dates are calendar dates. Formatting must not route through an instant
    // whose civil date depends on the host zone.
    const hostileZones = [
        "Pacific/Kiritimati", // UTC+14
        "Pacific/Midway", // UTC-11
        "UTC",
        "Australia/Brisbane",
        "America/New_York"
    ] as const;

    // Month and year boundaries are where an off-by-one-day shift shows up.
    const boundaryDates = [
        "2026-01-01",
        "2025-12-31",
        "2026-08-01",
        "2026-07-31",
        "2026-02-28",
        "2024-02-29"
    ] as const;

    for (const timeZone of hostileZones) {
        it(`renders and round-trips boundary dates unshifted in ${timeZone}`, () => {
            const original = process.env.TZ;
            process.env.TZ = timeZone;
            try {
                for (const iso of boundaryDates) {
                    const compact = formatTransactionDate(iso, refDate, "en-AU");
                    const editing = formatDateForEditing(iso, "en-AU");

                    // The rendered day and month are the stored ones, not a
                    // neighbouring civil date.
                    const date = Temporal.PlainDate.from(iso);
                    expect(compact).toContain(String(date.day));
                    expect(editing).toBe(
                        `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${String(date.year % 100).padStart(2, "0")}`
                    );

                    // And the value survives the round trip unchanged.
                    expect(parseLocaleDate(editing, "en-AU", refDate)).toBe(iso);
                }
            } finally {
                process.env.TZ = original;
            }
        });
    }
});

/**
 * Date Format Preference Tests
 *
 * The viewer-chosen date presentation, and the locale each choice resolves to.
 *
 * The reason this preference exists at all is environmental and is worth restating where it can
 * fail: a browser reports its UI LANGUAGE, and nothing it exposes reports the operating system's
 * regional format. An `en_US` desktop in Australia is therefore reported as `en-US`, and the
 * formatter renders month-first — correct as written, wrong for the viewer. These cases pin what
 * each escape hatch actually produces.
 */

import { describe, expect, it } from "vitest";

import {
    DATE_FORMAT_EXAMPLE_ISO,
    DATE_FORMAT_PREFERENCES,
    DEFAULT_DATE_FORMAT_PREFERENCE,
    dateFormatPreferenceExample,
    localeForDateFormatPreference,
    toDateFormatPreference,
    type DateFormatPreference
} from "@/lib/domain/date-format-preference";

describe("localeForDateFormatPreference", () => {
    const cases = [
        { preference: "automatic", locale: undefined },
        { preference: "dayFirst", locale: "en-AU" },
        { preference: "monthFirst", locale: "en-US" },
        { preference: "yearFirst", locale: "en-CA" }
    ] as const satisfies readonly { preference: DateFormatPreference; locale?: string }[];

    it.each(cases)("resolves $preference to $locale", ({ preference, locale }) => {
        expect(localeForDateFormatPreference(preference)).toBe(locale);
    });

    it("covers every preference", () => {
        // A preference added without a locale would otherwise silently fall through to the
        // browser, which looks like "no choice" rather than like a bug.
        for (const preference of DATE_FORMAT_PREFERENCES) {
            expect(() => localeForDateFormatPreference(preference)).not.toThrow();
        }
    });

    it("follows the browser only for the automatic choice", () => {
        const explicit = DATE_FORMAT_PREFERENCES.filter((p) => p !== "automatic");
        for (const preference of explicit) {
            expect(localeForDateFormatPreference(preference)).toBeDefined();
        }
    });
});

describe("dateFormatPreferenceExample", () => {
    // These are the strings shown beside each option in the settings control. They are asserted
    // here rather than only rendered, because they are the entire basis on which a viewer picks:
    // an example that does not match what the grid then does is worse than no example.
    it("renders day first as the reported case", () => {
        expect(dateFormatPreferenceExample("dayFirst")).toBe("27/1/1988");
    });

    it("renders month first as the presentation being escaped", () => {
        expect(dateFormatPreferenceExample("monthFirst")).toBe("1/27/1988");
    });

    it("renders year first at ISO's own fixed width", () => {
        expect(dateFormatPreferenceExample("yearFirst")).toBe("1988-01-27");
    });

    it("uses a day past the twelfth so the orderings cannot be confused", () => {
        // With a day of 12 or less, day-first and month-first render the same digits in a
        // different order and a viewer cannot tell the options apart.
        const day = Number(DATE_FORMAT_EXAMPLE_ISO.slice(8, 10));
        expect(day).toBeGreaterThan(12);
        expect(dateFormatPreferenceExample("dayFirst")).not.toBe(
            dateFormatPreferenceExample("monthFirst")
        );
    });

    it("gives every option a distinct example", () => {
        const explicit = DATE_FORMAT_PREFERENCES.filter((p) => p !== "automatic");
        const examples = explicit.map(dateFormatPreferenceExample);
        expect(new Set(examples).size).toBe(examples.length);
    });
});

describe("toDateFormatPreference", () => {
    it.each(DATE_FORMAT_PREFERENCES)("keeps the stored value %s", (preference) => {
        expect(toDateFormatPreference(preference)).toBe(preference);
    });

    const notAChoice = [undefined, "", "dd/MM/yyyy", "en-AU", "DayFirst"] as const;

    it.each(notAChoice)("treats %s as no choice having been made", (value) => {
        // An absent or unrecognised value means the viewer has never chosen, which is the same
        // state a new vault is in — not an error, and not a reason to show them nothing.
        expect(toDateFormatPreference(value)).toBe(DEFAULT_DATE_FORMAT_PREFERENCE);
    });

    it("defaults to following the browser", () => {
        expect(DEFAULT_DATE_FORMAT_PREFERENCE).toBe("automatic");
        expect(localeForDateFormatPreference(DEFAULT_DATE_FORMAT_PREFERENCE)).toBeUndefined();
    });
});

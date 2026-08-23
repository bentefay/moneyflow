/**
 * Date Format Preference
 *
 * The viewer's chosen date presentation, and the locale it resolves to.
 *
 * A browser reports one locale, and it is the UI LANGUAGE rather than the regional format: a user
 * in Australia running an `en_US.UTF-8` desktop is reported as `en-US` by every signal the platform
 * exposes. The operating system's own "Formats" setting travels in `LC_TIME`, which browsers do not
 * read, and there is no web API for regional format preferences at all. So a viewer whose dates
 * come out in the wrong field order has no way to correct it from outside the app, and this
 * preference is that correction.
 *
 * A preference resolves to a LOCALE rather than to a format pattern. Everything in
 * `@/lib/utils/date-format` derives field order, separators and the parse formats from `Intl` given
 * a locale, so choosing a locale keeps formatting and parsing symmetric for free — whatever a
 * preference displays can be typed straight back.
 */

import { formatTransactionDate } from "@/lib/utils/date-format";
import { assertNever } from "@/lib/utils/exhaustive";

/** Every date presentation a viewer can choose, in the order the settings control lists them. */
export const DATE_FORMAT_PREFERENCES = [
    "automatic",
    "dayFirst",
    "monthFirst",
    "yearFirst"
] as const;

/** The viewer's chosen date presentation. */
export type DateFormatPreference = (typeof DATE_FORMAT_PREFERENCES)[number];

/**
 * The presentation a viewer who has never chosen one gets: whatever the browser reports.
 *
 * Following the browser is right far more often than it is wrong, and a viewer it is wrong for now
 * has this setting.
 */
export const DEFAULT_DATE_FORMAT_PREFERENCE: DateFormatPreference = "automatic";

/**
 * The date shown as the example beside each option in the settings control.
 *
 * Deliberately a date whose day exceeds twelve, so day-first and month-first orderings cannot be
 * confused for one another, and deliberately in a past year, so the example always includes the
 * year regardless of when it is read.
 */
export const DATE_FORMAT_EXAMPLE_ISO = "1988-01-27";

/**
 * The locale a preference presents dates in.
 *
 * `undefined` means "follow the browser", which is what every formatter in `date-format` already
 * does when given no locale.
 *
 * The concrete locales are chosen for the numeric form they produce rather than for their region.
 * `en-AU` over `en-GB` for day-first: both render `27/01/1988`, but only `en-AU` renders the
 * year-less form unpadded as `27/1`, which is the compact presentation the transaction grid wants.
 */
export function localeForDateFormatPreference(
    preference: DateFormatPreference
): string | undefined {
    switch (preference) {
        case "automatic":
            return undefined;
        case "dayFirst":
            return "en-AU";
        case "monthFirst":
            return "en-US";
        case "yearFirst":
            return "en-CA";
        default:
            return assertNever(preference, "date format preference");
    }
}

/**
 * Render the example date in a preference's own presentation.
 *
 * Deliberately routed through the very formatter the transaction grid uses, so the label beside an
 * option in the settings control cannot drift from what choosing it actually does.
 */
export function dateFormatPreferenceExample(preference: DateFormatPreference): string {
    return formatTransactionDate(
        DATE_FORMAT_EXAMPLE_ISO,
        undefined,
        localeForDateFormatPreference(preference)
    );
}

/**
 * Narrow an unvalidated stored value to a preference.
 *
 * The CRDT holds this field as an optional string, and an absent or unrecognised one means the
 * viewer has expressed no preference rather than an invalid one.
 */
export function toDateFormatPreference(value: string | undefined): DateFormatPreference {
    return isDateFormatPreference(value) ? value : DEFAULT_DATE_FORMAT_PREFERENCE;
}

/** Type guard for a stored preference value, so narrowing needs no cast. */
function isDateFormatPreference(value: string | undefined): value is DateFormatPreference {
    return DATE_FORMAT_PREFERENCES.some((preference) => preference === value);
}

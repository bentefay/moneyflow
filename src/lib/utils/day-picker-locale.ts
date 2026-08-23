/**
 * Calendar Localisation
 *
 * Translates a BCP 47 locale into the pieces react-day-picker needs to render a calendar in it.
 *
 * react-day-picker localises through date-fns `Locale` OBJECTS, and its default is `enUS`, so an
 * unconfigured calendar shows Sunday-first weeks and English labels to everyone. Mapping our locale
 * to one of those objects would mean bundling date-fns locale data and picking from a fixed list —
 * which cannot answer the default case at all, where the locale is whatever the viewer's browser
 * reports and may be any of hundreds.
 *
 * So the calendar is localised through `Intl` instead, the same way every other date presentation
 * in this app is. Nothing is bundled, and an unanticipated locale is rendered as correctly as an
 * anticipated one.
 */

import type { Formatters } from "react-day-picker";

import { getWeekStartDay } from "./date-format";

/** Everything a `DayPicker` needs to render in a given locale. */
export interface DayPickerLocalization {
    /** First column of the calendar grid. Sunday in the US, Monday across most of the world. */
    readonly weekStartsOn: 0 | 1;
    /** Month and weekday labels, rendered through `Intl` rather than bundled locale data. */
    readonly formatters: Partial<Formatters>;
}

/**
 * The calendar localisation for a locale, or for the browser's own when given none.
 *
 * @param locale - BCP 47 locale string, or undefined to follow the browser
 */
export function dayPickerLocalization(locale: string | undefined): DayPickerLocalization {
    // `getWeekStartDay` answers 0 or 1 only, and `weekStartsOn` is a seven-way union, so the
    // comparison both narrows the type and states the two cases the helper actually distinguishes.
    const weekStartsOn = getWeekStartDay(locale) === 0 ? 0 : 1;

    return {
        weekStartsOn,
        formatters: {
            formatCaption: (month) =>
                month.toLocaleString(locale, { month: "long", year: "numeric" }),
            formatMonthDropdown: (month) => month.toLocaleString(locale, { month: "short" }),
            formatWeekdayName: (weekday) => weekday.toLocaleString(locale, { weekday: "short" })
        }
    };
}

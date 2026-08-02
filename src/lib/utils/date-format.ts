import * as chrono from "chrono-node";
import { isValid, parse } from "date-fns";
import { Temporal } from "temporal-polyfill";

/**
 * The civil-date fields a numeric locale pattern is built from, in the order
 * the locale renders them.
 */
type DateFieldName = "day" | "month" | "year";

/** A locale's numeric date pattern, decomposed into fields and literals. */
interface LocaleDatePattern {
    /** Field order as the locale renders it, e.g. day/month/year for en-AU. */
    readonly fields: readonly DateFieldName[];
    /** Literal separators, interleaved between and around the fields. */
    readonly literals: readonly string[];
}

/**
 * Render a calendar date through `Intl` without ever constructing an instant
 * whose civil date depends on the host time zone.
 *
 * `Intl.DateTimeFormat` needs a `Date`, and a `Date` is an instant. Anchoring
 * at UTC midnight and formatting in UTC keeps the civil date the caller asked
 * for, so nothing shifts for a viewer east or west of the line.
 */
function formatPlainDateParts(
    date: Temporal.PlainDate,
    locale: string,
    options: Intl.DateTimeFormatOptions
): readonly Intl.DateTimeFormatPart[] {
    const anchor = new Date(Date.UTC(2000, date.month - 1, date.day));
    anchor.setUTCFullYear(date.year);
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).formatToParts(anchor);
}

/**
 * Resolve the locale to format and parse with.
 *
 * Falls back to `en-GB` rather than `en-US` so a server render, where there is
 * no `navigator`, does not silently impose United States ordering.
 */
function resolveLocale(locale?: string): string {
    if (locale != null) return locale;
    return typeof navigator === "undefined" ? "en-GB" : navigator.language;
}

/**
 * Read a locale's numeric date pattern from `Intl` rather than hardcoding one.
 *
 * The day-and-month form is asked of `Intl` in its own right rather than
 * derived by deleting the year from the full form: some locales punctuate it
 * differently, e.g. de-DE shows "3.8." with a trailing separator.
 *
 * The reference date below uses a day and month that are distinguishable, so
 * the field a part belongs to is unambiguous.
 */
function localeDatePattern(locale: string, options: Intl.DateTimeFormatOptions): LocaleDatePattern {
    const parts = new Intl.DateTimeFormat(locale, {
        ...options,
        timeZone: "UTC"
    }).formatToParts(new Date(Date.UTC(2026, 7, 3)));

    const fields: DateFieldName[] = [];
    // One more literal slot than fields: the text before, between and after.
    const literals: string[] = [""];

    for (const part of parts) {
        if (part.type === "day" || part.type === "month" || part.type === "year") {
            fields.push(part.type);
            literals.push("");
            continue;
        }
        literals[literals.length - 1] += part.value;
    }

    return { fields, literals };
}

/** date-fns tokens for the day and month fields. */
const FIELD_TOKENS: Record<Exclude<DateFieldName, "year">, string> = {
    day: "d",
    month: "M"
};

/**
 * Build a date-fns parse format from a locale pattern, interleaving each
 * field's token with the literal text that precedes it.
 */
function patternToDateFnsFormat(pattern: LocaleDatePattern, yearToken: string): string {
    const body = pattern.fields.reduce((accumulated, field, index) => {
        const token = field === "year" ? yearToken : FIELD_TOKENS[field];
        return `${accumulated}${pattern.literals[index]}${token}`;
    }, "");

    return `${body}${pattern.literals[pattern.fields.length]}`;
}

/**
 * Format an ISO date string according to the user's locale.
 * Uses Temporal API for correct locale-aware formatting.
 *
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns Formatted date string (e.g., "Dec 31, 2025" for en-US)
 */
export function formatDate(isoDate: string, locale?: string): string {
    const date = Temporal.PlainDate.from(isoDate);
    return date.toLocaleString(locale ?? navigator.language, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

/**
 * Format an ISO date string with a compact format (no year if current year).
 *
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns Formatted date string (e.g., "Dec 31" or "Dec 31, 2024")
 */
export function formatDateCompact(isoDate: string, locale?: string): string {
    const date = Temporal.PlainDate.from(isoDate);
    const now = Temporal.Now.plainDateISO();

    if (date.year === now.year) {
        return date.toLocaleString(locale ?? navigator.language, {
            month: "short",
            day: "numeric"
        });
    }

    return formatDate(isoDate, locale);
}

/**
 * Format an ISO date string for transaction table display.
 * Pure function that accepts referenceDate for testability.
 *
 * Format rules, in the locale's own field order and separators:
 * - Same year as reference: day and month only, unpadded (e.g. "15/1", or "1/15" in en-US)
 * - Any other year: day, month and a TWO-digit year (e.g. "31/12/99")
 *
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param referenceDate - Reference date for "same year" comparison (defaults to today)
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns Formatted date string respecting locale's date order and separators
 */
export function formatTransactionDate(
    isoDate: string,
    referenceDate?: Temporal.PlainDate,
    locale?: string
): string {
    const date = Temporal.PlainDate.from(isoDate);
    const now = referenceDate ?? Temporal.Now.plainDateISO();
    const sameYear = date.year === now.year;

    const parts = formatPlainDateParts(date, resolveLocale(locale), {
        day: "numeric",
        month: "numeric",
        ...(sameYear ? {} : { year: "2-digit" })
    });

    // Strip padding from the day and month by field identity rather than by
    // position: a locale that renders the year first (ja-JP) would otherwise
    // have a leading-zero year read as a day and corrupted.
    return parts
        .map((part) =>
            part.type === "day" || part.type === "month" ? String(Number(part.value)) : part.value
        )
        .join("");
}

/**
 * Format an ISO date string for the editing presentation.
 *
 * Editing always shows the year, padded to two digits along with the day and
 * month, so the field widths stay stable as the value changes.
 *
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns Formatted date string respecting locale's date order and separators
 */
export function formatDateForEditing(isoDate: string, locale?: string): string {
    const date = Temporal.PlainDate.from(isoDate);

    return formatPlainDateParts(date, resolveLocale(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
    })
        .map((part) => part.value)
        .join("");
}

/**
 * Parse a date the user typed, in the form their own locale displays it.
 *
 * The locale's own field order is tried first, so whatever was rendered can be
 * typed straight back. Only once that fails do we fall back to natural language
 * ("tomorrow", "next tuesday"), which is US-ordered and would otherwise read a
 * day-first `03/08` as the eighth of March.
 *
 * @param input - The text the user typed
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @param referenceDate - Reference date for year-less input (defaults to today)
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if nothing parsed
 */
export function parseLocaleDate(
    input: string,
    locale?: string,
    referenceDate?: Temporal.PlainDate
): string | null {
    const trimmed = input.trim();
    if (trimmed === "") return null;

    const reference = referenceDate ?? Temporal.Now.plainDateISO();
    const resolvedLocale = resolveLocale(locale);

    const withYear = localeDatePattern(resolvedLocale, {
        day: "numeric",
        month: "numeric",
        year: "2-digit"
    });
    const withoutYear = localeDatePattern(resolvedLocale, {
        day: "numeric",
        month: "numeric"
    });

    // A year-less entry means the reference year, not a forward-biased guess.
    const referenceAnchor = new Date(Date.UTC(2000, reference.month - 1, reference.day));
    referenceAnchor.setUTCFullYear(reference.year);

    const candidateFormats = [
        patternToDateFnsFormat(withYear, "yy"),
        patternToDateFnsFormat(withYear, "yyyy"),
        patternToDateFnsFormat(withoutYear, "yy"),
        // ISO is unambiguous in every locale and is what we store.
        "yyyy-MM-dd"
    ];

    for (const candidateFormat of candidateFormats) {
        // date-fns throws on a malformed pattern; treat that as a failed parse.
        const parsed = ((): Date | null => {
            try {
                return parse(trimmed, candidateFormat, referenceAnchor);
            } catch {
                return null;
            }
        })();

        if (parsed && isValid(parsed)) {
            return Temporal.PlainDate.from({
                year: parsed.getFullYear(),
                month: parsed.getMonth() + 1,
                day: parsed.getDate()
            }).toString();
        }
    }

    return naturalLanguageDate(trimmed, referenceAnchor);
}

/**
 * Numeric-only date input, i.e. digits and separators with no letters.
 *
 * Input of this shape is the locale's own form and must never reach the
 * natural-language parser, which reads `3/8` as the eighth of March regardless
 * of what the viewer's locale just displayed. If it did not parse above, it is
 * an invalid date rather than a phrase.
 */
function isNumericDateInput(input: string): boolean {
    return /^[\d\s./,-]+$/.test(input);
}

/**
 * Parse natural language such as "tomorrow" or "next tuesday".
 *
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if nothing parsed
 */
function naturalLanguageDate(input: string, reference: Date): string | null {
    if (isNumericDateInput(input)) return null;

    const parsed = chrono.en.GB.parseDate(input, reference);
    if (!parsed) return null;

    return Temporal.PlainDate.from({
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
    }).toString();
}

/**
 * Parse a locale-formatted date string back to ISO format.
 * Falls back to native Date parsing for flexibility.
 *
 * @param dateString - User-entered date string
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if parsing fails
 */
export function parseDate(dateString: string, locale?: string): string | null {
    // Note: locale reserved for future locale-aware parsing
    void locale;
    // First try ISO format directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        try {
            Temporal.PlainDate.from(dateString);
            return dateString;
        } catch {
            return null;
        }
    }

    // Fall back to native Date for flexible parsing
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    // Convert to ISO string (YYYY-MM-DD)
    return Temporal.PlainDate.from({
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
    }).toString();
}

/**
 * Get the first day of the week for a locale.
 * Returns 1 (Monday) for most locales, 0 (Sunday) for en-US.
 *
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns Day of week (0 = Sunday, 1 = Monday, etc.)
 */
export function getWeekStartDay(locale?: string): number {
    const resolvedLocale = locale ?? navigator.language;

    // Locales that start week on Sunday (exact matches only)
    const sundayStartLocales = new Set([
        "en-US",
        "en-CA",
        "ja-JP",
        "ko-KR",
        "zh-CN",
        "zh-TW",
        "he-IL",
        "ar-SA",
        "pt-BR"
    ]);

    // Check exact locale match first
    if (sundayStartLocales.has(resolvedLocale)) {
        return 0; // Sunday
    }

    // For locales without region, default based on language
    // Only certain base languages default to Sunday
    const baseLanguage = resolvedLocale.split("-")[0];
    const sundayDefaultLanguages = new Set(["ja", "ko", "zh", "he"]);

    if (sundayDefaultLanguages.has(baseLanguage)) {
        return 0; // Sunday
    }

    return 1; // Monday (ISO default for most of the world)
}

/**
 * Get today's date as an ISO string.
 *
 * @returns ISO 8601 date string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
    return Temporal.Now.plainDateISO().toString();
}

/**
 * Check if a date string is valid ISO format.
 *
 * @param dateString - String to validate
 * @returns True if valid ISO 8601 date
 */
export function isValidISODate(dateString: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    try {
        Temporal.PlainDate.from(dateString);
        return true;
    } catch {
        return false;
    }
}

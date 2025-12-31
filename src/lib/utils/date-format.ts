import { Temporal } from "temporal-polyfill";

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
    year: "numeric",
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
      day: "numeric",
    });
  }

  return formatDate(isoDate, locale);
}

/**
 * Parse a locale-formatted date string back to ISO format.
 * Falls back to native Date parsing for flexibility.
 *
 * @param dateString - User-entered date string
 * @param locale - BCP 47 locale string (defaults to browser locale)
 * @returns ISO 8601 date string (YYYY-MM-DD) or null if parsing fails
 */
export function parseDate(dateString: string, _locale?: string): string | null {
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
    day: parsed.getDate(),
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
    "pt-BR",
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

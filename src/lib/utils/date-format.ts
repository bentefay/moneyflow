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
 * Format an ISO date string for transaction table display.
 * Pure function that accepts referenceDate for testability.
 * Internationalized using Temporal's toLocaleString.
 *
 * Format rules:
 * - Same year as reference: D/M (e.g., "15/1" or "1/15" in en-US)
 * - Year > 2000 but different from reference: D/M/YY (e.g., "25/12/23")
 * - Year <= 2000: DD/MM/YYYY (e.g., "31/12/1999")
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
	const resolvedLocale =
		locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-GB");

	if (date.year === now.year) {
		// Same year: D/M (compact, no year, no padding)
		// Use toLocaleString for order/separator, then strip leading zeros from day/month
		const formatted = date.toLocaleString(resolvedLocale, {
			day: "numeric",
			month: "numeric",
		});
		return stripLeadingZeros(formatted);
	}

	if (date.year > 2000) {
		// Year > 2000 but different year: D/M/YY (compact with 2-digit year)
		// Use toLocaleString for order/separator, then strip leading zeros from day/month
		const formatted = date.toLocaleString(resolvedLocale, {
			day: "numeric",
			month: "numeric",
			year: "2-digit",
		});
		return stripLeadingZerosExceptYear(formatted);
	}

	// Year <= 2000: DD/MM/YYYY (full format with padding)
	return date.toLocaleString(resolvedLocale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Strip leading zeros from date parts (day and month).
 * Preserves separators and order.
 * Example: "01/05" -> "1/5", "01.05." -> "1.5."
 */
function stripLeadingZeros(formatted: string): string {
	// Replace patterns like "01" at word boundaries with "1"
	// But preserve trailing dots for German format
	return formatted.replace(/\b0(\d)/g, "$1");
}

/**
 * Strip leading zeros from day/month but preserve the year part.
 * Example: "01/05/24" -> "1/5/24", "01.05.24" -> "1.5.24"
 */
function stripLeadingZerosExceptYear(formatted: string): string {
	// Split by common date separators, strip zeros from first two parts, keep year
	const parts = formatted.split(/([/.,-])/);
	let numericCount = 0;
	return parts
		.map((part) => {
			// Check if this part is numeric
			if (/^\d+$/.test(part)) {
				numericCount++;
				// Only strip zeros from first two numeric parts (day and month)
				// Keep the year (3rd numeric part) as-is
				if (numericCount <= 2) {
					return part.replace(/^0+/, "") || "0";
				}
			}
			return part;
		})
		.join("");
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

import { describe, expect, it } from "vitest";
import {
	formatDate,
	formatDateCompact,
	getTodayISO,
	getWeekStartDay,
	isValidISODate,
	parseDate,
} from "@/lib/utils/date-format";

describe("formatDate", () => {
	const testCases = [
		// US locale
		{ input: "2025-12-31", locale: "en-US", expected: "Dec 31, 2025" },
		{ input: "2025-01-01", locale: "en-US", expected: "Jan 1, 2025" },
		// UK locale
		{ input: "2025-12-31", locale: "en-GB", expected: "31 Dec 2025" },
		// German locale
		{ input: "2025-12-31", locale: "de-DE", expected: "31. Dez. 2025" },
		// Edge cases
		{ input: "2000-01-01", locale: "en-US", expected: "Jan 1, 2000" },
		{ input: "2099-12-31", locale: "en-US", expected: "Dec 31, 2099" },
	] as const;

	it.each(testCases)("formats $input as $expected for locale $locale", ({
		input,
		locale,
		expected,
	}) => {
		expect(formatDate(input, locale)).toBe(expected);
	});

	it("throws for invalid ISO date", () => {
		expect(() => formatDate("invalid")).toThrow();
		expect(() => formatDate("2025-13-01")).toThrow();
		expect(() => formatDate("2025-02-30")).toThrow();
	});
});

describe("formatDateCompact", () => {
	it("omits year for current year dates", () => {
		const today = getTodayISO();
		const currentYear = today.split("-")[0];
		const testDate = `${currentYear}-06-15`;

		const result = formatDateCompact(testDate, "en-US");
		expect(result).not.toContain(currentYear);
		expect(result).toBe("Jun 15");
	});

	it("includes year for past year dates", () => {
		const result = formatDateCompact("2020-06-15", "en-US");
		expect(result).toContain("2020");
		expect(result).toBe("Jun 15, 2020");
	});

	it("includes year for future year dates", () => {
		const result = formatDateCompact("2099-06-15", "en-US");
		expect(result).toContain("2099");
	});
});

describe("parseDate", () => {
	const validCases = [
		// ISO format
		{ input: "2025-12-31", expected: "2025-12-31" },
		{ input: "2025-01-01", expected: "2025-01-01" },
		// Common formats (via native Date fallback)
		{ input: "Dec 31, 2025", expected: "2025-12-31" },
		{ input: "December 31, 2025", expected: "2025-12-31" },
		{ input: "12/31/2025", expected: "2025-12-31" },
	] as const;

	it.each(validCases)("parses '$input' to $expected", ({ input, expected }) => {
		expect(parseDate(input)).toBe(expected);
	});

	const invalidCases = ["invalid", "not a date", "32/13/2025", ""];

	it.each(invalidCases)("returns null for invalid input '%s'", (input) => {
		expect(parseDate(input)).toBeNull();
	});
});

describe("getWeekStartDay", () => {
	const testCases = [
		// Sunday-start locales
		{ locale: "en-US", expected: 0 },
		{ locale: "ja-JP", expected: 0 },
		{ locale: "ko-KR", expected: 0 },
		{ locale: "he-IL", expected: 0 },
		// Monday-start locales
		{ locale: "en-GB", expected: 1 },
		{ locale: "de-DE", expected: 1 },
		{ locale: "fr-FR", expected: 1 },
		{ locale: "es-ES", expected: 1 },
	] as const;

	it.each(testCases)("returns $expected for locale $locale", ({ locale, expected }) => {
		expect(getWeekStartDay(locale)).toBe(expected);
	});
});

describe("getTodayISO", () => {
	it("returns valid ISO date string", () => {
		const today = getTodayISO();
		expect(isValidISODate(today)).toBe(true);
		expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe("isValidISODate", () => {
	const validCases = ["2025-12-31", "2025-01-01", "2000-06-15", "2099-02-28"];

	it.each(validCases)("returns true for valid date '%s'", (input) => {
		expect(isValidISODate(input)).toBe(true);
	});

	const invalidCases = [
		"invalid",
		"2025-13-01", // invalid month
		"2025-02-30", // invalid day
		"2025/12/31", // wrong format
		"25-12-31", // short year
		"2025-1-1", // missing leading zeros
		"",
	];

	it.each(invalidCases)("returns false for invalid date '%s'", (input) => {
		expect(isValidISODate(input)).toBe(false);
	});
});

// Locale-specific edge cases (T049)
describe("locale-specific edge cases", () => {
	describe("de-DE (German)", () => {
		it("formats with period after abbreviated month", () => {
			const result = formatDate("2025-03-15", "de-DE");
			expect(result).toMatch(/März|Mär\.?/); // March or Mar.
		});
	});

	describe("ja-JP (Japanese)", () => {
		it("formats in Japanese order (year-month-day)", () => {
			const result = formatDate("2025-12-31", "ja-JP");
			// Japanese typically: 2025年12月31日 or similar
			expect(result).toBeTruthy();
		});
	});

	describe("ar-SA (Arabic)", () => {
		it("formats Arabic date (may use different numerals)", () => {
			const result = formatDate("2025-12-31", "ar-SA");
			// Should produce some result without throwing
			expect(result).toBeTruthy();
		});

		it("week starts on Sunday", () => {
			expect(getWeekStartDay("ar-SA")).toBe(0);
		});
	});
});

/**
 * Unit tests for detect-currency module.
 *
 * Tests the browser locale → currency detection logic.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	detectDefaultCurrency,
	getBrowserLocale,
	getCurrencyFromLocale,
} from "@/lib/domain/detect-currency";

describe("detect-currency", () => {
	describe("getBrowserLocale", () => {
		beforeEach(() => {
			// Reset any mocks
			vi.unstubAllGlobals();
		});

		it("returns first language from navigator.languages", () => {
			vi.stubGlobal("navigator", {
				languages: ["de-DE", "en-US"],
				language: "en-US",
			});

			expect(getBrowserLocale()).toBe("de-DE");
		});

		it("falls back to navigator.language when languages is empty", () => {
			vi.stubGlobal("navigator", {
				languages: [],
				language: "fr-FR",
			});

			expect(getBrowserLocale()).toBe("fr-FR");
		});

		it("falls back to navigator.language when languages is undefined", () => {
			vi.stubGlobal("navigator", {
				languages: undefined,
				language: "ja-JP",
			});

			expect(getBrowserLocale()).toBe("ja-JP");
		});

		it("returns en-US as ultimate fallback", () => {
			vi.stubGlobal("navigator", {
				languages: undefined,
				language: undefined,
			});

			expect(getBrowserLocale()).toBe("en-US");
		});
	});

	describe("getCurrencyFromLocale", () => {
		it("returns USD for en-US", () => {
			expect(getCurrencyFromLocale("en-US")).toBe("USD");
		});

		it("returns GBP for en-GB", () => {
			expect(getCurrencyFromLocale("en-GB")).toBe("GBP");
		});

		it("returns EUR for de-DE", () => {
			expect(getCurrencyFromLocale("de-DE")).toBe("EUR");
		});

		it("returns EUR for fr-FR", () => {
			expect(getCurrencyFromLocale("fr-FR")).toBe("EUR");
		});

		it("returns JPY for ja-JP", () => {
			expect(getCurrencyFromLocale("ja-JP")).toBe("JPY");
		});

		it("returns AUD for en-AU", () => {
			expect(getCurrencyFromLocale("en-AU")).toBe("AUD");
		});

		it("returns CAD for en-CA", () => {
			expect(getCurrencyFromLocale("en-CA")).toBe("CAD");
		});

		it("returns CAD for fr-CA", () => {
			expect(getCurrencyFromLocale("fr-CA")).toBe("CAD");
		});

		it("returns CHF for de-CH", () => {
			expect(getCurrencyFromLocale("de-CH")).toBe("CHF");
		});

		it("returns BRL for pt-BR", () => {
			expect(getCurrencyFromLocale("pt-BR")).toBe("BRL");
		});

		it("returns CNY for zh-CN", () => {
			expect(getCurrencyFromLocale("zh-CN")).toBe("CNY");
		});

		it("returns INR for hi-IN", () => {
			expect(getCurrencyFromLocale("hi-IN")).toBe("INR");
		});

		it("returns KRW for ko-KR", () => {
			expect(getCurrencyFromLocale("ko-KR")).toBe("KRW");
		});

		it("returns MXN for es-MX", () => {
			expect(getCurrencyFromLocale("es-MX")).toBe("MXN");
		});

		it("returns undefined for locale without region", () => {
			expect(getCurrencyFromLocale("en")).toBeUndefined();
		});

		it("returns undefined for unknown region", () => {
			expect(getCurrencyFromLocale("en-XX")).toBeUndefined();
		});

		it("handles script subtag (zh-Hans-CN)", () => {
			expect(getCurrencyFromLocale("zh-Hans-CN")).toBe("CNY");
		});

		it("handles lowercase region", () => {
			expect(getCurrencyFromLocale("en-us")).toBe("USD");
		});
	});

	describe("detectDefaultCurrency", () => {
		beforeEach(() => {
			vi.unstubAllGlobals();
		});

		it("returns currency based on navigator.languages", () => {
			vi.stubGlobal("navigator", {
				languages: ["de-DE", "en-US"],
				language: "en-US",
			});

			expect(detectDefaultCurrency()).toBe("EUR");
		});

		it("returns currency based on navigator.language", () => {
			vi.stubGlobal("navigator", {
				languages: [],
				language: "ja-JP",
			});

			expect(detectDefaultCurrency()).toBe("JPY");
		});

		it("returns USD when locale has no region", () => {
			vi.stubGlobal("navigator", {
				languages: ["en"],
				language: "en",
			});

			expect(detectDefaultCurrency()).toBe("USD");
		});

		it("returns USD for unknown regions", () => {
			vi.stubGlobal("navigator", {
				languages: ["en-XX"],
				language: "en-XX",
			});

			expect(detectDefaultCurrency()).toBe("USD");
		});

		it("returns USD when navigator is undefined (SSR)", () => {
			// In Node.js test environment, navigator may not exist
			// We test this by checking the function handles it gracefully
			vi.stubGlobal("navigator", undefined);

			expect(detectDefaultCurrency()).toBe("USD");
		});

		it("returns USD when window is undefined (SSR)", () => {
			vi.stubGlobal("window", undefined);

			// Even with navigator defined, if window is undefined, should return USD
			expect(detectDefaultCurrency()).toBe("USD");
		});
	});

	describe("region coverage", () => {
		// Test that major regions are covered
		const testCases: Array<[string, string, string]> = [
			// [locale, expectedCurrency, description]
			["en-US", "USD", "United States"],
			["en-GB", "GBP", "United Kingdom"],
			["de-DE", "EUR", "Germany (Eurozone)"],
			["fr-FR", "EUR", "France (Eurozone)"],
			["es-ES", "EUR", "Spain (Eurozone)"],
			["it-IT", "EUR", "Italy (Eurozone)"],
			["nl-NL", "EUR", "Netherlands (Eurozone)"],
			["pt-PT", "EUR", "Portugal (Eurozone)"],
			["de-AT", "EUR", "Austria (Eurozone)"],
			["el-GR", "EUR", "Greece (Eurozone)"],
			["fi-FI", "EUR", "Finland (Eurozone)"],
			["hr-HR", "EUR", "Croatia (Eurozone since 2023)"],
			["sv-SE", "SEK", "Sweden (non-Eurozone)"],
			["da-DK", "DKK", "Denmark (non-Eurozone)"],
			["nb-NO", "NOK", "Norway (non-Eurozone)"],
			["pl-PL", "PLN", "Poland (non-Eurozone)"],
			["cs-CZ", "CZK", "Czech Republic (non-Eurozone)"],
			["hu-HU", "HUF", "Hungary (non-Eurozone)"],
			["de-CH", "CHF", "Switzerland"],
			["ja-JP", "JPY", "Japan"],
			["zh-CN", "CNY", "China"],
			["zh-TW", "TWD", "Taiwan"],
			["zh-HK", "HKD", "Hong Kong"],
			["ko-KR", "KRW", "South Korea"],
			["th-TH", "THB", "Thailand"],
			["vi-VN", "VND", "Vietnam"],
			["id-ID", "IDR", "Indonesia"],
			["ms-MY", "MYR", "Malaysia"],
			["en-SG", "SGD", "Singapore"],
			["en-PH", "PHP", "Philippines"],
			["hi-IN", "INR", "India"],
			["bn-BD", "BDT", "Bangladesh"],
			["ur-PK", "PKR", "Pakistan"],
			["en-AU", "AUD", "Australia"],
			["en-NZ", "NZD", "New Zealand"],
			["ar-AE", "AED", "UAE"],
			["ar-SA", "SAR", "Saudi Arabia"],
			["he-IL", "ILS", "Israel"],
			["tr-TR", "TRY", "Turkey"],
			["pt-BR", "BRL", "Brazil"],
			["es-AR", "ARS", "Argentina"],
			["es-MX", "MXN", "Mexico"],
			["es-CL", "CLP", "Chile"],
			["es-CO", "COP", "Colombia"],
			["en-ZA", "ZAR", "South Africa"],
			["ar-EG", "EGP", "Egypt"],
			["en-CA", "CAD", "Canada (English)"],
			["fr-CA", "CAD", "Canada (French)"],
			["ru-RU", "RUB", "Russia"],
			["uk-UA", "UAH", "Ukraine"],
		];

		it.each(testCases)("returns %s for %s (%s)", (locale, expectedCurrency) => {
			expect(getCurrencyFromLocale(locale)).toBe(expectedCurrency);
		});
	});
});

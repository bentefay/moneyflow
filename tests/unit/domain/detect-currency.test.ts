/**
 * Unit tests for detect-currency module.
 *
 * Tests time-zone-primary currency detection, with browser locale as the fallback
 * rung for time zones that yield no country.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    FALLBACK_CURRENCY,
    detectDefaultCurrency,
    getBrowserLocale,
    getBrowserTimeZone,
    getCurrencyFromLocale,
    getCurrencyFromTimeZone,
    resolveDefaultCurrency
} from "@/lib/domain/detect-currency";

/**
 * Stubs Intl.DateTimeFormat so resolvedOptions() reports the given time zone.
 * Passing undefined simulates an environment where the time zone is unavailable.
 */
function stubTimeZone(timeZone: string | undefined): void {
    const actual = Intl.DateTimeFormat;
    vi.stubGlobal("Intl", {
        ...Intl,
        DateTimeFormat: Object.assign(
            (...args: ConstructorParameters<typeof actual>) => ({
                ...new actual(...args),
                resolvedOptions: () => ({ ...new actual(...args).resolvedOptions(), timeZone })
            }),
            { supportedLocalesOf: actual.supportedLocalesOf }
        )
    });
}

describe("detect-currency", () => {
    describe("getBrowserLocale", () => {
        beforeEach(() => {
            // Reset any mocks
            vi.unstubAllGlobals();
        });

        it("returns first language from navigator.languages", () => {
            vi.stubGlobal("navigator", {
                languages: ["de-DE", "en-US"],
                language: "en-US"
            });

            expect(getBrowserLocale()).toBe("de-DE");
        });

        it("falls back to navigator.language when languages is empty", () => {
            vi.stubGlobal("navigator", {
                languages: [],
                language: "fr-FR"
            });

            expect(getBrowserLocale()).toBe("fr-FR");
        });

        it("falls back to navigator.language when languages is undefined", () => {
            vi.stubGlobal("navigator", {
                languages: undefined,
                language: "ja-JP"
            });

            expect(getBrowserLocale()).toBe("ja-JP");
        });

        it("returns en-US as ultimate fallback", () => {
            vi.stubGlobal("navigator", {
                languages: undefined,
                language: undefined
            });

            expect(getBrowserLocale()).toBe("en-US");
        });
    });

    describe("getBrowserTimeZone", () => {
        beforeEach(() => {
            vi.unstubAllGlobals();
        });

        it("returns the resolved IANA time zone", () => {
            stubTimeZone("Australia/Brisbane");

            expect(getBrowserTimeZone()).toBe("Australia/Brisbane");
        });

        it("returns undefined when the environment reports no time zone", () => {
            stubTimeZone(undefined);

            expect(getBrowserTimeZone()).toBeUndefined();
        });

        it("returns undefined when Intl is unavailable", () => {
            vi.stubGlobal("Intl", undefined);

            expect(getBrowserTimeZone()).toBeUndefined();
        });
    });

    describe("getCurrencyFromTimeZone", () => {
        // [timeZone, expectedCurrency, description]
        const resolvingZones: Array<[string, string, string]> = [
            ["Australia/Brisbane", "AUD", "the reporting user's own time zone"],
            ["Australia/Sydney", "AUD", "Australia, other zone"],
            ["Europe/London", "GBP", "United Kingdom"],
            ["Europe/Berlin", "EUR", "Germany (Eurozone)"],
            ["Europe/Paris", "EUR", "France (Eurozone)"],
            ["America/New_York", "USD", "United States"],
            ["America/Toronto", "CAD", "Canada"],
            ["Asia/Tokyo", "JPY", "Japan"],
            ["Asia/Shanghai", "CNY", "China"],
            ["Asia/Kolkata", "INR", "India"],
            ["Pacific/Auckland", "NZD", "New Zealand"],
            ["America/Sao_Paulo", "BRL", "Brazil"],
            ["Africa/Johannesburg", "ZAR", "South Africa"],
            ["Europe/Zurich", "CHF", "Switzerland"]
        ];

        it.each(resolvingZones)("maps %s to %s (%s)", (timeZone, expected) => {
            expect(getCurrencyFromTimeZone(timeZone)).toBe(expected);
        });

        // Deprecated IANA aliases must still resolve, because users and systems on
        // legacy zone names are exactly who this inference is for.
        // [deprecatedZone, expectedCurrency, canonicalName]
        const deprecatedAliases: Array<[string, string, string]> = [
            ["Australia/Queensland", "AUD", "Australia/Brisbane"],
            ["Australia/NSW", "AUD", "Australia/Sydney"],
            ["Asia/Calcutta", "INR", "Asia/Kolkata"],
            ["Europe/Kiev", "UAH", "Europe/Kyiv"],
            ["Asia/Saigon", "VND", "Asia/Ho_Chi_Minh"],
            ["America/Buenos_Aires", "ARS", "America/Argentina/Buenos_Aires"]
        ];

        it.each(deprecatedAliases)(
            "resolves deprecated alias %s to %s (canonical %s)",
            (timeZone, expected) => {
                expect(getCurrencyFromTimeZone(timeZone)).toBe(expected);
            }
        );

        // [timeZone, description]
        const nonResolvingZones: Array<[string, string]> = [
            ["UTC", "belongs to no country - common in containers and VMs"],
            ["Etc/UTC", "canonical UTC, also country-less"],
            ["Etc/GMT", "country-less"],
            ["Etc/GMT+10", "fixed-offset zone, country-less"],
            ["Not/AZone", "not a real IANA zone"],
            ["", "empty string"],
            ["Asia/Yangon", "resolves to MM, whose currency this app does not support"]
        ];

        it.each(nonResolvingZones)("returns undefined for %s (%s)", (timeZone) => {
            expect(getCurrencyFromTimeZone(timeZone)).toBeUndefined();
        });
    });

    describe("resolveDefaultCurrency", () => {
        it("prefers the time zone over a conflicting locale", () => {
            // The reported defect: LANG=en_US.UTF-8 on a machine in Brisbane.
            expect(resolveDefaultCurrency("Australia/Brisbane", "en-US")).toBe("AUD");
        });

        it("prefers the time zone even when the locale also resolves", () => {
            expect(resolveDefaultCurrency("Europe/Berlin", "en-GB")).toBe("EUR");
        });

        it("falls back to the locale when the time zone is UTC", () => {
            // Containers and VMs commonly report UTC, which maps to no country.
            expect(resolveDefaultCurrency("UTC", "en-GB")).toBe("GBP");
        });

        it("falls back to the locale when the time zone is unavailable", () => {
            expect(resolveDefaultCurrency(undefined, "ja-JP")).toBe("JPY");
        });

        it("falls back to the locale when the time zone is unknown", () => {
            expect(resolveDefaultCurrency("Not/AZone", "de-DE")).toBe("EUR");
        });

        it("falls back to the locale when the time zone country has no supported currency", () => {
            // Asia/Yangon resolves to MM, which REGION_TO_CURRENCY does not cover.
            expect(resolveDefaultCurrency("Asia/Yangon", "en-AU")).toBe("AUD");
        });

        it("falls back to the default currency when neither signal resolves", () => {
            expect(resolveDefaultCurrency("UTC", "en")).toBe(FALLBACK_CURRENCY);
        });

        it("falls back to the default currency when the locale region is unknown", () => {
            expect(resolveDefaultCurrency("Etc/GMT", "en-XX")).toBe(FALLBACK_CURRENCY);
        });

        it("falls back to the default currency when both signals are unavailable", () => {
            expect(resolveDefaultCurrency(undefined, undefined)).toBe(FALLBACK_CURRENCY);
        });

        it("is pure: repeated calls with the same inputs agree", () => {
            expect(resolveDefaultCurrency("Australia/Brisbane", "en-US")).toBe(
                resolveDefaultCurrency("Australia/Brisbane", "en-US")
            );
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

        it("handles locale with script subtag", () => {
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

        it("uses the time zone in preference to a conflicting locale", () => {
            // The reported defect, end to end: an en-US locale must not override
            // a Brisbane time zone.
            vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
            stubTimeZone("Australia/Brisbane");

            expect(detectDefaultCurrency()).toBe("AUD");
        });

        it("uses the locale when the time zone yields no country", () => {
            vi.stubGlobal("navigator", { languages: ["de-DE", "en-US"], language: "en-US" });
            stubTimeZone("UTC");

            expect(detectDefaultCurrency()).toBe("EUR");
        });

        it("uses navigator.language when languages is empty and the time zone is UTC", () => {
            vi.stubGlobal("navigator", { languages: [], language: "ja-JP" });
            stubTimeZone("UTC");

            expect(detectDefaultCurrency()).toBe("JPY");
        });

        it("returns the fallback when the locale has no region and the time zone is UTC", () => {
            vi.stubGlobal("navigator", { languages: ["en"], language: "en" });
            stubTimeZone("UTC");

            expect(detectDefaultCurrency()).toBe(FALLBACK_CURRENCY);
        });

        it("returns the fallback for unknown regions and a country-less time zone", () => {
            vi.stubGlobal("navigator", { languages: ["en-XX"], language: "en-XX" });
            stubTimeZone("Etc/GMT");

            expect(detectDefaultCurrency()).toBe(FALLBACK_CURRENCY);
        });

        it("returns the fallback when navigator is undefined (SSR)", () => {
            // In Node.js test environment, navigator may not exist
            // We test this by checking the function handles it gracefully
            vi.stubGlobal("navigator", undefined);

            expect(detectDefaultCurrency()).toBe(FALLBACK_CURRENCY);
        });

        it("returns the fallback when window is undefined (SSR)", () => {
            vi.stubGlobal("window", undefined);

            // Even with navigator defined, if window is undefined, should return the fallback
            expect(detectDefaultCurrency()).toBe(FALLBACK_CURRENCY);
        });

        it("returns a locale-derived currency when Intl is unavailable", () => {
            // Intl.DateTimeFormat is the only time zone source; without it the locale
            // rung must still work rather than the whole detection throwing.
            vi.stubGlobal("navigator", { languages: ["en-AU"], language: "en-AU" });
            vi.stubGlobal("Intl", undefined);

            expect(detectDefaultCurrency()).toBe("AUD");
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
            ["uk-UA", "UAH", "Ukraine"]
        ];

        it.each(testCases)("returns %s for %s (%s)", (locale, expectedCurrency) => {
            expect(getCurrencyFromLocale(locale)).toBe(expectedCurrency);
        });
    });
});

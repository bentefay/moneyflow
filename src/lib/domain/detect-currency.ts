/**
 * Detect Default Currency from Time Zone, falling back to Browser Locale
 *
 * The user's time zone is the primary signal. A locale's region subtag encodes
 * LANGUAGE preference, not location: `en-US` is the default locale on most Linux
 * installations, container images and development environments, so locale-derived
 * region silently collapses to the United States for users who are not there. A
 * user in `Australia/Brisbane` with an `en-US` locale is defaulted to USD when AUD
 * is correct. Time zone does not share this failure mode, because an incorrect time
 * zone visibly breaks clocks and calendars and is therefore usually correct.
 *
 * Resolution order:
 * 1. Time zone (Intl.DateTimeFormat().resolvedOptions().timeZone) -> ISO 3166 country -> currency
 * 2. Locale (navigator.languages[0], then navigator.language) -> region subtag -> currency
 * 3. FALLBACK_CURRENCY
 *
 * The locale rung exists for time zones that yield no country, such as the `UTC`
 * zone commonly configured in containers and virtual machines.
 *
 * The IANA-zone -> country mapping comes from `countries-and-timezones`, which is
 * generated from the IANA time zone database and resolves deprecated zone aliases
 * (e.g. `Australia/Queensland` -> `AU`, `Asia/Calcutta` -> `IN`).
 *
 * The result is only a default. It is presented in the vault creation flow and the
 * user can change it before and after creation.
 */

import { getCountryForTimezone } from "countries-and-timezones";

import { Currencies } from "./currencies";

/**
 * Currency used when neither the time zone nor the locale yields a supported currency.
 */
export const FALLBACK_CURRENCY = "USD";

/**
 * Detects the user's default currency, preferring the time zone over the locale.
 *
 * @returns ISO 4217 currency code (e.g., "AUD", "USD", "EUR")
 *
 * @example
 * ```ts
 * // User in Australia/Brisbane with an en-US locale
 * detectDefaultCurrency(); // "AUD"
 *
 * // Container reporting UTC with an en-GB locale
 * detectDefaultCurrency(); // "GBP"
 * ```
 */
export function detectDefaultCurrency(): string {
    // Server-side or no window - the server's time zone is not the user's, so
    // inferring from it would be misleading.
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return FALLBACK_CURRENCY;
    }

    try {
        return resolveDefaultCurrency(getBrowserTimeZone(), getBrowserLocale());
    } catch {
        // Any error in detection - use fallback
        return FALLBACK_CURRENCY;
    }
}

/**
 * Resolves a default currency from a time zone and a locale.
 *
 * This is the pure core of the detection: the time zone is tried first, the locale
 * second, and `FALLBACK_CURRENCY` last. A signal that resolves to a currency this
 * app does not support is treated the same as a signal that resolves to nothing.
 *
 * @param timeZone - IANA time zone name, or undefined when unavailable
 * @param locale - BCP 47 locale string, or undefined when unavailable
 * @returns ISO 4217 currency code
 */
export function resolveDefaultCurrency(
    timeZone: string | undefined,
    locale: string | undefined
): string {
    const fromTimeZone = timeZone === undefined ? undefined : getCurrencyFromTimeZone(timeZone);
    if (fromTimeZone !== undefined) {
        return fromTimeZone;
    }

    const fromLocale = locale === undefined ? undefined : getCurrencyFromLocale(locale);
    if (fromLocale !== undefined) {
        return fromLocale;
    }

    return FALLBACK_CURRENCY;
}

/**
 * Gets the browser's resolved IANA time zone.
 *
 * @returns IANA time zone name (e.g., "Australia/Brisbane"), or undefined if unavailable
 */
export function getBrowserTimeZone(): string | undefined {
    try {
        const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
        return timeZone ? timeZone : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Gets the browser's preferred locale.
 *
 * Checks navigator.languages first (array of preferred languages),
 * then falls back to navigator.language.
 *
 * @returns BCP 47 locale string (e.g., "en-US", "de-DE", "ja-JP")
 */
export function getBrowserLocale(): string {
    // navigator.languages is the preferred way - it's the user's language preference list
    if (navigator.languages && navigator.languages.length > 0) {
        return navigator.languages[0];
    }

    // Fallback to navigator.language
    return navigator.language || "en-US";
}

/**
 * Maps an IANA time zone to a supported currency via its ISO 3166-1 country.
 *
 * Zones that belong to no country (`UTC`, `Etc/GMT`), unknown zones, and countries
 * whose currency this app does not support all yield undefined so the caller can
 * fall back to the locale.
 *
 * @param timeZone - IANA time zone name (e.g., "Australia/Brisbane")
 * @returns ISO 4217 currency code or undefined
 */
export function getCurrencyFromTimeZone(timeZone: string): string | undefined {
    try {
        const country = getCountryForTimezone(timeZone);
        if (!country) {
            return undefined;
        }

        return supportedCurrencyForRegion(country.id);
    } catch {
        return undefined;
    }
}

/**
 * Extracts a supported currency from a locale's region subtag.
 *
 * The region part of a locale (e.g., "US" in "en-US") names a country, which has an
 * official currency. This is the FALLBACK signal: a region subtag reflects language
 * preference rather than location, so it is only consulted when the time zone yields
 * nothing.
 *
 * @param locale - BCP 47 locale string (e.g., "en-US", "de-DE")
 * @returns ISO 4217 currency code or undefined if detection fails
 */
export function getCurrencyFromLocale(locale: string): string | undefined {
    try {
        const region = extractRegion(locale);
        if (!region) {
            return undefined;
        }

        return supportedCurrencyForRegion(region);
    } catch {
        return undefined;
    }
}

/**
 * Maps an ISO 3166-1 alpha-2 country code to a currency this app supports.
 *
 * @param region - ISO 3166-1 alpha-2 country code, in any case
 * @returns ISO 4217 currency code or undefined
 */
function supportedCurrencyForRegion(region: string): string | undefined {
    const currency = REGION_TO_CURRENCY[region.toUpperCase()];
    if (currency && currency in Currencies) {
        return currency;
    }

    return undefined;
}

/**
 * Extracts the region subtag from a BCP 47 locale.
 *
 * Handles formats like:
 * - "en-US" -> "US"
 * - "de-DE" -> "DE"
 * - "zh-Hans-CN" -> "CN"
 * - "en" -> undefined (no region)
 *
 * @param locale - BCP 47 locale string
 * @returns Region code or undefined
 */
function extractRegion(locale: string): string | undefined {
    // Use Intl.Locale if available (modern browsers)
    try {
        const intlLocale = new Intl.Locale(locale);
        return intlLocale.region;
    } catch {
        // Fallback: Parse manually
        // BCP 47 format: language[-script][-region]
        // Region is 2 letters (ISO 3166-1 alpha-2) or 3 digits (UN M.49)
        const parts = locale.split("-");

        for (const part of parts.slice(1)) {
            // Region is 2 uppercase letters
            if (/^[A-Z]{2}$/i.test(part)) {
                return part.toUpperCase();
            }
        }

        return undefined;
    }
}

/**
 * Mapping of ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes.
 *
 * This covers the most common countries. Countries not in this list yield no
 * currency, so detection falls through to the next signal.
 *
 * Note: Some countries use USD directly (e.g., Ecuador, El Salvador).
 * Eurozone countries all map to EUR.
 */
const REGION_TO_CURRENCY: Record<string, string> = {
    // North America
    US: "USD",
    CA: "CAD",
    MX: "MXN",

    // Europe - Eurozone
    AT: "EUR", // Austria
    BE: "EUR", // Belgium
    CY: "EUR", // Cyprus
    EE: "EUR", // Estonia
    FI: "EUR", // Finland
    FR: "EUR", // France
    DE: "EUR", // Germany
    GR: "EUR", // Greece
    IE: "EUR", // Ireland
    IT: "EUR", // Italy
    LV: "EUR", // Latvia
    LT: "EUR", // Lithuania
    LU: "EUR", // Luxembourg
    MT: "EUR", // Malta
    NL: "EUR", // Netherlands
    PT: "EUR", // Portugal
    SK: "EUR", // Slovakia
    SI: "EUR", // Slovenia
    ES: "EUR", // Spain
    HR: "EUR", // Croatia (joined 2023)

    // Europe - Non-Eurozone
    GB: "GBP", // United Kingdom
    CH: "CHF", // Switzerland
    NO: "NOK", // Norway
    SE: "SEK", // Sweden
    DK: "DKK", // Denmark
    PL: "PLN", // Poland
    CZ: "CZK", // Czech Republic
    HU: "HUF", // Hungary
    RO: "RON", // Romania
    BG: "BGN", // Bulgaria
    IS: "ISK", // Iceland
    RU: "RUB", // Russia
    UA: "UAH", // Ukraine

    // Asia-Pacific
    JP: "JPY", // Japan
    CN: "CNY", // China
    HK: "HKD", // Hong Kong
    TW: "TWD", // Taiwan
    KR: "KRW", // South Korea
    SG: "SGD", // Singapore
    AU: "AUD", // Australia
    NZ: "NZD", // New Zealand
    IN: "INR", // India
    ID: "IDR", // Indonesia
    MY: "MYR", // Malaysia
    TH: "THB", // Thailand
    PH: "PHP", // Philippines
    VN: "VND", // Vietnam
    PK: "PKR", // Pakistan
    BD: "BDT", // Bangladesh

    // Middle East
    AE: "AED", // UAE
    SA: "SAR", // Saudi Arabia
    IL: "ILS", // Israel
    TR: "TRY", // Turkey
    QA: "QAR", // Qatar
    KW: "KWD", // Kuwait
    BH: "BHD", // Bahrain
    OM: "OMR", // Oman

    // Africa
    ZA: "ZAR", // South Africa
    EG: "EGP", // Egypt
    NG: "NGN", // Nigeria
    KE: "KES", // Kenya
    MA: "MAD", // Morocco

    // South America
    BR: "BRL", // Brazil
    AR: "ARS", // Argentina
    CL: "CLP", // Chile
    CO: "COP", // Colombia
    PE: "PEN", // Peru

    // Central America & Caribbean
    PA: "USD", // Panama (uses USD)
    CR: "CRC", // Costa Rica
    DO: "DOP", // Dominican Republic
    JM: "JMD" // Jamaica
};

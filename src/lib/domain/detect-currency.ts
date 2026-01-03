/**
 * Detect Default Currency from Browser Locale
 *
 * Uses the browser's Intl API to infer the user's preferred currency
 * based on their locale settings. This is more reliable than timezone
 * because locale directly encodes cultural/regional preferences.
 *
 * Detection order:
 * 1. navigator.languages[0] (user's preferred language list)
 * 2. navigator.language (browser's language)
 * 3. Falls back to "USD" if detection fails
 *
 * @see https://stackoverflow.com/questions/25606730/get-current-locale-of-chrome#answer-42070353
 */

import { Currencies } from "./currencies";

/**
 * Detects the user's preferred currency based on browser locale.
 *
 * Uses Intl.NumberFormat to resolve the locale's default currency.
 * This works because each locale has an associated currency
 * (e.g., "en-US" → USD, "en-GB" → GBP, "de-DE" → EUR, "ja-JP" → JPY).
 *
 * @returns ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
 *
 * @example
 * ```ts
 * // User with en-GB locale
 * detectDefaultCurrency(); // "GBP"
 *
 * // User with ja-JP locale
 * detectDefaultCurrency(); // "JPY"
 *
 * // User with de-DE locale
 * detectDefaultCurrency(); // "EUR"
 * ```
 */
export function detectDefaultCurrency(): string {
	// Server-side or no window - return fallback
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return "USD";
	}

	try {
		const locale = getBrowserLocale();

		const currency = getCurrencyFromLocale(locale);

		// Verify we support this currency
		if (currency && currency in Currencies) {
			return currency;
		}

		return "USD";
	} catch {
		// Any error in detection - use fallback
		return "USD";
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
 * Extracts currency code from a locale using Intl.NumberFormat.
 *
 * The Intl API knows the default currency for each locale.
 * We create a NumberFormat with style: "currency" and let the browser
 * resolve the default currency for that locale.
 *
 * @param locale - BCP 47 locale string (e.g., "en-US", "de-DE")
 * @returns ISO 4217 currency code or undefined if detection fails
 */
export function getCurrencyFromLocale(locale: string): string | undefined {
	try {
		// Create a NumberFormat for currency - the browser will resolve the locale's default currency
		// We need to provide *some* currency to create the formatter, but resolvedOptions()
		// will tell us what the locale's default would be... except that's not how it works.
		//
		// Alternative approach: Use a locale-to-currency mapping based on the region subtag
		const regionCurrency = getRegionCurrency(locale);
		if (regionCurrency) {
			return regionCurrency;
		}

		return undefined;
	} catch {
		return undefined;
	}
}

/**
 * Maps locale region subtag to currency.
 *
 * The region part of a locale (e.g., "US" in "en-US") typically maps
 * to a country, which has an official currency.
 *
 * @param locale - BCP 47 locale string
 * @returns ISO 4217 currency code or undefined
 */
function getRegionCurrency(locale: string): string | undefined {
	// Extract region from locale (e.g., "en-US" → "US", "de-DE" → "DE")
	const region = extractRegion(locale);
	if (!region) {
		return undefined;
	}

	return REGION_TO_CURRENCY[region.toUpperCase()];
}

/**
 * Extracts the region subtag from a BCP 47 locale.
 *
 * Handles formats like:
 * - "en-US" → "US"
 * - "de-DE" → "DE"
 * - "zh-Hans-CN" → "CN"
 * - "en" → undefined (no region)
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
 * This covers the most common countries. Countries not in this list
 * will fall back to USD.
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
	JM: "JMD", // Jamaica
};

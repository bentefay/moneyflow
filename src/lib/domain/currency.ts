/**
 * Currency Type and Factory Functions
 *
 * Provides type-safe currency handling using currency.js under the hood.
 * Money values are stored as integers in minor units (e.g., cents) in the CRDT,
 * and converted to currency.js for UI operations (formatting, arithmetic).
 */

import currencyJs from "currency.js";
import { Currencies } from "./currencies";

// ============================================================================
// Currency Code Type (derived from Currencies data)
// ============================================================================

/**
 * Valid ISO 4217 currency code.
 * Derived from the Currencies data object for type safety.
 */
export type CurrencyCode = keyof typeof Currencies;

/**
 * Type guard to check if a string is a valid currency code.
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
	return code.toUpperCase() in Currencies;
}

// ============================================================================
// Currency Definition (from ISO 4217)
// ============================================================================

/**
 * Currency metadata following ISO 4217 standard.
 * Data sourced from ts-money project.
 */
export interface Currency {
	/** ISO 4217 currency code (e.g., "USD", "EUR", "JPY") */
	code: string;
	/** Currency symbol for display (e.g., "$", "€", "¥") */
	symbol: string;
	/** Native symbol used in the currency's home region */
	symbol_native: string;
	/** Currency name in English */
	name: string;
	/** Plural form of currency name */
	name_plural: string;
	/** Number of decimal places (e.g., 2 for USD, 0 for JPY, 3 for KWD) */
	decimal_digits: number;
	/** Rounding increment (e.g., 0.05 for CHF) */
	rounding: number;
}

// ============================================================================
// Branded Type for Money in Minor Units
// ============================================================================

/**
 * Branded type for money amounts stored as integers in minor units.
 *
 * This ensures type safety - you can't accidentally pass a float where
 * an integer minor unit value is expected.
 *
 * @example
 * ```ts
 * // $12.34 is stored as 1234 cents
 * const amount: MoneyMinorUnits = toMinorUnits(USD(12.34));
 *
 * // In CRDT schema, amounts are MoneyMinorUnits
 * transaction.amount = amount;
 * ```
 */
declare const MoneyMinorUnitsBrand: unique symbol;
export type MoneyMinorUnits = number & { readonly [MoneyMinorUnitsBrand]: true };

/**
 * Create a MoneyMinorUnits value from a raw integer.
 * Use this when loading values from the CRDT or database.
 */
export function asMinorUnits(value: number): MoneyMinorUnits {
	if (!Number.isInteger(value)) {
		throw new Error(`MoneyMinorUnits must be an integer, got ${value}`);
	}
	return value as MoneyMinorUnits;
}

// ============================================================================
// Currency Factory Functions
// ============================================================================

/**
 * Create a currency factory function from a Currency definition.
 *
 * @example
 * ```ts
 * const USD = createCurrencyFactory(Currencies.USD);
 *
 * USD(12.34).format(); // "$12.34"
 * USD(1234, { fromCents: true }).format(); // "$12.34"
 * ```
 */
export function createCurrencyFactory(currency: Currency) {
	const { code, symbol, decimal_digits, rounding } = currency;

	const factory = (
		value: number | string | currencyJs,
		opts?: { fromCents?: boolean }
	): currencyJs => {
		return currencyJs(value, {
			symbol,
			precision: decimal_digits,
			decimal: ".",
			separator: ",",
			increment: rounding > 0 ? rounding : undefined,
			fromCents: opts?.fromCents ?? false,
			errorOnInvalid: true,
		});
	};

	// Attach metadata to the factory
	factory.code = code;
	factory.symbol = symbol;
	factory.precision = decimal_digits;

	return factory;
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert a currency.js value to minor units for storage.
 *
 * @example
 * ```ts
 * const amount = USD(12.34);
 * const cents = toMinorUnits(amount); // 1234 as MoneyMinorUnits
 * ```
 */
export function toMinorUnits(value: currencyJs): MoneyMinorUnits {
	return value.intValue as MoneyMinorUnits;
}

/**
 * Convert minor units to a currency.js value for display/arithmetic.
 *
 * @example
 * ```ts
 * const cents: MoneyMinorUnits = 1234;
 * const amount = fromMinorUnits(cents, USD); // currency.js representing $12.34
 * amount.format(); // "$12.34"
 * ```
 */
export function fromMinorUnits(
	value: MoneyMinorUnits,
	factory: ReturnType<typeof createCurrencyFactory>
): currencyJs {
	return factory(value, { fromCents: true });
}

/**
 * Get the multiplier to convert major units to minor units for a currency.
 * Based on the currency's decimal_digits (e.g., USD=100, JPY=1, BHD=1000).
 *
 * @example
 * ```ts
 * getMinorUnitMultiplier("USD"); // 100
 * getMinorUnitMultiplier("JPY"); // 1
 * getMinorUnitMultiplier("BHD"); // 1000
 * ```
 */
export function getMinorUnitMultiplier(currencyCode: string): number {
	const currency = Currencies[currencyCode.toUpperCase()];
	if (!currency) {
		// Default to 2 decimal places if unknown currency
		return 100;
	}
	return Math.pow(10, currency.decimal_digits);
}

/**
 * Convert a major unit amount to minor units for a specific currency.
 * This is currency-aware - JPY stays as-is, USD multiplies by 100, etc.
 *
 * @param amount - Amount in major units (e.g., dollars, yen)
 * @param currencyCode - ISO 4217 currency code (e.g., "USD", "JPY")
 * @returns Amount in minor units as MoneyMinorUnits
 *
 * @example
 * ```ts
 * toMinorUnitsForCurrency(12.34, "USD"); // 1234 (cents)
 * toMinorUnitsForCurrency(1234, "JPY");  // 1234 (yen has no minor units)
 * toMinorUnitsForCurrency(1.234, "BHD"); // 1234 (fils - 3 decimal places)
 * ```
 */
export function toMinorUnitsForCurrency(amount: number, currencyCode: string): MoneyMinorUnits {
	const multiplier = getMinorUnitMultiplier(currencyCode);
	return asMinorUnits(Math.round(amount * multiplier));
}

/**
 * Get currency metadata by code.
 * Returns undefined if currency code is not found.
 */
export function getCurrency(currencyCode: string): Currency | undefined {
	return Currencies[currencyCode.toUpperCase()];
}

// ============================================================================
// Intl.NumberFormat Helpers (Locale-Aware Formatting)
// ============================================================================

/**
 * Options for creating a currency formatter.
 */
export interface CurrencyFormatterOptions {
	/**
	 * How to display the currency.
	 * - "symbol": Use currency symbol (e.g., "$", "€")
	 * - "narrowSymbol": Use narrow symbol (e.g., "$" vs "US$")
	 * - "code": Use ISO code (e.g., "USD")
	 * - "name": Use localized name (e.g., "US dollars")
	 * @default "symbol"
	 */
	currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";

	/**
	 * Whether to use grouping separators (e.g., 1,234.56 vs 1234.56).
	 * @default true
	 */
	useGrouping?: boolean;

	/**
	 * How to display the sign for the number.
	 * - "auto": Sign for negative only (default)
	 * - "never": Never show sign
	 * - "always": Always show sign
	 * - "exceptZero": Sign for non-zero values
	 * @default "auto"
	 */
	signDisplay?: "auto" | "never" | "always" | "exceptZero";
}

/**
 * A currency formatter that handles MoneyMinorUnits conversion internally.
 */
export interface CurrencyFormatter {
	/** The currency this formatter is configured for */
	readonly currency: Currency;
	/** The underlying Intl.NumberFormat instance */
	readonly numberFormat: Intl.NumberFormat;
	/**
	 * Format a MoneyMinorUnits value for display.
	 * Automatically converts from minor units (e.g., cents) to major units (e.g., dollars).
	 */
	format(amount: MoneyMinorUnits): string;
	/**
	 * Format a raw number (in major units) for display.
	 * Use this when you already have a value in major units.
	 */
	formatMajorUnits(amount: number): string;
}

/**
 * Create a currency formatter for locale-aware money formatting.
 *
 * This is the recommended way to format currency for display. The formatter
 * respects the user's locale for number separators and symbol positioning,
 * while using the currency's decimal places.
 *
 * For performance, create the formatter once and reuse it. In React:
 * ```ts
 * const formatter = useMemo(
 *   () => createCurrencyFormatter(Currencies.USD, userLocale),
 *   [userLocale]
 * );
 * ```
 *
 * @param currency - Currency definition from Currencies object
 * @param locale - BCP 47 locale string (e.g., "en-US", "de-DE", "ja-JP")
 * @param options - Additional formatting options
 * @returns CurrencyFormatter with format method for MoneyMinorUnits
 *
 * @example
 * ```ts
 * const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
 * fmt.format(asMinorUnits(1234));    // "$12.34"
 * fmt.format(asMinorUnits(-5678));   // "-$56.78"
 *
 * // German locale - different separators and symbol position
 * const fmtDE = createCurrencyFormatter(Currencies.USD, "de-DE");
 * fmtDE.format(asMinorUnits(123456)); // "1.234,56 $"
 *
 * // Japanese Yen - no decimals
 * const fmtJPY = createCurrencyFormatter(Currencies.JPY, "ja-JP");
 * fmtJPY.format(asMinorUnits(1234)); // "￥1,234"
 * ```
 */
export function createCurrencyFormatter(
	currency: Currency,
	locale: Intl.LocalesArgument,
	options: CurrencyFormatterOptions = {}
): CurrencyFormatter {
	const { currencyDisplay = "symbol", useGrouping = true, signDisplay = "auto" } = options;

	const numberFormat = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currency.code,
		currencyDisplay,
		useGrouping,
		signDisplay,
	});

	const multiplier = Math.pow(10, currency.decimal_digits);

	return {
		currency,
		numberFormat,
		format(amount: MoneyMinorUnits): string {
			return numberFormat.format(amount / multiplier);
		},
		formatMajorUnits(amount: number): string {
			return numberFormat.format(amount);
		},
	};
}

/**
 * Convert MoneyMinorUnits to major units (e.g., cents to dollars).
 *
 * Use this when you need the numeric value for calculations or
 * when using your own formatting approach.
 *
 * @param amount - Amount in minor units
 * @param currencyCode - ISO 4217 currency code
 * @returns Amount in major units (may have decimals)
 *
 * @example
 * ```ts
 * toMajorUnits(asMinorUnits(1234), "USD"); // 12.34
 * toMajorUnits(asMinorUnits(1234), "JPY"); // 1234 (no minor units)
 * ```
 */
export function toMajorUnits(amount: MoneyMinorUnits, currencyCode: CurrencyCode | string): number {
	const multiplier = getMinorUnitMultiplier(currencyCode);
	return amount / multiplier;
}

// ============================================================================
// Pre-built Common Currency Factories (for tests)
// ============================================================================

// These are convenience exports for tests. Production code should create
// factories dynamically using createCurrencyFactory(Currencies.XXX) or
// createCurrencyFactory(getCurrency(currencyCode)).

/** US Dollar factory */
export const USD = createCurrencyFactory(Currencies.USD);

/** Euro factory */
export const EUR = createCurrencyFactory(Currencies.EUR);

/** British Pound factory */
export const GBP = createCurrencyFactory(Currencies.GBP);

/** Japanese Yen factory */
export const JPY = createCurrencyFactory(Currencies.JPY);

/** Canadian Dollar factory */
export const CAD = createCurrencyFactory(Currencies.CAD);

/** Australian Dollar factory */
export const AUD = createCurrencyFactory(Currencies.AUD);

/** Swiss Franc factory (uses 0.05 rounding) */
export const CHF = createCurrencyFactory(Currencies.CHF);

/** Bitcoin factory (8 decimal places) */
export const BTC = createCurrencyFactory(Currencies.BTC);

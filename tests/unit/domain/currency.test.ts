/**
 * Currency Module Tests
 *
 * Tests for currency.js integration, branded types, and conversion utilities.
 */

import { describe, expect, it } from "vitest";
import { Currencies } from "@/lib/domain/currencies";
import {
	asMinorUnits,
	BTC,
	CHF,
	createCurrencyFactory,
	createCurrencyFormatter,
	fromMinorUnits,
	getCurrency,
	getMinorUnitMultiplier,
	isValidCurrencyCode,
	JPY,
	toMajorUnits,
	toMinorUnits,
	toMinorUnitsForCurrency,
	USD,
} from "@/lib/domain/currency";

describe("Currency factories", () => {
	describe("USD", () => {
		it("formats basic amounts", () => {
			expect(USD(12.34).format()).toBe("$12.34");
			expect(USD(1234.56).format()).toBe("$1,234.56");
			expect(USD(0).format()).toBe("$0.00");
		});

		it("handles negative amounts", () => {
			expect(USD(-12.34).format()).toBe("-$12.34");
		});

		it("performs arithmetic correctly", () => {
			expect(USD(10.0).add(5.25).format()).toBe("$15.25");
			expect(USD(10.0).subtract(3.5).format()).toBe("$6.50");
			expect(USD(10.0).multiply(3).format()).toBe("$30.00");
			expect(USD(10.0).divide(4).format()).toBe("$2.50");
		});

		it("distributes amounts fairly", () => {
			const distributed = USD(10.0).distribute(3);
			expect(distributed.map((d) => d.format())).toEqual(["$3.34", "$3.33", "$3.33"]);
			// Sum should equal original
			const sum = distributed.reduce((acc, d) => acc.add(d), USD(0));
			expect(sum.format()).toBe("$10.00");
		});

		it("has correct metadata", () => {
			expect(USD.code).toBe("USD");
			expect(USD.symbol).toBe("$");
			expect(USD.precision).toBe(2);
		});
	});

	describe("JPY (zero decimal)", () => {
		it("formats without decimals", () => {
			expect(JPY(1234).format()).toBe("¥1,234");
			expect(JPY(1234.56).format()).toBe("¥1,235"); // Rounds
		});

		it("has correct precision", () => {
			expect(JPY.precision).toBe(0);
		});
	});

	describe("CHF (0.05 rounding)", () => {
		it("rounds to nearest 0.05", () => {
			expect(CHF(1.02).format()).toBe("CHF1.00");
			expect(CHF(1.03).format()).toBe("CHF1.05");
			expect(CHF(1.07).format()).toBe("CHF1.05");
			expect(CHF(1.08).format()).toBe("CHF1.10");
		});
	});

	describe("BTC (8 decimal places)", () => {
		it("handles 8 decimal precision", () => {
			expect(BTC(0.00000001).format()).toBe("BTC0.00000001");
			expect(BTC(1.23456789).format()).toBe("BTC1.23456789");
		});
	});
});

describe("MoneyMinorUnits", () => {
	describe("toMinorUnits", () => {
		it("converts USD to cents", () => {
			const cents = toMinorUnits(USD(12.34));
			expect(cents).toBe(1234);
		});

		it("converts JPY to units (no decimals)", () => {
			const units = toMinorUnits(JPY(1234));
			expect(units).toBe(1234);
		});

		it("converts BTC to satoshis", () => {
			const satoshis = toMinorUnits(BTC(1.00000001));
			expect(satoshis).toBe(100000001);
		});
	});

	describe("fromMinorUnits", () => {
		it("converts cents to USD", () => {
			const cents = asMinorUnits(1234);
			const amount = fromMinorUnits(cents, USD);
			expect(amount.format()).toBe("$12.34");
		});

		it("converts units to JPY", () => {
			const units = asMinorUnits(1234);
			const amount = fromMinorUnits(units, JPY);
			expect(amount.format()).toBe("¥1,234");
		});
	});

	describe("asMinorUnits", () => {
		it("accepts integers", () => {
			expect(asMinorUnits(1234)).toBe(1234);
			expect(asMinorUnits(0)).toBe(0);
			expect(asMinorUnits(-500)).toBe(-500);
		});

		it("throws on non-integers", () => {
			expect(() => asMinorUnits(12.34)).toThrow("must be an integer");
			expect(() => asMinorUnits(0.1)).toThrow("must be an integer");
		});
	});

	describe("roundtrip", () => {
		it("preserves value through conversion", () => {
			const original = USD(99.99);
			const cents = toMinorUnits(original);
			const restored = fromMinorUnits(cents, USD);
			expect(restored.value).toBe(original.value);
		});

		it("handles edge cases", () => {
			// Very small amount
			const small = USD(0.01);
			expect(fromMinorUnits(toMinorUnits(small), USD).value).toBe(0.01);

			// Large amount
			const large = USD(999999.99);
			expect(fromMinorUnits(toMinorUnits(large), USD).value).toBe(999999.99);
		});
	});
});

describe("createCurrencyFactory", () => {
	it("creates factory from Currency definition", () => {
		const euroFactory = createCurrencyFactory(Currencies.EUR);
		expect(euroFactory(100).format()).toBe("€100.00");
		expect(euroFactory.code).toBe("EUR");
	});

	it("handles currencies with different precisions", () => {
		const jpyFactory = createCurrencyFactory(Currencies.JPY);
		expect(jpyFactory(1000).format()).toBe("¥1,000");

		const kwdFactory = createCurrencyFactory(Currencies.KWD);
		expect(kwdFactory(1.234).format()).toBe("KD1.234");
		expect(kwdFactory.precision).toBe(3);
	});
});

describe("Currencies data", () => {
	it("has USD defined", () => {
		expect(Currencies.USD).toBeDefined();
		expect(Currencies.USD.code).toBe("USD");
		expect(Currencies.USD.decimal_digits).toBe(2);
	});

	it("has common currencies", () => {
		expect(Currencies.EUR).toBeDefined();
		expect(Currencies.GBP).toBeDefined();
		expect(Currencies.JPY).toBeDefined();
		expect(Currencies.CAD).toBeDefined();
		expect(Currencies.AUD).toBeDefined();
	});

	it("has currencies with 0 decimal digits", () => {
		expect(Currencies.JPY.decimal_digits).toBe(0);
		expect(Currencies.KRW.decimal_digits).toBe(0);
	});

	it("has currencies with 3 decimal digits", () => {
		expect(Currencies.KWD.decimal_digits).toBe(3);
		expect(Currencies.BHD.decimal_digits).toBe(3);
	});

	it("has CHF with rounding", () => {
		expect(Currencies.CHF.rounding).toBe(0.05);
	});
});

describe("getMinorUnitMultiplier", () => {
	it("returns 100 for 2-decimal currencies", () => {
		expect(getMinorUnitMultiplier("USD")).toBe(100);
		expect(getMinorUnitMultiplier("EUR")).toBe(100);
		expect(getMinorUnitMultiplier("GBP")).toBe(100);
	});

	it("returns 1 for 0-decimal currencies", () => {
		expect(getMinorUnitMultiplier("JPY")).toBe(1);
		expect(getMinorUnitMultiplier("KRW")).toBe(1);
	});

	it("returns 1000 for 3-decimal currencies", () => {
		expect(getMinorUnitMultiplier("KWD")).toBe(1000);
		expect(getMinorUnitMultiplier("BHD")).toBe(1000);
	});

	it("returns 100000000 for BTC (8 decimals)", () => {
		expect(getMinorUnitMultiplier("BTC")).toBe(100000000);
	});

	it("handles case-insensitivity", () => {
		expect(getMinorUnitMultiplier("usd")).toBe(100);
		expect(getMinorUnitMultiplier("Eur")).toBe(100);
	});

	it("defaults to 100 for unknown currencies", () => {
		expect(getMinorUnitMultiplier("UNKNOWN")).toBe(100);
	});
});

describe("toMinorUnitsForCurrency", () => {
	it("converts USD amounts to cents", () => {
		expect(toMinorUnitsForCurrency(12.34, "USD")).toBe(1234);
		expect(toMinorUnitsForCurrency(0.01, "USD")).toBe(1);
		expect(toMinorUnitsForCurrency(-50.0, "USD")).toBe(-5000);
	});

	it("converts JPY amounts (no change - 0 decimals)", () => {
		expect(toMinorUnitsForCurrency(1234, "JPY")).toBe(1234);
		// Rounds fractional yen
		expect(toMinorUnitsForCurrency(1234.5, "JPY")).toBe(1235);
	});

	it("converts KWD amounts (3 decimal places)", () => {
		expect(toMinorUnitsForCurrency(1.234, "KWD")).toBe(1234);
		expect(toMinorUnitsForCurrency(10.0, "KWD")).toBe(10000);
	});

	it("converts BTC amounts (8 decimal places)", () => {
		expect(toMinorUnitsForCurrency(1.00000001, "BTC")).toBe(100000001);
		expect(toMinorUnitsForCurrency(0.00000001, "BTC")).toBe(1);
	});

	it("rounds to nearest integer", () => {
		// 12.345 cents should round to 12 cents (1235 total for $12.35)
		expect(toMinorUnitsForCurrency(12.345, "USD")).toBe(1235);
		expect(toMinorUnitsForCurrency(12.344, "USD")).toBe(1234);
	});

	it("handles case-insensitivity", () => {
		expect(toMinorUnitsForCurrency(12.34, "usd")).toBe(1234);
	});
});

describe("getCurrency", () => {
	it("returns currency for valid codes", () => {
		const usd = getCurrency("USD");
		expect(usd).toBeDefined();
		expect(usd?.code).toBe("USD");
		expect(usd?.decimal_digits).toBe(2);
	});

	it("handles case-insensitivity", () => {
		expect(getCurrency("usd")?.code).toBe("USD");
		expect(getCurrency("Eur")?.code).toBe("EUR");
	});

	it("returns undefined for unknown currencies", () => {
		expect(getCurrency("UNKNOWN")).toBeUndefined();
	});
});

describe("isValidCurrencyCode", () => {
	it("returns true for valid currency codes", () => {
		expect(isValidCurrencyCode("USD")).toBe(true);
		expect(isValidCurrencyCode("EUR")).toBe(true);
		expect(isValidCurrencyCode("JPY")).toBe(true);
	});

	it("handles case-insensitivity", () => {
		expect(isValidCurrencyCode("usd")).toBe(true);
		expect(isValidCurrencyCode("Eur")).toBe(true);
	});

	it("returns false for invalid currency codes", () => {
		expect(isValidCurrencyCode("INVALID")).toBe(false);
		expect(isValidCurrencyCode("XXX")).toBe(false);
		expect(isValidCurrencyCode("")).toBe(false);
	});
});

describe("Intl.NumberFormat helpers", () => {
	describe("createCurrencyFormatter", () => {
		it("creates formatter for USD in en-US locale", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.format(asMinorUnits(123456))).toBe("$1,234.56");
		});

		it("creates formatter for USD in de-DE locale", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "de-DE");
			// German uses period for thousands, comma for decimals, symbol after
			expect(fmt.format(asMinorUnits(123456))).toMatch(/1\.234,56/);
		});

		it("handles JPY (0 decimal places)", () => {
			const fmt = createCurrencyFormatter(Currencies.JPY, "ja-JP");
			// JPY has no decimals - 1234 minor units = ¥1,234
			expect(fmt.format(asMinorUnits(1234))).toMatch(/1,234/);
		});

		it("handles KWD (3 decimal places)", () => {
			const fmt = createCurrencyFormatter(Currencies.KWD, "en-US");
			// 1234 fils = 1.234 KWD
			expect(fmt.format(asMinorUnits(1234))).toMatch(/1\.234/);
		});

		it("respects currencyDisplay option", () => {
			const fmtCode = createCurrencyFormatter(Currencies.USD, "en-US", { currencyDisplay: "code" });
			expect(fmtCode.format(asMinorUnits(10000))).toContain("USD");

			const fmtName = createCurrencyFormatter(Currencies.USD, "en-US", { currencyDisplay: "name" });
			expect(fmtName.format(asMinorUnits(10000)).toLowerCase()).toContain("dollar");
		});

		it("respects useGrouping option", () => {
			const withGrouping = createCurrencyFormatter(Currencies.USD, "en-US", { useGrouping: true });
			expect(withGrouping.format(asMinorUnits(123456789))).toContain(",");

			const noGrouping = createCurrencyFormatter(Currencies.USD, "en-US", { useGrouping: false });
			expect(noGrouping.format(asMinorUnits(123456789))).not.toContain(",");
		});

		it("respects signDisplay option", () => {
			const always = createCurrencyFormatter(Currencies.USD, "en-US", { signDisplay: "always" });
			expect(always.format(asMinorUnits(10000))).toContain("+");

			const never = createCurrencyFormatter(Currencies.USD, "en-US", { signDisplay: "never" });
			expect(never.format(asMinorUnits(-10000))).not.toContain("-");
		});

		it("exposes currency metadata", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.currency.code).toBe("USD");
			expect(fmt.currency.decimal_digits).toBe(2);
		});

		it("exposes underlying numberFormat", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.numberFormat).toBeInstanceOf(Intl.NumberFormat);
		});

		it("provides formatMajorUnits for raw numbers", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.formatMajorUnits(1234.56)).toBe("$1,234.56");
		});
	});

	describe("format method", () => {
		it("formats MoneyMinorUnits correctly", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.format(asMinorUnits(1234))).toBe("$12.34");
		});

		it("reuses formatter for multiple values", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			expect(fmt.format(asMinorUnits(1234))).toBe("$12.34");
			expect(fmt.format(asMinorUnits(5678))).toBe("$56.78");
			expect(fmt.format(asMinorUnits(100))).toBe("$1.00");
		});

		it("handles different locales via formatter", () => {
			const cents = asMinorUnits(123456); // $1,234.56
			const fmtUS = createCurrencyFormatter(Currencies.USD, "en-US");
			const fmtDE = createCurrencyFormatter(Currencies.USD, "de-DE");

			expect(fmtUS.format(cents)).toBe("$1,234.56");
			expect(fmtDE.format(cents)).toMatch(/1\.234,56/);
		});

		it("handles JPY (minor units = major units)", () => {
			const fmt = createCurrencyFormatter(Currencies.JPY, "en-US");
			const yen = asMinorUnits(1234);
			// Should show as ¥1,234 (not ¥12.34)
			expect(fmt.format(yen)).toMatch(/1,234/);
		});

		it("handles KWD (3 decimal places)", () => {
			const fmt = createCurrencyFormatter(Currencies.KWD, "en-US");
			const fils = asMinorUnits(1234); // 1.234 KWD
			expect(fmt.format(fils)).toMatch(/1\.234/);
		});

		it("handles negative amounts", () => {
			const fmt = createCurrencyFormatter(Currencies.USD, "en-US");
			const negative = asMinorUnits(-1234);
			expect(fmt.format(negative)).toMatch(/-?\$12\.34/);
		});
	});
});

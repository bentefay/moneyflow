import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    normaliseAllocationText,
    normaliseAmountText,
    normaliseNumericText
} from "@/lib/domain/numeric-text";

const NUMERIC_TEXT_SEED = 0x6e756d;

describe("normaliseNumericText", () => {
    it.each([
        // Blank: no digit survives.
        ["empty text", "", null],
        ["whitespace", "   ", null],
        ["letters only", "abc", null],
        ["lone minus", "-", null],
        ["lone decimal point", ".", null],
        ["sign and point only", "-.", null],
        // Stray characters are ignored.
        ["leading letter before a decimal", "a.1", 0.1],
        ["trailing letters", "12abc", 12],
        ["letters between digits", "1a2", 12],
        ["currency symbol and group separators", "$1,234.50", 1234.5],
        ["surrounding spaces", "  42  ", 42],
        ["explicit plus", "+5", 5],
        ["accounting parentheses", "(5.00)", 5],
        ["exponent marker is a letter", "1e2", 12],
        // Decimal separators.
        ["leading decimal point", ".5", 0.5],
        ["trailing decimal point", "5.", 5],
        ["repeated decimal points", "1.2.3", 1.23],
        ["doubled decimal point", "1..5", 1.5],
        ["comma is a group separator, not a decimal", "1,5", 15],
        // Signs.
        ["negative", "-5", -5],
        ["negative leading decimal", "-.5", -0.5],
        ["doubled minus", "--5", -5],
        ["minus separated by a space", "- 5", -5],
        ["minus after the decimal point but before a digit", ".-5", -0.5],
        ["trailing minus is ignored", "5-", 5],
        ["inner minus is ignored", "1-2", 12],
        ["plus then minus", "+-5", -5],
        // Zero is canonical.
        ["zero", "0", 0],
        ["negative zero", "-0", 0],
        ["negative zero decimal", "-0.00", 0],
        ["leading zeros", "007.50", 7.5]
    ])("%s: %j", (_name, text, expected) => {
        const result = normaliseNumericText(text);
        if (expected == null) {
            expect(result).toEqual({ kind: "blank" });
            return;
        }
        expect(result).toEqual({ kind: "number", value: expected });
        if (result.kind === "number") expect(Object.is(result.value, -0)).toBe(false);
    });

    it("treats an unrepresentably long number as blank", () => {
        expect(normaliseNumericText("9".repeat(400))).toEqual({ kind: "blank" });
    });

    it("is blank exactly when the text contains no digit", () => {
        fc.assert(
            fc.property(fc.string(), (text) => {
                const result = normaliseNumericText(text);
                const hasDigit = /\d/.test(text);
                expect(result.kind === "blank").toBe(!hasDigit);
            }),
            { seed: NUMERIC_TEXT_SEED }
        );
    });

    it("reads canonical decimal text exactly", () => {
        fc.assert(
            fc.property(
                fc.boolean(),
                fc.integer({ min: 0, max: 999_999_999 }),
                fc.stringMatching(/^\d{0,6}$/),
                (negative, whole, fraction) => {
                    const text = `${negative ? "-" : ""}${String(whole)}${fraction ? `.${fraction}` : ""}`;
                    expect(normaliseNumericText(text)).toEqual({
                        kind: "number",
                        value: Number(text) + 0
                    });
                }
            ),
            { seed: NUMERIC_TEXT_SEED }
        );
    });

    it("ignores letters, spaces, plus signs and group separators wherever they appear", () => {
        const noise = fc.stringMatching(/^[a-zA-Z ,+$€()]{0,3}$/);
        fc.assert(
            fc.property(
                fc.integer({ min: -999_999, max: 999_999 }),
                fc.nat({ max: 99 }),
                noise,
                noise,
                noise,
                (whole, cents, before, middle, after) => {
                    const sign = whole < 0 ? "-" : "";
                    const digits = String(Math.abs(whole));
                    const canonical = `${sign}${digits}.${String(cents).padStart(2, "0")}`;
                    const noisy = `${before}${sign}${digits}${middle}.${String(cents).padStart(2, "0")}${after}`;
                    expect(normaliseNumericText(noisy)).toEqual(normaliseNumericText(canonical));
                }
            ),
            { seed: NUMERIC_TEXT_SEED }
        );
    });

    it("is idempotent over its own output", () => {
        fc.assert(
            fc.property(fc.string(), (text) => {
                const first = normaliseNumericText(text);
                if (first.kind === "blank" || Math.abs(first.value) >= 1e15) return;
                expect(normaliseNumericText(String(first.value))).toEqual(first);
            }),
            { seed: NUMERIC_TEXT_SEED }
        );
    });
});

describe("normaliseAmountText", () => {
    it.each([
        ["blank text", "", "USD", null],
        ["wholly non-numeric text", "n/a", "USD", null],
        ["dollars and cents", "12.34", "USD", 1234],
        ["valid negative", "-12.34", "USD", -1234],
        ["leading letter", "a.1", "USD", 10],
        ["rounds to cents", "1.239", "USD", 124],
        ["rounds a tiny negative to zero", "-0.004", "USD", 0],
        ["yen has no minor digits", "1234.6", "JPY", 1235],
        ["dinar has three minor digits", "1.2345", "KWD", 1235],
        ["explicit zero", "0", "USD", 0],
        ["too large to store", "9".repeat(20), "USD", null]
    ])("%s", (_name, text, currency, expected) => {
        const result = normaliseAmountText(text, currency);
        if (expected == null) {
            expect(result).toEqual({ kind: "blank" });
            return;
        }
        expect(result).toEqual({ kind: "amount", minorUnits: expected });
        if (result.kind === "amount") expect(Object.is(result.minorUnits, -0)).toBe(false);
    });

    it("round-trips every safe minor-unit amount formatted at currency precision", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 }),
                (minorUnits) => {
                    const text = (minorUnits / 100).toFixed(2);
                    expect(normaliseAmountText(text, "USD")).toEqual({
                        kind: "amount",
                        minorUnits: minorUnits + 0
                    });
                }
            ),
            { seed: NUMERIC_TEXT_SEED }
        );
    });

    it("always stores a safe integer or blank", () => {
        fc.assert(
            fc.property(fc.string(), fc.constantFrom("USD", "JPY", "KWD"), (text, currency) => {
                const result = normaliseAmountText(text, currency);
                if (result.kind === "amount") {
                    expect(Number.isSafeInteger(result.minorUnits)).toBe(true);
                }
            }),
            { seed: NUMERIC_TEXT_SEED }
        );
    });
});

describe("normaliseAllocationText", () => {
    it.each([
        ["blank text", "", null],
        ["wholly non-numeric text", "abc", null],
        ["leading letter", "a.1", 0.1],
        ["explicit zero", "0", 0],
        ["negative zero", "-0", 0],
        ["negative", "-20", -20],
        ["above 100 stays as typed", "150", 150],
        ["below -100 stays as typed", "-250.5", -250.5],
        ["percent sign is ignored", "33.5%", 33.5]
    ])("%s", (_name, text, expected) => {
        const result = normaliseAllocationText(text);
        if (expected == null) {
            expect(result).toEqual({ kind: "blank" });
            return;
        }
        expect(result).toEqual({ kind: "percentage", value: expected });
    });

    it("never clamps a finite percentage", () => {
        fc.assert(
            fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (value) => {
                expect(normaliseAllocationText(String(value))).toEqual({
                    kind: "percentage",
                    value: value + 0
                });
            }),
            { seed: NUMERIC_TEXT_SEED }
        );
    });
});

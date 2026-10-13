/**
 * Normalisation of free-typed numeric cell text.
 *
 * Numeric grid cells accept any text while editing and normalise it once, when the editor is left.
 * Normalisation never fails: text either names a number or is blank, so invalid or incomplete text
 * can never block leaving the cell. The rules are deliberately small and deterministic:
 *
 * 1. Only digits, `.` and `-` are significant. Everything else — letters, spaces, currency symbols,
 *    `+`, parentheses and `,` digit-group separators — is ignored, so `"a.1"` is `0.1`,
 *    `"$1,234.50"` is `1234.5` and `"1,5"` is `15`.
 * 2. Text with no digit is blank, so `""`, `"abc"`, `"-"` and `"."` are all blank.
 * 3. The value is negative exactly when a `-` appears before the first digit. `"--5"` and `"-.5"`
 *    are negative; a `-` after the first digit, as in `"5-"` or `"1-2"`, is ignored.
 * 4. The first `.` is the decimal point and every later `.` is ignored, so `"1.2.3"` is `1.23`.
 * 5. Negative zero is zero, and a value too large to represent is blank.
 */

import { type AllocationPercentage, AllocationPercentageSchema } from "./allocation";
import {
    asMinorUnits,
    getMinorUnitMultiplier,
    type MoneyMinorUnits,
    toMinorUnitsForCurrency
} from "./currency";

export type NumericText =
    | { readonly kind: "blank" }
    | { readonly kind: "number"; readonly value: number };

export type AmountText =
    | { readonly kind: "blank" }
    | { readonly kind: "amount"; readonly minorUnits: MoneyMinorUnits };

export type AllocationText =
    | { readonly kind: "blank" }
    | { readonly kind: "percentage"; readonly value: AllocationPercentage };

const BLANK = { kind: "blank" } as const;

/** Applies the module rules to one piece of typed text. */
export function normaliseNumericText(text: string): NumericText {
    const significant = text.replace(/[^\d.-]/g, "");
    const firstDigit = significant.search(/\d/);
    if (firstDigit < 0) return BLANK;

    const negative = significant.slice(0, firstDigit).includes("-");
    const unsigned = significant.replaceAll("-", "");
    const decimalPoint = unsigned.indexOf(".");
    const integerDigits = decimalPoint < 0 ? unsigned : unsigned.slice(0, decimalPoint);
    const fractionDigits =
        decimalPoint < 0 ? "" : unsigned.slice(decimalPoint + 1).replaceAll(".", "");
    const magnitude = Number(`${integerDigits || "0"}.${fractionDigits || "0"}`);
    if (!Number.isFinite(magnitude)) return BLANK;

    // Adding zero turns -0 into 0, which storage would otherwise reject.
    return { kind: "number", value: (negative ? -magnitude : magnitude) + 0 };
}

/** Normalises amount text to integer minor units at the currency's precision. */
export function normaliseAmountText(text: string, currencyCode: string): AmountText {
    const numeric = normaliseNumericText(text);
    if (numeric.kind === "blank") return BLANK;
    const scaled = Math.round(Math.abs(numeric.value) * getMinorUnitMultiplier(currencyCode));
    if (!Number.isSafeInteger(scaled)) return BLANK;
    // Rounding a tiny negative such as -0.004 yields -0; adding zero stores a plain 0 instead.
    const minorUnits = toMinorUnitsForCurrency(numeric.value, currencyCode) + 0;
    return { kind: "amount", minorUnits: asMinorUnits(minorUnits) };
}

/** Normalises allocation text to a percentage without clamping it to any range. */
export function normaliseAllocationText(text: string): AllocationText {
    const numeric = normaliseNumericText(text);
    if (numeric.kind === "blank") return BLANK;
    const parsed = AllocationPercentageSchema.safeParse(numeric.value);
    return parsed.success ? { kind: "percentage", value: parsed.data } : BLANK;
}

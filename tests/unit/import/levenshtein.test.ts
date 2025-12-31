/**
 * String Similarity Unit Tests
 *
 * Tests for string comparison using the string-comparison library.
 * Note: The library normalizes strings (case-insensitive, whitespace trimmed).
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	isSimilar,
	levenshtein,
	normalizedSimilarity,
	normalizeForComparison,
	similarity,
} from "@/lib/import/levenshtein";

// ============================================================================
// levenshtein tests (case-insensitive, whitespace-trimmed by library)
// ============================================================================

describe("levenshtein", () => {
	describe("known distances", () => {
		const testCases = [
			{ a: "", b: "", expected: 0 },
			{ a: "a", b: "", expected: 1 },
			{ a: "", b: "abc", expected: 3 },
			{ a: "hello", b: "hello", expected: 0 },
			{ a: "kitten", b: "sitting", expected: 3 },
			{ a: "saturday", b: "sunday", expected: 3 },
			{ a: "abc", b: "abc", expected: 0 },
			{ a: "abc", b: "abd", expected: 1 },
			{ a: "abc", b: "adc", expected: 1 },
			{ a: "abc", b: "dbc", expected: 1 },
			{ a: "abc", b: "abcd", expected: 1 },
			{ a: "abcd", b: "abc", expected: 1 },
			{ a: "abc", b: "xyz", expected: 3 },
			{ a: "book", b: "back", expected: 2 },
			{ a: "AMAZON", b: "amazon", expected: 0 }, // Case-insensitive
			{ a: "  hello  ", b: "hello", expected: 0 }, // Whitespace trimmed
		];

		for (const tc of testCases) {
			it(`distance("${tc.a}", "${tc.b}") = ${tc.expected}`, () => {
				expect(levenshtein(tc.a, tc.b)).toBe(tc.expected);
			});
		}
	});

	describe("properties", () => {
		// Property: distance is symmetric
		it("is symmetric (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 }), (a, b) => {
					expect(levenshtein(a, b)).toBe(levenshtein(b, a));
				})
			);
		});

		// Property: distance(a, a) = 0
		it("distance to self is 0 (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 50 }), (s) => {
					expect(levenshtein(s, s)).toBe(0);
				})
			);
		});

		// Property: distance is non-negative
		it("is non-negative (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 }), (a, b) => {
					expect(levenshtein(a, b)).toBeGreaterThanOrEqual(0);
				})
			);
		});

		// Property: case-insensitive
		it("is case-insensitive (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 20 }), (s) => {
					expect(levenshtein(s.toUpperCase(), s.toLowerCase())).toBe(0);
				})
			);
		});
	});
});

// ============================================================================
// similarity tests (Dice coefficient)
// ============================================================================

describe("similarity", () => {
	describe("known similarities", () => {
		it("identical strings have similarity 1", () => {
			expect(similarity("hello", "hello")).toBe(1);
		});

		it("empty strings have similarity 1", () => {
			expect(similarity("", "")).toBe(1);
		});

		it("completely different strings have low similarity", () => {
			expect(similarity("abc", "xyz")).toBeLessThan(0.1);
		});

		it("similar strings have high similarity", () => {
			// Dice coefficient for bigrams
			expect(similarity("hello", "helo")).toBeGreaterThan(0.5);
		});
	});

	describe("edge cases", () => {
		it("returns 0 when one string is empty and other is not", () => {
			expect(similarity("abc", "")).toBe(0);
			expect(similarity("", "abc")).toBe(0);
		});
	});

	describe("properties", () => {
		// Property: similarity is between 0 and 1
		it("is between 0 and 1 (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 }), (a, b) => {
					const sim = similarity(a, b);
					expect(sim).toBeGreaterThanOrEqual(0);
					expect(sim).toBeLessThanOrEqual(1);
				})
			);
		});

		// Property: similarity is symmetric
		it("is symmetric (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 }), (a, b) => {
					expect(similarity(a, b)).toBeCloseTo(similarity(b, a), 10);
				})
			);
		});

		// Property: identical strings have similarity 1
		it("identical strings have similarity 1 (property-based)", () => {
			fc.assert(
				fc.property(fc.string({ maxLength: 50 }), (s) => {
					expect(similarity(s, s)).toBe(1);
				})
			);
		});
	});
});

// ============================================================================
// isSimilar tests
// ============================================================================

describe("isSimilar", () => {
	it("returns true for identical strings", () => {
		expect(isSimilar("hello", "hello", 0.9)).toBe(true);
	});

	it("returns true when similarity meets threshold", () => {
		// Using Dice coefficient
		expect(isSimilar("hello", "helo", 0.5)).toBe(true);
		expect(isSimilar("COFFEE SHOP", "COFFEE SHOPPE", 0.7)).toBe(true);
	});

	it("returns false when similarity is below threshold", () => {
		expect(isSimilar("hello", "world", 0.9)).toBe(false);
		expect(isSimilar("abc", "xyz", 0.5)).toBe(false);
	});

	it("handles empty strings", () => {
		expect(isSimilar("", "", 1.0)).toBe(true);
		expect(isSimilar("abc", "", 0.5)).toBe(false);
	});

	// Property: isSimilar agrees with similarity function
	it("agrees with similarity function (property-based)", () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 15 }),
				fc.string({ maxLength: 15 }),
				fc.double({ min: 0, max: 1, noNaN: true }),
				(a, b, threshold) => {
					const sim = similarity(a, b);
					const similar = isSimilar(a, b, threshold);

					// Allow small floating point differences
					if (sim >= threshold + 0.0001) {
						expect(similar).toBe(true);
					} else if (sim < threshold - 0.0001) {
						expect(similar).toBe(false);
					}
					// Near threshold, either result is acceptable due to rounding
				}
			)
		);
	});
});

// ============================================================================
// normalizeForComparison tests
// ============================================================================

describe("normalizeForComparison", () => {
	const testCases = [
		{ input: "Hello World", expected: "hello world" },
		{ input: "  extra   spaces  ", expected: "extra spaces" },
		{ input: "UPPERCASE", expected: "uppercase" },
		{ input: "Punctuation!!!", expected: "punctuation" },
		{ input: "Mixed-Case_text", expected: "mixed case text" },
		{ input: "  ", expected: "" },
		{ input: "Numbers123", expected: "numbers123" },
		{ input: "email@example.com", expected: "email example com" },
		{ input: "AMAZON.COM*AMZN.COM/BI", expected: "amazon com amzn com bi" },
	];

	for (const tc of testCases) {
		it(`normalizes "${tc.input}" to "${tc.expected}"`, () => {
			expect(normalizeForComparison(tc.input)).toBe(tc.expected);
		});
	}

	// Property: normalized string only contains alphanumeric and single spaces
	it("only contains allowed characters (property-based)", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 50 }), (s) => {
				const normalized = normalizeForComparison(s);
				// Only lowercase letters, digits, and spaces
				expect(normalized).toMatch(/^[a-z0-9 ]*$/);
				expect(normalized).not.toMatch(/\s{2,}/); // No double spaces
			})
		);
	});

	// Property: idempotent
	it("is idempotent (property-based)", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 50 }), (s) => {
				const once = normalizeForComparison(s);
				const twice = normalizeForComparison(once);
				expect(twice).toBe(once);
			})
		);
	});
});

// ============================================================================
// normalizedSimilarity tests
// ============================================================================

describe("normalizedSimilarity", () => {
	it("treats case differences as equal", () => {
		expect(normalizedSimilarity("Hello", "hello")).toBe(1);
	});

	it("ignores punctuation", () => {
		expect(normalizedSimilarity("Hello!", "Hello")).toBe(1);
	});

	it("normalizes whitespace", () => {
		expect(normalizedSimilarity("  Hello   World  ", "hello world")).toBe(1);
	});

	it("compares merchant names effectively", () => {
		// Real-world merchant comparison
		const s = normalizedSimilarity("AMAZON.COM*AMZN.COM/BI", "Amazon.com Purchase");
		expect(s).toBeGreaterThan(0.3); // Dice coefficient gives lower scores for partial matches
	});

	// Property: normalized similarity >= regular similarity for different cases
	it("handles case invariance (property-based)", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 20 }), (s) => {
				const upper = s.toUpperCase();
				const lower = s.toLowerCase();
				expect(normalizedSimilarity(upper, lower)).toBe(1);
			})
		);
	});
});

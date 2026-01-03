/**
 * Tag Color Utilities Tests
 *
 * Unit tests for tag color palette and utility functions.
 */

import { describe, expect, it } from "vitest";
import {
	DEFAULT_TAG_COLOR,
	getContrastingTextColor,
	getNextTagColor,
	isValidHexColor,
	normalizeTagColor,
	TAG_COLOR_PALETTE,
} from "@/lib/domain/tag-colors";

describe("Tag Color Utilities", () => {
	describe("TAG_COLOR_PALETTE", () => {
		it("contains at least 10 colors", () => {
			expect(TAG_COLOR_PALETTE.length).toBeGreaterThanOrEqual(10);
		});

		it("all colors are valid hex format", () => {
			for (const color of TAG_COLOR_PALETTE) {
				expect(isValidHexColor(color)).toBe(true);
			}
		});

		it("all colors are unique", () => {
			const uniqueColors = new Set(TAG_COLOR_PALETTE);
			expect(uniqueColors.size).toBe(TAG_COLOR_PALETTE.length);
		});
	});

	describe("DEFAULT_TAG_COLOR", () => {
		it("is a valid hex color", () => {
			expect(isValidHexColor(DEFAULT_TAG_COLOR)).toBe(true);
		});

		it("is from the palette", () => {
			expect(TAG_COLOR_PALETTE).toContain(DEFAULT_TAG_COLOR);
		});
	});

	describe("isValidHexColor", () => {
		it("accepts valid 6-digit hex colors", () => {
			expect(isValidHexColor("#3b82f6")).toBe(true);
			expect(isValidHexColor("#FFFFFF")).toBe(true);
			expect(isValidHexColor("#000000")).toBe(true);
			expect(isValidHexColor("#AbCdEf")).toBe(true);
		});

		it("rejects invalid formats", () => {
			expect(isValidHexColor("")).toBe(false);
			expect(isValidHexColor("3b82f6")).toBe(false); // Missing #
			expect(isValidHexColor("#3b82f")).toBe(false); // Too short
			expect(isValidHexColor("#3b82f6a")).toBe(false); // Too long
			expect(isValidHexColor("#gggggg")).toBe(false); // Invalid chars
			expect(isValidHexColor("rgb(0,0,0)")).toBe(false);
			expect(isValidHexColor("#fff")).toBe(false); // 3-digit shorthand
		});
	});

	describe("normalizeTagColor", () => {
		it("returns valid colors unchanged", () => {
			expect(normalizeTagColor("#3b82f6")).toBe("#3b82f6");
			expect(normalizeTagColor("#FFFFFF")).toBe("#FFFFFF");
		});

		it("returns default for undefined", () => {
			expect(normalizeTagColor(undefined)).toBe(DEFAULT_TAG_COLOR);
		});

		it("returns default for invalid colors", () => {
			expect(normalizeTagColor("")).toBe(DEFAULT_TAG_COLOR);
			expect(normalizeTagColor("invalid")).toBe(DEFAULT_TAG_COLOR);
			expect(normalizeTagColor("#fff")).toBe(DEFAULT_TAG_COLOR);
		});
	});

	describe("getNextTagColor", () => {
		it("returns first color when no colors are used", () => {
			expect(getNextTagColor([])).toBe(TAG_COLOR_PALETTE[0]);
		});

		it("returns unused color when some are used", () => {
			const usedColors = [TAG_COLOR_PALETTE[0], TAG_COLOR_PALETTE[1]];
			const nextColor = getNextTagColor(usedColors);
			expect(nextColor).toBe(TAG_COLOR_PALETTE[2]);
			expect(usedColors).not.toContain(nextColor);
		});

		it("skips undefined values in used colors", () => {
			const usedColors = [undefined, TAG_COLOR_PALETTE[0], undefined];
			const nextColor = getNextTagColor(usedColors);
			expect(nextColor).toBe(TAG_COLOR_PALETTE[1]);
		});

		it("cycles back to first colors when all are used", () => {
			// Use all colors
			const usedColors = [...TAG_COLOR_PALETTE];
			const nextColor = getNextTagColor(usedColors);
			// Should cycle based on count
			expect(TAG_COLOR_PALETTE).toContain(nextColor);
		});

		it("handles more used colors than palette size", () => {
			// Create array with more colors than palette
			const usedColors = [...TAG_COLOR_PALETTE, ...TAG_COLOR_PALETTE];
			const nextColor = getNextTagColor(usedColors);
			// Should return a valid color from palette
			expect(TAG_COLOR_PALETTE).toContain(nextColor);
		});
	});

	describe("getContrastingTextColor", () => {
		it("returns white for dark backgrounds", () => {
			expect(getContrastingTextColor("#000000")).toBe("#ffffff");
			expect(getContrastingTextColor("#3b82f6")).toBe("#ffffff"); // Blue
			expect(getContrastingTextColor("#ef4444")).toBe("#ffffff"); // Red
			expect(getContrastingTextColor("#8b5cf6")).toBe("#ffffff"); // Violet
		});

		it("returns black for light backgrounds", () => {
			expect(getContrastingTextColor("#ffffff")).toBe("#000000");
			expect(getContrastingTextColor("#f59e0b")).toBe("#000000"); // Amber
			expect(getContrastingTextColor("#84cc16")).toBe("#000000"); // Lime
			expect(getContrastingTextColor("#eab308")).toBe("#000000"); // Yellow
		});

		it("handles uppercase hex colors", () => {
			expect(getContrastingTextColor("#FFFFFF")).toBe("#000000");
			expect(getContrastingTextColor("#000000")).toBe("#ffffff");
		});
	});
});

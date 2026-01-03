/**
 * Tag Color Utilities
 *
 * Provides a palette of distinct colors for tags and utilities
 * for auto-assigning colors to new tags.
 */

/**
 * Predefined tag color palette - visually distinct, accessible colors.
 * Each color should work well as both background (with white text) and as text on white.
 */
export const TAG_COLOR_PALETTE = [
	"#3b82f6", // blue-500
	"#10b981", // emerald-500
	"#f59e0b", // amber-500
	"#ef4444", // red-500
	"#8b5cf6", // violet-500
	"#ec4899", // pink-500
	"#06b6d4", // cyan-500
	"#f97316", // orange-500
	"#84cc16", // lime-500
	"#6366f1", // indigo-500
	"#14b8a6", // teal-500
	"#a855f7", // purple-500
	"#eab308", // yellow-500
	"#64748b", // slate-500
	"#22c55e", // green-500
	"#0ea5e9", // sky-500
] as const;

export type TagColor = (typeof TAG_COLOR_PALETTE)[number] | string;

/**
 * Default tag color (used as fallback).
 */
export const DEFAULT_TAG_COLOR = TAG_COLOR_PALETTE[0];

/**
 * Get the next color to assign to a new tag.
 * Cycles through the palette, trying to use colors not yet in use.
 *
 * @param usedColors - Colors already assigned to existing tags
 * @returns The next color to use
 */
export function getNextTagColor(usedColors: (string | undefined)[]): string {
	const usedSet = new Set(usedColors.filter(Boolean));

	// First, try to find an unused color from the palette
	for (const color of TAG_COLOR_PALETTE) {
		if (!usedSet.has(color)) {
			return color;
		}
	}

	// If all colors are used, cycle based on count
	const index = usedColors.length % TAG_COLOR_PALETTE.length;
	return TAG_COLOR_PALETTE[index];
}

/**
 * Check if a string is a valid hex color.
 */
export function isValidHexColor(color: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Ensure a color value is valid, returning default if not.
 */
export function normalizeTagColor(color: string | undefined): string {
	if (color && isValidHexColor(color)) {
		return color;
	}
	return DEFAULT_TAG_COLOR;
}

/**
 * Get contrasting text color (black or white) for a given background.
 * Uses relative luminance calculation for accessibility.
 */
export function getContrastingTextColor(bgColor: string): "#ffffff" | "#000000" {
	// Parse hex color
	const hex = bgColor.replace("#", "");
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	// Calculate relative luminance (ITU-R BT.709)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// Use white text for dark backgrounds, black for light
	return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Color Utilities
 *
 * Deterministic color generation from hashes for avatars and presence indicators.
 */

/**
 * Preset colors for avatars.
 * Using a curated palette that works well on both light and dark backgrounds.
 */
const AVATAR_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
] as const;

/**
 * Generate a deterministic color from a string hash.
 *
 * @param hash - The string to hash (typically pubkey_hash)
 * @returns A hex color string
 */
export function hashToColor(hash: string): string {
  // Simple hash function to get a consistent index
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = (hashValue << 5) - hashValue + char;
    hashValue = hashValue & hashValue; // Convert to 32bit integer
  }

  // Use absolute value and modulo to get index
  const index = Math.abs(hashValue) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Generate HSL color from a hash for more control.
 *
 * @param hash - The string to hash
 * @param saturation - Saturation percentage (default: 70)
 * @param lightness - Lightness percentage (default: 50)
 * @returns An HSL color string
 */
export function hashToHSL(hash: string, saturation = 70, lightness = 50): string {
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = (hashValue << 5) - hashValue + char;
    hashValue = hashValue & hashValue;
  }

  // Map to hue (0-360)
  const hue = Math.abs(hashValue) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get contrasting text color (black or white) for a background color.
 *
 * @param hexColor - Hex color string (e.g., "#ff0000")
 * @returns "#000000" or "#ffffff"
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Generate initials from a name or identifier.
 *
 * @param name - Full name or identifier
 * @param maxLength - Maximum number of characters (default: 2)
 * @returns Uppercase initials
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return "?";

  // If it looks like a hash, use first characters
  if (/^[a-f0-9]+$/i.test(name)) {
    return name.substring(0, maxLength).toUpperCase();
  }

  // Split by spaces and get first letter of each word
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .map((part) => part[0])
    .join("")
    .substring(0, maxLength)
    .toUpperCase();

  return initials || "?";
}

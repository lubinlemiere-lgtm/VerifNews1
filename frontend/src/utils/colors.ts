// ###########################################################################
// # Color utilities — Helper functions for theme-aware color manipulation
// # withOpacity: converts hex color to rgba with specified opacity
// ###########################################################################

/**
 * Converts a hex color string to rgba with specified opacity.
 * Works with both dark and light theme hex colors.
 * Replaces the fragile pattern of `hexColor + "E6"` string concatenation.
 *
 * @param hex - Hex color string (e.g. "#FF0000" or "#abc")
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba string (e.g. "rgba(255, 0, 0, 0.9)")
 */
export function withOpacity(hex: string, opacity: number): string {
  // Handle shorthand hex (#abc → #aabbcc)
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

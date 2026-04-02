/**
 * Font constants for PreText measurement.
 *
 * PreText requires named fonts (not CSS variables or system-ui).
 * Geist is loaded via next/font/google -- the FontFace.family is "Geist".
 *
 * IMPORTANT: system-ui is unsafe on macOS -- always use named fonts.
 */
export const PRETEXT_FONTS = {
  sans: '"Geist"',
  mono: '"Geist Mono"',
} as const;

/**
 * Build a CSS font shorthand string for PreText's prepare().
 * Must match the CSS exactly (weight, size, family).
 */
export function pretextFont(
  size: number,
  family: keyof typeof PRETEXT_FONTS = "sans",
  weight: number = 400
): string {
  return `${weight} ${size}px ${PRETEXT_FONTS[family]}`;
}

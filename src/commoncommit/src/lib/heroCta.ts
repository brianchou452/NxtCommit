/**
 * The hero's primary CTA uses normal-sized text, so the full gradient must meet
 * the 4.5:1 WCAG AA contrast threshold. Keeping the actual colours in this pure
 * module lets the landing contract test verify the same values the component
 * renders without importing React into the server test harness.
 */
export const HERO_PRIMARY_CTA_COLORS = {
  foreground: "#ffffff",
  gradientStart: "#101110",
  gradientEnd: "#101110",
} as const;

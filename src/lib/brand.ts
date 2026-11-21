/**
 * Curated widget brand colors. Each passes WCAG AA (>= 4.5:1) for white text, so the widget can
 * use one brand accent + the neutral ink/porcelain pair and stay within the 3-4 color rule.
 */
export const BRAND_SWATCHES = [
  { name: "Ledger", hex: "#146C54" },
  { name: "Harbor", hex: "#0E6378" },
  { name: "Cobalt", hex: "#2446B8" },
  { name: "Plum", hex: "#6B2E63" },
  { name: "Brick", hex: "#A33A2B" },
  { name: "Umber", hex: "#7E5214" },
  { name: "Graphite", hex: "#454B54" },
  { name: "Ink", hex: "#1E2925" },
] as const;

export const DEFAULT_BRAND = BRAND_SWATCHES[0].hex;

export function isBrandColor(hex: string): boolean {
  return BRAND_SWATCHES.some((s) => s.hex.toLowerCase() === hex.toLowerCase());
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

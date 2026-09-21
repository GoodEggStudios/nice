export const EMBED_THEMES = ["light", "dark", "minimal", "mono-dark", "mono-light"] as const;
export const EMBED_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

import { MAX_BUTTON_LABEL_CODE_POINTS } from "../lib/button-labels";
import type {
  ButtonAnimation,
  ButtonShape,
  CountFormat,
  CountPosition,
  CountVisibility,
  PublicButtonColors,
} from "../lib/button-appearance";

export type EmbedTheme = typeof EMBED_THEMES[number];
export type EmbedSize = typeof EMBED_SIZES[number];

export interface EmbedAppearance {
  colors: PublicButtonColors | null;
  shape: ButtonShape;
  count_visibility: CountVisibility;
  count_position: CountPosition;
  count_format: CountFormat;
  animation: ButtonAnimation;
}

export const DEFAULT_EMBED_APPEARANCE: EmbedAppearance = {
  colors: null,
  shape: "rounded",
  count_visibility: "nonzero",
  count_position: "inside",
  count_format: "compact",
  animation: "pop",
};

export const EMBED_DIMENSIONS: Record<EmbedSize, { w: number; h: number }> = {
  xs: { w: 70, h: 28 },
  sm: { w: 85, h: 32 },
  md: { w: 100, h: 36 },
  lg: { w: 120, h: 44 },
  xl: { w: 140, h: 52 },
};

export const EMBED_FONT_SIZE: Record<EmbedSize, number> = {
  xs: 10,
  sm: 11,
  md: 12,
  lg: 14,
  xl: 16,
};

// Reserve enough space for wide glyphs such as CJK characters and emoji in
// direct iframe snippets, which cannot receive a host-side resize update.
const EMBED_MAX_GLYPH_WIDTH_EM = 2;

export function getEmbedInitialDimensions(
  size: EmbedSize,
  label: string,
  pressedLabel: string,
  multiNice: boolean,
  count = 0,
  appearance: EmbedAppearance = DEFAULT_EMBED_APPEARANCE
): { w: number; h: number } {
  const dimensions = EMBED_DIMENSIONS[size];
  const longestLabel = multiNice
    ? label
    : Array.from(label).length >= Array.from(pressedLabel).length
      ? label
      : pressedLabel;
  // Keep the default dimensions stable, while sizing custom labels for their
  // actual rendered length. Direct iframe snippets cannot receive resize updates.
  const usesDefaultDimensions = longestLabel === "Nice" || longestLabel === "Nice'd";
  const codePoints = usesDefaultDimensions
    ? 0
    : Math.min(Array.from(longestLabel).length, MAX_BUTTON_LABEL_CODE_POINTS);

  let width = dimensions.w + codePoints * EMBED_FONT_SIZE[size] * EMBED_MAX_GLYPH_WIDTH_EM;
  let height = dimensions.h;
  const countVisible =
    appearance.count_visibility === "always" ||
    (appearance.count_visibility === "nonzero" && count > 0);
  if (countVisible && appearance.count_position !== "inside") {
    const countText = formatEmbedCount(count, appearance.count_format);
    const countWidth = countText.length * EMBED_FONT_SIZE[size] * 0.75;
    const gap = size === "xs" ? 4 : size === "sm" ? 5 : size === "md" ? 6 : size === "lg" ? 7 : 8;
    if (appearance.count_position === "beside") {
      width += gap + countWidth;
    } else {
      height += gap + Math.ceil(EMBED_FONT_SIZE[size] * 1.2);
    }
  }

  return { w: Math.ceil(width), h: Math.ceil(height) };
}

export function formatEmbedCount(count: number, format: CountFormat): string {
  if (format === "full") return count.toString();
  if (count >= 1e9) return (count / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (count >= 1e6) return (count / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1e3) return (count / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return count.toString();
}

export function renderEmbedSizeMapLiteral(): string {
  return `{${EMBED_SIZES.map((size) => {
    const dim = EMBED_DIMENSIONS[size];
    return `${size}:{w:${dim.w},h:${dim.h}}`;
  }).join(",")}}`;
}

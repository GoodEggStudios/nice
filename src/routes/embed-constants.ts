export const EMBED_THEMES = ["light", "dark", "minimal", "mono-dark", "mono-light"] as const;
export const EMBED_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

import { MAX_BUTTON_LABEL_CODE_POINTS } from "../lib/button-labels";

export type EmbedTheme = typeof EMBED_THEMES[number];
export type EmbedSize = typeof EMBED_SIZES[number];

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
  multiNice: boolean
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

  return {
    w: Math.ceil(
      dimensions.w + codePoints * EMBED_FONT_SIZE[size] * EMBED_MAX_GLYPH_WIDTH_EM
    ),
    h: dimensions.h,
  };
}

export function renderEmbedSizeMapLiteral(): string {
  return `{${EMBED_SIZES.map((size) => {
    const dim = EMBED_DIMENSIONS[size];
    return `${size}:{w:${dim.w},h:${dim.h}}`;
  }).join(",")}}`;
}

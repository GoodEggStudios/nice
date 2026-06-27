export const EMBED_THEMES = ["light", "dark", "minimal", "mono-dark", "mono-light"] as const;
export const EMBED_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type EmbedTheme = typeof EMBED_THEMES[number];
export type EmbedSize = typeof EMBED_SIZES[number];

export const EMBED_DIMENSIONS: Record<EmbedSize, { w: number; h: number }> = {
  xs: { w: 70, h: 28 },
  sm: { w: 85, h: 32 },
  md: { w: 100, h: 36 },
  lg: { w: 120, h: 44 },
  xl: { w: 140, h: 52 },
};

export function renderEmbedSizeMapLiteral(): string {
  return `{${EMBED_SIZES.map((size) => {
    const dim = EMBED_DIMENSIONS[size];
    return `${size}:{w:${dim.w},h:${dim.h}}`;
  }).join(",")}}`;
}

/**
 * SVG Badge Generator
 * Generates shields.io-style badges with Nice branding
 */

export type BadgeTheme = 'default' | 'dark';

export interface BadgeOptions {
  theme?: BadgeTheme;
}

/**
 * Format large numbers for display
 * 0-999: as-is
 * 1000-999999: "1.2k"
 * 1000000+: "1.2M"
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1_000_000) {
    const k = count / 1000;
    return k >= 10 ? `${Math.floor(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  const m = count / 1_000_000;
  return m >= 10 ? `${Math.floor(m)}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Calculate text width (approximate for Verdana 11px)
 */
function textWidth(text: string, fontSize: number = 11): number {
  const avgCharWidth = fontSize * 0.62;
  return text.length * avgCharWidth;
}

/**
 * Validate badge theme
 */
export function normalizeTheme(theme: string | undefined): BadgeTheme {
  if (theme === 'dark') return 'dark';
  return 'default';
}

// Nice "N" logo path (scaled for badge height)
const N_LOGO_PATH = 'M4.53 17.55l-3.65 0q-0.88 0-0.88-0.88l0-15.79q0-0.88 0.88-0.88l2.53 0q0.88 0 1.44 0.66l4.73 5.41l0-5.19q0-0.88 0.88-0.88l3.65 0q0.88 0 0.88 0.88l0 15.79q0 0.88-0.88 0.88l-3.65 0q-0.88 0-0.88-0.88l0-3l-4.17-5.05l0 8.03q0 0.88-0.88 0.88z';

/**
 * Generate SVG badge
 */
export function generateBadge(count: number | null, options: BadgeOptions = {}): string {
  const theme = normalizeTheme(options.theme);
  const countText = count === null ? '?' : formatCount(count);
  
  const height = 20;
  const fontSize = 11;
  const logoPadding = 5; // Padding around the N logo
  const logoSize = 14; // Logo visual size
  const logoWidth = logoSize + logoPadding * 2; // Total logo section width
  const labelPadding = 6;
  const countPadding = 8;
  
  const labelText = 'nice';
  const labelTextWidth = textWidth(labelText, fontSize);
  const countTextWidth = textWidth(countText, fontSize);
  
  // Left section: logo + "nice" text
  const leftWidth = logoWidth + labelTextWidth + labelPadding * 2;
  // Right section: count
  const rightWidth = countTextWidth + countPadding * 2;
  const totalWidth = Math.round(leftWidth + rightWidth);
  
  // Text positions
  const labelX = logoWidth + labelPadding + labelTextWidth / 2;
  const countX = leftWidth + rightWidth / 2;
  const textY = 14;
  const shadowY = 15;
  
  // Colors based on theme
  const leftBg = theme === 'dark' ? '#000' : '#333';
  const leftText = '#fff';
  const rightBg = '#fbbf24';
  const rightText = '#000';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="c">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#c)">
    <rect width="${leftWidth}" height="${height}" fill="${leftBg}"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${rightBg}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#g)"/>
  </g>
  <g transform="translate(${logoPadding}, 3) scale(0.78)">
    <path d="${N_LOGO_PATH}" fill="#fbbf24"/>
  </g>
  <g fill="${leftText}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}">
    <text x="${labelX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${escapeXml(labelText)}</text>
    <text x="${labelX}" y="${textY}">${escapeXml(labelText)}</text>
  </g>
  <g fill="${rightText}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}" font-weight="bold">
    <text x="${countX}" y="${textY}">${escapeXml(countText)}</text>
  </g>
</svg>`;
}

// Legacy exports for backwards compatibility
export function normalizeColor(color: string | undefined): string {
  return 'fbbf24';
}

export function normalizeStyle(style: string | undefined): string {
  return 'flat';
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

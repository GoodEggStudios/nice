/**
 * SVG Badge Generator
 * Generates shields.io-style badges with Nice branding
 */

export type BadgeTheme = 'default' | 'dark' | 'rich';

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
  if (theme === 'rich') return 'rich';
  return 'default';
}

// Nice "N" logo path (scaled for badge height)
const N_LOGO_PATH = 'M4.53 17.55l-3.65 0q-0.88 0-0.88-0.88l0-15.79q0-0.88 0.88-0.88l2.53 0q0.88 0 1.44 0.66l4.73 5.41l0-5.19q0-0.88 0.88-0.88l3.65 0q0.88 0 0.88 0.88l0 15.79q0 0.88-0.88 0.88l-3.65 0q-0.88 0-0.88-0.88l0-3l-4.17-5.05l0 8.03q0 0.88-0.88 0.88z';

// Full NICE wordmark path (from original SVG, viewBox 0 0 252.201 72.001)
const NICE_WORDMARK_PATH = 'M18.601 72.001L3.601 72.001Q0.001 72.001 0.001 68.401L0.001 3.601Q0.001 0.001 3.601 0.001L14.001 0.001Q17.601 0.001 19.901 2.701L39.301 24.901L39.301 3.601Q39.301 0.001 42.901 0.001L57.901 0.001Q61.501 0.001 61.501 3.601L61.501 68.401Q61.501 72.001 57.901 72.001L42.901 72.001Q39.301 72.001 39.301 68.401L39.301 56.101L22.201 35.401L22.201 68.401Q22.201 72.001 18.601 72.001ZM248.601 72.001L202.201 72.001Q198.601 72.001 198.601 68.401L198.601 3.601Q198.601 0.001 202.201 0.001L248.601 0.001Q252.201 0.001 252.201 3.601L252.201 15.301Q252.201 18.901 248.601 18.901L221.001 18.901L221.001 26.601L240.501 26.601Q244.101 26.601 244.101 30.201L244.101 40.901Q244.101 44.501 240.501 44.501L221.001 44.501L221.001 53.101L248.601 53.101Q252.201 53.101 252.201 56.701L252.201 68.401Q252.201 72.001 248.601 72.001ZM119.901 72.001L77.301 72.001Q73.701 72.001 73.701 68.401L73.701 56.501Q73.701 52.901 77.301 52.901L87.201 52.901L87.201 19.301L77.301 19.301Q73.701 19.301 73.701 15.701L73.701 3.601Q73.701 0.001 77.301 0.001L119.901 0.001Q123.501 0.001 123.501 3.601L123.501 15.701Q123.501 19.301 119.901 19.301L110.201 19.301L110.201 52.901L119.901 52.901Q123.501 52.901 123.501 56.501L123.501 68.401Q123.501 72.001 119.901 72.001ZM183.701 72.001L159.301 72.001Q146.701 72.001 140.701 67.001Q134.701 62.001 134.701 51.601L134.701 20.501Q134.701 10.001 140.701 5.001Q146.701 0.001 159.301 0.001L183.701 0.001Q187.301 0.001 187.301 3.601L187.301 15.701Q187.301 19.301 183.701 19.301L163.601 19.301Q157.501 19.301 157.501 24.301L157.501 48.101Q157.501 52.901 163.601 52.901L183.701 52.901Q187.301 52.901 187.301 56.501L187.301 68.401Q187.301 72.001 183.701 72.001Z';

/**
 * Generate rich SVG badge (yellow wordmark + black counter)
 */
function generateRichBadge(count: number | null): string {
  const countText = count === null ? '?' : formatCount(count);

  const height = 20;
  const countPadding = 6;
  const richFontSize = 9;
  // Use shields.io scale(.1) technique for precise text rendering
  const countTextLen = textWidth(countText, richFontSize) * 10;
  const countSectionWidth = Math.round(countTextLen / 10) + countPadding * 2;

  // Wordmark area: scale 252.201x72.001 to fit in height with padding
  const wordmarkPad = 5;
  const wordmarkHeight = height - wordmarkPad * 2; // 10px
  const wordmarkScale = wordmarkHeight / 72.001;
  const wordmarkWidth = Math.ceil(252.201 * wordmarkScale);
  const leftWidth = wordmarkWidth + wordmarkPad * 2;
  const totalWidth = leftWidth + countSectionWidth;

  const countCenterX = (leftWidth + totalWidth) / 2 * 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="nice: ${escapeXml(countText)}">
  <title>nice: ${escapeXml(countText)}</title>
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="c">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#c)">
    <rect width="${leftWidth}" height="${height}" fill="#fbbf24"/>
    <rect x="${leftWidth}" width="${countSectionWidth}" height="${height}" fill="#000"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#g)"/>
  </g>
  <g transform="translate(${wordmarkPad}, ${wordmarkPad}) scale(${wordmarkScale.toFixed(4)})">
    <path d="${NICE_WORDMARK_PATH}" fill="#000" stroke="none"/>
  </g>
  <g fill="#fbbf24" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="90" font-weight="normal">
    <text aria-hidden="true" x="${countCenterX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${countTextLen}">${escapeXml(countText)}</text>
    <text x="${countCenterX}" y="140" transform="scale(.1)" fill="#fbbf24" textLength="${countTextLen}">${escapeXml(countText)}</text>
  </g>
</svg>`;
}

/**
 * Generate SVG badge
 */
export function generateBadge(count: number | null, options: BadgeOptions = {}): string {
  const theme = normalizeTheme(options.theme);
  if (theme === 'rich') return generateRichBadge(count);
  const countText = count === null ? '?' : formatCount(count);
  
  const height = 20;
  const fontSize = 11;
  const logoLeftPad = 4; // Padding before logo
  const logoRightPad = 0; // No padding after logo
  const logoSize = 12; // Logo visual size
  const logoWidth = logoLeftPad + logoSize + logoRightPad; // Total logo section width
  const labelPadding = 3;
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
  <g transform="translate(${logoLeftPad}, 4) scale(0.67)">
    <path d="${N_LOGO_PATH}" fill="#fbbf24"/>
  </g>
  <g fill="${leftText}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}">
    <text x="${labelX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${escapeXml(labelText)}</text>
    <text x="${labelX}" y="${textY}">${escapeXml(labelText)}</text>
  </g>
  <g fill="${rightText}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}">
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

/**
 * SVG Badge Generator
 * Generates shields.io-compatible badges for Nice buttons
 */

export type BadgeStyle = 'flat' | 'flat-square' | 'plastic' | 'for-the-badge';

export interface BadgeOptions {
  style?: BadgeStyle;
  color?: string;
  label?: string;
}

const DEFAULT_OPTIONS: Required<BadgeOptions> = {
  style: 'flat',
  color: 'fbbf24',
  label: 'nice',
};

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
  // Approximate character widths for Verdana
  const avgCharWidth = fontSize * 0.6;
  return text.length * avgCharWidth;
}

/**
 * Validate and normalize hex color
 */
export function normalizeColor(color: string | undefined): string {
  if (!color) return DEFAULT_OPTIONS.color;
  
  // Remove # if present
  const hex = color.replace(/^#/, '');
  
  // Validate: must be 3 or 6 hex characters
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    // Expand 3-char to 6-char
    return hex.split('').map(c => c + c).join('').toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }
  
  return DEFAULT_OPTIONS.color;
}

/**
 * Validate badge style
 */
export function normalizeStyle(style: string | undefined): BadgeStyle {
  const validStyles: BadgeStyle[] = ['flat', 'flat-square', 'plastic', 'for-the-badge'];
  if (style && validStyles.includes(style as BadgeStyle)) {
    return style as BadgeStyle;
  }
  return DEFAULT_OPTIONS.style;
}

/**
 * Generate SVG badge
 */
export function generateBadge(count: number | null, options: BadgeOptions = {}): string {
  const style = normalizeStyle(options.style);
  const color = normalizeColor(options.color);
  const label = options.label || DEFAULT_OPTIONS.label;
  const countText = count === null ? '?' : formatCount(count);
  
  const isForTheBadge = style === 'for-the-badge';
  const fontSize = isForTheBadge ? 10 : 11;
  const height = isForTheBadge ? 28 : 20;
  const padding = isForTheBadge ? 14 : 10;
  const displayLabel = isForTheBadge ? label.toUpperCase() : label;
  const displayCount = isForTheBadge ? countText.toUpperCase() : countText;
  
  const labelWidth = Math.round(textWidth(displayLabel, fontSize) + padding * 2);
  const countWidth = Math.round(textWidth(displayCount, fontSize) + padding * 2);
  const totalWidth = labelWidth + countWidth;
  
  const labelX = labelWidth / 2;
  const countX = labelWidth + countWidth / 2;
  const textY = isForTheBadge ? 18 : 14;
  const shadowY = textY + 1;
  
  const rx = style === 'flat-square' ? 0 : 3;
  
  // Gradient for plastic style
  const gradient = style === 'plastic' 
    ? `<linearGradient id="g" x2="0" y2="100%">
        <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
        <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
        <stop offset=".9" stop-opacity=".3"/>
        <stop offset="1" stop-opacity=".5"/>
      </linearGradient>`
    : `<linearGradient id="g" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>`;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  ${gradient}
  <clipPath id="c">
    <rect width="${totalWidth}" height="${height}" rx="${rx}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#c)">
    <rect width="${labelWidth}" height="${height}" fill="#333"/>
    <rect x="${labelWidth}" width="${countWidth}" height="${height}" fill="#${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#g)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}"${isForTheBadge ? ' font-weight="bold"' : ''}>
    <text x="${labelX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${escapeXml(displayLabel)}</text>
    <text x="${labelX}" y="${textY}">${escapeXml(displayLabel)}</text>
    <text x="${countX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${escapeXml(displayCount)}</text>
    <text x="${countX}" y="${textY}">${escapeXml(displayCount)}</text>
  </g>
</svg>`;
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

/**
 * SVG Badge Generator
 * Generates Nice-branded badges with Bungee font
 */

export type BadgeTheme = 'gold' | 'light' | 'dark';

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
 * Calculate text width for Bungee font (approximate)
 */
function textWidth(text: string, fontSize: number): number {
  // Bungee is wider than typical fonts
  const avgCharWidth = fontSize * 0.75;
  return text.length * avgCharWidth;
}

/**
 * Validate badge theme
 */
export function normalizeTheme(theme: string | undefined): BadgeTheme {
  const validThemes: BadgeTheme[] = ['gold', 'light', 'dark'];
  if (theme && validThemes.includes(theme as BadgeTheme)) {
    return theme as BadgeTheme;
  }
  return 'gold';
}

/**
 * Get colors for theme
 */
function getThemeColors(theme: BadgeTheme): { bg: string; text: string; accent: string } {
  switch (theme) {
    case 'gold':
      return { bg: '#fbbf24', text: '#000000', accent: '#000000' };
    case 'light':
      return { bg: '#ffffff', text: '#000000', accent: '#fbbf24' };
    case 'dark':
      return { bg: '#000000', text: '#fbbf24', accent: '#fbbf24' };
  }
}

/**
 * Generate SVG badge
 */
export function generateBadge(count: number | null, options: BadgeOptions = {}): string {
  const theme = normalizeTheme(options.theme);
  const colors = getThemeColors(theme);
  const countText = count === null ? '?' : formatCount(count);
  
  const fontSize = 14;
  const height = 28;
  const paddingX = 12;
  const gap = 6;
  
  const labelText = 'NICE';
  const labelWidth = textWidth(labelText, fontSize);
  const countWidth = textWidth(countText, fontSize);
  const totalWidth = Math.round(paddingX + labelWidth + gap + countWidth + paddingX);
  
  const labelX = paddingX + labelWidth / 2;
  const countX = paddingX + labelWidth + gap + countWidth / 2;
  const textY = 19;
  
  // Border for light theme
  const border = theme === 'light' 
    ? `<rect x="0.5" y="0.5" width="${totalWidth - 1}" height="${height - 1}" rx="3.5" fill="none" stroke="#e5e7eb"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bungee&amp;display=block');
  </style>
  <rect width="${totalWidth}" height="${height}" rx="4" fill="${colors.bg}"/>
  ${border}
  <g font-family="Bungee, Impact, sans-serif" font-size="${fontSize}" text-anchor="middle">
    <text x="${labelX}" y="${textY}" fill="${colors.text}">${escapeXml(labelText)}</text>
    <text x="${countX}" y="${textY}" fill="${colors.accent}">${escapeXml(countText)}</text>
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

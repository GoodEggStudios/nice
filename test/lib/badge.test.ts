import { describe, it, expect } from 'vitest';
import { formatCount, normalizeTheme, generateBadge } from '../../src/lib/badge';

describe('formatCount', () => {
  it('returns numbers under 1000 as-is', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1234)).toBe('1.2k');
    expect(formatCount(1900)).toBe('1.9k');
    expect(formatCount(10000)).toBe('10k');
    expect(formatCount(12345)).toBe('12k');
    expect(formatCount(999999)).toBe('999k');
  });

  it('formats millions with M suffix', () => {
    expect(formatCount(1000000)).toBe('1M');
    expect(formatCount(1234567)).toBe('1.2M');
    expect(formatCount(10000000)).toBe('10M');
    expect(formatCount(12345678)).toBe('12M');
  });

  it('handles edge cases', () => {
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(1050)).toBe('1.1k');
    expect(formatCount(1001)).toBe('1k'); // rounds to 1.0k -> 1k
    expect(formatCount(999999)).toBe('999k');
    expect(formatCount(1500000)).toBe('1.5M');
  });
});

describe('normalizeTheme', () => {
  it('returns default for undefined', () => {
    expect(normalizeTheme(undefined)).toBe('default');
  });

  it('accepts dark theme', () => {
    expect(normalizeTheme('dark')).toBe('dark');
  });

  it('returns default for invalid themes', () => {
    expect(normalizeTheme('invalid')).toBe('default');
    expect(normalizeTheme('')).toBe('default');
    expect(normalizeTheme('light')).toBe('default');
  });
});

describe('generateBadge', () => {
  it('generates valid SVG', () => {
    const svg = generateBadge(42);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('nice');
    expect(svg).toContain('42');
  });

  it('shows ? for null count', () => {
    const svg = generateBadge(null);
    expect(svg).toContain('?');
  });

  it('formats large counts', () => {
    const svg = generateBadge(1234);
    expect(svg).toContain('1.2k');
  });

  it('includes Nice N logo', () => {
    const svg = generateBadge(42);
    // Check for the N logo path
    expect(svg).toContain('<path d="M4.53');
    expect(svg).toContain('fill="#fbbf24"'); // Gold N logo
  });

  it('has shields.io style two-tone design', () => {
    const svg = generateBadge(42);
    // Left section (dark) and right section (gold)
    expect(svg).toContain('fill="#333"'); // dark left bg
    expect(svg).toContain('fill="#fbbf24"'); // gold right bg
  });

  it('count section has black text', () => {
    const svg = generateBadge(42);
    expect(svg).toContain('fill="#000"');
  });

  describe('themes', () => {
    it('default theme has #333 left background', () => {
      const svg = generateBadge(42);
      expect(svg).toContain('fill="#333"');
    });

    it('dark theme has black left background', () => {
      const svg = generateBadge(42, { theme: 'dark' });
      expect(svg).toContain('fill="#000"');
    });
  });

  describe('SVG structure', () => {
    it('has width and height attributes', () => {
      const svg = generateBadge(42);
      expect(svg).toMatch(/width="\d+"/);
      expect(svg).toMatch(/height="20"/);
    });

    it('has rounded corners via clipPath', () => {
      const svg = generateBadge(42);
      expect(svg).toContain('clipPath');
      expect(svg).toContain('rx="3"');
    });

    it('has gradient overlay', () => {
      const svg = generateBadge(42);
      expect(svg).toContain('linearGradient');
      expect(svg).toContain('fill="url(#g)"');
    });

    it('has text shadow for label', () => {
      const svg = generateBadge(42);
      expect(svg).toContain('fill-opacity=".3"');
    });

    it('uses Verdana font family', () => {
      const svg = generateBadge(42);
      expect(svg).toContain('font-family="Verdana');
    });
  });

  describe('count variations', () => {
    it('handles zero', () => {
      const svg = generateBadge(0);
      expect(svg).toContain('>0<');
    });

    it('handles large numbers', () => {
      const svg = generateBadge(999999999);
      expect(svg).toContain('999M');
    });

    it('adjusts width for longer counts', () => {
      const svgSmall = generateBadge(1);
      const svgLarge = generateBadge(999999);
      
      const widthSmall = svgSmall.match(/width="(\d+)"/)?.[1];
      const widthLarge = svgLarge.match(/width="(\d+)"/)?.[1];
      
      expect(Number(widthLarge)).toBeGreaterThan(Number(widthSmall));
    });
  });
});

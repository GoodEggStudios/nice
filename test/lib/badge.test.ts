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
});

describe('normalizeTheme', () => {
  it('returns gold for undefined', () => {
    expect(normalizeTheme(undefined)).toBe('gold');
  });

  it('accepts valid themes', () => {
    expect(normalizeTheme('gold')).toBe('gold');
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
  });

  it('returns gold for invalid themes', () => {
    expect(normalizeTheme('invalid')).toBe('gold');
    expect(normalizeTheme('')).toBe('gold');
    expect(normalizeTheme('flat')).toBe('gold');
  });
});

describe('generateBadge', () => {
  it('generates valid SVG', () => {
    const svg = generateBadge(42);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('NICE');
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

  it('uses Bungee font', () => {
    const svg = generateBadge(42);
    expect(svg).toContain('Bungee');
  });

  describe('themes', () => {
    it('gold theme has yellow background and black text', () => {
      const svg = generateBadge(42, { theme: 'gold' });
      expect(svg).toContain('fill="#fbbf24"'); // yellow bg
      expect(svg).toContain('fill="#000000"'); // black text
    });

    it('light theme has white background and black text', () => {
      const svg = generateBadge(42, { theme: 'light' });
      expect(svg).toContain('fill="#ffffff"'); // white bg
      expect(svg).toContain('fill="#000000"'); // black text
    });

    it('dark theme has black background and yellow text', () => {
      const svg = generateBadge(42, { theme: 'dark' });
      expect(svg).toContain('fill="#000000"'); // black bg
      expect(svg).toContain('fill="#fbbf24"'); // yellow text
    });

    it('light theme has border', () => {
      const svg = generateBadge(42, { theme: 'light' });
      expect(svg).toContain('stroke="#e5e7eb"');
    });

    it('gold theme has no border', () => {
      const svg = generateBadge(42, { theme: 'gold' });
      expect(svg).not.toContain('stroke=');
    });
  });
});

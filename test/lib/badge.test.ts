import { describe, it, expect } from 'vitest';
import { formatCount, normalizeColor, normalizeStyle, generateBadge } from '../../src/lib/badge';

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

describe('normalizeColor', () => {
  it('returns default for undefined', () => {
    expect(normalizeColor(undefined)).toBe('fbbf24');
  });

  it('accepts valid 6-char hex', () => {
    expect(normalizeColor('22c55e')).toBe('22c55e');
    expect(normalizeColor('AABBCC')).toBe('aabbcc');
  });

  it('expands 3-char hex to 6-char', () => {
    expect(normalizeColor('abc')).toBe('aabbcc');
    expect(normalizeColor('FFF')).toBe('ffffff');
  });

  it('strips leading #', () => {
    expect(normalizeColor('#22c55e')).toBe('22c55e');
    expect(normalizeColor('#abc')).toBe('aabbcc');
  });

  it('returns default for invalid colors', () => {
    expect(normalizeColor('invalid')).toBe('fbbf24');
    expect(normalizeColor('gggggg')).toBe('fbbf24');
    expect(normalizeColor('12345')).toBe('fbbf24');
    expect(normalizeColor('')).toBe('fbbf24');
  });
});

describe('normalizeStyle', () => {
  it('returns default for undefined', () => {
    expect(normalizeStyle(undefined)).toBe('flat');
  });

  it('accepts valid styles', () => {
    expect(normalizeStyle('flat')).toBe('flat');
    expect(normalizeStyle('flat-square')).toBe('flat-square');
    expect(normalizeStyle('plastic')).toBe('plastic');
    expect(normalizeStyle('for-the-badge')).toBe('for-the-badge');
  });

  it('returns default for invalid styles', () => {
    expect(normalizeStyle('invalid')).toBe('flat');
    expect(normalizeStyle('')).toBe('flat');
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

  it('uses custom color', () => {
    const svg = generateBadge(42, { color: '22c55e' });
    expect(svg).toContain('#22c55e');
  });

  it('uses custom label', () => {
    const svg = generateBadge(42, { label: 'likes' });
    expect(svg).toContain('likes');
  });

  it('uppercases for-the-badge style', () => {
    const svg = generateBadge(42, { style: 'for-the-badge' });
    expect(svg).toContain('NICE');
    expect(svg).toContain('42');
  });

  it('has no border radius for flat-square', () => {
    const svg = generateBadge(42, { style: 'flat-square' });
    expect(svg).toContain('rx="0"');
  });
});

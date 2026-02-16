import { describe, it, expect } from "vitest";
import { formatCount, formatCountLocale } from "../../src/lib/format";

describe("format utilities", () => {
  describe("formatCount", () => {
    it("should not abbreviate numbers under 1000", () => {
      expect(formatCount(0)).toBe("0");
      expect(formatCount(1)).toBe("1");
      expect(formatCount(100)).toBe("100");
      expect(formatCount(999)).toBe("999");
    });

    it("should abbreviate thousands with K", () => {
      expect(formatCount(1000)).toBe("1K");
      expect(formatCount(1234)).toBe("1.2K");
      expect(formatCount(1500)).toBe("1.5K");
      expect(formatCount(9999)).toBe("10K");
      expect(formatCount(12345)).toBe("12.3K");
      expect(formatCount(100000)).toBe("100K");
      expect(formatCount(500000)).toBe("500K");
      expect(formatCount(999999)).toBe("1000K");
    });

    it("should abbreviate millions with M", () => {
      expect(formatCount(1000000)).toBe("1M");
      expect(formatCount(1234567)).toBe("1.2M");
      expect(formatCount(1500000)).toBe("1.5M");
      expect(formatCount(12345678)).toBe("12.3M");
      expect(formatCount(100000000)).toBe("100M");
      expect(formatCount(999999999)).toBe("1000M");
    });

    it("should abbreviate billions with B", () => {
      expect(formatCount(1000000000)).toBe("1B");
      expect(formatCount(1234567890)).toBe("1.2B");
      expect(formatCount(1500000000)).toBe("1.5B");
      expect(formatCount(10000000000)).toBe("10B");
    });

    it("should remove trailing zeros by default", () => {
      expect(formatCount(1000)).toBe("1K");
      expect(formatCount(2000)).toBe("2K");
      expect(formatCount(1000000)).toBe("1M");
    });

    it("should keep trailing zeros when option is set", () => {
      expect(formatCount(1000, { showTrailingZeros: true })).toBe("1.0K");
      expect(formatCount(2000, { showTrailingZeros: true })).toBe("2.0K");
    });

    it("should respect decimal places option", () => {
      expect(formatCount(1234, { decimals: 2 })).toBe("1.23K");
      expect(formatCount(1234567, { decimals: 2 })).toBe("1.23M");
      expect(formatCount(1234, { decimals: 0 })).toBe("1K");
    });

    it("should handle negative numbers", () => {
      expect(formatCount(-1000)).toBe("-1K");
      expect(formatCount(-1234567)).toBe("-1.2M");
      expect(formatCount(-500)).toBe("-500");
    });
  });

  describe("formatCountLocale", () => {
    it("should format with thousands separators (en-US)", () => {
      expect(formatCountLocale(1234567)).toBe("1,234,567");
      expect(formatCountLocale(1000)).toBe("1,000");
      expect(formatCountLocale(100)).toBe("100");
    });

    it("should handle zero", () => {
      expect(formatCountLocale(0)).toBe("0");
    });

    it("should handle negative numbers", () => {
      expect(formatCountLocale(-1234567)).toBe("-1,234,567");
    });
  });
});

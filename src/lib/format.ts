/**
 * Count formatting utilities
 *
 * Formats large numbers with abbreviations for display:
 * - 1,234 → "1.2K"
 * - 1,234,567 → "1.2M"
 * - 1,234,567,890 → "1.2B"
 */

interface FormatOptions {
  /** Number of decimal places (default: 1) */
  decimals?: number;
  /** Whether to show decimals for round numbers like 1.0K (default: false) */
  showTrailingZeros?: boolean;
}

const ABBREVIATIONS = [
  { threshold: 1_000_000_000, suffix: "B", divisor: 1_000_000_000 },
  { threshold: 1_000_000, suffix: "M", divisor: 1_000_000 },
  { threshold: 1_000, suffix: "K", divisor: 1_000 },
];

/**
 * Formats a count with appropriate abbreviation
 *
 * @param count - The number to format
 * @param options - Formatting options
 * @returns Formatted string (e.g., "1.2K", "500", "3.5M")
 *
 * @example
 * formatCount(500) // "500"
 * formatCount(1234) // "1.2K"
 * formatCount(1500000) // "1.5M"
 * formatCount(1000000000) // "1B"
 */
export function formatCount(count: number, options: FormatOptions = {}): string {
  const { decimals = 1, showTrailingZeros = false } = options;

  // Handle negative numbers
  if (count < 0) {
    return `-${formatCount(Math.abs(count), options)}`;
  }

  // Find the appropriate abbreviation
  for (const { threshold, suffix, divisor } of ABBREVIATIONS) {
    if (count >= threshold) {
      const value = count / divisor;
      const formatted = value.toFixed(decimals);

      // Remove trailing zeros if not wanted (e.g., "1.0K" → "1K")
      if (!showTrailingZeros) {
        const cleaned = parseFloat(formatted).toString();
        return `${cleaned}${suffix}`;
      }

      return `${formatted}${suffix}`;
    }
  }

  // No abbreviation needed
  return count.toString();
}

/**
 * Formats a count with locale-aware thousands separators
 *
 * @param count - The number to format
 * @param locale - The locale to use (default: "en-US")
 * @returns Formatted string with thousands separators
 *
 * @example
 * formatCountLocale(1234567) // "1,234,567"
 */
export function formatCountLocale(count: number, locale: string = "en-US"): string {
  return count.toLocaleString(locale);
}

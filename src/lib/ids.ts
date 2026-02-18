/**
 * ID generation utilities for v2 buttons
 *
 * Public ID: n_<8 base62 chars> - used in embeds, public-facing
 * Private ID: ns_<20 base62 chars> - used for management, shown once
 */

// Base62 alphabet (alphanumeric, no ambiguous chars)
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a random base62 string of specified length
 */
function randomBase62(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => BASE62[b % 62])
    .join("");
}

/**
 * Generate a public button ID
 * Format: n_<8 base62 chars>
 *
 * @returns A new public button ID
 */
export function generatePublicId(): string {
  return `n_${randomBase62(8)}`;
}

/**
 * Generate a private button ID (secret)
 * Format: ns_<20 base62 chars>
 *
 * @returns A new private button ID
 */
export function generatePrivateId(): string {
  return `ns_${randomBase62(20)}`;
}

/**
 * Validate public ID format
 *
 * @param id - The ID to validate
 * @returns true if valid n_xxx format
 */
export function isValidPublicId(id: string): boolean {
  if (!id.startsWith("n_")) return false;
  const payload = id.slice(2);
  if (payload.length !== 8) return false;
  return /^[0-9A-Za-z]+$/.test(payload);
}

/**
 * Validate private ID format
 *
 * @param id - The ID to validate
 * @returns true if valid ns_xxx format
 */
export function isValidPrivateId(id: string): boolean {
  if (!id.startsWith("ns_")) return false;
  const payload = id.slice(3);
  if (payload.length !== 20) return false;
  return /^[0-9A-Za-z]+$/.test(payload);
}

/**
 * Check if an ID is a legacy button ID (btn_xxx)
 *
 * @param id - The ID to check
 * @returns true if legacy btn_ format
 */
export function isLegacyButtonId(id: string): boolean {
  if (!id.startsWith("btn_")) return false;
  const payload = id.slice(4);
  // Legacy IDs are base64url encoded 12 bytes = 16 chars
  if (payload.length !== 16) return false;
  return /^[A-Za-z0-9_-]+$/.test(payload);
}

/**
 * Validate any button ID format (v1 or v2)
 *
 * @param id - The ID to validate
 * @returns true if valid button ID format
 */
export function isValidButtonId(id: string): boolean {
  return isValidPublicId(id) || isLegacyButtonId(id);
}

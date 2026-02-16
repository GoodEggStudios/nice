/**
 * Token generation utility
 *
 * Generates secure API tokens with the format: nice_ + 32 random bytes (base64url encoded)
 * Total length: 5 (prefix) + 43 (base64url of 32 bytes) = 48 characters
 */

const TOKEN_PREFIX = "nice_";
const TOKEN_BYTES = 32;

/**
 * Generates a secure random token for API authentication
 * Format: nice_ + 32 random bytes encoded as base64url (no padding)
 *
 * @returns A new API token string
 */
export function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  // Convert to base64url: replace + with -, / with _, remove padding
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${TOKEN_PREFIX}${base64url}`;
}

/**
 * Validates that a string looks like a valid Nice token
 *
 * @param token - The token to validate
 * @returns true if the token has valid format
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return false;
  }
  const payload = token.slice(TOKEN_PREFIX.length);
  // Base64url of 32 bytes = 43 characters (without padding)
  if (payload.length !== 43) {
    return false;
  }
  // Check for valid base64url characters
  return /^[A-Za-z0-9_-]+$/.test(payload);
}

/**
 * Generates a button ID with btn_ prefix
 *
 * @returns A new button ID string
 */
export function generateButtonId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `btn_${base64url}`;
}

/**
 * Generates a site ID with site_ prefix
 *
 * @returns A new site ID string
 */
export function generateSiteId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `site_${base64url}`;
}

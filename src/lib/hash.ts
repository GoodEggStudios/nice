/**
 * SHA-256 hashing utilities
 *
 * Used for:
 * - Hashing API tokens before storage (security)
 * - Generating visitor hashes for deduplication (privacy)
 */

/**
 * Computes SHA-256 hash of a string and returns it as hex
 *
 * @param input - The string to hash
 * @returns The hex-encoded SHA-256 hash
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes a visitor hash for deduplication
 *
 * The hash is scoped per button and uses a daily salt to limit tracking.
 * Formula: SHA256(ip + fingerprint + buttonId + dailySalt)
 *
 * @param ip - The visitor's IP address
 * @param fingerprint - Client-generated fingerprint hash
 * @param buttonId - The button ID being nice'd
 * @param dailySalt - The current day's salt
 * @returns The hex-encoded visitor hash
 */
export async function computeVisitorHash(
  ip: string,
  fingerprint: string,
  buttonId: string,
  dailySalt: string
): Promise<string> {
  const input = `${ip}|${fingerprint}|${buttonId}|${dailySalt}`;
  return sha256(input);
}

/**
 * Hashes an API token for secure storage
 *
 * Tokens are never stored in plaintext - only the hash is kept.
 *
 * @param token - The API token to hash
 * @returns The hex-encoded hash of the token
 */
export async function hashToken(token: string): Promise<string> {
  return sha256(token);
}

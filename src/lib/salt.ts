/**
 * Daily salt generation and rotation
 *
 * Salts are used in visitor hash computation to limit long-term tracking.
 * A new salt is generated each day (UTC), meaning the same visitor gets
 * a different hash each day.
 * 
 * Uses deterministic derivation from a master secret to avoid race conditions
 * at midnight UTC when multiple requests might try to generate different salts.
 */

import { sha256 } from "./hash";

const MASTER_SECRET_KEY = "config:master_secret";
const SALT_BYTES = 32;

/**
 * Gets the current date in YYYY-MM-DD format (UTC)
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Generates a new random secret
 */
function generateMasterSecret(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gets or creates the master secret, then derives today's salt deterministically
 *
 * This avoids race conditions at midnight - all requests will derive the same
 * salt for the same date from the same master secret.
 *
 * @param kv - The KV namespace
 * @returns The current day's salt
 */
export async function getDailySalt(kv: KVNamespace): Promise<string> {
  const today = getCurrentDateUTC();

  // Get or create master secret (one-time operation)
  let masterSecret = await kv.get(MASTER_SECRET_KEY);
  
  if (!masterSecret) {
    // First time setup - generate master secret
    masterSecret = generateMasterSecret();
    await kv.put(MASTER_SECRET_KEY, masterSecret);
  }

  // Derive today's salt deterministically from master secret + date
  // This eliminates the race condition - same inputs always produce same output
  return sha256(`${masterSecret}:daily_salt:${today}`);
}

/**
 * Generates a deterministic salt for a specific date
 *
 * This is useful for testing or when you need to compute what a visitor's
 * hash would have been on a specific day.
 *
 * @param baseSecret - A secret base string (should be consistent)
 * @param date - The date in YYYY-MM-DD format
 * @returns A deterministic salt for that date
 */
export async function getDeterministicSalt(
  baseSecret: string,
  date: string
): Promise<string> {
  return sha256(`${baseSecret}:${date}`);
}

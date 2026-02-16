/**
 * Daily salt generation and rotation
 *
 * Salts are used in visitor hash computation to limit long-term tracking.
 * A new salt is generated each day (UTC), meaning the same visitor gets
 * a different hash each day.
 */

import { sha256 } from "./hash";

const SALT_KV_KEY = "config:daily_salt";
const SALT_BYTES = 32;

interface DailySalt {
  salt: string;
  date: string; // YYYY-MM-DD format
}

/**
 * Gets the current date in YYYY-MM-DD format (UTC)
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Generates a new random salt
 */
function generateNewSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gets or creates the daily salt from KV storage
 *
 * If the stored salt is from a previous day, generates a new one.
 *
 * @param kv - The KV namespace
 * @returns The current day's salt
 */
export async function getDailySalt(kv: KVNamespace): Promise<string> {
  const today = getCurrentDateUTC();

  // Try to get existing salt
  const stored = await kv.get<DailySalt>(SALT_KV_KEY, "json");

  if (stored && stored.date === today) {
    return stored.salt;
  }

  // Generate new salt for today
  const newSalt: DailySalt = {
    salt: generateNewSalt(),
    date: today,
  };

  // Store with no expiration (we'll overwrite daily)
  await kv.put(SALT_KV_KEY, JSON.stringify(newSalt));

  return newSalt.salt;
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

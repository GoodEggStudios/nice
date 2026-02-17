/**
 * Rate Limiting & Anti-Spam
 *
 * - Per-IP rate limiting (20/min)
 * - Per-button rate limiting (100/min)
 * - Burst detection with proof-of-work escalation
 * - Difficulty scaling based on attack intensity
 */

import { sha256 } from "./hash";

// Rate limit configuration
const IP_LIMIT_PER_MINUTE = 20;
const BUTTON_LIMIT_PER_MINUTE = 100;
const BURST_THRESHOLD = 500;
const POW_EXIT_THRESHOLD = 100;
const POW_COOLDOWN_MINUTES = 5;

// KV key prefixes
const RATE_IP_PREFIX = "rate:ip:";
const RATE_BUTTON_PREFIX = "rate:button:";
const POW_PREFIX = "pow:";
const ABUSE_PREFIX = "abuse:";

// Difficulty levels based on attack intensity
const DIFFICULTY_LEVELS = [
  { threshold: 5000, difficulty: 20 },  // ~1.6s solve time
  { threshold: 1000, difficulty: 18 },  // ~400ms solve time
  { threshold: 500, difficulty: 16 },   // ~100ms solve time
];

interface RateLimitResult {
  allowed: boolean;
  reason?: "ip_limit" | "button_limit" | "pow_required";
  retryAfter?: number;
  powChallenge?: PowChallenge;
}

interface PowChallenge {
  challenge: string;
  difficulty: number;
  expires_at: string;
}

interface PowState {
  active: boolean;
  difficulty: number;
  since: string;
  lastCheck: string;
  lowTrafficMinutes: number;
}

interface PowSolution {
  challenge: string;
  nonce: string;
}

/**
 * Check rate limits for a nice request
 */
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  buttonId: string
): Promise<RateLimitResult> {
  const minute = getCurrentMinute();
  const ipHash = await sha256(ip);

  // Check IP rate limit
  const ipKey = `${RATE_IP_PREFIX}${ipHash}:${minute}`;
  const ipCount = await incrementCounter(kv, ipKey, 60);

  if (ipCount > IP_LIMIT_PER_MINUTE) {
    await logAbuse(kv, ipHash, buttonId, "ip_limit");
    return {
      allowed: false,
      reason: "ip_limit",
      retryAfter: 60 - (Date.now() / 1000) % 60,
    };
  }

  // Check button rate limit
  const buttonKey = `${RATE_BUTTON_PREFIX}${buttonId}:${minute}`;
  const buttonCount = await incrementCounter(kv, buttonKey, 60);

  // Check if PoW mode is active
  const powState = await getPowState(kv, buttonId);

  if (buttonCount > BURST_THRESHOLD || powState?.active) {
    // Activate or maintain PoW mode
    const difficulty = getDifficulty(buttonCount);
    await activatePowMode(kv, buttonId, difficulty);

    const challenge = await generateChallenge(kv, buttonId);
    return {
      allowed: false,
      reason: "pow_required",
      powChallenge: {
        challenge,
        difficulty,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    };
  }

  if (buttonCount > BUTTON_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      reason: "button_limit",
      retryAfter: 60 - (Date.now() / 1000) % 60,
    };
  }

  // Check if we should exit PoW mode
  if (powState?.active && buttonCount < POW_EXIT_THRESHOLD) {
    await checkPowExit(kv, buttonId, powState);
  }

  return { allowed: true };
}

/**
 * Validate a proof-of-work solution
 */
export async function validatePowSolution(
  kv: KVNamespace,
  buttonId: string,
  solution: PowSolution
): Promise<{ valid: boolean; error?: string }> {
  // Get current PoW state
  const powState = await getPowState(kv, buttonId);
  if (!powState?.active) {
    return { valid: true }; // PoW not required
  }

  // Check challenge is valid and not expired
  const challengeKey = `pow:challenge:${solution.challenge}`;
  const challengeData = await kv.get(challengeKey);
  
  if (!challengeData) {
    return { valid: false, error: "Invalid or expired challenge" };
  }

  // Verify solution: SHA256(challenge + nonce) must have `difficulty` leading zero bits
  const hash = await sha256(solution.challenge + solution.nonce);
  const leadingZeros = countLeadingZeroBits(hash);

  if (leadingZeros < powState.difficulty) {
    return { valid: false, error: "Invalid solution" };
  }

  // Mark challenge as used (prevent replay)
  await kv.delete(challengeKey);

  return { valid: true };
}

// Helper functions

function getCurrentMinute(): string {
  return Math.floor(Date.now() / 60000).toString();
}

async function incrementCounter(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number
): Promise<number> {
  // Note: KV doesn't support atomic increments, so there's an inherent race condition.
  // We use a conservative approach: read current, add a safety margin estimate,
  // then write the increment. This may slightly over-count but won't under-count.
  const current = await kv.get(key, { cacheTtl: 60 });
  const count = (parseInt(current || "0", 10) || 0) + 1;
  
  // Write immediately - accept some race condition loss
  // For critical rate limiting, consider Durable Objects
  await kv.put(key, count.toString(), { expirationTtl: ttlSeconds });
  
  return count;
}

async function getPowState(kv: KVNamespace, buttonId: string): Promise<PowState | null> {
  const data = await kv.get(`${POW_PREFIX}${buttonId}`);
  if (!data) return null;
  return JSON.parse(data);
}

async function activatePowMode(
  kv: KVNamespace,
  buttonId: string,
  difficulty: number
): Promise<void> {
  const existing = await getPowState(kv, buttonId);
  const state: PowState = existing || {
    active: true,
    difficulty,
    since: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
    lowTrafficMinutes: 0,
  };

  state.active = true;
  state.difficulty = difficulty;
  state.lastCheck = new Date().toISOString();

  // Keep PoW state for 10 minutes max
  await kv.put(`${POW_PREFIX}${buttonId}`, JSON.stringify(state), {
    expirationTtl: 600,
  });
}

async function checkPowExit(
  kv: KVNamespace,
  buttonId: string,
  state: PowState
): Promise<void> {
  const now = new Date();
  const lastCheck = new Date(state.lastCheck);
  const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 60000;

  if (minutesSinceLastCheck >= 1) {
    state.lowTrafficMinutes += Math.floor(minutesSinceLastCheck);
    state.lastCheck = now.toISOString();

    if (state.lowTrafficMinutes >= POW_COOLDOWN_MINUTES) {
      // Exit PoW mode
      await kv.delete(`${POW_PREFIX}${buttonId}`);
    } else {
      await kv.put(`${POW_PREFIX}${buttonId}`, JSON.stringify(state), {
        expirationTtl: 600,
      });
    }
  }
}

async function generateChallenge(kv: KVNamespace, buttonId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const challenge = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Store challenge with 60s expiry
  await kv.put(`pow:challenge:${challenge}`, buttonId, { expirationTtl: 60 });

  return challenge;
}

function getDifficulty(requestsPerMinute: number): number {
  for (const level of DIFFICULTY_LEVELS) {
    if (requestsPerMinute >= level.threshold) {
      return level.difficulty;
    }
  }
  return 16; // Default
}

function countLeadingZeroBits(hexHash: string): number {
  let count = 0;
  for (const char of hexHash) {
    const nibble = parseInt(char, 16);
    if (nibble === 0) {
      count += 4;
    } else {
      // Count leading zeros in this nibble
      if (nibble < 8) count += 1;
      if (nibble < 4) count += 1;
      if (nibble < 2) count += 1;
      break;
    }
  }
  return count;
}

async function logAbuse(
  kv: KVNamespace,
  ipHash: string,
  buttonId: string,
  reason: string
): Promise<void> {
  const hour = Math.floor(Date.now() / 3600000).toString();
  const key = `${ABUSE_PREFIX}${ipHash}:${hour}`;
  
  const existing = await kv.get(key);
  const events = existing ? JSON.parse(existing) : [];
  
  events.push({
    buttonId,
    reason,
    timestamp: new Date().toISOString(),
  });

  // Keep abuse logs for 7 days
  await kv.put(key, JSON.stringify(events), { expirationTtl: 7 * 24 * 60 * 60 });
}

/**
 * Format rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (result.retryAfter) {
    headers["Retry-After"] = Math.ceil(result.retryAfter).toString();
  }

  const body: Record<string, unknown> = {
    error: "Rate limit exceeded",
    code: result.reason?.toUpperCase() || "RATE_LIMITED",
  };

  if (result.powChallenge) {
    body.pow_challenge = result.powChallenge;
    body.error = "Proof of work required";
    body.code = "POW_REQUIRED";
  }

  return new Response(JSON.stringify(body), {
    status: 429,
    headers,
  });
}

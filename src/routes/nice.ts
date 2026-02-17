/**
 * Nice Recording API
 *
 * Public endpoints (no auth required):
 * - POST /api/v1/nice/:button_id - Record a nice
 * - GET /api/v1/nice/:button_id/count - Get nice count
 */

import type { Env, Button, Site } from "../types";
import { computeVisitorHash, getDailySalt, checkRateLimit, validatePowSolution, rateLimitResponse } from "../lib";

// KV key prefixes
const BUTTON_PREFIX = "button:";
const SITE_PREFIX = "site:";
const NICE_PREFIX = "nice:"; // nice:{button_id}:{visitor_hash} -> 1 (with TTL)
const COUNT_PREFIX = "count:"; // count:{button_id} -> number

// 24 hours in seconds for deduplication TTL
const DEDUPE_TTL_SECONDS = 24 * 60 * 60;

interface NiceRequest {
  fingerprint?: string;
  pow_solution?: {
    challenge: string;
    nonce: string;
  };
}

interface NiceResponse {
  success: boolean;
  count: number;
  reason?: string;
}

interface CountResponse {
  count: number;
  button_id: string;
}

/**
 * POST /api/v1/nice/:button_id - Record a nice
 */
export async function recordNice(
  request: Request,
  env: Env,
  buttonId: string
): Promise<Response> {
  try {
    // Get button
    const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
    if (!buttonData) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    const button: Button = JSON.parse(buttonData);

    // Check site is verified
    const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${button.siteId}`);
    if (!siteData) {
      return jsonError("Site not found", "SITE_NOT_FOUND", 404);
    }

    const site: Site = JSON.parse(siteData);
    if (!site.verified) {
      return jsonError("Site not verified", "SITE_NOT_VERIFIED", 403);
    }

    // Get visitor IP
    const ip = request.headers.get("CF-Connecting-IP") || 
               request.headers.get("X-Forwarded-For")?.split(",")[0] || 
               "unknown";

    // Parse request body for fingerprint and PoW solution
    let fingerprint = "";
    let powSolution: NiceRequest["pow_solution"] | undefined;
    try {
      const body = (await request.json()) as NiceRequest;
      fingerprint = body.fingerprint || "";
      powSolution = body.pow_solution;
    } catch {
      // No body or invalid JSON is fine - fingerprint is optional
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(env.NICE_KV, ip, buttonId);
    
    if (!rateLimitResult.allowed) {
      // If PoW is required, check for valid solution
      if (rateLimitResult.reason === "pow_required" && powSolution) {
        const powResult = await validatePowSolution(env.NICE_KV, buttonId, powSolution);
        if (!powResult.valid) {
          return new Response(
            JSON.stringify({ error: powResult.error, code: "INVALID_POW" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        // Valid PoW solution - continue with nice
      } else {
        return rateLimitResponse(rateLimitResult);
      }
    }

    // Compute visitor hash for deduplication
    const dailySalt = await getDailySalt(env.NICE_KV);
    const visitorHash = await computeVisitorHash(ip, fingerprint, buttonId, dailySalt);

    // Check if already niced
    const niceKey = `${NICE_PREFIX}${buttonId}:${visitorHash}`;
    const existingNice = await env.NICE_KV.get(niceKey);

    if (existingNice) {
      // Already niced today
      const currentCount = await getCount(env, buttonId);
      const response: NiceResponse = {
        success: false,
        count: currentCount,
        reason: "already_niced",
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: noCacheHeaders(),
      });
    }

    // Record the nice with TTL for deduplication
    await env.NICE_KV.put(niceKey, "1", { expirationTtl: DEDUPE_TTL_SECONDS });

    // Increment count
    const newCount = await incrementCount(env, buttonId);

    // Update button's cached count (eventual consistency is fine)
    button.count = newCount;
    await env.NICE_KV.put(`${BUTTON_PREFIX}${buttonId}`, JSON.stringify(button));

    const response: NiceResponse = {
      success: true,
      count: newCount,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: noCacheHeaders(),
    });
  } catch (e) {
    console.error("recordNice error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * GET /api/v1/nice/:button_id/count - Get nice count
 */
export async function getNiceCount(
  request: Request,
  env: Env,
  buttonId: string
): Promise<Response> {
  try {
    // Check button exists
    const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
    if (!buttonData) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    const count = await getCount(env, buttonId);

    const response: CountResponse = {
      count,
      button_id: buttonId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("getNiceCount error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

// Helper functions

async function getCount(env: Env, buttonId: string): Promise<number> {
  // Use cacheTtl: 60 (minimum) to reduce edge caching staleness
  const countData = await env.NICE_KV.get(`${COUNT_PREFIX}${buttonId}`, { cacheTtl: 60 });
  if (!countData) return 0;
  return parseInt(countData, 10) || 0;
}

async function incrementCount(env: Env, buttonId: string): Promise<number> {
  const countKey = `${COUNT_PREFIX}${buttonId}`;
  
  // KV doesn't have atomic increment, so we do read-modify-write
  // For high-traffic buttons, consider using Durable Objects instead
  const current = await getCount(env, buttonId);
  const newCount = current + 1;
  await env.NICE_KV.put(countKey, newCount.toString());
  
  return newCount;
}

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noCacheHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
  };
}

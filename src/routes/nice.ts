/**
 * Nice Recording API
 *
 * Public endpoints (no auth required):
 * - POST /api/v1/nice/:button_id - Record a nice
 * - GET /api/v1/nice/:button_id/count - Get nice count
 *
 * Supports both v1 (btn_xxx) and v2 (n_xxx) button formats.
 */

import type { Env, Button, ButtonV2, Site, RestrictionMode } from "../types";
import {
  computeVisitorHash,
  getDailySalt,
  checkRateLimit,
  validatePowSolution,
  rateLimitResponse,
  isValidPublicId,
  isLegacyButtonId,
  normalizeUrl,
  extractUrlDomain,
} from "../lib";

// KV key prefixes
const BUTTON_PREFIX = "button:"; // v1 buttons (btn_xxx)
const BUTTON_V2_PREFIX = "btn:"; // v2 buttons (n_xxx)
const SITE_PREFIX = "site:";
const NICE_PREFIX = "nice:"; // nice:{button_id}:{visitor_hash} -> 1 (with TTL)
const COUNT_PREFIX = "count:"; // count:{button_id} -> number

// 24 hours in seconds for deduplication TTL
const DEDUPE_TTL_SECONDS = 24 * 60 * 60;

interface NiceRequest {
  fingerprint?: string;
  referrer?: string;
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
  has_niced?: boolean;
}

/**
 * Check referrer against button restriction mode
 * 
 * For iframe embeds, document.referrer (passed in body) gives the parent page URL,
 * while the Referer header gives the iframe's URL. We prefer the body referrer.
 */
function checkReferrer(
  request: Request,
  buttonUrl: string,
  restriction: RestrictionMode,
  bodyReferrer?: string
): { allowed: boolean; error?: string } {
  // Global mode allows any referrer
  if (restriction === "global") {
    return { allowed: true };
  }

  // Prefer body referrer (from embed's document.referrer) over header
  // Body referrer gives us the parent page URL for iframe embeds
  const referrer = bodyReferrer || request.headers.get("Referer");
  if (!referrer) {
    return { allowed: false, error: "Referrer required" };
  }

  if (restriction === "url") {
    // Exact URL match (normalized)
    if (normalizeUrl(referrer) === normalizeUrl(buttonUrl)) {
      return { allowed: true };
    }
    return { allowed: false, error: "Nice not allowed from this page" };
  }

  if (restriction === "domain") {
    // Domain match
    const referrerDomain = extractUrlDomain(referrer);
    const buttonDomain = extractUrlDomain(buttonUrl);
    if (referrerDomain && buttonDomain && referrerDomain === buttonDomain) {
      return { allowed: true };
    }
    return { allowed: false, error: "Nice not allowed from this domain" };
  }

  return { allowed: true };
}

/**
 * POST /api/v1/nice/:button_id - Record a nice
 *
 * Supports both v1 (btn_xxx) and v2 (n_xxx) button formats.
 */
export async function recordNice(
  request: Request,
  env: Env,
  buttonId: string
): Promise<Response> {
  try {
    // Determine button type and fetch data
    let buttonUrl: string;
    let restriction: RestrictionMode = "global"; // v1 buttons default to global
    let isV2 = false;
    let kvPrefix: string;

    if (isValidPublicId(buttonId)) {
      // V2 button (n_xxx)
      isV2 = true;
      kvPrefix = BUTTON_V2_PREFIX;
      const buttonData = await env.NICE_KV.get(`${BUTTON_V2_PREFIX}${buttonId}`);
      if (!buttonData) {
        return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
      }
      const button: ButtonV2 = JSON.parse(buttonData);
      buttonUrl = button.url;
      restriction = button.restriction;
    } else if (isLegacyButtonId(buttonId)) {
      // V1 button (btn_xxx)
      kvPrefix = BUTTON_PREFIX;
      const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
      if (!buttonData) {
        return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
      }
      const button: Button = JSON.parse(buttonData);
      buttonUrl = button.url;

      // Check site is verified for v1 buttons
      const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${button.siteId}`);
      if (!siteData) {
        return jsonError("Site not found", "SITE_NOT_FOUND", 404);
      }
      const site: Site = JSON.parse(siteData);
      if (!site.verified) {
        return jsonError("Site not verified", "SITE_NOT_VERIFIED", 403);
      }
    } else {
      return jsonError("Invalid button ID format", "INVALID_BUTTON_ID", 400);
    }

    // Parse request body early - needed for referrer check, fingerprint, and PoW
    let bodyReferrer: string | undefined;
    let fingerprint: string | undefined;
    let powSolution: NiceRequest["pow_solution"] | undefined;
    try {
      const body = (await request.json()) as NiceRequest;
      bodyReferrer = body.referrer;
      fingerprint = body.fingerprint;
      powSolution = body.pow_solution;
    } catch {
      // No body or invalid JSON is fine
    }

    // Check referrer restriction (v2 buttons only, v1 defaults to global)
    if (isV2) {
      const referrerCheck = checkReferrer(request, buttonUrl, restriction, bodyReferrer);
      if (!referrerCheck.allowed) {
        return new Response(
          JSON.stringify({ error: referrerCheck.error, code: "REFERRER_DENIED" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Get visitor IP - prefer CF-Connecting-IP (set by Cloudflare)
    let ip = request.headers.get("CF-Connecting-IP");
    if (!ip) {
      const xff = request.headers.get("X-Forwarded-For");
      if (xff) {
        ip = xff.split(",")[0].trim();
        console.warn(`Using X-Forwarded-For (spoofable) for IP: ${ip.substring(0, 8)}...`);
      } else {
        ip = "unknown";
        console.warn("No IP headers present - using 'unknown' for deduplication");
      }
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(env.NICE_KV, ip, buttonId);
    
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === "pow_required" && powSolution) {
        const powResult = await validatePowSolution(env.NICE_KV, buttonId, powSolution);
        if (!powResult.valid) {
          return new Response(
            JSON.stringify({ error: powResult.error, code: "INVALID_POW" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        return rateLimitResponse(rateLimitResult);
      }
    }

    // Compute visitor hash for deduplication (IP + fingerprint = unique device)
    const dailySalt = await getDailySalt(env.NICE_KV);
    const visitorHash = await computeVisitorHash(ip, fingerprint || "", buttonId, dailySalt);

    // Check if already niced
    const niceKey = `${NICE_PREFIX}${buttonId}:${visitorHash}`;
    const existingNice = await env.NICE_KV.get(niceKey);

    if (existingNice) {
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

    // Update button's cached count
    if (isV2) {
      const buttonData = await env.NICE_KV.get(`${BUTTON_V2_PREFIX}${buttonId}`);
      if (buttonData) {
        const button: ButtonV2 = JSON.parse(buttonData);
        button.count = newCount;
        await env.NICE_KV.put(`${BUTTON_V2_PREFIX}${buttonId}`, JSON.stringify(button));
      }
    } else {
      const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
      if (buttonData) {
        const button: Button = JSON.parse(buttonData);
        button.count = newCount;
        await env.NICE_KV.put(`${BUTTON_PREFIX}${buttonId}`, JSON.stringify(button));
      }
    }

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
 * 
 * Returns 200 with count: 0 for non-existent buttons to prevent enumeration.
 * Attackers cannot determine which button IDs are valid.
 * 
 * Also checks if the current visitor has already niced (using IP hash).
 * 
 * Supports both v1 (btn_xxx) and v2 (n_xxx) button formats.
 */
export async function getNiceCount(
  request: Request,
  env: Env,
  buttonId: string
): Promise<Response> {
  try {
    // Check both v1 and v2 button storage
    let buttonExists = false;

    if (isValidPublicId(buttonId)) {
      // V2 button (n_xxx)
      const buttonData = await env.NICE_KV.get(`${BUTTON_V2_PREFIX}${buttonId}`);
      buttonExists = !!buttonData;
    } else if (isLegacyButtonId(buttonId)) {
      // V1 button (btn_xxx)
      const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
      buttonExists = !!buttonData;
    }

    // Return 0 for non-existent buttons (enumeration protection)
    const count = buttonExists ? await getCount(env, buttonId) : 0;

    // Check if visitor has already niced (using same logic as recordNice)
    // Get fingerprint from query param for device-specific check
    const url = new URL(request.url);
    const fingerprint = url.searchParams.get("fp") || "";
    
    let hasNiced = false;
    if (buttonExists) {
      let ip = request.headers.get("CF-Connecting-IP");
      if (!ip) {
        const xff = request.headers.get("X-Forwarded-For");
        if (xff) {
          ip = xff.split(",")[0].trim();
        }
      }
      
      if (ip) {
        const dailySalt = await getDailySalt(env.NICE_KV);
        const visitorHash = await computeVisitorHash(ip, fingerprint, buttonId, dailySalt);
        const niceKey = `${NICE_PREFIX}${buttonId}:${visitorHash}`;
        const existingNice = await env.NICE_KV.get(niceKey);
        hasNiced = !!existingNice;
      }
    }

    const response: CountResponse = {
      count,
      button_id: buttonId,
      has_niced: hasNiced,
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
  
  // KV doesn't have atomic increment - use optimistic increment with retry
  // This reduces (but doesn't eliminate) race condition impact
  // For high-traffic buttons, consider using Durable Objects instead
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentData = await env.NICE_KV.get(countKey, { cacheTtl: 60 });
    const current = parseInt(currentData || "0", 10) || 0;
    const newCount = current + 1;
    
    // Write the new count
    await env.NICE_KV.put(countKey, newCount.toString());
    
    // Verify the write (basic optimistic check)
    if (attempt < maxRetries - 1) {
      const verifyData = await env.NICE_KV.get(countKey, { cacheTtl: 60 });
      const verified = parseInt(verifyData || "0", 10) || 0;
      if (verified >= newCount) {
        return newCount;
      }
      // Race detected, retry
      continue;
    }
    
    return newCount;
  }
  
  // Fallback - just return the current count + 1
  const fallback = await env.NICE_KV.get(countKey, { cacheTtl: 60 });
  return (parseInt(fallback || "0", 10) || 0) + 1;
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

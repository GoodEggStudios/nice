/**
 * Nice - Simple Button Service
 *
 * Main entry point for Cloudflare Worker
 */

import type { Env, Site } from "./types";
import { registerSite, verifySite, regenerateToken } from "./routes/sites";
import { createButton, listButtons, getButton, deleteButton } from "./routes/buttons";
import { createButtonV2, getButtonStatsV2, updateButtonV2, deleteButtonV2, recordNiceV2 } from "./routes/buttons-v2";
import { recordNice, getNiceCount } from "./routes/nice";
import { serveEmbedScript, serveEmbedPage } from "./routes/embed";
import { serveBadge } from "./routes/badge";
import { hashToken, isValidTokenFormat } from "./lib";

// KV key prefix for token lookups
const TOKEN_PREFIX = "token:";
const SITE_PREFIX = "site:";

// CORS headers for public endpoints (embeds, nice counts, recording)
const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Check if origin is allowed for authenticated endpoints
function isOriginAllowed(origin: string | null, siteDomain: string | null): boolean {
  if (!origin) return true; // Server-to-server calls (no Origin header)
  if (origin === "null") return true; // Local file or privacy mode
  
  if (!siteDomain) return false;
  
  try {
    const originUrl = new URL(origin);
    // Allow exact domain match or subdomains
    return originUrl.hostname === siteDomain || 
           originUrl.hostname.endsWith(`.${siteDomain}`);
  } catch {
    return false;
  }
}

// Favicon SVG - Bungee "N" in gold
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61.501 72.001"><path d="M18.601 72.001L3.601 72.001Q0.001 72.001 0.001 68.401L0.001 3.601Q0.001 0.001 3.601 0.001L14.001 0.001Q17.601 0.001 19.901 2.701L39.301 24.901L39.301 3.601Q39.301 0.001 42.901 0.001L57.901 0.001Q61.501 0.001 61.501 3.601L61.501 68.401Q61.501 72.001 57.901 72.001L42.901 72.001Q39.301 72.001 39.301 68.401L39.301 56.101L22.201 35.401L22.201 68.401Q22.201 72.001 18.601 72.001Z" fill="#fbbf24"/></svg>`;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    // Determine if this is an authenticated endpoint (needs DELETE support)
    const isAuthenticatedRoute = path.startsWith("/api/v1/buttons") || 
                                  path.startsWith("/api/v2/buttons") ||
                                  path.includes("/token/regenerate");

    // Handle CORS preflight
    if (method === "OPTIONS") {
      // For authenticated routes, only allow specific headers
      const corsHeaders = isAuthenticatedRoute ? {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      } : PUBLIC_CORS_HEADERS;
      
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (path === "/health" || path === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "nice",
          version: "1.0.0",
        }),
        {
          headers: { "Content-Type": "application/json", ...PUBLIC_CORS_HEADERS },
        }
      );
    }

    // Favicon
    if (method === "GET" && (path === "/favicon.svg" || path === "/favicon.ico")) {
      return new Response(FAVICON_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
          ...PUBLIC_CORS_HEADERS,
        },
      });
    }

    // Embed routes (no CORS wrapper needed - they have their own headers)
    if (method === "GET" && path === "/embed.js") {
      return serveEmbedScript(request);
    }
    if (method === "GET" && path.match(/^\/embed\/[^/]+$/)) {
      const buttonId = path.split("/")[2];
      return serveEmbedPage(request, buttonId);
    }
    // Short embed route /e/:id (alias for /embed/:id)
    if (method === "GET" && path.match(/^\/e\/[^/]+$/)) {
      const buttonId = path.split("/")[2];
      return serveEmbedPage(request, buttonId);
    }

    // Badge route /badge/:publicId.svg
    if (method === "GET" && path.match(/^\/badge\/[^/]+\.svg$/)) {
      const publicId = path.split("/")[2].replace(/\.svg$/, '');
      return serveBadge(request, env, publicId);
    }

    // Route matching
    let response: Response;

    try {
      // POST /api/v1/sites - Register site (no auth required)
      if (method === "POST" && path === "/api/v1/sites") {
        response = await registerSite(request, env);
      }
      // POST /api/v1/sites/:site_id/verify - Verify domain (no auth required)
      else if (method === "POST" && path.match(/^\/api\/v1\/sites\/[^/]+\/verify$/)) {
        const siteId = path.split("/")[4];
        response = await verifySite(request, env, siteId);
      }
      // POST /api/v1/sites/:site_id/token/regenerate - Regenerate token (auth required)
      else if (method === "POST" && path.match(/^\/api\/v1\/sites\/[^/]+\/token\/regenerate$/)) {
        const siteId = path.split("/")[4];
        const auth = await authenticate(request, env);
        if (!auth.authenticated) {
          response = new Response(
            JSON.stringify({ error: auth.error, code: "UNAUTHORIZED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        } else {
          response = await regenerateToken(request, env, siteId, auth.siteId!);
        }
      }
      // POST /api/v1/buttons - Create button (auth required)
      else if (method === "POST" && path === "/api/v1/buttons") {
        const auth = await authenticate(request, env);
        if (!auth.authenticated) {
          response = new Response(
            JSON.stringify({ error: auth.error, code: "UNAUTHORIZED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        } else {
          response = await createButton(request, env, auth.siteId!);
        }
      }
      // GET /api/v1/buttons - List buttons (auth required)
      else if (method === "GET" && path === "/api/v1/buttons") {
        const auth = await authenticate(request, env);
        if (!auth.authenticated) {
          response = new Response(
            JSON.stringify({ error: auth.error, code: "UNAUTHORIZED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        } else {
          response = await listButtons(request, env, auth.siteId!);
        }
      }
      // GET /api/v1/buttons/:button_id - Get button (auth required)
      else if (method === "GET" && path.match(/^\/api\/v1\/buttons\/[^/]+$/)) {
        const buttonId = path.split("/")[4];
        const auth = await authenticate(request, env);
        if (!auth.authenticated) {
          response = new Response(
            JSON.stringify({ error: auth.error, code: "UNAUTHORIZED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        } else {
          response = await getButton(request, env, buttonId, auth.siteId!);
        }
      }
      // DELETE /api/v1/buttons/:button_id - Delete button (auth required)
      else if (method === "DELETE" && path.match(/^\/api\/v1\/buttons\/[^/]+$/)) {
        const buttonId = path.split("/")[4];
        const auth = await authenticate(request, env);
        if (!auth.authenticated) {
          response = new Response(
            JSON.stringify({ error: auth.error, code: "UNAUTHORIZED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        } else {
          response = await deleteButton(request, env, buttonId, auth.siteId!);
        }
      }
      // POST /api/v1/nice/:button_id - Record a nice (public, no auth)
      else if (method === "POST" && path.match(/^\/api\/v1\/nice\/[^/]+$/)) {
        const buttonId = path.split("/")[4];
        response = await recordNice(request, env, buttonId);
      }
      // GET /api/v1/nice/:button_id/count - Get nice count (public, no auth)
      else if (method === "GET" && path.match(/^\/api\/v1\/nice\/[^/]+\/count$/)) {
        const buttonId = path.split("/")[4];
        response = await getNiceCount(request, env, buttonId);
      }
      // ============ V2 API Routes (public, no site registration required) ============
      // POST /api/v2/buttons - Create button (public, rate-limited)
      else if (method === "POST" && path === "/api/v2/buttons") {
        response = await createButtonV2(request, env);
      }
      // GET /api/v2/buttons/stats/:private_id - Get button stats
      else if (method === "GET" && path.match(/^\/api\/v2\/buttons\/stats\/[^/]+$/)) {
        const privateId = path.split("/")[5];
        response = await getButtonStatsV2(request, privateId, env);
      }
      // DELETE /api/v2/buttons/:private_id - Delete button
      else if (method === "DELETE" && path.match(/^\/api\/v2\/buttons\/[^/]+$/)) {
        const privateId = path.split("/")[4];
        response = await deleteButtonV2(request, privateId, env);
      }
      // PATCH /api/v2/buttons/:private_id - Update button settings
      else if (method === "PATCH" && path.match(/^\/api\/v2\/buttons\/[^/]+$/)) {
        const privateId = path.split("/")[4];
        response = await updateButtonV2(request, privateId, env);
      }
      // POST /api/v2/buttons/:private_id/nice - Record nice (authenticated)
      else if (method === "POST" && path.match(/^\/api\/v2\/buttons\/[^/]+\/nice$/)) {
        const privateId = path.split("/")[4];
        response = await recordNiceV2(request, privateId, env);
      }
      // 404 - Not found
      else {
        response = new Response(
          JSON.stringify({ error: "Not found", code: "NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.error("Unhandled error:", e);
      response = new Response(
        JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add CORS headers based on route type
    const newHeaders = new Headers(response.headers);
    
    if (isAuthenticatedRoute) {
      // For authenticated routes, only allow the specific origin if it matches site domain
      // Server-to-server calls (no Origin) are always allowed
      if (origin) {
        newHeaders.set("Access-Control-Allow-Origin", origin);
        newHeaders.set("Access-Control-Allow-Credentials", "true");
      }
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    } else {
      // Public endpoints allow any origin
      Object.entries(PUBLIC_CORS_HEADERS).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

/**
 * Authenticate request via Bearer token
 * Returns siteId and domain for CORS validation
 */
async function authenticate(
  request: Request,
  env: Env
): Promise<{ authenticated: boolean; siteId?: string; domain?: string; error?: string }> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { authenticated: false, error: "Missing Authorization header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Invalid Authorization format. Use: Bearer <token>" };
  }

  const token = authHeader.slice(7);

  if (!isValidTokenFormat(token)) {
    return { authenticated: false, error: "Invalid token format" };
  }

  // Hash token and look up site
  const tokenHash = await hashToken(token);
  const siteId = await env.NICE_KV.get(`${TOKEN_PREFIX}${tokenHash}`);

  if (!siteId) {
    return { authenticated: false, error: "Invalid token" };
  }

  // Get site domain for CORS check
  const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${siteId}`);
  let domain: string | undefined;
  if (siteData) {
    try {
      const site: Site = JSON.parse(siteData);
      domain = site.domain;
    } catch {}
  }

  return { authenticated: true, siteId, domain };
}

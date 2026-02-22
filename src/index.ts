/**
 * Nice - Simple Button Service
 *
 * Main entry point for Cloudflare Worker
 */

declare const VERSION: string | undefined;

import type { Env } from "./types";
import { createButton, getButtonStats, updateButton, deleteButton, recordNiceOwner } from "./routes/buttons";
import { recordNice, getNiceCount } from "./routes/nice";
import { serveEmbedScript, serveEmbedPage } from "./routes/embed";
import { serveBadge } from "./routes/badge";

// CORS headers for all endpoints (public service)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
      });
    }

    // Health check
    if (path === "/health" || path === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "nice",
          version: typeof VERSION !== "undefined" ? VERSION : "dev",
        }),
        {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    // Favicon
    if (method === "GET" && (path === "/favicon.svg" || path === "/favicon.ico")) {
      return new Response(FAVICON_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
          ...CORS_HEADERS,
        },
      });
    }

    // Embed routes
    if (method === "GET" && path === "/embed.js") {
      return serveEmbedScript(request);
    }
    if (method === "GET" && path.match(/^\/embed\/[^/]+$/)) {
      const buttonId = path.split("/")[2];
      return serveEmbedPage(request, buttonId);
    }
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
      // POST /api/v1/buttons - Create button
      if (method === "POST" && path === "/api/v1/buttons") {
        response = await createButton(request, env);
      }
      // GET /api/v1/buttons/stats/:private_id - Get button stats
      else if (method === "GET" && path.match(/^\/api\/v1\/buttons\/stats\/[^/]+$/)) {
        const privateId = path.split("/")[5];
        response = await getButtonStats(request, privateId, env);
      }
      // DELETE /api/v1/buttons/:private_id - Delete button
      else if (method === "DELETE" && path.match(/^\/api\/v1\/buttons\/[^/]+$/)) {
        const privateId = path.split("/")[4];
        response = await deleteButton(request, privateId, env);
      }
      // PATCH /api/v1/buttons/:private_id - Update button settings
      else if (method === "PATCH" && path.match(/^\/api\/v1\/buttons\/[^/]+$/)) {
        const privateId = path.split("/")[4];
        response = await updateButton(request, privateId, env);
      }
      // POST /api/v1/buttons/:private_id/nice - Record nice (authenticated)
      else if (method === "POST" && path.match(/^\/api\/v1\/buttons\/[^/]+\/nice$/)) {
        const privateId = path.split("/")[4];
        response = await recordNiceOwner(request, privateId, env);
      }
      // POST /api/v1/nice/:button_id - Record a nice (public)
      else if (method === "POST" && path.match(/^\/api\/v1\/nice\/[^/]+$/)) {
        const buttonId = path.split("/")[4];
        response = await recordNice(request, env, buttonId);
      }
      // GET /api/v1/nice/:button_id/count - Get nice count (public)
      else if (method === "GET" && path.match(/^\/api\/v1\/nice\/[^/]+\/count$/)) {
        const buttonId = path.split("/")[4];
        response = await getNiceCount(request, env, buttonId);
      }
      // 404
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

    // Add CORS headers
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

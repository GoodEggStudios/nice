/**
 * Button Management API
 *
 * Endpoints:
 * - POST /api/v1/buttons - Create a new button
 * - GET /api/v1/buttons - List buttons for authenticated site
 * - GET /api/v1/buttons/:button_id - Get button details
 * - DELETE /api/v1/buttons/:button_id - Delete a button
 */

import type { Env, Button, Site } from "../types";
import { generateButtonId, urlMatchesDomain } from "../lib";

// KV key prefixes
const BUTTON_PREFIX = "button:";
const SITE_PREFIX = "site:";
const SITE_BUTTONS_PREFIX = "site_buttons:"; // site_buttons:{site_id} -> button_id[]
const URL_BUTTON_PREFIX = "url_button:"; // url_button:{site_id}:{url_hash} -> button_id

const BASE_URL = "https://nice.sbs";

interface CreateButtonRequest {
  name: string;
  url: string;
}

interface ButtonResponse {
  button_id: string;
  name: string;
  url: string;
  count: number;
  created_at: string;
  embed: {
    script: string;
    iframe: string;
    button_id: string;
  };
}

interface ListButtonsResponse {
  buttons: ButtonResponse[];
  cursor?: string;
  has_more: boolean;
}

/**
 * POST /api/v1/buttons - Create a new button
 */
export async function createButton(
  request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    const body = (await request.json()) as CreateButtonRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return jsonError("Missing or invalid field: name", "INVALID_NAME", 400);
    }
    if (!body.url || typeof body.url !== "string") {
      return jsonError("Missing or invalid field: url", "INVALID_URL", 400);
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return jsonError("Invalid URL format", "INVALID_URL", 400);
    }

    // Get site to check domain and verification status
    const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${siteId}`);
    if (!siteData) {
      return jsonError("Site not found", "SITE_NOT_FOUND", 404);
    }

    const site: Site = JSON.parse(siteData);

    // Check site is verified
    if (!site.verified) {
      return jsonError(
        "Site must be verified before creating buttons. Complete DNS verification first.",
        "SITE_NOT_VERIFIED",
        403
      );
    }

    // Check URL domain matches site domain
    if (!urlMatchesDomain(body.url, site.domain)) {
      return jsonError(
        "URL domain must match verified site domain",
        "DOMAIN_MISMATCH",
        400
      );
    }

    // Check for duplicate URL
    const urlHash = await hashUrl(body.url);
    const existingButtonId = await env.NICE_KV.get(
      `${URL_BUTTON_PREFIX}${siteId}:${urlHash}`
    );
    if (existingButtonId) {
      // Don't leak existing_button_id for security
      return new Response(
        JSON.stringify({
          error: "A button already exists for this URL",
          code: "DUPLICATE_URL",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create button
    const buttonId = generateButtonId();
    const button: Button = {
      id: buttonId,
      siteId,
      name: body.name.trim(),
      url: body.url,
      count: 0,
      createdAt: new Date().toISOString(),
    };

    // Store button
    await env.NICE_KV.put(`${BUTTON_PREFIX}${buttonId}`, JSON.stringify(button));

    // Store URL -> button mapping for uniqueness
    await env.NICE_KV.put(`${URL_BUTTON_PREFIX}${siteId}:${urlHash}`, buttonId);

    // Add to site's button list
    await addButtonToSiteList(env, siteId, buttonId);

    return new Response(JSON.stringify(formatButtonResponse(button)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return jsonError("Invalid JSON body", "INVALID_JSON", 400);
    }
    console.error("createButton error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * GET /api/v1/buttons - List buttons for authenticated site
 */
export async function listButtons(
  request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const cursor = url.searchParams.get("cursor");

    // Get site's button IDs
    const buttonIds = await getSiteButtonList(env, siteId);

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = buttonIds.indexOf(cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedIds = buttonIds.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedIds.length > limit;
    const resultIds = hasMore ? paginatedIds.slice(0, limit) : paginatedIds;

    // Fetch button details
    const buttons: ButtonResponse[] = [];
    for (const buttonId of resultIds) {
      const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);
      if (buttonData) {
        const button: Button = JSON.parse(buttonData);
        buttons.push(formatButtonResponse(button));
      }
    }

    const response: ListButtonsResponse = {
      buttons,
      has_more: hasMore,
    };

    if (hasMore && resultIds.length > 0) {
      response.cursor = resultIds[resultIds.length - 1];
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("listButtons error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * GET /api/v1/buttons/:button_id - Get button details
 */
export async function getButton(
  request: Request,
  env: Env,
  buttonId: string,
  siteId: string
): Promise<Response> {
  try {
    const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);

    if (!buttonData) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    const button: Button = JSON.parse(buttonData);

    // Check button belongs to authenticated site (return 404 to avoid leaking existence)
    if (button.siteId !== siteId) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    return new Response(JSON.stringify(formatButtonResponse(button)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("getButton error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/v1/buttons/:button_id - Delete a button
 */
export async function deleteButton(
  request: Request,
  env: Env,
  buttonId: string,
  siteId: string
): Promise<Response> {
  try {
    const buttonData = await env.NICE_KV.get(`${BUTTON_PREFIX}${buttonId}`);

    if (!buttonData) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    const button: Button = JSON.parse(buttonData);

    // Check button belongs to authenticated site
    if (button.siteId !== siteId) {
      return jsonError("Button not found", "BUTTON_NOT_FOUND", 404);
    }

    // Delete button
    await env.NICE_KV.delete(`${BUTTON_PREFIX}${buttonId}`);

    // Delete URL mapping
    const urlHash = await hashUrl(button.url);
    await env.NICE_KV.delete(`${URL_BUTTON_PREFIX}${siteId}:${urlHash}`);

    // Remove from site's button list
    await removeButtonFromSiteList(env, siteId, buttonId);

    // Delete nice count data
    await env.NICE_KV.delete(`count:${buttonId}`);

    return new Response(
      JSON.stringify({ deleted: true, button_id: buttonId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("deleteButton error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

// Helper functions

function formatButtonResponse(button: Button): ButtonResponse {
  const embedScript = `<script src="${BASE_URL}/embed.js" data-button="${button.id}" async></script>`;
  const embedIframe = `<iframe src="${BASE_URL}/embed/${button.id}" style="border:none;width:100px;height:40px;"></iframe>`;

  return {
    button_id: button.id,
    name: button.name,
    url: button.url,
    count: button.count,
    created_at: button.createdAt,
    embed: {
      script: embedScript,
      iframe: embedIframe,
      button_id: button.id,
    },
  };
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSiteButtonList(env: Env, siteId: string): Promise<string[]> {
  const data = await env.NICE_KV.get(`${SITE_BUTTONS_PREFIX}${siteId}`);
  if (!data) return [];
  return JSON.parse(data);
}

async function addButtonToSiteList(
  env: Env,
  siteId: string,
  buttonId: string
): Promise<void> {
  const list = await getSiteButtonList(env, siteId);
  list.push(buttonId);
  await env.NICE_KV.put(`${SITE_BUTTONS_PREFIX}${siteId}`, JSON.stringify(list));
}

async function removeButtonFromSiteList(
  env: Env,
  siteId: string,
  buttonId: string
): Promise<void> {
  const list = await getSiteButtonList(env, siteId);
  const filtered = list.filter((id) => id !== buttonId);
  await env.NICE_KV.put(
    `${SITE_BUTTONS_PREFIX}${siteId}`,
    JSON.stringify(filtered)
  );
}

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

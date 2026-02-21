/**
 * Button Routes - Public button creation, no registration required
 *
 * POST /api/v1/buttons - Create a new button
 * GET /api/v1/buttons/stats/:private_id - Get button stats
 * PATCH /api/v1/buttons/:private_id - Update button settings
 * DELETE /api/v1/buttons/:private_id - Delete a button
 * POST /api/v1/buttons/:private_id/nice - Record nice (owner)
 */

import type { Env, ButtonV2, RestrictionMode } from "../types";
import {
  generatePublicId,
  generatePrivateId,
  isValidPrivateId,
  isValidHttpUrl,
  sha256,
  checkCreateRateLimit,
  createRateLimitResponse,
} from "../lib";

// Valid themes and sizes
const VALID_THEMES = ["light", "dark", "minimal", "mono-dark", "mono-light"];
const VALID_SIZES = ["xs", "sm", "md", "lg", "xl"];
const VALID_RESTRICTIONS: RestrictionMode[] = ["url", "domain", "global"];

/**
 * Get client IP from request
 */
function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

/**
 * Generate embed snippets for a button
 */
function generateEmbedSnippets(
  publicId: string,
  baseUrl: string,
  theme: string,
  size: string
): { iframe: string; script: string } {
  const embedUrl = `${baseUrl}/e/${publicId}?theme=${theme}&size=${size}`;

  // Iframe dimensions based on size
  const dimensions: Record<string, { w: number; h: number }> = {
    xs: { w: 70, h: 28 },
    sm: { w: 85, h: 32 },
    md: { w: 100, h: 36 },
    lg: { w: 120, h: 44 },
    xl: { w: 140, h: 52 },
  };
  const dim = dimensions[size] || dimensions.md;

  const iframe = `<iframe src="${embedUrl}" style="border:none;width:${dim.w}px;height:${dim.h}px;" title="Nice button"></iframe>`;
  const script = `<script src="${baseUrl}/embed.js" data-button="${publicId}" data-theme="${theme}" data-size="${size}" async></script>`;

  return { iframe, script };
}

/**
 * POST /api/v1/buttons - Create a new button
 */
export async function createButtonV2(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse request body
  let body: {
    url?: string;
    theme?: string;
    size?: string;
    restriction?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  // Validate URL (required)
  if (!body.url) {
    return Response.json(
      { error: "URL is required", code: "MISSING_URL" },
      { status: 400 }
    );
  }

  if (!isValidHttpUrl(body.url)) {
    return Response.json(
      { error: "Invalid URL format", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // Validate optional params
  const theme = body.theme || "light";
  if (!VALID_THEMES.includes(theme)) {
    return Response.json(
      { error: "Invalid theme", code: "INVALID_THEME" },
      { status: 400 }
    );
  }

  const size = body.size || "md";
  if (!VALID_SIZES.includes(size)) {
    return Response.json(
      { error: "Invalid size", code: "INVALID_SIZE" },
      { status: 400 }
    );
  }

  const restriction = (body.restriction || "url") as RestrictionMode;
  if (!VALID_RESTRICTIONS.includes(restriction)) {
    return Response.json(
      { error: "Invalid restriction mode", code: "INVALID_RESTRICTION" },
      { status: 400 }
    );
  }

  // Rate limit check
  const clientIp = getClientIp(request);
  const rateLimit = await checkCreateRateLimit(env.NICE_KV, clientIp);

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // Generate IDs
  const publicId = generatePublicId();
  const privateId = generatePrivateId();

  // Hash secrets for storage
  const secretHash = await sha256(privateId);
  const creatorIpHash = await sha256(getClientIp(request));

  // Create button data
  const button: ButtonV2 = {
    id: publicId,
    secretHash,
    url: body.url,
    restriction,
    creatorIpHash,
    count: 0,
    theme,
    size,
    createdAt: new Date().toISOString(),
  };

  // Store button in KV
  await env.NICE_KV.put(`btn:${publicId}`, JSON.stringify(button));

  // Store secret lookup index
  await env.NICE_KV.put(`secret:${secretHash}`, publicId);

  // Generate embed snippets
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(publicId, baseUrl, theme, size);

  // Return response with both IDs (private shown only once!)
  return Response.json(
    {
      public_id: publicId,
      private_id: privateId, // Only shown once!
      url: body.url,
      restriction,
      theme,
      size,
      count: 0,
      created_at: button.createdAt,
      embed,
    },
    { status: 201 }
  );
}

/**
 * GET /api/v1/buttons/stats/:private_id - Get button stats
 */
export async function getButtonStatsV2(
  request: Request,
  privateId: string,
  env: Env
): Promise<Response> {
  // Validate private ID format
  if (!isValidPrivateId(privateId)) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Hash the private ID to look up the public ID
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Get button data
  const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
  if (!buttonData) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const button: ButtonV2 = JSON.parse(buttonData);

  // Generate embed snippet for convenience
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(
    publicId,
    baseUrl,
    button.theme || "light",
    button.size || "md"
  );

  return Response.json({
    id: publicId,
    url: button.url,
    restriction: button.restriction,
    count: button.count,
    theme: button.theme,
    size: button.size,
    created_at: button.createdAt,
    embed,
  });
}

/**
 * PATCH /api/v1/buttons/:private_id - Update button settings
 */
export async function updateButtonV2(
  request: Request,
  privateId: string,
  env: Env
): Promise<Response> {
  // Validate private ID format
  if (!isValidPrivateId(privateId)) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Parse request body
  let body: {
    restriction?: string;
    theme?: string;
    size?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  // Hash the private ID to look up the public ID
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Get button data
  const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
  if (!buttonData) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const button: ButtonV2 = JSON.parse(buttonData);

  // Update allowed fields
  if (body.restriction !== undefined) {
    if (!VALID_RESTRICTIONS.includes(body.restriction as RestrictionMode)) {
      return Response.json(
        { error: "Invalid restriction mode", code: "INVALID_RESTRICTION" },
        { status: 400 }
      );
    }
    button.restriction = body.restriction as RestrictionMode;
  }

  if (body.theme !== undefined) {
    if (!VALID_THEMES.includes(body.theme)) {
      return Response.json(
        { error: "Invalid theme", code: "INVALID_THEME" },
        { status: 400 }
      );
    }
    button.theme = body.theme;
  }

  if (body.size !== undefined) {
    if (!VALID_SIZES.includes(body.size)) {
      return Response.json(
        { error: "Invalid size", code: "INVALID_SIZE" },
        { status: 400 }
      );
    }
    button.size = body.size;
  }

  // Save updated button
  await env.NICE_KV.put(`btn:${publicId}`, JSON.stringify(button));

  // Generate updated embed snippet
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(
    publicId,
    baseUrl,
    button.theme || "light",
    button.size || "md"
  );

  return Response.json({
    id: publicId,
    url: button.url,
    restriction: button.restriction,
    count: button.count,
    theme: button.theme,
    size: button.size,
    created_at: button.createdAt,
    embed,
  });
}

/**
 * DELETE /api/v1/buttons/:private_id - Delete a button
 */
export async function deleteButtonV2(
  request: Request,
  privateId: string,
  env: Env
): Promise<Response> {
  // Validate private ID format
  if (!isValidPrivateId(privateId)) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Hash the private ID to look up the public ID
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Delete button data
  await env.NICE_KV.delete(`btn:${publicId}`);

  // Delete secret lookup index
  await env.NICE_KV.delete(`secret:${secretHash}`);

  return Response.json({
    success: true,
    message: "Button deleted",
  });
}

/**
 * POST /api/v1/buttons/:private_id/nice - Record a nice (authenticated)
 * 
 * This endpoint allows the button owner to record nices via API.
 * No referrer check, no IP deduplication - full control for the owner.
 */
export async function recordNiceV2(
  request: Request,
  privateId: string,
  env: Env
): Promise<Response> {
  // Validate private ID format
  if (!isValidPrivateId(privateId)) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Hash the private ID to look up the public ID
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Get button data
  const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
  if (!buttonData) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const button: ButtonV2 = JSON.parse(buttonData);

  // Increment the canonical count key (single source of truth)
  const countKey = `count:${publicId}`;
  const currentCount = parseInt(await env.NICE_KV.get(countKey) || "0", 10) || 0;
  const newCount = currentCount + 1;
  await env.NICE_KV.put(countKey, newCount.toString());

  // Sync button object's cached count
  button.count = newCount;
  await env.NICE_KV.put(`btn:${publicId}`, JSON.stringify(button));

  return Response.json({
    success: true,
    count: newCount,
    public_id: publicId,
  });
}

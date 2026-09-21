/**
 * Button Routes - Public button creation, no registration required
 *
 * POST /api/v1/buttons - Create a new button
 * GET /api/v1/buttons/stats/:private_id - Get button stats
 * PATCH /api/v1/buttons/:private_id - Update button settings
 * DELETE /api/v1/buttons/:private_id - Delete a button
 * POST /api/v1/buttons/:private_id/nice - Record nice (owner)
 */

import type { Env, Button, RestrictionMode } from "../types";
import type {
  ButtonAnimation,
  ButtonColors,
  ButtonShape,
  CountFormat,
  CountPosition,
  CountVisibility,
} from "../lib/button-appearance";
import {
  EMBED_SIZES,
  EMBED_THEMES,
  getEmbedInitialDimensions,
  type EmbedSize,
  type EmbedTheme,
} from "./embed-constants";
import {
  generatePublicId,
  generatePrivateId,
  isValidPrivateId,
  isValidHttpUrl,
  sha256,
  checkCreateRateLimit,
  createRateLimitResponse,
  checkRateLimit,
  rateLimitResponse,
  DEFAULT_BUTTON_LABEL,
  DEFAULT_PRESSED_BUTTON_LABEL,
  normalizeStoredButtonLabel,
  validateButtonLabel,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_COUNT_VISIBILITY,
  DEFAULT_COUNT_POSITION,
  DEFAULT_COUNT_FORMAT,
  DEFAULT_BUTTON_ANIMATION,
  normalizeStoredButtonShape,
  normalizeStoredCountVisibility,
  normalizeStoredCountPosition,
  normalizeStoredCountFormat,
  normalizeStoredButtonAnimation,
  serializeButtonColors,
  validateButtonColors,
  validateButtonShape,
  validateCountVisibility,
  validateCountPosition,
  validateCountFormat,
  validateButtonAnimation,
} from "../lib";

const VALID_RESTRICTIONS: RestrictionMode[] = ["url", "domain", "global"];

type AppearanceBody = {
  colors?: unknown;
  shape?: unknown;
  count_visibility?: unknown;
  count_position?: unknown;
  count_format?: unknown;
  animation?: unknown;
};

type AppearanceValues = {
  colors?: ButtonColors | null;
  shape?: ButtonShape;
  countVisibility?: CountVisibility;
  countPosition?: CountPosition;
  countFormat?: CountFormat;
  animation?: ButtonAnimation;
};

function validateAppearance(
  body: AppearanceBody
): { ok: true; value: AppearanceValues } | { ok: false; response: Response } {
  if (body.colors !== undefined) {
    const result = validateButtonColors(body.colors);
    if (!result.ok) return result;
    return validateAppearanceEnums(body, { colors: result.value });
  }

  return validateAppearanceEnums(body, {});
}

function validateAppearanceEnums(
  body: AppearanceBody,
  values: AppearanceValues
): { ok: true; value: AppearanceValues } | { ok: false; response: Response } {
  if (body.shape !== undefined) {
    const result = validateButtonShape(body.shape);
    if (!result.ok) return result;
    values.shape = result.value;
  }
  if (body.count_visibility !== undefined) {
    const result = validateCountVisibility(body.count_visibility);
    if (!result.ok) return result;
    values.countVisibility = result.value;
  }
  if (body.count_position !== undefined) {
    const result = validateCountPosition(body.count_position);
    if (!result.ok) return result;
    values.countPosition = result.value;
  }
  if (body.count_format !== undefined) {
    const result = validateCountFormat(body.count_format);
    if (!result.ok) return result;
    values.countFormat = result.value;
  }
  if (body.animation !== undefined) {
    const result = validateButtonAnimation(body.animation);
    if (!result.ok) return result;
    values.animation = result.value;
  }
  return { ok: true, value: values };
}

function getButtonAppearance(button: Button) {
  return {
    colors: serializeButtonColors(button.colors),
    shape: normalizeStoredButtonShape(button.shape),
    count_visibility: normalizeStoredCountVisibility(button.countVisibility),
    count_position: normalizeStoredCountPosition(button.countPosition),
    count_format: normalizeStoredCountFormat(button.countFormat),
    animation: normalizeStoredButtonAnimation(button.animation),
  };
}

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
  size: string,
  label: string,
  pressedLabel: string,
  multiNice?: boolean
): { iframe: string; script: string } {
  const embedUrl = `${baseUrl}/e/${publicId}?theme=${theme}&size=${size}${multiNice ? '&multi=1' : ''}`;

  const embedSize = EMBED_SIZES.includes(size as EmbedSize) ? (size as EmbedSize) : "md";
  const dim = getEmbedInitialDimensions(embedSize, label, pressedLabel, multiNice === true);

  const iframe = `<iframe src="${embedUrl}" style="background:transparent;border:none;overflow:hidden;display:block;color-scheme:normal;width:${dim.w}px;height:${dim.h}px;" scrolling="no" frameborder="0" allowtransparency="true" title="Nice button"></iframe>`;
  const script = `<script src="${baseUrl}/embed.js" data-button="${publicId}" data-theme="${theme}" data-size="${size}"${multiNice ? ' data-multi="1"' : ''} async></script>`;

  return { iframe, script };
}

/**
 * POST /api/v1/buttons - Create a new button
 */
export async function createButton(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse request body
  let body: {
    url?: string;
    theme?: string;
    size?: string;
    restriction?: string;
    multi_nice?: boolean;
    label?: unknown;
    pressed_label?: unknown;
  } & AppearanceBody;

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
  if (!EMBED_THEMES.includes(theme as EmbedTheme)) {
    return Response.json(
      { error: "Invalid theme", code: "INVALID_THEME" },
      { status: 400 }
    );
  }

  const size = body.size || "md";
  if (!EMBED_SIZES.includes(size as EmbedSize)) {
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

  const labelResult = validateButtonLabel(
    body.label === undefined ? DEFAULT_BUTTON_LABEL : body.label,
    "label"
  );
  if (!labelResult.ok) {
    return labelResult.response;
  }

  const pressedLabelResult = validateButtonLabel(
    body.pressed_label === undefined
      ? DEFAULT_PRESSED_BUTTON_LABEL
      : body.pressed_label,
    "pressed_label"
  );
  if (!pressedLabelResult.ok) {
    return pressedLabelResult.response;
  }

  const appearanceResult = validateAppearance(body);
  if (!appearanceResult.ok) {
    return appearanceResult.response;
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
  const button: Button = {
    id: publicId,
    secretHash,
    url: body.url,
    restriction,
    creatorIpHash,
    count: 0,
    multiNice: body.multi_nice || false,
    theme,
    size,
    label: labelResult.value,
    pressedLabel: pressedLabelResult.value,
    ...(appearanceResult.value.colors
      ? { colors: appearanceResult.value.colors }
      : {}),
    shape: appearanceResult.value.shape ?? DEFAULT_BUTTON_SHAPE,
    countVisibility:
      appearanceResult.value.countVisibility ?? DEFAULT_COUNT_VISIBILITY,
    countPosition:
      appearanceResult.value.countPosition ?? DEFAULT_COUNT_POSITION,
    countFormat: appearanceResult.value.countFormat ?? DEFAULT_COUNT_FORMAT,
    animation: appearanceResult.value.animation ?? DEFAULT_BUTTON_ANIMATION,
    createdAt: new Date().toISOString(),
  };

  // Store button in KV
  await env.NICE_KV.put(`btn:${publicId}`, JSON.stringify(button));

  // Store secret lookup index
  await env.NICE_KV.put(`secret:${secretHash}`, publicId);

  // Generate embed snippets
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(
    publicId,
    baseUrl,
    theme,
    size,
    labelResult.value,
    pressedLabelResult.value,
    button.multiNice
  );

  // Return response with both IDs (private shown only once!)
  return Response.json(
    {
      public_id: publicId,
      private_id: privateId, // Only shown once!
      url: body.url,
      restriction,
      multi_nice: button.multiNice || false,
      theme,
      size,
      label: button.label,
      pressed_label: button.pressedLabel,
      ...getButtonAppearance(button),
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
export async function getButtonStats(
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

  const button: Button = JSON.parse(buttonData);

  const label = normalizeStoredButtonLabel(
    button.label,
    DEFAULT_BUTTON_LABEL
  );
  const pressedLabel = normalizeStoredButtonLabel(
    button.pressedLabel,
    DEFAULT_PRESSED_BUTTON_LABEL
  );

  // Generate embed snippet for convenience
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(
    publicId,
    baseUrl,
    button.theme || "light",
    button.size || "md",
    label,
    pressedLabel,
    button.multiNice
  );

  return Response.json({
    id: publicId,
    url: button.url,
    restriction: button.restriction,
    multi_nice: button.multiNice || false,
    count: button.count,
    theme: button.theme,
    size: button.size,
    label,
    pressed_label: pressedLabel,
    ...getButtonAppearance(button),
    created_at: button.createdAt,
    embed,
  });
}

/**
 * PATCH /api/v1/buttons/:private_id - Update button settings
 */
export async function updateButton(
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
    multi_nice?: boolean;
    label?: unknown;
    pressed_label?: unknown;
  } & AppearanceBody;

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

  const button: Button = JSON.parse(buttonData);

  const labelResult =
    body.label === undefined
      ? undefined
      : validateButtonLabel(body.label, "label");
  if (labelResult && !labelResult.ok) {
    return labelResult.response;
  }

  const pressedLabelResult =
    body.pressed_label === undefined
      ? undefined
      : validateButtonLabel(body.pressed_label, "pressed_label");
  if (pressedLabelResult && !pressedLabelResult.ok) {
    return pressedLabelResult.response;
  }

  const appearanceResult = validateAppearance(body);
  if (!appearanceResult.ok) {
    return appearanceResult.response;
  }

  let restriction: RestrictionMode | undefined;
  if (body.restriction !== undefined) {
    if (!VALID_RESTRICTIONS.includes(body.restriction as RestrictionMode)) {
      return Response.json(
        { error: "Invalid restriction mode", code: "INVALID_RESTRICTION" },
        { status: 400 }
      );
    }
    restriction = body.restriction as RestrictionMode;
  }

  let theme: string | undefined;
  if (body.theme !== undefined) {
    if (!EMBED_THEMES.includes(body.theme as EmbedTheme)) {
      return Response.json(
        { error: "Invalid theme", code: "INVALID_THEME" },
        { status: 400 }
      );
    }
    theme = body.theme;
  }

  let size: string | undefined;
  if (body.size !== undefined) {
    if (!EMBED_SIZES.includes(body.size as EmbedSize)) {
      return Response.json(
        { error: "Invalid size", code: "INVALID_SIZE" },
        { status: 400 }
      );
    }
    size = body.size;
  }

  // Update allowed fields
  if (restriction !== undefined) {
    button.restriction = restriction;
  }

  if (theme !== undefined) {
    button.theme = theme;
  }

  if (size !== undefined) {
    button.size = size;
  }

  if (body.multi_nice !== undefined) {
    button.multiNice = body.multi_nice;
  }

  if (labelResult) {
    button.label = labelResult.value;
  }

  if (pressedLabelResult) {
    button.pressedLabel = pressedLabelResult.value;
  }

  if (appearanceResult.value.colors !== undefined) {
    if (appearanceResult.value.colors === null) {
      delete button.colors;
    } else {
      button.colors = appearanceResult.value.colors;
    }
  }
  if (appearanceResult.value.shape !== undefined) {
    button.shape = appearanceResult.value.shape;
  }
  if (appearanceResult.value.countVisibility !== undefined) {
    button.countVisibility = appearanceResult.value.countVisibility;
  }
  if (appearanceResult.value.countPosition !== undefined) {
    button.countPosition = appearanceResult.value.countPosition;
  }
  if (appearanceResult.value.countFormat !== undefined) {
    button.countFormat = appearanceResult.value.countFormat;
  }
  if (appearanceResult.value.animation !== undefined) {
    button.animation = appearanceResult.value.animation;
  }

  // Save updated button
  await env.NICE_KV.put(`btn:${publicId}`, JSON.stringify(button));

  const label = normalizeStoredButtonLabel(
    button.label,
    DEFAULT_BUTTON_LABEL
  );
  const pressedLabel = normalizeStoredButtonLabel(
    button.pressedLabel,
    DEFAULT_PRESSED_BUTTON_LABEL
  );

  // Generate updated embed snippet
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embed = generateEmbedSnippets(
    publicId,
    baseUrl,
    button.theme || "light",
    button.size || "md",
    label,
    pressedLabel,
    button.multiNice
  );

  return Response.json({
    id: publicId,
    url: button.url,
    restriction: button.restriction,
    multi_nice: button.multiNice || false,
    count: button.count,
    theme: button.theme,
    size: button.size,
    label,
    pressed_label: pressedLabel,
    ...getButtonAppearance(button),
    created_at: button.createdAt,
    embed,
  });
}

/**
 * DELETE /api/v1/buttons/:private_id - Delete a button
 */
export async function deleteButton(
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
 * No referrer check, no IP deduplication - but rate limited to prevent abuse.
 */
export async function recordNiceOwner(
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

  // Rate limit by IP to prevent abuse even with valid private ID
  const ip = getClientIp(request);
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const rateLimitResult = await checkRateLimit(env.NICE_KV, ip, publicId);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult);
  }

  // Get button data
  const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
  if (!buttonData) {
    return Response.json(
      { error: "Button not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const button: Button = JSON.parse(buttonData);

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

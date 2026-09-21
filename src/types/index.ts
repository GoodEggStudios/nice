export * from "./env";

import type {
  ButtonAnimation,
  ButtonColors,
  ButtonShape,
  CountFormat,
  CountPosition,
  CountVisibility,
} from "../lib/button-appearance";

/**
 * Restriction mode for buttons
 * - url: Only allow nices from exact URL match
 * - domain: Allow nices from any page on same domain
 * - global: Allow nices from any site
 */
export type RestrictionMode = "url" | "domain" | "global";

/**
 * Button data stored in KV
 */
export interface Button {
  id: string; // Public ID: n_xxx
  secretHash: string; // SHA256 of private ID
  url: string; // Content URL
  restriction: RestrictionMode; // Referrer verification mode
  creatorIpHash: string; // SHA256 of creator IP (for rate limiting)
  count: number;
  multiNice?: boolean; // Allow multiple nices per visitor (clap-style)
  theme?: string; // Default theme
  size?: string; // Default size
  label?: string; // Visible idle button label
  pressedLabel?: string; // Visible single-nice pressed label
  colors?: ButtonColors; // Custom palette; absent means theme colours
  shape?: ButtonShape;
  countVisibility?: CountVisibility;
  countPosition?: CountPosition;
  countFormat?: CountFormat;
  animation?: ButtonAnimation;
  createdAt: string;
}

/**
 * Nice event for deduplication (stored with TTL)
 */
export interface NiceEvent {
  buttonId: string;
  visitorHash: string;
  createdAt: string;
}

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * API response for nice action
 */
export interface NiceResponse {
  count: number;
  niced: boolean;
}

/**
 * API error response
 */
export interface ErrorResponse {
  error: string;
  code: string;
}

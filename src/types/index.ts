export * from "./env";

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
export interface ButtonV2 {
  id: string; // Public ID: n_xxx
  secretHash: string; // SHA256 of private ID
  url: string; // Content URL
  restriction: RestrictionMode; // Referrer verification mode
  creatorIpHash: string; // SHA256 of creator IP (for rate limiting)
  count: number;
  theme?: string; // Default theme
  size?: string; // Default size
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

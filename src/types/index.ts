export * from "./env";

/**
 * Site registration data stored in KV
 */
export interface Site {
  id: string;
  domain: string;
  tokenHash: string;
  verified: boolean;
  verificationToken?: string;
  createdAt: string;
}

/**
 * Button data stored in KV
 */
export interface Button {
  id: string;
  siteId: string;
  name: string;
  url: string;
  count: number;
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

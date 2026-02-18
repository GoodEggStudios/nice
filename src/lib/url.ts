/**
 * URL normalization utilities
 *
 * Used for referrer verification - comparing stored URL against request referrer
 */

/**
 * Normalize a URL for comparison
 *
 * - Strips query parameters
 * - Strips fragments
 * - Strips trailing slash (except for root)
 * - Lowercases hostname
 * - Preserves path case (paths are case-sensitive on most servers)
 *
 * @param url - The URL to normalize
 * @returns Normalized URL string, or null if invalid
 */
export function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Lowercase the hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Clear query and hash
    parsed.search = "";
    parsed.hash = "";

    // Get the URL string
    let normalized = parsed.toString();

    // Strip trailing slash (but keep root path /)
    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return null;
  }
}

/**
 * Extract domain from a URL (lowercase)
 *
 * @param url - The URL to extract domain from
 * @returns Domain string (lowercase), or null if invalid
 */
export function extractUrlDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if a URL is valid HTTP/HTTPS
 *
 * @param url - The URL to validate
 * @returns true if valid HTTP(S) URL
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Compare two URLs after normalization
 *
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if URLs match after normalization
 */
export function urlsMatch(url1: string, url2: string): boolean {
  const norm1 = normalizeUrl(url1);
  const norm2 = normalizeUrl(url2);

  if (!norm1 || !norm2) return false;
  return norm1 === norm2;
}

/**
 * Compare domains of two URLs
 *
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if domains match
 */
export function domainsMatch(url1: string, url2: string): boolean {
  const domain1 = extractUrlDomain(url1);
  const domain2 = extractUrlDomain(url2);

  if (!domain1 || !domain2) return false;
  return domain1 === domain2;
}

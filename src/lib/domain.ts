/**
 * Domain validation utilities
 *
 * Used for:
 * - Validating domain format during site registration
 * - Checking URL domains match verified site domains
 * - Normalizing domains for comparison
 */

/**
 * Regular expression for valid domain names
 * - Allows subdomains (e.g., blog.example.com)
 * - Requires at least one dot
 * - No protocol, path, or port
 */
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

/**
 * Validates that a string is a valid domain name
 *
 * @param domain - The domain to validate
 * @returns true if the domain is valid
 *
 * @example
 * isValidDomain("example.com") // true
 * isValidDomain("blog.example.com") // true
 * isValidDomain("https://example.com") // false (has protocol)
 * isValidDomain("example") // false (no TLD)
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") {
    return false;
  }

  // Check length limits
  if (domain.length > 253) {
    return false;
  }

  // Check each label length (max 63 chars)
  const labels = domain.split(".");
  if (labels.some((label) => label.length > 63 || label.length === 0)) {
    return false;
  }

  return DOMAIN_REGEX.test(domain);
}

/**
 * Normalizes a domain for consistent comparison
 *
 * - Converts to lowercase
 * - Removes trailing dots
 * - Removes www. prefix
 *
 * @param domain - The domain to normalize
 * @returns Normalized domain string
 *
 * @example
 * normalizeDomain("WWW.Example.COM") // "example.com"
 * normalizeDomain("example.com.") // "example.com"
 */
export function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();

  // Remove trailing dot (FQDN notation)
  if (normalized.endsWith(".")) {
    normalized = normalized.slice(0, -1);
  }

  // Remove www. prefix
  if (normalized.startsWith("www.")) {
    normalized = normalized.slice(4);
  }

  return normalized;
}

/**
 * Extracts the domain from a URL
 *
 * @param url - The URL to extract domain from
 * @returns The domain, or null if invalid URL
 *
 * @example
 * extractDomain("https://blog.example.com/path") // "blog.example.com"
 * extractDomain("not a url") // null
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL's domain matches (or is a subdomain of) a verified domain
 *
 * @param url - The URL to check
 * @param verifiedDomain - The verified domain to match against
 * @returns true if the URL domain matches or is a subdomain
 *
 * @example
 * urlMatchesDomain("https://example.com/page", "example.com") // true
 * urlMatchesDomain("https://blog.example.com/page", "example.com") // true
 * urlMatchesDomain("https://evil.com/page", "example.com") // false
 */
export function urlMatchesDomain(url: string, verifiedDomain: string): boolean {
  const urlDomain = extractDomain(url);
  if (!urlDomain) {
    return false;
  }

  const normalizedUrl = normalizeDomain(urlDomain);
  const normalizedVerified = normalizeDomain(verifiedDomain);

  // Exact match
  if (normalizedUrl === normalizedVerified) {
    return true;
  }

  // Subdomain match (url domain ends with .verifiedDomain)
  if (normalizedUrl.endsWith(`.${normalizedVerified}`)) {
    return true;
  }

  return false;
}

/**
 * Generates a DNS TXT record name for domain verification
 *
 * @param domain - The domain being verified
 * @returns The full TXT record name
 *
 * @example
 * getVerificationRecordName("example.com") // "_nice-verify.example.com"
 */
export function getVerificationRecordName(domain: string): string {
  return `_nice-verify.${normalizeDomain(domain)}`;
}

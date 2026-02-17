/**
 * Site Registration API
 *
 * Endpoints:
 * - POST /api/v1/sites - Register a new site
 * - POST /api/v1/sites/:site_id/verify - Verify domain ownership via DNS
 * - POST /api/v1/sites/:site_id/token/regenerate - Regenerate API token
 */

import type { Env, Site } from "../types";
import {
  generateToken,
  generateSiteId,
  hashToken,
  isValidDomain,
  normalizeDomain,
  getVerificationRecordName,
} from "../lib";

// KV key prefixes
const SITE_PREFIX = "site:";
const DOMAIN_PREFIX = "domain:";
const TOKEN_PREFIX = "token:";

interface RegisterSiteRequest {
  domain: string;
}

interface RegisterSiteResponse {
  site: {
    id: string;
    domain: string;
    verified: boolean;
    createdAt: string;
  };
  token: string;
  verification: {
    type: "dns_txt";
    record: string;
    value: string;
    instructions: string;
  };
}

interface VerifySiteResponse {
  verified: boolean;
  message: string;
}

interface RegenerateTokenResponse {
  token: string;
  message: string;
}

/**
 * POST /api/v1/sites - Register a new site
 */
export async function registerSite(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as RegisterSiteRequest;

    // Validate domain
    if (!body.domain) {
      return jsonError("Missing required field: domain", "MISSING_DOMAIN", 400);
    }

    const normalizedDomain = normalizeDomain(body.domain);

    if (!isValidDomain(normalizedDomain)) {
      return jsonError("Invalid domain format", "INVALID_DOMAIN", 400);
    }

    // Check if domain is already registered
    const existingDomain = await env.NICE_KV.get(`${DOMAIN_PREFIX}${normalizedDomain}`);
    if (existingDomain) {
      return jsonError("Domain already registered", "DOMAIN_EXISTS", 409);
    }

    // Generate IDs and tokens
    const siteId = generateSiteId();
    const apiToken = generateToken();
    const tokenHash = await hashToken(apiToken);
    const verificationToken = generateVerificationToken();

    // Create site record
    const site: Site = {
      id: siteId,
      domain: normalizedDomain,
      tokenHash,
      verified: false,
      verificationToken,
      createdAt: new Date().toISOString(),
    };

    // Store site by ID
    await env.NICE_KV.put(`${SITE_PREFIX}${siteId}`, JSON.stringify(site));

    // Store domain -> site_id mapping for uniqueness check
    await env.NICE_KV.put(`${DOMAIN_PREFIX}${normalizedDomain}`, siteId);

    // Store token_hash -> site_id mapping for auth lookup
    await env.NICE_KV.put(`${TOKEN_PREFIX}${tokenHash}`, siteId);

    const recordName = getVerificationRecordName(normalizedDomain);

    const response: RegisterSiteResponse = {
      site: {
        id: siteId,
        domain: normalizedDomain,
        verified: false,
        createdAt: site.createdAt,
      },
      token: apiToken,
      verification: {
        type: "dns_txt",
        record: recordName,
        value: verificationToken,
        instructions: `Add a TXT record to your DNS:\n\nName: ${recordName}\nValue: ${verificationToken}\n\nThen call POST /api/v1/sites/${siteId}/verify`,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return jsonError("Invalid JSON body", "INVALID_JSON", 400);
    }
    console.error("registerSite error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * POST /api/v1/sites/:site_id/verify - Verify domain via DNS TXT record
 */
export async function verifySite(
  request: Request,
  env: Env,
  siteId: string
): Promise<Response> {
  try {
    // Get site record
    const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${siteId}`);
    if (!siteData) {
      return jsonError("Site not found", "SITE_NOT_FOUND", 404);
    }

    const site: Site = JSON.parse(siteData);

    // Already verified?
    if (site.verified) {
      return new Response(
        JSON.stringify({ verified: true, message: "Site already verified" } as VerifySiteResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Lookup DNS TXT record
    const recordName = getVerificationRecordName(site.domain);
    const verified = await checkDnsTxtRecord(recordName, site.verificationToken!);

    if (!verified) {
      return new Response(
        JSON.stringify({
          verified: false,
          message: `TXT record not found. Add: ${recordName} = ${site.verificationToken}`,
        } as VerifySiteResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update site as verified
    site.verified = true;
    delete site.verificationToken;
    await env.NICE_KV.put(`${SITE_PREFIX}${siteId}`, JSON.stringify(site));

    return new Response(
      JSON.stringify({ verified: true, message: "Domain verified successfully!" } as VerifySiteResponse),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verifySite error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * POST /api/v1/sites/:site_id/token/regenerate - Regenerate API token
 * Requires authentication with current token
 */
export async function regenerateToken(
  request: Request,
  env: Env,
  siteId: string,
  authenticatedSiteId: string
): Promise<Response> {
  try {
    // Must be authenticated as the site owner
    if (siteId !== authenticatedSiteId) {
      return jsonError("Forbidden", "FORBIDDEN", 403);
    }

    // Get site record
    const siteData = await env.NICE_KV.get(`${SITE_PREFIX}${siteId}`);
    if (!siteData) {
      return jsonError("Site not found", "SITE_NOT_FOUND", 404);
    }

    const site: Site = JSON.parse(siteData);

    // Delete old token mapping
    await env.NICE_KV.delete(`${TOKEN_PREFIX}${site.tokenHash}`);

    // Generate new token
    const newToken = generateToken();
    const newTokenHash = await hashToken(newToken);

    // Update site with new token hash
    site.tokenHash = newTokenHash;
    await env.NICE_KV.put(`${SITE_PREFIX}${siteId}`, JSON.stringify(site));

    // Store new token -> site mapping
    await env.NICE_KV.put(`${TOKEN_PREFIX}${newTokenHash}`, siteId);

    const response: RegenerateTokenResponse = {
      token: newToken,
      message: "Token regenerated. Your old token is now invalid.",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerateToken error:", e);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

// Helper functions

function generateVerificationToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `nice-verify-${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function checkDnsTxtRecord(recordName: string, expectedValue: string): Promise<boolean> {
  try {
    // Use Cloudflare's DNS-over-HTTPS API
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(recordName)}&type=TXT`,
      {
        headers: { Accept: "application/dns-json" },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { Answer?: Array<{ data: string }> };

    if (!data.Answer) {
      return false;
    }

    // Check if any TXT record matches (DNS records may be quoted)
    return data.Answer.some((record) => {
      const value = record.data.replace(/^"|"$/g, ""); // Remove surrounding quotes
      return value === expectedValue;
    });
  } catch (e) {
    console.error("DNS lookup error:", e);
    return false;
  }
}

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

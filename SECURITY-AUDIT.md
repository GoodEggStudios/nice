# Security Audit Report - Nice Button Service

**Audit Date:** 2026-02-18  
**Auditor:** OpenClaw Security Subagent  
**Codebase Version:** Current (as of audit date)  
**Scope:** Full security review of Nice button service

---

## Executive Summary

The Nice button service is generally well-designed with security considerations evident in the codebase. Token hashing, input validation, and rate limiting are implemented. However, several vulnerabilities were identified ranging from Low to High severity.

**Critical Issues:** 0  
**High Issues:** 2  
**Medium Issues:** 4  
**Low Issues:** 6

---

## Vulnerabilities

### HIGH-1: Referrer Header Spoofing Bypass

**Severity:** High  
**Location:** `src/routes/nice.ts` - `checkReferrer()` function  
**CVSS Estimate:** 7.5 (High)

**Description:**  
The referrer verification for v2 buttons (`url` and `domain` restriction modes) relies entirely on the `Referer` HTTP header:

```typescript
const referrer = request.headers.get("Referer");
if (!referrer) {
  return { allowed: false, error: "Referer header required" };
}
```

The `Referer` header can be trivially spoofed by any attacker making direct API calls (not through a browser). An attacker can set any referrer value when calling `/api/v1/nice/:button_id`, completely bypassing the restriction.

**Impact:**  
- Attackers can inflate nice counts from unauthorized sources
- The `url` and `domain` restriction modes provide no actual security
- Vote manipulation from arbitrary origins

**Proof of Concept:**
```bash
# Bypass domain restriction by spoofing Referer
curl -X POST "https://api.nice.sbs/api/v1/nice/n_abc12345" \
  -H "Content-Type: application/json" \
  -H "Referer: https://victim-site.com/page" \
  -d '{}'
```

**Recommendation:**  
1. Document that referrer verification is a soft restriction, not a security control
2. Consider implementing cryptographic verification (e.g., HMAC signatures generated server-side)
3. Add an optional "secret embed key" that must be included in requests from legitimate embeds
4. Implement browser-side origin checking using postMessage validation

---

### HIGH-2: Public ID Entropy Insufficient for Security

**Severity:** High  
**Location:** `src/lib/ids.ts` - `generatePublicId()`  
**CVSS Estimate:** 6.5 (Medium-High)

**Description:**  
V2 public button IDs use only 8 base62 characters:

```typescript
export function generatePublicId(): string {
  return `n_${randomBase62(8)}`;
}
```

This provides approximately 47.6 bits of entropy (62^8 ≈ 2.18 × 10^14 possibilities). While not trivially enumerable, a distributed attack could discover valid button IDs:

- At 1000 requests/second: ~6.9 years to enumerate 50% of space
- At 100,000 requests/second (botnet): ~25 days to enumerate 50%

**Impact:**  
- Attackers can discover valid button IDs to inflate counts
- Privacy leak: can determine which URLs have Nice buttons
- Potential for targeted manipulation of specific buttons

**Note:** The `/api/v1/nice/:button_id/count` endpoint mitigates this by returning `count: 0` for non-existent buttons. However, the embed page `/e/:id` reveals button existence through different rendering.

**Recommendation:**  
1. Increase public ID length to at least 12 characters (71+ bits of entropy)
2. Implement proof-of-work for count queries on suspected enumeration
3. Add honeypot IDs that trigger alerts when accessed
4. Rate limit by IP more aggressively for unknown button IDs

---

### MEDIUM-1: Rate Limit Race Condition

**Severity:** Medium  
**Location:** `src/lib/ratelimit.ts` - `incrementCounter()`  
**CVSS Estimate:** 5.3 (Medium)

**Description:**  
KV storage does not support atomic increments. The current implementation:

```typescript
async function incrementCounter(kv, key, ttlSeconds) {
  const current = await kv.get(key, { cacheTtl: 60 });
  const count = (parseInt(current || "0", 10) || 0) + 1;
  await kv.put(key, count.toString(), { expirationTtl: ttlSeconds });
  return count;
}
```

Multiple concurrent requests can read the same value before any write completes, allowing attackers to bypass rate limits by sending requests in parallel.

**Impact:**  
- Rate limits can be bypassed by concurrent requests
- Button creation limits (10/hr, 50/day) can be exceeded
- Nice recording limits can be exceeded

**Proof of Concept:**
```bash
# Send 50 concurrent requests - many will slip through
for i in {1..50}; do
  curl -X POST "https://api.nice.sbs/api/v2/buttons" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com/page'$i'"}' &
done
wait
```

**Recommendation:**  
1. Consider using Cloudflare Durable Objects for atomic counters
2. Implement a leaky bucket algorithm with pessimistic counting
3. Add a random jitter (100-500ms) before processing to reduce collision likelihood
4. Use shorter cache TTL (0) for rate limit reads

---

### MEDIUM-2: X-Forwarded-For IP Spoofing

**Severity:** Medium  
**Location:** `src/routes/nice.ts` - IP extraction fallback  
**CVSS Estimate:** 5.0 (Medium)

**Description:**  
The code falls back to `X-Forwarded-For` if `CF-Connecting-IP` is not present:

```typescript
let ip = request.headers.get("CF-Connecting-IP");
if (!ip) {
  const xff = request.headers.get("X-Forwarded-For");
  if (xff) {
    ip = xff.split(",")[0].trim();
    console.warn(`Using X-Forwarded-For (spoofable)...`);
```

If Cloudflare is bypassed (direct origin access, misconfiguration, or non-CF deployment), attackers can spoof IPs to bypass rate limits and visitor deduplication.

**Impact:**  
- Rate limit bypass through IP spoofing
- Vote manipulation by appearing as multiple visitors
- Visitor deduplication circumvention

**Recommendation:**  
1. Only accept `CF-Connecting-IP` when running behind Cloudflare
2. Verify requests come from Cloudflare IPs before trusting headers
3. If allowing non-CF deployment, require explicit configuration
4. Remove `X-Forwarded-For` fallback or make it opt-in

---

### MEDIUM-3: No URL Length Validation

**Severity:** Medium  
**Location:** `src/routes/buttons-v2.ts` - `createButtonV2()`  
**CVSS Estimate:** 4.3 (Medium)

**Description:**  
The URL field in button creation has no maximum length check:

```typescript
if (!isValidHttpUrl(body.url)) {
  return Response.json({ error: "Invalid URL format", ... });
}
```

An attacker could submit extremely long URLs (e.g., 1MB) to:
- Consume KV storage space
- Cause performance issues
- Potentially trigger KV limits

**Impact:**  
- Storage exhaustion attack
- Increased KV costs
- Potential denial of service

**Recommendation:**  
1. Add URL length limit (e.g., 2048 characters - browser limit)
2. Add total payload size validation
3. Consider validating URL doesn't contain unusual characters

```typescript
const MAX_URL_LENGTH = 2048;
if (body.url.length > MAX_URL_LENGTH) {
  return Response.json({ error: "URL too long", code: "URL_TOO_LONG" }, { status: 400 });
}
```

---

### MEDIUM-4: Button Existence Leak via Embed Page

**Severity:** Medium  
**Location:** `src/routes/embed.ts` - `serveEmbedPage()`  
**CVSS Estimate:** 4.0 (Medium)

**Description:**  
While the count API returns 0 for non-existent buttons (good), the embed page behavior differs:

1. Valid button: Returns full interactive HTML with API_BASE, BUTTON_ID, etc.
2. Invalid button ID format: Returns "Invalid button ID" (400)
3. Valid format but non-existent: Still renders page, but button shows as "disabled"

The disabled state reveals that the button ID format is valid but doesn't exist, aiding enumeration.

**Impact:**  
- Enables button ID enumeration
- Reveals which ID formats are valid

**Recommendation:**  
1. Return identical HTML for non-existent buttons (just show static button)
2. Delay response for invalid IDs to match valid ID timing
3. Consider caching embed HTML regardless of button existence

---

### LOW-1: Timing Attack on Secret Validation

**Severity:** Low  
**Location:** `src/routes/buttons-v2.ts` - `getButtonStatsV2()`, `deleteButtonV2()`  
**CVSS Estimate:** 3.1 (Low)

**Description:**  
Private ID validation performs a KV lookup:

```typescript
const secretHash = await sha256(privateId);
const publicId = await env.NICE_KV.get(`secret:${secretHash}`);
if (!publicId) {
  return Response.json({ error: "Button not found", ... });
}
```

While SHA-256 is constant-time, KV lookup timing may vary based on key existence. An attacker could theoretically measure response times to determine if a hash prefix exists.

**Impact:**  
- Theoretical timing side-channel
- Extremely difficult to exploit in practice over network

**Recommendation:**  
1. Add constant-time delay before responding to errors
2. Use constant-time comparison if implementing local caching

---

### LOW-2: Client Fingerprint Ignored in Visitor Hash

**Severity:** Low  
**Location:** `src/lib/hash.ts` - `computeVisitorHash()`  
**CVSS Estimate:** 2.0 (Low)

**Description:**  
The visitor hash computation includes a `fingerprint` parameter:

```typescript
const input = `${ip}|${fingerprint}|${buttonId}|${dailySalt}`;
```

However, in `nice.ts`, the fingerprint is always passed as empty string:

```typescript
const visitorHash = await computeVisitorHash(ip, "", buttonId, dailySalt);
```

This means deduplication relies solely on IP + button + daily salt, ignoring client-provided fingerprints.

**Impact:**  
- Fingerprint parameter is dead code
- No additional visitor differentiation beyond IP

**Recommendation:**  
1. Either implement fingerprint extraction or remove the parameter
2. If implementing, be aware fingerprints are spoofable

---

### LOW-3: Registration Rate Limit Hash Truncation

**Severity:** Low  
**Location:** `src/routes/sites.ts` - `hashIp()`  
**CVSS Estimate:** 2.0 (Low)

**Description:**  
IP hashing for registration rate limiting truncates to 8 bytes:

```typescript
return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
```

This provides 64 bits of collision resistance. While sufficient for most purposes, it's weaker than using the full hash.

**Impact:**  
- Theoretical IP hash collision (1 in 2^64)
- Negligible practical risk

**Recommendation:**  
1. Use full SHA-256 hash (32 bytes) for consistency
2. Or document the truncation as intentional

---

### LOW-4: CORS Allows Any Origin for Public Endpoints

**Severity:** Low  
**Location:** `src/index.ts` - `PUBLIC_CORS_HEADERS`  
**CVSS Estimate:** 2.0 (Low)

**Description:**  
```typescript
const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
```

This is intentional for embeddability but allows any website to make requests.

**Impact:**  
- By design, but enables cross-origin attacks if combined with other vulnerabilities

**Recommendation:**  
1. Document this is intentional
2. Ensure no sensitive data is exposed via public endpoints

---

### LOW-5: Console Warnings in Production

**Severity:** Low (Informational)  
**Location:** `src/routes/nice.ts`  
**CVSS Estimate:** 1.0 (Informational)

**Description:**  
```typescript
console.warn(`Using X-Forwarded-For (spoofable) for IP: ${ip.substring(0, 8)}...`);
```

Logging partial IP addresses could be a privacy concern and adds noise to logs.

**Impact:**  
- Log noise
- Partial IP disclosure in logs

**Recommendation:**  
1. Use structured logging
2. Don't log IP addresses even partially

---

### LOW-6: Subdomain Takeover Risk in Domain Matching

**Severity:** Low  
**Location:** `src/lib/domain.ts` - `urlMatchesDomain()`  
**CVSS Estimate:** 3.0 (Low)

**Description:**  
```typescript
if (normalizedUrl.endsWith(`.${normalizedVerified}`)) {
  return true;
}
```

If an attacker performs subdomain takeover on a cloud service subdomain (e.g., `blog.example.com` pointing to unclaimed GitHub Pages), they could create buttons for that domain.

**Impact:**  
- Requires subdomain takeover first
- Can create unauthorized buttons for the parent domain

**Recommendation:**  
1. Document subdomain trust implications
2. Consider optional strict mode (exact domain match only)

---

## Positive Security Observations

✅ **Token hashing:** API tokens are SHA-256 hashed before storage  
✅ **Input validation:** Zod-style validation with proper error handling  
✅ **XSS protection:** Button IDs are validated and sanitized before HTML injection  
✅ **Enumeration mitigation:** Count endpoint returns 0 for non-existent buttons  
✅ **Rate limiting:** Multi-level rate limiting with PoW escalation  
✅ **Daily salt rotation:** Visitor hashes rotate daily for privacy  
✅ **Proper error responses:** Generic errors don't leak internal state  
✅ **DNS verification:** Secure domain ownership verification via TXT records  
✅ **IDOR protection:** V1 buttons check site ownership before access  

---

## Recommendations Summary

| Priority | Action |
|----------|--------|
| **Immediate** | Document referrer check limitations; add URL length limit |
| **Short-term** | Increase public ID entropy to 12+ characters |
| **Medium-term** | Implement Durable Objects for atomic counters |
| **Long-term** | Consider signed embed tokens for stronger verification |

---

## Appendix: KV Key Structure Review

| Prefix | Purpose | Collision Risk |
|--------|---------|----------------|
| `btn:` | V2 buttons | None |
| `button:` | V1 buttons | None |
| `secret:` | Secret hash → public ID | None |
| `site:` | Site records | None |
| `domain:` | Domain → site mapping | None |
| `token:` | Token hash → site | None |
| `count:` | Button counts | None |
| `nice:` | Dedup records | None |
| `rate:ip:` | IP rate limits | None |
| `rate:button:` | Button rate limits | None |
| `rate:create:` | Creation rate limits | None |
| `pow:` | PoW state | None |
| `abuse:` | Abuse logs | None |
| `config:` | System config | None |

All key prefixes are properly namespaced. No collision risk identified.

---

*End of Security Audit Report*

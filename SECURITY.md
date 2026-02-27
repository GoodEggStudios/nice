# Security Documentation

This document describes the security measures implemented in the Nice button service.

## Overview

Nice is designed with defense-in-depth, implementing multiple layers of protection against common attack vectors including vote manipulation, spam, enumeration attacks, and cross-site scripting.

## Authentication & Authorization

### Button Management

Buttons are managed via private IDs (`ns_` prefix, 20 base62 characters):

- **Private ID**: Shown once at creation, acts as the bearer secret
- **Storage**: Private IDs are hashed with SHA-256 before storage in KV
- **Lookup**: Secret hash → Public ID mapping enables O(1) validation
- **Scope**: Each private ID is scoped to a single button

No accounts, tokens, or registration required. The private ID is the sole credential.

## Anti-Spam & Rate Limiting

### Per-IP Rate Limiting

- **Limit**: 20 nice requests per minute per IP
- **Implementation**: Sliding window counter in KV with 60s TTL
- **Header**: Uses `CF-Connecting-IP` (set by Cloudflare, not spoofable)

### Per-Button Rate Limiting

- **Limit**: 100 nice requests per minute per button
- **Purpose**: Prevents coordinated attacks on specific buttons

### Proof-of-Work Escalation

When a button receives high traffic (>500/min), PoW mode activates:

1. Clients receive a challenge with difficulty level
2. Must solve SHA-256 puzzle (find nonce where hash has N leading zeros)
3. Difficulty scales with attack intensity (16-20 bits)
4. PoW mode exits after 5 minutes of low traffic

### Visitor Deduplication

Prevents the same visitor from voting multiple times per day:

- **Hash**: `SHA256(IP + fingerprint + buttonId + dailySalt)`
- **Storage**: Dedup key stored in KV with 24h TTL
- **Daily Rotation**: Salt rotates at midnight UTC

## Input Validation

### Button ID Validation

Button IDs are validated before use in HTML:

```
Format: ^n_[A-Za-z0-9]{8,12}$
```

- Prevents HTML/JS injection via malformed IDs
- Returns 400 for invalid formats
- Additional HTML encoding as defense-in-depth

### Theme & Size Parameters

Embed parameters are validated against allowlists:

- **Themes**: `light`, `dark`, `minimal`, `mono-dark`, `mono-light`
- **Sizes**: `xs`, `sm`, `md`, `lg`, `xl`
- Invalid values fall back to defaults (no errors exposed)

## CORS Policy

All endpoints use permissive CORS:

```
Access-Control-Allow-Origin: *
```

This is intentional — Nice buttons must be embeddable on any website. Security is enforced via rate limiting, deduplication, and referrer restrictions rather than CORS.

## Information Disclosure Prevention

### Button Enumeration

The count endpoint returns consistent responses regardless of button existence:

```json
// Non-existent button
GET /api/v1/nice/n_invalid/count → 200 {"count": 0}

// Valid button
GET /api/v1/nice/n_valid/count → 200 {"count": 42}
```

Attackers cannot enumerate valid button IDs.

### Error Messages

Error responses use generic codes without leaking internal state:

- `NOT_FOUND` - Resource not found
- `REFERRER_DENIED` - Nice not allowed from this referrer
- `IP_LIMIT` / `BUTTON_LIMIT` - Rate limit exceeded

## URL/Domain Restrictions

Buttons support `url`, `domain`, and `global` restriction modes to limit where a button can be "niced" from. These rely on the `Referer` header sent from the embed iframe.

**Limitations:**
- Restrictions apply to embed context only — direct API calls can forge the referrer
- Parent pages with `Referrer-Policy: no-referrer` will fail restriction checks
- This is a best-effort feature, not a security boundary

**Mitigation**: If strict restriction enforcement is critical, use the private ID endpoint (`POST /api/v1/buttons/:private_id/nice`) which bypasses referrer checks but requires knowledge of the secret private ID.

## Cryptographic Practices

### Daily Salt Generation

Salts are derived deterministically to prevent race conditions:

```
dailySalt = SHA256(masterSecret + ":daily_salt:" + YYYY-MM-DD)
```

- Master secret generated once and stored in KV
- All edge locations derive the same salt for a given date
- Prevents duplicate votes during salt rotation at midnight

## Infrastructure Security

### Cloudflare Protection

- All traffic routed through Cloudflare (CF-Connecting-IP required)
- DDoS protection at the edge
- Bot management and WAF available

### KV Storage

- Data stored in Cloudflare KV (encrypted at rest)
- Edge caching with short TTL (60s) for count data
- No-cache headers on dynamic responses

## Known Limitations

### Race Conditions

KV storage does not support atomic increments. Under high concurrency:

- Vote counts may under-count slightly
- Rate limit counters may allow slight overages

**Mitigation**: Retry logic reduces impact. For high-traffic buttons, consider Durable Objects.

### Client-Side Deduplication

The embed uses localStorage to track if a user has "niced":

```javascript
localStorage.getItem('nice:' + buttonId)
```

This is bypassable (incognito mode, clearing storage). Server-side deduplication via IP hash is the authoritative protection.

## Security Headers

All responses include appropriate headers:

```
Content-Type: application/json (or text/html for embeds)
Cache-Control: no-store (for dynamic data)
X-Frame-Options: ALLOWALL (embeds only)
Content-Security-Policy: frame-ancestors * (embeds only)
```

## Incident Response

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Allow reasonable time for a fix before disclosure

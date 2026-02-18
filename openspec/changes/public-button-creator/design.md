## Context

Nice currently requires site registration with DNS verification before creating buttons. This works for site owners but excludes content creators on third-party platforms (Medium, Substack, dev.to, etc.).

**Current flow:** Register site → Add DNS TXT → Verify → Get token → Create buttons via API

**New flow:** Paste URL → Get embed snippet (with public + private IDs)

**Constraints:**
- Must work with existing Cloudflare Workers + KV architecture
- Must coexist with v1 API for existing integrations (PTV)
- Rate limiting via KV (no Durable Objects for MVP)

## Goals / Non-Goals

**Goals:**
- Zero-friction button creation (no signup, no DNS)
- Public ID for embedding, private ID for management
- API-driven (form uses same endpoint as programmatic access)
- Stats page accessible via private ID
- Path to future account claiming

**Non-Goals:**
- User accounts (deferred)
- Real-time analytics/dashboards (deferred)
- Custom domains for embeds (deferred)
- Migrating existing v1 buttons to v2 (keep both)

## Decisions

### 1. ID Format

**Decision:** Random IDs, not derived from URL/IP

```
public_id:  n_<8 chars base62>     → n_x7Kf9mQ2
private_id: ns_<20 chars base62>   → ns_4vK9mPq8wL2nRt5xYz7bC
```

**Rationale:** 
- Derived IDs (hash of URL+IP) create issues with shared IPs (NAT, VPN)
- Random IDs are collision-proof
- Short public ID for clean embed URLs
- Long private ID for security (brute-force resistant)

**Alternatives considered:**
- UUID: Too long for URLs
- Sequential: Enumerable, security risk
- Hash-based: Collision risk with shared IPs

### 2. Storage Schema

**Decision:** Single KV namespace with prefixed keys

```
# Button data (by public ID)
btn:n_x7Kf9mQ2 → {
  id: "n_x7Kf9mQ2",
  secret_hash: "sha256(...)",      // hashed private ID
  url: "https://dev.to/alice/...", // original URL
  creator_ip_hash: "sha256(...)",  // for rate limiting
  count: 42,
  created_at: "2026-02-18T09:00:00Z"
}

# Lookup by private ID hash (for stats page)
secret:sha256(ns_xxx) → "n_x7Kf9mQ2"

# Rate limiting
ratelimit:ip:<ip_hash>:create → { count: 5, window_start: ... }
```

**Rationale:**
- Single namespace simplifies deployment
- Prefix-based keys for different data types
- Private ID never stored plain, only hash
- Separate lookup key for private ID → public ID resolution

### 3. API Design

**Decision:** New v2 endpoint, keep v1 for backwards compatibility

```
# New (unauthenticated, rate-limited)
POST /api/v2/buttons
Body: { url: "https://...", theme?: "dark", size?: "md" }
Response: { 
  public_id: "n_xxx", 
  private_id: "ns_xxx",  // shown once!
  embed: { iframe: "...", script: "..." }
}

# Stats (private ID in path)
GET /api/v2/buttons/stats/:private_id
Response: { id, url, count, created_at }

# Delete
DELETE /api/v2/buttons/:private_id

# Existing v1 endpoints remain unchanged
```

**Rationale:**
- v2 prefix signals new approach
- Private ID as auth (no Bearer token needed)
- Keep v1 for PTV and existing integrations

### 4. Rate Limiting

**Decision:** IP-based limits with captcha trigger

| Limit | Value | Scope |
|-------|-------|-------|
| Creates per hour | 10 | Per IP |
| Creates per day | 50 | Per IP |
| Captcha trigger | After 5 creates | Per IP per hour |
| Stats requests | 60/min | Per private ID |

**Rationale:**
- KV-based rate limiting (no Durable Objects needed)
- Low limits sufficient for legitimate use
- Captcha for suspected automation

**Implementation:**
- Store `ratelimit:ip:<hash>:create:hour` with TTL
- Increment on each create, check before allowing
- Return 429 with captcha challenge when triggered

### 5. Embed URL Structure

**Decision:** Short path for new IDs

```
# New buttons
https://api.nice.sbs/e/n_x7Kf9mQ2

# Legacy buttons (still supported)
https://api.nice.sbs/embed/btn_xxx
```

**Rationale:**
- `/e/` is shorter than `/embed/`
- New ID prefix `n_` distinguishes from legacy `btn_`
- Both routes render same embed component

### 6. Homepage Button Creator

**Decision:** Client-side form that calls API

```
[URL input: https://dev.to/my-post    ]
[Theme: ◉ Light ○ Dark ○ Minimal     ]
[Size:  ○ XS ○ SM ◉ MD ○ LG ○ XL     ]
[        Create Button               ]

↓ Shows after creation:

✅ Button created!

Public ID: n_x7Kf9mQ2
Private ID: ns_4vK9mPq8wL2nRt5xYz7bC
⚠️ Save your private ID! Only shown once.

Your snippet:
┌────────────────────────────────────┐
│ <iframe src="..."></iframe>        │  [Copy]
└────────────────────────────────────┘

[Preview button here]
```

**Rationale:**
- Static HTML + JS, no server rendering needed
- Same API that programmatic users call
- Theme/size picker for convenience
- Clear warning about private ID

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate limit bypass (IP rotation) | Medium | Captcha trigger, monitor abuse patterns |
| Private ID leakage via referrer | Medium | Set `Referrer-Policy: no-referrer` on stats pages |
| KV race on count increment | Low | Acceptable for nice counts, document limitation |
| URL squatting (create button for URL you don't own) | Low | No real attack vector - button only works where embedded |
| Lost private ID | Medium | No recovery without accounts - clear UX warning |

## Migration Plan

### Phase 1: Add v2 API (non-breaking)
1. Deploy new endpoints alongside v1
2. Add rate limiting infrastructure
3. Test with internal use

### Phase 2: Homepage Button Creator
1. Add form to homepage
2. Connect to v2 API
3. Add stats page route

### Phase 3: Documentation
1. Update API docs
2. Add "Get Started" guide
3. Deprecation notice for v1 site registration

### Rollback
- v2 endpoints can be disabled via feature flag
- v1 continues working unchanged
- KV data is backwards compatible

## Open Questions

1. **Captcha provider**: hCaptcha vs Cloudflare Turnstile?
   - Leaning Turnstile (free, CF-native)

2. **Stats page design**: Simple or detailed?
   - MVP: count + URL + created date
   - Later: daily/weekly chart

3. **Private ID recovery**: Allow re-generation for same URL+IP?
   - Leaning no - encourages saving the ID
   - Could add email-based recovery later with accounts

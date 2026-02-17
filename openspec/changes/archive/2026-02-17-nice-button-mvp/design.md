## Context

Nice (**nice.sbs** — *Simple Button Service*) is a greenfield project — an anonymous "nice" button service. Users can nice content without signing in, while site owners get an embeddable widget with spam protection.

**Constraints:**
- Sub-100ms response times globally
- No user accounts for visitors
- GDPR compliant (no PII storage)
- Simple integration (single script tag)

**Stakeholders:**
- Site owners: want easy integration, reliable counts, spam protection
- Visitors: want zero-friction interaction, no tracking
- Us: want low operational overhead, minimal infrastructure cost

## Goals / Non-Goals

**Goals:**
- Deploy globally at the edge for low latency
- Prevent spam without requiring CAPTCHAs for normal users
- Simple embed that works on any website
- Site owners can manage buttons via API

**Non-Goals:**
- User accounts or profiles for visitors
- Analytics dashboard (v1)
- Multiple reaction types (just "nice" for MVP)
- Self-hosting support (hosted service only for MVP)

## Decisions

### 1. Runtime: Cloudflare Workers

**Decision:** Use Cloudflare Workers for all API endpoints.

**Rationale:**
- Edge deployment = low latency globally
- Built-in KV storage for persistence
- Free tier generous for MVP (100k requests/day)
- No servers to manage

**Alternatives considered:**
- AWS Lambda + DynamoDB: Higher latency, more complex, higher cost
- Traditional server (Node/Go): Need to manage scaling, regions
- Deno Deploy: Less mature KV story

### 2. Storage: Cloudflare KV

**Decision:** Use KV for all data storage.

**Rationale:**
- Globally distributed, eventually consistent (fine for nice counts)
- Simple key-value model fits our data
- Integrated with Workers
- Free tier: 100k reads/day, 1k writes/day

**Data model:**
```
site:{site_id}           → { domain, token_hash, created_at }
button:{button_id}       → { site_id, name, url, count, created_at }
nice:{button_id}:{hash}  → { created_at }  // TTL: 24h (dedup window)
rate:{ip}:{minute}       → count           // TTL: 60s
```

**Alternatives considered:**
- D1 (SQLite): Overkill for MVP, adds complexity
- Durable Objects: Higher cost, not needed for simple counters
- External DB (Planetscale): Added latency, complexity

### 3. Visitor Identity: IP + Fingerprint Hash

**Decision:** Create visitor identity from hashed combination of IP + lightweight fingerprint + daily salt.

```
visitor_hash = SHA256(ip + fingerprint + button_id + daily_salt)
```

**Rationale:**
- No cookies needed
- Scoped per button (no cross-site tracking)
- Daily salt rotation limits long-term tracking
- Good enough for dedup without being creepy

**Fingerprint components (lightweight):**
- Screen dimensions
- Timezone
- Language
- User-agent hash

**Alternatives considered:**
- IP only: Too easy to bypass with VPNs
- Full fingerprint (canvas, fonts): Too invasive, slow
- Cookies: Adds consent requirements, can be blocked

### 4. Embed: iframe with Script Loader

**Decision:** Primary embed is an iframe, with a script tag that creates it.

```html
<script src="https://nice.site/embed.js" data-button="btn_xxx" async></script>
```

The script:
1. Creates iframe pointing to embed page
2. Passes config via URL params
3. Handles postMessage for resize/events

**Rationale:**
- iframe provides security isolation
- Script tag is simpler for site owners
- postMessage allows communication without compromising isolation

**Alternatives considered:**
- Direct DOM injection: XSS concerns, styling conflicts
- Web Component: Less browser support, more complex
- Image badge: No interactivity

### 5. Authentication: Bearer Tokens

**Decision:** Site owners authenticate with bearer tokens in Authorization header.

**Rationale:**
- Simple, stateless
- Works with any HTTP client
- Token stored as hash in KV (not plaintext)

**Token format:** `nice_` + 32 random bytes (base64)

**Alternatives considered:**
- API keys in query params: Less secure, logged in URLs
- JWT: Overkill for simple auth
- OAuth: Way overkill

### 6. Rate Limiting: Tiered Approach

**Decision:** Three tiers of rate limiting.

| Tier | Limit | Action |
|------|-------|--------|
| Per IP | 20/min | 429 response |
| Per button | 100/min | 429 response |
| Burst detection | 500/min on button | Require proof-of-work |

**Proof-of-work:** Client must solve a small hashcash-style puzzle before nice is accepted. Adds ~100ms client-side, makes bulk spam expensive.

**Rationale:**
- Tiered approach catches different attack vectors
- PoW only kicks in under attack (normal users never see it)
- All state in KV with TTLs (self-cleaning)

## Risks / Trade-offs

**[Risk] KV eventual consistency → stale counts**
- Mitigation: Counts may lag by ~60s globally. Acceptable for nice counts.

**[Risk] Fingerprinting seen as creepy**
- Mitigation: Use minimal fingerprint, document clearly, no cross-site tracking.

**[Risk] Free tier limits hit**
- Mitigation: Monitor usage, have paid tier ready. 100k reads/day is generous for MVP.

**[Risk] Workers cold start latency**
- Mitigation: Workers cold starts are <5ms, not a real concern.

**[Trade-off] No undo/un-nice**
- Simplifies MVP. Can add later with session-based tracking.

**[Trade-off] Daily salt rotation = same user can nice again next day**
- Acceptable for MVP. True persistent dedup would require cookies or accounts.

## Migration Plan

N/A — greenfield project.

**Deployment:**
1. Deploy Workers to Cloudflare
2. Configure KV namespaces (prod, preview)
3. Set up custom domain (nice.goodegg.studio or similar)
4. Create first site registration manually for testing

**Rollback:**
- Cloudflare Workers supports instant rollback to previous deployment
- KV data persists across deployments

## Open Questions

1. **Domain:** nice.goodegg.studio? getnice.io? nice.lol?
2. **Site registration flow:** Self-serve or manual approval for MVP?
3. **Button limits:** How many buttons per site on free tier?
4. **Count display:** Show exact count or "fuzzy" (e.g., "~100 nices")?

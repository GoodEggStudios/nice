# Nice — The Anonymous Nice Button

> "Nice buttons without the login wall"

## Overview

Nice is an embeddable "nice" button for websites that doesn't require users to sign in. Site owners register to get a button token, embed it on their site, and visitors can nice content with a single click.

It's not liking. It's **nice'ing**.

## Goals

1. **Zero friction for users** — No login, no account, just click
2. **Simple for site owners** — Register, get embed code, done
3. **Spam resistant** — Anonymous but not abusable
4. **Privacy respecting** — Minimal data collection, no tracking across sites
5. **Fast** — Edge-deployed, sub-100ms response times

## Non-Goals

- User accounts/profiles for nice'rs
- Comments or reactions beyond "nice"
- Analytics dashboard (v1)
- Social features (seeing who nice'd)

---

## Core Concepts

### Button

A nice button associated with a specific page or content piece.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (nanoid) |
| site_id | string | Parent site |
| name | string | Human label (e.g., "Homepage Hero") |
| url | string | Optional: canonical URL |
| count | integer | Total nices |
| created_at | timestamp | |

### Site

A registered website/domain.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| domain | string | Verified domain |
| token | string | API token (secret) |
| created_at | timestamp | |

### Nice

A single nice event.

| Field | Type | Description |
|-------|------|-------------|
| button_id | string | Which button |
| visitor_hash | string | Hashed visitor identity |
| created_at | timestamp | |

---

## Anti-Spam Strategy

### Visitor Identity (no login required)

Visitors are identified by a hash of:
- IP address
- Lightweight fingerprint (screen size, timezone, language)
- Button ID (scoped per button)

```
visitor_hash = SHA256(ip + fingerprint + button_id + daily_salt)
```

Daily salt rotation means the same visitor gets a new hash each day, limiting long-term tracking while preventing same-day spam.

### Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per IP | 20 nices | 1 minute |
| Per button | 100 nices | 1 minute |
| Per visitor_hash | 1 nice | per button (dedupe) |

### Escalation

If rate limits are hit:
1. First: Return 429, client shows "slow down"
2. Repeated: Require proof-of-work (small JS challenge)
3. Extreme: Temporary IP block (1 hour)

---

## API

### Public Endpoints (embed/widget)

#### GET /embed/:buttonId
Returns HTML page for iframe embed.

Query params:
- `theme` — light | dark
- `size` — small | medium | large

#### POST /api/nice/:buttonId
Record a nice.

Headers:
- `X-Visitor-Fingerprint` — Client-generated fingerprint hash

Response:
```json
{
  "count": 142,
  "niced": true
}
```

#### GET /api/count/:buttonId
Get current nice count.

Response:
```json
{
  "count": 142
}
```

### Authenticated Endpoints (site owners)

#### POST /api/sites
Register a new site.

#### POST /api/buttons
Create a new button.

#### GET /api/buttons
List buttons for authenticated site.

#### DELETE /api/buttons/:buttonId
Remove a button.

---

## Embed Integration

### Script Tag (recommended)

```html
<script 
  src="https://nice.example/embed.js" 
  data-button="btn_abc123"
  data-theme="light"
  async>
</script>
```

### iframe (manual)

```html
<iframe 
  src="https://nice.example/embed/btn_abc123?theme=light"
  style="border:none; width:100px; height:40px;">
</iframe>
```

### JavaScript API

```javascript
Nice.init({ button: 'btn_abc123' });
Nice.nice();           // Trigger nice
Nice.getCount();       // Get current count
Nice.on('niced', fn);  // Event listener
```

---

## Tech Stack (Proposed)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API | Cloudflare Workers | Edge deployment, low latency |
| Storage | Cloudflare KV | Persisted, globally distributed |
| Rate limiting | KV + Workers | Built-in, no extra service |
| Embed page | Static HTML/CSS/JS | Tiny, cacheable |
| Dashboard | TBD | Could be separate app |

---

## Privacy

- No cookies set on user's browser
- Fingerprint hash never stored raw (always hashed with salt)
- IP addresses not logged permanently
- No cross-site tracking (visitor_hash is scoped to button_id)
- GDPR: No PII collected

---

## Open Questions

1. **Undo nices?** — Allow un-nice'ing within session? Ever?
2. **Multiple reactions?** — Just "nice" or also 👍😂❤️?
3. **Verified domains?** — Require DNS verification or trust on signup?
4. **Pricing?** — Free tier limits? Paid plans?
5. **Self-host option?** — Distribute as OSS for self-hosting?

---

## Milestones

### v0.1 — MVP
- [ ] Site registration (manual/simple)
- [ ] Button creation
- [ ] Embed iframe with nice functionality
- [ ] Basic rate limiting
- [ ] Nice count display

### v0.2 — Polish
- [ ] Script tag embed
- [ ] Themes (light/dark)
- [ ] Proof-of-work escalation
- [ ] Dashboard for site owners

### v0.3 — Scale
- [ ] Domain verification
- [ ] Analytics (nices over time)
- [ ] Custom styling options

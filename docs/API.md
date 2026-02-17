# Nice API Documentation

**Base URL:** `https://nice.sbs`

## Overview

Nice is a simple button service that lets you add anonymous "nice" buttons to any website. No user accounts required for visitors - just click to nice!

---

## Authentication

Site management endpoints require a Bearer token:

```
Authorization: Bearer nice_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Tokens are returned when you register a site.

---

## Endpoints

### Sites

#### Register a Site

```http
POST /api/v1/sites
Content-Type: application/json

{
  "domain": "example.com"
}
```

**Response (201 Created):**
```json
{
  "site": {
    "id": "site_abc123",
    "domain": "example.com",
    "verified": false,
    "createdAt": "2026-02-17T21:00:00Z"
  },
  "token": "nice_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "verification": {
    "type": "dns_txt",
    "record": "_nice-verify.example.com",
    "value": "nice-verify-abc123def456...",
    "instructions": "Add a TXT record to your DNS..."
  }
}
```

⚠️ **Save your token!** It's only shown once.

#### Verify Domain

After adding the DNS TXT record:

```http
POST /api/v1/sites/{site_id}/verify
```

**Response (200 OK):**
```json
{
  "verified": true,
  "message": "Domain verified successfully!"
}
```

#### Regenerate Token

```http
POST /api/v1/sites/{site_id}/token/regenerate
Authorization: Bearer nice_xxx
```

**Response (200 OK):**
```json
{
  "token": "nice_new_token_here",
  "message": "Token regenerated. Your old token is now invalid."
}
```

---

### Buttons

All button endpoints require authentication.

#### Create Button

```http
POST /api/v1/buttons
Authorization: Bearer nice_xxx
Content-Type: application/json

{
  "name": "My Blog Post",
  "url": "https://example.com/blog/post-1"
}
```

**Response (201 Created):**
```json
{
  "button_id": "btn_abc123",
  "name": "My Blog Post",
  "url": "https://example.com/blog/post-1",
  "count": 0,
  "created_at": "2026-02-17T21:00:00Z",
  "embed": {
    "script": "<script src=\"https://nice.sbs/embed.js\" data-button=\"btn_abc123\" async></script>",
    "iframe": "<iframe src=\"https://nice.sbs/embed/btn_abc123\" style=\"border:none;width:100px;height:40px;\"></iframe>",
    "button_id": "btn_abc123"
  }
}
```

#### List Buttons

```http
GET /api/v1/buttons
Authorization: Bearer nice_xxx
```

Query params:
- `limit` - Max results (default: 50, max: 100)
- `cursor` - Pagination cursor

**Response (200 OK):**
```json
{
  "buttons": [...],
  "has_more": true,
  "cursor": "btn_xyz789"
}
```

#### Get Button

```http
GET /api/v1/buttons/{button_id}
Authorization: Bearer nice_xxx
```

#### Delete Button

```http
DELETE /api/v1/buttons/{button_id}
Authorization: Bearer nice_xxx
```

---

### Nice (Public)

These endpoints don't require authentication.

#### Record a Nice

```http
POST /api/v1/nice/{button_id}
Content-Type: application/json

{
  "fingerprint": "optional-client-hash"
}
```

**Response (200 OK) - Success:**
```json
{
  "success": true,
  "count": 43
}
```

**Response (200 OK) - Already niced:**
```json
{
  "success": false,
  "reason": "already_niced",
  "count": 43
}
```

**Response (429) - Rate limited:**
```json
{
  "error": "Rate limit exceeded",
  "code": "IP_LIMIT"
}
```

**Response (429) - PoW required:**
```json
{
  "error": "Proof of work required",
  "code": "POW_REQUIRED",
  "pow_challenge": {
    "challenge": "random_base64_string",
    "difficulty": 16,
    "expires_at": "2026-02-17T21:01:00Z"
  }
}
```

#### Get Nice Count

```http
GET /api/v1/nice/{button_id}/count
```

**Response (200 OK):**
```json
{
  "count": 43,
  "button_id": "btn_abc123"
}
```

---

## Embed

### Script Tag (Recommended)

```html
<script 
  src="https://nice.sbs/embed.js" 
  data-button="btn_abc123"
  async>
</script>
```

### With Theme

```html
<!-- Light (default) -->
<script src="https://nice.sbs/embed.js" data-button="btn_abc123" async></script>

<!-- Dark -->
<script src="https://nice.sbs/embed.js" data-button="btn_abc123" data-theme="dark" async></script>

<!-- Minimal (transparent) -->
<script src="https://nice.sbs/embed.js" data-button="btn_abc123" data-theme="minimal" async></script>
```

### Manual iframe

```html
<iframe 
  src="https://nice.sbs/embed/btn_abc123?theme=light"
  style="border:none; width:100px; height:36px;"
  scrolling="no"
  frameborder="0">
</iframe>
```

---

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per IP | 20 requests | 1 minute |
| Per Button | 100 requests | 1 minute |
| Burst threshold | 500 requests | Triggers PoW |

---

## Errors

All errors return JSON:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `MISSING_DOMAIN` | 400 | Domain field required |
| `INVALID_DOMAIN` | 400 | Domain format invalid |
| `DOMAIN_MISMATCH` | 400 | URL doesn't match site domain |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Not allowed to access resource |
| `SITE_NOT_VERIFIED` | 403 | Complete DNS verification first |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `DOMAIN_EXISTS` | 409 | Domain already registered |
| `DUPLICATE_URL` | 409 | Button already exists for URL |
| `IP_LIMIT` | 429 | IP rate limit exceeded |
| `BUTTON_LIMIT` | 429 | Button rate limit exceeded |
| `POW_REQUIRED` | 429 | Proof of work required |
| `INTERNAL_ERROR` | 500 | Server error |

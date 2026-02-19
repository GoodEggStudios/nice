# Nice API Documentation

**Base URL:** `https://api.nice.sbs`

## Overview

Nice is a simple button service that lets you add anonymous "nice" buttons to any website. No signup required — create buttons instantly via API.

---

## Quick Start

Create a button with a single API call:

```bash
curl -X POST https://api.nice.sbs/api/v2/buttons \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/my-article"}'
```

Response:
```json
{
  "public_id": "n_x7Kf9mQ2Ab3Z",
  "private_id": "ns_4vK9mPq8wL2nRt5xYz7bC",
  "url": "https://example.com/my-article",
  "embed": {
    "iframe": "<iframe src=\"...\" ...></iframe>"
  }
}
```

⚠️ **Save your `private_id`!** It's only shown once and is needed to manage your button.

---

## API v2 Endpoints

### Create Button

```http
POST /api/v2/buttons
Content-Type: application/json

{
  "url": "https://example.com/my-article",
  "theme": "light",
  "size": "md",
  "restriction": "url"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Content URL where the button will be embedded |
| `theme` | string | No | `light` (default), `dark`, `minimal`, `mono-dark`, `mono-light` |
| `size` | string | No | `xs`, `sm`, `md` (default), `lg`, `xl` |

**Response (201 Created):**
```json
{
  "public_id": "n_x7Kf9mQ2Ab3Z",
  "private_id": "ns_4vK9mPq8wL2nRt5xYz7bC",
  "url": "https://example.com/my-article",
  "theme": "light",
  "size": "md",
  "count": 0,
  "created_at": "2026-02-18T10:00:00Z",
  "embed": {
    "iframe": "<iframe src=\"https://api.nice.sbs/e/n_x7Kf9mQ2Ab3Z?theme=light&size=md\" style=\"border:none;width:100px;height:36px;\" title=\"Nice button\"></iframe>",
    "script": "<script src=\"https://api.nice.sbs/embed.js\" data-button=\"n_x7Kf9mQ2Ab3Z\" data-theme=\"light\" data-size=\"md\" async></script>"
  }
}
```

---

### Get Stats

```http
GET /api/v2/buttons/stats/:private_id
```

Get button statistics. Requires the private ID.

**Response (200 OK):**
```json
{
  "id": "n_x7Kf9mQ2Ab3Z",
  "url": "https://example.com/my-article",
  "count": 42,
  "theme": "light",
  "size": "md",
  "created_at": "2026-02-18T10:00:00Z",
  "embed": { ... }
}
```

---

### Update Button

```http
PATCH /api/v2/buttons/:private_id
Content-Type: application/json

{
  "restriction": "global"
}
```

Update button settings. Requires the private ID.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `restriction` | string | No | `url`, `domain`, `global` |
| `theme` | string | No | `light`, `dark`, `minimal`, `mono-dark`, `mono-light` |
| `size` | string | No | `xs`, `sm`, `md`, `lg`, `xl` |

**Response (200 OK):**
```json
{
  "id": "n_x7Kf9mQ2Ab3Z",
  "url": "https://example.com/my-article",
  "restriction": "global",
  "count": 42,
  "theme": "light",
  "size": "md",
  "created_at": "2026-02-18T10:00:00Z",
  "embed": { ... }
}
```

---

### Delete Button

```http
DELETE /api/v2/buttons/:private_id
```

Delete a button. Requires the private ID. **This action cannot be undone.**

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Button deleted"
}
```

---

### Record Nice (Authenticated)

```http
POST /api/v2/buttons/:private_id/nice
```

Record a "nice" using the private ID. **Owner only** — no restrictions.

Unlike the public nice endpoint:
- No referrer check
- No IP deduplication
- No rate limiting

Use this for programmatic nice recording.

**Response (200 OK):**
```json
{
  "success": true,
  "count": 43,
  "public_id": "n_x7Kf9mQ2Ab3Z"
}
```

---

## Nice Endpoints (Public)

These endpoints don't require authentication.

### Record a Nice

```http
POST /api/v1/nice/:public_id
```

Record a "nice" on a button.

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

### Get Nice Count

```http
GET /api/v1/nice/:public_id/count?fp=<fingerprint>
```

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `fp` | No | Device fingerprint for accurate `has_niced` check |

**Response (200 OK):**
```json
{
  "count": 43,
  "button_id": "n_x7Kf9mQ2",
  "has_niced": true
}
```

| Field | Description |
|-------|-------------|
| `count` | Total nice count |
| `button_id` | The button ID |
| `has_niced` | Whether the current visitor (by IP + fingerprint) has already niced |

---

## Embed

### iframe (Recommended)

```html
<iframe 
  src="https://api.nice.sbs/e/:public_id?theme=light&size=md"
  style="border:none;width:100px;height:36px;"
  title="Nice button">
</iframe>
```

### Themes

| Theme | Description |
|-------|-------------|
| `light` | Light gray background (default) |
| `dark` | Dark gray background |
| `minimal` | Transparent with border |
| `mono-dark` | Black background, inverts when clicked |
| `mono-light` | White background, inverts when clicked |

### Sizes

| Size | Dimensions |
|------|------------|
| `xs` | 70 × 28px |
| `sm` | 85 × 32px |
| `md` | 100 × 36px (default) |
| `lg` | 120 × 44px |
| `xl` | 140 × 52px |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `MISSING_URL` | 400 | URL field required |
| `INVALID_URL` | 400 | URL format invalid |
| `INVALID_THEME` | 400 | Invalid theme value |
| `INVALID_SIZE` | 400 | Invalid size value |
| `INVALID_RESTRICTION` | 400 | Invalid restriction mode |
| `NOT_FOUND` | 404 | Button not found |
| `REFERRER_DENIED` | 403 | Nice not allowed from this referrer |
| `IP_LIMIT` | 429 | Rate limit exceeded |
| `BUTTON_LIMIT` | 429 | Button rate limit exceeded |

---

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per IP (nice) | 20 requests | 1 minute |
| Per Button (nice) | 100 requests | 1 minute |

---

## Badges (GitHub/Markdown)

SVG badges for displaying Nice counts in GitHub READMEs and other markdown contexts that don't support iframes.

### Badge URL

```
https://api.nice.sbs/badge/:public_id.svg
```

### Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `style` | `flat` | Badge style: `flat`, `flat-square`, `plastic`, `for-the-badge` |
| `color` | `fbbf24` | Right side color (hex without #) |
| `label` | `nice` | Left side label text |

### Examples

**Basic badge:**
```markdown
![Nice](https://api.nice.sbs/badge/n_abc123.svg)
```

**Clickable badge (links to button page):**
```markdown
[![Nice](https://api.nice.sbs/badge/n_abc123.svg)](https://nice.sbs/b/n_abc123)
```

**Custom style:**
```markdown
![Nice](https://api.nice.sbs/badge/n_abc123.svg?style=for-the-badge)
```

**Custom color:**
```markdown
![Nice](https://api.nice.sbs/badge/n_abc123.svg?color=22c55e)
```

### Badge Styles

| Style | Description |
|-------|-------------|
| `flat` | Flat colors, slight border radius (default) |
| `flat-square` | Flat colors, square corners |
| `plastic` | Subtle gradient for 3D effect |
| `for-the-badge` | Larger (28px), uppercase label |

### Caching

Badges are cached for 60 seconds (browser) / 5 minutes (CDN). Counts are snapshots, not real-time.

---

## Legacy API (v1)

The v1 API with DNS verification is still supported for existing integrations but is deprecated for new users. See the v1 documentation for details.

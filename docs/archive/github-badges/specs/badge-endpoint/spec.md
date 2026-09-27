# Badge Endpoint Spec

**Status:** ✅ Implemented

## Overview

SVG badge endpoint for displaying Nice button counts in markdown contexts (GitHub, GitLab, etc.).

## Endpoint

```
GET /badge/{publicId}.svg
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `publicId` | string | The public button ID (n_xxx format) |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `default` | Badge theme: `default` or `dark` |

### Response

**Content-Type:** `image/svg+xml`

**Headers:**
```
Content-Type: image/svg+xml
Cache-Control: public, max-age=60, s-maxage=300
X-Content-Type-Options: nosniff
```

### Badge Design

```
┌────────────────┬──────────┐
│  N  nice       │   42     │
│  (dark/black)  │  (gold)  │
└────────────────┴──────────┘
```

- **Left side:** Nice N logo (gold) + "nice" label (white text on dark bg)
- **Right side:** Count (black text on gold #fbbf24 bg)
- **Height:** 20px
- **Font:** Verdana, 11px
- **Corners:** 3px border radius

## Themes

### default
- Left background: #333 (dark gray)
- N logo: #fbbf24 (gold)
- Label text: #fff (white)

### dark
- Left background: #000 (black)
- N logo: #fbbf24 (gold)
- Label text: #fff (white)

Both themes use gold (#fbbf24) right side with black text.

## Requirements

### BADGE-01: Valid Button ✅
When `publicId` exists in KV storage:
- Return SVG with current nice count
- Format large counts (1.2k, 1.2M)

### BADGE-02: Invalid Button ✅
When `publicId` does not exist:
- Return SVG showing "?" as count
- HTTP status 200 (never 404)

### BADGE-03: Count Formatting ✅
- Counts >= 1000 show as "1.2k"
- Counts >= 1000000 show as "1.2M"
- Zero shows as "0"

### BADGE-04: Theme Validation ✅
- Unknown theme values fall back to "default"

### BADGE-05: Caching ✅
- Browser cache: 60 seconds
- CDN cache: 300 seconds

## Usage Examples

### Basic Badge
```markdown
![Nice](https://api.nice.sbs/badge/n_abc123.svg)
```

### Clickable Badge (Links to Button Page)
```markdown
[![Nice](https://api.nice.sbs/badge/n_abc123.svg)](https://nice.sbs/button?id=n_abc123)
```

### Dark Theme
```markdown
![Nice](https://api.nice.sbs/badge/n_abc123.svg?theme=dark)
```

## Implementation Files

- `src/lib/badge.ts` - SVG generation
- `src/routes/badge.ts` - Route handler
- `test/lib/badge.test.ts` - 23 unit tests
- `docs/API.md` - Documentation

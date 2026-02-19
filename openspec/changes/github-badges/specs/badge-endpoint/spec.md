# Badge Endpoint Spec

## Overview

SVG badge endpoint for displaying Nice button counts in GitHub markdown and other contexts that don't support iframes or JavaScript.

## Endpoint

```
GET /badge/{publicId}.svg
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `publicId` | string | The public button ID (from create response) |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | string | `flat` | Badge style: `flat`, `flat-square`, `plastic`, `for-the-badge` |
| `color` | string | `fbbf24` | Right side color (hex without #) |
| `label` | string | `nice` | Left side label text |

### Response

**Content-Type:** `image/svg+xml`

**Cache-Control:** `public, max-age=60, s-maxage=300`

**Headers:**
```
Content-Type: image/svg+xml
Cache-Control: public, max-age=60, s-maxage=300
```

### Badge Layout

```
┌──────────┬──────────┐
│   nice   │   123    │
│ (dark)   │ (amber)  │
└──────────┴──────────┘
```

- **Left side:** Label text on dark background (#333)
- **Right side:** Count on colored background (default: amber #fbbf24)
- **Font:** Verdana, 11px (shields.io standard)
- **Height:** 20px (standard), 28px (for-the-badge)

## Badge Styles

### flat (default)
- Flat colors, no gradients
- Slight border radius (3px)

### flat-square  
- Flat colors, no gradients
- No border radius (square corners)

### plastic
- Subtle gradient overlay for 3D effect
- Slight border radius

### for-the-badge
- Larger (28px height)
- All caps label
- More padding

## Requirements

### BADGE-01: Valid Button
When `publicId` exists:
- Return SVG with current nice count
- Use button's nice count from database

### BADGE-02: Invalid Button
When `publicId` does not exist:
- Return SVG showing "?" as count
- Do NOT return 404 (breaks image rendering)

### BADGE-03: Count Formatting
- Counts >= 1000 show as "1.2k"
- Counts >= 1000000 show as "1.2M"
- Zero shows as "0"

### BADGE-04: Style Validation
- Unknown style values fall back to "flat"
- Invalid color values fall back to "fbbf24"

### BADGE-05: Caching
- All badge responses include cache headers
- Browser cache: 60 seconds
- CDN cache: 300 seconds

### BADGE-06: Rate Limiting
- Same rate limits as other public endpoints
- Return cached response on rate limit (don't break images)

## Usage Examples

### Basic Badge
```markdown
![Nice](https://api.nice.sbs/badge/abc123.svg)
```

### Clickable Badge (Links to Button)
```markdown
[![Nice](https://api.nice.sbs/badge/abc123.svg)](https://nice.sbs/b/abc123)
```

### Custom Style
```markdown
![Nice](https://api.nice.sbs/badge/abc123.svg?style=for-the-badge)
```

### Custom Color
```markdown
![Nice](https://api.nice.sbs/badge/abc123.svg?color=22c55e)
```

## SVG Template Reference

Minimum viable SVG structure (flat style):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="{width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <rect width="{labelWidth}" height="20" fill="#333"/>
    <rect x="{labelWidth}" width="{countWidth}" height="20" fill="#{color}"/>
    <rect width="{width}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" font-size="11">
    <text x="{labelX}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{labelX}" y="14">{label}</text>
    <text x="{countX}" y="15" fill="#010101" fill-opacity=".3">{count}</text>
    <text x="{countX}" y="14">{count}</text>
  </g>
</svg>
```

Width calculation:
- Measure text width (approximate: 6.5px per character for Verdana 11px)
- Add padding (10px each side per section)

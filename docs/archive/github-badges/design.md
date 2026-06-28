## Context

Nice buttons use iframe embeds with JavaScript for interactivity. GitHub's markdown sanitizer strips all of this, making embeds impossible in:
- README.md files
- Issue/PR descriptions and comments
- Wiki pages
- Gist markdown

The standard solution is SVG badges (like shields.io, codecov, etc.) that render as static images.

## Goals / Non-Goals

**Goals:**
- Provide a drop-in badge URL that works in any markdown
- Match shields.io conventions for familiarity
- Show current nice count with Nice branding
- Cache responses for performance

**Non-Goals:**
- Real-time updates (badges are static snapshots)
- Click-to-nice functionality (GitHub doesn't allow interactive badges)
- Custom badge text (keeping it simple: just the count)

## Decisions

### 1. SVG Generation: Server-side template
**Decision:** Generate SVG server-side using a template string.

**Alternatives considered:**
- External badge service (shields.io endpoint) - adds dependency, less control over branding
- Canvas/image generation - heavier, requires image libs, SVG is lighter

**Rationale:** SVG is lightweight, scales perfectly, and we control the design. No dependencies needed.

### 2. Badge Styles
**Decision:** Support shields.io-compatible styles: `flat` (default), `flat-square`, `plastic`, `for-the-badge`.

**Rationale:** Users familiar with shields.io will expect these options. Keeps learning curve low.

### 3. URL Structure
**Decision:** `/badge/{publicId}.svg?style=flat&color=fbbf24`

**Alternatives considered:**
- `/b/{publicId}/badge.svg` - nested under button route
- `/{publicId}.svg` - too short, conflicts with future routes

**Rationale:** Clear, dedicated badge namespace. Query params for optional customization.

### 4. Caching
**Decision:** `Cache-Control: public, max-age=60, s-maxage=300`

**Rationale:** 
- 60s browser cache keeps badges reasonably fresh
- 300s CDN cache reduces origin load
- Nice counts don't need real-time accuracy in static badges

### 5. Branding
**Decision:** Badge shows "nice" label on left (dark bg), count on right (amber #fbbf24 bg).

**Rationale:** Consistent with Nice brand colors. Immediately recognizable.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Badge abuse (scraping all buttons) | Rate limiting on badge endpoint, same as other routes |
| Stale counts | Short cache TTL (60s). Document that badges are snapshots. |
| Invalid publicId | Return "nice | ?" badge for missing buttons (don't error) |

## Usage Example

```markdown
[![Nice](https://api.nice.sbs/badge/abc123.svg)](https://nice.sbs/b/abc123)
```

Renders as a clickable badge that links to the Nice button page.

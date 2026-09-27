# Markdown Badges - Tasks

## Overview
Add SVG badge endpoint for displaying Nice button counts in markdown.

**Status:** ✅ Complete (Archived)

---

## Task Group 1: SVG Generation

### 1.1 Create Badge SVG Generator ✅
**File:** `src/lib/badge.ts`

Created shields.io-style badge with Nice N logo:
- `generateBadge(count: number | null, options: BadgeOptions): string`
- `BadgeOptions`: `{ theme: 'default' | 'dark' }`
- Two-tone design: left (N logo + "nice"), right (count in gold)
- Embedded N logo path, gradient overlay, rounded corners

**Acceptance:**
- [x] Default theme renders with #333 left background
- [x] Dark theme renders with #000 left background
- [x] Gold (#fbbf24) right section with black text
- [x] N logo properly scaled and positioned

### 1.2 Format Count Helper ✅
**File:** `src/lib/badge.ts`

- [x] `formatCount(0)` → "0"
- [x] `formatCount(999)` → "999"
- [x] `formatCount(1234)` → "1.2k"
- [x] `formatCount(1234567)` → "1.2M"

---

## Task Group 2: Badge Route

### 2.1 Create Badge Route Handler ✅
**File:** `src/routes/badge.ts`

- [x] Route at `/badge/:publicId.svg`
- [x] Returns `Content-Type: image/svg+xml`
- [x] Returns `Cache-Control: public, max-age=60, s-maxage=300`
- [x] Looks up button in KV storage

### 2.2 Handle Missing Buttons ✅
- [x] Invalid publicId returns valid SVG with "?" count
- [x] HTTP status is always 200

### 2.3 Parameter Validation ✅
- [x] `?theme=invalid` defaults to "default"
- [x] `?theme=dark` uses dark theme

---

## Task Group 3: Integration

### 3.1 Register Badge Route ✅
**File:** `src/index.ts`

- [x] Route registered and accessible
- [x] Returns valid SVG

### 3.2 Update Documentation ✅
**File:** `docs/API.md`

- [x] Badge endpoint documented under "Markdown Badges"
- [x] Theme options documented
- [x] Usage examples with clickable badge syntax

---

## Additional Features (Added During Implementation)

### 3.3 Button Page ✅
**File:** `website/button.html`

Public page for viewing/clicking buttons:
- [x] Route at `/button?id=:publicId`
- [x] Shows enlarged button + count
- [x] nice.sbs bypass in referrer check (always allowed)

### 3.4 Badge Snippet in Create/Stats ✅
**Files:** `website/create.html`, `website/stats.html`

- [x] Badge preview and copy-to-clipboard on create page
- [x] Badge preview and copy-to-clipboard on stats page
- [x] Renamed to "Markdown Badge" (not GitHub-specific)

### 3.5 Unit Tests ✅
**File:** `test/lib/badge.test.ts`

23 tests covering:
- [x] formatCount edge cases
- [x] normalizeTheme validation
- [x] SVG structure (dimensions, clipPath, gradient, shadow)
- [x] Theme variations
- [x] Count variations (zero, large numbers, null)

---

## Summary

| Group | Tasks | Status |
|-------|-------|--------|
| 1 | 1.1-1.2 | ✅ Complete |
| 2 | 2.1-2.3 | ✅ Complete |
| 3 | 3.1-3.5 | ✅ Complete |

**Total:** 10 tasks across 3 groups - **All Complete**

## PRs
- #75 - OpenSpec proposal (merged)
- #76 - Initial implementation (merged)
- #77-86 - Iterations and fixes (all merged)

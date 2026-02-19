# GitHub Badges - Tasks

## Overview
Add SVG badge endpoint for displaying Nice button counts in GitHub markdown.

---

## Task Group 1: SVG Generation

### 1.1 Create Badge SVG Generator
**File:** `src/lib/badge.ts`

Create functions to generate badge SVG strings:
- `generateBadge(label: string, count: string, options: BadgeOptions): string`
- `BadgeOptions`: `{ style: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge', color: string }`
- Calculate widths based on text length
- Support all four badge styles

**Acceptance:**
- [ ] Flat style renders correctly
- [ ] Flat-square has no border radius
- [ ] Plastic has gradient overlay
- [ ] For-the-badge is larger with caps

### 1.2 Format Count Helper
**File:** `src/lib/badge.ts`

Add count formatting function:
- `formatCount(count: number): string`
- 0-999: show as-is
- 1000-999999: show as "1.2k" 
- 1000000+: show as "1.2M"

**Acceptance:**
- [ ] `formatCount(0)` → "0"
- [ ] `formatCount(999)` → "999"
- [ ] `formatCount(1234)` → "1.2k"
- [ ] `formatCount(1234567)` → "1.2M"

---

## Task Group 2: Badge Route

### 2.1 Create Badge Route Handler
**File:** `src/routes/badge.ts`

Create route handler for `/badge/:publicId.svg`:
- Parse publicId from path
- Parse style and color from query params
- Look up button by publicId
- Generate SVG using badge lib
- Return with correct headers

**Acceptance:**
- [ ] Route registered at `/badge/:publicId.svg`
- [ ] Returns `Content-Type: image/svg+xml`
- [ ] Returns `Cache-Control: public, max-age=60, s-maxage=300`

### 2.2 Handle Missing Buttons
**File:** `src/routes/badge.ts`

When button not found:
- Return badge showing "?" as count
- Do NOT return 404 (breaks image rendering)
- Still return 200 with valid SVG

**Acceptance:**
- [ ] Invalid publicId returns valid SVG
- [ ] Badge shows "?" for count
- [ ] HTTP status is 200

### 2.3 Parameter Validation
**File:** `src/routes/badge.ts`

Validate query parameters:
- Unknown style → default to "flat"
- Invalid color (not 3 or 6 hex chars) → default to "fbbf24"
- Empty label → default to "nice"

**Acceptance:**
- [ ] `?style=invalid` uses flat
- [ ] `?color=xyz` uses fbbf24
- [ ] `?label=` uses "nice"

---

## Task Group 3: Integration

### 3.1 Register Badge Route
**File:** `src/index.ts`

Add badge route to router:
- Import badge route handler
- Register at `/badge/:publicId.svg`

**Acceptance:**
- [ ] Route accessible via curl
- [ ] Returns valid SVG

### 3.2 Update Documentation
**File:** `docs/API.md`

Add badge endpoint documentation:
- Endpoint description
- Parameters
- Usage examples for GitHub markdown

**Acceptance:**
- [ ] Badge endpoint documented
- [ ] Examples show clickable badge syntax

---

## Task Summary

| Group | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | SVG generation library |
| 2 | 2.1-2.3 | Badge route handler |
| 3 | 3.1-3.2 | Integration and docs |

**Total:** 7 tasks across 3 groups

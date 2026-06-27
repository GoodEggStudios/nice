# Visual Screenshot Testing Design

## Purpose

Nice has several small visual surfaces that can regress without breaking API tests: embedded buttons, SVG badges, and website pages that show or generate those buttons. We will add screenshot testing support that makes those surfaces easy to review in git first, then promote stable scenarios into automated verification later.

## Goals

- Generate small PNG screenshots for every supported way Nice buttons, badges, and website placements can appear.
- Commit generated screenshots to the repository so visual changes are visible in ordinary code review.
- Keep visual tests separate from the existing Vitest and Cloudflare worker API tests.
- Use deterministic fixtures and mocked API responses so screenshots do not depend on production data, timing, or external state.
- Build the catalog in phases, while preserving the intent that all button, badge, and website placements are eventually covered.

## Non-Goals

- Do not upload screenshot artifacts in the initial workflow.
- Do not require Git LFS for baselines.
- Do not make visual comparison a blocking CI gate in the first phase.
- Do not replace existing unit or worker e2e tests.

## Proposed Approach

Add a Playwright-based visual testing layer with two main commands:

- `npm run test:visual:update`: regenerate committed PNG screenshots.
- `npm run test:visual`: compare current rendering to committed screenshots once verification is enabled.

Phase 1 will focus on generating and committing screenshots. Reviewers will inspect changed PNGs directly in the worktree or pull request. Later phases can enable strict comparisons locally and in CI after the fixture catalog has stabilized.

## Visual Surfaces

### Embed Buttons

Cover the real embedded button rendering from `/embed/:id` and `/e/:id`.

Theme coverage:

- `light`
- `dark`
- `minimal`
- `mono-dark`
- `mono-light`

Size coverage:

- `xs`
- `sm`
- `md`
- `lg`
- `xl`

State coverage:

- default empty count
- visible count
- niced state
- single-nice mode
- multi-nice mode
- representative hover and focus states where they are stable
- disabled or unavailable state if supported by the route behavior

The full theme x size matrix should be covered for the default state. Other states can use representative theme and size combinations unless a state changes layout or color per theme.

### Badges

Cover `/badge/:publicId.svg` output rendered as screenshots.

Theme coverage:

- `default`
- `dark`
- `rich`
- `rich-inverted`
- `rich-mono`
- `rich-mono-inverted`

Count coverage:

- `0`
- `1`
- `999`
- `1.2k`
- `1.2M`
- at least one long-width case that exercises badge dimension changes

### Website Placements

Cover static site pages and button placements that users actually see.

Initial page scenarios:

- homepage inline iframe placement
- create page empty form
- create page live preview combinations
- create page result state after a successful create response
- public button page loaded with a valid button
- public button page missing or invalid button state
- stats page loaded with a valid private ID
- stats page missing or invalid private ID state
- script-tag insertion behavior that creates an iframe in a host page

Desktop and mobile widths should be included for website pages. The small embed and badge surfaces can use content-sized screenshots to keep PNGs compact.

## Architecture

### Test Location

Place visual test code under `test/visual/`.

Expected structure:

```text
test/visual/
  fixtures/
  screenshots/
  visual.test.ts
```

The exact file split can evolve during implementation, but scenario definitions should stay in code rather than in manually maintained screenshot-only pages.

### Local Server

Use a deterministic local server for visual tests. The server should be able to:

- serve existing static files from `website/`
- serve route-derived embed and badge content
- provide mocked JSON responses for API calls used by website pages
- avoid calls to production APIs during screenshots

The implementation may use Playwright's built-in request interception, a small Node server, or a local Wrangler server if that proves simpler. The chosen implementation should prioritize deterministic output and low maintenance.

### Baselines

Generated PNGs should be committed under `test/visual/screenshots/`. Names should encode the surface, variant, and viewport where relevant, for example:

```text
embed-light-md-default.png
embed-dark-lg-niced.png
badge-rich-1_2k.png
website-home-desktop.png
website-create-result-mobile.png
```

Screenshots should remain small:

- capture only the button or badge bounding box for compact embed surfaces
- use representative viewport screenshots for full website pages
- disable or stabilize animation where possible
- use deterministic fonts or wait for fonts to load before capture

## Phasing

### Phase 1: Generate Review Screenshots

- Add Playwright and screenshot generation scripts.
- Build the visual scenario catalog for embed buttons first.
- Commit generated screenshots.
- Keep the workflow manually triggered by `npm run test:visual:update`.

### Phase 2: Complete Surface Coverage

- Add badge screenshots.
- Add website placement screenshots.
- Add script-tag insertion scenarios.
- Document how to review and intentionally update screenshots.

### Phase 3: Local Visual Verification

- Enable `npm run test:visual` to compare current screenshots against committed baselines.
- Decide tolerances after observing real rendering stability.
- Keep failures local and review-driven unless explicitly promoted.

### Phase 4: CI Verification

- Add CI execution for `npm run test:visual`.
- Start with a stable smoke subset if the full matrix is noisy.
- Promote broader coverage once it is reliable.

## Review Workflow

When visual behavior changes intentionally:

1. Run `npm run test:visual:update`.
2. Review changed PNGs in `test/visual/screenshots/`.
3. Commit the code and screenshot changes together.

When visual behavior changes unintentionally:

1. Inspect the changed PNGs.
2. Fix the rendering issue.
3. Regenerate screenshots only after the visual output is correct.

## Risks And Mitigations

- Font loading can make screenshots flaky. Wait for fonts to load and prefer deterministic local or cached font behavior where practical.
- Animations can cause unstable captures. Disable animations in the visual harness or capture after stable states.
- Production API calls can make website screenshots flaky. Mock API responses for visual scenarios.
- Full matrix coverage can grow quickly. Cover all theme and size combinations for the default embed state, then use representative combinations for state variants unless the state has theme-specific rendering.
- Browser rendering differences can create noisy diffs. Use a pinned Playwright browser version through package lock and document the update workflow.

## Open Decisions For Implementation Planning

- Whether the deterministic server should use Playwright route interception, a small Node server, or Wrangler.
- Whether embed HTML and badge SVG should be imported from source functions or served through a running worker.
- The exact screenshot naming convention after the first catalog is implemented.
- The first stable subset to promote into CI during Phase 4.

# Repository Guidance

## Scope

This repository builds Nice, an anonymous embeddable "nice" button service for websites.

The Cloudflare Worker API lives under `src/`:

- `src/index.ts` is the main Worker entry point and router.
- `src/routes/` owns API, embed, badge, and button-management route handlers. The served `/embed.js` and iframe HTML are generated in `src/routes/embed.ts`.
- `src/lib/` contains shared utilities for IDs, hashing, formatting, rate limiting, URL handling, badge rendering, button labels, appearance, and multi-nice batching.
- `src/embed/` contains standalone embed files outside the current Worker response path.
- `src/types/` contains Worker environment and shared TypeScript types.

The public static site lives in `website/`. Active docs live in `docs/`; completed plans and historical specs live in `docs/archive/`. Bruno API collections live in `bruno/`.

## Find The Change

| Task | Start here | Check here |
|---|---|---|
| API paths and button storage | `src/index.ts`, `src/routes/buttons.ts`, `src/routes/nice.ts` | `test/e2e/`, `docs/API.md`, `website/docs.html`, `bruno/` |
| Labels and saved appearance | `src/lib/button-labels.ts`, `src/lib/button-appearance.ts`, `src/routes/buttons.ts` | `test/lib/button-labels.test.ts`, `test/lib/button-appearance.test.ts`, `test/e2e/buttons.test.ts` |
| Embed behavior, count display, and sizing | `src/routes/embed.ts`, `src/routes/embed-constants.ts`, `src/lib/multi-nice-batch.ts` | `test/e2e/embed.test.ts`, `test/lib/embed.test.ts`, `test/lib/embed-script.test.ts`, `test/visual/embed.visual.spec.ts` |
| Create and manage pages | `website/create.html`, `website/stats.html` | `test/visual/create.visual.spec.ts`, `test/visual/website.visual.spec.ts` |
| Homepage interactions | `website/index.html` | `test/lib/homepage-rotating-words.test.ts`, `test/visual/website.visual.spec.ts` |
| Badges | `src/routes/badge.ts`, `src/lib/badge.ts` | `test/e2e/badge.test.ts`, `test/visual/badge.visual.spec.ts` |

For visual tests, API mocks and sample data live in `test/visual/fixtures/`; committed images live in `test/visual/screenshots/`. Check the current branch against `origin/main` before deciding a feature is absent; recent changes to labels, appearance, and embed behavior may already be there.

## Development Commands

Install dependencies with:

```bash
npm install
```

Run local development with Wrangler:

```bash
npm run dev
```

The dev server uses `wrangler.toml` and normally starts at `http://localhost:8787`.

## Verification

Run the narrowest checks that cover the change.

For most TypeScript source changes, run:

```bash
npm run typecheck
npm test -- --run
```

For targeted tests, prefer:

```bash
npm run test:unit
npm run test:e2e
```

For visual, embed, badge, or static website rendering changes, also run:

```bash
npm run typecheck:visual
npm run test:visual
```

Regenerate committed Playwright screenshots only for intentional visual changes:

```bash
npm run test:visual:update
```

Commit code and updated PNG snapshots together when visual output changes.

Before deployment-oriented changes, remember that `npm run deploy` is guarded by `predeploy`, which runs typecheck and the full Vitest suite.

## Code Style

- Use TypeScript and follow the existing module style.
- Prefer existing helpers in `src/lib/` before introducing new utilities.
- Keep Worker route handlers small and push reusable logic into `src/lib/` when it is shared.
- Keep runtime dependencies minimal; this project is designed for Cloudflare Workers.
- Preserve public API response shapes unless the docs and tests are updated at the same time.
- Keep embed and badge output stable, small, and friendly to third-party sites.

## Cloudflare And Data

- The `NICE_KV` binding is the primary storage contract.
- Be careful with changes to key formats, public IDs, private IDs, and visitor deduplication behavior; update migrations or compatibility notes when behavior changes.
- Keep privacy expectations intact: no accounts, no cookies, hashed visitor identifiers, and anonymous public interactions.
- Preview deploys use the `preview` environment; production deploys use the `production` environment in `wrangler.toml`.

## Website And Visuals

- `website/` is a static site surface for `nice.sbs`; avoid coupling it to local-only assumptions.
- `test/visual/screenshots/` contains intentionally committed visual fixtures for reviewable UI changes.
- When changing button themes, sizes, badge themes, iframe HTML, or `embed.js`, expect both e2e and visual tests to need attention.

## Documentation

- Update `README.md` and `docs/API.md` when public endpoints, embed snippets, themes, sizes, or button behavior change.
- Update `docs/DEPLOY.md` or `docs/SECURITY.md` when deployment, environment, abuse prevention, or privacy behavior changes.
- Keep Bruno requests in `bruno/` aligned with public API changes when practical.

## Git And Commits

- Use focused branches and PRs; keep unrelated local changes out of commits.
- Start work from the latest fresh changes from `origin`; fetch first and branch from the current remote base so local work is not built on stale history.
- Before opening or updating a PR, rebase the branch on the latest `origin/main` and resolve conflicts locally so the PR is current.
- When a PR's commits or scope change, update the PR description to match the work in progress so it stays in sync with the branch.
- Use conventional commit messages such as `feat:`, `fix:`, `docs:`, `ci:`, `test:`, and `chore:`.
- Prefer small commits that explain the intent of the change.
- No AI or tool attribution anywhere in git history. Commits and PR titles must read as human-authored work only.
- Do not add `Co-authored-by`, `Signed-off-by`, or any other trailer that credits an AI assistant, agent, or coding tool (Codex, Cursor, Claude, Copilot, etc.).
- Do not prefix commit messages or PR titles with tool markers such as `[codex]`, `[cursor]`, `[claude]`, or similar tags.
- Do not mention which tool drafted, reviewed, or generated the change in commit bodies, PR descriptions, or squash-merge messages unless a maintainer explicitly asks for that context outside git metadata.
- If a tool auto-inserts attribution, remove it before committing or opening a PR. Squash merges must not reintroduce attribution from branch commits.
- Respect existing uncommitted work; do not overwrite or revert changes you did not make without explicit instruction.

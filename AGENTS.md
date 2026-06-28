# Repository Guidance

## Scope

This repository builds Nice, an anonymous embeddable "nice" button service for websites.

The Cloudflare Worker API lives under `src/`:

- `src/index.ts` is the main Worker entry point and router.
- `src/routes/` owns API, embed, badge, and button-management route handlers.
- `src/lib/` contains shared utilities for IDs, hashing, formatting, rate limiting, URL handling, and badge rendering.
- `src/embed/` contains the iframe/embed template and script assets served by the Worker.
- `src/types/` contains Worker environment and shared TypeScript types.

The public static site lives in `website/`. API docs, deploy/security notes, and planning/spec material live in `docs/` and `openspec/`. Bruno API collections live in `bruno/`.

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

- Keep changes focused and avoid mixing unrelated cleanup with feature or fix work.
- Start work from the latest fresh changes from `origin`; fetch first and branch from the current remote base so local work is not built on stale history.
- Before opening or updating a PR, rebase the branch on the latest `origin/main` and resolve conflicts locally so the PR is current.
- Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `refactor:`, and `chore:`.
- Never add AI, assistant, or tool attribution anywhere in project history or collaboration surfaces. This includes commit messages, commit bodies, PR titles, PR descriptions, PR comments, review comments, changelog entries, release notes, and generated metadata.
- Respect existing uncommitted work; do not overwrite or revert changes you did not make without explicit instruction.

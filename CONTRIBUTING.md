# Contributing to Nice

Thanks for your interest in contributing to Nice! 🎉

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare Workers CLI)

### Setup

```bash
git clone https://github.com/GoodEggStudios/nice.git
cd nice
npm install
```

### Local Development

```bash
npm run dev
```

This starts a local Wrangler dev server at `http://localhost:8787`.

### Running Tests

```bash
npm test              # Watch mode
npm test -- --run     # Single run
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests only
npm run test:coverage # With coverage report
npm run typecheck     # TypeScript check
```

## Project Structure

```
src/
├── index.ts          # Main worker entry point & routing
├── types/            # TypeScript type definitions
├── lib/              # Shared utilities (hashing, IDs, rate limiting)
├── routes/           # API route handlers
│   ├── nice.ts       # Record/get nice counts
│   ├── buttons.ts    # Button management (create, stats, delete)
│   ├── embed.ts      # Embed script & page
│   └── badge.ts      # SVG badge generation
├── embed/            # Embed HTML template & JS
├── pages/            # Page renderers (home, create, docs)
└── assets/           # Static assets (favicon)

website/              # Static site (nice.sbs)
bruno/                # API collection (Bruno)
test/
├── lib/              # Unit tests for src/lib utilities
└── e2e/              # End-to-end API route tests
docs/                 # Active docs (API, deploy, security)
├── archive/          # Completed plans and historical specs
```

## Making Changes

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feat/your-feature`
3. **Make your changes** with clear, conventional commits
4. **Run tests**: `npm test -- --run && npm run typecheck`
5. **Open a PR** against `main`

### Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation
- `refactor:` — Code changes that don't add features or fix bugs
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

### Code Style

- TypeScript for all source files
- No external runtime dependencies (Cloudflare Workers only)
- Tests for all utility functions

## Self-Hosting

See [docs/DEPLOY.md](docs/DEPLOY.md) for instructions on deploying your own instance.

You'll need:
- A Cloudflare account
- A KV namespace
- Wrangler configured

## Reporting Issues

- Use GitHub Issues for bugs and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating new ones

## Security

If you find a security vulnerability, please **do not** open a public issue. Instead, email the maintainers directly or use GitHub's private security advisory feature.

See [docs/SECURITY.md](docs/SECURITY.md) for our security documentation.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

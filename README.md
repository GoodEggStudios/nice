# Nice 👍

[![Nice](https://api.nice.sbs/badge/n_iSoPXADYGp0Q.svg)](https://nice.sbs/button?id=n_iSoPXADYGp0Q)

> The anonymous nice button — no sign-in required

**[nice.sbs](https://nice.sbs)** — *Simple Button Service*

## What is Nice?

Nice is an embeddable "nice" button that doesn't require users to create an account or sign in. Site owners register to get a button, visitors click to nice. That's it.

It's not liking. It's **nice'ing**.

## Why?

- **For users**: No login walls, no tracking, just say "nice!"
- **For site owners**: Simple integration, spam-resistant, privacy-friendly

## Quick Start

### 1. Register your site

```bash
curl -X POST https://nice.sbs/api/v1/sites \
  -H "Content-Type: application/json" \
  -d '{"domain": "yoursite.com"}'
```

### 2. Verify your domain

Add the DNS TXT record from the response, then:

```bash
curl -X POST https://nice.sbs/api/v1/sites/{site_id}/verify
```

### 3. Create a button

```bash
curl -X POST https://nice.sbs/api/v1/buttons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer nice_your_token" \
  -d '{"name": "My Page", "url": "https://yoursite.com/page"}'
```

### 4. Embed it

```html
<script 
  src="https://nice.sbs/embed.js" 
  data-button="btn_abc123"
  async>
</script>
```

That's it! 🎉

## Themes

```html
<!-- Light (default) -->
<script src="https://nice.sbs/embed.js" data-button="btn_xxx" async></script>

<!-- Dark -->
<script src="https://nice.sbs/embed.js" data-button="btn_xxx" data-theme="dark" async></script>

<!-- Minimal (transparent) -->
<script src="https://nice.sbs/embed.js" data-button="btn_xxx" data-theme="minimal" async></script>
```

## Documentation

- [API Reference](docs/API.md) — Full API documentation
- [Deployment Guide](docs/DEPLOY.md) — Self-hosting instructions
- [Specification](openspec/specs/NICE.md) — Technical spec

## Features

- ✅ No user accounts for visitors
- ✅ DNS-based domain verification
- ✅ Rate limiting & anti-spam
- ✅ Proof-of-work for burst attacks
- ✅ Light/dark/minimal themes
- ✅ Optimistic UI updates
- ✅ GDPR-friendly (no cookies, hashed IPs)

## Tech Stack

- **Runtime**: Cloudflare Workers (edge)
- **Storage**: Cloudflare KV
- **Domain**: nice.sbs

## Development

```bash
# Install
npm install

# Local dev
wrangler dev

# Deploy
wrangler deploy
```

## License

MIT

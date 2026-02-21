<p align="center">
  <img src="website/nice-logo.svg" alt="NICE" width="300">
</p>

<p align="center">
  <a href="https://nice.sbs/button?id=n_iSoPXADYGp0Q"><img src="https://api.nice.sbs/badge/n_iSoPXADYGp0Q.svg" alt="Nice"></a>
</p>

<p align="center">
  <em>The anonymous nice button — no sign-in required</em>
</p>

<p align="center">
  <a href="https://nice.sbs">Website</a> · <a href="https://nice.sbs/create">Create a Button</a> · <a href="https://nice.sbs/docs">API Docs</a>
</p>

---

## What is Nice?

**[nice.sbs](https://nice.sbs)** is an embeddable "nice" button for any website. No accounts, no sign-ups, no cookies — visitors just click to say "nice" and move on.

It's not liking. It's **nice'ing**.

## Quick Start

### Create a button

Head to **[nice.sbs/create](https://nice.sbs/create)** and enter your URL. You'll get:

- A **public ID** for embedding (`n_xxxx`)
- A **private ID** for managing your button (`ns_xxxx`)

Or use the API:

```bash
curl -X POST https://api.nice.sbs/api/v1/buttons \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yoursite.com"}'
```

### Embed it

**Option 1: Script tag**

```html
<script src="https://nice.sbs/embed.js" data-button="n_xxxx" async></script>
```

**Option 2: Iframe**

```html
<iframe
  src="https://api.nice.sbs/e/n_xxxx"
  style="border:none; width:100px; height:36px;"
  title="Nice button">
</iframe>
```

That's it! 🎉

### Markdown Badge

Display your nice count in any README or markdown file:

```markdown
[![Nice](https://api.nice.sbs/badge/n_xxxx.svg)](https://nice.sbs/button?id=n_xxxx)
```

## Themes & Sizes

Customise the look with `theme` and `size` parameters:

```html
<!-- Dark theme, medium size (default) -->
<script src="https://nice.sbs/embed.js" data-button="n_xxxx" data-theme="dark" async></script>

<!-- Minimal (transparent background) -->
<script src="https://nice.sbs/embed.js" data-button="n_xxxx" data-theme="minimal" async></script>

<!-- Mono dark / Mono light -->
<script src="https://nice.sbs/embed.js" data-button="n_xxxx" data-theme="mono-dark" async></script>
```

**Themes:** `light` · `dark` · `minimal` · `mono-dark` · `mono-light`

**Sizes:** `xs` · `sm` · `md` · `lg` · `xl`

## Button Stats

Check how many nice's your button has:

```bash
curl https://api.nice.sbs/api/v2/buttons/stats/ns_your_private_id
```

Or visit `nice.sbs/stats?id=ns_your_private_id`

## Features

- ✅ Zero-friction — no accounts, no sign-ups
- ✅ Embeddable anywhere — script tag, iframe, or markdown badge
- ✅ Five themes and five sizes
- ✅ Rate limiting and anti-spam (proof-of-work for bursts)
- ✅ GDPR-friendly — no cookies, hashed IPs
- ✅ Optimistic UI — button responds instantly
- ✅ Edge-deployed — fast everywhere

## API

Full API docs at **[nice.sbs/docs](https://nice.sbs/docs)** or in [docs/API.md](docs/API.md).

| Endpoint | Description |
|---|---|
| `POST /api/v1/buttons` | Create a button |
| `POST /api/v1/nice/:id` | Record a nice |
| `GET /api/v1/nice/:id` | Get nice count |
| `GET /api/v1/buttons/stats/:private_id` | Button stats |
| `GET /badge/:id.svg` | Markdown badge |
| `DELETE /api/v1/buttons/:private_id` | Delete button |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Storage**: Cloudflare KV
- **Domain**: [nice.sbs](https://nice.sbs)
- **API**: [api.nice.sbs](https://api.nice.sbs)

## Development

```bash
npm install
npm run dev      # Local dev server
npm run test     # Run tests
npm run deploy   # Deploy to Cloudflare
```

## Links

- 🌐 **Website**: [nice.sbs](https://nice.sbs)
- 🔧 **Create**: [nice.sbs/create](https://nice.sbs/create)
- 📖 **Docs**: [nice.sbs/docs](https://nice.sbs/docs)
- 🔒 **Security**: [SECURITY.md](docs/SECURITY.md)

## License

Apache 2.0

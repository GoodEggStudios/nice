# Deployment Guide

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Node.js 18+

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespaces

```bash
# Production
wrangler kv namespace create NICE_KV

# Preview (for local dev)
wrangler kv namespace create NICE_KV --preview
```

Copy the example config and fill in your IDs:

```bash
# Edit wrangler.toml with your KV namespace IDs
```

Edit `wrangler.toml` with the namespace IDs from above.

### 4. Deploy

```bash
# Deploy to production
wrangler deploy

# Or deploy to preview
wrangler deploy --env preview
```

## Custom Domain

### Option A: Cloudflare Dashboard

1. Go to Workers & Pages → your worker
2. Click "Triggers" tab
3. Add Custom Domain: `nice.sbs` (or your domain)
4. Cloudflare handles SSL automatically

### Option B: Via wrangler.toml

```toml
routes = [
  { pattern = "nice.sbs/*", zone_name = "sbs" }
]
```

Then deploy:

```bash
wrangler deploy
```

## Local Development

```bash
# Start local dev server
wrangler dev

# With local KV persistence
wrangler dev --persist
```

The worker runs at `http://localhost:8787`

## Testing the API

### Register a test site

```bash
curl -X POST http://localhost:8787/api/v1/sites \
  -H "Content-Type: application/json" \
  -d '{"domain": "test.localhost"}'
```

### Create a button (after verification)

```bash
curl -X POST http://localhost:8787/api/v1/buttons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer nice_your_token" \
  -d '{"name": "Test", "url": "http://test.localhost/page"}'
```

### Test the embed

Open in browser:
```
http://localhost:8787/embed/btn_your_button_id
```

## Environment Variables

No secrets required! Everything uses KV storage.

## Monitoring

View logs in real-time:

```bash
wrangler tail
```

Or in the Cloudflare Dashboard under Workers → Logs.

## Troubleshooting

### "KV namespace not found"

Make sure the KV namespace IDs in `wrangler.toml` match your actual namespaces:

```bash
wrangler kv namespace list
```

### "Domain not verified"

1. Check DNS TXT record is set correctly
2. Wait a few minutes for DNS propagation
3. Try verification again

### CORS errors

The API includes CORS headers for all origins. If you see CORS errors:
- Check you're using the correct URL
- Ensure the request method is allowed (GET, POST, DELETE, OPTIONS)

## Production Checklist

- [ ] KV namespaces created (prod + preview)
- [ ] wrangler.toml configured with correct IDs
- [ ] Custom domain added and verified
- [ ] Test site registration flow
- [ ] Test button creation flow
- [ ] Test embed on a real page
- [ ] Monitor logs for errors

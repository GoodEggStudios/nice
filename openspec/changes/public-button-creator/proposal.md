## Why

The current site registration + DNS verification flow prevents content creators from using Nice buttons on platforms they don't own (Medium, Substack, dev.to, GitHub, etc.). We need a zero-friction button creation flow that works anywhere while maintaining security and providing a path to full management.

## What Changes

- **New button creator UI**: Simple form on homepage — paste URL, get embed snippet
- **Public + private ID system**: Public ID for embedding, private ID for management (shown once, save it)
- **API-driven creation**: The form uses the same API endpoint, enabling programmatic creation
- **Stats page**: View count and URL via private ID, no account required
- **Remove DNS verification**: No longer required for button creation
- **BREAKING**: Existing site/button management endpoints deprecated (sites, DNS verify)
- **Future-ready**: Private ID enables "claim to account" later

## Capabilities

### New Capabilities
- `button-creator`: Homepage form for zero-friction button creation (URL input, theme/size picker, snippet output)
- `public-private-ids`: Dual ID generation — random public ID for embeds, random private ID for management
- `button-stats`: Stats page accessible via private ID (count, URL, created date, claim flow later)
- `button-api-v2`: New unauthenticated button creation endpoint (`POST /api/v2/buttons`) with rate limiting

### Modified Capabilities
- `embed-widget`: Support new ID format (`n_xxx`) alongside existing (`btn_xxx`)
- `anti-spam`: Add rate limiting for button creation (IP-based: 10/hour, 50/day), captcha trigger

## Impact

- **API**: New `/api/v2/buttons` endpoint (create without auth), deprecate `/api/v1/sites/*`
- **Frontend**: New button creator form on homepage, stats page at `/stats/:private_id`
- **Storage**: New KV schema for buttons with hashed private IDs
- **Embed**: Support both `btn_xxx` (legacy) and `n_xxx` (new) formats
- **Security**: Rate limiting by IP, captcha integration, private ID hashing
- **Deprecation**: Site registration, DNS verification, token-based auth (keep for v1 compat)

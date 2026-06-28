## Why

There's no simple way to add a "like" button to a website without requiring users to sign in. Existing solutions (Facebook Like, Twitter hearts) require accounts and track users across the web. Site owners want to let visitors express appreciation with zero friction, and users want to say "nice!" without creating yet another account.

## What Changes

- New embeddable "nice" button widget for any website
- Site owner registration and button management API
- Anonymous spam-resistant nice'ing system (no user accounts)
- Edge-deployed API for sub-100ms response times

## Capabilities

### New Capabilities

- `embed-widget`: Embeddable nice button (iframe + script tag) with theming support
- `site-registration`: Site owner signup and API token management
- `button-management`: Create, list, and delete nice buttons per site
- `nice-api`: Public endpoint to record nices and get counts
- `anti-spam`: Visitor fingerprinting, rate limiting, and proof-of-work escalation

### Modified Capabilities

(none — new project)

## Impact

- **Infrastructure**: Cloudflare Workers + KV for edge deployment
- **APIs**: Public embed/nice endpoints, authenticated site management endpoints
- **Privacy**: No PII stored, no cross-site tracking, GDPR compliant
- **Integration**: Site owners add single script tag or iframe to their pages

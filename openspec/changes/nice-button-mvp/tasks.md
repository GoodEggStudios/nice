## 1. Project Setup

- [ ] 1.1 Initialize Cloudflare Workers project with Wrangler
- [ ] 1.2 Configure KV namespaces (prod and preview bindings)
- [ ] 1.3 Set up TypeScript and project structure (src/routes, src/lib, src/types)
- [ ] 1.4 Add testing framework (vitest with miniflare)

## 2. Core Utilities

- [ ] 2.1 Implement token generation utility (`nice_` + 32 random bytes base64)
- [ ] 2.2 Implement SHA-256 hashing utility for tokens and visitor hashes
- [ ] 2.3 Implement daily salt generation and rotation
- [ ] 2.4 Implement count formatting utility (1.2M, 500K abbreviations)
- [ ] 2.5 Implement domain validation utility

## 3. Site Registration API

- [ ] 3.1 Create POST /api/v1/sites endpoint for site registration
- [ ] 3.2 Implement domain uniqueness check
- [ ] 3.3 Generate and return verification token with DNS instructions
- [ ] 3.4 Create POST /api/v1/sites/{site_id}/verify endpoint for DNS verification
- [ ] 3.5 Implement DNS TXT record lookup for verification
- [ ] 3.6 Create POST /api/v1/sites/{site_id}/token/regenerate endpoint

## 4. Authentication Middleware

- [ ] 4.1 Implement bearer token extraction from Authorization header
- [ ] 4.2 Implement token hash lookup and validation against KV
- [ ] 4.3 Create authentication middleware that attaches site context
- [ ] 4.4 Implement token redaction in logging

## 5. Button Management API

- [ ] 5.1 Create POST /api/v1/buttons endpoint for button creation
- [ ] 5.2 Implement URL domain validation against site's verified domain
- [ ] 5.3 Implement URL uniqueness check per site
- [ ] 5.4 Generate button_id with `btn_` prefix
- [ ] 5.5 Create GET /api/v1/buttons endpoint with pagination (cursor-based)
- [ ] 5.6 Create GET /api/v1/buttons/{button_id} endpoint
- [ ] 5.7 Create DELETE /api/v1/buttons/{button_id} endpoint
- [ ] 5.8 Generate embed code snippets in button responses

## 6. Nice Recording API

- [ ] 6.1 Create POST /api/v1/nice/{button_id} endpoint
- [ ] 6.2 Implement visitor hash generation (IP + fingerprint + button_id + daily_salt)
- [ ] 6.3 Implement 24-hour deduplication check using KV with TTL
- [ ] 6.4 Implement atomic count increment in KV
- [ ] 6.5 Create GET /api/v1/nice/{button_id}/count endpoint
- [ ] 6.6 Verify site is verified before accepting nices

## 7. Rate Limiting

- [ ] 7.1 Implement per-IP rate limiting (20/min) with KV counters
- [ ] 7.2 Implement per-button rate limiting (100/min)
- [ ] 7.3 Implement burst detection (500/min threshold)
- [ ] 7.4 Implement proof-of-work challenge generation
- [ ] 7.5 Implement proof-of-work solution verification
- [ ] 7.6 Implement difficulty scaling based on attack intensity
- [ ] 7.7 Implement automatic PoW mode exit after 5 minutes of low traffic

## 8. Embed Script

- [ ] 8.1 Create embed.js script loader
- [ ] 8.2 Implement iframe creation at script location
- [ ] 8.3 Pass button_id and theme config via iframe URL params
- [ ] 8.4 Implement postMessage handler for iframe resize events
- [ ] 8.5 Implement origin validation for postMessage security

## 9. Embed UI (iframe content)

- [ ] 9.1 Create nice button HTML/CSS component
- [ ] 9.2 Implement light theme styles
- [ ] 9.3 Implement dark theme styles
- [ ] 9.4 Implement minimal theme with transparent background
- [ ] 9.5 Implement click animation (pulse/burst effect)
- [ ] 9.6 Implement "niced" visual state (filled icon)
- [ ] 9.7 Implement shake animation for repeat clicks
- [ ] 9.8 Implement optimistic count update on click
- [ ] 9.9 Implement lightweight fingerprint collection
- [ ] 9.10 Implement postMessage resize notifications to parent

## 10. Security & Hardening

- [ ] 10.1 Set iframe sandbox attributes (allow-scripts allow-same-origin)
- [ ] 10.2 Implement CORS headers for API endpoints
- [ ] 10.3 Implement abuse logging (hashed IPs, retained 7 days)
- [ ] 10.4 Add input validation for all API endpoints
- [ ] 10.5 Implement error responses with appropriate HTTP status codes

## 11. Deployment & Configuration

- [ ] 11.1 Configure custom domain in Cloudflare
- [ ] 11.2 Set up wrangler.toml for production deployment
- [ ] 11.3 Create initial site registration for testing
- [ ] 11.4 Document API endpoints and embed usage

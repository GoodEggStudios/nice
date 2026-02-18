## 1. Core Infrastructure

- [ ] 1.1 Add ID generation utilities (n_xxx public, ns_xxx private, base62)
- [ ] 1.2 Add URL normalization utility (strip query params, trailing slash, lowercase host)
- [ ] 1.3 Update KV storage schema for v2 buttons (id, secret_hash, url, restriction, creator_ip_hash, count, created_at)
- [ ] 1.4 Add secret lookup index (secret:hash → public_id)
- [ ] 1.5 Add hash utilities for private ID and IP storage

## 2. API v2 - Button Creation

- [ ] 2.1 Create POST /api/v2/buttons endpoint structure
- [ ] 2.2 Implement request validation (url required, valid format)
- [ ] 2.3 Implement optional params (theme, size, restriction with defaults)
- [ ] 2.4 Generate public + private IDs
- [ ] 2.5 Store button in KV with hashed secret
- [ ] 2.6 Store secret lookup index
- [ ] 2.7 Return response with IDs and embed snippets
- [ ] 2.8 Hash and store creator IP

## 3. API v2 - Stats & Management

- [ ] 3.1 Create GET /api/v2/buttons/stats/:private_id endpoint
- [ ] 3.2 Implement private ID → public ID lookup
- [ ] 3.3 Return button data (id, url, count, created_at, restriction)
- [ ] 3.4 Create DELETE /api/v2/buttons/:private_id endpoint
- [ ] 3.5 Implement button deletion (remove button + secret index)
- [ ] 3.6 Add 404 handling for invalid private IDs

## 4. Referrer Verification

- [ ] 4.1 Add referrer extraction from request headers
- [ ] 4.2 Implement URL normalization for comparison
- [ ] 4.3 Implement domain extraction for domain mode
- [ ] 4.4 Add restriction check to nice endpoint (POST /api/v1/nice/:id)
- [ ] 4.5 Return 403 for referrer mismatch with appropriate error message
- [ ] 4.6 Handle missing referrer header (reject for url/domain, allow for global)

## 5. Rate Limiting for Creation

- [ ] 5.1 Add creation rate limit storage keys (ratelimit:ip:hash:create:hour, :day)
- [ ] 5.2 Implement hourly limit check (10/hour)
- [ ] 5.3 Implement daily limit check (50/day)
- [ ] 5.4 Add TTL-based counter increment
- [ ] 5.5 Return 429 with appropriate message when limits exceeded
- [ ] 5.6 Add captcha trigger threshold (5 creates/hour)
- [ ] 5.7 Integrate Cloudflare Turnstile for captcha
- [ ] 5.8 Accept and validate captcha token in creation request

## 6. Embed Updates

- [ ] 6.1 Add /e/:id short route (alias to /embed/:id)
- [ ] 6.2 Support n_xxx ID format in embed routes
- [ ] 6.3 Validate ID format before KV lookup (n_ or btn_ prefix)
- [ ] 6.4 Load v2 button data for n_ prefixed IDs

## 7. Create Page UI

- [ ] 7.1 Create /create page route
- [ ] 7.2 Build form HTML (URL input, theme/size/restriction selectors)
- [ ] 7.3 Add theme options (light, dark, minimal, mono-dark, mono-light)
- [ ] 7.4 Add size options (xs, sm, md, lg, xl)
- [ ] 7.5 Add restriction options with descriptions (URL, Domain, Global)
- [ ] 7.6 Implement form submission to API
- [ ] 7.7 Display success state with public ID, private ID, warning
- [ ] 7.8 Add copy button for embed snippet
- [ ] 7.9 Add live preview with selected theme/size
- [ ] 7.10 Add client-side URL validation
- [ ] 7.11 Handle and display API errors

## 8. Stats Page UI

- [ ] 8.1 Create /stats/:private_id page route
- [ ] 8.2 Set Referrer-Policy: no-referrer header
- [ ] 8.3 Fetch and display button data (count, URL, created date, restriction)
- [ ] 8.4 Display public ID
- [ ] 8.5 Display embed snippet with copy button
- [ ] 8.6 Add delete button with confirmation dialog
- [ ] 8.7 Implement delete flow (API call, redirect to homepage)
- [ ] 8.8 Add "Claim to account" placeholder section
- [ ] 8.9 Add Nice branding and homepage link
- [ ] 8.10 Handle invalid private ID (404 page)

## 9. Homepage Update

- [ ] 9.1 Update "Get Started" button to link to /create

## 10. Docs Update

- [ ] 10.1 Update /docs page with v2 API documentation
- [ ] 10.2 Document POST /api/v2/buttons endpoint
- [ ] 10.3 Document GET /api/v2/buttons/stats/:private_id endpoint
- [ ] 10.4 Document DELETE /api/v2/buttons/:private_id endpoint
- [ ] 10.5 Document restriction modes (url, domain, global)
- [ ] 10.6 Add migration note for v1 → v2

## 11. Testing

- [ ] 11.1 Test button creation flow end-to-end
- [ ] 11.2 Test referrer verification (all three modes)
- [ ] 11.3 Test rate limiting triggers
- [ ] 11.4 Test stats page access with valid/invalid IDs
- [ ] 11.5 Test button deletion
- [ ] 11.6 Test embed with new n_ ID format
- [ ] 11.7 Test URL normalization edge cases

## 12. Deployment

- [ ] 12.1 Deploy to preview environment
- [ ] 12.2 Verify all routes work
- [ ] 12.3 Test with real button creation
- [ ] 12.4 Deploy to production
- [ ] 12.5 Verify production deployment

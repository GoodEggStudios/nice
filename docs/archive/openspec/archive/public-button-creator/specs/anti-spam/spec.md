## MODIFIED Requirements

### Requirement: Rate limiting for button creation
The system SHALL rate limit button creation by IP address.

#### Scenario: Under hourly limit
- **WHEN** IP has created fewer than 10 buttons in the last hour
- **THEN** creation is allowed

#### Scenario: Hourly limit exceeded
- **WHEN** IP has created 10 or more buttons in the last hour
- **THEN** system returns 429 with error "Rate limit exceeded. Try again later."

#### Scenario: Daily limit exceeded
- **WHEN** IP has created 50 or more buttons in the last 24 hours
- **THEN** system returns 429 with error "Daily limit exceeded. Try again tomorrow."

## ADDED Requirements

### Requirement: Creator IP tracking
The system SHALL store a hash of the creator's IP address with each button.

#### Scenario: IP hash stored
- **WHEN** button is created
- **THEN** creator_ip_hash field contains SHA256 of CF-Connecting-IP

### Requirement: Rate limit storage
The system SHALL track creation counts in KV with TTL-based expiry.

#### Scenario: Hourly counter
- **WHEN** button is created
- **THEN** ratelimit:ip:<hash>:create:hour counter is incremented with 1-hour TTL

#### Scenario: Daily counter
- **WHEN** button is created
- **THEN** ratelimit:ip:<hash>:create:day counter is incremented with 24-hour TTL

### Requirement: Captcha trigger
The system SHALL require captcha after 5 creates per IP per hour.

#### Scenario: Under captcha threshold
- **WHEN** IP has created fewer than 5 buttons this hour
- **THEN** no captcha required

#### Scenario: Captcha required
- **WHEN** IP has created 5 or more buttons this hour
- **THEN** system returns 429 with captcha_required: true and challenge token

#### Scenario: Valid captcha bypasses limit
- **WHEN** request includes valid captcha token
- **THEN** creation proceeds even if over threshold (up to hard limit)

### Requirement: Abuse pattern detection
The system SHALL log suspicious patterns for manual review.

#### Scenario: High volume detection
- **WHEN** single IP creates more than 20 buttons in an hour
- **THEN** pattern is logged with IP hash and timestamp

### Requirement: Stats endpoint rate limiting
The system SHALL rate limit stats endpoint requests.

#### Scenario: Stats rate limit
- **WHEN** more than 60 requests to /stats/:id in 1 minute from same IP
- **THEN** system returns 429

### Requirement: Referrer verification on nice
The system SHALL verify the Referer header against the button's restriction mode.

#### Scenario: URL mode - exact match
- **WHEN** button has restriction="url" AND Referer matches stored URL (normalized)
- **THEN** nice is allowed

#### Scenario: URL mode - mismatch
- **WHEN** button has restriction="url" AND Referer does not match stored URL
- **THEN** system returns 403 with error "Nice not allowed from this page"

#### Scenario: Domain mode - same domain
- **WHEN** button has restriction="domain" AND Referer domain matches stored URL domain
- **THEN** nice is allowed

#### Scenario: Domain mode - different domain
- **WHEN** button has restriction="domain" AND Referer domain differs from stored URL domain
- **THEN** system returns 403 with error "Nice not allowed from this domain"

#### Scenario: Global mode
- **WHEN** button has restriction="global"
- **THEN** nice is allowed regardless of Referer

#### Scenario: Missing Referer header with URL/domain restriction
- **WHEN** button has restriction="url" or "domain" AND Referer header is missing
- **THEN** system returns 403 with error "Referer header required"

#### Scenario: Missing Referer header with global restriction
- **WHEN** button has restriction="global" AND Referer header is missing
- **THEN** nice is allowed

### Requirement: URL normalization for comparison
The system SHALL normalize URLs before comparison.

#### Scenario: Strip query parameters
- **WHEN** Referer is "https://dev.to/post?utm=twitter" AND stored URL is "https://dev.to/post"
- **THEN** URLs are considered matching

#### Scenario: Strip trailing slash
- **WHEN** Referer is "https://dev.to/post/" AND stored URL is "https://dev.to/post"
- **THEN** URLs are considered matching

#### Scenario: Case insensitive hostname
- **WHEN** Referer is "https://DEV.TO/post" AND stored URL is "https://dev.to/post"
- **THEN** URLs are considered matching

#### Scenario: Path is case sensitive
- **WHEN** Referer is "https://dev.to/POST" AND stored URL is "https://dev.to/post"
- **THEN** URLs are NOT considered matching

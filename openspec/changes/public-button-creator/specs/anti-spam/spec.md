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

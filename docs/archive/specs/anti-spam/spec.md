# anti-spam Specification

## Purpose
TBD - created by archiving change nice-button-mvp. Update Purpose after archive.
## Requirements
### Requirement: IP rate limiting
The system SHALL enforce per-IP rate limits to prevent spam.

Limit: 20 nice requests per minute per IP address.

#### Scenario: Under rate limit
- **WHEN** an IP address makes 19 nice requests in one minute
- **THEN** all requests are processed normally

#### Scenario: Rate limit exceeded
- **WHEN** an IP address makes 21 nice requests in one minute
- **THEN** the 21st request returns HTTP 429 Too Many Requests
- **AND** the response includes `Retry-After` header with seconds until limit resets

#### Scenario: Rate limit reset
- **WHEN** an IP address is rate limited
- **AND** 60 seconds pass with no requests
- **THEN** the rate limit counter resets
- **AND** the IP can make requests again

### Requirement: Per-button rate limiting
The system SHALL enforce per-button rate limits to prevent targeted attacks.

Limit: 100 nice requests per minute per button.

#### Scenario: Button rate limit exceeded
- **WHEN** a button receives 101 nice requests in one minute (from any IPs)
- **THEN** requests return HTTP 429 Too Many Requests
- **AND** proof-of-work mode is triggered for that button

### Requirement: Burst detection
The system SHALL detect burst attacks and escalate to proof-of-work.

Threshold: 500 requests per minute on a single button triggers PoW mode.

#### Scenario: Burst detected
- **WHEN** a button receives 500+ requests in one minute
- **THEN** the button enters proof-of-work mode
- **AND** subsequent requests without valid PoW are rejected with HTTP 429
- **AND** the response includes a PoW challenge

#### Scenario: Burst mode duration
- **WHEN** a button is in proof-of-work mode
- **AND** the request rate drops below 100/minute for 5 minutes
- **THEN** the button exits proof-of-work mode
- **AND** normal requests are accepted again

### Requirement: Proof-of-work challenge
When in PoW mode, the system SHALL require clients to solve a hashcash-style puzzle.

Challenge format:
```json
{
  "challenge": "<random_bytes_base64>",
  "difficulty": 16,
  "expires_at": "<timestamp>"
}
```

Solution: Find a nonce such that `SHA256(challenge + nonce)` has `difficulty` leading zero bits.

#### Scenario: PoW challenge issued
- **WHEN** a nice request is made to a button in PoW mode without a solution
- **THEN** the response is HTTP 429 with a `pow_challenge` object
- **AND** the challenge expires in 60 seconds

#### Scenario: Valid PoW solution
- **WHEN** a nice request includes a valid PoW solution
- **THEN** the nice is processed normally
- **AND** the solution cannot be reused

#### Scenario: Invalid PoW solution
- **WHEN** a nice request includes an invalid PoW solution
- **THEN** the request is rejected with HTTP 400 Bad Request

#### Scenario: Expired PoW challenge
- **WHEN** a nice request includes a solution for an expired challenge
- **THEN** the request is rejected with HTTP 400
- **AND** a new challenge is issued

### Requirement: Difficulty adjustment
The PoW difficulty SHALL scale based on attack intensity.

| Request rate (per minute) | Difficulty (leading zero bits) |
|---------------------------|-------------------------------|
| 500-1000                  | 16 (~100ms solve time)        |
| 1000-5000                 | 18 (~400ms solve time)        |
| 5000+                     | 20 (~1.6s solve time)         |

#### Scenario: Difficulty scales up
- **WHEN** attack intensity increases from 500/min to 2000/min
- **THEN** the PoW difficulty increases from 16 to 18 bits

#### Scenario: Difficulty scales down
- **WHEN** attack intensity decreases from 2000/min to 600/min
- **THEN** the PoW difficulty decreases from 18 to 16 bits

### Requirement: Rate limit storage
Rate limit counters SHALL be stored in KV with automatic expiry.

```
rate:{ip}:{minute}       → count    // TTL: 60s
burst:{button_id}        → count    // TTL: 60s  
pow:{button_id}          → { active: true, difficulty: N, since: timestamp }  // TTL: 5min after deactivation
```

#### Scenario: Counter cleanup
- **WHEN** a rate limit counter's TTL expires
- **THEN** the counter is automatically deleted
- **AND** no manual cleanup is required

### Requirement: Abuse logging
The system SHALL log suspected abuse patterns for review.

#### Scenario: Abuse event logged
- **WHEN** an IP exceeds rate limits 5+ times in an hour
- **THEN** an abuse event is logged with IP (hashed), button_id, and timestamps
- **AND** the log is retained for 7 days

#### Scenario: No PII in logs
- **WHEN** abuse events are logged
- **THEN** IP addresses are stored as SHA256 hashes (not plaintext)
- **AND** no other PII is included

### Requirement: Geographic distribution resilience
Rate limiting SHALL work correctly across edge locations.

#### Scenario: Distributed rate limiting
- **WHEN** requests from the same IP hit different edge locations
- **THEN** rate limits are enforced globally (eventual consistency acceptable)
- **AND** brief overages (<10%) are tolerated during propagation


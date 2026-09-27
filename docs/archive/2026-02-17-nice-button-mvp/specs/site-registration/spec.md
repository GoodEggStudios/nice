## ADDED Requirements

### Requirement: Site registration endpoint
The system SHALL provide an endpoint to register a new site.

```
POST /api/v1/sites
Content-Type: application/json

{
  "domain": "example.com",
  "email": "owner@example.com"
}
```

The endpoint SHALL return the site ID and API token.

#### Scenario: Successful registration
- **WHEN** a valid domain and email are submitted
- **THEN** the system creates a new site record
- **AND** returns a response with `site_id` and `token`
- **AND** the token is prefixed with `nice_`

#### Scenario: Duplicate domain registration
- **WHEN** a domain that is already registered is submitted
- **THEN** the system returns HTTP 409 Conflict
- **AND** the response includes error message "Domain already registered"

#### Scenario: Invalid domain format
- **WHEN** an invalid domain (e.g., "not-a-domain", "http://example.com") is submitted
- **THEN** the system returns HTTP 400 Bad Request
- **AND** the response includes validation error details

### Requirement: Domain ownership verification
The system SHALL verify domain ownership before activating a site.

Verification SHALL be via DNS TXT record.

#### Scenario: DNS verification instructions
- **WHEN** a site is registered
- **THEN** the response includes a `verification_token`
- **AND** instructions to add a TXT record: `_nice-verify.{domain}` with value `nice-verify={verification_token}`

#### Scenario: Successful verification
- **WHEN** the site owner calls `POST /api/v1/sites/{site_id}/verify`
- **AND** the DNS TXT record is correctly configured
- **THEN** the site status changes to "verified"
- **AND** buttons for the site become active

#### Scenario: Verification failure
- **WHEN** the site owner calls `POST /api/v1/sites/{site_id}/verify`
- **AND** the DNS TXT record is missing or incorrect
- **THEN** the system returns HTTP 400 with error "Verification failed"
- **AND** includes the expected TXT record value

### Requirement: API token management
Site owners SHALL be able to regenerate their API token.

#### Scenario: Token regeneration
- **WHEN** an authenticated request is made to `POST /api/v1/sites/{site_id}/token/regenerate`
- **THEN** the system generates a new token
- **AND** invalidates the previous token immediately
- **AND** returns the new token (this is the only time it's visible)

### Requirement: Token authentication
API requests requiring site owner authentication SHALL use bearer token authentication.

```
Authorization: Bearer nice_xxxxx...
```

#### Scenario: Valid token authentication
- **WHEN** a request includes a valid bearer token
- **THEN** the request is authenticated as the token's site owner
- **AND** the request proceeds normally

#### Scenario: Missing token
- **WHEN** a request to a protected endpoint lacks an Authorization header
- **THEN** the system returns HTTP 401 Unauthorized

#### Scenario: Invalid token
- **WHEN** a request includes an invalid or expired token
- **THEN** the system returns HTTP 401 Unauthorized
- **AND** the response includes error "Invalid or expired token"

### Requirement: Token security
API tokens SHALL be stored securely and never logged.

#### Scenario: Token storage
- **WHEN** a token is created
- **THEN** only the SHA-256 hash of the token is stored in KV
- **AND** the plaintext token is returned to the user once and never stored

#### Scenario: Token in logs
- **WHEN** any request is logged
- **THEN** the Authorization header value is redacted to `Bearer nice_***`

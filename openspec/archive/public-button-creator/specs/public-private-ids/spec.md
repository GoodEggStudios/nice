## ADDED Requirements

### Requirement: Public ID format
The system SHALL generate public IDs in the format `n_<8 base62 characters>`.

#### Scenario: Public ID structure
- **WHEN** a new button is created
- **THEN** public_id matches pattern `n_[A-Za-z0-9]{8}`

### Requirement: Private ID format
The system SHALL generate private IDs in the format `ns_<20 base62 characters>`.

#### Scenario: Private ID structure
- **WHEN** a new button is created
- **THEN** private_id matches pattern `ns_[A-Za-z0-9]{20}`

### Requirement: Random ID generation
The system SHALL generate IDs using cryptographically secure random bytes.

#### Scenario: IDs are unique
- **WHEN** 1000 buttons are created
- **THEN** all public_ids are unique AND all private_ids are unique

### Requirement: Private ID shown once
The system SHALL only return the private ID in the creation response.

#### Scenario: Private ID not in stats response
- **WHEN** user requests GET /api/v2/buttons/stats/:private_id
- **THEN** response does NOT include the private_id field

#### Scenario: Private ID only on create
- **WHEN** button is created
- **THEN** private_id is included in response exactly once (creation response only)

### Requirement: Private ID storage
The system SHALL store only the SHA256 hash of private IDs, never the plaintext.

#### Scenario: Private ID hashed in KV
- **WHEN** button is stored in KV
- **THEN** secret_hash field contains SHA256 hash, not plaintext

### Requirement: Private ID lookup
The system SHALL maintain a lookup index from private ID hash to public ID.

#### Scenario: Lookup enables stats access
- **WHEN** user provides private_id to stats endpoint
- **THEN** system hashes it, looks up public ID, and returns button data

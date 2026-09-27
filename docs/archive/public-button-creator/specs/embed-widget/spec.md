## MODIFIED Requirements

### Requirement: Support multiple ID formats
The system SHALL support both legacy `btn_xxx` IDs and new `n_xxx` IDs in embed routes.

#### Scenario: Legacy ID format
- **WHEN** embed is requested with /embed/btn_abc123
- **THEN** system serves the button embed

#### Scenario: New ID format via /embed
- **WHEN** embed is requested with /embed/n_x7Kf9mQ2
- **THEN** system serves the button embed

#### Scenario: New short route
- **WHEN** embed is requested with /e/n_x7Kf9mQ2
- **THEN** system serves the button embed

#### Scenario: Invalid ID format
- **WHEN** embed is requested with /e/invalid
- **THEN** system returns 400 with error

## ADDED Requirements

### Requirement: Short embed route
The system SHALL serve embeds at `/e/:id` as alias for `/embed/:id`.

#### Scenario: Short route works
- **WHEN** user requests /e/n_x7Kf9mQ2
- **THEN** same embed is served as /embed/n_x7Kf9mQ2

### Requirement: ID validation on embed
The system SHALL validate ID format before attempting KV lookup.

#### Scenario: Valid n_ format
- **WHEN** embed requested with n_[8 base62 chars]
- **THEN** system proceeds with KV lookup

#### Scenario: Valid btn_ format
- **WHEN** embed requested with btn_[16 base62 chars]
- **THEN** system proceeds with KV lookup

#### Scenario: Invalid format rejected early
- **WHEN** embed requested with malformed ID
- **THEN** system returns 400 without KV lookup

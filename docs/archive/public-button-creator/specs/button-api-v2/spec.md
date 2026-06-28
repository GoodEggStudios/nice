## ADDED Requirements

### Requirement: Create button without authentication
The system SHALL allow unauthenticated users to create buttons via `POST /api/v2/buttons`.

#### Scenario: Successful button creation
- **WHEN** user sends POST /api/v2/buttons with valid URL
- **THEN** system returns 201 with public_id, private_id, and embed snippets

#### Scenario: Invalid URL format
- **WHEN** user sends POST /api/v2/buttons with malformed URL
- **THEN** system returns 400 with error "Invalid URL format"

#### Scenario: Missing URL
- **WHEN** user sends POST /api/v2/buttons without url field
- **THEN** system returns 400 with error "URL is required"

### Requirement: Button creation response format
The system SHALL return both public and private IDs with embed snippets on successful creation.

#### Scenario: Response includes all required fields
- **WHEN** button is successfully created
- **THEN** response contains: public_id (n_xxx format), private_id (ns_xxx format), embed.iframe, embed.script, url, created_at

### Requirement: Get button stats via private ID
The system SHALL allow viewing button stats via `GET /api/v2/buttons/stats/:private_id`.

#### Scenario: Valid private ID
- **WHEN** user sends GET /api/v2/buttons/stats/:private_id with valid ID
- **THEN** system returns 200 with id, url, count, created_at

#### Scenario: Invalid private ID
- **WHEN** user sends GET /api/v2/buttons/stats/:private_id with invalid ID
- **THEN** system returns 404 with error "Button not found"

### Requirement: Delete button via private ID
The system SHALL allow deleting buttons via `DELETE /api/v2/buttons/:private_id`.

#### Scenario: Successful deletion
- **WHEN** user sends DELETE /api/v2/buttons/:private_id with valid ID
- **THEN** system deletes button and returns 200 with success message

#### Scenario: Delete with invalid private ID
- **WHEN** user sends DELETE /api/v2/buttons/:private_id with invalid ID
- **THEN** system returns 404 with error "Button not found"

### Requirement: Theme and size options on creation
The system SHALL accept optional theme and size parameters when creating buttons.

#### Scenario: Create with custom theme
- **WHEN** user sends POST /api/v2/buttons with theme="dark"
- **THEN** embed snippets include theme=dark parameter

#### Scenario: Create with custom size
- **WHEN** user sends POST /api/v2/buttons with size="xl"
- **THEN** embed snippets include size=xl parameter

#### Scenario: Invalid theme value
- **WHEN** user sends POST /api/v2/buttons with theme="invalid"
- **THEN** system returns 400 with error "Invalid theme"

### Requirement: Restriction mode on creation
The system SHALL accept optional restriction parameter when creating buttons.

#### Scenario: Default restriction is URL
- **WHEN** user sends POST /api/v2/buttons without restriction parameter
- **THEN** button is created with restriction="url"

#### Scenario: Create with domain restriction
- **WHEN** user sends POST /api/v2/buttons with restriction="domain"
- **THEN** button is created with restriction="domain"

#### Scenario: Create with global restriction
- **WHEN** user sends POST /api/v2/buttons with restriction="global"
- **THEN** button is created with restriction="global"

#### Scenario: Invalid restriction value
- **WHEN** user sends POST /api/v2/buttons with restriction="invalid"
- **THEN** system returns 400 with error "Invalid restriction mode"

## ADDED Requirements

### Requirement: Stats page route
The system SHALL serve a stats page at `/stats/:private_id`.

#### Scenario: Valid private ID shows stats
- **WHEN** user visits /stats/ns_validPrivateId
- **THEN** page displays button statistics

#### Scenario: Invalid private ID shows error
- **WHEN** user visits /stats/ns_invalidId
- **THEN** page displays "Button not found" error

### Requirement: Stats page content
The system SHALL display count, URL, and creation date on the stats page.

#### Scenario: Stats displayed
- **WHEN** user visits stats page with valid private ID
- **THEN** page shows nice count, original URL, and created date

### Requirement: Referrer policy
The system SHALL set `Referrer-Policy: no-referrer` on stats pages to prevent private ID leakage.

#### Scenario: No referrer header
- **WHEN** user clicks a link on the stats page
- **THEN** browser does not send Referer header containing the private ID

### Requirement: Stats page branding
The system SHALL display Nice branding and link to homepage on stats page.

#### Scenario: Branding visible
- **WHEN** user views stats page
- **THEN** Nice logo/name and link to homepage are visible

### Requirement: Delete button on stats page
The system SHALL provide a delete button on the stats page.

#### Scenario: Delete confirmation
- **WHEN** user clicks delete button
- **THEN** confirmation dialog appears asking "Are you sure? This cannot be undone."

#### Scenario: Successful deletion
- **WHEN** user confirms deletion
- **THEN** button is deleted and user is redirected to homepage with success message

### Requirement: Future account claiming placeholder
The system SHALL display a "Claim this button" section (disabled for MVP).

#### Scenario: Claim section visible
- **WHEN** user views stats page
- **THEN** "Claim this button" section is visible with "Coming soon" message

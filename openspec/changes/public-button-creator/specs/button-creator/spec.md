## ADDED Requirements

### Requirement: Button creator form on homepage
The system SHALL display a button creator form on the homepage.

#### Scenario: Form is visible
- **WHEN** user visits the homepage
- **THEN** a form is displayed with URL input, theme selector, size selector, and submit button

### Requirement: URL input field
The system SHALL provide a URL input field that accepts valid HTTP/HTTPS URLs.

#### Scenario: Valid URL accepted
- **WHEN** user enters "https://dev.to/my-article" and submits
- **THEN** form submits successfully

#### Scenario: Invalid URL rejected
- **WHEN** user enters "not-a-url" and submits
- **THEN** form shows validation error "Please enter a valid URL"

### Requirement: Theme selector
The system SHALL provide a theme selector with options: light, dark, minimal, mono-dark, mono-light.

#### Scenario: Theme options available
- **WHEN** user views theme selector
- **THEN** all 5 theme options are displayed

#### Scenario: Default theme
- **WHEN** user does not select a theme
- **THEN** "light" is used as default

### Requirement: Size selector
The system SHALL provide a size selector with options: xs, sm, md, lg, xl.

#### Scenario: Size options available
- **WHEN** user views size selector
- **THEN** all 5 size options are displayed

#### Scenario: Default size
- **WHEN** user does not select a size
- **THEN** "md" is used as default

### Requirement: Creation result display
The system SHALL display public ID, private ID, and embed snippet after successful creation.

#### Scenario: Success display
- **WHEN** button is created successfully
- **THEN** page shows public_id, private_id with warning, and copyable iframe snippet

### Requirement: Private ID warning
The system SHALL display a prominent warning that the private ID is only shown once.

#### Scenario: Warning visibility
- **WHEN** button is created
- **THEN** warning text "Save your private ID! Only shown once." is displayed prominently

### Requirement: Copy button for snippet
The system SHALL provide a copy button for the embed snippet.

#### Scenario: Copy functionality
- **WHEN** user clicks copy button
- **THEN** iframe snippet is copied to clipboard AND button shows "Copied!" feedback

### Requirement: Live preview
The system SHALL show a live preview of the button with selected theme and size.

#### Scenario: Preview updates
- **WHEN** user changes theme or size selection
- **THEN** preview button updates immediately to reflect selection

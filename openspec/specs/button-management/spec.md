# button-management Specification

## Purpose
TBD - created by archiving change nice-button-mvp. Update Purpose after archive.
## Requirements
### Requirement: Create button
Site owners SHALL be able to create nice buttons via the API.

```
POST /api/v1/buttons
Authorization: Bearer nice_xxxxx
Content-Type: application/json

{
  "name": "My Blog Post",
  "url": "https://example.com/blog/post-1"
}
```

#### Scenario: Successful button creation
- **WHEN** an authenticated request creates a button with valid name and URL
- **THEN** the system creates a button with a unique `button_id` prefixed with `btn_`
- **AND** initializes the nice count to 0
- **AND** returns the button details including embed code

#### Scenario: URL domain mismatch
- **WHEN** a button is created with a URL that doesn't match the site's verified domain
- **THEN** the system returns HTTP 400 Bad Request
- **AND** the response includes error "URL domain must match verified site domain"

#### Scenario: Duplicate URL
- **WHEN** a button is created with a URL that already has a button
- **THEN** the system returns HTTP 409 Conflict
- **AND** the response includes the existing button's `button_id`

### Requirement: List buttons
Site owners SHALL be able to list all buttons for their site.

```
GET /api/v1/buttons
Authorization: Bearer nice_xxxxx
```

#### Scenario: List buttons with pagination
- **WHEN** an authenticated request lists buttons
- **THEN** the system returns an array of buttons with `button_id`, `name`, `url`, `count`, `created_at`
- **AND** results are paginated with `limit` (default 50) and `cursor` parameters

#### Scenario: Empty button list
- **WHEN** a site has no buttons
- **THEN** the system returns an empty array

### Requirement: Get button details
Site owners SHALL be able to retrieve details for a specific button.

```
GET /api/v1/buttons/{button_id}
Authorization: Bearer nice_xxxxx
```

#### Scenario: Get existing button
- **WHEN** an authenticated request gets a button that exists for their site
- **THEN** the system returns the button details including embed code snippet

#### Scenario: Get non-existent button
- **WHEN** an authenticated request gets a button ID that doesn't exist
- **THEN** the system returns HTTP 404 Not Found

#### Scenario: Get button from another site
- **WHEN** an authenticated request gets a button that belongs to a different site
- **THEN** the system returns HTTP 404 Not Found (not 403, to avoid leaking existence)

### Requirement: Delete button
Site owners SHALL be able to delete buttons.

```
DELETE /api/v1/buttons/{button_id}
Authorization: Bearer nice_xxxxx
```

#### Scenario: Successful deletion
- **WHEN** an authenticated request deletes an existing button
- **THEN** the button is permanently deleted
- **AND** the nice count data is deleted
- **AND** the embed for that button shows as disabled

#### Scenario: Delete non-existent button
- **WHEN** an authenticated request deletes a button that doesn't exist
- **THEN** the system returns HTTP 404 Not Found

### Requirement: Button embed code
Button details SHALL include ready-to-use embed code.

#### Scenario: Embed code in response
- **WHEN** button details are returned (create or get)
- **THEN** the response includes an `embed` object with:
  - `script`: The full script tag HTML
  - `iframe`: Direct iframe HTML (for manual embedding)
  - `button_id`: The button ID for reference

### Requirement: Button URL uniqueness
Each URL SHALL have at most one button per site.

#### Scenario: One button per URL
- **WHEN** a button exists for URL "https://example.com/post-1"
- **AND** another button creation is attempted for the same URL
- **THEN** the system returns HTTP 409 Conflict
- **AND** does not create a duplicate button


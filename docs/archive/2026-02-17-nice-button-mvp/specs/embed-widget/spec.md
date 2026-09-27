## ADDED Requirements

### Requirement: Script tag embed
The system SHALL provide a JavaScript embed that site owners can add with a single script tag.

The embed URL format SHALL be:
```html
<script src="https://nice.{domain}/embed.js" data-button="{button_id}" async></script>
```

The script SHALL create an iframe at the script's location containing the nice button.

#### Scenario: Basic embed loads
- **WHEN** a page includes the embed script with a valid button ID
- **THEN** the script creates an iframe containing the nice button
- **AND** the button displays the current nice count

#### Scenario: Embed with invalid button
- **WHEN** a page includes the embed script with an invalid or non-existent button ID
- **THEN** the iframe displays a disabled button with count "0"
- **AND** clicking the button has no effect

#### Scenario: Multiple embeds on same page
- **WHEN** a page includes multiple embed scripts with different button IDs
- **THEN** each script creates its own independent iframe
- **AND** each button displays its respective count

### Requirement: Iframe security isolation
The embed SHALL use an iframe to provide security isolation between the nice button and the host page.

The iframe SHALL:
- Be served from the nice service domain
- Use `sandbox` attribute with only necessary permissions
- Communicate with parent via postMessage only

#### Scenario: Iframe sandbox restrictions
- **WHEN** the embed iframe loads
- **THEN** the iframe has sandbox attribute set to `allow-scripts allow-same-origin`
- **AND** the iframe cannot access the parent page's DOM

#### Scenario: Cross-origin communication
- **WHEN** the button needs to communicate with the parent page (e.g., resize)
- **THEN** it uses postMessage with explicit origin checking
- **AND** the parent script validates message origin matches the nice service domain

### Requirement: Button displays nice count
The embedded button SHALL display the current nice count for the button.

The count SHALL update optimistically when a user clicks nice.

#### Scenario: Initial count display
- **WHEN** the embed loads for a button with 42 nices
- **THEN** the button displays "42" as the count

#### Scenario: Optimistic count update
- **WHEN** a user clicks the nice button
- **THEN** the count immediately increments by 1 (before server confirmation)
- **AND** the button enters a "niced" visual state

#### Scenario: Large count formatting
- **WHEN** the button has 1,234,567 nices
- **THEN** the count displays as "1.2M" (abbreviated format)

### Requirement: Theme support
The embed SHALL support theming via data attributes on the script tag.

Supported themes:
- `light` (default): Light background, dark text
- `dark`: Dark background, light text
- `minimal`: No background, adapts to page

#### Scenario: Default light theme
- **WHEN** the embed loads without a theme attribute
- **THEN** the button renders with the light theme

#### Scenario: Dark theme
- **WHEN** the embed includes `data-theme="dark"`
- **THEN** the button renders with dark background and light text

#### Scenario: Minimal theme
- **WHEN** the embed includes `data-theme="minimal"`
- **THEN** the button renders with transparent background
- **AND** the text color adapts based on the `color-scheme` of the parent page (if detectable via postMessage)

### Requirement: Responsive sizing
The embed SHALL resize responsively based on content and container.

#### Scenario: Iframe auto-resize
- **WHEN** the button content changes size (e.g., count goes from "9" to "10")
- **THEN** the iframe sends a postMessage to the parent with new dimensions
- **AND** the parent script adjusts the iframe size accordingly

#### Scenario: Minimum width
- **WHEN** the embed loads
- **THEN** the iframe has a minimum width of 80px to ensure the button is usable

### Requirement: Click feedback
The button SHALL provide visual and optional haptic feedback when clicked.

#### Scenario: Visual click feedback
- **WHEN** a user clicks the nice button
- **THEN** the button shows a brief animation (pulse/burst effect)
- **AND** transitions to a "niced" state (filled icon instead of outline)

#### Scenario: Repeat click feedback
- **WHEN** a user who has already niced clicks the button again
- **THEN** the button shows a subtle shake animation
- **AND** the count does not change

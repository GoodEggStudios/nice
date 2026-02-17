## ADDED Requirements

### Requirement: Record nice endpoint
The system SHALL provide a public endpoint to record a nice.

```
POST /api/v1/nice/{button_id}
```

No authentication required (public endpoint).

#### Scenario: Successful nice
- **WHEN** a valid nice request is received for an existing button
- **AND** the visitor has not already niced this button today
- **THEN** the nice count increments by 1
- **AND** the response includes `{ "success": true, "count": <new_count> }`

#### Scenario: Already niced
- **WHEN** a nice request is received from a visitor who already niced today
- **THEN** the nice count does not change
- **AND** the response includes `{ "success": false, "reason": "already_niced", "count": <current_count> }`

#### Scenario: Non-existent button
- **WHEN** a nice request is received for a button that doesn't exist
- **THEN** the system returns HTTP 404 Not Found

#### Scenario: Unverified site button
- **WHEN** a nice request is received for a button whose site is not verified
- **THEN** the system returns HTTP 403 Forbidden
- **AND** the response includes error "Site not verified"

### Requirement: Get count endpoint
The system SHALL provide a public endpoint to get the current nice count.

```
GET /api/v1/nice/{button_id}/count
```

#### Scenario: Get count for existing button
- **WHEN** a count request is received for an existing button
- **THEN** the system returns `{ "count": <count>, "button_id": "<button_id>" }`

#### Scenario: Get count for non-existent button
- **WHEN** a count request is received for a non-existent button
- **THEN** the system returns HTTP 404 Not Found

### Requirement: Visitor deduplication
The system SHALL deduplicate nices from the same visitor within a 24-hour window.

Visitor identity is computed as:
```
visitor_hash = SHA256(ip + fingerprint + button_id + daily_salt)
```

#### Scenario: Same visitor same day
- **WHEN** a visitor nices a button
- **AND** the same visitor (same hash) tries to nice again within 24 hours
- **THEN** the second nice is rejected with "already_niced"

#### Scenario: Same visitor next day
- **WHEN** a visitor nices a button on day 1
- **AND** the same visitor tries to nice again on day 2 (after salt rotation)
- **THEN** the second nice is accepted (different hash due to salt)

#### Scenario: Different buttons same visitor
- **WHEN** a visitor nices button A
- **AND** the same visitor nices button B
- **THEN** both nices are accepted (button_id is part of hash)

### Requirement: Fingerprint collection
The embed SHALL collect a lightweight fingerprint to support visitor deduplication.

The fingerprint SHALL include only:
- Screen dimensions (width x height)
- Timezone offset
- Language preference
- User-agent string hash

The fingerprint SHALL NOT include:
- Canvas fingerprinting
- Font enumeration
- WebGL fingerprinting
- Any other invasive techniques

#### Scenario: Fingerprint sent with nice
- **WHEN** a user clicks the nice button
- **THEN** the embed includes the fingerprint hash in the request body
- **AND** the fingerprint data is not stored (only the combined hash)

### Requirement: Response latency
The nice and count endpoints SHALL respond within 100ms at p95 globally.

#### Scenario: Fast response under normal load
- **WHEN** the system is under normal load
- **THEN** 95% of requests complete within 100ms

### Requirement: Eventual consistency tolerance
Nice counts MAY be eventually consistent with a maximum delay of 60 seconds.

#### Scenario: Count propagation
- **WHEN** a nice is recorded in one region
- **THEN** the count is visible in all regions within 60 seconds

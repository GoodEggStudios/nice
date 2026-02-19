## Why

GitHub markdown doesn't allow iframes, JavaScript, or custom HTML, so Nice button embeds don't work in README files, issues, or comments. Users want to show their Nice count in GitHub repos but currently can't.

## What Changes

- Add SVG badge endpoint at `/badge/{publicId}.svg` that returns a static badge image showing the nice count
- Badge links to the button page when clicked (via markdown image-link syntax)
- Support optional style parameters (flat, flat-square, plastic, for-the-badge) matching shields.io conventions
- Support optional color customization

## Capabilities

### New Capabilities
- `badge-endpoint`: SVG badge generation endpoint with count display and style options

### Modified Capabilities
<!-- None - this is additive functionality -->

## Impact

- **Routes**: New `/badge/:publicId.svg` endpoint
- **Dependencies**: None (SVG generated server-side, no external deps)
- **Database**: Uses existing button stats query
- **Caching**: Badge responses should be cached with short TTL (60s) for performance

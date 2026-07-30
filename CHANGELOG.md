# Changelog

## 1.0.0-beta.1 - 2026-07-30

### Added

- Grid Pack Studio beta flow for importing a 5x5-style emote sheet and generating individual emote documents.
- Automatic grid detection with Web Worker analysis, confidence score and manual correction surface.
- Advanced grid editing tools for guides, cell rectangles, splits, merges, reordering and free regions.
- Batch crop, trim, fit, padding, frame, background and outline workflows.
- Background Removal v2 with connected/global modes, mask preview, feather, despill and batch application.
- Professional Twitch export workflow with manual and auto-resize presets.
- Export manifests, JSON/HTML reports, invalid file routing, progress, cancellation and retry.
- Playwright E2E coverage for the real 994x1001 reference grid and real Canvas encoder output.
- Cloudflare Pages static deployment configuration.

### Changed

- Twitch transparency validation is now blocking when a preset requires transparent PNG output.
- Active PNG downloads now reuse the same preset and validation pipeline as ZIP export.
- Export state handling now protects against stale runs and exposes `pending`, `processing`, `compressing`, `valid`, `invalid` and `canceled`.

### Known Limitations

- Animated emote formats are not supported.
- Session persistence and project save/load are not complete.
- Global background removal can erase internal white details and should be used only after confirmation.

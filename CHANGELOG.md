# Changelog

## 1.0.0-beta.2 - 2026-07-30

### Added

- IndexedDB project autosave, reload recovery and `.emoteproject` import/export.
- Header project manager for save/open/rename/duplicate/delete workflows.
- Preview LRU cache, virtualized emote strip, image metrics Worker and memory summary.
- Performance benchmark script with 994x1001 image metrics and 100-cell cache timings.
- Active-emote histogram and levels controls for black point, white point and gamma.
- Per-emote variants that share source and crop parameters non-destructively.
- Custom PNG export preset and optional contact sheet output.
- Basic drop-shadow styling behind emotes.

### Changed

- Active preview rendering reuses cache entries when source, crop and operations are unchanged.
- Export manifests now reflect preset-specific square/transparency requirements.

### Known Limitations

- Animated GIF/WebP and ML background removal are still not shipped in this beta.
- Contact sheets are optional and are not included in Twitch output counts unless enabled.

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

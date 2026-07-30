# Implementation notes

## 2026-07-30 - First functional grid delivery

- Added Vitest and Testing Library dependencies because the project had no automated test runner. Canvas utilities and pure helpers remain dependency-free.
- Kept the existing individual-image editor as the compatibility layer, but new imports now pass explicit file and decoded-dimension validation before entering state.
- Introduced a transitional non-destructive document shape: each emote stores source metadata, crop parameters, fit mode, background-removal parameters, adjustments and outline settings. The current canvas editor still consumes `originalSrc`/`processedSrc` while the model migrates gradually.
- Implemented manual grid import before automatic detection. This is the safer first capability because every generated crop is user-correctable through rows, columns, margins, gutters, inset, draggable guides and per-cell enabled/empty flags.
- Grid cell extraction preserves the configured crop rectangle and does not stretch rectangular cells. Twitch manual export now renders each size from the available master image into a transparent square using `contain`.
- Centralized the initial Twitch static presets and output metadata validation under `src/features/export`.
- The automatic detector and Web Worker are intentionally not marked complete in this delivery; the manual editor creates the correction surface that the detector will feed next.

## 2026-07-30 - Stabilization and automatic detection v1

- Rebasing `feat/grid-pack-studio` onto `origin/main` completed without conflicts.
- Removed the persistent `onProcessed` data URL path. `useImageProcessor` now renders from `sourceId + cropRect + operations` and only emits a revocable preview Blob URL for UI previews.
- Grid cells no longer store full rendered data URLs. They share the original grid asset and persist crop, background-removal operations, adjustments, outline and generation metadata.
- `Generar recortes` compares a per-cell generation key so a second click does not duplicate unchanged cells. Editing guides or a cell name changes the key and allows regeneration.
- Added automatic grid detection in a Web Worker. The detector estimates the border background, builds projection profiles, detects foreground/card runs and gutters, scores regularity, then classifies cells with local edge-background sampling plus `scoreEmptyCell`.
- Automatic detection results load into the existing manual editor with confidence and warnings. Low confidence is a correction-required state, not a silent export path.
- Added integration coverage for the grid workspace, document extraction, `useEmoteBatch`, export package creation and the synthetic 994 x 1001 reference-style grid.

## 2026-07-30 - Grid Pack Studio v1.0 beta release candidate

- Hardened Twitch validation so transparent-background presets reject fully opaque PNGs and empty visible outputs.
- Centralized export encoding so ZIP export and active PNG downloads share the same Canvas render, PNG byte inspection and preset validation path.
- Added active PNG output selection for Twitch manual sizes and auto-resize master output generation.
- Export state now uses run ids to discard stale responses and exposes `pending`, `processing`, `compressing`, `valid`, `invalid` and `canceled`.
- The UI shows `Finalizando ZIP` while JSZip compresses the package and keeps completed exports from being overwritten by late cancellation.
- Added Playwright E2E tests for the real 994 x 1001 reference grid: automatic detection, 24 generated emotes, Connected background removal, Twitch manual export with 72 PNGs and auto-resize export with 24 masters.
- Added a browser Canvas encoder E2E test that imports the real export module through Vite and validates generated PNG bytes from the ZIP.
- Added Cloudflare Pages static deployment config with `dist` output and SPA fallback.
- Updated release docs, changelog and package version to `1.0.0-beta.1`.

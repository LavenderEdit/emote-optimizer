# Implementation notes

## 2026-07-30 - First functional grid delivery

- Added Vitest and Testing Library dependencies because the project had no automated test runner. Canvas utilities and pure helpers remain dependency-free.
- Kept the existing individual-image editor as the compatibility layer, but new imports now pass explicit file and decoded-dimension validation before entering state.
- Introduced a transitional non-destructive document shape: each emote stores source metadata, crop parameters, fit mode, background-removal parameters, adjustments and outline settings. The current canvas editor still consumes `originalSrc`/`processedSrc` while the model migrates gradually.
- Implemented manual grid import before automatic detection. This is the safer first capability because every generated crop is user-correctable through rows, columns, margins, gutters, inset, draggable guides and per-cell enabled/empty flags.
- Grid cell extraction preserves the configured crop rectangle and does not stretch rectangular cells. Twitch manual export now renders each size from the available master image into a transparent square using `contain`.
- Centralized the initial Twitch static presets and output metadata validation under `src/features/export`.
- The automatic detector and Web Worker are intentionally not marked complete in this delivery; the manual editor creates the correction surface that the detector will feed next.

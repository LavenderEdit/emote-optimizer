# EmoteStudio Pro - Grid Pack Studio v1.0 beta.2

EmoteStudio Pro is a local-first web app for preparing Twitch emote packs from individual images or from a single grid image. All image analysis, background removal, cropping, validation and export work happens in the browser with Canvas, Web Workers and static JavaScript.

## Implemented Features

- Individual image import for PNG, JPG/JPEG and static WEBP.
- Grid pack import from a single composite image.
- Automatic grid detection in a Web Worker with manual correction fallback.
- Editable rows, columns, guides, gutters, cell rectangles, splits, merges and free regions.
- Non-destructive crop documents: every emote renders from the original source asset plus crop, mask and operation parameters.
- Batch crop generation without duplicate stale cell documents.
- Multi-select editing for fit, padding, frame, adjustments, outline, trim and background settings.
- Background Removal v2 with connected and global modes, edge/corner sampling, feather, despill, checkerboard/mask preview and excessive-removal warnings.
- Twitch preview at 112, 56 and 28 px.
- Twitch export presets:
  - Manual: 112, 56 and 28 px PNGs.
  - Auto-resize: one square master PNG from 112 to 4096 px, max 1 MB.
- Export preflight with real PNG bytes, dimensions, square ratio, transparency, visible content, duplicate names and per-file status.
- ZIP export with `manifest.json`, `export-report.json`, `export-report.html` and `invalid/` routing for failed files.
- Export progress, cancellation, retry and active PNG download.
- Versioned local project persistence in IndexedDB with autosave, reload recovery, duplicate/rename/delete and `.emoteproject` import/export.
- Preview cache, virtualized emote strip, image metrics worker and memory-pressure summary for larger packs.
- Histogram preview for the active rendered emote.
- Levels controls for input black, input white and gamma.
- Per-emote variants that share the original source and crop non-destructively.
- Custom PNG export preset with configurable size.
- Optional contact sheet PNG in export ZIPs.
- Basic shadow styling behind emotes via the outline controls.

## Local Usage

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Individual Images

1. Choose `Imagen individual` or drag image files into the app.
2. Adjust background, trim, fit, padding, zoom, position, image adjustments and outline.
3. Preview 112, 56 and 28 px.
4. Create variants when a separate framing/adjustment pass is needed.
5. Export the active PNG, a Twitch ZIP package or a custom PNG package.

### Grid Packs

1. Choose `Paquete en grid`.
2. Load a composite emote sheet.
3. Click `Detectar automaticamente`.
4. Review rows, columns, active cells and empty cells.
5. Correct guides, cell rectangles, splits, merges or free regions when needed.
6. Click `Generar recortes`.
7. Select all generated emotes or a subset.
8. Apply Background Removal v2 in `Connected` mode.
9. Pick a Twitch preset and export.
10. Review the summary before downloading the ZIP.

### Projects

- Projects autosave locally when the current pack is stable.
- Reload recovery appears automatically after refresh or browser restart when a local session exists.
- Use the project menu in the header to save, save as, open, rename, duplicate, delete, import or export `.emoteproject` files.
- Project files contain parameters and source blobs; they do not upload anything.

## Validation And Export

The exporter never marks a file valid unless the encoded PNG bytes pass validation:

- PNG MIME and extension.
- PNG signature when available.
- Required dimensions.
- Square output.
- Real transparency when the preset requires it.
- Visible non-empty content.
- Byte limits.

Invalid files are blocked from the main package path and written under `invalid/` with exact error messages in the manifest and reports.

## Commands

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run test:e2e
npm run bench:performance
```

`npm run test:e2e` uses Playwright and starts Vite automatically.

## Deployment

The app is static and local-first. No server API is required.

Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22 or newer

The repository includes:

- `wrangler.toml` with `pages_build_output_dir = "dist"`.
- `public/_redirects` for SPA fallback.

Manual Cloudflare Pages deployment can use the dashboard or Wrangler after authentication.

## Known Limitations

- Animated GIF/WebP emotes are not supported in this beta.
- ML background removal adapters are not bundled; Background Removal v2 remains Canvas-based.
- Background Removal v2 `Global` mode is intentionally aggressive and can remove white eyes, teeth, text or highlights.
- Automatic grid detection is optimized for clear rows, columns and gutters; low-confidence results must be corrected manually.
- Very large grids can take longer in browser-only processing.
- Export currently targets Twitch static emotes; Discord and animated preset validation remain future work.

## Privacy

Images are processed locally in the browser. The app does not upload images by default. Object URLs and generated previews are revoked when no longer needed.

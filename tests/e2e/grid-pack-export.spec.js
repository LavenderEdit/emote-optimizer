import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hasPngSignature, readPngImageDataFromBuffer } from '../../src/test/fixtures/readPngImageData.js';

const referenceGridPath = resolve(process.cwd(), 'src/test/fixtures/images/reference-grid-994x1001.png');

test('reference grid editor remains scrollable at 1365x768 with r5c5 reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await loadReferenceGridDraft(page);

    const workspace = page.getByTestId('grid-import-workspace');
    await workspace.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByRole('button', { name: 'Celda fila 5, columna 5' })).toBeVisible();

    const configPanel = page.getByTestId('grid-config-panel');
    await configPanel.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    const reviewList = page.getByTestId('cell-review-list');
    await reviewList.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });

    await expect(page.getByText('Fila 5, Col 5')).toBeVisible();
    await expect(page.getByText('No se exportara mientras este marcada como vacia.')).toBeVisible();
});

test('right sidebar keeps Fondo v2 actions reachable at 1920x900', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await prepareReferenceGridPack(page, { applyBackground: false });

    const sidebarScroll = page.getByTestId('right-sidebar-scroll');
    await expect(page.getByTestId('background-v2-light-grid-all')).toBeVisible();
    await expect(page.getByText('Fondo activo')).toBeVisible();
    await expect(page.getByText('Fondo seleccion')).toBeVisible();
    await expect(page.getByText('Fondo todos')).toBeVisible();
    await expect(page.getByTestId('comparison-mask-mode')).toBeVisible();

    await sidebarScroll.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByTestId('download-prepared-export')).toBeVisible();
    await expect(page.getByTestId('prepare-export')).toBeVisible();
});

test('reference grid exports 72 valid Twitch manual PNGs with reports', async ({ page }) => {
    await prepareReferenceGridPack(page);

    const zip = await exportPreparedZip(page, {
        expectedSummary: 'Validos: 72/72',
    });

    await expectZipPackage(zip, {
        presetId: 'twitch-static-manual',
        expectedPngCount: 72,
        expectedOutputsPerItem: 3,
        allowedSizes: new Set([112, 56, 28]),
        maxBytes: 100_000,
    });
});

test('reference grid exports 24 valid Twitch auto-resize master PNGs', async ({ page }) => {
    await prepareReferenceGridPack(page);
    await page.getByLabel('Preset').selectOption('twitch-static-auto');

    const zip = await exportPreparedZip(page, {
        expectedSummary: 'Validos: 24/24',
    });

    await expectZipPackage(zip, {
        presetId: 'twitch-static-auto',
        expectedPngCount: 24,
        expectedOutputsPerItem: 1,
        allowedSizes: null,
        maxBytes: 1_000_000,
    });
});

test('reference grid autosaves and recovers the generated pack after reload', async ({ page }) => {
    await prepareReferenceGridPack(page, { applyBackground: false });

    await page.getByTestId('project-manager-toggle').click();
    await expect(page.getByText(/24 emotes/)).toBeVisible({ timeout: 20_000 });
    await page.reload();

    await expect(page.getByTestId('recovery-dialog')).toContainText('Proyecto recuperable', { timeout: 20_000 });
    await page.getByRole('button', { name: 'Recuperar' }).click();
    await expect(page.getByTestId('prepare-export')).toContainText('Exportar 24 Emotes', { timeout: 20_000 });
    await expect(page.getByTestId('grid-active-count')).toContainText('24 activos');
});

test('real browser Canvas encoder produces valid transparent Twitch PNGs', async ({ page }) => {
    await page.goto('/');
    const payload = await page.evaluate(async () => {
        const { buildEmotesZip } = await import('/src/utils/exportUtils.js');
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#d92b3a';
        context.fillRect(36, 24, 84, 64);
        const sourceBlob = await new Promise((resolveBlob) => canvas.toBlob(resolveBlob, 'image/png'));
        const objectUrl = URL.createObjectURL(sourceBlob);
        const asset = {
            id: 'asset-browser-canvas',
            fileName: 'browser-canvas.png',
            name: 'browser-canvas',
            mimeType: 'image/png',
            bytes: sourceBlob.size,
            width: canvas.width,
            height: canvas.height,
            objectUrl,
        };
        const emote = {
            id: 'emote-browser-canvas',
            name: 'browser_canvas',
            sourceId: asset.id,
            cropRect: { x: 0, y: 0, width: canvas.width, height: canvas.height },
            fitMode: 'contain',
            padding: 0,
            backgroundRemoval: { mode: 'manual-flood-fill', tolerance: 30, erasurePoints: [], restorePoints: [] },
            adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpen: 0 },
            outline: { enabled: false },
        };
        const result = await buildEmotesZip([emote], { [asset.id]: asset }, { presetId: 'twitch-static-manual' });
        const zipBytes = await result.zip.generateAsync({ type: 'uint8array' });
        URL.revokeObjectURL(objectUrl);
        return {
            manifest: result.manifest,
            report: result.report,
            zipBytes: Array.from(zipBytes),
        };
    });

    expect(payload.manifest.summary.validOutputs).toBe(3);
    expect(payload.report.status).toBe('valid');

    const zip = await JSZip.loadAsync(Uint8Array.from(payload.zipBytes));
    await expectZipPackage(zip, {
        presetId: 'twitch-static-manual',
        expectedPngCount: 3,
        expectedItems: 1,
        expectedOutputsPerItem: 3,
        allowedSizes: new Set([112, 56, 28]),
        maxBytes: 100_000,
    });
});

async function prepareReferenceGridPack(page, { applyBackground = true } = {}) {
    await loadReferenceGridDraft(page);

    await page.getByTestId('generate-grid-emotes').click();
    await expect(page.getByTestId('prepare-export')).toContainText('Exportar 24 Emotes', { timeout: 30_000 });

    if (!applyBackground) return;

    await page.getByTestId('background-v2-light-grid-all').click();
    await expect(page.getByText(/% removido/)).toBeVisible({ timeout: 60_000 });
}

async function loadReferenceGridDraft(page) {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Paquete en grid' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(referenceGridPath);

    await expect(page.getByText('Grid manual', { exact: true })).toBeVisible();
    await page.getByTestId('auto-detect-grid').click();
    await expect(page.getByLabel('Filas')).toHaveValue('5');
    await expect(page.getByLabel('Columnas')).toHaveValue('5');
    await expect(page.getByTestId('grid-active-count')).toContainText('24 activos', { timeout: 30_000 });
}

async function exportPreparedZip(page, { expectedSummary }) {
    await page.getByTestId('prepare-export').click();
    await expect(page.getByTestId('export-progress')).toContainText(/Finalizando ZIP|Progreso:/, { timeout: 120_000 });
    await expect(page.getByTestId('export-summary')).toContainText(expectedSummary, { timeout: 120_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-prepared-export').click();
    const download = await downloadPromise;
    const path = await download.path();
    return JSZip.loadAsync(readFileSync(path));
}

async function expectZipPackage(zip, {
    presetId,
    expectedPngCount,
    expectedItems = 24,
    expectedOutputsPerItem,
    allowedSizes,
    maxBytes,
}) {
    const files = Object.keys(zip.files);
    const invalidPngFiles = files.filter((path) => path.startsWith('invalid/') && path.endsWith('.png'));
    const pngFiles = files.filter((path) => path.endsWith('.png') && !path.startsWith('invalid/'));

    expect(invalidPngFiles).toHaveLength(0);
    expect(pngFiles).toHaveLength(expectedPngCount);
    expect(files).toEqual(expect.arrayContaining(['manifest.json', 'export-report.json', 'export-report.html']));

    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    const report = JSON.parse(await zip.file('export-report.json').async('string'));
    const html = await zip.file('export-report.html').async('string');

    expect(manifest.preset.id).toBe(presetId);
    expect(manifest.summary.validOutputs).toBe(expectedPngCount);
    expect(manifest.summary.invalidOutputs).toBe(0);
    expect(report.summary).toEqual(manifest.summary);
    expect(report.status).toBe('valid');
    expect(html).toContain('EmoteStudio Pro export');
    expect(manifest.items).toHaveLength(expectedItems);
    expect(manifest.items.every((item) => item.outputs.length === expectedOutputsPerItem)).toBe(true);

    for (const item of manifest.items) {
        expect(item.status).toBe('valid');
        for (const output of item.outputs) {
            expect(output.valid).toBe(true);
            expect(pngFiles).toContain(output.path);
            const bytes = await zip.file(output.path).async('uint8array');
            expect(hasPngSignature(bytes)).toBe(true);
            expect(bytes.byteLength).toBe(output.bytes);
            expect(bytes.byteLength).toBeLessThanOrEqual(maxBytes);

            const decoded = readPngImageDataFromBuffer(bytes);
            expect(decoded.width).toBe(output.width);
            expect(decoded.height).toBe(output.height);
            expect(decoded.width).toBe(decoded.height);
            if (allowedSizes) expect(allowedSizes.has(decoded.width)).toBe(true);
            if (!allowedSizes) {
                expect(decoded.width).toBeGreaterThanOrEqual(112);
                expect(decoded.width).toBeLessThanOrEqual(4096);
            }

            const alphaValues = [];
            for (let index = 3; index < decoded.data.length; index += 4) {
                alphaValues.push(decoded.data[index]);
            }
            expect(alphaValues.some((alpha) => alpha < 255)).toBe(true);
            expect(alphaValues.some((alpha) => alpha > 16)).toBe(true);
        }
    }
}

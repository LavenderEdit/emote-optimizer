import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { buildEmotesZip } from './exportUtils';

describe('buildEmotesZip', () => {
    it('builds Twitch manual outputs, manifest and report from source assets', async () => {
        const { emotes, assets } = createExportFixture(1);
        const { zip, manifest } = await buildEmotesZip(emotes, assets, {
            now: () => '2026-07-30T00:00:00.000Z',
            renderOutput: validRenderOutput,
        });
        const loaded = await loadZip(zip);

        expect(manifest.items[0].source.id).toBe(emotes[0].sourceId);
        expect(Object.keys(loaded.files)).toEqual(expect.arrayContaining([
            'manifest.json',
            'export-report.json',
            'export-report.html',
            'twitch-manual/emote_001/emote_001_112.png',
            'twitch-manual/emote_001/emote_001_56.png',
            'twitch-manual/emote_001/emote_001_28.png',
        ]));
    });

    it('exports 24 emotes as 72 valid PNGs in Twitch manual mode', async () => {
        const { emotes, assets } = createExportFixture(24);
        const { zip, manifest, report } = await buildEmotesZip(emotes, assets, {
            presetId: 'twitch-static-manual',
            renderOutput: validRenderOutput,
        });
        const loaded = await loadZip(zip);
        const pngFiles = Object.keys(loaded.files).filter((path) => path.endsWith('.png'));

        expect(pngFiles).toHaveLength(72);
        expect(manifest.summary.validOutputs).toBe(72);
        expect(manifest.summary.invalidOutputs).toBe(0);
        expect(report.summary).toEqual(manifest.summary);
        expect(report.items.every((item) => item.valid)).toBe(true);
    });

    it('exports 24 valid master PNGs in Twitch auto-resize mode', async () => {
        const { emotes, assets } = createExportFixture(24);
        const { zip, manifest } = await buildEmotesZip(emotes, assets, {
            presetId: 'twitch-static-auto',
            renderOutput: validRenderOutput,
        });
        const loaded = await loadZip(zip);
        const pngFiles = Object.keys(loaded.files).filter((path) => path.endsWith('.png'));

        expect(pngFiles).toHaveLength(24);
        expect(pngFiles.every((path) => path.includes('twitch-auto-resize/'))).toBe(true);
        expect(manifest.summary.validOutputs).toBe(24);
        expect(manifest.items.every((item) => item.outputs[0].width >= 112)).toBe(true);
    });

    it('exports custom PNG outputs without Twitch-only transparency requirements', async () => {
        const { emotes, assets } = createExportFixture(2);
        const { zip, manifest } = await buildEmotesZip(emotes, assets, {
            presetId: 'png-custom',
            customSize: 320,
            renderOutput: async (_emote, _asset, outputRule) => ({
                base64: 'AA==',
                bytes: 1200,
                width: outputRule.width,
                height: outputRule.height,
                mime: 'image/png',
                hasTransparency: false,
                transparentPixelRatio: 0,
                visiblePixelRatio: 0.5,
                pngSignatureValid: true,
            }),
        });
        const loaded = await loadZip(zip);
        const pngFiles = Object.keys(loaded.files).filter((path) => path.endsWith('.png'));

        expect(pngFiles).toEqual([
            'custom-png/emote_001/emote_001_320.png',
            'custom-png/emote_002/emote_002_320.png',
        ]);
        expect(manifest.preset.id).toBe('png-custom');
        expect(manifest.summary.validOutputs).toBe(2);
        expect(manifest.items[0].preflight.transparencyRequired).toBe(false);
    });

    it('keeps manifest, report and ZIP contents aligned', async () => {
        const { emotes, assets } = createExportFixture(3);
        const { zip, manifest, report } = await buildEmotesZip(emotes, assets, {
            presetId: 'twitch-static-manual',
            renderOutput: validRenderOutput,
        });
        const loaded = await loadZip(zip);
        const outputPaths = manifest.items.flatMap((item) => item.outputs.map((output) => output.path));

        expect(report.items.map((item) => item.name)).toEqual(manifest.items.map((item) => item.exportName));
        expect(outputPaths.every((path) => loaded.files[path])).toBe(true);
        expect(loaded.files['export-report.html']).toBeTruthy();
    });

    it('cancels export before finishing all files', async () => {
        const { emotes, assets } = createExportFixture(2);
        const controller = new AbortController();
        let fileProgressEvents = 0;

        await expect(buildEmotesZip(emotes, assets, {
            signal: controller.signal,
            renderOutput: validRenderOutput,
            onProgress: (progress) => {
                if (progress.currentFile) {
                    fileProgressEvents += 1;
                    controller.abort();
                }
            },
        })).rejects.toMatchObject({ name: 'AbortError' });

        expect(fileProgressEvents).toBe(1);
    });

    it('routes invalid files to invalid/ and never reports them as valid', async () => {
        const { emotes, assets } = createExportFixture(1);
        const { zip, manifest, report } = await buildEmotesZip(emotes, assets, {
            renderOutput: async (_emote, _asset, outputRule) => ({
                base64: 'AA==',
                bytes: outputRule.maxBytes + 1,
                width: outputRule.width,
                height: outputRule.height,
                mime: 'image/png',
                hasTransparency: true,
                transparentPixelRatio: 0.5,
                visiblePixelRatio: 0.5,
            }),
        });
        const loaded = await loadZip(zip);
        const outputPaths = manifest.items[0].outputs.map((output) => output.path);

        expect(outputPaths.every((path) => path.startsWith('invalid/'))).toBe(true);
        expect(outputPaths.every((path) => loaded.files[path])).toBe(true);
        expect(manifest.summary.validOutputs).toBe(0);
        expect(report.items[0].valid).toBe(false);
    });

    it('routes opaque PNG outputs to invalid when transparency is required', async () => {
        const { emotes, assets } = createExportFixture(1);
        const { manifest } = await buildEmotesZip(emotes, assets, {
            renderOutput: async (_emote, _asset, outputRule) => ({
                base64: 'AA==',
                bytes: 10,
                width: outputRule.width,
                height: outputRule.height,
                mime: 'image/png',
                hasTransparency: false,
                transparentPixelRatio: 0,
                visiblePixelRatio: 0.5,
                pngSignatureValid: true,
            }),
        });

        expect(manifest.summary.validOutputs).toBe(0);
        expect(manifest.items[0].outputs.every((output) => output.path.startsWith('invalid/'))).toBe(true);
        expect(manifest.items[0].outputs[0].errors).toContain('La salida debe conservar transparencia real.');
    });

    it('keeps duplicate normalized names unique without invalidating valid files', async () => {
        const { emotes, assets } = createExportFixture(2);
        const renamed = emotes.map((emote) => ({ ...emote, name: 'same name' }));
        const { manifest, report } = await buildEmotesZip(renamed, assets, {
            renderOutput: validRenderOutput,
        });

        expect(manifest.items.map((item) => item.exportName)).toEqual(['same_name', 'same_name_2']);
        expect(manifest.items.every((item) => item.preflight.duplicateName)).toBe(true);
        expect(report.items.every((item) => item.valid)).toBe(true);
        expect(manifest.summary.validOutputs).toBe(6);
        expect(manifest.items[0].warnings).toContain('Nombre duplicado normalizado; se exportara con sufijo unico.');
    });
});

function createExportFixture(count) {
    const assets = {};
    const emotes = Array.from({ length: count }, (_, index) => {
        const asset = {
            id: `asset-${index + 1}`,
            fileName: `emote_${index + 1}.png`,
            name: `emote_${String(index + 1).padStart(3, '0')}`,
            mimeType: 'image/png',
            bytes: 100,
            width: 256,
            height: 256,
            objectUrl: `blob:asset-${index + 1}`,
        };
        assets[asset.id] = asset;
        return {
            ...createEmoteDocumentFromAsset(asset),
            id: `emote-${index + 1}`,
            name: `emote_${String(index + 1).padStart(3, '0')}`,
        };
    });
    return { emotes, assets };
}

async function validRenderOutput(_emote, _asset, outputRule) {
    return {
        base64: 'AA==',
        bytes: Math.min(10, outputRule.maxBytes || 100),
        width: outputRule.width,
        height: outputRule.height,
        mime: 'image/png',
        hasTransparency: true,
        transparentPixelRatio: 0.5,
        visiblePixelRatio: 0.5,
        pngSignatureValid: true,
    };
}

async function loadZip(zip) {
    const blob = await zip.generateAsync({ type: 'blob' });
    return JSZip.loadAsync(blob);
}

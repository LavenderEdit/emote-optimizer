import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { buildEmotesZip } from './exportUtils';

describe('buildEmotesZip', () => {
    it('builds Twitch manual outputs, manifest and report from source assets', async () => {
        const asset = {
            id: 'asset-1',
            fileName: 'emote.png',
            name: 'emote',
            mimeType: 'image/png',
            bytes: 100,
            width: 128,
            height: 128,
            objectUrl: 'blob:asset',
        };
        const emote = createEmoteDocumentFromAsset(asset);
        const { zip, manifest } = await buildEmotesZip([emote], { [asset.id]: asset }, {
            now: () => '2026-07-30T00:00:00.000Z',
            renderOutput: async (_emote, _asset, outputRule) => ({
                base64: 'AA==',
                bytes: 10,
                width: outputRule.width,
                height: outputRule.height,
                mime: 'image/png',
                hasTransparency: true,
                transparentPixelRatio: 0.5,
                visiblePixelRatio: 0.5,
            }),
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const loaded = await JSZip.loadAsync(blob);

        expect(manifest.items[0].source.id).toBe(asset.id);
        expect(Object.keys(loaded.files)).toEqual(expect.arrayContaining([
            'manifest.json',
            'export-report.json',
            'twitch-manual/emote/emote_112.png',
            'twitch-manual/emote/emote_56.png',
            'twitch-manual/emote/emote_28.png',
        ]));
    });
});

import { describe, expect, it, vi } from 'vitest';
import { createPreviewCache, createPreviewCacheKey } from './previewCache';

describe('previewCache', () => {
    it('reuses entries and tracks hit rate', () => {
        const cache = createPreviewCache({ maxEntries: 2, revokeUrl: vi.fn() });
        const blob = new Blob(['preview'], { type: 'image/png' });

        cache.set('a', blob);

        expect(cache.get('a').blob).toBe(blob);
        expect(cache.get('missing')).toBeNull();
        expect(cache.stats().hits).toBe(1);
        expect(cache.stats().misses).toBe(1);
        expect(cache.stats().hitRate).toBe(0.5);
    });

    it('evicts least recently used entries and revokes cache-owned URLs', () => {
        const revokeUrl = vi.fn();
        const cache = createPreviewCache({ maxEntries: 2, revokeUrl });

        cache.set('a', new Blob(['a']));
        cache.set('b', new Blob(['b']));
        cache.get('a');
        cache.set('c', new Blob(['c']));

        expect(cache.get('b')).toBeNull();
        expect(cache.get('a')).toBeTruthy();
        expect(revokeUrl).toHaveBeenCalledTimes(1);
    });

    it('creates stable keys for equivalent emote documents', () => {
        const asset = { id: 'asset-1', width: 100, height: 120, bytes: 1234, fileName: 'source.png' };
        const emoteA = {
            sourceId: 'asset-1',
            cropRect: { y: 2, x: 1, height: 40, width: 50 },
            frame: { offsetY: 0, zoom: 1.2, offsetX: 0.1 },
            adjustments: { saturation: 5, contrast: 0 },
        };
        const emoteB = {
            sourceId: 'asset-1',
            adjustments: { contrast: 0, saturation: 5 },
            frame: { zoom: 1.2, offsetX: 0.1, offsetY: 0 },
            cropRect: { width: 50, height: 40, x: 1, y: 2 },
        };

        expect(createPreviewCacheKey(emoteA, asset)).toBe(createPreviewCacheKey(emoteB, asset));
        expect(createPreviewCacheKey({ ...emoteB, padding: 0.1 }, asset)).not.toBe(createPreviewCacheKey(emoteA, asset));
    });
});

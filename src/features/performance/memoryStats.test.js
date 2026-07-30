import { describe, expect, it } from 'vitest';
import { createPerformanceSummary, formatBytes } from './memoryStats';

describe('memoryStats', () => {
    it('estimates asset, crop and preview cache pressure', () => {
        const summary = createPerformanceSummary({
            assets: {
                source: { width: 10, height: 10, bytes: 50 },
            },
            emotes: [
                { cropRect: { width: 5, height: 5 } },
                { cropRect: { width: 2, height: 10 } },
            ],
            previewUrls: { a: 'blob:a' },
            cacheStats: { entries: 2, bytes: 30, hitRate: 0.25 },
        });

        expect(summary.assetBytes).toBe(450);
        expect(summary.cropPixelBytes).toBe(180);
        expect(summary.cacheBytes).toBe(30);
        expect(summary.previewCount).toBe(1);
        expect(summary.cacheHitRate).toBe(0.25);
        expect(summary.warning).toBeNull();
    });

    it('formats bytes for compact UI labels', () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(2048)).toBe('2.0 KB');
        expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    });
});

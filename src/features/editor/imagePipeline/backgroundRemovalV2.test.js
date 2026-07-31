import { describe, expect, it } from 'vitest';
import { applyBackgroundRemovalMask, createBackgroundRemovalMask, getBackgroundRemovalV2Preset, sampleBackgroundColorsFromEdges } from './backgroundRemovalV2';

describe('backgroundRemovalV2', () => {
    it('removes connected white exterior while preserving internal white text and face details', () => {
        const image = createImage(18, 18, [255, 255, 255, 255]);
        fill(image, { x: 4, y: 4, width: 10, height: 10 }, [30, 30, 34, 255]);
        fill(image, { x: 6, y: 7, width: 2, height: 1 }, [255, 255, 255, 255]); // eyes
        fill(image, { x: 10, y: 7, width: 2, height: 1 }, [255, 255, 255, 255]); // eyes
        fill(image, { x: 7, y: 11, width: 4, height: 1 }, [255, 255, 255, 255]); // teeth/text
        fill(image, { x: 12, y: 5, width: 1, height: 1 }, [255, 255, 255, 255]); // highlight

        const result = createBackgroundRemovalMask(image.data, image.width, image.height, { mode: 'connected', tolerance: 26, feather: 0 });

        expect(alphaAt(result.mask, image.width, 0, 0)).toBe(0);
        expect(alphaAt(result.mask, image.width, 5, 5)).toBe(255);
        expect(alphaAt(result.mask, image.width, 7, 11)).toBe(255);
        expect(alphaAt(result.mask, image.width, 12, 5)).toBe(255);
    });

    it('samples gray backgrounds from multiple edges and corners', () => {
        const image = createImage(20, 16, [232, 233, 235, 255]);
        fill(image, { x: 5, y: 4, width: 10, height: 8 }, [42, 42, 46, 255]);

        const samples = sampleBackgroundColorsFromEdges(image.data, image.width, image.height);
        const result = createBackgroundRemovalMask(image.data, image.width, image.height, { samples, mode: 'connected', tolerance: 18, feather: 0 });

        expect(samples.length).toBeGreaterThanOrEqual(1);
        expect(samples[0][0]).toBeGreaterThan(225);
        expect(alphaAt(result.mask, image.width, 0, 8)).toBe(0);
        expect(alphaAt(result.mask, image.width, 8, 8)).toBe(255);
    });

    it('removes connected light grid backgrounds with #EFEFEF and #FEFEFE samples', () => {
        const image = createImage(24, 24, [239, 239, 239, 255]);
        fill(image, { x: 2, y: 2, width: 20, height: 20 }, [254, 254, 254, 255]);
        fill(image, { x: 5, y: 5, width: 14, height: 14 }, [24, 26, 30, 255]);
        fill(image, { x: 8, y: 9, width: 2, height: 1 }, [254, 254, 254, 255]);
        fill(image, { x: 14, y: 9, width: 2, height: 1 }, [254, 254, 254, 255]);
        fill(image, { x: 9, y: 15, width: 6, height: 1 }, [254, 254, 254, 255]);

        const preset = getBackgroundRemovalV2Preset('light-grid');
        const result = createBackgroundRemovalMask(image.data, image.width, image.height, {
            ...preset,
            feather: 0,
        });

        expect(alphaAt(result.mask, image.width, 0, 0)).toBe(0);
        expect(alphaAt(result.mask, image.width, 3, 3)).toBe(0);
        expect(alphaAt(result.mask, image.width, 6, 6)).toBe(255);
        expect(alphaAt(result.mask, image.width, 9, 15)).toBe(255);
    });

    it('exposes the light grid preset with connected mode and exact samples', () => {
        const preset = getBackgroundRemovalV2Preset('light-grid');

        expect(preset).toMatchObject({
            mode: 'connected',
            tolerance: 36,
            feather: 1,
            despill: 0.6,
            excessiveRemovalThreshold: 0.72,
        });
        expect(preset.samples).toEqual([
            [239, 239, 239],
            [254, 254, 254],
        ]);
    });

    it('supports global mode for disconnected background-colored regions', () => {
        const image = createImage(12, 12, [245, 245, 245, 255]);
        fill(image, { x: 2, y: 2, width: 8, height: 8 }, [25, 25, 28, 255]);
        fill(image, { x: 5, y: 5, width: 2, height: 2 }, [245, 245, 245, 255]);

        const connected = createBackgroundRemovalMask(image.data, image.width, image.height, { mode: 'connected', tolerance: 20, feather: 0 });
        const global = createBackgroundRemovalMask(image.data, image.width, image.height, { mode: 'global', tolerance: 20, feather: 0 });

        expect(alphaAt(connected.mask, image.width, 5, 5)).toBe(255);
        expect(alphaAt(global.mask, image.width, 5, 5)).toBe(0);
    });

    it('despills edge halos and reports excessive removal', () => {
        const image = createImage(10, 10, [255, 255, 255, 255]);
        fill(image, { x: 4, y: 4, width: 2, height: 2 }, [245, 245, 245, 255]);
        const result = createBackgroundRemovalMask(image.data, image.width, image.height, {
            mode: 'connected',
            tolerance: 8,
            feather: 1,
            excessiveRemovalThreshold: 0.5,
        });

        applyBackgroundRemovalMask(image.data, image.width, image.height, result, { tolerance: 8, despill: 1 });

        const haloOffset = (4 * image.width + 4) * 4;
        expect(image.data[haloOffset + 3]).toBeLessThan(255);
        expect(image.data[haloOffset]).toBeLessThan(245);
        expect(result.warnings[0]).toContain('Borrado excesivo');
    });

    it('applies erase and restore brush points to the independent mask', () => {
        const image = createImage(10, 10, [100, 100, 100, 255]);
        const result = createBackgroundRemovalMask(image.data, image.width, image.height, {
            mode: 'connected',
            tolerance: 1,
            feather: 0,
            erasurePoints: [{ x: 5, y: 5 }],
            restorePoints: [{ x: 5, y: 5 }],
            brushRadius: 1,
        });

        expect(alphaAt(result.mask, image.width, 5, 5)).toBe(255);
    });
});

function createImage(width, height, color) {
    const data = new Uint8ClampedArray(width * height * 4);
    fill({ data, width, height }, { x: 0, y: 0, width, height }, color);
    return { data, width, height };
}

function fill(image, rect, color) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        for (let x = rect.x; x < rect.x + rect.width; x += 1) {
            const offset = (y * image.width + x) * 4;
            image.data[offset] = color[0];
            image.data[offset + 1] = color[1];
            image.data[offset + 2] = color[2];
            image.data[offset + 3] = color[3];
        }
    }
}

function alphaAt(mask, width, x, y) {
    return mask[y * width + x];
}

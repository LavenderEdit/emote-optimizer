import { describe, expect, it } from 'vitest';
import { applyDropShadow, createOutputPlacement, resolveOutputSharpenAmount } from './renderEmote';

describe('createOutputPlacement', () => {
    it('contains rectangular crops without deformation', () => {
        const placement = createOutputPlacement(200, 100, 112, { fitMode: 'contain', padding: 0 });

        expect(placement.width).toBe(112);
        expect(placement.height).toBe(56);
        expect(placement.scale).toBeCloseTo(0.56);
    });

    it('covers the square canvas without stretching the crop', () => {
        const placement = createOutputPlacement(200, 100, 112, { fitMode: 'cover', padding: 0 });

        expect(placement.width).toBe(224);
        expect(placement.height).toBe(112);
        expect(placement.x).toBe(-56);
    });

    it('supports manual zoom and position using uniform scaling', () => {
        const placement = createOutputPlacement(100, 100, 112, {
            fitMode: 'manual',
            padding: 8,
            frame: { zoom: 1.5, offsetX: 4, offsetY: -6 },
        });

        expect(placement.width).toBe(144);
        expect(placement.height).toBe(144);
        expect(placement.x).toBe(-12);
        expect(placement.y).toBe(-22);
    });

    it('keeps relative framing consistent across Twitch output sizes', () => {
        const emote = {
            fitMode: 'manual',
            padding: 0.1,
            frame: { zoom: 1.25, offsetX: 0.12, offsetY: -0.08 },
        };

        const placements = [112, 56, 28].map((size) => ({
            size,
            placement: createOutputPlacement(100, 80, size, emote),
        }));

        const centerX = placements.map(({ size, placement }) => (placement.x + placement.width / 2 - size / 2) / size);
        const centerY = placements.map(({ size, placement }) => (placement.y + placement.height / 2 - size / 2) / size);
        const widthRatio = placements.map(({ size, placement }) => placement.width / size);

        expect(Math.max(...centerX) - Math.min(...centerX)).toBeLessThan(0.04);
        expect(Math.max(...centerY) - Math.min(...centerY)).toBeLessThan(0.04);
        expect(Math.max(...widthRatio) - Math.min(...widthRatio)).toBeLessThan(0.04);
    });

    it('uses stronger output sharpening for smaller Twitch sizes', () => {
        const amounts = [112, 56, 28].map((size) => resolveOutputSharpenAmount(size));

        expect(amounts[0]).toBeGreaterThan(0);
        expect(amounts[1]).toBeGreaterThan(amounts[0]);
        expect(amounts[2]).toBeGreaterThan(amounts[1]);
        expect(resolveOutputSharpenAmount(112, { exportQuality: { outputSharpen: 0.5 } })).toBe(0.5);
        expect(resolveOutputSharpenAmount(112, { exportQuality: { outputSharpen: 4 } })).toBe(1);
    });

    it('adds a drop shadow behind visible pixels without replacing opaque content', () => {
        const data = new Uint8ClampedArray(3 * 3 * 4);
        const center = (1 * 3 + 1) * 4;
        data[center] = 255;
        data[center + 1] = 0;
        data[center + 2] = 0;
        data[center + 3] = 255;

        applyDropShadow(data, 3, 3, {
            enabled: true,
            offsetX: 1,
            offsetY: 0,
            blur: 0,
            opacity: 0.5,
            color: [0, 0, 0],
        });

        const shadow = (1 * 3 + 2) * 4;
        expect(Array.from(data.slice(center, center + 4))).toEqual([255, 0, 0, 255]);
        expect(data[shadow + 3]).toBeGreaterThan(0);
        expect(Array.from(data.slice(shadow, shadow + 3))).toEqual([0, 0, 0]);
    });
});

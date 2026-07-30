import { describe, expect, it } from 'vitest';
import { createOutputPlacement } from './renderEmote';

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
});

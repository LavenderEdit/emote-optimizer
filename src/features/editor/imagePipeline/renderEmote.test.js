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
});

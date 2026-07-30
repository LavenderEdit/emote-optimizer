import { describe, expect, it } from 'vitest';
import { createContainSquarePlacement, createContainSquareRect, insetRect, mapRect, normalizeRect } from './rect';

describe('rect utilities', () => {
    it('normalizes negative dimensions', () => {
        expect(normalizeRect({ x: 10, y: 20, width: -4, height: -6 })).toEqual({
            x: 6,
            y: 14,
            width: 4,
            height: 6,
        });
    });

    it('maps a rect between coordinate spaces', () => {
        expect(mapRect(
            { x: 10, y: 20, width: 30, height: 40 },
            { x: 0, y: 0, width: 100, height: 200 },
            { x: 0, y: 0, width: 1000, height: 1000 },
        )).toEqual({
            x: 100,
            y: 100,
            width: 300,
            height: 200,
        });
    });

    it('applies inset without collapsing the rect', () => {
        expect(insetRect({ x: 0, y: 0, width: 5, height: 5 }, 4)).toEqual({
            x: 4,
            y: 4,
            width: 1,
            height: 1,
        });
    });

    it('places rectangular content inside a square without distortion', () => {
        const placement = createContainSquarePlacement(200, 100, 112, 0);

        expect(placement).toMatchObject({
            x: 0,
            y: 28,
            width: 112,
            height: 56,
        });
        expect(placement.scale).toBeCloseTo(0.56);
    });

    it('creates a square crop with padding inside bounds', () => {
        expect(createContainSquareRect(
            { x: 20, y: 40, width: 80, height: 40 },
            { x: 0, y: 0, width: 200, height: 200 },
            10,
        )).toEqual({
            x: 10,
            y: 10,
            width: 100,
            height: 100,
        });
    });
});

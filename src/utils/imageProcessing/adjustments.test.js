import { describe, expect, it } from 'vitest';
import { applyProAdjustments, normalizeLevels } from './adjustments';

describe('applyProAdjustments levels', () => {
    it('applies input and output levels without touching transparent pixels', () => {
        const data = new Uint8ClampedArray([
            32, 64, 128, 255,
            240, 240, 240, 0,
        ]);

        applyProAdjustments(data, 2, 1, {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpen: 0,
            levels: {
                inputBlack: 32,
                inputWhite: 224,
                gamma: 1,
                outputBlack: 10,
                outputWhite: 210,
            },
        });

        expect(Array.from(data.slice(0, 4))).toEqual([10, 43, 110, 255]);
        expect(Array.from(data.slice(4, 8))).toEqual([240, 240, 240, 0]);
    });

    it('normalizes invalid level ranges', () => {
        expect(normalizeLevels({
            inputBlack: 300,
            inputWhite: 10,
            gamma: -1,
            outputBlack: 260,
            outputWhite: 20,
        })).toEqual({
            inputBlack: 255,
            inputWhite: 256,
            gamma: 0.1,
            outputBlack: 255,
            outputWhite: 255,
        });
    });
});

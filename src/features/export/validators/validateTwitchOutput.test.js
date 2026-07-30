import { describe, expect, it } from 'vitest';
import { twitchStaticManual } from '../presets';
import { validateTwitchOutput } from './validateTwitchOutput';

describe('validateTwitchOutput', () => {
    it('accepts a valid 112px manual Twitch PNG metadata record', () => {
        const result = validateTwitchOutput({
            name: 'hola',
            mime: 'image/png',
            extension: 'png',
            width: 112,
            height: 112,
            bytes: 40_000,
            hasTransparency: true,
            visiblePixelRatio: 0.6,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects dimensions and weight that violate the manual preset', () => {
        const result = validateTwitchOutput({
            name: 'hola',
            mime: 'image/png',
            extension: 'png',
            width: 100,
            height: 112,
            bytes: 120_000,
            hasTransparency: true,
            visiblePixelRatio: 0.6,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            'La salida debe ser cuadrada.',
            'Ancho invalido: se esperaba 112px.',
            'Peso mayor al limite de 100000 bytes.',
        ]));
    });
});

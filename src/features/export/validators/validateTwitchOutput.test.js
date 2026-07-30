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
            transparentPixelRatio: 0.25,
            visiblePixelRatio: 0.6,
            pngSignatureValid: true,
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
            transparentPixelRatio: 0.25,
            visiblePixelRatio: 0.6,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            'La salida debe ser cuadrada.',
            'Ancho invalido: se esperaba 112px.',
            'Peso mayor al limite de 100000 bytes.',
        ]));
    });

    it('rejects a fully opaque output when the preset requires transparency', () => {
        const result = validateTwitchOutput({
            name: 'opaco',
            mime: 'image/png',
            extension: 'png',
            width: 112,
            height: 112,
            bytes: 40_000,
            hasTransparency: false,
            transparentPixelRatio: 0,
            visiblePixelRatio: 0.8,
            pngSignatureValid: true,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            'La salida debe conservar transparencia real.',
            'La salida es completamente opaca.',
        ]));
    });

    it('accepts a partially transparent output that satisfies the preset', () => {
        const result = validateTwitchOutput({
            name: 'parcial',
            mime: 'image/png',
            extension: 'png',
            width: 112,
            height: 112,
            bytes: 40_000,
            hasTransparency: true,
            transparentPixelRatio: 0.42,
            visiblePixelRatio: 0.58,
            pngSignatureValid: true,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects a completely empty transparent output', () => {
        const result = validateTwitchOutput({
            name: 'vacio',
            mime: 'image/png',
            extension: 'png',
            width: 112,
            height: 112,
            bytes: 12_000,
            hasTransparency: true,
            transparentPixelRatio: 1,
            visiblePixelRatio: 0,
            pngSignatureValid: true,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('La salida no contiene pixeles visibles.');
    });

    it('rejects metadata that reports a bad PNG signature', () => {
        const result = validateTwitchOutput({
            name: 'firma_rota',
            mime: 'image/png',
            extension: 'png',
            width: 112,
            height: 112,
            bytes: 40_000,
            hasTransparency: true,
            transparentPixelRatio: 0.4,
            visiblePixelRatio: 0.6,
            pngSignatureValid: false,
        }, twitchStaticManual, twitchStaticManual.outputs[0]);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Firma PNG invalida.');
    });
});

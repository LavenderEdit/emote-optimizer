import { describe, expect, it } from 'vitest';
import { sanitizeName, uniqueSafeName } from './names';

describe('sanitizeName', () => {
    it('normalizes accents, punctuation, spacing and extension', () => {
        expect(sanitizeName('Mas te vale callarte!!.PNG')).toBe('mas_te_vale_callarte');
    });

    it('uses a fallback for empty names', () => {
        expect(sanitizeName('???', 'emote_001')).toBe('emote_001');
    });
});

describe('uniqueSafeName', () => {
    it('adds a numeric suffix deterministically', () => {
        const used = new Set(['hola']);

        expect(uniqueSafeName('Hola', used)).toBe('hola_2');
        expect(uniqueSafeName('Hola', used)).toBe('hola_3');
    });
});

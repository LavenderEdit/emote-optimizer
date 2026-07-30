import { describe, expect, it } from 'vitest';
import { validateDecodedImageDimensions, validateImageFile } from './imageValidation';

describe('image validation', () => {
    it('accepts configured static image formats', () => {
        const result = validateImageFile({ name: 'emote.png', type: 'image/png', size: 1024 });
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects unsupported image MIME types', () => {
        const result = validateImageFile({ name: 'emote.gif', type: 'image/gif', size: 1024 });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Formato no soportado');
    });

    it('rejects decoded images over the megapixel limit', () => {
        const result = validateDecodedImageDimensions(9000, 9000, {
            maxMegapixels: 24,
            maxWidth: 10000,
            maxHeight: 10000,
        });

        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('megapixeles');
    });
});

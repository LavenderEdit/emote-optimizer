import { describe, expect, it, vi } from 'vitest';
import { createEmoteVariant } from './variants';

describe('createEmoteVariant', () => {
    it('creates a non-destructive document variant with a unique name', () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('variant-id');
        const base = {
            id: 'base-id',
            name: 'hola',
            sourceId: 'asset-id',
            cropRect: { x: 1, y: 2, width: 30, height: 40 },
            adjustments: { brightness: 0 },
            validation: { warnings: [] },
        };

        const variant = createEmoteVariant(base, [base, { id: 'old', name: 'hola_variant' }]);

        expect(variant.id).toBe('variant-id');
        expect(variant.variantOf).toBe('base-id');
        expect(variant.sourceId).toBe('asset-id');
        expect(variant.cropRect).toEqual(base.cropRect);
        expect(variant.cropRect).not.toBe(base.cropRect);
        expect(variant.name).toBe('hola_variant_2');
        expect(variant.validation.warnings).toContain('Variante derivada; comparte fuente y crop no destructivo.');
    });
});

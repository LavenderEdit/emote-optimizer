import { describe, expect, it } from 'vitest';
import { findEdgeConnectedContentBounds, getContentTouchWarnings } from './trimContent';

describe('trimContent', () => {
    it('trims only edge-connected background and keeps enclosed matching colors as content', () => {
        const width = 12;
        const height = 12;
        const data = new Uint8ClampedArray(width * height * 4);
        fill(data, width, { x: 0, y: 0, width, height }, [255, 255, 255, 255]);
        fill(data, width, { x: 3, y: 3, width: 6, height: 6 }, [20, 20, 20, 255]);
        fill(data, width, { x: 5, y: 5, width: 2, height: 2 }, [255, 255, 255, 255]);

        const trim = findEdgeConnectedContentBounds(data, width, height, { x: 0, y: 0, width, height }, { tolerance: 12 });

        expect(trim.contentRect).toEqual({ x: 3, y: 3, width: 6, height: 6 });
        expect(trim.visiblePixels).toBe(36);
    });

    it('warns when visible content touches the crop boundary', () => {
        const warnings = getContentTouchWarnings(
            { x: 0, y: 4, width: 8, height: 6 },
            { x: 0, y: 0, width: 12, height: 12 },
            2,
        );

        expect(warnings).toContain('Contenido tocando el borde izquierdo del crop.');
        expect(warnings).not.toContain('Contenido tocando el borde superior del crop.');
    });
});

function fill(data, width, rect, color) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        for (let x = rect.x; x < rect.x + rect.width; x += 1) {
            const offset = (y * width + x) * 4;
            data[offset] = color[0];
            data[offset + 1] = color[1];
            data[offset + 2] = color[2];
            data[offset + 3] = color[3];
        }
    }
}

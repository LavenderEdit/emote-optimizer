import { describe, expect, it } from 'vitest';
import { scoreEmptyCell } from './scoreEmptyCell';

function makeImageData(width, height, fill = [255, 255, 255, 255]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < data.length; index += 4) {
        data[index] = fill[0];
        data[index + 1] = fill[1];
        data[index + 2] = fill[2];
        data[index + 3] = fill[3];
    }
    return data;
}

describe('scoreEmptyCell', () => {
    it('classifies a uniform background cell as empty', () => {
        const data = makeImageData(10, 10);
        const result = scoreEmptyCell(data, 10, 10, { x: 0, y: 0, width: 10, height: 10 });

        expect(result.classification).toBe('empty');
        expect(result.emptyScore).toBeGreaterThan(0.9);
    });

    it('classifies a cell with visible content as content', () => {
        const data = makeImageData(10, 10);
        for (let y = 2; y < 8; y += 1) {
            for (let x = 2; x < 8; x += 1) {
                const offset = (y * 10 + x) * 4;
                data[offset] = 0;
                data[offset + 1] = 0;
                data[offset + 2] = 0;
            }
        }

        const result = scoreEmptyCell(data, 10, 10, { x: 0, y: 0, width: 10, height: 10 });

        expect(result.classification).toBe('content');
        expect(result.foregroundRatio).toBeGreaterThan(0.3);
    });
});

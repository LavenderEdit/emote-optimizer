import { describe, expect, it } from 'vitest';
import { createSyntheticReferenceGridImageData } from '../../../test/fixtures/syntheticGridImageData';
import { analyzeGridImageData } from './analyzeGrid';

describe('analyzeGridImageData', () => {
    it('detects the 994x1001 reference-style 5x5 grid and classifies the last cell as empty or uncertain', () => {
        const fixture = createSyntheticReferenceGridImageData();
        const analysis = analyzeGridImageData(fixture);

        expect(analysis.rows).toBe(5);
        expect(analysis.columns).toBe(5);
        expect(analysis.cells).toHaveLength(25);
        expect(analysis.confidence).toBeGreaterThanOrEqual(0.68);

        const contentCells = analysis.cells.filter((cell) => cell.classification === 'content');
        const lastCell = analysis.cells.find((cell) => cell.id === 'r5c5');

        expect(contentCells).toHaveLength(24);
        expect(['empty', 'uncertain']).toContain(lastCell.classification);
        expect(lastCell.enabled).toBe(false);
    });
});

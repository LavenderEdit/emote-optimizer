import { describe, expect, it } from 'vitest';
import { grayBackgroundGridFixture, irregularGutterGridFixture, shadowedGridFixture, sixByThreeGridFixture, threeByFourGridFixture } from '../../../test/fixtures/gridFixtures';
import { createGridFixtureImageData, createRealReferenceGridImageData, createSyntheticReferenceGridImageData } from '../../../test/fixtures/syntheticGridImageData';
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

    it('keeps the documented real 994x1001 reference fixture at 5x5', () => {
        const fixture = createRealReferenceGridImageData();
        const analysis = analyzeGridImageData(fixture);

        expect(analysis.rows).toBe(5);
        expect(analysis.columns).toBe(5);
        expect(analysis.cells).toHaveLength(25);
        expect(analysis.cells.filter((cell) => cell.classification === 'content')).toHaveLength(24);
        expect(['empty', 'uncertain']).toContain(analysis.cells.find((cell) => cell.id === 'r5c5').classification);
    });

    it.each([
        ['gray backgrounds', grayBackgroundGridFixture],
        ['soft shadows', shadowedGridFixture],
        ['irregular gutters', irregularGutterGridFixture],
        ['3x4 grid', threeByFourGridFixture],
        ['6x3 grid', sixByThreeGridFixture],
    ])('detects %s fixture rows and columns', (_, gridFixture) => {
        const fixture = createGridFixtureImageData(gridFixture);
        const analysis = analyzeGridImageData(fixture);

        expect(analysis.rows).toBe(gridFixture.rows);
        expect(analysis.columns).toBe(gridFixture.columns);
        expect(analysis.cells).toHaveLength(gridFixture.rows * gridFixture.columns);
        expect(analysis.cells.filter((cell) => cell.classification === 'content')).toHaveLength(gridFixture.expectedContentCells);
    });
});

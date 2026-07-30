import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import process from 'node:process';
import { grayBackgroundGridFixture, irregularGutterGridFixture, shadowedGridFixture, sixByThreeGridFixture, threeByFourGridFixture } from '../../../test/fixtures/gridFixtures';
import { createGridFixtureImageData, createSyntheticReferenceGridImageData } from '../../../test/fixtures/syntheticGridImageData';
import { readPngImageData } from '../../../test/fixtures/readPngImageData';
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
        const fixture = readPngImageData(resolve(process.cwd(), 'src/test/fixtures/images/reference-grid-994x1001.png'));
        const analysis = analyzeGridImageData(fixture);

        expect(fixture.width).toBe(994);
        expect(fixture.height).toBe(1001);
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

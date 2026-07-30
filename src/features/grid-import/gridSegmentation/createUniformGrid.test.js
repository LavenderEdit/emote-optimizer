import { describe, expect, it } from 'vitest';
import { referenceGrid5x5Fixture } from '../../../test/fixtures/gridFixtures';
import { createUniformGrid, updateBandEdge } from './createUniformGrid';

describe('createUniformGrid', () => {
    it('creates the reference 5x5 fixture with the expected empty-cell slot', () => {
        const fixture = referenceGrid5x5Fixture;
        const grid = createUniformGrid({
            sourceWidth: fixture.width,
            sourceHeight: fixture.height,
            settings: {
                rows: fixture.rows,
                columns: fixture.columns,
                margins: fixture.margins,
                horizontalGap: fixture.horizontalGap,
                verticalGap: fixture.verticalGap,
                inset: 0,
            },
        });

        expect(grid.rows).toBe(5);
        expect(grid.columns).toBe(5);
        expect(grid.cells).toHaveLength(25);
        expect(grid.cells.at(-1).id).toBe(fixture.emptyCellId);
        expect(grid.cells[0].sourceRect).toEqual({
            x: 14,
            y: 28,
            width: 165,
            height: 164,
        });
    });

    it('preserves cell flags when rebuilding compatible cells', () => {
        const grid = createUniformGrid({
            sourceWidth: 100,
            sourceHeight: 100,
            settings: {
                rows: 2,
                columns: 2,
                margins: { top: 0, right: 0, bottom: 0, left: 0 },
                horizontalGap: 0,
                verticalGap: 0,
                inset: 2,
            },
            previousCells: [{ id: 'r2c2', enabled: false, empty: true, name: 'skip_me' }],
        });

        expect(grid.cells.find((cell) => cell.id === 'r2c2')).toMatchObject({
            enabled: false,
            empty: true,
            name: 'skip_me',
        });
    });
});

describe('updateBandEdge', () => {
    it('moves a guide without crossing adjacent bands', () => {
        const bands = [{ start: 0, end: 40 }, { start: 60, end: 100 }];
        const updated = updateBandEdge(bands, 0, 'end', 80, 100, 10);

        expect(updated[0].end).toBe(60);
    });
});

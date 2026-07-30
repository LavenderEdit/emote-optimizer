import { describe, expect, it } from 'vitest';
import { createGridDraft } from './gridDraft';
import { addFreeRegion, addGuide, editCellRect, mergeAdjacentCells, nudgeGuide, redoDraft, reorderCells, splitCell, undoDraft } from './advancedGridEditing';

const asset = {
    id: 'grid',
    fileName: 'grid.png',
    name: 'grid',
    mimeType: 'image/png',
    bytes: 100,
    width: 100,
    height: 100,
    objectUrl: 'blob:grid',
};

describe('advanced grid editing', () => {
    it('adds guides and supports undo/redo', () => {
        const draft = createGridDraft(asset, { rows: 2, columns: 2 });
        const added = addGuide(draft, 'column');
        const undone = undoDraft(added);
        const redone = redoDraft(undone);

        expect(added.columnBands).toHaveLength(3);
        expect(undone.columnBands).toHaveLength(2);
        expect(redone.columnBands).toHaveLength(3);
    });

    it('edits, splits, merges and reorders cells', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 2 });
        const edited = editCellRect(draft, 'r1c1', { x: 1, y: 2, width: 20, height: 30 });
        const split = splitCell(edited, 'r1c1', 'vertical');
        const merged = mergeAdjacentCells(split, 'r1c1a');
        const reordered = reorderCells(merged, 'r1c2', 'up');

        expect(edited.cells[0].sourceRect).toEqual({ x: 1, y: 2, width: 20, height: 30 });
        expect(split.cells.some((cell) => cell.id === 'r1c1a')).toBe(true);
        expect(merged.cells).toHaveLength(2);
        expect(reordered.cells[0].id).toBe('r1c2');
    });

    it('constrains guide nudges with the same minimum geometry as dragging', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 2 });
        const nudged = nudgeGuide(draft, { axis: 'x', index: 1, edge: 'start' }, 99);

        expect(nudged.columnBands[1].start).toBe(92);
        expect(nudged.columnBands[1].end).toBe(100);
        expect(nudged.cells[1].sourceRect.width).toBe(8);
    });

    it('normalizes invalid manual cell rectangles inside the asset', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 1 });
        const edited = editCellRect(draft, 'r1c1', { x: 90, y: 110, width: -50, height: 0 });
        const cell = edited.cells[0];

        expect(cell.sourceRect).toEqual({ x: 40, y: 92, width: 50, height: 8 });
        expect(cell.errors).toContain('Dimensiones negativas normalizadas.');
        expect(cell.errors).toContain('El crop no puede tener tamano cero.');
        expect(cell.errors).toContain('Crop ajustado a los limites del asset.');
    });

    it('adds free regions outside the regular grid flow', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 1 });
        const next = addFreeRegion(draft);

        expect(next.segmentationMode).toBe('free');
        expect(next.cells.at(-1).freeRegion).toBe(true);
    });

    it('preserves a free region after moving a guide', () => {
        const draft = createGridDraft(asset, { rows: 2, columns: 2 });
        const withFreeRegion = addFreeRegion(draft);
        const nudged = nudgeGuide(withFreeRegion, { axis: 'x', index: 0, edge: 'end' }, -10);

        expect(nudged.cells.some((cell) => cell.freeRegion && cell.name === 'region_005')).toBe(true);
        expect(nudged.cells).toHaveLength(5);
    });
});

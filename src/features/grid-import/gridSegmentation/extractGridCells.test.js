import { describe, expect, it } from 'vitest';
import { createGridDraft } from './gridDraft';
import { extractGridCellsToDocuments, getCellGenerationKey } from './extractGridCells';

const asset = {
    id: 'asset-grid',
    fileName: 'grid.png',
    name: 'grid',
    mimeType: 'image/png',
    bytes: 1234,
    width: 100,
    height: 100,
    objectUrl: 'blob:grid',
};

describe('extractGridCellsToDocuments', () => {
    it('creates grid-cell documents without permanent data URLs', () => {
        const draft = createGridDraft(asset, { rows: 2, columns: 2 });
        draft.cells[3] = { ...draft.cells[3], empty: true, enabled: false };

        const documents = extractGridCellsToDocuments(draft);

        expect(documents).toHaveLength(3);
        expect(documents.every((document) => document.sourceId === asset.id)).toBe(true);
        expect(documents.every((document) => !('originalSrc' in document))).toBe(true);
        expect(documents.every((document) => !('processedSrc' in document))).toBe(true);
        expect(documents[0].cropRect).toEqual(documents[0].gridCell.contentRect);
    });

    it('skips cells that already have a matching generation key', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 1 });
        draft.generatedCellKeys = {
            [draft.cells[0].id]: getCellGenerationKey(draft.cells[0]),
        };

        expect(extractGridCellsToDocuments(draft)).toEqual([]);
    });
});

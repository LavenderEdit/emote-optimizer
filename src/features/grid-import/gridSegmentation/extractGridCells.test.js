import { describe, expect, it } from 'vitest';
import { createGridDraft } from './gridDraft';
import { extractGridCellsToDocuments, getCellGenerationKey, upsertGridCellDocuments } from './extractGridCells';

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
        const existingDocument = {
            id: 'grid:asset-grid:r1c1',
            sourceId: asset.id,
            generationKey: getCellGenerationKey(draft.cells[0]),
        };

        expect(extractGridCellsToDocuments(draft, [existingDocument])).toEqual([]);
    });

    it('replaces a changed cell document by stable identity and preserves manual edits', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 1 });
        const [initialDocument] = extractGridCellsToDocuments(draft);
        const editedDocument = {
            ...initialDocument,
            padding: 18,
            fitMode: 'cover',
            adjustments: { brightness: 12, contrast: 3, saturation: 4, sharpen: 5 },
        };
        const changedDraft = {
            ...draft,
            cells: draft.cells.map((cell) => ({
                ...cell,
                name: 'changed_cell',
                contentRect: { ...cell.contentRect, x: cell.contentRect.x + 2 },
            })),
        };
        const replacementDocuments = extractGridCellsToDocuments(changedDraft, [editedDocument]);
        const nextEmotes = upsertGridCellDocuments([editedDocument], changedDraft, replacementDocuments);

        expect(replacementDocuments).toHaveLength(1);
        expect(nextEmotes).toHaveLength(1);
        expect(nextEmotes[0].id).toBe(editedDocument.id);
        expect(nextEmotes[0].padding).toBe(18);
        expect(nextEmotes[0].fitMode).toBe('cover');
        expect(nextEmotes[0].name).toBe('changed_cell');
        expect(nextEmotes[0].cropRect.x).toBe(2);
    });

    it('removes an old generated document when its cell becomes disabled', () => {
        const draft = createGridDraft(asset, { rows: 1, columns: 1 });
        const [initialDocument] = extractGridCellsToDocuments(draft);
        const disabledDraft = {
            ...draft,
            cells: draft.cells.map((cell) => ({ ...cell, enabled: false })),
        };

        expect(upsertGridCellDocuments([initialDocument], disabledDraft, [])).toEqual([]);
    });
});

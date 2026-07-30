import { createEmoteDocumentFromGridCell } from '../../editor/model/createEmoteDocument';

export function getCellGenerationKey(cell) {
    const rect = cell.contentRect;
    return [
        cell.id,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        cell.enabled ? 'enabled' : 'disabled',
        cell.empty ? 'empty' : 'content',
        cell.name,
    ].join(':');
}

export function extractGridCellsToDocuments(draft) {
    const generatedKeys = draft.generatedCellKeys || {};
    const activeCells = draft.cells.filter((cell) => (
        cell.enabled &&
        !cell.empty &&
        generatedKeys[cell.id] !== getCellGenerationKey(cell)
    ));

    return activeCells.map((cell) => createEmoteDocumentFromGridCell({
        gridAsset: draft.source,
        cell,
        generationKey: getCellGenerationKey(cell),
    }));
}

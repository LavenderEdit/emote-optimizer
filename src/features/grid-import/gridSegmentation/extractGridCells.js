import { createEmoteDocumentFromGridCell, getGridCellDocumentId } from '../../editor/model/createEmoteDocument';

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

export function extractGridCellsToDocuments(draft, existingDocuments = []) {
    const existingById = new Map(existingDocuments.map((document) => [document.id, document]));
    const documents = [];

    for (const cell of draft.cells) {
        if (!cell.enabled || cell.empty) continue;
        const id = getGridCellDocumentId(draft.source.id, cell.id);
        const previousDocument = existingById.get(id);
        const generationKey = getCellGenerationKey(cell);

        if (previousDocument?.generationKey === generationKey) continue;

        documents.push(createEmoteDocumentFromGridCell({
            gridAsset: draft.source,
            cell,
            generationKey,
            previousDocument,
        }));
    }

    return documents;
}

export function upsertGridCellDocuments(emotes, draft, documents) {
    const replacementById = new Map(documents.map((document) => [document.id, document]));
    const currentCellIds = new Set(draft.cells.map((cell) => getGridCellDocumentId(draft.source.id, cell.id)));
    const activeCellIds = new Set(
        draft.cells
            .filter((cell) => cell.enabled && !cell.empty)
            .map((cell) => getGridCellDocumentId(draft.source.id, cell.id))
    );
    const nextEmotes = [];
    const seenReplacementIds = new Set();

    for (const emote of emotes) {
        const isCurrentGridCell = emote.sourceId === draft.source.id && currentCellIds.has(emote.id);
        if (isCurrentGridCell && !activeCellIds.has(emote.id)) continue;

        const replacement = replacementById.get(emote.id);
        if (replacement) {
            nextEmotes.push(replacement);
            seenReplacementIds.add(emote.id);
        } else {
            nextEmotes.push(emote);
        }
    }

    for (const document of documents) {
        if (!seenReplacementIds.has(document.id)) nextEmotes.push(document);
    }

    return nextEmotes;
}

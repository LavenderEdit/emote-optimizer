import { createEmoteDocumentFromGridCell } from '../../editor/model/createEmoteDocument';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen del grid.'));
        image.src = src;
    });
}

export async function extractGridCellsToDocuments(draft) {
    const image = await loadImage(draft.source.objectUrl);
    const activeCells = draft.cells.filter((cell) => cell.enabled && !cell.empty);
    const documents = [];

    for (const cell of activeCells) {
        const rect = cell.contentRect;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            image,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        documents.push(createEmoteDocumentFromGridCell({
            gridAsset: draft.source,
            cell,
            dataUrl: canvas.toDataURL('image/png'),
        }));
    }

    return documents;
}

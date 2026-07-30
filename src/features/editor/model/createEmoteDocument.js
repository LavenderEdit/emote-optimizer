import { sanitizeName } from '../../../shared/files/names';

const DEFAULT_ADJUSTMENTS = {
    brightness: 0,
    contrast: 0,
    saturation: 15,
    sharpen: 25,
};

export function createEmoteDocumentFromAsset(asset) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        documentType: 'individual',
        name: sanitizeName(asset.name, 'emote'),
        sourceId: asset.id,
        source: {
            id: asset.id,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            bytes: asset.bytes,
            width: asset.width,
            height: asset.height,
            objectUrl: asset.objectUrl,
        },
        cropRect: { x: 0, y: 0, width: asset.width, height: asset.height },
        fitMode: 'contain',
        padding: 0,
        backgroundRemoval: {
            mode: 'manual-flood-fill',
            tolerance: 30,
            erasurePoints: [],
            restorePoints: [],
        },
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        outline: {
            enabled: false,
            size: 3,
            color: [255, 255, 255],
        },
        validation: {
            errors: [],
            warnings: [],
        },
        originalSrc: asset.objectUrl,
        processedSrc: null,
        erasurePoints: [],
        restorePoints: [],
        history: [],
        tolerance: 30,
        isAutoOutlineActive: false,
    };
}

export function createEmoteDocumentFromGridCell({ gridAsset, cell, dataUrl }) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        documentType: 'grid-cell',
        name: sanitizeName(cell.name, `emote_${cell.row + 1}_${cell.column + 1}`),
        sourceId: gridAsset.id,
        source: {
            id: gridAsset.id,
            fileName: gridAsset.fileName,
            mimeType: gridAsset.mimeType,
            bytes: gridAsset.bytes,
            width: gridAsset.width,
            height: gridAsset.height,
        },
        gridCell: {
            id: cell.id,
            row: cell.row,
            column: cell.column,
            sourceRect: cell.sourceRect,
            contentRect: cell.contentRect,
        },
        cropRect: cell.contentRect,
        fitMode: 'contain',
        padding: 0,
        backgroundRemoval: {
            mode: 'manual-flood-fill',
            tolerance: 30,
            erasurePoints: [],
            restorePoints: [],
        },
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        outline: {
            enabled: false,
            size: 3,
            color: [255, 255, 255],
        },
        validation: {
            errors: [],
            warnings: cell.empty ? ['Celda marcada como vacia.'] : [],
        },
        originalSrc: dataUrl,
        processedSrc: null,
        erasurePoints: [],
        restorePoints: [],
        history: [],
        tolerance: 30,
        isAutoOutlineActive: false,
    };
}

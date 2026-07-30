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
        sourceMeta: createSourceMeta(asset),
        cropRect: { x: 0, y: 0, width: asset.width, height: asset.height },
        fitMode: 'contain',
        padding: 0,
        frame: {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
        },
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
        erasurePoints: [],
        restorePoints: [],
        history: [],
        tolerance: 30,
        isAutoOutlineActive: false,
    };
}

export function getGridCellDocumentId(sourceId, cellId) {
    return `grid:${sourceId}:${cellId}`;
}

export function createEmoteDocumentFromGridCell({ gridAsset, cell, generationKey, previousDocument = null }) {
    const preserved = previousDocument ? {
        fitMode: previousDocument.fitMode,
        padding: previousDocument.padding,
        frame: previousDocument.frame,
        backgroundRemoval: previousDocument.backgroundRemoval,
        adjustments: previousDocument.adjustments,
        outline: previousDocument.outline,
        erasurePoints: previousDocument.erasurePoints,
        restorePoints: previousDocument.restorePoints,
        history: previousDocument.history,
        tolerance: previousDocument.tolerance,
        isAutoOutlineActive: previousDocument.isAutoOutlineActive,
    } : {};

    return {
        id: previousDocument?.id || getGridCellDocumentId(gridAsset.id, cell.id),
        documentType: 'grid-cell',
        name: sanitizeName(cell.name, `emote_${cell.row + 1}_${cell.column + 1}`),
        sourceId: gridAsset.id,
        sourceMeta: createSourceMeta(gridAsset),
        gridCell: {
            id: cell.id,
            row: cell.row,
            column: cell.column,
            sourceRect: cell.sourceRect,
            contentRect: cell.contentRect,
            classification: cell.classification || (cell.empty ? 'empty' : 'content'),
            diagnostics: cell.diagnostics || null,
        },
        cropRect: cell.contentRect,
        generationKey,
        fitMode: preserved.fitMode || 'contain',
        padding: preserved.padding ?? 0,
        frame: preserved.frame || {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
        },
        backgroundRemoval: preserved.backgroundRemoval || {
            mode: 'manual-flood-fill',
            tolerance: 30,
            erasurePoints: [],
            restorePoints: [],
        },
        adjustments: preserved.adjustments || { ...DEFAULT_ADJUSTMENTS },
        outline: preserved.outline || {
            enabled: false,
            size: 3,
            color: [255, 255, 255],
        },
        validation: {
            errors: [],
            warnings: cell.warnings || (cell.empty ? ['Celda marcada como vacia.'] : []),
        },
        erasurePoints: preserved.erasurePoints || [],
        restorePoints: preserved.restorePoints || [],
        history: preserved.history || [],
        tolerance: preserved.tolerance ?? 30,
        isAutoOutlineActive: preserved.isAutoOutlineActive || false,
    };
}

function createSourceMeta(asset) {
    return {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
    };
}

import { roundRect } from '../../../shared/math/rect';
import { rebuildDraftFromBands, updateDraftCell } from './gridDraft';

export function pushDraftHistory(draft) {
    return {
        ...draft,
        history: {
            past: [...(draft.history?.past || []), createDraftSnapshot(draft)].slice(-50),
            future: [],
        },
    };
}

export function undoDraft(draft) {
    const past = draft.history?.past || [];
    if (past.length === 0) return draft;
    const previous = past[past.length - 1];
    return {
        ...draft,
        ...previous,
        history: {
            past: past.slice(0, -1),
            future: [createDraftSnapshot(draft), ...(draft.history?.future || [])].slice(0, 50),
        },
    };
}

export function redoDraft(draft) {
    const future = draft.history?.future || [];
    if (future.length === 0) return draft;
    const next = future[0];
    return {
        ...draft,
        ...next,
        history: {
            past: [...(draft.history?.past || []), createDraftSnapshot(draft)].slice(-50),
            future: future.slice(1),
        },
    };
}

export function addGuide(draft, axis) {
    if (axis === 'row') {
        const largest = findLargestBandIndex(draft.rowBands);
        const bands = splitBand(draft.rowBands, largest);
        return rebuildDraftFromBands(pushDraftHistory(draft), bands, draft.columnBands);
    }
    const largest = findLargestBandIndex(draft.columnBands);
    const bands = splitBand(draft.columnBands, largest);
    return rebuildDraftFromBands(pushDraftHistory(draft), draft.rowBands, bands);
}

export function removeGuide(draft, axis, index = null) {
    if (axis === 'row') {
        if (draft.rowBands.length <= 1) return draft;
        const removeIndex = index ?? draft.rowBands.length - 1;
        return rebuildDraftFromBands(pushDraftHistory(draft), removeBand(draft.rowBands, removeIndex), draft.columnBands);
    }
    if (draft.columnBands.length <= 1) return draft;
    const removeIndex = index ?? draft.columnBands.length - 1;
    return rebuildDraftFromBands(pushDraftHistory(draft), draft.rowBands, removeBand(draft.columnBands, removeIndex));
}

export function nudgeGuide(draft, guide, delta) {
    if (!guide) return draft;
    const bands = guide.axis === 'x' ? draft.columnBands : draft.rowBands;
    const nudgedBands = bands.map((band, index) => {
        if (index !== guide.index) return band;
        return {
            ...band,
            [guide.edge]: Math.max(0, band[guide.edge] + delta),
        };
    });

    return guide.axis === 'x'
        ? rebuildDraftFromBands(pushDraftHistory(draft), draft.rowBands, nudgedBands)
        : rebuildDraftFromBands(pushDraftHistory(draft), nudgedBands, draft.columnBands);
}

export function editCellRect(draft, cellId, rect) {
    const nextRect = roundRect(rect);
    return updateDraftCell(pushDraftHistory(draft), cellId, {
        sourceRect: nextRect,
        contentRect: nextRect,
        manualRect: true,
    });
}

export function splitCell(draft, cellId, direction) {
    const cell = draft.cells.find((item) => item.id === cellId);
    if (!cell) return draft;
    const rect = cell.contentRect || cell.sourceRect;
    const firstRect = direction === 'horizontal'
        ? { ...rect, height: Math.floor(rect.height / 2) }
        : { ...rect, width: Math.floor(rect.width / 2) };
    const secondRect = direction === 'horizontal'
        ? { ...rect, y: rect.y + firstRect.height, height: rect.height - firstRect.height }
        : { ...rect, x: rect.x + firstRect.width, width: rect.width - firstRect.width };
    const baseCell = {
        ...cell,
        manualRect: true,
        confidence: Math.min(cell.confidence ?? 1, 0.72),
        warnings: [...(cell.warnings || []), 'Celda dividida manualmente.'],
    };

    return {
        ...pushDraftHistory(draft),
        cells: draft.cells.flatMap((item) => item.id === cellId
            ? [
                { ...baseCell, id: `${cellId}a`, sourceRect: roundRect(firstRect), contentRect: roundRect(firstRect), name: `${cell.name}_a` },
                { ...baseCell, id: `${cellId}b`, sourceRect: roundRect(secondRect), contentRect: roundRect(secondRect), name: `${cell.name}_b` },
            ]
            : item),
        generatedCellKeys: {},
    };
}

export function mergeAdjacentCells(draft, cellId) {
    const cell = draft.cells.find((item) => item.id === cellId);
    if (!cell) return draft;
    const neighbor = draft.cells.find((item) => item.id !== cellId && areAdjacent(cell.sourceRect, item.sourceRect));
    if (!neighbor) return updateDraftCell(draft, cellId, {
        warnings: [...(cell.warnings || []), 'No hay celda adyacente para fusionar.'],
    });

    const mergedRect = unionRect(cell.sourceRect, neighbor.sourceRect);
    return {
        ...pushDraftHistory(draft),
        cells: draft.cells
            .filter((item) => item.id !== neighbor.id)
            .map((item) => item.id === cellId ? {
                ...item,
                sourceRect: mergedRect,
                contentRect: mergedRect,
                manualRect: true,
                name: `${cell.name}_${neighbor.name}`,
                warnings: [...(item.warnings || []), 'Celda fusionada manualmente.'],
            } : item),
        generatedCellKeys: {},
    };
}

export function reorderCells(draft, cellId, direction) {
    const index = draft.cells.findIndex((cell) => cell.id === cellId);
    if (index < 0) return draft;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= draft.cells.length) return draft;
    const cells = [...draft.cells];
    [cells[index], cells[target]] = [cells[target], cells[index]];
    return {
        ...pushDraftHistory(draft),
        cells,
    };
}

export function addFreeRegion(draft) {
    const index = draft.cells.length + 1;
    const side = Math.round(Math.min(draft.source.width, draft.source.height) * 0.2);
    const rect = {
        x: Math.round((draft.source.width - side) / 2),
        y: Math.round((draft.source.height - side) / 2),
        width: side,
        height: side,
    };

    return {
        ...pushDraftHistory(draft),
        segmentationMode: 'free',
        cells: [
            ...draft.cells,
            {
                id: `free_${index}`,
                row: draft.cells.length,
                column: 0,
                sourceRect: rect,
                contentRect: rect,
                enabled: true,
                empty: false,
                confidence: 0.65,
                classification: 'content',
                name: `region_${String(index).padStart(3, '0')}`,
                warnings: ['Region libre agregada manualmente.'],
                freeRegion: true,
            },
        ],
        generatedCellKeys: {},
    };
}

function createDraftSnapshot(draft) {
    return {
        settings: draft.settings,
        rows: draft.rows,
        columns: draft.columns,
        rowBands: draft.rowBands,
        columnBands: draft.columnBands,
        cells: draft.cells,
        generatedCellKeys: draft.generatedCellKeys,
        segmentationMode: draft.segmentationMode,
    };
}

function findLargestBandIndex(bands) {
    return bands.reduce((largestIndex, band, index) => {
        const largest = bands[largestIndex];
        return band.end - band.start > largest.end - largest.start ? index : largestIndex;
    }, 0);
}

function splitBand(bands, index) {
    return bands.flatMap((band, bandIndex) => {
        if (bandIndex !== index) return band;
        const mid = Math.round((band.start + band.end) / 2);
        return [
            { start: band.start, end: mid },
            { start: mid, end: band.end },
        ];
    });
}

function removeBand(bands, index) {
    return bands.filter((_, bandIndex) => bandIndex !== index);
}

function areAdjacent(a, b) {
    const sameVerticalSpan = overlaps(a.y, a.y + a.height, b.y, b.y + b.height);
    const sameHorizontalSpan = overlaps(a.x, a.x + a.width, b.x, b.x + b.width);
    const touchesHorizontally = Math.abs(a.x + a.width - b.x) <= 1 || Math.abs(b.x + b.width - a.x) <= 1;
    const touchesVertically = Math.abs(a.y + a.height - b.y) <= 1 || Math.abs(b.y + b.height - a.y) <= 1;
    return (sameVerticalSpan && touchesHorizontally) || (sameHorizontalSpan && touchesVertically);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
    return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function unionRect(a, b) {
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);
    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    };
}

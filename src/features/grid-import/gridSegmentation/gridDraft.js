import { DEFAULT_GRID_SETTINGS, createUniformGrid } from './createUniformGrid';

export function createGridDraft(asset, settings = {}) {
    const mergedSettings = {
        ...DEFAULT_GRID_SETTINGS,
        ...settings,
        margins: {
            ...DEFAULT_GRID_SETTINGS.margins,
            ...(settings.margins || {}),
        },
    };
    const grid = createUniformGrid({
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        settings: mergedSettings,
    });

    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        mode: 'manual',
        source: asset,
        settings: mergedSettings,
        rows: grid.rows,
        columns: grid.columns,
        rowBands: grid.rowBands,
        columnBands: grid.columnBands,
        cells: grid.cells,
        confidence: 1,
        warnings: ['Grid manual: verifica guias y celdas antes de generar recortes.'],
        generatedCount: 0,
        generatedCellKeys: {},
    };
}

export function rebuildDraftFromSettings(draft, settings) {
    const mergedSettings = {
        ...draft.settings,
        ...settings,
        margins: {
            ...draft.settings.margins,
            ...(settings.margins || {}),
        },
    };
    const grid = createUniformGrid({
        sourceWidth: draft.source.width,
        sourceHeight: draft.source.height,
        settings: mergedSettings,
        previousCells: draft.cells,
    });

    return {
        ...draft,
        settings: mergedSettings,
        rows: grid.rows,
        columns: grid.columns,
        rowBands: grid.rowBands,
        columnBands: grid.columnBands,
        cells: grid.cells,
        generatedCellKeys: {},
    };
}

export function rebuildDraftFromBands(draft, rowBands, columnBands) {
    const grid = createUniformGrid({
        sourceWidth: draft.source.width,
        sourceHeight: draft.source.height,
        settings: {
            ...draft.settings,
            rows: rowBands.length,
            columns: columnBands.length,
        },
        previousCells: draft.cells,
    });

    return {
        ...draft,
        rows: rowBands.length,
        columns: columnBands.length,
        rowBands,
        columnBands,
        generatedCellKeys: {},
        cells: grid.cells.map((cell) => {
            const rowBand = rowBands[cell.row];
            const columnBand = columnBands[cell.column];
            const sourceRect = {
                x: Math.round(columnBand.start),
                y: Math.round(rowBand.start),
                width: Math.round(columnBand.end - columnBand.start),
                height: Math.round(rowBand.end - rowBand.start),
            };
            return {
                ...cell,
                sourceRect,
                contentRect: {
                    x: sourceRect.x + draft.settings.inset,
                    y: sourceRect.y + draft.settings.inset,
                    width: Math.max(1, sourceRect.width - draft.settings.inset * 2),
                    height: Math.max(1, sourceRect.height - draft.settings.inset * 2),
                },
            };
        }),
    };
}

export function updateDraftCell(draft, cellId, updates) {
    return {
        ...draft,
        cells: draft.cells.map((cell) => (
            cell.id === cellId ? { ...cell, ...updates } : cell
        )),
    };
}

export function createGridDraftFromAnalysis(asset, analysis) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        mode: 'automatic',
        source: asset,
        settings: {
            rows: analysis.rows,
            columns: analysis.columns,
            margins: analysis.outerMargins,
            horizontalGap: analysis.horizontalGap,
            verticalGap: analysis.verticalGap,
            inset: 0,
        },
        rows: analysis.rows,
        columns: analysis.columns,
        rowBands: analysis.rowBands,
        columnBands: analysis.columnBands,
        cells: analysis.cells,
        confidence: analysis.confidence,
        warnings: analysis.warnings,
        generatedCount: 0,
        generatedCellKeys: {},
        analysis,
    };
}

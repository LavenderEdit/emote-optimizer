import { insetRect, roundRect } from '../../../shared/math/rect';

export const DEFAULT_GRID_SETTINGS = {
    rows: 5,
    columns: 5,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    horizontalGap: 0,
    verticalGap: 0,
    inset: 0,
};

export function createGridBands({ size, count, startMargin = 0, endMargin = 0, gap = 0 }) {
    const safeCount = Math.max(1, Math.floor(count));
    const safeStart = Math.max(0, startMargin);
    const safeEnd = Math.max(0, endMargin);
    const safeGap = Math.max(0, gap);
    const available = Math.max(1, size - safeStart - safeEnd - safeGap * (safeCount - 1));
    const cellSize = available / safeCount;

    return Array.from({ length: safeCount }, (_, index) => {
        const start = safeStart + index * (cellSize + safeGap);
        return {
            start,
            end: start + cellSize,
        };
    });
}

export function buildBandsFromSettings(settings, sourceWidth, sourceHeight) {
    return {
        columns: createGridBands({
            size: sourceWidth,
            count: settings.columns,
            startMargin: settings.margins.left,
            endMargin: settings.margins.right,
            gap: settings.horizontalGap,
        }),
        rows: createGridBands({
            size: sourceHeight,
            count: settings.rows,
            startMargin: settings.margins.top,
            endMargin: settings.margins.bottom,
            gap: settings.verticalGap,
        }),
    };
}

export function createCellsFromBands({ rowBands, columnBands, inset = 0, previousCells = [] }) {
    const previousById = new Map(previousCells.map((cell) => [cell.id, cell]));
    const cells = [];

    rowBands.forEach((rowBand, row) => {
        columnBands.forEach((columnBand, column) => {
            const id = `r${row + 1}c${column + 1}`;
            const previous = previousById.get(id);
            const sourceRect = roundRect({
                x: columnBand.start,
                y: rowBand.start,
                width: columnBand.end - columnBand.start,
                height: rowBand.end - rowBand.start,
            });
            const contentRect = roundRect(insetRect(sourceRect, inset));
            const index = row * columnBands.length + column + 1;

            cells.push({
                id,
                row,
                column,
                sourceRect,
                contentRect,
                enabled: previous?.enabled ?? true,
                empty: previous?.empty ?? false,
                confidence: previous?.confidence ?? 1,
                name: previous?.name ?? `emote_${String(index).padStart(3, '0')}`,
                warnings: previous?.warnings ?? [],
            });
        });
    });

    return cells;
}

export function createUniformGrid({ sourceWidth, sourceHeight, settings, previousCells = [] }) {
    const bands = buildBandsFromSettings(settings, sourceWidth, sourceHeight);
    const cells = createCellsFromBands({
        rowBands: bands.rows,
        columnBands: bands.columns,
        inset: settings.inset,
        previousCells,
    });

    return {
        rows: settings.rows,
        columns: settings.columns,
        rowBands: bands.rows,
        columnBands: bands.columns,
        cells,
    };
}

export function updateBandEdge(bands, index, edge, value, size, minCellSize = 8) {
    return bands.map((band, bandIndex) => {
        if (bandIndex !== index) return band;

        if (edge === 'start') {
            const previousEnd = bands[index - 1]?.end ?? 0;
            const maxStart = band.end - minCellSize;
            return {
                ...band,
                start: Math.max(previousEnd, Math.min(value, maxStart)),
            };
        }

        const nextStart = bands[index + 1]?.start ?? size;
        const minEnd = band.start + minCellSize;
        return {
            ...band,
            end: Math.min(nextStart, Math.max(value, minEnd)),
        };
    });
}

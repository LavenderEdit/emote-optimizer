import { createUniformGrid } from '../../features/grid-import/gridSegmentation/createUniformGrid';
import { referenceGrid5x5Fixture, realReferenceGrid994x1001Fixture } from './gridFixtures';

export function createSyntheticReferenceGridImageData() {
    return createGridFixtureImageData(referenceGrid5x5Fixture);
}

export function createRealReferenceGridImageData() {
    return createGridFixtureImageData(realReferenceGrid994x1001Fixture);
}

export function createGridFixtureImageData(fixture) {
    const data = new Uint8ClampedArray(fixture.width * fixture.height * 4);
    const backgroundColor = fixture.backgroundColor || [255, 255, 255, 255];
    const cardColor = fixture.cardColor || [239, 240, 242, 255];
    fillRect(data, fixture.width, { x: 0, y: 0, width: fixture.width, height: fixture.height }, backgroundColor);

    const grid = fixture.rowBands && fixture.columnBands
        ? createGridFromBands(fixture)
        : createUniformGrid({
            sourceWidth: fixture.width,
            sourceHeight: fixture.height,
            settings: {
                rows: fixture.rows,
                columns: fixture.columns,
                margins: fixture.margins,
                horizontalGap: fixture.horizontalGap,
                verticalGap: fixture.verticalGap,
                inset: 0,
            },
        });

    for (const cell of grid.cells) {
        if (fixture.shadow) {
            fillRect(data, fixture.width, {
                x: cell.sourceRect.x + 4,
                y: cell.sourceRect.y + 5,
                width: cell.sourceRect.width,
                height: cell.sourceRect.height,
            }, [210, 211, 214, 255]);
        }
        fillRect(data, fixture.width, cell.sourceRect, cardColor);
        if (cell.id !== fixture.emptyCellId) {
            drawContent(data, fixture.width, cell.sourceRect, cell.row + cell.column);
        }
    }

    return {
        data,
        width: fixture.width,
        height: fixture.height,
        fixture,
    };
}

function createGridFromBands(fixture) {
    const cells = [];
    fixture.rowBands.forEach((rowBand, row) => {
        fixture.columnBands.forEach((columnBand, column) => {
            const index = row * fixture.columnBands.length + column + 1;
            const sourceRect = {
                x: Math.round(columnBand.start),
                y: Math.round(rowBand.start),
                width: Math.round(columnBand.end - columnBand.start),
                height: Math.round(rowBand.end - rowBand.start),
            };
            cells.push({
                id: `r${row + 1}c${column + 1}`,
                row,
                column,
                sourceRect,
                contentRect: sourceRect,
                enabled: true,
                empty: false,
                confidence: 1,
                name: `emote_${String(index).padStart(3, '0')}`,
            });
        });
    });

    return {
        rows: fixture.rowBands.length,
        columns: fixture.columnBands.length,
        rowBands: fixture.rowBands,
        columnBands: fixture.columnBands,
        cells,
    };
}

function drawContent(data, width, rect, variant) {
    const paddingX = Math.round(rect.width * (0.20 + (variant % 3) * 0.02));
    const paddingY = Math.round(rect.height * (0.18 + (variant % 2) * 0.03));
    fillRect(data, width, {
        x: rect.x + paddingX,
        y: rect.y + paddingY,
        width: rect.width - paddingX * 2,
        height: rect.height - paddingY * 2,
    }, [39, 39, 42, 255]);
    fillRect(data, width, {
        x: rect.x + Math.round(rect.width * 0.35),
        y: rect.y + Math.round(rect.height * 0.38),
        width: Math.round(rect.width * 0.30),
        height: Math.round(rect.height * 0.16),
    }, [255, 255, 255, 255]);
}

function fillRect(data, width, rect, color) {
    const left = Math.max(0, Math.round(rect.x));
    const top = Math.max(0, Math.round(rect.y));
    const right = Math.min(width, Math.round(rect.x + rect.width));
    const bottom = Math.min(data.length / 4 / width, Math.round(rect.y + rect.height));

    for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
            const offset = (y * width + x) * 4;
            data[offset] = color[0];
            data[offset + 1] = color[1];
            data[offset + 2] = color[2];
            data[offset + 3] = color[3];
        }
    }
}

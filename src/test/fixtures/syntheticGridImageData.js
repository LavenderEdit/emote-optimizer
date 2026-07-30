import { createUniformGrid } from '../../features/grid-import/gridSegmentation/createUniformGrid';
import { referenceGrid5x5Fixture } from './gridFixtures';

export function createSyntheticReferenceGridImageData() {
    const fixture = referenceGrid5x5Fixture;
    const data = new Uint8ClampedArray(fixture.width * fixture.height * 4);
    fillRect(data, fixture.width, { x: 0, y: 0, width: fixture.width, height: fixture.height }, [255, 255, 255, 255]);

    const grid = createUniformGrid({
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
        fillRect(data, fixture.width, cell.sourceRect, [239, 240, 242, 255]);
        if (cell.id !== fixture.emptyCellId) {
            drawContent(data, fixture.width, cell.sourceRect);
        }
    }

    return {
        data,
        width: fixture.width,
        height: fixture.height,
    };
}

function drawContent(data, width, rect) {
    const paddingX = Math.round(rect.width * 0.22);
    const paddingY = Math.round(rect.height * 0.20);
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

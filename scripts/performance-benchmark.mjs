import { performance } from 'node:perf_hooks';
import { computeImageMetrics } from '../src/features/performance/imageMetrics.js';
import { createPreviewCache, createPreviewCacheKey } from '../src/features/performance/previewCache.js';

const SAMPLE_COUNT = 100;
const imageWidth = 994;
const imageHeight = 1001;
const data = new Uint8ClampedArray(imageWidth * imageHeight * 4);

for (let index = 0; index < imageWidth * imageHeight; index += 1) {
    const offset = index * 4;
    data[offset] = index % 255;
    data[offset + 1] = (index * 2) % 255;
    data[offset + 2] = (index * 3) % 255;
    data[offset + 3] = index % 11 === 0 ? 0 : 255;
}

const asset = {
    id: 'asset-bench',
    width: imageWidth,
    height: imageHeight,
    bytes: data.byteLength,
    fileName: 'reference-grid-994x1001.png',
};
const grid = createBenchmarkGrid({ width: imageWidth, height: imageHeight, rows: 10, columns: 10 });
const emotes = grid.cells.map((cell) => ({
    id: cell.id,
    sourceId: asset.id,
    cropRect: cell.contentRect,
    fitMode: 'contain',
    padding: 0.04,
    frame: { zoom: 1, offsetX: 0, offsetY: 0 },
    adjustments: { brightness: 0, contrast: 0, saturation: 15, sharpen: 25 },
}));

const metricsMs = measure('image metrics 994x1001', () => computeImageMetrics({ data, width: imageWidth, height: imageHeight }));
const keyMs = measure(`${SAMPLE_COUNT} preview cache keys`, () => {
    for (const emote of emotes) createPreviewCacheKey(emote, asset);
});
const cacheMs = measure(`${SAMPLE_COUNT} preview cache writes/reads`, () => {
    const cache = createPreviewCache({ maxEntries: SAMPLE_COUNT, revokeUrl: () => {} });
    for (const emote of emotes) {
        cache.set(createPreviewCacheKey(emote, asset), new Blob(['png']));
    }
    for (const emote of emotes) {
        cache.get(createPreviewCacheKey(emote, asset));
    }
});

console.log(JSON.stringify({
    sample: `${imageWidth}x${imageHeight}`,
    cells: emotes.length,
    timingsMs: {
        metrics: metricsMs,
        previewKeys: keyMs,
        previewCache: cacheMs,
    },
}, null, 2));

function measure(label, callback) {
    const start = performance.now();
    callback();
    const elapsed = performance.now() - start;
    console.error(`${label}: ${elapsed.toFixed(2)}ms`);
    return Number(elapsed.toFixed(2));
}

function createBenchmarkGrid({ width, height, rows, columns }) {
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const cells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            cells.push({
                id: `r${row + 1}c${column + 1}`,
                contentRect: {
                    x: Math.round(column * cellWidth),
                    y: Math.round(row * cellHeight),
                    width: Math.round(cellWidth),
                    height: Math.round(cellHeight),
                },
            });
        }
    }
    return { cells };
}

export function computeImageMetrics({ data, width, height }) {
    const histogram = createHistogram();
    const horizontalProjection = new Float32Array(height);
    const verticalProjection = new Float32Array(width);
    let visiblePixels = 0;
    let alphaPixels = 0;
    let lumaSum = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];
            const luma = Math.round(0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]);
            histogram.red[data[index]] += 1;
            histogram.green[data[index + 1]] += 1;
            histogram.blue[data[index + 2]] += 1;
            histogram.alpha[alpha] += 1;
            histogram.luma[luma] += 1;

            if (alpha > 0) alphaPixels += 1;
            if (alpha > 16) {
                visiblePixels += 1;
                lumaSum += luma;
                horizontalProjection[y] += 1;
                verticalProjection[x] += 1;
            }
        }
    }

    return {
        width,
        height,
        histogram: mapHistogramToArrays(histogram),
        horizontalProjection: Array.from(horizontalProjection, (value) => value / Math.max(1, width)),
        verticalProjection: Array.from(verticalProjection, (value) => value / Math.max(1, height)),
        visiblePixels,
        alphaPixels,
        visibleRatio: visiblePixels / Math.max(1, width * height),
        alphaRatio: alphaPixels / Math.max(1, width * height),
        meanLuma: visiblePixels === 0 ? 0 : lumaSum / visiblePixels,
    };
}

function createHistogram() {
    return {
        red: new Uint32Array(256),
        green: new Uint32Array(256),
        blue: new Uint32Array(256),
        alpha: new Uint32Array(256),
        luma: new Uint32Array(256),
    };
}

function mapHistogramToArrays(histogram) {
    return Object.fromEntries(Object.entries(histogram).map(([key, values]) => [key, Array.from(values)]));
}

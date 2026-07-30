export function colorDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], (a[3] ?? 255) - (b[3] ?? 255));
}

export function medianColor(samples) {
    if (samples.length === 0) return [255, 255, 255, 255];
    const channels = [0, 1, 2, 3].map((channel) => (
        samples
            .map((sample) => sample[channel] ?? 255)
            .sort((a, b) => a - b)[Math.floor(samples.length / 2)]
    ));
    return channels;
}

export function estimateRectEdgeColor(data, width, height, rect, inset = 3) {
    const samples = [];
    const left = Math.max(0, Math.floor(rect.x));
    const top = Math.max(0, Math.floor(rect.y));
    const right = Math.min(width, Math.ceil(rect.x + rect.width));
    const bottom = Math.min(height, Math.ceil(rect.y + rect.height));
    const band = Math.max(1, Math.min(inset, Math.floor(Math.min(rect.width, rect.height) / 5)));

    for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
            const isEdge = x < left + band || x >= right - band || y < top + band || y >= bottom - band;
            if (!isEdge) continue;
            const offset = (y * width + x) * 4;
            samples.push([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        }
    }

    return medianColor(samples);
}

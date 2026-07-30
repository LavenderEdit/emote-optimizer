import { medianColor } from './color';

export function estimateBackground(data, width, height) {
    const samples = [];
    const band = Math.max(1, Math.round(Math.min(width, height) * 0.02));
    const step = Math.max(1, Math.floor(Math.min(width, height) / 200));

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const isBorder = x < band || x >= width - band || y < band || y >= height - band;
            if (!isBorder) continue;
            const offset = (y * width + x) * 4;
            samples.push([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        }
    }

    const color = medianColor(samples);
    const variance = samples.reduce((sum, sample) => (
        sum + Math.hypot(sample[0] - color[0], sample[1] - color[1], sample[2] - color[2])
    ), 0) / Math.max(1, samples.length);

    return {
        color,
        variance,
        confidence: Math.max(0, Math.min(1, 1 - variance / 80)),
        isTransparent: color[3] < 24,
    };
}

export function scoreEmptyCell(imageData, width, height, rect, background = [255, 255, 255, 255]) {
    const left = Math.max(0, Math.floor(rect.x));
    const top = Math.max(0, Math.floor(rect.y));
    const right = Math.min(width, Math.ceil(rect.x + rect.width));
    const bottom = Math.min(height, Math.ceil(rect.y + rect.height));
    const total = Math.max(1, (right - left) * (bottom - top));

    let foreground = 0;
    let alphaPixels = 0;
    let luminanceSum = 0;
    let luminanceSquaredSum = 0;
    let edgeHits = 0;

    for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
            const offset = (y * width + x) * 4;
            const r = imageData[offset];
            const g = imageData[offset + 1];
            const b = imageData[offset + 2];
            const a = imageData[offset + 3];
            const distance = Math.hypot(r - background[0], g - background[1], b - background[2], a - background[3]);
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            if (distance > 24 || a < 240) foreground += 1;
            if (a > 16) alphaPixels += 1;
            luminanceSum += luminance;
            luminanceSquaredSum += luminance * luminance;

            if (x > left && y > top) {
                const previousOffset = (y * width + x - 1) * 4;
                const previousTopOffset = ((y - 1) * width + x) * 4;
                const horizontalDelta = Math.abs(r - imageData[previousOffset]) + Math.abs(g - imageData[previousOffset + 1]) + Math.abs(b - imageData[previousOffset + 2]);
                const verticalDelta = Math.abs(r - imageData[previousTopOffset]) + Math.abs(g - imageData[previousTopOffset + 1]) + Math.abs(b - imageData[previousTopOffset + 2]);
                if (horizontalDelta + verticalDelta > 72) edgeHits += 1;
            }
        }
    }

    const foregroundRatio = foreground / total;
    const alphaDensity = alphaPixels / total;
    const mean = luminanceSum / total;
    const variance = Math.max(0, luminanceSquaredSum / total - mean * mean);
    const normalizedVariance = Math.min(1, variance / 2000);
    const edgeDensity = edgeHits / total;
    const emptyScore = Math.max(0, Math.min(1, 1 - foregroundRatio * 1.8 - normalizedVariance * 0.55 - edgeDensity * 1.2));
    const classification = emptyScore > 0.82 ? 'empty' : emptyScore > 0.58 ? 'uncertain' : 'content';

    return {
        emptyScore,
        classification,
        foregroundRatio,
        alphaDensity,
        luminanceVariance: variance,
        edgeDensity,
    };
}

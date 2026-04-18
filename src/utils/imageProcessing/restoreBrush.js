export function applyRestoreBrush(refinedMask, w, h, restorePoints, brushRadius = 10) {
    for (const pt of restorePoints) {
        const { x, y } = pt;
        for (let by = -brushRadius; by <= brushRadius; by++) {
            for (let bx = -brushRadius; bx <= brushRadius; bx++) {
                if (bx * bx + by * by <= brushRadius * brushRadius) {
                    const nx = x + bx;
                    const ny = y + by;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        refinedMask[ny * w + nx] = 255;
                    }
                }
            }
        }
    }
}
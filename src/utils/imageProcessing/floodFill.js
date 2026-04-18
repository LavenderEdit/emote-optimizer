export function applyFloodFillErasure(data, w, h, erasurePoints, tolerance) {
    const mask = new Uint8Array(w * h);
    mask.fill(255);
    let minX = w, maxX = 0, minY = h, maxY = 0;

    for (const point of erasurePoints) {
        const { r: targetR, g: targetG, b: targetB, x: startX, y: startY } = point;
        const visited = new Uint8Array(w * h);
        const stack = [startY * w + startX];

        while (stack.length > 0) {
            const pos = stack.pop();
            if (visited[pos]) continue;
            visited[pos] = 1;

            const i = pos * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const distance = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));

            if (distance <= tolerance) {
                mask[pos] = 0;
                const cy = Math.floor(pos / w), cx = pos % w;
                if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

                if (cx > 0 && mask[pos - 1] !== 0) stack.push(pos - 1);
                if (cx < w - 1 && mask[pos + 1] !== 0) stack.push(pos + 1);
                if (cy > 0 && mask[pos - w] !== 0) stack.push(pos - w);
                if (cy < h - 1 && mask[pos + w] !== 0) stack.push(pos + w);
            }
        }
    }

    minX = Math.max(0, minX - 2); maxX = Math.min(w - 1, maxX + 2);
    minY = Math.max(0, minY - 2); maxY = Math.min(h - 1, maxY + 2);

    const refinedMask = new Uint8Array(mask);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const pos = y * w + x;
            if (mask[pos] === 255) {
                const isEdge = (x > 0 && mask[pos - 1] === 0) ||
                    (x < w - 1 && mask[pos + 1] === 0) ||
                    (y > 0 && mask[pos - w] === 0) ||
                    (y < h - 1 && mask[pos + w] === 0);

                if (isEdge) {
                    const i = pos * 4;
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    let minDist = 9999;
                    for (const pt of erasurePoints) {
                        const dist = Math.sqrt(Math.pow(r - pt.r, 2) + Math.pow(g - pt.g, 2) + Math.pow(b - pt.b, 2));
                        if (dist < minDist) minDist = dist;
                    }

                    const haloThreshold = tolerance + 80;
                    if (minDist < haloThreshold) {
                        const alpha = ((minDist - tolerance) / 80) * 255;
                        refinedMask[pos] = Math.max(0, Math.min(255, alpha));
                    }
                }
            }
        }
    }
    return refinedMask;
}
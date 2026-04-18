export function applyProAdjustments(data, w, h, adjustments) {
    if (!adjustments) return;

    const { brightness = 0, contrast = 0, saturation = 0, sharpen = 0 } = adjustments;
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;

        for (let j = 0; j < 3; j++) {
            let val = data[i + j];
            val = val + brightness;
            val = contrastFactor * (val - 128) + 128;
            data[i + j] = Math.max(0, Math.min(255, val));
        }

        if (saturation !== 0) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            data[i] = Math.max(0, Math.min(255, gray + (r - gray) * (1 + saturation / 100)));
            data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * (1 + saturation / 100)));
            data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * (1 + saturation / 100)));
        }
    }

    if (sharpen > 0) {
        const amount = sharpen / 100;
        const weights = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];
        const src = new Uint8ClampedArray(data);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstOff = (y * w + x) * 4;
                if (data[dstOff + 3] === 0) continue;

                let r = 0, g = 0, b = 0;
                for (let cy = 0; cy < 3; cy++) {
                    for (let cx = 0; cx < 3; cx++) {
                        const scy = y + cy - 1;
                        const scx = x + cx - 1;
                        if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                            const srcOff = (scy * w + scx) * 4;
                            const wt = weights[cy * 3 + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                        }
                    }
                }
                data[dstOff] = Math.max(0, Math.min(255, r));
                data[dstOff + 1] = Math.max(0, Math.min(255, g));
                data[dstOff + 2] = Math.max(0, Math.min(255, b));
            }
        }
    }
}
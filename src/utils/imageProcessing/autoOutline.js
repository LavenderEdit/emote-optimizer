export function applyAutoOutline(data, w, h, strokeSize = 3, outlineColor = [255, 255, 255]) {
    const edgeData = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i + 3] < 128) {
                let isEdge = false;
                for (let sy = -strokeSize; sy <= strokeSize; sy++) {
                    for (let sx = -strokeSize; sx <= strokeSize; sx++) {
                        if (sy * sy + sx * sx <= strokeSize * strokeSize) {
                            const ny = y + sy;
                            const nx = x + sx;
                            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                                const ni = (ny * w + nx) * 4;
                                if (data[ni + 3] >= 128) {
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (isEdge) break;
                }

                if (isEdge) {
                    edgeData[i] = outlineColor[0];
                    edgeData[i + 1] = outlineColor[1];
                    edgeData[i + 2] = outlineColor[2];
                    edgeData[i + 3] = 255;
                }
            }
        }
    }

    for (let i = 0; i < data.length; i++) {
        data[i] = edgeData[i];
    }
}
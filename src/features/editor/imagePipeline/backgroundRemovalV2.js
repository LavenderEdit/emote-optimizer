export const DEFAULT_BACKGROUND_REMOVAL_V2 = {
    version: 2,
    mode: 'connected',
    tolerance: 34,
    feather: 1,
    despill: 0.75,
    excessiveRemovalThreshold: 0.72,
    brushRadius: 10,
};

export function sampleBackgroundColorsFromEdges(data, width, height, options = {}) {
    const sampleSize = options.sampleSize ?? Math.max(2, Math.round(Math.min(width, height) * 0.035));
    const sampleRects = [
        { x: 0, y: 0, width: sampleSize, height: sampleSize },
        { x: width - sampleSize, y: 0, width: sampleSize, height: sampleSize },
        { x: 0, y: height - sampleSize, width: sampleSize, height: sampleSize },
        { x: width - sampleSize, y: height - sampleSize, width: sampleSize, height: sampleSize },
        { x: Math.round((width - sampleSize) / 2), y: 0, width: sampleSize, height: sampleSize },
        { x: Math.round((width - sampleSize) / 2), y: height - sampleSize, width: sampleSize, height: sampleSize },
        { x: 0, y: Math.round((height - sampleSize) / 2), width: sampleSize, height: sampleSize },
        { x: width - sampleSize, y: Math.round((height - sampleSize) / 2), width: sampleSize, height: sampleSize },
    ];

    return dedupeSamples(sampleRects.map((rect) => averageRectColor(data, width, height, rect)));
}

export function createBackgroundRemovalMask(data, width, height, options = {}) {
    const settings = { ...DEFAULT_BACKGROUND_REMOVAL_V2, ...options };
    const samples = settings.samples?.length ? settings.samples : sampleBackgroundColorsFromEdges(data, width, height, settings);
    const mask = settings.mode === 'global'
        ? createGlobalMask(data, width, height, samples, settings)
        : createConnectedMask(data, width, height, samples, settings);

    applyBrushes(mask, width, height, settings.erasurePoints || [], 0, settings.brushRadius);
    applyBrushes(mask, width, height, settings.restorePoints || [], 255, settings.brushRadius);

    const featheredMask = settings.feather > 0 ? featherMask(mask, width, height, settings.feather) : mask;
    const removedPixels = countRemoved(featheredMask);
    const removedRatio = removedPixels / Math.max(1, width * height);
    const warnings = [];
    if (removedRatio > settings.excessiveRemovalThreshold) {
        warnings.push(`Borrado excesivo: ${Math.round(removedRatio * 100)}% de pixeles quedarian transparentes.`);
    }

    return {
        mask: featheredMask,
        samples,
        removedPixels,
        removedRatio,
        warnings,
    };
}

export function applyBackgroundRemovalMask(data, width, height, result, options = {}) {
    const settings = { ...DEFAULT_BACKGROUND_REMOVAL_V2, ...options };
    const samples = result.samples || settings.samples || [];
    const edgeMap = createEdgeMap(result.mask, width, height);

    for (let pixel = 0; pixel < width * height; pixel += 1) {
        const offset = pixel * 4;
        const maskAlpha = result.mask[pixel];
        data[offset + 3] = Math.min(data[offset + 3], maskAlpha);

        if (settings.despill > 0 && maskAlpha > 0 && edgeMap[pixel]) {
            despillPixel(data, offset, samples, settings);
        }
    }
}

export function renderMaskToImageData(data, width, height, result) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
        const offset = pixel * 4;
        const value = result.mask[pixel];
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
    }
}

export async function analyzeEmoteBackgroundRemovalV2(emote, asset, options = {}) {
    const image = await loadImageElement(asset.objectUrl);
    const rect = emote.cropRect || { x: 0, y: 0, width: asset.width, height: asset.height };
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const settings = {
        ...DEFAULT_BACKGROUND_REMOVAL_V2,
        ...(emote.backgroundRemoval || {}),
        ...options,
        erasurePoints: [],
        restorePoints: [],
    };
    const result = createBackgroundRemovalMask(imageData.data, canvas.width, canvas.height, settings);

    return {
        backgroundRemoval: {
            ...settings,
            samples: result.samples,
            removedRatio: result.removedRatio,
            removedPixels: result.removedPixels,
            warnings: result.warnings,
        },
        warnings: result.warnings,
    };
}

function createConnectedMask(data, width, height, samples, settings) {
    const mask = new Uint8Array(width * height);
    mask.fill(255);
    const visited = new Uint8Array(width * height);
    const queue = [];
    const enqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const pos = y * width + x;
        if (visited[pos]) return;
        visited[pos] = 1;
        if (!isBackgroundLike(data, pos * 4, samples, settings)) return;
        mask[pos] = 0;
        queue.push(pos);
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x, 0);
        enqueue(x, height - 1);
    }
    for (let y = 1; y < height - 1; y += 1) {
        enqueue(0, y);
        enqueue(width - 1, y);
    }

    for (let index = 0; index < queue.length; index += 1) {
        const pos = queue[index];
        const x = pos % width;
        const y = Math.floor(pos / width);
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
    }

    return mask;
}

function createGlobalMask(data, width, height, samples, settings) {
    const mask = new Uint8Array(width * height);
    mask.fill(255);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
        if (isBackgroundLike(data, pixel * 4, samples, settings)) mask[pixel] = 0;
    }
    return mask;
}

function isBackgroundLike(data, offset, samples, settings) {
    if (data[offset + 3] <= 16) return true;
    return minDistanceToSamples(data, offset, samples) <= settings.tolerance;
}

function minDistanceToSamples(data, offset, samples) {
    let minDistance = Infinity;
    for (const sample of samples) {
        const distance = Math.hypot(
            data[offset] - sample[0],
            data[offset + 1] - sample[1],
            data[offset + 2] - sample[2],
        );
        minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
}

function featherMask(mask, width, height, radius) {
    const next = new Uint8Array(mask);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pos = y * width + x;
            if (mask[pos] === 0) continue;
            const distance = nearestRemovedDistance(mask, width, height, x, y, radius);
            if (distance !== null) {
                next[pos] = Math.min(next[pos], Math.round(255 * distance / (radius + 1)));
            }
        }
    }
    return next;
}

function nearestRemovedDistance(mask, width, height, x, y, radius) {
    let nearest = null;
    for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (mask[ny * width + nx] !== 0) continue;
            const distance = Math.hypot(dx, dy);
            if (distance <= radius && (nearest === null || distance < nearest)) nearest = distance;
        }
    }
    return nearest;
}

function applyBrushes(mask, width, height, points, value, radius) {
    for (const point of points) {
        for (let by = -radius; by <= radius; by += 1) {
            for (let bx = -radius; bx <= radius; bx += 1) {
                if (bx * bx + by * by > radius * radius) continue;
                const x = Math.round(point.x + bx);
                const y = Math.round(point.y + by);
                if (x >= 0 && y >= 0 && x < width && y < height) mask[y * width + x] = value;
            }
        }
    }
}

function createEdgeMap(mask, width, height) {
    const edgeMap = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const pos = y * width + x;
            if (mask[pos] === 0) continue;
            if (mask[pos - 1] === 0 || mask[pos + 1] === 0 || mask[pos - width] === 0 || mask[pos + width] === 0) {
                edgeMap[pos] = 1;
            }
        }
    }
    return edgeMap;
}

function despillPixel(data, offset, samples, settings) {
    if (samples.length === 0) return;
    const distance = minDistanceToSamples(data, offset, samples);
    const influence = Math.max(0, 1 - distance / (settings.tolerance + 96)) * settings.despill;
    if (influence <= 0) return;
    const background = nearestSample(data, offset, samples);
    for (let channel = 0; channel < 3; channel += 1) {
        const neutral = data[offset + channel] - (background[channel] - data[offset + channel]) * influence * 0.35;
        data[offset + channel] = Math.max(0, Math.min(255, neutral));
    }
}

function nearestSample(data, offset, samples) {
    let nearest = samples[0];
    let nearestDistance = Infinity;
    for (const sample of samples) {
        const distance = Math.hypot(data[offset] - sample[0], data[offset + 1] - sample[1], data[offset + 2] - sample[2]);
        if (distance < nearestDistance) {
            nearest = sample;
            nearestDistance = distance;
        }
    }
    return nearest;
}

function countRemoved(mask) {
    let removed = 0;
    for (const alpha of mask) {
        if (alpha < 128) removed += 1;
    }
    return removed;
}

function averageRectColor(data, width, height, rect) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    const left = Math.max(0, Math.round(rect.x));
    const top = Math.max(0, Math.round(rect.y));
    const right = Math.min(width, Math.round(rect.x + rect.width));
    const bottom = Math.min(height, Math.round(rect.y + rect.height));

    for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
            const offset = (y * width + x) * 4;
            if (data[offset + 3] <= 16) continue;
            r += data[offset];
            g += data[offset + 1];
            b += data[offset + 2];
            count += 1;
        }
    }

    if (count === 0) return [255, 255, 255];
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function dedupeSamples(samples) {
    const unique = [];
    samples.forEach((sample) => {
        if (!unique.some((existing) => Math.hypot(existing[0] - sample[0], existing[1] - sample[1], existing[2] - sample[2]) < 8)) {
            unique.push(sample);
        }
    });
    return unique;
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen para background removal v2.'));
        image.src = src;
    });
}

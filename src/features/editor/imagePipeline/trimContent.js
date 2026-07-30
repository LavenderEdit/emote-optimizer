import { clamp, roundRect } from '../../../shared/math/rect';

const DEFAULT_TRIM_OPTIONS = {
    tolerance: 30,
    alphaThreshold: 16,
    touchThreshold: 2,
};

export function findEdgeConnectedContentBounds(data, width, height, rect, options = {}) {
    const settings = { ...DEFAULT_TRIM_OPTIONS, ...options };
    const crop = normalizeCrop(rect, width, height);
    const background = options.backgroundColor || estimateRectEdgeColor(data, width, height, crop);
    const localWidth = crop.width;
    const localHeight = crop.height;
    const visited = new Uint8Array(localWidth * localHeight);
    const queue = [];

    const enqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= localWidth || y >= localHeight) return;
        const localIndex = y * localWidth + x;
        if (visited[localIndex]) return;
        const sourceOffset = ((crop.y + y) * width + crop.x + x) * 4;
        if (!isConnectedBackground(data, sourceOffset, background, settings)) return;
        visited[localIndex] = 1;
        queue.push({ x, y });
    };

    for (let x = 0; x < localWidth; x += 1) {
        enqueue(x, 0);
        enqueue(x, localHeight - 1);
    }
    for (let y = 1; y < localHeight - 1; y += 1) {
        enqueue(0, y);
        enqueue(localWidth - 1, y);
    }

    for (let index = 0; index < queue.length; index += 1) {
        const pixel = queue[index];
        enqueue(pixel.x + 1, pixel.y);
        enqueue(pixel.x - 1, pixel.y);
        enqueue(pixel.x, pixel.y + 1);
        enqueue(pixel.x, pixel.y - 1);
    }

    let left = localWidth;
    let top = localHeight;
    let right = -1;
    let bottom = -1;
    let visiblePixels = 0;

    for (let y = 0; y < localHeight; y += 1) {
        for (let x = 0; x < localWidth; x += 1) {
            const localIndex = y * localWidth + x;
            const sourceOffset = ((crop.y + y) * width + crop.x + x) * 4;
            const alpha = data[sourceOffset + 3];
            if (visited[localIndex] || alpha <= settings.alphaThreshold) continue;
            visiblePixels += 1;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        }
    }

    if (visiblePixels === 0) {
        return {
            contentRect: crop,
            relativeContentRect: { x: 0, y: 0, width: crop.width, height: crop.height },
            backgroundColor: background,
            visiblePixels: 0,
            warnings: ['No se encontro contenido visible para trim automatico.'],
        };
    }

    const relativeContentRect = {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
    };
    const contentRect = roundRect({
        x: crop.x + relativeContentRect.x,
        y: crop.y + relativeContentRect.y,
        width: relativeContentRect.width,
        height: relativeContentRect.height,
    });

    return {
        contentRect,
        relativeContentRect,
        backgroundColor: background,
        visiblePixels,
        warnings: getContentTouchWarnings(relativeContentRect, { x: 0, y: 0, width: crop.width, height: crop.height }, settings.touchThreshold),
    };
}

export function getContentTouchWarnings(contentRect, cropRect, threshold = 2) {
    const warnings = [];
    const leftGap = contentRect.x - cropRect.x;
    const topGap = contentRect.y - cropRect.y;
    const rightGap = cropRect.x + cropRect.width - (contentRect.x + contentRect.width);
    const bottomGap = cropRect.y + cropRect.height - (contentRect.y + contentRect.height);

    if (leftGap <= threshold) warnings.push('Contenido tocando el borde izquierdo del crop.');
    if (topGap <= threshold) warnings.push('Contenido tocando el borde superior del crop.');
    if (rightGap <= threshold) warnings.push('Contenido tocando el borde derecho del crop.');
    if (bottomGap <= threshold) warnings.push('Contenido tocando el borde inferior del crop.');
    return warnings;
}

export async function trimEmoteToContent(emote, asset, options = {}) {
    if (!emote || !asset) throw new Error('No hay emote o asset fuente para trim.');
    const image = await loadImageElement(asset.objectUrl);
    const cropRect = normalizeCrop(
        emote.cropRect || { x: 0, y: 0, width: asset.width, height: asset.height },
        asset.width,
        asset.height,
    );
    const canvas = document.createElement('canvas');
    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const trim = findEdgeConnectedContentBounds(
        imageData.data,
        canvas.width,
        canvas.height,
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        options,
    );

    return {
        cropRect: roundRect({
            x: cropRect.x + trim.relativeContentRect.x,
            y: cropRect.y + trim.relativeContentRect.y,
            width: trim.relativeContentRect.width,
            height: trim.relativeContentRect.height,
        }),
        warnings: trim.warnings,
        diagnostics: {
            visiblePixels: trim.visiblePixels,
            backgroundColor: trim.backgroundColor,
        },
    };
}

function normalizeCrop(rect, width, height) {
    const x = clamp(Math.round(rect.x), 0, Math.max(0, width - 1));
    const y = clamp(Math.round(rect.y), 0, Math.max(0, height - 1));
    const right = clamp(Math.round(rect.x + rect.width), x + 1, width);
    const bottom = clamp(Math.round(rect.y + rect.height), y + 1, height);
    return {
        x,
        y,
        width: right - x,
        height: bottom - y,
    };
}

function estimateRectEdgeColor(data, width, height, rect) {
    const samples = [];
    const push = (x, y) => {
        const offset = (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
        samples.push([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
    };

    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
        push(x, rect.y);
        push(x, rect.y + rect.height - 1);
    }
    for (let y = rect.y + 1; y < rect.y + rect.height - 1; y += 1) {
        push(rect.x, y);
        push(rect.x + rect.width - 1, y);
    }

    return [0, 1, 2, 3].map((channel) => {
        const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
        return values[Math.floor(values.length / 2)] ?? 255;
    });
}

function isConnectedBackground(data, offset, background, settings) {
    const alpha = data[offset + 3];
    if (alpha <= settings.alphaThreshold) return true;
    const distance = Math.hypot(
        data[offset] - background[0],
        data[offset + 1] - background[1],
        data[offset + 2] - background[2],
        alpha - background[3],
    );
    return distance <= settings.tolerance;
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen fuente para trim.'));
        image.src = src;
    });
}

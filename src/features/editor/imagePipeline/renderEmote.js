import { applyAutoOutline } from '../../../utils/imageProcessing/autoOutline';
import { applyProAdjustments } from '../../../utils/imageProcessing/adjustments';
import { applyFloodFillErasure } from '../../../utils/imageProcessing/floodFill';
import { applyRestoreBrush } from '../../../utils/imageProcessing/restoreBrush';
import { clamp } from '../../../shared/math/rect';

export function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen fuente.'));
        image.src = src;
    });
}

export async function renderEmoteMasterCanvas(emote, asset, options = {}) {
    if (!emote || !asset) return null;

    const image = await loadImageElement(asset.objectUrl);
    const rect = emote.cropRect || { x: 0, y: 0, width: asset.width, height: asset.height };
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    if (options.applyOperations !== false) {
        applyDocumentOperations(canvas, emote);
    }
    return canvas;
}

export async function renderEmoteOutputCanvas(emote, asset, targetSize) {
    const masterCanvas = await renderEmoteMasterCanvas(emote, asset);
    if (!masterCanvas) return null;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetSize;
    finalCanvas.height = targetSize;
    const context = finalCanvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, targetSize, targetSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const placement = createOutputPlacement(
        masterCanvas.width,
        masterCanvas.height,
        targetSize,
        emote,
    );

    context.drawImage(
        masterCanvas,
        0,
        0,
        masterCanvas.width,
        masterCanvas.height,
        placement.x,
        placement.y,
        placement.width,
        placement.height,
    );

    return finalCanvas;
}

export function createOutputPlacement(sourceWidth, sourceHeight, targetSize, emote = {}) {
    const safePadding = clamp(resolveOutputRelativeValue(emote.padding || 0, targetSize), 0, Math.floor(targetSize / 2) - 1);
    const drawableSize = targetSize - safePadding * 2;
    const fitMode = emote.fitMode || 'contain';
    const baseScale = fitMode === 'cover'
        ? Math.max(drawableSize / sourceWidth, drawableSize / sourceHeight)
        : Math.min(drawableSize / sourceWidth, drawableSize / sourceHeight);
    const frame = emote.frame || {};
    const manualZoom = fitMode === 'manual' ? clamp(frame.zoom ?? emote.zoom ?? 1, 0.1, 8) : 1;
    const scale = baseScale * manualZoom;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const offsetX = fitMode === 'manual' ? resolveOutputRelativeValue(frame.offsetX ?? emote.offsetX ?? 0, targetSize) : 0;
    const offsetY = fitMode === 'manual' ? resolveOutputRelativeValue(frame.offsetY ?? emote.offsetY ?? 0, targetSize) : 0;

    return {
        x: Math.round((targetSize - width) / 2 + offsetX),
        y: Math.round((targetSize - height) / 2 + offsetY),
        width,
        height,
        scale,
    };
}

function resolveOutputRelativeValue(value, targetSize) {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (Math.abs(safeValue) <= 1) {
        return Math.round(safeValue * targetSize);
    }
    return Math.round(safeValue);
}

export function applyDocumentOperations(canvas, emote) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const backgroundRemoval = getBackgroundRemoval(emote);

    if (backgroundRemoval.erasurePoints.length > 0) {
        const refinedMask = applyFloodFillErasure(
            data,
            canvas.width,
            canvas.height,
            backgroundRemoval.erasurePoints,
            backgroundRemoval.tolerance,
        );

        if (backgroundRemoval.restorePoints.length > 0) {
            applyRestoreBrush(refinedMask, canvas.width, canvas.height, backgroundRemoval.restorePoints, 10);
        }

        for (let i = 0; i < canvas.width * canvas.height; i += 1) {
            data[i * 4 + 3] = Math.min(data[i * 4 + 3], refinedMask[i]);
        }
    }

    if (emote.adjustments) {
        applyProAdjustments(data, canvas.width, canvas.height, emote.adjustments);
    }

    if (emote.outline?.enabled || emote.isAutoOutlineActive) {
        applyAutoOutline(data, canvas.width, canvas.height, emote.outline?.size || 3, emote.outline?.color || [255, 255, 255]);
    }

    context.putImageData(imageData, 0, 0);
}

export function getBackgroundRemoval(emote) {
    return {
        tolerance: emote.backgroundRemoval?.tolerance ?? emote.tolerance ?? 30,
        erasurePoints: emote.backgroundRemoval?.erasurePoints ?? emote.erasurePoints ?? [],
        restorePoints: emote.backgroundRemoval?.restorePoints ?? emote.restorePoints ?? [],
    };
}

export function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('No se pudo codificar PNG.'));
                return;
            }
            resolve(blob);
        }, 'image/png');
    });
}

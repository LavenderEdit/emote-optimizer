import { applyAutoOutline } from '../../../utils/imageProcessing/autoOutline';
import { applyProAdjustments } from '../../../utils/imageProcessing/adjustments';
import { applyFloodFillErasure } from '../../../utils/imageProcessing/floodFill';
import { applyRestoreBrush } from '../../../utils/imageProcessing/restoreBrush';
import { createContainSquarePlacement } from '../../../shared/math/rect';

export function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen fuente.'));
        image.src = src;
    });
}

export async function renderEmoteMasterCanvas(emote, asset) {
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

    applyDocumentOperations(canvas, emote);
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

    const placement = createContainSquarePlacement(
        masterCanvas.width,
        masterCanvas.height,
        targetSize,
        emote.padding || 0,
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

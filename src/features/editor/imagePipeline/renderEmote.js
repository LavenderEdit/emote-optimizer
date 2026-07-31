import { applyAutoOutline } from '../../../utils/imageProcessing/autoOutline';
import { applyProAdjustments } from '../../../utils/imageProcessing/adjustments';
import { applyFloodFillErasure } from '../../../utils/imageProcessing/floodFill';
import { applyRestoreBrush } from '../../../utils/imageProcessing/restoreBrush';
import { clamp } from '../../../shared/math/rect';
import { applyBackgroundRemovalMask, createBackgroundRemovalMask, renderMaskToImageData } from './backgroundRemovalV2';

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
        applyDocumentOperations(canvas, emote, options);
    }
    return canvas;
}

export async function renderEmoteOutputCanvas(emote, asset, targetSize, options = {}) {
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

    const resizedCanvas = createResizedOutputCanvas(masterCanvas, placement.width, placement.height);
    context.drawImage(resizedCanvas, placement.x, placement.y);

    if (options.outputSharpen !== false) {
        applyOutputSharpen(finalCanvas, resolveOutputSharpenAmount(targetSize, emote));
    }

    return finalCanvas;
}

export function createResizedOutputCanvas(sourceCanvas, width, height) {
    const targetWidth = Math.max(1, Math.round(width));
    const targetHeight = Math.max(1, Math.round(height));
    const targetPixels = targetWidth * targetHeight;

    if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
        return sourceCanvas;
    }

    if (targetPixels > 16_000_000) {
        return drawScaledCanvas(sourceCanvas, targetWidth, targetHeight);
    }

    let currentCanvas = sourceCanvas;
    let currentWidth = sourceCanvas.width;
    let currentHeight = sourceCanvas.height;

    while (currentWidth / targetWidth > 2.1 && currentHeight / targetHeight > 2.1) {
        const nextWidth = Math.max(targetWidth, Math.round(currentWidth / 2));
        const nextHeight = Math.max(targetHeight, Math.round(currentHeight / 2));
        currentCanvas = drawScaledCanvas(currentCanvas, nextWidth, nextHeight);
        currentWidth = nextWidth;
        currentHeight = nextHeight;
    }

    return currentWidth === targetWidth && currentHeight === targetHeight
        ? currentCanvas
        : drawScaledCanvas(currentCanvas, targetWidth, targetHeight);
}

export function resolveOutputSharpenAmount(targetSize, emote = {}) {
    const configured = emote.exportQuality?.outputSharpen;
    if (Number.isFinite(configured)) return clamp(configured, 0, 1);
    if (targetSize <= 28) return 0.32;
    if (targetSize <= 56) return 0.26;
    if (targetSize <= 112) return 0.18;
    return 0.08;
}

export function applyOutputSharpen(canvas, amount) {
    const safeAmount = clamp(Number(amount) || 0, 0, 1);
    if (safeAmount <= 0) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const source = new Uint8ClampedArray(data);
    const weights = [
        0, -safeAmount, 0,
        -safeAmount, 1 + 4 * safeAmount, -safeAmount,
        0, -safeAmount, 0,
    ];

    for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
            const centerOffset = (y * canvas.width + x) * 4;
            if (source[centerOffset + 3] <= 16) continue;

            let r = 0;
            let g = 0;
            let b = 0;

            for (let cy = 0; cy < 3; cy += 1) {
                for (let cx = 0; cx < 3; cx += 1) {
                    const sampleX = x + cx - 1;
                    const sampleY = y + cy - 1;
                    const weight = weights[cy * 3 + cx];
                    let sampleOffset = centerOffset;

                    if (sampleX >= 0 && sampleY >= 0 && sampleX < canvas.width && sampleY < canvas.height) {
                        const candidateOffset = (sampleY * canvas.width + sampleX) * 4;
                        sampleOffset = source[candidateOffset + 3] > 16 ? candidateOffset : centerOffset;
                    }

                    r += source[sampleOffset] * weight;
                    g += source[sampleOffset + 1] * weight;
                    b += source[sampleOffset + 2] * weight;
                }
            }

            data[centerOffset] = clamp(r, 0, 255);
            data[centerOffset + 1] = clamp(g, 0, 255);
            data[centerOffset + 2] = clamp(b, 0, 255);
        }
    }

    context.putImageData(imageData, 0, 0);
}

function drawScaledCanvas(sourceCanvas, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    return canvas;
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

export function applyDocumentOperations(canvas, emote, options = {}) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const backgroundRemoval = getBackgroundRemoval(emote);

    if (isBackgroundRemovalV2(emote)) {
        const v2Settings = getBackgroundRemovalV2(emote);
        const result = createBackgroundRemovalMask(data, canvas.width, canvas.height, v2Settings);
        if (options.maskOnly) {
            renderMaskToImageData(data, canvas.width, canvas.height, result);
            context.putImageData(imageData, 0, 0);
            return;
        }
        applyBackgroundRemovalMask(data, canvas.width, canvas.height, result, v2Settings);
    } else if (options.maskOnly) {
        const fallbackMask = new Uint8Array(canvas.width * canvas.height);
        fallbackMask.fill(255);
        renderMaskToImageData(data, canvas.width, canvas.height, { mask: fallbackMask });
        context.putImageData(imageData, 0, 0);
        return;
    } else if (backgroundRemoval.erasurePoints.length > 0) {
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

    if (emote.outline?.shadow?.enabled) {
        applyDropShadow(data, canvas.width, canvas.height, emote.outline.shadow);
    }

    if (emote.outline?.enabled || emote.isAutoOutlineActive) {
        applyAutoOutline(data, canvas.width, canvas.height, emote.outline?.size || 3, emote.outline?.color || [255, 255, 255]);
    }

    context.putImageData(imageData, 0, 0);
}

export function applyDropShadow(data, width, height, shadow = {}) {
    const source = new Uint8ClampedArray(data);
    const blur = Math.max(0, Math.min(8, Math.round(shadow.blur ?? 2)));
    const offsetX = Math.round(shadow.offsetX ?? 2);
    const offsetY = Math.round(shadow.offsetY ?? 2);
    const opacity = Math.max(0, Math.min(1, shadow.opacity ?? 0.35));
    const color = shadow.color || [0, 0, 0];
    const radius = blur + 1;
    const shadowAlpha = new Uint8ClampedArray(width * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const sourceOffset = (y * width + x) * 4;
            const alpha = source[sourceOffset + 3];
            if (alpha <= 16) continue;

            for (let dy = -blur; dy <= blur; dy += 1) {
                for (let dx = -blur; dx <= blur; dx += 1) {
                    const targetX = x + offsetX + dx;
                    const targetY = y + offsetY + dy;
                    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) continue;
                    const distance = Math.hypot(dx, dy);
                    if (distance > radius) continue;
                    const falloff = blur === 0 ? 1 : Math.max(0, 1 - distance / radius);
                    const targetIndex = targetY * width + targetX;
                    shadowAlpha[targetIndex] = Math.max(shadowAlpha[targetIndex], alpha * opacity * falloff);
                }
            }
        }
    }

    for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4;
        if (source[offset + 3] >= 245 || shadowAlpha[index] <= source[offset + 3]) continue;
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = shadowAlpha[index];
    }
}

export function isBackgroundRemovalV2(emote) {
    return emote.backgroundRemoval?.version === 2 || String(emote.backgroundRemoval?.mode || '').startsWith('v2');
}

export function getBackgroundRemovalV2(emote) {
    const backgroundRemoval = emote.backgroundRemoval || {};
    return {
        ...backgroundRemoval,
        tolerance: backgroundRemoval.tolerance ?? emote.tolerance ?? 34,
        erasurePoints: backgroundRemoval.erasurePoints ?? emote.erasurePoints ?? [],
        restorePoints: backgroundRemoval.restorePoints ?? emote.restorePoints ?? [],
    };
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

import JSZip from 'jszip';
import { twitchStaticManual } from '../features/export/presets';
import { validateTwitchOutput } from '../features/export/validators/validateTwitchOutput';
import { sanitizeName, uniqueSafeName } from '../shared/files/names';
import { createContainSquarePlacement } from '../shared/math/rect';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar una imagen para exportar.'));
        img.src = src;
    });
}

function canvasToBlob(canvas) {
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

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('No se pudo leer el PNG codificado.'));
        reader.readAsDataURL(blob);
    });
}

function inspectCanvas(canvas) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    let visiblePixels = 0;

    for (let index = 3; index < imageData.data.length; index += 4) {
        const alpha = imageData.data[index];
        if (alpha < 255) transparentPixels += 1;
        if (alpha > 16) visiblePixels += 1;
    }

    const totalPixels = canvas.width * canvas.height;
    return {
        hasTransparency: transparentPixels > 0,
        transparentPixelRatio: transparentPixels / totalPixels,
        visiblePixelRatio: visiblePixels / totalPixels,
    };
}

function downscaleProgressively(image, targetSize) {
    let currentCanvas = document.createElement('canvas');
    currentCanvas.width = image.width;
    currentCanvas.height = image.height;
    let context = currentCanvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0);

    let currentWidth = image.width;
    let currentHeight = image.height;

    while (currentWidth * 0.5 > targetSize * 2 && currentHeight * 0.5 > targetSize * 2) {
        currentWidth = Math.max(targetSize, Math.floor(currentWidth * 0.5));
        currentHeight = Math.max(targetSize, Math.floor(currentHeight * 0.5));

        const stepCanvas = document.createElement('canvas');
        stepCanvas.width = currentWidth;
        stepCanvas.height = currentHeight;
        const stepContext = stepCanvas.getContext('2d');
        stepContext.imageSmoothingEnabled = true;
        stepContext.imageSmoothingQuality = 'high';
        stepContext.drawImage(currentCanvas, 0, 0, currentWidth, currentHeight);
        currentCanvas = stepCanvas;
        context = stepContext;
    }

    return currentCanvas;
}

export const resizeImageHQ = async (src, targetSize, padding = 0) => {
    const image = await loadImage(src);
    const sourceCanvas = downscaleProgressively(image, targetSize);
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetSize;
    finalCanvas.height = targetSize;

    const finalContext = finalCanvas.getContext('2d');
    finalContext.clearRect(0, 0, targetSize, targetSize);
    finalContext.imageSmoothingEnabled = true;
    finalContext.imageSmoothingQuality = 'high';

    const placement = createContainSquarePlacement(sourceCanvas.width, sourceCanvas.height, targetSize, padding);
    finalContext.drawImage(
        sourceCanvas,
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
        placement.x,
        placement.y,
        placement.width,
        placement.height,
    );

    const blob = await canvasToBlob(finalCanvas);
    const base64 = await blobToBase64(blob);

    return {
        base64,
        blob,
        bytes: blob.size,
        width: targetSize,
        height: targetSize,
        mime: blob.type || 'image/png',
        ...inspectCanvas(finalCanvas),
    };
};

export const generateEmotesZip = async (emotes, setIsExporting) => {
    if (emotes.length === 0) return;
    setIsExporting(true);

    try {
        const zip = new JSZip();
        const usedNames = new Set();
        const manualRoot = zip.folder('twitch-manual');
        const manifest = {
            app: 'EmoteStudio Pro',
            exportedAt: new Date().toISOString(),
            preset: {
                id: twitchStaticManual.id,
                version: twitchStaticManual.version,
            },
            items: [],
        };
        const report = {
            preset: twitchStaticManual.id,
            items: [],
        };

        for (let i = 0; i < emotes.length; i += 1) {
            const emote = emotes[i];
            const srcToExport = emote.processedSrc || emote.originalSrc;
            const safeName = uniqueSafeName(emote.name, usedNames, `emote_${i + 1}`);
            const item = {
                id: emote.id,
                originalName: emote.name,
                exportName: safeName,
                documentType: emote.documentType || 'individual',
                source: emote.source ? {
                    fileName: emote.source.fileName,
                    width: emote.source.width,
                    height: emote.source.height,
                } : null,
                gridCell: emote.gridCell || null,
                cropRect: emote.cropRect || null,
                outputs: [],
                errors: [],
                warnings: [],
            };

            if (!srcToExport) {
                item.errors.push('Emote sin imagen fuente.');
                manifest.items.push(item);
                report.items.push(item);
                continue;
            }

            try {
                const emoteFolder = manualRoot.folder(safeName);

                for (const outputRule of twitchStaticManual.outputs) {
                    const encoded = await resizeImageHQ(srcToExport, outputRule.width, emote.padding || 0);
                    const validation = validateTwitchOutput({
                        name: safeName,
                        mime: encoded.mime,
                        extension: 'png',
                        width: encoded.width,
                        height: encoded.height,
                        bytes: encoded.bytes,
                        hasTransparency: encoded.hasTransparency,
                        visiblePixelRatio: encoded.visiblePixelRatio,
                    }, twitchStaticManual, outputRule);
                    const path = `twitch-manual/${safeName}/${safeName}_${outputRule.width}.png`;

                    emoteFolder.file(`${safeName}_${outputRule.width}.png`, encoded.base64, { base64: true });
                    item.outputs.push({
                        path,
                        width: encoded.width,
                        height: encoded.height,
                        bytes: encoded.bytes,
                        valid: validation.valid,
                        errors: validation.errors,
                        warnings: validation.warnings,
                        transparentPixelRatio: encoded.transparentPixelRatio,
                        visiblePixelRatio: encoded.visiblePixelRatio,
                    });
                }
            } catch (error) {
                item.errors.push(error.message || 'Fallo desconocido al exportar este emote.');
            }

            manifest.items.push(item);
            report.items.push({
                name: safeName,
                valid: item.errors.length === 0 && item.outputs.every((output) => output.valid),
                outputs: item.outputs.map((output) => ({
                    path: output.path,
                    bytes: output.bytes,
                    errors: output.errors,
                    warnings: output.warnings,
                })),
                errors: item.errors,
            });
        }

        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        zip.file('export-report.json', JSON.stringify(report, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        const packageName = sanitizeName('Emotes Optimizados Pro');
        a.href = url;
        a.download = `${packageName}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('Hubo un error al generar el archivo ZIP.');
    } finally {
        setIsExporting(false);
    }
};

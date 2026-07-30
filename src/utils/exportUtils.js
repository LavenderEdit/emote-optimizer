import JSZip from 'jszip';
import { twitchStaticManual } from '../features/export/presets';
import { validateTwitchOutput } from '../features/export/validators/validateTwitchOutput';
import { sanitizeName, uniqueSafeName } from '../shared/files/names';
import { canvasToBlob, renderEmoteOutputCanvas } from '../features/editor/imagePipeline/renderEmote';

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

async function defaultRenderOutput(emote, asset, outputRule) {
    const canvas = await renderEmoteOutputCanvas(emote, asset, outputRule.width);
    if (!canvas) throw new Error('No se pudo renderizar la salida.');
    const blob = await canvasToBlob(canvas);
    const base64 = await blobToBase64(blob);

    return {
        base64,
        bytes: blob.size,
        width: canvas.width,
        height: canvas.height,
        mime: blob.type || 'image/png',
        ...inspectCanvas(canvas),
    };
}

export async function buildEmotesZip(emotes, assets, options = {}) {
    const zip = new JSZip();
    const usedNames = new Set();
    const manualRoot = zip.folder('twitch-manual');
    const renderOutput = options.renderOutput || defaultRenderOutput;
    const now = options.now || (() => new Date().toISOString());
    const manifest = {
        app: 'EmoteStudio Pro',
        exportedAt: now(),
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
        const asset = assets[emote.sourceId];
        const safeName = uniqueSafeName(emote.name, usedNames, `emote_${i + 1}`);
        const item = {
            id: emote.id,
            originalName: emote.name,
            exportName: safeName,
            documentType: emote.documentType || 'individual',
            source: asset ? {
                id: asset.id,
                fileName: asset.fileName,
                width: asset.width,
                height: asset.height,
            } : null,
            gridCell: emote.gridCell || null,
            cropRect: emote.cropRect || null,
            operations: {
                backgroundRemoval: emote.backgroundRemoval || null,
                adjustments: emote.adjustments || null,
                outline: emote.outline || null,
                fitMode: emote.fitMode,
                padding: emote.padding,
            },
            outputs: [],
            errors: [],
            warnings: [...(emote.validation?.warnings || [])],
        };

        if (!asset) {
            item.errors.push('No se encontro el asset fuente del emote.');
            manifest.items.push(item);
            report.items.push(createReportItem(item));
            continue;
        }

        try {
            const emoteFolder = manualRoot.folder(safeName);

            for (const outputRule of twitchStaticManual.outputs) {
                const encoded = await renderOutput(emote, asset, outputRule);
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
        report.items.push(createReportItem(item));
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('export-report.json', JSON.stringify(report, null, 2));

    return { zip, manifest, report };
}

export const generateEmotesZip = async (emotes, assets, setIsExporting) => {
    if (emotes.length === 0) return;
    setIsExporting(true);

    try {
        const { zip } = await buildEmotesZip(emotes, assets);
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

function createReportItem(item) {
    return {
        name: item.exportName,
        valid: item.errors.length === 0 && item.outputs.every((output) => output.valid),
        outputs: item.outputs.map((output) => ({
            path: output.path,
            bytes: output.bytes,
            errors: output.errors,
            warnings: output.warnings,
        })),
        errors: item.errors,
        warnings: item.warnings,
    };
}

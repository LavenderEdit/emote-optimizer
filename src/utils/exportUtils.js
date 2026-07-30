import JSZip from 'jszip';
import { pngCustom, twitchStaticAuto, twitchStaticManual } from '../features/export/presets';
import { validateTwitchOutput } from '../features/export/validators/validateTwitchOutput';
import { sanitizeName, uniqueSafeName } from '../shared/files/names';
import { canvasToBlob, renderEmoteOutputCanvas } from '../features/editor/imagePipeline/renderEmote';

const PRESETS = {
    [twitchStaticManual.id]: twitchStaticManual,
    [twitchStaticAuto.id]: twitchStaticAuto,
    [pngCustom.id]: pngCustom,
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('No se pudo leer el PNG codificado.'));
        reader.readAsDataURL(blob);
    });
}

async function blobToUint8Array(blob) {
    return new Uint8Array(await blob.arrayBuffer());
}

function hasPngSignature(bytes) {
    return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function inspectCanvasAlpha(canvas) {
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

export async function encodeEmoteOutput(emote, asset, outputRule) {
    let size = outputRule.width;
    let canvas = await renderEmoteOutputCanvas(emote, asset, size);
    if (!canvas) throw new Error('No se pudo renderizar la salida.');
    let blob = await canvasToBlob(canvas);

    while (
        outputRule.allowResize &&
        outputRule.minWidth &&
        outputRule.maxBytes &&
        blob.size > outputRule.maxBytes &&
        size > outputRule.minWidth
    ) {
        size = Math.max(outputRule.minWidth, Math.floor(size * 0.92));
        canvas = await renderEmoteOutputCanvas(emote, asset, size);
        if (!canvas) throw new Error('No se pudo reintentar la salida.');
        blob = await canvasToBlob(canvas);
    }

    const base64 = await blobToBase64(blob);
    const bytes = await blobToUint8Array(blob);
    return {
        blob,
        base64,
        bytes: blob.size,
        width: canvas.width,
        height: canvas.height,
        mime: blob.type || 'image/png',
        pngSignatureValid: hasPngSignature(bytes),
        ...inspectCanvasAlpha(canvas),
    };
}

export async function createValidatedEmoteOutput(emote, asset, preset, outputRule, name, options = {}) {
    const renderOutput = options.renderOutput || encodeEmoteOutput;
    const encoded = await renderOutput(emote, asset, outputRule);
    const validation = validateTwitchOutput({
        name,
        mime: encoded.mime,
        extension: 'png',
        width: encoded.width,
        height: encoded.height,
        bytes: encoded.bytes,
        hasTransparency: encoded.hasTransparency,
        transparentPixelRatio: encoded.transparentPixelRatio,
        visiblePixelRatio: encoded.visiblePixelRatio,
        pngSignatureValid: encoded.pngSignatureValid,
    }, preset, outputRule);

    return { encoded, validation };
}

export async function buildEmotesZip(emotes, assets, options = {}) {
    const preset = resolvePreset(options.presetId || options.preset?.id || twitchStaticManual.id);
    const zip = new JSZip();
    const usedNames = new Set();
    const renderOutput = options.renderOutput;
    const now = options.now || (() => new Date().toISOString());
    const signal = options.signal;
    const packageRoot = preset.id === twitchStaticAuto.id
        ? 'twitch-auto-resize'
        : preset.id === twitchStaticManual.id ? 'twitch-manual' : 'custom-png';
    const manifest = {
        app: 'EmoteStudio Pro',
        exportedAt: now(),
        preset: {
            id: preset.id,
            version: preset.version,
            label: preset.label,
        },
        summary: null,
        items: [],
    };
    const report = {
        preset: preset.id,
        status: 'pending',
        summary: null,
        items: [],
    };
    const duplicateNames = findDuplicateNames(emotes);
    const totalFiles = emotes.reduce((sum, emote) => sum + getOutputRules(preset, emote, assets[emote.sourceId], options).length, 0);
    let processedFiles = 0;

    throwIfAborted(signal);
    options.onProgress?.({ status: 'pending', processedEmotes: 0, totalEmotes: emotes.length, processedFiles, totalFiles });

    for (let i = 0; i < emotes.length; i += 1) {
        throwIfAborted(signal);
        const emote = emotes[i];
        const asset = assets[emote.sourceId];
        const safeName = uniqueSafeName(emote.name, usedNames, `emote_${i + 1}`);
        const item = createManifestItem(emote, asset, safeName, duplicateNames, preset);
        const outputRules = getOutputRules(preset, emote, asset, options);

        options.onProgress?.({
            status: 'processing',
            currentEmote: safeName,
            processedEmotes: i,
            totalEmotes: emotes.length,
            processedFiles,
            totalFiles,
        });

        if (!asset) {
            item.errors.push('No se encontro el asset fuente del emote.');
            item.status = 'invalid';
            pushItem(manifest, report, item);
            continue;
        }

        for (const outputRule of outputRules) {
            throwIfAborted(signal);
            const outputName = outputRule.suffix ? `${safeName}_${outputRule.suffix}.png` : `${safeName}.png`;
            const mainPath = `${packageRoot}/${safeName}/${outputName}`;
            const invalidPath = `invalid/${packageRoot}/${safeName}/${outputName}`;

            try {
                options.onProgress?.({
                    status: 'processing',
                    currentEmote: safeName,
                    currentFile: outputName,
                    processedEmotes: i,
                    totalEmotes: emotes.length,
                    processedFiles,
                    totalFiles,
                });

                const { encoded, validation } = await createValidatedEmoteOutput(emote, asset, preset, outputRule, safeName, { renderOutput });
                const valid = validation.valid;
                const path = valid ? mainPath : invalidPath;
                zip.file(path, encoded.base64, { base64: true });

                item.outputs.push({
                    path,
                    targetPath: mainPath,
                    invalidPath,
                    width: encoded.width,
                    height: encoded.height,
                    bytes: encoded.bytes,
                    mime: encoded.mime,
                    valid,
                    status: valid ? 'valid' : 'invalid',
                    errors: validation.errors,
                    warnings: validation.warnings,
                    transparentPixelRatio: encoded.transparentPixelRatio,
                    visiblePixelRatio: encoded.visiblePixelRatio,
                });
            } catch (error) {
                item.outputs.push({
                    path: invalidPath,
                    targetPath: mainPath,
                    invalidPath,
                    valid: false,
                    status: 'invalid',
                    errors: [error.message || 'Fallo desconocido al exportar este archivo.'],
                    warnings: [],
                });
            } finally {
                processedFiles += 1;
            }
        }

        item.status = item.errors.length > 0 || item.outputs.some((output) => !output.valid) ? 'invalid' : 'valid';
        pushItem(manifest, report, item);
    }

    manifest.summary = createSummary(manifest.items);
    report.summary = manifest.summary;
    report.status = report.summary.invalidItems > 0 ? 'invalid' : 'valid';

    if (options.includeContactSheet && manifest.summary.validOutputs > 0) {
        const contactSheet = await createContactSheet(emotes, assets, {
            size: options.contactSheetSize || 112,
            columns: options.contactSheetColumns || 6,
        });
        zip.file('contact-sheet.png', contactSheet.base64, { base64: true });
        manifest.contactSheet = {
            path: 'contact-sheet.png',
            width: contactSheet.width,
            height: contactSheet.height,
            bytes: contactSheet.bytes,
        };
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('export-report.json', JSON.stringify(report, null, 2));
    zip.file('export-report.html', createReportHtml(report));

    options.onProgress?.({
        status: report.status,
        processedEmotes: emotes.length,
        totalEmotes: emotes.length,
        processedFiles,
        totalFiles,
    });

    return { zip, manifest, report };
}

export async function createContactSheet(emotes, assets, options = {}) {
    const size = options.size || 112;
    const columns = Math.max(1, options.columns || 6);
    const rows = Math.max(1, Math.ceil(emotes.length / columns));
    const canvas = document.createElement('canvas');
    canvas.width = columns * size;
    canvas.height = rows * size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    for (let index = 0; index < emotes.length; index += 1) {
        const emote = emotes[index];
        const asset = assets[emote.sourceId];
        if (!asset) continue;
        const tile = await renderEmoteOutputCanvas(emote, asset, size);
        const x = (index % columns) * size;
        const y = Math.floor(index / columns) * size;
        context.drawImage(tile, x, y);
    }

    const blob = await canvasToBlob(canvas);
    return {
        blob,
        base64: await blobToBase64(blob),
        bytes: blob.size,
        width: canvas.width,
        height: canvas.height,
    };
}

export const generateEmotesZip = async (emotes, assets, setIsExporting, options = {}) => {
    if (emotes.length === 0) return null;
    setIsExporting(true);

    try {
        const result = await buildEmotesZip(emotes, assets, options);
        const content = await result.zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        const packageName = sanitizeName('Emotes Optimizados Pro');
        a.href = url;
        a.download = `${packageName}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        return result;
    } catch (error) {
        if (error.name === 'AbortError') return null;
        console.error('Error al exportar:', error);
        alert('Hubo un error al generar el archivo ZIP.');
        return null;
    } finally {
        setIsExporting(false);
    }
};

export function getPresetById(presetId) {
    return resolvePreset(presetId);
}

export function getOutputRules(preset, emote, asset, options = {}) {
    if (preset.id === twitchStaticManual.id) {
        return preset.outputs.map((output) => ({
            ...output,
            suffix: String(output.width),
        }));
    }

    if (preset.id === pngCustom.id) {
        const size = Math.max(1, Math.min(4096, Math.round(options.customSize || options.width || preset.outputs[0].width)));
        return [{
            ...preset.outputs[0],
            width: size,
            height: Math.max(1, Math.min(4096, Math.round(options.customHeight || options.height || size))),
            maxBytes: options.customMaxBytes || preset.outputs[0].maxBytes,
            suffix: `${size}`,
        }];
    }

    const crop = emote.cropRect || { width: asset?.width || 112, height: asset?.height || 112 };
    const longestSide = Math.max(crop.width, crop.height, preset.outputs[0].minWidth);
    const size = Math.max(
        preset.outputs[0].minWidth,
        Math.min(preset.outputs[0].maxWidth, Math.round(longestSide)),
    );

    return [{
        ...preset.outputs[0],
        width: size,
        height: size,
        suffix: 'master',
        allowResize: true,
    }];
}

function resolvePreset(presetId) {
    return PRESETS[presetId] || twitchStaticManual;
}

function createManifestItem(emote, asset, safeName, duplicateNames, preset) {
    const duplicateName = duplicateNames.has(sanitizeName(emote.name));
    return {
        id: emote.id,
        originalName: emote.name,
        exportName: safeName,
        documentType: emote.documentType || 'individual',
        status: 'pending',
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
            frame: emote.frame || null,
        },
        preflight: {
            name: safeName,
            duplicateName,
            pngRequired: true,
            squareRequired: Boolean(preset.square),
            transparencyRequired: Boolean(preset.transparentBackground),
        },
        outputs: [],
        errors: [],
        warnings: [
            ...(emote.validation?.warnings || []),
            ...(duplicateName ? ['Nombre duplicado normalizado; se exportara con sufijo unico.'] : []),
        ],
    };
}

function pushItem(manifest, report, item) {
    manifest.items.push(item);
    report.items.push(createReportItem(item));
}

function createReportItem(item) {
    return {
        id: item.id,
        name: item.exportName,
        status: item.status,
        valid: item.status === 'valid',
        outputs: item.outputs.map((output) => ({
            path: output.path,
            bytes: output.bytes || 0,
            status: output.status,
            valid: output.valid,
            errors: output.errors,
            warnings: output.warnings,
        })),
        errors: item.errors,
        warnings: item.warnings,
    };
}

function createSummary(items) {
    const outputs = items.flatMap((item) => item.outputs);
    const validOutputs = outputs.filter((output) => output.valid);
    const invalidOutputs = outputs.filter((output) => !output.valid);
    const validItems = items.filter((item) => item.status === 'valid');
    const invalidItems = items.filter((item) => item.status === 'invalid');

    return {
        totalItems: items.length,
        validItems: validItems.length,
        invalidItems: invalidItems.length,
        totalOutputs: outputs.length,
        validOutputs: validOutputs.length,
        invalidOutputs: invalidOutputs.length,
        totalBytes: outputs.reduce((sum, output) => sum + (output.bytes || 0), 0),
    };
}

function findDuplicateNames(emotes) {
    const counts = new Map();
    emotes.forEach((emote) => {
        const safeName = sanitizeName(emote.name);
        counts.set(safeName, (counts.get(safeName) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
}

function createReportHtml(report) {
    const rows = report.items.map((item) => (
        `<tr><td>${escapeHtml(item.name)}</td><td>${item.status}</td><td>${item.outputs.length}</td><td>${escapeHtml(item.errors.join('; '))}</td></tr>`
    )).join('');
    return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Export report</title></head>
<body>
<h1>EmoteStudio Pro export</h1>
<p>Preset: ${escapeHtml(report.preset)}</p>
<p>Validos: ${report.summary.validOutputs}/${report.summary.totalOutputs}</p>
<table>
<thead><tr><th>Nombre</th><th>Estado</th><th>Archivos</th><th>Errores</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function throwIfAborted(signal) {
    if (signal?.aborted) {
        const error = new Error('Exportacion cancelada.');
        error.name = 'AbortError';
        throw error;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

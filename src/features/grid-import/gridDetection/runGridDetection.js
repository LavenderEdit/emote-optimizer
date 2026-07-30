import { analyzeGridImageData } from './analyzeGrid';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo cargar la imagen para detectar el grid.'));
        image.src = src;
    });
}

export async function createAnalysisImageData(asset, maxSide = 1400) {
    const image = await loadImage(asset.objectUrl);
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);

    return {
        imageData,
        scaleX: asset.width / width,
        scaleY: asset.height / height,
    };
}

export async function detectGridInWorker(asset) {
    return startGridDetection(asset).promise;
}

export function startGridDetection(asset) {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    let worker = null;
    let cancelled = false;
    let rejectPromise = null;

    const promise = createAnalysisImageData(asset)
        .then(({ imageData, scaleX, scaleY }) => {
            if (cancelled) throw createAbortError();

            if (typeof Worker === 'undefined') {
                return scaleAnalysis(analyzeGridImageData({
                    data: imageData.data,
                    width: imageData.width,
                    height: imageData.height,
                }), scaleX, scaleY);
            }

            worker = new Worker(new URL('../workers/gridAnalysis.worker.js', import.meta.url), { type: 'module' });

            return new Promise((resolve, reject) => {
                rejectPromise = reject;
                worker.onmessage = (event) => {
                    worker.terminate();
                    worker = null;
                    if (cancelled) {
                        reject(createAbortError());
                        return;
                    }
                    if (!event.data.ok || event.data.sourceId !== asset.id || event.data.requestId !== requestId) {
                        reject(new Error(event.data.error || 'Respuesta de deteccion invalida.'));
                        return;
                    }
                    resolve(scaleAnalysis(event.data.analysis, scaleX, scaleY));
                };
                worker.onerror = (event) => {
                    worker?.terminate();
                    worker = null;
                    reject(new Error(event.message || 'Fallo el Web Worker de deteccion.'));
                };
                worker.postMessage({
                    requestId,
                    sourceId: asset.id,
                    imageData: {
                        width: imageData.width,
                        height: imageData.height,
                        data: imageData.data.buffer,
                    },
                }, [imageData.data.buffer]);
            });
        });

    return {
        requestId,
        sourceId: asset.id,
        promise,
        cancel() {
            cancelled = true;
            if (worker) {
                worker.terminate();
                worker = null;
            }
            if (rejectPromise) {
                rejectPromise(createAbortError());
                rejectPromise = null;
            }
        },
    };
}

function createAbortError() {
    const error = new Error('Deteccion cancelada.');
    error.name = 'AbortError';
    return error;
}

export function scaleAnalysis(analysis, scaleX, scaleY) {
    const scaleBandX = (band) => ({ start: band.start * scaleX, end: band.end * scaleX });
    const scaleBandY = (band) => ({ start: band.start * scaleY, end: band.end * scaleY });
    const scaleRect = (rect) => ({
        x: Math.round(rect.x * scaleX),
        y: Math.round(rect.y * scaleY),
        width: Math.round(rect.width * scaleX),
        height: Math.round(rect.height * scaleY),
    });

    return {
        ...analysis,
        rowBands: analysis.rowBands.map(scaleBandY),
        columnBands: analysis.columnBands.map(scaleBandX),
        rowBoundaries: analysis.rowBoundaries.map((value) => value * scaleY),
        columnBoundaries: analysis.columnBoundaries.map((value) => value * scaleX),
        outerMargins: {
            top: Math.round(analysis.outerMargins.top * scaleY),
            bottom: Math.round(analysis.outerMargins.bottom * scaleY),
            left: Math.round(analysis.outerMargins.left * scaleX),
            right: Math.round(analysis.outerMargins.right * scaleX),
        },
        horizontalGap: Math.round(analysis.horizontalGap * scaleX),
        verticalGap: Math.round(analysis.verticalGap * scaleY),
        cells: analysis.cells.map((cell) => ({
            ...cell,
            sourceRect: scaleRect(cell.sourceRect),
            contentRect: scaleRect(cell.contentRect),
        })),
    };
}

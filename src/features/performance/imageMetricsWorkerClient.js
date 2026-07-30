import { computeImageMetrics } from './imageMetrics';

export function startImageMetricsAnalysis({ imageData, sourceId = 'image-metrics' }) {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    let worker = null;
    let cancelled = false;
    let rejectPromise = null;

    const promise = typeof Worker === 'undefined'
        ? Promise.resolve(computeImageMetrics(imageData))
        : new Promise((resolve, reject) => {
            rejectPromise = reject;
            worker = new Worker(new URL('./workers/imageMetrics.worker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (event) => {
                worker?.terminate();
                worker = null;
                if (cancelled) {
                    reject(createAbortError());
                    return;
                }
                if (!event.data.ok || event.data.requestId !== requestId || event.data.sourceId !== sourceId) {
                    reject(new Error(event.data.error || 'Respuesta de metricas obsoleta.'));
                    return;
                }
                resolve(event.data.metrics);
            };
            worker.onerror = (event) => {
                worker?.terminate();
                worker = null;
                reject(new Error(event.message || 'Fallo el Worker de metricas.'));
            };
            worker.postMessage({
                requestId,
                sourceId,
                imageData: {
                    width: imageData.width,
                    height: imageData.height,
                    data: imageData.data.buffer,
                },
            }, [imageData.data.buffer]);
        });

    return {
        requestId,
        sourceId,
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
    const error = new Error('Analisis cancelado.');
    error.name = 'AbortError';
    return error;
}

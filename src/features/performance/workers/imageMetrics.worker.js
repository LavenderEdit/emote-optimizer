import { computeImageMetrics } from '../imageMetrics';

self.onmessage = (event) => {
    const { requestId, sourceId, imageData } = event.data;
    try {
        const metrics = computeImageMetrics({
            width: imageData.width,
            height: imageData.height,
            data: new Uint8ClampedArray(imageData.data),
        });
        self.postMessage({ requestId, sourceId, ok: true, metrics });
    } catch (error) {
        self.postMessage({
            requestId,
            sourceId,
            ok: false,
            error: error.message || 'No se pudieron calcular metricas.',
        });
    }
};

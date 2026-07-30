import { analyzeGridImageData } from '../gridDetection/analyzeGrid';

self.onmessage = (event) => {
    const { requestId, sourceId, imageData } = event.data;

    try {
        const data = new Uint8ClampedArray(imageData.data);
        const analysis = analyzeGridImageData({
            data,
            width: imageData.width,
            height: imageData.height,
        });
        self.postMessage({ requestId, sourceId, ok: true, analysis });
    } catch (error) {
        self.postMessage({
            requestId,
            sourceId,
            ok: false,
            error: error.message || 'No se pudo analizar el grid.',
        });
    }
};

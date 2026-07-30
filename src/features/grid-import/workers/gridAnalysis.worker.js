import { analyzeGridImageData } from '../gridDetection/analyzeGrid';

self.onmessage = (event) => {
    const { id, imageData } = event.data;

    try {
        const data = new Uint8ClampedArray(imageData.data);
        const analysis = analyzeGridImageData({
            data,
            width: imageData.width,
            height: imageData.height,
        });
        self.postMessage({ id, ok: true, analysis });
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error.message || 'No se pudo analizar el grid.',
        });
    }
};

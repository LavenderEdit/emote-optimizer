import { useEffect, useRef } from 'react';
import { renderEmoteMasterCanvas, canvasToBlob, loadImageElement } from '../features/editor/imagePipeline/renderEmote';
import { createPreviewCacheKey, previewCache } from '../features/performance/previewCache';
import { startImageMetricsAnalysis } from '../features/performance/imageMetricsWorkerClient';

export function useImageProcessor({
    emote,
    asset,
    onPreviewReady,
    onMetricsReady,
    comparisonMode = 'after',
}) {
    const canvasRef = useRef(null);
    const metricsRequestRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        metricsRequestRef.current?.cancel?.();
        let effectMetricsRequest = null;

        const queueEffectMetrics = (canvas) => {
            effectMetricsRequest?.cancel?.();
            effectMetricsRequest = queueMetrics(canvas, emote, asset, onMetricsReady, metricsRequestRef, () => cancelled);
        };

        async function render() {
            if (!emote || !asset || !canvasRef.current) return;
            const cacheKey = comparisonMode === 'after'
                ? createPreviewCacheKey(emote, asset, { comparisonMode })
                : null;
            const cachedPreview = cacheKey ? previewCache.get(cacheKey) : null;

            if (cachedPreview?.url) {
                try {
                    const cachedImage = await loadImageElement(cachedPreview.url);
                    if (cancelled || !canvasRef.current) return;
                    drawToVisibleCanvas(canvasRef.current, cachedImage);
                    if (onPreviewReady) onPreviewReady(emote.id, cachedPreview.blob, { cacheHit: true, cacheKey });
                    if (onMetricsReady) queueEffectMetrics(canvasRef.current);
                    return;
                } catch {
                    previewCache.delete(cacheKey);
                }
            }

            const renderedCanvas = await renderEmoteMasterCanvas(emote, asset, {
                applyOperations: comparisonMode !== 'before',
                maskOnly: comparisonMode === 'mask',
            });
            if (!renderedCanvas || cancelled || !canvasRef.current) return;

            const canvas = canvasRef.current;
            canvas.width = renderedCanvas.width;
            canvas.height = renderedCanvas.height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(renderedCanvas, 0, 0);

            if (onPreviewReady && comparisonMode === 'after') {
                try {
                    const blob = await canvasToBlob(canvas);
                    if (!cancelled) {
                        if (cacheKey) previewCache.set(cacheKey, blob);
                        onPreviewReady(emote.id, blob, { cacheHit: false, cacheKey });
                    }
                } catch (error) {
                    console.error('No se pudo crear preview del emote:', error);
                }
            }

            if (!cancelled && comparisonMode === 'after' && onMetricsReady) {
                queueEffectMetrics(canvas);
            }
        }

        render().catch((error) => {
            if (!cancelled) console.error('No se pudo renderizar el emote:', error);
        });

        return () => {
            cancelled = true;
            effectMetricsRequest?.cancel?.();
        };
    }, [emote, asset, onPreviewReady, onMetricsReady, comparisonMode]);

    return { canvasRef };
}

function drawToVisibleCanvas(canvas, image) {
    canvas.width = image.width || image.naturalWidth || 1;
    canvas.height = image.height || image.naturalHeight || 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
}

function queueMetrics(canvas, emote, asset, onMetricsReady, metricsRequestRef, isCancelled) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const sourceId = `${asset.id}:${emote.id}`;
    const request = startImageMetricsAnalysis({ imageData, sourceId });
    metricsRequestRef.current = request;
    request.promise
        .then((metrics) => {
            if (isCancelled() || metricsRequestRef.current?.requestId !== request.requestId) return;
            onMetricsReady(emote.id, metrics);
        })
        .catch((error) => {
            if (!isCancelled() && error.name !== 'AbortError') {
                console.error('No se pudieron calcular metricas de imagen:', error);
            }
        });
    return request;
}

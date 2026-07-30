import { useEffect, useRef } from 'react';
import { renderEmoteMasterCanvas, canvasToBlob } from '../features/editor/imagePipeline/renderEmote';

export function useImageProcessor({
    emote,
    asset,
    onPreviewReady,
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            if (!emote || !asset || !canvasRef.current) return;
            const renderedCanvas = await renderEmoteMasterCanvas(emote, asset);
            if (!renderedCanvas || cancelled || !canvasRef.current) return;

            const canvas = canvasRef.current;
            canvas.width = renderedCanvas.width;
            canvas.height = renderedCanvas.height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(renderedCanvas, 0, 0);

            if (onPreviewReady) {
                try {
                    const blob = await canvasToBlob(canvas);
                    if (!cancelled) onPreviewReady(emote.id, blob);
                } catch (error) {
                    console.error('No se pudo crear preview del emote:', error);
                }
            }
        }

        render().catch((error) => {
            if (!cancelled) console.error('No se pudo renderizar el emote:', error);
        });

        return () => {
            cancelled = true;
        };
    }, [emote, asset, onPreviewReady]);

    return { canvasRef };
}

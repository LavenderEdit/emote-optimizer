import { useEffect, useRef } from 'react';
import { applyFloodFillErasure } from '../utils/imageProcessing/floodFill';
import { applyRestoreBrush } from '../utils/imageProcessing/restoreBrush';
import { applyProAdjustments } from '../utils/imageProcessing/adjustments';
import { applyAutoOutline } from '../utils/imageProcessing/autoOutline';

export function useImageProcessor({
    imageSrc,
    erasurePoints,
    restorePoints,
    tolerance,
    isAutoOutlineActive,
    adjustments,
    onProcessed
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!imageSrc || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const w = canvas.width;
            const h = canvas.height;

            if (erasurePoints && erasurePoints.length > 0) {
                const refinedMask = applyFloodFillErasure(data, w, h, erasurePoints, tolerance);

                if (restorePoints && restorePoints.length > 0) {
                    applyRestoreBrush(refinedMask, w, h, restorePoints, 10);
                }

                for (let i = 0; i < w * h; i++) {
                    data[i * 4 + 3] = Math.min(data[i * 4 + 3], refinedMask[i]);
                }
            }

            if (adjustments) {
                applyProAdjustments(data, w, h, adjustments);
            }

            if (isAutoOutlineActive) {
                applyAutoOutline(data, w, h, 3, [255, 255, 255]);
            }

            ctx.putImageData(imageData, 0, 0);
            if (onProcessed) onProcessed(canvas.toDataURL('image/png'));
        };

        img.src = imageSrc;
    }, [imageSrc, erasurePoints, restorePoints, tolerance, isAutoOutlineActive, adjustments, onProcessed]);

    return { canvasRef };
}
import { useEffect, useRef } from 'react';

export function useImageProcessor({
    imageSrc,
    erasurePoints,
    restorePoints, // NUEVO: Puntos donde pasaremos el pincel restaurador
    tolerance,
    isAutoOutlineActive,
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
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const w = canvas.width;
            const h = canvas.height;

            // --- 1. ALGORITMO FLOOD FILL (Varita Mágica Múltiple) ---
            if (erasurePoints.length > 0) {
                const mask = new Uint8Array(w * h);
                mask.fill(255);
                let minX = w, maxX = 0, minY = h, maxY = 0;

                for (const point of erasurePoints) {
                    const { r: targetR, g: targetG, b: targetB, x: startX, y: startY } = point;
                    const visited = new Uint8Array(w * h);
                    const stack = [startY * w + startX];

                    while (stack.length > 0) {
                        const pos = stack.pop();
                        if (visited[pos]) continue;
                        visited[pos] = 1;

                        const i = pos * 4;
                        const r = data[i], g = data[i + 1], b = data[i + 2];

                        const distance = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));

                        if (distance <= tolerance) {
                            mask[pos] = 0;
                            const cy = Math.floor(pos / w), cx = pos % w;
                            if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                            if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

                            if (cx > 0 && mask[pos - 1] !== 0) stack.push(pos - 1);
                            if (cx < w - 1 && mask[pos + 1] !== 0) stack.push(pos + 1);
                            if (cy > 0 && mask[pos - w] !== 0) stack.push(pos - w);
                            if (cy < h - 1 && mask[pos + w] !== 0) stack.push(pos + w);
                        }
                    }
                }

                // --- 2. SMART DEFRINGE (Refinamiento Inteligente) ---
                minX = Math.max(0, minX - 2); maxX = Math.min(w - 1, maxX + 2);
                minY = Math.max(0, minY - 2); maxY = Math.min(h - 1, maxY + 2);

                const refinedMask = new Uint8Array(mask);

                for (let y = minY; y <= maxY; y++) {
                    for (let x = minX; x <= maxX; x++) {
                        const pos = y * w + x;

                        // Solo analizamos el borde exterior del personaje
                        if (mask[pos] === 255) {
                            const isEdge = (x > 0 && mask[pos - 1] === 0) ||
                                (x < w - 1 && mask[pos + 1] === 0) ||
                                (y > 0 && mask[pos - w] === 0) ||
                                (y < h - 1 && mask[pos + w] === 0);

                            if (isEdge) {
                                const i = pos * 4;
                                const r = data[i], g = data[i + 1], b = data[i + 2];

                                // Calculamos qué tan parecido es este borde al fondo que se borró
                                let minDist = 9999;
                                for (const pt of erasurePoints) {
                                    const dist = Math.sqrt(Math.pow(r - pt.r, 2) + Math.pow(g - pt.g, 2) + Math.pow(b - pt.b, 2));
                                    if (dist < minDist) minDist = dist;
                                }

                                // MAGIA: Si el borde se parece al fondo (ej. un halo blanco sucio), lo hacemos transparente.
                                // Si es una línea negra del dibujo, minDist será gigante y la línea negra se protegerá al 100%.
                                const haloThreshold = tolerance + 120;
                                if (minDist < haloThreshold) {
                                    const alpha = ((minDist - tolerance) / 120) * 255;
                                    refinedMask[pos] = Math.max(0, Math.min(255, alpha));
                                }
                            }
                        }
                    }
                }

                // --- 3. PINCEL RESTAURADOR ---
                // Si el usuario pinto con SHIFT sobre zonas borradas, forzamos a que reaparezcan
                if (restorePoints && restorePoints.length > 0) {
                    const brushRadius = 15; // Tamaño del pincel de restauración
                    for (const pt of restorePoints) {
                        const { x, y } = pt;
                        for (let by = -brushRadius; by <= brushRadius; by++) {
                            for (let bx = -brushRadius; bx <= brushRadius; bx++) {
                                if (bx * bx + by * by <= brushRadius * brushRadius) {
                                    const nx = x + bx;
                                    const ny = y + by;
                                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                        refinedMask[ny * w + nx] = 255; // 255 = restaurar a opacidad completa
                                    }
                                }
                            }
                        }
                    }
                }

                // Finalmente, aplicamos toda la máscara al canal de transparencia de la imagen
                for (let i = 0; i < w * h; i++) {
                    data[i * 4 + 3] = Math.min(data[i * 4 + 3], refinedMask[i]);
                }
            }

            // --- 4. AUTO-OUTLINE ---
            if (isAutoOutlineActive) {
                const edgeData = new Uint8ClampedArray(data);
                const strokeSize = 3;
                const outlineColor = [255, 255, 255];

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4;
                        if (data[i + 3] < 128) {
                            let isEdge = false;
                            for (let sy = -strokeSize; sy <= strokeSize; sy++) {
                                for (let sx = -strokeSize; sx <= strokeSize; sx++) {
                                    if (sy * sy + sx * sx <= strokeSize * strokeSize) {
                                        const ny = y + sy, nx = x + sx;
                                        if (ny >= 0 && ny < h && nx >= 0 && nx < w && data[(ny * w + nx) * 4 + 3] >= 128) {
                                            isEdge = true; break;
                                        }
                                    }
                                }
                                if (isEdge) break;
                            }
                            if (isEdge) {
                                edgeData[i] = outlineColor[0]; edgeData[i + 1] = outlineColor[1];
                                edgeData[i + 2] = outlineColor[2]; edgeData[i + 3] = 255;
                            }
                        }
                    }
                }
                for (let i = 0; i < data.length; i++) data[i] = edgeData[i];
            }

            ctx.putImageData(imageData, 0, 0);
            if (onProcessed) onProcessed(canvas.toDataURL('image/png'));
        };

        img.src = imageSrc;
    }, [imageSrc, erasurePoints, restorePoints, tolerance, isAutoOutlineActive, onProcessed]);

    return { canvasRef };
}
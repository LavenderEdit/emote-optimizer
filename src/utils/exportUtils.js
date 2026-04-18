import JSZip from 'jszip';

export const resizeImageHQ = (src, targetSize) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let curW = img.width;
            let curH = img.height;

            canvas.width = curW;
            canvas.height = curH;
            ctx.drawImage(img, 0, 0);

            while (curW * 0.5 > targetSize && curH * 0.5 > targetSize) {
                curW = Math.floor(curW * 0.5);
                curH = Math.floor(curH * 0.5);
                const stepCanvas = document.createElement('canvas');
                stepCanvas.width = curW;
                stepCanvas.height = curH;
                const stepCtx = stepCanvas.getContext('2d');
                stepCtx.imageSmoothingEnabled = true;
                stepCtx.imageSmoothingQuality = 'high';
                stepCtx.drawImage(canvas, 0, 0, curW, curH);
                canvas = stepCanvas;
            }

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = targetSize;
            finalCanvas.height = targetSize;
            const finalCtx = finalCanvas.getContext('2d');
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';

            const size = Math.min(canvas.width, canvas.height);
            const offsetX = (canvas.width - size) / 2;
            const offsetY = (canvas.height - size) / 2;

            finalCtx.drawImage(canvas, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
            resolve(finalCanvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = src;
    });
};

export const generateEmotesZip = async (emotes, setIsExporting) => {
    if (emotes.length === 0) return;
    setIsExporting(true);

    try {
        const zip = new JSZip();
        const sizes = [112, 56, 28];

        for (let i = 0; i < emotes.length; i++) {
            const emote = emotes[i];
            const srcToExport = emote.processedSrc || emote.originalSrc;
            if (!srcToExport) continue;

            const safeName = emote.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `emote_${i + 1}`;
            const emoteFolder = zip.folder(safeName);

            for (const size of sizes) {
                const base64Data = await resizeImageHQ(srcToExport, size);
                emoteFolder.file(`${safeName}_${size}x${size}.png`, base64Data, { base64: true });
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Emotes_Optimizados_Pro.zip";
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error al exportar:", error);
        alert("Hubo un error al generar el archivo ZIP.");
    } finally {
        setIsExporting(false);
    }
};
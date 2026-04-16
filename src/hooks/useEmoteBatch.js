import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';

export function useEmoteBatch() {
    const [theme, setTheme] = useState('dark');
    const fileInputRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);

    const updateActiveEmote = (updates) => {
        if (!activeId) return;
        setEmotes(prev => prev.map(e => e.id === activeId ? { ...e, ...updates } : e));
    };

    useEffect(() => {
        if (!activeId && emotes.length > 0) {
            setActiveId(emotes[0].id);
        }
    }, [emotes, activeId]);

    const processFiles = (files) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            alert("Por favor sube imágenes válidas (PNG, JPG).");
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newEmote = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    originalSrc: event.target.result,
                    processedSrc: null,
                    erasurePoints: [],
                    restorePoints: [],
                    tolerance: 30,
                    isAutoOutlineActive: false
                };
                setEmotes(prev => {
                    const next = [...prev, newEmote];
                    if (prev.length === 0) setActiveId(newEmote.id);
                    return next;
                });
            };
            reader.readAsDataURL(file);
        });

        setIsEyedropperActive(false);
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const handleRemoveActive = () => {
        setEmotes(prev => prev.filter(e => e.id !== activeId));
        setActiveId(null);
        setIsEyedropperActive(false);
    };

    const resizeImageHQ = (src, targetSize) => {
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

    const exportToZip = async () => {
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
            a.download = "Emotes_Optimizados_Lote.zip";
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error al exportar:", error);
            alert("Hubo un error al generar el archivo ZIP.");
        } finally {
            setIsExporting(false);
        }
    };

    return {
        theme,
        setTheme,
        fileInputRef,
        emotes,
        activeId,
        setActiveId,
        activeEmote,
        isEyedropperActive,
        setIsEyedropperActive,
        isExporting,
        updateActiveEmote,
        processFiles,
        handleFileInput,
        triggerUpload,
        handleRemoveActive,
        exportToZip
    };
}
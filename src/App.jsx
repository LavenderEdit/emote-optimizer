import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Moon, Sun, Plus, X } from 'lucide-react';
import Header from './components/layout/Header';
import SidebarLeft from './components/workspace/SidebarLeft';
import CanvasArea from './components/workspace/CanvasArea';
import SidebarRight from './components/workspace/SidebarRight';

function App() {
  const [theme, setTheme] = useState('dark');
  const fileInputRef = useRef(null);

  const [emotes, setEmotes] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeEmote = emotes.find(e => e.id === activeId);

  const updateActiveEmote = useCallback((updates) => {
    if (!activeId) return;
    setEmotes(prev => prev.map(e => e.id === activeId ? { ...e, ...updates } : e));
  }, [activeId]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === 'z') {
      if (activeEmote && activeEmote.history && activeEmote.history.length > 0) {
        const newHistory = [...activeEmote.history];
        const previousState = newHistory.pop();

        updateActiveEmote({
          erasurePoints: previousState.erasurePoints,
          restorePoints: previousState.restorePoints,
          history: newHistory
        });
      }
    }
  }, [activeEmote, updateActiveEmote]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
          history: [],
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

  const addDpiMetadata = async (blobDataUrl) => {
    return blobDataUrl;
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

  const saveToHistory = () => {
    if (activeEmote) {
      const currentHistory = activeEmote.history || [];
      updateActiveEmote({
        history: [...currentHistory, {
          erasurePoints: [...activeEmote.erasurePoints],
          restorePoints: [...activeEmote.restorePoints]
        }]
      });
    }
  }

  return (
    <div className={`h-screen w-full flex flex-col font-sans ${theme === 'dark' ? 'bg-[#0e0e10] text-white' : 'bg-gray-100 text-gray-900'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileInput} accept="image/png, image/jpeg" multiple className="hidden" />

      <Header theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <div className="flex-1 flex overflow-hidden">

        <SidebarLeft
          theme={theme}
          hasImage={!!activeEmote}
          onUploadClick={triggerUpload}
          isEyedropperActive={isEyedropperActive}
          onEyedropperToggle={() => setIsEyedropperActive(!isEyedropperActive)}
          tolerance={activeEmote?.tolerance || 30}
          onToleranceChange={(val) => updateActiveEmote({ tolerance: val })}
          isAutoOutlineActive={activeEmote?.isAutoOutlineActive || false}
          onAutoOutlineToggle={() => updateActiveEmote({ isAutoOutlineActive: !activeEmote.isAutoOutlineActive })}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <CanvasArea
            theme={theme}
            imageSrc={activeEmote?.originalSrc || null}
            onImageRemove={handleRemoveActive}
            onUploadClick={triggerUpload}
            onFileDrop={(file) => processFiles([file])}
            isEyedropperActive={isEyedropperActive}
            tolerance={activeEmote?.tolerance || 30}
            isAutoOutlineActive={activeEmote?.isAutoOutlineActive || false}
            erasurePoints={activeEmote?.erasurePoints || []}
            setErasurePoints={(updater) => updateActiveEmote({ erasurePoints: typeof updater === 'function' ? updater(activeEmote.erasurePoints) : updater })}
            restorePoints={activeEmote?.restorePoints || []}
            setRestorePoints={(updater) => updateActiveEmote({ restorePoints: typeof updater === 'function' ? updater(activeEmote.restorePoints) : updater })}
            onProcessed={(src) => updateActiveEmote({ processedSrc: src })}
            saveToHistory={saveToHistory}
          />

          {emotes.length > 0 && (
            <div className={`h-28 border-t flex items-center px-6 gap-4 overflow-x-auto ${theme === 'dark' ? 'bg-[#121214] border-gray-800' : 'bg-white border-gray-300'}`}>
              {emotes.map(emote => (
                <div
                  key={emote.id}
                  onClick={() => setActiveId(emote.id)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg cursor-pointer transition-all ${emote.id === activeId ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30' : 'opacity-60 hover:opacity-100 ring-1 ring-gray-500'
                    }`}
                >
                  <img src={emote.processedSrc || emote.originalSrc} alt={emote.name} className="w-full h-full object-cover rounded-md" />
                  {emote.id === activeId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveActive(); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={triggerUpload}
                className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${theme === 'dark' ? 'border-gray-700 hover:border-gray-500 text-gray-500' : 'border-gray-300 hover:border-gray-500 text-gray-400'
                  }`}
              >
                <Plus size={24} />
              </button>
            </div>
          )}
        </div>

        <SidebarRight
          theme={theme}
          processedImage={activeEmote?.processedSrc || activeEmote?.originalSrc}
          onExport={exportToZip}
          isExporting={isExporting}
          totalItems={emotes.length}
        />

      </div>
    </div>
  );
}

export default App;
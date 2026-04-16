import React, { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import Header from './components/layout/Header';
import SidebarLeft from './components/workspace/SidebarLeft';
import CanvasArea from './components/workspace/CanvasArea';
import SidebarRight from './components/workspace/SidebarRight';

function App() {
  const [theme, setTheme] = useState('dark');
  const fileInputRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);

  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [targetColor, setTargetColor] = useState(null);
  const [tolerance, setTolerance] = useState(30);
  const [isAutoOutlineActive, setIsAutoOutlineActive] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert("Por favor sube una imagen válida (PNG, JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setTargetColor(null);
      setIsEyedropperActive(false);
      setIsAutoOutlineActive(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const resetWorkspace = () => {
    setImageSrc(null);
    setProcessedImage(null);
    setTargetColor(null);
    setIsEyedropperActive(false);
    setIsAutoOutlineActive(false);
  };

  const resizeImage = (src, size) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = src;
    });
  };

  const exportToZip = async () => {
    if (!processedImage) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const sizes = [112, 56, 28];

      const emoteFolder = zip.folder("twitch_emotes");

      for (const size of sizes) {
        const base64Data = await resizeImage(processedImage, size);
        emoteFolder.file(`emote_${size}x${size}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });

      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Emotes_Optimizados.zip";
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Hubo un error al generar el archivo ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col font-sans ${theme === 'dark' ? 'bg-[#0e0e10] text-white' : 'bg-gray-100 text-gray-900'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileInput} accept="image/png, image/jpeg" className="hidden" />

      <Header theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      <div className="flex-1 flex overflow-hidden">

        <SidebarLeft
          theme={theme}
          hasImage={!!imageSrc}
          onUploadClick={triggerUpload}
          isEyedropperActive={isEyedropperActive}
          onEyedropperToggle={() => setIsEyedropperActive(!isEyedropperActive)}
          tolerance={tolerance}
          onToleranceChange={setTolerance}
          isAutoOutlineActive={isAutoOutlineActive}
          onAutoOutlineToggle={() => setIsAutoOutlineActive(!isAutoOutlineActive)}
        />

        <CanvasArea
          theme={theme}
          imageSrc={imageSrc}
          onImageRemove={resetWorkspace}
          onUploadClick={triggerUpload}
          onFileDrop={processFile}
          isEyedropperActive={isEyedropperActive}
          onColorPicked={(color) => { setTargetColor(color); }}
          targetColor={targetColor}
          tolerance={tolerance}
          isAutoOutlineActive={isAutoOutlineActive}
          onProcessed={setProcessedImage}
        />

        <SidebarRight
          theme={theme}
          processedImage={processedImage}
          onExport={exportToZip}
          isExporting={isExporting}
        />

      </div>
    </div>
  );
}

export default App;
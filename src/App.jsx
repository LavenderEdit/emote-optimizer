import React, { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Header from './components/layout/Header';
import SidebarLeft from './components/workspace/SidebarLeft';
import CanvasArea from './components/workspace/CanvasArea';
import SidebarRight from './components/workspace/SidebarRight';
import { useEmoteBatch } from './hooks/useEmoteBatch';

function App() {
  const {
    theme, setTheme,
    fileInputRef,
    emotes,
    activeId, setActiveId,
    activeEmote, updateActiveEmote,
    isEyedropperActive, setIsEyedropperActive,
    isExporting,
    processFiles, handleFileInput, triggerUpload,
    handleRemoveActive, saveToHistory, undo, exportToZip
  } = useEmoteBatch();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') undo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen w-full flex flex-col font-sans ${isDark ? 'bg-[#3d0604] text-[#deb069]' : 'bg-gray-100 text-gray-900'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileInput} accept="image/png, image/jpeg, image/webp" multiple className="hidden" />

      <Header theme={theme} toggleTheme={() => setTheme(isDark ? 'light' : 'dark')} />

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
          adjustments={activeEmote?.adjustments}
          onAdjustmentsChange={(adjustments) => updateActiveEmote({ adjustments })}
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
            adjustments={activeEmote?.adjustments}
            erasurePoints={activeEmote?.erasurePoints || []}
            setErasurePoints={(updater) => updateActiveEmote({ erasurePoints: typeof updater === 'function' ? updater(activeEmote.erasurePoints) : updater })}
            restorePoints={activeEmote?.restorePoints || []}
            setRestorePoints={(updater) => updateActiveEmote({ restorePoints: typeof updater === 'function' ? updater(activeEmote.restorePoints) : updater })}
            onProcessed={(src) => updateActiveEmote({ processedSrc: src })}
            saveToHistory={saveToHistory}
          />

          {emotes.length > 0 && (
            <div className={`h-28 border-t flex items-center px-6 gap-4 overflow-x-auto ${isDark ? 'bg-[#3d2304] border-[#7f6000]' : 'bg-white border-gray-300'}`}>
              {emotes.map(emote => (
                <div
                  key={emote.id}
                  onClick={() => setActiveId(emote.id)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg cursor-pointer transition-all ${emote.id === activeId
                      ? (isDark ? 'ring-2 ring-[#c41026] shadow-lg shadow-[#c41026]/30' : 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30')
                      : (isDark ? 'opacity-60 hover:opacity-100 ring-1 ring-[#7f6000]' : 'opacity-60 hover:opacity-100 ring-1 ring-gray-500')
                    }`}
                >
                  <img src={emote.processedSrc || emote.originalSrc} alt={emote.name} className="w-full h-full object-cover rounded-md" />
                  {emote.id === activeId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveActive(); }}
                      className={`absolute -top-2 -right-2 text-white rounded-full p-0.5 transition-colors ${isDark ? 'bg-[#c41026] hover:bg-[#a00d1e]' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={triggerUpload}
                className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDark ? 'border-[#7f6000] hover:border-[#deb069] text-[#7f6000] hover:text-[#deb069]' : 'border-gray-300 hover:border-gray-500 text-gray-400'
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
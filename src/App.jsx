import React, { useEffect } from 'react';
import { CheckSquare, Plus, Square, X } from 'lucide-react';
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
    assets,
    activeId, setActiveId,
    selectedEmoteIds, toggleEmoteSelection, selectAllEmotes, selectNoEmotes, invertEmoteSelection, selectWarningEmotes,
    activeEmote, activeAsset, activePreviewUrl, updateActiveEmote, updateSelectedOrActiveEmotes, updateActivePreview,
    copyActiveSettings, pasteSettingsToSelected, applyActiveSettingsToSelected, settingsClipboard,
    trimSelectedEmotes, isTrimmingBatch,
    applyBackgroundRemovalV2, updateBackgroundRemovalV2Params, resetBackgroundRemovalV2, removeBackgroundRemovalV2, applyBackgroundRemovalV2Params, isApplyingBackgroundV2,
    comparisonMode, setComparisonMode,
    exportOptions, updateExportOptions, exportState, prepareExport, cancelExport, retryExport, downloadPreparedExport, downloadActivePng,
    gridDraft, updateGridDraft, closeGridDraft, generateGridEmotes, detectGridAutomatically, isGeneratingGrid, isDetectingGrid,
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
          onUploadClick={() => triggerUpload('individual')}
          onGridUploadClick={() => triggerUpload('grid')}
          isEyedropperActive={isEyedropperActive}
          onEyedropperToggle={() => setIsEyedropperActive(!isEyedropperActive)}
          tolerance={activeEmote?.tolerance || 30}
          onToleranceChange={(val) => updateSelectedOrActiveEmotes({ tolerance: val })}
          isAutoOutlineActive={activeEmote?.isAutoOutlineActive || false}
          onAutoOutlineToggle={() => updateSelectedOrActiveEmotes({ isAutoOutlineActive: !activeEmote?.isAutoOutlineActive })}
          adjustments={activeEmote?.adjustments}
          onAdjustmentsChange={(adjustments) => updateSelectedOrActiveEmotes({ adjustments })}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <CanvasArea
            theme={theme}
            emote={activeEmote}
            asset={activeAsset}
            onImageRemove={handleRemoveActive}
            onUploadClick={() => triggerUpload('individual')}
            onGridUploadClick={() => triggerUpload('grid')}
            onFileDrop={(file) => processFiles([file])}
            gridDraft={gridDraft}
            onGridDraftChange={updateGridDraft}
            onGridGenerate={generateGridEmotes}
            onGridAutoDetect={detectGridAutomatically}
            onGridCancel={closeGridDraft}
            isGeneratingGrid={isGeneratingGrid}
            isDetectingGrid={isDetectingGrid}
            comparisonMode={comparisonMode}
            isEyedropperActive={isEyedropperActive}
            setErasurePoints={(updater) => updateActiveEmote({ erasurePoints: typeof updater === 'function' ? updater(activeEmote?.erasurePoints || []) : updater })}
            setRestorePoints={(updater) => updateActiveEmote({ restorePoints: typeof updater === 'function' ? updater(activeEmote?.restorePoints || []) : updater })}
            onPreviewReady={updateActivePreview}
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
                  <DocumentThumbnail emote={emote} asset={assets[emote.sourceId]} />
                  <button
                    type="button"
                    aria-label={`Seleccionar ${emote.name}`}
                    onClick={(e) => { e.stopPropagation(); toggleEmoteSelection(emote.id); }}
                    className={`absolute bottom-1 left-1 rounded p-0.5 ${selectedEmoteIds.includes(emote.id)
                        ? (isDark ? 'bg-[#c41026] text-white' : 'bg-purple-600 text-white')
                        : (isDark ? 'bg-black/60 text-[#deb069]' : 'bg-white/90 text-gray-700')
                      }`}
                  >
                    {selectedEmoteIds.includes(emote.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                  </button>
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
                onClick={() => triggerUpload('individual')}
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
          activeEmote={activeEmote}
          processedImage={activePreviewUrl}
          onExport={exportToZip}
          isExporting={isExporting}
          totalItems={emotes.length}
          selectedCount={selectedEmoteIds.length}
          exportOptions={exportOptions}
          exportState={exportState}
          onExportOptionsChange={updateExportOptions}
          onPrepareExport={prepareExport}
          onCancelExport={cancelExport}
          onRetryExport={retryExport}
          onDownloadPreparedExport={downloadPreparedExport}
          onDownloadActivePng={downloadActivePng}
          hasSettingsClipboard={!!settingsClipboard}
          comparisonMode={comparisonMode}
          onComparisonModeChange={setComparisonMode}
          onSelectAll={selectAllEmotes}
          onSelectNone={selectNoEmotes}
          onSelectInvert={invertEmoteSelection}
          onSelectWarnings={selectWarningEmotes}
          onUpdateTargets={updateSelectedOrActiveEmotes}
          onCopySettings={copyActiveSettings}
          onPasteSettings={pasteSettingsToSelected}
          onApplyActiveSettings={applyActiveSettingsToSelected}
          onTrimSelected={trimSelectedEmotes}
          isTrimmingBatch={isTrimmingBatch}
          onApplyBackgroundV2={applyBackgroundRemovalV2}
          onUpdateBackgroundV2Params={updateBackgroundRemovalV2Params}
          onResetBackgroundV2={resetBackgroundRemovalV2}
          onRemoveBackgroundV2={removeBackgroundRemovalV2}
          onApplyBackgroundV2Params={applyBackgroundRemovalV2Params}
          isApplyingBackgroundV2={isApplyingBackgroundV2}
        />

      </div>
    </div>
  );
}

function DocumentThumbnail({ emote, asset }) {
  if (!asset) {
    return <div className="h-full w-full rounded-md bg-black/20" />;
  }

  const crop = emote.cropRect || { x: 0, y: 0, width: asset.width, height: asset.height };
  const size = 64;
  const scale = Math.min(size / crop.width, size / crop.height);
  const width = Math.max(1, crop.width * scale);
  const height = Math.max(1, crop.height * scale);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-black/20">
      <div
        aria-label={emote.name}
        className="bg-no-repeat"
        style={{
          width,
          height,
          backgroundImage: `url("${asset.objectUrl}")`,
          backgroundSize: `${asset.width * scale}px ${asset.height * scale}px`,
          backgroundPosition: `${-crop.x * scale}px ${-crop.y * scale}px`,
        }}
      />
    </div>
  );
}

export default App;


import React, { useEffect } from 'react';
import Header from './components/layout/Header';
import SidebarLeft from './components/workspace/SidebarLeft';
import CanvasArea from './components/workspace/CanvasArea';
import SidebarRight from './components/workspace/SidebarRight';
import VirtualizedEmoteStrip from './components/workspace/VirtualizedEmoteStrip';
import { useEmoteBatch } from './hooks/useEmoteBatch';

function App() {
  const {
    theme, setTheme,
    fileInputRef,
    emotes,
    assets,
    activeId, setActiveId,
    selectedEmoteIds, toggleEmoteSelection, selectAllEmotes, selectNoEmotes, invertEmoteSelection, selectWarningEmotes,
    activeEmote, activeAsset, activePreviewUrl, activeMetrics, updateActiveEmote, updateSelectedOrActiveEmotes, updateActivePreview, updateActiveMetrics,
    copyActiveSettings, pasteSettingsToSelected, applyActiveSettingsToSelected, createVariantFromActive, settingsClipboard,
    trimSelectedEmotes, isTrimmingBatch,
    applyBackgroundRemovalV2, updateBackgroundRemovalV2Params, resetBackgroundRemovalV2, removeBackgroundRemovalV2, applyBackgroundRemovalV2Params, isApplyingBackgroundV2,
    comparisonMode, setComparisonMode,
    projectPersistence,
    performanceStats,
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

      <Header theme={theme} toggleTheme={() => setTheme(isDark ? 'light' : 'dark')} projectPersistence={projectPersistence} />

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
            onMetricsReady={updateActiveMetrics}
            saveToHistory={saveToHistory}
          />

          {emotes.length > 0 && (
            <VirtualizedEmoteStrip
              theme={theme}
              emotes={emotes}
              assets={assets}
              activeId={activeId}
              selectedEmoteIds={selectedEmoteIds}
              onActivate={setActiveId}
              onToggleSelection={toggleEmoteSelection}
              onRemoveActive={handleRemoveActive}
              onUploadClick={() => triggerUpload('individual')}
            />
          )}
        </div>

        <SidebarRight
          theme={theme}
          activeEmote={activeEmote}
          processedImage={activePreviewUrl}
          activeMetrics={activeMetrics}
          performanceStats={performanceStats}
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
          onCreateVariant={createVariantFromActive}
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

export default App;


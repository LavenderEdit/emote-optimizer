import React from 'react';
import { THEME_STYLES } from '../../constants/CanvasStyles';
import { useImageProcessor } from '../../hooks/useImageProcessor';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EmptyDropzone from './EmptyDropzone';
import ActiveCanvas from './ActiveCanvas';
import GridImportWorkspace from '../../features/grid-import/components/GridImportWorkspace';

export default function CanvasArea({
    theme,
    emote,
    asset,
    onImageRemove,
    onUploadClick,
    onGridUploadClick,
    onFileDrop,
    gridDraft,
    hasHiddenGridDraft,
    onShowGridDraft,
    onGridDraftChange,
    onGridGenerate,
    onGridAutoDetect,
    onGridCancel,
    isGeneratingGrid,
    isDetectingGrid,
    comparisonMode,
    isEyedropperActive,
    setErasurePoints,
    setRestorePoints,
    onPreviewReady,
    onMetricsReady,
    saveToHistory
}) {
    const isDark = theme === 'dark';
    const currentStyles = isDark ? THEME_STYLES.dark : THEME_STYLES.light;

    const { canvasRef } = useImageProcessor({
        emote,
        asset,
        onPreviewReady,
        onMetricsReady,
        comparisonMode,
    });

    const { isDragging, dragHandlers } = useDragAndDrop(onFileDrop);

    const { isRestoring, mouseHandlers } = useCanvasInteraction({
        canvasRef, isEyedropperActive, setErasurePoints, setRestorePoints, saveToHistory
    });

    const dragBgClass = isDragging ? (isDark ? 'bg-[#c41026]/10' : 'bg-purple-500/10') : '';

    return (
        <div
            className={`relative flex min-h-0 flex-1 transition-all duration-200 ${gridDraft ? 'items-stretch justify-start overflow-hidden p-3 sm:p-4' : 'items-center justify-center p-8'} ${dragBgClass}`}
            {...dragHandlers}
        >
            {gridDraft ? (
                <GridImportWorkspace
                    draft={gridDraft}
                    theme={theme}
                    onDraftChange={onGridDraftChange}
                    onGenerate={onGridGenerate}
                    onAutoDetect={onGridAutoDetect}
                    onCancel={onGridCancel}
                    isGenerating={isGeneratingGrid}
                    isDetecting={isDetectingGrid}
                />
            ) : !emote || !asset ? (
                <EmptyDropzone
                    currentStyles={currentStyles}
                    onUploadClick={onUploadClick}
                    onGridUploadClick={onGridUploadClick}
                />
            ) : (
                <>
                    <ActiveCanvas
                        canvasRef={canvasRef}
                        currentStyles={currentStyles}
                        isDark={isDark}
                        isEyedropperActive={isEyedropperActive}
                        isRestoring={isRestoring}
                        onImageRemove={onImageRemove}
                        mouseHandlers={mouseHandlers}
                    />
                    {hasHiddenGridDraft && (
                        <button
                            type="button"
                            data-testid="show-grid-editor"
                            onClick={onShowGridDraft}
                            className={`absolute left-4 top-4 rounded border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${isDark
                                ? 'border-[#7f6000]/60 bg-[#3d2304] text-[#deb069] hover:bg-[#7f6000]/20'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Volver al grid
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

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
                <ActiveCanvas
                    canvasRef={canvasRef}
                    currentStyles={currentStyles}
                    isDark={isDark}
                    isEyedropperActive={isEyedropperActive}
                    isRestoring={isRestoring}
                    onImageRemove={onImageRemove}
                    mouseHandlers={mouseHandlers}
                />
            )}
        </div>
    );
}

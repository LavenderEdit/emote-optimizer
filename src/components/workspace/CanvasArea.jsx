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
    imageSrc,
    onImageRemove,
    onUploadClick,
    onGridUploadClick,
    onFileDrop,
    gridDraft,
    onGridDraftChange,
    onGridGenerate,
    onGridCancel,
    isGeneratingGrid,
    isEyedropperActive,
    tolerance,
    isAutoOutlineActive,
    adjustments,
    onProcessed,
    erasurePoints,
    setErasurePoints,
    restorePoints,
    setRestorePoints,
    saveToHistory
}) {
    const isDark = theme === 'dark';
    const currentStyles = isDark ? THEME_STYLES.dark : THEME_STYLES.light;

    const { canvasRef } = useImageProcessor({
        imageSrc, erasurePoints, restorePoints, tolerance, isAutoOutlineActive, adjustments, onProcessed
    });

    const { isDragging, dragHandlers } = useDragAndDrop(onFileDrop);

    const { isRestoring, mouseHandlers } = useCanvasInteraction({
        canvasRef, isEyedropperActive, setErasurePoints, setRestorePoints, saveToHistory
    });

    const dragBgClass = isDragging ? (isDark ? 'bg-[#c41026]/10' : 'bg-purple-500/10') : '';

    return (
        <div
            className={`flex-1 relative flex items-center justify-center p-8 transition-all duration-200 ${dragBgClass}`}
            {...dragHandlers}
        >
            {gridDraft ? (
                <GridImportWorkspace
                    draft={gridDraft}
                    theme={theme}
                    onDraftChange={onGridDraftChange}
                    onGenerate={onGridGenerate}
                    onCancel={onGridCancel}
                    isGenerating={isGeneratingGrid}
                />
            ) : !imageSrc ? (
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

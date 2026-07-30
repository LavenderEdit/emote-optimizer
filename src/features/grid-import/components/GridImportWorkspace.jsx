import React, { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Columns3, CopyPlus, GitMerge, Grid2X2, MousePointer2, Redo2, RotateCcw, Rows3, ScanSearch, Scissors, SplitSquareHorizontal, SplitSquareVertical, Undo2, X } from 'lucide-react';
import { rebuildDraftFromBands, rebuildDraftFromSettings, updateDraftCell } from '../gridSegmentation/gridDraft';
import { updateBandEdge } from '../gridSegmentation/createUniformGrid';
import { getCellGenerationKey } from '../gridSegmentation/extractGridCells';
import {
    addFreeRegion,
    addGuide,
    editCellRect,
    mergeAdjacentCells,
    nudgeGuide,
    redoDraft,
    removeGuide,
    reorderCells,
    splitCell,
    undoDraft,
} from '../gridSegmentation/advancedGridEditing';

export default function GridImportWorkspace({
    draft,
    theme,
    onDraftChange,
    onGenerate,
    onAutoDetect,
    onCancel,
    isGenerating,
    isDetecting,
}) {
    const isDark = theme === 'dark';
    const [selectedCellId, setSelectedCellId] = useState(draft.cells[0]?.id || null);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const activeCount = draft.cells.filter((cell) => cell.enabled && !cell.empty).length;
    const pendingCount = draft.cells.filter((cell) => (
        cell.enabled &&
        !cell.empty &&
        (draft.generatedCellKeys || {})[cell.id] !== getCellGenerationKey(cell)
    )).length;

    const updateSettings = (updates) => {
        onDraftChange((current) => rebuildDraftFromSettings(current, updates));
    };

    const applyAdvancedEdit = (updater) => {
        onDraftChange((current) => updater(current));
    };

    const updateMargins = (side, value) => {
        updateSettings({
            margins: {
                ...draft.settings.margins,
                [side]: value,
            },
        });
    };

    const updateCell = (cellId, updates) => {
        onDraftChange((current) => updateDraftCell(current, cellId, updates));
    };

    const resetGuides = () => {
        onDraftChange((current) => rebuildDraftFromSettings(current, current.settings));
    };

    const markLastCellEmpty = () => {
        const lastCell = draft.cells[draft.cells.length - 1];
        if (!lastCell) return;
        updateCell(lastCell.id, { empty: true, enabled: false });
    };

    return (
        <div className={`h-full w-full overflow-hidden p-4 ${isDark ? 'text-[#deb069]' : 'text-gray-900'}`}>
            <div className="grid h-full grid-cols-[minmax(0,1fr)_360px] gap-4">
                <section className={`min-h-0 rounded-lg border p-4 ${isDark ? 'border-[#7f6000]/50 bg-[#3d2304]' : 'border-gray-300 bg-white'}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                                <Grid2X2 size={16} />
                                Grid manual
                            </div>
                            <p className={`mt-1 text-xs ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                                {draft.source.fileName} - {draft.source.width} x {draft.source.height}px
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onAutoDetect}
                                disabled={isDetecting}
                                className={secondaryButtonClass(isDark)}
                                title="Detectar automaticamente filas, columnas y celdas vacias"
                            >
                                <ScanSearch size={16} />
                                {isDetecting ? 'Detectando...' : 'Detectar automaticamente'}
                            </button>
                            <button
                                type="button"
                                onClick={resetGuides}
                                className={secondaryButtonClass(isDark)}
                                title="Restablecer guias desde los controles"
                            >
                                <RotateCcw size={16} />
                                Restablecer
                            </button>
                            <button
                                type="button"
                                onClick={onCancel}
                                className={secondaryButtonClass(isDark)}
                                title="Cerrar editor de grid"
                            >
                                <X size={16} />
                                Cerrar
                            </button>
                        </div>
                    </div>

                    <div className={`mb-3 flex items-center gap-2 rounded border px-3 py-2 text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
                        <MousePointer2 size={14} />
                        Arrastra las lineas del overlay para ajustar cada guia. Haz clic en una celda para activarla o desactivarla.
                    </div>

                    <GridOverlay
                        draft={draft}
                        isDark={isDark}
                        onDraftChange={onDraftChange}
                        selectedCellId={selectedCellId}
                        onSelectCell={setSelectedCellId}
                        selectedGuide={selectedGuide}
                        onSelectGuide={setSelectedGuide}
                        onNudgeGuide={(delta) => applyAdvancedEdit((current) => nudgeGuide(current, selectedGuide, delta))}
                    />
                </section>

                <aside className={`min-h-0 overflow-y-auto rounded-lg border p-4 ${isDark ? 'border-[#7f6000]/50 bg-[#3d2304]' : 'border-gray-300 bg-white'}`}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Configurar grid</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Filas" min={1} max={20} value={draft.settings.rows} onChange={(value) => updateSettings({ rows: value })} isDark={isDark} />
                        <NumberField label="Columnas" min={1} max={20} value={draft.settings.columns} onChange={(value) => updateSettings({ columns: value })} isDark={isDark} />
                        <NumberField label="Margen sup." min={0} max={draft.source.height} value={draft.settings.margins.top} onChange={(value) => updateMargins('top', value)} isDark={isDark} />
                        <NumberField label="Margen inf." min={0} max={draft.source.height} value={draft.settings.margins.bottom} onChange={(value) => updateMargins('bottom', value)} isDark={isDark} />
                        <NumberField label="Margen izq." min={0} max={draft.source.width} value={draft.settings.margins.left} onChange={(value) => updateMargins('left', value)} isDark={isDark} />
                        <NumberField label="Margen der." min={0} max={draft.source.width} value={draft.settings.margins.right} onChange={(value) => updateMargins('right', value)} isDark={isDark} />
                        <NumberField label="Gutter H" min={0} max={draft.source.width} value={draft.settings.horizontalGap} onChange={(value) => updateSettings({ horizontalGap: value })} isDark={isDark} />
                        <NumberField label="Gutter V" min={0} max={draft.source.height} value={draft.settings.verticalGap} onChange={(value) => updateSettings({ verticalGap: value })} isDark={isDark} />
                        <NumberField label="Inset" min={0} max={200} value={draft.settings.inset} onChange={(value) => updateSettings({ inset: value })} isDark={isDark} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => undoDraft(current))}>
                            <Undo2 size={14} /> Undo grid
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => redoDraft(current))}>
                            <Redo2 size={14} /> Redo grid
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => addGuide(current, 'row'))}>
                            <Rows3 size={14} /> Agregar fila
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => addGuide(current, 'column'))}>
                            <Columns3 size={14} /> Agregar col.
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => removeGuide(current, 'row'))}>
                            Quitar fila
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => removeGuide(current, 'column'))}>
                            Quitar col.
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={() => applyAdvancedEdit((current) => addFreeRegion(current))}>
                            <CopyPlus size={14} /> Region libre
                        </button>
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={markLastCellEmpty}>
                            Ultima vacia
                        </button>
                        <div className={`rounded border px-3 py-2 text-center text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
                            {activeCount} activos / {pendingCount} pendientes
                        </div>
                    </div>

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={onGenerate}
                            disabled={pendingCount === 0 || isGenerating}
                            className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${pendingCount > 0 && !isGenerating
                                ? isDark
                                    ? 'bg-[#c41026] text-white hover:bg-[#a00d1e]'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                : isDark
                                    ? 'cursor-not-allowed border border-[#7f6000]/40 bg-black/20 text-[#deb069]/40'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                                }`}
                        >
                            <Scissors size={16} />
                            {isGenerating ? 'Generando...' : `Generar ${pendingCount} recortes`}
                        </button>
                    </div>

                    {draft.warnings.length > 0 && (
                        <div className={`mt-4 rounded border px-3 py-2 text-xs ${isDark ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                            {draft.warnings[0]}
                        </div>
                    )}

                    <div className={`mt-3 rounded border px-3 py-2 text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
                        Confianza: {Math.round((draft.confidence ?? 1) * 100)}%
                    </div>

                    <CellReview
                        source={draft.source}
                        cells={draft.cells}
                        selectedCellId={selectedCellId}
                        onSelectCell={setSelectedCellId}
                        isDark={isDark}
                        onUpdateCell={updateCell}
                        onEditRect={(cellId, rect) => applyAdvancedEdit((current) => editCellRect(current, cellId, rect))}
                        onSplitCell={(cellId, direction) => applyAdvancedEdit((current) => splitCell(current, cellId, direction))}
                        onMergeCell={(cellId) => applyAdvancedEdit((current) => mergeAdjacentCells(current, cellId))}
                        onReorderCell={(cellId, direction) => applyAdvancedEdit((current) => reorderCells(current, cellId, direction))}
                    />
                </aside>
            </div>
        </div>
    );
}

function GridOverlay({ draft, isDark, onDraftChange, selectedCellId, onSelectCell, selectedGuide, onSelectGuide, onNudgeGuide }) {
    const [drag, setDrag] = useState(null);

    const getSourcePoint = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * draft.source.width,
            y: ((event.clientY - rect.top) / rect.height) * draft.source.height,
        };
    };

    const handlePointerMove = (event) => {
        if (!drag) return;
        const point = getSourcePoint(event);

        onDraftChange((current) => {
            if (drag.axis === 'x') {
                const columnBands = updateBandEdge(
                    current.columnBands,
                    drag.index,
                    drag.edge,
                    point.x,
                    current.source.width,
                );
                return rebuildDraftFromBands(current, current.rowBands, columnBands);
            }

            const rowBands = updateBandEdge(
                current.rowBands,
                drag.index,
                drag.edge,
                point.y,
                current.source.height,
            );
            return rebuildDraftFromBands(current, rowBands, current.columnBands);
        });
    };

    const stopDrag = (event) => {
        if (drag) event.currentTarget.releasePointerCapture?.(event.pointerId);
        setDrag(null);
    };

    const startDrag = (event, nextDrag) => {
        event.stopPropagation();
        event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
        setDrag(nextDrag);
    };

    const toggleCell = (cellId) => {
        onDraftChange((current) => {
            const cell = current.cells.find((item) => item.id === cellId);
            return updateDraftCell(current, cellId, { enabled: !cell.enabled, empty: cell.enabled ? cell.empty : false });
        });
    };

    return (
        <div
            className={`flex h-[calc(100%-5rem)] min-h-0 items-center justify-center overflow-auto rounded border ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}
            tabIndex={0}
            onKeyDown={(event) => {
                if (!selectedGuide) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    onNudgeGuide(event.shiftKey ? -10 : -1);
                }
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    onNudgeGuide(event.shiftKey ? 10 : 1);
                }
            }}
        >
            <div className="relative inline-block max-h-full max-w-full">
                <img
                    src={draft.source.objectUrl}
                    alt="Grid fuente"
                    className="block max-h-[68vh] max-w-full object-contain"
                />
                <svg
                    className="absolute inset-0 h-full w-full touch-none"
                    viewBox={`0 0 ${draft.source.width} ${draft.source.height}`}
                    preserveAspectRatio="none"
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                >
                    {draft.cells.map((cell) => (
                        <rect
                            key={cell.id}
                            x={cell.sourceRect.x}
                            y={cell.sourceRect.y}
                            width={cell.sourceRect.width}
                            height={cell.sourceRect.height}
                            fill={cell.enabled ? (cell.empty ? 'rgba(250, 204, 21, 0.18)' : 'rgba(34, 197, 94, 0.16)') : 'rgba(239, 68, 68, 0.20)'}
                            stroke={cell.enabled ? (cell.empty ? '#facc15' : '#22c55e') : '#ef4444'}
                            strokeWidth={cell.id === selectedCellId ? Math.max(5, draft.source.width / 230) : Math.max(2, draft.source.width / 500)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Celda fila ${cell.row + 1}, columna ${cell.column + 1}`}
                            onClick={() => {
                                onSelectCell(cell.id);
                                toggleCell(cell.id);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') toggleCell(cell.id);
                            }}
                        />
                    ))}

                    {draft.columnBands.flatMap((band, index) => ([
                        <GuideLine key={`c-${index}-start`} axis="x" value={band.start} sourceSize={draft.source} selected={selectedGuide?.axis === 'x' && selectedGuide.index === index && selectedGuide.edge === 'start'} onPointerDown={(event) => { onSelectGuide({ axis: 'x', index, edge: 'start' }); startDrag(event, { axis: 'x', index, edge: 'start' }); }} />,
                        <GuideLine key={`c-${index}-end`} axis="x" value={band.end} sourceSize={draft.source} selected={selectedGuide?.axis === 'x' && selectedGuide.index === index && selectedGuide.edge === 'end'} onPointerDown={(event) => { onSelectGuide({ axis: 'x', index, edge: 'end' }); startDrag(event, { axis: 'x', index, edge: 'end' }); }} />,
                    ]))}
                    {draft.rowBands.flatMap((band, index) => ([
                        <GuideLine key={`r-${index}-start`} axis="y" value={band.start} sourceSize={draft.source} selected={selectedGuide?.axis === 'y' && selectedGuide.index === index && selectedGuide.edge === 'start'} onPointerDown={(event) => { onSelectGuide({ axis: 'y', index, edge: 'start' }); startDrag(event, { axis: 'y', index, edge: 'start' }); }} />,
                        <GuideLine key={`r-${index}-end`} axis="y" value={band.end} sourceSize={draft.source} selected={selectedGuide?.axis === 'y' && selectedGuide.index === index && selectedGuide.edge === 'end'} onPointerDown={(event) => { onSelectGuide({ axis: 'y', index, edge: 'end' }); startDrag(event, { axis: 'y', index, edge: 'end' }); }} />,
                    ]))}

                    {draft.cells.map((cell) => (
                        <text
                            key={`${cell.id}-label`}
                            x={cell.sourceRect.x + 8}
                            y={cell.sourceRect.y + 22}
                            fill="#111827"
                            stroke="white"
                            strokeWidth="3"
                            paintOrder="stroke"
                            fontSize={Math.max(14, draft.source.width / 70)}
                            fontWeight="700"
                            pointerEvents="none"
                        >
                            {cell.row + 1},{cell.column + 1}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
}

function GuideLine({ axis, value, sourceSize, selected, onPointerDown }) {
    const isX = axis === 'x';
    const hitWidth = Math.max(10, sourceSize.width / 140);
    const visibleWidth = Math.max(2, sourceSize.width / 500);

    return (
        <>
            <line
                x1={isX ? value : 0}
                y1={isX ? 0 : value}
                x2={isX ? value : sourceSize.width}
                y2={isX ? sourceSize.height : value}
                stroke="#ffffff"
                strokeWidth={visibleWidth + 2}
                pointerEvents="none"
            />
            <line
                x1={isX ? value : 0}
                y1={isX ? 0 : value}
                x2={isX ? value : sourceSize.width}
                y2={isX ? sourceSize.height : value}
                stroke={selected ? '#facc15' : '#7c3aed'}
                strokeWidth={selected ? visibleWidth + 2 : visibleWidth}
                pointerEvents="none"
            />
            <line
                x1={isX ? value : 0}
                y1={isX ? 0 : value}
                x2={isX ? value : sourceSize.width}
                y2={isX ? sourceSize.height : value}
                stroke="transparent"
                strokeWidth={hitWidth}
                className={isX ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                onPointerDown={onPointerDown}
            />
        </>
    );
}

function CellReview({ source, cells, selectedCellId, onSelectCell, isDark, onUpdateCell, onEditRect, onSplitCell, onMergeCell, onReorderCell }) {
    return (
        <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Revisar celdas</h3>
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1">
                {cells.map((cell) => (
                    <div
                        key={cell.id}
                        onClick={() => onSelectCell(cell.id)}
                        className={`rounded border p-2 text-xs ${cell.id === selectedCellId
                            ? isDark ? 'border-[#deb069] bg-[#3d0604]' : 'border-purple-500 bg-purple-50'
                            : isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'
                            }`}
                    >
                        <div className="mb-2 flex gap-2">
                            <CellThumbnail source={source} cell={cell} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">Fila {cell.row + 1}, Col {cell.column + 1}</span>
                                    <span className={cell.empty ? 'text-yellow-500' : cell.enabled ? 'text-green-500' : 'text-red-500'}>
                                        {cell.empty ? 'Vacia' : cell.enabled ? 'Activa' : 'Omitida'}
                                    </span>
                                </div>
                                <div className={`mt-1 truncate ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                                    {cell.classification || (cell.empty ? 'empty' : 'content')} - {Math.round((cell.confidence ?? 1) * 100)}%
                                </div>
                            </div>
                        </div>
                        <input
                            value={cell.name}
                            onChange={(event) => onUpdateCell(cell.id, { name: event.target.value })}
                            className={`mb-2 w-full rounded border px-2 py-1 ${isDark ? 'border-[#7f6000]/50 bg-black/20 text-[#deb069]' : 'border-gray-300 bg-white text-gray-900'}`}
                            aria-label={`Nombre de celda ${cell.row + 1}, ${cell.column + 1}`}
                        />
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={cell.enabled}
                                    onChange={(event) => onUpdateCell(cell.id, { enabled: event.target.checked })}
                                />
                                Activa
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={cell.empty}
                                    onChange={(event) => onUpdateCell(cell.id, { empty: event.target.checked, enabled: event.target.checked ? false : cell.enabled })}
                                />
                                Vacia
                            </label>
                        </div>
                        {cell.id === selectedCellId && (
                            <CellRectTools
                                cell={cell}
                                isDark={isDark}
                                onEditRect={(rect) => onEditRect(cell.id, rect)}
                                onSplitCell={(direction) => onSplitCell(cell.id, direction)}
                                onMergeCell={() => onMergeCell(cell.id)}
                                onReorderCell={(direction) => onReorderCell(cell.id, direction)}
                            />
                        )}
                        <CellWarnings cell={cell} isDark={isDark} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function CellRectTools({ cell, isDark, onEditRect, onSplitCell, onMergeCell, onReorderCell }) {
    const rect = cell.contentRect || cell.sourceRect;
    const updateRect = (key, value) => onEditRect({ ...rect, [key]: value });

    return (
        <div className="mt-2 space-y-2">
            <div className="grid grid-cols-4 gap-1">
                {['x', 'y', 'width', 'height'].map((key) => (
                    <label key={key} className="block">
                        <span className={`mb-0.5 block text-[10px] uppercase ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>{key}</span>
                        <input
                            type="number"
                            value={Math.round(rect[key])}
                            onChange={(event) => updateRect(key, Number(event.target.value))}
                            className={`w-full rounded border px-1 py-1 ${isDark ? 'border-[#7f6000]/50 bg-black/20 text-[#deb069]' : 'border-gray-300 bg-white text-gray-900'}`}
                        />
                    </label>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
                <button type="button" className={secondaryButtonClass(isDark)} onClick={() => onSplitCell('horizontal')}><SplitSquareHorizontal size={13} /> Split H</button>
                <button type="button" className={secondaryButtonClass(isDark)} onClick={() => onSplitCell('vertical')}><SplitSquareVertical size={13} /> Split V</button>
                <button type="button" className={secondaryButtonClass(isDark)} onClick={onMergeCell}><GitMerge size={13} /> Fusionar</button>
                <button type="button" className={secondaryButtonClass(isDark)} onClick={() => onReorderCell('up')}><ArrowUp size={13} /> Subir</button>
                <button type="button" className={secondaryButtonClass(isDark)} onClick={() => onReorderCell('down')}><ArrowDown size={13} /> Bajar</button>
            </div>
        </div>
    );
}

function CellThumbnail({ source, cell }) {
    const crop = cell.contentRect || cell.sourceRect;
    const size = 52;
    const scale = Math.min(size / crop.width, size / crop.height);

    return (
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded border border-black/10 bg-white">
            <div
                className="bg-no-repeat"
                style={{
                    width: Math.max(1, crop.width * scale),
                    height: Math.max(1, crop.height * scale),
                    backgroundImage: `url("${source.objectUrl}")`,
                    backgroundSize: `${source.width * scale}px ${source.height * scale}px`,
                    backgroundPosition: `${-crop.x * scale}px ${-crop.y * scale}px`,
                }}
            />
        </div>
    );
}

function CellWarnings({ cell, isDark }) {
    const warnings = getCellWarnings(cell);
    if (warnings.length === 0) return null;

    return (
        <div className={`mt-2 space-y-1 rounded border px-2 py-1 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
            {warnings.map((warning) => (
                <div key={warning} className="flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{warning}</span>
                </div>
            ))}
        </div>
    );
}

function getCellWarnings(cell) {
    const warnings = [
        ...(cell.errors || []).map((error) => `Error: ${error}`),
        ...(cell.warnings || []),
    ];
    if (cell.empty) warnings.push('No se exportara mientras este marcada como vacia.');
    if (cell.classification === 'uncertain') warnings.push('Clasificacion dudosa: revisa antes de generar.');
    if (cell.contentRect.width < 16 || cell.contentRect.height < 16) warnings.push('Recorte demasiado pequeno.');
    return [...new Set(warnings)];
}

function NumberField({ label, min, max, value, onChange, isDark }) {
    return (
        <label className="block text-xs">
            <span className={`mb-1 block font-semibold ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={`w-full rounded border px-2 py-1.5 ${isDark ? 'border-[#7f6000]/50 bg-black/20 text-[#deb069]' : 'border-gray-300 bg-white text-gray-900'}`}
            />
        </label>
    );
}

function secondaryButtonClass(isDark) {
    return `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${isDark
        ? 'border-[#7f6000]/50 bg-[#3d0604] text-[#deb069] hover:bg-[#7f6000]/20'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
        }`;
}

import React, { useState } from 'react';
import { Check, Grid2X2, MousePointer2, RotateCcw, Scissors, X } from 'lucide-react';
import { rebuildDraftFromBands, rebuildDraftFromSettings, updateDraftCell } from '../gridSegmentation/gridDraft';
import { updateBandEdge } from '../gridSegmentation/createUniformGrid';

export default function GridImportWorkspace({
    draft,
    theme,
    onDraftChange,
    onGenerate,
    onCancel,
    isGenerating,
}) {
    const isDark = theme === 'dark';
    const activeCount = draft.cells.filter((cell) => cell.enabled && !cell.empty).length;

    const updateSettings = (updates) => {
        onDraftChange((current) => rebuildDraftFromSettings(current, updates));
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
                        <button type="button" className={secondaryButtonClass(isDark)} onClick={markLastCellEmpty}>
                            Ultima vacia
                        </button>
                        <div className={`rounded border px-3 py-2 text-center text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
                            {activeCount} recortes activos
                        </div>
                    </div>

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={onGenerate}
                            disabled={activeCount === 0 || isGenerating}
                            className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${activeCount > 0 && !isGenerating
                                ? isDark
                                    ? 'bg-[#c41026] text-white hover:bg-[#a00d1e]'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                : isDark
                                    ? 'cursor-not-allowed border border-[#7f6000]/40 bg-black/20 text-[#deb069]/40'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                                }`}
                        >
                            <Scissors size={16} />
                            {isGenerating ? 'Generando...' : `Generar ${activeCount} recortes`}
                        </button>
                    </div>

                    {draft.warnings.length > 0 && (
                        <div className={`mt-4 rounded border px-3 py-2 text-xs ${isDark ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                            {draft.warnings[0]}
                        </div>
                    )}

                    <CellReview
                        cells={draft.cells}
                        isDark={isDark}
                        onUpdateCell={updateCell}
                    />
                </aside>
            </div>
        </div>
    );
}

function GridOverlay({ draft, isDark, onDraftChange }) {
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
        <div className={`flex h-[calc(100%-5rem)] min-h-0 items-center justify-center overflow-auto rounded border ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
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
                            strokeWidth={Math.max(2, draft.source.width / 500)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Celda fila ${cell.row + 1}, columna ${cell.column + 1}`}
                            onClick={() => toggleCell(cell.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') toggleCell(cell.id);
                            }}
                        />
                    ))}

                    {draft.columnBands.flatMap((band, index) => ([
                        <GuideLine key={`c-${index}-start`} axis="x" value={band.start} sourceSize={draft.source} onPointerDown={(event) => startDrag(event, { axis: 'x', index, edge: 'start' })} />,
                        <GuideLine key={`c-${index}-end`} axis="x" value={band.end} sourceSize={draft.source} onPointerDown={(event) => startDrag(event, { axis: 'x', index, edge: 'end' })} />,
                    ]))}
                    {draft.rowBands.flatMap((band, index) => ([
                        <GuideLine key={`r-${index}-start`} axis="y" value={band.start} sourceSize={draft.source} onPointerDown={(event) => startDrag(event, { axis: 'y', index, edge: 'start' })} />,
                        <GuideLine key={`r-${index}-end`} axis="y" value={band.end} sourceSize={draft.source} onPointerDown={(event) => startDrag(event, { axis: 'y', index, edge: 'end' })} />,
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

function GuideLine({ axis, value, sourceSize, onPointerDown }) {
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
                stroke="#7c3aed"
                strokeWidth={visibleWidth}
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

function CellReview({ cells, isDark, onUpdateCell }) {
    return (
        <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Revisar celdas</h3>
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1">
                {cells.map((cell) => (
                    <div
                        key={cell.id}
                        className={`rounded border p-2 text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-semibold">Fila {cell.row + 1}, Col {cell.column + 1}</span>
                            <span className={cell.empty ? 'text-yellow-500' : cell.enabled ? 'text-green-500' : 'text-red-500'}>
                                {cell.empty ? 'Vacia' : cell.enabled ? 'Activa' : 'Omitida'}
                            </span>
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
                    </div>
                ))}
            </div>
        </div>
    );
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

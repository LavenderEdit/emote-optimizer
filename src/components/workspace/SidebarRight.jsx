import React from 'react';
import { Copy, Download, Eye, EyeOff, Loader2, Scissors, Wand2 } from 'lucide-react';
import PreviewBox from '../ui/PreviewBox';
import ChatSimulator from '../ui/ChatSimulator';

export default function SidebarRight({
    theme,
    activeEmote,
    processedImage,
    onExport,
    isExporting,
    totalItems,
    selectedCount,
    exportOptions,
    exportState,
    onExportOptionsChange,
    onPrepareExport,
    onCancelExport,
    onRetryExport,
    onDownloadPreparedExport,
    onDownloadActivePng,
    hasSettingsClipboard,
    comparisonMode,
    onComparisonModeChange,
    onSelectAll,
    onSelectNone,
    onSelectInvert,
    onSelectWarnings,
    onUpdateTargets,
    onCopySettings,
    onPasteSettings,
    onApplyActiveSettings,
    onTrimSelected,
    isTrimmingBatch,
    onApplyBackgroundV2,
    onUpdateBackgroundV2Params,
    onResetBackgroundV2,
    onRemoveBackgroundV2,
    onApplyBackgroundV2Params,
    isApplyingBackgroundV2,
}) {
    const isDark = theme === 'dark';
    const buttonClass = isDark
        ? 'rounded border border-[#7f6000]/50 bg-[#3d0604] px-2 py-1.5 text-xs text-[#deb069] transition-colors hover:border-[#deb069] disabled:opacity-40'
        : 'rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 transition-colors hover:border-purple-500 disabled:opacity-40';
    const activeButtonClass = isDark
        ? 'rounded border border-[#c41026] bg-[#c41026] px-2 py-1.5 text-xs text-white'
        : 'rounded border border-purple-600 bg-purple-600 px-2 py-1.5 text-xs text-white';
    const targetLabel = selectedCount > 0 ? `${selectedCount} seleccionados` : 'Activo';
    const frame = activeEmote?.frame || { zoom: 1, offsetX: 0, offsetY: 0 };
    const paddingPercent = Math.round((activeEmote?.padding || 0) * 100);
    const offsetXPercent = Math.round((frame.offsetX || 0) * 100);
    const offsetYPercent = Math.round((frame.offsetY || 0) * 100);
    const removedPercent = activeEmote?.backgroundRemoval?.version === 2
        ? Math.round((activeEmote.backgroundRemoval.removedRatio || 0) * 100)
        : null;
    const backgroundV2 = {
        tolerance: activeEmote?.backgroundRemoval?.tolerance ?? activeEmote?.tolerance ?? 34,
        feather: activeEmote?.backgroundRemoval?.feather ?? 1,
        despill: activeEmote?.backgroundRemoval?.despill ?? 0.75,
        brushRadius: activeEmote?.backgroundRemoval?.brushRadius ?? 10,
        excessiveRemovalThreshold: activeEmote?.backgroundRemoval?.excessiveRemovalThreshold ?? 0.72,
    };
    const canDownloadPrepared = exportState?.downloadUrl && (exportState.status === 'valid' || exportState.status === 'invalid');

    return (
        <aside className={`w-80 flex flex-col border-l ${isDark ? 'border-[#7f6000] bg-[#3d2304] text-[#deb069]' : 'border-gray-300 bg-white text-gray-800'}`}>
            <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
                <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Twitch Preview
                </h3>

                <div className={`rounded p-4 mb-6 flex flex-col items-center gap-4 ${isDark ? 'bg-[#3d0604] border border-[#7f6000]/30 shadow-inner' : 'bg-gray-100'}`}>
                    <div className="flex w-full justify-between items-end">
                        <PreviewBox size={112} src={processedImage} theme={theme} />
                        <PreviewBox size={56} src={processedImage} theme={theme} />
                        <PreviewBox size={28} src={processedImage} theme={theme} />
                    </div>
                    <div className={`w-full flex justify-between text-xs font-mono ${isDark ? 'text-[#deb069]/50' : 'text-gray-500'}`}>
                        <span>112px</span><span>56px</span><span>28px</span>
                    </div>
                </div>

                <h3 className={`font-semibold mb-3 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Fondo v2
                </h3>
                <div className={`mb-6 rounded p-3 space-y-3 ${isDark ? 'bg-[#3d0604] border border-[#7f6000]/30' : 'bg-gray-100'}`}>
                    <div className={`text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>
                        {removedPercent == null ? 'Sin mascara v2 activa' : `${removedPercent}% removido`}
                    </div>
                    <RangeField
                        label="Tolerancia"
                        value={backgroundV2.tolerance}
                        min={0}
                        max={120}
                        isDark={isDark}
                        onChange={(tolerance) => onUpdateBackgroundV2Params({ tolerance })}
                    />
                    <RangeField
                        label="Feather"
                        value={backgroundV2.feather}
                        min={0}
                        max={3}
                        isDark={isDark}
                        onChange={(feather) => onUpdateBackgroundV2Params({ feather })}
                    />
                    <RangeField
                        label="Despill %"
                        value={Math.round(backgroundV2.despill * 100)}
                        min={0}
                        max={100}
                        isDark={isDark}
                        onChange={(despill) => onUpdateBackgroundV2Params({ despill: despill / 100 })}
                    />
                    <RangeField
                        label="Pincel"
                        value={backgroundV2.brushRadius}
                        min={1}
                        max={48}
                        isDark={isDark}
                        onChange={(brushRadius) => onUpdateBackgroundV2Params({ brushRadius })}
                    />
                    <RangeField
                        label="Max borrado %"
                        value={Math.round(backgroundV2.excessiveRemovalThreshold * 100)}
                        min={25}
                        max={95}
                        isDark={isDark}
                        onChange={(excessiveRemovalThreshold) => onUpdateBackgroundV2Params({ excessiveRemovalThreshold: excessiveRemovalThreshold / 100 })}
                    />
                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2('active', 'connected')} disabled={!activeEmote || isApplyingBackgroundV2}>
                            {isApplyingBackgroundV2 ? <Loader2 size={13} className="inline animate-spin" /> : <Wand2 size={13} className="inline" />} Activo
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2('targets', 'connected')} disabled={totalItems === 0 || isApplyingBackgroundV2}>
                            Seleccion
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2('all', 'connected')} disabled={totalItems === 0 || isApplyingBackgroundV2}>
                            Todos
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2(selectedCount > 0 ? 'targets' : 'active', 'global')} disabled={!activeEmote || isApplyingBackgroundV2}>
                            Global agresivo
                        </button>
                    </div>
                    <div className={`rounded border px-2 py-1 text-[11px] ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                        Global puede eliminar ojos, dientes, texto y brillos blancos. Connected es el modo recomendado.
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2(selectedCount > 0 ? 'targets' : 'active', activeEmote?.backgroundRemoval?.mode || 'connected')} disabled={!activeEmote || isApplyingBackgroundV2}>
                            Recalcular
                        </button>
                        <button type="button" className={buttonClass} onClick={onResetBackgroundV2} disabled={!activeEmote}>
                            Restablecer
                        </button>
                        <button type="button" className={buttonClass} onClick={onRemoveBackgroundV2} disabled={!activeEmote}>
                            Quitar v2
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2Params(selectedCount > 0 ? 'targets' : 'all')} disabled={!activeEmote}>
                            Aplicar params
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2Params('active')} disabled={!activeEmote}>Params activo</button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2Params('targets')} disabled={!activeEmote || selectedCount === 0}>Params sel.</button>
                        <button type="button" className={buttonClass} onClick={() => onApplyBackgroundV2Params('all')} disabled={!activeEmote || totalItems === 0}>Params todos</button>
                    </div>
                </div>

                <h3 className={`font-semibold mb-3 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Lote y recorte
                </h3>
                <div className={`mb-6 rounded p-3 space-y-3 ${isDark ? 'bg-[#3d0604] border border-[#7f6000]/30' : 'bg-gray-100'}`}>
                    <div className={`text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>
                        Objetivo: {targetLabel}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        <button type="button" className={buttonClass} onClick={onSelectAll}>Todos</button>
                        <button type="button" className={buttonClass} onClick={onSelectNone}>Ninguno</button>
                        <button type="button" className={buttonClass} onClick={onSelectInvert}>Invertir</button>
                        <button type="button" className={buttonClass} onClick={onSelectWarnings}>Avisos</button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                        {['contain', 'cover', 'manual'].map((fitMode) => (
                            <button
                                key={fitMode}
                                type="button"
                                className={(activeEmote?.fitMode || 'contain') === fitMode ? activeButtonClass : buttonClass}
                                onClick={() => onUpdateTargets({ fitMode })}
                            >
                                {fitMode}
                            </button>
                        ))}
                    </div>

                    <RangeField
                        label="Padding %"
                        value={paddingPercent}
                        min={0}
                        max={40}
                        isDark={isDark}
                        onChange={(padding) => onUpdateTargets({ padding: padding / 100 })}
                    />
                    <RangeField
                        label="Zoom"
                        value={Math.round((frame.zoom || 1) * 100)}
                        min={25}
                        max={300}
                        isDark={isDark}
                        onChange={(zoom) => onUpdateTargets({ fitMode: 'manual', frame: { ...frame, zoom: zoom / 100 } })}
                    />
                    <RangeField
                        label="Pos X %"
                        value={offsetXPercent}
                        min={-50}
                        max={50}
                        isDark={isDark}
                        onChange={(offsetX) => onUpdateTargets({ fitMode: 'manual', frame: { ...frame, offsetX: offsetX / 100 } })}
                    />
                    <RangeField
                        label="Pos Y %"
                        value={offsetYPercent}
                        min={-50}
                        max={50}
                        isDark={isDark}
                        onChange={(offsetY) => onUpdateTargets({ fitMode: 'manual', frame: { ...frame, offsetY: offsetY / 100 } })}
                    />

                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={buttonClass} onClick={onTrimSelected} disabled={isTrimmingBatch || totalItems === 0}>
                            {isTrimmingBatch ? <Loader2 size={13} className="inline animate-spin" /> : <Scissors size={13} className="inline" />} Trim
                        </button>
                        <button type="button" className={buttonClass} onClick={onCopySettings} disabled={!activeEmote}>
                            <Copy size={13} className="inline" /> Copiar
                        </button>
                        <button type="button" className={buttonClass} onClick={onPasteSettings} disabled={!hasSettingsClipboard}>
                            Pegar
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyActiveSettings(['fit'])} disabled={!activeEmote || selectedCount === 0}>
                            Fit
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyActiveSettings(['adjustments'])} disabled={!activeEmote || selectedCount === 0}>
                            Ajustes
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyActiveSettings(['background'])} disabled={!activeEmote || selectedCount === 0}>
                            <Wand2 size={13} className="inline" /> Fondo
                        </button>
                        <button type="button" className={buttonClass} onClick={() => onApplyActiveSettings(['outline'])} disabled={!activeEmote || selectedCount === 0}>
                            Outline
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                        <button type="button" className={comparisonMode === 'before' ? activeButtonClass : buttonClass} onClick={() => onComparisonModeChange('before')}>
                            <EyeOff size={13} className="inline" /> Antes
                        </button>
                        <button type="button" className={comparisonMode === 'after' ? activeButtonClass : buttonClass} onClick={() => onComparisonModeChange('after')}>
                            <Eye size={13} className="inline" /> Despues
                        </button>
                        <button type="button" className={comparisonMode === 'mask' ? activeButtonClass : buttonClass} onClick={() => onComparisonModeChange('mask')}>
                            Mascara
                        </button>
                    </div>
                </div>

                <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Ajustes de Exportacion
                </h3>
                <div className={`mb-4 rounded p-3 space-y-3 ${isDark ? 'bg-[#3d0604] border border-[#7f6000]/30' : 'bg-gray-100'}`}>
                    <label className="block">
                        <span className={`mb-1 block text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>Preset</span>
                        <select
                            value={exportOptions?.presetId || 'twitch-static-manual'}
                            onChange={(event) => onExportOptionsChange({ presetId: event.target.value })}
                            className={`w-full rounded border px-2 py-1.5 text-xs ${isDark ? 'border-[#7f6000]/50 bg-[#3d0604] text-[#deb069]' : 'border-gray-300 bg-white text-gray-800'}`}
                        >
                            <option value="twitch-static-manual">Twitch manual 112/56/28</option>
                            <option value="twitch-static-auto">Twitch auto-resize maestro</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className={`mb-1 block text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>Alcance</span>
                        <select
                            value={exportOptions?.scope || 'all'}
                            onChange={(event) => onExportOptionsChange({ scope: event.target.value })}
                            className={`w-full rounded border px-2 py-1.5 text-xs ${isDark ? 'border-[#7f6000]/50 bg-[#3d0604] text-[#deb069]' : 'border-gray-300 bg-white text-gray-800'}`}
                        >
                            <option value="active">Activo</option>
                            <option value="selected">Seleccionados</option>
                            <option value="all">Todos</option>
                        </select>
                    </label>
                    {exportState?.summary && (
                        <div className={`rounded border px-2 py-2 text-xs ${exportState.summary.invalidOutputs > 0
                            ? isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100' : 'border-yellow-300 bg-yellow-50 text-yellow-800'
                            : isDark ? 'border-green-500/30 bg-green-500/10 text-green-100' : 'border-green-300 bg-green-50 text-green-800'
                            }`}
                        >
                            Estado: {exportState.status}. Validos: {exportState.summary.validOutputs}/{exportState.summary.totalOutputs}. Invalidos: {exportState.summary.invalidOutputs}.
                        </div>
                    )}
                    {exportState?.progress && (
                        <div className={`text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>
                            Progreso: {exportState.progress.processedFiles}/{exportState.progress.totalFiles || 0} archivos
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={buttonClass} onClick={onDownloadActivePng} disabled={!activeEmote}>PNG activo</button>
                        <button type="button" className={buttonClass} onClick={onRetryExport} disabled={isExporting || totalItems === 0}>Reintentar</button>
                        <button type="button" className={buttonClass} onClick={onCancelExport} disabled={!isExporting}>Cancelar</button>
                        <button type="button" className={buttonClass} onClick={onDownloadPreparedExport} disabled={!canDownloadPrepared}>Descargar ZIP</button>
                    </div>
                </div>

                <ChatSimulator processedImage={processedImage} theme={theme} />
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-[#7f6000]' : 'border-gray-300'}`}>
                <button
                    onClick={() => (onPrepareExport || onExport)?.()}
                    disabled={totalItems === 0 || isExporting}
                    className={`w-full py-3 rounded flex items-center justify-center gap-2 font-semibold transition-all ${totalItems > 0 && !isExporting
                        ? (isDark
                            ? 'bg-[#c41026] hover:bg-[#a00d1e] text-white shadow-lg shadow-[#c41026]/20 cursor-pointer'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/20 cursor-pointer')
                        : (isDark
                            ? 'bg-black/20 text-[#deb069]/40 cursor-not-allowed border border-[#7f6000]/30'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50')
                        }`}
                >
                    {isExporting ? (
                        <><Loader2 size={20} className="animate-spin" /> Empaquetando ZIP...</>
                    ) : (
                        <><Download size={20} /> Exportar {totalItems > 0 ? totalItems : ''} Emotes</>
                    )}
                </button>
            </div>
        </aside>
    );
}

function RangeField({ label, value, min, max, onChange, isDark }) {
    return (
        <label className="block">
            <span className={`mb-1 flex justify-between text-xs ${isDark ? 'text-[#deb069]/70' : 'text-gray-600'}`}>
                <span>{label}</span>
                <span>{value}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-black/30 accent-[#deb069]' : 'bg-gray-300 accent-purple-500'}`}
            />
        </label>
    );
}

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

                    <div className="grid grid-cols-2 gap-1">
                        <button type="button" className={comparisonMode === 'before' ? activeButtonClass : buttonClass} onClick={() => onComparisonModeChange('before')}>
                            <EyeOff size={13} className="inline" /> Antes
                        </button>
                        <button type="button" className={comparisonMode === 'after' ? activeButtonClass : buttonClass} onClick={() => onComparisonModeChange('after')}>
                            <Eye size={13} className="inline" /> Despues
                        </button>
                    </div>
                </div>

                <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Ajustes de Exportacion
                </h3>
                <div className="space-y-3">
                    <label className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${isDark ? 'border-[#7f6000] bg-[#7f6000]/10' : 'border-purple-500 bg-purple-50'}`}>
                        <input
                            type="radio"
                            name="format"
                            defaultChecked
                            className={`mr-3 h-4 w-4 ${isDark ? 'text-[#c41026] focus:ring-[#c41026] bg-[#3d0604] border-[#7f6000] accent-[#c41026]' : 'text-purple-600 focus:ring-purple-500'}`}
                        />
                        <div className="flex-1">
                            <p className="font-medium text-sm">Lote Twitch (ZIP)</p>
                            <p className={`text-xs ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>Carpetas con 112px, 56px y 28px</p>
                        </div>
                    </label>
                </div>

                <ChatSimulator processedImage={processedImage} theme={theme} />
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-[#7f6000]' : 'border-gray-300'}`}>
                <button
                    onClick={onExport}
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

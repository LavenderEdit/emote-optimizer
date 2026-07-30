import React, { useMemo, useState } from 'react';
import { CheckSquare, Plus, Square, X } from 'lucide-react';

const ITEM_SIZE = 64;
const ITEM_STEP = 80;
const STRIP_HEIGHT = 112;
const OVERSCAN = 4;

export default function VirtualizedEmoteStrip({
    theme,
    emotes,
    assets,
    activeId,
    selectedEmoteIds,
    onActivate,
    onToggleSelection,
    onRemoveActive,
    onUploadClick,
}) {
    const isDark = theme === 'dark';
    const [scrollState, setScrollState] = useState({ left: 0, width: 1024 });
    const totalItems = emotes.length + 1;
    const visibleWindow = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollState.left / ITEM_STEP) - OVERSCAN);
        const capacity = Math.ceil(scrollState.width / ITEM_STEP) + OVERSCAN * 2;
        const end = Math.min(totalItems, start + capacity);
        return { start, end };
    }, [scrollState.left, scrollState.width, totalItems]);
    const visibleItems = [];
    for (let index = visibleWindow.start; index < visibleWindow.end; index += 1) {
        visibleItems.push(index);
    }

    return (
        <div
            className={`h-28 border-t overflow-x-auto ${isDark ? 'bg-[#3d2304] border-[#7f6000]' : 'bg-white border-gray-300'}`}
            onScroll={(event) => setScrollState({
                left: event.currentTarget.scrollLeft,
                width: event.currentTarget.clientWidth || scrollState.width,
            })}
            data-testid="virtualized-emote-strip"
        >
            <div className="relative" style={{ height: STRIP_HEIGHT, width: Math.max(totalItems * ITEM_STEP + 48, scrollState.width) }}>
                {visibleItems.map((index) => {
                    const left = 24 + index * ITEM_STEP;
                    if (index >= emotes.length) {
                        return (
                            <button
                                key="add"
                                type="button"
                                onClick={onUploadClick}
                                className={`absolute top-6 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDark
                                    ? 'border-[#7f6000] text-[#7f6000] hover:border-[#deb069] hover:text-[#deb069]'
                                    : 'border-gray-300 text-gray-400 hover:border-gray-500'
                                    }`}
                                style={{ left }}
                                aria-label="Agregar imagen"
                            >
                                <Plus size={24} />
                            </button>
                        );
                    }

                    const emote = emotes[index];
                    const selected = selectedEmoteIds.includes(emote.id);
                    const active = emote.id === activeId;

                    return (
                        <div
                            key={emote.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onActivate(emote.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') onActivate(emote.id);
                            }}
                            className={`absolute top-6 h-16 w-16 rounded-lg transition-all ${active
                                ? (isDark ? 'ring-2 ring-[#c41026] shadow-lg shadow-[#c41026]/30' : 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30')
                                : (isDark ? 'opacity-60 hover:opacity-100 ring-1 ring-[#7f6000]' : 'opacity-60 hover:opacity-100 ring-1 ring-gray-500')
                                }`}
                            style={{ left }}
                            aria-label={`Abrir ${emote.name}`}
                        >
                            <DocumentThumbnail emote={emote} asset={assets[emote.sourceId]} />
                            <button
                                type="button"
                                aria-label={`Seleccionar ${emote.name}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleSelection(emote.id);
                                }}
                                className={`absolute bottom-1 left-1 rounded p-0.5 ${selected
                                    ? (isDark ? 'bg-[#c41026] text-white' : 'bg-purple-600 text-white')
                                    : (isDark ? 'bg-black/60 text-[#deb069]' : 'bg-white/90 text-gray-700')
                                    }`}
                            >
                                {selected ? <CheckSquare size={12} /> : <Square size={12} />}
                            </button>
                            {active && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onRemoveActive();
                                    }}
                                    className={`absolute -right-2 -top-2 rounded-full p-0.5 text-white transition-colors ${isDark ? 'bg-[#c41026] hover:bg-[#a00d1e]' : 'bg-red-500 hover:bg-red-600'}`}
                                    aria-label={`Eliminar ${emote.name}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DocumentThumbnail({ emote, asset }) {
    if (!asset) {
        return <div className="h-full w-full rounded-md bg-black/20" />;
    }

    const crop = emote.cropRect || { x: 0, y: 0, width: asset.width, height: asset.height };
    const scale = Math.min(ITEM_SIZE / crop.width, ITEM_SIZE / crop.height);
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

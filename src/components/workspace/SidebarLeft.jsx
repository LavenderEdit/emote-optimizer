import React from 'react';
import { Image as ImageIcon, Pipette, Wand2, Settings2, SunMedium, Contrast, Palette, Zap } from 'lucide-react';
import ToolButton from '../ui/ToolButton';

export default function SidebarLeft({
    theme,
    onUploadClick,
    isEyedropperActive,
    onEyedropperToggle,
    tolerance,
    onToleranceChange,
    isAutoOutlineActive,
    onAutoOutlineToggle,
    adjustments,
    onAdjustmentsChange,
    hasImage
}) {
    const isDark = theme === 'dark';

    return (
        <aside className={`w-16 flex flex-col items-center py-4 border-r gap-4 overflow-y-auto no-scrollbar ${isDark ? 'border-[#7f6000] bg-[#3d2304]' : 'border-gray-300 bg-white'}`}>
            <ToolButton
                icon={<ImageIcon size={20} />}
                label="Subir Imagen"
                active={!hasImage}
                onClick={onUploadClick}
                theme={theme}
            />

            <div className={`w-8 h-px my-2 ${isDark ? 'bg-[#7f6000]/50' : 'bg-gray-300'}`}></div>

            <ToolButton
                icon={<Pipette size={20} />}
                label="Gotero: Borrar Color"
                active={isEyedropperActive}
                onClick={onEyedropperToggle}
                theme={theme}
            />

            <div className={`w-full px-2 flex flex-col items-center gap-2 transition-opacity ${hasImage ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <span className={`text-[8px] uppercase font-bold tracking-wider ${isDark ? 'text-[#deb069]' : 'text-gray-500'}`}>
                    Tolerancia
                </span>
                <input
                    type="range"
                    min="0"
                    max="200"
                    value={tolerance}
                    onChange={(e) => onToleranceChange(Number(e.target.value))}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-[#000000]/30 accent-[#c41026]' : 'bg-gray-300 accent-purple-600'}`}
                    title={`Tolerancia: ${tolerance}`}
                />
            </div>

            <ToolButton
                icon={<Wand2 size={20} />}
                label="Auto Borde Blanco"
                active={isAutoOutlineActive}
                onClick={onAutoOutlineToggle}
                theme={theme}
            />

            {/* Nuevos Ajustes Pro (Adaptados al diseño compacto w-16) */}
            {adjustments && onAdjustmentsChange && (
                <div className={`w-full flex flex-col items-center gap-4 pt-2 transition-opacity ${hasImage ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <div className={`w-8 h-px my-1 ${isDark ? 'bg-[#7f6000]/50' : 'bg-gray-300'}`}></div>

                    <CompactSlider
                        icon={<SunMedium size={14} className={isDark ? "text-[#deb069]/70" : "text-gray-500"} />}
                        label="Brillo" value={adjustments.brightness} min={-100} max={100}
                        onChange={(v) => onAdjustmentsChange({ ...adjustments, brightness: v })} isDark={isDark}
                    />
                    <CompactSlider
                        icon={<Contrast size={14} className={isDark ? "text-[#deb069]/70" : "text-gray-500"} />}
                        label="Contraste" value={adjustments.contrast} min={-100} max={100}
                        onChange={(v) => onAdjustmentsChange({ ...adjustments, contrast: v })} isDark={isDark}
                    />
                    <CompactSlider
                        icon={<Palette size={14} className={isDark ? "text-[#deb069]/70" : "text-gray-500"} />}
                        label="Saturación" value={adjustments.saturation} min={-100} max={100}
                        onChange={(v) => onAdjustmentsChange({ ...adjustments, saturation: v })} isDark={isDark}
                    />
                    <CompactSlider
                        icon={<Zap size={14} className={isDark ? "text-[#deb069]/70" : "text-gray-500"} />}
                        label="Enfoque" value={adjustments.sharpen} min={0} max={100}
                        onChange={(v) => onAdjustmentsChange({ ...adjustments, sharpen: v })} isDark={isDark}
                    />
                </div>
            )}

            <div className="mt-auto pt-4">
                <ToolButton icon={<Settings2 size={20} />} label="Ajustes" theme={theme} />
            </div>
        </aside>
    );
}

function CompactSlider({ icon, label, value, min, max, onChange, isDark }) {
    return (
        <div className="w-full px-2 flex flex-col items-center gap-1.5" title={`${label}: ${value}`}>
            {icon}
            <input
                type="range" min={min} max={max} value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-[#000000]/30 accent-[#deb069]' : 'bg-gray-300 accent-purple-500'}`}
            />
        </div>
    );
}
import React from 'react';
import { Image as ImageIcon, Pipette, Wand2, Settings2 } from 'lucide-react';
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
    hasImage
}) {
    return (
        <aside className={`w-16 flex flex-col items-center py-4 border-r gap-4 ${theme === 'dark' ? 'border-gray-800 bg-[#18181b]' : 'border-gray-300 bg-white'}`}>
            <ToolButton
                icon={<ImageIcon size={20} />}
                label="Subir Imagen"
                active={!hasImage}
                onClick={onUploadClick}
                theme={theme}
            />

            <div className={`w-8 h-px my-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`}></div>

            <ToolButton
                icon={<Pipette size={20} />}
                label="Gotero: Borrar Color"
                active={isEyedropperActive}
                onClick={onEyedropperToggle}
                theme={theme}
            />

            <div className={`w-full px-2 flex flex-col items-center gap-2 transition-opacity ${hasImage ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Tolerancia</span>
                <input
                    type="range"
                    min="0"
                    max="200"
                    value={tolerance}
                    onChange={(e) => onToleranceChange(Number(e.target.value))}
                    className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
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
            <ToolButton icon={<Settings2 size={20} />} label="Ajustes" theme={theme} />
        </aside>
    );
}

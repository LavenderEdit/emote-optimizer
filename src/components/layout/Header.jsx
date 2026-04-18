import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function Header({ theme, toggleTheme }) {
    const isDark = theme === 'dark';

    return (
        <header className={`h-14 border-b flex items-center justify-between px-4 ${isDark ? 'border-[#7f6000] bg-[#3d2304] text-[#deb069]' : 'border-gray-300 bg-white text-gray-900'}`}>
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white transition-colors ${isDark ? 'bg-[#c41026] shadow-lg' : 'bg-purple-600'}`}>
                    E
                </div>
                <span className="font-semibold text-lg tracking-tight">EmoteStudio Pro</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-md transition-colors ${isDark ? 'hover:bg-[#7f6000]/30 text-[#deb069]' : 'hover:bg-gray-200 text-gray-600'}`}
                    title="Cambiar tema"
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>
    );
}
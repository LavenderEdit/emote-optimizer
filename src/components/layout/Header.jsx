import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function Header({ theme, toggleTheme }) {
    return (
        <header className={`h-14 border-b flex items-center justify-between px-4 ${theme === 'dark' ? 'border-gray-800 bg-[#18181b]' : 'border-gray-300 bg-white'}`}>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center font-bold text-white">E</div>
                <span className="font-semibold text-lg tracking-tight">EmoteStudio Pro</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                    title="Cambiar tema"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors">
                    Upgrade to Pro
                </button>
            </div>
        </header>
    );
}
import React from 'react';

export default function ToolButton({ icon, label, active, onClick, theme }) {
    const isDark = theme === 'dark';

    return (
        <div className="relative group flex flex-col items-center">
            <button
                onClick={onClick}
                className={`p-3 rounded-xl transition-all ${active
                    ? (isDark
                        ? 'bg-[#c41026] text-white shadow-lg shadow-[#c41026]/20'
                        : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20')
                    : isDark
                        ? 'text-[#deb069]/60 hover:bg-[#7f6000]/30 hover:text-[#deb069]'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
            >
                {icon}
            </button>
            <span className={`absolute left-14 px-2 py-1 text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl ${isDark
                    ? 'bg-[#000000] text-[#deb069] border border-[#7f6000]/50'
                    : 'bg-gray-900 text-white'
                }`}>
                {label}
            </span>
        </div>
    );
}
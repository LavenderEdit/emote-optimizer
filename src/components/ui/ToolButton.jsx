import React from 'react';

export default function ToolButton({ icon, label, active, onClick, theme }) {
    return (
        <div className="relative group flex flex-col items-center">
            <button
                onClick={onClick}
                className={`p-3 rounded-xl transition-all ${active
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
            >
                {icon}
            </button>
            <span className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {label}
            </span>
        </div>
    );
}
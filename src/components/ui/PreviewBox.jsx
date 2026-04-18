import React from 'react';

export default function PreviewBox({ size, src, theme }) {
    const isDark = theme === 'dark';

    return (
        <div
            className={`border border-dashed flex items-center justify-center overflow-hidden shadow-inner ${isDark
                    ? 'border-[#7f6000]/50 bg-[#000000]/40'
                    : 'border-gray-300 bg-white'
                }`}
            style={{ width: size, height: size, borderRadius: size > 50 ? 4 : 2 }}
        >
            {src ? (
                <img src={src} alt={`Preview ${size}px`} className="pixelated" style={{ width: size, height: size, objectFit: 'contain' }} />
            ) : (
                <div className={`w-full h-full ${isDark ? 'bg-transparent' : 'bg-gray-200'}`}></div>
            )}
        </div>
    );
}
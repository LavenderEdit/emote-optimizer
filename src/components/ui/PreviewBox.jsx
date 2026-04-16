import React from 'react';

export default function PreviewBox({ size, src, theme }) {
    return (
        <div
            className={`border border-dashed flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-white'
                }`}
            style={{ width: size, height: size, borderRadius: size > 50 ? 4 : 2 }}
        >
            {src ? (
                <img src={src} alt={`Preview ${size}px`} style={{ width: size, height: size, objectFit: 'contain' }} />
            ) : (
                <div className={`w-full h-full ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200'}`}></div>
            )}
        </div>
    );
}
import React from 'react';
import { TRANSPARENCY_GRID } from '../../constants/canvasStyles';

export default function ActiveCanvas({
    canvasRef,
    currentStyles,
    isDark,
    isEyedropperActive,
    isRestoring,
    onImageRemove,
    mouseHandlers
}) {
    return (
        <div className="relative flex flex-col items-center w-full h-full justify-center">
            <div className={`p-4 rounded-lg shadow-2xl flex items-center justify-center max-w-full max-h-full ${currentStyles.canvasContainer}`}>
                <canvas
                    ref={canvasRef}
                    {...mouseHandlers}
                    style={TRANSPARENCY_GRID}
                    className={`max-w-full max-h-[60vh] object-contain rounded drop-shadow-md ${currentStyles.canvasBg}
                        ${isEyedropperActive && !isRestoring ? 'cursor-crosshair' : ''}
                        ${isRestoring ? 'cursor-cell' : ''}
                    `}
                />
            </div>

            <div className="absolute top-4 flex flex-col items-center gap-2 pointer-events-none">
                {isEyedropperActive && (
                    <div className={`text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-pulse ${isDark ? 'bg-[#c41026]' : 'bg-purple-600'}`}>
                        Clic para borrar. SHIFT+Arrastrar para restaurar. Ctrl+Z para deshacer.
                    </div>
                )}
            </div>

            <button
                onClick={onImageRemove}
                className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors shadow-lg"
            >
                Quitar Imagen
            </button>
        </div>
    );
}
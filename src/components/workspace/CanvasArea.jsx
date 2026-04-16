import React, { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useImageProcessor } from '../../hooks/useImageProcessor';

export default function CanvasArea({
    theme,
    imageSrc,
    onImageRemove,
    onUploadClick,
    onFileDrop,
    isEyedropperActive,
    onColorPicked,
    targetColor,
    tolerance,
    isAutoOutlineActive,
    onProcessed
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [erasurePoints, setErasurePoints] = useState([]);

    // Estados para la nueva función de Pincel Restaurador
    const [restorePoints, setRestorePoints] = useState([]);
    const [isRestoring, setIsRestoring] = useState(false);

    // 1. LLAMAMOS AL HOOK DE PROCESAMIENTO (Completamente Separado)
    const { canvasRef } = useImageProcessor({
        imageSrc,
        erasurePoints,
        restorePoints,
        tolerance,
        isAutoOutlineActive,
        onProcessed
    });

    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) onFileDrop(e.dataTransfer.files[0]);
    }, [onFileDrop]);

    // 2. GESTIONAMOS LOS CLICS Y EL PINCEL
    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;

        // NUEVO: Si mantiene presionada la tecla SHIFT, usamos el pincel restaurador
        if (e.shiftKey) {
            setIsRestoring(true);
            addRestorePoint(e);
            return;
        }

        // Si el gotero normal está activo
        if (isEyedropperActive) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            const ctx = canvas.getContext('2d');
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            onColorPicked({ r: pixel[0], g: pixel[1], b: pixel[2], x, y });
        }
    };

    const handleMouseMove = (e) => {
        // Si está arrastrando el ratón con SHIFT, pinta la restauración continuamente
        if (isRestoring && e.shiftKey) {
            addRestorePoint(e);
        }
    };

    const handleMouseUp = () => {
        setIsRestoring(false);
    };

    const addRestorePoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        setRestorePoints(prev => [...prev, { x, y }]);
    };

    // 3. LIMPIEZA Y GUARDADO DE HISTORIAL
    useEffect(() => {
        setErasurePoints([]);
        setRestorePoints([]);
    }, [imageSrc]);

    useEffect(() => {
        if (targetColor && targetColor.x !== undefined) {
            setErasurePoints(prev => {
                const exists = prev.some(p => p.x === targetColor.x && p.y === targetColor.y);
                if (exists) return prev;
                return [...prev, targetColor];
            });
        }
    }, [targetColor]);

    const transparencyGrid = {
        backgroundImage: 'conic-gradient(rgba(150, 150, 150, 0.2) 90deg, transparent 90deg, transparent 270deg, rgba(150, 150, 150, 0.2) 270deg)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px'
    };

    return (
        <main className={`flex-1 relative flex items-center justify-center p-8 ${theme === 'dark' ? 'bg-[#0e0e10]' : 'bg-gray-100'}`}>
            <div
                className={`w-full h-full max-w-3xl max-h-[800px] rounded-xl flex flex-col items-center justify-center transition-all duration-200 
          ${isDragging ? 'border-4 border-dashed border-purple-500 bg-purple-500/10' : `border-2 border-dashed ${theme === 'dark' ? 'border-gray-700 bg-[#18181b]' : 'border-gray-300 bg-white'}`}
          ${imageSrc ? 'border-none bg-transparent' : ''}
        `}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            >
                {!imageSrc ? (
                    <div className="text-center pointer-events-none flex flex-col items-center">
                        <Upload size={48} className={`mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className="text-xl font-medium mb-2">Arrastra tu imagen aquí</h3>
                        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Soporta PNG, JPG, JPEG</p>
                        <button onClick={onUploadClick} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors pointer-events-auto">
                            Explorar Archivos
                        </button>
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center w-full h-full justify-center">
                        <div className={`p-4 rounded-lg shadow-2xl flex items-center justify-center max-w-full max-h-full ${theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'}`}>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={transparencyGrid}
                                className={`max-w-full max-h-[60vh] object-contain rounded drop-shadow-md bg-white dark:bg-gray-900 
                                    ${isEyedropperActive ? 'cursor-crosshair' : 'cursor-default'}
                                `}
                            />
                        </div>

                        {/* Textos flotantes informativos de herramientas */}
                        <div className="absolute -top-12 flex flex-col items-center gap-2 pointer-events-none">
                            {isEyedropperActive && (
                                <div className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                                    Haz clic en el fondo para borrar áreas
                                </div>
                            )}
                            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                                💡 Tip: Mantén <strong>SHIFT + Arrastrar Ratón</strong> para restaurar ropa borrada por error.
                            </div>
                        </div>

                        <button onClick={onImageRemove} className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors">
                            Quitar Imagen
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
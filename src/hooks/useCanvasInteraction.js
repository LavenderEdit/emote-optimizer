import { useState } from 'react';

export function useCanvasInteraction({
    canvasRef,
    isEyedropperActive,
    setErasurePoints,
    setRestorePoints,
    saveToHistory
}) {
    const [isRestoring, setIsRestoring] = useState(false);
    const [isMousePressed, setIsMousePressed] = useState(false);

    const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY)
        };
    };

    const addErasurePoint = (e) => {
        const coords = getCanvasCoordinates(e);
        if (!coords) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const newPoint = { r: pixel[0], g: pixel[1], b: pixel[2], x: coords.x, y: coords.y };

        setErasurePoints(prev => {
            const exists = prev.some(p => p.x === coords.x && p.y === coords.y);
            return exists ? prev : [...prev, newPoint];
        });
    };

    const addRestorePoint = (e) => {
        const coords = getCanvasCoordinates(e);
        if (coords) {
            setRestorePoints(prev => [...prev, { x: coords.x, y: coords.y }]);
        }
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        setIsMousePressed(true);
        if (saveToHistory) saveToHistory();

        if (e.shiftKey) {
            setIsRestoring(true);
            addRestorePoint(e);
            return;
        }

        if (isEyedropperActive) addErasurePoint(e);
    };

    const handleMouseMove = (e) => {
        if (!isMousePressed) return;
        if (isRestoring || e.shiftKey) {
            addRestorePoint(e);
        } else if (isEyedropperActive) {
            addErasurePoint(e);
        }
    };

    const handleMouseUp = () => {
        setIsRestoring(false);
        setIsMousePressed(false);
    };

    return {
        isRestoring,
        mouseHandlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseUp
        }
    };
}
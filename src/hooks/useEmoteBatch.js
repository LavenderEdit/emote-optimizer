import { useState, useRef, useEffect, useCallback } from 'react';
import { generateEmotesZip } from '../utils/exportUtils';

export function useEmoteBatch() {
    const [theme, setTheme] = useState('dark');
    const fileInputRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);

    const updateActiveEmote = useCallback((updates) => {
        if (!activeId) return;
        setEmotes(prev => prev.map(e => e.id === activeId ? { ...e, ...updates } : e));
    }, [activeId]);

    useEffect(() => {
        if (!activeId && emotes.length > 0) setActiveId(emotes[0].id);
    }, [emotes, activeId]);

    const processFiles = (files) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            alert("Por favor sube imágenes válidas (PNG, JPG, WEBP).");
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newEmote = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    originalSrc: event.target.result,
                    processedSrc: null,
                    erasurePoints: [],
                    restorePoints: [],
                    history: [],
                    tolerance: 30,
                    isAutoOutlineActive: false,
                    // Añadimos los ajustes por defecto con un poco de enfoque y saturación extra
                    adjustments: { brightness: 0, contrast: 0, saturation: 15, sharpen: 25 }
                };
                setEmotes(prev => {
                    const next = [...prev, newEmote];
                    if (prev.length === 0) setActiveId(newEmote.id);
                    return next;
                });
            };
            reader.readAsDataURL(file);
        });

        setIsEyedropperActive(false);
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const handleRemoveActive = () => {
        setEmotes(prev => prev.filter(e => e.id !== activeId));
        setActiveId(null);
        setIsEyedropperActive(false);
    };

    const saveToHistory = useCallback(() => {
        if (activeEmote) {
            const currentHistory = activeEmote.history || [];
            updateActiveEmote({
                history: [...currentHistory, {
                    erasurePoints: [...activeEmote.erasurePoints],
                    restorePoints: [...activeEmote.restorePoints]
                }]
            });
        }
    }, [activeEmote, updateActiveEmote]);

    const undo = useCallback(() => {
        if (activeEmote && activeEmote.history && activeEmote.history.length > 0) {
            const newHistory = [...activeEmote.history];
            const previousState = newHistory.pop();
            updateActiveEmote({
                erasurePoints: previousState.erasurePoints,
                restorePoints: previousState.restorePoints,
                history: newHistory
            });
        }
    }, [activeEmote, updateActiveEmote]);

    const exportToZip = () => generateEmotesZip(emotes, setIsExporting);

    return {
        theme, setTheme,
        fileInputRef,
        emotes,
        activeId, setActiveId,
        activeEmote, updateActiveEmote,
        isEyedropperActive, setIsEyedropperActive,
        isExporting,
        processFiles, handleFileInput, triggerUpload,
        handleRemoveActive, saveToHistory, undo, exportToZip
    };
}
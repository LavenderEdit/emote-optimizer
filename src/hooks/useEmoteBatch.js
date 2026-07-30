import { useState, useRef, useEffect, useCallback } from 'react';
import { generateEmotesZip } from '../utils/exportUtils';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { createGridDraft } from '../features/grid-import/gridSegmentation/gridDraft';
import { extractGridCellsToDocuments } from '../features/grid-import/gridSegmentation/extractGridCells';
import {
    createImageAssetFromFile,
    validateDecodedImageDimensions,
    validateImageFile,
} from '../shared/files/imageValidation';

function revokeEmoteSource(emote) {
    if (emote?.source?.objectUrl) {
        URL.revokeObjectURL(emote.source.objectUrl);
    }
}

function revokeGridDraft(draft) {
    if (draft?.source?.objectUrl) {
        URL.revokeObjectURL(draft.source.objectUrl);
    }
}

function formatValidationMessages(messages) {
    return messages.filter(Boolean).join('\n');
}

async function createValidatedAsset(file) {
    const fileValidation = validateImageFile(file);
    if (!fileValidation.valid) {
        throw new Error(formatValidationMessages(fileValidation.errors));
    }

    const asset = await createImageAssetFromFile(file);
    const dimensionsValidation = validateDecodedImageDimensions(asset.width, asset.height);
    if (!dimensionsValidation.valid) {
        URL.revokeObjectURL(asset.objectUrl);
        throw new Error(formatValidationMessages(dimensionsValidation.errors));
    }

    return { asset, warnings: [...fileValidation.warnings, ...dimensionsValidation.warnings] };
}

export function useEmoteBatch() {
    const [theme, setTheme] = useState('dark');
    const fileInputRef = useRef(null);
    const uploadModeRef = useRef('individual');
    const emotesRef = useRef([]);
    const gridDraftRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [gridDraft, setGridDraft] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);

    useEffect(() => {
        emotesRef.current = emotes;
    }, [emotes]);

    useEffect(() => {
        gridDraftRef.current = gridDraft;
    }, [gridDraft]);

    useEffect(() => () => {
        emotesRef.current.forEach(revokeEmoteSource);
        revokeGridDraft(gridDraftRef.current);
    }, []);

    const updateActiveEmote = useCallback((updates) => {
        if (!activeId) return;
        setEmotes(prev => prev.map(e => e.id === activeId ? { ...e, ...updates } : e));
    }, [activeId]);

    const updateGridDraft = useCallback((updater) => {
        setGridDraft((current) => {
            if (!current) return current;
            return typeof updater === 'function' ? updater(current) : updater;
        });
    }, []);

    const processFiles = useCallback(async (files, requestedMode = uploadModeRef.current) => {
        const fileList = Array.from(files);
        if (fileList.length === 0) return;

        try {
            if (requestedMode === 'grid') {
                const { asset, warnings } = await createValidatedAsset(fileList[0]);
                setGridDraft((current) => {
                    revokeGridDraft(current);
                    const draft = createGridDraft(asset);
                    return {
                        ...draft,
                        warnings: [...draft.warnings, ...warnings],
                    };
                });
                setIsEyedropperActive(false);
                return;
            }

            const created = [];
            const warnings = [];
            try {
                for (const file of fileList) {
                    const result = await createValidatedAsset(file);
                    created.push(createEmoteDocumentFromAsset(result.asset));
                    warnings.push(...result.warnings);
                }
            } catch (error) {
                created.forEach(revokeEmoteSource);
                throw error;
            }

            setEmotes(prev => [...prev, ...created]);
            if (!activeId && created.length > 0) {
                setActiveId(created[0].id);
            }
            setIsEyedropperActive(false);

            if (warnings.length > 0) {
                console.warn('Advertencias de importacion:', warnings);
            }
        } catch (error) {
            console.error('Error de importacion:', error);
            alert(error.message || 'No se pudo importar la imagen.');
        } finally {
            uploadModeRef.current = 'individual';
        }
    }, [activeId]);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files, uploadModeRef.current);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerUpload = (mode = 'individual') => {
        uploadModeRef.current = mode;
        fileInputRef.current?.click();
    };

    const handleRemoveActive = () => {
        const current = emotes.find(e => e.id === activeId);
        revokeEmoteSource(current);
        const next = emotes.filter(e => e.id !== activeId);
        setEmotes(next);
        setActiveId(next[0]?.id || null);
        setIsEyedropperActive(false);
    };

    const closeGridDraft = () => {
        setGridDraft((current) => {
            revokeGridDraft(current);
            return null;
        });
    };

    const generateGridEmotes = async () => {
        if (!gridDraft) return;
        setIsGeneratingGrid(true);
        try {
            const documents = await extractGridCellsToDocuments(gridDraft);
            setEmotes(prev => [...prev, ...documents]);
            setGridDraft(current => current ? { ...current, generatedCount: current.generatedCount + documents.length } : current);
            if (documents.length > 0) {
                setActiveId(documents[0].id);
            }
        } catch (error) {
            console.error('Error al generar recortes:', error);
            alert(error.message || 'No se pudieron generar los recortes del grid.');
        } finally {
            setIsGeneratingGrid(false);
        }
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
        gridDraft, updateGridDraft, closeGridDraft, generateGridEmotes, isGeneratingGrid,
        isEyedropperActive, setIsEyedropperActive,
        isExporting,
        processFiles, handleFileInput, triggerUpload,
        handleRemoveActive, saveToHistory, undo, exportToZip
    };
}

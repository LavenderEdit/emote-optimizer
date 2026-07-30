import { useState, useRef, useEffect, useCallback } from 'react';
import { generateEmotesZip } from '../utils/exportUtils';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { createGridDraft, createGridDraftFromAnalysis } from '../features/grid-import/gridSegmentation/gridDraft';
import { extractGridCellsToDocuments, getCellGenerationKey } from '../features/grid-import/gridSegmentation/extractGridCells';
import { detectGridInWorker } from '../features/grid-import/gridDetection/runGridDetection';
import {
    createImageAssetFromFile,
    validateDecodedImageDimensions,
    validateImageFile,
} from '../shared/files/imageValidation';

function revokeEmoteSource(emote) {
    if (emote?.objectUrl) {
        URL.revokeObjectURL(emote.objectUrl);
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

function mergeEmoteUpdates(emote, updates) {
    const backgroundRemoval = {
        ...emote.backgroundRemoval,
        ...(updates.backgroundRemoval || {}),
    };

    if ('erasurePoints' in updates) backgroundRemoval.erasurePoints = updates.erasurePoints;
    if ('restorePoints' in updates) backgroundRemoval.restorePoints = updates.restorePoints;
    if ('tolerance' in updates) backgroundRemoval.tolerance = updates.tolerance;

    const outline = {
        ...emote.outline,
        ...(updates.outline || {}),
    };

    if ('isAutoOutlineActive' in updates) outline.enabled = updates.isAutoOutlineActive;

    return {
        ...emote,
        ...updates,
        backgroundRemoval,
        outline,
        erasurePoints: backgroundRemoval.erasurePoints || [],
        restorePoints: backgroundRemoval.restorePoints || [],
        tolerance: backgroundRemoval.tolerance ?? 30,
        isAutoOutlineActive: Boolean(outline.enabled),
    };
}

function releaseUnusedAssets(currentAssets, nextEmotes, draft) {
    const usedSourceIds = new Set(nextEmotes.map((emote) => emote.sourceId));
    if (draft?.source?.id) usedSourceIds.add(draft.source.id);

    const nextAssets = {};
    for (const [assetId, asset] of Object.entries(currentAssets)) {
        if (usedSourceIds.has(assetId)) {
            nextAssets[assetId] = asset;
        } else {
            revokeEmoteSource(asset);
        }
    }
    return nextAssets;
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
    const assetsRef = useRef({});
    const previewUrlsRef = useRef({});
    const gridDraftRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [assets, setAssets] = useState({});
    const [previewUrls, setPreviewUrls] = useState({});
    const [activeId, setActiveId] = useState(null);
    const [gridDraft, setGridDraft] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
    const [isDetectingGrid, setIsDetectingGrid] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);
    const activeAsset = activeEmote ? assets[activeEmote.sourceId] : null;
    const activePreviewUrl = activeEmote ? previewUrls[activeEmote.id] : null;

    useEffect(() => {
        emotesRef.current = emotes;
    }, [emotes]);

    useEffect(() => {
        assetsRef.current = assets;
    }, [assets]);

    useEffect(() => {
        previewUrlsRef.current = previewUrls;
    }, [previewUrls]);

    useEffect(() => {
        gridDraftRef.current = gridDraft;
    }, [gridDraft]);

    useEffect(() => () => {
        Object.values(assetsRef.current).forEach(revokeEmoteSource);
        Object.values(previewUrlsRef.current).forEach(URL.revokeObjectURL);
        if (gridDraftRef.current?.source?.id && !assetsRef.current[gridDraftRef.current.source.id]) {
            revokeGridDraft(gridDraftRef.current);
        }
    }, []);

    const updateActiveEmote = useCallback((updates) => {
        if (!activeId) return;
        setEmotes(prev => prev.map(e => e.id === activeId ? mergeEmoteUpdates(e, updates) : e));
    }, [activeId]);

    const updateActivePreview = useCallback((emoteId, blob) => {
        const nextUrl = URL.createObjectURL(blob);
        setPreviewUrls((current) => {
            if (current[emoteId]) URL.revokeObjectURL(current[emoteId]);
            return { ...current, [emoteId]: nextUrl };
        });
    }, []);

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
                    if (current?.source?.id && !assetsRef.current[current.source.id]) revokeGridDraft(current);
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
            const createdAssets = {};
            const warnings = [];
            try {
                for (const file of fileList) {
                    const result = await createValidatedAsset(file);
                    createdAssets[result.asset.id] = result.asset;
                    created.push(createEmoteDocumentFromAsset(result.asset));
                    warnings.push(...result.warnings);
                }
            } catch (error) {
                Object.values(createdAssets).forEach(revokeEmoteSource);
                throw error;
            }

            setAssets((current) => {
                const next = { ...current, ...createdAssets };
                assetsRef.current = next;
                return next;
            });
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
        const next = emotes.filter(e => e.id !== activeId);
        setEmotes(next);
        setAssets((currentAssets) => {
            const nextAssets = releaseUnusedAssets(currentAssets, next, gridDraft);
            assetsRef.current = nextAssets;
            return nextAssets;
        });
        setPreviewUrls((currentUrls) => {
            if (currentUrls[current?.id]) URL.revokeObjectURL(currentUrls[current.id]);
            const nextUrls = { ...currentUrls };
            delete nextUrls[current?.id];
            return nextUrls;
        });
        setActiveId(next[0]?.id || null);
        setIsEyedropperActive(false);
    };

    const closeGridDraft = () => {
        setGridDraft((current) => {
            if (current?.source?.id && !assetsRef.current[current.source.id]) revokeGridDraft(current);
            return null;
        });
    };

    const generateGridEmotes = async () => {
        if (!gridDraft) return;
        setIsGeneratingGrid(true);
        try {
            const documents = extractGridCellsToDocuments(gridDraft);
            if (documents.length === 0) return;
            setAssets((current) => {
                const next = { ...current, [gridDraft.source.id]: gridDraft.source };
                assetsRef.current = next;
                return next;
            });
            setEmotes(prev => [...prev, ...documents]);
            setGridDraft(current => current ? {
                ...current,
                generatedCount: current.generatedCount + documents.length,
                generatedCellKeys: {
                    ...(current.generatedCellKeys || {}),
                    ...Object.fromEntries(
                        current.cells
                            .filter((cell) => documents.some((document) => document.gridCell?.id === cell.id))
                            .map((cell) => [cell.id, getCellGenerationKey(cell)])
                    ),
                },
            } : current);
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

    const detectGridAutomatically = async () => {
        if (!gridDraft?.source) return;
        setIsDetectingGrid(true);
        try {
            const analysis = await detectGridInWorker(gridDraft.source);
            setGridDraft((current) => {
                if (!current) return current;
                const nextDraft = createGridDraftFromAnalysis(current.source, analysis);
                return {
                    ...nextDraft,
                    warnings: analysis.confidence < 0.68
                        ? ['Confianza baja: revisa y corrige el grid manualmente antes de generar recortes.', ...analysis.warnings]
                        : analysis.warnings,
                };
            });
        } catch (error) {
            console.error('Error en deteccion automatica:', error);
            setGridDraft((current) => current ? {
                ...current,
                confidence: 0,
                warnings: ['No se pudo detectar automaticamente. Continua con el grid manual.'],
            } : current);
        } finally {
            setIsDetectingGrid(false);
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

    const exportToZip = () => generateEmotesZip(emotes, assets, setIsExporting);

    return {
        theme, setTheme,
        fileInputRef,
        emotes,
        assets,
        activeId, setActiveId,
        activeEmote, activeAsset, activePreviewUrl, updateActiveEmote, updateActivePreview,
        gridDraft, updateGridDraft, closeGridDraft, generateGridEmotes, detectGridAutomatically, isGeneratingGrid, isDetectingGrid,
        isEyedropperActive, setIsEyedropperActive,
        isExporting,
        processFiles, handleFileInput, triggerUpload,
        handleRemoveActive, saveToHistory, undo, exportToZip
    };
}

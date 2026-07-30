import { useState, useRef, useEffect, useCallback } from 'react';
import { generateEmotesZip } from '../utils/exportUtils';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { releaseAllResources, releasePreviewForEmote, releasePreviewsForRemovedEmotes, releaseUnusedAssets, revokeAsset, revokeGridDraft, revokePreview } from '../features/editor/model/resourceLifecycle';
import { trimEmoteToContent } from '../features/editor/imagePipeline/trimContent';
import { createGridDraft, createGridDraftFromAnalysis } from '../features/grid-import/gridSegmentation/gridDraft';
import { extractGridCellsToDocuments, getCellGenerationKey, upsertGridCellDocuments } from '../features/grid-import/gridSegmentation/extractGridCells';
import { startGridDetection } from '../features/grid-import/gridDetection/runGridDetection';
import {
    createImageAssetFromFile,
    validateDecodedImageDimensions,
    validateImageFile,
} from '../shared/files/imageValidation';

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

function cloneSettings(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createSettingsPatch(emote, parts = ['adjustments', 'background', 'fit', 'outline']) {
    const patch = {};
    if (!emote) return patch;

    if (parts.includes('adjustments')) {
        patch.adjustments = cloneSettings(emote.adjustments);
    }

    if (parts.includes('background')) {
        patch.backgroundRemoval = cloneSettings(emote.backgroundRemoval);
        patch.erasurePoints = cloneSettings(emote.erasurePoints || []);
        patch.restorePoints = cloneSettings(emote.restorePoints || []);
        patch.tolerance = emote.tolerance;
    }

    if (parts.includes('fit')) {
        patch.fitMode = emote.fitMode || 'contain';
        patch.padding = emote.padding || 0;
        patch.frame = cloneSettings(emote.frame || { zoom: 1, offsetX: 0, offsetY: 0 });
    }

    if (parts.includes('outline')) {
        patch.outline = cloneSettings(emote.outline);
        patch.isAutoOutlineActive = Boolean(emote.isAutoOutlineActive || emote.outline?.enabled);
    }

    return patch;
}

function mergeValidationWarnings(validation, warnings) {
    const nextWarnings = Array.from(new Set([...(validation?.warnings || []), ...warnings]));
    return {
        errors: validation?.errors || [],
        warnings: nextWarnings,
    };
}

function hasWarnings(emote) {
    return (emote.validation?.warnings?.length || 0) > 0 || (emote.validation?.errors?.length || 0) > 0;
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
    const detectionRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [assets, setAssets] = useState({});
    const [previewUrls, setPreviewUrls] = useState({});
    const [activeId, setActiveId] = useState(null);
    const [selectedEmoteIds, setSelectedEmoteIds] = useState([]);
    const [settingsClipboard, setSettingsClipboard] = useState(null);
    const [comparisonMode, setComparisonMode] = useState('after');
    const [gridDraft, setGridDraft] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
    const [isDetectingGrid, setIsDetectingGrid] = useState(false);
    const [isTrimmingBatch, setIsTrimmingBatch] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);
    const activeAsset = activeEmote ? assets[activeEmote.sourceId] : null;
    const activePreviewUrl = activeEmote ? previewUrls[activeEmote.id] : null;

    useEffect(() => {
        emotesRef.current = emotes;
        assetsRef.current = assets;
        previewUrlsRef.current = previewUrls;
        gridDraftRef.current = gridDraft;
    }, [emotes, assets, previewUrls, gridDraft]);

    useEffect(() => () => {
        detectionRef.current?.cancel?.();
        releaseAllResources({
            assets: assetsRef.current,
            previewUrls: previewUrlsRef.current,
            gridDraft: gridDraftRef.current,
        });
    }, []);

    useEffect(() => {
        setSelectedEmoteIds((current) => {
            const validIds = new Set(emotes.map((emote) => emote.id));
            const next = current.filter((id) => validIds.has(id));
            return next.length === current.length ? current : next;
        });
    }, [emotes]);

    const getTargetEmoteIds = useCallback(() => {
        return selectedEmoteIds.length > 0
            ? selectedEmoteIds
            : activeId ? [activeId] : [];
    }, [activeId, selectedEmoteIds]);

    const clearPreviewsForIds = useCallback((ids) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        setPreviewUrls((current) => {
            const next = { ...current };
            ids.forEach((id) => {
                revokePreview(next[id]);
                delete next[id];
            });
            previewUrlsRef.current = next;
            return Object.keys(current).some((id) => idSet.has(id)) ? next : current;
        });
    }, []);

    const updateActiveEmote = useCallback((updates) => {
        if (!activeId) return;
        setEmotes(prev => prev.map(e => e.id === activeId ? mergeEmoteUpdates(e, updates) : e));
        clearPreviewsForIds([activeId]);
    }, [activeId, clearPreviewsForIds]);

    const updateSelectedOrActiveEmotes = useCallback((updates) => {
        const targetIds = getTargetEmoteIds();
        if (targetIds.length === 0) return;
        const targetSet = new Set(targetIds);
        setEmotes((current) => current.map((emote) => (
            targetSet.has(emote.id)
                ? mergeEmoteUpdates(emote, typeof updates === 'function' ? updates(emote) : updates)
                : emote
        )));
        clearPreviewsForIds(targetIds);
    }, [clearPreviewsForIds, getTargetEmoteIds]);

    const toggleEmoteSelection = useCallback((id) => {
        setSelectedEmoteIds((current) => current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id]);
    }, []);

    const selectAllEmotes = useCallback(() => {
        setSelectedEmoteIds(emotesRef.current.map((emote) => emote.id));
    }, []);

    const selectNoEmotes = useCallback(() => {
        setSelectedEmoteIds([]);
    }, []);

    const invertEmoteSelection = useCallback(() => {
        setSelectedEmoteIds((current) => {
            const selected = new Set(current);
            return emotesRef.current
                .map((emote) => emote.id)
                .filter((id) => !selected.has(id));
        });
    }, []);

    const selectWarningEmotes = useCallback(() => {
        setSelectedEmoteIds(emotesRef.current.filter(hasWarnings).map((emote) => emote.id));
    }, []);

    const copyActiveSettings = useCallback(() => {
        if (!activeEmote) return;
        setSettingsClipboard(createSettingsPatch(activeEmote));
    }, [activeEmote]);

    const pasteSettingsToSelected = useCallback(() => {
        if (!settingsClipboard) return;
        updateSelectedOrActiveEmotes(cloneSettings(settingsClipboard));
    }, [settingsClipboard, updateSelectedOrActiveEmotes]);

    const applyActiveSettingsToSelected = useCallback((parts) => {
        if (!activeEmote || selectedEmoteIds.length === 0) return;
        const patch = createSettingsPatch(activeEmote, parts);
        const targetSet = new Set(selectedEmoteIds);
        setEmotes((current) => current.map((emote) => (
            targetSet.has(emote.id) ? mergeEmoteUpdates(emote, cloneSettings(patch)) : emote
        )));
        clearPreviewsForIds(selectedEmoteIds);
    }, [activeEmote, clearPreviewsForIds, selectedEmoteIds]);

    const trimSelectedEmotes = useCallback(async () => {
        const targetIds = getTargetEmoteIds();
        if (targetIds.length === 0) return;
        const targetSet = new Set(targetIds);
        setIsTrimmingBatch(true);
        try {
            const updatesById = {};
            const targets = emotesRef.current.filter((emote) => targetSet.has(emote.id));
            for (const emote of targets) {
                const asset = assetsRef.current[emote.sourceId];
                if (!asset) {
                    updatesById[emote.id] = {
                        validation: mergeValidationWarnings(emote.validation, ['No se encontro el asset fuente para trim.']),
                    };
                    continue;
                }

                try {
                    const trim = await trimEmoteToContent(emote, asset);
                    updatesById[emote.id] = {
                        cropRect: trim.cropRect,
                        trim: trim.diagnostics,
                        validation: mergeValidationWarnings(emote.validation, trim.warnings),
                    };
                } catch (error) {
                    updatesById[emote.id] = {
                        validation: mergeValidationWarnings(emote.validation, [error.message || 'No se pudo aplicar trim automatico.']),
                    };
                }
            }

            setEmotes((current) => current.map((emote) => (
                updatesById[emote.id] ? mergeEmoteUpdates(emote, updatesById[emote.id]) : emote
            )));
            clearPreviewsForIds(targetIds);
        } finally {
            setIsTrimmingBatch(false);
        }
    }, [clearPreviewsForIds, getTargetEmoteIds]);

    const updateActivePreview = useCallback((emoteId, blob) => {
        const nextUrl = URL.createObjectURL(blob);
        setPreviewUrls((current) => {
            revokePreview(current[emoteId]);
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
                detectionRef.current?.cancel?.();
                detectionRef.current = null;
                setIsDetectingGrid(false);
                setGridDraft((current) => {
                    revokeGridDraft(current, assetsRef.current);
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
                Object.values(createdAssets).forEach(revokeAsset);
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
            return releasePreviewForEmote(currentUrls, current?.id);
        });
        setSelectedEmoteIds((currentSelection) => currentSelection.filter((id) => id !== current?.id));
        setActiveId(next[0]?.id || null);
        setIsEyedropperActive(false);
    };

    const closeGridDraft = () => {
        setGridDraft((current) => {
            revokeGridDraft(current, assetsRef.current);
            return null;
        });
    };

    const generateGridEmotes = async () => {
        if (!gridDraft) return;
        setIsGeneratingGrid(true);
        try {
            const documents = extractGridCellsToDocuments(gridDraft, emotesRef.current);
            const nextEmotes = upsertGridCellDocuments(emotesRef.current, gridDraft, documents);
            setAssets((current) => {
                const next = { ...current, [gridDraft.source.id]: gridDraft.source };
                assetsRef.current = next;
                return next;
            });
            setEmotes(nextEmotes);
            emotesRef.current = nextEmotes;
            setGridDraft(current => current ? {
                ...current,
                generatedCount: current.generatedCount + documents.length,
                generatedCellKeys: Object.fromEntries(
                    current.cells
                        .filter((cell) => cell.enabled && !cell.empty)
                        .map((cell) => [cell.id, getCellGenerationKey(cell)])
                ),
            } : current);
            setAssets((currentAssets) => {
                const nextAssets = releaseUnusedAssets(currentAssets, nextEmotes, gridDraft);
                assetsRef.current = nextAssets;
                return nextAssets;
            });
            setPreviewUrls((currentUrls) => {
                const nextUrls = releasePreviewsForRemovedEmotes(currentUrls, nextEmotes);
                previewUrlsRef.current = nextUrls;
                return nextUrls;
            });
            if (documents.length > 0) {
                setActiveId(documents[0].id);
                setSelectedEmoteIds(documents.map((document) => document.id));
            } else if (activeId && !nextEmotes.some((emote) => emote.id === activeId)) {
                setActiveId(nextEmotes[0]?.id || null);
                setSelectedEmoteIds([]);
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
        detectionRef.current?.cancel?.();
        const sourceId = gridDraft.source.id;
        const request = startGridDetection(gridDraft.source);
        detectionRef.current = request;
        setIsDetectingGrid(true);
        try {
            const analysis = await request.promise;
            if (
                detectionRef.current?.requestId !== request.requestId ||
                detectionRef.current?.sourceId !== sourceId ||
                gridDraftRef.current?.source?.id !== sourceId
            ) {
                return;
            }
            setGridDraft((current) => {
                if (!current || current.source.id !== sourceId) return current;
                const nextDraft = createGridDraftFromAnalysis(current.source, analysis);
                return {
                    ...nextDraft,
                    warnings: analysis.confidence < 0.68
                        ? ['Confianza baja: revisa y corrige el grid manualmente antes de generar recortes.', ...analysis.warnings]
                        : analysis.warnings,
                };
            });
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error en deteccion automatica:', error);
            setGridDraft((current) => current ? {
                ...current,
                confidence: 0,
                warnings: ['No se pudo detectar automaticamente. Continua con el grid manual.'],
            } : current);
        } finally {
            if (detectionRef.current?.requestId === request.requestId) {
                detectionRef.current = null;
                setIsDetectingGrid(false);
            }
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
        selectedEmoteIds, toggleEmoteSelection, selectAllEmotes, selectNoEmotes, invertEmoteSelection, selectWarningEmotes,
        activeEmote, activeAsset, activePreviewUrl, updateActiveEmote, updateSelectedOrActiveEmotes, updateActivePreview,
        copyActiveSettings, pasteSettingsToSelected, applyActiveSettingsToSelected, settingsClipboard,
        trimSelectedEmotes, isTrimmingBatch,
        comparisonMode, setComparisonMode,
        gridDraft, updateGridDraft, closeGridDraft, generateGridEmotes, detectGridAutomatically, isGeneratingGrid, isDetectingGrid,
        isEyedropperActive, setIsEyedropperActive,
        isExporting,
        processFiles, handleFileInput, triggerUpload,
        handleRemoveActive, saveToHistory, undo, exportToZip
    };
}

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { buildEmotesZip, createValidatedEmoteOutput, getOutputRules, getPresetById } from '../utils/exportUtils';
import { createEmoteDocumentFromAsset } from '../features/editor/model/createEmoteDocument';
import { createEmoteVariant } from '../features/editor/model/variants';
import { releaseAllResources, releasePreviewForEmote, releasePreviewsForRemovedEmotes, releaseUnusedAssets, revokeAsset, revokeGridDraft, revokePreview } from '../features/editor/model/resourceLifecycle';
import { DEFAULT_BACKGROUND_REMOVAL_V2, analyzeEmoteBackgroundRemovalV2, getBackgroundRemovalV2Preset } from '../features/editor/imagePipeline/backgroundRemovalV2';
import { trimEmoteToContent } from '../features/editor/imagePipeline/trimContent';
import { createGridDraft, createGridDraftFromAnalysis } from '../features/grid-import/gridSegmentation/gridDraft';
import { extractGridCellsToDocuments, getCellGenerationKey, upsertGridCellDocuments } from '../features/grid-import/gridSegmentation/extractGridCells';
import { startGridDetection } from '../features/grid-import/gridDetection/runGridDetection';
import { useProjectPersistence } from '../features/projects/hooks/useProjectPersistence';
import { createPerformanceSummary } from '../features/performance/memoryStats';
import { previewCache } from '../features/performance/previewCache';
import {
    createImageAssetFromFile,
    validateDecodedImageDimensions,
    validateImageFile,
} from '../shared/files/imageValidation';
import { sanitizeName } from '../shared/files/names';

const ACTIVE_EXPORT_STATUSES = new Set(['pending', 'processing', 'compressing']);
const APP_VERSION = '1.0.0-beta.2';

function formatValidationMessages(messages) {
    return messages.filter(Boolean).join('\n');
}

function mergeEmoteUpdates(emote, updates) {
    const { replaceBackgroundRemoval, ...restUpdates } = updates;
    const backgroundRemoval = replaceBackgroundRemoval
        ? { ...(updates.backgroundRemoval || {}) }
        : {
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
        ...restUpdates,
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
        patch.backgroundRemoval = {
            ...cloneSettings(emote.backgroundRemoval),
            erasurePoints: [],
            restorePoints: [],
        };
        patch.erasurePoints = [];
        patch.restorePoints = [];
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

function createValidationWarning(category, code, message) {
    return { category, code, message };
}

function warningCategory(warning) {
    return typeof warning === 'object' && warning !== null ? warning.category : null;
}

function replaceValidationWarnings(validation, category, warnings) {
    const keptWarnings = (validation?.warnings || []).filter((warning) => warningCategory(warning) !== category);
    return {
        errors: validation?.errors || [],
        warnings: [...keptWarnings, ...warnings],
    };
}

function hasWarnings(emote) {
    return (emote.validation?.warnings?.length || 0) > 0 || (emote.validation?.errors?.length || 0) > 0;
}

function createDefaultBackgroundRemovalV2() {
    return {
        ...DEFAULT_BACKGROUND_REMOVAL_V2,
        samples: [],
        removedRatio: 0,
        removedPixels: 0,
        warnings: [],
        erasurePoints: [],
        restorePoints: [],
    };
}

function createManualBackgroundRemoval() {
    return {
        mode: 'manual-flood-fill',
        tolerance: 30,
        erasurePoints: [],
        restorePoints: [],
    };
}

function createBackgroundWarning(message, code = 'background-removal-v2') {
    return createValidationWarning('backgroundRemoval', code, message);
}

function base64ToPngBlob(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: 'image/png' });
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
    const exportAbortRef = useRef(null);
    const exportDownloadUrlRef = useRef(null);
    const exportRunIdRef = useRef(0);
    const exportStateRef = useRef(null);

    const [emotes, setEmotes] = useState([]);
    const [assets, setAssets] = useState({});
    const [previewUrls, setPreviewUrls] = useState({});
    const [activeId, setActiveId] = useState(null);
    const [selectedEmoteIds, setSelectedEmoteIds] = useState([]);
    const [settingsClipboard, setSettingsClipboard] = useState(null);
    const [comparisonMode, setComparisonMode] = useState('after');
    const [activeMetrics, setActiveMetrics] = useState(null);
    const [exportOptions, setExportOptions] = useState({
        presetId: 'twitch-static-manual',
        scope: 'all',
        activeOutputSize: 112,
        customSize: 512,
        includeContactSheet: false,
    });
    const [exportState, setExportState] = useState({
        status: 'idle',
        runId: null,
        progress: null,
        summary: null,
        manifest: null,
        report: null,
        downloadUrl: null,
        fileName: null,
        error: null,
    });
    const [gridDraft, setGridDraft] = useState(null);

    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
    const [isDetectingGrid, setIsDetectingGrid] = useState(false);
    const [isTrimmingBatch, setIsTrimmingBatch] = useState(false);
    const [isApplyingBackgroundV2, setIsApplyingBackgroundV2] = useState(false);

    const activeEmote = emotes.find(e => e.id === activeId);
    const activeAsset = activeEmote ? assets[activeEmote.sourceId] : null;
    const activePreviewUrl = activeEmote ? previewUrls[activeEmote.id] : null;
    const visibleActiveMetrics = activeMetrics?.emoteId === activeId ? activeMetrics.metrics : null;
    const performanceStats = useMemo(() => createPerformanceSummary({
        assets,
        emotes,
        previewUrls,
        cacheStats: previewCache.stats(),
    }), [assets, emotes, previewUrls]);

    useEffect(() => {
        emotesRef.current = emotes;
        assetsRef.current = assets;
        previewUrlsRef.current = previewUrls;
        gridDraftRef.current = gridDraft;
        exportDownloadUrlRef.current = exportState.downloadUrl;
        exportStateRef.current = exportState;
    }, [emotes, assets, previewUrls, gridDraft, exportState]);

    useEffect(() => () => {
        detectionRef.current?.cancel?.();
        exportAbortRef.current?.abort();
        if (exportDownloadUrlRef.current) URL.revokeObjectURL(exportDownloadUrlRef.current);
        releaseAllResources({
            assets: assetsRef.current,
            previewUrls: previewUrlsRef.current,
            gridDraft: gridDraftRef.current,
        });
        previewCache.clear();
    }, []);

    useEffect(() => {
        setSelectedEmoteIds((current) => {
            const validIds = new Set(emotes.map((emote) => emote.id));
            const next = current.filter((id) => validIds.has(id));
            return next.length === current.length ? current : next;
        });
    }, [emotes]);

    const getProjectSnapshot = useCallback(() => ({
        appVersion: APP_VERSION,
        theme,
        assets: assetsRef.current,
        emotes: emotesRef.current,
        gridDraft: gridDraftRef.current,
        activeId,
        selectedEmoteIds,
        exportOptions,
        settingsClipboard,
    }), [activeId, exportOptions, selectedEmoteIds, settingsClipboard, theme]);

    const clearProjectSnapshot = useCallback(() => {
        detectionRef.current?.cancel?.();
        exportAbortRef.current?.abort();
        releaseAllResources({
            assets: assetsRef.current,
            previewUrls: previewUrlsRef.current,
            gridDraft: gridDraftRef.current,
        });
        previewCache.clear();
        assetsRef.current = {};
        emotesRef.current = [];
        previewUrlsRef.current = {};
        gridDraftRef.current = null;
        setAssets({});
        setEmotes([]);
        setPreviewUrls({});
        setActiveMetrics(null);
        setGridDraft(null);
        setActiveId(null);
        setSelectedEmoteIds([]);
        setSettingsClipboard(null);
        setIsEyedropperActive(false);
        setExportState({
            status: 'idle',
            runId: null,
            progress: null,
            summary: null,
            manifest: null,
            report: null,
            downloadUrl: null,
            fileName: null,
            error: null,
        });
    }, []);

    const restoreProjectSnapshot = useCallback((project) => {
        releaseAllResources({
            assets: assetsRef.current,
            previewUrls: previewUrlsRef.current,
            gridDraft: gridDraftRef.current,
        });
        previewCache.clear();
        assetsRef.current = project.assets || {};
        emotesRef.current = project.emotes || [];
        previewUrlsRef.current = {};
        gridDraftRef.current = project.gridDraft || null;
        setTheme(project.theme || 'dark');
        setAssets(project.assets || {});
        setEmotes(project.emotes || []);
        setPreviewUrls({});
        setActiveMetrics(null);
        setGridDraft(project.gridDraft || null);
        setActiveId(project.activeId || project.emotes?.[0]?.id || null);
        setSelectedEmoteIds(project.selectedEmoteIds || []);
        setExportOptions((current) => ({ ...current, ...(project.exportOptions || {}) }));
        setSettingsClipboard(project.settingsClipboard || null);
        setIsEyedropperActive(false);
    }, []);

    const projectPersistence = useProjectPersistence({
        getSnapshot: getProjectSnapshot,
        restoreSnapshot: restoreProjectSnapshot,
        clearSnapshot: clearProjectSnapshot,
        dirtyKey: JSON.stringify({
            emotes: emotes.map((emote) => [emote.id, emote.name, emote.cropRect, emote.fitMode, emote.padding, emote.frame, emote.backgroundRemoval, emote.adjustments, emote.outline, emote.variants]),
            assets: Object.keys(assets),
            gridDraftId: gridDraft?.id,
            gridCells: gridDraft?.cells?.map((cell) => [cell.id, cell.enabled, cell.empty, cell.name, cell.sourceRect, cell.contentRect]),
            activeId,
            selectedEmoteIds,
            exportOptions,
        }),
        hasContent: emotes.length > 0 || Boolean(gridDraft),
        isStable: !isGeneratingGrid && !isDetectingGrid && !isExporting && !isTrimmingBatch && !isApplyingBackgroundV2,
        appVersion: APP_VERSION,
    });

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

    const createVariantFromActive = useCallback((label = 'variant') => {
        if (!activeId) return null;
        const baseEmote = emotesRef.current.find((emote) => emote.id === activeId);
        if (!baseEmote) return null;
        const createdVariant = createEmoteVariant(baseEmote, emotesRef.current, label);
        const nextEmotes = [...emotesRef.current, createdVariant];
        emotesRef.current = nextEmotes;
        setEmotes(nextEmotes);
        setActiveId(createdVariant.id);
        setSelectedEmoteIds([createdVariant.id]);
        return createdVariant;
    }, [activeId]);

    const updateBackgroundRemovalV2Params = useCallback((updates) => {
        updateSelectedOrActiveEmotes((emote) => ({
            backgroundRemoval: {
                ...createDefaultBackgroundRemovalV2(),
                ...(emote.backgroundRemoval?.version === 2 ? emote.backgroundRemoval : {}),
                ...updates,
                version: 2,
                samples: updates.samples ?? emote.backgroundRemoval?.samples ?? [],
                erasurePoints: emote.backgroundRemoval?.erasurePoints || [],
                restorePoints: emote.backgroundRemoval?.restorePoints || [],
            },
        }));
    }, [updateSelectedOrActiveEmotes]);

    const resetBackgroundRemovalV2 = useCallback(() => {
        updateSelectedOrActiveEmotes((emote) => ({
            backgroundRemoval: createDefaultBackgroundRemovalV2(),
            erasurePoints: [],
            restorePoints: [],
            validation: replaceValidationWarnings(emote.validation, 'backgroundRemoval', []),
        }));
    }, [updateSelectedOrActiveEmotes]);

    const removeBackgroundRemovalV2 = useCallback(() => {
        updateSelectedOrActiveEmotes((emote) => ({
            backgroundRemoval: createManualBackgroundRemoval(),
            replaceBackgroundRemoval: true,
            erasurePoints: [],
            restorePoints: [],
            validation: replaceValidationWarnings(emote.validation, 'backgroundRemoval', []),
        }));
    }, [updateSelectedOrActiveEmotes]);

    const applyBackgroundRemovalV2Params = useCallback((scope = 'targets') => {
        if (!activeEmote) return;
        const patch = {
            backgroundRemoval: {
                ...createDefaultBackgroundRemovalV2(),
                ...(activeEmote.backgroundRemoval?.version === 2 ? activeEmote.backgroundRemoval : {}),
                samples: [],
                removedRatio: 0,
                removedPixels: 0,
                warnings: [],
                erasurePoints: [],
                restorePoints: [],
            },
            erasurePoints: [],
            restorePoints: [],
        };
        const targetIds = scope === 'all'
            ? emotesRef.current.map((emote) => emote.id)
            : scope === 'active'
                ? [activeEmote.id]
                : selectedEmoteIds;
        if (targetIds.length === 0) return;
        const targetSet = new Set(targetIds);
        setEmotes((current) => current.map((emote) => (
            targetSet.has(emote.id) ? mergeEmoteUpdates(emote, cloneSettings(patch)) : emote
        )));
        clearPreviewsForIds(targetIds);
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

    const applyBackgroundRemovalV2 = useCallback(async (scope = 'targets', mode = 'connected', options = {}) => {
        const preset = options.presetId ? getBackgroundRemovalV2Preset(options.presetId) : null;
        const resolvedMode = preset?.mode || mode;
        if (resolvedMode === 'global' && !options.globalConfirmed) {
            const accepted = typeof window === 'undefined'
                ? false
                : window.confirm('Global es agresivo: puede eliminar ojos, dientes, texto y brillos blancos. Usa Connected por defecto. Continuar?');
            if (!accepted) return false;
        }
        const targetIds = scope === 'all'
            ? emotesRef.current.map((emote) => emote.id)
            : scope === 'active'
                ? activeId ? [activeId] : []
                : getTargetEmoteIds();
        if (targetIds.length === 0) return;

        const targetSet = new Set(targetIds);
        setIsApplyingBackgroundV2(true);
        try {
            const updatesById = {};
            const targets = emotesRef.current.filter((emote) => targetSet.has(emote.id));
            for (const emote of targets) {
                const asset = assetsRef.current[emote.sourceId];
                if (!asset) {
                    updatesById[emote.id] = {
                        validation: mergeValidationWarnings(emote.validation, ['No se encontro el asset fuente para fondo v2.']),
                    };
                    continue;
                }

                try {
                    const analysis = await analyzeEmoteBackgroundRemovalV2(emote, asset, {
                        mode: resolvedMode,
                        samples: preset?.samples,
                        tolerance: preset?.tolerance ?? emote.backgroundRemoval?.tolerance ?? emote.tolerance ?? 34,
                        feather: preset?.feather ?? emote.backgroundRemoval?.feather ?? 1,
                        despill: preset?.despill ?? emote.backgroundRemoval?.despill ?? 0.75,
                        brushRadius: preset?.brushRadius ?? emote.backgroundRemoval?.brushRadius ?? 10,
                        excessiveRemovalThreshold: preset?.excessiveRemovalThreshold ?? emote.backgroundRemoval?.excessiveRemovalThreshold ?? 0.72,
                    });
                    const backgroundWarnings = analysis.warnings.map((warning) => createBackgroundWarning(warning, 'background-removal-v2-excessive'));
                    updatesById[emote.id] = {
                        backgroundRemoval: {
                            ...analysis.backgroundRemoval,
                            presetId: preset?.id,
                            mode: resolvedMode,
                            erasurePoints: [],
                            restorePoints: [],
                        },
                        erasurePoints: [],
                        restorePoints: [],
                        validation: replaceValidationWarnings(emote.validation, 'backgroundRemoval', backgroundWarnings),
                    };
                } catch (error) {
                    updatesById[emote.id] = {
                        validation: replaceValidationWarnings(emote.validation, 'backgroundRemoval', [
                            createBackgroundWarning(error.message || 'No se pudo aplicar fondo v2.', 'background-removal-v2-error'),
                        ]),
                    };
                }
            }

            setEmotes((current) => current.map((emote) => (
                updatesById[emote.id] ? mergeEmoteUpdates(emote, updatesById[emote.id]) : emote
            )));
            clearPreviewsForIds(targetIds);
            return true;
        } finally {
            setIsApplyingBackgroundV2(false);
        }
    }, [activeId, clearPreviewsForIds, getTargetEmoteIds]);

    const updateActivePreview = useCallback((emoteId, blob) => {
        const nextUrl = URL.createObjectURL(blob);
        setPreviewUrls((current) => {
            revokePreview(current[emoteId]);
            return { ...current, [emoteId]: nextUrl };
        });
    }, []);

    const updateActiveMetrics = useCallback((emoteId, metrics) => {
        if (emoteId !== activeId) return;
        setActiveMetrics({ emoteId, metrics });
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
        setActiveMetrics(null);
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

    const updateExportOptions = useCallback((updates) => {
        setExportOptions((current) => ({ ...current, ...updates }));
    }, []);

    const getExportTargetEmotes = useCallback((scope = exportOptions.scope) => {
        if (scope === 'active') return activeId ? emotesRef.current.filter((emote) => emote.id === activeId) : [];
        if (scope === 'selected') {
            const selected = new Set(selectedEmoteIds);
            return emotesRef.current.filter((emote) => selected.has(emote.id));
        }
        return emotesRef.current;
    }, [activeId, exportOptions.scope, selectedEmoteIds]);

    const clearPreparedExport = useCallback(() => {
        setExportState((current) => {
            if (current.downloadUrl) URL.revokeObjectURL(current.downloadUrl);
            return {
                status: 'idle',
                runId: null,
                progress: null,
                summary: null,
                manifest: null,
                report: null,
                downloadUrl: null,
                fileName: null,
                error: null,
            };
        });
    }, []);

    const prepareExport = useCallback(async (overrides = {}) => {
        const nextOptions = { ...exportOptions, ...overrides };
        const targets = getExportTargetEmotes(nextOptions.scope);
        if (targets.length === 0) return null;

        exportAbortRef.current?.abort();
        const runId = exportRunIdRef.current + 1;
        exportRunIdRef.current = runId;
        const controller = new AbortController();
        exportAbortRef.current = controller;
        setIsExporting(true);
        setExportState((current) => {
            if (current.downloadUrl) URL.revokeObjectURL(current.downloadUrl);
            return {
                status: 'pending',
                runId,
                progress: { processedEmotes: 0, totalEmotes: targets.length, processedFiles: 0, totalFiles: 0 },
                summary: null,
                manifest: null,
                report: null,
                downloadUrl: null,
                fileName: null,
                error: null,
            };
        });

        try {
            const result = await buildEmotesZip(targets, assetsRef.current, {
                presetId: nextOptions.presetId,
                signal: controller.signal,
                onProgress: (progress) => {
                    if (exportRunIdRef.current !== runId) return;
                    setExportState((current) => ({
                        ...current,
                        status: progress.status === 'pending' ? 'pending' : 'processing',
                        progress,
                    }));
                },
            });
            if (exportRunIdRef.current !== runId) return null;
            if (controller.signal.aborted) {
                const error = new Error('Exportacion cancelada.');
                error.name = 'AbortError';
                throw error;
            }
            setExportState((current) => exportRunIdRef.current === runId ? {
                ...current,
                status: 'compressing',
                progress: {
                    ...current.progress,
                    currentFile: 'Finalizando ZIP',
                },
            } : current);
            const blob = await result.zip.generateAsync({ type: 'blob' });
            if (exportRunIdRef.current !== runId) return null;
            if (controller.signal.aborted) {
                const error = new Error('Exportacion cancelada.');
                error.name = 'AbortError';
                throw error;
            }
            const downloadUrl = URL.createObjectURL(blob);
            const fileName = `${sanitizeName(`emotes-${nextOptions.presetId}`)}.zip`;
            if (exportRunIdRef.current !== runId) {
                URL.revokeObjectURL(downloadUrl);
                return null;
            }
            setExportState({
                status: result.report.status,
                runId,
                progress: { processedEmotes: targets.length, totalEmotes: targets.length, processedFiles: result.report.summary.totalOutputs, totalFiles: result.report.summary.totalOutputs },
                summary: result.report.summary,
                manifest: result.manifest,
                report: result.report,
                downloadUrl,
                fileName,
                error: null,
            });
            return result;
        } catch (error) {
            if (exportRunIdRef.current !== runId) return null;
            if (error.name === 'AbortError') {
                setExportState((current) => ACTIVE_EXPORT_STATUSES.has(current.status) || current.status === 'canceled'
                    ? { ...current, status: 'canceled', error: null }
                    : current);
                return null;
            }
            setExportState((current) => ({ ...current, status: 'invalid', error: error.message || 'No se pudo preparar la exportacion.' }));
            return null;
        } finally {
            if (exportRunIdRef.current === runId) {
                if (exportAbortRef.current === controller) exportAbortRef.current = null;
                setIsExporting(false);
            }
        }
    }, [exportOptions, getExportTargetEmotes]);

    const cancelExport = useCallback(() => {
        const currentExport = exportStateRef.current;
        if (!ACTIVE_EXPORT_STATUSES.has(currentExport?.status)) return;
        exportAbortRef.current?.abort();
        setExportState((current) => ACTIVE_EXPORT_STATUSES.has(current.status)
            ? { ...current, status: 'canceled', error: null }
            : current);
        setIsExporting(false);
    }, []);

    const retryExport = useCallback(() => prepareExport(), [prepareExport]);

    const downloadPreparedExport = useCallback(() => {
        if (!exportState.downloadUrl) return;
        const a = document.createElement('a');
        a.href = exportState.downloadUrl;
        a.download = exportState.fileName || 'emotes.zip';
        a.click();
    }, [exportState.downloadUrl, exportState.fileName]);

    const downloadActivePng = useCallback(async () => {
        if (!activeEmote || !activeAsset) return;
        const preset = getPresetById(exportOptions.presetId);
        const outputRules = getOutputRules(preset, activeEmote, activeAsset, exportOptions);
        const outputRule = preset.id === 'twitch-static-manual'
            ? outputRules.find((rule) => rule.width === exportOptions.activeOutputSize) || outputRules[0]
            : outputRules[0];
        const safeName = sanitizeName(activeEmote.name);
        const { encoded, validation } = await createValidatedEmoteOutput(activeEmote, activeAsset, preset, outputRule, safeName);

        if (!validation.valid) {
            const summary = {
                totalItems: 1,
                validItems: 0,
                invalidItems: 1,
                totalOutputs: 1,
                validOutputs: 0,
                invalidOutputs: 1,
                totalBytes: encoded.bytes || 0,
            };
            setExportState({
                status: 'invalid',
                runId: null,
                progress: null,
                summary,
                manifest: null,
                report: {
                    preset: preset.id,
                    status: 'invalid',
                    summary,
                    items: [{
                        id: activeEmote.id,
                        name: safeName,
                        status: 'invalid',
                        valid: false,
                        outputs: [{
                            status: 'invalid',
                            valid: false,
                            errors: validation.errors,
                            warnings: validation.warnings,
                        }],
                        errors: validation.errors,
                        warnings: validation.warnings,
                    }],
                },
                downloadUrl: null,
                fileName: null,
                error: validation.errors.join(' '),
            });
            return null;
        }

        const blob = encoded.blob || base64ToPngBlob(encoded.base64);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}_${outputRule.suffix || outputRule.width || 'master'}.png`;
        a.click();
        URL.revokeObjectURL(url);
        const summary = {
            totalItems: 1,
            validItems: 1,
            invalidItems: 0,
            totalOutputs: 1,
            validOutputs: 1,
            invalidOutputs: 0,
            totalBytes: encoded.bytes || 0,
        };
        setExportState({
            status: 'valid',
            runId: null,
            progress: null,
            summary,
            manifest: null,
            report: {
                preset: preset.id,
                status: 'valid',
                summary,
                items: [{
                    id: activeEmote.id,
                    name: safeName,
                    status: 'valid',
                    valid: true,
                    outputs: [{
                        status: 'valid',
                        valid: true,
                        errors: [],
                        warnings: validation.warnings,
                    }],
                    errors: [],
                    warnings: validation.warnings,
                }],
            },
            downloadUrl: null,
            fileName: null,
            error: null,
        });
        return { encoded, validation };
    }, [activeAsset, activeEmote, exportOptions]);

    const exportToZip = prepareExport;

    return {
        theme, setTheme,
        fileInputRef,
        emotes,
        assets,
        activeId, setActiveId,
        selectedEmoteIds, toggleEmoteSelection, selectAllEmotes, selectNoEmotes, invertEmoteSelection, selectWarningEmotes,
        activeEmote, activeAsset, activePreviewUrl, activeMetrics: visibleActiveMetrics, updateActiveEmote, updateSelectedOrActiveEmotes, updateActivePreview, updateActiveMetrics,
        copyActiveSettings, pasteSettingsToSelected, applyActiveSettingsToSelected, createVariantFromActive, settingsClipboard,
        trimSelectedEmotes, isTrimmingBatch,
        applyBackgroundRemovalV2, updateBackgroundRemovalV2Params, resetBackgroundRemovalV2, removeBackgroundRemovalV2, applyBackgroundRemovalV2Params, isApplyingBackgroundV2,
        comparisonMode, setComparisonMode,
        projectPersistence,
        performanceStats,
        exportOptions, updateExportOptions, exportState, prepareExport, cancelExport, retryExport, downloadPreparedExport, downloadActivePng, clearPreparedExport,
        gridDraft, updateGridDraft, closeGridDraft, generateGridEmotes, detectGridAutomatically, isGeneratingGrid, isDetectingGrid,
        isEyedropperActive, setIsEyedropperActive,
        isExporting,
        processFiles, handleFileInput, triggerUpload,
        handleRemoveActive, saveToHistory, undo, exportToZip
    };
}

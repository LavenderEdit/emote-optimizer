import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmoteBatch } from './useEmoteBatch';

const detectionMock = vi.hoisted(() => ({
    requests: [],
    startGridDetection: vi.fn((asset) => {
        let resolvePromise;
        let rejectPromise;
        const request = {
            requestId: `request-${detectionMock.requests.length + 1}`,
            sourceId: asset.id,
            promise: new Promise((resolve, reject) => {
                resolvePromise = resolve;
                rejectPromise = reject;
            }),
            cancel: vi.fn(() => {
                const error = new Error('cancelled');
                error.name = 'AbortError';
                rejectPromise(error);
            }),
        };
        detectionMock.requests.push({ request, resolve: resolvePromise, reject: rejectPromise, asset });
        return request;
    }),
}));

const trimMock = vi.hoisted(() => ({
    trimEmoteToContent: vi.fn(),
}));

const backgroundV2Mock = vi.hoisted(() => ({
    analyzeEmoteBackgroundRemovalV2: vi.fn(),
}));

vi.mock('../features/grid-import/gridDetection/runGridDetection', () => ({
    startGridDetection: detectionMock.startGridDetection,
}));

vi.mock('../features/editor/imagePipeline/trimContent', () => ({
    trimEmoteToContent: trimMock.trimEmoteToContent,
}));

vi.mock('../features/editor/imagePipeline/backgroundRemovalV2', () => ({
    DEFAULT_BACKGROUND_REMOVAL_V2: {
        version: 2,
        mode: 'connected',
        tolerance: 34,
        feather: 1,
        despill: 0.75,
        excessiveRemovalThreshold: 0.72,
        brushRadius: 10,
    },
    analyzeEmoteBackgroundRemovalV2: backgroundV2Mock.analyzeEmoteBackgroundRemovalV2,
}));

describe('useEmoteBatch', () => {
    beforeEach(() => {
        detectionMock.requests.length = 0;
        detectionMock.startGridDetection.mockClear();
        trimMock.trimEmoteToContent.mockReset();
        backgroundV2Mock.analyzeEmoteBackgroundRemovalV2.mockReset();
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('confirm', vi.fn(() => true));
        vi.stubGlobal('Image', class {
            set src(value) {
                this._src = value;
                this.width = 100;
                this.height = 100;
                this.naturalWidth = 100;
                this.naturalHeight = 100;
                setTimeout(() => this.onload?.(), 0);
            }
        });
        vi.spyOn(URL, 'createObjectURL').mockImplementation((file) => `blob:${file.name || 'preview'}`);
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    it('imports a grid asset and prevents accidental duplicate generation', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });

        expect(result.current.gridDraft).toBeTruthy();
        expect(result.current.emotes).toHaveLength(0);

        await act(async () => {
            await result.current.generateGridEmotes();
        });

        expect(result.current.emotes).toHaveLength(25);
        expect(Object.keys(result.current.assets)).toEqual([result.current.gridDraft.source.id]);
        expect(result.current.emotes.every((emote) => !('originalSrc' in emote))).toBe(true);

        await act(async () => {
            await result.current.generateGridEmotes();
        });

        expect(result.current.emotes).toHaveLength(25);
    });

    it('replaces a regenerated cell document instead of keeping old and new versions', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });

        const firstDocument = result.current.emotes[0];
        await act(async () => {
            result.current.updateActiveEmote({ padding: 0.22 });
        });
        await act(async () => {
            result.current.updateGridDraft((draft) => ({
                ...draft,
                cells: draft.cells.map((cell, index) => index === 0
                    ? { ...cell, name: 'renamed', contentRect: { ...cell.contentRect, x: cell.contentRect.x + 3 } }
                    : cell),
            }));
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });

        const regeneratedDocuments = result.current.emotes.filter((emote) => emote.id === firstDocument.id);
        expect(regeneratedDocuments).toHaveLength(1);
        expect(result.current.emotes).toHaveLength(25);
        expect(regeneratedDocuments[0].padding).toBe(0.22);
        expect(regeneratedDocuments[0].name).toBe('renamed');
        expect(regeneratedDocuments[0].cropRect.x).toBe(3);
    });

    it('cancels and discards automatic detection responses for previous grid files', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const firstFile = new File(['image'], 'first.png', { type: 'image/png' });
        const secondFile = new File(['image'], 'second.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([firstFile], 'grid');
        });
        await act(async () => {
            result.current.detectGridAutomatically();
        });

        const firstRequest = detectionMock.requests[0];
        await act(async () => {
            await result.current.processFiles([secondFile], 'grid');
        });

        expect(firstRequest.request.cancel).toHaveBeenCalledTimes(1);

        await act(async () => {
            firstRequest.resolve({
                rows: 9,
                columns: 9,
                rowBands: [{ start: 0, end: 10 }],
                columnBands: [{ start: 0, end: 10 }],
                cells: [],
                confidence: 1,
                warnings: [],
                outerMargins: { top: 0, right: 0, bottom: 0, left: 0 },
                horizontalGap: 0,
                verticalGap: 0,
            });
            await Promise.resolve();
        });

        expect(result.current.gridDraft.source.fileName).toBe('second.png');
        expect(result.current.gridDraft.rows).toBe(5);
        expect(result.current.gridDraft.columns).toBe(5);
    });

    it('applies padding, fit and frame changes to all selected generated emotes', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.selectAllEmotes();
        });
        await act(async () => {
            result.current.updateSelectedOrActiveEmotes({
                fitMode: 'manual',
                padding: 0.12,
                frame: { zoom: 1.4, offsetX: 0.06, offsetY: -0.03 },
            });
        });

        expect(result.current.selectedEmoteIds).toHaveLength(25);
        expect(result.current.emotes.every((emote) => emote.fitMode === 'manual')).toBe(true);
        expect(result.current.emotes.every((emote) => emote.padding === 0.12)).toBe(true);
        expect(result.current.emotes.every((emote) => emote.frame.zoom === 1.4)).toBe(true);
    });

    it('copies active settings and pastes them to the selected emotes', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.selectNoEmotes();
            result.current.updateActiveEmote({
                fitMode: 'cover',
                padding: 0.08,
                adjustments: { brightness: 9, contrast: 4, saturation: 3, sharpen: 2 },
            });
        });
        await act(async () => {
            result.current.copyActiveSettings();
        });
        await act(async () => {
            result.current.toggleEmoteSelection(result.current.emotes[1].id);
        });
        await act(async () => {
            result.current.pasteSettingsToSelected();
        });

        expect(result.current.emotes[1].fitMode).toBe('cover');
        expect(result.current.emotes[1].padding).toBe(0.08);
        expect(result.current.emotes[1].adjustments.brightness).toBe(9);
    });

    it('does not paste erase or restore points between different emotes', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.selectNoEmotes();
            result.current.updateActiveEmote({
                tolerance: 44,
                erasurePoints: [{ x: 3, y: 4, color: [255, 255, 255] }],
                restorePoints: [{ x: 8, y: 9 }],
            });
        });
        await act(async () => {
            result.current.copyActiveSettings();
        });
        await act(async () => {
            result.current.toggleEmoteSelection(result.current.emotes[1].id);
        });
        await act(async () => {
            result.current.pasteSettingsToSelected();
        });

        expect(result.current.emotes[1].tolerance).toBe(44);
        expect(result.current.emotes[1].erasurePoints).toEqual([]);
        expect(result.current.emotes[1].restorePoints).toEqual([]);
        expect(result.current.emotes[1].backgroundRemoval.erasurePoints).toEqual([]);
    });

    it('trims selected emotes and stores crop warnings', async () => {
        trimMock.trimEmoteToContent.mockResolvedValue({
            cropRect: { x: 4, y: 5, width: 40, height: 42 },
            warnings: ['Contenido tocando el borde izquierdo del crop.'],
            diagnostics: { visiblePixels: 120, backgroundColor: [255, 255, 255, 255] },
        });
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.selectNoEmotes();
            result.current.toggleEmoteSelection(result.current.emotes[0].id);
            result.current.toggleEmoteSelection(result.current.emotes[1].id);
        });
        await act(async () => {
            await result.current.trimSelectedEmotes();
        });

        expect(trimMock.trimEmoteToContent).toHaveBeenCalledTimes(2);
        expect(result.current.emotes[0].cropRect).toEqual({ x: 4, y: 5, width: 40, height: 42 });
        expect(result.current.emotes[1].validation.warnings).toContain('Contenido tocando el borde izquierdo del crop.');
        expect(result.current.emotes[2].cropRect).not.toEqual({ x: 4, y: 5, width: 40, height: 42 });
    });

    it('applies background removal v2 independently to 24 selected grid emotes', async () => {
        backgroundV2Mock.analyzeEmoteBackgroundRemovalV2.mockImplementation((emote) => Promise.resolve({
            backgroundRemoval: {
                version: 2,
                mode: 'connected',
                tolerance: 34,
                samples: [[255, 255, 255], [240, 240, 240], [emote.cropRect.x, emote.cropRect.y, 255]],
                removedRatio: 0.42,
                removedPixels: 1200,
                warnings: [],
            },
            warnings: [],
        }));
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            result.current.updateGridDraft((draft) => ({
                ...draft,
                cells: draft.cells.map((cell) => cell.id === 'r5c5' ? { ...cell, empty: true, enabled: false } : cell),
            }));
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            await result.current.applyBackgroundRemovalV2('targets', 'connected');
        });

        expect(result.current.emotes).toHaveLength(24);
        expect(backgroundV2Mock.analyzeEmoteBackgroundRemovalV2).toHaveBeenCalledTimes(24);
        expect(result.current.emotes.every((emote) => emote.backgroundRemoval.version === 2)).toBe(true);
        expect(new Set(result.current.emotes.map((emote) => JSON.stringify(emote.backgroundRemoval.samples)))).toHaveLength(24);
    });

    it('recalculates background removal v2 without keeping stale background warnings', async () => {
        backgroundV2Mock.analyzeEmoteBackgroundRemovalV2.mockResolvedValue({
            backgroundRemoval: {
                version: 2,
                mode: 'connected',
                tolerance: 34,
                samples: [[255, 255, 255]],
                removedRatio: 0.9,
                removedPixels: 900,
                warnings: ['Borrado excesivo: 90% de pixeles quedarian transparentes.'],
            },
            warnings: ['Borrado excesivo: 90% de pixeles quedarian transparentes.'],
        });
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.updateActiveEmote({
                validation: {
                    errors: [],
                    warnings: [
                        { category: 'backgroundRemoval', code: 'old-background', message: 'warning viejo' },
                        { category: 'trim', code: 'trim-touching-edge', message: 'warning de trim' },
                    ],
                },
            });
        });
        await act(async () => {
            await result.current.applyBackgroundRemovalV2('active', 'connected');
        });

        const warnings = result.current.activeEmote.validation.warnings;
        expect(warnings.some((warning) => warning.message === 'warning viejo')).toBe(false);
        expect(warnings.some((warning) => warning.message === 'warning de trim')).toBe(true);
        expect(warnings.some((warning) => warning.category === 'backgroundRemoval' && warning.code === 'background-removal-v2-excessive')).toBe(true);
    });

    it('resets and removes background removal v2 state', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.updateActiveEmote({
                backgroundRemoval: { version: 2, mode: 'connected', tolerance: 80, removedRatio: 0.8 },
                validation: { errors: [], warnings: [{ category: 'backgroundRemoval', code: 'old', message: 'old' }] },
            });
        });
        await act(async () => {
            result.current.resetBackgroundRemovalV2();
        });

        expect(result.current.activeEmote.backgroundRemoval.version).toBe(2);
        expect(result.current.activeEmote.backgroundRemoval.tolerance).toBe(34);
        expect(result.current.activeEmote.validation.warnings).toEqual([]);

        await act(async () => {
            result.current.removeBackgroundRemovalV2();
        });

        expect(result.current.activeEmote.backgroundRemoval.mode).toBe('manual-flood-fill');
        expect(result.current.activeEmote.backgroundRemoval.version).toBeUndefined();
    });

    it('updates feather and despill parameters visibly on selected targets', async () => {
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        await act(async () => {
            result.current.selectNoEmotes();
            result.current.toggleEmoteSelection(result.current.emotes[0].id);
            result.current.toggleEmoteSelection(result.current.emotes[1].id);
        });
        await act(async () => {
            result.current.updateBackgroundRemovalV2Params({ feather: 3, despill: 0.2 });
        });

        expect(result.current.emotes[0].backgroundRemoval.feather).toBe(3);
        expect(result.current.emotes[1].backgroundRemoval.despill).toBe(0.2);
        expect(result.current.emotes[2].backgroundRemoval.version).toBeUndefined();
    });

    it('requires explicit confirmation before applying global background removal', async () => {
        vi.mocked(globalThis.confirm).mockReturnValue(false);
        backgroundV2Mock.analyzeEmoteBackgroundRemovalV2.mockResolvedValue({
            backgroundRemoval: { version: 2, mode: 'global', samples: [], removedRatio: 0, removedPixels: 0, warnings: [] },
            warnings: [],
        });
        const { result } = renderHook(() => useEmoteBatch());
        const file = new File(['image'], 'grid.png', { type: 'image/png' });

        await act(async () => {
            await result.current.processFiles([file], 'grid');
        });
        await act(async () => {
            await result.current.generateGridEmotes();
        });
        let accepted = true;
        await act(async () => {
            accepted = await result.current.applyBackgroundRemovalV2('active', 'global');
        });

        expect(accepted).toBe(false);
        expect(backgroundV2Mock.analyzeEmoteBackgroundRemovalV2).not.toHaveBeenCalled();

        await act(async () => {
            accepted = await result.current.applyBackgroundRemovalV2('active', 'global', { globalConfirmed: true });
        });

        expect(accepted).toBe(true);
        expect(backgroundV2Mock.analyzeEmoteBackgroundRemovalV2).toHaveBeenCalledTimes(1);
    });
});

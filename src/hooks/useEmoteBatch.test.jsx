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

vi.mock('../features/grid-import/gridDetection/runGridDetection', () => ({
    startGridDetection: detectionMock.startGridDetection,
}));

describe('useEmoteBatch', () => {
    beforeEach(() => {
        detectionMock.requests.length = 0;
        detectionMock.startGridDetection.mockClear();
        vi.stubGlobal('alert', vi.fn());
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
            result.current.updateActiveEmote({ padding: 22 });
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
        expect(regeneratedDocuments[0].padding).toBe(22);
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
});

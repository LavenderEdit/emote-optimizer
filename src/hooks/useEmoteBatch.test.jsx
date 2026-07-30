import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmoteBatch } from './useEmoteBatch';

describe('useEmoteBatch', () => {
    beforeEach(() => {
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
});

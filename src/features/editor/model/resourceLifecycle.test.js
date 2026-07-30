import { beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseAllResources, releasePreviewsForRemovedEmotes, releaseUnusedAssets } from './resourceLifecycle';

describe('resource lifecycle', () => {
    beforeEach(() => {
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    it('centralizes cleanup for assets, previews and unclaimed grid drafts', () => {
        releaseAllResources({
            assets: {
                a1: { id: 'a1', objectUrl: 'blob:a1' },
            },
            previewUrls: {
                e1: 'blob:preview-1',
            },
            gridDraft: {
                source: { id: 'draft-source', objectUrl: 'blob:draft' },
            },
        });

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a1');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:draft');
    });

    it('keeps only assets and previews still used by documents', () => {
        const nextAssets = releaseUnusedAssets({
            keep: { id: 'keep', objectUrl: 'blob:keep' },
            drop: { id: 'drop', objectUrl: 'blob:drop' },
        }, [{ sourceId: 'keep' }], null);
        const nextPreviewUrls = releasePreviewsForRemovedEmotes({
            keepEmote: 'blob:preview-keep',
            dropEmote: 'blob:preview-drop',
        }, [{ id: 'keepEmote' }]);

        expect(Object.keys(nextAssets)).toEqual(['keep']);
        expect(Object.keys(nextPreviewUrls)).toEqual(['keepEmote']);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:drop');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-drop');
    });
});

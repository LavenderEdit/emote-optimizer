export function revokeAsset(asset) {
    if (asset?.objectUrl) {
        URL.revokeObjectURL(asset.objectUrl);
    }
}

export function revokeGridDraft(draft, assets = {}) {
    if (draft?.source?.id && !assets[draft.source.id]) {
        revokeAsset(draft.source);
    }
}

export function revokePreview(previewUrl) {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }
}

export function releaseUnusedAssets(currentAssets, nextEmotes, draft) {
    const usedSourceIds = new Set(nextEmotes.map((emote) => emote.sourceId));
    if (draft?.source?.id) usedSourceIds.add(draft.source.id);

    const nextAssets = {};
    for (const [assetId, asset] of Object.entries(currentAssets)) {
        if (usedSourceIds.has(assetId)) {
            nextAssets[assetId] = asset;
        } else {
            revokeAsset(asset);
        }
    }
    return nextAssets;
}

export function releasePreviewForEmote(currentPreviewUrls, emoteId) {
    if (currentPreviewUrls[emoteId]) revokePreview(currentPreviewUrls[emoteId]);
    const nextPreviewUrls = { ...currentPreviewUrls };
    delete nextPreviewUrls[emoteId];
    return nextPreviewUrls;
}

export function releasePreviewsForRemovedEmotes(currentPreviewUrls, nextEmotes) {
    const nextEmoteIds = new Set(nextEmotes.map((emote) => emote.id));
    const nextPreviewUrls = {};

    for (const [emoteId, previewUrl] of Object.entries(currentPreviewUrls)) {
        if (nextEmoteIds.has(emoteId)) {
            nextPreviewUrls[emoteId] = previewUrl;
        } else {
            revokePreview(previewUrl);
        }
    }

    return nextPreviewUrls;
}

export function releaseAllResources({ assets, previewUrls, gridDraft }) {
    Object.values(assets).forEach(revokeAsset);
    Object.values(previewUrls).forEach(revokePreview);
    revokeGridDraft(gridDraft, assets);
}

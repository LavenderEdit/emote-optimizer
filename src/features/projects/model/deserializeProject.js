import { migrateProject } from '../db/migrations';

export function deserializeProject(storedProject) {
    const project = migrateProject(storedProject);
    const assets = Object.fromEntries(
        Object.entries(project.assets || {}).map(([id, asset]) => [id, deserializeAsset(asset)])
    );
    const gridDraft = deserializeGridDraft(project.gridDraft, assets);

    return {
        metadata: project.metadata,
        assets,
        emotes: project.emotes || [],
        gridDraft,
        activeId: project.activeId || project.emotes?.[0]?.id || null,
        selectedEmoteIds: project.selectedEmoteIds || [],
        exportOptions: project.exportOptions || {
            presetId: 'twitch-static-manual',
            scope: 'all',
            activeOutputSize: 112,
        },
        settingsClipboard: project.settingsClipboard || null,
        theme: project.theme || 'dark',
    };
}

function deserializeAsset(asset) {
    const objectUrl = asset.blob ? URL.createObjectURL(asset.blob) : asset.objectUrl;
    return {
        ...asset,
        objectUrl,
    };
}

function deserializeGridDraft(draft, assets) {
    if (!draft) return null;
    const sourceId = draft.sourceId || draft.source?.id;
    const source = assets[sourceId] || (draft.source ? deserializeAsset(draft.source) : null);
    return {
        ...draft,
        source,
    };
}

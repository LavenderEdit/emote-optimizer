import { createProjectMetadata, PROJECT_SCHEMA_VERSION } from '../db/schema';

export function serializeProject(snapshot, options = {}) {
    const now = options.now || new Date().toISOString();
    const metadata = {
        ...createProjectMetadata({
            id: options.id || snapshot.projectId,
            name: options.name || snapshot.projectName,
            now,
            appVersion: options.appVersion || snapshot.appVersion,
        }),
        ...(snapshot.metadata || {}),
        id: options.id || snapshot.metadata?.id || snapshot.projectId,
        name: options.name || snapshot.metadata?.name || snapshot.projectName || 'Proyecto sin titulo',
        updatedAt: now,
        schemaVersion: PROJECT_SCHEMA_VERSION,
        appVersion: options.appVersion || snapshot.metadata?.appVersion || snapshot.appVersion || '1.0.0-beta.2',
    };

    return {
        schemaVersion: PROJECT_SCHEMA_VERSION,
        metadata,
        assets: Object.fromEntries(Object.entries(snapshot.assets || {}).map(([id, asset]) => [id, serializeAsset(asset)])),
        emotes: cloneSerializable(snapshot.emotes || []),
        gridDraft: serializeGridDraft(snapshot.gridDraft),
        activeId: snapshot.activeId || null,
        selectedEmoteIds: [...(snapshot.selectedEmoteIds || [])],
        exportOptions: cloneSerializable(snapshot.exportOptions || {}),
        settingsClipboard: cloneSerializable(snapshot.settingsClipboard || null),
        theme: snapshot.theme || 'dark',
    };
}

function serializeAsset(asset) {
    const { objectUrl: _objectUrl, ...rest } = asset;
    return {
        ...cloneSerializable(rest),
        blob: asset.blob || null,
    };
}

function serializeGridDraft(draft) {
    if (!draft) return null;
    const { source, ...rest } = draft;
    return {
        ...cloneSerializable(rest),
        sourceId: source?.id || draft.sourceId || null,
        source: source ? serializeAsset(source) : null,
    };
}

function cloneSerializable(value) {
    if (value == null) return value;
    if (value instanceof Blob) return value;
    if (Array.isArray(value)) return value.map(cloneSerializable);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => key !== 'objectUrl')
                .map(([key, item]) => [key, cloneSerializable(item)])
        );
    }
    return value;
}

import { PROJECT_SCHEMA_VERSION } from './schema';

export function migrateProject(project) {
    if (!project || typeof project !== 'object') {
        throw new Error('Proyecto invalido.');
    }

    let migrated = { ...project };
    const startVersion = migrated.schemaVersion || migrated.metadata?.schemaVersion || 1;

    if (startVersion > PROJECT_SCHEMA_VERSION) {
        throw new Error(`Version de proyecto no soportada: ${startVersion}.`);
    }

    if (startVersion < 2) {
        migrated = migrateV1ToV2(migrated);
    }

    return {
        ...migrated,
        schemaVersion: PROJECT_SCHEMA_VERSION,
        metadata: {
            ...(migrated.metadata || {}),
            schemaVersion: PROJECT_SCHEMA_VERSION,
        },
    };
}

export function migrateV1ToV2(project) {
    const metadata = project.metadata || {};
    return {
        ...project,
        schemaVersion: 2,
        metadata: {
            ...metadata,
            schemaVersion: 2,
            appVersion: metadata.appVersion || project.appVersion || '1.0.0-beta.1',
        },
        exportOptions: project.exportOptions || {
            presetId: 'twitch-static-manual',
            scope: 'all',
            activeOutputSize: 112,
        },
        selectedEmoteIds: project.selectedEmoteIds || [],
        gridDraft: project.gridDraft || null,
    };
}

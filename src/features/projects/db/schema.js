export const PROJECT_DB_NAME = 'emote-studio-projects';
export const PROJECT_DB_VERSION = 1;
export const PROJECT_SCHEMA_VERSION = 2;
export const PROJECT_FILE_EXTENSION = 'emoteproject';
export const RECOVERY_SESSION_KEY = 'last-open-project';

export function createProjectMetadata({ id, name, now, appVersion }) {
    const timestamp = now || new Date().toISOString();
    return {
        id: id || (crypto.randomUUID ? crypto.randomUUID() : `project-${Date.now()}-${Math.random()}`),
        name: name || 'Proyecto sin titulo',
        createdAt: timestamp,
        updatedAt: timestamp,
        appVersion,
        schemaVersion: PROJECT_SCHEMA_VERSION,
    };
}

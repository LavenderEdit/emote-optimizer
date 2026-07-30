import { describe, expect, it } from 'vitest';
import { migrateProject } from '../db/migrations';
import { deserializeProject } from './deserializeProject';
import { exportProjectFile, importProjectFile } from './projectFile';
import { serializeProject } from './serializeProject';

describe('project persistence model', () => {
    it('serializes assets without object URLs and restores them from blobs', () => {
        const blob = new Blob(['image'], { type: 'image/png' });
        const project = serializeProject({
            appVersion: 'test',
            projectId: 'project-1',
            projectName: 'Pack',
            assets: {
                asset1: {
                    id: 'asset1',
                    fileName: 'source.png',
                    name: 'source',
                    mimeType: 'image/png',
                    bytes: blob.size,
                    width: 10,
                    height: 10,
                    blob,
                    objectUrl: 'blob:old',
                },
            },
            emotes: [{ id: 'emote1', name: 'one', sourceId: 'asset1' }],
            gridDraft: null,
            activeId: 'emote1',
            selectedEmoteIds: ['emote1'],
            exportOptions: { presetId: 'twitch-static-manual' },
        }, { now: '2026-07-30T00:00:00.000Z' });

        expect(project.assets.asset1.objectUrl).toBeUndefined();
        expect(project.assets.asset1.blob).toBe(blob);

        const restored = deserializeProject(project);
        expect(restored.assets.asset1.objectUrl).toMatch(/^blob:/);
        expect(restored.activeId).toBe('emote1');
        URL.revokeObjectURL(restored.assets.asset1.objectUrl);
    });

    it('migrates schemaVersion 1 projects to schemaVersion 2', () => {
        const migrated = migrateProject({
            schemaVersion: 1,
            metadata: { id: 'old', name: 'Old', createdAt: 'a', updatedAt: 'b' },
            assets: {},
            emotes: [],
        });

        expect(migrated.schemaVersion).toBe(2);
        expect(migrated.metadata.schemaVersion).toBe(2);
        expect(migrated.exportOptions.presetId).toBe('twitch-static-manual');
    });

    it('exports and imports .emoteproject files with assets intact', async () => {
        const blob = new Blob(['image'], { type: 'image/png' });
        const project = serializeProject({
            appVersion: 'test',
            projectId: 'project-zip',
            projectName: 'Zip Pack',
            assets: {
                asset1: {
                    id: 'asset1',
                    fileName: 'source.png',
                    name: 'source',
                    mimeType: 'image/png',
                    bytes: blob.size,
                    width: 10,
                    height: 10,
                    blob,
                    objectUrl: 'blob:old',
                },
            },
            emotes: [],
            gridDraft: null,
        });

        const exported = await exportProjectFile(project);
        const imported = await importProjectFile(new File([exported.blob], exported.fileName, { type: 'application/zip' }));

        expect(exported.fileName).toBe('zip_pack.emoteproject');
        expect(imported.assets.asset1.blob.size).toBe(blob.size);
        expect(imported.assets.asset1.objectUrl).toBeUndefined();
    });
});

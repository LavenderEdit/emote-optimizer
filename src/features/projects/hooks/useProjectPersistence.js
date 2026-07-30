import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteProject, listProjects, loadProject, loadRecoverableSession, saveProject } from '../db/projectDatabase';
import { createProjectMetadata } from '../db/schema';
import { deserializeProject } from '../model/deserializeProject';
import { exportProjectFile, importProjectFile } from '../model/projectFile';
import { serializeProject } from '../model/serializeProject';

const DEFAULT_DEBOUNCE_MS = 1100;

export function useProjectPersistence({
    getSnapshot,
    restoreSnapshot,
    clearSnapshot,
    dirtyKey,
    hasContent,
    isStable = true,
    appVersion,
    debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
    const [metadata, setMetadata] = useState(null);
    const [projects, setProjects] = useState([]);
    const [autosave, setAutosave] = useState({ status: 'Sin cambios', lastSavedAt: null, error: null });
    const [recoverableProject, setRecoverableProject] = useState(null);
    const [diagnostic, setDiagnostic] = useState(null);
    const saveTimerRef = useRef(null);
    const metadataRef = useRef(null);

    useEffect(() => {
        metadataRef.current = metadata;
    }, [metadata]);

    const refreshProjects = useCallback(async () => {
        setProjects(await listProjects());
    }, []);

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            refreshProjects().catch((error) => {
                if (active) setAutosave({ status: 'Error', lastSavedAt: null, error: error.message });
            });
            loadRecoverableSession()
                .then((session) => {
                    if (active) setRecoverableProject(session?.project || null);
                })
                .catch((error) => {
                    if (active) setDiagnostic({ type: 'recovery', message: error.message });
                });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [refreshProjects]);

    const buildProject = useCallback((updates = {}) => {
        const now = new Date().toISOString();
        const nextMetadata = metadataRef.current || createProjectMetadata({
            name: updates.name || 'Proyecto recuperable',
            now,
            appVersion,
        });
        const project = serializeProject(getSnapshot(), {
            id: updates.id || nextMetadata.id,
            name: updates.name || nextMetadata.name,
            appVersion,
            now,
        });
        return {
            ...project,
            metadata: {
                ...project.metadata,
                createdAt: nextMetadata.createdAt,
                ...updates.metadata,
            },
        };
    }, [appVersion, getSnapshot]);

    const saveNow = useCallback(async (updates = {}) => {
        if (!hasContent) return null;
        setAutosave((current) => ({ ...current, status: 'Guardando', error: null }));
        try {
            const project = buildProject(updates);
            await saveProject(project);
            setMetadata(project.metadata);
            setAutosave({ status: 'Guardado', lastSavedAt: project.metadata.updatedAt, error: null });
            await refreshProjects();
            return project;
        } catch (error) {
            const message = error?.name === 'QuotaExceededError'
                ? 'No hay espacio suficiente en IndexedDB. Elimina proyectos antiguos.'
                : error.message || 'No se pudo guardar el proyecto.';
            setAutosave({ status: 'Error', lastSavedAt: null, error: message });
            return null;
        }
    }, [buildProject, hasContent, refreshProjects]);

    const saveAs = useCallback(async (name) => saveNow({
        id: crypto.randomUUID ? crypto.randomUUID() : `project-${Date.now()}-${Math.random()}`,
        name,
        metadata: { createdAt: new Date().toISOString() },
    }), [saveNow]);

    const openProject = useCallback(async (projectId) => {
        const project = await loadProject(projectId);
        if (!project) throw new Error('Proyecto no encontrado.');
        const restored = deserializeProject(project);
        restoreSnapshot(restored);
        setMetadata(restored.metadata);
        setAutosave({ status: 'Guardado', lastSavedAt: restored.metadata.updatedAt, error: null });
        return restored;
    }, [restoreSnapshot]);

    const recoverProject = useCallback(async () => {
        if (!recoverableProject) return null;
        const restored = deserializeProject(recoverableProject);
        restoreSnapshot(restored);
        setMetadata(restored.metadata);
        setRecoverableProject(null);
        setAutosave({ status: 'Guardado', lastSavedAt: restored.metadata.updatedAt, error: null });
        return restored;
    }, [recoverableProject, restoreSnapshot]);

    const startNewProject = useCallback(() => {
        clearSnapshot();
        setMetadata(null);
        setRecoverableProject(null);
        setAutosave({ status: 'Sin cambios', lastSavedAt: null, error: null });
    }, [clearSnapshot]);

    const removeProject = useCallback(async (projectId) => {
        await deleteProject(projectId);
        if (metadataRef.current?.id === projectId) {
            setMetadata(null);
        }
        await refreshProjects();
    }, [refreshProjects]);

    const duplicateProject = useCallback(async (projectId) => {
        const project = await loadProject(projectId);
        if (!project) throw new Error('Proyecto no encontrado.');
        const name = `${project.metadata.name} copia`;
        const copy = {
            ...project,
            metadata: createProjectMetadata({ name, appVersion }),
        };
        await saveProject(copy);
        await refreshProjects();
        return copy;
    }, [appVersion, refreshProjects]);

    const renameProject = useCallback(async (projectId, name) => {
        const project = await loadProject(projectId);
        if (!project) throw new Error('Proyecto no encontrado.');
        const updated = {
            ...project,
            metadata: {
                ...project.metadata,
                name,
                updatedAt: new Date().toISOString(),
            },
        };
        await saveProject(updated);
        if (metadataRef.current?.id === projectId) setMetadata(updated.metadata);
        await refreshProjects();
        return updated;
    }, [refreshProjects]);

    const exportCurrentProject = useCallback(async () => {
        const project = buildProject();
        return exportProjectFile(project);
    }, [buildProject]);

    const importProject = useCallback(async (file) => {
        const project = await importProjectFile(file);
        const restored = deserializeProject(project);
        await saveProject(project);
        restoreSnapshot(restored);
        setMetadata(restored.metadata);
        await refreshProjects();
        return restored;
    }, [refreshProjects, restoreSnapshot]);

    useEffect(() => {
        if (!hasContent || !isStable) return undefined;
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            setAutosave((current) => current.status === 'Guardando' ? current : { ...current, status: 'Sin cambios' });
            saveNow();
        }, debounceMs);
        return () => window.clearTimeout(saveTimerRef.current);
    }, [debounceMs, dirtyKey, hasContent, isStable, saveNow]);

    return useMemo(() => ({
        metadata,
        projects,
        autosave,
        recoverableProject,
        diagnostic,
        refreshProjects,
        saveNow,
        saveAs,
        openProject,
        recoverProject,
        startNewProject,
        removeProject,
        duplicateProject,
        renameProject,
        exportCurrentProject,
        importProject,
    }), [autosave, diagnostic, duplicateProject, exportCurrentProject, importProject, metadata, openProject, projects, recoverProject, recoverableProject, refreshProjects, removeProject, renameProject, saveAs, saveNow, startNewProject]);
}

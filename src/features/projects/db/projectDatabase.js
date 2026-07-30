import { PROJECT_DB_NAME, PROJECT_DB_VERSION, RECOVERY_SESSION_KEY } from './schema';

const memoryProjects = new Map();
const memorySession = new Map();

export async function openProjectDatabase() {
    if (typeof indexedDB === 'undefined') return createMemoryDatabase();

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('projects')) {
                const store = db.createObjectStore('projects', { keyPath: 'metadata.id' });
                store.createIndex('updatedAt', 'metadata.updatedAt');
            }
            if (!db.objectStoreNames.contains('session')) {
                db.createObjectStore('session', { keyPath: 'key' });
            }
        };
        request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
        request.onsuccess = () => resolve(createIndexedDbFacade(request.result));
    });
}

export async function saveProject(project) {
    const db = await openProjectDatabase();
    await db.putProject(project);
    await db.setSession(RECOVERY_SESSION_KEY, { projectId: project.metadata.id, updatedAt: project.metadata.updatedAt });
    return project;
}

export async function listProjects() {
    const db = await openProjectDatabase();
    return db.listProjects();
}

export async function loadProject(projectId) {
    const db = await openProjectDatabase();
    return db.getProject(projectId);
}

export async function deleteProject(projectId) {
    const db = await openProjectDatabase();
    await db.deleteProject(projectId);
}

export async function loadRecoverableSession() {
    const db = await openProjectDatabase();
    const session = await db.getSession(RECOVERY_SESSION_KEY);
    if (!session?.projectId) return null;
    const project = await db.getProject(session.projectId);
    return project ? { session, project } : null;
}

function createIndexedDbFacade(db) {
    return {
        putProject(project) {
            return transact(db, 'projects', 'readwrite', (store) => store.put(project));
        },
        getProject(projectId) {
            return transact(db, 'projects', 'readonly', (store) => store.get(projectId));
        },
        deleteProject(projectId) {
            return transact(db, 'projects', 'readwrite', (store) => store.delete(projectId));
        },
        listProjects() {
            return transact(db, 'projects', 'readonly', (store) => new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve((request.result || []).map(createProjectSummary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
            }));
        },
        setSession(key, value) {
            return transact(db, 'session', 'readwrite', (store) => store.put({ key, value }));
        },
        getSession(key) {
            return transact(db, 'session', 'readonly', (store) => new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result?.value || null);
            }));
        },
    };
}

function transact(db, storeName, mode, action) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let actionResult;
        transaction.oncomplete = () => resolve(actionResult);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaccion IndexedDB cancelada.'));
        try {
            const result = action(store);
            if (result instanceof Promise) {
                result.then((value) => { actionResult = value; }).catch(reject);
            } else if (result && 'onsuccess' in result) {
                result.onsuccess = () => { actionResult = result.result; };
                result.onerror = () => reject(result.error);
            } else {
                actionResult = result;
            }
        } catch (error) {
            reject(error);
        }
    });
}

function createMemoryDatabase() {
    return {
        async putProject(project) {
            memoryProjects.set(project.metadata.id, project);
        },
        async getProject(projectId) {
            return memoryProjects.get(projectId) || null;
        },
        async deleteProject(projectId) {
            memoryProjects.delete(projectId);
        },
        async listProjects() {
            return [...memoryProjects.values()].map(createProjectSummary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        },
        async setSession(key, value) {
            memorySession.set(key, value);
        },
        async getSession(key) {
            return memorySession.get(key) || null;
        },
    };
}

function createProjectSummary(project) {
    return {
        id: project.metadata.id,
        name: project.metadata.name,
        createdAt: project.metadata.createdAt,
        updatedAt: project.metadata.updatedAt,
        appVersion: project.metadata.appVersion,
        schemaVersion: project.metadata.schemaVersion,
        size: estimateProjectSize(project),
        emoteCount: project.emotes?.length || 0,
        assetCount: Object.keys(project.assets || {}).length,
    };
}

function estimateProjectSize(project) {
    const assetBytes = Object.values(project.assets || {}).reduce((sum, asset) => sum + (asset.bytes || asset.blob?.size || 0), 0);
    return assetBytes + JSON.stringify({ ...project, assets: undefined }).length;
}

import JSZip from 'jszip';
import { sanitizeName } from '../../../shared/files/names';
import { PROJECT_FILE_EXTENSION } from '../db/schema';

export async function exportProjectFile(project) {
    const zip = new JSZip();
    const manifest = {
        ...project,
        assets: Object.fromEntries(Object.entries(project.assets || {}).map(([id, asset]) => [id, {
            ...asset,
            blob: undefined,
            assetPath: `assets/${id}`,
        }])),
    };

    zip.file('project.json', JSON.stringify(manifest, null, 2));
    Object.entries(project.assets || {}).forEach(([id, asset]) => {
        if (asset.blob) zip.file(`assets/${id}`, asset.blob);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    return {
        blob,
        fileName: `${sanitizeName(project.metadata.name || 'emote-project')}.${PROJECT_FILE_EXTENSION}`,
    };
}

export async function importProjectFile(file) {
    const zip = await JSZip.loadAsync(file);
    const paths = Object.keys(zip.files);
    if (paths.some(isUnsafePath)) {
        throw new Error('Proyecto rechazado: contiene rutas inseguras.');
    }

    const projectFile = zip.file('project.json');
    if (!projectFile) throw new Error('Proyecto invalido: falta project.json.');

    const project = JSON.parse(await projectFile.async('string'));
    const assets = {};

    for (const [id, asset] of Object.entries(project.assets || {})) {
        const assetPath = asset.assetPath || `assets/${id}`;
        const blobFile = zip.file(assetPath);
        if (!blobFile) throw new Error(`Proyecto invalido: falta asset ${id}.`);
        const blob = await blobFile.async('blob');
        if (!isAllowedMime(asset.mimeType || blob.type)) {
            throw new Error(`Proyecto rechazado: MIME no soportado para ${asset.fileName || id}.`);
        }
        if (blob.size > 25 * 1024 * 1024) {
            throw new Error(`Proyecto rechazado: asset demasiado grande ${asset.fileName || id}.`);
        }
        assets[id] = {
            ...asset,
            blob,
            bytes: asset.bytes || blob.size,
        };
        delete assets[id].assetPath;
    }

    return {
        ...project,
        assets,
    };
}

function isUnsafePath(path) {
    return path.includes('..') || path.startsWith('/') || /^[a-zA-Z]:/.test(path);
}

function isAllowedMime(mimeType) {
    return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', ''].includes(mimeType || '');
}

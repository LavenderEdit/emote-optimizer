export const DEFAULT_IMAGE_LIMITS = {
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 25 * 1024 * 1024,
    maxMegapixels: 24,
    maxWidth: 8192,
    maxHeight: 8192,
};

const EXTENSIONS_BY_TYPE = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/webp': ['webp'],
};

export function validateImageFile(file, limits = DEFAULT_IMAGE_LIMITS) {
    const errors = [];
    const warnings = [];
    const extension = file.name?.split('.').pop()?.toLowerCase() || '';

    if (!limits.allowedTypes.includes(file.type)) {
        errors.push(`Formato no soportado: ${file.type || 'desconocido'}. Usa PNG, JPG o WEBP estatico.`);
    }

    if (file.size > limits.maxBytes) {
        errors.push(`El archivo supera ${(limits.maxBytes / 1024 / 1024).toFixed(0)} MB.`);
    }

    const expectedExtensions = EXTENSIONS_BY_TYPE[file.type] || [];
    if (expectedExtensions.length > 0 && !expectedExtensions.includes(extension)) {
        warnings.push(`La extension .${extension || 'sin extension'} no coincide con ${file.type}.`);
    }

    if (file.size === 0) {
        errors.push('El archivo esta vacio.');
    }

    return { valid: errors.length === 0, errors, warnings };
}

export function validateDecodedImageDimensions(width, height, limits = DEFAULT_IMAGE_LIMITS) {
    const errors = [];
    const warnings = [];
    const megapixels = (width * height) / 1_000_000;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        errors.push('No se pudieron leer dimensiones validas de la imagen.');
    }

    if (width > limits.maxWidth || height > limits.maxHeight) {
        errors.push(`La imagen supera ${limits.maxWidth} x ${limits.maxHeight} px.`);
    }

    if (megapixels > limits.maxMegapixels) {
        errors.push(`La imagen supera ${limits.maxMegapixels} megapixeles.`);
    }

    if (megapixels > limits.maxMegapixels * 0.75) {
        warnings.push('Imagen grande: algunas operaciones pueden tardar mas.');
    }

    return { valid: errors.length === 0, errors, warnings, megapixels };
}

export function loadImageDimensions(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
        image.src = src;
    });
}

export async function createImageAssetFromFile(file) {
    const objectUrl = URL.createObjectURL(file);

    try {
        const dimensions = await loadImageDimensions(objectUrl);
        return {
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            fileName: file.name,
            name: file.name.replace(/\.[^/.]+$/, ''),
            mimeType: file.type,
            bytes: file.size,
            blob: file,
            objectUrl,
            width: dimensions.width,
            height: dimensions.height,
        };
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
    }
}

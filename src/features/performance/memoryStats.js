const BYTES_PER_PIXEL_RGBA = 4;
const WARNING_BYTES = 256 * 1024 * 1024;

export function createPerformanceSummary({ assets = {}, emotes = [], previewUrls = {}, cacheStats = null } = {}) {
    const assetBytes = Object.values(assets).reduce((sum, asset) => sum + estimateAssetBytes(asset), 0);
    const cropPixelBytes = emotes.reduce((sum, emote) => {
        const rect = emote.cropRect || {};
        return sum + Math.max(0, Math.round(rect.width || 0) * Math.round(rect.height || 0) * BYTES_PER_PIXEL_RGBA);
    }, 0);
    const previewCount = Object.keys(previewUrls).length;
    const cacheBytes = cacheStats?.bytes || 0;
    const estimatedBytes = assetBytes + cropPixelBytes + cacheBytes;

    return {
        assetBytes,
        cropPixelBytes,
        cacheBytes,
        estimatedBytes,
        estimatedMegabytes: estimatedBytes / 1024 / 1024,
        emoteCount: emotes.length,
        previewCount,
        cacheEntries: cacheStats?.entries || 0,
        cacheHitRate: cacheStats?.hitRate || 0,
        warning: estimatedBytes >= WARNING_BYTES
            ? 'Uso de memoria alto: reduce previews abiertas o divide el paquete antes de exportar.'
            : null,
    };
}

export function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function estimateAssetBytes(asset) {
    const encodedBytes = asset?.bytes || asset?.blob?.size || 0;
    const pixelBytes = Math.max(0, (asset?.width || 0) * (asset?.height || 0) * BYTES_PER_PIXEL_RGBA);
    return encodedBytes + pixelBytes;
}

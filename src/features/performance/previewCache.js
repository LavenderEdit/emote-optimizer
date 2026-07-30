const DEFAULT_MAX_ENTRIES = 96;
const DEFAULT_MAX_BYTES = 48 * 1024 * 1024;

export function createPreviewCache({ maxEntries = DEFAULT_MAX_ENTRIES, maxBytes = DEFAULT_MAX_BYTES, revokeUrl = defaultRevokeUrl } = {}) {
    const entries = new Map();
    let totalBytes = 0;
    let hits = 0;
    let misses = 0;

    function touch(key, entry) {
        entries.delete(key);
        entries.set(key, entry);
        return entry;
    }

    function evict() {
        while (entries.size > maxEntries || totalBytes > maxBytes) {
            const [oldestKey, oldest] = entries.entries().next().value || [];
            if (!oldestKey) break;
            entries.delete(oldestKey);
            totalBytes -= oldest.bytes || 0;
            if (oldest.url) revokeUrl(oldest.url);
        }
    }

    return {
        get(key) {
            const entry = entries.get(key);
            if (!entry) {
                misses += 1;
                return null;
            }
            hits += 1;
            return touch(key, entry);
        },
        set(key, blob) {
            if (!key || !blob) return null;
            const existing = entries.get(key);
            if (existing?.url) revokeUrl(existing.url);
            if (existing) totalBytes -= existing.bytes || 0;

            const entry = {
                blob,
                url: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : null,
                bytes: blob.size || 0,
                createdAt: Date.now(),
            };
            entries.set(key, entry);
            totalBytes += entry.bytes;
            evict();
            return entries.get(key) || null;
        },
        delete(key) {
            const entry = entries.get(key);
            if (!entry) return false;
            entries.delete(key);
            totalBytes -= entry.bytes || 0;
            if (entry.url) revokeUrl(entry.url);
            return true;
        },
        clear() {
            entries.forEach((entry) => {
                if (entry.url) revokeUrl(entry.url);
            });
            entries.clear();
            totalBytes = 0;
        },
        stats() {
            return {
                entries: entries.size,
                bytes: totalBytes,
                hits,
                misses,
                hitRate: hits + misses === 0 ? 0 : hits / (hits + misses),
                maxEntries,
                maxBytes,
            };
        },
    };
}

export const previewCache = createPreviewCache();

export function createPreviewCacheKey(emote, asset, options = {}) {
    if (!emote || !asset) return null;
    return stableStringify({
        sourceId: emote.sourceId,
        asset: {
            id: asset.id,
            width: asset.width,
            height: asset.height,
            bytes: asset.bytes,
            fileName: asset.fileName,
        },
        cropRect: emote.cropRect,
        fitMode: emote.fitMode,
        padding: emote.padding,
        frame: emote.frame,
        backgroundRemoval: emote.backgroundRemoval,
        adjustments: emote.adjustments,
        outline: emote.outline,
        tolerance: emote.tolerance,
        isAutoOutlineActive: emote.isAutoOutlineActive,
        comparisonMode: options.comparisonMode || 'after',
    });
}

export function stableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function defaultRevokeUrl(url) {
    if (typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(url);
}

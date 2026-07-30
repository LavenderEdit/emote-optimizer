export function sanitizeName(input, fallback = 'emote') {
    const normalized = String(input || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);

    return normalized || fallback;
}

export function uniqueSafeName(name, usedNames, fallback = 'emote') {
    const base = sanitizeName(name, fallback);
    let candidate = base;
    let suffix = 2;

    while (usedNames.has(candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }

    usedNames.add(candidate);
    return candidate;
}

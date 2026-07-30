import { sanitizeName, uniqueSafeName } from '../../../shared/files/names';

export function createEmoteVariant(baseEmote, existingEmotes = [], label = 'variant') {
    if (!baseEmote) throw new Error('No hay emote base para crear variante.');
    const usedNames = new Set(existingEmotes.map((emote) => sanitizeName(emote.name)));
    const variantName = uniqueSafeName(`${baseEmote.name}_${label}`, usedNames, 'variant');
    const variantId = crypto.randomUUID ? crypto.randomUUID() : `variant-${Date.now()}-${Math.random()}`;

    return {
        ...structuredCloneSafe(baseEmote),
        id: variantId,
        documentType: 'variant',
        variantOf: baseEmote.variantOf || baseEmote.id,
        name: variantName,
        history: [],
        validation: {
            errors: [],
            warnings: [
                ...(baseEmote.validation?.warnings || []).filter((warning) => typeof warning === 'string' ? !warning.includes('variante') : true),
                'Variante derivada; comparte fuente y crop no destructivo.',
            ],
        },
    };
}

export function renameVariant(emote, label) {
    return {
        ...emote,
        name: sanitizeName(label, emote.name || 'variant'),
    };
}

function structuredCloneSafe(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

import { sanitizeName } from '../../../shared/files/names';

export function validateTwitchOutput(metadata, preset, outputRule) {
    const errors = [];
    const warnings = [];
    const safeName = sanitizeName(metadata.name);

    if (!metadata.name || safeName !== metadata.name) {
        warnings.push('El nombre se normalizara para exportacion.');
    }

    if (metadata.mime !== preset.format) {
        errors.push(`Formato invalido: se esperaba ${preset.format}.`);
    }

    if (metadata.extension && metadata.extension !== preset.extension) {
        errors.push(`Extension invalida: se esperaba .${preset.extension}.`);
    }

    if (preset.square && metadata.width !== metadata.height) {
        errors.push('La salida debe ser cuadrada.');
    }

    if (outputRule.width && metadata.width !== outputRule.width) {
        errors.push(`Ancho invalido: se esperaba ${outputRule.width}px.`);
    }

    if (outputRule.height && metadata.height !== outputRule.height) {
        errors.push(`Alto invalido: se esperaba ${outputRule.height}px.`);
    }

    if (outputRule.minWidth && metadata.width < outputRule.minWidth) {
        errors.push(`Ancho menor al minimo de ${outputRule.minWidth}px.`);
    }

    if (outputRule.maxWidth && metadata.width > outputRule.maxWidth) {
        errors.push(`Ancho mayor al maximo de ${outputRule.maxWidth}px.`);
    }

    if (outputRule.maxBytes && metadata.bytes > outputRule.maxBytes) {
        errors.push(`Peso mayor al limite de ${outputRule.maxBytes} bytes.`);
    }

    if (metadata.bytes <= 0) {
        errors.push('Archivo vacio.');
    }

    if (metadata.pngSignatureValid === false) {
        errors.push('Firma PNG invalida.');
    }

    if (preset.transparentBackground && !metadata.hasTransparency) {
        errors.push('La salida debe conservar transparencia real.');
    }

    if (preset.transparentBackground && metadata.transparentPixelRatio === 0) {
        errors.push('La salida es completamente opaca.');
    }

    if (metadata.visiblePixelRatio === 0) {
        errors.push('La salida no contiene pixeles visibles.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

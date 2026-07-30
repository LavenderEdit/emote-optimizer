import { scoreEmptyCell } from '../gridValidation/scoreEmptyCell';
import { estimateRectEdgeColor } from './color';
import { estimateBackground } from './estimateBackground';
import { findForegroundRuns, medianGap, runsToGutters } from './findGutters';
import { buildDifferenceMask, buildProjectionProfiles, smoothProfile } from './projectionProfiles';

export function analyzeGridImageData({ data, width, height }) {
    const background = estimateBackground(data, width, height);
    const mask = buildDifferenceMask(data, width, height, background.color, Math.max(14, background.variance + 12));
    const profiles = buildProjectionProfiles(mask, width, height);
    const verticalProfile = smoothProfile(profiles.vertical, Math.max(2, Math.round(width / 500)));
    const horizontalProfile = smoothProfile(profiles.horizontal, Math.max(2, Math.round(height / 500)));
    const columnBands = findForegroundRuns(verticalProfile, { minSize: Math.max(8, Math.round(width * 0.04)) });
    const rowBands = findForegroundRuns(horizontalProfile, { minSize: Math.max(8, Math.round(height * 0.04)) });
    const warnings = [];

    if (columnBands.length <= 1 || rowBands.length <= 1) {
        warnings.push('Confianza baja: no se detectaron gutters suficientes. Ajusta el grid manualmente.');
    }

    const horizontalGap = medianGap(columnBands);
    const verticalGap = medianGap(rowBands);
    const cells = buildCells({
        data,
        width,
        height,
        rowBands,
        columnBands,
    });
    const confidence = scoreGrid({
        rowBands,
        columnBands,
        width,
        height,
        backgroundConfidence: background.confidence,
        cells,
    });

    if (confidence < 0.68) {
        warnings.push('Confianza baja: revisa filas, columnas y celdas antes de generar recortes.');
    }

    return {
        rows: rowBands.length,
        columns: columnBands.length,
        rowBands,
        columnBands,
        rowBoundaries: rowBands.flatMap((band) => [band.start, band.end]),
        columnBoundaries: columnBands.flatMap((band) => [band.start, band.end]),
        outerMargins: {
            top: rowBands[0]?.start ?? 0,
            bottom: height - (rowBands[rowBands.length - 1]?.end ?? height),
            left: columnBands[0]?.start ?? 0,
            right: width - (columnBands[columnBands.length - 1]?.end ?? width),
        },
        horizontalGap,
        verticalGap,
        cells,
        confidence,
        warnings,
        background,
        gutters: {
            horizontal: runsToGutters(rowBands, height),
            vertical: runsToGutters(columnBands, width),
        },
    };
}

function buildCells({ data, width, height, rowBands, columnBands }) {
    const cells = [];
    rowBands.forEach((rowBand, row) => {
        columnBands.forEach((columnBand, column) => {
            const sourceRect = {
                x: Math.round(columnBand.start),
                y: Math.round(rowBand.start),
                width: Math.round(columnBand.end - columnBand.start),
                height: Math.round(rowBand.end - rowBand.start),
            };
            const cellBackground = estimateRectEdgeColor(data, width, height, sourceRect, 4);
            const diagnostics = scoreEmptyCell(data, width, height, sourceRect, cellBackground);
            const empty = diagnostics.classification === 'empty';
            const warnings = [];
            if (diagnostics.classification === 'uncertain') warnings.push('Celda dudosa: confirma si contiene emote.');
            if (empty) warnings.push('Celda aparentemente vacia detectada automaticamente.');

            cells.push({
                id: `r${row + 1}c${column + 1}`,
                row,
                column,
                sourceRect,
                contentRect: sourceRect,
                enabled: !empty,
                empty,
                classification: diagnostics.classification,
                confidence: diagnostics.classification === 'uncertain' ? 0.58 : 0.9,
                name: `emote_${String(row * columnBands.length + column + 1).padStart(3, '0')}`,
                warnings,
                diagnostics,
            });
        });
    });
    return cells;
}

function scoreGrid({ rowBands, columnBands, width, height, backgroundConfidence, cells }) {
    const rowRegularity = regularity(rowBands.map((band) => band.end - band.start));
    const columnRegularity = regularity(columnBands.map((band) => band.end - band.start));
    const rowCountScore = rowBands.length >= 2 && rowBands.length <= 20 ? 1 : 0.2;
    const columnCountScore = columnBands.length >= 2 && columnBands.length <= 20 ? 1 : 0.2;
    const coverage = cells.reduce((sum, cell) => sum + cell.sourceRect.width * cell.sourceRect.height, 0) / (width * height);
    const coverageScore = Math.max(0, Math.min(1, coverage / 0.85));

    return roundConfidence(
        rowRegularity * 0.22 +
        columnRegularity * 0.22 +
        rowCountScore * 0.16 +
        columnCountScore * 0.16 +
        coverageScore * 0.14 +
        backgroundConfidence * 0.10
    );
}

function regularity(values) {
    if (values.length <= 1) return 0.2;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const coefficient = Math.sqrt(variance) / Math.max(1, mean);
    return Math.max(0, Math.min(1, 1 - coefficient * 4));
}

function roundConfidence(value) {
    return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

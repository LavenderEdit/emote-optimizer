export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function normalizeRect(rect) {
    const x = rect.width < 0 ? rect.x + rect.width : rect.x;
    const y = rect.height < 0 ? rect.y + rect.height : rect.y;

    return {
        x,
        y,
        width: Math.abs(rect.width),
        height: Math.abs(rect.height),
    };
}

export function insetRect(rect, inset) {
    const top = typeof inset === 'number' ? inset : inset.top || 0;
    const right = typeof inset === 'number' ? inset : inset.right || 0;
    const bottom = typeof inset === 'number' ? inset : inset.bottom || 0;
    const left = typeof inset === 'number' ? inset : inset.left || 0;

    const next = {
        x: rect.x + left,
        y: rect.y + top,
        width: rect.width - left - right,
        height: rect.height - top - bottom,
    };

    return {
        ...next,
        width: Math.max(1, next.width),
        height: Math.max(1, next.height),
    };
}

export function rectToEdges(rect) {
    return {
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
    };
}

export function mapRect(rect, fromSpace, toSpace) {
    const scaleX = toSpace.width / fromSpace.width;
    const scaleY = toSpace.height / fromSpace.height;

    return {
        x: (rect.x - (fromSpace.x || 0)) * scaleX + (toSpace.x || 0),
        y: (rect.y - (fromSpace.y || 0)) * scaleY + (toSpace.y || 0),
        width: rect.width * scaleX,
        height: rect.height * scaleY,
    };
}

export function createContainSquarePlacement(sourceWidth, sourceHeight, targetSize, padding = 0) {
    const safePadding = clamp(padding, 0, Math.floor(targetSize / 2) - 1);
    const drawableSize = targetSize - safePadding * 2;
    const scale = Math.min(drawableSize / sourceWidth, drawableSize / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    return {
        x: Math.round((targetSize - width) / 2),
        y: Math.round((targetSize - height) / 2),
        width,
        height,
        scale,
    };
}

export function createContainSquareRect(contentRect, bounds, padding = 0) {
    const side = Math.max(contentRect.width, contentRect.height) + padding * 2;
    const maxSide = Math.min(bounds.width, bounds.height);
    const squareSide = clamp(side, 1, maxSide);
    const centerX = contentRect.x + contentRect.width / 2;
    const centerY = contentRect.y + contentRect.height / 2;

    return {
        x: clamp(centerX - squareSide / 2, bounds.x, bounds.x + bounds.width - squareSide),
        y: clamp(centerY - squareSide / 2, bounds.y, bounds.y + bounds.height - squareSide),
        width: squareSide,
        height: squareSide,
    };
}

export function roundRect(rect) {
    return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
    };
}

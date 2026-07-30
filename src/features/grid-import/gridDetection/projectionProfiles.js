import { colorDistance } from './color';

export function buildDifferenceMask(data, width, height, backgroundColor, threshold = 18) {
    const mask = new Uint8Array(width * height);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
        const offset = pixel * 4;
        const color = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
        mask[pixel] = colorDistance(color, backgroundColor) > threshold ? 1 : 0;
    }
    return mask;
}

export function buildProjectionProfiles(mask, width, height) {
    const vertical = new Array(width).fill(0);
    const horizontal = new Array(height).fill(0);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const value = mask[y * width + x];
            vertical[x] += value;
            horizontal[y] += value;
        }
    }

    return {
        vertical: vertical.map((value) => value / height),
        horizontal: horizontal.map((value) => value / width),
    };
}

export function smoothProfile(profile, radius = 2) {
    return profile.map((_, index) => {
        let sum = 0;
        let count = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
            const nextIndex = index + offset;
            if (nextIndex >= 0 && nextIndex < profile.length) {
                sum += profile[nextIndex];
                count += 1;
            }
        }
        return sum / count;
    });
}

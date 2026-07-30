import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function readPngImageData(path) {
    return readPngImageDataFromBuffer(readFileSync(path));
}

export function readPngImageDataFromBuffer(input) {
    const file = Buffer.isBuffer(input) ? input : Buffer.from(input);
    PNG_SIGNATURE.forEach((byte, index) => {
        if (file[index] !== byte) throw new Error('Fixture PNG invalido.');
    });

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    const idatChunks = [];

    while (offset < file.length) {
        const length = file.readUInt32BE(offset);
        const type = file.toString('ascii', offset + 4, offset + 8);
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        const chunkData = file.subarray(dataStart, dataEnd);

        if (type === 'IHDR') {
            width = chunkData.readUInt32BE(0);
            height = chunkData.readUInt32BE(4);
            bitDepth = chunkData[8];
            colorType = chunkData[9];
            interlace = chunkData[12];
        } else if (type === 'IDAT') {
            idatChunks.push(chunkData);
        } else if (type === 'IEND') {
            break;
        }

        offset = dataEnd + 4;
    }

    if (bitDepth !== 8 || interlace !== 0) {
        throw new Error('Solo se soportan fixtures PNG 8-bit sin interlace.');
    }

    const channels = getChannels(colorType);
    const raw = inflateSync(Buffer.concat(idatChunks));
    const unfiltered = unfilterPng(raw, width, height, channels);
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let pixel = 0; pixel < width * height; pixel += 1) {
        const source = pixel * channels;
        const target = pixel * 4;
        if (colorType === 0) {
            rgba[target] = unfiltered[source];
            rgba[target + 1] = unfiltered[source];
            rgba[target + 2] = unfiltered[source];
            rgba[target + 3] = 255;
        } else if (colorType === 2) {
            rgba[target] = unfiltered[source];
            rgba[target + 1] = unfiltered[source + 1];
            rgba[target + 2] = unfiltered[source + 2];
            rgba[target + 3] = 255;
        } else if (colorType === 6) {
            rgba[target] = unfiltered[source];
            rgba[target + 1] = unfiltered[source + 1];
            rgba[target + 2] = unfiltered[source + 2];
            rgba[target + 3] = unfiltered[source + 3];
        }
    }

    return { data: rgba, width, height };
}

export function hasPngSignature(input) {
    const file = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return PNG_SIGNATURE.every((byte, index) => file[index] === byte);
}

function getChannels(colorType) {
    if (colorType === 0) return 1;
    if (colorType === 2) return 3;
    if (colorType === 6) return 4;
    throw new Error(`Tipo de color PNG no soportado: ${colorType}`);
}

function unfilterPng(raw, width, height, channels) {
    const stride = width * channels;
    const output = Buffer.alloc(stride * height);
    let inputOffset = 0;

    for (let y = 0; y < height; y += 1) {
        const filter = raw[inputOffset];
        inputOffset += 1;
        const rowOffset = y * stride;

        for (let x = 0; x < stride; x += 1) {
            const rawValue = raw[inputOffset + x];
            const left = x >= channels ? output[rowOffset + x - channels] : 0;
            const up = y > 0 ? output[rowOffset + x - stride] : 0;
            const upLeft = y > 0 && x >= channels ? output[rowOffset + x - stride - channels] : 0;

            output[rowOffset + x] = (rawValue + unfilterValue(filter, left, up, upLeft)) & 0xff;
        }

        inputOffset += stride;
    }

    return output;
}

function unfilterValue(filter, left, up, upLeft) {
    if (filter === 0) return 0;
    if (filter === 1) return left;
    if (filter === 2) return up;
    if (filter === 3) return Math.floor((left + up) / 2);
    if (filter === 4) return paeth(left, up, upLeft);
    throw new Error(`Filtro PNG no soportado: ${filter}`);
}

function paeth(left, up, upLeft) {
    const estimate = left + up - upLeft;
    const leftDistance = Math.abs(estimate - left);
    const upDistance = Math.abs(estimate - up);
    const upLeftDistance = Math.abs(estimate - upLeft);
    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
    if (upDistance <= upLeftDistance) return up;
    return upLeft;
}

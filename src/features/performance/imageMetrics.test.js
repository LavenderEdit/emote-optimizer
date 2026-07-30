import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeImageMetrics } from './imageMetrics';
import { startImageMetricsAnalysis } from './imageMetricsWorkerClient';

describe('imageMetrics', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('computes histograms and projection profiles from visible pixels', () => {
        const data = new Uint8ClampedArray([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 0,
            255, 255, 255, 255,
        ]);

        const metrics = computeImageMetrics({ data, width: 2, height: 2 });

        expect(metrics.visiblePixels).toBe(3);
        expect(metrics.alphaPixels).toBe(3);
        expect(metrics.horizontalProjection).toEqual([1, 0.5]);
        expect(metrics.verticalProjection).toEqual([0.5, 1]);
        expect(metrics.histogram.red[255]).toBe(2);
        expect(metrics.histogram.alpha[0]).toBe(1);
    });

    it('rejects stale worker responses by requestId and sourceId', async () => {
        const workers = [];
        vi.stubGlobal('Worker', class {
            constructor() {
                workers.push(this);
            }

            postMessage(message) {
                this.message = message;
            }

            terminate = vi.fn();
        });
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('request-current');

        const request = startImageMetricsAnalysis({
            sourceId: 'asset-current',
            imageData: {
                width: 1,
                height: 1,
                data: new Uint8ClampedArray([255, 255, 255, 255]),
            },
        });

        workers[0].onmessage({ data: { ok: true, requestId: 'request-old', sourceId: 'asset-current', metrics: {} } });

        await expect(request.promise).rejects.toThrow('obsoleta');
        expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    });

    it('terminates workers when canceled', async () => {
        const workers = [];
        vi.stubGlobal('Worker', class {
            constructor() {
                workers.push(this);
            }

            postMessage() {}

            terminate = vi.fn();
        });

        const request = startImageMetricsAnalysis({
            sourceId: 'asset-current',
            imageData: {
                width: 1,
                height: 1,
                data: new Uint8ClampedArray([255, 255, 255, 255]),
            },
        });
        request.cancel();

        await expect(request.promise).rejects.toMatchObject({ name: 'AbortError' });
        expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    });
});

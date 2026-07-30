export function findForegroundRuns(profile, options = {}) {
    const threshold = options.threshold ?? Math.max(0.02, percentile(profile, 70) * 0.25);
    const minSize = options.minSize ?? Math.max(4, Math.round(profile.length * 0.025));
    const mergeGap = options.mergeGap ?? Math.max(2, Math.round(profile.length * 0.006));
    const runs = [];
    let start = null;

    profile.forEach((value, index) => {
        if (value > threshold && start === null) start = index;
        if ((value <= threshold || index === profile.length - 1) && start !== null) {
            const end = value <= threshold ? index : index + 1;
            runs.push({ start, end });
            start = null;
        }
    });

    const merged = [];
    for (const run of runs) {
        const previous = merged[merged.length - 1];
        if (previous && run.start - previous.end <= mergeGap) {
            previous.end = run.end;
        } else {
            merged.push({ ...run });
        }
    }

    return merged.filter((run) => run.end - run.start >= minSize);
}

export function runsToGutters(runs, size) {
    const gutters = [];
    if (runs.length === 0) return gutters;

    gutters.push({ start: 0, end: runs[0].start, type: 'outer' });
    for (let index = 0; index < runs.length - 1; index += 1) {
        gutters.push({ start: runs[index].end, end: runs[index + 1].start, type: 'inner' });
    }
    gutters.push({ start: runs[runs.length - 1].end, end: size, type: 'outer' });
    return gutters.filter((gutter) => gutter.end > gutter.start);
}

export function medianGap(runs) {
    const gaps = [];
    for (let index = 0; index < runs.length - 1; index += 1) {
        gaps.push(runs[index + 1].start - runs[index].end);
    }
    if (gaps.length === 0) return 0;
    gaps.sort((a, b) => a - b);
    return Math.round(gaps[Math.floor(gaps.length / 2)]);
}

function percentile(values, target) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) * (target / 100))] || 0;
}

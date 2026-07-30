export const twitchStaticManual = {
    id: 'twitch-static-manual',
    version: '2026-07-30',
    label: 'Twitch static manual',
    format: 'image/png',
    extension: 'png',
    animated: false,
    square: true,
    transparentBackground: true,
    outputs: [
        { width: 112, height: 112, maxBytes: 100_000 },
        { width: 56, height: 56, maxBytes: 100_000 },
        { width: 28, height: 28, maxBytes: 100_000 },
    ],
};

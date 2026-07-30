export const twitchStaticAuto = {
    id: 'twitch-static-auto',
    version: '2026-07-30',
    label: 'Twitch static auto-resize',
    format: 'image/png',
    extension: 'png',
    animated: false,
    square: true,
    transparentBackground: true,
    outputs: [
        { minWidth: 112, minHeight: 112, maxWidth: 4096, maxHeight: 4096, maxBytes: 1_000_000 },
    ],
};

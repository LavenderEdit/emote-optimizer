export const referenceGrid5x5Fixture = {
    width: 994,
    height: 1001,
    rows: 5,
    columns: 5,
    margins: {
        left: 14,
        right: 18,
        top: 28,
        bottom: 18,
    },
    horizontalGap: 34,
    verticalGap: 34,
    expectedContentCells: 24,
    emptyCellId: 'r5c5',
};

export const realReferenceGrid994x1001Fixture = {
    ...referenceGrid5x5Fixture,
    id: 'real-reference-994x1001',
    sourceKind: 'user-provided-reference-normalized',
    imagePath: 'src/test/fixtures/images/reference-grid-994x1001.png',
    originalDimensions: { width: 2048, height: 2062 },
    notes: 'Normalized from the user-provided PNG reference to the documented 994 x 1001 integration size.',
};

export const grayBackgroundGridFixture = {
    width: 720,
    height: 620,
    rows: 4,
    columns: 4,
    margins: { left: 24, right: 24, top: 22, bottom: 26 },
    horizontalGap: 18,
    verticalGap: 20,
    expectedContentCells: 15,
    emptyCellId: 'r4c4',
    backgroundColor: [214, 216, 220, 255],
    cardColor: [238, 239, 242, 255],
};

export const shadowedGridFixture = {
    width: 820,
    height: 690,
    rows: 3,
    columns: 5,
    margins: { left: 32, right: 30, top: 28, bottom: 32 },
    horizontalGap: 22,
    verticalGap: 24,
    expectedContentCells: 14,
    emptyCellId: 'r3c5',
    backgroundColor: [248, 248, 247, 255],
    cardColor: [235, 236, 238, 255],
    shadow: true,
};

export const irregularGutterGridFixture = {
    width: 880,
    height: 760,
    rows: 4,
    columns: 3,
    expectedContentCells: 11,
    emptyCellId: 'r4c3',
    rowBands: [
        { start: 24, end: 168 },
        { start: 198, end: 350 },
        { start: 386, end: 536 },
        { start: 574, end: 728 },
    ],
    columnBands: [
        { start: 28, end: 246 },
        { start: 284, end: 514 },
        { start: 556, end: 842 },
    ],
};

export const threeByFourGridFixture = {
    width: 640,
    height: 480,
    rows: 3,
    columns: 4,
    margins: { left: 16, right: 16, top: 18, bottom: 18 },
    horizontalGap: 16,
    verticalGap: 14,
    expectedContentCells: 12,
};

export const sixByThreeGridFixture = {
    width: 540,
    height: 960,
    rows: 6,
    columns: 3,
    margins: { left: 20, right: 20, top: 24, bottom: 24 },
    horizontalGap: 14,
    verticalGap: 18,
    expectedContentCells: 18,
};

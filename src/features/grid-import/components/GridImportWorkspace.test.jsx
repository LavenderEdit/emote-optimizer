import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createGridDraft } from '../gridSegmentation/gridDraft';
import GridImportWorkspace from './GridImportWorkspace';

const asset = {
    id: 'asset-grid',
    fileName: 'grid.png',
    name: 'grid',
    mimeType: 'image/png',
    bytes: 1234,
    width: 100,
    height: 100,
    objectUrl: 'blob:grid',
};

function Harness({ onGenerate = vi.fn(), onAutoDetect = vi.fn() }) {
    const [draft, setDraft] = useState(createGridDraft(asset, { rows: 2, columns: 2 }));

    return (
        <GridImportWorkspace
            draft={draft}
            theme="light"
            onDraftChange={(updater) => setDraft((current) => (typeof updater === 'function' ? updater(current) : updater))}
            onGenerate={onGenerate}
            onAutoDetect={onAutoDetect}
            onCancel={vi.fn()}
            isGenerating={false}
            isDetecting={false}
        />
    );
}

describe('GridImportWorkspace', () => {
    it('renders editable cells, thumbnails, warnings and generation controls', () => {
        render(<Harness />);

        expect(screen.getByText('Grid manual')).toBeInTheDocument();
        expect(screen.getByText('4 activos / 4 pendientes')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Ultima vacia'));

        expect(screen.getByText('3 activos / 3 pendientes')).toBeInTheDocument();
        expect(screen.getByText('No se exportara mientras este marcada como vacia.')).toBeInTheDocument();
    });

    it('triggers automatic detection from the manual editor', () => {
        const onAutoDetect = vi.fn();
        render(<Harness onAutoDetect={onAutoDetect} />);

        fireEvent.click(screen.getByText('Detectar automaticamente'));

        expect(onAutoDetect).toHaveBeenCalledTimes(1);
    });
});

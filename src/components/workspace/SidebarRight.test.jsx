import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarRight from './SidebarRight';

const baseProps = {
    theme: 'light',
    activeEmote: {
        id: 'emote-1',
        name: 'emote_001',
        frame: { zoom: 1, offsetX: 0, offsetY: 0 },
        padding: 0,
        backgroundRemoval: { version: 2, mode: 'connected', removedRatio: 0.3 },
        outline: { enabled: false },
        fitMode: 'contain',
    },
    processedImage: null,
    activeMetrics: null,
    performanceStats: null,
    onExport: vi.fn(),
    isExporting: false,
    totalItems: 24,
    selectedCount: 3,
    exportOptions: { presetId: 'twitch-static-manual', activeOutputSize: 112, scope: 'all' },
    exportState: { status: 'idle', progress: null, summary: null, downloadUrl: null },
    onExportOptionsChange: vi.fn(),
    onPrepareExport: vi.fn(),
    onCancelExport: vi.fn(),
    onRetryExport: vi.fn(),
    onDownloadPreparedExport: vi.fn(),
    onDownloadActivePng: vi.fn(),
    hasSettingsClipboard: false,
    comparisonMode: 'after',
    onComparisonModeChange: vi.fn(),
    onSelectAll: vi.fn(),
    onSelectNone: vi.fn(),
    onSelectInvert: vi.fn(),
    onSelectWarnings: vi.fn(),
    onUpdateTargets: vi.fn(),
    onCopySettings: vi.fn(),
    onPasteSettings: vi.fn(),
    onApplyActiveSettings: vi.fn(),
    onCreateVariant: vi.fn(),
    onTrimSelected: vi.fn(),
    isTrimmingBatch: false,
    onApplyBackgroundV2: vi.fn(),
    onUpdateBackgroundV2Params: vi.fn(),
    onResetBackgroundV2: vi.fn(),
    onRemoveBackgroundV2: vi.fn(),
    onApplyBackgroundV2Params: vi.fn(),
    isApplyingBackgroundV2: false,
};

describe('SidebarRight', () => {
    it('keeps background v2 controls reachable in the scroll panel', () => {
        render(<SidebarRight {...baseProps} />);

        expect(screen.getByTestId('right-sidebar-scroll')).toHaveClass('overflow-y-auto');
        expect(screen.getByText('Fondo claro grid')).toBeInTheDocument();
        expect(screen.getByText('Recomendado para fondos #EFEFEF/#FEFEFE.')).toBeInTheDocument();
        expect(screen.getByText('Fondo activo')).toBeInTheDocument();
        expect(screen.getByText('Fondo seleccion')).toBeInTheDocument();
        expect(screen.getByText('Fondo todos')).toBeInTheDocument();
        expect(screen.getByTestId('comparison-mask-mode')).toHaveTextContent('Ver mascara');
        expect(screen.getByTestId('prepare-export')).toBeInTheDocument();
    });

    it('applies the light grid preset to all emotes in one action', () => {
        render(<SidebarRight {...baseProps} />);

        fireEvent.click(screen.getByTestId('background-v2-light-grid-all'));

        expect(baseProps.onApplyBackgroundV2).toHaveBeenCalledWith('all', 'connected', { presetId: 'light-grid' });
    });
});

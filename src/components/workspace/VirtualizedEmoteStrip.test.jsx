import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VirtualizedEmoteStrip from './VirtualizedEmoteStrip';

describe('VirtualizedEmoteStrip', () => {
    it('mounts only the visible thumbnail window and keeps controls interactive', () => {
        const onActivate = vi.fn();
        const onToggleSelection = vi.fn();
        const emotes = Array.from({ length: 150 }, (_, index) => ({
            id: `emote-${index}`,
            name: `emote_${String(index).padStart(3, '0')}`,
            sourceId: 'asset',
            cropRect: { x: index, y: 0, width: 64, height: 64 },
        }));
        render(
            <VirtualizedEmoteStrip
                theme="light"
                emotes={emotes}
                assets={{ asset: { id: 'asset', width: 1000, height: 1000, objectUrl: 'blob:asset' } }}
                activeId="emote-0"
                selectedEmoteIds={['emote-0']}
                onActivate={onActivate}
                onToggleSelection={onToggleSelection}
                onRemoveActive={vi.fn()}
                onUploadClick={vi.fn()}
            />
        );

        expect(screen.getAllByRole('button', { name: /Abrir emote_/ })).toHaveLength(21);
        expect(screen.queryByRole('button', { name: 'Abrir emote_090' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Abrir emote_000' }));
        fireEvent.click(screen.getByRole('button', { name: 'Seleccionar emote_000' }));

        expect(onActivate).toHaveBeenCalledWith('emote-0');
        expect(onToggleSelection).toHaveBeenCalledWith('emote-0');

        fireEvent.scroll(screen.getByTestId('virtualized-emote-strip'), { target: { scrollLeft: 7200 } });

        expect(screen.getByRole('button', { name: 'Abrir emote_090' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Abrir emote_000' })).not.toBeInTheDocument();
    });
});

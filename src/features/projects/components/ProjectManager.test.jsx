import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectManager from './ProjectManager';

describe('ProjectManager', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('prompt', vi.fn(() => 'Nuevo nombre'));
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:project');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    it('surfaces recovery, project actions, import and export controls', async () => {
        const projectPersistence = createPersistence();
        const { container } = render(<ProjectManager theme="light" projectPersistence={projectPersistence} />);

        expect(screen.getByTestId('autosave-status')).toHaveTextContent('Guardado');
        expect(screen.getByTestId('recovery-dialog')).toHaveTextContent('Proyecto recuperado');

        fireEvent.click(screen.getByText('Recuperar'));
        await waitFor(() => expect(projectPersistence.recoverProject).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByTestId('project-manager-toggle'));
        expect(screen.getByTestId('project-manager-panel')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Guardar'));
        fireEvent.click(screen.getByText('Guardar como'));
        fireEvent.click(screen.getByText('Exportar'));
        fireEvent.click(screen.getByText('Renombrar'));
        fireEvent.click(screen.getByText('Duplicar'));
        fireEvent.click(screen.getByText('Eliminar'));

        const input = container.querySelector('input[type="file"]');
        fireEvent.change(input, {
            target: { files: [new File(['zip'], 'pack.emoteproject', { type: 'application/zip' })] },
        });

        await waitFor(() => {
            expect(projectPersistence.saveNow).toHaveBeenCalledTimes(1);
            expect(projectPersistence.saveAs).toHaveBeenCalledWith('Nuevo nombre');
            expect(projectPersistence.exportCurrentProject).toHaveBeenCalledTimes(1);
            expect(projectPersistence.renameProject).toHaveBeenCalledWith('project-1', 'Nuevo nombre');
            expect(projectPersistence.duplicateProject).toHaveBeenCalledWith('project-1');
            expect(projectPersistence.removeProject).toHaveBeenCalledWith('project-1');
            expect(projectPersistence.importProject).toHaveBeenCalledTimes(1);
        });
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });
});

function createPersistence() {
    return {
        metadata: { id: 'project-1', name: 'Mi pack' },
        projects: [{
            id: 'project-1',
            name: 'Mi pack',
            updatedAt: '2026-07-30T00:00:00.000Z',
            size: 2048,
            emoteCount: 24,
        }],
        autosave: { status: 'Guardado', lastSavedAt: null, error: null },
        recoverableProject: { metadata: { name: 'Proyecto recuperado' } },
        saveNow: vi.fn().mockResolvedValue({}),
        saveAs: vi.fn().mockResolvedValue({}),
        openProject: vi.fn().mockResolvedValue({}),
        recoverProject: vi.fn().mockResolvedValue({}),
        startNewProject: vi.fn(),
        removeProject: vi.fn().mockResolvedValue({}),
        duplicateProject: vi.fn().mockResolvedValue({}),
        renameProject: vi.fn().mockResolvedValue({}),
        exportCurrentProject: vi.fn().mockResolvedValue({
            blob: new Blob(['project'], { type: 'application/zip' }),
            fileName: 'mi_pack.emoteproject',
        }),
        importProject: vi.fn().mockResolvedValue({}),
    };
}

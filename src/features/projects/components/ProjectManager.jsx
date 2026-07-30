import React, { useRef, useState } from 'react';
import { Download, FolderOpen, Save, Trash2, Upload } from 'lucide-react';

export default function ProjectManager({ theme, projectPersistence }) {
    const isDark = theme === 'dark';
    const importRef = useRef(null);
    const [open, setOpen] = useState(false);
    const {
        metadata,
        projects,
        autosave,
        recoverableProject,
        saveNow,
        saveAs,
        openProject,
        recoverProject,
        startNewProject,
        removeProject,
        duplicateProject,
        renameProject,
        exportCurrentProject,
        importProject,
    } = projectPersistence;

    const buttonClass = isDark
        ? 'rounded border border-[#7f6000]/50 bg-[#3d0604] px-2 py-1 text-xs text-[#deb069] hover:border-[#deb069] disabled:opacity-40'
        : 'rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:border-purple-500 disabled:opacity-40';

    const run = async (action) => {
        try {
            await action();
        } catch (error) {
            alert(error.message || 'No se pudo completar la accion de proyecto.');
        }
    };

    const handleSaveAs = () => run(async () => {
        const name = window.prompt('Nombre del proyecto', metadata?.name || 'Mi paquete de emotes');
        if (name) await saveAs(name);
    });

    const handleRename = (project) => run(async () => {
        const name = window.prompt('Nuevo nombre', project.name);
        if (name) await renameProject(project.id, name);
    });

    const handleExport = () => run(async () => {
        const exported = await exportCurrentProject();
        const url = URL.createObjectURL(exported.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = exported.fileName;
        link.click();
        URL.revokeObjectURL(url);
    });

    const handleImport = (event) => run(async () => {
        const file = event.target.files?.[0];
        if (!file) return;
        await importProject(file);
        event.target.value = '';
    });

    return (
        <div className="relative">
            <button type="button" className={buttonClass} onClick={() => setOpen((current) => !current)} data-testid="project-manager-toggle">
                <FolderOpen size={14} className="inline" /> {metadata?.name || 'Proyecto'}
            </button>
            <span className={`ml-2 text-[11px] ${isDark ? 'text-[#deb069]/70' : 'text-gray-500'}`} aria-live="polite" data-testid="autosave-status">
                {autosave.status}{autosave.lastSavedAt ? ` ${new Date(autosave.lastSavedAt).toLocaleTimeString()}` : ''}
            </span>

            {recoverableProject && (
                <div className={`absolute right-0 top-9 z-20 w-80 rounded border p-3 shadow-xl ${isDark ? 'border-[#7f6000] bg-[#3d2304]' : 'border-gray-300 bg-white'}`} data-testid="recovery-dialog">
                    <div className="mb-2 text-sm font-semibold">Sesion recuperable</div>
                    <p className="mb-3 text-xs">Hay un proyecto guardado localmente: {recoverableProject.metadata?.name}</p>
                    <div className="grid grid-cols-3 gap-1">
                        <button className={buttonClass} onClick={() => run(recoverProject)}>Recuperar</button>
                        <button className={buttonClass} onClick={() => run(startNewProject)}>Nuevo</button>
                        <button className={buttonClass} onClick={() => setOpen(true)}>Abrir otro</button>
                    </div>
                </div>
            )}

            {open && (
                <div className={`absolute right-0 top-9 z-10 w-[420px] rounded border p-3 shadow-xl ${isDark ? 'border-[#7f6000] bg-[#3d2304]' : 'border-gray-300 bg-white'}`} data-testid="project-manager-panel">
                    <input ref={importRef} type="file" accept=".emoteproject,application/zip" className="hidden" onChange={handleImport} />
                    <div className="mb-3 grid grid-cols-4 gap-1">
                        <button className={buttonClass} onClick={() => run(startNewProject)}>Nuevo</button>
                        <button className={buttonClass} onClick={() => run(saveNow)}><Save size={13} className="inline" /> Guardar</button>
                        <button className={buttonClass} onClick={handleSaveAs}>Guardar como</button>
                        <button className={buttonClass} onClick={handleExport}><Download size={13} className="inline" /> Exportar</button>
                        <button className={buttonClass} onClick={() => importRef.current?.click()}><Upload size={13} className="inline" /> Importar</button>
                    </div>
                    {autosave.error && (
                        <div className={`mb-2 rounded border px-2 py-1 text-xs ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-100' : 'border-red-300 bg-red-50 text-red-800'}`}>
                            {autosave.error}
                        </div>
                    )}
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {projects.length === 0 && <div className="text-xs opacity-70">No hay proyectos guardados.</div>}
                        {projects.map((project) => (
                            <div key={project.id} className={`rounded border p-2 text-xs ${isDark ? 'border-[#7f6000]/40 bg-[#3d0604]' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <button className="truncate font-semibold underline-offset-2 hover:underline" onClick={() => run(() => openProject(project.id))}>
                                        {project.name}
                                    </button>
                                    <span>{formatBytes(project.size)}</span>
                                </div>
                                <div className="mt-1 opacity-70">
                                    {project.emoteCount} emotes - {new Date(project.updatedAt).toLocaleString()}
                                </div>
                                <div className="mt-2 grid grid-cols-4 gap-1">
                                    <button className={buttonClass} onClick={() => run(() => openProject(project.id))}>Abrir</button>
                                    <button className={buttonClass} onClick={() => handleRename(project)}>Renombrar</button>
                                    <button className={buttonClass} onClick={() => run(() => duplicateProject(project.id))}>Duplicar</button>
                                    <button className={buttonClass} onClick={() => run(() => removeProject(project.id))}><Trash2 size={13} className="inline" /> Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

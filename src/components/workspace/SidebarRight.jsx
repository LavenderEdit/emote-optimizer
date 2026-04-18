import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import PreviewBox from '../ui/PreviewBox';
import ChatSimulator from '../ui/ChatSimulator';

export default function SidebarRight({ theme, processedImage, onExport, isExporting, totalItems }) {
    const isDark = theme === 'dark';

    return (
        <aside className={`w-80 flex flex-col border-l ${isDark ? 'border-[#7f6000] bg-[#3d2304] text-[#deb069]' : 'border-gray-300 bg-white text-gray-800'}`}>
            <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
                <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Twitch Preview
                </h3>

                <div className={`rounded-lg p-4 mb-6 flex flex-col items-center gap-4 ${isDark ? 'bg-[#3d0604] border border-[#7f6000]/30 shadow-inner' : 'bg-gray-100'}`}>
                    <div className="flex w-full justify-between items-end">
                        <PreviewBox size={112} src={processedImage} theme={theme} />
                        <PreviewBox size={56} src={processedImage} theme={theme} />
                        <PreviewBox size={28} src={processedImage} theme={theme} />
                    </div>
                    <div className={`w-full flex justify-between text-xs font-mono ${isDark ? 'text-[#deb069]/50' : 'text-gray-500'}`}>
                        <span>112px</span><span>56px</span><span>28px</span>
                    </div>
                </div>

                <h3 className={`font-semibold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>
                    Ajustes de Exportación
                </h3>
                <div className="space-y-3">
                    <label className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${isDark ? 'border-[#7f6000] bg-[#7f6000]/10' : 'border-purple-500 bg-purple-50'}`}>
                        <input
                            type="radio"
                            name="format"
                            defaultChecked
                            className={`mr-3 h-4 w-4 ${isDark ? 'text-[#c41026] focus:ring-[#c41026] bg-[#3d0604] border-[#7f6000] accent-[#c41026]' : 'text-purple-600 focus:ring-purple-500'}`}
                        />
                        <div className="flex-1">
                            <p className="font-medium text-sm">Lote Twitch (ZIP)</p>
                            <p className={`text-xs ${isDark ? 'text-[#deb069]/60' : 'text-gray-500'}`}>Carpetas c/ 112px, 56px, 28px</p>
                        </div>
                    </label>
                </div>

                <ChatSimulator processedImage={processedImage} theme={theme} />

            </div>

            <div className={`p-4 border-t ${isDark ? 'border-[#7f6000]' : 'border-gray-300'}`}>
                <button
                    onClick={onExport}
                    disabled={totalItems === 0 || isExporting}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${totalItems > 0 && !isExporting
                            ? (isDark
                                ? 'bg-[#c41026] hover:bg-[#a00d1e] text-white shadow-lg shadow-[#c41026]/20 cursor-pointer'
                                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/20 cursor-pointer')
                            : (isDark
                                ? 'bg-black/20 text-[#deb069]/40 cursor-not-allowed border border-[#7f6000]/30'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50')
                        }`}
                >
                    {isExporting ? (
                        <><Loader2 size={20} className="animate-spin" /> Empaquetando ZIP...</>
                    ) : (
                        <><Download size={20} /> Exportar {totalItems > 0 ? totalItems : ''} Emotes</>
                    )}
                </button>
            </div>
        </aside>
    );
}
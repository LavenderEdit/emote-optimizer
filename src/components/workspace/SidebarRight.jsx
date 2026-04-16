import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import PreviewBox from '../ui/PreviewBox';
import ChatSimulator from '../ui/ChatSimulator';

export default function SidebarRight({ theme, processedImage, onExport, isExporting }) {
    return (
        <aside className={`w-80 flex flex-col border-l ${theme === 'dark' ? 'border-gray-800 bg-[#18181b]' : 'border-gray-300 bg-white'}`}>
            <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Twitch Preview</h3>

                <div className={`rounded-lg p-4 mb-6 flex flex-col items-center gap-4 ${theme === 'dark' ? 'bg-[#0e0e10]' : 'bg-gray-100'}`}>
                    <div className="flex w-full justify-between items-end">
                        <PreviewBox size={112} src={processedImage} theme={theme} />
                        <PreviewBox size={56} src={processedImage} theme={theme} />
                        <PreviewBox size={28} src={processedImage} theme={theme} />
                    </div>
                    <div className="w-full flex justify-between text-xs text-gray-500 font-mono">
                        <span>112px</span><span>56px</span><span>28px</span>
                    </div>
                </div>

                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Ajustes de Exportación</h3>
                <div className="space-y-3">
                    <label className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${theme === 'dark' ? 'border-purple-500 bg-purple-500/10' : 'border-purple-500 bg-purple-50'}`}>
                        <input type="radio" name="format" defaultChecked className="mr-3 text-purple-600 focus:ring-purple-500 h-4 w-4" />
                        <div className="flex-1">
                            <p className="font-medium text-sm">Twitch Estandar (ZIP)</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>112px, 56px, 28px PNG</p>
                        </div>
                    </label>
                </div>

                <ChatSimulator processedImage={processedImage} theme={theme} />

            </div>

            <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'}`}>
                <button
                    onClick={onExport}
                    disabled={!processedImage || isExporting}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${processedImage && !isExporting
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/20 cursor-pointer'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                        }`}
                >
                    {isExporting ? (
                        <><Loader2 size={20} className="animate-spin" /> Procesando...</>
                    ) : (
                        <><Download size={20} /> Exportar ZIP</>
                    )}
                </button>
            </div>
        </aside>
    );
}
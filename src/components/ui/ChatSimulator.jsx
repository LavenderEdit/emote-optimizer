import React from 'react';

export default function ChatSimulator({ processedImage, theme }) {
    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-[#18181b] text-[#efeff1]' : 'bg-[#f7f7f8] text-[#0e0e10]';
    const borderClass = isDark ? 'border-gray-700' : 'border-gray-300';
    const headerClass = isDark ? 'bg-[#0e0e10] border-gray-700' : 'bg-gray-200 border-gray-300';

    const renderEmote = () => {
        if (processedImage) {
            return <img src={processedImage} alt="emote" className="inline-block w-7 h-7 align-middle mx-1 drop-shadow-sm" />;
        }
        return <span className={`inline-block w-7 h-7 rounded align-middle mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></span>;
    };

    return (
        <div className={`mt-6 border rounded-lg overflow-hidden ${borderClass}`}>
            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b text-gray-500 ${headerClass}`}>
                Simulador de Chat en Vivo
            </div>
            <div className={`p-3 space-y-3 text-[13px] leading-5 font-sans ${bgClass}`}>
                <div>
                    <span className="font-bold text-[#FF4500] mr-1">NinjaStreamer:</span>
                    ¡Ese último movimiento fue increíble!
                </div>
                <div>
                    <span className="font-bold text-[#1E90FF] mr-1">ProPlayer99:</span>
                    Jajaja {renderEmote()} literalmente yo ahora mismo.
                </div>
                <div>
                    <span className="font-bold text-[#00FF7F] mr-1">ModMaster:</span>
                    GG WP equipo {renderEmote()} {renderEmote()}
                </div>
            </div>
        </div>
    );
}
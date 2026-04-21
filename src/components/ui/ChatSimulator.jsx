import React from 'react';

export default function ChatSimulator({ processedImage, theme }) {
    const isDark = theme === 'dark';

    const bgClass = isDark ? 'bg-[#000000]/40 text-[#efeff1]' : 'bg-[#f7f7f8] text-[#0e0e10]';
    const borderClass = isDark ? 'border-[#7f6000]/50 shadow-lg' : 'border-gray-300';
    const headerClass = isDark ? 'bg-[#3d0604] border-[#7f6000]/50 text-[#deb069]/70' : 'bg-gray-200 border-gray-300 text-gray-500';
    const emptyEmoteClass = isDark ? 'bg-[#3d2304] border border-[#7f6000]/30' : 'bg-gray-300';

    const renderEmote = () => {
        if (processedImage) {
            return <img src={processedImage} alt="emote" className="inline-block w-7 h-7 align-middle mx-1 drop-shadow-sm pixelated" />;
        }
        return <span className={`inline-block w-7 h-7 rounded align-middle mx-1 ${emptyEmoteClass}`}></span>;
    };

    return (
        <div className={`mt-6 border rounded-lg overflow-hidden ${borderClass}`}>
            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${headerClass}`}>
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
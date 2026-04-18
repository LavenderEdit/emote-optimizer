export const TRANSPARENCY_GRID = {
    backgroundImage: 'conic-gradient(rgba(150, 150, 150, 0.2) 90deg, transparent 90deg, transparent 270deg, rgba(150, 150, 150, 0.2) 270deg)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 10px 10px'
};

export const THEME_STYLES = {
    dark: {
        dropzone: 'border-[#7f6000] bg-[#3d2304]/50 hover:bg-[#3d2304] text-[#deb069]',
        uploadIcon: 'text-[#7f6000]',
        textSub: 'text-[#deb069]/60',
        canvasContainer: 'bg-[#3d2304] border border-[#7f6000]/30',
        canvasBg: 'bg-black/40',
        uploadBtn: 'bg-[#c41026] hover:bg-[#a00d1e] shadow-lg shadow-[#c41026]/20'
    },
    light: {
        dropzone: 'border-gray-300 bg-white text-gray-900',
        uploadIcon: 'text-gray-400',
        textSub: 'text-gray-500',
        canvasContainer: 'bg-white',
        canvasBg: 'bg-white',
        uploadBtn: 'bg-purple-600 hover:bg-purple-700'
    }
};
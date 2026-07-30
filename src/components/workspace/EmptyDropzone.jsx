import React from 'react';
import { Grid2X2, Image, Upload } from 'lucide-react';

export default function EmptyDropzone({ currentStyles, onUploadClick, onGridUploadClick }) {
    const isDark = currentStyles.dropzone.includes('text-[#deb069]');

    return (
        <div className={`w-full max-w-2xl h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${currentStyles.dropzone}`}>
            <Upload size={48} className={`mb-4 ${currentStyles.uploadIcon}`} />
            <h3 className="text-xl font-medium mb-2">Arrastra tus imagenes aqui</h3>
            <p className={`text-sm mb-6 ${currentStyles.textSub}`}>Soporta PNG, JPG, WEBP</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    onClick={onUploadClick}
                    className={`inline-flex items-center gap-2 text-white px-5 py-2 rounded-md font-medium transition-colors pointer-events-auto ${currentStyles.uploadBtn}`}
                >
                    <Image size={17} />
                    Imagen individual
                </button>
                <button
                    onClick={onGridUploadClick}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-medium transition-colors pointer-events-auto border ${isDark ? 'border-[#7f6000] text-[#deb069] hover:bg-[#7f6000]/20' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                    <Grid2X2 size={17} />
                    Paquete en grid
                </button>
            </div>
        </div>
    );
}

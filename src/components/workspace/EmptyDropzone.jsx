import React from 'react';
import { Upload } from 'lucide-react';

export default function EmptyDropzone({ currentStyles, onUploadClick }) {
    return (
        <div className={`w-full max-w-2xl h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${currentStyles.dropzone}`}>
            <Upload size={48} className={`mb-4 ${currentStyles.uploadIcon}`} />
            <h3 className="text-xl font-medium mb-2">Arrastra tus imágenes aquí</h3>
            <p className={`text-sm mb-6 ${currentStyles.textSub}`}>Soporta PNG, JPG, WEBP</p>
            <button
                onClick={onUploadClick}
                className={`text-white px-6 py-2 rounded-md font-medium transition-colors pointer-events-auto ${currentStyles.uploadBtn}`}
            >
                Explorar Archivos
            </button>
        </div>
    );
}
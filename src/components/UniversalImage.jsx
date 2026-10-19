// src/components/UniversalImage.jsx
// Componente de imagen universal con soporte transparente para fotos HEIC/HEIF de iPhone
// en Windows 7, 10, 11, Android y cualquier navegador moderno o antiguo.
import React from 'react';
import { Loader2, ImageIcon, ExternalLink, Download } from './Icons.jsx';
import { useUniversalImageUrl } from '../utils/heicConverter.js';

export { useUniversalImageUrl };

/**
 * UniversalImage: Reemplazo universal para <img> con decodificación al vuelo
 * de imágenes HEIC/HEIF de iOS, caché en memoria y resiliencia contra fallos de renderizado.
 */
export const UniversalImage = ({
  src,
  alt = 'Imagen',
  className = '',
  style = {},
  onClick,
  fallbackTitle = 'Ver imagen adjunta',
  showDownloadOnFail = true,
  loading = 'lazy',
  decoding = 'async',
  ...props
}) => {
  const { displaySrc, isConverting, hasError, handleNativeError } = useUniversalImageUrl(src);

  if (!src) return null;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-center select-none ${className}`}
        style={style}
        onClick={onClick}
      >
        <ImageIcon size={22} className="text-gray-400 mb-1" />
        <span className="text-[11px] font-bold truncate max-w-[140px] text-gray-700 dark:text-gray-200">
          {fallbackTitle || 'Imagen adjunta'}
        </span>
        {showDownloadOnFail && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 border border-blue-200 dark:border-blue-800/60"
            >
              <ExternalLink size={10} /> Abrir
            </a>
            <a
              href={src}
              download="foto.jpg"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Descargar"
            >
              <Download size={11} />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block overflow-hidden" style={style}>
      {isConverting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-xs">
          <Loader2 size={18} className="animate-spin text-blue-600" />
        </div>
      )}
      <img
        src={displaySrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onError={handleNativeError}
        onClick={onClick}
        className={`${className} ${isConverting ? 'opacity-40' : 'opacity-100 transition-opacity duration-200'}`}
        {...props}
      />
    </div>
  );
};

export default UniversalImage;

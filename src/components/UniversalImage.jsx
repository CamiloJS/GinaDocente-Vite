// src/components/UniversalImage.jsx
// Componente de imagen universal con soporte transparente para fotos HEIC/HEIF de iPhone
// en Windows 7, 10, 11, Android y cualquier navegador moderno o antiguo.
import React from 'react';
import { Loader2, ImageIcon, ExternalLink, Download } from './Icons.jsx';
import { useUniversalImageUrl, getKnownConvertedUrl } from '../utils/heicConverter.js';
import { handleForceDownload } from '../utils/helpers.js';

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

  const targetDirectUrl = getKnownConvertedUrl(src) || src;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-800/95 text-gray-500 dark:text-gray-400 text-center select-none shadow-xs ${className}`}
        style={style}
        onClick={onClick}
      >
        <ImageIcon size={20} className="text-gray-400 dark:text-gray-500 mb-1 shrink-0" />
        <span className="text-[10px] font-bold truncate max-w-[120px] text-gray-700 dark:text-gray-200">
          {fallbackTitle || alt || 'Imagen adjunta'}
        </span>
        {showDownloadOnFail && (
          <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) {
                  onClick(e);
                } else {
                  window.open(targetDirectUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 border border-blue-200 dark:border-blue-800/60 cursor-pointer"
              title="Abrir imagen"
            >
              <ExternalLink size={10} /> Abrir
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleForceDownload(targetDirectUrl, 'foto.jpg');
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              title="Descargar imagen"
            >
              <Download size={11} />
            </button>
          </div>
        )}
      </div>
    );
  }

  const isFullWidth = /(?:^|\s)w-full(?:\s|$)/.test(className);
  const hasCursorPointer = /(?:^|\s)cursor-pointer(?:\s|$)/.test(className) || Boolean(onClick);
  const roundedMatch = className.match(/(?:^|\s)(rounded(?:-[a-z0-9]+)?)(?:\s|$)/);
  const roundedClass = roundedMatch ? roundedMatch[1] : '';

  const isFixedDimension = (
    (/(?:^|\s)size-\d+/.test(className)) ||
    (/(?:^|\s)w-\d+/.test(className) && /(?:^|\s)h-\d+/.test(className))
  ) && !className.includes('w-auto') && !isFullWidth;

  return (
    <div 
      className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} overflow-hidden ${roundedClass} ${hasCursorPointer ? 'cursor-pointer' : ''} ${isFixedDimension ? className : ''} ${isConverting ? 'bg-gray-100 dark:bg-gray-800/60' : ''}`} 
      style={style}
      onClick={onClick}
    >
      {isConverting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-xs p-1 text-center pointer-events-none">
          <Loader2 size={18} className="animate-spin text-blue-600 mb-0.5" />
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 leading-tight">Cargando...</span>
        </div>
      )}
      <img
        src={displaySrc || undefined}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onError={handleNativeError}
        className={`${isFixedDimension ? 'w-full h-full object-cover' : className} ${isConverting ? 'opacity-20' : 'opacity-100 transition-opacity duration-200'}`}
        {...props}
      />
    </div>
  );
};

export default UniversalImage;

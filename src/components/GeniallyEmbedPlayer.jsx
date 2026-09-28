// src/components/GeniallyEmbedPlayer.jsx
import React, { useState, useRef } from 'react';
import { Sparkles, Maximize2, Minimize2, Globe, RotateCcw, X, Loader2 } from './Icons.jsx';

export const extractGeniallyUrl = (input) => {
  if (!input) return '';
  const str = String(input).trim();
  const iframeMatch = str.match(/src=["'](https?:\/\/[^"']*genial\.ly[^"']*)["']/i);
  if (iframeMatch) return iframeMatch[1];
  const urlMatch = str.match(/(https?:\/\/[^\s"'<>]*genial\.ly[^\s"'<>]*)/i);
  if (urlMatch) return urlMatch[1];
  return str.startsWith('http') ? str : 'https://' + str;
};

export const isGeniallyUrl = (url) => {
  if (!url) return false;
  return String(url).toLowerCase().includes('genial.ly') || String(url).toLowerCase().includes('genially.com');
};

export const GeniallyEmbedPlayer = ({
  url,
  title = 'Actividad Interactiva Genially',
  isDarkMode = false,
  onRemove = null,
  className = ''
}) => {
  const cleanUrl = extractGeniallyUrl(url);
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 7000);
    return () => clearTimeout(timeout);
  }, [cleanUrl, key]);

  if (!cleanUrl) return null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={'w-full rounded-2xl overflow-hidden border shadow-lg transition-all flex flex-col ' + (
        isDarkMode
          ? 'bg-gray-900/90 border-purple-900/50 shadow-purple-950/20'
          : 'bg-white border-purple-200/80 shadow-purple-100/50'
      ) + ' ' + (isFullscreen ? 'h-screen w-screen rounded-none p-0' : '') + ' ' + className}
    >
      {/* Barra de Título y Controles */}
      <div className={'flex items-center justify-between px-3.5 py-2.5 border-b text-xs select-none ' + (
        isDarkMode ? 'bg-gray-800/95 border-purple-900/40 text-gray-200' : 'bg-purple-50/80 border-purple-100 text-purple-950'
      )}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={13} />
          </div>
          <span className="font-extrabold truncate text-xs">
            {title}
          </span>
          <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            Genially
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setKey(prev => prev + 1);
            }}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title="Recargar actividad"
          >
            <RotateCcw size={14} />
          </button>

          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title="Abrir en pestaña externa"
          >
            <Globe size={14} />
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition-colors ml-1"
              title="Eliminar actividad"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Contenedor Interactivo con Proporción 16:9 */}
      <div className={'relative w-full bg-black/5 dark:bg-black/30 overflow-hidden ' + (isFullscreen ? 'flex-1 h-full' : 'aspect-video sm:min-h-[320px]')}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-black/10 dark:bg-black/40 backdrop-blur-xs">
            <Loader2 className="animate-spin text-purple-600 dark:text-purple-400" size={28} />
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
              Cargando Genially interactivo...
            </span>
          </div>
        )}

        <iframe
          key={key}
          src={cleanUrl}
          title={title}
          className="absolute inset-0 w-full h-full border-none"
          allowFullScreen
          allow="fullscreen; clipboard-write"
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default GeniallyEmbedPlayer;
// src/components/DocumentPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, FileDocIcon, Loader2, ExternalLink } from './Icons.jsx';

export const DocumentPreviewModal = ({
  documentUrl,
  documentTitle = 'Documento PDF',
  onClose,
  isDarkMode = false
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timeout);
  }, [documentUrl]);

  if (!documentUrl || typeof document === 'undefined' || !document.body || typeof documentUrl !== 'string') return null;

  const isLocalOrData = documentUrl.startsWith('blob:') || documentUrl.startsWith('data:');
  const isPdf = isLocalOrData ||
    documentUrl.toLowerCase().includes('.pdf') ||
    (documentTitle || '').toLowerCase().endsWith('.pdf') ||
    documentUrl.startsWith('data:application/pdf');

  // Si es PDF o local/data, se usa el visor nativo del navegador directamente en el iframe/object
  // Si es otro formato de documento (Word, PowerPoint, Excel), se usa el visor de Google Docs
  const viewerUrl = isPdf
    ? (isLocalOrData ? documentUrl : `${documentUrl}#toolbar=1&navpanes=0`)
    : ('https://docs.google.com/viewer?url=' + encodeURIComponent(documentUrl) + '&embedded=true');

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex flex-col w-screen h-screen bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Barra Superior Completa */}
      <div 
        className={'w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 z-20 ' + (
          isDarkMode 
            ? 'bg-gray-900/95 border-gray-800 text-white' 
            : 'bg-white/95 border-gray-200 text-gray-900'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20 shadow-xs">
            <FileDocIcon size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base truncate max-w-[200px] sm:max-w-md md:max-w-xl">
              {documentTitle || 'Documento PDF'}
            </h3>
            <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
              <span>{isPdf ? 'Visor de PDF' : 'Documento adjunto'}</span>
              <span>•</span>
              <span className="hidden sm:inline">Presiona Esc para cerrar</span>
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Abrir en pestaña</span>
          </a>

          <a
            href={documentUrl}
            download={documentTitle || 'documento.pdf'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md transition-all cursor-pointer"
            title="Descargar archivo"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Descargar</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-red-600 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
            title="Cerrar vista previa (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Visor de Contenido a Pantalla Completa */}
      <div 
        className="relative flex-1 w-full h-full bg-gray-100 dark:bg-gray-950 overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/10 dark:bg-black/50 backdrop-blur-xs">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
              Cargando documento...
            </span>
          </div>
        )}

        <object
          data={documentUrl}
          type={isPdf ? 'application/pdf' : undefined}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
        >
          <iframe
            src={viewerUrl}
            title={documentTitle}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </object>
      </div>
    </div>,
    document.body
  );
};

export default DocumentPreviewModal;

// src/components/DocumentPreviewModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Download, 
  FileDocIcon, 
  Loader2, 
  ExternalLink, 
  RotateCcw, 
  ImageIcon, 
  Plus, 
  Minus,
  FileText
} from './Icons.jsx';
import UniversalImage from './UniversalImage.jsx';
import { isImageLikeUrl, isHeicUrl } from '../utils/heicConverter.js';
import { renderPdfToBookPages } from '../utils/flipbookEngine.js';

export const getGoogleDocViewerUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Si ya es un enlace de Google Drive
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // Si ya es un enlace de visor o previsualización
  if (trimmed.includes('docs.google.com/viewer') || trimmed.includes('/preview')) {
    return trimmed;
  }

  // Si es un PDF directo, evitar Google Docs Viewer para que no descargue el archivo "viewer"
  const isDirectPdf = trimmed.toLowerCase().includes('.pdf') || trimmed.toLowerCase().includes('application/pdf');
  if (isDirectPdf) {
    return trimmed;
  }

  // Para enlaces HTTP / HTTPS de otros documentos (Word, Excel, PowerPoint)
  if (/^https?:\/\//i.test(trimmed)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
  }

  // Archivos locales blob: o data:
  return trimmed;
};

export const DocumentPreviewModal = ({
  documentUrl,
  documentTitle = 'Documento PDF',
  onClose,
  isDarkMode = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [pdfPages, setPdfPages] = useState([]);
  const [pdfError, setPdfError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('pages'); // 'pages' | 'native'
  const [isDownloading, setIsDownloading] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!documentUrl || typeof document === 'undefined' || !document.body || typeof documentUrl !== 'string') return null;

  const cleanUrl = (documentUrl || '').toLowerCase();
  const cleanTitle = (documentTitle || '').toLowerCase().trim();
  const isImage = isImageLikeUrl(documentUrl) ||
    isHeicUrl(documentUrl) ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif|svg|avif)$/i.test(cleanTitle) ||
    cleanUrl.startsWith('data:image/');
  const isPdf = cleanUrl.includes('.pdf') ||
    cleanTitle.endsWith('.pdf') ||
    cleanTitle.includes('.pdf') ||
    cleanUrl.startsWith('data:application/pdf');

  // Carga directa de páginas PDF sin depender de Google Docs Viewer
  useEffect(() => {
    if (!isPdf) {
      setIsLoading(true);
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    let isCancelled = false;
    setIsLoading(true);
    setPdfError(false);

    const loadPages = async () => {
      try {
        const result = await renderPdfToBookPages(documentUrl, {
          maxPages: 120,
          quality: 0.90,
          compressionLevel: 'light',
          fallbackTitle: documentTitle
        });
        if (!isCancelled) {
          if (result && Array.isArray(result.pages) && result.pages.length > 0) {
            setPdfPages(result.pages);
            setViewMode('pages');
          } else {
            setViewMode('native');
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('PDF.js render error in DocumentPreviewModal, falling back to native viewer:', err);
        if (!isCancelled) {
          setPdfError(true);
          setViewMode('native');
          setIsLoading(false);
        }
      }
    };

    loadPages();

    return () => {
      isCancelled = true;
    };
  }, [documentUrl, reloadKey, isPdf, documentTitle]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.2, +(prev + 0.2).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.6, +(prev - 0.2).toFixed(1)));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleDownload = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isDownloading) return;

    setIsDownloading(true);
    const suggestedFileName = documentTitle 
      ? (isPdf && !documentTitle.toLowerCase().endsWith('.pdf') ? `${documentTitle}.pdf` : documentTitle)
      : (isImage ? 'imagen.jpg' : (isPdf ? 'documento.pdf' : 'documento'));

    try {
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = suggestedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    } catch {
      // Fallback a enlace directo seguro
      const a = document.createElement('a');
      a.href = documentUrl;
      a.target = '_blank';
      a.download = suggestedFileName;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  const viewerUrl = getGoogleDocViewerUrl(documentUrl);

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex flex-col w-screen h-screen bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Barra Superior */}
      <div 
        className={'w-full flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 z-20 ' + (
          isDarkMode 
            ? 'bg-gray-900/95 border-gray-800 text-white' 
            : 'bg-white/95 border-gray-200 text-gray-900'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
            isImage 
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}>
            {isImage ? <ImageIcon size={20} /> : <FileDocIcon size={20} />}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-extrabold text-xs sm:text-sm md:text-base truncate max-w-[150px] sm:max-w-xs md:max-w-lg">
              {documentTitle || (isImage ? 'Fotografía' : (isPdf ? 'Documento PDF' : 'Documento adjunto'))}
            </h3>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
              <span>{isImage ? 'Imagen' : (isPdf ? `Documento PDF${pdfPages.length > 0 ? ` • ${pdfPages.length} pág.` : ''}` : 'Documento')}</span>
              <span>•</span>
              <span className="hidden sm:inline">Presiona Esc para cerrar</span>
            </span>
          </div>
        </div>

        {/* Acciones & Controles */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Controles de Zoom para PDF */}
          {isPdf && viewMode === 'pages' && pdfPages.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.6}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                title="Restablecer zoom al 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.2}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <Plus size={14} />
              </button>
            </div>
          )}

          {/* Alternador de visor para PDF (Páginas / Navegador) */}
          {isPdf && pdfPages.length > 0 && !pdfError && (
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === 'pages' ? 'native' : 'pages'))}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
              title={viewMode === 'pages' ? 'Cambiar al visor del navegador' : 'Cambiar a vista de páginas'}
            >
              <FileText size={14} />
              <span>{viewMode === 'pages' ? 'Visor navegador' : 'Ver páginas'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((prev) => prev + 1);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
            title="Recargar vista previa"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Recargar</span>
          </button>

          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Pestaña</span>
          </a>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Descargar archivo"
          >
            {isDownloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            <span className="hidden sm:inline">{isDownloading ? 'Descargando...' : 'Descargar'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-white hover:bg-red-600 transition-colors active:scale-95 flex items-center justify-center cursor-pointer ml-1"
            title="Cerrar vista previa (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Visor de Contenido */}
      <div 
        ref={scrollContainerRef}
        className="relative flex-1 w-full h-full bg-gray-100 dark:bg-gray-950 overflow-auto flex items-center justify-center p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          <div className="w-full h-full p-4 sm:p-8 flex items-center justify-center overflow-auto">
            <UniversalImage
              src={documentUrl}
              alt={documentTitle || 'Imagen adjunta'}
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        ) : isPdf ? (
          viewMode === 'pages' && pdfPages.length > 0 ? (
            <div className="w-full h-full overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-6">
              {pdfPages.map((pageImg, idx) => (
                <div 
                  key={idx}
                  className="flex flex-col items-center gap-2 max-w-full transition-transform duration-150"
                  style={{
                    width: `${Math.round(820 * zoom)}px`,
                    maxWidth: zoom <= 1 ? '100%' : 'none'
                  }}
                >
                  <div className="w-full relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-gray-300/80 dark:border-gray-800 bg-white">
                    <img
                      src={pageImg}
                      alt={`Página ${idx + 1}`}
                      className="w-full h-auto block object-contain"
                      loading={idx < 3 ? 'eager' : 'lazy'}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 px-3 py-0.5 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-xs">
                    Página {idx + 1} de {pdfPages.length}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/10 dark:bg-black/50 backdrop-blur-xs pointer-events-none">
                  <Loader2 className="animate-spin text-blue-500" size={36} />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    Cargando documento PDF...
                  </span>
                </div>
              )}
              {/* Visor nativo de PDF en navegador (sin docs.google.com/viewer para evitar el bug de descarga "viewer") */}
              <object
                key={`${documentUrl}-${reloadKey}`}
                data={`${documentUrl}#toolbar=1`}
                type="application/pdf"
                className="w-full h-full border-0 bg-white"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              >
                <iframe
                  src={`${documentUrl}#toolbar=1`}
                  title={documentTitle || 'Documento PDF'}
                  className="w-full h-full border-0 bg-white"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                />
              </object>
            </div>
          )
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/10 dark:bg-black/50 backdrop-blur-xs pointer-events-none">
                <Loader2 className="animate-spin text-blue-500" size={36} />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  Cargando documento...
                </span>
              </div>
            )}

            <iframe
              key={`${viewerUrl}-${reloadKey}`}
              src={viewerUrl}
              title={documentTitle || 'Documento'}
              className="w-full h-full border-0 bg-white"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DocumentPreviewModal;

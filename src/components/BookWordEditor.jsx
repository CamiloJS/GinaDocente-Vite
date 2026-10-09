import React, { useState, useRef } from 'react';
import {
    Plus,
    Trash2,
    ImageIcon,
    FileText,
    ChevronLeft,
    ChevronRight,
    X,
    UploadCloud,
    List,
    Lightbulb,
    Eye
} from './Icons';
import {
    getBookTheme,
    updateBookOutlinePage,
    insertBookOutlinePage,
    removeBookOutlinePage,
    compressBookImageDataUrl,
    extractSvgExternalImageOverlay
} from '../utils/flipbookEngine';

export default function BookWordEditor({
    outline = [],
    pages = [],
    themeId = 'royal-indigo',
    onChangeOutline,
    onOpenPagePreview,
    uploadImageFn,
    isDemoMode = false
}) {
    const [activePageIdx, setActivePageIdx] = useState(0);
    const [viewAllPages, setViewAllPages] = useState(false);
    const [urlInputPageIdx, setUrlInputPageIdx] = useState(null);
    const [tempImageUrl, setTempImageUrl] = useState('');
    const [uploadingPageIdx, setUploadingPageIdx] = useState(null);
    const fileInputRef = useRef(null);
    const pendingUploadPageRef = useRef(0);

    if (!Array.isArray(outline) || outline.length === 0) {
        return null;
    }

    const theme = getBookTheme(themeId);
    const safeIdx = Math.max(0, Math.min(activePageIdx, outline.length - 1));

    const handleFieldChange = (pageIdx, patch) => {
        const nextOutline = updateBookOutlinePage(outline, pageIdx, patch);
        onChangeOutline?.(nextOutline);
    };

    const handleParagraphChange = (pageIdx, pIdx, value) => {
        const page = outline[pageIdx] || {};
        const currentBody = Array.isArray(page.body) && page.body.length > 0 ? [...page.body] : [''];
        currentBody[pIdx] = value;
        handleFieldChange(pageIdx, { body: currentBody });
    };

    const handleAddParagraph = (pageIdx) => {
        const page = outline[pageIdx] || {};
        const currentBody = Array.isArray(page.body) ? [...page.body] : [];
        currentBody.push('Nuevo párrafo...');
        handleFieldChange(pageIdx, { body: currentBody });
    };

    const handleRemoveParagraph = (pageIdx, pIdx) => {
        const page = outline[pageIdx] || {};
        const currentBody = Array.isArray(page.body) ? [...page.body] : [];
        if (currentBody.length <= 1) {
            handleFieldChange(pageIdx, { body: [''] });
            return;
        }
        currentBody.splice(pIdx, 1);
        handleFieldChange(pageIdx, { body: currentBody });
    };

    const handleBulletChange = (pageIdx, bIdx, value) => {
        const page = outline[pageIdx] || {};
        const currentBullets = Array.isArray(page.bullets) ? [...page.bullets] : [];
        currentBullets[bIdx] = value;
        handleFieldChange(pageIdx, { bullets: currentBullets });
    };

    const handleAddBullet = (pageIdx) => {
        const page = outline[pageIdx] || {};
        const currentBullets = Array.isArray(page.bullets) ? [...page.bullets] : [];
        currentBullets.push('Punto clave...');
        handleFieldChange(pageIdx, { bullets: currentBullets });
    };

    const handleRemoveBullet = (pageIdx, bIdx) => {
        const page = outline[pageIdx] || {};
        const currentBullets = Array.isArray(page.bullets) ? [...page.bullets] : [];
        currentBullets.splice(bIdx, 1);
        handleFieldChange(pageIdx, { bullets: currentBullets });
    };

    const handleInsertNewPage = (afterIdx) => {
        const nextOutline = insertBookOutlinePage(outline, afterIdx);
        onChangeOutline?.(nextOutline);
        const insertedIdx = Math.min(afterIdx + 1, nextOutline.length - 2);
        setActivePageIdx(Math.max(1, insertedIdx));
    };

    const handleDeletePage = (pageIdx) => {
        if (outline.length <= 3) return;
        const page = outline[pageIdx];
        if (page?.isCover || page?.isBack || pageIdx === 0 || pageIdx === outline.length - 1) return;
        const nextOutline = removeBookOutlinePage(outline, pageIdx);
        onChangeOutline?.(nextOutline);
        setActivePageIdx((prev) => Math.max(0, Math.min(prev, nextOutline.length - 1)));
    };

    const triggerImageUpload = (pageIdx) => {
        pendingUploadPageRef.current = pageIdx;
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleImageFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const targetIdx = pendingUploadPageRef.current;
        setUploadingPageIdx(targetIdx);
        try {
            const compressedDataUrl = await compressBookImageDataUrl(file, {
                maxDimension: 1100,
                quality: 0.82
            });
            let finalImageUrl = compressedDataUrl;
            // Important: SVG <image> inside a data:image/svg+xml URI renders embedded data:image/* URIs reliably
            // across all browsers without CORS tainting, so we keep compressedDataUrl for the outline page rendering,
            // or fall back to uploaded URL if data URI is unavailable.
            if (!finalImageUrl && !isDemoMode && typeof uploadImageFn === 'function') {
                finalImageUrl = await uploadImageFn(file, 'books');
            }
            if (finalImageUrl) {
                handleFieldChange(targetIdx, {
                    imageUrl: finalImageUrl,
                    imageCaption: outline[targetIdx]?.imageCaption || ''
                });
            }
        } catch (err) {
            console.warn('No se pudo cargar la imagen en la página:', err);
        } finally {
            setUploadingPageIdx(null);
        }
    };

    const handleApplyImageUrl = async (pageIdx) => {
        const clean = tempImageUrl.trim();
        if (!clean) return;
        setTempImageUrl('');
        setUrlInputPageIdx(null);
        setUploadingPageIdx(pageIdx);
        try {
            const optimized = await compressBookImageDataUrl(clean, {
                maxDimension: 1100,
                quality: 0.82
            });
            handleFieldChange(pageIdx, {
                imageUrl: optimized || clean,
                imageCaption: outline[pageIdx]?.imageCaption || ''
            });
        } catch {
            handleFieldChange(pageIdx, {
                imageUrl: clean,
                imageCaption: outline[pageIdx]?.imageCaption || ''
            });
        } finally {
            setUploadingPageIdx(null);
        }
    };

    const renderPageSheet = (page, pageIdx) => {
        const isCover = Boolean(page?.isCover || pageIdx === 0);
        const isBack = Boolean(page?.isBack || (pageIdx === outline.length - 1 && outline.length > 1));
        const canDelete = !isCover && !isBack && outline.length > 3;
        const bodyList = Array.isArray(page?.body) && page.body.length > 0 ? page.body : [''];
        const bulletList = Array.isArray(page?.bullets) ? page.bullets : [];
        const renderedPageThumb = pages[pageIdx] || '';
        const extImgOverlay = extractSvgExternalImageOverlay(renderedPageThumb);

        return (
            <div
                key={`word-sheet-${pageIdx}`}
                data-word-page={pageIdx + 1}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-md overflow-hidden transition-all"
            >
                {/* Sheet Top Ribbon (Word header bar) */}
                <div
                    className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
                    style={{
                        background: `linear-gradient(90deg, ${theme.coverBg}14 0%, ${theme.accentColor}10 100%)`
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-2xs"
                            style={{ backgroundColor: theme.coverBg }}
                        >
                            {isCover
                                ? 'Portada (Pág. 1)'
                                : isBack
                                ? `Contraportada (Pág. ${pageIdx + 1})`
                                : `Página ${pageIdx + 1}`}
                        </span>
                        <input
                            type="text"
                            value={page?.chapter || ''}
                            onChange={(e) => handleFieldChange(pageIdx, { chapter: e.target.value })}
                            placeholder={isCover ? 'Etiqueta de portada...' : 'Capítulo / Sección...'}
                            className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-1.5">
                        {renderedPageThumb && typeof onOpenPagePreview === 'function' && (
                            <button
                                type="button"
                                onClick={() => onOpenPagePreview(pageIdx)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Ver página en el visor"
                            >
                                <Eye size={12} />
                                <span>Ver hoja</span>
                            </button>
                        )}
                        {!isBack && (
                            <button
                                type="button"
                                onClick={() => handleInsertNewPage(pageIdx)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Insertar nueva página después de esta"
                            >
                                <Plus size={12} />
                                <span>Añadir pág.</span>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => handleDeletePage(pageIdx)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                title="Eliminar esta página"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Word Document Sheet Body */}
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Editable Document Column */}
                    <div className="md:col-span-8 lg:col-span-9 space-y-3.5">
                        {/* Page Title (H1 style) */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                Título de la página
                            </label>
                            <input
                                type="text"
                                value={page?.title || ''}
                                onChange={(e) => handleFieldChange(pageIdx, { title: e.target.value })}
                                placeholder="Escribe el título de esta página..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm sm:text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Page Subtitle (H2 style) */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                Subtítulo o resumen
                            </label>
                            <input
                                type="text"
                                value={page?.subtitle || ''}
                                onChange={(e) => handleFieldChange(pageIdx, { subtitle: e.target.value })}
                                placeholder="Subtítulo o idea principal..."
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Paragraphs (for all pages, especially interior and back) */}
                        {!isCover && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Contenido / Párrafos
                                    </label>
                                    {!isBack && (
                                        <button
                                            type="button"
                                            onClick={() => handleAddParagraph(pageIdx)}
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={12} />
                                            <span>Añadir párrafo</span>
                                        </button>
                                    )}
                                </div>

                                {bodyList.map((paragraph, pIdx) => (
                                    <div key={`p-${pageIdx}-${pIdx}`} className="flex items-start gap-1.5">
                                        <textarea
                                            rows={isBack ? 2 : 3}
                                            value={paragraph}
                                            onChange={(e) => handleParagraphChange(pageIdx, pIdx, e.target.value)}
                                            placeholder={`Párrafo ${pIdx + 1}...`}
                                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        {bodyList.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveParagraph(pageIdx, pIdx)}
                                                className="p-1.5 mt-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                title="Quitar párrafo"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Inline Page Image Section (Cover or Interior Pages) */}
                        {!isBack && (
                            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                                        <ImageIcon size={14} className="text-indigo-500" />
                                        <span>{isCover ? 'Imagen en la portada' : 'Imagen en esta página'}</span>
                                    </span>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => triggerImageUpload(pageIdx)}
                                            disabled={uploadingPageIdx === pageIdx}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <UploadCloud size={12} />
                                            <span>
                                                {uploadingPageIdx === pageIdx
                                                    ? 'Procesando...'
                                                    : page?.imageUrl
                                                    ? 'Cambiar imagen'
                                                    : 'Subir imagen'}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (urlInputPageIdx === pageIdx) {
                                                    setUrlInputPageIdx(null);
                                                } else {
                                                    setUrlInputPageIdx(pageIdx);
                                                    setTempImageUrl(
                                                        page?.imageUrl && !String(page.imageUrl).startsWith('data:')
                                                            ? page.imageUrl
                                                            : ''
                                                    );
                                                }
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px] font-bold transition-colors cursor-pointer"
                                        >
                                            URL
                                        </button>

                                        {page?.imageUrl && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleFieldChange(pageIdx, { imageUrl: '', imageCaption: '' })
                                                }
                                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={12} />
                                                <span>Quitar imagen</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {urlInputPageIdx === pageIdx && (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="url"
                                            value={tempImageUrl}
                                            onChange={(e) => setTempImageUrl(e.target.value)}
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleApplyImageUrl(pageIdx)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                                        >
                                            Insertar
                                        </button>
                                    </div>
                                )}

                                {page?.imageUrl && (
                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                                        <img
                                            src={page.imageUrl}
                                            alt={page.imageCaption || 'Imagen de página'}
                                            className="w-28 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-white shadow-2xs shrink-0"
                                        />
                                        {!isCover && (
                                            <input
                                                type="text"
                                                value={page?.imageCaption || ''}
                                                onChange={(e) =>
                                                    handleFieldChange(pageIdx, { imageCaption: e.target.value })
                                                }
                                                placeholder="Pie de imagen o descripción breve (opcional)..."
                                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Key Bullet Points & Callout Note (Interior pages) */}
                        {!isCover && !isBack && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {/* Bullets */}
                                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                                            <List size={12} />
                                            <span>Viñetas / Puntos clave</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleAddBullet(pageIdx)}
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <Plus size={11} />
                                            <span>Añadir</span>
                                        </button>
                                    </div>

                                    {bulletList.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">
                                            Sin viñetas en esta página.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {bulletList.map((bText, bIdx) => (
                                                <div key={`b-${pageIdx}-${bIdx}`} className="flex items-center gap-1">
                                                    <span className="text-indigo-500 font-bold text-xs">•</span>
                                                    <input
                                                        type="text"
                                                        value={bText}
                                                        onChange={(e) =>
                                                            handleBulletChange(pageIdx, bIdx, e.target.value)
                                                        }
                                                        className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBullet(pageIdx, bIdx)}
                                                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                                        title="Eliminar viñeta"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Callout Note */}
                                <div className="p-3 rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1">
                                        <Lightbulb size={12} />
                                        <span>Recuadro / Nota destacada</span>
                                    </span>
                                    <input
                                        type="text"
                                        value={page?.calloutTitle || ''}
                                        onChange={(e) =>
                                            handleFieldChange(pageIdx, { calloutTitle: e.target.value })
                                        }
                                        placeholder="Título de la nota (ej. Key Concept, Tip)..."
                                        className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <textarea
                                        rows={2}
                                        value={page?.calloutText || ''}
                                        onChange={(e) =>
                                            handleFieldChange(pageIdx, { calloutText: e.target.value })
                                        }
                                        placeholder="Texto de la nota destacada al pie de página..."
                                        className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Rendered Page Preview Column */}
                    <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                            Vista previa de hoja
                        </span>
                        {renderedPageThumb ? (
                            <div
                                onClick={() => onOpenPagePreview?.(pageIdx)}
                                className="w-36 sm:w-44 aspect-[800/1130] rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white cursor-pointer group relative"
                                title="Clic para ampliar esta página"
                            >
                                <img
                                    src={renderedPageThumb}
                                    alt={`Hoja ${pageIdx + 1}`}
                                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                                />
                                {extImgOverlay && (
                                    <img
                                        src={extImgOverlay.href}
                                        alt=""
                                        draggable={false}
                                        className="pointer-events-none select-none"
                                        style={{
                                            position: 'absolute',
                                            left: `${extImgOverlay.leftPct}%`,
                                            top: `${extImgOverlay.topPct}%`,
                                            width: `${extImgOverlay.widthPct}%`,
                                            height: `${extImgOverlay.heightPct}%`,
                                            objectFit: extImgOverlay.objectFit || 'contain',
                                            borderRadius: '4px'
                                        }}
                                    />
                                )}
                                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">
                                    Pág. {pageIdx + 1}
                                </span>
                            </div>
                        ) : (
                            <div className="w-36 sm:w-44 aspect-[800/1130] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[11px] text-slate-400">
                                Sin vista previa
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            data-book-word-editor="true"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 p-3.5 sm:p-4 space-y-3.5"
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
            />

            {/* Word Document Editor Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <FileText size={15} />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            Editor de documento ({outline.length} páginas)
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Edita textos, títulos, viñetas e imágenes de cada página antes de publicar
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleInsertNewPage(safeIdx === outline.length - 1 ? outline.length - 2 : safeIdx)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>Nueva página</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewAllPages((v) => !v)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        {viewAllPages ? 'Ver 1 página' : 'Ver todas las páginas'}
                    </button>
                </div>
            </div>

            {/* Page Selector Strip (when in single-page Word view) */}
            {!viewAllPages && (
                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setActivePageIdx((p) => Math.max(0, p - 1))}
                        disabled={safeIdx <= 0}
                        className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                        title="Página anterior"
                    >
                        <ChevronLeft size={15} />
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                        {outline.map((pg, idx) => {
                            const isActive = idx === safeIdx;
                            const label =
                                idx === 0
                                    ? 'Portada'
                                    : idx === outline.length - 1 && outline.length > 1
                                    ? 'Contraportada'
                                    : `Pág. ${idx + 1}`;
                            return (
                                <button
                                    key={`tab-${idx}`}
                                    type="button"
                                    onClick={() => setActivePageIdx(idx)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => setActivePageIdx((p) => Math.min(outline.length - 1, p + 1))}
                        disabled={safeIdx >= outline.length - 1}
                        className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                        title="Página siguiente"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            )}

            {/* Word Document Sheet(s) */}
            {viewAllPages ? (
                <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
                    {outline.map((pg, idx) => renderPageSheet(pg, idx))}
                </div>
            ) : (
                renderPageSheet(outline[safeIdx], safeIdx)
            )}
        </div>
    );
}

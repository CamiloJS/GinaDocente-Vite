// src/components/ReviewsModule.jsx
// Módulo: Diapositivas con IA, Selector de Idioma, Tipografía Potenciada, Editor In-App Robusto y Generador PPTX

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import pptxgen from 'pptxgenjs'
import {
  Wand2, Sparkles, Loader2, Download, Trash2, X, Plus, Maximize2,
  Minimize2, ChevronLeft, ChevronRight, BookOpen, Edit3, Copy,
  ArrowUp, ArrowDown, CheckCheck, Globe, CheckCircle2, ChevronDown
} from './Icons.jsx'
import { TEACHER_NAME } from '../utils/helpers.js'
import EmptyState from './EmptyState.jsx'
import { doc, addDoc, collection, deleteDoc, updateDoc } from '../firebase/config.js'

// =========================================================================
// 1. GENERADOR NATIVO DE ARCHIVOS MICROSOFT POWERPOINT (.PPTX)
// =========================================================================
export const exportReviewToPresentation = async (review) => {
  if (!review || !review.slides || review.slides.length === 0) return;

  const displayTitle = review.slides?.[0]?.title || review.topic || 'Presentación de Diapositivas';

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = TEACHER_NAME;
  pptx.subject = displayTitle;
  pptx.title = displayTitle;

  const PRIMARY_COLOR = 'AD3333';
  const DARK_BG = '0F172A';
  const CARD_BG = '1E293B';
  const TEXT_WHITE = 'FFFFFF';
  const TEXT_MUTED = '94A3B8';
  const ACCENT_GOLD = 'F59E0B';

  review.slides.forEach((s, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };

    const isFirst = idx === 0 || s.layout === 'title';

    if (isFirst) {
      // Portada limpia con tipografía destacada
      slide.addText(s.title || displayTitle, {
        x: 0.8, y: 1.6, w: 11.5, h: 2.4,
        fontSize: 38, fontFace: 'Arial', color: TEXT_WHITE, bold: true, align: 'left',
        valign: 'top', breakLine: true
      });

      slide.addText(s.subtitle || s.description || 'Lección y Repaso Interactivo', {
        x: 0.8, y: 4.2, w: 11.5, h: 1.4,
        fontSize: 20, fontFace: 'Arial', color: TEXT_MUTED, align: 'left'
      });

    } else if (s.layout === 'quiz' || s.type === 'quiz') {
      // Diapositiva de Quiz
      slide.addText(`SLIDE ${idx + 1} • QUIZ`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: ACCENT_GOLD, bold: true
      });

      slide.addText(s.title || 'Pregunta de Repaso', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.7,
        fontSize: 24, fontFace: 'Arial', color: TEXT_WHITE, bold: true
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.8, w: 11.5, h: 1.4,
        fill: { color: CARD_BG },
        line: { color: '334155', width: 1 },
        rectRadius: 0.15
      });
      slide.addText(s.question || s.content || '', {
        x: 1.1, y: 2.0, w: 10.9, h: 1.0,
        fontSize: 17, fontFace: 'Arial', color: 'FEF08A', bold: true
      });

      const options = s.options || [
        { text: s.answer || 'Respuesta correcta', isCorrect: true, explanation: '' }
      ];

      options.forEach((opt, oIdx) => {
        const col = oIdx % 2;
        const row = Math.floor(oIdx / 2);
        const posX = 0.8 + (col * 5.9);
        const posY = 3.4 + (row * 1.3);

        slide.addShape(pptx.ShapeType.roundRect, {
          x: posX, y: posY, w: 5.6, h: 1.1,
          fill: { color: opt.isCorrect ? '064E3B' : CARD_BG },
          line: { color: opt.isCorrect ? '10B981' : '334155', width: 1 },
          rectRadius: 0.15
        });

        slide.addText(`${String.fromCharCode(65 + oIdx)})  ${opt.text}`, {
          x: posX + 0.2, y: posY + 0.15, w: 5.2, h: 0.8,
          fontSize: 14, fontFace: 'Arial', color: opt.isCorrect ? 'A7F3D0' : TEXT_WHITE,
          bold: opt.isCorrect, valign: 'middle'
        });
      });

    } else if (s.layout === 'bullets' || s.bullets) {
      // Diapositiva de Puntos Clave
      slide.addText(`SLIDE ${idx + 1}`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Conceptos Esenciales', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace: 'Arial', color: TEXT_WHITE, bold: true
      });

      const items = s.bullets || (s.content ? s.content.split('\n').filter(Boolean).map(t => ({ title: t, text: '' })) : []);

      items.forEach((b, bIdx) => {
        const posY = 1.9 + (bIdx * 1.2);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: posY, w: 11.5, h: 1.0,
          fill: { color: CARD_BG },
          line: { color: '334155', width: 1 },
          rectRadius: 0.12
        });

        slide.addText(`${bIdx + 1}`, {
          x: 1.0, y: posY + 0.2, w: 0.5, h: 0.5,
          fontSize: 15, fontFace: 'Arial', color: PRIMARY_COLOR, bold: true, align: 'center'
        });

        const bTitle = typeof b === 'object' ? b.title : b;
        const bText = (typeof b === 'object' && b.text) ? ` — ${b.text}` : '';
        const bEx = (typeof b === 'object' && b.example) ? ` [Ej: ${b.example}]` : '';

        slide.addText(`${bTitle}${bText}${bEx}`, {
          x: 1.6, y: posY + 0.15, w: 10.4, h: 0.7,
          fontSize: 14, fontFace: 'Arial', color: TEXT_WHITE, bold: false, valign: 'middle'
        });
      });

    } else {
      // Diapositiva de Conceptos (Cards)
      slide.addText(`SLIDE ${idx + 1}`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Explicación del Tema', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace: 'Arial', color: TEXT_WHITE, bold: true
      });

      const cards = s.cards || (s.content ? [{ title: s.title, text: s.content }] : []);
      const count = Math.min(cards.length, 3);
      const cardW = count === 1 ? 11.5 : (count === 2 ? 5.6 : 3.65);

      cards.slice(0, 3).forEach((c, cIdx) => {
        const posX = 0.8 + (cIdx * (cardW + 0.25));
        slide.addShape(pptx.ShapeType.roundRect, {
          x: posX, y: 2.0, w: cardW, h: 4.4,
          fill: { color: CARD_BG },
          line: { color: '334155', width: 1 },
          rectRadius: 0.15
        });

        slide.addText(c.title || `Concepto ${cIdx + 1}`, {
          x: posX + 0.3, y: 2.3, w: cardW - 0.6, h: 0.6,
          fontSize: 17, fontFace: 'Arial', color: TEXT_WHITE, bold: true
        });

        slide.addText(c.text || '', {
          x: posX + 0.3, y: 3.0, w: cardW - 0.6, h: 2.0,
          fontSize: 13, fontFace: 'Arial', color: TEXT_MUTED, valign: 'top', breakLine: true
        });

        if (c.example) {
          slide.addText(`Ejemplo: ${c.example}`, {
            x: posX + 0.3, y: 5.1, w: cardW - 0.6, h: 0.9,
            fontSize: 12, fontFace: 'Arial', color: 'FCA5A5', italic: true, valign: 'top'
          });
        }
      });
    }
  });

  const fileName = `${displayTitle.replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_').toLowerCase()}.pptx`;
  await pptx.writeFile({ fileName });
};

// =========================================================================
// 2. VISOR INTERACTIVO EN PORTAL CON PANTALLA COMPLETA REAL Y TEMAS ADAPTATIVOS
// =========================================================================
export const SlidePresenterViewer = ({ presentation, onClose, onEdit, role, themeMode = 'light' }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizSelection, setQuizSelection] = useState({});
  const viewerRef = useRef(null);

  const slides = presentation?.slides || [];
  const total = slides.length;
  const currentSlide = slides[currentIdx] || {};
  const displayTitle = presentation.slides?.[0]?.title || presentation.topic;

  const isLight = themeMode === 'light';
  const isDim = themeMode === 'dim';

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentIdx(prev => Math.min(prev + 1, total - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleNativeFullscreen();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.().catch(() => {});
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total, isFullscreen, onClose]);

  if (!presentation || total === 0) return null;

  // Estilos según tema activo
  const viewerBg = isLight ? 'bg-slate-100 text-slate-900' : (isDim ? 'bg-[#0f172a] text-slate-100' : 'bg-black text-white');
  const headerBtnBg = isLight ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs' : (isDim ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800');
  
  const canvasBg = isLight 
    ? 'bg-white border-slate-200 shadow-2xl text-slate-900' 
    : (isDim ? 'bg-[#1e293b] border-slate-700 shadow-2xl text-slate-100' : 'bg-neutral-950 border-neutral-800 shadow-2xl text-white');

  const cardItemBg = isLight 
    ? 'bg-slate-50 border-slate-200/80 text-slate-800 shadow-2xs hover:border-slate-300' 
    : (isDim ? 'bg-[#0f172a]/80 border-slate-700/80 text-slate-100 shadow-2xs hover:border-slate-600' : 'bg-neutral-900/90 border-neutral-800 text-neutral-100 shadow-2xs hover:border-neutral-700');

  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isLight ? 'text-slate-600' : 'text-slate-300';

  return createPortal(
    <div 
      ref={viewerRef}
      className={`fixed inset-0 z-[999999] flex flex-col justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200 overflow-hidden ${viewerBg}`}
    >
      {/* Header Superior */}
      <header className="flex items-center justify-between gap-3 w-full max-w-6xl mx-auto pb-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            type="button" 
            onClick={onClose} 
            className={`p-2 rounded-xl transition-colors ${headerBtnBg}`}
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
          <h3 className={`text-sm sm:text-base font-extrabold truncate max-w-md ${textPrimary}`}>
            {displayTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {role === 'teacher' && onEdit && (
            <button
              type="button"
              onClick={() => {
                if (isFullscreen) document.exitFullscreen?.().catch(() => {});
                onEdit(presentation);
              }}
              className={`p-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${headerBtnBg} hover:text-[#AD3333]`}
              title="Editar Diapositivas"
            >
              <Edit3 size={15} className="text-[#AD3333]" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className={`p-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${headerBtnBg}`}
            title="Pantalla Completa (F)"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportReviewToPresentation(presentation)}
            className="p-2 px-3.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Descargar archivo PowerPoint .pptx"
          >
            <Download size={15} />
            <span>Descargar</span>
          </button>
        </div>
      </header>

      {/* Lienzo Principal 16:9 Adaptativo con Tipografía Mejorada */}
      <main className="flex-1 flex items-center justify-center min-h-0 py-2 w-full">
        <div className={`w-full max-w-6xl aspect-video max-h-[82vh] rounded-2xl p-6 sm:p-12 flex flex-col justify-between border relative overflow-hidden ${canvasBg}`}>
          
          {/* Barra Superior del Lienzo: Contador y Layout */}
          <div className="flex justify-between items-center text-xs font-bold shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-[#AD3333] dark:text-red-400 uppercase tracking-wider text-[10px] font-black">
              {currentSlide.layout === 'title' ? 'Portada' : currentSlide.layout === 'quiz' ? 'Quiz Interactivo' : currentSlide.layout === 'bullets' ? 'Puntos Clave' : 'Conceptos'}
            </span>
            <span className={`font-mono text-xs font-black ${textSecondary}`}>{currentIdx + 1} / {total}</span>
          </div>

          {/* Contenido Dinámico con Tipografía Grande y Legible */}
          <div className="my-auto overflow-y-auto py-2 w-full">
            {currentIdx === 0 || currentSlide.layout === 'title' ? (
              /* Portada */
              <div className="text-center space-y-6 max-w-4xl mx-auto py-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[#AD3333] dark:text-red-300 text-xs font-extrabold uppercase tracking-widest">
                  <Sparkles size={14} />
                  <span>Lección & Presentación</span>
                </div>
                <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight ${textPrimary}`}>
                  {currentSlide.title || displayTitle}
                </h1>
                <p className={`text-lg sm:text-2xl font-medium leading-relaxed max-w-2xl mx-auto ${textSecondary}`}>
                  {currentSlide.subtitle || currentSlide.description || 'Contenido académico estructurado'}
                </p>
              </div>
            ) : currentSlide.layout === 'quiz' || currentSlide.type === 'quiz' ? (
              /* Quiz */
              <div className="space-y-6 max-w-4xl mx-auto w-full py-2">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Pregunta de Comprobación</span>
                  </span>
                  <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight ${textPrimary}`}>
                    {currentSlide.question || currentSlide.title || 'Pregunta de repaso'}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {(currentSlide.options || [{ text: currentSlide.answer || "Respuesta correcta", isCorrect: true, explanation: "¡Correcto!" }]).map((opt, oIdx) => {
                    const sel = quizSelection[currentIdx];
                    let optStyle = cardItemBg;
                    if (sel !== undefined) {
                      if (opt.isCorrect) optStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs";
                      else if (sel === oIdx) optStyle = "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 line-through";
                      else optStyle = isLight ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60" : "bg-neutral-900 border-neutral-800 text-neutral-600 opacity-60";
                    }
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setQuizSelection(prev => ({ ...prev, [currentIdx]: oIdx }))}
                        className={`p-4 sm:p-5 rounded-2xl border text-left text-sm sm:text-base font-semibold flex items-center gap-3.5 transition-all duration-200 ${optStyle}`}
                      >
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-black shrink-0 ${
                          sel !== undefined && opt.isCorrect ? 'bg-emerald-500 text-white' : isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explicación si se seleccionó */}
                {quizSelection[currentIdx] !== undefined && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium animate-in fade-in">
                    💡 <strong>Explicación:</strong> {currentSlide.options?.[quizSelection[currentIdx]]?.explanation || '¡Revisa los conceptos anteriores para profundizar!'}
                  </div>
                )}
              </div>
            ) : currentSlide.layout === 'bullets' ? (
              /* Puntos Clave con Tipografía y Jerarquía Superior */
              <div className="space-y-5 max-w-5xl mx-auto w-full py-2">
                <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${textPrimary}`}>
                  {currentSlide.title || 'Puntos Clave'}
                </h2>
                <div className="space-y-3">
                  {(currentSlide.bullets || []).map((b, bIdx) => (
                    <div key={bIdx} className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border ${cardItemBg}`}>
                      <span className="w-8 h-8 rounded-xl bg-[#AD3333] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {bIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <strong className={`block text-base sm:text-lg font-bold ${textPrimary}`}>
                          {typeof b === 'object' ? b.title : b}
                        </strong>
                        {b.text && <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>{b.text}</p>}
                        {b.example && (
                          <div className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 font-medium">
                            📌 <strong>Ejemplo:</strong> {b.example}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Conceptos en Tarjetas con Tipografía y Contraste Mejorado */
              <div className="space-y-5 max-w-5xl mx-auto w-full py-2">
                <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${textPrimary}`}>
                  {currentSlide.title || 'Conceptos Principales'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(currentSlide.cards || (currentSlide.content ? [{ title: currentSlide.title, text: currentSlide.content }] : [])).map((c, cIdx) => (
                    <div key={cIdx} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${cardItemBg}`}>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#AD3333] dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                          Concepto {cIdx + 1}
                        </span>
                        <h4 className={`text-base sm:text-lg font-bold leading-tight ${textPrimary}`}>
                          {c.title || 'Concepto'}
                        </h4>
                        <p className={`text-xs sm:text-sm leading-relaxed ${textSecondary}`}>
                          {c.text}
                        </p>
                      </div>
                      {c.example && (
                        <div className="mt-4 text-xs text-red-600 dark:text-red-300 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 font-medium">
                          💡 <strong>Ej:</strong> {c.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div />
        </div>
      </main>

      {/* Controles Inferiores */}
      <footer className="flex items-center justify-between w-full max-w-sm mx-auto pt-2 shrink-0">
        <button
          type="button"
          onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))}
          disabled={currentIdx === 0}
          className={`p-2.5 px-5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors ${headerBtnBg}`}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <span className={`text-xs font-mono font-black ${textSecondary}`}>{currentIdx + 1} / {total}</span>

        <button
          type="button"
          onClick={() => setCurrentIdx(prev => Math.min(prev + 1, total - 1))}
          disabled={currentIdx === total - 1}
          className="p-2.5 px-5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </footer>
    </div>,
    document.body
  );
};

// =========================================================================
// 3. EDITOR DE DIAPOSITIVAS ROBUSTO IN-APP (Para la Profesora)
// =========================================================================
export const SlideEditorModal = ({ presentation, onClose, onSave, onProject, isDarkMode }) => {
  const [slides, setSlides] = useState(JSON.parse(JSON.stringify(presentation.slides || [])));
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const activeSlide = slides[activeSlideIdx] || slides[0] || {};

  const handleSlideChange = (field, value) => {
    setSlides(prev => {
      const copy = [...prev];
      copy[activeSlideIdx] = { ...copy[activeSlideIdx], [field]: value };
      return copy;
    });
  };

  const handleAddSlide = (layout = 'cards') => {
    const newSlide = {
      id: Date.now(),
      layout,
      title: layout === 'title' ? 'Nueva Portada' : layout === 'quiz' ? 'Pregunta de Repaso' : layout === 'bullets' ? 'Puntos Clave' : 'Nuevos Conceptos',
      subtitle: layout === 'title' ? 'Objetivos y resumen de la lección' : '',
      cards: layout === 'cards' ? [{ title: 'Concepto 1', text: 'Explicación del concepto...', example: 'Ejemplo práctico' }] : undefined,
      bullets: layout === 'bullets' ? [{ title: 'Punto importante', text: 'Detalle pedagógico...', example: 'Ejemplo' }] : undefined,
      question: layout === 'quiz' ? '¿Cuál es la opción correcta?' : undefined,
      options: layout === 'quiz' ? [
        { text: 'Opción A', isCorrect: false, explanation: 'Incorrecta' },
        { text: 'Opción B (Correcta)', isCorrect: true, explanation: '¡Muy bien!' }
      ] : undefined
    };
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideIdx(slides.length);
  };

  const handleDeleteSlide = (idx) => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setActiveSlideIdx(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, prev - 1);
      return Math.max(0, Math.min(prev, slides.length - 2));
    });
  };

  const handleDuplicateSlide = (idx) => {
    const clone = JSON.parse(JSON.stringify(slides[idx]));
    clone.id = Date.now();
    clone.title = `${clone.title} (Copia)`;
    setSlides(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
    setActiveSlideIdx(idx + 1);
  };

  const handleMoveSlide = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    setSlides(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setActiveSlideIdx(targetIdx);
  };

  // Guardar en Firestore
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...presentation,
        slides,
        slideCount: slides.length,
        topic: slides[0]?.title || presentation.topic
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const modalBg = isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-800' : 'bg-white text-gray-900 border-gray-200';
  const panelBg = isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200';
  const inputBg = isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-red-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400';

  return createPortal(
    <div className="fixed inset-0 z-[999998] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-6xl h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${modalBg}`}>
        
        {/* Barra Superior del Editor */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-[#AD3333] dark:text-red-400 flex items-center justify-center font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold truncate max-w-md">
                Editor de Diapositivas
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Modifica textos, reorganiza puntos clave o añade nuevas diapositivas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onProject({ ...presentation, slides })}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">Proyectar</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              <span>Guardar Cambios</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Cuerpo del Editor: Panel Izquierdo (Miniaturas) + Panel Derecho (Formulario de Edición) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Panel Lateral: Lista de Diapositivas */}
          <div className={`w-full md:w-72 border-r border-gray-200 dark:border-gray-800 flex flex-col justify-between p-3 shrink-0 ${panelBg}`}>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Diapositivas ({slides.length})
                </span>
              </div>

              {slides.map((s, idx) => (
                <div
                  key={s.id || idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    activeSlideIdx === idx 
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-[#AD3333] dark:text-red-300 font-bold shadow-xs' 
                      : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{s.title || `Diapositiva ${idx + 1}`}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{s.layout || 'conceptos'}</p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20"
                      title="Mover arriba"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(idx, 1)}
                      disabled={idx === slides.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20"
                      title="Mover abajo"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateSlide(idx)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                      title="Duplicar"
                    >
                      <Copy size={12} />
                    </button>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(idx)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Añadir Diapositiva */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddSlide('cards')}
                  className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Tarjetas
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSlide('bullets')}
                  className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Puntos
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSlide('quiz')}
                  className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Quiz
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSlide('title')}
                  className="p-2 rounded-xl bg-red-500/10 text-[#AD3333] dark:text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Portada
                </button>
              </div>
            </div>
          </div>

          {/* Panel Principal: Formulario de Contenido de la Diapositiva Activa */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#AD3333] dark:text-red-400">
                  Diapositiva #{activeSlideIdx + 1}
                </span>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                  Editar Contenido
                </h4>
              </div>

              {/* Selector de Layout */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Diseño:</label>
                <select
                  value={activeSlide.layout || 'cards'}
                  onChange={e => handleSlideChange('layout', e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="title">Portada (Hero)</option>
                  <option value="cards">Conceptos (Tarjetas)</option>
                  <option value="bullets">Puntos Clave (Lista)</option>
                  <option value="quiz">Quiz Interactivo</option>
                </select>
              </div>
            </div>

            {/* Campo Título Principal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Título de la diapositiva:
              </label>
              <input
                type="text"
                value={activeSlide.title || ''}
                onChange={e => handleSlideChange('title', e.target.value)}
                placeholder="Título principal..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none ${inputBg}`}
              />
            </div>

            {/* Campos Específicos según Layout */}
            {activeSlide.layout === 'title' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Subtítulo / Objetivo de la lección:
                  </label>
                  <textarea
                    value={activeSlide.subtitle || activeSlide.description || ''}
                    onChange={e => handleSlideChange('subtitle', e.target.value)}
                    rows={3}
                    placeholder="Descripción y objetivos de la clase..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                  />
                </div>
              </div>
            )}

            {activeSlide.layout === 'cards' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Tarjetas de conceptos:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newCards = [...(activeSlide.cards || [])];
                      newCards.push({ title: `Concepto ${newCards.length + 1}`, text: '', example: '' });
                      handleSlideChange('cards', newCards);
                    }}
                    className="text-xs font-bold text-[#AD3333] hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Añadir tarjeta
                  </button>
                </div>

                <div className="space-y-3">
                  {(activeSlide.cards || []).map((card, cIdx) => (
                    <div key={cIdx} className={`p-3.5 rounded-2xl border space-y-2 relative ${panelBg}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Tarjeta #{cIdx + 1}
                        </span>
                        {(activeSlide.cards || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCards = activeSlide.cards.filter((_, i) => i !== cIdx);
                              handleSlideChange('cards', newCards);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={card.title || ''}
                        onChange={e => {
                          const newCards = activeSlide.cards.map((c, i) => i === cIdx ? {...c, title: e.target.value} : {...c});
                          handleSlideChange('cards', newCards);
                        }}
                        placeholder="Título del concepto..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                      />

                      <textarea
                        value={card.text || ''}
                        onChange={e => {
                          const newCards = activeSlide.cards.map((c, i) => i === cIdx ? {...c, text: e.target.value} : {...c});
                          handleSlideChange('cards', newCards);
                        }}
                        rows={2}
                        placeholder="Explicación del concepto..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                      />

                      <input
                        type="text"
                        value={card.example || ''}
                        onChange={e => {
                          const newCards = [...activeSlide.cards];
                          newCards[cIdx].example = e.target.value;
                          handleSlideChange('cards', newCards);
                        }}
                        placeholder="Ejemplo práctico (opcional)..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs italic outline-none ${inputBg}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide.layout === 'bullets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Puntos clave:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newBullets = [...(activeSlide.bullets || [])];
                      newBullets.push({ title: `Punto ${newBullets.length + 1}`, text: '', example: '' });
                      handleSlideChange('bullets', newBullets);
                    }}
                    className="text-xs font-bold text-[#AD3333] hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Añadir punto
                  </button>
                </div>

                <div className="space-y-3">
                  {(activeSlide.bullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} className={`p-3.5 rounded-2xl border space-y-2 ${panelBg}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Punto #{bIdx + 1}
                        </span>
                        {(activeSlide.bullets || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newBullets = activeSlide.bullets.filter((_, i) => i !== bIdx);
                              handleSlideChange('bullets', newBullets);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={typeof bullet === 'object' ? bullet.title : bullet}
                        onChange={e => {
                          const newBullets = activeSlide.bullets.map((b, i) => {
                            if (i !== bIdx) return b;
                            if (typeof b === 'object') return {...b, title: e.target.value};
                            return { title: e.target.value, text: '', example: '' };
                          });
                          handleSlideChange('bullets', newBullets);
                        }}
                        placeholder="Título del punto clave..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                      />

                      <textarea
                        value={typeof bullet === 'object' ? bullet.text : ''}
                        onChange={e => {
                          const newBullets = activeSlide.bullets.map((b, i) => {
                            if (i !== bIdx) return b;
                            if (typeof b === 'object') return {...b, text: e.target.value};
                            return b;
                          });
                          handleSlideChange('bullets', newBullets);
                        }}
                        rows={2}
                        placeholder="Explicación..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                      />

                      <input
                        type="text"
                        value={typeof bullet === 'object' ? bullet.example : ''}
                        onChange={e => {
                          const newBullets = activeSlide.bullets.map((b, i) => {
                            if (i !== bIdx) return b;
                            if (typeof b === 'object') return {...b, example: e.target.value};
                            return b;
                          });
                          handleSlideChange('bullets', newBullets);
                        }}
                        placeholder="Ejemplo (opcional)..."
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs italic outline-none ${inputBg}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide.layout === 'quiz' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Pregunta del Quiz:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.question || activeSlide.title || ''}
                    onChange={e => handleSlideChange('question', e.target.value)}
                    placeholder="¿Cuál es la pregunta?"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none ${inputBg}`}
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Opciones de respuesta:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = [...(activeSlide.options || [])];
                        newOpts.push({ text: `Opción ${String.fromCharCode(65 + newOpts.length)}`, isCorrect: false, explanation: '' });
                        handleSlideChange('options', newOpts);
                      }}
                      className="text-xs font-bold text-[#AD3333] hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> Añadir opción
                    </button>
                  </div>

                  {(activeSlide.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className={`p-3 rounded-2xl border flex items-center gap-3 ${panelBg}`}>
                      <span className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + oIdx)}
                      </span>

                      <input
                        type="text"
                        value={opt.text || ''}
                        onChange={e => {
                          const newOpts = [...activeSlide.options];
                          newOpts[oIdx].text = e.target.value;
                          handleSlideChange('options', newOpts);
                        }}
                        placeholder="Texto de la opción..."
                        className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-medium outline-none ${inputBg}`}
                      />

                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name={`correct_opt_${activeSlideIdx}`}
                          checked={!!opt.isCorrect}
                          onChange={() => {
                            const newOpts = activeSlide.options.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                            handleSlideChange('options', newOpts);
                          }}
                          className="accent-emerald-600"
                        />
                        <span className={opt.isCorrect ? 'text-emerald-600 font-black' : 'text-gray-500'}>Correcta</span>
                      </label>

                      {(activeSlide.options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = activeSlide.options.filter((_, i) => i !== oIdx);
                            handleSlideChange('options', newOpts);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// 4. MÓDULO PRINCIPAL CON SELECTOR DE IDIOMA Y BIBLIOTECA ULTRA-LIMPIA
// =========================================================================
export const ReviewsModule = ({
  role,
  isDarkMode,
  themeMode = 'light',
  glassCard,
  glassInput,
  redButton,
  reviews = [],
  db,
  appId,
  showMessage = () => {},
  confirmAction = () => {},
  callGemini
}) => {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("Inglés");
  const [slideCount, setSlideCount] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activePresentation, setActivePresentation] = useState(null);
  const [editingPresentation, setEditingPresentation] = useState(null);

  const isLight = themeMode === 'light';
  const isDim = themeMode === 'dim';

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      showMessage("⚠️ Escribe el tema para las diapositivas.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Actúa como un diseñador instruccional y profesor universitario de alto nivel.
Crea una presentación de diapositivas académica y profesional sobre el tema: "${topic.trim()}".

IDIOMA OBLIGATORIO: "${language}".
TODO el contenido, títulos, subtítulos, explicaciones, conceptos, puntos clave, ejemplos, preguntas de quiz y opciones DEBEN estar 100% y obligatoriamente redactados en ${language}. No mezcles otros idiomas.

Cantidad requerida: exactamente ${slideCount} diapositivas.
Estructura pedagógica y dinámica:
1. Diapositiva 1 (layout: "title"): Portada con título llamativo y elegante en ${language}, subtítulo y objetivos claros.
2. Diapositivas intermedias (layout: "cards" o "bullets"): Conceptos clave con títulos destacados, explicaciones precisas y ejemplos prácticos.
3. Diapositiva final (layout: "quiz"): Quiz de comprobación interactivo en ${language} con pregunta clara, 4 opciones (A, B, C, D) donde una sea 'isCorrect: true', y su debida explicación.

Devuelve ÚNICAMENTE un array JSON plano sin \`\`\`json ni texto extra:
[
  { "id": 1, "layout": "title", "title": "Título llamativo en ${language}", "subtitle": "Objetivo de la lección", "description": "Resumen breve" },
  { "id": 2, "layout": "cards", "title": "Conceptos Fundamentales", "cards": [{ "title": "Concepto 1", "text": "Explicación detallada", "example": "Ejemplo práctico" }, { "title": "Concepto 2", "text": "Explicación", "example": "Ejemplo" }] },
  { "id": 3, "layout": "bullets", "title": "Estructuras y Reglas", "bullets": [{ "title": "Punto 1", "text": "Detalle pedagógico", "example": "Ejemplo ilustrativo" }] },
  { "id": ${slideCount}, "layout": "quiz", "title": "Quiz de Comprensión", "question": "Pregunta en ${language}?", "options": [{ "text": "Opción A", "isCorrect": false, "explanation": "Explicación" }, { "text": "Opción B", "isCorrect": true, "explanation": "Explicación de por qué es correcta" }, { "text": "Opción C", "isCorrect": false, "explanation": "Explicación" }, { "text": "Opción D", "isCorrect": false, "explanation": "Explicación" }] }
]`;

      const res = await callGemini(prompt);
      if (!res) throw new Error("Sin respuesta");

      let clean = res.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const sIdx = clean.indexOf('[');
      const eIdx = clean.lastIndexOf(']');
      if (sIdx !== -1 && eIdx !== -1) clean = clean.substring(sIdx, eIdx + 1);

      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Formato inválido");

      const generatedTitle = parsed[0]?.title || topic.trim();

      const newDoc = {
        topic: generatedTitle,
        language: language,
        slides: parsed,
        slideCount: parsed.length,
        author: TEACHER_NAME,
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), newDoc);
      newDoc.id = docRef.id;

      setTopic("");
      setShowCreateForm(false);
      showMessage("🎉 ¡Diapositivas generadas con éxito!");
      setActivePresentation(newDoc);
    } catch (err) {
      console.error(err);
      showMessage("❌ No se pudo generar la presentación. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditedPresentation = async (updatedPres) => {
    if (!updatedPres || !updatedPres.id) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', updatedPres.id), {
        slides: updatedPres.slides,
        slideCount: updatedPres.slides.length,
        topic: updatedPres.slides?.[0]?.title || updatedPres.topic
      });
      showMessage("✅ Diapositivas actualizadas con éxito.");
      if (activePresentation?.id === updatedPres.id) {
        setActivePresentation(updatedPres);
      }
    } catch (err) {
      console.error(err);
      showMessage("❌ Error al guardar las diapositivas.");
    }
  };

  const handleDelete = (id) => {
    confirmAction("¿Eliminar esta presentación de diapositivas?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', id));
        showMessage("🗑️ Presentación eliminada.");
        if (activePresentation?.id === id) setActivePresentation(null);
        if (editingPresentation?.id === id) setEditingPresentation(null);
      } catch (err) {
        showMessage("❌ Error al eliminar.");
      }
    });
  };

  // Estilo de miniaturas según tema activo
  const thumbBg = isLight 
    ? 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-900 shadow-xs' 
    : (isDim ? 'bg-[#15202b] border-[#22303c] hover:border-[#2f4254] text-white shadow-xs' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-white shadow-xs');

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-6xl mx-auto">
      {/* Encabezado con Botón de Acción Principal */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Diapositivas
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Presentaciones interactivas, editor visual y descarga en PowerPoint (.pptx).
          </p>
        </div>

        {role === 'teacher' && !showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className={`${redButton} text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0`}
          >
            <Plus size={16} />
            <span>Crear diapositiva</span>
          </button>
        )}
      </div>

      {/* Formulario Desplegable de Creación con Selector de Idioma */}
      {role === 'teacher' && showCreateForm && (
        <form onSubmit={handleGenerate} className={`p-4 sm:p-5 rounded-2xl border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${glassCard}`}>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <Wand2 size={15} className="text-[#AD3333]" />
              <span>Configurar nueva presentación</span>
            </span>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Campo de Tema */}
            <div className="sm:col-span-6">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Tema de la clase (ej: Past Simple vs Continuous, Job Interview English...)"
                disabled={isGenerating}
                className={`w-full ${glassInput} text-xs sm:text-sm py-2.5 px-3.5`}
                autoFocus
              />
            </div>

            {/* Selector de Idioma */}
            <div className="sm:col-span-3">
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
                >
                  <option value="Inglés">🇬🇧 Inglés</option>
                  <option value="Español">🇪🇸 Español</option>
                  <option value="Francés">🇫🇷 Francés</option>
                  <option value="Portugués">🇵🇹 Portugués</option>
                  <option value="Alemán">🇩🇪 Alemán</option>
                  <option value="Italiano">🇮🇹 Italiano</option>
                </select>
              </div>
            </div>

            {/* Selector de Cantidad */}
            <div className="sm:col-span-3 flex items-center gap-2">
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value={4}>4 diapositivas</option>
                <option value={6}>6 diapositivas</option>
                <option value={8}>8 diapositivas</option>
                <option value={10}>10 diapositivas</option>
              </select>

              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className={`${redButton} text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs shrink-0 flex items-center justify-center gap-1.5`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span className="hidden sm:inline">Generando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Generar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* BIBLIOTECA ULTRA-LIMPIA: MINIATURAS REALES */}
      <section className="space-y-3">
        {reviews.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No hay diapositivas creadas"
            message={role === 'teacher' ? 'Presiona "Crear diapositiva" para generar tu primera presentación en PowerPoint.' : 'La docente publicará diapositivas aquí.'}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((review) => {
              const firstSlide = review.slides?.[0] || {};
              const displayTitle = firstSlide.title || review.topic;

              return (
                <div
                  key={review.id}
                  className="flex flex-col gap-2 group cursor-pointer"
                  onClick={() => setActivePresentation(review)}
                >
                  {/* MINIATURA REAL NÍTIDA Y 100% LIMPIA */}
                  <div className={`aspect-video w-full rounded-2xl p-6 flex flex-col items-center justify-center border relative overflow-hidden transition-all duration-200 group-hover:scale-[1.01] group-hover:shadow-md ${thumbBg}`}>
                    {/* Título y Subtítulo Real de la Portada */}
                    <div className="space-y-2 text-center px-2">
                      {review.language && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#AD3333] dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                          {review.language}
                        </span>
                      )}
                      <h4 className="text-base sm:text-lg font-black line-clamp-2 leading-tight">
                        {displayTitle}
                      </h4>
                      {firstSlide.subtitle && (
                        <p className="text-xs opacity-70 line-clamp-1 font-medium">{firstSlide.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Fila Inferior: Título Sincronizado y Acciones */}
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {displayTitle}
                    </h4>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {role === 'teacher' && (
                        <button
                          type="button"
                          onClick={() => setEditingPresentation(review)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          title="Editar diapositivas"
                        >
                          <Edit3 size={14} className="text-[#AD3333]" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => exportReviewToPresentation(review)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        title="Descargar archivo PowerPoint .pptx"
                      >
                        <Download size={14} className="text-emerald-500" />
                      </button>

                      {role === 'teacher' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(review.id)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar presentación"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* VISOR CON PANTALLA COMPLETA REAL Y TEMA ADAPTATIVO */}
      {activePresentation && (
        <SlidePresenterViewer
          presentation={activePresentation}
          onClose={() => setActivePresentation(null)}
          onEdit={(pres) => {
            setActivePresentation(null);
            setEditingPresentation(pres);
          }}
          role={role}
          themeMode={themeMode}
        />
      )}

      {/* EDITOR ROBUSTO IN-APP */}
      {editingPresentation && (
        <SlideEditorModal
          presentation={editingPresentation}
          onClose={() => setEditingPresentation(null)}
          onSave={handleSaveEditedPresentation}
          onProject={(pres) => {
            setEditingPresentation(null);
            setActivePresentation(pres);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default ReviewsModule;

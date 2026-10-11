// src/components/ReviewsModule.jsx
// Estudio de Diapositivas estilo PowerPoint / Google Slides con Lienzo Interactivo 16:9,
// 11 Diseños, Objetos Libres Arrastrables, Temas Visuales, Asistente IA y Exportación Nativa .PPTX

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Wand2, Sparkles, Loader2, Download, Trash2, X, Plus, Maximize2,
  Minimize2, ChevronLeft, ChevronRight, BookOpen, Edit3, Copy,
  ArrowUp, ArrowDown, CheckCheck, Globe, CheckCircle2, ChevronDown,
  Lightbulb, Pin, Palette, Layers, Grid, Play, Pause, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, TableIcon, ColumnsIcon,
  LayoutIcon, Bold, Italic, Underline, Strikethrough, Highlighter,
  List, ListOrdered, Clipboard, Eraser, MonitorPlay, Timer, Sliders, ImageIcon, Upload, Search,
  Volume2, VolumeX, PenTool, RotateCcw, FileText, Eye
} from './Icons.jsx'
import {
  TEACHER_NAME,
  getCanonicalTeacherId,
  getTeacherDisplayName,
  getItemTeacherId,
  compressImage,
  uploadImageToStorage,
  deleteAllStorageFilesInObject,
  deleteReplacedStorageFiles,
  cleanTextForTTS,
  detectLanguage,
  selectBestFemaleVoice
} from '../utils/helpers.js'
import EmptyState from './EmptyState.jsx'
import { auth, signInAnonymously, doc, addDoc, setDoc, collection, deleteDoc, updateDoc } from '../firebase/config.js'
import { DEMO_TTL_MS, saveDemoSandboxItem, removeDemoSandboxItem } from '../utils/demoData.js'
import {
  SLIDE_THEMES,
  SLIDE_FONTS,
  SLIDE_LAYOUT_CATALOG,
  SLIDE_TRANSITION_GALLERY,
  SLIDE_PATTERNS,
  SLIDE_FONT_SIZES,
  SLIDE_COLOR_SWATCHES,
  SLIDE_HIGHLIGHT_SWATCHES,
  SLIDE_ACADEMIC_BADGES,
  SLIDE_ACADEMIC_ILLUSTRATIONS,
  SLIDE_STARTER_TEMPLATES,
  resolveSlideLayout,
  getSlidePatternStyle,
  cleanHexNoHash,
  isLightHexColor,
  resolveTheme,
  createDefaultSlide,
  convertSlideLayout,
  clampElementRect,
  createCanvasElement,
  getDefaultFieldStyleMeta,
  getFieldTextStyle,
  updateFieldTextStyle,
  clearFieldTextStyle,
  shiftFieldTextStylesOnDelete,
  buildInlineTextStyle,
  transformTextCase,
  getSlideFieldTextValue,
  setSlideFieldTextValue,
  listSlideEditableFields,
  buildDeckAiPrompt,
  parseDeckAiResponse,
  buildSingleSlideAiPrompt,
  parseSingleSlideAiResponse,
  buildFallbackAiSlides,
  normalizeSingleSlide,
  getTableRows,
  sanitizeSlidesForFirestore,
  hydrateSlidesFromFirestore
} from '../utils/slidesEngine.js'

export { resolveSlideLayout }

// Helper para comprimir cualquier archivo o DataURL de imagen (incluidos PNG pesados de portapapeles)
// a un DataURL ligero apto para Firestore (< 90 KB) y modo Demo
const compressSlideImageDataUrl = (fileOrDataUrl, maxDim = 960, quality = 0.74) =>
  new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      return;
    }

    const processSourceUrl = (srcUrl) => {
      if (!srcUrl || typeof srcUrl !== 'string') {
        resolve('');
        return;
      }
      if (srcUrl.startsWith('data:image/svg')) {
        resolve(srcUrl);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width || 640;
          let h = img.naturalHeight || img.height || 420;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.max(1, Math.round((h * maxDim) / w));
              w = maxDim;
            } else {
              w = Math.max(1, Math.round((w * maxDim) / h));
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(srcUrl);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let out = canvas.toDataURL('image/jpeg', quality);
          if (out.length > 180000) {
            out = canvas.toDataURL('image/jpeg', 0.55);
          }
          resolve(out);
        } catch {
          resolve(srcUrl);
        }
      };
      img.onerror = () => resolve(srcUrl);
      img.src = srcUrl;
    };

    if (typeof fileOrDataUrl === 'string') {
      processSourceUrl(fileOrDataUrl);
      return;
    }

    if (fileOrDataUrl && typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = (ev) => processSourceUrl(String(ev.target?.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileOrDataUrl);
      return;
    }

    resolve('');
  });

const uploadOrInlineSlideImage = async (fileOrDataUrl, isDemoMode = false) => {
  let baseDataUrl = '';
  if (typeof fileOrDataUrl === 'string') {
    baseDataUrl = fileOrDataUrl;
  } else if (fileOrDataUrl) {
    try {
      baseDataUrl = await compressImage(fileOrDataUrl, 1200, 1200, 0.78);
    } catch {
      baseDataUrl = '';
    }
  }
  const compactDataUrl = await compressSlideImageDataUrl(baseDataUrl || fileOrDataUrl, 960, 0.74);
  const safeInlineUrl = compactDataUrl || baseDataUrl;
  if (!safeInlineUrl) return '';

  if (isDemoMode) {
    return safeInlineUrl;
  }

  try {
    if (auth && !auth.currentUser) {
      await signInAnonymously(auth).catch(() => {});
    }
    const uploadedUrl = await uploadImageToStorage(safeInlineUrl, 'slides');
    if (uploadedUrl && typeof uploadedUrl === 'string') {
      return uploadedUrl;
    }
  } catch {
    // Fallback al DataURL compacto si Storage falla
  }
  return safeInlineUrl;
};

const compactDeckSlidesImages = async (slides = [], isDemoMode = false) => {
  if (!Array.isArray(slides)) return [];
  const nextSlides = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!s || typeof s !== 'object') {
      nextSlides.push(s);
      continue;
    }
    let updatedSlide = { ...s };
    if (typeof updatedSlide.imageUrl === 'string' && updatedSlide.imageUrl.startsWith('data:image/') && !updatedSlide.imageUrl.startsWith('data:image/svg') && updatedSlide.imageUrl.length > 90000) {
      updatedSlide.imageUrl = await uploadOrInlineSlideImage(updatedSlide.imageUrl, isDemoMode);
    }
    if (typeof updatedSlide.bgImage === 'string' && updatedSlide.bgImage.startsWith('data:image/') && !updatedSlide.bgImage.startsWith('data:image/svg') && updatedSlide.bgImage.length > 90000) {
      updatedSlide.bgImage = await uploadOrInlineSlideImage(updatedSlide.bgImage, isDemoMode);
    }
    if (Array.isArray(updatedSlide.elements) && updatedSlide.elements.length > 0) {
      const nextEls = [];
      for (let j = 0; j < updatedSlide.elements.length; j++) {
        const el = updatedSlide.elements[j];
        if (el && el.type === 'image' && typeof el.imageUrl === 'string' && el.imageUrl.startsWith('data:image/') && !el.imageUrl.startsWith('data:image/svg') && el.imageUrl.length > 90000) {
          const compactElUrl = await uploadOrInlineSlideImage(el.imageUrl, isDemoMode);
          nextEls.push({ ...el, imageUrl: compactElUrl });
        } else {
          nextEls.push(el);
        }
      }
      updatedSlide.elements = nextEls;
    }
    nextSlides.push(updatedSlide);
  }
  return nextSlides;
};

const resolvePptxImageSource = (rawUrl) =>
  new Promise((resolve) => {
    if (!rawUrl || typeof rawUrl !== 'string') {
      resolve(null);
      return;
    }
    if (rawUrl.startsWith('data:image/svg')) {
      if (typeof document === 'undefined' || typeof Image === 'undefined') {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 640;
          canvas.height = img.naturalHeight || 420;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({ data: canvas.toDataURL('image/png') });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = rawUrl;
      return;
    }
    if (rawUrl.startsWith('data:image/')) {
      resolve({ data: rawUrl });
      return;
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      resolve({ path: rawUrl });
      return;
    }
    resolve(null);
  });

// =========================================================================
// 1. GENERADOR NATIVO DE ARCHIVOS MICROSOFT POWERPOINT (.PPTX)
// =========================================================================
export const exportReviewToPresentation = async (review) => {
  if (!review || !Array.isArray(review.slides) || review.slides.length === 0) return;

  const displayTitle = review.slides?.[0]?.title || review.topic || 'Presentación de Diapositivas';

  const { default: pptxgen } = await import('pptxgenjs');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = review.author || TEACHER_NAME;
  pptx.subject = displayTitle;
  pptx.title = displayTitle;

  for (let idx = 0; idx < review.slides.length; idx++) {
    const s = review.slides[idx] || {};
    const slide = pptx.addSlide();
    const theme = resolveTheme(review, s, review.theme ? 'light' : 'dark');
    const fontFace = theme.pptxFont || 'Arial';

    const BG_COLOR = theme.pptxBg || '0F172A';
    const CARD_BG = theme.pptxCardBg || '1E293B';
    const CARD_BORDER = theme.pptxCardBorder || '334155';
    const PRIMARY_COLOR = theme.pptxPrimary || 'AD3333';
    const SECONDARY_COLOR = theme.pptxSecondary || 'F59E0B';
    const TEXT_MAIN = theme.pptxText || 'FFFFFF';
    const TEXT_MUTED = theme.pptxMuted || '94A3B8';

    slide.background = { color: BG_COLOR };

    if (s.bgImage && typeof s.bgImage === 'string') {
      try {
        const bgImgSource = await resolvePptxImageSource(s.bgImage);
        if (bgImgSource) {
          slide.addImage({ ...bgImgSource, x: 0, y: 0, w: 13.33, h: 7.5, transparency: Math.round((1 - (s.bgOverlayOpacity ?? 0.22)) * 100) });
        }
      } catch {
        // ignore invalid background image
      }
    }

    const slideLayout = resolveSlideLayout(s, idx);
    const titleAlign = s.titleAlign || (slideLayout === 'title' || slideLayout === 'section' || slideLayout === 'quote' ? 'center' : 'left');

    const applyFieldPptxOpts = (fieldKey, baseOpts = {}) => {
      const st = getFieldTextStyle(s, fieldKey);
      const opts = { ...baseOpts };
      if (st.color) opts.color = cleanHexNoHash(st.color, opts.color || TEXT_MAIN);
      if (st.bgColor && st.bgColor !== 'transparent' && !String(st.bgColor).startsWith('rgba')) {
        opts.fill = { color: cleanHexNoHash(st.bgColor, CARD_BG) };
        if (!st.color) {
          opts.color = isLightHexColor(st.bgColor, true) ? '0F172A' : 'F8FAFC';
        }
      }
      if (st.fontFamily && SLIDE_FONTS[st.fontFamily]) {
        opts.fontFace = SLIDE_FONTS[st.fontFamily].pptx;
      }
      if (st.fontSize && Number.isFinite(Number(st.fontSize))) {
        opts.fontSize = Math.max(8, Math.min(64, Math.round(Number(st.fontSize) * 0.85)));
      }
      if (st.bold !== undefined) opts.bold = !!st.bold;
      if (st.italic !== undefined) opts.italic = !!st.italic;
      if (st.underline) opts.underline = { style: 'sng' };
      if (st.strikethrough) opts.strike = 'sngStrike';
      if (st.align && ['left', 'center', 'right', 'justify'].includes(st.align)) {
        opts.align = st.align;
      }
      return opts;
    };

    if (slideLayout === 'title') {
      slide.addShape(pptx.ShapeType.rect, {
        x: titleAlign === 'center' ? 5.4 : 0.8,
        y: 1.3,
        w: 2.5,
        h: 0.08,
        fill: { color: PRIMARY_COLOR },
        line: { color: PRIMARY_COLOR, width: 0 }
      });

      if (s.badge) {
        slide.addText(String(s.badge).toUpperCase(), applyFieldPptxOpts('badge', {
          x: 0.8, y: 1.55, w: 11.7, h: 0.4,
          fontSize: 12, fontFace, color: PRIMARY_COLOR, bold: true, align: titleAlign
        }));
      }

      slide.addText(s.title || displayTitle, applyFieldPptxOpts('title', {
        x: 0.8, y: 2.1, w: 11.7, h: 2.2,
        fontSize: 38, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign,
        valign: 'middle', breakLine: true
      }));

      const hasDistinctDesc = Boolean(s.subtitle && s.description && s.description !== s.subtitle);
      slide.addText(s.subtitle || s.description || 'Presentación Académica Interactiva', applyFieldPptxOpts('subtitle', {
        x: 1.0, y: 4.45, w: 11.3, h: hasDistinctDesc ? 0.9 : 1.5,
        fontSize: 18, fontFace, color: TEXT_MUTED, align: titleAlign, valign: 'top', breakLine: true
      }));

      if (hasDistinctDesc) {
        slide.addText(String(s.description), applyFieldPptxOpts('description', {
          x: 1.2, y: 5.4, w: 10.9, h: 1.0,
          fontSize: 15, fontFace, color: TEXT_MUTED, align: titleAlign, valign: 'top', breakLine: true
        }));
      }

    } else if (slideLayout === 'section') {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.0, w: 11.7, h: 5.5,
        fill: { color: CARD_BG },
        line: { color: PRIMARY_COLOR, width: 1.5 },
        rectRadius: 0.2
      });

      slide.addText(String(s.badge || `SECCIÓN ${idx + 1}`).toUpperCase(), applyFieldPptxOpts('badge', {
        x: 1.2, y: 1.9, w: 10.9, h: 0.5,
        fontSize: 13, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
      }));

      slide.addText(s.title || 'Encabezado de Sección', applyFieldPptxOpts('title', {
        x: 1.2, y: 2.5, w: 10.9, h: 1.6,
        fontSize: 34, fontFace, color: TEXT_MAIN, bold: true, align: 'center', valign: 'middle'
      }));

      if (s.subtitle) {
        slide.addText(s.subtitle, applyFieldPptxOpts('subtitle', {
          x: 1.6, y: 4.2, w: 10.1, h: 1.2,
          fontSize: 17, fontFace, color: TEXT_MUTED, align: 'center'
        }));
      }

    } else if (slideLayout === 'title_body') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1}`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Desarrollo del Tema', applyFieldPptxOpts('title', {
        x: 0.8, y: 0.9, w: 11.5, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const hasCallout = Boolean(s.callout && String(s.callout).trim());
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.8, w: 11.7, h: hasCallout ? 3.5 : 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      slide.addText(s.body || s.content || s.subtitle || '', applyFieldPptxOpts('body', {
        x: 1.1, y: 2.0, w: 11.1, h: hasCallout ? 3.1 : 4.3,
        fontSize: 16, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
      }));

      if (hasCallout) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: 5.5, w: 11.7, h: 1.1,
          fill: { color: CARD_BG },
          line: { color: PRIMARY_COLOR, width: 1.5 },
          rectRadius: 0.12
        });
        slide.addText(`💡 ${s.callout}`, applyFieldPptxOpts('callout', {
          x: 1.1, y: 5.65, w: 11.1, h: 0.8,
          fontSize: 14, fontFace, color: PRIMARY_COLOR, bold: true, valign: 'middle'
        }));
      }

    } else if (slideLayout === 'two_columns') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1} • COMPARACIÓN`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Comparación', applyFieldPptxOpts('title', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const cols = [
        { key: 'leftColumn', data: s.leftColumn || { title: 'Columna A', text: '', items: [] }, x: 0.8, accent: PRIMARY_COLOR },
        { key: 'rightColumn', data: s.rightColumn || { title: 'Columna B', text: '', items: [] }, x: 6.8, accent: SECONDARY_COLOR }
      ];

      cols.forEach((col) => {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: col.x, y: 1.85, w: 5.7, h: 4.8,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.15
        });

        if (col.data.badge) {
          slide.addText(String(col.data.badge).toUpperCase(), applyFieldPptxOpts(`${col.key}.badge`, {
            x: col.x + 0.35, y: 2.05, w: 5.0, h: 0.3,
            fontSize: 10, fontFace, color: col.accent, bold: true
          }));
        }

        slide.addText(col.data.title || ' Bloque', applyFieldPptxOpts(`${col.key}.title`, {
          x: col.x + 0.35, y: 2.4, w: 5.0, h: 0.55,
          fontSize: 18, fontFace, color: TEXT_MAIN, bold: true
        }));

        if (col.data.text) {
          slide.addText(col.data.text, applyFieldPptxOpts(`${col.key}.text`, {
            x: col.x + 0.35, y: 3.05, w: 5.0, h: 1.2,
            fontSize: 13, fontFace, color: TEXT_MUTED, valign: 'top'
          }));
        }

        const listItems = Array.isArray(col.data.items) ? col.data.items.filter(Boolean) : [];
        if (listItems.length > 0) {
          const itemRuns = listItems.map((it, iIdx) => ({
            text: `•  ${it}${iIdx < listItems.length - 1 ? '\n' : ''}`,
            options: applyFieldPptxOpts(`${col.key}.items.${iIdx}`, {
              fontSize: 13, fontFace, color: TEXT_MAIN
            })
          }));
          slide.addText(itemRuns, applyFieldPptxOpts(`${col.key}.items.0`, {
            x: col.x + 0.35, y: col.data.text ? 4.35 : 3.2, w: 5.0, h: 2.0,
            fontSize: 13, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
          }));
        }
      });

    } else if (slideLayout === 'table') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1} • TABLA`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Tabla de Datos', applyFieldPptxOpts('title', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const headers = Array.isArray(s.table?.headers) && s.table.headers.length > 0
        ? s.table.headers
        : ['Concepto', 'Explicación', 'Ejemplo'];
      const rows = getTableRows(s.table);

      const pptxRows = [
        headers.map((h, hIdx) => {
          const hOpts = applyFieldPptxOpts(`table.header.${hIdx}`, {
            fill: PRIMARY_COLOR, color: 'FFFFFF', bold: true, fontSize: 13, fontFace, valign: 'middle'
          });
          return { text: String(h || ''), options: hOpts };
        }),
        ...rows.map((r, rIdx) =>
          headers.map((_, cIdx) => {
            const cOpts = applyFieldPptxOpts(`table.cell.${rIdx}.${cIdx}`, {
              fill: CARD_BG, color: TEXT_MAIN, fontSize: 12, fontFace, valign: 'middle'
            });
            return {
              text: String((Array.isArray(r) ? r[cIdx] : '') || ''),
              options: cOpts
            };
          })
        )
      ];

      slide.addTable(pptxRows, {
        x: 0.8,
        y: 1.85,
        w: 11.7,
        border: { type: 'solid', pt: 1, color: CARD_BORDER },
        rowH: 0.65
      });

    } else if (slideLayout === 'image_text') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1}`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Análisis Visual', applyFieldPptxOpts('title', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const imgLeft = s.imagePosition === 'left';
      const textX = imgLeft ? 6.6 : 0.8;
      const imgX = imgLeft ? 0.8 : 6.8;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: textX, y: 1.85, w: 5.7, h: 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      slide.addText(s.body || s.content || s.subtitle || '', applyFieldPptxOpts('body', {
        x: textX + 0.35, y: 2.1, w: 5.0, h: 3.2,
        fontSize: 15, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
      }));

      if (s.callout) {
        slide.addText(`📌 ${s.callout}`, applyFieldPptxOpts('callout', {
          x: textX + 0.35, y: 5.4, w: 5.0, h: 0.9,
          fontSize: 12, fontFace, color: PRIMARY_COLOR, bold: true, valign: 'top'
        }));
      }

      slide.addShape(pptx.ShapeType.roundRect, {
        x: imgX, y: 1.85, w: 5.7, h: 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      if (s.imageUrl && typeof s.imageUrl === 'string') {
        try {
          const imgSource = await resolvePptxImageSource(s.imageUrl);
          if (imgSource) {
            slide.addImage({ ...imgSource, x: imgX + 0.25, y: 2.05, w: 5.2, h: 3.7 });
          }
        } catch {
          // ignore invalid image data
        }
      }
      if (s.imageCaption) {
        slide.addText(s.imageCaption, applyFieldPptxOpts('imageCaption', {
          x: imgX + 0.3, y: 5.9, w: 5.1, h: 0.5,
          fontSize: 11, fontFace, color: TEXT_MUTED, italic: true, align: 'center'
        }));
      }

    } else if (slideLayout === 'quote') {
      if (s.badge) {
        slide.addText(String(s.badge).toUpperCase(), applyFieldPptxOpts('badge', {
          x: 0.9, y: 0.5, w: 11.5, h: 0.3,
          fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
        }));
      }
      if (s.title) {
        slide.addText(String(s.title), applyFieldPptxOpts('title', {
          x: 0.9, y: 0.8, w: 11.5, h: 0.55,
          fontSize: 20, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
        }));
      }

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.9, y: 1.45, w: 11.5, h: 5.0,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1.5 },
        rectRadius: 0.2
      });

      if (s.statValue) {
        slide.addText(String(s.statValue), applyFieldPptxOpts('statValue', {
          x: 1.3, y: 1.75, w: 10.7, h: 1.1,
          fontSize: 44, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
        }));
      }

      slide.addText(`“${s.quoteText || s.body || s.title || ''}”`, applyFieldPptxOpts('quoteText', {
        x: 1.4, y: s.statValue ? 2.95 : 2.15, w: 10.5, h: 2.1,
        fontSize: 24, fontFace, color: TEXT_MAIN, bold: true, italic: true, align: 'center', valign: 'middle'
      }));

      if (s.quoteAuthor || s.title) {
        slide.addText(`— ${s.quoteAuthor || s.title}`, applyFieldPptxOpts('quoteAuthor', {
          x: 1.4, y: 5.3, w: 10.5, h: 0.6,
          fontSize: 15, fontFace, color: TEXT_MUTED, bold: true, align: 'center'
        }));
      }

    } else if (slideLayout === 'quiz') {
      slide.addText(s.badge || `SLIDE ${idx + 1} • QUIZ`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: SECONDARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Pregunta de Repaso', applyFieldPptxOpts('title', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.7,
        fontSize: 24, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.8, w: 11.5, h: 1.4,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });
      slide.addText(s.question || s.content || '', applyFieldPptxOpts('question', {
        x: 1.1, y: 2.0, w: 10.9, h: 1.0,
        fontSize: 17, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      const options = s.options || [
        { text: s.answer || 'Respuesta correcta', isCorrect: true, explanation: '' }
      ];

      options.slice(0, 6).forEach((opt, oIdx) => {
        const col = oIdx % 2;
        const row = Math.floor(oIdx / 2);
        const posX = 0.8 + (col * 5.9);
        const posY = 3.4 + (row * 1.25);

        slide.addShape(pptx.ShapeType.roundRect, {
          x: posX, y: posY, w: 5.6, h: 1.05,
          fill: { color: opt.isCorrect ? '064E3B' : CARD_BG },
          line: { color: opt.isCorrect ? '10B981' : CARD_BORDER, width: 1 },
          rectRadius: 0.15
        });

        if (opt.explanation) {
          slide.addText(`${String.fromCharCode(65 + oIdx)})  ${opt.text}`, applyFieldPptxOpts(`options.${oIdx}.text`, {
            x: posX + 0.2, y: posY + 0.08, w: 5.2, h: 0.5,
            fontSize: 13, fontFace, color: opt.isCorrect ? 'A7F3D0' : TEXT_MAIN,
            bold: opt.isCorrect, valign: 'middle'
          }));
          slide.addText(String(opt.explanation), applyFieldPptxOpts(`options.${oIdx}.explanation`, {
            x: posX + 0.2, y: posY + 0.58, w: 5.2, h: 0.38,
            fontSize: 10, fontFace, color: opt.isCorrect ? 'A7F3D0' : TEXT_MUTED,
            italic: true, valign: 'top'
          }));
        } else {
          slide.addText(`${String.fromCharCode(65 + oIdx)})  ${opt.text}`, applyFieldPptxOpts(`options.${oIdx}.text`, {
            x: posX + 0.2, y: posY + 0.12, w: 5.2, h: 0.8,
            fontSize: 14, fontFace, color: opt.isCorrect ? 'A7F3D0' : TEXT_MAIN,
            bold: opt.isCorrect, valign: 'middle'
          }));
        }
      });

    } else if (slideLayout === 'bullets') {
      slide.addText(s.badge || `SLIDE ${idx + 1}`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Conceptos Esenciales', applyFieldPptxOpts('title', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const items = s.bullets || (s.content ? s.content.split('\n').filter(Boolean).map(t => ({ title: t, text: '' })) : []);

      items.slice(0, 6).forEach((b, bIdx) => {
        const stepH = items.length > 4 ? 0.82 : items.length > 3 ? 0.95 : 1.2;
        const posY = 1.9 + (bIdx * stepH);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: posY, w: 11.5, h: stepH - 0.12,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.12
        });

        slide.addText(`${bIdx + 1}`, {
          x: 1.0, y: posY + 0.12, w: 0.5, h: 0.5,
          fontSize: 15, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
        });

        const bTitle = typeof b === 'object' ? b.title : b;
        const bText = (typeof b === 'object' && b.text) ? ` — ${b.text}` : '';
        const bEx = (typeof b === 'object' && b.example) ? ` [Ej: ${b.example}]` : '';

        const bRuns = [
          {
            text: String(bTitle || ''),
            options: applyFieldPptxOpts(`bullets.${bIdx}.title`, {
              fontSize: 14, fontFace, color: TEXT_MAIN, bold: true
            })
          }
        ];
        if (bText) {
          bRuns.push({
            text: bText,
            options: applyFieldPptxOpts(`bullets.${bIdx}.text`, {
              fontSize: 13, fontFace, color: TEXT_MUTED, bold: false
            })
          });
        }
        if (bEx) {
          bRuns.push({
            text: bEx,
            options: applyFieldPptxOpts(`bullets.${bIdx}.example`, {
              fontSize: 12, fontFace, color: PRIMARY_COLOR, italic: true
            })
          });
        }

        slide.addText(bRuns, applyFieldPptxOpts(`bullets.${bIdx}.title`, {
          x: 1.6, y: posY + 0.08, w: 10.4, h: stepH - 0.25,
          fontSize: 14, fontFace, color: TEXT_MAIN, bold: false, valign: 'middle'
        }));
      });


    } else if (slideLayout === 'blank') {
      if (!s.hideHeader && s.title) {
        slide.addText(s.title, applyFieldPptxOpts('title', {
          x: 0.8, y: 0.55, w: 11.7, h: 0.65,
          fontSize: 22, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
        }));
      }
    } else {
      // 'cards'
      slide.addText(s.badge || `SLIDE ${idx + 1}`, applyFieldPptxOpts('badge', {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: PRIMARY_COLOR, bold: true
      }));

      slide.addText(s.title || 'Explicación del Tema', applyFieldPptxOpts('title', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      }));

      const cards = s.cards || (s.content ? [{ title: s.title, text: s.content }] : []);
      const count = Math.min(Math.max(cards.length, 1), 4);
      const gap = 0.22;
      const totalW = 11.7;
      const cardW = (totalW - gap * (count - 1)) / count;

      cards.slice(0, 4).forEach((c, cIdx) => {
        const posX = 0.8 + (cIdx * (cardW + gap));
        slide.addShape(pptx.ShapeType.roundRect, {
          x: posX, y: 2.0, w: cardW, h: 4.5,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.15
        });

        slide.addText(c.title || `Concepto ${cIdx + 1}`, applyFieldPptxOpts(`cards.${cIdx}.title`, {
          x: posX + 0.25, y: 2.25, w: cardW - 0.5, h: 0.65,
          fontSize: 16, fontFace, color: TEXT_MAIN, bold: true
        }));

        slide.addText(c.text || '', applyFieldPptxOpts(`cards.${cIdx}.text`, {
          x: posX + 0.25, y: 2.95, w: cardW - 0.5, h: 2.1,
          fontSize: 13, fontFace, color: TEXT_MUTED, valign: 'top', breakLine: true
        }));

        if (c.example) {
          slide.addText(`Ej: ${c.example}`, applyFieldPptxOpts(`cards.${cIdx}.example`, {
            x: posX + 0.25, y: 5.15, w: cardW - 0.5, h: 1.0,
            fontSize: 12, fontFace, color: PRIMARY_COLOR, italic: true, valign: 'top'
          }));
        }
      });
    }

    // Exportar elementos libres del lienzo (slide.elements) en pulgadas (13.33 x 7.5)
    if (Array.isArray(s.elements) && s.elements.length > 0) {
      for (let eIdx = 0; eIdx < s.elements.length; eIdx++) {
        const el = s.elements[eIdx];
        if (!el) continue;
        const xIn = Math.max(0, Math.min(13.0, ((Number(el.x) || 0) / 100) * 13.33));
        const yIn = Math.max(0, Math.min(7.2, ((Number(el.y) || 0) / 100) * 7.5));
        const wIn = Math.max(0.5, Math.min(13.33 - xIn, ((Number(el.w) || 25) / 100) * 13.33));
        const hIn = Math.max(0.35, Math.min(7.5 - yIn, ((Number(el.h) || 15) / 100) * 7.5));

        if (el.type === 'image' && el.imageUrl && typeof el.imageUrl === 'string') {
          try {
            const elImgSrc = await resolvePptxImageSource(el.imageUrl);
            if (elImgSrc) {
              slide.addImage({ ...elImgSrc, x: xIn, y: yIn, w: wIn, h: hIn });
            }
          } catch {
            // ignore
          }
          continue;
        }

        if (el.shapeType === 'divider') {
          const divColor = el.fill && el.fill !== 'transparent' ? cleanHexNoHash(el.fill, PRIMARY_COLOR) : PRIMARY_COLOR;
          slide.addShape(pptx.ShapeType.rect, {
            x: xIn,
            y: Math.max(0.1, yIn + hIn / 2 - 0.025),
            w: wIn,
            h: 0.05,
            fill: { color: divColor },
            line: { color: divColor, width: 0 }
          });
          continue;
        }

        const hasFill = Boolean(el.fill && el.fill !== 'transparent' && !String(el.fill).startsWith('rgba'));
        const hasDefaultShapeFill = !el.fill && (el.type === 'shape' || el.type === 'note' || el.type === 'badge');
        if (hasFill || hasDefaultShapeFill) {
          const shapeFillColor = hasFill ? cleanHexNoHash(el.fill, CARD_BG) : (el.type === 'note' ? 'FEF08A' : CARD_BG);
          slide.addShape(
            el.shapeType === 'circle' ? pptx.ShapeType.ellipse : pptx.ShapeType.roundRect,
            {
              x: xIn,
              y: yIn,
              w: wIn,
              h: hIn,
              fill: { color: shapeFillColor },
              line: {
                color: el.stroke && el.stroke !== 'transparent' ? cleanHexNoHash(el.stroke, PRIMARY_COLOR) : shapeFillColor,
                width: el.stroke && el.stroke !== 'transparent' ? 1.5 : 0
              },
              rectRadius: el.shapeType === 'pill' || el.type === 'badge' ? 0.4 : 0.12
            }
          );
        }

        if (el.text) {
          const elFontFace = (el.fontFamily && SLIDE_FONTS[el.fontFamily]?.pptx) || fontFace;
          const fallbackElTextColor = hasFill
            ? (isLightHexColor(el.fill, false) ? '0F172A' : 'FFFFFF')
            : TEXT_MAIN;
          const elTextOpts = {
            x: xIn + 0.1,
            y: yIn + 0.06,
            w: Math.max(0.3, wIn - 0.2),
            h: Math.max(0.25, hIn - 0.12),
            fontSize: Math.max(10, Math.min(60, Number(el.fontSize) || 16)),
            fontFace: elFontFace,
            color: cleanHexNoHash(el.textColor, fallbackElTextColor),
            bold: !!el.bold,
            italic: !!el.italic,
            align: el.align || 'left',
            valign: 'middle'
          };
          if (el.underline) elTextOpts.underline = { style: 'sng' };
          if (el.strikethrough) elTextOpts.strike = 'sngStrike';
          slide.addText(String(el.text), elTextOpts);
        }
      }
    }

    if (s.speakerNotes && typeof slide.addNotes === 'function') {
      try {
        slide.addNotes(String(s.speakerNotes));
      } catch {
        // ignore if addNotes fails
      }
    }
  }

  const fileName = `${displayTitle.replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_').toLowerCase()}.pptx`;
  try {
    await pptx.writeFile({ fileName });
  } catch (err) {
    console.error('Error exportando presentación:', err);
  }
};

// =========================================================================
// 2. LIENZO VISUAL 16:9 UNIFICADO (Miniatura, Tarjeta, Editor WYSIWYG y Presentador)
// =========================================================================
export const SlideCanvasSurface = ({
  presentation,
  slide,
  slideIdx = 0,
  totalSlides = 1,
  appThemeMode = 'light',
  mode = 'presenter', // 'presenter' | 'editor' | 'thumbnail' | 'card'
  quizSelection = {},
  onSelectQuizOption = null,
  onResetQuizSlide = null,
  onUpdateSlideField = null,
  onPatchSlide = null,
  selectedElementId = null,
  onSelectElement = null,
  onStartElementPointer = null,
  onUpdateElementField = null,
  activeTextField = null,
  onSelectTextField = null,
  onTriggerSlideImageUpload = null,
  showGridGuides = false,
  snapGuides = { xCenter: false, yCenter: false },
  spotlightIdx = null,
  onToggleSpotlight = null
}) => {
  const safeSlide = slide || {};
  const layout = resolveSlideLayout(safeSlide, slideIdx);
  const theme = resolveTheme(presentation, safeSlide, appThemeMode);
  const patternStyle = getSlidePatternStyle(safeSlide.bgPattern || presentation?.bgPattern || 'none', theme.isDark);
  const isInteractiveEditor = mode === 'editor' && typeof onUpdateSlideField === 'function';
  const isCompact = mode === 'thumbnail' || mode === 'card';
  const applySlidePatch = (patchObj) => {
    if (typeof onPatchSlide === 'function') {
      onPatchSlide(patchObj);
    } else if (typeof onUpdateSlideField === 'function' && patchObj && typeof patchObj === 'object') {
      Object.entries(patchObj).forEach(([k, v]) => onUpdateSlideField(k, v));
    }
  };

  const titleAlign = safeSlide.textStyles?.title?.align || safeSlide.titleAlign || (layout === 'title' || layout === 'section' || layout === 'quote' ? 'center' : 'left');
  const alignClass = titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : titleAlign === 'justify' ? 'text-justify' : 'text-left';

  const titleSizeMap = {
    sm: isCompact ? 'text-xs' : 'text-xl sm:text-2xl',
    md: isCompact ? 'text-sm' : 'text-2xl sm:text-3xl',
    lg: isCompact ? 'text-sm' : 'text-2xl sm:text-3xl md:text-4xl',
    xl: isCompact ? 'text-base' : 'text-3xl sm:text-4xl md:text-5xl'
  };
  const titleSizeClass = titleSizeMap[safeSlide.titleSize || (layout === 'title' ? 'xl' : 'lg')] || titleSizeMap.lg;

  const layoutLabelMap = {
    title: 'Portada',
    section: 'Sección',
    title_body: 'Contenido',
    two_columns: 'Comparación',
    cards: 'Conceptos',
    bullets: 'Puntos Clave',
    image_text: 'Visual',
    table: 'Tabla',
    quote: 'Idea Clave',
    quiz: 'Quiz Interactivo',
    blank: 'Lienzo'
  };

  const fStyle = (fieldKey, baseStyle = {}) => buildInlineTextStyle(safeSlide, fieldKey, baseStyle, mode);
  const fRing = (fieldKey) => (
    isInteractiveEditor && !selectedElementId && activeTextField === fieldKey
      ? 'ring-2 ring-sky-500/80 bg-sky-500/5 rounded-lg'
      : ''
  );
  const isDefaultFieldPlaceholder = (val) => {
    const str = String(val || '').trim();
    if (!str) return false;
    if (
      str === 'Nueva Presentación' ||
      str === 'Título de la Presentación' ||
      str === 'Subtítulo de la presentación' ||
      str === 'Conceptos Principales' ||
      str === 'Puntos Clave de la Lección' ||
      str === 'Explicación Detallada del Tema' ||
      str === 'Cuadro Comparativo' ||
      str === 'Tabla de Referencia y Ejemplos' ||
      str === 'Análisis Visual y Contexto' ||
      str === 'Concepto Central para Recordar' ||
      str === 'Pregunta de Comprobación' ||
      str === 'Nombre de la Sección o Módulo' ||
      str === 'Lienzo Libre' ||
      str.startsWith('Haz clic sobre cualquier texto') ||
      str.startsWith('Haz clic para añadir') ||
      str.startsWith('Explicación clara del') ||
      str.startsWith('Descripción clara del concepto') ||
      str.startsWith('Explicación breve del punto') ||
      str.startsWith('Ejemplo práctico') ||
      /^Concepto \d+$/i.test(str) ||
      /^Punto (\d+|clave|\w\d+)$/i.test(str) ||
      /^Término \d+$/i.test(str) ||
      /^Item \d+$/i.test(str) ||
      /^Nuevo dato$/i.test(str) ||
      /^Opción [A-F](\s*\(.*\))?$/i.test(str)
    ) {
      return true;
    }
    return false;
  };

  const bindField = (fieldKey) => (
    isInteractiveEditor
      ? {
          'data-field-key': fieldKey,
          onPointerDown: () => {
            onSelectElement?.(null);
            onSelectTextField?.(fieldKey);
          },
          onFocus: (e) => {
            onSelectElement?.(null);
            onSelectTextField?.(fieldKey);
            const target = e?.currentTarget;
            if (target && isDefaultFieldPlaceholder(target.value) && typeof target.select === 'function') {
              requestAnimationFrame(() => {
                try { target.select(); } catch {}
              });
            }
          },
          onClick: (e) => {
            e.stopPropagation();
            onSelectElement?.(null);
            onSelectTextField?.(fieldKey);
          }
        }
      : {}
  );

  return (
    <div
      onPointerDown={(e) => {
        if (isInteractiveEditor && onSelectElement && !e.target?.closest?.('[data-canvas-element]')) {
          onSelectElement(null);
        }
      }}
      style={{
        backgroundColor: theme.bg,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
        ...patternStyle
      }}
      className={`w-full aspect-video relative overflow-hidden flex flex-col justify-between select-none transition-colors duration-200 ${
        isCompact ? 'p-3 rounded-xl' : 'p-5 sm:p-9 md:p-11 rounded-2xl'
      }`}
    >
      {/* Imagen de fondo opcional */}
      {safeSlide.bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${safeSlide.bgImage})`,
            opacity: safeSlide.bgOverlayOpacity ?? 0.22
          }}
        />
      )}

      {/* Barra decorativa superior de acento */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}
      />

      {/* Guías de cuadrícula y centrado en el Editor */}
      {isInteractiveEditor && showGridGuides && (
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-25"
          style={{
            backgroundImage: `linear-gradient(${theme.primary} 1px, transparent 1px), linear-gradient(90deg, ${theme.primary} 1px, transparent 1px)`,
            backgroundSize: '10% 10%'
          }}
        />
      )}
      {isInteractiveEditor && snapGuides?.xCenter && (
        <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-sky-400 pointer-events-none z-30" />
      )}
      {isInteractiveEditor && snapGuides?.yCenter && (
        <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-sky-400 pointer-events-none z-30" />
      )}

      {/* Encabezado superior de la diapositiva (salvo en Lienzo libre oculto o miniatura) */}
      {!isCompact && !(layout === 'blank' && safeSlide.hideHeader) && (
        <div className="flex items-center justify-between gap-2 z-10 shrink-0">
          {isInteractiveEditor ? (
            <div
              style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
              className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-black inline-flex items-center gap-1.5 ${fRing('badge')}`}
            >
              <Sparkles size={11} className="shrink-0" />
              <input
                type="text"
                value={safeSlide.badge || ''}
                onChange={(e) => onUpdateSlideField('badge', e.target.value)}
                placeholder={layoutLabelMap[layout] || 'Etiqueta'}
                style={fStyle('badge', { color: theme.badgeText })}
                {...bindField('badge')}
                className="bg-transparent outline-none uppercase tracking-wider w-28 sm:w-36 placeholder:opacity-60"
              />
            </div>
          ) : (
            <span
              style={fStyle('badge', { backgroundColor: theme.badgeBg, color: theme.badgeText })}
              className="px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-black inline-flex items-center gap-1.5"
            >
              <Sparkles size={11} />
              <span>{safeSlide.badge || layoutLabelMap[layout] || 'Diapositiva'}</span>
            </span>
          )}
          <span style={{ color: theme.textSecondary }} className="font-mono text-xs font-extrabold">
            {slideIdx + 1} / {Math.max(1, totalSlides)}
          </span>
        </div>
      )}

      {/* Cuerpo Estructurado según el Diseño (Layout) */}
      <div className={`my-auto w-full z-10 ${isCompact ? 'overflow-hidden' : 'overflow-y-auto py-1 max-h-full'}`}>
        {layout === 'title' ? (
          <div className={`space-y-3 sm:space-y-5 max-w-4xl mx-auto py-2 ${alignClass}`}>
            {isCompact && (
              <div className="flex flex-wrap items-center justify-center gap-1 mb-1">
                {presentation?.language && (
                  <span
                    style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                  >
                    {presentation.language}
                  </span>
                )}
                {presentation?.targetGroupName && presentation.targetGroupName !== 'General' && (
                  <span className="text-[9px] font-bold bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded-md">
                    {presentation.targetGroupName}
                  </span>
                )}
              </div>
            )}

            {isInteractiveEditor ? (
              <>
                <input
                  type="text"
                  value={safeSlide.title || ''}
                  onChange={(e) => onUpdateSlideField('title', e.target.value)}
                  placeholder="Título principal de la presentación..."
                  style={fStyle('title', { color: theme.textPrimary })}
                  {...bindField('title')}
                  className={`w-full bg-transparent font-black leading-tight tracking-tight outline-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
                />
                <textarea
                  value={safeSlide.subtitle !== undefined ? safeSlide.subtitle : (safeSlide.description || '')}
                  onChange={(e) => onUpdateSlideField('subtitle', e.target.value)}
                  rows={2}
                  placeholder="Haz clic para escribir un subtítulo u objetivo de la clase..."
                  style={fStyle('subtitle', { color: theme.textSecondary })}
                  {...bindField('subtitle')}
                  className={`w-full bg-transparent text-base sm:text-xl font-medium leading-relaxed outline-none resize-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${alignClass} ${fRing('subtitle')}`}
                />
                {safeSlide.subtitle && safeSlide.description && safeSlide.description !== safeSlide.subtitle && (
                  <textarea
                    value={safeSlide.description}
                    onChange={(e) => onUpdateSlideField('description', e.target.value)}
                    rows={2}
                    placeholder="Descripción adicional de portada..."
                    style={fStyle('description', { color: theme.textSecondary })}
                    {...bindField('description')}
                    className={`w-full bg-transparent text-xs sm:text-base font-medium leading-relaxed outline-none resize-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 opacity-90 ${alignClass} ${fRing('description')}`}
                  />
                )}
              </>
            ) : (
              <>
                <h1
                  style={fStyle('title', { color: theme.textPrimary })}
                  className={`font-black leading-tight tracking-tight ${isCompact ? 'text-sm sm:text-base line-clamp-2' : titleSizeClass}`}
                >
                  {safeSlide.title || presentation?.topic || 'Presentación'}
                </h1>
                {(safeSlide.subtitle || safeSlide.description) && (
                  <p
                    style={fStyle('subtitle', { color: theme.textSecondary })}
                    className={isCompact ? 'text-[11px] line-clamp-1 font-medium' : 'text-base sm:text-xl md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto'}
                  >
                    {safeSlide.subtitle || safeSlide.description}
                  </p>
                )}
                {!isCompact && safeSlide.subtitle && safeSlide.description && safeSlide.description !== safeSlide.subtitle && (
                  <p
                    style={fStyle('description', { color: theme.textSecondary })}
                    className="text-xs sm:text-base font-medium leading-relaxed max-w-2xl mx-auto opacity-85"
                  >
                    {safeSlide.description}
                  </p>
                )}
              </>
            )}
          </div>
        ) : layout === 'section' ? (
          <div
            style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
            className={`max-w-4xl mx-auto border rounded-3xl ${isCompact ? 'p-3' : 'p-6 sm:p-10'} shadow-sm ${alignClass} space-y-3`}
          >
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.badge || ''}
                onChange={(e) => onUpdateSlideField('badge', e.target.value)}
                placeholder={`Sección ${slideIdx + 1}`}
                style={fStyle('badge', { color: theme.primary })}
                {...bindField('badge')}
                className={`w-full bg-transparent text-xs font-black uppercase tracking-widest outline-none ${alignClass} ${fRing('badge')}`}
              />
            ) : (
              <div
                style={fStyle('badge', { color: theme.primary })}
                className="text-xs font-black uppercase tracking-widest"
              >
                {safeSlide.badge || `Sección ${slideIdx + 1}`}
              </div>
            )}
            {isInteractiveEditor ? (
              <>
                <input
                  type="text"
                  value={safeSlide.title || ''}
                  onChange={(e) => onUpdateSlideField('title', e.target.value)}
                  placeholder="Título de la sección..."
                  style={fStyle('title', { color: theme.textPrimary })}
                  {...bindField('title')}
                  className={`w-full bg-transparent font-black outline-none rounded-lg px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
                />
                <textarea
                  value={safeSlide.subtitle || ''}
                  onChange={(e) => onUpdateSlideField('subtitle', e.target.value)}
                  rows={2}
                  placeholder="Descripción breve de la sección..."
                  style={fStyle('subtitle', { color: theme.textSecondary })}
                  {...bindField('subtitle')}
                  className={`w-full bg-transparent text-sm sm:text-lg font-medium outline-none resize-none rounded-lg px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${alignClass} ${fRing('subtitle')}`}
                />
              </>
            ) : (
              <>
                <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass}`}>
                  {safeSlide.title || 'Sección'}
                </h2>
                {safeSlide.subtitle && (
                  <p style={fStyle('subtitle', { color: theme.textSecondary })} className={isCompact ? 'text-[10px] line-clamp-1' : 'text-base sm:text-lg font-medium'}>
                    {safeSlide.subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        ) : layout === 'title_body' ? (
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título de la diapositiva..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Contenido Principal'}
              </h2>
            )}

            <div
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className={`rounded-2xl border shadow-2xs ${isCompact ? 'p-2.5' : 'p-5 sm:p-7'}`}
            >
              {isInteractiveEditor ? (
                <textarea
                  value={safeSlide.body !== undefined ? safeSlide.body : (safeSlide.content || safeSlide.subtitle || '')}
                  onChange={(e) => onUpdateSlideField('body', e.target.value)}
                  rows={5}
                  placeholder="Escribe aquí el desarrollo o explicación de la diapositiva..."
                  style={fStyle('body', { color: theme.textPrimary })}
                  {...bindField('body')}
                  className={`w-full bg-transparent text-sm sm:text-lg leading-relaxed font-medium outline-none resize-none ${fRing('body')}`}
                />
              ) : (
                <p
                  style={fStyle('body', { color: theme.textPrimary })}
                  className={`${isCompact ? 'text-[10px] line-clamp-3' : 'text-sm sm:text-lg leading-relaxed whitespace-pre-line font-medium'}`}
                >
                  {safeSlide.body || safeSlide.content || safeSlide.subtitle || ''}
                </p>
              )}
            </div>

            {(safeSlide.callout || isInteractiveEditor) && !isCompact && (
              <div
                style={{ backgroundColor: theme.badgeBg, borderColor: theme.primary, color: theme.textPrimary }}
                className={`p-3.5 rounded-xl border-l-4 flex items-center gap-2.5 text-xs sm:text-sm font-semibold ${fRing('callout')}`}
              >
                <Lightbulb size={16} style={{ color: theme.primary }} className="shrink-0" />
                {isInteractiveEditor ? (
                  <input
                    type="text"
                    value={safeSlide.callout || ''}
                    onChange={(e) => onUpdateSlideField('callout', e.target.value)}
                    placeholder="Nota destacada o conclusión clave (opcional)..."
                    style={fStyle('callout', { color: theme.textPrimary })}
                    {...bindField('callout')}
                    className="w-full bg-transparent outline-none"
                  />
                ) : (
                  <span style={fStyle('callout', { color: theme.textPrimary })}>{safeSlide.callout}</span>
                )}
              </div>
            )}
          </div>
        ) : layout === 'two_columns' ? (
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título comparativo..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Comparación'}
              </h2>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {['leftColumn', 'rightColumn'].map((colKey, cIdx) => {
                const col = safeSlide[colKey] || {
                  badge: cIdx === 0 ? 'Columna A' : 'Columna B',
                  title: cIdx === 0 ? 'Primer Bloque' : 'Segundo Bloque',
                  text: '',
                  items: []
                };
                const accent = cIdx === 0 ? theme.primary : theme.secondary;
                const rawItems = Array.isArray(col.items) ? col.items : [];
                const nonEmptyItems = rawItems.filter(it => String(it || '').trim() !== '');
                return (
                  <div
                    key={colKey}
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                    className={`rounded-2xl border flex flex-col justify-between ${isCompact ? 'p-2' : 'p-4 sm:p-5'} shadow-2xs`}
                  >
                    <div className="space-y-2">
                      {isInteractiveEditor ? (
                        <input
                          type="text"
                          value={col.badge || ''}
                          onChange={(e) => onUpdateSlideField(colKey, { ...col, badge: e.target.value })}
                          placeholder={cIdx === 0 ? 'Bloque A' : 'Bloque B'}
                          style={fStyle(`${colKey}.badge`, { color: accent, backgroundColor: theme.badgeBg })}
                          {...bindField(`${colKey}.badge`)}
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md outline-none w-36 ${fRing(`${colKey}.badge`)}`}
                        />
                      ) : (
                        <span
                          style={fStyle(`${colKey}.badge`, { color: accent, backgroundColor: theme.badgeBg })}
                          className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                        >
                          {col.badge || (cIdx === 0 ? 'Bloque A' : 'Bloque B')}
                        </span>
                      )}

                      {isInteractiveEditor ? (
                        <>
                          <input
                            type="text"
                            value={col.title || ''}
                            onChange={(e) => onUpdateSlideField(colKey, { ...col, title: e.target.value })}
                            placeholder="Subtítulo de columna..."
                            style={fStyle(`${colKey}.title`, { color: theme.textPrimary })}
                            {...bindField(`${colKey}.title`)}
                            className={`w-full bg-transparent text-sm sm:text-lg font-extrabold outline-none border-b border-transparent focus:border-current/30 pb-0.5 ${fRing(`${colKey}.title`)}`}
                          />
                          <textarea
                            value={col.text || ''}
                            onChange={(e) => onUpdateSlideField(colKey, { ...col, text: e.target.value })}
                            rows={2}
                            placeholder="Descripción de esta columna..."
                            style={fStyle(`${colKey}.text`, { color: theme.textSecondary })}
                            {...bindField(`${colKey}.text`)}
                            className={`w-full bg-transparent text-xs sm:text-sm leading-relaxed outline-none resize-none ${fRing(`${colKey}.text`)}`}
                          />
                        </>
                      ) : (
                        <>
                          <h4
                            style={fStyle(`${colKey}.title`, { color: theme.textPrimary })}
                            className={`font-extrabold leading-tight ${isCompact ? 'text-[11px] line-clamp-1' : 'text-base sm:text-xl'}`}
                          >
                            {col.title}
                          </h4>
                          {col.text && (
                            <p
                              style={fStyle(`${colKey}.text`, { color: theme.textSecondary })}
                              className={isCompact ? 'text-[9px] line-clamp-2' : 'text-xs sm:text-sm leading-relaxed'}
                            >
                              {col.text}
                            </p>
                          )}
                        </>
                      )}

                      {!isCompact && isInteractiveEditor ? (
                        <div className="space-y-1.5 pt-1">
                          {rawItems.map((item, iIdx) => (
                            <div key={iIdx} className="group/colitem flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                              <span style={{ backgroundColor: accent }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                              <input
                                type="text"
                                value={item || ''}
                                onChange={(e) => {
                                  const nextItems = [...rawItems];
                                  nextItems[iIdx] = e.target.value;
                                  onUpdateSlideField(colKey, { ...col, items: nextItems });
                                }}
                                placeholder={`Punto ${iIdx + 1}...`}
                                style={fStyle(`${colKey}.items.${iIdx}`, { color: theme.textPrimary })}
                                {...bindField(`${colKey}.items.${iIdx}`)}
                                className={`flex-1 bg-transparent outline-none px-1 py-0.5 rounded ${fRing(`${colKey}.items.${iIdx}`)}`}
                              />
                              {rawItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, `${colKey}.items`, iIdx);
                                    applySlidePatch({
                                      [colKey]: { ...col, items: rawItems.filter((_, idx) => idx !== iIdx) },
                                      textStyles: nextTextStyles
                                    });
                                  }}
                                  className="opacity-0 group-hover/colitem:opacity-100 p-0.5 rounded text-red-400 hover:text-red-500 transition-opacity"
                                  title="Quitar viñeta"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateSlideField(colKey, { ...col, items: [...rawItems, `Punto ${rawItems.length + 1}`] });
                            }}
                            style={{ color: accent }}
                            className="text-[10px] font-bold hover:underline inline-flex items-center gap-1 pt-0.5"
                          >
                            <Plus size={10} /> Añadir viñeta
                          </button>
                        </div>
                      ) : (
                        !isCompact && nonEmptyItems.length > 0 && (
                          <ul className="space-y-1.5 pt-1">
                            {nonEmptyItems.map((item, iIdx) => (
                              <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm font-medium">
                                <span style={{ backgroundColor: accent }} className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
                                <span style={fStyle(`${colKey}.items.${iIdx}`, { color: theme.textPrimary })} className="flex-1">
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : layout === 'table' ? (
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título de la tabla..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Tabla Comparativa'}
              </h2>
            )}

            {(() => {
              const tableHeaders = Array.isArray(safeSlide.table?.headers) && safeSlide.table.headers.length > 0
                ? safeSlide.table.headers
                : ['Concepto', 'Explicación', 'Ejemplo'];
              const extractedRows = getTableRows(safeSlide.table);
              const tableRows = extractedRows.length > 0
                ? extractedRows
                : [['Dato 1', 'Explicación 1', 'Ejemplo 1']];

              return (
                <div className="space-y-2">
                  <div
                    style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBg }}
                    className="rounded-2xl border overflow-hidden shadow-2xs"
                  >
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                          {tableHeaders.map((hdr, hIdx) => (
                            <th key={hIdx} className={`group/th relative ${isCompact ? 'p-1 text-[9px]' : 'p-3 sm:p-3.5 text-xs sm:text-sm'} font-black border-r last:border-r-0 border-white/15`}>
                              {isInteractiveEditor ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={hdr || ''}
                                    onChange={(e) => {
                                      const nextHeaders = [...tableHeaders];
                                      nextHeaders[hIdx] = e.target.value;
                                      onUpdateSlideField('table', { headers: nextHeaders, rows: tableRows });
                                    }}
                                    style={fStyle(`table.header.${hIdx}`, { color: '#FFFFFF' })}
                                    {...bindField(`table.header.${hIdx}`)}
                                    className={`w-full bg-transparent text-white placeholder-white/60 font-black outline-none px-1 rounded ${fRing(`table.header.${hIdx}`)}`}
                                  />
                                  {tableHeaders.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextHeaders = tableHeaders.filter((_, idx) => idx !== hIdx);
                                        const nextRows = tableRows.map(r => (Array.isArray(r) ? r.filter((_, idx) => idx !== hIdx) : []));
                                        const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, 'table.col', hIdx);
                                        applySlidePatch({
                                          table: { headers: nextHeaders, rows: nextRows },
                                          textStyles: nextTextStyles
                                        });
                                      }}
                                      className="opacity-0 group-hover/th:opacity-100 p-0.5 rounded bg-black/25 hover:bg-black/45 text-white/90 shrink-0 transition-opacity"
                                      title="Eliminar columna"
                                    >
                                      <X size={11} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span style={fStyle(`table.header.${hIdx}`, { color: '#FFFFFF' })} className="block">
                                  {hdr}
                                </span>
                              )}
                            </th>
                          ))}
                          {isInteractiveEditor && !isCompact && (
                            <th className="w-8 p-1 text-center border-l border-white/15">
                              <span className="sr-only">Acciones</span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(isCompact ? tableRows.slice(0, 2) : tableRows).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{ borderColor: theme.cardBorder }}
                            className="group/tr border-t transition-colors"
                          >
                            {tableHeaders.map((_, cIdx) => {
                              const cellVal = Array.isArray(row) ? (row[cIdx] || '') : '';
                              const cellKey = `table.cell.${rIdx}.${cIdx}`;
                              return (
                                <td
                                  key={cIdx}
                                  style={{ borderColor: theme.cardBorder, color: cIdx === 0 ? theme.textPrimary : theme.textSecondary }}
                                  className={`${isCompact ? 'p-1 text-[9px] truncate max-w-[60px]' : 'p-2.5 sm:p-3.5 text-xs sm:text-sm'} border-r last:border-r-0 ${cIdx === 0 ? 'font-bold' : 'font-medium'}`}
                                >
                                  {isInteractiveEditor ? (
                                    <input
                                      type="text"
                                      value={cellVal}
                                      onChange={(e) => {
                                        const nextRows = tableRows.map((r, ri) => {
                                          if (ri !== rIdx) return r;
                                          const copyRow = Array.isArray(r) ? [...r] : [];
                                          copyRow[cIdx] = e.target.value;
                                          return copyRow;
                                        });
                                        onUpdateSlideField('table', { headers: tableHeaders, rows: nextRows });
                                      }}
                                      style={fStyle(cellKey, { color: cIdx === 0 ? theme.textPrimary : theme.textSecondary })}
                                      {...bindField(cellKey)}
                                      className={`w-full bg-transparent outline-none px-1 rounded ${fRing(cellKey)}`}
                                    />
                                  ) : (
                                    <span style={fStyle(cellKey, { color: cIdx === 0 ? theme.textPrimary : theme.textSecondary })} className="block">
                                      {cellVal}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            {isInteractiveEditor && !isCompact && (
                              <td style={{ borderColor: theme.cardBorder }} className="w-8 p-1 text-center border-l">
                                {tableRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, 'table.row', rIdx);
                                      applySlidePatch({
                                        table: {
                                          headers: tableHeaders,
                                          rows: tableRows.filter((_, idx) => idx !== rIdx)
                                        },
                                        textStyles: nextTextStyles
                                      });
                                    }}
                                    className="opacity-0 group-hover/tr:opacity-100 p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-opacity"
                                    title="Eliminar fila"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isInteractiveEditor && !isCompact && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const emptyRow = tableHeaders.map((_, i) => i === 0 ? `Item ${tableRows.length + 1}` : '');
                          onUpdateSlideField('table', { headers: tableHeaders, rows: [...tableRows, emptyRow] });
                        }}
                        style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-90 inline-flex items-center gap-1 transition-opacity"
                      >
                        <Plus size={12} /> Añadir fila
                      </button>
                      {tableHeaders.length < 5 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextHeaders = [...tableHeaders, `Columna ${tableHeaders.length + 1}`];
                            const nextRows = tableRows.map(r => [...(Array.isArray(r) ? r : []), '']);
                            onUpdateSlideField('table', { headers: nextHeaders, rows: nextRows });
                          }}
                          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder, color: theme.textSecondary }}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:opacity-90 inline-flex items-center gap-1 transition-opacity"
                        >
                          <Plus size={12} /> Añadir columna
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : layout === 'image_text' ? (
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Contexto Visual'}
              </h2>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className={`sm:col-span-7 rounded-2xl border ${isCompact ? 'p-2' : 'p-5'} flex flex-col justify-between ${safeSlide.imagePosition === 'left' ? 'sm:order-2' : 'sm:order-1'}`}
              >
                {isInteractiveEditor ? (
                  <textarea
                    value={safeSlide.body !== undefined ? safeSlide.body : (safeSlide.content || safeSlide.subtitle || '')}
                    onChange={(e) => onUpdateSlideField('body', e.target.value)}
                    rows={4}
                    placeholder="Explicación que acompaña la imagen..."
                    style={fStyle('body', { color: theme.textPrimary })}
                    {...bindField('body')}
                    className={`w-full bg-transparent text-xs sm:text-base leading-relaxed font-medium outline-none resize-none ${fRing('body')}`}
                  />
                ) : (
                  <p
                    style={fStyle('body', { color: theme.textPrimary })}
                    className={isCompact ? 'text-[9px] line-clamp-3' : 'text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium'}
                  >
                    {safeSlide.body || safeSlide.content || safeSlide.subtitle || ''}
                  </p>
                )}

                {(safeSlide.callout || isInteractiveEditor) && !isCompact && (
                  <div
                    style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                    className={`mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${fRing('callout')}`}
                  >
                    <Pin size={13} className="shrink-0" />
                    {isInteractiveEditor ? (
                      <input
                        type="text"
                        value={safeSlide.callout || ''}
                        onChange={(e) => onUpdateSlideField('callout', e.target.value)}
                        placeholder="Nota destacada opcional..."
                        style={fStyle('callout', { color: theme.primary })}
                        {...bindField('callout')}
                        className="w-full bg-transparent outline-none"
                      />
                    ) : (
                      <span style={fStyle('callout', { color: theme.primary })}>{safeSlide.callout}</span>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className={`sm:col-span-5 rounded-2xl border overflow-hidden flex flex-col justify-between ${isCompact ? 'p-1.5' : 'p-3'} ${safeSlide.imagePosition === 'left' ? 'sm:order-1' : 'sm:order-2'}`}
              >
                <div className="w-full aspect-video sm:aspect-auto sm:flex-1 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center min-h-[100px] relative group/img">
                  {safeSlide.imageUrl ? (
                    <>
                      <img
                        src={safeSlide.imageUrl}
                        alt={safeSlide.imageCaption || safeSlide.title || 'Slide visual'}
                        className="w-full h-full object-cover"
                      />
                      {isInteractiveEditor && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateSlideField('imagePosition', safeSlide.imagePosition === 'left' ? 'right' : 'left');
                            }}
                            className="px-2 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold"
                            title="Alternar posición de imagen (Izquierda / Derecha)"
                          >
                            ⇄ {safeSlide.imagePosition === 'left' ? 'Izquierda' : 'Derecha'}
                          </button>
                          {onTriggerSlideImageUpload && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTriggerSlideImageUpload();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold flex items-center gap-1"
                            >
                              <Upload size={11} />
                              <span>Cambiar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : isInteractiveEditor && onTriggerSlideImageUpload ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerSlideImageUpload();
                        }}
                        className="flex flex-col items-center justify-center gap-1.5 text-xs font-bold opacity-75 hover:opacity-100 transition-opacity"
                      >
                        <Upload size={24} style={{ color: theme.primary }} />
                        <span>Subir o pegar imagen</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSlideField('imagePosition', safeSlide.imagePosition === 'left' ? 'right' : 'left');
                        }}
                        style={{ color: theme.textSecondary }}
                        className="text-[10px] font-bold hover:underline"
                      >
                        ⇄ Imagen a la {safeSlide.imagePosition === 'left' ? 'derecha' : 'izquierda'}
                      </button>
                    </div>
                  ) : (
                    <ImageIcon size={28} className="opacity-30" />
                  )}
                </div>
                {(safeSlide.imageCaption || isInteractiveEditor) && !isCompact && (
                  isInteractiveEditor ? (
                    <input
                      type="text"
                      value={safeSlide.imageCaption || ''}
                      onChange={(e) => onUpdateSlideField('imageCaption', e.target.value)}
                      placeholder="Escribe un pie de imagen..."
                      style={fStyle('imageCaption', { color: theme.textSecondary })}
                      {...bindField('imageCaption')}
                      className={`w-full bg-transparent text-[11px] text-center italic pt-2 outline-none ${fRing('imageCaption')}`}
                    />
                  ) : (
                    <p style={fStyle('imageCaption', { color: theme.textSecondary })} className="text-[11px] text-center italic pt-2 truncate">
                      {safeSlide.imageCaption}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        ) : layout === 'quote' ? (
          <div className="space-y-3 max-w-4xl mx-auto w-full">
            {!isCompact && (isInteractiveEditor || (safeSlide.title && safeSlide.title !== safeSlide.quoteAuthor)) && (
              isInteractiveEditor ? (
                <input
                  type="text"
                  value={safeSlide.title || ''}
                  onChange={(e) => onUpdateSlideField('title', e.target.value)}
                  placeholder="Título o contexto de la cita..."
                  style={fStyle('title', { color: theme.textPrimary })}
                  {...bindField('title')}
                  className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-2 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 text-lg sm:text-2xl ${alignClass} ${fRing('title')}`}
                />
              ) : (
                <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight text-lg sm:text-2xl ${alignClass}`}>
                  {safeSlide.title}
                </h2>
              )
            )}
            <div
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className={`rounded-3xl border shadow-xs ${isCompact ? 'p-3' : 'p-6 sm:p-9'} text-center space-y-3`}
            >
              {(safeSlide.statValue || isInteractiveEditor) && !isCompact && (
                <div>
                  {isInteractiveEditor ? (
                    <input
                      type="text"
                      value={safeSlide.statValue || ''}
                      onChange={(e) => onUpdateSlideField('statValue', e.target.value)}
                      placeholder="Cifra o dato opcional (ej: +85% o Regla #1)"
                      style={fStyle('statValue', { color: theme.primary })}
                      {...bindField('statValue')}
                      className={`w-full bg-transparent text-center text-2xl sm:text-4xl font-black outline-none ${fRing('statValue')}`}
                    />
                  ) : (
                    <div style={fStyle('statValue', { color: theme.primary })} className="text-3xl sm:text-5xl font-black tracking-tight">
                      {safeSlide.statValue}
                    </div>
                  )}
                </div>
              )}

              {isInteractiveEditor ? (
                <>
                  <textarea
                    value={safeSlide.quoteText !== undefined ? safeSlide.quoteText : (safeSlide.body || safeSlide.title || '')}
                    onChange={(e) => onUpdateSlideField('quoteText', e.target.value)}
                    rows={3}
                    placeholder="Escribe aquí la cita, idea fuerza o principio clave..."
                    style={fStyle('quoteText', { color: theme.textPrimary })}
                    {...bindField('quoteText')}
                    className={`w-full bg-transparent text-center text-lg sm:text-2xl font-extrabold italic leading-relaxed outline-none resize-none ${fRing('quoteText')}`}
                  />
                  <input
                    type="text"
                    value={safeSlide.quoteAuthor || ''}
                    onChange={(e) => onUpdateSlideField('quoteAuthor', e.target.value)}
                    placeholder="Autor, fuente o contexto..."
                    style={fStyle('quoteAuthor', { color: theme.textSecondary })}
                    {...bindField('quoteAuthor')}
                    className={`w-full bg-transparent text-center text-xs sm:text-sm font-bold outline-none ${fRing('quoteAuthor')}`}
                  />
                </>
              ) : (
                <>
                  <blockquote
                    style={fStyle('quoteText', { color: theme.textPrimary })}
                    className={isCompact ? 'text-xs font-bold italic line-clamp-2' : 'text-xl sm:text-3xl font-extrabold italic leading-snug'}
                  >
                    “{safeSlide.quoteText || safeSlide.body || safeSlide.title}”
                  </blockquote>
                  {(safeSlide.quoteAuthor || safeSlide.title) && (
                    <p style={fStyle('quoteAuthor', { color: theme.textSecondary })} className={isCompact ? 'text-[9px] font-bold' : 'text-xs sm:text-base font-bold'}>
                      — {safeSlide.quoteAuthor || safeSlide.title}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : layout === 'quiz' ? (
          <div className="space-y-3.5 max-w-4xl mx-auto w-full py-1">
            <div className="space-y-1">
              {!isCompact && (isInteractiveEditor || (safeSlide.title && safeSlide.title !== safeSlide.question)) && (
                isInteractiveEditor ? (
                  <input
                    type="text"
                    value={safeSlide.title || ''}
                    onChange={(e) => onUpdateSlideField('title', e.target.value)}
                    placeholder="Título del Quiz..."
                    style={fStyle('title', { color: theme.primary })}
                    {...bindField('title')}
                    className={`w-full bg-transparent text-xs sm:text-sm font-black uppercase tracking-wider outline-none rounded px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${alignClass} ${fRing('title')}`}
                  />
                ) : (
                  <div style={fStyle('title', { color: theme.primary })} className={`text-xs sm:text-sm font-black uppercase tracking-wider ${alignClass}`}>
                    {safeSlide.title}
                  </div>
                )
              )}
              {isInteractiveEditor ? (
                <input
                  type="text"
                  value={safeSlide.question !== undefined ? safeSlide.question : (safeSlide.title || '')}
                  onChange={(e) => onUpdateSlideField('question', e.target.value)}
                  placeholder="Escribe la pregunta del Quiz..."
                  style={fStyle('question', { color: theme.textPrimary })}
                  {...bindField('question')}
                  className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${fRing('question')}`}
                />
              ) : (
                <h2
                  style={fStyle('question', { color: theme.textPrimary })}
                  className={`font-black tracking-tight ${isCompact ? 'text-xs line-clamp-2' : 'text-xl sm:text-3xl md:text-4xl'}`}
                >
                  {safeSlide.question || safeSlide.title || 'Pregunta de repaso'}
                </h2>
              )}
            </div>

            {(() => {
              const quizOptions = Array.isArray(safeSlide.options) && safeSlide.options.length > 0
                ? safeSlide.options
                : [{ text: safeSlide.answer || 'Respuesta correcta', isCorrect: true, explanation: '¡Correcto!' }];

              return (
                <>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isCompact ? 'gap-1.5' : 'gap-3 pt-1'}`}>
                    {(isCompact ? quizOptions.slice(0, 2) : quizOptions).map((opt, oIdx) => {
                      const sel = quizSelection[slideIdx];
                      let customBorder = isInteractiveEditor && opt.isCorrect ? '#10B981' : theme.cardBorder;
                      let customBg = isInteractiveEditor && opt.isCorrect ? 'rgba(16, 185, 129, 0.08)' : theme.cardBg;
                      const customColor = theme.textPrimary;

                      if (sel !== undefined) {
                        if (opt.isCorrect) {
                          customBg = 'rgba(16, 185, 129, 0.18)';
                          customBorder = '#10B981';
                        } else if (sel === oIdx) {
                          customBg = 'rgba(239, 68, 68, 0.18)';
                          customBorder = '#EF4444';
                        }
                      }

                      const optKey = `options.${oIdx}.text`;
                      const optExKey = `options.${oIdx}.explanation`;

                      return (
                        <div
                          key={oIdx}
                          onClick={() => {
                            if (!isInteractiveEditor && typeof onSelectQuizOption === 'function') {
                              onSelectQuizOption(slideIdx, oIdx);
                            }
                          }}
                          style={{ backgroundColor: customBg, borderColor: customBorder, color: customColor }}
                          className={`group/quizopt relative ${isCompact ? 'p-1.5 rounded-lg text-[9px]' : 'p-3.5 sm:p-4 rounded-2xl text-xs sm:text-base'} border text-left font-semibold flex items-center gap-3 transition-all ${
                            !isInteractiveEditor && onSelectQuizOption ? 'cursor-pointer hover:scale-[1.01]' : ''
                          } ${sel !== undefined && !opt.isCorrect && sel === oIdx ? 'line-through opacity-80' : ''} ${fRing(optKey)}`}
                        >
                          <button
                            type="button"
                            disabled={!isInteractiveEditor}
                            onClick={(e) => {
                              if (!isInteractiveEditor) return;
                              e.stopPropagation();
                              const nextOpts = quizOptions.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                              applySlidePatch({ options: nextOpts, answer: opt.text });
                            }}
                            title={isInteractiveEditor ? (opt.isCorrect ? 'Respuesta correcta (clic en otra letra para cambiar)' : 'Clic para marcar como respuesta correcta') : undefined}
                            style={{
                              backgroundColor: (sel !== undefined && opt.isCorrect) || (isInteractiveEditor && opt.isCorrect) ? '#10B981' : theme.badgeBg,
                              color: (sel !== undefined && opt.isCorrect) || (isInteractiveEditor && opt.isCorrect) ? '#FFFFFF' : theme.primary
                            }}
                            className={`${isCompact ? 'w-4 h-4 text-[8px] rounded' : 'w-7 h-7 text-xs rounded-xl'} flex items-center justify-center font-mono font-black shrink-0 transition-transform ${isInteractiveEditor ? 'cursor-pointer hover:scale-110' : ''}`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </button>
                          {isInteractiveEditor ? (
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={opt.text || ''}
                                  onChange={(e) => {
                                    const nextOpts = quizOptions.map((o, i) => i === oIdx ? { ...o, text: e.target.value } : o);
                                    onUpdateSlideField('options', nextOpts);
                                  }}
                                  style={fStyle(optKey, { color: customColor })}
                                  {...bindField(optKey)}
                                  className="w-full bg-transparent outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextOpts = quizOptions.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                                    applySlidePatch({ options: nextOpts, answer: opt.text });
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 transition-colors ${
                                    opt.isCorrect
                                      ? 'bg-emerald-500 text-white'
                                      : 'opacity-0 group-hover/quizopt:opacity-100 bg-slate-500/15 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-600'
                                  }`}
                                  title="Marcar como respuesta correcta"
                                >
                                  {opt.isCorrect ? '✓ Correcta' : 'Correcta'}
                                </button>
                                {quizOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const filtered = quizOptions.filter((_, idx) => idx !== oIdx);
                                      if (!filtered.some(o => o.isCorrect) && filtered[0]) {
                                        filtered[0] = { ...filtered[0], isCorrect: true };
                                      }
                                      const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, 'options', oIdx);
                                      applySlidePatch({ options: filtered, textStyles: nextTextStyles });
                                    }}
                                    className="opacity-0 group-hover/quizopt:opacity-100 p-0.5 rounded text-red-400 hover:text-red-500 shrink-0 transition-opacity"
                                    title="Eliminar opción"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={opt.explanation || ''}
                                onChange={(e) => {
                                  const nextOpts = quizOptions.map((o, i) => i === oIdx ? { ...o, explanation: e.target.value } : o);
                                  onUpdateSlideField('options', nextOpts);
                                }}
                                placeholder="Explicación al responder (opcional)..."
                                style={fStyle(optExKey, { color: theme.textSecondary })}
                                {...bindField(optExKey)}
                                className={`w-full bg-transparent outline-none text-[11px] font-normal opacity-80 rounded px-0.5 ${fRing(optExKey)}`}
                              />
                            </div>
                          ) : (
                            <span style={fStyle(optKey, { color: customColor })} className="flex-1 leading-snug truncate sm:whitespace-normal">
                              {opt.text}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isInteractiveEditor && !isCompact && quizOptions.length < 6 && (
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSlideField('options', [
                            ...quizOptions,
                            { text: `Opción ${String.fromCharCode(65 + quizOptions.length)}`, isCorrect: false, explanation: '' }
                          ]);
                        }}
                        style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-90 inline-flex items-center gap-1 transition-opacity"
                      >
                        <Plus size={12} /> Añadir opción
                      </button>
                      <span style={{ color: theme.textSecondary }} className="text-[10px] font-medium opacity-75">
                        Haz clic en la letra (A, B, C...) para definir cuál es la correcta
                      </span>
                    </div>
                  )}

                  {!isCompact && quizSelection[slideIdx] !== undefined && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div style={fStyle(`options.${quizSelection[slideIdx]}.explanation`)}>
                          <strong>Explicación:</strong>{' '}
                          {quizOptions[quizSelection[slideIdx]]?.explanation || '¡Revisa los conceptos clave para afianzar el tema!'}
                        </div>
                      </div>
                      {onResetQuizSlide && (
                        <button
                          type="button"
                          onClick={() => onResetQuizSlide(slideIdx)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-bold shrink-0"
                        >
                          Reintentar
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : layout === 'bullets' ? (
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full py-1">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título de puntos clave..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Puntos Clave'}
              </h2>
            )}

            {(() => {
              const bulletsList = Array.isArray(safeSlide.bullets) && safeSlide.bullets.length > 0
                ? safeSlide.bullets
                : (safeSlide.content
                  ? String(safeSlide.content).split('\n').filter(Boolean).map(line => ({ title: line, text: '', example: '' }))
                  : []);

              return (
                <div className={isCompact ? 'space-y-1' : 'space-y-2.5'}>
                  {(isCompact ? bulletsList.slice(0, 2) : bulletsList).map((b, bIdx) => {
                    const isDimmed = spotlightIdx !== null && spotlightIdx !== bIdx;
                    const bTitleKey = `bullets.${bIdx}.title`;
                    const bTextKey = `bullets.${bIdx}.text`;
                    const bExKey = `bullets.${bIdx}.example`;
                    return (
                      <div
                        key={bIdx}
                        onClick={() => {
                          if (mode === 'presenter' && onToggleSpotlight) onToggleSpotlight(bIdx);
                        }}
                        style={{ backgroundColor: theme.cardBg, borderColor: spotlightIdx === bIdx ? theme.primary : theme.cardBorder }}
                        className={`group/bullet relative flex items-start gap-3.5 ${isCompact ? 'p-1.5 rounded-lg' : 'p-3.5 sm:p-4 rounded-2xl'} border transition-all ${
                          mode === 'presenter' ? 'cursor-pointer' : ''
                        } ${isDimmed ? 'opacity-40 scale-[0.99]' : ''}`}
                      >
                        <span
                          style={{ backgroundColor: theme.primary }}
                          className={`${isCompact ? 'w-4 h-4 text-[8px] rounded' : 'w-7 h-7 text-xs rounded-xl'} text-white flex items-center justify-center font-black shrink-0 shadow-2xs`}
                        >
                          {bIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          {isInteractiveEditor ? (
                            <>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={typeof b === 'object' ? (b?.title || '') : String(b || '')}
                                  onChange={(e) => {
                                    const nextBullets = bulletsList.map((item, i) => {
                                      if (i !== bIdx) return item;
                                      return typeof item === 'object' ? { ...item, title: e.target.value } : { title: e.target.value, text: '', example: '' };
                                    });
                                    onUpdateSlideField('bullets', nextBullets);
                                  }}
                                  placeholder="Título del punto..."
                                  style={fStyle(bTitleKey, { color: theme.textPrimary })}
                                  {...bindField(bTitleKey)}
                                  className={`w-full bg-transparent text-sm sm:text-base font-bold outline-none px-1 rounded ${fRing(bTitleKey)}`}
                                />
                                {bulletsList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, 'bullets', bIdx);
                                      applySlidePatch({
                                        bullets: bulletsList.filter((_, idx) => idx !== bIdx),
                                        textStyles: nextTextStyles
                                      });
                                    }}
                                    className="opacity-0 group-hover/bullet:opacity-100 p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 transition-opacity"
                                    title="Eliminar punto"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={typeof b === 'object' ? (b?.text || '') : ''}
                                onChange={(e) => {
                                  const nextBullets = bulletsList.map((item, i) => {
                                    if (i !== bIdx) return item;
                                    return typeof item === 'object' ? { ...item, text: e.target.value } : { title: String(item || ''), text: e.target.value, example: '' };
                                  });
                                  onUpdateSlideField('bullets', nextBullets);
                                }}
                                placeholder="Explicación..."
                                style={fStyle(bTextKey, { color: theme.textSecondary })}
                                {...bindField(bTextKey)}
                                className={`w-full bg-transparent text-xs sm:text-sm outline-none px-1 rounded ${fRing(bTextKey)}`}
                              />
                              <input
                                type="text"
                                value={typeof b === 'object' ? (b?.example || '') : ''}
                                onChange={(e) => {
                                  const nextBullets = bulletsList.map((item, i) => {
                                    if (i !== bIdx) return item;
                                    return typeof item === 'object' ? { ...item, example: e.target.value } : { title: String(item || ''), text: '', example: e.target.value };
                                  });
                                  onUpdateSlideField('bullets', nextBullets);
                                }}
                                placeholder="Ejemplo (opcional)..."
                                style={fStyle(bExKey, { color: theme.badgeText })}
                                {...bindField(bExKey)}
                                className={`w-full bg-transparent text-xs italic outline-none opacity-85 px-1 rounded ${fRing(bExKey)}`}
                              />
                            </>
                          ) : (
                            <>
                              <strong
                                style={fStyle(bTitleKey, { color: theme.textPrimary })}
                                className={`block font-bold ${isCompact ? 'text-[10px] truncate' : 'text-sm sm:text-lg'}`}
                              >
                                {typeof b === 'object' ? b?.title : b}
                              </strong>
                              {!isCompact && b?.text && (
                                <p style={fStyle(bTextKey, { color: theme.textSecondary })} className="text-xs sm:text-base leading-relaxed">
                                  {b.text}
                                </p>
                              )}
                              {!isCompact && b?.example && (
                                <div
                                  style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                                  className="mt-1.5 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5"
                                >
                                  <Pin size={12} className="shrink-0" />
                                  <span style={fStyle(bExKey, { color: theme.badgeText })}>
                                    <strong>Ejemplo:</strong> {b.example}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isInteractiveEditor && !isCompact && bulletsList.length < 6 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSlideField('bullets', [
                          ...bulletsList,
                          { title: `Punto ${bulletsList.length + 1}`, text: 'Descripción del punto clave...', example: '' }
                        ]);
                      }}
                      style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
                    >
                      <Plus size={13} /> Añadir punto clave
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ) : layout === 'blank' ? (
          <div className="h-full w-full flex flex-col justify-start">
            {!safeSlide.hideHeader && (
              isInteractiveEditor ? (
                <input
                  type="text"
                  value={safeSlide.title || ''}
                  onChange={(e) => onUpdateSlideField('title', e.target.value)}
                  placeholder="Título opcional del lienzo..."
                  style={fStyle('title', { color: theme.textPrimary })}
                  {...bindField('title')}
                  className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
                />
              ) : (
                safeSlide.title && (
                  <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                    {safeSlide.title}
                  </h2>
                )
              )
            )}
          </div>
        ) : (
          /* Default: 'cards' */
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full py-1">
            {isInteractiveEditor ? (
              <input
                type="text"
                value={safeSlide.title || ''}
                onChange={(e) => onUpdateSlideField('title', e.target.value)}
                placeholder="Título de la diapositiva..."
                style={fStyle('title', { color: theme.textPrimary })}
                {...bindField('title')}
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass} ${fRing('title')}`}
              />
            ) : (
              <h2 style={fStyle('title', { color: theme.textPrimary })} className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Conceptos Principales'}
              </h2>
            )}

            {(() => {
              const cardsList = safeSlide.cards || (safeSlide.content ? [{ title: safeSlide.title, text: safeSlide.content }] : []);
              const count = cardsList.length;
              const gridCols = isCompact
                ? 'grid-cols-2'
                : count === 1
                  ? 'grid-cols-1'
                  : count === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : count >= 4
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';

              return (
                <div className="space-y-2.5">
                  <div className={`grid ${gridCols} ${isCompact ? 'gap-1.5' : 'gap-3.5'}`}>
                    {(isCompact ? cardsList.slice(0, 2) : cardsList).map((c, cIdx) => {
                      const isDimmed = spotlightIdx !== null && spotlightIdx !== cIdx;
                      const cTitleKey = `cards.${cIdx}.title`;
                      const cTextKey = `cards.${cIdx}.text`;
                      const cExKey = `cards.${cIdx}.example`;
                      return (
                        <div
                          key={cIdx}
                          onClick={() => {
                            if (mode === 'presenter' && onToggleSpotlight) onToggleSpotlight(cIdx);
                          }}
                          style={{
                            backgroundColor: theme.cardBg,
                            borderColor: spotlightIdx === cIdx ? theme.primary : theme.cardBorder
                          }}
                          className={`group/card relative ${isCompact ? 'p-2 rounded-lg' : 'p-4 sm:p-5 rounded-2xl'} border flex flex-col justify-between transition-all shadow-2xs ${
                            mode === 'presenter' ? 'cursor-pointer' : ''
                          } ${isDimmed ? 'opacity-40 scale-[0.98]' : ''}`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block"
                              >
                                Concepto {cIdx + 1}
                              </span>
                              {isInteractiveEditor && cardsList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextTextStyles = shiftFieldTextStylesOnDelete(safeSlide.textStyles, 'cards', cIdx);
                                    applySlidePatch({
                                      cards: cardsList.filter((_, idx) => idx !== cIdx),
                                      textStyles: nextTextStyles
                                    });
                                  }}
                                  className="opacity-0 group-hover/card:opacity-100 p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-opacity"
                                  title="Eliminar tarjeta"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            {isInteractiveEditor ? (
                              <>
                                <input
                                  type="text"
                                  value={c.title || ''}
                                  onChange={(e) => {
                                    const nextCards = cardsList.map((item, i) => i === cIdx ? { ...item, title: e.target.value } : item);
                                    onUpdateSlideField('cards', nextCards);
                                  }}
                                  placeholder="Título del concepto..."
                                  style={fStyle(cTitleKey, { color: theme.textPrimary })}
                                  {...bindField(cTitleKey)}
                                  className={`w-full bg-transparent text-sm sm:text-base font-bold outline-none px-1 rounded ${fRing(cTitleKey)}`}
                                />
                                <textarea
                                  value={c.text || ''}
                                  onChange={(e) => {
                                    const nextCards = cardsList.map((item, i) => i === cIdx ? { ...item, text: e.target.value } : item);
                                    onUpdateSlideField('cards', nextCards);
                                  }}
                                  rows={3}
                                  placeholder="Explicación del concepto..."
                                  style={fStyle(cTextKey, { color: theme.textSecondary })}
                                  {...bindField(cTextKey)}
                                  className={`w-full bg-transparent text-xs sm:text-sm leading-relaxed outline-none resize-none px-1 rounded ${fRing(cTextKey)}`}
                                />
                              </>
                            ) : (
                              <>
                                <h4
                                  style={fStyle(cTitleKey, { color: theme.textPrimary })}
                                  className={`font-bold leading-tight ${isCompact ? 'text-[10px] truncate' : 'text-base sm:text-lg'}`}
                                >
                                  {c.title || 'Concepto'}
                                </h4>
                                <p
                                  style={fStyle(cTextKey, { color: theme.textSecondary })}
                                  className={isCompact ? 'text-[8px] line-clamp-2' : 'text-xs sm:text-sm leading-relaxed'}
                                >
                                  {c.text}
                                </p>
                              </>
                            )}
                          </div>

                          {!isCompact && (c.example || isInteractiveEditor) && (
                            <div
                              style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                              className={`mt-3 text-xs p-2 rounded-xl font-medium flex items-center gap-1.5 ${fRing(cExKey)}`}
                            >
                              <Lightbulb size={12} className="shrink-0" />
                              {isInteractiveEditor ? (
                                <input
                                  type="text"
                                  value={c.example || ''}
                                  onChange={(e) => {
                                    const nextCards = cardsList.map((item, i) => i === cIdx ? { ...item, example: e.target.value } : item);
                                    onUpdateSlideField('cards', nextCards);
                                  }}
                                  placeholder="Ejemplo práctico (opcional)..."
                                  style={fStyle(cExKey, { color: theme.badgeText })}
                                  {...bindField(cExKey)}
                                  className="w-full bg-transparent outline-none text-xs"
                                />
                              ) : (
                                <span style={fStyle(cExKey, { color: theme.badgeText })}>
                                  <strong>Ej:</strong> {c.example}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {isInteractiveEditor && !isCompact && cardsList.length < 4 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSlideField('cards', [
                          ...cardsList,
                          { title: `Concepto ${cardsList.length + 1}`, text: 'Descripción breve del concepto...', example: '' }
                        ]);
                      }}
                      style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
                    >
                      <Plus size={13} /> Añadir tarjeta
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Capa de Elementos Libres tipo PowerPoint / Google Slides (slide.elements) */}
      {Array.isArray(safeSlide.elements) && safeSlide.elements.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {safeSlide.elements.map((el) => {
            if (!el) return null;
            const isSelected = isInteractiveEditor && selectedElementId === el.id;
            const isCircle = el.shapeType === 'circle';
            const isPill = el.shapeType === 'pill' || el.type === 'badge';
            const isRect = el.shapeType === 'rect';
            const isDivider = el.shapeType === 'divider';

            const bgFill = el.fill
              ? el.fill
              : el.type === 'note'
                ? '#FEF08A'
                : (el.type === 'shape' || el.type === 'badge')
                  ? theme.cardBg
                  : 'transparent';

            const textColor = el.textColor || (
              bgFill !== 'transparent'
                ? (isLightHexColor(bgFill, !theme.isDark) ? '#0F172A' : '#FFFFFF')
                : theme.textPrimary
            );
            const elFontFamily = el.fontFamily && SLIDE_FONTS[el.fontFamily]
              ? SLIDE_FONTS[el.fontFamily].css
              : 'inherit';
            const rawElFontSize = Number(el.fontSize) || 16;
            const scaledElFontSize = mode === 'thumbnail'
              ? `${Math.max(7, Math.round(rawElFontSize * 0.28))}px`
              : mode === 'card'
                ? `${Math.max(9, Math.round(rawElFontSize * 0.45))}px`
                : `${rawElFontSize}px`;
            const decorations = [];
            if (el.underline) decorations.push('underline');
            if (el.strikethrough) decorations.push('line-through');
            const elTextDecoration = decorations.length > 0 ? decorations.join(' ') : 'none';

            return (
              <div
                key={el.id}
                data-canvas-element={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractiveEditor && onSelectElement) onSelectElement(el.id);
                }}
                onPointerDown={(e) => {
                  if (!isInteractiveEditor || !onStartElementPointer) return;
                  e.stopPropagation();
                  const tag = e.target?.tagName?.toLowerCase();
                  if (tag === 'textarea' || tag === 'input') {
                    onSelectElement?.(el.id);
                    return;
                  }
                  onStartElementPointer(e, el, 'move');
                }}
                style={{
                  left: `${el.x ?? 15}%`,
                  top: `${el.y ?? 20}%`,
                  width: `${el.w ?? 30}%`,
                  height: `${el.h ?? 18}%`,
                  backgroundColor: isDivider ? 'transparent' : bgFill,
                  borderColor: el.stroke && el.stroke !== 'transparent' ? el.stroke : 'transparent',
                  borderWidth: el.stroke && el.stroke !== 'transparent' ? '2px' : '0px',
                  borderStyle: el.stroke && el.stroke !== 'transparent' ? 'solid' : 'none',
                  color: textColor,
                  opacity: el.opacity ?? 1
                }}
                className={`group/el absolute pointer-events-auto transition-shadow ${
                  isCircle ? 'rounded-full' : isPill ? 'rounded-full' : isRect ? 'rounded-md' : 'rounded-2xl'
                } ${el.type === 'note' ? 'shadow-md' : ''} ${
                  isInteractiveEditor ? 'cursor-move' : ''
                } ${isSelected ? 'ring-2 ring-sky-500 shadow-lg' : isInteractiveEditor ? 'hover:ring-1 hover:ring-sky-400/60' : ''}`}
              >
                {/* Barra de arrastre rápida en el editor (visible al seleccionar o pasar el cursor) */}
                {isInteractiveEditor && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStartElementPointer?.(e, el, 'move');
                    }}
                    className={`absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-sky-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs cursor-grab active:cursor-grabbing whitespace-nowrap z-30 transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover/el:opacity-100'
                    }`}
                  >
                    Arrastrar
                  </div>
                )}

                {el.type === 'image' ? (
                  <div className="w-full h-full overflow-hidden rounded-xl relative">
                    <img
                      src={el.imageUrl}
                      alt={el.caption || 'Slide element'}
                      className="w-full h-full pointer-events-none"
                      style={{ objectFit: el.fit || 'cover' }}
                    />
                  </div>
                ) : isDivider ? (
                  <div className="w-full h-full flex items-center justify-center px-2">
                    <div
                      className="w-full h-1 rounded-full"
                      style={{ backgroundColor: el.fill && el.fill !== 'transparent' ? el.fill : theme.primary }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
                    {isInteractiveEditor ? (
                      <textarea
                        data-canvas-element-input={el.id}
                        value={el.text || ''}
                        onChange={(e) => onUpdateElementField?.(el.id, 'text', e.target.value)}
                        onFocus={(e) => {
                          onSelectElement?.(el.id);
                          const val = (e.target.value || '').trim();
                          if (
                            val === 'Escribe tu texto aquí...' ||
                            val === 'Nota importante para recordar...' ||
                            val === 'Etiqueta' ||
                            val === 'Texto'
                          ) {
                            requestAnimationFrame(() => {
                              try {
                                e.target.select();
                              } catch {
                                // ignore selection errors
                              }
                            });
                          }
                        }}
                        placeholder="Escribe aquí..."
                        style={{
                          fontFamily: elFontFamily,
                          fontSize: scaledElFontSize,
                          fontWeight: el.bold ? 800 : 500,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textDecoration: elTextDecoration,
                          textAlign: el.align || 'left',
                          lineHeight: el.lineHeight || 1.25,
                          color: textColor
                        }}
                        className="w-full h-full bg-transparent outline-none resize-none leading-snug"
                      />
                    ) : (
                      <div
                        style={{
                          fontFamily: elFontFamily,
                          fontSize: scaledElFontSize,
                          fontWeight: el.bold ? 800 : 500,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textDecoration: elTextDecoration,
                          textAlign: el.align || 'left',
                          lineHeight: el.lineHeight || 1.25,
                          color: textColor
                        }}
                        className="w-full whitespace-pre-wrap break-words leading-snug"
                      >
                        {el.text}
                      </div>
                    )}
                  </div>
                )}

                {/* Controles de redimensionamiento (Handles) estilo PowerPoint */}
                {isSelected && (
                  <>
                    {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((dir) => {
                      const posClasses = {
                        nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
                        n: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                        ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
                        w: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize',
                        e: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize',
                        sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                        s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                        se: '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                      }[dir];
                      return (
                        <div
                          key={dir}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onStartElementPointer?.(e, el, 'resize', dir);
                          }}
                          className={`absolute w-3 h-3 rounded-full bg-white border-2 border-sky-500 shadow-xs z-30 ${posClasses}`}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pie de tarjeta cuando está en la biblioteca */}
      {mode === 'card' && (
        <div className="flex items-center justify-between text-[10px] font-bold opacity-75 z-10 pt-1">
          <span className="truncate max-w-[70%]">{presentation?.author || 'Docente'}</span>
          <span
            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
            className="px-2 py-0.5 rounded-md font-black"
          >
            {totalSlides} diapos
          </span>
        </div>
      )}

      {!isCompact && <div />}
    </div>
  );
};

// =========================================================================
// 3. VISOR INTERACTIVO EN PANTALLA COMPLETA (Con Puntero Láser, Lápiz, Notas y Voz)
// =========================================================================
export const SlidePresenterViewer = ({ presentation, onClose, onEdit, role, themeMode = 'light' }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizSelection, setQuizSelection] = useState({});
  const [spotlightIdx, setSpotlightIdx] = useState(null);
  const [showOverviewGrid, setShowOverviewGrid] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 50, y: 50, visible: false });
  const [penActive, setPenActive] = useState(false);
  const [penColor, setPenColor] = useState('#EF4444');
  const [strokesBySlide, setStrokesBySlide] = useState({});
  const [isSpeaking, setIsSpeaking] = useState(false);

  const viewerRef = useRef(null);
  const drawingRef = useRef({ active: false, points: [] });

  const slides = presentation?.slides || [];
  const total = slides.length;
  const safeIdx = total > 0 ? Math.min(currentIdx, total - 1) : 0;
  const currentSlide = slides[safeIdx] || {};
  const displayTitle = presentation?.slides?.[0]?.title || presentation?.topic || 'Presentación';
  const transitionType = currentSlide.transition || presentation?.transition || 'fade';
  const transitionDuration = Number(currentSlide.transitionDuration || presentation?.transitionDuration || 400);
  const autoAdvanceSec = Number(currentSlide.autoAdvanceSeconds ?? presentation?.autoAdvanceSeconds ?? 0);

  const isLight = themeMode === 'light';
  const isDim = themeMode === 'dim';

  useEffect(() => {
    setCurrentIdx(0);
    setQuizSelection({});
    setSpotlightIdx(null);
  }, [presentation?.id]);

  useEffect(() => {
    if (!autoAdvanceSec || autoAdvanceSec <= 0 || showOverviewGrid || total <= 1) return undefined;
    const timer = setTimeout(() => {
      setCurrentIdx(prev => (prev < total - 1 ? prev + 1 : 0));
    }, autoAdvanceSec * 1000);
    return () => clearTimeout(timer);
  }, [safeIdx, autoAdvanceSec, showOverviewGrid, total]);

  useEffect(() => {
    setSpotlightIdx(null);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [safeIdx]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (total > 0 && currentIdx >= total) {
      setCurrentIdx(Math.max(0, total - 1));
    }
  }, [total, currentIdx]);

  const toggleNativeFullscreen = async () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    if (!isFs) {
      const el = viewerRef.current;
      const req = el?.requestFullscreen || el?.webkitRequestFullscreen || el?.msRequestFullscreen;
      try { await req?.call(el); setIsFullscreen(true); } catch {}
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      try { await exit?.call(document); setIsFullscreen(false); } catch {}
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleSpeakCurrentSlide = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const activeLayout = resolveSlideLayout(currentSlide, safeIdx);
    const spokenParts = [currentSlide.title];

    if (activeLayout === 'title' || activeLayout === 'section') {
      spokenParts.push(currentSlide.subtitle, currentSlide.description);
    } else if (activeLayout === 'title_body' || activeLayout === 'image_text') {
      spokenParts.push(currentSlide.body || currentSlide.content || currentSlide.subtitle, currentSlide.callout, currentSlide.imageCaption);
    } else if (activeLayout === 'two_columns') {
      for (const col of [currentSlide.leftColumn, currentSlide.rightColumn]) {
        if (col) {
          spokenParts.push(col.title, col.text, ...(Array.isArray(col.items) ? col.items : []));
        }
      }
    } else if (activeLayout === 'table') {
      if (Array.isArray(currentSlide.table?.headers)) spokenParts.push(currentSlide.table.headers.join(', '));
      getTableRows(currentSlide.table).forEach(r => {
        if (Array.isArray(r)) spokenParts.push(r.join(', '));
      });
    } else if (activeLayout === 'quote') {
      spokenParts.push(currentSlide.statValue, currentSlide.quoteText || currentSlide.body, currentSlide.quoteAuthor);
    } else if (activeLayout === 'quiz') {
      spokenParts.push(currentSlide.question);
      if (Array.isArray(currentSlide.options)) {
        currentSlide.options.forEach((o, i) => {
          if (o?.text) spokenParts.push(`${String.fromCharCode(65 + i)}: ${o.text}`);
        });
      }
    } else if (activeLayout === 'bullets') {
      if (Array.isArray(currentSlide.bullets)) {
        currentSlide.bullets.forEach(b => {
          if (typeof b === 'object') spokenParts.push(b?.title, b?.text, b?.example);
          else spokenParts.push(b);
        });
      } else if (currentSlide.content) {
        spokenParts.push(currentSlide.content);
      }
    } else if (activeLayout === 'cards') {
      if (Array.isArray(currentSlide.cards)) {
        currentSlide.cards.forEach(c => spokenParts.push(c?.title, c?.text, c?.example));
      } else if (currentSlide.content) {
        spokenParts.push(currentSlide.content);
      }
    }

    if (Array.isArray(currentSlide.elements)) {
      currentSlide.elements.forEach(el => {
        if (el?.text) spokenParts.push(el.text);
      });
    }

    const parts = spokenParts.filter(Boolean).join('. ');
    const textToSpeak = cleanTextForTTS(parts);
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(textToSpeak);
    const langCode = presentation?.language?.toLowerCase().includes('ingl')
      ? 'en-US'
      : presentation?.language?.toLowerCase().includes('franc')
        ? 'fr-FR'
        : detectLanguage(textToSpeak);
    utter.lang = langCode;
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = selectBestFemaleVoice(voices, langCode);
    if (bestVoice) utter.voice = bestVoice;
    utter.rate = 0.96;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentIdx(prev => Math.min(prev + 1, total - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleNativeFullscreen();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowOverviewGrid(prev => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLaserActive(prev => !prev);
        setPenActive(false);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPenActive(prev => !prev);
        setLaserActive(false);
      } else if (e.key === 'Escape') {
        if (showOverviewGrid) {
          setShowOverviewGrid(false);
        } else if (isFullscreen) {
          document.exitFullscreen?.().catch(() => {});
        } else if (onClose) {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total, isFullscreen, showOverviewGrid, onClose]);

  if (!presentation || total === 0 || typeof document === 'undefined' || !document.body) return null;

  const viewerBg = isLight ? 'bg-slate-100 text-slate-900' : (isDim ? 'bg-[#0f172a] text-slate-100' : 'bg-neutral-950 text-white');
  const headerBtnBg = isLight
    ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
    : (isDim ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800');

  const transitionAnimClass = {
    fade: 'animate-in fade-in duration-300',
    slide: 'animate-in fade-in slide-in-from-right-8 duration-300',
    push_up: 'animate-in fade-in slide-in-from-bottom-8 duration-300',
    wipe: 'animate-in fade-in slide-in-from-left-8 duration-300',
    split: 'animate-in fade-in zoom-in-95 duration-300',
    zoom: 'animate-in fade-in zoom-in-90 duration-300',
    flip: 'animate-in fade-in zoom-in-90 duration-300',
    none: ''
  }[transitionType] || 'animate-in fade-in duration-200';

  const currentStrokes = strokesBySlide[safeIdx] || [];

  const handleStagePointerDown = (e) => {
    if (!penActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 562.5;
    drawingRef.current = { active: true, points: [`${x.toFixed(1)},${y.toFixed(1)}`] };
    setStrokesBySlide(prev => ({
      ...prev,
      [safeIdx]: [...(prev[safeIdx] || []), { color: penColor, points: [`${x.toFixed(1)},${y.toFixed(1)}`] }]
    }));
  };

  const handleStagePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (laserActive) {
      setLaserPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
        visible: true
      });
    }
    if (penActive && drawingRef.current.active) {
      const x = ((e.clientX - rect.left) / rect.width) * 1000;
      const y = ((e.clientY - rect.top) / rect.height) * 562.5;
      const pt = `${x.toFixed(1)},${y.toFixed(1)}`;
      drawingRef.current.points.push(pt);
      setStrokesBySlide(prev => {
        const list = [...(prev[safeIdx] || [])];
        if (list.length === 0) return prev;
        list[list.length - 1] = {
          ...list[list.length - 1],
          points: [...drawingRef.current.points]
        };
        return { ...prev, [safeIdx]: list };
      });
    }
  };

  const handleStagePointerUp = () => {
    if (drawingRef.current.active) {
      drawingRef.current.active = false;
    }
  };

  return createPortal(
    <div
      ref={viewerRef}
      className={`fixed inset-0 z-[999999] flex flex-col justify-between p-2.5 sm:p-5 select-none animate-in fade-in duration-200 overflow-hidden ${viewerBg}`}
    >
      {/* Barra Superior de Presentación */}
      <header className="flex items-center justify-between gap-2 w-full max-w-6xl mx-auto pb-1.5 shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${headerBtnBg}`}
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
          <h3 className="text-xs sm:text-base font-extrabold truncate max-w-xs sm:max-w-md">
            {displayTitle}
          </h3>
        </div>

        {/* Herramientas en Vivo del Presentador */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowOverviewGrid(prev => !prev)}
            className={`p-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showOverviewGrid ? 'bg-[#AD3333] text-white' : headerBtnBg
            }`}
            title="Vista de cuadrícula (G)"
          >
            <Grid size={15} />
            <span className="hidden md:inline">Mosaico</span>
          </button>

          <button
            type="button"
            onClick={toggleSpeakCurrentSlide}
            className={`p-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isSpeaking ? 'bg-amber-500 text-white' : headerBtnBg
            }`}
            title="Narrar diapositiva en voz alta"
          >
            {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span className="hidden lg:inline">{isSpeaking ? 'Detener voz' : 'Escuchar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLaserActive(prev => !prev);
              setPenActive(false);
            }}
            className={`p-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              laserActive ? 'bg-red-600 text-white shadow-sm' : headerBtnBg
            }`}
            title="Puntero láser (L)"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${laserActive ? 'bg-white animate-ping' : 'bg-red-500'}`} />
            <span className="hidden md:inline">Láser</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPenActive(prev => !prev);
              setLaserActive(false);
            }}
            className={`p-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              penActive ? 'bg-blue-600 text-white shadow-sm' : headerBtnBg
            }`}
            title="Anotar en pantalla (P)"
          >
            <PenTool size={14} />
            <span className="hidden md:inline">Anotar</span>
          </button>

          {penActive && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/20">
              {['#EF4444', '#F59E0B', '#10B981', '#3B82F6'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full border ${penColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
                />
              ))}
              {currentStrokes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStrokesBySlide(prev => ({ ...prev, [safeIdx]: [] }))}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white ml-1"
                  title="Borrar trazos"
                >
                  Borrar
                </button>
              )}
            </div>
          )}

          {role === 'teacher' && (
            <button
              type="button"
              onClick={() => setShowSpeakerNotes(prev => !prev)}
              className={`p-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showSpeakerNotes ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : headerBtnBg
              }`}
              title="Notas del orador"
            >
              <FileText size={14} />
              <span className="hidden lg:inline">Notas</span>
            </button>
          )}

          {role === 'teacher' && onEdit && (
            <button
              type="button"
              onClick={() => {
                if (isFullscreen) document.exitFullscreen?.().catch(() => {});
                onEdit(presentation);
              }}
              className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${headerBtnBg} hover:text-[#AD3333]`}
              title="Abrir estudio de edición"
            >
              <Edit3 size={14} className="text-[#AD3333]" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className={`p-2 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${headerBtnBg}`}
            title="Pantalla Completa (F)"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            type="button"
            onClick={() => exportReviewToPresentation(presentation)}
            className="p-2 px-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Descargar PowerPoint .pptx"
          >
            <Download size={14} />
            <span className="hidden sm:inline">.pptx</span>
          </button>
        </div>
      </header>

      {/* Vista Principal: Mosaico de Diapositivas O Lienzo 16:9 */}
      {showOverviewGrid ? (
        <main className="flex-1 overflow-y-auto py-4 max-w-6xl w-full mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slides.map((s, idx) => (
              <div
                key={s.id || idx}
                onClick={() => {
                  setCurrentIdx(idx);
                  setShowOverviewGrid(false);
                }}
                className={`group cursor-pointer rounded-2xl p-2 border transition-all ${
                  idx === safeIdx ? 'border-[#AD3333] ring-2 ring-[#AD3333]/30 bg-red-500/5' : 'border-gray-500/20 hover:border-gray-400'
                }`}
              >
                <div className="rounded-xl overflow-hidden shadow-xs pointer-events-none">
                  <SlideCanvasSurface
                    presentation={presentation}
                    slide={s}
                    slideIdx={idx}
                    totalSlides={total}
                    appThemeMode={themeMode}
                    mode="thumbnail"
                  />
                </div>
                <div className="flex items-center justify-between px-1 pt-2 text-xs font-bold">
                  <span className="truncate">{idx + 1}. {s.title || `Diapositiva ${idx + 1}`}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center min-h-0 py-1 w-full gap-2">
          <div
            key={`${safeIdx}_${transitionType}`}
            style={{ animationDuration: `${transitionDuration}ms` }}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerLeave={() => {
              handleStagePointerUp();
              if (laserActive) setLaserPos(prev => ({ ...prev, visible: false }));
            }}
            className={`w-full max-w-6xl max-h-[80vh] aspect-video relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 ${transitionAnimClass} ${
              laserActive ? 'cursor-none' : penActive ? 'cursor-crosshair touch-none' : ''
            }`}
          >
            <SlideCanvasSurface
              presentation={presentation}
              slide={currentSlide}
              slideIdx={safeIdx}
              totalSlides={total}
              appThemeMode={themeMode}
              mode="presenter"
              quizSelection={quizSelection}
              onSelectQuizOption={(sIdx, oIdx) => setQuizSelection(prev => ({ ...prev, [sIdx]: oIdx }))}
              onResetQuizSlide={(sIdx) => setQuizSelection(prev => {
                const next = { ...prev };
                delete next[sIdx];
                return next;
              })}
              spotlightIdx={spotlightIdx}
              onToggleSpotlight={(idx) => setSpotlightIdx(prev => prev === idx ? null : idx)}
            />

            {/* Capa SVG de Anotaciones en Vivo */}
            {(currentStrokes.length > 0 || penActive) && (
              <svg
                viewBox="0 0 1000 562.5"
                className="absolute inset-0 w-full h-full pointer-events-none z-30"
              >
                {currentStrokes.map((st, sIdx) => (
                  <polyline
                    key={sIdx}
                    fill="none"
                    stroke={st.color || '#EF4444'}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={(st.points || []).join(' ')}
                  />
                ))}
              </svg>
            )}

            {/* Puntero Láser Virtual */}
            {laserActive && laserPos.visible && (
              <div
                style={{ left: `${laserPos.x}%`, top: `${laserPos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 shadow-[0_0_18px_6px_rgba(239,68,68,0.85)] border-2 border-white pointer-events-none z-40"
              />
            )}
          </div>

          {/* Panel de Notas del Orador en Vivo (solo Docente) */}
          {role === 'teacher' && showSpeakerNotes && (
            <div className="w-full max-w-4xl px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm">
              <span className="font-black uppercase tracking-wider text-amber-500 text-[10px] block mb-0.5">
                Notas del Orador — Diapositiva {safeIdx + 1}
              </span>
              <p className="opacity-90">
                {currentSlide.speakerNotes || 'Sin notas registradas para esta diapositiva.'}
              </p>
            </div>
          )}
        </main>
      )}

      {/* Barra Inferior de Navegación */}
      <footer className="flex items-center justify-between w-full max-w-md mx-auto pt-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))}
          disabled={safeIdx === 0}
          className={`p-2 px-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors ${headerBtnBg}`}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        {/* Puntos indicadores de progreso */}
        <div className="flex items-center gap-1.5 px-2">
          {slides.slice(0, 12).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === safeIdx ? 'w-6 bg-[#AD3333]' : 'w-2 bg-gray-400/40 hover:bg-gray-400'
              }`}
              title={`Ir a diapositiva ${idx + 1}`}
            />
          ))}
          {total > 12 && (
            <span className="text-xs font-mono font-black opacity-70">{safeIdx + 1}/{total}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCurrentIdx(prev => Math.min(prev + 1, total - 1))}
          disabled={safeIdx === total - 1}
          className="p-2 px-4 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
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
// 4. ESTUDIO DE EDICIÓN ESTILO POWERPOINT / GOOGLE SLIDES (SlideEditorModal)
// =========================================================================
export const SlideEditorModal = ({
  presentation,
  onClose,
  onSave,
  onProject,
  isDarkMode,
  isDemoMode = false,
  academicGroups = [],
  callGemini = null,
  showMessage = () => {}
}) => {
  const [deckMeta, setDeckMeta] = useState(() => ({
    topic: presentation?.topic || presentation?.slides?.[0]?.title || 'Nueva Presentación',
    language: presentation?.language || 'Inglés',
    theme: presentation?.theme || 'unipamplona',
    fontFamily: presentation?.fontFamily || 'sans',
    transition: presentation?.transition || 'fade',
    transitionDuration: presentation?.transitionDuration || 450,
    autoAdvanceSeconds: presentation?.autoAdvanceSeconds || 0,
    bgPattern: presentation?.bgPattern || 'none',
    targetGroupId: presentation?.targetGroupId || 'all',
    targetGroupName: presentation?.targetGroupName || 'General'
  }));

  const [slides, setSlides] = useState(() => {
    try {
      const initial = hydrateSlidesFromFirestore(JSON.parse(JSON.stringify(presentation?.slides || [])));
      return initial.length > 0 ? initial : [createDefaultSlide('title', 0)];
    } catch {
      return [createDefaultSlide('title', 0)];
    }
  });

  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const persistedPresRef = useRef(presentation);
  useEffect(() => {
    if (presentation) {
      persistedPresRef.current = presentation;
    }
  }, [presentation]);

  // Historial Undo / Redo sincronizado con ref para evitar cierres obsoletos y setState anidados
  const initialSerialized = JSON.stringify(slides);
  const [history, setHistory] = useState(() => [initialSerialized]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const historyRef = useRef({ entries: [initialSerialized], idx: 0 });

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [activeTextField, setActiveTextField] = useState('title');
  const [ribbonTab, setRibbonTab] = useState('inicio'); // 'inicio' | 'insertar' | 'diseno' | 'transiciones' | 'ia' | 'presentacion'
  const [inspectorTab, setInspectorTab] = useState('content'); // 'content' | 'layout' | 'theme' | 'ai'
  const [showRightInspector, setShowRightInspector] = useState(false);
  const [showMoreFormatTools, setShowMoreFormatTools] = useState(false);
  const [showAddSlidePicker, setShowAddSlidePicker] = useState(false);
  const [showSpeakerNotesBar, setShowSpeakerNotesBar] = useState(false);
  const [showGridGuides, setShowGridGuides] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [snapGuides, setSnapGuides] = useState({ xCenter: false, yCenter: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [clipboardItem, setClipboardItem] = useState(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [previewAnimKey, setPreviewAnimKey] = useState(0);
  const [isDragOverStage, setIsDragOverStage] = useState(false);

  // Estado del Co-Piloto IA dentro del editor
  const [aiSlidePrompt, setAiSlidePrompt] = useState('');
  const [aiSlideLayout, setAiSlideLayout] = useState('auto');
  const [isAiWorking, setIsAiWorking] = useState(false);

  const stageContainerRef = useRef(null);
  const ribbonContainerRef = useRef(null);
  const pointerStateRef = useRef(null);
  const slideImageInputRef = useRef(null);
  const elementImageInputRef = useRef(null);
  const replaceElementImageInputRef = useRef(null);
  const bgImageInputRef = useRef(null);

  const focusCanvasField = (fieldKey) => {
    if (!fieldKey) return;
    setSelectedElementId(null);
    setActiveTextField(fieldKey);
    requestAnimationFrame(() => {
      const root = stageContainerRef.current;
      if (!root) return;
      const target = root.querySelector(`[data-field-key="${fieldKey}"]`);
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    });
  };

  useEffect(() => {
    if (presentation?.isNewDraft) {
      focusCanvasField('title');
    }
  }, []);

  const pushHistorySnapshot = (nextSlides) => {
    try {
      const serialized = JSON.stringify(nextSlides);
      const { entries, idx } = historyRef.current;
      const sliced = entries.slice(0, idx + 1);
      if (sliced[sliced.length - 1] === serialized) return;
      const updated = [...sliced, serialized].slice(-35);
      const nextIdx = updated.length - 1;
      historyRef.current = { entries: updated, idx: nextIdx };
      setHistory(updated);
      setHistoryIdx(nextIdx);
    } catch {
      // ignore serialization errors
    }
  };

  const updateSlidesWithHistory = (updater) => {
    const prev = slidesRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    slidesRef.current = next;
    setSlides(next);
    pushHistorySnapshot(next);
  };

  const handleUndo = () => {
    const { entries, idx } = historyRef.current;
    if (idx <= 0) return;
    const targetIdx = idx - 1;
    try {
      const restored = JSON.parse(entries[targetIdx]);
      historyRef.current = { entries, idx: targetIdx };
      slidesRef.current = restored;
      setSlides(restored);
      setHistoryIdx(targetIdx);
      setActiveSlideIdx(prev => Math.min(prev, Math.max(0, restored.length - 1)));
    } catch {}
  };

  const handleRedo = () => {
    const { entries, idx } = historyRef.current;
    if (idx >= entries.length - 1) return;
    const targetIdx = idx + 1;
    try {
      const restored = JSON.parse(entries[targetIdx]);
      historyRef.current = { entries, idx: targetIdx };
      slidesRef.current = restored;
      setSlides(restored);
      setHistoryIdx(targetIdx);
      setActiveSlideIdx(prev => Math.min(prev, Math.max(0, restored.length - 1)));
    } catch {}
  };

  const safeSlideIdx = Math.min(activeSlideIdx, Math.max(0, slides.length - 1));
  const activeSlide = slides[safeSlideIdx] || slides[0] || {};
  const activeLayout = resolveSlideLayout(activeSlide, safeSlideIdx);
  const activeTheme = resolveTheme(deckMeta, activeSlide, isDarkMode ? 'dark' : 'light');
  const activeElements = Array.isArray(activeSlide.elements) ? activeSlide.elements : [];
  const selectedElement = activeElements.find(el => el.id === selectedElementId) || null;
  const editableFields = listSlideEditableFields(activeSlide, safeSlideIdx);

  // Limpiar selectedElementId si el objeto dejó de existir (por ejemplo tras Deshacer/Rehacer)
  useEffect(() => {
    if (selectedElementId && !activeElements.some(el => el.id === selectedElementId)) {
      setSelectedElementId(null);
    }
  }, [selectedElementId, activeElements]);

  // Cerrar menús desplegables de la cinta al cambiar de pestaña o de diapositiva
  useEffect(() => {
    setShowColorPalette(false);
    setShowHighlightPalette(false);
    setShowImageMenu(false);
    setShowAddSlidePicker(false);
  }, [ribbonTab, safeSlideIdx]);

  // Cerrar menús desplegables de la cinta al hacer clic fuera de la cinta
  useEffect(() => {
    if (!showColorPalette && !showHighlightPalette && !showImageMenu) return undefined;
    const handleOutsideClick = (ev) => {
      if (ribbonContainerRef.current && !ribbonContainerRef.current.contains(ev.target)) {
        setShowColorPalette(false);
        setShowHighlightPalette(false);
        setShowImageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColorPalette, showHighlightPalette, showImageMenu]);

  // Asegurar que activeTextField sea válido cuando cambia el layout
  useEffect(() => {
    const validKeys = listSlideEditableFields(activeSlide, safeSlideIdx).map(f => f.key);
    if (validKeys.length > 0 && !validKeys.includes(activeTextField)) {
      setActiveTextField(validKeys[0]);
    }
  }, [activeLayout, safeSlideIdx, activeSlide, activeTextField]);

  // Manejo de arrastre y redimensionamiento de objetos libres en el lienzo 16:9
  useEffect(() => {
    const handleWindowPointerMove = (e) => {
      const st = pointerStateRef.current;
      if (!st) return;

      if (!st.hasMoved && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) < 2) {
        return;
      }

      const dxPct = ((e.clientX - st.startX) / st.stageW) * 100;
      const dyPct = ((e.clientY - st.startY) / st.stageH) * 100;

      let nextRect = { ...st.initialRect };
      const guides = { xCenter: false, yCenter: false };

      if (st.mode === 'move') {
        let nextX = st.initialRect.x + dxPct;
        let nextY = st.initialRect.y + dyPct;

        const centerX = nextX + st.initialRect.w / 2;
        const centerY = nextY + st.initialRect.h / 2;
        if (Math.abs(centerX - 50) < 1.3) {
          nextX = 50 - st.initialRect.w / 2;
          guides.xCenter = true;
        }
        if (Math.abs(centerY - 50) < 1.3) {
          nextY = 50 - st.initialRect.h / 2;
          guides.yCenter = true;
        }

        nextRect = clampElementRect({ x: nextX, y: nextY, w: st.initialRect.w, h: st.initialRect.h });
      } else if (st.mode === 'resize') {
        let { x, y, w, h } = st.initialRect;
        const rightEdge = st.initialRect.x + st.initialRect.w;
        const bottomEdge = st.initialRect.y + st.initialRect.h;
        const dir = st.dir || 'se';
        if (dir.includes('e')) w = Math.max(6, Math.min(100, 105 - x, st.initialRect.w + dxPct));
        if (dir.includes('s')) h = Math.max(5, Math.min(100, 105 - y, st.initialRect.h + dyPct));
        if (dir.includes('w')) {
          w = Math.max(6, Math.min(100, rightEdge + 5, st.initialRect.w - dxPct));
          x = rightEdge - w;
        }
        if (dir.includes('n')) {
          h = Math.max(5, Math.min(100, bottomEdge + 5, st.initialRect.h - dyPct));
          y = bottomEdge - h;
        }
        nextRect = clampElementRect({ x, y, w, h });
      }

      setSnapGuides(guides);
      st.hasMoved = true;

      setSlides(prev => {
        const copy = [...prev];
        const current = copy[st.slideIdx];
        if (!current || !Array.isArray(current.elements)) return prev;
        copy[st.slideIdx] = {
          ...current,
          elements: current.elements.map(el => el.id === st.elId ? { ...el, ...nextRect } : el)
        };
        slidesRef.current = copy;
        return copy;
      });
    };

    const handleWindowPointerUp = () => {
      const st = pointerStateRef.current;
      if (!st) return;
      pointerStateRef.current = null;
      setSnapGuides({ xCenter: false, yCenter: false });
      if (st.hasMoved) {
        pushHistorySnapshot(slidesRef.current);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, []);

  const handleStartElementPointer = (e, el, mode = 'move', dir = 'se') => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    const stageEl = stageContainerRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const rawX = Number(el.x);
    const rawY = Number(el.y);
    const rawW = Number(el.w);
    const rawH = Number(el.h);
    pointerStateRef.current = {
      mode,
      dir,
      elId: el.id,
      slideIdx: safeSlideIdx,
      startX: e.clientX,
      startY: e.clientY,
      stageW: Math.max(100, rect.width),
      stageH: Math.max(60, rect.height),
      initialRect: {
        x: Number.isFinite(rawX) ? rawX : 15,
        y: Number.isFinite(rawY) ? rawY : 20,
        w: Number.isFinite(rawW) && rawW > 0 ? rawW : 30,
        h: Number.isFinite(rawH) && rawH > 0 ? rawH : 18
      },
      hasMoved: false
    };
  };

  const handleDeckTopicChange = (newTopic) => {
    const prevTopic = (deckMeta.topic || '').trim();
    setDeckMeta(prev => ({ ...prev, topic: newTopic }));
    const firstSlideTitle = String(slidesRef.current?.[0]?.title || '').trim();
    if (
      !firstSlideTitle ||
      firstSlideTitle === prevTopic ||
      firstSlideTitle === 'Nueva Presentación' ||
      firstSlideTitle === 'Título de la Presentación'
    ) {
      updateSlidesWithHistory(prev => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const copy = [...prev];
        copy[0] = { ...copy[0], title: newTopic };
        return copy;
      });
    }
  };

  const handleSlideChange = (field, value) => {
    if (field === 'title' && safeSlideIdx === 0) {
      const prevFirstTitle = String(slidesRef.current?.[0]?.title || '').trim();
      const curTopic = String(deckMeta.topic || '').trim();
      if (
        !curTopic ||
        curTopic === prevFirstTitle ||
        curTopic === 'Nueva Presentación' ||
        curTopic === 'Título de la Presentación'
      ) {
        setDeckMeta(prev => ({ ...prev, topic: value }));
      }
    }
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      if (field === 'layout') {
        copy[safeSlideIdx] = convertSlideLayout(current, value, safeSlideIdx);
      } else {
        copy[safeSlideIdx] = { ...current, [field]: value };
      }
      return copy;
    });
  };

  const handleSlidePatch = (patchObj) => {
    if (!patchObj || typeof patchObj !== 'object') return;
    if ('title' in patchObj && safeSlideIdx === 0) {
      const prevFirstTitle = String(slidesRef.current?.[0]?.title || '').trim();
      const curTopic = String(deckMeta.topic || '').trim();
      if (
        !curTopic ||
        curTopic === prevFirstTitle ||
        curTopic === 'Nueva Presentación' ||
        curTopic === 'Título de la Presentación'
      ) {
        setDeckMeta(prev => ({ ...prev, topic: patchObj.title }));
      }
    }
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = { ...current, ...patchObj };
      return copy;
    });
  };

  const handleInsertCanvasElement = (type = 'textbox', overrides = {}) => {
    const existingCount = Array.isArray(activeSlide.elements) ? activeSlide.elements.length : 0;
    const staggerStep = (existingCount % 5) * 3.5;
    const baseSample = createCanvasElement(type);
    const autoOffsets = (overrides.x === undefined && overrides.y === undefined && existingCount > 0)
      ? { x: (Number(baseSample.x) || 15) + staggerStep, y: (Number(baseSample.y) || 20) + staggerStep }
      : {};
    const newEl = createCanvasElement(type, { ...autoOffsets, ...overrides });
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = { ...current, elements: [...list, newEl] };
      return copy;
    });
    setSelectedElementId(newEl.id);
    setInspectorTab('content');
    if (newEl.type !== 'image' && newEl.shapeType !== 'divider') {
      requestAnimationFrame(() => {
        const root = stageContainerRef.current;
        if (!root) return;
        const target = root.querySelector(`[data-canvas-element-input="${newEl.id}"]`);
        if (target && typeof target.focus === 'function') {
          target.focus();
        }
      });
    }
  };

  const handleUpdateElementField = (elId, field, value) => {
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = {
        ...current,
        elements: list.map(el => el.id === elId ? { ...el, [field]: value } : el)
      };
      return copy;
    });
  };

  const handleUpdateElementPatch = (elId, patchObj) => {
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = {
        ...current,
        elements: list.map(el => el.id === elId ? { ...el, ...patchObj } : el)
      };
      return copy;
    });
  };

  // =========================================================================
  // FORMATO INDIVIDUAL POR TEXTO / ELEMENTO (Estilo PowerPoint)
  // =========================================================================
  const activeFieldMeta = getDefaultFieldStyleMeta(activeSlide, activeTextField, safeSlideIdx);
  const activeFieldSavedStyle = getFieldTextStyle(activeSlide, activeTextField);

  const currentTargetStyle = selectedElement && selectedElement.type !== 'image'
    ? {
        fontFamily: selectedElement.fontFamily || activeSlide.fontFamily || deckMeta.fontFamily || 'sans',
        fontSize: Number(selectedElement.fontSize) || 18,
        bold: Boolean(selectedElement.bold),
        italic: Boolean(selectedElement.italic),
        underline: Boolean(selectedElement.underline),
        strikethrough: Boolean(selectedElement.strikethrough),
        color: selectedElement.textColor || '',
        bgColor: selectedElement.fill && selectedElement.fill !== 'transparent' ? selectedElement.fill : '',
        align: selectedElement.align || 'left',
        lineHeight: Number(selectedElement.lineHeight) || 1.25
      }
    : {
        fontFamily: activeFieldSavedStyle.fontFamily || activeSlide.fontFamily || deckMeta.fontFamily || 'sans',
        fontSize: Number(activeFieldSavedStyle.fontSize) || activeFieldMeta.fontSize || 18,
        bold: activeFieldSavedStyle.bold !== undefined ? Boolean(activeFieldSavedStyle.bold) : Boolean(activeFieldMeta.bold),
        italic: activeFieldSavedStyle.italic !== undefined ? Boolean(activeFieldSavedStyle.italic) : Boolean(activeFieldMeta.italic),
        underline: Boolean(activeFieldSavedStyle.underline),
        strikethrough: Boolean(activeFieldSavedStyle.strikethrough),
        color: activeFieldSavedStyle.color || '',
        bgColor: activeFieldSavedStyle.bgColor && activeFieldSavedStyle.bgColor !== 'transparent' ? activeFieldSavedStyle.bgColor : '',
        align: activeFieldSavedStyle.align || activeFieldMeta.align || 'left',
        lineHeight: Number(activeFieldSavedStyle.lineHeight) || 1.3
      };

  const applyTargetStylePatch = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    if (selectedElement && selectedElement.type !== 'image') {
      const elPatch = {};
      if ('fontFamily' in patch) elPatch.fontFamily = patch.fontFamily;
      if ('fontSize' in patch) elPatch.fontSize = Math.max(10, Math.min(72, Number(patch.fontSize) || 16));
      if ('bold' in patch) elPatch.bold = Boolean(patch.bold);
      if ('italic' in patch) elPatch.italic = Boolean(patch.italic);
      if ('underline' in patch) elPatch.underline = Boolean(patch.underline);
      if ('strikethrough' in patch) elPatch.strikethrough = Boolean(patch.strikethrough);
      if ('color' in patch) elPatch.textColor = patch.color || '';
      if ('bgColor' in patch) {
        const nextFill = patch.bgColor && patch.bgColor !== 'transparent' ? patch.bgColor : 'transparent';
        elPatch.fill = nextFill;
        if (!('color' in patch) && nextFill !== 'transparent' && !String(nextFill).startsWith('rgba')) {
          const fillIsLight = isLightHexColor(nextFill, !activeTheme.isDark);
          const curTxt = selectedElement.textColor;
          if (!curTxt || curTxt.toUpperCase() === '#FFFFFF' || curTxt.toUpperCase() === '#F8FAFC' || curTxt.toUpperCase() === '#0F172A') {
            elPatch.textColor = fillIsLight ? '#0F172A' : '#FFFFFF';
          }
        } else if (!('color' in patch) && nextFill === 'transparent') {
          const curTxt = selectedElement.textColor;
          if (curTxt && (curTxt.toUpperCase() === '#FFFFFF' || curTxt.toUpperCase() === '#0F172A' || curTxt.toUpperCase() === '#713F12')) {
            elPatch.textColor = '';
          }
        }
      }
      if ('align' in patch) elPatch.align = patch.align;
      if ('lineHeight' in patch) elPatch.lineHeight = Number(patch.lineHeight) || 1.25;
      handleUpdateElementPatch(selectedElement.id, elPatch);
      return;
    }

    const targetField = activeTextField || 'title';
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      let updated = updateFieldTextStyle(current, targetField, patch);
      if ((targetField === 'title' || targetField === '*') && patch.align) {
        updated = { ...updated, titleAlign: patch.align };
      }
      copy[safeSlideIdx] = updated;
      return copy;
    });
  };

  const handleSelectTextField = (fieldKey) => {
    if (!fieldKey) return;
    setSelectedElementId(null);
    setActiveTextField(fieldKey);
    if (copiedFormat) {
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        const current = copy[safeSlideIdx] || {};
        let updated = updateFieldTextStyle(current, fieldKey, copiedFormat);
        if ((fieldKey === 'title' || fieldKey === '*') && copiedFormat.align) {
          updated = { ...updated, titleAlign: copiedFormat.align };
        }
        copy[safeSlideIdx] = updated;
        return copy;
      });
      setCopiedFormat(null);
      showMessage('Formato pegado en el texto.');
    }
  };

  const handleSelectCanvasElement = (elId) => {
    setSelectedElementId(elId);
    if (elId && copiedFormat) {
      const targetEl = activeElements.find(e => e.id === elId);
      if (targetEl && targetEl.type !== 'image') {
        const nextFill = copiedFormat.bgColor && copiedFormat.bgColor !== 'transparent'
          ? copiedFormat.bgColor
          : (targetEl.type === 'textbox' ? 'transparent' : targetEl.fill);
        handleUpdateElementPatch(elId, {
          fontFamily: copiedFormat.fontFamily || targetEl.fontFamily || 'sans',
          fontSize: copiedFormat.fontSize || targetEl.fontSize || 18,
          bold: Boolean(copiedFormat.bold),
          italic: Boolean(copiedFormat.italic),
          underline: Boolean(copiedFormat.underline),
          strikethrough: Boolean(copiedFormat.strikethrough),
          textColor: copiedFormat.color !== undefined ? copiedFormat.color : targetEl.textColor,
          fill: nextFill,
          align: copiedFormat.align || targetEl.align || 'left',
          lineHeight: copiedFormat.lineHeight || targetEl.lineHeight || 1.25
        });
        setCopiedFormat(null);
        showMessage('Formato pegado en el objeto.');
      }
    }
  };

  const handleStepTargetFontSize = (delta) => {
    const nextSize = Math.max(10, Math.min(72, (Number(currentTargetStyle.fontSize) || 18) + delta));
    applyTargetStylePatch({ fontSize: nextSize });
  };

  const handleClearTargetFormatting = () => {
    if (selectedElement && selectedElement.type !== 'image') {
      const defaults = createCanvasElement(selectedElement.type);
      handleUpdateElementPatch(selectedElement.id, {
        fontFamily: 'sans',
        fontSize: defaults.fontSize || 18,
        bold: Boolean(defaults.bold),
        italic: false,
        underline: false,
        strikethrough: false,
        textColor: defaults.textColor || '',
        fill: defaults.fill || 'transparent',
        stroke: defaults.stroke || 'transparent',
        align: defaults.align || 'left',
        lineHeight: defaults.lineHeight || 1.3
      });
      showMessage('Formato del objeto restablecido.');
      return;
    }
    const targetField = activeTextField || 'title';
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = clearFieldTextStyle(current, targetField);
      return copy;
    });
    showMessage('Formato del texto restablecido.');
  };

  const getNextCaseMode = (sample) => {
    const str = String(sample || '');
    const asUpper = transformTextCase(str, 'upper');
    const asLower = transformTextCase(str, 'lower');
    const asTitle = transformTextCase(str, 'title');
    const asSentence = transformTextCase(str, 'sentence');
    if (str === asUpper && str !== asLower) return 'lower';
    if (str === asLower && str !== asTitle) return 'title';
    if (str === asTitle && asTitle !== asSentence && str !== asSentence) return 'sentence';
    return 'upper';
  };

  const handleToggleTargetCase = () => {
    const activeDomEl = typeof document !== 'undefined' ? document.activeElement : null;
    const hasDomSelection = activeDomEl &&
      (activeDomEl.tagName === 'TEXTAREA' || (activeDomEl.tagName === 'INPUT' && activeDomEl.type === 'text')) &&
      typeof activeDomEl.selectionStart === 'number' &&
      typeof activeDomEl.selectionEnd === 'number' &&
      activeDomEl.selectionEnd > activeDomEl.selectionStart &&
      stageContainerRef.current?.contains(activeDomEl);

    if (selectedElement && selectedElement.type !== 'image') {
      const curText = String(selectedElement.text || '');
      if (!curText) return;
      if (hasDomSelection && activeDomEl.value === curText) {
        const start = activeDomEl.selectionStart;
        const end = activeDomEl.selectionEnd;
        const sub = curText.slice(start, end);
        const mode = getNextCaseMode(sub);
        const replaced = transformTextCase(sub, mode);
        const nextText = curText.slice(0, start) + replaced + curText.slice(end);
        handleUpdateElementField(selectedElement.id, 'text', nextText);
        requestAnimationFrame(() => {
          try { activeDomEl.setSelectionRange(start, start + replaced.length); } catch {}
        });
        return;
      }
      const mode = getNextCaseMode(curText);
      handleUpdateElementField(selectedElement.id, 'text', transformTextCase(curText, mode));
      return;
    }
    const targetField = activeTextField || 'title';
    if (targetField === '*') {
      const fields = editableFields.filter(f => f.key !== '*');
      const sampleText = fields.map(f => getSlideFieldTextValue(activeSlide, f.key)).find(t => Boolean(t && t.trim())) || '';
      if (!sampleText) return;
      const mode = getNextCaseMode(sampleText);
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        let updated = copy[safeSlideIdx] || {};
        fields.forEach(f => {
          const val = getSlideFieldTextValue(updated, f.key);
          if (val) {
            updated = setSlideFieldTextValue(updated, f.key, transformTextCase(val, mode));
          }
        });
        copy[safeSlideIdx] = updated;
        return copy;
      });
      return;
    }
    const curText = getSlideFieldTextValue(activeSlide, targetField);
    if (!curText) return;
    if (hasDomSelection && activeDomEl.value === curText) {
      const start = activeDomEl.selectionStart;
      const end = activeDomEl.selectionEnd;
      const sub = curText.slice(start, end);
      const mode = getNextCaseMode(sub);
      const replaced = transformTextCase(sub, mode);
      const nextText = curText.slice(0, start) + replaced + curText.slice(end);
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        const current = copy[safeSlideIdx] || {};
        copy[safeSlideIdx] = setSlideFieldTextValue(current, targetField, nextText);
        return copy;
      });
      requestAnimationFrame(() => {
        try { activeDomEl.setSelectionRange(start, start + replaced.length); } catch {}
      });
      return;
    }
    const mode = getNextCaseMode(curText);
    const nextText = transformTextCase(curText, mode);
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = setSlideFieldTextValue(current, targetField, nextText);
      return copy;
    });
  };

  const toggleLinesListPrefix = (rawText, numbered = false) => {
    const textStr = String(rawText || '');
    if (!textStr.trim()) return '';
    const lines = textStr.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    if (nonEmptyLines.length === 0) return textStr;
    const targetRegex = numbered ? /^\s*\d+\.\s+/ : /^\s*[•\-*]\s+/;
    const allHaveTarget = nonEmptyLines.every(l => targetRegex.test(l));
    let itemCounter = 1;
    return lines
      .map(line => {
        if (!line.trim()) return line;
        const clean = line.replace(/^(\s*[•\-*]\s+|\s*\d+\.\s+)/, '');
        if (allHaveTarget) return clean;
        const prefix = numbered ? `${itemCounter++}. ` : '• ';
        return `${prefix}${clean}`;
      })
      .join('\n');
  };

  const handleToggleBulletsPrefix = (numbered = false) => {
    if (selectedElement && selectedElement.type !== 'image') {
      const curText = String(selectedElement.text || '');
      if (!curText.trim()) return;
      handleUpdateElementField(selectedElement.id, 'text', toggleLinesListPrefix(curText, numbered));
      return;
    }
    const targetField = activeTextField || 'body';
    if (targetField === '*') {
      const fields = editableFields.filter(f => f.key !== '*' && f.key !== 'badge');
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        let updated = copy[safeSlideIdx] || {};
        fields.forEach(f => {
          const val = getSlideFieldTextValue(updated, f.key);
          if (val && val.trim()) {
            updated = setSlideFieldTextValue(updated, f.key, toggleLinesListPrefix(val, numbered));
          }
        });
        copy[safeSlideIdx] = updated;
        return copy;
      });
      return;
    }
    const curText = getSlideFieldTextValue(activeSlide, targetField);
    if (!curText || !String(curText).trim()) return;
    const nextText = toggleLinesListPrefix(curText, numbered);
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = setSlideFieldTextValue(current, targetField, nextText);
      return copy;
    });
  };

  const handleToggleFormatPainter = () => {
    if (copiedFormat) {
      setCopiedFormat(null);
      return;
    }
    setCopiedFormat({ ...currentTargetStyle });
    showMessage('Formato copiado. Haz clic en otro texto u objeto para aplicarlo.');
  };

  const handleDeleteCanvasElement = (elId) => {
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = {
        ...current,
        elements: list.filter(el => el.id !== elId)
      };
      return copy;
    });
    if (selectedElementId === elId) setSelectedElementId(null);
  };

  const handleDuplicateCanvasElement = (elId) => {
    const target = activeElements.find(el => el.id === elId);
    if (!target) return;
    const baseX = Number.isFinite(Number(target.x)) ? Number(target.x) : 15;
    const baseY = Number.isFinite(Number(target.y)) ? Number(target.y) : 20;
    const cloned = {
      ...JSON.parse(JSON.stringify(target)),
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...clampElementRect({ x: baseX + 4, y: baseY + 4, w: target.w, h: target.h })
    };
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = { ...current, elements: [...list, cloned] };
      return copy;
    });
    setSelectedElementId(cloned.id);
  };

  const handleCopySelection = () => {
    if (selectedElement) {
      setClipboardItem({ kind: 'element', data: JSON.parse(JSON.stringify(selectedElement)) });
      showMessage('Objeto copiado al portapapeles.');
    } else {
      setClipboardItem({ kind: 'slide', data: JSON.parse(JSON.stringify(activeSlide)) });
      showMessage('Diapositiva copiada al portapapeles.');
    }
  };

  const handlePasteSelection = () => {
    if (!clipboardItem) {
      handleDuplicateSlide(safeSlideIdx);
      return;
    }
    if (clipboardItem.kind === 'element' && clipboardItem.data) {
      const src = clipboardItem.data;
      const cloned = {
        ...JSON.parse(JSON.stringify(src)),
        id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...clampElementRect({ x: (Number(src.x) || 15) + 4, y: (Number(src.y) || 20) + 4, w: src.w, h: src.h })
      };
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        const current = copy[safeSlideIdx] || {};
        const list = Array.isArray(current.elements) ? current.elements : [];
        copy[safeSlideIdx] = { ...current, elements: [...list, cloned] };
        return copy;
      });
      setSelectedElementId(cloned.id);
      showMessage('Objeto pegado.');
    } else if (clipboardItem.kind === 'slide' && clipboardItem.data) {
      const clone = JSON.parse(JSON.stringify(clipboardItem.data));
      clone.id = `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      clone.title = `${clone.title || 'Diapositiva'} (Copia)`;
      updateSlidesWithHistory(prev => {
        const copy = [...prev];
        copy.splice(safeSlideIdx + 1, 0, clone);
        return copy;
      });
      setActiveSlideIdx(safeSlideIdx + 1);
      showMessage('Diapositiva pegada.');
    }
  };

  const handleReorderCanvasElement = (elId, direction = 'front') => {
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? [...current.elements] : [];
      const idx = list.findIndex(el => el.id === elId);
      if (idx === -1) return prev;
      const [item] = list.splice(idx, 1);
      if (direction === 'front') list.push(item);
      else list.unshift(item);
      copy[safeSlideIdx] = { ...current, elements: list };
      return copy;
    });
  };

  const handleAddSlide = (layout = 'cards') => {
    const newSlide = createDefaultSlide(layout, slides.length);
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      copy.splice(safeSlideIdx + 1, 0, newSlide);
      return copy;
    });
    setActiveSlideIdx(safeSlideIdx + 1);
    setSelectedElementId(null);
    setShowAddSlidePicker(false);
    focusCanvasField('title');
  };

  // Añade contenido automáticamente según el diseño de la diapositiva actual
  const handleAutoAddContentBlock = (blockType = 'auto') => {
    if (blockType === 'card' || (blockType === 'auto' && activeLayout === 'cards')) {
      const curCards = Array.isArray(activeSlide.cards) ? activeSlide.cards : [];
      if (curCards.length < 4) {
        const nextIdx = curCards.length;
        const nextCards = [
          ...curCards,
          { title: `Concepto ${nextIdx + 1}`, text: 'Descripción clara del concepto...', example: 'Ejemplo práctico en contexto.' }
        ];
        handleSlideChange('cards', nextCards);
        focusCanvasField(`cards.${nextIdx}.title`);
        showMessage(`Tarjeta #${nextIdx + 1} añadida a la diapositiva.`);
      } else {
        handleAddSlide('cards');
        showMessage('Nueva diapositiva de tarjetas añadida automáticamente.');
      }
      return;
    }

    if (blockType === 'bullet' || (blockType === 'auto' && activeLayout === 'bullets')) {
      const curBullets = Array.isArray(activeSlide.bullets) ? activeSlide.bullets : [];
      if (curBullets.length < 6) {
        const nextIdx = curBullets.length;
        const nextBullets = [
          ...curBullets,
          { title: `Punto ${nextIdx + 1}`, text: 'Explicación breve del punto clave...', example: '' }
        ];
        handleSlideChange('bullets', nextBullets);
        focusCanvasField(`bullets.${nextIdx}.title`);
        showMessage(`Punto #${nextIdx + 1} añadido a la diapositiva.`);
      } else {
        handleAddSlide('bullets');
        showMessage('Nueva diapositiva de puntos añadida automáticamente.');
      }
      return;
    }

    if (blockType === 'two_columns' || (blockType === 'auto' && activeLayout === 'two_columns')) {
      const left = activeSlide.leftColumn || { badge: 'Columna A', title: 'Primer Bloque', text: '', items: [] };
      const right = activeSlide.rightColumn || { badge: 'Columna B', title: 'Segundo Bloque', text: '', items: [] };
      const nextLeftItems = [...(Array.isArray(left.items) ? left.items : []), `Punto A${(left.items?.length || 0) + 1}`];
      const nextRightItems = [...(Array.isArray(right.items) ? right.items : []), `Punto B${(right.items?.length || 0) + 1}`];
      handleSlidePatch({
        leftColumn: { ...left, items: nextLeftItems },
        rightColumn: { ...right, items: nextRightItems }
      });
      focusCanvasField(`leftColumn.items.${nextLeftItems.length - 1}`);
      showMessage('Fila comparativa añadida en ambas columnas.');
      return;
    }

    if (blockType === 'table_row' || (blockType === 'auto' && activeLayout === 'table')) {
      const curH = Array.isArray(activeSlide.table?.headers) && activeSlide.table.headers.length > 0
        ? activeSlide.table.headers
        : ['Concepto', 'Explicación', 'Ejemplo'];
      const curR = getTableRows(activeSlide.table);
      const nextIdx = curR.length;
      handleSlideChange('table', {
        headers: curH,
        rows: [...curR, curH.map((_, cIdx) => (cIdx === 0 ? `Término ${nextIdx + 1}` : 'Nuevo dato'))]
      });
      focusCanvasField(`table.cell.${nextIdx}.0`);
      showMessage(`Fila #${nextIdx + 1} añadida a la tabla.`);
      return;
    }

    if (blockType === 'quiz_option' || (blockType === 'auto' && activeLayout === 'quiz')) {
      const curOpts = Array.isArray(activeSlide.options) ? activeSlide.options : [];
      if (curOpts.length < 6) {
        const nextIdx = curOpts.length;
        const letter = String.fromCharCode(65 + nextIdx);
        handleSlideChange('options', [
          ...curOpts,
          { text: `Opción ${letter}`, isCorrect: false, explanation: '' }
        ]);
        focusCanvasField(`options.${nextIdx}.text`);
        showMessage(`Opción ${letter} añadida al Quiz.`);
      } else {
        handleAddSlide('quiz');
        showMessage('Nueva diapositiva de Quiz añadida.');
      }
      return;
    }

    if (blockType === 'auto' && (activeLayout === 'title' || activeLayout === 'section')) {
      handleAddSlide('cards');
      showMessage('Diapositiva de contenido añadida automáticamente.');
      return;
    }

    if (blockType === 'auto' && activeLayout === 'image_text') {
      setShowImageMenu(true);
      return;
    }

    handleInsertCanvasElement('textbox');
    showMessage('Cuadro de texto añadido al lienzo.');
  };

  // Permite aplicar una plantilla estructurada completa dentro del editor con 1 clic
  const handleApplyStarterTemplate = (templateId) => {
    const tpl = SLIDE_STARTER_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const defaultTitles = new Set([
      'Nueva Presentación',
      'Título de la Presentación',
      ...SLIDE_STARTER_TEMPLATES.map(t => t.name)
    ]);
    const cleanTopic = String(deckMeta.topic || '').trim();
    const cleanSlideTitle = String(activeSlide.title || '').trim();
    const currentTitle = (cleanTopic && !defaultTitles.has(cleanTopic))
      ? cleanTopic
      : ((cleanSlideTitle && !defaultTitles.has(cleanSlideTitle)) ? cleanSlideTitle : tpl.name);
    const builtSlides = tpl.buildSlides(currentTitle);
    updateSlidesWithHistory(builtSlides);
    setActiveSlideIdx(0);
    setSelectedElementId(null);
    setDeckMeta(prev => ({
      ...prev,
      theme: tpl.theme || prev.theme,
      topic: currentTitle
    }));
    focusCanvasField('title');
    showMessage(`Plantilla "${tpl.name}" aplicada (${builtSlides.length} diapositivas).`);
  };

  const handleResetSlideFormatting = () => {
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = {
        ...current,
        textStyles: {},
        bgColor: '',
        accentColor: '',
        titleAlign: undefined,
        titleSize: undefined
      };
      return copy;
    });
    showMessage('Formato de la diapositiva restablecido.');
  };

  const handleDeleteSlide = (idx) => {
    if (slides.length <= 1) return;
    updateSlidesWithHistory(prev => prev.filter((_, i) => i !== idx));
    setActiveSlideIdx(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, prev - 1);
      return Math.max(0, Math.min(prev, slides.length - 2));
    });
    setSelectedElementId(null);
  };

  const handleDuplicateSlide = (idx) => {
    if (!slides || !slides[idx]) return;
    const clone = JSON.parse(JSON.stringify(slides[idx]));
    clone.id = `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    clone.title = `${clone.title || 'Diapositiva'} (Copia)`;
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
    setActiveSlideIdx(idx + 1);
    setSelectedElementId(null);
  };

  const handleMoveSlide = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setActiveSlideIdx(targetIdx);
  };

  const handleInsertImageUrl = (url, target = 'auto') => {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) return;
    if (target === 'bg') {
      handleSlideChange('bgImage', cleanUrl);
      showMessage('Imagen de fondo aplicada.');
    } else if (target === 'slide' || (target === 'auto' && activeLayout === 'image_text' && !activeSlide.imageUrl)) {
      handleSlideChange('imageUrl', cleanUrl);
      showMessage('Imagen aplicada al diseño.');
    } else if (target === 'element' && selectedElement?.type === 'image') {
      handleUpdateElementField(selectedElement.id, 'imageUrl', cleanUrl);
      showMessage('Imagen reemplazada.');
    } else {
      handleInsertCanvasElement('image', { imageUrl: cleanUrl });
      showMessage('Imagen insertada en la diapositiva.');
    }
    setShowImageMenu(false);
    setImageUrlDraft('');
  };

  const handleUploadImageFile = async (file, target = 'slide') => {
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const isDemoPres = isDemoMode || presentation?.isDemoCreated || String(presentation?.id || '').startsWith('demo_') || String(presentation?.id || '').startsWith('demo-');
      const finalUrl = await uploadOrInlineSlideImage(file, isDemoPres);
      if (!finalUrl) throw new Error('Empty image URL');
      if (target === 'bg') {
        handleSlideChange('bgImage', finalUrl);
      } else if (target === 'slide' || (target === 'auto' && activeLayout === 'image_text' && !activeSlide.imageUrl)) {
        handleSlideChange('imageUrl', finalUrl);
      } else if (target === 'element' && selectedElement) {
        handleUpdateElementField(selectedElement.id, 'imageUrl', finalUrl);
      } else {
        handleInsertCanvasElement('image', { imageUrl: finalUrl });
      }
      setShowImageMenu(false);
      showMessage('Imagen añadida a la diapositiva.');
    } catch {
      showMessage('No se pudo procesar la imagen.');
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleStagePaste = (e) => {
    if (e.defaultPrevented) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImageFile(file, 'auto');
          return;
        }
      }
    }
  };

  const buildFullUpdatedPresentation = (customSlides = null) => {
    const rawSlides = Array.isArray(customSlides) ? customSlides : (slidesRef.current || slides);
    const matchedGroup = (academicGroups || []).find(g => g?.id === deckMeta.targetGroupId);
    const targetGroupName = deckMeta.targetGroupId === 'all'
      ? 'General'
      : (matchedGroup?.name || deckMeta.targetGroupName || 'General');

    const rawFirstTitle = String(rawSlides[0]?.title || '').trim();
    const effectiveTitle = (deckMeta.topic && deckMeta.topic.trim() && deckMeta.topic.trim() !== 'Nueva Presentación')
      ? deckMeta.topic.trim()
      : (rawFirstTitle && rawFirstTitle !== 'Título de la Presentación' ? rawFirstTitle : (deckMeta.topic.trim() || 'Nueva Presentación'));

    const finalSlides = rawSlides.map((sl, idx) => {
      if (
        idx === 0 &&
        effectiveTitle &&
        effectiveTitle !== 'Nueva Presentación' &&
        (!sl?.title || sl.title === 'Nueva Presentación' || sl.title === 'Título de la Presentación')
      ) {
        return { ...sl, title: effectiveTitle };
      }
      return sl;
    });

    const basePres = persistedPresRef.current || presentation || {};
    return {
      ...basePres,
      topic: effectiveTitle,
      language: deckMeta.language,
      theme: deckMeta.theme,
      fontFamily: deckMeta.fontFamily,
      transition: deckMeta.transition,
      transitionDuration: deckMeta.transitionDuration || 450,
      autoAdvanceSeconds: deckMeta.autoAdvanceSeconds || 0,
      bgPattern: deckMeta.bgPattern,
      targetGroupId: deckMeta.targetGroupId || 'all',
      targetGroupName,
      slides: finalSlides,
      slideCount: finalSlides.length
    };
  };

  const handleQuickSaveInPlace = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const basePres = persistedPresRef.current || presentation;
      const isDemoPres = isDemoMode || basePres?.isDemoCreated || String(basePres?.id || '').startsWith('demo_') || String(basePres?.id || '').startsWith('demo-');
      const compactedSlides = await compactDeckSlidesImages(slidesRef.current || slides, isDemoPres);
      const savedRes = await onSave(buildFullUpdatedPresentation(compactedSlides));
      if (savedRes && typeof savedRes === 'object' && savedRes.id) {
        persistedPresRef.current = savedRes;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const keyActionRef = useRef({});
  keyActionRef.current = {
    handleUndo,
    handleRedo,
    handleDeleteCanvasElement,
    handleCopySelection,
    handlePasteSelection,
    handleDuplicateCanvasElement,
    handleDuplicateSlide,
    handleUploadImageFile,
    handleQuickSaveInPlace,
    handleAutoAddContentBlock,
    selectedElementId,
    safeSlideIdx,
    showColorPalette,
    showHighlightPalette,
    showImageMenu,
    copiedFormat,
    clipboardItem
  };

  // Atajos de teclado y pegado global estilo PowerPoint / Google Slides (Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+S, Ctrl+Enter, Delete, Escape)
  useEffect(() => {
    const handleEditorKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      const {
        handleUndo: onUndo,
        handleRedo: onRedo,
        handleDeleteCanvasElement: onDel,
        handleCopySelection: onCopy,
        handleDuplicateCanvasElement: onDupEl,
        handleDuplicateSlide: onDupSlide,
        handleQuickSaveInPlace: onQuickSave,
        handleAutoAddContentBlock: onAutoAdd,
        selectedElementId: selId,
        safeSlideIdx: sIdx,
        showColorPalette: colorOpen,
        showHighlightPalette: hlOpen,
        showImageMenu: imgOpen,
        copiedFormat: hasCopiedFmt
      } = keyActionRef.current;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onQuickSave?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onAutoAdd?.('auto');
        return;
      }

      if (e.key === 'Escape') {
        if (colorOpen || hlOpen || imgOpen) {
          e.preventDefault();
          setShowColorPalette(false);
          setShowHighlightPalette(false);
          setShowImageMenu(false);
          return;
        }
        if (hasCopiedFmt) {
          e.preventDefault();
          setCopiedFormat(null);
          return;
        }
        if (!isTyping && selId) {
          e.preventDefault();
          setSelectedElementId(null);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isTyping) {
          e.preventDefault();
          if (e.shiftKey) onRedo();
          else onUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isTyping) {
          e.preventDefault();
          onRedo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (!isTyping) {
          e.preventDefault();
          onCopy();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (!isTyping) {
          e.preventDefault();
          if (selId) onDupEl(selId);
          else onDupSlide(sIdx);
        }
        return;
      }
      if (!isTyping && selId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onDel(selId);
      }
    };

    const handleWindowPaste = (e) => {
      if (e.defaultPrevented) return;
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              keyActionRef.current.handleUploadImageFile(file, 'auto');
              return;
            }
          }
        }
      }
      if (!isTyping && keyActionRef.current.clipboardItem) {
        e.preventDefault();
        keyActionRef.current.handlePasteSelection();
      }
    };

    window.addEventListener('keydown', handleEditorKeyDown);
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('keydown', handleEditorKeyDown);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, []);

  if (typeof document === 'undefined' || !document.body) return null;

  // Co-Piloto IA dentro del Editor
  const handleRunSlideAiAction = async (action = 'generate_new') => {
    if (action === 'generate_new' && !aiSlidePrompt.trim()) {
      showMessage('Escribe sobre qué quieres generar la nueva diapositiva.');
      return;
    }
    if (action === 'generate_full_deck') {
      const targetTopic = aiSlidePrompt.trim() || (deckMeta.topic !== 'Nueva Presentación' ? deckMeta.topic : '');
      if (!targetTopic) {
        showMessage('Escribe el tema en el cuadro de IA para generar las diapositivas.');
        return;
      }
      setIsAiWorking(true);
      try {
        const prompt = buildDeckAiPrompt({
          topic: targetTopic,
          language: deckMeta.language || 'Inglés',
          slideCount: 6,
          focusMode: 'balanced',
          extraNotes: ''
        });
        let parsedDeck = null;
        if (typeof callGemini === 'function') {
          try {
            const raw = await callGemini(prompt);
            parsedDeck = parseDeckAiResponse(raw);
          } catch {}
        }
        if (!Array.isArray(parsedDeck) || parsedDeck.length === 0) {
          parsedDeck = buildFallbackAiSlides({ topic: targetTopic, language: deckMeta.language || 'Inglés', slideCount: 6 });
        }
        updateSlidesWithHistory(parsedDeck);
        setActiveSlideIdx(0);
        setDeckMeta(prev => ({ ...prev, topic: parsedDeck[0]?.title || targetTopic }));
        setAiSlidePrompt('');
        showMessage(`Presentación de ${parsedDeck.length} diapositivas generada con IA.`);
      } catch {
        showMessage('No se pudo generar la presentación con IA.');
      } finally {
        setIsAiWorking(false);
      }
      return;
    }
    setIsAiWorking(true);
    try {
      const prompt = buildSingleSlideAiPrompt({
        action,
        promptText: aiSlidePrompt.trim(),
        targetLayout: aiSlideLayout,
        language: deckMeta.language || 'Inglés',
        currentSlide: activeSlide,
        presentationTopic: deckMeta.topic || activeSlide.title || 'Clase'
      });

      let parsedSlide = null;
      if (typeof callGemini === 'function') {
        try {
          const raw = await callGemini(prompt);
          parsedSlide = parseSingleSlideAiResponse(raw, slides.length);
        } catch (aiErr) {
          console.warn('Gemini slide action fallback:', aiErr);
        }
      }

      if (!parsedSlide) {
        if (action === 'to_two_columns') {
          parsedSlide = convertSlideLayout(activeSlide, 'two_columns', safeSlideIdx);
        } else if (action === 'to_table') {
          parsedSlide = convertSlideLayout(activeSlide, 'table', safeSlideIdx);
        } else if (action === 'to_quiz') {
          parsedSlide = convertSlideLayout(activeSlide, 'quiz', safeSlideIdx);
        } else if (action === 'generate_new') {
          const fallbackList = buildFallbackAiSlides({
            topic: aiSlidePrompt.trim() || activeSlide.title || deckMeta.topic,
            language: deckMeta.language,
            slideCount: 4
          });
          parsedSlide = aiSlideLayout !== 'auto'
            ? convertSlideLayout(fallbackList[1], aiSlideLayout, slides.length)
            : fallbackList[1];
        } else {
          // expand / summarize / translate: conservar el contenido real de la diapositiva activa
          const cloned = JSON.parse(JSON.stringify(activeSlide));
          if (action === 'expand' && !cloned.speakerNotes) {
            cloned.speakerNotes = `Profundizar en ${cloned.title || deckMeta.topic} con participación activa del grupo.`;
          }
          parsedSlide = cloned;
        }
      }

      if (action === 'generate_new') {
        updateSlidesWithHistory(prev => {
          const copy = [...prev];
          copy.splice(safeSlideIdx + 1, 0, parsedSlide);
          return copy;
        });
        setActiveSlideIdx(safeSlideIdx + 1);
        setAiSlidePrompt('');
        showMessage('Nueva diapositiva creada con IA.');
      } else {
        updateSlidesWithHistory(prev => {
          const copy = [...prev];
          copy[safeSlideIdx] = {
            ...parsedSlide,
            id: activeSlide.id || parsedSlide.id,
            elements: activeSlide.elements || []
          };
          return copy;
        });
        showMessage('Diapositiva actualizada con IA.');
      }
    } catch (err) {
      console.error(err);
      showMessage('No se pudo completar la acción con IA.');
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const basePres = persistedPresRef.current || presentation;
      const isDemoPres = isDemoMode || basePres?.isDemoCreated || String(basePres?.id || '').startsWith('demo_') || String(basePres?.id || '').startsWith('demo-');
      const compactedSlides = await compactDeckSlidesImages(slidesRef.current || slides, isDemoPres);
      const savedRes = await onSave(buildFullUpdatedPresentation(compactedSlides));
      if (savedRes && typeof savedRes === 'object' && savedRes.id) {
        persistedPresRef.current = savedRes;
      }
      if (savedRes !== false) {
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndProject = async () => {
    setIsSaving(true);
    let updated = buildFullUpdatedPresentation();
    try {
      const basePres = persistedPresRef.current || presentation;
      const isDemoPres = isDemoMode || basePres?.isDemoCreated || String(basePres?.id || '').startsWith('demo_') || String(basePres?.id || '').startsWith('demo-');
      const compactedSlides = await compactDeckSlidesImages(slidesRef.current || slides, isDemoPres);
      updated = buildFullUpdatedPresentation(compactedSlides);
      const savedRes = await onSave(updated);
      if (savedRes && typeof savedRes === 'object' && savedRes.id) {
        persistedPresRef.current = savedRes;
        updated = savedRes;
      }
    } catch {} finally {
      setIsSaving(false);
    }
    onProject(updated);
  };

  const modalBg = isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-800' : 'bg-white text-gray-900 border-gray-200';
  const panelBg = isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-gray-50/90 border-gray-200';
  const inputBg = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-[#AD3333]'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]';
  const ribbonBtn = isDarkMode
    ? 'hover:bg-gray-800 text-gray-200 border-gray-700/80'
    : 'hover:bg-gray-100 text-gray-700 border-gray-200';

  const activeTransitionType = activeSlide.transition || deckMeta.transition || 'fade';
  const previewTransitionClass = previewAnimKey > 0
    ? ({
        fade: 'animate-in fade-in duration-500',
        slide: 'animate-in fade-in slide-in-from-right-8 duration-500',
        push_up: 'animate-in fade-in slide-in-from-bottom-8 duration-500',
        wipe: 'animate-in fade-in slide-in-from-left-8 duration-500',
        split: 'animate-in fade-in zoom-in-95 duration-500',
        zoom: 'animate-in fade-in zoom-in-90 duration-500',
        flip: 'animate-in fade-in zoom-in-90 duration-500',
        none: ''
      }[activeTransitionType] || 'animate-in fade-in duration-300')
    : '';

  return createPortal(
    <div className="fixed inset-0 z-[999998] flex items-center justify-center p-1 sm:p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-[1440px] h-[96vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${modalBg}`}>

        {/* 1. BARRA SUPERIOR PRINCIPAL (Título, Metadatos, Deshacer/Rehacer, Presentar, Descargar, Guardar) */}
        <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 shrink-0 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 flex items-center justify-center font-bold shrink-0">
              <LayoutIcon size={18} />
            </div>
            <div className="min-w-0 flex-1 max-w-md">
              <input
                type="text"
                value={deckMeta.topic}
                onChange={(e) => handleDeckTopicChange(e.target.value)}
                onFocus={(e) => {
                  if ((e.target.value || '').trim() === 'Nueva Presentación') {
                    requestAnimationFrame(() => {
                      try { e.target.select(); } catch {}
                    });
                  }
                }}
                placeholder="Nombre de la presentación..."
                className="w-full bg-transparent text-sm sm:text-base font-extrabold truncate outline-none border-b border-transparent focus:border-[#AD3333] pb-0.5"
              />
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span>{slides.length} {slides.length === 1 ? 'diapositiva' : 'diapositivas'}</span>
                <span>•</span>
                <span>{SLIDE_THEMES[deckMeta.theme]?.name || 'Tema personalizado'}</span>
              </div>
            </div>

            {/* Deshacer / Rehacer */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${ribbonBtn}`}
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIdx >= history.length - 1}
                className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${ribbonBtn}`}
                title="Rehacer (Ctrl+Y)"
              >
                <Redo2 size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {academicGroups.length > 0 && (
              <select
                value={deckMeta.targetGroupId}
                onChange={(e) => setDeckMeta(prev => ({ ...prev, targetGroupId: e.target.value }))}
                className={`hidden lg:block px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none max-w-[160px] truncate ${inputBg}`}
                title="Grupo asignado"
              >
                <option value="all">Grupo: General</option>
                {academicGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                setRibbonTab('ia');
                setInspectorTab('ai');
                setShowRightInspector(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                ribbonTab === 'ia' || (showRightInspector && inspectorTab === 'ai')
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Abrir asistente de Inteligencia Artificial"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">Asistente IA</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRightInspector(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                showRightInspector
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Mostrar u ocultar el panel lateral de formulario y propiedades"
            >
              <ColumnsIcon size={14} />
              <span className="hidden md:inline">{showRightInspector ? 'Ocultar panel' : 'Panel lateral'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndProject}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Guardar y presentar en pantalla completa"
            >
              <Play size={14} className="text-[#AD3333]" />
              <span className="hidden sm:inline">Presentar</span>
            </button>

            <button
              type="button"
              onClick={() => exportReviewToPresentation(buildFullUpdatedPresentation())}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Descargar archivo PowerPoint (.pptx)"
            >
              <Download size={14} />
              <span className="hidden md:inline">.pptx</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              <span>Guardar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Cerrar editor"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2. CINTA DE OPCIONES MULTIPESTAÑA ESTILO MICROSOFT POWERPOINT */}
        <div
          ref={ribbonContainerRef}
          onMouseDown={(e) => {
            const tag = e.target?.tagName;
            if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.closest?.('label')) {
              e.preventDefault();
            }
          }}
          className={`border-b shrink-0 select-none ${panelBg}`}
        >
          {/* Inputs ocultos de carga de imágenes */}
          <input
            ref={elementImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadImageFile(f, 'new_element');
              e.target.value = '';
            }}
          />
          <input
            ref={replaceElementImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadImageFile(f, 'element');
              e.target.value = '';
            }}
          />
          <input
            ref={slideImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadImageFile(f, 'slide');
              e.target.value = '';
            }}
          />
          <input
            ref={bgImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadImageFile(f, 'bg');
              e.target.value = '';
            }}
          />

          {/* Fila superior de Pestañas de la Cinta PowerPoint */}
          <div className="flex items-center justify-between gap-2 px-3 pt-1.5 border-b border-gray-200/80 dark:border-gray-800 overflow-x-auto">
            <div className="flex items-center gap-1 shrink-0">
              {[
                { id: 'inicio', label: 'Inicio', icon: Type },
                { id: 'insertar', label: 'Insertar', icon: Plus },
                { id: 'diseno', label: 'Diseño', icon: Palette },
                { id: 'transiciones', label: 'Transiciones', icon: Layers },
                { id: 'ia', label: 'IA / Copilot', icon: Sparkles },
                { id: 'presentacion', label: 'Presentación y Vista', icon: Play }
              ].map(t => {
                const IconTab = t.icon;
                const isAct = ribbonTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRibbonTab(t.id)}
                    className={`px-3 py-1.5 rounded-t-xl text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all ${
                      isAct
                        ? 'border-[#AD3333] text-[#AD3333] dark:text-red-400 bg-white dark:bg-gray-900 shadow-2xs'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <IconTab size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Indicador del elemento o texto activo para formato individual */}
            <div className="flex items-center gap-2 pb-1 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                <Type size={12} />
                <span>
                  Editando:{' '}
                  <strong>
                    {selectedElement
                      ? `Objeto (${selectedElement.type})`
                      : (editableFields.find(f => f.key === activeTextField)?.label || 'Título')}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGridGuides(prev => !prev)}
                className={`p-1 rounded-lg border text-xs font-bold transition-colors ${
                  showGridGuides ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                }`}
                title="Mostrar u ocultar cuadrícula guía"
              >
                <Grid size={13} />
              </button>

              <select
                value={canvasZoom}
                onChange={(e) => setCanvasZoom(Number(e.target.value))}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none ${inputBg}`}
                title="Zoom del lienzo"
              >
                <option value={85}>85%</option>
                <option value={100}>100%</option>
                <option value={115}>115%</option>
              </select>
            </div>
          </div>

          {/* Cuerpo de la Cinta según la Pestaña Activa */}
          <div className="px-3 py-2 overflow-x-auto">
            {/* ==================== PESTAÑA 1: INICIO (Esenciales claros + Fila desplegable de formato avanzado) ==================== */}
            {ribbonTab === 'inicio' && (
              <div className="space-y-2 min-w-max">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* 1. Grupo Diapositiva y Diseño */}
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-200 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => handleAddSlide(activeLayout === 'title' ? 'cards' : activeLayout)}
                        className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                        title="Añadir nueva diapositiva"
                      >
                        <Plus size={14} />
                        <span>Nueva diapositiva</span>
                      </button>

                      <select
                        value={activeLayout}
                        onChange={(e) => handleSlideChange('layout', e.target.value)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                        title="Cambiar estructura de la diapositiva actual"
                      >
                        {SLIDE_LAYOUT_CATALOG.map(l => (
                          <option key={l.id} value={l.id}>Diseño: {l.shortName}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Grupo Tipografía Esencial */}
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-200 dark:border-gray-800">
                      <select
                        value={currentTargetStyle.fontFamily || 'sans'}
                        onChange={(e) => applyTargetStylePatch({ fontFamily: e.target.value })}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                        title="Fuente del texto seleccionado"
                      >
                        {Object.values(SLIDE_FONTS).map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>

                      <select
                        value={Number(currentTargetStyle.fontSize) || 18}
                        onChange={(e) => applyTargetStylePatch({ fontSize: Number(e.target.value) })}
                        className={`px-2 py-1.5 rounded-xl border text-xs font-bold outline-none w-16 ${inputBg}`}
                        title="Tamaño de fuente (px)"
                      >
                        {Array.from(new Set([...SLIDE_FONT_SIZES, Number(currentTargetStyle.fontSize) || 18]))
                          .sort((a, b) => a - b)
                          .map(sz => (
                            <option key={sz} value={sz}>{sz} px</option>
                          ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleStepTargetFontSize(-2)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${ribbonBtn}`}
                        title="Reducir tamaño de fuente"
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepTargetFontSize(2)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-black transition-colors ${ribbonBtn}`}
                        title="Aumentar tamaño de fuente"
                      >
                        A+
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTargetStylePatch({ bold: !currentTargetStyle.bold })}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          currentTargetStyle.bold ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                        }`}
                        title="Negrita (B)"
                      >
                        <Bold size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTargetStylePatch({ italic: !currentTargetStyle.italic })}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          currentTargetStyle.italic ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                        }`}
                        title="Cursiva (I)"
                      >
                        <Italic size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTargetStylePatch({ underline: !currentTargetStyle.underline })}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          currentTargetStyle.underline ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                        }`}
                        title="Subrayado (U)"
                      >
                        <Underline size={13} />
                      </button>

                      {/* Color de fuente individual */}
                      <div className="flex items-center gap-0.5 border rounded-xl px-1.5 py-0.5 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                        <label className="flex flex-col items-center cursor-pointer px-1" title="Cambiar color de este texto">
                          <span className="text-[11px] font-black leading-none">A</span>
                          <span
                            className="w-4 h-1 rounded-full mt-0.5"
                            style={{ backgroundColor: currentTargetStyle.color || '#AD3333' }}
                          />
                          <input
                            type="color"
                            value={`#${cleanHexNoHash(currentTargetStyle.color, 'AD3333')}`}
                            onChange={(e) => applyTargetStylePatch({ color: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowColorPalette(prev => !prev);
                            setShowHighlightPalette(false);
                            setShowImageMenu(false);
                          }}
                          className="p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                          title="Paleta de colores de fuente"
                        >
                          <ChevronDown size={11} />
                        </button>
                      </div>

                      {/* Color de resaltado */}
                      <div className="flex items-center gap-0.5 border rounded-xl px-1.5 py-0.5 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHighlightPalette(prev => !prev);
                            setShowColorPalette(false);
                            setShowImageMenu(false);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold px-1 py-0.5"
                          title="Color de resaltado del texto seleccionado"
                        >
                          <Highlighter size={12} className="text-amber-500" />
                          <span
                            className="w-3 h-3 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: currentTargetStyle.bgColor || 'transparent' }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 3. Alineación y Viñetas */}
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 border rounded-xl p-0.5 border-gray-200 dark:border-gray-700">
                        {[
                          { id: 'left', icon: AlignLeft, label: 'Izquierda' },
                          { id: 'center', icon: AlignCenter, label: 'Centro' },
                          { id: 'right', icon: AlignRight, label: 'Derecha' }
                        ].map(al => {
                          const IconComp = al.icon;
                          return (
                            <button
                              key={al.id}
                              type="button"
                              onClick={() => applyTargetStylePatch({ align: al.id })}
                              className={`p-1.5 rounded-lg transition-colors ${
                                currentTargetStyle.align === al.id ? 'bg-[#AD3333] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                              }`}
                              title={`Alinear ${al.label}`}
                            >
                              <IconComp size={13} />
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleBulletsPrefix(false)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${ribbonBtn}`}
                        title="Añadir o quitar viñetas (•)"
                      >
                        <List size={13} />
                      </button>
                    </div>

                    {/* 4. Acciones contextuales del objeto libre seleccionado */}
                    {selectedElement && (
                      <div className="flex items-center gap-1 pl-2.5 border-l border-gray-200 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => handleReorderCanvasElement(selectedElement.id, 'front')}
                          className={`p-1.5 rounded-lg border text-xs ${ribbonBtn}`}
                          title="Traer al frente"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCanvasElement(selectedElement.id)}
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                          title="Eliminar objeto seleccionado (Supr)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botón para mostrar/ocultar herramientas secundarias de formato */}
                  <button
                    type="button"
                    onClick={() => setShowMoreFormatTools(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 shrink-0 transition-colors ${
                      showMoreFormatTools
                        ? 'bg-[#AD3333]/10 border-[#AD3333]/40 text-[#AD3333] dark:text-red-300'
                        : ribbonBtn
                    }`}
                    title="Mostrar herramientas adicionales de portapapeles, interlineado y formato avanzado"
                  >
                    <span>Más formato</span>
                    <ChevronDown size={12} className={`transition-transform ${showMoreFormatTools ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Fila secundaria desplegable: Portapapeles, Selector de campo, Tachado, Mayúsculas, Interlineado y Limpieza */}
                {showMoreFormatTools && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200/70 dark:border-gray-800/80 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={handlePasteSelection}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${ribbonBtn}`}
                        title="Pegar objeto o diapositiva copiada (Ctrl+V)"
                      >
                        <Clipboard size={12} className="text-[#AD3333]" />
                        <span>Pegar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopySelection}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${ribbonBtn}`}
                        title="Copiar objeto o diapositiva"
                      >
                        <Copy size={12} />
                        <span>Copiar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFormatPainter}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                          copiedFormat
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : ribbonBtn
                        }`}
                        title="Copiar formato del texto actual para aplicarlo a otro"
                      >
                        <Wand2 size={12} />
                        <span>{copiedFormat ? 'Aplicar formato...' : 'Copiar formato'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                      <span className="text-[11px] font-bold text-gray-400">Campo:</span>
                      <select
                        value={selectedElement ? `__el_${selectedElement.id}` : activeTextField}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('__el_')) {
                            setSelectedElementId(val.replace('__el_', ''));
                          } else {
                            setSelectedElementId(null);
                            setActiveTextField(val);
                          }
                        }}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none max-w-[165px] truncate ${inputBg}`}
                        title="Selecciona qué texto de la diapositiva quieres personalizar"
                      >
                        {selectedElement && (
                          <option value={`__el_${selectedElement.id}`}>Objeto ({selectedElement.type})</option>
                        )}
                        {editableFields.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => applyTargetStylePatch({ strikethrough: !currentTargetStyle.strikethrough })}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          currentTargetStyle.strikethrough ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                        }`}
                        title="Tachado (S)"
                      >
                        <Strikethrough size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleTargetCase}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-black transition-colors ${ribbonBtn}`}
                        title="Cambiar entre MAYÚSCULAS, minúsculas y Tipo Título (Aa)"
                      >
                        Aa
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTargetStylePatch({ align: 'justify' })}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          currentTargetStyle.align === 'justify' ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                        }`}
                        title="Justificar texto"
                      >
                        <AlignJustify size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBulletsPrefix(true)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${ribbonBtn}`}
                        title="Añadir o quitar numeración (1, 2, 3)"
                      >
                        <ListOrdered size={12} />
                      </button>
                      <select
                        value={Number(currentTargetStyle.lineHeight) || 1.3}
                        onChange={(e) => applyTargetStylePatch({ lineHeight: Number(e.target.value) })}
                        className={`px-1.5 py-1 rounded-lg border text-[11px] font-bold outline-none ${inputBg}`}
                        title="Interlineado"
                      >
                        <option value={1}>1.0x</option>
                        <option value={1.15}>1.15x</option>
                        <option value={1.2}>1.2x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.3}>1.3x</option>
                        <option value={1.35}>1.35x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={1.8}>1.8x</option>
                        <option value={2}>2.0x</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleClearTargetFormatting}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${ribbonBtn}`}
                        title="Borrar formato del texto seleccionado"
                      >
                        <Eraser size={12} />
                        <span>Limpiar texto</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetSlideFormatting}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${ribbonBtn}`}
                        title="Restablecer colores y estilos de toda esta diapositiva"
                      >
                        <RotateCcw size={12} />
                        <span>Restablecer diapositiva</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== PESTAÑA 2: INSERTAR (Diapositiva, Tabla, Imágenes, Formas, Insignias, Notas, WordArt) ==================== */}
            {ribbonTab === 'insertar' && (
              <div className="flex items-center gap-2 min-w-max">
                {/* Diapositivas y Tablas */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleAddSlide('cards')}
                    className="px-2.5 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Nueva Diapositiva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeLayout === 'table') {
                        const curH = activeSlide.table?.headers || ['Col 1', 'Col 2', 'Col 3'];
                        const curR = getTableRows(activeSlide.table);
                        handleSlideChange('table', { headers: curH, rows: [...curR, curH.map(() => 'Nuevo dato')] });
                      } else {
                        handleAddSlide('table');
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                  >
                    <TableIcon size={13} className="text-blue-500" />
                    <span>{activeLayout === 'table' ? '+ Fila de Tabla' : 'Tabla'}</span>
                  </button>
                  {activeLayout === 'table' && (
                    <button
                      type="button"
                      onClick={() => {
                        const curH = activeSlide.table?.headers || ['Col 1', 'Col 2'];
                        if (curH.length >= 5) return;
                        const curR = getTableRows(activeSlide.table);
                        handleSlideChange('table', {
                          headers: [...curH, `Col ${curH.length + 1}`],
                          rows: curR.map(r => [...(Array.isArray(r) ? r : []), ''])
                        });
                      }}
                      className={`px-2 py-1.5 rounded-xl border text-xs font-bold ${ribbonBtn}`}
                    >
                      + Columna
                    </button>
                  )}
                </div>

                {/* Imágenes (Subir PC, URL, Ilustraciones, Fondo) */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => elementImageInputRef.current?.click()}
                    disabled={isUploadingImg}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                    title="Subir imagen desde tu computador como objeto libre movible"
                  >
                    <Upload size={13} className="text-emerald-500" />
                    <span>Subir imagen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageMenu(prev => !prev);
                      setShowColorPalette(false);
                      setShowHighlightPalette(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                      showImageMenu ? 'bg-emerald-600 text-white border-emerald-600' : ribbonBtn
                    }`}
                    title="Pegar imagen por URL o elegir ilustración académica"
                  >
                    <ImageIcon size={13} className="text-teal-500" />
                    <span>URL / Galería Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => bgImageInputRef.current?.click()}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                    title="Subir imagen de fondo para esta diapositiva"
                  >
                    <ImageIcon size={13} className="text-purple-500" />
                    <span>Fondo de diapositiva</span>
                  </button>
                </div>

                {/* Cuadro de Texto, Formas y Notas */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('textbox')}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                  >
                    <Type size={13} className="text-[#AD3333]" />
                    <span>Cuadro de texto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('textbox', {
                      text: 'TÍTULO DESTACADO',
                      fontSize: 32,
                      bold: true,
                      align: 'center',
                      textColor: activeTheme.primary,
                      w: 55,
                      h: 18
                    })}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                    title="Insertar texto artístico grande (WordArt)"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>WordArt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('shape', { shapeType: 'rounded', text: 'Tarjeta' })}
                    className={`px-2 py-1.5 rounded-xl border text-xs font-bold ${ribbonBtn}`}
                  >
                    Rectángulo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('shape', { shapeType: 'circle', w: 18, h: 28, text: '1' })}
                    className={`px-2 py-1.5 rounded-xl border text-xs font-bold ${ribbonBtn}`}
                  >
                    Círculo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('shape', { shapeType: 'divider', w: 60, h: 6, text: '' })}
                    className={`px-2 py-1.5 rounded-xl border text-xs font-bold ${ribbonBtn}`}
                  >
                    Línea
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('note')}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${ribbonBtn}`}
                  >
                    <Pin size={13} className="text-amber-500" />
                    <span>Nota adhesiva</span>
                  </button>
                </div>

                {/* Insignias Académicas listas */}
                <div className="flex items-center gap-1">
                  {SLIDE_ACADEMIC_BADGES.slice(0, 4).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleInsertCanvasElement('badge', { text: b.text, fill: b.fill, textColor: b.textColor, w: 24, h: 10 })}
                      style={{ backgroundColor: b.fill, color: b.textColor }}
                      className="px-2 py-1 rounded-full text-[10px] font-black shadow-2xs hover:opacity-90 transition-opacity"
                      title={`Insertar insignia: ${b.text}`}
                    >
                      {b.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== PESTAÑA 3: DISEÑO (Temas, Plantillas Rápidas, Colores de Fondo/Acento, Patrón) ==================== */}
            {ribbonTab === 'diseno' && (
              <div className="flex items-center gap-2.5 min-w-max">
                {/* Plantillas estructurales en 1 clic */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <span className="text-[11px] font-black uppercase text-gray-400 mr-0.5">Plantillas:</span>
                  {SLIDE_STARTER_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyStarterTemplate(tpl.id)}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors ${ribbonBtn}`}
                      title={tpl.desc}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>

                {/* Galería rápida de los 8 Temas */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <span className="text-[11px] font-black uppercase text-gray-400 mr-1">Temas:</span>
                  {Object.values(SLIDE_THEMES).map(t => {
                    const isSelected = (activeSlide.theme || deckMeta.theme) === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setDeckMeta(prev => ({ ...prev, theme: t.id }));
                          if (activeSlide.theme) handleSlideChange('theme', undefined);
                        }}
                        className={`px-2 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-[#AD3333] ring-2 ring-[#AD3333]/25 bg-red-500/5'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-400'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: t.bg, borderColor: t.primary }}
                          className="w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0"
                        >
                          <span style={{ backgroundColor: t.primary }} className="w-1.5 h-1.5 rounded-full" />
                        </span>
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Colores personalizados de la diapositiva */}
                <div className="flex items-center gap-2 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <span>Fondo:</span>
                    <input
                      type="color"
                      value={`#${cleanHexNoHash(activeSlide.bgColor || activeTheme.bg, '0F172A')}`}
                      onChange={(e) => handleSlideChange('bgColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <span>Acento:</span>
                    <input
                      type="color"
                      value={`#${cleanHexNoHash(activeSlide.accentColor || activeTheme.primary, 'AD3333')}`}
                      onChange={(e) => handleSlideChange('accentColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  {(activeSlide.bgColor || activeSlide.accentColor) && (
                    <button
                      type="button"
                      onClick={() => handleSlidePatch({ bgColor: '', accentColor: '' })}
                      className="text-[11px] font-bold text-[#AD3333] hover:underline"
                    >
                      Restablecer
                    </button>
                  )}
                </div>

                {/* Textura / Patrón y Fondo */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500">Textura:</span>
                  {SLIDE_PATTERNS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDeckMeta(prev => ({ ...prev, bgPattern: p.id }))}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold ${
                        deckMeta.bgPattern === p.id ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                  {activeSlide.bgImage && (
                    <button
                      type="button"
                      onClick={() => handleSlideChange('bgImage', '')}
                      className="px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold"
                    >
                      Quitar imagen fondo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PESTAÑA 4: TRANSICIONES (Vista previa, Galería, Duración, Aplicar a todas) ==================== */}
            {ribbonTab === 'transiciones' && (
              <div className="flex items-center gap-2.5 min-w-max">
                <button
                  type="button"
                  onClick={() => setPreviewAnimKey(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  title="Reproducir vista previa de la transición en el lienzo"
                >
                  <Play size={13} />
                  <span>Vista previa</span>
                </button>

                <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />

                {/* Galería de Transiciones */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  {SLIDE_TRANSITION_GALLERY.map(tr => {
                    const currentTr = activeSlide.transition || deckMeta.transition || 'fade';
                    const isSelected = currentTr === tr.id;
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => {
                          handleSlideChange('transition', tr.id);
                          setDeckMeta(prev => ({ ...prev, transition: tr.id }));
                          setPreviewAnimKey(prev => prev + 1);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#AD3333] text-white border-[#AD3333] shadow-2xs'
                            : ribbonBtn
                        }`}
                        title={tr.desc}
                      >
                        {tr.name}
                      </button>
                    );
                  })}
                </div>

                {/* Duración y Aplicar a todas */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-gray-500">Duración:</span>
                    <select
                      value={activeSlide.transitionDuration || deckMeta.transitionDuration || 450}
                      onChange={(e) => {
                        const ms = Number(e.target.value);
                        handleSlideChange('transitionDuration', ms);
                        setDeckMeta(prev => ({ ...prev, transitionDuration: ms }));
                      }}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none ${inputBg}`}
                    >
                      <option value={250}>0.25 s (Rápida)</option>
                      <option value={450}>0.45 s (Normal)</option>
                      <option value={700}>0.70 s (Suave)</option>
                      <option value={1000}>1.00 s (Lenta)</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1 text-xs font-bold">
                    <span className="text-gray-500">Avance auto:</span>
                    <select
                      value={deckMeta.autoAdvanceSeconds || 0}
                      onChange={(e) => setDeckMeta(prev => ({ ...prev, autoAdvanceSeconds: Number(e.target.value) }))}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none ${inputBg}`}
                      title="Avanzar diapositivas automáticamente al presentar"
                    >
                      <option value={0}>Al hacer clic</option>
                      <option value={5}>Cada 5 s</option>
                      <option value={10}>Cada 10 s</option>
                      <option value={15}>Cada 15 s</option>
                      <option value={30}>Cada 30 s</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const tr = activeSlide.transition || deckMeta.transition || 'fade';
                      const dur = activeSlide.transitionDuration || deckMeta.transitionDuration || 450;
                      setDeckMeta(prev => ({ ...prev, transition: tr, transitionDuration: dur }));
                      updateSlidesWithHistory(prev => prev.map(s => ({ ...s, transition: tr, transitionDuration: dur })));
                      showMessage('Transición aplicada a todas las diapositivas.');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold ${ribbonBtn}`}
                  >
                    Aplicar a todas
                  </button>
                </div>
              </div>
            )}

            {/* ==================== PESTAÑA 5: IA / COPILOT (Generación y Transformación en 1 Clic) ==================== */}
            {ribbonTab === 'ia' && (
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-gray-800">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  <input
                    type="text"
                    value={aiSlidePrompt}
                    onChange={(e) => setAiSlidePrompt(e.target.value)}
                    placeholder="Escribe el tema para generar con IA..."
                    disabled={isAiWorking}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium outline-none w-60 ${inputBg}`}
                  />
                  <button
                    type="button"
                    disabled={isAiWorking || !aiSlidePrompt.trim()}
                    onClick={() => handleRunSlideAiAction('generate_new')}
                    className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1"
                    title="Añade una nueva diapositiva sobre este tema"
                  >
                    {isAiWorking ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    <span>+ Diapositiva IA</span>
                  </button>
                  <button
                    type="button"
                    disabled={isAiWorking}
                    onClick={() => handleRunSlideAiAction('generate_full_deck')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1"
                    title="Genera automáticamente una presentación completa de 6 diapositivas sobre el tema escrito"
                  >
                    <Sparkles size={12} />
                    <span>Presentación completa</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'expand', label: 'Ampliar contenido' },
                    { id: 'summarize', label: 'Sintetizar' },
                    { id: 'to_two_columns', label: 'A 2 Columnas' },
                    { id: 'to_table', label: 'A Tabla' },
                    { id: 'to_quiz', label: 'Transformar en Quiz' },
                    { id: 'translate', label: `Traducir a ${deckMeta.language}` }
                  ].map(act => (
                    <button
                      key={act.id}
                      type="button"
                      disabled={isAiWorking}
                      onClick={() => handleRunSlideAiAction(act.id)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${ribbonBtn}`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== PESTAÑA 6: PRESENTACIÓN Y VISTA ==================== */}
            {ribbonTab === 'presentacion' && (
              <div className="flex items-center gap-2 min-w-max">
                <button
                  type="button"
                  onClick={handleSaveAndProject}
                  className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Play size={13} />
                  <span>Presentar en Pantalla Completa</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportReviewToPresentation(buildFullUpdatedPresentation())}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${ribbonBtn}`}
                >
                  <Download size={13} className="text-emerald-500" />
                  <span>Exportar PowerPoint (.pptx)</span>
                </button>

                <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                <button
                  type="button"
                  onClick={() => setShowSpeakerNotesBar(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    showSpeakerNotesBar ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300' : ribbonBtn
                  }`}
                >
                  <FileText size={13} />
                  <span>Notas del Orador</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGridGuides(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    showGridGuides ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
                  }`}
                >
                  <Grid size={13} />
                  <span>Guías de Cuadrícula</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRightInspector(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    showRightInspector ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300' : ribbonBtn
                  }`}
                >
                  <ColumnsIcon size={13} />
                  <span>{showRightInspector ? 'Ocultar Inspector Lateral' : 'Mostrar Inspector Lateral'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Barra desplegable de Paleta de Colores de Fuente Individual */}
          {showColorPalette && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-extrabold text-gray-500 mr-1">
                  Color para {selectedElement ? `Objeto (${selectedElement.type})` : (editableFields.find(f => f.key === activeTextField)?.label || 'Texto')}:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    applyTargetStylePatch({ color: '' });
                    setShowColorPalette(false);
                  }}
                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold hover:border-[#AD3333] mr-1 ${
                    !currentTargetStyle.color
                      ? 'border-[#AD3333] ring-1 ring-[#AD3333]/30'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  title="Restaurar color automático del tema"
                >
                  Automático
                </button>
                {SLIDE_COLOR_SWATCHES.map(c => {
                  const hexVal = typeof c === 'string' ? c : c.hex;
                  const swatchName = typeof c === 'string' ? c : (c.name || c.hex);
                  return (
                    <button
                      key={hexVal}
                      type="button"
                      onClick={() => {
                        applyTargetStylePatch({ color: hexVal });
                        setShowColorPalette(false);
                      }}
                      style={{ backgroundColor: hexVal }}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${
                        currentTargetStyle.color === hexVal ? 'ring-2 ring-[#AD3333] scale-110' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      title={`Aplicar color ${swatchName}`}
                    />
                  );
                })}
                <input
                  type="color"
                  value={`#${cleanHexNoHash(currentTargetStyle.color, 'AD3333')}`}
                  onChange={(e) => applyTargetStylePatch({ color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent ml-1"
                  title="Color personalizado"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowColorPalette(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Barra desplegable de Color de Resaltado / Fondo del Texto */}
          {showHighlightPalette && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold text-gray-500">Resaltado de texto:</span>
                {SLIDE_HIGHLIGHT_SWATCHES.map(sw => {
                  const isActiveHighlight = sw.color === 'transparent'
                    ? (!currentTargetStyle.bgColor || currentTargetStyle.bgColor === 'transparent')
                    : currentTargetStyle.bgColor === sw.color;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => {
                        applyTargetStylePatch({ bgColor: sw.color });
                        setShowHighlightPalette(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:border-[#AD3333] ${
                        isActiveHighlight
                          ? 'border-[#AD3333] ring-1 ring-[#AD3333]/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded border border-gray-300"
                        style={{ backgroundColor: sw.color || 'transparent' }}
                      />
                      <span>{sw.name}</span>
                    </button>
                  );
                })}
                <input
                  type="color"
                  value={`#${cleanHexNoHash(currentTargetStyle.bgColor, 'FEF08A')}`}
                  onChange={(e) => applyTargetStylePatch({ bgColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent ml-1"
                  title="Color de resaltado personalizado"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowHighlightPalette(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Menú rápido para Insertar Imágenes (PC, URL, Ilustraciones listas o Ctrl+V) */}
          {showImageMenu && (
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => elementImageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>Subir imagen libre desde PC</span>
                  </button>
                  {activeLayout === 'image_text' && (
                    <button
                      type="button"
                      onClick={() => slideImageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <ImageIcon size={13} />
                      <span>Subir al marco del diseño</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={imageUrlDraft}
                      onChange={(e) => setImageUrlDraft(e.target.value)}
                      placeholder="Pega aquí la URL de una imagen (https://...)"
                      className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none w-60 ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleInsertImageUrl(imageUrlDraft, 'auto')}
                      disabled={!imageUrlDraft.trim()}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold"
                    >
                      Insertar URL
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageMenu(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pt-1">
                <span className="text-[11px] font-extrabold text-gray-500 shrink-0">Ilustraciones listas:</span>
                {SLIDE_ACADEMIC_ILLUSTRATIONS.map(ill => (
                  <button
                    key={ill.id}
                    type="button"
                    onClick={() => handleInsertImageUrl(ill.url, 'auto')}
                    className="px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#AD3333] text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <img src={ill.url} alt={ill.name} className="w-6 h-4 rounded object-cover" />
                    <span>{ill.name}</span>
                  </button>
                ))}
                <span className="text-[10px] text-gray-400 ml-2 shrink-0">
                  Tip: También puedes copiar cualquier imagen y presionar Ctrl+V o arrastrarla al lienzo
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. ÁREA DE TRABAJO EN 3 PANELES (Miniaturas 16:9 + Lienzo Central WYSIWYG + Inspector Derecho Opcional) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* PANEL IZQUIERDO: Miniaturas Visuales 16:9 */}
          <aside className={`w-full lg:w-60 border-b lg:border-b-0 lg:border-r flex flex-row lg:flex-col justify-between p-2.5 shrink-0 overflow-x-auto lg:overflow-x-hidden ${panelBg}`}>
            <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto pr-1 flex-1 min-h-0">
              {slides.map((s, idx) => {
                const isCurrent = safeSlideIdx === idx;
                return (
                  <div
                    key={s.id || idx}
                    onClick={() => {
                      setActiveSlideIdx(idx);
                      setSelectedElementId(null);
                    }}
                    className={`group rounded-2xl p-2 border transition-all cursor-pointer shrink-0 w-44 lg:w-full ${
                      isCurrent
                        ? 'bg-red-50/80 dark:bg-red-950/30 border-[#AD3333] ring-2 ring-[#AD3333]/20 shadow-xs'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 px-0.5">
                      <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isCurrent ? 'bg-[#AD3333] text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                          title="Subir"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, 1)}
                          disabled={idx === slides.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                          title="Bajar"
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSlide(idx)}
                          className="p-1 text-gray-400 hover:text-blue-500"
                          title="Duplicar diapositiva"
                        >
                          <Copy size={11} />
                        </button>
                        {slides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(idx)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Eliminar diapositiva"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Miniatura 16:9 en Vivo */}
                    <div className="rounded-xl overflow-hidden border border-black/5 dark:border-white/5 pointer-events-none">
                      <SlideCanvasSurface
                        presentation={deckMeta}
                        slide={s}
                        slideIdx={idx}
                        totalSlides={slides.length}
                        appThemeMode={isDarkMode ? 'dark' : 'light'}
                        mode="thumbnail"
                      />
                    </div>

                    <p className="text-[11px] font-bold truncate pt-1.5 px-0.5">
                      {s.title || `Diapositiva ${idx + 1}`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Botón principal + Selector desplegable para añadir diapositiva */}
            <div className="hidden lg:block pt-2.5 mt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddSlide(activeLayout === 'title' ? 'cards' : activeLayout)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus size={14} />
                  <span>Añadir diapositiva</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSlidePicker(prev => !prev)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                    showAddSlidePicker ? 'bg-[#AD3333]/10 border-[#AD3333] text-[#AD3333]' : ribbonBtn
                  }`}
                  title="Elegir diseño para la nueva diapositiva"
                >
                  <ChevronDown size={14} className={`transition-transform ${showAddSlidePicker ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showAddSlidePicker && (
                <div className="grid grid-cols-2 gap-1 pt-0.5 animate-in fade-in duration-150">
                  {[
                    { id: 'cards', label: 'Tarjetas' },
                    { id: 'two_columns', label: '2 Columnas' },
                    { id: 'table', label: 'Tabla' },
                    { id: 'bullets', label: 'Puntos clave' },
                    { id: 'image_text', label: 'Imagen y texto' },
                    { id: 'quote', label: 'Cita / Dato' },
                    { id: 'quiz', label: 'Quiz' },
                    { id: 'blank', label: 'Lienzo libre' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => {
                        handleAddSlide(btn.id);
                        setShowAddSlidePicker(false);
                      }}
                      className="p-1.5 rounded-lg bg-gray-200/70 hover:bg-gray-300/80 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-bold flex items-center gap-1 transition-colors text-left"
                    >
                      <Plus size={10} className="text-[#AD3333] shrink-0" />
                      <span className="truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* PANEL CENTRAL: Lienzo 16:9 Interactivo WYSIWYG + Barra Contextual Rápida + Notas del Orador */}
          <main
            onPaste={handleStagePaste}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDragOverStage) setIsDragOverStage(true);
            }}
            onDragLeave={() => setIsDragOverStage(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverStage(false);
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith('image/')) {
                handleUploadImageFile(file, 'auto');
              }
            }}
            className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-200/70 dark:bg-gray-950/90 min-h-0 relative"
          >
            {isDragOverStage && (
              <div className="absolute inset-3 rounded-3xl border-2 border-dashed border-sky-500 bg-sky-500/10 z-40 flex items-center justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-2xl bg-sky-600 text-white text-xs font-black shadow-lg">
                  Suelta la imagen aquí para insertarla en la diapositiva
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-3 sm:p-5 flex flex-col items-center justify-center gap-3">
              <div
                key={`stage_${safeSlideIdx}_${previewAnimKey}`}
                ref={stageContainerRef}
                style={{
                  width: `${canvasZoom}%`,
                  maxWidth: canvasZoom > 100 ? '1100px' : '920px'
                }}
                className={`w-full shadow-2xl rounded-2xl transition-all duration-150 ring-1 ring-black/10 dark:ring-white/10 ${previewTransitionClass}`}
              >
                <SlideCanvasSurface
                  presentation={deckMeta}
                  slide={activeSlide}
                  slideIdx={safeSlideIdx}
                  totalSlides={slides.length}
                  appThemeMode={isDarkMode ? 'dark' : 'light'}
                  mode="editor"
                  onUpdateSlideField={handleSlideChange}
                  onPatchSlide={handleSlidePatch}
                  selectedElementId={selectedElementId}
                  onSelectElement={handleSelectCanvasElement}
                  onStartElementPointer={handleStartElementPointer}
                  onUpdateElementField={handleUpdateElementField}
                  activeTextField={activeTextField}
                  onSelectTextField={handleSelectTextField}
                  onTriggerSlideImageUpload={() => slideImageInputRef.current?.click()}
                  showGridGuides={showGridGuides}
                  snapGuides={snapGuides}
                />
              </div>

              {/* Barra Flotante Contextual: Añade bloques o diapositivas automáticamente con 1 clic */}
              <div className="flex flex-col items-center gap-1.5 max-w-full">
                <div className="flex items-center justify-center gap-1.5 flex-wrap px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/90 dark:border-gray-800 shadow-md max-w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeLayout === 'image_text') {
                        slideImageInputRef.current?.click();
                      } else {
                        handleAutoAddContentBlock('auto');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Atajo rápido: Ctrl+Enter"
                  >
                    <Plus size={13} />
                    <span>
                      {activeLayout === 'title' || activeLayout === 'section'
                        ? 'Añadir diapositiva de contenido'
                        : activeLayout === 'cards'
                          ? ((activeSlide.cards || []).length >= 4 ? 'Nueva diapositiva de tarjetas' : 'Añadir tarjeta')
                          : activeLayout === 'bullets'
                            ? ((activeSlide.bullets || []).length >= 6 ? 'Nueva diapositiva de puntos' : 'Añadir punto clave')
                            : activeLayout === 'two_columns'
                              ? 'Añadir fila comparativa'
                              : activeLayout === 'table'
                                ? 'Añadir fila a la tabla'
                                : activeLayout === 'quiz'
                                  ? ((activeSlide.options || []).length >= 6 ? 'Nueva diapositiva de Quiz' : 'Añadir opción de respuesta')
                                  : activeLayout === 'image_text'
                                    ? 'Subir / Cambiar imagen'
                                    : 'Añadir bloque de texto'}
                    </span>
                  </button>

                  {activeLayout !== 'title' && activeLayout !== 'section' && (
                    <button
                      type="button"
                      onClick={() => handleAddSlide(activeLayout)}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 transition-colors"
                      title="Añadir una nueva diapositiva"
                    >
                      <Plus size={13} className="text-[#AD3333]" />
                      <span>+ Diapositiva</span>
                    </button>
                  )}

                  <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('textbox')}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 transition-colors"
                    title="Añadir cuadro de texto movible"
                  >
                    <Type size={13} className="text-[#AD3333]" />
                    <span>+ Texto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowImageMenu(prev => !prev);
                      setShowColorPalette(false);
                      setShowHighlightPalette(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 transition-colors"
                    title="Insertar imagen o ilustración"
                  >
                    <ImageIcon size={13} className="text-emerald-500" />
                    <span>+ Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertCanvasElement('note')}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 transition-colors"
                    title="Añadir nota adhesiva"
                  >
                    <Pin size={13} className="text-amber-500" />
                    <span>+ Nota</span>
                  </button>
                </div>

                {slides.length === 1 && (
                  <div className="flex items-center justify-center gap-1.5 flex-wrap px-2.5 py-1 rounded-xl bg-white/75 dark:bg-gray-900/75 border border-gray-200/70 dark:border-gray-800/80 text-[11px]">
                    <span className="font-bold text-gray-400">O elige una estructura lista:</span>
                    {SLIDE_STARTER_TEMPLATES.filter(t => t.id !== 'blank_deck').map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyStarterTemplate(tpl.id)}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-bold transition-colors"
                        title={`Armar estructura: ${tpl.desc}`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Barra Inferior de Notas del Orador y Estado tipo PowerPoint */}
            <div className={`border-t px-4 py-2 shrink-0 ${panelBg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowSpeakerNotesBar(prev => !prev)}
                  className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:text-[#AD3333]"
                >
                  <FileText size={14} className="text-[#AD3333]" />
                  <span>Notas del orador (Diapositiva #{safeSlideIdx + 1})</span>
                  <ChevronDown size={14} className={`transition-transform ${showSpeakerNotesBar ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 hidden md:inline">
                    Haz clic sobre cualquier texto en la diapositiva para escribir directamente
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRightInspector(prev => !prev)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <ColumnsIcon size={13} />
                    <span>{showRightInspector ? 'Ocultar formulario lateral' : 'Editar en formulario lateral'}</span>
                  </button>
                </div>
              </div>

              {showSpeakerNotesBar && (
                <div className="pt-2">
                  <textarea
                    value={activeSlide.speakerNotes || ''}
                    onChange={(e) => handleSlideChange('speakerNotes', e.target.value)}
                    rows={2}
                    placeholder="Escribe aquí tus apuntes de apoyo para cuando estés proyectando esta diapositiva..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                  />
                </div>
              )}
            </div>
          </main>

          {/* PANEL DERECHO: Inspector de Propiedades (Contenido, Diseño, Tema, IA) */}
          <aside className={`${showRightInspector ? 'flex' : 'hidden'} w-full lg:w-88 xl:w-96 border-t lg:border-t-0 lg:border-l flex-col shrink-0 min-h-0 ${panelBg}`}>
            {/* Pestañas del Inspector */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div className="grid grid-cols-4 gap-1 flex-1">
                {[
                  { id: 'content', label: 'Contenido', icon: Edit3 },
                  { id: 'layout', label: 'Diseño', icon: LayoutIcon },
                  { id: 'theme', label: 'Tema', icon: Palette },
                  { id: 'ai', label: 'IA', icon: Sparkles }
                ].map(tab => {
                  const IconC = tab.icon;
                  const active = inspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setInspectorTab(tab.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-[#AD3333] text-white shadow-2xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                      }`}
                    >
                      <IconC size={13} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowRightInspector(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800"
                title="Cerrar panel lateral"
              >
                <X size={15} />
              </button>
            </div>

            {/* Cuerpo del Inspector */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

              {/* PESTAÑA 1: CONTENIDO (Propiedades del Objeto Seleccionado + Campos del Layout) */}
              {inspectorTab === 'content' && (
                <div className="space-y-4">
                  {/* Si hay un objeto libre seleccionado en el lienzo */}
                  {selectedElement && (
                    <div className="p-3.5 rounded-2xl border-2 border-sky-500/40 bg-sky-500/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Objeto seleccionado ({selectedElement.type})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedElementId(null)}
                          className="text-xs font-bold text-gray-400 hover:text-gray-600"
                        >
                          Listo
                        </button>
                      </div>

                      {selectedElement.type === 'image' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => replaceElementImageInputRef.current?.click()}
                              disabled={isUploadingImg}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                              <Upload size={12} />
                              <span>Cambiar imagen</span>
                            </button>
                            <select
                              value={selectedElement.fit || 'cover'}
                              onChange={(e) => handleUpdateElementField(selectedElement.id, 'fit', e.target.value)}
                              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                            >
                              <option value="cover">Rellenar (Cover)</option>
                              <option value="contain">Ajustar (Contain)</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={selectedElement.imageUrl || ''}
                            onChange={(e) => handleUpdateElementField(selectedElement.id, 'imageUrl', e.target.value)}
                            placeholder="URL o origen de la imagen..."
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-500">Texto del objeto:</label>
                            <textarea
                              value={selectedElement.text || ''}
                              onChange={(e) => handleUpdateElementField(selectedElement.id, 'text', e.target.value)}
                              rows={2}
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                            />
                          </div>

                          {selectedElement.type === 'shape' && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-500">Tipo de forma:</label>
                              <select
                                value={selectedElement.shapeType || 'rounded'}
                                onChange={(e) => handleUpdateElementField(selectedElement.id, 'shapeType', e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                              >
                                <option value="rounded">Rectángulo redondeado</option>
                                <option value="rect">Rectángulo recto</option>
                                <option value="pill">Píldora / Cápsula</option>
                                <option value="circle">Círculo / Elipse</option>
                                <option value="divider">Línea divisoria</option>
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Tamaño (px)</label>
                              <input
                                type="number"
                                min={10}
                                max={72}
                                value={selectedElement.fontSize || 16}
                                onChange={(e) => handleUpdateElementField(selectedElement.id, 'fontSize', Math.max(10, Math.min(72, Number(e.target.value) || 16)))}
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Relleno</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={`#${cleanHexNoHash(selectedElement.fill && selectedElement.fill !== 'transparent' ? selectedElement.fill : '#AD3333', 'AD3333')}`}
                                  onChange={(e) => handleUpdateElementField(selectedElement.id, 'fill', e.target.value)}
                                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateElementField(selectedElement.id, 'fill', 'transparent')}
                                  className="text-[10px] font-bold text-gray-400 hover:text-gray-600"
                                  title="Sin fondo"
                                >
                                  Vacío
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Color texto</label>
                              <input
                                type="color"
                                value={`#${cleanHexNoHash(selectedElement.textColor || activeTheme.textPrimary, 'FFFFFF')}`}
                                onChange={(e) => handleUpdateElementField(selectedElement.id, 'textColor', e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleReorderCanvasElement(selectedElement.id, 'front')}
                          className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-[11px] font-bold"
                        >
                          Al frente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderCanvasElement(selectedElement.id, 'back')}
                          className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-[11px] font-bold"
                        >
                          Al fondo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateCanvasElement(selectedElement.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold"
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCanvasElement(selectedElement.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 text-[11px] font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tarjeta rápida de formato del campo de texto activo (cuando no hay elemento libre seleccionado) */}
                  {!selectedElement && (
                    <div className="p-3 rounded-2xl border border-[#AD3333]/30 bg-red-500/5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#AD3333] dark:text-red-400 flex items-center gap-1.5">
                          <Type size={13} /> Formato individual del texto
                        </span>
                        <button
                          type="button"
                          onClick={handleClearTargetFormatting}
                          className="text-[10px] font-bold text-gray-500 hover:text-red-500 flex items-center gap-1"
                          title="Restaurar estilo original de este texto"
                        >
                          <RotateCcw size={11} /> Limpiar
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={activeTextField}
                          onChange={(e) => handleSelectTextField(e.target.value)}
                          className={`flex-1 px-2 py-1 rounded-lg border text-[11px] font-bold outline-none ${inputBg}`}
                        >
                          {editableFields.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={10}
                          max={72}
                          value={currentTargetStyle.fontSize}
                          onChange={(e) => applyTargetStylePatch({ fontSize: Math.max(10, Math.min(72, Number(e.target.value) || 16)) })}
                          className={`w-14 px-2 py-1 rounded-lg border text-[11px] font-bold text-center outline-none ${inputBg}`}
                          title="Tamaño de letra (px)"
                        />
                        <input
                          type="color"
                          value={`#${cleanHexNoHash(currentTargetStyle.color || activeTheme.primary, 'AD3333')}`}
                          onChange={(e) => applyTargetStylePatch({ color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                          title="Color de este texto"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campos Principales de la Diapositiva Activa */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Título de la diapositiva:
                        </label>
                        <input
                          type="text"
                          value={activeSlide.title || ''}
                          onFocus={() => handleSelectTextField('title')}
                          onChange={(e) => handleSlideChange('title', e.target.value)}
                          placeholder="Título principal..."
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Etiqueta:
                        </label>
                        <input
                          type="text"
                          value={activeSlide.badge || ''}
                          onFocus={() => handleSelectTextField('badge')}
                          onChange={(e) => handleSlideChange('badge', e.target.value)}
                          placeholder="Ej: Unidad 1"
                          className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                        />
                      </div>
                    </div>

                    {/* Opción de ocultar encabezado cuando el diseño es Lienzo Libre (blank) */}
                    {activeLayout === 'blank' && (
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={!!activeSlide.hideHeader}
                          onChange={(e) => handleSlideChange('hideHeader', e.target.checked)}
                          className="accent-[#AD3333] rounded"
                        />
                        <span>Ocultar barra superior y título para usar todo el lienzo 16:9</span>
                      </label>
                    )}

                    {/* Campos según Layout */}
                    {(activeLayout === 'title' || activeLayout === 'section') && (
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Subtítulo / Objetivo:
                          </label>
                          <textarea
                            value={activeSlide.subtitle !== undefined ? activeSlide.subtitle : (activeSlide.description || '')}
                            onFocus={() => handleSelectTextField('subtitle')}
                            onChange={(e) => handleSlideChange('subtitle', e.target.value)}
                            rows={3}
                            placeholder="Descripción y objetivos..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                          />
                        </div>
                        {activeLayout === 'title' && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              Descripción / Nota inferior de portada (opcional):
                            </label>
                            <input
                              type="text"
                              value={activeSlide.description || ''}
                              onFocus={() => handleSelectTextField('description')}
                              onChange={(e) => handleSlideChange('description', e.target.value)}
                              placeholder="Ej: Docente, semestre o nota complementaria..."
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-none ${inputBg}`}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {activeLayout === 'title_body' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Cuerpo de contenido:
                          </label>
                          <textarea
                            value={activeSlide.body !== undefined ? activeSlide.body : (activeSlide.content || '')}
                            onFocus={() => handleSelectTextField('body')}
                            onChange={(e) => handleSlideChange('body', e.target.value)}
                            rows={5}
                            placeholder="Texto principal..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Nota destacada inferior (Callout):
                          </label>
                          <input
                            type="text"
                            value={activeSlide.callout || ''}
                            onFocus={() => handleSelectTextField('callout')}
                            onChange={(e) => handleSlideChange('callout', e.target.value)}
                            placeholder="Idea clave para resaltar..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${inputBg}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeLayout === 'two_columns' && (
                      <div className="space-y-3">
                        {['leftColumn', 'rightColumn'].map((colKey, cIdx) => {
                          const col = activeSlide[colKey] || { badge: '', title: '', text: '', items: [] };
                          return (
                            <div key={colKey} className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#AD3333] dark:text-red-400">
                                {cIdx === 0 ? 'Columna Izquierda' : 'Columna Derecha'}
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="text"
                                  value={col.badge || ''}
                                  onFocus={() => handleSelectTextField(`${colKey}.badge`)}
                                  onChange={(e) => handleSlideChange(colKey, { ...col, badge: e.target.value })}
                                  placeholder="Etiqueta"
                                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  value={col.title || ''}
                                  onFocus={() => handleSelectTextField(`${colKey}.title`)}
                                  onChange={(e) => handleSlideChange(colKey, { ...col, title: e.target.value })}
                                  placeholder="Título de columna"
                                  className={`col-span-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                                />
                              </div>
                              <textarea
                                value={col.text || ''}
                                onFocus={() => handleSelectTextField(`${colKey}.text`)}
                                onChange={(e) => handleSlideChange(colKey, { ...col, text: e.target.value })}
                                rows={2}
                                placeholder="Resumen de la columna..."
                                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none resize-none ${inputBg}`}
                              />
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500">
                                  Viñetas (una por línea):
                                </label>
                                <textarea
                                  value={Array.isArray(col.items) ? col.items.join('\n') : ''}
                                  onFocus={() => handleSelectTextField(`${colKey}.items.0`)}
                                  onChange={(e) => handleSlideChange(colKey, { ...col, items: e.target.value.split('\n') })}
                                  rows={3}
                                  placeholder="Punto 1&#10;Punto 2"
                                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none resize-none ${inputBg}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeLayout === 'table' && (() => {
                      const inspectorTableRows = getTableRows(activeSlide.table);
                      return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Columnas y Filas de la Tabla:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const curHeaders = activeSlide.table?.headers || ['Col 1', 'Col 2'];
                                const curRows = inspectorTableRows;
                                if (curHeaders.length >= 5) return;
                                handleSlideChange('table', {
                                  headers: [...curHeaders, `Col ${curHeaders.length + 1}`],
                                  rows: curRows.map(r => [...(Array.isArray(r) ? r : []), ''])
                                });
                              }}
                              className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-[11px] font-bold"
                            >
                              + Columna
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const curHeaders = activeSlide.table?.headers || ['Col 1', 'Col 2', 'Col 3'];
                                const curRows = inspectorTableRows;
                                handleSlideChange('table', {
                                  headers: curHeaders,
                                  rows: [...curRows, curHeaders.map(() => 'Nuevo dato')]
                                });
                              }}
                              className="px-2 py-1 rounded-lg bg-[#AD3333] text-white text-[11px] font-bold"
                            >
                              + Fila
                            </button>
                          </div>
                        </div>

                        {/* Encabezados */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-gray-400">Encabezados</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(activeSlide.table?.headers || ['Concepto', 'Explicación', 'Ejemplo']).map((h, hIdx) => (
                              <div key={hIdx} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={h || ''}
                                  onFocus={() => handleSelectTextField(`table.header.${hIdx}`)}
                                  onChange={(e) => {
                                    const nextH = [...(activeSlide.table?.headers || [])];
                                    nextH[hIdx] = e.target.value;
                                    handleSlideChange('table', { ...(activeSlide.table || {}), headers: nextH, rows: inspectorTableRows });
                                  }}
                                  className={`w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
                                />
                                {(activeSlide.table?.headers || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextH = (activeSlide.table?.headers || []).filter((_, i) => i !== hIdx);
                                      const nextR = inspectorTableRows.map(r => (Array.isArray(r) ? r.filter((_, i) => i !== hIdx) : r));
                                      handleSlidePatch({
                                        table: { headers: nextH, rows: nextR },
                                        textStyles: shiftFieldTextStylesOnDelete(activeSlide.textStyles, 'table.col', hIdx)
                                      });
                                    }}
                                    className="text-gray-400 hover:text-red-500"
                                    title="Quitar columna"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Filas */}
                        <div className="space-y-2">
                          {inspectorTableRows.map((row, rIdx) => (
                            <div key={rIdx} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400">Fila #{rIdx + 1}</span>
                                {inspectorTableRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextRows = inspectorTableRows.filter((_, i) => i !== rIdx);
                                      handleSlidePatch({
                                        table: { ...(activeSlide.table || {}), rows: nextRows },
                                        textStyles: shiftFieldTextStylesOnDelete(activeSlide.textStyles, 'table.row', rIdx)
                                      });
                                    }}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {(activeSlide.table?.headers || ['Col 1', 'Col 2', 'Col 3']).map((hdr, cIdx) => (
                                  <input
                                    key={cIdx}
                                    type="text"
                                    value={(Array.isArray(row) ? row[cIdx] : '') || ''}
                                    onFocus={() => handleSelectTextField(`table.cell.${rIdx}.${cIdx}`)}
                                    onChange={(e) => {
                                      const nextRows = inspectorTableRows.map((r, ri) => {
                                        if (ri !== rIdx) return r;
                                        const copyR = Array.isArray(r) ? [...r] : [];
                                        copyR[cIdx] = e.target.value;
                                        return copyR;
                                      });
                                      handleSlideChange('table', { ...(activeSlide.table || {}), rows: nextRows });
                                    }}
                                    placeholder={`${hdr}...`}
                                    className={`w-full px-2.5 py-1 rounded-lg border text-xs ${inputBg}`}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })()}

                    {activeLayout === 'image_text' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => slideImageInputRef.current?.click()}
                            disabled={isUploadingImg}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Upload size={13} />
                            <span>Subir imagen</span>
                          </button>
                          <select
                            value={activeSlide.imagePosition || 'right'}
                            onChange={(e) => handleSlideChange('imagePosition', e.target.value)}
                            className={`px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                          >
                            <option value="right">Imagen a la derecha</option>
                            <option value="left">Imagen a la izquierda</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={activeSlide.imageUrl || ''}
                          onChange={(e) => handleSlideChange('imageUrl', e.target.value)}
                          placeholder="O pega la URL de la imagen..."
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                        />
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-gray-400">O elige una ilustración académica:</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {SLIDE_ACADEMIC_ILLUSTRATIONS.map((ill) => (
                              <button
                                key={ill.id}
                                type="button"
                                onClick={() => handleSlideChange('imageUrl', ill.dataUrl)}
                                className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#AD3333] flex flex-col items-center gap-1 text-center"
                              >
                                <img src={ill.dataUrl} alt={ill.label} className="w-full h-10 object-cover rounded-lg" />
                                <span className="text-[9px] font-bold truncate w-full">{ill.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={activeSlide.imageCaption || ''}
                          onFocus={() => handleSelectTextField('imageCaption')}
                          onChange={(e) => handleSlideChange('imageCaption', e.target.value)}
                          placeholder="Pie de imagen (opcional)..."
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                        />
                        <textarea
                          value={activeSlide.body !== undefined ? activeSlide.body : (activeSlide.content || '')}
                          onFocus={() => handleSelectTextField('body')}
                          onChange={(e) => handleSlideChange('body', e.target.value)}
                          rows={4}
                          placeholder="Explicación junto a la imagen..."
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none ${inputBg}`}
                        />
                      </div>
                    )}

                    {activeLayout === 'quote' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Cifra o Estadística Destacada (opcional):
                          </label>
                          <input
                            type="text"
                            value={activeSlide.statValue || ''}
                            onFocus={() => handleSelectTextField('statValue')}
                            onChange={(e) => handleSlideChange('statValue', e.target.value)}
                            placeholder="Ej: +24.8% o Regla #1"
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Cita o Frase Clave:
                          </label>
                          <textarea
                            value={activeSlide.quoteText || ''}
                            onFocus={() => handleSelectTextField('quoteText')}
                            onChange={(e) => handleSlideChange('quoteText', e.target.value)}
                            rows={3}
                            placeholder="Escribe la frase o conclusión..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Autor o Referencia:
                          </label>
                          <input
                            type="text"
                            value={activeSlide.quoteAuthor || ''}
                            onFocus={() => handleSelectTextField('quoteAuthor')}
                            onChange={(e) => handleSlideChange('quoteAuthor', e.target.value)}
                            placeholder="Fuente o autor..."
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeLayout === 'cards' && (
                      <div className="space-y-2.5">
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

                        {(activeSlide.cards || []).map((card, cIdx) => (
                          <div key={cIdx} className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-gray-400">
                                Tarjeta #{cIdx + 1}
                              </span>
                              {(activeSlide.cards || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCards = activeSlide.cards.filter((_, i) => i !== cIdx);
                                    handleSlidePatch({
                                      cards: newCards,
                                      textStyles: shiftFieldTextStylesOnDelete(activeSlide.textStyles, 'cards', cIdx)
                                    });
                                  }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={card.title || ''}
                              onFocus={() => handleSelectTextField(`cards.${cIdx}.title`)}
                              onChange={(e) => {
                                const newCards = activeSlide.cards.map((c, i) => i === cIdx ? { ...c, title: e.target.value } : c);
                                handleSlideChange('cards', newCards);
                              }}
                              placeholder="Título del concepto..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                            />
                            <textarea
                              value={card.text || ''}
                              onFocus={() => handleSelectTextField(`cards.${cIdx}.text`)}
                              onChange={(e) => {
                                const newCards = activeSlide.cards.map((c, i) => i === cIdx ? { ...c, text: e.target.value } : c);
                                handleSlideChange('cards', newCards);
                              }}
                              rows={2}
                              placeholder="Explicación..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none resize-none ${inputBg}`}
                            />
                            <input
                              type="text"
                              value={card.example || ''}
                              onFocus={() => handleSelectTextField(`cards.${cIdx}.example`)}
                              onChange={(e) => {
                                const newCards = activeSlide.cards.map((c, i) => i === cIdx ? { ...c, example: e.target.value } : c);
                                handleSlideChange('cards', newCards);
                              }}
                              placeholder="Ejemplo práctico (opcional)..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs italic outline-none ${inputBg}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeLayout === 'bullets' && (
                      <div className="space-y-2.5">
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

                        {(activeSlide.bullets || []).map((bullet, bIdx) => (
                          <div key={bIdx} className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-gray-400">
                                Punto #{bIdx + 1}
                              </span>
                              {(activeSlide.bullets || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newBullets = activeSlide.bullets.filter((_, i) => i !== bIdx);
                                    handleSlidePatch({
                                      bullets: newBullets,
                                      textStyles: shiftFieldTextStylesOnDelete(activeSlide.textStyles, 'bullets', bIdx)
                                    });
                                  }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={typeof bullet === 'object' ? bullet.title : bullet}
                              onFocus={() => handleSelectTextField(`bullets.${bIdx}.title`)}
                              onChange={(e) => {
                                const newBullets = activeSlide.bullets.map((b, i) => {
                                  if (i !== bIdx) return b;
                                  return typeof b === 'object' ? { ...b, title: e.target.value } : { title: e.target.value, text: '', example: '' };
                                });
                                handleSlideChange('bullets', newBullets);
                              }}
                              placeholder="Título del punto..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                            />
                            <textarea
                              value={typeof bullet === 'object' ? bullet.text : ''}
                              onFocus={() => handleSelectTextField(`bullets.${bIdx}.text`)}
                              onChange={(e) => {
                                const newBullets = activeSlide.bullets.map((b, i) => {
                                  if (i !== bIdx) return b;
                                  return typeof b === 'object' ? { ...b, text: e.target.value } : { title: String(b || ''), text: e.target.value, example: '' };
                                });
                                handleSlideChange('bullets', newBullets);
                              }}
                              rows={2}
                              placeholder="Explicación..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none resize-none ${inputBg}`}
                            />
                            <input
                              type="text"
                              value={typeof bullet === 'object' ? bullet.example : ''}
                              onFocus={() => handleSelectTextField(`bullets.${bIdx}.example`)}
                              onChange={(e) => {
                                const newBullets = activeSlide.bullets.map((b, i) => {
                                  if (i !== bIdx) return b;
                                  return typeof b === 'object' ? { ...b, example: e.target.value } : { title: String(b || ''), text: '', example: e.target.value };
                                });
                                handleSlideChange('bullets', newBullets);
                              }}
                              placeholder="Ejemplo (opcional)..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs italic outline-none ${inputBg}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeLayout === 'quiz' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Pregunta del Quiz:
                          </label>
                          <input
                            type="text"
                            value={activeSlide.question !== undefined ? activeSlide.question : (activeSlide.title || '')}
                            onFocus={() => handleSelectTextField('question')}
                            onChange={(e) => handleSlideChange('question', e.target.value)}
                            placeholder="¿Cuál es la pregunta?"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                          />
                        </div>

                        <div className="space-y-2">
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
                            <div key={oIdx} className="p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <input
                                  type="text"
                                  value={opt.text || ''}
                                  onFocus={() => handleSelectTextField(`options.${oIdx}.text`)}
                                  onChange={(e) => {
                                    const newOpts = (activeSlide.options || []).map((o, idx) => idx === oIdx ? { ...o, text: e.target.value } : o);
                                    handleSlideChange('options', newOpts);
                                  }}
                                  placeholder="Texto de la opción..."
                                  className={`flex-1 px-2.5 py-1 rounded-xl border text-xs font-medium outline-none ${inputBg}`}
                                />
                                <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0">
                                  <input
                                    type="radio"
                                    name={`correct_opt_${safeSlideIdx}`}
                                    checked={!!opt.isCorrect}
                                    onChange={() => {
                                      const newOpts = (activeSlide.options || []).map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                                      handleSlideChange('options', newOpts);
                                    }}
                                    className="accent-emerald-600"
                                  />
                                  <span className={opt.isCorrect ? 'text-emerald-600 font-black' : 'text-gray-400'}>OK</span>
                                </label>
                                {(activeSlide.options || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOpts = activeSlide.options.filter((_, i) => i !== oIdx);
                                      if (newOpts.length > 0 && !newOpts.some(o => o.isCorrect)) {
                                        newOpts[0] = { ...newOpts[0], isCorrect: true };
                                      }
                                      handleSlidePatch({
                                        options: newOpts,
                                        textStyles: shiftFieldTextStylesOnDelete(activeSlide.textStyles, 'options', oIdx)
                                      });
                                    }}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={opt.explanation || ''}
                                onFocus={() => handleSelectTextField(`options.${oIdx}.explanation`)}
                                onChange={(e) => {
                                  const newOpts = (activeSlide.options || []).map((o, idx) => idx === oIdx ? { ...o, explanation: e.target.value } : o);
                                  handleSlideChange('options', newOpts);
                                }}
                                placeholder="Explicación al elegir esta opción (opcional)..."
                                className={`w-full px-2.5 py-1 rounded-lg border text-[11px] outline-none ${inputBg}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: DISEÑO (11 Layouts + Insertar Objetos al Lienzo) */}
              {inspectorTab === 'layout' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                      Diseño de esta diapositiva
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {SLIDE_LAYOUT_CATALOG.map(l => {
                        const isSelected = activeLayout === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleSlideChange('layout', l.id)}
                            className={`p-2.5 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? 'border-[#AD3333] bg-red-500/10 text-[#AD3333] dark:text-red-300 ring-1 ring-[#AD3333]/30'
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className="text-xs font-extrabold">{l.shortName}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{l.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Insertar elementos libres en el lienzo
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('textbox')}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <Type size={14} className="text-[#AD3333]" />
                        <span>Cuadro de texto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('shape', { shapeType: 'rounded', text: 'Concepto' })}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <Layers size={14} className="text-blue-500" />
                        <span>Tarjeta libre</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('shape', { shapeType: 'circle', w: 18, h: 28, text: '1' })}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <Sparkles size={14} className="text-purple-500" />
                        <span>Círculo / Sello</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('note')}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <Pin size={14} className="text-amber-500" />
                        <span>Nota adhesiva</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('badge')}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Insignia</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCanvasElement('shape', { shapeType: 'divider', w: 60, h: 6, text: '' })}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-xs font-bold flex items-center gap-2"
                      >
                        <ColumnsIcon size={14} className="text-gray-500" />
                        <span>Línea divisoria</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: TEMA VISUAL, COLORES, PATRÓN Y TRANSICIÓN */}
              {inspectorTab === 'theme' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                      Paleta de Tema
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(SLIDE_THEMES).map(t => {
                        const isSelected = (activeSlide.theme || deckMeta.theme) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setDeckMeta(prev => ({ ...prev, theme: t.id }));
                              if (activeSlide.theme) handleSlideChange('theme', undefined);
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                              isSelected ? 'border-[#AD3333] ring-2 ring-[#AD3333]/25' : 'border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            <div
                              style={{ backgroundColor: t.bg, borderColor: t.cardBorder }}
                              className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
                            >
                              <span style={{ backgroundColor: t.primary }} className="w-3.5 h-3.5 rounded-full" />
                            </div>
                            <span className="text-xs font-bold leading-tight">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Personalización de Fondo y Acento de esta diapositiva */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Fondo y Textura
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold">Fondo propio</span>
                        <input
                          type="color"
                          value={`#${cleanHexNoHash(activeSlide.bgColor || SLIDE_THEMES[deckMeta.theme]?.bg, '0F172A')}`}
                          onChange={(e) => handleSlideChange('bgColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold">Color acento</span>
                        <input
                          type="color"
                          value={`#${cleanHexNoHash(activeSlide.accentColor || SLIDE_THEMES[deckMeta.theme]?.primary, 'AD3333')}`}
                          onChange={(e) => handleSlideChange('accentColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                    </div>

                    {(activeSlide.bgColor || activeSlide.accentColor) && (
                      <button
                        type="button"
                        onClick={() => handleSlidePatch({ bgColor: '', accentColor: '' })}
                        className="text-xs font-bold text-[#AD3333] hover:underline"
                      >
                        Restablecer colores del tema
                      </button>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Patrón del lienzo:</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {SLIDE_PATTERNS.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setDeckMeta(prev => ({ ...prev, bgPattern: p.id }))}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold ${
                              deckMeta.bgPattern === p.id ? 'bg-[#AD3333] text-white border-[#AD3333]' : 'border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Transición entre diapositivas:</label>
                      <select
                        value={activeSlide.transition || deckMeta.transition || 'fade'}
                        onChange={(e) => {
                          const tr = e.target.value;
                          handleSlideChange('transition', tr);
                          setDeckMeta(prev => ({ ...prev, transition: tr }));
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                      >
                        {SLIDE_TRANSITION_GALLERY.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Tamaño del título:</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'sm', label: 'Pequeño' },
                          { id: 'md', label: 'Medio' },
                          { id: 'lg', label: 'Grande' },
                          { id: 'xl', label: 'Extra' }
                        ].map(sz => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => {
                              updateSlidesWithHistory(prev => {
                                const copy = [...prev];
                                const current = copy[safeSlideIdx] || {};
                                const curStyles = { ...(current.textStyles || {}) };
                                if (curStyles.title && curStyles.title.fontSize !== undefined) {
                                  const nextTitleStyle = { ...curStyles.title };
                                  delete nextTitleStyle.fontSize;
                                  if (Object.keys(nextTitleStyle).length === 0) {
                                    delete curStyles.title;
                                  } else {
                                    curStyles.title = nextTitleStyle;
                                  }
                                }
                                copy[safeSlideIdx] = {
                                  ...current,
                                  titleSize: sz.id,
                                  textStyles: curStyles
                                };
                                return copy;
                              });
                            }}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold ${
                              (activeSlide.titleSize || 'lg') === sz.id ? 'bg-[#AD3333] text-white border-[#AD3333]' : 'border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: CO-PILOTO DE INTELIGENCIA ARTIFICIAL */}
              {inspectorTab === 'ai' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
                      <Sparkles size={14} />
                      <span>Generar con Inteligencia Artificial</span>
                    </div>
                    <textarea
                      value={aiSlidePrompt}
                      onChange={(e) => setAiSlidePrompt(e.target.value)}
                      rows={3}
                      placeholder="Escribe el tema o pega tus apuntes (ej: Present Perfect vs Past Simple en contextos financieros)..."
                      disabled={isAiWorking}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={aiSlideLayout}
                        onChange={(e) => setAiSlideLayout(e.target.value)}
                        disabled={isAiWorking}
                        className={`flex-1 px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                      >
                        <option value="auto">Diseño automático</option>
                        <option value="cards">Tarjetas</option>
                        <option value="two_columns">Dos columnas</option>
                        <option value="table">Tabla comparativa</option>
                        <option value="bullets">Puntos clave</option>
                        <option value="quote">Cita / Idea fuerza</option>
                        <option value="quiz">Quiz interactivo</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRunSlideAiAction('generate_new')}
                        disabled={isAiWorking || !aiSlidePrompt.trim()}
                        className="px-3.5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        {isAiWorking ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                        <span>+ 1 Diapositiva</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRunSlideAiAction('generate_full_deck')}
                      disabled={isAiWorking}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Sparkles size={13} />
                      <span>Generar presentación completa (6 diapositivas)</span>
                    </button>
                  </div>

                  {/* Acciones inteligentes sobre la diapositiva actual */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Mejorar diapositiva #{safeSlideIdx + 1} con IA
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'expand', label: 'Ampliar explicación y ejemplos', desc: 'Enriquece los textos y genera notas del orador' },
                        { id: 'summarize', label: 'Sintetizar para proyectar', desc: 'Resume las ideas para una lectura más ágil' },
                        { id: 'to_two_columns', label: 'Convertir en 2 Columnas', desc: 'Reorganiza esta diapositiva en un cuadro comparativo' },
                        { id: 'to_table', label: 'Convertir en Tabla de datos', desc: 'Estructura los conceptos en filas y columnas' },
                        { id: 'to_quiz', label: 'Transformar en pregunta Quiz', desc: 'Crea 4 opciones de respuesta sobre este contenido' },
                        { id: 'translate', label: `Traducir todo a ${deckMeta.language}`, desc: 'Adapta los textos al idioma seleccionado' }
                      ].map(act => (
                        <button
                          key={act.id}
                          type="button"
                          disabled={isAiWorking}
                          onClick={() => handleRunSlideAiAction(act.id)}
                          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#AD3333] text-left transition-colors flex items-center justify-between gap-2 disabled:opacity-40"
                        >
                          <div>
                            <div className="text-xs font-bold">{act.label}</div>
                            <div className="text-[10px] text-gray-500">{act.desc}</div>
                          </div>
                          <Sparkles size={14} className="text-[#AD3333] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </aside>
        </div>

      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// 5. MÓDULO PRINCIPAL DE DIAPOSITIVAS (Biblioteca + Creación Directa en Estudio + Creación IA)
// =========================================================================
export const ReviewsModule = ({
  role,
  isDarkMode,
  themeMode = 'light',
  glassCard,
  glassInput,
  redButton,
  reviews = [],
  setReviews,
  tasks = [],
  setTasks,
  isDemoMode = false,
  db,
  appId,
  academicGroups = [],
  myChatId = '',
  loggedInName = '',
  user = null,
  showMessage = () => {},
  confirmAction = () => {},
  callGemini,
  initialEditingPresentation = null,
  onClearInitialEditingPresentation = null
}) => {
  const [topic, setTopic] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [language, setLanguage] = useState('Inglés');
  const [slideCount, setSlideCount] = useState(6);
  const [selectedTheme, setSelectedTheme] = useState('unipamplona');
  const [focusMode, setFocusMode] = useState('balanced');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modo de creación con IA: null | 'ai'
  const [creationMode, setCreationMode] = useState(null);

  const [activePresentation, setActivePresentation] = useState(null);
  const [editingPresentation, setEditingPresentation] = useState(null);
  const [reviewTargetGroup, setReviewTargetGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  // Abre inmediatamente el Estudio de Diapositivas con una presentación lista para construir y editar en vivo
  const handleOpenNewPresentationStudio = (customGroupId, customTemplateId = 'blank_deck') => {
    const tpl = SLIDE_STARTER_TEMPLATES.find(t => t.id === customTemplateId) || SLIDE_STARTER_TEMPLATES[0];
    const effectiveGroupId = customGroupId || reviewTargetGroup || 'all';
    const targetGroup = (academicGroups || []).find(g => g?.id === effectiveGroupId);
    const targetGroupName = targetGroup ? targetGroup.name : 'General';
    const initialSlides = customTemplateId && customTemplateId !== 'blank_deck'
      ? tpl.buildSlides('Nueva Presentación')
      : [
          createDefaultSlide('title', 0, {
            badge: 'PRESENTACIÓN',
            title: 'Nueva Presentación',
            subtitle: 'Haz clic sobre cualquier texto para editarlo o añade nuevas diapositivas'
          })
        ];

    setCreationMode(null);
    setEditingPresentation({
      isNewDraft: true,
      topic: 'Nueva Presentación',
      language: language || 'Inglés',
      theme: selectedTheme || tpl.theme || 'unipamplona',
      fontFamily: 'sans',
      transition: 'fade',
      transitionDuration: 450,
      autoAdvanceSeconds: 0,
      bgPattern: 'none',
      slides: initialSlides,
      slideCount: initialSlides.length,
      targetGroupId: effectiveGroupId,
      targetGroupName
    });
  };

  useEffect(() => {
    if (!initialEditingPresentation) return;
    if (Array.isArray(initialEditingPresentation.slides)) {
      setEditingPresentation(initialEditingPresentation);
    } else if (initialEditingPresentation.openCreate) {
      const targetGrp = initialEditingPresentation.targetGroupId || 'all';
      if (initialEditingPresentation.targetGroupId) {
        setReviewTargetGroup(initialEditingPresentation.targetGroupId);
      }
      if (initialEditingPresentation.mode === 'ai') {
        setCreationMode('ai');
      } else {
        handleOpenNewPresentationStudio(targetGrp);
      }
    }
    if (typeof onClearInitialEditingPresentation === 'function') {
      onClearInitialEditingPresentation();
    }
  }, [initialEditingPresentation, onClearInitialEditingPresentation]);

  const canonicalTeacherId = getCanonicalTeacherId(myChatId || loggedInName || user?.displayName || user?.email);

  const buildCleanSlideWallDesc = (firstSlide, slideTotal, lang) => {
    const rawSub = String(firstSlide?.subtitle || firstSlide?.description || '').trim();
    const isPlaceholder = !rawSub ||
      rawSub === 'Subtítulo de la presentación' ||
      rawSub.toLowerCase().startsWith('haz clic para añadir') ||
      rawSub.toLowerCase().startsWith('haz clic sobre cualquier texto');
    return !isPlaceholder
      ? rawSub
      : `Presentación interactiva de ${slideTotal} ${slideTotal === 1 ? 'diapositiva' : 'diapositivas'} (${lang || 'Inglés'}).`;
  };

  const persistNewPresentation = async (docPayload) => {
    const now = Date.now();
    const { isNewDraft: _omitDraftFlag, ...cleanPayload } = docPayload || {};
    const compactedRawSlides = await compactDeckSlidesImages(cleanPayload.slides || [], isDemoMode);
    const hydratedSlides = hydrateSlidesFromFirestore(compactedRawSlides);
    const firestoreSlides = sanitizeSlidesForFirestore(hydratedSlides);
    const newDoc = {
      ...cleanPayload,
      slides: hydratedSlides,
      slideCount: hydratedSlides.length,
      author: getTeacherDisplayName(canonicalTeacherId),
      authorId: canonicalTeacherId,
      teacherId: canonicalTeacherId,
      ownerTeacherId: canonicalTeacherId,
      createdAt: now,
      ...(isDemoMode ? { isDemoCreated: true, expiresAt: now + DEMO_TTL_MS } : {})
    };

    if (isDemoMode) {
      newDoc.id = `demo_review_${now}_${Math.random().toString(36).slice(2, 6)}`;
      saveDemoSandboxItem('reviews', newDoc);
      if (typeof setReviews === 'function') {
        setReviews(prev => [newDoc, ...(prev || []).filter(r => String(r.id) !== String(newDoc.id))]);
      }
    } else {
      if (auth && !auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      const firestorePayload = {
        ...newDoc,
        slides: firestoreSlides
      };
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), firestorePayload);
      newDoc.id = docRef.id;
      if (typeof setReviews === 'function') {
        setReviews(prev => [newDoc, ...(prev || []).filter(r => String(r.id) !== String(newDoc.id))]);
      }
    }

    // Publicar automáticamente la presentación en el Muro / Publicaciones
    const wallTaskId = `rev_wall_${newDoc.id}`;
    const firstSlide = (newDoc.slides || [])[0] || {};
    const wallTitle = newDoc.topic || firstSlide.title || 'Presentación de Diapositivas';
    const wallDesc = buildCleanSlideWallDesc(firstSlide, (newDoc.slides || []).length, newDoc.language);
    const wallTask = {
      id: wallTaskId,
      type: 'slides',
      reviewId: newDoc.id,
      title: wallTitle,
      description: wallDesc,
      slideCount: (newDoc.slides || []).length,
      language: newDoc.language || 'Inglés',
      theme: newDoc.theme || 'unipamplona',
      targetGroupId: newDoc.targetGroupId || 'all',
      targetGroupName: newDoc.targetGroupName || 'General',
      author: getTeacherDisplayName(canonicalTeacherId),
      authorName: getTeacherDisplayName(canonicalTeacherId),
      authorId: canonicalTeacherId,
      authorRole: 'teacher',
      teacherId: canonicalTeacherId,
      ownerTeacherId: canonicalTeacherId,
      createdAt: now,
      reactions: {},
      comments: [],
      ...(isDemoMode ? { isDemoCreated: true, expiresAt: now + DEMO_TTL_MS } : {})
    };

    try {
      if (isDemoMode) {
        saveDemoSandboxItem('tasks', wallTask);
      } else {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', wallTaskId), wallTask);
      }
      if (typeof setTasks === 'function') {
        setTasks(prev => [wallTask, ...(prev || []).filter(t => String(t.id) !== String(wallTask.id) && String(t.reviewId) !== String(newDoc.id))]);
      }
    } catch (wallErr) {
      console.error('Error al publicar presentación en el muro:', wallErr);
    }

    return newDoc;
  };

  // Generar presentación completa con IA
  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      showMessage('Escribe el tema para las diapositivas.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = buildDeckAiPrompt({
        topic: topic.trim(),
        language,
        slideCount,
        focusMode,
        extraNotes
      });

      let parsed = null;
      if (typeof callGemini === 'function') {
        for (let attempt = 0; attempt < 2 && (!Array.isArray(parsed) || parsed.length === 0); attempt++) {
          try {
            const res = await callGemini(prompt);
            parsed = parseDeckAiResponse(res);
          } catch (aiErr) {
            console.warn('Intento IA diapositivas:', aiErr);
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = buildFallbackAiSlides({ topic: topic.trim(), language, slideCount });
      }

      const generatedTitle = parsed[0]?.title || topic.trim();
      const targetGroup = (academicGroups || []).find(g => g?.id === reviewTargetGroup);
      const targetGroupName = targetGroup ? targetGroup.name : 'General';

      const newDoc = await persistNewPresentation({
        topic: generatedTitle,
        language,
        theme: selectedTheme,
        fontFamily: 'sans',
        transition: 'fade',
        bgPattern: 'none',
        slides: parsed,
        slideCount: parsed.length,
        targetGroupId: reviewTargetGroup || 'all',
        targetGroupName
      });

      setTopic('');
      setExtraNotes('');
      setReviewTargetGroup('all');
      setCreationMode(null);
      showMessage('Diapositivas generadas con éxito.');
      setActivePresentation(newDoc);
    } catch (err) {
      console.error(err);
      showMessage('No se pudo generar la presentación. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicatePresentation = async (review) => {
    if (!review) return;
    try {
      const clonedSlides = JSON.parse(JSON.stringify(review.slides || []));
      const copyTitle = `${review.topic || clonedSlides[0]?.title || 'Presentación'} (Copia)`;
      if (clonedSlides[0]) clonedSlides[0].title = copyTitle;

      await persistNewPresentation({
        topic: copyTitle,
        language: review.language || 'Inglés',
        theme: review.theme || 'unipamplona',
        fontFamily: review.fontFamily || 'sans',
        transition: review.transition || 'fade',
        transitionDuration: Number(review.transitionDuration) || 450,
        autoAdvanceSeconds: Number(review.autoAdvanceSeconds) || 0,
        bgPattern: review.bgPattern || 'none',
        slides: clonedSlides,
        slideCount: clonedSlides.length,
        targetGroupId: review.targetGroupId || 'all',
        targetGroupName: review.targetGroupName || 'General'
      });
      showMessage('Presentación duplicada.');
    } catch (err) {
      console.error(err);
      showMessage('No se pudo duplicar la presentación.');
    }
  };

  const handleSaveEditedPresentation = async (updatedPres) => {
    if (!updatedPres) return false;
    try {
      // Si es una presentación nueva creada directamente desde el Estudio (sin ID persistido aún)
      if (!updatedPres.id || updatedPres.isNewDraft) {
        const firstSlideTitle = updatedPres.slides?.[0]?.title?.trim();
        const rawTopic = (updatedPres.topic || '').trim();
        const effectiveTopic = (rawTopic && rawTopic !== 'Nueva Presentación')
          ? rawTopic
          : (firstSlideTitle || rawTopic || 'Nueva Presentación');
        const targetGroup = (academicGroups || []).find(g => g?.id === (updatedPres.targetGroupId || reviewTargetGroup));
        const targetGroupName = targetGroup ? targetGroup.name : (updatedPres.targetGroupName || 'General');

        const created = await persistNewPresentation({
          topic: effectiveTopic,
          language: updatedPres.language || language || 'Inglés',
          theme: updatedPres.theme || 'unipamplona',
          fontFamily: updatedPres.fontFamily || 'sans',
          transition: updatedPres.transition || 'fade',
          transitionDuration: Number(updatedPres.transitionDuration) || 450,
          autoAdvanceSeconds: Number(updatedPres.autoAdvanceSeconds) || 0,
          bgPattern: updatedPres.bgPattern || 'none',
          slides: updatedPres.slides || [],
          slideCount: (updatedPres.slides || []).length,
          targetGroupId: updatedPres.targetGroupId || 'all',
          targetGroupName
        });
        setEditingPresentation(prev => (prev ? created : null));
        showMessage('Presentación creada y guardada.');
        return created;
      }

      const isDemoPres = isDemoMode || updatedPres.isDemoCreated || String(updatedPres.id).startsWith('demo_') || String(updatedPres.id).startsWith('demo-');
      const compactedRawSlides = await compactDeckSlidesImages(updatedPres.slides || [], isDemoPres);
      const slidesList = hydrateSlidesFromFirestore(compactedRawSlides);
      const firestoreSlides = sanitizeSlidesForFirestore(slidesList);
      const updates = {
        slides: slidesList,
        slideCount: slidesList.length,
        topic: updatedPres.topic || slidesList[0]?.title || '',
        language: updatedPres.language || 'Inglés',
        theme: updatedPres.theme || 'unipamplona',
        fontFamily: updatedPres.fontFamily || 'sans',
        transition: updatedPres.transition || 'fade',
        transitionDuration: Number(updatedPres.transitionDuration) || 450,
        autoAdvanceSeconds: Number(updatedPres.autoAdvanceSeconds) || 0,
        bgPattern: updatedPres.bgPattern || 'none',
        targetGroupId: updatedPres.targetGroupId || 'all',
        targetGroupName: updatedPres.targetGroupName || 'General'
      };
      if (isDemoPres) {
        const merged = { ...updatedPres, ...updates };
        if (typeof setReviews === 'function') {
          setReviews(prev => (prev || []).map(r => String(r.id) === String(updatedPres.id) ? merged : r));
        }
        saveDemoSandboxItem('reviews', merged);
      } else {
        const previousReview = (reviews || []).find(r => String(r?.id) === String(updatedPres.id));
        if (previousReview) {
          deleteReplacedStorageFiles(previousReview, firestoreSlides).catch(() => {});
        }
        if (auth && !auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', updatedPres.id), {
          ...updates,
          slides: firestoreSlides
        });
        if (typeof setReviews === 'function') {
          setReviews(prev => (prev || []).map(r => String(r.id) === String(updatedPres.id) ? { ...r, ...updates } : r));
        }
      }

      // Sincronizar también la publicación vinculada en el muro si existe
      const firstSlide = slidesList[0] || {};
      const wallUpdates = {
        title: updates.topic || 'Presentación de Diapositivas',
        description: buildCleanSlideWallDesc(firstSlide, slidesList.length, updates.language),
        slideCount: slidesList.length,
        language: updates.language,
        theme: updates.theme,
        targetGroupId: updates.targetGroupId,
        targetGroupName: updates.targetGroupName,
        isDeletedFromWall: false
      };
      const linkedWallTasks = (tasks || []).filter(t => String(t?.reviewId) === String(updatedPres.id) || String(t?.id) === `rev_wall_${updatedPres.id}`);
      for (const wt of linkedWallTasks) {
        const mergedTask = { ...wt, ...wallUpdates };
        if (isDemoPres || wt.isDemoCreated || String(wt.id).startsWith('demo_') || String(wt.reviewId || '').startsWith('demo')) {
          saveDemoSandboxItem('tasks', mergedTask);
        } else {
          try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', wt.id), wallUpdates, { merge: true });
          } catch {
            // ignore
          }
        }
      }
      if (typeof setTasks === 'function' && linkedWallTasks.length > 0) {
        setTasks(prev => (prev || []).map(t => (String(t?.reviewId) === String(updatedPres.id) || String(t?.id) === `rev_wall_${updatedPres.id}`) ? { ...t, ...wallUpdates } : t));
      }

      showMessage('Presentación guardada.');
      if (activePresentation?.id === updatedPres.id) {
        setActivePresentation({ ...updatedPres, ...updates });
      }
      return { ...updatedPres, ...updates };
    } catch (err) {
      console.error(err);
      showMessage('Error al guardar las diapositivas.');
      return false;
    }
  };

  const handleDelete = (id) => {
    confirmAction('¿Eliminar esta presentación de diapositivas?', async () => {
      try {
        const targetReview = (reviews || []).find(r => String(r?.id) === String(id));
        const isDemoPres = isDemoMode || targetReview?.isDemoCreated || String(id || '').startsWith('demo_') || String(id || '').startsWith('demo-');
        const linkedWallTasks = (tasks || []).filter(t => String(t?.reviewId) === String(id) || String(t?.id) === `rev_wall_${id}`);

        if (isDemoPres) {
          removeDemoSandboxItem('reviews', id);
          if (typeof setReviews === 'function') {
            setReviews(prev => (prev || []).filter(r => String(r.id) !== String(id)));
          }
          linkedWallTasks.forEach(wt => removeDemoSandboxItem('tasks', wt.id));
          removeDemoSandboxItem('tasks', `rev_wall_${id}`);
          if (typeof setTasks === 'function') {
            setTasks(prev => (prev || []).filter(t => String(t.reviewId) !== String(id) && String(t.id) !== `rev_wall_${id}`));
          }
          showMessage('Presentación eliminada del entorno Demo.');
          if (activePresentation?.id === id) setActivePresentation(null);
          if (editingPresentation?.id === id) setEditingPresentation(null);
          return;
        }
        await deleteAllStorageFilesInObject({ targetReview, linkedWallTasks });
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', id));
        for (const wt of linkedWallTasks) {
          try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', wt.id));
          } catch {
            // ignore
          }
        }
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', `rev_wall_${id}`));
        } catch {
          // ignore
        }
        setReviews(prev => prev.filter(r => r.id !== id));
        if (typeof setTasks === 'function') {
          setTasks(prev => (prev || []).filter(t => String(t.reviewId) !== String(id) && String(t.id) !== `rev_wall_${id}`));
        }
        showMessage('Presentación eliminada.');
        if (activePresentation?.id === id) setActivePresentation(null);
        if (editingPresentation?.id === id) setEditingPresentation(null);
      } catch {
        showMessage('Error al eliminar.');
      }
    });
  };

  // Grupos visibles y filtrado por membresía
  const myEnrolledGroups = (academicGroups || []).filter(g => {
    if (!g) return false;
    if (isDemoMode || String(g.id || '').startsWith('demo_') || String(g.id || '').startsWith('demo-')) return true;
    const membersList = Array.isArray(g.members)
      ? g.members
      : (g.members && typeof g.members === 'object' ? Object.keys(g.members) : []);
    if (membersList.length === 0) return false;
    const cleanMyId = (myChatId || '').toLowerCase().replace('@', '').trim();
    const cleanUid = (user?.uid || '').toLowerCase().trim();
    const cleanEmail = (user?.email || '').toLowerCase().trim();
    const cleanPrefix = (user?.email ? user.email.split('@')[0] : '').toLowerCase().trim();
    return membersList.some(m => {
      if (!m) return false;
      const cleanM = String(m).toLowerCase().replace('@', '').trim();
      return (cleanMyId && cleanM === cleanMyId) || (cleanUid && cleanM === cleanUid) || (cleanEmail && cleanM === cleanEmail) || (cleanPrefix && cleanM === cleanPrefix);
    });
  });
  const myEnrolledIds = myEnrolledGroups.map(g => g.id);
  const myEnrolledTeacherIds = new Set(myEnrolledGroups.map(g => getItemTeacherId(g)));

  const visibleReviews = (role === 'teacher'
    ? (reviews || []).filter(r => {
      if (!r) return false;
      if (isDemoMode || r.isDemoCreated || String(r.id || '').startsWith('demo-') || String(r.id || '').startsWith('demo_')) return true;
      const ownerId = getItemTeacherId(r);
      return ownerId === canonicalTeacherId;
    })
    : (reviews || []).filter(r => {
      if (r?.isDemoCreated || String(r?.id || '').startsWith('demo-') || String(r?.id || '').startsWith('demo_')) return true;
      const rGrpId = String(r.targetGroupId || '').trim();
      const rGrpName = String(r.targetGroupName || '').toLowerCase().trim();
      const reviewTeacherId = getItemTeacherId(r);
      const isGeneric = (!rGrpId || rGrpId === 'all') && (!rGrpName || rGrpName === 'global' || rGrpName === 'general' || rGrpName === 'todos' || rGrpName === 'todos los estudiantes');
      if (isGeneric) {
        return myEnrolledTeacherIds.size === 0 ? reviewTeacherId === 'teacher' : myEnrolledTeacherIds.has(reviewTeacherId);
      }
      if (myEnrolledIds.length === 0) return false;
      return myEnrolledGroups.some(g => g.id === rGrpId || `acad_${g.id}` === rGrpId || (rGrpName && (g.name || '').toLowerCase().trim() === rGrpName && getItemTeacherId(g) === reviewTeacherId));
    })
  ).filter(r => {
    if (groupFilter !== 'all' && String(r.targetGroupId || 'all') !== String(groupFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = String(r.slides?.[0]?.title || r.topic || '').toLowerCase();
      const sub = String(r.slides?.[0]?.subtitle || '').toLowerCase();
      const desc = String(r.slides?.[0]?.description || '').toLowerCase();
      return title.includes(q) || sub.includes(q) || desc.includes(q);
    }
    return true;
  });

  const selectableGroups = role === 'teacher' ? (academicGroups || []) : myEnrolledGroups;

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-6xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Diapositivas
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Estudio visual estilo PowerPoint y Google Slides, asistente IA y descarga en .pptx.
          </p>
        </div>

        {role === 'teacher' && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenNewPresentationStudio()}
              className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#AD3333] text-gray-800 dark:text-gray-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Plus size={15} className="text-[#AD3333]" />
              <span>Nueva presentación</span>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode(prev => prev === 'ai' ? null : 'ai')}
              className={`${redButton} text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0`}
            >
              <Sparkles size={15} />
              <span>Crear con IA</span>
            </button>
          </div>
        )}
      </div>

      {/* PANEL: GENERADOR DE DIAPOSITIVAS CON INTELIGENCIA ARTIFICIAL */}
      {role === 'teacher' && creationMode === 'ai' && (
        <form onSubmit={handleGenerate} className={`p-4 sm:p-5 rounded-2xl border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 ${glassCard}`}>
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-gray-800">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Wand2 size={15} className="text-[#AD3333]" />
              <span>Generar presentación con IA</span>
            </span>
            <button
              type="button"
              onClick={() => setCreationMode(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Tema de la presentación</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Past Simple vs Continuous, International Trade Vocabulary..."
                disabled={isGenerating}
                className={`w-full ${glassInput} text-xs sm:text-sm py-2.5 px-3.5`}
                autoFocus
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="Inglés">Inglés</option>
                <option value="Español">Español</option>
                <option value="Inglés y Español (Bilingüe)">Bilingüe (Inglés / Español)</option>
                <option value="Francés">Francés</option>
                <option value="Portugués">Portugués</option>
                <option value="Alemán">Alemán</option>
                <option value="Italiano">Italiano</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Extensión</label>
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
                <option value={12}>12 diapositivas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Enfoque pedagógico</label>
              <select
                value={focusMode}
                onChange={(e) => setFocusMode(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="balanced">Variado (Tarjetas, 2 Columnas, Tabla y Quiz)</option>
                <option value="grammar">Gramática, estructuras y ejemplos</option>
                <option value="vocabulary">Vocabulario técnico y definiciones</option>
                <option value="case_study">Caso práctico y análisis</option>
                <option value="quiz_heavy">Práctica intensiva con Quizzes</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Tema visual</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                {Object.values(SLIDE_THEMES).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Asignar a grupo</label>
              <select
                value={reviewTargetGroup}
                onChange={(e) => setReviewTargetGroup(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="all">General — Todos los grupos</option>
                {selectableGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                Apuntes o instrucciones adicionales (opcional)
              </label>
              <input
                type="text"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                disabled={isGenerating}
                placeholder="Pega vocabulario específico, reglas o subtemas que quieras incluir..."
                className={`w-full ${glassInput} text-xs py-2.5 px-3.5`}
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className={`${redButton} text-xs font-bold py-2.5 px-5 rounded-xl shadow-xs shrink-0 flex items-center justify-center gap-1.5`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Generar diapositivas</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Barra de Búsqueda y Filtro por Grupo (cuando hay presentaciones) */}
      {(reviews || []).length > 2 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar presentación por título..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium ${glassInput}`}
            />
          </div>
          {selectableGroups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="all">Todos los grupos</option>
              {selectableGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* BIBLIOTECA DE PRESENTACIONES CON MINIATURAS 16:9 REALES */}
      <section className="space-y-3">
        {visibleReviews.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={role !== 'teacher' && myEnrolledIds.length === 0 ? 'No estás asignado a ningún grupo' : 'No hay diapositivas creadas'}
            message={
              role === 'teacher'
                ? 'Usa "Nueva presentación" para diseñar desde cero o "Crear con IA" para generar tus diapositivas.'
                : myEnrolledIds.length === 0
                  ? 'Contacta a tu docente para que te asigne a un grupo y puedas ver el contenido.'
                  : 'No hay diapositivas disponibles para tus grupos todavía.'
            }
            isDarkMode={isDarkMode}
            actionLabel={role !== 'teacher' && myEnrolledIds.length === 0 ? 'Contactar docente' : undefined}
            onAction={role !== 'teacher' && myEnrolledIds.length === 0 ? () => showMessage('Contacta a tu docente en clase o por el chat para que te asigne a un grupo.') : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleReviews.map((review) => {
              const firstSlide = review.slides?.[0] || {};
              const displayTitle = firstSlide.title || review.topic || 'Presentación';
              const totalSlides = Array.isArray(review.slides) ? review.slides.length : (review.slideCount || 1);

              return (
                <div
                  key={review.id}
                  className="flex flex-col gap-2 group cursor-pointer"
                  onClick={() => setActivePresentation(review)}
                >
                  {/* MINIATURA REAL 16:9 CON TEMA Y TIPOGRAFÍA DE LA PRESENTACIÓN */}
                  <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs transition-all duration-200 group-hover:scale-[1.01] group-hover:shadow-md relative">
                    <SlideCanvasSurface
                      presentation={review}
                      slide={firstSlide}
                      slideIdx={0}
                      totalSlides={totalSlides}
                      appThemeMode={themeMode}
                      mode="card"
                    />
                  </div>

                  {/* Fila Inferior: Título y Acciones Rápidas */}
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#AD3333] dark:group-hover:text-red-400 transition-colors">
                        {displayTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {role === 'teacher' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingPresentation(review)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                            title="Abrir en Estudio de Diapositivas"
                          >
                            <Edit3 size={14} className="text-[#AD3333]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicatePresentation(review)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                            title="Duplicar presentación"
                          >
                            <Copy size={14} className="text-blue-500" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => exportReviewToPresentation(review)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        title="Descargar PowerPoint .pptx"
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

      {/* VISOR INTERACTIVO EN PANTALLA COMPLETA */}
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

      {/* ESTUDIO DE EDICIÓN ESTILO POWERPOINT / GOOGLE SLIDES */}
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
          isDemoMode={isDemoMode}
          academicGroups={selectableGroups}
          callGemini={callGemini}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};

export default ReviewsModule;

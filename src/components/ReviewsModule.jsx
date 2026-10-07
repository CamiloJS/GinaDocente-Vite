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
  AlignLeft, AlignCenter, AlignRight, Type, TableIcon, ColumnsIcon,
  LayoutIcon, Bold, Italic, Underline, ImageIcon, Upload, Search,
  Volume2, VolumeX, PenTool, RotateCcw, FileText, Eye
} from './Icons.jsx'
import {
  TEACHER_NAME,
  getCanonicalTeacherId,
  getTeacherDisplayName,
  getItemTeacherId,
  compressImage,
  uploadImageToStorage,
  cleanTextForTTS,
  detectLanguage,
  selectBestFemaleVoice
} from '../utils/helpers.js'
import EmptyState from './EmptyState.jsx'
import { doc, addDoc, collection, deleteDoc, updateDoc } from '../firebase/config.js'
import { DEMO_TTL_MS, saveDemoSandboxItem, removeDemoSandboxItem } from '../utils/demoData.js'
import {
  SLIDE_THEMES,
  SLIDE_FONTS,
  SLIDE_LAYOUT_CATALOG,
  SLIDE_TRANSITIONS,
  SLIDE_PATTERNS,
  SLIDE_STARTER_TEMPLATES,
  resolveSlideLayout,
  getSlidePatternStyle,
  cleanHexNoHash,
  resolveTheme,
  createDefaultSlide,
  convertSlideLayout,
  clampElementRect,
  createCanvasElement,
  buildDeckAiPrompt,
  parseDeckAiResponse,
  buildSingleSlideAiPrompt,
  parseSingleSlideAiResponse,
  buildFallbackAiSlides,
  normalizeSingleSlide
} from '../utils/slidesEngine.js'

export { resolveSlideLayout }

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

  review.slides.forEach((s, idx) => {
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

    const slideLayout = resolveSlideLayout(s, idx);
    const titleAlign = s.titleAlign || (slideLayout === 'title' || slideLayout === 'section' || slideLayout === 'quote' ? 'center' : 'left');

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
        slide.addText(String(s.badge).toUpperCase(), {
          x: 0.8, y: 1.55, w: 11.7, h: 0.4,
          fontSize: 12, fontFace, color: PRIMARY_COLOR, bold: true, align: titleAlign
        });
      }

      slide.addText(s.title || displayTitle, {
        x: 0.8, y: 2.1, w: 11.7, h: 2.2,
        fontSize: 38, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign,
        valign: 'middle', breakLine: true
      });

      const titleSubText = [
        s.subtitle,
        s.description && s.description !== s.subtitle ? s.description : ''
      ].filter(Boolean).join('\n\n') || 'Presentación Académica Interactiva';

      slide.addText(titleSubText, {
        x: 1.0, y: 4.5, w: 11.3, h: 1.5,
        fontSize: 18, fontFace, color: TEXT_MUTED, align: titleAlign, valign: 'top', breakLine: true
      });

    } else if (slideLayout === 'section') {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.0, w: 11.7, h: 5.5,
        fill: { color: CARD_BG },
        line: { color: PRIMARY_COLOR, width: 1.5 },
        rectRadius: 0.2
      });

      slide.addText(String(s.badge || `SECCIÓN ${idx + 1}`).toUpperCase(), {
        x: 1.2, y: 1.9, w: 10.9, h: 0.5,
        fontSize: 13, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
      });

      slide.addText(s.title || 'Encabezado de Sección', {
        x: 1.2, y: 2.5, w: 10.9, h: 1.6,
        fontSize: 34, fontFace, color: TEXT_MAIN, bold: true, align: 'center', valign: 'middle'
      });

      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 1.6, y: 4.2, w: 10.1, h: 1.2,
          fontSize: 17, fontFace, color: TEXT_MUTED, align: 'center'
        });
      }

    } else if (slideLayout === 'title_body') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1}`, {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Desarrollo del Tema', {
        x: 0.8, y: 0.9, w: 11.5, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

      const hasCallout = Boolean(s.callout && String(s.callout).trim());
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.8, w: 11.7, h: hasCallout ? 3.5 : 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      slide.addText(s.body || s.content || s.subtitle || '', {
        x: 1.1, y: 2.0, w: 11.1, h: hasCallout ? 3.1 : 4.3,
        fontSize: 16, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
      });

      if (hasCallout) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: 5.5, w: 11.7, h: 1.1,
          fill: { color: CARD_BG },
          line: { color: PRIMARY_COLOR, width: 1.5 },
          rectRadius: 0.12
        });
        slide.addText(`💡 ${s.callout}`, {
          x: 1.1, y: 5.65, w: 11.1, h: 0.8,
          fontSize: 14, fontFace, color: PRIMARY_COLOR, bold: true, valign: 'middle'
        });
      }

    } else if (slideLayout === 'two_columns') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1} • COMPARACIÓN`, {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Comparación', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

      const cols = [
        { data: s.leftColumn || { title: 'Columna A', text: '', items: [] }, x: 0.8, accent: PRIMARY_COLOR },
        { data: s.rightColumn || { title: 'Columna B', text: '', items: [] }, x: 6.8, accent: SECONDARY_COLOR }
      ];

      cols.forEach((col) => {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: col.x, y: 1.85, w: 5.7, h: 4.8,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.15
        });

        if (col.data.badge) {
          slide.addText(String(col.data.badge).toUpperCase(), {
            x: col.x + 0.35, y: 2.05, w: 5.0, h: 0.3,
            fontSize: 10, fontFace, color: col.accent, bold: true
          });
        }

        slide.addText(col.data.title || ' Bloque', {
          x: col.x + 0.35, y: 2.4, w: 5.0, h: 0.55,
          fontSize: 18, fontFace, color: TEXT_MAIN, bold: true
        });

        if (col.data.text) {
          slide.addText(col.data.text, {
            x: col.x + 0.35, y: 3.05, w: 5.0, h: 1.2,
            fontSize: 13, fontFace, color: TEXT_MUTED, valign: 'top'
          });
        }

        const listItems = Array.isArray(col.data.items) ? col.data.items.filter(Boolean) : [];
        if (listItems.length > 0) {
          const formattedList = listItems.map(it => `•  ${it}`).join('\n');
          slide.addText(formattedList, {
            x: col.x + 0.35, y: col.data.text ? 4.35 : 3.2, w: 5.0, h: 2.0,
            fontSize: 13, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
          });
        }
      });

    } else if (slideLayout === 'table') {
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1} • TABLA`, {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Tabla de Datos', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

      const headers = Array.isArray(s.table?.headers) && s.table.headers.length > 0
        ? s.table.headers
        : ['Concepto', 'Explicación', 'Ejemplo'];
      const rows = Array.isArray(s.table?.rows) ? s.table.rows : [];

      const pptxRows = [
        headers.map(h => ({
          text: String(h || ''),
          options: { fill: PRIMARY_COLOR, color: 'FFFFFF', bold: true, fontSize: 13, fontFace, valign: 'middle' }
        })),
        ...rows.map((r) =>
          headers.map((_, cIdx) => ({
            text: String((Array.isArray(r) ? r[cIdx] : '') || ''),
            options: { fill: CARD_BG, color: TEXT_MAIN, fontSize: 12, fontFace, valign: 'middle' }
          }))
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
      slide.addText(s.badge || `DIAPOSITIVA ${idx + 1}`, {
        x: 0.8, y: 0.55, w: 11.5, h: 0.3,
        fontSize: 10, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Análisis Visual', {
        x: 0.8, y: 0.9, w: 11.7, h: 0.75,
        fontSize: 25, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

      const imgLeft = s.imagePosition === 'left';
      const textX = imgLeft ? 6.6 : 0.8;
      const imgX = imgLeft ? 0.8 : 6.8;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: textX, y: 1.85, w: 5.7, h: 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      slide.addText(s.body || s.content || s.subtitle || '', {
        x: textX + 0.35, y: 2.1, w: 5.0, h: 3.2,
        fontSize: 15, fontFace, color: TEXT_MAIN, valign: 'top', breakLine: true
      });

      if (s.callout) {
        slide.addText(`📌 ${s.callout}`, {
          x: textX + 0.35, y: 5.4, w: 5.0, h: 0.9,
          fontSize: 12, fontFace, color: PRIMARY_COLOR, bold: true, valign: 'top'
        });
      }

      slide.addShape(pptx.ShapeType.roundRect, {
        x: imgX, y: 1.85, w: 5.7, h: 4.7,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });

      if (s.imageUrl && typeof s.imageUrl === 'string') {
        try {
          if (s.imageUrl.startsWith('data:image/') && !s.imageUrl.startsWith('data:image/svg')) {
            slide.addImage({ data: s.imageUrl, x: imgX + 0.25, y: 2.05, w: 5.2, h: 3.7 });
          } else if (/^https?:\/\//i.test(s.imageUrl)) {
            slide.addImage({ path: s.imageUrl, x: imgX + 0.25, y: 2.05, w: 5.2, h: 3.7 });
          }
        } catch {
          // ignore invalid image data
        }
      }
      if (s.imageCaption) {
        slide.addText(s.imageCaption, {
          x: imgX + 0.3, y: 5.9, w: 5.1, h: 0.5,
          fontSize: 11, fontFace, color: TEXT_MUTED, italic: true, align: 'center'
        });
      }

    } else if (slideLayout === 'quote') {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.9, y: 1.1, w: 11.5, h: 5.3,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1.5 },
        rectRadius: 0.2
      });

      if (s.statValue) {
        slide.addText(String(s.statValue), {
          x: 1.3, y: 1.5, w: 10.7, h: 1.2,
          fontSize: 44, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
        });
      }

      slide.addText(`“${s.quoteText || s.body || s.title || ''}”`, {
        x: 1.4, y: s.statValue ? 2.8 : 2.0, w: 10.5, h: 2.2,
        fontSize: 24, fontFace, color: TEXT_MAIN, bold: true, italic: true, align: 'center', valign: 'middle'
      });

      if (s.quoteAuthor || s.title) {
        slide.addText(`— ${s.quoteAuthor || s.title}`, {
          x: 1.4, y: 5.1, w: 10.5, h: 0.6,
          fontSize: 15, fontFace, color: TEXT_MUTED, bold: true, align: 'center'
        });
      }

    } else if (slideLayout === 'quiz') {
      slide.addText(`SLIDE ${idx + 1} • QUIZ`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: SECONDARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Pregunta de Repaso', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.7,
        fontSize: 24, fontFace, color: TEXT_MAIN, bold: true
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.8, w: 11.5, h: 1.4,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.15
      });
      slide.addText(s.question || s.content || '', {
        x: 1.1, y: 2.0, w: 10.9, h: 1.0,
        fontSize: 17, fontFace, color: PRIMARY_COLOR, bold: true
      });

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

        slide.addText(`${String.fromCharCode(65 + oIdx)})  ${opt.text}`, {
          x: posX + 0.2, y: posY + 0.12, w: 5.2, h: 0.8,
          fontSize: 14, fontFace, color: opt.isCorrect ? 'A7F3D0' : TEXT_MAIN,
          bold: opt.isCorrect, valign: 'middle'
        });
      });

    } else if (slideLayout === 'bullets') {
      slide.addText(s.badge || `SLIDE ${idx + 1}`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Conceptos Esenciales', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

      const items = s.bullets || (s.content ? s.content.split('\n').filter(Boolean).map(t => ({ title: t, text: '' })) : []);

      items.slice(0, 5).forEach((b, bIdx) => {
        const stepH = items.length > 3 ? 0.95 : 1.2;
        const posY = 1.9 + (bIdx * stepH);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: posY, w: 11.5, h: stepH - 0.15,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.12
        });

        slide.addText(`${bIdx + 1}`, {
          x: 1.0, y: posY + 0.15, w: 0.5, h: 0.5,
          fontSize: 15, fontFace, color: PRIMARY_COLOR, bold: true, align: 'center'
        });

        const bTitle = typeof b === 'object' ? b.title : b;
        const bText = (typeof b === 'object' && b.text) ? ` — ${b.text}` : '';
        const bEx = (typeof b === 'object' && b.example) ? ` [Ej: ${b.example}]` : '';

        slide.addText(`${bTitle}${bText}${bEx}`, {
          x: 1.6, y: posY + 0.1, w: 10.4, h: stepH - 0.3,
          fontSize: 14, fontFace, color: TEXT_MAIN, bold: false, valign: 'middle'
        });
      });

    } else if (slideLayout === 'blank') {
      if (!s.hideHeader && s.title) {
        slide.addText(s.title, {
          x: 0.8, y: 0.55, w: 11.7, h: 0.65,
          fontSize: 22, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
        });
      }
    } else {
      // 'cards'
      slide.addText(s.badge || `SLIDE ${idx + 1}`, {
        x: 0.8, y: 0.6, w: 11.5, h: 0.3,
        fontSize: 11, fontFace, color: PRIMARY_COLOR, bold: true
      });

      slide.addText(s.title || 'Explicación del Tema', {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, fontFace, color: TEXT_MAIN, bold: true, align: titleAlign
      });

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

        slide.addText(c.title || `Concepto ${cIdx + 1}`, {
          x: posX + 0.25, y: 2.25, w: cardW - 0.5, h: 0.65,
          fontSize: 16, fontFace, color: TEXT_MAIN, bold: true
        });

        slide.addText(c.text || '', {
          x: posX + 0.25, y: 2.95, w: cardW - 0.5, h: 2.1,
          fontSize: 13, fontFace, color: TEXT_MUTED, valign: 'top', breakLine: true
        });

        if (c.example) {
          slide.addText(`Ej: ${c.example}`, {
            x: posX + 0.25, y: 5.15, w: cardW - 0.5, h: 1.0,
            fontSize: 12, fontFace, color: PRIMARY_COLOR, italic: true, valign: 'top'
          });
        }
      });
    }

    // Exportar elementos libres del lienzo (slide.elements) en pulgadas (13.33 x 7.5)
    if (Array.isArray(s.elements) && s.elements.length > 0) {
      s.elements.forEach((el) => {
        if (!el) return;
        const xIn = Math.max(0, Math.min(13.0, ((Number(el.x) || 0) / 100) * 13.33));
        const yIn = Math.max(0, Math.min(7.2, ((Number(el.y) || 0) / 100) * 7.5));
        const wIn = Math.max(0.5, Math.min(13.33 - xIn, ((Number(el.w) || 25) / 100) * 13.33));
        const hIn = Math.max(0.35, Math.min(7.5 - yIn, ((Number(el.h) || 15) / 100) * 7.5));

        if (el.type === 'image' && el.imageUrl && typeof el.imageUrl === 'string') {
          try {
            if (el.imageUrl.startsWith('data:image/') && !el.imageUrl.startsWith('data:image/svg')) {
              slide.addImage({ data: el.imageUrl, x: xIn, y: yIn, w: wIn, h: hIn });
            } else if (/^https?:\/\//i.test(el.imageUrl)) {
              slide.addImage({ path: el.imageUrl, x: xIn, y: yIn, w: wIn, h: hIn });
            }
          } catch {
            // ignore
          }
          return;
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
          return;
        }

        const hasFill = el.fill && el.fill !== 'transparent';
        if (hasFill || el.type === 'shape' || el.type === 'note' || el.type === 'badge') {
          slide.addShape(
            el.shapeType === 'circle' ? pptx.ShapeType.ellipse : pptx.ShapeType.roundRect,
            {
              x: xIn,
              y: yIn,
              w: wIn,
              h: hIn,
              fill: { color: cleanHexNoHash(el.fill, CARD_BG) },
              line: {
                color: el.stroke && el.stroke !== 'transparent' ? cleanHexNoHash(el.stroke, PRIMARY_COLOR) : cleanHexNoHash(el.fill, CARD_BORDER),
                width: el.stroke && el.stroke !== 'transparent' ? 1.5 : 0
              },
              rectRadius: el.shapeType === 'pill' || el.type === 'badge' ? 0.4 : 0.12
            }
          );
        }

        if (el.text) {
          slide.addText(String(el.text), {
            x: xIn + 0.1,
            y: yIn + 0.06,
            w: Math.max(0.3, wIn - 0.2),
            h: Math.max(0.25, hIn - 0.12),
            fontSize: Math.max(10, Math.min(44, Number(el.fontSize) || 16)),
            fontFace,
            color: cleanHexNoHash(el.textColor, hasFill ? 'FFFFFF' : TEXT_MAIN),
            bold: !!el.bold,
            italic: !!el.italic,
            align: el.align || 'left',
            valign: 'middle'
          });
        }
      });
    }

    if (s.speakerNotes && typeof slide.addNotes === 'function') {
      try {
        slide.addNotes(String(s.speakerNotes));
      } catch {
        // ignore if addNotes fails
      }
    }
  });

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
const SlideCanvasSurface = ({
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
  selectedElementId = null,
  onSelectElement = null,
  onStartElementPointer = null,
  onUpdateElementField = null,
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

  const titleAlign = safeSlide.titleAlign || (layout === 'title' || layout === 'section' || layout === 'quote' ? 'center' : 'left');
  const alignClass = titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left';

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

  return (
    <div
      onClick={() => {
        if (isInteractiveEditor && onSelectElement) onSelectElement(null);
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
          <span
            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
            className="px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-black inline-flex items-center gap-1.5"
          >
            <Sparkles size={11} />
            <span>{safeSlide.badge || layoutLabelMap[layout] || 'Diapositiva'}</span>
          </span>
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
                  style={{ color: theme.textPrimary }}
                  className={`w-full bg-transparent font-black leading-tight tracking-tight outline-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
                />
                <textarea
                  value={safeSlide.subtitle !== undefined ? safeSlide.subtitle : (safeSlide.description || '')}
                  onChange={(e) => onUpdateSlideField('subtitle', e.target.value)}
                  rows={2}
                  placeholder="Haz clic para escribir un subtítulo u objetivo de la clase..."
                  style={{ color: theme.textSecondary }}
                  className={`w-full bg-transparent text-base sm:text-xl font-medium leading-relaxed outline-none resize-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${alignClass}`}
                />
                {safeSlide.subtitle && safeSlide.description && safeSlide.description !== safeSlide.subtitle && (
                  <textarea
                    value={safeSlide.description}
                    onChange={(e) => onUpdateSlideField('description', e.target.value)}
                    rows={2}
                    placeholder="Descripción adicional de portada..."
                    style={{ color: theme.textSecondary }}
                    className={`w-full bg-transparent text-xs sm:text-base font-medium leading-relaxed outline-none resize-none rounded-xl px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 opacity-90 ${alignClass}`}
                  />
                )}
              </>
            ) : (
              <>
                <h1 className={`font-black leading-tight tracking-tight ${ isCompact ? 'text-sm sm:text-base line-clamp-2' : titleSizeClass }`}>
                  {safeSlide.title || presentation?.topic || 'Presentación'}
                </h1>
                {(safeSlide.subtitle || safeSlide.description) && (
                  <p
                    style={{ color: theme.textSecondary }}
                    className={isCompact ? 'text-[11px] line-clamp-1 font-medium' : 'text-base sm:text-xl md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto'}
                  >
                    {safeSlide.subtitle || safeSlide.description}
                  </p>
                )}
                {!isCompact && safeSlide.subtitle && safeSlide.description && safeSlide.description !== safeSlide.subtitle && (
                  <p
                    style={{ color: theme.textSecondary }}
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
            <div
              style={{ color: theme.primary }}
              className="text-xs font-black uppercase tracking-widest"
            >
              {safeSlide.badge || `Sección ${slideIdx + 1}`}
            </div>
            {isInteractiveEditor ? (
              <>
                <input
                  type="text"
                  value={safeSlide.title || ''}
                  onChange={(e) => onUpdateSlideField('title', e.target.value)}
                  placeholder="Título de la sección..."
                  className={`w-full bg-transparent font-black outline-none rounded-lg px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
                />
                <textarea
                  value={safeSlide.subtitle || ''}
                  onChange={(e) => onUpdateSlideField('subtitle', e.target.value)}
                  rows={2}
                  placeholder="Descripción breve de la sección..."
                  style={{ color: theme.textSecondary }}
                  className={`w-full bg-transparent text-sm sm:text-lg font-medium outline-none resize-none rounded-lg px-2 py-1 border border-transparent hover:border-current/20 focus:border-current/40 ${alignClass}`}
                />
              </>
            ) : (
              <>
                <h2 className={`font-black tracking-tight ${titleSizeClass}`}>{safeSlide.title || 'Sección'}</h2>
                {safeSlide.subtitle && (
                  <p style={{ color: theme.textSecondary }} className={isCompact ? 'text-[10px] line-clamp-1' : 'text-base sm:text-lg font-medium'}>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                  style={{ color: theme.textPrimary }}
                  className="w-full bg-transparent text-sm sm:text-lg leading-relaxed font-medium outline-none resize-none"
                />
              ) : (
                <p className={`${isCompact ? 'text-[10px] line-clamp-3' : 'text-sm sm:text-lg leading-relaxed whitespace-pre-line font-medium'}`}>
                  {safeSlide.body || safeSlide.content || safeSlide.subtitle || ''}
                </p>
              )}
            </div>

            {(safeSlide.callout || isInteractiveEditor) && !isCompact && (
              <div
                style={{ backgroundColor: theme.badgeBg, borderColor: theme.primary, color: theme.textPrimary }}
                className="p-3.5 rounded-xl border-l-4 flex items-center gap-2.5 text-xs sm:text-sm font-semibold"
              >
                <Lightbulb size={16} style={{ color: theme.primary }} className="shrink-0" />
                {isInteractiveEditor ? (
                  <input
                    type="text"
                    value={safeSlide.callout || ''}
                    onChange={(e) => onUpdateSlideField('callout', e.target.value)}
                    placeholder="Nota destacada o conclusión clave (opcional)..."
                    className="w-full bg-transparent outline-none"
                  />
                ) : (
                  <span>{safeSlide.callout}</span>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                const nonEmptyItems = Array.isArray(col.items)
                  ? col.items.filter(it => String(it || '').trim() !== '')
                  : [];
                return (
                  <div
                    key={colKey}
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                    className={`rounded-2xl border flex flex-col justify-between ${isCompact ? 'p-2' : 'p-4 sm:p-5'} shadow-2xs`}
                  >
                    <div className="space-y-2">
                      <span
                        style={{ color: accent, backgroundColor: theme.badgeBg }}
                        className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      >
                        {col.badge || (cIdx === 0 ? 'Bloque A' : 'Bloque B')}
                      </span>

                      {isInteractiveEditor ? (
                        <>
                          <input
                            type="text"
                            value={col.title || ''}
                            onChange={(e) => onUpdateSlideField(colKey, { ...col, title: e.target.value })}
                            placeholder="Subtítulo de columna..."
                            className="w-full bg-transparent text-sm sm:text-lg font-extrabold outline-none border-b border-transparent focus:border-current/30 pb-0.5"
                          />
                          <textarea
                            value={col.text || ''}
                            onChange={(e) => onUpdateSlideField(colKey, { ...col, text: e.target.value })}
                            rows={2}
                            placeholder="Descripción de esta columna..."
                            style={{ color: theme.textSecondary }}
                            className="w-full bg-transparent text-xs sm:text-sm leading-relaxed outline-none resize-none"
                          />
                        </>
                      ) : (
                        <>
                          <h4 className={`font-extrabold leading-tight ${isCompact ? 'text-[11px] line-clamp-1' : 'text-base sm:text-xl'}`}>
                            {col.title}
                          </h4>
                          {col.text && (
                            <p style={{ color: theme.textSecondary }} className={isCompact ? 'text-[9px] line-clamp-2' : 'text-xs sm:text-sm leading-relaxed'}>
                              {col.text}
                            </p>
                          )}
                        </>
                      )}

                      {!isCompact && nonEmptyItems.length > 0 && (
                        <ul className="space-y-1.5 pt-1">
                          {nonEmptyItems.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm font-medium">
                              <span style={{ backgroundColor: accent }} className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
                              <span className="flex-1">{item}</span>
                            </li>
                          ))}
                        </ul>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
                {safeSlide.title || 'Tabla Comparativa'}
              </h2>
            )}

            {(() => {
              const tableHeaders = Array.isArray(safeSlide.table?.headers) && safeSlide.table.headers.length > 0
                ? safeSlide.table.headers
                : ['Concepto', 'Explicación', 'Ejemplo'];
              const tableRows = Array.isArray(safeSlide.table?.rows) && safeSlide.table.rows.length > 0
                ? safeSlide.table.rows
                : [['Dato 1', 'Explicación 1', 'Ejemplo 1']];

              return (
                <div
                  style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBg }}
                  className="rounded-2xl border overflow-hidden shadow-2xs"
                >
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                        {tableHeaders.map((hdr, hIdx) => (
                          <th key={hIdx} className={`${isCompact ? 'p-1 text-[9px]' : 'p-3 sm:p-3.5 text-xs sm:text-sm'} font-black border-r last:border-r-0 border-white/15`}>
                            {isInteractiveEditor ? (
                              <input
                                type="text"
                                value={hdr || ''}
                                onChange={(e) => {
                                  const nextHeaders = [...tableHeaders];
                                  nextHeaders[hIdx] = e.target.value;
                                  onUpdateSlideField('table', { headers: nextHeaders, rows: tableRows });
                                }}
                                className="w-full bg-transparent text-white placeholder-white/60 font-black outline-none"
                              />
                            ) : (
                              hdr
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.slice(0, isCompact ? 2 : 6).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          style={{ borderColor: theme.cardBorder }}
                          className="border-t transition-colors"
                        >
                          {tableHeaders.map((_, cIdx) => {
                            const cellVal = Array.isArray(row) ? (row[cIdx] || '') : '';
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
                                    className="w-full bg-transparent outline-none"
                                  />
                                ) : (
                                  cellVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                    className="w-full bg-transparent text-xs sm:text-base leading-relaxed font-medium outline-none resize-none"
                  />
                ) : (
                  <p className={isCompact ? 'text-[9px] line-clamp-3' : 'text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium'}>
                    {safeSlide.body || safeSlide.content || safeSlide.subtitle || ''}
                  </p>
                )}

                {safeSlide.callout && !isCompact && (
                  <div
                    style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                    className="mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Pin size={13} className="shrink-0" />
                    <span>{safeSlide.callout}</span>
                  </div>
                )}
              </div>

              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className={`sm:col-span-5 rounded-2xl border overflow-hidden flex flex-col justify-between ${isCompact ? 'p-1.5' : 'p-3'} ${safeSlide.imagePosition === 'left' ? 'sm:order-1' : 'sm:order-2'}`}
              >
                <div className="w-full aspect-video sm:aspect-auto sm:flex-1 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center min-h-[100px]">
                  {safeSlide.imageUrl ? (
                    <img
                      src={safeSlide.imageUrl}
                      alt={safeSlide.imageCaption || safeSlide.title || 'Slide visual'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={28} className="opacity-30" />
                  )}
                </div>
                {safeSlide.imageCaption && !isCompact && (
                  <p style={{ color: theme.textSecondary }} className="text-[11px] text-center italic pt-2 truncate">
                    {safeSlide.imageCaption}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : layout === 'quote' ? (
          <div
            style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
            className={`max-w-4xl mx-auto rounded-3xl border shadow-xs ${isCompact ? 'p-3' : 'p-6 sm:p-10'} text-center space-y-3`}
          >
            {(safeSlide.statValue || isInteractiveEditor) && !isCompact && (
              <div>
                {isInteractiveEditor ? (
                  <input
                    type="text"
                    value={safeSlide.statValue || ''}
                    onChange={(e) => onUpdateSlideField('statValue', e.target.value)}
                    placeholder="Cifra o dato opcional (ej: +85% o Regla #1)"
                    style={{ color: theme.primary }}
                    className="w-full bg-transparent text-center text-2xl sm:text-4xl font-black outline-none"
                  />
                ) : (
                  <div style={{ color: theme.primary }} className="text-3xl sm:text-5xl font-black tracking-tight">
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
                  className="w-full bg-transparent text-center text-lg sm:text-2xl font-extrabold italic leading-relaxed outline-none resize-none"
                />
                <input
                  type="text"
                  value={safeSlide.quoteAuthor || ''}
                  onChange={(e) => onUpdateSlideField('quoteAuthor', e.target.value)}
                  placeholder="Autor, fuente o contexto..."
                  style={{ color: theme.textSecondary }}
                  className="w-full bg-transparent text-center text-xs sm:text-sm font-bold outline-none"
                />
              </>
            ) : (
              <>
                <blockquote className={isCompact ? 'text-xs font-bold italic line-clamp-2' : 'text-xl sm:text-3xl font-extrabold italic leading-snug'}>
                  “{safeSlide.quoteText || safeSlide.body || safeSlide.title}”
                </blockquote>
                {(safeSlide.quoteAuthor || safeSlide.title) && (
                  <p style={{ color: theme.textSecondary }} className={isCompact ? 'text-[9px] font-bold' : 'text-xs sm:text-base font-bold'}>
                    — {safeSlide.quoteAuthor || safeSlide.title}
                  </p>
                )}
              </>
            )}
          </div>
        ) : layout === 'quiz' ? (
          <div className="space-y-4 max-w-4xl mx-auto w-full py-1">
            <div className="space-y-1">
              {isInteractiveEditor ? (
                <input
                  type="text"
                  value={safeSlide.question !== undefined ? safeSlide.question : (safeSlide.title || '')}
                  onChange={(e) => onUpdateSlideField('question', e.target.value)}
                  placeholder="Escribe la pregunta del Quiz..."
                  className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass}`}
                />
              ) : (
                <h2 className={`font-black tracking-tight ${isCompact ? 'text-xs line-clamp-2' : 'text-xl sm:text-3xl md:text-4xl'}`}>
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
                    {quizOptions.slice(0, isCompact ? 2 : 6).map((opt, oIdx) => {
                      const sel = quizSelection[slideIdx];
                      let customBorder = theme.cardBorder;
                      let customBg = theme.cardBg;
                      let customColor = theme.textPrimary;

                      if (sel !== undefined) {
                        if (opt.isCorrect) {
                          customBg = 'rgba(16, 185, 129, 0.18)';
                          customBorder = '#10B981';
                        } else if (sel === oIdx) {
                          customBg = 'rgba(239, 68, 68, 0.18)';
                          customBorder = '#EF4444';
                        }
                      }

                      return (
                        <div
                          key={oIdx}
                          onClick={() => {
                            if (!isInteractiveEditor && typeof onSelectQuizOption === 'function') {
                              onSelectQuizOption(slideIdx, oIdx);
                            }
                          }}
                          style={{ backgroundColor: customBg, borderColor: customBorder, color: customColor }}
                          className={`${isCompact ? 'p-1.5 rounded-lg text-[9px]' : 'p-3.5 sm:p-4 rounded-2xl text-xs sm:text-base'} border text-left font-semibold flex items-center gap-3 transition-all ${
                            !isInteractiveEditor && onSelectQuizOption ? 'cursor-pointer hover:scale-[1.01]' : ''
                          } ${sel !== undefined && !opt.isCorrect && sel === oIdx ? 'line-through opacity-80' : ''}`}
                        >
                          <span
                            style={{
                              backgroundColor: sel !== undefined && opt.isCorrect ? '#10B981' : theme.badgeBg,
                              color: sel !== undefined && opt.isCorrect ? '#FFFFFF' : theme.primary
                            }}
                            className={`${isCompact ? 'w-4 h-4 text-[8px] rounded' : 'w-7 h-7 text-xs rounded-xl'} flex items-center justify-center font-mono font-black shrink-0`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          {isInteractiveEditor ? (
                            <input
                              type="text"
                              value={opt.text || ''}
                              onChange={(e) => {
                                const nextOpts = quizOptions.map((o, i) => i === oIdx ? { ...o, text: e.target.value } : o);
                                onUpdateSlideField('options', nextOpts);
                              }}
                              className="flex-1 bg-transparent outline-none"
                            />
                          ) : (
                            <span className="flex-1 leading-snug truncate sm:whitespace-normal">{opt.text}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!isCompact && quizSelection[slideIdx] !== undefined && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                  {bulletsList.slice(0, isCompact ? 2 : 6).map((b, bIdx) => {
                    const isDimmed = spotlightIdx !== null && spotlightIdx !== bIdx;
                    return (
                      <div
                        key={bIdx}
                        onClick={() => {
                          if (mode === 'presenter' && onToggleSpotlight) onToggleSpotlight(bIdx);
                        }}
                        style={{ backgroundColor: theme.cardBg, borderColor: spotlightIdx === bIdx ? theme.primary : theme.cardBorder }}
                        className={`flex items-start gap-3.5 ${isCompact ? 'p-1.5 rounded-lg' : 'p-3.5 sm:p-4 rounded-2xl'} border transition-all ${
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
                                className="w-full bg-transparent text-sm sm:text-base font-bold outline-none"
                              />
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
                                style={{ color: theme.textSecondary }}
                                className="w-full bg-transparent text-xs sm:text-sm outline-none"
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
                                style={{ color: theme.badgeText }}
                                className="w-full bg-transparent text-xs italic outline-none opacity-85"
                              />
                            </>
                          ) : (
                            <>
                              <strong className={`block font-bold ${isCompact ? 'text-[10px] truncate' : 'text-sm sm:text-lg'}`}>
                                {typeof b === 'object' ? b?.title : b}
                              </strong>
                              {!isCompact && b?.text && (
                                <p style={{ color: theme.textSecondary }} className="text-xs sm:text-base leading-relaxed">
                                  {b.text}
                                </p>
                              )}
                              {!isCompact && b?.example && (
                                <div
                                  style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                                  className="mt-1.5 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5"
                                >
                                  <Pin size={12} className="shrink-0" />
                                  <span><strong>Ejemplo:</strong> {b.example}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
                />
              ) : (
                safeSlide.title && (
                  <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                className={`w-full bg-transparent font-black tracking-tight outline-none rounded-lg px-1.5 py-0.5 border border-transparent hover:border-current/20 focus:border-current/40 ${titleSizeClass} ${alignClass}`}
              />
            ) : (
              <h2 className={`font-black tracking-tight ${titleSizeClass} ${alignClass}`}>
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
                <div className={`grid ${gridCols} ${isCompact ? 'gap-1.5' : 'gap-3.5'}`}>
                  {cardsList.slice(0, isCompact ? 2 : 4).map((c, cIdx) => {
                    const isDimmed = spotlightIdx !== null && spotlightIdx !== cIdx;
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
                        className={`${isCompact ? 'p-2 rounded-lg' : 'p-4 sm:p-5 rounded-2xl'} border flex flex-col justify-between transition-all shadow-2xs ${
                          mode === 'presenter' ? 'cursor-pointer' : ''
                        } ${isDimmed ? 'opacity-40 scale-[0.98]' : ''}`}
                      >
                        <div className="space-y-1.5">
                          <span
                            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block"
                          >
                            Concepto {cIdx + 1}
                          </span>
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
                                className="w-full bg-transparent text-sm sm:text-base font-bold outline-none"
                              />
                              <textarea
                                value={c.text || ''}
                                onChange={(e) => {
                                  const nextCards = cardsList.map((item, i) => i === cIdx ? { ...item, text: e.target.value } : item);
                                  onUpdateSlideField('cards', nextCards);
                                }}
                                rows={3}
                                placeholder="Explicación del concepto..."
                                style={{ color: theme.textSecondary }}
                                className="w-full bg-transparent text-xs sm:text-sm leading-relaxed outline-none resize-none"
                              />
                            </>
                          ) : (
                            <>
                              <h4 className={`font-bold leading-tight ${isCompact ? 'text-[10px] truncate' : 'text-base sm:text-lg'}`}>
                                {c.title || 'Concepto'}
                              </h4>
                              <p style={{ color: theme.textSecondary }} className={isCompact ? 'text-[8px] line-clamp-2' : 'text-xs sm:text-sm leading-relaxed'}>
                                {c.text}
                              </p>
                            </>
                          )}
                        </div>

                        {!isCompact && (c.example || isInteractiveEditor) && (
                          <div
                            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                            className="mt-3 text-xs p-2 rounded-xl font-medium flex items-center gap-1.5"
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
                                className="w-full bg-transparent outline-none text-xs"
                              />
                            ) : (
                              <span><strong>Ej:</strong> {c.example}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            const isDivider = el.shapeType === 'divider';

            const bgFill = el.fill && el.fill !== 'transparent'
              ? el.fill
              : el.type === 'note'
                ? '#FEF08A'
                : 'transparent';

            const textColor = el.textColor || (bgFill !== 'transparent' && bgFill !== '#FEF08A' ? '#FFFFFF' : theme.textPrimary);

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInteractiveEditor && onSelectElement) onSelectElement(el.id);
                }}
                onPointerDown={(e) => {
                  if (!isInteractiveEditor || !onStartElementPointer) return;
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
                  color: textColor,
                  opacity: el.opacity ?? 1
                }}
                className={`absolute pointer-events-auto transition-shadow ${
                  isCircle ? 'rounded-full' : isPill ? 'rounded-full' : 'rounded-2xl'
                } ${el.type === 'note' ? 'shadow-md' : ''} ${
                  isInteractiveEditor ? 'cursor-move' : ''
                } ${isSelected ? 'ring-2 ring-sky-500 shadow-lg' : isInteractiveEditor ? 'hover:ring-1 hover:ring-sky-400/60' : ''}`}
              >
                {/* Barra de arrastre rápida cuando está seleccionado en el editor */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => onStartElementPointer?.(e, el, 'move')}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-sky-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs cursor-grab active:cursor-grabbing whitespace-nowrap z-30"
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
                        value={el.text || ''}
                        onChange={(e) => onUpdateElementField?.(el.id, 'text', e.target.value)}
                        placeholder="Escribe aquí..."
                        style={{
                          fontSize: isCompact ? '9px' : `${el.fontSize || 16}px`,
                          fontWeight: el.bold ? 800 : 500,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          textAlign: el.align || 'left',
                          color: textColor
                        }}
                        className="w-full h-full bg-transparent outline-none resize-none leading-snug"
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: isCompact ? '8px' : `${el.fontSize || 16}px`,
                          fontWeight: el.bold ? 800 : 500,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          textAlign: el.align || 'left',
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
                          onPointerDown={(e) => {
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

  const isLight = themeMode === 'light';
  const isDim = themeMode === 'dim';

  useEffect(() => {
    setCurrentIdx(0);
    setQuizSelection({});
    setSpotlightIdx(null);
  }, [presentation?.id]);

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
      if (Array.isArray(currentSlide.table?.rows)) {
        currentSlide.table.rows.forEach(r => {
          if (Array.isArray(r)) spokenParts.push(r.join(', '));
        });
      }
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
    slide: 'animate-in fade-in slide-in-from-right-6 duration-300',
    zoom: 'animate-in fade-in zoom-in-95 duration-300',
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
    bgPattern: presentation?.bgPattern || 'none',
    targetGroupId: presentation?.targetGroupId || 'all',
    targetGroupName: presentation?.targetGroupName || 'General'
  }));

  const [slides, setSlides] = useState(() => {
    try {
      const initial = JSON.parse(JSON.stringify(presentation?.slides || []));
      return initial.length > 0 ? initial : [createDefaultSlide('title', 0)];
    } catch {
      return [createDefaultSlide('title', 0)];
    }
  });

  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // Historial Undo / Redo sincronizado con ref para evitar cierres obsoletos y setState anidados
  const initialSerialized = JSON.stringify(
    presentation?.slides?.length ? presentation.slides : [createDefaultSlide('title', 0)]
  );
  const [history, setHistory] = useState(() => [initialSerialized]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const historyRef = useRef({ entries: [initialSerialized], idx: 0 });

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('content'); // 'content' | 'layout' | 'theme' | 'ai'
  const [showSpeakerNotesBar, setShowSpeakerNotesBar] = useState(false);
  const [showGridGuides, setShowGridGuides] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [snapGuides, setSnapGuides] = useState({ xCenter: false, yCenter: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  // Estado del Co-Piloto IA dentro del editor
  const [aiSlidePrompt, setAiSlidePrompt] = useState('');
  const [aiSlideLayout, setAiSlideLayout] = useState('auto');
  const [isAiWorking, setIsAiWorking] = useState(false);

  const stageContainerRef = useRef(null);
  const pointerStateRef = useRef(null);
  const slideImageInputRef = useRef(null);
  const elementImageInputRef = useRef(null);
  const replaceElementImageInputRef = useRef(null);

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
  const activeElements = Array.isArray(activeSlide.elements) ? activeSlide.elements : [];
  const selectedElement = activeElements.find(el => el.id === selectedElementId) || null;

  // Manejo de arrastre y redimensionamiento de objetos libres en el lienzo 16:9
  useEffect(() => {
    const handleWindowPointerMove = (e) => {
      const st = pointerStateRef.current;
      if (!st) return;

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
        if (dir.includes('e')) w = Math.max(6, st.initialRect.w + dxPct);
        if (dir.includes('s')) h = Math.max(5, st.initialRect.h + dyPct);
        if (dir.includes('w')) {
          w = Math.max(6, Math.min(rightEdge, st.initialRect.w - dxPct));
          x = rightEdge - w;
        }
        if (dir.includes('n')) {
          h = Math.max(5, Math.min(bottomEdge, st.initialRect.h - dyPct));
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

  const handleSlideChange = (field, value) => {
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
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      copy[safeSlideIdx] = { ...current, ...patchObj };
      return copy;
    });
  };

  const handleInsertCanvasElement = (type = 'textbox', overrides = {}) => {
    const newEl = createCanvasElement(type, overrides);
    updateSlidesWithHistory(prev => {
      const copy = [...prev];
      const current = copy[safeSlideIdx] || {};
      const list = Array.isArray(current.elements) ? current.elements : [];
      copy[safeSlideIdx] = { ...current, elements: [...list, newEl] };
      return copy;
    });
    setSelectedElementId(newEl.id);
    setInspectorTab('content');
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

  const keyActionRef = useRef({ handleUndo, handleRedo, handleDeleteCanvasElement, selectedElementId });
  keyActionRef.current = { handleUndo, handleRedo, handleDeleteCanvasElement, selectedElementId };

  // Atajos de teclado estilo PowerPoint / Google Slides (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleEditorKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      const { handleUndo: onUndo, handleRedo: onRedo, handleDeleteCanvasElement: onDel, selectedElementId: selId } = keyActionRef.current;

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
      if (!isTyping && selId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onDel(selId);
      }
    };
    window.addEventListener('keydown', handleEditorKeyDown);
    return () => window.removeEventListener('keydown', handleEditorKeyDown);
  }, []);

  if (typeof document === 'undefined' || !document.body) return null;

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

  const handleUploadImageFile = async (file, target = 'slide') => {
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const compressedBase64 = await compressImage(file, 1400, 1400, 0.82);
      let finalUrl = compressedBase64;
      const isDemoPres = isDemoMode || presentation?.isDemoCreated || String(presentation?.id || '').startsWith('demo_') || String(presentation?.id || '').startsWith('demo-');
      if (!isDemoPres) {
        try {
          const uploaded = await uploadImageToStorage(compressedBase64, 'slides');
          if (uploaded) finalUrl = uploaded;
        } catch {
          // Fallback seguro al data URL comprimido
        }
      }
      if (target === 'slide') {
        handleSlideChange('imageUrl', finalUrl);
      } else if (target === 'element' && selectedElement) {
        handleUpdateElementField(selectedElement.id, 'imageUrl', finalUrl);
      } else if (target === 'new_element') {
        handleInsertCanvasElement('image', { imageUrl: finalUrl });
      }
      showMessage('Imagen añadida a la diapositiva.');
    } catch {
      showMessage('No se pudo procesar la imagen.');
    } finally {
      setIsUploadingImg(false);
    }
  };

  // Co-Piloto IA dentro del Editor
  const handleRunSlideAiAction = async (action = 'generate_new') => {
    if (action === 'generate_new' && !aiSlidePrompt.trim()) {
      showMessage('Escribe sobre qué quieres generar la nueva diapositiva.');
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

  const buildFullUpdatedPresentation = () => {
    const matchedGroup = (academicGroups || []).find(g => g?.id === deckMeta.targetGroupId);
    const targetGroupName = deckMeta.targetGroupId === 'all'
      ? 'General'
      : (matchedGroup?.name || deckMeta.targetGroupName || 'General');

    return {
      ...presentation,
      topic: deckMeta.topic.trim() || slides[0]?.title || presentation?.topic || 'Presentación',
      language: deckMeta.language,
      theme: deckMeta.theme,
      fontFamily: deckMeta.fontFamily,
      transition: deckMeta.transition,
      bgPattern: deckMeta.bgPattern,
      targetGroupId: deckMeta.targetGroupId || 'all',
      targetGroupName,
      slides,
      slideCount: slides.length
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ok = await onSave(buildFullUpdatedPresentation());
      if (ok !== false) {
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndProject = async () => {
    const updated = buildFullUpdatedPresentation();
    setIsSaving(true);
    try {
      await onSave(updated);
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
                onChange={(e) => setDeckMeta(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="Nombre de la presentación..."
                className="w-full bg-transparent text-sm sm:text-base font-extrabold truncate outline-none border-b border-transparent focus:border-[#AD3333] pb-0.5"
              />
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span>{slides.length} diapositivas</span>
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
              onClick={() => setInspectorTab('ai')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                inspectorTab === 'ai'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Abrir asistente de IA"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">Asistente IA</span>
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

        {/* 2. CINTA DE OPCIONES (RIBBON ESTILO POWERPOINT / GOOGLE SLIDES) */}
        <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto shrink-0 ${panelBg}`}>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Insertar Objetos */}
            <button
              type="button"
              onClick={() => handleAddSlide(activeLayout === 'title' ? 'cards' : activeLayout)}
              className="px-2.5 py-1.5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
              title="Añadir nueva diapositiva"
            >
              <Plus size={13} />
              <span>Diapositiva</span>
            </button>

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />

            <button
              type="button"
              onClick={() => handleInsertCanvasElement('textbox')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${ribbonBtn}`}
              title="Insertar cuadro de texto libre en la diapositiva"
            >
              <Type size={13} className="text-[#AD3333]" />
              <span>Texto</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertCanvasElement('shape', { shapeType: 'rounded', text: 'Bloque destacado' })}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${ribbonBtn}`}
              title="Insertar forma geométrica o bloque"
            >
              <Layers size={13} className="text-blue-500" />
              <span>Forma</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertCanvasElement('note')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${ribbonBtn}`}
              title="Insertar nota adhesiva"
            >
              <Pin size={13} className="text-amber-500" />
              <span>Nota</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertCanvasElement('badge')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${ribbonBtn}`}
              title="Insertar insignia o etiqueta"
            >
              <Sparkles size={13} className="text-purple-500" />
              <span>Insignia</span>
            </button>

            <button
              type="button"
              onClick={() => elementImageInputRef.current?.click()}
              disabled={isUploadingImg}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${ribbonBtn}`}
              title="Subir e insertar imagen en la diapositiva"
            >
              {isUploadingImg ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} className="text-emerald-500" />}
              <span>Imagen</span>
            </button>
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

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />

            {/* Selector rápido de Diseño (Layout) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-gray-500 hidden xl:inline">Diseño:</span>
              <select
                value={activeLayout}
                onChange={(e) => handleSlideChange('layout', e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                title="Cambiar diseño de la diapositiva"
              >
                {SLIDE_LAYOUT_CATALOG.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Selector de Fuente */}
            <select
              value={activeSlide.fontFamily || deckMeta.fontFamily || 'sans'}
              onChange={(e) => {
                const nextFont = e.target.value;
                setDeckMeta(prev => ({ ...prev, fontFamily: nextFont }));
                if (activeSlide.fontFamily) handleSlideChange('fontFamily', undefined);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              title="Tipografía de la presentación"
            >
              {Object.values(SLIDE_FONTS).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            {/* Controles de Alineación y Formato Contextual */}
            <div className="flex items-center gap-0.5 border rounded-xl p-0.5 border-gray-200 dark:border-gray-700">
              {[
                { id: 'left', icon: AlignLeft, label: 'Izquierda' },
                { id: 'center', icon: AlignCenter, label: 'Centro' },
                { id: 'right', icon: AlignRight, label: 'Derecha' }
              ].map(al => {
                const IconComp = al.icon;
                const currentAlign = selectedElement ? (selectedElement.align || 'left') : (activeSlide.titleAlign || 'left');
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => {
                      if (selectedElement) handleUpdateElementField(selectedElement.id, 'align', al.id);
                      else handleSlideChange('titleAlign', al.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      currentAlign === al.id ? 'bg-[#AD3333] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                    title={`Alinear ${al.label}`}
                  >
                    <IconComp size={13} />
                  </button>
                );
              })}
            </div>

            {/* Si hay un elemento del lienzo seleccionado: Negrita, Cursiva, Subrayado, Tamaño, Color y Eliminar */}
            {selectedElement && (
              <div className="flex items-center gap-1 pl-1 border-l border-gray-300 dark:border-gray-700 animate-in fade-in">
                {selectedElement.type !== 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateElementField(selectedElement.id, 'bold', !selectedElement.bold)}
                      className={`p-1.5 rounded-lg border text-xs font-bold ${selectedElement.bold ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn}`}
                      title="Negrita"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateElementField(selectedElement.id, 'italic', !selectedElement.italic)}
                      className={`p-1.5 rounded-lg border text-xs font-bold ${selectedElement.italic ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn}`}
                      title="Cursiva"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateElementField(selectedElement.id, 'underline', !selectedElement.underline)}
                      className={`p-1.5 rounded-lg border text-xs font-bold ${selectedElement.underline ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn}`}
                      title="Subrayado"
                    >
                      <Underline size={13} />
                    </button>
                    <input
                      type="color"
                      value={selectedElement.fill && selectedElement.fill !== 'transparent' ? selectedElement.fill : '#AD3333'}
                      onChange={(e) => handleUpdateElementField(selectedElement.id, 'fill', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Color de fondo del objeto"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleDuplicateCanvasElement(selectedElement.id)}
                  className={`p-1.5 rounded-lg border text-xs ${ribbonBtn}`}
                  title="Duplicar objeto"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCanvasElement(selectedElement.id)}
                  className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                  title="Eliminar objeto (Supr)"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Controles derechos de la cinta: Tema, Cuadrícula y Zoom */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={activeSlide.theme || deckMeta.theme}
              onChange={(e) => {
                const nextTheme = e.target.value;
                setDeckMeta(prev => ({ ...prev, theme: nextTheme }));
                if (activeSlide.theme) handleSlideChange('theme', undefined);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              title="Tema visual de la presentación"
            >
              {Object.values(SLIDE_THEMES).map(t => (
                <option key={t.id} value={t.id}>Tema: {t.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowGridGuides(prev => !prev)}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                showGridGuides ? 'bg-[#AD3333] text-white border-[#AD3333]' : ribbonBtn
              }`}
              title="Mostrar cuadrícula guía"
            >
              <Grid size={14} />
            </button>

            <select
              value={canvasZoom}
              onChange={(e) => setCanvasZoom(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              title="Zoom del lienzo"
            >
              <option value={85}>85%</option>
              <option value={100}>100%</option>
              <option value={115}>115%</option>
            </select>
          </div>
        </div>

        {/* 3. ÁREA DE TRABAJO EN 3 PANELES (Miniaturas 16:9 + Lienzo Central WYSIWYG + Inspector Derecho) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* PANEL IZQUIERDO: Miniaturas Visuales 16:9 */}
          <aside className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r flex flex-row lg:flex-col justify-between p-2.5 shrink-0 overflow-x-auto lg:overflow-x-hidden ${panelBg}`}>
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
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
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

            {/* Botones rápidos para añadir diapositiva por tipo */}
            <div className="hidden lg:block pt-2.5 mt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-1">
                Añadir rápido
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'cards', label: 'Tarjetas' },
                  { id: 'two_columns', label: '2 Cols' },
                  { id: 'table', label: 'Tabla' },
                  { id: 'bullets', label: 'Puntos' },
                  { id: 'quiz', label: 'Quiz' },
                  { id: 'blank', label: 'Lienzo' }
                ].map(btn => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleAddSlide(btn.id)}
                    className="p-1.5 rounded-lg bg-gray-200/70 hover:bg-gray-300/80 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors"
                  >
                    <Plus size={10} />
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* PANEL CENTRAL: Lienzo 16:9 Interactivo WYSIWYG + Notas del Orador */}
          <main className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-200/70 dark:bg-gray-950/90 min-h-0">
            <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center">
              <div
                ref={stageContainerRef}
                style={{
                  width: `${canvasZoom}%`,
                  maxWidth: canvasZoom > 100 ? '1100px' : '920px'
                }}
                className="w-full shadow-2xl rounded-2xl transition-all duration-150 ring-1 ring-black/10 dark:ring-white/10"
              >
                <SlideCanvasSurface
                  presentation={deckMeta}
                  slide={activeSlide}
                  slideIdx={safeSlideIdx}
                  totalSlides={slides.length}
                  appThemeMode={isDarkMode ? 'dark' : 'light'}
                  mode="editor"
                  onUpdateSlideField={handleSlideChange}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onStartElementPointer={handleStartElementPointer}
                  onUpdateElementField={handleUpdateElementField}
                  showGridGuides={showGridGuides}
                  snapGuides={snapGuides}
                />
              </div>
            </div>

            {/* Barra Inferior de Notas del Orador (como en PowerPoint / Google Slides) */}
            <div className={`border-t px-4 py-2 shrink-0 ${panelBg}`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSpeakerNotesBar(prev => !prev)}
                  className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:text-[#AD3333]"
                >
                  <FileText size={14} className="text-[#AD3333]" />
                  <span>Notas del orador (Diapositiva #{safeSlideIdx + 1})</span>
                  <ChevronDown size={14} className={`transition-transform ${showSpeakerNotesBar ? 'rotate-180' : ''}`} />
                </button>
                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  Haz clic directamente sobre cualquier texto del lienzo para editarlo o arrastra objetos
                </span>
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
          <aside className={`w-full lg:w-88 xl:w-96 border-t lg:border-t-0 lg:border-l flex flex-col shrink-0 min-h-0 ${panelBg}`}>
            {/* Pestañas del Inspector */}
            <div className="grid grid-cols-4 gap-1 p-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
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
                                max={64}
                                value={selectedElement.fontSize || 16}
                                onChange={(e) => handleUpdateElementField(selectedElement.id, 'fontSize', Number(e.target.value))}
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 block mb-1">Relleno</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={selectedElement.fill && selectedElement.fill !== 'transparent' ? selectedElement.fill : '#AD3333'}
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
                                value={selectedElement.textColor || '#FFFFFF'}
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Subtítulo / Objetivo:
                        </label>
                        <textarea
                          value={activeSlide.subtitle !== undefined ? activeSlide.subtitle : (activeSlide.description || '')}
                          onChange={(e) => handleSlideChange('subtitle', e.target.value)}
                          rows={3}
                          placeholder="Descripción y objetivos..."
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none resize-none ${inputBg}`}
                        />
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
                                  onChange={(e) => handleSlideChange(colKey, { ...col, badge: e.target.value })}
                                  placeholder="Etiqueta"
                                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  value={col.title || ''}
                                  onChange={(e) => handleSlideChange(colKey, { ...col, title: e.target.value })}
                                  placeholder="Título de columna"
                                  className={`col-span-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                                />
                              </div>
                              <textarea
                                value={col.text || ''}
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

                    {activeLayout === 'table' && (
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
                                const curRows = activeSlide.table?.rows || [];
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
                                const curRows = activeSlide.table?.rows || [];
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
                                  onChange={(e) => {
                                    const nextH = [...(activeSlide.table?.headers || [])];
                                    nextH[hIdx] = e.target.value;
                                    handleSlideChange('table', { ...(activeSlide.table || {}), headers: nextH });
                                  }}
                                  className={`w-full px-2 py-1 rounded-lg border text-xs font-bold ${inputBg}`}
                                />
                                {(activeSlide.table?.headers || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextH = (activeSlide.table?.headers || []).filter((_, i) => i !== hIdx);
                                      const nextR = (activeSlide.table?.rows || []).map(r => (Array.isArray(r) ? r.filter((_, i) => i !== hIdx) : r));
                                      handleSlideChange('table', { headers: nextH, rows: nextR });
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
                          {(activeSlide.table?.rows || []).map((row, rIdx) => (
                            <div key={rIdx} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400">Fila #{rIdx + 1}</span>
                                {(activeSlide.table?.rows || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextRows = (activeSlide.table?.rows || []).filter((_, i) => i !== rIdx);
                                      handleSlideChange('table', { ...(activeSlide.table || {}), rows: nextRows });
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
                                    onChange={(e) => {
                                      const nextRows = (activeSlide.table?.rows || []).map((r, ri) => {
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
                    )}

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
                          type="text"
                          value={activeSlide.imageUrl || ''}
                          onChange={(e) => handleSlideChange('imageUrl', e.target.value)}
                          placeholder="O pega la URL de la imagen..."
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                        />
                        <input
                          type="text"
                          value={activeSlide.imageCaption || ''}
                          onChange={(e) => handleSlideChange('imageCaption', e.target.value)}
                          placeholder="Pie de imagen (opcional)..."
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${inputBg}`}
                        />
                        <textarea
                          value={activeSlide.body !== undefined ? activeSlide.body : (activeSlide.content || '')}
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
                                    handleSlideChange('cards', newCards);
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
                              onChange={(e) => {
                                const newCards = activeSlide.cards.map((c, i) => i === cIdx ? { ...c, title: e.target.value } : c);
                                handleSlideChange('cards', newCards);
                              }}
                              placeholder="Título del concepto..."
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                            />
                            <textarea
                              value={card.text || ''}
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
                                    handleSlideChange('bullets', newBullets);
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
                                      handleSlideChange('options', newOpts);
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
                        < ColumnsIcon size={14} className="text-gray-500" />
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
                          value={activeSlide.bgColor || SLIDE_THEMES[deckMeta.theme]?.bg || '#0F172A'}
                          onChange={(e) => handleSlideChange('bgColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold">Color acento</span>
                        <input
                          type="color"
                          value={activeSlide.accentColor || SLIDE_THEMES[deckMeta.theme]?.primary || '#AD3333'}
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
                        value={deckMeta.transition}
                        onChange={(e) => setDeckMeta(prev => ({ ...prev, transition: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                      >
                        {SLIDE_TRANSITIONS.map(t => (
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
                            onClick={() => handleSlideChange('titleSize', sz.id)}
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
                      <span>Generar nueva diapositiva con IA</span>
                    </div>
                    <textarea
                      value={aiSlidePrompt}
                      onChange={(e) => setAiSlidePrompt(e.target.value)}
                      rows={3}
                      placeholder="Ej: Comparación entre Present Perfect y Past Simple con ejemplos financieros..."
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
                        <span>Crear</span>
                      </button>
                    </div>
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
// 5. MÓDULO PRINCIPAL DE DIAPOSITIVAS (Biblioteca + Creación Manual/Plantillas + Creación IA)
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
  isDemoMode = false,
  db,
  appId,
  academicGroups = [],
  myChatId = '',
  loggedInName = '',
  user = null,
  showMessage = () => {},
  confirmAction = () => {},
  callGemini
}) => {
  const [topic, setTopic] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [language, setLanguage] = useState('Inglés');
  const [slideCount, setSlideCount] = useState(6);
  const [selectedTheme, setSelectedTheme] = useState('unipamplona');
  const [focusMode, setFocusMode] = useState('balanced');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modos de creación: null | 'ai' | 'template'
  const [creationMode, setCreationMode] = useState(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank_deck');

  const [activePresentation, setActivePresentation] = useState(null);
  const [editingPresentation, setEditingPresentation] = useState(null);
  const [reviewTargetGroup, setReviewTargetGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const canonicalTeacherId = getCanonicalTeacherId(myChatId || loggedInName || user?.displayName || user?.email);

  const persistNewPresentation = async (docPayload) => {
    const now = Date.now();
    const newDoc = {
      ...docPayload,
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
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), newDoc);
      newDoc.id = docRef.id;
    }
    return newDoc;
  };

  // Crear presentación manual o desde plantilla y abrir directamente el Estudio tipo PowerPoint/Google Slides
  const handleCreateFromTemplate = async (e) => {
    e?.preventDefault();
    const tpl = SLIDE_STARTER_TEMPLATES.find(t => t.id === selectedTemplateId) || SLIDE_STARTER_TEMPLATES[0];
    const finalTitle = newDeckTitle.trim() || tpl.name || 'Nueva Presentación';
    const slidesList = tpl.buildSlides(finalTitle);

    const targetGroup = (academicGroups || []).find(g => g?.id === reviewTargetGroup);
    const targetGroupName = targetGroup ? targetGroup.name : 'General';

    try {
      const created = await persistNewPresentation({
        topic: finalTitle,
        language,
        theme: selectedTheme || tpl.theme || 'unipamplona',
        fontFamily: 'sans',
        transition: 'fade',
        bgPattern: 'none',
        slides: slidesList,
        slideCount: slidesList.length,
        targetGroupId: reviewTargetGroup || 'all',
        targetGroupName
      });
      setNewDeckTitle('');
      setCreationMode(null);
      setEditingPresentation(created);
    } catch (err) {
      console.error(err);
      showMessage('No se pudo crear la presentación.');
    }
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
        try {
          const res = await callGemini(prompt);
          parsed = parseDeckAiResponse(res);
        } catch (aiErr) {
          if (!isDemoMode) throw aiErr;
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        if (isDemoMode) {
          parsed = buildFallbackAiSlides({ topic: topic.trim(), language, slideCount });
        } else {
          throw new Error('Formato inválido');
        }
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
    if (!updatedPres || !updatedPres.id) return false;
    try {
      const slidesList = updatedPres.slides || [];
      const updates = {
        slides: slidesList,
        slideCount: slidesList.length,
        topic: updatedPres.topic || slidesList[0]?.title || '',
        language: updatedPres.language || 'Inglés',
        theme: updatedPres.theme || 'unipamplona',
        fontFamily: updatedPres.fontFamily || 'sans',
        transition: updatedPres.transition || 'fade',
        bgPattern: updatedPres.bgPattern || 'none',
        targetGroupId: updatedPres.targetGroupId || 'all',
        targetGroupName: updatedPres.targetGroupName || 'General'
      };
      const isDemoPres = isDemoMode || updatedPres.isDemoCreated || String(updatedPres.id).startsWith('demo_') || String(updatedPres.id).startsWith('demo-');
      if (isDemoPres) {
        const merged = { ...updatedPres, ...updates };
        if (typeof setReviews === 'function') {
          setReviews(prev => (prev || []).map(r => String(r.id) === String(updatedPres.id) ? merged : r));
        }
        saveDemoSandboxItem('reviews', merged);
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', updatedPres.id), updates);
      }
      showMessage('Presentación guardada.');
      if (activePresentation?.id === updatedPres.id) {
        setActivePresentation({ ...updatedPres, ...updates });
      }
      return true;
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
        if (isDemoPres) {
          removeDemoSandboxItem('reviews', id);
          if (typeof setReviews === 'function') {
            setReviews(prev => (prev || []).filter(r => String(r.id) !== String(id)));
          }
          showMessage('Presentación eliminada del entorno Demo.');
          if (activePresentation?.id === id) setActivePresentation(null);
          if (editingPresentation?.id === id) setEditingPresentation(null);
          return;
        }
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', id));
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
    if (String(g.id || '').startsWith('demo_') || String(g.id || '').startsWith('demo-')) return true;
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
      if (r.isDemoCreated || String(r.id || '').startsWith('demo-') || String(r.id || '').startsWith('demo_')) return true;
      if (canonicalTeacherId === 'teacher') return true;
      const ownerId = getItemTeacherId(r);
      return ownerId === 'teacher' || ownerId === canonicalTeacherId;
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
              onClick={() => setCreationMode(prev => prev === 'template' ? null : 'template')}
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

      {/* PANEL 1: CREAR PRESENTACIÓN MANUAL O DESDE PLANTILLA */}
      {role === 'teacher' && creationMode === 'template' && (
        <form onSubmit={handleCreateFromTemplate} className={`p-4 sm:p-5 rounded-2xl border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 ${glassCard}`}>
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-gray-800">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <LayoutIcon size={15} className="text-[#AD3333]" />
              <span>Nueva presentación en el Estudio</span>
            </span>
            <button
              type="button"
              onClick={() => setCreationMode(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Título de la presentación</label>
              <input
                type="text"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                placeholder="Ej: Unit 2 — Market Trends & Conditionals..."
                className={`w-full ${glassInput} text-xs sm:text-sm py-2.5 px-3.5`}
                autoFocus
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Tema visual</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                {Object.values(SLIDE_THEMES).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Grupo</label>
              <select
                value={reviewTargetGroup}
                onChange={(e) => setReviewTargetGroup(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="all">General (Todos)</option>
                {selectableGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-2">Estructura inicial</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SLIDE_STARTER_TEMPLATES.map(tpl => {
                const active = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      if (tpl.theme) setSelectedTheme(tpl.theme);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? 'border-[#AD3333] bg-red-500/10 ring-1 ring-[#AD3333]/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{tpl.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{tpl.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className={`${redButton} text-xs font-bold py-2.5 px-5 rounded-xl shadow-xs flex items-center gap-1.5`}
            >
              <Edit3 size={14} />
              <span>Abrir en el Estudio de Diapositivas</span>
            </button>
          </div>
        </form>
      )}

      {/* PANEL 2: GENERADOR DE DIAPOSITIVAS CON INTELIGENCIA ARTIFICIAL */}
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

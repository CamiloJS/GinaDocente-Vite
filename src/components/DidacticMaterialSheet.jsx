// src/components/DidacticMaterialSheet.jsx
// Renderizador oficial de materiales didácticos en hoja blanca membretada (Worksheet / Reading Sheet)

import React from 'react';
import { BookOpen, CheckLine, Target, FileText } from './Icons.jsx';

/**
 * Parsea el texto del material didáctico en bloques estructurados
 * (encabezados de sección, instrucciones, casos de estudio, ejercicios con líneas y párrafos)
 */
export function parseDidacticBlocks(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return [];
  const lines = rawContent.split('\n');
  const blocks = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    // Omitir líneas divisorias redundantes
    if (/^[-=_]{4,}$/.test(line)) {
      flushParagraph();
      continue;
    }

    // Omitir encabezados institucionales crudos repetidos (ya se renderizan en la cabecera oficial de la hoja)
    if (
      /^UNIVERSIDAD DE PAMPLONA$/i.test(line) ||
      /^FACULTAD DE/i.test(line) ||
      /^DOCUMENTO DE LECTURA/i.test(line) ||
      /^GUÍA DE TRABAJO/i.test(line) ||
      /^Asignatura:\s+/i.test(line) ||
      /^Semana:\s+/i.test(line) ||
      /^Estudiantes?.*Fecha:/i.test(line) ||
      /^Unidad:.*Tema Central:/i.test(line) ||
      /^Material de lectura y discusión/i.test(line)
    ) {
      continue;
    }

    // Instrucciones generales
    if (/^INSTRUCCIONES GENERALES:?/i.test(line)) {
      flushParagraph();
      const instLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (/^[-=_]{4,}$/.test(next) || /^SECCIÓN/i.test(next) || /^[0-9]+\.\s+[A-ZÁÉÍÓÚÑ]/i.test(next)) {
          break;
        }
        if (next) instLines.push(next);
        j++;
      }
      blocks.push({
        type: 'instructions',
        title: 'INSTRUCCIONES PARA EL ESTUDIANTE:',
        text: instLines.join(' ').trim() || line.replace(/^INSTRUCCIONES GENERALES:?\s*/i, '')
      });
      i = j - 1;
      continue;
    }

    // Encabezados de sección principales (SECCIÓN 1, PARTE A, CUESTIONARIO, 1. INTRODUCCIÓN...)
    if (
      /^(?:SECCIÓN\s+[0-9A-Z]+:|PARTE\s+[0-9A-Z]+:|[0-9]+\.\s+[A-ZÁÉÍÓÚÑ\s]{4,}|CUESTIONARIO|TALLER\s+PRÁCTICO)/i.test(line)
    ) {
      flushParagraph();
      blocks.push({ type: 'section_header', text: line });
      continue;
    }

    // Ítems de selección o casillas: [ ] o [  ]
    if (/^\[\s*\]/i.test(line)) {
      flushParagraph();
      blocks.push({
        type: 'checkbox_item',
        text: line.replace(/^\[\s*\]\s*/, '')
      });
      continue;
    }

    // Casos de estudio o textos destacados entre comillas
    if ((line.startsWith('"') && line.endsWith('"') && line.length > 30) || (line.startsWith('"') && line.length > 70)) {
      flushParagraph();
      blocks.push({
        type: 'case_study',
        text: line.replace(/^"|"$/g, '').trim()
      });
      continue;
    }

    // Ejercicios o preguntas numeradas (1., 2., a), b), etc.)
    if (/^(?:[0-9]+\.|\([0-9]+\)|[a-z]\)|\([a-z]\))\s+/i.test(line)) {
      flushParagraph();
      blocks.push({
        type: 'exercise',
        text: line
      });
      continue;
    }

    // Párrafo normal
    currentParagraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * Componente principal Hoja Blanca Didáctica
 */
export function DidacticMaterialSheet({ material, plan = {}, onPrint, onCopy }) {
  if (!material) return null;

  const blocks = parseDidacticBlocks(material.content || '');

  return (
    <div
      data-darkreader-ignore="true"
      data-lesson-plan-sheet="true"
      className="printable-lesson-plan printable-material-sheet p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-white text-black border-2 border-gray-300 shadow-2xl font-sans text-xs sm:text-sm leading-relaxed space-y-6 max-w-3xl mx-auto"
      style={{
        color: '#000000',
        WebkitTextFillColor: '#000000',
        backgroundColor: '#ffffff',
        colorScheme: 'only light',
        forcedColorAdjust: 'none',
        isolation: 'isolate'
      }}
    >
      {/* ================= ENCABEZADO INSTITUCIONAL MEMBRETADO ================= */}
      <div className="border-b-2 border-black pb-4 space-y-3" style={{ borderColor: '#000000' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0 border border-black/20">
              UP
            </div>
            <div>
              <h2
                className="text-sm sm:text-base font-black tracking-wider uppercase text-black"
                style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
              >
                UNIVERSIDAD DE PAMPLONA
              </h2>
              <p
                className="text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase"
                style={{ color: '#374151', WebkitTextFillColor: '#374151' }}
              >
                FACULTAD DE CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS • DEPTO. DE LENGUAS
              </p>
              <p
                className="text-[9px] sm:text-[10px] font-extrabold text-[#AD3333] tracking-wide uppercase"
                style={{ color: '#AD3333', WebkitTextFillColor: '#AD3333' }}
              >
                MATERIAL DIDÁCTICO Y GUÍA DE APRENDIZAJE PRESENCIAL EN AULA
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
            <span
              className="inline-block px-2.5 py-0.5 rounded-md bg-black text-white text-[10px] font-black uppercase tracking-wider"
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
            >
              {material.type || 'Guía de Trabajo'}
            </span>
            <p
              className="text-[11px] font-black text-black"
              style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
            >
              Semana {plan.week || 1} • Fase: {material.phase || 'Desarrollo'}
            </p>
          </div>
        </div>

        {/* Ficha técnica del estudiante y de la clase (Worksheet Header) */}
        <div
          className="border border-black rounded-xl p-3 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px]"
          style={{ borderColor: '#000000', backgroundColor: '#f9fafb' }}
        >
          <div className="flex items-baseline min-w-0">
            <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              Estudiante(s):&nbsp;
            </span>
            <span className="flex-1 border-b border-black font-medium min-h-[1.1rem]" style={{ borderColor: '#000000' }} />
          </div>

          <div className="flex items-baseline min-w-0">
            <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              Fecha:&nbsp;
            </span>
            <span className="flex-1 border-b border-black font-medium min-h-[1.1rem]" style={{ borderColor: '#000000' }} />
          </div>

          <div className="flex items-baseline min-w-0">
            <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              Asignatura:&nbsp;
            </span>
            <span className="flex-1 font-bold text-black truncate" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              {plan.subject || 'Inglés Técnico / Especializado'}
            </span>
          </div>

          <div className="flex items-baseline min-w-0">
            <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              Docente:&nbsp;
            </span>
            <span className="flex-1 font-bold text-black truncate" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              {plan.teacher || 'Gina Marcela Quintana Delgado'}
            </span>
          </div>

          <div className="sm:col-span-2 flex items-baseline min-w-0 pt-0.5">
            <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              Unidad / Tema:&nbsp;
            </span>
            <span className="flex-1 font-bold text-black truncate" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
              {plan.unit || ''} {plan.weekTopic ? `— ${plan.weekTopic}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ================= TÍTULO DESTACADO DEL MATERIAL ================= */}
      <div
        className="text-center py-3 px-4 rounded-xl bg-gray-100 border border-gray-300"
        style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}
      >
        <h1
          className="text-sm sm:text-base font-black uppercase tracking-wide text-black"
          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
        >
          {material.title}
        </h1>
        {material.description && (
          <p
            className="text-xs font-semibold text-gray-700 mt-1 italic"
            style={{ color: '#374151', WebkitTextFillColor: '#374151' }}
          >
            {material.description}
          </p>
        )}
      </div>

      {/* ================= CUERPO ESTRUCTURADO Y MODERNO ================= */}
      <div className="space-y-4">
        {blocks.map((block, bIdx) => {
          if (block.type === 'instructions') {
            return (
              <div
                key={bIdx}
                className="p-3.5 rounded-xl border border-black bg-amber-50/70 text-black text-xs leading-relaxed space-y-1 shadow-2xs"
                style={{ borderColor: '#000000', backgroundColor: '#fefce8', color: '#000000' }}
              >
                <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px] text-[#AD3333]" style={{ color: '#AD3333', WebkitTextFillColor: '#AD3333' }}>
                  <Target size={14} />
                  <span>{block.title}</span>
                </div>
                <p className="font-medium text-black" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                  {block.text}
                </p>
              </div>
            );
          }

          if (block.type === 'section_header') {
            return (
              <div
                key={bIdx}
                className="pt-3 pb-1 border-b-2 border-black flex items-center justify-between"
                style={{ borderColor: '#000000' }}
              >
                <h3
                  className="font-black text-xs sm:text-sm uppercase tracking-wide text-black flex items-center gap-2"
                  style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#AD3333] shrink-0" style={{ backgroundColor: '#AD3333' }} />
                  <span>{block.text}</span>
                </h3>
              </div>
            );
          }

          if (block.type === 'case_study') {
            return (
              <div
                key={bIdx}
                className="p-4 rounded-xl border-l-4 border-black bg-gray-50 border-t border-r border-b border-gray-200 text-xs sm:text-sm text-black leading-relaxed space-y-2"
                style={{ borderColor: '#000000', borderLeftColor: '#000000', backgroundColor: '#f9fafb', color: '#000000' }}
              >
                <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-gray-600" style={{ color: '#4b5563', WebkitTextFillColor: '#4b5563' }}>
                  <FileText size={12} />
                  <span>Lectura / Caso de Estudio para Análisis:</span>
                </div>
                <p className="italic font-serif text-black leading-relaxed" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                  "{block.text}"
                </p>
              </div>
            );
          }

          if (block.type === 'checkbox_item') {
            return (
              <div
                key={bIdx}
                className="flex items-start gap-2.5 py-1 text-xs text-black"
                style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
              >
                <div
                  className="w-4 h-4 rounded-xs border-2 border-black shrink-0 mt-0.5 flex items-center justify-center bg-white"
                  style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}
                />
                <span className="font-medium text-black leading-normal" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                  {block.text}
                </span>
              </div>
            );
          }

          if (block.type === 'exercise') {
            // Si el texto contiene líneas de respuesta _____
            const hasBlanks = block.text.includes('____');
            return (
              <div
                key={bIdx}
                className="py-1.5 space-y-1 text-xs sm:text-sm text-black"
                style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
              >
                <p className="font-semibold text-black leading-relaxed" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                  {block.text}
                </p>
                {!hasBlanks && block.text.length > 50 && (
                  <div className="pt-1 pb-1 space-y-2">
                    <div className="border-b border-dashed border-gray-400 h-4" style={{ borderColor: '#9ca3af' }} />
                    <div className="border-b border-dashed border-gray-400 h-4" style={{ borderColor: '#9ca3af' }} />
                  </div>
                )}
              </div>
            );
          }

          // Párrafo de texto común
          return (
            <p
              key={bIdx}
              className="text-xs sm:text-sm text-black leading-relaxed text-justify font-normal"
              style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
            >
              {block.text}
            </p>
          );
        })}
      </div>

      {/* ================= PIE DE PÁGINA INSTITUCIONAL ================= */}
      <div
        className="border-t-2 border-black pt-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-gray-600 font-bold uppercase tracking-wider"
        style={{ borderColor: '#000000', color: '#4b5563' }}
      >
        <span>Universidad de Pamplona • Formato Oficial de Material Didáctico Presencial</span>
        <span>Campus Universitario Pamplona • Página 1</span>
      </div>
    </div>
  );
}

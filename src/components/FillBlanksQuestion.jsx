// src/components/FillBlanksQuestion.jsx
// Componente interactivo para preguntas de completar/rellenar en el texto (cloze).
// Al hacer clic en una palabra del banco de opciones, se inserta directamente en
// el espacio activo dentro del párrafo para que el estudiante pueda leer fluidamente.
// Al tocar una palabra ya insertada en el texto, se desmarca y vuelve al banco.

import React, { useState, useMemo } from 'react';
import { desordenarPalabras } from '../utils/palabras.js';
import { obtenerHuecosDePregunta, normalizarRespuesta } from '../utils/evalScoring.js';
import { X, CheckCircle2, RotateCcw } from './Icons.jsx';

/**
 * Parsea el texto del enunciado para separar segmentos de texto plano y huecos [1], [palabra], etc.
 */
export function parsearSegmentosTexto(textoCompleto, huecosDeclarados = []) {
  const texto = String(textoCompleto || '').trim();
  const huecos = Array.isArray(huecosDeclarados) && huecosDeclarados.length > 0
    ? huecosDeclarados.map((h) => (typeof h === 'string' ? h : (h?.word || '')))
    : obtenerHuecosDePregunta({ text: texto }).map((h) => (typeof h === 'string' ? h : (h?.word || '')));

  const segmentos = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  let ultimoIndice = 0;
  let slotIdx = 0;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      segmentos.push({
        type: 'text',
        content: texto.slice(ultimoIndice, match.index)
      });
    }

    const valorEsperado = huecos[slotIdx] || match[1].trim();
    segmentos.push({
      type: 'blank',
      slotIndex: slotIdx,
      expected: valorEsperado,
      originalToken: match[0]
    });

    slotIdx++;
    ultimoIndice = regex.lastIndex;
  }

  if (ultimoIndice < texto.length) {
    segmentos.push({
      type: 'text',
      content: texto.slice(ultimoIndice)
    });
  }

  // Fallback si no había corchetes pero había huecos declarados o líneas bajas '___'
  if (segmentos.length === 0 && texto) {
    if (/_{2,}/.test(texto)) {
      const partes = texto.split(/_{2,}/);
      partes.forEach((p, idx) => {
        if (p) segmentos.push({ type: 'text', content: p });
        if (idx < partes.length - 1) {
          segmentos.push({
            type: 'blank',
            slotIndex: idx,
            expected: huecos[idx] || '',
            originalToken: '___'
          });
        }
      });
    } else {
      segmentos.push({ type: 'text', content: texto });
    }
  }

  return { segmentos, totalHuecos: slotIdx > 0 ? slotIdx : huecos.length };
}

export default function FillBlanksQuestion({
  question = {},
  questionIndex = 0,
  answers = {},
  onChange,
  readOnly = false,
  showCorrect = false,
  isDarkMode = false
}) {
  const [activeSlot, setActiveSlot] = useState(0);

  // Huecos esperados declarados
  const huecos = useMemo(() => {
    return obtenerHuecosDePregunta(question).map((h) => (typeof h === 'string' ? h : (h?.word || ''))).filter(Boolean);
  }, [question]);

  // Segmentos del texto
  const { segmentos, totalHuecos } = useMemo(
    () => parsearSegmentosTexto(question.text || '', huecos),
    [question.text, huecos]
  );

  // Banco de palabras disponibles (todas las correctas + posibles distractores)
  const bancoPalabras = useMemo(() => {
    let palabras = [];
    if (Array.isArray(question.options) && question.options.length > 0) {
      palabras = question.options.map((o) => (typeof o === 'object' && o !== null ? (o.text || '') : String(o))).filter(Boolean);
    } else {
      const distractores = Array.isArray(question.distractors) ? question.distractors : [];
      palabras = [...huecos, ...distractores].filter(Boolean);
    }

    if (palabras.length === 0) {
      palabras = [...huecos];
    }

    // Desordenar de manera estable con la semilla del texto de la pregunta
    const semilla = `${question.text || ''}-${questionIndex}-fill`;
    return desordenarPalabras(palabras, semilla);
  }, [question, questionIndex, huecos]);

  // Respuestas del estudiante normalizadas como diccionario { slotIndex: palabra }
  const respuestasMap = useMemo(() => {
    if (!answers) return {};
    if (Array.isArray(answers)) {
      const m = {};
      answers.forEach((v, idx) => {
        if (v !== undefined && v !== null && String(v).trim()) m[idx] = String(v).trim();
      });
      return m;
    }
    if (typeof answers === 'object') {
      const m = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim()) m[Number(k)] = String(v).trim();
      });
      return m;
    }
    return {};
  }, [answers]);

  // Frecuencia de palabras ya usadas en los espacios
  const palabrasUsadasCount = useMemo(() => {
    const counts = {};
    Object.values(respuestasMap).forEach((palabra) => {
      const clean = normalizarRespuesta(palabra);
      counts[clean] = (counts[clean] || 0) + 1;
    });
    return counts;
  }, [respuestasMap]);

  // Frecuencia total de palabras en el banco
  const bancoOcurrencias = {};
  bancoPalabras.forEach(({ w }) => {
    const clean = normalizarRespuesta(w);
    bancoOcurrencias[clean] = (bancoOcurrencias[clean] || 0) + 1;
  });

  // Manejador para insertar una palabra en el espacio activo
  const handleSelectWord = (word) => {
    if (readOnly || !onChange) return;

    // Buscar el espacio objetivo: el activeSlot si está libre, o el primer hueco libre
    let target = activeSlot;
    if (respuestasMap[target] !== undefined) {
      // Buscar el primer slot vacío
      let primerLibre = -1;
      for (let s = 0; s < totalHuecos; s++) {
        if (respuestasMap[s] === undefined) {
          primerLibre = s;
          break;
        }
      }
      target = primerLibre !== -1 ? primerLibre : activeSlot;
    }

    const nextAnswers = { ...respuestasMap, [target]: word };
    onChange(nextAnswers);

    // Avanzar al siguiente hueco vacío
    for (let s = 0; s < totalHuecos; s++) {
      const nextIdx = (target + 1 + s) % totalHuecos;
      if (nextAnswers[nextIdx] === undefined) {
        setActiveSlot(nextIdx);
        break;
      }
    }
  };

  // Manejador para quitar una palabra de un espacio
  const handleRemoveFromSlot = (slotIdx) => {
    if (readOnly || !onChange) return;
    const nextAnswers = { ...respuestasMap };
    delete nextAnswers[slotIdx];
    onChange(nextAnswers);
    setActiveSlot(slotIdx);
  };

  const handleClearAll = () => {
    if (readOnly || !onChange) return;
    onChange({});
    setActiveSlot(0);
  };

  return (
    <div className="space-y-4">
      {/* Párrafo con huecos interactivos */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base leading-loose font-normal select-none transition-colors ${
          isDarkMode
            ? 'bg-gray-900/60 border-gray-800 text-gray-200'
            : 'bg-white/80 border-gray-200/90 text-gray-800 shadow-xs'
        }`}
      >
        {segmentos.map((seg, sIdx) => {
          if (seg.type === 'text') {
            return (
              <span key={sIdx} className="whitespace-pre-wrap">
                {seg.content}
              </span>
            );
          }

          const slot = seg.slotIndex;
          const palabraElegida = respuestasMap[slot];
          const isActive = activeSlot === slot;
          const esCorrecta = showCorrect && palabraElegida && normalizarRespuesta(palabraElegida) === normalizarRespuesta(seg.expected);
          const esIncorrecta = showCorrect && palabraElegida && normalizarRespuesta(palabraElegida) !== normalizarRespuesta(seg.expected);

          if (palabraElegida) {
            return (
              <button
                key={sIdx}
                type="button"
                disabled={readOnly}
                onClick={() => handleRemoveFromSlot(slot)}
                title={readOnly ? palabraElegida : 'Toca para quitar del texto y probar otra opción'}
                className={`inline-flex items-center gap-1.5 mx-1 px-3 py-1 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs active:scale-95 align-middle ${
                  showCorrect
                    ? esCorrecta
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                      : 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                    : 'bg-blue-600 hover:bg-rose-600 text-white ring-2 ring-blue-400/40 hover:ring-rose-400/40'
                }`}
              >
                <span>{palabraElegida}</span>
                {!readOnly && <X size={12} className="opacity-80 shrink-0" />}
                {showCorrect && esCorrecta && <CheckCircle2 size={13} className="shrink-0" />}
              </button>
            );
          }

          // Espacio vacío
          return (
            <button
              key={sIdx}
              type="button"
              disabled={readOnly}
              onClick={() => setActiveSlot(slot)}
              title={`Espacio ${slot + 1}: Selecciona una palabra abajo para colocarla aquí`}
              className={`inline-flex items-center justify-center mx-1 px-3.5 py-0.5 rounded-xl border-2 border-dashed text-xs sm:text-sm font-bold transition-all align-middle cursor-pointer min-w-[70px] ${
                isActive
                  ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-2 ring-blue-400/50 scale-105'
                  : isDarkMode
                  ? 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  : 'border-gray-300 bg-gray-100/70 text-gray-500 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              <span className="text-[11px] opacity-75 font-mono">
                [ Espacio {slot + 1} ]
              </span>
            </button>
          );
        })}
      </div>

      {/* Banco de opciones de palabras */}
      {!readOnly && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <span>Banco de palabras:</span>
              <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                (toca una opción para insertarla en el texto)
              </span>
            </p>
            {Object.keys(respuestasMap).length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-gray-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                title="Quitar todas las palabras del texto"
              >
                <RotateCcw size={11} /> Reiniciar texto
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 min-h-[52px] items-center">
            {(() => {
              const vistosCounter = {};
              return bancoPalabras.map(({ w, idx }) => {
                const clean = normalizarRespuesta(w);
                vistosCounter[clean] = (vistosCounter[clean] || 0) + 1;
                const usada = vistosCounter[clean] <= (palabrasUsadasCount[clean] || 0);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={usada}
                    onClick={() => handleSelectWord(w)}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                      usada
                        ? 'opacity-30 line-through cursor-not-allowed border-gray-300 dark:border-gray-700 bg-gray-200/50 dark:bg-gray-800/40 text-gray-400'
                        : isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700 hover:border-blue-500 shadow-xs'
                        : 'bg-white border-gray-300 text-gray-800 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 shadow-xs'
                    }`}
                  >
                    {w}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Respuestas correctas en modo simulacro */}
      {showCorrect && huecos.length > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
            <CheckCircle2 size={13} /> Respuestas esperadas por espacio:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {huecos.map((h, i) => (
              <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                <strong>{i + 1}:</strong> {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

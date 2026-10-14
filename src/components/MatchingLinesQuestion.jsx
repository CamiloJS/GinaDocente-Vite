// src/components/MatchingLinesQuestion.jsx
// Componente interactivo para preguntas de unir columnas con líneas SVG.
// Cada elemento tiene un punto/circulito de conexión. Al hacer clic en un punto izquierdo
// y luego en uno derecho (o viceversa), se dibuja una línea conectora con un color
// completamente diferente por cada pareja (paleta de 20 colores de alto contraste).
// Permite desunir haciendo clic en la línea o en el circulito.

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { desordenarPalabras } from '../utils/palabras.js';
import { normalizarRespuesta } from '../utils/evalScoring.js';
import { X, CheckCircle2, RotateCcw } from './Icons.jsx';

/** Paleta de 20 colores nítidos, saturados y de alto contraste para hasta 20 pares */
export const MATCHING_LINE_COLORS = [
  '#EF4444', // 1. Rojo vibrante
  '#3B82F6', // 2. Azul cobalto
  '#10B981', // 3. Esmeralda
  '#F59E0B', // 4. Ámbar cálido
  '#8B5CF6', // 5. Púrpura eléctrico
  '#EC4899', // 6. Rosa neón
  '#06B6D4', // 7. Cian brillante
  '#F97316', // 8. Naranja fuego
  '#14B8A6', // 9. Turquesa / Teal
  '#6366F1', // 10. Índigo moderno
  '#84CC16', // 11. Verde lima
  '#D946EF', // 12. Fucsia vivo
  '#E11D48', // 13. Carmesí / Rose
  '#0284C7', // 14. Azul cielo
  '#059669', // 15. Verde bosque brillante
  '#D97706', // 16. Dorado / Ámbar oscuro
  '#7C3AED', // 17. Violeta profundo
  '#DB2777', // 18. Magenta profundo
  '#0891B2', // 19. Cian oscuro
  '#4F46E5', // 20. Azul añil índigo
];

export default function MatchingLinesQuestion({
  question = {},
  questionIndex = 0,
  answers = {},
  onChange,
  readOnly = false,
  showCorrect = false,
  isDarkMode = false
}) {
  const containerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [lines, setLines] = useState([]);

  const pairs = useMemo(() => {
    return Array.isArray(question.pairs) ? question.pairs : [];
  }, [question.pairs]);

  // Lista derecha desordenada de manera estable
  const rightItems = useMemo(() => {
    const rawRights = pairs.map((p, idx) => ({ text: p.right, originalIdx: idx }));
    const semilla = `${question.text || ''}-${questionIndex}-matching-lines`;
    const desordenadas = desordenarPalabras(
      rawRights.map((r) => r.text),
      semilla
    );

    return desordenadas.map(({ w, idx }) => ({
      text: w,
      originalIdx: idx
    }));
  }, [pairs, question.text, questionIndex]);

  // Normalizar respuestas a { [leftIdx]: rightText }
  const answersMap = useMemo(() => {
    if (!answers || typeof answers !== 'object') return {};
    const map = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim()) {
        map[Number(k)] = String(v).trim();
      }
    });
    return map;
  }, [answers]);

  // Mapeo inverso: saber qué elemento izquierdo está conectado a cada elemento derecho
  const rightToLeftMap = useMemo(() => {
    const map = {};
    Object.entries(answersMap).forEach(([leftIdxStr, rightVal]) => {
      const leftIdx = Number(leftIdxStr);
      const rightIdx = rightItems.findIndex(
        (r) => normalizarRespuesta(r.text) === normalizarRespuesta(rightVal)
      );
      if (rightIdx !== -1) {
        map[rightIdx] = leftIdx;
      }
    });
    return map;
  }, [answersMap, rightItems]);

  // Recalcular las coordenadas de las líneas con base en los círculos del DOM
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const contRect = containerRef.current.getBoundingClientRect();
    const newLines = [];

    Object.entries(answersMap).forEach(([leftIdxStr, rightVal]) => {
      const leftIdx = Number(leftIdxStr);
      const rightIdx = rightItems.findIndex(
        (r) => normalizarRespuesta(r.text) === normalizarRespuesta(rightVal)
      );
      if (rightIdx === -1) return;

      const leftDot = leftRefs.current[leftIdx];
      const rightDot = rightRefs.current[rightIdx];

      if (leftDot && rightDot) {
        const lRect = leftDot.getBoundingClientRect();
        const rRect = rightDot.getBoundingClientRect();

        const x1 = lRect.left + lRect.width / 2 - contRect.left;
        const y1 = lRect.top + lRect.height / 2 - contRect.top;
        const x2 = rRect.left + rRect.width / 2 - contRect.left;
        const y2 = rRect.top + rRect.height / 2 - contRect.top;

        const color = MATCHING_LINE_COLORS[leftIdx % MATCHING_LINE_COLORS.length];

        newLines.push({
          id: `${leftIdx}-${rightIdx}`,
          leftIdx,
          rightIdx,
          x1,
          y1,
          x2,
          y2,
          color
        });
      }
    });

    setLines(newLines);
  }, [answersMap, rightItems]);

  useLayoutEffect(() => {
    updateLines();
  }, [updateLines]);

  useEffect(() => {
    const handleResize = () => updateLines();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateLines]);

  // Manejador de clic en lado izquierdo
  const handleLeftClick = (leftIdx) => {
    if (readOnly || !onChange) return;

    // Si ya estaba conectado y no hay selección pendiente en la derecha, desconectar o seleccionar
    if (selectedRight !== null) {
      // Conectar este izquierdo con el derecho seleccionado
      const rightVal = rightItems[selectedRight]?.text;
      if (rightVal) {
        const next = { ...answersMap, [leftIdx]: rightVal };
        // Si el derecho ya estaba unido a otro izquierdo, limpiar el anterior
        Object.keys(next).forEach((k) => {
          if (Number(k) !== leftIdx && normalizarRespuesta(next[k]) === normalizarRespuesta(rightVal)) {
            delete next[k];
          }
        });
        onChange(next);
      }
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    if (answersMap[leftIdx] !== undefined) {
      // Si hace clic en uno ya conectado, desconectar
      const next = { ...answersMap };
      delete next[leftIdx];
      onChange(next);
      setSelectedLeft(null);
      return;
    }

    // Alternar selección
    setSelectedLeft(selectedLeft === leftIdx ? null : leftIdx);
  };

  // Manejador de clic en lado derecho
  const handleRightClick = (rightIdx) => {
    if (readOnly || !onChange) return;

    if (selectedLeft !== null) {
      // Conectar el izquierdo seleccionado con este derecho
      const rightVal = rightItems[rightIdx]?.text;
      if (rightVal) {
        const next = { ...answersMap, [selectedLeft]: rightVal };
        // Limpiar si este derecho ya estaba unido a otro izquierdo
        Object.keys(next).forEach((k) => {
          if (Number(k) !== selectedLeft && normalizarRespuesta(next[k]) === normalizarRespuesta(rightVal)) {
            delete next[k];
          }
        });
        onChange(next);
      }
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    const connectedLeft = rightToLeftMap[rightIdx];
    if (connectedLeft !== undefined) {
      // Si ya estaba conectado, desconectar
      const next = { ...answersMap };
      delete next[connectedLeft];
      onChange(next);
      setSelectedRight(null);
      return;
    }

    // Alternar selección
    setSelectedRight(selectedRight === rightIdx ? null : rightIdx);
  };

  const handleDisconnectPair = (leftIdx) => {
    if (readOnly || !onChange) return;
    const next = { ...answersMap };
    delete next[leftIdx];
    onChange(next);
  };

  const handleClearAll = () => {
    if (readOnly || !onChange) return;
    onChange({});
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const totalConnected = Object.keys(answersMap).length;

  return (
    <div className="space-y-3">
      {/* Barra superior de ayuda y contador */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <p className="text-gray-500 font-medium">
          Toca un circulito de la columna izquierda y luego uno de la derecha para trazar la línea.
        </p>
        {!readOnly && totalConnected > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-gray-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            title="Borrar todas las conexiones trazadas"
          >
            <RotateCcw size={11} /> Borrar uniones ({totalConnected}/{pairs.length})
          </button>
        )}
      </div>

      {/* Contenedor relativo de las dos columnas con líneas SVG */}
      <div
        ref={containerRef}
        className="relative grid grid-cols-2 gap-8 sm:gap-16 select-none p-1 sm:p-2"
      >
        {/* Capa SVG con las líneas conectoras */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
          aria-hidden="true"
        >
          {lines.map((line) => {
            const dx = Math.max(25, Math.abs(line.x2 - line.x1) * 0.45);
            const d = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;

            return (
              <g
                key={line.id}
                className={readOnly ? '' : 'cursor-pointer pointer-events-auto group'}
                onClick={() => handleDisconnectPair(line.leftIdx)}
              >
                {/* Trazado invisible más grueso para facilitar el clic/tap en pantallas táctiles */}
                {!readOnly && (
                  <path d={d} fill="none" stroke="transparent" strokeWidth="22" />
                )}
                {/* Trazado visual con color único */}
                <path
                  d={d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="transition-all duration-150 group-hover:stroke-width-5 filter drop-shadow-sm"
                />
              </g>
            );
          })}
        </svg>

        {/* Columna Izquierda */}
        <div className="space-y-3 z-20">
          {pairs.map((p, leftIdx) => {
            const isSelected = selectedLeft === leftIdx;
            const isConnected = answersMap[leftIdx] !== undefined;
            const lineColor = MATCHING_LINE_COLORS[leftIdx % MATCHING_LINE_COLORS.length];
            const connectedRightVal = answersMap[leftIdx];
            const esCorrecto = showCorrect && isConnected && normalizarRespuesta(connectedRightVal) === normalizarRespuesta(p.right);
            const esIncorrecto = showCorrect && isConnected && normalizarRespuesta(connectedRightVal) !== normalizarRespuesta(p.right);

            return (
              <div
                key={leftIdx}
                onClick={() => handleLeftClick(leftIdx)}
                className={`relative flex items-center justify-between gap-2 p-3 sm:p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-500/10 border-blue-500'
                    : isConnected
                    ? isDarkMode
                      ? 'bg-gray-800/80 border-gray-700 text-gray-100'
                      : 'bg-white border-gray-200 text-gray-800'
                    : isDarkMode
                    ? 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800/60'
                    : 'bg-gray-50/80 border-gray-200/90 text-gray-700 hover:bg-white'
                } ${esCorrecto ? 'ring-2 ring-emerald-500/70' : esIncorrecto ? 'ring-2 ring-rose-500/70' : ''}`}
                style={isConnected ? { borderLeftColor: lineColor, borderLeftWidth: '4px' } : undefined}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: lineColor }}
                  >
                    {leftIdx + 1}
                  </span>
                  <span className="truncate leading-snug">{p.left}</span>
                </div>

                {/* Circulito de anclaje derecho de la columna izquierda */}
                <div
                  ref={(el) => {
                    leftRefs.current[leftIdx] = el;
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    isSelected ? 'scale-125' : ''
                  }`}
                  title={isConnected ? 'Unido. Toca para desconectar' : 'Toca para iniciar unión'}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isConnected || isSelected
                        ? 'border-white shadow-sm'
                        : isDarkMode
                        ? 'border-gray-500 bg-gray-700'
                        : 'border-gray-400 bg-white'
                    }`}
                    style={{
                      backgroundColor: isConnected || isSelected ? lineColor : undefined,
                      borderColor: isConnected || isSelected ? lineColor : undefined
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Columna Derecha */}
        <div className="space-y-3 z-20">
          {rightItems.map((r, rightIdx) => {
            const isSelected = selectedRight === rightIdx;
            const connectedLeftIdx = rightToLeftMap[rightIdx];
            const isConnected = connectedLeftIdx !== undefined;
            const lineColor = isConnected
              ? MATCHING_LINE_COLORS[connectedLeftIdx % MATCHING_LINE_COLORS.length]
              : undefined;

            return (
              <div
                key={rightIdx}
                onClick={() => handleRightClick(rightIdx)}
                className={`relative flex items-center gap-2 p-3 sm:p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-500/10 border-blue-500'
                    : isConnected
                    ? isDarkMode
                      ? 'bg-gray-800/80 border-gray-700 text-gray-100'
                      : 'bg-white border-gray-200 text-gray-800'
                    : isDarkMode
                    ? 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800/60'
                    : 'bg-gray-50/80 border-gray-200/90 text-gray-700 hover:bg-white'
                }`}
                style={isConnected ? { borderRightColor: lineColor, borderRightWidth: '4px' } : undefined}
              >
                {/* Circulito de anclaje izquierdo de la columna derecha */}
                <div
                  ref={(el) => {
                    rightRefs.current[rightIdx] = el;
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    isSelected ? 'scale-125' : ''
                  }`}
                  title={isConnected ? 'Unido. Toca para desconectar' : 'Toca para conectar'}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isConnected || isSelected
                        ? 'border-white shadow-sm'
                        : isDarkMode
                        ? 'border-gray-500 bg-gray-700'
                        : 'border-gray-400 bg-white'
                    }`}
                    style={{
                      backgroundColor: isConnected ? lineColor : isSelected ? '#3B82F6' : undefined,
                      borderColor: isConnected ? lineColor : isSelected ? '#3B82F6' : undefined
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-1.5 min-w-0 flex-1 pl-1">
                  <span className="truncate leading-snug">{r.text}</span>
                  {isConnected && (
                    <span
                      className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: lineColor }}
                    >
                      {connectedLeftIdx + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Respuestas correctas en modo simulacro */}
      {showCorrect && pairs.length > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
            <CheckCircle2 size={13} /> Parejas correctas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {pairs.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
              >
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shrink-0"
                  style={{ backgroundColor: MATCHING_LINE_COLORS[idx % MATCHING_LINE_COLORS.length] }}
                >
                  {idx + 1}
                </span>
                <span className="font-bold truncate">{p.left}</span>
                <span className="opacity-60 text-[10px]">{'→'}</span>
                <span className="truncate text-emerald-700 dark:text-emerald-200">{p.right}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

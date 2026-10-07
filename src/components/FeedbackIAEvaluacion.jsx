// src/components/FeedbackIAEvaluacion.jsx
// Retroalimentación detallada de las respuestas del estudiante en una evaluación,
// con análisis de por qué cada opción iba o no iba y un minijuego interactivo
// por pregunta para poner a prueba al estudiante sin dejarse confundir.
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, Target, Award, RotateCcw } from './Icons.jsx';
import { auth, db, appId, doc, updateDoc, signInAnonymously } from '../firebase/config.js';
import { isDemoSessionActive } from '../utils/helpers.js';
import { saveDemoSandboxItem } from '../utils/demoData.js';
import {
  puedeMostrarFeedback,
  describirPregunta,
  generarFeedbackIA,
  armarMinijuegoPregunta,
} from '../utils/aiFeedback.js';
import { textoPlano } from '../utils/textFormat.js';

// Una generación a la vez en toda la página.
let colaGlobal = Promise.resolve();
const enFila = (tarea) => {
  const siguiente = colaGlobal.then(tarea, tarea);
  colaGlobal = siguiente.then(() => undefined, () => undefined);
  return siguiente;
};

async function llamarServicioFeedback(promptText, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (auth && !auth.currentUser) {
      try { await signInAnonymously(auth); } catch (e) { /* continuar */ }
    }
    const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ promptText }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (e) { /* respuesta sin JSON */ }
      throw new Error(errData.error || errData.message || 'No se pudo conectar con el servidor.');
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

const preguntasDe = (evaluacion) => (Array.isArray(evaluacion?.questions) ? evaluacion.questions : []);

export default function FeedbackIAEvaluacion({
  evaluacion,
  grade,
  onGenerado,
  expandidoInicial = false,
  onAbrirCompleto = null,
  onZoomImage = null,
}) {
  const [explicaciones, setExplicaciones] = useState(() => {
    const fb = grade?.feedbackIA;
    return Array.isArray(fb) && fb.some(Boolean) ? fb : null;
  });
  const [minijuegosRemotos, setMinijuegosRemotos] = useState(() => {
    const mj = grade?.minijuegosIA;
    return Array.isArray(mj) && mj.some(Boolean) ? mj : null;
  });
  // Selecciones del estudiante en el minijuego de cada pregunta: { [qIdx]: indiceOpcionElegida }
  const [jugadas, setJugadas] = useState({});
  // Historial de trampas tocadas por pregunta: { [qIdx]: [idx1, idx2] }
  const [trampasTocadas, setTrampasTocadas] = useState({});
  const [mostrarDetalle, setMostrarDetalle] = useState(() => Boolean(expandidoInicial));

  const intentosRef = useRef(0);
  const enCursoRef = useRef(false);
  const vivoRef = useRef(true);
  const gradeRef = useRef(grade);
  gradeRef.current = grade;
  const evaluacionRef = useRef(evaluacion);
  evaluacionRef.current = evaluacion;

  const gradeId = grade?.id;
  const disponible = puedeMostrarFeedback(evaluacion);

  useEffect(() => () => { vivoRef.current = false; }, []);

  useEffect(() => {
    if (expandidoInicial) setMostrarDetalle(true);
  }, [expandidoInicial]);

  const prevGradeIdRef = useRef(gradeId);
  useEffect(() => {
    const fb = Array.isArray(grade?.feedbackIA) && grade.feedbackIA.some(Boolean) ? grade.feedbackIA : null;
    const mj = Array.isArray(grade?.minijuegosIA) && grade.minijuegosIA.some(Boolean) ? grade.minijuegosIA : null;
    if (prevGradeIdRef.current !== gradeId) {
      prevGradeIdRef.current = gradeId;
      intentosRef.current = 0;
      setJugadas({});
      setTrampasTocadas({});
      setExplicaciones(fb);
      setMinijuegosRemotos(mj);
    } else {
      if (fb) setExplicaciones(fb);
      if (mj) setMinijuegosRemotos(mj);
    }
  }, [gradeId, grade?.feedbackIA, grade?.minijuegosIA]);

  const generar = async (forzar = false) => {
    const grado = gradeRef.current;
    const ev = evaluacionRef.current;
    if (!ev || !grado) return;
    if (!puedeMostrarFeedback(ev)) return;
    if (forzar) intentosRef.current = 0;
    if (enCursoRef.current || intentosRef.current >= 2) return;
    enCursoRef.current = true;
    intentosRef.current += 1;
    try {
      const r = await enFila(() => generarFeedbackIA({
        evaluacion: ev,
        preguntas: preguntasDe(ev),
        respuestas: grado.answers || {},
        llamarIA: llamarServicioFeedback,
      }));
      if (!r.ok || !r.feedback.some(Boolean)) {
        return;
      }
      try {
        if (isDemoSessionActive() || grado.isDemoCreated || String(grado.id || '').startsWith('demo')) {
          if (grado.id) {
            saveDemoSandboxItem('grades', {
              ...grado,
              feedbackIA: r.feedback,
              minijuegosIA: r.minijuegos || [],
              feedbackIAEn: Date.now(),
            });
          }
        } else if (grado.id) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', grado.id), {
            feedbackIA: r.feedback,
            minijuegosIA: r.minijuegos || [],
            feedbackIAEn: Date.now(),
          });
        }
      } catch (errGuardar) {
        console.warn('No se pudo guardar la retroalimentación (se muestra igual):', errGuardar);
      }
      if (vivoRef.current && gradeRef.current?.id === grado.id) {
        setExplicaciones(r.feedback);
        if (Array.isArray(r.minijuegos) && r.minijuegos.some(Boolean)) {
          setMinijuegosRemotos(r.minijuegos);
        }
        onGenerado?.(r.feedback, r.minijuegos);
      }
    } catch (err) {
      console.warn('Usando retroalimentación pedagógica local:', err);
    } finally {
      enCursoRef.current = false;
    }
  };

  useEffect(() => {
    const fb = Array.isArray(grade?.feedbackIA) && grade.feedbackIA.some(Boolean);
    if (disponible && !fb && !explicaciones) generar();
  }, [gradeId, disponible, explicaciones]);

  if (!disponible) return null;

  const preguntas = preguntasDe(evaluacion);
  if (preguntas.length === 0) return null;
  const respuestas = grade?.answers || {};

  // Preparamos los datos de retroalimentación y minijuego de cada pregunta
  const datosPorPregunta = preguntas.map((q, qIdx) => {
    const exp = Array.isArray(explicaciones) ? explicaciones[qIdx] : '';
    const mj = Array.isArray(minijuegosRemotos) ? minijuegosRemotos[qIdx] : null;
    const detalle = describirPregunta(q, respuestas[qIdx]);
    const juego = armarMinijuegoPregunta(q, respuestas[qIdx], exp, mj);
    return { q, qIdx, exp, detalle, juego };
  });

  const totalFallos = datosPorPregunta.filter((d) => !d.detalle.esAudio && !d.detalle.acierto).length;
  const retosSuperados = datosPorPregunta.filter(({ qIdx, juego }) => {
    const elegida = jugadas[qIdx];
    return elegida !== undefined && juego.opcionesJuego?.[elegida]?.esCorrecta;
  }).length;

  const elegirOpcionJuego = (qIdx, opIdx, esCorrecta) => {
    setJugadas((prev) => ({ ...prev, [qIdx]: opIdx }));
    if (!esCorrecta) {
      setTrampasTocadas((prev) => {
        const actuales = Array.isArray(prev[qIdx]) ? prev[qIdx] : [];
        return actuales.includes(opIdx) ? prev : { ...prev, [qIdx]: [...actuales, opIdx] };
      });
    }
  };

  const reiniciarJuegoPregunta = (qIdx) => {
    setJugadas((prev) => {
      const copia = { ...prev };
      delete copia[qIdx];
      return copia;
    });
    setTrampasTocadas((prev) => {
      const copia = { ...prev };
      delete copia[qIdx];
      return copia;
    });
  };

  return (
    <div className="w-full mt-3 space-y-2.5">
      {/* Cabecera de Retroalimentación */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/25">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Lightbulb size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5 flex-wrap">
              <span>Retroalimentación inmediata</span>
              {totalFallos > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                  {totalFallos} por reforzar
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  ¡Todas correctas!
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Award size={11} /> Minijuegos: {retosSuperados}/{preguntas.length}
              </span>
            </p>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
              Revisa en qué fallaste, por qué las otras opciones no iban y supera el minijuego cazatrampas de cada pregunta.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onAbrirCompleto && !mostrarDetalle) {
              onAbrirCompleto();
            } else {
              setMostrarDetalle((v) => !v);
            }
          }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          {mostrarDetalle ? 'Ocultar detalle' : 'Retroalimentación inmediata'}
        </button>
      </div>

      {mostrarDetalle && (
        <div className="space-y-3">
          {datosPorPregunta.map(({ q, qIdx, exp, detalle, juego }) => {
            const elegidaIdx = jugadas[qIdx];
            const opcionElegida = elegidaIdx !== undefined ? juego.opcionesJuego?.[elegidaIdx] : null;
            const superado = Boolean(opcionElegida?.esCorrecta);
            const trampasDeEsta = Array.isArray(trampasTocadas[qIdx]) ? trampasTocadas[qIdx] : [];

            return (
              <div
                key={qIdx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
                  detalle.esAudio
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                    : detalle.acierto
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-800/50'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                {/* Encabezado de la pregunta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 mt-0.5 ${
                        detalle.esAudio
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                          : detalle.acierto
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {detalle.esAudio ? '🎧 Audio' : detalle.acierto ? '✅ Correcta' : '❌ Te quedó mal'}
                    </span>
                    <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-100 leading-snug break-words">
                      {qIdx + 1}. {q?.text || q?.question || '(Pregunta sin enunciado)'}
                    </p>
                  </div>
                </div>

                {/* Imagen de la pregunta si tiene */}
                {q?.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 max-w-md">
                    <img
                      src={q.imageUrl}
                      alt={`Ilustración de la pregunta ${qIdx + 1}`}
                      onClick={() => onZoomImage?.(q.imageUrl)}
                      className={`w-full max-h-52 object-contain ${onZoomImage ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                    />
                  </div>
                )}

                {/* Texto de lectura si es reading */}
                {q?.type === 'reading' && q?.passage && (
                  <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-1 uppercase tracking-wider">Texto de lectura:</p>
                    {q.passage}
                  </div>
                )}

                {/* Resumen de respuesta del estudiante vs respuesta correcta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2.5 rounded-xl border ${
                    detalle.acierto
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-200'
                  }`}>
                    <span className="font-black block uppercase text-[10px] opacity-75">Tu respuesta</span>
                    <span className="font-bold">{detalle.delEstudiante}</span>
                  </div>
                  {!detalle.esAudio && (
                    <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200">
                      <span className="font-black block uppercase text-[10px] opacity-75">Respuesta correcta</span>
                      <span className="font-bold">{detalle.correcta}</span>
                    </div>
                  )}
                </div>

                {/* Explicación general */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-gray-200/70 dark:border-gray-800 text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">
                  <p className="font-black text-blue-600 dark:text-blue-400 mb-0.5 flex items-center gap-1">
                    <CheckCircle2 size={12} /> ¿Por qué esta es la respuesta correcta?
                  </p>
                  <p>{textoPlano(exp || juego.explicacionGeneral)}</p>
                </div>

                {/* Desglose opción por opción: por qué la correcta es la correcta y por qué las otras no iban */}
                {Array.isArray(juego.analisisOpciones) && juego.analisisOpciones.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-black text-gray-700 dark:text-gray-200">
                      Análisis de cada opción (por qué la correcta iba y por qué las otras no iban):
                    </p>
                    <div className="space-y-1.5">
                      {juego.analisisOpciones.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-[11px] leading-snug flex items-start gap-2 ${
                            item.esCorrecta
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                              : item.fueElegida
                                ? 'bg-rose-500/15 border-rose-500/35 text-rose-900 dark:text-rose-100'
                                : 'bg-gray-100/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 mt-0.5 ${
                            item.esCorrecta
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.esCorrecta ? '✓ Correcta' : '✗ No iba'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-black break-words">
                              «{item.texto}»
                              {item.fueElegida && (
                                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                  item.esCorrecta
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                }`}>
                                  Tu elección
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 opacity-90">{item.razon}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Minijuego interactivo en cada pregunta que intenta confundir al estudiante */}
                {Array.isArray(juego.opcionesJuego) && juego.opcionesJuego.length > 0 && (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-purple-500/10 border border-amber-500/30 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Target size={14} />
                        </span>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            🎮 Minijuego Cazatrampas · ¡No te dejes confundir!
                          </p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                            Dos opciones son trampas diseñadas para hacerte dudar y solo una dice la verdad.
                          </p>
                        </div>
                      </div>
                      {elegidaIdx !== undefined && (
                        <button
                          type="button"
                          onClick={() => reiniciarJuegoPregunta(qIdx)}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={11} /> Reintentar reto
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-start gap-1.5">
                      <HelpCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>{juego.preguntaTrampa}</span>
                    </p>

                    <div className="space-y-1.5">
                      {juego.opcionesJuego.map((op, opIdx) => {
                        const esLaActual = elegidaIdx === opIdx;
                        const fueTrampaTocada = trampasDeEsta.includes(opIdx);
                        let claseBoton = 'bg-white/90 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-amber-500/60';
                        if (esLaActual && op.esCorrecta) {
                          claseBoton = 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/40';
                        } else if (esLaActual && !op.esCorrecta) {
                          claseBoton = 'bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/40';
                        } else if (fueTrampaTocada) {
                          claseBoton = 'bg-rose-500/10 border-rose-400/40 text-rose-800 dark:text-rose-200 opacity-75';
                        }

                        return (
                          <button
                            key={opIdx}
                            type="button"
                            onClick={() => elegirOpcionJuego(qIdx, opIdx, op.esCorrecta)}
                            className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-start gap-2 ${claseBoton}`}
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {String.fromCharCode(65 + opIdx)}
                            </span>
                            <span className="flex-1 leading-snug">{op.texto}</span>
                            {esLaActual && op.esCorrecta && <span className="shrink-0 text-xs">🏆</span>}
                            {fueTrampaTocada && !op.esCorrecta && <span className="shrink-0 text-xs">🪤</span>}
                          </button>
                        );
                      })}
                    </div>

                    {opcionElegida && (
                      <div
                        className={`p-2.5 rounded-xl border text-[11px] font-bold leading-snug ${
                           superado
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200'
                        }`}
                      >
                        <p className="font-black">
                          {superado
                            ? '🏆 ¡Superaste la trampa! No te dejaste confundir.'
                            : '🪤 ¡Cuidado! Caíste en una trampa para confundirte. Lee por qué e intenta con otra opción:'}
                        </p>
                        <p className="mt-1 font-medium">{opcionElegida.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


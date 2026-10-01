// src/components/SimulacroEvaluacion.jsx
// Simulacro (vista previa) de una evaluacion: muestra COMO LA VERA EL ESTUDIANTE
// antes de publicarla. Es opcional, no guarda nada y no califica.
// Extra util: un interruptor para que la docente vea las respuestas correctas.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { glassCard, glassInput } from '../utils/styles.js';
import { desordenarPalabras } from '../utils/palabras.js';
import { permiteVariasRespuestas } from '../utils/evalScoring.js';
import { Clock, X, Eye, EyeOff, CheckCircle2, ShieldAlert, Mic, Volume2 } from './Icons.jsx';

const dosDigitos = (n) => String(Math.max(0, Math.floor(Number(n) || 0))).padStart(2, '0');

export default function SimulacroEvaluacion({ evaluacion = {}, isDarkMode = false, onClose }) {
  const [respuestas, setRespuestas] = useState({});
  const [mostrarCorrectas, setMostrarCorrectas] = useState(false);

  const preguntas = Array.isArray(evaluacion.questions) ? evaluacion.questions : [];
  const totalPuntos = preguntas.reduce((s, q) => s + (Number(q?.points) || 0), 0);
  const respondidas = preguntas.filter((q, i) => {
    const r = respuestas[i];
    if (Array.isArray(r)) return r.length > 0;
    if (r && typeof r === 'object') return Object.values(r).some(Boolean);
    return Boolean(r);
  }).length;

  const cambiar = (i, valor) => setRespuestas((prev) => ({ ...prev, [i]: valor }));
  const tiempoLimite = evaluacion.timeLimit || 30;
  const fechaEntrega = evaluacion.dueDate ? `${evaluacion.dueDate}${evaluacion.dueTime ? ` · ${evaluacion.dueTime}` : ''}` : 'Sin fecha límite';

  if (typeof document === 'undefined') return null;

  return createPortal((
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-3xl mx-auto p-3 sm:p-6 pb-16">

        {/* Banner de simulacro */}
        <div className="bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 rounded-2xl p-3.5 flex items-start gap-3 mb-3 shadow-sm">
          <Eye size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Simulacro: así verá el estudiante la evaluación</p>
            <p className="text-[11px] font-medium opacity-90 mt-0.5">
              Nada de esto se guarda ni se publica. Puedes responder, escribir y probar todo con tranquilidad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar simulacro"
            className="shrink-0 p-1.5 rounded-xl hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Interruptor de respuestas correctas (solo en el simulacro) */}
        <label className={`mb-3 flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition-colors ${isDarkMode ? 'bg-gray-900/70 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
          <input
            type="checkbox"
            checked={mostrarCorrectas}
            onChange={(e) => setMostrarCorrectas(e.target.checked)}
            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
          />
          {mostrarCorrectas ? <EyeOff size={14} /> : <Eye size={14} />}
          Mostrar respuestas correctas (solo las ves tú en el simulacro)
          {mostrarCorrectas && totalPuntos > 0 && (
            <span className="ml-auto text-emerald-600 dark:text-emerald-400">Puntaje total: {totalPuntos}</span>
          )}
        </label>

        {/* Encabezado igual al del examen */}
        <div className={`${glassCard} !p-4 border border-red-500/20 shadow-md rounded-3xl`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 break-words flex items-center gap-2 flex-wrap">
                <span>{evaluacion.title || 'Evaluación sin título'}</span>
                {evaluacion.strictAntiCheat && (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                    <ShieldAlert size={11} /> Anti-trampas
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5 break-words">{evaluacion.description || 'Sin indicaciones'}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 text-[#AD3333] dark:text-red-400 px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5 shrink-0">
              <Clock size={16} /> {dosDigitos(tiempoLimite)}:00
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>{fechaEntrega}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>{preguntas.length} pregunta{preguntas.length === 1 ? '' : 's'}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>{evaluacion.targetGroupName || 'Todos los estudiantes (Global)'}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>Respondidas: {respondidas}/{preguntas.length}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-2">El cronómetro se activa cuando la evaluación se publica.</p>
        </div>

        {/* Aviso anti-trampas (tal como lo verá el estudiante) */}
        {evaluacion.strictAntiCheat && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 p-3.5 rounded-2xl flex items-start gap-3 mt-4">
            <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Modo estricto anti-trampas activado</p>
              <p className="text-[11px] text-red-600/90 dark:text-red-400/90 mt-0.5">
                Por seguridad académica, <strong>no cambies de pestaña, no minimices la app ni abras otras aplicaciones</strong> durante el examen. <em>(En el simulacro no se aplica.)</em>
              </p>
            </div>
          </div>
        )}

        {/* Preguntas */}
        {preguntas.length === 0 ? (
          <div className={`${glassCard} !p-6 rounded-3xl text-center mt-4`}>
            <p className="text-sm font-bold text-gray-500">Aún no hay preguntas para mostrar.</p>
            <p className="text-xs text-gray-400 mt-1">Agrega al menos una pregunta y vuelve a abrir el simulacro.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {preguntas.map((q, i) => (
              <div key={i} className={`${glassCard} !p-5 border border-gray-200/80 dark:border-gray-800 rounded-3xl`}>
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug flex-1 break-words">
                    {q.text || '(Pregunta sin enunciado)'}
                  </h3>
                  {mostrarCorrectas && Number(q.points) > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      {Number(q.points)} pt
                    </span>
                  )}
                </div>

                {(q.type === 'listening' || q.type === 'dictation') && q.audioUrl && (
                  <div className="pl-8 pt-1">
                    <audio controls src={q.audioUrl} className="w-full max-w-md h-10" />
                    <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                      <Volume2 size={12} /> Escucha el audio y responde.
                    </p>
                  </div>
                )}

                {q.type === 'multiple' || q.type === 'listening' ? (
                  <div className="space-y-2 pt-1 pl-8">
                      <p className="text-[11px] text-gray-500 font-medium">{permiteVariasRespuestas(q) ? 'Puedes marcar una o varias opciones.' : 'Marca solo una opción.'}</p>
                    {(q.options || []).map((opt, oIndex) => {
                      const isSelected = Array.isArray(respuestas[i]) && respuestas[i].includes(oIndex);
                      const esCorrecta = mostrarCorrectas && opt.isCorrect;
                      return (
                        <label
                          key={oIndex}
                          className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border text-sm transition-colors ${
                            isSelected
                              ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                              : (isDarkMode ? 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/60' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100')
                          } ${esCorrecta ? 'ring-2 ring-emerald-500/70' : ''}`}
                        >
                          <input
                            type={permiteVariasRespuestas(q) ? 'checkbox' : 'radio'}
                            checked={isSelected}
                            name={'simulacro-' + i}
                            onChange={(e) => {
                                if (permiteVariasRespuestas(q)) {
                                    const actuales = Array.isArray(respuestas[i]) ? respuestas[i] : [];
                                    cambiar(i, e.target.checked ? [...actuales, oIndex] : actuales.filter((x) => x !== oIndex));
                                } else {
                                    cambiar(i, [oIndex]);
                                }
                            }}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                          <span className="flex-1">{opt.text}</span>
                          {esCorrecta && <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />}
                        </label>
                      );
                    })}
                  </div>
                ) : q.type === 'order' ? (
                  <div className="pt-1 pl-8 space-y-2">
                    <div className={`min-h-[42px] flex flex-wrap items-center gap-1.5 p-2 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-300 bg-gray-50'}`}>
                      {(Array.isArray(respuestas[i]) ? respuestas[i] : []).map((w, wi) => (
                        <button
                          key={wi}
                          type="button"
                          onClick={() => cambiar(i, respuestas[i].filter((_, k) => k !== wi))}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        >
                          {w}
                        </button>
                      ))}
                      {!(Array.isArray(respuestas[i]) && respuestas[i].length > 0) && (
                        <span className="text-xs text-gray-400 font-medium">Toca las palabras en orden para formar la oración...</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const respuesta = Array.isArray(respuestas[i]) ? respuestas[i] : [];
                        const usado = respuesta.reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
                        const visto = {};
                        return desordenarPalabras(q.words || [], q.text || String(i)).map(({ w, idx }) => {
                          visto[w] = (visto[w] || 0) + 1;
                          const usada = visto[w] <= (usado[w] || 0);
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={usada}
                              onClick={() => cambiar(i, [...respuesta, w])}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${isDarkMode ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                            >
                              {w}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {Array.isArray(respuestas[i]) && respuestas[i].length > 0 && (
                      <button type="button" onClick={() => cambiar(i, [])} className="text-[11px] font-bold text-gray-500 hover:text-gray-700 underline cursor-pointer">
                        Borrar todo
                      </button>
                    )}
                    {mostrarCorrectas && (q.words || []).length > 0 && (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Orden correcto: {(q.words || []).join(' ')}</p>
                    )}
                  </div>
                ) : q.type === 'match' ? (
                  <div className="pt-1 pl-8 space-y-2">
                    <p className="text-[11px] text-gray-500 font-medium">Elige la respuesta correcta para cada elemento:</p>
                    {(q.pairs || []).map((par, pIndex) => {
                      const elegida = (respuestas[i] && typeof respuestas[i] === 'object') ? respuestas[i][pIndex] : '';
                      return (
                        <div key={pIndex} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-28 sm:w-40 truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{par.left}</span>
                            <select
                              value={elegida || ''}
                              onChange={(e) => cambiar(i, { ...(respuestas[i] && typeof respuestas[i] === 'object' ? respuestas[i] : {}), [pIndex]: e.target.value })}
                              className={`${glassInput} flex-1 !text-xs !py-1.5`}
                            >
                              <option value="">-- Elige --</option>
                              {desordenarPalabras((q.pairs || []).map((p) => p.right), (q.text || '') + pIndex).map(({ w, idx }) => (
                                <option key={idx} value={w}>{w}</option>
                              ))}
                            </select>
                            {elegida && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                          </div>
                          {mostrarCorrectas && (
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pl-1">Correcta: {par.right}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : q.type === 'speaking' ? (
                  <div className="pt-1 pl-8 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled className="py-2.5 px-5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2 opacity-60 cursor-not-allowed">
                        <Mic size={16} /> Grabar respuesta
                      </button>
                      <span className="text-[11px] text-gray-500 font-medium">En el examen real, aquí el estudiante graba su voz (esta respuesta la calificas tú).</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 pl-8 space-y-2">
                    <input
                      type="text"
                      value={typeof respuestas[i] === 'string' ? respuestas[i] : ''}
                      onChange={(e) => cambiar(i, e.target.value)}
                      placeholder="Escribe tu respuesta aquí..."
                      className={`${glassInput} text-sm font-medium`}
                    />
                    {mostrarCorrectas && q.correctAnswer && (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Respuesta esperada: {q.correctAnswer}
                        {Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0 ? ` (también vale: ${q.acceptedAnswers.join(', ')})` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pie: botón de enviar (desactivado) y cerrar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Simulacro: el botón de enviar está desactivado.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="py-2.5 px-6 rounded-xl bg-green-600 text-white font-bold text-xs flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              Enviar evaluación
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 px-6 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              Cerrar simulacro
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

// src/components/AiEvalGeneratorModal.jsx
// Genera una evaluacion completa (preguntas + respuestas) con IA y la muestra
// para que la docente la revise antes de usarla.
import React, { useState } from 'react'
import { X, Sparkles, Loader2, AlertTriangle, Undo2, CheckCircle2 } from './Icons.jsx'
import {
  MAX_PREGUNTAS,
  TIPOS_MEZCLA,
  IDIOMAS,
  generarPreguntasConIA,
} from '../utils/aiEvalGenerator.js'

const OPCIONES_IDIOMA = [
  { valor: 'es', etiqueta: 'Todo en espa\u00f1ol' },
  { valor: 'en', etiqueta: 'Todo en ingl\u00e9s' },
  { valor: 'fr', etiqueta: 'Todo en franc\u00e9s' },
  { valor: 'bilingue', etiqueta: 'Biling\u00fce (ingl\u00e9s + espa\u00f1ol)' },
  { valor: 'bilingue_fr', etiqueta: 'Biling\u00fce (franc\u00e9s + espa\u00f1ol)' },
]

const AiEvalGeneratorModal = ({ isOpen, onClose, callGemini, onInsert, isDarkMode, existingCount = 0 }) => {
  const [tema, setTema] = useState('')
  const [total, setTotal] = useState(10)
  const [mezcla, setMezcla] = useState('auto')
  const [customMultiple, setCustomMultiple] = useState(5)
  const [dificultad, setDificultad] = useState('media')
  const [idioma, setIdioma] = useState('es')
  const [variasCorrectas, setVariasCorrectas] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const espacioLibre = Math.max(0, MAX_PREGUNTAS - existingCount)

  const calcularDistribucion = () => {
    if (mezcla === 'custom') {
      const m = Math.max(0, Math.min(total, Number(customMultiple) || 0))
      return { multiple: m, text: Math.max(0, total - m) }
    }
    return TIPOS_MEZCLA[mezcla].distribucion(total)
  }

  const generar = async () => {
    if (!tema.trim()) { setError('Escribe el tema o las instrucciones de la evaluaci\u00f3n.'); return; }
    const dist = calcularDistribucion();
    if (dist.multiple + dist.text !== total) { setError('La suma de preguntas por tipo debe ser igual al total.'); return; }
    setError('');
    setResultado(null);
    setGenerando(true);
    try {
      const r = await generarPreguntasConIA(
        { tema: tema.trim(), total, multiple: dist.multiple, text: dist.text, dificultad, idioma, variasCorrectas },
        callGemini
      );
      setResultado(r);
      if (!r.preguntas.length) setError('La IA no pudo generar preguntas. Intenta de nuevo con un tema m\u00e1s espec\u00edfico.');
    } catch (err) {
      const esCuota = err?.code === 'QUOTA_EXCEEDED' || String(err?.message || '').includes('QUOTA');
      setError(esCuota
        ? 'Se agot\u00f3 la cuota de IA por ahora. Espera unos minutos e intenta de nuevo.'
        : 'No se pudo generar la evaluaci\u00f3n. Revisa tu conexi\u00f3n e intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  const usar = (modo) => {
    if (!resultado?.preguntas?.length) return;
    onInsert(resultado.preguntas, modo, { tema: tema.trim(), total });
  }

  const tipoBadge = (q) => q.type === 'multiple'
    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">{'Selecci\u00f3n m\u00faltiple'}</span>
    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">Respuesta escrita</span>

  const input = 'w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 ' + (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800')
  const label = 'block text-[11px] font-bold mb-1 ' + (isDarkMode ? 'text-gray-300' : 'text-gray-600')
  const card = 'rounded-2xl border ' + (isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200')

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className={`${card} shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl`}>
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{'Generar evaluaci\u00f3n con IA'}</h3>
              <p className="text-[11px] text-gray-500 font-medium">{'La IA crea las preguntas y sus respuestas; t\u00fa las revisas antes de guardar.'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div>
            <label className={label}>Tema o instrucciones <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder={'Ej: Pass\u00e9 compos\u00e9 de verbos irregulares, nivel A2. Incluye 2 preguntas de comprensi\u00f3n lectora corta.'}
              className={`${input} resize-y leading-relaxed`}
              disabled={generando}
            />
            <p className="text-[10px] text-gray-500 mt-1">{'Mientras m\u00e1s espec\u00edfica seas (tema, nivel, idioma y enfoque), mejores preguntas salen.'}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={label}>Cantidad de preguntas</label>
              <input
                type="number" min={1} max={Math.min(MAX_PREGUNTAS, espacioLibre || MAX_PREGUNTAS)}
                value={total}
                onChange={(e) => setTotal(Math.max(1, Math.min(Number(e.target.value) || 1, MAX_PREGUNTAS)))}
                className={input}
                disabled={generando}
              />
            </div>
            <div>
              <label className={label}>Dificultad</label>
              <select value={dificultad} onChange={(e) => setDificultad(e.target.value)} className={input} disabled={generando}>
                <option value="facil">{'F\u00e1cil'}</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className={label}>Idioma</label>
              <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className={input} disabled={generando}>
                {OPCIONES_IDIOMA.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Tipo de preguntas</label>
            <div className="flex flex-wrap gap-1.5">
              {[['auto', TIPOS_MEZCLA.auto.etiqueta], ['multiple', TIPOS_MEZCLA.multiple.etiqueta], ['text', TIPOS_MEZCLA.text.etiqueta], ['custom', 'Personalizado']].map(([k, etiqueta]) => (
                <button
                  key={k} type="button" disabled={generando}
                  onClick={() => setMezcla(k)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${mezcla === k
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500')}`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            {mezcla === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={label}>{'Selecci\u00f3n m\u00faltiple'}</label>
                  <input type="number" min={0} max={total} value={customMultiple} onChange={(e) => { const v = Math.max(0, Math.min(total, Number(e.target.value) || 0)); setCustomMultiple(v); }} className={input} disabled={generando} />
                </div>
                <div>
                  <label className={label}>Respuesta escrita</label>
                  <input type="number" min={0} max={total} value={Math.max(0, total - (Number(customMultiple) || 0))} onChange={(e) => { const v = Math.max(0, Math.min(total, Number(e.target.value) || 0)); setCustomMultiple(Math.max(0, total - v)); }} className={input} disabled={generando} />
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 pt-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={variasCorrectas}
                onChange={(e) => setVariasCorrectas(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded mt-0.5 cursor-pointer"
                disabled={generando}
              />
              <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {'Permitir varias respuestas correctas (la IA puede marcar m\u00e1s de una opci\u00f3n como correcta)'}
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {generando && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Loader2 size={18} className="animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Generando las {total} preguntas... puede tardar hasta un minuto.</p>
            </div>
          )}

          {resultado && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {resultado.preguntas.length} preguntas listas para revisar
                </p>
                <button type="button" onClick={generar} disabled={generando} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                  <Undo2 size={12} /> Generar otra vez
                </button>
              </div>

              {resultado.problemas?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold space-y-0.5">
                  <p className="font-black flex items-center gap-1"><AlertTriangle size={12} /> Revisa esto antes de guardar:</p>
                  {resultado.problemas.slice(0, 5).map((p, i) => <p key={i}>- {p}</p>)}
                </div>
              )}

              <div className="space-y-2">
                {resultado.preguntas.map((q, i) => (
                  <div key={i} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className={`text-xs font-bold leading-snug ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{q.text}</p>
                        <div className="flex items-center gap-1.5">
                          {tipoBadge(q)}
                          {q.points && Number(q.points) !== 1 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">{q.points} pts</span>
                          ) : null}
                        </div>
                        {q.type === 'multiple' ? (
                          <ul className="space-y-0.5">
                            {q.options.map((o, oi) => (
                              <li key={oi} className={`text-[11px] font-medium flex items-start gap-1.5 ${o.isCorrect ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500'}`}>
                                <span>{o.isCorrect ? '\u2714' : '\u2022'}</span>
                                <span>{o.text}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-green-600 dark:text-green-400">Respuesta esperada: {q.correctAnswer}</p>
                            {q.acceptedAnswers?.length > 0 && (
                              <p className="text-[10px] text-gray-500 font-medium">{'Tambi\u00e9n v\u00e1lido: '}{q.acceptedAnswers.join(', ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Cancelar
          </button>
          <button
            type="button" onClick={generar} disabled={generando || !tema.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            {generando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {resultado ? 'Generar de nuevo' : 'Generar evaluaci\u00f3n'}
          </button>
          {resultado?.preguntas?.length > 0 && (
            <>
              {existingCount > 0 && existingCount + resultado.preguntas.length <= MAX_PREGUNTAS && (
                <button type="button" onClick={() => usar('agregar')} className="px-4 py-2 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 text-xs font-black hover:bg-blue-500/10 cursor-pointer">
                  Agregar al final ({existingCount + resultado.preguntas.length}/{MAX_PREGUNTAS})
                </button>
              )}
              <button type="button" onClick={() => usar('reemplazar')} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer">
                {existingCount > 0 ? 'Reemplazar las actuales' : 'Usar estas preguntas'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AiEvalGeneratorModal

// src/components/FeedbackIAEvaluacion.jsx
// Explicacion de las respuestas del estudiante en una evaluacion.
// Es AUTOMATICA (sin boton), SIEMPRE en espanol, cubre TODOS los tipos de pregunta
// y solo se genera cuando la evaluacion YA VENCIO (regla tambien en aiFeedback.js).
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from './Icons.jsx';
import { auth, db, appId, doc, updateDoc } from '../firebase/config.js';
import { evaluacionVencida, describirPregunta, generarFeedbackIA } from '../utils/aiFeedback.js';
import { textoPlano } from '../utils/textFormat.js';

// Una generacion a la vez en toda la pagina (evita saturar la IA si hay varias evaluaciones).
let colaGlobal = Promise.resolve();
const enFila = (tarea) => {
  const siguiente = colaGlobal.then(tarea, tarea);
  colaGlobal = siguiente.then(() => undefined, () => undefined);
  return siguiente;
};

// Llamada a la IA con la sesion del usuario (igual que el resto de la app).
async function llamarIA(promptText, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
      throw new Error(errData.error || errData.message || 'No se pudo conectar con la IA.');
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

const preguntasDe = (evaluacion) => (Array.isArray(evaluacion?.questions) ? evaluacion.questions : []);
const iconoDe = (detalle) => {
  if (detalle.esAudio) return '\uD83C\uDFA7';
  return detalle.acierto ? '\u2705' : '\u274C';
};

export default function FeedbackIAEvaluacion({ evaluacion, grade, onGenerado }) {
  const [explicaciones, setExplicaciones] = useState(() => {
    const fb = grade?.feedbackIA;
    return Array.isArray(fb) && fb.some(Boolean) ? fb : null;
  });
  const [estado, setEstado] = useState(() => (Array.isArray(grade?.feedbackIA) && grade.feedbackIA.some(Boolean) ? 'listo' : 'espera'));
  const intentosRef = useRef(0);
  const enCursoRef = useRef(false);
  const vivoRef = useRef(true);
  const gradeRef = useRef(grade);
  gradeRef.current = grade;
  const evaluacionRef = useRef(evaluacion);
  evaluacionRef.current = evaluacion;

  const gradeId = grade?.id;
  const vencida = evaluacionVencida(evaluacion);

  useEffect(() => () => { vivoRef.current = false; }, []);

  const generar = async (forzar = false) => {
    const grado = gradeRef.current;
    const ev = evaluacionRef.current;
    if (!ev || !grado) return;
    if (!evaluacionVencida(ev)) { if (!forzar) setEstado('espera'); return; }
    if (forzar) intentosRef.current = 0;
    if (enCursoRef.current || intentosRef.current >= 2) return;
    enCursoRef.current = true;
    intentosRef.current += 1;
    setEstado('generando');
    try {
      const r = await enFila(() => generarFeedbackIA({
        evaluacion: ev,
        preguntas: preguntasDe(ev),
        respuestas: grado.answers || {},
        llamarIA,
      }));
      if (!r.ok || !r.feedback.some(Boolean)) {
        console.warn('No se pudo preparar la explicacion de las respuestas:', r.problemas);
        if (vivoRef.current) setEstado('fallo');
        return;
      }
      try {
        if (grado.id) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', grado.id), {
            feedbackIA: r.feedback,
            feedbackIAEn: Date.now(),
          });
        }
      } catch (errGuardar) {
        console.warn('No se pudo guardar la retroalimentacion (se muestra igual):', errGuardar);
      }
      if (vivoRef.current) {
        setExplicaciones(r.feedback);
        setEstado('listo');
        onGenerado?.(r.feedback);
      }
    } catch (err) {
      console.error('Error preparando la explicacion de las respuestas:', err);
      if (vivoRef.current) setEstado('fallo');
    } finally {
      enCursoRef.current = false;
    }
  };

  useEffect(() => {
    if (vencida && !explicaciones) generar();
  }, [gradeId, vencida]);

  if (!vencida) return null;

  const preguntas = preguntasDe(evaluacion);
  const respuestas = grade?.answers || {};
  const yaTiene = Array.isArray(explicaciones) && explicaciones.some(Boolean);

  return (
    <div className="w-full mt-2.5 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
        <Sparkles size={11} /> Explicacion de tus respuestas
      </p>
      {yaTiene ? (
        <div className="space-y-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          {preguntas.map((q, qIdx) => {
            const explicacion = explicaciones[qIdx];
            if (!explicacion) return null;
            const detalle = describirPregunta(q, respuestas[qIdx]);
            return (
              <div key={qIdx} className="text-[11px] leading-relaxed">
                <p className="font-bold text-gray-700 dark:text-gray-200">
                  {iconoDe(detalle)} {qIdx + 1}. {String(q?.text || q?.question || '').slice(0, 90)}
                </p>
                <p className="text-gray-600 dark:text-gray-300 pl-4">{textoPlano(explicacion)}</p>
              </div>
            );
          })}
        </div>
      ) : estado === 'fallo' && intentosRef.current >= 2 ? (
        <button
          type="button"
          onClick={() => generar(true)}
          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
        >
          No se pudo preparar la explicacion. Toca aqui para intentarlo otra vez.
        </button>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Preparando la explicacion de tus respuestas...
        </p>
      )}
    </div>
  );
}

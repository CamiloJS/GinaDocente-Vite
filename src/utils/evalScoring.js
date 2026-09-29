// src/utils/evalScoring.js
// Motor de calificacion de evaluaciones (probado en scripts/test-scoring.mjs).

/** Normaliza una respuesta para comparar: ignora mayusculas, tildes y espacios de mas. */
export const normalizarRespuesta = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/** Respuestas validas de una pregunta escrita (correctAnswer + acceptedAnswers). */
export const respuestasValidasDe = (q) =>
  [q?.correctAnswer, ...(Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])].map(normalizarRespuesta).filter(Boolean);

/** Puntaje de la pregunta (por defecto 1). */
export const puntajeDe = (q) => (Number(q?.points) > 0 ? Number(q.points) : 1);

/**
 * Calcula la nota (0.0 a 5.0).
 * - Respeta el puntaje por pregunta (q.points, por defecto 1).
 * - Las escritas aceptan varias respuestas validas y toleran tildes/mayusculas/espacios.
 * - Relacionar columnas da puntaje parcial por pareja.
 * - Ordenar la oracion compara la secuencia completa.
 * - Las de speaking las califica la docente (no suman al automatico).
 */
export function calculateScore(evalData, answers) {
  if (!evalData?.questions || evalData.questions.length === 0) return 0;
  let obtenidos = 0;
  let totales = 0;

  evalData.questions.forEach((q, i) => {
    if (q.type === 'speaking') return; // calificacion manual
    const valor = puntajeDe(q);
    totales += valor;
    const ans = answers ? answers[i] : undefined;
    let factor = 0;

    if (q.type === 'multiple' || q.type === 'listening') {
      const correctIndices = (q.options || []).map((opt, idx) => (opt?.isCorrect ? idx : -1)).filter((idx) => idx !== -1);
      const selectedIndices = Array.isArray(ans) ? ans : [];
      if (correctIndices.length > 0 && correctIndices.length === selectedIndices.length && correctIndices.every((idx) => selectedIndices.includes(idx))) {
        factor = 1;
      }
    } else if (q.type === 'order') {
      const esperado = (q.words || []).map(normalizarRespuesta).join(' ');
      const dado = (Array.isArray(ans) ? ans : []).map(normalizarRespuesta).join(' ');
      if (esperado && dado === esperado) factor = 1;
    } else if (q.type === 'match') {
      const pares = q.pairs || [];
      if (pares.length > 0 && ans && typeof ans === 'object') {
        const aciertos = pares.filter((p, idx) => normalizarRespuesta(ans[idx]) === normalizarRespuesta(p.right)).length;
        factor = aciertos / pares.length; // puntaje parcial por pareja
      }
    } else {
      const validas = respuestasValidasDe(q);
      if (validas.length > 0 && validas.includes(normalizarRespuesta(ans))) factor = 1;
    }

    obtenidos += valor * factor;
  });

  if (totales === 0) return 0;
  return Math.round(((obtenidos / totales) * 5.0) * 10) / 10;
}

/** True si la evaluacion tiene preguntas que la docente debe calificar a mano. */
export const tienePreguntasManuales = (evalData) => (evalData?.questions || []).some((q) => q?.type === 'speaking');

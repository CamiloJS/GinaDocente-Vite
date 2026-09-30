// src/utils/aiFeedback.js
// Retroalimentacion con IA para las evaluaciones: SIEMPRE en espanol, automatica y para todos los tipos.
// REGLA CLAVE: solo se puede generar/mostrar cuando la evaluacion YA VENCIO.
// Probado en scripts/test-feedback.mjs

/** True si la evaluacion ya paso su fecha/hora limite (misma logica que cierra el examen). */
export function evaluacionVencida(ev, ahora = Date.now()) {
  if (!ev?.dueDate) return false;
  const fecha = new Date(`${ev.dueDate}T${ev.dueTime || '23:59'}`);
  if (isNaN(fecha.getTime())) return false;
  return ahora > fecha.getTime();
}

/** Resumen legible de una pregunta con la respuesta del estudiante y la correcta. */
export function describirPregunta(q, respuesta) {
  const limpio = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const tipo = q?.type || 'text';
  const enunciado = limpio(q?.text || q?.question || '').slice(0, 300);

  if (tipo === 'speaking') {
    // No se puede oir el audio: se explica que debia incluir una buena respuesta.
    const respondio = !!respuesta;
    return {
      tipo,
      esAudio: true,
      enunciado,
      opciones: '',
      correcta: '',
      delEstudiante: respondio ? '(respondio grabando un audio)' : '(no grabo nada)',
      acierto: null,
    };
  }

  let correcta = '';
  let delEstudiante = '';
  let acierto = false;
  let extra = {};

  if (tipo === 'multiple' || tipo === 'listening') {
    const opciones = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${limpio(o.text)}`);
    const correctas = (q.options || []).map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1);
    const marcadas = Array.isArray(respuesta) ? respuesta : [];
    acierto = correctas.length > 0 && marcadas.length === correctas.length && correctas.every((i) => marcadas.includes(i));
    correcta = correctas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ');
    delEstudiante = marcadas.length ? marcadas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ') : '(en blanco)';
    extra = { opciones: opciones.join('; ') };
  } else if (tipo === 'order') {
    const esperado = (q.words || []).map(limpio).join(' ');
    const dado = (Array.isArray(respuesta) ? respuesta : []).map(limpio).join(' ');
    acierto = !!esperado && dado === esperado;
    correcta = esperado;
    delEstudiante = dado || '(en blanco)';
  } else if (tipo === 'match') {
    const pares = q.pairs || [];
    const elegidas = respuesta && typeof respuesta === 'object' ? respuesta : {};
    const aciertos = pares.filter((p, i) => limpio(elegidas[i]).toLowerCase() === limpio(p.right).toLowerCase()).length;
    acierto = pares.length > 0 && aciertos === pares.length;
    correcta = pares.map((p) => `${limpio(p.left)} -> ${limpio(p.right)}`).join('; ');
    delEstudiante = pares.map((p, i) => `${limpio(p.left)} -> ${limpio(elegidas[i]) || '(sin elegir)'}`).join('; ');
    extra = { parcial: aciertos };
  } else {
    const validas = [q?.correctAnswer, ...(Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])].map((x) => limpio(x).toLowerCase()).filter(Boolean);
    const dada = limpio(respuesta).toLowerCase();
    acierto = validas.length > 0 && validas.includes(dada);
    correcta = limpio(q?.correctAnswer) + (Array.isArray(q?.acceptedAnswers) && q.acceptedAnswers.length ? ` (tambien vale: ${q.acceptedAnswers.map(limpio).join(', ')})` : '');
    delEstudiante = limpio(respuesta) || '(en blanco)';
  }

  return { tipo, esAudio: false, enunciado, correcta, delEstudiante, acierto, ...extra };
}

/**
 * Arma el prompt. SIEMPRE en espanol (para que todos los estudiantes entiendan).
 */
export function construirPromptFeedback({ titulo = '', items = [] }) {
  const lineas = items.map((it, i) => {
    if (it.esAudio) {
      return [
        `${i + 1}) [RESPUESTA GRABADA (audio)] Consigna: ${it.enunciado || '(sin consigna)'}`,
        `   El estudiante respondio grabando su voz (la profesora lo califica escuchando).`,
      ].join('\n');
    }
    const estado = it.acierto ? 'CORRECTA' : 'INCORRECTA';
    const parcial = Number.isFinite(it.parcial) && it.parcial > 0 && !it.acierto ? ` (acerto ${it.parcial} de las parejas)` : '';
    return [
      `${i + 1}) [${estado}${parcial}] Enunciado: ${it.enunciado || '(sin enunciado)'}`,
      it.opciones ? `   Opciones: ${it.opciones}` : '',
      it.correcta ? `   Respuesta correcta: ${it.correcta}` : '',
      `   Respondio el estudiante: ${it.delEstudiante}`,
    ].filter(Boolean).join('\n');
  });

  return [
    'Eres un docente de idiomas que da retroalimentacion breve, clara y muy motivadora a sus estudiantes.',
    titulo ? `Evaluacion: "${titulo}"` : '',
    'IMPORTANTE: escribe SIEMPRE en ESPANOL (asi todos los estudiantes entienden), aunque la pregunta este en otro idioma.',
    'Para cada pregunta escribe maximo 2 oraciones: por que esta bien o cual fue el error y cual era la respuesta correcta.',
    'Usa un tono amable y cercano. Nunca regañes ni uses palabras duras.',
    'Devuelve UNICAMENTE un arreglo JSON valido, sin texto antes ni despues, sin bloques de codigo:',
    '[{"i":1,"explicacion":"..."},{"i":2,"explicacion":"..."}]',
    'Reglas por tipo:',
    '- Si la respuesta fue CORRECTA: refuerza por que esta bien y da una pista corta para recordarlo.',
    '- Si fue INCORRECTA o quedo en blanco: explica el error y cual era la respuesta correcta.',
    '- Si acerto solo una parte (relacionar): reconoce lo que hizo bien y aclara lo que falto.',
    '- Si la pregunta es de RESPUESTA GRABADA (audio): NO puedes oirla; explica en español que debia incluir una buena respuesta y da un ejemplo breve y util.',
    '- Usa solo la informacion de la pregunta; no inventes datos.',
    '- Texto plano: sin asteriscos, sin etiquetas y sin markdown.',
    '',
    'Preguntas:',
    ...lineas,
    '',
    'Responde solo con el JSON.',
  ].filter(Boolean).join('\n');
}

/** Parseo defensivo: devuelve un arreglo de textos por pregunta. */
export function parsearFeedback(texto, totalPreguntas) {
  const limpio = (v, max = 400) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  let t = String(texto || '').trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = t.indexOf('[');
  const fin = t.lastIndexOf(']');
  if (ini !== -1 && fin !== -1 && fin > ini) t = t.slice(ini, fin + 1);

  let datos = null;
  try { datos = JSON.parse(t); } catch (e) {
    try { datos = JSON.parse(t.replace(/[\u201C\u201D]/g, '"').replace(/,\s*([\]}])/g, '$1')); } catch (e2) { return { ok: false, feedback: [], problemas: ['La IA no devolvio un JSON valido.'] }; }
  }
  const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.feedback) ? datos.feedback : null;
  if (!lista) return { ok: false, feedback: [], problemas: ['La respuesta de la IA no traia una lista.'] };

  const salida = new Array(Number(totalPreguntas) || lista.length).fill('');
  const problemas = [];
  lista.forEach((item, idx) => {
    const posicion = Number(item?.i) ? Number(item.i) - 1 : idx;
    const txt = limpio(typeof item === 'string' ? item : item?.explicacion || item?.feedback || item?.texto);
    if (posicion >= 0 && posicion < salida.length && txt) salida[posicion] = txt;
    else if (!txt) problemas.push(`la explicacion ${idx + 1} vino vacia`);
  });
  return { ok: salida.some(Boolean), feedback: salida, problemas };
}

/**
 * Genera la retroalimentacion completa (todos los tipos, en espanol).
 * Se niega si la evaluacion NO ha vencido.
 * @param {object} opciones { evaluacion, preguntas, respuestas, llamarIA, ahora }
 */
export async function generarFeedbackIA({ evaluacion, preguntas = [], respuestas = {}, llamarIA, ahora = Date.now() }) {
  if (!evaluacionVencida(evaluacion, ahora)) {
    return { ok: false, feedback: [], problemas: ['La explicacion estara disponible cuando cierre la evaluacion.'], vencida: false };
  }
  const items = (preguntas || []).map((q, i) => describirPregunta(q, respuestas?.[i]));
  if (items.length === 0) return { ok: false, feedback: [], problemas: ['No hay preguntas para explicar.'], vencida: true };

  const prompt = construirPromptFeedback({ titulo: evaluacion?.title || '', items });
  const bruto = await llamarIA(prompt, 120000);
  const parsed = parsearFeedback(bruto, items.length);
  return { ok: parsed.ok, feedback: parsed.feedback, problemas: parsed.problemas, vencida: true };
}

/**
 * Que evaluaciones necesitan retroalimentacion (vencidas, con nota y sin explicacion generada).
 * Devuelve una lista ordenada (la mas reciente primero) y limitada.
 */
export function pendientesDeFeedback({ evaluaciones = [], notas = [], limite = 5, ahora = Date.now() } = {}) {
  const pendientes = [];
  (evaluaciones || []).forEach((ev) => {
    if (!evaluacionVencida(ev, ahora)) return;
    const nota = (notas || []).find((g) => g?.evaluationId === ev.id);
    if (!nota) return;
    const yaTiene = Array.isArray(nota.feedbackIA) && nota.feedbackIA.some(Boolean);
    if (yaTiene) return;
    pendientes.push({ evaluacion: ev, nota });
  });
  pendientes.sort((a, b) => (Number(b.evaluacion?.createdAt) || 0) - (Number(a.evaluacion?.createdAt) || 0));
  return pendientes.slice(0, Math.max(0, limite));
}

export default generarFeedbackIA;

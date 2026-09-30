// src/utils/aiFeedback.js
// Retroalimentacion con IA para las evaluaciones (por que acerto y por que fallo).
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
  let correcta = '';
  let delEstudiante = '';
  let acierto = false;

  if (tipo === 'multiple' || tipo === 'listening') {
    const opciones = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${limpio(o.text)}`);
    const correctas = (q.options || []).map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1);
    const marcadas = Array.isArray(respuesta) ? respuesta : [];
    acierto = correctas.length > 0 && marcadas.length === correctas.length && correctas.every((i) => marcadas.includes(i));
    correcta = correctas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ');
    delEstudiante = marcadas.length ? marcadas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ') : '(en blanco)';
    return { tipo, enunciado, opciones: opciones.join('; '), correcta, delEstudiante, acierto };
  }
  if (tipo === 'order') {
    const esperado = (q.words || []).map(limpio).join(' ');
    const dado = (Array.isArray(respuesta) ? respuesta : []).map(limpio).join(' ');
    acierto = !!esperado && dado === esperado;
    correcta = esperado;
    delEstudiante = dado || '(en blanco)';
    return { tipo, enunciado, opciones: '', correcta, delEstudiante, acierto };
  }
  if (tipo === 'match') {
    const pares = q.pairs || [];
    const elegidas = respuesta && typeof respuesta === 'object' ? respuesta : {};
    const aciertos = pares.filter((p, i) => limpio(elegidas[i]).toLowerCase() === limpio(p.right).toLowerCase()).length;
    acierto = pares.length > 0 && aciertos === pares.length;
    correcta = pares.map((p) => `${limpio(p.left)} -> ${limpio(p.right)}`).join('; ');
    delEstudiante = pares.map((p, i) => `${limpio(p.left)} -> ${limpio(elegidas[i]) || '(sin elegir)'}`).join('; ');
    return { tipo, enunciado, opciones: '', correcta, delEstudiante, acierto, parcial: aciertos };
  }
  // escrita / dictado
  const validas = [q?.correctAnswer, ...(Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])].map((x) => limpio(x).toLowerCase()).filter(Boolean);
  const dada = limpio(respuesta).toLowerCase();
  acierto = validas.length > 0 && validas.includes(dada);
  correcta = limpio(q?.correctAnswer) + (Array.isArray(q?.acceptedAnswers) && q.acceptedAnswers.length ? ` (tambien vale: ${q.acceptedAnswers.map(limpio).join(', ')})` : '');
  delEstudiante = limpio(respuesta) || '(en blanco)';
  return { tipo, enunciado, opciones: '', correcta, delEstudiante, acierto };
}

/** Arma el prompt para que la IA explique cada respuesta. */
export function construirPromptFeedback({ titulo = '', idioma = 'es', items = [] }) {
  const idiomaTexto = { es: 'espa\u00f1ol', en: 'ingl\u00e9s', fr: 'franc\u00e9s' }[idioma] || 'espa\u00f1ol';
  const lineas = items.map((it, i) => {
    const estado = it.acierto ? 'CORRECTA' : 'INCORRECTA';
    return [
      `${i + 1}) [${estado}] Enunciado: ${it.enunciado || '(sin enunciado)'}`,
      it.opciones ? `   Opciones: ${it.opciones}` : '',
      it.correcta ? `   Respuesta correcta: ${it.correcta}` : '',
      `   Respondio el estudiante: ${it.delEstudiante}`,
    ].filter(Boolean).join('\n');
  });

  return [
    'Eres un docente de idiomas que da retroalimentacion breve, clara y motivadora a sus estudiantes.',
    titulo ? `Evaluacion: "${titulo}"` : '',
    `Responde en ${idiomaTexto}, con tono amable y sencillo, maximo 2 oraciones por pregunta.`,
    'Devuelve UNICAMENTE un arreglo JSON valido, sin texto antes ni despues, sin bloques de codigo:',
    '[{"i":1,"explicacion":"..."},{"i":2,"explicacion":"..."}]',
    'Reglas:',
    '- Si la respuesta fue CORRECTA: refuerza por que esta bien y da una pista corta para recordarlo.',
    '- Si fue INCORRECTA o quedo en blanco: explica el error y cual era la respuesta correcta, sin regañar.',
    '- Usa solo la informacion de la pregunta; no inventes datos.',
    '- Escribe en texto plano: sin asteriscos, sin etiquetas y sin markdown.',
    '',
    'Preguntas:',
    ...lineas,
    '',
    'Responde solo con el JSON.',
  ].filter(Boolean).join('\n');
}

/** Parseo defensivo de la respuesta de la IA: devuelve un arreglo de textos por pregunta. */
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
 * Genera la retroalimentacion completa. Se niega a hacerlo si la evaluacion NO ha vencido.
 * @param {object} opciones { evaluacion, preguntas, respuestas, llamarIA }
 */
export async function generarFeedbackIA({ evaluacion, preguntas = [], respuestas = {}, llamarIA, ahora = Date.now() }) {
  if (!evaluacionVencida(evaluacion, ahora)) {
    return { ok: false, feedback: [], problemas: ['La retroalimentacion solo esta disponible cuando la evaluacion ya vencio.'], vencida: false };
  }
  const items = [];
  const indices = [];
  (preguntas || []).forEach((q, i) => {
    if (q?.type === 'speaking') return; // se califica a mano, no hay texto que analizar
    items.push(describirPregunta(q, respuestas?.[i]));
    indices.push(i);
  });
  if (items.length === 0) return { ok: false, feedback: [], problemas: ['No hay preguntas para explicar.'], vencida: true };

  const prompt = construirPromptFeedback({ titulo: evaluacion?.title || '', idioma: evaluacion?.idioma || 'es', items });
  const bruto = await llamarIA(prompt, 120000);
  const parsed = parsearFeedback(bruto, items.length);

  // reubicar en los indices reales de la evaluacion (saltando las de speaking)
  const feedback = new Array(preguntas.length).fill('');
  parsed.feedback.forEach((txt, k) => { if (txt) feedback[indices[k]] = txt; });

  return { ok: parsed.ok, feedback, problemas: parsed.problemas, vencida: true };
}

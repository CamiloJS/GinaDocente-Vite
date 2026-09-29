// src/utils/aiEvalGenerator.js
// Generador de evaluaciones completas con IA.
// La logica esta separada de la interfaz para poder probarla (ver scripts/test-ai-eval.mjs).

export const MAX_PREGUNTAS = 20;
export const MIN_PREGUNTAS = 1;

export const TIPOS_MEZCLA = {
  auto: {
    etiqueta: 'Autom\u00e1tica (mitad y mitad)',
    distribucion: (total) => {
      const multiple = Math.max(1, Math.floor(total / 2));
      return { multiple, text: total - multiple };
    },
  },
  multiple: { etiqueta: 'Solo selecci\u00f3n m\u00faltiple', distribucion: (total) => ({ multiple: total, text: 0 }) },
  text: { etiqueta: 'Solo respuesta escrita', distribucion: (total) => ({ multiple: 0, text: total }) },
};

export const DIFICULTADES = {
  facil: 'F\u00e1cil (vocabulario b\u00e1sico, preguntas directas)',
  media: 'Media (nivel de clase, requiere comprensi\u00f3n)',
  alta: 'Alta (an\u00e1lisis, distractores finos, menos pistas)',
};

export const IDIOMAS = {
  es: 'Todo en espa\u00f1ol',
  en: 'Todo en ingl\u00e9s',
  fr: 'Todo en franc\u00e9s',
  bilingue: 'Biling\u00fce: enunciado y opciones en ingl\u00e9s, con la traducci\u00f3n al espa\u00f1ol entre par\u00e9ntesis',
  bilingue_fr: 'Biling\u00fce: enunciado y opciones en franc\u00e9s, con la traducci\u00f3n al espa\u00f1ol entre par\u00e9ntesis',
};

/** Arma el prompt que se le envia a la IA. */
export function construirPrompt({ tema, total, multiple, text, dificultad = 'media', idioma = 'es', titulo = '', publico = 'estudiantes', variasCorrectas = false }) {
  const reglas = [
    `Genera EXACTAMENTE ${total} preguntas en total.`,
    `De esas ${total}: ${multiple} de selecci\u00f3n m\u00faltiple y ${text} de respuesta escrita.`,
    'Devuelve UNICAMENTE un arreglo JSON valido, sin texto antes ni despues, sin bloques de codigo ```.',
    'Formato exacto:',
    '[{"type":"multiple","text":"enunciado","options":[{"text":"opcion","isCorrect":true},{"text":"opcion","isCorrect":false}],"correctAnswer":"","acceptedAnswers":[]},' +
      '{"type":"text","text":"enunciado","options":[],"correctAnswer":"respuesta esperada corta","acceptedAnswers":["otra forma valida"]}]',
    variasCorrectas
      ? 'En las de selecci\u00f3n m\u00faltiple usa entre 3 y 5 opciones y puede haber 1 o 2 opciones correctas: marca TODAS las correctas con isCorrect y las demas en false.'
      : 'En las de selecci\u00f3n m\u00faltiple usa entre 3 y 4 opciones y marca con isCorrect exactamente UNA opci\u00f3n correcta (las demas en false).',
    'En las de respuesta escrita agrega acceptedAnswers: un arreglo con otras formas validas de responder (sinonimos, variantes ortograficas, con o sin articulo). Si no hay, deja el arreglo vacio.',
    'En las de respuesta escrita, correctAnswer debe ser corta (1 a 4 palabras) y verificable.',
    'No repitas preguntas ni el mismo enfoque; varia el vocabulario, el contexto y el tipo de ejercicio.',
    'No numeres los enunciados ni incluyas la respuesta dentro del enunciado.',
    'No uses comillas dobles dentro de los textos (usa comillas simples si necesitas).',
    'Cada enunciado debe ser claro y resolverse sin material adicional.',
  ];

  return [
    'Eres un docente experto en diseno de evaluaciones.',
    `Tema o instrucciones de la docente: "${tema}"`,
    titulo ? `Titulo de la evaluacion: "${titulo}"` : '',
    `Nivel de dificultad: ${DIFICULTADES[dificultad] || DIFICULTADES.media}`,
    `Idioma: ${IDIOMAS[idioma] || IDIOMAS.es}`,
    `Dirigido a: ${publico}.`,
    '',
    'Reglas obligatorias:',
    ...reglas.map((r) => '- ' + r),
    '',
    'Responde solo con el JSON.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Limpia bloques de codigo y caracteres problematicos para intentar parsear el JSON. */
function limpiarTexto(texto) {
  let t = String(texto || '').trim();
  t = t.replace(/```json/gi, '').replace(/```/g, '').trim();
  const inicio = t.indexOf('[');
  const fin = t.lastIndexOf(']');
  if (inicio !== -1 && fin !== -1 && fin > inicio) t = t.slice(inicio, fin + 1);
  return t;
}

/** Reparaciones seguras para JSONs generados por IA. */
function repararJSON(t) {
  return t
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"') // comillas tipograficas
    .replace(/,\s*([\]}])/g, '$1') // comas finales
    .replace(/[\u2018\u2019]/g, "'");
}

const limpiar = (v, max = 600) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

/** Normaliza y valida una pregunta generada. Devuelve { pregunta, problema }. */
function normalizarPregunta(q) {
  if (!q || typeof q !== 'object') return { problema: 'una pregunta no era un objeto' };
  const texto = limpiar(q.text || q.pregunta || q.enunciado, 600);
  if (!texto) return { problema: 'una pregunta vino sin enunciado' };

  let opciones = Array.isArray(q.options || q.opciones) ? (q.options || q.opciones) : [];
  opciones = opciones
    .map((o) => ({
      text: limpiar(typeof o === 'string' ? o : o?.text || o?.texto, 300),
      isCorrect: Boolean(typeof o === 'object' ? o?.isCorrect ?? o?.correcta : false),
    }))
    .filter((o) => o.text);

  const esMultiple = (q.type || q.tipo) === 'multiple' && opciones.length >= 2;
  const respuesta = limpiar(q.correctAnswer || q.respuesta, 300);
  const puntos = Number(q.points) > 0 ? Number(q.points) : 1;
  const alternativas = (Array.isArray(q.acceptedAnswers || q.aceptadas) ? (q.acceptedAnswers || q.aceptadas) : [q.acceptedAnswers].filter(Boolean))
    .map((s) => limpiar(s, 120))
    .filter(Boolean)
    .slice(0, 6);

  if (esMultiple) {
    // si la IA no marco ninguna correcta, intentar deducirla por la respuesta escrita
    if (!opciones.some((o) => o.isCorrect) && respuesta) {
      const objetivo = respuesta.toLowerCase();
      const idx = opciones.findIndex((o) => o.text.toLowerCase() === objetivo || o.text.toLowerCase().includes(objetivo));
      if (idx >= 0) opciones[idx].isCorrect = true;
    }
    if (opciones.length > 6) opciones = opciones.slice(0, 6);
    if (!opciones.some((o) => o.isCorrect)) {
      return { problema: `la pregunta "${texto.slice(0, 40)}..." no tiene opci\u00f3n correcta marcada` };
    }
    return { pregunta: { type: 'multiple', text: texto, options: opciones, correctAnswer: '', points: puntos } };
  }

  // respuesta escrita
  if (!respuesta) return { problema: `la pregunta "${texto.slice(0, 40)}..." no trae respuesta esperada` };
  return { pregunta: { type: 'text', text: texto, options: [], correctAnswer: respuesta, acceptedAnswers: alternativas, points: puntos } };
}

/**
 * Parsea la respuesta de la IA y devuelve preguntas listas para el formulario.
 * @returns {{ ok: boolean, preguntas: Array, problemas: string[] }}
 */
export function parsearEvaluacion(texto, totalEsperado = null) {
  const problemas = [];
  const bruto = limpiarTexto(texto);
  let datos = null;
  try {
    datos = JSON.parse(bruto);
  } catch (e) {
    try {
      datos = JSON.parse(repararJSON(bruto));
    } catch (e2) {
      return { ok: false, preguntas: [], problemas: ['La IA no devolvi\u00f3 un JSON v\u00e1lido. Intenta de nuevo.'] };
    }
  }

  const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.questions) ? datos.questions : Array.isArray(datos?.preguntas) ? datos.preguntas : null;
  if (!lista) return { ok: false, preguntas: [], problemas: ['La respuesta de la IA no tra\u00eda una lista de preguntas.'] };

  const preguntas = [];
  const vistos = new Set();
  for (const q of lista) {
    const { pregunta, problema } = normalizarPregunta(q);
    if (problema) { problemas.push(problema); continue; }
    const clave = pregunta.text.toLowerCase().slice(0, 80);
    if (vistos.has(clave)) { problemas.push(`pregunta repetida: "${pregunta.text.slice(0, 40)}..."`); continue; }
    vistos.add(clave);
    preguntas.push(pregunta);
  }

  if (totalEsperado && preguntas.length !== totalEsperado) {
    problemas.push(`se pidieron ${totalEsperado} preguntas y llegaron ${preguntas.length} v\u00e1lidas`);
  }

  return { ok: problemas.length === 0 && preguntas.length > 0, preguntas, problemas };
}

/**
 * Genera la evaluacion completa: pide a la IA, valida y (si algo falla) reintenta una vez.
 * @param {object} opciones { tema, total, multiple, text, dificultad, idioma, titulo }
 * @param {(prompt: string, timeoutMs?: number) => Promise<string>} llamarIA
 */
export async function generarPreguntasConIA(opciones, llamarIA) {
  const total = Math.min(MAX_PREGUNTAS, Math.max(MIN_PREGUNTAS, Number(opciones.total) || 10));
  const multiple = opciones.multiple != null ? Number(opciones.multiple) : TIPOS_MEZCLA.auto.distribucion(total).multiple;
  const text = Math.min(total - multiple >= 0 ? total - multiple : 0, total);
  const base = { ...opciones, total, multiple: Math.min(multiple, total), text };

  const prompt = construirPrompt(base);
  let r = parsearEvaluacion(await llamarIA(prompt, 150000), total);

  if (!r.ok) {
    const aviso = r.problemas.slice(0, 4).join('; ');
    const prompt2 = construirPrompt(base) + `\n\nCORRECCION OBLIGATORIA: tu respuesta anterior fallo por: ${aviso}. Devuelve SOLO el JSON con EXACTAMENTE ${total} preguntas validas.`;
    const segundo = parsearEvaluacion(await llamarIA(prompt2, 150000), total);
    // si el segundo intento mejora, usarlo
    if (segundo.preguntas.length >= r.preguntas.length) r = segundo;
  }

  return { ...r, total };
}

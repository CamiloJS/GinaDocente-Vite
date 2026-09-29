// src/utils/aiEvalGenerator.js
// Generador de evaluaciones completas con IA.
// La logica esta separada de la interfaz para poder probarla (ver scripts/test-ai-eval.mjs).

import { textoPlano } from './textFormat.js';

export const MAX_PREGUNTAS = 20;
export const MIN_PREGUNTAS = 1;

/** Presets de mezcla de tipos. 'custom' lo define la docente a mano. */
export const PRESETS = {
  variada: {
    etiqueta: 'Variada (recomendada)',
    calc: (total) => {
      const match = total >= 8 ? 1 : 0;
      const multiple = Math.max(1, Math.round(total * 0.4));
      const vf = total >= 4 ? Math.max(1, Math.round(total * 0.2)) : 0;
      const text = Math.max(1, Math.round(total * 0.2));
      const orden = Math.max(0, total - multiple - vf - text - match);
      const tipos = { multiple, vf, text, orden, match };
      // ajuste de seguridad para que la suma sea exacta
      const suma = tipos.multiple + tipos.vf + tipos.text + tipos.orden + tipos.match;
      if (suma !== total) tipos.multiple = Math.max(0, tipos.multiple + (total - suma));
      return tipos;
    },
  },
  mitad: {
    etiqueta: 'Mitad y mitad',
    calc: (total) => {
      const multiple = Math.max(1, Math.floor(total / 2));
      return { multiple, vf: 0, text: total - multiple, orden: 0, match: 0 };
    },
  },
  multiple: { etiqueta: 'Solo selecci\u00f3n m\u00faltiple', calc: (total) => ({ multiple: total, vf: 0, text: 0, orden: 0, match: 0 }) },
  text: { etiqueta: 'Solo respuesta escrita', calc: (total) => ({ multiple: 0, vf: 0, text: total, orden: 0, match: 0 }) },
  custom: { etiqueta: 'Personalizado', calc: () => null },
};

export const TIPOS_ETIQUETAS = {
  multiple: 'Selecci\u00f3n m\u00faltiple',
  vf: 'Verdadero/Falso',
  text: 'Respuesta escrita',
  orden: 'Ordenar la oraci\u00f3n',
  match: 'Relacionar columnas',
};

/** Normaliza los tipos: acepta { multiple, text } (viejo) o { tipos: {...} } (nuevo). */
export function normalizarTipos(opciones) {
  if (opciones?.tipos && typeof opciones.tipos === 'object') {
    const t = opciones.tipos;
    return {
      multiple: Math.max(0, Number(t.multiple) || 0),
      vf: Math.max(0, Number(t.vf) || 0),
      text: Math.max(0, Number(t.text) || 0),
      orden: Math.max(0, Number(t.orden) || 0),
      match: Math.max(0, Number(t.match) || 0),
    };
  }
  return {
    multiple: Math.max(0, Number(opciones?.multiple) || 0),
    vf: 0,
    text: Math.max(0, Number(opciones?.text) || 0),
    orden: 0,
    match: 0,
  };
}

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

/** Texto con las cantidades por tipo (se usa en el prompt y en la correccion). */
const desgloseDe = (t) =>
  [
    t.multiple > 0 ? `${t.multiple} de selecci\u00f3n m\u00faltiple (type "multiple", con options)` : '',
    t.vf > 0 ? `${t.vf} de Verdadero o Falso (type "truefalse", correctAnswer "verdadero" o "falso")` : '',
    t.text > 0 ? `${t.text} de respuesta escrita (type "text", con correctAnswer y acceptedAnswers)` : '',
    t.orden > 0 ? `${t.orden} de ordenar la oraci\u00f3n (type "order" con words en el orden correcto)` : '',
    t.match > 0 ? `${t.match} de relacionar columnas (type "match" con pairs [{"left":"...","right":"..."}])` : '',
  ].filter(Boolean);

/** Arma el prompt que se le envia a la IA. */
export function construirPrompt({ tema, total, multiple, text, dificultad = 'media', idioma = 'es', titulo = '', publico = 'estudiantes', variasCorrectas = false, tipos }) {
  const t = normalizarTipos({ tipos, multiple, text });
  const desglose = desgloseDe(t);

  const reglas = [
    `Genera EXACTAMENTE ${total} preguntas en total, respetando estas cantidades por tipo: ${desglose.join('; ')}.`,
    'Es OBLIGATORIO respetar esas cantidades exactas de cada tipo (ni una mas ni una menos de cada uno).',
    'Devuelve UNICAMENTE un arreglo JSON valido, sin texto antes ni despues, sin bloques de codigo ```.',
    'Formatos exactos por tipo:',
    '{"type":"multiple","text":"enunciado","options":[{"text":"opcion","isCorrect":true},{"text":"opcion","isCorrect":false}],"correctAnswer":""}',
    '{"type":"truefalse","text":"afirmacion que puede ser verdadera o falsa","options":[],"correctAnswer":"verdadero"}',
    '{"type":"text","text":"enunciado","options":[],"correctAnswer":"respuesta corta","acceptedAnswers":["otra forma valida"]}',
    '{"type":"order","text":"Ordena la oracion","options":[],"words":["palabra1","palabra2","palabra3"],"correctAnswer":""}',
    '{"type":"match","text":"Une cada palabra con su significado","options":[],"pairs":[{"left":"word","right":"significado"},{"left":"word2","right":"significado2"}]}',
    'Las de Verdadero o Falso SIEMPRE usan type "truefalse" (NO uses type "multiple" para ellas) y su correctAnswer es la palabra "verdadero" o "falso".',
    variasCorrectas
      ? 'En las de selecci\u00f3n m\u00faltiple usa entre 3 y 5 opciones y puede haber 1 o 2 opciones correctas: marca TODAS las correctas con isCorrect y las demas en false.'
      : 'En las de selecci\u00f3n m\u00faltiple usa entre 3 y 4 opciones y marca con isCorrect exactamente UNA opci\u00f3n correcta (las demas en false).',
    'En las de respuesta escrita agrega acceptedAnswers: un arreglo con otras formas validas de responder (sinonimos, variantes ortograficas, con o sin articulo). Si no hay, deja el arreglo vacio.',
    'En las de ordenar la oraci\u00f3n, words debe traer las palabras EN ORDEN CORRECTO (el estudiante las vera desordenadas) y el texto del enunciado debe indicar qu\u00e9 hacer.',
    'En las de relacionar, usa entre 3 y 5 pairs, con right distintos entre si y sin repetir left.',
    'En las de respuesta escrita, correctAnswer debe ser corta (1 a 4 palabras) y verificable.',
    'No repitas preguntas ni el mismo enfoque; varia el vocabulario, el contexto y el tipo de ejercicio.',
    'No numeres los enunciados ni incluyas la respuesta dentro del enunciado.',
    'No uses comillas dobles dentro de los textos (usa comillas simples si necesitas).',
    'Escribe TODO en texto plano: sin asteriscos, sin almohadillas, sin guiones de lista y sin etiquetas (nada de markdown ni HTML).',
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

const limpiar = (v, max = 600) => textoPlano(String(v == null ? '' : v)).slice(0, max);

/** Normaliza y valida una pregunta generada. Devuelve { pregunta, problema }. */
function normalizarPregunta(q) {
  if (!q || typeof q !== 'object') return { problema: 'una pregunta no era un objeto' };
  const texto = limpiar(q.text || q.pregunta || q.enunciado, 600);
  if (!texto) return { problema: 'una pregunta vino sin enunciado' };
  const tipo = String(q.type || q.tipo || '').toLowerCase();
  const puntos = Number(q.points) > 0 ? Number(q.points) : 1;

  // --- Ordenar la oracion ---
  if (tipo === 'order' || tipo === 'ordenar' || Array.isArray(q.words)) {
    const palabras = (Array.isArray(q.words) ? q.words : String(q.words || '').split(/\s+/))
      .map((w) => limpiar(w, 60))
      .filter(Boolean);
    if (palabras.length < 2) return { problema: `la pregunta de ordenar "${texto.slice(0, 40)}..." no trae palabras suficientes` };
    return { pregunta: { type: 'order', text: texto, options: [], words: palabras.slice(0, 30), correctAnswer: '', points: puntos } };
  }

  // --- Relacionar columnas ---
  if (tipo === 'match' || tipo === 'relacionar' || Array.isArray(q.pairs)) {
    const pairs = (Array.isArray(q.pairs) ? q.pairs : [])
      .map((p) => ({ left: limpiar(p?.left || p?.izquierda, 120), right: limpiar(p?.right || p?.derecha, 120) }))
      .filter((p) => p.left && p.right);
    const derechos = new Set(pairs.map((p) => p.right.toLowerCase()));
    if (pairs.length < 3 || derechos.size !== pairs.length) {
      return { problema: `la pregunta de relacionar "${texto.slice(0, 40)}..." necesita al menos 3 parejas con respuestas distintas` };
    }
    return { pregunta: { type: 'match', text: texto, options: [], pairs: pairs.slice(0, 6), correctAnswer: '', points: puntos } };
  }

  // --- Verdadero / Falso (se guarda como multiple con las dos opciones tipicas) ---
  if (tipo === 'truefalse' || tipo === 'verdadero_falso' || tipo === 'boolean') {
    const marca = String(q.correctAnswer ?? q.answer ?? '').trim().toLowerCase();
    const esV = /^(v|verdadero|true|si|s\u00ed)$/.test(marca);
    const esF = /^(f|falso|false|no)$/.test(marca);
    let opciones = (Array.isArray(q.options) ? q.options : []).map((o) => limpiar(typeof o === 'string' ? o : o?.text, 60));
    if (opciones.length < 2) opciones = ['Verdadero', 'Falso'];
    opciones = opciones.slice(0, 2).map((t) => ({ text: t, isCorrect: false }));
    if (!esV && !esF) return { problema: `la pregunta de verdadero/falso "${texto.slice(0, 40)}..." no indica si es verdadero o falso` };
    const idx = opciones.findIndex((o) => (esV ? /verdadero|true|^v$/i : /falso|false|^f$/i).test(o.text));
    opciones[idx >= 0 ? idx : esV ? 0 : 1].isCorrect = true;
    return { pregunta: { type: 'multiple', text: texto, options: opciones, correctAnswer: '', points: puntos } };
  }

  let opciones = Array.isArray(q.options || q.opciones) ? (q.options || q.opciones) : [];
  opciones = opciones
    .map((o) => ({
      text: limpiar(typeof o === 'string' ? o : o?.text || o?.texto, 300),
      isCorrect: Boolean(typeof o === 'object' ? o?.isCorrect ?? o?.correcta : false),
    }))
    .filter((o) => o.text);

  const esMultiple = (tipo === 'multiple' || (opciones.length >= 2 && tipo !== 'text')) && opciones.length >= 2;
  const respuesta = limpiar(q.correctAnswer || q.respuesta, 300);
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

/** Clasifica una pregunta ya normalizada en su tipo (para validar cantidades). */
export function clasificarPregunta(q) {
  if (!q) return 'multiple';
  if (q.type === 'order') return 'orden';
  if (q.type === 'match') return 'match';
  if (q.type === 'text' || q.type === 'dictation') return 'text';
  const textos = (q.options || []).map((o) => String(o?.text || '').trim().toLowerCase());
  const esVF = textos.length === 2 && textos.includes('verdadero') && textos.includes('falso');
  return esVF ? 'vf' : 'multiple';
}

/**
 * Parsea la respuesta de la IA y devuelve preguntas listas para el formulario.
 * @returns {{ ok: boolean, preguntas: Array, problemas: string[] }}
 */
export function parsearEvaluacion(texto, totalEsperado = null, tiposEsperados = null) {
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

  // Revision por tipo: que la IA haya respetado las cantidades pedidas (por ejemplo V/F)
  if (tiposEsperados) {
    const conteo = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };
    preguntas.forEach((p) => { conteo[clasificarPregunta(p)] += 1; });
    for (const k of ['multiple', 'vf', 'text', 'orden', 'match']) {
      const esperado = Number(tiposEsperados[k]) || 0;
      if (esperado > 0 && conteo[k] < esperado) {
        problemas.push(`pediste ${esperado} de ${TIPOS_ETIQUETAS[k] || k} y llegaron ${conteo[k]}`);
      }
    }
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
  const tipos = normalizarTipos(opciones);
  const base = { ...opciones, total, tipos };

  const prompt = construirPrompt(base);
  let r = parsearEvaluacion(await llamarIA(prompt, 150000), total, tipos);

  if (!r.ok) {
    const aviso = r.problemas.slice(0, 4).join('; ');
    const prompt2 =
      construirPrompt(base) +
      `\n\nCORRECCION OBLIGATORIA: tu respuesta anterior fallo por: ${aviso}.` +
      `\nRecuerda: ${total} preguntas en total con esta mezcla exacta: ${desgloseDe(tipos).join('; ')}.` +
      '\nLas de Verdadero o Falso llevan type "truefalse" (no "multiple"). Devuelve SOLO el JSON.';
    const segundo = parsearEvaluacion(await llamarIA(prompt2, 150000), total, tipos);
    // si el segundo intento mejora, usarlo
    if (segundo.preguntas.length >= r.preguntas.length) r = segundo;
  }

  return { ...r, total };
}

// src/utils/aiEvalGenerator.js
// Generador de evaluaciones completas con IA.
// La logica esta separada de la interfaz para poder probarla (ver scripts/test-ai-eval.mjs).

import { textoPlano } from './textFormat.js';

export const MAX_PREGUNTAS = 100;
export const MIN_PREGUNTAS = 1;
export const LOTE_MAX_PREGUNTAS = 20;

/** Presets de mezcla de tipos. 'custom' lo define la docente a mano. */
export const PRESETS = {
  variada: {
    etiqueta: 'Variada (recomendada)',
    calc: (total) => {
      const match = total >= 8 ? Math.min(10, Math.max(1, Math.round(total * 0.1))) : 0;
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
  en_fr: 'Biling\u00fce: la mitad de las preguntas en ingl\u00e9s y la otra mitad en franc\u00e9s (sin traducir al espa\u00f1ol)',
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
export function construirPrompt({ tema, total, multiple, text, dificultad = 'media', idioma = 'es', titulo = '', publico = 'estudiantes', variasCorrectas = false, tipos, evitar = [] }) {
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

  const listaEvitar = Array.isArray(evitar) ? evitar.filter(Boolean) : [];

  return [
    'Eres un docente experto en diseno de evaluaciones.',
    `Tema o instrucciones de la docente: "${tema}"`,
    titulo ? `Titulo de la evaluacion: "${titulo}"` : '',
    `Nivel de dificultad: ${DIFICULTADES[dificultad] || DIFICULTADES.media}`,
    `Idioma: ${IDIOMAS[idioma] || IDIOMAS.es}`,
    idioma === 'en_fr' ? 'Reparte las preguntas: la mitad en INGL\u00c9S y la mitad en FRANC\u00c9S, alternando idiomas. Cada pregunta completa (enunciado y opciones) en un solo idioma.' : '',
    `Dirigido a: ${publico}.`,
    '',
    'Reglas obligatorias:',
    ...reglas.map((r) => '- ' + r),
    listaEvitar.length > 0
      ? `- No repitas ninguna de estas preguntas ya generadas en lotes anteriores: ${listaEvitar.slice(-MAX_PREGUNTAS).map((q) => `"${q}"`).join(', ')}.`
      : '',
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
  const imageUrl = typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : '';
  const extraImg = imageUrl ? { imageUrl } : {};

  // --- Ordenar la oracion ---
  if (tipo === 'order' || tipo === 'ordenar' || Array.isArray(q.words)) {
    const palabras = (Array.isArray(q.words) ? q.words : String(q.words || '').split(/\s+/))
      .map((w) => limpiar(w, 60))
      .filter(Boolean);
    if (palabras.length < 2) return { problema: `la pregunta de ordenar "${texto.slice(0, 40)}..." no trae palabras suficientes` };
    return { pregunta: { type: 'order', text: texto, options: [], words: palabras.slice(0, 30), correctAnswer: '', points: puntos, ...extraImg } };
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
    return { pregunta: { type: 'match', text: texto, options: [], pairs: pairs.slice(0, 6), correctAnswer: '', points: puntos, ...extraImg } };
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
    return { pregunta: { type: 'multiple', text: texto, options: opciones, permiteMultiples: opciones.filter((o) => o.isCorrect).length > 1, correctAnswer: '', points: puntos, ...extraImg } };
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
    return { pregunta: { type: 'multiple', text: texto, options: opciones, permiteMultiples: opciones.filter((o) => o.isCorrect).length > 1, correctAnswer: '', points: puntos, ...extraImg } };
  }

  // respuesta escrita
  if (!respuesta) return { problema: `la pregunta "${texto.slice(0, 40)}..." no trae respuesta esperada` };
  return { pregunta: { type: 'text', text: texto, options: [], correctAnswer: respuesta, acceptedAnswers: alternativas, points: puntos, ...extraImg } };
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
export function parsearEvaluacion(texto, totalEsperado = null, tiposEsperados = null, vistosPrevios = null) {
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
  const vistos = new Set(vistosPrevios || []);
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
 * Divide un total de preguntas y su distribucion por tipo en lotes de hasta maxPorLote
 * para evitar que la respuesta de la IA se trunque por limite de tokens en examenes largos (hasta 100 preguntas).
 */
export function dividirEnLotes(total, tipos, maxPorLote = LOTE_MAX_PREGUNTAS) {
  const claves = ['multiple', 'vf', 'text', 'orden', 'match'];
  const restantes = {
    multiple: Math.max(0, Number(tipos?.multiple) || 0),
    vf: Math.max(0, Number(tipos?.vf) || 0),
    text: Math.max(0, Number(tipos?.text) || 0),
    orden: Math.max(0, Number(tipos?.orden) || 0),
    match: Math.max(0, Number(tipos?.match) || 0),
  };

  let sumaTipos = claves.reduce((s, k) => s + restantes[k], 0);
  // Si la suma de tipos excede el total (p.ej. porque total fue acotado a MAX_PREGUNTAS), ajustar
  while (sumaTipos > total) {
    const mayor = claves.reduce((a, b) => (restantes[b] > restantes[a] ? b : a), claves[0]);
    if (restantes[mayor] <= 0) break;
    restantes[mayor] -= 1;
    sumaTipos -= 1;
  }
  // Si la suma de tipos es menor que el total (o no se especificaron tipos), completar con seleccion multiple
  if (sumaTipos < total) {
    restantes.multiple += total - sumaTipos;
    sumaTipos = total;
  }

  const lotes = [];
  let faltanTotal = total;

  while (faltanTotal > 0) {
    const tamLote = Math.min(maxPorLote, faltanTotal);
    const tiposLote = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };
    const sumaRest = claves.reduce((s, k) => s + restantes[k], 0);

    if (sumaRest > 0) {
      let asignados = 0;
      for (const k of claves) {
        if (restantes[k] <= 0) continue;
        const cuota = Math.min(restantes[k], Math.floor((restantes[k] / sumaRest) * tamLote));
        tiposLote[k] = cuota;
        asignados += cuota;
      }
      for (const k of claves) {
        while (asignados < tamLote && asignados < sumaRest && restantes[k] > tiposLote[k]) {
          tiposLote[k] += 1;
          asignados += 1;
        }
      }
      for (const k of claves) {
        restantes[k] -= tiposLote[k];
      }
    }

    lotes.push({ total: tamLote, tipos: tiposLote });
    faltanTotal -= tamLote;
  }

  return lotes;
}

/**
 * Genera la evaluacion completa: pide a la IA, valida y (si algo falla) reintenta una vez.
 * Cuando se piden mas de LOTE_MAX_PREGUNTAS (hasta 100), genera por lotes para no truncar el JSON.
 * @param {object} opciones { tema, total, multiple, text, dificultad, idioma, titulo }
 * @param {(prompt: string, timeoutMs?: number) => Promise<string>} llamarIA
 */
export async function generarPreguntasConIA(opciones, llamarIA) {
  const clavesTipos = ['multiple', 'vf', 'text', 'orden', 'match'];
  const total = Math.min(MAX_PREGUNTAS, Math.max(MIN_PREGUNTAS, Number(opciones.total) || 10));
  const tiposBrutos = normalizarTipos(opciones);
  const sumaTiposOriginal = clavesTipos.reduce((s, k) => s + (Number(tiposBrutos[k]) || 0), 0);
  const tipos = { ...tiposBrutos };
  let sumaAjustada = sumaTiposOriginal;
  while (sumaAjustada > total) {
    const mayor = clavesTipos.reduce((a, b) => (tipos[b] > tipos[a] ? b : a), clavesTipos[0]);
    if (tipos[mayor] <= 0) break;
    tipos[mayor] -= 1;
    sumaAjustada -= 1;
  }

  const base = { ...opciones, total, tipos };

  if (total <= LOTE_MAX_PREGUNTAS) {
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

  // Generacion por lotes cuando total > LOTE_MAX_PREGUNTAS (hasta 100 preguntas)
  const lotes = dividirEnLotes(total, tipos, LOTE_MAX_PREGUNTAS);
  const acumuladas = [];
  const vistosGlobal = new Set();

  const agregarUnicasAlLote = (candidatas, destino, conteoLote, metaTipos, maxLote, soloNecesarias = false) => {
    for (const p of candidatas) {
      if (destino.length >= maxLote) break;
      const clave = p.text.toLowerCase().slice(0, 80);
      if (vistosGlobal.has(clave)) continue;
      const tipoP = clasificarPregunta(p);
      if (soloNecesarias && (conteoLote[tipoP] || 0) >= (metaTipos[tipoP] || 0)) continue;
      vistosGlobal.add(clave);
      conteoLote[tipoP] = (conteoLote[tipoP] || 0) + 1;
      destino.push(p);
    }
  };

  for (let idx = 0; idx < lotes.length; idx++) {
    const lote = lotes[idx];
    const baseLote = {
      ...opciones,
      total: lote.total,
      tipos: lote.tipos,
      evitar: acumuladas.map((q) => q.text.slice(0, 70)),
    };

    const respuesta1 = await llamarIA(construirPrompt(baseLote), 150000);

    // Si en el primer lote el proveedor/mock devolvio ya el total completo valido, retornar directo
    if (idx === 0) {
      const intentoCompleto = parsearEvaluacion(respuesta1, total, tipos);
      if (intentoCompleto.ok && intentoCompleto.preguntas.length === total) {
        return { ...intentoCompleto, total };
      }
    }

    const rLote = parsearEvaluacion(respuesta1, lote.total, lote.tipos, vistosGlobal);
    let seleccionLote = [];
    const conteoLote = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };

    if (rLote.ok) {
      agregarUnicasAlLote(rLote.preguntas, seleccionLote, conteoLote, lote.tipos, lote.total, false);
    } else {
      const aviso = rLote.problemas.slice(0, 4).join('; ');
      const prompt2 =
        construirPrompt(baseLote) +
        `\n\nCORRECCION OBLIGATORIA: tu respuesta anterior fallo por: ${aviso}.` +
        `\nRecuerda: ${lote.total} preguntas en total con esta mezcla exacta: ${desgloseDe(lote.tipos).join('; ')}.` +
        '\nLas de Verdadero o Falso llevan type "truefalse" (no "multiple"). Devuelve SOLO el JSON.';
      const segundo = parsearEvaluacion(await llamarIA(prompt2, 150000), lote.total, lote.tipos, vistosGlobal);
      const primario = segundo.ok || segundo.preguntas.length >= rLote.preguntas.length ? segundo.preguntas : rLote.preguntas;
      const secundario = primario === segundo.preguntas ? rLote.preguntas : segundo.preguntas;
      agregarUnicasAlLote(primario, seleccionLote, conteoLote, lote.tipos, lote.total, true);
      agregarUnicasAlLote(secundario, seleccionLote, conteoLote, lote.tipos, lote.total, true);
      agregarUnicasAlLote(primario, seleccionLote, conteoLote, lote.tipos, lote.total, false);
      agregarUnicasAlLote(secundario, seleccionLote, conteoLote, lote.tipos, lote.total, false);
    }

    acumuladas.push(...seleccionLote);
  }

  // Si algun lote quedo incompleto por duplicados o preguntas invalidas, hacer un lote extra de recuperacion
  const faltanTrasLotes = total - acumuladas.length;
  if (faltanTrasLotes > 0 && faltanTrasLotes <= LOTE_MAX_PREGUNTAS) {
    const conteoActual = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };
    acumuladas.forEach((p) => { conteoActual[clasificarPregunta(p)] += 1; });
    const tiposFaltantes = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };
    let asignadosRec = 0;
    for (const k of clavesTipos) {
      const diff = Math.max(0, (Number(tipos[k]) || 0) - conteoActual[k]);
      const usar = Math.min(diff, faltanTrasLotes - asignadosRec);
      tiposFaltantes[k] = usar;
      asignadosRec += usar;
    }
    if (asignadosRec < faltanTrasLotes) {
      tiposFaltantes.multiple += faltanTrasLotes - asignadosRec;
    }
    const promptRec = construirPrompt({
      ...opciones,
      total: faltanTrasLotes,
      tipos: tiposFaltantes,
      evitar: acumuladas.map((q) => q.text.slice(0, 70)),
    });
    const rRec = parsearEvaluacion(await llamarIA(promptRec, 150000), faltanTrasLotes, tiposFaltantes, vistosGlobal);
    for (const p of rRec.preguntas) {
      if (acumuladas.length >= total) break;
      const clave = p.text.toLowerCase().slice(0, 80);
      if (!vistosGlobal.has(clave)) {
        vistosGlobal.add(clave);
        acumuladas.push(p);
      }
    }
  }

  const problemasFinales = [];
  if (acumuladas.length !== total) {
    problemasFinales.push(`se pidieron ${total} preguntas y llegaron ${acumuladas.length} v\u00e1lidas`);
  }

  if (sumaTiposOriginal > 0) {
    const conteo = { multiple: 0, vf: 0, text: 0, orden: 0, match: 0 };
    acumuladas.forEach((p) => { conteo[clasificarPregunta(p)] += 1; });
    for (const k of clavesTipos) {
      const esperado = Number(tipos[k]) || 0;
      if (esperado > 0 && conteo[k] < esperado) {
        problemasFinales.push(`pediste ${esperado} de ${TIPOS_ETIQUETAS[k] || k} y llegaron ${conteo[k]}`);
      }
    }
  }

  return {
    ok: problemasFinales.length === 0 && acumuladas.length > 0,
    preguntas: acumuladas.slice(0, total),
    problemas: problemasFinales,
    total,
  };
}

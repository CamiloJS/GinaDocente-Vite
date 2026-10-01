// src/utils/narracion.js
// Narracion de publicaciones para el boton "Escuchar pronunciacion".
// - Limpia lo que NO se debe leer (enlaces, numeros de lista, vinetas, etiquetas, emojis).
// - Detecta el idioma de cada parte (con ayuda opcional de la IA) y las narra por separado.
// - Elige SIEMPRE la mejor voz femenina disponible en el dispositivo.
// Probado en scripts/test-narracion.mjs
import { normalizarMarcado } from './textFormat.js';

// Emojis y simbolos que no se leen
const EMOJIS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Texto listo para narrar: sin enlaces, listas, etiquetas, emojis ni lineas vacias. */
export function limpiarParaNarrar(input) {
  if (!input) return '';
  let t = normalizarMarcado(String(input));
  // enlaces fuera (no se leen)
  t = t.replace(/https?:\/\/\S+/gi, ' ');
  t = t.replace(/www\.\S+/gi, ' ');
  t = t.replace(/<[^>]*>/g, ' ');
  t = t.replace(EMOJIS, ' ');
  // etiquetas de formato que hayan quedado (antes de quitar numeros de lista)
  t = t.replace(/\[\/?(?:b|i|u|s|strike|size|font|color|highlight|center|left|right|quote|list)(?:=[^\]]*)?\]/gi, ' ');
  t = t.replace(/\*\*|__|~~|==/g, ' ');
  const lineas = t
    .split('\n')
    .map((linea) => {
      let l = linea.replace(/\u00A0/g, ' ').trim();
      if (!l) return '';
      l = l.replace(/^#{1,6}\s*/, '');                 // encabezados "# ..."
      l = l.replace(/^>\s*/, '');                       // citas "> ..."
      l = l.replace(/^\d{1,3}\s*[.)](?!\d)\s*/, '');    // numeros de lista "1. texto" (sin tocar "1.5")
      l = l.replace(/^\d{1,3}\s*[.)]?\s*[-–—]\s*/, ''); // "1.- texto"
      l = l.replace(/^[-*•·●○▪■▸▶+]+\s*/, '');          // vinetas "- texto" / "• texto"
      l = l.replace(/[*_~#]{1,3}/g, ' ');               // marcas sueltas de markdown
      return l.replace(/\s{2,}/g, ' ').trim();
    })
    .filter((l) => l && !/^[\s.,;:!¡¿?()\[\]{}"'\-–—_=*#%&$@/\\|]+$/.test(l));
  t = lineas.join('\n');
  // numeros de lista "al vuelo" (cuando el texto llega todo en una sola linea o al final)
  t = t.replace(/(^|[\s\n])\d{1,3}\s*[.)](?!\d)(?=\s|$)[ \t]*/g, '$1');
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([,.;:!?])/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

const PALABRAS = {
  es: ['que', 'de', 'la', 'el', 'en', 'los', 'las', 'una', 'un', 'para', 'con', 'por', 'es', 'son', 'del', 'al', 'como', 'pero', 'mas', 'más', 'este', 'esta', 'hola', 'gracias', 'clase', 'tarea', 'estudiantes', 'mañana', 'hoy', 'deber', 'recuerden', 'nos', 'nuestro', 'favor', 'realizar', 'pueden', 'deben', 'tienen', 'también', 'tambien', 'muy', 'todo', 'todos', 'cada', 'sobre', 'entre'],
  en: ['the', 'and', 'of', 'to', 'you', 'this', 'that', 'with', 'for', 'please', 'students', 'hello', 'thanks', 'class', 'homework', 'is', 'are', 'have', 'do', 'does', 'your', 'we', 'will', 'can', 'what', 'how', 'from', 'about', 'they', 'there', 'was', 'were', 'not', 'but', 'our', 'very', 'each', 'all', 'read', 'write', 'answer'],
  fr: ['le', 'la', 'les', 'des', 'une', 'un', 'est', 'vous', 'nous', 'pour', 'avec', 'bonjour', 'merci', 'classe', 'devoirs', 'et', 'sont', 'dans', 'sur', 'votre', 'pas', 'que', 'qui', 'ce', 'cette', 'aux', 'du', 'au', 'par', 'tres', 'très', 'tout', 'tous', 'chaque', 'aussi', 'lire', 'ecrire', 'écrire'],
};

/** Idioma probable de un texto: 'es', 'en' o 'fr' (local, sin internet). */
export function detectarIdioma(texto) {
  const t = String(texto || '').toLowerCase();
  if (!t.trim()) return 'es';
  const palabras = t.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const puntos = { es: 0, en: 0, fr: 0 };
  for (const p of palabras) {
    for (const id of ['es', 'en', 'fr']) if (PALABRAS[id].includes(p)) puntos[id] += 1;
  }
  if (/[¿¡ñ]/.test(t)) puntos.es += 3;
  if (/[çœ]/.test(t)) puntos.fr += 3;
  if (/\b(?:the|and|you|your|with|that)\b/.test(t)) puntos.en += 2;
  if (/\b(?:les|des|vous|nous|pour|avec)\b/.test(t)) puntos.fr += 2;
  let mejor = 'es';
  let max = -1;
  for (const id of ['es', 'en', 'fr']) {
    if (puntos[id] > max) { max = puntos[id]; mejor = id; }
  }
  return mejor;
}

/** Separa por frases y agrupa las que comparten idioma (sin internet). */
export function segmentosLocales(texto) {
  const limpio = limpiarParaNarrar(texto);
  const frases = (limpio.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
  const segmentos = [];
  for (const frase of frases) {
    const idioma = detectarIdioma(frase);
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.idioma === idioma) ultimo.texto += ' ' + frase;
    else segmentos.push({ idioma, texto: frase });
  }
  // frases muy cortas se pegan a la anterior (evita cambiar de voz por 2 palabras)
  const fusionados = [];
  for (const s of segmentos) {
    const previo = fusionados[fusionados.length - 1];
    if (previo && (s.texto.length < 12 || s.texto.split(/\s+/).length < 3)) previo.texto += ' ' + s.texto;
    else fusionados.push({ ...s });
  }
  return fusionados;
}

/** Prompt para que la IA limpie y separe el texto por idioma (nunca se le muestra a nadie). */
export function construirPromptNarracion(texto) {
  return [
    'Eres un narrador profesional que prepara textos escolares para ser leidos en voz alta.',
    'Devuelve SOLO un arreglo JSON valido (sin texto antes ni despues, sin bloques de codigo):',
    '[{"idioma":"es","texto":"..."},{"idioma":"en","texto":"..."}]',
    'Reglas:',
    '- Cada fragmento va en su IDIOMA ORIGINAL (no traduzcas): usa el codigo de dos letras (es, en, fr, pt...).',
    '- Si el texto mezcla idiomas, separa un fragmento por idioma conservando el orden original.',
    '- NO leas enlaces ni URLs, ni numeros de lista (1., 2., -), ni vinetas, ni simbolos raros, ni emojis, ni etiquetas tipo [color=...] o **.',
    '- Redacta frases naturales y bien puntuadas, listas para narrar en voz alta.',
    '- No agregues, resumas, traduzcas ni expliques nada: es el mismo texto, solo limpio y separado por idioma.',
    '- No escribas comentarios tuyos ni menciones quien eres.',
    '',
    'Texto:',
    '"""',
    String(texto || '').slice(0, 4000),
    '"""',
  ].join('\n');
}

const MAPA_IDIOMAS = {
  spa: 'es', esp: 'es', spanish: 'es', espanol: 'es', 'español': 'es', es: 'es',
  eng: 'en', english: 'en', en: 'en',
  fre: 'fr', fra: 'fr', french: 'fr', francais: 'fr', 'français': 'fr', fr: 'fr',
  por: 'pt', portuguese: 'pt', ita: 'it', italian: 'it', deu: 'de', ger: 'de', german: 'de',
};

/** Codigo de idioma de dos letras ('es' por defecto). */
export function normalizarIdioma(valor) {
  const s = String(valor || '').trim().toLowerCase();
  const code = MAPA_IDIOMAS[s] || (s.length >= 2 && /^[a-z]{2}/.test(s) ? s.slice(0, 2) : 'es');
  return /^[a-z]{2}$/.test(code) ? code : 'es';
}

/** Parseo defensivo de la respuesta de la IA. Devuelve null si no sirve. */
export function parsearNarracion(respuesta) {
  const t = String(respuesta || '').trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = t.indexOf('[');
  const fin = t.lastIndexOf(']');
  if (ini === -1 || fin <= ini) return null;
  let datos = null;
  try { datos = JSON.parse(t.slice(ini, fin + 1)); } catch (e) { return null; }
  if (!Array.isArray(datos)) return null;
  const segmentos = [];
  for (const item of datos) {
    if (!item) continue;
    const idioma = normalizarIdioma(typeof item === 'string' ? '' : item.idioma || item.lang || item.language);
    const bruto = typeof item === 'string' ? item : item.texto || item.text || item.content;
    const texto = limpiarParaNarrar(bruto).replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (texto) segmentos.push({ idioma, texto });
  }
  if (!segmentos.length) return null;
  const fusion = [];
  for (const s of segmentos) {
    const prev = fusion[fusion.length - 1];
    if (prev && prev.idioma === s.idioma) prev.texto = prev.texto + ' ' + s.texto;
    else fusion.push({ ...s });
  }
  return fusion;
}

// Cache por texto (evita repetir la preparacion en cada reproduccion)
const cacheNarracion = new Map();
const claveDe = (texto) => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return h + ':' + texto.length;
};

/**
 * Prepara los fragmentos a narrar. Intenta con la IA (limpieza + idiomas);
 * si no esta disponible, usa la deteccion local. Nunca falla.
 */
export async function prepararNarracion(texto, llamarIA) {
  const limpio = limpiarParaNarrar(texto);
  if (!limpio) return [];
  const clave = claveDe(limpio);
  if (cacheNarracion.has(clave)) return cacheNarracion.get(clave);
  let segmentos = null;
  if (typeof llamarIA === 'function') {
    try {
      const respuesta = await llamarIA(construirPromptNarracion(limpio), 60000);
      segmentos = parsearNarracion(respuesta);
    } catch (e) {
      segmentos = null;
    }
  }
  if (!segmentos || !segmentos.length) segmentos = segmentosLocales(limpio);
  if (segmentos.length) cacheNarracion.set(clave, segmentos);
  return segmentos;
}

// Nombres de voces femeninas por idioma (para elegir siempre mujer)
const FEMENINAS = {
  es: ['dalia', 'sabina', 'elvira', 'helena', 'laura', 'monica', 'mónica', 'paulina', 'marisol', 'angelica', 'angélica', 'isabela', 'catalina', 'lupe', 'mia', 'sofia', 'sofía', 'valentina', 'camila', 'lucia', 'lucía', 'penelope', 'penélope', 'esperanza', 'estrella', 'salome', 'ximena', 'tania', 'irene', 'elena', 'carmen', 'nuria', 'laila', 'triana', 'vera', 'abril', 'daria', 'larissa'],
  en: ['aria', 'jenny', 'ava', 'emma', 'michelle', 'monica', 'sonia', 'libby', 'samantha', 'karen', 'moira', 'tessa', 'zoe', 'zira', 'susan', 'hazel', 'allison', 'serena', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy', 'ruth', 'daniela', 'sara', 'nicky', 'linda', 'heather', 'ana', 'clara', 'elizabeth', 'martha', 'catherine', 'victoria', 'fiona', 'kate', 'stephanie', 'olivia', 'emily', 'amber', 'ashley', 'jessica', 'natasha', 'clara'],
  fr: ['denise', 'eloise', 'éloïse', 'vivienne', 'amelie', 'amélie', 'audrey', 'marie', 'celine', 'céline', 'lea', 'léa', 'yvette', 'julie', 'hortense', 'chantal', 'gabrielle', 'oceane', 'océane', 'ariane', 'brigitte', 'camille', 'amandine', 'flo', 'sylvie', 'coralie', 'jacqueline', 'margaux', 'ophelia', 'ophelie', 'paulette', 'virginie'],
};
const MASCULINAS = ['pablo', 'raul', 'raúl', 'diego', 'jorge', 'juan', 'carlos', 'david', 'mark', 'ryan', 'guy', 'eric', 'liam', 'thomas', 'henri', 'daniel', 'fred', 'junior', 'dario', 'lorenzo', 'bruno', 'marco', 'yannick', 'alex', 'aaron', 'matthew', 'brian', 'christopher', 'kevin', 'ronaldo', 'jose', 'josé', 'miguel', 'antonio', 'francisco', 'jesus', 'jesús', 'alonso', 'arnau', 'enrique', 'humberto', 'gerardo', 'rodrigo', 'roger', 'guillaume', 'nicolas', 'remy', 'sebastien', 'sébastien', 'paul', 'mathieu', 'vincent', 'luc', 'hugo', 'louis', 'jules', 'fabrice', 'gordon', 'andrew', 'stephen', 'stefan', 'steffan', 'rasmus', 'magnus', 'oliver', 'george', 'james', 'john', 'michael', 'richard', 'robert', 'william', 'henry', 'arthur'];
const VOZ_MALA = /(espeak|compact|desktop|novelty|whisper|bells|boing|bubbles|cellos|deranged|hysterical|trinoids|zarvox|albert|bahh|jester|organ|superstar|wobble|eddy|rocko|shelley|sandy|grandma|grandpa|flo\b|reed|junior|robot)/i;

const calidadDeVoz = (voz) => {
  const n = String(voz?.name || '').toLowerCase();
  let s = 0;
  if (/natural|neural|premium|enhanced/.test(n)) s += 60;
  if (/online/.test(n)) s += 25;
  if (/google/.test(n)) s += 20;
  if (VOZ_MALA.test(n)) s -= 100;
  return s;
};

/** Elige la mejor voz FEMENINA para el idioma. Devuelve null si no hay. */
export function elegirMejorVoz(idioma, voces) {
  const base = normalizarIdioma(idioma);
  const lista = (Array.isArray(voces) ? voces : []).filter((v) => v && String(v.lang || '').toLowerCase().replace('_', '-').startsWith(base));
  const candidatas = lista.length ? lista : (Array.isArray(voces) ? voces.filter(Boolean) : []);
  if (!candidatas.length) return null;
  const puntuar = (v) => {
    const n = String(v.name || '').toLowerCase();
    let s = calidadDeVoz(v);
    if (FEMENINAS[base]?.some((f) => n.includes(f))) s += 35;
    if (MASCULINAS.some((m) => n.includes(m))) s -= 70;
    if (v.localService === false) s += 10; // voces en la nube suelen sonar mejor
    if (v.default) s += 2;
    return s;
  };
  return candidatas.slice().sort((a, b) => puntuar(b) - puntuar(a))[0];
}

/**
 * Narra los fragmentos en orden, cambiando de voz segun el idioma.
 * Devuelve un controlador con detener().
 */
export function narrarSegmentos(segmentos, opciones = {}) {
  const { onFin, onSegmento } = opciones || {};
  const terminarSinNada = () => { if (typeof onFin === 'function') onFin(); return { detener() {}, activo: false }; };
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !Array.isArray(segmentos) || !segmentos.length) {
    return terminarSinNada();
  }
  const synth = window.speechSynthesis;
  let cancelado = false;
  let voces = [];
  try { voces = synth.getVoices() || []; } catch (e) { voces = []; }

  const crearUtters = () => segmentos.map((seg) => {
    const u = new SpeechSynthesisUtterance(seg.texto);
    const voz = elegirMejorVoz(seg.idioma, voces);
    u.lang = seg.idioma === 'en' ? 'en-US' : seg.idioma === 'fr' ? 'fr-FR' : seg.idioma === 'pt' ? 'pt-BR' : 'es-ES';
    if (voz) {
      const langVoz = String(voz.lang || '').replace('_', '-');
      if (langVoz) u.lang = langVoz;
      try { u.voice = voz; } catch (e) { /* el navegador no acepto la voz: seguimos con el idioma */ }
    }
    u.rate = 0.97;
    u.pitch = 1.03;
    return u;
  });

  let utters = [];
  let i = 0;
  const siguiente = () => {
    if (cancelado) return;
    if (i >= utters.length) { if (typeof onFin === 'function') onFin(); return; }
    const u = utters[i];
    const posicion = i;
    i += 1;
    u.onend = () => { if (!cancelado) siguiente(); };
    u.onerror = () => { if (!cancelado) siguiente(); };
    if (typeof onSegmento === 'function') onSegmento(posicion, segmentos[posicion]);
    try { synth.speak(u); } catch (e) { siguiente(); }
  };

  const arrancar = () => {
    if (cancelado) return;
    utters = crearUtters();
    i = 0;
    try { synth.cancel(); } catch (e) { /* nada */ }
    setTimeout(() => { if (!cancelado) siguiente(); }, 120);
  };

  if (voces.length > 0) {
    arrancar();
  } else {
    let lanzado = false;
    const lanzar = () => {
      if (lanzado || cancelado) return;
      lanzado = true;
      try { voces = synth.getVoices() || []; } catch (e) { voces = []; }
      arrancar();
    };
    try { if (synth.addEventListener) synth.addEventListener('voiceschanged', lanzar, { once: true }); } catch (e) { /* nada */ }
    setTimeout(lanzar, 700);
  }

  return {
    detener() {
      cancelado = true;
      try { synth.cancel(); } catch (e) { /* nada */ }
    },
    get activo() { return !cancelado; },
  };
}

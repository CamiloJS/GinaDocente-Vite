// src/utils/textFormat.js
// Normaliza el marcado del editor de texto para que NUNCA se vean etiquetas crudas
// en pantalla (por ejemplo "[color=#e5e7eb]" o asteriscos sueltos).
//
// Problema que resuelve: el renderizado trabaja linea por linea, asi que si una
// etiqueta abre en una linea y cierra en la siguiente, no se detecta y se ve el texto crudo.
// Solucion: cerrar y reabrir la etiqueta en cada linea, y limpiar las huerfanas.

/** Convierte HTML pegado (Word, Google Docs, etc.) al marcado interno. */
function htmlAMarcado(t) {
  return t
    .replace(/<span[^>]*style=["'][^"']*color:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '[color=$1]$2[/color]')
    .replace(/<font[^>]*color=["']([^"']+)["'][^>]*>([\s\S]*?)<\/font>/gi, '[color=$1]$2[/color]')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, '~~$1~~')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==');
}

/** Si una etiqueta abarca varias lineas, la cierra y reabre en cada una. */
function porLinea(t, re, cierre, armar) {
  return t.replace(re, (m, ...g) => {
    const contenido = g[g.length - 3]; // ultimo grupo de captura
    if (typeof contenido !== 'string' || !contenido.includes('\n')) return m;
    const grupos = g.slice(0, g.length - 2);
    const ap = armar(grupos.length > 1 ? grupos[0] : null);
    return contenido
      .split('\n')
      .map((l) => ap + l + cierre)
      .join('\n');
  });
}

/** En cada linea, si una marca aparece un numero impar de veces, se quita (estaba huerfana). */
function equilibrarPorLinea(t, marca) {
  return t
    .split('\n')
    .map((linea) => {
      const veces = linea.split(marca).length - 1;
      if (veces === 0 || veces % 2 === 0) return linea;
      return linea.split(marca).join('');
    })
    .join('\n');
}

/** Equilibra etiquetas de apertura/cierre distintos (por ejemplo [color=..] y [/color]). */
function equilibrarTags(t, reApertura, reCierre) {
  return t
    .split('\n')
    .map((linea) => {
      const abre = (linea.match(reApertura) || []).length;
      const cierra = (linea.match(reCierre) || []).length;
      if (abre === cierra) return linea;
      return linea.replace(reApertura, '').replace(reCierre, '');
    })
    .join('\n');
}

/**
 * Devuelve el texto listo para renderizar: sin etiquetas rotas ni marcadores sueltos.
 */
export function normalizarMarcado(input) {
  if (!input) return '';
  let t = String(input).replace(/\r\n?/g, '\n');
  t = htmlAMarcado(t);

  // 1) etiquetas que abren y cierran en lineas distintas -> una por linea
  t = porLinea(t, /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, '[/color]', (color) => `[color=${color}]`);
  t = porLinea(t, /\[highlight\]([\s\S]*?)\[\/highlight\]/gi, '[/highlight]', () => '[highlight]');
  t = porLinea(t, /<u>([\s\S]*?)<\/u>/gi, '</u>', () => '<u>');
  t = porLinea(t, /\*\*([\s\S]*?)\*\*/g, '**', () => '**');
  t = porLinea(t, /~~([\s\S]*?)~~/g, '~~', () => '~~');
  t = porLinea(t, /==([\s\S]*?)==/g, '==', () => '==');

  // 2) quitar parejas vacias (etiquetas sin contenido, sin comerse los saltos de linea)
  t = t.replace(/\[color=[^\]]+\][ \t]*\[\/color\]/gi, '');
  t = t.replace(/\[highlight\][ \t]*\[\/highlight\]/gi, '');
  t = t.replace(/<u>[ \t]*<\/u>/gi, '');
  t = t.replace(/\*\*[ \t]*\*\*/g, '');
  t = t.replace(/~~[ \t]*~~/g, '');
  t = t.replace(/==[ \t]*==/g, '');

  // 3) marcas sueltas
  t = equilibrarTags(t, /\[color=[^\]]+\]/gi, /\[\/color\]/gi);
  t = equilibrarTags(t, /\[highlight\]/gi, /\[\/highlight\]/gi);
  t = equilibrarTags(t, /<u>/gi, /<\/u>/gi);
  t = equilibrarPorLinea(t, '**');
  t = equilibrarPorLinea(t, '~~');
  t = equilibrarPorLinea(t, '==');

  // 4) etiquetas conocidas sin pareja y HTML suelto
  t = t.replace(/\[\/?(b|i|u|s|strike|size|font|center|left|right|quote|list)(=[^\]]*)?\]/gi, '');
  t = t.replace(/<\/?(u|mark|span|font|b|strong|i|em|s|del|strike)[^>]*>/gi, '');

  return t;
}

export default normalizarMarcado;

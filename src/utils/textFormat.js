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
    .replace(/<span[^>]*style=["']([^"']*)["'][^>]*>([\s\S]*?)<\/span>/gi, (m, style, content) => {
      let out = content;
      const bgMatch = String(style).match(/(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/i);
      if (bgMatch) {
        const bgVal = bgMatch[1].trim().toLowerCase();
        if (bgVal && bgVal !== 'transparent' && bgVal !== 'none' && bgVal !== 'initial' && bgVal !== 'inherit' && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(bgVal)) {
          out = `==${out}==`;
        }
      }
      const colorMatch = String(style).match(/(?:^|[;\s])color\s*:\s*([^;]+)/i);
      if (colorMatch) {
        const cVal = colorMatch[1].trim();
        if (cVal && cVal.toLowerCase() !== 'inherit' && cVal.toLowerCase() !== 'initial') {
          out = `[color=${cVal}]${out}[/color]`;
        }
      }
      return out;
    })
    .replace(/<font[^>]*color=["']([^"']+)["'][^>]*>([\s\S]*?)<\/font>/gi, '[color=$1]$2[/color]')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '<u>$1</u>')
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

  // 4) etiquetas conocidas sin pareja y HTML suelto (preservando <u>...</u> equilibradas)
  t = t.replace(/\[\/?(b|i|u|s|strike|size|font|center|left|right|quote|list)(=[^\]]*)?\]/gi, '');
  t = t.replace(/<\/?(mark|span|font|b|strong|i|em|s|del|strike)[^>]*>/gi, '');

  return t;
}

/** Version de texto plano: normaliza y quita los marcadores restantes (para Excel y datos guardados). */
export function textoPlano(input) {
  return normalizarMarcado(input)
    .replace(/\[color=[^\]]+\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\[highlight\]/gi, '')
    .replace(/\[\/highlight\]/gi, '')
    .replace(/\*\*/g, '')
    .replace(/~~/g, '')
    .replace(/==/g, '')
    .replace(/<\/?u>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convierte el marcado interno a HTML para el editor enriquecido (RichVisualEditor). */
export const tagToHtml = (str) => {
  if (!str) return '';
  let html = String(str);

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15em; font-weight: 800; margin: 4px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.25em; font-weight: 800; margin: 4px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.35em; font-weight: 900; margin: 6px 0;">$1</h1>');

  // Quotes / Citations
  html = html.replace(/^>\s*(.*$)/gim, '<blockquote style="border-left: 3px solid #8b5cf6; background: rgba(139, 92, 246, 0.08); padding: 4px 10px; margin: 4px 0; border-radius: 0 8px 8px 0; font-style: italic; color: #8b5cf6;">$1</blockquote>');

  // Lists
  html = html.replace(/^[*-] (.*$)/gim, '<li>$1</li>');

  // Colors: [color=#hex]...[/color] or [color=red]...[/color]
  const COLOR_MAP = {
    negro: '#111827', black: '#111827',
    rojo: '#ef4444', red: '#ef4444',
    azul: '#3b82f6', blue: '#3b82f6',
    verde: '#10b981', green: '#10b981',
    morado: '#8b5cf6', purple: '#8b5cf6',
    naranja: '#f97316', orange: '#f97316',
    amarillo: '#eab308', yellow: '#eab308',
    rosa: '#ec4899', pink: '#ec4899',
    cian: '#06b6d4', cyan: '#06b6d4',
    gris: '#6b7280', gray: '#6b7280'
  };

  html = html.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (match, color, content) => {
    const cleanColor = String(color).trim();
    const c = COLOR_MAP[cleanColor.toLowerCase()] || cleanColor;
    return '<span style="color: ' + c + '; font-weight: inherit;">' + content + '</span>';
  });

  // Highlight: ==text==
  html = html.replace(/==([\s\S]*?)==/g, '<mark style="background-color: #fef08a; color: #854d0e; padding: 2px 4px; border-radius: 4px;">$1</mark>');

  // Bold: **text**
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');

  // Underline: <u>text</u>
  html = html.replace(/<u>([\s\S]*?)<\/u>/gi, '<u>$1</u>');

  // Strike: ~~text~~
  html = html.replace(/~~([\s\S]*?)~~/g, '<strike>$1</strike>');

  // Italic: *text*
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');

  // Newlines to <br> if not inside block tags
  html = html.replace(/\n/g, '<br>');

  return html;
};

/** Convierte el HTML del editor enriquecido (RichVisualEditor) al marcado interno. */
export const htmlToTag = (html) => {
  if (!html) return '';
  let str = String(html);

  // Convert <div><br></div> or <div> to newlines
  str = str.replace(/<div><br\s*[\/]?>/gi, '\n');
  str = str.replace(/<div>/gi, '\n');
  str = str.replace(/<\/div>/gi, '');
  str = str.replace(/<p>/gi, '');
  str = str.replace(/<\/p>/gi, '\n');
  str = str.replace(/<br\s*[\/]?>/gi, '\n');

  // Highlights (<mark>)
  str = str.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==');

  // Resolve innermost <span> tags iteratively so nested highlight/color spans and leading color: styles both work
  const innerSpanRe = /<span\b([^>]*)>((?:(?!<span\b)[\s\S])*?)<\/span>/gi;
  let guard = 0;
  while (innerSpanRe.test(str) && guard < 20) {
    innerSpanRe.lastIndex = 0;
    str = str.replace(innerSpanRe, (m, attrs, content) => {
      const styleMatch = String(attrs || '').match(/style\s*=\s*["']([^"']*)["']/i);
      const style = styleMatch ? styleMatch[1] : '';
      let out = content;
      const bgMatch = style.match(/(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/i);
      if (bgMatch) {
        const bgVal = bgMatch[1].trim().toLowerCase();
        if (bgVal && bgVal !== 'transparent' && bgVal !== 'none' && bgVal !== 'initial' && bgVal !== 'inherit' && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(bgVal)) {
          out = `==${out}==`;
        }
      }
      const colorMatch = style.match(/(?:^|[;\s])color\s*:\s*([^;]+)/i);
      if (colorMatch) {
        const cVal = colorMatch[1].trim();
        if (cVal && cVal.toLowerCase() !== 'inherit' && cVal.toLowerCase() !== 'initial') {
          out = `[color=${cVal}]${out}[/color]`;
        }
      }
      return out;
    });
    guard++;
  }

  // Colors from <font> tags
  str = str.replace(/<font[^>]*color=["']([^"']+)["'][^>]*>([\s\S]*?)<\/font>/gi, '[color=$1]$2[/color]');

  // Bold
  str = str.replace(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**');

  // Underline
  str = str.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '<u>$1</u>');

  // Strike
  str = str.replace(/<(?:strike|s|del)[^>]*>([\s\S]*?)<\/(?:strike|s|del)>/gi, '~~$1~~');

  // Italic
  str = str.replace(/<(?:i|em)[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*');

  // Headings (consume single trailing newline if already present to prevent doubling on round-trip)
  str = str.replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>\n?/gi, (m, level, c) => '#'.repeat(Number(level) || 3) + ' ' + c.replace(/<(?!\/?u\b)[^>]+>/gi, '').trim() + '\n');

  // Blockquotes
  str = str.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>\n?/gi, (m, c) => '> ' + c.replace(/<(?!\/?u\b)[^>]+>/gi, '').trim() + '\n');

  // List items
  str = str.replace(/<li[^>]*>([\s\S]*?)<\/li>\n?/gi, (m, c) => '- ' + c.replace(/<(?!\/?u\b)[^>]+>/gi, '').trim() + '\n');
  str = str.replace(/<\/?ul[^>]*>/gi, '');
  str = str.replace(/<\/?ol[^>]*>/gi, '');

  // Strip any remaining unwanted HTML tags except <u>
  str = str.replace(/<(?!\/?u\b)[^>]+>/gi, '');

  // Decode HTML entities
  str = str.replace(/&nbsp;/gi, ' ');
  str = str.replace(/&amp;/gi, '&');
  str = str.replace(/&lt;/gi, '<');
  str = str.replace(/&gt;/gi, '>');
  str = str.replace(/&quot;/gi, '"');

  return str.trim();
};

export default normalizarMarcado;

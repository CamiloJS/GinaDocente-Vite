import React, { useState } from 'react';
import CustomVideoPlayer, { extractYouTubeId } from './CustomVideoPlayer.jsx';
import GeniallyEmbedPlayer, { isGeniallyUrl, extractGeniallyUrl } from './GeniallyEmbedPlayer.jsx';
import AppleEmoji, { EMOJI_REGEX } from './AppleEmoji.jsx';
import { normalizarMarcado } from '../utils/textFormat.js';
import { URL_REGEX, extraerUrls, esPublicacionLarga } from '../utils/postLinks.js';
import { ChevronDown, ChevronUp } from './Icons.jsx';

const COLOR_MAP = {
  rojo: '#ef4444',
  red: '#ef4444',
  azul: '#3b82f6',
  blue: '#3b82f6',
  verde: '#10b981',
  green: '#10b981',
  morado: '#8b5cf6',
  purple: '#8b5cf6',
  naranja: '#f97316',
  orange: '#f97316',
  amarillo: '#eab308',
  yellow: '#eab308',
  rosa: '#ec4899',
  pink: '#ec4899',
  cian: '#06b6d4',
  cyan: '#06b6d4',
  negro: '#111827',
  black: '#111827',
  blanco: '#f9fafb',
  white: '#f9fafb',
  gris: '#6b7280',
  gray: '#6b7280',
};

// Definición de patrones de formato inline con soporte para anidación infinita.
// Los enlaces van AL FINAL: asi el formato (color, negrita, etc.) puede envolverlos.
const PATTERNS = [
  // 1. Colores: [color=#hex o nombre]...[/color] o <span style="color:...">...</span>
  {
    regex: /(?:\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|<span[^>]*style=["'][^"']*color:\s*([^"';]+)[^"']*["'][^>]*>([\s\S]*?)<\/span>)/i,
    type: 'color',
    extract: (m) => ({ color: m[1] || m[3] || '#3b82f6', content: m[2] || m[4] || '' })
  },
  // 2. Resaltado: ==texto== o [highlight]...[/highlight] o <mark>...</mark>
  {
    regex: /(?:==([\s\S]+?)==|\[highlight\]([\s\S]*?)\[\/highlight\]|<mark>([\s\S]*?)<\/mark>)/i,
    type: 'highlight',
    extract: (m) => ({ content: m[1] || m[2] || m[3] || '' })
  },
  // 3. Negrita: **texto** o <b>texto</b> o <strong>texto</strong>
  {
    regex: /(?:\*\*([\s\S]+?)\*\*|<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>)/i,
    type: 'bold',
    extract: (m) => ({ content: m[1] || m[2] || m[3] || '' })
  },
  // 4. Subrayado: <u>texto</u> o __texto__
  {
    regex: /(?:__([\s\S]+?)__|<u>([\s\S]*?)<\/u>)/i,
    type: 'underline',
    extract: (m) => ({ content: m[1] || m[2] || '' })
  },
  // 5. Tachado: ~~texto~~ o <s>texto</s> o <del>texto</del>
  {
    regex: /(?:~~([\s\S]+?)~~|<s>([\s\S]*?)<\/s>|<del>([\s\S]*?)<\/del>)/i,
    type: 'strike',
    extract: (m) => ({ content: m[1] || m[2] || m[3] || '' })
  },
  // 6. Cursiva: *texto* o _texto_ o <i>texto</i> o <em>texto</em>
  {
    regex: /(?:\*([\s\S]+?)\*|_([\s\S]+?)_|<i>([\s\S]*?)<\/i>|<em>([\s\S]*?)<\/em>)/i,
    type: 'italic',
    extract: (m) => ({ content: m[1] || m[2] || m[3] || m[4] || '' })
  },
  // 7. Enlaces http(s) (el patron compartido con postLinks.js)
  {
    regex: URL_REGEX,
    type: 'url',
    extract: (m) => ({ url: m[0] })
  }
];

// Parser recursivo AST que encuentra la coincidencia más temprana y procesa los hijos
const buildAST = (text) => {
  if (!text) return [];

  let earliest = null;

  for (const pat of PATTERNS) {
    const match = pat.regex.exec(text);
    if (match) {
      if (!earliest || match.index < earliest.match.index) {
        earliest = { pat, match };
      }
    }
  }

  if (!earliest) {
    return [{ type: 'text', text }];
  }

  const { pat, match } = earliest;
  const matchIndex = match.index;
  const matchLength = match[0].length;

  const beforeText = text.substring(0, matchIndex);
  const afterText = text.substring(matchIndex + matchLength);
  const data = pat.extract(match);

  const nodes = [];
  if (beforeText) {
    nodes.push(...buildAST(beforeText));
  }

  nodes.push({
    type: pat.type,
    ...data,
    children: pat.type === 'url' ? [] : buildAST(data.content)
  });

  if (afterText) {
    nodes.push(...buildAST(afterText));
  }

  return nodes;
};

// Función auxiliar para renderizar texto plano con Apple Emojis nítidos
const renderTextWithEmojis = (textVal, keyPrefix, emojiSize = '1.25em') => {
  if (!textVal) return null;
  const str = String(textVal);
  const emojiMatches = str.match(EMOJI_REGEX);
  if (!emojiMatches) {
    return str;
  }

  const parts = str.split(EMOJI_REGEX);
  return (
    <React.Fragment key={keyPrefix}>
      {parts.map((part, pIdx) => (
        <React.Fragment key={`${keyPrefix}-p-${pIdx}`}>
          {part}
          {emojiMatches[pIdx] && (
            <AppleEmoji
              emoji={emojiMatches[pIdx]}
              size={emojiSize}
              className="mx-[0.06em]"
            />
          )}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
};

// Renderizador React del AST.
// `enColor` indica que venimos dentro de un [color=...], para que los enlaces
// hereden ese color en vez de forzar el azul por defecto.
const renderAST = (nodes, keyPrefix = 'ast', emojiSize = '1.25em', enColor = false) => {
  if (!Array.isArray(nodes)) return null;

  return nodes.map((node, idx) => {
    const nodeKey = `${keyPrefix}-${node.type}-${idx}`;

    switch (node.type) {
      case 'color': {
        const colorVal = COLOR_MAP[node.color?.toLowerCase()] || node.color || '#3b82f6';
        return (
          <span key={nodeKey} style={{ color: colorVal }} className="font-medium">
            {renderAST(node.children, `${nodeKey}-c`, emojiSize, true)}
          </span>
        );
      }
      case 'highlight':
        return (
          <mark
            key={nodeKey}
            className="bg-amber-300 dark:bg-amber-500/40 text-gray-900 dark:text-amber-100 px-1 py-0.5 rounded font-medium"
          >
            {renderAST(node.children, `${nodeKey}-h`, emojiSize, enColor)}
          </mark>
        );
      case 'bold':
        return (
          <strong key={nodeKey} className="font-bold text-inherit">
            {renderAST(node.children, `${nodeKey}-b`, emojiSize, enColor)}
          </strong>
        );
      case 'underline':
        return (
          <span key={nodeKey} className="underline decoration-current underline-offset-2">
            {renderAST(node.children, `${nodeKey}-u`, emojiSize, enColor)}
          </span>
        );
      case 'strike':
        return (
          <span key={nodeKey} className="line-through opacity-75">
            {renderAST(node.children, `${nodeKey}-s`, emojiSize, enColor)}
          </span>
        );
      case 'italic':
        return (
          <em key={nodeKey} className="italic text-inherit">
            {renderAST(node.children, `${nodeKey}-i`, emojiSize, enColor)}
          </em>
        );
      case 'url':
        return (
          <a
            key={nodeKey}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${enColor ? 'text-inherit ' : 'text-blue-500 '}hover:underline break-all font-medium`}
          >
            {node.url}
          </a>
        );
      case 'text':
      default:
        return renderTextWithEmojis(node.text, nodeKey, emojiSize);
    }
  });
};

const parseInlineFormatting = (text, keyPrefix = 'rt', emojiSize = '1.25em') => {
  if (!text) return [];
  const ast = buildAST(text);
  return renderAST(ast, keyPrefix, emojiSize);
};

// Parser de estructura por líneas (encabezados, listas, citas)
const parseBlockFormatting = (text, keyPrefix = 'blk', emojiSize = '1.25em') => {
  const lines = String(text).split('\n');
  return lines.map((line, lIdx) => {
    const trimmed = line.trim();

    // Encabezados (# Título, ## Subtítulo, ### Sección)
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={`${keyPrefix}-h3-${lIdx}`} className="font-extrabold text-sm sm:text-base my-1 text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          {parseInlineFormatting(trimmed.substring(4), `${keyPrefix}-h3in-${lIdx}`, '1.2em')}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={`${keyPrefix}-h2-${lIdx}`} className="font-black text-base sm:text-lg my-1.5 text-gray-900 dark:text-gray-100">
          {parseInlineFormatting(trimmed.substring(3), `${keyPrefix}-h2in-${lIdx}`, '1.2em')}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={`${keyPrefix}-h1-${lIdx}`} className="font-black text-lg sm:text-xl my-2 text-gray-900 dark:text-gray-100">
          {parseInlineFormatting(trimmed.substring(2), `${keyPrefix}-h1in-${lIdx}`, '1.2em')}
        </h2>
      );
    }

    // Cita / Nota destacada (> texto o >texto)
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.replace(/^>\s*/, '');
      return (
        <blockquote
          key={`${keyPrefix}-q-${lIdx}`}
          className="border-l-3 border-purple-500 bg-purple-500/10 px-3 py-1.5 my-1.5 rounded-r-xl text-xs sm:text-sm italic text-gray-800 dark:text-gray-200"
        >
          {parseInlineFormatting(quoteContent, `${keyPrefix}-qin-${lIdx}`, emojiSize)}
        </blockquote>
      );
    }

    // Lista con viñeta (- elemento o * elemento)
    if (trimmed.startsWith('- ') || (trimmed.startsWith('* ') && !trimmed.endsWith('*'))) {
      return (
        <div key={`${keyPrefix}-li-${lIdx}`} className="flex items-start gap-2 my-0.5 ml-1 text-xs sm:text-sm">
          <span className="text-blue-500 font-bold select-none">•</span>
          <span className="flex-1">{parseInlineFormatting(trimmed.substring(2), `${keyPrefix}-liin-${lIdx}`, emojiSize)}</span>
        </div>
      );
    }

    // Línea normal
    return (
      <span key={`${keyPrefix}-p-${lIdx}`}>
        {parseInlineFormatting(line, `${keyPrefix}-pin-${lIdx}`, emojiSize)}
        {lIdx < lines.length - 1 && <br />}
      </span>
    );
  });
};

const LinkifyText = ({ text, isDarkMode = false, isEmojiOnly = false, embedVideos = true, colapsable = false }) => {
  const [expandido, setExpandido] = useState(false);
  if (!text) return null;

  const emojiSize = isEmojiOnly ? '2.4em' : '1.25em';
  // Limpia el marcado roto del editor (etiquetas partidas entre lineas, asteriscos sueltos)
  const limpio = String(normalizarMarcado(text));

  // Detección de videos / genially (sobre el texto ya limpio)
  const ytIds = [];
  const geniallyUrls = [];
  extraerUrls(limpio).forEach((u) => {
    const videoId = extractYouTubeId(u);
    if (videoId && !ytIds.includes(videoId)) {
      ytIds.push(videoId);
    }
    if (isGeniallyUrl(u)) {
      const gUrl = extractGeniallyUrl(u);
      if (gUrl && !geniallyUrls.includes(gUrl)) {
        geniallyUrls.push(gUrl);
      }
    }
  });

  // Publicación larga -> se muestra recortada con "Ver más"
  const larga = colapsable && esPublicacionLarga(limpio);
  const colapsado = larga && !expandido;
  const mascara = colapsado
    ? {
        WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
      }
    : undefined;

  return (
    <>
      <span className={colapsado ? 'block max-h-52 overflow-hidden' : 'block'} style={mascara}>
        {parseBlockFormatting(limpio, 'blk', emojiSize)}
      </span>

      {larga && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expandido ? 'Ver menos' : 'Ver más'}
        </button>
      )}

      {!colapsado && embedVideos && ytIds.slice(0, 1).map((videoId, idx) => (
        <div key={'yt-' + idx} className="mt-2.5 max-w-full">
          <CustomVideoPlayer videoId={videoId} title="Video de la clase" isDarkMode={isDarkMode} />
        </div>
      ))}
      {!colapsado && geniallyUrls.slice(0, 2).map((gUrl, idx) => (
        <div key={'genially-' + idx} className="mt-3 max-w-full">
          <GeniallyEmbedPlayer url={gUrl} isDarkMode={isDarkMode} />
        </div>
      ))}
    </>
  );
};

export default LinkifyText;

// scripts/test-forum-stars.mjs
// Pruebas de regresión: evita parpadeo de estrellas ★ en foros y valida Apple Emojis
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EMOJI_REGEX,
  getUnifiedHex,
  getAppleEmojiUrl,
  parseAppleEmojis,
  markAppleEmojiFailed,
  hasAppleEmojiFailed
} from '../src/utils/appleEmoji.js';

console.log('\n== 1. Regresión ★ / Glifos UI tipográficos excluidos ==');
{
  const uiStrings = [
    '★',
    '☆',
    '3 ★',
    'La profesora: 5★',
    '✓',
    '✕',
    '✗',
    '✘',
    '⌫',
    '©',
    '®',
    '™',
    '✔',
    '▶',
    '◀',
    '▪',
    '\uFE0F',
    '\u200D',
    '▶\uFE0E',
    '⭐\uFE0E'
  ];

  for (const s of uiStrings) {
    assert.equal(
      s.match(EMOJI_REGEX),
      null,
      `El glifo UI "${s}" NO debe coincidir con EMOJI_REGEX ni reemplazarse por <img> CDN`
    );
  }

  assert.equal(parseAppleEmojis('Tu puntuación: 3 ★'), 'Tu puntuación: 3 ★');
  console.log('  OK  Ningún glifo UI (★, ☆, ✓, ✗, ⌫, bare ▶/✔/▪) es capturado por EMOJI_REGEX');
}

console.log('\n== 2. Emojis adyacentes NO se fusionan en hex inválidos ==');
{
  assert.deepEqual('📌🔥'.match(EMOJI_REGEX), ['📌', '🔥']);
  assert.deepEqual('⭐⭐'.match(EMOJI_REGEX), ['⭐', '⭐']);
  assert.deepEqual('3 ★ ⭐ 3.8'.match(EMOJI_REGEX), ['⭐']);
  console.log('  OK  Secuencias como 📌🔥 y ⭐⭐ se dividen correctamente en emojis individuales');
}

console.log('\n== 3. Resolución canónica de hex en emoji-datasource-apple ==');
{
  const cases = [
    ['❤️', '2764-fe0f'],
    ['❤', '2764-fe0f'],
    ['⚠️', '26a0-fe0f'],
    ['⚠', '26a0-fe0f'],
    ['▶️', '25b6-fe0f'],
    ['✔️', '2714-fe0f'],
    ['⭐', '2b50'],
    ['⭐️', '2b50'],
    ['1️⃣', '0031-fe0f-20e3'],
    ['1⃣', '0031-fe0f-20e3'],
    ['👍🏽', '1f44d-1f3fd'],
    ['☝🏽', '261d-1f3fd'],
    ['👩‍🏫', '1f469-200d-1f3eb'],
    ['🇺🇸', '1f1fa-1f1f8']
  ];

  for (const [emoji, expectedHex] of cases) {
    assert.equal(getUnifiedHex(emoji), expectedHex, `Hex incorrecto para "${emoji}"`);
  }
  console.log('  OK  Todos los hex canónicos (keycaps, FE0F, tonos de piel, ZWJ, banderas) coinciden');
}

console.log('\n== 4. Caché anti-bucle y fallback seguro ==');
{
  const okHtml = parseAppleEmojis('Bien hecho 🔥');
  assert.match(okHtml, /class="apple-emoji /);
  assert.match(okHtml, /apple-emoji-ignore/);
  assert.ok(!okHtml.includes('createTextNode'), 'El fallback onerror debe envolver en .apple-emoji-ignore');

  markAppleEmojiFailed('1f9ea');
  assert.equal(hasAppleEmojiFailed('1f9ea'), true);
  assert.equal(getAppleEmojiUrl('🧪'), '');
  assert.equal(parseAppleEmojis('Prueba 🧪'), 'Prueba 🧪');
  console.log('  OK  Fallos CDN quedan bloqueados en sesión sin reintentos ni MutationObserver loop');
}

console.log('\n== 5. Invariantes anti-parpadeo en TaskCard, AppleEmoji y Observer ==');
{
  const taskCard = fs.readFileSync(new URL('../src/components/TaskCard.jsx', import.meta.url), 'utf8');
  const appleEmojiUtil = fs.readFileSync(new URL('../src/utils/appleEmoji.js', import.meta.url), 'utf8');
  const appleEmojiComp = fs.readFileSync(new URL('../src/components/AppleEmoji.jsx', import.meta.url), 'utf8');

  // Foro principal: pill y ★ protegidos + sin transition-all en botón estrella
  assert.match(taskCard, /flex-wrap items-center gap-2\.5 pt-2 select-none apple-emoji-ignore/);
  assert.match(taskCard, /whitespace-nowrap apple-emoji-ignore[\s\S]{0,80}\{myCurrentScore\} ★/);
  assert.match(taskCard, /p-0\.5 transition-transform duration-150 transform hover:scale-125/);

  // Comentarios de foro: container onMouseLeave en el div de las 5 estrellas y apple-emoji-ignore
  assert.match(taskCard, /flex items-center gap-1\.5 apple-emoji-ignore/);
  assert.match(
    taskCard,
    /onMouseLeave=\{\(\) => setRatingHover\(prev => \(\{ \.\.\.prev, \[cid\]: 0 \}\)\)\}/
  );

  // Observer único y pendiente en Set sin pérdida de lotes
  assert.match(appleEmojiUtil, /let activeEmojiObserver = null;/);
  assert.match(appleEmojiUtil, /const pendingTargets = new Set\(\);/);
  assert.match(appleEmojiUtil, /const EMOJI_TEST_REGEX = new RegExp\(EMOJI_PATTERN, 'u'\);/);

  // Componente React unificado
  assert.match(appleEmojiComp, /from '\.\.\/utils\/appleEmoji\.js'/);
  assert.match(appleEmojiComp, /<span className="apple-emoji-ignore">\{emoji\}<\/span>/);

  console.log('  OK  Protecciones anti-parpadeo verificadas en TaskCard.jsx, appleEmoji.js y AppleEmoji.jsx');
}

console.log('\nTODAS LAS PRUEBAS DE ESTRELLAS DE FOROS Y APPLE EMOJIS PASARON.\n');

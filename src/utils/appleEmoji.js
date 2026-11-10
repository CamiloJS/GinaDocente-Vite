// src/utils/appleEmoji.js
// Utility to render official Apple Emojis consistently across all devices (Windows, Android, Linux, Mac, iOS)

// Exact BMP single-codepoint emojis that require -fe0f in emoji-datasource-apple@15.0.1
const FE0F_REQUIRED_SINGLE_HEXES = new Set([
  '00a9', '00ae', '1f170', '1f171', '1f17e', '1f17f', '1f202', '1f237', '1f321', '1f324',
  '1f325', '1f326', '1f327', '1f328', '1f329', '1f32a', '1f32b', '1f32c', '1f336', '1f37d',
  '1f396', '1f397', '1f399', '1f39a', '1f39b', '1f39e', '1f39f', '1f3cb', '1f3cc', '1f3cd',
  '1f3ce', '1f3d4', '1f3d5', '1f3d6', '1f3d7', '1f3d8', '1f3d9', '1f3da', '1f3db', '1f3dc',
  '1f3dd', '1f3de', '1f3df', '1f3f3', '1f3f5', '1f3f7', '1f43f', '1f441', '1f4fd', '1f549',
  '1f54a', '1f56f', '1f570', '1f573', '1f574', '1f575', '1f576', '1f577', '1f578', '1f579',
  '1f587', '1f58a', '1f58b', '1f58c', '1f58d', '1f590', '1f5a5', '1f5a8', '1f5b1', '1f5b2',
  '1f5bc', '1f5c2', '1f5c3', '1f5c4', '1f5d1', '1f5d2', '1f5d3', '1f5dc', '1f5dd', '1f5de',
  '1f5e1', '1f5e3', '1f5e8', '1f5ef', '1f5f3', '1f5fa', '1f6cb', '1f6cd', '1f6ce', '1f6cf',
  '1f6e0', '1f6e1', '1f6e2', '1f6e3', '1f6e4', '1f6e5', '1f6e9', '1f6f0', '1f6f3', '203c',
  '2049', '2122', '2139', '2194', '2195', '2196', '2197', '2198', '2199', '21a9', '21aa',
  '2328', '23cf', '23ed', '23ee', '23ef', '23f1', '23f2', '23f8', '23f9', '23fa', '24c2',
  '25aa', '25ab', '25b6', '25c0', '25fb', '25fc', '2600', '2601', '2602', '2603', '2604',
  '260e', '2611', '2618', '261d', '2620', '2622', '2623', '2626', '262a', '262e', '262f',
  '2638', '2639', '263a', '2640', '2642', '265f', '2660', '2663', '2665', '2666', '2668',
  '267b', '267e', '2692', '2694', '2695', '2696', '2697', '2699', '269b', '269c', '26a0',
  '26a7', '26b0', '26b1', '26c8', '26cf', '26d1', '26d3', '26e9', '26f0', '26f1', '26f4',
  '26f7', '26f8', '26f9', '2702', '2708', '2709', '270c', '270d', '270f', '2712', '2714',
  '2716', '271d', '2721', '2733', '2734', '2744', '2747', '2763', '2764', '27a1', '2934',
  '2935', '2b05', '2b06', '2b07', '3030', '303d', '3297', '3299'
]);

// Unicode 15.0+ accurate single-emoji-cluster Regex.
// Excludes typographic UI glyphs like ★ (U+2605), ☆ (U+2606), ✓, ✕, ✗, ✘, ⌫, bare ▶/▪/✔, and orphan \uFE0F/\u200D.
const BMP_DEFAULT_EMOJI = '\\u231a\\u231b\\u23e9-\\u23ec\\u23f0\\u23f3\\u25fd\\u25fe\\u2614\\u2615\\u2648-\\u2653\\u267f\\u2693\\u26a1\\u26aa\\u26ab\\u26bd\\u26be\\u26c4\\u26c5\\u26ce\\u26d4\\u26ea\\u26f2\\u26f3\\u26f5\\u26fa\\u26fd\\u2705\\u270a\\u270b\\u2728\\u274c\\u274e\\u2753-\\u2755\\u2757\\u2795-\\u2797\\u27b0\\u27bf\\u2b1b\\u2b1c\\u2b50\\u2b55';
const BMP_SHORTCUT_BARE = '\\u23f1\\u2600\\u260e\\u261d\\u2620\\u2622\\u2623\\u262e\\u262f\\u2639\\u263a\\u2668\\u267b\\u2696\\u2699\\u26a0\\u2702\\u2708\\u2709\\u270c\\u270f\\u2744\\u2763\\u2764';
const BMP_TEXT_DEFAULT_BASE = '(?:\\u00a9|\\u00ae|\\u203c|\\u2049|\\u2122|\\u2139|[\\u2194-\\u2199]|\\u21a9|\\u21aa|\\u2328|\\u23cf|[\\u23ed-\\u23ef]|\\u23f1|\\u23f2|[\\u23f8-\\u23fa]|\\u24c2|\\u25aa|\\u25ab|\\u25b6|\\u25c0|\\u25fb|\\u25fc|[\\u2600-\\u2604]|\\u260e|\\u2611|\\u2618|\\u261d|\\u2620|\\u2622|\\u2623|\\u2626|\\u262a|\\u262e|\\u262f|\\u2638|\\u2639|\\u263a|\\u2640|\\u2642|\\u265f|\\u2660|\\u2663|\\u2665|\\u2666|\\u2668|\\u267b|\\u267e|\\u2692|\\u2694|\\u2695|\\u2696|\\u2697|\\u2699|\\u269b|\\u269c|\\u26a0|\\u26a7|\\u26b0|\\u26b1|\\u26c8|\\u26cf|\\u26d1|\\u26d3|\\u26e9|\\u26f0|\\u26f1|\\u26f4|[\\u26f7-\\u26f9]|\\u2702|\\u2708|\\u2709|\\u270c|\\u270d|\\u270f|\\u2712|\\u2714|\\u2716|\\u271d|\\u2721|\\u2733|\\u2734|\\u2744|\\u2747|\\u2763|\\u2764|\\u27a1|\\u2934|\\u2935|[\\u2b05-\\u2b07]|\\u3030|\\u303d|\\u3297|\\u3299)';
const BMP_TEXT_DEFAULT_WITH_FE0F = `${BMP_TEXT_DEFAULT_BASE}\\ufe0f`;
const ASTRAL_EMOJI = '[\\u{1F000}-\\u{1FAFF}]';
const SKIN_OR_VS = '(?:[\\u{1F3FB}-\\u{1F3FF}]|\\uFE0F)';
const EMOJI_BASE_UNIT = `(?:${BMP_TEXT_DEFAULT_WITH_FE0F}|[${BMP_DEFAULT_EMOJI}${BMP_SHORTCUT_BARE}](?!\\uFE0E)|${ASTRAL_EMOJI})(?:${SKIN_OR_VS})*`;
const EMOJI_ZWJ_UNIT = `(?:${BMP_TEXT_DEFAULT_BASE}\\uFE0F?|[${BMP_DEFAULT_EMOJI}${BMP_SHORTCUT_BARE}]|${ASTRAL_EMOJI})(?:${SKIN_OR_VS})*`;
const SUBDIV_FLAG = '\\u{1F3F4}[\\u{E0020}-\\u{E007E}]+\\u{E007F}';
const FLAG_PAIR = '[\\u{1F1E6}-\\u{1F1FF}]{2}';
const KEYCAP = '[#*0-9]\\uFE0F?\\u20E3';

const EMOJI_PATTERN = `${FLAG_PAIR}|${KEYCAP}|${SUBDIV_FLAG}|${EMOJI_BASE_UNIT}(?:\\u200d${EMOJI_ZWJ_UNIT})*`;

export const EMOJI_REGEX = new RegExp(EMOJI_PATTERN, 'gu');
const EMOJI_TEST_REGEX = new RegExp(EMOJI_PATTERN, 'u');

// Session cache of any emoji asset hex that failed to load so it is never retried in a loop
export const FAILED_APPLE_EMOJI_HEXES = new Set();

export function markAppleEmojiFailed(hex) {
  if (hex) FAILED_APPLE_EMOJI_HEXES.add(String(hex).toLowerCase());
}

export function hasAppleEmojiFailed(hex) {
  return Boolean(hex && FAILED_APPLE_EMOJI_HEXES.has(String(hex).toLowerCase()));
}

export function getUnifiedHex(emoji) {
  if (!emoji) return '';
  const rawCps = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code > 0xffff) {
      i++; // Skip surrogate pair second half
    }
    const hex = code.toString(16).toLowerCase();
    if (hex === 'fe0e') continue;
    rawCps.push(hex);
  }
  if (!rawCps.length) return '';

  // Keycaps always use -fe0f-20e3 in emoji-datasource-apple
  if (rawCps[rawCps.length - 1] === '20e3') {
    const base = rawCps[0].padStart(4, '0');
    return `${base}-fe0f-20e3`;
  }

  const normalized = [];
  for (let i = 0; i < rawCps.length; i++) {
    let cp = rawCps[i];
    if (cp.length < 4) cp = cp.padStart(4, '0');
    if (cp === 'fe0f') continue;
    normalized.push(cp);
    const next = rawCps[i + 1];
    const isSkinModifier = next && /^1f3f[b-f]$/.test(next);
    if (!isSkinModifier && FE0F_REQUIRED_SINGLE_HEXES.has(cp)) {
      normalized.push('fe0f');
    }
  }

  return normalized.join('-');
}

export function getAppleEmojiUrl(emoji) {
  const hex = getUnifiedHex(emoji);
  if (!hex || FAILED_APPLE_EMOJI_HEXES.has(hex)) return '';
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
}

// Converts HTML / text string by replacing emojis with Apple emoji <img> tags
export function parseAppleEmojis(text) {
  if (!text || typeof text !== 'string') return text || '';

  return text.replace(EMOJI_REGEX, (match) => {
    const hex = getUnifiedHex(match);
    if (!hex || FAILED_APPLE_EMOJI_HEXES.has(hex)) return match;
    const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
    const safeAlt = match.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<img class="apple-emoji inline-block h-[1.25em] w-[1.25em] mx-[0.08em] align-[-0.2em] object-contain pointer-events-none select-none" src="${url}" alt="${safeAlt}" loading="lazy" onerror="var s=document.createElement('span');s.className='apple-emoji-ignore';s.textContent=this.alt;this.replaceWith(s);" />`;
  });
}

const SKIP_TAGS = new Set([
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'option',
  'code',
  'pre',
  'svg'
]);

function shouldSkipElement(el) {
  if (!el || el.nodeType !== 1) return true;
  const tag = (el.tagName || '').toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;
  if (el.namespaceURI === 'http://www.w3.org/2000/svg') return true;
  if (el.isContentEditable) return true;
  if (el.classList?.contains('apple-emoji-ignore') || el.classList?.contains('apple-emoji')) return true;
  if (typeof el.closest === 'function') {
    if (el.closest('svg, textarea, input, select, script, style, .apple-emoji-ignore, [contenteditable="true"]')) {
      return true;
    }
  }
  return false;
}

// Global DOM parser to convert text nodes containing emojis into Apple emoji elements
export function parseNodeAppleEmojis(rootNode) {
  if (!rootNode || typeof window === 'undefined') return;
  if (rootNode.nodeType === 1 && shouldSkipElement(rootNode)) return;
  if (rootNode.nodeType === 3 && shouldSkipElement(rootNode.parentElement)) return;

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (shouldSkipElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.nodeValue && EMOJI_TEST_REGEX.test(node.nodeValue)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const parent = node.parentNode;
    if (!parent || !node.isConnected || shouldSkipElement(node.parentElement)) return;
    const text = node.nodeValue;
    if (!text) return;
    const matches = text.match(EMOJI_REGEX);
    if (!matches || matches.length === 0) return;

    const parts = text.split(EMOJI_REGEX);
    const fragment = document.createDocumentFragment();
    let replacedAny = false;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        fragment.appendChild(document.createTextNode(parts[i]));
      }
      const match = matches[i];
      if (match) {
        const hex = getUnifiedHex(match);
        if (!hex || FAILED_APPLE_EMOJI_HEXES.has(hex)) {
          fragment.appendChild(document.createTextNode(match));
        } else {
          replacedAny = true;
          const img = document.createElement('img');
          img.className = 'apple-emoji inline-block h-[1.25em] w-[1.25em] mx-[0.08em] align-[-0.2em] object-contain pointer-events-none select-none';
          img.src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
          img.alt = match;
          img.dataset.emojiHex = hex;
          img.loading = 'lazy';
          img.onerror = function() {
            if (this.dataset?.emojiHex) {
              FAILED_APPLE_EMOJI_HEXES.add(this.dataset.emojiHex);
            }
            const fallback = document.createElement('span');
            fallback.className = 'apple-emoji-ignore';
            fallback.textContent = this.alt;
            if (this.parentNode) this.parentNode.replaceChild(fallback, this);
          };
          fragment.appendChild(img);
        }
      }
    }

    if (replacedAny) {
      parent.replaceChild(fragment, node);
    }
  });
}

let activeEmojiObserver = null;

// Global MutationObserver to keep all dynamic content styled with Apple Emojis
export function initGlobalAppleEmojiObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  if (activeEmojiObserver) return activeEmojiObserver;

  // Initial parse on body
  setTimeout(() => {
    if (document.body) parseNodeAppleEmojis(document.body);
  }, 100);

  let timeoutId = null;
  const pendingTargets = new Set();

  const flushPending = () => {
    timeoutId = null;
    const targets = Array.from(pendingTargets);
    pendingTargets.clear();
    for (const target of targets) {
      if (!target || !target.isConnected) continue;
      try {
        parseNodeAppleEmojis(target);
      } catch (e) {
        // ignore transient detached DOM errors
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (!shouldSkipElement(node)) {
            pendingTargets.add(node);
          }
        } else if (node.nodeType === 3) {
          const p = node.parentNode;
          if (p && p.nodeType === 1 && !shouldSkipElement(p) && node.nodeValue && EMOJI_TEST_REGEX.test(node.nodeValue)) {
            pendingTargets.add(p);
          }
        }
      }
    }
    if (pendingTargets.size > 0) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(flushPending, 120);
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  activeEmojiObserver = observer;
  return observer;
}

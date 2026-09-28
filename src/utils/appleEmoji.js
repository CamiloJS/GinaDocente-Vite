// src/utils/appleEmoji.js
// Utility to render official Apple Emojis consistently across all devices (Windows, Android, Linux, Mac, iOS)

// Unicode 15.0+ Regex for single, complex, ZWJ sequences, skin tones, and flag emojis
export const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:[\ud83c\udde6-\ud83c\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|[\u2934-\u2935]|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|[\u2600-\u26ff]|[\u2b05-\u2b07]|[\u2b1b-\u2b1c]|\u2b50|\u2b55|[\u2300-\u23ff]|[\u200d\ufe0f\ufe0e])+/gu;

export function getUnifiedHex(emoji) {
  if (!emoji) return '';
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code > 0xffff) {
      i++; // Skip surrogate pair second half
    }
    codePoints.push(code.toString(16).toLowerCase());
  }

  let hex = codePoints.join('-');

  // Clean trailing or orphan fe0f if not part of multi-code sequences that need it
  if (hex.endsWith('-fe0f') && !['2764-fe0f', '23f1-fe0f', '1f6e0-fe0f', '26a0-fe0f', '267f-fe0f', '2695-fe0f', '2696-fe0f'].includes(hex)) {
    // Keep as is or strip depending on single point
  }
  return hex;
}

export function getAppleEmojiUrl(emoji) {
  const hex = getUnifiedHex(emoji);
  if (!hex) return '';
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
}

// Converts HTML / text string by replacing emojis with Apple emoji <img> tags
export function parseAppleEmojis(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  return text.replace(EMOJI_REGEX, (match) => {
    // Ensure it is actually an emoji
    const hex = getUnifiedHex(match);
    if (!hex) return match;
    const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
    return `<img class="apple-emoji inline-block h-[1.25em] w-[1.25em] mx-[0.08em] align-[-0.2em] object-contain pointer-events-none select-none" src="${url}" alt="${match}" loading="lazy" onerror="this.outerHTML='${match}';" />`;
  });
}

// Global DOM parser to convert text nodes containing emojis into Apple emoji elements
export function parseNodeAppleEmojis(rootNode) {
  if (!rootNode || typeof window === 'undefined') return;

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input' || parent.isContentEditable || parent.classList.contains('apple-emoji-ignore')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (EMOJI_REGEX.test(node.nodeValue)) {
          EMOJI_REGEX.lastIndex = 0;
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
    if (!parent) return;
    const text = node.nodeValue;
    const parts = text.split(EMOJI_REGEX);
    const matches = text.match(EMOJI_REGEX);
    if (!matches) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        fragment.appendChild(document.createTextNode(parts[i]));
      }
      if (matches[i]) {
        const hex = getUnifiedHex(matches[i]);
        const img = document.createElement('img');
        img.className = 'apple-emoji inline-block h-[1.25em] w-[1.25em] mx-[0.08em] align-[-0.2em] object-contain pointer-events-none select-none';
        img.src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
        img.alt = matches[i];
        img.loading = 'lazy';
        img.onerror = function() {
          const fallback = document.createTextNode(this.alt);
          if (this.parentNode) this.parentNode.replaceChild(fallback, this);
        };
        fragment.appendChild(img);
      }
    }
    parent.replaceChild(fragment, node);
  });
}

// Global MutationObserver to keep all dynamic content styled with Apple Emojis
export function initGlobalAppleEmojiObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;

  // Initial parse on body
  setTimeout(() => {
    parseNodeAppleEmojis(document.body);
  }, 100);

  let timeoutId = null;
  const observer = new MutationObserver((mutations) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              parseNodeAppleEmojis(node);
            } else if (node.nodeType === 3) {
              parseNodeAppleEmojis(node.parentNode);
            }
          });
        }
      });
    }, 120);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

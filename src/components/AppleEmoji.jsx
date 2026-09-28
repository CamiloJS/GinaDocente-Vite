// src/components/AppleEmoji.jsx
import React from 'react';

export const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:[\ud83c\udde6-\ud83c\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|[\u2934-\u2935]|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|[\u2600-\u26ff]|[\u2b05-\u2b07]|[\u2b1b-\u2b1c]|\u2b50|\u2b55|[\u2300-\u23ff]|[\u200d\ufe0f\ufe0e])+/gu;

export function getUnifiedHex(emoji) {
  if (!emoji) return '';
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code > 0xffff) {
      i++;
    }
    codePoints.push(code.toString(16).toLowerCase());
  }
  return codePoints.join('-');
}

export function getAppleEmojiUrl(emoji) {
  const hex = getUnifiedHex(emoji);
  if (!hex) return '';
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
}

export const AppleEmoji = ({ emoji, size = '1.25em', className = '', alt, style = {} }) => {
  const [hasError, setHasError] = React.useState(false);
  if (!emoji) return null;
  const hex = getUnifiedHex(emoji);
  if (!hex || hasError) return <span>{emoji}</span>;

  const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
  const sizeVal = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={url}
      alt={alt || emoji}
      className={`apple-emoji inline-block object-contain pointer-events-none select-none shrink-0 ${className}`}
      style={{
        width: sizeVal,
        height: sizeVal,
        minWidth: sizeVal,
        minHeight: sizeVal,
        verticalAlign: size === '1.25em' ? '-0.22em' : 'middle',
        ...style
      }}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

export default AppleEmoji;

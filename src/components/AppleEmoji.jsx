// src/components/AppleEmoji.jsx
import React from 'react';
import {
  EMOJI_REGEX,
  getUnifiedHex,
  getAppleEmojiUrl,
  hasAppleEmojiFailed,
  markAppleEmojiFailed
} from '../utils/appleEmoji.js';

export { EMOJI_REGEX, getUnifiedHex, getAppleEmojiUrl };

export const AppleEmoji = ({ emoji, size = '1.25em', className = '', alt, style = {} }) => {
  const [failedEmoji, setFailedEmoji] = React.useState(null);
  if (!emoji) return null;
  const hex = getUnifiedHex(emoji);
  if (!hex || failedEmoji === emoji || hasAppleEmojiFailed(hex)) {
    return <span className="apple-emoji-ignore">{emoji}</span>;
  }

  const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
  const sizeVal = typeof size === 'number' ? `${size}px` : size;

  return (
    <img loading="lazy" decoding="async"
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
      onError={() => {
        markAppleEmojiFailed(hex);
        setFailedEmoji(emoji);
      }}
    />
  );
};

export default AppleEmoji;

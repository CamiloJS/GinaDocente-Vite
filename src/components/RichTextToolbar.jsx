// src/components/RichTextToolbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter,
  Palette, List, Quote, Heading, SmileIcon, ChevronDown
} from './Icons.jsx';

const PRESET_COLORS = [
  { name: 'Rojo', code: '#ef4444' },
  { name: 'Azul', code: '#3b82f6' },
  { name: 'Verde', code: '#10b981' },
  { name: 'Morado', code: '#8b5cf6' },
  { name: 'Naranja', code: '#f97316' },
  { name: 'Amarillo', code: '#eab308' },
  { name: 'Rosa', code: '#ec4899' },
  { name: 'Cian', code: '#06b6d4' },
];

const QUICK_EMOJIS = ['📌', '✨', '⚠️', '🚀', '📚', '💡', '🎯', '🎉', '✅', '📝', '👏', '⭐'];

export const RichTextToolbar = ({
  textareaRef,
  text = '',
  setText,
  isDarkMode = false,
  compact = false,
  className = ''
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowColorPicker(false);
        setShowEmojiMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const wrapSelection = (prefix, suffix = prefix, placeholder = 'texto') => {
    const el = textareaRef?.current;
    if (!el) {
      if (typeof setText === 'function') {
        setText(prev => (prev || '') + prefix + placeholder + suffix);
      }
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const currentVal = el.value !== undefined ? el.value : (text || '');
    const selected = currentVal.substring(start, end);
    const content = selected || placeholder;
    const insertion = prefix + content + suffix;

    const nextVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);

    if (typeof setText === 'function') {
      setText(nextVal);
    } else {
      el.value = nextVal;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start, start + insertion.length);
      } else {
        const selStart = start + prefix.length;
        const selEnd = selStart + placeholder.length;
        el.setSelectionRange(selStart, selEnd);
      }
    }, 15);
  };

  const insertLinePrefix = (linePrefix, placeholder = 'Elemento') => {
    const el = textareaRef?.current;
    if (!el) {
      if (typeof setText === 'function') {
        setText(prev => (prev || '') + '\n' + linePrefix + ' ' + placeholder + '\n');
      }
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const currentVal = el.value !== undefined ? el.value : (text || '');
    const selected = currentVal.substring(start, end);
    const content = selected || placeholder;

    const needsLeadingNewline = start > 0 && currentVal.charAt(start - 1) !== '\n';
    const insertion = (needsLeadingNewline ? '\n' : '') + linePrefix + ' ' + content + '\n';
    const nextVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);

    if (typeof setText === 'function') {
      setText(nextVal);
    } else {
      el.value = nextVal;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    }, 15);
  };

  const insertRawText = (rawStr) => {
    const el = textareaRef?.current;
    if (!el) {
      if (typeof setText === 'function') {
        setText(prev => (prev || '') + rawStr);
      }
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const currentVal = el.value !== undefined ? el.value : (text || '');
    const nextVal = currentVal.substring(0, start) + rawStr + currentVal.substring(end);

    if (typeof setText === 'function') {
      setText(nextVal);
    } else {
      el.value = nextVal;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      el.focus();
      const pos = start + rawStr.length;
      el.setSelectionRange(pos, pos);
    }, 15);
  };

  const btnClass = 'p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ' + (
    isDarkMode
      ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 active:bg-gray-600'
      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/80 active:bg-gray-300'
  );

  return (
    <div
      ref={toolbarRef}
      className={'flex flex-wrap items-center gap-1 p-1.5 rounded-xl border select-none transition-colors ' + (
        isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-gray-50/90 border-gray-200'
      ) + ' ' + className}
    >
      {/* Negrita */}
      <button
        type="button"
        onClick={() => wrapSelection('**', '**', 'negrita')}
        className={btnClass}
        title="Negrita (**texto**)"
      >
        <Bold size={13} />
      </button>

      {/* Cursiva */}
      <button
        type="button"
        onClick={() => wrapSelection('*', '*', 'cursiva')}
        className={btnClass}
        title="Cursiva (*texto*)"
      >
        <Italic size={13} />
      </button>

      {/* Subrayado */}
      <button
        type="button"
        onClick={() => wrapSelection('<u>', '</u>', 'subrayado')}
        className={btnClass}
        title="Subrayado (<u>texto</u>)"
      >
        <Underline size={13} />
      </button>

      {/* Tachado */}
      <button
        type="button"
        onClick={() => wrapSelection('~~', '~~', 'tachado')}
        className={btnClass}
        title="Tachado (~~texto~~)"
      >
        <Strikethrough size={13} />
      </button>

      {/* Resaltador */}
      <button
        type="button"
        onClick={() => wrapSelection('==', '==', 'resaltado')}
        className={btnClass}
        title="Resaltador (==texto==)"
      >
        <Highlighter size={13} />
      </button>

      {/* Separador */}
      <div className={'h-4 w-px mx-0.5 ' + (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')} />

      {/* Selector de Colores */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowColorPicker(prev => !prev);
            setShowEmojiMenu(false);
          }}
          className={btnClass + ' ' + (showColorPicker ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900') : '')}
          title="Color de texto"
        >
          <Palette size={13} />
          <span className="text-[10px] hidden sm:inline font-semibold">Color</span>
          <ChevronDown size={10} />
        </button>

        {showColorPicker && (
          <div
            className={'absolute bottom-full left-0 mb-2 p-2 rounded-2xl border shadow-2xl z-[99999] grid grid-cols-4 gap-1.5 w-44 animate-in fade-in zoom-in-95 ' + (
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}
          >
            {PRESET_COLORS.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  wrapSelection('[color=' + c.code + ']', '[/color]', 'texto ' + c.name.toLowerCase());
                  setShowColorPicker(false);
                }}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-all hover:scale-105"
                title={c.name}
              >
                <div
                  className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                  style={{ backgroundColor: c.code }}
                />
                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 truncate w-full text-center">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Encabezado */}
      {!compact && (
        <button
          type="button"
          onClick={() => insertLinePrefix('###', 'Título')}
          className={btnClass}
          title="Encabezado (### Título)"
        >
          <Heading size={13} />
        </button>
      )}

      {/* Lista */}
      <button
        type="button"
        onClick={() => insertLinePrefix('-', 'Punto de la lista')}
        className={btnClass}
        title="Lista con viñetas (- elemento)"
      >
        <List size={13} />
      </button>

      {/* Cita / Bloque destacado */}
      {!compact && (
        <button
          type="button"
          onClick={() => insertLinePrefix('>', 'Cita o nota')}
          className={btnClass}
          title="Cita / Nota (> texto)"
        >
          <Quote size={13} />
        </button>
      )}

      {/* Separador */}
      <div className={'h-4 w-px mx-0.5 ' + (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')} />

      {/* Emojis Rápidos */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowEmojiMenu(prev => !prev);
            setShowColorPicker(false);
          }}
          className={btnClass + ' ' + (showEmojiMenu ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900') : '')}
          title="Insertar emoji"
        >
          <SmileIcon size={13} />
          <span className="text-[10px] hidden sm:inline font-semibold">Emoji</span>
        </button>

        {showEmojiMenu && (
          <div
            className={'absolute bottom-full right-0 sm:left-0 mb-2 p-2 rounded-2xl border shadow-2xl z-[99999] grid grid-cols-6 gap-1 w-52 animate-in fade-in zoom-in-95 ' + (
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}
          >
            {QUICK_EMOJIS.map(em => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  insertRawText(' ' + em + ' ');
                  setShowEmojiMenu(false);
                }}
                className="text-base p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:scale-125 transition-transform flex items-center justify-center"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextToolbar;

// src/components/RichVisualEditor.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter, List, Quote, Heading
} from './Icons.jsx';

import { tagToHtml, htmlToTag } from '../utils/textFormat.js';
export { tagToHtml, htmlToTag };

const COLOR_PALETTE = [
  { name: 'Negro', hex: '#111827' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Verde', hex: '#10b981' },
  { name: 'Morado', hex: '#8b5cf6' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Amarillo', hex: '#eab308' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Cian', hex: '#06b6d4' },
  { name: 'Gris', hex: '#6b7280' },
];

export const RichVisualEditor = ({
  value = '',
  onChange,
  placeholder = 'Escribe la descripción...',
  isDarkMode = false,
  minHeight = '140px',
  className = ''
}) => {
  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);
  const isInternalChangeRef = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    list: false,
    heading: false,
    quote: false,
    highlight: false,
    color: null
  });

  useEffect(() => {
    if (!showColorPicker) return;
    const handleOutsideClick = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showColorPicker]);

  // Check which formatting options are currently active at cursor / selection
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikeThrough');
      const isList = document.queryCommandState('insertUnorderedList');
      
      const blockVal = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      const isHeading = blockVal.includes('h1') || blockVal.includes('h2') || blockVal.includes('h3');
      let isQuote = blockVal.includes('blockquote');

      let isHighlight = false;
      let activeColor = null;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'blockquote') {
              isQuote = true;
            }
            const bg = node.style && node.style.backgroundColor ? String(node.style.backgroundColor).toLowerCase().trim() : '';
            if (tag === 'mark' || (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'none' && bg !== 'initial' && bg !== 'inherit')) {
              isHighlight = true;
            }
            if (tag !== 'mark' && tag !== 'blockquote' && node.style && node.style.color && !activeColor) {
              activeColor = node.style.color;
            }
          }
          node = node.parentNode;
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strike: isStrike,
        list: isList,
        heading: isHeading,
        quote: isQuote,
        highlight: isHighlight,
        color: activeColor
      });
    } catch (e) {}
  }, []);

  // Listen to selection changes across the document
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats]);

  // Sync external value to editor content
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const currentHtml = editorRef.current.innerHTML;
    const targetHtml = tagToHtml(value);
    if (currentHtml !== targetHtml && htmlToTag(currentHtml) !== value) {
      editorRef.current.innerHTML = targetHtml;
    }
    setIsEmpty(!value || value.trim() === '');
    updateActiveFormats();
  }, [value, updateActiveFormats]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChangeRef.current = true;
    const html = editorRef.current.innerHTML;
    const tagText = htmlToTag(html);
    setIsEmpty(!tagText || tagText.trim() === '');
    if (typeof onChange === 'function') {
      onChange(tagText);
    }
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  // Execute formatting command on selected text
  const execFormat = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
    updateActiveFormats();
  };

  const toggleQuote = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (activeFormats.quote) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
    handleInput();
    updateActiveFormats();
  };

  const toggleHeading = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (activeFormats.heading) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<h3>');
    }
    handleInput();
    updateActiveFormats();
  };

  const applyColor = (hex) => {
    execFormat('foreColor', hex);
    setShowColorPicker(false);
  };

  const getButtonClass = (isActive) => {
    if (isActive) {
      return (
        'p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ' +
        (isDarkMode 
          ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
          : 'bg-purple-100 text-purple-700 border border-purple-300 shadow-xs')
      );
    }
    return (
      'p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ' +
      (isDarkMode 
        ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900')
    );
  };

  return (
    <div className={'w-full rounded-2xl border transition-all overflow-hidden flex flex-col ' + (
      isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
    ) + ' ' + className}>
      {/* Scoped CSS for Real-time Content Styles inside the Editor */}
      <style>{`
        .rich-visual-editable blockquote {
          border-left: 3px solid #8b5cf6 !important;
          background: rgba(139, 92, 246, 0.08) !important;
          padding: 6px 12px !important;
          margin: 6px 0 !important;
          border-radius: 0 8px 8px 0 !important;
          font-style: italic !important;
          color: #8b5cf6 !important;
          display: block !important;
        }
        .rich-visual-editable h1 { font-size: 1.35em !important; font-weight: 900 !important; margin: 8px 0 4px !important; }
        .rich-visual-editable h2 { font-size: 1.25em !important; font-weight: 800 !important; margin: 6px 0 3px !important; }
        .rich-visual-editable h3 { font-size: 1.15em !important; font-weight: 800 !important; margin: 6px 0 2px !important; }
        .rich-visual-editable ul { list-style-type: disc !important; padding-left: 20px !important; margin: 4px 0 !important; }
        .rich-visual-editable li { margin: 2px 0 !important; }
        .rich-visual-editable mark { background-color: #fef08a !important; color: #854d0e !important; padding: 2px 4px !important; border-radius: 4px !important; }
      `}</style>

      {/* Barra de Herramientas WYSIWYG 100% Visual */}
      <div className={'flex flex-wrap items-center justify-between gap-1 p-1.5 border-b select-none ' + (
        isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }}
            className={getButtonClass(activeFormats.bold)}
            title="Negrita (Ctrl+B)"
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }}
            className={getButtonClass(activeFormats.italic)}
            title="Cursiva (Ctrl+I)"
          >
            <Italic size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }}
            className={getButtonClass(activeFormats.underline)}
            title="Subrayado (Ctrl+U)"
          >
            <Underline size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execFormat('strikeThrough'); }}
            className={getButtonClass(activeFormats.strike)}
            title="Tachado"
          >
            <Strikethrough size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (activeFormats.highlight) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0 && editorRef.current) {
                  let node = selection.anchorNode;
                  while (node && node !== editorRef.current) {
                    if (node.nodeType === 1 && node.tagName.toLowerCase() === 'mark') {
                      const parent = node.parentNode;
                      while (node.firstChild) parent.insertBefore(node.firstChild, node);
                      parent.removeChild(node);
                      break;
                    }
                    node = node.parentNode;
                  }
                }
                execFormat('hiliteColor', 'transparent');
              } else {
                execFormat('hiliteColor', isDarkMode ? '#854d0e' : '#fef08a');
              }
            }}
            className={getButtonClass(activeFormats.highlight)}
            title="Resaltador"
          >
            <Highlighter size={15} className={activeFormats.highlight ? 'text-white' : 'text-yellow-500'} />
          </button>

          <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

          {/* Selector de Paleta de Colores Circular (Sin texto, con Negro incluido) */}
          <div className="relative" ref={colorPickerRef}>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(prev => !prev); }}
              className={getButtonClass(Boolean(activeFormats.color) || showColorPicker) + ' px-2 font-bold text-xs'}
              title="Color de texto"
            >
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-blue-500">A</span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {showColorPicker && (
              <div className={'absolute top-full left-0 mt-1 p-2 rounded-xl shadow-2xl border flex flex-wrap gap-2 z-50 w-44 animate-in fade-in zoom-in-95 ' + (
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
              )}>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onMouseDown={(e) => { e.preventDefault(); applyColor(c.hex); }}
                    className="w-6 h-6 rounded-full shrink-0 shadow-xs border-2 border-white dark:border-gray-700 hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); toggleHeading(); }}
            className={getButtonClass(activeFormats.heading)}
            title="Encabezado de sección"
          >
            <Heading size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execFormat('insertUnorderedList'); }}
            className={getButtonClass(activeFormats.list)}
            title="Lista con viñetas"
          >
            <List size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); toggleQuote(); }}
            className={getButtonClass(activeFormats.quote)}
            title="Cita o nota destacada"
          >
            <Quote size={15} />
          </button>
        </div>
      </div>

      {/* Área Editable 100% Visual */}
      <div className="relative flex-1 w-full">
        {isEmpty && (
          <div 
            className="absolute top-3 left-3 text-xs text-gray-400 pointer-events-none select-none italic"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onTouchEnd={updateActiveFormats}
          onFocus={updateActiveFormats}
          style={{ minHeight }}
          className={'rich-visual-editable w-full p-3 outline-none text-xs sm:text-sm leading-relaxed overflow-y-auto cursor-text ' + (
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          )}
        />
      </div>
    </div>
  );
};

export default RichVisualEditor;
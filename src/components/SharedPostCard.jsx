// src/components/SharedPostCard.jsx
import React from 'react';
import { 
  Pin, 
  MessageSquare, 
  MessageSquareText,
  CheckCircle2, 
  BarChart2, 
  BookOpen, 
  Clock, 
  ChevronRight, 
  Star,
  Sparkles
} from './Icons.jsx';
import { parseSharedPost } from '../utils/sharedPostParser.js';

export { parseSharedPost };

export const SharedPostCard = ({
  sharedItem,
  isMe = false,
  isDarkMode = false,
  onNavigate
}) => {
  if (!sharedItem || !sharedItem.id) return null;

  const {
    id,
    type = 'post',
    typeLabel = 'Publicación',
    actionLabel,
    title,
    description = '',
    author,
    groupName,
    imageUrl,
    dueDate,
    dueTime,
    commentsCount = 0,
    rating = 5.0
  } = sharedItem;

  const computedAction = actionLabel || (
    type === 'forum' ? 'Ir al foro' :
    type === 'task' ? 'Ir a la tarea' :
    type === 'evaluation' ? 'Ir a la evaluación' :
    type === 'poll' ? 'Ir a la encuesta' :
    type === 'slides' ? 'Ir a la presentación' :
    type === 'book3d' ? 'Abrir libro' : 'Ir a la publicación'
  );

  const getTypeIcon = () => {
    switch (type) {
      case 'forum': return <MessageSquare size={13} className="shrink-0" />;
      case 'task': return <CheckCircle2 size={13} className="shrink-0" />;
      case 'evaluation': return <BarChart2 size={13} className="shrink-0" />;
      case 'book3d': return <BookOpen size={13} className="shrink-0" />;
      default: return <Pin size={13} className="shrink-0" />;
    }
  };

  const getTypeBadgeStyle = () => {
    switch (type) {
      case 'forum': return 'bg-purple-500/20 text-purple-200 border-purple-400/40';
      case 'task': return 'bg-amber-500/20 text-amber-200 border-amber-400/40';
      case 'evaluation': return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
      case 'book3d': return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40';
      default: return 'bg-blue-500/20 text-blue-200 border-blue-400/40';
    }
  };

  // Limpiar texto de BBCode/tags para una previsualización nítida y perfectamente legible
  const cleanSnippet = (description || '')
    .replace(/\[color=[^\]]+\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\[b\]/gi, '')
    .replace(/\[\/b\]/gi, '')
    .replace(/\[i\]/gi, '')
    .replace(/\[\/i\]/gi, '')
    .trim();

  const handleCardClick = (e) => {
    e.stopPropagation();
    if (typeof onNavigate === 'function') {
      onNavigate(id, type);
    }
  };

  return (
    <div 
      className={`mt-1.5 w-full min-w-[260px] max-w-[340px] sm:max-w-[370px] rounded-2xl p-3 sm:p-3.5 border transition-all select-none shadow-md ${
        isMe 
          ? 'bg-black/25 hover:bg-black/35 border-white/25 text-white' 
          : (isDarkMode 
              ? 'bg-gray-800/95 hover:bg-gray-800 border-gray-700 text-gray-100 shadow-black/50' 
              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900 shadow-md')
      }`}
    >
      {/* Cabecera de la mini tarjeta: Tipo + Materia/Grupo */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-xs ${
          isMe ? getTypeBadgeStyle() : (isDarkMode ? getTypeBadgeStyle() : 'bg-blue-50 text-blue-700 border-blue-200')
        }`}>
          {getTypeIcon()}
          <span>{typeLabel}</span>
        </span>
        {groupName && (
          <span className={`text-[10px] font-bold truncate max-w-[150px] ${
            isMe ? 'text-white/80' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
          }`} title={groupName}>
            {groupName}
          </span>
        )}
      </div>

      {/* Autor (si está disponible) */}
      {author && (
        <p className={`text-[11px] font-medium mb-1 truncate ${
          isMe ? 'text-white/75' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
        }`}>
          Por <strong className={isMe ? 'text-white font-bold' : (isDarkMode ? 'text-gray-200 font-bold' : 'text-gray-800 font-bold')}>{author}</strong>
        </p>
      )}

      {/* Título de la publicación */}
      <h4 className={`text-sm sm:text-[15px] font-extrabold leading-snug line-clamp-2 mb-2 ${
        isMe ? 'text-white' : (isDarkMode ? 'text-white' : 'text-gray-900')
      }`}>
        {title}
      </h4>

      {/* Imagen adjunta en miniatura si existe */}
      {imageUrl && (
        <div className="mb-2.5 rounded-xl overflow-hidden max-h-36 w-full bg-black/10 border border-white/10 dark:border-gray-700">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
            loading="lazy" 
          />
        </div>
      )}

      {/* Fragmento de la descripción (igualmente legible, hasta 4 líneas) */}
      {cleanSnippet && (
        <p className={`text-xs leading-relaxed line-clamp-4 whitespace-pre-line mb-3 font-normal ${
          isMe ? 'text-white/90' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
        }`}>
          {cleanSnippet}
        </p>
      )}

      {/* Metadatos: Vencimiento / Calificación / Aportes */}
      {(dueDate || commentsCount > 0 || (type === 'forum' && rating)) && (
        <div className={`flex flex-wrap items-center gap-2.5 text-[10px] font-semibold mb-3 pt-1 border-t ${
          isMe ? 'border-white/15 text-white/80' : (isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500')
        }`}>
          {dueDate && (
            <span className="flex items-center gap-1">
              <Clock size={11} className="shrink-0" />
              <span>Vence: {dueDate}{dueTime ? ` ${dueTime}` : ''}</span>
            </span>
          )}
          {type === 'forum' && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star size={11} fill="currentColor" /> {Number(rating || 5).toFixed(1)}
            </span>
          )}
          {commentsCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={11} className="shrink-0" />
              <span>{commentsCount} {commentsCount === 1 ? 'aporte' : 'aportes'}</span>
            </span>
          )}
        </div>
      )}

      {/* Botón de acción principal */}
      <button
        type="button"
        onClick={handleCardClick}
        className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
          isMe 
            ? 'bg-white hover:bg-blue-50 text-blue-700 shadow-black/20' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
        }`}
      >
        <span>{computedAction}</span>
        <ChevronRight size={14} className="shrink-0" />
      </button>
    </div>
  );
};

export default SharedPostCard;

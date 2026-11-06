// src/components/ProfileHoverCard.jsx
// Tarjeta emergente con vista previa del perfil al pasar el mouse por encima (solo en escritorio)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  UserIcon, MessageCircle, ExternalLink, TeacherIcon, CheckCircle2 
} from './Icons.jsx';
import { SpotifyWidget } from './SpotifyWidget.jsx';
import { 
  resolveUserDisplayName, 
  resolveUserPhoto, 
  isTeacherId
} from '../utils/helpers.js';
import {
  getUserPresenceData, 
  getPresenceStatus, 
  formatLastConnection,
  getLastConnectionTime
} from '../utils/chatPresence.js';

// Variable en módulo para asegurar que solo una tarjeta de perfil esté abierta a la vez
let activeHoverCardCloseFn = null;

export const ProfileHoverCard = ({
  userId,
  userObj = null,
  userMappings = {},
  userPresence = {},
  myChatId = '',
  role = 'student',
  onOpenProfile,
  onOpenChat,
  preferredPlacement = 'left',
  isDarkMode = false,
  className = '',
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'left' });
  const [isDesktopHover, setIsDesktopHover] = useState(false);

  const targetRef = useRef(null);
  const cardRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const closeSelf = useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsOpen(false);
  }, []);

  // Detección estricta de dispositivo de escritorio con soporte de puntero de precisión (ratón)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const check = () => setIsDesktopHover(Boolean(mq.matches && window.innerWidth >= 768));
    check();
    mq.addEventListener?.('change', check);
    window.addEventListener('resize', check);
    return () => {
      mq.removeEventListener?.('change', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!targetRef.current || typeof window === 'undefined') return;
    const rect = targetRef.current.getBoundingClientRect();
    const cardWidth = 280;
    const estimatedHeight = cardRef.current?.offsetHeight || 310;
    const margin = 10;

    let left = 0;
    let top = 0;
    let placement = preferredPlacement;

    if (preferredPlacement === 'left') {
      // Prioridad requerida: A la izquierda del chat/elemento
      left = rect.left - cardWidth - margin;
      placement = 'left';

      // Si no cabe a la izquierda (menos de 12px del margen izquierdo de la pantalla)
      if (left < 12) {
        // Si hay espacio suficiente a la derecha, ubicar a la derecha
        if (rect.right + cardWidth + margin <= window.innerWidth - 12) {
          left = rect.right + margin;
          placement = 'right';
        } else {
          // Ajustar dentro del límite izquierdo visible
          left = 12;
        }
      }

      // Alinear verticalmente centrado con el elemento señalado
      top = rect.top + (rect.height / 2) - (estimatedHeight / 2);
    } else if (preferredPlacement === 'right') {
      left = rect.right + margin;
      placement = 'right';
      if (left + cardWidth > window.innerWidth - 12) {
        left = Math.max(12, rect.left - cardWidth - margin);
        placement = 'left';
      }
      top = rect.top + (rect.height / 2) - (estimatedHeight / 2);
    } else {
      left = rect.left + (rect.width / 2) - (cardWidth / 2);
      if (left < 12) left = 12;
      if (left + cardWidth > window.innerWidth - 12) {
        left = window.innerWidth - cardWidth - 12;
      }
      top = rect.bottom + margin;
      placement = 'bottom';
      if (rect.bottom + estimatedHeight > window.innerHeight - 12) {
        top = rect.top - estimatedHeight - margin;
        placement = 'top';
      }
    }

    // Prevenir desbordamiento vertical de la pantalla
    if (top < 12) {
      top = 12;
    } else if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - estimatedHeight - 12);
    }

    setCoords({ top, left, placement });
  }, [preferredPlacement]);

  const handleMouseEnter = () => {
    if (!isDesktopHover || !userId) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (isOpen) return;
    openTimerRef.current = setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
    }, 180); // 180ms debounce
  };

  const handleMouseLeave = () => {
    if (!isDesktopHover) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms margen para mover el ratón hacia la tarjeta
  };

  // Cerrar al scrollear cualquier contenedor o presionar Escape, y asegurar tarjeta única activa
  useEffect(() => {
    if (!isOpen) return;

    if (activeHoverCardCloseFn && activeHoverCardCloseFn !== closeSelf) {
      activeHoverCardCloseFn();
    }
    activeHoverCardCloseFn = closeSelf;

    const handleScrollOrKey = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      closeSelf();
    };

    window.addEventListener('scroll', handleScrollOrKey, { capture: true, passive: true });
    window.addEventListener('keydown', handleScrollOrKey);
    return () => {
      window.removeEventListener('scroll', handleScrollOrKey, { capture: true });
      window.removeEventListener('keydown', handleScrollOrKey);
      if (activeHoverCardCloseFn === closeSelf) {
        activeHoverCardCloseFn = null;
      }
    };
  }, [isOpen, closeSelf]);

  // Recalcular posición cuando monta para ajustar con su altura real
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Si no es escritorio o no hay usuario, devolver simplemente los hijos sin envoltorio interactivo pesado
  if (!isDesktopHover || !userId) {
    return <span className={className}>{children}</span>;
  }

  // Resolver datos completos del usuario
  const cleanId = String(userId || '').replace(/^@/, '');
  const uData = userObj || userMappings[userId] || userMappings[cleanId] || {};
  const isTeacher = isTeacherId(userId);
  const fullName = uData.fullName || uData.name || resolveUserDisplayName(userId, userMappings) || userId;
  const photo = resolveUserPhoto(userId, userMappings, uData.profilePicUrl || '');
  const groupName = uData.groupName || uData.academicGroupName || uData.career || '';
  const email = uData.email || (cleanId.includes('@') ? cleanId : '');
  const bio = uData.bio || uData.statusMessage || uData.customStatus || '';
  const spotifyStatus = uData.spotifyStatus || null;

  // Estado de presencia
  const pData = getUserPresenceData(userId, userPresence, userMappings);
  const presenceStatus = getPresenceStatus(pData);
  const isOnline = presenceStatus === 'online';
  const isAway = presenceStatus === 'away';
  const isBusy = presenceStatus === 'busy';
  const lastConn = role === 'teacher' ? getLastConnectionTime(userId, userPresence, userMappings) : 0;

  const isMe = myChatId && (cleanId === myChatId.toLowerCase() || String(userId).toLowerCase() === String(myChatId).toLowerCase());

  return (
    <span 
      ref={targetRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-block ${className}`}
    >
      {children}

      {isOpen && ReactDOM.createPortal(
        <div
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '280px',
            zIndex: 100050
          }}
          className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none text-left ${
            isDarkMode 
              ? 'bg-gray-900/95 border-gray-700 text-gray-100 shadow-black/80' 
              : 'bg-white/95 border-gray-200 text-gray-900 shadow-xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Puente invisible para transición suave del cursor entre el chat y la tarjeta */}
          {coords.placement === 'left' && (
            <div className="absolute top-0 -right-3 w-3 h-full pointer-events-auto" />
          )}
          {coords.placement === 'right' && (
            <div className="absolute top-0 -left-3 w-3 h-full pointer-events-auto" />
          )}

          {/* Banner de Cabecera con degradado temático */}
          <div className={`h-14 relative p-2 flex items-start justify-end ${
            isTeacher 
              ? 'bg-gradient-to-r from-[#AD3333] via-red-600 to-amber-700' 
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
          }`}>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-sm border border-white/20">
              {isTeacher ? 'Docente' : 'Estudiante'}
            </span>
          </div>

          {/* Cuerpo del perfil */}
          <div className="p-3.5 pt-0 relative">
            {/* Avatar flotante sobre el banner */}
            <div className="flex items-end justify-between -mt-7 mb-2">
              <div className="relative">
                <div className={`w-14 h-14 rounded-full border-3 overflow-hidden shadow-md flex items-center justify-center font-bold text-lg text-white ${
                  isDarkMode ? 'border-gray-900 bg-gray-800' : 'border-white bg-indigo-500'
                }`}>
                  {photo ? (
                    <img src={photo} alt={fullName} className="w-full h-full object-cover" />
                  ) : isTeacher ? (
                    <TeacherIcon size={24} className="text-white" />
                  ) : (
                    <span>{fullName.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Punto de estado de presencia */}
                <div 
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 ${
                    isDarkMode ? 'border-gray-900' : 'border-white'
                  } ${
                    isOnline ? 'bg-emerald-500 animate-pulse' :
                    isAway ? 'bg-amber-400' :
                    isBusy ? 'bg-rose-500' : 'bg-gray-400'
                  }`}
                  title={
                    isOnline ? 'En línea' :
                    isAway ? 'Ausente' :
                    isBusy ? 'Ocupado' : 'Desconectado'
                  }
                />
              </div>

              {/* Botones de acción rápida */}
              <div className="flex items-center gap-1.5 pb-1">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); onOpenProfile(userId); }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-2xs cursor-pointer border ${
                      isDarkMode 
                        ? 'bg-gray-800 hover:bg-gray-750 text-blue-400 border-gray-700' 
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                    }`}
                    title="Ver perfil completo"
                  >
                    Perfil
                  </button>
                )}
                {!isMe && onOpenChat && (
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); onOpenChat(userId, fullName, isTeacher); }}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                    title="Enviar mensaje privado"
                  >
                    <MessageCircle size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Nombre y datos */}
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                <span className="truncate">{fullName}</span>
                {isTeacher && <CheckCircle2 size={13} className="text-amber-500 shrink-0" />}
              </h4>

              {groupName && (
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                  {groupName}
                </p>
              )}

              {email && role === 'teacher' && (
                <p className="text-[10px] text-gray-400 truncate font-mono">
                  {email}
                </p>
              )}

              {/* Estado de conexión */}
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' :
                  isAway ? 'bg-amber-400' :
                  isBusy ? 'bg-rose-500' : 'bg-gray-400'
                }`} />
                <span className={
                  isOnline ? 'text-emerald-600 dark:text-emerald-400' :
                  isAway ? 'text-amber-600 dark:text-amber-400' :
                  isBusy ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                }>
                  {isOnline ? 'Conectado ahora' :
                   isAway ? 'Ausente' :
                   isBusy ? 'Ocupado' :
                   (lastConn > 0 ? formatLastConnection(lastConn) : 'Desconectado')}
                </span>
              </div>
            </div>

            {/* Biografía o mensaje de estado si existe */}
            {bio && (
              <p className="mt-2 p-2 rounded-xl text-[11px] italic bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 leading-snug line-clamp-2 text-gray-600 dark:text-gray-300">
                "{bio}"
              </p>
            )}

            {/* Widget de Spotify si la persona tiene música activa */}
            {spotifyStatus && (
              <div className="mt-2.5">
                <SpotifyWidget spotifyStatus={spotifyStatus} compact={false} />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  );
};

export default ProfileHoverCard;

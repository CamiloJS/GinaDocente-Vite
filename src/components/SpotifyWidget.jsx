// src/components/SpotifyWidget.jsx
import React from 'react';
import { SpotifyIcon, ExternalLink } from './Icons.jsx';

export const SpotifyEqualizer = ({ isPlaying = true, className = '' }) => {
  return (
    <div className={`flex items-end gap-[2px] h-3.5 select-none ${className}`} title={isPlaying ? "Reproduciendo ahora" : "En pausa"}>
      <span className={`w-[3px] bg-[#1DB954] rounded-full transition-all ${isPlaying ? 'animate-[bounce_0.8s_infinite_ease-in-out_alternate] h-3' : 'h-1 opacity-50'}`} style={{ animationDelay: '0.1s' }} />
      <span className={`w-[3px] bg-[#1DB954] rounded-full transition-all ${isPlaying ? 'animate-[bounce_0.6s_infinite_ease-in-out_alternate] h-3.5' : 'h-1.5 opacity-50'}`} style={{ animationDelay: '0.3s' }} />
      <span className={`w-[3px] bg-[#1DB954] rounded-full transition-all ${isPlaying ? 'animate-[bounce_0.9s_infinite_ease-in-out_alternate] h-2.5' : 'h-1 opacity-50'}`} style={{ animationDelay: '0.2s' }} />
      <span className={`w-[3px] bg-[#1DB954] rounded-full transition-all ${isPlaying ? 'animate-[bounce_0.7s_infinite_ease-in-out_alternate] h-3' : 'h-2 opacity-50'}`} style={{ animationDelay: '0.4s' }} />
    </div>
  );
};

export const SpotifyWidget = ({
  spotifyStatus,
  compact = false,
  showEqualizer = true,
  onManage,
  isOwn = false,
  className = ''
}) => {
  if (!spotifyStatus || (!spotifyStatus.track && !spotifyStatus.isPlaying)) {
    return null;
  }

  const {
    track = 'Música',
    artist = 'Spotify',
    albumArt = '',
    trackUrl = '',
    isPlaying = true
  } = spotifyStatus;

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 p-1.5 px-2 rounded-xl border transition-all text-xs select-none ${
          isPlaying 
            ? 'bg-[#1DB954]/10 border-[#1DB954]/30 text-gray-800 dark:text-gray-100' 
            : 'bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
        } ${className}`}
        title={`Escuchando: ${track} - ${artist}`}
      >
        <div className="relative shrink-0 w-6 h-6 rounded-md overflow-hidden bg-black/80 flex items-center justify-center">
          {albumArt ? (
            <img src={albumArt} alt={track} className="w-full h-full object-cover" />
          ) : (
            <SpotifyIcon size={14} className="text-[#1DB954]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[11px] truncate leading-tight text-gray-900 dark:text-gray-100">{track}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">{artist}</p>
        </div>
        {showEqualizer && isPlaying && <SpotifyEqualizer isPlaying={isPlaying} className="shrink-0" />}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-2xl border transition-all relative overflow-hidden group shadow-2xs ${
      isPlaying 
        ? 'bg-gradient-to-r from-[#1DB954]/15 via-emerald-500/10 to-teal-500/5 dark:from-[#1DB954]/20 dark:via-emerald-950/30 dark:to-transparent border-[#1DB954]/30' 
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    } ${className}`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <SpotifyIcon size={16} className="text-[#1DB954] shrink-0" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1DB954]">
            {isPlaying ? 'Escuchando en Spotify' : 'Escuchó en Spotify'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isPlaying && <SpotifyEqualizer isPlaying={isPlaying} />}
          {isOwn && onManage && (
            <button
              type="button"
              onClick={onManage}
              className="text-[10px] font-bold text-gray-400 hover:text-[#1DB954] underline cursor-pointer"
            >
              Cambiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido de la canción */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden shadow-sm bg-black/80 flex items-center justify-center border border-white/20">
          {albumArt ? (
            <img src={albumArt} alt={track} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <SpotifyIcon size={20} className="text-[#1DB954]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate leading-snug">
            {track}
          </h5>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate leading-snug mt-0.5">
            {artist}
          </p>
        </div>

        {trackUrl && (
          <a
            href={trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl bg-[#1DB954] hover:bg-[#1aa34a] text-white shadow-xs transition-transform active:scale-95 shrink-0"
            title="Abrir en Spotify"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
};

export default SpotifyWidget;

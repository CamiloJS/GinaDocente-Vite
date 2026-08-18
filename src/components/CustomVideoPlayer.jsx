// src/components/CustomVideoPlayer.jsx
// Reproductor de video integrado con diseño limpio, estilo nativo (white-label) y controles modernos.

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 as Maximize, RotateCcw, Loader2 } from './Icons.jsx';

export const extractYouTubeId = (url) => {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return m ? m[1] : null;
};

export const isDirectVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.includes('blob:') || url.includes('firebasestorage.googleapis.com');
};

const CustomVideoPlayer = ({ src, url, videoId: propVideoId, title = "Video de la clase", isDarkMode = false, className = "" }) => {
  const videoSource = src || url;
  const ytId = propVideoId || extractYouTubeId(videoSource);
  const isDirectVideo = !ytId && isDirectVideoUrl(videoSource);

  // Estados para reproductor HTML5 nativo
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Formato de tiempo MM:SS
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      if (volume === 0) setVolume(0.5);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // --- MODO 1: YOUTUBE WHITE-LABEL EMBED ---
  if (ytId) {
    return (
      <div className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-lg border transition-all duration-300 ${
        isDarkMode ? 'bg-black border-gray-800' : 'bg-black border-gray-200'
      } ${className}`}>
        {/* Video Frame limpio sin encabezados ni marcos redundantes */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=1`}
            title={title || "Video"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // --- MODO 2: REPRODUCTOR HTML5 CON CONTROLES NATIVOS PERSONALIZADOS ---
  if (isDirectVideo || videoSource) {
    return (
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={`group relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl border bg-black select-none ${
          isDarkMode ? 'border-gray-800' : 'border-gray-300'
        } ${className}`}
      >
        {/* Elemento de video HTML5 */}
        <video
          ref={videoRef}
          src={videoSource}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="w-full aspect-video object-contain cursor-pointer"
          playsInline
        />

        {/* Spinner de carga */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
            <Loader2 size={36} className="text-white animate-spin" />
          </div>
        )}

        {/* Gran botón central de play al inicio o pausa */}
        {!isPlaying && !isLoading && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/20 hover:bg-[#AD3333] hover:scale-110 text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-2xl border border-white/30"
            title="Reproducir video"
          >
            <Play size={28} className="translate-x-0.5" fill="currentColor" />
          </button>
        )}

        {/* Barra inferior de controles personalizados */}
        <div className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Barra de progreso interactiva */}
          <div className="relative flex items-center w-full group/seek">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#AD3333] hover:h-2 transition-all"
            />
          </div>

          {/* Botones de control inferiores */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {/* Play / Pausa */}
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 text-white hover:text-[#ff8080] transition-colors"
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
              </button>

              {/* Reiniciar video */}
              <button
                type="button"
                onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; setCurrentTime(0); } }}
                className="p-1 text-white/80 hover:text-white transition-colors"
                title="Reiniciar"
              >
                <RotateCcw size={15} />
              </button>

              {/* Volumen y Mute */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 text-white hover:text-[#ff8080] transition-colors"
                  title={isMuted ? "Activar sonido" : "Silenciar"}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-14 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:accent-[#AD3333] transition-all"
                />
              </div>

              {/* Tiempo transcurrido / total */}
              <span className="text-[11px] font-mono text-white/80 ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Pantalla completa */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 text-white hover:text-[#ff8080] transition-colors"
              title="Pantalla completa"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomVideoPlayer;

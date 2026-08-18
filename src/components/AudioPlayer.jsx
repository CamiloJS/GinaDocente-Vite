// src/components/AudioPlayer.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Square, Trash2, X, Mic } from './Icons.jsx'
import { formatTime } from '../utils/helpers.js'

export const AudioPlayer = ({ 
  src, 
  title = "Nota de voz", 
  onDelete = null, 
  compact = false, 
  isDarkMode = false,
  isMe = false,
  className = "" 
}) => {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
      setIsLoaded(true)
    }

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && (duration === 0 || !isFinite(duration))) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handlePause = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`relative flex items-center gap-2.5 p-2 px-3 rounded-2xl border transition-all shadow-xs ${
      isMe
        ? (isDarkMode ? 'bg-blue-600/90 border-blue-500/50 text-white' : 'bg-blue-600 text-white border-blue-500/30')
        : (isDarkMode ? 'bg-gray-800/90 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800')
    } ${compact ? 'min-w-[200px] max-w-[260px] text-xs' : 'min-w-[240px] max-w-[320px] text-sm'} ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 ${
          isMe
            ? 'bg-white text-blue-600 hover:bg-gray-100'
            : 'bg-[#AD3333] hover:bg-[#8a2828] text-white'
        }`}
        title={isPlaying ? "Pausar" : "Reproducir"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Center Waveform & Progress */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className={`flex items-center justify-between gap-1 text-[10px] font-semibold ${isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="truncate">{title}</span>
          <span className="font-mono tabular-nums">
            {formatTime(Math.floor(currentTime))} / {duration > 0 ? formatTime(Math.floor(duration)) : '0:00'}
          </span>
        </div>

        <div className="relative flex items-center">
          {/* Animated waveform bars when playing */}
          <div className="w-full flex items-center gap-1 h-3 cursor-pointer relative">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Custom visual track with bars */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-[#AD3333] transition-all rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Animated Equalizer Indicator */}
      <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
        <span className={`w-0.5 rounded-full bg-[#AD3333] transition-all duration-300 ${isPlaying ? 'h-4 animate-pulse' : 'h-1.5 opacity-40'}`} />
        <span className={`w-0.5 rounded-full bg-[#AD3333] transition-all duration-200 ${isPlaying ? 'h-3 animate-pulse delay-75' : 'h-2.5 opacity-40'}`} />
        <span className={`w-0.5 rounded-full bg-[#AD3333] transition-all duration-300 ${isPlaying ? 'h-4 animate-pulse delay-150' : 'h-1.5 opacity-40'}`} />
      </div>

      {/* Delete callback button if provided */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
          title="Eliminar audio"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export const AudioRecordingVisualizer = ({
  recordingTime = 0,
  onStop,
  onCancel,
  isDarkMode = false
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 p-2.5 px-4 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 ${
      isDarkMode 
        ? 'bg-red-950/30 border-red-900/60 text-red-300' 
        : 'bg-red-50/90 border-red-200 text-red-800'
    } shadow-xs`}>
      {/* Pulsing indicator & timer */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
        <span className="text-xs font-bold font-mono tracking-wider tabular-nums text-red-600 dark:text-red-400">
          {formatTime(recordingTime)}
        </span>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline">
          Grabando nota de voz...
        </span>
      </div>

      {/* Animated jumping bars */}
      <div className="flex items-center gap-1 h-5">
        {[1, 2, 3, 4, 5, 6].map((bar) => (
          <span
            key={bar}
            className="w-1 bg-red-500 dark:bg-red-400 rounded-full animate-bounce"
            style={{
              height: `${Math.min(18, 6 + (bar % 3) * 6)}px`,
              animationDelay: `${bar * 120}ms`,
              animationDuration: '600ms'
            }}
          />
        ))}
      </div>

      {/* Actions: Stop and Cancel */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-all text-xs flex items-center gap-1"
          title="Cancelar grabación"
        >
          <Trash2 size={15} />
        </button>
        <button
          type="button"
          onClick={onStop}
          className="py-1 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
          title="Detener y guardar"
        >
          <Square size={12} className="fill-current" /> Guardar
        </button>
      </div>
    </div>
  )
}

export default AudioPlayer

// src/components/AudioQuestionEditor.jsx
// Editor de audio reutilizable: graba con el microfono o sube un archivo, con vista previa.
import React, { useRef, useState } from 'react'
import { Mic, Square, Trash2, Upload, Loader2 } from './Icons.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { uploadRawFileToStorage } from '../utils/helpers.js'

const AudioQuestionEditor = ({ audioUrl = '', onChange, isDarkMode = false, folder = 'eval_audios', showMessage = () => {} }) => {
  const grabadora = useVoiceRecorder(folder, showMessage)
  const fileRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)

  // cuando la grabacion termina y se sube, se asigna a la pregunta
  React.useEffect(() => {
    if (grabadora.audioUrl && grabadora.audioUrl !== audioUrl) onChange(grabadora.audioUrl)
  }, [grabadora.audioUrl])

  const subirArchivo = async (file) => {
    if (!file) return
    setSubiendo(true)
    try {
      const url = await uploadRawFileToStorage(file, folder)
      onChange(url)
      showMessage('Audio cargado.')
    } catch (e) {
      console.error('Error subiendo audio:', e)
      showMessage('No se pudo subir el audio. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSubiendo(false)
    }
  }

  const boton = 'text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40'
  const claro = isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

  if (audioUrl) {
    return (
      <div className={`p-2.5 rounded-xl border space-y-2 ${isDarkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <audio controls src={audioUrl} className="w-full h-9" />
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange('')} className={`${boton} ${claro}`}>
            <Trash2 size={12} /> Quitar audio
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`${boton} ${claro}`} disabled={subiendo}>
            {subiendo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Cambiar
          </button>
        </div>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { subirArchivo(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    )
  }

  return (
    <div className={`p-2.5 rounded-xl border border-dashed space-y-2 ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
      {grabadora.isRecording ? (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Grabando... {grabadora.recordingTime}s</span>
          <button type="button" onClick={() => grabadora.stopRecording()} className={`${boton} bg-green-600 text-white hover:bg-green-700`}>
            <Square size={12} /> Detener y guardar
          </button>
          <button type="button" onClick={() => grabadora.cancelRecording()} className={`${boton} ${claro}`}>Cancelar</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { grabadora.setAudioUrl?.(''); grabadora.startRecording(); }}
            className={`${boton} bg-red-600 text-white hover:bg-red-700`}
            disabled={grabadora.isUploading || subiendo}
          >
            <Mic size={12} /> Grabar audio
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`${boton} ${claro}`} disabled={grabadora.isUploading || subiendo}>
            {grabadora.isUploading || subiendo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Subir archivo
          </button>
          <span className="text-[10px] text-gray-500 font-medium">MP3, WAV, M4A o graba desde tu microfono</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { subirArchivo(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  )
}

export default AudioQuestionEditor

// src/utils/useVoiceRecorder.js
import React from 'react'
import { uploadRawFileToStorage } from './helpers.js'

export const useVoiceRecorder = (folderName = 'audio', showMessage = () => {}) => {
  const [isRecording, setIsRecording] = React.useState(false)
  const [audioUrl, setAudioUrl] = React.useState('')
  const [isUploading, setIsUploading] = React.useState(false)
  const [recordingTime, setRecordingTime] = React.useState(0)
  const recorderRef = React.useRef(null)
  const streamRef = React.useRef(null)

  const cleanupStream = () => {
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      streamRef.current = null;
    }
    recorderRef.current = null;
  };

  const startRecording = async () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      let options = {}
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' }
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' }
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' }
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      recorderRef.current = mediaRecorder
      const chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        cleanupStream();
        setIsRecording(false)
        if (chunks.length === 0) return

        setIsUploading(true)
        try {
          const mimeType = mediaRecorder.mimeType || 'audio/webm'
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
          const blob = new Blob(chunks, { type: mimeType })
          const file = new File([blob], `nota-${Date.now()}.${ext}`, { type: mimeType })
          const url = await uploadRawFileToStorage(file, folderName)
          setAudioUrl(url)
          showMessage('✅ Nota de voz lista para enviar')
        } catch (err) {
          console.error(err)
          showMessage('Hubo un error al subir el audio.')
        }
        setIsUploading(false)
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      showMessage('🎙️ Grabando nota de voz...')
    } catch (err) {
      console.error(err)
      showMessage('No se pudo acceder al micrófono. Permite el acceso.')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch (e) {}
    }
  }

  const cancelRecording = () => {
    setAudioUrl('')
    setIsRecording(false)
    setIsUploading(false)
    setRecordingTime(0)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      } catch (e) {}
    }
    cleanupStream();
  }

  React.useEffect(() => {
    let interval = null
    if (isRecording) {
      setRecordingTime(0)
      interval = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  // Cleanup al desmontar: liberar micrófono y cancelar grabs activos
  React.useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.onstop = null; recorderRef.current.stop(); } catch (e) {}
      }
      cleanupStream();
    };
  }, []);

  return {
    isRecording,
    audioUrl,
    isUploading,
    recordingTime,
    setAudioUrl,
    startRecording,
    stopRecording,
    cancelRecording
  }
}

export default useVoiceRecorder

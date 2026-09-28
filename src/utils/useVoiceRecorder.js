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
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.onstop = null; recorderRef.current.stop(); } catch (e) {}
      }
      cleanupStream()
    }
  }, [])

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
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
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

      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (eOpt) {
        mediaRecorder = new MediaRecorder(stream);
      }
      recorderRef.current = mediaRecorder
      const chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        cleanupStream();
        if (isMountedRef.current) setIsRecording(false)
        const totalBytes = chunks.reduce((acc, c) => acc + (c.size || 0), 0);
        if (chunks.length === 0 || totalBytes < 400) {
          showMessage('Grabación demasiado corta');
          return;
        }

        if (isMountedRef.current) setIsUploading(true)
        try {
          const mimeType = mediaRecorder.mimeType || 'audio/webm'
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
          const blob = new Blob(chunks, { type: mimeType })
          let file;
          try {
            file = new File([blob], `nota-${Date.now()}.${ext}`, { type: mimeType });
          } catch (eFile) {
            file = blob;
            file.name = `nota-${Date.now()}.${ext}`;
          }
          const url = await uploadRawFileToStorage(file, folderName)
          if (isMountedRef.current) {
            setAudioUrl(url)
            showMessage('Audio listo para enviar')
          }
        } catch (err) {
          console.error(err)
          if (isMountedRef.current) showMessage('Hubo un error al subir el audio.')
        } finally {
          if (isMountedRef.current) setIsUploading(false)
        }
      }

      mediaRecorder.start(250)
      if (isMountedRef.current) setIsRecording(true)
      showMessage('Grabando audio...')
    } catch (err) {
      console.error(err)
      showMessage('No se pudo acceder al micrófono. Permite el acceso.')
      if (isMountedRef.current) setIsRecording(false)
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

// src/utils/useVoiceRecorder.js
import React from 'react'
import { uploadRawFileToStorage } from './helpers.js'

export const useVoiceRecorder = (folderName, showMessage) => {
  const [isRecording, setIsRecording] = React.useState(false)
  const [audioUrl, setAudioUrl] = React.useState('')
  const [isUploading, setIsUploading] = React.useState(false)
  const recorderRef = React.useRef(null)
  const streamRef = React.useRef(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      recorderRef.current = mediaRecorder
      const chunks = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        setIsUploading(true)
        try {
          const file = new File([blob], `nota-${Date.now()}.webm`, { type: 'audio/webm' })
          const url = await uploadRawFileToStorage(file, folderName)
          setAudioUrl(url)
          showMessage('✅ Nota lista')
        } catch (err) {
          showMessage('Hubo un error al subir el audio.')
        }
        setIsUploading(false)
      }
      mediaRecorder.start()
      setIsRecording(true)
      showMessage('🎙️ Grabando...')
    } catch (err) {
      showMessage('No se pudo acceder al micrófono.')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
  }

  const cancelRecording = () => {
    setAudioUrl('')
    setIsRecording(false)
    setIsUploading(false)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      } catch (e) {}
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop())
      } catch (e) {}
      streamRef.current = null
    }
    recorderRef.current = null
  }

  const [recordingTime, setRecordingTime] = React.useState(0)

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

  return { isRecording, audioUrl, isUploading, recordingTime, setAudioUrl, startRecording, stopRecording, cancelRecording }
}

export default useVoiceRecorder

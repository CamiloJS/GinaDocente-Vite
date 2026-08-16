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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
  }

  return { isRecording, audioUrl, isUploading, setAudioUrl, startRecording, stopRecording, cancelRecording }
}

export default useVoiceRecorder

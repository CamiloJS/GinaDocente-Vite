// src/components/AudioCall.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { rtdb, auth } from '../firebase/config.js'
import { ref, set, onValue, remove, push } from 'firebase/database'

// Iconos inline para evitar conflictos de importación
const PhoneIcon = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
const PhoneOffIcon = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 3v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
const MicIcon = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
const MicOffIcon = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
const UsersIcon = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
}

const AudioCall = ({ activeChat, myChatId, isDarkMode, showMessage, userMappings, onClose }) => {
  const [callState, setCallState] = useState('idle') // idle, calling, ringing, connected
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callError, setCallError] = useState(null)
  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const remoteAudio = useRef(null)
  const callTimer = useRef(null)
  const callId = useRef(null)

  const callerName = myChatId === 'teacher' ? 'Prof. Gina' : (userMappings?.[myChatId]?.fullName || myChatId)
  const calleeName = activeChat?.name || 'Usuario'

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall()
    }
  }, [])

  // Timer for call duration
  useEffect(() => {
    if (callState === 'connected') {
      callTimer.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (callTimer.current) clearInterval(callTimer.current)
      setCallDuration(0)
    }
    return () => { if (callTimer.current) clearInterval(callTimer.current) }
  }, [callState])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const getCallPath = useCallback(() => {
    if (!activeChat) return null
    const chatId = activeChat.id || `dm_${[myChatId, activeChat.id].sort().join('_')}`
    return `calls/${chatId}`
  }, [activeChat, myChatId])

  // Create peer connection
  const createPeerConnection = useCallback(async (isInitiator) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnection.current = pc

      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStream.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteAudio.current) {
          remoteAudio.current.srcObject = event.streams[0]
        }
      }

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callId.current) {
          const candidatePath = `${getCallPath()}/${callId.current}/candidates`
          push(ref(rtdb, candidatePath), event.candidate.toJSON())
        }
      }

      // Connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected')
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          endCall()
        }
      }

      return pc
    } catch (err) {
      console.error('Error creating peer connection:', err)
      setCallError('No se pudo acceder al micrófono')
      return null
    }
  }, [getCallPath])

  // Start a call
  const startCall = async () => {
    if (!activeChat) return
    setCallState('calling')
    setCallError(null)

    const path = getCallPath()
    callId.current = push(ref(rtdb, path)).key

    try {
      const pc = await createPeerConnection(true)
      if (!pc) { setCallState('idle'); return }

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Save offer to Firebase
      await set(ref(rtdb, `${path}/${callId.current}`), {
        caller: myChatId,
        callerName: callerName,
        callee: activeChat.id,
        calleeName: calleeName,
        offer: pc.localDescription.toJSON(),
        status: 'ringing',
        startedAt: Date.now(),
        type: activeChat.type || 'dm'
      })

      // Listen for answer
      const answerRef = ref(rtdb, `${path}/${callId.current}/answer`)
      onValue(answerRef, async (snapshot) => {
        const data = snapshot.val()
        if (data && peerConnection.current) {
          try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data))
            setCallState('connected')
          } catch (err) {
            console.error('Error setting answer:', err)
            endCall()
          }
        }
      })

      // Listen for call ended
      const statusRef = ref(rtdb, `${path}/${callId.current}/status`)
      onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'ended') {
          endCall()
        }
      })

      // Listen for ICE candidates from callee
      const candRef = ref(rtdb, `${path}/${callId.current}/calleeCandidates`)
      onValue(candRef, async (snapshot) => {
        const data = snapshot.val()
        if (data && peerConnection.current) {
          Object.values(data).forEach(async (candidate) => {
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {}
          })
        }
      })

    } catch (err) {
      console.error('Error starting call:', err)
      setCallError('Error al iniciar la llamada')
      setCallState('idle')
    }
  }

  // Answer an incoming call
  const answerCall = async (callData) => {
    setCallState('connected')
    setCallError(null)
    callId.current = callData.id

    try {
      const pc = await createPeerConnection(false)
      if (!pc) { setCallState('idle'); return }

      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Save answer to Firebase
      const path = getCallPath()
      await set(ref(rtdb, `${path}/${callData.id}/answer`), pc.localDescription.toJSON())
      await set(ref(rtdb, `${path}/${callData.id}/status`), 'connected')

      // Listen for ICE candidates from caller
      const candRef = ref(rtdb, `${path}/${callData.id}/candidates`)
      onValue(candRef, async (snapshot) => {
        const data = snapshot.val()
        if (data && peerConnection.current) {
          Object.values(data).forEach(async (candidate) => {
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {}
          })
        }
      })

      // Listen for call ended
      const statusRef = ref(rtdb, `${path}/${callData.id}/status`)
      onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'ended') {
          endCall()
        }
      })

    } catch (err) {
      console.error('Error answering call:', err)
      setCallError('Error al contestar la llamada')
      setCallState('idle')
    }
  }

  // End call
  const endCall = async () => {
    try {
      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop())
        localStream.current = null
      }
      if (callId.current && getCallPath()) {
        await set(ref(rtdb, `${getCallPath()}/${callId.current}/status`), 'ended')
        await remove(ref(rtdb, `${getCallPath()}/${callId.current}`))
      }
    } catch (e) {}
    setCallState('idle')
    setIsMuted(false)
    callId.current = null
    if (callTimer.current) clearInterval(callTimer.current)
    onClose?.()
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  if (callState === 'idle') return null

  return (
    <>
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudio} autoPlay playsInline />

      {/* Call overlay */}
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
        <div className={`w-full max-w-sm rounded-3xl p-8 text-center space-y-6 ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
          {/* Avatar */}
          <div className="relative mx-auto w-20 h-20">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ${callState === 'connected' ? 'bg-green-500 animate-pulse' : callState === 'calling' ? 'bg-blue-500 animate-pulse' : 'bg-orange-500'}`}>
              {callState === 'connected' ? <Phone size={28} /> : callState === 'calling' ? <Phone size={28} className="animate-bounce" /> : <Users size={28} />}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {callState === 'calling' ? `Llamando a ${calleeName}...` :
               callState === 'ringing' ? `${callerName} te está llamando...` :
               `En llamada con ${calleeName}`}
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {callState === 'connected' ? formatDuration(callDuration) :
               callState === 'calling' ? 'Esperando respuesta...' :
               'Llamada entrante'}
            </p>
          </div>

          {/* Error message */}
          {callError && (
            <p className="text-red-500 text-sm font-medium">{callError}</p>
          )}

          {/* Call controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Mute button (only when connected) */}
            {callState === 'connected' && (
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all shadow-lg ${isMuted ? 'bg-red-500 text-white' : (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
                title={isMuted ? 'Activar micrófono' : 'Silenciar'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}

            {/* End call button */}
            <button
              onClick={endCall}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
              title="Finalizar llamada"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AudioCall

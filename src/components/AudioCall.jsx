// src/components/AudioCall.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { db, appId } from '../firebase/config.js'
import { doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { playHangupSound, playConnectedSound, connectRemoteAudio } from '../utils/callSounds.js'

// Iconos inline (evitan conflictos de import)
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
    { urls: 'stun:stun3.l.google.com:19302' },
  ]
}

const callsBase = (callId) => ['artifacts', appId, 'public', 'data', 'calls', callId]

// activeCall: { callId, role: 'initiator'|'participant', isGroup, name, targetId?, groupId?, participants?, offer? }
const AudioCall = ({ activeCall, myChatId, myName, isDarkMode, userMappings, onClose }) => {
  const [callState, setCallState] = useState('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callError, setCallError] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState(0)

  const peersRef = useRef(new Map())     // initiator: Map<pid, RTCPeerConnection>
  const peerRef = useRef(null)           // participant: único PC hacia el initiator
  const localStreamRef = useRef(null)
  const remoteCleanupsRef = useRef([])
  const callTimerRef = useRef(null)
  const callDocRef = useRef(null)
  const unsubsRef = useRef([])
  const offerProcessedRef = useRef(false)

  const isInitiator = activeCall?.role === 'initiator'
  const isGroup = !!activeCall?.isGroup
  const otherName = activeCall?.name || 'Usuario'
  const callId = activeCall?.callId

  const addUnsub = (fn) => unsubsRef.current.push(fn)

  // ---------- Utilidades ----------
  const getStream = async () => {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStreamRef.current = stream
    return stream
  }

  const saveCandidates = async (pathParts, pc) => {
    const existing = pc._ice || []
    const listRef = doc(db, ...pathParts)
    await setDoc(listRef, { candidates: existing }).catch(() => {})
  }

  const createPC = async () => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    const stream = await getStream()
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    return pc
  }

  const attachRemoteStream = (pc, key) => {
    pc.ontrack = (event) => {
      try {
        const audioEl = document.getElementById(`remote-audio-${key}`)
        if (audioEl && event.streams[0]) {
          const cleanups = connectRemoteAudio(audioEl, event.streams[0])
          remoteCleanupsRef.current.push(...cleanups)
        }
      } catch (e) {}
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected')
        setConnectedPeers(prev => prev + 1)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setConnectedPeers(prev => Math.max(0, prev - 1))
        if (!isGroup && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
          endCall()
        }
      }
    }
  }

  // ---------- INICIADOR: llamada DM ----------
  const startDMCall = async () => {
    setCallState('calling')
    setCallError(null)
    const callRef = doc(db, ...callsBase(callId))
    callDocRef.current = callRef
    try {
      const pc = await createPC()
      peerRef.current = pc
      attachRemoteStream(pc, 'main')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const list = pc._ice || []
          list.push(e.candidate.toJSON())
          pc._ice = list
          saveCandidates([...callsBase(callId), 'callerCandidates', 'list'], pc)
        }
      }

      await setDoc(callRef, {
        type: 'dm',
        initiator: myChatId,
        initiatorName: myName,
        callee: activeCall.targetId,
        calleeName: otherName,
        offer: pc.localDescription.toJSON(),
        status: 'ringing',
        startedAt: Date.now()
      })

      addUnsub(onSnapshot(callRef, (snap) => {
        const data = snap.data()
        if (!data) return
        if (data.answer && pc && pc.signalingState !== 'stable' && pc.remoteDescription === null) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(err => { console.error(err); endCall() })
        }
        if (data.status === 'ended') endCall()
      }))

      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'calleeCandidates', 'list'), (snap) => {
        const data = snap.data()
        if (data?.candidates && pc) {
          data.candidates.forEach(async (c) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (e) {}
          })
        }
      }))
    } catch (err) {
      console.error('Error starting DM call:', err)
      setCallError('No se pudo iniciar la llamada')
      setCallState('idle')
    }
  }

  // ---------- INICIADOR: llamada grupal (hub-spoke) ----------
  const startGroupCall = async () => {
    setCallState('calling')
    setCallError(null)
    const callRef = doc(db, ...callsBase(callId))
    callDocRef.current = callRef
    try {
      const participants = (activeCall.participants || []).map(p => ({ id: p.id, name: p.name, joined: false }))
      await setDoc(callRef, {
        type: 'group',
        initiator: myChatId,
        initiatorName: myName,
        groupId: activeCall.groupId,
        participants,
        status: 'ringing',
        startedAt: Date.now()
      })

      for (const p of participants) {
        const pc = await createPC()
        peersRef.current.set(p.id, pc)
        attachRemoteStream(pc, p.id)

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            const list = pc._ice || []
            list.push(e.candidate.toJSON())
            pc._ice = list
            saveCandidates([...callsBase(callId), 'initiatorIce', p.id, 'list'], pc)
          }
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await setDoc(doc(db, ...callsBase(callId), 'offers', p.id), { offer: pc.localDescription.toJSON() })

        addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'answers', p.id), (snap) => {
          const data = snap.data()
          if (data?.answer && pc && pc.remoteDescription === null) {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(err => console.error(err))
          }
        }))

        addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'participantIce', p.id, 'list'), (snap) => {
          const data = snap.data()
          if (data?.candidates && pc) {
            data.candidates.forEach(async (c) => {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (e) {}
            })
          }
        }))
      }

      addUnsub(onSnapshot(callRef, (snap) => {
        const data = snap.data()
        if (data?.status === 'ended') endCall()
      }))
    } catch (err) {
      console.error('Error starting group call:', err)
      setCallError('No se pudo iniciar la llamada grupal')
      setCallState('idle')
    }
  }

  // ---------- PARTICIPANTE: unirse a llamada grupal ----------
  const joinGroupCall = async () => {
    setCallState('joining')
    setCallError(null)
    const callRef = doc(db, ...callsBase(callId))
    callDocRef.current = callRef
    try {
      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'offers', myChatId), async (snap) => {
        const data = snap.data()
        if (!data?.offer || offerProcessedRef.current) return
        offerProcessedRef.current = true
        try {
          const pc = await createPC()
          peerRef.current = pc
          attachRemoteStream(pc, 'main')
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              const list = pc._ice || []
              list.push(e.candidate.toJSON())
              pc._ice = list
              saveCandidates([...callsBase(callId), 'participantIce', myChatId, 'list'], pc)
            }
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await setDoc(doc(db, ...callsBase(callId), 'answers', myChatId), { answer: pc.localDescription.toJSON() })
          const idx = (activeCall.participants || []).findIndex(p => p.id === myChatId)
          if (idx >= 0) {
            await updateDoc(callRef, { [`participants.${idx}.joined`]: true }).catch(() => {})
          }
          setCallState('connected')
        } catch (err) {
          console.error('Error joining group call:', err)
          setCallError('Error al unirse a la llamada')
        }
      }))

      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'initiatorIce', myChatId, 'list'), (snap) => {
        const data = snap.data()
        if (data?.candidates && peerRef.current) {
          data.candidates.forEach(async (c) => {
            try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)) } catch (e) {}
          })
        }
      }))

      addUnsub(onSnapshot(callRef, (snap) => {
        const data = snap.data()
        if (data?.status === 'ended') endCall()
      }))
    } catch (err) {
      console.error('Error in join group call:', err)
      setCallError('Error al unirse a la llamada')
    }
  }

  // ---------- PARTICIPANTE: contestar llamada DM ----------
  const answerDMCall = async () => {
    setCallState('connected')
    setCallError(null)
    const callRef = doc(db, ...callsBase(callId))
    callDocRef.current = callRef
    try {
      const pc = await createPC()
      peerRef.current = pc
      attachRemoteStream(pc, 'main')
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const list = pc._ice || []
          list.push(e.candidate.toJSON())
          pc._ice = list
          saveCandidates([...callsBase(callId), 'calleeCandidates', 'list'], pc)
        }
      }
      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await setDoc(callRef, { answer: pc.localDescription.toJSON(), status: 'connected' }, { merge: true })

      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'callerCandidates', 'list'), (snap) => {
        const data = snap.data()
        if (data?.candidates && pc) {
          data.candidates.forEach(async (c) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (e) {}
          })
        }
      }))

      addUnsub(onSnapshot(callRef, (snap) => {
        if (snap.data()?.status === 'ended') endCall()
      }))
    } catch (err) {
      console.error('Error answering DM call:', err)
      setCallError('Error al contestar la llamada')
      setCallState('idle')
    }
  }

  // ---------- Ciclo de vida ----------
  useEffect(() => {
    if (!activeCall || !callId) return
    if (isInitiator) {
      if (isGroup) startGroupCall()
      else startDMCall()
    } else {
      if (isGroup) joinGroupCall()
      else if (activeCall.offer) answerDMCall()
    }
    return () => {
      endCall()
    }
  }, [activeCall?.callId])

  // Timer duración
  useEffect(() => {
    if (callState === 'connected') {
      playConnectedSound()
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000)
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      setCallDuration(0)
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [callState])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const endCall = async () => {
    playHangupSound()
    try {
      unsubsRef.current.forEach(fn => { try { fn() } catch (e) {} })
      unsubsRef.current = []
      peersRef.current.forEach(pc => { try { pc.close() } catch (e) {} })
      peersRef.current = new Map()
      if (peerRef.current) { try { peerRef.current.close() } catch (e) {} peerRef.current = null }
      remoteCleanupsRef.current.forEach(fn => { try { fn() } catch (e) {} })
      remoteCleanupsRef.current = []
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
        localStreamRef.current = null
      }
      if (callDocRef.current) {
        await setDoc(callDocRef.current, { status: 'ended' }, { merge: true }).catch(() => {})
        await deleteDoc(callDocRef.current).catch(() => {})
      }
    } catch (e) {}
    setCallState('idle')
    setIsMuted(false)
    callDocRef.current = null
    offerProcessedRef.current = false
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    onClose?.()
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(!isMuted)
    }
  }

  if (callState === 'idle') return null

  const displayName = isInitiator ? otherName : (activeCall.callerName || otherName)

  return (
    <>
      {/* Elementos de audio remoto */}
      {!isGroup && <audio id="remote-audio-main" autoPlay playsInline />}
      {isGroup && isInitiator && (activeCall.participants || []).map(p => (
        <audio key={p.id} id={`remote-audio-${p.id}`} autoPlay playsInline />
      ))}

      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className={`w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center space-y-5 sm:space-y-6 ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
          {/* Avatar */}
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
            <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg ${
              callState === 'connected' ? 'bg-green-500 animate-pulse' :
              callState === 'calling' || callState === 'joining' ? 'bg-blue-500 animate-pulse' :
              'bg-orange-500 animate-pulse'
            }`}>
              {isGroup ? <UsersIcon size={32} /> : <PhoneIcon size={32} className="animate-bounce" />}
            </div>
          </div>

          {/* Info */}
          <div>
            <h3 className={`text-lg sm:text-xl font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {callState === 'calling' || callState === 'joining'
                ? (isGroup ? `Llamando a ${displayName}...` : `Llamando a ${displayName}...`)
                : callState === 'connected'
                  ? `En llamada con ${displayName}`
                  : `${displayName} te está llamando...`}
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {callState === 'connected'
                ? (isGroup ? `${connectedPeers} en la llamada • ${formatDuration(callDuration)}` : formatDuration(callDuration))
                : callState === 'calling' ? 'Esperando respuesta...'
                : callState === 'joining' ? 'Uniéndose a la llamada...'
                : 'Llamada entrante'}
            </p>
            {isGroup && callState === 'connected' && (
              <p className={`text-[11px] mt-1 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {connectedPeers} de {(activeCall.participants || []).length} participantes
              </p>
            )}
          </div>

          {callError && <p className="text-red-500 text-sm font-medium">{callError}</p>}

          {/* Controles */}
          <div className="flex items-center justify-center gap-4">
            {callState === 'connected' && (
              <button
                onClick={toggleMute}
                className={`p-4 sm:p-5 rounded-full transition-all shadow-lg active:scale-95 ${isMuted ? 'bg-red-500 text-white' : (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
                title={isMuted ? 'Activar micrófono' : 'Silenciar'}
                style={{ minWidth: 56, minHeight: 56 }}
              >
                {isMuted ? <MicOffIcon size={26} /> : <MicIcon size={26} />}
              </button>
            )}
            <button
              onClick={endCall}
              className="p-4 sm:p-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg active:scale-95"
              title="Finalizar llamada"
              style={{ minWidth: 56, minHeight: 56 }}
            >
              <PhoneOffIcon size={26} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AudioCall

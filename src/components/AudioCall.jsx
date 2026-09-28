// src/components/AudioCall.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { db, appId } from '../firebase/config.js'
import { doc, setDoc, onSnapshot, deleteDoc, updateDoc, getDoc, collection } from 'firebase/firestore'
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
const normalizeParticipants = (raw) => {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const numericKeys = Object.keys(raw).filter(k => !isNaN(parseInt(k))).sort((a,b) => parseInt(a)-parseInt(b))
    if (numericKeys.length) return numericKeys.map(k => raw[k])
    return Object.values(raw)
  }
  return []
}

// activeCall: { callId, role: 'initiator'|'participant', isGroup, name, targetId?, groupId?, participants?, offer? }
const AudioCall = ({ activeCall, myChatId, myName, isDarkMode, userMappings, onClose }) => {
  const [callState, setCallState] = useState('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callError, setCallError] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState(0)
  const [speakingMap, setSpeakingMap] = useState({}) // { peerId: boolean }
  const [liveParticipants, setLiveParticipants] = useState(null) // Firestore live participants for group
  const [groupCallStatus, setGroupCallStatus] = useState('ringing')

  const peersRef = useRef(new Map())     // initiator/mesh: Map<pid, RTCPeerConnection>
  const peerRef = useRef(null)           // participant: único PC hacia el initiator en DM
  const startingPeersRef = useRef(new Set()) // Set<pid> para evitar negociaciones simultáneas duplicadas
  const localStreamRef = useRef(null)
  const remoteCleanupsRef = useRef([])
  const callTimerRef = useRef(null)
  const callDocRef = useRef(null)
  const unsubsRef = useRef([])
  const offerProcessedRef = useRef(false)
  const analysersRef = useRef(new Map()) // peerId -> { ctx, analyser, raf }
  const isMutedRef = useRef(isMuted)
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  const callStateRef = useRef(callState)
  useEffect(() => { callStateRef.current = callState }, [callState])
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])
  // Buffer de candidatos ICE: los candidatos pueden llegar ANTES de que exista el
  // peer o de que se haya seteado la descripción remota. Si se descartan, la
  // conexión WebRTC nunca se establece y no hay audio (aunque la UI diga conectado).
  const pendingCandidatesRef = useRef(new Map()) // pc -> [candidates]
  const pendingInitiatorIceRef = useRef([])      // participante grupal: ICE del iniciador antes de crear pc

  const addIceCandidateSafe = (pc, candidate) => {
    if (!pc || pc.signalingState === 'closed') return
    try {
      if (pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        const list = pendingCandidatesRef.current.get(pc) || []
        list.push(candidate)
        pendingCandidatesRef.current.set(pc, list)
      }
    } catch (e) {}
  }

  const flushPendingCandidates = (pc) => {
    if (!pc) return
    const list = pendingCandidatesRef.current.get(pc) || []
    pendingCandidatesRef.current.delete(pc)
    list.forEach(c => {
      if (pc.signalingState !== 'closed') {
        try { pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}) } catch (e) {}
      }
    })
  }

  const isInitiator = activeCall?.role === 'initiator'
  const isGroup = !!activeCall?.isGroup
  const otherName = activeCall?.name || 'Usuario'
  const callId = activeCall?.callId

  const addUnsub = (fn) => unsubsRef.current.push(fn)

  // ---------- Utilidades de Audio y Micrófono con Cancelación de Ruido ----------
  const getStream = async () => {
    if (localStreamRef.current) return localStreamRef.current
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("El micrófono no está disponible en este navegador o requiere conexión segura (HTTPS).")
    }
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googAudioMirroring: false
      },
      video: false
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (eOverconstrained) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    }
    localStreamRef.current = stream
    return stream
  }

  // Map<pathKey, {timer, candidates[]}> — acumula candidatos y escribe en batch debounced.
  // Esto ELIMINA el race condition donde dos onicecandidate simultáneos se pisaban en Firestore.
  const iceBatchRef = useRef(new Map()) // pathKey → { timer, candidates, pathParts }

  const pushIceCandidate = (pathParts, candidate) => {
    const pathKey = pathParts.join('/')
    const batch = iceBatchRef.current.get(pathKey) || { timer: null, candidates: [], pathParts }
    batch.candidates.push(candidate)
    if (batch.timer) clearTimeout(batch.timer)
    batch.timer = setTimeout(async () => {
      const toWrite = batch.candidates.slice()
      try {
        await setDoc(doc(db, ...pathParts), { candidates: toWrite }).catch(() => {})
      } catch (e) {}
    }, 80) // 80ms debounce: agrupa candidatos que llegan juntos
    iceBatchRef.current.set(pathKey, batch)
  }

  // Batch para candidatos ICE en el canal Full-Mesh de llamadas grupales
  const meshIceBatchRef = useRef(new Map()) // key -> { timer, candidates }

  const pushMeshIceCandidate = (cId, pairKey, fieldName, candidate) => {
    const key = `${cId}_${pairKey}_${fieldName}`
    const batch = meshIceBatchRef.current.get(key) || { timer: null, candidates: [] }
    batch.candidates.push(candidate)
    if (batch.timer) clearTimeout(batch.timer)
    batch.timer = setTimeout(async () => {
      const toWrite = batch.candidates.slice()
      try {
        const docRef = doc(db, ...callsBase(cId), 'mesh', pairKey)
        await setDoc(docRef, { [fieldName]: toWrite, updatedAt: Date.now() }, { merge: true }).catch(() => {})
      } catch (e) {}
    }, 60)
    meshIceBatchRef.current.set(key, batch)
  }

  // saveCandidates sigue disponible SOLO para el flujo DM (no grupal) — NO tocar.
  const saveCandidates = async (pathParts, pc) => {
    const existing = pc._ice || []
    const listRef = doc(db, ...pathParts)
    await setDoc(listRef, { candidates: existing }).catch(() => {})
  }

  const updateSpeakingStatus = useCallback(async (isSpeaking) => {
    if (!isGroup || !callId || !myChatId) return
    try {
      await setDoc(doc(db, ...callsBase(callId), 'speaking', myChatId), { isSpeaking, updatedAt: Date.now() }, { merge: true })
    } catch (e) {}
  }, [isGroup, callId, myChatId])

  // Diagnóstico en Firestore para rastrear dónde se rompe el flujo de audio
  const logDiag = (event, detail) => {
    try {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      setDoc(doc(db, ...callsBase(callId), 'diag', id), {
        by: myChatId,
        role: isInitiator ? 'initiator' : 'participant',
        event,
        detail: detail || '',
        t: Date.now()
      }).catch(() => {})
    } catch (e) {}
  }

  // ---- Detección de voz tipo Discord ----
  const monitorStream = useCallback((stream, peerId) => {
    try {
      if (!stream || !stream.getAudioTracks().length) return
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let rafId = null
      let speaking = false
      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = data.length > 0 ? (sum / data.length) : 0
        // isMuted solo afecta al local
        const muted = peerId === myChatId && isMutedRef.current
        const nowSpeaking = !muted && avg > 18
        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking
          setSpeakingMap(prev => {
            const next = { ...prev, [peerId]: nowSpeaking }
            if (!nowSpeaking) delete next[peerId]
            return next
          })
          if (peerId === myChatId) updateSpeakingStatus(nowSpeaking)
        }
        rafId = requestAnimationFrame(tick)
      }
      tick()
      analysersRef.current.set(peerId, { ctx, analyser, rafId, src })
      remoteCleanupsRef.current.push(() => {
        try { cancelAnimationFrame(rafId); src.disconnect(); analyser.disconnect(); ctx.close() } catch(e) {}
        analysersRef.current.delete(peerId)
      })
    } catch (e) {}
  }, [myChatId, updateSpeakingStatus])

  // Sincronizar speakingMap grupal vía Firestore para que todos vean quién habla
  useEffect(() => {
    if (!isGroup || !callId) return
    const speakingCol = collection(db, ...callsBase(callId), 'speaking')
    const unsub = onSnapshot(speakingCol, (snap) => {
      const remoteSpeaking = {}
      snap.docs.forEach(d => {
        const data = d.data()
        if (data.isSpeaking && d.id !== myChatId) {
          remoteSpeaking[d.id] = true
        }
      })
      setSpeakingMap(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          if (k !== myChatId && k !== 'main' && !remoteSpeaking[k]) {
            delete next[k]
          }
        })
        Object.keys(remoteSpeaking).forEach(k => {
          next[k] = true
        })
        return next
      })
    })
    return () => unsub()
  }, [isGroup, callId, myChatId])

  const stopMonitor = useCallback((peerId) => {
    const entry = analysersRef.current.get(peerId)
    if (entry) {
      try { cancelAnimationFrame(entry.rafId); entry.src.disconnect(); entry.analyser.disconnect(); entry.ctx.close() } catch(e) {}
      analysersRef.current.delete(peerId)
    }
    setSpeakingMap(prev => { const n = { ...prev }; delete n[peerId]; return n })
  }, [])

  const createPC = async () => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    try {
      const stream = await getStream()
      logDiag('mic_obtained', 'tracks=' + stream.getTracks().length)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      monitorStream(stream, myChatId)
    } catch (e) {
      logDiag('mic_err', String(e && e.message ? e.message : e))
      throw e
    }
    return pc
  }

  const attachRemoteStream = (pc, key) => {
    pc.ontrack = (event) => {
      try {
        if (!event.track) return
        logDiag('ontrack_fired', 'key=' + key + ' kind=' + event.track.kind)
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track])

        let audioEl = document.getElementById(`remote-audio-${key}`)
        if (!audioEl) {
          audioEl = document.getElementById('remote-audio-main')
        }
        if (!audioEl) {
          audioEl = document.createElement('audio')
          audioEl.id = `remote-audio-${key}`
          audioEl.autoplay = true
          audioEl.playsInline = true
          document.body.appendChild(audioEl)
          remoteCleanupsRef.current.push(() => {
            try { audioEl.pause(); audioEl.srcObject = null; audioEl.remove() } catch (e) {}
          })
        }

        if (audioEl) {
          const cleanups = connectRemoteAudio(audioEl, stream)
          remoteCleanupsRef.current.push(...cleanups)
          logDiag('remote_audio_connected', 'key=' + key)
        }
      } catch (e) {
        logDiag('ontrack_err', String(e && e.message ? e.message : e))
      }
    }
    pc.onconnectionstatechange = () => {
      logDiag('conn_state', 'key=' + key + ' state=' + pc.connectionState + ' ice=' + (pc.iceConnectionState || 'n/a') + ' sig=' + pc.signalingState)
      if (pc.connectionState === 'connected') {
        setCallState('connected')
        setConnectedPeers(prev => prev + 1)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        stopMonitor(key)
        setConnectedPeers(prev => Math.max(0, prev - 1))
        // SOLO DM: colgar únicamente en 'failed' (terminal). 'disconnected' es transitorio
        // y Chrome lo reporta a veces durante la negociación; colgar ahí cortaba llamadas vivas.
        if (!isGroup && callStateRef.current === 'connected' && pc.connectionState === 'failed') {
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
        callerName: myName,
        callee: activeCall.targetId,
        calleeName: otherName,
        offer: pc.localDescription.toJSON(),
        status: 'ringing',
        startedAt: Date.now()
      })

      addUnsub(onSnapshot(callRef, (snap) => {
        const data = snap.data()
        if (!data) { endCall(); return }
        if (data.answer && pc && pc.remoteDescription === null) {
          if (pc.signalingState === 'have-local-offer') {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => {
              flushPendingCandidates(pc)
            }).catch(err => { console.error('setRemote answer err', err); })
          }
        }
        if (data.status === 'ended') endCall()
      }))

      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'calleeCandidates', 'list'), (snap) => {
        const data = snap.data()
        if (data?.candidates) {
          data.candidates.forEach(c => addIceCandidateSafe(pc, c))
        }
      }))
    } catch (err) {
      console.error('Error starting DM call:', err)
      setCallError('No se pudo iniciar la llamada')
      setCallState('idle')
    }
  }

  // ---------- LLAMADA GRUPAL FULL-MESH P2P ----------
  // Cada par de miembros (A, B) tiene su propia RTCPeerConnection directa.
  // ---------- LLAMADA GRUPAL FULL-MESH P2P ----------
  // Cada par de miembros (A, B) tiene su propia RTCPeerConnection directa.
  // El usuario con ID alfabéticamente menor es el Offerer, el mayor es el Answerer.
  const setupMeshPeer = useCallback((otherId, stream) => {
    if (!otherId || otherId === myChatId) return
    if (peersRef.current.has(otherId) || startingPeersRef.current.has(otherId)) return
    startingPeersRef.current.add(otherId)

    const pairKey = [myChatId, otherId].sort().join('___')
    const amIOfferer = myChatId < otherId

    const offerDocRef = doc(db, ...callsBase(callId), 'mesh', pairKey, 'signal', 'offer')
    const answerDocRef = doc(db, ...callsBase(callId), 'mesh', pairKey, 'signal', 'answer')
    const offererCandidatesRef = doc(db, ...callsBase(callId), 'mesh', pairKey, 'candidates', 'offerer')
    const answererCandidatesRef = doc(db, ...callsBase(callId), 'mesh', pairKey, 'candidates', 'answerer')

    logDiag('mesh_peer_init', `peer=${otherId} amIOfferer=${amIOfferer} pairKey=${pairKey}`)

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peersRef.current.set(otherId, pc)
    attachRemoteStream(pc, otherId)
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    if (amIOfferer) {
      // --- OFFERER (ID menor) ---
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          pushIceCandidate([...callsBase(callId), 'mesh', pairKey, 'candidates', 'offerer'], e.candidate.toJSON())
        }
      }

      pc.createOffer({ offerToReceiveAudio: true }).then(async (offer) => {
        await pc.setLocalDescription(offer)
        await setDoc(offerDocRef, {
          offer: pc.localDescription.toJSON(),
          offerer: myChatId,
          createdAt: Date.now()
        })
        logDiag('mesh_offer_sent', `peer=${otherId}`)
      }).catch(err => {
        logDiag('mesh_offer_err', `peer=${otherId} err=${String(err?.message || err)}`)
        console.error('Error creating mesh offer for ' + otherId, err)
      })

      // Escuchar la respuesta del answerer
      const unsubAnswer = onSnapshot(answerDocRef, (snap) => {
        const data = snap.data()
        if (!data?.answer) return
        if (pc.signalingState === 'have-local-offer') {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => {
            flushPendingCandidates(pc)
            logDiag('mesh_remote_answer_set', `peer=${otherId}`)
          }).catch(err => {
            logDiag('mesh_remote_answer_err', `peer=${otherId} err=${String(err?.message || err)}`)
            console.error('Error setting remote answer from ' + otherId, err)
          })
        }
      })
      addUnsub(unsubAnswer)

      // Escuchar candidatos ICE del answerer
      const unsubIce = onSnapshot(answererCandidatesRef, (snap) => {
        const data = snap.data()
        if (data?.candidates && Array.isArray(data.candidates)) {
          data.candidates.forEach(c => addIceCandidateSafe(pc, c))
        }
      })
      addUnsub(unsubIce)

    } else {
      // --- ANSWERER (ID mayor) ---
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          pushIceCandidate([...callsBase(callId), 'mesh', pairKey, 'candidates', 'answerer'], e.candidate.toJSON())
        }
      }

      let hasAnswered = false
      const unsubOffer = onSnapshot(offerDocRef, async (snap) => {
        const data = snap.data()
        if (!data?.offer || hasAnswered) return
        hasAnswered = true
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          flushPendingCandidates(pc)
          logDiag('mesh_remote_offer_set', `peer=${otherId}`)

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await setDoc(answerDocRef, {
            answer: pc.localDescription.toJSON(),
            answerer: myChatId,
            createdAt: Date.now()
          })
          logDiag('mesh_answer_sent', `peer=${otherId}`)
        } catch (err) {
          hasAnswered = false
          logDiag('mesh_answer_err', `peer=${otherId} err=${String(err?.message || err)}`)
          console.error('Error answering mesh for ' + otherId, err)
        }
      })
      addUnsub(unsubOffer)

      // Escuchar candidatos ICE del offerer
      const unsubIce = onSnapshot(offererCandidatesRef, (snap) => {
        const data = snap.data()
        if (data?.candidates && Array.isArray(data.candidates)) {
          data.candidates.forEach(c => addIceCandidateSafe(pc, c))
        }
      })
      addUnsub(unsubIce)
    }
  }, [myChatId, callId, isGroup])

  const startGroupMesh = async () => {
    setCallState(isInitiator ? 'calling' : 'joining')
    setCallError(null)
    const callRef = doc(db, ...callsBase(callId))
    callDocRef.current = callRef

    try {
      const stream = await getStream()
      monitorStream(stream, myChatId)

      // 1. Si soy iniciador, registrar doc principal de llamada
      if (isInitiator) {
        const initialParts = (Array.isArray(activeCall.participants) ? activeCall.participants : []).map(p => ({ id: p.id, name: p.name, joined: false }))
        setLiveParticipants(initialParts)
        setGroupCallStatus('ringing')
        await setDoc(callRef, {
          type: 'group',
          initiator: myChatId,
          initiatorName: myName,
          groupId: activeCall.groupId || 'default',
          participants: initialParts,
          status: 'ringing',
          startedAt: Date.now()
        })
      } else {
        // Si soy participante, marcar mi joined: true
        try {
          const snap = await getDoc(callRef)
          const data = snap.data()
          const parts = normalizeParticipants(data?.participants || activeCall.participants)
          const idx = parts.findIndex(p => p.id === myChatId)
          if (idx >= 0) {
            const newParts = parts.map((p, i) => (i === idx ? { ...p, joined: true } : p))
            await updateDoc(callRef, { participants: newParts }).catch(() => {})
          }
        } catch (e) {}
      }

      // 2. Escuchar el documento de la llamada grupal
      addUnsub(onSnapshot(callRef, (snap) => {
        const data = snap.data()
        if (!data) { endCall(); return }
        if (data.status === 'ended') { endCall(); return }
        if (data.participants) {
          const norm = normalizeParticipants(data.participants)
          setLiveParticipants(norm)
          const anyJoined = norm.some(pt => pt.joined)
          if (anyJoined) {
            setGroupCallStatus('connected')
            setCallState('connected')
          }
          // Descubrimiento dinámico de participantes que se unan
          const initiatorId = data.initiator || (isInitiator ? myChatId : (activeCall.initiatorId || 'teacher'))
          const allMemberIds = Array.from(new Set([initiatorId, ...norm.map(p => p.id)])).filter(Boolean)
          allMemberIds.forEach(pid => {
            if (pid !== myChatId && !peersRef.current.has(pid) && !startingPeersRef.current.has(pid)) {
              setupMeshPeer(pid, stream)
            }
          })
        }
      }))

      // 3. Inicializar mesh con todos los miembros conocidos
      const initiatorId = isInitiator ? myChatId : (activeCall.initiatorId || 'teacher')
      const rawParts = normalizeParticipants(liveParticipants || activeCall.participants)
      const allMemberIds = Array.from(new Set([initiatorId, ...rawParts.map(p => p.id)])).filter(Boolean)
      allMemberIds.forEach(pid => {
        if (pid !== myChatId && !peersRef.current.has(pid) && !startingPeersRef.current.has(pid)) {
          setupMeshPeer(pid, stream)
        }
      })

    } catch (err) {
      console.error('Error starting group mesh call:', err)
      setCallError('Error al iniciar la llamada grupal')
    }
  }

  // ---------- PARTICIPANTE: contestar llamada DM ----------
  const answerDMCall = async () => {
    // NO marcar 'connected' de forma optimista: si connectionState pasa
    // transitoriamente por 'disconnected'/'failed' durante la negociación,
    // el guard de onconnectionstatechange colgaría la llamada sola.
    setCallState('joining')
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
      flushPendingCandidates(pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await setDoc(callRef, { answer: pc.localDescription.toJSON(), status: 'connected' }, { merge: true })

      addUnsub(onSnapshot(doc(db, ...callsBase(callId), 'callerCandidates', 'list'), (snap) => {
        const data = snap.data()
        if (data?.candidates) {
          data.candidates.forEach(c => addIceCandidateSafe(pc, c))
        }
      }))

      addUnsub(onSnapshot(callRef, (snap) => {
        const d = snap.data()
        if (!d || d.status === 'ended') endCall()
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
    if (isGroup) {
      startGroupMesh()
    } else {
      if (isInitiator) startDMCall()
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
      setCallError(null)
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000)
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      setCallDuration(0)
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [callState])

  const formatDuration = (seconds) => {
    const validSec = (typeof seconds === 'number' && !isNaN(seconds) && isFinite(seconds) && seconds >= 0) ? Math.floor(seconds) : 0
    const m = Math.floor(validSec / 60).toString().padStart(2, '0')
    const s = (validSec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const endCall = async () => {
    playHangupSound()
    const wasGroup = isGroup
    const wasInitiator = isInitiator
    const leavingId = myChatId
    const callRefToClean = callDocRef.current
    try {
      iceBatchRef.current.forEach(b => { if (b?.timer) clearTimeout(b.timer); });
      iceBatchRef.current.clear();
      meshIceBatchRef.current.forEach(b => { if (b?.timer) clearTimeout(b.timer); });
      meshIceBatchRef.current.clear();
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
      if (callRefToClean) {
        if (wasGroup) {
          if (!wasInitiator) {
            try {
              const snap = await getDoc(callRefToClean).catch(() => null)
              const parts = normalizeParticipants(snap?.data()?.participants || liveParticipants || activeCall?.participants)
              const idx = parts.findIndex(p => p.id === leavingId)
              if (idx >= 0) {
                // CRÍTICO: escribir array COMPLETO (dot-notation destruye id/name)
                const newParts = parts.map((p, i) => (i === idx ? { ...p, joined: false } : p))
                await updateDoc(callRefToClean, { participants: newParts }).catch(() => {})
              }
              await deleteDoc(doc(db, ...callsBase(callId), 'answers', leavingId)).catch(() => {})
              await deleteDoc(doc(db, ...callsBase(callId), 'participantIce', leavingId)).catch(() => {})
              await deleteDoc(doc(db, ...callsBase(callId), 'offers', leavingId)).catch(() => {})
              await deleteDoc(doc(db, ...callsBase(callId), 'speaking', leavingId)).catch(() => {})
              // Verificar si todos se fueron — solo entonces borrar doc grupal
              const snapAfter = await getDoc(callRefToClean).catch(() => null)
              const afterParts = normalizeParticipants(snapAfter?.data()?.participants)
              const anyJoinedAfter = afterParts.some(p => p.joined)
              if (!anyJoinedAfter) {
                // Si nadie queda conectado, limpiar call doc para todos
                await setDoc(callRefToClean, { status: 'ended' }, { merge: true }).catch(() => {})
                // No borrar inmediatamente, dejar que los otros detecten ended; el último que queda lo borra tras delay
                setTimeout(() => deleteDoc(callRefToClean).catch(() => {}), 1500)
              }
            } catch (e) {}
          } else {
            // Iniciador cuelga grupo: el hub se va, la llamada termina para TODOS
            try {
              await setDoc(callRefToClean, { status: 'ended' }, { merge: true }).catch(() => {})
              // Dar 1.5s para que los participantes reciban el snapshot 'ended' antes de borrar
              setTimeout(() => deleteDoc(callRefToClean).catch(() => {}), 1500)
            } catch (e) {}
          }
        } else {
          await setDoc(callRefToClean, { status: 'ended' }, { merge: true }).catch(() => {})
          await deleteDoc(callRefToClean).catch(() => {})
        }
      }
    } catch (e) {}
    if (isMountedRef.current) {
      setCallState('idle')
      setIsMuted(false)
      setSpeakingMap({})
      setLiveParticipants(null)
      setGroupCallStatus('ringing')
    }
    // limpiar analizadores restantes
    analysersRef.current.forEach(({ ctx, analyser, rafId, src }) => {
      try { cancelAnimationFrame(rafId); src.disconnect(); analyser.disconnect(); ctx.close() } catch(e) {}
    })
    analysersRef.current.clear()
    startingPeersRef.current.clear()
    pendingCandidatesRef.current.clear()
    pendingInitiatorIceRef.current = []
    // Limpiar timers pendientes de candidatos ICE para evitar escrituras post-llamada
    iceBatchRef.current.forEach(batch => { if (batch.timer) clearTimeout(batch.timer) })
    iceBatchRef.current.clear()
    meshIceBatchRef.current.forEach(batch => { if (batch.timer) clearTimeout(batch.timer) })
    meshIceBatchRef.current.clear()
    callDocRef.current = null
    offerProcessedRef.current = false
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    if (isMountedRef.current) {
      onClose?.()
    }
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
      {/* Elementos de audio remoto en el JSX para heredar activación de usuario (Autoplay) */}
      <audio id="remote-audio-main" autoPlay playsInline />
      {isGroup && (
        <>
          {normalizeParticipants(liveParticipants || activeCall.participants).map(p => (
            <audio key={p.id} id={`remote-audio-${p.id}`} autoPlay playsInline />
          ))}
          {activeCall.initiatorId && (
            <audio key={activeCall.initiatorId} id={`remote-audio-${activeCall.initiatorId}`} autoPlay playsInline />
          )}
        </>
      )}

      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className={`w-full rounded-3xl p-6 sm:p-8 text-center space-y-5 sm:space-y-6 ${isGroup ? 'max-w-[95vw] sm:max-w-[600px] md:max-w-[720px] lg:max-w-[800px] md:p-10' : 'max-w-sm'} ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
          {/* Avatar / Grid de participantes (Discord) */}
          {isGroup ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-h-[42vh] md:max-h-[55vh] overflow-y-auto p-1 pr-1">
              {/* Yo */}
              <div className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl border-2 transition-all ${speakingMap[myChatId] && !isMuted && callState === 'connected' ? 'border-green-400 bg-green-500/15 shadow-lg shadow-green-500/20 scale-[1.02]' : 'border-white/10 bg-white/5'}`}>
                <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all text-lg md:text-xl ${speakingMap[myChatId] && !isMuted && callState === 'connected' ? 'bg-green-500 ring-4 ring-green-400 ring-offset-2 ring-offset-gray-900 scale-105' : 'bg-blue-600'}`}>
                  <span className="text-lg">{myName?.charAt(0)?.toUpperCase() || 'Y'}</span>
                  {isMuted && <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"><MicOffIcon size={12} /></span>}
                  {speakingMap[myChatId] && !isMuted && callState === 'connected' && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-ping"></span>}
                  {speakingMap[myChatId] && !isMuted && callState === 'connected' && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></span>}
                </div>
                <span className={`text-xs font-bold truncate max-w-full ${speakingMap[myChatId] && !isMuted && callState === 'connected' ? 'text-green-400' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>{myName} (Tú)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${speakingMap[myChatId] && !isMuted && callState === 'connected' ? 'bg-green-500 text-white animate-pulse' : isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{isMuted ? 'Silenciado' : (speakingMap[myChatId] && callState === 'connected') ? 'Hablando...' : 'Conectado'}</span>
              </div>
              {/* Participantes remotos (filtra "yo" y deduplica por id) */}
              {(() => {
                const raw = normalizeParticipants(liveParticipants || activeCall.participants)
                const seen = new Set()
                const remote = raw.filter(p => {
                  if (!p || !p.id || p.id === myChatId || seen.has(p.id)) return false
                  seen.add(p.id)
                  return true
                })
                return remote.map(p => {
                  const displayName = p.name || userMappings[p.id]?.fullName || p.id || '?'
                  const isJoined = p.joined === true
                  const isSpeaking = !!speakingMap[p.id] && isJoined
                  return (
                    <div key={p.id} className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl border-2 transition-all ${isSpeaking ? 'border-green-400 bg-green-500/15 shadow-lg shadow-green-500/20 scale-[1.02]' : isJoined ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/5 opacity-60'}`}>
                      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all ${isSpeaking ? 'bg-green-500 ring-4 ring-green-400 ring-offset-2 ring-offset-gray-900 scale-105' : isJoined ? 'bg-gray-700' : 'bg-gray-600'}`}>
                        <span className="text-lg md:text-xl">{displayName.charAt(0).toUpperCase()}</span>
                        {isSpeaking && <><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-ping"></span><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></span></>}
                        {!isJoined && <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 text-[10px]">…</span>}
                      </div>
                      <span className={`text-xs font-bold truncate max-w-full ${isSpeaking ? 'text-green-400' : isJoined ? (isDarkMode ? 'text-white' : 'text-gray-900') : 'text-gray-400'}`}>{displayName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSpeaking ? 'bg-green-500 text-white animate-pulse' : isJoined ? 'bg-gray-700 text-gray-300' : 'bg-gray-600 text-gray-400'}`}>{!isJoined ? 'Llamando...' : isSpeaking ? 'Hablando...' : 'Conectado'}</span>
                    </div>
                  )
                })
              })()}
              {/* Iniciador para participantes (si no está en la lista) */}
              {!isInitiator && activeCall.callerName && !normalizeParticipants(activeCall.participants).some(p => p.id === (activeCall.initiatorId || '')) && (
                <div className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl border-2 transition-all ${speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' ? 'border-green-400 bg-green-500/15 shadow-lg' : 'border-white/10 bg-white/5'}`}>
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' ? 'bg-green-500 ring-4 ring-green-400 ring-offset-2 ring-offset-gray-900 scale-105' : 'bg-teal-600'}`}>
                    <span className="text-lg md:text-xl">{(activeCall.callerName || userMappings[activeCall.initiatorId]?.fullName || '?').charAt(0).toUpperCase()}</span>
                    {speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' && <><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-ping"></span><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></span></>}
                  </div>
                  <span className={`text-xs font-bold truncate max-w-full ${speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' ? 'text-green-400' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeCall.callerName || userMappings[activeCall.initiatorId]?.fullName || 'Docente'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'}`}>{speakingMap[activeCall.initiatorId || 'main'] && callState === 'connected' ? 'Hablando...' : 'Conectado'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
              <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg transition-all duration-200 ${
                (speakingMap[isGroup ? myChatId : 'main'] || speakingMap[myChatId]) && callState === 'connected' ? 'bg-green-500 ring-4 ring-green-400 ring-offset-2 ring-offset-gray-900 scale-105 shadow-green-500/30' :
                callState === 'connected' ? 'bg-green-500' :
                callState === 'calling' || callState === 'joining' ? 'bg-blue-500 animate-pulse' :
                'bg-orange-500 animate-pulse'
              }`}>
                {isGroup ? <UsersIcon size={32} /> : <PhoneIcon size={32} className={callState !== 'connected' ? 'animate-bounce' : ''} />}
              </div>
              {(speakingMap['main'] || (speakingMap[myChatId] && !isMuted)) && callState === 'connected' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-gray-900"></span>
                </span>
              )}
            </div>
          )}

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
                ? (isGroup ? `${(normalizeParticipants(liveParticipants || activeCall.participants).filter(p=>p.joined).length+1)} en la llamada • ${formatDuration(callDuration)}` : formatDuration(callDuration))
                : callState === 'calling' ? 'Esperando respuesta...'
                : callState === 'joining' ? 'Uniéndose a la llamada...'
                : 'Llamada entrante'}
            </p>
            {isGroup && callState === 'connected' && (
              <p className={`text-[11px] mt-1 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {(normalizeParticipants(liveParticipants || activeCall.participants).filter(p=>p.joined).length+1)} de {(normalizeParticipants(liveParticipants || activeCall.participants).length+1)} participantes
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

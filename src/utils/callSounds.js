// src/utils/callSounds.js
// Sonidos de llamadas generados con Web Audio API (no dependen de URLs externas)

let ringCtx = null
let ringTimer = null
let ringNodes = []

// Ringtone: patrón Do-Mi-Sol-Do ascendente, se repite cada 1.4s
export const playRingtone = () => {
  try {
    stopRingtone()
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    ringCtx = ctx
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const notes = [523.25, 659.25, 783.99, 1046.5]
    const playCycle = () => {
      if (!ringCtx || ringCtx !== ctx) return
      const now = ctx.currentTime
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const start = now + i * 0.2
        gain.gain.setValueAtTime(0.55, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
        osc.start(start)
        osc.stop(start + 0.2)
        ringNodes.push(osc)
      })
      ringTimer = setTimeout(playCycle, 1400)
    }
    playCycle()
    return ctx
  } catch (e) {
    return null
  }
}

export const stopRingtone = () => {
  try {
    if (ringTimer) { clearTimeout(ringTimer); ringTimer = null }
    ringNodes.forEach(n => { try { n.stop() } catch (e) {} })
    ringNodes = []
    if (ringCtx) { try { ringCtx.close().catch(() => {}) } catch (e) {} ringCtx = null }
  } catch (e) {}
}

// Sonido armónico de éxito / celebración al unirse a un grupo
export const playSuccessChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.09)
      gain.gain.setValueAtTime(0.3, now + i * 0.09)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.09)
      osc.stop(now + i * 0.09 + 0.42)
    })
    setTimeout(() => { try { ctx.close() } catch (e) {} }, 900)
  } catch (e) {}
}

// Sonido de llamada conectada (pitido corto ascendente)
export const playConnectedSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const play = (freq, delay, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + delay
      gain.gain.setValueAtTime(0.5, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.start(start)
      osc.stop(start + dur + 0.05)
    }
    play(880, 0, 0.12)
    play(1320, 0.12, 0.2)
    setTimeout(() => { try { ctx.close() } catch (e) {} }, 800)
  } catch (e) {}
}

// Sonido de colgar/rechazar (descendente)
export const playHangupSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.25)
    gain.gain.setValueAtTime(0.6, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    setTimeout(() => { try { ctx.close() } catch (e) {} }, 600)
  } catch (e) {}
}


let outgoingTimer = null
let outgoingCtx = null
let outgoingNodes = []

// Sonido de llamada saliente (tono de timbrado que escucha quien llama mientras espera respuesta)
export const playOutgoingRing = () => {
  try {
    stopOutgoingRing()
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    outgoingCtx = ctx
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    const playTone = () => {
      if (!outgoingCtx || outgoingCtx !== ctx) return
      const now = ctx.currentTime
      // Tono dual armónico de central telefónica (440Hz + 480Hz)
      const freqs = [440, 480]
      freqs.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        // Suave envolvente de volumen para no molestar el oído
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.16, now + 0.1)
        gain.gain.setValueAtTime(0.16, now + 1.4)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
        osc.start(now)
        osc.stop(now + 1.55)
        outgoingNodes.push(osc)
      })
      outgoingTimer = setTimeout(playTone, 3800)
    }
    playTone()
    return ctx
  } catch (e) {
    return null
  }
}

export const stopOutgoingRing = () => {
  try {
    if (outgoingTimer) { clearTimeout(outgoingTimer); outgoingTimer = null }
    outgoingNodes.forEach(n => { try { n.stop() } catch (e) {} })
    outgoingNodes = []
    if (outgoingCtx) { try { outgoingCtx.close().catch(() => {}) } catch (e) {} outgoingCtx = null }
  } catch (e) {}
}

let sharedAudioCtx = null
const getSharedAudioContext = () => {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) sharedAudioCtx = new Ctx()
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch (e) {
    return null
  }
}

// Conectar stream remoto de forma universal y sin eco:
// 1. HTML5 Media Element: canal principal con salida nativa a altavoces/auricular (100% compatible con iOS WebKit y Android)
// 2. Web Audio API: solo fallback si no existe elemento de audio en el DOM
export const connectRemoteAudio = (audioEl, stream) => {
  const cleanups = []
  if (!stream) return cleanups

  let isHtmlAudioActive = false

  // 1. Pipeline HTML5 Audio Element (canal nativo para salida por altavoces del dispositivo)
  if (audioEl) {
    try {
      audioEl.srcObject = stream
      audioEl.muted = false
      audioEl.volume = 1.0
      audioEl.autoplay = true
      audioEl.playsInline = true
      audioEl.setAttribute('playsinline', 'true')
      audioEl.setAttribute('webkit-playsinline', 'true')
      const p = audioEl.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay bloqueado hasta interacción del usuario
        })
      }
      isHtmlAudioActive = true
    } catch (e) {
      console.error('Error connecting remote audio element:', e)
    }
  }

  // 2. Pipeline Web Audio API (solo como respaldo si no hay elemento HTML5)
  if (!isHtmlAudioActive) {
    try {
      const ctx = getSharedAudioContext()
      if (ctx) {
        const source = ctx.createMediaStreamSource(stream)
        const gain = ctx.createGain()
        gain.gain.value = 1.0
        source.connect(gain)
        gain.connect(ctx.destination)
        cleanups.push(() => {
          try { source.disconnect(); gain.disconnect() } catch (e) {}
        })
      }
    } catch (e) {
      console.warn('Web Audio destination fallback notice:', e)
    }
  }

  // 3. Desbloqueo universal ante cualquier interacción del usuario
  const unlockAll = () => {
    try {
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {})
      }
      if (audioEl) {
        audioEl.muted = false
        audioEl.volume = 1.0
        const p = audioEl.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlockAll, { passive: true })
    window.addEventListener('click', unlockAll, { passive: true })
    window.addEventListener('touchstart', unlockAll, { passive: true })
    window.addEventListener('keydown', unlockAll, { passive: true })

    cleanups.push(() => {
      try { window.removeEventListener('pointerdown', unlockAll) } catch (e) {}
      try { window.removeEventListener('click', unlockAll) } catch (e) {}
      try { window.removeEventListener('touchstart', unlockAll) } catch (e) {}
      try { window.removeEventListener('keydown', unlockAll) } catch (e) {}
    })
  }

  cleanups.push(() => {
    if (audioEl) {
      try {
        audioEl.pause()
        audioEl.srcObject = null
      } catch (e) {}
    }
  })

  return cleanups
}

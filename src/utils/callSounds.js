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

// Conectar stream remoto con doble ruta garantizada:
// 1. Web Audio API (MediaStreamSource -> Gain -> AudioContext.destination para salida directa por altavoces)
// 2. HTML5 Media Element (audioEl.srcObject -> play)
export const connectRemoteAudio = (audioEl, stream) => {
  const cleanups = []
  if (!stream) return cleanups

  let webAudioConnected = false

  // 1. Pipeline Web Audio API
  try {
    const ctx = getSharedAudioContext()
    if (ctx) {
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      gain.gain.value = 1.0
      source.connect(gain)
      gain.connect(ctx.destination)
      webAudioConnected = true
      cleanups.push(() => {
        try { source.disconnect(); gain.disconnect() } catch (e) {}
      })
    }
  } catch (e) {
    console.warn('Web Audio destination route notice:', e)
  }

  // 2. Pipeline HTML5 Audio Element (Muted if Web Audio is active to avoid double audio / reverb echo)
  if (audioEl) {
    try {
      audioEl.srcObject = stream
      audioEl.muted = webAudioConnected
      audioEl.volume = 1.0
      audioEl.autoplay = true
      audioEl.playsInline = true
      const p = audioEl.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay bloqueado hasta interacción del usuario
        })
      }
    } catch (e) {
      console.error('Error connecting remote audio element:', e)
    }
  }

  // 3. Desbloqueo universal ante cualquier interacción del usuario
  const unlockAll = () => {
    try {
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {})
      }
      if (audioEl) {
        if (!webAudioConnected) audioEl.muted = false
        audioEl.volume = 1.0
        const p = audioEl.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      }
    } catch (e) {}
  }

  window.addEventListener('pointerdown', unlockAll, { passive: true })
  window.addEventListener('click', unlockAll, { passive: true })
  window.addEventListener('touchstart', unlockAll, { passive: true })
  window.addEventListener('keydown', unlockAll, { passive: true })

  cleanups.push(() => {
    try { window.removeEventListener('pointerdown', unlockAll) } catch (e) {}
    try { window.removeEventListener('click', unlockAll) } catch (e) {}
    try { window.removeEventListener('touchstart', unlockAll) } catch (e) {}
    try { window.removeEventListener('keydown', unlockAll) } catch (e) {}
    if (audioEl) {
      try {
        audioEl.pause()
        audioEl.srcObject = null
      } catch (e) {}
    }
  })

  return cleanups
}

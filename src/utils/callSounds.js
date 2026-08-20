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

// Conectar stream remoto con ganancia +50% (más fuerte)
export const connectRemoteAudio = (audioEl, stream) => {
  const cleanups = []
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx) {
      const ctx = new Ctx()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const src = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      gain.gain.value = 1.5
      gain.connect(ctx.destination)
      src.connect(gain)
      audioEl.srcObject = null
      cleanups.push(() => { try { src.disconnect(); gain.disconnect(); ctx.close() } catch (e) {} })
      return cleanups
    }
  } catch (e) {}
  // Fallback: srcObject directo (funciona en iOS sin AudioContext)
  try {
    audioEl.srcObject = stream
    audioEl.volume = 1.0
    audioEl.playsInline = true
    audioEl.play().catch(() => {})
  } catch (e) {}
  return cleanups
}

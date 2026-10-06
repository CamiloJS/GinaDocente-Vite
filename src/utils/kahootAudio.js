// src/utils/kahootAudio.js
// Sintetizador Web Audio API para Kahoot en Vivo:
// - Música ambiental de sala de espera (Lobby)
// - Música de tensión mientras los estudiantes eligen su respuesta (con pulso acelerado al final)
// - Sonido de Gong / Platillo (Crash Cymbal + Resonant Gong) cuando todos terminan de responder
// - Efectos de selección, acierto y fanfarria del podio final

let musicCtx = null;
let musicInterval = null;
let activeNodes = [];
let currentMode = null;

const getOrCreateAudioContext = () => {
  try {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!musicCtx || musicCtx.state === 'closed') {
      musicCtx = new Ctx();
    }
    if (musicCtx.state === 'suspended') {
      musicCtx.resume().catch(() => {});
    }
    return musicCtx;
  } catch {
    return null;
  }
};

export const stopKahootMusic = () => {
  try {
    currentMode = null;
    if (musicInterval) {
      clearTimeout(musicInterval);
      clearInterval(musicInterval);
      musicInterval = null;
    }
    activeNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        // Ya detenido
      }
      try {
        n.disconnect();
      } catch {
        // Ignorar
      }
    });
    activeNodes = [];
  } catch {
    // Ignorar errores de cierre de audio
  }
};

/**
 * Música ambiental alegre estilo Kahoot para la Sala de Espera (Lobby)
 */
export const startLobbyMusic = () => {
  try {
    stopKahootMusic();
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    currentMode = 'lobby';

    // Progresión funky pentatónica en La menor / Do mayor
    const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98.0];
    const melodyNotes = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];
    let step = 0;

    const tick = () => {
      if (currentMode !== 'lobby' || !musicCtx || musicCtx.state === 'closed') return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const bassFreq = bassNotes[step % bassNotes.length];
      const melFreq = melodyNotes[step % melodyNotes.length];

      // Bajo suave
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassGain.gain.setValueAtTime(0.11, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.38);
      activeNodes.push(bassOsc);

      // Marimba / Pluck melódico en tiempos pares o síncopa
      if (step % 2 === 0 || step % 4 === 3) {
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(melFreq, now);
        melGain.gain.setValueAtTime(0.07, now);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        melOsc.connect(melGain);
        melGain.connect(ctx.destination);
        melOsc.start(now);
        melOsc.stop(now + 0.24);
        activeNodes.push(melOsc);
      }

      if (activeNodes.length > 32) {
        activeNodes = activeNodes.slice(-16);
      }

      step += 1;
      musicInterval = setTimeout(tick, 420);
    };

    tick();
  } catch {
    // Sin soporte de audio
  }
};

/**
 * Música ambiental de tensión mientras los estudiantes están respondiendo una pregunta.
 * Incluye reloj rítmico + bajo de suspenso estilo Kahoot que acelera cuando quedan <= 5s.
 */
export const startTensionMusic = (getRemainingSeconds) => {
  try {
    stopKahootMusic();
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    currentMode = 'tension';

    // Secuencia armónica de tensión estilo concurso (Am -> F -> Dm -> E7)
    const bassPattern = [
      110.0, 110.0, 164.81, 110.0,
      87.31, 87.31, 130.81, 87.31,
      73.42, 73.42, 110.0, 73.42,
      82.41, 98.0, 123.47, 164.81,
    ];
    const arpPattern = [
      440.0, 523.25, 659.25, 523.25,
      349.23, 440.0, 523.25, 440.0,
      293.66, 349.23, 440.0, 349.23,
      329.63, 415.3, 493.88, 659.25,
    ];

    let step = 0;

    const tick = () => {
      if (currentMode !== 'tension' || !musicCtx || musicCtx.state === 'closed') return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const rem = typeof getRemainingSeconds === 'function' ? Number(getRemainingSeconds()) : 15;
      const isUrgent = rem > 0 && rem <= 5;
      const shiftMultiplier = isUrgent ? 1.059463 : 1.0; // Sube medio tono en los últimos 5s
      const stepMs = isUrgent ? 210 : 320;

      const now = ctx.currentTime;
      const bassFreq = bassPattern[step % bassPattern.length] * shiftMultiplier;
      const arpFreq = arpPattern[step % arpPattern.length] * shiftMultiplier;

      // 1. Pulso de reloj (Tick-Tock de tensión)
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = 'triangle';
      const clickPitch = step % 2 === 0 ? 1150 : 860;
      tickOsc.frequency.setValueAtTime(clickPitch * shiftMultiplier, now);
      tickOsc.frequency.exponentialRampToValueAtTime(220, now + 0.045);
      tickGain.gain.setValueAtTime(isUrgent ? 0.14 : 0.09, now);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      tickOsc.start(now);
      tickOsc.stop(now + 0.055);
      activeNodes.push(tickOsc);

      // 2. Bajo pulsante de suspenso
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(isUrgent ? 520 : 380, now);
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassGain.gain.setValueAtTime(0.12, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.26);
      activeNodes.push(bassOsc);

      // 3. Arpegio misterioso staccato
      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();
      arpOsc.type = 'sine';
      arpOsc.frequency.setValueAtTime(arpFreq, now);
      arpGain.gain.setValueAtTime(0.075, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      arpOsc.connect(arpGain);
      arpGain.connect(ctx.destination);
      arpOsc.start(now);
      arpOsc.stop(now + 0.18);
      activeNodes.push(arpOsc);

      if (activeNodes.length > 40) {
        activeNodes = activeNodes.slice(-20);
      }

      step += 1;
      musicInterval = setTimeout(tick, stepMs);
    };

    tick();
  } catch {
    // Ignorar errores de audio
  }
};

/**
 * Sonido de GONG / PLATILLO (Crash Cymbal + Gong Resonante)
 * Se dispara automáticamente cuando todos los participantes han respondido o cuando el reloj llega a 0.
 */
export const playGongSound = () => {
  try {
    stopKahootMusic();
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;

    // 1. Cuerpo profundo del Gong (frecuencias inarmónicas metálicas con modulación FM)
    const gongPartials = [
      { freq: 118, gain: 0.34, decay: 2.6, type: 'sine' },
      { freq: 179, gain: 0.22, decay: 2.3, type: 'triangle' },
      { freq: 263, gain: 0.16, decay: 1.9, type: 'sine' },
      { freq: 374, gain: 0.12, decay: 1.6, type: 'sine' },
      { freq: 512, gain: 0.09, decay: 1.4, type: 'triangle' },
      { freq: 688, gain: 0.06, decay: 1.1, type: 'sine' },
      { freq: 942, gain: 0.04, decay: 0.9, type: 'sine' },
    ];

    gongPartials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = p.type;
      // Ligero pitch bend inicial característico del golpe de mazo en el gong
      osc.frequency.setValueAtTime(p.freq * 1.04, now);
      osc.frequency.exponentialRampToValueAtTime(p.freq * 0.985, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(p.freq, now + p.decay);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });

    // 2. Brillo metálico del Platillo / Crash Cymbal (ruido blanco filtrado con cola brillante)
    const bufferSize = Math.floor(ctx.sampleRate * 1.8);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Modulación de amplitud rápida para textura de bronce vibrando
      const shimmer = 1 + 0.25 * Math.sin(i * 0.015);
      output[i] = (Math.random() * 2 - 1) * shimmer;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3600, now);
    bandpass.Q.setValueAtTime(0.7, now);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(1400, now);

    const cymbalGain = ctx.createGain();
    cymbalGain.gain.setValueAtTime(0.001, now);
    cymbalGain.gain.linearRampToValueAtTime(0.28, now + 0.008);
    cymbalGain.gain.exponentialRampToValueAtTime(0.06, now + 0.35);
    cymbalGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.75);

    whiteNoise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(cymbalGain);
    cymbalGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 1.8);

    return true;
  } catch {
    return false;
  }
};

/**
 * Sonido corto cuando el estudiante selecciona una opción
 */
export const playAnswerSelectSound = () => {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    // Ignorar
  }
};

/**
 * Sonido al revelar si el estudiante acertó o falló la pregunta
 */
export const playRevealResultSound = (isCorrect) => {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (isCorrect) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.07;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } else {
      const notes = [311.13, 233.08];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const start = now + idx * 0.14;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    }
  } catch {
    // Ignorar
  }
};

/**
 * Fanfarria triunfal cuando se muestra el Podio Final (1°, 2°, 3° lugar)
 */
export const playPodiumFanfare = () => {
  try {
    stopKahootMusic();
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sequence = [
      { freq: 523.25, delay: 0.0, dur: 0.14 },
      { freq: 523.25, delay: 0.15, dur: 0.14 },
      { freq: 523.25, delay: 0.3, dur: 0.14 },
      { freq: 659.25, delay: 0.45, dur: 0.35 },
      { freq: 587.33, delay: 0.82, dur: 0.25 },
      { freq: 659.25, delay: 1.1, dur: 0.25 },
      { freq: 783.99, delay: 1.38, dur: 0.65 },
      { freq: 1046.5, delay: 1.38, dur: 0.65 },
    ];
    sequence.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + n.delay;
      osc.frequency.setValueAtTime(n.freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.04);
    });
  } catch {
    // Ignorar
  }
};

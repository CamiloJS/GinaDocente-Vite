/**
 * Reading Audio Engine (Audios de lectura con Fade-in y Fade-out)
 * 
 * Provides peaceful, ambient reading soundscapes with progressive fade-in
 * when opening a book and progressive fade-out when closing it.
 * 
 * Supports:
 * 1. Automatic procedural soundscapes via Web Audio API (Piano, Lofi, Rain, Library, Forest, Focus)
 *    working 100% offline, zero external asset downloads, and zero CORS issues.
 * 2. Teacher-customized audio URLs or uploaded files (MP3/WAV/OGG/M4A) with auto-loop and graceful procedural fallback.
 * 3. User toggle (activate/deactivate background reading audio) and volume control (gentle / unobtrusive).
 */

export const DEFAULT_FADE_IN_SECONDS = 2.2;
export const DEFAULT_FADE_OUT_SECONDS = 1.2;
export const DEFAULT_READING_VOLUME = 0.22;

export const READING_AUDIO_PRESETS = [
    {
        id: 'piano-calm',
        name: 'Piano y calma',
        category: 'melody',
        description: 'Armonías suaves de piano y pads cálidos para una lectura serena',
        defaultVolume: 0.22,
        recommended: true,
        tags: ['Paz', 'Concentración', 'Acústico']
    },
    {
        id: 'rain-reading',
        name: 'Lluvia y café',
        category: 'nature',
        description: 'Sonido suave y continuo de lluvia relajante en la ventana',
        defaultVolume: 0.20,
        recommended: false,
        tags: ['Lluvia', 'Ambiente', 'Acogedor']
    },
    {
        id: 'lofi-study',
        name: 'Lofi estudio',
        category: 'chill',
        description: 'Textura cálida de vinilo y acordes suaves ideales para estudiar',
        defaultVolume: 0.22,
        recommended: false,
        tags: ['Lofi', 'Estudio', 'Calidez']
    },
    {
        id: 'library-peace',
        name: 'Biblioteca clásica',
        category: 'acoustic',
        description: 'Resonancia profunda y tranquila de sala de lectura histórica',
        defaultVolume: 0.22,
        recommended: false,
        tags: ['Clásico', 'Silencioso', 'Madera']
    },
    {
        id: 'serene-forest',
        name: 'Bosque sereno',
        category: 'nature',
        description: 'Brisa natural suave con armónicos vegetales y pájaros sutiles',
        defaultVolume: 0.20,
        recommended: false,
        tags: ['Naturaleza', 'Brisa', 'Verde']
    },
    {
        id: 'deep-focus',
        name: 'Ondas de enfoque',
        category: 'binaural',
        description: 'Pads envolventes de frecuencia alfa para máxima retención de lectura',
        defaultVolume: 0.22,
        recommended: false,
        tags: ['Enfoque', 'Binaural', 'Profundo']
    },
    {
        id: 'custom',
        name: 'Audio personalizado',
        category: 'custom',
        description: 'Pista de audio elegida o subida por el docente para este libro',
        defaultVolume: 0.25,
        recommended: false,
        tags: ['Personalizado', 'Docente']
    },
    {
        id: 'none',
        name: 'Sin audio de fondo',
        category: 'silent',
        description: 'Lectura en silencio total sin música ambiental',
        defaultVolume: 0,
        recommended: false,
        tags: ['Silencio']
    }
];

export const getReadingAudioPreset = (presetId = 'piano-calm') => {
    const cleanId = String(presetId || 'piano-calm').trim().toLowerCase();
    const found = READING_AUDIO_PRESETS.find((p) => p.id === cleanId);
    return found || READING_AUDIO_PRESETS[0];
};

export const clampReadingVolume = (vol = DEFAULT_READING_VOLUME) => {
    if (vol === null || vol === undefined) return DEFAULT_READING_VOLUME;
    const num = Number(vol);
    if (!Number.isFinite(num)) return DEFAULT_READING_VOLUME;
    return Number(Math.max(0, Math.min(0.65, num)).toFixed(2));
};

let sharedAmbientCtx = null;

const getAmbientAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
        if (!sharedAmbientCtx || sharedAmbientCtx.state === 'closed') {
            sharedAmbientCtx = new AudioCtx();
        }
        if (sharedAmbientCtx.state === 'suspended') {
            sharedAmbientCtx.resume().catch(() => {});
        }
        return sharedAmbientCtx;
    } catch {
        return null;
    }
};

/**
 * Creates a procedural ambient generator in Web Audio API according to preset.
 * All sound generation is completely client-side with 0 external network requests.
 */
const startProceduralAmbient = (ctx, presetId, masterGain) => {
    const cleanId = String(presetId || 'piano-calm').toLowerCase().trim();
    const cleanupFns = [];

    try {
        if (cleanId === 'rain-reading') {
            // Generador de lluvia envolvente y suave
            const bufferSec = 4;
            const sampleRate = ctx.sampleRate || 44100;
            const frameCount = sampleRate * bufferSec;
            const buffer = ctx.createBuffer(2, frameCount, sampleRate);
            const ch0 = buffer.getChannelData(0);
            const ch1 = buffer.getChannelData(1);

            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < frameCount; i++) {
                const white0 = Math.random() * 2 - 1;
                const white1 = Math.random() * 2 - 1;
                b0 = 0.992 * b0 + white0 * 0.045;
                b1 = 0.985 * b1 + white1 * 0.045;
                b2 = 0.960 * b2 + white0 * 0.055;
                ch0[i] = (b0 + b2) * 0.16;
                ch1[i] = (b1 + b2) * 0.16;
            }

            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = buffer;
            noiseNode.loop = true;

            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'lowpass';
            bandpass.frequency.setValueAtTime(1400, ctx.currentTime);

            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.setValueAtTime(180, ctx.currentTime);

            noiseNode.connect(highpass);
            highpass.connect(bandpass);
            bandpass.connect(masterGain);
            noiseNode.start();

            cleanupFns.push(() => {
                try { noiseNode.stop(); } catch {}
                try { noiseNode.disconnect(); } catch {}
            });
        } else if (cleanId === 'lofi-study') {
            // Textura lofi: ruido de vinilo cálido + acordes tranquilos
            const bufferSec = 3;
            const sampleRate = ctx.sampleRate || 44100;
            const frameCount = sampleRate * bufferSec;
            const buffer = ctx.createBuffer(1, frameCount, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                const crackle = Math.random() > 0.998 ? (Math.random() * 0.6 - 0.3) : 0;
                data[i] = (Math.random() * 0.02 - 0.01) + crackle;
            }

            const vinylNode = ctx.createBufferSource();
            vinylNode.buffer = buffer;
            vinylNode.loop = true;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, ctx.currentTime);

            const vinylGain = ctx.createGain();
            vinylGain.gain.setValueAtTime(0.35, ctx.currentTime);

            vinylNode.connect(filter);
            filter.connect(vinylGain);
            vinylGain.connect(masterGain);
            vinylNode.start();

            // Acordes de piano eléctrico lofi (Cmaj9 -> Am9 -> Fmaj7)
            const chords = [
                [261.63, 329.63, 392.00, 493.88], // C E G B
                [220.00, 261.63, 329.63, 392.00], // A C E G
                [174.61, 220.00, 261.63, 329.63]  // F A C E
            ];
            let chordIdx = 0;
            let chordTimer = null;

            const playChord = () => {
                const notes = chords[chordIdx % chords.length];
                chordIdx++;
                notes.forEach((freq, nIdx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);

                    const now = ctx.currentTime;
                    const duration = 4.2;
                    gain.gain.setValueAtTime(0.001, now);
                    gain.gain.linearRampToValueAtTime(0.065 / (nIdx + 1), now + 0.35);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start(now);
                    osc.stop(now + duration + 0.1);
                });
            };

            playChord();
            chordTimer = setInterval(playChord, 4500);

            cleanupFns.push(() => {
                clearInterval(chordTimer);
                try { vinylNode.stop(); } catch {}
                try { vinylNode.disconnect(); } catch {}
            });
        } else if (cleanId === 'deep-focus') {
            // Ondas alfa binaurales (110 Hz y 120 Hz para batido de 10 Hz)
            const oscL = ctx.createOscillator();
            const oscR = ctx.createOscillator();
            const gainL = ctx.createGain();
            const gainR = ctx.createGain();

            oscL.type = 'sine';
            oscR.type = 'sine';
            oscL.frequency.setValueAtTime(108, ctx.currentTime);
            oscR.frequency.setValueAtTime(118, ctx.currentTime); // 10 Hz binaural beat

            gainL.gain.setValueAtTime(0.12, ctx.currentTime);
            gainR.gain.setValueAtTime(0.12, ctx.currentTime);

            // Filtro suave para evitar zumbidos molestos
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(260, ctx.currentTime);

            oscL.connect(gainL);
            oscR.connect(gainR);
            gainL.connect(lowpass);
            gainR.connect(lowpass);
            lowpass.connect(masterGain);

            oscL.start();
            oscR.start();

            cleanupFns.push(() => {
                try { oscL.stop(); oscR.stop(); } catch {}
                try { oscL.disconnect(); oscR.disconnect(); } catch {}
            });
        } else if (cleanId === 'serene-forest') {
            // Viento vegetal suave + campana armónica
            const bufferSec = 4;
            const sampleRate = ctx.sampleRate || 44100;
            const frameCount = sampleRate * bufferSec;
            const buffer = ctx.createBuffer(1, frameCount, sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < frameCount; i++) {
                const white = Math.random() * 2 - 1;
                lastOut = (lastOut + 0.02 * white) / 1.02;
                data[i] = lastOut * 0.25;
            }

            const wind = ctx.createBufferSource();
            wind.buffer = buffer;
            wind.loop = true;

            const band = ctx.createBiquadFilter();
            band.type = 'bandpass';
            band.frequency.setValueAtTime(420, ctx.currentTime);
            band.Q.setValueAtTime(2.0, ctx.currentTime);

            wind.connect(band);
            band.connect(masterGain);
            wind.start();

            // Campanas armónicas lejanas cada 6 segundos
            const chimes = [523.25, 659.25, 783.99, 1046.50];
            let chimeTimer = setInterval(() => {
                const freq = chimes[Math.floor(Math.random() * chimes.length)];
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                const now = ctx.currentTime;
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(now);
                osc.stop(now + 3.6);
            }, 5500);

            cleanupFns.push(() => {
                clearInterval(chimeTimer);
                try { wind.stop(); } catch {}
                try { wind.disconnect(); } catch {}
            });
        } else if (cleanId === 'library-peace') {
            // Atmósfera de biblioteca: resonancia profunda y cálida de madera
            const baseFreqs = [130.81, 196.00, 261.63]; // C3, G3, C4
            const oscs = baseFreqs.map((f) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, ctx.currentTime);
                gain.gain.setValueAtTime(0.045, ctx.currentTime);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(380, ctx.currentTime);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                osc.start();
                return { osc, gain };
            });

            cleanupFns.push(() => {
                oscs.forEach(({ osc }) => {
                    try { osc.stop(); osc.disconnect(); } catch {}
                });
            });
        } else {
            // Predeterminado: 'piano-calm' (Acordes serenos con ataque suave y decaimiento largo)
            const chordNotesList = [
                [174.61, 261.63, 329.63, 392.00], // Fmaj7 (F3, C4, E4, G4)
                [130.81, 196.00, 246.94, 329.63], // Cmaj7 (C3, G3, B3, E4)
                [220.00, 261.63, 329.63, 440.00], // Am7 (A3, C4, E4, A4)
                [196.00, 246.94, 293.66, 392.00]  // G6 (G3, B3, D4, G4)
            ];
            let chordStep = 0;

            const triggerPianoPad = () => {
                const notes = chordNotesList[chordStep % chordNotesList.length];
                chordStep++;
                const now = ctx.currentTime;
                const duration = 5.2;

                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    osc.type = idx === 0 ? 'triangle' : 'sine';
                    osc.frequency.setValueAtTime(freq, now);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(950, now);

                    // Ataque suave (fade in individual) y decaimiento armónico
                    gain.gain.setValueAtTime(0.0001, now);
                    gain.gain.linearRampToValueAtTime(0.065, now + 0.7);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(masterGain);

                    osc.start(now);
                    osc.stop(now + duration + 0.1);
                });
            };

            triggerPianoPad();
            const pianoTimer = setInterval(triggerPianoPad, 4800);

            cleanupFns.push(() => {
                clearInterval(pianoTimer);
            });
        }
    } catch (err) {
        console.warn('Error inicializando sintetizador de lectura:', err);
    }

    return () => {
        cleanupFns.forEach((fn) => {
            try { fn(); } catch {}
        });
    };
};

/**
 * Reading Ambient Player Controller (Singleton)
 * Handles smooth progressive fade-in on book open and smooth fade-out on book close.
 */
class ReadingAmbientPlayer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeStopFn = null;
        this.htmlAudio = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.targetVolume = 0.22;
        this.currentTrackId = 'piano-calm';
        this.currentCustomUrl = '';
        this.currentTitle = 'Piano y calma';
        this.listeners = new Set();
        this.fadeTimer = null;
        this.autoPlayPending = null;
    }

    subscribe(listener) {
        if (typeof listener === 'function') {
            this.listeners.add(listener);
            listener(this.getState());
            return () => this.listeners.delete(listener);
        }
        return () => {};
    }

    notify() {
        const state = this.getState();
        this.listeners.forEach((fn) => {
            try { fn(state); } catch {}
        });
    }

    getState() {
        return {
            isPlaying: this.isPlaying,
            isMuted: this.isMuted,
            volume: this.targetVolume,
            trackId: this.currentTrackId,
            customUrl: this.currentCustomUrl,
            title: this.currentTitle
        };
    }

    /**
     * Starts playing ambient reading audio with progressive fade-in.
     */
    start({
        trackId = 'piano-calm',
        customUrl = '',
        volume = 0.22,
        fadeInDuration = 2.2,
        title = ''
    } = {}) {
        if (trackId === 'none') {
            this.stop({ fadeOutDuration: 0.5 });
            this.currentTrackId = 'none';
            this.notify();
            return;
        }

        const preset = getReadingAudioPreset(trackId);
        this.currentTrackId = preset.id;
        this.currentCustomUrl = customUrl ? String(customUrl).trim() : '';
        this.currentTitle = title || (preset.id === 'custom' ? 'Audio personalizado' : preset.name);
        this.targetVolume = clampReadingVolume(volume || preset.defaultVolume);

        if (this.isMuted) {
            this.isPlaying = true;
            this.notify();
            return;
        }

        this._teardownCurrentAudio();

        const ctx = getAmbientAudioContext();
        if (!ctx) {
            this.isPlaying = true;
            this.notify();
            return;
        }
        this.ctx = ctx;

        try {
            const masterGain = ctx.createGain();
            const now = ctx.currentTime;
            // Progressive fade-in: start at silence (0.0001) and ramp up smoothly
            masterGain.gain.setValueAtTime(0.0001, now);
            masterGain.gain.linearRampToValueAtTime(this.targetVolume, now + Math.max(0.5, fadeInDuration));
            masterGain.connect(ctx.destination);
            this.masterGain = masterGain;

            let startedCustom = false;
            if (this.currentCustomUrl && typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
                try {
                    const audio = new Audio();
                    audio.src = this.currentCustomUrl;
                    audio.loop = true;
                    audio.crossOrigin = 'anonymous';
                    audio.volume = this.targetVolume;

                    // Fade in on HTMLAudioElement
                    let volProgress = 0.02;
                    audio.volume = 0.02;
                    const fadeStepMs = 100;
                    const totalSteps = Math.max(5, Math.round((fadeInDuration * 1000) / fadeStepMs));
                    const volInc = (this.targetVolume - 0.02) / totalSteps;
                    const customFadeTimer = setInterval(() => {
                        volProgress = Math.min(this.targetVolume, volProgress + volInc);
                        try { audio.volume = volProgress; } catch {}
                        if (volProgress >= this.targetVolume) clearInterval(customFadeTimer);
                    }, fadeStepMs);

                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                this.htmlAudio = audio;
                                this.activeStopFn = () => {
                                    clearInterval(customFadeTimer);
                                    try { audio.pause(); } catch {}
                                };
                            })
                            .catch(() => {
                                // Fallback to procedural synth if custom audio fails or is blocked
                                this.activeStopFn = startProceduralAmbient(ctx, this.currentTrackId, masterGain);
                            });
                        startedCustom = true;
                    }
                } catch {
                    startedCustom = false;
                }
            }

            if (!startedCustom) {
                this.activeStopFn = startProceduralAmbient(ctx, this.currentTrackId, masterGain);
            }

            this.isPlaying = true;
            this.notify();
        } catch (err) {
            console.warn('Error iniciando audio ambiental:', err);
            this.isPlaying = false;
            this.notify();
        }
    }

    /**
     * Stops the audio with progressive fade-out.
     */
    stop({ fadeOutDuration = 1.2 } = {}) {
        if (!this.isPlaying && !this.masterGain && !this.htmlAudio) return;

        const duration = Math.max(0.3, Number(fadeOutDuration) || 1.2);

        // Fade out HTML audio if active
        if (this.htmlAudio) {
            const audio = this.htmlAudio;
            this.htmlAudio = null;
            const startVol = audio.volume || this.targetVolume;
            const steps = 12;
            const stepMs = Math.round((duration * 1000) / steps);
            let currentStep = 0;
            const fadeOutTimer = setInterval(() => {
                currentStep++;
                const ratio = Math.max(0, 1 - currentStep / steps);
                try { audio.volume = Number((startVol * ratio).toFixed(3)); } catch {}
                if (currentStep >= steps || audio.volume <= 0.01) {
                    clearInterval(fadeOutTimer);
                    try { audio.pause(); } catch {}
                }
            }, stepMs);
        }

        // Fade out Web Audio masterGain
        if (this.masterGain && this.ctx && this.ctx.state !== 'closed') {
            try {
                const now = this.ctx.currentTime;
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(0.0001, now + duration);
            } catch {}
        }

        const previousStopFn = this.activeStopFn;
        this.activeStopFn = null;

        if (this.fadeTimer) clearTimeout(this.fadeTimer);
        this.fadeTimer = setTimeout(() => {
            if (typeof previousStopFn === 'function') {
                try { previousStopFn(); } catch {}
            }
            if (this.masterGain) {
                try { this.masterGain.disconnect(); } catch {}
                this.masterGain = null;
            }
            this.isPlaying = false;
            this.notify();
        }, Math.round(duration * 1000) + 40);

        this.isPlaying = false;
        this.notify();
    }

    setMuted(muted) {
        const nextMuted = Boolean(muted);
        if (this.isMuted === nextMuted) return;
        this.isMuted = nextMuted;

        if (this.isMuted) {
            this.stop({ fadeOutDuration: 0.8 });
        } else {
            this.start({
                trackId: this.currentTrackId,
                customUrl: this.currentCustomUrl,
                volume: this.targetVolume,
                fadeInDuration: 1.8,
                title: this.currentTitle
            });
        }
        this.notify();
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
    }

    setVolume(vol) {
        const safeVol = clampReadingVolume(vol);
        this.targetVolume = safeVol;
        if (this.htmlAudio) {
            try { this.htmlAudio.volume = safeVol; } catch {}
        }
        if (this.masterGain && this.ctx && !this.isMuted) {
            try {
                const now = this.ctx.currentTime;
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(safeVol, now + 0.3);
            } catch {}
        }
        this.notify();
    }

    changeTrack(trackId, customUrl = '', title = '') {
        this.start({
            trackId,
            customUrl,
            volume: this.targetVolume,
            fadeInDuration: 1.5,
            title
        });
    }

    _teardownCurrentAudio() {
        if (this.fadeTimer) {
            clearTimeout(this.fadeTimer);
            this.fadeTimer = null;
        }
        if (this.htmlAudio) {
            try { this.htmlAudio.pause(); } catch {}
            this.htmlAudio = null;
        }
        if (typeof this.activeStopFn === 'function') {
            try { this.activeStopFn(); } catch {}
            this.activeStopFn = null;
        }
        if (this.masterGain) {
            try { this.masterGain.disconnect(); } catch {}
            this.masterGain = null;
        }
    }
}

export const readingAmbientPlayer = new ReadingAmbientPlayer();

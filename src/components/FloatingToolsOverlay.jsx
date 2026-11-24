// src/components/FloatingToolsOverlay.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Timer, Coins, Play, Pause, RotateCcw, Plus, Minus,
  Volume2, VolumeX, Sparkles, CheckCircle2, X, Clock, Calculator
} from './Icons.jsx';

// =========================================================================
// SHARED AUDIO CONTEXT & SOUND SYNTHESIZERS
// =========================================================================
let sharedAudioCtx = null;
export const getAudioContext = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
};

export const playTone = (frequency, type = 'sine', duration = 0.15, gainVal = 0.3) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

export const playAlarmSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    [0, 0.25, 0.5, 0.9, 1.15, 1.4, 1.8, 2.05, 2.3].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = (idx % 2 === 0) ? 980 : 1318.5;
      gain.gain.setValueAtTime(0.45, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
  } catch (e) {}
};

export const playCoinSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 400 + i * 80;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.07);
    }
  } catch (e) {}
};

export const playRouletteTick = () => {
  playTone(800 + Math.random() * 200, 'triangle', 0.04, 0.12);
};

// =========================================================================
// MINTED COIN VECTORS (CARA & SELLO)
// =========================================================================
export const CoinFaceHeads = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full select-none" style={{ pointerEvents: 'none' }}>
    <defs>
      <radialGradient id="goldGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF2B2" />
        <stop offset="25%" stopColor="#F59E0B" />
        <stop offset="60%" stopColor="#D97706" />
        <stop offset="85%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#78350F" />
      </radialGradient>
      <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="50%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="innerGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>

    {/* Fondo 100% opaco para evitar que el reverso se transparente */}
    <circle cx="100" cy="100" r="99" fill="#78350F" />

    {/* Borde exterior acanalado */}
    <circle cx="100" cy="100" r="96" fill="url(#goldGrad)" stroke="url(#goldRim)" strokeWidth="4" />
    <circle cx="100" cy="100" r="90" fill="none" stroke="#78350F" strokeWidth="2.5" strokeDasharray="3 3.5" opacity="0.7" />
    
    {/* Anillo biselado interior */}
    <circle cx="100" cy="100" r="83" fill="none" stroke="url(#innerGold)" strokeWidth="3" opacity="0.9" />
    <circle cx="100" cy="100" r="79" fill="#92400E" fillOpacity="0.25" />

    {/* Estrellas decorativas superiores */}
    <g fill="#FEF3C7">
      <path d="M 100 24 L 102 29 L 107 29 L 103 32 L 105 37 L 100 34 L 95 37 L 97 32 L 93 29 L 98 29 Z" transform="scale(0.8) translate(25, 6)" />
      <path d="M 70 30 L 71.5 34 L 75.5 34 L 72.5 36.5 L 73.5 40.5 L 70 38 L 66.5 40.5 L 67.5 36.5 L 64.5 34 L 68.5 34 Z" transform="scale(0.65) translate(38, 14)" />
      <path d="M 130 30 L 131.5 34 L 135.5 34 L 132.5 36.5 L 133.5 40.5 L 130 38 L 126.5 40.5 L 127.5 36.5 L 124.5 34 L 128.5 34 Z" transform="scale(0.65) translate(70, 14)" />
    </g>

    {/* Corona Real Emblema Central */}
    <g>
      {/* Corona base */}
      <path d="M 52 110 L 60 72 L 80 92 L 100 62 L 120 92 L 140 72 L 148 110 Z" fill="url(#innerGold)" stroke="#78350F" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Joyas en las puntas */}
      <circle cx="60" cy="71" r="4.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
      <circle cx="80" cy="91" r="3.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
      <circle cx="100" cy="61" r="6" fill="#FDE047" stroke="#78350F" strokeWidth="1.2" />
      <circle cx="120" cy="91" r="3.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
      <circle cx="140" cy="71" r="4.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
      
      {/* Banda de la corona con gemas */}
      <rect x="52" y="105" width="96" height="12" rx="3" fill="#78350F" stroke="#FDE68A" strokeWidth="1" />
      <circle cx="64" cy="111" r="2.5" fill="#EF4444" />
      <circle cx="78" cy="111" r="2.5" fill="#3B82F6" />
      <circle cx="100" cy="111" r="3.5" fill="#10B981" />
      <circle cx="122" cy="111" r="2.5" fill="#3B82F6" />
      <circle cx="136" cy="111" r="2.5" fill="#EF4444" />
    </g>

    {/* Ramas de Laurel debajo */}
    <g stroke="#FDE68A" strokeWidth="1.8" fill="#F59E0B" opacity="0.85">
      <path d="M 50 128 C 70 145 130 145 150 128" fill="none" />
      <path d="M 58 131 Q 62 126 68 130 Q 64 135 58 131 Z" />
      <path d="M 78 138 Q 82 133 88 137 Q 84 142 78 138 Z" />
      <path d="M 122 138 Q 118 133 112 137 Q 116 142 122 138 Z" />
      <path d="M 142 131 Q 138 126 132 130 Q 136 135 142 131 Z" />
    </g>

    {/* Tipografía Acuñada: CARA & HEADS */}
    <text x="100" y="162" textAnchor="middle" fill="#FEF3C7" fontSize="19" fontWeight="900" fontFamily="serif" letterSpacing="3.5">
      CARA
    </text>
    <text x="100" y="177" textAnchor="middle" fill="#FDE68A" fontSize="9" fontWeight="800" fontFamily="sans-serif" letterSpacing="2" opacity="0.9">
      ★ HEADS ★
    </text>
  </svg>
);

export const CoinFaceTails = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full select-none" style={{ pointerEvents: 'none' }}>
    <defs>
      <radialGradient id="silverGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#E2E8F0" />
        <stop offset="60%" stopColor="#94A3B8" />
        <stop offset="85%" stopColor="#64748B" />
        <stop offset="100%" stopColor="#1E293B" />
      </radialGradient>
      <linearGradient id="silverRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
      <linearGradient id="innerSilver" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>

    {/* Fondo 100% opaco para evitar que el reverso se transparente */}
    <circle cx="100" cy="100" r="99" fill="#0F172A" />

    {/* Borde exterior acanalado de plata */}
    <circle cx="100" cy="100" r="96" fill="url(#silverGrad)" stroke="url(#silverRim)" strokeWidth="4" />
    <circle cx="100" cy="100" r="90" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeDasharray="3 3.5" opacity="0.7" />
    
    {/* Anillo biselado interior */}
    <circle cx="100" cy="100" r="83" fill="none" stroke="url(#innerSilver)" strokeWidth="3" opacity="0.9" />
    <circle cx="100" cy="100" r="79" fill="#0F172A" fillOpacity="0.3" />

    {/* Texto Superior Circular: ENGLISH TECH */}
    <path id="curveTailsFixed" d="M 35 100 A 65 65 0 0 1 165 100" fill="none" />
    <text fill="#F8FAFC" fontSize="9" fontWeight="900" letterSpacing="2.5">
      <textPath href="#curveTailsFixed" startOffset="50%" textAnchor="middle">
        ★ ENGLISH TECH ★
      </textPath>
    </text>

    {/* Águila Imperial Emblema Central */}
    <g>
      {/* Cuerpo y alas extendidas del águila */}
      <path d="M 100 55 L 108 68 L 123 58 L 118 76 L 140 68 L 130 88 L 152 86 L 132 104 L 142 118 L 118 116 L 120 128 L 100 134 L 80 128 L 82 116 L 58 118 L 68 104 L 48 86 L 70 88 L 60 68 L 82 76 L 77 58 L 92 68 Z" fill="url(#innerSilver)" stroke="#0F172A" strokeWidth="1.3" strokeLinejoin="round" />
      
      {/* Cabeza del Águila */}
      <path d="M 98 52 C 94 48 90 52 86 54 C 82 55 78 54 75 58 C 80 62 86 60 90 62 C 94 64 96 66 100 66 C 104 66 106 64 110 62 C 114 60 120 62 125 58 C 122 54 118 55 114 54 C 110 52 106 48 102 52 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1" />
      
      {/* Escudo en el pecho */}
      <path d="M 87 80 L 113 80 L 113 99 Q 113 115 100 121 Q 87 115 87 99 Z" fill="#1E293B" stroke="#F8FAFC" strokeWidth="1.5" />
      {/* Estrella en el escudo */}
      <path d="M 100 87 L 102 92 L 107 92 L 103 95 L 105 100 L 100 97 L 95 100 L 97 95 L 93 92 L 98 92 Z" fill="#F8FAFC" />
    </g>

    {/* Tipografía Acuñada: SELLO & TAILS */}
    <text x="100" y="162" textAnchor="middle" fill="#FFFFFF" fontSize="19" fontWeight="900" fontFamily="serif" letterSpacing="3.5">
      SELLO
    </text>
    <text x="100" y="177" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="800" fontFamily="sans-serif" letterSpacing="2" opacity="0.9">
      ★ TAILS ★
    </text>
  </svg>
);

export const MiniCoinBadge = ({ side = 'heads', size = 18 }) => {
  if (side === 'heads') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="8" fill="none" stroke="#FDE68A" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <path d="M7 14 L8 9 L10.5 11 L12 8 L13.5 11 L16 9 L17 14 Z" fill="#FEF3C7" stroke="#78350F" strokeWidth="0.8" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="11" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="1.5 1.5" />
      <path d="M7 10 L12 7 L17 10 L15 15 L12 17 L9 15 Z" fill="#F8FAFC" stroke="#1E293B" strokeWidth="0.8" />
    </svg>
  );
};

// =========================================================================
// CALCULADORA SENCILLA COMPONENT (Usable tanto en panel como en ventana flotante)
// =========================================================================
export const SimpleCalculator = ({ isDarkMode = false, isFloating = false, onOpenFloating = null }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewOperand, setWaitingForNewOperand] = useState(false);
  const [historyFormula, setHistoryFormula] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const clickAudio = useCallback(() => {
    if (soundEnabled) {
      playTone(520, 'sine', 0.04, 0.08);
    }
  }, [soundEnabled]);

  const clickOpAudio = useCallback(() => {
    if (soundEnabled) {
      playTone(660, 'triangle', 0.05, 0.1);
    }
  }, [soundEnabled]);

  const handleDigit = useCallback((digit) => {
    clickAudio();
    if (waitingForNewOperand) {
      setDisplay(String(digit));
      setWaitingForNewOperand(false);
    } else {
      if (display === '0') {
        setDisplay(String(digit));
      } else {
        if (display.replace('-', '').length >= 12) return;
        setDisplay(display + digit);
      }
    }
  }, [clickAudio, display, waitingForNewOperand]);

  const handleDecimal = useCallback(() => {
    clickAudio();
    if (waitingForNewOperand) {
      setDisplay('0.');
      setWaitingForNewOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [clickAudio, display, waitingForNewOperand]);

  const handleClear = useCallback(() => {
    clickOpAudio();
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForNewOperand(false);
    setHistoryFormula('');
  }, [clickOpAudio]);

  const handleBackspace = useCallback(() => {
    clickAudio();
    if (waitingForNewOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [clickAudio, display, waitingForNewOperand]);

  const handleToggleSign = useCallback(() => {
    clickAudio();
    if (display === '0') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  }, [clickAudio, display]);

  const handlePercentage = useCallback(() => {
    clickOpAudio();
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const res = val / 100;
    const formatted = parseFloat(res.toFixed(8)).toString();
    setDisplay(formatted);
    setWaitingForNewOperand(true);
  }, [clickOpAudio, display]);

  const calculateResult = useCallback((first, second, op) => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '×':
      case '*': return first * second;
      case '÷':
      case '/': return second === 0 ? 'Error' : first / second;
      default: return second;
    }
  }, []);

  const handleOperation = useCallback((nextOp) => {
    clickOpAudio();
    const inputValue = parseFloat(display);

    if (isNaN(inputValue)) return;

    if (prevValue === null) {
      setPrevValue(inputValue);
      setHistoryFormula(`${inputValue} ${nextOp}`);
    } else if (operation) {
      if (waitingForNewOperand) {
        setOperation(nextOp);
        setHistoryFormula(`${prevValue} ${nextOp}`);
        return;
      }
      const result = calculateResult(prevValue, inputValue, operation);
      if (result === 'Error') {
        setDisplay('Error');
        setPrevValue(null);
        setOperation(null);
        setWaitingForNewOperand(true);
        setHistoryFormula('');
        return;
      }
      const rounded = parseFloat(Number(result).toFixed(8));
      setDisplay(String(rounded));
      setPrevValue(rounded);
      setHistoryFormula(`${rounded} ${nextOp}`);
    }

    setWaitingForNewOperand(true);
    setOperation(nextOp);
  }, [calculateResult, clickOpAudio, display, operation, prevValue, waitingForNewOperand]);

  const handleEquals = useCallback(() => {
    clickOpAudio();
    const inputValue = parseFloat(display);

    if (isNaN(inputValue) || prevValue === null || !operation) return;

    const result = calculateResult(prevValue, inputValue, operation);
    if (result === 'Error') {
      setDisplay('Error');
      setHistoryFormula('');
    } else {
      const rounded = parseFloat(Number(result).toFixed(8));
      setHistoryFormula(`${prevValue} ${operation} ${inputValue} =`);
      setDisplay(String(rounded));
      setPrevValue(null);
      setOperation(null);
      setWaitingForNewOperand(true);
    }
  }, [calculateResult, clickOpAudio, display, operation, prevValue]);

  // Keyboard support when calculator is visible
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleDecimal();
      } else if (e.key === '+' || e.key === '-') {
        handleOperation(e.key);
      } else if (e.key === '*') {
        handleOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDecimal, handleOperation, handleEquals, handleBackspace, handleClear]);

  return (
    <div className={`w-full max-w-sm mx-auto flex flex-col rounded-3xl transition-all ${
      isFloating ? '' : isDarkMode ? 'bg-gray-800/90 border border-gray-700/80 p-5 shadow-sm' : 'bg-white border border-gray-200/90 p-5 shadow-sm'
    }`}>
      {/* Barra superior de herramientas */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-500">
          <Calculator size={16} /> Calculadora
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              soundEnabled
                ? 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          {!isFloating && onOpenFloating && (
            <button
              type="button"
              onClick={onOpenFloating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
              title="Abrir como ventana flotante"
            >
              <span>Flotante</span>
            </button>
          )}
        </div>
      </div>

      {/* Pantalla de visualización con fórmula previa */}
      <div className={`p-4 rounded-2xl mb-3 flex flex-col justify-end text-right border transition-all ${
        isDarkMode ? 'bg-gray-900/90 border-gray-700/70' : 'bg-gray-50 border-gray-200/80'
      }`}>
        <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 min-h-[16px] truncate select-none">
          {historyFormula || '\u00A0'}
        </div>
        <div className={`text-3xl font-black font-mono tracking-tight truncate select-text ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {display}
        </div>
      </div>

      {/* Teclado numérico y de operaciones */}
      <div className="grid grid-cols-4 gap-2 select-none">
        {/* Fila 1: C, ⌫, %, ÷ */}
        <button
          type="button"
          onClick={handleClear}
          className="h-11 rounded-xl font-black text-sm bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 active:scale-95 transition-transform"
        >
          C
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className={`h-11 rounded-xl font-black text-sm border active:scale-95 transition-transform ${
            isDarkMode ? 'bg-gray-700/70 text-gray-200 border-gray-600/60 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
          }`}
          title="Borrar dígito"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={handlePercentage}
          className={`h-11 rounded-xl font-black text-sm border active:scale-95 transition-transform ${
            isDarkMode ? 'bg-gray-700/70 text-gray-200 border-gray-600/60 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
          }`}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOperation('÷')}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            operation === '÷'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
          }`}
        >
          ÷
        </button>

        {/* Fila 2: 7, 8, 9, × */}
        {['7', '8', '9'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
              isDarkMode ? 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700/80' : 'bg-white text-gray-800 border-gray-200 shadow-2xs hover:bg-gray-50'
            }`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperation('×')}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            operation === '×'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
          }`}
        >
          ×
        </button>

        {/* Fila 3: 4, 5, 6, - */}
        {['4', '5', '6'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
              isDarkMode ? 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700/80' : 'bg-white text-gray-800 border-gray-200 shadow-2xs hover:bg-gray-50'
            }`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperation('-')}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            operation === '-'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
          }`}
        >
          -
        </button>

        {/* Fila 4: 1, 2, 3, + */}
        {['1', '2', '3'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
              isDarkMode ? 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700/80' : 'bg-white text-gray-800 border-gray-200 shadow-2xs hover:bg-gray-50'
            }`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperation('+')}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            operation === '+'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
          }`}
        >
          +
        </button>

        {/* Fila 5: ±, 0, ., = */}
        <button
          type="button"
          onClick={handleToggleSign}
          className={`h-11 rounded-xl font-black text-sm border active:scale-95 transition-transform ${
            isDarkMode ? 'bg-gray-700/70 text-gray-200 border-gray-600/60 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
          }`}
          title="Cambiar signo"
        >
          ±
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            isDarkMode ? 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700/80' : 'bg-white text-gray-800 border-gray-200 shadow-2xs hover:bg-gray-50'
          }`}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDecimal}
          className={`h-11 rounded-xl font-black text-base border active:scale-95 transition-transform ${
            isDarkMode ? 'bg-gray-700/70 text-gray-200 border-gray-600/60 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
          }`}
        >
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="h-11 rounded-xl font-black text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-95 transition-transform"
        >
          =
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// MONEDA 3D FLOTANTE COMPONENT
// =========================================================================
export const FloatingCoin = ({ isDarkMode = false }) => {
  const [coinRotation, setCoinRotation] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState('heads');
  const [headsCount, setHeadsCount] = useState(0);
  const [tailsCount, setTailsCount] = useState(0);

  const handleFlipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    playCoinSound();

    const isHeads = Math.random() < 0.5;
    const currentNormalized = (coinRotation % 360 + 360) % 360;
    const targetFaceAngle = isHeads ? 0 : 180;
    const extraTurns = (5 + Math.floor(Math.random() * 3)) * 360;
    const rotationDelta = extraTurns + (targetFaceAngle - currentNormalized);
    const newTotalRot = coinRotation + rotationDelta;

    setCoinRotation(newTotalRot);

    setTimeout(() => {
      setIsFlipping(false);
      const resultingSide = isHeads ? 'heads' : 'tails';
      setCoinSide(resultingSide);
      if (isHeads) {
        setHeadsCount(prev => prev + 1);
        playTone(784, 'triangle', 0.25, 0.25);
      } else {
        setTailsCount(prev => prev + 1);
        playTone(659.25, 'triangle', 0.25, 0.25);
      }
    }, 1400);
  };

  const handlePreviewSide = (side) => {
    if (isFlipping) return;
    setCoinSide(side);
    const currentNormalized = (coinRotation % 360 + 360) % 360;
    const targetAngle = side === 'heads' ? 0 : 180;
    setCoinRotation(coinRotation + (targetAngle - currentNormalized));
    playTone(side === 'heads' ? 700 : 500, 'sine', 0.05);
  };

  return (
    <div className="w-full max-w-[280px] mx-auto flex flex-col items-center text-center select-none">
      {/* Botones de previsualización */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
          <Coins size={14} /> Moneda 3D
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePreviewSide('heads')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              coinSide === 'heads' && !isFlipping ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Cara
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            type="button"
            onClick={() => handlePreviewSide('tails')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              coinSide === 'tails' && !isFlipping ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Sello
          </button>
        </div>
      </div>

      {/* Contenedor 3D de la moneda */}
      <div
        className="w-36 h-36 relative my-2 cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={handleFlipCoin}
        title="Haz clic para lanzar la moneda"
      >
        <div
          className="w-full h-full relative rounded-full transition-transform duration-[1400ms] ease-out"
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            transform: `rotateY(${coinRotation}deg)`,
            WebkitTransform: `rotateY(${coinRotation}deg)`
          }}
        >
          {/* LADO CARA */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden shadow-xl bg-amber-700"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg) translateZ(1px)',
              WebkitTransform: 'rotateY(0deg) translateZ(1px)'
            }}
          >
            <CoinFaceHeads />
          </div>

          {/* LADO SELLO */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden shadow-xl bg-slate-800"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(1px)',
              WebkitTransform: 'rotateY(180deg) translateZ(1px)'
            }}
          >
            <CoinFaceTails />
          </div>
        </div>
      </div>

      {/* Marcador */}
      <div className="flex items-center justify-center gap-3 my-1.5 text-xs font-bold">
        <span className="text-amber-500">Cara: {headsCount}</span>
        <span className="text-gray-300 dark:text-gray-700">•</span>
        <span className="text-slate-500 dark:text-slate-400">Sello: {tailsCount}</span>
      </div>

      {/* Botón Lanzar */}
      <button
        type="button"
        disabled={isFlipping}
        onClick={handleFlipCoin}
        className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
      >
        <Coins size={14} />
        {isFlipping ? '¡Girando...!' : '¡Lanzar Moneda!'}
      </button>
    </div>
  );
};

// =========================================================================
// TEMPORIZADOR FLOTANTE COMPONENT
// =========================================================================
export const FloatingTimer = ({ isDarkMode = false, onTimerUpdate = null }) => {
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown' | 'stopwatch'
  const [totalSecondsSet, setTotalSecondsSet] = useState(300); // 5 min
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  const applyCustomTimer = useCallback((detail) => {
    if (detail && Number(detail.totalSeconds) > 0) {
      const secs = Math.max(1, Math.min(86400, Math.round(Number(detail.totalSeconds))));
      setTimerMode('countdown');
      setTotalSecondsSet(secs);
      setSecondsRemaining(secs);
      setIsTimerFinished(false);
      setIsTimerRunning(detail.autoStart !== false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.__englishTechPendingTimer) {
      applyCustomTimer(window.__englishTechPendingTimer);
      window.__englishTechPendingTimer = null;
    }
    const handler = (ev) => {
      if (ev?.detail) applyCustomTimer(ev.detail);
    };
    window.addEventListener('englishTech:setTimer', handler);
    return () => window.removeEventListener('englishTech:setTimer', handler);
  }, [applyCustomTimer]);

  // Broadcast current timer status (e.g. for minimized pill badge)
  useEffect(() => {
    if (onTimerUpdate) {
      const formatted = timerMode === 'countdown'
        ? `${Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`
        : `${Math.floor(stopwatchSeconds / 60).toString().padStart(2, '0')}:${(stopwatchSeconds % 60).toString().padStart(2, '0')}`;
      onTimerUpdate({ formatted, isRunning: isTimerRunning, isFinished: isTimerFinished });
    }
  }, [secondsRemaining, stopwatchSeconds, timerMode, isTimerRunning, isTimerFinished, onTimerUpdate]);

  // Countdown Interval
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerMode === 'countdown') {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsTimerFinished(true);
            playAlarmSound();
            try {
              confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
            } catch (e) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning, timerMode]);

  // Stopwatch Interval
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerMode === 'stopwatch') {
      interval = setInterval(() => {
        setStopwatchSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning, timerMode]);

  const toggleRun = () => {
    if (timerMode === 'countdown' && secondsRemaining === 0) {
      setSecondsRemaining(totalSecondsSet);
      setIsTimerFinished(false);
    }
    setIsTimerRunning(prev => !prev);
    playTone(550, 'sine', 0.05);
  };

  const handleReset = () => {
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    if (timerMode === 'countdown') {
      setSecondsRemaining(totalSecondsSet);
    } else {
      setStopwatchSeconds(0);
    }
    playTone(400, 'sine', 0.05);
  };

  const formatTimerDigits = (secs) => {
    const safe = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = (totalSecondsSet > 0)
    ? Math.min(100, Math.max(0, ((totalSecondsSet - secondsRemaining) / totalSecondsSet) * 100))
    : 0;

  return (
    <div className="w-full max-w-[290px] mx-auto flex flex-col items-center text-center select-none">
      {/* Selector de modo */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-3">
        <button
          type="button"
          onClick={() => { setTimerMode('countdown'); setIsTimerRunning(false); }}
          className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
            timerMode === 'countdown'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Temporizador
        </button>
        <button
          type="button"
          onClick={() => { setTimerMode('stopwatch'); setIsTimerRunning(false); }}
          className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
            timerMode === 'stopwatch'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Cronómetro
        </button>
      </div>

      {/* Reloj con anillo de progreso */}
      <div className="relative w-40 h-40 flex items-center justify-center my-1">
        {timerMode === 'countdown' && (
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-300 ${
                isTimerFinished
                  ? 'stroke-red-500 animate-pulse'
                  : secondsRemaining <= 10
                    ? 'stroke-orange-500'
                    : 'stroke-amber-500'
              }`}
              strokeWidth="6"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 - (276.46 * (100 - progressPercent)) / 100}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black font-mono tracking-tight ${
            isTimerFinished
              ? 'text-red-500 animate-bounce'
              : isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {timerMode === 'countdown' ? formatTimerDigits(secondsRemaining) : formatTimerDigits(stopwatchSeconds)}
          </span>
          <span className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
            {isTimerFinished ? '¡Terminado!' : isTimerRunning ? 'En marcha' : 'Pausado'}
          </span>
        </div>
      </div>

      {/* Botones de presets */}
      {timerMode === 'countdown' && (
        <div className="flex items-center gap-1.5 my-2">
          {[1, 3, 5, 10].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setTotalSecondsSet(mins * 60);
                setSecondsRemaining(mins * 60);
                setIsTimerRunning(false);
                setIsTimerFinished(false);
                playTone(600, 'sine', 0.04);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 active:scale-95 transition-transform"
            >
              +{mins}m
            </button>
          ))}
        </div>
      )}

      {/* Botones de control principal */}
      <div className="w-full flex items-center justify-center gap-2 mt-2">
        <button
          type="button"
          onClick={toggleRun}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
            isTimerRunning
              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
          }`}
        >
          {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={`px-3 py-2.5 rounded-xl border text-xs font-bold active:scale-95 transition-all ${
            isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
          }`}
          title="Reiniciar"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// VENTANA FLOTANTE DRAGGABLE (SHELL)
// =========================================================================
export const FloatingWindow = ({
  toolId,
  title,
  icon: IconComponent,
  accentColor = 'text-amber-500',
  isDarkMode = false,
  onClose,
  onMinimize,
  onBringToFront,
  zIndex = 95,
  initialPosition = { x: 40, y: 100 },
  children
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });
  const windowRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    onBringToFront?.();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button')) return;
    onBringToFront?.();
    const touch = e.touches?.[0];
    if (!touch) return;
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      const width = windowRef.current?.offsetWidth || 300;
      const height = windowRef.current?.offsetHeight || 380;
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(10, window.innerHeight - height - 10);

      const nextX = Math.min(maxX, Math.max(10, dragRef.current.initialPosX + deltaX));
      const nextY = Math.min(maxY, Math.max(10, dragRef.current.initialPosY + deltaY));
      setPosition({ x: nextX, y: nextY });
    };

    const handleTouchMove = (e) => {
      if (!isDragging || !dragRef.current) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      const deltaX = touch.clientX - dragRef.current.startX;
      const deltaY = touch.clientY - dragRef.current.startY;
      
      const width = windowRef.current?.offsetWidth || 300;
      const height = windowRef.current?.offsetHeight || 380;
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(10, window.innerHeight - height - 10);

      const nextX = Math.min(maxX, Math.max(10, dragRef.current.initialPosX + deltaX));
      const nextY = Math.min(maxY, Math.max(10, dragRef.current.initialPosY + deltaY));
      setPosition({ x: nextX, y: nextY });
    };

    const handleStopDrag = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleStopDrag);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleStopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleStopDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleStopDrag);
    };
  }, [isDragging]);

  return (
    <div
      ref={windowRef}
      onMouseDown={onBringToFront}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex
      }}
      className={`w-[310px] sm:w-[325px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-shadow animate-in zoom-in-95 duration-150 ${
        isDarkMode
          ? 'bg-gray-900/95 border-gray-700/90 shadow-black/80 backdrop-blur-md'
          : 'bg-white/95 border-gray-200/90 shadow-2xl backdrop-blur-md'
      }`}
    >
      {/* Barra de título y arrastre */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`px-3.5 py-2.5 border-b flex items-center justify-between cursor-grab active:cursor-grabbing select-none ${
          isDarkMode ? 'bg-gray-800/90 border-gray-700/80 text-white' : 'bg-gray-50 border-gray-200/80 text-gray-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`${accentColor} shrink-0`}>
            <IconComponent size={16} />
          </div>
          <span className="text-xs font-black truncate">{title}</span>
        </div>

        {/* Acciones de ventana: Minimizar y Cerrar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMinimize}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
            title="Minimizar ventana"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Cerrar herramienta"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Contenido del cuerpo de la herramienta */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
        {children}
      </div>
    </div>
  );
};

// =========================================================================
// GESTOR PRINCIPAL DE HERRAMIENTAS FLOTANTES (OVERLAY)
// =========================================================================
export default function FloatingToolsOverlay({
  isDarkMode = false,
  activeTools = {},
  minimizedTools = {},
  onCloseTool = () => {},
  onToggleMinimize = () => {},
  onOpenTool = () => {}
}) {
  const [topWindowId, setTopWindowId] = useState(null);
  const [timerStatus, setTimerStatus] = useState({ formatted: '05:00', isRunning: false, isFinished: false });

  const anyMinimized = Object.entries(minimizedTools).some(([id, min]) => min && activeTools[id]);

  // Initial positions cascading
  const getInitialPos = (offsetIndex) => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const defaultX = Math.max(20, screenW - 350 - (offsetIndex * 30));
    const defaultY = 80 + (offsetIndex * 40);
    return { x: defaultX, y: defaultY };
  };

  return (
    <>
      {/* 1. VENTANAS FLOTANTES EXPANDIDAS */}
      {activeTools.timer && !minimizedTools.timer && (
        <FloatingWindow
          toolId="timer"
          title="Temporizador"
          icon={Timer}
          accentColor="text-amber-500"
          isDarkMode={isDarkMode}
          onClose={() => onCloseTool('timer')}
          onMinimize={() => onToggleMinimize('timer')}
          onBringToFront={() => setTopWindowId('timer')}
          zIndex={topWindowId === 'timer' ? 100 : 96}
          initialPosition={getInitialPos(0)}
        >
          <FloatingTimer
            isDarkMode={isDarkMode}
            onTimerUpdate={setTimerStatus}
          />
        </FloatingWindow>
      )}

      {activeTools.coin && !minimizedTools.coin && (
        <FloatingWindow
          toolId="coin"
          title="Moneda"
          icon={Coins}
          accentColor="text-orange-500"
          isDarkMode={isDarkMode}
          onClose={() => onCloseTool('coin')}
          onMinimize={() => onToggleMinimize('coin')}
          onBringToFront={() => setTopWindowId('coin')}
          zIndex={topWindowId === 'coin' ? 100 : 97}
          initialPosition={getInitialPos(1)}
        >
          <FloatingCoin isDarkMode={isDarkMode} />
        </FloatingWindow>
      )}

      {activeTools.calculator && !minimizedTools.calculator && (
        <FloatingWindow
          toolId="calculator"
          title="Calculadora"
          icon={Calculator}
          accentColor="text-indigo-500"
          isDarkMode={isDarkMode}
          onClose={() => onCloseTool('calculator')}
          onMinimize={() => onToggleMinimize('calculator')}
          onBringToFront={() => setTopWindowId('calculator')}
          zIndex={topWindowId === 'calculator' ? 100 : 98}
          initialPosition={getInitialPos(2)}
        >
          <SimpleCalculator isDarkMode={isDarkMode} isFloating={true} />
        </FloatingWindow>
      )}

      {/* 2. DOCK DE PASTILLAS MINIMIZADAS (ESQUINA INFERIOR IZQUIERDA) */}
      {anyMinimized && (
        <div className="fixed bottom-20 left-3 sm:bottom-6 sm:left-6 z-[95] flex flex-col items-start gap-2">
          {activeTools.timer && minimizedTools.timer && (
            <div className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 ${
              isDarkMode ? 'bg-gray-900/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-900'
            }`}>
              <button
                type="button"
                onClick={() => onToggleMinimize('timer')}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-amber-500 transition-colors"
                title="Restaurar Temporizador"
              >
                <Timer size={14} className={timerStatus.isRunning ? 'text-amber-500 animate-pulse' : 'text-amber-500'} />
                <span>Temporizador: {timerStatus.formatted}</span>
              </button>
              <button
                type="button"
                onClick={() => onCloseTool('timer')}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Cerrar"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {activeTools.coin && minimizedTools.coin && (
            <div className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 ${
              isDarkMode ? 'bg-gray-900/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-900'
            }`}>
              <button
                type="button"
                onClick={() => onToggleMinimize('coin')}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-orange-500 transition-colors"
                title="Restaurar Moneda"
              >
                <Coins size={14} className="text-orange-500" />
                <span>Moneda 3D</span>
              </button>
              <button
                type="button"
                onClick={() => onCloseTool('coin')}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Cerrar"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {activeTools.calculator && minimizedTools.calculator && (
            <div className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 ${
              isDarkMode ? 'bg-gray-900/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-900'
            }`}>
              <button
                type="button"
                onClick={() => onToggleMinimize('calculator')}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-indigo-500 transition-colors"
                title="Restaurar Calculadora"
              >
                <Calculator size={14} className="text-indigo-500" />
                <span>Calculadora</span>
              </button>
              <button
                type="button"
                onClick={() => onCloseTool('calculator')}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Cerrar"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

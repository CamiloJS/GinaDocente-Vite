// src/components/TeacherToolsTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { speakText } from '../utils/helpers.js';
import {
  Timer, Dices, Coins, Shuffle, Play, Pause, RotateCcw, Plus, Minus,
  UsersGroupIcon, Users, CheckCheck, Copy, Volume2, VolumeX, Sparkles,
  ArrowRightIcon, CheckCircle2, ChevronRight, ChevronLeft, BookOpen, X, Wrench, Clock,
  Target, Bell
} from './Icons.jsx';
import OvaStudioTool from './OvaStudioTool.jsx';

// Shared AudioContext Singleton to avoid hitting browser hardware limits
let sharedAudioCtx = null;
const getAudioContext = () => {
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

// Web Audio API Sound Synthesizer for 100% reliable, zero-latency sounds
const playTone = (frequency, type = 'sine', duration = 0.15, gainVal = 0.3) => {
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

// Loud beep alarm for timer completion (3 loud series)
const playAlarmSound = () => {
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

// Coin flip whoosh & landing sound
const playCoinSound = () => {
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
    
    setTimeout(() => {
      playTone(1760, 'triangle', 0.4, 0.35);
      setTimeout(() => playTone(2637, 'sine', 0.5, 0.25), 80);
    }, 1200);
  } catch (e) {}
};

// Roulette tick sound
const playRouletteTick = () => {
  playTone(800 + Math.random() * 200, 'triangle', 0.04, 0.12);
};

// =========================================================================
// CUSTOM VECTOR COIN DESIGNS (PROFESSIONAL RELIEF MINTED COINS)
// =========================================================================

// CARA / HEADS - Golden Minted Coin Vector (Fully opaque base to prevent 3D bleed)
const CoinFaceHeads = () => (
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

// SELLO / TAILS - Silver & Platinum Minted Emblem Vector (Fully opaque base)
const CoinFaceTails = () => (
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

// Mini Coin Badge Icon for Stats & Chips
const MiniCoinBadge = ({ side = 'heads', size = 18 }) => {
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

const TEAM_COOL_NAMES = [
  'Team Phoenix', 'Team Titan', 'Team Vortex', 'Team Cyber', 
  'Team Thunder', 'Team Aurora', 'Team Nexus', 'Team Falcon', 
  'Team Galaxy', 'Team Spartan', 'Team Alpha', 'Team Beta',
  'Team Delta', 'Team Omega', 'Team Stellar', 'Team Eclipse'
];

const WHEEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'
];

export default function TeacherToolsTab({
  academicGroups = [],
  userMappings = {},
  isDarkMode = false,
  showMessage = () => {},
  db = null,
  appId = null,
  user = null,
  role = 'teacher'
}) {
  const [activeSubTab, setActiveSubTab] = useState('timer'); // 'timer' | 'picker' | 'groups' | 'coin' | 'ova'
  const tabsScrollRef = useRef(null);

  const scrollTabs = (dir) => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: dir === 'left' ? -220 : 220,
        behavior: 'smooth'
      });
    }
  };

  // ==========================================
  // 1. TEMPORIZADOR Y CRONÓMETRO STATE
  // ==========================================
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown' | 'stopwatch'
  const [targetMinutes, setTargetMinutes] = useState(3);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [totalSecondsSet, setTotalSecondsSet] = useState(180);
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  
  // Stopwatch state
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchLaps, setStopwatchLaps] = useState([]);
  
  const timerIntervalRef = useRef(null);
  const stopwatchIntervalRef = useRef(null);

  // Countdown timer tick effect (Intervalo continuo exacto)
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  // Manejo seguro de finalización del temporizador
  useEffect(() => {
    if (isTimerRunning && secondsRemaining === 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsTimerRunning(false);
      setIsTimerFinished(true);
      playAlarmSound();
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }
  }, [isTimerRunning, secondsRemaining]);

  // Stopwatch tick effect
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchMs(prev => prev + 10);
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    }
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    };
  }, [isStopwatchRunning]);

  const setTimerPreset = (mins, secs = 0) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setTargetMinutes(mins);
    setTargetSeconds(secs);
    const total = mins * 60 + secs;
    setTotalSecondsSet(total);
    setSecondsRemaining(total);
    playTone(600, 'sine', 0.08);
  };

  const handleStartTimer = () => {
    if (secondsRemaining <= 0) {
      const configuredTime = (targetMinutes * 60) + targetSeconds;
      const initialTime = configuredTime > 0 ? configuredTime : 180;
      setSecondsRemaining(initialTime);
      setTotalSecondsSet(initialTime);
    }
    setIsTimerFinished(false);
    setIsTimerRunning(true);
    playTone(700, 'sine', 0.1);
  };

  const handlePauseTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    playTone(500, 'sine', 0.1);
  };

  const handleResetTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    const configuredTime = (targetMinutes * 60) + targetSeconds;
    const initialTime = configuredTime > 0 ? configuredTime : 180;
    setTotalSecondsSet(initialTime);
    setSecondsRemaining(initialTime);
    playTone(450, 'sine', 0.1);
  };

  const handleAddTimerTime = (addSecs) => {
    setSecondsRemaining(prev => {
      const next = prev + addSecs;
      setTotalSecondsSet(t => Math.max(t, next));
      return next;
    });
    playTone(800, 'sine', 0.08);
  };

  // Stopwatch controls
  const handleStartStopwatch = () => {
    setIsStopwatchRunning(true);
    playTone(700, 'sine', 0.1);
  };
  const handlePauseStopwatch = () => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }
    setIsStopwatchRunning(false);
    playTone(500, 'sine', 0.1);
  };
  const handleResetStopwatch = () => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }
    setIsStopwatchRunning(false);
    setStopwatchMs(0);
    setStopwatchLaps([]);
    playTone(450, 'sine', 0.1);
  };
  const handleAddLap = () => {
    if (!isStopwatchRunning && stopwatchMs === 0) return;
    setStopwatchLaps(prev => [stopwatchMs, ...prev]);
    playTone(900, 'triangle', 0.1);
  };

  // ==========================================
  // 2. RULETA / ALEATORIO STATE
  // ==========================================
  const [selectedPickerGroupId, setSelectedPickerGroupId] = useState(academicGroups[0]?.id || '');
  const [customNamesText, setCustomNamesText] = useState('');
  const [useCustomNames, setUseCustomNames] = useState(false);
  const [excludedStudents, setExcludedStudents] = useState(new Set());
  const [pickedWinner, setPickedWinner] = useState(null);
  const rouletteTickRef = useRef(null);
  const rouletteTimeoutRef = useRef(null);
  const coinTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Sincronizar selección de grupo por defecto si academicGroups carga asíncronamente
  useEffect(() => {
    if (!selectedPickerGroupId && academicGroups && academicGroups.length > 0) {
      setSelectedPickerGroupId(academicGroups[0].id);
    }
  }, [academicGroups, selectedPickerGroupId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
      if (rouletteTickRef.current) clearInterval(rouletteTickRef.current);
      if (rouletteTimeoutRef.current) clearTimeout(rouletteTimeoutRef.current);
      if (coinTimeoutRef.current) clearTimeout(coinTimeoutRef.current);
    };
  }, []);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  const getGroupStudentCount = (group) => {
    if (!group?.members) return 0;
    const list = Array.isArray(group.members) ? group.members : (typeof group.members === 'object' ? Object.keys(group.members) : []);
    return list.filter(m => m !== 'teacher').length;
  };

  const getActiveStudentList = () => {
    if (useCustomNames) {
      return customNamesText
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean)
        .map((name, i) => ({ id: `custom_${i}`, name }));
    }
    const currentGrp = academicGroups.find(g => g.id === selectedPickerGroupId);
    if (!currentGrp) return [];
    const members = Array.isArray(currentGrp.members) ? currentGrp.members : (currentGrp.members && typeof currentGrp.members === 'object' ? Object.keys(currentGrp.members) : []);
    const seen = new Set();
    const result = [];
    members.filter(m => m !== 'teacher').forEach(m => {
      const u = userMappings[m] || {};
      const resolvedName = (u.fullName || u.name || m).trim().toLowerCase();
      const resolvedKey = (u.uid || u.email || m).trim().toLowerCase().replace('@', '');
      const dedupeKey = resolvedKey || resolvedName;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        result.push({
          id: m,
          name: u.fullName || u.name || m,
          avatarUrl: u.profilePicUrl || null
        });
      }
    });
    return result;
  };

  const eligibleStudents = getActiveStudentList().filter(s => !excludedStudents.has(s.id));

  const handleSpinWheel = () => {
    if (eligibleStudents.length === 0) {
      showMessage('No hay estudiantes disponibles para girar la ruleta.');
      return;
    }
    if (isSpinning) return;

    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    setIsSpinning(true);
    setPickedWinner(null);

    const randomIndex = Math.floor(Math.random() * eligibleStudents.length);
    const winner = eligibleStudents[randomIndex];
    const segmentAngle = 360 / eligibleStudents.length;

    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetAngle = 360 - (randomIndex * segmentAngle + segmentAngle / 2);
    const newRotation = wheelRotation + extraSpins + (targetAngle - (wheelRotation % 360));

    setWheelRotation(newRotation);

    let ticks = 0;
    rouletteTickRef.current = setInterval(() => {
      playRouletteTick();
      ticks++;
      if (ticks > 25) clearInterval(rouletteTickRef.current);
    }, 140);

    rouletteTimeoutRef.current = setTimeout(() => {
      clearInterval(rouletteTickRef.current);
      setIsSpinning(false);
      setPickedWinner(winner);
      playTone(1046.5, 'triangle', 0.25, 0.35);
      setTimeout(() => playTone(1318.5, 'sine', 0.35, 0.3), 120);
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}

      if (winner?.name) {
        setTimeout(() => {
          speakText(`Estudiante seleccionado: ${winner.name}`);
        }, 400);
      }
    }, 4000);
  };

  const handleExcludeWinner = () => {
    if (pickedWinner) {
      setExcludedStudents(prev => new Set([...prev, pickedWinner.id]));
      setPickedWinner(null);
      showMessage(`"${pickedWinner.name}" excluido de las siguientes rondas.`);
    }
  };

  const handleResetExcluded = () => {
    setExcludedStudents(new Set());
    showMessage('Lista de estudiantes restaurada por completo.');
  };

  // ==========================================
  // 3. CREADOR DE GRUPOS STATE
  // ==========================================
  const [selectedTeamGroupId, setSelectedTeamGroupId] = useState(academicGroups[0]?.id || '');
  const [groupDivisionMode, setGroupDivisionMode] = useState('bySize');
  const [groupSizeValue, setGroupSizeValue] = useState(3);
  const [groupCountValue, setGroupCountValue] = useState(3);
  const [generatedTeams, setGeneratedTeams] = useState([]);

  // Sincronizar selección de grupo por defecto para el armador de equipos si carga asíncronamente
  useEffect(() => {
    if (!selectedTeamGroupId && academicGroups && academicGroups.length > 0) {
      setSelectedTeamGroupId(academicGroups[0].id);
    }
  }, [academicGroups, selectedTeamGroupId]);

  const handleGenerateTeams = () => {
    const currentGrp = academicGroups.find(g => g.id === selectedTeamGroupId);
    const rawMembers = Array.isArray(currentGrp?.members) ? currentGrp.members : (currentGrp?.members && typeof currentGrp.members === 'object' ? Object.keys(currentGrp.members) : []);
    const members = rawMembers.filter(m => m !== 'teacher');
    
    if (members.length === 0) {
      showMessage('Este grupo no tiene estudiantes inscritos.');
      return;
    }

    const seenStudentKeys = new Set();
    const students = [];
    members.forEach(m => {
      const u = userMappings[m] || {};
      const resolvedName = (u.fullName || u.name || m).trim().toLowerCase();
      const resolvedKey = (u.uid || u.email || m).trim().toLowerCase().replace('@', '');
      const dedupeKey = resolvedKey || resolvedName;
      if (!seenStudentKeys.has(dedupeKey)) {
        seenStudentKeys.add(dedupeKey);
        students.push({
          id: m,
          name: u.fullName || u.name || m,
          avatarUrl: u.profilePicUrl || null
        });
      }
    });

    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let teamsCount = 1;
    const parsedSize = parseInt(groupSizeValue, 10);
    const parsedCount = parseInt(groupCountValue, 10);
    if (groupDivisionMode === 'bySize') {
      const size = (Number.isFinite(parsedSize) && parsedSize >= 1) ? parsedSize : 1;
      teamsCount = Math.max(1, Math.ceil(shuffled.length / size));
    } else {
      const count = (Number.isFinite(parsedCount) && parsedCount >= 1) ? parsedCount : 1;
      teamsCount = Math.max(1, Math.min(count, shuffled.length || 1));
    }

    const teams = Array.from({ length: Math.max(1, teamsCount) }, (_, i) => ({
      id: `team_${i + 1}`,
      name: TEAM_COOL_NAMES[i % TEAM_COOL_NAMES.length] || `Equipo ${i + 1}`,
      members: []
    }));

    shuffled.forEach((student, index) => {
      const teamIndex = index % teams.length;
      if (teams[teamIndex]) {
        teams[teamIndex].members.push(student);
      }
    });

    setGeneratedTeams(teams);
    playTone(850, 'sine', 0.15);
    confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    showMessage(`${teams.length} grupos armados con éxito.`);
  };

  const handleCopyTeamsList = () => {
    if (generatedTeams.length === 0) return;
    const currentGrp = academicGroups.find(g => g.id === selectedTeamGroupId);
    let text = `GRUPOS ASIGNADOS - ${currentGrp?.name || 'Materia'}\n\n`;
    generatedTeams.forEach(t => {
      text += `[${t.name}] (${t.members.length} integrantes):\n`;
      t.members.forEach((m, idx) => {
        text += `  ${idx + 1}. ${m.name}\n`;
      });
      text += `\n`;
    });
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).catch(() => {}); }
    showMessage('Lista de grupos copiada al portapapeles.');
  };

  // ==========================================
  // 4. CARA O SELLO (3D COIN FLIP) STATE
  // ==========================================
  const [coinSide, setCoinSide] = useState('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinRotation, setCoinRotation] = useState(0);
  const [coinHistory, setCoinHistory] = useState([]);

  const handleFlipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    playCoinSound();

    const isHeads = Math.random() < 0.5;
    const outcome = isHeads ? 'heads' : 'tails';

    // Rotación física en 3D: mínimo 6 vueltas completas + cara correspondiente
    const fullSpins = (6 + Math.floor(Math.random() * 4)) * 360;
    const targetFaceAngle = isHeads ? 0 : 180;
    const currentNormalized = (coinRotation % 360 + 360) % 360;
    const rotationDelta = fullSpins + (targetFaceAngle - currentNormalized);
    const newTotalRot = coinRotation + rotationDelta;
    
    setCoinRotation(newTotalRot);

    if (coinTimeoutRef.current) clearTimeout(coinTimeoutRef.current);
    coinTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setCoinSide(outcome);
      setIsFlipping(false);
      setCoinHistory(prev => [outcome, ...prev].slice(0, 15));
      try {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }, 1400);
  };

  // Previsualización directa
  const handlePreviewSide = (side) => {
    if (isFlipping) return;
    setCoinSide(side);
    setCoinRotation(side === 'heads' ? 0 : 180);
    playTone(side === 'heads' ? 700 : 550, 'sine', 0.08);
  };

  const headsCount = coinHistory.filter(c => c === 'heads').length;
  const tailsCount = coinHistory.filter(c => c === 'tails').length;

  const formatTimerDigits = (secs) => {
    const validSecs = (Number.isFinite(secs) && secs >= 0) ? Math.floor(secs) : 0;
    const m = Math.floor(validSecs / 60);
    const s = validSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatStopwatchDigits = (ms) => {
    const validMs = (Number.isFinite(ms) && ms >= 0) ? Math.floor(ms) : 0;
    const minutes = Math.floor(validMs / 60000);
    const seconds = Math.floor((validMs % 60000) / 1000);
    const centiseconds = Math.floor((validMs % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  };

  const timerProgressPercent = (Number.isFinite(totalSecondsSet) && totalSecondsSet > 0)
    ? Math.min(100, Math.max(0, ((totalSecondsSet - (Number.isFinite(secondsRemaining) ? secondsRemaining : 0)) / totalSecondsSet) * 100))
    : 0;

  const TOOL_TABS = [
    { id: 'timer', label: 'Temporizador', icon: Timer, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white', badge: 'Alarma' },
    { id: 'picker', label: 'Aleatorio', icon: Dices, color: 'text-purple-500', activeBg: 'bg-purple-600 text-white', badge: 'Ruleta' },
    { id: 'groups', label: 'Grupos', icon: UsersGroupIcon, color: 'text-teal-500', activeBg: 'bg-teal-600 text-white', badge: 'Equipos' },
    { id: 'coin', label: 'Moneda', icon: Coins, color: 'text-orange-500', activeBg: 'bg-orange-500 text-white', badge: 'Cara/Sello' },
    { id: 'ova', label: 'OVA Studio', icon: BookOpen, color: 'text-rose-500', activeBg: 'bg-rose-600 text-white', badge: 'Estudio OVA' }
  ];

  return (
    <div className={`${activeSubTab === 'ova' ? 'w-full max-w-7xl px-0 sm:px-2 space-y-2.5 sm:space-y-3.5 pb-24 sm:pb-16' : 'max-w-4xl px-2 sm:px-4 space-y-4 sm:space-y-5 pb-16'} mx-auto animate-in fade-in duration-200`}>
      
      {/* 1. SECCIÓN DE NAVEGACIÓN DE HERRAMIENTAS */}
      {activeSubTab === 'ova' ? (
        <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 ${
          isDarkMode ? 'bg-gray-800/95 border-gray-700/80' : 'bg-white border-gray-200/90'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-brand-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <BookOpen size={14} />
            </div>
            <span className={`text-xs font-black truncate hidden xs:inline ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Herramientas
            </span>
            <ChevronRight size={13} className="text-gray-400 shrink-0 hidden xs:inline" />
            <span className="text-xs font-black text-rose-500 truncate">OVA Studio</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 justify-end">
            {TOOL_TABS.map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveSubTab(tab.id); playTone(600, 'sine', 0.05); }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${
                    isActive
                      ? (tab.activeBg + ' shadow-xs')
                      : (isDarkMode ? 'bg-gray-900/60 text-gray-300 hover:bg-gray-700/50' : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200/90')
                  }`}
                  title={tab.label}
                >
                  <IconComponent size={13} />
                  <span className={isActive ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`p-3.5 sm:p-4 rounded-3xl border shadow-xs ${
          isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
        }`}>
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Wrench size={16} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-sm sm:text-base font-black truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Herramientas
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                  Actividades, dinámicas, Objetos Virtuales de Aprendizaje y tiempo
                </p>
              </div>
            </div>
          </div>

          {/* DESLIZADOR HORIZONTAL DE HERRAMIENTAS */}
          <div className="relative flex items-center group">
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-xs shrink-0 mr-1.5 z-10 transition hover:scale-105 active:scale-95"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={tabsScrollRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x w-full py-0.5"
            >
              {TOOL_TABS.map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveSubTab(tab.id); playTone(600, 'sine', 0.05); }}
                    className={`min-w-[135px] sm:min-w-[155px] flex-1 shrink-0 snap-start p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 shadow-2xs hover:scale-[1.01] active:scale-95 ${
                      isActive
                        ? (tab.activeBg + ' border-transparent shadow-md')
                        : (isDarkMode ? 'bg-gray-900/60 border-gray-700/70 text-gray-300 hover:bg-gray-700/50' : 'bg-gray-50/80 border-gray-200/80 text-gray-700 hover:bg-gray-100')
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/20 text-white' : tab.color + ' bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <IconComponent size={18} />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200/60 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {tab.badge}
                      </span>
                    </div>
                    <span className="font-extrabold text-xs sm:text-sm tracking-tight leading-tight whitespace-nowrap">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-xs shrink-0 ml-1.5 z-10 transition hover:scale-105 active:scale-95"
              title="Desplazar a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SECCIÓN: TEMPORIZADOR Y CRONÓMETRO */}
      {/* ========================================================================= */}
      {activeSubTab === 'timer' && (
        <div className="space-y-4 animate-in fade-in">
          <div className={`p-5 sm:p-7 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            {/* Toggle de Modo Compacto */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-4">
              <button
                type="button"
                onClick={() => { setTimerMode('countdown'); playTone(500, 'sine', 0.05); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  timerMode === 'countdown'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Temporizador
              </button>
              <button
                type="button"
                onClick={() => { setTimerMode('stopwatch'); playTone(500, 'sine', 0.05); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  timerMode === 'stopwatch'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Cronómetro
              </button>
            </div>

            {/* MODO TEMPORIZADOR */}
            {timerMode === 'countdown' ? (
              <div className="flex flex-col items-center w-full max-w-md">
                {/* Circular Progress Display */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-gray-100 dark:stroke-gray-700/60"
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
                      strokeDashoffset={276.46 - (276.46 * (100 - timerProgressPercent)) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                      isTimerFinished 
                        ? 'text-red-500 animate-bounce' 
                        : isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatTimerDigits(secondsRemaining)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                      {isTimerFinished ? '¡Tiempo cumplido!' : isTimerRunning ? 'En progreso...' : 'Pausado'}
                    </span>
                  </div>
                </div>

                {/* Barra de Acciones Principales */}
                <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap justify-center w-full">
                  {!isTimerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="flex-1 min-w-[120px] py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Play size={18} /> Iniciar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePauseTimer}
                      className="flex-1 min-w-[120px] py-3 px-5 rounded-2xl bg-gray-700 hover:bg-gray-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Pause size={18} /> Pausar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="py-3 px-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-2xs flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer active:scale-95"
                    title="Restablecer temporizador"
                  >
                    <RotateCcw size={16} />
                    <span>Restablecer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddTimerTime(60)}
                    className="px-3 py-3 rounded-2xl text-xs font-bold border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-all shadow-2xs"
                  >
                    +1 min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTimerTime(30)}
                    className="px-3 py-3 rounded-2xl text-xs font-bold border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-all shadow-2xs"
                  >
                    +30 s
                  </button>
                </div>
              </div>
            ) : (
              /* MODO CRONÓMETRO */
              <div className="flex flex-col items-center w-full max-w-md py-4">
                <div className="my-6">
                  <span className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatStopwatchDigits(stopwatchMs)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap justify-center w-full">
                  {!isStopwatchRunning ? (
                    <button
                      type="button"
                      onClick={handleStartStopwatch}
                      className="flex-1 min-w-[120px] py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Play size={18} /> Iniciar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePauseStopwatch}
                      className="flex-1 min-w-[120px] py-3 px-5 rounded-2xl bg-gray-700 hover:bg-gray-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Pause size={18} /> Pausar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddLap}
                    disabled={stopwatchMs === 0}
                    className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-all text-xs font-bold disabled:opacity-50 shadow-2xs"
                  >
                    Vuelta
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStopwatch}
                    className="py-3 px-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-2xs flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer active:scale-95"
                    title="Restablecer cronómetro"
                  >
                    <RotateCcw size={16} />
                    <span>Restablecer</span>
                  </button>
                </div>

                {stopwatchLaps.length > 0 && (
                  <div className="mt-5 w-full max-h-36 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-2xl p-2 bg-gray-50/50 dark:bg-gray-900/40">
                    <table className="w-full text-xs">
                      <tbody>
                        {stopwatchLaps.map((lapTime, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800/60 last:border-none">
                            <td className="py-1 px-2 font-bold text-gray-400">Vuelta {stopwatchLaps.length - i}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatStopwatchDigits(lapTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chips de Tiempos Rápidos y Ajuste Manual Compacto */}
          {timerMode === 'countdown' && (
            <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs ${
              isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
            }`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Tiempos Rápidos
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Bell size={12} /> Alarma sonora al finalizar
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { label: '30 seg', m: 0, s: 30 },
                  { label: '1 min', m: 1, s: 0 },
                  { label: '2 min', m: 2, s: 0 },
                  { label: '3 min', m: 3, s: 0 },
                  { label: '5 min', m: 5, s: 0 },
                  { label: '10 min', m: 10, s: 0 },
                  { label: '15 min', m: 15, s: 0 },
                  { label: '20 min', m: 20, s: 0 },
                  { label: '30 min', m: 30, s: 0 },
                  { label: '45 min', m: 45, s: 0 }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTimerPreset(item.m, item.s)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      targetMinutes === item.m && targetSeconds === item.s && timerMode === 'countdown'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs scale-[1.02]'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Personalizado:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={targetMinutes}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setTargetMinutes(val);
                      setTimerPreset(val, targetSeconds);
                    }}
                    className="w-14 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Min"
                  />
                  <span className="font-bold text-gray-400">m</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={targetSeconds}
                    onChange={(e) => {
                      const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                      setTargetSeconds(val);
                      setTimerPreset(targetMinutes, val);
                    }}
                    className="w-14 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Seg"
                  />
                  <span className="font-bold text-gray-400">s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SECCIÓN: ALEATORIO / RULETA DE ESTUDIANTES */}
      {/* ========================================================================= */}
      {activeSubTab === 'picker' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in">
          <div className={`md:col-span-7 p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Dices size={15} /> Ruleta de Participación
              </span>
              <span className="text-xs font-bold text-gray-400">
                {eligibleStudents.length} disponibles
              </span>
            </div>

            <div className="relative w-56 h-56 sm:w-72 sm:h-72 my-3 flex items-center justify-center">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-600 drop-shadow-md"></div>
              </div>

              <div 
                className="w-full h-full rounded-full shadow-xl transition-transform duration-[4000ms] ease-out relative overflow-hidden border-4 border-white dark:border-gray-700"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                {eligibleStudents.length > 0 ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {eligibleStudents.map((st, i) => {
                      const total = eligibleStudents.length;
                      const sliceAngle = 360 / total;
                      const startAngle = i * sliceAngle;
                      const endAngle = startAngle + sliceAngle;

                      const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                      const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                      const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                      const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

                      const pathData = total === 1 
                        ? 'M 50,50 m -50,0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0'
                        : `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                      const midAngle = startAngle + sliceAngle / 2;
                      const textRadius = 32;
                      const tx = 50 + textRadius * Math.cos((Math.PI * (midAngle - 90)) / 180);
                      const ty = 50 + textRadius * Math.sin((Math.PI * (midAngle - 90)) / 180);

                      return (
                        <g key={st.id}>
                          <path d={pathData} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} />
                          <text
                            x={tx}
                            y={ty}
                            fill="#ffffff"
                            fontSize={total > 15 ? '3' : total > 8 ? '4' : '5'}
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="central"
                            transform={`rotate(${midAngle}, ${tx}, ${ty})`}
                          >
                            {st.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4 text-xs font-bold text-gray-400">
                    Sin estudiantes
                  </div>
                )}

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center font-black text-xs text-purple-600">
                  <Target size={16} />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isSpinning || eligibleStudents.length === 0}
              onClick={handleSpinWheel}
              className="mt-3 w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} /> {isSpinning ? '¡Girando ruleta...!' : '¡Girar Ruleta!'}
            </button>

            {pickedWinner && (
              <div className="mt-4 w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-purple-500/30 animate-in zoom-in-95 duration-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                  Estudiante Seleccionado:
                </span>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={18} className="text-amber-500" /> {pickedWinner.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => speakText(`Estudiante seleccionado: ${pickedWinner.name}`)}
                    className="p-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 transition-all cursor-pointer shadow-2xs"
                    title="Escuchar nombre en voz alta"
                    aria-label="Escuchar nombre en voz alta"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-center gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={handleExcludeWinner}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                  >
                    Excluir de siguiente ronda
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        try { window.speechSynthesis.cancel(); } catch (e) {}
                      }
                      setPickedWinner(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`md:col-span-5 p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col gap-3 ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                Materia / Salón:
              </label>
              <select
                value={selectedPickerGroupId}
                onChange={(e) => {
                  setSelectedPickerGroupId(e.target.value);
                  setExcludedStudents(new Set());
                  setPickedWinner(null);
                }}
                disabled={useCustomNames}
                className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
              >
                {academicGroups.length === 0 ? (
                  <option value="">Sin materias registradas</option>
                ) : (
                  academicGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({getGroupStudentCount(g)} est.)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomNames}
                  onChange={(e) => setUseCustomNames(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                Lista manual
              </label>

              {excludedStudents.size > 0 && (
                <button
                  type="button"
                  onClick={handleResetExcluded}
                  className="text-[11px] font-bold text-purple-600 hover:underline"
                >
                  Restaurar ({excludedStudents.size})
                </button>
              )}
            </div>

            {useCustomNames ? (
              <textarea
                value={customNamesText}
                onChange={(e) => setCustomNamesText(e.target.value)}
                placeholder="Un nombre por línea..."
                rows={6}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium resize-none outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <div className="flex-1 max-h-64 overflow-y-auto space-y-1 pr-1">
                {getActiveStudentList().map((st) => {
                  const isExcluded = excludedStudents.has(st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setExcludedStudents(prev => {
                          const next = new Set(prev);
                          if (next.has(st.id)) next.delete(st.id);
                          else next.add(st.id);
                          return next;
                        });
                      }}
                      className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                        isExcluded
                          ? 'bg-gray-100 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-400 line-through'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200/80 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 hover:border-purple-400'
                      }`}
                    >
                      <span className="truncate">{st.name}</span>
                      <span className="text-[9px] font-extrabold uppercase">
                        {isExcluded ? 'Excluido' : 'Activo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SECCIÓN: CREADOR DE GRUPOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'groups' && (
        <div className="space-y-4 animate-in fade-in">
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Materia / Salón:
                </label>
                <select
                  value={selectedTeamGroupId}
                  onChange={(e) => setSelectedTeamGroupId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {academicGroups.length === 0 ? (
                    <option value="">Sin materias registradas</option>
                  ) : (
                    academicGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({getGroupStudentCount(g)} est.)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Modo de división:
                </label>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setGroupDivisionMode('bySize')}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                      groupDivisionMode === 'bySize'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Por integrantes
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupDivisionMode('byCount')}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                      groupDivisionMode === 'byCount'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Por # de grupos
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  {groupDivisionMode === 'bySize' ? 'Integrantes por grupo:' : 'Cantidad de grupos:'}
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 flex-1">
                    {[2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => groupDivisionMode === 'bySize' ? setGroupSizeValue(val) : setGroupCountValue(val)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          (groupDivisionMode === 'bySize' ? groupSizeValue : groupCountValue) === val
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateTeams}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1 transition-all shrink-0 active:scale-95"
                  >
                    <Shuffle size={14} /> Armar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTADO DE GRUPOS */}
          {generatedTeams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Equipos Formados ({generatedTeams.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTeamsList}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:bg-gray-50 flex items-center gap-1 text-gray-700 dark:text-gray-200 shadow-2xs"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateTeams}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <RotateCcw size={13} /> Re-armar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {generatedTeams.map((team, idx) => (
                  <div
                    key={team.id}
                    className={`p-3.5 rounded-2xl border shadow-2xs ${
                      isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/80 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </span>
                        <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100">
                          {team.name}
                        </h4>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {team.members.length} est.
                      </span>
                    </div>

                    <ul className="space-y-1">
                      {team.members.map((st, sIdx) => (
                        <li key={st.id} className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <span className="text-[10px] font-bold text-gray-400 w-3">{sIdx + 1}.</span>
                          <span className="truncate">{st.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SECCIÓN: CARA O SELLO (3D COIN FLIP CON DISEÑO PROFESIONAL VECTORIAL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'coin' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in">
          {/* PANEL DE MONEDA 3D (7 COLS) */}
          <div className={`md:col-span-7 p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            <div className="w-full flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <Coins size={16} /> Moneda
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePreviewSide('heads')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    coinSide === 'heads' && !isFlipping ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Ver Cara
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                  type="button"
                  onClick={() => handlePreviewSide('tails')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    coinSide === 'tails' && !isFlipping ? 'bg-slate-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Ver Sello
                </button>
              </div>
            </div>

            {/* CONTENEDOR 3D DE LA MONEDA CON PERSPECTIVA REAL */}
            <div
              className="w-48 h-48 sm:w-56 sm:h-56 relative my-3 cursor-pointer select-none"
              style={{ perspective: '1200px' }}
              onClick={handleFlipCoin}
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
                {/* LADO CARA (ORO MINTED) */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden shadow-2xl bg-amber-700"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg) translateZ(1px)',
                    WebkitTransform: 'rotateY(0deg) translateZ(1px)'
                  }}
                >
                  <CoinFaceHeads />
                </div>

                {/* LADO SELLO (PLATA & PLATINO IMPERIAL MINTED) */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden shadow-2xl bg-slate-800"
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

            {/* BOTÓN LANZAR MONEDA */}
            <button
              type="button"
              disabled={isFlipping}
              onClick={handleFlipCoin}
              className="mt-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Coins size={17} /> {isFlipping ? '¡Girando en el aire...!' : '¡Lanzar Moneda!'}
            </button>
          </div>

          {/* ESTADÍSTICAS Y HISTORIAL DE LANZAMIENTOS (5 COLS) */}
          <div className={`md:col-span-5 p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col gap-3 ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200/90'
          }`}>
            <h3 className={`text-[11px] font-black uppercase tracking-wider text-gray-400`}>
              Estadísticas de Lanzamiento
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <MiniCoinBadge side="heads" size={16} />
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300">Cara</span>
                </div>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-100">{headsCount}</span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {coinHistory.length > 0 ? Math.round((headsCount / coinHistory.length) * 100) : 0}%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <MiniCoinBadge side="tails" size={16} />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Sello</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{tailsCount}</span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {coinHistory.length > 0 ? Math.round((tailsCount / coinHistory.length) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[11px] font-bold text-gray-400 block mb-1.5">
                Historial de tiros recientes:
              </span>
              {coinHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin lanzamientos aún.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {coinHistory.map((side, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 shadow-2xs ${
                        side === 'heads'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300'
                      }`}
                    >
                      <MiniCoinBadge side={side} size={13} />
                      {side === 'heads' ? 'Cara' : 'Sello'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SECCIÓN: ENGLISHTECH OVA STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === 'ova' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <OvaStudioTool
            isDarkMode={isDarkMode}
            showMessage={showMessage}
            user={user}
            role={role}
            db={db}
            appId={appId}
          />
        </div>
      )}
    </div>
  );
}

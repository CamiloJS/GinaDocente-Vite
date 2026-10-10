// src/components/KahootLiveModal.jsx
// Experiencia de Kahoot en Vivo en Pantalla Completa:
// - Sala de Espera (Lobby) con PIN en vivo y cambio de nombre/apodo libre en cualquier momento
// - Preguntas sincronizadas con el mismo tiempo para todos
// - Opciones en lista vertical (de arriba hacia abajo) con texto completo visible en el teléfono/pantalla
// - Música ambiental de tensión mientras responden y sonido de Gong/Platillo cuando todos terminan
// - Puntaje por velocidad de respuesta, racha de aciertos, mención al más rápido y Podio Final
// - Modo Repaso y Práctica Individual guardado en la publicación

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  Volume2,
  VolumeX,
  Edit3,
  CheckCircle2,
  Clock,
  Trophy,
  Zap,
  Flame,
  Users,
  Sparkles,
  BookOpen,
  RotateCcw,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Gamepad2,
  Bell,
  Lock,
  Unlock,
  Share2,
  HelpCircle,
} from './Icons.jsx';
import {
  KAHOOT_COLORS,
  KAHOOT_AVATARS,
  KAHOOT_QUESTION_TYPES,
  sanitizeKahootPlayerId,
  normalizeKahootQuestion,
  evaluateKahootAnswer,
  calculateKahootPoints,
  buildKahootLeaderboard,
  DEMO_KAHOOT_BOTS,
  buildSimulatedBotAnswer,
  canAccessKahootReview,
  buildPublicKahootUrl,
} from '../utils/kahootEngine.js';
import {
  startLobbyMusic,
  startTensionMusic,
  stopKahootMusic,
  playGongSound,
  playAnswerSelectSound,
  playRevealResultSound,
  playPodiumFanfare,
} from '../utils/kahootAudio.js';
import { containsBadWords, checkBadWordsAsync } from '../utils/helpers.js';
import { auth, signInAnonymously, doc, onSnapshot, updateDoc } from '../firebase/config.js';
import { saveDemoSandboxItem } from '../utils/demoData.js';

const KahootLiveModal = ({
  isOpen,
  onClose,
  task,
  role,
  currentUserId,
  loggedInName,
  isDemoMode = false,
  db,
  appId,
  setTasks,
  showMessage,
  initialMode = 'live', // 'live' | 'review'
  initialAvatar = '🦊',
  onProfileChange = null,
}) => {
  const isDemoTask = Boolean(
    isDemoMode || task?.isDemoCreated || (task?.id && String(task.id).startsWith('demo-'))
  );

  const safePlayerId = useMemo(
    () => sanitizeKahootPlayerId(currentUserId || loggedInName || 'student_player'),
    [currentUserId, loggedInName]
  );

  const canControlGame = role === 'teacher' || isDemoTask;

  const [liveTask, setLiveTask] = useState(task);
  const liveTaskRef = useRef(task);
  const lastSyncedStatusRef = useRef(task?.kahoot?.status);

  const syncTaskToParent = useCallback(
    (taskToSync) => {
      const target = taskToSync || liveTaskRef.current;
      if (!target || typeof setTasks !== 'function') return;
      setTasks((prev) =>
        (prev || []).map((t) => (String(t.id) === String(target.id) ? target : t))
      );
    },
    [setTasks]
  );

  useEffect(() => {
    if (!task) return;
    const cur = liveTaskRef.current;
    const isDifferentTask = !cur || String(cur.id) !== String(task.id);
    if (isDifferentTask) {
      setLiveTask(task);
      liveTaskRef.current = task;
      lastSyncedStatusRef.current = task.kahoot?.status;
      return;
    }
    // Mientras el modal está abierto en vivo contra Firestore, onSnapshot directo es la fuente de verdad
    // para evitar que props retrasados del padre reviertan respuestas o cambios de fase en tiempo real.
    if (isOpen && !isDemoTask) return;

    const incomingUpdated = Number(task.kahoot?.updatedAt || 0);
    const currentUpdated = Number(cur?.kahoot?.updatedAt || 0);
    if (incomingUpdated >= currentUpdated) {
      setLiveTask(task);
      liveTaskRef.current = task;
    }
  }, [task, isOpen, isDemoTask]);

  // Pausar re-renders del muro principal (App.jsx) mientras el Kahoot está en pantalla completa
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isOpen && !isDemoTask) {
      window.__KAHOOT_LIVE_MODAL_OPEN__ = true;
      return () => {
        window.__KAHOOT_LIVE_MODAL_OPEN__ = false;
        window.dispatchEvent(new CustomEvent('kahoot-live-modal-closed'));
      };
    }
    window.__KAHOOT_LIVE_MODAL_OPEN__ = false;
    return undefined;
  }, [isOpen, isDemoTask]);

  // Suscripción en tiempo real al documento de la tarea cuando el Kahoot está abierto (solo fuera de Modo Demo)
  const snapshotThrottleTimerRef = useRef(null);
  const lastSnapshotRenderTsRef = useRef(0);
  useEffect(() => {
    if (!isOpen || isDemoTask || !db || !appId || !task?.id) return undefined;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const fresh = { id: snap.id, ...snap.data() };
          const prevKahoot = liveTaskRef.current?.kahoot || {};
          const nextKahoot = fresh.kahoot || {};
          const prevStatus = lastSyncedStatusRef.current;
          const nextStatus = nextKahoot.status;
          const prevReviewEnabled = Boolean(prevKahoot.reviewEnabled);
          const nextReviewEnabled = Boolean(nextKahoot.reviewEnabled);

          liveTaskRef.current = fresh;

          const activeIdx = Number(nextKahoot.currentQuestionIndex) || 0;
          const prevMyEntry = prevKahoot.participants?.[safePlayerId];
          const nextMyEntry = nextKahoot.participants?.[safePlayerId];
          const prevMyAns = prevMyEntry?.answers?.[String(activeIdx)];
          const nextMyAns = nextMyEntry?.answers?.[String(activeIdx)];
          const { totalParticipants: snapTotal, answeredCount: snapAnswered } =
            buildKahootLeaderboard(nextKahoot.participants || {}, activeIdx);
          const allAnsweredNow = snapTotal > 0 && snapAnswered >= snapTotal;

          // Transiciones críticas (cambio de pregunta, fase, estado, permiso de repaso, propia respuesta o 100% respondido) se renderizan en 0ms
          const isCriticalTransition =
            prevKahoot.status !== nextKahoot.status ||
            prevKahoot.phase !== nextKahoot.phase ||
            prevKahoot.currentQuestionIndex !== nextKahoot.currentQuestionIndex ||
            prevKahoot.questionStartedAt !== nextKahoot.questionStartedAt ||
            prevKahoot.firstCorrectAt !== nextKahoot.firstCorrectAt ||
            prevReviewEnabled !== nextReviewEnabled ||
            Boolean(prevMyEntry) !== Boolean(nextMyEntry) ||
            prevMyAns?.answeredAt !== nextMyAns?.answeredAt ||
            allAnsweredNow;

          const nowMs = Date.now();
          if (isCriticalTransition || nowMs - lastSnapshotRenderTsRef.current >= 120) {
            if (snapshotThrottleTimerRef.current) {
              clearTimeout(snapshotThrottleTimerRef.current);
              snapshotThrottleTimerRef.current = null;
            }
            lastSnapshotRenderTsRef.current = nowMs;
            setLiveTask(fresh);
          } else if (!snapshotThrottleTimerRef.current) {
            const waitMs = Math.max(16, 120 - (nowMs - lastSnapshotRenderTsRef.current));
            snapshotThrottleTimerRef.current = setTimeout(() => {
              snapshotThrottleTimerRef.current = null;
              lastSnapshotRenderTsRef.current = Date.now();
              if (liveTaskRef.current) {
                setLiveTask(liveTaskRef.current);
              }
            }, waitMs);
          }

          // Solo propagar a App.jsx si cambió el status general o el permiso de repaso
          // para evitar re-renderizar toda la aplicación en cada respuesta de 40+ estudiantes.
          if (prevStatus !== nextStatus || prevReviewEnabled !== nextReviewEnabled) {
            lastSyncedStatusRef.current = nextStatus;
            syncTaskToParent(fresh);
          }
        }
      },
      (err) => {
        console.warn('Kahoot live snapshot warning:', err);
      }
    );
    return () => {
      if (snapshotThrottleTimerRef.current) {
        clearTimeout(snapshotThrottleTimerRef.current);
        snapshotThrottleTimerRef.current = null;
      }
      unsub();
    };
  }, [isOpen, isDemoTask, db, appId, task?.id, safePlayerId, syncTaskToParent]);

  const kahoot = useMemo(() => liveTask?.kahoot || {}, [liveTask]);
  const questionsSignature = useMemo(
    () => JSON.stringify(Array.isArray(kahoot.questions) ? kahoot.questions : []),
    [kahoot.questions]
  );
  const questions = useMemo(() => {
    try {
      const parsed = JSON.parse(questionsSignature);
      return Array.isArray(parsed)
        ? parsed.map((q, i) => {
            const norm = normalizeKahootQuestion(q, i);
            if (norm.type === 'quiz' || norm.type === 'truefalse') {
              const nonEmpty = (norm.options || []).filter(
                (o) => String(o?.text || '').trim().length > 0
              );
              if (nonEmpty.length >= 2) {
                return { ...norm, options: nonEmpty };
              }
            }
            return norm;
          })
        : [];
    } catch {
      return [];
    }
  }, [questionsSignature]);

  const isReviewEnabled = Boolean(kahoot.reviewEnabled);
  const canReview = canAccessKahootReview(kahoot, role);

  // Modo local: 'live' (conectado a la sesión grupal), 'review' (guía de estudio), 'solo' (práctica individual)
  const [viewMode, setViewMode] = useState(() => {
    if (!canAccessKahootReview(kahoot, role)) return 'live';
    if (initialMode === 'review') return 'review';
    if (kahoot.status === 'finished' && !canControlGame) return 'solo';
    return 'live';
  });

  // El docente en modo 'live' actúa como pantalla proyectada (sin mostrar opciones seleccionables durante la pregunta)
  const isTeacherProjector = role === 'teacher' && viewMode === 'live';

  // Estado de sonido y edición de apodo
  const [soundMuted, setSoundMuted] = useState(false);
  const soundMutedRef = useRef(soundMuted);
  useEffect(() => {
    soundMutedRef.current = soundMuted;
    if (soundMuted) stopKahootMusic();
  }, [soundMuted]);

  const existingMe = kahoot.participants?.[safePlayerId];
  const [myNickname, setMyNickname] = useState(
    () => existingMe?.nickname || loggedInName || (role === 'teacher' ? 'Docente Host' : 'Estudiante')
  );
  const [myAvatar, setMyAvatar] = useState(() => existingMe?.avatar || initialAvatar || '🦊');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(myNickname);

  useEffect(() => {
    const nextName =
      existingMe?.nickname || loggedInName || (role === 'teacher' ? 'Docente Host' : 'Estudiante');
    setMyNickname(nextName);
    setNicknameDraft(nextName);
    if (existingMe?.avatar) {
      setMyAvatar(existingMe.avatar);
    } else if (initialAvatar) {
      setMyAvatar(initialAvatar);
    }
  }, [existingMe?.nickname, existingMe?.avatar, loggedInName, initialAvatar, role, task?.id]);

  // Selección temporal para preguntas multi-opción, respuesta corta o puzzle
  const [selectedMultiIndices, setSelectedMultiIndices] = useState([]);
  const [typedAnswerText, setTypedAnswerText] = useState('');
  const [puzzleOrderDraft, setPuzzleOrderDraft] = useState([]);
  const [gongBannerVisible, setGongBannerVisible] = useState(false);

  // Estado para el modo de práctica individual ("solo")
  const [soloState, setSoloState] = useState(() => {
    const startImmediateSolo =
      canAccessKahootReview(kahoot, role) &&
      initialMode !== 'review' &&
      kahoot.status === 'finished' &&
      !canControlGame;
    return {
      active: startImmediateSolo,
      qIndex: 0,
      phase: 'question', // 'question' | 'revealed' | 'podium'
      startedAt: startImmediateSolo ? Date.now() : 0,
      firstCorrectAt: null,
      score: 0,
      streak: 0,
      correctCount: 0,
      answers: {},
    };
  });

  // Si el docente deshabilita el repaso en tiempo real, sacar a estudiantes/invitados de 'review' o 'solo'
  useEffect(() => {
    if (!canReview && (viewMode === 'review' || viewMode === 'solo')) {
      setViewMode('live');
      setSoloState((prev) => (prev.active ? { ...prev, active: false } : prev));
    }
  }, [canReview, viewMode]);

  const rawPhase =
    viewMode === 'solo'
      ? soloState.phase
      : kahoot.status === 'finished'
        ? 'podium'
        : (kahoot.phase || 'lobby');
  const activeQIndex = viewMode === 'solo'
    ? soloState.qIndex
    : Math.max(0, Math.min(Number(kahoot.currentQuestionIndex) || 0, Math.max(0, questions.length - 1)));
  const currentQuestion = questions[activeQIndex] || questions[0] || null;
  const activeStartedAt = viewMode === 'solo' ? soloState.startedAt : (Number(kahoot.questionStartedAt) || 0);
  const activeDuration = Number(currentQuestion?.timeLimit || kahoot.questionDuration || 20);
  const currentRoundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;

  // Marca de tiempo de la primera respuesta correcta en preguntas de tipo Acertijo (riddle)
  const activeFirstCorrectAt = useMemo(() => {
    if (viewMode === 'solo') {
      return soloState.firstCorrectAt || null;
    }
    const kahootFirstAt = Number(kahoot.firstCorrectAt);
    if (kahoot.firstCorrectRoundKey === currentRoundKey && kahootFirstAt > 0) {
      return kahootFirstAt;
    }
    let earliest = null;
    Object.values(kahoot.participants || {}).forEach((p) => {
      const a = p?.answers?.[String(activeQIndex)];
      if (a?.isCorrect && Number(a.answeredAt) > 0) {
        if (!earliest || Number(a.answeredAt) < earliest) {
          earliest = Number(a.answeredAt);
        }
      }
    });
    return earliest;
  }, [viewMode, soloState.firstCorrectAt, kahoot.firstCorrectRoundKey, currentRoundKey, kahoot.firstCorrectAt, kahoot.participants, activeQIndex]);

  // Permite transición local instantánea a 'revealed' cuando todos responden o el reloj llega a 0
  const [localRevealedRoundKey, setLocalRevealedRoundKey] = useState('');
  const activePhase =
    rawPhase === 'question' && localRevealedRoundKey === currentRoundKey ? 'revealed' : rawPhase;

  // Mapa de tiempos de llegada locales por ronda para eliminar desfases de reloj entre dispositivos,
  // ajustando de forma justa si un estudiante abre el modal a mitad de una pregunta ya iniciada.
  const sawNonQuestionPhaseRef = useRef(rawPhase !== 'question');
  if (rawPhase !== 'question') {
    sawNonQuestionPhaseRef.current = true;
  }
  const roundLocalStartMapRef = useRef({});
  if (rawPhase === 'question' && !roundLocalStartMapRef.current[currentRoundKey]) {
    const nowLocal = Date.now();
    if (sawNonQuestionPhaseRef.current || viewMode === 'solo' || activeStartedAt <= 0) {
      roundLocalStartMapRef.current[currentRoundKey] = nowLocal;
    } else {
      // El estudiante abrió el modal cuando la pregunta ya estaba en curso:
      // estimar tiempo transcurrido usando respuestas previas de la ronda o marca del servidor acotada
      const peerAnswers = Object.values(kahoot.participants || {})
        .map((p) => p?.answers?.[String(activeQIndex)])
        .filter(Boolean);
      const maxPeerTimeMs = peerAnswers.reduce(
        (max, a) => Math.max(max, Number(a?.timeMs) || 0),
        0
      );
      const rawServerElapsedMs = Math.max(0, nowLocal - activeStartedAt);
      const maxInitialOffsetMs = Math.max(0, (activeDuration - 5) * 1000);
      const estimatedElapsedMs =
        maxPeerTimeMs > 0 || (rawServerElapsedMs > 2500 && rawServerElapsedMs < activeDuration * 1000)
          ? Math.min(maxInitialOffsetMs, Math.max(maxPeerTimeMs, rawServerElapsedMs))
          : 0;
      roundLocalStartMapRef.current[currentRoundKey] = nowLocal - estimatedElapsedMs;
    }
  }

  // Reloj sincronizado en tiempo real atado a currentRoundKey para que el primer fotograma de cada
  // nueva pregunta muestre siempre activeDuration (evitando destellos de 0s o imagen sin desenfoque)
  const [timerState, setTimerState] = useState(() => ({
    roundKey: currentRoundKey,
    seconds: activeDuration,
  }));
  const remainingSeconds =
    timerState.roundKey === currentRoundKey ? timerState.seconds : activeDuration;
  const remainingSecondsRef = useRef(activeDuration);
  if (timerState.roundKey !== currentRoundKey) {
    remainingSecondsRef.current = activeDuration;
  }
  const gongTriggeredForRoundRef = useRef('');
  const submittingRoundRef = useRef('');
  const taskPropRef = useRef(task);
  taskPropRef.current = task;

  // Función auxiliar para actualizar el objeto kahoot en Firestore o en el Sandbox Demo
  const updateKahootState = useCallback(
    async (partialKahootUpdates, dotNotationUpdates = null) => {
      const currentTask = liveTaskRef.current || taskPropRef.current;
      if (!currentTask) return;

      const nowTs = Date.now();
      const currentKahoot = currentTask.kahoot || {};
      const nextKahoot = {
        ...currentKahoot,
        ...partialKahootUpdates,
        updatedAt: nowTs,
        participants: {
          ...(currentKahoot.participants || {}),
          ...(partialKahootUpdates?.participants || {}),
        },
      };

      const nextTask = { ...currentTask, kahoot: nextKahoot };
      liveTaskRef.current = nextTask;
      setLiveTask(nextTask);

      if (
        isDemoTask ||
        partialKahootUpdates?.status ||
        partialKahootUpdates?.reviewEnabled !== undefined
      ) {
        lastSyncedStatusRef.current = nextKahoot.status;
        syncTaskToParent(nextTask);
      }

      if (isDemoTask) {
        saveDemoSandboxItem('tasks', nextTask);
        return;
      }

      try {
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch {
            // Ignorar
          }
        }
        const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', currentTask.id);
        if (dotNotationUpdates) {
          await updateDoc(taskRef, {
            ...dotNotationUpdates,
            'kahoot.updatedAt': nowTs,
          });
        } else {
          const dotPayload = { 'kahoot.updatedAt': nowTs };
          Object.entries(partialKahootUpdates || {}).forEach(([k, v]) => {
            dotPayload[`kahoot.${k}`] = v;
          });
          await updateDoc(taskRef, dotPayload);
        }
      } catch (err) {
        console.warn('Error actualizando estado de Kahoot:', err);
      }
    },
    [isDemoTask, db, appId, syncTaskToParent]
  );

  // Auto-registrar participante al entrar a la sala en vivo (si es estudiante o bots en Modo Demo)
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    hasAutoJoinedRef.current = false;
  }, [isOpen, task?.id, role, safePlayerId]);

  useEffect(() => {
    if (!isOpen || viewMode !== 'live') return;
    if (hasAutoJoinedRef.current) return;
    hasAutoJoinedRef.current = true;

    const currentParticipants = { ...(liveTaskRef.current?.kahoot?.participants || {}) };
    const nextParticipants = { ...currentParticipants };
    const dotUpdates = {};
    let needsUpdate = false;

    // Solo los estudiantes se registran como jugadores activos; el docente actúa como proyectista/anfitrión
    if (role !== 'teacher') {
      if (!currentParticipants[safePlayerId]) {
        const playerEntry = {
          id: safePlayerId,
          realName: loggedInName || 'Estudiante',
          nickname: myNickname || loggedInName || 'Estudiante',
          avatar: myAvatar || '🦊',
          score: 0,
          streak: 0,
          correctCount: 0,
          joinedAt: Date.now(),
          answers: {},
        };
        nextParticipants[safePlayerId] = playerEntry;
        dotUpdates[`kahoot.participants.${safePlayerId}`] = playerEntry;
        needsUpdate = true;
      }
    }

    // En Modo Demo, aseguramos que también estén los compañeros simulados listos en el Lobby
    if (isDemoTask) {
      DEMO_KAHOOT_BOTS.forEach((bot) => {
        if (!nextParticipants[bot.id]) {
          const botEntry = {
            id: bot.id,
            realName: bot.realName,
            nickname: bot.nickname,
            avatar: bot.avatar,
            score: 0,
            streak: 0,
            correctCount: 0,
            joinedAt: Date.now(),
            isSimulatedBot: true,
            answers: {},
          };
          nextParticipants[bot.id] = botEntry;
          dotUpdates[`kahoot.participants.${bot.id}`] = botEntry;
          needsUpdate = true;
        }
      });
    }

    if (needsUpdate) {
      updateKahootState({ participants: nextParticipants }, dotUpdates);
    }
  }, [isOpen, viewMode, role, isDemoTask, safePlayerId, loggedInName, myNickname, myAvatar, updateKahootState]);

  // Guardar nuevo nombre / apodo en cualquier momento mientras participa
  const handleSaveNickname = async (newName, newAvatar = myAvatar) => {
    const clean = String(newName || '').trim().slice(0, 28);
    if (!clean) {
      showMessage?.('Escribe un nombre o apodo válido.');
      return;
    }
    if (containsBadWords(clean) || await checkBadWordsAsync(clean)) {
      showMessage?.('Por favor elige un nombre apropiado para la clase.');
      return;
    }
    setMyNickname(clean);
    setMyAvatar(newAvatar);
    setNicknameDraft(clean);
    setIsEditingNickname(false);

    if (role === 'teacher') {
      showMessage?.(`✨ Perfil de anfitrión actualizado a "${newAvatar} ${clean}"`);
      return;
    }

    try {
      localStorage.setItem('englishTech_kahootGuestName', clean);
      localStorage.setItem('englishTech_kahootGuestAvatar', newAvatar);
    } catch {
      // ignorar si localStorage está restringido
    }
    if (typeof onProfileChange === 'function') {
      onProfileChange({ nickname: clean, avatar: newAvatar });
    }

    const currentParticipants = { ...(liveTaskRef.current?.kahoot?.participants || {}) };
    const existing = currentParticipants[safePlayerId] || {
      id: safePlayerId,
      realName: loggedInName || clean,
      score: 0,
      streak: 0,
      correctCount: 0,
      joinedAt: Date.now(),
      answers: {},
    };
    const updatedPlayer = {
      ...existing,
      nickname: clean,
      avatar: newAvatar,
    };

    await updateKahootState(
      {
        participants: {
          ...currentParticipants,
          [safePlayerId]: updatedPlayer,
        },
      },
      { [`kahoot.participants.${safePlayerId}`]: updatedPlayer }
    );
    showMessage?.(`✨ Ahora participas como "${newAvatar} ${clean}"`);
  };

  // Inicializar elementos desordenados cuando una pregunta tipo 'puzzle' comienza
  useEffect(() => {
    if (!currentQuestion) return;
    setSelectedMultiIndices([]);
    setTypedAnswerText('');
    if (currentQuestion.type === 'puzzle') {
      const items = [...(currentQuestion.puzzleItems || [])].filter(Boolean);
      // Desordenar determinísticamente sin dejar elementos en su posición original
      const shuffled = [...items];
      if (shuffled.length >= 4) {
        const [a, b, c, d] = shuffled;
        shuffled.splice(0, 4, c, a, d, b);
      } else if (shuffled.length === 3) {
        const [a, b, c] = shuffled;
        shuffled.splice(0, 3, b, c, a);
      } else if (shuffled.length > 1) {
        const first = shuffled.shift();
        shuffled.push(first);
      }
      setPuzzleOrderDraft(shuffled);
    } else {
      setPuzzleOrderDraft([]);
    }
  }, [activeQIndex, currentQuestion?.id, activePhase]);

  // Estadísticas y clasificación en vivo
  const { leaderboard, fastestResponder, totalParticipants, answeredCount } = useMemo(
    () => buildKahootLeaderboard(kahoot.participants || {}, activeQIndex),
    [kahoot.participants, activeQIndex]
  );

  // Clasificación mostrada en pantalla (en modo práctica 'solo' incorpora el puntaje de práctica actual del usuario)
  const displayLeaderboard = useMemo(() => {
    if (viewMode !== 'solo') return leaderboard;
    const soloNickname =
      myNickname === 'Docente Host' && loggedInName ? loggedInName : myNickname || 'Participante';
    const mergedParticipants = {
      ...(kahoot.participants || {}),
      [safePlayerId]: {
        ...(kahoot.participants?.[safePlayerId] || {}),
        id: safePlayerId,
        realName: loggedInName || soloNickname,
        nickname: soloNickname,
        avatar: myAvatar,
        score: soloState.score,
        streak: soloState.streak,
        correctCount: soloState.correctCount,
        lastAnswer: soloState.answers[String(activeQIndex)] || null,
        answers: soloState.answers,
        isSoloPracticePlayer: true,
        isTeacherHost: false,
        isHost: false,
        role: 'student',
      },
    };
    return buildKahootLeaderboard(mergedParticipants, activeQIndex).leaderboard;
  }, [
    viewMode,
    leaderboard,
    kahoot.participants,
    safePlayerId,
    loggedInName,
    myNickname,
    myAvatar,
    soloState.score,
    soloState.streak,
    soloState.correctCount,
    soloState.answers,
    activeQIndex,
  ]);

  const myParticipantData = kahoot.participants?.[safePlayerId];
  const myLiveAnswer =
    viewMode === 'solo'
      ? soloState.answers[String(activeQIndex)]
      : myParticipantData?.answers?.[String(activeQIndex)] ||
        (myParticipantData?.lastAnswer?.questionIndex === activeQIndex
          ? myParticipantData.lastAnswer
          : null);

  const isRiddleQuestion = currentQuestion?.type === 'riddle';
  const riddleGraceRemainingMs =
    isRiddleQuestion && activeFirstCorrectAt
      ? Math.max(0, activeFirstCorrectAt + 2000 - Date.now())
      : null;
  const isRiddleWindowActive =
    isRiddleQuestion && activeFirstCorrectAt > 0 && riddleGraceRemainingMs > 0;
  const isRiddleLockedForMe =
    isRiddleQuestion && activeFirstCorrectAt > 0 && riddleGraceRemainingMs <= 0 && !myLiveAnswer;

  const riddleWinners = useMemo(() => {
    if (currentQuestion?.type !== 'riddle') return [];
    if (viewMode === 'solo') {
      const ans = soloState.answers[String(activeQIndex)];
      if (ans?.isCorrect) {
        return [
          {
            id: safePlayerId,
            displayName: myNickname || loggedInName || 'Tú',
            avatar: myAvatar,
            timeSec: (Number(ans.timeMs || 0) / 1000).toFixed(1),
            isFirst: true,
          },
        ];
      }
      return [];
    }
    const solvers = [];
    Object.values(kahoot.participants || {}).forEach((p) => {
      const ans = p?.answers?.[String(activeQIndex)];
      if (ans?.isCorrect) {
        solvers.push({
          id: p.id,
          displayName: p.displayName || p.nickname || p.realName || 'Jugador',
          avatar: p.avatar || '🦊',
          timeMs: Number(ans.timeMs) || 0,
          timeSec: (Number(ans.timeMs || 0) / 1000).toFixed(1),
          isFirst: Boolean(ans.isFirstCorrect),
        });
      }
    });
    solvers.sort((a, b) => a.timeMs - b.timeMs);
    if (solvers.length === 0) return [];
    const minTime = solvers[0].timeMs;
    // Solo se valida a quienes respondieron dentro del rango de 2 segundos del primero
    return solvers
      .filter((s, idx) => idx === 0 || s.timeMs - minTime <= 2000)
      .map((s, idx) => ({
        ...s,
        isFirst: idx === 0 || s.isFirst,
      }));
  }, [
    currentQuestion?.type,
    viewMode,
    soloState.answers,
    activeQIndex,
    safePlayerId,
    myNickname,
    loggedInName,
    myAvatar,
    kahoot.participants,
  ]);

  const gongBannerTimerRef = useRef(null);
  const soloSubmitTimerRef = useRef(null);

  // Disparador de campana de fin de ronda y transición instantánea cuando todos terminan o el tiempo se agota
  const triggerRoundEndWithGong = useCallback(
    (reason = 'all_answered') => {
      const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
      if (gongTriggeredForRoundRef.current === roundKey) return;
      gongTriggeredForRoundRef.current = roundKey;
      setLocalRevealedRoundKey(roundKey);

      stopKahootMusic();
      if (!soundMutedRef.current) {
        playGongSound();
      }
      setGongBannerVisible(true);
      if (gongBannerTimerRef.current) clearTimeout(gongBannerTimerRef.current);
      gongBannerTimerRef.current = setTimeout(() => setGongBannerVisible(false), 2600);

      if (viewMode === 'solo') {
        setSoloState((prev) => ({ ...prev, phase: 'revealed' }));
        return;
      }

      // Si los dos últimos estudiantes respondieron casi al mismo milisegundo y ninguno vio 40/40 en su envío local,
      // determinamos quién tuvo el answeredAt más reciente para que exactamente 1 estudiante persista 'revealed'
      // incluso si la pestaña del docente está en segundo plano.
      let isLatestResponderOnAllAnswered = false;
      if (reason === 'all_answered' && role !== 'teacher') {
        const partsMap = liveTaskRef.current?.kahoot?.participants || {};
        let latestId = '';
        let latestTs = -1;
        Object.entries(partsMap).forEach(([pid, p]) => {
          const ansTs = Number(p?.answers?.[String(activeQIndex)]?.answeredAt) || 0;
          if (ansTs > latestTs) {
            latestTs = ansTs;
            latestId = p?.id || pid;
          }
        });
        isLatestResponderOnAllAnswered = Boolean(latestId && latestId === safePlayerId);
      }

      let isSolverOnRiddle = false;
      if (reason === 'riddle_solved' && role !== 'teacher') {
        const myAns = liveTaskRef.current?.kahoot?.participants?.[safePlayerId]?.answers?.[String(activeQIndex)];
        isSolverOnRiddle = Boolean(myAns?.isCorrect);
      }

      // Respaldo de persistencia si el primer acertante cerró su navegador o el docente está en pestaña inactiva
      const isLateRiddleFallbackPersist =
        reason === 'riddle_solved' &&
        activeFirstCorrectAt > 0 &&
        Date.now() - activeFirstCorrectAt >= 2200;

      // Evitar tormenta de escrituras de 40+ clientes simultáneos al expirar el reloj:
      // El docente/anfitrión (o el último estudiante en responder / acertante) persiste 'revealed' en Firestore.
      const shouldPersistPhase =
        role === 'teacher' ||
        isDemoTask ||
        reason === 'teacher_skip' ||
        reason === 'last_student_answered' ||
        isLatestResponderOnAllAnswered ||
        isSolverOnRiddle ||
        isLateRiddleFallbackPersist;

      if (shouldPersistPhase && liveTaskRef.current?.kahoot?.phase !== 'revealed') {
        updateKahootState(
          {
            phase: 'revealed',
            lastEndReason: reason,
          },
          {
            'kahoot.phase': 'revealed',
            'kahoot.lastEndReason': reason,
          }
        );
      }
    },
    [viewMode, activeQIndex, activeStartedAt, role, isDemoTask, safePlayerId, updateKahootState]
  );

  // Detectar transición remota de 'question' -> 'revealed' vía Firestore onSnapshot para que la campana suene en TODOS los dispositivos conectados
  const prevPhaseRef = useRef(activePhase);
  useEffect(() => {
    const wasQuestion = prevPhaseRef.current === 'question';
    prevPhaseRef.current = activePhase;
    if (!isOpen || viewMode === 'review') return;

    if (wasQuestion && activePhase === 'revealed') {
      const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
      if (gongTriggeredForRoundRef.current !== roundKey) {
        gongTriggeredForRoundRef.current = roundKey;
        setLocalRevealedRoundKey(roundKey);
        stopKahootMusic();
        if (!soundMutedRef.current) {
          playGongSound();
        }
        setGongBannerVisible(true);
        if (gongBannerTimerRef.current) clearTimeout(gongBannerTimerRef.current);
        gongBannerTimerRef.current = setTimeout(() => setGongBannerVisible(false), 2600);
      }
    }
  }, [isOpen, viewMode, activePhase, activeQIndex, activeStartedAt]);

  // Control del temporizador en vivo inmune a desfases de reloj entre dispositivos
  useEffect(() => {
    if (!isOpen || activePhase !== 'question') return undefined;

    const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
    if (!roundLocalStartMapRef.current[roundKey]) {
      roundLocalStartMapRef.current[roundKey] = Date.now();
    }
    const localStartTs =
      viewMode === 'solo'
        ? activeStartedAt > 0
          ? activeStartedAt
          : Date.now()
        : roundLocalStartMapRef.current[roundKey];
    const durationSec = Math.max(5, activeDuration);

    const tickTimer = () => {
      const elapsedSec = Math.max(0, (Date.now() - localStartTs) / 1000);
      const rem = Math.max(0, durationSec - elapsedSec);
      remainingSecondsRef.current = rem;
      setTimerState({ roundKey, seconds: rem });

      if (rem <= 0) {
        triggerRoundEndWithGong('timeout');
      }
    };

    tickTimer();
    const interval = setInterval(tickTimer, 100);
    return () => clearInterval(interval);
  }, [isOpen, viewMode, activePhase, activeQIndex, activeStartedAt, activeDuration, triggerRoundEndWithGong]);

  // Si todos los participantes conectados ya respondieron en vivo, revelar de inmediato sin demora
  useEffect(() => {
    if (!isOpen || viewMode !== 'live' || activePhase !== 'question') return;
    if (totalParticipants > 0 && answeredCount >= totalParticipants) {
      triggerRoundEndWithGong('all_answered');
    }
  }, [isOpen, viewMode, activePhase, totalParticipants, answeredCount, triggerRoundEndWithGong]);

  // Para preguntas tipo Acertijo (riddle):
  // Si alguien ya respondió correctamente, cerrar la ronda exactamente a los 2 segundos de esa primera respuesta
  useEffect(() => {
    if (!isOpen || activePhase !== 'question' || currentQuestion?.type !== 'riddle') return undefined;
    if (!activeFirstCorrectAt) return undefined;

    const remainingWindowMs = Math.max(0, (activeFirstCorrectAt + 2000) - Date.now());

    if (remainingWindowMs <= 0) {
      triggerRoundEndWithGong('riddle_solved');
      return undefined;
    }

    const timer = setTimeout(() => {
      triggerRoundEndWithGong('riddle_solved');
    }, remainingWindowMs);

    return () => clearTimeout(timer);
  }, [isOpen, activePhase, currentQuestion?.type, activeFirstCorrectAt, triggerRoundEndWithGong]);

  // Simulación automática de respuestas de compañeros de prueba (en Modo Demo o cuando el docente activó bots de prueba)
  const hasSimulatedBotsInRoom = useMemo(
    () =>
      Boolean(
        isDemoTask ||
          Object.values(kahoot.participants || {}).some(
            (p) => p && (p.isSimulatedBot || String(p.id || '').startsWith('bot_'))
          )
      ),
    [isDemoTask, kahoot.participants]
  );

  useEffect(() => {
    if (
      !isOpen ||
      !canControlGame ||
      !hasSimulatedBotsInRoom ||
      viewMode !== 'live' ||
      activePhase !== 'question' ||
      !currentQuestion
    ) {
      return undefined;
    }

    const botsToSimulate = [...DEMO_KAHOOT_BOTS];
    if (isDemoTask && role === 'teacher') {
      const knownBotIds = new Set(DEMO_KAHOOT_BOTS.map((b) => b.id));
      Object.values(liveTaskRef.current?.kahoot?.participants || {}).forEach((p, idx) => {
        if (
          p &&
          p.id &&
          !knownBotIds.has(p.id) &&
          p.id !== safePlayerId &&
          !p.isTeacherHost &&
          !p.isHost &&
          p.role !== 'teacher' &&
          p.id !== 'teacher' &&
          p.id !== 'teacher_gina' &&
          p.id !== 'teacher_camilo' &&
          String(p.nickname || '').trim() !== 'Docente Host' &&
          String(p.realName || '').trim() !== 'Docente Host'
        ) {
          botsToSimulate.push({
            id: p.id,
            realName: p.realName || p.nickname || 'Estudiante',
            nickname: p.nickname || p.realName || 'Estudiante',
            avatar: p.avatar || '🦊',
            skill: 0.8,
            minDelayMs: 2100 + idx * 350,
            maxDelayMs: 5600 + idx * 450,
          });
        }
      });
    }

    const roundStartTs = roundLocalStartMapRef.current[currentRoundKey] || Date.now();
    const elapsedRoundMs = Math.max(0, Date.now() - roundStartTs);
    const timers = [];
    botsToSimulate.forEach((bot) => {
      const botAns = buildSimulatedBotAnswer(bot, currentQuestion, activeQIndex);
      const delayMs = Math.max(150, botAns.timeMs - elapsedRoundMs);
      const t = setTimeout(() => {
        const latestKahoot = liveTaskRef.current?.kahoot || {};
        if (latestKahoot.phase !== 'question' || Number(latestKahoot.currentQuestionIndex) !== activeQIndex) {
          return;
        }
        const currentParts = { ...(latestKahoot.participants || {}) };
        if (!isDemoTask && !currentParts[bot.id]) {
          return;
        }
        const botData = currentParts[bot.id] || {
          id: bot.id,
          realName: bot.realName,
          nickname: bot.nickname,
          avatar: bot.avatar,
          score: 0,
          streak: 0,
          correctCount: 0,
          totalTimeMs: 0,
          isSimulatedBot: true,
          answers: {},
        };

        // Si ya respondió esta pregunta, no repetir
        if (botData.answers && botData.answers[String(activeQIndex)]) return;

        // Lógica de Acertijo (riddle) para bots: bloquear si ya pasaron >2s de la primera respuesta correcta
        let currentFirstAt = Number(latestKahoot.firstCorrectAt) || 0;
        if (!currentFirstAt) {
          Object.values(currentParts).forEach((p) => {
            const a = p?.answers?.[String(activeQIndex)];
            if (a?.isCorrect && Number(a.answeredAt) > 0) {
              if (!currentFirstAt || Number(a.answeredAt) < currentFirstAt) {
                currentFirstAt = Number(a.answeredAt);
              }
            }
          });
        }
        let isCorrectForBot = botAns.isCorrect;
        let isFirstForBot = false;
        if (currentQuestion.type === 'riddle') {
          if (currentFirstAt > 0) {
            if (Date.now() - currentFirstAt > 2000) {
              return; // Ventana de 2 segundos cerrada para el acertijo
            }
          } else if (isCorrectForBot) {
            isFirstForBot = true;
          }
        }

        const scoreCalc = calculateKahootPoints({
          isCorrect: isCorrectForBot,
          timeMs: botAns.timeMs,
          timeLimitSec: currentQuestion.timeLimit || 20,
          pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
          currentStreak: botData.streak || 0,
        });

        const answerRecord = {
          ...botAns,
          isCorrect: isCorrectForBot,
          isFirstCorrect: isFirstForBot,
          pointsEarned: scoreCalc.pointsEarned,
          streakBonus: scoreCalc.streakBonus,
          answeredAt: Date.now(),
        };

        const updatedBot = {
          ...botData,
          score: (Number(botData.score) || 0) + scoreCalc.pointsEarned,
          streak: scoreCalc.newStreak,
          correctCount: (Number(botData.correctCount) || 0) + (isCorrectForBot ? 1 : 0),
          totalTimeMs: (Number(botData.totalTimeMs) || 0) + (Number(botAns.timeMs) || 0),
          lastAnswer: answerRecord,
          answers: {
            ...(botData.answers || {}),
            [String(activeQIndex)]: answerRecord,
          },
        };

        const existingFirstAt = Number(liveTaskRef.current?.kahoot?.firstCorrectAt) || 0;
        const willSetBotFirst = isFirstForBot && existingFirstAt <= 0;
        const botNowTs = Date.now();
        const riddleDocUpdates = willSetBotFirst
          ? { firstCorrectAt: botNowTs, firstCorrectRoundKey: currentRoundKey }
          : {};
        const riddleDotUpdates = willSetBotFirst
          ? {
              'kahoot.firstCorrectAt': botNowTs,
              'kahoot.firstCorrectRoundKey': currentRoundKey,
            }
          : {};

        updateKahootState(
          {
            ...riddleDocUpdates,
            participants: {
              ...currentParts,
              [bot.id]: updatedBot,
            },
          },
          {
            ...riddleDotUpdates,
            [`kahoot.participants.${bot.id}`]: updatedBot,
          }
        );
      }, delayMs);

      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [
    isOpen,
    canControlGame,
    hasSimulatedBotsInRoom,
    isDemoTask,
    role,
    safePlayerId,
    viewMode,
    activePhase,
    activeQIndex,
    currentRoundKey,
    currentQuestion,
    updateKahootState,
  ]);

  // Control automático de música ambiental (Lobby, Tensión, Revelación y Podio)
  const lastPlayedRevealRoundRef = useRef('');
  const lastPlayedPodiumKeyRef = useRef('');
  useEffect(() => {
    if (!isOpen || viewMode === 'review' || soundMuted) {
      stopKahootMusic();
      return undefined;
    }

    let revealSoundTimer = null;
    if (activePhase === 'lobby') {
      startLobbyMusic();
    } else if (activePhase === 'question') {
      startTensionMusic(() => remainingSecondsRef.current);
    } else if (activePhase === 'revealed') {
      stopKahootMusic();
      if (myLiveAnswer && lastPlayedRevealRoundRef.current !== currentRoundKey) {
        revealSoundTimer = setTimeout(() => {
          if (!soundMutedRef.current && lastPlayedRevealRoundRef.current !== currentRoundKey) {
            lastPlayedRevealRoundRef.current = currentRoundKey;
            playRevealResultSound(Boolean(myLiveAnswer.isCorrect));
          }
        }, 550);
      }
    } else if (activePhase === 'podium') {
      stopKahootMusic();
      const podiumKey = `${viewMode}_${kahoot.finishedAt || soloState.startedAt || 'podium'}`;
      if (lastPlayedPodiumKeyRef.current !== podiumKey) {
        lastPlayedPodiumKeyRef.current = podiumKey;
        playPodiumFanfare();
        try {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignorar si canvas-confetti falla en entorno sin canvas
        }
      }
    }

    return () => {
      if (revealSoundTimer) clearTimeout(revealSoundTimer);
      stopKahootMusic();
    };
  }, [isOpen, viewMode, activePhase, activeQIndex, currentRoundKey, soundMuted, myLiveAnswer, kahoot.finishedAt, soloState.startedAt]);

  // Limpiar audio y temporizadores al desmontar
  useEffect(() => () => {
    stopKahootMusic();
    if (gongBannerTimerRef.current) clearTimeout(gongBannerTimerRef.current);
    if (soloSubmitTimerRef.current) clearTimeout(soloSubmitTimerRef.current);
  }, []);

  if (!isOpen || !liveTask) return null;

  // Enviar respuesta del participante
  const handleSubmitAnswer = async (submissionPayload) => {
    const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
    if (!currentQuestion || myLiveAnswer || activePhase !== 'question' || submittingRoundRef.current === roundKey) return;
    submittingRoundRef.current = roundKey;

    if (!soundMutedRef.current) {
      playAnswerSelectSound();
    }

    const startTs =
      viewMode === 'solo'
        ? activeStartedAt > 0
          ? activeStartedAt
          : Date.now() - 1000
        : roundLocalStartMapRef.current[roundKey] || Date.now() - 1000;
    const elapsedMs = Math.max(200, Date.now() - startTs);
    const isCorrect = evaluateKahootAnswer(currentQuestion, submissionPayload);

    let effectiveIsCorrect = isCorrect;
    let isFirstForRiddle = false;
    if (currentQuestion.type === 'riddle') {
      let currentFirstAt = activeFirstCorrectAt;
      const latestKahootData = liveTaskRef.current?.kahoot || kahoot;
      if (
        !currentFirstAt &&
        latestKahootData?.firstCorrectRoundKey === currentRoundKey &&
        Number(latestKahootData?.firstCorrectAt) > 0
      ) {
        currentFirstAt = Number(latestKahootData.firstCorrectAt);
      }
      if (!currentFirstAt) {
        Object.values(latestKahootData?.participants || {}).forEach((p) => {
          const a = p?.answers?.[String(activeQIndex)];
          if (a?.isCorrect && Number(a.answeredAt) > 0) {
            if (!currentFirstAt || Number(a.answeredAt) < currentFirstAt) {
              currentFirstAt = Number(a.answeredAt);
            }
          }
        });
      }

      if (currentFirstAt > 0 && Date.now() - currentFirstAt > 2000) {
        showMessage?.('¡Acertijo resuelto! El tiempo para responder este acertijo ya terminó.');
        return;
      }
      if (!currentFirstAt && isCorrect) {
        isFirstForRiddle = true;
      }
    }

    if (viewMode === 'solo') {
      const scoreCalc = calculateKahootPoints({
        isCorrect: effectiveIsCorrect,
        timeMs: elapsedMs,
        timeLimitSec: currentQuestion.timeLimit || 20,
        pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
        currentStreak: soloState.streak || 0,
      });

      const answerObj = {
        ...submissionPayload,
        ...(currentQuestion.id ? { questionId: currentQuestion.id } : {}),
        questionIndex: activeQIndex,
        isCorrect: effectiveIsCorrect,
        isFirstCorrect: isFirstForRiddle,
        pointsEarned: scoreCalc.pointsEarned,
        streakBonus: scoreCalc.streakBonus,
        timeMs: elapsedMs,
        answeredAt: Date.now(),
      };

      setSoloState((prev) => ({
        ...prev,
        firstCorrectAt: isFirstForRiddle ? Date.now() : prev.firstCorrectAt,
        score: prev.score + scoreCalc.pointsEarned,
        streak: scoreCalc.newStreak,
        correctCount: prev.correctCount + (effectiveIsCorrect ? 1 : 0),
        answers: {
          ...prev.answers,
          [String(activeQIndex)]: answerObj,
        },
      }));

      // En modo práctica individual, tras responder uno mismo, suena la campana
      if (soloSubmitTimerRef.current) clearTimeout(soloSubmitTimerRef.current);
      soloSubmitTimerRef.current = setTimeout(() => {
        triggerRoundEndWithGong(currentQuestion.type === 'riddle' ? 'riddle_solved' : 'all_answered');
      }, currentQuestion.type === 'riddle' ? 800 : 200);
      return;
    }

    const currentParts = { ...(liveTaskRef.current?.kahoot?.participants || {}) };
    const me = currentParts[safePlayerId] || {
      id: safePlayerId,
      realName: loggedInName || myNickname,
      nickname: myNickname,
      avatar: myAvatar,
      score: 0,
      streak: 0,
      correctCount: 0,
      totalTimeMs: 0,
      joinedAt: Date.now(),
      answers: {},
    };

    const existingLiveFirstAt = Number(liveTaskRef.current?.kahoot?.firstCorrectAt) || 0;
    const hasExistingFirstAt =
      liveTaskRef.current?.kahoot?.firstCorrectRoundKey === currentRoundKey &&
      existingLiveFirstAt > 0;
    const willSetFirstAt = isFirstForRiddle && !hasExistingFirstAt;
    const nowTs = Date.now();

    const scoreCalc = calculateKahootPoints({
      isCorrect: effectiveIsCorrect,
      timeMs: elapsedMs,
      timeLimitSec: currentQuestion.timeLimit || 20,
      pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
      currentStreak: me.streak || 0,
    });

    const answerObj = {
      ...submissionPayload,
      ...(currentQuestion.id ? { questionId: currentQuestion.id } : {}),
      questionIndex: activeQIndex,
      isCorrect: effectiveIsCorrect,
      isFirstCorrect: isFirstForRiddle && !hasExistingFirstAt,
      pointsEarned: scoreCalc.pointsEarned,
      streakBonus: scoreCalc.streakBonus,
      timeMs: elapsedMs,
      answeredAt: nowTs,
    };

    const updatedMe = {
      ...me,
      nickname: myNickname,
      avatar: myAvatar,
      score: (Number(me.score) || 0) + scoreCalc.pointsEarned,
      streak: scoreCalc.newStreak,
      correctCount: (Number(me.correctCount) || 0) + (effectiveIsCorrect ? 1 : 0),
      totalTimeMs: (Number(me.totalTimeMs) || 0) + elapsedMs,
      lastAnswer: answerObj,
      answers: {
        ...(me.answers || {}),
        [String(activeQIndex)]: answerObj,
      },
    };

    const nextParts = {
      ...currentParts,
      [safePlayerId]: updatedMe,
    };

    const riddleDocUpdates = willSetFirstAt
      ? { firstCorrectAt: nowTs, firstCorrectRoundKey: currentRoundKey }
      : {};
    const riddleDotUpdates = willSetFirstAt
      ? {
          'kahoot.firstCorrectAt': nowTs,
          'kahoot.firstCorrectRoundKey': currentRoundKey,
        }
      : {};

    // Si con esta respuesta ya respondieron todos los participantes, transicionar a 'revealed' en la misma escritura atómica
    const { totalParticipants: afterTotal, answeredCount: afterAnswered } =
      buildKahootLeaderboard(nextParts, activeQIndex);
    const allDoneNow = afterTotal > 0 && afterAnswered >= afterTotal;

    const partialPayload = {
      ...riddleDocUpdates,
      participants: nextParts,
      ...(allDoneNow ? { phase: 'revealed', lastEndReason: 'all_answered' } : {}),
    };
    const dotPayload = {
      ...riddleDotUpdates,
      [`kahoot.participants.${safePlayerId}`]: updatedMe,
      ...(allDoneNow
        ? {
            'kahoot.phase': 'revealed',
            'kahoot.lastEndReason': 'all_answered',
          }
        : {}),
    };

    if (allDoneNow) {
      const roundKeyNow = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
      gongTriggeredForRoundRef.current = roundKeyNow;
      setLocalRevealedRoundKey(roundKeyNow);
      stopKahootMusic();
      if (!soundMutedRef.current) {
        playGongSound();
      }
      setGongBannerVisible(true);
      if (gongBannerTimerRef.current) clearTimeout(gongBannerTimerRef.current);
      gongBannerTimerRef.current = setTimeout(() => setGongBannerVisible(false), 2600);
    }

    await updateKahootState(partialPayload, dotPayload);
  };

  // Controles de Anfitrión (Docente o Modo Demo)
  const handleStartLiveQuestion = async (indexToStart = 0) => {
    const targetQ = questions[indexToStart];
    if (!targetQ) return;
    const now = Date.now();
    const dur = Number(targetQ.timeLimit) || 20;
    const nextRoundKey = `live_${indexToStart}_${now}`;
    gongTriggeredForRoundRef.current = '';
    submittingRoundRef.current = '';
    setGongBannerVisible(false);
    setLocalRevealedRoundKey('');
    roundLocalStartMapRef.current[nextRoundKey] = now;
    setTimerState({ roundKey: nextRoundKey, seconds: dur });
    remainingSecondsRef.current = dur;

    const partialUpdates = {
      status: 'live',
      phase: 'question',
      currentQuestionIndex: indexToStart,
      questionStartedAt: now,
      questionDuration: dur,
      firstCorrectAt: null,
      firstCorrectRoundKey: nextRoundKey,
    };
    const dotUpdates = {
      'kahoot.status': 'live',
      'kahoot.phase': 'question',
      'kahoot.currentQuestionIndex': indexToStart,
      'kahoot.questionStartedAt': now,
      'kahoot.questionDuration': dur,
      'kahoot.firstCorrectAt': null,
      'kahoot.firstCorrectRoundKey': nextRoundKey,
    };

    // Al iniciar la Pregunta 1 (indexToStart === 0), reiniciar puntajes previos de la sala sin sobrescribir el mapa entero
    if (indexToStart === 0) {
      const cleanParticipants = {};
      Object.entries(liveTaskRef.current?.kahoot?.participants || kahoot.participants || {}).forEach(
        ([k, p]) => {
          if (!p) return;
          const resetEntry = {
            ...p,
            score: 0,
            streak: 0,
            correctCount: 0,
            totalTimeMs: 0,
            lastAnswer: null,
            answers: {},
          };
          cleanParticipants[k] = resetEntry;
          dotUpdates[`kahoot.participants.${k}`] = resetEntry;
        }
      );
      partialUpdates.participants = cleanParticipants;
    }

    await updateKahootState(partialUpdates, dotUpdates);
  };

  const handleNextStep = async () => {
    if (viewMode === 'solo') {
      if (soloState.qIndex + 1 < questions.length) {
        const nextIdx = soloState.qIndex + 1;
        const dur = Number(questions[nextIdx]?.timeLimit) || 20;
        const now = Date.now();
        gongTriggeredForRoundRef.current = '';
        submittingRoundRef.current = '';
        setGongBannerVisible(false);
        setLocalRevealedRoundKey('');
        setTimerState({ roundKey: `solo_${nextIdx}_${now}`, seconds: dur });
        remainingSecondsRef.current = dur;
        setSoloState((prev) => ({
          ...prev,
          qIndex: nextIdx,
          phase: 'question',
          startedAt: now,
          firstCorrectAt: null,
        }));
      } else {
        setSoloState((prev) => ({ ...prev, phase: 'podium' }));
      }
      return;
    }

    if (activeQIndex + 1 < questions.length) {
      await handleStartLiveQuestion(activeQIndex + 1);
    } else {
      await updateKahootState(
        {
          status: 'finished',
          phase: 'podium',
          finishedAt: Date.now(),
        },
        {
          'kahoot.status': 'finished',
          'kahoot.phase': 'podium',
          'kahoot.finishedAt': Date.now(),
        }
      );
    }
  };

  const handleRestartLiveGame = async () => {
    gongTriggeredForRoundRef.current = '';
    submittingRoundRef.current = '';
    setGongBannerVisible(false);
    setLocalRevealedRoundKey('');
    setSoloState((prev) => ({ ...prev, active: false }));
    const resetParts = {};
    const dotUpdates = {
      'kahoot.status': 'lobby',
      'kahoot.phase': 'lobby',
      'kahoot.currentQuestionIndex': 0,
      'kahoot.questionStartedAt': 0,
      'kahoot.firstCorrectAt': null,
      'kahoot.firstCorrectRoundKey': null,
    };
    Object.entries(kahoot.participants || {}).forEach(([k, p]) => {
      if (!p) return;
      const resetEntry = {
        ...p,
        score: 0,
        streak: 0,
        correctCount: 0,
        totalTimeMs: 0,
        lastAnswer: null,
        answers: {},
      };
      resetParts[k] = resetEntry;
      dotUpdates[`kahoot.participants.${k}`] = resetEntry;
    });

    setViewMode('live');
    await updateKahootState(
      {
        status: 'lobby',
        phase: 'lobby',
        currentQuestionIndex: 0,
        questionStartedAt: 0,
        firstCorrectAt: null,
        firstCorrectRoundKey: null,
        participants: resetParts,
      },
      dotUpdates
    );
    showMessage?.('🔄 Sala reiniciada y lista para jugar en vivo.');
  };

  const handleAddDemoBotsToLobby = async () => {
    const currentParts = { ...(kahoot.participants || {}) };
    const dotUpdates = {};
    DEMO_KAHOOT_BOTS.forEach((bot) => {
      const botEntry = {
        id: bot.id,
        realName: bot.realName,
        nickname: bot.nickname,
        avatar: bot.avatar,
        score: 0,
        streak: 0,
        correctCount: 0,
        joinedAt: Date.now(),
        isSimulatedBot: true,
        answers: {},
      };
      currentParts[bot.id] = botEntry;
      dotUpdates[`kahoot.participants.${bot.id}`] = botEntry;
    });
    await updateKahootState({ participants: currentParts }, dotUpdates);
    showMessage?.('🤖 4 participantes simulados se unieron a la sala.');
  };

  const handleToggleReviewEnabled = async () => {
    if (role !== 'teacher') return;
    const nextReview = !Boolean(kahoot.reviewEnabled);
    await updateKahootState(
      { reviewEnabled: nextReview },
      { 'kahoot.reviewEnabled': nextReview }
    );
    showMessage?.(
      nextReview
        ? '🔓 Repaso habilitado: los participantes ya pueden ver y repasar las preguntas.'
        : '🔒 Repaso bloqueado: las respuestas están ocultas para los participantes.'
    );
  };

  const handleCopyPublicLink = async () => {
    const url = buildPublicKahootUrl(kahoot.pin || '482915');
    try {
      await navigator.clipboard.writeText(url);
      showMessage?.(`🔗 Enlace público copiado: ${url}`);
    } catch {
      showMessage?.(`🔗 Enlace público: ${url}`);
    }
  };

  const startSoloPractice = () => {
    if (!canReview) {
      showMessage?.('🔒 El docente aún no ha habilitado el modo repaso.');
      return;
    }
    const firstDur = Number(questions[0]?.timeLimit) || 20;
    const now = Date.now();
    gongTriggeredForRoundRef.current = '';
    submittingRoundRef.current = '';
    setGongBannerVisible(false);
    setLocalRevealedRoundKey('');
    setTimerState({ roundKey: `solo_0_${now}`, seconds: firstDur });
    remainingSecondsRef.current = firstDur;
    setSoloState({
      active: true,
      qIndex: 0,
      phase: 'question',
      startedAt: now,
      score: 0,
      streak: 0,
      correctCount: 0,
      answers: {},
    });
    setViewMode('solo');
  };

  const progressPct = Math.max(0, Math.min(100, (remainingSeconds / Math.max(1, activeDuration)) * 100));

  // Desenfoque progresivo para imágenes con imageReveal === 'blur'
  const blurPx =
    currentQuestion?.imageReveal === 'blur' && activePhase === 'question'
      ? Math.round((remainingSeconds / Math.max(1, activeDuration)) * 18)
      : 0;

  return createPortal(
    <div className="kahoot-live-portal fixed inset-0 z-[999999] bg-gradient-to-br from-[#1F0657] via-[#39127A] to-[#130338] text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      <style>{`
        .kahoot-live-portal .kahoot-question-card,
        .dark .kahoot-live-portal .kahoot-question-card {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .kahoot-live-portal .kahoot-question-card h3,
        .dark .kahoot-live-portal .kahoot-question-card h3,
        .kahoot-live-portal .kahoot-question-card p,
        .dark .kahoot-live-portal .kahoot-question-card p,
        .kahoot-live-portal .kahoot-question-card span,
        .dark .kahoot-live-portal .kahoot-question-card span {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
        }
        .kahoot-live-portal input.kahoot-light-input,
        .dark .kahoot-live-portal input.kahoot-light-input {
          background-color: #ffffff !important;
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
        }
        .kahoot-live-portal input.kahoot-light-input::placeholder,
        .dark .kahoot-live-portal input.kahoot-light-input::placeholder {
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
        }
      `}</style>
      {/* Fondo decorativo geométrico estilo Kahoot */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-400 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rotate-45 bg-indigo-500 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-3xl bg-pink-500 blur-3xl" />
      </div>

      {/* BARRA SUPERIOR DE CONTROL EN PANTALLA COMPLETA */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E21B3C] via-[#7B2CBF] to-[#1368CE] flex items-center justify-center font-black text-lg shadow-lg shrink-0 border border-white/20">
            K!
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-sm sm:text-base truncate max-w-[220px] sm:max-w-[400px]">
                {liveTask.title || 'Kahoot'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/15 border border-white/20 tracking-wider">
                PIN: {kahoot.pin || '482915'}
              </span>
              {viewMode === 'solo' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-gray-950 uppercase">
                  Práctica
                </span>
              ) : viewMode === 'review' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-gray-950 uppercase">
                  Repaso
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white uppercase flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" /> En vivo
                </span>
              )}
            </div>
            <p className="text-[11px] text-purple-200/80 truncate">
              {liveTask.targetGroupName && liveTask.targetGroupName !== 'Global'
                ? `${liveTask.targetGroupName} • `
                : ''}
              {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
            </p>
          </div>
        </div>

        {/* Controles derechos: Cambio de nombre en vivo, Música/Gong, Modo Repaso y Salir */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Píldora para cambiar el nombre/apodo en cualquier momento */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNicknameDraft(myNickname);
                setIsEditingNickname(!isEditingNickname);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Cambiar nombre"
            >
              <span className="text-base">{myAvatar}</span>
              <span className="max-w-[130px] truncate">{myNickname}</span>
              <Edit3 size={12} className="text-purple-200" />
            </button>

            {isEditingNickname && (
              <div className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-purple-400/40 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-200">
                    Cambiar nombre
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingNickname(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={nicknameDraft}
                  maxLength={28}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNickname(nicknameDraft, myAvatar);
                  }}
                  placeholder="Tu nombre o apodo..."
                  className="w-full py-2 px-3 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white outline-none focus:border-purple-400"
                  autoFocus
                />
                <div>
                  <span className="text-[10px] font-bold text-purple-300 block mb-1">
                    Ícono:
                  </span>
                  <div className="grid grid-cols-8 gap-1">
                    {KAHOOT_AVATARS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setMyAvatar(av)}
                        className={`p-1 rounded-lg text-sm flex items-center justify-center transition-transform cursor-pointer ${
                          myAvatar === av
                            ? 'bg-purple-600 scale-110 ring-2 ring-white'
                            : 'bg-white/5 hover:bg-white/15'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveNickname(nicknameDraft, myAvatar)}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-xs transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Botón para compartir enlace público #kahoot */}
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copiar enlace público #kahoot para invitados externos"
          >
            <Share2 size={14} />
            <span className="hidden lg:inline">Link #kahoot</span>
          </button>

          {/* Control del Docente: Habilitar / Ocultar Repaso a estudiantes e invitados */}
          {role === 'teacher' && (
            <button
              type="button"
              onClick={handleToggleReviewEnabled}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isReviewEnabled
                  ? 'bg-emerald-500/80 border-emerald-300/50 text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-amber-200'
              }`}
              title={
                isReviewEnabled
                  ? 'El repaso está habilitado para los participantes (clic para ocultar)'
                  : 'El repaso está oculto para los participantes (clic para habilitar)'
              }
            >
              {isReviewEnabled ? <Unlock size={14} /> : <Lock size={14} />}
              <span className="hidden sm:inline">
                {isReviewEnabled ? 'Repaso: Visible' : 'Repaso: Oculto'}
              </span>
            </button>
          )}

          {/* Conmutador entre Sala en Vivo y Guía de Repaso (solo si tiene permiso) */}
          {canReview && (
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'review') {
                  if (soloState.active) {
                    setViewMode('solo');
                  } else if (kahoot.status === 'finished' && !canControlGame) {
                    startSoloPractice();
                  } else {
                    setViewMode('live');
                  }
                } else {
                  setViewMode('review');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">
                {viewMode === 'review' ? 'Volver al juego' : 'Repasar'}
              </span>
            </button>
          )}

          {/* Botón de Música Ambiental */}
          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              !soundMuted
                ? 'bg-purple-600/80 border-purple-400/50 text-white'
                : 'bg-white/10 border-white/15 text-gray-300'
            }`}
            title={soundMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span className="hidden md:inline">{soundMuted ? 'Silenciado' : 'Sonido'}</span>
          </button>

          {/* Botón para salir de pantalla completa */}
          <button
            type="button"
            onClick={() => {
              stopKahootMusic();
              syncTaskToParent();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500/80 hover:bg-red-600 text-white text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm"
            title="Salir"
          >
            <X size={15} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Banner animado cuando suena el Gong / Platillo */}
      {gongBannerVisible && (
        <div className="relative z-30 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-gray-950 font-black text-xs sm:text-sm py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200">
          <Bell size={16} className="animate-bounce" />
          <span>Tiempo finalizado</span>
        </div>
      )}

      {/* CUERPO PRINCIPAL DE PANTALLA COMPLETA */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
        {/* =====================================================================
            MODO 1: GUÍA DE REPASO Y ESTUDIO
           ===================================================================== */}
        {viewMode === 'review' && canReview ? (
          <div className="max-w-4xl w-full mx-auto space-y-5 pb-10 animate-in fade-in">
            <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 mb-1">
                  <BookOpen size={12} /> Repaso
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {liveTask.title}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {role === 'teacher' && (
                  <button
                    type="button"
                    onClick={handleToggleReviewEnabled}
                    className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 border shadow-lg cursor-pointer transition-all ${
                      isReviewEnabled
                        ? 'bg-emerald-500/30 border-emerald-300/50 text-emerald-200 hover:bg-emerald-500/40'
                        : 'bg-amber-500/25 border-amber-300/50 text-amber-200 hover:bg-amber-500/35'
                    }`}
                  >
                    {isReviewEnabled ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>
                      {isReviewEnabled ? 'Repaso habilitado a alumnos' : 'Habilitar repaso a alumnos'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={startSoloPractice}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-gray-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform hover:scale-102"
                >
                  <Play size={14} />
                  <span>Practicar</span>
                </button>
                {canControlGame && (
                  <button
                    type="button"
                    onClick={handleRestartLiveGame}
                    className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 border border-purple-400/40 shadow-lg cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Nueva partida</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lista de todas las preguntas para repasar */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const mySavedAns =
                  myParticipantData?.answers?.[String(qIdx)] ||
                  soloState.answers?.[String(qIdx)];

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-white text-[#46178F] font-black text-sm flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/30">
                              {KAHOOT_QUESTION_TYPES[q.type]?.label || 'Pregunta'}
                            </span>
                            <span className="text-[10px] font-bold text-purple-200 flex items-center gap-1">
                              <Clock size={11} /> {q.timeLimit}s
                            </span>
                            {q.pointsMultiplier === 2 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-gray-950">
                                Puntos dobles x2
                              </span>
                            )}
                          </div>
                          <h4 className="text-base sm:text-lg font-extrabold text-white mt-1">
                            {q.text}
                          </h4>
                        </div>
                      </div>

                      {mySavedAns && (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                            mySavedAns.isCorrect
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                              : 'bg-red-500/25 text-red-300 border border-red-400/40'
                          }`}
                        >
                          {mySavedAns.isCorrect
                            ? `✔ +${mySavedAns.pointsEarned || 0} pts`
                            : '✘ Incorrecta'}
                        </span>
                      )}
                    </div>

                    {q.imageUrl && (
                      <div className="flex justify-center">
                        <img
                          src={q.imageUrl}
                          alt={`Pregunta ${qIdx + 1}`}
                          className="max-h-48 rounded-2xl object-contain border border-white/20 bg-black/20"
                        />
                      </div>
                    )}

                    {/* Opciones en lista vertical */}
                    {(q.type === 'quiz' || q.type === 'truefalse') && (
                      <div className="flex flex-col gap-2">
                        {(q.options || []).map((opt, oIdx) => {
                          const color = KAHOOT_COLORS[oIdx % KAHOOT_COLORS.length];
                          const wasChosenByMe =
                            mySavedAns &&
                            (mySavedAns.optionIndex === oIdx ||
                              (Array.isArray(mySavedAns.optionIndices) &&
                                mySavedAns.optionIndices.includes(oIdx)));
                          return (
                            <div
                              key={opt.id || oIdx}
                              className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all ${
                                opt.isCorrect
                                  ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-sm'
                                  : 'bg-white/5 border-white/10 text-purple-100 opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-8 h-8 rounded-xl ${color.badgeClass} font-black text-sm flex items-center justify-center shrink-0`}
                                >
                                  {color.symbol}
                                </span>
                                <span className="text-xs sm:text-sm font-bold break-words">
                                  {opt.text}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {wasChosenByMe && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                                    Tu elección
                                  </span>
                                )}
                                {opt.isCorrect && (
                                  <span className="text-xs font-black text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 size={15} /> Correcta
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'type_answer' && (
                      <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xs sm:text-sm">
                        <span className="font-black text-emerald-300">✔ Respuesta correcta: </span>
                        <span className="font-bold text-white">{q.correctAnswer}</span>
                        {q.acceptedAnswers?.length > 0 && (
                          <span className="block text-[11px] text-purple-200 mt-1">
                            También se acepta: {q.acceptedAnswers.join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    {q.type === 'puzzle' && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-emerald-300 block">
                          ✔ Orden correcto:
                        </span>
                        {(q.puzzleItems || []).map((item, idx) => {
                          const color = KAHOOT_COLORS[idx % KAHOOT_COLORS.length];
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold"
                            >
                              <span
                                className={`w-6 h-6 rounded-lg ${color.badgeClass} font-black flex items-center justify-center`}
                              >
                                {idx + 1}°
                              </span>
                              <span>{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'riddle' && (
                      <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xs sm:text-sm">
                        <span className="font-black text-emerald-300">✔ Respuesta: </span>
                        <span className="font-bold text-white">{q.correctAnswer}</span>
                        {q.acceptedAnswers?.length > 0 && (
                          <span className="block text-[11px] text-purple-200 mt-1">
                            También se acepta: {q.acceptedAnswers.join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-xs text-indigo-100">
                        <strong className="text-indigo-300">Retroalimentación:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : activePhase === 'lobby' ? (
          /* =====================================================================
              MODO 2: SALA DE ESPERA EN VIVO (LOBBY)
             ===================================================================== */
          <div className="max-w-4xl w-full mx-auto my-auto space-y-6 py-4 animate-in fade-in">
            {/* Tarjeta superior con PIN gigante */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-center space-y-4 shadow-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/30 border border-purple-300/30 text-xs font-black uppercase tracking-widest text-purple-200">
                <Sparkles size={14} /> Sala de espera
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                {liveTask.title}
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-white text-[#0f172a] px-6 py-3.5 rounded-2xl shadow-xl">
                  <span className="text-xs font-black uppercase tracking-wider text-[#475569]">
                    PIN:
                  </span>
                  <span className="text-3xl sm:text-4xl font-black tracking-widest text-[#46178F]">
                    {kahoot.pin || '482915'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="px-4 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  title="Copiar enlace público #kahoot para participantes sin cuenta"
                >
                  <Share2 size={15} />
                  <span>Copiar link #kahoot</span>
                </button>
              </div>
              <p className="text-[11px] font-bold text-purple-200/80">
                Acceso público sin cuenta: <span className="text-amber-300 font-black">englishtech.vercel.app/#kahoot</span> con el PIN <span className="text-white font-black">{kahoot.pin || '482915'}</span>
              </p>

              {/* Editor directo de Nombre / Apodo para el participante */}
              {role !== 'teacher' && (
                <div className="max-w-md mx-auto pt-2">
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/15 space-y-3">
                    <label className="block text-xs font-extrabold text-purple-200">
                      Tu nombre o apodo
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl select-none">{myAvatar}</span>
                      <input
                        type="text"
                        value={nicknameDraft}
                        maxLength={28}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNickname(nicknameDraft, myAvatar);
                        }}
                        placeholder="Escribe tu apodo..."
                        className="flex-1 py-2.5 px-3.5 rounded-xl bg-white/15 border border-white/25 text-sm font-black text-white placeholder:text-purple-300/60 outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNickname(nicknameDraft, myAvatar)}
                        className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs transition-all cursor-pointer shrink-0 shadow-md"
                      >
                        Guardar
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                      {KAHOOT_AVATARS.slice(0, 10).map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => handleSaveNickname(nicknameDraft || myNickname, av)}
                          className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                            myAvatar === av
                              ? 'bg-amber-400 text-gray-950 scale-110 shadow-md'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Participantes Conectados en Vivo */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-amber-400" />
                  <span className="font-black text-sm sm:text-base">
                    Participantes ({leaderboard.length})
                  </span>
                </div>

                {canControlGame && (
                  <button
                    type="button"
                    onClick={handleAddDemoBotsToLobby}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-purple-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Simular participantes</span>
                  </button>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <div className="py-8 text-center text-sm text-purple-200/70 font-semibold italic">
                  Esperando participantes...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 justify-center py-2 max-h-60 overflow-y-auto px-1">
                  {leaderboard.map((player) => {
                    const isMe = player.id === safePlayerId;
                    return (
                      <div
                        key={player.id}
                        className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all animate-in zoom-in-95 ${
                          isMe
                            ? 'bg-amber-400 text-gray-950 ring-2 ring-white scale-105'
                            : 'bg-white/15 border border-white/20 text-white'
                        }`}
                      >
                        <span className="text-base">{player.avatar || '🦊'}</span>
                        <span>{player.displayName}</span>
                        {isMe && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-black/20">
                            Tú
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón de Inicio de Partida */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                {canControlGame ? (
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleStartLiveQuestion(0)}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-gray-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
                    >
                      <Play size={18} />
                      <span>Iniciar Kahoot</span>
                    </button>
                    {role === 'teacher' && (
                      <button
                        type="button"
                        onClick={startSoloPractice}
                        className="px-4 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/20 cursor-pointer"
                      >
                        Practicar individualmente
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-purple-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Esperando a que inicie la partida...</span>
                    </div>
                    {canReview && (
                      <button
                        type="button"
                        onClick={startSoloPractice}
                        className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/20 cursor-pointer"
                      >
                        Practicar individualmente
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activePhase === 'question' && currentQuestion ? (
          /* =====================================================================
              MODO 3: PREGUNTA ACTIVA EN VIVO (Vista Proyector Docente vs Vista Estudiante)
             ===================================================================== */
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between gap-4 py-1 animate-in fade-in">
            {/* Barra de progreso de tiempo sincronizada */}
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    remainingSeconds <= 5
                      ? 'bg-gradient-to-r from-red-500 to-amber-500 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs font-black">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/20">
                    Pregunta {activeQIndex + 1} de {questions.length}
                  </span>
                  {currentQuestion.type === 'riddle' && (
                    <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white flex items-center gap-1 shadow-sm">
                      <HelpCircle size={13} /> Acertijo
                    </span>
                  )}
                  {currentQuestion.pointsMultiplier === 2 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-gray-950 flex items-center gap-1 animate-bounce">
                      <Zap size={13} /> Puntos Dobles x2
                    </span>
                  )}
                  {currentQuestion.allowMultiple && (
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500 text-white">
                      Selección múltiple
                    </span>
                  )}
                </div>

                {/* Reloj circular central y contador de respuestas */}
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3.5 py-1.5 rounded-2xl font-black text-base sm:text-lg flex items-center gap-1.5 border shadow-lg ${
                      remainingSeconds <= 5
                        ? 'bg-red-600 border-red-300 text-white scale-105'
                        : 'bg-white text-[#46178F] border-white'
                    }`}
                  >
                    <Clock size={16} />
                    <span>{Math.ceil(remainingSeconds)}s</span>
                  </div>

                  {viewMode === 'live' && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-extrabold">
                      {answeredCount} / {totalParticipants} resp.
                    </div>
                  )}

                  {canControlGame && viewMode === 'live' && (
                    <button
                      type="button"
                      onClick={() => triggerRoundEndWithGong('teacher_skip')}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black cursor-pointer shadow-sm"
                      title="Terminar pregunta"
                    >
                      Terminar pregunta
                    </button>
                  )}
                </div>
              </div>

              {isRiddleWindowActive && (
                <div className="py-2 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-gray-950 text-xs sm:text-sm font-black text-center flex items-center justify-center gap-2 shadow-lg animate-pulse">
                  <Zap size={16} />
                  <span>
                    ⚡ ¡El acertijo fue respondido! Quedan {(riddleGraceRemainingMs / 1000).toFixed(1)}s para responder
                  </span>
                </div>
              )}
            </div>

            {/* Tarjeta del Enunciado e Imagen de la Pregunta (blindada contra Modo Oscuro) */}
            <div
              className="kahoot-question-card p-6 sm:p-8 rounded-3xl bg-white text-[#0f172a] shadow-2xl text-center space-y-4 border-4 border-purple-300/40"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <h3
                className="text-lg sm:text-3xl font-black leading-snug text-[#0f172a]"
                style={{ color: '#0f172a' }}
              >
                {currentQuestion.text}
              </h3>

              {currentQuestion.imageUrl && (
                <div className="flex justify-center overflow-hidden rounded-2xl bg-gray-100 border border-gray-200 max-h-64">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Imagen de la pregunta"
                    style={{
                      filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
                      transition: 'filter 300ms linear',
                    }}
                    className="max-h-64 object-contain"
                  />
                </div>
              )}
            </div>

            {isTeacherProjector ? (
              /* =================================================================
                 VISTA PROYECTOR DEL DOCENTE:
                 Solo muestra el enunciado, reloj y panel de respuestas recibidas
                 en tiempo real. Las opciones y la respuesta correcta se revelan
                 únicamente al finalizar la ronda (activePhase === 'revealed').
                 ================================================================= */
              <div className="p-5 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-gray-950 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                      {answeredCount}
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-sm sm:text-base text-white">
                        Respuestas recibidas: {answeredCount} de {totalParticipants}
                      </h4>
                      <p className="text-xs text-purple-200/85">
                        {currentQuestion.type === 'riddle' || currentQuestion.type === 'type_answer'
                          ? 'Los estudiantes están escribiendo su respuesta desde sus dispositivos. La respuesta se revelará al finalizar la ronda.'
                          : 'Los estudiantes están seleccionando su opción desde sus dispositivos. Las opciones se revelarán al finalizar la ronda.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerRoundEndWithGong('teacher_skip')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs sm:text-sm cursor-pointer shadow-lg shrink-0 transition-transform hover:scale-102"
                  >
                    Revelar respuesta ahora
                  </button>
                </div>

                {currentQuestion.type === 'riddle' && activeFirstCorrectAt && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <Zap size={20} className="text-amber-300 shrink-0" />
                      <div>
                        <h5 className="font-black text-xs sm:text-sm text-white">
                          {isRiddleWindowActive
                            ? `¡Acertijo respondido! Ventana de gracia: ${(riddleGraceRemainingMs / 1000).toFixed(1)}s`
                            : '¡Tiempo del acertijo finalizado!'}
                        </h5>
                        <p className="text-[11px] text-purple-200">
                          {isRiddleWindowActive
                            ? 'Los demás estudiantes tienen 2 segundos para validar su respuesta.'
                            : 'Cerrando pregunta y revelando los acertantes...'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-gray-950 font-black text-xs shrink-0">
                      {riddleWinners.length} {riddleWinners.length === 1 ? 'acierto' : 'aciertos'}
                    </span>
                  </div>
                )}

                {/* Barra de progreso de respuestas recibidas */}
                <div className="w-full h-3 rounded-full bg-black/30 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((answeredCount / Math.max(1, totalParticipants)) * 100)
                      )}%`,
                    }}
                  />
                </div>

                {/* Avatares de estudiantes que ya respondieron (sin revelar qué opción eligieron) */}
                {answeredCount > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto pt-1 px-1">
                    {leaderboard
                      .filter((p) => Boolean(p.currentQuestionAnswer))
                      .map((player) => (
                        <span
                          key={player.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-xs font-extrabold text-emerald-100 flex items-center gap-1.5 animate-in zoom-in-95"
                        >
                          <span>{player.avatar || '🦊'}</span>
                          <span className="max-w-[130px] truncate">{player.displayName}</span>
                          <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
                        </span>
                      ))}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs font-bold text-purple-200/75 italic">
                    Esperando las primeras respuestas de la clase...
                  </div>
                )}
              </div>
            ) : (
              /* =================================================================
                 VISTA DEL ESTUDIANTE / PRÁCTICA:
                 Muestra el enunciado de la pregunta y todas las opciones
                 interactivas en lista vertical.
                 ================================================================= */
              <>
                {/* Estado de espera si el estudiante ya respondió */}
                {myLiveAnswer && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/25 border-2 border-emerald-400 text-center animate-in zoom-in-95">
                    <div className="text-sm sm:text-base font-black text-emerald-200 flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      <span>
                        Respuesta enviada ({(myLiveAnswer.timeMs / 1000).toFixed(1)}s)
                      </span>
                    </div>
                  </div>
                )}

                {/* Alerta de ventana de 2 segundos en acertijo o bloqueo */}
                {isRiddleLockedForMe && (
                  <div className="p-5 rounded-3xl bg-red-500/20 border-2 border-red-400 text-center space-y-2 animate-in zoom-in-95">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/40 text-red-200 flex items-center justify-center mx-auto">
                      <Lock size={22} />
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white">
                      ¡Acertijo resuelto!
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-200">
                      Otro participante resolvió el acertijo primero y la ventana de 2 segundos ha finalizado.
                    </p>
                  </div>
                )}

                {isRiddleWindowActive && !myLiveAnswer && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-400/25 to-amber-500/30 border-2 border-amber-400 text-white flex items-center justify-center gap-2 animate-bounce shadow-lg">
                    <Zap size={18} className="text-amber-300" />
                    <span className="font-black text-xs sm:text-sm">
                      ⚡ ¡El acertijo fue respondido! Tienes {(riddleGraceRemainingMs / 1000).toFixed(1)}s para responder.
                    </span>
                  </div>
                )}

                {/* OPCIONES EN LISTA VERTICAL (DE ARRIBA HACIA ABAJO) CON TEXTO COMPLETO */}
                {(currentQuestion.type === 'quiz' || currentQuestion.type === 'truefalse') && (
                  <div className="flex flex-col gap-3 w-full">
                    {(currentQuestion.options || []).map((opt, oIdx) => {
                      const color = KAHOOT_COLORS[oIdx % KAHOOT_COLORS.length];
                      const isMultiSelected = selectedMultiIndices.includes(oIdx);
                      const isLockedSelection =
                        myLiveAnswer &&
                        (myLiveAnswer.optionIndex === oIdx ||
                          (Array.isArray(myLiveAnswer.optionIndices) &&
                            myLiveAnswer.optionIndices.includes(oIdx)));

                      return (
                        <button
                          key={opt.id || oIdx}
                          type="button"
                          disabled={Boolean(myLiveAnswer)}
                          onClick={() => {
                            if (currentQuestion.allowMultiple) {
                              setSelectedMultiIndices((prev) =>
                                prev.includes(oIdx)
                                  ? prev.filter((i) => i !== oIdx)
                                  : [...prev, oIdx]
                              );
                            } else {
                              handleSubmitAnswer({ optionIndex: oIdx, optionIndices: [oIdx] });
                            }
                          }}
                          className={`w-full p-4 sm:p-4.5 rounded-2xl border-b-4 text-left font-black transition-all flex items-center justify-between gap-3.5 shadow-lg ${
                            color.bgClass
                          } ${
                            myLiveAnswer
                              ? isLockedSelection
                                ? 'ring-4 ring-white scale-[1.01]'
                                : 'opacity-45 cursor-not-allowed'
                              : isMultiSelected
                                ? 'ring-4 ring-white scale-[1.01]'
                                : 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-black/20 text-white font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-inner">
                              {color.symbol}
                            </span>
                            <span className="text-sm sm:text-lg text-white leading-snug break-words">
                              {opt.text}
                            </span>
                          </div>

                          {(isMultiSelected || isLockedSelection) && (
                            <span className="px-3 py-1 rounded-xl bg-white text-gray-950 text-xs font-black shrink-0 flex items-center gap-1">
                              <CheckCircle2 size={14} /> Elegida
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {currentQuestion.allowMultiple && !myLiveAnswer && (
                      <button
                        type="button"
                        disabled={selectedMultiIndices.length === 0}
                        onClick={() =>
                          handleSubmitAnswer({
                            optionIndex: selectedMultiIndices[0],
                            optionIndices: selectedMultiIndices,
                          })
                        }
                        className="mt-1 w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-gray-950 font-black text-sm shadow-xl cursor-pointer transition-all"
                      >
                        Confirmar ({selectedMultiIndices.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Entrada para Respuesta Corta (Type Answer) */}
                {currentQuestion.type === 'type_answer' && (
                  myLiveAnswer ? (
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
                      <span className="text-xs font-bold text-purple-200 block mb-1">
                        Tu respuesta:
                      </span>
                      <span className="text-base sm:text-lg font-black text-white">
                        “{myLiveAnswer.textAnswer || ''}”
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!typedAnswerText.trim()) return;
                        handleSubmitAnswer({ textAnswer: typedAnswerText.trim() });
                      }}
                      className="flex flex-col sm:flex-row gap-3 w-full"
                    >
                      <input
                        type="text"
                        value={typedAnswerText}
                        onChange={(e) => setTypedAnswerText(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                        className="kahoot-light-input flex-1 py-4 px-5 rounded-2xl bg-white text-[#0f172a] font-black text-base outline-none ring-4 ring-purple-400/40 focus:ring-amber-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!typedAnswerText.trim()}
                        className="px-8 py-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-gray-950 font-black text-base shadow-xl cursor-pointer"
                      >
                        Enviar
                      </button>
                    </form>
                  )
                )}

                {/* Entrada para Puzzle (Ordenar secuencia en lista vertical) */}
                {currentQuestion.type === 'puzzle' && (
                  <div className="space-y-2.5 w-full">
                    <p className="text-xs font-bold text-center text-purple-200">
                      {myLiveAnswer
                        ? 'Orden enviado:'
                        : 'Ordena las opciones con las flechas ↑ ↓:'}
                    </p>
                    {(myLiveAnswer?.puzzleOrder || puzzleOrderDraft).map((item, idx) => {
                      const color = KAHOOT_COLORS[idx % KAHOOT_COLORS.length];
                      return (
                        <div
                          key={`${idx}_${item}`}
                          className={`p-3.5 rounded-2xl border-b-4 ${color.bgClass} flex items-center justify-between gap-3 shadow-md ${
                            myLiveAnswer ? 'opacity-90' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-black/25 font-black text-sm flex items-center justify-center shrink-0">
                              {idx + 1}°
                            </span>
                            <span className="font-black text-sm sm:text-base text-white break-words">
                              {item}
                            </span>
                          </div>
                          {!myLiveAnswer && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const copy = [...puzzleOrderDraft];
                                  const [moved] = copy.splice(idx, 1);
                                  copy.splice(idx - 1, 0, moved);
                                  setPuzzleOrderDraft(copy);
                                }}
                                className="p-2 rounded-xl bg-black/25 hover:bg-black/40 disabled:opacity-30 text-white cursor-pointer"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === puzzleOrderDraft.length - 1}
                                onClick={() => {
                                  const copy = [...puzzleOrderDraft];
                                  const [moved] = copy.splice(idx, 1);
                                  copy.splice(idx + 1, 0, moved);
                                  setPuzzleOrderDraft(copy);
                                }}
                                className="p-2 rounded-xl bg-black/25 hover:bg-black/40 disabled:opacity-30 text-white cursor-pointer"
                              >
                                <ArrowDown size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!myLiveAnswer && (
                      <button
                        type="button"
                        onClick={() => handleSubmitAnswer({ puzzleOrder: puzzleOrderDraft })}
                        className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-black text-sm shadow-xl cursor-pointer"
                      >
                        Confirmar orden
                      </button>
                    )}
                  </div>
                )}

                {/* Entrada interactiva para Acertijo (Riddle - solo respuesta escrita) */}
                {currentQuestion.type === 'riddle' && !isRiddleLockedForMe && (
                  myLiveAnswer ? (
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
                      <span className="text-xs font-bold text-purple-200 block mb-1">
                        Tu respuesta:
                      </span>
                      <span className="text-base sm:text-lg font-black text-white">
                        “{myLiveAnswer.textAnswer || ''}”
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!typedAnswerText.trim() || isRiddleLockedForMe) return;
                        handleSubmitAnswer({ textAnswer: typedAnswerText.trim() });
                      }}
                      className="flex flex-col sm:flex-row gap-3 w-full"
                    >
                      <input
                        type="text"
                        disabled={isRiddleLockedForMe}
                        value={typedAnswerText}
                        onChange={(e) => setTypedAnswerText(e.target.value)}
                        placeholder="Escribe la respuesta del acertijo..."
                        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                        className="kahoot-light-input flex-1 py-4 px-5 rounded-2xl bg-white text-[#0f172a] font-black text-base outline-none ring-4 ring-purple-400/40 focus:ring-amber-400 disabled:opacity-50"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!typedAnswerText.trim() || isRiddleLockedForMe}
                        className="px-8 py-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-gray-950 font-black text-base shadow-xl cursor-pointer"
                      >
                        Enviar
                      </button>
                    </form>
                  )
                )}
              </>
            )}
          </div>
        ) : activePhase === 'revealed' && currentQuestion ? (
          /* =====================================================================
              MODO 4: REVELACIÓN DE RESPUESTA, MÁS RÁPIDO Y TABLA DE POSICIONES
             ===================================================================== */
          <div className="max-w-4xl w-full mx-auto space-y-5 py-2 animate-in fade-in">
            {/* Banner personal de acierto / fallo o resumen de anfitrión */}
            {myLiveAnswer ? (
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-wrap items-center justify-between gap-3 shadow-xl ${
                  myLiveAnswer.isCorrect
                    ? 'bg-emerald-500/25 border-emerald-400 text-white'
                    : 'bg-red-500/25 border-red-400 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl font-black text-2xl flex items-center justify-center shrink-0 ${
                      myLiveAnswer.isCorrect ? 'bg-emerald-400 text-gray-950' : 'bg-red-500 text-white'
                    }`}
                  >
                    {myLiveAnswer.isCorrect ? '✔' : '✘'}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-black">
                      {myLiveAnswer.isCorrect
                        ? `¡Correcto! +${myLiveAnswer.pointsEarned} pts`
                        : 'Incorrecto • +0 pts'}
                    </h4>
                    <p className="text-xs text-purple-100">
                      {(Number(myLiveAnswer.timeMs || 0) / 1000).toFixed(1)}s
                      {myLiveAnswer.streakBonus > 0
                        ? ` • Racha 🔥 +${myLiveAnswer.streakBonus} pts`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase font-bold text-purple-200 block">
                    Puntaje total
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-300">
                    {viewMode === 'solo' ? soloState.score : (myParticipantData?.score || 0)} pts
                  </span>
                </div>
              </div>
            ) : isTeacherProjector ? (
              <div className="p-4 sm:p-5 rounded-3xl bg-white/10 border border-white/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400 text-gray-950 font-black flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Ronda finalizada • Respuestas reveladas
                    </h4>
                    <p className="text-xs text-purple-200">
                      {answeredCount} de {totalParticipants} participantes respondieron esta pregunta
                    </p>
                  </div>
                </div>
                {canControlGame && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-gray-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <span>
                      {activeQIndex + 1 < questions.length
                        ? `Siguiente pregunta (${activeQIndex + 2}/${questions.length})`
                        : 'Ver podio final'}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-white/10 border border-white/20 text-center text-sm font-bold text-purple-200">
                Tiempo finalizado.
              </div>
            )}

            {/* Mención especial para ganadores del Acertijo en la ventana de 2 segundos */}
            {currentQuestion.type === 'riddle' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-purple-500/25 border border-purple-400/50 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 block">
                      {riddleWinners.length > 0 ? `Ganadores del Acertijo (${riddleWinners.length})` : 'Acertijo no resuelto'}
                    </span>
                    <span className="text-xs text-purple-100">
                      {riddleWinners.length > 0
                        ? 'Participantes que descifraron la respuesta dentro de la ventana de gracia de 2 segundos:'
                        : 'Nadie descifró el acertijo dentro del tiempo disponible.'}
                    </span>
                  </div>
                </div>
                {riddleWinners.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {riddleWinners.map((winner) => (
                      <span
                        key={winner.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${
                          winner.isFirst
                            ? 'bg-amber-400 text-gray-950 ring-2 ring-white'
                            : 'bg-white/15 text-white border border-white/20'
                        }`}
                      >
                        <span>{winner.avatar}</span>
                        <span>{winner.displayName}</span>
                        <span className="text-[10px] opacity-80">({winner.timeSec}s)</span>
                        {winner.isFirst && (
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-black/20">
                            1° Primero
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mención especial a quien respondió más rápido en esta pregunta */}
            {viewMode === 'live' && fastestResponder && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 border border-amber-400/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-gray-950 flex items-center justify-center font-black text-lg shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 block">
                      Más rápido
                    </span>
                    <span className="text-sm sm:text-base font-black text-white">
                      {fastestResponder.avatar} {fastestResponder.displayName} ({fastestResponder.timeSec}s • +{fastestResponder.pointsEarned} pts)
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Columna Izquierda: Respuesta correcta en lista vertical y explicación */}
              <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-white">
                  {currentQuestion.text}
                </h4>

                {(currentQuestion.type === 'quiz' || currentQuestion.type === 'truefalse') && (
                  <div className="flex flex-col gap-2">
                    {(currentQuestion.options || []).map((opt, oIdx) => {
                      const color = KAHOOT_COLORS[oIdx % KAHOOT_COLORS.length];
                      const votesForOpt = leaderboard.filter((p) => {
                        const ans = p?.currentQuestionAnswer;
                        if (!ans) return false;
                        return (
                          ans.optionIndex === oIdx ||
                          (Array.isArray(ans.optionIndices) && ans.optionIndices.includes(oIdx))
                        );
                      }).length;

                      return (
                        <div
                          key={opt.id || oIdx}
                          className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                            opt.isCorrect
                              ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-md'
                              : 'bg-white/5 border-white/10 text-purple-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg ${color.badgeClass} font-black text-xs flex items-center justify-center shrink-0`}
                            >
                              {color.symbol}
                            </span>
                            <span className="text-xs sm:text-sm font-bold break-words">
                              {opt.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {viewMode === 'live' && (
                              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-black/30">
                                {votesForOpt}
                              </span>
                            )}
                            {opt.isCorrect && (
                              <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'type_answer' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/25 border border-emerald-400 text-sm font-bold">
                    ✔ Respuesta correcta: <span className="font-black">{currentQuestion.correctAnswer}</span>
                  </div>
                )}

                {currentQuestion.type === 'puzzle' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-300 block">
                      ✔ Orden correcto:
                    </span>
                    {(currentQuestion.puzzleItems || []).map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold"
                      >
                        {idx + 1}°. {it}
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'riddle' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/25 border border-emerald-400 text-sm font-bold">
                    <div>
                      ✔ Respuesta: <span className="font-black">{currentQuestion.correctAnswer}</span>
                    </div>
                    {currentQuestion.acceptedAnswers && currentQuestion.acceptedAnswers.length > 0 && (
                      <div className="text-xs text-purple-200 mt-1 font-normal">
                        Respuestas aceptadas: <span className="font-semibold">{currentQuestion.acceptedAnswers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {currentQuestion.explanation && (
                  <div className="p-3 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 text-xs text-indigo-100">
                    <strong>Retroalimentación:</strong> {currentQuestion.explanation}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Tabla de posiciones acumulada (escalable para 40+ participantes) */}
              <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm sm:text-base flex items-center gap-2">
                      <Trophy size={17} className="text-amber-400" />
                      <span>Posiciones ({displayLeaderboard.length})</span>
                    </h4>
                    <span className="text-xs font-bold text-purple-200">
                      {activeQIndex + 1}/{questions.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {displayLeaderboard.map((player) => {
                      const isMe = player.id === safePlayerId;
                      return (
                        <div
                          key={player.id}
                          className={`p-2.5 px-3.5 rounded-2xl flex items-center justify-between gap-2 text-xs sm:text-sm font-bold ${
                            isMe
                              ? 'bg-amber-400 text-gray-950 font-black shadow-md'
                              : 'bg-white/10 border border-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                player.rank === 1
                                  ? 'bg-yellow-300 text-gray-950'
                                  : player.rank === 2
                                    ? 'bg-gray-300 text-gray-950'
                                    : player.rank === 3
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-black/30 text-white'
                              }`}
                            >
                              {player.rank}
                            </span>
                            <span className="text-base">{player.avatar || '🦊'}</span>
                            <span className="truncate">{player.displayName}</span>
                            {player.streak >= 2 && (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                  isMe ? 'bg-black/20 text-gray-950' : 'bg-orange-500/30 text-orange-300'
                                }`}
                              >
                                <Flame size={11} /> x{player.streak}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {player.currentQuestionAnswer?.pointsEarned > 0 && (
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  isMe ? 'bg-black/15 text-gray-950' : 'bg-emerald-500/30 text-emerald-300'
                                }`}
                              >
                                +{player.currentQuestionAnswer.pointsEarned}
                              </span>
                            )}
                            <span className="font-black">{player.score} pts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón Siguiente Pregunta / Ver Podio Final */}
                {(canControlGame || viewMode === 'solo') && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-gray-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-[1.01] mt-3"
                  >
                    <span>
                      {activeQIndex + 1 < questions.length
                        ? `Siguiente pregunta (${activeQIndex + 2}/${questions.length})`
                        : 'Ver podio final'}
                    </span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
              MODO 5: PODIO FINAL
             ===================================================================== */
          <div className="max-w-4xl w-full mx-auto space-y-6 py-4 text-center animate-in fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Trophy size={14} /> Resultados
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                {viewMode === 'solo'
                  ? `${myNickname} • ${soloState.score} pts`
                  : liveTask.title}
              </h2>
            </div>

            {viewMode === 'solo' && (
              <div className="max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-b from-amber-400/30 via-purple-600/25 to-indigo-900/30 border-2 border-amber-300/70 space-y-2.5 shadow-2xl">
                <div className="text-4xl">{myAvatar || '🦊'}</div>
                <div className="text-2xl sm:text-3xl font-black text-white">{soloState.score} pts</div>
                <div className="text-sm font-extrabold text-amber-200">
                  {soloState.correctCount} de {questions.length} respuestas correctas (
                  {Math.round((soloState.correctCount / Math.max(1, questions.length)) * 100)}%)
                </div>
              </div>
            )}

            {/* Podio 1°, 2° y 3° lugar */}
            {viewMode === 'live' && leaderboard.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl mx-auto pt-4">
                {/* 2° Lugar */}
                {leaderboard[1] && (
                  <div className="order-2 sm:order-1 p-5 rounded-3xl bg-gradient-to-b from-slate-300/25 to-slate-500/20 border-2 border-slate-300/50 space-y-2 shadow-xl">
                    <div className="text-3xl">🥈</div>
                    <div className="text-2xl">{leaderboard[1].avatar || '🐼'}</div>
                    <div className="font-black text-base truncate">{leaderboard[1].displayName}</div>
                    <div className="text-lg font-black text-slate-200">{leaderboard[1].score} pts</div>
                    <div className="text-[11px] text-purple-200">
                      {leaderboard[1].correctCount}/{questions.length} aciertos
                    </div>
                  </div>
                )}

                {/* 1° Lugar */}
                {leaderboard[0] && (
                  <div className="order-1 sm:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-400/35 via-yellow-500/25 to-amber-600/20 border-2 border-amber-300 space-y-2 shadow-2xl sm:-translate-y-3">
                    <div className="text-4xl animate-bounce">👑 🥇</div>
                    <div className="text-3xl">{leaderboard[0].avatar || '🦁'}</div>
                    <div className="font-black text-lg truncate text-amber-200">
                      {leaderboard[0].displayName}
                    </div>
                    <div className="text-2xl font-black text-white">{leaderboard[0].score} pts</div>
                    <div className="text-xs font-bold text-amber-200">
                      {leaderboard[0].correctCount}/{questions.length} aciertos
                    </div>
                  </div>
                )}

                {/* 3° Lugar */}
                {leaderboard[2] && (
                  <div className="order-3 p-4 rounded-3xl bg-gradient-to-b from-amber-700/30 to-amber-900/25 border-2 border-amber-500/50 space-y-1.5 shadow-xl">
                    <div className="text-2xl">🥉</div>
                    <div className="text-xl">{leaderboard[2].avatar || '🐸'}</div>
                    <div className="font-black text-sm truncate">{leaderboard[2].displayName}</div>
                    <div className="text-base font-black text-amber-300">{leaderboard[2].score} pts</div>
                    <div className="text-[11px] text-purple-200">
                      {leaderboard[2].correctCount}/{questions.length} aciertos
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botones de Acción post-juego: Repasar preguntas, Practicar de nuevo o Cerrar */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {canReview ? (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('review')}
                    className="px-6 py-3 rounded-2xl bg-white text-[#46178F] hover:bg-purple-50 font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-105"
                  >
                    <BookOpen size={17} />
                    <span>Repasar preguntas</span>
                  </button>

                  <button
                    type="button"
                    onClick={startSoloPractice}
                    className="px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-transform hover:scale-105"
                  >
                    <Gamepad2 size={17} />
                    <span>Practicar de nuevo</span>
                  </button>
                </>
              ) : (
                <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-purple-200 flex items-center gap-2">
                  <Lock size={15} className="text-amber-300 shrink-0" />
                  <span>El repaso de preguntas estará disponible cuando el docente lo habilite.</span>
                </div>
              )}

              {role === 'teacher' && (
                <button
                  type="button"
                  onClick={handleToggleReviewEnabled}
                  className={`px-5 py-3 rounded-2xl border font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-all ${
                    isReviewEnabled
                      ? 'bg-emerald-500/30 border-emerald-300/60 text-emerald-200 hover:bg-emerald-500/40'
                      : 'bg-amber-400 hover:bg-amber-300 border-amber-300 text-gray-950'
                  }`}
                >
                  {isReviewEnabled ? <Unlock size={16} /> : <Lock size={16} />}
                  <span>
                    {isReviewEnabled ? 'Ocultar repaso a participantes' : 'Habilitar repaso a participantes'}
                  </span>
                </button>
              )}

              {canControlGame && (
                <button
                  type="button"
                  onClick={handleRestartLiveGame}
                  className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-sm flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>Nueva partida</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default KahootLiveModal;

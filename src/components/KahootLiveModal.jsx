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
import { containsBadWords } from '../utils/helpers.js';
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
  useEffect(() => {
    if (!task) return;
    const cur = liveTaskRef.current;
    const isDifferentTask = !cur || String(cur.id) !== String(task.id);
    const incomingUpdated = Number(task.kahoot?.updatedAt || 0);
    const currentUpdated = Number(cur?.kahoot?.updatedAt || 0);
    if (isDifferentTask || incomingUpdated > currentUpdated) {
      setLiveTask(task);
      liveTaskRef.current = task;
    }
  }, [task]);

  // Suscripción en tiempo real al documento de la tarea cuando el Kahoot está abierto (solo fuera de Modo Demo)
  useEffect(() => {
    if (!isOpen || isDemoTask || !db || !appId || !task?.id) return undefined;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const fresh = { id: snap.id, ...snap.data() };
          liveTaskRef.current = fresh;
          setLiveTask(fresh);
          if (typeof setTasks === 'function') {
            setTasks((prev) =>
              (prev || []).map((t) => (String(t.id) === String(fresh.id) ? fresh : t))
            );
          }
        }
      },
      (err) => {
        console.warn('Kahoot live snapshot warning:', err);
      }
    );
    return () => unsub();
  }, [isOpen, isDemoTask, db, appId, task?.id, setTasks]);

  const kahoot = useMemo(() => liveTask?.kahoot || {}, [liveTask]);
  const questionsSignature = useMemo(
    () => JSON.stringify(Array.isArray(kahoot.questions) ? kahoot.questions : []),
    [kahoot.questions]
  );
  const questions = useMemo(() => {
    try {
      const parsed = JSON.parse(questionsSignature);
      return Array.isArray(parsed) ? parsed.map((q, i) => normalizeKahootQuestion(q, i)) : [];
    } catch {
      return [];
    }
  }, [questionsSignature]);

  // Modo local: 'live' (conectado a la sesión grupal), 'review' (guía de estudio), 'solo' (práctica individual)
  const [viewMode, setViewMode] = useState(() => {
    if (initialMode === 'review') return 'review';
    if (kahoot.status === 'finished' && !canControlGame) return 'solo';
    return 'live';
  });

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
  const [myAvatar, setMyAvatar] = useState(() => existingMe?.avatar || '🦊');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(myNickname);

  useEffect(() => {
    if (existingMe?.nickname) {
      setMyNickname(existingMe.nickname);
    }
    if (existingMe?.avatar) {
      setMyAvatar(existingMe.avatar);
    }
  }, [existingMe?.nickname, existingMe?.avatar]);

  // Selección temporal para preguntas multi-opción, respuesta corta o puzzle
  const [selectedMultiIndices, setSelectedMultiIndices] = useState([]);
  const [typedAnswerText, setTypedAnswerText] = useState('');
  const [puzzleOrderDraft, setPuzzleOrderDraft] = useState([]);
  const [gongBannerVisible, setGongBannerVisible] = useState(false);

  // Estado para el modo de práctica individual ("solo")
  const [soloState, setSoloState] = useState(() => {
    const startImmediateSolo = initialMode !== 'review' && kahoot.status === 'finished' && !canControlGame;
    return {
      active: startImmediateSolo,
      qIndex: 0,
      phase: 'question', // 'question' | 'revealed' | 'podium'
      startedAt: startImmediateSolo ? Date.now() : 0,
      score: 0,
      streak: 0,
      correctCount: 0,
      answers: {},
    };
  });

  const activePhase = viewMode === 'solo' ? soloState.phase : (kahoot.phase || 'lobby');
  const activeQIndex = viewMode === 'solo'
    ? soloState.qIndex
    : Math.max(0, Math.min(Number(kahoot.currentQuestionIndex) || 0, Math.max(0, questions.length - 1)));
  const currentQuestion = questions[activeQIndex] || questions[0] || null;
  const activeStartedAt = viewMode === 'solo' ? soloState.startedAt : (Number(kahoot.questionStartedAt) || 0);
  const activeDuration = Number(currentQuestion?.timeLimit || kahoot.questionDuration || 20);

  // Reloj sincronizado en tiempo real (en segundos con 1 decimal para barra fluida)
  const [remainingSeconds, setRemainingSeconds] = useState(activeDuration);
  const remainingSecondsRef = useRef(activeDuration);
  const gongTriggeredForRoundRef = useRef('');

  // Función auxiliar para actualizar el objeto kahoot en Firestore o en el Sandbox Demo
  const updateKahootState = useCallback(
    async (partialKahootUpdates, dotNotationUpdates = null) => {
      const currentTask = liveTaskRef.current || task;
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
      if (typeof setTasks === 'function') {
        setTasks((prev) =>
          (prev || []).map((t) => (String(t.id) === String(nextTask.id) ? nextTask : t))
        );
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
          await updateDoc(taskRef, dotNotationUpdates);
        } else {
          const dotPayload = {};
          Object.entries(partialKahootUpdates || {}).forEach(([k, v]) => {
            dotPayload[`kahoot.${k}`] = v;
          });
          await updateDoc(taskRef, dotPayload);
        }
      } catch (err) {
        console.warn('Error actualizando estado de Kahoot:', err);
      }
    },
    [task, isDemoTask, db, appId, setTasks]
  );

  // Auto-registrar participante al entrar a la sala en vivo (si es estudiante o si está en Modo Demo)
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    hasAutoJoinedRef.current = false;
  }, [isOpen, task?.id]);

  useEffect(() => {
    if (!isOpen || viewMode !== 'live') return;
    if (hasAutoJoinedRef.current) return;
    hasAutoJoinedRef.current = true;

    const currentParticipants = { ...(liveTaskRef.current?.kahoot?.participants || {}) };
    const existing = currentParticipants[safePlayerId];

    // Si es estudiante o estamos en Modo Demo, lo unimos automáticamente a la lista de participantes
    if (role !== 'teacher' || isDemoTask) {
      const playerEntry = existing || {
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

      const nextParticipants = {
        ...currentParticipants,
        [safePlayerId]: playerEntry,
      };

      // En Modo Demo, aseguramos que también estén los compañeros simulados listos en el Lobby
      if (isDemoTask) {
        DEMO_KAHOOT_BOTS.forEach((bot) => {
          if (!nextParticipants[bot.id]) {
            nextParticipants[bot.id] = {
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
          }
        });
      }

      updateKahootState(
        { participants: nextParticipants },
        { [`kahoot.participants.${safePlayerId}`]: playerEntry }
      );
    }
  }, [isOpen, viewMode, role, isDemoTask, safePlayerId, loggedInName, myNickname, myAvatar, updateKahootState]);

  // Guardar nuevo nombre / apodo en cualquier momento mientras participa
  const handleSaveNickname = async (newName, newAvatar = myAvatar) => {
    const clean = String(newName || '').trim().slice(0, 28);
    if (!clean) {
      showMessage?.('Escribe un nombre o apodo válido.');
      return;
    }
    if (containsBadWords(clean)) {
      showMessage?.('Por favor elige un nombre apropiado para la clase.');
      return;
    }
    setMyNickname(clean);
    setMyAvatar(newAvatar);
    setNicknameDraft(clean);
    setIsEditingNickname(false);

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

  const myParticipantData = kahoot.participants?.[safePlayerId];
  const myLiveAnswer =
    viewMode === 'solo'
      ? soloState.answers[String(activeQIndex)]
      : myParticipantData?.answers?.[String(activeQIndex)] ||
        (myParticipantData?.lastAnswer?.questionIndex === activeQIndex
          ? myParticipantData.lastAnswer
          : null);

  const gongBannerTimerRef = useRef(null);
  const soloSubmitTimerRef = useRef(null);

  // Disparador del Gong y transición cuando todos terminan o el tiempo se agota
  const triggerRoundEndWithGong = useCallback(
    (reason = 'all_answered') => {
      const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
      if (gongTriggeredForRoundRef.current === roundKey) return;
      gongTriggeredForRoundRef.current = roundKey;

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

      // Actualizar estado a 'revealed' si soy el docente, o en Modo Demo, o si el tiempo expiró
      if (role === 'teacher' || isDemoTask || reason === 'timeout' || reason === 'all_answered') {
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
    [viewMode, activeQIndex, activeStartedAt, role, isDemoTask, updateKahootState]
  );

  // Detectar transición remota de 'question' -> 'revealed' vía Firestore onSnapshot para que el Gong suene en TODOS los dispositivos conectados
  const prevPhaseRef = useRef(activePhase);
  useEffect(() => {
    const wasQuestion = prevPhaseRef.current === 'question';
    prevPhaseRef.current = activePhase;
    if (!isOpen || viewMode === 'review') return;

    if (wasQuestion && activePhase === 'revealed') {
      const roundKey = `${viewMode}_${activeQIndex}_${activeStartedAt}`;
      if (gongTriggeredForRoundRef.current !== roundKey) {
        gongTriggeredForRoundRef.current = roundKey;
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

  // Control del temporizador en vivo
  useEffect(() => {
    if (!isOpen || activePhase !== 'question') return undefined;

    const startTs = activeStartedAt > 0 ? activeStartedAt : Date.now();
    const durationSec = Math.max(5, activeDuration);

    const tickTimer = () => {
      const elapsedSec = (Date.now() - startTs) / 1000;
      const rem = Math.max(0, durationSec - elapsedSec);
      remainingSecondsRef.current = rem;
      setRemainingSeconds(rem);

      if (rem <= 0) {
        triggerRoundEndWithGong('timeout');
      }
    };

    tickTimer();
    const interval = setInterval(tickTimer, 150);
    return () => clearInterval(interval);
  }, [isOpen, activePhase, activeStartedAt, activeDuration, triggerRoundEndWithGong]);

  // Si todos los participantes conectados ya respondieron en vivo, sonar el Gong de inmediato
  useEffect(() => {
    if (!isOpen || viewMode !== 'live' || activePhase !== 'question') return;
    if (totalParticipants > 0 && answeredCount >= totalParticipants) {
      const timer = setTimeout(() => {
        triggerRoundEndWithGong('all_answered');
      }, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, viewMode, activePhase, totalParticipants, answeredCount, triggerRoundEndWithGong]);

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

    const timers = [];
    DEMO_KAHOOT_BOTS.forEach((bot) => {
      const botAns = buildSimulatedBotAnswer(bot, currentQuestion, activeQIndex);
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
          isSimulatedBot: true,
          answers: {},
        };

        // Si ya respondió esta pregunta, no repetir
        if (botData.answers && botData.answers[String(activeQIndex)]) return;

        const scoreCalc = calculateKahootPoints({
          isCorrect: botAns.isCorrect,
          timeMs: botAns.timeMs,
          timeLimitSec: currentQuestion.timeLimit || 20,
          pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
          currentStreak: botData.streak || 0,
        });

        const answerRecord = {
          ...botAns,
          pointsEarned: scoreCalc.pointsEarned,
          answeredAt: Date.now(),
        };

        const updatedBot = {
          ...botData,
          score: (Number(botData.score) || 0) + scoreCalc.pointsEarned,
          streak: scoreCalc.newStreak,
          correctCount: (Number(botData.correctCount) || 0) + (botAns.isCorrect ? 1 : 0),
          lastAnswer: answerRecord,
          answers: {
            ...(botData.answers || {}),
            [String(activeQIndex)]: answerRecord,
          },
        };

        updateKahootState(
          {
            participants: {
              ...currentParts,
              [bot.id]: updatedBot,
            },
          },
          { [`kahoot.participants.${bot.id}`]: updatedBot }
        );
      }, botAns.timeMs);

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
    viewMode,
    activePhase,
    activeQIndex,
    currentQuestion,
    updateKahootState,
  ]);

  // Control automático de música ambiental (Lobby, Tensión, Revelación y Podio)
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
      if (myLiveAnswer) {
        revealSoundTimer = setTimeout(() => {
          if (!soundMutedRef.current) {
            playRevealResultSound(Boolean(myLiveAnswer.isCorrect));
          }
        }, 450);
      }
    } else if (activePhase === 'podium') {
      stopKahootMusic();
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

    return () => {
      if (revealSoundTimer) clearTimeout(revealSoundTimer);
      stopKahootMusic();
    };
  }, [isOpen, viewMode, activePhase, activeQIndex, soundMuted]);

  // Limpiar audio y temporizadores al desmontar
  useEffect(() => () => {
    stopKahootMusic();
    if (gongBannerTimerRef.current) clearTimeout(gongBannerTimerRef.current);
    if (soloSubmitTimerRef.current) clearTimeout(soloSubmitTimerRef.current);
  }, []);

  if (!isOpen || !liveTask) return null;

  // Enviar respuesta del participante
  const handleSubmitAnswer = async (submissionPayload) => {
    if (!currentQuestion || myLiveAnswer || activePhase !== 'question') return;

    if (!soundMutedRef.current) {
      playAnswerSelectSound();
    }

    const startTs = activeStartedAt > 0 ? activeStartedAt : Date.now() - 2000;
    const elapsedMs = Math.max(200, Date.now() - startTs);
    const isCorrect = evaluateKahootAnswer(currentQuestion, submissionPayload);

    if (viewMode === 'solo') {
      const scoreCalc = calculateKahootPoints({
        isCorrect,
        timeMs: elapsedMs,
        timeLimitSec: currentQuestion.timeLimit || 20,
        pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
        currentStreak: soloState.streak || 0,
      });

      const answerObj = {
        ...submissionPayload,
        questionIndex: activeQIndex,
        isCorrect,
        pointsEarned: scoreCalc.pointsEarned,
        streakBonus: scoreCalc.streakBonus,
        timeMs: elapsedMs,
        answeredAt: Date.now(),
      };

      setSoloState((prev) => ({
        ...prev,
        score: prev.score + scoreCalc.pointsEarned,
        streak: scoreCalc.newStreak,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        answers: {
          ...prev.answers,
          [String(activeQIndex)]: answerObj,
        },
      }));

      // En modo práctica individual, tras responder todos (uno mismo), suena el Gong inmediatamente
      if (soloSubmitTimerRef.current) clearTimeout(soloSubmitTimerRef.current);
      soloSubmitTimerRef.current = setTimeout(() => {
        triggerRoundEndWithGong('all_answered');
      }, 350);
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
      joinedAt: Date.now(),
      answers: {},
    };

    const scoreCalc = calculateKahootPoints({
      isCorrect,
      timeMs: elapsedMs,
      timeLimitSec: currentQuestion.timeLimit || 20,
      pointsMultiplier: currentQuestion.pointsMultiplier ?? 1,
      currentStreak: me.streak || 0,
    });

    const answerObj = {
      ...submissionPayload,
      questionIndex: activeQIndex,
      isCorrect,
      pointsEarned: scoreCalc.pointsEarned,
      streakBonus: scoreCalc.streakBonus,
      timeMs: elapsedMs,
      answeredAt: Date.now(),
    };

    const updatedMe = {
      ...me,
      nickname: myNickname,
      avatar: myAvatar,
      score: (Number(me.score) || 0) + scoreCalc.pointsEarned,
      streak: scoreCalc.newStreak,
      correctCount: (Number(me.correctCount) || 0) + (isCorrect ? 1 : 0),
      lastAnswer: answerObj,
      answers: {
        ...(me.answers || {}),
        [String(activeQIndex)]: answerObj,
      },
    };

    await updateKahootState(
      {
        participants: {
          ...currentParts,
          [safePlayerId]: updatedMe,
        },
      },
      { [`kahoot.participants.${safePlayerId}`]: updatedMe }
    );
  };

  // Controles de Anfitrión (Docente o Modo Demo)
  const handleStartLiveQuestion = async (indexToStart = 0) => {
    const targetQ = questions[indexToStart];
    if (!targetQ) return;
    const now = Date.now();
    const dur = Number(targetQ.timeLimit) || 20;
    setRemainingSeconds(dur);
    remainingSecondsRef.current = dur;

    const partialUpdates = {
      status: 'live',
      phase: 'question',
      currentQuestionIndex: indexToStart,
      questionStartedAt: now,
      questionDuration: dur,
    };
    const dotUpdates = {
      'kahoot.status': 'live',
      'kahoot.phase': 'question',
      'kahoot.currentQuestionIndex': indexToStart,
      'kahoot.questionStartedAt': now,
      'kahoot.questionDuration': dur,
    };

    // Al iniciar la Pregunta 1 (indexToStart === 0), reiniciar puntajes previos de la sala para empezar desde cero
    if (indexToStart === 0) {
      const cleanParticipants = {};
      Object.entries(liveTaskRef.current?.kahoot?.participants || kahoot.participants || {}).forEach(
        ([k, p]) => {
          if (!p) return;
          cleanParticipants[k] = {
            ...p,
            score: 0,
            streak: 0,
            correctCount: 0,
            totalTimeMs: 0,
            lastAnswer: null,
            answers: {},
          };
        }
      );
      partialUpdates.participants = cleanParticipants;
      dotUpdates['kahoot.participants'] = cleanParticipants;
    }

    await updateKahootState(partialUpdates, dotUpdates);
  };

  const handleNextStep = async () => {
    if (viewMode === 'solo') {
      if (soloState.qIndex + 1 < questions.length) {
        const nextIdx = soloState.qIndex + 1;
        const dur = Number(questions[nextIdx]?.timeLimit) || 20;
        setRemainingSeconds(dur);
        remainingSecondsRef.current = dur;
        setSoloState((prev) => ({
          ...prev,
          qIndex: nextIdx,
          phase: 'question',
          startedAt: Date.now(),
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
    const resetParts = {};
    Object.entries(kahoot.participants || {}).forEach(([k, p]) => {
      resetParts[k] = {
        ...p,
        score: 0,
        streak: 0,
        correctCount: 0,
        lastAnswer: null,
        answers: {},
      };
    });

    setViewMode('live');
    await updateKahootState(
      {
        status: 'lobby',
        phase: 'lobby',
        currentQuestionIndex: 0,
        questionStartedAt: 0,
        participants: resetParts,
      },
      {
        'kahoot.status': 'lobby',
        'kahoot.phase': 'lobby',
        'kahoot.currentQuestionIndex': 0,
        'kahoot.questionStartedAt': 0,
        'kahoot.participants': resetParts,
      }
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

  const startSoloPractice = () => {
    const firstDur = Number(questions[0]?.timeLimit) || 20;
    setRemainingSeconds(firstDur);
    remainingSecondsRef.current = firstDur;
    setSoloState({
      active: true,
      qIndex: 0,
      phase: 'question',
      startedAt: Date.now(),
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
    <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-[#1F0657] via-[#39127A] to-[#130338] text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
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

          {/* Conmutador entre Sala en Vivo y Guía de Repaso */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'review' ? 'live' : 'review')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">
              {viewMode === 'review' ? 'Volver al juego' : 'Repasar'}
            </span>
          </button>

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
        {viewMode === 'review' ? (
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

              <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-white text-gray-950 px-6 py-3.5 rounded-2xl shadow-xl">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  PIN:
                </span>
                <span className="text-3xl sm:text-4xl font-black tracking-widest text-[#46178F]">
                  {kahoot.pin || '482915'}
                </span>
              </div>

              {/* Editor directo de Nombre / Apodo para el participante */}
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
                <div className="flex flex-wrap gap-2.5 justify-center py-2">
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
                  <button
                    type="button"
                    onClick={() => handleStartLiveQuestion(0)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-gray-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Play size={18} />
                    <span>Iniciar Kahoot</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-purple-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Esperando a que inicie la partida...</span>
                    </div>
                    <button
                      type="button"
                      onClick={startSoloPractice}
                      className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/20 cursor-pointer"
                    >
                      Practicar individualmente
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activePhase === 'question' && currentQuestion ? (
          /* =====================================================================
              MODO 3: PREGUNTA ACTIVA EN VIVO (Opciones en lista vertical + Reloj + Música de Tensión)
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
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/20">
                    Pregunta {activeQIndex + 1} de {questions.length}
                  </span>
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
                      {answeredCount} / {Math.max(1, totalParticipants)} resp.
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
            </div>

            {/* Tarjeta del Enunciado e Imagen de la Pregunta */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white text-gray-950 shadow-2xl text-center space-y-4 border-4 border-purple-300/40">
              <h3 className="text-lg sm:text-2xl font-black leading-snug text-gray-900">
                {currentQuestion.text}
              </h3>

              {currentQuestion.imageUrl && (
                <div className="flex justify-center overflow-hidden rounded-2xl bg-gray-100 border border-gray-200 max-h-56">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Imagen de la pregunta"
                    style={{
                      filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
                      transition: 'filter 300ms linear',
                    }}
                    className="max-h-56 object-contain"
                  />
                </div>
              )}
            </div>

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
                    className="flex-1 py-4 px-5 rounded-2xl bg-white text-gray-950 font-black text-base outline-none ring-4 ring-purple-400/40 focus:ring-amber-400"
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
          </div>
        ) : activePhase === 'revealed' && currentQuestion ? (
          /* =====================================================================
              MODO 4: REVELACIÓN DE RESPUESTA, MÁS RÁPIDO Y TABLA DE POSICIONES
             ===================================================================== */
          <div className="max-w-4xl w-full mx-auto space-y-5 py-2 animate-in fade-in">
            {/* Banner personal de acierto / fallo */}
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
            ) : (
              <div className="p-4 rounded-3xl bg-white/10 border border-white/20 text-center text-sm font-bold text-purple-200">
                Tiempo finalizado.
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
                      const votesForOpt = Object.values(kahoot.participants || {}).filter((p) => {
                        const ans = p?.answers?.[String(activeQIndex)];
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

                {currentQuestion.explanation && (
                  <div className="p-3 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 text-xs text-indigo-100">
                    <strong>Retroalimentación:</strong> {currentQuestion.explanation}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Tabla de posiciones acumulada */}
              <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm sm:text-base flex items-center gap-2">
                      <Trophy size={17} className="text-amber-400" />
                      <span>Posiciones</span>
                    </h4>
                    <span className="text-xs font-bold text-purple-200">
                      {activeQIndex + 1}/{questions.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {leaderboard.slice(0, 8).map((player) => {
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

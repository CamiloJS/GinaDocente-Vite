// src/utils/kahootEngine.js
// Motor de lógica, puntuación por velocidad, validación, generador con IA y simulación Demo para Kahoot en Vivo.

import { textoPlano } from './textFormat.js';

export const KAHOOT_MAX_QUESTIONS = 50;
export const KAHOOT_MIN_QUESTIONS = 1;
export const KAHOOT_AI_BATCH_SIZE = 20;

export const KAHOOT_COLORS = [
  {
    index: 0,
    id: 'red',
    name: 'Rojo',
    shape: 'triangle',
    symbol: '▲',
    bgClass: 'bg-[#E21B3C] hover:bg-[#c81533] border-[#a81029]',
    lightBgClass: 'bg-red-50 dark:bg-red-950/35 border-red-300 dark:border-red-800/70 text-red-900 dark:text-red-100',
    badgeClass: 'bg-[#E21B3C] text-white',
    hex: '#E21B3C',
  },
  {
    index: 1,
    id: 'blue',
    name: 'Azul',
    shape: 'diamond',
    symbol: '◆',
    bgClass: 'bg-[#1368CE] hover:bg-[#0f56ad] border-[#0b4287]',
    lightBgClass: 'bg-blue-50 dark:bg-blue-950/35 border-blue-300 dark:border-blue-800/70 text-blue-900 dark:text-blue-100',
    badgeClass: 'bg-[#1368CE] text-white',
    hex: '#1368CE',
  },
  {
    index: 2,
    id: 'yellow',
    name: 'Amarillo',
    shape: 'circle',
    symbol: '●',
    bgClass: 'bg-[#D89E00] hover:bg-[#b88600] border-[#946b00]',
    lightBgClass: 'bg-amber-50 dark:bg-amber-950/35 border-amber-300 dark:border-amber-800/70 text-amber-900 dark:text-amber-100',
    badgeClass: 'bg-[#D89E00] text-white',
    hex: '#D89E00',
  },
  {
    index: 3,
    id: 'green',
    name: 'Verde',
    shape: 'square',
    symbol: '■',
    bgClass: 'bg-[#26890C] hover:bg-[#1e6e09] border-[#165206]',
    lightBgClass: 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-100',
    badgeClass: 'bg-[#26890C] text-white',
    hex: '#26890C',
  },
];

export const KAHOOT_TIME_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];

export const KAHOOT_POINTS_OPTIONS = [
  { value: 1, label: 'Puntos normales', shortLabel: '1000 pts', maxPoints: 1000 },
  { value: 2, label: 'Puntos dobles (x2)', shortLabel: 'x2 (2000 pts)', maxPoints: 2000 },
  { value: 0, label: 'Sin puntos', shortLabel: '0 pts', maxPoints: 0 },
];

export const KAHOOT_QUESTION_TYPES = {
  quiz: {
    id: 'quiz',
    label: 'Selección múltiple',
    shortLabel: 'Quiz',
    description: 'Selección múltiple',
  },
  truefalse: {
    id: 'truefalse',
    label: 'Verdadero o Falso',
    shortLabel: 'V / F',
    description: 'Verdadero o Falso',
  },
  type_answer: {
    id: 'type_answer',
    label: 'Respuesta corta',
    shortLabel: 'Escribir',
    description: 'Respuesta escrita',
  },
  puzzle: {
    id: 'puzzle',
    label: 'Puzzle',
    shortLabel: 'Puzzle',
    description: 'Ordenar elementos',
  },
};

export const KAHOOT_AVATARS = [
  '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🐙', '🦉',
  '🦋', '🦖', '🚀', '⚡', '🌟', '🔥', '💎', '🎯',
];

export const DEMO_KAHOOT_BOTS = [
  { id: 'bot_carlos', realName: 'Carlos Mendoza', nickname: 'Carlos_FX 📈', avatar: '🦁', skill: 0.85, minDelayMs: 2100, maxDelayMs: 6500 },
  { id: 'bot_laura', realName: 'Laura Restrepo', nickname: 'LauEcon ✨', avatar: '🦊', skill: 0.9, minDelayMs: 1800, maxDelayMs: 5800 },
  { id: 'bot_mateo', realName: 'Mateo Gómez', nickname: 'Mateo Bull 🐂', avatar: '🚀', skill: 0.75, minDelayMs: 2800, maxDelayMs: 8200 },
  { id: 'bot_valeria', realName: 'Valeria Castro', nickname: 'Vale_GDP 🌟', avatar: '🦄', skill: 0.82, minDelayMs: 2400, maxDelayMs: 7100 },
];

const limpiarTextoPlano = (v, max = 500) => textoPlano(String(v == null ? '' : v)).trim().slice(0, max);
const limpiarTextoBorrador = (v, max = 500) => String(v == null ? '' : v).replace(/\*\*/g, '').slice(0, max);

/**
 * Sanitiza un identificador de jugador para que sea 100% seguro como llave en Firestore dot-notation
 */
export function sanitizeKahootPlayerId(rawId) {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return cleaned || 'player_anon';
}

/**
 * Genera un PIN numérico de 6 dígitos estilo Kahoot
 */
export function generateKahootPin() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Crea una pregunta por defecto lista para el editor de Kahoot
 */
export function createDefaultKahootQuestion(type = 'quiz', index = 0) {
  const cleanType = KAHOOT_QUESTION_TYPES[type] ? type : 'quiz';
  const baseId = `kq_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;

  if (cleanType === 'truefalse') {
    return {
      id: baseId,
      type: 'truefalse',
      text: '',
      imageUrl: '',
      imageReveal: 'none',
      timeLimit: 20,
      pointsMultiplier: 1,
      allowMultiple: false,
      options: [
        { id: `${baseId}_0`, text: 'Verdadero', isCorrect: true },
        { id: `${baseId}_1`, text: 'Falso', isCorrect: false },
      ],
      correctAnswer: '',
      acceptedAnswers: [],
      puzzleItems: [],
      explanation: '',
    };
  }

  if (cleanType === 'type_answer') {
    return {
      id: baseId,
      type: 'type_answer',
      text: '',
      imageUrl: '',
      imageReveal: 'none',
      timeLimit: 30,
      pointsMultiplier: 1,
      allowMultiple: false,
      options: [],
      correctAnswer: '',
      acceptedAnswers: [],
      puzzleItems: [],
      explanation: '',
    };
  }

  if (cleanType === 'puzzle') {
    return {
      id: baseId,
      type: 'puzzle',
      text: '',
      imageUrl: '',
      imageReveal: 'none',
      timeLimit: 30,
      pointsMultiplier: 2,
      allowMultiple: false,
      options: [],
      correctAnswer: '',
      acceptedAnswers: [],
      puzzleItems: ['', '', '', ''],
      explanation: '',
    };
  }

  return {
    id: baseId,
    type: 'quiz',
    text: '',
    imageUrl: '',
    imageReveal: 'none',
    timeLimit: 20,
    pointsMultiplier: 1,
    allowMultiple: false,
    options: [
      { id: `${baseId}_0`, text: '', isCorrect: true },
      { id: `${baseId}_1`, text: '', isCorrect: false },
      { id: `${baseId}_2`, text: '', isCorrect: false },
      { id: `${baseId}_3`, text: '', isCorrect: false },
    ],
    correctAnswer: '',
    acceptedAnswers: [],
    puzzleItems: [],
    explanation: '',
  };
}

/**
 * Normaliza una pregunta (desde el editor o desde la IA) a un esquema uniforme y seguro.
 */
export function normalizeKahootQuestion(raw, index = 0, normOptions = {}) {
  if (!raw || typeof raw !== 'object') {
    return createDefaultKahootQuestion('quiz', index);
  }

  const preserveDraft = Boolean(normOptions?.preserveDraft);
  const cleanFn = preserveDraft ? limpiarTextoBorrador : limpiarTextoPlano;

  const baseId = String(raw.id || `kq_item_${index}`).trim();
  const rawType = String(raw.type || raw.tipo || 'quiz').toLowerCase().trim();

  let type = 'quiz';
  if (rawType === 'truefalse' || rawType === 'vf' || rawType === 'verdadero_falso' || rawType === 'boolean') {
    type = 'truefalse';
  } else if (rawType === 'type_answer' || rawType === 'text' || rawType === 'short_answer' || rawType === 'escribir') {
    type = 'type_answer';
  } else if (rawType === 'puzzle' || rawType === 'order' || rawType === 'ordenar') {
    type = 'puzzle';
  }

  const rawTextSource = raw.text ?? raw.question ?? raw.pregunta ?? raw.enunciado ?? '';
  const text = cleanFn(rawTextSource, 500);
  const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';
  const imageReveal = raw.imageReveal === 'blur' || raw.imageRevealMode === 'blur' ? 'blur' : 'none';

  const rawTime = Number(raw.timeLimit);
  const timeLimit = KAHOOT_TIME_OPTIONS.includes(rawTime)
    ? rawTime
    : (rawTime >= 5 && rawTime <= 240 ? Math.round(rawTime) : 20);

  const rawMult = Number(raw.pointsMultiplier);
  const pointsMultiplier = rawMult === 2 || rawMult === 2000 ? 2 : rawMult === 0 ? 0 : 1;
  const explanation = cleanFn(raw.explanation ?? raw.explicacion ?? '', 400);

  if (type === 'truefalse') {
    const rawOpts = Array.isArray(raw.options || raw.opciones) ? (raw.options || raw.opciones) : [];
    const ansStr = String(raw.correctAnswer || raw.answer || raw.respuesta || '').trim().toLowerCase();
    const opt0Correct = rawOpts[0]?.isCorrect ?? rawOpts[0]?.correcta;
    const opt1Correct = rawOpts[1]?.isCorrect ?? rawOpts[1]?.correcta;
    const isFalseCorrect =
      /^(f|falso|false|no)$/i.test(ansStr) ||
      (rawOpts.length >= 2 && Boolean(opt1Correct) && !opt0Correct);

    const rawOpt0 = rawOpts[0]?.text ?? rawOpts[0]?.texto;
    const rawOpt1 = rawOpts[1]?.text ?? rawOpts[1]?.texto;
    const opt0Text = preserveDraft
      ? cleanFn(rawOpt0 !== undefined ? rawOpt0 : 'Verdadero', 120)
      : (cleanFn(rawOpt0 || 'Verdadero', 120) || 'Verdadero');
    const opt1Text = preserveDraft
      ? cleanFn(rawOpt1 !== undefined ? rawOpt1 : 'Falso', 120)
      : (cleanFn(rawOpt1 || 'Falso', 120) || 'Falso');

    return {
      id: baseId,
      type: 'truefalse',
      text,
      question: text,
      imageUrl,
      imageReveal,
      timeLimit,
      pointsMultiplier,
      allowMultiple: false,
      options: [
        { id: rawOpts[0]?.id || `${baseId}_0`, text: opt0Text, isCorrect: !isFalseCorrect },
        { id: rawOpts[1]?.id || `${baseId}_1`, text: opt1Text, isCorrect: isFalseCorrect },
      ],
      correctAnswer: '',
      acceptedAnswers: [],
      puzzleItems: [],
      explanation,
    };
  }

  if (type === 'type_answer') {
    const rawAccSource = raw.acceptedAnswers ?? raw.aceptadas;
    const rawAcc = Array.isArray(rawAccSource)
      ? rawAccSource
      : typeof rawAccSource === 'string' && rawAccSource.trim()
        ? rawAccSource.split(',').map((s) => s.trim())
        : [];
    const acceptedAnswers = rawAcc.map((s) => limpiarTextoPlano(s, 150)).filter(Boolean).slice(0, 6);
    const correctAnswer = cleanFn(
      raw.correctAnswer ??
        raw.respuesta ??
        acceptedAnswers[0] ??
        (Array.isArray(raw.options) ? raw.options.find((o) => o?.isCorrect)?.text : '') ??
        '',
      200
    );

    const result = {
      id: baseId,
      type: 'type_answer',
      text,
      question: text,
      imageUrl,
      imageReveal,
      timeLimit,
      pointsMultiplier,
      allowMultiple: false,
      options: [],
      correctAnswer,
      acceptedAnswers,
      puzzleItems: [],
      explanation,
    };
    if (preserveDraft && typeof raw.acceptedAnswersInput === 'string') {
      result.acceptedAnswersInput = raw.acceptedAnswersInput;
    }
    return result;
  }

  if (type === 'puzzle') {
    const rawItems = Array.isArray(raw.puzzleItems) && raw.puzzleItems.length > 0
      ? raw.puzzleItems
      : Array.isArray(raw.words) && raw.words.length > 0
        ? raw.words
        : Array.isArray(raw.options)
          ? raw.options.map((o) => (typeof o === 'string' ? o : (o?.text ?? o?.texto)))
          : [];

    let puzzleItems;
    if (preserveDraft) {
      puzzleItems = [0, 1, 2, 3].map((i) => cleanFn(rawItems[i] ?? '', 160));
    } else {
      puzzleItems = rawItems
        .map((item) => limpiarTextoPlano(item, 160))
        .filter(Boolean)
        .slice(0, 4);
      while (puzzleItems.length < 3) {
        puzzleItems.push('');
      }
    }

    return {
      id: baseId,
      type: 'puzzle',
      text,
      question: text,
      imageUrl,
      imageReveal,
      timeLimit,
      pointsMultiplier,
      allowMultiple: false,
      options: [],
      correctAnswer: '',
      acceptedAnswers: [],
      puzzleItems,
      explanation,
    };
  }

  // Quiz (Selección múltiple de 2 a 4 opciones)
  const rawOptions = Array.isArray(raw.options || raw.opciones) ? (raw.options || raw.opciones) : [];
  let options = rawOptions.slice(0, 4).map((o, idx) => ({
    id: String(o?.id || `${baseId}_${idx}`),
    text: cleanFn(typeof o === 'string' ? o : (o?.text ?? o?.texto ?? ''), 220),
    isCorrect: Boolean(typeof o === 'object' ? (o?.isCorrect ?? o?.correcta) : false),
  }));

  while (options.length < 4) {
    const idx = options.length;
    options.push({
      id: `${baseId}_${idx}`,
      text: '',
      isCorrect: idx === 0 && !options.some((x) => x.isCorrect),
    });
  }

  // Asegurar que al menos una opción esté marcada como correcta si ninguna lo está (solo fuera de borrador sin opciones explícitas)
  if (!options.some((o) => o.isCorrect) && (!preserveDraft || !Array.isArray(raw.options))) {
    const firstNonEmptyIdx = options.findIndex((o) => String(o.text || '').trim());
    options[firstNonEmptyIdx >= 0 ? firstNonEmptyIdx : 0].isCorrect = true;
  }

  const correctCount = options.filter((o) => o.isCorrect && (preserveDraft || String(o.text || '').trim())).length;
  const allowMultiple =
    raw.allowMultiple !== undefined
      ? Boolean(raw.allowMultiple)
      : Boolean(raw.isMultiSelect || raw.permiteMultiples || correctCount > 1);

  return {
    id: baseId,
    type: 'quiz',
    text,
    question: text,
    imageUrl,
    imageReveal,
    timeLimit,
    pointsMultiplier,
    allowMultiple,
    options,
    correctAnswer: '',
    acceptedAnswers: [],
    puzzleItems: [],
    explanation,
  };
}

/**
 * Valida la configuración completa del Kahoot antes de publicarlo o guardarlo.
 */
export function validateKahootConfig(kahootInput) {
  const rawQuestions = Array.isArray(kahootInput?.questions)
    ? kahootInput.questions
    : Array.isArray(kahootInput)
      ? kahootInput
      : [];

  if (rawQuestions.length === 0) {
    return {
      valid: false,
      error: 'El Kahoot debe tener al menos 1 pregunta.',
      normalizedQuestions: [],
      questions: [],
    };
  }

  if (rawQuestions.length > KAHOOT_MAX_QUESTIONS) {
    return {
      valid: false,
      error: `El Kahoot puede tener máximo ${KAHOOT_MAX_QUESTIONS} preguntas.`,
      normalizedQuestions: [],
      questions: [],
    };
  }

  const normalizedQuestions = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const rawQ = rawQuestions[i];
    const q = normalizeKahootQuestion(rawQ, i);
    const num = i + 1;

    if (!q.text) {
      return {
        valid: false,
        error: `La pregunta #${num} no tiene enunciado. Escribe la pregunta.`,
        normalizedQuestions: [],
        questions: [],
      };
    }

    if (q.type === 'type_answer') {
      if (!q.correctAnswer) {
        return {
          valid: false,
          error: `La pregunta #${num} (Respuesta corta) necesita la respuesta correcta.`,
          normalizedQuestions: [],
          questions: [],
        };
      }
      normalizedQuestions.push(q);
      continue;
    }

    if (q.type === 'puzzle') {
      const filledItems = (q.puzzleItems || []).map((x) => String(x || '').trim()).filter(Boolean);
      if (filledItems.length < 3) {
        return {
          valid: false,
          error: `La pregunta #${num} (Puzzle) debe tener al menos 3 elementos en orden para ordenar.`,
          normalizedQuestions: [],
          questions: [],
        };
      }
      normalizedQuestions.push({ ...q, puzzleItems: filledItems });
      continue;
    }

    // Quiz o True/False
    const rawOptsList = Array.isArray(rawQ?.options || rawQ?.opciones) ? (rawQ.options || rawQ.opciones) : null;
    const rawHadExplicitValidCorrect = rawOptsList
      ? rawOptsList.some(
          (o) =>
            typeof o === 'object' &&
            String(o?.text ?? o?.texto ?? '').trim().length > 0 &&
            Boolean(o?.isCorrect ?? o?.correcta)
        )
      : true;

    const validOptions = (q.options || []).filter((o) => String(o.text || '').trim().length > 0);
    if (validOptions.length < 2) {
      return {
        valid: false,
        error: `La pregunta #${num} debe tener al menos 2 opciones con texto.`,
        normalizedQuestions: [],
        questions: [],
      };
    }

    if ((q.type === 'quiz' && !rawHadExplicitValidCorrect) || !validOptions.some((o) => o.isCorrect)) {
      return {
        valid: false,
        error: `Marca al menos una opción correcta en la pregunta #${num}.`,
        normalizedQuestions: [],
        questions: [],
      };
    }

    normalizedQuestions.push({
      ...q,
      options: validOptions,
      allowMultiple: Boolean(q.allowMultiple || validOptions.filter((o) => o.isCorrect).length > 1),
    });
  }

  return {
    valid: true,
    error: '',
    normalizedQuestions,
    questions: normalizedQuestions,
    musicEnabled: true,
    allowNicknameChange: true,
  };
}

const normalizeCompareString = (str) =>
  String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:¡¿"']/g, '')
    .replace(/\s+/g, ' ');

/**
 * Evalúa si la respuesta de un estudiante a una pregunta de Kahoot es correcta.
 */
export function evaluateKahootAnswer(question, submission) {
  if (!question || !submission) return false;

  if (question.type === 'type_answer') {
    const rawText = typeof submission === 'string' ? submission : (submission.textAnswer ?? submission.text ?? '');
    const given = normalizeCompareString(rawText);
    if (!given) return false;
    const validSet = new Set(
      [question.correctAnswer, ...(question.acceptedAnswers || [])]
        .map(normalizeCompareString)
        .filter(Boolean)
    );
    return validSet.has(given);
  }

  if (question.type === 'puzzle') {
    const target = (question.puzzleItems || []).map(normalizeCompareString).filter(Boolean);
    const given = (submission.puzzleOrder || submission.orderedIds || []).map(normalizeCompareString).filter(Boolean);
    if (target.length === 0 || given.length !== target.length) return false;
    return target.every((item, idx) => item === given[idx]);
  }

  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length === 0) return false;

  // Si el estudiante seleccionó múltiples opciones por índice o por ID
  if (Array.isArray(submission.optionIndices) && submission.optionIndices.length > 0) {
    const selectedSet = new Set(submission.optionIndices.map(Number));
    const correctIndices = options
      .map((o, idx) => (o?.isCorrect ? idx : -1))
      .filter((idx) => idx >= 0);

    if (question.allowMultiple && correctIndices.length > 1) {
      if (selectedSet.size !== correctIndices.length) return false;
      return correctIndices.every((idx) => selectedSet.has(idx));
    }

    const firstIdx = submission.optionIndices[0];
    return Boolean(options[firstIdx]?.isCorrect);
  }

  if (Array.isArray(submission.optionIds) && submission.optionIds.length > 0) {
    const selectedIdSet = new Set(submission.optionIds.map(String));
    const correctIds = options.filter((o) => o?.isCorrect).map((o) => String(o.id));
    if (question.allowMultiple && correctIds.length > 1) {
      if (selectedIdSet.size !== correctIds.length) return false;
      return correctIds.every((id) => selectedIdSet.has(id));
    }
    const found = options.find((o) => String(o.id) === String(submission.optionIds[0]));
    return Boolean(found?.isCorrect);
  }

  if (submission.optionId !== undefined && submission.optionId !== null) {
    const found = options.find((o) => String(o.id) === String(submission.optionId));
    if (found) return Boolean(found.isCorrect);
  }

  const idx = Number(submission.optionIndex);
  if (Number.isNaN(idx) || idx < 0 || idx >= options.length) return false;
  return Boolean(options[idx]?.isCorrect);
}

/**
 * Calcula el puntaje obtenido en una pregunta según el tiempo de respuesta y la racha actual.
 * Quien responde más rápido obtiene más puntaje (hasta 1000 pts en estándar o 2000 pts en x2,
 * más bono de racha por aciertos consecutivos).
 */
export function calculateKahootPoints({
  isCorrect,
  timeMs,
  elapsedMs,
  timeLimitSec = 20,
  pointsMultiplier = 1,
  currentStreak = 0,
}) {
  if (!isCorrect) {
    return {
      pointsEarned: 0,
      basePoints: 0,
      streakBonus: 0,
      newStreak: 0,
    };
  }

  const mult = Number(pointsMultiplier);
  if (mult === 0) {
    return {
      pointsEarned: 0,
      basePoints: 0,
      streakBonus: 0,
      newStreak: (Number(currentStreak) || 0) + 1,
    };
  }

  const validMult = mult === 2 || mult === 2000 ? 2 : 1;
  const maxBase = 1000 * validMult;
  const windowMs = Math.max(1000, (Number(timeLimitSec) || 20) * 1000);
  const actualMs = timeMs !== undefined ? Number(timeMs) : Number(elapsedMs) || 0;
  const clampedMs = Math.max(0, Math.min(windowMs, actualMs));

  // Fórmula oficial inspirada en Kahoot:
  // A t = 0 ms -> 100% de maxBase (1000 o 2000 pts)
  // A t = windowMs -> 50% de maxBase (500 o 1000 pts)
  const ratio = clampedMs / windowMs;
  const basePoints = Math.round((1 - ratio / 2) * maxBase);

  const newStreak = (Number(currentStreak) || 0) + 1;
  const streakBonus = newStreak >= 2 ? Math.min(500, (newStreak - 1) * 100) : 0;
  const pointsEarned = basePoints + streakBonus;

  return {
    pointsEarned,
    basePoints,
    streakBonus,
    newStreak,
  };
}

/**
 * Construye la tabla de clasificación (leaderboard) ordenada por puntaje total
 * y detecta quién respondió más rápido en la pregunta actual.
 */
export function buildKahootLeaderboard(participantsMap = {}, currentQuestionIndex = null) {
  const entries = Object.values(participantsMap || {}).filter(
    (p) => p && typeof p === 'object' && (p.nickname || p.realName || p.id)
  );

  const getAnswerForQ = (player, qIdx) => {
    if (qIdx === null || qIdx === undefined) return null;
    if (player.answers && player.answers[String(qIdx)]) {
      return player.answers[String(qIdx)];
    }
    if (player.lastAnswer && Number(player.lastAnswer.questionIndex) === Number(qIdx)) {
      return player.lastAnswer;
    }
    return null;
  };

  const enriched = entries.map((p) => {
    const currentAns = getAnswerForQ(p, currentQuestionIndex);
    const allAns = p.answers && typeof p.answers === 'object' ? Object.values(p.answers) : [];
    const computedTimeMs = allAns.reduce((acc, a) => acc + (Number(a?.timeMs) || 0), 0);
    const totalTimeMs = computedTimeMs > 0 ? computedTimeMs : (Number(p.totalTimeMs) || 0);
    return {
      ...p,
      displayName: String(p.nickname || p.realName || 'Participante').trim(),
      score: Number(p.score) || 0,
      streak: Number(p.streak) || 0,
      correctCount: Number(p.correctCount) || 0,
      currentQuestionAnswer: currentAns,
      totalTimeMs,
    };
  });

  enriched.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.totalTimeMs - b.totalTimeMs;
  });

  const ranked = enriched.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));

  // Identificar quién respondió correctamente más rápido en la pregunta actual
  let fastestResponder = null;
  if (currentQuestionIndex !== null && currentQuestionIndex !== undefined) {
    const correctInRound = ranked.filter(
      (p) => p.currentQuestionAnswer && p.currentQuestionAnswer.isCorrect
    );
    if (correctInRound.length > 0) {
      correctInRound.sort(
        (a, b) =>
          (Number(a.currentQuestionAnswer.timeMs) || 999999) -
          (Number(b.currentQuestionAnswer.timeMs) || 999999)
      );
      const winner = correctInRound[0];
      fastestResponder = {
        id: winner.id,
        displayName: winner.displayName,
        avatar: winner.avatar || '⚡',
        timeMs: Number(winner.currentQuestionAnswer.timeMs) || 0,
        timeSec: ((Number(winner.currentQuestionAnswer.timeMs) || 0) / 1000).toFixed(1),
        pointsEarned: Number(winner.currentQuestionAnswer.pointsEarned) || 0,
      };
    }
  }

  return {
    leaderboard: ranked,
    fastestResponder,
    totalParticipants: ranked.length,
    answeredCount:
      currentQuestionIndex !== null && currentQuestionIndex !== undefined
        ? ranked.filter((p) => Boolean(p.currentQuestionAnswer)).length
        : 0,
  };
}

/**
 * Genera una respuesta simulada para un compañero virtual en Modo Demo
 */
export function buildSimulatedBotAnswer(bot, question, questionIndex) {
  const isCorrectRoll = Math.random() <= (bot.skill || 0.8);
  const timeLimitMs = (Number(question?.timeLimit) || 20) * 1000;
  const minDelay = Math.min(bot.minDelayMs || 1800, timeLimitMs * 0.4);
  const maxDelay = Math.min(bot.maxDelayMs || 7000, timeLimitMs * 0.85);
  const timeMs = Math.round(minDelay + Math.random() * Math.max(500, maxDelay - minDelay));

  if (question.type === 'type_answer') {
    const textAnswer = isCorrectRoll ? question.correctAnswer : 'not sure';
    return {
      questionIndex,
      textAnswer,
      optionIndex: isCorrectRoll ? 0 : 1,
      isCorrect: isCorrectRoll,
      timeMs,
    };
  }

  if (question.type === 'puzzle') {
    const items = [...(question.puzzleItems || [])];
    const puzzleOrder = isCorrectRoll ? items : [...items].reverse();
    return {
      questionIndex,
      puzzleOrder,
      optionIndex: isCorrectRoll ? 0 : 1,
      isCorrect: isCorrectRoll,
      timeMs,
    };
  }

  const opts = Array.isArray(question.options) ? question.options : [];
  const correctIndices = opts.map((o, idx) => (o?.isCorrect ? idx : -1)).filter((i) => i >= 0);
  const wrongIndices = opts.map((o, idx) => (!o?.isCorrect ? idx : -1)).filter((i) => i >= 0);

  let chosenIdx = 0;
  if (isCorrectRoll && correctIndices.length > 0) {
    chosenIdx = correctIndices[Math.floor(Math.random() * correctIndices.length)];
  } else if (!isCorrectRoll && wrongIndices.length > 0) {
    chosenIdx = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
  }

  return {
    questionIndex,
    optionIndex: chosenIdx,
    optionIndices: question.allowMultiple && isCorrectRoll ? correctIndices : [chosenIdx],
    isCorrect: Boolean(opts[chosenIdx]?.isCorrect),
    timeMs,
  };
}

/**
 * Construye el prompt para generar un Kahoot completo con IA
 */
export function construirPromptKahootIA({
  tema,
  total = 6,
  dificultad = 'media',
  idioma = 'en',
  mezcla = 'variado',
  timeLimit = 20,
  evitar = [],
}) {
  const num = Math.max(1, Math.min(KAHOOT_MAX_QUESTIONS, Number(total) || 6));
  const listaEvitar = Array.isArray(evitar) ? evitar.filter(Boolean) : [];

  const mapaIdiomas = {
    es: 'Todo en español',
    en: 'Todo en inglés',
    fr: 'Todo en francés',
    bilingue: 'Bilingüe (enunciado y opciones en inglés con traducción breve al español entre paréntesis)',
    bilingue_fr: 'Bilingüe (enunciado y opciones en francés con traducción breve al español entre paréntesis)',
    en_fr: 'Mitad de las preguntas en inglés y mitad en francés',
  };

  let instruccionTipos =
    'Combina preguntas de selección múltiple de 4 opciones (type "quiz") y preguntas de Verdadero o Falso (type "truefalse").';
  if (mezcla === 'completo') {
    instruccionTipos =
      'Incluye una mezcla dinámica: mayoría de selección múltiple de 4 opciones (type "quiz"), algunas de Verdadero/Falso (type "truefalse"), al menos 1 de respuesta corta escrita (type "type_answer") y 1 de ordenar secuencia de 4 pasos/palabras (type "puzzle").';
  } else if (mezcla === 'solo_quiz') {
    instruccionTipos = 'Genera TODAS las preguntas de selección múltiple con exactamente 4 opciones (type "quiz").';
  } else if (mezcla === 'solo_vf') {
    instruccionTipos = 'Genera TODAS las preguntas de Verdadero o Falso (type "truefalse").';
  } else if (mezcla === 'solo_type_answer') {
    instruccionTipos =
      'Genera TODAS las preguntas de respuesta corta escrita (type "type_answer") con correctAnswer y acceptedAnswers.';
  } else if (mezcla === 'solo_puzzle') {
    instruccionTipos =
      'Genera TODAS las preguntas de ordenar secuencia de 4 pasos o palabras de arriba hacia abajo (type "puzzle") con puzzleItems.';
  }

  return [
    'Eres un profesor experto creando un juego interactivo en vivo estilo Kahoot para proyectar y jugar en clase.',
    `Tema o instrucciones del docente: "${tema}"`,
    `Cantidad exacta de preguntas: ${num}`,
    `Dificultad: ${dificultad}`,
    `Idioma: ${mapaIdiomas[idioma] || mapaIdiomas.en}`,
    instruccionTipos,
    '',
    'Reglas obligatorias de formato:',
    `- Devuelve ÚNICAMENTE un arreglo JSON válido con ${num} objetos, sin bloques markdown \`\`\` ni texto adicional.`,
    '- Formatos JSON permitidos por pregunta:',
    `  1) Quiz (4 opciones): {"type":"quiz","text":"Pregunta clara y dinámica","timeLimit":${timeLimit},"pointsMultiplier":1,"options":[{"text":"Opción A","isCorrect":true},{"text":"Opción B","isCorrect":false},{"text":"Opción C","isCorrect":false},{"text":"Opción D","isCorrect":false}],"explanation":"Breve explicación didáctica"}`,
    `  2) Verdadero/Falso: {"type":"truefalse","text":"Afirmación clara","timeLimit":15,"pointsMultiplier":1,"options":[{"text":"Verdadero","isCorrect":true},{"text":"Falso","isCorrect":false}],"explanation":"Breve explicación"}`,
    `  3) Respuesta corta: {"type":"type_answer","text":"Pregunta directa","timeLimit":30,"pointsMultiplier":2,"correctAnswer":"respuesta","acceptedAnswers":["sinonimo"],"explanation":"Breve explicación"}`,
    `  4) Puzzle (ordenar): {"type":"puzzle","text":"Ordena la secuencia o frase correctamente","timeLimit":30,"pointsMultiplier":2,"puzzleItems":["Paso 1","Paso 2","Paso 3","Paso 4"],"explanation":"Breve explicación"}`,
    '- En las últimas 1 o 2 preguntas más retadoras usa "pointsMultiplier": 2 (Puntos Dobles).',
    '- No uses asteriscos (** o *) ni etiquetas HTML.',
    '- Varía la posición de la opción correcta en las preguntas tipo quiz para que no sea siempre la primera.',
    listaEvitar.length > 0
      ? `- No repitas ninguna de estas preguntas ya creadas en lotes anteriores: ${listaEvitar.slice(-KAHOOT_MAX_QUESTIONS).map((q) => `"${q}"`).join(', ')}.`
      : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

function limpiarBloqueJSON(texto) {
  let t = String(texto || '').trim();
  t = t.replace(/```json/gi, '').replace(/```/g, '').trim();
  t = t
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/[\u2018\u2019]/g, "'");

  const arrayOfObjMatch = t.match(/\[\s*\{/);
  const firstBrace = t.indexOf('{');
  const lastBracket = t.lastIndexOf(']');
  const lastBrace = t.lastIndexOf('}');

  if (arrayOfObjMatch && lastBracket > arrayOfObjMatch.index) {
    if (firstBrace !== -1 && firstBrace < arrayOfObjMatch.index && lastBrace > lastBracket) {
      return t.slice(firstBrace, lastBrace + 1);
    }
    return t.slice(arrayOfObjMatch.index, lastBracket + 1);
  }

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return t.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = t.indexOf('[');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return t.slice(firstBracket, lastBracket + 1);
  }

  return t;
}

/**
 * Parsea la salida de la IA en preguntas de Kahoot normalizadas y baraja la posición de las opciones si todas las correctas quedaron en el índice 0.
 */
export function parsearKahootIA(rawText, defaultTimeLimit = 20, startIndex = 0) {
  const cleaned = limpiarBloqueJSON(rawText);
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, questions: [], error: 'La IA no devolvió un formato JSON válido. Intenta de nuevo.' };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : Array.isArray(parsed?.preguntas)
        ? parsed.preguntas
        : Array.isArray(parsed?.items)
          ? parsed.items
          : parsed && typeof parsed === 'object' && (parsed.text || parsed.question || parsed.pregunta || parsed.enunciado)
            ? [parsed]
            : null;

  if (!list || list.length === 0) {
    return { ok: false, questions: [], error: 'No se encontraron preguntas en la respuesta de la IA.' };
  }

  const questions = [];
  const vistos = new Set();
  list.slice(0, KAHOOT_MAX_QUESTIONS).forEach((item) => {
    const globalIdx = startIndex + questions.length;
    const q = normalizeKahootQuestion(
      { ...item, id: undefined, timeLimit: item?.timeLimit || defaultTimeLimit },
      globalIdx
    );
    if (!q.text) return;
    const clave = q.text.toLowerCase().slice(0, 80);
    if (vistos.has(clave)) return;
    vistos.add(clave);

    // Si es quiz y la opción correcta siempre vino en índice 0, rotamos de forma determinista según globalIdx
    // solo entre las opciones con texto para mantener las opciones vacías opcionales al final.
    const nonEmptyOpts = (q.options || []).filter((o) => String(o.text || '').trim().length > 0);
    const emptyOpts = (q.options || []).filter((o) => String(o.text || '').trim().length === 0);
    if (q.type === 'quiz' && nonEmptyOpts.length >= 2) {
      const firstCorrect = nonEmptyOpts[0]?.isCorrect && !nonEmptyOpts.slice(1).some((o) => o.isCorrect);
      if (firstCorrect && globalIdx % nonEmptyOpts.length !== 0) {
        const shift = globalIdx % nonEmptyOpts.length;
        const rotated = [...nonEmptyOpts];
        const [first] = rotated.splice(0, 1);
        rotated.splice(shift, 0, first);
        q.options = [...rotated, ...emptyOpts].map((o, oi) => ({ ...o, id: `${q.id}_${oi}` }));
      }
    }

    questions.push(q);
  });

  if (questions.length === 0) {
    return { ok: false, questions: [], error: 'Las preguntas generadas estaban incompletas.' };
  }

  return { ok: true, questions, error: '' };
}

/**
 * Genera preguntas de Kahoot con IA llamando a callGemini.
 * Si se piden más de KAHOOT_AI_BATCH_SIZE preguntas (hasta 50), genera por lotes para evitar truncamiento por límite de tokens.
 */
export async function generarKahootConIA(config, callGemini) {
  if (typeof callGemini !== 'function') {
    return {
      ok: false,
      questions: [],
      error: 'No se pudo generar el Kahoot con IA en este momento. Revisa tu conexión o intenta con otro tema.',
    };
  }

  const totalDeseado = Math.max(
    KAHOOT_MIN_QUESTIONS,
    Math.min(KAHOOT_MAX_QUESTIONS, Number(config?.total) || 6)
  );
  const defaultTimeLimit = config?.timeLimit || 20;

  if (totalDeseado <= KAHOOT_AI_BATCH_SIZE) {
    const prompt = construirPromptKahootIA({ ...config, total: totalDeseado });
    for (let intento = 0; intento < 2; intento++) {
      const rawResponse = await callGemini(prompt, 120000);
      if (rawResponse) {
        const res = parsearKahootIA(rawResponse, defaultTimeLimit, 0);
        if (res.ok && res.questions.length > 0) {
          return { ok: true, questions: res.questions.slice(0, totalDeseado), error: '' };
        }
      }
    }
    return {
      ok: false,
      questions: [],
      error: 'No se pudo generar el Kahoot con IA en este momento. Revisa tu conexión o intenta con otro tema.',
    };
  }

  // Generación por lotes cuando se piden más de KAHOOT_AI_BATCH_SIZE preguntas (hasta 50)
  const acumuladas = [];
  const vistos = new Set();
  let intentosFallidos = 0;
  const maxIteraciones = Math.ceil(totalDeseado / KAHOOT_AI_BATCH_SIZE) + 2;

  for (let iter = 0; iter < maxIteraciones && acumuladas.length < totalDeseado; iter++) {
    const faltan = totalDeseado - acumuladas.length;
    const cantidadLote = Math.min(KAHOOT_AI_BATCH_SIZE, faltan);
    const prompt = construirPromptKahootIA({
      ...config,
      total: cantidadLote,
      evitar: acumuladas.map((q) => q.text.slice(0, 80)),
    });

    const rawResponse = await callGemini(prompt, 120000);
    if (!rawResponse) {
      intentosFallidos++;
      if (intentosFallidos >= 2) break;
      continue;
    }

    const parsed = parsearKahootIA(rawResponse, defaultTimeLimit, acumuladas.length);
    if (!parsed.ok || parsed.questions.length === 0) {
      intentosFallidos++;
      if (intentosFallidos >= 2) break;
      continue;
    }

    let agregadasEnLote = 0;
    for (const q of parsed.questions) {
      if (acumuladas.length >= totalDeseado) break;
      const clave = q.text.toLowerCase().slice(0, 80);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const idxReal = acumuladas.length;
      const idReal = `kq_item_${idxReal}`;
      acumuladas.push({
        ...q,
        id: idReal,
        options: Array.isArray(q.options)
          ? q.options.map((o, oi) => ({ ...o, id: `${idReal}_${oi}` }))
          : [],
      });
      agregadasEnLote++;
    }

    if (agregadasEnLote === 0) {
      intentosFallidos++;
      if (intentosFallidos >= 2) break;
    }
  }

  if (acumuladas.length > 0) {
    return { ok: true, questions: acumuladas.slice(0, totalDeseado), error: '' };
  }

  return {
    ok: false,
    questions: [],
    error: 'No se pudo generar el Kahoot con IA en este momento. Revisa tu conexión o intenta con otro tema.',
  };
}

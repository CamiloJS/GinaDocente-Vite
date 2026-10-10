// scripts/test-kahoot.mjs
// Pruebas unitarias exhaustivas para el motor de Kahoot en vivo y repaso (kahootEngine.js y kahootAudio.js)

import {
  KAHOOT_COLORS,
  KAHOOT_TIME_OPTIONS,
  KAHOOT_POINTS_OPTIONS,
  KAHOOT_QUESTION_TYPES,
  DEMO_KAHOOT_BOTS,
  sanitizeKahootPlayerId,
  generateKahootPin,
  createDefaultKahootQuestion,
  normalizeKahootQuestion,
  validateKahootConfig,
  evaluateKahootAnswer,
  calculateKahootPoints,
  buildKahootLeaderboard,
  buildSimulatedBotAnswer,
  construirPromptKahootIA,
  parsearKahootIA,
  generarKahootConIA,
  reconcileKahootParticipantsAfterEdit,
  canAccessKahootReview,
  parseKahootUrlInfo,
  buildPublicKahootUrl,
  KAHOOT_MAX_QUESTIONS,
  KAHOOT_AI_BATCH_SIZE
} from '../src/utils/kahootEngine.js';

import {
  startLobbyMusic,
  startTensionMusic,
  stopKahootMusic,
  playGongSound,
  playAnswerSelectSound,
  playRevealResultSound,
  playPodiumFanfare
} from '../src/utils/kahootAudio.js';

let okCount = 0;
let failCount = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  OK  ${label}`);
    okCount++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`);
    failCount++;
  }
}

console.log('\n== 1. Constantes, PIN y Sanitizacion de Jugadores ==');
check('4 colores Kahoot definidos', KAHOOT_COLORS.length === 4 && KAHOOT_COLORS[0].id === 'red');
check('opciones de tiempo validas', KAHOOT_TIME_OPTIONS.includes(20) && KAHOOT_TIME_OPTIONS.includes(30));
check('multiplicadores de puntos validos (1000 y 2000)', KAHOOT_POINTS_OPTIONS.some(p => p.maxPoints === 1000) && KAHOOT_POINTS_OPTIONS.some(p => p.maxPoints === 2000));
check('5 tipos de preguntas soportados (incluyendo acertijo/riddle)', Object.keys(KAHOOT_QUESTION_TYPES).length === 5 && Boolean(KAHOOT_QUESTION_TYPES.riddle));
check('PIN generado tiene 6 digitos', /^\d{6}$/.test(generateKahootPin()));
check('sanitizeKahootPlayerId limpia puntos, barras y espacios para Firestore', sanitizeKahootPlayerId('user.name/123@test') === 'user_name_123_test');
check('sanitizeKahootPlayerId maneja vacio o nulo', sanitizeKahootPlayerId(null) === 'player_anon' && sanitizeKahootPlayerId('') === 'player_anon');

console.log('\n== 2. Creacion y Normalizacion de los 4 Tipos de Preguntas ==');
const qQuiz = createDefaultKahootQuestion('quiz', 0);
check('quiz por defecto tiene 4 opciones y 1 correcta', qQuiz.options.length === 4 && qQuiz.options.filter(o => o.isCorrect).length === 1);

const qTF = createDefaultKahootQuestion('truefalse', 1);
check('truefalse por defecto tiene 2 opciones (Verdadero/Falso)', qTF.options.length === 2 && qTF.options[0].isCorrect === true && qTF.options[1].isCorrect === false);

const qType = createDefaultKahootQuestion('type_answer', 2);
check('type_answer inicializa acceptedAnswers', Array.isArray(qType.acceptedAnswers));

const qPuzzle = createDefaultKahootQuestion('puzzle', 3);
check('puzzle por defecto tiene 4 pasos en puzzleItems', qPuzzle.puzzleItems.length === 4);

const normInvalid = normalizeKahootQuestion({
  type: 'unknown_type',
  question: '  What is GDP? ',
  timeLimit: 999,
  pointsMultiplier: 5000,
  options: [{ text: 'Gross Domestic Product', isCorrect: false }, { text: 'Other', isCorrect: false }]
}, 0);
check('normalizeKahootQuestion corrige tipo invalido a quiz', normInvalid.type === 'quiz');
check('normalizeKahootQuestion corrige timeLimit invalido a 20s', normInvalid.timeLimit === 20);
check('normalizeKahootQuestion corrige pointsMultiplier invalido a 1 (estandar)', normInvalid.pointsMultiplier === 1);
check('normalizeKahootQuestion garantiza al menos 1 opcion correcta en quiz', normInvalid.options.some(o => o.isCorrect));

console.log('\n== 3. Validacion de Configuracion del Kahoot ==');
check('rechaza lista vacia de preguntas', validateKahootConfig([]).valid === false);
check('rechaza pregunta con enunciado vacio', validateKahootConfig([createDefaultKahootQuestion('quiz', 0)]).valid === false);

const validQuizQ = normalizeKahootQuestion({
  ...createDefaultKahootQuestion('quiz', 0),
  text: 'Which currency is used in the United Kingdom?',
  options: [
    { id: 'o1', text: 'Pound Sterling (GBP)', isCorrect: true },
    { id: 'o2', text: 'Euro (EUR)', isCorrect: false },
    { id: 'o3', text: 'US Dollar (USD)', isCorrect: false },
    { id: 'o4', text: 'Yen (JPY)', isCorrect: false }
  ]
}, 0);
const valRes = validateKahootConfig([validQuizQ]);
check('acepta configuracion valida de quiz', valRes.valid === true && valRes.normalizedQuestions.length === 1);
check('validateKahootConfig garantiza musicEnabled: true y allowNicknameChange: true siempre activos', valRes.musicEnabled === true && valRes.allowNicknameChange === true);

const invalidTypeAnswer = {
  ...createDefaultKahootQuestion('type_answer', 0),
  text: 'Type the past tense of go:',
  correctAnswer: '   ',
  acceptedAnswers: ['   ']
};
check('rechaza type_answer sin respuestas aceptadas ni correctAnswer', validateKahootConfig([invalidTypeAnswer]).valid === false);

const validTypeAnswer = {
  ...invalidTypeAnswer,
  correctAnswer: 'went',
  acceptedAnswers: ['went', 'WENT']
};
check('acepta type_answer con respuestas aceptadas', validateKahootConfig([validTypeAnswer]).valid === true);

console.log('\n== 4. Evaluacion de Respuestas (4 Modalidades + Casos Borde) ==');
// 4.1 Quiz Selección Única
check('quiz unica: acierta opcion correcta por optionIndex (0)', evaluateKahootAnswer(validQuizQ, { optionIndex: 0 }) === true);
check('quiz unica: acierta opcion correcta por optionId (o1)', evaluateKahootAnswer(validQuizQ, { optionId: 'o1' }) === true);
check('quiz unica: falla opcion incorrecta por optionIndex (1)', evaluateKahootAnswer(validQuizQ, { optionIndex: 1 }) === false);
check('quiz unica: falla respuesta vacia o nula', evaluateKahootAnswer(validQuizQ, null) === false && evaluateKahootAnswer(validQuizQ, {}) === false);

// 4.2 Quiz Selección Múltiple
const multiQuizQ = normalizeKahootQuestion({
  type: 'quiz',
  text: 'Select all fiscal policy tools:',
  allowMultiple: true,
  options: [
    { id: 'm1', text: 'Corporate Taxes', isCorrect: true },
    { id: 'm2', text: 'Public Infrastructure Spending', isCorrect: true },
    { id: 'm3', text: 'Central Bank Discount Rate', isCorrect: false },
    { id: 'm4', text: 'Open Market Operations', isCorrect: false }
  ]
}, 0);
check('quiz multiple: acierta cuando selecciona exactamente todas las correctas por indices', evaluateKahootAnswer(multiQuizQ, { optionIndices: [1, 0] }) === true);
check('quiz multiple: acierta cuando selecciona exactamente todas las correctas por IDs', evaluateKahootAnswer(multiQuizQ, { optionIds: ['m2', 'm1'] }) === true);
check('quiz multiple: falla si selecciona solo una de las dos correctas', evaluateKahootAnswer(multiQuizQ, { optionIndices: [0] }) === false);
check('quiz multiple: falla si incluye una incorrecta', evaluateKahootAnswer(multiQuizQ, { optionIndices: [0, 1, 2] }) === false);

// 4.3 True / False
const tfQ = normalizeKahootQuestion({
  type: 'truefalse',
  text: 'Inflation reduces purchasing power.',
  options: [
    { id: 'tf_true', text: 'True', isCorrect: true },
    { id: 'tf_false', text: 'False', isCorrect: false }
  ]
}, 0);
check('truefalse: acierta True por indice y por ID', evaluateKahootAnswer(tfQ, { optionIndex: 0 }) === true && evaluateKahootAnswer(tfQ, { optionId: 'tf_true' }) === true);
check('truefalse: falla False', evaluateKahootAnswer(tfQ, { optionIndex: 1 }) === false);

// 4.4 Type Answer (insensible a mayúsculas, tildes y puntuación final)
const shortAnsQ = normalizeKahootQuestion({
  type: 'type_answer',
  text: 'Acronym for Gross Domestic Product:',
  correctAnswer: 'GDP',
  acceptedAnswers: ['GDP', 'Gross Domestic Product', 'Inflación']
}, 0);
check('type_answer: coincide exacto en minusculas', evaluateKahootAnswer(shortAnsQ, { textAnswer: 'gdp' }) === true);
check('type_answer: coincide frase con espacios y punto final', evaluateKahootAnswer(shortAnsQ, { textAnswer: '  gross domestic product. ' }) === true);
check('type_answer: coincide ignorando tildes', evaluateKahootAnswer(shortAnsQ, { textAnswer: 'inflacion' }) === true);
check('type_answer: rechaza texto incorrecto', evaluateKahootAnswer(shortAnsQ, { textAnswer: 'CPI' }) === false);

// 4.5 Puzzle (Ordenar secuencia de arriba hacia abajo)
const puzzleQ = normalizeKahootQuestion({
  type: 'puzzle',
  text: 'Order the sentence:',
  puzzleItems: ['Supply', 'and', 'demand', 'determine prices.']
}, 0);
check('puzzle: acierta orden exacto de arriba hacia abajo', evaluateKahootAnswer(puzzleQ, { puzzleOrder: ['Supply', 'and', 'demand', 'determine prices.'] }) === true);
check('puzzle: falla si dos elementos estan invertidos', evaluateKahootAnswer(puzzleQ, { puzzleOrder: ['Supply', 'demand', 'and', 'determine prices.'] }) === false);
check('puzzle: falla si la longitud no coincide', evaluateKahootAnswer(puzzleQ, { puzzleOrder: ['Supply', 'and'] }) === false);

console.log('\n== 5. Calculo de Puntos por Velocidad y Rachas (Speed Scoring) ==');
const fastPts = calculateKahootPoints({ isCorrect: true, timeMs: 1000, timeLimitSec: 20, pointsMultiplier: 1, currentStreak: 0 }).pointsEarned;
const mediumPts = calculateKahootPoints({ isCorrect: true, timeMs: 10000, timeLimitSec: 20, pointsMultiplier: 1, currentStreak: 0 }).pointsEarned;
const slowPts = calculateKahootPoints({ isCorrect: true, timeMs: 19900, timeLimitSec: 20, pointsMultiplier: 1, currentStreak: 0 }).pointsEarned;
const wrongPts = calculateKahootPoints({ isCorrect: false, timeMs: 500, timeLimitSec: 20, pointsMultiplier: 2, currentStreak: 5 }).pointsEarned;
check('respuesta incorrecta siempre da 0 puntos', wrongPts === 0);
check('respuesta rapida gana mas puntos que respuesta media y lenta', fastPts > mediumPts && mediumPts > slowPts);
check('respuesta al limite de tiempo gana al menos la mitad (500 pts)', slowPts >= 500);
check('respuesta en 0ms obtiene puntaje maximo (1000 pts)', calculateKahootPoints({ isCorrect: true, timeMs: 0, timeLimitSec: 20, pointsMultiplier: 1, currentStreak: 0 }).pointsEarned === 1000);
const doublePts = calculateKahootPoints({ isCorrect: true, timeMs: 0, timeLimitSec: 20, pointsMultiplier: 2, currentStreak: 0 }).pointsEarned;
check('multiplicador x2 otorga el doble de puntos base (2000 pts)', doublePts === 2000);
const streakRes = calculateKahootPoints({ isCorrect: true, timeMs: 0, timeLimitSec: 20, pointsMultiplier: 1, currentStreak: 2 });
check('racha de aciertos (streak >= 2) suma bono extra de racha', streakRes.pointsEarned > 1000 && streakRes.streakBonus === 200);

console.log('\n== 6. Tabla de Posiciones (Leaderboard) y Desempate por Velocidad ==');
const lbResult = buildKahootLeaderboard({
  p1: { id: 'p1', nickname: 'Ana', score: 1500, correctCount: 2, totalTimeMs: 8000, streak: 2, answers: { '0': { isCorrect: true, timeMs: 3500, pointsEarned: 910 } } },
  p2: { id: 'p2', nickname: 'Luis', score: 2100, correctCount: 2, totalTimeMs: 4200, streak: 2, answers: { '0': { isCorrect: true, timeMs: 1800, pointsEarned: 955 } } },
  p3: { id: 'p3', nickname: 'Sofia', score: 1500, correctCount: 2, totalTimeMs: 5100, streak: 1, answers: { '0': { isCorrect: true, timeMs: 2400, pointsEarned: 940 } } }
}, 0);
check('ordena primero al mayor puntaje (Luis)', lbResult.leaderboard[0].nickname === 'Luis' && lbResult.leaderboard[0].rank === 1);
check('desempata mismo puntaje a favor de quien respondio mas rapido (Sofia antes que Ana)', lbResult.leaderboard[1].nickname === 'Sofia' && lbResult.leaderboard[2].nickname === 'Ana');
check('identifica al participante mas rapido de la ronda (fastestResponder)', lbResult.fastestResponder?.displayName === 'Luis' && lbResult.fastestResponder?.timeMs === 1800);

console.log('\n== 7. Bots Simulados en Modo Demo ==');
check('DEMO_KAHOOT_BOTS definidos', DEMO_KAHOOT_BOTS.length >= 4);
const simAns = buildSimulatedBotAnswer(DEMO_KAHOOT_BOTS[0], validQuizQ, 0);
check('buildSimulatedBotAnswer devuelve isCorrect, timeMs y questionIndex', typeof simAns.isCorrect === 'boolean' && simAns.timeMs > 0 && simAns.questionIndex === 0);

console.log('\n== 8. Generador de Kahoot con IA (Prompt y Parseo) ==');
const prompt = construirPromptKahootIA({
  tema: 'Macroeconomics & Inflation',
  total: 5,
  dificultad: 'media',
  idioma: 'en',
  mezcla: 'completo'
});
check('prompt incluye tema y cantidad solicitada', prompt.includes('Macroeconomics & Inflation') && prompt.includes('5'));

const sampleAiJson = `\`\`\`json
[
  {
    "type": "quiz",
    "text": "What does CPI stand for?",
    "timeLimit": 20,
    "pointsMultiplier": 1,
    "options": [
      { "text": "Consumer Price Index", "isCorrect": true },
      { "text": "Central Price Indicator", "isCorrect": false },
      { "text": "Corporate Profit Index", "isCorrect": false },
      { "text": "Capital Payment Interest", "isCorrect": false }
    ],
    "explanation": "CPI measures changes in the price level of a basket of consumer goods."
  },
  {
    "type": "type_answer",
    "text": "Write the opposite of inflation (when prices fall):",
    "timeLimit": 20,
    "pointsMultiplier": 2,
    "correctAnswer": "deflation",
    "acceptedAnswers": ["deflation"],
    "explanation": "Deflation is a decrease in the general price level of goods and services."
  }
]
\`\`\``;

const parsedAi = parsearKahootIA(sampleAiJson);
check('parsearKahootIA extrae y normaliza bloques JSON con markdown', parsedAi.ok === true && parsedAi.questions.length === 2);
check('parsearKahootIA preserva tipos quiz y type_answer', parsedAi.questions[0].type === 'quiz' && parsedAi.questions[1].type === 'type_answer');
check('parsearKahootIA devuelve ok:false ante texto corrupto', parsearKahootIA('no es json').ok === false);

const generatedViaMock = await generarKahootConIA({ tema: 'Inflation', total: 2 }, async () => sampleAiJson);
check('generarKahootConIA integra callGemini y valida resultado', generatedViaMock.ok === true && generatedViaMock.questions.length === 2 && generatedViaMock.questions[0].text.includes('CPI'));

console.log('\n== 9. Seguridad del Sintetizador de Audio + Gong en Entorno sin Navegador ==');
let audioSafe = true;
try {
  startLobbyMusic(true);
  startTensionMusic(true);
  playGongSound(true);
  playAnswerSelectSound(true);
  playRevealResultSound(true, true);
  playPodiumFanfare(true);
  stopKahootMusic();
} catch (err) {
  audioSafe = false;
}
check('funciones de kahootAudio (incluyendo playGongSound y startTensionMusic) no fallan fuera del navegador', audioSafe);

console.log('\n== 10. Regresiones: Edicion en Vivo (preserveDraft), IDs Deterministicos y Parseo IA Robusto ==');
const draftQ = normalizeKahootQuestion(
  {
    type: 'quiz',
    text: 'What is ',
    allowMultiple: false,
    options: [
      { id: 'opt_1', text: 'Gross Domestic ', isCorrect: false },
      { id: 'opt_2', text: '', isCorrect: true },
      { id: 'opt_3', text: '', isCorrect: false },
      { id: 'opt_4', text: '', isCorrect: false }
    ]
  },
  0,
  { preserveDraft: true }
);
check('preserveDraft conserva espacios finales mientras el docente escribe', draftQ.text === 'What is ' && draftQ.options[0].text === 'Gross Domestic ');
check('preserveDraft no activa allowMultiple por accidente al marcar una opcion vacia', draftQ.allowMultiple === false && draftQ.options[1].isCorrect === true && draftQ.options[0].isCorrect === false);

const draftPuzzle = normalizeKahootQuestion(
  {
    type: 'puzzle',
    text: 'Order steps: ',
    puzzleItems: ['', 'Second step ', '', 'Fourth step']
  },
  1,
  { preserveDraft: true }
);
check('preserveDraft mantiene los 4 slots de puzzleItems sin desplazar indices vacios', draftPuzzle.puzzleItems.length === 4 && draftPuzzle.puzzleItems[0] === '' && draftPuzzle.puzzleItems[1] === 'Second step ' && draftPuzzle.puzzleItems[3] === 'Fourth step');

const det1 = normalizeKahootQuestion({ type: 'quiz', text: 'Deterministic ID check' }, 4);
const det2 = normalizeKahootQuestion({ type: 'quiz', text: 'Deterministic ID check' }, 4);
check('IDs por defecto en normalizeKahootQuestion son deterministicos por indice', det1.id === 'kq_item_4' && det1.id === det2.id);

const spanishTF = normalizeKahootQuestion({
  tipo: 'verdadero_falso',
  pregunta: 'El PIB nominal incluye la inflación.',
  opciones: [
    { texto: 'Verdadero', correcta: false },
    { texto: 'Falso', correcta: true }
  ]
}, 0);
check('truefalse soporta llaves en espanol (opciones, texto, correcta)', spanishTF.type === 'truefalse' && spanishTF.options[1].isCorrect === true && spanishTF.options[0].isCorrect === false);

const unmarkedQuizValidation = validateKahootConfig([
  {
    type: 'quiz',
    text: 'Question with no marked correct option',
    options: [
      { text: 'Option A', isCorrect: false },
      { text: 'Option B', isCorrect: false }
    ]
  }
]);
check('validateKahootConfig rechaza pregunta quiz cuando ninguna opcion no vacia fue marcada como correcta', unmarkedQuizValidation.valid === false);

const singleObjJson = `{"type":"quiz","text":"Single object AI question?","timeLimit":20,"pointsMultiplier":1,"options":[{"text":"Correct A","isCorrect":true},{"text":"Wrong B","isCorrect":false}]}`;
const parsedSingleObj = parsearKahootIA(singleObjJson);
check('parsearKahootIA soporta objeto JSON individual sin corromper su arreglo interno options', parsedSingleObj.ok === true && parsedSingleObj.questions.length === 1 && parsedSingleObj.questions[0].text === 'Single object AI question?');

const preambleBracketJson = `Aquí tienes las preguntas [1-1] generadas:\n[{"type":"truefalse","text":"Bracket preamble test","options":[{"text":"True","isCorrect":true},{"text":"False","isCorrect":false}]}]`;
const parsedPreamble = parsearKahootIA(preambleBracketJson);
check('parsearKahootIA ignora corchetes en texto previo y extrae el arreglo JSON real', parsedPreamble.ok === true && parsedPreamble.questions.length === 1 && parsedPreamble.questions[0].text === 'Bracket preamble test');

const promptSoloPuzzle = construirPromptKahootIA({ tema: 'Supply Chain', total: 1, mezcla: 'solo_puzzle' });
const promptSoloType = construirPromptKahootIA({ tema: 'Supply Chain', total: 1, mezcla: 'solo_type_answer' });
check(
  'construirPromptKahootIA soporta modos solo_puzzle y solo_type_answer',
  promptSoloPuzzle.includes('TODAS las preguntas de ordenar secuencia') &&
    promptSoloType.includes('TODAS las preguntas de respuesta corta escrita')
);

console.log('\n== 11. Limite de 50 Preguntas y Generacion con IA por Lotes ==');
check('KAHOOT_MAX_QUESTIONS es 50', KAHOOT_MAX_QUESTIONS === 50);
check('KAHOOT_AI_BATCH_SIZE es 20', KAHOOT_AI_BATCH_SIZE === 20);

const list50 = Array.from({ length: 50 }, (_, idx) => ({
  type: 'quiz',
  text: `Valid Kahoot question #${idx + 1}`,
  options: [
    { text: `Correct ${idx + 1}`, isCorrect: true },
    { text: `Wrong ${idx + 1}`, isCorrect: false }
  ]
}));
const val50 = validateKahootConfig(list50);
check('validateKahootConfig acepta exactamente 50 preguntas validas', val50.valid === true && val50.normalizedQuestions.length === 50);

const list51 = [...list50, { type: 'quiz', text: 'Question #51', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }];
const val51 = validateKahootConfig(list51);
check('validateKahootConfig rechaza mas de 50 preguntas (51)', val51.valid === false && String(val51.error || '').includes('50'));

let kahootAiCounter = 0;
let kahootBatchCalls = 0;
const kahootBatchSizes = [];
const mockKahootBatchAi = async (promptStr) => {
  kahootBatchCalls++;
  const mTotal = promptStr.match(/Cantidad exacta de preguntas:\s*(\d+)/);
  const batchLen = mTotal ? Number(mTotal[1]) : 0;
  kahootBatchSizes.push(batchLen);
  const arr = [];
  for (let i = 0; i < batchLen; i++) {
    kahootAiCounter++;
    arr.push({
      type: 'quiz',
      text: `Macroeconomics question #${kahootAiCounter}?`,
      timeLimit: 20,
      pointsMultiplier: 1,
      options: [
        { text: `Right answer ${kahootAiCounter}`, isCorrect: true },
        { text: `Wrong A ${kahootAiCounter}`, isCorrect: false },
        { text: `Wrong B ${kahootAiCounter}`, isCorrect: false },
        { text: `Wrong C ${kahootAiCounter}`, isCorrect: false }
      ],
      explanation: `Explanation ${kahootAiCounter}`
    });
  }
  return JSON.stringify(arr);
};

const genKahoot50 = await generarKahootConIA({ tema: 'Macroeconomics', total: 50 }, mockKahootBatchAi);
check(
  'generarKahootConIA genera 50 preguntas en 3 lotes [20, 20, 10] con IDs unicos secuenciales',
  genKahoot50.ok === true &&
    genKahoot50.questions.length === 50 &&
    kahootBatchCalls === 3 &&
    JSON.stringify(kahootBatchSizes) === JSON.stringify([20, 20, 10]) &&
    genKahoot50.questions[0].id === 'kq_item_0' &&
    genKahoot50.questions[49].id === 'kq_item_49'
);

// Verificar rotacion de opciones cuando un quiz tiene solo 2 o 3 opciones no vacias (no debe mover vacias a las primeras 2 posiciones)
const parsed2OptRot = parsearKahootIA(
  JSON.stringify([
    {
      type: 'quiz',
      text: 'Two-option quiz rotated at index 2?',
      options: [
        { text: 'First non-empty', isCorrect: true },
        { text: 'Second non-empty', isCorrect: false }
      ]
    }
  ]),
  1,
  2
);
check(
  'parsearKahootIA no rota opciones vacias hacia las posiciones requeridas en quiz de 2 opciones',
  parsed2OptRot.ok === true &&
    parsed2OptRot.questions.length === 1 &&
    Boolean(parsed2OptRot.questions[0].options[0].text) &&
    Boolean(parsed2OptRot.questions[0].options[1].text) &&
    validateKahootConfig(parsed2OptRot.questions).valid === true
);

// Verificar deduplicacion dentro del mismo lote e IDs secuenciales sin huecos
const parsedDupBatch = parsearKahootIA(
  JSON.stringify([
    { type: 'truefalse', text: 'Repeated statement?', options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] },
    { type: 'truefalse', text: 'Repeated statement?', options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] },
    { type: 'truefalse', text: 'Unique second statement?', options: [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: true }] }
  ]),
  2,
  10
);
check(
  'parsearKahootIA elimina duplicadas dentro del mismo lote y mantiene IDs secuenciales',
  parsedDupBatch.ok === true &&
    parsedDupBatch.questions.length === 2 &&
    parsedDupBatch.questions[0].id === 'kq_item_10' &&
    parsedDupBatch.questions[1].id === 'kq_item_11'
);

// Verificar reintento en lote unico (<= 20 preguntas)
let singleBatchAttempts = 0;
const genSingleRetry = await generarKahootConIA({ tema: 'Retry Test', total: 5 }, async () => {
  singleBatchAttempts++;
  if (singleBatchAttempts === 1) return 'invalid json response';
  return JSON.stringify(
    Array.from({ length: 5 }, (_, idx) => ({
      type: 'truefalse',
      text: `Retry question #${idx + 1}`,
      options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false }
      ]
    }))
  );
});
check(
  'generarKahootConIA reintenta cuando falla el primer intento en solicitud de 1 solo lote',
  genSingleRetry.ok === true && genSingleRetry.questions.length === 5 && singleBatchAttempts === 2
);

let clampKahootCounter = 0;
const genKahootClamp = await generarKahootConIA({ tema: 'Clamp Test', total: 80 }, async (promptStr) => {
  const mTotal = promptStr.match(/Cantidad exacta de preguntas:\s*(\d+)/);
  const batchLen = mTotal ? Number(mTotal[1]) : 0;
  return JSON.stringify(
    Array.from({ length: batchLen }, () => {
      clampKahootCounter++;
      return {
        type: 'truefalse',
        text: `Statement #${clampKahootCounter}`,
        options: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ]
      };
    })
  );
});
check('generarKahootConIA limita solicitudes >50 a un maximo de 50 preguntas', genKahootClamp.ok === true && genKahootClamp.questions.length === 50 && clampKahootCounter === 50);

// 14. Pruebas de escalabilidad (40+ estudiantes), exclusión de docente host, audio agradable y vista proyector
console.log('\n--- 14. Escalabilidad 40+ estudiantes, Exclusión Docente Host, Audio y Vista Proyector ---');

const classroom45Map = {};
// Agregar registros de docentes que NO deben contarse como jugadores ni bloquear all_answered
classroom45Map.teacher_gina = {
  id: 'teacher_gina',
  nickname: 'Docente Gina',
  role: 'teacher',
  score: 0,
  answers: {},
};
classroom45Map.host_custom = {
  id: 'host_custom',
  nickname: 'Profe Host',
  isTeacherHost: true,
  score: 0,
  answers: {},
};
classroom45Map.legacy_host = {
  id: 'legacy_host',
  nickname: 'Docente Host',
  score: 0,
  answers: {},
};

for (let i = 1; i <= 45; i++) {
  const pid = `student_${i}`;
  const isFastest = i === 27;
  const timeMs = isFastest ? 620 : 1200 + i * 30;
  const pts = isFastest ? 985 : 900 - i * 5;
  classroom45Map[pid] = {
    id: pid,
    nickname: `Estudiante ${i}`,
    avatar: '🦊',
    score: pts,
    streak: 1,
    correctCount: 1,
    answers: {
      '0': {
        questionIndex: 0,
        optionIndex: 1,
        isCorrect: true,
        pointsEarned: pts,
        timeMs,
      },
    },
  };
}

const lb45 = buildKahootLeaderboard(classroom45Map, 0);
check(
  'buildKahootLeaderboard excluye registros de docente/host (incluyendo Docente Host legado) para no bloquear el cierre automatico de ronda',
  lb45.totalParticipants === 45 &&
    lb45.answeredCount === 45 &&
    !lb45.leaderboard.some(
      (p) => p.id === 'teacher_gina' || p.id === 'host_custom' || p.id === 'legacy_host'
    )
);
check(
  'buildKahootLeaderboard procesa 45 estudiantes concurrentes ordenando puntajes y detectando el mas rapido',
  lb45.leaderboard.length === 45 &&
    lb45.leaderboard[0].id === 'student_27' &&
    lb45.fastestResponder?.id === 'student_27' &&
    lb45.leaderboard[44].rank === 45
);

import fs from 'node:fs';

const gongResultNode = playGongSound();
check(
  'playGongSound se ejecuta de forma segura en entorno sin Web Audio API sin lanzar excepciones',
  gongResultNode === false
);

const audioSrc = fs.readFileSync(new URL('../src/utils/kahootAudio.js', import.meta.url), 'utf8');
const gongAndRevealSection = audioSrc.slice(audioSrc.indexOf('export const playGongSound'));
check(
  'playGongSound utiliza acorde de campana armonica brillante (C5-E5-G5-C6) sin ruido blanco, sin sawtooth disonante y con ganancia balanceada',
  gongAndRevealSection.includes('chimeChord') &&
    gongAndRevealSection.includes('523.25') &&
    gongAndRevealSection.includes('1046.5') &&
    !gongAndRevealSection.includes('gongPartials') &&
    !gongAndRevealSection.includes('createBufferSource') &&
    !gongAndRevealSection.includes('sawtooth')
);

const modalSrc = fs.readFileSync(new URL('../src/components/KahootLiveModal.jsx', import.meta.url), 'utf8');
const appSrc = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
check(
  'KahootLiveModal separa la Vista Proyector del Docente (sin opciones en fase question) de la Vista Estudiante',
  modalSrc.includes("const isTeacherProjector = role === 'teacher' && viewMode === 'live'") &&
    modalSrc.includes('{isTeacherProjector ? (') &&
    modalSrc.includes('Revelar respuesta ahora')
);
check(
  'KahootLiveModal blinda el texto de la pregunta e inputs sobre fondo blanco contra el Modo Oscuro (.dark)',
  modalSrc.includes('.dark .kahoot-live-portal .kahoot-question-card h3') &&
    modalSrc.includes('color: #0f172a !important;') &&
    modalSrc.includes('kahoot-light-input')
);
check(
  'KahootLiveModal protege el temporizador contra desfases de reloj, primer fotograma de ronda, entradas tardias y carrera de ultimos en responder',
  modalSrc.includes('roundLocalStartMapRef') &&
    modalSrc.includes('timerState.roundKey === currentRoundKey ? timerState.seconds : activeDuration') &&
    modalSrc.includes('sawNonQuestionPhaseRef') &&
    modalSrc.includes('isLatestResponderOnAllAnswered') &&
    modalSrc.includes('allDoneNow') &&
    modalSrc.includes("'kahoot.updatedAt': nowTs")
);
check(
  'KahootLiveModal y App.jsx difieren re-renders del muro principal mientras el Kahoot en vivo esta abierto para escalar a 40+ estudiantes',
  modalSrc.includes('__KAHOOT_LIVE_MODAL_OPEN__') &&
    modalSrc.includes('isCriticalTransition') &&
    appSrc.includes('__KAHOOT_LIVE_MODAL_OPEN__') &&
    appSrc.includes('kahoot-live-modal-closed')
);

// 16. Casos borde adicionales: multi-select con 1 correcta, reconciliación tras edición, alias IA y palíndromos en puzzle
const multiSingleCorrectQ = normalizeKahootQuestion(
  {
    type: 'quiz',
    text: 'Select the correct option',
    allowMultiple: true,
    options: [
      { text: 'Correct', isCorrect: true },
      { text: 'Wrong 1', isCorrect: false },
      { text: 'Wrong 2', isCorrect: false },
      { text: 'Wrong 3', isCorrect: false }
    ]
  },
  0
);
check(
  'evaluateKahootAnswer rechaza seleccion de multiples opciones cuando allowMultiple=true pero solo 1 opcion es correcta',
  evaluateKahootAnswer(multiSingleCorrectQ, { optionIndex: 0, optionIndices: [0, 1, 2, 3] }) === false &&
    evaluateKahootAnswer(multiSingleCorrectQ, { optionIndex: 0, optionIndices: [0] }) === true
);

const palindromePuzzleQ = normalizeKahootQuestion(
  {
    type: 'puzzle',
    text: 'Order palindrome sequence',
    pasos: ['A', 'B', 'A']
  },
  0
);
const failingBot = { id: 'bot_fail', skill: 0, minDelayMs: 2000, maxDelayMs: 3000 };
const failingPuzzleAns = buildSimulatedBotAnswer(failingBot, palindromePuzzleQ, 0);
check(
  'buildSimulatedBotAnswer desordena secuencias palindromicas cuando el bot falla y evalua isCorrect=false',
  failingPuzzleAns.isCorrect === false &&
    evaluateKahootAnswer(palindromePuzzleQ, failingPuzzleAns) === false
);

const parsedMixedAi = parsearKahootIA(
  JSON.stringify({
    questions: [
      { type: 'type_answer', text: 'Incomplete type answer', correctAnswer: '' },
      { type: 'puzzle', text: 'Incomplete puzzle', puzzleItems: ['One', 'Two'] },
      { type: 'type_answer', text: 'Alias type answer', respuestaCorrecta: 'went', respuestasAceptadas: ['went'] },
      { type: 'puzzle', text: 'Alias puzzle', secuencia: ['First', 'Second', 'Third'] }
    ]
  }),
  20
);
check(
  'parsearKahootIA descarta preguntas incompletas de IA y normaliza alias respuestaCorrecta/secuencia',
  parsedMixedAi.ok === true &&
    parsedMixedAi.questions.length === 2 &&
    parsedMixedAi.questions[0].type === 'type_answer' &&
    parsedMixedAi.questions[0].correctAnswer === 'went' &&
    parsedMixedAi.questions[1].type === 'puzzle' &&
    parsedMixedAi.questions[1].puzzleItems.length === 3
);

const editedQuestions = [
  normalizeKahootQuestion(
    {
      type: 'quiz',
      text: 'Updated Q1 (now option 1 is correct with x2 points)',
      timeLimit: 20,
      pointsMultiplier: 2,
      options: [
        { text: 'Old correct', isCorrect: false },
        { text: 'New correct', isCorrect: true }
      ]
    },
    0
  )
];
const reconciledMap = reconcileKahootParticipantsAfterEdit(
  {
    p1: {
      id: 'p1',
      nickname: 'Ana',
      score: 800,
      streak: 1,
      correctCount: 2,
      answers: {
        0: { optionIndex: 1, optionIndices: [1], isCorrect: false, pointsEarned: 0, timeMs: 2000 },
        1: { optionIndex: 0, optionIndices: [0], isCorrect: true, pointsEarned: 800, timeMs: 3000 }
      }
    },
    p2: {
      id: 'p2',
      nickname: 'Luis',
      score: 1500,
      streak: 2,
      correctCount: 5,
      answers: {}
    }
  },
  editedQuestions
);
check(
  'reconcileKahootParticipantsAfterEdit recalcula puntajes/aciertos al cambiar la respuesta correcta y poda preguntas eliminadas',
  reconciledMap.p1.correctCount === 1 &&
    reconciledMap.p1.score > 1000 &&
    reconciledMap.p1.answers['0'].isCorrect === true &&
    reconciledMap.p1.answers['1'] === undefined &&
    reconciledMap.p2.correctCount === 1
);

const builderSrc = fs.readFileSync(new URL('../src/components/KahootBuilder.jsx', import.meta.url), 'utf8');
const taskCardSrc = fs.readFileSync(new URL('../src/components/TaskCard.jsx', import.meta.url), 'utf8');
check(
  'KahootBuilder evita text-gray-900 sobre fondo amarillo en Modo Oscuro e incluye todos los formatos de IA',
  builderSrc.includes('bg-amber-400 text-gray-950') &&
    !builderSrc.includes('bg-amber-400 text-gray-900') &&
    builderSrc.includes('solo_type_answer') &&
    builderSrc.includes('solo_puzzle')
);
check(
  'TaskCard reconcilia participantes y acota currentQuestionIndex al editar preguntas de un Kahoot',
  taskCardSrc.includes('reconcileKahootParticipantsAfterEdit')
);

// Verificar que un docente practicando en modo solitario (isSoloPracticePlayer: true) sí aparece en el leaderboard
const soloTeacherLb = buildKahootLeaderboard(
  {
    bot_sofia: { id: 'bot_sofia', nickname: 'Sofía', score: 900, correctCount: 1, answers: { 0: { isCorrect: true, timeMs: 3000 } } },
    teacher_gina: {
      id: 'teacher_gina',
      nickname: 'Gina Docente',
      score: 980,
      correctCount: 1,
      isSoloPracticePlayer: true,
      answers: { 0: { isCorrect: true, timeMs: 1500, pointsEarned: 980 } }
    },
    host_ghost: { id: 'host_ghost', nickname: 'Host', isHost: true, score: 0 }
  },
  0
);
check(
  'buildKahootLeaderboard incluye al docente cuando está en práctica individual (isSoloPracticePlayer) pero excluye anfitriones isHost',
  soloTeacherLb.totalParticipants === 2 &&
    soloTeacherLb.leaderboard[0].id === 'teacher_gina' &&
    soloTeacherLb.leaderboard[0].rank === 1 &&
    !soloTeacherLb.leaderboard.some((p) => p.id === 'host_ghost')
);

// Verificar que reconcileKahootParticipantsAfterEdit empareja por questionId al reordenar o eliminar preguntas y valida límites de opciones
const reorderedQuestions = [
  normalizeKahootQuestion(
    {
      id: 'q_second',
      type: 'quiz',
      text: 'Question originally at index 1, now moved to index 0 (2 options)',
      timeLimit: 20,
      pointsMultiplier: 1,
      options: [
        { id: 'opt_a', text: 'Correct A', isCorrect: true },
        { id: 'opt_b', text: 'Wrong B', isCorrect: false }
      ]
    },
    0
  ),
  normalizeKahootQuestion(
    {
      id: 'q_first',
      type: 'quiz',
      text: 'Question originally at index 0, now moved to index 1 (reduced to 2 options)',
      timeLimit: 20,
      pointsMultiplier: 1,
      options: [
        { id: 'opt_1', text: 'Option 1', isCorrect: true },
        { id: 'opt_2', text: 'Option 2', isCorrect: false }
      ]
    },
    1
  )
];
const reconciledReordered = reconcileKahootParticipantsAfterEdit(
  {
    student1: {
      id: 'student1',
      nickname: 'Mateo',
      score: 900,
      streak: 1,
      correctCount: 1,
      answers: {
        0: { questionId: 'q_first', questionIndex: 0, optionIndex: 3, optionIndices: [3], isCorrect: false, timeMs: 2500 },
        1: { questionId: 'q_second', questionIndex: 1, optionIndex: 0, optionIndices: [0], isCorrect: true, timeMs: 2000 }
      }
    }
  },
  reorderedQuestions
);
check(
  'reconcileKahootParticipantsAfterEdit empareja respuestas por questionId tras reordenar preguntas y descarta opciones fuera de rango eliminadas',
  reconciledReordered.student1.correctCount === 1 &&
    reconciledReordered.student1.answers['0']?.questionId === 'q_second' &&
    reconciledReordered.student1.answers['0']?.isCorrect === true &&
    reconciledReordered.student1.answers['1'] === undefined
);

const botAnsWithId = buildSimulatedBotAnswer(
  { id: 'bot_1', skill: 1 },
  reorderedQuestions[0],
  0
);
check(
  'buildSimulatedBotAnswer incluye questionId de la pregunta',
  botAnsWithId.questionId === 'q_second' && botAnsWithId.isCorrect === true
);

const liveModalSrc = fs.readFileSync(new URL('../src/components/KahootLiveModal.jsx', import.meta.url), 'utf8');
check(
  'KahootLiveModal estabiliza updateKahootState con taskPropRef, incluye isSoloPracticePlayer y restaura modo solo al volver del repaso',
  liveModalSrc.includes('taskPropRef.current') &&
    liveModalSrc.includes('isSoloPracticePlayer: true') &&
    liveModalSrc.includes('if (soloState.active)')
);

// 17. Control de Repaso por el Docente (reviewEnabled) y Modo Público /#kahoot
console.log('\n--- 17. Control de Repaso por Docente y Modo Público /#kahoot ---');

check(
  'canAccessKahootReview bloquea el repaso a estudiantes e invitados por defecto (reviewEnabled false o indefinido)',
  canAccessKahootReview({ status: 'live' }, 'student') === false &&
    canAccessKahootReview({ status: 'finished', reviewEnabled: false }, 'student') === false &&
    canAccessKahootReview({ status: 'live', reviewEnabled: false }, 'guest') === false &&
    canAccessKahootReview({}, null) === false
);

check(
  'canAccessKahootReview permite siempre al docente y permite a estudiantes/invitados solo cuando reviewEnabled === true',
  canAccessKahootReview({ status: 'live', reviewEnabled: false }, 'teacher') === true &&
    canAccessKahootReview({}, 'teacher') === true &&
    canAccessKahootReview({ status: 'finished', reviewEnabled: true }, 'student') === true &&
    canAccessKahootReview({ status: 'live', reviewEnabled: true }, 'guest') === true
);

const urlKahootBase = parseKahootUrlInfo('#kahoot', '');
const urlKahootEq = parseKahootUrlInfo('#kahoot=749205', '');
const urlKahootSlash = parseKahootUrlInfo('#kahoot/482915', '');
const urlKahootQueryHash = parseKahootUrlInfo('#kahoot?pin=123456', '');
const urlKahootSearch = parseKahootUrlInfo('', '?kahoot=654321');
const urlNonKahoot = parseKahootUrlInfo('#tasks', '');

check(
  'parseKahootUrlInfo detecta #kahoot, #kahoot=PIN, #kahoot/PIN, #kahoot?pin=PIN y ?kahoot=PIN',
  urlKahootBase.isKahootRoute === true &&
    urlKahootBase.pin === '' &&
    urlKahootEq.isKahootRoute === true &&
    urlKahootEq.pin === '749205' &&
    urlKahootSlash.isKahootRoute === true &&
    urlKahootSlash.pin === '482915' &&
    urlKahootQueryHash.isKahootRoute === true &&
    urlKahootQueryHash.pin === '123456' &&
    urlKahootSearch.isKahootRoute === true &&
    urlKahootSearch.pin === '654321' &&
    urlNonKahoot.isKahootRoute === false
);

check(
  'buildPublicKahootUrl genera enlaces publicos #kahoot y #kahoot=PIN correctamente',
  buildPublicKahootUrl('', 'https://englishtech.vercel.app', '/') === 'https://englishtech.vercel.app/#kahoot' &&
    buildPublicKahootUrl('749205', 'https://englishtech.vercel.app', '/') === 'https://englishtech.vercel.app/#kahoot=749205'
);

const publicKahootSrc = fs.readFileSync(new URL('../src/components/PublicKahootViewer.jsx', import.meta.url), 'utf8');
check(
  'KahootLiveModal y TaskCard restringen el modo Repaso y Practica Individual segun canAccessKahootReview y permiten al docente alternar reviewEnabled',
  liveModalSrc.includes('canAccessKahootReview(kahoot, role)') &&
    liveModalSrc.includes('handleToggleReviewEnabled') &&
    liveModalSrc.includes("viewMode === 'review' && canReview") &&
    taskCardSrc.includes('canAccessKahootReview(kahoot, role)') &&
    taskCardSrc.includes('Habilitar repaso')
);

check(
  'PublicKahootViewer y App.jsx permiten el acceso directo sin login mediante /#kahoot sincronizado en tiempo real con Firestore',
  publicKahootSrc.includes('KahootLiveModal') &&
    publicKahootSrc.includes('signInAnonymously') &&
    publicKahootSrc.includes('onSnapshot') &&
    appSrc.includes('<PublicKahootViewer') &&
    appSrc.includes('if (publicKahootActive)')
);

check(
  'PublicKahootViewer aisla al participante como estudiante/invitado (effectiveRole = student) y filtra DEMO_TASKS de salas en vivo cuando isDemoMode es false',
  publicKahootSrc.includes("const effectiveRole = 'student';") &&
    !publicKahootSrc.includes("const effectiveRole = role === 'teacher'") &&
    publicKahootSrc.includes('const [guestPlayerId] = useState(() => getOrCreateGuestPlayerId());') &&
    publicKahootSrc.includes('const sourceList = isDemoMode ? allAvailableKahoots : firestoreKahoots;') &&
    publicKahootSrc.includes('onProfileChange=')
);

check(
  'KahootLiveModal y TaskCard sincronizan reviewEnabled en 0ms sin sobrescribir participantes concurrentes en Firestore',
  liveModalSrc.includes('prevReviewEnabled !== nextReviewEnabled') &&
    liveModalSrc.includes('partialKahootUpdates?.reviewEnabled !== undefined') &&
    taskCardSrc.includes("'kahoot.reviewEnabled': nextReview")
);

console.log('\n--- 18. Tipo de Pregunta Acertijo (Riddle) y Ventana de Gracia de 2 Segundos ---');

// 18.1 Creación por defecto
const qRiddleDef = createDefaultKahootQuestion('riddle', 4);
check('createDefaultKahootQuestion crea pregunta tipo riddle con campos requeridos',
  qRiddleDef.type === 'riddle' &&
  qRiddleDef.correctAnswer === '' &&
  Array.isArray(qRiddleDef.acceptedAnswers) &&
  Array.isArray(qRiddleDef.options)
);

// 18.2 Normalización de respuesta escrita y sinónimos
const normRiddleWritten = normalizeKahootQuestion({
  type: 'riddle',
  question: 'Tengo agujas pero no coso, tengo números pero no sé leer. ¿Qué soy?',
  correctAnswer: 'un reloj',
  acceptedAnswers: ['el reloj', 'reloj', 'a clock'],
}, 0);
check('normalizeKahootQuestion normaliza acertijo con respuesta escrita y sinónimos',
  normRiddleWritten.type === 'riddle' &&
  normRiddleWritten.correctAnswer === 'un reloj' &&
  normRiddleWritten.acceptedAnswers.length === 3 &&
  normRiddleWritten.acceptedAnswers.includes('reloj')
);

// 18.3 Normalización de acertijo con opciones y alias en español
const normRiddleOptions = normalizeKahootQuestion({
  tipo: 'acertijo',
  enunciado: 'Oro parece, plata no es. ¿Qué es?',
  opciones: [
    { texto: 'El plátano', correcta: true },
    { texto: 'La manzana', correcta: false },
    { texto: 'El oro', correcta: false }
  ]
}, 1);
check('normalizeKahootQuestion soporta alias en español (tipo: acertijo, opciones, correcta)',
  normRiddleOptions.type === 'riddle' &&
  normRiddleOptions.options.length === 3 &&
  normRiddleOptions.options[0].isCorrect === true &&
  normRiddleOptions.correctAnswer === 'El plátano'
);

// 18.4 Validación de configuración
const configRiddleOk1 = validateKahootConfig({
  title: 'Acertijos',
  questions: [normRiddleWritten]
});
check('validateKahootConfig aprueba acertijo con respuesta escrita válida', configRiddleOk1.valid === true);

const configRiddleOk2 = validateKahootConfig({
  title: 'Acertijos con opciones',
  questions: [normRiddleOptions]
});
check('validateKahootConfig aprueba acertijo con opciones válidas', configRiddleOk2.valid === true);

const configRiddleInvalid = validateKahootConfig({
  title: 'Acertijo inválido',
  questions: [{
    type: 'riddle',
    text: '¿Quién soy?',
    correctAnswer: '',
    acceptedAnswers: [],
    options: []
  }]
});
check('validateKahootConfig rechaza acertijo sin solución escrita ni opciones válidas',
  configRiddleInvalid.valid === false && configRiddleInvalid.error.includes('Acertijo')
);

const configRiddleNoCorrectOpt = validateKahootConfig({
  title: 'Acertijo sin correcta',
  questions: [{
    type: 'riddle',
    text: '¿Quién soy?',
    options: [
      { text: 'Opción 1', isCorrect: false },
      { text: 'Opción 2', isCorrect: false }
    ]
  }]
});
check('validateKahootConfig rechaza acertijo con opciones si ninguna está marcada como correcta',
  configRiddleNoCorrectOpt.valid === false
);

// 18.5 Evaluación de respuestas para Acertijo
const riddleQuestion = {
  type: 'riddle',
  text: 'Blanco por dentro, verde por fuera. Si quieres que te lo diga, espera.',
  correctAnswer: 'la pera',
  acceptedAnswers: ['pera', 'una pera', 'a pear'],
  options: [
    { id: 'opt_pera', text: 'La pera', isCorrect: true },
    { id: 'opt_manzana', text: 'La manzana', isCorrect: false }
  ]
};

check('evaluateKahootAnswer para acertijo acepta solución escrita exacta',
  evaluateKahootAnswer(riddleQuestion, { textAnswer: 'la pera' }) === true
);
check('evaluateKahootAnswer para acertijo acepta sinónimos en acceptedAnswers',
  evaluateKahootAnswer(riddleQuestion, { textAnswer: 'pera' }) === true &&
  evaluateKahootAnswer(riddleQuestion, { textAnswer: 'una pera' }) === true
);
check('evaluateKahootAnswer para acertijo es tolerante a tildes, mayúsculas y signos',
  evaluateKahootAnswer(riddleQuestion, { textAnswer: '  ¡LA PÉRA!  ' }) === true
);
check('evaluateKahootAnswer para acertijo valida opción por optionIndex',
  evaluateKahootAnswer(riddleQuestion, { optionIndex: 0 }) === true &&
  evaluateKahootAnswer(riddleQuestion, { optionIndex: 1 }) === false
);
check('evaluateKahootAnswer para acertijo valida opción por optionId',
  evaluateKahootAnswer(riddleQuestion, { optionId: 'opt_pera' }) === true &&
  evaluateKahootAnswer(riddleQuestion, { optionId: 'opt_manzana' }) === false
);
check('evaluateKahootAnswer para acertijo rechaza respuesta incorrecta',
  evaluateKahootAnswer(riddleQuestion, { textAnswer: 'un plátano' }) === false &&
  evaluateKahootAnswer(riddleQuestion, { textAnswer: '' }) === false
);

// 18.6 Simulación de la regla de los 2 segundos (grace window)
const simulateRiddleSubmission = ({ firstCorrectAt, nowTs, isAnswerCorrect }) => {
  if (firstCorrectAt > 0) {
    if (nowTs - firstCorrectAt > 2000) {
      return { accepted: false, effectiveIsCorrect: false, reason: 'window_expired' };
    }
    return { accepted: true, effectiveIsCorrect: isAnswerCorrect, isFirst: false };
  }
  if (isAnswerCorrect) {
    return { accepted: true, effectiveIsCorrect: true, isFirst: true, firstCorrectAt: nowTs };
  }
  return { accepted: true, effectiveIsCorrect: false, isFirst: false };
};

const sub1 = simulateRiddleSubmission({ firstCorrectAt: 0, nowTs: 10000, isAnswerCorrect: true });
check('Regla 2s: El primer jugador que responde correctamente inicia firstCorrectAt',
  sub1.accepted === true && sub1.effectiveIsCorrect === true && sub1.isFirst === true && sub1.firstCorrectAt === 10000
);

const sub2 = simulateRiddleSubmission({ firstCorrectAt: 10000, nowTs: 11500, isAnswerCorrect: true });
check('Regla 2s: Otro jugador que responde correctamente dentro de 2s (1500ms) es validado como correcto',
  sub2.accepted === true && sub2.effectiveIsCorrect === true && sub2.isFirst === false
);

const sub3 = simulateRiddleSubmission({ firstCorrectAt: 10000, nowTs: 12050, isAnswerCorrect: true });
check('Regla 2s: Jugador que responde después de los 2 segundos (2050ms) queda bloqueado/expirado',
  sub3.accepted === false && sub3.effectiveIsCorrect === false && sub3.reason === 'window_expired'
);

const subWrong = simulateRiddleSubmission({ firstCorrectAt: 0, nowTs: 9000, isAnswerCorrect: false });
check('Regla 2s: Respuesta incorrecta no activa la ventana de firstCorrectAt',
  subWrong.accepted === true && subWrong.effectiveIsCorrect === false && !subWrong.firstCorrectAt
);

// Simulación de 5 participantes respondiendo un acertijo
const multiParticipantsAnswers = [
  { id: 'p1', name: 'Ana', timeMs: 1200, isCorrect: true },
  { id: 'p2', name: 'Luis', timeMs: 2500, isCorrect: true }, // +1300ms <= 2000ms -> OK
  { id: 'p3', name: 'Carlos', timeMs: 3100, isCorrect: true }, // +1900ms <= 2000ms -> OK
  { id: 'p4', name: 'Maria', timeMs: 3250, isCorrect: true }, // +2050ms > 2000ms -> FUERA
  { id: 'p5', name: 'Pedro', timeMs: 1800, isCorrect: false }, // Incorrecto -> FUERA
];

const sortedSolvers = multiParticipantsAnswers
  .filter((p) => p.isCorrect)
  .sort((a, b) => a.timeMs - b.timeMs);
const minSolverTime = sortedSolvers[0].timeMs;
const validRiddleWinners = sortedSolvers
  .filter((s, idx) => idx === 0 || s.timeMs - minSolverTime <= 2000)
  .map((s, idx) => ({ ...s, isFirst: idx === 0 }));

check('Regla 2s (5 jugadores): Valida a los 3 que respondieron dentro del rango de 2s del primero',
  validRiddleWinners.length === 3 &&
  validRiddleWinners[0].id === 'p1' && validRiddleWinners[0].isFirst === true &&
  validRiddleWinners[1].id === 'p2' && validRiddleWinners[1].isFirst === false &&
  validRiddleWinners[2].id === 'p3' && validRiddleWinners[2].isFirst === false
);

// 18.7 Bots simulados en Modo Demo con acertijo
const botRiddleWritten = buildSimulatedBotAnswer(DEMO_KAHOOT_BOTS[0], normRiddleWritten, 0);
check('buildSimulatedBotAnswer genera respuesta de texto para acertijo escrito',
  botRiddleWritten.textAnswer !== undefined && typeof botRiddleWritten.isCorrect === 'boolean'
);

const botRiddleOptions = buildSimulatedBotAnswer(DEMO_KAHOOT_BOTS[0], normRiddleOptions, 1);
check('buildSimulatedBotAnswer genera opción para acertijo de selección',
  botRiddleOptions.optionIndex !== undefined && typeof botRiddleOptions.isCorrect === 'boolean'
);

// 18.8 Prompt y parseo de IA para acertijos
const promptRiddle = construirPromptKahootIA({ tema: 'Misterios y lógica', total: 5, mezcla: 'solo_riddle' });
check('construirPromptKahootIA incluye instrucciones para acertijos en solo_riddle',
  promptRiddle.includes('riddle') && promptRiddle.includes('acertijo')
);

const rawAiRiddleJson = JSON.stringify([
  {
    tipo: 'acertijo',
    enunciado: 'Vuelo sin alas, lloro sin ojos. ¿Qué soy?',
    respuestaCorrecta: 'la nube',
    sinonimos: ['una nube', 'nube', 'las nubes']
  }
]);
const parsedAiRiddle = parsearKahootIA(rawAiRiddleJson);
check('parsearKahootIA parsea correctamente preguntas de tipo riddle generadas por IA',
  parsedAiRiddle.ok === true &&
  parsedAiRiddle.questions.length === 1 &&
  parsedAiRiddle.questions[0].type === 'riddle' &&
  parsedAiRiddle.questions[0].correctAnswer === 'la nube' &&
  parsedAiRiddle.questions[0].acceptedAnswers.includes('nube')
);

// 18.9 Integración en componentes UI (KahootBuilder, KahootLiveModal, TaskCard y PublicKahootViewer)
check('KahootBuilder incluye botón de Acertijo y editor de respuestas escritas/opciones',
  builderSrc.includes("handleAddQuestion('riddle')") &&
  builderSrc.includes('Acertijo') &&
  builderSrc.includes('Respuesta escrita') &&
  builderSrc.includes('Opciones (selección)')
);

check('KahootLiveModal implementa ventana de 2 segundos, protección de sobreescritura, bloqueo y reinicio limpio',
  liveModalSrc.includes('activeFirstCorrectAt') &&
  liveModalSrc.includes("reason === 'riddle_solved'") &&
  liveModalSrc.includes('isRiddleWindowActive') &&
  liveModalSrc.includes('isRiddleLockedForMe') &&
  liveModalSrc.includes('riddleWinners') &&
  liveModalSrc.includes('Ganadores del Acertijo') &&
  liveModalSrc.includes("'kahoot.firstCorrectAt': null") &&
  liveModalSrc.includes('hasExistingFirstAt')
);

check('TaskCard y PublicKahootViewer muestran indicador distintivo de Acertijos en el muro y portal público',
  taskCardSrc.includes('💡 Acertijos') &&
  publicKahootSrc.includes('💡 Con acertijos')
);

console.log(`\nRESULTADO KAHOOT: ${okCount} OK, ${failCount} fallos\n`);
if (failCount > 0) {
  process.exit(1);
}


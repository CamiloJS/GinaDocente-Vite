// scripts/test-ai-assistant.mjs
import assert from 'node:assert/strict';
import {
  parseAiResponse,
  detectNaturalLanguageIntent,
  evaluateMathExpression,
  parseTimerDurationSeconds,
  computePendingGradingReport,
  getHumanResponseCount,
  pickHumanBasicResponse,
  tryLocalFastAction,
  getWelcomeQuickReplies,
  buildTeacherAssistantPrompt,
  buildTeacherAssistantRequest,
  executeTeacherAssistantAction,
  executeTeacherAssistantActionRich
} from '../src/utils/aiTeacherAssistantEngine.js';

console.log('🧪 Iniciando pruebas de Asistente IA Docente...\n');

// 1. Detección de bloques JSON en Markdown
{
  const markdownJson = "¡Claro profe! Aquí tienes la acción:\n```json\n{\n  \"action\": \"set_theme\",\n  \"params\": { \"theme\": \"dim\" },\n  \"response\": \"Modo oscuro activado.\"\n}\n```\nEspero te sirva.";
  const parsed = parseAiResponse(markdownJson);
  assert.equal(parsed.isAction, true, 'Debe detectar JSON dentro de markdown');
  assert.equal(parsed.action, 'set_theme');
  assert.equal(parsed.params.theme, 'dim');
  console.log('✔ Caso 1 superado: Extracción de JSON en bloques Markdown ```json');
}

// 2. Detección de JSON puro o embebido
{
  const embeddedJson = "Procesando: {\"action\": \"open_floating_tool\", \"params\": {\"tool\": \"calculator\"}, \"response\": \"Calculadora abierta.\"} listo.";
  const parsed = parseAiResponse(embeddedJson);
  assert.equal(parsed.isAction, true, 'Debe detectar JSON embebido');
  assert.equal(parsed.action, 'open_floating_tool');
  assert.equal(parsed.params.tool, 'calculator');
  console.log('✔ Caso 2 superado: Extracción de JSON embebido entre texto');
}

// 3. Fallback inteligente de lenguaje natural
{
  const naturalInputs = [
    { text: 'por favor abre la calculadora flotante', action: 'open_floating_tool', tool: 'calculator' },
    { text: 'quiero el temporizador en ventana flotante', action: 'open_floating_tool', tool: 'timer' },
    { text: 'lanza la moneda', action: 'open_floating_tool', tool: 'coin' },
    { text: 'cierra las herramientas flotantes', action: 'close_floating_tool' },
    { text: 'activa el modo oscuro', action: 'set_theme', theme: 'dim' },
    { text: 'pon modo claro', action: 'set_theme', theme: 'light' },
    { text: 'modo lights out por favor', action: 'set_theme', theme: 'lights_out' },
    { text: 'silencia los sonidos de la plataforma', action: 'set_sound', enabled: false },
    { text: 've a la pestaña de notas', action: 'navigate_tab', tab: 'notes' },
    { text: 'abre el directorio de estudiantes', action: 'navigate_tab', tab: 'directory' },
    { text: '¿cuántas entregas pendientes tengo por calificar?', action: 'pending_submissions' },
    { text: 'muéstrame los estudiantes en riesgo', action: 'students_at_risk' }
  ];

  for (const item of naturalInputs) {
    const res = parseAiResponse(item.text);
    assert.equal(res.isAction, true, `Debe detectar acción para: "${item.text}"`);
    assert.equal(res.action, item.action, `Acción incorrecta para "${item.text}"`);
    if (item.tool) assert.equal(res.params.tool, item.tool);
    if (item.theme) assert.equal(res.params.theme, item.theme);
    if (item.tab) assert.equal(res.params.tab, item.tab);
    if (item.enabled !== undefined) assert.equal(res.params.enabled, item.enabled);
  }
  console.log(`✔ Caso 3 superado: ${naturalInputs.length} variantes de Lenguaje Natural en español reconocidas.`);
}

// 4. Prompt builder
{
  const prompt = buildTeacherAssistantPrompt({
    teacherName: 'Camilo',
    nowString: 'Lunes 26 de Octubre de 2026',
    students: [{ fullName: 'Carlos Pérez', role: 'student' }],
    tasks: [{ title: 'Tarea 1', targetGroupName: 'A1' }],
    evaluations: [{ title: 'Parcial 1', dueDate: '2026-11-01', isArchived: false }],
    academicGroups: [{ name: 'Grupo A1', id: 'grp-1', members: ['u1'] }],
    syllabus: [{ week: 1, topic: 'Present Simple' }],
    grades: [{ score: 4.5, studentName: 'Carlos Pérez' }],
    history: [],
    userMessage: 'Crea una tarea sobre Present Perfect'
  });

  assert.ok(prompt.includes('Camilo'), 'El prompt debe incluir el nombre del docente');
  assert.ok(prompt.includes('CATÁLOGO COMPLETO DE ACCIONES'), 'El prompt debe incluir el catálogo de acciones');
  assert.ok(prompt.includes('Crea una tarea sobre Present Perfect'), 'El prompt debe incluir la consulta del usuario');
  console.log('✔ Caso 4 superado: Generador de contexto y prompt para Gemini');
}

// 5. Ejecución real de acciones (executeTeacherAssistantAction)
{
  let openedTool = null;
  let activeTab = null;
  let themeSet = null;
  let soundSet = null;
  let createdNotes = [];
  let publishedTasks = [];

  const mockContext = {
    setThemeMode: (m) => { themeSet = m; },
    setSoundEnabled: (s) => { soundSet = s; },
    soundEnabledRef: { current: true },
    setPushEnabled: () => {},
    togglePushNotifications: () => {},
    handleLogout: () => {},
    changeTab: (tab) => { activeTab = tab; },
    openFloatingTool: (tool) => { openedTool = tool; },
    closeFloatingTool: () => {},
    setMinimizedFloatingTools: () => {},
    academicGroups: [{ id: 'grp-1', name: 'Inglés B1' }],
    tasks: [],
    setTasks: (updater) => {
      const res = typeof updater === 'function' ? updater([]) : updater;
      publishedTasks = res;
    },
    evaluations: [],
    setEvaluations: () => {},
    grades: [{ score: 2.5, studentName: 'Juan' }, { score: 4.8, studentName: 'Laura' }],
    rawNotes: [],
    setRawNotes: (updater) => {
      const res = typeof updater === 'function' ? updater([]) : updater;
      createdNotes = res;
    },
    syllabus: [{ week: 1, topic: 'Greetings' }],
    userMappings: { u1: { fullName: 'Juan', role: 'student' }, u2: { fullName: 'Laura', role: 'student' } },
    myChatId: 'teacher-camilo',
    loggedInName: 'Camilo Docente',
    role: 'teacher',
    db: {},
    appId: 'test-app',
    isDemoMode: true,
    saveDemoSandboxItem: () => {},
    removeDemoSandboxItem: () => {},
    setTaskTitle: () => {},
    setTaskDesc: () => {},
    setPostTargetGroup: () => {},
    setIsFormExpanded: () => {},
    setIsCreatingEval: () => {},
    setEvalFormData: () => {},
    setChatGroups: () => {},
    callGemini: async () => 'Respuesta IA',
    showMessage: () => {},
    confirmAction: () => {},
    addDoc: async () => ({ id: 'doc-1' }),
    setDoc: async () => {},
    doc: () => {},
    collection: () => {},
    toggleArchiveEvaluation: async () => {},
    deleteAllStorageFilesInObject: async () => {},
    deleteDoc: async () => {}
  };

  // Test abrir calculadora
  await executeTeacherAssistantAction({ action: 'open_floating_tool', params: { tool: 'calculator' } }, mockContext);
  assert.equal(openedTool, 'calculator', 'Debe abrir la calculadora');

  // Test cambiar pestaña
  await executeTeacherAssistantAction({ action: 'navigate_tab', params: { tab: 'evaluations' } }, mockContext);
  assert.equal(activeTab, 'evaluations', 'Debe navegar a evaluations');

  // Test cambiar tema
  await executeTeacherAssistantAction({ action: 'set_theme', params: { theme: 'lights_out' } }, mockContext);
  assert.equal(themeSet, 'lights_out', 'Debe cambiar tema a lights_out');

  // Test crear nota
  await executeTeacherAssistantAction({
    action: 'create_note',
    params: { title: 'Recordatorio reunión', content: 'Viernes 3pm', scope: 'private', format: 'sticky' }
  }, mockContext);
  assert.equal(createdNotes.length, 1, 'Debe haber creado 1 nota');
  assert.equal(createdNotes[0].title, 'Recordatorio reunión');

  // Test publicar tarea
  await executeTeacherAssistantAction({
    action: 'publish_task',
    params: { title: 'Ensayo B1', description: 'Escribir 200 palabras', targetGroupName: 'Inglés B1' }
  }, mockContext);
  assert.equal(publishedTasks.length, 1, 'Debe haber publicado la tarea');
  assert.equal(publishedTasks[0].title, 'Ensayo B1');
  assert.equal(publishedTasks[0].targetGroupId, 'grp-1');

  // Test estudiantes en riesgo
  const riskReply = await executeTeacherAssistantAction({ action: 'students_at_risk', params: {} }, mockContext);
  assert.ok(riskReply.includes('Juan'), 'Debe reportar a Juan en riesgo');

  // Test cuadro de honor (top students)
  const topReply = await executeTeacherAssistantAction({ action: 'top_students', params: {} }, mockContext);
  assert.ok(topReply.includes('Laura'), 'Debe reportar a Laura en el top');

  console.log('✔ Caso 5 superado: Despachador de acciones ejecuta herramientas, notas, tareas, temas y reportes con éxito.');
}

// 6. Regresión de saludo ("hola" NO debe disparar pendientes por calificar)
{
  assert.equal(detectNaturalLanguageIntent('hola'), null, 'Un saludo simple no debe disparar acciones');
  assert.equal(detectNaturalLanguageIntent('Buenas tardes'), null, 'Un saludo cordial no debe disparar acciones');

  const proseFromAi = '¡Hola profe! ¿Cómo vas hoy? Si necesitas revisar entregas pendientes por calificar, solo dime.';
  const parsedFromAi = parseAiResponse(proseFromAi, { fromAi: true });
  assert.equal(parsedFromAi.isAction, false, 'La prosa libre de IA mencionando palabras clave no debe secuestrar la conversación');
  assert.equal(parsedFromAi.messages.length, 1);

  const greetingJson = '```json\n{\n  "action": null,\n  "messages": ["¡Hola profe Gina! Qué alegría saludarte.", "¿En qué te colaboro hoy en English TECH?"],\n  "quickReplies": [{ "label": "Revisar pendientes", "value": "Revisa qué tengo pendiente" }]\n}\n```';
  const parsedGreeting = parseAiResponse(greetingJson, { fromAi: true });
  assert.equal(parsedGreeting.isAction, false, 'action: null no es una acción ejecutable');
  assert.equal(parsedGreeting.messages.length, 2, 'Debe conservar múltiples mensajes humanos');
  assert.equal(parsedGreeting.quickReplies.length, 1, 'Debe conservar quickReplies');
  console.log('✔ Caso 6 superado: Regresión de saludos y respuestas multi-mensaje con botones.');
}

// 7. Evaluador aritmético seguro + calculate_and_open + flip_coin
{
  const m1 = evaluateMathExpression('cuánto es 45 por 12');
  assert.equal(m1.ok, true);
  assert.equal(m1.result, 540);

  const m2 = evaluateMathExpression('divide 380 entre 4');
  assert.equal(m2.ok, true);
  assert.equal(m2.result, 95);

  const m3 = evaluateMathExpression('(15 + 5) * 3');
  assert.equal(m3.ok, true);
  assert.equal(m3.result, 60);

  const mZero = evaluateMathExpression('10 dividido entre 0');
  assert.equal(mZero.ok, false);

  let openedTool = null;
  const calcRes = await executeTeacherAssistantActionRich(
    { action: 'calculate_and_open', params: { expression: '45 por 12' } },
    { openFloatingTool: (t) => { openedTool = t; } }
  );
  assert.equal(openedTool, 'calculator');
  assert.equal(calcRes.widget?.type, 'calculator');
  assert.equal(calcRes.widget?.result, '540');

  const coinRes = await executeTeacherAssistantActionRich(
    { action: 'flip_coin', params: {} },
    { openFloatingTool: () => {} }
  );
  assert.equal(coinRes.widget?.type, 'coin');
  assert.ok(['heads', 'tails'].includes(coinRes.widget?.side));
  console.log('✔ Caso 7 superado: Calculadora en chat + flotante y lanzamiento de moneda inline.');
}

// 8. Escáner real de pendientes por calificar (Tareas, Foros, Evaluaciones y Sugerencias)
{
  const report = computePendingGradingReport({
    tasks: [
      {
        id: 't1',
        type: 'task',
        title: 'Taller Past Simple',
        targetGroupName: 'Inglés B1',
        comments: [
          { authorId: 'est-1', author: 'Carlos', text: 'Aquí mi entrega' },
          { authorId: 'est-2', author: 'María', text: 'Entrega 2', grade: 4.5 },
          { authorId: 'ginadocente', authorRole: 'teacher', author: 'Gina Marcela Quintana Delgado', text: 'Revisen' }
        ]
      }
    ],
    evaluations: [
      {
        id: 'ev1',
        title: 'Speaking Midterm',
        targetGroupName: 'Inglés B1',
        isArchived: false,
        questions: [{ type: 'speaking', text: 'Introduce yourself' }]
      }
    ],
    grades: [
      { id: 'g1', evaluationId: 'ev1', studentName: 'Carlos', score: 0, teacherFeedback: '' },
      { id: 'g2', evaluationId: 'ev1', studentName: 'María', score: 4.8, teacherFeedback: 'Great pronunciation!' }
    ],
    suggestions: [{ id: 's1', read: false }, { id: 's2', read: true }]
  });

  assert.equal(report.totalTaskSubmissions, 1, 'Debe detectar 1 entrega pendiente en tarea (ignorando docente y ya calificados)');
  assert.equal(report.totalEvalPending, 1, 'Debe detectar 1 evaluación con pregunta abierta sin feedback');
  assert.equal(report.unreadSuggestions, 1, 'Debe detectar 1 sugerencia sin leer');

  const pendingActionRes = await executeTeacherAssistantActionRich(
    { action: 'pending_submissions', params: {} },
    {
      tasks: [{ id: 't1', type: 'task', title: 'Taller Past Simple', targetGroupName: 'Inglés B1', comments: [{ authorId: 'est-1', author: 'Carlos', text: 'Entrega' }] }],
      evaluations: [{ id: 'ev1', title: 'Speaking Midterm', targetGroupName: 'Inglés B1', isArchived: false, questions: [{ type: 'speaking' }] }],
      grades: [{ id: 'g1', evaluationId: 'ev1', studentName: 'Carlos', teacherFeedback: '' }],
      suggestions: []
    }
  );
  assert.ok(pendingActionRes.text.includes('Taller Past Simple'));
  assert.ok(pendingActionRes.text.includes('Speaking Midterm'));
  console.log('✔ Caso 8 superado: Escáner real de pendientes en tareas, foros y evaluaciones.');
}

// 9. Flujos guiados de Encuesta, Evaluación IA, Sílabo PDF, Diapositivas, Vídeos y Libros
{
  let tab = null;
  let evalModal = false;
  let pdfModal = false;
  let evalData = null;
  let published = [];
  const ctx = {
    academicGroups: [{ id: 'grp-1', name: 'TIC Y LENGUAS EXTRANJERAS' }],
    changeTab: (t) => { tab = t; },
    setIsCreatingEval: () => {},
    setEvalFormData: (d) => { evalData = d; },
    setShowAiEvalModal: (v) => { evalModal = v; },
    setShowPdfSyllabusModal: (v) => { pdfModal = v; },
    setSyllabusPdfTargetGroup: () => {},
    setTasks: (updater) => { published = typeof updater === 'function' ? updater([]) : updater; },
    isDemoMode: true,
    saveDemoSandboxItem: () => {},
    showMessage: () => {},
    myChatId: 'ginadocente',
    loggedInName: 'Gina Docente',
    role: 'teacher'
  };

  await executeTeacherAssistantActionRich({ action: 'open_create_eval', params: { mode: 'ai', targetGroupName: 'TIC Y LENGUAS EXTRANJERAS' } }, ctx);
  assert.equal(tab, 'evaluations');
  assert.equal(evalModal, true);
  assert.equal(evalData.targetGroupId, 'grp-1');

  await executeTeacherAssistantActionRich({ action: 'open_syllabus_pdf', params: { targetGroupName: 'TIC' } }, ctx);
  assert.equal(tab, 'syllabus');
  assert.equal(pdfModal, true);

  await executeTeacherAssistantActionRich({ action: 'open_slides_studio', params: {} }, ctx);
  assert.equal(tab, 'reviews');

  await executeTeacherAssistantActionRich({ action: 'open_videos_module', params: {} }, ctx);
  assert.equal(tab, 'videos');

  await executeTeacherAssistantActionRich({ action: 'open_book_creator', params: {} }, ctx);
  assert.equal(tab, 'books');

  await executeTeacherAssistantActionRich({ action: 'publish_poll', params: { title: '¿Horario preferido?', options: ['Mañana', 'Tarde'], targetGroupName: 'TIC Y LENGUAS EXTRANJERAS' } }, ctx);
  assert.equal(tab, 'tasks');
  assert.equal(published.length, 1);
  assert.equal(published[0].type, 'poll');
  assert.equal(published[0].poll.options.length, 2);
  assert.equal(published[0].targetGroupId, 'grp-1');

  const welcomeChips = getWelcomeQuickReplies(ctx.academicGroups);
  assert.ok(welcomeChips.length >= 4);
  console.log('✔ Caso 9 superado: Flujos de Encuesta, Evaluación IA, Sílabo, Diapositivas, Vídeos y Libros.');
}

// 10. Regresión crítica: Reportes NUNCA deben quedar tapados por frases de espera de Gemini
{
  const pendingRes = await executeTeacherAssistantActionRich(
    {
      action: 'pending_submissions',
      params: {},
      messages: ['¡De una, Gina! Ya mismo reviso...', 'Dame un segundito y te muestro el detalle.']
    },
    {
      tasks: [{ id: 't1', type: 'task', title: 'Ensayo B1', targetGroupName: 'TIC', comments: [{ authorId: 'est-1', author: 'Luis', text: 'Listo' }] }],
      evaluations: [],
      grades: [],
      suggestions: []
    }
  );
  assert.ok(!pendingRes.text.includes('Dame un segundito'), 'No debe devolver la frase de relleno');
  assert.ok(pendingRes.text.includes('Ensayo B1'), 'Debe mostrar los datos reales del escáner');

  const gradeRes = await executeTeacherAssistantActionRich(
    {
      action: 'grade_report',
      params: {},
      messages: ['¡Claro, Gina! Aquí tienes el reporte de notas actualizado.', '¿Te gustaría ver más?']
    },
    {
      grades: [{ score: 4.0, studentName: 'Ana' }, { score: 5.0, studentName: 'Pedro' }]
    }
  );
  assert.ok(gradeRes.text.includes('4.5/5.0'), 'Debe mostrar el promedio real calculado');
  console.log('✔ Caso 10 superado: Regresión crítica de reportes reales sin sobrescritura de frases placeholder.');
}

// 11. Temporizador con duración exacta (3 minutos con 13 segundos = 193s)
{
  assert.equal(parseTimerDurationSeconds('necesito que me haga un temporizador de 3 minutos con 13 segundos'), 193);
  assert.equal(parseTimerDurationSeconds('temporizador de 45 segundos'), 45);
  assert.equal(parseTimerDurationSeconds('pon un timer 2:30'), 150);
  assert.equal(parseTimerDurationSeconds('1 hora y 5 minutos'), 3900);

  let openedTool = null;
  const timerRes = await executeTeacherAssistantActionRich(
    { action: 'open_floating_tool', params: { tool: 'timer', durationText: '3 minutos con 13 segundos' } },
    { openFloatingTool: (t) => { openedTool = t; } }
  );
  assert.equal(openedTool, 'timer');
  assert.ok(timerRes.text.includes('03:13'), 'Debe confirmar la duración exacta 03:13');
  console.log('✔ Caso 11 superado: Parser exacto de duración de temporizador y confirmación real.');
}

// 12. Enrutador local 0-tokens vs preguntas compuestas hacia Gemini
{
  const groups = [{ id: 'g1', name: 'TIC Y LENGUAS' }];
  assert.equal(tryLocalFastAction('¿Qué tengo pendiente por calificar?', groups)?.action, 'pending_submissions');
  assert.equal(tryLocalFastAction('Muéstrame el reporte de notas', groups)?.action, 'grade_report');
  const timerFast = tryLocalFastAction('necesito que me haga un temporizador de 3 minutos con 13 segundos', groups);
  assert.equal(timerFast?.action, 'open_floating_tool');
  assert.equal(timerFast?.params?.totalSeconds, 193);
  assert.equal(tryLocalFastAction('tira la moneda', groups)?.action, 'flip_coin');
  assert.equal(tryLocalFastAction('cuánto es 45 por 12', groups)?.action, 'calculate_and_open');
  const greetingFast = tryLocalFastAction('hola', groups, 'Gina');
  assert.equal(greetingFast?.isAction, false);
  assert.ok(greetingFast?.quickReplies?.length >= 4);

  // Pregunta compuesta/abierta debe devolver null para ir a Gemini
  assert.equal(tryLocalFastAction('que puedes hacer? puedes ponerme el modo claro?', groups), null);
  console.log('✔ Caso 12 superado: Enrutador rápido de 0 tokens y derivación correcta de preguntas compuestas.');
}

// 13. Separación cacheable systemInstruction / promptText y compacidad
{
  const req = buildTeacherAssistantRequest({
    teacherName: 'Gina',
    nowString: 'Martes 24 Nov 2026',
    academicGroups: [{ id: 'g1', name: 'TIC' }],
    history: Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'bot' : 'user', text: `Mensaje ${i}` })),
    userMessage: '¿Qué actividades sugieres para B1?'
  });
  assert.ok(!req.systemInstruction.includes('Martes 24 Nov 2026'), 'systemInstruction debe ser 100% estático sin fecha para caché implícita');
  assert.ok(!req.systemInstruction.includes('¿Qué actividades sugieres'), 'systemInstruction no debe contener el mensaje del usuario');
  assert.ok(req.promptText.includes('¿Qué actividades sugieres para B1?'));
  assert.ok(!req.promptText.includes('Mensaje 0\n'), 'promptText debe recortar historial a los últimos 6 turnos');
  console.log('✔ Caso 13 superado: Prompt separado en systemInstruction estático cacheable y contexto compacto.');
}

// 14. Banco de 200+ variaciones humanas profesionales por interacción básica y derivación de tareas a IA
{
  const categories = ['greeting', 'how_are_you', 'thanks', 'farewell', 'ack'];
  for (const cat of categories) {
    assert.ok(getHumanResponseCount(cat) >= 200, `La categoría ${cat} debe tener al menos 200 combinaciones distintas`);
  }

  const groups = [{ id: 'g1', name: 'TIC' }];
  const greetRes = tryLocalFastAction('hola', groups, 'Gina');
  const howAreYouRes = tryLocalFastAction('cómo estás', groups, 'Gina');
  const thanksRes = tryLocalFastAction('muchas gracias', groups, 'Gina');
  const byeRes = tryLocalFastAction('hasta luego', groups, 'Gina');
  const ackRes = tryLocalFastAction('perfecto', groups, 'Gina');

  assert.equal(greetRes?.humanCategory, 'greeting');
  assert.equal(howAreYouRes?.humanCategory, 'how_are_you');
  assert.equal(thanksRes?.humanCategory, 'thanks');
  assert.equal(byeRes?.humanCategory, 'farewell');
  assert.equal(ackRes?.humanCategory, 'ack');
  assert.ok(greetRes.humanDelayMs >= 900 && howAreYouRes.humanDelayMs >= 900, 'Las interacciones básicas deben incluir demora humana >=900ms');

  // Verificar que "cómo estás" no responde con la misma frase de saludo
  assert.notEqual(greetRes.messages[0], howAreYouRes.messages[0]);

  // Verificar variedad anti-repetición en 10 saludos consecutivos
  const samples = new Set();
  for (let i = 0; i < 10; i++) {
    samples.add(pickHumanBasicResponse('thanks', 'Gina').messages.join('|'));
  }
  assert.equal(samples.size, 10, 'No debe repetir respuestas seguidas en agradecimientos');

  // Tareas y solicitudes creativas deben ir siempre a Gemini (null en tryLocalFastAction)
  assert.equal(tryLocalFastAction('Crea una tarea sobre Present Perfect para TIC', groups, 'Gina'), null);
  console.log('✔ Caso 14 superado: 256 combinaciones por cada interacción básica, demora humana y envío de tareas a Gemini.');
}

console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL ASISTENTE CON IA PASARON SATISFACTORIAMENTE!');

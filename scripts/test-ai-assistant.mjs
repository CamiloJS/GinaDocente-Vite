// scripts/test-ai-assistant.mjs
import assert from 'node:assert/strict';
import {
  parseAiResponse,
  detectNaturalLanguageIntent,
  evaluateMathExpression,
  computePendingGradingReport,
  getWelcomeQuickReplies,
  buildTeacherAssistantPrompt,
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

console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL ASISTENTE CON IA PASARON SATISFACTORIAMENTE!');

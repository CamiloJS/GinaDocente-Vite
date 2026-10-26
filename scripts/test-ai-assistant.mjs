// scripts/test-ai-assistant.mjs
import assert from 'node:assert/strict';
import {
  parseAiResponse,
  detectNaturalLanguageIntent,
  buildTeacherAssistantPrompt,
  executeTeacherAssistantAction
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

console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL ASISTENTE CON IA PASARON SATISFACTORIAMENTE!');

// src/utils/aiTeacherAssistantEngine.js
// Motor integral del Asistente con IA para English TECH
// Permite al docente configurar, navegar, consultar, publicar y gestionar TODO en la plataforma.

/**
 * 1. Extractor y limpiador universal de JSON proveniente de la IA
 * Soporta respuestas en bloque Markdown (```json ... ```), JSON directo,
 * JSON embebido en texto libre o detección por fallback de lenguaje natural.
 */
export function parseAiResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { isAction: false, text: '' };
  }

  const clean = rawText.trim();

  // Caso A: Bloque de código Markdown ```json ... ```
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed && (parsed.action || parsed.actions)) {
        return { isAction: true, ...parsed, originalText: rawText };
      }
    } catch (e) {}
  }

  // Caso B: JSON puro en la raíz
  try {
    const parsed = JSON.parse(clean);
    if (parsed && (parsed.action || parsed.actions)) {
      return { isAction: true, ...parsed, originalText: rawText };
    }
  } catch (e) {}

  // Caso C: Buscar el primer '{' y el último '}'
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose > firstOpen) {
    try {
      const candidate = clean.slice(firstOpen, lastClose + 1);
      const parsed = JSON.parse(candidate);
      if (parsed && (parsed.action || parsed.actions)) {
        return { isAction: true, ...parsed, originalText: rawText };
      }
    } catch (e) {}
  }

  // Caso D: Fallback heurístico inteligente por lenguaje natural en español
  const fallbackIntent = detectNaturalLanguageIntent(clean);
  if (fallbackIntent) {
    return { isAction: true, ...fallbackIntent, originalText: rawText };
  }

  // Texto conversacional sin acción
  return {
    isAction: false,
    text: clean.replace(/\*\*/g, '').replace(/\*/g, '')
  };
}

/**
 * 2. Reconocimiento de intenciones directas por Lenguaje Natural
 * Detecta órdenes comunes de configuración, navegación y herramientas aunque la IA responda en prosa.
 */
export function detectNaturalLanguageIntent(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // --- TEMA Y APARIENCIA ---
  if (lower.match(/lights?\s*out|negro\s*puro|amoled/)) {
    return { action: 'set_theme', params: { theme: 'lights_out' }, response: 'Modo Lights Out (negro puro) activado.' };
  }
  if (lower.match(/modo\s*oscuro|dark\s*mode|tema\s*oscuro/) && !lower.match(/desactiv|apag|quitar|claro/)) {
    return { action: 'set_theme', params: { theme: 'dim' }, response: 'Modo oscuro activado.' };
  }
  if (lower.match(/modo\s*claro|tema\s*claro|light\s*mode/) && !lower.match(/desactiv|apag|oscuro/)) {
    return { action: 'set_theme', params: { theme: 'light' }, response: 'Modo claro activado.' };
  }

  // --- SONIDOS ---
  if (lower.match(/sonido|audio/) && lower.match(/desactiv|apag|silenc|off|mute|quitar/)) {
    return { action: 'set_sound', params: { enabled: false }, response: 'Efectos de sonido silenciados.' };
  }
  if (lower.match(/sonido|audio/) && lower.match(/activ|encend|on|poner|habilitar/)) {
    return { action: 'set_sound', params: { enabled: true }, response: 'Efectos de sonido activados.' };
  }

  // --- NOTIFICACIONES PUSH ---
  if (lower.match(/notif|push/) && lower.match(/desactiv|apag|off|quitar/)) {
    return { action: 'set_notifications', params: { enabled: false }, response: 'Notificaciones push desactivadas.' };
  }
  if (lower.match(/notif|push/) && lower.match(/activ|encend|on|habilitar/)) {
    return { action: 'set_notifications', params: { enabled: true }, response: 'Notificaciones push configuradas.' };
  }

  // --- HERRAMIENTAS FLOTANTES ---
  if (lower.match(/calculadora/) && !lower.match(/cerrar|ocultar|quitar/)) {
    return { action: 'open_floating_tool', params: { tool: 'calculator' }, response: 'Abriendo la Calculadora en ventana flotante.' };
  }
  if (lower.match(/temporizador|cronometro|cronómetro|timer/) && !lower.match(/cerrar|ocultar|quitar/)) {
    return { action: 'open_floating_tool', params: { tool: 'timer' }, response: 'Abriendo el Temporizador en ventana flotante.' };
  }
  if (lower.match(/moneda|cara\s*o\s*sello|cara\s*o\s*cruz|lanzar\s*moneda/) && !lower.match(/cerrar|ocultar|quitar/)) {
    return { action: 'open_floating_tool', params: { tool: 'coin' }, response: 'Abriendo la Moneda 3D en ventana flotante.' };
  }
  if (lower.match(/cerrar|cierra|quita|quitar|oculta|ocultar/) && lower.match(/herramienta|flotante|ventana/)) {
    return { action: 'close_floating_tool', params: { tool: 'all' }, response: 'Cerrando herramientas flotantes.' };
  }
  if (lower.match(/cerrar|cierra|quita|quitar/) && lower.match(/calculadora/)) {
    return { action: 'close_floating_tool', params: { tool: 'calculator' }, response: 'Calculadora cerrada.' };
  }
  if (lower.match(/cerrar|cierra|quita|quitar/) && lower.match(/temporizador|timer/)) {
    return { action: 'close_floating_tool', params: { tool: 'timer' }, response: 'Temporizador cerrado.' };
  }
  if (lower.match(/cerrar|cierra|quita|quitar/) && lower.match(/moneda/)) {
    return { action: 'close_floating_tool', params: { tool: 'coin' }, response: 'Moneda cerrada.' };
  }

  // --- NAVEGACIÓN INSTANTÁNEA ---
  const isNav = lower.match(/ir|ve|abrir|abre|mostrar|muestra|llévame|llevame|pestaña|pestana|apartado|secci[oó]n|modulo|módulo|pantalla/);
  if (isNav) {
    if (lower.match(/notas|cuaderno/)) {
      return { action: 'navigate_tab', params: { tab: 'notes' }, response: 'Abriendo el módulo de Notas y Cuaderno.' };
    }
    if (lower.match(/evaluacion|evaluaciones|examen|examenes|exámenes|pruebas/)) {
      return { action: 'navigate_tab', params: { tab: 'evaluations' }, response: 'Abriendo el módulo de Evaluaciones.' };
    }
    if (lower.match(/muro|tareas|publicacion|publicaciones|feed/)) {
      return { action: 'navigate_tab', params: { tab: 'tasks' }, response: 'Abriendo el Muro principal de Tareas y Publicaciones.' };
    }
    if (lower.match(/libros|biblioteca|flipbook/)) {
      return { action: 'navigate_tab', params: { tab: 'books' }, response: 'Abriendo la Biblioteca de Libros 3D.' };
    }
    if (lower.match(/s[ií]labo|syllabus|contenido|contenidos/)) {
      return { action: 'navigate_tab', params: { tab: 'syllabus' }, response: 'Abriendo el Sílabo y Contenidos Programáticos.' };
    }
    if (lower.match(/reseña|reseñas|review|reviews/)) {
      return { action: 'navigate_tab', params: { tab: 'reviews' }, response: 'Abriendo el módulo de Reseñas.' };
    }
    if (lower.match(/grupos?/)) {
      return { action: 'navigate_tab', params: { tab: 'groups' }, response: 'Abriendo el panel de Grupos.' };
    }
    if (lower.match(/directorio|estudiantes|alumnos/)) {
      return { action: 'navigate_tab', params: { tab: 'directory' }, response: 'Abriendo el Directorio de Estudiantes.' };
    }
    if (lower.match(/mensajes|inbox|chat/)) {
      return { action: 'navigate_tab', params: { tab: 'inbox' }, response: 'Abriendo la Bandeja de Mensajes.' };
    }
    if (lower.match(/herramientas|tools/)) {
      return { action: 'navigate_tab', params: { tab: 'tools' }, response: 'Abriendo la sección de Herramientas Docentes.' };
    }
    if (lower.match(/ajustes|configuraci[oó]n|settings/)) {
      return { action: 'navigate_tab', params: { tab: 'settings' }, response: 'Abriendo los Ajustes de la plataforma.' };
    }
    if (lower.match(/perfil/)) {
      return { action: 'navigate_tab', params: { tab: 'profile' }, response: 'Abriendo tu Perfil Docente.' };
    }
  }

  // --- CONSULTAS PEDAGÓGICAS CLAVE ---
  if ((lower.match(/pendientes?/) && lower.match(/calificar|entregas?|revisar/)) || lower.match(/entregas\s*sin\s*calificar|qu[eé]\s*falta\s*por\s*calificar/)) {
    return { action: 'pending_submissions', params: {}, response: 'Consultando entregas pendientes por calificar...' };
  }
  if (lower.match(/estudiantes\s*en\s*riesgo|peores\s*notas|reprobados|bajo\s*rendimiento|en\s*riesgo/)) {
    return { action: 'students_at_risk', params: {}, response: 'Consultando estudiantes con notas bajas...' };
  }
  if (lower.match(/mejores\s*estudiantes|mejores\s*notas|top\s*estudiantes|cuadro\s*de\s*honor|mejores\s*promedios/)) {
    return { action: 'top_students', params: {}, response: 'Consultando los mejores promedios...' };
  }

  return null;
}

/**
 * 3. Constructor del Prompt con Contexto del Sistema
 * Proporciona a la IA conocimiento completo de la plataforma y todas las herramientas ejecutables.
 */
export function buildTeacherAssistantPrompt({
  teacherName = 'Docente',
  nowString = '',
  students = [],
  tasks = [],
  evaluations = [],
  academicGroups = [],
  syllabus = [],
  grades = [],
  history = [],
  userMessage = ''
}) {
  const studsSummary = students.slice(0, 25).map(s => s.name || s.fullName).join(', ');
  const groupsSummary = academicGroups.map(g => `${g.name} (ID:${g.id})`).join(' | ');
  const evalsSummary = evaluations.slice(0, 15).map(e => `"${e.title}" (${e.isArchived ? 'archivada' : 'activa'})`).join(', ');
  const tasksSummary = tasks.slice(0, 12).map(t => `"${t.title || 'Sin título'}" (${t.targetGroupName || 'Global'})`).join(', ');

  const prompt = `Eres el Asistente Ejecutivo con IA de English TECH para la plataforma docente.
Tu trabajo es orientar y EJECUTAR ACCIONES REALES sobre la plataforma para el docente ${teacherName}.

FECHA ACTUAL: ${nowString}

CONTEXTO DE LA PLATAFORMA:
- Estudiantes (${students.length}): ${studsSummary}
- Grupos (${academicGroups.length}): ${groupsSummary}
- Tareas en muro (${tasks.length}): ${tasksSummary}
- Evaluaciones (${evaluations.length}): ${evalsSummary}
- Sílabo (${syllabus.length} semanas registradas)
- Calificaciones (${grades.length} notas en el sistema)

INSTRUCCIÓN CRÍTICA DE RESPUESTA:
- Cuando el docente pida hacer algo, configurar algo o consultar información del sistema, DEBES responder OBLIGATORIAMENTE con un objeto JSON (puedes incluirlo en \`\`\`json ... \`\`\`):
{
  "action": "NOMBRE_DE_ACCION",
  "params": { ... },
  "response": "Explicación breve, cortés y entusiasta de lo que acabas de realizar."
}
- Si el docente hace una pregunta conversacional, pedagógica o de consulta libre sin acción, responde en texto normal claro, conciso, sin asteriscos dobles y en español.

CATÁLOGO COMPLETO DE ACCIONES:
1. APARIENCIA Y AJUSTES:
   - "set_theme": params { "theme": "dim" | "light" | "lights_out" }
   - "set_sound": params { "enabled": true | false }
   - "set_notifications": params { "enabled": true | false }
   - "logout": params {}

2. HERRAMIENTAS FLOTANTES:
   - "open_floating_tool": params { "tool": "timer" | "coin" | "calculator" }
   - "close_floating_tool": params { "tool": "timer" | "coin" | "calculator" | "all" }
   - "minimize_floating_tool": params { "tool": "timer" | "coin" | "calculator" }

3. NAVEGACIÓN A CUALQUIER PESTAÑA:
   - "navigate_tab": params { "tab": "tasks" | "evaluations" | "notes" | "books" | "syllabus" | "reviews" | "groups" | "directory" | "inbox" | "tools" | "profile" | "settings" }

4. PUBLICAR EN EL MURO / CREAR TAREAS DIRECTAMENTE:
   - "publish_task": params { "title": "...", "description": "...", "postType": "task" | "post" | "announcement", "targetGroupName": "...", "dueDate": "YYYY-MM-DD" }
   - "delete_task": params { "title": "..." }
   - "pending_submissions": params {} (consulta entregas pendientes por calificar)

5. NOTAS Y CUADERNO:
   - "create_note": params { "title": "...", "content": "...", "scope": "private" | "shared", "format": "sticky" | "sheet", "color": "yellow" | "blue" | "pink" | "green" }
   - "list_notes": params {}

6. EVALUACIONES:
   - "open_create_eval": params { "title": "...", "description": "...", "timeLimit": 30, "dueDate": "YYYY-MM-DD" }
   - "archive_evaluation": params { "title": "...", "archive": true | false }
   - "eval_stats": params { "title": "..." }

7. GRUPOS:
   - "create_group": params { "name": "...", "type": "chat" | "academic" }
   - "list_groups": params {}

8. REPORTES Y ESTUDIANTES:
   - "student_report": params { "name": "..." }
   - "students_at_risk": params {}
   - "top_students": params {}
   - "grade_report": params {}
   - "syllabus_info": params { "week": 1 }

9. GENERACIÓN DIDÁCTICA CON IA:
   - "generate_activity": params { "topic": "...", "level": "A1|A2|B1|B2" }
   - "generate_lesson_plan": params { "topic": "...", "duration": 60 }
   - "generate_quiz": params { "topic": "...", "num_questions": 5 }

HISTORIAL RECIENTE:
${history.slice(-5).map(m => `${m.role === 'user' ? teacherName : 'Asistente'}: ${m.text}`).join('\n')}

${teacherName}: ${userMessage}
Asistente:`;

  return prompt;
}

/**
 * 4. Ejecutor Universal de Acciones
 * Modifica el estado real de la aplicación, bases de datos Firestore / Demo Sandbox y lanza respuestas.
 */
export async function executeTeacherAssistantAction(parsed, context) {
  const action = parsed?.action;
  const params = parsed?.params || {};
  let customReply = parsed?.response || null;

  const {
    setThemeMode,
    setSoundEnabled,
    soundEnabledRef,
    setPushEnabled,
    togglePushNotifications,
    handleLogout,
    changeTab,
    openFloatingTool,
    closeFloatingTool,
    setMinimizedFloatingTools,
    academicGroups,
    tasks,
    setTasks,
    evaluations,
    setEvaluations,
    grades,
    rawNotes,
    setRawNotes,
    syllabus,
    userMappings,
    myChatId,
    loggedInName,
    role,
    db,
    appId,
    isDemoMode,
    saveDemoSandboxItem,
    removeDemoSandboxItem,
    setTaskTitle,
    setTaskDesc,
    setPostTargetGroup,
    setIsFormExpanded,
    setIsCreatingEval,
    setEvalFormData,
    setChatGroups,
    callGemini,
    showMessage,
    confirmAction,
    addDoc,
    setDoc,
    doc,
    collection,
    toggleArchiveEvaluation,
    deleteAllStorageFilesInObject,
    deleteDoc
  } = context;

  switch (action) {
    // =========================================================================
    // A. APARIENCIA Y CONFIGURACIÓN
    // =========================================================================
    case 'dark_on':
      setThemeMode('dim');
      customReply = customReply || 'Modo oscuro activado con éxito.';
      break;

    case 'dark_off':
      setThemeMode('light');
      customReply = customReply || 'Modo claro activado con éxito.';
      break;

    case 'lights_out':
      setThemeMode('lights_out');
      customReply = customReply || 'Modo Lights Out (negro puro) activado.';
      break;

    case 'set_theme':
      if (params.theme === 'lights_out') {
        setThemeMode('lights_out');
        customReply = customReply || 'Modo Lights Out (negro puro) activado.';
      } else if (params.theme === 'dim' || params.theme === 'dark') {
        setThemeMode('dim');
        customReply = customReply || 'Modo oscuro activado con éxito.';
      } else {
        setThemeMode('light');
        customReply = customReply || 'Modo claro activado con éxito.';
      }
      break;

    case 'sound_on':
      setSoundEnabled(true);
      if (soundEnabledRef) soundEnabledRef.current = true;
      try { localStorage.setItem('englishTech_sound', 'true'); } catch (e) {}
      customReply = customReply || 'Efectos de sonido activados.';
      break;

    case 'sound_off':
      setSoundEnabled(false);
      if (soundEnabledRef) soundEnabledRef.current = false;
      try { localStorage.setItem('englishTech_sound', 'false'); } catch (e) {}
      customReply = customReply || 'Efectos de sonido silenciados.';
      break;

    case 'set_sound':
      if (params.enabled === false) {
        setSoundEnabled(false);
        if (soundEnabledRef) soundEnabledRef.current = false;
        try { localStorage.setItem('englishTech_sound', 'false'); } catch (e) {}
        customReply = customReply || 'Efectos de sonido silenciados.';
      } else {
        setSoundEnabled(true);
        if (soundEnabledRef) soundEnabledRef.current = true;
        try { localStorage.setItem('englishTech_sound', 'true'); } catch (e) {}
        customReply = customReply || 'Efectos de sonido activados.';
      }
      break;

    case 'push_on':
      togglePushNotifications();
      customReply = customReply || 'Notificaciones push procesadas/habilitadas.';
      break;

    case 'push_off':
      setPushEnabled(false);
      try { localStorage.setItem('englishTech_push', 'false'); } catch (e) {}
      customReply = customReply || 'Notificaciones push desactivadas.';
      break;

    case 'set_notifications':
      if (params.enabled === false) {
        setPushEnabled(false);
        try { localStorage.setItem('englishTech_push', 'false'); } catch (e) {}
        customReply = customReply || 'Notificaciones push desactivadas.';
      } else {
        togglePushNotifications();
        customReply = customReply || 'Notificaciones push habilitadas.';
      }
      break;

    case 'logout':
      confirmAction('¿Deseas cerrar tu sesión actual?', handleLogout);
      customReply = 'He preparado el cierre de sesión.';
      break;

    // =========================================================================
    // B. HERRAMIENTAS FLOTANTES
    // =========================================================================
    case 'open_floating_tool': {
      const tool = (params.tool || 'calculator').toLowerCase();
      if (tool.includes('timer') || tool.includes('temporizador') || tool.includes('cronometro')) {
        openFloatingTool('timer');
        customReply = customReply || 'He abierto el Temporizador en una ventana flotante para ti.';
      } else if (tool.includes('coin') || tool.includes('moneda')) {
        openFloatingTool('coin');
        customReply = customReply || 'He abierto la Moneda 3D en una ventana flotante.';
      } else {
        openFloatingTool('calculator');
        customReply = customReply || 'He abierto la Calculadora en una ventana flotante.';
      }
      break;
    }

    case 'close_floating_tool': {
      const tool = (params.tool || 'all').toLowerCase();
      if (tool === 'all') {
        closeFloatingTool('timer');
        closeFloatingTool('coin');
        closeFloatingTool('calculator');
        customReply = customReply || 'Cerré todas las herramientas flotantes.';
      } else {
        closeFloatingTool(tool);
        customReply = customReply || `Herramienta ${tool} cerrada.`;
      }
      break;
    }

    case 'minimize_floating_tool': {
      const tool = (params.tool || 'timer').toLowerCase();
      setMinimizedFloatingTools(prev => ({ ...prev, [tool]: true }));
      customReply = customReply || `Herramienta ${tool} minimizada en la esquina inferior.`;
      break;
    }

    // =========================================================================
    // C. NAVEGACIÓN TOTAL
    // =========================================================================
    case 'navigate_tab':
    case 'navigate_TASKS':
    case 'navigate_REVIEWS':
    case 'navigate_BOOKS':
    case 'navigate_NOTES':
    case 'navigate_SYLLABUS':
    case 'navigate_EVALUATIONS':
    case 'navigate_GROUPS':
    case 'navigate_DIRECTORY':
    case 'navigate_INBOX':
    case 'navigate_TOOLS':
    case 'navigate_PROFILE':
    case 'navigate_SETTINGS': {
      let targetTab = params.tab;
      if (!targetTab && action.startsWith('navigate_')) {
        targetTab = action.replace('navigate_', '').toLowerCase();
      }
      targetTab = targetTab || 'tasks';
      changeTab(targetTab);
      const tabNames = {
        tasks: 'el Muro de Tareas',
        reviews: 'las Reseñas',
        books: 'la Biblioteca de Libros 3D',
        notes: 'el Cuaderno de Notas',
        syllabus: 'el Sílabo',
        evaluations: 'las Evaluaciones',
        groups: 'los Grupos',
        directory: 'el Directorio de Estudiantes',
        inbox: 'los Mensajes',
        tools: 'las Herramientas',
        profile: 'tu Perfil',
        settings: 'los Ajustes'
      };
      customReply = customReply || `Te he llevado a ${tabNames[targetTab] || targetTab}.`;
      break;
    }

    // =========================================================================
    // D. MURO Y TAREAS (Publicación Real y Directa)
    // =========================================================================
    case 'publish_task':
    case 'create_task': {
      const title = params.title || 'Nueva actividad';
      const desc = params.description || '';
      const pType = params.postType || (params.dueDate ? 'task' : 'post');

      // Resolver grupo destino
      let targetGrpId = 'all';
      let targetGrpName = 'Todos los estudiantes (Global)';
      if (params.targetGroupName || params.group) {
        const queryGrp = String(params.targetGroupName || params.group).toLowerCase();
        const found = academicGroups.find(g => (g?.name || '').toLowerCase().includes(queryGrp));
        if (found) {
          targetGrpId = found.id;
          targetGrpName = found.name;
        }
      }

      const newTaskPayload = {
        type: pType,
        title: title.trim(),
        description: desc.trim(),
        authorName: loggedInName || 'Docente',
        authorId: myChatId || 'teacher',
        authorRole: role || 'teacher',
        teacherId: myChatId || 'teacher',
        ownerTeacherId: myChatId || 'teacher',
        targetGroupId: targetGrpId,
        targetGroupName: targetGrpName,
        imageUrl: '',
        imageUrls: [],
        fileUrl: '',
        fileName: '',
        dueDate: params.dueDate ? String(params.dueDate) : null,
        dueTime: params.dueTime || '23:59',
        allowLate: params.allowLate !== false,
        createdAt: Date.now(),
        reactions: {},
        comments: []
      };

      if (isDemoMode) {
        newTaskPayload.id = `demo-task-${Date.now()}`;
        newTaskPayload.isDemoCreated = true;
        saveDemoSandboxItem('tasks', newTaskPayload);
        setTasks(prev => [newTaskPayload, ...(prev || [])]);
      } else {
        try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), newTaskPayload);
          newTaskPayload.id = docRef.id;
          setTasks(prev => [newTaskPayload, ...(prev || [])]);
        } catch (err) {
          console.error('Error al publicar tarea con el asistente:', err);
        }
      }

      changeTab('tasks');
      showMessage(`Publicación "${title}" creada con éxito.`);
      customReply = customReply || `¡Listo! Publiqué "${title}" en el Muro para ${targetGrpName}.`;
      break;
    }

    case 'list_tasks': {
      customReply = `Tienes ${tasks.length} publicaciones/tareas en el muro:\n${tasks.slice(0, 10).map((t, i) => `${i + 1}. "${t.title || 'Sin título'}" (${t.targetGroupName || 'Global'})`).join('\n')}`;
      break;
    }

    case 'delete_task': {
      if (params.title) {
        const queryT = params.title.toLowerCase();
        const t = tasks.find(item => (item.title || '').toLowerCase().includes(queryT));
        if (t) {
          confirmAction(`¿Deseas eliminar la publicación "${t.title}" del muro?`, async () => {
            if (isDemoMode || String(t.id).startsWith('demo')) {
              removeDemoSandboxItem('tasks', t.id);
              setTasks(prev => prev.filter(item => item.id !== t.id));
              return;
            }
            if (typeof deleteAllStorageFilesInObject === 'function') {
              await deleteAllStorageFilesInObject(t).catch(() => {});
            }
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id)).catch(() => {});
            setTasks(prev => prev.filter(item => item.id !== t.id));
          });
          customReply = `He solicitado confirmación para eliminar "${t.title}".`;
        } else {
          customReply = `No encontré ninguna publicación con el título "${params.title}".`;
        }
      }
      break;
    }

    case 'pending_submissions': {
      let totalSubmissions = 0;
      const tasksWithSubmissions = [];

      (tasks || []).forEach(t => {
        const subs = Array.isArray(t.submissions) ? t.submissions : (t.submissions && typeof t.submissions === 'object' ? Object.values(t.submissions) : []);
        const unreviewed = subs.filter(s => !s.grade && s.grade !== 0);
        if (unreviewed.length > 0) {
          totalSubmissions += unreviewed.length;
          tasksWithSubmissions.push(`• "${t.title || 'Sin título'}": ${unreviewed.length} entregas pendientes`);
        }
      });

      if (totalSubmissions === 0) {
        customReply = '¡Excelente trabajo! No tienes entregas de tareas pendientes por calificar en este momento.';
      } else {
        customReply = `Tienes un total de ${totalSubmissions} entrega(s) pendiente(s) por calificar:\n${tasksWithSubmissions.join('\n')}`;
      }
      break;
    }

    // =========================================================================
    // E. NOTAS Y CUADERNO
    // =========================================================================
    case 'create_note': {
      const noteTitle = params.title || 'Nota rápida';
      const noteContent = params.content || '';
      const noteScope = params.scope === 'private' ? 'private' : 'shared';
      const noteFormat = params.format === 'sheet' ? 'sheet' : 'sticky';
      const noteColor = params.color || 'yellow';

      const newNote = {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        scope: noteScope,
        format: noteFormat,
        color: noteColor,
        authorId: myChatId || 'teacher',
        authorName: loggedInName || 'Docente',
        authorRole: role || 'teacher',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        isSoftDeleted: false
      };

      if (isDemoMode) {
        newNote.id = `demo-note-${Date.now()}`;
        newNote.isDemoCreated = true;
        saveDemoSandboxItem('notes', newNote);
        setRawNotes(prev => [newNote, ...(prev || [])]);
      } else {
        try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), newNote);
          newNote.id = docRef.id;
          setRawNotes(prev => [newNote, ...(prev || [])]);
        } catch (e) {
          console.error('Error al crear nota con asistente:', e);
        }
      }

      showMessage(`Nota "${noteTitle}" guardada.`);
      customReply = customReply || `¡Listo! Creé la nota "${noteTitle}" (${noteScope === 'private' ? 'privada' : 'compartida'}) en tu cuaderno.`;
      break;
    }

    // =========================================================================
    // F. EVALUACIONES
    // =========================================================================
    case 'open_create_eval': {
      setEvalFormData({
        title: params.title || 'Nueva Evaluación',
        description: params.description || '',
        dueDate: params.dueDate || '',
        dueTime: '23:59',
        timeLimit: params.timeLimit || 30,
        strictAntiCheat: false,
        immediateFeedback: true,
        targetGroupId: 'all',
        targetGroupName: 'Todos los estudiantes (Global)',
        targetStudentIds: [],
        videoUrl: '',
        questions: [{ type: 'multiple', text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], correctAnswer: '' }]
      });
      setIsCreatingEval(true);
      changeTab('evaluations');
      customReply = customReply || 'He preparado el formulario para crear la nueva evaluación en la pestaña de Evaluaciones.';
      break;
    }

    case 'list_evaluations': {
      customReply = `Evaluaciones registradas (${evaluations.length}):\n${evaluations.map((e, i) => `${i + 1}. "${e.title || 'Sin título'}" (Vence: ${e.dueDate || 'Sin fecha'}, ${e.isArchived ? 'archivada' : 'activa'})`).join('\n')}`;
      break;
    }

    case 'archive_eval':
    case 'archive_evaluation': {
      if (params.title) {
        const queryE = params.title.toLowerCase();
        const ev = evaluations.find(item => (item.title || '').toLowerCase().includes(queryE));
        if (ev) {
          const nextArchived = params.archive !== undefined ? params.archive : !ev.isArchived;
          await toggleArchiveEvaluation(ev.id, !nextArchived);
          customReply = customReply || `Evaluación "${ev.title}" ${nextArchived ? 'archivada' : 'restaurada'} con éxito.`;
        } else {
          customReply = `No encontré ninguna evaluación que coincida con "${params.title}".`;
        }
      }
      break;
    }

    case 'eval_stats': {
      if (params.title) {
        const queryE = params.title.toLowerCase();
        const ev = evaluations.find(item => (item.title || '').toLowerCase().includes(queryE));
        if (ev) {
          const evGrades = grades.filter(g => g.evaluationId === ev.id);
          const avg = evGrades.length > 0 ? (evGrades.reduce((s, g) => s + (Number(g.score) || 0), 0) / evGrades.length).toFixed(1) : 'N/A';
          const passed = evGrades.filter(g => (Number(g.score) || 0) >= 3.0).length;
          const failed = evGrades.length - passed;
          customReply = `Estadísticas de "${ev.title}":\n• Presentaron: ${evGrades.length} estudiantes\n• Promedio general: ${avg}/5.0\n• Aprobados (>=3.0): ${passed}\n• Reprobados (<3.0): ${failed}`;
        } else {
          customReply = `No encontré la evaluación "${params.title}".`;
        }
      }
      break;
    }

    // =========================================================================
    // G. GRUPOS Y CHATS
    // =========================================================================
    case 'create_group': {
      if (params.name) {
        const grpName = params.name.trim();
        if (isDemoMode) {
          const newGrp = {
            id: `demo-chatgrp-${Date.now()}`,
            name: grpName,
            members: [myChatId],
            createdBy: myChatId,
            teacherId: myChatId,
            createdAt: Date.now(),
            isDemoCreated: true
          };
          saveDemoSandboxItem('chatGroups', newGrp);
          setChatGroups(prev => [...prev, newGrp]);
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chatGroups'), {
            name: grpName,
            members: [myChatId],
            createdBy: myChatId,
            teacherId: myChatId,
            createdAt: Date.now()
          });
        }
        customReply = customReply || `He creado el grupo de conversación "${grpName}".`;
      }
      break;
    }

    // =========================================================================
    // H. REPORTES DE RENDIMIENTO Y ESTUDIANTES
    // =========================================================================
    case 'student_report': {
      if (params.name) {
        const queryN = params.name.toLowerCase();
        const stGrades = grades.filter(g => (g.studentName || '').toLowerCase().includes(queryN));
        if (stGrades.length > 0) {
          const details = stGrades.map(g => {
            const ev = evaluations.find(e => e.id === g.evaluationId);
            return `• ${ev?.title || 'Evaluación'}: ${Number(g.score || 0).toFixed(1)}/5.0`;
          });
          const avg = (stGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / stGrades.length).toFixed(1);
          customReply = `Reporte de ${params.name}:\n${details.join('\n')}\nPromedio acumulado: ${avg}/5.0`;
        } else {
          customReply = `No encontré calificaciones registradas para el estudiante "${params.name}".`;
        }
      }
      break;
    }

    case 'worst_students':
    case 'students_at_risk': {
      const studentMap = {};
      grades.forEach(g => {
        const n = g.studentName || 'Estudiante';
        if (!studentMap[n]) studentMap[n] = [];
        studentMap[n].push(Number(g.score) || 0);
      });

      const atRisk = Object.entries(studentMap)
        .map(([name, scores]) => ({ name, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
        .filter(s => s.avg < 3.0)
        .sort((a, b) => a.avg - b.avg);

      if (atRisk.length === 0) {
        customReply = '¡Buenas noticias! Ningún estudiante tiene promedio acumulado por debajo de 3.0.';
      } else {
        customReply = `Estudiantes con menor rendimiento o promedio menor a 3.0:\n${atRisk.map((s, i) => `${i + 1}. ${s.name}: ${s.avg.toFixed(1)}/5.0`).join('\n')}`;
      }
      break;
    }

    case 'grade_report': {
      const avg = grades.length > 0 ? (grades.reduce((s, g) => s + (Number(g.score) || 0), 0) / grades.length).toFixed(1) : 'N/A';
      customReply = `Reporte global de notas:\n• Total registros: ${grades.length}\n• Promedio acumulado de la plataforma: ${avg}/5.0`;
      break;
    }

    case 'list_groups': {
      customReply = `Grupos académicos registrados (${academicGroups.length}):\n${academicGroups.map((g, i) => `${i + 1}. ${g.name} (${Array.isArray(g.members) ? g.members.length : 0} miembros)`).join('\n')}`;
      break;
    }

    case 'list_students': {
      const studs = Object.values(userMappings || {}).filter(u => u?.role === 'student');
      customReply = `Estudiantes registrados (${studs.length}):\n${studs.slice(0, 25).map((s, i) => `${i + 1}. ${s.fullName || s.name || 'Sin nombre'}`).join('\n')}`;
      break;
    }

    case 'student_count': {
      const studs = Object.values(userMappings || {}).filter(u => u?.role === 'student');
      customReply = `Actualmente hay ${studs.length} estudiantes registrados en la plataforma.`;
      break;
    }

    case 'syllabus_summary': {
      customReply = `Sílabo académico (${syllabus.length} semanas registradas):\n${syllabus.map(s => `• Sem ${s.week}: ${s.topic || 'Sin tema'}`).join('\n')}`;
      break;
    }

    case 'top_students': {
      const studentMap = {};
      grades.forEach(g => {
        const n = g.studentName || 'Estudiante';
        if (!studentMap[n]) studentMap[n] = [];
        studentMap[n].push(Number(g.score) || 0);
      });

      const top = Object.entries(studentMap)
        .map(([name, scores]) => ({ name, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      if (top.length === 0) {
        customReply = 'Aún no hay calificaciones registradas para calcular el cuadro de honor.';
      } else {
        customReply = `Top 5 mejores promedios:\n${top.map((s, i) => `${i + 1}. ${s.name}: ${s.avg.toFixed(1)}/5.0`).join('\n')}`;
      }
      break;
    }

    case 'syllabus_week':
    case 'syllabus_info': {
      const weekNum = parseInt(params.week, 10);
      const item = syllabus.find(s => s.week === weekNum);
      if (item) {
        customReply = `Semana ${item.week} del Sílabo:\n• Tema: ${item.topic || 'Sin tema'}\n• Objetivo: ${item.objective || 'Sin objetivo'}\n• Gramática/Vocabulario: ${item.grammar || 'N/A'}`;
      } else {
        customReply = `Actualmente hay ${syllabus.length} semanas registradas en el sílabo.`;
      }
      break;
    }

    // =========================================================================
    // I. GENERADOR DIDÁCTICO CON IA
    // =========================================================================
    case 'generate_activity':
    case 'generate_lesson_plan':
    case 'generate_quiz': {
      const topic = params.topic || 'inglés comunicativo';
      const level = params.level || 'intermedio B1';
      const duration = params.duration || 60;
      const numQ = params.num_questions || 5;

      const genPrompt = action === 'generate_activity'
        ? `Diseña una dinámica práctica para enseñar "${topic}" a nivel ${level}. Estructura: Título atractivo, Objetivo comunicativo, Desarrollo paso a paso y Criterio de evaluación. Máximo 220 palabras. Sin asteriscos.`
        : action === 'generate_lesson_plan'
        ? `Diseña un plan de clase de ${duration} minutos para "${topic}" (${level}). Incluye Warm-up (10m), Presentation (15m), Practice (20m), Production (15m). Máximo 220 palabras. Sin asteriscos.`
        : `Genera ${numQ} preguntas de opción múltiple sobre "${topic}" (${level}) con retroalimentación explicativa. Máximo 180 palabras. Sin asteriscos.`;

      try {
        const genReply = await callGemini(genPrompt);
        customReply = genReply?.trim()?.replace(/\*\*/g, '').replace(/\*/g, '') || customReply;
      } catch (e) {
        console.error('Error al generar contenido didáctico:', e);
      }
      break;
    }

    default:
      break;
  }

  return customReply || 'Acción completada con éxito.';
}

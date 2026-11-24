// src/utils/aiTeacherAssistantEngine.js
// Motor integral y conversacional del Asistente con IA para English TECH
// Permite conversar de forma natural, usar botones rápidos y ejecutar acciones reales en toda la plataforma.

import { isTeacherId, TEACHER_NAME, SECOND_TEACHER_NAME, sanitizeFirestoreData as defaultSanitizeFirestore } from './helpers.js';
import { generateAiBookPages, sanitizeBookForFirestore } from './flipbookEngine.js';
import { construirPromptKahootIA, parsearKahootIA, generateKahootPin } from './kahootEngine.js';

const cleanDisplayText = (str) => String(str || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();

const normalizeMessagesArray = (rawMessages, fallbackText = '') => {
  if (Array.isArray(rawMessages) && rawMessages.length > 0) {
    const cleaned = rawMessages.map(m => cleanDisplayText(m)).filter(Boolean);
    if (cleaned.length > 0) return cleaned.slice(0, 3);
  }
  const single = cleanDisplayText(fallbackText);
  return single ? [single] : [];
};

const normalizeQuickReplies = (rawReplies) => {
  if (!Array.isArray(rawReplies)) return [];
  const out = [];
  for (const item of rawReplies) {
    if (typeof item === 'string') {
      const t = cleanDisplayText(item);
      if (t) out.push({ label: t, value: t });
    } else if (item && typeof item === 'object') {
      const label = cleanDisplayText(item.label || item.text || item.title || item.value);
      const value = cleanDisplayText(item.value || item.prompt || item.label || item.text);
      if (label && value) out.push({ label, value });
    }
    if (out.length >= 6) break;
  }
  return out;
};

const resolveAcademicGroup = (academicGroups = [], queryNameOrId = '') => {
  const q = String(queryNameOrId || '').trim().toLowerCase();
  if (!q || q === 'all' || q === 'todos' || q === 'general' || q === 'todas las materias') {
    return { id: 'all', name: 'Todas las materias (General)' };
  }
  const cleanQ = q.replace(/^acad_/i, '').trim();
  const list = Array.isArray(academicGroups) ? academicGroups : [];
  const exact = list.find(g => {
    const gid = String(g?.id || '').toLowerCase();
    const gname = String(g?.name || '').toLowerCase();
    return gid === q || gid.replace(/^acad_/i, '') === cleanQ || gname === q;
  });
  if (exact) return { id: exact.id, name: exact.name };

  const partial = list.find(g => {
    const gname = String(g?.name || '').toLowerCase();
    return gname.includes(q) || q.includes(gname);
  });
  if (partial) return { id: partial.id, name: partial.name };

  return null;
};

/**
 * 1. Evaluador aritmético seguro (sin eval ni new Function)
 * Soporta expresiones numéricas y frases en español ("cuánto es 45 por 12", "380 dividido entre 4", etc.).
 */
export function evaluateMathExpression(input) {
  if (input === null || input === undefined) return { ok: false };
  let s = String(input).trim().toLowerCase();
  if (!s) return { ok: false };

  // Limpiar frases comunes antes de convertir palabras matemáticas
  s = s
    .replace(/\bpor\s+favor\b/g, ' ')
    .replace(/\b(cu[aá]nto\s+es|calcula|calculadora|dime|resultado\s+de|igual\s+a)\b/g, ' ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\bdividido\s+(?:entre|por|para)\b/g, '/')
    .replace(/\bentre\b/g, '/')
    .replace(/[÷]/g, '/')
    .replace(/\bmultiplicado\s+por\b/g, '*')
    .replace(/\bpor\b/g, '*')
    .replace(/[×]/g, '*')
    .replace(/(\d|\))\s*[x]\s*(\d|\()/g, '$1 * $2')
    .replace(/\bm[aá]s\b/g, '+')
    .replace(/\bmenos\b/g, '-')
    .replace(/\belevado\s+a(?:\s+la)?\b/g, '^');

  // Extraer la secuencia matemática válida
  const candidates = s.match(/[\d.\s+\-*/^()%]+/g) || [];
  const exprRaw = candidates
    .map(c => c.trim())
    .filter(c => /\d/.test(c) && /[+\-*/^%]/.test(c))
    .sort((a, b) => b.length - a.length)[0]
    || candidates.map(c => c.trim()).filter(c => /\d/.test(c)).sort((a, b) => b.length - a.length)[0];

  if (!exprRaw) return { ok: false };

  const expr = exprRaw.replace(/\s+/g, '');
  if (!/^[\d.+\-*/^()%]+$/.test(expr)) return { ok: false };

  // Tokenizador
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\d|\./.test(ch)) {
      let numStr = '';
      let dots = 0;
      while (i < expr.length && /\d|\./.test(expr[i])) {
        if (expr[i] === '.') dots += 1;
        if (dots > 1) return { ok: false };
        numStr += expr[i];
        i += 1;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) return { ok: false };
      tokens.push({ type: 'num', value: val });
    } else if ('+-*/^()%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
    } else {
      return { ok: false };
    }
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpression = () => {
    let left = parseTerm();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = () => {
    let left = parsePower();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
      const op = consume().value;
      const right = parsePower();
      if (op === '*') left = left * right;
      else if (op === '/') {
        if (right === 0) throw new Error('DIV_ZERO');
        left = left / right;
      } else {
        if (right === 0) throw new Error('DIV_ZERO');
        left = left % right;
      }
    }
    return left;
  };

  const parsePower = () => {
    let base = parseUnary();
    if (peek() && peek().type === 'op' && peek().value === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  };

  const parseUnary = () => {
    if (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  };

  const parsePrimary = () => {
    const tok = peek();
    if (!tok) throw new Error('UNEXPECTED_END');
    if (tok.type === 'num') {
      consume();
      return tok.value;
    }
    if (tok.type === 'op' && tok.value === '(') {
      consume();
      const val = parseExpression();
      const close = peek();
      if (!close || close.type !== 'op' || close.value !== ')') throw new Error('MISSING_PAREN');
      consume();
      return val;
    }
    throw new Error('BAD_TOKEN');
  };

  try {
    const result = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(result)) return { ok: false };
    const rounded = Number.isInteger(result) ? result : Number(result.toFixed(6));
    const displayExpression = expr.replace(/([+\-*/^%])/g, ' $1 ').replace(/\s+/g, ' ').trim();
    const formattedResult = Number.isInteger(rounded)
      ? rounded.toLocaleString('es-CO')
      : String(rounded);
    return {
      ok: true,
      expression: displayExpression,
      result: rounded,
      formattedResult
    };
  } catch (err) {
    return { ok: false, error: err?.message === 'DIV_ZERO' ? 'No se puede dividir entre cero.' : 'Expresión inválida' };
  }
}

/**
 * 2. Escáner real de pendientes por calificar (Tareas, Foros, Evaluaciones y Sugerencias)
 */
export function computePendingGradingReport({
  tasks = [],
  evaluations = [],
  grades = [],
  suggestions = []
} = {}) {
  const pendingTasks = [];
  let totalTaskSubmissions = 0;

  (Array.isArray(tasks) ? tasks : []).forEach((t) => {
    if (!t || t.isDeleted || t.isDeletedFromWall) return;
    const rawType = String(t.type || '').toLowerCase();
    const isTaskOrForum = rawType === 'task' || rawType === 'forum' || (!rawType && !t.poll && !t.kahoot);
    if (!isTaskOrForum) return;

    // 1. Revisar entregas en task.comments (lógica exacta de TaskCard.jsx)
    const studentComments = (Array.isArray(t.comments) ? t.comments : []).filter((c) => {
      if (!c || c.isDeleted) return false;
      const authorLower = String(c.author || '').trim().toLowerCase();
      const isTeacherAuthor =
        c.authorRole === 'teacher' ||
        c.role === 'teacher' ||
        isTeacherId(c.authorId) ||
        isTeacherId(c.authorUsername) ||
        isTeacherId(authorLower) ||
        (c.author && (c.author.trim() === TEACHER_NAME || c.author.trim() === SECOND_TEACHER_NAME)) ||
        authorLower === 'profesora' ||
        authorLower === 'profesor' ||
        authorLower === 'la profe' ||
        authorLower === 'el profe' ||
        authorLower === 'docente gina' ||
        authorLower === 'profesora gina' ||
        authorLower === 'docente camilo' ||
        authorLower === 'profesor camilo';
      return !isTeacherAuthor;
    });

    const studentMap = new Map();
    studentComments.forEach((c) => {
      const key = String(c.authorId || c.authorUsername || c.uid || c.author || '').trim().toLowerCase();
      if (!key) return;
      if (!studentMap.has(key)) {
        studentMap.set(key, c);
      } else {
        const prev = studentMap.get(key);
        if ((prev.grade === undefined || prev.grade === null || prev.grade === '') && (c.grade !== undefined && c.grade !== null && c.grade !== '')) {
          studentMap.set(key, c);
        }
      }
    });

    let unreviewedCount = Array.from(studentMap.values()).filter(
      (c) => c.grade === undefined || c.grade === null || c.grade === ''
    ).length;

    // 2. Retrocompatibilidad si algún registro antiguo usa task.submissions
    if (unreviewedCount === 0 && t.submissions) {
      const subs = Array.isArray(t.submissions)
        ? t.submissions
        : (typeof t.submissions === 'object' ? Object.values(t.submissions) : []);
      unreviewedCount = subs.filter((s) => s && !s.grade && s.grade !== 0).length;
    }

    if (unreviewedCount > 0) {
      totalTaskSubmissions += unreviewedCount;
      pendingTasks.push({
        id: t.id,
        title: t.title || 'Sin título',
        kind: rawType === 'forum' ? 'Foro' : 'Tarea',
        group: t.targetGroupName || 'General',
        count: unreviewedCount
      });
    }
  });

  // 3. Evaluaciones activas con entregas sin retroalimentación o preguntas abiertas por calificar
  const pendingEvaluations = [];
  let totalEvalPending = 0;

  (Array.isArray(evaluations) ? evaluations : []).forEach((ev) => {
    if (!ev || ev.isArchived) return;
    const evGrades = (Array.isArray(grades) ? grades : []).filter(
      (g) => g && String(g.evaluationId) === String(ev.id)
    );
    if (evGrades.length === 0) return;

    const questions = Array.isArray(ev.questions) ? ev.questions : [];
    const hasManualQuestions = questions.some((q) =>
      ['text', 'speaking', 'audio', 'open'].includes(String(q?.type || '').toLowerCase())
    );

    const unreviewedGrades = evGrades.filter(
      (g) => !(g.teacherFeedback && String(g.teacherFeedback).trim())
    );

    if (hasManualQuestions && unreviewedGrades.length > 0) {
      totalEvalPending += unreviewedGrades.length;
      pendingEvaluations.push({
        id: ev.id,
        title: ev.title || 'Evaluación sin título',
        group: ev.targetGroupName || 'General',
        count: unreviewedGrades.length,
        totalSubmitted: evGrades.length,
        hasManualQuestions: true
      });
    }
  });

  const unreadSuggestions = (Array.isArray(suggestions) ? suggestions : []).filter((s) => s && !s.read).length;

  return {
    pendingTasks,
    totalTaskSubmissions,
    pendingEvaluations,
    totalEvalPending,
    unreadSuggestions,
    totalAllPending: totalTaskSubmissions + totalEvalPending
  };
}

/**
 * 3. Extractor y limpiador universal de JSON proveniente de la IA
 * Cuando options.fromAi === true, NO aplica fallback heurístico sobre prosa libre
 * para evitar falsos positivos ante saludos o conversación normal.
 */
export function parseAiResponse(rawText, options = {}) {
  if (!rawText || typeof rawText !== 'string') {
    return { isAction: false, text: '', messages: [], quickReplies: [] };
  }

  const clean = rawText.trim();

  const buildFromParsed = (parsed) => {
    const rawAction = parsed.action;
    const hasExecutableAction = Boolean(rawAction && rawAction !== 'none' && rawAction !== 'chat');
    const messages = normalizeMessagesArray(parsed.messages, parsed.response || parsed.text || '');
    const quickReplies = normalizeQuickReplies(parsed.quickReplies || parsed.buttons);
    const text = messages.join('\n\n');

    return {
      isAction: hasExecutableAction,
      action: hasExecutableAction ? rawAction : null,
      params: parsed.params && typeof parsed.params === 'object' ? parsed.params : {},
      response: messages[0] || '',
      messages,
      quickReplies,
      widget: parsed.widget || null,
      originalText: rawText,
      text
    };
  };

  // Caso A: Bloque de código Markdown ```json ... ```
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed && (parsed.action !== undefined || Array.isArray(parsed.messages) || parsed.response)) {
        return buildFromParsed(parsed);
      }
    } catch (e) {}
  }

  // Caso B: JSON puro en la raíz
  try {
    const parsed = JSON.parse(clean);
    if (parsed && (parsed.action !== undefined || Array.isArray(parsed.messages) || parsed.response)) {
      return buildFromParsed(parsed);
    }
  } catch (e) {}

  // Caso C: Buscar el primer '{' y el último '}'
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose > firstOpen) {
    try {
      const candidate = clean.slice(firstOpen, lastClose + 1);
      const parsed = JSON.parse(candidate);
      if (parsed && (parsed.action !== undefined || Array.isArray(parsed.messages) || parsed.response)) {
        return buildFromParsed(parsed);
      }
    } catch (e) {}
  }

  // Caso D: Fallback heurístico solo cuando NO viene de respuesta libre de la IA
  if (!options?.fromAi) {
    const fallbackIntent = detectNaturalLanguageIntent(clean);
    if (fallbackIntent) {
      const messages = normalizeMessagesArray(fallbackIntent.messages, fallbackIntent.response || '');
      return {
        isAction: true,
        ...fallbackIntent,
        messages,
        quickReplies: normalizeQuickReplies(fallbackIntent.quickReplies),
        text: messages.join('\n\n'),
        originalText: rawText
      };
    }
  }

  // Texto conversacional humano (soporta separación opcional por |||)
  const parts = clean
    .split(/\s*\|\|\|\s*/)
    .map(p => cleanDisplayText(p))
    .filter(Boolean)
    .slice(0, 3);

  return {
    isAction: false,
    messages: parts.length > 0 ? parts : [cleanDisplayText(clean)],
    quickReplies: [],
    text: (parts.length > 0 ? parts : [cleanDisplayText(clean)]).join('\n\n')
  };
}

/**
 * 4. Reconocimiento de intenciones directas por Lenguaje Natural
 * (Para comandos directos del usuario sin pasar por JSON o pruebas deterministas).
 */
export function detectNaturalLanguageIntent(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Saludo puro -> jamás activar reportes automáticos
  if (/^(hola+|buen[oa]s(\s+(d[ií]as|tardes|noches))?|hey+|holi+|qu[eé]\s+tal|saludos)[!.\s,?]*$/i.test(lower)) {
    return null;
  }

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

  // --- MONEDA EN CHAT VS FLOTANTE ---
  if (lower.match(/moneda|cara\s*o\s*sello|cara\s*o\s*cruz/) && !lower.match(/cerrar|ocultar|quitar/)) {
    if (lower.match(/tira|tirar|chat|aquí|aqui|mismo/) && !lower.match(/ventana\s*flotante|abre\s+la\s+moneda|abrir\s+la\s+moneda/)) {
      return { action: 'flip_coin', params: {}, response: '¡Moneda lanzada!' };
    }
    return { action: 'open_floating_tool', params: { tool: 'coin' }, response: 'Abriendo la Moneda 3D en ventana flotante.' };
  }

  // --- HERRAMIENTAS FLOTANTES ---
  if (lower.match(/calculadora/) && !lower.match(/cerrar|ocultar|quitar/)) {
    const mathCheck = evaluateMathExpression(text);
    if (mathCheck.ok) {
      return { action: 'calculate_and_open', params: { expression: text }, response: `El resultado es ${mathCheck.formattedResult}.` };
    }
    return { action: 'open_floating_tool', params: { tool: 'calculator' }, response: 'Abriendo la Calculadora en ventana flotante.' };
  }
  if (lower.match(/temporizador|cronometro|cronómetro|timer/) && !lower.match(/cerrar|ocultar|quitar/)) {
    return { action: 'open_floating_tool', params: { tool: 'timer' }, response: 'Abriendo el Temporizador en ventana flotante.' };
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
    if (lower.match(/videos|vídeos/)) {
      return { action: 'navigate_tab', params: { tab: 'videos' }, response: 'Abriendo el módulo de Vídeos.' };
    }
    if (lower.match(/diapositiva|slides|powerpoint|reseña|reseñas|review|reviews/)) {
      return { action: 'navigate_tab', params: { tab: 'reviews' }, response: 'Abriendo el Estudio de Diapositivas.' };
    }
    if (lower.match(/s[ií]labo|syllabus|contenido|contenidos/)) {
      return { action: 'navigate_tab', params: { tab: 'syllabus' }, response: 'Abriendo el Sílabo y Contenidos Programáticos.' };
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
  if ((lower.match(/pendientes?/) && lower.match(/calificar|entregas?|revisar|evaluaci[oó]n|evaluaciones/)) || lower.match(/entregas\s*sin\s*calificar|qu[eé]\s*falta\s*por\s*calificar/)) {
    return { action: 'pending_submissions', params: {}, response: 'Revisando tus entregas y evaluaciones pendientes...' };
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
 * Chips de sugerencias iniciales para la bienvenida del bot
 */
export function getWelcomeQuickReplies(academicGroups = []) {
  const firstGroup = Array.isArray(academicGroups) && academicGroups[0]?.name ? academicGroups[0].name : '';
  return [
    { label: 'Revisar pendientes por calificar', value: 'Revisa qué tengo pendiente por calificar en tareas y evaluaciones' },
    { label: 'Crear evaluación', value: firstGroup ? `Quiero hacer una evaluación para ${firstGroup}` : 'Quiero crear una evaluación' },
    { label: 'Hacer un libro 3D', value: 'Quiero hacer o subir un libro 3D' },
    { label: 'Subir diapositivas', value: 'Quiero subir o crear unas diapositivas' },
    { label: 'Tirar una moneda', value: 'Tira una moneda aquí en el chat' },
    { label: 'Abrir temporizador', value: 'Ponme el temporizador en ventana flotante' }
  ];
}

/**
 * 5. Constructor del Prompt Humano, Multi-Mensaje y con Botones Interactivos
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
  books = [],
  videos = [],
  reviews = [],
  teacherBotInfoList = [],
  history = [],
  userMessage = ''
}) {
  const studsSummary = students.slice(0, 25).map(s => s.name || s.fullName).filter(Boolean).join(', ');
  const groupsSummary = academicGroups.map(g => `${g.name} (ID:${g.id})`).join(' | ');
  const evalsSummary = evaluations.slice(0, 15).map(e => `"${e.title}" (${e.isArchived ? 'archivada' : 'activa'})`).join(', ');
  const tasksSummary = tasks.slice(0, 12).map(t => `"${t.title || 'Sin título'}" (${t.targetGroupName || 'Global'})`).join(', ');
  const customKnowledge = Array.isArray(teacherBotInfoList) && teacherBotInfoList.length > 0
    ? `\nCONOCIMIENTO ADICIONAL DEL DOCENTE:\n${teacherBotInfoList.map(i => `- ${i.text || i}`).join('\n')}`
    : '';

  const prompt = `Eres el Asistente Pedagógico y Ejecutivo personal de ${teacherName} en English TECH.
Hablas como un colega humano cercano, cálido, respetuoso, proactivo y súper resolutivo en español natural de Colombia (sin sonar robótico ni frío).

FECHA ACTUAL: ${nowString}

CONTEXTO EN VIVO DE LA PLATAFORMA:
- Grupos académicos (${academicGroups.length}): ${groupsSummary || 'Ninguno aún'}
- Estudiantes (${students.length}): ${studsSummary || 'Ninguno'}
- Muro/Tareas (${tasks.length}): ${tasksSummary || 'Sin publicaciones'}
- Evaluaciones (${evaluations.length}): ${evalsSummary || 'Sin evaluaciones'}
- Libros 3D (${books.length}), Diapositivas (${reviews.length}), Vídeos (${videos.length}), Sílabo (${syllabus.length} semanas), Notas (${grades.length})${customKnowledge}

REGLAS DE CONVERSACIÓN HUMANA (MUY IMPORTANTE):
1. Responde SIEMPRE en JSON válido dentro de \`\`\`json ... \`\`\` con esta estructura exacta:
{
  "action": "NOMBRE_ACCION" | null,
  "params": { ... },
  "messages": [
    "Primer mensaje natural y cercano.",
    "Segundo mensaje opcional continuando la charla o preguntando qué sigue..."
  ],
  "quickReplies": [
    { "label": "Texto corto del botón", "value": "Mensaje que enviará al hacer clic" }
  ]
}
2. MENSAJES MÚLTIPLES: Cuando sea natural (como haría una persona en WhatsApp o chat), divide tu respuesta en 2 burbujas cortas en "messages" (máximo 3). Por ejemplo: primero confirmas o saludas con calidez, y en el segundo mensaje haces la siguiente pregunta o propones cómo seguir.
3. SALUDOS Y CHARLA NORMAL: Si el docente solo saluda ("hola", "buenas", "cómo estás"), responde ÚNICAMENTE con un saludo cálido y humano, pregúntale cómo va todo o en qué le ayudas hoy y ofrece "quickReplies" útiles, con "action": null. NUNCA sueltes reportes de tareas pendientes si no te lo pidió.
4. FLUJOS GUIADOS PASO A PASO CON BOTONES ("quickReplies"):
   Si el docente dice "quiero hacer un libro", "quiero subir unas diapositivas", "quiero publicar un video", "quiero subir contenidos programáticos", "quiero hacer una evaluación", "quiero hacer un Kahoot" o "quiero hacer una encuesta", y TODAVÍA faltan detalles (como el grupo o el método):
   - NO ejecutes la publicación de golpe ni inventes datos.
   - Usa "action": null, responde amablemente guiando el paso actual (ejemplo: "¿Quieres subir el PDF o lo creamos juntos con IA? ¿Para qué grupo sería?") e incluye botones en "quickReplies" con las opciones reales Y los nombres reales de los grupos (${academicGroups.map(g => g.name).join(', ') || 'General'}).
   - Cuando ya tengas los datos necesarios (por ejemplo ya te dijo grupo y tema/método), SÍ ejecuta la acción correspondiente!
5. ACCIONES INMEDIATAS (no preguntes de más):
   - Pide abrir temporizador -> "action": "open_floating_tool", params: { "tool": "timer" }
   - Pide tirar/lanzar la moneda -> "action": "flip_coin" (la tira ahí mismo en el chat).
   - Pide calcular una operación ("cuánto es 24 por 15", "divide 500 entre 8") -> "action": "calculate_and_open", params: { "expression": "24 * 15" } (calcula en el chat Y abre la calculadora flotante).
   - Pide revisar pendientes por calificar (tareas, foros o evaluaciones) -> "action": "pending_submissions".
6. Nunca uses asteriscos dobles (**) ni formato markdown dentro de los strings de "messages".

CATÁLOGO COMPLETO DE ACCIONES:
1. HERRAMIENTAS EN CHAT Y FLOTANTES:
   - "flip_coin": params { "openFloating": false } (lanza moneda animada en el chat)
   - "calculate_and_open": params { "expression": "..." } (calcula el resultado en el chat y abre la calculadora flotante)
   - "open_floating_tool": params { "tool": "timer" | "coin" | "calculator" }
   - "close_floating_tool": params { "tool": "timer" | "coin" | "calculator" | "all" }
   - "minimize_floating_tool": params { "tool": "timer" | "coin" | "calculator" }

2. LIBROS 3D, DIAPOSITIVAS, VÍDEOS Y SÍLABO:
   - "create_book_ai": params { "title": "...", "topic": "...", "language": "Inglés" | "Español" | "Francés" | "Bilingüe", "pageCount": 6, "targetGroupName": "..." } (crea y publica un libro 3D real con IA)
   - "open_book_creator": params { "mode": "ai" | "pdf", "targetGroupName": "..." } (abre Biblioteca/creación de libro PDF)
   - "open_slides_studio": params { "mode": "powerpoint" | "google_slides" | "ai", "targetGroupName": "..." } (abre Diapositivas)
   - "open_videos_module": params { "targetGroupName": "..." } (abre Vídeos)
   - "open_syllabus_pdf": params { "targetGroupName": "..." } (abre modal para subir PDF de Contenidos Programáticos)
   - "open_syllabus_form": params { "targetGroupName": "..." } (abre formulario manual de Contenidos Programáticos)
   - "open_lesson_plans": params {} (abre el planeador pedagógico)
   - "add_syllabus_week": params { "week": 1, "unit": "...", "topic": "...", "description": "...", "activities": "...", "targetGroupName": "..." }

3. EVALUACIONES, KAHOOT, ENCUESTAS Y MURO:
   - "open_create_eval": params { "title": "...", "description": "...", "timeLimit": 30, "dueDate": "YYYY-MM-DD", "targetGroupName": "...", "mode": "ai" | "manual" | "bank" }
   - "publish_poll": params { "title": "Pregunta...", "options": ["Opción 1", "Opción 2"], "isMultipleChoice": false, "targetGroupName": "..." }
   - "open_poll_composer": params { "title": "...", "targetGroupName": "..." }
   - "publish_kahoot_ai": params { "topic": "...", "numQuestions": 5, "targetGroupName": "..." } (genera y publica un Kahoot en vivo real para el grupo)
   - "open_kahoot_composer": params { "title": "...", "targetGroupName": "..." }
   - "publish_task": params { "title": "...", "description": "...", "postType": "task" | "forum" | "post", "targetGroupName": "...", "dueDate": "YYYY-MM-DD" }
   - "delete_task": params { "title": "..." }
   - "pending_submissions": params {} (revisa tareas, foros y evaluaciones pendientes por calificar)

4. NOTAS, GRUPOS, REPORTES Y AJUSTES:
   - "create_note": params { "title": "...", "content": "...", "scope": "private" | "shared", "format": "sticky" | "sheet", "color": "yellow" | "blue" | "pink" | "green" }
   - "list_notes": params {}
   - "archive_evaluation": params { "title": "...", "archive": true | false }
   - "eval_stats": params { "title": "..." }
   - "create_group": params { "name": "...", "type": "chat" | "academic" }
   - "list_groups": params {}
   - "student_report": params { "name": "..." }
   - "students_at_risk": params {}
   - "top_students": params {}
   - "grade_report": params {}
   - "syllabus_info": params { "week": 1 }
   - "generate_activity": params { "topic": "...", "level": "A1|A2|B1|B2" }
   - "generate_lesson_plan": params { "topic": "...", "duration": 60 }
   - "generate_quiz": params { "topic": "...", "num_questions": 5 }
   - "navigate_tab": params { "tab": "tasks" | "evaluations" | "notes" | "books" | "videos" | "syllabus" | "reviews" | "groups" | "directory" | "inbox" | "tools" | "profile" | "settings" }
   - "set_theme": params { "theme": "dim" | "light" | "lights_out" }
   - "set_sound": params { "enabled": true | false }
   - "set_notifications": params { "enabled": true | false }
   - "logout": params {}

HISTORIAL RECIENTE:
${history.slice(-12).map(m => `${m.role === 'user' ? teacherName : 'Asistente'}: ${m.text}`).join('\n')}

${teacherName}: ${userMessage}
Asistente (responde en JSON):`;

  return prompt;
}

/**
 * 6. Ejecutor Enriquecido de Acciones (retorna messages[], quickReplies[], widget, text)
 */
export async function executeTeacherAssistantActionRich(parsed, context) {
  const action = parsed?.action;
  const params = parsed?.params || {};
  const aiMessages = normalizeMessagesArray(parsed?.messages, parsed?.response || '');
  const aiQuickReplies = normalizeQuickReplies(parsed?.quickReplies);

  let outMessages = [];
  let outQuickReplies = aiQuickReplies;
  let outWidget = parsed?.widget || null;

  const {
    setThemeMode = () => {},
    setSoundEnabled = () => {},
    soundEnabledRef,
    setPushEnabled = () => {},
    togglePushNotifications = () => {},
    handleLogout = () => {},
    changeTab = () => {},
    openFloatingTool = () => {},
    closeFloatingTool = () => {},
    setMinimizedFloatingTools = () => {},
    academicGroups = [],
    tasks = [],
    setTasks = () => {},
    evaluations = [],
    grades = [],
    rawNotes = [],
    setRawNotes = () => {},
    syllabus = [],
    setSyllabus = () => {},
    setRawBooks = () => {},
    suggestions = [],
    userMappings = {},
    myChatId = 'teacher',
    loggedInName = 'Docente',
    role = 'teacher',
    db,
    appId,
    isDemoMode = false,
    DEMO_TTL_MS = 1000 * 60 * 60 * 12,
    saveDemoSandboxItem = () => {},
    removeDemoSandboxItem = () => {},
    setPostType = () => {},
    setTaskTitle = () => {},
    setTaskDesc = () => {},
    setPostTargetGroup = () => {},
    setIsFormExpanded = () => {},
    setIsCreatingEval = () => {},
    setEvalFormData = () => {},
    setShowAiEvalModal = () => {},
    setShowQuestionBankModal = () => {},
    setShowAddSyllabus = () => {},
    setShowPdfSyllabusModal = () => {},
    setShowLessonPlansModal = () => {},
    setSyllabusPdfTargetGroup = () => {},
    setChatGroups = () => {},
    callGemini,
    showMessage = () => {},
    confirmAction = () => {},
    addDoc,
    setDoc,
    doc,
    collection,
    toggleArchiveEvaluation,
    deleteAllStorageFilesInObject,
    deleteDoc,
    sanitizeFirestoreData = defaultSanitizeFirestore
  } = context || {};

  const finalize = (defaultMsgList, defaultReplies = []) => {
    const msgs = outMessages.length > 0
      ? outMessages
      : (aiMessages.length > 0 ? aiMessages : normalizeMessagesArray(defaultMsgList));
    const replies = outQuickReplies.length > 0 ? outQuickReplies : normalizeQuickReplies(defaultReplies);
    return {
      messages: msgs,
      quickReplies: replies,
      widget: outWidget,
      text: msgs.join('\n\n')
    };
  };

  switch (action) {
    // =========================================================================
    // A. APARIENCIA Y CONFIGURACIÓN
    // =========================================================================
    case 'dark_on':
      setThemeMode('dim');
      return finalize(['Listo profe, activé el modo oscuro para que descanses la vista.']);

    case 'dark_off':
      setThemeMode('light');
      return finalize(['Listo, cambié la plataforma al modo claro.']);

    case 'lights_out':
      setThemeMode('lights_out');
      return finalize(['Modo Lights Out (negro puro) activado.']);

    case 'set_theme': {
      if (params.theme === 'lights_out') {
        setThemeMode('lights_out');
        return finalize(['Modo Lights Out (negro puro) activado.']);
      }
      if (params.theme === 'dim' || params.theme === 'dark') {
        setThemeMode('dim');
        return finalize(['Modo oscuro activado con éxito.']);
      }
      setThemeMode('light');
      return finalize(['Modo claro activado con éxito.']);
    }

    case 'sound_on':
      setSoundEnabled(true);
      if (soundEnabledRef) soundEnabledRef.current = true;
      try { localStorage.setItem('englishTech_sound', 'true'); } catch (e) {}
      return finalize(['Efectos de sonido activados.']);

    case 'sound_off':
      setSoundEnabled(false);
      if (soundEnabledRef) soundEnabledRef.current = false;
      try { localStorage.setItem('englishTech_sound', 'false'); } catch (e) {}
      return finalize(['Efectos de sonido silenciados.']);

    case 'set_sound':
      if (params.enabled === false) {
        setSoundEnabled(false);
        if (soundEnabledRef) soundEnabledRef.current = false;
        try { localStorage.setItem('englishTech_sound', 'false'); } catch (e) {}
        return finalize(['Efectos de sonido silenciados.']);
      }
      setSoundEnabled(true);
      if (soundEnabledRef) soundEnabledRef.current = true;
      try { localStorage.setItem('englishTech_sound', 'true'); } catch (e) {}
      return finalize(['Efectos de sonido activados.']);

    case 'push_on':
      togglePushNotifications();
      return finalize(['Notificaciones push procesadas/habilitadas.']);

    case 'push_off':
      setPushEnabled(false);
      try { localStorage.setItem('englishTech_push', 'false'); } catch (e) {}
      return finalize(['Notificaciones push desactivadas.']);

    case 'set_notifications':
      if (params.enabled === false) {
        setPushEnabled(false);
        try { localStorage.setItem('englishTech_push', 'false'); } catch (e) {}
        return finalize(['Notificaciones push desactivadas.']);
      }
      togglePushNotifications();
      return finalize(['Notificaciones push habilitadas.']);

    case 'logout':
      confirmAction('¿Deseas cerrar tu sesión actual?', handleLogout);
      return finalize(['Preparé la confirmación para cerrar tu sesión actual.']);

    // =========================================================================
    // B. HERRAMIENTAS EN CHAT Y FLOTANTES
    // =========================================================================
    case 'flip_coin': {
      const side = Math.random() < 0.5 ? 'heads' : 'tails';
      const label = side === 'heads' ? 'Cara' : 'Sello';
      outWidget = { type: 'coin', side, label, id: Date.now() };
      if (params.openFloating) openFloatingTool('coin');
      outMessages = [
        `¡Ahí va la moneda al aire! Cayó en ${label}.`,
        '¿La tiramos otra vez o la necesitas en ventana flotante para proyectar en clase?'
      ];
      return finalize(outMessages, [
        { label: 'Tirar otra vez', value: 'Tira la moneda otra vez' },
        { label: 'Abrir moneda flotante', value: 'Abre la moneda en ventana flotante' }
      ]);
    }

    case 'calculate_and_open': {
      const rawExpr = params.expression || params.query || '';
      const calc = evaluateMathExpression(rawExpr);
      openFloatingTool('calculator');
      if (calc.ok) {
        outWidget = { type: 'calculator', expression: calc.expression, result: calc.formattedResult };
        outMessages = [
          `El resultado de ${calc.expression} es ${calc.formattedResult}.`,
          'También te dejé la calculadora abierta en ventana flotante por si necesitas seguir haciendo cuentas.'
        ];
      } else {
        outMessages = [
          calc.error === 'No se puede dividir entre cero.'
            ? 'Ojo profe, no es posible dividir entre cero, pero ya te abrí la calculadora flotante.'
            : 'Ya te abrí la calculadora en ventana flotante para hacer tus operaciones.'
        ];
      }
      return finalize(outMessages, [
        { label: 'Abrir temporizador', value: 'Pon el temporizador flotante' },
        { label: 'Tirar moneda', value: 'Tira una moneda' }
      ]);
    }

    case 'open_floating_tool': {
      const tool = String(params.tool || 'calculator').toLowerCase();
      if (tool.includes('timer') || tool.includes('temporizador') || tool.includes('cronometro')) {
        openFloatingTool('timer');
        return finalize([
          'Listo profe, ya te abrí el Temporizador en una ventana flotante.',
          'Puedes moverlo por la pantalla mientras proyectas o explicas la clase. ¿Necesitas algo más?'
        ], [
          { label: 'Tirar moneda', value: 'Tira una moneda' },
          { label: 'Abrir calculadora', value: 'Abre la calculadora flotante' }
        ]);
      }
      if (tool.includes('coin') || tool.includes('moneda')) {
        openFloatingTool('coin');
        return finalize(['Listo, abrí la Moneda 3D en ventana flotante para ti.']);
      }
      openFloatingTool('calculator');
      return finalize(['Listo, ya tienes la Calculadora abierta en ventana flotante.']);
    }

    case 'close_floating_tool': {
      const tool = String(params.tool || 'all').toLowerCase();
      if (tool === 'all') {
        closeFloatingTool('timer');
        closeFloatingTool('coin');
        closeFloatingTool('calculator');
        return finalize(['Cerré todas las herramientas flotantes.']);
      }
      closeFloatingTool(tool);
      return finalize([`Herramienta ${tool} cerrada.`]);
    }

    case 'minimize_floating_tool': {
      const tool = String(params.tool || 'timer').toLowerCase();
      setMinimizedFloatingTools(prev => ({ ...prev, [tool]: true }));
      return finalize([`Herramienta ${tool} minimizada en la esquina inferior.`]);
    }

    // =========================================================================
    // C. NAVEGACIÓN TOTAL
    // =========================================================================
    case 'navigate_tab':
    case 'navigate_TASKS':
    case 'navigate_REVIEWS':
    case 'navigate_BOOKS':
    case 'navigate_NOTES':
    case 'navigate_VIDEOS':
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
        reviews: 'las Diapositivas',
        books: 'la Biblioteca de Libros 3D',
        videos: 'el módulo de Vídeos',
        notes: 'el Cuaderno de Notas',
        syllabus: 'los Contenidos Programáticos y Sílabo',
        evaluations: 'las Evaluaciones',
        groups: 'los Grupos',
        directory: 'el Directorio de Estudiantes',
        inbox: 'los Mensajes',
        tools: 'las Herramientas',
        profile: 'tu Perfil',
        settings: 'los Ajustes'
      };
      return finalize([`Listo, ya te llevé a ${tabNames[targetTab] || targetTab}.`]);
    }

    // =========================================================================
    // D. LIBROS 3D, DIAPOSITIVAS, VÍDEOS Y SÍLABO (FLUJOS GUIADOS Y REALES)
    // =========================================================================
    case 'open_book_creator': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      if (params.mode === 'wall') {
        setPostType('book3d');
        if (grp) setPostTargetGroup(grp.id);
        setIsFormExpanded(true);
        changeTab('tasks');
        outMessages = [
          `¡Perfecto! Abrí el creador de Libro 3D directo en el Muro${grp ? ` para ${grp.name}` : ''}.`,
          'Desde ahí puedes generarlo con IA o subir tu PDF y elegir el tema visual.'
        ];
      } else {
        changeTab('books');
        outMessages = [
          `¡De una! Ya te llevé a la Biblioteca de Libros 3D${grp ? ` (grupo sugerido: ${grp.name})` : ''}.`,
          params.mode === 'pdf'
            ? 'Solo dale a "Nuevo Libro" y selecciona la pestaña de subir PDF.'
            : 'Si prefieres que yo cree un libro completo con IA ahora mismo, dime el tema y el grupo.'
        ];
      }
      return finalize(outMessages, [
        { label: 'Crearlo con IA aquí', value: `Créame un libro 3D con IA${grp ? ` para ${grp.name}` : ''}` }
      ]);
    }

    case 'create_book_ai': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      const resolvedGroupId = grp?.id || 'all';
      const resolvedGroupName = grp?.name || 'Global';
      const title = cleanDisplayText(params.title || params.topic || 'English Interactive Guide');
      const topic = cleanDisplayText(params.topic || title);
      const language = params.language || 'Inglés';
      const pageCount = Math.max(4, Math.min(12, Number(params.pageCount) || 6));
      const now = Date.now();
      const bookId = `book_${now}`;

      try {
        const aiResult = await generateAiBookPages({
          title,
          topic,
          instructions: params.description || '',
          language,
          pageCount,
          themeId: 'royal-indigo',
          author: loggedInName || 'Docente',
          callGemini
        });

        const pages = Array.isArray(aiResult?.pages) ? aiResult.pages : [];
        const pageTexts = Array.isArray(aiResult?.pageTexts) ? aiResult.pageTexts : [];
        const bookOutline = Array.isArray(aiResult?.outline) ? aiResult.outline : [];

        const bookPayload = sanitizeBookForFirestore({
          id: bookId,
          title,
          description: params.description || `Libro interactivo creado con IA sobre ${topic}`,
          category: 'textbook',
          theme: 'royal-indigo',
          aiLanguage: language,
          aiPageCount: pageCount,
          bookPages: pages,
          pageTexts,
          bookOutline,
          coverUrl: pages[0] || '',
          pageCount: pages.length,
          aspectRatio: 0.707,
          targetGroupId: resolvedGroupId,
          targetGroupName: resolvedGroupName,
          author: loggedInName || 'Docente',
          authorName: loggedInName || 'Docente',
          authorId: myChatId || 'teacher',
          createdBy: myChatId || 'teacher',
          teacherId: myChatId || 'teacher',
          ownerTeacherId: myChatId || 'teacher',
          createdAt: now,
          updatedAt: now,
          isDemoCreated: Boolean(isDemoMode)
        });

        const wallTaskId = `book_wall_${bookId}`;
        const wallTaskPayload = {
          id: wallTaskId,
          type: 'book3d',
          bookId,
          title: bookPayload.title,
          description: bookPayload.description,
          category: 'textbook',
          bookCategory: 'textbook',
          theme: 'royal-indigo',
          bookTheme: 'royal-indigo',
          bookPages: bookPayload.bookPages,
          pageTexts: bookPayload.pageTexts || [],
          bookOutline: bookPayload.bookOutline || [],
          coverUrl: bookPayload.coverUrl,
          pageCount: bookPayload.pageCount,
          aspectRatio: 0.707,
          targetGroupId: resolvedGroupId,
          targetGroupName: resolvedGroupName,
          author: bookPayload.authorName,
          authorName: bookPayload.authorName,
          authorId: myChatId || 'teacher',
          authorRole: 'teacher',
          createdBy: myChatId || 'teacher',
          teacherId: myChatId || 'teacher',
          ownerTeacherId: myChatId || 'teacher',
          createdAt: now,
          updatedAt: now,
          reactions: {},
          comments: [],
          isDeletedFromWall: false,
          isDemoCreated: Boolean(isDemoMode)
        };

        setRawBooks(prev => [bookPayload, ...(Array.isArray(prev) ? prev : [])]);
        setTasks(prev => [wallTaskPayload, ...(Array.isArray(prev) ? prev : [])]);

        if (isDemoMode) {
          saveDemoSandboxItem('books', bookPayload);
          saveDemoSandboxItem('tasks', wallTaskPayload);
        } else if (db && setDoc && doc) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', bookId), sanitizeFirestoreData(bookPayload), { merge: true });
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', wallTaskId), sanitizeFirestoreData(wallTaskPayload), { merge: true });
        }

        changeTab('books');
        showMessage(`Libro "${title}" creado y publicado para ${resolvedGroupName}.`);
        return finalize([
          `¡Listo profe! Creé el libro 3D "${title}" (${pages.length} páginas) y lo publiqué para ${resolvedGroupName}.`,
          'Ya te llevé a la Biblioteca para que lo revises o lo edites cuando quieras.'
        ], [
          { label: 'Ir al Muro', value: 'Llévame al muro principal' },
          { label: 'Crear evaluación del libro', value: `Quiero hacer una evaluación sobre ${topic} para ${resolvedGroupName}` }
        ]);
      } catch (err) {
        console.error('Error creando libro 3D con asistente:', err);
        changeTab('books');
        return finalize(['Tuve un inconveniente creando las páginas automáticamente, pero ya te abrí la Biblioteca de Libros 3D para que puedas crearlo directo.']);
      }
    }

    case 'open_slides_studio': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      changeTab('reviews');
      const modeText = params.mode === 'powerpoint'
        ? 'importar o subir tu PowerPoint'
        : params.mode === 'google_slides'
        ? 'enlazar tu presentación de Google Slides'
        : 'crear tus diapositivas con IA o desde cero';
      return finalize([
        `¡Perfecto! Te llevé al Estudio de Diapositivas para ${modeText}${grp ? ` dirigido a ${grp.name}` : ''}.`,
        'Pulsa el botón para crear o subir la presentación y elige el grupo al guardar.'
      ]);
    }

    case 'open_videos_module': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      changeTab('videos');
      return finalize([
        `¡De una profe! Ya abrí el módulo de Vídeos${grp ? ` para publicar en ${grp.name}` : ''}.`,
        'Solo haz clic en subir o agregar enlace de YouTube y selecciona el grupo correspondiente.'
      ]);
    }

    case 'open_syllabus_pdf': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      changeTab('syllabus');
      if (grp) setSyllabusPdfTargetGroup(grp.id);
      setShowPdfSyllabusModal(true);
      return finalize([
        `Listo, abrí el asistente para importar Contenidos Programáticos desde PDF${grp ? ` para ${grp.name}` : ''}.`,
        'Solo arrastra o selecciona tu archivo PDF y la IA extraerá las semanas automáticamente.'
      ]);
    }

    case 'open_syllabus_form': {
      changeTab('syllabus');
      setShowAddSyllabus(true);
      return finalize(['¡Listo! Abrí el formulario para añadir un nuevo tema al Sílabo / Contenidos Programáticos.']);
    }

    case 'open_lesson_plans': {
      changeTab('syllabus');
      setShowLessonPlansModal(true);
      return finalize(['Abrí el Planeador de Clases dentro de Contenidos Programáticos para ti.']);
    }

    case 'add_syllabus_week': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      const weekVal = Math.max(1, parseInt(params.week, 10) || ((syllabus?.length || 0) + 1));
      const unitVal = cleanDisplayText(params.unit || `Unidad ${weekVal}`);
      const topicVal = cleanDisplayText(params.topic || 'Nuevo tema');
      const descVal = cleanDisplayText(params.description || '');
      const actVal = cleanDisplayText(params.activities || '');
      const now = Date.now();
      const payload = {
        week: weekVal,
        unit: unitVal,
        topic: topicVal,
        description: descVal,
        activities: actVal,
        targetGroupId: grp?.id || 'all',
        targetGroupName: grp?.name || 'General',
        teacherId: myChatId || 'teacher',
        createdBy: myChatId || 'teacher',
        createdAt: now
      };
      if (isDemoMode) {
        const createdItem = { id: `demo_syl_${now}`, ...payload, expiresAt: now + DEMO_TTL_MS, isDemoCreated: true };
        saveDemoSandboxItem('syllabus', createdItem);
        setSyllabus(prev => [createdItem, ...(Array.isArray(prev) ? prev : [])].sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0)));
      } else if (db && addDoc && collection) {
        const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), sanitizeFirestoreData(payload));
        setSyllabus(prev => [{ id: ref.id, ...payload }, ...(Array.isArray(prev) ? prev : [])].sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0)));
      }
      changeTab('syllabus');
      showMessage(`Semana ${weekVal} ("${topicVal}") añadida al sílabo.`);
      return finalize([
        `¡Listo! Agregué la Semana ${weekVal}: "${topicVal}" en Contenidos Programáticos para ${payload.targetGroupName}.`,
        '¿Deseas agregar otra semana o abrir el planeador de clases?'
      ]);
    }

    // =========================================================================
    // E. MURO, TAREAS, ENCUESTAS, KAHOOT Y PENDIENTES
    // =========================================================================
    case 'publish_task':
    case 'create_task': {
      const title = cleanDisplayText(params.title || 'Nueva actividad');
      const desc = cleanDisplayText(params.description || '');
      const pType = params.postType || (params.dueDate ? 'task' : 'post');
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      const targetGrpId = grp?.id || 'all';
      const targetGrpName = grp?.name || 'Todas las materias (General)';

      const newTaskPayload = {
        type: pType,
        title,
        description: desc,
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
      } else if (db && addDoc && collection) {
        try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), sanitizeFirestoreData(newTaskPayload));
          newTaskPayload.id = docRef.id;
          setTasks(prev => [newTaskPayload, ...(prev || [])]);
        } catch (err) {
          console.error('Error al publicar tarea con el asistente:', err);
        }
      }

      changeTab('tasks');
      showMessage(`Publicación "${title}" creada con éxito.`);
      return finalize([
        `¡Listo profe! Publiqué "${title}" en el muro para ${targetGrpName}.`,
        '¿Necesitas que preparemos otro recurso o evaluación para ese grupo?'
      ]);
    }

    case 'publish_poll': {
      const title = cleanDisplayText(params.title || params.question || 'Encuesta para la clase');
      const rawOptions = Array.isArray(params.options) ? params.options : [];
      const validOptions = rawOptions.map(o => cleanDisplayText(o)).filter(Boolean);
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);

      if (validOptions.length < 2) {
        setPostType('poll');
        setTaskTitle(title);
        if (grp) setPostTargetGroup(grp.id);
        setIsFormExpanded(true);
        changeTab('tasks');
        return finalize([
          `Abrí el creador de Encuestas con el título "${title}"${grp ? ` para ${grp.name}` : ''}.`,
          'Solo agrega al menos 2 opciones de respuesta y publícala.'
        ]);
      }

      const now = Date.now();
      const pollPayload = {
        type: 'poll',
        title,
        description: cleanDisplayText(params.description || ''),
        authorName: loggedInName || 'Docente',
        authorId: myChatId || 'teacher',
        authorRole: role || 'teacher',
        teacherId: myChatId || 'teacher',
        ownerTeacherId: myChatId || 'teacher',
        targetGroupId: grp?.id || 'all',
        targetGroupName: grp?.name || 'Todas las materias (General)',
        poll: {
          isMultipleChoice: Boolean(params.isMultipleChoice),
          options: validOptions.map((optText, idx) => ({
            id: `opt_${now}_${idx}`,
            text: optText,
            voterIds: []
          }))
        },
        allowLate: false,
        createdAt: now,
        comments: [],
        reactions: {}
      };

      if (isDemoMode) {
        pollPayload.id = `demo-poll-${now}`;
        pollPayload.isDemoCreated = true;
        saveDemoSandboxItem('tasks', pollPayload);
        setTasks(prev => [pollPayload, ...(prev || [])]);
      } else if (db && addDoc && collection) {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), sanitizeFirestoreData(pollPayload));
        pollPayload.id = docRef.id;
        setTasks(prev => [pollPayload, ...(prev || [])]);
      }

      changeTab('tasks');
      showMessage(`Encuesta "${title}" publicada con éxito.`);
      return finalize([
        `¡Hecho! Publiqué la encuesta "${title}" con ${validOptions.length} opciones para ${pollPayload.targetGroupName}.`,
        'Ya los estudiantes pueden votar desde el muro. ¿Te ayudo con algo más?'
      ]);
    }

    case 'open_poll_composer': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      setPostType('poll');
      if (params.title) setTaskTitle(cleanDisplayText(params.title));
      if (grp) setPostTargetGroup(grp.id);
      setIsFormExpanded(true);
      changeTab('tasks');
      return finalize([
        `Listo, abrí el creador de Encuestas en el Muro${grp ? ` para ${grp.name}` : ''}.`
      ]);
    }

    case 'publish_kahoot_ai': {
      const topic = cleanDisplayText(params.topic || params.title || 'English Review');
      const numQuestions = Math.max(3, Math.min(20, Number(params.numQuestions || params.num_questions) || 5));
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      const targetGrpId = grp?.id || 'all';
      const targetGrpName = grp?.name || 'Todas las materias (General)';

      try {
        const kahootPrompt = construirPromptKahootIA({
          tema: topic,
          cantidad: numQuestions,
          idioma: params.language || 'en',
          dificultad: params.difficulty || 'intermedio',
          tiempoPorPregunta: 20,
          soloAcertijos: false
        });
        const aiRaw = typeof callGemini === 'function' ? await callGemini(kahootPrompt, 90000) : '';
        const parsedQuestions = parsearKahootIA(aiRaw, 20, 0, {});

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          setPostType('kahoot');
          setTaskTitle(`Kahoot: ${topic}`);
          if (grp) setPostTargetGroup(grp.id);
          setIsFormExpanded(true);
          changeTab('tasks');
          return finalize([
            `Abrí el constructor de Kahoot para "${topic}" en ${targetGrpName}.`,
            'Puedes darle a generar con IA allí mismo o ajustar las preguntas antes de lanzar la sala.'
          ]);
        }

        const pin = generateKahootPin();
        const now = Date.now();
        const kahootPayload = {
          type: 'kahoot',
          title: cleanDisplayText(params.title || `Kahoot: ${topic}`),
          description: cleanDisplayText(params.description || `Juego en vivo sobre ${topic}`),
          authorName: loggedInName || 'Docente',
          authorId: myChatId || 'teacher',
          authorRole: role || 'teacher',
          teacherId: myChatId || 'teacher',
          ownerTeacherId: myChatId || 'teacher',
          targetGroupId: targetGrpId,
          targetGroupName: targetGrpName,
          kahoot: {
            pin,
            status: 'live',
            phase: 'lobby',
            currentQuestionIndex: 0,
            questionStartedAt: 0,
            isPublicLinkEnabled: true,
            allowAnonymousGuest: true,
            questions: parsedQuestions,
            participants: {}
          },
          allowLate: false,
          createdAt: now,
          comments: [],
          reactions: {}
        };

        if (isDemoMode) {
          kahootPayload.id = `demo-kahoot-${now}`;
          kahootPayload.isDemoCreated = true;
          saveDemoSandboxItem('tasks', kahootPayload);
          setTasks(prev => [kahootPayload, ...(prev || [])]);
        } else if (db && addDoc && collection) {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), sanitizeFirestoreData(kahootPayload));
          kahootPayload.id = docRef.id;
          setTasks(prev => [kahootPayload, ...(prev || [])]);
        }

        changeTab('tasks');
        showMessage(`Kahoot "${kahootPayload.title}" publicado (PIN: ${pin}).`);
        return finalize([
          `¡Brutal profe! Generé y publiqué un Kahoot de ${parsedQuestions.length} preguntas sobre "${topic}" para ${targetGrpName}.`,
          `El PIN de acceso en vivo es ${pin}. Ya lo puedes abrir desde el muro cuando los estudiantes estén listos.`
        ]);
      } catch (err) {
        console.error('Error publicando Kahoot con IA:', err);
        setPostType('kahoot');
        if (grp) setPostTargetGroup(grp.id);
        setIsFormExpanded(true);
        changeTab('tasks');
        return finalize(['Abrí el constructor de Kahoot en el Muro para que podamos terminarlo directamente allí.']);
      }
    }

    case 'open_kahoot_composer': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      setPostType('kahoot');
      if (params.title) setTaskTitle(cleanDisplayText(params.title));
      if (grp) setPostTargetGroup(grp.id);
      setIsFormExpanded(true);
      changeTab('tasks');
      return finalize([`Listo, abrí el creador de Kahoot en el Muro${grp ? ` para ${grp.name}` : ''}.`]);
    }

    case 'list_tasks':
      return finalize([
        `Tienes ${tasks.length} publicaciones/tareas en el muro:\n${tasks.slice(0, 10).map((t, i) => `${i + 1}. "${t.title || 'Sin título'}" (${t.targetGroupName || 'Global'})`).join('\n')}`
      ]);

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
          return finalize([`Te envié el cuadro de confirmación para eliminar "${t.title}".`]);
        }
        return finalize([`No encontré ninguna publicación con el título "${params.title}".`]);
      }
      return finalize(['Dime el título de la publicación que quieres eliminar.']);
    }

    case 'check_pending_grading':
    case 'pending_submissions': {
      const report = computePendingGradingReport({ tasks, evaluations, grades, suggestions });
      if (report.totalAllPending === 0 && report.unreadSuggestions === 0) {
        return finalize([
          '¡Todo al día profe! Revisé tus tareas, foros y evaluaciones activas, y no tienes entregas pendientes por calificar en este momento.',
          '¿Quieres que revisemos el promedio de algún grupo o preparamos una actividad nueva?'
        ], [
          { label: 'Estudiantes en riesgo', value: 'Muéstrame los estudiantes en riesgo' },
          { label: 'Cuadro de honor', value: 'Muéstrame los mejores promedios' }
        ]);
      }

      const lines = [];
      if (report.pendingTasks.length > 0) {
        lines.push(`Tareas y Foros (${report.totalTaskSubmissions} entregas sin calificar):`);
        report.pendingTasks.slice(0, 8).forEach(pt => {
          lines.push(`• [${pt.kind}] "${pt.title}" (${pt.group}): ${pt.count} pendiente(s)`);
        });
      }
      if (report.pendingEvaluations.length > 0) {
        lines.push(`${lines.length > 0 ? '\n' : ''}Evaluaciones con preguntas abiertas por calificar/retroalimentar (${report.totalEvalPending}):`);
        report.pendingEvaluations.slice(0, 8).forEach(pe => {
          lines.push(`• "${pe.title}" (${pe.group}): ${pe.count} de ${pe.totalSubmitted} entrega(s) por revisar`);
        });
      }
      if (report.unreadSuggestions > 0) {
        lines.push(`${lines.length > 0 ? '\n' : ''}Buzón de sugerencias: ${report.unreadSuggestions} mensaje(s) sin leer.`);
      }

      const replies = [];
      if (report.pendingTasks.length > 0) replies.push({ label: 'Ir al Muro', value: 'Llévame al muro de tareas' });
      if (report.pendingEvaluations.length > 0) replies.push({ label: 'Ir a Evaluaciones', value: 'Llévame a evaluaciones' });
      replies.push({ label: 'Ver promedios generales', value: 'Dame el reporte general de notas' });

      return finalize([
        `Aquí tienes el resumen exacto de lo que tienes pendiente por revisar:\n\n${lines.join('\n')}`,
        '¿Quieres que te lleve directo a calificar alguno de estos apartados?'
      ], replies);
    }

    // =========================================================================
    // F. NOTAS Y CUADERNO
    // =========================================================================
    case 'create_note': {
      const noteTitle = cleanDisplayText(params.title || 'Nota rápida');
      const noteContent = cleanDisplayText(params.content || '');
      const noteScope = params.scope === 'private' ? 'private' : 'shared';
      const noteFormat = params.format === 'sheet' ? 'sheet' : 'sticky';
      const noteColor = params.color || 'yellow';

      const newNote = {
        title: noteTitle,
        content: noteContent,
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
      } else if (db && addDoc && collection) {
        try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), sanitizeFirestoreData(newNote));
          newNote.id = docRef.id;
          setRawNotes(prev => [newNote, ...(prev || [])]);
        } catch (e) {
          console.error('Error al crear nota con asistente:', e);
        }
      }

      showMessage(`Nota "${noteTitle}" guardada.`);
      return finalize([`¡Listo! Guardé la nota "${noteTitle}" (${noteScope === 'private' ? 'privada' : 'compartida'}) en tu cuaderno.`]);
    }

    case 'list_notes': {
      const visible = (Array.isArray(rawNotes) ? rawNotes : []).filter(n => !n?.isSoftDeleted);
      if (visible.length === 0) {
        return finalize(['Aún no tienes notas guardadas en tu cuaderno.']);
      }
      return finalize([
        `Tienes ${visible.length} nota(s) en tu cuaderno:\n${visible.slice(0, 8).map((n, i) => `${i + 1}. "${n.title || 'Sin título'}"`).join('\n')}`
      ]);
    }

    // =========================================================================
    // G. EVALUACIONES
    // =========================================================================
    case 'open_create_eval': {
      const grp = resolveAcademicGroup(academicGroups, params.targetGroupName || params.group);
      setEvalFormData({
        title: cleanDisplayText(params.title || 'Nueva Evaluación'),
        description: cleanDisplayText(params.description || ''),
        dueDate: params.dueDate || '',
        dueTime: '23:59',
        timeLimit: params.timeLimit || 30,
        strictAntiCheat: false,
        immediateFeedback: true,
        targetGroupId: grp?.id || 'all',
        targetGroupName: grp?.name || 'Todos los estudiantes (Global)',
        targetStudentIds: [],
        videoUrl: '',
        questions: [{ type: 'multiple', text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], correctAnswer: '' }]
      });
      setIsCreatingEval(true);
      changeTab('evaluations');

      const mode = String(params.mode || '').toLowerCase();
      if (mode === 'ai' || mode === 'ia') {
        setShowAiEvalModal(true);
        return finalize([
          `¡Perfecto! Ya te abrí el Generador de Evaluaciones con IA${grp ? ` para ${grp.name}` : ''}.`,
          'Solo escribe el tema, elige cuántas preguntas quieres y la IA las arma por ti.'
        ]);
      }
      if (mode === 'bank' || mode === 'banco') {
        setShowQuestionBankModal(true);
        return finalize([`Abrí el Banco de Preguntas en Evaluaciones${grp ? ` para ${grp.name}` : ''}.`]);
      }
      return finalize([
        `Listo profe, preparé el formulario de nueva evaluación${grp ? ` dirigido a ${grp.name}` : ''}.`,
        'Si prefieres que la armemos automáticamente con IA, dime y te abro el generador.'
      ], [
        { label: 'Generarla con IA', value: `Abre el generador de evaluación con IA${grp ? ` para ${grp.name}` : ''}` }
      ]);
    }

    case 'list_evaluations':
      return finalize([
        `Evaluaciones registradas (${evaluations.length}):\n${evaluations.map((e, i) => `${i + 1}. "${e.title || 'Sin título'}" (Vence: ${e.dueDate || 'Sin fecha'}, ${e.isArchived ? 'archivada' : 'activa'})`).join('\n')}`
      ]);

    case 'archive_eval':
    case 'archive_evaluation': {
      if (params.title) {
        const queryE = params.title.toLowerCase();
        const ev = evaluations.find(item => (item.title || '').toLowerCase().includes(queryE));
        if (ev) {
          const nextArchived = params.archive !== undefined ? params.archive : !ev.isArchived;
          await toggleArchiveEvaluation(ev.id, !nextArchived);
          return finalize([`Evaluación "${ev.title}" ${nextArchived ? 'archivada' : 'restaurada'} con éxito.`]);
        }
        return finalize([`No encontré ninguna evaluación que coincida con "${params.title}".`]);
      }
      return finalize(['Indícame el nombre de la evaluación que deseas archivar o restaurar.']);
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
          return finalize([`Estadísticas de "${ev.title}":\n• Presentaron: ${evGrades.length} estudiantes\n• Promedio general: ${avg}/5.0\n• Aprobados (>=3.0): ${passed}\n• Reprobados (<3.0): ${failed}`]);
        }
        return finalize([`No encontré la evaluación "${params.title}".`]);
      }
      return finalize(['Dime el título de la evaluación para mostrarte sus estadísticas.']);
    }

    // =========================================================================
    // H. GRUPOS Y CHATS
    // =========================================================================
    case 'create_group': {
      if (params.name) {
        const grpName = cleanDisplayText(params.name);
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
        } else if (db && addDoc && collection) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chatGroups'), {
            name: grpName,
            members: [myChatId],
            createdBy: myChatId,
            teacherId: myChatId,
            createdAt: Date.now()
          });
        }
        return finalize([`Creé el grupo de conversación "${grpName}".`]);
      }
      return finalize(['¿Qué nombre quieres ponerle al grupo?']);
    }

    // =========================================================================
    // I. REPORTES DE RENDIMIENTO Y ESTUDIANTES
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
          return finalize([`Reporte de ${params.name}:\n${details.join('\n')}\nPromedio acumulado: ${avg}/5.0`]);
        }
        return finalize([`No encontré calificaciones registradas para el estudiante "${params.name}".`]);
      }
      return finalize(['¿De qué estudiante quieres consultar el reporte?']);
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
        .map(([name, scores]) => ({ name, avg: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0 }))
        .filter(s => s.avg < 3.0)
        .sort((a, b) => a.avg - b.avg);

      if (atRisk.length === 0) {
        return finalize(['¡Buenas noticias! Ningún estudiante tiene promedio acumulado por debajo de 3.0.']);
      }
      return finalize([`Estudiantes con promedio menor a 3.0:\n${atRisk.map((s, i) => `${i + 1}. ${s.name}: ${s.avg.toFixed(1)}/5.0`).join('\n')}`]);
    }

    case 'grade_report': {
      const avg = grades.length > 0 ? (grades.reduce((s, g) => s + (Number(g.score) || 0), 0) / grades.length).toFixed(1) : 'N/A';
      return finalize([`Reporte global de notas:\n• Total registros: ${grades.length}\n• Promedio acumulado de la plataforma: ${avg}/5.0`]);
    }

    case 'list_groups':
      return finalize([
        `Grupos académicos registrados (${academicGroups.length}):\n${academicGroups.map((g, i) => `${i + 1}. ${g.name} (${Array.isArray(g.members) ? g.members.length : 0} miembros)`).join('\n')}`
      ]);

    case 'list_students': {
      const studs = Object.values(userMappings || {}).filter(u => u?.role === 'student');
      return finalize([
        `Estudiantes registrados (${studs.length}):\n${studs.slice(0, 25).map((s, i) => `${i + 1}. ${s.fullName || s.name || 'Sin nombre'}`).join('\n')}`
      ]);
    }

    case 'student_count': {
      const studs = Object.values(userMappings || {}).filter(u => u?.role === 'student');
      return finalize([`Actualmente hay ${studs.length} estudiantes registrados en la plataforma.`]);
    }

    case 'syllabus_summary':
      return finalize([`Sílabo académico (${syllabus.length} semanas registradas):\n${syllabus.map(s => `• Sem ${s.week}: ${s.topic || 'Sin tema'}`).join('\n')}`]);

    case 'top_students': {
      const studentMap = {};
      grades.forEach(g => {
        const n = g.studentName || 'Estudiante';
        if (!studentMap[n]) studentMap[n] = [];
        studentMap[n].push(Number(g.score) || 0);
      });

      const top = Object.entries(studentMap)
        .map(([name, scores]) => ({ name, avg: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0 }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      if (top.length === 0) {
        return finalize(['Aún no hay calificaciones registradas para calcular el cuadro de honor.']);
      }
      return finalize([`Top 5 mejores promedios:\n${top.map((s, i) => `${i + 1}. ${s.name}: ${s.avg.toFixed(1)}/5.0`).join('\n')}`]);
    }

    case 'syllabus_week':
    case 'syllabus_info': {
      const weekNum = parseInt(params.week, 10);
      const item = syllabus.find(s => s.week === weekNum);
      if (item) {
        return finalize([`Semana ${item.week} del Sílabo:\n• Tema: ${item.topic || 'Sin tema'}\n• Objetivo: ${item.objective || 'Sin objetivo'}\n• Gramática/Vocabulario: ${item.grammar || 'N/A'}`]);
      }
      return finalize([`Actualmente hay ${syllabus.length} semanas registradas en el sílabo.`]);
    }

    // =========================================================================
    // J. GENERADOR DIDÁCTICO CON IA
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
        const cleanGen = cleanDisplayText(genReply);
        if (cleanGen) return finalize([cleanGen, '¿Quieres que lo ajustemos o lo publiquemos en algún grupo?']);
      } catch (e) {
        console.error('Error al generar contenido didáctico:', e);
      }
      return finalize(['Acción didáctica completada.']);
    }

    default:
      return finalize(['Acción completada con éxito.']);
  }
}

/**
 * Wrapper retrocompatible que retorna el texto plano consolidado
 */
export async function executeTeacherAssistantAction(parsed, context) {
  const rich = await executeTeacherAssistantActionRich(parsed, context);
  return rich.text;
}

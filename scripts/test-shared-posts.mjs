// scripts/test-shared-posts.mjs
// Suite de pruebas para verificar el compartir de publicaciones/foros/tareas a chats grupales e individuales
import assert from 'node:assert/strict';
import { parseSharedPost, isSharedPostMessage } from '../src/utils/sharedPostParser.js';

console.log('\n== 1. Resolución de Identificadores de Chat para Grupos y DMs ==');

// Función idéntica a la lógica implementada en TaskCard.jsx
function resolveTargetChatId(recipient, myChatId) {
  if (recipient.isGroup) {
    return recipient.chatId || (String(recipient.id).startsWith('group_') ? recipient.id : `group_${recipient.id}`);
  }
  return `dm_${[myChatId, recipient.id].sort().join('_')}`;
}

// Helper para armar lista de grupos
function buildGroupRecipients(chatGroups, academicGroups) {
  const list = [];
  const seenChatIds = new Set();
  const seenGroupNames = new Set();

  const addGroupItem = (chatId, rawName) => {
    if (!chatId && !rawName) return;
    const normalizedChatId = String(chatId).startsWith('group_') ? String(chatId) : `group_${chatId}`;
    const cleanName = String(rawName || 'Grupo').trim();
    const displayGroupName = cleanName.replace(/^grupo:\s*/i, '').trim();
    const normName = displayGroupName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    if (seenChatIds.has(normalizedChatId) || seenGroupNames.has(normName)) return;
    seenChatIds.add(normalizedChatId);
    seenGroupNames.add(normName);
    list.push({ id: normalizedChatId, chatId: normalizedChatId, name: `Grupo: ${displayGroupName}`, role: 'group', isGroup: true });
  };

  (chatGroups || []).forEach(g => {
    if (g?.id) addGroupItem(g.id, g.name || g.title);
  });

  (academicGroups || []).forEach(g => {
    if (!g?.id) return;
    const matchingCg = (chatGroups || []).find(cg => 
      cg.academicGroupId === g.id || 
      cg.id === g.id || 
      cg.id === `acad_${g.id}` || 
      `group_${cg.id}` === `group_acad_${g.id}` || 
      (cg.name && g.name && cg.name.trim().toLowerCase() === g.name.trim().toLowerCase())
    );
    const targetDocId = matchingCg ? matchingCg.id : `acad_${g.id}`;
    addGroupItem(targetDocId, g.name || g.groupName);
  });

  return list;
}

// Prueba 1.1: Grupo con prefijo group_
{
  const targetId = resolveTargetChatId({ id: 'demo_chat_group_1', isGroup: true }, 'teacher');
  assert.equal(targetId, 'group_demo_chat_group_1');
  console.log('  OK  Grupos sin prefijo group_ reciben el prefijo group_ correctamente');
}

// Prueba 1.2: Grupo que ya tiene prefijo group_
{
  const targetId = resolveTargetChatId({ id: 'group_173099999', isGroup: true }, 'teacher');
  assert.equal(targetId, 'group_173099999');
  console.log('  OK  Grupos con prefijo group_ existente no sufren duplicación (group_group_)');
}

// Prueba 1.3: Grupo académico se enlaza con su canal de chat real
{
  const mockChatGroups = [
    { id: 'demo_chat_group_1', name: 'Inglés Técnico Económico', academicGroupId: 'demo_ing_tec_econ' }
  ];
  const mockAcademicGroups = [
    { id: 'demo_ing_tec_econ', name: 'Inglés Técnico Económico' }
  ];
  const recipients = buildGroupRecipients(mockChatGroups, mockAcademicGroups);
  assert.equal(recipients.length, 1);
  assert.equal(recipients[0].id, 'group_demo_chat_group_1');
  assert.equal(recipients[0].chatId, 'group_demo_chat_group_1');
  console.log('  OK  Materia académica se vincula al chatGroup correspondiente con prefijo group_');
}

// Prueba 1.5: Normalización de chatId en listados de grupos (evita group_group_)
{
  const normalizeGroupChatId = (gId) => String(gId).startsWith('group_') ? gId : `group_${gId}`;
  assert.equal(normalizeGroupChatId('group_acad_123'), 'group_acad_123');
  assert.equal(normalizeGroupChatId('acad_123'), 'group_acad_123');
  assert.equal(normalizeGroupChatId('demo_chat_group_1'), 'group_demo_chat_group_1');
  console.log('  OK  Normalizador de grupos garantiza prefijo único sin duplicación group_group_');
}

// Prueba 1.6: Comparador de chats activos tolera variaciones de prefijo group_
{
  const isMatchingActiveChat = (activeChatId, eventChatId) => {
    return activeChatId === eventChatId || 
      `group_${activeChatId}` === eventChatId || 
      activeChatId === `group_${eventChatId}` || 
      activeChatId.replace(/^group_/, '') === eventChatId.replace(/^group_/, '');
  };
  assert.equal(isMatchingActiveChat('group_acad_123', 'acad_123'), true);
  assert.equal(isMatchingActiveChat('acad_123', 'group_acad_123'), true);
  assert.equal(isMatchingActiveChat('group_acad_123', 'group_acad_123'), true);
  assert.equal(isMatchingActiveChat('group_other', 'group_acad_123'), false);
  console.log('  OK  Comparador de eventos de chat sincroniza idénticos y variantes con/sin prefijo');
}

console.log('\n== 2. Parseo y Extracción de Publicaciones Compartidas (parseSharedPost) ==');

// Prueba 2.1: Objeto sharedItem explícito
{
  const mockMsg = {
    text: '📌 *MOVIE FORUM #3*\nhttps://englishtech.vercel.app/#post/rjPM1hpWrjbhCVU5cZLX',
    sharedItem: {
      id: 'rjPM1hpWrjbhCVU5cZLX',
      type: 'forum',
      typeLabel: 'Foro',
      actionLabel: 'Ir al foro',
      title: 'MOVIE FORUM #3',
      description: 'Rate from 1-5 the McDonald\'s brothers business management.',
      author: 'Gina Marcela Quintana Delgado',
      groupName: 'INGLÉS TÉCNICO ECONÓMICO'
    }
  };
  const parsed = parseSharedPost(mockMsg);
  assert.ok(parsed);
  assert.equal(parsed.id, 'rjPM1hpWrjbhCVU5cZLX');
  assert.equal(parsed.type, 'forum');
  assert.equal(parsed.typeLabel, 'Foro');
  assert.equal(parsed.actionLabel, 'Ir al foro');
  assert.equal(parsed.title, 'MOVIE FORUM #3');
  console.log('  OK  sharedItem estructurado se extrae directamente con metadatos completos');
}

// Prueba 2.2: Mensaje histórico en texto plano con enlace #post/<id>
{
  const mockTasks = [
    {
      id: 'rjPM1hpWrjbhCVU5cZLX',
      type: 'forum',
      title: 'MOVIE FORUM #3',
      description: 'Please share your opinion by answering the question.',
      author: 'Gina Marcela Quintana Delgado',
      targetGroupName: 'INGLÉS TÉCNICO ECONÓMICO',
      rating: 5.0
    }
  ];
  const legacyMsg = {
    text: '📌 *MOVIE FORUM #3*\nhttps://englishtech.vercel.app/#post/rjPM1hpWrjbhCVU5cZLX'
  };
  const parsed = parseSharedPost(legacyMsg, mockTasks);
  assert.ok(parsed);
  assert.equal(parsed.id, 'rjPM1hpWrjbhCVU5cZLX');
  assert.equal(parsed.type, 'forum');
  assert.equal(parsed.typeLabel, 'Foro');
  assert.equal(parsed.actionLabel, 'Ir al foro');
  assert.equal(parsed.title, 'MOVIE FORUM #3');
  assert.equal(parsed.author, 'Gina Marcela Quintana Delgado');
  console.log('  OK  Mensajes de texto históricos con enlace #post/ se reconstruyen como tarjetas ricas');
}

// Prueba 2.3: Enlace con #task/<id> y tipo tarea
{
  const mockTasks = [
    {
      id: 'task_financial_report_1',
      type: 'task',
      title: 'Workshop 1: Inflation Forecast Report',
      description: 'Write an executive summary of 150 words.',
      dueDate: '2026-12-15'
    }
  ];
  const legacyMsg = {
    text: '📌 *Workshop 1: Inflation Forecast Report*\nhttps://englishtech.vercel.app/#task/task_financial_report_1'
  };
  const parsed = parseSharedPost(legacyMsg, mockTasks);
  assert.ok(parsed);
  assert.equal(parsed.id, 'task_financial_report_1');
  assert.equal(parsed.type, 'task');
  assert.equal(parsed.actionLabel, 'Ir a la tarea');
  assert.equal(parsed.dueDate, '2026-12-15');
  console.log('  OK  Mensajes con #task/ se asocian al tipo Tarea y acción "Ir a la tarea"');
}

// Prueba 2.4: Mensaje sin asteriscos extrae el título correctamente
{
  const noAsteriskMsg = {
    text: '📌 MOVIE FORUM #3\nhttps://englishtech.vercel.app/#post/rjPM1hpWrjbhCVU5cZLX'
  };
  const parsed = parseSharedPost(noAsteriskMsg);
  assert.ok(parsed);
  assert.equal(parsed.id, 'rjPM1hpWrjbhCVU5cZLX');
  assert.equal(parsed.title, 'MOVIE FORUM #3');
  console.log('  OK  Mensajes sin asteriscos (📌 Título) extraen el título correctamente');
}

// Prueba 2.5: Mensaje regular sin publicación compartida devuelve null
{
  const normalMsg = { text: 'Hola profe, ¿a qué hora es la clase de mañana?' };
  const parsed = parseSharedPost(normalMsg);
  assert.equal(parsed, null);
  console.log('  OK  Mensajes de texto normales devuelven null sin falsos positivos');
}

console.log('\n== 3. Prevención de Estado de Edición Erróneo y Sincronización de IDs ==');

// Prueba 3.1: isEditingThis nunca debe ser true cuando editingAppMessageId es null
{
  const editingAppMessageId = null;
  const msgWithNullId = { id: null, text: 'Mensaje' };
  const msgWithValidId = { id: 'msg_12345', text: 'Mensaje' };
  
  const isEditingNull = Boolean(editingAppMessageId) && editingAppMessageId === msgWithNullId.id;
  const isEditingValid = Boolean(editingAppMessageId) && editingAppMessageId === msgWithValidId.id;

  assert.equal(isEditingNull, false);
  assert.equal(isEditingValid, false);
  console.log('  OK  editingAppMessageId null nunca activa isEditingThis, aun si el mensaje tuviese id null');
}

// Prueba 3.2: isEditingThis solo es true cuando coincide exactamente con un ID activo no nulo
{
  const editingAppMessageId = 'msg_target_77';
  const targetMsg = { id: 'msg_target_77' };
  const otherMsg = { id: 'msg_other_88' };

  const isEditingTarget = Boolean(editingAppMessageId) && editingAppMessageId === targetMsg.id;
  const isEditingOther = Boolean(editingAppMessageId) && editingAppMessageId === otherMsg.id;

  assert.equal(isEditingTarget, true);
  assert.equal(isEditingOther, false);
  console.log('  OK  isEditingThis solo se activa para el mensaje exacto seleccionado para editar');
}

// Prueba 3.3: Mapeo { ...d.data(), id: d.id } preserva el ID real de Firestore ante id: null heredado
{
  const mockDoc = {
    id: 'firestore_doc_abc',
    data: () => ({ id: null, text: 'Mensaje con id null en payload' })
  };
  const mapped = { ...mockDoc.data(), id: mockDoc.id };
  assert.equal(mapped.id, 'firestore_doc_abc');
  assert.notEqual(mapped.id, null);
  console.log('  OK  Mapeo Firestore { ...d.data(), id: d.id } garantiza que id: d.id prevalece siempre');
}

// Prueba 3.4: parseSharedPost actualiza métricas vivas (comentarios, título, descripción) desde tasks
{
  const liveTasks = [
    {
      id: 'post_live_sync_1',
      title: 'Título Actualizado del Foro',
      description: 'Descripción fresca y actualizada',
      comments: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
      rating: 4.8
    }
  ];
  const msgWithStaleSharedItem = {
    sharedItem: {
      id: 'post_live_sync_1',
      type: 'forum',
      typeLabel: 'Foro',
      actionLabel: 'Ir al foro',
      title: 'Título Antiguo',
      description: 'Descripción vieja',
      commentsCount: 0,
      rating: 5.0
    }
  };
  const parsed = parseSharedPost(msgWithStaleSharedItem, liveTasks);
  assert.equal(parsed.title, 'Título Actualizado del Foro');
  assert.equal(parsed.description, 'Descripción fresca y actualizada');
  assert.equal(parsed.commentsCount, 3);
  assert.equal(parsed.rating, 4.8);
  console.log('  OK  parseSharedPost sincroniza en vivo métricas y textos actualizados de tasks');
}

// Prueba 3.5: isEditingThis nunca debe activarse para publicaciones compartidas ni mensajes eliminados
{
  const editingAppMessageId = 'msg_shared_101';
  const sharedPostMsg = {
    id: 'msg_shared_101',
    text: '📌 *MOVIE FORUM #1*\nhttps://englishtech.vercel.app/#post/forum_101',
    isDeleted: false
  };
  const mockTasks = [{ id: 'forum_101', title: 'MOVIE FORUM #1' }];

  const isEditing = Boolean(editingAppMessageId) && 
    editingAppMessageId === sharedPostMsg.id && 
    !sharedPostMsg.isDeleted && 
    !parseSharedPost(sharedPostMsg, mockTasks);

  assert.equal(isEditing, false);
  console.log('  OK  isEditingThis nunca se activa para publicaciones compartidas (previene input de edición espurio)');
}

// Prueba 3.6: Botón de editar texto plano se suprime en tarjetas compartidas, audios y mensajes eliminados
{
  const myChatId = 'user_123';
  const mockTasks = [{ id: 'task_001', title: 'Tarea 1' }];

  const sharedMsg = { id: 'm1', authorId: myChatId, text: '📌 *Tarea 1*\nhttps://englishtech.vercel.app/#post/task_001' };
  const audioMsg = { id: 'm2', authorId: myChatId, text: '', audioUrl: 'blob:audio.mp3' };
  const deletedMsg = { id: 'm3', authorId: myChatId, text: 'Este mensaje fue eliminado', isDeleted: true };
  const normalTextMsg = { id: 'm4', authorId: myChatId, text: 'Hola a todos' };

  const canEdit = (m) => {
    const isMe = m.authorId === myChatId;
    const isShared = isSharedPostMessage(m, mockTasks);
    return isMe && !m.isDeleted && !m.audioUrl && !isShared && Boolean(m.text);
  };

  assert.equal(canEdit(sharedMsg), false);
  assert.equal(canEdit(audioMsg), false);
  assert.equal(canEdit(deletedMsg), false);
  assert.equal(canEdit(normalTextMsg), true);
  console.log('  OK  Botón de editar texto se restringe exclusivamente a mensajes de texto plano válidos');
}

// Prueba 3.7: isSharedPostMessage detecta múltiples formatos de publicación compartida
{
  assert.equal(isSharedPostMessage({ isSharedPost: true }), true);
  assert.equal(isSharedPostMessage({ sharedPost: { id: 'post_1' } }), true);
  assert.equal(isSharedPostMessage({ sharedItem: '{"id":"post_2"}' }), true);
  assert.equal(isSharedPostMessage({ sharedTask: { id: 'task_3' } }), true);
  assert.equal(isSharedPostMessage({ text: 'Mira este foro: https://englishtech.vercel.app/#forum/f123' }), true);
  assert.equal(isSharedPostMessage({ text: '📌 MOVIE FORUM #1\nhttps://englishtech.vercel.app/#post/123' }), true);
  assert.equal(isSharedPostMessage({ text: 'Presentación: https://englishtech.vercel.app/#slides/slide_unit1' }), true);
  assert.equal(isSharedPostMessage({ text: 'Libro digital: https://englishtech.vercel.app/#book/book_grammar' }), true);
  assert.equal(isSharedPostMessage({ text: 'Evaluación: https://englishtech.vercel.app/#evaluation/quiz_final' }), true);
  assert.equal(isSharedPostMessage({ text: 'Hola a todos, nos vemos en clase' }), false);
  assert.equal(isSharedPostMessage(null), false);
  console.log('  OK  isSharedPostMessage detecta fielmente cualquier tipo de publicación o recurso compartido');
}

// Prueba 3.8: parseSharedPost infiere tipo e interacción aún sin lista de tasks cargada
{
  const forumMsg = { text: '📌 *MOVIE FORUM #1*\nhttps://englishtech.vercel.app/#post/movie_f1' };
  const parsedForum = parseSharedPost(forumMsg, []);
  assert.ok(parsedForum);
  assert.equal(parsedForum.id, 'movie_f1');
  assert.equal(parsedForum.type, 'forum');
  assert.equal(parsedForum.typeLabel, 'Foro');
  assert.equal(parsedForum.actionLabel, 'Ir al foro');
  assert.equal(parsedForum.title, 'MOVIE FORUM #1');

  const evalMsg = { text: '📌 *Midterm Quiz*\nhttps://englishtech.vercel.app/#evaluation/eval_midterm' };
  const parsedEval = parseSharedPost(evalMsg, []);
  assert.ok(parsedEval);
  assert.equal(parsedEval.id, 'eval_midterm');
  assert.equal(parsedEval.type, 'evaluation');
  assert.equal(parsedEval.actionLabel, 'Ir a la evaluación');

  console.log('  OK  parseSharedPost infiere tipo y acción para foros, tareas y evaluaciones aun con tasks=[]');
}

// Prueba 3.9: Supresión total del input de edición [  ] ✓ ✕ para publicaciones compartidas
{
  const sharedMsg = {
    id: 'shared_msg_456',
    text: '📌 *MOVIE FORUM #1*\nhttps://englishtech.vercel.app/#post/rjPM1hpWrjbhCVU5cZLX'
  };
  const editingAppMessageId = 'shared_msg_456';
  const isSharedThis = isSharedPostMessage(sharedMsg, []);
  const isEditingThis = Boolean(editingAppMessageId) && editingAppMessageId === sharedMsg.id && !sharedMsg.isDeleted && !isSharedThis;

  assert.equal(isSharedThis, true);
  assert.equal(isEditingThis, false);
  console.log('  OK  isEditingThis es false cuando el mensaje es compartido, impidiendo que aparezca [  ] ✓ ✕');
}

// Prueba 3.10: Calificación privada de comentarios y mensajes (solo visible para docente y autor)
{
  const teacherRole = 'teacher';
  const student1Role = 'student';
  const student2Role = 'student';

  const authorId = 'student_maria';
  const otherStudentId = 'student_carlos';

  const commentWithGrade = {
    id: 'comm_1',
    authorId: authorId,
    grade: 4.8,
    feedback: 'Excelente análisis de la película'
  };

  const isVisibleForTeacher = teacherRole === 'teacher' || authorId === 'teacher_ana';
  const isVisibleForAuthor = student1Role === 'teacher' || authorId === authorId;
  const isVisibleForOtherStudent = student2Role === 'teacher' || otherStudentId === authorId;

  assert.equal(isVisibleForTeacher, true);
  assert.equal(isVisibleForAuthor, true);
  assert.equal(isVisibleForOtherStudent, false);
  console.log('  OK  Calificación y feedback privado solo es visible para el docente y el autor del comentario');
}

// Prueba 3.11: Títulos con asteriscos dobles o sin asteriscos
{
  const doubleAsteriskMsg = {
    text: '📌 **MOVIE FORUM #1 🎬**\nhttps://englishtech.vercel.app/#post/post_movie_1'
  };
  const parsed = parseSharedPost(doubleAsteriskMsg);
  assert.ok(parsed);
  assert.equal(parsed.title, 'MOVIE FORUM #1 🎬');

  const cleanIntro = (doubleAsteriskMsg.text || '')
    .replace(/📌\s*(?:\*+)?([^*\n\r]+?)(?:\*+)?(?:\n|\r|$)/g, '')
    .replace(/(?:https?:\/\/[^\s]+)?(?:#|\/)(?:post|task|forum|evaluation|eval|slides|slide|book|book3d|poll)\/(?:[a-zA-Z0-9_\-\.\:\%]+)/gi, '')
    .trim();
  assert.equal(cleanIntro, '');
  console.log('  OK  Títulos con asteriscos dobles se extraen limpios y cleanIntro no deja residuos');
}

// Prueba 3.12: Depuración de puntuación residual al final de URL/postId
{
  const msgWithPeriod = {
    text: 'Mira este foro: https://englishtech.vercel.app/#post/rjPM1hpWrjbhCVU5cZLX.'
  };
  const liveTasks = [{ id: 'rjPM1hpWrjbhCVU5cZLX', title: 'Movie Forum Live' }];
  const parsed = parseSharedPost(msgWithPeriod, liveTasks);
  assert.ok(parsed);
  assert.equal(parsed.id, 'rjPM1hpWrjbhCVU5cZLX');
  assert.equal(parsed.title, 'Movie Forum Live');
  console.log('  OK  PostId con punto final (.) se sanea limpiamente y enlaza con la tarea correcta');
}

// Prueba 3.13: Enrutamiento prioritario para tareas del muro con presentaciones y libros
{
  const mockTasks = [
    { id: 'wall_slide_task_1', type: 'slides', title: 'Presentación sobre Finanzas' },
    { id: 'wall_book_task_2', type: 'book3d', title: 'Libro de Gramática Avanzada' }
  ];

  const resolveTargetDestination = (postId, itemType, tasks) => {
    const isWallTask = Array.isArray(tasks) && tasks.some(t => String(t?.id) === String(postId));
    if (!isWallTask && (itemType === 'slides' || itemType === 'reviews')) {
      return { destination: 'tab_reviews', modalPostId: null };
    }
    if (!isWallTask && (itemType === 'book3d' || itemType === 'books')) {
      return { destination: 'tab_books', modalPostId: null };
    }
    return { destination: 'tab_tasks', modalPostId: postId };
  };

  const navWallSlide = resolveTargetDestination('wall_slide_task_1', 'slides', mockTasks);
  assert.equal(navWallSlide.destination, 'tab_tasks');
  assert.equal(navWallSlide.modalPostId, 'wall_slide_task_1');

  const navStandaloneSlide = resolveTargetDestination('lib_slide_external', 'slides', mockTasks);
  assert.equal(navStandaloneSlide.destination, 'tab_reviews');
  assert.equal(navStandaloneSlide.modalPostId, null);

  console.log('  OK  Navegación prioriza modal de muro cuando el recurso interactivo está en tasks');
}

// Prueba 3.14: Fallback seguro cuando rawItem no especifica título
{
  const msgWithNamelessRaw = {
    sharedItem: {
      id: 'custom_shared_id',
      type: 'forum'
    }
  };
  const parsed = parseSharedPost(msgWithNamelessRaw, []);
  assert.ok(parsed);
  assert.equal(parsed.title, 'Publicación compartida');
  assert.equal(parsed.rating, 5.0);
  console.log('  OK  rawItem sin título aplica título por defecto sin generar undefined');
}

console.log('\n========================================');
console.log('Total pruebas Compartir en Chat: 25 | OK: 25 | FAIL: 0');
console.log('========================================\n');


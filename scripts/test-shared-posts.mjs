// scripts/test-shared-posts.mjs
// Suite de pruebas para verificar el compartir de publicaciones/foros/tareas a chats grupales e individuales
import assert from 'node:assert/strict';
import { parseSharedPost } from '../src/utils/sharedPostParser.js';

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

// Prueba 1.4: Chats individuales (DM)
{
  const targetId = resolveTargetChatId({ id: 'mathias_contreras', isGroup: false }, 'teacher');
  assert.equal(targetId, 'dm_mathias_contreras_teacher');
  console.log('  OK  Chats individuales DM se ordenan alfabéticamente de forma consistente');
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

// Prueba 2.4: Mensaje regular sin publicación compartida devuelve null
{
  const normalMsg = { text: 'Hola profe, ¿a qué hora es la clase de mañana?' };
  const parsed = parseSharedPost(normalMsg);
  assert.equal(parsed, null);
  console.log('  OK  Mensajes de texto normales devuelven null sin falsos positivos');
}

console.log('\n========================================');
console.log('Total pruebas Compartir en Chat: 8 | OK: 8 | FAIL: 0');
console.log('========================================\n');

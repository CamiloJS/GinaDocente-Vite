// scripts/test-student-notifications.mjs
// Suite de pruebas unitarias para el sistema de notificaciones por correo Google a estudiantes
import assert from 'node:assert/strict';
import {
  normalizeEmailAddress,
  isValidEmail,
  resolveStudentRecipients,
  generateNotificationEmail,
  dispatchStudentEmailNotification
} from '../src/utils/studentNotificationService.js';

console.log('\n== 1. Normalización y Validación de Correos ==');

// 1.1 Normalización de correo
{
  assert.equal(normalizeEmailAddress('  Estudiante@GMAIL.COM  '), 'estudiante@gmail.com');
  assert.equal(normalizeEmailAddress(''), '');
  assert.equal(normalizeEmailAddress(null), '');
  console.log('  OK  Normaliza mayúsculas y espacios en blanco de correos');
}

// 1.2 Validación de formato de correo
{
  assert.equal(isValidEmail('carlos.mendoza@gmail.com'), true);
  assert.equal(isValidEmail('laura_123@unipamplona.edu.co'), true);
  assert.equal(isValidEmail('invalido-sin-arroba'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(null), false);
  console.log('  OK  Valida sintaxis correcta de direcciones de correo electrónico');
}

console.log('\n== 2. Resolución de Destinatarios Estudiantiles ==');

const mockUserMappings = {
  carlos_m: {
    fullName: 'Carlos Mendoza',
    email: 'carlos.mendoza@gmail.com',
    role: 'student',
    academicGroupId: 'acad_ing_tec',
    group: 'Inglés Técnico Económico'
  },
  laura_r: {
    fullName: 'Laura Restrepo',
    googleEmail: 'laura.restrepo@gmail.com',
    role: 'student',
    academicGroupId: 'acad_ing_tec',
    group: 'Inglés Técnico Económico'
  },
  mateo_g: {
    fullName: 'Mateo Gómez',
    email: 'mateo.gomez@gmail.com',
    role: 'student',
    academicGroupId: 'acad_frances_1',
    group: 'Francés Técnico 1'
  },
  opt_out_student: {
    fullName: 'Juan Pérez (Sin Notificaciones)',
    email: 'juan.perez@gmail.com',
    role: 'student',
    academicGroupId: 'acad_ing_tec',
    emailNotificationsEnabled: false
  },
  teacher: {
    fullName: 'Gina Marcela Quintana Delgado',
    email: 'ginamarcelaquintana19@gmail.com',
    role: 'teacher'
  },
  camilodocente: {
    fullName: 'Camilo Jaimes',
    email: 'camilodocente@gmail.com',
    role: 'teacher'
  }
};

const mockAcademicGroups = [
  {
    id: 'acad_ing_tec',
    name: 'Inglés Técnico Económico',
    members: ['carlos_m', 'laura_r', 'opt_out_student', 'teacher']
  },
  {
    id: 'acad_frances_1',
    name: 'Francés Técnico 1',
    members: ['mateo_g', 'teacher']
  }
];

// 2.1 Publicación global (all/todos): Notifica a todos los estudiantes registrados
{
  const recipients = resolveStudentRecipients({
    userMappings: mockUserMappings,
    targetGroupId: 'all',
    academicGroups: mockAcademicGroups
  });

  const emails = recipients.map(r => r.email);
  assert.ok(emails.includes('carlos.mendoza@gmail.com'));
  assert.ok(emails.includes('laura.restrepo@gmail.com'));
  assert.ok(emails.includes('mateo.gomez@gmail.com'));
  // Excluye al estudiante con notificaciones apagadas
  assert.ok(!emails.includes('juan.perez@gmail.com'));
  // Excluye docentes
  assert.ok(!emails.includes('ginamarcelaquintana19@gmail.com'));
  assert.ok(!emails.includes('camilodocente@gmail.com'));
  console.log('  OK  Publicación global incluye a todos los estudiantes y excluye docentes y opt-outs');
}

// 2.2 Publicación por materia específica: Notifica solo a estudiantes de ese grupo
{
  const recipients = resolveStudentRecipients({
    userMappings: mockUserMappings,
    targetGroupId: 'acad_ing_tec',
    academicGroups: mockAcademicGroups
  });

  const emails = recipients.map(r => r.email);
  assert.ok(emails.includes('carlos.mendoza@gmail.com'));
  assert.ok(emails.includes('laura.restrepo@gmail.com'));
  // No incluye al estudiante de francés
  assert.ok(!emails.includes('mateo.gomez@gmail.com'));
  console.log('  OK  Publicación específica de materia solo incluye estudiantes de su grupo');
}

// 2.3 Mensaje directo o miembros específicos de chat
{
  const recipients = resolveStudentRecipients({
    userMappings: mockUserMappings,
    recipientUserKeys: ['carlos_m', 'teacher']
  });

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0].email, 'carlos.mendoza@gmail.com');
  console.log('  OK  Mensaje directo o grupal resuelve estudiantes destinatarios ignorando docentes');
}

console.log('\n== 3. Generación de Plantillas de Correo (HTML y Texto) ==');

// 3.1 Plantilla para Tarea / Publicación en el muro
{
  const email = generateNotificationEmail({
    type: 'wall_post',
    post: {
      id: 'task_financial_unit_1',
      type: 'task',
      title: 'Taller 1: Análisis Financiero',
      description: 'Resolver los ejercicios de la página 45.',
      dueDate: '2026-12-10',
      dueTime: '23:59',
      targetGroupName: 'Inglés Técnico Económico'
    },
    senderName: 'Gina Marcela Quintana Delgado',
    actionUrl: 'https://englishtech.vercel.app/#post/task_financial_unit_1'
  });

  assert.ok(email.subject.includes('Tarea / Asignación: Taller 1: Análisis Financiero'));
  assert.ok(email.html.includes('Taller 1: Análisis Financiero'));
  assert.ok(email.html.includes('2026-12-10'));
  assert.ok(email.html.includes('https://englishtech.vercel.app/#post/task_financial_unit_1'));
  assert.ok(email.text.includes('https://englishtech.vercel.app/#post/task_financial_unit_1'));
  console.log('  OK  Plantilla de publicación genera HTML responsivo con fecha límite y enlace directo');
}

// 3.2 Plantilla para Foro de Debate
{
  const email = generateNotificationEmail({
    type: 'wall_post',
    post: {
      id: 'forum_discussion_3',
      type: 'forum',
      title: 'MOVIE FORUM #3',
      description: 'Rate from 1-5 the business management.',
      targetGroupName: 'Inglés Técnico Económico'
    },
    senderName: 'Gina Marcela Quintana Delgado'
  });

  assert.ok(email.subject.includes('Foro de debate: MOVIE FORUM #3'));
  assert.ok(email.html.includes('Foro de debate'));
  assert.ok(email.html.includes('MOVIE FORUM #3'));
  console.log('  OK  Plantilla de foro aplica badge de Foro de debate y llamada a la acción correspondiente');
}

// 3.3 Plantilla para Mensaje de Chat
{
  const email = generateNotificationEmail({
    type: 'chat_message',
    message: {
      id: 'msg_test_1',
      text: 'Recuerden repasar la unidad 2 para la evaluación de mañana.',
      chatName: 'Inglés Técnico Económico (Grupo A)'
    },
    senderName: 'Gina Marcela Quintana Delgado',
    actionUrl: 'https://englishtech.vercel.app/#chat'
  });

  assert.ok(email.subject.includes('Nuevo mensaje de tu docente Gina Marcela Quintana Delgado'));
  assert.ok(email.html.includes('Recuerden repasar la unidad 2'));
  assert.ok(email.html.includes('https://englishtech.vercel.app/#chat'));
  assert.ok(email.text.includes('Recuerden repasar la unidad 2'));
  console.log('  OK  Plantilla de chat incluye extracto del mensaje y enlace directo al chat');
}

console.log('\n== 4. Despacho y Manejo de Cola (Demo y Debounce) ==');

// 4.1 Despacho en Modo Demo
{
  let savedDemoItem = null;
  const result = await dispatchStudentEmailNotification({
    type: 'wall_post',
    post: { id: 'demo_post_1', title: 'Actividad de Demostración' },
    targetGroupId: 'all',
    userMappings: mockUserMappings,
    academicGroups: mockAcademicGroups,
    isDemoMode: true,
    saveDemoSandboxItem: (collectionName, item) => {
      savedDemoItem = { collectionName, item };
      return item;
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.isDemo, true);
  assert.ok(result.count >= 2);
  assert.equal(savedDemoItem.collectionName, 'emailNotifications');
  assert.equal(savedDemoItem.item.status, 'sent');
  console.log('  OK  Modo Demo simula despacho y guarda registro en sandbox sin errores de red');
}

// 4.2 Debounce para Mensajes de Chat Rápidos (Previene spam)
{
  const res1 = await dispatchStudentEmailNotification({
    type: 'chat_message',
    message: { id: 'msg_rapid_1', text: 'Mensaje 1', chatName: 'Canal Test' },
    recipientUserKeys: ['carlos_m'],
    userMappings: mockUserMappings,
    isDemoMode: true
  });
  assert.equal(res1.count, 1);

  // Segundo mensaje consecutivo en la misma ventana de tiempo
  const res2 = await dispatchStudentEmailNotification({
    type: 'chat_message',
    message: { id: 'msg_rapid_2', text: 'Mensaje 2', chatName: 'Canal Test' },
    recipientUserKeys: ['carlos_m'],
    userMappings: mockUserMappings,
    isDemoMode: true
  });
  assert.equal(res2.suppressedByDebounce, true);
  assert.equal(res2.count, 0);
  console.log('  OK  Debounce suprime envíos sucesivos de correos en ráfaga para el mismo chat');
}

console.log('\n========================================');
console.log('Total pruebas Notificaciones por Correo: 9 | OK: 9 | FAIL: 0');
console.log('========================================\n');

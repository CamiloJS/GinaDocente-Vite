// src/utils/studentNotificationService.js
// Sistema de notificaciones por correo electrónico a cuentas Google de estudiantes
// Avisa a los estudiantes cuando la docente publica en el muro o envía mensajes de chat.

import { isTeacherId, TEACHER_NAME, SECOND_TEACHER_NAME, sanitizeFirestoreData } from './helpers.js';

/**
 * Normaliza una dirección de correo electrónico (minúsculas, trim).
 */
export const normalizeEmailAddress = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * Valida si un string tiene formato de correo válido.
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
};

/**
 * Resuelve la lista de estudiantes destinatarios con su correo de Google registrado.
 * Excluye siempre docentes y usuarios sin correo válido.
 */
export const resolveStudentRecipients = ({
  userMappings = {},
  targetGroupId = null,
  academicGroups = [],
  chatGroups = [],
  recipientUserKeys = null,
  excludeUserKeys = []
}) => {
  const recipientsMap = new Map();
  const excludedSet = new Set(
    (excludeUserKeys || []).map(k => String(k || '').trim().toLowerCase().replace(/^@/, ''))
  );

  const cleanTargetGroup = String(targetGroupId || '').replace(/^acad_/i, '').trim().toLowerCase();
  const isGlobalTarget = !cleanTargetGroup || cleanTargetGroup === 'all' || cleanTargetGroup === 'global' || cleanTargetGroup === 'todos';

  // Obtener miembros del grupo académico objetivo
  const groupMemberKeys = new Set();
  if (!isGlobalTarget && Array.isArray(academicGroups)) {
    const matchingGroups = academicGroups.filter(g => {
      const gId = String(g?.id || '').replace(/^acad_/i, '').trim().toLowerCase();
      const gName = String(g?.name || '').trim().toLowerCase();
      return gId === cleanTargetGroup || gName === cleanTargetGroup;
    });

    matchingGroups.forEach(g => {
      const mList = Array.isArray(g?.members)
        ? g.members
        : (g?.members && typeof g.members === 'object' ? Object.keys(g.members) : []);
      mList.forEach(m => {
        if (m) groupMemberKeys.add(String(m).trim().toLowerCase().replace(/^@/, ''));
      });
    });
  }

  // Helper para evaluar y agregar un estudiante
  const considerStudent = (userKey, userData) => {
    if (!userKey || !userData) return;
    const cleanKey = String(userKey).trim().toLowerCase().replace(/^@/, '');

    // Descartar docentes y excluidos
    if (excludedSet.has(cleanKey)) return;
    if (isTeacherId(cleanKey)) return;
    if (userData.role === 'teacher' || userData.authorRole === 'teacher') return;
    const nameStr = String(userData.fullName || userData.name || '').trim();
    if (nameStr === TEACHER_NAME || nameStr === SECOND_TEACHER_NAME) return;

    // Verificar si el estudiante tiene notificaciones por correo desactivadas explícitamente
    if (userData.emailNotificationsEnabled === false) return;

    // Correo registrado (cuenta Google o email directo)
    const rawEmail = userData.googleEmail || userData.email || '';
    const cleanEmail = normalizeEmailAddress(rawEmail);
    if (!isValidEmail(cleanEmail)) return;

    // Descartar correos de docentes
    if (
      cleanEmail === 'ginamarcelaquintana19@gmail.com' ||
      cleanEmail.includes('docente') ||
      cleanEmail.includes('camilojaimes')
    ) {
      return;
    }

    if (!recipientsMap.has(cleanEmail)) {
      recipientsMap.set(cleanEmail, {
        userKey: cleanKey,
        name: nameStr || cleanKey,
        email: cleanEmail,
        group: userData.group || userData.academicGroupId || ''
      });
    }
  };

  // CASO A: Destinatarios explícitos (mensajes de chat directo o miembros de grupo de chat)
  if (Array.isArray(recipientUserKeys) && recipientUserKeys.length > 0) {
    recipientUserKeys.forEach(uk => {
      const cleanUk = String(uk || '').trim().toLowerCase().replace(/^@/, '');
      const uData = userMappings?.[cleanUk] || Object.values(userMappings || {}).find(v => (
        String(v?.uid || '').toLowerCase() === cleanUk ||
        String(v?.username || '').toLowerCase().replace(/^@/, '') === cleanUk
      ));
      if (uData) {
        considerStudent(cleanUk, uData);
      }
    });
    return Array.from(recipientsMap.values());
  }

  // CASO B: Publicación en el muro (por grupo académico o global a todos los estudiantes)
  Object.entries(userMappings || {}).forEach(([uk, uData]) => {
    if (!uData) return;
    const cleanUk = String(uk).trim().toLowerCase().replace(/^@/, '');

    if (isGlobalTarget) {
      // Notificar a todos los estudiantes registrados
      considerStudent(cleanUk, uData);
    } else {
      // Notificar solo si pertenece al grupo académico
      const studentGrp1 = String(uData.academicGroupId || '').replace(/^acad_/i, '').trim().toLowerCase();
      const studentGrp2 = String(uData.group || '').replace(/^acad_/i, '').trim().toLowerCase();
      const isInTargetGroup =
        groupMemberKeys.has(cleanUk) ||
        (studentGrp1 && studentGrp1 === cleanTargetGroup) ||
        (studentGrp2 && studentGrp2 === cleanTargetGroup);

      if (isInTargetGroup) {
        considerStudent(cleanUk, uData);
      }
    }
  });

  return Array.from(recipientsMap.values());
};

/**
 * Genera plantillas de correo (asunto, HTML responsivo y texto plano) para publicaciones y mensajes.
 */
export const generateNotificationEmail = ({
  type = 'wall_post',
  post = null,
  message = null,
  senderName = TEACHER_NAME,
  actionUrl = 'https://englishtech.vercel.app'
}) => {
  const teacher = senderName || TEACHER_NAME;

  if (type === 'chat_message' && message) {
    const chatTitle = message.chatName ? ` en "${message.chatName}"` : '';
    const subject = `[English Tech] Nuevo mensaje de tu docente ${teacher}`;
    const previewText = (message.text || 'Tienes un nuevo mensaje en el chat').slice(0, 300);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
          <!-- Encabezado con branding institucional -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px;">
                English Tech • Mensajería
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Nuevo mensaje de tu docente
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #bfdbfe;">
                Universidad de Pamplona • Inglés Técnico Económico
              </p>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hola, tu docente <strong style="color: #ffffff;">${teacher}</strong> te ha enviado un nuevo mensaje${chatTitle}:
              </p>

              <!-- Burbuja de mensaje -->
              <div style="background-color: #0f172a; border-left: 4px solid #3b82f6; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #f1f5f9; white-space: pre-line; font-style: italic;">
                  "${previewText}"
                </p>
              </div>

              <!-- Botón de Acción Principal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px; margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl || 'https://englishtech.vercel.app/#chat'}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); text-align: center;">
                      Abrir Chat y Responder →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">
                Recibes esta notificación en tu cuenta de Google registrada en <strong>English Tech</strong>.
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                © 2026 Universidad de Pamplona • Plataforma de Inglés Técnico Económico
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `English Tech - Nuevo mensaje de tu docente\n\nTu docente ${teacher} te ha enviado un mensaje${chatTitle}:\n\n"${previewText}"\n\nAbre la plataforma para responder:\n${actionUrl || 'https://englishtech.vercel.app/#chat'}\n\nUniversidad de Pamplona - English Tech`;

    return { subject, html, text };
  }

  // CASO: Publicación en el muro (Tarea, Foro, Evaluación, etc.)
  const postType = post?.type || 'post';
  const typeMap = {
    forum: { label: 'Foro de debate', color: '#7c3aed', cta: 'Ir al foro' },
    task: { label: 'Tarea / Asignación', color: '#d97706', cta: 'Ir a la tarea' },
    evaluation: { label: 'Evaluación', color: '#059669', cta: 'Ir a la evaluación' },
    slides: { label: 'Presentación', color: '#2563eb', cta: 'Ver presentación' },
    book3d: { label: 'Libro', color: '#0891b2', cta: 'Abrir libro' },
    poll: { label: 'Encuesta', color: '#4f46e5', cta: 'Participar en la encuesta' },
    post: { label: 'Publicación', color: '#2563eb', cta: 'Ver publicación' }
  };
  const typeInfo = typeMap[postType] || typeMap.post;

  const title = post?.title || 'Nueva actividad publicada';
  const subject = `[English Tech] ${typeInfo.label}: ${title}`;
  const cleanDesc = (post?.description || '')
    .replace(/\[color=[^\]]+\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\[\/?(b|i|u)\]/gi, '')
    .trim()
    .slice(0, 450);

  const groupName = post?.targetGroupName || 'Inglés Técnico Económico';
  const finalActionUrl = actionUrl || (post?.id ? `https://englishtech.vercel.app/#post/${post.id}` : 'https://englishtech.vercel.app');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
          <!-- Encabezado con branding institucional -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; text-align: left;">
              <span style="display: inline-block; background-color: ${typeInfo.color}; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px;">
                ${typeInfo.label}
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #bfdbfe;">
                ${groupName} • Por ${teacher}
              </p>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Tu docente ha publicado una nueva actividad en el muro de clase:
              </p>

              <!-- Recuadro informativo de la publicación -->
              <div style="background-color: #0f172a; border-radius: 14px; border: 1px solid #334155; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #ffffff;">
                  ${title}
                </h3>
                ${cleanDesc ? `
                <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #94a3b8; white-space: pre-line;">
                  ${cleanDesc}${cleanDesc.length >= 450 ? '...' : ''}
                </p>` : ''}

                ${post?.dueDate ? `
                <div style="background-color: rgba(217, 119, 6, 0.15); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 10px; padding: 10px 14px; margin-top: 12px; display: inline-block;">
                  <span style="font-size: 12px; font-weight: 700; color: #fbbf24;">
                    📅 Fecha límite de entrega: ${post.dueDate}${post.dueTime ? ' a las ' + post.dueTime : ''}
                  </span>
                </div>` : ''}
              </div>

              <!-- Botón de Acción Principal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 12px; margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="${finalActionUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); text-align: center;">
                      ${typeInfo.cta} en English Tech →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">
                Recibes este aviso en tu cuenta Google registrada en la plataforma.
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                © 2026 Universidad de Pamplona • English Tech
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `English Tech - ${typeInfo.label}\n\n${title}\nMateria: ${groupName}\nDocente: ${teacher}\n\n${cleanDesc}\n\n${post?.dueDate ? 'Fecha límite: ' + post.dueDate + (post.dueTime ? ' ' + post.dueTime : '') + '\n\n' : ''}Accede directamente aquí:\n${finalActionUrl}\n\nUniversidad de Pamplona - English Tech`;

  return { subject, html, text };
};

// Caché de debounce para evitar spam de correos en ráfaga de mensajes de chat
const chatEmailDebounceMap = new Map();
const CHAT_DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutos por chat

/**
 * Despacha notificaciones a los estudiantes vía correo electrónico (API + Cola Firestore).
 */
export const dispatchStudentEmailNotification = async ({
  type = 'wall_post',
  post = null,
  message = null,
  senderName = TEACHER_NAME,
  targetGroupId = null,
  academicGroups = [],
  chatGroups = [],
  recipientUserKeys = null,
  userMappings = {},
  appId = 'english-tech',
  db = null,
  isDemoMode = false,
  saveDemoSandboxItem = null,
  addDocFn = null,
  collectionFn = null
}) => {
  try {
    // 1. Control de debounce para mensajes de chat frecuentes
    if (type === 'chat_message' && message?.id) {
      const chatKey = `${message.chatName || 'dm'}_${senderName}`;
      const lastSent = chatEmailDebounceMap.get(chatKey) || 0;
      if (Date.now() - lastSent < CHAT_DEBOUNCE_MS) {
        return { success: true, count: 0, suppressedByDebounce: true };
      }
      chatEmailDebounceMap.set(chatKey, Date.now());
    }

    // 2. Resolver destinatarios reales
    const recipients = resolveStudentRecipients({
      userMappings,
      targetGroupId,
      academicGroups,
      chatGroups,
      recipientUserKeys
    });

    if (!recipients || recipients.length === 0) {
      return { success: true, count: 0, reason: 'no_recipients' };
    }

    const actionUrl = type === 'wall_post' && post?.id
      ? `https://englishtech.vercel.app/#post/${post.id}`
      : 'https://englishtech.vercel.app/#chat';

    // 3. Generar contenido del correo
    const { subject, html, text } = generateNotificationEmail({
      type,
      post,
      message,
      senderName,
      actionUrl
    });

    const recipientEmails = recipients.map(r => r.email);
    const notificationPayload = {
      type,
      subject,
      senderName: senderName || TEACHER_NAME,
      recipientsCount: recipients.length,
      recipientsEmails: recipientEmails,
      postTitle: post?.title || '',
      messageExcerpt: (message?.text || '').slice(0, 150),
      createdAt: Date.now(),
      status: 'queued'
    };

    // 4. Modo Demostración
    if (isDemoMode) {
      if (typeof saveDemoSandboxItem === 'function') {
        saveDemoSandboxItem('emailNotifications', {
          id: `demo_notif_${Date.now()}`,
          ...notificationPayload,
          status: 'sent'
        });
      }
      return { success: true, count: recipients.length, emails: recipientEmails, isDemo: true };
    }

    // 5. Registrar en Firestore si db y funciones están disponibles
    if (db && typeof addDocFn === 'function' && typeof collectionFn === 'function') {
      try {
        // a) Historial auditable de notificaciones
        await addDocFn(
          collectionFn(db, 'artifacts', appId, 'public', 'data', 'emailNotifications'),
          sanitizeFirestoreData(notificationPayload)
        ).catch(() => {});

        // b) Cola estándar de Firebase Trigger Email extension (colección 'mail')
        await addDocFn(
          collectionFn(db, 'artifacts', appId, 'public', 'data', 'mail'),
          sanitizeFirestoreData({
            to: recipientEmails,
            message: {
              subject,
              text,
              html
            },
            createdAt: Date.now()
          })
        ).catch(() => {});
      } catch (fsErr) {
        console.warn('Advertencia al encolar notificación en Firestore:', fsErr);
      }
    }

    // 6. Invocar Serverless Function /api/notify en Vercel
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            recipients,
            post,
            message,
            senderName,
            actionUrl,
            subject,
            html,
            text
          })
        }).catch(err => {
          console.warn('Aviso: endpoint /api/notify completado con fallback de cola:', err);
        });
      } catch (apiErr) {
        console.warn('Aviso al llamar /api/notify:', apiErr);
      }
    }

    return {
      success: true,
      count: recipients.length,
      emails: recipientEmails
    };
  } catch (err) {
    console.error('Error en dispatchStudentEmailNotification:', err);
    return { success: false, error: err };
  }
};

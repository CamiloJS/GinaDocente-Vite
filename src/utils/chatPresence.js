// src/utils/chatPresence.js
// Utilidades puras para presencia, ultima conexion (formato 12h AM/PM),
// indicadores de mensajes (azul = nuevo, rojo = visto sin responder) y ordenamiento de contactos.

export const isCamiloTeacherId = (val) => {
  if (!val) return false;
  const clean = String(val).toLowerCase().replace(/^@/, '').trim();
  return (
    clean === 'camilodocente' ||
    clean === 'teacher_camilo' ||
    clean === 'camilo jaimes' ||
    clean === 'camilodocente@unipamplona.edu.co' ||
    clean.includes('camilo jaimes')
  );
};

export const isTeacherUserId = (val) => {
  if (!val) return false;
  const clean = String(val).toLowerCase().replace(/^@/, '').trim();
  return (
    clean === 'teacher' ||
    clean === 'ginadocente' ||
    clean === 'teacher_gina' ||
    clean === 'demodocente' ||
    isCamiloTeacherId(clean)
  );
};

/**
 * Convierte cualquier representacion de fecha/timestamp (numero, string, Date, Firestore Timestamp)
 * a milisegundos desde epoch, o 0 si no es valido.
 */
export const toTimestampMs = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) || val <= 0 ? 0 : val;
  if (val instanceof Date) return isNaN(val.getTime()) || val.getTime() <= 0 ? 0 : val.getTime();
  if (typeof val?.toMillis === 'function') {
    const ms = Number(val.toMillis());
    return isNaN(ms) || ms <= 0 ? 0 : ms;
  }
  if (typeof val?.seconds === 'number') {
    const ms = val.seconds * 1000;
    return isNaN(ms) || ms <= 0 ? 0 : ms;
  }
  const num = Number(val);
  if (!isNaN(num) && num > 0) return num;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

/**
 * Obtiene los datos de mapeo de un usuario desde userMappings (insensible a mayusculas/@).
 */
export const getUserMappingData = (userOrId, userMappings = {}) => {
  if (!userOrId || !userMappings || typeof userMappings !== 'object') return {};
  const rawId = typeof userOrId === 'object' ? String(userOrId.id || '').trim() : String(userOrId).trim();
  const cleanId = rawId.toLowerCase().replace(/^@/, '').trim();
  if (!rawId && !cleanId) return {};
  if (userMappings[rawId]) return userMappings[rawId];
  if (userMappings[cleanId]) return userMappings[cleanId];
  if (cleanId === 'teacher' || cleanId === 'ginadocente' || cleanId === 'teacher_gina') {
    if (userMappings.teacher && userMappings.ginadocente) {
      return { ...userMappings.ginadocente, ...userMappings.teacher, profilePicUrl: userMappings.teacher.profilePicUrl || userMappings.ginadocente.profilePicUrl || '' };
    }
    if (userMappings.teacher) return userMappings.teacher;
    if (userMappings.ginadocente) return userMappings.ginadocente;
  }
  if (isCamiloTeacherId(cleanId) && userMappings.camilodocente) {
    return userMappings.camilodocente;
  }
  const matchKey = Object.keys(userMappings).find(
    (k) => k.toLowerCase().replace(/^@/, '').trim() === cleanId
  );
  return (matchKey && userMappings[matchKey]) || {};
};

/**
 * Obtiene el objeto de presencia de un usuario buscando por id, uid o prefijo de email.
 */
export const getUserPresenceData = (userOrId, userPresence = {}, userMappings = {}) => {
  if (!userOrId) return {};

  // Si se pasa directamente un objeto de presencia (ej. { lastSeen, lastPing, status })
  if (
    typeof userOrId === 'object' &&
    !userOrId.id &&
    ('lastSeen' in userOrId || 'lastPing' in userOrId || 'status' in userOrId || 'isOnline' in userOrId)
  ) {
    return userOrId;
  }

  if (!userPresence || typeof userPresence !== 'object') return {};

  const mapped = getUserMappingData(userOrId, userMappings);
  const rawId = typeof userOrId === 'object' ? String(userOrId.id || '').trim() : String(userOrId).trim();
  const cleanId = rawId.toLowerCase().replace(/^@/, '').trim();
  const uid = String((typeof userOrId === 'object' && userOrId.uid) || mapped.uid || '').trim();
  const email = String((typeof userOrId === 'object' && userOrId.email) || mapped.email || '').trim();
  const emailPrefix = email ? email.split('@')[0].trim() : '';

  if (cleanId === 'teacher' || cleanId === 'ginadocente' || cleanId === 'teacher_gina') {
    const candidates = [userPresence.teacher, userPresence.ginadocente, userPresence.teacher_gina, uid && userPresence[uid]].filter(Boolean);
    if (candidates.length > 0) {
      const onlineCandidate = candidates.find((c) => c.isOnline !== false && c.status && c.status !== 'offline');
      if (onlineCandidate) return onlineCandidate;
      return candidates.sort((a, b) => Math.max(toTimestampMs(b.lastPing), toTimestampMs(b.lastSeen)) - Math.max(toTimestampMs(a.lastPing), toTimestampMs(a.lastSeen)))[0];
    }
  }

  if (isCamiloTeacherId(cleanId)) {
    const candidates = [userPresence.camilodocente, userPresence.teacher_camilo, uid && userPresence[uid]].filter(Boolean);
    if (candidates.length > 0) {
      const onlineCandidate = candidates.find((c) => c.isOnline !== false && c.status && c.status !== 'offline');
      if (onlineCandidate) return onlineCandidate;
      return candidates.sort((a, b) => Math.max(toTimestampMs(b.lastPing), toTimestampMs(b.lastSeen)) - Math.max(toTimestampMs(a.lastPing), toTimestampMs(a.lastSeen)))[0];
    }
  }

  const direct =
    (rawId && userPresence[rawId]) ||
    (cleanId && userPresence[cleanId]) ||
    (uid && userPresence[uid]) ||
    (emailPrefix && (userPresence[emailPrefix] || userPresence[emailPrefix.toLowerCase()]));
  if (direct) return direct;

  if (cleanId) {
    const matchKey = Object.keys(userPresence).find(
      (k) => k.toLowerCase().replace(/^@/, '').trim() === cleanId
    );
    if (matchKey && userPresence[matchKey]) return userPresence[matchKey];
  }
  return {};
};

/**
 * Normaliza el estado de presencia ('online' | 'away' | 'busy' | 'offline').
 */
export const getPresenceStatus = (pData) => {
  if (!pData || typeof pData !== 'object') return 'offline';
  if (pData.isOnline === false || pData.status === 'offline') return 'offline';
  const st = pData.status;
  if (st === 'online' || st === 'away' || st === 'busy') return st;
  return 'offline';
};

/**
 * Determina si el ultimo mensaje de un chat DM fue enviado por el estudiante (y no por un docente).
 */
export const isLastMessageFromStudent = (userOrId, lastMsg, myChatId = '', userMappings = {}) => {
  if (!lastMsg || typeof lastMsg !== 'object') return false;
  if (!lastMsg.text && !lastMsg.author && !lastMsg.authorId && !lastMsg.createdAt) return false;

  if (lastMsg.authorId) {
    const cleanAuthorId = String(lastMsg.authorId).toLowerCase().replace(/^@/, '').trim();
    const cleanMyId = String(myChatId || '').toLowerCase().replace(/^@/, '').trim();
    if (cleanAuthorId) {
      if (cleanMyId && cleanAuthorId === cleanMyId) return false;
      if (isTeacherUserId(cleanAuthorId)) return false;
      return true;
    }
  }

  if (lastMsg.authorRole) {
    return lastMsg.authorRole !== 'teacher';
  }

  const authorStr = String(lastMsg.author || '').trim().toLowerCase();
  if (!authorStr) return false;
  if (
    authorStr === 'profesora' ||
    authorStr === 'la profe' ||
    authorStr === 'prof. camilo' ||
    authorStr === 'prof camilo' ||
    authorStr === 'docente' ||
    authorStr === 'teacher'
  ) {
    return false;
  }

  const mapped = getUserMappingData(userOrId, userMappings);
  const userName =
    typeof userOrId === 'object'
      ? userOrId?.name || userOrId?.fullName || mapped?.fullName || mapped?.name || ''
      : mapped?.fullName || mapped?.name || '';
  const studentFirstName = String(userName).trim().split(/\s+/)[0]?.toLowerCase() || '';

  const cleanMyId = String(myChatId || '').toLowerCase().replace(/^@/, '').trim();
  const isViewerCamilo = cleanMyId ? isCamiloTeacherId(cleanMyId) : false;
  const isViewerGina = cleanMyId ? isTeacherUserId(cleanMyId) && !isViewerCamilo : false;

  if (isViewerCamilo) {
    if (authorStr === 'camilo' || authorStr === 'camilo jaimes') return false;
    if (studentFirstName && authorStr === studentFirstName) return true;
    return true;
  }

  if (isViewerGina) {
    if (authorStr === 'gina' || authorStr.startsWith('gina marcela')) return false;
    if (studentFirstName && authorStr === studentFirstName) return true;
    return true;
  }

  if (studentFirstName && authorStr === studentFirstName) return true;

  return authorStr !== 'gina' && authorStr !== 'camilo';
};

/**
 * Devuelve el estado del indicador de punto para un chat en la lista de contactos:
 * - 'unread'     -> Puntico azul (mensaje nuevo sin abrir)
 * - 'unanswered' -> Puntico rojo (el docente ya abrio el mensaje pero no ha respondido)
 * - 'none'       -> Sin puntico
 */
export const getChatIndicatorState = ({
  user,
  chatId,
  unreadChats = {},
  lastMessages = {},
  myChatId = '',
  role = 'student',
  userMappings = {},
} = {}) => {
  if (unreadChats && unreadChats[chatId]) {
    return 'unread';
  }
  const isTargetTeacher =
    (typeof user === 'object' && (user?.role === 'teacher' || isTeacherUserId(user?.id))) ||
    (typeof user === 'string' && isTeacherUserId(user));
  if (
    role === 'teacher' &&
    !isTargetTeacher &&
    isLastMessageFromStudent(user, lastMessages?.[chatId], myChatId, userMappings)
  ) {
    return 'unanswered';
  }
  return 'none';
};

/**
 * Obtiene el timestamp (ms) mas reciente de la ultima conexion o actividad conocida de un usuario.
 * Considera:
 * - presenceData.lastSeen y presenceData.lastPing
 * - userMappings / userData (lastSeen, lastPing, lastLogin, lastUpdated)
 * - fallbackLastMsg (lastStudentAt o createdAt cuando el mensaje fue enviado por el estudiante)
 * - allLastMessages (cualquier DM donde el estudiante haya enviado un mensaje)
 */
export const getLastConnectionTime = (
  userOrId,
  userPresence = {},
  userMappings = {},
  fallbackLastMsg = null,
  allLastMessages = null
) => {
  const pData = getUserPresenceData(userOrId, userPresence, userMappings);
  const lastSeen = toTimestampMs(pData?.lastSeen);
  const lastPing = toTimestampMs(pData?.lastPing);
  const presenceTs = Math.max(lastSeen, lastPing);

  // Soporte para llamada directa getLastConnectionTime(presenceData, userData)
  const directUserData =
    userPresence &&
    typeof userPresence === 'object' &&
    ('lastUpdated' in userPresence || 'lastLogin' in userPresence || 'fullName' in userPresence)
      ? userPresence
      : null;

  const mapped = directUserData || getUserMappingData(userOrId, userMappings);
  const userObj = typeof userOrId === 'object' && userOrId ? userOrId : {};

  const userTs = Math.max(
    toTimestampMs(userObj.lastSeen),
    toTimestampMs(userObj.lastPing),
    toTimestampMs(userObj.lastLogin),
    toTimestampMs(userObj.lastUpdated),
    toTimestampMs(mapped?.lastSeen),
    toTimestampMs(mapped?.lastPing),
    toTimestampMs(mapped?.lastLogin),
    toTimestampMs(mapped?.lastUpdated)
  );

  let msgTs = 0;
  if (fallbackLastMsg && typeof fallbackLastMsg === 'object') {
    const preservedStudentTs = toTimestampMs(fallbackLastMsg.lastStudentAt);
    const directStudentTs = isLastMessageFromStudent(userOrId, fallbackLastMsg, '', userMappings)
      ? toTimestampMs(fallbackLastMsg.createdAt)
      : 0;
    msgTs = Math.max(preservedStudentTs, directStudentTs);
  }

  if (allLastMessages && typeof allLastMessages === 'object') {
    const rawId = typeof userOrId === 'object' ? String(userOrId?.id || '').trim() : String(userOrId || '').trim();
    const cleanId = rawId.toLowerCase().replace(/^@/, '').trim();
    if (cleanId) {
      for (const [k, m] of Object.entries(allLastMessages)) {
        if (!k.startsWith('dm_') || !m || typeof m !== 'object') continue;
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.startsWith(`dm_${cleanId}_`) ||
          lowerKey.endsWith(`_${cleanId}`)
        ) {
          const sTs = toTimestampMs(m.lastStudentAt);
          const dTs = isLastMessageFromStudent(userOrId, m, '', userMappings)
            ? toTimestampMs(m.createdAt)
            : 0;
          msgTs = Math.max(msgTs, sTs, dTs);
        }
      }
    }
  }

  return Math.max(presenceTs, userTs, msgTs);
};

/**
 * Formatea una hora en formato 12 horas AM/PM (ej: "3:45 PM", "12:05 AM").
 */
export const formatTimeAMPM = (dateOrTs) => {
  if (!dateOrTs && dateOrTs !== 0) return '';
  const ts = toTimestampMs(dateOrTs);
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
};

/**
 * Formatea la ultima vez de conexion en formato legible con AM/PM para el encabezado del chat.
 * Ejemplos:
 * - Hoy: "Última vez a las 3:45 PM"
 * - Ayer: "Última vez ayer a las 10:15 AM"
 * - Otro día: "Última vez 3 oct a las 8:30 PM"
 */
export const formatLastConnection = (timestamp, nowTs = Date.now()) => {
  const ts = toTimestampMs(timestamp);
  if (!ts) return 'Desconectado';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Desconectado';

  const resolvedNow = toTimestampMs(nowTs) || Date.now();
  const now = new Date(resolvedNow);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeStr = formatTimeAMPM(d);
  if (d.toDateString() === now.toDateString()) {
    return `Última vez a las ${timeStr}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Última vez ayer a las ${timeStr}`;
  }
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  return `Última vez ${dia} ${mes} a las ${timeStr}`;
};

/**
 * Ordena la lista de contactos del chat segun las prioridades requeridas:
 * 1. Conectados primero ('online', luego 'away'/'busy'; priorizando mensajes nuevos/sin responder).
 * 2. Mensajes sin responder (primero puntico azul 'unread', luego puntico rojo 'unanswered').
 * 3. Ultima conexion de los estudiantes (del que se conecto/desconecto mas recientemente al mas antiguo).
 * 4. Los que llevan mas tiempo sin conectarse o nunca se han conectado al final.
 */
export const sortChatContacts = (
  users = [],
  {
    userPresence = {},
    unreadChats = {},
    lastMessages = {},
    myChatId = '',
    role = 'student',
    userMappings = {},
  } = {}
) => {
  if (!Array.isArray(users)) return [];

  const getMsgRank = (indicator) => {
    if (indicator === 'unread') return 0;
    if (indicator === 'unanswered') return 1;
    return 2;
  };

  return [...users].sort((a, b) => {
    const chatIdA = `dm_${[myChatId, a.id].sort().join('_')}`;
    const chatIdB = `dm_${[myChatId, b.id].sort().join('_')}`;

    const pDataA = getUserPresenceData(a, userPresence, userMappings);
    const pDataB = getUserPresenceData(b, userPresence, userMappings);

    const statusA = getPresenceStatus(pDataA);
    const statusB = getPresenceStatus(pDataB);

    const isConnectedA = statusA === 'online' || statusA === 'away' || statusA === 'busy';
    const isConnectedB = statusB === 'online' || statusB === 'away' || statusB === 'busy';

    const indicatorA = getChatIndicatorState({
      user: a,
      chatId: chatIdA,
      unreadChats,
      lastMessages,
      myChatId,
      role,
      userMappings,
    });
    const indicatorB = getChatIndicatorState({
      user: b,
      chatId: chatIdB,
      unreadChats,
      lastMessages,
      myChatId,
      role,
      userMappings,
    });

    const msgRankA = getMsgRank(indicatorA);
    const msgRankB = getMsgRank(indicatorB);

    const lastMsgA = lastMessages?.[chatIdA] || null;
    const lastMsgB = lastMessages?.[chatIdB] || null;
    const lastMsgTimeA = toTimestampMs(lastMsgA?.createdAt);
    const lastMsgTimeB = toTimestampMs(lastMsgB?.createdAt);

    const lastConnA = getLastConnectionTime(a, userPresence, userMappings, lastMsgA, lastMessages);
    const lastConnB = getLastConnectionTime(b, userPresence, userMappings, lastMsgB, lastMessages);

    // 1. De primero todititicos los conectados
    if (isConnectedA !== isConnectedB) {
      return isConnectedA ? -1 : 1;
    }

    if (isConnectedA && isConnectedB) {
      // Dentro de los conectados: primero si tienen mensaje nuevo o sin responder
      if (msgRankA !== msgRankB) return msgRankA - msgRankB;
      if (msgRankA < 2 && lastMsgTimeA !== lastMsgTimeB) return lastMsgTimeB - lastMsgTimeA;
      // Luego 'online' antes de 'away'/'busy'
      const connRankA = statusA === 'online' ? 0 : 1;
      const connRankB = statusB === 'online' ? 0 : 1;
      if (connRankA !== connRankB) return connRankA - connRankB;
      if (a.role === 'teacher' && b.role !== 'teacher') return -1;
      if (b.role === 'teacher' && a.role !== 'teacher') return 1;
      if (lastConnA !== lastConnB) return lastConnB - lastConnA;
      return (a.name || '').localeCompare(b.name || '');
    }

    // 2. Despues los mensajes sin responder (azul = nuevo primero, rojo = visto sin responder despues)
    if (msgRankA !== msgRankB) {
      return msgRankA - msgRankB;
    }

    if (msgRankA < 2 && msgRankB < 2) {
      if (lastMsgTimeA !== lastMsgTimeB) return lastMsgTimeB - lastMsgTimeA;
      if (lastConnA !== lastConnB) return lastConnB - lastConnA;
      return (a.name || '').localeCompare(b.name || '');
    }

    // Para estudiantes viendo su lista, mantener docentes visibles arriba si ambos estan desconectados
    if (role !== 'teacher') {
      if (a.role === 'teacher' && b.role !== 'teacher') return -1;
      if (b.role === 'teacher' && a.role !== 'teacher') return 1;
    }

    // 3 y 4. Orden de ultima conexion: del mas reciente al que se conecto hace bastante tiempo
    if (lastConnA !== lastConnB) {
      return lastConnB - lastConnA;
    }

    if (lastMsgTimeA !== lastMsgTimeB) {
      return lastMsgTimeB - lastMsgTimeA;
    }

    return (a.name || '').localeCompare(b.name || '');
  });
};

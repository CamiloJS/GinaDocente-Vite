// src/utils/helpers.js
// Constantes globales y funciones de utilidad (migrado del HTML original)

import { ref, uploadString, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage'
import { storage, appId } from '../firebase/config.js'
import { autoOptimizeFile, compressImageSilently } from './fileCompressor.js'
import { segmentosLocales, narrarSegmentos } from './narracion.js';
import { isImageLikeFile, isHeicFile, isHeicUrl, convertHeicToJpeg, resolveHeicUrlToDisplayable } from './heicConverter.js';

export { isImageLikeFile, isHeicFile, isHeicUrl, convertHeicToJpeg, resolveHeicUrlToDisplayable };

// --- Constantes globales ---
export const BAD_WORDS = [
  'puta', 'putas', 'puto', 'putos', 'mierda', 'mierdas', 'pendejo', 'pendejos', 'pendeja', 'pendejas',
  'idiota', 'idiotas', 'estupido', 'estupidos', 'estupida', 'estupidas', 'imbecil', 'imbeciles',
  'maricon', 'maricones', 'marica', 'maricas', 'zorra', 'zorras', 'culo', 'culos', 'coño', 'joder',
  'gilipollas', 'pendejadas', 'guevon', 'huevon', 'guevones', 'huevones', 'mariconada', 'putazo',
  'vagabunda', 'bagabunda', 'vagabundas', 'basura', 'perra', 'perras',
  'malparido', 'malparidos', 'malparida', 'gonorrea', 'gonorreas', 'hijueputa', 'hijueputas',
  'hijuputa', 'carechimba', 'pirobo', 'pirobos', 'cacorro', 'bazuquero', 'sapo', 'sapa', 'picha',
  'chingar', 'chingue', 'chinga', 'chingada', 'chingazo', 'chingaderas', 'pinche', 'pinches',
  'cabron', 'cabrones', 'cabrona', 'culero', 'culeros', 'culera', 'verga', 'vergas', 'pito',
  'panocha', 'joto', 'jotos', 'puñetas', 'putiza', 'mamada', 'vergazos', 'putear', 'chupala',
  'mamaguevo', 'mamabicho', 'comemierda',
]

export const REACTION_EMOJIS = { 
  like: '👍', 
  love: '❤️', 
  care: '🥰', 
  happy: '😆', 
  wow: '😮', 
  sad: '😢', 
  angry: '😡' 
};

export const FACEBOOK_REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Me gusta' },
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'care', emoji: '🥰', label: 'Me importa' },
  { key: 'happy', emoji: '😆', label: 'Me divierte' },
  { key: 'wow', emoji: '😮', label: 'Me asombra' },
  { key: 'sad', emoji: '😢', label: 'Me entristece' },
  { key: 'angry', emoji: '😡', label: 'Me enoja' },
];
export const COMMENT_EMOJIS = ['😀', '😂', '🥰', '😎', '👍', '🙏', '❤️', '🔥', '✨', '🤔']

export const SLIDE_GRADIENTS = [
  'from-blue-400/40 to-indigo-500/40',
  'from-emerald-400/40 to-teal-500/40',
  'from-rose-400/40 to-orange-500/40',
  'from-purple-400/40 to-pink-500/40',
  'from-amber-400/40 to-red-500/40',
  'from-cyan-400/40 to-blue-500/40',
]

export const CHAT_GRADIENTS = [
  '', // Por defecto
  ...SLIDE_GRADIENTS,
  'from-fuchsia-500/40 to-pink-500/40', // Rosa / Fucsia
  'from-violet-500/40 to-fuchsia-500/40',
]

export const CHAT_PATTERNS = [
  { id: 'none', name: 'Ninguno', style: {} },
  { id: 'dots', name: 'Puntos', style: { backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' } },
  { id: 'grid', name: 'Cuadrícula', style: { backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' } },
  { id: 'diagonal', name: 'Rayas', style: { backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' } },
  { id: 'boxes', name: 'Cajas', style: { backgroundImage: 'linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' } },
]

export const TEACHER_NAME = 'Gina Marcela Quintana Delgado'
export const SECOND_TEACHER_NAME = 'Camilo Jaimes'
export const SECOND_TEACHER_ID = 'camilodocente'

export const isCamiloTeacher = (val) => {
  if (!val) return false
  const clean = String(val).toLowerCase().replace(/^@/, '').trim()
  return (
    clean === 'camilodocente' ||
    clean === 'teacher_camilo' ||
    clean === 'camilo jaimes' ||
    clean === 'camilodocente@unipamplona.edu.co' ||
    clean === 'edwincamilojaimes1@gmail.com' ||
    clean.includes('camilo jaimes') ||
    clean.includes('camilojaimes') ||
    clean.includes('edwincamilo') ||
    clean.includes('edwin camilo')
  )
}

export const isTeacherId = (val) => {
  if (!val) return false
  const clean = String(val).toLowerCase().replace(/^@/, '').trim()
  return (
    clean === 'teacher' ||
    clean === 'ginadocente' ||
    clean === 'teacher_gina' ||
    clean === 'demodocente' ||
    clean === 'gina' ||
    clean.includes('gina marcela') ||
    clean.includes('gina quintana') ||
    isCamiloTeacher(clean)
  )
}

export const getCanonicalTeacherId = (val) => (isCamiloTeacher(val) ? 'camilodocente' : 'teacher')

export const getTeacherDisplayName = (val) => (isCamiloTeacher(val) ? SECOND_TEACHER_NAME : TEACHER_NAME)

export const getTeacherUsername = (val) => (isCamiloTeacher(val) ? 'CamiloDocente' : 'GinaDocente')

export const getItemTeacherId = (item) => {
  if (!item || typeof item !== 'object') return 'teacher'
  const candidates = [
    item.teacherId,
    item.ownerTeacherId,
    item.createdBy,
    item.authorId,
    item.authorUsername,
    item.authorName,
    item.author,
    item.teacherName,
  ]
  for (const c of candidates) {
    if (c && isCamiloTeacher(c)) return 'camilodocente'
  }
  return 'teacher'
}

export const splitNameFirstAndLast = (fullName) => {
  if (!fullName) return { first: '', last: '' }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  if (parts.length === 2) return { first: parts[0], last: parts[1] }
  if (parts.length === 3) return { first: parts[0], last: `${parts[1]} ${parts[2]}` }
  // 4 o más palabras (ej: Gina Marcela Quintana Delgado -> First: Gina Marcela, Last: Quintana Delgado)
  const first = parts.slice(0, parts.length - 2).join(' ')
  const last = parts.slice(-2).join(' ')
  return { first, last }
}

export const FALLBACK_MAP = {
  ginadocente: { email: 'ginamarcelaquintana19@gmail.com', name: 'La profe', fullName: 'Gina Marcela Quintana Delgado', role: 'teacher', profilePicUrl: '/icono.png' },
  teacher: { email: 'ginamarcelaquintana19@gmail.com', name: 'La profe', fullName: 'Gina Marcela Quintana Delgado', role: 'teacher', profilePicUrl: '/icono.png' },
  camilodocente: { email: 'camilodocente@unipamplona.edu.co', name: 'Camilo Jaimes', fullName: 'Camilo Jaimes', role: 'teacher', profilePicUrl: '' },
}

/**
 * Resuelve dinámicamente el nombre completo actual y visible de un usuario o autor
 * (para comentarios, entregas, foros y publicaciones) consultando userMappings.
 * Si el nombre del estudiante fue corregido o actualizado por el docente, siempre
 * devuelve el nombre completo actualizado en lugar de cadenas obsoletas estáticas.
 */
export const resolveUserDisplayName = (itemOrId, userMappings, fallbackName = '') => {
  if (!itemOrId && !fallbackName) return '';

  let rawAuthor = '';
  let authorUsername = '';
  let authorId = '';
  let uid = '';
  let email = '';
  let isExplicitStudent = false;

  if (typeof itemOrId === 'object' && itemOrId !== null) {
    rawAuthor = String(itemOrId.author || itemOrId.authorName || itemOrId.senderName || itemOrId.name || itemOrId.fullName || '').trim();
    authorUsername = String(itemOrId.authorUsername || itemOrId.username || itemOrId.userKey || '').trim().replace(/^@/, '');
    authorId = String(itemOrId.authorId || itemOrId.userId || itemOrId.senderId || itemOrId.id || '').trim().replace(/^@/, '');
    uid = String(itemOrId.uid || '').trim();
    email = String(itemOrId.email || '').trim().toLowerCase();
    isExplicitStudent = (itemOrId.authorRole === 'student' || itemOrId.role === 'student' || itemOrId.userRole === 'student');
  } else {
    const str = String(itemOrId).trim();
    rawAuthor = str;
    authorUsername = str.replace(/^@/, '');
    authorId = str.replace(/^@/, '');
  }

  const effectiveFallback = fallbackName || rawAuthor || authorUsername || authorId || 'Usuario';

  // Si es un estudiante explícito, JAMÁS resolver como docente
  if (!isExplicitStudent) {
    // Si es alguno de los docentes oficiales, resolver con sus nombres oficiales
    if (isCamiloTeacher(authorUsername) || isCamiloTeacher(authorId) || isCamiloTeacher(rawAuthor)) {
      return SECOND_TEACHER_NAME;
    }
    const rawAuthorLower = rawAuthor.toLowerCase();
    if (
      authorUsername.toLowerCase() === 'teacher' || 
      authorUsername.toLowerCase() === 'ginadocente' || 
      authorId.toLowerCase() === 'teacher' || 
      authorId.toLowerCase() === 'ginadocente' ||
      rawAuthorLower === 'profesora' || 
      rawAuthorLower === 'profesor' || 
      rawAuthorLower === 'la profe' || 
      rawAuthorLower === 'docente' || 
      rawAuthorLower === 'docente gina' ||
      rawAuthorLower.includes('gina marcela')
    ) {
      return TEACHER_NAME;
    }
  }

  if (!userMappings || typeof userMappings !== 'object') {
    return effectiveFallback;
  }

  // 1. Búsqueda directa por username / userKey
  const cleanUsername = authorUsername.toLowerCase();
  if (cleanUsername) {
    if (userMappings[cleanUsername]?.fullName) {
      return userMappings[cleanUsername].fullName.trim();
    }
    const keyMatch = Object.keys(userMappings).find(k => k.toLowerCase() === cleanUsername);
    if (keyMatch && userMappings[keyMatch]?.fullName) {
      return userMappings[keyMatch].fullName.trim();
    }
  }

  // 2. Búsqueda por authorId / uid
  const cleanId = authorId.toLowerCase();
  if (cleanId) {
    const idKeyMatch = Object.keys(userMappings).find(k => k.toLowerCase() === cleanId);
    if (idKeyMatch && userMappings[idKeyMatch]?.fullName) {
      return userMappings[idKeyMatch].fullName.trim();
    }
    const uidMatch = Object.values(userMappings).find(u => (u?.uid && u.uid.toLowerCase() === cleanId) || (uid && u?.uid === uid));
    if (uidMatch?.fullName) {
      return uidMatch.fullName.trim();
    }
  }

  // 3. Búsqueda por correo electrónico
  if (email) {
    const emailMatch = Object.values(userMappings).find(u => u?.email && u.email.toLowerCase() === email);
    if (emailMatch?.fullName) {
      return emailMatch.fullName.trim();
    }
  }

  // 4. Búsqueda por nombre previo / parcial (para comentarios antiguos que solo guardaron el nombre previo)
  if (rawAuthor) {
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const rawNorm = norm(rawAuthor);

    // a) Coincidencia exacta de nombre
    const exactNameMatch = Object.values(userMappings).find(u => {
      const uNorm = norm(u?.fullName);
      return uNorm && uNorm === rawNorm;
    });
    if (exactNameMatch?.fullName) {
      return exactNameMatch.fullName.trim();
    }

    // b) Si el nuevo nombre completo del estudiante en userMappings contiene todas las palabras clave del nombre anterior
    // Por ejemplo: rawAuthor = "Camila Rodríguez", palabras: ["camila", "rodriguez"]
    // u.fullName = "Maria Camila Rodríguez Monterrey" (contiene "camila" y "rodriguez")
    const authorWords = rawNorm.split(/\s+/).filter(w => w.length >= 3);
    if (authorWords.length >= 2) {
      const candidate = Object.values(userMappings).find(u => {
        const uNorm = norm(u?.fullName);
        if (!uNorm) return false;
        return authorWords.every(w => uNorm.includes(w));
      });
      if (candidate?.fullName) {
        return candidate.fullName.trim();
      }
    }
  }

  return effectiveFallback;
};

/**
 * Resuelve dinámicamente la foto de perfil más actualizada de un usuario o autor
 * (para publicaciones, muros, comentarios, perfiles, evaluaciones, chats y entregas)
 * consultando primero userMappings en tiempo real.
 * Si el estudiante o docente actualizó su foto de perfil (en Google o en EnglishTech),
 * siempre devuelve la foto nueva y vigente en lugar de fotos estáticas u obsoletas guardadas en registros históricos.
 */
export const resolveUserPhoto = (itemOrId, userMappings, fallbackPhoto = '') => {
  if (!itemOrId && !fallbackPhoto) return '';

  let rawAuthor = '';
  let authorUsername = '';
  let authorId = '';
  let uid = '';
  let email = '';
  let explicitPhoto = '';
  let isExplicitStudent = false;

  if (typeof itemOrId === 'object' && itemOrId !== null) {
    rawAuthor = String(itemOrId.author || itemOrId.authorName || itemOrId.senderName || itemOrId.name || itemOrId.fullName || '').trim();
    authorUsername = String(itemOrId.authorUsername || itemOrId.username || itemOrId.userKey || '').trim().replace(/^@/, '');
    authorId = String(itemOrId.authorId || itemOrId.userId || itemOrId.senderId || itemOrId.id || '').trim().replace(/^@/, '');
    uid = String(itemOrId.uid || '').trim();
    email = String(itemOrId.email || '').trim().toLowerCase();
    explicitPhoto = String(itemOrId.profilePicUrl || itemOrId.photoURL || itemOrId.authorPhoto || itemOrId.avatar || itemOrId.studentPhoto || '').trim();
    isExplicitStudent = (itemOrId.authorRole === 'student' || itemOrId.role === 'student' || itemOrId.userRole === 'student');
  } else {
    const str = String(itemOrId).trim();
    rawAuthor = str;
    authorUsername = str.replace(/^@/, '');
    authorId = str.replace(/^@/, '');
  }

  const cleanFallback = fallbackPhoto || explicitPhoto || '';
  const rawAuthorLower = rawAuthor.toLowerCase();
  const authorUserLower = authorUsername.toLowerCase();
  const authorIdLower = authorId.toLowerCase();

  // Si es un estudiante explícito, JAMÁS resolver fotos docentes oficiales
  if (!isExplicitStudent) {
    // 1. Docentes oficiales
    if (isCamiloTeacher(authorUsername) || isCamiloTeacher(authorId) || isCamiloTeacher(rawAuthor)) {
      return userMappings?.[SECOND_TEACHER_ID]?.profilePicUrl || userMappings?.['camilodocente']?.profilePicUrl || FALLBACK_MAP?.[SECOND_TEACHER_ID]?.profilePicUrl || '';
    }

    if (
      authorUserLower === 'teacher' || 
      authorUserLower === 'ginadocente' || 
      authorIdLower === 'teacher' || 
      authorIdLower === 'ginadocente' ||
      rawAuthorLower === 'profesora' || 
      rawAuthorLower === 'profesor' || 
      rawAuthorLower === 'la profe' || 
      rawAuthorLower === 'docente' || 
      rawAuthorLower === 'docente gina' ||
      rawAuthorLower.includes('gina marcela')
    ) {
      return userMappings?.['teacher']?.profilePicUrl || userMappings?.['ginadocente']?.profilePicUrl || FALLBACK_MAP?.['teacher']?.profilePicUrl || '/icono.png';
    }
  }

  if (!userMappings || typeof userMappings !== 'object') {
    return cleanFallback;
  }

  // 2. Búsqueda por username / userKey
  if (authorUserLower) {
    if (userMappings[authorUserLower]?.profilePicUrl) {
      return userMappings[authorUserLower].profilePicUrl;
    }
    const keyMatch = Object.keys(userMappings).find(k => k.toLowerCase().replace(/^@/, '') === authorUserLower);
    if (keyMatch && userMappings[keyMatch]?.profilePicUrl) {
      return userMappings[keyMatch].profilePicUrl;
    }
  }

  // 3. Búsqueda por authorId / uid
  if (authorIdLower) {
    if (userMappings[authorIdLower]?.profilePicUrl) {
      return userMappings[authorIdLower].profilePicUrl;
    }
    const idKeyMatch = Object.keys(userMappings).find(k => k.toLowerCase().replace(/^@/, '') === authorIdLower);
    if (idKeyMatch && userMappings[idKeyMatch]?.profilePicUrl) {
      return userMappings[idKeyMatch].profilePicUrl;
    }
    const uidMatch = Object.values(userMappings).find(u => (u?.uid && u.uid.toLowerCase() === authorIdLower) || (uid && u?.uid === uid));
    if (uidMatch?.profilePicUrl) {
      return uidMatch.profilePicUrl;
    }
  }

  if (uid) {
    const uidMatch = Object.values(userMappings).find(u => u?.uid && u.uid === uid);
    if (uidMatch?.profilePicUrl) {
      return uidMatch.profilePicUrl;
    }
  }

  // 4. Búsqueda por email
  if (email) {
    const emailMatch = Object.values(userMappings).find(u => u?.email && u.email.toLowerCase() === email);
    if (emailMatch?.profilePicUrl) {
      return emailMatch.profilePicUrl;
    }
  }

  // 5. Búsqueda por nombre completo
  if (rawAuthor) {
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const rawNorm = norm(rawAuthor);
    const exactNameMatch = Object.values(userMappings).find(u => norm(u?.fullName) === rawNorm);
    if (exactNameMatch?.profilePicUrl) {
      return exactNameMatch.profilePicUrl;
    }
    const authorWords = rawNorm.split(/\s+/).filter(w => w.length >= 3);
    if (authorWords.length >= 2) {
      const candidate = Object.values(userMappings).find(u => {
        const uNorm = norm(u?.fullName);
        if (!uNorm) return false;
        return authorWords.every(w => uNorm.includes(w));
      });
      if (candidate?.profilePicUrl) {
        return candidate.profilePicUrl;
      }
    }
  }

  if (isExplicitStudent && (cleanFallback === '/icono.png' || cleanFallback === FALLBACK_MAP?.['teacher']?.profilePicUrl)) {
    return '';
  }
  return cleanFallback;
};

// --- Funciones de utilidad ---
export const compressImage = async (file, maxWidth = 2048, maxHeight = 2048, quality = 0.85) => {
  if (!file) return null;
  // Si es un GIF animado, preservar los fotogramas y la animación intacta sin pasar por canvas
  if (file.type === 'image/gif' || file.name?.toLowerCase().endsWith('.gif')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // Respetar el límite de dimensión solicitado (ej. 256px para avatares, 800px para posts, 2048px por defecto)
  const targetMaxDim = Math.max(64, Math.min(Number(maxWidth) || 2048, Number(maxHeight) || 2048));
  const optimizedFile = await compressImageSilently(file, targetMaxDim, quality, targetMaxDim <= 512);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(optimizedFile);
  });
};

export const isDemoSessionActive = () => {
  try {
    if (typeof window !== 'undefined') {
      if (window.__ENGLISH_TECH_DEMO__) return true;
      const hash = (window.location?.hash || '').toLowerCase();
      const search = (window.location?.search || '').toLowerCase();
      if (hash.startsWith('#demo') || hash.startsWith('#invitado') || search.includes('demo=1') || search.includes('demo=true') || search.includes('demo=teacher')) {
        return true;
      }
    }
    if (typeof sessionStorage !== 'undefined') {
      const isDemoFlag = sessionStorage.getItem('englishTech_isDemo');
      const demoModeFlag = sessionStorage.getItem('englishTech_demoMode');
      if (isDemoFlag === '1' || isDemoFlag === 'true' || demoModeFlag === '1' || demoModeFlag === 'true') {
        return true;
      }
    }
  } catch {
    // ignore storage access errors
  }
  return false;
};

export const uploadImageToStorage = async (fileOrBase64, folderName) => {
  if (!fileOrBase64) return '';
  if (typeof fileOrBase64 !== 'string') {
    // Las imagenes SIEMPRE se comprimen antes de subir (los GIF conservan su animacion).
    if (isImageLikeFile(fileOrBase64) || (fileOrBase64?.type && String(fileOrBase64.type).startsWith('image/'))) {
      try {
        const comprimida = await compressImage(fileOrBase64);
        if (comprimida) return await uploadImageToStorage(comprimida, folderName);
      } catch (e) { /* si algo falla, se sube tal cual para no bloquear */ }
    }
    return await uploadRawFileToStorage(fileOrBase64, folderName);
  }
  // En Modo Demo, nunca subir imágenes al Firebase Storage de producción
  if (isDemoSessionActive()) {
    return fileOrBase64;
  }
  // Generamos un nombre único según el formato (soporte completo para GIFs animados)
  const isGif = fileOrBase64.startsWith('data:image/gif');
  const ext = isGif ? 'gif' : 'jpg';
  const fileName = `${appId}/${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
  const storageRef = ref(storage, fileName)

  // Subimos el string Base64 directamente a Storage
  await uploadString(storageRef, fileOrBase64, 'data_url')

  // Obtenemos y retornamos la URL publica
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}

export const uploadRawFileToStorage = async (file, folderName) => {
  if (!file) return "";
  // En Modo Demo, nunca subir archivos ni notas de voz al Firebase Storage de producción
  if (isDemoSessionActive()) {
    try {
      if (typeof file.size === 'number' && file.size <= 1.5 * 1024 * 1024 && typeof FileReader !== 'undefined') {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL.createObjectURL(file);
      }
    } catch {
      // Fallback
    }
    return "";
  }
  // Optimización silenciosa y transparente (fotos <= 10MB, documentos <= 30MB)
  const optimized = await autoOptimizeFile(file);
  const safeName = ((optimized && optimized.name) || (file && file.name) || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
  const fileName = `${appId}/${folderName}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, fileName)
  await uploadBytes(storageRef, optimized)
  return await getDownloadURL(storageRef)
}

export const extractStoragePathFromUrl = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return null;
  }
  if (trimmed.startsWith(`${appId}/`)) {
    return trimmed;
  }
  if (trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('.firebasestorage.app')) {
    const match = trimmed.match(/\/o\/([^?#]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  if (trimmed.startsWith('gs://')) {
    const withoutScheme = trimmed.slice(5);
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx !== -1) {
      return withoutScheme.slice(slashIdx + 1);
    }
  }
  return null;
};

export const deleteFileFromStorage = async (urlOrPath) => {
  if (!urlOrPath || isDemoSessionActive()) return false;
  const storagePath = extractStoragePathFromUrl(urlOrPath);
  if (!storagePath) return false;
  try {
    await deleteObject(ref(storage, storagePath));
    return true;
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Aviso al eliminar archivo de Storage:', storagePath, err?.code || err?.message);
    }
    return false;
  }
};

export const deleteFilesFromStorage = async (urlsOrPaths = []) => {
  if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0 || isDemoSessionActive()) return 0;
  const uniquePaths = Array.from(
    new Set(
      urlsOrPaths
        .map((u) => extractStoragePathFromUrl(u))
        .filter(Boolean)
    )
  );
  if (uniquePaths.length === 0) return 0;
  let deletedCount = 0;
  const batchSize = 15;
  for (let i = 0; i < uniquePaths.length; i += batchSize) {
    const batch = uniquePaths.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((pathStr) => deleteObject(ref(storage, pathStr)))
    );
    results.forEach((r) => {
      if (r.status === 'fulfilled') deletedCount += 1;
    });
  }
  return deletedCount;
};

export const extractStorageUrlsFromObject = (input, visited = new Set()) => {
  const foundPaths = new Set();

  const walk = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      const directPath = extractStoragePathFromUrl(val);
      if (directPath) {
        foundPaths.add(directPath);
      } else if (val.includes('firebasestorage.googleapis.com')) {
        const regex = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^"'\s<>)+]+\/o\/([^?"'\s<>&#)+]+)/g;
        let m;
        while ((m = regex.exec(val)) !== null) {
          try {
            foundPaths.add(decodeURIComponent(m[1]));
          } catch {
            foundPaths.add(m[1]);
          }
        }
      }
      return;
    }
    if (typeof val !== 'object') return;
    if (visited.has(val)) return;
    visited.add(val);

    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }
    for (const key of Object.keys(val)) {
      walk(val[key]);
    }
  };

  walk(input);
  return Array.from(foundPaths);
};

export const deleteAllStorageFilesInObject = async (obj) => {
  if (!obj || isDemoSessionActive()) return 0;
  const paths = extractStorageUrlsFromObject(obj);
  if (paths.length === 0) return 0;
  return await deleteFilesFromStorage(paths);
};

export const deleteReplacedStorageFiles = async (oldObj, newObj) => {
  if (!oldObj || isDemoSessionActive()) return 0;
  const oldPaths = extractStorageUrlsFromObject(oldObj);
  if (oldPaths.length === 0) return 0;
  const newPathsSet = new Set(extractStorageUrlsFromObject(newObj));
  const removedPaths = oldPaths.filter((p) => !newPathsSet.has(p));
  if (removedPaths.length === 0) return 0;
  return await deleteFilesFromStorage(removedPaths);
};

export const containsBadWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  const plainText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const leetMap = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '7': 't', '8': 'b', '$': 's' };
  const applyLeet = (s) => s.replace(/[4@31!0578$]/g, (m) => leetMap[m] || m);
  const leetText = applyLeet(plainText);
  const leetTrimmed = applyLeet(plainText.replace(/[!@$]+(?=\s|$|[.,?;:)!?])/g, ' '));
  return BAD_WORDS.some((word) => {
    const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const regexStr = normalizedWord.split('').map((char) => `${char}+`).join('')
    const regex = new RegExp(`\\b${regexStr}\\b`, 'i')
    return regex.test(plainText) || regex.test(leetText) || regex.test(leetTrimmed)
  })
}

// Filtro de contenido en backend (Vercel /api/filter) con fallback local
export const checkBadWordsAsync = async (text) => {
  try {
    const res = await fetch('/api/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text || '' }),
    })
    if (res.ok) {
      const data = await res.json()
      return !!data.hasBadWords
    }
  } catch (err) {}
  // Fallback local si la API no responde (nunca perder el filtro)
  return containsBadWords(text)
}

export const formatChatDate = (timestamp) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = (total % 60).toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  }
  return `${m.toString().padStart(2, '0')}:${s}`;
};

// Formato de hora en 12 horas con AM / PM (ej: "14:30" -> "2:30 PM", timestamp -> "2:30 PM")
export const format12HourTime = (timeInput) => {
  if (!timeInput && timeInput !== 0) return '';
  
  // Si es un string de formato "HH:mm" o "HH:mm:ss"
  if (typeof timeInput === 'string' && timeInput.includes(':') && !timeInput.includes('T') && !timeInput.includes('-') && !timeInput.includes('/')) {
    const parts = timeInput.trim().split(':');
    let h = parseInt(parts[0], 10);
    const m = (parts[1] || '00').substring(0, 2);
    if (isNaN(h)) return timeInput;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m}\u00A0${ampm}`;
  }

  // Si es un timestamp numérico o string parseable de fecha
  try {
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return String(timeInput);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m}\u00A0${ampm}`;
  } catch (e) {
    return String(timeInput);
  }
};

// Formato amigable de fecha y hora en 12h (ej: "17 ago, 2:30 PM" o "17 ago • 2:30 PM")
export const formatDateTime12H = (timestamp) => {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const timeStr = format12HourTime(d);
    return `${dateStr} • ${timeStr}`;
  } catch (e) {
    return '';
  }
};

// Fecha relativa en español (ej: "Justo ahora", "Hace 5 min")
export const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const diffMs = Date.now() - Number(timestamp)
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Justo ahora'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Hace ${diffD} d`
  const d = new Date(Number(timestamp))
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export const cleanTextForTTS = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // 1. Quitar enlaces URL
    .replace(/https?:\/\/[^\s]+/gi, '')
    // 2. Quitar etiquetas BBCode de color y formato
    .replace(/\[color=[^\]]*\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\[highlight\]/gi, '')
    .replace(/\[\/highlight\]/gi, '')
    .replace(/\[\/?[a-z0-9_-]+(?:=[^\]]*)?\]/gi, '')
    // 3. Quitar etiquetas HTML (<b...>, <span...>, <mark...>)
    .replace(/<[^>]+>/g, '')
    // 4. Quitar encabezados o viñetas al inicio de línea
    .replace(/^([#>*\-\s]+)/gm, '')
    // 5. Quitar marcadores de Markdown inline (negrita, cursiva, tachado, resaltado)
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/==([\s\S]+?)==/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/_([^_\n]+?)_/g, '$1')
    .replace(/`([^`]+?)`/g, '$1')
    .replace(/[*_~=`#]/g, '')
    // 6. Quitar emojis para evitar descripciones robóticas habladas
    .replace(/(?:[\u2700-\u27bf]|(?:[\ud83c\udde6-\ud83c\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|[\u2934-\u2935]|[\u25aa-\u25ab]|[\u25b6|\u25c0]|[\u25fb-\u25fe]|[\u2600-\u26ff]|[\u2b05-\u2b07]|[\u2b1b-\u2b1c]|\u2b50|\u2b55|[\u2300-\u23ff]|[\u200d\ufe0f\ufe0e])+/gu, '')
    // 7. Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim();
};

export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'es-MX';
  const clean = text.toLowerCase();
  
  // Patrones característicos de francés
  const frenchMatches = (clean.match(/\b(bonjour|salut|merci|oui|non|avec|pour|dans|sur|nous|vous|ils|elles|mon|ma|mes|ton|ta|tes|son|sa|ses|le|la|les|un|une|des|du|au|aux|est|sont|c'est|j'ai|je|tu|il|elle|on|français|très|bien|aussi|cours|devoir|étudiant|parler|écouter|lire|écrire|professeur)\b/gi) || []).length;
  
  // Patrones característicos de español
  const spanishMatches = (clean.match(/\b(el|la|los|las|un|una|unos|unas|para|por|con|de|en|sobre|entre|como|pero|más|muy|está|están|hola|gracias|tarea|actividad|clase|profesor|profesora|estudiante|entrega|fecha|asignación|repaso|pregunta|respuesta|adjunto|adjunta|saludos|atentamente|docente|universidad|bienvenidos|bienvenida|periodo)\b|[áéíóúñ¿¡]/gi) || []).length;
  
  // Patrones característicos de inglés
  const englishMatches = (clean.match(/\b(the|is|are|was|were|to|and|in|on|at|for|with|this|that|these|those|have|has|had|will|would|can|could|should|task|homework|lesson|unit|student|teacher|class|grade|submit|reading|writing|speaking|listen|welcome|dear|regards|attached|due|date|time)\b/gi) || []).length;

  if (frenchMatches > 2 && frenchMatches > spanishMatches && frenchMatches > englishMatches) {
    return 'fr-FR';
  }
  
  if (spanishMatches >= englishMatches && spanishMatches > 0) {
    return 'es-MX';
  }

  // Si predomina inglés
  if (englishMatches > 0) {
    return 'en-US';
  }

  // Por defecto español mexicano
  return 'es-MX';
};

export const selectBestFemaleVoice = (voices, lang = 'es-MX') => {
  if (!voices || voices.length === 0) return null;
  const langPrefix = lang.split('-')[0].toLowerCase();
  
  const normalizedVoices = voices.map(v => ({
    voice: v,
    name: v.name.toLowerCase(),
    lang: v.lang.replace('_', '-').toLowerCase()
  }));

  // 1. ESPAÑOL: Voz femenina fija con acento Mexicano (Dalia, Sabina, Paulina, etc.)
  if (langPrefix === 'es') {
    const priorityMexico = [
      'microsoft dalia online (natural) - spanish (mexico)',
      'microsoft dalia',
      'microsoft sabina',
      'microsoft paulina',
      'google español (méxico)',
      'google español de estados unidos',
      'paulina (es-mx)',
      'dalia',
      'sabina',
      'paulina',
      'paloma',
      'soledad',
      'jimena'
    ];

    for (const name of priorityMexico) {
      const match = normalizedVoices.find(v => (v.lang.includes('mx') || v.name.includes('mexic')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const mexicanFemale = normalizedVoices.find(v => (v.lang.includes('mx') || v.name.includes('mexic')) && (
      /dalia|sabina|paulina|paloma|soledad|jimena|monica|mónica|sofia|elena|female|mujer|natural/i.test(v.name)
    ));
    if (mexicanFemale) return mexicanFemale.voice;

    const latinFemale = normalizedVoices.find(v => v.lang.startsWith('es') && (
      /dalia|sabina|paulina|paloma|soledad|jimena|luciana|sofia|elena|laura|monica|mónica|camila|female|mujer|natural/i.test(v.name)
    ));
    if (latinFemale) return latinFemale.voice;

    const googleEs = normalizedVoices.find(v => v.lang.startsWith('es') && v.name.includes('google'));
    if (googleEs) return googleEs.voice;

    const anyEsMx = normalizedVoices.find(v => v.lang.includes('mx'));
    if (anyEsMx) return anyEsMx.voice;
    const anyEs = normalizedVoices.find(v => v.lang.startsWith('es'));
    if (anyEs) return anyEs.voice;
  }

  // 2. INGLÉS: Voz femenina fija con acento Americano (USA) (Jenny, Aria, Zira, Samantha, etc.)
  if (langPrefix === 'en') {
    const priorityUS = [
      'microsoft jenny online (natural) - english (united states)',
      'microsoft aria online (natural) - english (united states)',
      'microsoft jenny',
      'microsoft aria',
      'microsoft zira',
      'google us english',
      'samantha (en-us)',
      'ava (en-us)',
      'allison (en-us)',
      'jenny',
      'aria',
      'zira',
      'samantha',
      'ava',
      'allison',
      'victoria'
    ];

    for (const name of priorityUS) {
      const match = normalizedVoices.find(v => (v.lang.includes('us') || v.name.includes('united states')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const usFemale = normalizedVoices.find(v => (v.lang.includes('us') || v.name.includes('united states')) && (
      /jenny|aria|zira|samantha|ava|allison|victoria|karen|libby|female|woman|natural/i.test(v.name)
    ));
    if (usFemale) return usFemale.voice;

    const googleEn = normalizedVoices.find(v => v.lang.startsWith('en') && v.name.includes('google'));
    if (googleEn) return googleEn.voice;

    const anyEnUS = normalizedVoices.find(v => v.lang.includes('us'));
    if (anyEnUS) return anyEnUS.voice;
    const anyEn = normalizedVoices.find(v => v.lang.startsWith('en'));
    if (anyEn) return anyEn.voice;
  }

  // 3. FRANCÉS: Voz femenina fija con acento Francés de Francia (Denise, Brigitte, Julie, Amélie, etc.)
  if (langPrefix === 'fr') {
    const priorityFrance = [
      'microsoft denise online (natural) - french (france)',
      'microsoft brigitte online (natural) - french (france)',
      'microsoft denise',
      'microsoft brigitte',
      'microsoft julie',
      'microsoft hortense',
      'google français',
      'amélie (fr-fr)',
      'chantal (fr-fr)',
      'marie (fr-fr)',
      'denise',
      'brigitte',
      'julie',
      'hortense',
      'amelie',
      'amélie',
      'aurelie',
      'aurélie',
      'chantal',
      'celeste',
      'céleste',
      'marie'
    ];

    for (const name of priorityFrance) {
      const match = normalizedVoices.find(v => (v.lang.includes('fr') || v.name.includes('france')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const frFemale = normalizedVoices.find(v => (v.lang.includes('fr') || v.name.includes('france')) && (
      /denise|brigitte|julie|hortense|amelie|amélie|aurelie|aurélie|chantal|celeste|céleste|marie|female|femme|natural/i.test(v.name)
    ));
    if (frFemale) return frFemale.voice;

    const googleFr = normalizedVoices.find(v => v.lang.startsWith('fr') && v.name.includes('google'));
    if (googleFr) return googleFr.voice;

    const anyFrFR = normalizedVoices.find(v => v.lang.includes('fr'));
    if (anyFrFR) return anyFrFR.voice;
  }

  // Fallback
  const fallback = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix));
  return fallback || voices[0];
};

export const speakText = (text) => {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    const fragmentos = segmentosLocales(text);
    if (!fragmentos.length) return;
    narrarSegmentos(fragmentos);
  } catch (e) {
    console.error('TTS error:', e);
  }
};

export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const handleForceDownload = async (url, fileName = 'documento.pdf') => {
  if (!url || typeof document === 'undefined') return false;

  let safeFileName = String(fileName || 'documento.pdf').trim();
  const lowerUrl = String(url || '').toLowerCase();
  const hasExtension = /\.[a-zA-Z0-9]{2,5}$/i.test(safeFileName);
  const isPdf = lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf') || safeFileName.toLowerCase().endsWith('.pdf') || !hasExtension;
  if (isPdf && !safeFileName.toLowerCase().endsWith('.pdf')) {
    safeFileName = `${safeFileName}.pdf`;
  }
  // Limpiar caracteres problemáticos en nombres de archivo
  safeFileName = safeFileName.replace(/["*/:<>?\\|]/g, '_');

  const triggerBlobDownload = (blob) => {
    if (!blob) return false;
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { window.URL.revokeObjectURL(blobUrl); } catch {}
    }, 15000);
    return true;
  };

  // 1. data: o blob: directo
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  // 2. Firebase Storage URL nativo vía getBlob (elude 100% CORS, redirecciones y bloqueadores Brave)
  const isFirebaseStorage = lowerUrl.includes('firebasestorage.googleapis.com') || lowerUrl.includes('firebasestorage.app');
  if (isFirebaseStorage && storage) {
    try {
      const storageRef = ref(storage, url);
      const blob = await getBlob(storageRef);
      if (blob && triggerBlobDownload(blob)) {
        return true;
      }
    } catch (fbErr) {
      console.warn('Firebase getBlob download error, intentando fetch/XHR fallback:', fbErr);
    }
  }

  // 3. fetch con cache: no-store para evitar desajustes de CORS cacheados
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob && triggerBlobDownload(blob)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Direct fetch download error, intentando XHR:', err);
  }

  // 4. XMLHttpRequest con responseType blob
  try {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`XHR status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('XHR error'));
      xhr.send();
    });
    if (blob && triggerBlobDownload(blob)) {
      return true;
    }
  } catch (xhrErr) {
    console.warn('XHR blob download error:', xhrErr);
  }

  // 5. Fallback en iframe oculto para NUNCA abrir una pestaña ni redirigir la página del usuario
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.left = '-9999px';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 20000);
    return true;
  } catch {
    return false;
  }
};

/**
 * Copia texto al portapapeles de forma universal y resiliente, con soporte para
 * móviles (iOS Safari, Android Chrome, WebViews) y fallback con execCommand('copy')
 * y control total contra excepciones de permisos denegados o ventanas sin foco.
 */
export async function copyTextToClipboard(text) {
  const content = String(text ?? '');
  if (typeof window === 'undefined') return false;

  // 1. Intentar con API moderna Clipboard si está disponible
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (e) {
      // Continuar con fallback compatible
    }
  }

  // 2. Fallback universal con textarea temporal y parámetros específicos de iOS
  try {
    const el = document.createElement('textarea');
    el.value = content;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.fontSize = '16px'; // Prevenir zoom automático en iOS
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, 99999); // Requerido para iOS WebKit
    const successful = document.execCommand('copy');
    document.body.removeChild(el);
    if (successful) return true;
  } catch (err) {
    // Continuar con fallback interactivo
  }

  // 3. Fallback interactivo si el portapapeles está completamente bloqueado por el navegador
  try {
    if (typeof window.prompt === 'function') {
      window.prompt('Copia este texto manualmente:', content);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Sanea recursivamente cualquier estructura de datos para su almacenamiento seguro en Firestore.
 * Firestore rechaza estrictamente cualquier objeto o array que contenga valores 'undefined'.
 * Esta funcion convierte 'undefined' a 'null', omite funciones y protege contra referencias circulares.
 */
export function sanitizeFirestoreData(data, seen = new WeakSet()) {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data !== 'object') {
    if (typeof data === 'function') return null;
    return data;
  }
  if (data instanceof Date) return data;
  if (typeof data.toDate === 'function' || typeof data.toMillis === 'function') return data;
  if (data._methodName) return data;
  if (seen.has(data)) return null;
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map(item => item === undefined ? null : sanitizeFirestoreData(item, seen));
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'function') continue;
    if (value === undefined) {
      clean[key] = null;
    } else {
      clean[key] = sanitizeFirestoreData(value, seen);
    }
  }
  return clean;
}

// src/utils/notesEngine.js
// Motor lógico para la sección de Notas (Cuaderno compartido de clase y Notas privadas).
// Incluye clasificación de enlaces inteligentes (imagen, YouTube, web), permisos de candado/seguro de sesión,
// registro silencioso de auditoría para el docente y filtrado multi-docente/grupo.

export const NOTE_FONT_FAMILIES = [
  { id: 'sans', label: 'Sans', css: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Serif', css: 'Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'mono', label: 'Mono', css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace' },
  { id: 'handwriting', label: 'Manuscrita', css: '"Segoe Print", "Bradley Hand", Chilanka, TSCu_Comic, casual, cursive' },
  { id: 'classic', label: 'Clásica', css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' }
];

export const NOTE_FONT_SIZES = [
  { id: 'sm', label: 'Pequeño', execValue: '2', px: '13px', className: 'text-[13px] leading-relaxed' },
  { id: 'base', label: 'Normal', execValue: '3', px: '15px', className: 'text-[15px] leading-relaxed' },
  { id: 'md', label: 'Mediano', execValue: '4', px: '17px', className: 'text-[17px] leading-relaxed' },
  { id: 'lg', label: 'Grande', execValue: '5', px: '20px', className: 'text-[20px] leading-snug' },
  { id: 'xl', label: 'Título', execValue: '6', px: '24px', className: 'text-[24px] leading-tight' }
];

export const NOTE_TEXT_COLORS = [
  { id: 'default', label: 'Normal', color: '#1e293b', darkColor: '#f1f5f9' },
  { id: 'blue', label: 'Azul', color: '#2563eb', darkColor: '#60a5fa' },
  { id: 'indigo', label: 'Índigo', color: '#4f46e5', darkColor: '#818cf8' },
  { id: 'emerald', label: 'Verde', color: '#059669', darkColor: '#34d399' },
  { id: 'amber', label: 'Ámbar', color: '#d97706', darkColor: '#fbbf24' },
  { id: 'rose', label: 'Rojo', color: '#e11d48', darkColor: '#fb7185' },
  { id: 'purple', label: 'Violeta', color: '#7c3aed', darkColor: '#a78bfa' },
  { id: 'slate', label: 'Gris', color: '#64748b', darkColor: '#94a3b8' }
];

export const NOTE_HIGHLIGHT_COLORS = [
  { id: 'none', label: 'Sin resaltado', color: 'transparent' },
  { id: 'yellow', label: 'Amarillo', color: '#fef08a' },
  { id: 'green', label: 'Verde menta', color: '#bbf7d0' },
  { id: 'blue', label: 'Azul cielo', color: '#bae6fd' },
  { id: 'purple', label: 'Lavanda', color: '#e9d5ff' },
  { id: 'rose', label: 'Rosa suave', color: '#fecdd3' },
  { id: 'orange', label: 'Durazno', color: '#fed7aa' }
];

export const NOTE_PAPER_THEMES = [
  { id: 'default', label: 'Blanco limpio', lightBg: 'bg-white border-slate-200', darkBg: 'bg-slate-900 border-slate-800', lightColor: '#ffffff', darkColor: '#0f172a', dot: 'bg-white border-slate-300' },
  { id: 'warm', label: 'Crema cálido', lightBg: 'bg-amber-50 border-amber-200', darkBg: 'bg-slate-900 border-amber-800/70', lightColor: '#fffbeb', darkColor: '#1c1917', dot: 'bg-amber-100 border-amber-300' },
  { id: 'sky', label: 'Azul hielo', lightBg: 'bg-sky-50 border-sky-200', darkBg: 'bg-slate-900 border-sky-800/70', lightColor: '#f0f9ff', darkColor: '#0c1929', dot: 'bg-sky-100 border-sky-300' },
  { id: 'emerald', label: 'Verde salvia', lightBg: 'bg-emerald-50 border-emerald-200', darkBg: 'bg-slate-900 border-emerald-800/70', lightColor: '#ecfdf5', darkColor: '#091e1a', dot: 'bg-emerald-100 border-emerald-300' },
  { id: 'violet', label: 'Lavanda', lightBg: 'bg-violet-50 border-violet-200', darkBg: 'bg-slate-900 border-violet-800/70', lightColor: '#f5f3ff', darkColor: '#171329', dot: 'bg-violet-100 border-violet-300' },
  { id: 'rose', label: 'Rosa pálido', lightBg: 'bg-rose-50 border-rose-200', darkBg: 'bg-slate-900 border-rose-800/70', lightColor: '#fff1f2', darkColor: '#23121b', dot: 'bg-rose-100 border-rose-300' }
];

export const NOTE_FORMATS = [
  { id: 'sticky', label: 'Nota rápida' },
  { id: 'sheet', label: 'Hoja completa' }
];

export const NOTE_SHEET_STYLES = [
  { id: 'blank', label: 'Lisa' },
  { id: 'lined', label: 'Rayada' },
  { id: 'grid', label: 'Cuadriculada' }
];

export const normalizeNoteFormat = (fmt) => (fmt === 'sheet' ? 'sheet' : 'sticky');

export const normalizeNoteSheetStyle = (style) => {
  if (style === 'lined' || style === 'grid') return style;
  return 'blank';
};

/**
 * Extrae el ID de 11 caracteres de un enlace de YouTube.
 */
export const extractNoteYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtube\.com\/(?:(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : null;
};

/**
 * Detecta si una URL apunta a una imagen externa válida (sin permitir subida local file:// o data:).
 */
export const isNoteImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  // Extensión directa de imagen
  if (/\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(\?.*|#.*)?$/i.test(trimmed)) {
    return true;
  }
  // Servicios comunes de imágenes por URL
  if (/^https?:\/\/(images\.unsplash\.com|plus\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|images\.pexels\.com|media\.giphy\.com|upload\.wikimedia\.org)\//i.test(trimmed)) {
    return true;
  }
  return false;
};

/**
 * Normaliza y valida una URL externa (solo http:// o https://; bloquea archivos locales, data:, javascript:).
 */
export const normalizeExternalNoteUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim();
  if (!trimmed) return null;
  // Bloquear esquemas peligrosos o archivos locales
  if (/^(javascript:|vbscript:|data:|file:|blob:)/i.test(trimmed)) {
    return null;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    } else {
      return null;
    }
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
};

/**
 * Clasifica una URL para el cuaderno de notas:
 * - 'youtube': Video de YouTube (con youtubeId)
 * - 'image': Imagen por URL
 * - 'link': Enlace web estándar
 * - 'invalid': URL inválida o no permitida
 */
export const classifyNoteUrl = (rawUrl, forceType = null) => {
  const normalizedUrl = normalizeExternalNoteUrl(rawUrl);
  if (!normalizedUrl) {
    return { valid: false, type: 'invalid', url: null, youtubeId: null, defaultRenderMode: 'link' };
  }

  const youtubeId = extractNoteYouTubeId(normalizedUrl);
  if (youtubeId) {
    return {
      valid: true,
      type: 'youtube',
      url: normalizedUrl,
      youtubeId,
      defaultRenderMode: forceType === 'link' ? 'link' : 'youtube'
    };
  }

  const isImg = isNoteImageUrl(normalizedUrl) || forceType === 'image';
  if (isImg) {
    return {
      valid: true,
      type: 'image',
      url: normalizedUrl,
      youtubeId: null,
      defaultRenderMode: forceType === 'link' ? 'link' : 'image'
    };
  }

  return {
    valid: true,
    type: 'link',
    url: normalizedUrl,
    youtubeId: null,
    defaultRenderMode: 'link'
  };
};

/**
 * Extrae texto plano limpio a partir de HTML para búsquedas y resúmenes de auditoría.
 */
const FONT_SIZE_EXEC_TO_PX = {
  '1': '12px',
  '2': '13px',
  '3': '15px',
  '4': '17px',
  '5': '20px',
  '6': '24px',
  '7': '28px'
};

export const sanitizeNoteHtml = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  let clean = rawHtml;
  clean = clean.replace(/<\s*(script|style|iframe|object|embed|svg|math|form|video|audio|textarea|select|button)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  clean = clean.replace(/<\/?\s*(script|style|iframe|object|embed|svg|math|form|img|video|audio|source|track|input|button|textarea|select|option|meta|link|base|applet|frame|frameset)\b[^>]*\/?>/gi, '');
  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/\s+(href|src|xlink:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data|file|blob):[^"]*"|'\s*(?:javascript|vbscript|data|file|blob):[^']*'|(?:\s*(?:javascript|vbscript|data|file|blob):[^\s>]+))/gi, '');
  clean = clean.replace(/style\s*=\s*"([^"]*)"/gi, (full, styleBody) => {
    const safeStyle = styleBody
      .replace(/expression\s*\([^)]*\)/gi, '')
      .replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data|file|blob):[^)]*\)/gi, '');
    return `style="${safeStyle.trim()}"`;
  });
  clean = clean.replace(/style\s*=\s*'([^']*)'/gi, (full, styleBody) => {
    const safeStyle = styleBody
      .replace(/expression\s*\([^)]*\)/gi, '')
      .replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data|file|blob):[^)]*\)/gi, '');
    return `style="${safeStyle.trim()}"`;
  });
  clean = clean.replace(/<font\b([^>]*)>/gi, (full, attrs) => {
    const sizeMatch = attrs.match(/\bsize\s*=\s*["']?([1-7])["']?/i);
    if (!sizeMatch) return full;
    const px = FONT_SIZE_EXEC_TO_PX[sizeMatch[1]] || '15px';
    if (/\bstyle\s*=/i.test(attrs)) {
      if (/font-size\s*:/i.test(attrs)) return full;
      return `<font${attrs.replace(/\bstyle\s*=\s*(["'])/i, `style=$1font-size: ${px}; `)}>`;
    }
    return `<font${attrs} style="font-size: ${px};">`;
  });
  return clean.trim();
};

export const stripNoteHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Extrae automáticamente enlaces sueltos de YouTube o imágenes presentes en el texto de una nota
 * que aún no estén registrados en la lista de enlaces adjuntos.
 */
export const extractInlineMediaUrlsFromHtml = (html, existingLinks = []) => {
  if (!html || typeof html !== 'string') return [];
  const existingSet = new Set(
    (Array.isArray(existingLinks) ? existingLinks : [])
      .map(item => (item?.url || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const attrUrls = [];
  const attrRegex = /\b(?:src|href)\s*=\s*["'](https?:\/\/[^"'\s<>]+)["']/gi;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(html)) !== null) {
    if (attrMatch[1]) attrUrls.push(attrMatch[1]);
  }
  const plain = stripNoteHtml(html);
  const urlRegex = /https?:\/\/[^\s<>"')]+/gi;
  const matches = [...attrUrls, ...(plain.match(urlRegex) || [])];
  const discovered = [];

  for (const raw of matches) {
    const cleanRaw = raw.replace(/[.,;:!?]+$/, '');
    const info = classifyNoteUrl(cleanRaw);
    if (!info.valid) continue;
    const key = info.url.toLowerCase();
    if (existingSet.has(key)) continue;
    if (info.type === 'youtube' || info.type === 'image') {
      existingSet.add(key);
      discovered.push({
        id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: info.url,
        label: info.type === 'youtube' ? 'Video de YouTube' : 'Imagen enlazada',
        mediaType: info.type,
        youtubeId: info.youtubeId,
        renderMode: info.defaultRenderMode,
        autoDetected: true
      });
    }
  }
  return discovered;
};

/**
 * Verifica si el usuario actual puede activar o desactivar el candado/seguro de una nota o bloque de sesión.
 * Reglas:
 * - El docente (role === 'teacher') SIEMPRE puede poner o quitar el candado de cualquier nota o bloque.
 * - En una nota privada, su propietario puede cambiar el candado.
 * - En una nota compartida:
 *   - Si NO tiene candado (isLocked === false), cualquier participante (o el autor) puede activar el candado para asegurar lo hecho en la sesión.
 *   - Si YA tiene candado (isLocked === true), ningún otro estudiante puede quitarlo; solo el docente (o el mismo autor que puso el candado) puede desbloquearlo.
 */
const resolveUserIdentity = (currentUser, fallbackRole = 'student') => {
  if (!currentUser) return { userId: '', role: 'student' };
  if (typeof currentUser === 'string') {
    return {
      userId: currentUser.trim().toLowerCase(),
      role: fallbackRole || 'student'
    };
  }
  return {
    userId: String(currentUser.userId || currentUser.myChatId || '').trim().toLowerCase(),
    role: currentUser.role || fallbackRole || 'student'
  };
};

export const canUserToggleNoteLock = (noteOrBlock, currentUser, fallbackRole = 'student') => {
  if (!noteOrBlock || !currentUser) return false;
  const { userId, role } = resolveUserIdentity(currentUser, fallbackRole);
  if (!userId) return false;

  if (role === 'teacher') return true;

  const isLocked = Boolean(noteOrBlock.isLocked);
  if (!isLocked) {
    // Cualquier usuario con acceso a la sesión puede poner seguro a lo hecho
    return true;
  }

  // Si fue bloqueado por el docente, ningún estudiante puede quitar el candado
  if (noteOrBlock.lockedByRole === 'teacher') {
    return false;
  }

  // Si ya está bloqueado, un estudiante tercero no puede quitar el candado de otro usuario;
  // solo quien puso el candado o el autor original de la nota (salvo bloqueo docente) o el docente.
  const authorId = String(noteOrBlock.authorId || noteOrBlock.ownerId || '').trim().toLowerCase();
  const lockedBy = String(noteOrBlock.lockedBy || authorId).trim().toLowerCase();
  return lockedBy === userId || (Boolean(authorId) && authorId === userId);
};

/**
 * Verifica si el usuario actual puede editar una nota o bloque de sesión.
 * Reglas:
 * - Si es nota privada: solo el propietario (ownerId === userId).
 * - Si es nota compartida:
 *   - El docente SIEMPRE puede editar.
 *   - Si la nota/bloque tiene el seguro/candado activo (isLocked === true):
 *     - Ningún otro estudiante puede editarla ni borrar lo de otro.
 *     - Solo el docente (o el autor que puso el candado en su propia sesión, salvo que el candado sea del docente) puede editarla.
 *   - Si NO tiene candado (isLocked === false): los estudiantes del curso pueden colaborar/anotar en la sesión.
 */
export const canUserEditNote = (noteOrBlock, currentUser, fallbackRole = 'student') => {
  if (!noteOrBlock || !currentUser) return false;
  const { userId, role } = resolveUserIdentity(currentUser, fallbackRole);
  if (!userId) return false;

  if (noteOrBlock.scope === 'private') {
    const ownerId = String(noteOrBlock.ownerId || noteOrBlock.authorId || '').trim().toLowerCase();
    return ownerId === userId;
  }

  if (role === 'teacher') return true;

  if (noteOrBlock.isLocked) {
    if (noteOrBlock.lockedByRole === 'teacher') return false;
    const authorId = String(noteOrBlock.authorId || noteOrBlock.ownerId || '').trim().toLowerCase();
    const lockedBy = String(noteOrBlock.lockedBy || authorId).trim().toLowerCase();
    return lockedBy === userId || (Boolean(authorId) && authorId === userId);
  }

  return true;
};

/**
 * Verifica si el usuario actual puede eliminar una nota o bloque.
 * Reglas clave solicitadas por el usuario:
 * - "ya sea que el estudiante o el docente lo ponga para que ningún otro estudiante borre lo de otro, y el único que sí podrá borrar todo es el docente"
 * - El docente (role === 'teacher') puede borrar CUALQUIER nota o bloque en Notas Compartidas (incluso con candado).
 * - En Notas Privadas, el dueño puede borrar sus propias notas privadas.
 * - En Notas Compartidas:
 *   - Un estudiante NUNCA puede borrar una nota o bloque creado por otro usuario si tiene candado o si pertenece a otro autor.
 *   - Incluso si el propio estudiante creó una nota compartida, si el docente le puso candado (`lockedByRole === 'teacher'`), el estudiante no puede borrarla.
 *   - Un estudiante solo puede borrar su propio apunte/nota si él mismo es el autor y no fue bloqueado por el docente ni por otro usuario.
 */
export const canUserDeleteNote = (noteOrBlock, currentUser, fallbackRole = 'student') => {
  if (!noteOrBlock || !currentUser) return false;
  const { userId, role } = resolveUserIdentity(currentUser, fallbackRole);
  if (!userId) return false;

  if (noteOrBlock.scope === 'private') {
    const ownerId = String(noteOrBlock.ownerId || noteOrBlock.authorId || '').trim().toLowerCase();
    return ownerId === userId;
  }

  // En notas compartidas, el docente es el único que puede borrar todo (con o sin candado)
  if (role === 'teacher') return true;

  // Estudiante en nota compartida:
  // No puede borrar nada que sea de otro autor
  const authorId = String(noteOrBlock.authorId || noteOrBlock.ownerId || '').trim().toLowerCase();
  if (!authorId || authorId !== userId) return false;

  // Si está bloqueado por el docente o por otra persona, tampoco puede borrarlo
  if (noteOrBlock.isLocked) {
    const lockedBy = String(noteOrBlock.lockedBy || '').trim().toLowerCase();
    if (noteOrBlock.lockedByRole === 'teacher' || (lockedBy && lockedBy !== userId)) {
      return false;
    }
  }

  return true;
};

/**
 * Construye una entrada en el historial de auditoría silencioso (visible únicamente para el docente).
 */
export const createNoteAuditEntry = ({
  action,
  actorId,
  actorName,
  actorRole,
  summary,
  previousTitle = '',
  newTitle = '',
  previousContent = '',
  newContent = '',
  previousLinks = [],
  newLinks = [],
  blockId = null
}) => {
  const nowIso = new Date().toISOString();
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: action || 'edit',
    actorId: String(actorId || 'unknown'),
    actorName: String(actorName || actorId || 'Usuario'),
    actorRole: actorRole === 'teacher' ? 'teacher' : 'student',
    timestamp: nowIso,
    summary: String(summary || 'Modificó la nota'),
    blockId: blockId || null,
    previousTitle: String(previousTitle || ''),
    newTitle: String(newTitle || ''),
    previousContent: String(previousContent || ''),
    newContent: String(newContent || ''),
    previousTextPreview: stripNoteHtml(previousContent).slice(0, 350),
    newTextPreview: stripNoteHtml(newContent).slice(0, 350),
    previousLinks: Array.isArray(previousLinks) ? previousLinks : [],
    newLinks: Array.isArray(newLinks) ? newLinks : []
  };
};

/**
 * Agrega una entrada al log de auditoría de una nota (manteniendo las últimas 60 entradas ordenadas de más reciente a más antigua).
 */
export const appendNoteAuditEntry = (existingLog, newEntry) => {
  const list = Array.isArray(existingLog) ? [...existingLog] : [];
  if (!newEntry) return list;
  return [newEntry, ...list].slice(0, 60);
};

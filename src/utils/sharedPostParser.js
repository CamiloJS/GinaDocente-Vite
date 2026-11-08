// src/utils/sharedPostParser.js
// Utilidad para extraer, normalizar y construir la metadata de publicaciones/foros/tareas compartidas

/**
 * Determina de forma infalible si un mensaje representa o contiene una publicación compartida.
 */
export const isSharedPostMessage = (message, tasks = []) => {
  if (!message || typeof message !== 'object') return false;
  if (message.isSharedPost) return true;
  if (message.sharedItem || message.sharedPost || message.sharedTask) return true;
  const text = typeof message.text === 'string' ? message.text : '';
  if (text.includes('📌') && (text.includes('#') || text.includes('http') || text.includes('post/') || text.includes('task/') || text.includes('forum/'))) return true;
  if (/(?:#|\/)(?:post|task|forum|evaluation|eval|slides|slide|book|book3d|poll)\/[a-zA-Z0-9_\-\.\:\%]+/i.test(text)) return true;
  return Boolean(parseSharedPost(message, tasks));
};

/**
 * Extrae y normaliza la información de una publicación compartida a partir del mensaje
 * o del objeto `sharedItem` / `sharedPost` adjunto.
 */
export const parseSharedPost = (message, tasks = []) => {
  if (!message || typeof message !== 'object') return null;

  // 1. Extraer objeto estructurado adjunto si existe (sharedItem, sharedPost, sharedTask)
  let rawItem = message.sharedItem || message.sharedPost || message.sharedTask;
  if (typeof rawItem === 'string') {
    try {
      rawItem = JSON.parse(rawItem);
    } catch {
      rawItem = null;
    }
  }

  if (rawItem && typeof rawItem === 'object' && (rawItem.id || rawItem.postId || rawItem._id)) {
    const rawId = String(rawItem.id || rawItem.postId || rawItem._id);
    const foundTask = Array.isArray(tasks) ? tasks.find(t => String(t?.id) === rawId) : null;
    const itemType = foundTask?.type || rawItem.type || 'post';

    const typeLabel = rawItem.typeLabel || (
      itemType === 'forum' ? 'Foro' :
      itemType === 'task' ? 'Tarea' :
      itemType === 'evaluation' ? 'Evaluación' :
      itemType === 'poll' ? 'Encuesta' :
      itemType === 'slides' ? 'Presentación' :
      itemType === 'book3d' ? 'Libro' : 'Publicación'
    );

    const actionLabel = rawItem.actionLabel || (
      itemType === 'forum' ? 'Ir al foro' :
      itemType === 'task' ? 'Ir a la tarea' :
      itemType === 'evaluation' ? 'Ir a la evaluación' :
      itemType === 'poll' ? 'Ir a la encuesta' :
      itemType === 'slides' ? 'Ir a la presentación' :
      itemType === 'book3d' ? 'Abrir libro' : 'Ir a la publicación'
    );

    return {
      ...rawItem,
      id: rawId,
      type: itemType,
      typeLabel,
      actionLabel,
      title: foundTask?.title || rawItem.title || 'Publicación compartida',
      description: foundTask?.description || rawItem.description || '',
      author: foundTask?.author || foundTask?.authorName || rawItem.author || rawItem.authorName || '',
      authorRole: foundTask?.authorRole || rawItem.authorRole || 'teacher',
      groupName: foundTask?.targetGroupName || foundTask?.groupName || rawItem.groupName || rawItem.targetGroupName || '',
      url: rawItem.url || `#post/${rawId}`,
      imageUrl: foundTask?.imageUrl || (Array.isArray(foundTask?.attachments) && foundTask?.attachments[0]?.url) || rawItem.imageUrl || '',
      dueDate: foundTask?.dueDate || rawItem.dueDate || null,
      dueTime: foundTask?.dueTime || rawItem.dueTime || null,
      commentsCount: Array.isArray(foundTask?.comments) ? foundTask.comments.length : (foundTask?.comments && typeof foundTask.comments === 'object' ? Object.keys(foundTask.comments).length : (rawItem.commentsCount || 0)),
      rating: typeof foundTask?.rating === 'number' ? foundTask.rating : (typeof rawItem.rating === 'number' ? rawItem.rating : 5.0)
    };
  }

  const text = message.text || '';
  if (!text || typeof text !== 'string') return null;

  // 2. Detectar formato URL #post/<id>, #task/<id>, #forum/<id>, etc. o ruta /post/<id>
  const match = text.match(/(?:#|\/)(?:post|task|forum|evaluation|eval|slides|slide|book|book3d|poll)\/([a-zA-Z0-9_\-\.\:\%]+)/i);
  if (!match || !match[1]) {
    // Si contiene 📌 y un enlace http(s)
    const pinMatch = text.match(/📌\s*\*?([^*\n\r]+?)\*?(?:\n|\r|\s)+(https?:\/\/[^\s]+)/i);
    if (!pinMatch) return null;
    const url = pinMatch[2];
    const subMatch = url.match(/(?:#|\/)(?:post|task|forum|evaluation|eval|slides|slide|book|book3d|poll)\/([a-zA-Z0-9_\-\.\:\%]+)/i);
    if (!subMatch) return null;
  }

  const matchedPattern = text.match(/(?:#|\/)(post|task|forum|evaluation|eval|slides|slide|book|book3d|poll)\/([a-zA-Z0-9_\-\.\:\%]+)/i);
  if (!matchedPattern) return null;

  const urlType = matchedPattern[1].toLowerCase();
  let postId = matchedPattern[2];
  try {
    postId = decodeURIComponent(postId);
  } catch {
    // ignorar error de URI
  }
  // Depurar puntuación o delimitadores finales residuales (. , ; : ! ? ) ] >)
  if (postId) {
    postId = postId.replace(/[\.\,\;\:\!\?\)\>\]]+$/, '');
  }

  const foundTask = Array.isArray(tasks) ? tasks.find(t => String(t?.id) === String(postId)) : null;

  // Extraer título si venía en formato `📌 *Título*`, `📌 **Título**` o `📌 Título`
  const titleMatch = text.match(/📌\s*(?:\*+)?([^*\n\r]+?)(?:\*+)?(?:\n|\r|$)/);
  const extractedTitle = titleMatch ? titleMatch[1].trim() : (foundTask?.title || 'Publicación compartida');

  // Inferir tipo según foundTask, URL o título
  const titleLower = (foundTask?.title || extractedTitle || '').toLowerCase();
  let itemType = foundTask?.type || (
    (urlType === 'forum' || titleLower.includes('forum') || titleLower.includes('foro')) ? 'forum' :
    (urlType === 'task' || titleLower.includes('task') || titleLower.includes('tarea') || titleLower.includes('workshop') || titleLower.includes('taller')) ? 'task' :
    (urlType === 'evaluation' || urlType === 'eval' || titleLower.includes('eval') || titleLower.includes('quiz') || titleLower.includes('examen')) ? 'evaluation' :
    (urlType === 'slides' || urlType === 'slide' || titleLower.includes('slide') || titleLower.includes('presentación') || titleLower.includes('diapositiva')) ? 'slides' :
    (urlType === 'book' || urlType === 'book3d' || titleLower.includes('book') || titleLower.includes('libro') || titleLower.includes('flipbook')) ? 'book3d' :
    (urlType === 'poll' || titleLower.includes('poll') || titleLower.includes('encuesta')) ? 'poll' : 'post'
  );

  const typeLabel = 
    itemType === 'forum' ? 'Foro' :
    itemType === 'task' ? 'Tarea' :
    itemType === 'evaluation' ? 'Evaluación' :
    itemType === 'poll' ? 'Encuesta' :
    itemType === 'slides' ? 'Presentación' :
    itemType === 'book3d' ? 'Libro' : 'Publicación';

  const actionLabel = 
    itemType === 'forum' ? 'Ir al foro' :
    itemType === 'task' ? 'Ir a la tarea' :
    itemType === 'evaluation' ? 'Ir a la evaluación' :
    itemType === 'poll' ? 'Ir a la encuesta' :
    itemType === 'slides' ? 'Ir a la presentación' :
    itemType === 'book3d' ? 'Abrir libro' : 'Ir a la publicación';

  return {
    id: postId,
    type: itemType,
    typeLabel,
    actionLabel,
    title: foundTask?.title || extractedTitle,
    description: foundTask?.description || '',
    author: foundTask?.author || foundTask?.authorName || '',
    authorRole: foundTask?.authorRole || 'teacher',
    groupName: foundTask?.targetGroupName || foundTask?.groupName || '',
    url: text.match(/(https?:\/\/[^\s]+)/)?.[0] || `#post/${postId}`,
    imageUrl: foundTask?.imageUrl || (Array.isArray(foundTask?.attachments) && foundTask?.attachments[0]?.url) || '',
    dueDate: foundTask?.dueDate || null,
    dueTime: foundTask?.dueTime || null,
    commentsCount: Array.isArray(foundTask?.comments) ? foundTask.comments.length : (foundTask?.comments && typeof foundTask.comments === 'object' ? Object.keys(foundTask.comments).length : 0),
    rating: typeof foundTask?.rating === 'number' ? foundTask.rating : 5.0
  };
};

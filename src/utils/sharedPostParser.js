// src/utils/sharedPostParser.js
// Utilidad para extraer, normalizar y construir la metadata de publicaciones/foros/tareas compartidas

/**
 * Extrae y normaliza la información de una publicación compartida a partir del mensaje
 * o del objeto `sharedItem` adjunto.
 */
export const parseSharedPost = (message, tasks = []) => {
  if (!message) return null;
  if (message.sharedItem && typeof message.sharedItem === 'object' && message.sharedItem.id) {
    return message.sharedItem;
  }
  const text = message.text || '';
  if (!text || typeof text !== 'string') return null;

  // Detectar formato URL #post/<id> o #task/<id>
  const match = text.match(/#(?:post|task)\/([a-zA-Z0-9_-]+)/i);
  if (!match || !match[1]) return null;
  const postId = match[1];

  const foundTask = Array.isArray(tasks) ? tasks.find(t => String(t.id) === String(postId)) : null;

  // Extraer título si venía en formato `📌 *Título*`
  const titleMatch = text.match(/📌\s*\*([^*]+)\*/);
  const extractedTitle = titleMatch ? titleMatch[1].trim() : (foundTask?.title || 'Publicación');

  const itemType = foundTask?.type || 'post';
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

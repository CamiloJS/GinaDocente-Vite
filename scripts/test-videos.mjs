// scripts/test-videos.mjs
// Suite de pruebas unitarias para el motor de vídeos y compatibilidad de plataformas

import { parseVideoUrl, extractFirstVideoUrl, normalizeVideoItem, deduplicateVideos, DEMO_VIDEOS } from '../src/utils/videoEngine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  OK  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL ${message}`);
    failed++;
  }
}

console.log('== 1. Parseo de URLs de YouTube ==');
const ytLong = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert(ytLong.isValid && ytLong.platform === 'youtube' && ytLong.videoId === 'dQw4w9WgXcQ', 'Detecta YouTube largo estándar');
assert(ytLong.suggestedFormat === 'long', 'YouTube estándar sugiere formato largo');
assert(ytLong.embedUrl.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'Genera embedUrl seguro de YouTube');
assert(ytLong.thumbnailUrl.includes('dQw4w9WgXcQ'), 'Genera thumbnail de YouTube');

const ytShortened = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=42');
assert(ytShortened.isValid && ytShortened.videoId === 'dQw4w9WgXcQ', 'Detecta youtu.be acortado');

const ytShorts = parseVideoUrl('https://www.youtube.com/shorts/5O9nF7iW8_g');
assert(ytShorts.isValid && ytShorts.platform === 'youtube' && ytShorts.videoId === '5O9nF7iW8_g', 'Detecta YouTube Shorts');
assert(ytShorts.suggestedFormat === 'short', 'YouTube Shorts auto-detecta formato corto / vertical');

console.log('== 2. Parseo de URLs de TikTok ==');
const tiktokUrl = parseVideoUrl('https://www.tiktok.com/@teacher_gina/video/7123456789012345678');
assert(tiktokUrl.isValid && tiktokUrl.platform === 'tiktok', 'Detecta enlace de TikTok');
assert(tiktokUrl.suggestedFormat === 'short', 'TikTok auto-detecta formato corto / vertical');

console.log('== 3. Parseo de Almacenamiento en la Nube y Archivos Directos ==');
const fileGarden = parseVideoUrl('https://filegarden.com/user123/english_tutorial.mp4');
assert(fileGarden.isValid && fileGarden.platform === 'filegarden' && fileGarden.playerType === 'direct', 'Detecta File Garden como reproducción directa');

const pCloud = parseVideoUrl('https://u.pcloud.link/publink/show?code=kZabcdef');
assert(pCloud.isValid && pCloud.platform === 'pcloud', 'Detecta enlaces compartidos de pCloud');

const dropbox = parseVideoUrl('https://www.dropbox.com/s/123456/audio_class.mp4?dl=0');
assert(dropbox.isValid && dropbox.embedUrl.includes('raw=1'), 'Normaliza Dropbox a streaming raw');

const gdrive = parseVideoUrl('https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing');
assert(gdrive.isValid && gdrive.embedUrl.includes('preview'), 'Convierte Google Drive a URL de previsualización preview');

const directMp4 = parseVideoUrl('https://cdn.example.com/assets/presentation.mp4');
assert(directMp4.isValid && directMp4.playerType === 'direct', 'Detecta enlace directo MP4');

console.log('== 4. Normalización de Elementos de Vídeo ==');
const item = normalizeVideoItem({
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: ' Clase Magistral ',
  description: 'Descripción de prueba',
  className: 'Inglés Técnico Económico',
  authorName: 'Gina Marcela',
  authorRole: 'teacher'
});
assert(item.id.startsWith('vid_'), 'Asigna ID único');
assert(item.title === 'Clase Magistral', 'Limpia espacios del título');
assert(item.className === 'Inglés Técnico Económico', 'Conserva la etiqueta de clase');
assert(item.format === 'long', 'Conserva formato largo');
assert(Array.isArray(item.likes) && Array.isArray(item.comments), 'Inicializa arrays de reacciones y comentarios');

console.log('== 5. Catálogo DEMO_VIDEOS ==');
assert(Array.isArray(DEMO_VIDEOS) && DEMO_VIDEOS.length >= 4, 'DEMO_VIDEOS contiene al menos 4 vídeos');
assert(DEMO_VIDEOS.some(v => v.format === 'long'), 'Contiene vídeos en formato largo');
assert(DEMO_VIDEOS.some(v => v.format === 'short'), 'Contiene vídeos en formato corto tipo TikTok');
assert(DEMO_VIDEOS.every(v => v.className && v.title && v.authorName), 'Todos los vídeos demo tienen etiqueta de clase, título y autor');

console.log('== 6. Deduplicación Estricta de Vídeos (Prevención de Duplicados en Subida/Borrado) ==');
const duplicateList = [
  { id: 'vid_123', title: 'Video Original', createdAt: 1000 },
  { id: 'vid_123', title: 'Video Duplicado con Update', createdAt: 1000, updatedAt: 2000 },
  { id: 'vid_456', title: 'Otro Video', createdAt: 1500 }
];
const deduped = deduplicateVideos(duplicateList);
assert(deduped.length === 2, 'Colapsa elementos con id idéntico a un único registro');
assert(deduped[0].id === 'vid_123' && deduped[0].updatedAt === 2000, 'Conserva la versión más reciente en caso de colisión');
assert(deduped[1].id === 'vid_456', 'Conserva los demás elementos sin alterarlos');
assert(deduplicateVideos([]).length === 0, 'Maneja arrays vacíos sin romper');
assert(deduplicateVideos(null).length === 0, 'Maneja null sin romper');

console.log('== 7. Extracción de URLs de Vídeo en Comentarios ==');
const extractedYt = extractFirstVideoUrl('Miren este video https://www.youtube.com/watch?v=dQw4w9WgXcQ para la tarea.');
assert(extractedYt && extractedYt.isValid && extractedYt.platform === 'youtube' && extractedYt.videoId === 'dQw4w9WgXcQ', 'Extrae enlace de YouTube en texto');

const extractedTikTok = extractFirstVideoUrl('Explicación rápida: https://www.tiktok.com/@teacher/video/1234567890123456789!');
assert(extractedTikTok && extractedTikTok.isValid && extractedTikTok.platform === 'tiktok', 'Extrae enlace de TikTok con puntuación');

const extractedDirect = extractFirstVideoUrl('Descarguen https://cdn.example.com/demo.mp4');
assert(extractedDirect && extractedDirect.isValid && extractedDirect.playerType === 'direct', 'Extrae enlace directo de vídeo MP4');

const noVideo = extractFirstVideoUrl('Comentario normal sin enlaces ni videos https://google.com/search');
assert(noVideo === null, 'Ignora enlaces genéricos que no son de video');
assert(extractFirstVideoUrl('') === null, 'Maneja texto vacío');
assert(extractFirstVideoUrl(null) === null, 'Maneja null');

console.log('== 8. Comentarios Ricos: Imágenes, Vídeos y Respuestas Anidadas ==');
const richItem = normalizeVideoItem({
  title: 'Video con comentarios ricos',
  comments: [
    {
      id: 'comm_root_1',
      userName: 'Carlos',
      text: '¿Alguien tiene la fórmula del ROI?',
      imageUrl: 'https://firebasestorage.googleapis.com/.../formula.jpg',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ'
    },
    {
      id: 'comm_reply_1',
      userName: 'Gina Docente',
      userRole: 'teacher',
      text: 'Revisa el minuto 2:15 de este vídeo adicional:',
      parentId: 'comm_root_1',
      replyTo: {
        id: 'comm_root_1',
        userName: 'Carlos',
        text: '¿Alguien tiene la fórmula del ROI?'
      },
      imageUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }
  ]
});

assert(richItem.comments.length === 2, 'Conserva los comentarios');
assert(richItem.comments[0].imageUrl.includes('formula.jpg'), 'Conserva imageUrl en comentario raíz');
assert(richItem.comments[0].videoUrl.includes('dQw4w9WgXcQ'), 'Conserva videoUrl en comentario raíz');
assert(richItem.comments[1].parentId === 'comm_root_1', 'Conserva parentId para anidación de respuestas');
assert(richItem.comments[1].replyTo && richItem.comments[1].replyTo.id === 'comm_root_1', 'Conserva metadata replyTo');
assert(richItem.comments[1].replyTo.userName === 'Carlos', 'Conserva nombre del autor respondido');

console.log('\n========================================');
console.log(`Total pruebas Vídeos: ${passed + failed} | OK: ${passed} | FAIL: ${failed}`);
console.log('========================================');

if (failed > 0) process.exit(1);

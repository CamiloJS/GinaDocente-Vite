// scripts/test-notes.mjs
// Pruebas unitarias y de regresión para la sección "Notas" (notesEngine.js, demoData.js, NotesModule.jsx y App.jsx)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NOTE_FONT_FAMILIES,
  NOTE_FONT_SIZES,
  NOTE_TEXT_COLORS,
  NOTE_HIGHLIGHT_COLORS,
  NOTE_PAPER_THEMES,
  extractNoteYouTubeId,
  isNoteImageUrl,
  normalizeExternalNoteUrl,
  classifyNoteUrl,
  sanitizeNoteHtml,
  stripNoteHtml,
  extractInlineMediaUrlsFromHtml,
  canUserToggleNoteLock,
  canUserEditNote,
  canUserDeleteNote,
  createNoteAuditEntry,
  appendNoteAuditEntry
} from '../src/utils/notesEngine.js';

import {
  DEMO_NOTES,
  loadDemoSandbox,
  saveDemoSandboxItem,
  removeDemoSandboxItem,
  mergeDemoItemsWithBase
} from '../src/utils/demoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let okCount = 0;
let failCount = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  OK  ${label}`);
    okCount++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`);
    failCount++;
  }
}

console.log('\n== 1. Catálogo de Personalización de Texto y Cuaderno (notesEngine.js) ==');
check(
  '5 familias tipográficas definidas (sans, serif, mono, handwriting, classic)',
  Array.isArray(NOTE_FONT_FAMILIES) &&
    NOTE_FONT_FAMILIES.length === 5 &&
    NOTE_FONT_FAMILIES.every(f => f.id && f.label && f.css)
);
check(
  '5 tamaños de fuente definidos (sm, base, md, lg, xl)',
  Array.isArray(NOTE_FONT_SIZES) &&
    NOTE_FONT_SIZES.length === 5 &&
    NOTE_FONT_SIZES.every(s => s.id && s.px && s.className)
);
check(
  'Paleta de colores de texto y resaltadores definida (>= 8 colores y >= 6 resaltadores)',
  Array.isArray(NOTE_TEXT_COLORS) &&
    NOTE_TEXT_COLORS.length >= 8 &&
    Array.isArray(NOTE_HIGHLIGHT_COLORS) &&
    NOTE_HIGHLIGHT_COLORS.length >= 6
);
check(
  '6 temas de papel/fondo para cuadernos de notas definidos (default, warm, sky, emerald, violet, rose)',
  Array.isArray(NOTE_PAPER_THEMES) &&
    NOTE_PAPER_THEMES.length === 6 &&
    NOTE_PAPER_THEMES.some(t => t.id === 'warm') &&
    NOTE_PAPER_THEMES.some(t => t.id === 'sky') &&
    NOTE_PAPER_THEMES.some(t => t.id === 'emerald')
);

console.log('\n== 2. Enlaces Inteligentes (YouTube, Imagen o Enlace) y Bloqueo de Archivos Locales ==');
check(
  'extractNoteYouTubeId detecta watch?v=, youtu.be/, shorts/ y embed/',
  extractNoteYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ' &&
    extractNoteYouTubeId('https://youtu.be/M7lc1UVf-VE?t=12') === 'M7lc1UVf-VE' &&
    extractNoteYouTubeId('https://www.youtube.com/shorts/aqz-KE-bpKQ') === 'aqz-KE-bpKQ' &&
    extractNoteYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
);
check(
  'extractNoteYouTubeId devuelve null ante URLs que no son de YouTube o entradas vacías',
  extractNoteYouTubeId('https://www.unipamplona.edu.co') === null &&
    extractNoteYouTubeId('') === null &&
    extractNoteYouTubeId(null) === null
);
check(
  'isNoteImageUrl detecta extensiones (.png, .jpg, .webp, .gif, .svg) y hosts de imágenes (Unsplash, Imgur)',
  isNoteImageUrl('https://example.com/diagrama-clase.png') === true &&
    isNoteImageUrl('https://example.com/foto.JPG?width=800') === true &&
    isNoteImageUrl('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80') === true &&
    isNoteImageUrl('https://i.imgur.com/abc1234.webp') === true &&
    isNoteImageUrl('https://www.unipamplona.edu.co/guia.pdf') === false
);
check(
  'normalizeExternalNoteUrl rechaza estrictamente esquemas locales o peligrosos (data:, blob:, file:, javascript:)',
  normalizeExternalNoteUrl('data:image/png;base64,iVBORw0KGgo=') === null &&
    normalizeExternalNoteUrl('blob:https://example.com/1234-5678') === null &&
    normalizeExternalNoteUrl('file:///C:/Users/foto.jpg') === null &&
    normalizeExternalNoteUrl('javascript:alert(1)') === null
);
check(
  'normalizeExternalNoteUrl normaliza dominios sin protocolo a https://',
  normalizeExternalNoteUrl('www.youtube.com/watch?v=dQw4w9WgXcQ') === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' &&
    normalizeExternalNoteUrl('unipamplona.edu.co/portal') === 'https://unipamplona.edu.co/portal'
);

const ytClassified = classifyNoteUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
const ytForcedLink = classifyNoteUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'link');
const imgClassified = classifyNoteUrl('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800');
const imgForcedLink = classifyNoteUrl('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'link');
const webClassified = classifyNoteUrl('https://es.wikipedia.org/wiki/Pedagogia');

check(
  'classifyNoteUrl convierte automáticamente URL de YouTube en modo youtube y permite alternar a modo enlace',
  ytClassified?.valid === true &&
    ytClassified?.type === 'youtube' &&
    ytClassified?.youtubeId === 'dQw4w9WgXcQ' &&
    ytClassified?.defaultRenderMode === 'youtube' &&
    ytForcedLink?.type === 'youtube' &&
    ytForcedLink?.defaultRenderMode === 'link'
);
check(
  'classifyNoteUrl convierte automáticamente URL de imagen en vista de imagen y permite alternar a modo enlace',
  imgClassified?.valid === true &&
    imgClassified?.type === 'image' &&
    imgClassified?.defaultRenderMode === 'image' &&
    imgForcedLink?.type === 'image' &&
    imgForcedLink?.defaultRenderMode === 'link'
);
check(
  'classifyNoteUrl clasifica páginas web normales como enlace estándar',
  webClassified?.valid === true &&
    webClassified?.type === 'link' &&
    webClassified?.defaultRenderMode === 'link'
);
check(
  'extractInlineMediaUrlsFromHtml detecta enlaces de YouTube e imagen pegados en el texto del apunte',
  (() => {
    const html = '<p>Revisar video https://youtu.be/dQw4w9WgXcQ y esquema https://example.com/mapa.png para mañana.</p>';
    const detected = extractInlineMediaUrlsFromHtml(html);
    return detected.length === 2 &&
      detected.some(d => d.mediaType === 'youtube' && d.youtubeId === 'dQw4w9WgXcQ') &&
      detected.some(d => d.mediaType === 'image' && d.url === 'https://example.com/mapa.png');
  })()
);
check(
  'stripNoteHtml limpia etiquetas HTML y decodifica entidades conservando saltos de línea',
  stripNoteHtml('<h3>Título</h3><p>Texto con &amp; y &nbsp;espacio</p>').includes('Título') &&
    stripNoteHtml('<h3>Título</h3><p>Texto con &amp; y &nbsp;espacio</p>').includes('Texto con & y  espacio')
);
check(
  'sanitizeNoteHtml bloquea imágenes locales (data:, file:, blob:), scripts, eventos inline y normaliza <font size>',
  (() => {
    const dirty = '<p onclick="alert(1)">Texto <font size="5">grande</font><img src="file:///C:/foto.png" onerror="alert(2)"><img src="data:image/png;base64,AAA"><script>evil()</script><a href="javascript:alert(3)">link</a></p>';
    const clean = sanitizeNoteHtml(dirty);
    return !clean.includes('<img') &&
      !clean.includes('file:') &&
      !clean.includes('data:') &&
      !clean.includes('<script') &&
      !clean.includes('onclick') &&
      !clean.includes('onerror') &&
      !clean.includes('javascript:') &&
      clean.includes('font-size: 20px');
  })()
);

console.log('\n== 3. Permisos de Candado/Seguro, Edición y Exclusividad de Borrado del Docente ==');
const openSharedNote = {
  id: 'note-open',
  scope: 'shared',
  ownerId: '1001',
  authorId: '1001',
  isLocked: false,
  lockedBy: null,
  lockedByRole: null
};
const studentLockedSharedNote = {
  id: 'note-stud-locked',
  scope: 'shared',
  ownerId: '1001',
  authorId: '1001',
  isLocked: true,
  lockedBy: '1001',
  lockedByRole: 'student'
};
const teacherLockedSharedNote = {
  id: 'note-teacher-locked',
  scope: 'shared',
  ownerId: '1001',
  authorId: '1001',
  isLocked: true,
  lockedBy: 'teacher@unipamplona.edu.co',
  lockedByRole: 'teacher'
};
const privateStudentNote = {
  id: 'note-private',
  scope: 'private',
  ownerId: '1001',
  authorId: '1001',
  isLocked: false
};

check(
  'Nota compartida abierta: cualquier estudiante o docente puede editar y activar el seguro (candado)',
  canUserEditNote(openSharedNote, { userId: '1002', role: 'student' }) === true &&
    canUserToggleNoteLock(openSharedNote, { userId: '1002', role: 'student' }) === true &&
    canUserEditNote(openSharedNote, { userId: 'teacher@unipamplona.edu.co', role: 'teacher' }) === true &&
    canUserToggleNoteLock(openSharedNote, { userId: 'teacher@unipamplona.edu.co', role: 'teacher' }) === true
);
check(
  'Nota compartida asegurada con candado por un estudiante (1001): otro estudiante (1002) NO puede editar, ni desbloquear, ni borrar',
  canUserEditNote(studentLockedSharedNote, '1002', 'student') === false &&
    canUserToggleNoteLock(studentLockedSharedNote, '1002', 'student') === false &&
    canUserDeleteNote(studentLockedSharedNote, '1002', 'student') === false
);
check(
  'Nota compartida asegurada por estudiante (1001): el propio autor (1001) puede editar o quitar su candado, y el docente puede desbloquear/editar/borrar todo',
  canUserEditNote(studentLockedSharedNote, '1001', 'student') === true &&
    canUserToggleNoteLock(studentLockedSharedNote, '1001', 'student') === true &&
    canUserEditNote(studentLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true &&
    canUserToggleNoteLock(studentLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true &&
    canUserDeleteNote(studentLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true
);
check(
  'Nota compartida asegurada con candado por el docente: ningún estudiante (ni siquiera el autor original) puede quitar el candado, editar o borrar; sólo el docente puede',
  canUserEditNote(teacherLockedSharedNote, '1001', 'student') === false &&
    canUserToggleNoteLock(teacherLockedSharedNote, '1001', 'student') === false &&
    canUserDeleteNote(teacherLockedSharedNote, '1001', 'student') === false &&
    canUserEditNote(teacherLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true &&
    canUserToggleNoteLock(teacherLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true &&
    canUserDeleteNote(teacherLockedSharedNote, 'teacher@unipamplona.edu.co', 'teacher') === true
);
check(
  'Nota privada: sólo su propietario puede verla, editarla o eliminarla',
  canUserEditNote(privateStudentNote, '1001', 'student') === true &&
    canUserDeleteNote(privateStudentNote, '1001', 'student') === true &&
    canUserEditNote(privateStudentNote, '1002', 'student') === false &&
    canUserDeleteNote(privateStudentNote, '1002', 'student') === false
);
check(
  'Anti-secuestro de candado: si un compañero (1002) asegura la nota creada por (1001), el autor original (1001) conserva edición/desbloqueo, terceros (1003) quedan bloqueados y sólo el docente puede borrarla',
  (() => {
    const peerLockedNote = {
      id: 'note-peer-locked',
      scope: 'shared',
      ownerId: '1001',
      authorId: '1001',
      isLocked: true,
      lockedBy: '1002',
      lockedByRole: 'student'
    };
    return canUserEditNote(peerLockedNote, '1001', 'student') === true &&
      canUserToggleNoteLock(peerLockedNote, '1001', 'student') === true &&
      canUserEditNote(peerLockedNote, '1003', 'student') === false &&
      canUserToggleNoteLock(peerLockedNote, '1003', 'student') === false &&
      canUserDeleteNote(peerLockedNote, '1001', 'student') === false &&
      canUserDeleteNote(peerLockedNote, 'teacher@unipamplona.edu.co', 'teacher') === true;
  })()
);

console.log('\n== 4. Historial Silencioso "Últimos cambios" y Restauración de Versiones ==');
const entry1 = createNoteAuditEntry({
  action: 'create',
  actorId: '1001',
  actorName: 'María Fernanda Pérez',
  actorRole: 'student',
  summary: 'Creó el apunte de clase',
  newTitle: 'Sesión 1',
  newContent: '<p>Contenido original de María</p>'
});
const entry2 = createNoteAuditEntry({
  action: 'edit',
  actorId: '1002',
  actorName: 'Juan Diego Gómez',
  actorRole: 'student',
  summary: 'Modificó el apunte compartido',
  previousTitle: 'Sesión 1',
  newTitle: 'Sesión 1 (Editado)',
  previousContent: '<p>Contenido original de María</p>',
  newContent: '<p>Contenido modificado por Juan</p>'
});
const logAfterTwo = appendNoteAuditEntry([entry1], entry2);

check(
  'createNoteAuditEntry y appendNoteAuditEntry registran autor, acción, HTML previo/nuevo y vista previa de texto limpio',
  logAfterTwo.length === 2 &&
    logAfterTwo[0].actorName === 'Juan Diego Gómez' &&
    logAfterTwo[0].previousContent === '<p>Contenido original de María</p>' &&
    logAfterTwo[0].newContent === '<p>Contenido modificado por Juan</p>' &&
    logAfterTwo[0].previousTextPreview === 'Contenido original de María' &&
    logAfterTwo[0].newTextPreview === 'Contenido modificado por Juan'
);

console.log('\n== 5. Datos Demo (DEMO_NOTES) y Verificación Estática de Restricciones en UI ==');
check(
  'DEMO_NOTES incluye notas compartidas (con candado docente, candado estudiante y pizarra abierta con historial) y notas privadas',
  Array.isArray(DEMO_NOTES) &&
    DEMO_NOTES.length >= 5 &&
    DEMO_NOTES.some(n => n.scope === 'shared' && n.isLocked && n.lockedByRole === 'teacher') &&
    DEMO_NOTES.some(n => n.scope === 'shared' && n.isLocked && n.lockedByRole === 'student') &&
    DEMO_NOTES.some(n => n.scope === 'shared' && !n.isLocked && Array.isArray(n.auditLog) && n.auditLog.length >= 1) &&
    DEMO_NOTES.some(n => n.scope === 'private')
);

const sandboxObj = loadDemoSandbox();
const mergedNotes = mergeDemoItemsWithBase(DEMO_NOTES, [], 'notes');
check(
  'loadDemoSandbox, mergeDemoItemsWithBase, saveDemoSandboxItem y removeDemoSandboxItem soportan la categoría "notes"',
  Array.isArray(sandboxObj?.notes) &&
    Array.isArray(mergedNotes) &&
    mergedNotes.length === DEMO_NOTES.length &&
    typeof saveDemoSandboxItem === 'function' &&
    typeof removeDemoSandboxItem === 'function'
);

const notesModuleSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'NotesModule.jsx'), 'utf8');
const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8');

check(
  'NotesModule.jsx NO contiene <input type="file"> (prohibido subir archivos o fotos desde el dispositivo)',
  !/type\s*=\s*["']file["']/i.test(notesModuleSrc)
);
check(
  'NotesModule.jsx bloquea explícitamente el pegado (handleEditorPaste) y arrastrado (handleEditorDrop) de archivos o imágenes locales',
  notesModuleSrc.includes('handleEditorPaste') &&
    notesModuleSrc.includes('handleEditorDrop') &&
    notesModuleSrc.includes('En la sección de Notas no se permite subir archivos ni fotos desde el dispositivo')
);
check(
  'NotesModule.jsx oculta completamente "Últimos cambios" a los estudiantes (renderizado exclusivo para role === "teacher")',
  notesModuleSrc.includes('Últimos cambios') &&
    notesModuleSrc.includes('{isTeacher && (') &&
    notesModuleSrc.includes('{isTeacher && isAuditModalOpen &&')
);
check(
  'NotesModule.jsx aplica borrado suave silencioso (isSoftDeleted: true) cuando un estudiante borra una nota compartida para que el docente pueda auditarla y restaurarla',
  notesModuleSrc.includes('isSoftDeleted: true') &&
    notesModuleSrc.includes('handleTeacherRestoreAuditVersion')
);
check(
  'App.jsx integra la pestaña "notes", suscripción a Firestore, menú lateral de escritorio y menú móvil',
  appSrc.includes("activeTab === 'notes'") &&
    appSrc.includes("collection(db, 'artifacts', appId, 'public', 'data', 'notes')") &&
    appSrc.includes("changeTab('notes')")
);

console.log('\n========================================');
console.log(`Total pruebas Notas: ${okCount + failCount} | OK: ${okCount} | FAIL: ${failCount}`);
console.log('========================================\n');

if (failCount > 0) {
  process.exit(1);
}

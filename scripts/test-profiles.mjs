// scripts/test-profiles.mjs
// Pruebas unitarias para aislamiento de publicaciones por perfil y visualización de cabecera de autor

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isTeacherId,
  isCamiloTeacher,
  getCanonicalTeacherId,
  TEACHER_NAME,
  SECOND_TEACHER_NAME,
  resolveUserDisplayName,
  resolveUserPhoto
} from '../src/utils/helpers.js';

import { DEMO_USER_POSTS } from '../src/utils/demoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  OK  ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  FAIL ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message ? message + ' ' : ''}Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

// Simulador exacto de la lógica de filtrado de publicaciones en renderProfile
function filterProfilePosts(userPosts, targetFilterId, userData = null, isMyProfile = false, myChatId = '', user = null, loggedInName = '') {
  const isTeacherProfile = isTeacherId(targetFilterId);
  const cleanFilterIdLower = String(targetFilterId || '').toLowerCase().replace(/^@/, '');
  
  return userPosts.filter(p => {
    const isPostFromTeacher = (
      p.authorRole === 'teacher' ||
      (p.authorRole !== 'student' && (
        isTeacherId(p.authorUsername) ||
        isTeacherId(p.authorId) ||
        isTeacherId(p.authorName) ||
        isTeacherId(p.author)
      ))
    );

    if (isTeacherProfile) {
      if (!isPostFromTeacher || p.authorRole === 'student') return false;
      const postAuthorKey = p.authorUsername || p.authorId || p.authorName || p.author || '';
      const postTeacherCanon = isCamiloTeacher(postAuthorKey) ? 'camilodocente' : 'teacher';
      const targetTeacherCanon = isCamiloTeacher(targetFilterId) ? 'camilodocente' : 'teacher';
      return postTeacherCanon === targetTeacherCanon;
    }

    if (isPostFromTeacher || p.authorRole === 'teacher') return false;

    const pUserLower = String(p.authorUsername || '').toLowerCase().replace(/^@/, '');
    const pIdLower = String(p.authorId || '').toLowerCase().replace(/^@/, '');
    const pUid = p.authorId || p.uid;
    const targetUid = userData?.uid;
    const pAuthorNameLower = String(p.authorName || p.author || '').trim().toLowerCase();
    const profileFullNameLower = String(userData?.fullName || '').trim().toLowerCase();

    if (cleanFilterIdLower) {
      if (pUserLower && pUserLower === cleanFilterIdLower) return true;
      if (pIdLower && pIdLower === cleanFilterIdLower) return true;
      if (targetUid && pUid && pUid === targetUid) return true;
    }
    if (profileFullNameLower && pAuthorNameLower && profileFullNameLower === pAuthorNameLower) {
      return true;
    }
    if (isMyProfile) {
      const myClean = String(myChatId || '').toLowerCase().replace(/^@/, '');
      if (myClean && (pUserLower === myClean || pIdLower === myClean)) return true;
      if (user?.uid && pUid && pUid === user.uid) return true;
      if (loggedInName && pAuthorNameLower && loggedInName.trim().toLowerCase() === pAuthorNameLower) return true;
    }
    return false;
  });
}

console.log('\n== 1. Aislamiento Estricto de Publicaciones en Perfil Docente vs Estudiantes ==');

test('Perfil de la docente Gina NO muestra publicaciones de estudiantes', () => {
  const posts = [
    { id: 't1', authorUsername: 'GinaDocente', authorRole: 'teacher', text: 'Bienvenida al curso' },
    { id: 's1', authorUsername: 'carlos_mendoza', authorRole: 'student', text: 'Mi tarea' },
    { id: 's2', authorUsername: 'laura_restrepo', authorRole: 'student', text: 'Pregunta' },
    { id: 's3', authorUsername: 'invitado', authorName: 'Invitado', text: 'Práctica' }
  ];
  const filtered = filterProfilePosts(posts, 'teacher', { fullName: TEACHER_NAME, role: 'teacher' });
  assertEqual(filtered.length, 1, 'Solo debe quedar 1 post');
  assertEqual(filtered[0].id, 't1', 'El post restante debe ser el de la docente');
});

test('Perfil docente Gina con DEMO_USER_POSTS solo retorna el post de la docente (demo_post_1), NO el del estudiante (demo_post_2)', () => {
  const filtered = filterProfilePosts(DEMO_USER_POSTS, 'teacher', { fullName: TEACHER_NAME, role: 'teacher' });
  assertEqual(filtered.length, 1, 'Debe haber exactamente 1 post de Gina');
  assertEqual(filtered[0].id, 'demo_post_1', 'El post debe ser demo_post_1');
  assert(!filtered.some(p => p.id === 'demo_post_2'), 'demo_post_2 (invitado) no debe aparecer en perfil de la docente');
});

test('Perfil de docente Camilo solo muestra publicaciones de Camilo y no las de Gina ni las de estudiantes', () => {
  const posts = [
    { id: 't1', authorUsername: 'GinaDocente', authorRole: 'teacher', text: 'Gina post' },
    { id: 't2', authorUsername: 'camilodocente', authorRole: 'teacher', text: 'Camilo post' },
    { id: 's1', authorUsername: 'mateo_gomez', authorRole: 'student', text: 'Mateo post' }
  ];
  const filtered = filterProfilePosts(posts, 'camilodocente', { fullName: SECOND_TEACHER_NAME, role: 'teacher' });
  assertEqual(filtered.length, 1, 'Solo debe quedar el post de Camilo');
  assertEqual(filtered[0].id, 't2', 'Debe ser t2');
});

console.log('\n== 2. Aislamiento Independiente entre Perfiles de Estudiantes ==');

test('Perfil del estudiante Carlos Mendoza solo muestra sus publicaciones, no las de otros estudiantes ni docentes', () => {
  const posts = [
    { id: 't1', authorUsername: 'GinaDocente', authorRole: 'teacher', text: 'Docente post' },
    { id: 's1', authorUsername: 'carlos_mendoza', authorRole: 'student', text: 'Carlos post 1' },
    { id: 's2', authorUsername: 'carlos_mendoza', authorRole: 'student', text: 'Carlos post 2' },
    { id: 's3', authorUsername: 'laura_restrepo', authorRole: 'student', text: 'Laura post' },
    { id: 's4', authorUsername: 'mateo_gomez', authorRole: 'student', text: 'Mateo post' }
  ];
  const filtered = filterProfilePosts(posts, 'carlos_mendoza', { fullName: 'Carlos Andrés Mendoza', role: 'student', uid: 'uid_carlos' });
  assertEqual(filtered.length, 2, 'Deben haber 2 posts de Carlos');
  assert(filtered.every(p => p.authorUsername === 'carlos_mendoza'), 'Todos deben pertenecer a Carlos');
});

test('Perfil del estudiante Laura Restrepo no recibe publicaciones de Carlos ni de la docente', () => {
  const posts = [
    { id: 't1', authorUsername: 'GinaDocente', authorRole: 'teacher', text: 'Docente post' },
    { id: 's1', authorUsername: 'carlos_mendoza', authorRole: 'student', text: 'Carlos post' },
    { id: 's2', authorUsername: 'laura_restrepo', authorRole: 'student', text: 'Laura post' }
  ];
  const filtered = filterProfilePosts(posts, 'laura_restrepo', { fullName: 'Laura Sofía Restrepo', role: 'student', uid: 'uid_laura' });
  assertEqual(filtered.length, 1, 'Debe haber exactamente 1 post de Laura');
  assertEqual(filtered[0].id, 's2', 'Debe ser s2');
});

test('Estudiante viendo su propio perfil ve únicamente sus publicaciones', () => {
  const posts = [
    { id: 't1', authorUsername: 'teacher', authorRole: 'teacher', text: 'Docente post' },
    { id: 's1', authorUsername: 'carlos_mendoza', authorId: 'uid_carlos', authorName: 'Carlos Mendoza', text: 'Mi post' },
    { id: 's2', authorUsername: 'laura_restrepo', authorId: 'uid_laura', authorName: 'Laura Restrepo', text: 'Post ajeno' }
  ];
  const filtered = filterProfilePosts(posts, 'carlos_mendoza', { fullName: 'Carlos Mendoza', uid: 'uid_carlos' }, true, 'carlos_mendoza', { uid: 'uid_carlos' }, 'Carlos Mendoza');
  assertEqual(filtered.length, 1, 'Solo ve su propio post');
  assertEqual(filtered[0].id, 's1', 'Debe ser s1');
});

console.log('\n== 3. Integridad Estática en App.jsx (Cabecera de Autor y Filtro) ==');

const appJsx = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf8');

test('App.jsx incluye cabecera del autor arriba de cada publicación en el perfil con fecha al lado del nombre', () => {
  assert(appJsx.includes('authorDisplayName'), 'Debe calcular authorDisplayName en myPosts.map');
  assert(appJsx.includes('authorPhoto'), 'Debe calcular authorPhoto en myPosts.map');
  assert(appJsx.includes('Cabecera del Autor de la Publicación'), 'Debe contener la cabecera del autor de la publicación');
  assert(!appJsx.includes('authorRoleLabel'), 'NO debe contener etiquetas de rol (Docente/Estudiante) en las publicaciones');
});

test('App.jsx muestra el nombre del autor inclusive si es en su propio perfil con fecha al lado', () => {
  assert(appJsx.includes('{authorDisplayName}'), 'Debe renderizar {authorDisplayName}');
  assert(appJsx.includes('isTeacherProfile'), 'Debe verificar isTeacherProfile en el filtro');
  assert(appJsx.includes('isPostFromTeacher'), 'Debe verificar isPostFromTeacher en el filtro');
});

test('publishProfilePost guarda authorRole, author y authorPhoto', () => {
  assert(appJsx.includes("postAuthorRole = role === 'teacher' ? 'teacher' : 'student'"), 'publishProfilePost debe asignar postAuthorRole');
  assert(appJsx.includes('authorRole: postAuthorRole'), 'postPayload debe incluir authorRole');
});

test('myPosts.map prioriza el NOMBRE COMPLETO (3, 4 o 5 palabras) sobre nombres acortados de 2 palabras', () => {
  assert(appJsx.includes('candidateNames'), 'Debe recolectar candidateNames');
  assert(appJsx.includes('wordsB - wordsA'), 'Debe ordenar por cantidad de palabras para priorizar el nombre completo');

  // Simulación del selector de nombre completo con el caso reportado por el usuario:
  // Post guardó "Yulieth Gelvez" (2 palabras), pero el directorio tiene "Yulieth Alejandra Gelvez Orduz" (4 palabras)
  const post = { authorName: 'Yulieth Gelvez', authorUsername: 'yulieth' };
  const userData = { fullName: 'Yulieth Alejandra Gelvez Orduz' };
  const userMappings = { yulieth: { fullName: 'Yulieth Alejandra Gelvez Orduz' } };

  const candidateNames = [
    userData.fullName,
    userMappings.yulieth.fullName,
    post.authorName
  ].filter(Boolean);

  const selectedFullName = [...candidateNames].sort((a, b) => {
    const wordsA = a.trim().split(/\s+/).length;
    const wordsB = b.trim().split(/\s+/).length;
    if (wordsB !== wordsA) return wordsB - wordsA;
    return b.trim().length - a.trim().length;
  })[0].trim();

  assertEqual(selectedFullName, 'Yulieth Alejandra Gelvez Orduz', 'Debe seleccionar el nombre completo de 4 palabras, NO el acortado de 2');
});

test('resolveUserPhoto prioriza la foto de perfil actualizada en userMappings sobre la foto estática obsoleta de un post', () => {
  const stalePost = {
    id: 'post_123',
    author: 'Yulieth Gelvez',
    authorName: 'Yulieth Alejandra Gelvez Orduz',
    authorUsername: 'yulieth',
    authorPhoto: 'https://storage.googleapis.com/english-tech/old_avatar_january.jpg'
  };

  const userMappings = {
    yulieth: {
      fullName: 'Yulieth Alejandra Gelvez Orduz',
      profilePicUrl: 'https://storage.googleapis.com/english-tech/new_avatar_october.jpg'
    }
  };

  const resolved = resolveUserPhoto(stalePost, userMappings, stalePost.authorPhoto);
  assertEqual(resolved, 'https://storage.googleapis.com/english-tech/new_avatar_october.jpg', 'Debe devolver la foto NUEVA de userMappings y no la vieja del post');
});

test('resolveUserPhoto devuelve la foto de respaldo si el usuario aún no tiene foto en userMappings', () => {
  const postWithoutLivePhoto = {
    id: 'post_456',
    authorUsername: 'carlos',
    authorPhoto: 'https://storage.googleapis.com/english-tech/fallback_carlos.jpg'
  };

  const userMappings = {
    carlos: {
      fullName: 'Carlos Mendoza',
      profilePicUrl: ''
    }
  };

  const resolved = resolveUserPhoto(postWithoutLivePhoto, userMappings, postWithoutLivePhoto.authorPhoto);
  assertEqual(resolved, 'https://storage.googleapis.com/english-tech/fallback_carlos.jpg', 'Debe devolver la foto de respaldo');
});

test('App.jsx y TaskCard.jsx integran resolveUserPhoto para resolver fotos en vivo', () => {
  const taskCardJsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TaskCard.jsx'), 'utf-8');
  assert(taskCardJsx.includes('resolveUserPhoto(task, userMappings'), 'TaskCard debe usar resolveUserPhoto');
  assert(appJsx.includes('resolveUserPhoto'), 'App.jsx debe importar y usar resolveUserPhoto');
  assert(appJsx.includes('updateProfile'), 'App.jsx debe sincronizar la foto en Firebase Auth con updateProfile');
});

test('Docente viendo perfil de estudiante NUNCA sobreescribe la autoría del estudiante con el nombre o foto de la docente', () => {
  const isTeacherProfile = false;
  const isMyProfile = false; // La docente Gina está mirando el perfil ajeno de Angelly
  const loggedInName = TEACHER_NAME; // "Gina Marcela Quintana Delgado" (30 chars, 4 palabras)
  const userData = { fullName: 'Angelly Nicolle Pabón Torres', profilePicUrl: '' }; // (28 chars, 4 palabras)
  const post = {
    id: 'p_angelly',
    authorId: 'uid_angelly',
    authorUsername: 'nicolletorres1607',
    authorName: 'Angelly Nicolle Pabón Torres',
    authorRole: 'student'
  };
  const userMappings = {
    nicolletorres1607: {
      fullName: 'Angelly Nicolle Pabón Torres',
      profilePicUrl: ''
    }
  };

  const authorUser = userMappings[post.authorUsername];
  const postAuthorKey = post.authorUsername || post.authorId || post.author || '';
  const profileName = userData?.fullName;
  const targetUserKey = 'nicolletorres1607';

  // Lógica exacta de candidateNames en App.jsx
  const candidateNames = isTeacherProfile ? [
    isCamiloTeacher(postAuthorKey) ? SECOND_TEACHER_NAME : TEACHER_NAME,
    post.authorName,
    post.author
  ] : [
    (!isTeacherProfile && userData?.fullName && !isTeacherId(userData.fullName)) ? userData.fullName : null,
    (authorUser?.fullName && !isTeacherId(authorUser.fullName)) ? authorUser.fullName : null,
    resolveUserDisplayName({ ...post, authorRole: 'student' }, userMappings, ''),
    (!isTeacherProfile && profileName && profileName !== targetUserKey && !isTeacherId(profileName)) ? profileName : null,
    (isMyProfile && !isTeacherId(loggedInName)) ? loggedInName : null,
    (post.authorRole === 'student' || !isTeacherId(post.authorName)) ? post.authorName : null,
    (post.authorRole === 'student' || !isTeacherId(post.author)) ? post.author : null
  ].filter(name => typeof name === 'string' && name.trim().length > 0 && !name.trim().startsWith('@') && !isTeacherId(name));

  const authorDisplayName = isTeacherProfile
    ? TEACHER_NAME
    : (candidateNames.length > 0
      ? [...candidateNames].sort((a, b) => {
        const wordsA = a.trim().split(/\s+/).length;
        const wordsB = b.trim().split(/\s+/).length;
        if (wordsB !== wordsA) return wordsB - wordsA;
        return b.trim().length - a.trim().length;
      })[0].trim()
      : userData.fullName);

  assertEqual(authorDisplayName, 'Angelly Nicolle Pabón Torres', 'El autor debe ser la estudiante Angelly, NUNCA la docente');

  const photo = resolveUserPhoto({
    authorId: post.authorId,
    authorUsername: post.authorUsername,
    authorName: authorDisplayName,
    authorRole: 'student'
  }, userMappings, '');

  assert(photo !== '/icono.png', 'La foto de la estudiante nunca debe ser /icono.png');
});

test('resolveUserPhoto para un estudiante explícito no hereda /icono.png por defecto', () => {
  const photo = resolveUserPhoto({
    authorName: 'Angelly Nicolle Pabón Torres',
    authorRole: 'student'
  }, {}, '/icono.png');
  assertEqual(photo, '', 'Un estudiante explícito nunca debe heredar /icono.png');
});

console.log(`\n========================================`);
console.log(`Total pruebas Perfiles: ${totalTests} | OK: ${passedTests} | FAIL: ${failedTests}`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}

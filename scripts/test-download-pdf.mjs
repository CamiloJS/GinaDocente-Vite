// scripts/test-download-pdf.mjs
import assert from 'node:assert/strict';
import { handleForceDownload, sanitizeDocumentDownloadName, cleanDisplayDocName } from '../src/utils/helpers.js';

console.log('== Pruebas de Descarga Directa de PDF y Archivos ==');

// Mock simple de DOM para Node.js
const createdElements = [];
const clickedElements = [];

globalThis.document = {
  body: {
    appendChild: (el) => {
      createdElements.push(el);
    },
    removeChild: (el) => {
      const idx = createdElements.indexOf(el);
      if (idx !== -1) createdElements.splice(idx, 1);
    }
  },
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      attributes: {},
      href: '',
      download: '',
      target: '',
      rel: '',
      setAttribute: (k, v) => { el.attributes[k] = v; },
      getAttribute: (k) => el.attributes[k],
      click: () => {
        clickedElements.push({ ...el });
      }
    };
    return el;
  }
};

globalThis.window = {
  URL: {
    createObjectURL: (blob) => `blob:https://englishtech.vercel.app/${Math.random().toString(36).slice(2)}`,
    revokeObjectURL: () => {}
  }
};

// 1. Descarga directa con blob URL
{
  createdElements.length = 0;
  clickedElements.length = 0;
  const res = await handleForceDownload('blob:https://englishtech.vercel.app/test-blob', '(2026-2) CONSULTA - UNIT 2.');
  assert.equal(res, true, 'handleForceDownload debe retornar true para blob:');
  assert.equal(clickedElements.length, 1, 'Debe disparar click en un elemento');
  assert.equal(clickedElements[0].href, 'blob:https://englishtech.vercel.app/test-blob');
  assert.equal(clickedElements[0].download, '(2026-2) CONSULTA - UNIT 2..pdf', 'Debe asegurar extension .pdf');
  console.log('  OK  blob: descarga directamente con extension .pdf asegurada');
}

// 2. Descarga directa con data:application/pdf
{
  createdElements.length = 0;
  clickedElements.length = 0;
  const res = await handleForceDownload('data:application/pdf;base64,JVBERi0xLjcK...', 'entrega_estudiante');
  assert.equal(res, true, 'handleForceDownload debe retornar true para data:');
  assert.equal(clickedElements.length, 1, 'Debe disparar click');
  assert.equal(clickedElements[0].download, 'entrega_estudiante.pdf', 'Debe agregar .pdf si falta');
  console.log('  OK  data:application/pdf agrega extension .pdf y descarga sin abrir pestaña');
}

// 3. Limpieza de caracteres prohibidos en nombres de archivo
{
  createdElements.length = 0;
  clickedElements.length = 0;
  await handleForceDownload('blob:test', 'Guía "Unidad: 1" <Avanzada>? / 2026');
  assert.equal(clickedElements.length, 1);
  assert.equal(clickedElements[0].download, 'Guía _Unidad_ 1_ _Avanzada__ _ 2026.pdf');
  console.log('  OK  sanea caracteres no permitidos en nombres de archivo de SO');
}

// 4. Mock fetch exitoso para URLs remotas (Firebase Storage)
{
  createdElements.length = 0;
  clickedElements.length = 0;
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      blob: async () => ({ type: 'application/pdf', size: 1024 })
    };
  };

  const res = await handleForceDownload(
    'https://firebasestorage.googleapis.com/v0/b/ginadocente-unipamplona.firebasestorage.app/o/tasks%2Fdocumento.pdf?alt=media&token=abc',
    'Leidy Márquez .pdf'
  );

  assert.equal(res, true, 'Debe completarse con exito');
  assert.equal(clickedElements.length, 1, 'Debe gatillar exactamente 1 descarga');
  assert.ok(clickedElements[0].href.startsWith('blob:'), 'Debe descargar a traves de Blob URL en lugar de navegar externamente');
  assert.equal(clickedElements[0].download, 'Leidy Márquez .pdf');
  console.log('  OK  descarga remota de Firebase Storage convierte a Blob y descarga directamente');
}

// 5. Sanitización de nombres de PDF: reemplazo de guiones por espacios y extensión garantizada
{
  assert.equal(
    sanitizeDocumentDownloadName('Instrucciones - MODO OFFLINE.docx.pdf', true),
    'Instrucciones MODO OFFLINE.pdf',
    'Debe eliminar dobles extensiones, reemplazar guiones por espacios y terminar en .pdf'
  );
  assert.equal(
    sanitizeDocumentDownloadName('Nombre-De-Ejemplo', true),
    'Nombre De Ejemplo.pdf',
    'Debe reemplazar guiones por espacios y agregar .pdf'
  );
  assert.equal(
    sanitizeDocumentDownloadName('Nombre_De_Ejemplo.pdf', true),
    'Nombre De Ejemplo.pdf',
    'Debe reemplazar guiones bajos por espacios'
  );
  assert.equal(
    cleanDisplayDocName('Instrucciones - MODO OFFLINE.docx.pdf', true),
    'Instrucciones - MODO OFFLINE',
    'cleanDisplayDocName debe remover dobles extensiones y el .pdf visual'
  );
  console.log('  OK  sanitizeDocumentDownloadName descarga con espacios, sin guiones y garantiza .pdf');
}

console.log('\n========================================');
console.log('Total pruebas Descarga PDF: 5 | OK: 5 | FAIL: 0');
console.log('========================================\n');

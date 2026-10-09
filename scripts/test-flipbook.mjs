// scripts/test-flipbook.mjs
// Pruebas unitarias exhaustivas para el Motor de Libros (flipbookEngine.js, demoData.js y componentes UI)

import fs from 'node:fs';
import {
  MAX_TOTAL_FIRESTORE_BOOK_CHARS,
  DEFAULT_BOOK_ASPECT_RATIO,
  BOOK_THEMES,
  BOOK_CATEGORIES,
  getBookTheme,
  buildIllustratedBookPageSvg,
  buildBookPagesFromOutline,
  buildFallbackBookPages,
  uploadBookPagesToStorage,
  compactBookPagesForFirestore,
  sanitizeBookForFirestore,
  normalizeBookRecord,
  buildBookSpreads,
  getSpreadIndexForPage,
  formatSpreadPageLabel,
  calculateDragCurlState,
  clampBookZoom,
  filterBooksCatalog,
  playPageFlipSound
} from '../src/utils/flipbookEngine.js';

import {
  DEMO_BOOKS,
  DEMO_SANDBOX_CATEGORIES,
  DEMO_TAB_INFO,
  DEMO_TEACHER_TAB_INFO
} from '../src/utils/demoData.js';

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

console.log('\n== 1. Catálogo de Temas 3D y Categorías de Biblioteca ==');
check(
  '5 temas de encuadernación 3D definidos (royal-indigo, emerald-ledger, crimson-oxford, amber-executive, slate-modern)',
  Object.keys(BOOK_THEMES).length === 5 &&
    !!BOOK_THEMES['royal-indigo'] &&
    !!BOOK_THEMES['emerald-ledger'] &&
    !!BOOK_THEMES['crimson-oxford'] &&
    !!BOOK_THEMES['amber-executive'] &&
    !!BOOK_THEMES['slate-modern']
);
check(
  'Categorías de biblioteca incluyen textbook, case-study, glossary, magazine, workbook',
  Array.isArray(BOOK_CATEGORIES) &&
    BOOK_CATEGORIES.length === 5 &&
    BOOK_CATEGORIES.some((c) => c.id === 'textbook') &&
    BOOK_CATEGORIES.some((c) => c.id === 'case-study') &&
    BOOK_CATEGORIES.some((c) => c.id === 'glossary')
);
check(
  'getBookTheme devuelve el tema solicitado o fallback seguro a royal-indigo',
  getBookTheme('emerald-ledger').id === 'emerald-ledger' &&
    getBookTheme('crimson-oxford').id === 'crimson-oxford' &&
    getBookTheme('inexistente').id === 'royal-indigo' &&
    getBookTheme(null).id === 'royal-indigo'
);
check(
  'Constantes de límite de Firestore (650KB) y relación de aspecto A4 (0.707) son válidas',
  MAX_TOTAL_FIRESTORE_BOOK_CHARS === 650000 &&
    Math.abs(DEFAULT_BOOK_ASPECT_RATIO - 0.707) < 0.001
);

console.log('\n== 2. Generador de Páginas Ilustradas SVG y Esquemas de Libros ==');
const coverSvg = buildIllustratedBookPageSvg({
  variant: 'cover',
  title: 'Macroeconomic Trends & <Inflation>',
  subtitle: 'Special Edition "2026"',
  chapter: 'B2 Reading & Analysis',
  author: 'Prof. Camilo & Team',
  pageNumber: 1,
  totalPages: 6,
  themeId: 'emerald-ledger'
});
check(
  'buildIllustratedBookPageSvg genera data URL SVG válida para portada y escapa caracteres XML',
  typeof coverSvg === 'string' &&
    coverSvg.startsWith('data:image/svg+xml;charset=utf-8,') &&
    decodeURIComponent(coverSvg).includes('&amp;') &&
    decodeURIComponent(coverSvg).includes('&lt;Inflation&gt;')
);

const contentSvg = buildIllustratedBookPageSvg({
  variant: 'content',
  title: 'Chapter 1: Inflation & Purchasing Power',
  subtitle: 'Consumer Price Index Dynamics',
  chapter: 'UNIT 1',
  body: ['Inflation measures the rate of price increases over time in an economy.'],
  bullets: ['Demand-pull inflation', 'Cost-push inflation'],
  stats: [{ label: 'CPI Annual', value: '+4.2%' }],
  calloutTitle: 'Key Formula',
  calloutText: 'Real Wage = Nominal Wage / CPI',
  pageNumber: 2,
  totalPages: 6,
  themeId: 'crimson-oxford'
});
check(
  'buildIllustratedBookPageSvg genera página interior con capítulo, párrafos, viñetas, estadísticas y callout',
  typeof contentSvg === 'string' &&
    contentSvg.startsWith('data:image/svg+xml;charset=utf-8,') &&
    decodeURIComponent(contentSvg).includes('Chapter 1: Inflation') &&
    decodeURIComponent(contentSvg).includes('KEY FORMULA') &&
    decodeURIComponent(contentSvg).includes('+4.2%')
);

const backCoverSvg = buildIllustratedBookPageSvg({
  variant: 'back-cover',
  title: 'Macroeconomic Trends',
  subtitle: 'End of interactive edition.',
  totalPages: 6,
  themeId: 'amber-executive'
});
check(
  'buildIllustratedBookPageSvg genera contraportada con ISBN dinámico',
  typeof backCoverSvg === 'string' &&
    backCoverSvg.startsWith('data:image/svg+xml;charset=utf-8,') &&
    decodeURIComponent(backCoverSvg).includes('ISBN 978-958-8400-3D-06')
);

const outlinePages = buildBookPagesFromOutline(
  [
    {
      variant: 'cover',
      title: 'International Trade Handbook',
      subtitle: 'Import & Export Operations'
    },
    {
      variant: 'content',
      chapter: 'Unit 1',
      title: 'Comparative Advantage',
      body: ['Countries specialize in goods with lower opportunity cost.'],
      bullets: ['Opportunity cost', 'Terms of trade']
    },
    {
      variant: 'back-cover',
      title: 'International Trade Handbook'
    }
  ],
  { themeId: 'amber-executive', author: 'English TECH' }
);
check(
  'buildBookPagesFromOutline construye arreglo de páginas SVG válidas a partir de un outline',
  Array.isArray(outlinePages) &&
    outlinePages.length === 3 &&
    outlinePages.every((p) => typeof p === 'string' && p.startsWith('data:image/svg+xml;charset=utf-8,'))
);

const fallbackPages = buildFallbackBookPages({
  title: 'Fallback Book Test',
  description: 'Resumen de prueba',
  fileName: 'guide.pdf',
  author: 'Docente',
  themeId: 'slate-modern'
});
check(
  'buildFallbackBookPages genera 3 páginas de respaldo (portada, guía interior, contraportada)',
  Array.isArray(fallbackPages) &&
    fallbackPages.length === 3 &&
    decodeURIComponent(fallbackPages[0]).includes('Fallback Book Test') &&
    decodeURIComponent(fallbackPages[1]).includes('guide.pdf')
);

console.log('\n== 3. Subida, Compactación y Sanitización para Firestore (< 1MB) ==');
const remotePages = [
  'https://storage.googleapis.com/demo/page_1.jpg',
  'https://storage.googleapis.com/demo/page_2.jpg'
];
const compactedRemote = compactBookPagesForFirestore(remotePages, {
  fallbackTitle: 'Remote Book',
  themeId: 'crimson-oxford'
});
check(
  'compactBookPagesForFirestore preserva intactas las URLs remotas de Firebase Storage',
  compactedRemote.length === 2 &&
    compactedRemote[0] === remotePages[0] &&
    compactedRemote[1] === remotePages[1]
);

// Simular 16 páginas con data URLs enormes (~80KB cada una = 1.28MB > límite de Firestore)
const hugeInlinePages = Array.from(
  { length: 16 },
  (_, idx) => `data:image/jpeg;base64,${'A'.repeat(80000)}_${idx}`
);
const compactedHuge = compactBookPagesForFirestore(hugeInlinePages, {
  fallbackTitle: 'Huge Inline Book',
  themeId: 'royal-indigo'
});
const totalHugeChars = compactedHuge.reduce((acc, url) => acc + (url ? url.length : 0), 0);
check(
  'compactBookPagesForFirestore reemplaza páginas inline excesivas con SVGs ligeros manteniéndose bajo el límite de 1MB',
  compactedHuge.length === 16 &&
    totalHugeChars <= MAX_TOTAL_FIRESTORE_BOOK_CHARS + 40000 &&
    compactedHuge[0].startsWith('data:image/jpeg;base64,') &&
    compactedHuge[compactedHuge.length - 1].startsWith('data:image/svg+xml;charset=utf-8,')
);

const uploadedDemo = await uploadBookPagesToStorage(remotePages, async () => 'https://should-not-run', {
  isDemoMode: true
});
check(
  'uploadBookPagesToStorage no sube archivos a Storage cuando isDemoMode=true',
  uploadedDemo.length === 2 && uploadedDemo[0] === remotePages[0]
);

const sanitizedBook = sanitizeBookForFirestore({
  id: 'book_test_1',
  title: '  Financial Markets 3D  ',
  description: '   Wall Street & Beyond ',
  authorName: 'Prof. Camilo',
  theme: 'emerald-ledger',
  category: 'case-study',
  bookPages: remotePages,
  aspectRatio: 0.75
});
check(
  'sanitizeBookForFirestore limpia strings, conserva bookPages válidas, fija coverUrl y pageCount',
  sanitizedBook.title === 'Financial Markets 3D' &&
    sanitizedBook.description === 'Wall Street & Beyond' &&
    sanitizedBook.theme === 'emerald-ledger' &&
    sanitizedBook.pageCount === 2 &&
    sanitizedBook.coverUrl === remotePages[0] &&
    Math.abs(sanitizedBook.aspectRatio - 0.75) < 0.001
);

const sanitizedEmpty = sanitizeBookForFirestore({ id: 'empty_book', title: 'Empty Book', bookPages: [] });
check(
  'sanitizeBookForFirestore genera páginas de respaldo cuando un libro no tiene páginas renderizadas',
  sanitizedEmpty.id === 'empty_book' &&
    Array.isArray(sanitizedEmpty.bookPages) &&
    sanitizedEmpty.bookPages.length === 3 &&
    sanitizedEmpty.pageCount === 3 &&
    Boolean(sanitizedEmpty.coverUrl)
);

const normalizedNull = normalizeBookRecord(null);
check(
  'normalizeBookRecord maneja entrada nula devolviendo estructura segura por defecto',
  normalizedNull.id === 'book_default' &&
    Array.isArray(normalizedNull.bookPages) &&
    normalizedNull.bookPages.length === 3
);

const wallTaskBook = normalizeBookRecord({
  id: 'book_wall_test99',
  bookId: 'test99',
  title: 'Wall Synthesized Book',
  bookCategory: 'Material de Clase',
  bookTheme: 'amber-executive',
  pages: remotePages
});
check(
  'normalizeBookRecord y sanitizeBookForFirestore aceptan bookTheme, pages y normalizan categorías inválidas a textbook',
  wallTaskBook.theme === 'amber-executive' &&
    wallTaskBook.category === 'textbook' &&
    wallTaskBook.bookPages.length === 2 &&
    sanitizeBookForFirestore({ title: 'Invalid Cat', category: 'Material de Clase', bookTheme: 'slate-modern', pages: remotePages }).category === 'textbook' &&
    sanitizeBookForFirestore({ title: 'Invalid Cat', category: 'Material de Clase', bookTheme: 'slate-modern', pages: remotePages }).theme === 'slate-modern'
);

console.log('\n== 4. Cálculo de Pliegos 3D (Spreads: Modo Doble Hoja vs. Modo 1 Hoja) ==');
const sixPages = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
const doubleSpreads = buildBookSpreads(sixPages, true);
// Para 6 páginas (índices 0..5):
// Spread 0: [null, 0] (Portada cerrada a la derecha)
// Spread 1: [1, 2] (Páginas 2–3)
// Spread 2: [3, 4] (Páginas 4–5)
// Spread 3: [5, null] (Contraportada pág 6 a la izquierda)
check(
  'buildBookSpreads (doble página) coloca portada a la derecha, pares al centro y contraportada a la izquierda',
  doubleSpreads.length === 4 &&
    doubleSpreads[0].leftPage === null &&
    doubleSpreads[0].rightPage === 0 &&
    doubleSpreads[0].isCover === true &&
    doubleSpreads[1].leftPage === 1 &&
    doubleSpreads[1].rightPage === 2 &&
    doubleSpreads[2].leftPage === 3 &&
    doubleSpreads[2].rightPage === 4 &&
    doubleSpreads[3].leftPage === 5 &&
    doubleSpreads[3].rightPage === null &&
    doubleSpreads[3].isBackCover === true
);

const singleSpreads = buildBookSpreads(sixPages, false);
check(
  'buildBookSpreads (modo móvil 1 página) crea 1 pliego por página en rightPage',
  singleSpreads.length === 6 &&
    singleSpreads.every((sp, i) => sp.leftPage === null && sp.rightPage === i)
);

check(
  'getSpreadIndexForPage ubica correctamente el pliego (0-based) tanto en modo doble como en modo simple',
  getSpreadIndexForPage(0, true, 6) === 0 &&
    getSpreadIndexForPage(1, true, 6) === 1 &&
    getSpreadIndexForPage(2, true, 6) === 1 &&
    getSpreadIndexForPage(3, true, 6) === 2 &&
    getSpreadIndexForPage(5, true, 6) === 3 &&
    getSpreadIndexForPage(3, false, 6) === 3
);

check(
  'formatSpreadPageLabel formatea etiquetas de portada, pliego doble y contraportada',
  formatSpreadPageLabel(doubleSpreads[0], 6) === '1 / 6' &&
    formatSpreadPageLabel(doubleSpreads[1], 6) === '2–3 / 6' &&
    formatSpreadPageLabel(doubleSpreads[3], 6) === '6 / 6'
);

console.log('\n== 5. Física de Arrastre y Curvatura 3D de Hoja (calculateDragCurlState) ==');
const dragNextHalf = calculateDragCurlState({
  startX: 600,
  startY: 300,
  currentX: 340, // deltaX = -260; effectiveSpan = 800 * 0.65 = 520; progress = 0.5
  currentY: 280,
  containerWidth: 800,
  containerHeight: 600,
  direction: 'next'
});
check(
  'calculateDragCurlState calcula rotación 3D (-90 deg a mitad de arrastre hacia adelante), sombra máxima y shouldComplete',
  dragNextHalf.direction === 'next' &&
    Math.abs(dragNextHalf.progress - 0.5) < 0.01 &&
    dragNextHalf.angleDeg === -90 &&
    dragNextHalf.shouldComplete === true &&
    dragNextHalf.shadowOpacity > 0.5
);

const dragPrevComplete = calculateDragCurlState({
  startX: 100,
  startY: 300,
  currentX: 300, // deltaX = +200; progress = 200 / 520 = 0.3846 >= 0.28
  currentY: 320,
  containerWidth: 800,
  containerHeight: 600,
  direction: 'prev'
});
check(
  'calculateDragCurlState calcula ángulo positivo al retroceder hoja y activa shouldComplete al superar 28%',
  dragPrevComplete.direction === 'prev' &&
    dragPrevComplete.angleDeg > 60 &&
    dragPrevComplete.shouldComplete === true
);

const dragCanceled = calculateDragCurlState({
  startX: 500,
  startY: 300,
  currentX: 460, // deltaX = -40; progress = 40 / 520 = 0.0769 < 0.28
  currentY: 300,
  containerWidth: 800,
  containerHeight: 600,
  direction: 'next'
});
check(
  'calculateDragCurlState cancela el volteo de hoja cuando el arrastre es menor al 28% del ancho efectivo',
  dragCanceled.shouldComplete === false && dragCanceled.progress < 0.15
);

console.log('\n== 6. Zoom, Audio Seguro en Node y Búsqueda/Filtrado de Biblioteca ==');
check(
  'clampBookZoom restringe valores entre 0.75 y 2.5 con redondeo a 2 decimales',
  clampBookZoom(0.3) === 0.75 &&
    clampBookZoom(3.5) === 2.5 &&
    clampBookZoom(1.256) === 1.26 &&
    clampBookZoom('invalid') === 1
);
check(
  'playPageFlipSound no lanza errores en entorno sin navegador (Node)',
  playPageFlipSound({ muted: false, direction: 'next' }) === false
);

const catalogSample = [
  { id: 'b1', title: 'Macroeconomics 101', authorName: 'Camilo', category: 'textbook', pageTexts: ['GDP inflation'] },
  { id: 'b2', title: 'Financial Glossary', authorName: 'Camilo', category: 'glossary', pageTexts: ['Bull market bear market'] },
  { id: 'b3', title: 'Case Study: Coffee Exports', authorName: 'Gina', category: 'case-study', pageTexts: ['Colombian trade'] }
];
check(
  'filterBooksCatalog filtra por búsqueda de texto (título, autor o contenido de páginas) y categoría',
  filterBooksCatalog(catalogSample).length === 3 &&
    filterBooksCatalog(catalogSample, { query: 'coffee' }).length === 1 &&
    filterBooksCatalog(catalogSample, { query: 'bull market' })[0].id === 'b2' &&
    filterBooksCatalog(catalogSample, { category: 'glossary' })[0].id === 'b2'
);

console.log('\n== 7. Integración con Modo Demo (DEMO_BOOKS & Sandbox) ==');
check(
  'DEMO_BOOKS contiene al menos 2 libros 3D interactivos con páginas SVG válidas',
  Array.isArray(DEMO_BOOKS) &&
    DEMO_BOOKS.length >= 2 &&
    DEMO_BOOKS.every(
      (b) =>
        b.id &&
        b.title &&
        Array.isArray(b.bookPages) &&
        b.bookPages.length >= 4 &&
        b.bookPages.every((p) => typeof p === 'string' && p.startsWith('data:image/svg+xml'))
    )
);
check(
  'DEMO_SANDBOX_CATEGORIES, DEMO_TAB_INFO y DEMO_TEACHER_TAB_INFO incluyen la pestaña books',
  DEMO_SANDBOX_CATEGORIES.includes('books') &&
    Boolean(DEMO_TAB_INFO.books) &&
    Boolean(DEMO_TEACHER_TAB_INFO.books)
);

console.log('\n== 8. Interfaz Minimalista, Nomenclatura "Libros" / "Libro" y Estados Vacíos ==');
const uiFilesToInspect = [
  'src/components/BooksLibraryModule.jsx',
  'src/components/Flipbook3DModal.jsx',
  'src/components/TasksTab.jsx',
  'src/components/TaskCard.jsx',
  'src/components/DocumentPreviewModal.jsx',
  'src/components/CommandPaletteModal.jsx',
  'src/utils/demoData.js',
  'src/App.jsx'
];
const forbiddenCopyTerms = [
  'Libros 3D',
  'Libro 3D',
  'Leer en 3D',
  'Subir PDF como Libro 3D',
  'Publicar Libro 3D',
  'Convertir PDF a Libro 3D'
];
const hasForbiddenCopy = uiFilesToInspect.some((relPath) => {
  const content = fs.readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
  return forbiddenCopyTerms.some((term) => content.includes(term));
});
check(
  'Ningún componente ni dato demo usa "Libros 3D", "Libro 3D", "Leer en 3D" ni "Subir PDF como Libro 3D"',
  !hasForbiddenCopy
);

const booksModuleSrc = fs.readFileSync(new URL('../src/components/BooksLibraryModule.jsx', import.meta.url), 'utf8');
check(
  'BooksLibraryModule usa "Subir libro" / "Cerrar", distingue estado vacío ("No hay libros publicados aún") de filtrado ("No se encontraron libros") y no duplica botones inferiores',
  booksModuleSrc.includes("'Cerrar' : 'Subir libro'") &&
    booksModuleSrc.includes("'No hay libros publicados aún'") &&
    booksModuleSrc.includes("'No se encontraron libros'") &&
    !booksModuleSrc.includes('Publicar primer libro')
);

check(
  'BOOK_THEMES usa nombres concisos en español (Índigo, Esmeralda, Carmesí, Ámbar, Pizarra)',
  BOOK_THEMES['royal-indigo'].name === 'Índigo' &&
    BOOK_THEMES['emerald-ledger'].name === 'Esmeralda' &&
    BOOK_THEMES['crimson-oxford'].name === 'Carmesí' &&
    BOOK_THEMES['amber-executive'].name === 'Ámbar' &&
    BOOK_THEMES['slate-modern'].name === 'Pizarra'
);

console.log(`\n========================================`);
console.log(`Total pruebas Flipbook 3D: ${okCount + failCount} | OK: ${okCount} | FAIL: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}

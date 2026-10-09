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
  extractSvgExternalImageOverlay,
  buildBookPagesFromOutline,
  applyCustomCoverToPages,
  buildFallbackBookPages,
  extractBookOutlinePageTexts,
  normalizeBookOutlinePage,
  stripBookHtml,
  syncBookOutlineMetadata,
  updateBookOutlinePage,
  insertBookOutlinePage,
  removeBookOutlinePage,
  buildBookAiPrompt,
  parseBookAiResponse,
  buildFallbackBookOutline,
  generateAiBookPages,
  computeSmartPdfCompressionProfile,
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
  resolveBookReaderUserKey,
  getBookBookmarksStorageKey,
  loadUserBookBookmarks,
  saveUserBookBookmarks,
  toggleUserBookBookmark,
  saveUserBookLastPage,
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
  'src/components/BookWordEditor.jsx',
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
  'Convertir PDF a Libro 3D',
  'Crear libro con IA',
  'Generar libro con IA',
  'Libro con IA'
];
const hasForbiddenCopy = uiFilesToInspect.some((relPath) => {
  const content = fs.readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
  return forbiddenCopyTerms.some((term) => content.includes(term));
});
const booksModuleSrc = fs.readFileSync(new URL('../src/components/BooksLibraryModule.jsx', import.meta.url), 'utf8');
const tasksTabSrc = fs.readFileSync(new URL('../src/components/TasksTab.jsx', import.meta.url), 'utf8');
check(
  'Ningún componente ni dato demo usa "Libros 3D", "Libro 3D", "Crear libro con IA" ni "Generar libro con IA"',
  !hasForbiddenCopy && !booksModuleSrc.includes('Generar con IA')
);

check(
  'BooksLibraryModule usa "Crear libro" y "Subir libro" / "Cerrar", distingue estado vacío ("No hay libros publicados aún") de filtrado ("No se encontraron libros") y no duplica botones inferiores',
  booksModuleSrc.includes("'Cerrar' : 'Crear libro'") &&
    booksModuleSrc.includes("'Cerrar' : 'Subir libro'") &&
    booksModuleSrc.includes("'No hay libros publicados aún'") &&
    booksModuleSrc.includes("'No se encontraron libros'") &&
    !booksModuleSrc.includes('Publicar primer libro') &&
    tasksTabSrc.includes('Crear libro') &&
    tasksTabSrc.includes('Subir libro')
);

check(
  'BOOK_THEMES usa nombres concisos en español (Índigo, Esmeralda, Carmesí, Ámbar, Pizarra)',
  BOOK_THEMES['royal-indigo'].name === 'Índigo' &&
    BOOK_THEMES['emerald-ledger'].name === 'Esmeralda' &&
    BOOK_THEMES['crimson-oxford'].name === 'Carmesí' &&
    BOOK_THEMES['amber-executive'].name === 'Ámbar' &&
    BOOK_THEMES['slate-modern'].name === 'Pizarra'
);

console.log('\n== 9. Generación de Libros ("Crear libro": Prompt, Parser JSON, Fallback y SVG) ==');
const aiPromptSample = buildBookAiPrompt({
  title: 'Supply Chain & Logistics',
  description: 'Include maritime shipping KPIs and customs vocabulary',
  category: 'case-study',
  pageCount: 6,
  language: 'Bilingüe (EN/ES)',
  author: 'Prof. Camilo'
});
check(
  'buildBookAiPrompt incluye título, descripción, idioma, cantidad de páginas y formato JSON esperado',
  typeof aiPromptSample === 'string' &&
    aiPromptSample.includes('Supply Chain & Logistics') &&
    aiPromptSample.includes('maritime shipping KPIs') &&
    aiPromptSample.includes('6 páginas') &&
    aiPromptSample.includes('Bilingüe') &&
    aiPromptSample.includes('array JSON')
);

const parsedWrapperJson = parseBookAiResponse(
  `\`\`\`json
  {
    "title": "Supply Chain Excellence",
    "description": "Global trade & logistics",
    "pages": [
      { "variant": "cover", "title": "Supply Chain Excellence", "subtitle": "Global Logistics Guide" },
      {
        "variant": "content",
        "chapter": "Chapter 1",
        "title": "Container Shipping & Incoterms",
        "subtitle": "FOB, CIF and DDP rules",
        "body": ["Incoterms define responsibilities of buyers and sellers in international transactions."],
        "bullets": ["FOB: Free On Board", "CIF: Cost, Insurance and Freight"],
        "stats": [{ "label": "Global Trade by Sea", "value": "80%+" }],
        "calloutTitle": "Key Term",
        "calloutText": "Bill of Lading (B/L) is the legal contract of carriage."
      },
      { "variant": "back-cover", "title": "Supply Chain Excellence", "subtitle": "End of guide" }
    ]
  }
  \`\`\``,
  { fallbackTitle: 'Default Title', author: 'Prof. Camilo' }
);
check(
  'parseBookAiResponse parsea JSON envuelto en markdown con portada, contenido enriquecido y contraportada',
  Array.isArray(parsedWrapperJson) &&
    parsedWrapperJson.length === 3 &&
    parsedWrapperJson[0].variant === 'cover' &&
    parsedWrapperJson[0].title === 'Supply Chain Excellence' &&
    parsedWrapperJson[1].variant === 'content' &&
    parsedWrapperJson[1].stats.length === 1 &&
    parsedWrapperJson[2].variant === 'back-cover'
);

const parsedDirectArray = parseBookAiResponse(
  JSON.stringify([
    { title: 'Direct Array Book', subtitle: 'Sub' },
    { title: 'Unit 1: Basics', body: ['Paragraph 1', 'Paragraph 2'], bullets: ['Point A'] },
    { title: 'Closing' }
  ]),
  { fallbackTitle: 'Fallback' }
);
check(
  'parseBookAiResponse acepta un arreglo JSON directo de páginas y asigna cover/content/back-cover',
  Array.isArray(parsedDirectArray) &&
    parsedDirectArray.length === 3 &&
    parsedDirectArray[0].variant === 'cover' &&
    parsedDirectArray[1].variant === 'content' &&
    parsedDirectArray[2].variant === 'back-cover'
);

const parsedTruncated = parseBookAiResponse(
  `{"title": "Truncated Book", "pages": [
    {"variant": "cover", "title": "Truncated Book", "subtitle": "Part 1"},
    {"variant": "content", "title": "Chapter 1", "body": ["Complete object before truncation"]},
    {"variant": "content", "title": "Unfinished chapter", "body": ["Cut off in the middle`,
  { fallbackTitle: 'Truncated' }
);
check(
  'parseBookAiResponse recupera páginas válidas cuando la respuesta JSON se trunca y añade contraportada automática',
  Array.isArray(parsedTruncated) &&
    parsedTruncated.length === 3 &&
    parsedTruncated[0].variant === 'cover' &&
    parsedTruncated[1].title === 'Chapter 1' &&
    parsedTruncated[2].variant === 'back-cover'
);

check(
  'parseBookAiResponse devuelve null ante entradas vacías o texto sin JSON válido',
  parseBookAiResponse('') === null &&
    parseBookAiResponse(null) === null &&
    parseBookAiResponse('Lo siento, no pude generar el JSON solicitado.') === null
);

const normalizedPageEdge = normalizeBookOutlinePage(
  {
    title: '  Page Title  ',
    body: 'Single string body instead of array',
    bullets: ['Bullet 1', '', null, 'Bullet 2'],
    stats: [{ label: 'Metric', value: 99 }]
  },
  1,
  4,
  { fallbackTitle: 'Book', author: 'Author' }
);
check(
  'normalizeBookOutlinePage convierte body string en arreglo, filtra viñetas vacías y normaliza stats',
  normalizedPageEdge.variant === 'content' &&
    normalizedPageEdge.title === 'Page Title' &&
    Array.isArray(normalizedPageEdge.body) &&
    normalizedPageEdge.body[0] === 'Single string body instead of array' &&
    normalizedPageEdge.bullets.length === 2 &&
    normalizedPageEdge.stats[0].value === '99'
);

const fallbackOutlineEn = buildFallbackBookOutline({
  title: 'Corporate Finance Essentials',
  description: 'Cash flow, EBITDA and valuation ratios',
  pageCount: 6,
  language: 'Inglés',
  author: 'Prof. Camilo'
});
const fallbackOutlineEs = buildFallbackBookOutline({
  title: 'Fundamentos de Comercio Exterior',
  pageCount: 5,
  language: 'Español',
  author: 'Prof. Camilo'
});
check(
  'buildFallbackBookOutline genera la cantidad exacta de páginas solicitadas (portada + capítulos + contraportada) en inglés o español',
  fallbackOutlineEn.length === 6 &&
    fallbackOutlineEn[0].variant === 'cover' &&
    fallbackOutlineEn[5].variant === 'back-cover' &&
    fallbackOutlineEs.length === 5 &&
    fallbackOutlineEs[0].variant === 'cover' &&
    fallbackOutlineEs[4].variant === 'back-cover'
);

const extractedTexts = extractBookOutlinePageTexts(fallbackOutlineEn);
check(
  'extractBookOutlinePageTexts extrae textos indexables por página para el buscador de la biblioteca',
  Array.isArray(extractedTexts) &&
    extractedTexts.length === 6 &&
    extractedTexts[0].includes('Corporate Finance Essentials')
);

const generatedWithMockAi = await generateAiBookPages({
  title: 'Monetary Policy & Central Banks',
  description: 'Interest rates and inflation targeting',
  category: 'textbook',
  pageCount: 5,
  language: 'Inglés',
  themeId: 'emerald-ledger',
  author: 'Prof. Camilo',
  callGemini: async () =>
    JSON.stringify({
      title: 'Monetary Policy & Central Banks',
      description: 'Interest rates and inflation targeting',
      pages: [
        { variant: 'cover', title: 'Monetary Policy & Central Banks', subtitle: 'Executive Edition' },
        { variant: 'content', chapter: 'Unit 1', title: 'Interest Rates', body: ['Central banks adjust benchmark rates.'] },
        { variant: 'content', chapter: 'Unit 2', title: 'Open Market Operations', body: ['Buying and selling government bonds.'] },
        { variant: 'content', chapter: 'Unit 3', title: 'Reserve Requirements', body: ['Liquidity ratios for commercial banks.'] },
        { variant: 'back-cover', title: 'Monetary Policy & Central Banks', subtitle: 'End of book' }
      ]
    })
});
check(
  'generateAiBookPages usa callGemini cuando está disponible y construye páginas SVG ilustradas + pageTexts',
  generatedWithMockAi.usedFallback === false &&
    generatedWithMockAi.pages.length === 5 &&
    generatedWithMockAi.pageTexts.length === 5 &&
    generatedWithMockAi.pages.every((p) => p.startsWith('data:image/svg+xml;charset=utf-8,'))
);

const generatedWithFallback = await generateAiBookPages({
  title: 'Fallback AI Book',
  pageCount: 6,
  language: 'Bilingüe',
  themeId: 'crimson-oxford',
  callGemini: async () => {
    throw new Error('Simulated network error');
  }
});
check(
  'generateAiBookPages hace fallback automático a buildFallbackBookOutline si callGemini falla o no retorna JSON válido',
  generatedWithFallback.usedFallback === true &&
    generatedWithFallback.pages.length === 6 &&
    generatedWithFallback.pageTexts.length === 6 &&
    generatedWithFallback.pages.every((p) => p.startsWith('data:image/svg+xml;charset=utf-8,'))
);

console.log('\n== 10. Limpieza HTML (RichVisualEditor), Sincronización de Outline y Persistencia ==');
check(
  'stripBookHtml elimina etiquetas HTML y decodifica entidades (&nbsp;, &amp;, &quot;, &#39;)',
  stripBookHtml('<p>Focus on <strong>KPIs</strong> &amp; cash&nbsp;flow</p>') === 'Focus on KPIs & cash flow' &&
    stripBookHtml('<div>Line 1<br/>Line 2 &quot;quoted&quot; &#39;ok&#39;</div>') === 'Line 1 Line 2 "quoted" \'ok\''
);

const syncedOutline = syncBookOutlineMetadata(fallbackOutlineEn, {
  title: 'Updated Finance Title 2026',
  description: '<p>Updated executive summary</p>',
  author: 'Prof. New'
});
check(
  'syncBookOutlineMetadata actualiza título, subtítulo limpio y autor en portada y contraportada',
  syncedOutline.length === fallbackOutlineEn.length &&
    syncedOutline[0].title === 'Updated Finance Title 2026' &&
    syncedOutline[0].subtitle === 'Updated executive summary' &&
    syncedOutline[0].author === 'Prof. New' &&
    syncedOutline[syncedOutline.length - 1].title === 'Updated Finance Title 2026'
);

const sanitizedWithOutline = sanitizeBookForFirestore({
  id: 'book_outline_test',
  title: 'Outline Driven Book',
  description: '<p>Rich text <b>description</b> &nbsp;cleaned</p>',
  theme: 'amber-executive',
  bookPages: [],
  bookOutline: syncedOutline
});
check(
  'sanitizeBookForFirestore limpia HTML en description, conserva bookOutline y reconstruye bookPages desde bookOutline si bookPages está vacío',
  sanitizedWithOutline.description === 'Rich text description cleaned' &&
    Array.isArray(sanitizedWithOutline.bookOutline) &&
    sanitizedWithOutline.bookOutline.length === 6 &&
    sanitizedWithOutline.bookPages.length === 6 &&
    sanitizedWithOutline.pageTexts.length === 6 &&
    decodeURIComponent(sanitizedWithOutline.bookPages[0]).includes('Updated Finance Title') &&
    decodeURIComponent(sanitizedWithOutline.bookPages[0]).includes('2026')
);

check(
  'DEMO_BOOKS incluye bookOutline en los libros demo para permitir edición de tema y título en vivo',
  DEMO_BOOKS.every((b) => Array.isArray(b.bookOutline) && b.bookOutline.length === b.bookPages.length)
);

check(
  'BooksLibraryModule y TasksTab aíslan el cambio de modo (handleSwitchCreationMode / handleSwitchBook3dMode) y persisten bookOutline',
  booksModuleSrc.includes('handleSwitchCreationMode') &&
    tasksTabSrc.includes('handleSwitchBook3dMode') &&
    booksModuleSrc.includes('bookOutline: sanitizedBook.bookOutline') &&
    tasksTabSrc.includes('bookOutline: sanitizedBook.bookOutline')
);

console.log('\n== 11. Scroll Completo al Hacer Zoom y Vista Móvil Cómoda (Flipbook3DModal) ==');
const flipbookModalSrc = fs.readFileSync(new URL('../src/components/Flipbook3DModal.jsx', import.meta.url), 'utf8');
check(
  'Flipbook3DModal usa contenedor scrollable con m-auto shrink-0 y dimensiona el layout por zoom para permitir scroll a todos los bordes sin recortar la parte superior/izquierda',
  flipbookModalSrc.includes('ref={stageScrollRef}') &&
    flipbookModalSrc.includes('m-auto shrink-0') &&
    flipbookModalSrc.includes('* ${zoom}') &&
    flipbookModalSrc.includes('panState')
);
check(
  'Flipbook3DModal optimiza la vista móvil (92vw/76vh, controles de zoom accesibles en móvil y flechas flotantes ocultas en pantallas pequeñas o con zoom)',
  flipbookModalSrc.includes('min(92vw, 520px)') &&
    flipbookModalSrc.includes('min(76vh, 720px)') &&
    flipbookModalSrc.includes('zoom <= 1.05') &&
    flipbookModalSrc.includes('hidden sm:flex')
);

console.log('\n== 12. Editor Tipo Documento Word ("Crear libro") e Imágenes en Páginas ==');
const wordEditorSrc = fs.readFileSync(new URL('../src/components/BookWordEditor.jsx', import.meta.url), 'utf8');
check(
  'BookWordEditor está integrado en BooksLibraryModule y TasksTab para editar páginas e insertar imágenes antes de publicar',
  booksModuleSrc.includes('<BookWordEditor') &&
    tasksTabSrc.includes('<BookWordEditor') &&
    wordEditorSrc.includes('handleFieldChange') &&
    wordEditorSrc.includes('handleInsertNewPage') &&
    wordEditorSrc.includes('handleDeletePage') &&
    wordEditorSrc.includes('triggerImageUpload')
);

const editedOutline = updateBookOutlinePage(
  fallbackOutlineEn,
  1,
  {
    title: 'Edited Chapter Title',
    body: ['Custom paragraph 1', 'Custom paragraph 2'],
    imageUrl: 'https://example.com/chart.png',
    imageCaption: 'Figure 1: Revenue Growth'
  },
  { defaultTitle: 'Corporate Finance Essentials', author: 'Prof. Camilo' }
);
const renderedEditedPages = buildBookPagesFromOutline(editedOutline, {
  themeId: 'royal-indigo',
  author: 'Prof. Camilo'
});
const decodedEditedPage1 = decodeURIComponent(renderedEditedPages[1].replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
check(
  'updateBookOutlinePage actualiza título, párrafos e imagen de una página y buildBookPagesFromOutline incrusta <image> y pie de foto en el SVG',
  editedOutline[1].title === 'Edited Chapter Title' &&
    editedOutline[1].imageUrl === 'https://example.com/chart.png' &&
    editedOutline[1].imageCaption === 'Figure 1: Revenue Growth' &&
    decodedEditedPage1.includes('<image href="https://example.com/chart.png"') &&
    decodedEditedPage1.includes('Figure 1: Revenue Growth')
);

const outlineWithInsertedPage = insertBookOutlinePage(
  editedOutline,
  1,
  {
    chapter: 'CHAPTER 2B',
    title: 'Inserted Case Analysis',
    body: ['New custom section added by teacher.']
  },
  { defaultTitle: 'Corporate Finance Essentials', author: 'Prof. Camilo' }
);
check(
  'insertBookOutlinePage inserta una nueva página editable en la posición indicada manteniendo portada al inicio y contraportada al final',
  outlineWithInsertedPage.length === editedOutline.length + 1 &&
    outlineWithInsertedPage[0].variant === 'cover' &&
    outlineWithInsertedPage[2].title === 'Inserted Case Analysis' &&
    outlineWithInsertedPage[outlineWithInsertedPage.length - 1].variant === 'back-cover'
);

const outlineAfterRemove = removeBookOutlinePage(outlineWithInsertedPage, 2, {
  defaultTitle: 'Corporate Finance Essentials',
  author: 'Prof. Camilo'
});
const minThreeOutline = [
  { variant: 'cover', title: 'Min Book' },
  { variant: 'content', title: 'Only Chapter', body: ['Text'] },
  { variant: 'back-cover', title: 'Min Book' }
];
const outlineCannotRemoveBelow3 = removeBookOutlinePage(minThreeOutline, 1, { defaultTitle: 'Min Book' });
check(
  'removeBookOutlinePage elimina páginas de contenido pero protege el mínimo de 3 páginas (portada + 1 capítulo + contraportada)',
  outlineAfterRemove.length === editedOutline.length &&
    outlineCannotRemoveBelow3.length === 3
);

console.log('\n== 13. Compresión Ligera e Inteligente de PDF (computeSmartPdfCompressionProfile) ==');
const lightPdfProfile = computeSmartPdfCompressionProfile({
  fileSizeBytes: 800 * 1024, // 0.8 MB
  pageCount: 6,
  scale: 1.55,
  maxDimension: 1320,
  quality: 0.82
});
const mediumPdfProfile = computeSmartPdfCompressionProfile({
  fileSizeBytes: 4.5 * 1024 * 1024, // 4.5 MB
  pageCount: 16
});
const heavyPdfProfile = computeSmartPdfCompressionProfile({
  fileSizeBytes: 15 * 1024 * 1024, // 15 MB
  pageCount: 40
});
check(
  'computeSmartPdfCompressionProfile aplica compresión ligera e inteligente según peso/páginas manteniendo nitidez (maxDimension >= 1160 y quality >= 0.70)',
  lightPdfProfile.tier === 'high-clarity' &&
    lightPdfProfile.maxDimension >= 1280 &&
    lightPdfProfile.quality >= 0.80 &&
    mediumPdfProfile.tier === 'light-balanced' &&
    mediumPdfProfile.maxDimension >= 1220 &&
    mediumPdfProfile.quality >= 0.76 &&
    heavyPdfProfile.tier === 'smart-compact' &&
    heavyPdfProfile.maxDimension >= 1160 &&
    heavyPdfProfile.quality >= 0.72 &&
    heavyPdfProfile.adaptiveStepDownQuality >= 0.70
);

console.log('\n== 14. Portada Personalizada en "Crear libro" y "Subir libro" ==');
const customCoverSample = 'https://cdn.example.com/custom-book-cover.jpg';
const pagesWithCustomCover = applyCustomCoverToPages(renderedEditedPages, customCoverSample);
const outlinePagesWithCustomCover = buildBookPagesFromOutline(editedOutline, {
  themeId: 'emerald-ledger',
  author: 'Prof. Camilo',
  customCoverUrl: customCoverSample
});
const sanitizedCustomCoverBook = sanitizeBookForFirestore({
  id: 'book_custom_cover',
  title: 'Custom Cover Book',
  customCoverUrl: customCoverSample,
  bookOutline: editedOutline,
  bookPages: []
});
const normalizedCustomCoverBook = normalizeBookRecord(sanitizedCustomCoverBook);
check(
  'applyCustomCoverToPages, buildBookPagesFromOutline, sanitizeBookForFirestore y normalizeBookRecord aplican y conservan customCoverUrl en la portada (pages[0] y coverUrl)',
  pagesWithCustomCover[0] === customCoverSample &&
    pagesWithCustomCover.length === renderedEditedPages.length &&
    outlinePagesWithCustomCover[0] === customCoverSample &&
    sanitizedCustomCoverBook.customCoverUrl === customCoverSample &&
    sanitizedCustomCoverBook.coverUrl === customCoverSample &&
    sanitizedCustomCoverBook.bookPages[0] === customCoverSample &&
    normalizedCustomCoverBook.customCoverUrl === customCoverSample &&
    normalizedCustomCoverBook.coverUrl === customCoverSample &&
    booksModuleSrc.includes('Portada personalizada') &&
    tasksTabSrc.includes('Portada personalizada')
);

console.log('\n== 15. Marcadores de Página Individuales por Usuario y Progreso de Lectura ==');
const studentAKey = resolveBookReaderUserKey({ uid: 'student_alpha_123', name: 'Ana' });
const studentBKey = resolveBookReaderUserKey({ uid: 'student_beta_456', name: 'Carlos' });
check(
  'resolveBookReaderUserKey genera claves únicas y estables por usuario y aísla sus claves de almacenamiento por libro',
  studentAKey !== studentBKey &&
    getBookBookmarksStorageKey('book_macro_1', studentAKey) !== getBookBookmarksStorageKey('book_macro_1', studentBKey) &&
    getBookBookmarksStorageKey('book_macro_1', studentAKey) !== getBookBookmarksStorageKey('book_macro_2', studentAKey)
);

const bmToggle1 = toggleUserBookBookmark('book_macro_1', studentAKey, 2, { totalPages: 8 });
const bmToggle2 = toggleUserBookBookmark('book_macro_1', studentAKey, 5, { totalPages: 8 });
const bmStudentB = toggleUserBookBookmark('book_macro_1', studentBKey, 1, { totalPages: 8 });
saveUserBookLastPage('book_macro_1', studentAKey, 4, { totalPages: 8 });
saveUserBookLastPage('book_macro_1', studentBKey, 6, { totalPages: 8 });

const loadedStudentA = loadUserBookBookmarks('book_macro_1', studentAKey);
const loadedStudentB = loadUserBookBookmarks('book_macro_1', studentBKey);
const bmToggleRemove = toggleUserBookBookmark('book_macro_1', studentAKey, 2, { totalPages: 8 });

check(
  'toggleUserBookBookmark, saveUserBookLastPage y loadUserBookBookmarks guardan, ordenan, desmarcan y aíslan marcadores y última página por cada usuario y libro',
  bmToggle1.isBookmarked === true &&
    bmToggle2.isBookmarked === true &&
    loadedStudentA.bookmarks.length === 2 &&
    loadedStudentA.bookmarks[0] === 2 &&
    loadedStudentA.bookmarks[1] === 5 &&
    loadedStudentA.lastPage === 4 &&
    bmStudentB.isBookmarked === true &&
    loadedStudentB.bookmarks.length === 1 &&
    loadedStudentB.bookmarks[0] === 1 &&
    loadedStudentB.lastPage === 6 &&
    bmToggleRemove.isBookmarked === false &&
    bmToggleRemove.bookmarks.length === 1 &&
    bmToggleRemove.bookmarks[0] === 5
);
check(
  'Flipbook3DModal incluye cinta interactiva de marcador en la esquina de cada página y panel desplegable "Mis marcadores"',
  flipbookModalSrc.includes('data-bookmark-ribbon="true"') &&
    flipbookModalSrc.includes('handleToggleBookmark') &&
    flipbookModalSrc.includes('activeBookmarkTargetPageIndex') &&
    flipbookModalSrc.includes('Mis marcadores')
);

console.log('\n== 16. Pruebas de Regresión: Edición en Vivo, Contraportada, Portada IA, Deduplicación Firestore y Overlay SVG ==');
const liveTypingOutline = updateBookOutlinePage(
  fallbackOutlineEn,
  1,
  {
    title: 'Chapter 1 ',
    subtitle: '',
    body: ['First paragraph ', ''],
    bullets: ['Bullet A ', '']
  },
  { defaultTitle: 'Corporate Finance Essentials', author: 'Prof. Camilo' }
);
check(
  'updateBookOutlinePage conserva espacios finales y elementos vacíos durante la escritura en vivo en BookWordEditor',
  liveTypingOutline[1].title === 'Chapter 1 ' &&
    liveTypingOutline[1].subtitle === '' &&
    liveTypingOutline[1].body.length === 2 &&
    liveTypingOutline[1].body[0] === 'First paragraph ' &&
    liveTypingOutline[1].body[1] === '' &&
    liveTypingOutline[1].bullets.length === 2 &&
    liveTypingOutline[1].bullets[0] === 'Bullet A ' &&
    liveTypingOutline[1].bullets[1] === ''
);

const backCoverWithBodySvg = buildIllustratedBookPageSvg({
  variant: 'back-cover',
  title: 'Executive Closing',
  subtitle: 'Subtitle on back cover',
  body: ['Custom closing note paragraph rendered on the back cover.'],
  totalPages: 6,
  themeId: 'royal-indigo'
});
check(
  'buildIllustratedBookPageSvg renderiza párrafos body en la contraportada (variant === "back-cover")',
  decodeURIComponent(backCoverWithBodySvg).includes('Custom closing note paragraph')
);

const aiWithCustomCover = await generateAiBookPages({
  title: 'Custom Cover AI Book',
  pageCount: 4,
  customCoverUrl: 'https://cdn.example.com/ai-cover.jpg',
  callGemini: async () => null
});
check(
  'generateAiBookPages aplica customCoverUrl en pages[0], coverUrl y outline[0].imageUrl',
  aiWithCustomCover.pages[0] === 'https://cdn.example.com/ai-cover.jpg' &&
    aiWithCustomCover.coverUrl === 'https://cdn.example.com/ai-cover.jpg' &&
    aiWithCustomCover.outline[0].imageUrl === 'https://cdn.example.com/ai-cover.jpg'
);

const externalImgOverlay = extractSvgExternalImageOverlay(renderedEditedPages[1]);
check(
  'extractSvgExternalImageOverlay extrae coordenadas porcentuales para imágenes http(s) incrustadas en páginas SVG',
  externalImgOverlay !== null &&
    externalImgOverlay.href === 'https://example.com/chart.png' &&
    externalImgOverlay.widthPct > 50 &&
    externalImgOverlay.heightPct > 10
);

const duplicatePayloadBook = sanitizeBookForFirestore({
  id: 'dup_book',
  title: 'No Duplicate Pages',
  bookPages: hugeInlinePages.slice(0, 6),
  pages: hugeInlinePages.slice(0, 6),
  rawPdfPages: hugeInlinePages.slice(0, 6),
  bookOutline: [
    { variant: 'cover', title: 'No Duplicate Pages', imageUrl: hugeInlinePages[0] },
    { variant: 'content', title: 'Ch 1', body: ['Text'], imageUrl: `data:image/jpeg;base64,${'B'.repeat(90000)}` },
    { variant: 'back-cover', title: 'No Duplicate Pages' }
  ]
});
const serializedDupBook = JSON.stringify(duplicatePayloadBook);
check(
  'sanitizeBookForFirestore elimina propiedades duplicadas (pages, rawPdfPages) y mantiene el documento serializado bajo el presupuesto de Firestore',
  !('pages' in duplicatePayloadBook) &&
    !('rawPdfPages' in duplicatePayloadBook) &&
    serializedDupBook.length < 900000
);

console.log(`\n========================================`);
console.log(`Total pruebas Flipbook 3D: ${okCount + failCount} | OK: ${okCount} | FAIL: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}


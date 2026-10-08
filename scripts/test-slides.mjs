// scripts/test-slides.mjs
// Pruebas unitarias exhaustivas para el Estudio de Diapositivas estilo PowerPoint / Google Slides (slidesEngine.js y demoData.js)

import {
  SLIDE_THEMES,
  SLIDE_FONTS,
  SLIDE_LAYOUT_CATALOG,
  VALID_SLIDE_LAYOUTS,
  SLIDE_TRANSITIONS,
  SLIDE_TRANSITION_GALLERY,
  SLIDE_FONT_SIZES,
  SLIDE_COLOR_SWATCHES,
  SLIDE_HIGHLIGHT_SWATCHES,
  SLIDE_ACADEMIC_BADGES,
  SLIDE_ACADEMIC_ILLUSTRATIONS,
  SLIDE_PATTERNS,
  SLIDE_STARTER_TEMPLATES,
  resolveSlideLayout,
  getSlidePatternStyle,
  cleanHexNoHash,
  resolveTheme,
  createDefaultSlide,
  convertSlideLayout,
  clampElementRect,
  createCanvasElement,
  getDefaultFieldStyleMeta,
  getFieldTextStyle,
  updateFieldTextStyle,
  clearFieldTextStyle,
  shiftFieldTextStylesOnDelete,
  buildInlineTextStyle,
  transformTextCase,
  getSlideFieldTextValue,
  setSlideFieldTextValue,
  listSlideEditableFields,
  buildDeckAiPrompt,
  normalizeSingleSlide,
  parseDeckAiResponse,
  buildSingleSlideAiPrompt,
  parseSingleSlideAiResponse,
  buildFallbackAiSlides,
  getTableRows,
  sanitizeSlidesForFirestore,
  hydrateSlidesFromFirestore
} from '../src/utils/slidesEngine.js';

import { DEMO_REVIEWS } from '../src/utils/demoData.js';

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

console.log('\n== 1. Catálogo de Temas, Fuentes, Diseños y Transiciones ==');
check('8 temas visuales definidos', Object.keys(SLIDE_THEMES).length === 8 && !!SLIDE_THEMES.unipamplona && !!SLIDE_THEMES.midnight);
check('5 familias tipográficas definidas con mapeo CSS y PPTX', Object.keys(SLIDE_FONTS).length === 5 && SLIDE_FONTS.sans.pptx === 'Arial');
check('11 diseños (layouts) estilo PowerPoint/Google Slides definidos', SLIDE_LAYOUT_CATALOG.length === 11 && VALID_SLIDE_LAYOUTS.has('two_columns') && VALID_SLIDE_LAYOUTS.has('table'));
check('5 transiciones base, 8 transiciones en galería y 4 patrones definidos', SLIDE_TRANSITIONS.length === 5 && SLIDE_TRANSITION_GALLERY.length === 8 && SLIDE_PATTERNS.length === 4);
check('4 plantillas iniciales definidas y generan diapositivas válidas', SLIDE_STARTER_TEMPLATES.length === 4 && SLIDE_STARTER_TEMPLATES.every(t => Array.isArray(t.buildSlides('Test')) && t.buildSlides('Test').length >= 3));
check('Paletas de colores, resaltados, tamaños de fuente e ilustraciones académicas disponibles',
  SLIDE_FONT_SIZES.length >= 10 &&
  SLIDE_COLOR_SWATCHES.length >= 12 &&
  SLIDE_HIGHLIGHT_SWATCHES.length >= 6 &&
  SLIDE_ACADEMIC_BADGES.length >= 6 &&
  SLIDE_ACADEMIC_ILLUSTRATIONS.length === 6 &&
  SLIDE_ACADEMIC_ILLUSTRATIONS.every(ill => ill.dataUrl.startsWith('data:image/svg+xml;utf8,'))
);

console.log('\n== 2. Compatibilidad Hacia Atrás (resolveSlideLayout & DEMO_REVIEWS) ==');
check('resolveSlideLayout maneja nulo/indefinido devolviendo cards', resolveSlideLayout(null) === 'cards' && resolveSlideLayout(undefined) === 'cards');
check('resolveSlideLayout infiere title en idx 0 legado sin cards/bullets/quiz', resolveSlideLayout({ title: 'Portada Legada', subtitle: 'Sub' }, 0) === 'title');
check('resolveSlideLayout infiere quiz por type=quiz o arreglo options', resolveSlideLayout({ type: 'quiz', question: 'Q?' }, 2) === 'quiz' && resolveSlideLayout({ options: [{ text: 'A' }] }, 1) === 'quiz');
check('resolveSlideLayout infiere bullets cuando existe arreglo bullets', resolveSlideLayout({ title: 'Lista', bullets: ['A', 'B'] }, 1) === 'bullets');
check('resolveSlideLayout infiere two_columns, table, image_text y quote',
  resolveSlideLayout({ leftColumn: { title: 'A' } }, 1) === 'two_columns' &&
  resolveSlideLayout({ table: { rows: [['1', '2']] } }, 1) === 'table' &&
  resolveSlideLayout({ imageUrl: 'http://x/a.png', body: 'Texto' }, 1) === 'image_text' &&
  resolveSlideLayout({ quoteText: 'Cita celebre' }, 1) === 'quote'
);
check('DEMO_REVIEWS conserva sus 3 presentaciones y todas sus diapositivas resuelven layouts válidos',
  Array.isArray(DEMO_REVIEWS) &&
  DEMO_REVIEWS.length === 3 &&
  DEMO_REVIEWS.every(rev => Array.isArray(rev.slides) && rev.slides.every((s, idx) => VALID_SLIDE_LAYOUTS.has(resolveSlideLayout(s, idx))))
);

console.log('\n== 3. Creación y Conversión Sin Pérdida entre los 11 Diseños ==');
for (const layoutObj of SLIDE_LAYOUT_CATALOG) {
  const s = createDefaultSlide(layoutObj.id, 1);
  check(`createDefaultSlide('${layoutObj.id}') genera estructura completa`, s.layout === layoutObj.id && Array.isArray(s.elements));
}

const initialCardsSlide = {
  id: 's_conv_1',
  layout: 'cards',
  title: 'Indicadores Clave',
  speakerNotes: 'Nota original del docente',
  elements: [createCanvasElement('badge', { text: 'IMPORTANTE' })],
  cards: [
    { title: 'PIB (GDP)', text: 'Valor monetario total', example: 'El PIB creció 3%' },
    { title: 'Inflación (CPI)', text: 'Aumento general de precios', example: 'IPC anual del 5%' }
  ]
};

const asBullets = convertSlideLayout(initialCardsSlide, 'bullets', 1);
check('convertSlideLayout cards -> bullets preserva ítems, notas y elementos libres',
  asBullets.layout === 'bullets' &&
  asBullets.bullets.length === 2 &&
  asBullets.bullets[0].title === 'PIB (GDP)' &&
  asBullets.speakerNotes === 'Nota original del docente' &&
  asBullets.elements.length === 1
);

const asTwoCols = convertSlideLayout(asBullets, 'two_columns', 1);
check('convertSlideLayout bullets -> two_columns mapea primer y segundo punto a leftColumn y rightColumn',
  asTwoCols.layout === 'two_columns' &&
  asTwoCols.leftColumn?.title === 'PIB (GDP)' &&
  asTwoCols.rightColumn?.title === 'Inflación (CPI)'
);

const asTable = convertSlideLayout(initialCardsSlide, 'table', 1);
check('convertSlideLayout cards -> table construye filas desde las tarjetas',
  asTable.layout === 'table' &&
  Array.isArray(asTable.table?.headers) &&
  asTable.table?.rows?.length === 2 &&
  asTable.table.rows[0][0] === 'PIB (GDP)'
);

const asQuiz = convertSlideLayout(initialCardsSlide, 'quiz', 1);
check('convertSlideLayout cards -> quiz asigna type=quiz, question y opciones con 1 correcta',
  asQuiz.layout === 'quiz' &&
  asQuiz.type === 'quiz' &&
  Array.isArray(asQuiz.options) &&
  asQuiz.options.some(o => o.isCorrect)
);

const backToCards = convertSlideLayout(asQuiz, 'cards', 1);
check('convertSlideLayout quiz -> cards elimina type=quiz',
  backToCards.layout === 'cards' && backToCards.type === undefined
);

// Prueba de viaje de ida y vuelta (round-trip) con edición intermedia
const editedBullets = {
  ...asBullets,
  bullets: [
    { title: 'Tasa de Interés', text: 'Costo del dinero en el tiempo', example: '4.5% anual' },
    { title: 'Balanza Comercial', text: 'Exportaciones menos importaciones', example: 'Superávit' }
  ]
};
const roundTripCards = convertSlideLayout(editedBullets, 'cards', 1);
check('convertSlideLayout round-trip (cards -> bullets -> edit -> cards) preserva ediciones recientes',
  roundTripCards.layout === 'cards' &&
  roundTripCards.cards[0].title === 'Tasa de Interés' &&
  roundTripCards.cards[1].title === 'Balanza Comercial'
);

const editedCardsForTable = {
  ...asTable,
  layout: 'cards',
  cards: [
    { title: 'Arancel', text: 'Impuesto a importaciones', example: '10% ad valorem' }
  ]
};
const roundTripTable = convertSlideLayout(editedCardsForTable, 'table', 1);
check('convertSlideLayout round-trip (table -> cards -> edit -> table) actualiza filas de la tabla con las tarjetas editadas',
  roundTripTable.layout === 'table' &&
  roundTripTable.table.rows[0][0] === 'Arancel'
);

console.log('\n== 4. Objetos Libres del Lienzo 16:9 (Canvas Elements) y Límites ==');
const tb = createCanvasElement('textbox', { x: 10, y: 15, w: 40, h: 20, text: 'Hola Clase', underline: true, strikethrough: true, fontFamily: 'serif' });
const sh = createCanvasElement('shape', { shapeType: 'circle', fill: '#1D4ED8' });
const nt = createCanvasElement('note', { text: 'Recordar tarea' });
const im = createCanvasElement('image', { x: 200, y: -50, w: 2, h: 150 });
const zeroEl = createCanvasElement('textbox', { x: 0, y: 0, w: 0, h: 0, id: undefined, type: 'malicioso' });

check('createCanvasElement crea textbox, shape, note e image con IDs únicos y propiedades extendidas de fuente',
  tb.type === 'textbox' && sh.type === 'shape' && nt.type === 'note' && im.type === 'image' && tb.id !== sh.id &&
  tb.underline === true && tb.strikethrough === true && tb.fontFamily === 'serif'
);
check('clampElementRect restringe coordenadas fuera de rango y tamaños mínimos',
  im.w >= 6 && im.w <= 100 && im.h >= 5 && im.h <= 100 && im.x <= 95 && im.y >= -5
);
check('clampElementRect y createCanvasElement preservan x=0, y=0 y protegen id/type',
  zeroEl.x === 0 && zeroEl.y === 0 && zeroEl.w === 6 && zeroEl.h === 5 && Boolean(zeroEl.id) && zeroEl.type === 'textbox'
);

console.log('\n== 5. Resolución de Temas y Colores PPTX ==');
check('cleanHexNoHash normaliza colores hexadecimales de 3 y 6 dígitos',
  cleanHexNoHash('#ad3333') === 'AD3333' &&
  cleanHexNoHash('#f0a') === 'FF00AA' &&
  cleanHexNoHash('invalido', '1E293B') === '1E293B'
);
const customResolved = resolveTheme({ theme: 'ocean', fontFamily: 'serif' }, { bgColor: '#112233', accentColor: '#445566' }, 'light');
check('resolveTheme aplica overrides de color por diapositiva y fuente PPTX',
  customResolved.bg === '#112233' &&
  customResolved.pptxBg === '112233' &&
  customResolved.pptxPrimary === '445566' &&
  customResolved.pptxFont === 'Georgia'
);
check('getSlidePatternStyle genera estilos para dots, grid y diagonal',
  !!getSlidePatternStyle('dots').backgroundImage &&
  !!getSlidePatternStyle('grid').backgroundImage &&
  !!getSlidePatternStyle('diagonal').backgroundImage &&
  Object.keys(getSlidePatternStyle('none')).length === 0
);

console.log('\n== 6. Motor IA de Diapositivas (Prompts, Parseo Robusto y Fallback) ==');
const deckPrompt = buildDeckAiPrompt({
  topic: 'First vs Second Conditional',
  language: 'Inglés',
  slideCount: 6,
  focusMode: 'grammar',
  extraNotes: 'Incluir ejemplos de negocios'
});
check('buildDeckAiPrompt incluye tema, idioma, cantidad y notas adicionales',
  deckPrompt.includes('First vs Second Conditional') &&
  deckPrompt.includes('Inglés') &&
  deckPrompt.includes('6 diapositivas') &&
  deckPrompt.includes('Incluir ejemplos de negocios')
);

const sampleAiJson = `Aquí tienes la presentación solicitada [4 diapositivas]:
\`\`\`json
[
  { "layout": "title", "title": "Conditionals in Business", "subtitle": "First & Second Conditional" },
  { "layout": "two_columns", "title": "Comparison", "leftColumn": { "title": "First Conditional", "text": "Real possibilities", "items": ["If + Present, will + verb", { "title": "Usage", "text": "High probability" }] }, "rightColumn": { "title": "Second Conditional", "text": "Hypothetical scenarios", "items": ["If + Past, would + verb"] } },
  { "layout": "table", "title": "Structure Table", "table": { "headers": ["Type", "Formula", "Example"], "rows": [["1st", "If + Pres, will", "If sales rise, we will expand"], { "col1": "2nd", "col2": "If + Past, would", "col3": "If I were CEO, I would invest" }] } },
  { "layout": "quiz", "title": "Check", "question": "Which is First Conditional?", "options": [{ "text": "If it rains, I stay", "isCorrect": false }, { "text": "If costs fall, profits will rise", "isCorrect": false }] }
]
\`\`\`
Espero que te sirva [Fin].`;

const parsedDeck = parseDeckAiResponse(sampleAiJson);
check('parseDeckAiResponse limpia bloques markdown y corchetes en preámbulo extrayendo las 4 diapositivas', Array.isArray(parsedDeck) && parsedDeck.length === 4);
check('parseDeckAiResponse preserva layouts two_columns y table sin producir [object Object]',
  parsedDeck[1].layout === 'two_columns' &&
  !parsedDeck[1].leftColumn.items.some(i => i.includes('[object Object]')) &&
  parsedDeck[2].layout === 'table' &&
  !parsedDeck[2].table.rows.flat().some(c => c.includes('[object Object]'))
);
check('parseDeckAiResponse garantiza al menos 1 opción correcta en quiz si la IA olvidó marcarla', parsedDeck[3].options.some(o => o.isCorrect));
check('parseDeckAiResponse maneja texto corrupto devolviendo null', parseDeckAiResponse('texto sin json {{{') === null && parseDeckAiResponse('') === null);

const singlePrompt = buildSingleSlideAiPrompt({
  action: 'to_table',
  language: 'Español',
  currentSlide: initialCardsSlide,
  presentationTopic: 'Economía'
});
check('buildSingleSlideAiPrompt construye instrucciones de transformación', singlePrompt.includes('table') && singlePrompt.includes('PIB (GDP)'));

const parsedSingle = parseSingleSlideAiResponse('Nota {previa}: ```json\n{ "layout": "quote", "title": "Regla", "quoteText": "Exportar impulsa el PIB", "statValue": "+12%" }\n```', 2);
check('parseSingleSlideAiResponse parsea y normaliza diapositiva individual aunque haya llaves en el preámbulo', parsedSingle && parsedSingle.layout === 'quote' && parsedSingle.statValue === '+12%');

const fallbackSlides = buildFallbackAiSlides({ topic: 'International Trade', language: 'Inglés', slideCount: 6 });
check('buildFallbackAiSlides genera la cantidad exacta con variedad de layouts (title, cards, two_columns, table, bullets, quiz)',
  fallbackSlides.length === 6 &&
  fallbackSlides[0].layout === 'title' &&
  fallbackSlides.some(s => s.layout === 'two_columns') &&
  fallbackSlides.some(s => s.layout === 'table') &&
  fallbackSlides[fallbackSlides.length - 1].layout === 'quiz'
);

console.log('\n== 7. Publicación en Muro de Evaluaciones y Diapositivas ==');
import fs from 'node:fs';
import path from 'node:path';
const rootDir = process.cwd();
const reviewsSrc = fs.readFileSync(path.join(rootDir, 'src/components/ReviewsModule.jsx'), 'utf8');
const taskCardSrc = fs.readFileSync(path.join(rootDir, 'src/components/TaskCard.jsx'), 'utf8');
const tasksTabSrc = fs.readFileSync(path.join(rootDir, 'src/components/TasksTab.jsx'), 'utf8');
const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');

check('ReviewsModule exporta SlideCanvasSurface, SlidePresenterViewer y exportReviewToPresentation y publica rev_wall_ en tasks',
  reviewsSrc.includes('export const SlideCanvasSurface') &&
  reviewsSrc.includes('export const SlidePresenterViewer') &&
  reviewsSrc.includes('export const exportReviewToPresentation') &&
  reviewsSrc.includes('rev_wall_${newDoc.id}') &&
  reviewsSrc.includes('buildCleanSlideWallDesc') &&
  reviewsSrc.includes('initialEditingPresentation.openCreate')
);

check('TaskCard implementa tarjetas personalizadas de Evaluación y Diapositivas con vista previa 16:9, visor en vivo, matching de studentId/studentEmail y estado cancelled_tab_change',
  taskCardSrc.includes("const isEvaluation = task?.type === 'evaluation'") &&
  taskCardSrc.includes("const isSlides = task?.type === 'slides'") &&
  taskCardSrc.includes('<SlideCanvasSurface') &&
  taskCardSrc.includes('<SlidePresenterViewer') &&
  taskCardSrc.includes('Presentar evaluación') &&
  taskCardSrc.includes('Ver resultados y entregas') &&
  taskCardSrc.includes('isSynthesizedFeedItem') &&
  taskCardSrc.includes('g.studentId') &&
  taskCardSrc.includes('g.studentEmail') &&
  taskCardSrc.includes("myEvalGrade?.status === 'cancelled_tab_change'") &&
  taskCardSrc.includes('isDeletedFromWall: true')
);

check('TasksTab fusiona evaluaciones activas y diapositivas en combinedTasks sin duplicar y filtra archivadas/eliminadas (isDeletedFromWall)',
  tasksTabSrc.includes('eval_wall_${ev.id}') &&
  tasksTabSrc.includes('rev_wall_${rev.id}') &&
  tasksTabSrc.includes('isSynthesizedFeedItem: true') &&
  tasksTabSrc.includes('t.isDeletedFromWall') &&
  tasksTabSrc.includes('isPlaceholderSub') &&
  tasksTabSrc.includes('onStartEvaluation={onStartEvaluation}') &&
  tasksTabSrc.includes('onOpenEvaluationResults={onOpenEvaluationResults}')
);

check('App.jsx publica eval_wall_ al crear evaluación, limpia al eliminar y conecta TasksTab general y de grupos',
  appSrc.includes('eval_wall_${evalId}') &&
  appSrc.includes('onStartEvaluation={(ev) =>') &&
  appSrc.includes('onOpenEvaluationResults={(ev) =>') &&
  appSrc.includes('tasks={tasks}') &&
  appSrc.includes('setTasks={setTasks}') &&
  appSrc.includes('rev.openCreate')
);

check('TasksTab reconcilia visiblePinnedTasks con combinedTasks/tasks y filtra huérfanos incluso cuando evaluations/reviews quedan vacíos',
  tasksTabSrc.includes('const combinedPinned = (combinedTasks || []).filter(t => t && t.isPinned)') &&
  tasksTabSrc.includes('stateTask.isPinned === false') &&
  tasksTabSrc.includes('Array.isArray(evaluations)') &&
  tasksTabSrc.includes('Array.isArray(reviews)') &&
  !tasksTabSrc.includes('(evaluations || []).length > 0 && String(t.id') &&
  !tasksTabSrc.includes('(reviews || []).length > 0 && !reviewMap.has')
);

check('TaskCard propaga ediciones inline de título, descripción y fecha límite (task.dueDate / task.dueTime) sobre linkedEvaluation y linkedReview',
  taskCardSrc.includes('const evDueStr = task.dueDate || ev.dueDate;') &&
  taskCardSrc.includes("const evTimeStr = task.dueTime || ev.dueTime || '23:59';") &&
  taskCardSrc.includes('dueDate: task?.dueDate || found.dueDate') &&
  taskCardSrc.includes("topic: task?.title || found.topic || 'Presentación de Diapositivas'")
);

check('TasksTab y ReviewsModule permiten visibilidad de grupos y publicaciones creadas en Modo Demo (isDemoMode / isDemoTask)',
  tasksTabSrc.includes("if (isDemoMode || String(group.id || '').startsWith('demo_') || String(group.id || '').startsWith('demo-')) return true;") &&
  tasksTabSrc.includes("if (!fixedTargetGroup && (isDemoTask || String(t.id || '').startsWith('demo-'))) return true;") &&
  reviewsSrc.includes("if (isDemoMode || String(g.id || '').startsWith('demo_') || String(g.id || '').startsWith('demo-')) return true;")
);

check('App.jsx ignora eliminados/archivados en isTaskForGroup, sincroniza isPinned/isDeletedFromWall en toggleArchiveEvaluation y limpia sub-vistas en onStartEvaluation',
  appSrc.includes('if (!t || !groupId || t.isDeletedFromWall || t.isArchived) return false;') &&
  appSrc.includes('? { isArchived: true, isPinned: false }') &&
  appSrc.includes(': { isArchived: false, isDeletedFromWall: false }')
);

const hasNestedArrayAnywhere = (val, parentIsArray = false) => {
  if (Array.isArray(val)) {
    if (parentIsArray) return true;
    return val.some(item => hasNestedArrayAnywhere(item, true));
  }
  if (val && typeof val === 'object') {
    return Object.values(val).some(v => hasNestedArrayAnywhere(v, false));
  }
  return false;
};

const sanitizedDeck = sanitizeSlidesForFirestore(fallbackSlides);
const hydratedDeck = hydrateSlidesFromFirestore(sanitizedDeck);
const tableSlideSanitized = sanitizedDeck.find(s => s.layout === 'table');
const tableSlideHydrated = hydratedDeck.find(s => s.layout === 'table');

check('sanitizeSlidesForFirestore convierte filas de tabla a objetos { cells } eliminando 100% los arreglos anidados prohibidos por Firestore',
  !hasNestedArrayAnywhere(sanitizedDeck) &&
  Array.isArray(tableSlideSanitized?.table?.rows) &&
  tableSlideSanitized.table.rows.every(r => !Array.isArray(r) && Array.isArray(r.cells))
);

check('hydrateSlidesFromFirestore y getTableRows restauran filas { cells } a arreglos 2D para el editor y exportador PPTX',
  Array.isArray(tableSlideHydrated?.table?.rows?.[0]) &&
  getTableRows(tableSlideSanitized.table).length === 3 &&
  Array.isArray(getTableRows(tableSlideSanitized.table)[0])
);

const truncatedAiJson = '[{"id":1,"layout":"title","title":"Prepositions: in, on, at","subtitle":"Time and Place"},{"id":2,"layout":"table","title":"Comparison","table":{"headers":["Preposition","Use","Example"],"rows":[["in","Months","in May"],["on","Days","on Monday"],["at","Time","at 5 PM"]]}},{"id":3,"layout":"cards","title":"Incomplet';
const recoveredFromTruncated = parseDeckAiResponse(truncatedAiJson);
check('parseDeckAiResponse recupera diapositivas completas aunque la respuesta JSON de IA se trunque al final',
  Array.isArray(recoveredFromTruncated) &&
  recoveredFromTruncated.length === 2 &&
  recoveredFromTruncated[0].title === 'Prepositions: in, on, at' &&
  recoveredFromTruncated[1].layout === 'table' &&
  !hasNestedArrayAnywhere(sanitizeSlidesForFirestore(recoveredFromTruncated))
);

console.log('\n== 8. Cinta de Opciones estilo PowerPoint (6 Pestañas) y Formato Individual por Texto ==');
const styledSlide0 = createDefaultSlide('cards', 1);
const defaultTitleMeta = getDefaultFieldStyleMeta('title', 'cards');
check('getDefaultFieldStyleMeta y getFieldTextStyle devuelven metadatos base para título, subtítulo y tarjetas',
  defaultTitleMeta.fontSize === 24 &&
  defaultTitleMeta.bold === true &&
  getFieldTextStyle(styledSlide0, 'card_0_title').bold === true &&
  getFieldTextStyle(styledSlide0, 'card_0_text').bold === false
);

const styledSlide1 = updateFieldTextStyle(styledSlide0, 'title', {
  color: '#DC2626',
  highlight: '#FEF08A',
  fontSize: 32,
  fontFamily: 'serif',
  italic: true,
  underline: true,
  strikethrough: true,
  align: 'center'
});
const titleStyleAfter = getFieldTextStyle(styledSlide1, 'title');
const inlineTitleCss = buildInlineTextStyle(styledSlide1, 'title', { color: '#000000' }, 'editor');

check('updateFieldTextStyle y buildInlineTextStyle aplican color, resaltado, tamaño, fuente, cursiva, subrayado, tachado y alineación individualmente al campo seleccionado',
  titleStyleAfter.color === '#DC2626' &&
  titleStyleAfter.highlight === '#FEF08A' &&
  titleStyleAfter.fontSize === 32 &&
  inlineTitleCss.color === '#DC2626' &&
  inlineTitleCss.backgroundColor === '#FEF08A' &&
  inlineTitleCss.fontSize === '32px' &&
  inlineTitleCss.fontStyle === 'italic' &&
  inlineTitleCss.textDecoration.includes('underline') &&
  inlineTitleCss.textDecoration.includes('line-through') &&
  inlineTitleCss.textAlign === 'center' &&
  getFieldTextStyle(styledSlide1, 'card_0_title').color === ''
);

const clearedSlide = clearFieldTextStyle(styledSlide1, 'title');
check('clearFieldTextStyle restaura el formato original del campo sin afectar otros campos',
  !clearedSlide.textStyles?.title &&
  getFieldTextStyle(clearedSlide, 'title').fontSize === 24
);

check('transformTextCase convierte entre MAYÚSCULAS, minúsculas, Tipo Título y Tipo oración',
  transformTextCase('hello world', 'upper') === 'HELLO WORLD' &&
  transformTextCase('HELLO WORLD', 'lower') === 'hello world' &&
  transformTextCase('hello world', 'title') === 'Hello World' &&
  transformTextCase('HELLO WORLD. second sentence', 'sentence') === 'Hello world. Second sentence'
);

const updatedCardTitleSlide = setSlideFieldTextValue(styledSlide1, 'cards.0.title', 'NUEVO CONCEPTO');
check('getSlideFieldTextValue y setSlideFieldTextValue leen y escriben cualquier campo individual (título, tarjetas, columnas, tabla, quiz)',
  getSlideFieldTextValue(updatedCardTitleSlide, 'cards.0.title') === 'NUEVO CONCEPTO' &&
  updatedCardTitleSlide.cards[0].title === 'NUEVO CONCEPTO' &&
  listSlideEditableFields(updatedCardTitleSlide).some(f => f.key === 'cards.0.title')
);

const normalizedWithStyles = normalizeSingleSlide(styledSlide1, 1);
const sanitizedWithStyles = sanitizeSlidesForFirestore([normalizedWithStyles]);
const hydratedWithStyles = hydrateSlidesFromFirestore(sanitizedWithStyles);
check('normalizeSingleSlide, sanitizeSlidesForFirestore e hydrateSlidesFromFirestore preservan slide.textStyles sin arreglos anidados',
  !hasNestedArrayAnywhere(sanitizedWithStyles) &&
  hydratedWithStyles[0]?.textStyles?.title?.color === '#DC2626' &&
  hydratedWithStyles[0]?.textStyles?.title?.highlight === '#FEF08A'
);

check('ReviewsModule implementa la Cinta de Opciones (Ribbon) con sus 6 pestañas (Inicio, Insertar, Diseño, Transiciones, IA / Copilot, Presentación y Vista) y pegado/arrastre de imágenes',
  reviewsSrc.includes("{ id: 'inicio', label: 'Inicio'") &&
  reviewsSrc.includes("{ id: 'insertar', label: 'Insertar'") &&
  reviewsSrc.includes("{ id: 'diseno', label: 'Diseño'") &&
  reviewsSrc.includes("{ id: 'transiciones', label: 'Transiciones'") &&
  reviewsSrc.includes("{ id: 'ia', label: 'IA / Copilot'") &&
  reviewsSrc.includes("{ id: 'presentacion', label: 'Presentación y Vista'") &&
  reviewsSrc.includes('handleStagePaste') &&
  reviewsSrc.includes('SLIDE_ACADEMIC_ILLUSTRATIONS') &&
  reviewsSrc.includes('applyFieldPptxOpts')
);

const quizSlideForFields = createDefaultSlide('quiz', 2);
const quizEditableKeys = listSlideEditableFields(quizSlideForFields, 2).map(f => f.key);
check('listSlideEditableFields en diapositivas quiz incluye tanto el texto como la explicación de cada opción',
  quizEditableKeys.includes('options.0.text') &&
  quizEditableKeys.includes('options.0.explanation')
);

const shiftedStyles = shiftFieldTextStylesOnDelete(
  {
    title: { color: '#111111' },
    'cards.0.title': { color: '#EF4444' },
    'cards.1.title': { color: '#10B981' },
    'cards.2.text': { color: '#3B82F6' }
  },
  'cards',
  0
);
check('shiftFieldTextStylesOnDelete desplaza correctamente los índices de estilos al eliminar tarjetas, puntos, opciones o filas/columnas',
  !shiftedStyles['cards.0.title']?.color?.includes('EF4444') &&
  shiftedStyles['cards.0.title']?.color === '#10B981' &&
  shiftedStyles['cards.1.text']?.color === '#3B82F6' &&
  shiftedStyles.title?.color === '#111111'
);

  const iconsSrc = fs.readFileSync(path.join(rootDir, 'src/components/Icons.jsx'), 'utf8');
check('Icons.jsx exporta Clipboard, Eraser y ListOrdered y ReviewsModule.jsx usa SLIDE_FONTS[el.fontFamily].css sin errores de referencia',
  iconsSrc.includes('export const Clipboard') &&
  iconsSrc.includes('export const Eraser') &&
  iconsSrc.includes('export const ListOrdered') &&
  reviewsSrc.includes('SLIDE_FONTS[el.fontFamily].css') &&
  !reviewsSrc.includes('SLIDE_FONTS[el.fontFamily].family') &&
  reviewsSrc.includes('transitionDuration: Number(updatedPres.transitionDuration)') &&
  reviewsSrc.includes('autoAdvanceSeconds: Number(updatedPres.autoAdvanceSeconds)')
);

console.log('\n== 9. Contraste Automático, Tamaños de Título, Protección Firestore 1MB y Cinta de Opciones ==');
const { isLightHexColor } = await import('../src/utils/slidesEngine.js');
check('isLightHexColor distingue colores claros (amarillo pastel, blanco) y oscuros (azul noche, carmesí)',
  isLightHexColor('#FEF08A') === true &&
  isLightHexColor('#FFFFFF') === true &&
  isLightHexColor('#0F172A') === false &&
  isLightHexColor('#AD3333') === false
);

const flippedToLight = resolveTheme({ theme: 'midnight' }, { bgColor: '#FFFFFF' }, 'dark');
const flippedToDark = resolveTheme({ theme: 'unipamplona' }, { bgColor: '#0F172A' }, 'light');
check('resolveTheme adapta contraste de texto y tarjetas automáticamente si bgColor invierte la luminosidad del tema',
  flippedToLight.isDark === false &&
  flippedToLight.textPrimary === '#0F172A' &&
  flippedToDark.isDark === true &&
  flippedToDark.textPrimary === '#F8FAFC'
);

const badgeEl = createCanvasElement('badge', { text: 'B2' });
check('createCanvasElement incluye lineHeight numérico en insignias (badge)',
  typeof badgeEl.lineHeight === 'number' && badgeEl.lineHeight > 0
);

check('getDefaultFieldStyleMeta respeta slide.titleSize (sm, md, lg, xl) y SLIDE_FONT_SIZES cubre todos los tamaños por defecto',
  getDefaultFieldStyleMeta({ layout: 'cards', titleSize: 'sm' }, 'title', 1).fontSize === 20 &&
  getDefaultFieldStyleMeta({ layout: 'cards', titleSize: 'xl' }, 'title', 1).fontSize === 38 &&
  [12, 13, 15, 17, 22, 26, 38].every(sz => SLIDE_FONT_SIZES.includes(sz))
);

const titleSlideWithDesc = { layout: 'title', title: 'Portada', subtitle: 'Subtítulo', description: 'Nota inferior distinta' };
check('listSlideEditableFields expone el campo description en portadas cuando es distinto de subtitle',
  listSlideEditableFields(titleSlideWithDesc, 0).some(f => f.key === 'description')
);

const hugeDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(420000);
const mediumDataUrl = 'data:image/jpeg;base64,' + 'B'.repeat(300000);
const sanitizedHuge = sanitizeSlidesForFirestore([
  {
    layout: 'image_text',
    title: 'Foto pesada',
    imageUrl: hugeDataUrl,
    elements: [{ id: 'el_img_1', type: 'image', imageUrl: hugeDataUrl, x: 10, y: 10, w: 30, h: 30 }]
  },
  {
    layout: 'image_text',
    title: 'Foto mediana 1',
    imageUrl: mediumDataUrl
  },
  {
    layout: 'image_text',
    title: 'Foto mediana 2',
    imageUrl: mediumDataUrl
  },
  {
    layout: 'image_text',
    title: 'Foto mediana 3',
    imageUrl: mediumDataUrl
  }
]);
check('sanitizeSlidesForFirestore protege el límite de 1 MB de Firestore compactando imágenes inline excesivas (> 380 KB individuales o > 750 KB acumuladas)',
  sanitizedHuge[0].imageUrl.length < 2000 &&
  sanitizedHuge[0].elements[0].imageUrl.length < 2000 &&
  JSON.stringify(sanitizedHuge).length < 750000
);

check('ReviewsModule preserva el foco del lienzo al pulsar botones de la Cinta y rasteriza SVGs para exportar .pptx',
  reviewsSrc.includes('ribbonContainerRef') &&
  reviewsSrc.includes('resolvePptxImageSource') &&
  reviewsSrc.includes('uploadOrInlineSlideImage') &&
  reviewsSrc.includes('compactDeckSlidesImages')
);

// 21. Pruebas de regresión adicionales (Wildcard '*' override/clear, contraste de resaltado, bgImage acumulado, quoteAuthor vacío y lienzo)
let wildcardSlide = {
  layout: 'title',
  title: 'Portada Principal',
  subtitle: 'Subtítulo de prueba',
  badge: 'UNIT 1'
};
wildcardSlide = updateFieldTextStyle(wildcardSlide, '*', { bold: true, color: '#EF4444', bgColor: '#FEF08A', align: 'center' });
wildcardSlide = clearFieldTextStyle(wildcardSlide, 'subtitle');
check('clearFieldTextStyle sobre un campo individual desglosa el comodín "*" para limpiar solo el campo objetivo sin perder el estilo en los demás',
  !wildcardSlide.textStyles?.['*'] &&
  getFieldTextStyle(wildcardSlide, 'subtitle').bold === false &&
  getFieldTextStyle(wildcardSlide, 'subtitle').color === '' &&
  getFieldTextStyle(wildcardSlide, 'title').bold === true &&
  getFieldTextStyle(wildcardSlide, 'title').color === '#EF4444'
);

let wildcardResetColorSlide = updateFieldTextStyle(
  { layout: 'title', title: 'Título', subtitle: 'Subtítulo' },
  '*',
  { color: '#38BDF8', bgColor: '#FEF08A' }
);
wildcardResetColorSlide = updateFieldTextStyle(wildcardResetColorSlide, 'title', { color: '', bgColor: 'transparent' });
check('updateFieldTextStyle permite restablecer color automático ("") o fondo transparente en un campo individual aunque existiera estilo global "*"',
  getFieldTextStyle(wildcardResetColorSlide, 'title').color === '' &&
  getFieldTextStyle(wildcardResetColorSlide, 'title').bgColor === '' &&
  getFieldTextStyle(wildcardResetColorSlide, 'subtitle').color === '#38BDF8' &&
  getFieldTextStyle(wildcardResetColorSlide, 'subtitle').bgColor === '#FEF08A'
);

const clearedTitleAlignSlide = clearFieldTextStyle(
  { layout: 'cards', title: 'Título centrado', titleAlign: 'center', textStyles: { title: { align: 'center' } } },
  'title'
);
check('clearFieldTextStyle en "title" restablece también slide.titleAlign a left',
  clearedTitleAlignSlide.titleAlign === 'left' &&
  getFieldTextStyle(clearedTitleAlignSlide, 'title').align === 'left'
);

const highlightedOnDarkSlide = updateFieldTextStyle(
  { layout: 'title', title: 'Texto resaltado' },
  'title',
  { bgColor: '#FEF08A' }
);
const highlightedInlineStyle = buildInlineTextStyle(highlightedOnDarkSlide, 'title', { color: '#F8FAFC' });
const darkHighlightSlide = updateFieldTextStyle(
  { layout: 'title', title: 'Texto resaltado oscuro' },
  'title',
  { bgColor: '#1E293B' }
);
const darkHighlightedInlineStyle = buildInlineTextStyle(darkHighlightSlide, 'title', { color: '#0F172A' });
check('buildInlineTextStyle ajusta automáticamente el contraste de texto cuando se aplica un resaltado sin color explícito',
  highlightedInlineStyle.color === '#0F172A' &&
  darkHighlightedInlineStyle.color === '#F8FAFC'
);

const bgCumulativeSlides = sanitizeSlidesForFirestore([
  { layout: 'title', title: 'BG 1', bgImage: mediumDataUrl },
  { layout: 'title', title: 'BG 2', bgImage: mediumDataUrl },
  { layout: 'title', title: 'BG 3', bgImage: mediumDataUrl }
]);
check('sanitizeSlidesForFirestore incluye bgImage en el presupuesto acumulado de 750 KB para proteger documentos de Firestore',
  JSON.stringify(bgCumulativeSlides).length < 750000
);

const emptyAuthorQuote = normalizeSingleSlide({
  layout: 'quote',
  quote: 'Learning never exhausts the mind.',
  quoteAuthor: '',
  badge: 'Cita'
}, 1, 'Quote Test');
check('normalizeSingleSlide preserva quoteAuthor vacío ("") cuando el usuario borra el autor en diseño quote',
  emptyAuthorQuote.quoteAuthor === ''
);

check('ReviewsModule escala fuentes de elementos libres en miniaturas/tarjetas, protege selección al arrastrar y cicla los 4 modos de mayúsculas/minúsculas',
  reviewsSrc.includes('data-canvas-element={el.id}') &&
  reviewsSrc.includes('scaledElFontSize') &&
  reviewsSrc.includes('getNextCaseMode') &&
  reviewsSrc.includes('hasDefaultShapeFill')
);

console.log(`\nRESULTADO SLIDES STUDIO: ${okCount} OK, ${failCount} fallos\n`);
if (failCount > 0) {
  process.exit(1);
}



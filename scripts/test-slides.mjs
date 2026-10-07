// scripts/test-slides.mjs
// Pruebas unitarias exhaustivas para el Estudio de Diapositivas estilo PowerPoint / Google Slides (slidesEngine.js y demoData.js)

import {
  SLIDE_THEMES,
  SLIDE_FONTS,
  SLIDE_LAYOUT_CATALOG,
  VALID_SLIDE_LAYOUTS,
  SLIDE_TRANSITIONS,
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
  buildDeckAiPrompt,
  normalizeSingleSlide,
  parseDeckAiResponse,
  buildSingleSlideAiPrompt,
  parseSingleSlideAiResponse,
  buildFallbackAiSlides
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
check('5 transiciones y 4 patrones definidos', SLIDE_TRANSITIONS.length === 5 && SLIDE_PATTERNS.length === 4);
check('4 plantillas iniciales definidas y generan diapositivas válidas', SLIDE_STARTER_TEMPLATES.length === 4 && SLIDE_STARTER_TEMPLATES.every(t => Array.isArray(t.buildSlides('Test')) && t.buildSlides('Test').length >= 3));

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
const tb = createCanvasElement('textbox', { x: 10, y: 15, w: 40, h: 20, text: 'Hola Clase' });
const sh = createCanvasElement('shape', { shapeType: 'circle', fill: '#1D4ED8' });
const nt = createCanvasElement('note', { text: 'Recordar tarea' });
const im = createCanvasElement('image', { x: 200, y: -50, w: 2, h: 150 });
const zeroEl = createCanvasElement('textbox', { x: 0, y: 0, w: 0, h: 0, id: undefined, type: 'malicioso' });

check('createCanvasElement crea textbox, shape, note e image con IDs únicos',
  tb.type === 'textbox' && sh.type === 'shape' && nt.type === 'note' && im.type === 'image' && tb.id !== sh.id
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

console.log(`\nRESULTADO SLIDES STUDIO: ${okCount} OK, ${failCount} fallos\n`);
if (failCount > 0) {
  process.exit(1);
}


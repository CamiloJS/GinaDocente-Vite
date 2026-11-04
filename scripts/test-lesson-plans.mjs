// scripts/test-lesson-plans.mjs
// Pruebas unitarias para el generador, normalizador y respaldos de planes de clase

import {
  buildLessonPlanPrompt,
  parseLessonPlanResponse,
  normalizeLessonPlan,
  createDefaultLessonPlan,
  formatLessonPlanAsMarkdown,
  stripTimeFromActivityText
} from '../src/utils/lessonPlanEngine.js';

import {
  DEMO_LESSON_PLANS,
  DEMO_SANDBOX_CATEGORIES,
  loadDemoSandbox,
  saveDemoSandboxItem,
  removeDemoSandboxItem
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

console.log('\n== 1. Construcción de Prompt para Planes de Clase ==');
const mockWeek = {
  week: 3,
  unit: 'Unidad 2: Mercado Cambiario',
  topic: 'Exchange Rates & Inflation',
  description: 'Comprender la volatilidad cambiaria.',
  keyConcepts: ['Currency', 'Exchange Rate', 'Forex'],
  activities: 'Taller práctico con divisas'
};

const prompt = buildLessonPlanPrompt({
  weekItem: mockWeek,
  teacherName: 'Camilo Docente',
  institution: 'Universidad de Pamplona',
  hours: 3,
  includeIcebreaker: true,
  icebreakerResources: 'Marcadores de colores, balones y música'
});

check('Prompt incluye la Universidad de Pamplona', prompt.includes('Universidad de Pamplona'));
check('Prompt instruye dejar curso y asignatura vacíos', prompt.includes('"course": ""') && prompt.includes('"subject": ""'));
check('Prompt incluye el nombre del profesor', prompt.includes('Camilo Docente'));
check('Prompt exige las 3 fases del cuadro (Inicio, Desarrollo, Cierre - Tarea)', 
  prompt.includes('Inicio') && prompt.includes('Desarrollo') && prompt.includes('Cierre - Tarea')
);
check('Prompt incluye la duración solicitada (3 horas / 180 minutos)', prompt.includes('3 horas') && prompt.includes('180 minutos'));
check('Prompt limita el rompehielos a 10-15 min máximo incluso en clases largas de 3 horas', 
  prompt.includes('15 min') && prompt.includes('10 y 15 minutos como máximo') && prompt.includes('NUNCA de 20, 25 ni 30 minutos')
);
check('Prompt incluye la directriz de rompehielos con los recursos a disposición', 
  prompt.includes('Marcadores de colores, balones y música') && prompt.includes('rompehielos')
);

// Prueba de duración de rompehielos para 1h y 2h
const prompt2h = buildLessonPlanPrompt({ weekItem: mockWeek, hours: 2, includeIcebreaker: true });
check('Prompt de 2 horas asigna exactamente 15 min al rompehielos en lugar de 30 min', prompt2h.includes('"time": "15 min"'));

const prompt1h = buildLessonPlanPrompt({ weekItem: mockWeek, hours: 1, includeIcebreaker: true });
check('Prompt de 1 hora asigna exactamente 10 min al rompehielos', prompt1h.includes('"time": "10 min"'));

const promptNoIcebreaker = buildLessonPlanPrompt({
  weekItem: mockWeek,
  teacherName: 'Gina',
  hours: 1,
  includeIcebreaker: false
});
check('Prompt sin rompehielos instruye explícitamente no incluirlo y duración 1 hora', 
  promptNoIcebreaker.includes('NO incluir actividad rompehielos') && promptNoIcebreaker.includes('1 hora')
);

console.log('\n== 2. Parseo y Normalización de Respuestas JSON de Gemini ==');
const sampleAiJson = JSON.stringify({
  institution: 'Universidad de Pamplona',
  subject: '',
  teacher: 'Gina',
  course: '',
  unit: 'Unidad 1',
  learningPurpose: 'Desarrollar competencias orales y escritas en inglés técnico.',
  specificPurposes: '1. Reconocer vocabulario clave.\n2. Aplicar en casos reales.\n3. Evaluar el aprendizaje.',
  rows: [
    {
      date: 'Semana 1',
      phase: 'Inicio',
      topics: 'Conceptos introductorios',
      activities: 'Dinámica de activación y preguntas orientadoras',
      resources: 'Diapositivas y enlaces',
      time: '20 min'
    },
    {
      date: 'Semana 1',
      phase: 'Desarrollo',
      topics: 'Explicación de fondo',
      activities: 'Presentación del docente y práctica en grupos',
      resources: 'Guía de trabajo y lectura',
      time: '50 min'
    },
    {
      date: 'Semana 1',
      phase: 'Cierre - Tarea',
      topics: 'Conclusiones y tarea',
      activities: 'Síntesis grupal y entrega de tarea',
      resources: 'Campus virtual',
      time: '20 min'
    }
  ]
});

const parsed = parseLessonPlanResponse(sampleAiJson, { weekItem: mockWeek, teacherName: 'Gina' });
check('Normaliza institución a Universidad de Pamplona', parsed.institution === 'Universidad de Pamplona');
check('Mantiene asignatura y curso vacíos', parsed.subject === '' && parsed.course === '');
check('Profesor es Gina', parsed.teacher === 'Gina');
check('Contiene exactamente 3 filas para el cuadro', parsed.rows.length === 3);
check('Fila 1 es Inicio', parsed.rows[0].phase === 'Inicio');
check('Fila 2 es Desarrollo', parsed.rows[1].phase === 'Desarrollo');
check('Fila 3 es Cierre - Tarea', parsed.rows[2].phase === 'Cierre - Tarea');

console.log('\n== 3. Recuperación ante Respuestas en Bloque Markdown o Fallidas ==');
const markdownWrapped = 'Aquí está el plan solicitado:\n```json\n' + sampleAiJson + '\n```\nEspero que te sea de ayuda!';
const parsedFromMarkdown = parseLessonPlanResponse(markdownWrapped, { weekItem: mockWeek, teacherName: 'Gina' });
check('Extrae correctamente JSON envuelto en bloques markdown', parsedFromMarkdown.rows.length === 3 && parsedFromMarkdown.institution === 'Universidad de Pamplona');

const corruptText = 'Lo siento, no pude procesar el contenido.';
const fallbackPlan = parseLessonPlanResponse(corruptText, { weekItem: mockWeek, teacherName: 'Gina' });
check('Genera estructura de respaldo ante respuesta corrupta', fallbackPlan.rows.length === 3 && fallbackPlan.institution === 'Universidad de Pamplona');

console.log('\n== 4. Formato Markdown para Copiar y Exportar ==');
const mdOutput = formatLessonPlanAsMarkdown(parsed);
check('Markdown incluye título FORMATO PLANEACIÓN DE CLASE (SEMANAL)', mdOutput.includes('FORMATO PLANEACIÓN DE CLASE (SEMANAL)'));
check('Markdown incluye encabezado con Universidad de Pamplona', mdOutput.includes('Universidad de Pamplona'));
check('Markdown contiene la tabla con columnas oficiales', 
  mdOutput.includes('| Fecha | Fases | Temas | Actividades | Recursos | Tiempo |')
);

console.log('\n== 5. Integración con Sandbox y Modo Demo ==');
check('DEMO_SANDBOX_CATEGORIES incluye lessonPlans', DEMO_SANDBOX_CATEGORIES.includes('lessonPlans'));
check('DEMO_LESSON_PLANS inicial contiene al menos 1 planeación precargada', Array.isArray(DEMO_LESSON_PLANS) && DEMO_LESSON_PLANS.length >= 1);
check('DEMO_LESSON_PLANS tiene como institución Universidad de Pamplona y curso vacío', 
  DEMO_LESSON_PLANS[0].institution === 'Universidad de Pamplona' && DEMO_LESSON_PLANS[0].course === ''
);

console.log('\n== 6. Prevención de Duplicados al Editar Planeaciones ==');
const originalPlan = {
  id: 'lp_test_edit_123',
  week: 3,
  weekTopic: 'Macroeconomic Equilibrium',
  institution: 'Universidad de Pamplona',
  subject: '',
  teacher: 'Gina',
  course: '',
  unit: 'Unidad 3',
  learningPurpose: 'Comprender el equilibrio macroeconómico',
  specificPurposes: '1. Modelar curvas.\n2. Analizar shocks.',
  rows: [
    { phase: 'Inicio', time: '20 min', topics: 'Intro', activities: 'Icebreaker', resources: 'Slides' },
    { phase: 'Desarrollo', time: '50 min', topics: 'Core', activities: 'Exercises', resources: 'Paper' },
    { phase: 'Cierre - Tarea', time: '20 min', topics: 'Wrapup', activities: 'Quiz', resources: 'Virtual' }
  ],
  createdAt: 1700000000000,
  updatedAt: 1700000000000
};

// Modificación simulada
const editedDraft = {
  ...originalPlan,
  unit: 'Unidad 3: Análisis Avanzado',
  learningPurpose: 'Comprender el equilibrio macroeconómico con enfoque cuantitativo'
};

const normalizedEdited = normalizeLessonPlan(editedDraft);
check('Normalización preserva exactamente el ID original del plan', normalizedEdited.id === originalPlan.id);
check('Normalización preserva el tema de la semana (weekTopic) sin sobreescribirlo con general', normalizedEdited.weekTopic === originalPlan.weekTopic);
check('Normalización preserva la fecha de creación original', normalizedEdited.createdAt === originalPlan.createdAt);

// Simulación de actualización en lista de estado (prev.map)
const sampleList = [originalPlan, { id: 'lp_other_999', week: 2, createdAt: 1690000000000 }];
const updatedList = sampleList.map(p => p.id === normalizedEdited.id ? normalizedEdited : p);
check('Actualización en lista reemplaza en la misma posición sin duplicar', updatedList.length === 2 && updatedList[0].unit === 'Unidad 3: Análisis Avanzado');

// Simulación de deduplicación Map ante snapshots duplicados (ej: legacy addDoc + setDoc)
const duplicateSnapshots = [
  { id: 'random_firestore_id_1', ...originalPlan },
  { id: normalizedEdited.id, ...normalizedEdited, updatedAt: 1700000050000 }
];
const dedupMap = new Map();
duplicateSnapshots.forEach(d => {
  const internalId = String(d.id || '').trim();
  const planKey = (d.rows && d.week) ? (d.id === 'random_firestore_id_1' ? originalPlan.id : d.id) : d.id;
  if (!dedupMap.has(planKey)) {
    dedupMap.set(planKey, d);
  } else {
    const existing = dedupMap.get(planKey);
    if ((d.updatedAt || 0) >= (existing.updatedAt || 0)) {
      dedupMap.set(planKey, d);
    }
  }
});
check('Deduplicador colapsa entradas duplicadas en un solo registro con la versión más reciente', dedupMap.size === 1 && dedupMap.get(originalPlan.id).unit === 'Unidad 3: Análisis Avanzado');

console.log('\n== 7. Eliminación de Tiempos en la Descripción de Actividades ==');
const userExampleText = "Rompehielos (10 min): 'Palabras Clave Visuales'. El docente escribe en el tablero 'CALL' y 'ALAO'.";
const cleanedUserExample = stripTimeFromActivityText(userExampleText);
check('Limpia el tiempo (10 min) del texto descriptivo del usuario', 
  !cleanedUserExample.includes('(10 min)') && !cleanedUserExample.includes('10 min') && cleanedUserExample.includes("'Palabras Clave Visuales'")
);

const textWithVariousTimes = "Actividad inicial (15 mins) y luego taller [50 minutos] con cierre (20 min).";
const cleanedVarious = stripTimeFromActivityText(textWithVariousTimes);
check('Limpia múltiples formatos de tiempo entre paréntesis o corchetes',
  !cleanedVarious.includes('15') && !cleanedVarious.includes('50') && !cleanedVarious.includes('20')
);

// Prueba de normalización de filas con tiempos embebidos
const planWithTimeInActivities = {
  id: 'lp_test_time_clean',
  week: 1,
  rows: [
    { phase: 'Inicio', activities: "Rompehielos (10 min): Dinámica rápida", time: '15 min' },
    { phase: 'Desarrollo', activities: "Explicación magistral (50 min) y práctica", time: '55 min' },
    { phase: 'Cierre - Tarea', activities: "Conclusiones (20 min) y entrega", time: '20 min' }
  ]
};
const normalizedTimeClean = normalizeLessonPlan(planWithTimeInActivities);
check('Normalizador remueve tiempos de activities en la fila de Inicio', !normalizedTimeClean.rows[0].activities.includes('10 min'));
check('Normalizador conserva el tiempo oficial en la columna time', normalizedTimeClean.rows[0].time === '15 min');
check('Prompt instruye estrictamente no escribir tiempos en activities', 
  prompt.includes('SIN TIEMPOS EN "activities"') && prompt.includes('columna "time"')
);

console.log(`\n========================================`);
console.log(`Total pruebas Planes de Clase: ${okCount + failCount} | OK: ${okCount} | FAIL: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}

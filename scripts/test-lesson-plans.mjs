// scripts/test-lesson-plans.mjs
// Pruebas unitarias para el generador, normalizador y respaldos de planes de clase

import {
  buildLessonPlanPrompt,
  parseLessonPlanResponse,
  normalizeLessonPlan,
  createDefaultLessonPlan,
  formatLessonPlanAsMarkdown
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
  institution: 'Universidad de Pamplona'
});

check('Prompt incluye la Universidad de Pamplona', prompt.includes('Universidad de Pamplona'));
check('Prompt instruye dejar curso y asignatura vacíos', prompt.includes('"course": ""') && prompt.includes('"subject": ""'));
check('Prompt incluye el nombre del profesor', prompt.includes('Camilo Docente'));
check('Prompt exige las 3 fases del cuadro (Inicio, Desarrollo, Cierre - Tarea)', 
  prompt.includes('Inicio') && prompt.includes('Desarrollo') && prompt.includes('Cierre - Tarea')
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

console.log(`\n========================================`);
console.log(`Total pruebas Planes de Clase: ${okCount + failCount} | OK: ${okCount} | FAIL: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}

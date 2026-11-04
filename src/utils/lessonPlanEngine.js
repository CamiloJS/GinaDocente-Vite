// src/utils/lessonPlanEngine.js
// Utilidades, generador con IA, formateador y normalizador para Planes de Clase (Formato Semanal)

/**
 * Genera el prompt estructurado para que Gemini devuelva un JSON estricto
 * con el formato oficial de Planeación de Clase Semanal.
 */
export function buildLessonPlanPrompt({
  weekItem,
  teacherName = 'Gina',
  institution = 'Universidad de Pamplona',
  hours = 2,
  includeIcebreaker = true,
  icebreakerResources = ''
}) {
  const week = weekItem?.week ?? 1;
  const topic = weekItem?.topic || 'Tema de la semana';
  const unit = weekItem?.unit || 'Unidad 1';
  const description = weekItem?.description || '';
  const keyConcepts = Array.isArray(weekItem?.keyConcepts) ? weekItem.keyConcepts.join(', ') : '';
  const activities = weekItem?.activities || '';
  const totalMinutes = Math.max(30, Math.round(Number(hours) * 60) || 120);

  // Distribución de tiempo según duración y si hay rompehielos
  const inicioMins = includeIcebreaker ? Math.round(totalMinutes * 0.25) : Math.round(totalMinutes * 0.15);
  const cierreMins = Math.round(totalMinutes * 0.20);
  const desarrolloMins = totalMinutes - inicioMins - cierreMins;

  const icebreakerGuideline = includeIcebreaker
    ? `SÍ incluir una actividad rompehielos (Icebreaker / Warm-up dinámico) en la fase de "Inicio".${
        icebreakerResources && icebreakerResources.trim()
          ? ` RECURSOS A DISPOSICIÓN PARA EL ROMPEHIELOS: ${icebreakerResources.trim()}. Debes diseñar el rompehielos adaptado a estos recursos disponibles.`
          : ' Diseña un rompehielos activo y motivador adaptado a estudiantes universitarios.'
      }`
    : `NO incluir actividad rompehielos; en la fase de "Inicio", enfócate directamente en activación de saberes previos, motivación y preguntas detonantes técnicas sobre el tema.`;

  return `Eres un diseñador instruccional y pedagogo universitario de alto nivel.
Genera una planeación de clase semanal universitaria en ESPAÑOL basada en los siguientes datos del contenido programático:

- Semana: ${week}
- Unidad: ${unit}
- Tema: ${topic}
- Duración total de la sesión: ${hours} ${hours === 1 ? 'hora' : 'horas'} (${totalMinutes} minutos)
- Distribución de tiempo aproximada: Inicio (${inicioMins} min), Desarrollo (${desarrolloMins} min), Cierre - Tarea (${cierreMins} min)
- Directriz de rompehielos: ${icebreakerGuideline}
- Descripción / Objetivos base: ${description}
- Conceptos clave: ${keyConcepts}
- Actividades base sugeridas: ${activities}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido (sin comentarios, sin texto introductorio ni explicaciones fuera del bloque JSON).

El formato del JSON debe ser exactamente:
{
  "institution": "${institution}",
  "subject": "",
  "teacher": "${teacherName}",
  "course": "",
  "unit": "${unit}",
  "learningPurpose": "Propósito de aprendizaje general de la sesión (claro, conciso y orientado a competencias)",
  "specificPurposes": "1. Primer propósito específico\\n2. Segundo propósito específico\\n3. Tercer propósito específico",
  "rows": [
    {
      "date": "Semana ${week}",
      "phase": "Inicio",
      "topics": "Temas o conceptos a abordar en la fase de Inicio",
      "activities": "Actividades detalladas para el Inicio (${includeIcebreaker ? 'Actividad rompehielos dinámica' : 'Activación de saberes previos'}, motivación y contextualización)",
      "resources": "Recursos para Inicio${icebreakerResources ? ` (incluyendo: ${icebreakerResources.trim()})` : ''}",
      "time": "${inicioMins} min"
    },
    {
      "date": "Semana ${week}",
      "phase": "Desarrollo",
      "topics": "Temas centrales, vocabulario y estructuras clave",
      "activities": "Actividades detalladas de Desarrollo (Presentation & Practice: explicación docente, ejercicios interactivos, trabajo guiado y colaborativo)",
      "resources": "Recursos de desarrollo (guías, lecturas, plataformas, audios)",
      "time": "${desarrolloMins} min"
    },
    {
      "date": "Semana ${week}",
      "phase": "Cierre - Tarea",
      "topics": "Síntesis, conclusiones y evaluación formativa",
      "activities": "Actividades de Cierre y Tarea (Wrap-up: retroalimentación, verificación de aprendizaje y asignación de tarea o entregable)",
      "resources": "Recursos para el cierre y tarea (rubrica, plataforma virtual, formulario)",
      "time": "${cierreMins} min"
    }
  ]
}

Reglas estrictas:
1. "institution" DEBE ser "${institution}".
2. "course" y "subject" DEBEN dejarse como cadena vacía "".
3. "teacher" DEBE ser "${teacherName}".
4. "learningPurpose" debe ser un texto bien redactado.
5. "specificPurposes" debe contener 2 o 3 propósitos específicos numerados.
6. "rows" debe contener exactamente 3 filas correspondientes a las fases: "Inicio", "Desarrollo" y "Cierre - Tarea".
7. Cada fila debe tener "date", "phase", "topics", "activities", "resources" y "time".
8. La suma de tiempos de las 3 filas debe ser aproximadamente ${totalMinutes} minutos (${hours} ${hours === 1 ? 'hora' : 'horas'}).`;
}

/**
 * Limpia y parsea la respuesta de Gemini para extraer el objeto del plan de clase.
 */
export function parseLessonPlanResponse(rawText, fallbackData = {}) {
  if (!rawText || typeof rawText !== 'string') {
    return createDefaultLessonPlan(fallbackData);
  }

  try {
    let clean = rawText.trim();
    // Extraer bloque de código markdown ```json ... ``` si existe
    const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      clean = jsonMatch[1].trim();
    } else {
      // Buscar entre llaves { ... }
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(clean);
    return normalizeLessonPlan(parsed, fallbackData);
  } catch (err) {
    console.warn('Error al parsear JSON del plan de clase:', err);
    return createDefaultLessonPlan(fallbackData, rawText);
  }
}

/**
 * Normaliza un plan de clase para garantizar que todos los campos requeridos existan
 * con la estructura visual y de datos esperada.
 */
export function normalizeLessonPlan(plan = {}, fallbackData = {}) {
  const fallbackWeek = fallbackData?.weekItem?.week ?? 1;
  const fallbackTopic = fallbackData?.weekItem?.topic || 'Tema general';
  const fallbackUnit = fallbackData?.weekItem?.unit || 'Unidad 1';
  const teacher = (plan.teacher || fallbackData.teacherName || 'Docente').trim();

  const institution = 'Universidad de Pamplona';
  const subject = typeof plan.subject === 'string' ? plan.subject : '';
  const course = typeof plan.course === 'string' ? plan.course : '';
  const unit = (plan.unit || fallbackUnit).trim();

  const learningPurpose = (plan.learningPurpose || fallbackData.learningPurpose || `Desarrollar competencias en: ${plan.weekTopic || fallbackTopic}`).trim();
  const specificPurposes = (plan.specificPurposes || fallbackData.specificPurposes || '1. Comprender los conceptos clave.\n2. Aplicar los aprendizajes en actividades guiadas.\n3. Evaluar el desempeño formativo.').trim();

  const rawRows = Array.isArray(plan.rows) && plan.rows.length > 0 ? plan.rows : [];
  const defaultPhases = ['Inicio', 'Desarrollo', 'Cierre - Tarea'];

  const rows = defaultPhases.map((phaseName, idx) => {
    const found = rawRows.find(r => (r.phase || '').toLowerCase().includes(phaseName.split(' ')[0].toLowerCase())) || rawRows[idx] || {};
    return {
      date: (found.date || `Semana ${plan.week || fallbackWeek}`).trim(),
      phase: phaseName,
      topics: (found.topics || plan.weekTopic || fallbackTopic).trim(),
      activities: (found.activities || (idx === 0 ? 'Activación de saberes previos y presentación.' : idx === 1 ? 'Explicación del docente y práctica de los estudiantes.' : 'Conclusiones y asignación de trabajo autónomo.')).trim(),
      resources: (found.resources || 'Material didáctico, proyector, campus virtual').trim(),
      time: (found.time || (idx === 0 ? '20 min' : idx === 1 ? '50 min' : '20 min')).trim()
    };
  });

  const planId = String(plan.id || '').trim();

  return {
    id: planId || `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    week: Number(plan.week || fallbackWeek) || 1,
    weekTopic: (plan.weekTopic || fallbackTopic).trim(),
    institution,
    subject,
    teacher,
    course,
    unit,
    learningPurpose,
    specificPurposes,
    rows,
    createdAt: Number(plan.createdAt) || Date.now(),
    updatedAt: Number(plan.updatedAt) || Date.now()
  };
}

/**
 * Crea un plan de clase por defecto con la plantilla oficial.
 */
export function createDefaultLessonPlan(fallbackData = {}, rawNotes = '') {
  const week = fallbackData?.weekItem?.week ?? 1;
  const topic = fallbackData?.weekItem?.topic || 'Tema de la semana';
  const unit = fallbackData?.weekItem?.unit || 'Unidad 1';
  const teacher = (fallbackData?.teacherName || 'Docente').trim();

  return {
    id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    week: Number(week) || 1,
    weekTopic: topic,
    institution: 'Universidad de Pamplona',
    subject: '',
    teacher,
    course: '',
    unit,
    learningPurpose: `Identificar y aplicar los conceptos fundamentales de ${topic}.`,
    specificPurposes: `1. Analizar los fundamentos de ${topic}.\n2. Realizar ejercicios prácticos y colaborativos.\n3. Evaluar formativamente los resultados obtenidos.${rawNotes ? `\n\nNotas adicionales: ${rawNotes}` : ''}`,
    rows: [
      {
        date: `Semana ${week}`,
        phase: 'Inicio',
        topics: topic,
        activities: 'Saludo, activación de conocimientos previos y motivación inicial.',
        resources: 'Pizarra, diapositivas, preguntas guía',
        time: '20 min'
      },
      {
        date: `Semana ${week}`,
        phase: 'Desarrollo',
        topics: topic,
        activities: 'Explicación magistral, análisis de ejemplos y trabajo práctico en parejas.',
        resources: 'Guía de trabajo, lecturas, proyector',
        time: '50 min'
      },
      {
        date: `Semana ${week}`,
        phase: 'Cierre - Tarea',
        topics: 'Síntesis y evaluación',
        activities: 'Puesta en común, retroalimentación del docente y orientación de la tarea semanal.',
        resources: 'Campus virtual, rúbrica de evaluación',
        time: '20 min'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Exporta el plan de clase en texto plano / markdown estructurado
 */
export function formatLessonPlanAsMarkdown(plan) {
  if (!plan) return '';
  const rows = Array.isArray(plan.rows) ? plan.rows : [];
  
  return `FORMATO PLANEACIÓN DE CLASE (SEMANAL)
Institución educativa: ${plan.institution || 'Universidad de Pamplona'}
Asignatura: ${plan.subject || '___________________'}
Profesor: ${plan.teacher || '___________________'}
Curso: ${plan.course || '___________________'}
Unidad: ${plan.unit || '___________________'}

Propósito de aprendizaje:
${plan.learningPurpose || ''}

Propósitos específicos:
${plan.specificPurposes || ''}

---------------------------------------------------------------------------------------------------------
| Fecha | Fases | Temas | Actividades | Recursos | Tiempo |
---------------------------------------------------------------------------------------------------------
${rows.map(r => `| ${r.date} | ${r.phase} | ${r.topics} | ${r.activities} | ${r.resources} | ${r.time} |`).join('\n')}
---------------------------------------------------------------------------------------------------------`;
}

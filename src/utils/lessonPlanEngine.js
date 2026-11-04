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

  // Distribución de tiempo según duración y si hay rompehielos:
  // Las actividades rompehielos deben ser CORTAS: de 10 a 15 minutos como mucho (nunca de media hora)
  let inicioMins;
  if (includeIcebreaker) {
    inicioMins = totalMinutes <= 60 ? 10 : 15; // 10 a 15 min máximo
  } else {
    inicioMins = totalMinutes <= 60 ? 5 : 10;  // activación breve de saberes previos
  }

  // Cierre formativo breve (10 a 20 min)
  let cierreMins;
  if (totalMinutes <= 60) {
    cierreMins = 10;
  } else if (totalMinutes <= 120) {
    cierreMins = 15;
  } else {
    cierreMins = 20;
  }

  const desarrolloMins = Math.max(15, totalMinutes - inicioMins - cierreMins);

  const icebreakerGuideline = includeIcebreaker
    ? `SÍ incluir una actividad rompehielos (Icebreaker / Warm-up) en la fase de "Inicio". REGLA CRÍTICA DE TIEMPO: La actividad rompehielos DEBE ser CORTA y ágil, de entre 10 y 15 minutos como máximo (NUNCA de 20, 25 ni 30 minutos; estrictamente entre 10 y 15 minutos). Debe ser una dinámica breve de integración o calentamiento sin consumir el tiempo principal de la clase.${
        icebreakerResources && icebreakerResources.trim()
          ? ` RECURSOS A DISPOSICIÓN PARA EL ROMPEHIELOS: ${icebreakerResources.trim()}. Diseña el rompehielos corto adaptado exclusivamente a estos recursos disponibles.`
          : ' Diseña un rompehielos activo, breve y motivador adaptado a estudiantes universitarios.'
      }`
    : `NO incluir actividad rompehielos; en la fase de "Inicio", realiza una activación breve y directa de saberes previos y preguntas detonantes (5 a 10 min).`;

  return `Eres un diseñador instruccional y pedagogo universitario de alto nivel para la Universidad de Pamplona.
Genera una planeación de clase semanal universitaria en ESPAÑOL, 100% REALISTA, FACTIBLE Y PEDAGÓGICAMENTE ACTIVA, basada en los siguientes datos del contenido programático:

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

PRINCIPIOS PEDAGÓGICOS CRÍTICOS Y OBLIGATORIOS (CLASE 100% REALISTA Y REALIZABLE):
1. PROHIBICIÓN TERMINANTE DE VIDEOS LARGOS O SESIONES PASIVAS DE PANTALLA:
   - Queda terminantemente PROHIBIDO programar la visualización de videos largos, documentales, películas o tutoriales extensos (NADA de videos de 15, 30, 45, 60 ni 90 minutos; NUNCA uses un video como sustituto de la clase).
   - Los estudiantes universitarios NO van al salón a sentarse a mirar una pantalla. La clase universitaria NO es una sesión de cine.
   - Si se requiere un estímulo audiovisual, debe ser exclusivamente un micro-audio o clip introductorio de 2 a 3 minutos como máximo; de lo contrario, no incluyas videos.
2. RECURSOS 100% ACCESIBLES Y REALES PARA EL AULA PRESENCIAL:
   - Prohibido exigir software de pago, licencias privativas costosas, plataformas especializadas inaccesibles o equipos de laboratorio inexistentes en un aula estándar.
   - Emplea exclusivamente recursos cotidianos, accesibles y reales: tablero (pizarra), marcadores borrables, guías de ejercicios impresas, fotocopias, lecturas breves, diapositivas/proyector básico, cuadernos de apuntes y campus virtual institucional.
3. PEDAGOGÍA ACTIVA: EL DOCENTE ENSEÑA Y LOS ESTUDIANTES PRACTICAN EN EL AULA:
   - En Inicio: El docente lidera la bienvenida, motivación y activación de saberes previos o rompehielos corto (10 a 15 min máximo) con preguntas orientadoras en el tablero o lluvia de ideas.
   - En Desarrollo: El docente realiza la explicación magistral y modela los conceptos clave; luego los estudiantes realizan ejercicios prácticos, análisis de casos en parejas, talleres colaborativos o dinámicas activas de aplicación directa en el aula. El docente circula, asesora y retroalimenta activamente.
   - En Cierre - Tarea: Síntesis formativa en el tablero, verificación oral de aprendizajes (preguntas de comprobación), retroalimentación del docente y asignación puntual de trabajo autónomo.

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
      "activities": "Descripción detallada de las actividades de Inicio (${includeIcebreaker ? 'dinámica rompehielos corta de 10-15 min y contextualización' : 'activación de saberes previos'} con preguntas en tablero - SIN minutos ni duración aquí)",
      "resources": "Recursos accesibles para Inicio (tablero, marcadores, tarjetas impresas)${icebreakerResources ? ` (incluyendo: ${icebreakerResources.trim()})` : ''}",
      "time": "${inicioMins} min"
    },
    {
      "date": "Semana ${week}",
      "phase": "Desarrollo",
      "topics": "Temas centrales, vocabulario y estructuras clave",
      "activities": "Actividades detalladas de Desarrollo (Presentation & Practice: explicación dialogada del docente, modelado en tablero, taller práctico colaborativo en parejas - PROHIBIDO videos largos o sesiones pasivas de pantalla - SIN incluir minutos ni duración aquí)",
      "resources": "Recursos de desarrollo accesibles y cotidianos (guías de trabajo impresas, lecturas breves, tablero, marcadores)",
      "time": "${desarrolloMins} min"
    },
    {
      "date": "Semana ${week}",
      "phase": "Cierre - Tarea",
      "topics": "Síntesis, conclusiones y evaluación formativa",
      "activities": "Actividades de Cierre y Tarea (Wrap-up: retroalimentación del docente, síntesis en el tablero, verificación de aprendizaje y asignación de trabajo autónomo o entregable - SIN incluir minutos ni duración aquí)",
      "resources": "Recursos para el cierre y tarea (tablero, rúbrica impresa, cuaderno de apuntes, campus virtual)",
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
8. La suma de tiempos de las 3 filas debe ser aproximadamente ${totalMinutes} minutos (${hours} ${hours === 1 ? 'hora' : 'horas'}).
9. DURACIÓN DEL ROMPEHIELOS: Si se incluye rompehielos, la actividad de "Inicio" DEBE ser CORTA, de 10 a 15 minutos como máximo (tiempo asignado: "${inicioMins} min"). NUNCA programes un rompehielos de media hora ni mayor a 15 minutos.
10. SIN TIEMPOS EN "activities": En el campo "activities" (descripción de la actividad) NUNCA escribas el tiempo ni la duración (NO pongas "(10 min)", "(15 min)", "10 minutos", etc.). La duración va ÚNICAMENTE en la columna "time" para evitar contradicciones.
11. CLASE 100% REALIZABLE Y ACTIVIDADES EN EL AULA: Cada actividad propuesta debe ser algo que el docente y los estudiantes universitarios puedan ejecutar físicamente en un aula presencial estándar. El docente enseña directamente y los estudiantes resuelven, debaten y practican.
12. PROHIBICIÓN TOTAL DE VIDEOS LARGOS: Está terminantemente prohibido incluir videos largos (por ejemplo videos de 15, 30, 45, 60 o 90 minutos) o actividades pasivas donde los estudiantes solo vean pantallas o videos. NUNCA sustituyas la clase presencial por la visualización de un video.
13. RECURSOS 100% ACCESIBLES: En "resources" usa únicamente materiales de fácil acceso y uso universal en la Universidad de Pamplona (tablero, marcadores, fotocopias, guías impresas, lecturas de texto, apuntes, proyector básico, campus virtual). No menciones software de pago, plataformas complejas ni recursos inaccesibles.`;
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
 * Elimina cualquier mención de duración o tiempo dentro de la descripción de la actividad,
 * ya que la duración debe figurar ÚNICAMENTE en la columna "time" (Tiempo) y no dentro
 * del texto descriptivo (evitando discrepancias visuales como "(10 min)" vs "15 min").
 */
export function stripTimeFromActivityText(text = '') {
  if (typeof text !== 'string') return '';
  return text
    // Paréntesis, corchetes o llaves con tiempo: (10 min), (15 mins), [10 minutos], (10-15 min), etc.
    .replace(/\s*[\(\[\{]\s*(?:\d+(?:\s*[-–y\/]\s*\d+)?)\s*(?:minutos?|mins?|m|segundos?|segs?|s|horas?|hrs?|h)\s*[\)\]\}]/gi, '')
    // Prefijos tipo "Rompehielos 10 min:" o "Warm-up 15 min:"
    .replace(/(?:^|\b)(rompehielos|warm-?up|icebreaker)\s*[-–:]?\s*\d+\s*(?:minutos?|mins?)\s*[:-]?\s*/gi, '$1: ')
    // Tiempos pegados a dos puntos: ": 10 min -"
    .replace(/:\s*\d+\s*(?:minutos?|mins?)\b\s*[:-]?\s*/gi, ': ')
    // Limpieza de espacios y dos puntos redundantes
    .replace(/\s*:\s*:\s*/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Detecta y sanea actividades que propongan videos largos o sesiones pasivas de pantalla,
 * transformándolas en dinámicas pedagógicas activas, realistas y realizables en el aula
 * presencial, guiadas por la explicación del docente y práctica de los estudiantes.
 */
export function sanitizeRealisticActivityText(text = '', phase = 'Desarrollo') {
  if (typeof text !== 'string') return '';
  let cleaned = text;

  // Detección de visualización de videos largos o actividades pasivas de pantalla
  const hasPassiveVideo = /(?:los\s+estudiantes\s+)?(?:van\s+a\s+|se\s+procede\s+a\s+)?(?:ver|ve|ven|viendo|observar|observa|observan|observando|proyectar|proyecta|proyectan|proyectando|visualizar|visualiza|visualizan|visualizando|reproducir|reproduce|reproducen|reproduciendo|mirar|mira|miran|mirando|proyecci[oó]n\s+de|presentaci[oó]n\s+de)\s+(?:un\s+|el\s+)?(?:video|vídeo|documental|pel[ií]cula|conferencia|grabaci[oó]n|videotutorial)\b|(?:video|vídeo|documental|pel[ií]cula|videotutorial)\s*(?:de\s*)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo)\b/i.test(cleaned);

  if (hasPassiveVideo) {
    // 1. Reemplazar frases verbales de ver videos pasivos por acciones pedagógicas activas
    cleaned = cleaned
      .replace(/(?:los\s+estudiantes\s+)?(?:van\s+a\s+|se\s+procede\s+a\s+)?(?:ver|ve|ven|viendo|observar|observa|observan|observando|proyectar|proyecta|proyectan|proyectando|visualizar|visualiza|visualizan|visualizando|reproducir|reproduce|reproducen|reproduciendo|mirar|mira|miran|mirando|proyecci[oó]n\s+de|presentaci[oó]n\s+de)\s+(?:un\s+|el\s+)?(?:video|vídeo|documental|pel[ií]cula|conferencia|grabaci[oó]n|videotutorial)(?:\s+(?:de\s+)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo))?(?:\s+(?:en|de)\s+youtube)?/gi, () => {
        if (/inicio/i.test(phase)) {
          return 'Activación de saberes previos y preguntas detonantes guiadas por el docente en el tablero';
        } else if (/cierre/i.test(phase)) {
          return 'Síntesis colaborativa en el tablero y retroalimentación del docente';
        }
        return 'Explicación dialogada y modelado por parte del docente en el tablero con ejercicios prácticos';
      })
      // 2. Reemplazar menciones sustantivas a videos de X minutos por talleres y guías
      .replace(/(?:un\s+|el\s+)?(?:video|vídeo|documental|pel[ií]cula|videotutorial)\s*(?:de\s*)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo)(?:\s+(?:en|de)\s+youtube)?/gi, 'taller práctico guiado con guía de trabajo y resolución en tablero')
      // 3. Reemplazar enlaces y menciones a YouTube
      .replace(/(?:,\s*)?(?:en|de|a\s+través\s+de|mediante|enlace\s+a)\s+youtube(?:\.com)?/gi, '')
      .replace(/\byoutube(?:\.com)?\b/gi, 'material didáctico');
  }

  // Limpieza de puntuación y espacios redundantes
  cleaned = cleaned
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Si tras limpiar quedó algo excesivamente corto o vacío
  if (!cleaned || cleaned.length < 10) {
    if (/inicio/i.test(phase)) {
      cleaned = 'Saludo institucional, contextualización y activación de conocimientos previos con preguntas orientadoras en el tablero.';
    } else if (/cierre/i.test(phase)) {
      cleaned = 'Síntesis grupal de conceptos clave, resolución de dudas y asignación de actividades de aprendizaje autónomo.';
    } else {
      cleaned = 'Explicación magistral dialogada y modelado por parte del docente, seguida de taller de ejercicios prácticos guiados en parejas.';
    }
  }

  return cleaned;
}

/**
 * Detecta y sanea recursos que sean inaccesibles, costosos o videos extensos,
 * asegurando materiales cotidianos y reales para el aula universitaria estándar.
 */
export function sanitizeRealisticResourceText(text = '') {
  if (typeof text !== 'string') return 'Tablero, marcadores borrables, guía de estudio';
  let cleaned = text;

  // Reemplazar menciones a videos extensos, plataformas de video o software privativo
  cleaned = cleaned
    .replace(/(?:video|vídeo|documental|pel[ií]cula|videotutorial)\s*(?:de\s*)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo)(?:\s+(?:en|de)\s+youtube)?/gi, 'Guía de ejercicios y lecturas impresas')
    .replace(/(?:enlace\s+(?:a\s+)?)?youtube(?:\.com)?/gi, 'material didáctico institucional')
    .replace(/(?:licencia\s+de\s+pago|software\s+de\s+pago|software\s+privativo|laboratorio\s+especializado|suscripción\s+costosa)\b/gi, 'Material impreso y recursos de libre acceso')
    .replace(/(?:video|vídeo)\s+explicativo\s+extenso/gi, 'Guía didáctica y tablero')
    .replace(/\b(?:video|vídeo)\s+de\s+\d+\b/gi, 'Guía de trabajo')
    .replace(/\s*,\s*,/g, ', ')
    .replace(/^[\s,;.-]+|[\s,;.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 4) {
    return 'Tablero, marcadores borrables, guía de ejercicios y material didáctico';
  }

  return cleaned;
}

/**
 * Valida si una planeación de clase cumple con los criterios de ser 100% realizable,
 * activa y factible en un aula estándar (sin videos extensos ni recursos inaccesibles).
 */
export function validateLessonPlanFeasibility(plan = {}) {
  const issues = [];
  const rows = Array.isArray(plan.rows) ? plan.rows : [];

  rows.forEach((r, idx) => {
    const act = (r.activities || '').toLowerCase();
    const res = (r.resources || '').toLowerCase();

    // Detección de videos largos en actividades (>5 min o videos que sustituyen la clase)
    if (/(?:video|vídeo|documental|pel[ií]cula|videotutorial)\s*(?:de\s*)?(?:[1-9]\d+|[6-9])\s*(?:min|hora|h)/i.test(act) ||
        /(?:ver|observar|mirar)\s+(?:un\s+)?(?:video|vídeo|documental|pel[ií]cula)\s+(?:de\s+)?\d+/i.test(act) ||
        /(?:video|vídeo)\s+(?:largo|extenso|completo)/i.test(act)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Contiene visualización de video extenso incompatible con una clase presencial activa.`);
    }

    // Detección de videos largos en recursos
    if (/(?:video|vídeo|documental|pel[ií]cula)\s*(?:de\s*)?(?:[1-9]\d+|[6-9])\s*(?:min|hora|h)/i.test(res) ||
        /(?:video|vídeo)\s+(?:largo|extenso|completo)/i.test(res)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Los recursos incluyen un video extenso o documental.`);
    }

    // Detección de software de pago o recursos inaccesibles
    if (/software\s+de\s+pago|licencia\s+de\s+pago|laboratorio\s+especializado/i.test(res)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Los recursos mencionan software de pago o inaccesible.`);
    }
  });

  return {
    isRealistic: issues.length === 0,
    issues
  };
}

/**
 * Normaliza un plan de clase para garantizar que todos los campos requeridos existan
 * con la estructura visual y de datos esperada, garantizando pedagogía activa y realizable.
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
    const rawActivity = found.activities || (idx === 0 ? 'Saludo institucional y activación de saberes previos con preguntas orientadoras en el tablero.' : idx === 1 ? 'Explicación dialogada del docente, modelado de ejemplos y taller práctico guiado en parejas.' : 'Síntesis grupal, retroalimentación del docente y asignación de trabajo autónomo.');
    const rawResources = found.resources || (idx === 0 ? 'Tablero, marcadores borrables, preguntas guía impresas' : idx === 1 ? 'Guía de ejercicios impresa, lecturas de apoyo, tablero y marcadores' : 'Tablero, apuntes de clase, campus virtual');

    // Saneamiento de pedagogía realista (elimina videos largos y actividades pasivas)
    const sanitizedActivity = sanitizeRealisticActivityText(rawActivity, phaseName);
    // Eliminación de tiempos embebidos en el texto descriptivo
    const cleanedActivity = stripTimeFromActivityText(sanitizedActivity);
    // Saneamiento de recursos para garantizar materiales 100% accesibles
    const cleanedResources = sanitizeRealisticResourceText(rawResources);

    return {
      date: (found.date || `Semana ${plan.week || fallbackWeek}`).trim(),
      phase: phaseName,
      topics: (found.topics || plan.weekTopic || fallbackTopic).trim(),
      activities: cleanedActivity.trim(),
      resources: cleanedResources.trim(),
      time: (found.time || (idx === 0 ? '15 min' : idx === 1 ? '50 min' : '20 min')).trim()
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
 * Crea un plan de clase por defecto con la plantilla oficial y recursos 100% accesibles.
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
        activities: 'Saludo institucional, presentación del tema y activación de conocimientos previos mediante lluvia de ideas y preguntas orientadoras en el tablero.',
        resources: 'Tablero, marcadores borrables, preguntas guía impresas',
        time: '15 min'
      },
      {
        date: `Semana ${week}`,
        phase: 'Desarrollo',
        topics: topic,
        activities: 'Explicación magistral dialogada y modelado por parte del docente, seguida de taller de ejercicios prácticos guiados y trabajo colaborativo en parejas.',
        resources: 'Guía de ejercicios impresa, lecturas de apoyo, tablero y marcadores',
        time: '55 min'
      },
      {
        date: `Semana ${week}`,
        phase: 'Cierre - Tarea',
        topics: 'Síntesis y evaluación',
        activities: 'Síntesis grupal de conceptos clave, retroalimentación del docente, resolución de dudas y asignación de actividades de aprendizaje autónomo.',
        resources: 'Tablero, apuntes de clase, campus virtual',
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
${rows.map(r => `| ${r.date} | ${r.phase} | ${r.topics} | ${stripTimeFromActivityText(sanitizeRealisticActivityText(r.activities, r.phase))} | ${sanitizeRealisticResourceText(r.resources)} | ${r.time} |`).join('\n')}
---------------------------------------------------------------------------------------------------------`;
}

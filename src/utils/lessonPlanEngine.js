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
1. PROHIBICIÓN TOTAL Y ABSOLUTA DE VIDEOS (CERO VIDEOS):
   - Queda TERMINANTEMENTE PROHIBIDO incluir cualquier video, documental, película, clip, videotutorial o reproducción audiovisual (NADA de videos de ninguna duración, ni de 2 min, ni de 15, ni de 60, ni de 90 minutos; CERO VIDEOS).
   - Los estudiantes universitarios NO van al salón a sentarse a mirar una pantalla. La clase universitaria NO es una sesión de cine ni de televisión.
   - NUNCA uses un video como recurso, contenido ni sustituto de la clase. CERO menciones a videos, YouTube o proyecciones audiovisuales.
2. RECURSOS 100% ACCESIBLES Y REALES PARA EL AULA FÍSICA ESTÁNDAR:
   - Prohibido exigir proyectores indispensables, pantallas de video, televisores, equipos de sonido, computadores o tablets obligatorias por estudiante en el aula, software de pago, licencias privativas costosas, plataformas especializadas inaccesibles o equipos de laboratorio inexistentes en un aula estándar.
   - Emplea exclusivamente recursos cotidianos, accesibles y reales del aula física: tablero (pizarra), marcadores borrables, guías de ejercicios impresas, fotocopias, lecturas breves en papel, hojas de trabajo, cuadernos de apuntes y campus virtual institucional (exclusivamente para tareas asincrónicas).
3. PEDAGOGÍA ACTIVA: EL DOCENTE ENSEÑA Y LOS ESTUDIANTES PRACTICAN EN EL AULA:
   - En Inicio: El docente lidera la bienvenida, contextualización y activación de saberes previos o rompehielos corto (10 a 15 min máximo) con preguntas orientadoras en el tablero o lluvia de ideas participativa.
   - En Desarrollo: El docente realiza la explicación magistral dialogada y modela los conceptos clave en el tablero; luego los estudiantes realizan ejercicios prácticos, análisis de casos en parejas, talleres colaborativos con guías impresas o dinámicas activas de aplicación directa en el aula. El docente circula, asesora y retroalimenta activamente.
   - En Cierre - Tarea: Síntesis formativa en el tablero, verificación oral de aprendizajes (preguntas de comprobación), retroalimentación del docente y asignación puntual de trabajo autónomo en el campus virtual.
4. CREACIÓN COMPLETA DE MATERIAL DIDÁCTICO ESPECÍFICO (didacticMaterials):
   - Si en la planeación se especifica que se necesita material didáctico (guías de ejercicios, lecturas técnicas, talleres prácticos en parejas, fichas de análisis de casos, cuestionarios formativos o rúbricas), DEBES CREAR Y REDACTAR EL CONTENIDO COMPLETO Y LISTO PARA IMPRIMIR de cada uno de ellos en el arreglo "didacticMaterials".
   - Cada material didáctico debe contener texto completo, profesional y pedagógico (instrucciones, preguntas, ejercicios prácticos numerados y criterios). ¡Cero texto incompleto, cero placeholders y cero videos!

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
      "resources": "Recursos accesibles para Inicio (tablero, marcadores, preguntas guía impresas)${icebreakerResources ? ` (incluyendo: ${icebreakerResources.trim()})` : ''}",
      "time": "${inicioMins} min"
    },
    {
      "date": "Semana ${week}",
      "phase": "Desarrollo",
      "topics": "Temas centrales, vocabulario y estructuras clave",
      "activities": "Actividades detalladas de Desarrollo (Presentation & Practice: explicación dialogada del docente, modelado en tablero, taller práctico colaborativo en parejas con guía impresa - PROHIBIDO videos de cualquier tipo o sesiones de pantalla - SIN incluir minutos ni duración aquí)",
      "resources": "Recursos de desarrollo accesibles y cotidianos (guías de trabajo impresas, lecturas breves, tablero, marcadores borrables - CERO videos)",
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
  ],
  "didacticMaterials": [
    {
      "id": "mat_1",
      "title": "Título completo del material (ej: Guía de Ejercicios Prácticos: ${topic})",
      "type": "Guía de ejercicios",
      "phase": "Desarrollo",
      "description": "Descripción clara de cómo se utiliza el material en el aula con los estudiantes.",
      "content": "Contenido pedagógico completo, redactado minuciosamente con encabezado de la Universidad de Pamplona, instrucciones, ejercicios numerados 1, 2, 3... o lectura completa, listo para imprimir y repartir en el aula física."
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
11. CLASE 100% REALIZABLE Y ACTIVIDADES EN EL AULA: Cada actividad propuesta debe ser algo que el docente y los estudiantes universitarios puedan ejecutar físicamente en un aula presencial estándar. El docente enseña directamente en el tablero y los estudiantes resuelven, debaten y practican activamente.
12. PROHIBICIÓN TOTAL DE VIDEOS (CERO VIDEOS): Queda terminantemente prohibido incluir videos de cualquier tipo o duración (ni cortos ni largos), documentales, películas, tutoriales audiovisuales, YouTube o transmisiones. La sesión es 100% presencial, pedagógica y activa en el aula.
13. RECURSOS 100% ACCESIBLES: En "resources" usa únicamente materiales de fácil acceso y uso universal en la Universidad de Pamplona (tablero, marcadores borrables, fotocopias, guías impresas, lecturas de texto, apuntes de clase, campus virtual). Queda prohibido mencionar videos, pantallas, proyectores indispensables, televisores, parlantes, dispositivos por estudiante, software de pago ni plataformas inaccesibles.
14. CREACIÓN COMPLETA DE MATERIALES DIDÁCTICOS (didacticMaterials): Si en las filas de la planeación se menciona que se requiere una guía, lectura, taller, ficha o rúbrica, DEBES redáctarla de principio a fin en el arreglo "didacticMaterials". Cada material debe ser rico en contenido, pedagógicamente impecable y listo para imprimir sin requerir redacción adicional.`;
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
 * Detecta y sanea actividades que propongan cualquier tipo de video o sesión pasiva de pantalla,
 * transformándolas en dinámicas pedagógicas 100% activas, realistas y realizables en el aula
 * presencial, guiadas por la explicación del docente y práctica de los estudiantes con guías y tablero.
 */
export function sanitizeRealisticActivityText(text = '', phase = 'Desarrollo') {
  if (typeof text !== 'string') return '';
  let cleaned = text;

  const videoRegex = /\b(?:videos?|vídeos?|videotutorial(?:es)?|documental(?:es)?|pel[ií]culas?|cortometraj(?:es)?|largometraj(?:es)?|filmes?|cine[- ]?foros?|grabaci[oó]n(?:es)?|clips?|audiovisual(?:es)?|youtube|vimeo|netflix)\b/i;

  if (videoRegex.test(cleaned)) {
    // 1. Frases verbales completas: Sujeto opcional (el docente / los estudiantes) + verbo de ver/proyectar + video + adjetivo opcional + duración opcional + youtube opcional
    cleaned = cleaned.replace(
      /(?:(?:el|la)\s+docente\s+|los\s+estudiantes\s+|las\s+estudiantes\s+|el\s+grupo\s+)?(?:van\s+a\s+|se\s+procede\s+a\s+)?(?:ver|ve|ven|viendo|observar|observa|observan|observando|mirar|mira|miran|mirando|visualizar|visualiza|visualizan|visualizando|reproducir|reproduce|reproducen|reproduciendo|proyectar|proyecta|proyectan|proyectando|presentar|presenta|presentan|presentando|mostrar|muestra|muestran|mostrando|analizar|analiza|analizan|analizando)\s+(?:un\s+|el\s+|la\s+)?(?:video|vídeo|documental|pel[ií]cula|videotutorial|cortometraje|clip|grabaci[oó]n|filme|cine[- ]?foro|material\s+audiovisual)(?:\s+(?:explicativo|did[aá]ctico|introductorio|corto|breve|animado|interactivo|institucional))?(?:\s+(?:de\s+)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo))?(?:\s+(?:en|de)\s+youtube)?/gi,
      () => {
        if (/inicio/i.test(phase)) {
          return 'Activación de saberes previos y preguntas orientadoras en el tablero';
        } else if (/cierre/i.test(phase)) {
          return 'Síntesis colaborativa en el tablero y retroalimentación del docente';
        }
        return 'Explicación dialogada y modelado por parte del docente en el tablero con ejercicios prácticos';
      }
    );

    // 2. Frases tipo 'a partir de un video...' o 'con base en el video...'
    cleaned = cleaned.replace(
      /(?:a\s+partir\s+de|con\s+base\s+en|a\s+trav[eé]s\s+de|luego\s+de\s+ver|despu[eé]s\s+de\s+ver)\s+(?:un\s+|el\s+)?(?:video|vídeo|documental|pel[ií]cula|videotutorial|clip)(?:\s+(?:explicativo|did[aá]ctico|introductorio|corto|breve|en\s+youtube))?/gi,
      'a partir de la explicación dialogada y ejemplos del docente en el tablero'
    );

    // 3. Inicio de oración o tras punto: 'Video sobre...' o 'Videotutorial de...'
    cleaned = cleaned.replace(
      /(?:^|\.\s+)(?:un\s+|el\s+)?(?:video|vídeo|videotutorial|documental|cortometraje|clip)\s*(?:explicativo|did[aá]ctico|introductorio|corto|breve)?\s*(?:sobre|de|acerca\s+de)\s+/gi,
      (match) => {
        const prefix = match.startsWith('.') ? '. ' : '';
        return prefix + 'Lectura guiada y explicación en el tablero sobre ';
      }
    );

    // 4. Frases tipo 'con video didáctico...'
    cleaned = cleaned.replace(
      /(?:con|mediante|utilizando)\s+(?:un\s+|el\s+)?(?:video|vídeo|videotutorial|documental|clip)\s*(?:explicativo|did[aá]ctico|introductorio|corto|breve)?/gi,
      'mediante guía de trabajo impresa y análisis en el tablero'
    );

    // 5. Limpieza residual de menciones a YouTube y videos
    cleaned = cleaned
      .replace(/(?:,\s*)?(?:en|de|a\s+través\s+de|mediante|enlace\s+a)\s+youtube(?:\.com)?/gi, '')
      .replace(/\byoutube(?:\.com)?\b/gi, 'material didáctico impreso')
      .replace(/(?:un\s+|el\s+)?(?:video|vídeo|videotutorial|documental|cortometraje|clip|audiovisual)\b/gi, 'guía práctica')
      .replace(/\b(?:videos|vídeos|videotutoriales|documentales|cortometrajes|clips)\b/gi, 'ejercicios prácticos');
  }

  // Limpieza de puntuación y espacios redundantes
  cleaned = cleaned
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Asegurar mayúscula inicial
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

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
 * Detecta y sanea recursos que sean inaccesibles, costosos, equipos de proyección o videos,
 * asegurando materiales cotidianos y 100% reales para el aula universitaria estándar
 * (tablero, marcadores borrables, guías impresas, fotocopias, apuntes).
 */
export function sanitizeRealisticResourceText(text = '') {
  if (typeof text !== 'string') return 'Tablero, marcadores borrables, guía de estudio impresa';
  let cleaned = text;

  // 1. Reemplazar equipos de proyección, sonido y pantallas primero (evita colisiones con 'video')
  cleaned = cleaned
    .replace(/\b(?:videobeam|video\s*beam|proyector(?:es)?|pantallas?\s+(?:gigante|inteligente|t[aá]ctil|interactiva|plana|led|lcd)?|smart\s*tv|smartboard|pizarra\s+digital|televisor(?:es)?|tv|parlantes?|bafles?|altavoces?|equipo\s+de\s+sonido|aud[ií]fonos?)\b/gi, 'tablero y marcadores borrables')
    .replace(/\bpantallas?\b/gi, 'tablero');

  // 2. Reemplazar videos y plataformas audiovisuales completas
  cleaned = cleaned
    .replace(/(?:un\s+|el\s+)?(?:video|vídeo|documental|pel[ií]cula|videotutorial|cortometraje|clip)(?:\s+(?:explicativo|did[aá]ctico|introductorio|interactivo|ilustrativo|informativo|extenso|largo|completo))?(?:\s+(?:de\s+)?(?:\d+\s*(?:minutos?|mins?|horas?|hrs?|h)|largo|extenso|completo))?(?:\s+(?:en|de)\s+youtube)?/gi, 'Guía de ejercicios y lecturas impresas')
    .replace(/(?:enlace\s+(?:a\s+)?)?youtube(?:\.com)?/gi, 'material didáctico institucional')
    .replace(/\b(?:vimeo|netflix|tiktok)\b/gi, 'material de lectura impreso')
    .replace(/\b(?:videos?|vídeos?|documentales?|pel[ií]culas?|videotutoriales?|audiovisual(?:es)?)\b/gi, 'guías impresas');

  // 3. Reemplazar diapositivas digitales por material impreso
  cleaned = cleaned
    .replace(/\bdiapositivas(?:\s+interactivas|\s+digitales|\s+en\s+powerpoint)?\b/gi, 'Guías de conceptos clave impresas');

  // 4. Reemplazar dispositivos requeridos por estudiante
  cleaned = cleaned
    .replace(/\b(?:laptops?|tablets?|computadores?|ordenadores?|tel[eé]fonos?|celulares?)\s+(?:de\s+los\s+estudiantes|individuales|por\s+estudiante|personales)\b/gi, 'cuadernos de apuntes y hojas de trabajo')
    .replace(/\b(?:laptops?|tablets?|computadores?\s+port[aá]tiles?)\b/gi, 'guías y fotocopias de trabajo');

  // 5. Reemplazar software de pago, suscripciones privativas y laboratorios de alta tecnología
  cleaned = cleaned
    .replace(/(?:licencias?\s+de\s+pago|software\s+de\s+pago|software\s+privativo|laboratorios?\s+especializados?|suscripci[oó]n(?:\s+costosa|\s+a\s+\w+)?|(?:terminal\s+)?bloomberg(?:\s+terminal)?|spss|matlab)\b/gi, 'Material impreso y recursos de libre acceso')
    .replace(/\b(?:conexi[oó]n\s+a\s+internet\s+obligatoria|internet\s+de\s+alta\s+velocidad)\b/gi, 'materiales impresos en el aula');

  // 6. Limpieza de conectores redundantes y puntuación
  cleaned = cleaned
    .replace(/\btablero\s+y\s+marcadores\s+borrables\s+y\s+tablero\s+y\s+marcadores\s+borrables\b/gi, 'tablero y marcadores borrables')
    .replace(/(?:Material impreso y recursos de libre acceso\s*)+/gi, 'Material impreso y recursos de libre acceso ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s*;\s*;+/g, '; ')
    .replace(/^[\s,;.-]+|[\s,;.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Deduplicar términos separados por comas
  const rawParts = cleaned.split(/\s*,\s*|\s*;\s*/).map(p => p.trim()).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const part of rawParts) {
    const key = part.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(part);
    }
  }
  cleaned = deduped.join(', ');

  if (!cleaned || cleaned.length < 4) {
    return 'Tablero, marcadores borrables, guía de ejercicios y material didáctico impreso';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Valida si una planeación de clase cumple con los criterios de ser 100% realizable,
 * activa y factible en un aula presencial estándar:
 * - CERO videos (ni largos ni cortos).
 * - CERO pantallas, proyectores indispensables ni equipos de sonido.
 * - CERO exigencias de laptops/tablets individuales por estudiante.
 * - CERO software de pago o licencias privativas.
 */
export function validateLessonPlanFeasibility(plan = {}) {
  const issues = [];
  const rows = Array.isArray(plan.rows) ? plan.rows : [];

  const videoRegex = /\b(?:videos?|vídeos?|documental(?:es)?|pel[ií]culas?|videotutorial(?:es)?|cortometraj(?:es)?|largometraj(?:es)?|filmes?|cine[- ]?foros?|grabaci[oó]n(?:es)?|clips?|audiovisual(?:es)?|youtube|vimeo|netflix)\b/i;
  const inaccessibleEquipmentRegex = /\b(?:proyector(?:es)?|videobeam|video\s*beam|pantallas?\s+(?:gigante|inteligente|t[aá]ctil|interactiva|plana|led|lcd)?|smart\s*tv|smartboard|pizarra\s+digital|televisor(?:es)?|tv|parlantes?|bafles?|altavoces?|equipo\s+de\s+sonido|aud[ií]fonos?)\b/i;
  const studentDevicesRegex = /\b(?:laptops?|tablets?|computadores?|ordenadores?|tel[eé]fonos?|celulares?)\s+(?:de\s+los\s+estudiantes|individuales|por\s+estudiante|personales)\b/i;
  const paidSoftwareRegex = /(?:licencias?\s+de\s+pago|software\s+de\s+pago|software\s+privativo|laboratorios?\s+especializados?|suscripci[oó]n(?:\s+costosa|\s+a\s+\w+)?|(?:terminal\s+)?bloomberg(?:\s+terminal)?|spss|matlab)\b/i;

  rows.forEach((r, idx) => {
    const act = (r.activities || '').trim();
    const res = (r.resources || '').trim();

    // Detección de cualquier mención a videos en actividades
    if (videoRegex.test(act)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Contiene mención a video o material audiovisual en las actividades (incompatible con la política de clase 100% realizable y activa sin videos).`);
    }

    // Detección de videos en recursos
    if (videoRegex.test(res)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Los recursos incluyen videos o plataformas audiovisuales.`);
    }

    // Detección de equipos audiovisuales o pantallas inaccesibles
    if (inaccessibleEquipmentRegex.test(res)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Los recursos requieren equipos de proyección, pantallas o sonido inaccesibles en un aula física estándar.`);
    }

    // Detección de dispositivos requeridos por estudiante
    if (studentDevicesRegex.test(res) || studentDevicesRegex.test(act)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Exige dispositivos individuales (laptops/tablets) por estudiante en el aula.`);
    }

    // Detección de software de pago o licencias privativas
    if (paidSoftwareRegex.test(res)) {
      issues.push(`Fila ${idx + 1} (${r.phase}): Los recursos mencionan software de pago o licencias privativas.`);
    }
  });

  return {
    isRealistic: issues.length === 0,
    issues
  };
}

/**
 * Genera materiales didácticos completos (guías de trabajo, lecturas técnicas, talleres prácticos)
 * listos para imprimir y usar en el aula física presencial.
 */
export function generateDefaultDidacticMaterials(plan = {}) {
  const topic = (plan.weekTopic || 'Tema de la sesión').trim();
  const unit = (plan.unit || 'Unidad de Aprendizaje').trim();
  const week = plan.week || 1;

  return [
    {
      id: `mat_guide_${Date.now()}_1`,
      title: `Guía de Ejercicios y Taller Práctico: ${topic}`,
      type: 'Guía de ejercicios',
      phase: 'Desarrollo',
      description: 'Guía impresa para resolución en parejas durante la fase de desarrollo. Incluye ejercicios prácticos de aplicación directa y resolución colaborativa.',
      content: `UNIVERSIDAD DE PAMPLONA
FACULTAD DE CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS
GUÍA DE TRABAJO PRÁCTICO EN AULA
Asignatura: Inglés Técnico / Especializado | ${unit}
Semana: ${week} | Tema: ${topic}
Estudiantes (Pareja): ________________________________________________ Fecha: _____________

-----------------------------------------------------------------------------------------
INSTRUCCIONES GENERALES:
Resuelvan los siguientes ejercicios de manera colaborativa en parejas de 2 estudiantes en el aula de clase.
Tiempo estimado: 40 minutos.
Al finalizar, el docente liderará una sesión de socialización y resolución en el tablero.
-----------------------------------------------------------------------------------------

SECCIÓN 1: CONCEPTOS FUNDAMENTALES Y VOCABULARIO TÉCNICO
1. Con base en la explicación del docente en el tablero, definan con precisión técnica los siguientes términos esenciales vinculados a "${topic}":
   a) Concepto Clave 1: _________________________________________________________________
   b) Concepto Clave 2: _________________________________________________________________
   c) Concepto Clave 3: _________________________________________________________________

2. Relacione cada principio con su aplicación en el análisis de ${topic}:
   [  ] Principio A: Identificación de variables determinantes
   [  ] Principio B: Medición de impacto y respuesta de los agentes
   [  ] Principio C: Evaluación de escenarios de equilibrio y ajuste

SECCIÓN 2: TALLER PRÁCTICO Y ANÁLISIS DE CASO
Lean detenidamente el siguiente caso de estudio y respondan las preguntas en su cuaderno o al respaldo de esta hoja:

"Una organización del sector productivo experimenta un cambio significativo en las condiciones de ${topic}. La administración debe presentar una propuesta técnica que permita optimizar los recursos disponibles, mitigar los riesgos operativos y fundamentar la toma de decisiones económicas ante un entorno de alta variabilidad."

Preguntas de aplicación práctica:
a) Identifiquen y describan 2 desafíos críticos que este escenario plantea para la organización.
b) Formulen una propuesta de solución estructurada en 3 pasos concretos, aplicando los conceptos de ${topic} vistos en clase.
c) ¿Cuál es el costo de oportunidad de la decisión adoptada? Justifiquen su respuesta técnica.

SECCIÓN 3: SÍNTESIS Y SOCIALIZACIÓN EN EL TABLERO
Cada pareja sintetizará su conclusión principal en una sola frase clave para ser compartida en la plenaria con el docente.`
    },
    {
      id: `mat_reading_${Date.now()}_2`,
      title: `Lectura Técnica de Análisis: Fundamentos de ${topic}`,
      type: 'Lectura técnica',
      phase: 'Desarrollo',
      description: 'Texto técnico estructurado para lectura comprensiva y discusión crítica en el aula física.',
      content: `UNIVERSIDAD DE PAMPLONA
DOCUMENTO DE LECTURA TÉCNICA Y ANÁLISIS CONCEPTUAL
Unidad: ${unit} | Tema Central: ${topic}
Material de lectura y discusión para la sesión presencial

1. INTRODUCCIÓN Y CONTEXTO DISCIPLINAR
El análisis riguroso de "${topic}" representa uno de los núcleos formativos fundamentales en la educación superior universitaria. En un entorno globalizado y altamente interconectado, la comprensión profunda de los mecanismos que articulan ${topic} faculta a los futuros profesionales para diagnosticar problemáticas complejas, evaluar alternativas estratégicas y emitir juicios fundamentados con solvencia metodológica.

2. DESARROLLO CONCEPTUAL Y DINÁMICAS OPERATIVAS
Desde la perspectiva teórica y empírica, ${topic} no opera como un elemento aislado, sino como parte de un sistema dinámico donde convergen múltiples variables socioeconómicas y técnicas. La interacción continua entre la oferta, la demanda y las restricciones estructurales exige que el análisis trascienda los síntomas superficiales para identificar las causas determinantes. Los modelos conceptuales discutidos por el docente demuestran que una adecuada modelación en el tablero permite anticipar desequilibrios y diseñar mecanismos de estabilización eficaces.

3. RELEVANCIA PROFESIONAL Y APLICACIÓN PRÁCTICA
El dominio de la terminología técnica bilingüe vinculada a este tema no solo potencia las competencias comunicativas especializadas, sino que constituye una ventaja competitiva esencial en la redacción de informes, la negociación comercial y el liderazgo de proyectos de desarrollo regional.

-----------------------------------------------------------------------------------------
CUESTIONARIO DE COMPROBACIÓN Y DEBATE:
1. ¿Cuál es el postulado central del texto respecto al rol de ${topic} en la toma de decisiones?
2. Expliquen la relación entre las variables analizadas y los mecanismos de ajuste explicados por el docente.
3. Propongan un ejemplo concreto de cómo se manifiesta este fenómeno en el contexto económico y social local.
4. Redacten una pregunta orientadora para plantearle al docente durante la sesión de preguntas y respuestas.`
    }
  ];
}

/**
 * Genera el prompt para diseñar o enriquecer un material didáctico específico con Gemini.
 */
export function buildGenerateMaterialPrompt({ plan, materialTitle = '', materialType = 'Guía de ejercicios', phase = 'Desarrollo' }) {
  const topic = plan?.weekTopic || 'Tema de clase';
  const unit = plan?.unit || 'Unidad de Aprendizaje';
  const week = plan?.week || 1;

  return `Eres un pedagogo universitario de alto nivel de la Universidad de Pamplona.
Diseña un MATERIAL DIDÁCTICO COMPLETO, PROFESIONAL, REALISTA Y LISTO PARA IMPRIMIR para la siguiente clase presencial:

- Semana: ${week}
- Unidad: ${unit}
- Tema: ${topic}
- Fase de la clase: ${phase}
- Tipo de material: ${materialType}
${materialTitle ? `- Título sugerido: ${materialTitle}` : ''}

REGLAS PEDAGÓGICAS ESTRICTAS (CLASE 100% REALIZABLE):
1. PROHIBICIÓN TOTAL DE VIDEOS (CERO VIDEOS): Queda terminantemente prohibido incluir videos, documentales, YouTube, proyectores indispensables ni enlaces audiovisuales.
2. RECURSOS DEL AULA FÍSICA: El material debe ser un documento impreso en papel (guía, taller, lectura o rúbrica) para resolver en el aula con lápiz, papel y tablero.
3. TEXTO COMPLETO Y DETALLADO: Redacta TODO el contenido del material: encabezado institucional de la Universidad de Pamplona, título, objetivos pedagógicos, instrucciones claras paso a paso, ejercicios numerados con preguntas concretas o lectura completa, espacios para respuestas y criterios claros. ¡CERO texto incompleto, cero "etc.", cero Lorem Ipsum!

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "title": "Título completo y formal del material didáctico",
  "type": "${materialType}",
  "phase": "${phase}",
  "description": "Breve explicación de 1 o 2 líneas de cómo se emplea en el aula",
  "content": "Texto completo y detallado del material, listo para imprimir..."
}`;
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

  // Procesamiento y aseguramiento de materiales didácticos completos
  let didacticMaterials = [];
  if (Array.isArray(plan.didacticMaterials) && plan.didacticMaterials.length > 0) {
    didacticMaterials = plan.didacticMaterials.map((m, mIdx) => {
      const rawContent = typeof m.content === 'string' ? m.content : (m.text || m.body || '');
      const cleanContent = stripTimeFromActivityText(sanitizeRealisticActivityText(rawContent, m.phase || 'Desarrollo'));
      return {
        id: String(m.id || `mat_${mIdx + 1}_${Date.now()}`),
        title: String(m.title || `Material Didáctico ${mIdx + 1}: ${plan.weekTopic || fallbackTopic}`).trim(),
        type: String(m.type || 'Guía de ejercicios').trim(),
        phase: String(m.phase || 'Desarrollo').trim(),
        description: String(m.description || 'Material didáctico para uso presencial en el aula.').trim(),
        content: cleanContent || `Guía de trabajo práctico para la sesión de ${plan.weekTopic || fallbackTopic}.`
      };
    });
  } else {
    didacticMaterials = generateDefaultDidacticMaterials({
      week: Number(plan.week || fallbackWeek) || 1,
      weekTopic: (plan.weekTopic || fallbackTopic).trim(),
      unit,
      learningPurpose
    });
  }

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
    didacticMaterials,
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
  const learningPurpose = `Identificar y aplicar los conceptos fundamentales de ${topic}.`;

  const defaultMaterials = generateDefaultDidacticMaterials({
    week,
    weekTopic: topic,
    unit,
    learningPurpose
  });

  return {
    id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    week: Number(week) || 1,
    weekTopic: topic,
    institution: 'Universidad de Pamplona',
    subject: '',
    teacher,
    course: '',
    unit,
    learningPurpose,
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
    didacticMaterials: defaultMaterials,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Exporta el plan de clase en texto plano / markdown estructurado,
 * incluyendo los materiales didácticos generados completos.
 */
export function formatLessonPlanAsMarkdown(plan) {
  if (!plan) return '';
  const rows = Array.isArray(plan.rows) ? plan.rows : [];
  const materials = Array.isArray(plan.didacticMaterials) ? plan.didacticMaterials : [];
  
  let md = `FORMATO PLANEACIÓN DE CLASE (SEMANAL)
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

  if (materials.length > 0) {
    md += `\n\n=========================================================================================================
MATERIALES DIDÁCTICOS DE LA CLASE (LISTOS PARA IMPRIMIR O USAR):
=========================================================================================================\n`;
    materials.forEach((mat, idx) => {
      md += `\n[MATERIAL ${idx + 1}] ${mat.title} (${mat.type} - Fase: ${mat.phase})\n`;
      md += `Descripción de uso: ${mat.description}\n`;
      md += `--- CONTENIDO IMPRESO / GUÍA COMPLETA ---\n`;
      md += `${mat.content}\n`;
      md += `-----------------------------------------------------------------------------------------\n`;
    });
  }

  return md;
}

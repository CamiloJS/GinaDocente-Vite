// src/utils/demoData.js
// Datos simulados y guías didácticas para el Modo Demo / Invitado de English TECH.
// Permite explorar la plataforma de manera realista sin consultar ni alterar la base de datos real.

export const DEMO_TASKS = [
  {
    id: 'demo-task-1',
    title: 'Assignment 3: Technology & Daily Life (Essay & Voice Note)',
    description: 'Welcome to Unit 3! In this assignment, write a short paragraph (120-150 words) discussing how artificial intelligence and smartphones have transformed our daily routines. Use at least two First Conditionals and two Second Conditionals.\n\n[color=blue]Bonus:[/color] Record a 45-second audio summarizing your main conclusion.',
    type: 'task',
    dueDate: '2026-10-25',
    dueTime: '23:59',
    createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 horas atrás
    isPinned: true,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: 'Inglés III - Grupo A',
    targetGroupId: 'demo_group_a',
    reactions: {
      user_1: { type: 'like', name: 'Carlos Mendoza', timestamp: Date.now() - 3600000 },
      user_2: { type: 'love', name: 'Laura Restrepo', timestamp: Date.now() - 2400000 },
      user_3: { type: 'celebrate', name: 'Mateo Gómez', timestamp: Date.now() - 1200000 },
    },
    comments: [
      {
        id: 'demo-com-1',
        author: 'Laura Restrepo',
        authorRole: 'student',
        userRole: 'student',
        text: 'Teacher, can we mention speech recognition apps as part of the examples?',
        timestamp: Date.now() - 1000 * 60 * 45,
        reactions: { teacher_gina: { type: 'heart', name: 'GinaDocente' } }
      },
      {
        id: 'demo-com-2',
        author: 'GinaDocente',
        authorRole: 'teacher',
        userRole: 'teacher',
        text: 'Absolutely Laura! Speech recognition and language learning apps fit perfectly into the topic.',
        timestamp: Date.now() - 1000 * 60 * 20,
        reactions: {}
      }
    ]
  },
  {
    id: 'demo-task-2',
    title: 'Encuesta Semanal: Tema para el próximo Speaking Club',
    description: 'Vota por la temática que prefieras debatir en nuestra sesión de conversación de este jueves a las 4:00 PM. ¡Tu participación suma puntos positivos!',
    type: 'poll',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: 'Global (Todos los semestres)',
    pollOptions: [
      { text: 'Artificial Intelligence & Future Careers', votes: 19, voters: ['user_1', 'user_2'] },
      { text: 'Cultural Differences & Traveling Disasters', votes: 12, voters: ['user_3'] },
      { text: 'Job Interview Simulations in English', votes: 15, voters: [] }
    ],
    reactions: {
      user_4: { type: 'like', name: 'Valeria Castro' },
      user_5: { type: 'celebrate', name: 'Andrés Suárez' }
    },
    comments: []
  },
  {
    id: 'demo-task-3',
    title: 'Resource: Connected Speech & Intonation Guide (Phonetics)',
    description: 'Here is a quick reference video explaining linking sounds (/r/ linking, vowel-to-vowel glide) and reduction in spoken English. Pay special attention to the rhythm patterns before presenting your oral quiz.',
    type: 'resource',
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: 'Inglés III - Grupo A',
    youtubeUrl: 'https://www.youtube.com/watch?v=0k5G6kZ8fV4',
    reactions: {
      user_6: { type: 'love', name: 'Sofía Ortiz' },
      user_7: { type: 'like', name: 'David Peña' }
    },
    comments: [
      {
        id: 'demo-com-3',
        author: 'David Peña',
        authorRole: 'student',
        userRole: 'student',
        text: 'This video clarifies the difference between weak and strong vowel forms very well!',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
        reactions: {}
      }
    ]
  },
  {
    id: 'demo-task-4',
    title: 'Foro Pedagógico: Experiencias con Aprendizaje Bilingüe',
    description: '¿Cuál ha sido la técnica o hábito que más te ha ayudado a perder el miedo a hablar en público en inglés? Comparte tu estrategia con tus compañeros.',
    type: 'forum',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: 'Global (Todos los semestres)',
    ratings: {
      user_1: { score: 5, name: 'Carlos Mendoza' },
      user_2: { score: 5, name: 'Laura Restrepo' }
    },
    comments: [
      {
        id: 'demo-com-4',
        author: 'Carlos Mendoza',
        authorRole: 'student',
        userRole: 'student',
        text: 'Shadowing podcasts in English while walking has really improved my pronunciation and confidence.',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        reactions: { user_2: { type: 'heart', name: 'Laura Restrepo' } }
      }
    ]
  }
];

export const DEMO_EVALUATIONS = [
  {
    id: 'demo-eval-1',
    title: 'Evaluación Diagnóstica B1 — Gramática y Vocabulario',
    description: 'Prueba modelo interactiva con selección múltiple, verdadero/falso, ordenar oración y relacionar columnas. Responde y observa el cálculo de nota en vivo.',
    targetGroupName: 'Inglés III - Grupo A',
    timeLimit: 20,
    dueDate: '2026-12-31',
    dueTime: '23:59',
    strictAntiCheat: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    questions: [
      {
        text: 'Choose the correct option: "While the teacher ______ the lesson, the internet connection suddenly failed."',
        type: 'multiple',
        options: [
          { text: 'was explaining', isCorrect: true },
          { text: 'explained', isCorrect: false },
          { text: 'is explaining', isCorrect: false },
          { text: 'has explained', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Indica si la afirmación es verdadera o falsa: "In English, the Past Continuous is used to express an action that was interrupted by a shorter action in Simple Past."',
        type: 'multiple',
        options: [
          { text: 'Verdadero', isCorrect: true },
          { text: 'Falso', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Ordena las palabras para formar una oración afirmativa correcta en Present Perfect Continuous:',
        type: 'order',
        words: ['She', 'has', 'been', 'studying', 'English', 'for', 'three', 'years'],
        points: 1
      },
      {
        text: 'Relaciona cada Phrasal Verb con su significado correspondiente:',
        type: 'match',
        pairs: [
          { left: 'Give up', right: 'Stop trying or surrender' },
          { left: 'Look forward to', right: 'Anticipate something with pleasure' },
          { left: 'Call off', right: 'Cancel an event or appointment' },
          { left: 'Break down', right: 'Stop functioning mechanically' }
        ],
        points: 1
      },
      {
        text: 'Escribe la forma correcta del verbo entre paréntesis en Second Conditional: "If I ______ (have) enough free time, I would travel around Europe."',
        type: 'written',
        correctAnswer: 'had',
        acceptedAnswers: ['had'],
        points: 1
      }
    ]
  },
  {
    id: 'demo-eval-2',
    title: 'Simulacro de Examen: Comprensión Lectora y Modales',
    description: 'Demostración de evaluación con cronómetro y modo de práctica sin registrar calificaciones oficiales.',
    targetGroupName: 'Inglés General',
    timeLimit: 15,
    dueDate: '2026-12-31',
    dueTime: '23:59',
    strictAntiCheat: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    questions: [
      {
        text: 'Which modal verb expresses strong prohibition?',
        type: 'multiple',
        options: [
          { text: 'You must not enter this restricted area.', isCorrect: true },
          { text: 'You might enter this area.', isCorrect: false },
          { text: 'You should enter this area.', isCorrect: false },
          { text: 'You could enter this area.', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Complete the sentence: "You ______ turn off your mobile phones during the official examination."',
        type: 'written',
        correctAnswer: 'must',
        acceptedAnswers: ['must', 'have to', 'should'],
        points: 1
      }
    ]
  }
];

export const DEMO_SYLLABUS = [
  {
    id: 'demo-syl-1',
    week: 1,
    title: 'Unit 1: Introductions, Needs Analysis & Diagnostic Assessment',
    topics: ['Diagnostic test', 'Course guidelines & grading criteria', 'Expressing habits and routines'],
    goals: 'Establish baseline English proficiency and master present perfect vs simple past.'
  },
  {
    id: 'demo-syl-2',
    week: 2,
    title: 'Unit 2: Narrative Tenses & Storytelling',
    topics: ['Past Simple vs Past Continuous', 'Past Perfect structures', 'Time linkers & sequencing connectors'],
    goals: 'Narrate complex past experiences with coherent discourse markers.'
  },
  {
    id: 'demo-syl-3',
    week: 3,
    title: 'Unit 3: Technology, Society & Conditionals',
    topics: ['Zero, First and Second Conditionals', 'Vocabulary: Technological innovation & AI ethics', 'Pronunciation: Connected speech'],
    goals: 'Debate hypothetical scenarios and argue points of view fluently.'
  },
  {
    id: 'demo-syl-4',
    week: 4,
    title: 'Unit 4: Professional Communication & Speaking Skills',
    topics: ['Formal email writing', 'Oral presentations and slide design', 'Pronunciation & voice recordings'],
    goals: 'Deliver academic and professional presentations with accurate intonation.'
  }
];

export const DEMO_GUIDE_TOUR = [
  {
    title: '📰 Muro y Actividades (Tasks)',
    badge: 'Centro de clase',
    description: 'Es el espacio principal donde la profesora Gina publica tareas, foros, avisos, videos educativos y encuestas interactivas. Los estudiantes pueden reaccionar con emojis, comentar dudas, escuchar narraciones en voz alta con inteligencia artificial y entregar sus evidencias.'
  },
  {
    title: '📝 Evaluaciones Inteligentes',
    badge: 'Calificación automática',
    description: 'Sistema completo de exámenes y quizzes que soporta selección múltiple, verdadero/falso, ordenar oraciones, relacionar columnas, comprensión auditiva (listening), dictado y speaking con micrófono. Califica al instante con tolerancia ortográfica (mayúsculas, tildes) y cuenta con un modo estricto anti-trampas.'
  },
  {
    title: '📚 Syllabus y Temario Académico',
    badge: 'Organización semanal',
    description: 'Estructuración curricular semana a semana con objetivos formativos, contenidos temáticos, actividades pedagógicas y fechas clave del semestre universitario.'
  },
  {
    title: '💬 Mensajería y Canales de Audio',
    badge: 'Comunicación en vivo',
    description: 'Permite chats privados entre docente y estudiante, grupos por materia, notas de voz grabadas directamente desde el navegador y llamadas de audio en tiempo real con WebRTC.'
  },
  {
    title: '🛠️ OVA Studio y Ruleta Didáctica',
    badge: 'Herramientas pedagógicas',
    description: 'Exclusivo para la docente: creador de Objetos Virtuales de Aprendizaje (OVA) interactivos, ruleta aleatoria para dinamizar la participación en clase y generador de evaluaciones asistido por IA (Gemini).'
  },
  {
    title: '🛡️ Seguridad y Reportes en Excel',
    badge: 'Gestión docente',
    description: 'Descarga en un clic de planillas completas en formato Excel (.xlsx) con desglose pregunta a pregunta, notas definitivas y retroalimentaciones para las actas universitarias.'
  }
];

export const DEMO_TAB_INFO = {
  tasks: {
    title: '📰 Muro de Asignaciones y Recursos',
    summary: 'Aquí la profesora Gina comparte las tareas, foros, encuestas en vivo y materiales multimedia. Los estudiantes entregan sus trabajos y reciben retroalimentación calificada.'
  },
  evaluaciones: {
    title: '📝 Módulo de Evaluaciones y Quizzes',
    summary: 'Pruebas diseñadas con múltiples tipos de preguntas (escritas, columnas, selección, listening y speaking). En este modo demo puedes probarlas libremente en simulacro.'
  },
  evaluations: {
    title: '📝 Módulo de Evaluaciones y Quizzes',
    summary: 'Pruebas diseñadas con múltiples tipos de preguntas (escritas, columnas, selección, listening y speaking). En este modo demo puedes probarlas libremente en simulacro.'
  },
  syllabus: {
    title: '📚 Plan de Estudios y Temario Semestral',
    summary: 'Visualiza la programación semana a semana del curso de inglés, metas de aprendizaje y competencias a desarrollar en la Universidad de Pamplona.'
  },
  reviews: {
    title: '🎯 Módulo de Repasos y Diapositivas',
    summary: 'Presentaciones interactivas y fichas de estudio para reforzar gramática, vocabulario y pronunciación antes de las pruebas evaluativas.'
  },
  groups: {
    title: '👥 Grupos Académicos por Semestre',
    summary: 'Organización de estudiantes por grupos de clase con códigos de acceso temporales y canales de comunicación específicos.'
  },
  profile: {
    title: '👤 Perfil de Estudiante',
    summary: 'Espacio personal con foto de perfil, publicaciones compartidas, evidencias entregadas y notas acumuladas.'
  },
  settings: {
    title: '⚙️ Ajustes y Preferencias',
    summary: 'Configuración de tema visual (Claro, Dim, Lights Out AMOLED), alertas sonoras personalizadas, notificaciones push y estado de conexión.'
  },
  tools: {
    title: '🛠️ Herramientas Docentes (OVA Studio & Ruleta)',
    summary: 'Panel de herramientas para crear Objetos Virtuales de Aprendizaje y dinamizar clases presenciales o remotas.'
  }
};

// src/utils/demoData.js
// Datos simulados y guías didácticas para el Modo Demo / Invitado de English TECH.
// Todo el contenido gira en torno a la materia demostrativa "Inglés Tecnico economico".

export const DEMO_SUBJECT_ID = 'demo_ing_tec_econ';
export const DEMO_SUBJECT_NAME = 'Inglés Tecnico economico';

export const DEMO_ACADEMIC_GROUPS = [
  {
    id: DEMO_SUBJECT_ID,
    name: DEMO_SUBJECT_NAME,
    description: 'Curso demostrativo de Inglés Técnico Económico: lectura de indicadores macroeconómicos, comercio internacional, estados financieros, análisis de mercados y negociación en inglés.',
    emoji: 'BookOpen',
    coverPattern: 'doodle-1',
    teacherId: 'teacher',
    createdBy: 'teacher',
    inviteCodes: [{ code: 'ECON26', expiresAt: null }],
    members: ['invitado', 'demo_guest', 'carlos_mendoza', 'laura_restrepo', 'mateo_gomez', 'valeria_castro'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30
  }
];

export const DEMO_TASKS = [
  {
    id: 'demo-task-1',
    title: 'Workshop 1: Macroeconomic Indicators & Inflation Report (Executive Summary & Audio)',
    description: 'Welcome to Inglés Tecnico economico! In this first workshop, analyze how Gross Domestic Product (GDP), Consumer Price Index (CPI), and central bank interest rates interact in an emerging economy.\n\n1. Write a short executive summary (120–150 words) using at least two First Conditionals and two Comparative structures.\n2. [color=blue]Oral Briefing:[/color] Record a 45-second voice note presenting your inflation forecast for the next quarter.',
    type: 'task',
    dueDate: '2026-12-15',
    dueTime: '23:59',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    isPinned: true,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    reactions: {
      carlos_mendoza: { type: 'like', name: 'Carlos Mendoza', timestamp: Date.now() - 3600000 },
      laura_restrepo: { type: 'love', name: 'Laura Restrepo', timestamp: Date.now() - 2400000 },
      mateo_gomez: { type: 'happy', name: 'Mateo Gómez', timestamp: Date.now() - 1200000 },
    },
    comments: [
      {
        id: 'demo-com-1',
        author: 'Laura Restrepo',
        authorRole: 'student',
        userRole: 'student',
        text: 'Teacher, can we compare the Colombian CPI trend with the US Federal Reserve interest rate decisions in our paragraph?',
        timestamp: Date.now() - 1000 * 60 * 45,
        reactions: { teacher: { emoji: '❤️', name: 'GinaDocente' } }
      },
      {
        id: 'demo-com-2',
        author: 'GinaDocente',
        authorRole: 'teacher',
        userRole: 'teacher',
        text: 'Excellent idea, Laura! Comparing domestic inflation with international monetary policy is a great way to apply technical economic vocabulary.',
        timestamp: Date.now() - 1000 * 60 * 20,
        reactions: {}
      }
    ]
  },
  {
    id: 'demo-task-2',
    title: 'Encuesta de Clase: Caso de Estudio para el Debate Económico del Viernes',
    description: 'Vota por la temática económica real que debatiremos en inglés durante nuestra próxima sesión sincrónica de Inglés Tecnico economico. ¡Tu voto define las lecturas del taller!',
    type: 'poll',
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    poll: {
      isMultipleChoice: false,
      options: [
        { id: 'opt_1', text: 'Global Supply Chains & International Trade Tariffs', voterIds: ['carlos_mendoza', 'laura_restrepo'] },
        { id: 'opt_2', text: 'Central Bank Interest Rates & Inflation Control', voterIds: ['mateo_gomez'] },
        { id: 'opt_3', text: 'Fintech, Digital Banking & Emerging Markets', voterIds: ['valeria_castro'] }
      ]
    },
    pollOptions: [
      { text: 'Global Supply Chains & International Trade Tariffs', votes: 2, voters: ['carlos_mendoza', 'laura_restrepo'] },
      { text: 'Central Bank Interest Rates & Inflation Control', votes: 1, voters: ['mateo_gomez'] },
      { text: 'Fintech, Digital Banking & Emerging Markets', votes: 1, voters: ['valeria_castro'] }
    ],
    reactions: {
      valeria_castro: { type: 'like', name: 'Valeria Castro' },
      carlos_mendoza: { type: 'wow', name: 'Carlos Mendoza' }
    },
    comments: []
  },
  {
    id: 'demo-task-3',
    title: 'Essential Glossary: Financial Statements, Market Trends & Economic Verbs',
    description: 'Material de estudio clave para la Unidad 2 de Inglés Tecnico economico. Repasa estos términos antes de presentar las evaluaciones de prueba y ver las diapositivas:\n\n• Bull Market vs. Bear Market: Mercado financiero en tendencia alcista vs. tendencia bajista.\n• Fiscal Policy vs. Monetary Policy: Política fiscal (impuestos y gasto público) vs. política monetaria (tasas de interés y oferta de dinero).\n• Key Financial Metrics: Gross Domestic Product (GDP), Revenue (ingresos brutos), Net Profit (utilidad neta), Liquidity (liquidez) & Trade Balance (balanza comercial).\n• Trend Verbs: Surge / Skyrocket (subir drásticamente), Climb / Rise (incrementar), Fluctuate (fluctuar), Plummet / Plunge (desplomarse).',
    type: 'post',
    createdAt: Date.now() - 1000 * 60 * 60 * 28,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    reactions: {
      laura_restrepo: { type: 'love', name: 'Laura Restrepo' },
      mateo_gomez: { type: 'like', name: 'Mateo Gómez' }
    },
    comments: [
      {
        id: 'demo-com-3',
        author: 'Mateo Gómez',
        authorRole: 'student',
        userRole: 'student',
        text: 'The distinction between "Surge" and "Fluctuate" helped me a lot when describing the exchange rate graph!',
        timestamp: Date.now() - 1000 * 60 * 60 * 10,
        reactions: {}
      }
    ]
  },
  {
    id: 'demo-task-4',
    title: 'Foro Calificable: Exchange Rate Volatility (USD/COP) & Local Exports',
    description: 'How does exchange rate volatility between the US Dollar (USD) and the Colombian Peso (COP) impact national exporters and importers? Write an analytical comment (80–120 words) in English using cause-and-effect connectors (therefore, consequently, due to, as a result).',
    type: 'forum',
    createdAt: Date.now() - 1000 * 60 * 60 * 52,
    author: 'GinaDocente',
    authorRole: 'teacher',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    ratings: {
      carlos_mendoza: { score: 5, name: 'Carlos Mendoza' },
      laura_restrepo: { score: 5, name: 'Laura Restrepo' }
    },
    comments: [
      {
        id: 'demo-com-4',
        author: 'Carlos Mendoza',
        authorRole: 'student',
        userRole: 'student',
        text: 'When the US dollar strengthens against the peso, coffee and flower exporters receive higher revenue in local currency; however, importing industrial machinery becomes significantly more expensive.',
        timestamp: Date.now() - 1000 * 60 * 60 * 36,
        reactions: { laura_restrepo: { emoji: '❤️', name: 'Laura Restrepo' } }
      }
    ]
  },
  {
    id: 'demo-task-kahoot-1',
    title: 'Kahoot en Vivo: Macroeconomics, Financial Markets & Trade Vocabulary',
    description: '¡Únete al Kahoot interactivo de Inglés Tecnico economico en pantalla completa! Las opciones aparecen de arriba hacia abajo con el texto completo en tu pantalla, música tensa en vivo, sonido de gong cuando todos responden y puntos extra por velocidad.',
    type: 'kahoot',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    author: 'GinaDocente',
    authorName: 'Prof. Gina Quintana',
    authorRole: 'teacher',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    kahoot: {
      pin: '749205',
      status: 'live',
      phase: 'lobby',
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      musicEnabled: true,
      allowNicknameChange: true,
      updatedAt: Date.now() - 1000 * 60 * 30,
      participants: {
        bot_carlos: {
          id: 'bot_carlos',
          realName: 'Carlos Mendoza',
          nickname: 'Carlos_FX 📈',
          avatar: '🦁',
          score: 1840,
          streak: 2,
          correctCount: 2,
          totalTimeMs: 4900,
          isSimulatedBot: true,
          answers: {}
        },
        bot_laura: {
          id: 'bot_laura',
          realName: 'Laura Restrepo',
          nickname: 'LauEcon ✨',
          avatar: '🦊',
          score: 1710,
          streak: 2,
          correctCount: 2,
          totalTimeMs: 6200,
          isSimulatedBot: true,
          answers: {}
        }
      },
      questions: [
        {
          id: 'kq_demo_1',
          type: 'quiz',
          text: 'Which term describes a financial market where asset prices are rising and investor confidence is high?',
          question: 'Which term describes a financial market where asset prices are rising and investor confidence is high?',
          timeLimit: 20,
          pointsMultiplier: 1,
          allowMultiple: false,
          imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200" viewBox="0 0 520 200"><rect width="520" height="200" rx="16" fill="%230f172a"/><text x="24" y="36" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="%23f8fafc">Market Index Confidence Trend (+24.8%)</text><polyline fill="none" stroke="%2310b981" stroke-width="5" points="40,160 130,138 210,144 300,98 390,72 480,42"/><circle cx="480" cy="42" r="6" fill="%2334d399"/></svg>',
          imageReveal: 'none',
          options: [
            { id: 'kq_demo_1_opt_0', text: 'A Bull Market (tendencia alcista sostenida)', isCorrect: true },
            { id: 'kq_demo_1_opt_1', text: 'A Bear Market (caída prolongada de precios)', isCorrect: false },
            { id: 'kq_demo_1_opt_2', text: 'A Liquidity Trap (trampa de liquidez monetaria)', isCorrect: false },
            { id: 'kq_demo_1_opt_3', text: 'A Tariff Embargo (restricción arancelaria)', isCorrect: false }
          ],
          correctAnswer: '',
          acceptedAnswers: [],
          puzzleItems: [],
          explanation: '"Bull Market" refers to a market on the rise where economic conditions are generally favorable.'
        },
        {
          id: 'kq_demo_2',
          type: 'truefalse',
          text: 'True or False: "Monetary policy" is controlled by the Central Bank through interest rates and money supply.',
          question: 'True or False: "Monetary policy" is controlled by the Central Bank through interest rates and money supply.',
          timeLimit: 20,
          pointsMultiplier: 1,
          allowMultiple: false,
          imageUrl: '',
          imageReveal: 'none',
          options: [
            { id: 'kq_demo_2_tf_0', text: 'True / Verdadero', isCorrect: true },
            { id: 'kq_demo_2_tf_1', text: 'False / Falso', isCorrect: false }
          ],
          correctAnswer: '',
          acceptedAnswers: [],
          puzzleItems: [],
          explanation: 'Central banks manage monetary policy, whereas governments manage fiscal policy (taxes and public spending).'
        },
        {
          id: 'kq_demo_3',
          type: 'type_answer',
          text: 'Type the 3-letter English acronym for "Gross Domestic Product" (Producto Interno Bruto):',
          question: 'Type the 3-letter English acronym for "Gross Domestic Product" (Producto Interno Bruto):',
          timeLimit: 20,
          pointsMultiplier: 2,
          allowMultiple: false,
          imageUrl: '',
          imageReveal: 'none',
          options: [],
          correctAnswer: 'GDP',
          acceptedAnswers: ['GDP', 'G.D.P.', 'Gross Domestic Product'],
          puzzleItems: [],
          explanation: 'GDP stands for Gross Domestic Product, the total monetary value of all finished goods and services made within a country.'
        },
        {
          id: 'kq_demo_4',
          type: 'puzzle',
          text: 'Order the words from top to bottom to form a grammatical economic sentence in English:',
          question: 'Order the words from top to bottom to form a grammatical economic sentence in English:',
          timeLimit: 30,
          pointsMultiplier: 2,
          allowMultiple: false,
          imageUrl: '',
          imageReveal: 'none',
          options: [],
          correctAnswer: '',
          acceptedAnswers: [],
          puzzleItems: [
            'Higher interest rates',
            'usually reduce',
            'consumer borrowing',
            'and control inflation.'
          ],
          explanation: 'Complete sentence: "Higher interest rates usually reduce consumer borrowing and control inflation."'
        }
      ]
    },
    reactions: {
      carlos_mendoza: { type: 'wow', name: 'Carlos Mendoza' },
      laura_restrepo: { type: 'love', name: 'Laura Restrepo' }
    },
    comments: []
  }
];

export const DEMO_EVALUATIONS = [
  {
    id: 'demo-eval-1',
    title: 'Parcial 1: Inglés Tecnico economico — Macroeconomics & Market Trends',
    description: 'Evaluación interactiva de prueba para la materia Inglés Tecnico economico. Incluye selección múltiple, verdadero/falso, ordenar oración, relacionar columnas y respuesta escrita con calificación instantánea.',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    timeLimit: 20,
    dueDate: '2026-12-31',
    dueTime: '23:59',
    strictAntiCheat: false,
    immediateFeedback: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    questions: [
      {
        text: 'Choose the correct economic term: "When the general price level of goods and services rises continuously and purchasing power falls, the economy is experiencing ______."',
        type: 'multiple',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="520" height="220" viewBox="0 0 520 220"><rect width="520" height="220" rx="16" fill="%23f8fafc"/><text x="24" y="34" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="%231e293b">Price Level vs. Purchasing Power Index</text><line x1="48" y1="180" x2="480" y2="180" stroke="%23cbd5e1" stroke-width="2"/><line x1="48" y1="50" x2="48" y2="180" stroke="%23cbd5e1" stroke-width="2"/><polyline fill="none" stroke="%23dc2626" stroke-width="4" points="65,160 165,132 265,102 365,76 460,56"/><polyline fill="none" stroke="%232563eb" stroke-width="3" stroke-dasharray="6,4" points="65,68 165,94 265,122 365,146 460,166"/><text x="345" y="52" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="%23dc2626">General Price Level (+)</text><text x="335" y="174" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="%232563eb">Purchasing Power (-)</text></svg>',
        options: [
          { text: 'inflation', isCorrect: true },
          { text: 'deflation', isCorrect: false },
          { text: 'tariff exemption', isCorrect: false },
          { text: 'budget surplus', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Indica si la afirmación es verdadera o falsa: "In English for Economics, Gross Domestic Product (GDP) measures the total monetary value of all final goods and services produced within a country during a specific period."',
        type: 'multiple',
        options: [
          { text: 'Verdadero', isCorrect: true },
          { text: 'Falso', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Ordena las palabras para formar una oración condicional correcta (First Conditional) sobre política monetaria:',
        type: 'order',
        words: ['If', 'interest', 'rates', 'increase,', 'borrowing', 'costs', 'will', 'rise'],
        points: 1
      },
      {
        text: 'Relaciona cada concepto de Inglés Tecnico economico con su definición exacta en inglés:',
        type: 'match',
        pairs: [
          { left: 'Supply and Demand', right: 'Relationship between availability and desire for goods' },
          { left: 'Trade Surplus', right: 'Economic state when exports exceed imports' },
          { left: 'Bull Market', right: 'Financial market where asset prices are rising' },
          { left: 'Central Bank', right: 'Institution that manages currency and interest rates' }
        ],
        points: 1
      },
      {
        text: 'Escribe la forma correcta del verbo en Simple Past: "Last year, foreign direct investment ______ (grow) by 4.8% thanks to new infrastructure projects."',
        type: 'text',
        correctAnswer: 'grew',
        acceptedAnswers: ['grew'],
        points: 1
      }
    ]
  },
  {
    id: 'demo-eval-2',
    title: 'Quiz 2: International Trade, Financial Reports & Listening',
    description: 'Prueba práctica de Inglés Tecnico economico con comprensión auditiva (Listening integrado), análisis de estados financieros y vocabulario de comercio exterior.',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    timeLimit: 15,
    dueDate: '2026-12-31',
    dueTime: '23:59',
    strictAntiCheat: false,
    immediateFeedback: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
    questions: [
      {
        text: 'Listen to the economic report and select the main reason why national exports increased:',
        type: 'listening',
        audioUrl: '/api/voz?tl=en&q=During%20the%20second%20quarter%2C%20national%20exports%20increased%20by%20twelve%20percent%20thanks%20to%20lower%20tariffs%20and%20higher%20agricultural%20production.',
        options: [
          { text: 'Lower tariffs and higher agricultural production', isCorrect: true },
          { text: 'Higher import taxes on domestic consumers', isCorrect: false },
          { text: 'A reduction in the industrial labor force', isCorrect: false },
          { text: 'The suspension of international trade agreements', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'In a company\'s Income Statement, what do we call the profit remaining after all operating expenses, taxes, and costs are subtracted from total revenue?',
        type: 'multiple',
        options: [
          { text: 'Net Profit (Net Income)', isCorrect: true },
          { text: 'Gross Liability', isCorrect: false },
          { text: 'Customs Duty', isCorrect: false },
          { text: 'Capital Depreciation', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Relaciona el verbo de tendencia financiera con su equivalente en español:',
        type: 'match',
        pairs: [
          { left: 'To skyrocket / surge', right: 'Dispararse o subir rápidamente' },
          { left: 'To plummet / plunge', right: 'Desplomarse o caer drásticamente' },
          { left: 'To fluctuate', right: 'Variar o fluctuar constantemente' },
          { left: 'To stabilize', right: 'Mantenerse estable sin cambios bruscos' }
        ],
        points: 1
      },
      {
        text: 'Escribe la sigla en inglés de 3 letras para "Producto Interno Bruto" (Gross Domestic Product):',
        type: 'text',
        correctAnswer: 'GDP',
        acceptedAnswers: ['GDP', 'gdp'],
        points: 1
      }
    ]
  },
  {
    id: 'demo-eval-3',
    title: 'Simulacro Anti-Trampas: Economic Negotiations & Modals',
    description: 'Demostración del sistema de seguridad académica (Modo Anti-trampas) aplicado a Inglés Tecnico economico. Detecta cambios de pestaña o pérdida de foco.',
    targetGroupName: DEMO_SUBJECT_NAME,
    targetGroupId: DEMO_SUBJECT_ID,
    timeLimit: 10,
    dueDate: '2026-12-31',
    dueTime: '23:59',
    strictAntiCheat: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    questions: [
      {
        text: 'Which modal verb expresses a mandatory legal or financial obligation in an international contract? "The importer ______ pay the customs tariff before the merchandise is released."',
        type: 'multiple',
        options: [
          { text: 'must', isCorrect: true },
          { text: 'might', isCorrect: false },
          { text: 'would', isCorrect: false },
          { text: 'could', isCorrect: false }
        ],
        points: 1
      },
      {
        text: 'Ordena las palabras para construir una propuesta de negociación comercial en Second Conditional:',
        type: 'order',
        words: ['We', 'would', 'sign', 'the', 'contract', 'if', 'prices', 'were', 'lower'],
        points: 1
      }
    ]
  }
];

export const DEMO_SYLLABUS = [
  {
    id: 'demo-syl-1',
    week: 1,
    unit: 'Unidad 1: Fundamentos de Economía y Mercados',
    topic: 'Introduction to Economic Terminology: Scarcity, Supply & Demand',
    description: 'Identificar y emplear el vocabulario fundamental de la microeconomía y macroeconomía en inglés. Comprensión de lectura sobre escasez, costo de oportunidad, leyes de oferta y demanda y punto de equilibrio del mercado usando Present Simple y Present Continuous.',
    keyConcepts: ['Scarcity', 'Opportunity Cost', 'Supply & Demand', 'Market Equilibrium', 'Present Simple vs. Continuous'],
    activities: 'Lectura guiada de reportes de mercado, creación de glosario técnico bilingüe y debate corto sobre precios de bienes básicos.',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  },
  {
    id: 'demo-syl-2',
    week: 2,
    unit: 'Unidad 1: Fundamentos de Economía y Mercados',
    topic: 'Macroeconomic Indicators: GDP, Inflation (CPI) & Unemployment Rates',
    description: 'Analizar indicadores macroeconómicos internacionales en inglés. Redacción de comparaciones entre economías emergentes y desarrolladas utilizando estructuras comparativas, superlativas y conectores de contraste.',
    keyConcepts: ['Gross Domestic Product (GDP)', 'Consumer Price Index (CPI)', 'Inflation & Deflation', 'Unemployment Rate', 'Comparatives & Superlatives'],
    activities: 'Taller práctico de análisis de tablas del Banco Mundial y FMI; grabación de nota de voz de 45 segundos sobre inflación.',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  },
  {
    id: 'demo-syl-3',
    week: 3,
    unit: 'Unidad 2: Análisis Financiero y Tendencias de Mercado',
    topic: 'Describing Market Trends, Financial Charts & Forecasting',
    description: 'Describir con precisión gráficos bursátiles, variaciones de tasas de cambio (USD/COP) y proyecciones financieras empleando verbos de movimiento (surge, climb, fluctuate, plummet) y adverbios de grado (sharply, steadily, slightly).',
    keyConcepts: ['Bull & Bear Markets', 'Trend Verbs (Surge, Plummet)', 'Adverbs of Degree', 'Exchange Rate Volatility', 'Past Simple vs. Present Perfect'],
    activities: 'Interpretación escrita y oral de gráficas reales de comercio exterior y precios de materias primas (commodities).',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  },
  {
    id: 'demo-syl-4',
    week: 4,
    unit: 'Unidad 2: Análisis Financiero y Tendencias de Mercado',
    topic: 'Financial Statements: Balance Sheet, Income Statement & Cash Flow',
    description: 'Interpretar los tres estados financieros básicos de una organización en inglés: activos, pasivos, patrimonio, ingresos brutos, costos operativos y utilidad neta (Revenue, Expenses, Net Profit & EBITDA).',
    keyConcepts: ['Assets & Liabilities', 'Balance Sheet', 'Income Statement', 'Revenue & Net Profit', 'Liquidity & Solvency'],
    activities: 'Caso de estudio sobre el reporte anual de una empresa multinacional y quiz interactivo de vocabulario contable.',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  },
  {
    id: 'demo-syl-5',
    week: 5,
    unit: 'Unidad 3: Política Económica y Comercio Internacional',
    topic: 'Fiscal Policy, Monetary Policy & Central Banking Decisions',
    description: 'Formular hipótesis y proyecciones económicas sobre tasas de interés, impuestos y gasto público mediante el uso de Zero, First y Second Conditionals aplicados a escenarios de política económica.',
    keyConcepts: ['Monetary Policy', 'Fiscal Policy', 'Interest Rates', 'First & Second Conditionals', 'Cause & Effect Connectors'],
    activities: 'Simulación del comité de un Banco Central en inglés y participación argumentativa en el foro calificable.',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  },
  {
    id: 'demo-syl-6',
    week: 6,
    unit: 'Unidad 3: Política Económica y Comercio Internacional',
    topic: 'International Trade, Tariffs, Free Trade Agreements & Pitching',
    description: 'Dominar el lenguaje de las negociaciones comerciales internacionales, aranceles, balanza comercial (Trade Surplus / Deficit) y presentación ejecutiva de proyectos económicos en inglés.',
    keyConcepts: ['Imports & Exports', 'Tariffs & Quotas', 'Free Trade Agreements (FTA)', 'Trade Balance', 'Executive Pitching'],
    activities: 'Presentación oral con diapositivas sobre oportunidades de exportación y sustentación final del curso.',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME
  }
];

export const DEMO_REVIEWS = [
  {
    id: 'demo-rev-1',
    topic: 'Macroeconomic Indicators: GDP, Inflation & Monetary Policy',
    language: 'Inglés',
    slideCount: 5,
    author: 'Gina Marcela',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    slides: [
      {
        id: 1,
        layout: 'title',
        title: 'Macroeconomic Indicators: GDP, Inflation & Monetary Policy',
        subtitle: 'Inglés Tecnico economico • Unit 1 Interactive Presentation',
        description: 'Essential concepts and grammatical structures to analyze national and global economic performance in English.'
      },
      {
        id: 2,
        layout: 'cards',
        title: 'Core Macroeconomic Metrics',
        cards: [
          {
            title: 'Gross Domestic Product (GDP)',
            text: 'The total monetary value of all final goods and services produced within a country’s borders in a specific time period.',
            example: 'Colombia’s GDP grew by 2.8% in the third quarter due to stronger domestic consumption.'
          },
          {
            title: 'Inflation & CPI',
            text: 'Inflation is the sustained increase in general price levels, measured through the Consumer Price Index (CPI).',
            example: 'When inflation rises sharply, consumers’ purchasing power decreases.'
          },
          {
            title: 'Unemployment Rate',
            text: 'The percentage of the total labor force that is jobless and actively seeking employment.',
            example: 'New industrial investments helped reduce the urban unemployment rate.'
          }
        ]
      },
      {
        id: 3,
        layout: 'bullets',
        title: 'Monetary Policy vs. Fiscal Policy',
        bullets: [
          {
            title: 'Monetary Policy (Central Bank)',
            text: 'Controls the money supply and interest rates to keep inflation under control and ensure currency stability.',
            example: 'If the Central Bank raises interest rates, commercial loans become more expensive.'
          },
          {
            title: 'Fiscal Policy (Government)',
            text: 'Uses taxation (impuestos) and public spending (gasto público) to influence economic growth.',
            example: 'Higher public investment in infrastructure stimulates job creation.'
          },
          {
            title: 'Trade Balance (Exports vs. Imports)',
            text: 'A Trade Surplus occurs when exports exceed imports; a Trade Deficit occurs when imports are higher.',
            example: 'Agricultural exports generated a trade surplus this month.'
          }
        ]
      },
      {
        id: 4,
        layout: 'cards',
        title: 'Conditionals in Economic Forecasting',
        cards: [
          {
            title: 'First Conditional (Real Forecast)',
            text: 'Used for likely economic outcomes based on current data: If + Present Simple, will + Verb.',
            example: 'If inflation slows down next month, the Central Bank will cut interest rates.'
          },
          {
            title: 'Second Conditional (Hypothetical Scenario)',
            text: 'Used for hypothetical economic modeling: If + Past Simple, would + Verb.',
            example: 'If tariffs were eliminated completely, regional trade volume would double.'
          }
        ]
      },
      {
        id: 5,
        layout: 'quiz',
        title: 'Quick Check: Macroeconomic Concepts',
        question: 'Which economic indicator measures the total monetary value of all final goods and services produced within a country?',
        options: [
          { text: 'Consumer Tariff Quota (CTQ)', isCorrect: false, explanation: 'Tariff quotas only apply to specific imported goods.' },
          { text: 'Gross Domestic Product (GDP)', isCorrect: true, explanation: 'Correct! GDP (Producto Interno Bruto) measures total domestic production of final goods and services.' },
          { text: 'Fixed Asset Depreciation', isCorrect: false, explanation: 'Depreciation refers to the loss of value of physical assets over time.' },
          { text: 'Central Bank Reserve Ratio', isCorrect: false, explanation: 'Reserve ratio is a banking regulation tool, not total production.' }
        ]
      }
    ]
  },
  {
    id: 'demo-rev-2',
    topic: 'Describing Market Trends, Financial Charts & Exchange Rates',
    language: 'Inglés',
    slideCount: 5,
    author: 'Gina Marcela',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    slides: [
      {
        id: 1,
        layout: 'title',
        title: 'Describing Market Trends, Financial Charts & Exchange Rates',
        subtitle: 'Inglés Tecnico economico • Unit 2 Visual Guide',
        description: 'Master the verbs, nouns, and adverbs used by economists to present financial charts and market movements.'
      },
      {
        id: 2,
        layout: 'cards',
        title: 'Upward vs. Downward Movement Verbs',
        cards: [
          {
            title: 'Upward Trends (Subidas)',
            text: 'To rise, to increase, to climb, to grow, to surge (subir fuerte), to skyrocket (dispararse).',
            example: 'Tech stock prices surged by 14% after the quarterly earnings report.'
          },
          {
            title: 'Downward Trends (Caídas)',
            text: 'To fall, to decrease, to decline, to drop, to plunge / plummet (desplomarse).',
            example: 'Oil prices plummeted last week due to lower global industrial demand.'
          },
          {
            title: 'Stability & Volatility',
            text: 'To remain stable, to level off (estabilizarse), to fluctuate (fluctuar), to recover (recuperarse).',
            example: 'The USD/COP exchange rate fluctuated between 4,100 and 4,250 pesos.'
          }
        ]
      },
      {
        id: 3,
        layout: 'bullets',
        title: 'Adverbs of Degree & Speed in Financial Reports',
        bullets: [
          {
            title: 'Dramatic / Rapid Changes',
            text: 'Sharply, dramatically, significantly, steeply, rapidly (cambios bruscos o muy marcados).',
            example: 'Foreign investment increased significantly during the first semester.'
          },
          {
            title: 'Moderate / Consistent Changes',
            text: 'Steadily, gradually, moderately, consistently (cambios constantes y progresivos).',
            example: 'Household savings have grown steadily over the past three years.'
          },
          {
            title: 'Small / Minor Changes',
            text: 'Slightly, marginally, minimally (variaciones leves).',
            example: 'Interest rates fell slightly by 0.25 percentage points.'
          }
        ]
      },
      {
        id: 4,
        layout: 'cards',
        title: 'Bull Market vs. Bear Market',
        cards: [
          {
            title: 'Bull Market (Mercado Alcista)',
            text: 'A financial market condition in which asset prices are rising or are expected to rise, driven by investor optimism.',
            example: 'Strong corporate profits fueled a five-year bull market.'
          },
          {
            title: 'Bear Market (Mercado Bajista)',
            text: 'A market condition marked by prolonged price declines (typically 20% or more) and widespread pessimism.',
            example: 'Investors shifted to government bonds to protect capital during the bear market.'
          }
        ]
      },
      {
        id: 5,
        layout: 'quiz',
        title: 'Quick Check: Describing Graphs',
        question: 'Choose the best sentence to describe a sudden, very large drop in stock prices:',
        options: [
          { text: 'Stock prices climbed steadily throughout the morning.', isCorrect: false, explanation: '"Climbed steadily" means a gradual upward increase.' },
          { text: 'Stock prices remained stable without any fluctuation.', isCorrect: false, explanation: '"Remained stable" indicates no significant movement.' },
          { text: 'Stock prices plummeted sharply after the announcement.', isCorrect: true, explanation: 'Correct! "Plummeted sharply" accurately describes a sudden, steep downward drop.' },
          { text: 'Stock prices rose marginally by half a percent.', isCorrect: false, explanation: '"Rose marginally" describes a tiny increase.' }
        ]
      }
    ]
  },
  {
    id: 'demo-rev-3',
    topic: 'International Trade, Financial Statements & Business Negotiations',
    language: 'Inglés',
    slideCount: 4,
    author: 'Gina Marcela',
    targetGroupId: DEMO_SUBJECT_ID,
    targetGroupName: DEMO_SUBJECT_NAME,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    slides: [
      {
        id: 1,
        layout: 'title',
        title: 'International Trade, Financial Statements & Negotiations',
        subtitle: 'Inglés Tecnico economico • Unit 3 Executive Deck',
        description: 'Key vocabulary for reading Balance Sheets, Income Statements, and negotiating international trade agreements.'
      },
      {
        id: 2,
        layout: 'cards',
        title: 'Reading Financial Statements in English',
        cards: [
          {
            title: 'Balance Sheet (Balance General)',
            text: 'Shows a company’s Assets (activos), Liabilities (pasivos), and Shareholders’ Equity (patrimonio) at a specific date.',
            example: 'Total Assets = Liabilities + Shareholders’ Equity.'
          },
          {
            title: 'Income Statement (Estado de Resultados)',
            text: 'Summarizes Revenue (ingresos), Operating Expenses (gastos operativos), and Net Profit (utilidad neta).',
            example: 'The exporter achieved a 15% Net Profit margin this fiscal year.'
          },
          {
            title: 'Cash Flow Statement (Flujo de Caja)',
            text: 'Tracks the actual inflow and outflow of cash from operations, investments, and financing.',
            example: 'Positive cash flow ensures high liquidity to pay short-term debts.'
          }
        ]
      },
      {
        id: 3,
        layout: 'bullets',
        title: 'International Trade & Customs Terminology',
        bullets: [
          {
            title: 'Tariffs & Customs Duties (Aranceles)',
            text: 'Taxes imposed by a government on goods and services imported from other countries.',
            example: 'Free Trade Agreements (FTAs) reduce or eliminate customs tariffs between partner nations.'
          },
          {
            title: 'Comparative Advantage (Ventaja Comparativa)',
            text: 'An economy’s ability to produce a particular good or service at a lower opportunity cost than its trading partners.',
            example: 'Colombia holds a strong comparative advantage in specialty coffee production.'
          }
        ]
      },
      {
        id: 4,
        layout: 'quiz',
        title: 'Quick Check: Financial Statements',
        question: 'In an Income Statement, what is the term for the total money earned from sales BEFORE deducting any expenses?',
        options: [
          { text: 'Revenue (or Gross Sales)', isCorrect: true, explanation: 'Correct! Revenue is the "top line" income before subtracting costs and expenses to get Net Profit.' },
          { text: 'Long-term Liabilities', isCorrect: false, explanation: 'Liabilities are debts and financial obligations owed to others.' },
          { text: 'Customs Tariff', isCorrect: false, explanation: 'A tariff is a tax on imports/exports.' },
          { text: 'Capital Deficit', isCorrect: false, explanation: 'A deficit occurs when expenses or imports exceed income or exports.' }
        ]
      }
    ]
  }
];

export const DEMO_GUIDE_TOUR = [
  {
    title: '📰 Muro de Clase (Inglés Tecnico economico)',
    badge: 'Publicaciones y Tareas',
    description: 'Es el centro de la materia "Inglés Tecnico economico". Aquí la profesora Gina publica talleres, glosarios financieros, foros calificables y encuestas interactivas. Puedes escuchar la pronunciación en voz alta con IA, votar en encuestas, reaccionar con emojis y probar los comentarios.'
  },
  {
    title: '📝 Evaluaciones de Prueba',
    badge: 'Calificación automática',
    description: 'Incluye 3 exámenes demostrativos de "Inglés Tecnico economico" listos para resolver: selección múltiple, verdadero/falso, ordenar oraciones, relacionar columnas, respuesta escrita, Listening con audio integrado y demostración del modo estricto anti-trampas.'
  },
  {
    title: '📊 Diapositivas Demo (.PPTX)',
    badge: 'Presentaciones interactivas',
    description: 'Explora 3 presentaciones completas de "Inglés Tecnico economico" con tarjetas de conceptos, listas clave y quizzes integrados. Puedes abrirlas en modo presentador a pantalla completa o descargarlas como archivo PowerPoint (.pptx).'
  },
  {
    title: '📚 Contenidos Programáticos (Syllabus)',
    badge: 'Plan de estudios completo',
    description: 'Visualiza el cronograma detallado de 6 semanas de "Inglés Tecnico economico": cada semana muestra su unidad, tema central, descripción pedagógica, conceptos clave y actividades prácticas.'
  },
  {
    title: '👥 Materia y Grupos Académicos',
    badge: 'Inglés Tecnico economico',
    description: 'Organiza a los estudiantes por asignatura y grupo con su propio muro exclusivo, conteo de publicaciones y miembros inscritos.'
  },
  {
    title: '🛡️ Reportes en Excel y Gestión Docente',
    badge: 'Exclusivo Profesora',
    description: 'Desde su cuenta docente, la profesora Gina puede generar evaluaciones y diapositivas con IA (Gemini), usar OVA Studio, y exportar planillas completas en Excel (.xlsx) con el desglose pregunta por pregunta.'
  }
];

export const DEMO_TAB_INFO = {
  tasks: {
    title: '📰 Muro de Clase — Materia: Inglés Tecnico economico',
    summary: 'Explora las publicaciones de demostración de "Inglés Tecnico economico": talleres con nota de voz, encuesta en vivo, glosario financiero y foro de debate. Puedes votar, reaccionar, comentar y escuchar la narración con IA.'
  },
  evaluaciones: {
    title: '📝 Evaluaciones de Prueba — Inglés Tecnico economico',
    summary: 'Haz clic en "Empezar prueba" en cualquiera de las 3 evaluaciones de "Inglés Tecnico economico" (incluye Listening con audio, columnas, ordenar frases y modo anti-trampas). La nota se calcula al instante sin afectar datos reales.'
  },
  evaluations: {
    title: '📝 Evaluaciones de Prueba — Inglés Tecnico economico',
    summary: 'Haz clic en "Empezar prueba" en cualquiera de las 3 evaluaciones de "Inglés Tecnico economico" (incluye Listening con audio, columnas, ordenar frases y modo anti-trampas). La nota se calcula al instante sin afectar datos reales.'
  },
  syllabus: {
    title: '📚 Contenidos Programáticos — Inglés Tecnico economico',
    summary: 'Cronograma académico completo de las 6 semanas de "Inglés Tecnico economico" con unidades, temas, objetivos pedagógicos, conceptos clave y actividades.'
  },
  reviews: {
    title: '📊 Diapositivas Demo — Inglés Tecnico economico',
    summary: 'Haz clic en cualquiera de las 3 presentaciones de "Inglés Tecnico economico" para abrir el visor interactivo a pantalla completa, responder el quiz final de cada presentación o descargar el archivo PowerPoint (.pptx).'
  },
  groups: {
    title: '👥 Grupo Académico — Inglés Tecnico economico',
    summary: 'Haz clic en la materia "Inglés Tecnico economico" para ver su portada y su canal exclusivo de publicaciones y actividades.'
  },
  profile: {
    title: '👤 Perfil de Invitado (Modo Demo)',
    summary: 'Vista demostrativa del perfil estudiantil donde se agrupan las participaciones y personalización de cuenta.'
  },
  settings: {
    title: '⚙️ Ajustes de Apariencia y Sonido',
    summary: 'Prueba el cambio de tema visual en vivo (Claro, Noche / Dim y AMOLED Lights Out) y los sonidos de la plataforma.'
  },
  tools: {
    title: '🛠️ Herramientas Docentes (OVA Studio & Ruleta)',
    summary: 'Panel de herramientas para crear Objetos Virtuales de Aprendizaje y dinamizar clases presenciales o remotas.'
  }
};

export const DEMO_TEACHER_TAB_INFO = {
  tasks: {
    title: '👩‍🏫 Modo Docente (Demo) — Muro de Clase Aislado',
    summary: 'Crea publicaciones, tareas con entrega, encuestas interactivas o foros de debate en "Inglés Tecnico economico". Todo lo que publiques aquí está 100% aislado de la plataforma real y se borrará automáticamente en máximo 2 semanas (14 días).'
  },
  evaluaciones: {
    title: '👩‍🏫 Modo Docente (Demo) — Creador de Evaluaciones',
    summary: 'Crea evaluaciones de prueba manuales o con IA, edita preguntas, activa el modo anti-trampas y descarga reportes Excel demostrativos. Las evaluaciones creadas aquí son temporales (máx. 2 semanas) y aisladas.'
  },
  evaluations: {
    title: '👩‍🏫 Modo Docente (Demo) — Creador de Evaluaciones',
    summary: 'Crea evaluaciones de prueba manuales o con IA, edita preguntas, activa el modo anti-trampas y descarga reportes Excel demostrativos. Las evaluaciones creadas aquí son temporales (máx. 2 semanas) y aisladas.'
  },
  syllabus: {
    title: '👩‍🏫 Modo Docente (Demo) — Gestión de Contenidos Programáticos',
    summary: 'Agrega nuevas semanas o temas al plan de estudios de "Inglés Tecnico economico" manualmente o importando un PDF. Tus cambios quedan aislados en el entorno Demo y duran máximo 2 semanas.'
  },
  reviews: {
    title: '👩‍🏫 Modo Docente (Demo) — Generador de Diapositivas (.PPTX)',
    summary: 'Genera nuevas presentaciones con IA o edita las diapositivas demostrativas de "Inglés Tecnico economico". Las presentaciones creadas en el Demo se guardan de forma aislada por 2 semanas.'
  },
  groups: {
    title: '👩‍🏫 Modo Docente (Demo) — Creación de Materias y Grupos',
    summary: 'Prueba la creación de nuevos grupos académicos o explora la materia "Inglés Tecnico economico". Los grupos creados en modo Demo son temporales (máx. 2 semanas).'
  },
  tools: {
    title: '👩‍🏫 Modo Docente (Demo) — OVA Studio y Ruleta de Participación',
    summary: 'Explora el generador de Objetos Virtuales de Aprendizaje (OVA Studio) y la ruleta interactiva para dinamizar tus sesiones.'
  },
  settings: {
    title: '⚙️ Ajustes de Modo Demo (Docente)',
    summary: 'Prueba los temas visuales (Claro, Noche, AMOLED) y copia los enlaces directos de invitación a Modo Estudiante o Modo Docente.'
  }
};

// Duración máxima de cualquier elemento creado en Modo Demo: 2 semanas (14 días)
export const DEMO_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const DEMO_SANDBOX_STORAGE_KEY = 'englishTech_demoSandbox_v1';
export const DEMO_CHAT_STORAGE_KEY = 'englishTech_demoChats_v1';
const nowMs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

export const DEMO_USER_MAPPINGS = {
  teacher: {
    id: 'teacher',
    username: 'GinaDocente',
    name: 'La profe',
    fullName: 'Gina Marcela Quintana Delgado',
    email: 'demo.docente@unipamplona.edu.co',
    role: 'teacher',
    profilePicUrl: '/icono.png',
    bio: 'Docente de Inglés Técnico Económico — Universidad de Pamplona (Entorno de Demostración Aislado).',
    isDemoUser: true
  },
  invitado: {
    id: 'invitado',
    username: 'invitado',
    name: 'Invitado Demo',
    fullName: 'Estudiante Invitado (Demo)',
    email: 'invitado.demo@unipamplona.edu.co',
    role: 'student',
    profilePicUrl: '',
    bio: 'Explorando la plataforma English Tech en Modo Demostración.',
    academicGroupId: DEMO_SUBJECT_ID,
    isDemoUser: true
  },
  carlos_mendoza: {
    id: 'carlos_mendoza',
    username: 'carlos_mendoza',
    name: 'Carlos Andrés Mendoza',
    fullName: 'Carlos Andrés Mendoza',
    email: 'carlos.mendoza.demo@unipamplona.edu.co',
    role: 'student',
    profilePicUrl: '',
    bio: 'Estudiante de Economía VII Semestre • Interesado en Macroeconomía y Comercio Internacional.',
    academicGroupId: DEMO_SUBJECT_ID,
    isDemoUser: true
  },
  laura_restrepo: {
    id: 'laura_restrepo',
    username: 'laura_restrepo',
    name: 'Laura Sofía Restrepo',
    fullName: 'Laura Sofía Restrepo',
    email: 'laura.restrepo.demo@unipamplona.edu.co',
    role: 'student',
    profilePicUrl: '',
    bio: 'Economía y Finanzas • Analítica de mercados y política monetaria.',
    academicGroupId: DEMO_SUBJECT_ID,
    isDemoUser: true
  },
  mateo_gomez: {
    id: 'mateo_gomez',
    username: 'mateo_gomez',
    name: 'Mateo Alejandro Gómez',
    fullName: 'Mateo Alejandro Gómez',
    email: 'mateo.gomez.demo@unipamplona.edu.co',
    role: 'student',
    profilePicUrl: '',
    bio: 'Estudiante de Administración y Economía • Inglés Técnico.',
    academicGroupId: DEMO_SUBJECT_ID,
    isDemoUser: true
  },
  valeria_castro: {
    id: 'valeria_castro',
    username: 'valeria_castro',
    name: 'Valeria Castro Duarte',
    fullName: 'Valeria Castro Duarte',
    email: 'valeria.castro.demo@unipamplona.edu.co',
    role: 'student',
    profilePicUrl: '',
    bio: 'Estudiante de Economía • Comercio Exterior y Aranceles.',
    academicGroupId: DEMO_SUBJECT_ID,
    isDemoUser: true
  }
};

export const DEMO_USER_PRESENCE = {
  teacher: { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 60 * 1000, updatedAt: nowMs - 60 * 1000 },
  invitado: { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 30 * 1000, updatedAt: nowMs - 30 * 1000 },
  '@invitado': { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 30 * 1000, updatedAt: nowMs - 30 * 1000 },
  carlos_mendoza: { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 2 * 60 * 1000, updatedAt: nowMs - 2 * 60 * 1000 },
  laura_restrepo: { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 4 * 60 * 1000, updatedAt: nowMs - 4 * 60 * 1000 },
  mateo_gomez: { status: 'away', isOnline: false, lastPing: nowMs - 15 * 60 * 1000, lastSeen: nowMs - 15 * 60 * 1000, updatedAt: nowMs - 15 * 60 * 1000 },
  valeria_castro: { status: 'online', isOnline: true, lastPing: nowMs, lastSeen: nowMs - 5 * 60 * 1000, updatedAt: nowMs - 5 * 60 * 1000 }
};

export const DEMO_CHAT_GROUPS = [
  {
    id: 'demo_chat_group_1',
    name: 'Inglés Tecnico economico (Grupo A)',
    description: 'Canal grupal de demostración para dudas sobre talleres, vocabulario financiero y presentaciones.',
    members: ['teacher', 'invitado', '@invitado', 'carlos_mendoza', 'laura_restrepo', 'mateo_gomez', 'valeria_castro'],
    admins: ['teacher'],
    createdBy: 'teacher',
    academicGroupId: DEMO_SUBJECT_ID,
    createdAt: nowMs - 14 * dayMs,
    isDemoGroup: true
  },
  {
    id: 'demo_chat_group_2',
    name: 'Seminario de Inglés para Negocios (Demo)',
    description: 'Grupo de práctica conversacional y preparación de casos de estudio.',
    members: ['teacher', 'invitado', '@invitado', 'carlos_mendoza', 'valeria_castro'],
    admins: ['teacher'],
    createdBy: 'teacher',
    academicGroupId: DEMO_SUBJECT_ID,
    createdAt: nowMs - 10 * dayMs,
    isDemoGroup: true
  }
];

const demoGroup1Messages = [
  {
    id: 'demo_msg_g1_1',
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe',
    text: 'Welcome everyone to our Technical Economic English channel! Feel free to ask questions about Unit 1 & Unit 2 here. 📊🇬🇧',
    createdAt: nowMs - 3 * 3600 * 1000,
    timestamp: nowMs - 3 * 3600 * 1000,
    status: 'read',
    reactions: { carlos_mendoza: '👍', laura_restrepo: '👍', valeria_castro: '❤️' }
  },
  {
    id: 'demo_msg_g1_2',
    authorId: 'carlos_mendoza',
    author: 'Carlos Andrés Mendoza',
    authorRole: 'student',
    senderId: 'carlos_mendoza',
    senderName: 'Carlos Andrés Mendoza',
    text: 'Good afternoon Teacher! For the inflation report, should we compare Headline Inflation or Core Inflation?',
    createdAt: nowMs - 2 * 3600 * 1000,
    timestamp: nowMs - 2 * 3600 * 1000,
    status: 'read',
    reactions: { teacher: '👍' }
  },
  {
    id: 'demo_msg_g1_3',
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe',
    text: 'Great question Carlos! Please mention both, and explain why central banks monitor Core Inflation closely.',
    createdAt: nowMs - 90 * 60 * 1000,
    timestamp: nowMs - 90 * 60 * 1000,
    status: 'read',
    reactions: { carlos_mendoza: '🔥', laura_restrepo: '🔥' }
  }
];

const demoInvitadoTeacherMessages = [
  {
    id: 'demo_msg_dm_1',
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe',
    text: '¡Hola! Bienvenido/a al chat demostrativo de English Tech. Este canal está 100% aislado para pruebas: puedes enviar mensajes, notas de voz, imágenes o iniciar una llamada de prueba sin contactar a usuarios reales.',
    createdAt: nowMs - 45 * 60 * 1000,
    timestamp: nowMs - 45 * 60 * 1000,
    status: 'read',
    reactions: { invitado: '❤️' }
  }
];

const demoCarlosTeacherMessages = [
  {
    id: 'demo_msg_ct_1',
    authorId: 'carlos_mendoza',
    author: 'Carlos Andrés Mendoza',
    authorRole: 'student',
    senderId: 'carlos_mendoza',
    senderName: 'Carlos Andrés Mendoza',
    text: 'Hello Professor Gina, I already submitted the audio summary for the Supply & Demand case study.',
    createdAt: nowMs - 25 * 60 * 1000,
    timestamp: nowMs - 25 * 60 * 1000,
    status: 'read',
    reactions: { teacher: '👍' }
  },
  {
    id: 'demo_msg_ct_2',
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe',
    text: 'Thank you Carlos! Your pronunciation of macroeconomic terms was very clear.',
    createdAt: nowMs - 20 * 60 * 1000,
    timestamp: nowMs - 20 * 60 * 1000,
    status: 'read',
    reactions: {}
  }
];

const demoLauraTeacherMessages = [
  {
    id: 'demo_msg_lt_1',
    authorId: 'laura_restrepo',
    author: 'Laura Sofía Restrepo',
    authorRole: 'student',
    senderId: 'laura_restrepo',
    senderName: 'Laura Sofía Restrepo',
    text: 'Teacher, could you check if my slide deck on Fiscal Policy downloaded properly?',
    createdAt: nowMs - 50 * 60 * 1000,
    timestamp: nowMs - 50 * 60 * 1000,
    status: 'read',
    reactions: {}
  }
];

const demoMateoTeacherMessages = [
  {
    id: 'demo_msg_mt_1',
    authorId: 'mateo_gomez',
    author: 'Mateo Alejandro Gómez',
    authorRole: 'student',
    senderId: 'mateo_gomez',
    senderName: 'Mateo Alejandro Gómez',
    text: 'Good morning Professor! I finished reading the IMF report on emerging markets for Friday’s debate.',
    createdAt: nowMs - 75 * 60 * 1000,
    timestamp: nowMs - 75 * 60 * 1000,
    status: 'read',
    reactions: { teacher: '👏' }
  }
];

const demoValeriaTeacherMessages = [
  {
    id: 'demo_msg_vt_1',
    authorId: 'valeria_castro',
    author: 'Valeria Castro Duarte',
    authorRole: 'student',
    senderId: 'valeria_castro',
    senderName: 'Valeria Castro Duarte',
    text: 'Hello Teacher! Thank you for the feedback on my Balance Sheet & Income Statement glossary.',
    createdAt: nowMs - 110 * 60 * 1000,
    timestamp: nowMs - 110 * 60 * 1000,
    status: 'read',
    reactions: { teacher: '❤️' }
  }
];

export const DEMO_INITIAL_CHATS = {
  'group_demo_chat_group_1': demoGroup1Messages,
  [`acad_${DEMO_SUBJECT_ID}`]: demoGroup1Messages,
  'group_demo_chat_group_2': [
    {
      id: 'demo_msg_g2_1',
      authorId: 'teacher',
      author: 'La profe',
      authorRole: 'teacher',
      senderId: 'teacher',
      senderName: 'La profe',
      text: 'Welcome to our Business English Seminar! Here we practice international trade negotiations and case studies.',
      createdAt: nowMs - 4 * 3600 * 1000,
      timestamp: nowMs - 4 * 3600 * 1000,
      status: 'read',
      reactions: { carlos_mendoza: '👍', valeria_castro: '🔥' }
    }
  ],
  'dm_invitado_teacher': demoInvitadoTeacherMessages,
  '@invitado_teacher': demoInvitadoTeacherMessages,
  'dm_carlos_mendoza_teacher': demoCarlosTeacherMessages,
  'carlos_mendoza_teacher': demoCarlosTeacherMessages,
  'dm_laura_restrepo_teacher': demoLauraTeacherMessages,
  'laura_restrepo_teacher': demoLauraTeacherMessages,
  'dm_mateo_gomez_teacher': demoMateoTeacherMessages,
  'dm_valeria_castro_teacher': demoValeriaTeacherMessages
};

export const DEMO_LAST_MESSAGES = {
  'group_demo_chat_group_1': {
    text: 'Great question Carlos! Please mention both, and explain why central banks monitor Core Inflation closely.',
    createdAt: nowMs - 90 * 60 * 1000,
    timestamp: nowMs - 90 * 60 * 1000,
    lastStudentAt: nowMs - 2 * 3600 * 1000,
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe'
  },
  [`acad_${DEMO_SUBJECT_ID}`]: {
    text: 'Great question Carlos! Please mention both, and explain why central banks monitor Core Inflation closely.',
    createdAt: nowMs - 90 * 60 * 1000,
    timestamp: nowMs - 90 * 60 * 1000,
    lastStudentAt: nowMs - 2 * 3600 * 1000,
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe'
  },
  'group_demo_chat_group_2': {
    text: 'Welcome to our Business English Seminar! Here we practice international trade negotiations and case studies.',
    createdAt: nowMs - 4 * 3600 * 1000,
    timestamp: nowMs - 4 * 3600 * 1000,
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe'
  },
  'dm_invitado_teacher': {
    text: '¡Hola! Bienvenido/a al chat demostrativo de English Tech. Este canal está 100% aislado para pruebas.',
    createdAt: nowMs - 45 * 60 * 1000,
    timestamp: nowMs - 45 * 60 * 1000,
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe'
  },
  'dm_carlos_mendoza_teacher': {
    text: 'Thank you Carlos! Your pronunciation of macroeconomic terms was very clear.',
    createdAt: nowMs - 20 * 60 * 1000,
    timestamp: nowMs - 20 * 60 * 1000,
    lastStudentAt: nowMs - 25 * 60 * 1000,
    authorId: 'teacher',
    author: 'La profe',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe'
  },
  'dm_laura_restrepo_teacher': {
    text: 'Teacher, could you check if my slide deck on Fiscal Policy downloaded properly?',
    createdAt: nowMs - 50 * 60 * 1000,
    timestamp: nowMs - 50 * 60 * 1000,
    lastStudentAt: nowMs - 50 * 60 * 1000,
    authorId: 'laura_restrepo',
    author: 'Laura Sofía Restrepo',
    authorRole: 'student',
    senderId: 'laura_restrepo',
    senderName: 'Laura Sofía Restrepo'
  },
  'dm_mateo_gomez_teacher': {
    text: 'Good morning Professor! I finished reading the IMF report on emerging markets for Friday’s debate.',
    createdAt: nowMs - 75 * 60 * 1000,
    timestamp: nowMs - 75 * 60 * 1000,
    lastStudentAt: nowMs - 75 * 60 * 1000,
    authorId: 'mateo_gomez',
    author: 'Mateo Alejandro Gómez',
    authorRole: 'student',
    senderId: 'mateo_gomez',
    senderName: 'Mateo Alejandro Gómez'
  },
  'dm_valeria_castro_teacher': {
    text: 'Hello Teacher! Thank you for the feedback on my Balance Sheet & Income Statement glossary.',
    createdAt: nowMs - 110 * 60 * 1000,
    timestamp: nowMs - 110 * 60 * 1000,
    lastStudentAt: nowMs - 110 * 60 * 1000,
    authorId: 'valeria_castro',
    author: 'Valeria Castro Duarte',
    authorRole: 'student',
    senderId: 'valeria_castro',
    senderName: 'Valeria Castro Duarte'
  }
};

export const DEMO_USER_POSTS = [
  {
    id: 'demo_post_1',
    authorId: 'teacher',
    author: 'La profe',
    authorUsername: 'GinaDocente',
    authorName: 'Gina Marcela Quintana Delgado',
    authorRole: 'teacher',
    text: '📊 "An investment in knowledge pays the best interest." — Benjamin Franklin.\nBienvenidos al espacio académico demostrativo de Inglés Técnico Económico.',
    content: '📊 "An investment in knowledge pays the best interest." — Benjamin Franklin.\nBienvenidos al espacio académico demostrativo de Inglés Técnico Económico.',
    createdAt: nowMs - 2 * dayMs,
    timestamp: nowMs - 2 * dayMs,
    reactions: { carlos_mendoza: '👍', laura_restrepo: '❤️', mateo_gomez: '🔥' },
    comments: [
      {
        id: 'demo_post_c1',
        author: 'Carlos Andrés Mendoza',
        authorId: 'carlos_mendoza',
        authorUsername: 'carlos_mendoza',
        authorRole: 'student',
        role: 'student',
        text: 'Excellent quote Professor!',
        createdAt: nowMs - 2 * dayMs + 3600000,
        timestamp: nowMs - 2 * dayMs + 3600000
      }
    ],
    isDemoPost: true
  },
  {
    id: 'demo_post_2',
    authorId: 'invitado',
    author: 'Invitado (Demo)',
    authorUsername: 'invitado',
    authorName: 'Invitado Demo',
    authorRole: 'student',
    text: 'Practicing key vocabulary for Unit 2: Inflation, Purchasing Power, Interest Rates, and Monetary Policy! 📈🌎',
    content: 'Practicing key vocabulary for Unit 2: Inflation, Purchasing Power, Interest Rates, and Monetary Policy! 📈🌎',
    createdAt: nowMs - dayMs,
    timestamp: nowMs - dayMs,
    reactions: { teacher: '❤️', laura_restrepo: '👏' },
    comments: [],
    isDemoPost: true
  }
];

export const DEMO_SUGGESTIONS = [
  {
    id: 'demo_sugg_1',
    author: 'Carlos Andrés Mendoza (@carlos_mendoza)',
    authorRole: 'student',
    studentName: 'Carlos Andrés Mendoza (@carlos_mendoza)',
    studentUsername: 'carlos_mendoza',
    text: 'Sería excelente incluir un glosario descargable de términos del FMI y Banco Mundial para la Unidad 6.',
    createdAt: nowMs - 2 * dayMs,
    timestamp: nowMs - 2 * dayMs,
    isDemoItem: true
  },
  {
    id: 'demo_sugg_2',
    author: 'Laura Sofía Restrepo (@laura_restrepo)',
    authorRole: 'student',
    studentName: 'Laura Sofía Restrepo (@laura_restrepo)',
    studentUsername: 'laura_restrepo',
    text: 'Me encantó la actividad de Listening con audio integrado en el examen de política monetaria.',
    createdAt: nowMs - dayMs,
    timestamp: nowMs - dayMs,
    isDemoItem: true
  }
];

export const DEMO_ALERTS = [
  {
    id: 'demo_alert_1',
    type: 'demo_info',
    author: 'Mateo Alejandro Gómez (Simulación Anti-Trampas)',
    studentName: 'Mateo Alejandro Gómez (Simulación Anti-Trampas)',
    studentUsername: 'mateo_gomez',
    evaluationTitle: 'Quiz 1: Supply, Demand & Market Equilibrium',
    context: 'Evaluación: Quiz 1 (Modo Estricto)',
    text: 'Demostración de alerta preventiva por cambio de pestaña durante una evaluación en modo estricto.',
    originalText: 'Intento de cambio de ventana detectado durante la pregunta 2 (Simulación de seguridad del Modo Demo).',
    reason: 'Demostración de alerta preventiva por cambio de pestaña durante una evaluación en modo estricto.',
    createdAt: nowMs - 4 * 3600 * 1000,
    timestamp: nowMs - 4 * 3600 * 1000,
    isDemoItem: true
  }
];

export const DEMO_BOT_INFO_LIST = [
  {
    id: 'demo_bot_info_1',
    text: 'El curso Inglés Técnico Económico evalúa vocabulario financiero, lectura de gráficas macroeconómicas y comprensión auditiva aplicada a negocios.',
    createdAt: nowMs - 5 * dayMs,
    timestamp: nowMs - 5 * dayMs
  },
  {
    id: 'demo_bot_info_2',
    text: 'Recuerda utilizar conectores académicos en los foros: "Furthermore", "Consequently", "On the other hand", "In terms of GDP growth".',
    createdAt: nowMs - 3 * dayMs,
    timestamp: nowMs - 3 * dayMs
  }
];

export const DEMO_TEACHER_BOT_INFO_LIST = [
  {
    id: 'demo_tbot_info_1',
    text: 'Priorizar ejemplos prácticos sobre inflación en América Latina, tasas de interés del Banco de la República y balanza comercial.',
    createdAt: nowMs - 5 * dayMs,
    timestamp: nowMs - 5 * dayMs
  }
];

function normalizeDemoChatMessage(msg) {
  if (!msg || typeof msg !== 'object') return msg;
  const authorId = msg.authorId || msg.senderId || 'teacher';
  const author = msg.author || msg.senderName || (authorId === 'teacher' ? 'La profe' : authorId);
  const authorRole = msg.authorRole || (authorId === 'teacher' ? 'teacher' : 'student');
  const createdAt = Number(msg.createdAt || msg.timestamp || Date.now());
  let normalizedReactions = {};
  if (msg.reactions && typeof msg.reactions === 'object') {
    Object.entries(msg.reactions).forEach(([k, v]) => {
      if (typeof v === 'string') {
        normalizedReactions[k.replace(/^@/, '')] = v;
      } else if (Array.isArray(v)) {
        v.forEach((uid) => {
          if (uid) normalizedReactions[String(uid).replace(/^@/, '')] = k;
        });
      }
    });
  }
  return {
    ...msg,
    authorId: String(authorId).replace(/^@/, ''),
    author,
    authorRole,
    createdAt,
    timestamp: createdAt,
    status: msg.status || 'read',
    reactions: normalizedReactions
  };
}

export function loadDemoChatMessages(chatId) {
  if (!chatId) return [];
  const base = (DEMO_INITIAL_CHATS[chatId] || []).map(normalizeDemoChatMessage);
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(DEMO_CHAT_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed[chatId])) {
      return parsed[chatId].map(normalizeDemoChatMessage);
    }
    return base;
  } catch {
    return base;
  }
}

export function saveDemoChatMessages(chatId, messages) {
  if (!chatId || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(DEMO_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[chatId] = Array.isArray(messages) ? messages.map(normalizeDemoChatMessage) : [];
    window.localStorage.setItem(DEMO_CHAT_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore localStorage quota errors
  }
}

export function getDemoAutoReply(chatOrId, arg2 = 'student', arg3 = '') {
  // Support both (chat, senderRole, userText) and (chatId, userText, senderRole)
  let senderRole = 'student';
  let userText = '';
  if (arg2 === 'student' || arg2 === 'teacher') {
    senderRole = arg2;
    userText = String(arg3 || '');
  } else if (arg3 === 'student' || arg3 === 'teacher') {
    senderRole = arg3;
    userText = String(arg2 || '');
  } else {
    userText = String(arg2 || '');
  }

  const chatId = typeof chatOrId === 'string' ? chatOrId : String(chatOrId?.id || '');
  const isGroup =
    chatOrId?.type === 'group' ||
    chatId.startsWith('group_') ||
    chatId.startsWith('acad_');
  const clean = userText.toLowerCase();

  if (isGroup) {
    if (senderRole === 'teacher') {
      const authorId = 'carlos_mendoza';
      const author = 'Carlos Andrés Mendoza';
      return {
        author,
        authorId,
        authorRole: 'student',
        senderId: authorId,
        senderName: author,
        text: 'Thank you Professor! We received your message in the demo group. Everyone is reviewing the economic material. 📊👍'
      };
    }
    const authorId = 'teacher';
    const author = 'La profe';
    return {
      author,
      authorId,
      authorRole: 'teacher',
      senderId: authorId,
      senderName: author,
      text: 'Thanks for participating in the demo class group! Remember that this chat is 100% isolated in Demo Mode. 🌟'
    };
  }

  // Direct Message (DM)
  const knownStudents = ['carlos_mendoza', 'laura_restrepo', 'mateo_gomez', 'valeria_castro', 'invitado'];
  const matchedStudentId = knownStudents.find((sid) => chatId.includes(sid));
  const matchedStudent = matchedStudentId ? DEMO_USER_MAPPINGS[matchedStudentId] : null;

  if (senderRole === 'teacher') {
    const studentId = matchedStudent?.id || chatOrId?.username || 'carlos_mendoza';
    const studentName = matchedStudent?.name || chatOrId?.name || 'Carlos Andrés Mendoza';
    return {
      author: studentName,
      authorId: studentId,
      authorRole: 'student',
      senderId: studentId,
      senderName: studentName,
      text: clean.includes('?')
        ? 'Yes Professor! I am working on the economic vocabulary workshop right now. Thank you for the feedback! (Respuesta simulada en Modo Demo)'
        : 'Got it, Professor! Thank you very much for the update. 📚✅ (Respuesta simulada en Modo Demo)'
    };
  }

  // Student sending DM to another student (not teacher)
  if (!chatId.includes('teacher') && matchedStudent && matchedStudent.id !== 'invitado') {
    return {
      author: matchedStudent.name,
      authorId: matchedStudent.id,
      authorRole: 'student',
      senderId: matchedStudent.id,
      senderName: matchedStudent.name,
      text: clean.includes('?')
        ? 'Hey! Yes, let’s review the GDP and inflation slides together before the quiz. 📊 (Respuesta simulada de compañero en Modo Demo)'
        : 'Awesome! See you in the Technical Economic English session! 👍 (Respuesta simulada en Modo Demo)'
    };
  }

  return {
    author: 'La profe',
    authorId: 'teacher',
    authorRole: 'teacher',
    senderId: 'teacher',
    senderName: 'La profe',
    text: clean.includes('?')
      ? 'Great question! For this unit on Technical Economic English, focus on the relationship between inflation, interest rates, and GDP growth. (Respuesta automática aislada en Modo Demo)'
      : '¡Excelente aporte! Recuerda que este chat funciona en un entorno de demostración 100% aislado para que puedas probar mensajes, audios y reacciones con total seguridad.'
  };
}

/**
 * Determina si un elemento creado en Modo Demo ha superado las 2 semanas de vida.
 * Los elementos base de demostración (que no tienen isDemoCreated ni expiresAt) nunca expiran.
 */
export function isDemoItemExpired(item, now = Date.now()) {
  if (!item || typeof item !== 'object') return false;
  const expiresAt = Number(item.expiresAt || 0);
  if (expiresAt > 0) {
    return now > expiresAt;
  }
  if (item.isDemoCreated) {
    const createdAt = Number(item.createdAt || item.timestamp || 0);
    if (createdAt > 0) {
      return (now - createdAt) > DEMO_TTL_MS;
    }
  }
  return false;
}

/**
 * Calcula cuántos días restantes le quedan a un elemento temporal del Modo Demo (entre 1 y 14).
 */
export function getDemoRemainingDays(item, now = Date.now()) {
  if (!item || (!item.isDemoCreated && !item.expiresAt)) return null;
  const expiresAt = Number(item.expiresAt || 0) || (Number(item.createdAt || now) + DEMO_TTL_MS);
  const diffMs = expiresAt - now;
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export const DEMO_SANDBOX_CATEGORIES = [
  'tasks',
  'evaluations',
  'syllabus',
  'reviews',
  'academicGroups',
  'grades',
  'ovas',
  'userMappings',
  'chatGroups',
  'userPosts',
  'suggestions',
  'alerts'
];

/**
 * Carga el sandbox local del Modo Demo desde localStorage y purga automáticamente
 * cualquier elemento que haya cumplido más de 2 semanas (14 días).
 */
export function loadDemoSandbox(now = Date.now()) {
  const empty = {
    tasks: [],
    evaluations: [],
    syllabus: [],
    reviews: [],
    academicGroups: [],
    grades: [],
    ovas: [],
    userMappings: [],
    chatGroups: [],
    userPosts: [],
    suggestions: [],
    alerts: [],
    deletedIds: []
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(DEMO_SANDBOX_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    let mutated = false;
    const result = { ...empty };

    DEMO_SANDBOX_CATEGORIES.forEach((k) => {
      const list = Array.isArray(parsed?.[k]) ? parsed[k] : [];
      const valid = list.filter((item) => !isDemoItemExpired(item, now));
      if (valid.length !== list.length) mutated = true;
      result[k] = valid;
    });

    const rawDeleted = Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [];
    const validDeleted = rawDeleted.filter((entry) => {
      if (!entry) return false;
      if (typeof entry === 'string') return true;
      return !isDemoItemExpired(entry, now);
    });
    if (validDeleted.length !== rawDeleted.length) mutated = true;
    result.deletedIds = validDeleted;

    if (mutated) {
      window.localStorage.setItem(DEMO_SANDBOX_STORAGE_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    return empty;
  }
}

/**
 * Limpia por completo el sandbox local y los chats temporales del Modo Demo,
 * restaurando el entorno al estado base inicial.
 */
export function clearDemoSandbox() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEMO_SANDBOX_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_CHAT_STORAGE_KEY);
    window.localStorage.removeItem('englishTech_demo_ovas');
    window.localStorage.removeItem('englishTech_demo_ovas_teacher');
    window.localStorage.removeItem('englishTech_demo_ovas_camilodocente');
  } catch {
    // Ignorar errores de localStorage
  }
}

/**
 * Guarda o actualiza un elemento creado en el Modo Demo dentro del sandbox local,
 * sellándolo con isDemoCreated = true y expiresAt = ahora + 14 días.
 */
export function saveDemoSandboxItem(category, item) {
  if (typeof window === 'undefined' || !item) return item;
  const now = Date.now();
  const stamped = {
    ...item,
    isDemoCreated: true,
    createdAt: Number(item.createdAt || now),
    expiresAt: Number(item.expiresAt || (Number(item.createdAt || now) + DEMO_TTL_MS))
  };
  try {
    const sandbox = loadDemoSandbox(now);
    const list = Array.isArray(sandbox[category]) ? sandbox[category] : [];
    const filtered = list.filter((x) => String(x.id) !== String(stamped.id));
    sandbox[category] = [stamped, ...filtered];
    // Si estaba marcado como eliminado, quitarlo de deletedIds
    sandbox.deletedIds = (sandbox.deletedIds || []).filter((d) => {
      const dId = typeof d === 'string' ? d : d?.id;
      return String(dId) !== String(stamped.id);
    });
    window.localStorage.setItem(DEMO_SANDBOX_STORAGE_KEY, JSON.stringify(sandbox));
  } catch {
    // Ignorar errores de cuota de localStorage
  }
  return stamped;
}

/**
 * Elimina un elemento del sandbox local del Modo Demo (o registra su ID para ocultarlo).
 */
export function removeDemoSandboxItem(category, id) {
  if (typeof window === 'undefined' || !id) return;
  const now = Date.now();
  try {
    const sandbox = loadDemoSandbox(now);
    if (Array.isArray(sandbox[category])) {
      sandbox[category] = sandbox[category].filter((x) => String(x.id) !== String(id));
    }
    const existingDeleted = sandbox.deletedIds || [];
    const alreadyDeleted = existingDeleted.some((d) => String(typeof d === 'string' ? d : d?.id) === String(id));
    if (!alreadyDeleted) {
      sandbox.deletedIds = [
        ...existingDeleted,
        { id: String(id), isDemoCreated: true, createdAt: now, expiresAt: now + DEMO_TTL_MS }
      ];
    }
    window.localStorage.setItem(DEMO_SANDBOX_STORAGE_KEY, JSON.stringify(sandbox));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Combina los elementos base estáticos del Modo Demo con los creados temporalmente
 * (en Firestore demo_* y en localStorage), filtrando automáticamente los expirados (> 2 semanas).
 */
export function mergeDemoItemsWithBase(baseItems = [], firestoreDemoItems = [], sandboxCategory = '') {
  const now = Date.now();
  const sandbox = sandboxCategory ? loadDemoSandbox(now) : { deletedIds: [] };
  const localItems = sandboxCategory && Array.isArray(sandbox[sandboxCategory]) ? sandbox[sandboxCategory] : [];
  const deletedSet = new Set(
    (sandbox.deletedIds || []).map((d) => String(typeof d === 'string' ? d : d?.id))
  );

  const byId = new Map();

  // 1. Primero los elementos creados en Firestore (colección aislada demo_*) vigentes
  (firestoreDemoItems || []).forEach((item) => {
    if (!item || !item.id) return;
    if (deletedSet.has(String(item.id))) return;
    if (isDemoItemExpired(item, now)) return;
    byId.set(String(item.id), { ...item, isDemoCreated: true });
  });

  // 2. Elementos del sandbox local vigentes (por si se crearon offline o antes del snapshot)
  localItems.forEach((item) => {
    if (!item || !item.id) return;
    if (deletedSet.has(String(item.id))) return;
    if (isDemoItemExpired(item, now)) return;
    if (!byId.has(String(item.id))) {
      byId.set(String(item.id), { ...item, isDemoCreated: true });
    }
  });

  // 3. Elementos estáticos base de demostración ("Inglés Tecnico economico")
  (baseItems || []).forEach((item) => {
    if (!item || !item.id) return;
    if (deletedSet.has(String(item.id))) return;
    if (!byId.has(String(item.id))) {
      byId.set(String(item.id), item);
    }
  });

  return Array.from(byId.values());
}


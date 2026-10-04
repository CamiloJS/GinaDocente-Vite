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
        text: 'Teacher, can we compare the Colombian CPI trend with the US Federal Reserve interest rate decisions in our paragraph?',
        timestamp: Date.now() - 1000 * 60 * 45,
        reactions: { teacher_gina: { type: 'heart', name: 'GinaDocente' } }
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
    pollOptions: [
      { text: 'Global Supply Chains & International Trade Tariffs', votes: 19, voters: ['user_1', 'user_2'] },
      { text: 'Central Bank Interest Rates & Inflation Control', votes: 15, voters: ['user_3'] },
      { text: 'Fintech, Digital Banking & Emerging Markets', votes: 12, voters: [] }
    ],
    reactions: {
      user_4: { type: 'like', name: 'Valeria Castro' },
      user_5: { type: 'celebrate', name: 'Andrés Suárez' }
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
      user_6: { type: 'love', name: 'Sofía Ortiz' },
      user_7: { type: 'like', name: 'David Peña' }
    },
    comments: [
      {
        id: 'demo-com-3',
        author: 'David Peña',
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
      user_1: { score: 5, name: 'Carlos Mendoza' },
      user_2: { score: 5, name: 'Laura Restrepo' }
    },
    comments: [
      {
        id: 'demo-com-4',
        author: 'Carlos Mendoza',
        authorRole: 'student',
        userRole: 'student',
        text: 'When the US dollar strengthens against the peso, coffee and flower exporters receive higher revenue in local currency; however, importing industrial machinery becomes significantly more expensive.',
        timestamp: Date.now() - 1000 * 60 * 60 * 36,
        reactions: { user_2: { type: 'heart', name: 'Laura Restrepo' } }
      }
    ]
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
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    questions: [
      {
        text: 'Choose the correct economic term: "When the general price level of goods and services rises continuously and purchasing power falls, the economy is experiencing ______."',
        type: 'multiple',
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

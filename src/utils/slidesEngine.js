// src/utils/slidesEngine.js
// Motor de presentaciones estilo PowerPoint / Google Slides:
// Temas visuales, 11 diseños (layouts), elementos libres en lienzo 16:9, conversión sin pérdida y motor IA.

export const SLIDE_THEMES = {
  unipamplona: {
    id: 'unipamplona',
    name: 'Institucional Carmesí',
    isDark: false,
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    primary: '#AD3333',
    secondary: '#D97706',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    badgeBg: 'rgba(173, 51, 51, 0.1)',
    badgeText: '#AD3333',
    pptxBg: 'F8FAFC',
    pptxCardBg: 'FFFFFF',
    pptxCardBorder: 'CBD5E1',
    pptxPrimary: 'AD3333',
    pptxSecondary: 'D97706',
    pptxText: '0F172A',
    pptxMuted: '475569'
  },
  midnight: {
    id: 'midnight',
    name: 'Ejecutivo Oscuro',
    isDark: true,
    bg: '#0F172A',
    cardBg: '#1E293B',
    cardBorder: '#334155',
    primary: '#EF4444',
    secondary: '#F59E0B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    badgeBg: 'rgba(239, 68, 68, 0.16)',
    badgeText: '#FCA5A5',
    pptxBg: '0F172A',
    pptxCardBg: '1E293B',
    pptxCardBorder: '334155',
    pptxPrimary: 'EF4444',
    pptxSecondary: 'F59E0B',
    pptxText: 'FFFFFF',
    pptxMuted: '94A3B8'
  },
  ocean: {
    id: 'ocean',
    name: 'Azul Corporativo',
    isDark: false,
    bg: '#F0F7FF',
    cardBg: '#FFFFFF',
    cardBorder: '#BFDBFE',
    primary: '#1D4ED8',
    secondary: '#0284C7',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    badgeBg: 'rgba(29, 78, 216, 0.1)',
    badgeText: '#1D4ED8',
    pptxBg: 'F0F7FF',
    pptxCardBg: 'FFFFFF',
    pptxCardBorder: 'BFDBFE',
    pptxPrimary: '1D4ED8',
    pptxSecondary: '0284C7',
    pptxText: '0F172A',
    pptxMuted: '334155'
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Académico',
    isDark: false,
    bg: '#ECFDF5',
    cardBg: '#FFFFFF',
    cardBorder: '#A7F3D0',
    primary: '#047857',
    secondary: '#0D9488',
    textPrimary: '#064E3B',
    textSecondary: '#065F46',
    badgeBg: 'rgba(4, 120, 87, 0.12)',
    badgeText: '#047857',
    pptxBg: 'ECFDF5',
    pptxCardBg: 'FFFFFF',
    pptxCardBorder: 'A7F3D0',
    pptxPrimary: '047857',
    pptxSecondary: '0D9488',
    pptxText: '064E3B',
    pptxMuted: '065F46'
  },
  dark_emerald: {
    id: 'dark_emerald',
    name: 'Pizarra Esmeralda',
    isDark: true,
    bg: '#062C22',
    cardBg: '#0B3B2E',
    cardBorder: '#115E59',
    primary: '#10B981',
    secondary: '#FBBF24',
    textPrimary: '#ECFDF5',
    textSecondary: '#A7F3D0',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    badgeText: '#6EE7B7',
    pptxBg: '062C22',
    pptxCardBg: '0B3B2E',
    pptxCardBorder: '115E59',
    pptxPrimary: '10B981',
    pptxSecondary: 'FBBF24',
    pptxText: 'ECFDF5',
    pptxMuted: 'A7F3D0'
  },
  sunset: {
    id: 'sunset',
    name: 'Editorial Cálido',
    isDark: false,
    bg: '#FFFBEB',
    cardBg: '#FFFFFF',
    cardBorder: '#FDE68A',
    primary: '#B45309',
    secondary: '#DC2626',
    textPrimary: '#292524',
    textSecondary: '#57534E',
    badgeBg: 'rgba(180, 83, 9, 0.12)',
    badgeText: '#B45309',
    pptxBg: 'FFFBEB',
    pptxCardBg: 'FFFFFF',
    pptxCardBorder: 'FDE68A',
    pptxPrimary: 'B45309',
    pptxSecondary: 'DC2626',
    pptxText: '292524',
    pptxMuted: '57534E'
  },
  lavender: {
    id: 'lavender',
    name: 'Violeta Moderno',
    isDark: false,
    bg: '#F5F3FF',
    cardBg: '#FFFFFF',
    cardBorder: '#DDD6FE',
    primary: '#6D28D9',
    secondary: '#DB2777',
    textPrimary: '#1E1B4B',
    textSecondary: '#4C1D95',
    badgeBg: 'rgba(109, 40, 217, 0.12)',
    badgeText: '#6D28D9',
    pptxBg: 'F5F3FF',
    pptxCardBg: 'FFFFFF',
    pptxCardBorder: 'DDD6FE',
    pptxPrimary: '6D28D9',
    pptxSecondary: 'DB2777',
    pptxText: '1E1B4B',
    pptxMuted: '4C1D95'
  },
  noir: {
    id: 'noir',
    name: 'Minimalista Carbón',
    isDark: true,
    bg: '#09090B',
    cardBg: '#18181B',
    cardBorder: '#27272A',
    primary: '#F43F5E',
    secondary: '#38BDF8',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    badgeBg: 'rgba(244, 63, 94, 0.16)',
    badgeText: '#FDA4AF',
    pptxBg: '09090B',
    pptxCardBg: '18181B',
    pptxCardBorder: '27272A',
    pptxPrimary: 'F43F5E',
    pptxSecondary: '38BDF8',
    pptxText: 'FAFAFA',
    pptxMuted: 'A1A1AA'
  }
};

export const SLIDE_FONTS = {
  sans: {
    id: 'sans',
    name: 'Inter / Sans',
    css: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pptx: 'Arial'
  },
  display: {
    id: 'display',
    name: 'Montserrat / Display',
    css: "'Montserrat', 'Trebuchet MS', 'Segoe UI', sans-serif",
    pptx: 'Trebuchet MS'
  },
  serif: {
    id: 'serif',
    name: 'Georgia / Editorial',
    css: "Georgia, Cambria, 'Times New Roman', Times, serif",
    pptx: 'Georgia'
  },
  classic: {
    id: 'classic',
    name: 'Calibri / Clásica',
    css: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
    pptx: 'Calibri'
  },
  mono: {
    id: 'mono',
    name: 'JetBrains / Técnica',
    css: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    pptx: 'Courier New'
  }
};

export const SLIDE_LAYOUT_CATALOG = [
  { id: 'title', name: 'Portada', shortName: 'Portada', desc: 'Título principal, subtítulo e insignia' },
  { id: 'section', name: 'Encabezado de sección', shortName: 'Sección', desc: 'Separador de unidad o bloque temático' },
  { id: 'title_body', name: 'Título y contenido', shortName: 'Texto', desc: 'Párrafo explicativo y nota destacada' },
  { id: 'two_columns', name: 'Dos columnas', shortName: '2 Columnas', desc: 'Comparación lado a lado (ej: A vs B)' },
  { id: 'cards', name: 'Tarjetas de conceptos', shortName: 'Tarjetas', desc: '1 a 4 tarjetas con concepto y ejemplo' },
  { id: 'bullets', name: 'Lista de puntos clave', shortName: 'Puntos', desc: 'Puntos numerados con explicación' },
  { id: 'image_text', name: 'Imagen y texto', shortName: 'Imagen', desc: 'Ilustración o foto junto a explicación' },
  { id: 'table', name: 'Tabla de datos', shortName: 'Tabla', desc: 'Cuadro estructurado de filas y columnas' },
  { id: 'quote', name: 'Cita o dato clave', shortName: 'Cita / Dato', desc: 'Frase célebre, regla de oro o cifra' },
  { id: 'quiz', name: 'Quiz interactivo', shortName: 'Quiz', desc: 'Pregunta de opción múltiple en vivo' },
  { id: 'blank', name: 'Lienzo libre', shortName: 'Lienzo', desc: 'Espacio abierto para objetos y formas' }
];

export const VALID_SLIDE_LAYOUTS = new Set(SLIDE_LAYOUT_CATALOG.map(l => l.id));

export const SLIDE_TRANSITIONS = [
  { id: 'fade', name: 'Desvanecer' },
  { id: 'slide', name: 'Deslizar' },
  { id: 'zoom', name: 'Zoom suave' },
  { id: 'flip', name: 'Giro sutil' },
  { id: 'none', name: 'Instantáneo' }
];

export const SLIDE_PATTERNS = [
  { id: 'none', name: 'Liso' },
  { id: 'dots', name: 'Puntos' },
  { id: 'grid', name: 'Cuadrícula' },
  { id: 'diagonal', name: 'Diagonal' }
];

export const resolveSlideLayout = (slide, idx = 1) => {
  if (!slide || typeof slide !== 'object') return 'cards';
  if (slide.layout && VALID_SLIDE_LAYOUTS.has(slide.layout)) {
    return slide.layout;
  }
  if (slide.type === 'quiz' || Array.isArray(slide.options)) return 'quiz';
  if (Array.isArray(slide.bullets)) return 'bullets';
  if (Array.isArray(slide.cards)) return 'cards';
  if (slide.leftColumn || slide.rightColumn) return 'two_columns';
  if (slide.table && Array.isArray(slide.table.rows)) return 'table';
  if (slide.imageUrl && (slide.body || slide.text || slide.content)) return 'image_text';
  if (slide.quoteText || slide.statValue) return 'quote';
  if (idx === 0 && !slide.cards && !slide.bullets && !slide.options && slide.type !== 'quiz') return 'title';
  if (slide.body && !slide.cards && !slide.bullets) return 'title_body';
  return 'cards';
};

export const getSlidePatternStyle = (patternId, isDark = false) => {
  const color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)';
  if (patternId === 'dots') {
    return {
      backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
      backgroundSize: '20px 20px'
    };
  }
  if (patternId === 'grid') {
    return {
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: '28px 28px'
    };
  }
  if (patternId === 'diagonal') {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`,
      backgroundSize: '16px 16px'
    };
  }
  return {};
};

export const cleanHexNoHash = (hex, fallback = '0F172A') => {
  if (!hex || typeof hex !== 'string') return fallback;
  const cleaned = hex.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) return cleaned;
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned.split('').map(c => c + c).join('');
  }
  return fallback;
};

export const resolveTheme = (presentation, slide = null, appThemeMode = 'light') => {
  const themeKey = slide?.theme || presentation?.theme || (appThemeMode === 'light' ? 'unipamplona' : 'midnight');
  const base = SLIDE_THEMES[themeKey] || (appThemeMode === 'light' ? SLIDE_THEMES.unipamplona : SLIDE_THEMES.midnight);
  const customBg = slide?.bgColor || presentation?.bgColor || '';
  const customAccent = slide?.accentColor || presentation?.accentColor || '';
  const fontKey = slide?.fontFamily || presentation?.fontFamily || 'sans';
  const fontObj = SLIDE_FONTS[fontKey] || SLIDE_FONTS.sans;

  const effectiveBg = customBg || base.bg;
  const effectivePrimary = customAccent || base.primary;

  return {
    ...base,
    bg: effectiveBg,
    primary: effectivePrimary,
    pptxBg: customBg ? cleanHexNoHash(customBg, base.pptxBg) : base.pptxBg,
    pptxPrimary: customAccent ? cleanHexNoHash(customAccent, base.pptxPrimary) : base.pptxPrimary,
    fontFamily: fontObj.css,
    pptxFont: fontObj.pptx,
    fontId: fontObj.id
  };
};

export const createDefaultSlide = (layout = 'cards', idx = 0) => {
  const safeLayout = VALID_SLIDE_LAYOUTS.has(layout) ? layout : 'cards';
  const base = {
    id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    layout: safeLayout,
    title: 'Título de la diapositiva',
    subtitle: '',
    badge: '',
    titleAlign: safeLayout === 'title' || safeLayout === 'section' || safeLayout === 'quote' ? 'center' : 'left',
    titleSize: safeLayout === 'title' ? 'xl' : 'lg',
    speakerNotes: '',
    elements: []
  };

  if (safeLayout === 'title') {
    return {
      ...base,
      badge: 'Presentación de Clase',
      title: 'Título de la Presentación',
      subtitle: 'Subtítulo, objetivos de aprendizaje y contexto general de la sesión',
      authorNote: ''
    };
  }

  if (safeLayout === 'section') {
    return {
      ...base,
      badge: `Unidad ${Math.max(1, idx)}`,
      title: 'Nombre de la Sección o Módulo',
      subtitle: 'Resumen de los temas clave que abordaremos en esta parte'
    };
  }

  if (safeLayout === 'title_body') {
    return {
      ...base,
      title: 'Explicación Detallada del Tema',
      subtitle: 'Contexto principal y aplicación práctica',
      body: 'Escribe aquí el desarrollo del concepto, definición académica o lectura guiada. Puedes dividir las ideas en varios párrafos para facilitar la lectura en clase.',
      callout: 'Idea clave o recordatorio importante para los estudiantes.'
    };
  }

  if (safeLayout === 'two_columns') {
    return {
      ...base,
      title: 'Cuadro Comparativo',
      leftColumn: {
        badge: 'Columna A',
        title: 'Primer Concepto o Estructura',
        text: 'Descripción principal, reglas de uso o características del primer elemento.',
        items: ['Uso principal en contexto', 'Estructura o regla clave', 'Ejemplo: "She works in finance."']
      },
      rightColumn: {
        badge: 'Columna B',
        title: 'Segundo Concepto o Estructura',
        text: 'Descripción comparativa, diferencias clave o contraste directo.',
        items: ['Acción en progreso o contraste', 'Variación gramatical o técnica', 'Ejemplo: "She is analyzing the report."']
      }
    };
  }

  if (safeLayout === 'bullets') {
    return {
      ...base,
      title: 'Puntos Clave de la Lección',
      bullets: [
        { title: 'Primer punto clave', text: 'Explicación clara y directa del concepto.', example: 'Ejemplo aplicado en contexto real.' },
        { title: 'Segundo punto clave', text: 'Detalle complementario o regla importante.', example: 'Segundo ejemplo ilustrativo.' },
        { title: 'Tercer punto clave', text: 'Síntesis o recomendación práctica.', example: 'Aplicación en ejercicio.' }
      ]
    };
  }

  if (safeLayout === 'image_text') {
    return {
      ...base,
      title: 'Análisis Visual y Contexto',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" rx="24" fill="%231e293b"/><circle cx="190" cy="170" r="56" fill="%23ad3333" opacity="0.85"/><polyline fill="none" stroke="%2338bdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" points="110,320 230,220 340,260 490,130"/><circle cx="490" cy="130" r="10" fill="%23f59e0b"/><text x="110" y="375" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="%23f8fafc">Visual Context &amp; Diagram</text></svg>',
      imageCaption: 'Ilustración de referencia para análisis en clase',
      imagePosition: 'right',
      body: 'Utiliza este diseño para acompañar gráficos, esquemas, fotografías o capturas con su respectiva explicación pedagógica.',
      callout: 'Observa los detalles clave señalados en la imagen.'
    };
  }

  if (safeLayout === 'table') {
    return {
      ...base,
      title: 'Tabla de Referencia y Ejemplos',
      subtitle: 'Estructura comparativa organizada por categorías',
      table: {
        headers: ['Concepto / Forma', 'Función o Significado', 'Ejemplo en Contexto'],
        rows: [
          ['Término 1', 'Definición breve y precisa', 'Ejemplo de uso real en oración'],
          ['Término 2', 'Aplicación en contexto académico', 'Segundo ejemplo práctico'],
          ['Término 3', 'Caso especial o excepción común', 'Tercer ejemplo aplicado']
        ]
      }
    };
  }

  if (safeLayout === 'quote') {
    return {
      ...base,
      badge: 'Idea Fuerza',
      title: 'Concepto Central para Recordar',
      statValue: '',
      quoteText: 'El dominio del vocabulario técnico permite comunicar decisiones complejas con precisión y claridad internacional.',
      quoteAuthor: 'Principio clave de la unidad'
    };
  }

  if (safeLayout === 'quiz') {
    return {
      ...base,
      type: 'quiz',
      title: 'Pregunta de Comprobación',
      question: '¿Cuál de las siguientes opciones aplica correctamente el concepto estudiado?',
      options: [
        { text: 'Opción A (Incorrecta)', isCorrect: false, explanation: 'Revisa la estructura principal vista en la diapositiva anterior.' },
        { text: 'Opción B (Respuesta correcta)', isCorrect: true, explanation: '¡Correcto! Cumple exactamente con la regla y el contexto.' },
        { text: 'Opción C (Incorrecta)', isCorrect: false, explanation: 'Esta opción corresponde a otro tiempo o categoría.' },
        { text: 'Opción D (Incorrecta)', isCorrect: false, explanation: 'No aplica en este escenario.' }
      ]
    };
  }

  if (safeLayout === 'blank') {
    return {
      ...base,
      title: 'Lienzo Libre',
      subtitle: '',
      hideHeader: false,
      elements: [
        createCanvasElement('textbox', {
          x: 10,
          y: 22,
          w: 80,
          h: 24,
          text: 'Haz doble clic o usa el panel lateral para editar este cuadro de texto. También puedes arrastrarlo libremente por la diapositiva.',
          fontSize: 18,
          align: 'left'
        })
      ]
    };
  }

  // Default: 'cards'
  return {
    ...base,
    title: 'Conceptos Principales',
    cards: [
      { title: 'Concepto 1', text: 'Explicación clara del primer concepto clave.', example: 'Ejemplo práctico de uso.' },
      { title: 'Concepto 2', text: 'Explicación del segundo concepto o estructura.', example: 'Ejemplo aplicado.' },
      { title: 'Concepto 3', text: 'Síntesis o caso de aplicación directa.', example: 'Ejemplo en contexto.' }
    ]
  };
};

// Convierte una diapositiva de un diseño a otro preservando el contenido existente
export const convertSlideLayout = (slide, targetLayout, slideIdx = 0) => {
  if (!slide || !VALID_SLIDE_LAYOUTS.has(targetLayout)) return slide;
  const prevLayout = resolveSlideLayout(slide, slideIdx);
  if (prevLayout === targetLayout && slide.layout === targetLayout) return slide;

  const next = {
    ...slide,
    layout: targetLayout,
    elements: Array.isArray(slide.elements) ? slide.elements : []
  };

  const extractFromSource = (sourceType) => {
    const items = [];
    if (sourceType === 'cards' && Array.isArray(slide.cards) && slide.cards.length > 0) {
      slide.cards.forEach(c => {
        if (c) items.push({ title: c.title || '', text: c.text || '', example: c.example || '' });
      });
    } else if (sourceType === 'bullets' && Array.isArray(slide.bullets) && slide.bullets.length > 0) {
      slide.bullets.forEach(b => {
        if (typeof b === 'string') items.push({ title: b, text: '', example: '' });
        else if (b) items.push({ title: b.title || '', text: b.text || '', example: b.example || '' });
      });
    } else if (sourceType === 'two_columns' && (slide.leftColumn || slide.rightColumn)) {
      if (slide.leftColumn) {
        items.push({
          title: slide.leftColumn.title || 'Columna A',
          text: slide.leftColumn.text || (slide.leftColumn.items || []).filter(Boolean).join('. '),
          example: (slide.leftColumn.items || []).filter(Boolean)[0] || ''
        });
      }
      if (slide.rightColumn) {
        items.push({
          title: slide.rightColumn.title || 'Columna B',
          text: slide.rightColumn.text || (slide.rightColumn.items || []).filter(Boolean).join('. '),
          example: (slide.rightColumn.items || []).filter(Boolean)[0] || ''
        });
      }
    } else if (sourceType === 'table' && slide.table && Array.isArray(slide.table.rows) && slide.table.rows.length > 0) {
      slide.table.rows.forEach(r => {
        if (Array.isArray(r) && r.length > 0) {
          items.push({ title: r[0] || '', text: r[1] || '', example: r[2] || '' });
        }
      });
    } else if ((sourceType === 'title_body' || sourceType === 'image_text') && (slide.body || slide.content || slide.subtitle)) {
      items.push({
        title: slide.title || 'Concepto 1',
        text: slide.body || slide.content || slide.subtitle || '',
        example: slide.callout || ''
      });
    } else if (sourceType === 'quote' && (slide.quoteText || slide.body)) {
      items.push({
        title: slide.quoteAuthor || slide.title || 'Idea clave',
        text: slide.quoteText || slide.body || '',
        example: slide.statValue || ''
      });
    } else if (sourceType === 'quiz' && Array.isArray(slide.options) && slide.options.length > 0) {
      const correctOpt = slide.options.find(o => o?.isCorrect) || slide.options[0];
      if (correctOpt) {
        items.push({
          title: slide.question || slide.title || 'Concepto',
          text: correctOpt.text || '',
          example: correctOpt.explanation || ''
        });
      }
    }
    return items;
  };

  // Extraer primero desde el layout activo (prevLayout) para no perder ediciones recientes
  const priorityOrder = [
    prevLayout,
    'cards',
    'bullets',
    'two_columns',
    'table',
    'title_body',
    'image_text',
    'quote',
    'quiz'
  ];
  let extractedItems = [];
  for (const src of priorityOrder) {
    const candidate = extractFromSource(src);
    if (candidate.length > 0) {
      extractedItems = candidate;
      break;
    }
  }

  const isLayoutChange = prevLayout !== targetLayout;

  if (targetLayout === 'quiz') {
    next.type = 'quiz';
    if (!next.question) {
      next.question = next.content || next.subtitle || next.title || '¿Cuál es la opción correcta?';
    }
    if (!Array.isArray(next.options) || next.options.length === 0) {
      if (extractedItems.length >= 2) {
        next.options = extractedItems.slice(0, 4).map((it, idx) => ({
          text: it.text ? `${it.title ? it.title + ': ' : ''}${it.text}` : (it.title || `Opción ${String.fromCharCode(65 + idx)}`),
          isCorrect: idx === 0,
          explanation: it.example || (idx === 0 ? '¡Correcto!' : 'Revisa el concepto.')
        }));
      } else {
        next.options = [
          { text: next.answer || extractedItems[0]?.text || 'Opción A (Correcta)', isCorrect: true, explanation: extractedItems[0]?.example || '¡Correcto!' },
          { text: 'Opción B', isCorrect: false, explanation: 'Incorrecta' },
          { text: 'Opción C', isCorrect: false, explanation: 'Incorrecta' },
          { text: 'Opción D', isCorrect: false, explanation: 'Incorrecta' }
        ];
      }
    }
    return next;
  }

  // Si deja de ser quiz, limpiar type='quiz'
  if (next.type === 'quiz') {
    delete next.type;
  }

  if (targetLayout === 'cards') {
    if ((isLayoutChange && extractedItems.length > 0) || !Array.isArray(next.cards) || next.cards.length === 0) {
      next.cards = extractedItems.length > 0
        ? extractedItems.slice(0, 4)
        : [{ title: next.title || 'Concepto 1', text: next.subtitle || '', example: '' }];
    }
  } else if (targetLayout === 'bullets') {
    if ((isLayoutChange && extractedItems.length > 0) || !Array.isArray(next.bullets) || next.bullets.length === 0) {
      next.bullets = extractedItems.length > 0
        ? extractedItems
        : [{ title: next.title || 'Punto 1', text: next.subtitle || '', example: '' }];
    }
  } else if (targetLayout === 'two_columns') {
    if ((isLayoutChange && extractedItems.length > 0) || !next.leftColumn) {
      const first = extractedItems[0] || { title: 'Columna Izquierda', text: 'Ideas principales del primer bloque.', example: '' };
      next.leftColumn = {
        badge: next.leftColumn?.badge || 'Bloque A',
        title: first.title || 'Columna Izquierda',
        text: first.text || '',
        items: first.example ? [first.example] : (next.leftColumn?.items?.length ? next.leftColumn.items : ['Punto clave 1', 'Punto clave 2'])
      };
    }
    if ((isLayoutChange && extractedItems.length > 1) || !next.rightColumn) {
      const second = extractedItems[1] || { title: 'Columna Derecha', text: 'Ideas principales del segundo bloque.', example: '' };
      next.rightColumn = {
        badge: next.rightColumn?.badge || 'Bloque B',
        title: second.title || 'Columna Derecha',
        text: second.text || '',
        items: second.example ? [second.example] : (next.rightColumn?.items?.length ? next.rightColumn.items : ['Punto comparativo 1', 'Punto comparativo 2'])
      };
    }
  } else if (targetLayout === 'title_body') {
    if ((isLayoutChange && extractedItems.length > 0) || !next.body) {
      next.body = extractedItems.length > 0
        ? extractedItems.map(it => `${it.title ? it.title + ': ' : ''}${it.text}`).filter(Boolean).join('\n\n')
        : (next.content || next.subtitle || 'Escribe aquí el contenido principal de la diapositiva.');
    }
    if (next.callout === undefined) {
      next.callout = extractedItems[0]?.example || '';
    }
  } else if (targetLayout === 'image_text') {
    if (!next.imageUrl) {
      next.imageUrl = createDefaultSlide('image_text').imageUrl;
    }
    if (!next.imagePosition) next.imagePosition = 'right';
    if ((isLayoutChange && extractedItems.length > 0) || !next.body) {
      next.body = extractedItems.length > 0
        ? extractedItems.map(it => `${it.title ? it.title + ': ' : ''}${it.text}`).filter(Boolean).join('\n\n')
        : (next.content || next.subtitle || 'Explicación visual acompañada de imagen o gráfico.');
    }
  } else if (targetLayout === 'table') {
    if ((isLayoutChange && extractedItems.length > 0) || !next.table || !Array.isArray(next.table.rows) || next.table.rows.length === 0) {
      const rows = extractedItems.length > 0
        ? extractedItems.map(it => [it.title || 'Concepto', it.text || 'Explicación', it.example || 'Ejemplo'])
        : [
            ['Concepto 1', 'Definición principal', 'Ejemplo 1'],
            ['Concepto 2', 'Segunda definición', 'Ejemplo 2']
          ];
      next.table = {
        headers: Array.isArray(next.table?.headers) && next.table.headers.length > 0
          ? next.table.headers
          : ['Concepto', 'Explicación', 'Ejemplo'],
        rows
      };
    }
  } else if (targetLayout === 'quote') {
    if ((isLayoutChange && extractedItems.length > 0) || !next.quoteText) {
      next.quoteText = next.body || next.subtitle || extractedItems[0]?.text || 'Escribe aquí la cita, regla de oro o conclusión destacada.';
    }
    if (next.quoteAuthor === undefined || (isLayoutChange && extractedItems[0]?.title)) {
      next.quoteAuthor = extractedItems[0]?.title || next.quoteAuthor || 'Idea clave';
    }
  } else if (targetLayout === 'section') {
    if (!next.badge) next.badge = `Sección ${slideIdx + 1}`;
    if (!next.subtitle) next.subtitle = next.body || extractedItems[0]?.text || 'Resumen de los contenidos de esta sección';
  } else if (targetLayout === 'title') {
    if (!next.subtitle) next.subtitle = next.description || next.body || extractedItems[0]?.text || 'Subtítulo de la presentación';
  }

  return next;
};

// =========================================================================
// ELEMENTOS LIBRES DEL LIENZO (PowerPoint / Google Slides Canvas Layer)
// =========================================================================
export const clampElementRect = (rect = {}) => {
  const numW = Number(rect.w);
  const numH = Number(rect.h);
  const numX = Number(rect.x);
  const numY = Number(rect.y);

  const rawW = Number.isFinite(numW) ? numW : 30;
  const rawH = Number.isFinite(numH) ? numH : 18;
  const w = Math.max(6, Math.min(100, rawW));
  const h = Math.max(5, Math.min(100, rawH));
  const x = Math.max(-5, Math.min(100 - Math.min(w, 15), Number.isFinite(numX) ? numX : 15));
  const y = Math.max(-5, Math.min(100 - Math.min(h, 10), Number.isFinite(numY) ? numY : 20));
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    w: Math.round(w * 100) / 100,
    h: Math.round(h * 100) / 100
  };
};

export const createCanvasElement = (type = 'textbox', overrides = {}) => {
  const id = overrides.id || `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (type === 'shape') {
    const rect = clampElementRect({ x: overrides.x ?? 30, y: overrides.y ?? 30, w: overrides.w ?? 36, h: overrides.h ?? 24 });
    return {
      ...overrides,
      id,
      type: 'shape',
      shapeType: overrides.shapeType || 'rounded', // 'rect' | 'rounded' | 'circle' | 'pill' | 'callout' | 'banner' | 'divider'
      text: overrides.text !== undefined ? overrides.text : 'Texto en forma',
      fill: overrides.fill || '#AD3333',
      stroke: overrides.stroke || 'transparent',
      textColor: overrides.textColor || '#FFFFFF',
      fontSize: overrides.fontSize || 16,
      bold: overrides.bold !== undefined ? overrides.bold : true,
      italic: !!overrides.italic,
      underline: !!overrides.underline,
      align: overrides.align || 'center',
      opacity: overrides.opacity ?? 1,
      ...rect
    };
  }

  if (type === 'note') {
    const rect = clampElementRect({ x: overrides.x ?? 62, y: overrides.y ?? 18, w: overrides.w ?? 30, h: overrides.h ?? 28 });
    return {
      ...overrides,
      id,
      type: 'note',
      text: overrides.text !== undefined ? overrides.text : 'Nota importante o recordatorio para la clase.',
      fill: overrides.fill || '#FEF08A',
      stroke: overrides.stroke || '#FACC15',
      textColor: overrides.textColor || '#713F12',
      fontSize: overrides.fontSize || 14,
      bold: !!overrides.bold,
      italic: !!overrides.italic,
      align: overrides.align || 'left',
      ...rect
    };
  }

  if (type === 'badge') {
    const rect = clampElementRect({ x: overrides.x ?? 8, y: overrides.y ?? 10, w: overrides.w ?? 24, h: overrides.h ?? 9 });
    return {
      ...overrides,
      id,
      type: 'badge',
      text: overrides.text !== undefined ? overrides.text : '★ CONCEPTO CLAVE',
      fill: overrides.fill || '#AD3333',
      stroke: overrides.stroke || 'transparent',
      textColor: overrides.textColor || '#FFFFFF',
      fontSize: overrides.fontSize || 12,
      bold: overrides.bold !== undefined ? overrides.bold : true,
      align: overrides.align || 'center',
      ...rect
    };
  }

  if (type === 'image') {
    const rect = clampElementRect({ x: overrides.x ?? 55, y: overrides.y ?? 22, w: overrides.w ?? 36, h: overrides.h ?? 50 });
    return {
      ...overrides,
      id,
      type: 'image',
      imageUrl: overrides.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280"><rect width="400" height="280" rx="20" fill="%23334155"/><circle cx="130" cy="100" r="32" fill="%23f59e0b"/><path d="M50 230 L150 130 L230 200 L290 145 L360 230 Z" fill="%2364748b"/></svg>',
      fit: overrides.fit || 'cover',
      borderRadius: overrides.borderRadius ?? 16,
      caption: overrides.caption || '',
      ...rect
    };
  }

  // Default: 'textbox'
  const rect = clampElementRect({ x: overrides.x ?? 15, y: overrides.y ?? 25, w: overrides.w ?? 50, h: overrides.h ?? 20 });
  return {
    ...overrides,
    id,
    type: 'textbox',
    text: overrides.text !== undefined ? overrides.text : 'Escribe tu texto aquí...',
    fill: overrides.fill || 'transparent',
    stroke: overrides.stroke || 'transparent',
    textColor: overrides.textColor || '',
    fontSize: overrides.fontSize || 18,
    bold: !!overrides.bold,
    italic: !!overrides.italic,
    underline: !!overrides.underline,
    align: overrides.align || 'left',
    ...rect
  };
};

// =========================================================================
// PLANTILLAS INICIALES PARA CREACIÓN RÁPIDA ("Nueva Presentación")
// =========================================================================
export const SLIDE_STARTER_TEMPLATES = [
  {
    id: 'blank_deck',
    name: 'En blanco estructurada',
    desc: 'Portada, conceptos y puntos clave listos para personalizar',
    theme: 'unipamplona',
    buildSlides: (title = 'Nueva Presentación') => [
      {
        ...createDefaultSlide('title', 0),
        title,
        subtitle: 'Objetivos de la sesión y conceptos fundamentales'
      },
      createDefaultSlide('cards', 1),
      createDefaultSlide('bullets', 2)
    ]
  },
  {
    id: 'grammar_deck',
    name: 'Gramática y Estructuras',
    desc: 'Portada, comparativa en 2 columnas, tabla de reglas y quiz',
    theme: 'ocean',
    buildSlides: (title = 'Grammar & Structures') => [
      {
        ...createDefaultSlide('title', 0),
        badge: 'Grammar Focus',
        title,
        subtitle: 'Usage rules, affirmative/negative structures, and real-world examples'
      },
      {
        ...createDefaultSlide('two_columns', 1),
        title: 'Structure Comparison: Form A vs. Form B'
      },
      {
        ...createDefaultSlide('table', 2),
        title: 'Conjugation & Key Patterns'
      },
      createDefaultSlide('quiz', 3)
    ]
  },
  {
    id: 'vocab_deck',
    name: 'Vocabulario y Contexto Visual',
    desc: 'Portada, tarjetas de términos, análisis de imagen y quiz',
    theme: 'midnight',
    buildSlides: (title = 'Technical Vocabulary') => [
      {
        ...createDefaultSlide('title', 0),
        badge: 'Key Terminology',
        title,
        subtitle: 'Core terms, collocations, and professional communication in context'
      },
      createDefaultSlide('cards', 1),
      createDefaultSlide('image_text', 2),
      createDefaultSlide('quiz', 3)
    ]
  },
  {
    id: 'case_study_deck',
    name: 'Caso de Estudio y Debate',
    desc: 'Portada, cifra/cita clave, análisis de pros y contras, conclusión',
    theme: 'emerald',
    buildSlides: (title = 'Case Study & Analysis') => [
      {
        ...createDefaultSlide('title', 0),
        badge: 'Case Study',
        title,
        subtitle: 'Critical reading, key indicators, and discussion scenarios'
      },
      createDefaultSlide('quote', 1),
      {
        ...createDefaultSlide('two_columns', 2),
        title: 'Advantages vs. Challenges'
      },
      createDefaultSlide('bullets', 3)
    ]
  }
];

// =========================================================================
// MOTOR DE GENERACIÓN Y CO-PILOTO CON INTELIGENCIA ARTIFICIAL
// =========================================================================
export const buildDeckAiPrompt = ({
  topic = '',
  language = 'Inglés',
  slideCount = 6,
  focusMode = 'balanced',
  extraNotes = ''
}) => {
  const cleanTopic = String(topic || '').trim();
  const count = Math.max(2, Math.min(15, Number(slideCount) || 6));

  const focusInstructions = {
    balanced: 'Combina variedad de diseños: portada ("title"), tarjetas ("cards"), dos columnas comparativas ("two_columns"), lista de puntos ("bullets"), tabla ("table") o cita ("quote"), y cierra con un "quiz" interactivo.',
    grammar: 'Enfócate en reglas gramaticales claras, estructuras afirmativas/negativas/interrogativas usando "two_columns" y "table", ejemplos reales en "cards" y un "quiz" de aplicación.',
    vocabulary: 'Enfócate en vocabulario técnico, definiciones precisas, colocaciones (collocations) y ejemplos aplicados en "cards", "table" y "bullets", cerrando con un "quiz".',
    case_study: 'Enfócate en análisis de un caso real, datos clave ("quote"), comparación de escenarios ("two_columns"), puntos de discusión ("bullets") y un "quiz" analítico.',
    quiz_heavy: 'Incluye un resumen inicial en "cards" o "bullets" y dedica al menos la mitad de las diapositivas a preguntas de comprobación interactivas ("quiz").'
  }[focusMode] || '';

  return `Actúa como un diseñador instruccional experto y profesor universitario de alto nivel.
Crea una presentación de diapositivas estilo PowerPoint / Google Slides sobre el tema: "${cleanTopic}".
${extraNotes ? `\nMaterial o indicaciones adicionales del docente:\n"""\n${extraNotes.trim()}\n"""\n` : ''}
IDIOMA OBLIGATORIO: "${language}".
TODO el contenido (títulos, subtítulos, tarjetas, columnas, celdas de tabla, citas, preguntas de quiz, opciones, explicaciones y notas del orador) DEBE estar redactado en ${language}.

Cantidad exacta requerida: ${count} diapositivas.
Enfoque pedagógico: ${focusInstructions}

Diseños ("layout") permitidos y su estructura JSON:
1. "title": { "id": 1, "layout": "title", "badge": "Categoría breve", "title": "Título principal", "subtitle": "Subtítulo descriptivo", "speakerNotes": "Guía breve para el profesor" }
2. "cards": { "id": 2, "layout": "cards", "title": "Título", "cards": [{ "title": "Concepto 1", "text": "Explicación clara", "example": "Ejemplo concreto" }, { "title": "Concepto 2", "text": "Explicación", "example": "Ejemplo" }, { "title": "Concepto 3", "text": "Explicación", "example": "Ejemplo" }], "speakerNotes": "Notas del orador" }
3. "two_columns": { "id": 3, "layout": "two_columns", "title": "Comparación", "leftColumn": { "badge": "A", "title": "Subtítulo A", "text": "Resumen A", "items": ["Punto 1", "Ejemplo 1"] }, "rightColumn": { "badge": "B", "title": "Subtítulo B", "text": "Resumen B", "items": ["Punto 1", "Ejemplo 1"] }, "speakerNotes": "Notas del orador" }
4. "bullets": { "id": 4, "layout": "bullets", "title": "Puntos Clave", "bullets": [{ "title": "Punto 1", "text": "Explicación", "example": "Ejemplo" }, { "title": "Punto 2", "text": "Explicación", "example": "Ejemplo" }], "speakerNotes": "Notas del orador" }
5. "table": { "id": 5, "layout": "table", "title": "Tabla Comparativa", "subtitle": "Contexto", "table": { "headers": ["Columna 1", "Columna 2", "Ejemplo"], "rows": [["Dato 1", "Detalle 1", "Ejemplo 1"], ["Dato 2", "Detalle 2", "Ejemplo 2"]] }, "speakerNotes": "Notas del orador" }
6. "quote": { "id": 6, "layout": "quote", "badge": "Idea Clave", "title": "Principio Esencial", "quoteText": "Frase o regla fundamental para recordar", "quoteAuthor": "Referencia o síntesis", "speakerNotes": "Notas del orador" }
7. "quiz": { "id": ${count}, "layout": "quiz", "title": "Quiz de Comprobación", "question": "¿Pregunta clara en ${language}?", "options": [{ "text": "Opción A", "isCorrect": false, "explanation": "Por qué no es correcta" }, { "text": "Opción B", "isCorrect": true, "explanation": "Por qué es la respuesta correcta" }, { "text": "Opción C", "isCorrect": false, "explanation": "Explicación" }, { "text": "Opción D", "isCorrect": false, "explanation": "Explicación" }], "speakerNotes": "Notas del orador" }

Devuelve ÚNICAMENTE un array JSON válido de ${count} objetos sin bloques markdown ni texto adicional.`;
};

export const normalizeSingleSlide = (rawSlide, idx = 0) => {
  if (!rawSlide || typeof rawSlide !== 'object') {
    return createDefaultSlide('cards', idx);
  }
  const layout = resolveSlideLayout(rawSlide, idx);
  const normalized = {
    ...rawSlide,
    id: rawSlide.id || `slide_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    layout,
    title: String(rawSlide.title || rawSlide.heading || `Diapositiva ${idx + 1}`).trim(),
    subtitle: rawSlide.subtitle !== undefined ? String(rawSlide.subtitle || '') : (rawSlide.description ? String(rawSlide.description) : ''),
    speakerNotes: rawSlide.speakerNotes ? String(rawSlide.speakerNotes) : '',
    elements: Array.isArray(rawSlide.elements) ? rawSlide.elements : []
  };

  const normalizeColItems = (colObj) => {
    const rawItems = Array.isArray(colObj?.items)
      ? colObj.items
      : Array.isArray(colObj?.bullets)
        ? colObj.bullets
        : typeof colObj?.items === 'string'
          ? colObj.items.split('\n').filter(Boolean)
          : [];
    return rawItems
      .map(it => {
        if (typeof it === 'object' && it !== null) {
          return String(it.text || it.title || it.example || '').trim();
        }
        return String(it ?? '').trim();
      })
      .filter(Boolean);
  };

  if (layout === 'cards') {
    const rawCards = Array.isArray(rawSlide.cards) ? rawSlide.cards : [];
    normalized.cards = rawCards.length > 0
      ? rawCards.map((c, cIdx) => ({
          title: String(c?.title || `Concepto ${cIdx + 1}`),
          text: String(c?.text || c?.description || ''),
          example: String(c?.example || '')
        }))
      : [{ title: normalized.title, text: String(rawSlide.content || rawSlide.body || normalized.subtitle || ''), example: '' }];
  } else if (layout === 'bullets') {
    const rawBullets = Array.isArray(rawSlide.bullets) ? rawSlide.bullets : [];
    normalized.bullets = rawBullets.length > 0
      ? rawBullets.map((b, bIdx) => (typeof b === 'object' && b !== null)
          ? { title: String(b.title || `Punto ${bIdx + 1}`), text: String(b.text || b.description || ''), example: String(b.example || '') }
          : { title: String(b || `Punto ${bIdx + 1}`), text: '', example: '' })
      : [{ title: normalized.title, text: String(rawSlide.content || rawSlide.body || ''), example: '' }];
  } else if (layout === 'two_columns') {
    normalized.leftColumn = {
      badge: String(rawSlide.leftColumn?.badge || 'Columna A'),
      title: String(rawSlide.leftColumn?.title || 'Primer Bloque'),
      text: String(rawSlide.leftColumn?.text || ''),
      items: normalizeColItems(rawSlide.leftColumn)
    };
    normalized.rightColumn = {
      badge: String(rawSlide.rightColumn?.badge || 'Columna B'),
      title: String(rawSlide.rightColumn?.title || 'Segundo Bloque'),
      text: String(rawSlide.rightColumn?.text || ''),
      items: normalizeColItems(rawSlide.rightColumn)
    };
  } else if (layout === 'table') {
    const headers = Array.isArray(rawSlide.table?.headers) && rawSlide.table.headers.length > 0
      ? rawSlide.table.headers.map(h => String(typeof h === 'object' && h !== null ? (h.text || h.title || '') : (h ?? '')))
      : ['Concepto', 'Explicación', 'Ejemplo'];
    const rows = Array.isArray(rawSlide.table?.rows) && rawSlide.table.rows.length > 0
      ? rawSlide.table.rows.map(r => {
          if (Array.isArray(r)) {
            return r.map(cell => String(typeof cell === 'object' && cell !== null ? (cell.text || cell.value || '') : (cell ?? '')));
          }
          if (typeof r === 'object' && r !== null) {
            const byHeader = headers.map(h => r[h]).some(v => v !== undefined);
            return byHeader
              ? headers.map(h => String(r[h] ?? ''))
              : Object.values(r).map(v => String(v ?? ''));
          }
          return [String(r || '')];
        })
      : [['Elemento 1', 'Detalle 1', 'Ejemplo 1']];
    normalized.table = { headers, rows };
  } else if (layout === 'quote') {
    normalized.quoteText = String(rawSlide.quoteText || rawSlide.body || rawSlide.content || normalized.subtitle || normalized.title);
    normalized.quoteAuthor = String(rawSlide.quoteAuthor || rawSlide.badge || '');
    normalized.statValue = rawSlide.statValue ? String(rawSlide.statValue) : '';
  } else if (layout === 'title_body') {
    normalized.body = String(rawSlide.body || rawSlide.content || normalized.subtitle || '');
    normalized.callout = rawSlide.callout ? String(rawSlide.callout) : '';
  } else if (layout === 'image_text') {
    normalized.imageUrl = rawSlide.imageUrl || createDefaultSlide('image_text').imageUrl;
    normalized.imagePosition = rawSlide.imagePosition === 'left' ? 'left' : 'right';
    normalized.imageCaption = rawSlide.imageCaption ? String(rawSlide.imageCaption) : '';
    normalized.body = String(rawSlide.body || rawSlide.content || normalized.subtitle || '');
    normalized.callout = rawSlide.callout ? String(rawSlide.callout) : '';
  } else if (layout === 'quiz') {
    normalized.type = 'quiz';
    normalized.question = String(rawSlide.question || rawSlide.content || normalized.title || '¿Cuál es la respuesta correcta?');
    const rawOpts = Array.isArray(rawSlide.options) && rawSlide.options.length > 0
      ? rawSlide.options
      : [
          { text: rawSlide.answer || 'Opción A (Correcta)', isCorrect: true, explanation: '¡Correcto!' },
          { text: 'Opción B', isCorrect: false, explanation: '' }
        ];
    const mappedOpts = rawOpts.map((o, oIdx) => (typeof o === 'object' && o !== null)
      ? { text: String(o.text || `Opción ${String.fromCharCode(65 + oIdx)}`), isCorrect: !!o.isCorrect, explanation: String(o.explanation || '') }
      : { text: String(o), isCorrect: oIdx === 0, explanation: '' }
    );
    if (!mappedOpts.some(o => o.isCorrect) && mappedOpts.length > 0) {
      mappedOpts[0].isCorrect = true;
    }
    normalized.options = mappedOpts;
  }

  return normalized;
};

const extractBalancedJson = (text, openChar, closeChar, validator) => {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const startIdx = text.indexOf(openChar, searchFrom);
    if (startIdx === -1) break;

    let depth = 0;
    let inString = false;
    let escape = false;
    let matchedEnd = -1;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
          depth--;
          if (depth === 0) {
            matchedEnd = i;
            break;
          }
        }
      }
    }

    if (matchedEnd !== -1) {
      try {
        const candidate = JSON.parse(text.substring(startIdx, matchedEnd + 1));
        if (validator(candidate)) {
          return candidate;
        }
      } catch {
        // Seguir buscando desde el siguiente carácter
      }
    }
    searchFrom = startIdx + 1;
  }
  return null;
};

export const parseDeckAiResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1. Intentar extraer array JSON [...] balanceado cuyos elementos sean objetos de diapositiva
  let parsed = extractBalancedJson(
    clean,
    '[',
    ']',
    (candidate) => Array.isArray(candidate) && candidate.length > 0 && candidate.some(it => it && typeof it === 'object' && !Array.isArray(it))
  );

  // 2. Fallback a objeto JSON { slides: [...] } o diapositiva única {...}
  if (!parsed) {
    const obj = extractBalancedJson(
      clean,
      '{',
      '}',
      (candidate) => Boolean(
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        ((Array.isArray(candidate.slides) && candidate.slides.length > 0) ||
          candidate.title || candidate.layout || candidate.cards || candidate.bullets || candidate.question)
      )
    );
    if (obj) {
      parsed = Array.isArray(obj.slides) && obj.slides.length > 0 ? obj.slides : [obj];
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed.map((s, idx) => normalizeSingleSlide(s, idx));
};

export const buildSingleSlideAiPrompt = ({
  action = 'generate_new',
  promptText = '',
  targetLayout = 'auto',
  language = 'Inglés',
  currentSlide = null,
  presentationTopic = ''
}) => {
  const layoutHint = targetLayout && targetLayout !== 'auto'
    ? `Usa obligatoriamente el layout: "${targetLayout}".`
    : 'Elige el layout más pedagógico entre: "cards", "two_columns", "bullets", "table", "title_body", "quote" o "quiz".';

  if (action === 'generate_new') {
    return `Actúa como un profesor universitario y diseñador de presentaciones.
Crea UNA (1) diapositiva completa sobre: "${promptText || presentationTopic}".
Contexto de la presentación: "${presentationTopic}".
Idioma obligatorio: ${language}.
${layoutHint}
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown) con la estructura correspondiente al layout elegido (incluyendo "layout", "title", "speakerNotes" y los campos propios del layout como "cards", "bullets", "leftColumn"/"rightColumn", "table", "body" o "question"/"options").`;
  }

  const serializedCurrent = JSON.stringify({
    layout: currentSlide?.layout,
    title: currentSlide?.title,
    subtitle: currentSlide?.subtitle,
    body: currentSlide?.body,
    cards: currentSlide?.cards,
    bullets: currentSlide?.bullets,
    leftColumn: currentSlide?.leftColumn,
    rightColumn: currentSlide?.rightColumn,
    table: currentSlide?.table,
    quoteText: currentSlide?.quoteText,
    question: currentSlide?.question,
    options: currentSlide?.options
  });

  const actionInstructions = {
    expand: `Amplía y enriquece las explicaciones, añade mejores ejemplos prácticos y genera notas del orador ("speakerNotes") detalladas en ${language}. Mantén el layout "${currentSlide?.layout || 'cards'}".`,
    summarize: `Sintetiza y haz más conciso, claro y directo todo el texto de la diapositiva para que sea fácil de leer al proyectar en clase. Idioma: ${language}.`,
    translate: `Traduce íntegramente todos los textos de esta diapositiva al idioma: ${language} (conservando los ejemplos claros y el mismo layout).`,
    to_two_columns: `Transforma el contenido de esta diapositiva al layout "two_columns" (comparación en dos columnas: "leftColumn" y "rightColumn" con "badge", "title", "text" e "items") en ${language}.`,
    to_table: `Transforma el contenido de esta diapositiva al layout "table" (con "table": { "headers": [...], "rows": [[...]] }) en ${language}.`,
    to_quiz: `Crea una diapositiva con layout "quiz" (pregunta de opción múltiple con 4 opciones en "options", una con "isCorrect": true y "explanation") que evalúe el contenido de esta diapositiva en ${language}.`
  }[action] || `Mejora esta diapositiva según la instrucción: "${promptText}" en ${language}.`;

  return `Diapositiva actual en JSON:
${serializedCurrent}

Tarea: ${actionInstructions}
Devuelve ÚNICAMENTE el objeto JSON de la diapositiva resultante sin markdown ni texto extra.`;
};

export const parseSingleSlideAiResponse = (rawText, idx = 0) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = extractBalancedJson(
    clean,
    '{',
    '}',
    (candidate) => Boolean(
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      ((Array.isArray(candidate.slides) && candidate.slides.length > 0) ||
        candidate.title || candidate.layout || candidate.cards || candidate.bullets || candidate.question || candidate.quoteText || candidate.table || candidate.leftColumn)
    )
  );
  if (parsed) {
    if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return normalizeSingleSlide(parsed.slides[0], idx);
    }
    return normalizeSingleSlide(parsed, idx);
  }
  const asDeck = parseDeckAiResponse(rawText);
  return asDeck && asDeck.length > 0 ? asDeck[0] : null;
};

export const buildFallbackAiSlides = ({ topic = 'Lección Interactiva', language = 'Inglés', slideCount = 5 }) => {
  const cleanTopic = String(topic || 'Lección Interactiva').trim();
  const isEn = language.toLowerCase().includes('ingl');
  const pool = [
    {
      id: `fallback_1_${Date.now()}`,
      layout: 'title',
      badge: isEn ? 'Academic Presentation' : 'Presentación Académica',
      title: cleanTopic,
      subtitle: isEn
        ? `Key concepts, comparative structures, and practical examples about ${cleanTopic}`
        : `Conceptos fundamentales, estructuras comparativas y ejemplos prácticos sobre ${cleanTopic}`,
      speakerNotes: isEn
        ? `Introduce the main topic (${cleanTopic}) and ask students about their prior knowledge.`
        : `Presenta el tema principal (${cleanTopic}) e indaga los conocimientos previos del grupo.`
    },
    {
      id: `fallback_2_${Date.now()}`,
      layout: 'cards',
      title: isEn ? `Core Concepts: ${cleanTopic}` : `Conceptos Clave: ${cleanTopic}`,
      cards: [
        {
          title: isEn ? 'Definition & Scope' : 'Definición y Alcance',
          text: isEn
            ? `Fundamental principles and context that define ${cleanTopic} in academic and professional settings.`
            : `Principios fundamentales y contexto que definen ${cleanTopic} en el ámbito académico y profesional.`,
          example: isEn ? `Applied context in ${cleanTopic}.` : `Aplicación directa en ${cleanTopic}.`
        },
        {
          title: isEn ? 'Key Structure & Usage' : 'Estructura y Uso Principal',
          text: isEn
            ? 'Essential patterns, terminology, and rules required for accurate communication.'
            : 'Patrones esenciales, terminología y reglas necesarias para una comunicación precisa.',
          example: isEn ? 'Model sentence in real context.' : 'Oración modelo en contexto real.'
        },
        {
          title: isEn ? 'Practical Impact' : 'Aplicación Práctica',
          text: isEn
            ? 'How to identify and apply these concepts when analyzing real-world cases.'
            : 'Cómo identificar y aplicar estos conceptos al analizar casos reales.',
          example: isEn ? 'Case study example.' : 'Ejemplo de caso práctico.'
        }
      ],
      speakerNotes: isEn ? 'Review each card and ask for student examples.' : 'Revisa cada tarjeta y pide ejemplos a los estudiantes.'
    },
    {
      id: `fallback_3_${Date.now()}`,
      layout: 'two_columns',
      title: isEn ? 'Comparative Analysis' : 'Análisis Comparativo',
      leftColumn: {
        badge: isEn ? 'Perspective A' : 'Enfoque A',
        title: isEn ? 'Standard / Formal Usage' : 'Uso Formal y Estructurado',
        text: isEn ? 'Used in reports, academic writing, and executive presentations.' : 'Empleado en reportes, textos académicos y presentaciones ejecutivas.',
        items: [
          isEn ? 'Precise technical vocabulary' : 'Vocabulario técnico preciso',
          isEn ? 'Objective and verifiable data' : 'Datos objetivos y verificables'
        ]
      },
      rightColumn: {
        badge: isEn ? 'Perspective B' : 'Enfoque B',
        title: isEn ? 'Practical / Dynamic Usage' : 'Aplicación Dinámica en Clase',
        text: isEn ? 'Used in interactive discussions, negotiations, and problem solving.' : 'Empleado en debates interactivos, negociaciones y resolución de problemas.',
        items: [
          isEn ? 'Direct cause-and-effect connectors' : 'Conectores directos de causa y efecto',
          isEn ? 'Action-oriented examples' : 'Ejemplos orientados a la acción'
        ]
      },
      speakerNotes: isEn ? 'Contrast both columns with the class.' : 'Contrasta ambas columnas con la clase.'
    },
    {
      id: `fallback_4_${Date.now()}`,
      layout: 'table',
      title: isEn ? 'Summary Reference Table' : 'Tabla de Referencia Rápida',
      subtitle: isEn ? `Structured overview of ${cleanTopic}` : `Síntesis estructurada sobre ${cleanTopic}`,
      table: {
        headers: isEn ? ['Category', 'Key Principle', 'Example'] : ['Categoría', 'Principio Clave', 'Ejemplo'],
        rows: [
          [
            isEn ? 'Foundation' : 'Fundamento',
            isEn ? `Core rule of ${cleanTopic}` : `Regla base de ${cleanTopic}`,
            isEn ? 'Primary application in context' : 'Aplicación principal en contexto'
          ],
          [
            isEn ? 'Implementation' : 'Implementación',
            isEn ? 'Analytical structure' : 'Estructura analítica',
            isEn ? 'Comparative statement' : 'Enunciado comparativo'
          ],
          [
            isEn ? 'Evaluation' : 'Evaluación',
            isEn ? 'Verification criteria' : 'Criterio de verificación',
            isEn ? 'Final review check' : 'Comprobación final'
          ]
        ]
      },
      speakerNotes: ''
    },
    {
      id: `fallback_5_${Date.now()}`,
      layout: 'bullets',
      title: isEn ? 'Key Takeaways & Best Practices' : 'Puntos Clave para Recordar',
      bullets: [
        {
          title: isEn ? 'Identify the context first' : 'Identificar siempre el contexto',
          text: isEn ? 'Analyze the communicative purpose before selecting the structure.' : 'Analiza el propósito comunicativo antes de elegir la estructura.',
          example: isEn ? 'Check time markers and subject.' : 'Verifica los marcadores de tiempo y el sujeto.'
        },
        {
          title: isEn ? 'Use accurate connectors' : 'Emplear conectores precisos',
          text: isEn ? 'Link ideas logically to build coherent arguments.' : 'Vincula las ideas con lógica para construir argumentos coherentes.',
          example: isEn ? 'Therefore, however, consequently.' : 'Por lo tanto, sin embargo, en consecuencia.'
        }
      ],
      speakerNotes: ''
    },
    {
      id: `fallback_6_${Date.now()}`,
      layout: 'quiz',
      type: 'quiz',
      title: isEn ? `Quick Check: ${cleanTopic}` : `Comprobación: ${cleanTopic}`,
      question: isEn
        ? `Which statement best represents a key principle of ${cleanTopic}?`
        : `¿Cuál de las siguientes afirmaciones aplica mejor los conceptos de ${cleanTopic}?`,
      options: [
        {
          text: isEn ? 'Applying structured terminology and context-appropriate examples.' : 'Aplicar la estructura y terminología acorde al contexto real.',
          isCorrect: true,
          explanation: isEn ? 'Correct! Context and structure work together.' : '¡Correcto! El contexto y la estructura trabajan en conjunto.'
        },
        {
          text: isEn ? 'Ignoring context and using random isolated words.' : 'Omitir el contexto y usar palabras aisladas sin relación.',
          isCorrect: false,
          explanation: isEn ? 'Context is always essential.' : 'El contexto siempre es indispensable.'
        },
        {
          text: isEn ? 'Avoiding examples in technical communication.' : 'Evitar el uso de ejemplos prácticos en clase.',
          isCorrect: false,
          explanation: isEn ? 'Examples clarify complex ideas.' : 'Los ejemplos clarifican las ideas complejas.'
        },
        {
          text: isEn ? 'Using only informal expressions in academic reports.' : 'Usar únicamente expresiones informales en reportes.',
          isCorrect: false,
          explanation: isEn ? 'Academic reports require precision.' : 'Los reportes requieren precisión académica.'
        }
      ],
      speakerNotes: ''
    }
  ];

  const count = Math.max(2, Math.min(12, Number(slideCount) || 5));
  if (count <= pool.length) {
    const selected = [...pool.slice(0, count - 1), pool[pool.length - 1]];
    return selected.map((s, i) => normalizeSingleSlide(s, i));
  }
  const extended = [...pool];
  while (extended.length < count) {
    const extraIdx = extended.length;
    extended.splice(extended.length - 1, 0, {
      ...createDefaultSlide(extraIdx % 2 === 0 ? 'cards' : 'bullets', extraIdx),
      title: `${cleanTopic} — Parte ${extraIdx}`
    });
  }
  return extended.map((s, i) => normalizeSingleSlide(s, i));
};

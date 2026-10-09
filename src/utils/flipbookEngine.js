/**
 * 3D Interactive Flipbook Engine
 * Handles PDF-to-page rendering via pdfjs-dist, illustrated SVG book generation,
 * 3D spread/page curl geometry, Web Audio paper-flip sound synthesis,
 * and Firestore 1MB payload protection.
 */

export const MAX_TOTAL_FIRESTORE_BOOK_CHARS = 650000;
export const DEFAULT_BOOK_ASPECT_RATIO = 0.707; // Standard A4 / Academic textbook portrait ratio (width / height)

export const BOOK_THEMES = {
    'royal-indigo': {
        id: 'royal-indigo',
        name: 'Índigo',
        spineColor: '#312e81',
        coverBg: '#1e1b4b',
        coverSecondary: '#3730a3',
        accentColor: '#818cf8',
        badgeBg: '#4338ca',
        pageTint: '#fffdf9',
        textLight: '#eef2ff'
    },
    'emerald-ledger': {
        id: 'emerald-ledger',
        name: 'Esmeralda',
        spineColor: '#064e3b',
        coverBg: '#022c22',
        coverSecondary: '#065f46',
        accentColor: '#34d399',
        badgeBg: '#047857',
        pageTint: '#fcfdfa',
        textLight: '#ecfdf5'
    },
    'crimson-oxford': {
        id: 'crimson-oxford',
        name: 'Carmesí',
        spineColor: '#7f1d1d',
        coverBg: '#450a0a',
        coverSecondary: '#991b1b',
        accentColor: '#fb7185',
        badgeBg: '#be123c',
        pageTint: '#fffcf9',
        textLight: '#fff1f2'
    },
    'amber-executive': {
        id: 'amber-executive',
        name: 'Ámbar',
        spineColor: '#78350f',
        coverBg: '#451a03',
        coverSecondary: '#92400e',
        accentColor: '#fbbf24',
        badgeBg: '#b45309',
        pageTint: '#fffdf7',
        textLight: '#fffbeb'
    },
    'slate-modern': {
        id: 'slate-modern',
        name: 'Pizarra',
        spineColor: '#0f172a',
        coverBg: '#020617',
        coverSecondary: '#1e293b',
        accentColor: '#38bdf8',
        badgeBg: '#0369a1',
        pageTint: '#f8fafc',
        textLight: '#f0f9ff'
    }
};

export const BOOK_CATEGORIES = [
    { id: 'textbook', label: 'Guía' },
    { id: 'case-study', label: 'Caso de estudio' },
    { id: 'glossary', label: 'Glosario' },
    { id: 'magazine', label: 'Revista' },
    { id: 'workbook', label: 'Cuaderno' }
];

export const getBookTheme = (themeId) => {
    return BOOK_THEMES[themeId] || BOOK_THEMES['royal-indigo'];
};

const escapeSvgText = (str = '') =>
    String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const wrapTextLines = (text = '', maxCharsPerLine = 42, maxLines = 6) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const words = clean.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharsPerLine) {
            current = candidate;
        } else {
            if (current) lines.push(current);
            current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine - 1) + '…' : word;
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (current && lines.length < maxLines) {
        lines.push(current);
    }
    return lines;
};

/**
 * Generates an illustrated SVG page as a data URL for demo books, covers, or CORS fallbacks.
 */
export const buildIllustratedBookPageSvg = ({
    variant = 'content',
    title = 'English for Economics',
    subtitle = '',
    chapter = '',
    body = [],
    bullets = [],
    calloutTitle = '',
    calloutText = '',
    keyTerms = [],
    stats = [],
    author = 'English Tech Faculty',
    pageNumber = 1,
    totalPages = 1,
    themeId = 'royal-indigo'
} = {}) => {
    const theme = getBookTheme(themeId);

    if (variant === 'cover') {
        const titleLines = wrapTextLines(title, 22, 3);
        const subLines = wrapTextLines(subtitle, 38, 3);
        const titleSvg = titleLines
            .map(
                (line, idx) =>
                    `<text x="90" y="${340 + idx * 58}" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="bold" fill="#ffffff">${escapeSvgText(line)}</text>`
            )
            .join('');
        const subSvg = subLines
            .map(
                (line, idx) =>
                    `<text x="90" y="${535 + idx * 30}" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${theme.textLight}" opacity="0.88">${escapeSvgText(line)}</text>`
            )
            .join('');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1130" width="800" height="1130">
            <defs>
                <linearGradient id="covBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${theme.coverBg}" />
                    <stop offset="55%" stop-color="${theme.spineColor}" />
                    <stop offset="100%" stop-color="${theme.coverSecondary}" />
                </linearGradient>
                <linearGradient id="spineShade" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0.55" />
                    <stop offset="35%" stop-color="#ffffff" stop-opacity="0.12" />
                    <stop offset="70%" stop-color="#000000" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                </linearGradient>
            </defs>
            <rect width="800" height="1130" fill="url(#covBg)" />
            <rect width="46" height="1130" fill="url(#spineShade)" />
            <rect x="64" y="54" width="682" height="1022" rx="18" fill="none" stroke="${theme.accentColor}" stroke-opacity="0.35" stroke-width="2" />
            <rect x="74" y="64" width="662" height="1002" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1" />
            <circle cx="650" cy="210" r="160" fill="${theme.accentColor}" fill-opacity="0.08" />
            <circle cx="610" cy="840" r="210" fill="${theme.accentColor}" fill-opacity="0.07" />
            <rect x="90" y="130" width="260" height="40" rx="20" fill="${theme.badgeBg}" stroke="${theme.accentColor}" stroke-opacity="0.6" stroke-width="1.5" />
            <text x="220" y="156" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" letter-spacing="2" fill="#ffffff">${escapeSvgText((chapter || 'LIBRO').toUpperCase().slice(0, 26))}</text>
            <line x1="90" y1="265" x2="260" y2="265" stroke="${theme.accentColor}" stroke-width="5" stroke-linecap="round" />
            ${titleSvg}
            ${subSvg}
            <g transform="translate(90, 665)">
                <rect width="620" height="230" rx="20" fill="#000000" fill-opacity="0.24" stroke="#ffffff" stroke-opacity="0.14" />
                <polyline points="45,175 145,130 240,150 350,85 455,105 565,45" fill="none" stroke="${theme.accentColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="145" cy="130" r="6" fill="#ffffff" />
                <circle cx="240" cy="150" r="6" fill="#ffffff" />
                <circle cx="350" cy="85" r="6" fill="#ffffff" />
                <circle cx="455" cy="105" r="6" fill="#ffffff" />
                <circle cx="565" cy="45" r="8" fill="${theme.accentColor}" stroke="#ffffff" stroke-width="2" />
                <text x="45" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="${theme.accentColor}" letter-spacing="1.5">TECHNICAL ENGLISH &amp; GLOBAL MARKETS</text>
                <text x="45" y="205" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">English Tech</text>
            </g>
            <text x="90" y="995" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="${theme.accentColor}" letter-spacing="1.2">AUTHOR / FACULTY</text>
            <text x="90" y="1024" font-family="Georgia, serif" font-size="22" fill="#ffffff">${escapeSvgText(author)}</text>
            <text x="710" y="1024" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#cbd5e1">${totalPages} Pages</text>
        </svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    if (variant === 'back-cover') {
        const summaryLines = wrapTextLines(
            subtitle || 'Review key concepts and complete the module activities on the class wall.',
            44,
            5
        );
        const summarySvg = summaryLines
            .map(
                (line, idx) =>
                    `<text x="400" y="${450 + idx * 34}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${theme.textLight}" opacity="0.9">${escapeSvgText(line)}</text>`
            )
            .join('');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1130" width="800" height="1130">
            <rect width="800" height="1130" fill="${theme.coverBg}" />
            <rect x="60" y="60" width="680" height="1010" rx="18" fill="none" stroke="${theme.accentColor}" stroke-opacity="0.35" stroke-width="2" />
            <circle cx="400" cy="280" r="64" fill="${theme.badgeBg}" stroke="${theme.accentColor}" stroke-width="2" />
            <text x="400" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#ffffff">ET</text>
            <text x="400" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#ffffff">${escapeSvgText(title.slice(0, 36))}</text>
            ${summarySvg}
            <rect x="230" y="860" width="340" height="90" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" />
            <text x="400" y="900" text-anchor="middle" font-family="monospace" font-size="16" fill="${theme.accentColor}">ISBN 978-958-8400-3D-${String(totalPages).padStart(2, '0')}</text>
            <text x="400" y="928" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">English Tech</text>
        </svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    // Standard interior textbook page
    const headingLines = wrapTextLines(title, 32, 2);
    const paragraphs = Array.isArray(body) ? body : [String(body || '')];
    let currentY = 185;

    const headingSvg = headingLines
        .map((line) => {
            const el = `<text x="72" y="${currentY}" font-family="Georgia, 'Times New Roman', serif" font-size="33" font-weight="bold" fill="#0f172a">${escapeSvgText(line)}</text>`;
            currentY += 42;
            return el;
        })
        .join('');

    if (subtitle) {
        currentY += 4;
    }
    const subtitleSvg = subtitle
        ? `<text x="72" y="${currentY}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${theme.spineColor}">${escapeSvgText(subtitle.slice(0, 62))}</text>`
        : '';
    if (subtitle) currentY += 36;
    else currentY += 12;

    let bodySvg = '';
    for (const para of paragraphs.slice(0, 3)) {
        const lines = wrapTextLines(para, 58, 5);
        for (const line of lines) {
            if (currentY > 680) break;
            bodySvg += `<text x="72" y="${currentY}" font-family="Georgia, 'Times New Roman', serif" font-size="19" fill="#334155">${escapeSvgText(line)}</text>`;
            currentY += 29;
        }
        currentY += 14;
    }

    let bulletsSvg = '';
    if (Array.isArray(bullets) && bullets.length > 0 && currentY < 760) {
        bulletsSvg += `<text x="72" y="${currentY + 6}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" letter-spacing="1.2" fill="${theme.spineColor}">KEY TAKEAWAYS &amp; STRUCTURES</text>`;
        currentY += 32;
        for (const item of bullets.slice(0, 4)) {
            const bLines = wrapTextLines(item, 52, 2);
            if (currentY > 820) break;
            bulletsSvg += `<circle cx="84" cy="${currentY - 6}" r="5" fill="${theme.badgeBg}" />`;
            bLines.forEach((bLine, idx) => {
                bulletsSvg += `<text x="102" y="${currentY + idx * 25}" font-family="system-ui, -apple-system, sans-serif" font-size="17" fill="#1e293b">${escapeSvgText(bLine)}</text>`;
            });
            currentY += bLines.length * 25 + 10;
        }
    }

    let statsSvg = '';
    if (Array.isArray(stats) && stats.length > 0 && currentY < 850) {
        const cardWidth = 195;
        const gap = 16;
        const boxY = Math.max(currentY + 6, 690);
        statsSvg = stats
            .slice(0, 3)
            .map((st, idx) => {
                const x = 72 + idx * (cardWidth + gap);
                return `<g transform="translate(${x}, ${boxY})">
                    <rect width="${cardWidth}" height="96" rx="14" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
                    <text x="18" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" fill="#64748b">${escapeSvgText(String(st.label || '').slice(0, 22))}</text>
                    <text x="18" y="72" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="${theme.spineColor}">${escapeSvgText(String(st.value || '').slice(0, 14))}</text>
                </g>`;
            })
            .join('');
        currentY = boxY + 116;
    }

    let calloutSvg = '';
    if ((calloutTitle || calloutText) && currentY < 960) {
        const boxY = Math.min(Math.max(currentY + 8, 825), 860);
        const cLines = wrapTextLines(calloutText, 54, 3);
        const cTextSvg = cLines
            .map(
                (line, idx) =>
                    `<text x="98" y="${boxY + 64 + idx * 24}" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#1e293b">${escapeSvgText(line)}</text>`
            )
            .join('');
        calloutSvg = `<g>
            <rect x="72" y="${boxY}" width="656" height="145" rx="16" fill="#eef2ff" stroke="${theme.accentColor}" stroke-width="2" />
            <rect x="72" y="${boxY}" width="10" height="145" rx="5" fill="${theme.badgeBg}" />
            <text x="98" y="${boxY + 34}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" letter-spacing="1" fill="${theme.spineColor}">${escapeSvgText((calloutTitle || 'ECONOMIC ENGLISH FOCUS').toUpperCase())}</text>
            ${cTextSvg}
        </g>`;
    } else if (Array.isArray(keyTerms) && keyTerms.length > 0) {
        const boxY = 835;
        const termsSvg = keyTerms
            .slice(0, 3)
            .map(
                (kt, idx) =>
                    `<text x="96" y="${boxY + 58 + idx * 28}" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#1e293b"><tspan font-weight="bold" fill="${theme.spineColor}">${escapeSvgText(kt.term)}: </tspan>${escapeSvgText(String(kt.definition || '').slice(0, 52))}</text>`
            )
            .join('');
        calloutSvg = `<g>
            <rect x="72" y="${boxY}" width="656" height="150" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
            <text x="96" y="${boxY + 30}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" letter-spacing="1.2" fill="${theme.spineColor}">KEY VOCABULARY GLOSSARY</text>
            ${termsSvg}
        </g>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1130" width="800" height="1130">
        <rect width="800" height="1130" fill="${theme.pageTint}" />
        <rect x="36" y="36" width="728" height="1058" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
        <text x="72" y="88" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" letter-spacing="1.5" fill="${theme.badgeBg}">${escapeSvgText((chapter || 'CHAPTER OVERVIEW').toUpperCase().slice(0, 44))}</text>
        <text x="728" y="88" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">${escapeSvgText(author.slice(0, 32))}</text>
        <line x1="72" y1="106" x2="728" y2="106" stroke="#cbd5e1" stroke-width="1.5" />
        <line x1="72" y1="106" x2="210" y2="106" stroke="${theme.badgeBg}" stroke-width="3.5" />
        ${headingSvg}
        ${subtitleSvg}
        ${bodySvg}
        ${bulletsSvg}
        ${statsSvg}
        ${calloutSvg}
        <line x1="72" y1="1032" x2="728" y2="1032" stroke="#e2e8f0" stroke-width="1.5" />
        <text x="72" y="1062" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8">English Tech</text>
        <text x="728" y="1062" text-anchor="end" font-family="Georgia, serif" font-size="15" font-weight="bold" fill="#475569">Page ${pageNumber} of ${totalPages}</text>
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Builds an array of illustrated SVG book pages from a structured outline array.
 */
export const buildBookPagesFromOutline = (outline = [], { themeId = 'royal-indigo', author = 'English Tech Faculty' } = {}) => {
    const safeOutline = Array.isArray(outline) && outline.length > 0
        ? outline
        : [{ variant: 'cover', title: 'Libro', subtitle: 'Material de lectura' }];

    const totalPages = safeOutline.length;
    return safeOutline.map((pageSpec, idx) =>
        buildIllustratedBookPageSvg({
            ...pageSpec,
            pageNumber: idx + 1,
            totalPages,
            themeId: pageSpec.themeId || themeId,
            author: pageSpec.author || author
        })
    );
};

/**
 * Generates fallback pages if a remote PDF is blocked by CORS and has no pre-rendered pages.
 */
export const buildFallbackBookPages = ({
    title = 'Documento PDF',
    description = '',
    fileName = '',
    author = 'Docente',
    themeId = 'royal-indigo'
} = {}) => {
    const cleanTitle = title || fileName || 'Libro';
    const outline = [
        {
            variant: 'cover',
            chapter: 'LIBRO',
            title: cleanTitle,
            subtitle: description || '',
            author
        },
        {
            variant: 'content',
            chapter: 'CONTENIDO',
            title: cleanTitle,
            subtitle: fileName || 'Documento adjunto',
            body: [
                description || 'Material de lectura del curso.'
            ],
            bullets: [],
            calloutTitle: 'PDF',
            calloutText: fileName
                ? `Archivo: ${fileName}`
                : 'Usa el botón PDF para abrir el archivo original.'
        },
        {
            variant: 'back-cover',
            title: cleanTitle,
            subtitle: ''
        }
    ];

    return buildBookPagesFromOutline(outline, { themeId, author });
};

/**
 * Extracts searchable plain text snippets for each page of a structured book outline.
 */
export const extractBookOutlinePageTexts = (outline = []) => {
    if (!Array.isArray(outline)) return [];
    return outline.map((page) => {
        if (!page || typeof page !== 'object') return '';
        const parts = [
            page.chapter,
            page.title,
            page.subtitle,
            ...(Array.isArray(page.body) ? page.body : []),
            ...(Array.isArray(page.bullets) ? page.bullets : []),
            page.calloutTitle,
            page.calloutText,
            ...(Array.isArray(page.keyTerms)
                ? page.keyTerms.map((kt) => `${kt?.term || ''} ${kt?.definition || ''}`)
                : []),
            ...(Array.isArray(page.stats)
                ? page.stats.map((st) => `${st?.label || ''} ${st?.value || ''}`)
                : [])
        ];
        return parts
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 320);
    });
};

/**
 * Normalizes a single page object inside a book outline.
 */
export const normalizeBookOutlinePage = (rawPage = {}, idx = 0, totalPages = 6, defaultTitle = 'Libro') => {
    const safePage = rawPage && typeof rawPage === 'object' ? rawPage : {};
    let variant = String(safePage.variant || safePage.type || '').toLowerCase().trim();
    if (variant === 'back_cover' || variant === 'backcover') variant = 'back-cover';
    if (!['cover', 'content', 'back-cover'].includes(variant)) {
        if (idx === 0 && totalPages >= 2) variant = 'cover';
        else if (idx === totalPages - 1 && totalPages >= 3) variant = 'back-cover';
        else variant = 'content';
    }

    const resolvedDefaultTitle =
        defaultTitle && typeof defaultTitle === 'object'
            ? defaultTitle.fallbackTitle || defaultTitle.defaultTitle || defaultTitle.title || 'Libro'
            : defaultTitle;
    const cleanDefaultTitle = String(resolvedDefaultTitle || 'Libro').trim();
    const title = String(
        safePage.title ||
            safePage.heading ||
            (variant === 'cover' || variant === 'back-cover' ? cleanDefaultTitle : `Chapter ${idx}`)
    ).trim();

    const subtitle = String(safePage.subtitle || safePage.description || safePage.summary || '').trim();
    const chapter = String(
        safePage.chapter ||
            safePage.badge ||
            safePage.section ||
            (variant === 'cover' ? 'LIBRO' : variant === 'back-cover' ? '' : `CHAPTER ${idx}`)
    ).trim();

    const rawBody = Array.isArray(safePage.body)
        ? safePage.body
        : Array.isArray(safePage.paragraphs)
        ? safePage.paragraphs
        : typeof safePage.body === 'string' && safePage.body.trim()
        ? safePage.body.split(/\n+/).map((s) => s.trim()).filter(Boolean)
        : typeof safePage.content === 'string' && safePage.content.trim()
        ? safePage.content.split(/\n+/).map((s) => s.trim()).filter(Boolean)
        : [];

    const body = rawBody
        .map((p) =>
            typeof p === 'object' && p !== null
                ? String(p.text || p.content || '').trim()
                : String(p || '').trim()
        )
        .filter(Boolean)
        .slice(0, 4);

    const rawBullets = Array.isArray(safePage.bullets)
        ? safePage.bullets
        : Array.isArray(safePage.items)
        ? safePage.items
        : Array.isArray(safePage.examples)
        ? safePage.examples
        : [];

    const bullets = rawBullets
        .map((b) => {
            if (typeof b === 'object' && b !== null) {
                const bTitle = String(b.title || b.term || '').trim();
                const bText = String(b.text || b.description || b.example || '').trim();
                return bTitle && bText ? `${bTitle}: ${bText}` : bTitle || bText;
            }
            return String(b || '').trim();
        })
        .filter(Boolean)
        .slice(0, 5);

    const rawKeyTerms = Array.isArray(safePage.keyTerms)
        ? safePage.keyTerms
        : Array.isArray(safePage.vocabulary)
        ? safePage.vocabulary
        : Array.isArray(safePage.glossary)
        ? safePage.glossary
        : [];

    const keyTerms = rawKeyTerms
        .map((kt) => {
            if (typeof kt === 'object' && kt !== null) {
                const term = String(kt.term || kt.word || kt.title || '').trim();
                const definition = String(kt.definition || kt.meaning || kt.text || '').trim();
                return term ? { term, definition } : null;
            }
            if (typeof kt === 'string' && kt.includes(':')) {
                const [t, ...rest] = kt.split(':');
                return { term: t.trim(), definition: rest.join(':').trim() };
            }
            return null;
        })
        .filter(Boolean)
        .slice(0, 4);

    const rawStats = Array.isArray(safePage.stats) ? safePage.stats : [];
    const stats = rawStats
        .map((st) => {
            if (typeof st === 'object' && st !== null) {
                const label = String(st.label || st.title || st.name || '').trim();
                const value = String(st.value ?? st.stat ?? '').trim();
                return label && value ? { label, value } : null;
            }
            return null;
        })
        .filter(Boolean)
        .slice(0, 3);

    const calloutTitle = String(safePage.calloutTitle || safePage.tipTitle || '').trim();
    const calloutText = String(safePage.calloutText || safePage.callout || safePage.tip || '').trim();

    return {
        variant,
        chapter,
        title,
        subtitle,
        body:
            variant === 'content' && body.length === 0
                ? [subtitle || `Key concepts and practical analysis of ${title}.`]
                : body,
        bullets,
        keyTerms,
        stats,
        calloutTitle,
        calloutText
    };
};

/**
 * Strips HTML tags and decodes common HTML entities so rich-text descriptions
 * never leak raw markup (<p>, &nbsp;, etc.) into SVG book pages or metadata.
 */
export const stripBookHtml = (value = '') =>
    String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Synchronizes the cover and back-cover title/subtitle of an existing book outline
 * when the teacher edits the title or description in the form before saving.
 */
export const syncBookOutlineMetadata = (outline = [], { title = '', description = '', author = '' } = {}) => {
    if (!Array.isArray(outline) || outline.length === 0) return [];
    const cleanTitle = stripBookHtml(title);
    const cleanDesc = stripBookHtml(description);
    const cleanAuthor = stripBookHtml(author);

    return outline.map((page, idx) => {
        if (!page || typeof page !== 'object') return page;
        const isCover = idx === 0 || page.variant === 'cover';
        const isBackCover = idx === outline.length - 1 || page.variant === 'back-cover';
        const nextPage = {
            ...page,
            ...(cleanAuthor ? { author: cleanAuthor } : {})
        };
        if (isCover) {
            if (cleanTitle) nextPage.title = cleanTitle;
            if (cleanDesc) nextPage.subtitle = cleanDesc;
        } else if (isBackCover) {
            if (cleanTitle) nextPage.title = cleanTitle;
        }
        return nextPage;
    });
};

/**
 * Builds the structured prompt to generate a complete educational book outline with Gemini.
 */
export const buildBookAiPrompt = ({
    topic = '',
    title = '',
    instructions = '',
    description = '',
    language = 'Inglés',
    pageCount = 6,
    category = 'textbook',
    author = 'Docente'
} = {}) => {
    const cleanTopic = stripBookHtml(topic || title) || 'English for Economics & Global Markets';
    const cleanNotes = stripBookHtml(instructions || description);
    const totalPages = Math.max(3, Math.min(14, Number(pageCount) || 6));
    const contentPagesCount = Math.max(1, totalPages - 2);
    const langLabel = String(language || 'Inglés').trim();

    return `Actúa como autor académico universitario y diseñador editorial experto.
Escribe el contenido estructurado completo de un libro educativo sobre el tema: "${cleanTopic}".
${cleanNotes ? `\nIndicaciones o contenidos adicionales solicitados por el docente:\n"""\n${cleanNotes}\n"""\n` : ''}
IDIOMA OBLIGATORIO DEL LIBRO: "${langLabel}".
Si el idioma es "Inglés", redacta todo el libro en inglés académico claro. Si es "Bilingüe", combina conceptos y ejemplos en inglés con explicaciones o definiciones clave en español. Si es "Español", redacta todo el libro en español.
Categoría editorial: "${category}". Autor/Docente: "${author}".

El libro debe tener EXACTAMENTE ${totalPages} páginas en un array JSON:
1. Página 1 (índice 0): Portada con:
   { "variant": "cover", "chapter": "ETIQUETA EDITORIAL BREVE", "title": "Título del libro", "subtitle": "Subtítulo descriptivo y claro" }
2. Páginas 2 a ${totalPages - 1} (${contentPagesCount} páginas interiores): Cada una con "variant": "content", desarrollando un capítulo progresivo sobre "${cleanTopic}" con:
   {
     "variant": "content",
     "chapter": "CHAPTER X • SUBTEMA",
     "title": "Título claro del capítulo",
     "subtitle": "Subtítulo pedagógico",
     "body": ["Párrafo 1 con explicación clara y rigurosa (2-3 oraciones).", "Párrafo 2 con aplicación práctica, contexto real o estructuras clave (2-3 oraciones)."],
     "bullets": ["Punto clave o ejemplo aplicado 1", "Punto clave o ejemplo aplicado 2", "Punto clave o ejemplo aplicado 3"],
     "stats": [{"label": "Indicador / Concepto", "value": "Valor / Regla"}],
     "keyTerms": [{"term": "Término 1", "definition": "Definición concisa"}, {"term": "Término 2", "definition": "Definición concisa"}],
     "calloutTitle": "Título breve del recuadro de enfoque",
     "calloutText": "Síntesis práctica, ejemplo modelo o actividad breve."
   }
3. Página ${totalPages} (última página): Contraportada con:
   { "variant": "back-cover", "title": "Título del libro", "subtitle": "Síntesis final del libro" }

Devuelve ÚNICAMENTE un array JSON válido de ${totalPages} objetos sin bloques markdown ni texto adicional.`;
};

const extractBalancedBookJson = (text, openChar, closeChar, validator) => {
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
                // Continue searching
            }
        }
        searchFrom = startIdx + 1;
    }
    return null;
};

const recoverTruncatedBookPages = (text) => {
    const firstBracket = text.indexOf('[');
    if (firstBracket === -1) return null;
    const items = [];
    let i = firstBracket + 1;
    while (i < text.length) {
        const objStart = text.indexOf('{', i);
        if (objStart === -1) break;
        let depth = 0;
        let inStr = false;
        let esc = false;
        let objEnd = -1;
        for (let j = objStart; j < text.length; j++) {
            const ch = text[j];
            if (esc) {
                esc = false;
                continue;
            }
            if (ch === '\\' && inStr) {
                esc = true;
                continue;
            }
            if (ch === '"') {
                inStr = !inStr;
                continue;
            }
            if (!inStr) {
                if (ch === '{') depth++;
                else if (ch === '}') {
                    depth--;
                    if (depth === 0) {
                        objEnd = j;
                        break;
                    }
                }
            }
        }
        if (objEnd === -1) break;
        try {
            const obj = JSON.parse(text.slice(objStart, objEnd + 1));
            if (
                obj &&
                typeof obj === 'object' &&
                !Array.isArray(obj) &&
                (obj.title || obj.variant || obj.body || obj.bullets || obj.chapter)
            ) {
                items.push(obj);
            }
        } catch {
            // Skip malformed object
        }
        i = objEnd + 1;
    }
    return items.length > 0 ? items : null;
};

/**
 * Parses and normalizes an AI response into a valid book outline array (cover + content chapters + back-cover).
 */
export const parseBookAiResponse = (rawText, { fallbackTitle = 'Libro', author = 'Docente' } = {}) => {
    if (!rawText) return null;

    let rawList = null;
    let wrapperTitle = '';
    let wrapperSubtitle = '';

    if (Array.isArray(rawText)) {
        rawList = rawText;
    } else if (typeof rawText === 'object') {
        wrapperTitle = String(rawText.title || '').trim();
        wrapperSubtitle = String(rawText.description || rawText.subtitle || '').trim();
        rawList = Array.isArray(rawText.pages)
            ? rawText.pages
            : Array.isArray(rawText.outline)
            ? rawText.outline
            : Array.isArray(rawText.chapters)
            ? rawText.chapters
            : null;
    } else if (typeof rawText === 'string') {
        const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        if (!clean) return null;

        const wrapperObj = extractBalancedBookJson(
            clean,
            '{',
            '}',
            (candidate) =>
                Boolean(
                    candidate &&
                        typeof candidate === 'object' &&
                        !Array.isArray(candidate) &&
                        (Array.isArray(candidate.pages) ||
                            Array.isArray(candidate.outline) ||
                            Array.isArray(candidate.chapters))
                )
        );
        if (wrapperObj) {
            wrapperTitle = String(wrapperObj.title || '').trim();
            wrapperSubtitle = String(wrapperObj.description || wrapperObj.subtitle || '').trim();
            rawList = wrapperObj.pages || wrapperObj.outline || wrapperObj.chapters;
        }

        if (!rawList) {
            rawList = extractBalancedBookJson(
                clean,
                '[',
                ']',
                (candidate) =>
                    Array.isArray(candidate) &&
                    candidate.length > 0 &&
                    candidate.some((it) => it && typeof it === 'object' && !Array.isArray(it))
            );
        }

        if (!rawList) {
            rawList = recoverTruncatedBookPages(clean);
        }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) return null;

    const validObjects = rawList.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (validObjects.length === 0) return null;

    const inferredTitle = String(
        wrapperTitle ||
            validObjects.find((p) => String(p.variant || '').toLowerCase() === 'cover')?.title ||
            fallbackTitle ||
            validObjects[0]?.title ||
            'Libro'
    ).trim();

    const workingList = [...validObjects];

    const firstVariant = String(workingList[0]?.variant || '').toLowerCase().trim();
    const firstHasContentBody =
        Array.isArray(workingList[0]?.body) && workingList[0].body.length > 0;
    if (firstVariant !== 'cover' && (workingList.length < 3 || firstHasContentBody)) {
        workingList.unshift({
            variant: 'cover',
            chapter: 'LIBRO',
            title: inferredTitle,
            subtitle: wrapperSubtitle,
            author
        });
    }

    const lastItem = workingList[workingList.length - 1];
    const lastVariant = String(lastItem?.variant || '').toLowerCase().trim();
    const lastHasContentBody = Array.isArray(lastItem?.body) && lastItem.body.length > 0;
    if (
        lastVariant !== 'back-cover' &&
        lastVariant !== 'back_cover' &&
        lastVariant !== 'backcover' &&
        (workingList.length < 3 || lastHasContentBody)
    ) {
        workingList.push({
            variant: 'back-cover',
            title: inferredTitle,
            subtitle: wrapperSubtitle
        });
    }

    const total = workingList.length;
    return workingList.map((page, idx) => ({
        ...normalizeBookOutlinePage(page, idx, total, inferredTitle),
        author: page.author || author
    }));
};

/**
 * Generates a structured multi-page book outline when offline, in demo mode, or if the AI API fails.
 */
export const buildFallbackBookOutline = ({
    topic = '',
    title = '',
    instructions = '',
    description = '',
    language = 'Inglés',
    pageCount = 6,
    author = 'Docente',
    category = 'textbook'
} = {}) => {
    const cleanTopic = stripBookHtml(topic || title) || 'English for Economics & Global Markets';
    const cleanNotes = stripBookHtml(instructions || description);
    const totalPages = Math.max(3, Math.min(14, Number(pageCount) || 6));
    const contentPagesCount = Math.max(1, totalPages - 2);
    const langLower = String(language || 'Inglés').toLowerCase();
    const isEs = langLower.includes('espa') && !langLower.includes('biling');
    const isBi = langLower.includes('biling');

    const categoryBadge =
        {
            textbook: isEs ? 'GUÍA DE ESTUDIO' : 'STUDY HANDBOOK',
            'case-study': isEs ? 'CASO DE ESTUDIO' : 'CASE STUDY',
            glossary: isEs ? 'GLOSARIO TÉCNICO' : 'TECHNICAL GLOSSARY',
            magazine: isEs ? 'EDICIÓN ESPECIAL' : 'SPECIAL ISSUE',
            workbook: isEs ? 'CUADERNO PRÁCTICO' : 'PRACTICE WORKBOOK'
        }[category] || (isEs ? 'LIBRO' : 'ACADEMIC EDITION');

    const chapterPool = [
        {
            variant: 'content',
            chapter: isEs ? 'CAPÍTULO 1 • FUNDAMENTOS' : 'CHAPTER 1 • CORE FOUNDATIONS',
            title: isEs
                ? `Conceptos Esenciales: ${cleanTopic}`
                : `Core Principles of ${cleanTopic}`,
            subtitle: isEs
                ? cleanNotes || `Definiciones clave, contexto académico y alcance práctico`
                : cleanNotes || `Essential definitions, academic context, and practical scope`,
            body: isEs
                ? [
                      `El estudio de ${cleanTopic} permite comprender cómo interactúan las estructuras clave y la terminología especializada dentro de escenarios reales y académicos.`,
                      `Dominar estos principios facilita analizar información con precisión, estructurar argumentos sólidos y comunicar hallazgos de manera clara.`
                  ]
                : isBi
                ? [
                      `Understanding ${cleanTopic} is essential for analyzing technical reports, global contexts, and professional communication (comprender este tema es clave para el análisis práctico).`,
                      `Students should identify core patterns, specialized terminology, and real-world applications in every scenario.`
                  ]
                : [
                      `Understanding ${cleanTopic} provides the analytical foundation required to interpret technical texts, professional reports, and real-world scenarios with accuracy.`,
                      `Mastering these core concepts enables clear communication, structured reasoning, and effective decision-making in academic and professional contexts.`
                  ],
            bullets: isEs
                ? [
                      `Definición precisa y contexto de aplicación de ${cleanTopic}.`,
                      `Identificación de patrones principales y vocabulario clave.`,
                      `Ejemplos prácticos aplicados a situaciones reales de clase.`
                  ]
                : [
                      `Core definition and contextual scope of ${cleanTopic}.`,
                      `Recognition of key grammatical and lexical patterns in context.`,
                      `Applied examples for academic writing and professional discussion.`
                  ],
            keyTerms: isEs
                ? [
                      { term: 'Concepto Base', definition: `Principio fundamental que estructura ${cleanTopic}.` },
                      { term: 'Contexto Aplicado', definition: 'Escenario real donde se emplea el concepto.' },
                      { term: 'Estructura Clave', definition: 'Fórmula o patrón recomendado para su uso.' }
                  ]
                : [
                      { term: 'Core Concept', definition: `Fundamental principle underlying ${cleanTopic}.` },
                      { term: 'Applied Context', definition: 'Real-world scenario where the structure operates.' },
                      { term: 'Key Pattern', definition: 'Standard academic phrasing and usage structure.' }
                  ]
        },
        {
            variant: 'content',
            chapter: isEs ? 'CAPÍTULO 2 • ESTRUCTURA Y USO' : 'CHAPTER 2 • STRUCTURES & USAGE',
            title: isEs
                ? `Estructuras y Patrones en ${cleanTopic}`
                : `Key Structures & Patterns in ${cleanTopic}`,
            subtitle: isEs
                ? 'Cómo construir enunciados claros, comparaciones y explicaciones'
                : 'Building accurate statements, comparisons, and analytical explanations',
            body: isEs
                ? [
                      `Al desarrollar ideas sobre ${cleanTopic}, es fundamental emplear conectores lógicos y vocabulario preciso que expresen causa, efecto y contraste.`,
                      `Observa cómo cambian los matices de significado según el registro formal o práctico que requiera la situación comunicativa.`
                  ]
                : [
                      `When communicating ideas related to ${cleanTopic}, combining accurate terminology with logical connectors ensures clarity and coherence.`,
                      `Pay close attention to register, collocations, and sentence structure when contrasting data or presenting arguments.`
                  ],
            bullets: isEs
                ? [
                      'Conectores de causa y efecto: por lo tanto, en consecuencia, debido a.',
                      'Contraste de ideas: sin embargo, mientras que, por el contrario.',
                      'Presentación de evidencia: de acuerdo con los datos, como se observa en.'
                  ]
                : [
                      'Cause & Effect: Therefore, consequently, as a result of, due to.',
                      'Contrast & Comparison: Whereas, however, on the other hand, in contrast.',
                      'Evidence & Analysis: According to the data, this illustrates that.'
                  ],
            calloutTitle: isEs ? 'ENFOQUE PRÁCTICO' : 'PRACTICAL FOCUS',
            calloutText: isEs
                ? `Combina siempre el concepto técnico de ${cleanTopic} con un ejemplo concreto para reforzar la comprensión.`
                : `Always pair technical terms from ${cleanTopic} with a concrete contextual example to strengthen comprehension.`
        },
        {
            variant: 'content',
            chapter: isEs ? 'CAPÍTULO 3 • ANÁLISIS Y DATOS' : 'CHAPTER 3 • CASE ANALYSIS & DATA',
            title: isEs
                ? `Aplicación Práctica y Estudio de Casos`
                : `Applied Case Study & Practical Scenarios`,
            subtitle: isEs
                ? `Interpretación de indicadores y escenarios sobre ${cleanTopic}`
                : `Interpreting real-world indicators and scenarios in ${cleanTopic}`,
            body: isEs
                ? [
                      `En el análisis de casos reales vinculados a ${cleanTopic}, se evalúan tanto las variables cuantitativas como los factores cualitativos del entorno.`,
                      `Revisa los indicadores clave y discute cómo cada decisión impacta los resultados a corto y mediano plazo.`
                  ]
                : [
                      `In real-world case studies involving ${cleanTopic}, analysts evaluate both quantitative indicators and qualitative contextual drivers.`,
                      `Review the key benchmarks below and consider how strategic decisions influence short-term and long-term outcomes.`
                  ],
            stats: isEs
                ? [
                      { label: 'COMPRENSIÓN', value: '100% Clave' },
                      { label: 'ENFOQUE', value: 'Práctico' },
                      { label: 'NIVEL', value: 'Académico' }
                  ]
                : [
                      { label: 'CORE FOCUS', value: 'Applied' },
                      { label: 'ACCURACY', value: 'High Impact' },
                      { label: 'LEVEL', value: 'Academic' }
                  ],
            bullets: isEs
                ? [
                      'Identificar el problema central y las variables principales del caso.',
                      'Comparar alternativas de solución con argumentos estructurados.',
                      'Redactar una conclusión clara basada en la evidencia analizada.'
                  ]
                : [
                      'Identify the central question and primary variables of the case.',
                      'Compare alternative solutions using structured academic arguments.',
                      'Formulate a concise conclusion supported by clear evidence.'
                  ]
        },
        {
            variant: 'content',
            chapter: isEs ? 'CAPÍTULO 4 • SÍNTESIS Y PRÁCTICA' : 'CHAPTER 4 • REVIEW & APPLICATION',
            title: isEs
                ? `Guía de Repaso y Ejercicios sobre ${cleanTopic}`
                : `Synthesis, Key Takeaways & Class Practice`,
            subtitle: isEs
                ? 'Resumen ejecutivo y pautas de autoevaluación'
                : 'Executive summary and self-assessment guidelines',
            body: isEs
                ? [
                      `Para consolidar el dominio de ${cleanTopic}, sintetiza las ideas principales de cada sección y ponlas en práctica mediante ejemplos propios.`,
                      `Utiliza las preguntas guía y el vocabulario estudiado para participar activamente en las actividades de la clase.`
                  ]
                : [
                      `To consolidate your mastery of ${cleanTopic}, review the main takeaways from each chapter and practice writing your own original examples.`,
                      `Use the key terminology and analytical structures from this book when participating in class discussions and assignments.`
                  ],
            bullets: isEs
                ? [
                      `Resume con tus propias palabras los 3 pilares de ${cleanTopic}.`,
                      'Escribe ejemplos aplicados utilizando el vocabulario técnico del libro.',
                      'Comparte tus conclusiones y dudas en las actividades del curso.'
                  ]
                : [
                      `Summarize the 3 main pillars of ${cleanTopic} in your own words.`,
                      'Write original sentences applying the key vocabulary from this guide.',
                      'Share your analysis and examples during the class session.'
                  ],
            calloutTitle: isEs ? 'ACTIVIDAD SUGERIDA' : 'CLASS ACTIVITY',
            calloutText: isEs
                ? `Elabora un breve ejemplo práctico sobre ${cleanTopic} aplicando al menos tres términos clave de esta lectura.`
                : `Draft a short practical example about ${cleanTopic} incorporating at least three key terms from this book.`
        }
    ];

    const selectedContentPages = [];
    for (let i = 0; i < contentPagesCount; i++) {
        const template = chapterPool[i % chapterPool.length];
        if (i < chapterPool.length) {
            selectedContentPages.push({ ...template });
        } else {
            const chapNum = i + 1;
            selectedContentPages.push({
                ...template,
                chapter: isEs ? `CAPÍTULO ${chapNum} • PROFUNDIZACIÓN` : `CHAPTER ${chapNum} • ADVANCED FOCUS`,
                title: isEs
                    ? `${cleanTopic} — Sección ${chapNum}`
                    : `${cleanTopic} — Advanced Section ${chapNum}`
            });
        }
    }

    const outline = [
        {
            variant: 'cover',
            chapter: categoryBadge,
            title: cleanTopic,
            subtitle:
                cleanNotes ||
                (isEs
                    ? `Guía estructurada de estudio, conceptos clave y ejemplos aplicados`
                    : `Structured academic guide, key concepts, and practical examples`),
            author
        },
        ...selectedContentPages,
        {
            variant: 'back-cover',
            title: cleanTopic,
            subtitle: isEs
                ? 'Repasa los conceptos clave y aplica lo aprendido en las actividades de clase.'
                : 'Review the key concepts and apply what you learned in the class activities.'
        }
    ];

    return outline.map((page, idx) => ({
        ...normalizeBookOutlinePage(page, idx, outline.length, cleanTopic),
        author: page.author || author
    }));
};

/**
 * Generates a complete set of illustrated SVG book pages using Gemini AI with automatic structured fallback.
 */
export const generateAiBookPages = async ({
    topic = '',
    title = '',
    instructions = '',
    description = '',
    language = 'Inglés',
    pageCount = 6,
    themeId = 'royal-indigo',
    author = 'Docente',
    category = 'textbook',
    callGemini = null
} = {}) => {
    const cleanTopic = stripBookHtml(topic || title) || 'English for Economics';
    const cleanNotes = stripBookHtml(instructions || description);
    const totalPages = Math.max(3, Math.min(14, Number(pageCount) || 6));

    let outline = null;
    let usedFallback = false;
    if (typeof callGemini === 'function') {
        try {
            const prompt = buildBookAiPrompt({
                topic: cleanTopic,
                title: cleanTopic,
                instructions: cleanNotes,
                description: cleanNotes,
                language,
                pageCount: totalPages,
                category,
                author
            });
            const rawResponse = await callGemini(prompt, 90000);
            outline = parseBookAiResponse(rawResponse, {
                fallbackTitle: cleanTopic,
                author
            });
        } catch (err) {
            console.warn('Error generando libro con IA, usando esquema estructurado:', err);
        }
    }

    if (!Array.isArray(outline) || outline.length === 0) {
        usedFallback = true;
        outline = buildFallbackBookOutline({
            topic: cleanTopic,
            title: cleanTopic,
            instructions: cleanNotes,
            description: cleanNotes,
            language,
            pageCount: totalPages,
            author,
            category
        });
    }

    const pages = buildBookPagesFromOutline(outline, { themeId, author });
    const pageTexts = extractBookOutlinePageTexts(outline);

    return {
        outline,
        pages,
        pageTexts,
        pageCount: pages.length,
        coverUrl: pages[0] || '',
        title: outline[0]?.title || cleanTopic,
        usedFallback
    };
};

/**
 * Dynamically loads pdfjs-dist and configures its worker.
 */
let cachedPdfJsPromise = null;
const getPdfJs = async () => {
    if (!cachedPdfJsPromise) {
        cachedPdfJsPromise = import('pdfjs-dist').then((mod) => {
            const pdfjsLib = mod.default || mod;
            if (typeof window !== 'undefined' && 'Worker' in window && pdfjsLib.GlobalWorkerOptions) {
                const currentWorker = String(pdfjsLib.GlobalWorkerOptions.workerSrc || '');
                if (!currentWorker || currentWorker.includes('cdnjs.cloudflare.com')) {
                    const ver = pdfjsLib.version || '6.2.108';
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
                }
            }
            return pdfjsLib;
        });
    }
    return cachedPdfJsPromise;
};

/**
 * Renders a PDF (File, Blob, ArrayBuffer, or URL) into an array of compressed JPEG page data URLs.
 */
export const renderPdfToBookPages = async (
    source,
    {
        maxPages = 60,
        scale = 1.6,
        maxDimension = 1350,
        quality = 0.82,
        onProgress
    } = {}
) => {
    if (typeof document === 'undefined') {
        throw new Error('renderPdfToBookPages requires a browser DOM environment.');
    }

    const pdfjsLib = await getPdfJs();
    let docParams = null;
    let rawBytes = null;

    if (typeof source === 'string') {
        docParams = { url: source, withCredentials: false };
    } else if (source instanceof ArrayBuffer) {
        rawBytes = new Uint8Array(source.slice(0));
    } else if (ArrayBuffer.isView(source)) {
        rawBytes = new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
    } else if (source && typeof source.arrayBuffer === 'function') {
        const buffer = await source.arrayBuffer();
        rawBytes = new Uint8Array(buffer);
    } else if (source && source.url) {
        docParams = { url: source.url, withCredentials: false };
    } else {
        throw new Error('Fuente PDF no válida para generar el libro.');
    }

    const buildAttemptParams = (extra = {}) => {
        if (rawBytes) {
            return { data: rawBytes.slice(), useSystemFonts: true, isEvalSupported: false, ...extra };
        }
        return { ...docParams, useSystemFonts: true, isEvalSupported: false, ...extra };
    };

    let pdf = null;
    try {
        const loadingTask = pdfjsLib.getDocument(buildAttemptParams());
        pdf = await loadingTask.promise;
    } catch (firstErr) {
        // Fallback CDN worker if initial worker URL failed
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;
        }
        const retryTask = pdfjsLib.getDocument(buildAttemptParams({ disableAutoFetch: true }));
        pdf = await retryTask.promise || (() => { throw firstErr; })();
    }

    const originalPageCount = pdf.numPages || 1;
    const totalPages = Math.min(originalPageCount, Math.max(1, maxPages));
    const pages = [];
    const pageTexts = [];
    let aspectRatio = DEFAULT_BOOK_ASPECT_RATIO;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        if (pageNum === 1 && baseViewport.width > 0 && baseViewport.height > 0) {
            aspectRatio = Number((baseViewport.width / baseViewport.height).toFixed(3));
        }

        const longestSide = Math.max(baseViewport.width * scale, baseViewport.height * scale);
        const effectiveScale = longestSide > maxDimension
            ? (maxDimension / Math.max(baseViewport.width, baseViewport.height))
            : scale;

        const viewport = page.getViewport({ scale: effectiveScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));

        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
            canvasContext: ctx,
            viewport
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        pages.push(dataUrl);

        try {
            const textContent = await page.getTextContent();
            const snippet = (textContent?.items || [])
                .map((it) => it.str || '')
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 320);
            pageTexts.push(snippet);
        } catch {
            pageTexts.push('');
        }

        if (typeof onProgress === 'function') {
            onProgress({
                phase: 'render',
                currentPage: pageNum,
                totalPages,
                percent: Math.round((pageNum / totalPages) * 100)
            });
        }
    }

    return {
        pages,
        pageTexts,
        pageCount: pages.length,
        originalPageCount,
        aspectRatio,
        coverUrl: pages[0] || ''
    };
};

/**
 * Uploads rendered dataUrl pages to Firebase Storage (when in live mode)
 * so students load fast CDN images without CORS issues or Firestore size limits.
 */
export const uploadBookPagesToStorage = async (
    pages = [],
    uploadImageFn,
    { isDemoMode = false, folder = 'books', onProgress } = {}
) => {
    if (!Array.isArray(pages) || pages.length === 0) return [];
    if (isDemoMode || typeof uploadImageFn !== 'function') {
        return [...pages];
    }

    const uploaded = [];
    const total = pages.length;

    for (let i = 0; i < total; i++) {
        const pageUrl = pages[i];
        if (typeof pageUrl === 'string' && pageUrl.startsWith('data:image/') && !pageUrl.startsWith('data:image/svg+xml')) {
            try {
                const remoteUrl = await uploadImageFn(pageUrl, folder);
                uploaded.push(remoteUrl || pageUrl);
            } catch {
                uploaded.push(pageUrl);
            }
        } else {
            uploaded.push(pageUrl);
        }

        if (typeof onProgress === 'function') {
            onProgress({
                phase: 'upload',
                currentPage: i + 1,
                totalPages: total,
                percent: Math.round(((i + 1) / total) * 100)
            });
        }
    }

    return uploaded;
};

/**
 * Compacts inline data URLs if needed so the Firestore document never exceeds 1MB.
 */
export const compactBookPagesForFirestore = (
    pages = [],
    {
        maxTotalChars = MAX_TOTAL_FIRESTORE_BOOK_CHARS,
        fallbackTitle = 'Libro',
        themeId = 'royal-indigo'
    } = {}
) => {
    if (!Array.isArray(pages) || pages.length === 0) return [];

    let totalChars = 0;
    const result = [];

    for (let i = 0; i < pages.length; i++) {
        const raw = typeof pages[i] === 'string' ? pages[i].trim() : '';
        if (!raw) continue;

        // Remote https:// URLs are tiny (~120 chars) and always fit
        if (!raw.startsWith('data:')) {
            totalChars += raw.length;
            result.push(raw);
            continue;
        }

        if (totalChars + raw.length <= maxTotalChars) {
            totalChars += raw.length;
            result.push(raw);
        } else {
            // Replace overflow inline base64 page with a lightweight SVG page (~2KB)
            const compactSvg = buildIllustratedBookPageSvg({
                variant: 'content',
                chapter: 'CONTENIDO',
                title: `${fallbackTitle} — Página ${i + 1}`,
                subtitle: '',
                body: [
                    'Usa el botón PDF para abrir el documento completo.'
                ],
                pageNumber: i + 1,
                totalPages: pages.length,
                themeId
            });
            if (totalChars + compactSvg.length <= maxTotalChars + 40000) {
                totalChars += compactSvg.length;
                result.push(compactSvg);
            }
        }
    }

    return result;
};

/**
 * Normalizes and sanitizes a Book record before saving to Firestore or rendering.
 */
export const sanitizeBookForFirestore = (book = {}) => {
    const rawPages = Array.isArray(book.bookPages) && book.bookPages.length > 0
        ? book.bookPages
        : Array.isArray(book.pages) && book.pages.length > 0
            ? book.pages
            : [];

    const title = stripBookHtml(book.title || book.fileName) || 'Libro';
    const cleanDescription = stripBookHtml(book.description || '');
    const rawTheme = book.theme || book.bookTheme;
    const theme = BOOK_THEMES[rawTheme] ? rawTheme : 'royal-indigo';
    const rawCat = book.category || book.bookCategory;
    const validCat = BOOK_CATEGORIES.some((c) => c.id === rawCat) ? rawCat : 'textbook';
    const bookOutline = Array.isArray(book.bookOutline)
        ? book.bookOutline.map((p, idx, arr) => ({
              ...normalizeBookOutlinePage(p, idx, arr.length, title),
              author: p?.author || book.authorName || book.author || 'Docente'
          }))
        : [];

    const compactedPages = compactBookPagesForFirestore(rawPages, {
        maxTotalChars: MAX_TOTAL_FIRESTORE_BOOK_CHARS,
        fallbackTitle: title,
        themeId: theme
    });

    const finalPages = compactedPages.length > 0
        ? compactedPages
        : bookOutline.length > 0
            ? buildBookPagesFromOutline(bookOutline, {
                themeId: theme,
                author: book.authorName || book.author || 'Docente'
            })
            : buildFallbackBookPages({
                title,
                description: cleanDescription,
                fileName: book.fileName || '',
                author: book.authorName || 'Docente',
                themeId: theme
            });

    const pageTexts = Array.isArray(book.pageTexts) && book.pageTexts.length > 0
        ? book.pageTexts.slice(0, finalPages.length).map((t) => String(t || '').slice(0, 320))
        : bookOutline.length > 0
            ? extractBookOutlinePageTexts(bookOutline).slice(0, finalPages.length)
            : [];

    return {
        ...book,
        title,
        description: cleanDescription,
        category: validCat,
        theme,
        bookPages: finalPages,
        pageTexts,
        bookOutline,
        coverUrl: finalPages[0] || book.coverUrl || '',
        pageCount: Number(book.pageCount) || finalPages.length,
        pdfUrl: book.pdfUrl || book.fileUrl || '',
        fileUrl: book.fileUrl || book.pdfUrl || '',
        fileName: book.fileName || '',
        aspectRatio: Number(book.aspectRatio) > 0 ? Number(book.aspectRatio) : DEFAULT_BOOK_ASPECT_RATIO,
        targetGroupId: book.targetGroupId || 'all'
    };
};

/**
 * Normalizes any book or task-like object into a consistent Book structure for the viewer.
 */
export const normalizeBookRecord = (item = {}) => {
    if (!item || typeof item !== 'object') {
        const fallback = buildFallbackBookPages({ title: 'Libro' });
        return {
            id: 'book_default',
            title: 'Libro',
            description: '',
            category: 'textbook',
            theme: 'royal-indigo',
            bookPages: fallback,
            pageTexts: [],
            bookOutline: [],
            coverUrl: fallback[0],
            pageCount: fallback.length,
            pdfUrl: '',
            fileUrl: '',
            fileName: '',
            aspectRatio: DEFAULT_BOOK_ASPECT_RATIO
        };
    }

    const pages = Array.isArray(item.bookPages) && item.bookPages.length > 0
        ? item.bookPages
        : Array.isArray(item.pages) && item.pages.length > 0
            ? item.pages
            : [];

    const pdfUrl = item.pdfUrl || item.fileUrl || item.documentUrl || '';
    const title = stripBookHtml(item.title || item.documentTitle || item.fileName) || 'Libro';
    const rawTheme = item.theme || item.bookTheme;
    const theme = BOOK_THEMES[rawTheme] ? rawTheme : 'royal-indigo';
    const rawCat = item.category || item.bookCategory;
    const validCat = BOOK_CATEGORIES.some((c) => c.id === rawCat) ? rawCat : 'textbook';
    const bookOutline = Array.isArray(item.bookOutline) ? item.bookOutline : [];

    return {
        ...item,
        id: item.id || item.bookId || 'book_preview',
        title,
        description: stripBookHtml(item.description || ''),
        category: validCat,
        theme,
        bookPages: pages,
        pageTexts: Array.isArray(item.pageTexts) ? item.pageTexts : [],
        bookOutline,
        coverUrl: pages[0] || item.coverUrl || '',
        pageCount: pages.length || Number(item.pageCount) || 0,
        pdfUrl,
        fileUrl: item.fileUrl || pdfUrl,
        fileName: item.fileName || '',
        aspectRatio: Number(item.aspectRatio) > 0 ? Number(item.aspectRatio) : DEFAULT_BOOK_ASPECT_RATIO
    };
};

/**
 * Computes the physical spreads of a book for either Double-Page Desktop view or Single-Page Mobile view.
 * In Double-Page mode:
 * - Spread 0: Front cover closed on the right side (leftPage: null, rightPage: 0)
 * - Spread 1: Left page = 1, Right page = 2 (or null if 2-page leaflet)
 * - Spread k: Left page = 2k - 1, Right page = 2k
 */
export const buildBookSpreads = (pages = [], isDoublePage = true) => {
    const count = Array.isArray(pages) ? pages.length : Math.max(0, Number(pages) || 0);
    if (count <= 0) return [];

    if (!isDoublePage) {
        return Array.from({ length: count }, (_, idx) => ({
            index: idx,
            leftPage: null,
            rightPage: idx,
            pages: [idx],
            isCover: idx === 0,
            isBackCover: idx === count - 1
        }));
    }

    const spreads = [
        {
            index: 0,
            leftPage: null,
            rightPage: 0,
            pages: [0],
            isCover: true,
            isBackCover: count === 1
        }
    ];

    let pageIdx = 1;
    let spreadIdx = 1;
    while (pageIdx < count) {
        const leftPage = pageIdx;
        const rightPage = pageIdx + 1 < count ? pageIdx + 1 : null;
        spreads.push({
            index: spreadIdx,
            leftPage,
            rightPage,
            pages: rightPage !== null ? [leftPage, rightPage] : [leftPage],
            isCover: false,
            isBackCover: rightPage === null || rightPage === count - 1
        });
        pageIdx += 2;
        spreadIdx += 1;
    }

    return spreads;
};

/**
 * Returns the spread index containing a given 0-based page index.
 */
export const getSpreadIndexForPage = (pageIndex = 0, isDoublePage = true, totalPages = 1) => {
    const safeTotal = Math.max(1, Number(totalPages) || 1);
    const clampedPage = Math.min(Math.max(0, Math.floor(Number(pageIndex) || 0)), safeTotal - 1);
    if (!isDoublePage) return clampedPage;
    if (clampedPage === 0) return 0;
    return Math.ceil(clampedPage / 2);
};

/**
 * Formats a human-readable page label for the current spread (1-based).
 */
export const formatSpreadPageLabel = (spread, totalPages = 1) => {
    if (!spread) return `1 / ${totalPages}`;
    if (spread.leftPage !== null && spread.rightPage !== null) {
        return `${spread.leftPage + 1}–${spread.rightPage + 1} / ${totalPages}`;
    }
    const single = spread.rightPage !== null ? spread.rightPage + 1 : (spread.leftPage ?? 0) + 1;
    return `${single} / ${totalPages}`;
};

/**
 * Calculates 3D page-curl / turn angle and shadow intensities during pointer drag.
 */
export const calculateDragCurlState = ({
    startX = 0,
    startY = 0,
    currentX = 0,
    currentY = 0,
    containerWidth = 800,
    containerHeight = 600,
    direction = 'next'
} = {}) => {
    const safeWidth = Math.max(180, Number(containerWidth) || 800);
    const safeHeight = Math.max(180, Number(containerHeight) || 600);
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Flipping to 'next' drags from right to left (negative deltaX)
    // Flipping to 'prev' drags from left to right (positive deltaX)
    const rawDistance = direction === 'next' ? -deltaX : deltaX;
    const effectiveSpan = safeWidth * 0.65;
    const progress = Math.min(1, Math.max(0, rawDistance / effectiveSpan));

    const angleDeg = direction === 'next'
        ? -Math.round(progress * 180)
        : Math.round(progress * 180);

    // Peak shadow when the leaf is perpendicular (90 deg, progress = 0.5)
    const foldIntensity = Math.sin(progress * Math.PI);
    const shadowOpacity = Number((0.12 + foldIntensity * 0.48).toFixed(3));
    const highlightOpacity = Number((foldIntensity * 0.28).toFixed(3));
    const cornerTiltDeg = Number(Math.max(-14, Math.min(14, (deltaY / safeHeight) * 24)).toFixed(2));

    return {
        direction,
        progress: Number(progress.toFixed(4)),
        angleDeg,
        foldIntensity: Number(foldIntensity.toFixed(4)),
        shadowOpacity,
        highlightOpacity,
        cornerTiltDeg,
        shouldComplete: progress >= 0.28
    };
};

/**
 * Clamps the book zoom factor between [min, max].
 */
export const clampBookZoom = (zoom = 1, min = 0.75, max = 2.5) => {
    const num = Number(zoom);
    if (!Number.isFinite(num)) return 1;
    return Number(Math.min(max, Math.max(min, num)).toFixed(2));
};

/**
 * Filters a list of 3D books by search query and category.
 */
export const filterBooksCatalog = (books = [], { query = '', category = 'all' } = {}) => {
    if (!Array.isArray(books)) return [];
    const cleanQuery = String(query || '').trim().toLowerCase();

    return books.filter((book) => {
        if (!book) return false;
        if (category && category !== 'all' && book.category !== category) {
            return false;
        }
        if (!cleanQuery) return true;
        const haystack = [
            book.title,
            book.description,
            book.fileName,
            book.authorName,
            book.category,
            ...(Array.isArray(book.pageTexts) ? book.pageTexts : [])
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(cleanQuery);
    });
};

/**
 * Synthesizes a realistic, soft paper page-flip sound using Web Audio API.
 * Requires no external audio assets and fails silently if audio is restricted.
 */
let sharedAudioCtx = null;
export const playPageFlipSound = ({ muted = false, direction = 'next' } = {}) => {
    if (muted || typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    try {
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            sharedAudioCtx = new AudioCtx();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }

        const ctx = sharedAudioCtx;
        const duration = 0.21;
        const sampleRate = ctx.sampleRate || 44100;
        const frameCount = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        // Generate pink-ish paper friction noise with an organic envelope
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            const white = Math.random() * 2 - 1;
            b0 = 0.997 * b0 + white * 0.029;
            b1 = 0.985 * b1 + white * 0.032;
            b2 = 0.950 * b2 + white * 0.048;
            const pink = b0 + b1 + b2 + white * 0.18;
            const env = Math.sin(Math.PI * Math.pow(t, 0.78));
            data[i] = pink * env * 0.32;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        const startFreq = direction === 'next' ? 1180 : 920;
        const endFreq = direction === 'next' ? 460 : 680;
        bandpass.frequency.setValueAtTime(startFreq, ctx.currentTime);
        bandpass.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
        bandpass.Q.setValueAtTime(1.35, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.035);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noiseSource.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(ctx.destination);

        noiseSource.start(ctx.currentTime);
        noiseSource.stop(ctx.currentTime + duration);
        return true;
    } catch {
        return false;
    }
};

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
        name: 'Royal Indigo',
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
        name: 'Emerald Ledger',
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
        name: 'Oxford Crimson',
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
        name: 'Executive Gold',
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
        name: 'Modern Slate',
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
    { id: 'textbook', label: 'Libro / Guía Académica' },
    { id: 'case-study', label: 'Caso de Estudio Económico' },
    { id: 'glossary', label: 'Glosario / Manual Técnico' },
    { id: 'magazine', label: 'Revista / Reporte Financiero' },
    { id: 'workbook', label: 'Cuaderno de Ejercicios' }
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
            <text x="220" y="156" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" letter-spacing="2" fill="#ffffff">${escapeSvgText((chapter || 'INTERACTIVE 3D BOOK').toUpperCase().slice(0, 26))}</text>
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
                <text x="45" y="205" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">Interactive 3D Edition • Flip pages with mouse, touch or keyboard</text>
            </g>
            <text x="90" y="995" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="${theme.accentColor}" letter-spacing="1.2">AUTHOR / FACULTY</text>
            <text x="90" y="1024" font-family="Georgia, serif" font-size="22" fill="#ffffff">${escapeSvgText(author)}</text>
            <text x="710" y="1024" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#cbd5e1">${totalPages} Pages</text>
        </svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    if (variant === 'back-cover') {
        const summaryLines = wrapTextLines(
            subtitle || 'Thank you for reading this interactive 3D academic edition. Review key concepts and complete the module activities on the class wall.',
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
            <text x="400" y="928" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">English Tech • Interactive 3D Library</text>
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
        <text x="72" y="1062" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8">English Tech • Interactive 3D Edition</text>
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
        : [{ variant: 'cover', title: 'Interactive 3D Book', subtitle: 'Academic Material' }];

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
 * Generates fallback 3D pages if a remote PDF is blocked by CORS and has no pre-rendered pages.
 */
export const buildFallbackBookPages = ({
    title = 'Documento PDF',
    description = '',
    fileName = '',
    author = 'Docente',
    themeId = 'royal-indigo'
} = {}) => {
    const cleanTitle = title || fileName || 'Libro 3D Interactivo';
    const outline = [
        {
            variant: 'cover',
            chapter: 'EDICIÓN DIGITAL 3D',
            title: cleanTitle,
            subtitle: description || 'Material de lectura interactivo con simulación física de hojas en 3D.',
            author
        },
        {
            variant: 'content',
            chapter: 'GUÍA DE LECTURA',
            title: cleanTitle,
            subtitle: 'Resumen y acceso directo al documento original',
            body: [
                description || 'Este documento ha sido publicado en la Biblioteca 3D del curso para su consulta interactiva.',
                'Puedes pasar las páginas arrastrando las esquinas con el mouse o tu dedo en dispositivos móviles, o utilizando las flechas del teclado.'
            ],
            bullets: [
                'Usa los controles superiores para acercar o alejar el zoom de lectura.',
                'Activa o silencia el sonido de hojas de papel en la barra superior.',
                'Si deseas guardar el archivo original completo, usa el botón Descargar PDF.'
            ],
            calloutTitle: 'ARCHIVO ADJUNTO',
            calloutText: fileName
                ? `Archivo fuente: ${fileName}. Usa el botón superior "Descargar / Abrir PDF" para ver el archivo original.`
                : 'Usa el botón superior "Descargar / Abrir PDF" para abrir el documento original en alta resolución.'
        },
        {
            variant: 'back-cover',
            title: cleanTitle,
            subtitle: 'Fin de la vista previa interactiva. Descarga el PDF completo desde la barra de herramientas superior.'
        }
    ];

    return buildBookPagesFromOutline(outline, { themeId, author });
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
        throw new Error('Fuente PDF no válida para generar el Libro 3D.');
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
        fallbackTitle = 'Interactive 3D Book',
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
                chapter: 'CONTENIDO DEL DOCUMENTO',
                title: `${fallbackTitle} — Página ${i + 1}`,
                subtitle: 'Vista optimizada para sincronización en la nube',
                body: [
                    'Esta página forma parte del documento PDF completo adjunto a este Libro 3D.',
                    'Puedes abrir o descargar el archivo PDF original desde el botón superior para consultar todas las páginas adicionales en máxima resolución.'
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
 * Normalizes and sanitizes a 3D Book record before saving to Firestore or rendering.
 */
export const sanitizeBookForFirestore = (book = {}) => {
    const rawPages = Array.isArray(book.bookPages) && book.bookPages.length > 0
        ? book.bookPages
        : Array.isArray(book.pages) && book.pages.length > 0
            ? book.pages
            : [];

    const title = String(book.title || book.fileName || 'Libro 3D Interactivo').trim();
    const rawTheme = book.theme || book.bookTheme;
    const theme = BOOK_THEMES[rawTheme] ? rawTheme : 'royal-indigo';
    const rawCat = book.category || book.bookCategory;
    const validCat = BOOK_CATEGORIES.some((c) => c.id === rawCat) ? rawCat : 'textbook';

    const compactedPages = compactBookPagesForFirestore(rawPages, {
        maxTotalChars: MAX_TOTAL_FIRESTORE_BOOK_CHARS,
        fallbackTitle: title,
        themeId: theme
    });

    const finalPages = compactedPages.length > 0
        ? compactedPages
        : buildFallbackBookPages({
            title,
            description: book.description || '',
            fileName: book.fileName || '',
            author: book.authorName || 'Docente',
            themeId: theme
        });

    const pageTexts = Array.isArray(book.pageTexts)
        ? book.pageTexts.slice(0, finalPages.length).map((t) => String(t || '').slice(0, 320))
        : [];

    return {
        ...book,
        title,
        description: String(book.description || '').trim(),
        category: validCat,
        theme,
        bookPages: finalPages,
        pageTexts,
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
 * Normalizes any book or task-like object into a consistent 3D Book structure for the viewer.
 */
export const normalizeBookRecord = (item = {}) => {
    if (!item || typeof item !== 'object') {
        const fallback = buildFallbackBookPages({ title: 'Libro 3D' });
        return {
            id: 'book_default',
            title: 'Libro 3D',
            description: '',
            category: 'textbook',
            theme: 'royal-indigo',
            bookPages: fallback,
            pageTexts: [],
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
    const title = String(item.title || item.documentTitle || item.fileName || 'Libro 3D Interactivo').trim();
    const rawTheme = item.theme || item.bookTheme;
    const theme = BOOK_THEMES[rawTheme] ? rawTheme : 'royal-indigo';
    const rawCat = item.category || item.bookCategory;
    const validCat = BOOK_CATEGORIES.some((c) => c.id === rawCat) ? rawCat : 'textbook';

    return {
        ...item,
        id: item.id || item.bookId || 'book_preview',
        title,
        description: String(item.description || '').trim(),
        category: validCat,
        theme,
        bookPages: pages,
        pageTexts: Array.isArray(item.pageTexts) ? item.pageTexts : [],
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

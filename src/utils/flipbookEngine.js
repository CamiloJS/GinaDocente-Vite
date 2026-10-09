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
    imageUrl = '',
    imageCaption = '',
    customCoverUrl = '',
    author = 'English Tech Faculty',
    pageNumber = 1,
    totalPages = 1,
    themeId = 'royal-indigo'
} = {}) => {
    const theme = getBookTheme(themeId);
    const cleanImageUrl = String(imageUrl || customCoverUrl || '').trim();
    const cleanImageCaption = String(imageCaption || '').trim();

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

        const coverVisualSvg = cleanImageUrl
            ? `<g transform="translate(90, 650)">
                <defs>
                    <clipPath id="covImgClip">
                        <rect width="620" height="255" rx="20" />
                    </clipPath>
                </defs>
                <rect width="620" height="255" rx="20" fill="#000000" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.22" />
                <image href="${escapeSvgText(cleanImageUrl)}" x="0" y="0" width="620" height="255" preserveAspectRatio="xMidYMid slice" clip-path="url(#covImgClip)" />
                <rect width="620" height="255" rx="20" fill="none" stroke="${theme.accentColor}" stroke-opacity="0.55" stroke-width="2" />
            </g>`
            : `<g transform="translate(90, 665)">
                <rect width="620" height="230" rx="20" fill="#000000" fill-opacity="0.24" stroke="#ffffff" stroke-opacity="0.14" />
                <polyline points="45,175 145,130 240,150 350,85 455,105 565,45" fill="none" stroke="${theme.accentColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="145" cy="130" r="6" fill="#ffffff" />
                <circle cx="240" cy="150" r="6" fill="#ffffff" />
                <circle cx="350" cy="85" r="6" fill="#ffffff" />
                <circle cx="455" cy="105" r="6" fill="#ffffff" />
                <circle cx="565" cy="45" r="8" fill="${theme.accentColor}" stroke="#ffffff" stroke-width="2" />
                <text x="45" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="${theme.accentColor}" letter-spacing="1.5">TECHNICAL ENGLISH &amp; GLOBAL MARKETS</text>
                <text x="45" y="205" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">English Tech</text>
            </g>`;

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
            ${coverVisualSvg}
            <text x="90" y="995" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="${theme.accentColor}" letter-spacing="1.2">AUTHOR / FACULTY</text>
            <text x="90" y="1024" font-family="Georgia, serif" font-size="22" fill="#ffffff">${escapeSvgText(author)}</text>
            <text x="710" y="1024" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#cbd5e1">${totalPages} Pages</text>
        </svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    if (variant === 'back-cover') {
        const backBodyText = (Array.isArray(body) ? body : [String(body || '')])
            .map((p) => String(p || '').trim())
            .filter(Boolean)
            .join(' ');
        const primarySummary =
            subtitle ||
            (!backBodyText
                ? 'Review key concepts and complete the module activities on the class wall.'
                : '');
        const summaryLines = primarySummary ? wrapTextLines(primarySummary, 44, 4) : [];
        const bodyExtraLines = backBodyText ? wrapTextLines(backBodyText, 46, 5) : [];
        let backTextY = 445;
        const summarySvg = summaryLines
            .map((line) => {
                const el = `<text x="400" y="${backTextY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${theme.textLight}" opacity="0.9">${escapeSvgText(line)}</text>`;
                backTextY += 32;
                return el;
            })
            .join('');
        if (summaryLines.length > 0 && bodyExtraLines.length > 0) {
            backTextY += 12;
        }
        const backBodySvg = bodyExtraLines
            .map((line) => {
                const el = `<text x="400" y="${backTextY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" fill="#e2e8f0" opacity="0.88">${escapeSvgText(line)}</text>`;
                backTextY += 28;
                return el;
            })
            .join('');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1130" width="800" height="1130">
            <rect width="800" height="1130" fill="${theme.coverBg}" />
            <rect x="60" y="60" width="680" height="1010" rx="18" fill="none" stroke="${theme.accentColor}" stroke-opacity="0.35" stroke-width="2" />
            <circle cx="400" cy="280" r="64" fill="${theme.badgeBg}" stroke="${theme.accentColor}" stroke-width="2" />
            <text x="400" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#ffffff">ET</text>
            <text x="400" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#ffffff">${escapeSvgText(title.slice(0, 36))}</text>
            ${summarySvg}
            ${backBodySvg}
            <rect x="230" y="860" width="340" height="90" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" />
            <text x="400" y="900" text-anchor="middle" font-family="monospace" font-size="16" fill="${theme.accentColor}">ISBN 978-958-8400-3D-${String(totalPages).padStart(2, '0')}</text>
            <text x="400" y="928" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#cbd5e1">English Tech</text>
        </svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    // Standard interior textbook page
    const headingLines = wrapTextLines(title, 32, 2);
    const paragraphs = (Array.isArray(body) ? body : [String(body || '')])
        .map((p) => String(p || '').trim())
        .filter(Boolean);
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

    const hasInlineImage = Boolean(cleanImageUrl);
    const maxBodyY = hasInlineImage ? 510 : 680;
    const maxBulletsY = hasInlineImage ? 625 : 820;

    let bodySvg = '';
    for (const para of paragraphs.slice(0, 4)) {
        const lines = wrapTextLines(para, 58, hasInlineImage ? 4 : 5);
        for (const line of lines) {
            if (currentY > maxBodyY) break;
            bodySvg += `<text x="72" y="${currentY}" font-family="Georgia, 'Times New Roman', serif" font-size="19" fill="#334155">${escapeSvgText(line)}</text>`;
            currentY += 29;
        }
        currentY += 14;
    }

    let bulletsSvg = '';
    const nonEmptyBullets = Array.isArray(bullets)
        ? bullets.map((b) => String(b || '').trim()).filter(Boolean)
        : [];
    if (nonEmptyBullets.length > 0 && currentY < maxBulletsY - 30) {
        bulletsSvg += `<text x="72" y="${currentY + 6}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" letter-spacing="1.2" fill="${theme.spineColor}">KEY TAKEAWAYS &amp; STRUCTURES</text>`;
        currentY += 32;
        for (const item of nonEmptyBullets.slice(0, hasInlineImage ? 3 : 4)) {
            const bLines = wrapTextLines(item, 52, 2);
            if (currentY > maxBulletsY) break;
            bulletsSvg += `<circle cx="84" cy="${currentY - 6}" r="5" fill="${theme.badgeBg}" />`;
            bLines.forEach((bLine, idx) => {
                bulletsSvg += `<text x="102" y="${currentY + idx * 25}" font-family="system-ui, -apple-system, sans-serif" font-size="17" fill="#1e293b">${escapeSvgText(bLine)}</text>`;
            });
            currentY += bLines.length * 25 + 10;
        }
    }

    let imageSvg = '';
    if (hasInlineImage && currentY < 835) {
        const imgY = Math.max(currentY + 6, 420);
        const hasCalloutBelow = Boolean(calloutTitle || calloutText || (Array.isArray(keyTerms) && keyTerms.length > 0));
        const maxBottomForImg = hasCalloutBelow ? 820 : 965;
        const imgHeight = Math.max(155, Math.min(245, maxBottomForImg - imgY - (cleanImageCaption ? 28 : 6)));
        const clipId = `pageImgClip_${pageNumber}`;
        const captionSvg = cleanImageCaption
            ? `<text x="400" y="${imgY + imgHeight + 22}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-style="italic" fill="#475569">${escapeSvgText(cleanImageCaption.slice(0, 74))}</text>`
            : '';
        imageSvg = `<g>
            <defs>
                <clipPath id="${clipId}">
                    <rect x="72" y="${imgY}" width="656" height="${imgHeight}" rx="14" />
                </clipPath>
            </defs>
            <rect x="72" y="${imgY}" width="656" height="${imgHeight}" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
            <image href="${escapeSvgText(cleanImageUrl)}" x="72" y="${imgY}" width="656" height="${imgHeight}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})" />
            <rect x="72" y="${imgY}" width="656" height="${imgHeight}" rx="14" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
            ${captionSvg}
        </g>`;
        currentY = imgY + imgHeight + (cleanImageCaption ? 34 : 14);
    }

    let statsSvg = '';
    if (!hasInlineImage && Array.isArray(stats) && stats.length > 0 && currentY < 850) {
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
    } else if (Array.isArray(keyTerms) && keyTerms.length > 0 && currentY < 955) {
        const boxY = Math.min(Math.max(currentY + 8, 835), 860);
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
        ${imageSvg}
        ${statsSvg}
        ${calloutSvg}
        <line x1="72" y1="1032" x2="728" y2="1032" stroke="#e2e8f0" stroke-width="1.5" />
        <text x="72" y="1062" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8">English Tech</text>
        <text x="728" y="1062" text-anchor="end" font-family="Georgia, serif" font-size="15" font-weight="bold" fill="#475569">Page ${pageNumber} of ${totalPages}</text>
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Applies a custom cover image URL to an array of book pages (replacing the first cover page).
 */
export const applyCustomCoverToPages = (pages = [], customCoverUrl = '') => {
    const cleanCover = String(customCoverUrl || '').trim();
    const safePages = Array.isArray(pages) ? [...pages] : [];
    if (!cleanCover) return safePages;
    if (safePages.length === 0) return [cleanCover];
    safePages[0] = cleanCover;
    return safePages;
};

/**
 * Builds an array of illustrated SVG book pages from a structured outline array.
 */
export const buildBookPagesFromOutline = (
    outline = [],
    { themeId = 'royal-indigo', author = 'English Tech Faculty', customCoverUrl = '' } = {}
) => {
    const safeOutline = Array.isArray(outline) && outline.length > 0
        ? outline
        : [{ variant: 'cover', title: 'Libro', subtitle: 'Material de lectura' }];

    const totalPages = safeOutline.length;
    const rendered = safeOutline.map((pageSpec, idx) =>
        buildIllustratedBookPageSvg({
            ...pageSpec,
            pageNumber: idx + 1,
            totalPages,
            themeId: pageSpec.themeId || themeId,
            author: pageSpec.author || author
        })
    );
    return customCoverUrl ? applyCustomCoverToPages(rendered, customCoverUrl) : rendered;
};

/**
 * Generates fallback pages if a remote PDF is blocked by CORS and has no pre-rendered pages.
 */
export const buildFallbackBookPages = ({
    title = 'Documento PDF',
    description = '',
    fileName = '',
    author = 'Docente',
    themeId = 'royal-indigo',
    customCoverUrl = ''
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

    return buildBookPagesFromOutline(outline, { themeId, author, customCoverUrl });
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
            page.imageCaption,
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
        .slice(0, 6);

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
        .slice(0, 6);

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
    const imageUrl = String(safePage.imageUrl || safePage.image || '').trim();
    const imageCaption = String(safePage.imageCaption || safePage.caption || '').trim();

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
        calloutText,
        imageUrl,
        imageCaption
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

const preserveEditableOutlineFields = (merged = {}, normalized = {}, fallbackAuthor = 'Docente') => ({
    ...normalized,
    chapter: typeof merged.chapter === 'string' ? merged.chapter : normalized.chapter,
    title: typeof merged.title === 'string' ? merged.title : normalized.title,
    subtitle: typeof merged.subtitle === 'string' ? merged.subtitle : normalized.subtitle,
    body: Array.isArray(merged.body)
        ? merged.body.slice(0, 6).map((p) =>
              typeof p === 'object' && p !== null
                  ? String(p.text ?? p.content ?? '')
                  : String(p ?? '')
          )
        : normalized.body,
    bullets: Array.isArray(merged.bullets)
        ? merged.bullets.slice(0, 6).map((b) =>
              typeof b === 'object' && b !== null
                  ? String(b.text ?? b.title ?? '')
                  : String(b ?? '')
          )
        : normalized.bullets,
    calloutTitle: typeof merged.calloutTitle === 'string' ? merged.calloutTitle : normalized.calloutTitle,
    calloutText: typeof merged.calloutText === 'string' ? merged.calloutText : normalized.calloutText,
    imageUrl: typeof merged.imageUrl === 'string' ? merged.imageUrl.trim() : normalized.imageUrl,
    imageCaption: typeof merged.imageCaption === 'string' ? merged.imageCaption : normalized.imageCaption,
    author: merged.author || fallbackAuthor
});

/**
 * Updates a specific page in a book outline (Word-style document editing) and returns the normalized outline.
 */
export const updateBookOutlinePage = (
    outline = [],
    pageIndex = 0,
    changes = {},
    { defaultTitle = 'Libro', author = 'Docente' } = {}
) => {
    if (!Array.isArray(outline) || outline.length === 0) return [];
    const safeIdx = Math.min(Math.max(0, Math.floor(Number(pageIndex) || 0)), outline.length - 1);
    const total = outline.length;
    const safeChanges = changes && typeof changes === 'object' ? changes : {};

    return outline.map((page, idx) => {
        const merged = idx === safeIdx ? { ...page, ...safeChanges } : { ...page };
        const normalized = normalizeBookOutlinePage(merged, idx, total, defaultTitle);
        return preserveEditableOutlineFields(merged, normalized, author);
    });
};

/**
 * Inserts a new editable content page into a book outline (before the back-cover by default).
 */
export const insertBookOutlinePage = (
    outline = [],
    afterIndex = null,
    newPageSpec = {},
    { defaultTitle = 'Libro', author = 'Docente' } = {}
) => {
    const baseList =
        Array.isArray(outline) && outline.length > 0
            ? [...outline]
            : [
                  { variant: 'cover', title: defaultTitle, subtitle: '' },
                  { variant: 'back-cover', title: defaultTitle, subtitle: '' }
              ];

    const insertPos =
        afterIndex !== null && afterIndex !== undefined && Number.isFinite(Number(afterIndex))
            ? Math.min(Math.max(1, Math.floor(Number(afterIndex)) + 1), Math.max(1, baseList.length - 1))
            : Math.max(1, baseList.length - 1);

    const chapterNum = insertPos;
    const draftPage = {
        variant: 'content',
        chapter: newPageSpec.chapter || `CHAPTER ${chapterNum}`,
        title: newPageSpec.title || `New Section ${chapterNum}`,
        subtitle: newPageSpec.subtitle || '',
        body:
            Array.isArray(newPageSpec.body) && newPageSpec.body.length > 0
                ? newPageSpec.body
                : ['Write the main content of this page here.'],
        bullets: Array.isArray(newPageSpec.bullets) ? newPageSpec.bullets : [],
        calloutTitle: newPageSpec.calloutTitle || '',
        calloutText: newPageSpec.calloutText || '',
        imageUrl: newPageSpec.imageUrl || '',
        imageCaption: newPageSpec.imageCaption || '',
        author: newPageSpec.author || author
    };

    baseList.splice(insertPos, 0, draftPage);
    const total = baseList.length;
    return baseList.map((pg, idx) => {
        const merged = {
            ...pg,
            variant: idx === 0 ? 'cover' : idx === total - 1 ? 'back-cover' : 'content'
        };
        const normalized = normalizeBookOutlinePage(merged, idx, total, defaultTitle);
        return preserveEditableOutlineFields(merged, normalized, author);
    });
};

/**
 * Removes an editable page from a book outline while keeping at least cover + 1 content page + back-cover (min 3 pages).
 */
export const removeBookOutlinePage = (
    outline = [],
    pageIndex = 1,
    { defaultTitle = 'Libro', author = 'Docente' } = {}
) => {
    if (!Array.isArray(outline) || outline.length <= 3) return Array.isArray(outline) ? [...outline] : [];
    const safeIdx = Math.min(Math.max(1, Math.floor(Number(pageIndex) || 1)), outline.length - 2);
    const nextList = outline.filter((_, idx) => idx !== safeIdx);
    const total = nextList.length;
    return nextList.map((pg, idx) => {
        const merged = {
            ...pg,
            variant: idx === 0 ? 'cover' : idx === total - 1 ? 'back-cover' : 'content'
        };
        const normalized = normalizeBookOutlinePage(merged, idx, total, defaultTitle);
        return preserveEditableOutlineFields(merged, normalized, author);
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
    customCoverUrl = '',
    callGemini = null
} = {}) => {
    const cleanTopic = stripBookHtml(topic || title) || 'English for Economics';
    const cleanNotes = stripBookHtml(instructions || description);
    const totalPages = Math.max(3, Math.min(14, Number(pageCount) || 6));
    const cleanCustomCover = String(customCoverUrl || '').trim();

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

    if (cleanCustomCover && Array.isArray(outline) && outline.length > 0) {
        outline = outline.map((page, idx) =>
            idx === 0 ? { ...page, imageUrl: cleanCustomCover } : page
        );
    }

    const pages = buildBookPagesFromOutline(outline, {
        themeId,
        author,
        customCoverUrl: cleanCustomCover
    });
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
 * Extracts positioned HTML overlay metadata when an SVG data-URL page embeds an external http(s):// <image>.
 * Browsers block external network requests inside <img src="data:image/svg+xml,...">, so rendering a positioned
 * HTML <img> overlay guarantees external image URLs display reliably in both the editor and Flipbook3DModal.
 */
export const extractSvgExternalImageOverlay = (pageSrc = '') => {
    if (typeof pageSrc !== 'string' || !pageSrc.startsWith('data:image/svg+xml')) {
        return null;
    }
    if (!pageSrc.includes('http%3A') && !pageSrc.includes('https%3A') && !pageSrc.includes('http:') && !pageSrc.includes('https:')) {
        return null;
    }
    try {
        const commaIdx = pageSrc.indexOf(',');
        if (commaIdx < 0) return null;
        const rawPayload = pageSrc.slice(commaIdx + 1);
        const decodedSvg = pageSrc.includes(';base64,')
            ? (typeof atob === 'function' ? atob(rawPayload) : '')
            : decodeURIComponent(rawPayload);
        if (!decodedSvg) return null;

        const match = decodedSvg.match(
            /<image\s+href="((?:https?:)?\/\/[^"]+)"\s+x="([\d.]+)"\s+y="([\d.]+)"\s+width="([\d.]+)"\s+height="([\d.]+)"/i
        );
        if (!match) return null;

        const rawHref = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        let x = Number(match[2]) || 0;
        let y = Number(match[3]) || 0;
        const width = Number(match[4]) || 0;
        const height = Number(match[5]) || 0;
        if (width <= 0 || height <= 0) return null;

        const isCoverGroup = x === 0 && y === 0 && decodedSvg.includes('transform="translate(90, 650)"');
        if (isCoverGroup) {
            x = 90;
            y = 650;
        }

        return {
            href: rawHref,
            leftPct: Number(((x / 800) * 100).toFixed(3)),
            topPct: Number(((y / 1130) * 100).toFixed(3)),
            widthPct: Number(((width / 800) * 100).toFixed(3)),
            heightPct: Number(((height / 1130) * 100).toFixed(3)),
            objectFit: isCoverGroup ? 'cover' : 'contain'
        };
    } catch {
        return null;
    }
};

/**
 * Computes an intelligent, gentle PDF compression profile based on file size and page count
 * so heavy PDFs are lightly compressed without losing text sharpness or image clarity.
 */
export const computeSmartPdfCompressionProfile = ({
    fileSizeBytes = 0,
    pageCount = 1,
    scale = 1.55,
    maxDimension = 1320,
    quality = 0.80,
    compressionLevel = 'light'
} = {}) => {
    const safeBytes = Math.max(0, Number(fileSizeBytes) || 0);
    const fileSizeMB = safeBytes / (1024 * 1024);
    const safePages = Math.max(1, Math.floor(Number(pageCount) || 1));
    const mode = String(compressionLevel || 'light').toLowerCase().trim();

    if (mode === 'none' || mode === 'off') {
        return {
            tier: 'original',
            scale: Math.max(1.2, Math.min(2.0, Number(scale) || 1.6)),
            maxDimension: Math.max(1100, Math.min(1600, Number(maxDimension) || 1400)),
            quality: Math.max(0.75, Math.min(0.92, Number(quality) || 0.86)),
            maxPageChars: 340000,
            adaptiveStepDownQuality: 0.80
        };
    }

    // Heavy PDF (> 8 MB or > 28 pages): light-smart compression while keeping >= 1160px and >= 0.72 quality
    if (fileSizeMB > 8 || safePages > 28) {
        return {
            tier: 'smart-compact',
            scale: 1.38,
            maxDimension: 1160,
            quality: 0.74,
            maxPageChars: 145000,
            adaptiveStepDownQuality: 0.70
        };
    }

    // Medium PDF (2 MB - 8 MB or 13 - 28 pages): gentle balanced compression
    if (fileSizeMB >= 2 || safePages > 12) {
        return {
            tier: 'light-balanced',
            scale: 1.46,
            maxDimension: 1240,
            quality: 0.78,
            maxPageChars: 185000,
            adaptiveStepDownQuality: 0.73
        };
    }

    // Light PDF (< 2 MB and <= 12 pages): high clarity with mild optimization
    return {
        tier: 'high-clarity',
        scale: Math.max(1.35, Math.min(1.65, Number(scale) || 1.55)),
        maxDimension: Math.max(1160, Math.min(1380, Number(maxDimension) || 1320)),
        quality: Math.max(0.74, Math.min(0.86, Number(quality) || 0.82)),
        maxPageChars: 235000,
        adaptiveStepDownQuality: 0.76
    };
};

/**
 * Lightly compresses an image File, Blob, data URL, or CORS-enabled remote image URL for use as a custom book cover or inline page image.
 */
export const compressBookImageDataUrl = async (
    fileOrDataUrl,
    { maxDimension = 1080, quality = 0.80 } = {}
) => {
    if (!fileOrDataUrl) return '';
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
        return typeof fileOrDataUrl === 'string' ? fileOrDataUrl.trim() : '';
    }

    let rawDataUrl = '';
    if (typeof fileOrDataUrl === 'string') {
        rawDataUrl = fileOrDataUrl.trim();
    } else if (typeof FileReader !== 'undefined') {
        rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            reader.readAsDataURL(fileOrDataUrl);
        });
    }

    if (!rawDataUrl || rawDataUrl.startsWith('data:image/svg+xml')) {
        return rawDataUrl;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const origW = img.naturalWidth || img.width || 800;
                const origH = img.naturalHeight || img.height || 1000;
                const longest = Math.max(origW, origH, 1);
                const ratio = longest > maxDimension ? maxDimension / longest : 1;
                const targetW = Math.max(1, Math.round(origW * ratio));
                const targetH = Math.max(1, Math.round(origH * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d', { alpha: false });
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetW, targetH);

                const safeQuality = Math.max(0.68, Math.min(0.92, Number(quality) || 0.80));
                const compressed = canvas.toDataURL('image/jpeg', safeQuality);
                resolve(compressed || rawDataUrl);
            } catch {
                resolve(rawDataUrl);
            }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
    });
};

/**
 * Installs essential runtime polyfills required by pdfjs-dist@6.x (such as
 * Uint8Array.prototype.toHex used by font hashing, Map.prototype.getOrInsertComputed,
 * and DOMMatrix) when running in browsers or runtimes that lack ES2025/2026 methods.
 */
const ensurePdfPolyfills = () => {
    if (typeof Uint8Array !== 'undefined' && typeof Uint8Array.prototype.toHex !== 'function') {
        Object.defineProperty(Uint8Array.prototype, 'toHex', {
            configurable: true,
            writable: true,
            value: function toHex() {
                let out = '';
                for (let i = 0; i < this.length; i++) {
                    out += this[i].toString(16).padStart(2, '0');
                }
                return out;
            }
        });
    }
    if (typeof Map !== 'undefined' && typeof Map.prototype.getOrInsertComputed !== 'function') {
        Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
            configurable: true,
            writable: true,
            value: function getOrInsertComputed(key, callbackfn) {
                if (this.has(key)) return this.get(key);
                const val = callbackfn(key);
                this.set(key, val);
                return val;
            }
        });
    }
    if (typeof Map !== 'undefined' && typeof Map.prototype.getOrInsert !== 'function') {
        Object.defineProperty(Map.prototype, 'getOrInsert', {
            configurable: true,
            writable: true,
            value: function getOrInsert(key, defaultValue) {
                if (this.has(key)) return this.get(key);
                this.set(key, defaultValue);
                return defaultValue;
            }
        });
    }
    if (typeof globalThis.DOMMatrix === 'undefined') {
        globalThis.DOMMatrix = class DOMMatrixShim {
            constructor(init) {
                const v = Array.isArray(init) && init.length >= 6 ? init : [1, 0, 0, 1, 0, 0];
                this.a = v[0];
                this.b = v[1];
                this.c = v[2];
                this.d = v[3];
                this.e = v[4];
                this.f = v[5];
            }
            scaleSelf() { return this; }
            translateSelf() { return this; }
            multiplySelf() { return this; }
            preMultiplySelf() { return this; }
            invertSelf() { return this; }
            scale() { return new DOMMatrixShim(); }
            translate() { return new DOMMatrixShim(); }
            multiply() { return new DOMMatrixShim(); }
            inverse() { return new DOMMatrixShim(); }
        };
    }
    if (typeof globalThis.Path2D === 'undefined') {
        globalThis.Path2D = class Path2DShim {
            constructor(path) {
                this.ops = Array.isArray(path?.ops) ? [...path.ops] : [];
            }
            addPath(path) {
                if (Array.isArray(path?.ops)) {
                    this.ops.push(...path.ops);
                }
            }
            moveTo(x, y) { this.ops.push(['moveTo', x, y]); }
            lineTo(x, y) { this.ops.push(['lineTo', x, y]); }
            bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
                this.ops.push(['bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y]);
            }
            quadraticCurveTo(cpx, cpy, x, y) {
                this.ops.push(['quadraticCurveTo', cpx, cpy, x, y]);
            }
            arc(x, y, r, s, e, ccw) {
                this.ops.push(['arc', x, y, r, s, e, ccw]);
            }
            rect(x, y, w, h) { this.ops.push(['rect', x, y, w, h]); }
            closePath() { this.ops.push(['closePath']); }
        };
    }
};

/**
 * Configures pdfjs-dist GlobalWorkerOptions.workerSrc with a version-matched worker.
 * Prefers a same-origin bundled legacy worker in HTTP(S) browser environments with CDN fallback.
 */
export const ensurePdfWorker = (pdfjsLib) => {
    ensurePdfPolyfills();
    if (!pdfjsLib || !pdfjsLib.GlobalWorkerOptions) return '';
    const ver = pdfjsLib.version || '6.2.108';
    const currentWorker = String(pdfjsLib.GlobalWorkerOptions.workerSrc || '').trim();
    if (
        !currentWorker ||
        currentWorker.includes('cdnjs.cloudflare.com') ||
        currentWorker.includes('4.10.38')
    ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/legacy/build/pdf.worker.min.mjs`;
    }
    return pdfjsLib.GlobalWorkerOptions.workerSrc;
};

/**
 * Loads the bundled pdf.worker.min.mjs in-process on globalThis.pdfjsWorker and clears
 * any cached rejected _setupFakeWorkerGlobal promise on PDFWorker so fallback rendering
 * works 100% offline and on servers where .mjs static assets have wrong MIME types.
 */
export const ensurePdfInProcessWorkerFallback = async (pdfjsLib = null) => {
    try {
        if (pdfjsLib?.PDFWorker && '_setupFakeWorkerGlobal' in pdfjsLib.PDFWorker) {
            delete pdfjsLib.PDFWorker._setupFakeWorkerGlobal;
        }
    } catch {
        // Ignore non-configurable property errors
    }
    if (typeof globalThis !== 'undefined' && globalThis.pdfjsWorker?.WorkerMessageHandler) {
        return globalThis.pdfjsWorker;
    }
    try {
        const workerMod = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
        const resolved = workerMod?.WorkerMessageHandler
            ? workerMod
            : workerMod?.default?.WorkerMessageHandler
                ? workerMod.default
                : workerMod;
        if (typeof globalThis !== 'undefined' && resolved?.WorkerMessageHandler) {
            globalThis.pdfjsWorker = resolved;
        }
        return resolved;
    } catch {
        return null;
    }
};

/**
 * Builds complete pdfjs-dist getDocument() initialization parameters including
 * CMap, standard fonts, WASM (OpenJPEG/JBIG2/QCMS), and ICC color profile URLs
 * so PDFs with CMYK/ICCBased colors, JPEG2000/JBIG2 images, or unembedded fonts never render blank.
 */
export const buildPdfDocumentInitParams = (baseParams = {}, pdfjsLib = null, extraOptions = {}) => {
    ensurePdfPolyfills();
    const ver = (pdfjsLib && pdfjsLib.version) || '6.2.108';
    const cdnBase = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}`;
    const clonedBase = { ...(baseParams || {}) };
    if (clonedBase.data instanceof Uint8Array) {
        clonedBase.data = clonedBase.data.slice();
    } else if (clonedBase.data instanceof ArrayBuffer) {
        clonedBase.data = new Uint8Array(clonedBase.data.slice(0));
    } else if (ArrayBuffer.isView(clonedBase.data)) {
        clonedBase.data = new Uint8Array(
            clonedBase.data.buffer.slice(
                clonedBase.data.byteOffset,
                clonedBase.data.byteOffset + clonedBase.data.byteLength
            )
        );
    }

    const mergedExtra = extraOptions || {};
    const hasCustomDomWithoutFontApi =
        typeof document !== 'undefined' &&
        (!document.fonts || typeof FontFace === 'undefined');
    const resolvedDisableFontFace =
        mergedExtra.disableFontFace !== undefined
            ? Boolean(mergedExtra.disableFontFace)
            : clonedBase.disableFontFace !== undefined
                ? Boolean(clonedBase.disableFontFace)
                : hasCustomDomWithoutFontApi;
    // CRITICAL: pdfjs-dist throws an assertion in FontLoader.loadSystemFont if disableFontFace is true
    // while useSystemFonts is true, or when document.fonts (Font Loading API) is absent.
    const resolvedUseSystemFonts = resolvedDisableFontFace
        ? false
        : mergedExtra.useSystemFonts !== undefined
            ? Boolean(mergedExtra.useSystemFonts)
            : clonedBase.useSystemFonts !== undefined
                ? Boolean(clonedBase.useSystemFonts)
                : true;

    const nodeProc = globalThis.process;
    const isNodeRuntime =
        typeof nodeProc !== 'undefined' &&
        Boolean(nodeProc?.versions?.node) &&
        typeof nodeProc?.getBuiltinModule === 'function' &&
        typeof window === 'undefined';

    const domCanvasFactoryPatch =
        typeof document !== 'undefined' && typeof HTMLCanvasElement === 'undefined'
            ? {
                  CanvasFactory: class CustomDomCanvasFactory {
                      create(width, height) {
                          const canvas = document.createElement('canvas');
                          canvas.width = Math.max(1, Math.round(width || 1));
                          canvas.height = Math.max(1, Math.round(height || 1));
                          const context =
                              canvas.getContext('2d', { alpha: false, willReadFrequently: true }) ||
                              canvas.getContext('2d');
                          return { canvas, context };
                      }
                      reset(canvasAndContext, width, height) {
                          if (canvasAndContext && canvasAndContext.canvas) {
                              canvasAndContext.canvas.width = Math.max(1, Math.round(width || 1));
                              canvasAndContext.canvas.height = Math.max(1, Math.round(height || 1));
                          }
                      }
                      destroy(canvasAndContext) {
                          if (canvasAndContext && canvasAndContext.canvas) {
                              canvasAndContext.canvas.width = 0;
                              canvasAndContext.canvas.height = 0;
                          }
                      }
                  }
              }
            : {};

    const nodeBinaryDataFactoryPatch = isNodeRuntime
        ? {
              BinaryDataFactory: class HybridNodeBinaryDataFactory {
                  constructor({ cMapUrl = null, standardFontDataUrl = null, wasmUrl = null } = {}) {
                      this.cMapUrl = cMapUrl;
                      this.standardFontDataUrl = standardFontDataUrl;
                      this.wasmUrl = wasmUrl;
                  }
                  async fetch({ kind, filename } = {}) {
                      const dirMap = {
                          cMapUrl: 'cmaps',
                          standardFontDataUrl: 'standard_fonts',
                          wasmUrl: 'wasm'
                      };
                      const subDir = dirMap[kind];
                      if (subDir && filename && nodeProc?.getBuiltinModule) {
                          try {
                              const fs = nodeProc.getBuiltinModule('fs/promises');
                              const pathMod = nodeProc.getBuiltinModule('path');
                              const localPath = pathMod.join(
                                  nodeProc.cwd(),
                                  'node_modules',
                                  'pdfjs-dist',
                                  subDir,
                                  filename
                              );
                              const buf = await fs.readFile(localPath);
                              return new Uint8Array(buf);
                          } catch {
                              // Fall through to HTTP fetch if local file is unavailable
                          }
                      }
                      const baseUrl = this[kind] || '';
                      const url = `${baseUrl}${filename || ''}`;
                      if (typeof globalThis.fetch === 'function') {
                          const res = await globalThis.fetch(url);
                          if (!res.ok) {
                              throw new Error(`Unable to load ${kind} data at: ${url}`);
                          }
                          return new Uint8Array(await res.arrayBuffer());
                      }
                      throw new Error(`Unable to load ${kind} data at: ${url}`);
                  }
              }
          }
        : {};

    const result = {
        cMapUrl: `${cdnBase}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${cdnBase}/standardFontDataUrl/`.replace('standardFontDataUrl', 'standard_fonts'),
        wasmUrl: `${cdnBase}/wasm/`,
        iccUrl: `${cdnBase}/iccs/`,
        isEvalSupported: false,
        stopAtErrors: false,
        isOffscreenCanvasSupported: false,
        isImageDecoderSupported: false,
        ...domCanvasFactoryPatch,
        ...nodeBinaryDataFactoryPatch,
        ...clonedBase,
        ...mergedExtra,
        useSystemFonts: resolvedUseSystemFonts
    };

    if (
        resolvedDisableFontFace ||
        mergedExtra.disableFontFace !== undefined ||
        clonedBase.disableFontFace !== undefined
    ) {
        result.disableFontFace = resolvedDisableFontFace;
    }

    return result;
};

const computeCoprimeStride = (rawStride, width) => {
    let stride = Math.max(1, Math.floor(rawStride) || 1);
    const safeWidth = Math.max(1, Math.floor(width) || 1);
    if (stride <= 1 || safeWidth <= 1) return 1;
    const gcd = (a, b) => {
        let x = Math.abs(a);
        let y = Math.abs(b);
        while (y !== 0) {
            const t = y;
            y = x % y;
            x = t;
        }
        return x;
    };
    while (gcd(stride, safeWidth) !== 1) {
        stride += 1;
    }
    return stride;
};

/**
 * Detects whether a rendered 2D canvas page is completely blank (all white or transparent).
 * Returns false if the canvas context does not implement getImageData (e.g. lightweight test mocks).
 */
export const isCanvasPageBlank = (canvas, ctx = null) => {
    if (!canvas) return true;
    const width = Number(canvas.width) || 0;
    const height = Number(canvas.height) || 0;
    if (width <= 0 || height <= 0) return true;

    const context =
        ctx || (typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null);
    if (!context || typeof context.getImageData !== 'function') {
        return false;
    }

    try {
        const imgData = context.getImageData(0, 0, width, height);
        const data = imgData && imgData.data;
        if (!data || typeof data.length !== 'number' || data.length < 4) {
            return false;
        }

        const totalPixels = Math.floor(data.length / 4);
        const rawStride = Math.max(1, Math.floor(totalPixels / 65000));
        const pixelStride = computeCoprimeStride(rawStride, width);
        const byteStep = pixelStride * 4;

        for (let i = 0; i < data.length; i += byteStep) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 12 && (r < 250 || g < 250 || b < 250)) {
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
};

/**
 * Dynamically loads pdfjs-dist (preferring the polyfilled legacy build) and configures its worker.
 */
let cachedPdfJsPromise = null;
const getPdfJs = async () => {
    ensurePdfPolyfills();
    if (!cachedPdfJsPromise) {
        cachedPdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
            const pdfjsLib = mod.default || mod;
            if (typeof window !== 'undefined' && 'Worker' in window) {
                ensurePdfWorker(pdfjsLib);
            }
            return pdfjsLib;
        });
    } else {
        cachedPdfJsPromise = cachedPdfJsPromise.then((pdfjsLib) => {
            if (typeof window !== 'undefined' && 'Worker' in window) {
                ensurePdfWorker(pdfjsLib);
            }
            return pdfjsLib;
        });
    }
    return cachedPdfJsPromise;
};

const splitExtractedTextIntoParagraphs = (rawText = '', maxParagraphs = 4) => {
    const clean = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    let current = '';

    for (const sentence of sentences) {
        if (!sentence) continue;
        if ((current + ' ' + sentence).trim().length <= 240) {
            current = (current + ' ' + sentence).trim();
        } else {
            if (current) paragraphs.push(current);
            current = sentence.slice(0, 240);
            if (paragraphs.length >= maxParagraphs) break;
        }
    }
    if (current && paragraphs.length < maxParagraphs) {
        paragraphs.push(current);
    }
    return paragraphs.slice(0, maxParagraphs);
};

const decodeDataUrlToBytes = (dataUrl = '') => {
    const raw = String(dataUrl || '').trim();
    if (!raw.startsWith('data:')) return null;
    const commaIdx = raw.indexOf(',');
    if (commaIdx < 0) return null;
    const header = raw.slice(0, commaIdx).toLowerCase();
    const payload = raw.slice(commaIdx + 1);
    try {
        if (header.includes(';base64')) {
            const cleanBase64 = payload.replace(/\s+/g, '');
            if (typeof atob === 'function') {
                const binary = atob(cleanBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i) & 0xff;
                }
                return bytes;
            }
            if (typeof globalThis.Buffer !== 'undefined') {
                return new Uint8Array(globalThis.Buffer.from(cleanBase64, 'base64'));
            }
        } else {
            const decodedText = decodeURIComponent(payload);
            return new TextEncoder().encode(decodedText);
        }
    } catch {
        return null;
    }
    return null;
};

const buildAllVisibleOptionalContentPromise = (pdfDoc) => {
    if (!pdfDoc || typeof pdfDoc.getOptionalContentConfig !== 'function') {
        return undefined;
    }
    return pdfDoc
        .getOptionalContentConfig({ intent: 'any' })
        .then((ocConfig) => {
            if (
                ocConfig &&
                typeof ocConfig.setVisibility === 'function' &&
                typeof ocConfig[Symbol.iterator] === 'function'
            ) {
                for (const [id] of ocConfig) {
                    ocConfig.setVisibility(id, true, false);
                }
            }
            return ocConfig;
        })
        .catch(() => undefined);
};

/**
 * Renders a PDF (File, Blob, ArrayBuffer, data: URL, blob: URL, or https: URL)
 * into an array of lightly compressed JPEG page data URLs.
 */
export const renderPdfToBookPages = async (
    source,
    {
        maxPages = 60,
        scale = 1.55,
        maxDimension = 1320,
        quality = 0.80,
        compressionLevel = 'light',
        customCoverUrl = '',
        fallbackTitle = 'Libro',
        themeId = 'royal-indigo',
        pdfjsLib: customPdfJsLib = null,
        onProgress
    } = {}
) => {
    if (typeof document === 'undefined') {
        throw new Error('renderPdfToBookPages requires a browser DOM environment.');
    }

    const pdfjsLib = customPdfJsLib || (await getPdfJs());
    let docParams = null;
    let rawBytes = null;
    let sourceSizeBytes = Number(source?.size || source?.byteLength || 0);
    const inferredTitle =
        stripBookHtml(fallbackTitle || source?.name?.replace(/\.pdf$/i, '') || 'Libro') || 'Libro';

    const resolveUrlOrDataString = async (urlStr) => {
        const cleanUrl = String(urlStr || '').trim();
        if (!cleanUrl) return;
        if (cleanUrl.startsWith('data:')) {
            const decoded = decodeDataUrlToBytes(cleanUrl);
            if (decoded && decoded.byteLength > 0) {
                rawBytes = decoded;
                sourceSizeBytes = decoded.byteLength;
                return;
            }
        }
        if (typeof fetch === 'function' && /^(blob:|https?:)/i.test(cleanUrl)) {
            try {
                const res = await fetch(cleanUrl);
                if (res && res.ok && typeof res.arrayBuffer === 'function') {
                    const buf = await res.arrayBuffer();
                    if (buf && buf.byteLength > 0) {
                        rawBytes = new Uint8Array(buf);
                        sourceSizeBytes = rawBytes.byteLength;
                        return;
                    }
                }
            } catch {
                // Fall back to direct PDF.js URL streaming with Range disabled
            }
        }
        docParams = {
            url: cleanUrl,
            withCredentials: false,
            disableRange: true,
            disableStream: true
        };
    };

    if (typeof source === 'string') {
        await resolveUrlOrDataString(source);
    } else if (source instanceof ArrayBuffer) {
        rawBytes = new Uint8Array(source.slice(0));
        sourceSizeBytes = rawBytes.byteLength;
    } else if (ArrayBuffer.isView(source)) {
        rawBytes = new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
        sourceSizeBytes = rawBytes.byteLength;
    } else if (source && typeof source.arrayBuffer === 'function') {
        const buffer = await source.arrayBuffer();
        rawBytes = new Uint8Array(buffer);
        sourceSizeBytes = rawBytes.byteLength;
    } else if (source && source.url) {
        await resolveUrlOrDataString(source.url);
    } else {
        throw new Error('Fuente PDF no válida para generar el libro.');
    }

    if (!rawBytes && !docParams) {
        throw new Error('Fuente PDF vacía o no válida para generar el libro.');
    }

    const baseSourceParams = rawBytes ? { data: rawBytes } : docParams;
    const buildAttemptParams = (extra = {}) =>
        buildPdfDocumentInitParams(baseSourceParams, pdfjsLib, extra);

    const ver = pdfjsLib.version || '6.2.108';
    let pdf = null;
    let compatPdf = null;

    try {
        const loadingTask = pdfjsLib.getDocument(buildAttemptParams());
        pdf = await loadingTask.promise;
    } catch (firstErr) {
        await ensurePdfInProcessWorkerFallback(pdfjsLib);
        try {
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/legacy/build/pdf.worker.min.mjs`;
            }
            const jsDelivrTask = pdfjsLib.getDocument(buildAttemptParams({ disableAutoFetch: true }));
            pdf = await jsDelivrTask.promise;
        } catch {
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/legacy/build/pdf.worker.min.mjs`;
            }
            const unpkgTask = pdfjsLib.getDocument(
                buildAttemptParams({
                    disableAutoFetch: true,
                    disableFontFace: true,
                    useSystemFonts: false,
                    isOffscreenCanvasSupported: false,
                    isImageDecoderSupported: false
                })
            );
            pdf = (await unpkgTask.promise) || (() => { throw firstErr; })();
        }
    }

    try {
        const originalPageCount = pdf.numPages || 1;
        const totalPages = Math.min(originalPageCount, Math.max(1, maxPages));
        const compressionProfile = computeSmartPdfCompressionProfile({
            fileSizeBytes: sourceSizeBytes,
            pageCount: totalPages,
            scale,
            maxDimension,
            quality,
            compressionLevel
        });

        const pages = [];
        const pageTexts = [];
        let aspectRatio = DEFAULT_BOOK_ASPECT_RATIO;
        let allLayersVisiblePromise = null;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const baseViewport = page.getViewport({ scale: 1 });
            if (pageNum === 1 && baseViewport.width > 0 && baseViewport.height > 0) {
                aspectRatio = Number((baseViewport.width / baseViewport.height).toFixed(3));
            }

            let fullPageText = '';
            try {
                const textContent = await page.getTextContent();
                fullPageText = (textContent?.items || [])
                    .map((it) => it.str || '')
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                pageTexts.push(fullPageText.slice(0, 320));
            } catch {
                pageTexts.push('');
            }

            const targetScale = compressionProfile.scale;
            const targetMaxDim = compressionProfile.maxDimension;
            const longestSide = Math.max(baseViewport.width * targetScale, baseViewport.height * targetScale);
            const effectiveScale = longestSide > targetMaxDim
                ? (targetMaxDim / Math.max(baseViewport.width, baseViewport.height))
                : targetScale;

            const viewport = page.getViewport({ scale: effectiveScale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(viewport.width));
            canvas.height = Math.max(1, Math.round(viewport.height));

            const ctx =
                canvas.getContext('2d', { alpha: false, willReadFrequently: true }) ||
                canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            let renderSucceeded = false;
            try {
                await page.render({
                    canvas: null,
                    canvasContext: ctx,
                    viewport,
                    background: '#ffffff'
                }).promise;
                renderSucceeded = true;
            } catch {
                renderSucceeded = false;
            }

            let pageIsBlank = !renderSucceeded || isCanvasPageBlank(canvas, ctx);

            // Stage 2: Retry with 'any' rendering intent + ENABLE_FORMS + all Optional Content Groups forced visible
            if (pageIsBlank) {
                try {
                    if (!allLayersVisiblePromise) {
                        allLayersVisiblePromise = buildAllVisibleOptionalContentPromise(pdf);
                    }
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({
                        canvas: null,
                        canvasContext: ctx,
                        viewport,
                        intent: 'any',
                        annotationMode: 2,
                        optionalContentConfigPromise: allLayersVisiblePromise,
                        background: '#ffffff'
                    }).promise;
                    pageIsBlank = isCanvasPageBlank(canvas, ctx);
                } catch {
                    // Proceed to Stage 3 compatibility render
                }
            }

            // Stage 3: Retry with FontFace/OffscreenCanvas/ImageDecoder disabled & useSystemFonts: false
            // while keeping WASM enabled so JPEG2000/JBIG2 scanned images and vector glyph paths render directly
            if (pageIsBlank) {
                try {
                    if (!compatPdf) {
                        const compatTask = pdfjsLib.getDocument(
                            buildAttemptParams({
                                disableFontFace: true,
                                useSystemFonts: false,
                                isOffscreenCanvasSupported: false,
                                isImageDecoderSupported: false,
                                useWasm: true,
                                useWorkerFetch: false
                            })
                        );
                        compatPdf = await compatTask.promise;
                    }
                    if (compatPdf) {
                        const compatPage = await compatPdf.getPage(pageNum);
                        const compatViewport = compatPage.getViewport({ scale: effectiveScale });
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        await compatPage.render({
                            canvas: null,
                            canvasContext: ctx,
                            viewport: compatViewport,
                            intent: 'print',
                            annotationMode: 2,
                            background: '#ffffff'
                        }).promise;
                        pageIsBlank = isCanvasPageBlank(canvas, ctx);
                        try {
                            compatPage.cleanup?.();
                        } catch {
                            // Ignore cleanup errors
                        }
                    }
                } catch {
                    // Proceed to Stage 4 SVG synthesis
                }
            }

            let dataUrl = '';
            const extractedParagraphs = splitExtractedTextIntoParagraphs(fullPageText, 4);

            // Stage 4: If canvas is still completely blank after all 3 canvas stages, ALWAYS synthesize a visible SVG page
            if (pageIsBlank) {
                const fallbackBody =
                    extractedParagraphs.length > 0
                        ? pageNum === 1 && extractedParagraphs.length > 1
                            ? extractedParagraphs.slice(1)
                            : extractedParagraphs
                        : [
                              `Vista interactiva de la página ${pageNum} de ${totalPages} (${inferredTitle}).`,
                              'Usa el botón PDF en la barra superior para consultar el documento original de alta resolución.'
                          ];
                dataUrl = buildIllustratedBookPageSvg({
                    variant: pageNum === 1 ? 'cover' : 'content',
                    chapter: `PÁGINA ${pageNum}`,
                    title: pageNum === 1 ? inferredTitle : `${inferredTitle} — Página ${pageNum}`,
                    subtitle:
                        pageNum === 1 && extractedParagraphs.length > 0
                            ? (extractedParagraphs[0] || '').slice(0, 110)
                            : '',
                    body: fallbackBody,
                    pageNumber: pageNum,
                    totalPages,
                    themeId
                });
            } else {
                dataUrl = canvas.toDataURL('image/jpeg', compressionProfile.quality);
                // Gentle adaptive step-down if a single page has very heavy dense imagery
                if (
                    dataUrl &&
                    dataUrl.length > compressionProfile.maxPageChars &&
                    compressionProfile.adaptiveStepDownQuality < compressionProfile.quality
                ) {
                    dataUrl = canvas.toDataURL('image/jpeg', compressionProfile.adaptiveStepDownQuality);
                }
                if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 32) {
                    dataUrl = buildIllustratedBookPageSvg({
                        variant: pageNum === 1 ? 'cover' : 'content',
                        chapter: `PÁGINA ${pageNum}`,
                        title: pageNum === 1 ? inferredTitle : `${inferredTitle} — Página ${pageNum}`,
                        subtitle: '',
                        body:
                            extractedParagraphs.length > 0
                                ? extractedParagraphs
                                : [`Contenido de la página ${pageNum}.`],
                        pageNumber: pageNum,
                        totalPages,
                        themeId
                    });
                }
            }

            pages.push(dataUrl);

            // Release page operator lists and temporary canvas backing store to prevent GPU memory exhaustion
            try {
                page.cleanup?.();
            } catch {
                // Ignore cleanup errors
            }
            canvas.width = 0;
            canvas.height = 0;

            if (typeof onProgress === 'function') {
                onProgress({
                    phase: 'render',
                    currentPage: pageNum,
                    totalPages,
                    percent: Math.round((pageNum / totalPages) * 100)
                });
            }
        }

        const finalPages = customCoverUrl ? applyCustomCoverToPages(pages, customCoverUrl) : pages;

        return {
            pages: finalPages,
            rawPdfPages: pages,
            pageTexts,
            pageCount: finalPages.length,
            originalPageCount,
            aspectRatio,
            coverUrl: finalPages[0] || '',
            compressionProfile
        };
    } finally {
        try {
            await compatPdf?.destroy?.();
        } catch {
            // Ignore destroy errors
        }
        try {
            await pdf?.destroy?.();
        } catch {
            // Ignore destroy errors
        }
    }
};

/**
 * Uploads rendered dataUrl pages to Firebase Storage (when in live mode)
 * so students load fast CDN images without CORS issues or Firestore size limits.
 */
export const uploadBookPagesToStorage = async (
    pages = [],
    uploadImageFn,
    { isDemoMode = false, folder = 'books', concurrency = 4, onProgress } = {}
) => {
    if (!Array.isArray(pages) || pages.length === 0) return [];
    if (isDemoMode || typeof uploadImageFn !== 'function') {
        return [...pages];
    }

    const total = pages.length;
    const uploaded = new Array(total);
    const batchSize = Math.max(1, Math.min(8, Number(concurrency) || 4));
    let completedCount = 0;

    for (let start = 0; start < total; start += batchSize) {
        const end = Math.min(total, start + batchSize);
        const batchIndices = [];
        for (let idx = start; idx < end; idx++) {
            batchIndices.push(idx);
        }

        await Promise.all(
            batchIndices.map(async (i) => {
                const pageUrl = pages[i];
                if (
                    typeof pageUrl === 'string' &&
                    pageUrl.startsWith('data:image/') &&
                    !pageUrl.startsWith('data:image/svg+xml')
                ) {
                    let remoteUrl = null;
                    try {
                        remoteUrl = await uploadImageFn(pageUrl, folder);
                    } catch {
                        try {
                            remoteUrl = await uploadImageFn(pageUrl, folder);
                        } catch {
                            remoteUrl = null;
                        }
                    }
                    uploaded[i] = remoteUrl || pageUrl;
                } else {
                    uploaded[i] = pageUrl;
                }

                completedCount += 1;
                if (typeof onProgress === 'function') {
                    onProgress({
                        phase: 'upload',
                        currentPage: completedCount,
                        totalPages: total,
                        percent: Math.round((completedCount / total) * 100)
                    });
                }
            })
        );
    }

    return uploaded;
};

/**
 * Detects whether a book page URL is a compacted Firestore overflow placeholder or generic fallback SVG.
 */
export const isCompactedOrFallbackBookPage = (pageUrl = '') => {
    if (typeof pageUrl !== 'string' || !pageUrl.trim()) return true;
    if (!pageUrl.startsWith('data:image/svg+xml')) return false;
    try {
        const commaIdx = pageUrl.indexOf(',');
        const payload = commaIdx >= 0 ? pageUrl.slice(commaIdx + 1) : pageUrl;
        const decoded = decodeURIComponent(payload);
        return (
            decoded.includes('Usa el botón PDF para abrir el documento completo') ||
            decoded.includes('VISTA PREVIA INTERACTIVA') ||
            decoded.includes('ARCHIVO PDF VINCULADO')
        );
    } catch {
        return false;
    }
};

/**
 * Determines whether a book record should render its pages live from pdfUrl
 * (e.g. when bookPages is empty, truncated, or contains compacted placeholder SVGs).
 */
export const bookPagesNeedLivePdfRender = (
    pages = [],
    { pdfUrl = '', expectedPageCount = 0 } = {}
) => {
    if (!pdfUrl || typeof pdfUrl !== 'string' || !pdfUrl.trim()) return false;
    if (!Array.isArray(pages) || pages.length === 0) return true;
    const expected = Number(expectedPageCount) || 0;
    if (expected > pages.length) return true;
    return pages.some((p) => isCompactedOrFallbackBookPage(p));
};

/**
 * Compacts inline data URLs if needed so the Firestore document never exceeds 1MB.
 */
export const compactBookPagesForFirestore = (
    pages = [],
    {
        maxTotalChars = MAX_TOTAL_FIRESTORE_BOOK_CHARS,
        fallbackTitle = 'Libro',
        themeId = 'royal-indigo',
        bookOutline = [],
        pageTexts = [],
        author = 'Docente'
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
            const outlineSpec = Array.isArray(bookOutline) && bookOutline[i] ? bookOutline[i] : null;
            const rawPageText = Array.isArray(pageTexts) && pageTexts[i] ? String(pageTexts[i]).trim() : '';
            const extractedLines = splitExtractedTextIntoParagraphs(rawPageText, 3);
            // Replace overflow inline base64 page with a lightweight SVG page (~2KB) preserving outline or extracted PDF text if available
            const compactSvg = outlineSpec
                ? buildIllustratedBookPageSvg({
                      ...outlineSpec,
                      imageUrl: outlineSpec.imageUrl && !String(outlineSpec.imageUrl).startsWith('data:') ? outlineSpec.imageUrl : '',
                      customCoverUrl: '',
                      pageNumber: i + 1,
                      totalPages: pages.length,
                      themeId: outlineSpec.themeId || themeId,
                      author: outlineSpec.author || author
                  })
                : buildIllustratedBookPageSvg({
                      variant: 'content',
                      chapter: 'CONTENIDO',
                      title: `${fallbackTitle} — Página ${i + 1}`,
                      subtitle: '',
                      body:
                          extractedLines.length > 0
                              ? [...extractedLines, 'Usa el botón PDF para abrir el documento completo.']
                              : ['Usa el botón PDF para abrir el documento completo.'],
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
    const {
        pages: _ignoredLegacyPages,
        rawPdfPages: _ignoredRawPdfPages,
        ...restBook
    } = book && typeof book === 'object' ? book : {};

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
    const authorName = book.authorName || book.author || 'Docente';
    const rawCustomCover = String(book.customCoverUrl || '').trim();
    const customCoverUrl =
        rawCustomCover.startsWith('data:') && rawCustomCover.length > 260000
            ? ''
            : rawCustomCover;

    const rawOutline = Array.isArray(book.bookOutline)
        ? book.bookOutline.map((p, idx, arr) => ({
              ...normalizeBookOutlinePage(p, idx, arr.length, title),
              author: p?.author || authorName
          }))
        : [];

    const pagesBudget = Math.max(
        240000,
        MAX_TOTAL_FIRESTORE_BOOK_CHARS - (customCoverUrl.startsWith('data:') ? customCoverUrl.length : 0)
    );

    const baseSourcePages =
        rawPages.length > 0
            ? rawPages
            : rawOutline.length > 0
                ? buildBookPagesFromOutline(rawOutline, {
                      themeId: theme,
                      author: authorName,
                      customCoverUrl
                  })
                : buildFallbackBookPages({
                      title,
                      description: cleanDescription,
                      fileName: book.fileName || '',
                      author: authorName,
                      themeId: theme,
                      customCoverUrl
                  });

    const pagesWithCover = customCoverUrl
        ? applyCustomCoverToPages(baseSourcePages, customCoverUrl)
        : baseSourcePages;

    const rawPageTexts = Array.isArray(book.pageTexts) ? book.pageTexts : [];

    const finalPages = compactBookPagesForFirestore(pagesWithCover, {
        maxTotalChars: pagesBudget,
        fallbackTitle: title,
        themeId: theme,
        bookOutline: rawOutline,
        pageTexts: rawPageTexts,
        author: authorName
    });

    // Avoid duplicating large inline data:image/* base64 strings inside bookOutline when finalPages already stores them
    let runningChars =
        finalPages.reduce((sum, p) => sum + (typeof p === 'string' ? p.length : 0), 0) +
        (customCoverUrl.startsWith('data:') ? customCoverUrl.length : 0);

    const bookOutline = rawOutline.map((p) => {
        const img = String(p?.imageUrl || '');
        if (img.startsWith('data:') && runningChars + img.length > MAX_TOTAL_FIRESTORE_BOOK_CHARS) {
            return { ...p, imageUrl: '' };
        }
        runningChars += img.length;
        return p;
    });

    const resolvedCover = customCoverUrl || finalPages[0] || book.coverUrl || '';
    const coverUrl =
        resolvedCover.startsWith('data:') &&
        runningChars + resolvedCover.length > MAX_TOTAL_FIRESTORE_BOOK_CHARS + 120000 &&
        finalPages[0] &&
        !finalPages[0].startsWith('data:image/jpeg')
            ? finalPages[0]
            : resolvedCover;

    const pageTexts = rawPageTexts.length > 0
        ? rawPageTexts.slice(0, Math.max(finalPages.length, rawPageTexts.length)).map((t) => String(t || '').slice(0, 320))
        : bookOutline.length > 0
            ? extractBookOutlinePageTexts(bookOutline).slice(0, finalPages.length)
            : [];

    return {
        ...restBook,
        title,
        description: cleanDescription,
        category: validCat,
        theme,
        customCoverUrl,
        bookPages: finalPages,
        pageTexts,
        bookOutline,
        coverUrl,
        pageCount: Math.max(finalPages.length, Number(book.pageCount) || 0),
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
            customCoverUrl: '',
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

    const rawPages = Array.isArray(item.bookPages) && item.bookPages.length > 0
        ? item.bookPages
        : Array.isArray(item.pages) && item.pages.length > 0
            ? item.pages
            : [];

    const customCoverUrl = String(item.customCoverUrl || '').trim();
    const pages = customCoverUrl && rawPages.length > 0 ? applyCustomCoverToPages(rawPages, customCoverUrl) : rawPages;
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
        customCoverUrl,
        bookPages: pages,
        pageTexts: Array.isArray(item.pageTexts) ? item.pageTexts : [],
        bookOutline,
        coverUrl: customCoverUrl || pages[0] || item.coverUrl || '',
        pageCount: Math.max(pages.length, Number(item.pageCount) || 0),
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
 * Per-user (student or teacher) page bookmarks & reading progress manager.
 * Uses localStorage in the browser with an automatic in-memory fallback for SSR / Node tests.
 */
const memoryBookmarksStore = new Map();

export const resolveBookReaderUserKey = (userOrInput = null) => {
    if (!userOrInput) return 'guest';
    if (typeof userOrInput === 'string') {
        const cleaned = userOrInput
            .trim()
            .toLowerCase()
            .replace(/^@+/, '')
            .replace(/[^a-z0-9_.-]/g, '_');
        return cleaned || 'guest';
    }
    if (typeof userOrInput === 'object') {
        const raw =
            userOrInput.myChatId ||
            userOrInput.userId ||
            userOrInput.uid ||
            userOrInput.email ||
            userOrInput.loggedInName ||
            userOrInput.displayName ||
            userOrInput.role ||
            'guest';
        return resolveBookReaderUserKey(String(raw));
    }
    return 'guest';
};

export const getBookBookmarksStorageKey = (bookId = 'book_default', userOrKey = 'guest') => {
    const cleanBookId = String(bookId || 'book_default')
        .trim()
        .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const cleanUser = resolveBookReaderUserKey(userOrKey);
    return `et_book_bookmarks_v1_${cleanUser}_${cleanBookId}`;
};

const getEffectiveBookmarkStorage = (explicitStorage = null) => {
    if (explicitStorage && typeof explicitStorage.getItem === 'function') {
        return explicitStorage;
    }
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch {
        // Ignore storage security errors
    }
    return null;
};

export const loadUserBookBookmarks = (bookId = 'book_default', userOrKey = 'guest', storage = null) => {
    const key = getBookBookmarksStorageKey(bookId, userOrKey);
    const store = getEffectiveBookmarkStorage(storage);
    let rawJson = null;

    if (store) {
        try {
            rawJson = store.getItem(key);
        } catch {
            rawJson = null;
        }
    }
    if (!rawJson && memoryBookmarksStore.has(key)) {
        rawJson = memoryBookmarksStore.get(key);
    }

    if (!rawJson) {
        return { bookId: String(bookId || 'book_default'), userKey: resolveBookReaderUserKey(userOrKey), bookmarks: [], lastPage: 0, updatedAt: 0 };
    }

    try {
        const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        const rawList = Array.isArray(parsed?.bookmarks) ? parsed.bookmarks : [];
        const bookmarks = Array.from(
            new Set(
                rawList
                    .map((n) => Math.floor(Number(n)))
                    .filter((n) => Number.isFinite(n) && n >= 0)
            )
        ).sort((a, b) => a - b);
        const lastPage = Math.max(0, Math.floor(Number(parsed?.lastPage) || 0));
        return {
            bookId: String(bookId || 'book_default'),
            userKey: resolveBookReaderUserKey(userOrKey),
            bookmarks,
            lastPage,
            updatedAt: Number(parsed?.updatedAt) || 0
        };
    } catch {
        return { bookId: String(bookId || 'book_default'), userKey: resolveBookReaderUserKey(userOrKey), bookmarks: [], lastPage: 0, updatedAt: 0 };
    }
};

export const saveUserBookBookmarks = (
    bookId = 'book_default',
    userOrKey = 'guest',
    state = {},
    storage = null
) => {
    const key = getBookBookmarksStorageKey(bookId, userOrKey);
    const store = getEffectiveBookmarkStorage(storage);
    const rawList = Array.isArray(state?.bookmarks) ? state.bookmarks : [];
    const bookmarks = Array.from(
        new Set(
            rawList
                .map((n) => Math.floor(Number(n)))
                .filter((n) => Number.isFinite(n) && n >= 0)
        )
    ).sort((a, b) => a - b);
    const lastPage = Math.max(0, Math.floor(Number(state?.lastPage) || 0));
    const record = {
        bookId: String(bookId || 'book_default'),
        userKey: resolveBookReaderUserKey(userOrKey),
        bookmarks,
        lastPage,
        updatedAt: Date.now()
    };
    const serialized = JSON.stringify(record);
    memoryBookmarksStore.set(key, serialized);
    if (store && typeof store.setItem === 'function') {
        try {
            store.setItem(key, serialized);
        } catch {
            // Ignore quota errors
        }
    }
    return record;
};

export const toggleUserBookBookmark = (
    bookId = 'book_default',
    userOrKey = 'guest',
    pageIndex = 0,
    { totalPages = 999, storage = null } = {}
) => {
    const maxIdx = Math.max(0, (Number(totalPages) || 999) - 1);
    const safePage = Math.min(Math.max(0, Math.floor(Number(pageIndex) || 0)), maxIdx);
    const current = loadUserBookBookmarks(bookId, userOrKey, storage);
    const exists = current.bookmarks.includes(safePage);
    const nextBookmarks = exists
        ? current.bookmarks.filter((p) => p !== safePage)
        : [...current.bookmarks, safePage].sort((a, b) => a - b);

    const saved = saveUserBookBookmarks(
        bookId,
        userOrKey,
        {
            bookmarks: nextBookmarks,
            lastPage: current.lastPage
        },
        storage
    );

    return {
        ...saved,
        isBookmarked: !exists,
        toggledPage: safePage
    };
};

export const saveUserBookLastPage = (
    bookId = 'book_default',
    userOrKey = 'guest',
    pageIndex = 0,
    { totalPages = 999, storage = null } = {}
) => {
    const maxIdx = Math.max(0, (Number(totalPages) || 999) - 1);
    const safePage = Math.min(Math.max(0, Math.floor(Number(pageIndex) || 0)), maxIdx);
    const current = loadUserBookBookmarks(bookId, userOrKey, storage);
    return saveUserBookBookmarks(
        bookId,
        userOrKey,
        {
            bookmarks: current.bookmarks,
            lastPage: safePage
        },
        storage
    );
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

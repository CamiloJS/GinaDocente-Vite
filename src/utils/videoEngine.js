// src/utils/videoEngine.js
// Motor de parseo, normalización, incrustación y utilidades de vídeos
// Soporta YouTube (videos y shorts), TikTok, pCloud, File Garden, Google Drive, Dropbox, Vimeo y archivos directos (.mp4, .webm, etc.)

/**
 * Normaliza y analiza una URL de vídeo para determinar su plataforma, tipo de reproductor,
 * URL de incrustación (embedUrl), thumbnail y formato sugerido ('long' o 'short').
 * 
 * @param {string} rawUrl - URL ingresada por el docente o estudiante
 * @returns {object} Información estructurada del vídeo
 */
export function parseVideoUrl(rawUrl = '') {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return {
      isValid: false,
      platform: 'unknown',
      playerType: 'unknown',
      embedUrl: '',
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: ''
    };
  }

  // 1. YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID o https://youtube.com/shorts/VIDEO_ID
  const ytShortsMatch = url.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShortsMatch) {
    const videoId = ytShortsMatch[1];
    return {
      isValid: true,
      platform: 'youtube',
      playerType: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      suggestedFormat: 'short',
      originalUrl: url
    };
  }

  // 2. YouTube Estándar: watch?v=VIDEO_ID, youtu.be/VIDEO_ID, embed/VIDEO_ID
  const ytStandardMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytStandardMatch) {
    const videoId = ytStandardMatch[1];
    return {
      isValid: true,
      platform: 'youtube',
      playerType: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 3. TikTok: https://www.tiktok.com/@user/video/VIDEO_ID o https://vm.tiktok.com/...
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/(\d+)|v\/(\d+)|([\w-]+))/i);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1] || tiktokMatch[2] || '';
    // TikTok embed player
    const embedUrl = videoId
      ? `https://www.tiktok.com/embed/v2/${videoId}`
      : url;
    return {
      isValid: true,
      platform: 'tiktok',
      playerType: 'tiktok',
      videoId,
      embedUrl,
      thumbnailUrl: '',
      suggestedFormat: 'short',
      originalUrl: url
    };
  }

  // 4. Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      isValid: true,
      platform: 'vimeo',
      playerType: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 5. pCloud: https://u.pcloud.link/publink/show?code=...
  if (url.includes('pcloud.link') || url.includes('pcloud.com')) {
    // Si es un enlace de publink, se puede transformar o reproducir directamente
    let streamUrl = url;
    if (url.includes('/publink/show?code=')) {
      // Reemplazar show con getpublinkdownload o reproducir el reproductor incrustado
      streamUrl = url.replace('/publink/show?', '/publink/show?');
    }
    return {
      isValid: true,
      platform: 'pcloud',
      playerType: 'pcloud',
      embedUrl: streamUrl,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 6. File Garden: https://filegarden.com/...
  if (url.includes('filegarden.com')) {
    return {
      isValid: true,
      platform: 'filegarden',
      playerType: 'direct',
      embedUrl: url,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 7. Google Drive: https://drive.google.com/file/d/FILE_ID/view...
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    return {
      isValid: true,
      platform: 'gdrive',
      playerType: 'iframe',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 8. Dropbox: https://www.dropbox.com/s/.../video.mp4?dl=0
  if (url.includes('dropbox.com')) {
    const directUrl = url.replace(/dl=0/g, 'raw=1').replace(/\?dl=1/g, '?raw=1');
    const isRaw = directUrl.includes('raw=1') ? directUrl : `${directUrl}${directUrl.includes('?') ? '&' : '?'}raw=1`;
    return {
      isValid: true,
      platform: 'dropbox',
      playerType: 'direct',
      embedUrl: isRaw,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 9. Archivos directos (.mp4, .webm, .ogg, .mov, .m4v, .m3u8)
  const isDirectFile = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
  if (isDirectFile) {
    return {
      isValid: true,
      platform: 'direct',
      playerType: 'direct',
      embedUrl: url,
      thumbnailUrl: '',
      suggestedFormat: 'long',
      originalUrl: url
    };
  }

  // 10. Fallback genérico para cualquier otra URL web
  const hasHttp = /^https?:\/\//i.test(url);
  return {
    isValid: hasHttp,
    platform: 'generic',
    playerType: 'generic',
    embedUrl: url,
    thumbnailUrl: '',
    suggestedFormat: 'long',
    originalUrl: url
  };
}

/**
 * Normaliza y asegura que un objeto de vídeo tenga todos los campos requeridos
 * para mostrarse de forma minimalista, robusta y sin fallos.
 */
export function normalizeVideoItem(raw = {}) {
  const parsed = parseVideoUrl(raw.url || raw.videoUrl || '');
  const now = Date.now();
  
  const format = raw.format === 'short' || raw.format === 'vertical' || parsed.suggestedFormat === 'short'
    ? 'short'
    : 'long';

  const title = String(raw.title || '').trim() || 'Vídeo de clase';
  const description = String(raw.description || '').trim();
  const className = String(raw.className || raw.targetGroupName || raw.subject || 'Inglés Técnico').trim();
  const classId = String(raw.classId || raw.targetGroupId || 'all').trim();

  // Reacciones
  const likes = Array.isArray(raw.likes)
    ? raw.likes
    : Array.isArray(raw.likedBy)
      ? raw.likedBy
      : [];

  // Comentarios
  const comments = Array.isArray(raw.comments)
    ? raw.comments.map(c => ({
        id: String(c.id || `c_${Math.random().toString(36).substring(2, 9)}`),
        userId: String(c.userId || c.authorId || ''),
        userName: String(c.userName || c.authorName || 'Usuario'),
        userRole: String(c.userRole || c.role || 'student'),
        userAvatar: String(c.userAvatar || ''),
        text: String(c.text || '').trim(),
        createdAt: Number(c.createdAt) || now
      }))
    : [];

  return {
    id: String(raw.id || `vid_${now}_${Math.random().toString(36).substring(2, 7)}`),
    url: parsed.originalUrl || String(raw.url || ''),
    embedUrl: parsed.embedUrl || String(raw.embedUrl || raw.url || ''),
    thumbnailUrl: raw.thumbnailUrl || parsed.thumbnailUrl || '',
    platform: parsed.platform || raw.platform || 'direct',
    playerType: parsed.playerType || raw.playerType || 'direct',
    videoId: parsed.videoId || raw.videoId || '',
    format,
    title,
    description,
    className,
    classId,
    authorId: String(raw.authorId || raw.userId || raw.createdBy || ''),
    authorName: String(raw.authorName || raw.userName || 'Docente').trim(),
    authorRole: String(raw.authorRole || raw.role || 'teacher'),
    authorAvatar: String(raw.authorAvatar || ''),
    likes,
    comments,
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt || raw.createdAt) || now,
    isDemoCreated: Boolean(raw.isDemoCreated)
  };
}

/**
 * Deduplica un array de vídeos por su identificador único (id),
 * conservando la versión más reciente si hay colisión y preservando el orden.
 */
export function deduplicateVideos(videosList = []) {
  if (!Array.isArray(videosList)) return [];
  const map = new Map();
  for (const v of videosList) {
    if (!v) continue;
    const key = String(v.id || '').trim();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, v);
    } else {
      const existing = map.get(key);
      const existingTs = Number(existing.updatedAt || existing.createdAt || 0);
      const currentTs = Number(v.updatedAt || v.createdAt || 0);
      if (currentTs >= existingTs) {
        map.set(key, { ...existing, ...v });
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Lista inicial de vídeos de demostración de alta calidad para English TECH.
 * Incluye tanto videos en formato largo (16:9) como formatos cortos tipo TikTok / Shorts.
 */
export const DEMO_VIDEOS = [
  normalizeVideoItem({
    id: 'demo_vid_long_1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Estructura de Presentaciones Técnicas y Oratoria en Inglés',
    description: 'Guía esencial para ingenieros y economistas sobre cómo iniciar, conectar puntos clave y formular conclusiones persuasivas en una sustentación profesional.',
    className: 'Inglés Técnico Económico',
    classId: 'demo-group-ing-econ-1',
    authorName: 'Gina Marcela Quintana Delgado',
    authorRole: 'teacher',
    authorAvatar: '/icono.png',
    format: 'long',
    likes: ['demo-student-1', 'demo-student-2', 'demo-student-3'],
    comments: [
      {
        id: 'comm_d1_1',
        userId: 'demo-student-1',
        userName: 'Carlos Andrés Vega',
        userRole: 'student',
        text: 'Excelente material profesora Gina. Los conectores lógicos para la sustentación final quedaron muy claros.',
        createdAt: Date.now() - 86400000 * 2
      }
    ],
    createdAt: Date.now() - 86400000 * 3
  }),
  normalizeVideoItem({
    id: 'demo_vid_short_1',
    url: 'https://www.youtube.com/shorts/5O9nF7iW8_g',
    title: 'Tips de pronunciación: Palabras clave en Business & Engineering',
    description: 'Aprende en 45 segundos la diferencia exacta de acentuación entre "analysis", "hypothesize" y "determine" con este ejercicio rápido de repetición.',
    className: 'Inglés Técnico I',
    classId: 'demo-group-ing-tec-1',
    authorName: 'Gina Marcela Quintana Delgado',
    authorRole: 'teacher',
    authorAvatar: '/icono.png',
    format: 'short',
    likes: ['demo-student-1', 'demo-student-4', 'demo-student-5', 'demo-student-6'],
    comments: [
      {
        id: 'comm_d2_1',
        userId: 'demo-student-2',
        userName: 'Valentina Mendoza',
        userRole: 'student',
        text: '¡Súper útil este formato corto para repasar antes de entrar al parcial!',
        createdAt: Date.now() - 3600000 * 5
      }
    ],
    createdAt: Date.now() - 86400000
  }),
  normalizeVideoItem({
    id: 'demo_vid_long_2',
    url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    title: 'Vocabulario Técnico: Costos, Flujo de Caja y Métricas Financieras',
    description: 'Sesión explicativa sobre la terminología de estados financieros: Cash Flow, ROI, EBITDA y Break-even Analysis explicados con casos reales.',
    className: 'Inglés Técnico Económico',
    classId: 'demo-group-ing-econ-1',
    authorName: 'Gina Marcela Quintana Delgado',
    authorRole: 'teacher',
    authorAvatar: '/icono.png',
    format: 'long',
    likes: ['demo-student-2', 'demo-student-7'],
    comments: [],
    createdAt: Date.now() - 86400000 * 5
  }),
  normalizeVideoItem({
    id: 'demo_vid_short_2',
    url: 'https://www.youtube.com/shorts/3jz_K3E8z_A',
    title: '5 Verbos Frasales (Phrasal Verbs) para tus Reportes de Ingeniería',
    description: 'Descubre cómo usar carry out, break down, point out, figure out y rule out en tus informes de laboratorio.',
    className: 'Inglés Técnico I',
    classId: 'demo-group-ing-tec-1',
    authorName: 'Camilo Estudiante',
    authorRole: 'student',
    authorAvatar: '',
    format: 'short',
    likes: ['teacher-gina', 'demo-student-1', 'demo-student-3'],
    comments: [
      {
        id: 'comm_d4_1',
        userId: 'teacher-gina',
        userName: 'Gina Marcela Quintana Delgado',
        userRole: 'teacher',
        text: '¡Muy buen aporte Camilo! Excelente iniciativa compartiendo material con tus compañeros.',
        createdAt: Date.now() - 3600000 * 2
      }
    ],
    createdAt: Date.now() - 3600000 * 12
  })
];

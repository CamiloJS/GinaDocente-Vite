// src/utils/helpers.js
// Constantes globales y funciones de utilidad (migrado del HTML original)

import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, appId } from '../firebase/config.js'
import { autoOptimizeFile, compressImageSilently } from './fileCompressor.js'

// --- Constantes globales ---
export const BAD_WORDS = [
  'puta', 'putas', 'puto', 'putos', 'mierda', 'mierdas', 'pendejo', 'pendejos', 'pendeja', 'pendejas',
  'idiota', 'idiotas', 'estupido', 'estupidos', 'estupida', 'estupidas', 'imbecil', 'imbeciles',
  'maricon', 'maricones', 'marica', 'maricas', 'zorra', 'zorras', 'culo', 'culos', 'coño', 'joder',
  'gilipollas', 'pendejadas', 'guevon', 'huevon', 'guevones', 'huevones', 'mariconada', 'putazo',
  'vagabunda', 'bagabunda', 'vagabundas', 'basura', 'perra', 'perras',
  'malparido', 'malparidos', 'malparida', 'gonorrea', 'gonorreas', 'hijueputa', 'hijueputas',
  'hijuputa', 'carechimba', 'pirobo', 'pirobos', 'cacorro', 'bazuquero', 'sapo', 'sapa', 'picha',
  'chingar', 'chingue', 'chinga', 'chingada', 'chingazo', 'chingaderas', 'pinche', 'pinches',
  'cabron', 'cabrones', 'cabrona', 'culero', 'culeros', 'culera', 'verga', 'vergas', 'pito',
  'panocha', 'joto', 'jotos', 'puñetas', 'putiza', 'mamada', 'vergazos', 'putear', 'chupala',
  'mamaguevo', 'mamabicho', 'comemierda',
]

export const REACTION_EMOJIS = { like: '👍', love: '❤️', sad: '😢', happy: '😃', wow: '😲' }
export const COMMENT_EMOJIS = ['😀', '😂', '🥰', '😎', '👍', '🙏', '❤️', '🔥', '✨', '🤔']

export const SLIDE_GRADIENTS = [
  'from-blue-400/40 to-indigo-500/40',
  'from-emerald-400/40 to-teal-500/40',
  'from-rose-400/40 to-orange-500/40',
  'from-purple-400/40 to-pink-500/40',
  'from-amber-400/40 to-red-500/40',
  'from-cyan-400/40 to-blue-500/40',
]

export const CHAT_GRADIENTS = [
  '', // Por defecto
  ...SLIDE_GRADIENTS,
  'from-fuchsia-500/40 to-pink-500/40', // Rosa / Fucsia
  'from-violet-500/40 to-fuchsia-500/40',
]

export const CHAT_PATTERNS = [
  { id: 'none', name: 'Ninguno', style: {} },
  { id: 'dots', name: 'Puntos', style: { backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' } },
  { id: 'grid', name: 'Cuadrícula', style: { backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' } },
  { id: 'diagonal', name: 'Rayas', style: { backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' } },
  { id: 'boxes', name: 'Cajas', style: { backgroundImage: 'linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' } },
]

export const TEACHER_NAME = 'Gina Marcela Quintana Delgado'

export const splitNameFirstAndLast = (fullName) => {
  if (!fullName) return { first: '', last: '' }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  if (parts.length === 2) return { first: parts[0], last: parts[1] }
  if (parts.length === 3) return { first: parts[0], last: `${parts[1]} ${parts[2]}` }
  // 4 o más palabras (ej: Gina Marcela Quintana Delgado -> First: Gina Marcela, Last: Quintana Delgado)
  const first = parts.slice(0, parts.length - 2).join(' ')
  const last = parts.slice(-2).join(' ')
  return { first, last }
}

export const FALLBACK_MAP = {
  ginadocente: { email: 'ginamarcelaquintana19@gmail.com', name: 'La profe', fullName: 'Gina Marcela Quintana Delgado', role: 'teacher', profilePicUrl: '/icono.png' },
  teacher: { email: 'ginamarcelaquintana19@gmail.com', name: 'La profe', fullName: 'Gina Marcela Quintana Delgado', role: 'teacher', profilePicUrl: '/icono.png' },
}

// --- Funciones de utilidad ---
export const compressImage = async (file, maxWidth = 2048, maxHeight = 2048, quality = 0.85) => {
  if (!file) return null;
  // Si es un GIF animado, preservar los fotogramas y la animación intacta sin pasar por canvas
  if (file.type === 'image/gif' || file.name?.toLowerCase().endsWith('.gif')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // Compresión sutil de alta resolución (máx 10 MB, resolución nítida)
  const optimizedFile = await compressImageSilently(file, Math.max(maxWidth, 2048), quality);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(optimizedFile);
  });
};

export const uploadImageToStorage = async (fileOrBase64, folderName) => {
  if (!fileOrBase64) return '';
  if (typeof fileOrBase64 !== 'string') {
    return await uploadRawFileToStorage(fileOrBase64, folderName);
  }
  // Generamos un nombre único según el formato (soporte completo para GIFs animados)
  const isGif = fileOrBase64.startsWith('data:image/gif');
  const ext = isGif ? 'gif' : 'jpg';
  const fileName = `${appId}/${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
  const storageRef = ref(storage, fileName)

  // Subimos el string Base64 directamente a Storage
  await uploadString(storageRef, fileOrBase64, 'data_url')

  // Obtenemos y retornamos la URL publica
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}

export const uploadRawFileToStorage = async (file, folderName) => {
  if (!file) return "";
  // Optimización silenciosa y transparente (fotos <= 10MB, documentos <= 30MB)
  const optimized = await autoOptimizeFile(file);
  const safeName = ((optimized && optimized.name) || (file && file.name) || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
  const fileName = `${appId}/${folderName}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, fileName)
  await uploadBytes(storageRef, optimized)
  return await getDownloadURL(storageRef)
}

export const containsBadWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  let normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const leetMap = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '7': 't', '8': 'b', '$': 's' }
  normalizedText = normalizedText.replace(/[4@31!0578$]/g, (m) => leetMap[m] || m)
  return BAD_WORDS.some((word) => {
    const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const regexStr = normalizedWord.split('').map((char) => `${char}+`).join('')
    const regex = new RegExp(`\\b${regexStr}\\b`, 'i')
    return regex.test(normalizedText)
  })
}

// Filtro de contenido en backend (Vercel /api/filter) con fallback local
export const checkBadWordsAsync = async (text) => {
  try {
    const res = await fetch('/api/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text || '' }),
    })
    if (res.ok) {
      const data = await res.json()
      return !!data.hasBadWords
    }
  } catch (err) {}
  // Fallback local si la API no responde (nunca perder el filtro)
  return containsBadWords(text)
}

export const formatChatDate = (timestamp) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = (total % 60).toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  }
  return `${m.toString().padStart(2, '0')}:${s}`;
};

// Formato de hora en 12 horas con AM / PM (ej: "14:30" -> "2:30 PM", timestamp -> "2:30 PM")
export const format12HourTime = (timeInput) => {
  if (!timeInput && timeInput !== 0) return '';
  
  // Si es un string de formato "HH:mm" o "HH:mm:ss"
  if (typeof timeInput === 'string' && timeInput.includes(':') && !timeInput.includes('T') && !timeInput.includes('-') && !timeInput.includes('/')) {
    const parts = timeInput.trim().split(':');
    let h = parseInt(parts[0], 10);
    const m = (parts[1] || '00').substring(0, 2);
    if (isNaN(h)) return timeInput;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m}\u00A0${ampm}`;
  }

  // Si es un timestamp numérico o string parseable de fecha
  try {
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return String(timeInput);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m}\u00A0${ampm}`;
  } catch (e) {
    return String(timeInput);
  }
};

// Formato amigable de fecha y hora en 12h (ej: "17 ago, 2:30 PM" o "17 ago • 2:30 PM")
export const formatDateTime12H = (timestamp) => {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const timeStr = format12HourTime(d);
    return `${dateStr} • ${timeStr}`;
  } catch (e) {
    return '';
  }
};

// Fecha relativa en español (ej: "Justo ahora", "Hace 5 min")
export const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const diffMs = Date.now() - Number(timestamp)
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Justo ahora'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Hace ${diffD} d`
  const d = new Date(Number(timestamp))
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export const cleanTextForTTS = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // 1. Quitar enlaces URL
    .replace(/https?:\/\/[^\s]+/gi, '')
    // 2. Quitar etiquetas BBCode de color y formato
    .replace(/\[color=[^\]]*\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\[highlight\]/gi, '')
    .replace(/\[\/highlight\]/gi, '')
    .replace(/\[\/?[a-z0-9_-]+(?:=[^\]]*)?\]/gi, '')
    // 3. Quitar etiquetas HTML (<b...>, <span...>, <mark...>)
    .replace(/<[^>]+>/g, '')
    // 4. Quitar encabezados o viñetas al inicio de línea
    .replace(/^([#>*\-\s]+)/gm, '')
    // 5. Quitar marcadores de Markdown inline (negrita, cursiva, tachado, resaltado)
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/==([\s\S]+?)==/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/_([^_\n]+?)_/g, '$1')
    .replace(/`([^`]+?)`/g, '$1')
    .replace(/[*_~=`#]/g, '')
    // 6. Quitar emojis para evitar descripciones robóticas habladas
    .replace(/(?:[\u2700-\u27bf]|(?:[\ud83c\udde6-\ud83c\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|[\u2934-\u2935]|[\u25aa-\u25ab]|[\u25b6|\u25c0]|[\u25fb-\u25fe]|[\u2600-\u26ff]|[\u2b05-\u2b07]|[\u2b1b-\u2b1c]|\u2b50|\u2b55|[\u2300-\u23ff]|[\u200d\ufe0f\ufe0e])+/gu, '')
    // 7. Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim();
};

export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'es-MX';
  const clean = text.toLowerCase();
  
  // Patrones característicos de francés
  const frenchMatches = (clean.match(/\b(bonjour|salut|merci|oui|non|avec|pour|dans|sur|nous|vous|ils|elles|mon|ma|mes|ton|ta|tes|son|sa|ses|le|la|les|un|une|des|du|au|aux|est|sont|c'est|j'ai|je|tu|il|elle|on|français|très|bien|aussi|cours|devoir|étudiant|parler|écouter|lire|écrire|professeur)\b/gi) || []).length;
  
  // Patrones característicos de español
  const spanishMatches = (clean.match(/\b(el|la|los|las|un|una|unos|unas|para|por|con|de|en|sobre|entre|como|pero|más|muy|está|están|hola|gracias|tarea|actividad|clase|profesor|profesora|estudiante|entrega|fecha|asignación|repaso|pregunta|respuesta|adjunto|adjunta|saludos|atentamente|docente|universidad|bienvenidos|bienvenida|periodo)\b|[áéíóúñ¿¡]/gi) || []).length;
  
  // Patrones característicos de inglés
  const englishMatches = (clean.match(/\b(the|is|are|was|were|to|and|in|on|at|for|with|this|that|these|those|have|has|had|will|would|can|could|should|task|homework|lesson|unit|student|teacher|class|grade|submit|reading|writing|speaking|listen|welcome|dear|regards|attached|due|date|time)\b/gi) || []).length;

  if (frenchMatches > 2 && frenchMatches > spanishMatches && frenchMatches > englishMatches) {
    return 'fr-FR';
  }
  
  if (spanishMatches >= englishMatches && spanishMatches > 0) {
    return 'es-MX';
  }

  // Si predomina inglés
  if (englishMatches > 0) {
    return 'en-US';
  }

  // Por defecto español mexicano
  return 'es-MX';
};

export const selectBestFemaleVoice = (voices, lang = 'es-MX') => {
  if (!voices || voices.length === 0) return null;
  const langPrefix = lang.split('-')[0].toLowerCase();
  
  const normalizedVoices = voices.map(v => ({
    voice: v,
    name: v.name.toLowerCase(),
    lang: v.lang.replace('_', '-').toLowerCase()
  }));

  // 1. ESPAÑOL: Voz femenina fija con acento Mexicano (Dalia, Sabina, Paulina, etc.)
  if (langPrefix === 'es') {
    const priorityMexico = [
      'microsoft dalia online (natural) - spanish (mexico)',
      'microsoft dalia',
      'microsoft sabina',
      'microsoft paulina',
      'google español (méxico)',
      'google español de estados unidos',
      'paulina (es-mx)',
      'dalia',
      'sabina',
      'paulina',
      'paloma',
      'soledad',
      'jimena'
    ];

    for (const name of priorityMexico) {
      const match = normalizedVoices.find(v => (v.lang.includes('mx') || v.name.includes('mexic')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const mexicanFemale = normalizedVoices.find(v => (v.lang.includes('mx') || v.name.includes('mexic')) && (
      /dalia|sabina|paulina|paloma|soledad|jimena|monica|mónica|sofia|elena|female|mujer|natural/i.test(v.name)
    ));
    if (mexicanFemale) return mexicanFemale.voice;

    const latinFemale = normalizedVoices.find(v => v.lang.startsWith('es') && (
      /dalia|sabina|paulina|paloma|soledad|jimena|luciana|sofia|elena|laura|monica|mónica|camila|female|mujer|natural/i.test(v.name)
    ));
    if (latinFemale) return latinFemale.voice;

    const googleEs = normalizedVoices.find(v => v.lang.startsWith('es') && v.name.includes('google'));
    if (googleEs) return googleEs.voice;

    const anyEsMx = normalizedVoices.find(v => v.lang.includes('mx'));
    if (anyEsMx) return anyEsMx.voice;
    const anyEs = normalizedVoices.find(v => v.lang.startsWith('es'));
    if (anyEs) return anyEs.voice;
  }

  // 2. INGLÉS: Voz femenina fija con acento Americano (USA) (Jenny, Aria, Zira, Samantha, etc.)
  if (langPrefix === 'en') {
    const priorityUS = [
      'microsoft jenny online (natural) - english (united states)',
      'microsoft aria online (natural) - english (united states)',
      'microsoft jenny',
      'microsoft aria',
      'microsoft zira',
      'google us english',
      'samantha (en-us)',
      'ava (en-us)',
      'allison (en-us)',
      'jenny',
      'aria',
      'zira',
      'samantha',
      'ava',
      'allison',
      'victoria'
    ];

    for (const name of priorityUS) {
      const match = normalizedVoices.find(v => (v.lang.includes('us') || v.name.includes('united states')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const usFemale = normalizedVoices.find(v => (v.lang.includes('us') || v.name.includes('united states')) && (
      /jenny|aria|zira|samantha|ava|allison|victoria|karen|libby|female|woman|natural/i.test(v.name)
    ));
    if (usFemale) return usFemale.voice;

    const googleEn = normalizedVoices.find(v => v.lang.startsWith('en') && v.name.includes('google'));
    if (googleEn) return googleEn.voice;

    const anyEnUS = normalizedVoices.find(v => v.lang.includes('us'));
    if (anyEnUS) return anyEnUS.voice;
    const anyEn = normalizedVoices.find(v => v.lang.startsWith('en'));
    if (anyEn) return anyEn.voice;
  }

  // 3. FRANCÉS: Voz femenina fija con acento Francés de Francia (Denise, Brigitte, Julie, Amélie, etc.)
  if (langPrefix === 'fr') {
    const priorityFrance = [
      'microsoft denise online (natural) - french (france)',
      'microsoft brigitte online (natural) - french (france)',
      'microsoft denise',
      'microsoft brigitte',
      'microsoft julie',
      'microsoft hortense',
      'google français',
      'amélie (fr-fr)',
      'chantal (fr-fr)',
      'marie (fr-fr)',
      'denise',
      'brigitte',
      'julie',
      'hortense',
      'amelie',
      'amélie',
      'aurelie',
      'aurélie',
      'chantal',
      'celeste',
      'céleste',
      'marie'
    ];

    for (const name of priorityFrance) {
      const match = normalizedVoices.find(v => (v.lang.includes('fr') || v.name.includes('france')) && v.name.includes(name));
      if (match) return match.voice;
    }

    const frFemale = normalizedVoices.find(v => (v.lang.includes('fr') || v.name.includes('france')) && (
      /denise|brigitte|julie|hortense|amelie|amélie|aurelie|aurélie|chantal|celeste|céleste|marie|female|femme|natural/i.test(v.name)
    ));
    if (frFemale) return frFemale.voice;

    const googleFr = normalizedVoices.find(v => v.lang.startsWith('fr') && v.name.includes('google'));
    if (googleFr) return googleFr.voice;

    const anyFrFR = normalizedVoices.find(v => v.lang.includes('fr'));
    if (anyFrFR) return anyFrFR.voice;
  }

  // Fallback
  const fallback = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix));
  return fallback || voices[0];
};

export const speakText = (text) => {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    
    // Limpieza profunda del texto antes de la síntesis de voz
    const cleanText = cleanTextForTTS(text);
    if (!cleanText) return;

    const lang = detectLanguage(cleanText);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.92;
    utterance.pitch = 1.05; // Tono femenino natural

    const doSpeak = (availableVoices) => {
      if (availableVoices && availableVoices.length > 0) {
        const bestFemaleVoice = selectBestFemaleVoice(availableVoices, lang);
        if (bestFemaleVoice) {
          utterance.voice = bestFemaleVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    };

    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices && currentVoices.length > 0) {
      doSpeak(currentVoices);
    } else {
      let spoken = false;
      window.speechSynthesis.onvoiceschanged = () => {
        if (spoken) return;
        spoken = true;
        try { window.speechSynthesis.onvoiceschanged = null; } catch(e) {}
        const loadedVoices = window.speechSynthesis.getVoices();
        doSpeak(loadedVoices);
      };
      setTimeout(() => {
        if (!spoken && !window.speechSynthesis.speaking) {
          spoken = true;
          try { window.speechSynthesis.onvoiceschanged = null; } catch(e) {}
          const fallbackVoices = window.speechSynthesis.getVoices();
          doSpeak(fallbackVoices);
        }
      }, 250);
    }
  } catch (e) {
    console.error('TTS error:', e);
  }
};


// src/utils/helpers.js
// Constantes globales y funciones de utilidad (migrado del HTML original)

import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, appId } from '../firebase/config.js'

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
  if (parts.length <= 1) return { first: fullName, last: '' }
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
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    // Si es un GIF animado, preservar los fotogramas y la animación intacta sin pasar por canvas
    if (file.type === 'image/gif' || file.name?.toLowerCase().endsWith('.gif')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const isPng = file.type === 'image/png' || file.name?.toLowerCase().endsWith('.png');
    const outputFormat = isPng ? 'image/png' : 'image/jpeg';
    const outputQuality = isPng ? undefined : quality;

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (isPng) {
          ctx.clearRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(outputFormat, outputQuality))
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

export const uploadImageToStorage = async (base64String, folderName) => {
  // Generamos un nombre único según el formato (soporte completo para GIFs animados)
  const isGif = base64String.startsWith('data:image/gif');
  const ext = isGif ? 'gif' : 'jpg';
  const fileName = `${appId}/${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
  const storageRef = ref(storage, fileName)

  // Subimos el string Base64 directamente a Storage
  await uploadString(storageRef, base64String, 'data_url')

  // Obtenemos y retornamos la URL publica
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}

export const uploadRawFileToStorage = async (file, folderName) => {
  const fileName = `${appId}/${folderName}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
  const storageRef = ref(storage, fileName)
  await uploadBytes(storageRef, file)
  return await getDownloadURL(storageRef)
}

export const containsBadWords = (text) => {
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
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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

export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en-US';
  const clean = text.toLowerCase();
  
  // Patrones característicos de francés
  const frenchMatches = (clean.match(/\b(bonjour|salut|merci|oui|non|avec|pour|dans|sur|nous|vous|ils|elles|mon|ma|mes|ton|ta|tes|son|sa|ses|le|la|les|un|une|des|du|au|aux|est|sont|c'est|j'ai|je|tu|il|elle|on|français|très|bien|aussi|cours|devoir|étudiant|parler|écouter|lire|écrire|professeur)\b|[éèêëàâîïôùûçœæ]/gi) || []).length;
  
  // Patrones característicos de español
  const spanishMatches = (clean.match(/\b(el|la|los|las|un|una|unos|unas|para|por|con|de|en|sobre|entre|como|pero|más|muy|está|están|hola|gracias|tarea|actividad|clase|profesor|profesora|estudiante|entrega|fecha|asignación|repaso|pregunta|respuesta)\b|[áéíóúñ¿¡]/gi) || []).length;
  
  // Patrones característicos de inglés
  const englishMatches = (clean.match(/\b(the|is|are|was|were|to|and|in|on|at|for|with|this|that|these|those|have|has|had|will|would|can|could|should|task|homework|lesson|unit|student|teacher|class|grade|submit|reading|writing|speaking|listen)\b/gi) || []).length;

  if (frenchMatches > 2 || (frenchMatches > 0 && frenchMatches > englishMatches && frenchMatches > spanishMatches)) {
    return 'fr-FR';
  }
  
  if (spanishMatches > englishMatches && spanishMatches > 0) {
    return 'es-ES';
  }

  // Por defecto inglés
  return 'en-US';
};

export const speakText = (text) => {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    
    // Limpiar etiquetas o URLs del texto antes de leer
    const cleanText = text.replace(/https?:\/\/[^\s]+/g, '').replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    const lang = detectLanguage(cleanText);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const langPrefix = lang.split('-')[0];
      const matchVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase())) ||
                         voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix.toLowerCase()));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('TTS error:', e);
  }
};


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

export const FALLBACK_MAP = {
  ginadocente: { email: 'ginamarcelaquintana19@gmail.com', name: 'La profe', role: 'teacher' },
}

// --- Funciones de utilidad ---
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
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
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

export const uploadImageToStorage = async (base64String, folderName) => {
  // Generamos un nombre unico para que las imagenes no se sobreescriban
  const fileName = `${appId}/${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`
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
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

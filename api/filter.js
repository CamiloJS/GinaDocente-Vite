// api/filter.js — Serverless Function: filtro de contenido (malas palabras)
// Recibe POST { text: "..." } y devuelve { hasBadWords: true/false }

const BAD_WORDS = [
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

function normalize(text) {
  let t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const leetMap = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '7': 't', '8': 'b', '$': 's' }
  t = t.replace(/[4@31!0578$]/g, (m) => leetMap[m] || m)
  return t
}

function containsBadWords(text) {
  const normalizedText = normalize(text || '')
  return BAD_WORDS.some((word) => {
    const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const regexStr = normalizedWord.split('').map((char) => `${char}+`).join('')
    const regex = new RegExp(`\\b${regexStr}\\b`, 'i')
    return regex.test(normalizedText)
  })
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  const { text } = req.body || {}
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Campo "text" requerido' })
  }
  try {
    return res.status(200).json({ hasBadWords: containsBadWords(text) })
  } catch (err) {
    return res.status(500).json({ error: 'Error en el filtro' })
  }
}

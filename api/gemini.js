// api/gemini.js - Multi-Provider Fallback AI Handler (Gemini + Groq)

// --- Control de acceso: solo usuarios de la app (token de Firebase) + limite por usuario ---
// La llave web de Firebase es publica por diseno (va en el cliente).
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyB-BDGpMhiNjSfGiGiGHHd6jbu5nQvoOfs';
const LIMITE_PETICIONES = 60; // por usuario
const VENTANA_MS = 5 * 60 * 1000; // 5 minutos
const registro = new Map(); // uid -> { n, reset }

async function verificarUsuario(req) {
  const cabecera = req.headers?.authorization || req.headers?.Authorization || '';
  const token = String(cabecera).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    const j = await r.json();
    const u = j && Array.isArray(j.users) ? j.users[0] : null;
    return u && u.localId ? { uid: u.localId } : null;
  } catch (e) {
    return null;
  }
}

function dentroDelLimite(uid) {
  const ahora = Date.now();
  const reg = registro.get(uid);
  if (!reg || ahora > reg.reset) {
    registro.set(uid, { n: 1, reset: ahora + VENTANA_MS });
    return true;
  }
  reg.n += 1;
  return reg.n <= LIMITE_PETICIONES;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // --- Solo usuarios autenticados de la app pueden usar la IA ---
  const usuario = await verificarUsuario(req);
  if (!usuario) {
    return res.status(401).json({ error: 'Inicia sesión en la aplicación para usar la IA.' });
  }
  if (!dentroDelLimite(usuario.uid)) {
    return res.status(429).json({
      error: 'Muchas solicitudes seguidas. Espera unos minutos e inténtalo de nuevo.',
      isQuotaExceeded: true,
    });
  }

  const { promptText, contents, model } = req.body || {};

  // 1. Google Gemini Keys (Prioridad 1 y Prioridad 2)
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].filter(Boolean);

  // 2. Groq Key (Prioridad 3 - Último recurso)
  const groqApiKey = process.env.GROQ_API_KEY;

  if (geminiKeys.length === 0 && !groqApiKey) {
    return res.status(500).json({ error: 'Falta configurar al menos una API Key de IA (GEMINI_API_KEY o GROQ_API_KEY).' });
  }

  const payloadContents = contents || [{ parts: [{ text: promptText || '' }] }];

  // Modelos de Gemini por orden de preferencia y compatibilidad
  const geminiModels = model 
    ? [model, 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
    : ['gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

  let lastStatus = 500;
  let isQuota = false;

  // --- INTENTO CON PROVEEDOR 1: GOOGLE GEMINI (Multi-Key + Multi-Model) ---
  for (let keyIndex = 0; keyIndex < geminiKeys.length; keyIndex++) {
    const currentKey = geminiKeys[keyIndex];

    for (const modelName of geminiModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: payloadContents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json({ 
            ...data, 
            _provider: 'gemini', 
            _keyIndex: keyIndex + 1, 
            _usedModel: modelName 
          });
        }

        lastStatus = response.status;
        const errText = await response.text().catch(() => '');
        if (response.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota') || errText.includes('rate limit')) {
          isQuota = true;
        }
      } catch (error) {
        console.warn(`[Gemini Key #${keyIndex + 1}] Error con ${modelName}:`, error.message);
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
          isQuota = true;
        }
      }
    }
  }

  // --- INTENTO CON PROVEEDOR 2: GROQ (Respaldo Automático) ---
  if (groqApiKey) {
    // Convertir contents de Gemini a formato messages de OpenAI/Groq
    const groqMessages = [];
    if (contents && Array.isArray(contents)) {
      contents.forEach(item => {
        const role = (item.role === 'model' || item.role === 'assistant') ? 'assistant' : 'user';
        const text = (item.parts || []).map(p => p.text || '').join('\n');
        if (text) groqMessages.push({ role, content: text });
      });
    } else {
      groqMessages.push({ role: 'user', content: promptText || '' });
    }

    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini', 'qwen/qwen3.6-27b'];

    for (const groqModel of groqModels) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          let replyText = groqData.choices?.[0]?.message?.content || '';
          // Limpiar tags de razonamiento como <think>...</think> si existen
          replyText = replyText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

          // Formatear exactamente como la respuesta esperada de Gemini
          return res.status(200).json({
            candidates: [
              {
                content: {
                  parts: [
                    { text: replyText }
                  ],
                  role: 'model'
                },
                finishReason: 'STOP',
                index: 0
              }
            ],
            _provider: 'groq',
            _usedModel: groqModel
          });
        }

        lastStatus = groqRes.status;
      } catch (groqErr) {
        console.warn(`[Groq Fallback] Error con ${groqModel}:`, groqErr.message);
      }
    }
  }

  if (isQuota) {
    return res.status(429).json({ error: 'quota_exceeded', isQuotaExceeded: true, message: 'Cuotas de IA agotadas temporalmente.' });
  }

  return res.status(lastStatus || 500).json({ error: 'No se pudo obtener respuesta de ningún proveedor de IA (Gemini / Groq).' });
}



export default async function handler(req, res) {
  // Aseguramos que sea una petición POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Recibimos el texto (fíjese que usamos promptText, igual que en su HTML)
  const { promptText } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Su llave guardada en Vercel

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ error: 'Error comunicándose con Gemini' });
  }
}

// Voz neuronal en la nube para narrar publicaciones (respaldo del navegador).
// No usa claves: hace de puente para que siempre haya una voz de buena calidad.
const IDIOMAS = ['es', 'en', 'fr', 'pt', 'it', 'de'];

export default async function handler(req, res) {
  try {
    const idioma = String(req.query?.tl || 'es').slice(0, 5).toLowerCase();
    const tl = IDIOMAS.includes(idioma) ? idioma : 'es';
    const texto = String(req.query?.q || '').slice(0, 300);
    if (!texto.trim()) return res.status(400).json({ error: 'falta el texto' });
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&ttsspeed=1&tl=${tl}&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } });
    if (!r.ok) return res.status(r.status).json({ error: 'voz_no_disponible' });
    const buffer = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(502).json({ error: 'sin_voz' });
  }
}

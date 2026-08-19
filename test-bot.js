// Test con prompt que incluye datos reales de la plataforma
const prompt = `Eres el asistente de English TECH. Fecha: martes, 19 de agosto de 2026, 08:00 p.m.
ACCIONES DISPONIBLES (responde SOLO el JSON si el usuario pide una accion, o texto normal si es una pregunta):
Si el usuario pide cambiar ajustes, responde EXACTAMENTE este JSON (sin texto adicional):
{"action":"ACCION_AQUI","response":"Tu respuesta al usuario"}

ACCIONES:
- dark_on: Activar modo oscuro
- dark_off: Desactivar modo oscuro (tema claro)
- lights_out: Activar negro puro AMOLED
- sound_on: Activar sonidos
- sound_off: Desactivar sonidos
- push_on: Activar notificaciones push
- push_off: Desactivar notificaciones push

Si NO es una accion, responde con texto normal. Breve. Sin asteriscos. En espanol.

Datos: 0 estudiantes, 0 tareas, 0 evaluaciones, 0 grupos, 0 sem syllabus, Notas: N/A/5.0 ()

Historial:
Gina: Activa el dark mode por favor
Bot:`;

fetch('https://englishtech.vercel.app/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ promptText: prompt }),
  signal: AbortSignal.timeout(30000)
}).then(r => r.json()).then(d => {
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('Full reply:', JSON.stringify(text));
  try {
    const p = JSON.parse(text);
    console.log('Parsed JSON:', JSON.stringify(p));
    console.log('Action:', p.action);
  } catch(e) {
    console.log('NOT JSON - parsing failed');
  }
  process.exit(0);
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });

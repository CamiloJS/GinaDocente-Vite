// Pruebas de la retroalimentacion con IA: automatica, SIEMPRE en espanol y para TODOS los tipos.
import { evaluacionVencida, describirPregunta, construirPromptFeedback, parsearFeedback, generarFeedbackIA, pendientesDeFeedback } from "../src/utils/aiFeedback.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + JSON.stringify(extra) : "")); }
};

const AHORA = new Date("2026-09-30T12:00:00").getTime();

console.log("\n== Regla del deadline (solo despues de vencer) ==");
chequear("sin fecha -> no vencida", evaluacionVencida({ title: 'x' }, AHORA) === false);
chequear("fecha futura -> no vencida", evaluacionVencida({ dueDate: '2026-10-05', dueTime: '23:59' }, AHORA) === false);
chequear("fecha pasada -> vencida", evaluacionVencida({ dueDate: '2026-09-20', dueTime: '23:59' }, AHORA) === true);
chequear("mismo dia antes de la hora -> no vencida", evaluacionVencida({ dueDate: '2026-09-30', dueTime: '23:59' }, AHORA) === false);
chequear("mismo dia despues de la hora -> vencida", evaluacionVencida({ dueDate: '2026-09-30', dueTime: '06:00' }, AHORA) === true);
chequear("sin hora usa 23:59", evaluacionVencida({ dueDate: '2026-09-30' }, AHORA) === false);
chequear("fecha invalida -> no vencida", evaluacionVencida({ dueDate: 'no-es-fecha' }, AHORA) === false);

console.log("\n== Descripcion de TODOS los tipos ==");
const multiple = { type: 'multiple', text: 'Elige', options: [{ text: 'uno', isCorrect: false }, { text: 'dos', isCorrect: true }, { text: 'tres', isCorrect: false }] };
let d = describirPregunta(multiple, [1]);
chequear("multiple correcta", d.acierto === true && d.correcta === 'dos' && d.delEstudiante === 'dos');
d = describirPregunta(multiple, [0]);
chequear("multiple incorrecta", d.acierto === false && d.delEstudiante === 'uno');
d = describirPregunta(multiple, []);
chequear("multiple en blanco", d.acierto === false && d.delEstudiante === '(en blanco)');
d = describirPregunta({ type: 'text', text: 'Pasado de go', correctAnswer: 'went', acceptedAnswers: ['goed'] }, 'GOED');
chequear("escrita acepta variantes (sin importar mayusculas)", d.acierto === true && d.correcta.includes('went'));
d = describirPregunta({ type: 'text', text: 'Pasado de buy', correctAnswer: 'bought' }, 'buyed');
chequear("escrita incorrecta", d.acierto === false && d.delEstudiante === 'buyed');
d = describirPregunta({ type: 'order', text: 'Ordena', words: ['she', 'went', 'home'] }, ['home', 'went', 'she']);
chequear("ordenar mal", d.acierto === false && d.correcta === 'she went home' && d.delEstudiante === 'home went she');
d = describirPregunta({ type: 'match', text: 'Une', pairs: [{ left: 'dog', right: 'perro' }, { left: 'cat', right: 'gato' }] }, { 0: 'perro', 1: 'mal' });
chequear("relacionar parcial", d.acierto === false && d.parcial === 1 && d.delEstudiante.includes('perro'));
d = describirPregunta({ type: 'listening', text: 'Escucha', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: false }] }, [0]);
chequear("listening correcto", d.acierto === true && d.correcta === 'a');
d = describirPregunta({ type: 'dictation', text: 'Dictado', correctAnswer: 'the cat is black' }, 'the cat is black');
chequear("dictado correcto", d.acierto === true);
d = describirPregunta({ type: 'speaking', text: 'Habla sobre tu rutina' }, 'https://audio/voz.webm');
chequear("speaking con audio: se marca como audio y sin acierto automatico", d.esAudio === true && d.acierto === null && d.delEstudiante.includes('audio'), d);
chequear("speaking sin audio", describirPregunta({ type: 'speaking', text: 'Habla' }, '').delEstudiante === '(no grabo nada)');

console.log("\n== Prompt (SIEMPRE en espanol) ==");
const prompt = construirPromptFeedback({ titulo: 'Examen 1', items: [describirPregunta(multiple, [0]), describirPregunta({ type: 'text', text: 'x', correctAnswer: 'y' }, 'y')] });
chequear("marca la incorrecta", prompt.includes('[INCORRECTA]'));
chequear("marca la correcta", prompt.includes('[CORRECTA]'));
chequear("exige espanol siempre", prompt.includes('SIEMPRE en ESPANOL'));
chequear("explica que es en espanol", prompt.includes('espa\u00f1ol'));
chequear("tono amable (no regana)", prompt.includes('rega\u00f1es'));
chequear("pide texto plano", prompt.includes('sin asteriscos'));
chequear("incluye el titulo", prompt.includes('Examen 1'));
chequear("formato JSON indicado", prompt.includes('"explicacion"'));
const promptAudio = construirPromptFeedback({ items: [describirPregunta({ type: 'speaking', text: 'Describe tu casa' }, 'url')] });
chequear("incluye la regla de audio", promptAudio.includes('RESPUESTA GRABADA'));
chequear("la consigna del audio va al prompt", promptAudio.includes('Describe tu casa'));
chequear("no inventa respuesta correcta en audio", !promptAudio.includes('Respuesta correcta:'));
const promptParcial = construirPromptFeedback({ items: [describirPregunta({ type: 'match', text: 'Une', pairs: [{ left: 'a', right: 'b' }, { left: 'c', right: 'd' }] }, { 0: 'b', 1: 'mal' })] });
chequear("informa respuestas parciales", promptParcial.includes('acerto 1 de las parejas'));
chequear("pide no inventar", prompt.includes('no inventes'));

console.log("\n== Parseo de la respuesta ==");
let r = parsearFeedback('```json\n[{"i":1,"explicacion":"Bien hecho: dos es la opcion correcta."},{"i":2,"explicacion":"Casi: revisa la tercera persona."}]\n```', 2);
chequear("acepta JSON con bloques", r.ok && r.feedback.length === 2 && r.feedback[0].includes('Bien hecho'));
r = parsearFeedback(JSON.stringify([{ i: 2, explicacion: 'segunda' }, { i: 1, explicacion: 'primera' }]), 2);
chequear("respeta el orden por indice i", r.feedback[0] === 'primera' && r.feedback[1] === 'segunda');
r = parsearFeedback('["una", "dos"]', 2);
chequear("acepta arreglo de textos", r.ok && r.feedback[1] === 'dos');
r = parsearFeedback('no soy json', 2);
chequear("detecta respuesta invalida", !r.ok);
r = parsearFeedback('[{"i":1,"explicacion":""},{"i":2,"explicacion":"ok"}]', 2);
chequear("reporta explicaciones vacias", r.problemas.length === 1 && r.feedback[1] === 'ok');

console.log("\n== Generacion completa (con IA simulada) ==");
const evVencida = { title: 'Examen', dueDate: '2026-09-01', dueTime: '23:59' };
const evVigente = { title: 'Examen', dueDate: '2026-12-01', dueTime: '23:59' };
const preguntas = [multiple, { type: 'speaking', text: 'Graba tu voz' }, { type: 'text', text: 'Pasado de go', correctAnswer: 'went' }];
const respuestas = { 0: [0], 1: 'https://audio/x.webm', 2: 'went' };
let llamadas = 0;
let promptUsado = '';
const iaFalsa = async (p) => { llamadas++; promptUsado = p; return JSON.stringify([{ i: 1, explicacion: 'Revisa la opcion dos.' }, { i: 2, explicacion: 'Tu audio debe incluir ejemplos.' }, { i: 3, explicacion: 'Muy bien.' }]); };

let g = await generarFeedbackIA({ evaluacion: evVigente, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("NO genera si la evaluacion sigue vigente", g.ok === false && g.vencida === false && llamadas === 0, JSON.stringify(g));

g = await generarFeedbackIA({ evaluacion: evVencida, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("genera cuando ya vencio", g.ok === true && g.vencida === true && llamadas === 1);
chequear("cubre TODOS los tipos, 1 a 1", g.feedback.length === 3 && g.feedback.every(Boolean), JSON.stringify(g.feedback));
chequear("incluye la de speaking", g.feedback[1] === 'Tu audio debe incluir ejemplos.');
chequear("el prompt siempre pide espanol", promptUsado.includes('SIEMPRE en ESPANOL') && promptUsado.includes('RESPUESTA GRABADA'));

console.log("\n== Pendientes (automatico, sin boton) ==");
const notas = [
  { id: 'n1', evaluationId: 'e1', studentId: 'yo' },
  { id: 'n2', evaluationId: 'e2', studentId: 'yo', feedbackIA: ['ya lista'] },
  { id: 'n3', evaluationId: 'e3', studentId: 'yo' },
];
const evaluaciones = [
  { id: 'e1', title: 'vencida 1', dueDate: '2026-09-10', dueTime: '23:59', createdAt: 100 },
  { id: 'e2', title: 'vencida con feedback', dueDate: '2026-09-11', dueTime: '23:59', createdAt: 200 },
  { id: 'e3', title: 'vencida 2', dueDate: '2026-09-12', dueTime: '23:59', createdAt: 300 },
  { id: 'e4', title: 'vigente', dueDate: '2026-12-01', dueTime: '23:59', createdAt: 400 },
];
let pend = pendientesDeFeedback({ evaluaciones, notas, ahora: AHORA });
chequear("solo las vencidas con nota y sin explicacion", pend.length === 2 && pend.map(p => p.evaluacion.id).join() === 'e3,e1', pend.map(p => p.evaluacion.id));
chequear("respeta el limite", pendientesDeFeedback({ evaluaciones, notas, limite: 1, ahora: AHORA }).length === 1);
chequear("sin evaluaciones -> vacio", pendientesDeFeedback({ evaluaciones: [], notas, ahora: AHORA }).length === 0);
chequear("sin notas -> vacio", pendientesDeFeedback({ evaluaciones, notas: [], ahora: AHORA }).length === 0);
chequear("sin argumentos -> vacio", pendientesDeFeedback().length === 0);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);

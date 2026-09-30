// Pruebas de la retroalimentacion con IA para evaluaciones.
import { evaluacionVencida, describirPregunta, construirPromptFeedback, parsearFeedback, generarFeedbackIA } from "../src/utils/aiFeedback.js";

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

console.log("\n== Descripcion de cada tipo ==");
const multiple = { type: 'multiple', text: 'Elige', options: [{ text: 'uno', isCorrect: false }, { text: 'dos', isCorrect: true }, { text: 'tres', isCorrect: false }] };
let d = describirPregunta(multiple, [1]);
chequear("multiple correcta", d.acierto === true && d.correcta === 'dos' && d.delEstudiante === 'dos');
d = describirPregunta(multiple, [0]);
chequear("multiple incorrecta", d.acierto === false && d.delEstudiante === 'uno');
d = describirPregunta(multiple, []);
chequear("multiple en blanco", d.acierto === false && d.delEstudiante === '(en blanco)');
d = describirPregunta({ type: 'text', text: 'Pasado de go', correctAnswer: 'went', acceptedAnswers: ['goed'] }, 'GOED');
chequear("escrita acepta variantes (sin importar mayusculas)", d.acierto === true && d.correcta.includes('went'));
d = describirPregunta({ type: 'order', text: 'Ordena', words: ['she', 'went', 'home'] }, ['home', 'went', 'she']);
chequear("ordenar mal", d.acierto === false && d.correcta === 'she went home' && d.delEstudiante === 'home went she');
d = describirPregunta({ type: 'match', text: 'Une', pairs: [{ left: 'dog', right: 'perro' }, { left: 'cat', right: 'gato' }] }, { 0: 'perro', 1: 'mal' });
chequear("relacionar parcial", d.acierto === false && d.parcial === 1 && d.delEstudiante.includes('perro'));

console.log("\n== Prompt ==");
const prompt = construirPromptFeedback({ titulo: 'Examen 1', idioma: 'es', items: [describirPregunta(multiple, [0]), describirPregunta({ type: 'text', text: 'x', correctAnswer: 'y' }, 'y')] });
chequear("marca la incorrecta", prompt.includes('[INCORRECTA]'));
chequear("marca la correcta", prompt.includes('[CORRECTA]'));
chequear("pide responder en espanol", prompt.includes('Responde en espa\u00f1ol'));
chequear("pide texto plano", prompt.includes('sin asteriscos'));
chequear("incluye el titulo", prompt.includes('Examen 1'));
chequear("formato JSON indicado", prompt.includes('"explicacion"'));
const promptFr = construirPromptFeedback({ idioma: 'fr', items: [describirPregunta(multiple, [1])] });
chequear("respeta el idioma frances", promptFr.includes('Responde en franc\u00e9s'));

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
const iaFalsa = async () => { llamadas++; return JSON.stringify([{ i: 1, explicacion: 'Revisa la opcion dos.' }, { i: 2, explicacion: 'Muy bien.' }]); };

let g = await generarFeedbackIA({ evaluacion: evVigente, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("NO genera si la evaluacion sigue vigente", g.ok === false && g.vencida === false && llamadas === 0, JSON.stringify(g));

g = await generarFeedbackIA({ evaluacion: evVencida, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("genera cuando ya vencio", g.ok === true && g.vencida === true && llamadas === 1);
chequear("salta las de speaking y respeta los indices", g.feedback[0] === 'Revisa la opcion dos.' && !g.feedback[1] && g.feedback[2] === 'Muy bien.', JSON.stringify(g.feedback));
chequear("devuelve el largo de la evaluacion", g.feedback.length === 3);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);

import {
  evaluacionVencida,
  tieneRetroalimentacionInmediata,
  puedeMostrarFeedback,
  describirPregunta,
  armarMinijuegoPregunta,
  construirPromptFeedback,
  parsearFeedback,
  generarFeedbackIA,
  pendientesDeFeedback,
  limpiarMencionIA,
} from "../src/utils/aiFeedback.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + JSON.stringify(extra) : "")); }
};

const AHORA = new Date("2026-09-30T12:00:00").getTime();

console.log("\n== Regla del deadline y retroalimentacion inmediata ==");
chequear("sin fecha -> no vencida", evaluacionVencida({ title: 'x' }, AHORA) === false);
chequear("fecha futura -> no vencida", evaluacionVencida({ dueDate: '2026-10-05', dueTime: '23:59' }, AHORA) === false);
chequear("fecha pasada -> vencida", evaluacionVencida({ dueDate: '2026-09-20', dueTime: '23:59' }, AHORA) === true);
chequear("mismo dia antes de la hora -> no vencida", evaluacionVencida({ dueDate: '2026-09-30', dueTime: '23:59' }, AHORA) === false);
chequear("mismo dia despues de la hora -> vencida", evaluacionVencida({ dueDate: '2026-09-30', dueTime: '06:00' }, AHORA) === true);
chequear("sin hora usa 23:59", evaluacionVencida({ dueDate: '2026-09-30' }, AHORA) === false);
chequear("fecha invalida -> no vencida", evaluacionVencida({ dueDate: 'no-es-fecha' }, AHORA) === false);
chequear("tieneRetroalimentacionInmediata detecta immediateFeedback=true", tieneRetroalimentacionInmediata({ immediateFeedback: true }) === true);
chequear("tieneRetroalimentacionInmediata falso por defecto", tieneRetroalimentacionInmediata({ title: 'x' }) === false);
chequear("puedeMostrarFeedback permite vigente si tiene immediateFeedback", puedeMostrarFeedback({ dueDate: '2026-12-01', dueTime: '23:59', immediateFeedback: true }, AHORA) === true);
chequear("puedeMostrarFeedback bloquea vigente sin immediateFeedback", puedeMostrarFeedback({ dueDate: '2026-12-01', dueTime: '23:59', immediateFeedback: false }, AHORA) === false);

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
d = describirPregunta({ type: 'text', text: 'Traduce economic', correctAnswer: 'económico' }, 'economico.');
chequear("escrita ignora tildes y puntuacion igual que el calificador", d.acierto === true);
d = describirPregunta({ type: 'speaking', text: 'Habla sobre tu rutina' }, 'https://audio/voz.webm');
chequear("speaking con audio: se marca como audio y sin acierto automatico", d.esAudio === true && d.acierto === null && d.delEstudiante.includes('audio'), d);
chequear("speaking sin audio", describirPregunta({ type: 'speaking', text: 'Habla' }, '').delEstudiante === '(no grabo nada)');

console.log("\n== Minijuego cazatrampas y analisis de opciones por pregunta ==");
const mjMultiple = armarMinijuegoPregunta(multiple, [0]);
chequear("multiple genera analisis de todas las opciones", mjMultiple.analisisOpciones.length === 3);
chequear("multiple identifica cual opcion era correcta y cuales no iban", mjMultiple.analisisOpciones[1].esCorrecta === true && mjMultiple.analisisOpciones[0].esCorrecta === false && mjMultiple.analisisOpciones[0].fueElegida === true);
chequear("multiple genera 3 opciones de minijuego con 1 verdadera y 2 trampas", mjMultiple.opcionesJuego.length === 3 && mjMultiple.opcionesJuego.filter((o) => o.esCorrecta).length === 1 && mjMultiple.opcionesJuego.filter((o) => !o.esCorrecta).length === 2);

const mjOrder = armarMinijuegoPregunta({ type: 'order', text: 'Ordena', words: ['she', 'went', 'home'] }, ['home', 'went', 'she']);
chequear("order genera analisis de orden correcto vs orden del estudiante", mjOrder.analisisOpciones.length === 2 && mjOrder.opcionesJuego.length === 3);

const mjMatch = armarMinijuegoPregunta({ type: 'match', text: 'Une', pairs: [{ left: 'dog', right: 'perro' }, { left: 'cat', right: 'gato' }] }, { 0: 'perro', 1: 'perro' });
chequear("match genera analisis por pareja y minijuego de 3 opciones", mjMatch.analisisOpciones.length === 2 && mjMatch.opcionesJuego.length === 3);

const mjText = armarMinijuegoPregunta({ type: 'text', text: 'Pasado de buy', correctAnswer: 'bought' }, 'buyed');
chequear("text genera analisis de respuesta correcta vs error del estudiante", mjText.analisisOpciones.length === 2 && mjText.opcionesJuego.length === 3);

const matchLargo = {
  type: 'match',
  text: 'Relaciona cada concepto de Ingles Tecnico economico con su definicion exacta en ingles:',
  pairs: [
    { left: 'Supply and Demand', right: 'Relationship between availability and desire for goods' },
    { left: 'Trade Surplus', right: 'Economic state when exports exceed imports' },
    { left: 'Bull Market', right: 'Financial market where asset prices are rising' },
    { left: 'Central Bank', right: 'Institution that manages currency and interest rates' }
  ]
};
const mjMatchLargo = armarMinijuegoPregunta(matchLargo, { 0: 'Economic state when exports exceed imports', 1: 'Economic state when exports exceed imports', 2: 'Financial market where asset prices are rising', 3: 'Institution that manages currency and interest rates' });
chequear("match con 4 parejas largas enfoca el reto en una pareja especifica sin truncar a mitad de palabra", mjMatchLargo.preguntaTrampa.includes('Supply and Demand') && mjMatchLargo.opcionesJuego.some((o) => o.esCorrecta && o.texto.includes('Relationship between availability and desire for goods') && o.texto.includes('Supply and Demand')));

const vfPregunta = {
  type: 'multiple',
  text: 'Indica si la afirmacion es verdadera o falsa: "GDP measures total monetary value of final goods."',
  options: [
    { text: 'Verdadero', isCorrect: true },
    { text: 'Falso', isCorrect: false }
  ]
};
const mjVF = armarMinijuegoPregunta(vfPregunta, [1]);
chequear("verdadero/falso no genera trampa absurda sobre sinonimos", !mjVF.opcionesJuego.some((o) => o.texto.includes('sinónimos')));

const mjConRazonIA = armarMinijuegoPregunta(multiple, [0], 'Explicacion general', {
  porQueOpciones: ['Razon especifica 1', 'Razon especifica 2', 'Razon especifica 3'],
  retoPregunta: 'Reto personalizado',
  opcionesJuego: [
    { texto: 'Opcion A', esCorrecta: false, explicacion: 'Exp A' },
    { texto: 'Opcion B', esCorrecta: true, explicacion: 'Exp B' },
    { texto: 'Opcion C', esCorrecta: false, explicacion: 'Exp C' }
  ]
});
const mjRehidratado = armarMinijuegoPregunta(multiple, [0], 'Explicacion general', mjConRazonIA);
chequear("rehidratar minijuego conserva porQueOpciones de la IA en analisisOpciones", mjRehidratado.analisisOpciones[0].razon === 'Razon especifica 1' && mjRehidratado.analisisOpciones[1].razon === 'Razon especifica 2');
chequear("rehidratar minijuego no vuelve a barajar opcionesJuego (orden estable)", JSON.stringify(mjRehidratado.opcionesJuego.map((o) => o.texto)) === JSON.stringify(mjConRazonIA.opcionesJuego.map((o) => o.texto)));

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
chequear("prohibe revelar que es una IA", prompt.includes("nunca menciones que eres una IA"));

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
chequear("quita una frase que delata a la IA", limpiarMencionIA("¡Excelente! Como IA, no puedo oir tu audio.") === "¡Excelente!");
chequear("quita la mencion a inteligencia artificial", !limpiarMencionIA("Muy bien. Esto lo genero una inteligencia artificial.").toLowerCase().includes("inteligencia"));
chequear("no toca el texto normal", limpiarMencionIA("¡Muy bien hecho! Sigue asi.") === "¡Muy bien hecho! Sigue asi.");
r = parsearFeedback(JSON.stringify([{ i: 1, explicacion: "Como IA, puedo decirte que 'went' es correcto." }]), 1);
chequear("el parseo limpia las menciones de IA", r.ok && !/como ia/i.test(r.feedback[0]) && r.feedback[0].includes("went"), r.feedback);

console.log("\n== Generacion completa (con IA simulada) ==");
const evVencida = { title: 'Examen', dueDate: '2026-09-01', dueTime: '23:59' };
const evVigente = { title: 'Examen', dueDate: '2026-12-01', dueTime: '23:59' };
const evVigenteInmediata = { title: 'Examen Inmediato', dueDate: '2026-12-01', dueTime: '23:59', immediateFeedback: true };
const preguntas = [multiple, { type: 'speaking', text: 'Graba tu voz' }, { type: 'text', text: 'Pasado de go', correctAnswer: 'went' }];
const respuestas = { 0: [0], 1: 'https://audio/x.webm', 2: 'went' };
let llamadas = 0;
let promptUsado = '';
const iaFalsa = async (p) => { llamadas++; promptUsado = p; return JSON.stringify([{ i: 1, explicacion: 'Revisa la opcion dos.' }, { i: 2, explicacion: 'Tu audio debe incluir ejemplos.' }, { i: 3, explicacion: 'Muy bien.' }]); };

let g = await generarFeedbackIA({ evaluacion: evVigente, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("NO genera si la evaluacion sigue vigente y no tiene retroalimentacion inmediata", g.ok === false && g.vencida === false && llamadas === 0, JSON.stringify(g));

g = await generarFeedbackIA({ evaluacion: evVigenteInmediata, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("SI genera en evaluacion vigente cuando tiene immediateFeedback=true", g.ok === true && llamadas === 1, JSON.stringify(g));

g = await generarFeedbackIA({ evaluacion: evVencida, preguntas, respuestas, llamarIA: iaFalsa, ahora: AHORA });
chequear("genera cuando ya vencio", g.ok === true && g.vencida === true && llamadas === 2);
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

console.log("\n== Generacion de feedback por lotes (evaluaciones > 20 preguntas) ==");
const preguntas45 = Array.from({ length: 45 }, (_, idx) => ({
  type: 'text',
  text: `Question #${idx + 1}`,
  correctAnswer: `ans${idx + 1}`,
}));
const respuestas45 = Object.fromEntries(preguntas45.map((_, idx) => [idx, `ans${idx + 1}`]));
let llamadasLotesFb = 0;
const tamLotesFb = [];
const resFb45 = await generarFeedbackIA({
  evaluacion: evVencida,
  preguntas: preguntas45,
  respuestas: respuestas45,
  ahora: AHORA,
  llamarIA: async (promptLote) => {
    llamadasLotesFb++;
    const matches = promptLote.match(/^\d+\) \[/gm) || [];
    tamLotesFb.push(matches.length);
    return JSON.stringify(
      Array.from({ length: matches.length }, (_, idx) => ({
        i: idx + 1,
        explicacion: `Explicacion del lote ${llamadasLotesFb} item ${idx + 1}.`,
      }))
    );
  },
});
chequear(
  "generarFeedbackIA divide 45 preguntas en 3 lotes [20, 20, 5] y devuelve 45 explicaciones y minijuegos",
  resFb45.ok === true &&
    llamadasLotesFb === 3 &&
    JSON.stringify(tamLotesFb) === JSON.stringify([20, 20, 5]) &&
    resFb45.feedback.length === 45 &&
    resFb45.feedback.every(Boolean) &&
    resFb45.minijuegos.length === 45,
  `llamadas=${llamadasLotesFb} tamLotes=${JSON.stringify(tamLotesFb)} len=${resFb45.feedback.length}`
);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);


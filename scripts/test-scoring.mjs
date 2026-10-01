// Pruebas del motor de calificacion de evaluaciones (sin navegador).
import { permiteVariasRespuestas, calculateScore, normalizarRespuesta, respuestasValidasDe, puntajeDe, tienePreguntasManuales } from "../src/utils/evalScoring.js";
import { desordenarPalabras } from "../src/utils/palabras.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + extra : "")); }
};

const multiple = (correctas) => ({
  type: "multiple",
  text: "p",
  options: ["a", "b", "c", "d"].map((t, i) => ({ text: t, isCorrect: correctas.includes(i) })),
});

console.log("\n== Seleccion multiple ==");
chequear("una correcta bien -> 5.0", calculateScore({ questions: [multiple([1])] }, { 0: [1] }) === 5.0);
chequear("una correcta mal -> 0.0", calculateScore({ questions: [multiple([1])] }, { 0: [0] }) === 0.0);
chequear("sin responder -> 0.0", calculateScore({ questions: [multiple([1])] }, {}) === 0.0);
chequear("dos correctas: marcando las dos -> 5.0", calculateScore({ questions: [multiple([0, 2])] }, { 0: [0, 2] }) === 5.0);
chequear("dos correctas: orden distinto -> 5.0", calculateScore({ questions: [multiple([0, 2])] }, { 0: [2, 0] }) === 5.0);
chequear("dos correctas: marcando una -> 0.0", calculateScore({ questions: [multiple([0, 2])] }, { 0: [0] }) === 0.0);
chequear("dos correctas: marcando una de mas -> 0.0", calculateScore({ questions: [multiple([0, 2])] }, { 0: [0, 2, 3] }) === 0.0);

console.log("\n== Respuesta escrita y tolerancia ==");
const escrita = (correctAnswer, acceptedAnswers = []) => ({ type: "text", text: "p", correctAnswer, acceptedAnswers, options: [] });
chequear("exacta -> 5.0", calculateScore({ questions: [escrita("went")] }, { 0: "went" }) === 5.0);
chequear("ignora mayusculas", calculateScore({ questions: [escrita("went")] }, { 0: "WENT" }) === 5.0);
chequear("ignora espacios de mas", calculateScore({ questions: [escrita("went")] }, { 0: "  went  " }) === 5.0);
chequear("ignora tildes", calculateScore({ questions: [escrita("comprension")] }, { 0: "comprensi\u00f3n" }) === 5.0);
chequear("acepta otra valida (colour)", calculateScore({ questions: [escrita("color", ["colour"])] }, { 0: "colour" }) === 5.0);
chequear("acepta otra valida al reves", calculateScore({ questions: [escrita("colour", ["color"])] }, { 0: "color" }) === 5.0);
chequear("respuesta distinta -> 0.0", calculateScore({ questions: [escrita("went")] }, { 0: "goes" }) === 0.0);
chequear("vacio -> 0.0", calculateScore({ questions: [escrita("went")] }, { 0: "" }) === 0.0);
chequear("sin clave no cuenta", calculateScore({ questions: [escrita("")] }, { 0: "" }) === 0.0);

console.log("\n== Puntaje por pregunta ==");
const p3 = { ...multiple([1]), points: 3 };
const p1 = { ...multiple([1]), points: 1 };
chequear("pregunta de 3 vale el triple", calculateScore({ questions: [p3, p1] }, { 0: [1], 1: [] }) === 3.8, String(calculateScore({ questions: [p3, p1] }, { 0: [1], 1: [] })));
chequear("las dos bien -> 5.0", calculateScore({ questions: [p3, p1] }, { 0: [1], 1: [1] }) === 5.0);
chequear("solo la de 1 punto -> 1.3", calculateScore({ questions: [p3, p1] }, { 0: [], 1: [1] }) === 1.3, String(calculateScore({ questions: [p3, p1] }, { 0: [], 1: [1] })));
chequear("puntaje por defecto es 1", puntajeDe({}) === 1 && puntajeDe({ points: 0 }) === 1 && puntajeDe({ points: 2.5 }) === 2.5);

console.log("\n== Ordenar la oracion ==");
const orden = { type: "order", text: "Ordena", words: ["she", "went", "to", "school"] };
chequear("orden correcto -> 5.0", calculateScore({ questions: [orden] }, { 0: ["she", "went", "to", "school"] }) === 5.0);
chequear("orden con mayusculas -> 5.0", calculateScore({ questions: [orden] }, { 0: ["She", "Went", "To", "School"] }) === 5.0);
chequear("orden incorrecto -> 0.0", calculateScore({ questions: [orden] }, { 0: ["went", "she", "to", "school"] }) === 0.0);
chequear("orden incompleto -> 0.0", calculateScore({ questions: [orden] }, { 0: ["she", "went"] }) === 0.0);

console.log("\n== Relacionar columnas (puntaje parcial) ==");
const match = { type: "match", text: "Une", pairs: [{ left: "dog", right: "perro" }, { left: "cat", right: "gato" }, { left: "bird", right: "pajaro" }, { left: "fish", right: "pez" }] };
chequear("todo bien -> 5.0", calculateScore({ questions: [match] }, { 0: { 0: "perro", 1: "gato", 2: "pajaro", 3: "pez" } }) === 5.0);
chequear("3 de 4 -> 3.8 (parcial)", calculateScore({ questions: [match] }, { 0: { 0: "perro", 1: "gato", 2: "pajaro", 3: "mal" } }) === 3.8, String(calculateScore({ questions: [match] }, { 0: { 0: "perro", 1: "gato", 2: "pajaro", 3: "mal" } })));
chequear("2 de 4 -> 2.5", calculateScore({ questions: [match] }, { 0: { 0: "perro", 1: "gato", 2: "x", 3: "y" } }) === 2.5);
chequear("ninguna -> 0.0", calculateScore({ questions: [match] }, { 0: {} }) === 0.0);
chequear("tolerante a tildes", calculateScore({ questions: [match] }, { 0: { 0: "perro", 1: "gato", 2: "p\u00e1jaro", 3: "pez" } }) === 5.0);

console.log("\n== Speaking (calificacion manual) ==");
const speaking = { type: "speaking", text: "Graba tu respuesta", points: 2 };
chequear("solo speaking: automatico 0.0", calculateScore({ questions: [speaking] }, {}) === 0.0);
chequear("speaking no baja la nota del resto", calculateScore({ questions: [speaking, multiple([1])] }, { 1: [1] }) === 5.0);
chequear("detecta que hay preguntas manuales", tienePreguntasManuales({ questions: [speaking, multiple([1])] }) === true);
chequear("sin speaking no hay manuales", tienePreguntasManuales({ questions: [multiple([1])] }) === false);

console.log("\n== Casos borde ==");
chequear("sin preguntas -> 0.0", calculateScore({ questions: [] }, {}) === 0.0);
chequear("evaluacion nula -> 0.0", calculateScore(null, {}) === 0.0);
chequear("answers nulo -> 0.0", calculateScore({ questions: [multiple([1])] }, null) === 0.0);
chequear("normaliza tildes y espacios", normalizarRespuesta("  Comprensi\u00f3n   Lectora ") === "comprension lectora");
chequear("respuestasValidasDe une todo", respuestasValidasDe(escrita("color", ["colour", "COLOR "])).length === 3);

console.log("\n== Desordenar palabras (ordenar la oracion) ==");
const palabras = ["she", "went", "to", "school", "yesterday"];
const d1 = desordenarPalabras(palabras, "semilla-1");
const d2 = desordenarPalabras(palabras, "semilla-1");
chequear("orden estable con la misma semilla", JSON.stringify(d1) === JSON.stringify(d2));
chequear("mismas palabras que la oracion", d1.map((x) => x.w).sort().join(" ") === [...palabras].sort().join(" "));
chequear("guarda el indice original de cada palabra", d1.every((x) => palabras[x.idx] === x.w));
chequear("no queda en el orden correcto", !d1.every((x, i) => x.idx === i));
chequear("con una sola palabra no rompe", desordenarPalabras(["hola"], "s").length === 1);
chequear("con lista vacia no rompe", desordenarPalabras([], "s").length === 0);
chequear("palabras repetidas se conservan", desordenarPalabras(["the", "cat", "and", "the", "dog"], "x").filter((p) => p.w === "the").length === 2);

console.log("\n== Listening, dictado y speaking ==");
const listeningOp = { type: "listening", text: "Escucha y responde", audioUrl: "https://x/a.mp3", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] };
const listeningEscrito = { type: "listening", text: "Escucha y escribe", audioUrl: "https://x/a.mp3", correctAnswer: "hello", acceptedAnswers: ["hi"] };
const dictado = { type: "dictation", text: "Escribe lo que oyes", audioUrl: "https://x/b.mp3", correctAnswer: "the cat is black", acceptedAnswers: [] };
chequear("listening con opciones (bien) -> 5.0", calculateScore({ questions: [listeningOp] }, { 0: [0] }) === 5.0);
chequear("listening con opciones (mal) -> 0.0", calculateScore({ questions: [listeningOp] }, { 0: [1] }) === 0.0);
chequear("listening con respuesta escrita -> 5.0", calculateScore({ questions: [listeningEscrito] }, { 0: "hi" }) === 5.0);
chequear("dictado exacto -> 5.0", calculateScore({ questions: [dictado] }, { 0: "the cat is black" }) === 5.0);
chequear("dictado tolera mayusculas y espacios", calculateScore({ questions: [dictado] }, { 0: "  The Cat  Is Black " }) === 5.0);
chequear("dictado incorrecto -> 0.0", calculateScore({ questions: [dictado] }, { 0: "the dog is black" }) === 0.0);
chequear("listening sin audio no rompe", calculateScore({ questions: [{ type: "listening", text: "x", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] }] }, { 0: [0] }) === 5.0);


console.log("\n== Seleccion multiple: unica vs varias ==");
const conDos = { type: "multiple", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: true }, { text: "c", isCorrect: false }] };
const conUna = { type: "multiple", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] };
chequear("varias: 2 correctas sin campo", permiteVariasRespuestas(conDos) === true);
chequear("unica: 1 correcta sin campo", permiteVariasRespuestas(conUna) === false);
chequear("el campo manda", permiteVariasRespuestas({ ...conUna, permiteMultiples: true }) === true && permiteVariasRespuestas({ ...conDos, permiteMultiples: false }) === false);
chequear("sin opciones no hay varias", permiteVariasRespuestas({ type: "multiple" }) === false);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);

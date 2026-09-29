// Pruebas del generador de evaluaciones con IA (sin navegador, sin gastar cuota).
import { construirPrompt, parsearEvaluacion, generarPreguntasConIA, TIPOS_MEZCLA, IDIOMAS, PRESETS } from "../src/utils/aiEvalGenerator.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + extra : "")); }
};

// ---------- 1) prompt ----------
console.log("\n== Prompt ==");
const p = construirPrompt({ tema: "Past simple", total: 8, multiple: 4, text: 4, dificultad: "alta", idioma: "en" });
chequear("dice el total exacto", p.includes("EXACTAMENTE 8 preguntas"));
chequear("dice la distribucion", p.includes("4 de selecci\u00f3n m\u00faltiple") && p.includes("4 de respuesta escrita"));
chequear("pide JSON puro", p.includes("UNICAMENTE un arreglo JSON"));
chequear("incluye el tema", p.includes("Past simple"));
chequear("incluye dificultad", p.toLowerCase().includes("alta"));
chequear("incluye idioma ingles", p.includes("Todo en ingl\u00e9s"));

// idiomas disponibles (incluye frances)
console.log("\n== Idiomas ==");
chequear("existe frances", !!IDIOMAS.fr && IDIOMAS.fr.includes("franc\u00e9s"));
chequear("existe bilingue frances", !!IDIOMAS.bilingue_fr && IDIOMAS.bilingue_fr.includes("franc\u00e9s"));
const pFr = construirPrompt({ tema: "Pass\u00e9 compos\u00e9", total: 5, multiple: 3, text: 2, dificultad: "media", idioma: "fr" });
chequear("prompt en frances", pFr.includes("Todo en franc\u00e9s"));
chequear("prompt en frances conserva el tema", pFr.includes("Pass\u00e9 compos\u00e9"));
const pBi = construirPrompt({ tema: "Les articles", total: 4, multiple: 2, text: 2, idioma: "bilingue_fr" });
chequear("prompt bilingue frances-espanol", pBi.includes("franc\u00e9s") && pBi.includes("espa\u00f1ol"));
const pEs = construirPrompt({ tema: "Verbos", total: 3, multiple: 2, text: 1, idioma: "es" });
chequear("prompt en espanol", pEs.includes("Todo en espa\u00f1ol"));

// ---------- 2) parseo ----------
console.log("\n== Parseo ==");
const bueno = JSON.stringify([
  { type: "multiple", text: "She ___ to school yesterday.", options: [{ text: "went", isCorrect: true }, { text: "goes", isCorrect: false }, { text: "going", isCorrect: false }], correctAnswer: "" },
  { type: "text", text: "Write the past of 'eat'.", options: [], correctAnswer: "ate" },
]);
let r = parsearEvaluacion("```json\n" + bueno + "\n```", 2);
chequear("acepta JSON con bloques de codigo", r.ok && r.preguntas.length === 2, JSON.stringify(r.problemas));
chequear("normaliza multiple", r.preguntas[0]?.type === "multiple" && r.preguntas[0].options.length === 3);
chequear("normaliza escrita", r.preguntas[1]?.type === "text" && r.preguntas[1].correctAnswer === "ate");

const frances = JSON.stringify([
  { type: "text", text: "Conjugue le verbe '\u00eatre' au pr\u00e9sent.", options: [], correctAnswer: "je suis" },
]);
r = parsearEvaluacion(frances, 1);
chequear("acepta preguntas en frances", r.ok && r.preguntas[0].correctAnswer === "je suis", JSON.stringify(r.problemas));

r = parsearEvaluacion(bueno, 5);
chequear("detecta cantidad incorrecta", !r.ok && r.problemas.some((x) => x.includes("se pidieron 5")));

r = parsearEvaluacion(JSON.stringify([{ type: "multiple", text: "Pick one", options: [{ text: "good", isCorrect: false }, { text: "bad", isCorrect: false }], correctAnswer: "good" }]), 1);
chequear("deduce la correcta por la respuesta", r.ok && r.preguntas[0].options.some((o) => o.text === "good" && o.isCorrect));

r = parsearEvaluacion(JSON.stringify([{ type: "text", text: "Traduce 'casa'", options: [], correctAnswer: "" }]), 1);
chequear("detecta escrita sin respuesta", !r.ok && r.preguntas.length === 0 && r.problemas.some((x) => x.includes("no trae respuesta esperada")), JSON.stringify(r.problemas));

r = parsearEvaluacion('[\n{"type":"multiple","text":"A","options":[{"text":"x","isCorrect":true},{"text":"y","isCorrect":false},],},\n]', 1);
chequear("repara comas finales", r.ok && r.preguntas.length === 1, JSON.stringify(r.problemas));

r = parsearEvaluacion('[\u007B"type":"multiple","text":\u201CCon comillas raras\u201D,"options":[\u007B"text":"uno","isCorrect":true\u007D,\u007B"text":"dos","isCorrect":false\u007D],"correctAnswer":""\u007D]', 1);
chequear("repara comillas tipograficas", r.ok, JSON.stringify(r.problemas));

r = parsearEvaluacion("Lo siento, no puedo ayudar con eso.", 3);
chequear("detecta respuesta no-JSON", !r.ok && r.problemas[0].includes("JSON"));

r = parsearEvaluacion(JSON.stringify([{ type: "multiple", text: "Repetida", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }], correctAnswer: "" }, { type: "multiple", text: "Repetida", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }], correctAnswer: "" }]), 2);
chequear("elimina repetidas", r.preguntas.length === 1 && r.problemas.some((x) => x.includes("repetida")));

// ---------- 3) variantes aceptadas, puntaje y varias correctas ----------
console.log("\n== Variantes, puntaje y varias correctas ==");
const conAlt = JSON.stringify([
  { type: "text", text: "Traduce 'color'", options: [], correctAnswer: "color", acceptedAnswers: ["colour", "Color"] },
  { type: "multiple", text: "Pick", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }], correctAnswer: "", points: 2 },
]);
r = parsearEvaluacion(conAlt, 2);
chequear("conserva variantes aceptadas", r.ok && r.preguntas[0].acceptedAnswers.length === 2, JSON.stringify(r.problemas));
chequear("conserva puntaje por pregunta", r.preguntas[1].points === 2);
chequear("puntaje por defecto 1", parsearEvaluacion(JSON.stringify([{ type: "text", text: "x", options: [], correctAnswer: "y" }]), 1).preguntas[0].points === 1);
chequear("acepta varias correctas del generador", parsearEvaluacion(JSON.stringify([{ type: "multiple", text: "m", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: true }, { text: "c", isCorrect: false }], correctAnswer: "" }]), 1).ok);
const pVar = construirPrompt({ tema: "X", total: 4, multiple: 2, text: 2, variasCorrectas: true });
chequear("prompt permite varias correctas", pVar.includes("puede haber 1 o 2 opciones correctas"));
const pUna = construirPrompt({ tema: "X", total: 4, multiple: 2, text: 2 });
chequear("prompt por defecto una sola correcta", pUna.includes("exactamente UNA opci\u00f3n correcta"));
chequear("prompt pide variantes aceptadas", pUna.includes("acceptedAnswers"));

// ---------- 5) tipos nuevos: verdadero/falso, ordenar, relacionar ----------
console.log("\n== Tipos nuevos ==");
r = parsearEvaluacion(JSON.stringify([
  { type: "truefalse", text: "The past of 'go' is 'went'.", correctAnswer: "verdadero" },
  { type: "order", text: "Ordena la oracion", words: ["she", "went", "to", "school"] },
  { type: "match", text: "Une cada palabra", pairs: [{ left: "dog", right: "perro" }, { left: "cat", right: "gato" }, { left: "bird", right: "pajaro" }] },
]), 3);
chequear("acepta verdadero/falso", r.ok && r.preguntas[0].type === "multiple" && r.preguntas[0].options[0].isCorrect === true && r.preguntas[0].options[1].isCorrect === false, JSON.stringify(r.problemas));
chequear("acepta ordenar la oracion", r.preguntas[1].type === "order" && r.preguntas[1].words.length === 4);
chequear("acepta relacionar columnas", r.preguntas[2].type === "match" && r.preguntas[2].pairs.length === 3);
r = parsearEvaluacion(JSON.stringify([{ type: "truefalse", text: "Falso: el sol es frio.", correctAnswer: "falso" }]), 1);
chequear("V/F marca Falso cuando corresponde", r.ok && r.preguntas[0].options[1].isCorrect === true && r.preguntas[0].options[0].isCorrect === false);
chequear("detecta V/F sin marca", !parsearEvaluacion(JSON.stringify([{ type: "truefalse", text: "x" }]), 1).ok);
chequear("detecta ordenar sin palabras suficientes", !parsearEvaluacion(JSON.stringify([{ type: "order", text: "x", words: ["a"] }]), 1).ok);
chequear("detecta relacionar con pocas parejas", !parsearEvaluacion(JSON.stringify([{ type: "match", text: "x", pairs: [{ left: "a", right: "b" }] }]), 1).ok);
chequear("detecta relacionar con respuestas repetidas", !parsearEvaluacion(JSON.stringify([{ type: "match", text: "x", pairs: [{ left: "a", right: "b" }, { left: "c", right: "b" }, { left: "d", right: "e" }] }]), 1).ok);

// ---------- 6) presets de mezcla ----------
console.log("\n== Presets de mezcla ==");
const suma = (d) => d.multiple + d.vf + d.text + d.orden + d.match;
chequear("preset variada suma exacto (10)", suma(PRESETS.variada.calc(10)) === 10, JSON.stringify(PRESETS.variada.calc(10)));
chequear("preset variada usa todos los tipos", ["multiple", "vf", "text", "orden"].every((k) => PRESETS.variada.calc(10)[k] > 0));
chequear("preset variada incluye relacionar en examenes largos", PRESETS.variada.calc(10).match === 1 && PRESETS.variada.calc(5).match === 0);
chequear("preset variada suma exacto en varios tamanos", [1, 2, 3, 4, 5, 7, 12, 20].every((t) => suma(PRESETS.variada.calc(t)) === t));
chequear("preset mitad y mitad suma exacto", suma(PRESETS.mitad.calc(9)) === 9 && PRESETS.mitad.calc(9).vf === 0);
chequear("preset solo multiple", suma(PRESETS.multiple.calc(6)) === 6 && PRESETS.multiple.calc(6).multiple === 6);
chequear("preset solo escrita", suma(PRESETS.text.calc(6)) === 6 && PRESETS.text.calc(6).text === 6);
const pTipos = construirPrompt({ tema: "X", total: 6, tipos: { multiple: 2, vf: 1, text: 1, orden: 2, match: 0 } });
chequear("prompt detalla cada tipo pedido", pTipos.includes("2 de selecci\u00f3n m\u00faltiple") && pTipos.includes("1 de Verdadero o Falso") && pTipos.includes("2 de ordenar la oraci\u00f3n"));
chequear("prompt explica el formato de order", pTipos.includes('"type":"order"') && pTipos.includes("words"));
chequear("prompt respeta total exacto", pTipos.includes("EXACTAMENTE 6 preguntas"));

// ---------- 7) reintento automatico ----------
console.log("\n== Reintento automatico ==");
let llamadas = 0;
const iaFalsa = async () => {
  llamadas++;
  if (llamadas === 1) return "```json\n[{\"type\":\"multiple\",\"text\":\"Incompleta\",\"options\":[{\"text\":\"a\"},{\"text\":\"b\"}],\"correctAnswer\":\"\"}]\n```";
  return JSON.stringify([
    { type: "multiple", text: "P1", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }, { text: "c", isCorrect: false }], correctAnswer: "" },
    { type: "text", text: "P2", options: [], correctAnswer: "ok" },
  ]);
};
const gen = await generarPreguntasConIA({ tema: "Prueba", total: 2, ...TIPOS_MEZCLA.auto.distribucion(2), dificultad: "media", idioma: "fr" }, iaFalsa);
chequear("reintenta y consigue 2 validas", gen.ok && gen.preguntas.length === 2 && llamadas === 2, `llamadas=${llamadas} problemas=${JSON.stringify(gen.problemas)}`);

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);

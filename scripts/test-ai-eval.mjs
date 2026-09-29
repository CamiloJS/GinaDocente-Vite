// Pruebas del generador de evaluaciones con IA (sin navegador, sin gastar cuota).
import { construirPrompt, parsearEvaluacion, generarPreguntasConIA, TIPOS_MEZCLA, IDIOMAS } from "../src/utils/aiEvalGenerator.js";

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

// ---------- 3) reintento automatico ----------
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

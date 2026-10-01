// Pruebas de la narracion de publicaciones (limpieza, idiomas, voz femenina y orquestacion).
import { limpiarParaNarrar, detectarIdioma, analizarIdioma, partirPorIdioma, segmentosLocales, refinarSegmentos, construirPromptNarracion, normalizarIdioma, parsearNarracion, prepararNarracion, elegirMejorVoz, esVozBuena, urlVozNube, narrarSegmentos } from "../src/utils/narracion.js";

let ok = 0, fallos = 0;
const chequear = (nombre, cond, extra = "") => {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; console.log("  FALLA " + nombre + (extra ? " -> " + JSON.stringify(extra) : "")); }
};

console.log("\n== Limpieza: no se leen enlaces, listas, vinetas ni etiquetas ==");
const bruto = "Buenas tardes estudiantes,\n1.[color=#ef4444]https://www.youtube.com/watch?v=q6LMjurECZM[/color]\n2. [color=#10b981]https://share.gemini.google/2lo1F63zp5ao[/color]\n- Revisen el deber 📚\nOther videos that may help :\n1.5 puntos extra";
const limpio = limpiarParaNarrar(bruto);
chequear("quita los enlaces", !limpio.includes("http") && !limpio.includes("youtube"), limpio);
chequear("quita los numeros de lista", !/(^|\n)\s*1\.\s|\n2\.\s/.test(limpio), limpio);
chequear("quita las vinetas", !limpio.includes("- Revisen") && !limpio.includes("•"), limpio);
chequear("quita las etiquetas de color", !limpio.includes("[color=") && !limpio.includes("[/color]"), limpio);
chequear("conserva el texto", limpio.includes("Buenas tardes estudiantes") && limpio.includes("Revisen el deber"), limpio);
chequear("no toca los decimales", limpio.includes("1.5 puntos extra"), limpio);
chequear("quita un '1.' que quedo al final", limpiarParaNarrar("Today we practice. 1.").endsWith("practice.") === true, limpiarParaNarrar("Today we practice. 1."));
chequear("quita numeros al vuelo", limpiarParaNarrar("Mira y 3. Lee el texto").includes("3.") === false, limpiarParaNarrar("Mira y 3. Lee el texto"));
chequear("quita emojis", !/[📚🔊😀]/.test(limpio), limpio);
const soloLink = limpiarParaNarrar("https://ejemplo.com/video\nHola clase");
chequear("una linea que es solo enlace desaparece", !soloLink.includes("ejemplo") && soloLink.trim() === "Hola clase", soloLink);

console.log("\n== Deteccion de idioma (local) ==");
chequear("espanol", detectarIdioma("Buenas tardes estudiantes, recuerden realizar la tarea de mañana") === "es");
chequear("ingles", detectarIdioma("Hello students, please read the text and answer the questions for homework") === "en");
chequear("frances", detectarIdioma("Bonjour les étudiants, merci de faire vos devoirs pour la classe") === "fr");
chequear("vacio -> es", detectarIdioma("") === "es");

console.log("\n== Publicacion con varios idiomas ==");
const mixto = "Hola a todos. Hoy repasaremos el pasado simple. Today we will practice the past simple. Bonjour à tous, merci de votre attention.";
const segmentos = segmentosLocales(mixto);
const idiomas = segmentos.map((s) => s.idioma).join(",");
chequear("detecta los 3 idiomas en orden", idiomas === "es,en,fr", { idiomas, segmentos });
chequear("cada fragmento mantiene su texto", segmentos[0].texto.includes("Hola a todos") && segmentos[1].texto.includes("Today we will practice"));
chequear("no queda texto sin narrar", segmentos.map((s) => s.texto).join(" ").includes("merci de votre attention"));

console.log("\n== Frases en otro idioma dentro de una publicacion (caso real) ==");
const casiTodoEs = "Buenas tardes estimados estudiantes. Recuerden que mañana hay clase a las 6:10 am. Today we will practice the past simple. Tambien revisen el deber de consulta. Thank you very much for your attention.";
const segCasos = segmentosLocales(casiTodoEs);
const idCasos = segCasos.map((s) => s.idioma).join(",");
chequear("lo que esta en ingles se marca en ingles aunque sea poco", idCasos === "es,en,es,en", { idCasos, segCasos });
chequear("las frases inglesas quedan completas", segCasos.filter((s) => s.idioma === "en").map((s) => s.texto).join(" ").includes("Today we will practice"), segCasos);
const conComodin = partirPorIdioma("Recuerden: read the text. Gracias por su atencion.");
chequear("una frase corta en ingles tambien se separa", conComodin.map((s) => s.idioma).join(",") === "es,en,es", conComodin);
chequear("sin marcas claras no inventa idioma", analizarIdioma("212 212 212").idioma === null);
chequear("refinar respeta el idioma base", refinarSegmentos([{ idioma: "en", texto: "Hello students" }])[0].idioma === "en");

console.log("\n== Prompt (oculto, para preparar la narracion) ==");
const prompt = construirPromptNarracion("Hola https://x.com clase");
chequear("pide idioma original", prompt.includes("IDIOMA ORIGINAL"));
chequear("prohibe leer enlaces", prompt.includes("NO leas enlaces"));
chequear("prohibe numeros de lista", prompt.includes("numeros de lista"));
chequear("exige separar por idioma", prompt.includes("separa un fragmento por idioma"));
chequear("pide no delatarse", prompt.includes("menciones quien eres"));
chequear("incluye el texto", prompt.includes("Hola https://x.com clase"));

console.log("\n== Parseo de la respuesta ==");
chequear("normaliza codigos de idioma", normalizarIdioma("spa") === "es" && normalizarIdioma("ENG") === "en" && normalizarIdioma("français") === "fr" && normalizarIdioma("") === "es");
let p = parsearNarracion('```json\n[{"idioma":"es","texto":"Hola clase"},{"idioma":"en","texto":"Today we practice"}]\n```');
chequear("acepta JSON con bloques", Array.isArray(p) && p.length === 2 && p[1].idioma === "en", p);
p = parsearNarracion('[{"idioma":"es","texto":"uno"},{"idioma":"es","texto":"dos"}]');
chequear("junta fragmentos seguidos del mismo idioma", p.length === 1 && p[0].texto === "uno dos", p);
p = parsearNarracion('[{"idioma":"es","texto":"Mira https://youtube.com/x y 1. Lee el texto"}]');
chequear("vuelve a limpiar lo que la IA deje", !p[0].texto.includes("http") && !p[0].texto.includes("1."), p);
chequear("respuesta invalida -> null", parsearNarracion("no soy json") === null && parsearNarracion("[]") === null);

console.log("\n== Preparacion (IA + respaldo local + cache) ==");
let llamadas = 0;
const iaBuena = async () => { llamadas++; return JSON.stringify([{ idioma: "es", texto: "Hola clase" }, { idioma: "en", texto: "Today we practice" }]); };
let seg = await prepararNarracion("Hola clase. Today we practice.", iaBuena);
chequear("usa la IA cuando responde bien", seg.length === 2 && seg[1].idioma === "en" && llamadas === 1, seg);
const iaUnBloque = async () => JSON.stringify([{ idioma: "es", texto: "Buenas tardes. Today we will practice the past simple. Gracias por su atencion." }]);
const segMix = await prepararNarracion("Buenas tardes. Today we will practice the past simple. Gracias por su atencion.", iaUnBloque);
chequear("si la IA manda todo junto en espanol, igual separa el ingles", segMix.map((s) => s.idioma).join(",") === "es,en,es", segMix);
let seg2 = await prepararNarracion("Hola clase. Today we practice.", iaBuena);
chequear("usa cache (no repite la llamada)", llamadas === 1 && seg2.length === 2);
const iaMala = async () => { throw new Error("sin internet"); };
seg = await prepararNarracion("Buenas tardes estudiantes, hoy hay tarea.", iaMala);
chequear("si la IA falla usa el respaldo local", seg.length >= 1 && seg[0].texto.includes("Buenas tardes"), seg);
const iaBasura = async () => "no soy json";
seg = await prepararNarracion("Hello students, please read the text.", iaBasura);
chequear("si la IA responde basura usa el respaldo local", seg.length >= 1 && seg[0].idioma === "en", seg);
seg = await prepararNarracion("   ", iaBuena);
chequear("texto vacio -> sin fragmentos", Array.isArray(seg) && seg.length === 0);

console.log("\n== Voz: siempre la mejor FEMENINA ==");
const voces = [
  { name: "Microsoft Pablo - Spanish (Spain)", lang: "es-ES", localService: true },
  { name: "Microsoft Dalia Online (Natural) - Spanish (Mexico)", lang: "es-MX", localService: false },
  { name: "eSpeak Spanish", lang: "es", localService: true },
  { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US", localService: false },
  { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", localService: false },
  { name: "Microsoft Denise Online (Natural) - French (France)", lang: "fr-FR", localService: false },
  { name: "Google français", lang: "fr-FR", localService: false },
];
chequear("espanol: elige Dalia (natural, femenina)", elegirMejorVoz("es", voces)?.name.includes("Dalia"), elegirMejorVoz("es", voces)?.name);
chequear("ingles: elige Aria y no Guy", elegirMejorVoz("en", voces)?.name.includes("Aria"));
chequear("frances: elige Denise", elegirMejorVoz("fr", voces)?.name.includes("Denise"));
const soloMasculinos = [{ name: "Microsoft Jorge Online (Natural) - Spanish (Spain)", lang: "es-ES" }, { name: "Google español", lang: "es-ES", localService: false }];
chequear("prefiere femenina aunque la natural sea masculina", elegirMejorVoz("es", soloMasculinos)?.name === "Google español", elegirMejorVoz("es", soloMasculinos)?.name);
chequear("evita voces roboticas (eSpeak)", !elegirMejorVoz("es", voces).name.toLowerCase().includes("espeak"));
chequear("sin voces -> null", elegirMejorVoz("es", []) === null);
chequear("idioma raro usa las que hay", elegirMejorVoz("xx", voces) !== null);
chequear("reconoce voces de calidad (se usan las del equipo)", esVozBuena({ name: "Microsoft Dalia Online (Natural) - Spanish (Mexico)" }) === true && esVozBuena({ name: "Google español de Estados Unidos" }) === true);
chequear("las voces roboticas del equipo NO se usan (van a la nube)", esVozBuena({ name: "Microsoft Sabina - Spanish (Mexico)" }) === false && esVozBuena(elegirMejorVoz("es", [{ name: "Microsoft Raul - Spanish (Mexico)", lang: "es-MX" }])) === false);
const urlEn = urlVozNube("Today we practice", "en");
chequear("voz neuronal en la nube para cada idioma", urlEn.includes("tl=en") && urlEn.includes("translate_tts") && urlVozNube("Hola clase", "es").includes("tl=es"));
chequear("respaldo por nuestro servidor", urlVozNube("Hola clase", "es", true).startsWith("/api/voz?tl=es"));

console.log("\n== Narrar por fragmentos (sin navegador no debe fallar) ==");
let fin = false;
const ctrl = narrarSegmentos([{ idioma: "es", texto: "Hola" }], { onFin: () => { fin = true; } });
chequear("sin window llama onFin sin romper", fin === true && typeof ctrl.detener === "function");
chequear("detener no lanza", (() => { try { ctrl.detener(); return true; } catch (e) { return false; } })());

console.log("\n== Anti-eco: una sola reproduccion a la vez y sin disparos dobles ==");
{
  const audiosCreados = [];
  global.window = {
    speechSynthesis: {
      getVoices: () => [{ name: 'Microsoft Raul - Spanish (Mexico)', lang: 'es-MX', localService: true }],
      speak: (u) => { setTimeout(() => { try { u.onend && u.onend(); } catch (e) { /* nada */ } }, 1); },
      cancel: () => {},
    },
    SpeechSynthesisUtterance: class { constructor(texto) { this.text = texto; } },
    Audio: class {
      constructor(src) { this.src = src; audiosCreados.push(src); }
      play() { setTimeout(() => { try { this.onended && this.onended(); } catch (e) { /* nada */ } }, 1); return Promise.resolve(); }
      pause() {}
    },
  };
  const a = narrarSegmentos([{ idioma: 'es', texto: 'uno' }, { idioma: 'es', texto: 'dos' }], {});
  narrarSegmentos([{ idioma: 'en', texto: 'three' }, { idioma: 'en', texto: 'four' }], {});
  await new Promise((r) => setTimeout(r, 420));
  const cuenta = (txt) => audiosCreados.filter((u) => u.includes(txt)).length;
  chequear('la reproduccion anterior se corta (no suena "dos")', cuenta('dos') === 0, audiosCreados);
  chequear('la nueva reproduccion no se duplica', cuenta('three') === 1 && cuenta('four') === 1, audiosCreados);
  chequear('el controlador anterior queda inactivo', a.activo === false);

  // Audio que falla: solo UN reintento por el servidor (antes se reintentaba dos veces = eco)
  const audiosFalla = [];
  const hablado = [];
  global.window.Audio = class {
    constructor(src) { this.src = src; audiosFalla.push(src); }
    play() { setTimeout(() => { try { this.onerror && this.onerror(); } catch (e) { /* nada */ } }, 1); return Promise.reject(new Error('bloqueado')); }
    pause() {}
  };
  global.window.speechSynthesis.speak = (u) => { hablado.push(u.text); setTimeout(() => { try { u.onend && u.onend(); } catch (e) { /* nada */ } }, 1); };
  narrarSegmentos([{ idioma: 'en', texto: 'fallback' }], {});
  await new Promise((r) => setTimeout(r, 400));
  chequear('un solo reintento por el servidor (sin eco)', audiosFalla.filter((u) => u.startsWith('/api/voz')).length === 1, audiosFalla);
  chequear('como ultimo respaldo usa la voz del equipo una vez', hablado.filter((t) => t === 'fallback').length === 1, hablado);
  delete global.window;
}

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);

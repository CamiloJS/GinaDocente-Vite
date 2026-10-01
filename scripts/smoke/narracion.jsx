// Prueba en navegador de la narracion (sin emitir audio: speechSynthesis simulado).
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/narracion.html
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { prepararNarracion, narrarSegmentos, elegirMejorVoz } from "../../src/utils/narracion.js";

const VOCES = [
  { name: "Microsoft Pablo - Spanish (Spain)", lang: "es-ES", localService: true, default: false },
  { name: "Microsoft Dalia Online (Natural) - Spanish (Mexico)", lang: "es-MX", localService: false, default: false },
  { name: "eSpeak Spanish", lang: "es", localService: true, default: false },
  { name: "Google US English", lang: "en-US", localService: false, default: true },
  { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US", localService: false, default: false },
  { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", localService: false, default: false },
];

function App() {
  const [lineas, setLineas] = useState([]);
  const log = (s) => { setLineas((prev) => [...prev, s]); };

  useEffect(() => {
    const capturado = [];
    window.__tts = capturado;
    const synth = window.speechSynthesis;
    synth.getVoices = () => VOCES;
    synth.cancel = () => {};
    synth.speak = (u) => {
      capturado.push({ texto: u.text, lang: u.lang, voz: u.voice ? u.voice.name : null });
      setTimeout(() => { try { u.onend && u.onend(); } catch (e) {} }, 30);
    };

    const iaBuena = async () => JSON.stringify([
      { idioma: "es", texto: "Buenas tardes estudiantes, revisen el deber." },
      { idioma: "en", texto: "Today we will practice the past simple." },
    ]);
    const iaMala = async () => { throw new Error("sin internet"); };

    (async () => {
      // Caso 1: la IA responde (multi-idioma) -> 2 fragmentos con voces femeninas
      const s1 = await prepararNarracion("Buenas tardes. [color=#ef4444]https://youtube.com/watch?v=x[/color] Today we will practice.", iaBuena);
      log("IA: " + JSON.stringify(s1.map((s) => s.idioma)));
      await new Promise((res) => {
        narrarSegmentos(s1, { onFin: res });
      });
      log("narró IA: " + JSON.stringify(capturado.map((c) => ({ voz: c.voz, lang: c.lang, dice: c.texto.slice(0, 28) }))));
      capturado.length = 0;

      // Caso 2: la IA falla -> deteccion local y sin leer enlaces
      const s2 = await prepararNarracion("Buenas tardes estudiantes. Today we practice. 1. https://share.gemini.google/abc", iaMala);
      log("LOCAL: " + JSON.stringify(s2.map((s) => s.idioma)));
      await new Promise((res) => { narrarSegmentos(s2, { onFin: res }); });
      log("narró local: " + JSON.stringify(capturado.map((c) => ({ voz: c.voz, dice: c.texto.slice(0, 30) }))));
      capturado.length = 0;

      // Caso 3: detener() corta la narracion
      const ctrl = narrarSegmentos(s2, {});
      await new Promise((r) => setTimeout(r, 10));
      ctrl.detener();
      await new Promise((r) => setTimeout(r, 80));
      log("tras detener: " + capturado.length + " fragmento(s) reproducido(s)");
      log("elegida es: " + (elegirMejorVoz("es", VOCES) || {}).name + " | en: " + (elegirMejorVoz("en", VOCES) || {}).name);
      window.__listo = true;
    })();
  }, []);

  return (
    <div className="p-6 bg-white text-sm">
      <h2 className="font-bold mb-2">Prueba de narración (voz simulada)</h2>
      <ul className="space-y-1">{lineas.map((l, i) => <li key={i} className="font-mono text-xs">{l}</li>)}</ul>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

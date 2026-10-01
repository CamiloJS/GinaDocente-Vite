// Prueba con LAS VOCES REALES del equipo (sin emitir sonido): verifica el motor elegido por idioma.
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/narracion.html
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { prepararNarracion, narrarSegmentos, elegirMejorVoz, esVozBuena } from "../../src/utils/narracion.js";

function App() {
  const [lineas, setLineas] = useState([]);
  const log = (s) => setLineas((prev) => [...prev, s]);

  useEffect(() => {
    (async () => {
      const voces = window.speechSynthesis.getVoices() || [];
      const es = elegirMejorVoz("es", voces);
      const en = elegirMejorVoz("en", voces);
      log("voces del equipo: " + voces.length);
      log("mejor es: " + (es ? es.name + " | calidad: " + esVozBuena(es) : "ninguna"));
      log("mejor en: " + (en ? en.name + " | calidad: " + esVozBuena(en) : "ninguna"));

      const capturado = [];
      window.__capturado = capturado;
      const synth = window.speechSynthesis;
      synth.speak = (u) => {
        capturado.push({ motor: "voz-equipo", voz: u.voice ? u.voice.name : null, idioma: u.lang, dice: u.text.slice(0, 40) });
        setTimeout(() => { try { u.onend && u.onend(); } catch (e) {} }, 5);
      };
      synth.cancel = () => {};
      window.__audio = [];
      window.Audio = class {
        constructor(src) { this.src = src; window.__audio.push(src); }
        play() { setTimeout(() => { try { this.onended && this.onended(); } catch (e) {} }, 5); return Promise.resolve(); }
        pause() {}
      };

      // La IA manda TODO en un solo bloque en espanol (el caso que fallaba)
      const iaUnBloque = async () => JSON.stringify([
        { idioma: "es", texto: "Buenas tardes estudiantes. Today we will practice the past simple. Thank you very much. Gracias por su atencion." },
      ]);
      const segs = await prepararNarracion("Buenas tardes estudiantes. Today we will practice the past simple. Thank you very much. Gracias por su atencion.", iaUnBloque);
      log("fragmentos: " + JSON.stringify(segs.map((s) => s.idioma)));
      await new Promise((res) => narrarSegmentos(segs, { onFin: res }));
      log("reproducido: " + JSON.stringify(capturado.map((c) => ({ motor: c.motor, idioma: c.idioma, dice: c.dice }))));
      log("audios de nube: " + window.__audio.length + " -> " + window.__audio.map((u) => (u.match(/tl=(\w+)/) || [])[1]).join(", "));
      window.__listo = true;
    })();
  }, []);

  return (
    <div className="p-6 bg-white text-sm">
      <h2 className="font-bold mb-2">Narración con las voces reales del equipo</h2>
      <ul className="space-y-1">{lineas.map((l, i) => <li key={i} className="font-mono text-xs">{l}</li>)}</ul>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

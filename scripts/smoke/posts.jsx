// Prueba visual de publicaciones (solo desarrollo): colores en enlaces y "Ver más".
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/posts.html
import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import LinkifyText from "../../src/components/LinkifyText.jsx";

const casoReal = `1.[color=#ef4444]https://www.youtube.com/watch?v=q6LMjurECZM[/color]
1. [color=#10b981]https://share.gemini.google/2lo1F63zp5ao [/color]

2. [color=#ef4444]https://www.youtube.com/watch?v=CsvvyrD9EZA [/color]
2. [color=#10b981]https://share.gemini.google/2EvFB4bgqml9[/color]

3.[color=#ef4444] https://www.youtube.com/watch?v=S0vKNan8YTs[/color]
3. [color=#10b981] https://share.gemini.google/VdsRKdmxSN1Q[/color]

Other videos that may help :

6. [color=#ef4444]https://www.youtube.com/watch?v=4swP-ylDIrg[/color]
7. [color=#ef4444]https://www.youtube.com/watch?v=z6dyuDP0bi4[/color]`;

const larga =
  "Buenas tardes estimados estudiantes,\n\n" +
  Array.from({ length: 14 }, (_, i) => `${i + 1}. Punto importante ${i + 1} de la clase de mañana con un texto suficientemente largo para llenar varias líneas de la publicación.`).join("\n") +
  "\n\nGracias por su atención.";

function App() {
  return (
    <div className="p-6 space-y-8 bg-white text-gray-800">
      <section>
        <h2 className="font-bold mb-2">Prueba 1: colores + enlaces (el caso reportado)</h2>
        <div className="text-sm whitespace-pre-line"><LinkifyText text={casoReal} /></div>
      </section>
      <section>
        <h2 className="font-bold mb-2">Prueba 2: negrita, color con nombre y subrayado sobre enlaces</h2>
        <div className="text-sm whitespace-pre-line">
          <LinkifyText text={"**https://ejemplo.com/bold** y https://ejemplo.com/normal\n[color=azul]https://ejemplo.com/azul[/color] y <u>https://ejemplo.com/subrayado</u> y ~~https://ejemplo.com/tachado~~"} />
        </div>
      </section>
      <section>
        <h2 className="font-bold mb-2">Prueba 3: publicación larga (debe salir "Ver más")</h2>
        <div className="text-sm whitespace-pre-line"><LinkifyText text={larga} colapsable /></div>
      </section>
      <section>
        <h2 className="font-bold mb-2">Prueba 4: publicación corta (sin "Ver más")</h2>
        <div className="text-sm whitespace-pre-line"><LinkifyText text={"Hola clase, nos vemos mañana. [color=#ef4444]https://ejemplo.com/reunion[/color]"} colapsable /></div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

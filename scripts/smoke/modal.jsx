// Prueba del apilado del modal de IA frente al panel lateral tipo chat (solo desarrollo).
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/modal.html
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import AiEvalGeneratorModal from "../../src/components/AiEvalGeneratorModal.jsx";

function App() {
  const [estado, setEstado] = useState("midiendo");

  useEffect(() => {
    const t = setTimeout(() => {
      const x = Math.max(10, window.innerWidth - 30);
      const el = document.elementFromPoint(x, 300);
      const modal = document.querySelector(".z-\\[999999\\]");
      window.__resultado = {
        dentroDelModal: !!(el && el.closest(".z-\\[999999\\]")),
        tocoElPanelLateral: !!(el && el.closest("[data-prueba-aside]")),
        esPortalDeBody: !!modal && modal.parentElement === document.body,
      };
      setEstado("listo");
    }, 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6 text-sm">Contenido de la página (detrás)</div>
      <aside data-prueba-aside className="sticky top-0 z-10 w-72 ml-auto h-[500px] bg-red-200 text-red-900 text-xs font-bold p-3">
        Panel lateral (simula el chat)
      </aside>
      <p className="text-xs p-3">estado: {estado}</p>
      <AiEvalGeneratorModal isOpen={true} onClose={() => {}} callGemini={async () => ""} onInsert={() => {}} isDarkMode={false} existingCount={0} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

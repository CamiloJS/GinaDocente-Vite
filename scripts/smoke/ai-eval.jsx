// PRUEBA DEL GENERADOR DE EVALUACIONES (solo desarrollo)
// Usa una IA simulada para probar toda la interfaz sin gastar cuota.
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/ai-eval.html
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import AiEvalGeneratorModal from "../../src/components/AiEvalGeneratorModal.jsx";

const RESPUESTA_IA = JSON.stringify([
  {
    type: "multiple",
    text: "She ___ to school every day.",
    options: [
      { text: "goes", isCorrect: true },
      { text: "go", isCorrect: false },
      { text: "going", isCorrect: false },
    ],
    correctAnswer: "",
  },
  {
    type: "text",
    text: "Write the past simple of 'buy'.",
    options: [],
    correctAnswer: "bought",
  },
  {
    type: "multiple",
    text: "Which sentence is correct?",
    options: [
      { text: "I have visited Paris last year.", isCorrect: false },
      { text: "I visited Paris last year.", isCorrect: true },
      { text: "I visiting Paris last year.", isCorrect: false },
    ],
    correctAnswer: "",
  },
]);

const App = () => {
  const [insertadas, setInsertadas] = useState([]);
  const [ultimoModo, setUltimoModo] = useState("");
  const [abierto, setAbierto] = useState(true);

  // IA simulada: cuenta las llamadas y devuelve una respuesta valida
  const [llamadas, setLlamadas] = useState(0);
  const iaFalsa = async () => {
    setLlamadas((n) => n + 1);
    return "```json\n" + RESPUESTA_IA + "\n```";
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-950 min-h-screen">
      <h1 className="text-lg font-black">Prueba del generador de evaluaciones con IA</h1>
      <p className="text-xs text-gray-500">IA simulada (no usa la real). Llamadas: {llamadas}</p>

      {!abierto && (
        <button type="button" className="mt-3 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold" onClick={() => setAbierto(true)}>
          Abrir generador
        </button>
      )}

      <div id="resultado-insert" className="mt-4 text-xs font-bold text-green-700">
        {insertadas.length} preguntas insertadas ({ultimoModo}): {insertadas.map((q) => q.text).join(" | ")}
      </div>

      <AiEvalGeneratorModal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        callGemini={iaFalsa}
        isDarkMode={false}
        existingCount={2}
        onInsert={(preguntas, modo) => {
          setInsertadas(preguntas);
          setUltimoModo(modo);
          setAbierto(false);
        }}
      />
    </div>
  );
};

createRoot(document.getElementById("root")).render(<App />);

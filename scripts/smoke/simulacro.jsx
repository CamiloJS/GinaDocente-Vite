// Prueba visual del simulacro de evaluacion (solo desarrollo).
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/simulacro.html
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import SimulacroEvaluacion from "../../src/components/SimulacroEvaluacion.jsx";

const evaluacion = {
  title: "Práctica: Past Simple (simulacro)",
  description: "Responde las preguntas. Tienes 30 minutos. ¡Éxito!",
  dueDate: "2026-10-05",
  dueTime: "23:59",
  timeLimit: 30,
  strictAntiCheat: true,
  targetGroupName: "Inglés IV (Global)",
  questions: [
    { type: "multiple", points: 1, text: "What is the past simple of 'go'?", options: [{ text: "goed", isCorrect: false }, { text: "went", isCorrect: true }, { text: "gone", isCorrect: false }] },
    { type: "multiple", points: 1, text: "Verdadero o Falso: 'Buy' es un verbo regular.", options: [{ text: "Verdadero", isCorrect: false }, { text: "Falso", isCorrect: true }] },
    { type: "listening", points: 1, text: "Escucha y elige la palabra que oyes.", audioUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3", options: [{ text: "cat", isCorrect: true }, { text: "cut", isCorrect: false }] },
    { type: "text", points: 1, text: "Write the past simple of 'buy'.", correctAnswer: "bought", acceptedAnswers: ["bought"] },
    { type: "order", points: 1, text: "Ordena la oración", words: ["she", "went", "home"] },
    { type: "match", points: 1, text: "Relaciona el verbo con su pasado", pairs: [{ left: "eat", right: "ate" }, { left: "drink", right: "drank" }, { left: "sleep", right: "slept" }] },
    { type: "dictation", points: 1, text: "Escucha y escribe la oración.", audioUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3", correctAnswer: "the cat is black" },
    { type: "speaking", points: 1, text: "Graba tu voz contando tu último fin de semana." },
  ],
};

function App() {
  const [abierto, setAbierto] = useState(true);
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <button type="button" onClick={() => setAbierto(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">
        Abrir simulacro
      </button>
      {abierto && <SimulacroEvaluacion evaluacion={evaluacion} isDarkMode={false} onClose={() => setAbierto(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

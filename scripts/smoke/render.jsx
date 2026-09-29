// PRUEBA DE RENDER (solo desarrollo) - atrapa errores tipo "X is not defined"
// y avisos de HTML invalido antes de publicar.
// Uso:  npm run smoke   y abre  http://127.0.0.1:5199/scripts/smoke/index.html
import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import TaskCard from "../../src/components/TaskCard.jsx";

const noop = () => {};
const log = (...a) => console.log("[showMessage]", ...a);

const base = { id: "prueba-1", createdAt: Date.now(), comments: [], ratings: {}, reactions: {}, allowLate: false, targetGroupName: "Global" };

const pollTask = {
  ...base,
  type: "poll",
  title: "¿Cuál es tu horario preferido?",
  description: "Encuesta de prueba con video: https://www.youtube.com/watch?v=dQw4w9WgXcQ y emojis 😀🎉 **negrita**",
  poll: {
    isMultipleChoice: true,
    options: [
      { id: "opt_1", text: "Mañana", voterIds: [] },
      { id: "opt_2", text: "Tarde", voterIds: ["uid_companero"] },
    ],
  },
};

const taskTask = {
  ...base,
  id: "prueba-2",
  type: "task",
  title: "Tarea de prueba",
  description: "Descripción con enlace https://example.com y emoji 🚀",
  dueDate: "2026-10-01",
  dueTime: "23:59",
  comments: [
    {
      id: "c1",
      author: "Estudiante Demo",
      authorId: "uid_demo",
      text: "Comentario de prueba con link https://youtu.be/aaaaaaaaaaa",
      createdAt: Date.now(),
      reactions: {},
      ratings: {},
    },
  ],
};

const props = (rol) => ({
  role: rol,
  db: null,
  appId: "prueba",
  academicGroups: [],
  callGemini: async () => "",
  currentUser: { uid: "uid_test" },
  showMessage: log,
  loggedInName: rol === "teacher" ? "Docente Prueba" : "Estudiante Prueba",
  confirmAction: (m, fn) => fn && fn(),
  handleOpenProfileByName: noop,
  userMappings: {},
});

const App = () => (
  <div className="p-4 space-y-6 bg-white dark:bg-gray-950 min-h-screen">
    <h1 className="text-lg font-black text-gray-900 dark:text-white">Prueba de render: encuesta / tarea / comentario</h1>
    <TaskCard task={pollTask} isDarkMode={true} {...props("student")} />
    <TaskCard task={pollTask} isDarkMode={false} {...props("teacher")} />
    <TaskCard task={taskTask} isDarkMode={false} {...props("teacher")} />
    <p id="resultado-prueba" className="text-xs font-bold text-green-600">
      RENDER_OK
    </p>
  </div>
);

createRoot(document.getElementById("root")).render(<App />);

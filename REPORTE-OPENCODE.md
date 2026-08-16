# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #29 — COMPLETADA ✅ (Posts fijados)

### 1. Botón Pin (solo docente)
- Icono Pin en las acciones de la tarjeta: toggle de `isPinned` en Firestore
  (setDoc con spread de la tarea). Se colorea amarillo cuando está fijado.

### 2. Consulta separada
- Nuevo onSnapshot con `where('isPinned', '==', true)` en App.jsx
  (independiente de la paginación). Sin índices compuestos. Estado `pinnedTasks`.
- Se agregó `where` al re-export de firebase/config.js.

### 3. Render prioritario sin duplicados
- TasksTab renderiza primero `pinnedTasks` y luego `filteredTasks`
  excluyendo ids ya presentes en fijados (`.filter(t => !pinned.some(p => p.id === t.id))`).

### 4. Diferenciación visual
- Borde amarillo `border-2 !border-yellow-400` + sombra dorada en tarjetas
  fijadas + badge "FIJADO" junto al de "Tarea".

### 5. Deploy
- build OK (64 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit 795229b.

### ESTADO: ESPERANDO SIGUIENTE

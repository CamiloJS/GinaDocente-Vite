# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #25 — COMPLETADA ✅ (Fecha relativa + textareas)

### 1. Fechas relativas en el muro
- Post: `timeAgo(task.createdAt)` bajo el nombre del autor (text-[11px]).
- Comentario: `timeAgo(c.createdAt)` al lado del autor del comentario.

### 2. Textareas expandibles
- TaskCard (edición de tarea): `min-h-[120px] resize-none` → `resize-y`.
- TasksTab (descripción de publicación): `h-20 resize-none` → `min-h-[80px] resize-y`.
- Elegí `resize-y` (permite expandir manualmente sin código extra) en vez de
  auto-resize onInput.

### 3. Deploy
- build OK (64 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit af4823e.

### ESTADO: ESPERANDO SIGUIENTE
